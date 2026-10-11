use std::env;
use std::fs::{self, OpenOptions};
use std::io::Write;
use crate::models::{PathStatusReport, ShellConfigInfo};
use crate::system_paths::{get_bin_dir, get_home_dir};

pub fn check_path_status() -> PathStatusReport {
    let bin_dir = get_bin_dir();
    let bin_str = bin_dir.to_string_lossy().to_string();
    let path_env = env::var("PATH").unwrap_or_default();

    let is_in_current_path = path_env.split(':').any(|segment| {
        let trimmed = segment.trim();
        trimmed == bin_str || (trimmed.ends_with("/.local/bin") && trimmed.contains(".local"))
    });

    let home = get_home_dir();
    let shell_candidates = [
        ("Bash (rc)", home.join(".bashrc")),
        ("Bash (profile)", home.join(".bash_profile")),
        ("Zsh", home.join(".zshrc")),
        ("Profile", home.join(".profile")),
        ("Fish", home.join(".config").join("fish").join("config.fish")),
    ];

    let mut shell_configs = Vec::new();

    for (shell_name, file_path) in shell_candidates {
        let exists = file_path.exists();
        let mut has_entry = false;

        if exists {
            if let Ok(content) = fs::read_to_string(&file_path) {
                if content.contains(".local/bin") {
                    has_entry = true;
                }
            }
        }

        shell_configs.push(ShellConfigInfo {
            shell_name: shell_name.to_string(),
            config_path: file_path.to_string_lossy().to_string(),
            file_exists: exists,
            has_path_entry: has_entry,
        });
    }

    PathStatusReport {
        is_in_current_path,
        target_bin_dir: bin_str,
        current_path_env: path_env,
        shell_configs,
    }
}

pub fn fix_path_environment(target_file: Option<String>) -> Result<String, String> {
    let bin_dir = get_bin_dir();
    let _ = fs::create_dir_all(&bin_dir);

    let home = get_home_dir();
    let target_path = if let Some(custom) = target_file {
        std::path::PathBuf::from(custom)
    } else {
        // Preference: .bashrc if exists, else .zshrc, else .profile
        if home.join(".bashrc").exists() {
            home.join(".bashrc")
        } else if home.join(".zshrc").exists() {
            home.join(".zshrc")
        } else {
            home.join(".profile")
        }
    };

    let is_fish = target_path.to_string_lossy().ends_with(".fish");

    let snippet = if is_fish {
        "\n# Added by App Installer (app-installer)\nfish_add_path -g $HOME/.local/bin\n".to_string()
    } else {
        "\n# Added by App Installer (app-installer)\nexport PATH=\"$HOME/.local/bin:$PATH\"\n".to_string()
    };

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&target_path)
        .map_err(|e| format!("Failed to open {} for writing: {}", target_path.display(), e))?;

    file.write_all(snippet.as_bytes())
        .map_err(|e| format!("Failed to append PATH configuration: {}", e))?;

    Ok(format!("Successfully added PATH configuration to {}", target_path.display()))
}
