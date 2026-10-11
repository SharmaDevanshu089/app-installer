# Application Context: App Installer (`app-installer`)

> **Application Name:** `app-installer`  
> **Identifier:** `com.dev.app-installer`  
> **Tech Stack:** Tauri v2 (Rust backend) + React 19 (TypeScript frontend) + Vite  
> **Target Operating System:** Linux (Debian/Ubuntu, Arch, Fedora, openSUSE, immutable distros, etc.) with cross-platform architectural abstractions  
> **Core Role:** Graphical Package Manager & Installer for `.AppImage`, `.tar`, `.tar.gz`, `.tar.xz`, and standalone Linux binaries.

---

## 1. Executive Overview & Problem Statement

### 1.1 The Problem on Modern Linux Desktops
On Linux, numerous desktop applications and developer utilities are distributed outside standard distribution repositories (`apt`, `dnf`, `pacman`) as standalone archives (`.tar`, `.tar.gz`, `.tar.xz`) or portable executables (`.AppImage`).

Currently, end users and developers face several frictions:
1. **Manual Extraction & Placement:** Archives must be extracted manually, often dumped into random folders (`~/Downloads`, `~/Apps`, or requiring `sudo` to write into `/opt`).
2. **Missing Desktop Integration:** Portable apps do not automatically create `.desktop` entries in application menus, docks, or system launchers (GNOME Shell, KDE Kickoff, rofi, wofi).
3. **Missing Icons:** Finding or extracting an application icon and configuring the `Icon=` property in a desktop entry is cumbersome.
4. **No Terminal `$PATH` Integration:** Executables are not in the system or user `$PATH`. Users must manually create symlinks or edit shell profiles (`~/.bashrc`, `~/.zshrc`, `~/.profile`).
5. **No Package Registry / Uninstaller:** There is no single place to track what is installed, how much disk space is consumed, or to cleanly remove an application without leaving orphaned files.

### 1.2 The Solution: `app-installer`
`app-installer` acts as a clean, user-space package manager and graphical installer. It allows users to drop any `.AppImage`, `.tar`, `.tar.gz`, or `.tar.xz` file into the UI, inspects the contents, extracts or configures it into standardized directories, creates desktop shortcuts and icons, symlinks binaries into the user's `$PATH`, and maintains an uninstallation registry.

---

## 2. Directory Hierarchy & Linux Standards

`app-installer` adheres strictly to the **XDG Base Directory Specification** and standard Linux user-space conventions, operating **rootless** (without requiring `sudo`) to ensure safety and system immutability compatibility:

```
~ (User Home)
├── .local/
│   ├── bin/                             <-- Symlinks to executables (added to $PATH)
│   │   ├── my-app -> ~/.local/opt/my-app/bin/my-app
│   │   └── other-tool -> ~/.local/opt/other-tool/other-tool.AppImage
│   │
│   ├── opt/                             <-- Extracted multi-file apps & isolated binaries
│   │   ├── my-app/
│   │   │   ├── bin/
│   │   │   ├── lib/
│   │   │   └── ...
│   │   └── other-tool/
│   │       ├── other-tool.AppImage
│   │       └── icon.png
│   │
│   └── share/
│       ├── applications/                <-- Desktop launchers (.desktop files)
│       │   ├── my-app.desktop
│       │   └── other-tool.desktop
│       │
│       ├── icons/hicolor/scalable/apps/ <-- Scalable application icons (.svg)
│       ├── icons/hicolor/512x512/apps/  <-- Raster application icons (.png)
│       │
│       └── app-installer/               <-- App Installer Metadata & Package DB
│           └── registry.json            <-- Installed packages manifest
│
└── .cache/
    └── app-installer/                   <-- Staging & extraction temp folder
```

