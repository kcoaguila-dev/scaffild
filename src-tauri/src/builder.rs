use crate::template::load_template;
use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;

#[derive(serde::Deserialize)]
pub struct ProjectParams {
    /// Holds the defined parameters explicitly rendered in the UI and defined by the template's schema.
    #[serde(flatten)]
    pub params: HashMap<String, String>,

    /// Fallback for arbitrary ad-hoc tokens passed from external integrations (like ExtendScript)
    /// that are not strictly defined as part of the formal template schema parameters.
    #[serde(default)]
    pub custom: HashMap<String, String>,
}

fn sanitize_filename(name: &str) -> String {
    let s = name
        .trim()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace("..", "_")
        .replace(":", "_")
        .replace("*", "_")
        .replace("?", "_")
        .replace("\"", "_")
        .replace("<", "_")
        .replace(">", "_")
        .replace("|", "_");

    let mut clean = String::new();
    let mut last_underscore = false;
    for c in s.chars() {
        if c == '_' {
            if !last_underscore {
                clean.push('_');
                last_underscore = true;
            }
        } else {
            clean.push(c);
            last_underscore = false;
        }
    }
    clean.trim_matches('_').to_string()
}

fn get_project_composite(params: &ProjectParams, template: &crate::template::Template) -> String {
    let mut parts: Vec<String> = Vec::new();

    let param_order = template.get_parameters();
    for p in param_order {
        if let Some(val) = params.params.get(&p.name) {
            let clean = sanitize_filename(val);
            if !clean.is_empty() {
                parts.push(clean);
            }
        }
    }

    if parts.is_empty() {
        for key in ["id", "title", "date", "editor"] {
            if let Some(val) = params.params.get(key) {
                let clean = sanitize_filename(val);
                if !clean.is_empty() {
                    parts.push(clean);
                }
            }
        }
    }

    if parts.is_empty() {
        "Project".to_string()
    } else {
        parts.join("_")
    }
}

fn replace_tokens(text: &str, project_composite: &str, params: &ProjectParams) -> String {
    let mut result = text.to_string();

    result = result.replace("[project]", project_composite);
    result = result.replace("{{project}}", project_composite);
    result = result.replace("_PROJECT_TEMPLATE", project_composite);
    result = result.replace("PROJECT_TEMPLATE", project_composite);

    for (key, val) in &params.params {
        let clean_val = sanitize_filename(val);
        let token = format!("{{{{{}}}}}", key);
        result = result.replace(&token, &clean_val);
    }

    for (key, val) in &params.custom {
        let clean_val = sanitize_filename(val);
        let token = format!("{{{{{}}}}}", key);
        result = result.replace(&token, &clean_val);
    }

    result
}

fn is_file_path(name: &str) -> bool {
    let p = Path::new(name);
    if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
        matches!(
            ext.to_lowercase().as_str(),
            "prproj" | "aep" | "psd" | "ai" | "c4d" | "txt" | "md" | "rtf" | "json" | "xml" | "csv" | "docx" | "pdf" | "mp4" | "mov" | "wav" | "mp3"
        )
    } else {
        false
    }
}

fn find_source_template_file(template_name: &str, file_name: &str, rel_dir: &Path) -> Option<PathBuf> {
    let assets_dir = crate::template::get_template_assets_dir(template_name);
    if !assets_dir.exists() {
        return None;
    }

    // 1. Check direct folder match
    let direct_folder = assets_dir.join(rel_dir);
    if direct_folder.exists() {
        if let Ok(entries) = fs::read_dir(&direct_folder) {
            let target_ext = Path::new(file_name).extension().and_then(|e| e.to_str()).unwrap_or("");
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    let entry_ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
                    if entry_ext.eq_ignore_ascii_case(target_ext) {
                        return Some(p);
                    }
                }
            }
        }
    }

    // 2. Search anywhere in assets_dir by matching extension
    let target_ext = Path::new(file_name).extension().and_then(|e| e.to_str()).unwrap_or("");
    if !target_ext.is_empty() {
        for entry in walkdir::WalkDir::new(&assets_dir).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let entry_ext = entry.path().extension().and_then(|e| e.to_str()).unwrap_or("");
                if entry_ext.eq_ignore_ascii_case(target_ext) {
                    return Some(entry.into_path());
                }
            }
        }
    }

    None
}

