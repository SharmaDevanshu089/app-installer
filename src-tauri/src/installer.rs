use std::fs::{self, File};
use std::io::Write;
use std::os::unix::fs::{symlink, PermissionsExt};
use std::path::{Path, PathBuf};
use std::process::Command;
use chrono::Utc;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

use crate::inspector::{calculate_file_sha256, unpack_archive_safely};
use crate::models::{InstallRequest, InstalledPackage, PackageType};
use crate::registry::{add_or_update_package, load_config};
use crate::sanitizer::{
    is_path_privileged, sanitize_cli_alias, sanitize_desktop_entry_string,
    validate_install_destination, validate_source_package_path,
};
use crate::system_paths::{
    calculate_dir_size, ensure_directories, format_bytes, get_applications_dir, get_bin_dir,
    get_home_dir, get_icons_dir,
};

pub fn run_elevated_command(program: &str, args: &[&str]) -> Result<(), String> {
    crate::log_info!("ELEVATION", "Executing elevated command: pkexec {} {}", program, args.join(" "));
    let mut cmd = Command::new("pkexec");
    cmd.arg(program);
    for arg in args {
        cmd.arg(arg);
    }
    let output = cmd.output().map_err(|e| {
        let err_msg = format!("Failed to invoke pkexec: {}. Ensure Polkit/pkexec is installed on your Linux system.", e);
        crate::log_error!("ELEVATION", "{}", err_msg);
        err_msg
    })?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let err_msg = format!("Privileged elevation failed: {}", err.trim());
        crate::log_error!("ELEVATION", "{}", err_msg);
        return Err(err_msg);
    }
    crate::log_info!("ELEVATION", "Elevated command succeeded: {} {}", program, args.join(" "));
    Ok(())
}