### 2.1 Directory Responsibilities
- **`~/.local/bin/`**: The standard location for user executables. Every installed application exposes a primary binary symlinked here, allowing terminal access from any directory.
- **`~/.local/opt/<package-id>/`**: Isolated home for each application. Avoids polluting root `/opt` and requires zero root privileges.
- **`~/.local/share/applications/`**: Standard XDG location for user desktop shortcuts. Automatically indexed by desktop environments (GNOME, KDE, XFCE, Cinnamon, etc.).
- **`~/.local/share/icons/hicolor/<size>/apps/`**: Standard XDG icon theme path.
- **`~/.local/share/app-installer/registry.json`**: The internal database tracking installed apps, version, install timestamp, exact file lists, symlinks, and desktop entries for atomic removal.
- **`~/.cache/app-installer/`**: Scratch directory for secure temporary extraction and verification before finalizing an installation.

---

## 3. Package Types & Installation Pipelines

### 3.1 `.AppImage` Installation Flow
1. **Validation & Permissions:**
   - Verify file signature and format.
   - Set execution permission (`chmod +x` / `0o755`).
2. **Metadata & Icon Extraction:**
   - Execute `<appimage> --appimage-extract *.desktop` and icon files to a staging cache, or parse embedded ISO 9660 / Squashfs headers.
   - Read embedded `.desktop` file to retrieve:
     - `Name`, `GenericName`, `Comment`
     - `Categories`, `Keywords`
     - `Icon` filename
     - `StartupWMClass`
3. **Placement:**
   - Move or copy `.AppImage` to `~/.local/opt/<package-id>/<executable-name>.AppImage`.
   - Store extracted icon in `~/.local/share/icons/hicolor/<size>/apps/<package-id>.png` (or `.svg`).
4. **Desktop Entry Generation:**
   - Write updated `~/.local/share/applications/<package-id>.desktop`:
     ```ini
     [Desktop Entry]
     Type=Application
     Name=AppName
     Exec=/home/<user>/.local/opt/<package-id>/<executable-name>.AppImage %U
     Icon=/home/<user>/.local/share/icons/hicolor/512x512/apps/<package-id>.png
     Terminal=false
     Categories=Utility;
     StartupWMClass=AppName
     ```
5. **Path Integration:**
   - Symlink `~/.local/opt/<package-id>/<executable-name>.AppImage` to `~/.local/bin/<cli-alias>`.
6. **System Cache Refresh:**
   - Run `update-desktop-database ~/.local/share/applications` if binary is available.

---

### 3.2 `.tar`, `.tar.gz`, `.tar.xz`, `.tgz` Installation Flow
1. **Safe Archive Staging:**
   - Extract archive into `~/.cache/app-installer/staging/<uuid>/`.
   - **Security Guarantee:** Enforce Zip-Slip / Path Traversal prevention (reject entries with `..` or absolute paths resolving outside target root).
2. **Intelligent Executable & Metadata Detection:**
   - Detect if archive unpacks into a single root directory or loose files.
   - Scan for ELF binaries, scripts with executable permissions (`chmod +x`), or shebangs (`#!/bin/bash`, `#!/usr/bin/env python`, etc.).
   - Search for bundled `.desktop` and icon files (`.png`, `.svg`, `.xpm`).
   - If multiple binaries are found, prompt the user in the UI to select the primary launcher binary.
3. **Deployment:**
   - Move staged directory to `~/.local/opt/<package-id>/`.
   - Ensure all binary files retain executable bits (`0o755`).
4. **Desktop & Icon Integration:**
   - If bundled `.desktop` exists, adapt `Exec` and `Icon` paths to the new install location.
   - If missing, auto-generate a desktop entry using detected metadata or user-specified title and category.
   - Deploy icon to `~/.local/share/icons/hicolor/...` or reference local icon.
5. **Path Integration:**
   - Symlink primary executable to `~/.local/bin/<command-name>`.
6. **Registry Update:**
   - Record complete file manifest in `registry.json` for guaranteed 100% clean uninstallation.

---

## 4. PATH Management & System Integration

### 4.1 PATH Diagnostics & Auto-Setup
In many default Linux distributions, `~/.local/bin` is not automatically present in `$PATH` unless created prior to shell login, or certain shells (like `zsh` or custom setups) might omit it.

`app-installer` provides:
1. **Status Detector:**
   - Checks if `~/.local/bin` exists in current process `$PATH`.
   - Checks shell startup scripts:
     - Bash: `~/.bashrc`, `~/.bash_profile`, `~/.profile`
     - Zsh: `~/.zshrc`
     - Fish: `~/.config/fish/config.fish`
     - Systemd user env: `~/.config/environment.d/path.conf`
