use std::fs::{self, File};
use std::io::{Read, BufReader};
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use std::process::Command;
use sha2::{Sha256, Digest};
use uuid::Uuid;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

use crate::models::{DiscoveredBinary, InspectResult, PackageType};
use crate::system_paths::{format_bytes, get_cache_staging_dir};

pub fn detect_package_type(path: &Path) -> PackageType {
    // 1. Always prioritize magic bytes first (file content is the ultimate source of truth)
    if let Ok(mut file) = File::open(path) {
        let mut buf = [0u8; 6];
        if file.read_exact(&mut buf).is_ok() {
            // Gzip magic bytes: 0x1F, 0x8B
            if buf[0] == 0x1f && buf[1] == 0x8b {
                return PackageType::TarGz;
            }
            // XZ magic bytes: 0xFD '7' 'z' 'X' 'Z' 0x00
            if buf.starts_with(&[0xfd, b'7', b'z', b'X', b'Z', 0x00]) {
                return PackageType::TarXz;
            }
            // Bzip2 magic bytes: 'B' 'Z' 'h'
            if buf.starts_with(b"BZh") {
                return PackageType::TarBz2;
            }
            // ELF binary or AppImage
            if buf.starts_with(&[0x7f, b'E', b'L', b'F']) {
                let mut full_header = vec![0u8; 4096];
                let _ = file.read_exact(&mut full_header);
                if full_header.windows(8).any(|w| w == b"AI\x02" || w == b"AppImage") {
                    return PackageType::AppImage;
                }
            }
        }
    }

    // 2. Fall back to filename extensions if magic bytes were indeterminate
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
    if file_name.ends_with(".appimage") {
        return PackageType::AppImage;
    }
    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        return PackageType::TarGz;
    }
    if file_name.ends_with(".tar.xz") {
        return PackageType::TarXz;
    }
    if file_name.ends_with(".tar.bz2") {
        return PackageType::TarBz2;
    }
    if file_name.ends_with(".tar") {
        return PackageType::Tar;
    }

    PackageType::Unknown
}

pub fn calculate_file_sha256(path: &Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file for hashing: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = reader.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn derive_name_and_version(file_stem: &str) -> (String, String, String) {
    let mut clean = file_stem;
    for suffix in &[".tar", ".gz", ".xz", ".bz2", ".appimage"] {
        if clean.to_lowercase().ends_with(suffix) {
            clean = &clean[..clean.len() - suffix.len()];
        }
    }

    // Strip architecture markers
    let archs = [
        "-x86_64", "_x86_64", ".x86_64",
        "-amd64", "_amd64", ".amd64",
        "-linux", "_linux",
        "-gnu", "_gnu",
    ];
    let mut stripped = clean.to_string();
    for arch in &archs {
        if stripped.to_lowercase().ends_with(arch) {
            stripped = stripped[..stripped.len() - arch.len()].to_string();
        }
    }

    // Try finding version (e.g. -1.2.3 or _v1.0)
    let parts: Vec<&str> = stripped.split(|c| c == '-' || c == '_').collect();
    let mut version = "1.0.0".to_string();
    let mut name_parts = Vec::new();

    for part in parts {
        let trimmed = part.trim_start_matches('v').trim_start_matches('V');
        if trimmed.chars().any(|c| c.is_ascii_digit()) && trimmed.contains('.') {
            version = trimmed.to_string();
        } else {
            name_parts.push(part);
        }
    }

    let mut name = if name_parts.is_empty() {
        stripped.clone()
    } else {
        name_parts.join(" ")
    };

    // Capitalize words
    name = name.split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");

    let alias = name.to_lowercase().replace(' ', "-");
    (name, version, alias)
}

fn encode_icon_to_base64(path: &Path) -> Option<(String, String)> {
    if !path.exists() {
        return None;
    }
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mime = match ext.as_str() {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "xpm" => "image/x-xpixmap",
        _ => return None,
    };

    if let Ok(bytes) = fs::read(path) {
        let b64 = BASE64.encode(&bytes);
        let data_uri = format!("data:{};base64,{}", mime, b64);
        return Some((data_uri, mime.to_string()));
    }
    None
}

pub fn parse_desktop_file(content: &str) -> (Option<String>, Option<String>, Option<String>, Vec<String>, Option<String>) {
    let mut name = None;
    let mut comment = None;
    let mut exec = None;
    let mut categories = Vec::new();
    let mut icon = None;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() || line.starts_with('[') {
            continue;
        }
        if let Some((k, v)) = line.split_once('=') {
            let key = k.trim();
            let val = v.trim();
            match key {
                "Name" if name.is_none() => name = Some(val.to_string()),
                "Comment" if comment.is_none() => comment = Some(val.to_string()),
                "Exec" if exec.is_none() => exec = Some(val.to_string()),
                "Icon" if icon.is_none() => icon = Some(val.to_string()),
                "Categories" => {
                    categories = val.split(';')
                        .filter(|s| !s.trim().is_empty())
                        .map(|s| s.trim().to_string())
                        .collect();
                }
                _ => {}
            }
        }
    }

    (name, comment, exec, categories, icon)
}

