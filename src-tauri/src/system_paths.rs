use std::path::{Path, PathBuf};
use std::fs;

pub fn get_home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home/dev"))
}

pub fn get_default_install_dir() -> PathBuf {
    get_home_dir().join(".local").join("opt")
}

pub fn get_bin_dir() -> PathBuf {
    get_home_dir().join(".local").join("bin")
}

pub fn get_applications_dir() -> PathBuf {
    get_home_dir().join(".local").join("share").join("applications")
}

pub fn get_icons_dir() -> PathBuf {
    get_home_dir().join(".local").join("share").join("icons").join("hicolor")
}

pub fn get_config_dir() -> PathBuf {
    get_home_dir().join(".config").join("app-installer")
}

pub fn get_cache_staging_dir() -> PathBuf {
    get_home_dir().join(".cache").join("app-installer").join("staging")
}

pub fn ensure_directories() -> Result<(), String> {
    let dirs = [
        get_default_install_dir(),
        get_bin_dir(),
        get_applications_dir(),
        get_icons_dir().join("512x512").join("apps"),
        get_icons_dir().join("scalable").join("apps"),
        get_config_dir(),
        get_cache_staging_dir(),
    ];

    for dir in &dirs {
        fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create directory {}: {}", dir.display(), e))?;
    }

    Ok(())
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = 1024 * KB;
    const GB: u64 = 1024 * MB;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

pub fn calculate_dir_size(path: &Path) -> u64 {
    let mut total: u64 = 0;
    if let Ok(entries) = walkdir::WalkDir::new(path).into_iter().collect::<Result<Vec<_>, _>>() {
        for entry in entries {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total += metadata.len();
                }
            }
        }
    }
    total
}