2. **One-Click PATH Setup:**
   - Append standard export line with clear comment headers:
     ```bash
     # Added by App Installer (app-installer)
     export PATH="$HOME/.local/bin:$PATH"
     ```
   - For fish:
     ```fish
     # Added by App Installer (app-installer)
     fish_add_path -g $HOME/.local/bin
     ```
3. **Collision Detection:**
   - Warns user before creating symlink if `~/.local/bin/<alias>` already exists or collides with another system binary in `/usr/bin` or `/bin`.

---

## 5. Package Registry & Uninstallation Architecture

### 5.1 Registry Data Model (`registry.json`)
Located at `~/.local/share/app-installer/registry.json`:

```json
{
  "version": 1,
  "packages": {
    "blender-4.3": {
      "id": "blender-4.3",
      "name": "Blender",
      "version": "4.3.0",
      "packageType": "tar.xz",
      "installedAt": "2026-10-11T10:15:30Z",
      "sourceArchive": "blender-4.3.0-linux-x64.tar.xz",
      "installDir": "/home/dev/.local/opt/blender-4.3",
      "primaryBinary": "/home/dev/.local/opt/blender-4.3/blender",
      "symlinks": [
        "/home/dev/.local/bin/blender"
      ],
      "desktopFiles": [
        "/home/dev/.local/share/applications/blender-4.3.desktop"
      ],
      "iconFiles": [
        "/home/dev/.local/share/icons/hicolor/scalable/apps/blender-4.3.svg"
      ],
      "totalSizeBytes": 894002100,
      "categories": ["Graphics", "3DGraphics"]
    }
  }
}
```

### 5.2 Guaranteed Clean Uninstallation
When an application is uninstalled:
1. Remove all created symlinks in `~/.local/bin/`.
2. Remove `.desktop` files in `~/.local/share/applications/`.
3. Remove deployed icon files in `~/.local/share/icons/`.
4. Delete the application installation directory in `~/.local/opt/<package-id>/`.
5. Trigger `update-desktop-database` to refresh launcher cache.
6. Remove record from `registry.json`.
7. **Result:** No orphaned symlinks, broken desktop shortcuts, or dangling files.

---

## 6. Technical Stack & Architecture

### 6.1 Frontend (React 19 + TypeScript + Vite)
- **UI Framework:** React 19 with functional components and hooks.
- **Desktop UI Design:** Modern, clean Linux desktop appearance (dark/light theme support, responsive card/list views).
- **Core Views:**
  - **Dashboard / Installed Apps:** Search, filter by package type, quick launch, inspect, uninstall.
  - **Installer Wizard / Dropzone:** Drag and drop `.AppImage` or `.tar.gz`. Shows file inspection, detected binaries, icon preview, customizable app name, and symlink alias.
  - **PATH Status & Diagnostics:** Visual indicator showing whether `~/.local/bin` is in `$PATH`, with one-click resolution.
  - **Settings View:** Manage install paths, default categories, and shell integrations.

### 6.2 Backend (Tauri v2 + Rust)
- **Framework:** Tauri v2 (`src-tauri`).
- **Core Rust Crates:**
  - `tauri` (v2) - Core application runtime & IPC.
  - `serde`, `serde_json` - Registry serialization and IPC models.
  - `flate2`, `tar`, `xz2` - Fast and safe decompression of `.tar`, `.tar.gz`, and `.tar.xz`.
  - `walkdir` - Directory traversal for finding executables and icons.
  - `dirs` or `xdg` - Resolution of standard user directories (`$HOME`, `$XDG_DATA_HOME`, etc.).
  - `which` - Checking system binary availability and `$PATH` resolution.
  - `infer` or `goblin` - File type and ELF executable header detection.
  - `chrono` - Timestamping installations.

