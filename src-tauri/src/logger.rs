use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Local;

static LOG_MUTEX: Mutex<()> = Mutex::new(());

/// Returns the primary log file path in the project root: `app-installer.log`
pub fn get_log_file_path() -> PathBuf {
    // 1. Try project root directory if detectable
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    cwd.join("app-installer.log")
}

/// Fallback user log path in case root is read-only
pub fn get_user_log_file_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home/dev"));
    home.join(".config/app-installer/app-installer.log")
}

/// Appends a structured log entry to the root log file and stderr
pub fn log_msg(level: &str, target: &str, message: &str) {
    let _lock = LOG_MUTEX.lock();
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let line = format!("[{}] [{}] [{}] {}\n", timestamp, level, target, message);

    // Print to stderr for immediate console visibility
    eprint!("{}", line);

    // Write to primary log file in current directory / project root
    let log_path = get_log_file_path();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = file.write_all(line.as_bytes());
        let _ = file.flush();
    } else {
        // Fallback to user config directory
        let fallback = get_user_log_file_path();
        if let Some(parent) = fallback.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&fallback) {
            let _ = file.write_all(line.as_bytes());
            let _ = file.flush();
        }
    }
}

#[macro_export]
macro_rules! log_info {
    ($target:expr, $($arg:tt)*) => {
        $crate::logger::log_msg("INFO", $target, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_warn {
    ($target:expr, $($arg:tt)*) => {
        $crate::logger::log_msg("WARN", $target, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_error {
    ($target:expr, $($arg:tt)*) => {
        $crate::logger::log_msg("ERROR", $target, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_debug {
    ($target:expr, $($arg:tt)*) => {
        $crate::logger::log_msg("DEBUG", $target, &format!($($arg)*))
    };
}

/// Initializes logger and logs boot banner
pub fn init() {
    let log_path = get_log_file_path();
    log_msg("INFO", "BOOT", &format!("=== App Installer Started === (Log destination: {})", log_path.display()));
}
