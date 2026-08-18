use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub name: String,
    pub description: Option<String>,
    pub structure: Vec<serde_yaml::Value>,
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
