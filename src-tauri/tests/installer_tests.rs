use app_installer_lib::inspector::inspect_package;
use app_installer_lib::installer::install_package;
use app_installer_lib::models::{InstallRequest, PackageType, UninstallRequest};
use app_installer_lib::registry::{
    clear_cache_staging, export_registry_json, get_cache_status, import_registry_json,
    load_registry, remove_package_advanced, reset_config_to_defaults,
};
use app_installer_lib::path_checker::check_path_status;
use app_installer_lib::sanitizer::{sanitize_cli_alias, validate_install_destination};
use app_installer_lib::system_paths::get_home_dir;
use std::fs;
use std::path::Path;

#[test]
fn test_sanitization_rules() {
    // Valid aliases
    assert!(sanitize_cli_alias("blender").is_ok());
    assert!(sanitize_cli_alias("my-app-2.0").is_ok());
    assert!(sanitize_cli_alias("tool_cli").is_ok());

    // Invalid aliases (shell injection, spaces, reserved names)
    assert!(sanitize_cli_alias("").is_err());
    assert!(sanitize_cli_alias("my app").is_err());
    assert!(sanitize_cli_alias("test; rm -rf /").is_err());
    assert!(sanitize_cli_alias("app$VAR").is_err());
    assert!(sanitize_cli_alias("`whoami`").is_err());
    assert!(sanitize_cli_alias("sudo").is_err());
    assert!(sanitize_cli_alias("-invalid-start").is_err());

    // Path security guard - rootless default mode
    let home = get_home_dir();
    assert!(validate_install_destination(&home.join(".local/opt/test"), &home, false).is_ok());
    assert!(validate_install_destination(Path::new("/usr/bin/evil"), &home, false).is_err());
    assert!(validate_install_destination(Path::new("/etc/evil"), &home, false).is_err());
    assert!(validate_install_destination(Path::new("/var/evil"), &home, false).is_err());
    assert!(validate_install_destination(Path::new("/opt/test"), &home, false).is_err());

    // Privileged bypass mode allows /opt and /usr/local
    assert!(validate_install_destination(Path::new("/opt/test"), &home, true).is_ok());
    assert!(validate_install_destination(Path::new("/usr/local/bin"), &home, true).is_ok());

    // Critical system paths are PERMANENTLY FORBIDDEN even with bypass mode
    assert!(validate_install_destination(Path::new("/"), &home, true).is_err());
    assert!(validate_install_destination(Path::new("/etc/shadow"), &home, true).is_err());
    assert!(validate_install_destination(Path::new("/bin/sh"), &home, true).is_err());
    assert!(validate_install_destination(Path::new("/sbin/init"), &home, true).is_err());
    assert!(validate_install_destination(Path::new("/boot/vmlinuz"), &home, true).is_err());
    assert!(validate_install_destination(Path::new("/root/.bashrc"), &home, true).is_err());
}

#[test]
fn test_inspect_and_install_lifecycle() {
    let test_tar = "/tmp/hello-world-1.0.0-x86_64.tar.gz";
    assert!(Path::new(test_tar).exists(), "Test package must exist");

    // 1. Test Inspection
    let inspect_res = inspect_package(test_tar).expect("Inspection should succeed");
    assert_eq!(inspect_res.file_name, "hello-world-1.0.0-x86_64.tar.gz");
    assert!(matches!(inspect_res.package_type, PackageType::TarGz));
    assert_eq!(inspect_res.suggested_name, "Hello World Utility");
    assert!(inspect_res.icon_base64.is_some(), "Embedded icon should be extracted");
    assert!(!inspect_res.discovered_binaries.is_empty(), "Should discover bin/hello-world");

    let primary_bin = inspect_res.discovered_binaries.iter().find(|b| b.is_primary_candidate);
    assert!(primary_bin.is_some(), "Primary binary candidate should be selected");

    // 2. Test Installation with sanitized alias
    let install_req = InstallRequest {
        file_path: test_tar.to_string(),
        package_type: inspect_res.package_type,
        name: inspect_res.suggested_name.clone(),
        version: inspect_res.suggested_version,
        selected_binary_relative: primary_bin.unwrap().relative_path.clone(),
        cli_alias: "test-hello-world".to_string(),
        categories: vec!["Utility".to_string()],
        description: "Test installed utility".to_string(),
        create_desktop_shortcut: true,
        create_terminal_symlink: true,
        icon_base64: inspect_res.icon_base64,
        staging_dir: inspect_res.staging_dir,
    };

    let installed = install_package(install_req).expect("Installation should succeed");
    assert_eq!(installed.id, "test-hello-world");
    assert!(Path::new(&installed.install_dir).exists(), "Install directory must exist");
    assert!(Path::new(&installed.primary_binary).exists(), "Primary binary must exist");
    assert_eq!(installed.symlinks.len(), 1);
    assert!(Path::new(&installed.symlinks[0]).exists(), "Symlink must exist");
    assert_eq!(installed.desktop_files.len(), 1);
    assert!(Path::new(&installed.desktop_files[0]).exists(), "Desktop file must exist");
    assert!(!installed.change_audit_log.is_empty(), "Audit log must contain steps");

    // 3. Test Registry Persistence, Export & Import
    let reg = load_registry();
    let found = reg.packages.iter().find(|p| p.id == "test-hello-world");
    assert!(found.is_some(), "Package must be registered in registry.json");

    let exported_json = export_registry_json().expect("Registry export should succeed");
    assert!(exported_json.contains("test-hello-world"));
    let imported_count = import_registry_json(&exported_json).expect("Import should succeed");
    assert!(imported_count >= 1);

    // 4. Test PATH Check
    let path_report = check_path_status();
    assert!(!path_report.target_bin_dir.is_empty());

    // 5. Test Cache & Config operations
    let cache_status = get_cache_status();
    assert!(!cache_status.cache_dir.is_empty());
    let _ = clear_cache_staging();

    let def_config = reset_config_to_defaults().expect("Config reset should succeed");
    assert_eq!(def_config.active_theme, "gtk");

    // 6. Test Advanced Clean Uninstallation with Purge
    // Create dummy user config to verify purge
    let dummy_cfg = get_home_dir().join(".config").join("test-hello-world");
    let _ = fs::create_dir_all(&dummy_cfg);
    assert!(dummy_cfg.exists());

    let unreq = UninstallRequest {
        package_id: "test-hello-world".to_string(),
        purge_user_configs: true,
    };
    let removed = remove_package_advanced(&unreq).expect("Uninstallation should succeed");
    assert_eq!(removed.id, "test-hello-world");
    assert!(!Path::new(&installed.install_dir).exists(), "Install dir must be deleted");
    assert!(!Path::new(&installed.symlinks[0]).exists(), "Symlink must be deleted");
    assert!(!Path::new(&installed.desktop_files[0]).exists(), "Desktop file must be deleted");
    assert!(!dummy_cfg.exists(), "User config must be purged");

    let reg_after = load_registry();
    assert!(reg_after.packages.iter().all(|p| p.id != "test-hello-world"), "Package must be removed from registry");
}
