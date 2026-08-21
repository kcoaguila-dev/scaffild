use scaffild_lib::template::{Template, TemplateParamEntry};

#[test]
fn test_template_deserialization_clean() {
    let yaml_str = r#"
name: Test_Template
description: A clean test template
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
  - 03_AUDIO
"#;
    let template: Result<Template, _> = serde_yaml::from_str(yaml_str);
    assert!(template.is_ok(), "Failed to deserialize clean YAML");
    let t = template.unwrap();
    assert_eq!(t.name, "Test_Template");
    assert_eq!(t.structure.len(), 3);
    assert_eq!(t.get_parameters().len(), 4);
}

#[test]
fn test_template_utf8_bom_trimming() {
    let raw_with_bom = "\u{feff}name: BOM_Template\ndescription: Template with UTF-8 BOM\nstructure:\n  - 01_PROJECT_FILES\n";
    let clean = raw_with_bom.trim_start_matches('\u{feff}');
    let template: Result<Template, _> = serde_yaml::from_str(clean);
    assert!(template.is_ok(), "Failed to deserialize YAML after trimming BOM");
    let t = template.unwrap();
    assert_eq!(t.name, "BOM_Template");
    assert_eq!(t.structure.len(), 1);
}

#[test]
fn test_template_detailed_parameters() {
    let yaml_str = r#"
name: Detailed_Params
parameters:
  - name: project_code
    label: "Project Code (e.g. PRJ-01)"
    required: true
  - name: client
    label: Client Name
structure:
  - 01_ROOT
"#;
    let template: Template = serde_yaml::from_str(yaml_str).expect("Valid YAML");
    let params = template.get_parameters();
    assert_eq!(params.len(), 2);
    assert_eq!(params[0].name, "project_code");
    assert_eq!(params[0].label, Some("Project Code (e.g. PRJ-01)".to_string()));
    assert_eq!(params[0].required, Some(true));
}
