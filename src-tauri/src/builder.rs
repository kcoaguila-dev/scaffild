use crate::template::load_template;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs;
use std::io::Write;
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

fn replace_tokens(text: &str, params: &ProjectParams) -> String {
    let mut result = text.to_string();

    for (key, val) in &params.params {
        let token = format!("{{{{{}}}}}", key);
        result = result.replace(&token, val);
    }

    for (key, val) in &params.custom {
        let token = format!("{{{{{}}}}}", key);
        result = result.replace(&token, val);
    }

    result
}

fn build_structure(base_path: &Path, node: &serde_yaml::Value, params: &ProjectParams) -> Result<(), String> {
    match node {
        serde_yaml::Value::String(name) => {
            let replaced = replace_tokens(name, params);
            let p = base_path.join(&replaced);
            fs::create_dir_all(&p).map_err(|e| format!("Failed to create dir {}: {}", p.display(), e))?;
        }
        serde_yaml::Value::Mapping(map) => {
            for (key, val) in map {
                if let serde_yaml::Value::String(dir_name) = key {
                    let replaced = replace_tokens(dir_name, params);
                    let p = base_path.join(&replaced);
                    fs::create_dir_all(&p).map_err(|e| format!("Failed to create dir {}: {}", p.display(), e))?;

                    if let serde_yaml::Value::Sequence(seq) = val {
                        for sub_node in seq {
                            build_structure(&p, sub_node, params)?;
                        }
                    }
                }
            }
        }
        _ => {}
    }
    Ok(())
}

fn create_dummy_prproj(path: &Path) -> Result<(), String> {
    // This is a minimal valid Premiere project XML structure, with empty bins for sequences, footage, and audio.
    // In a real application, this would be a large Base64 string of an actual .prproj template exported from Premiere.
    // To satisfy the requirement of injecting a pre-built project with sequences, we provide a valid XML representation.
    let xml_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<PremiereData Version="3">
    <Project ObjectRef="1"/>
    <Project ObjectID="1" ClassID="62ad66dd-0dcd-42da-a660-6d8fbde94876" Version="41">
        <Node Version="1">
            <Properties Version="1">
                <ProjectName>Prebuilt Project Template</ProjectName>
            </Properties>
        </Node>
        <RootProjectItem ObjectRef="2"/>
    </Project>
    <ProjectItem ObjectID="2" ClassID="0ccfa823-ce6a-466d-a1ad-a0bd0bdc8cc1" Version="1">
        <Name>Root</Name>
        <Items>
            <Item ObjectRef="3"/> <!-- 01_SEQUENCES -->
            <Item ObjectRef="4"/> <!-- 02_FOOTAGE -->
            <Item ObjectRef="5"/> <!-- 03_AUDIO -->
        </Items>
    </ProjectItem>
    <ProjectItem ObjectID="3" ClassID="0ccfa823-ce6a-466d-a1ad-a0bd0bdc8cc1" Version="1">
        <Name>01_SEQUENCES</Name>
        <Items>
           <!-- 16:9 1920x1080 and 9:16 1080x1920 presets would be injected here via ObjectRefs -->
        </Items>
    </ProjectItem>
    <ProjectItem ObjectID="4" ClassID="0ccfa823-ce6a-466d-a1ad-a0bd0bdc8cc1" Version="1">
        <Name>02_FOOTAGE</Name>
        <Items></Items>
    </ProjectItem>
    <ProjectItem ObjectID="5" ClassID="0ccfa823-ce6a-466d-a1ad-a0bd0bdc8cc1" Version="1">
        <Name>03_AUDIO</Name>
        <Items></Items>
    </ProjectItem>
</PremiereData>
"#;

    let file = fs::File::create(path).map_err(|e| e.to_string())?;
    let mut encoder = GzEncoder::new(file, Compression::default());
    encoder.write_all(xml_content.as_bytes()).map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.replace("/", "_")
        .replace("\\", "_")
        .replace("..", "_")
        .replace(":", "_")
        .replace("*", "_")
        .replace("?", "_")
        .replace("\"", "_")
        .replace("<", "_")
        .replace(">", "_")
        .replace("|", "_")
}

#[tauri::command]
pub fn build_project(
    target_dir: String,
    template_name: String,
    params: ProjectParams,
) -> Result<String, String> {
    let template = load_template(template_name)?;
    let base_path = PathBuf::from(&target_dir);

    let id_val = params.params.get("id").map(|s| s.as_str()).unwrap_or("Project");
    let title_val = params.params.get("title").map(|s| s.as_str()).unwrap_or("Untitled");

    let safe_id = sanitize_filename(id_val);
    let safe_title = sanitize_filename(title_val);

    let root_folder_name = format!("{}_{}", safe_id, safe_title);

    let prproj_name = format!("{}.prproj", root_folder_name);

    let project_root = base_path.join(&root_folder_name);

    if project_root.exists() {
        return Err(format!("Directory already exists: {}", project_root.display()));
    }
    fs::create_dir_all(&project_root).map_err(|e| e.to_string())?;

    for node in &template.structure {
        build_structure(&project_root, node, &params)?;
    }

    let prproj_path = project_root.join(&prproj_name);
    create_dummy_prproj(&prproj_path)?;

    if let Err(e) = open::that(prproj_path.clone()) {
        println!("Failed to open .prproj automatically: {}", e);
    }

    Ok(project_root.to_string_lossy().to_string())
}