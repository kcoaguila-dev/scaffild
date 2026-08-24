# Changelog

All notable changes to the **Scaffild** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.6] - 2026-08-24

### Added
- **Adobe After Effects Live AutoSync**: Added full After Effects (`.aep`) integration to the CEP extension. Drops in `04_GRAPHICS`, `02_FOOTAGE`, etc. are now mirrored directly into matching After Effects project folders in real-time.
- **Dual-Host Support**: Scaffild AutoSync now runs natively in both **Adobe Premiere Pro** and **Adobe After Effects** (`Window > Extensions > Scaffild AutoSync`).
- **1-Click Adobe Installer**: Updated Scaffild UI menu (**Tools > Install Adobe Plugin (Premiere & AE)...**) to install the extension for both applications in 1 click.

---

## [v0.1.5] - 2026-08-24

### Added
- **Clean Offline Media Isolation**: 1-click feature in Scaffild AutoSync that scans the project for files deleted from disk and safely moves them into an `_OFFLINE_TO_DELETE` bin via `item.moveBin()`.
- **Interactive Safety Warning Modal**: Confirmation popup listing all detected missing files before isolating them, preventing accidental timeline corruption.
- **Clean UI**: Stripped all emojis and non-standard characters from the extension interface for a clean, minimal aesthetic.

---

## [v0.1.4] - 2026-08-23

### Added
- **1-Click In-App Premiere Plugin Installer**: Built-in installer inside Scaffild desktop app (`Tools > Install Premiere Plugin...` and bottom `LiveSyncBar`). Automatically writes files to Adobe CEP directory and configures system `PlayerDebugMode`.
- **Autonomous Scaffild AutoSync**: Embedded Node.js recursive file watcher inside Premiere Pro CEP panel that listens to `app.project.path` and ingests media in real time.
- **Dynamic Bin Hierarchy**: Project tree crawler that creates nested bins on the fly without hardcoded folder names.

---

## [v0.1.3] - 2026-08-23

### Fixed
- **1:1 Premiere Pro Template Bins**: Decompressed and updated XML bins inside all master `.prproj` templates (`Social_Vertical_Reels_Shorts` and `Horizontal_Video_16x9`) so `02_FOOTAGE` internal bins (`A_ROLL_TALKING_HEAD`, `B_ROLL_CUTAWAYS`, `SCREEN_RECORDINGS`, `VERTICAL_RAW`) 1:1 match disk directory names.

---

## [v0.1.0] - 2026-08-22

### Added
- **Project Scaffolding Engine**: High-speed Rust builder for cloning structured project directories with `.prproj` and `.psd` master assets.
- **Social Video Templates**: Dedicated 16:9 (YouTube) and 9:16 (TikTok/Reels/Shorts) templates with pancake timeline sequences and Instagram safe-zone PSD covers.
- **3-2-1 Ingest Engine**: Multi-threaded camera card offloader with hardware-accelerated `xxHash64` checksum verification and manifest generation.
- **Model Context Protocol (MCP) Server**: JSON-RPC stdio server enabling Claude Desktop, Cursor, and Antigravity AI agents to scaffold projects and ingest media autonomously.
- **Headless Terminal CLI**: Full command-line interface (`scaffild build`, `scaffild ingest`, `scaffild mcp`, `scaffild list`).
