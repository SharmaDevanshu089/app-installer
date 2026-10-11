# App Installer (`app-installer`)

A native, rootless graphical package manager and application installer for Linux desktops, built with **Tauri v2** (Rust) and **React 19** (TypeScript, Vite).

`app-installer` provides an enterprise-grade, standard-compliant (FreeDesktop / XDG) solution to inspect, install, configure, audit, and cleanly uninstall portable Linux applications (`.AppImage`, `.tar.gz`, `.tar.xz`, `.tar.bz2`, and standalone ELF binaries).

---

## 🌟 Key Features & Interface Philosophy

### 1. Dual Mode: True Dark Mode & Light Mode
- **Instant Toggle:** Switch between full Dark Mode and Light Mode with one click in the header bar or Preferences.
- **High Contrast Dark Dropdowns:** Native select controls with custom background and high-visibility contrast across all Linux themes.
- **5 Design Philosophies in both Dark and Light:**
  - **GNOME Adwaita (GTK 4 / Libadwaita):** Neutral dark charcoal and clean light surface palettes.
  - **KDE Breeze (Qt 6 / Kirigami):** Breeze electric blue accents with geometric tech styling.
  - **macOS Aqua (Cupertino):** Refined titlebar with native traffic lights.
  - **System76 COSMIC:** Modular dark slate and warm amber styling.
  - **Nord Modern:** Arctic frost palette with polar night dark and snow storm light.

### 2. Native Desktop Button System (No AI Aesthetics)
- **Zero Border Radius:** Strict `0px` border radius on all buttons and inputs matching native Linux HIG.
- **No Fluffy Vertical Padding:** Ultra-compact, high-density desktop action bars (22px-24px height).
- **Hero Install Button as Main Focus:** Prominent hero action button positioned in the header bar, empty state, and inspection modal.

### 3. Smart & Standard-Compliant Locations (XDG Rootless & Presets)
Operates 100% within the user's `$HOME` space by default without requiring `sudo`:
- **Application Root:** `~/.local/opt/<app-id>/` (Presets: `~/Applications`, `~/.apps`, `/opt`, `/usr/local`, or custom)
- **CLI Command Symlinks:** `~/.local/bin/<alias>` (Presets: `~/bin`, `~/.cargo/bin`, `~/.npm-global/bin`, `/usr/local/bin`, `/opt/bin`, or custom)
- **Desktop Launchers:** `~/.local/share/applications/<app-id>.desktop`
- **Application Icons:** `~/.local/share/icons/hicolor/<size>/apps/`
- **Configuration:** `~/.config/app-installer/config.json` (Formatted, readable multi-line JSON)
- **Audit Registry:** `~/.config/app-installer/registry.json`
- **Staging Cache:** `~/.cache/app-installer/staging/`

### 4. PolicyKit (`pkexec`) Elevation & Security Invariants
- **Privileged Path Bypass Flag:** Opt-in toggle in Settings allows installing into `/opt` and linking into `/usr/local/bin` using PolicyKit graphical elevation (`pkexec`).
- **Permanent Invariant Safeguard:** Core system directories (`/`, `/etc`, `/bin`, `/sbin`, `/boot`, `/root`, `/var`, `/tmp`, `/run`) are permanently forbidden under all circumstances.

### 5. Pre-Installation Inspection & Icon Preview
- Safely inspects archive and AppImage contents prior to disk commitment.
- Extracts and previews embedded icons (`PNG`, `SVG`).
- Automatically scans and detects all executables (ELF headers and script shebangs).
- Proposes sensible app names, versions, CLI aliases, and FreeDesktop categories.
- Lets users choose the primary launcher binary and custom CLI alias before installation.

### 6. Clean Uninstallation with Configuration Purge
- **Standard Clean Removal:** Atomically deletes all payload binaries, CLI symlinks, desktop files, and icons recorded in `registry.json`.
- **Advanced Purge Option:** Detects and optionally purges residual user settings and caches (`~/.config/<app-id>`, `~/.local/share/<app-id>`, and `~/.cache/<app-id>`).

### 7. PATH Diagnostic & Auto-Verifying InfoBar
- Detects if `~/.local/bin` is in the active `$PATH`.
- Auto-adds configuration to shell profiles (`~/.bashrc`, `~/.zshrc`, `~/.profile`, `~/.config/fish/config.fish`).
- Automatically verifies detection against active environment and auto-hides itself upon confirmation.

### 8. Legal & Compliance Hub
- **MIT License** terms.
- **Third-Party Attribution Matrix:** Complete audit of upstream Rust crates and npm packages.
- **100% Offline Privacy Guarantee:** Zero telemetry, zero external network calls.
- **FreeDesktop Standards Compliance:** Adheres to XDG Base Directory, Desktop Entry, and Icon Theme specifications.

### 9. Comprehensive Root Logging System
- **Centralized Log File:** All events are recorded in [`app-installer.log`](./app-installer.log) located in the project root.
- **Global Panic Hook:** Captures Rust backend panics, fatal crashes, file/line locations, and writes them immediately to disk.
- **IPC Trace Logging:** Every IPC command (`inspect_package`, `install_package`, `launch_package`, `save_config`, window operations, PolicyKit elevations) logs arguments, execution trace, and error returns.
- **Frontend Error Forwarding:** Global `window.onerror`, unhandled promise rejections, and `console.error` calls are captured by `clientLogger.ts` and forwarded into the root log file.

---

## 🛠️ Development & Build

### Prerequisites
- Node.js (v18+)
- Rust & Cargo (1.80+)
- Linux dependencies: GTK3, WebKit2GTK-4.1, Cairo, Pango, D-Bus

### Build & Run
```bash
# Frontend Build
npm run build

# Backend Tests
cd src-tauri
cargo test

# Release Executable
cargo build --release
### Release Artifacts & Bundles
- **Portable Binary:** `src-tauri/target/release/app-installer` (6.4 MiB)
- **Debian/Ubuntu Package (.deb):** `src-tauri/target/release/bundle/deb/app-installer_0.1.0_amd64.deb` (2.8 MiB)
- **Portable AppImage (.AppImage):** `src-tauri/target/release/bundle/appimage/app-installer_0.1.0_amd64.AppImage` (78.5 MiB)

To build package bundles directly:
```bash
# Build Debian .deb bundle
npx tauri build --bundles deb

# Build portable .AppImage bundle
npx tauri build --bundles appimage
```

---

## 📖 Documentation & Guides
- [`HOW_TO_INSTALL.md`](./HOW_TO_INSTALL.md) - Complete installation instructions for Ubuntu/Debian, Fedora, Arch Linux, AppImage, and Windows setup.
- [`APPLICATION_CONTEXT.md`](./APPLICATION_CONTEXT.md) - Architectural blueprint, crash-safe error model, and design logs.
- [`OPERATIONS_GUIDE.md`](./OPERATIONS_GUIDE.md) - Complete system administrator and operations manual.

---

## 👤 Author & Maintainer
- **Author:** Devanshu Sharma ([@SharmaDevanshu089](https://github.com/SharmaDevanshu089))
- **Email:** `sharma.devanshu089@gmail.com`
- **License:** MIT License
