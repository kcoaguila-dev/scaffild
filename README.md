# Slate (Scaffild)

**Slate** is a desktop post-production scaffolding tool built with **Tauri v2**, **React 19**, **TypeScript**, and **Rust**. It automates project directory structuring, templating with dynamic variables, fast media offloading with checksum verification, and Adobe Premiere Pro bin synchronization.

---

## Features

- 📁 **Project Scaffolding**: Create standardized project folder trees with dynamic variable substitution (`{{id}}`, `{{title}}`, `{{date}}`, `{{editor}}`, and custom parameters).
- 🎬 **Automatic Premiere Project Creation**: Generates an initial `.prproj` with structured bins and opens it automatically.
- 🌳 **Visual & YAML Template Manager**: Design folder hierarchy visually or edit raw YAML templates stored in `~/.slate/templates/`.
- ⚡ **High-Speed Media Ingest**: Parallel multi-threaded SD card/camera offloading with streaming xxHash64 checksum verification and manifest creation (`checksum_manifest.txt`).
- 🔌 **Premiere Pro Companion (`SyncBins.jsx`)**: ExtendScript companion that mirrors folder structures from disk into Premiere bins and batch-imports raw footage into `02_FOOTAGE/A_ROLL`.

---

## Prerequisites

Before running Slate, ensure you have the following installed:

1. **Node.js**: `v18+` (v20+ recommended) and `npm`
2. **Rust**: Latest stable Rust toolchain (`rustup`, `cargo`)
3. **Windows Dependencies** (for Tauri v2):
   - [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10/11)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed Default Templates (Optional)

Slate stores templates in `~/.slate/templates/`. You can copy the bundled default template:

**PowerShell (Windows):**
```powershell
New-Item -ItemType Directory -Force -Path $HOME\.slate\templates
Copy-Item -Path templates\default.yaml -Destination $HOME\.slate\templates\default.yaml -Force
```

**Bash (macOS / Linux):**
```bash
mkdir -p ~/.slate/templates
cp templates/default.yaml ~/.slate/templates/default.yaml
```

---

## Running the Application

### 🖥️ Desktop App (Development Mode)
Launches the full native desktop app powered by Tauri and Vite:

```bash
npm run tauri dev
```

### 🌐 Web Frontend Only (Browser Preview)
Starts the Vite dev server on `http://localhost:1420` (useful for UI tweaking):

```bash
npm run dev
```

### 📦 Build Production Executable
Compiles the optimized production desktop binary into `src-tauri/target/release/`:

```bash
npm run tauri build
```

---

## Template Format

Templates are stored in YAML format in `~/.slate/templates/<template_name>.yaml`:

```yaml
name: Commercial Project
description: Standard agency commercial video template
parameters:
  - client
  - campaign
  - resolution
structure:
  - 01_SEQUENCES
  - 02_FOOTAGE:
      - A_ROLL
      - B_ROLL
      - DRONE
      - ARCHIVE
  - 03_AUDIO:
      - MUSIC
      - SFX
      - VO
      - MIX
  - 04_GFX:
      - 2D
      - 3D
      - LOGOS
  - 05_EXPORTS:
      - ROUGHS
      - FINALS
```

### Supported Tokens

- `{{id}}` - Project identifier (e.g. `0001`)
- `{{title}}` - Project title (e.g. `BrandCampaign`)
- `{{date}}` - Creation date (e.g. `2026-08-21`)
- `{{editor}}` - Editor name
- `{{custom_key}}` - Any custom parameter defined in the template's `parameters` list

---

## Adobe Premiere Pro Companion

Inside the [`premiere_plugin/`](premiere_plugin/) folder is `SyncBins.jsx`:

1. Open your project in **Adobe Premiere Pro**.
2. Run `SyncBins.jsx` (via **File > Scripts > Run Script File...** or ExtendScript Toolkit).
3. The script will:
   - Read the project's root folder on disk.
   - Recreate missing folders as Premiere bins.
   - Automatically import supported media (`mp4`, `mov`, `mxf`, `wav`, `mp3`, `r3d`, `braw`, etc.) into the `02_FOOTAGE/A_ROLL` bin.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, YAML
- **Backend (Tauri v2)**: Rust, Serde, Rayon (parallel processing), xxHash64, Flate2 (GZip)
- **Plugin**: Adobe ExtendScript (JSX)

---

## License

[MIT](LICENSE)