pub fn install_package(req: InstallRequest) -> Result<InstalledPackage, String> {
    crate::log_info!("INSTALLER", "Beginning installation of '{}' (alias: '{}', type: {:?})", req.name, req.cli_alias, req.package_type);
    ensure_directories()?;
    let config = load_config();
    let home = get_home_dir();

    let source_path = validate_source_package_path(Path::new(&req.file_path))?;
    let source_sha256 = calculate_file_sha256(&source_path)?;

    // Sanitize and validate CLI alias
    let clean_alias = sanitize_cli_alias(&req.cli_alias)?;
    let package_id = clean_alias.clone();

    let install_base = PathBuf::from(&config.install_base_dir);
    let install_dir = install_base.join(&package_id);

    // Verify install destination is safe and allowed
    validate_install_destination(&install_dir, &home, config.allow_privileged_system_paths)?;

    let is_dir_priv = is_path_privileged(&install_dir, &home);

    // If previous version exists at install_dir, remove it cleanly
    if install_dir.exists() {
        if is_dir_priv {
            let install_dir_str = install_dir.to_string_lossy();
            let _ = run_elevated_command("rm", &["-rf", &install_dir_str]);
        } else {
            let _ = fs::remove_dir_all(&install_dir);
        }
    }

    if is_dir_priv {
        let install_dir_str = install_dir.to_string_lossy();
        run_elevated_command("mkdir", &["-p", &install_dir_str])?;
    } else {
        fs::create_dir_all(&install_dir)
            .map_err(|e| format!("Failed to create install directory: {}", e))?;
    }

    let mut audit_log = Vec::new();
    audit_log.push(format!("Created installation directory: {}", install_dir.display()));

    let mut installed_files = Vec::new();
    let primary_binary_path: PathBuf;

    match req.package_type {
        PackageType::AppImage => {
            let file_name = source_path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("app.AppImage");
            let target_appimage = install_dir.join(file_name);

            fs::copy(&source_path, &target_appimage)
                .map_err(|e| format!("Failed to copy AppImage: {}", e))?;

            // Grant executable permissions (0755)
            if let Ok(meta) = fs::metadata(&target_appimage) {
                let mut perms = meta.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&target_appimage, perms);
            }

            audit_log.push(format!("Copied AppImage to: {}", target_appimage.display()));
            audit_log.push("Applied executable permissions (0755)".to_string());
            installed_files.push(target_appimage.to_string_lossy().to_string());
            primary_binary_path = target_appimage;
        }
        PackageType::TarGz | PackageType::TarXz | PackageType::TarBz2 | PackageType::Tar => {
            // If staging_dir was provided from inspection, copy from staging or unpack directly
            let staged_path = req.staging_dir.as_ref().map(PathBuf::from);
            let used_staging = if let Some(ref stg) = staged_path {
                if stg.exists() && fs::read_dir(stg).map(|mut d| d.next().is_some()).unwrap_or(false) {
                    copy_dir_all(stg, &install_dir)?;
                    audit_log.push(format!("Deployed extracted files from staging cache: {}", stg.display()));
                    true
                } else {
                    false
                }
            } else {
                false
            };

            if !used_staging {
                unpack_archive_safely(&source_path, &req.package_type, &install_dir)?;
                audit_log.push(format!("Extracted archive directly to: {}", install_dir.display()));
            }

            // Determine primary binary
            let relative_bin = if req.selected_binary_relative.is_empty() {
                "bin".to_string()
            } else {
                req.selected_binary_relative.clone()
            };

            let candidate = install_dir.join(&relative_bin);
            if candidate.exists() {
                primary_binary_path = candidate;
            } else {
                // Find any executable in install_dir
                let mut found = None;
                for entry in walkdir::WalkDir::new(&install_dir).into_iter().flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        if let Ok(m) = fs::metadata(p) {
                            if (m.permissions().mode() & 0o111) != 0 {
                                found = Some(p.to_path_buf());
                                break;
                            }
                        }
                    }
                }
                primary_binary_path = found.unwrap_or_else(|| install_dir.join(&relative_bin));
            }

            // Ensure executable permissions on all binaries in install_dir
            for entry in walkdir::WalkDir::new(&install_dir).into_iter().flatten() {
                let p = entry.path();
                if p.is_file() {
                    installed_files.push(p.to_string_lossy().to_string());
                    if p == primary_binary_path || p.to_string_lossy().contains("/bin/") {
                        if let Ok(meta) = fs::metadata(p) {
                            let mut perms = meta.permissions();
                            perms.set_mode(perms.mode() | 0o755);
                            let _ = fs::set_permissions(p, perms);
                        }
                    }
                }
            }

            audit_log.push(format!("Configured primary binary: {}", primary_binary_path.display()));
        }
        PackageType::Unknown => {
            // Standalone binary
            let file_name = source_path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("binary");
            let target_bin = install_dir.join(file_name);

            fs::copy(&source_path, &target_bin)
                .map_err(|e| format!("Failed to copy binary: {}", e))?;

            if let Ok(meta) = fs::metadata(&target_bin) {
                let mut perms = meta.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&target_bin, perms);
            }

            installed_files.push(target_bin.to_string_lossy().to_string());
            primary_binary_path = target_bin;
            audit_log.push(format!("Installed standalone executable: {}", primary_binary_path.display()));
        }
    }

    // Deploy Icon if available
    let mut icon_files = Vec::new();
    let mut final_icon_param = package_id.clone();

    if let Some(ref icon_b64) = req.icon_base64 {
        if let Some((mime, raw_b64)) = icon_b64.split_once(',') {
            if let Ok(bytes) = BASE64.decode(raw_b64) {
                let is_svg = mime.contains("svg");
                let ext = if is_svg { "svg" } else { "png" };

                // Place in standard XDG icons directory
                let target_icon_dir = if is_svg {
                    get_icons_dir().join("scalable").join("apps")
                } else {
                    get_icons_dir().join("512x512").join("apps")
                };
                let _ = fs::create_dir_all(&target_icon_dir);

                let icon_dest = target_icon_dir.join(format!("{}.{}", package_id, ext));
                if let Ok(mut f) = File::create(&icon_dest) {
                    let _ = f.write_all(&bytes);
                    icon_files.push(icon_dest.to_string_lossy().to_string());
                    audit_log.push(format!("Installed desktop icon: {}", icon_dest.display()));
                    final_icon_param = icon_dest.to_string_lossy().to_string();
                }

                // Also keep local copy inside install_dir
                let local_icon = install_dir.join(format!("icon.{}", ext));
                if let Ok(mut f) = File::create(&local_icon) {
                    let _ = f.write_all(&bytes);
                    installed_files.push(local_icon.to_string_lossy().to_string());
                }
            }
        }
    }

    // Desktop Shortcut Creation
    let mut desktop_files = Vec::new();
    if req.create_desktop_shortcut {
        let app_dir = get_applications_dir();
        let desktop_file_path = app_dir.join(format!("{}.desktop", package_id));

        let categories_str = if req.categories.is_empty() {
            "Utility;".to_string()
        } else {
            format!("{};", req.categories.join(";"))
        };

        let desktop_content = format!(
            "[Desktop Entry]\n\
            Type=Application\n\
            Name={}\n\
            Comment={}\n\
            Exec=\"{}\" %U\n\
            Icon={}\n\
            Terminal=false\n\
            Categories={}\n\
            StartupWMClass={}\n",
            sanitize_desktop_entry_string(&req.name),
            if req.description.is_empty() { "Installed via App Installer".to_string() } else { sanitize_desktop_entry_string(&req.description) },
            primary_binary_path.display(),
            final_icon_param,
            categories_str,
            package_id
        );

        if let Ok(mut f) = File::create(&desktop_file_path) {
            let _ = f.write_all(desktop_content.as_bytes());
            desktop_files.push(desktop_file_path.to_string_lossy().to_string());
            audit_log.push(format!("Created FreeDesktop entry: {}", desktop_file_path.display()));
        }

        if config.auto_refresh_desktop_database {
            let _ = Command::new("update-desktop-database")
                .arg(&app_dir)
                .output();
        }
    }

    // Terminal Symlink Integration
    let mut symlinks = Vec::new();
    if req.create_terminal_symlink && !clean_alias.is_empty() {
        let bin_dir = get_bin_dir();
        let symlink_dest = bin_dir.join(&clean_alias);

        let is_bin_priv = is_path_privileged(&bin_dir, &home);
        let symlink_dest_str = symlink_dest.to_string_lossy();
        let primary_binary_str = primary_binary_path.to_string_lossy();

        // If previous symlink or file exists, remove it
        if symlink_dest.exists() || symlink_dest.is_symlink() {
            if is_bin_priv {
                let _ = run_elevated_command("rm", &["-f", &symlink_dest_str]);
            } else {
                let _ = fs::remove_file(&symlink_dest);
            }
        }

        let link_res = if is_bin_priv {
            run_elevated_command("ln", &["-sf", &primary_binary_str, &symlink_dest_str])
        } else {
            symlink(&primary_binary_path, &symlink_dest).map_err(|e| e.to_string())
        };

        if link_res.is_ok() {
            symlinks.push(symlink_dest.to_string_lossy().to_string());
            audit_log.push(format!(
                "Created terminal symlink in PATH: {} -> {}",
                symlink_dest.display(),
                primary_binary_path.display()
            ));
        } else {
            audit_log.push(format!("Warning: Could not create symlink at {}", symlink_dest.display()));
        }
    }

    // Calculate total installed size
    let total_size_bytes = calculate_dir_size(&install_dir);
    let total_size_formatted = format_bytes(total_size_bytes);

    // Clean up staging directory if used
    if let Some(ref stg) = req.staging_dir {
        let stg_path = Path::new(stg);
        if stg_path.exists() {
            let _ = fs::remove_dir_all(stg_path);
        }
    }

    let installed_package = InstalledPackage {
        id: package_id,
        name: req.name,
        version: req.version,
        package_type: req.package_type,
        installed_at: Utc::now().to_rfc3339(),
        source_file: req.file_path,
        source_sha256,
        install_dir: install_dir.to_string_lossy().to_string(),
        primary_binary: primary_binary_path.to_string_lossy().to_string(),
        cli_alias: clean_alias,
        symlinks,
        desktop_files,
        icon_files,
        installed_files,
        total_size_bytes,
        total_size_formatted,
        categories: req.categories,
        description: req.description,
        icon_base64: req.icon_base64,
        change_audit_log: audit_log,
        is_healthy: true,
    };

    add_or_update_package(installed_package.clone())?;

    Ok(installed_package)
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create dir {}: {}", dst.display(), e))?;

    for entry in fs::read_dir(src).map_err(|e| format!("Failed read dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
        let ty = entry.file_type().map_err(|e| format!("Type error: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Copy failed from {} to {}: {}", src_path.display(), dst_path.display(), e))?;
        }
    }
    Ok(())
}
