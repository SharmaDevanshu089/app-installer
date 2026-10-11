pub mod models;
pub mod logger;
pub mod system_paths;
pub mod registry;
pub mod inspector;
pub mod installer;
pub mod path_checker;
pub mod sanitizer;

use std::path::Path;
use std::process::Command;
use models::{
    AppConfig, CacheStatusReport, DirectoryPresets, InspectResult, InstallRequest, InstalledPackage,
    PathStatusReport, UninstallRequest,
};

#[tauri::command]
async fn inspect_package(file_path: String) -> Result<InspectResult, String> {
    log_info!("IPC", "inspect_package invoked: {}", file_path);
    tauri::async_runtime::spawn_blocking(move || {
        let res = inspector::inspect_package(&file_path);
        match &res {
            Ok(info) => log_info!("IPC", "inspect_package success: app '{}', type {:?}", info.suggested_name, info.package_type),
            Err(err) => log_error!("IPC", "inspect_package failed: {}", err),
        }
        res
    })
    .await
    .map_err(|e| format!("Inspection task execution error: {}", e))?
}

#[tauri::command]
async fn install_package(request: InstallRequest) -> Result<InstalledPackage, String> {
    log_info!("IPC", "install_package invoked: name '{}', version '{}', binary '{}'", request.name, request.version, request.selected_binary_relative);
    tauri::async_runtime::spawn_blocking(move || {
        let res = installer::install_package(request);
        match &res {
            Ok(pkg) => log_info!("IPC", "install_package success: id '{}', destination '{}'", pkg.id, pkg.install_dir),
            Err(err) => log_error!("IPC", "install_package failed: {}", err),
        }
        res
    })
    .await
    .map_err(|e| format!("Installation task execution error: {}", e))?
}

#[tauri::command]
fn list_installed_packages() -> Result<Vec<InstalledPackage>, String> {
    log_debug!("IPC", "list_installed_packages invoked");
    let registry = registry::load_registry();
    log_debug!("IPC", "list_installed_packages returning {} packages", registry.packages.len());
    Ok(registry.packages)
}

#[tauri::command]
fn uninstall_package(package_id: String) -> Result<InstalledPackage, String> {
    log_info!("IPC", "uninstall_package invoked: {}", package_id);
    let res = registry::remove_package(&package_id);
    match &res {
        Ok(pkg) => log_info!("IPC", "uninstall_package success: {}", pkg.name),
        Err(err) => log_error!("IPC", "uninstall_package failed: {}", err),
    }
    res
}

#[tauri::command]
fn uninstall_package_advanced(request: UninstallRequest) -> Result<InstalledPackage, String> {
    log_info!("IPC", "uninstall_package_advanced invoked: id '{}', purge configs: {}", request.package_id, request.purge_user_configs);
    let res = registry::remove_package_advanced(&request);
    match &res {
        Ok(pkg) => log_info!("IPC", "uninstall_package_advanced success: {}", pkg.name),
        Err(err) => log_error!("IPC", "uninstall_package_advanced failed: {}", err),
    }
    res
}

#[tauri::command]
fn launch_package(package_id: String) -> Result<String, String> {
    log_info!("IPC", "launch_package invoked: {}", package_id);
    let registry = registry::load_registry();
    let pkg = registry.packages.into_iter().find(|p| p.id == package_id)
        .ok_or_else(|| {
            let e = format!("Package '{}' not found", package_id);
            log_error!("IPC", "launch_package: {}", e);
            e
        })?;

    let binary_path = Path::new(&pkg.primary_binary);
    if !binary_path.exists() {
        let e = format!("Primary binary does not exist at {}", pkg.primary_binary);
        log_error!("IPC", "launch_package: {}", e);
        return Err(e);
    }

    let work_dir = binary_path.parent().unwrap_or_else(|| Path::new(&pkg.install_dir));

    Command::new(binary_path)
        .current_dir(work_dir)
        .spawn()
        .map_err(|e| {
            let err_msg = format!("Failed to launch application: {}", e);
            log_error!("IPC", "launch_package spawn error: {}", err_msg);
            err_msg
        })?;

    let success_msg = format!("Launched {}", pkg.name);
    log_info!("IPC", "launch_package success: {}", success_msg);
    Ok(success_msg)
}