fn create_template_file(
    file_path: &Path,
    file_name: &str,
    template_name: &str,
    rel_dir: &Path,
    params: &ProjectParams,
) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // 1. If an actual template asset (.prproj, .psd, .aep, etc.) exists in the template assets folder, copy it directly!
    if let Some(source_asset) = find_source_template_file(template_name, file_name, rel_dir) {
        if source_asset.exists() {
            fs::copy(&source_asset, file_path).map_err(|e| format!("Failed to copy template asset: {}", e))?;
            return Ok(());
        }
    }

    // 2. Fallback for text files or generic empty files
    let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    match ext.as_str() {
        "txt" | "md" => {
            let mut content = format!("# Project: {}\n", file_name);
            for (k, v) in &params.params {
                content.push_str(&format!("{}: {}\n", k, v));
            }
            fs::write(file_path, content).map_err(|e| e.to_string())?;
        }
        _ => {
            fs::File::create(file_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn build_structure(
    base_path: &Path,
    node: &serde_yaml::Value,
    template_name: &str,
    rel_dir: &Path,
    project_composite: &str,
    params: &ProjectParams,
) -> Result<(), String> {
    match node {
        serde_yaml::Value::String(name) => {
            let replaced = replace_tokens(name, project_composite, params);
            let p = base_path.join(&replaced);
            if is_file_path(&replaced) {
                create_template_file(&p, &replaced, template_name, rel_dir, params)?;
            } else {
                fs::create_dir_all(&p).map_err(|e| format!("Failed to create dir {}: {}", p.display(), e))?;
            }
        }
        serde_yaml::Value::Mapping(map) => {
            for (key, val) in map {
                if let serde_yaml::Value::String(dir_name) = key {
                    let replaced = replace_tokens(dir_name, project_composite, params);
                    let p = base_path.join(&replaced);
                    let next_rel = rel_dir.join(dir_name);
                    fs::create_dir_all(&p).map_err(|e| format!("Failed to create dir {}: {}", p.display(), e))?;

                    if let serde_yaml::Value::Sequence(seq) = val {
                        for sub_node in seq {
                            build_structure(&p, sub_node, template_name, &next_rel, project_composite, params)?;
                        }
                    }
                }
            }
        }
        _ => {}
    }
    Ok(())
}

const SYNC_BINS_SCRIPT: &str = r#"// SyncBins.jsx
// Premiere Pro ExtendScript Companion for Scaffild
// Scans the active project's parent root folder on disk, constructs missing bins,
// and recursively imports raw media files into 02_FOOTAGE/A_ROLL.

(function () {
    var logMsg = "";
    function log(msg) {
        logMsg += msg + "\n";
        $.writeln(msg);
    }

    if (!app.project) {
        alert("No active Premiere Pro project.");
        return;
    }

    var proj = app.project;
    if (!proj.path) {
        alert("Project is not saved on disk. Please save the project first.");
        return;
    }

    var projFile = new File(proj.path);
    var rootFolder = projFile.parent;
    log("Root folder: " + rootFolder.fsName);

    function syncDirectoryToBin(dir, parentBin) {
        var files = dir.getFiles();
        if (!files) return;

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f instanceof Folder && f.name.indexOf(".") !== 0) {
                var bin = getOrCreateBin(f.name, parentBin);
                syncDirectoryToBin(f, bin);
            }
        }
    }

    function getOrCreateBin(name, parentBin) {
        var items = parentBin ? parentBin.children : app.project.rootItem.children;
        for (var i = 0; i < items.numItems; i++) {
            var item = items[i];
            if (item.type === ProjectItemType.BIN && item.name === name) {
                return item;
            }
        }
        var newBin = parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
        return newBin;
    }

    function importMedia(folder, targetBin) {
        if (!folder.exists) return;
        var files = folder.getFiles();
        if (!files) return;

        var filesToImport = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f instanceof Folder) {
                var subBin = getOrCreateBin(f.name, targetBin);
                importMedia(f, subBin);
            } else if (f instanceof File) {
                var ext = f.name.split('.').pop().toLowerCase();
                var mediaExts = ["mp4", "mov", "mxf", "avi", "wav", "mp3", "jpg", "png", "r3d", "braw"];
                if (mediaExts.indexOf(ext) !== -1) {
                    filesToImport.push(f.fsName);
                }
            }
        }

        if (filesToImport.length > 0) {
            app.project.importFiles(filesToImport, false, targetBin, false);
            log("Imported " + filesToImport.length + " files into " + targetBin.name);
        }
    }

    app.enableQE();
    syncDirectoryToBin(rootFolder, null);

    var aRollFolder = new Folder(rootFolder.fsName + "/02_FOOTAGE/A_ROLL");
    if (aRollFolder.exists) {
        var footageBin = getOrCreateBin("02_FOOTAGE", null);
        var aRollBin = getOrCreateBin("A_ROLL", footageBin);
        importMedia(aRollFolder, aRollBin);
    } else {
        log("No 02_FOOTAGE/A_ROLL folder found.");
    }

    alert("Sync complete.\n\n" + logMsg);
})();
"#;

