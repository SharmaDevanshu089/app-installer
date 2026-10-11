# App Installer Operations Manual & Architecture Guide

A comprehensive guide for system administrators, packagers, and users running **App Installer (`app-installer`)** on modern Linux desktop environments.

---

## 1. Architectural Philosophy & XDG Compliance

`app-installer` is designed around **FreeDesktop.org (XDG) specifications** and modern Linux Human Interface Guidelines (GNOME Libadwaita / KDE Breeze). The application operates primarily **rootless** within the user's home directory (`$HOME`), with an optional opt-in bypass for administrator-elevated system locations.

### Directory Layout & Presets

| Purpose | Default Path | Alternative Presets / Custom Options | Privilege Level |
| :--- | :--- | :--- | :--- |
| **Installed Applications** | `~/.local/opt/<app-id>/` | `~/Applications`, `~/.apps`, `/opt`, `/usr/local` | Rootless (User) / Elevated (`pkexec` for `/opt`) |
| **User CLI Symlinks** | `~/.local/bin/<alias>` | `~/bin`, `~/.cargo/bin`, `~/.npm-global/bin`, `/usr/local/bin`, `/opt/bin` | Rootless (User) / Elevated (`pkexec` for `/usr/local/bin`) |
| **Desktop Launchers** | `~/.local/share/applications/` | `/usr/local/share/applications` | Rootless (User) / Elevated |
| **Extracted Icons** | `~/.local/share/icons/hicolor/` | `/usr/local/share/icons/hicolor` | Rootless (User) / Elevated |
| **Configuration** | `~/.config/app-installer/config.json` | Readable, pretty-printed formatted JSON | Rootless (User) |
| **Audit Registry** | `~/.config/app-installer/registry.json` | Complete transaction journal | Rootless (User) |
| **Temporary Staging** | `~/.cache/app-installer/staging/` | Auto-purged inspection cache | Rootless (User) |

---

## 2. Supported Package Formats

`app-installer` automatically identifies packages using binary magic bytes and file extensions:

1. **AppImage (`.AppImage`, `.appimage`)**
   - Portable, self-mounting ELF images.
   - Automatically granted execution permissions (`0755`).
   - Inspected for embedded `.DirIcon`, PNG/SVG icons, and `.desktop` metadata.
2. **Compressed Tar Archives (`.tar.gz`, `.tgz`, `.tar.xz`, `.txz`, `.tar.bz2`, `.tbz2`, `.tar`)**
   - Streaming decompressors (`flate2`, `xz2`).
   - Protection against path traversal and tar-slip exploits.
   - Recursive inspection discovering ELF executables and script entry points.
3. **Standalone Binaries (ELF executables & shell scripts)**
   - Standalone binary support with automatic permission elevation to `0755`.

---

## 3. Window Management & Native Linux Desktop Interface

`app-installer` features a native Linux frameless window with custom header bar integration:
- **Minimum Window Constraints:** Configured in `tauri.conf.json` with `minWidth: 840`, `minHeight: 580` to prevent awkward collapsing.
- **Draggable Window Header:** Integrated `data-tauri-drag-region` on the `HeaderBar`. Dragging moves the window smoothly; double-clicking toggles maximize/restore.
- **Window Controls:** Native minimize (`—`), maximize/restore (`□`), and close (`✕`) buttons calling backend IPC commands (`window_minimize`, `window_toggle_maximize`, `window_close`).
- **Typography & Font Smoothing:** High-DPI Linux subpixel font anti-aliasing (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`).
- **Segmented View Switcher:** Libadwaita-style segmented controls in the header bar for instant switching between Applications, Install Package, Settings, and Guide & About.

---

## 4. Terminal `$PATH` Diagnostics & Auto-Verifying InfoBar

When `~/.local/bin` is missing from the active `$PATH`:
1. **Collapsible InfoBar:** Displays right below the HeaderBar with the missing path tag.
2. **Action Trigger:** Clicking **"Auto-Add to Shell"** updates shell configuration profiles (`~/.bashrc`, `~/.zshrc`, `~/.profile`, `~/.config/fish/config.fish`).
3. **Live Verification:** Immediately verifies detection via backend `check_path_status`.
4. **Auto-Hide:** Upon verified confirmation (`✓ Verified`), the InfoBar displays the success status and automatically slides up and hides itself after 2.5 seconds.

---

## 5. Security Model, Elevation & Privileged Path Bypass

To prevent arbitrary filesystem overwrites, malicious scripts, and desktop runner exploits:

### 1. Rootless Default vs. Privileged Path Bypass
- **Default Mode (`allowPrivilegedSystemPaths: false`):**
  - All installations and symlinks must reside strictly within `$HOME`.
  - Attempts to target system directories are rejected immediately.
- **Bypass Mode (`allowPrivilegedSystemPaths: true`):**
  - Users can enable the bypass switch in **Settings → Security & Privileged Elevation**.
  - Permits choosing `/opt` as the software root and `/usr/local/bin` for CLI symlinks.
  - When writing to privileged system locations, `app-installer` invokes Linux PolicyKit (`pkexec`) to request standard graphical authentication.

### 2. Permanent Invariant Safeguard
Regardless of whether bypass is enabled or disabled, **core operating system directories are permanently forbidden under all circumstances**:
- Filesystem root: `/`
- Essential OS binaries & libraries: `/bin`, `/sbin`, `/lib`, `/lib64`
- System configuration: `/etc`
- Kernel & Bootloader: `/boot`, `/dev`, `/proc`, `/sys`
- Root home: `/root`
- System variables & logs: `/var`, `/tmp`, `/run`

Any attempt to specify these paths will be rejected with a `Critical security violation` error.

### 3. POSIX CLI Alias Sanitization
- Must start with an alphanumeric character.
- Permitted characters: `^[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$`.
- Reserved system command names (`sudo`, `rm`, `sh`, `bash`, `root`, `su`, etc.) are blacklisted.

### 4. Desktop Entry Escaping
- String escaping for `.desktop` fields (`Exec`, `Name`, `Icon`, `Categories`) prevents argument injection in desktop environment launchers.

---

## 6. Configuration & Registry Persistence

- **Human-Readable Indented JSON:** Configurations are saved with `serde_json::to_string_pretty`, ensuring `~/.config/app-installer/config.json` and `registry.json` are clean and human-readable on disk.
- **Live In-App JSON Inspector:** Settings includes an interactive JSON inspector to view and copy the raw active configuration.
- **Export & Import Manifests:** One-click JSON manifest export and import to backup or sync installed software catalogs across multiple Linux workstations.
- **Cache Management:** One-click clearing of inspection temporary files in `~/.cache/app-installer/staging/`.
- **Factory Reset:** Reverts all directories and settings to standard rootless XDG defaults cleanly.