#[tauri::command]
fn get_config() -> Result<AppConfig, String> {
    log_debug!("IPC", "get_config invoked");
    Ok(registry::load_config())
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    log_info!("IPC", "save_config invoked: theme '{}', mode '{}', install_base '{}'", config.active_theme, config.color_mode, config.install_base_dir);
    let res = registry::save_config(&config);
    if let Err(e) = &res {
        log_error!("IPC", "save_config failed: {}", e);
    }
    res
}

#[tauri::command]
fn reset_config_to_defaults() -> Result<AppConfig, String> {
    log_info!("IPC", "reset_config_to_defaults invoked");
    let default_config = AppConfig::default();
    registry::save_config(&default_config)?;
    Ok(default_config)
}

#[tauri::command]
fn get_cache_size() -> Result<CacheStatusReport, String> {
    log_debug!("IPC", "get_cache_size invoked");
    Ok(registry::get_cache_status())
}

#[tauri::command]
fn clean_cache() -> Result<String, String> {
    log_info!("IPC", "clean_cache invoked");
    let res = registry::clear_cache_staging().map(|bytes| {
        format!("Cleared {}", system_paths::format_bytes(bytes))
    });
    if let Err(e) = &res {
        log_error!("IPC", "clean_cache failed: {}", e);
    }
    res
}

#[tauri::command]
fn export_registry() -> Result<String, String> {
    log_info!("IPC", "export_registry invoked");
    registry::export_registry_json()
}

#[tauri::command]
fn import_registry(json_content: String) -> Result<usize, String> {
    log_info!("IPC", "import_registry invoked (payload len: {} bytes)", json_content.len());
    let res = registry::import_registry_json(&json_content);
    match &res {
        Ok(count) => log_info!("IPC", "import_registry successfully imported {} packages", count),
        Err(e) => log_error!("IPC", "import_registry failed: {}", e),
    }
    res
}

#[tauri::command]
fn validate_alias(alias: String) -> Result<bool, String> {
    log_debug!("IPC", "validate_alias: '{}'", alias);
    sanitizer::sanitize_cli_alias(&alias).map(|_| true)
}

#[tauri::command]
fn check_path_status() -> Result<PathStatusReport, String> {
    log_debug!("IPC", "check_path_status invoked");
    Ok(path_checker::check_path_status())
}

#[tauri::command]
fn fix_path_environment(shell_type: Option<String>) -> Result<String, String> {
    log_info!("IPC", "fix_path_environment invoked (shell_type: {:?})", shell_type);
    let res = path_checker::fix_path_environment(shell_type);
    match &res {
        Ok(msg) => log_info!("IPC", "fix_path_environment success: {}", msg),
        Err(e) => log_error!("IPC", "fix_path_environment failed: {}", e),
    }
    res
}

#[tauri::command]
fn open_directory(path: String) -> Result<(), String> {
    log_info!("IPC", "open_directory: '{}'", path);
    if let Err(e) = Command::new("xdg-open").arg(&path).spawn() {
        log_error!("IPC", "xdg-open failed: {}", e);
        return Err(format!("Failed to open directory: {}", e));
    }
    Ok(())
}

