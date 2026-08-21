# Slate

**Slate** is a modern, blazing-fast desktop post-production project scaffolding and media management tool built with **Tauri v2**, **React 19**, **TypeScript**, and **Rust**. Designed as a clean, powerful alternative to Post Haste, Slate automates project directory structuring, genuine Adobe project template cloning, intelligent sequential project numbering, and checksum-verified media offloading.

---

## Key Features

- 📁 **Post Haste 2-Pane Template Manager**:
  - Clean, unopinionated template manager with **no forced pre-installed templates** — start completely blank or import existing folder hierarchies.
  - Interactive visual tree editor with drag-and-drop reordering, hierarchy guide lines, and Adobe file badges (`Pr`, `Ps`, `Ae`, `Ai`).
  - Native 1-click folder import: reads complete folder structures (including empty directories) from your disk.

- 🔢 **Smart Auto-Incrementing Project IDs**:
  - Automatically scans your target directory on disk (e.g., `0001_...`, `0006_...`) and pre-fills the next sequential number (`0007`) with proper zero-padding.
  - Automatically increments to the next ID upon project creation and clears the title field for immediate back-to-back scaffolding.

- 🎬 **Genuine Adobe Template Asset Cloning**:
  - Copies your **real, pre-configured Premiere Pro (`.prproj`)**, **Photoshop (`.psd`)**, and **After Effects (`.aep`)** template files.
  - Preserves custom sequences, bins, track layouts, timeline presets, and layers with zero corruption or XML errors.

- 🏷️ **Industry Standard Naming Conventions**:
  - Automatically sanitizes spaces to underscores (`_`) across project folders and filenames.
  - Composes full parameter tokens: `[ID]_[TITLE]_[DATE]_[EDITOR]`.

- ⚡ **High-Speed Checksum Media Ingest**:
  - Multi-threaded camera card / SD card offloading using parallel I/O.
  - Streaming `xxHash64` verification and automatic `checksum_manifest.txt` generation.

- 🔌 **Adobe Premiere Pro Companion (`SyncBins.jsx`)**:
  - ExtendScript script that mirrors folder trees on disk into Premiere project bins and batch-imports footage.

---

## Prerequisites

- **Node.js**: `v18+` (v20+ recommended) and `npm`
- **Rust**: Latest stable Rust toolchain (`rustup`, `cargo`)
- **Windows / macOS / Linux**:
  - On Windows: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10/11).

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Desktop App (Development)

Launches the native desktop application powered by Tauri v2 and Vite:

```bash
npm run tauri dev
```

### 3. Build Production Binary

Compiles an optimized production desktop installer / binary into `src-tauri/target/release/`:

```bash
npm run tauri build
```

---

## Template System

Templates and their companion assets are stored locally in your home directory at `~/.slate/templates/`:

- **Template Definition**: `~/.slate/templates/<name>.yaml`
- **Template Assets**: `~/.slate/templates/<name>_files/` (stores your genuine `.prproj`, `.psd`, `.aep` files)

### Example Template (`~/.slate/templates/video_editing.yaml`):

```yaml
name: video_editing
description: Standard post-production video editing template
parameters:
  - id
  - title
  - date
  - editor
structure:
  - 01_PROJECT_FILES:
      - "[project].prproj"
  - 02_FOOTAGE:
      - A_ROLL
      - B_ROLL
  - 03_AUDIO:
      - MUSIC
      - SFX
      - VO
  - 04_GRAPHICS:
      - IMAGES
      - THUMBNAILS:
          - "[project].psd"
      - TITLES
  - 05_EXPORTS
```

---

## Adobe Premiere Pro Companion

Inside the [`premiere_plugin/`](premiere_plugin/) folder is `SyncBins.jsx`:

1. Open your generated project in **Adobe Premiere Pro**.
2. Run `SyncBins.jsx` (via **File > Scripts > Run Script File...** or ExtendScript Toolkit).
3. The script reads the project root folder on disk and automatically syncs all subdirectories into organized Premiere bins.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, YAML parser
- **Desktop Backend (Tauri v2)**: Rust, Serde, Rayon, RFD (Native OS Dialogs), WalkDir, xxHash64, Dirs
- **Scripting**: Adobe ExtendScript (JSX)

---

## License

[MIT](LICENSE)
