use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use walkdir::WalkDir;

const MEDIA_EXTENSIONS: &[&str] = &[
    // Video
    "mp4", "mov", "mxf", "mkv", "avi", "braw", "r3d", "prores", "wmv", "flv", "webm",
    // Audio
    "wav", "mp3", "aac", "aif", "aiff", "m4a", "flac", "ogg", "wma",
    // Graphics & Stills
    "png", "jpg", "jpeg", "svg", "psd", "ai", "tif", "tiff", "exr", "heic", "dng", "webp", "bmp"
];

const IGNORED_FOLDER_PATTERNS: &[&str] = &[
    "01_project_files",
    "project_files",
    "adobe premiere pro auto-save",
    "auto-save",
    "adobe premiere pro preview files",
    "preview files",
    "encoded files",
    "peak files",
    "thumbnails",
    ".git",
    ".vscode",
    "node_modules"
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredMediaItem {
    pub file_path: String,
    pub file_name: String,
    pub bin_hierarchy: Vec<String>,
    pub extension: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatcherStatus {
    pub is_watching: bool,
    pub active_project: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaDetectedPayload {
    pub event_type: String,
    pub file_path: String,
    pub file_name: String,
    pub bin_hierarchy: Vec<String>,
}

pub struct WatcherState {
    pub active_project: Arc<Mutex<Option<String>>>,
    pub watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            active_project: Arc::new(Mutex::new(None)),
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

/// Checks if a file has a supported media extension
pub fn is_media_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let lower = ext.to_lowercase();
        MEDIA_EXTENSIONS.contains(&lower.as_str())
    } else {
        false
    }
}

/// Checks if a path belongs to an ignored/cache folder
pub fn is_ignored_path(path: &Path, project_root: &Path) -> bool {
    let rel = match path.strip_prefix(project_root) {
        Ok(r) => r,
        Err(_) => return false,
    };

    for comp in rel.components() {
        let comp_str = comp.as_os_str().to_string_lossy().to_lowercase();
        if comp_str.starts_with('.') {
            return true;
        }
        for pattern in IGNORED_FOLDER_PATTERNS {
            if comp_str == *pattern || comp_str.contains(pattern) {
                return true;
            }
        }
    }

    false
}

/// Computes the dynamic nested bin hierarchy relative to project root
pub fn get_relative_bin_hierarchy(file_path: &Path, project_root: &Path) -> Option<Vec<String>> {
    let parent = file_path.parent()?;
    let rel_parent = parent.strip_prefix(project_root).ok()?;

    let mut bins = Vec::new();
    for comp in rel_parent.components() {
        let s = comp.as_os_str().to_string_lossy().to_string();
        if !s.is_empty() {
            bins.push(s);
        }
    }

    Some(bins)
}

/// Recursively scans project directory and returns all media mapped to dynamic bins
#[tauri::command]
pub fn scan_project_media_bins(project_dir: String) -> Result<Vec<DiscoveredMediaItem>, String> {
    let root = PathBuf::from(&project_dir);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Project directory does not exist: {}", project_dir));
    }

    let mut items = Vec::new();

    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && is_media_file(path) && !is_ignored_path(path, &root) {
            if let Some(bins) = get_relative_bin_hierarchy(path, &root) {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let extension = path.extension().unwrap_or_default().to_string_lossy().to_string();
                let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);

                items.push(DiscoveredMediaItem {
                    file_path: path.to_string_lossy().to_string(),
                    file_name,
                    bin_hierarchy: bins,
                    extension,
                    size_bytes,
                });
            }
        }
    }

    Ok(items)
}

/// Starts watching the specified project directory for new or modified media
#[tauri::command]
pub fn start_project_watcher(
    app_handle: tauri::AppHandle,
    state: tauri::State<WatcherState>,
    project_dir: String,
) -> Result<String, String> {
    let root_path = PathBuf::from(&project_dir);
    if !root_path.exists() || !root_path.is_dir() {
        return Err(format!("Directory does not exist: {}", project_dir));
    }

    // Stop existing watcher if running
    let _ = stop_project_watcher(state.clone());

    let root_for_handler = root_path.clone();
    let app_for_handler = app_handle.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.is_file() && is_media_file(&path) && !is_ignored_path(&path, &root_for_handler) {
                                if let Some(bins) = get_relative_bin_hierarchy(&path, &root_for_handler) {
                                    let payload = MediaDetectedPayload {
                                        event_type: format!("{:?}", event.kind),
                                        file_path: path.to_string_lossy().to_string(),
                                        file_name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                                        bin_hierarchy: bins,
                                    };
                                    let _ = app_for_handler.emit("media-detected", payload);
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default().with_poll_interval(Duration::from_millis(500)),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&root_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    {
        let mut w_guard = state.watcher.lock().map_err(|e| e.to_string())?;
        *w_guard = Some(watcher);
    }
    {
        let mut p_guard = state.active_project.lock().map_err(|e| e.to_string())?;
        *p_guard = Some(project_dir.clone());
    }

    // Emit status change
    let _ = app_handle.emit("watcher-status-changed", WatcherStatus {
        is_watching: true,
        active_project: Some(project_dir.clone()),
    });

    Ok(format!("Now watching project: {}", project_dir))
}

/// Stops active project watcher
#[tauri::command]
pub fn stop_project_watcher(state: tauri::State<WatcherState>) -> Result<String, String> {
    {
        let mut w_guard = state.watcher.lock().map_err(|e| e.to_string())?;
        *w_guard = None;
    }
    {
        let mut p_guard = state.active_project.lock().map_err(|e| e.to_string())?;
        *p_guard = None;
    }
    Ok("Watcher stopped.".to_string())
}

/// Returns current watcher status
#[tauri::command]
pub fn get_watcher_status(state: tauri::State<WatcherState>) -> Result<WatcherStatus, String> {
    let p_guard = state.active_project.lock().map_err(|e| e.to_string())?;
    let w_guard = state.watcher.lock().map_err(|e| e.to_string())?;

    Ok(WatcherStatus {
        is_watching: w_guard.is_some(),
        active_project: p_guard.clone(),
    })
}
