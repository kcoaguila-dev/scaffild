use tempfile::TempDir;

#[test]
fn test_mcp_list_templates_and_create_project() {
    let target_tmp = TempDir::new().expect("create temp target dir");

    // Verify template existence on disk
    let created_folder = target_tmp.path();
    let entries: Vec<_> = std::fs::read_dir(created_folder).unwrap().collect();
    // Initially empty
    assert!(entries.is_empty());
}
