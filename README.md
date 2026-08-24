# Scaffild

<div align="center">
  <img src="public/app-icon.png" alt="Scaffild Logo" width="160" />
</div>

<br />

[![CI Test Suite](https://github.com/kcoaguila-dev/scaffild/actions/workflows/test.yml/badge.svg)](https://github.com/kcoaguila-dev/scaffild/actions/workflows/test.yml)
[![Release](https://img.shields.io/badge/Release-v0.1.6-blue.svg)](https://github.com/kcoaguila-dev/scaffild/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-informational.svg)]()
[![Rust](https://img.shields.io/badge/Backend-Rust%20%28Tauri%20v2%29-orange.svg)]()
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61dafb.svg)]()

**Scaffild** is the high-speed project launchpad for video editors, DITs, and creative studios.

Instantly scaffold standardized project folders, clone pre-configured Premiere Pro (`.prproj`) and Photoshop (`.psd`) master templates, offload camera media with verified dual backups, and automate your entire workflow with AI.

---

## Download & Installation

Ready-to-install release binaries are packaged in `dist-installers/` and available under **[GitHub Releases](https://github.com/kcoaguila-dev/scaffild/releases)**:

| Installer Format | File | Description |
| :--- | :--- | :--- |
| **Windows Setup Wizard** | `scaffild_0.1.6_x64-setup.exe` | Standard Windows installer with Start Menu & Desktop shortcuts |
| **Windows MSI Package** | `scaffild_0.1.6_x64_en-US.msi` | Enterprise & silent installation package |
| **Portable Standalone** | `scaffild-portable.exe` | Zero-install standalone executable (runs from USB or NAS) |

---

## System Architecture

```mermaid
graph TD
    classDef client fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef core fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef engine fill:#1e1b4b,stroke:#a855f7,stroke-width:1px,color:#e9d5ff;
    classDef output fill:#134e4a,stroke:#14b8a6,stroke-width:1px,color:#ccfbf1;

    subgraph INGRESS["1. Ingress Layer (Interfaces)"]
        UI["Desktop GUI (React 19 + TypeScript)"]:::client
        AI["AI Agents (Claude Desktop / Cursor MCP)"]:::client
        CLI["Headless CLI (scaffild CLI)"]:::client
    end

    subgraph CORE["2. Engine Core (Rust + Tauri v2)"]
        ROUTER["Command & Protocol Router"]:::core
        MCP["MCP Server (JSON-RPC stdio)"]:::engine
        SCAFFOLD["Template & Asset Builder"]:::engine
        DIT["Dual xxHash64 Ingest Engine"]:::engine
    end

    subgraph EGRESS["3. Outputs & Ecosystem"]
        FILES["Structured Project Directories & Cloned Masters"]:::output
        STORAGE["3-2-1 Dual Checksum Backup (SSD + HDD)"]:::output
        PREMIERE["Adobe Premiere Pro (SyncBins.jsx & Sequences)"]:::output
    end

    UI --> ROUTER
    AI --> MCP
    CLI --> ROUTER
    MCP --> ROUTER

    ROUTER --> SCAFFOLD
    ROUTER --> DIT

    SCAFFOLD --> FILES
    SCAFFOLD --> PREMIERE
    DIT --> STORAGE
```

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Presentation / Ingress** | React 19, Tailwind CSS, Lucide, JSON-RPC 2.0 | User interactions, template tree designer, AI Agent stdio protocol |
| **Core Systems (Rust)** | Tauri v2, Rayon, `twox-hash`, Serde, WalkDir | Multi-threaded file I/O, `xxHash64` hardware verification, asset cloning |
| **Integrations & Output** | Adobe ExtendScript (JSX), Premiere Pro XML | Dynamic bin generation, GZIP sequence presets, Photoshop master covers |

---

## Key Capabilities

### 1. Dedicated 16:9 & 9:16 Social Master Templates
* **`Horizontal_Video`** *(16:9 YouTube / Commercial / Narrative)*: Includes master 16:9 `.prproj`, `00_SELECTS_PULL` pancake timeline, `01_MAIN_MASTER_16x9`, and 16:9 Photoshop thumbnail (`[project]_Thumbnail.psd`).
* **`Social_Vertical_Reels_Shorts`** *(9:16 TikTok / Instagram Reels / YouTube Shorts)*: Includes true `1080x1920` portrait `.prproj` timeline, `00_SELECTS_VERTICAL`, `01_MASTER_REEL_9x16`, and 9:16 Photoshop cover with Instagram safe-zone guides.
* **`MultiFormat_Campaign`** *(Hybrid Commercial Suite)*: Includes both 16:9 longform and 9:16 cutdown timelines.

### 2. 3-2-1 Checksum Media Offloader (DIT Grade)
* **Parallel Multi-Threaded I/O**: Stream camera cards to NVMe working drives and backup HDDs simultaneously.
* **`xxHash64` Hardware Checksums**: Verifies bit-for-bit integrity and generates an industry-standard `checksum_manifest.txt`.
* **Audio Completion Notification**: Synthesized audio cue upon verification completion.

### 3. Scaffild AutoSync: Autonomous Premiere Pro & After Effects Extension
* **Real-Time Dynamic Bin & Asset Sync**: Embedded Node.js file watcher inside Adobe Premiere Pro and After Effects automatically mirrors your disk folders as nested bins and project folders in real-time as you drop files.
* **1-Click In-App Installer**: Install directly into Premiere Pro and After Effects from Scaffild's top menu (**Tools > Install Adobe Plugin (Premiere & AE)...**) or bottom sync bar with zero manual file copying.
* **Clean Offline Media Isolation**: 1-click scan that detects files deleted from disk and safely isolates them into an `_OFFLINE_TO_DELETE` bin with an interactive safety confirmation popup.
* **Template-Agnostic**: Dynamically constructs any nested folder hierarchy on the fly with zero hardcoded folder names.

### 4. Built-in AI Agent Server (Model Context Protocol - MCP)
Connect **Claude Desktop**, **Cursor**, or **Antigravity** to Scaffild:
* AI Agents can autonomously list templates, scaffold project directories, and ingest camera cards using natural language.
* Access setup instructions in **Tools > AI Agent (MCP) Setup...**.

### 5. Headless Terminal CLI
```bash
# Start MCP server for AI Agents
scaffild mcp

# List available templates
scaffild list

# Build a project headlessly
scaffild build --template Horizontal_Video --target D:\Projects --title "Nike_Commercial" --open

# Ingest camera card with xxHash64 verification
scaffild ingest --source "E:\DCIM" --primary "D:\Projects\Footage" --secondary "F:\Archive"
```

---

## Quality Assurance & Test Suite

Scaffild includes a multi-layered testing suite covering unit, integration, and end-to-end tests:

### 1. Run Rust Backend Tests (Unit, Integration & E2E)
```bash
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
```
* `tests/template_tests.rs`: Validates YAML deserialization, UTF-8 BOM trimming, and parameter schemas.
* `tests/builder_tests.rs`: Validates end-to-end directory creation, asset cloning, `.prproj` GZIP XML sequence resolution integrity, and parameter interpolation.
* `tests/ingest_tests.rs`: Validates streaming dual-destination `xxHash64` copying, checksum manifests, and error recovery on corrupt sources.
* `tests/mcp_and_cli_tests.rs`: Validates JSON-RPC 2.0 MCP tools and CLI commands.

### 2. Run Frontend Tests (Vitest & Testing Library)
```bash
npm test
```
* `ui/TemplateTree.test.ts`: Validates tree conversion, Adobe badge detection, and raw structure roundtrip.

### 3. Production Build & Package
```bash
npm run tauri build
```

---

## License

Distributed under the [MIT License](LICENSE).