### 6.3 Tauri IPC API Commands
| Command Name | Description | Parameters | Return Type |
|---|---|---|---|
| `inspect_package_file` | Inspects `.AppImage` or archive, extracts preview metadata, detects binaries & icons | `filePath: string` | `PackageInspectionResult` |
| `install_package` | Performs installation, file placement, permissions, desktop file, symlink, and registry update | `request: InstallPackageRequest` | `InstalledPackage` |
| `list_installed_packages`| Returns list of all installed packages from registry, validating on-disk health | *none* | `Vec<InstalledPackage>` |
| `uninstall_package` | Atomically removes all files, symlinks, desktop entries, and registry entry | `packageId: string` | `Result<(), string>` |
| `launch_package` | Spawns the installed application detached from the installer process | `packageId: string` | `Result<(), string>` |
| `check_path_status` | Checks if `~/.local/bin` is configured in user `$PATH` and shells | *none* | `PathStatusReport` |
| `fix_path_environment` | Automatically appends `~/.local/bin` to detected shell rc files | `shellType?: string` | `Result<string, string>` |

---

## 7. Security & Resilience Considerations

1. **Path Traversal / Zip Slip Prevention:** Archive extraction checks every file path canonicalization to ensure no files can escape the target extraction directory.
2. **Non-Root Execution:** All operations run strictly with user privileges. No accidental overwriting of `/usr/bin`, `/etc`, or `/lib`.
3. **Staging & Atomic Rollback:** Archives and AppImages are unpacked and verified in a temporary staging cache. If any step fails (e.g., corrupted archive, disk full, missing binary), the staging files are purged, leaving the system untouched.
4. **Executable Sandboxing Awareness:** Handles AppImages running on modern Ubuntu/AppArmor without failing on FUSE requirements (adds `--appimage-extract-and-run` fallback if system FUSE is missing).
5. **Executable Permission Safety:** Restricts executable bits strictly to detected binaries, avoiding arbitrary execution permissions on non-executable files.

---

## 8. Summary of Goals for Development

- [x] Application context and architectural specification defined.
- [x] Add archive extraction (`flate2`, `tar`, `xz2`, `walkdir`, `dirs`) to `src-tauri/Cargo.toml`.
- [x] Implement Rust backend modules:
  - `installer` - AppImage & archive extraction, permissions, desktop integration, PolicyKit elevation.
  - `inspector` - Safe inspection, ELF binary detection, icon extraction.
  - `path_checker` - PATH environment diagnostics and shell configuration helpers.
  - `registry` - Atomic CRUD operations for `registry.json` and human-readable `config.json`.
  - `sanitizer` - POSIX CLI alias validation and permanent system path invariants.
- [x] Implement React frontend:
  - Custom Linux frameless HeaderBar with window controls (`—`, `□`, `✕`).
  - Auto-verifying & auto-hiding `PathInfoBar`.
  - Dark Mode & Light Mode dual-engine with high-contrast dropdowns in dark mode.
  - Hero Install button positioned prominently throughout the interface.
  - Native Linux HIG buttons (zero border radius, minimal vertical padding, high density).
  - Directory presets dropdown with custom path overrides.
  - Clean uninstallation with optional user config purge.

---

## 9. Recent Refinements & User-Requested Improvements

### 9.1 Native Linux Desktop Aesthetic Overhaul
1. **Elimination of AI Visual Tropes:**
   - Removed oversized 24px-32px border radiuses, glowing neon borders, and fluffy vertical paddings.
   - Enforced strict `0px` border radius on action buttons, inputs, and controls to align with authentic native Linux desktop utilities (e.g. `gparted`, `synaptic`, GNOME Disks).
   - Minimal vertical padding (`padding: 1px 8px; height: 24px;`) across all buttons and inputs.
2. **Hero Install Button as Main Focus:**
   - Designed a dedicated `.btn-hero-install` class with distinct accent styling, prominent positioning in the HeaderBar, Empty State, and Inspection Modal.
3. **Dual Color Mode (Dark & Light):**
   - Implemented full Light Mode alongside Dark Mode for all 5 desktop design philosophies (GNOME Adwaita, KDE Breeze, macOS Aqua, System76 COSMIC, Nord).
   - Added instant one-click Dark/Light mode toggle in the HeaderBar and a selector in Settings.