pub fn inspect_package(file_path_str: &str) -> Result<InspectResult, String> {
    let source_path = crate::sanitizer::validate_source_package_path(Path::new(file_path_str))?;

    let file_metadata = fs::metadata(&source_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let file_size_bytes = file_metadata.len();
    let file_size_formatted = format_bytes(file_size_bytes);
    let sha256_checksum = calculate_file_sha256(&source_path)?;
    let package_type = detect_package_type(&source_path);

    let file_stem = source_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("app");
    let (derived_name, derived_version, derived_alias) = derive_name_and_version(file_stem);

    let staging_base = get_cache_staging_dir();
    let inspection_id = Uuid::new_v4().to_string();
    let staging_dir = staging_base.join(format!("inspect_{}", inspection_id));
    fs::create_dir_all(&staging_dir)
        .map_err(|e| format!("Failed to create staging directory: {}", e))?;

    let mut result = InspectResult {
        file_path: file_path_str.to_string(),
        file_name: source_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
        file_size_bytes,
        file_size_formatted,
        sha256_checksum,
        package_type: package_type.clone(),
        suggested_name: derived_name,
        suggested_version: derived_version,
        suggested_alias: derived_alias,
        description: "Standalone Linux Application".to_string(),
        categories: vec!["Utility".to_string()],
        icon_base64: None,
        icon_mime: None,
        discovered_binaries: Vec::new(),
        embedded_desktop_name: None,
        staging_dir: Some(staging_dir.to_string_lossy().to_string()),
    };

    match package_type {
        PackageType::AppImage => {
            inspect_appimage(&source_path, &staging_dir, &mut result)?;
        }
        PackageType::TarGz | PackageType::TarXz | PackageType::TarBz2 | PackageType::Tar => {
            inspect_archive(&source_path, &package_type, &staging_dir, &mut result)?;
        }
        PackageType::Unknown => {
            // Check if executable directly
            let is_elf = check_if_elf(&source_path);
            if is_elf {
                let fname = source_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "executable".to_string());
                result.discovered_binaries.push(DiscoveredBinary {
                    path: source_path.to_string_lossy().to_string(),
                    relative_path: fname.clone(),
                    name: fname,
                    is_elf: true,
                    is_script: false,
                    is_primary_candidate: true,
                });
            }
        }
    }

    Ok(result)
}

fn inspect_appimage(source_path: &Path, staging_dir: &Path, result: &mut InspectResult) -> Result<(), String> {
    // Ensure AppImage is executable
    if let Ok(meta) = fs::metadata(source_path) {
        let mut perms = meta.permissions();
        perms.set_mode(perms.mode() | 0o755);
        let _ = fs::set_permissions(source_path, perms);
    }

    // Try extracting metadata and icon using --appimage-extract
    // We run in staging_dir
    let _output = Command::new(source_path)
        .arg("--appimage-extract")
        .current_dir(staging_dir)
        .output();

    let squashfs_root = staging_dir.join("squashfs-root");
    if squashfs_root.exists() {
        scan_extracted_directory(&squashfs_root, result);
    } else {
        // Fallback: If --appimage-extract fails (e.g. no FUSE or security restriction), try --appimage-extract-and-run or manual scan
        let _fallback_output = Command::new(source_path)
            .env("APPIMAGE_EXTRACT_AND_RUN", "1")
            .arg("--appimage-extract")
            .current_dir(staging_dir)
            .output();

        if squashfs_root.exists() {
            scan_extracted_directory(&squashfs_root, result);
        }
    }

    // For AppImage, the primary binary is the AppImage file itself
    let app_filename = source_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "application.AppImage".to_string());
    result.discovered_binaries.insert(0, DiscoveredBinary {
        path: source_path.to_string_lossy().to_string(),
        relative_path: app_filename.clone(),
        name: app_filename,
        is_elf: true,
        is_script: false,
        is_primary_candidate: true,
    });

    Ok(())
}

