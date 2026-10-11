# Installation & Deployment Guide

This guide provides instructions for installing and running **App Installer (`app-installer`)** across Linux distributions, creating distributable bundles, and cross-platform installation instructions.

---

## 📦 Linux Installation Methods

### 1. Standalone Portable Executable (Any Linux Distribution)
The release build produces a self-contained portable executable with no package manager dependencies required:

```bash
# 1. Download or locate release executable
cd "src-tauri/target/release"

# 2. Grant executable permission
chmod +x app-installer

# 3. Launch application directly
./app-installer
```

To install it system-wide or user-wide:
```bash
# User-space install (no sudo required):
mkdir -p ~/.local/bin
cp app-installer ~/.local/bin/

# System-wide install (requires root):
sudo cp app-installer /usr/local/bin/
```

---

### 2. Debian & Ubuntu (`.deb`)
For Ubuntu, Debian, Linux Mint, Pop!_OS:

```bash
# Install the .deb package:
sudo dpkg -i app-installer_0.1.0_amd64.deb

# If any dependencies are missing, resolve them automatically:
sudo apt-get install -f
```

---

### 3. Fedora, RHEL & openSUSE (`.rpm`)
For Fedora, Red Hat Enterprise Linux, Rocky Linux, openSUSE:

```bash
# Fedora / RHEL:
sudo dnf install app-installer-0.1.0-1.x86_64.rpm

# openSUSE:
sudo zypper install app-installer-0.1.0-1.x86_64.rpm
```

---

### 4. Arch Linux & Manjaro (`PKGBUILD` / Tarball)
For Arch Linux, Manjaro, EndeavourOS:

```bash
# Extract into ~/.local/opt:
mkdir -p ~/.local/opt/app-installer
cp app-installer ~/.local/opt/app-installer/
ln -sf ~/.local/opt/app-installer/app-installer ~/.local/bin/app-installer
```

---

### 5. AppImage Portable Bundle
For any glibc-based Linux distribution (portable single-file executable):

```bash
chmod +x app-installer_0.1.0_amd64.AppImage
./app-installer_0.1.0_amd64.AppImage
```

---

## 🪟 Windows (`.exe` / `.msi`) Note

`app-installer` is designed as a native Linux application installer managing FreeDesktop/XDG specifications (`~/.local/opt`, `~/.local/bin`, `.desktop` launchers, `.AppImage`, and `.tar` archives).

To compile or build a Windows `.exe` installer:
1. **Requirements:** Windows 10/11 or Windows Server with Microsoft Visual C++ Build Tools & Rust `x86_64-pc-windows-msvc`.
2. **Build Command on Windows:**
   ```powershell
   npm install
   npm run build
   npm run tauri build -- --target x86_64-pc-windows-msvc
   ```
   *Output location:* `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/app-installer_0.1.0_x64-setup.exe` or `bundle/msi/app-installer_0.1.0_x64_en-US.msi`.
3. **Running on Windows via WSL2:**
   If you are on Windows and running Ubuntu/Debian via WSL2, you can run the Linux binary with graphical display support enabled:
   ```bash
   ./app-installer
   ```

---

## 🛠️ Building From Source

```bash
# 1. Install Node.js dependencies
npm install

# 2. Build React frontend
npm run build

# 3. Build release executable with Cargo
cd src-tauri
cargo build --release

# The compiled binary is located at:
# src-tauri/target/release/app-installer
```
