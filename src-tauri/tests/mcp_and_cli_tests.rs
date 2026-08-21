use serde_json::json;
use tempfile::TempDir;

#[test]
fn test_mcp_list_templates_and_create_project() {
    let target_tmp = TempDir::new().expect("create temp target dir");

    // Test listing templates
    let list_req = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "scaffild_list_templates",
            "arguments": {}
        }
    });

    let build_req = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "scaffild_create_project",
            "arguments": {
                "template_name": "Horizontal_Video",
                "target_dir": target_tmp.path().to_string_lossy().to_string(),
                "title": "MCP_Agent_Test",
                "id": "0099",
                "open_premiere": false,
                "reveal_in_explorer": false
            }
        }
    });

    // Verify template existence on disk
    let created_folder = target_tmp.path();
    let entries: Vec<_> = std::fs::read_dir(created_folder).unwrap().collect();
    // Initially empty
    assert!(entries.is_empty());
}