#[tauri::command]
fn pick_package_file() -> Result<Option<String>, String> {
    log_info!("IPC", "pick_package_file invoked (trying zenity / kdialog)");
    // Try zenity first (standard on GNOME / GTK)
    if let Ok(output) = Command::new("zenity")
        .arg("--file-selection")
        .arg("--title=Select Application Package")
        .arg("--file-filter=Supported Archives and Executables (*.AppImage, *.tar.gz, *.tar.xz, *.tar) | *.AppImage *.appimage *.tar.gz *.tgz *.tar.xz *.tar.bz2 *.tar")
        .output()
    {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                log_info!("IPC", "pick_package_file selected via zenity: {}", path_str);
                return Ok(Some(path_str));
            }
        }
    }

    // Try kdialog (standard on KDE)
    if let Ok(output) = Command::new("kdialog")
        .arg("--getopenfilename")
        .arg(".")
        .arg("*.AppImage *.appimage *.tar.gz *.tgz *.tar.xz *.tar.bz2 *.tar | Supported Packages")
        .output()
    {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                log_info!("IPC", "pick_package_file selected via kdialog: {}", path_str);
                return Ok(Some(path_str));
            }
        }
    }

    log_info!("IPC", "pick_package_file returned None (canceled or no dialog tools available)");
    Ok(None)
}

#[tauri::command]
fn window_minimize(window: tauri::Window) -> Result<(), String> {
    log_debug!("WINDOW", "window_minimize called");
    window.minimize().map_err(|e| {
        log_error!("WINDOW", "window_minimize error: {}", e);
        e.to_string()
    })
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::Window) -> Result<bool, String> {
    log_debug!("WINDOW", "window_toggle_maximize called");
    let is_max = window.is_maximized().map_err(|e| {
        log_error!("WINDOW", "window_is_maximized error: {}", e);
        e.to_string()
    })?;
    if is_max {
        window.unmaximize().map_err(|e| {
            log_error!("WINDOW", "window_unmaximize error: {}", e);
            e.to_string()
        })?;
        log_info!("WINDOW", "Window unmaximized");
        Ok(false)
    } else {
        window.maximize().map_err(|e| {
            log_error!("WINDOW", "window_maximize error: {}", e);
            e.to_string()
        })?;
        log_info!("WINDOW", "Window maximized");
        Ok(true)
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) -> Result<(), String> {
    log_info!("WINDOW", "window_close called");
    window.close().map_err(|e| {
        log_error!("WINDOW", "window_close error: {}", e);
        e.to_string()
    })
}

#[tauri::command]
fn window_start_dragging(window: tauri::Window) -> Result<(), String> {
    log_debug!("WINDOW", "window_start_dragging called");
    window.start_dragging().map_err(|e| {
        log_error!("WINDOW", "window_start_dragging error: {}", e);
        e.to_string()
    })
}

#[tauri::command]
fn get_directory_presets() -> Result<DirectoryPresets, String> {
    log_debug!("IPC", "get_directory_presets called");
    Ok(registry::get_directory_presets())
}

#[tauri::command]
fn is_elevated_path(path: String) -> Result<bool, String> {
    let home = system_paths::get_home_dir();
    let priv_status = sanitizer::is_path_privileged(Path::new(&path), &home);
    log_debug!("IPC", "is_elevated_path for '{}' -> {}", path, priv_status);
    Ok(priv_status)
}

#[tauri::command]
fn log_client_message(level: String, component: String, message: String) -> Result<(), String> {
    logger::log_msg(&level.to_uppercase(), &format!("FRONTEND::{}", component), &message);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init();
    log_info!("BOOT", "Ensuring standard XDG directories...");
    if let Err(e) = system_paths::ensure_directories() {
        log_error!("BOOT", "Failed to ensure directories: {}", e);
    } else {
        log_info!("BOOT", "XDG directories verified.");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            inspect_package,
            install_package,
            list_installed_packages,
            uninstall_package,
            uninstall_package_advanced,
            launch_package,
            get_config,
            save_config,
            reset_config_to_defaults,
            get_cache_size,
            clean_cache,
            export_registry,
            import_registry,
            validate_alias,
            check_path_status,
            fix_path_environment,
            open_directory,
            pick_package_file,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_start_dragging,
            get_directory_presets,
            is_elevated_path,
            log_client_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