#[tauri::command]
pub fn build_project(
    target_dir: String,
    template_name: String,
    params: ProjectParams,
    open_project: Option<bool>,
    reveal_in_explorer: Option<bool>,
    include_sync_bins: Option<bool>,
) -> Result<String, String> {
    let template = load_template(template_name.clone())?;
    let base_path = PathBuf::from(&target_dir);

    let root_folder_name = get_project_composite(&params, &template);
    let project_root = base_path.join(&root_folder_name);

    if project_root.exists() {
        return Err(format!("Directory already exists: {}", project_root.display()));
    }
    fs::create_dir_all(&project_root).map_err(|e| e.to_string())?;

    let root_rel = PathBuf::new();
    for node in &template.structure {
        build_structure(&project_root, node, &template_name, &root_rel, &root_folder_name, &params)?;
    }

    if include_sync_bins.unwrap_or(true) {
        let scripts_dir = if project_root.join("01_PROJECT_FILES").exists() {
            project_root.join("01_PROJECT_FILES")
        } else {
            project_root.clone()
        };
        let _ = fs::write(scripts_dir.join("SyncBins.jsx"), SYNC_BINS_SCRIPT);
    }

    let should_open = open_project.unwrap_or(true);
    let should_reveal = reveal_in_explorer.unwrap_or(false);

    if should_open {
        // Automatically open the primary project file (prproj, aep, psd, etc.)
        for entry in walkdir::WalkDir::new(&project_root).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("prproj") || ext.eq_ignore_ascii_case("aep") {
                        let _ = open::that(entry.path());
                        break;
                    }
                }
            }
        }
    }

    if should_reveal {
        let _ = open::that(&project_root);
    }

    Ok(project_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_project_in_premiere(project_path: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    if path.is_file() {
        open::that(&path).map_err(|e| e.to_string())?;
        return Ok(());
    }
    if path.is_dir() {
        for entry in walkdir::WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("prproj") {
                        open::that(entry.path()).map_err(|e| e.to_string())?;
                        return Ok(());
                    }
                }
            }
        }
        open::that(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_next_project_id(target_dir: String) -> String {
    let path = PathBuf::from(&target_dir);
    if !path.exists() || !path.is_dir() {
        return "0001".to_string();
    }

    let mut max_id: u64 = 0;
    let mut num_digits: usize = 4;
    let mut found = false;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                let leading_digits: String = name.chars().take_while(|c| c.is_ascii_digit()).collect();
                if !leading_digits.is_empty() {
                    if let Ok(num) = leading_digits.parse::<u64>() {
                        found = true;
                        if num > max_id {
                            max_id = num;
                            num_digits = leading_digits.len().max(num_digits);
                        }
                    }
                }
            }
        }
    }

    if found {
        let next_id = max_id + 1;
        format!("{:0width$}", next_id, width = num_digits)
    } else {
        "0001".to_string()
    }
}