4. **Dropdown Visibility in Dark Mode:**
   - Explicitly styled `select` and `option` backgrounds (`--select-bg`, `--select-option-bg`, `--select-text`) to guarantee high contrast and crisp readability against dark themes.

### 9.2 Crash Prevention & Backend Hardening
1. **Removed Panicking `unwrap()` Calls:**
   - In `installer.rs`: Replaced `.to_str().unwrap()` on paths with safe `.to_string_lossy()` preventing panics on non-UTF-8 paths during elevated operations.
   - In `inspector.rs`: Replaced `.file_name().unwrap()` with safe `.file_name().map(...).unwrap_or(...)` handling paths ending in root `/` or `..`.
2. **Frontend Safeguards:**
   - In `App.tsx`: Protected `filteredPackages` search filter with null/undefined guards on `pkg.name`, `pkg.cliAlias`, `pkg.categories`, and `pkg.description`.
   - In `SettingsPage.tsx`: Added optional chaining on `presets?.installDirs?.find` and `presets?.binDirs?.find`.
   - Removed orphaned `SettingsModal.tsx` to eliminate configuration clobbering risks.

### 9.3 Window Dragging & Permission Resolution
1. **Window Capability Matching:**
   - Fixed `src-tauri/tauri.conf.json` window declaration by explicitly setting `"label": "main"`. Previously, the window had no explicit label, causing permissions targeting window `"main"` in `capabilities/default.json` to fail to bind.
2. **Comprehensive Tauri v2 Core Permissions:**
   - Updated `capabilities/default.json` to grant permissions for:
     - `core:window:allow-start-dragging`
     - `core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-unmaximize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`
     - `core:window:allow-is-maximized`, `core:window:allow-is-minimized`, `core:window:allow-set-focus`
     - `opener:allow-open-path`, `opener:allow-reveal-item-in-dir`
3. **Dual Drag Mechanism in HeaderBar:**
   - Added `window_start_dragging` IPC command calling Rust's `window.start_dragging()`.
   - In `HeaderBar.tsx`, combined `data-tauri-drag-region` with an active `onMouseDown` handler invoking `window_start_dragging` when clicking non-interactive regions.
   - Inserted flexible `.header-drag-space` elements on both sides of the center button bar, guaranteeing clear, draggable surface area.

### 9.4 Comprehensive Root Logging Architecture
1. **Centralized Log File in Root:**
   - All logs write to `app-installer.log` located at the project root (`/home/dev/App Installer/app-installer.log`), with fallback to `~/.config/app-installer/app-installer.log`.
2. **Crash & Panic Tracing:**
   - Global `panic::set_hook` installed in `src-tauri/src/main.rs` catches any Rust runtime panic, extracts the message and source file/line location, and appends a `[FATAL] [PANIC_HOOK]` entry to `app-installer.log`.
3. **IPC & Subsystem Trace:**
   - Every IPC command (`inspect_package`, `install_package`, `launch_package`, `save_config`, `pick_package_file`, window actions, PolicyKit elevation) logs arguments, step progress, and full error details.
4. **Client-Side Error Forwarding:**
   - `clientLogger.ts` hooks into `window.onerror`, `window.onunhandledrejection`, and intercepts `console.error`/`console.warn`, routing them to Rust's `log_client_message` command for uniform auditing.

### 9.5 Archive Format Resilience & Asynchronous Execution
1. **Magic Byte Priority Over Misleading File Extensions:**
   - Fixed `detect_package_type`: archives like `/home/dev/Downloads/Antigravity.tar` that are actually gzip compressed (`0x1F 0x8B`) are now detected by magic bytes first rather than blindly relying on `.tar` extension.
2. **Dual-Tier Resilient Decompression Engine:**
   - Added automatic fallback to GNU/system `tar -xf` inside `unpack_archive_safely` if Rust's `tar` crate encounters non-standard POSIX/GNU numeric checksum fields or corrupted headers.
3. **Uncrashable Asynchronous Worker Execution:**
   - Wrapped long-running CPU/IO operations (`inspect_package`, `install_package`) in `tauri::async_runtime::spawn_blocking`.
   - Prevents the main application thread and Wayland compositor connection from being blocked or terminated during intensive archive extraction.



