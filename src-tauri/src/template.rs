use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateParam {
    pub name: String,
    pub label: Option<String>,
    pub required: Option<bool>,
    pub locked: Option<bool>,
    pub default: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub name: String,
    pub description: Option<String>,
    pub parameters: Option<Vec<TemplateParam>>,
    pub structure: Vec<serde_yaml::Value>,
}

impl Template {
    pub fn get_parameters(&self) -> Vec<TemplateParam> {
        if let Some(params) = &self.parameters {
            params.clone()
        } else {
            vec![
                TemplateParam { name: "id".to_string(), label: Some("Project ID".to_string()), required: Some(true), locked: None, default: None },
                TemplateParam { name: "title".to_string(), label: Some("Title".to_string()), required: Some(true), locked: None, default: None },
                TemplateParam { name: "date".to_string(), label: Some("Date".to_string()), required: None, locked: None, default: None },
                TemplateParam { name: "editor".to_string(), label: Some("Editor".to_string()), required: None, locked: None, default: None },
            ]
        }
    }
}

fn get_templates_dir() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".slate");
    path.push("templates");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

#[tauri::command]
pub fn list_templates() -> Result<Vec<String>, String> {
    let dir = get_templates_dir();
    let mut templates = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("yaml") {
                if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                    templates.push(name.to_string());
                }
            }
        }
    }
    Ok(templates)
}

fn sanitize_name(name: &str) -> String {
    name.replace("/", "").replace("\\", "").replace("..", "")
}

#[tauri::command]
pub fn load_template(name: String) -> Result<Template, String> {
    let safe_name = sanitize_name(&name);
    let mut path = get_templates_dir();
    path.push(format!("{}.yaml", safe_name));

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let template: Template = serde_yaml::from_str(&content).map_err(|e| e.to_string())?;
    Ok(template)
}

#[tauri::command]
pub fn save_template(name: String, template: Template) -> Result<(), String> {
    let safe_name = sanitize_name(&name);
    let mut path = get_templates_dir();
    path.push(format!("{}.yaml", safe_name));

    let content = serde_yaml::to_string(&template).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn scan_dir_recursive(dir: &std::path::Path) -> Result<Vec<serde_yaml::Value>, String> {
    let mut result = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut sorted_entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    sorted_entries.sort_by_key(|e| e.file_name());

    for entry in sorted_entries {
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories
        if file_name.starts_with('.') {
            continue;
        }

        if file_type.is_dir() {
            let children = scan_dir_recursive(&entry.path())?;
            if children.is_empty() {
                result.push(serde_yaml::Value::String(file_name));
            } else {
                let mut map = serde_yaml::Mapping::new();
                map.insert(
                    serde_yaml::Value::String(file_name),
                    serde_yaml::Value::Sequence(children),
                );
                result.push(serde_yaml::Value::Mapping(map));
            }
        } else if file_type.is_file() {
            result.push(serde_yaml::Value::String(file_name));
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn scan_directory_structure(path: String) -> Result<Vec<serde_yaml::Value>, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    scan_dir_recursive(&root)
}