fn inspect_archive(source_path: &Path, package_type: &PackageType, staging_dir: &Path, result: &mut InspectResult) -> Result<(), String> {
    // Unpack archive safely into staging_dir
    unpack_archive_safely(source_path, package_type, staging_dir)?;
    scan_extracted_directory(staging_dir, result);
    Ok(())
}

pub fn unpack_archive_safely(source_path: &Path, package_type: &PackageType, target_dir: &Path) -> Result<(), String> {
    crate::log_info!("EXTRACT", "Unpacking archive '{}' (type: {:?}) into '{}'", source_path.display(), package_type, target_dir.display());

    // 1. First attempt native Rust decompression
    let native_res: Result<(), String> = (|| {
        let file = File::open(source_path)
            .map_err(|e| format!("Cannot open archive {}: {}", source_path.display(), e))?;

        match package_type {
            PackageType::TarGz => {
                let gz = flate2::read::GzDecoder::new(file);
                let mut archive = tar::Archive::new(gz);
                unpack_tar_entries(&mut archive, target_dir)
            }
            PackageType::TarXz => {
                let xz = xz2::read::XzDecoder::new(file);
                let mut archive = tar::Archive::new(xz);
                unpack_tar_entries(&mut archive, target_dir)
            }
            PackageType::Tar => {
                let mut archive = tar::Archive::new(file);
                unpack_tar_entries(&mut archive, target_dir)
            }
            _ => Err("Non-native or bz2 format".to_string()),
        }
    })();

    if native_res.is_ok() {
        crate::log_info!("EXTRACT", "Native extraction succeeded for {}", source_path.display());
        return Ok(());
    }

    let err_detail = native_res.unwrap_err();
    crate::log_warn!("EXTRACT", "Native extraction failed ({}); falling back to GNU/system tar...", err_detail);

    // 2. High-resilience system tar fallback (handles auto-decompression, non-standard checksums, and mismatched extensions)
    let status = Command::new("tar")
        .arg("-xf")
        .arg(source_path)
        .arg("-C")
        .arg(target_dir)
        .status();

    match status {
        Ok(s) if s.success() => {
            crate::log_info!("EXTRACT", "System tar fallback extraction succeeded for {}", source_path.display());
            Ok(())
        }
        Ok(s) => {
            let msg = format!("System tar extraction failed with exit code: {:?}", s.code());
            crate::log_error!("EXTRACT", "{}", msg);
            Err(format!("{}. Native error was: {}", msg, err_detail))
        }
        Err(e) => {
            let msg = format!("Failed to spawn system tar: {}", e);
            crate::log_error!("EXTRACT", "{}", msg);
            Err(format!("{}. Native error was: {}", msg, err_detail))
        }
    }
}

fn unpack_tar_entries<R: Read>(archive: &mut tar::Archive<R>, target_dir: &Path) -> Result<(), String> {
    for entry_res in archive.entries().map_err(|e| format!("Corrupted tar entries: {}", e))? {
        let mut entry = entry_res.map_err(|e| format!("Tar entry read error: {}", e))?;
        let entry_path = entry.path().map_err(|e| format!("Invalid path in tar: {}", e))?.into_owned();

        // Zip-Slip / Path Traversal prevention
        if entry_path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
            return Err(format!("Security violation: entry contains '..' : {}", entry_path.display()));
        }

        let out_path = target_dir.join(&entry_path);
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed creating directory {}: {}", parent.display(), e))?;
        }

        entry.unpack(&out_path)
            .map_err(|e| format!("Failed unpacking {}: {}", out_path.display(), e))?;
    }
    Ok(())
}

