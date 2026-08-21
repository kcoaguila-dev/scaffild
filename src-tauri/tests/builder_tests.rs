use std::collections::HashMap;
use tempfile::TempDir;
use scaffild_lib::builder::{build_project, ProjectParams};
use scaffild_lib::template::{save_template, Template};

#[test]
fn test_project_scaffolding_end_to_end() {
    let target_tmp = TempDir::new().expect("create temp target dir");
    let template_name = "Integration_Test_Template";

    // Setup custom test template
    let yaml_str = r#"
name: Integration_Test_Template
description: Template for E2E Builder test
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
  - 04_GRAPHICS:
      - "[project]_Thumbnail.psd"
  - 05_EXPORTS
"#;
    let template: Template = serde_yaml::from_str(yaml_str).unwrap();
    save_template(template_name.to_string(), template).expect("Save test template");

    let mut param_map = HashMap::new();
    param_map.insert("id".to_string(), "0042".to_string());
    param_map.insert("title".to_string(), "Nike_Summer_Campaign".to_string());
    param_map.insert("date".to_string(), "2026-08-21".to_string());
    param_map.insert("editor".to_string(), "Senior_Editor".to_string());

    let params = ProjectParams { params: param_map, custom: HashMap::new() };

    let created_path = build_project(
        target_tmp.path().to_string_lossy().to_string(),
        template_name.to_string(),
        params,
        Some(false), // don't open premiere in tests
        Some(false), // don't reveal in explorer
        Some(true),  // include SyncBins.jsx
    ).expect("Project build should succeed");

    let project_dir = std::path::PathBuf::from(&created_path);
    assert!(project_dir.exists(), "Project root directory should exist");

    // Check expected subfolders
    assert!(project_dir.join("01_PROJECT_FILES").exists());
    assert!(project_dir.join("02_FOOTAGE/A_ROLL").exists());
    assert!(project_dir.join("02_FOOTAGE/B_ROLL").exists());
    assert!(project_dir.join("03_AUDIO/MUSIC").exists());
    assert!(project_dir.join("03_AUDIO/SFX").exists());
    assert!(project_dir.join("04_GRAPHICS").exists());
    assert!(project_dir.join("05_EXPORTS").exists());

    // Check SyncBins.jsx was placed in 01_PROJECT_FILES
    assert!(project_dir.join("01_PROJECT_FILES/SyncBins.jsx").exists());

    // Check project file rename
    let expected_prproj = project_dir.join("01_PROJECT_FILES/0042_Nike_Summer_Campaign_2026-08-21_Senior_Editor.prproj");
    assert!(expected_prproj.exists(), "Renamed .prproj should exist");

    // Check thumbnail rename
    let expected_psd = project_dir.join("04_GRAPHICS/0042_Nike_Summer_Campaign_2026-08-21_Senior_Editor_Thumbnail.psd");
    assert!(expected_psd.exists(), "Renamed .psd should exist");

    // Clean up test template
    let _ = scaffild_lib::template::delete_template(template_name.to_string());
}
