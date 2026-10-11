use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use crate::models::{
    AppConfig, CacheStatusReport, DirectoryPresets, InstalledPackage, PathPreset, RegistryData,
    UninstallRequest,
};
use crate::sanitizer::validate_install_destination;
use crate::system_paths::{
    calculate_dir_size, ensure_directories, format_bytes, get_cache_staging_dir,
    get_config_dir, get_home_dir,
};

pub fn get_config_file_path() -> PathBuf {
    get_config_dir().join("config.json")
}

pub fn get_registry_file_path() -> PathBuf {
    get_config_dir().join("registry.json")
}

pub fn load_config() -> AppConfig {
    let _ = ensure_directories();
    let path = get_config_file_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                return config;
            }
        }
    }
    let default_config = AppConfig::default();
    let _ = save_config(&default_config);
    default_config
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let _ = ensure_directories();
    let home = get_home_dir();
    let allow_priv = config.allow_privileged_system_paths;

    // Validate that directories configured by the user are safe
    validate_install_destination(Path::new(&config.install_base_dir), &home, allow_priv)
        .map_err(|e| format!("Invalid install base directory: {}", e))?;
    validate_install_destination(Path::new(&config.bin_dir), &home, allow_priv)
        .map_err(|e| format!("Invalid bin directory: {}", e))?;
    validate_install_destination(Path::new(&config.applications_dir), &home, allow_priv)
        .map_err(|e| format!("Invalid applications directory: {}", e))?;

    let path = get_config_file_path();
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write config file {}: {}", path.display(), e))?;
    Ok(())
}

pub fn get_directory_presets() -> DirectoryPresets {
    let home = get_home_dir();
    let home_str = home.to_string_lossy();

    let bin_dirs = vec![
        PathPreset {
            id: "local_bin".to_string(),
            label: "~/.local/bin".to_string(),
            path: format!("{}/.local/bin", home_str),
            is_privileged: false,
            description: "Standard FreeDesktop user binary directory (Recommended)".to_string(),
        },
        PathPreset {
            id: "home_bin".to_string(),
            label: "~/bin".to_string(),
            path: format!("{}/bin", home_str),
            is_privileged: false,
            description: "Traditional personal user binary directory".to_string(),
        },
        PathPreset {
            id: "cargo_bin".to_string(),
            label: "~/.cargo/bin".to_string(),
            path: format!("{}/.cargo/bin", home_str),
            is_privileged: false,
            description: "Rust / Cargo user binary directory".to_string(),
        },
        PathPreset {
            id: "npm_bin".to_string(),
            label: "~/.npm-global/bin".to_string(),
            path: format!("{}/.npm-global/bin", home_str),
            is_privileged: false,
            description: "NPM global user executable directory".to_string(),
        },
        PathPreset {
            id: "usr_local_bin".to_string(),
            label: "/usr/local/bin".to_string(),
            path: "/usr/local/bin".to_string(),
            is_privileged: true,
            description: "System-wide local binaries (Requires bypass & elevation)".to_string(),
        },
        PathPreset {
            id: "opt_bin".to_string(),
            label: "/opt/bin".to_string(),
            path: "/opt/bin".to_string(),
            is_privileged: true,
            description: "System-wide optional software binaries (Requires bypass & elevation)".to_string(),
        },
    ];

    let install_dirs = vec![
        PathPreset {
            id: "local_opt".to_string(),
            label: "~/.local/opt".to_string(),
            path: format!("{}/.local/opt", home_str),
            is_privileged: false,
            description: "Isolated rootless user-space software root (Recommended)".to_string(),
        },
        PathPreset {
            id: "home_applications".to_string(),
            label: "~/Applications".to_string(),
            path: format!("{}/Applications", home_str),
            is_privileged: false,
            description: "User Applications folder (Common on Elementary & Ubuntu)".to_string(),
        },
        PathPreset {
            id: "home_apps".to_string(),
            label: "~/.apps".to_string(),
            path: format!("{}/.apps", home_str),
            is_privileged: false,
            description: "Hidden dot-apps directory for portable software".to_string(),
        },
        PathPreset {
            id: "system_opt".to_string(),
            label: "/opt".to_string(),
            path: "/opt".to_string(),
            is_privileged: true,
            description: "System-wide software root (Requires bypass & elevation)".to_string(),
        },
        PathPreset {
            id: "system_usr_local".to_string(),
            label: "/usr/local".to_string(),
            path: "/usr/local".to_string(),
            is_privileged: true,
            description: "System-wide local packages (Requires bypass & elevation)".to_string(),
        },
    ];

    let application_dirs = vec![
        PathPreset {
            id: "user_applications".to_string(),
            label: "~/.local/share/applications".to_string(),
            path: format!("{}/.local/share/applications", home_str),
            is_privileged: false,
            description: "FreeDesktop user desktop launcher entries (Recommended)".to_string(),
        },
        PathPreset {
            id: "system_applications".to_string(),
            label: "/usr/local/share/applications".to_string(),
            path: "/usr/local/share/applications".to_string(),
            is_privileged: true,
            description: "System-wide desktop launcher entries (Requires bypass & elevation)".to_string(),
        },
    ];

    let icon_dirs = vec![
        PathPreset {
            id: "user_icons".to_string(),
            label: "~/.local/share/icons/hicolor".to_string(),
            path: format!("{}/.local/share/icons/hicolor", home_str),
            is_privileged: false,
            description: "FreeDesktop user hicolor icon theme (Recommended)".to_string(),
        },
        PathPreset {
            id: "system_icons".to_string(),
            label: "/usr/local/share/icons/hicolor".to_string(),
            path: "/usr/local/share/icons/hicolor".to_string(),
            is_privileged: true,
            description: "System-wide hicolor icon theme (Requires bypass & elevation)".to_string(),
        },
    ];

    DirectoryPresets {
        bin_dirs,
        install_dirs,
        application_dirs,
        icon_dirs,
    }
}

