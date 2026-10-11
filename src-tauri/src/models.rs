use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PackageType {
    AppImage,
    TarGz,
    TarXz,
    TarBz2,
    Tar,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredBinary {
    pub path: String,
    pub relative_path: String,
    pub name: String,
    pub is_elf: bool,
    pub is_script: bool,
    pub is_primary_candidate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectResult {
    pub file_path: String,
    pub file_name: String,
    pub file_size_bytes: u64,
    pub file_size_formatted: String,
    pub sha256_checksum: String,
    pub package_type: PackageType,
    pub suggested_name: String,
    pub suggested_version: String,
    pub suggested_alias: String,
    pub description: String,
    pub categories: Vec<String>,
    pub icon_base64: Option<String>,
    pub icon_mime: Option<String>,
    pub discovered_binaries: Vec<DiscoveredBinary>,
    pub embedded_desktop_name: Option<String>,
    pub staging_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub file_path: String,
    pub package_type: PackageType,
    pub name: String,
    pub version: String,
    pub selected_binary_relative: String,
    pub cli_alias: String,
    pub categories: Vec<String>,
    pub description: String,
    pub create_desktop_shortcut: bool,
    pub create_terminal_symlink: bool,
    pub icon_base64: Option<String>,
    pub staging_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPackage {
    pub id: String,
    pub name: String,
    pub version: String,
    pub package_type: PackageType,
    pub installed_at: String,
    pub source_file: String,
    pub source_sha256: String,
    pub install_dir: String,
    pub primary_binary: String,
    pub cli_alias: String,
    pub symlinks: Vec<String>,
    pub desktop_files: Vec<String>,
    pub icon_files: Vec<String>,
    pub installed_files: Vec<String>,
    pub total_size_bytes: u64,
    pub total_size_formatted: String,
    pub categories: Vec<String>,
    pub description: String,
    pub icon_base64: Option<String>,
    pub change_audit_log: Vec<String>,
    pub is_healthy: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub install_base_dir: String,
    pub bin_dir: String,
    pub applications_dir: String,
    pub icons_dir: String,
    pub cache_dir: String,
    pub active_theme: String,
    #[serde(default = "default_color_mode")]
    pub color_mode: String,
    pub animation_level: String,
    pub check_path_on_startup: bool,
    pub auto_refresh_desktop_database: bool,
    pub default_create_desktop: bool,
    pub default_create_symlink: bool,
    pub default_categories: Vec<String>,
    pub preferred_shell: String,
    pub allow_privileged_system_paths: bool,
}

fn default_color_mode() -> String {
    "dark".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_default();
        Self {
            install_base_dir: home.join(".local/opt").to_string_lossy().to_string(),
            bin_dir: home.join(".local/bin").to_string_lossy().to_string(),
            applications_dir: home.join(".local/share/applications").to_string_lossy().to_string(),
            icons_dir: home.join(".local/share/icons/hicolor").to_string_lossy().to_string(),
            cache_dir: home.join(".cache/app-installer").to_string_lossy().to_string(),
            active_theme: "gtk".to_string(),
            color_mode: "dark".to_string(),
            animation_level: "smooth".to_string(),
            check_path_on_startup: true,
            auto_refresh_desktop_database: true,
            default_create_desktop: true,
            default_create_symlink: true,
            default_categories: vec!["Utility".to_string()],
            preferred_shell: "auto".to_string(),
            allow_privileged_system_paths: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathPreset {
    pub id: String,
    pub label: String,
    pub path: String,
    pub is_privileged: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryPresets {
    pub bin_dirs: Vec<PathPreset>,
    pub install_dirs: Vec<PathPreset>,
    pub application_dirs: Vec<PathPreset>,
    pub icon_dirs: Vec<PathPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallRequest {
    pub package_id: String,
    pub purge_user_configs: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStatusReport {
    pub cache_dir: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub item_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryData {
    pub version: u32,
    pub packages: Vec<InstalledPackage>,
}

impl Default for RegistryData {
    fn default() -> Self {
        Self {
            version: 1,
            packages: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellConfigInfo {
    pub shell_name: String,
    pub config_path: String,
    pub file_exists: bool,
    pub has_path_entry: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathStatusReport {
    pub is_in_current_path: bool,
    pub target_bin_dir: String,
    pub current_path_env: String,
    pub shell_configs: Vec<ShellConfigInfo>,
}
