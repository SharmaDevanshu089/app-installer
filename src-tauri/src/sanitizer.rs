use std::path::{Path, PathBuf};

/// Sanitizes and validates a CLI alias.
/// Rejects shell injection characters, spaces, and metacharacters.
/// Enforces POSIX-safe executable naming: `^[a-zA-Z0-9][a-zA-Z0-9_\-\.]{0,63}$`.
pub fn sanitize_cli_alias(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Command alias cannot be empty".to_string());
    }

    if trimmed.len() > 64 {
        return Err("Command alias must be at most 64 characters long".to_string());
    }

    // Check for dangerous shell metacharacters
    let dangerous_chars = [
        ';', '&', '|', '`', '$', '\n', '\r', '\0', '\t', ' ',
        '\'', '"', '\\', '<', '>', '(', ')', '{', '}', '[', ']',
        '*', '?', '~', '!', '#', '%', '^', '=', ':',
    ];

    if let Some(bad_char) = trimmed.chars().find(|c| dangerous_chars.contains(c)) {
        return Err(format!(
            "Invalid character '{}' in command alias. Use only alphanumeric characters, dashes, and underscores.",
            bad_char
        ));
    }

    // Must start with an alphanumeric character
    let first = trimmed.chars().next().unwrap();
    if !first.is_ascii_alphanumeric() {
        return Err("Command alias must start with a letter or digit".to_string());
    }

    // Ensure all characters are safe
    if !trimmed.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.') {
        return Err("Command alias may only contain alphanumeric characters, dashes, underscores, and dots".to_string());
    }

    // Disallow reserved names
    let reserved = ["sudo", "rm", "sh", "bash", "root", "init", "systemd", "login", "su"];
    if reserved.contains(&trimmed.to_lowercase().as_str()) {
        return Err(format!("'{}' is a reserved system binary name and cannot be used", trimmed));
    }

    Ok(trimmed.to_string())
}

/// Sanitizes a string for use in FreeDesktop .desktop files (escapes control characters).
pub fn sanitize_desktop_entry_string(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for c in raw.chars() {
        match c {
            '\n' | '\r' => out.push(' '),
            '\\' => out.push_str("\\\\"),
            ';' => out.push_str("\\;"),
            _ => out.push(c),
        }
    }
    out.trim().to_string()
}

/// Checks if a path is outside the user's home directory and thus requires elevated permissions.
pub fn is_path_privileged(dest: &Path, home: &Path) -> bool {
    !dest.starts_with(home)
}

/// Validates that an installation destination directory is safely contained inside the user's home directory,
/// or in approved privileged system locations (`/opt`, `/usr/local`) if the bypass flag is enabled.
/// Permanent safeguard: Critical system directories (`/`, `/etc`, `/bin`, `/sbin`, `/boot`, `/root`, etc.)
/// are strictly and permanently forbidden under all circumstances.
pub fn validate_install_destination(dest: &Path, home: &Path, allow_privileged: bool) -> Result<PathBuf, String> {
    if !dest.is_absolute() {
        return Err(format!("Install destination must be an absolute path: {}", dest.display()));
    }

    let dest_str = dest.to_string_lossy();
    if dest_str.contains('\0') {
        return Err("Path contains null bytes".to_string());
    }

    // Prevent directory traversal
    if dest.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err("Path contains '..' directory traversal components".to_string());
    }

    // Permanent hard-forbidden critical system roots (NEVER allowed, even with bypass)
    let hard_forbidden = [
        "/", "/etc", "/bin", "/sbin", "/lib", "/lib64",
        "/var", "/boot", "/sys", "/proc", "/dev", "/root",
        "/tmp", "/run"
    ];

    for prefix in &hard_forbidden {
        if *prefix == "/" {
            if dest_str == "/" {
                return Err("Critical security violation: Cannot install directly into filesystem root '/'.".to_string());
            }
        } else if dest_str == *prefix || dest_str.starts_with(&format!("{}/", prefix)) {
            return Err(format!(
                "Critical security violation: Directory '{}' is a protected system location and cannot be modified under any circumstances.",
                dest.display()
            ));
        }
    }

    // Check home directory containment vs privileged system paths
    if dest.starts_with(home) {
        return Ok(dest.to_path_buf());
    }

    if !allow_privileged {
        return Err(format!(
            "Security violation: Destination '{}' is outside user home '{}'. App Installer operates rootless by default. To use system directories like /opt or /usr/local, enable 'Allow Privileged System Paths' in Settings.",
            dest.display(),
            home.display()
        ));
    }

    // When privileged bypass is active, only approved system application paths are permitted
    let allowed_privileged_prefixes = ["/opt", "/usr/local"];
    let is_allowed_system_path = allowed_privileged_prefixes.iter().any(|prefix| {
        dest_str == *prefix || dest_str.starts_with(&format!("{}/", prefix))
    });

    if !is_allowed_system_path {
        return Err(format!(
            "Security violation: Privileged bypass only permits subdirectories within '/opt' or '/usr/local'. Destination '{}' is not an approved software path.",
            dest.display()
        ));
    }

    Ok(dest.to_path_buf())
}

/// Validates that a source package file path exists, is a regular file, and is readable.
pub fn validate_source_package_path(path: &Path) -> Result<PathBuf, String> {
    if !path.exists() {
        return Err(format!("Source package file does not exist: {}", path.display()));
    }

    if !path.is_file() {
        return Err(format!("Source path is not a regular file: {}", path.display()));
    }

    if path.to_string_lossy().contains('\0') {
        return Err("Path contains invalid null byte characters".to_string());
    }

    let canonical = path.canonicalize()
        .map_err(|e| format!("Failed to resolve canonical path for {}: {}", path.display(), e))?;

    Ok(canonical)
}