pub fn reset_config_to_defaults() -> Result<AppConfig, String> {
    let def = AppConfig::default();
    save_config(&def)?;
    Ok(def)
}

pub fn load_registry() -> RegistryData {
    let _ = ensure_directories();
    let path = get_registry_file_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(mut registry) = serde_json::from_str::<RegistryData>(&content) {
                for pkg in &mut registry.packages {
                    pkg.is_healthy = Path::new(&pkg.primary_binary).exists();
                }
                return registry;
            }
        }
    }
    RegistryData::default()
}

pub fn save_registry(data: &RegistryData) -> Result<(), String> {
    let _ = ensure_directories();
    let path = get_registry_file_path();
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write registry file {}: {}", path.display(), e))?;
    Ok(())
}

pub fn add_or_update_package(pkg: InstalledPackage) -> Result<(), String> {
    let mut reg = load_registry();
    reg.packages.retain(|p| p.id != pkg.id);
    reg.packages.push(pkg);
    save_registry(&reg)
}

pub fn remove_package(package_id: &str) -> Result<InstalledPackage, String> {
    remove_package_advanced(&UninstallRequest {
        package_id: package_id.to_string(),
        purge_user_configs: false,
    })
}

pub fn remove_package_advanced(req: &UninstallRequest) -> Result<InstalledPackage, String> {
    let mut reg = load_registry();
    let pos = reg.packages.iter().position(|p| p.id == req.package_id)
        .ok_or_else(|| format!("Package with ID '{}' not found in registry", req.package_id))?;
    
    let pkg = reg.packages.remove(pos);

    // 1. Remove all created symlinks
    for symlink_path in &pkg.symlinks {
        let path = Path::new(symlink_path);
        if path.exists() || path.is_symlink() {
            let _ = fs::remove_file(path);
        }
    }

    // 2. Remove desktop files
    for desktop_file in &pkg.desktop_files {
        let path = Path::new(desktop_file);
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    // 3. Remove icons
    for icon_file in &pkg.icon_files {
        let path = Path::new(icon_file);
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    // 4. Remove installation directory
    let install_dir = Path::new(&pkg.install_dir);
    if install_dir.exists() {
        let _ = fs::remove_dir_all(install_dir);
    }

    // 5. Optional Purge: Remove user config & data directories if requested
    if req.purge_user_configs {
        let home = get_home_dir();
        let user_config = home.join(".config").join(&pkg.id);
        if user_config.exists() && user_config.is_dir() {
            let _ = fs::remove_dir_all(user_config);
        }
        let user_data = home.join(".local").join("share").join(&pkg.id);
        if user_data.exists() && user_data.is_dir() {
            let _ = fs::remove_dir_all(user_data);
        }
    }

    // 6. Update desktop database if available
    let _ = Command::new("update-desktop-database")
        .arg(crate::system_paths::get_applications_dir())
        .output();

    save_registry(&reg)?;
    Ok(pkg)
}

pub fn get_cache_status() -> CacheStatusReport {
    let staging = get_cache_staging_dir();
    let parent = staging.parent().unwrap_or(&staging);
    let size_bytes = calculate_dir_size(parent);
    let size_formatted = format_bytes(size_bytes);

    let mut count = 0;
    if let Ok(entries) = walkdir::WalkDir::new(parent).into_iter().collect::<Result<Vec<_>, _>>() {
        count = entries.len();
    }

    CacheStatusReport {
        cache_dir: parent.to_string_lossy().to_string(),
        size_bytes,
        size_formatted,
        item_count: count,
    }
}

pub fn clear_cache_staging() -> Result<u64, String> {
    let staging = get_cache_staging_dir();
    let initial_size = calculate_dir_size(&staging);

    if staging.exists() {
        for entry in fs::read_dir(&staging).map_err(|e| format!("Cannot read cache staging: {}", e))? {
            if let Ok(e) = entry {
                let p = e.path();
                if p.is_dir() {
                    let _ = fs::remove_dir_all(&p);
                } else {
                    let _ = fs::remove_file(&p);
                }
            }
        }
    }

    Ok(initial_size)
}

pub fn export_registry_json() -> Result<String, String> {
    let reg = load_registry();
    serde_json::to_string_pretty(&reg)
        .map_err(|e| format!("Failed to export registry: {}", e))
}

pub fn import_registry_json(json_content: &str) -> Result<usize, String> {
    let imported: RegistryData = serde_json::from_str(json_content)
        .map_err(|e| format!("Invalid registry JSON: {}", e))?;

    let mut current = load_registry();
    let count = imported.packages.len();

    for pkg in imported.packages {
        current.packages.retain(|p| p.id != pkg.id);
        current.packages.push(pkg);
    }

    save_registry(&current)?;
    Ok(count)
}