fn scan_extracted_directory(root_dir: &Path, result: &mut InspectResult) {
    let mut desktop_files = Vec::new();
    let mut icon_files = Vec::new();
    let mut binaries = Vec::new();

    for entry in walkdir::WalkDir::new(root_dir).into_iter().flatten() {
        let path = entry.path();
        if path.is_file() {
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

            if ext == "desktop" {
                desktop_files.push(path.to_path_buf());
            } else if matches!(ext.as_str(), "png" | "svg" | "xpm") {
                icon_files.push(path.to_path_buf());
            }

            // Check if executable
            let is_elf = check_if_elf(path);
            let is_script = check_if_script(path);
            let has_exec_perm = fs::metadata(path)
                .map(|m| (m.permissions().mode() & 0o111) != 0)
                .unwrap_or(false);

            if is_elf || (is_script && has_exec_perm) {
                let rel_path = path.strip_prefix(root_dir)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .to_string();

                binaries.push(DiscoveredBinary {
                    path: path.to_string_lossy().to_string(),
                    relative_path: rel_path,
                    name: file_name.to_string(),
                    is_elf,
                    is_script,
                    is_primary_candidate: false,
                });
            }
        }
    }

    // Parse desktop file if present
    if let Some(first_desktop) = desktop_files.first() {
        if let Ok(content) = fs::read_to_string(first_desktop) {
            let (name, comment, _exec, cats, icon_name) = parse_desktop_file(&content);
            if let Some(n) = name {
                result.suggested_name = n;
            }
            if let Some(c) = comment {
                result.description = c;
            }
            if !cats.is_empty() {
                result.categories = cats;
            }
            result.embedded_desktop_name = first_desktop.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string());

            // If desktop specifies an icon name, try matching it in icon_files
            if let Some(target_icon) = icon_name {
                if let Some(matched) = icon_files.iter().find(|p| {
                    p.file_stem().and_then(|s| s.to_str()) == Some(&target_icon)
                }) {
                    if let Some((b64, mime)) = encode_icon_to_base64(matched) {
                        result.icon_base64 = Some(b64);
                        result.icon_mime = Some(mime);
                    }
                }
            }
        }
    }

    // If icon still not set, pick the best icon from icon_files
    if result.icon_base64.is_none() {
        // Prefer SVGs or 256/512 pngs
        let mut sorted_icons = icon_files.clone();
        sorted_icons.sort_by_key(|p| {
            let p_str = p.to_string_lossy().to_lowercase();
            if p_str.ends_with(".svg") {
                0
            } else if p_str.contains("512") || p_str.contains("256") {
                1
            } else if p_str.contains("128") || p_str.contains("64") {
                2
            } else {
                3
            }
        });

        if let Some(best_icon) = sorted_icons.first() {
            if let Some((b64, mime)) = encode_icon_to_base64(best_icon) {
                result.icon_base64 = Some(b64);
                result.icon_mime = Some(mime);
            }
        }
    }

    // Determine primary candidate among binaries
    let target_alias = result.suggested_alias.to_lowercase();
    let mut found_primary = false;

    for bin in &mut binaries {
        let b_name = bin.name.to_lowercase();
        if b_name == target_alias || b_name.contains(&target_alias) || bin.relative_path.starts_with("bin/") {
            bin.is_primary_candidate = true;
            found_primary = true;
            break;
        }
    }

    if !found_primary && !binaries.is_empty() {
        // Pick first ELF or first binary
        if let Some(elf_bin) = binaries.iter_mut().find(|b| b.is_elf) {
            elf_bin.is_primary_candidate = true;
        } else {
            binaries[0].is_primary_candidate = true;
        }
    }

    result.discovered_binaries = binaries;
}

fn check_if_elf(path: &Path) -> bool {
    if let Ok(mut file) = File::open(path) {
        let mut magic = [0u8; 4];
        if file.read_exact(&mut magic).is_ok() {
            return magic == [0x7f, b'E', b'L', b'F'];
        }
    }
    false
}

fn check_if_script(path: &Path) -> bool {
    if let Ok(mut file) = File::open(path) {
        let mut magic = [0u8; 2];
        if file.read_exact(&mut magic).is_ok() {
            return magic == [b'#', b'!'];
        }
    }
    false
}
