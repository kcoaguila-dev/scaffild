use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{self, BufRead, Write};
use crate::builder::{build_project, ProjectParams};
use crate::ingest::ingest_media_core;
use crate::template::{list_templates, load_template};

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<Value>,
}

pub fn run_mcp_server() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let req: JsonRpcRequest = match serde_json::from_str(trimmed) {
            Ok(r) => r,
            Err(e) => {
                let err_res = json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": { "code": -32700, "message": format!("Parse error: {}", e) }
                });
                let _ = writeln!(stdout, "{}", err_res);
                let _ = stdout.flush();
                continue;
            }
        };

        let res = handle_request(&req);
        if let Some(res_val) = res {
            let _ = writeln!(stdout, "{}", serde_json::to_string(&res_val).unwrap_or_default());
            let _ = stdout.flush();
        }
    }
}

fn handle_request(req: &JsonRpcRequest) -> Option<JsonRpcResponse> {
    let id = req.id.clone().unwrap_or(Value::Null);

    match req.method.as_str() {
        "initialize" => {
            Some(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: Some(json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "scaffild-mcp",
                        "version": env!("CARGO_PKG_VERSION")
                    }
                })),
                error: None,
            })
        }
        "notifications/initialized" | "initialized" => {
            None
        }
        "ping" => {
            Some(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: Some(json!({})),
                error: None,
            })
        }
        "tools/list" => {
            Some(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: Some(json!({
                    "tools": get_tool_definitions()
                })),
                error: None,
            })
        }
        "tools/call" => {
            let params = req.params.as_ref();
            let name = params
                .and_then(|p| p.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or("");
            let args = params
                .and_then(|p| p.get("arguments"))
                .cloned()
                .unwrap_or(json!({}));

            let tool_res = execute_tool(name, &args);
            Some(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: Some(tool_res),
                error: None,
            })
        }
        _ => {
            Some(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(json!({
                    "code": -32601,
                    "message": format!("Method not found: {}", req.method)
                })),
            })
        }
    }
}

fn get_tool_definitions() -> Vec<Value> {
    vec![
        json!({
            "name": "scaffild_list_templates",
            "description": "List all available project templates in Scaffild (e.g. Horizontal_Video, Social_Vertical_Reels_Shorts, MultiFormat_Campaign) with their parameter specs.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        }),
        json!({
            "name": "scaffild_inspect_template",
            "description": "Inspect the full folder hierarchy and parameter requirements of a specific Scaffild template.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "template_name": {
                        "type": "string",
                        "description": "The name of the template to inspect (e.g. 'Horizontal_Video', 'Social_Vertical_Reels_Shorts')"
                    }
                },
                "required": ["template_name"]
            }
        }),
        json!({
            "name": "scaffild_create_project",
            "description": "Scaffold a complete video/media project directory structure on disk with cloned master .prproj, .psd, and SyncBins.jsx files.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "template_name": {
                        "type": "string",
                        "description": "The template to use (e.g. 'Horizontal_Video', 'Social_Vertical_Reels_Shorts', 'MultiFormat_Campaign')"
                    },
                    "target_dir": {
                        "type": "string",
                        "description": "Base directory where the project folder will be created (e.g. 'D:\\Projects' or 'C:\\Users\\user\\Videos')"
                    },
                    "title": {
                        "type": "string",
                        "description": "The project title/hook (e.g. 'Viral_Hook_Reel', 'Nike_Commercial')"
                    },
                    "id": {
                        "type": "string",
                        "description": "Optional project numeric ID or code (e.g. '0012'). If omitted, automatically generated."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional date string (YYYY-MM-DD). Defaults to current date if omitted."
                    },
                    "editor": {
                        "type": "string",
                        "description": "Optional editor or client name."
                    },
                    "open_premiere": {
                        "type": "boolean",
                        "description": "Whether to automatically launch the generated .prproj in Adobe Premiere Pro. Defaults to false for headless agents."
                    },
                    "reveal_in_explorer": {
                        "type": "boolean",
                        "description": "Whether to reveal the created project in Windows File Explorer / macOS Finder. Defaults to false."
                    }
                },
                "required": ["template_name", "target_dir", "title"]
            }
        }),
        json!({
            "name": "scaffild_ingest_media",
            "description": "High-speed multi-threaded media offloader with xxHash64 checksum verification and dual-destination 3-2-1 backup support.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "source_dir": {
                        "type": "string",
                        "description": "Source folder path (e.g. camera SD card 'E:\\DCIM\\100EOS1D')"
                    },
                    "primary_target_dir": {
                        "type": "string",
                        "description": "Primary fast storage destination (e.g. NVMe project footage folder 'D:\\Projects\\0012_Nike\\02_FOOTAGE\\A_ROLL')"
                    },
                    "secondary_target_dir": {
                        "type": "string",
                        "description": "Optional secondary backup destination (e.g. Archive HDD 'F:\\Backup\\0012_Nike')"
                    }
                },
                "required": ["source_dir", "primary_target_dir"]
            }
        })
    ]
}

fn execute_tool(name: &str, args: &Value) -> Value {
    match name {
        "scaffild_list_templates" => {
            match list_templates() {
                Ok(templates) => {
                    let mut details = Vec::new();
                    for t in templates {
                        if let Ok(data) = load_template(t.clone()) {
                            details.push(json!({
                                "name": t,
                                "description": data.description,
                                "parameters": data.get_parameters(),
                            }));
                        } else {
                            details.push(json!({ "name": t }));
                        }
                    }
                    json!({
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&details).unwrap_or_default()
                        }]
                    })
                }
                Err(e) => json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": format!("Error listing templates: {}", e) }]
                }),
            }
        }
        "scaffild_inspect_template" => {
            let t_name = args.get("template_name").and_then(|v| v.as_str()).unwrap_or("");
            if t_name.is_empty() {
                return json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": "Missing 'template_name' parameter." }]
                });
            }
            match load_template(t_name.to_string()) {
                Ok(t) => json!({
                    "content": [{
                        "type": "text",
                        "text": serde_json::to_string_pretty(&t).unwrap_or_default()
                    }]
                }),
                Err(e) => json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": format!("Failed to load template '{}': {}", t_name, e) }]
                }),
            }
        }
        "scaffild_create_project" => {
            let t_name = args.get("template_name").and_then(|v| v.as_str()).unwrap_or("");
            let target_dir = args.get("target_dir").and_then(|v| v.as_str()).unwrap_or("");
            let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("");

            if t_name.is_empty() || target_dir.is_empty() || title.is_empty() {
                return json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": "Missing required arguments ('template_name', 'target_dir', 'title')." }]
                });
            }

            let today = chrono_today();
            let date = args.get("date").and_then(|v| v.as_str()).unwrap_or(&today);
            let id = args.get("id").and_then(|v| v.as_str()).unwrap_or("0001");
            let editor = args.get("editor").and_then(|v| v.as_str()).unwrap_or("");
            let open_premiere = args.get("open_premiere").and_then(|v| v.as_bool()).unwrap_or(false);
            let reveal = args.get("reveal_in_explorer").and_then(|v| v.as_bool()).unwrap_or(false);

            let mut param_map = HashMap::new();
            param_map.insert("id".to_string(), id.to_string());
            param_map.insert("title".to_string(), title.to_string());
            param_map.insert("date".to_string(), date.to_string());
            if !editor.is_empty() {
                param_map.insert("editor".to_string(), editor.to_string());
            }

            let params = ProjectParams { params: param_map, custom: HashMap::new() };

            match build_project(
                target_dir.to_string(),
                t_name.to_string(),
                params,
                Some(open_premiere),
                Some(reveal),
                Some(true),
            ) {
                Ok(created_path) => json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Project successfully created at:\n{}\n\nIncludes:\n• Cloned master .prproj and .psd\n• SyncBins.jsx for dynamic Premiere bin synchronization", created_path)
                    }]
                }),
                Err(e) => json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": format!("Failed to create project: {}", e) }]
                }),
            }
        }
        "scaffild_ingest_media" => {
            let src = args.get("source_dir").and_then(|v| v.as_str()).unwrap_or("");
            let primary = args.get("primary_target_dir").and_then(|v| v.as_str()).unwrap_or("");
            let secondary = args.get("secondary_target_dir").and_then(|v| v.as_str()).map(|s| s.to_string());

            if src.is_empty() || primary.is_empty() {
                return json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": "Missing 'source_dir' or 'primary_target_dir'." }]
                });
            }

            match ingest_media_core(src.to_string(), primary.to_string(), secondary, None) {
                Ok(summary) => json!({
                    "content": [{
                        "type": "text",
                        "text": format!(
                            "Ingest Completed Successfully!\n• Total Files: {}\n• Total Size: {:.2} MB\n• Primary Target: {}\n• Secondary Backup: {}\n• Checksum: xxHash64 (100% verified)",
                            summary.total_files,
                            summary.total_bytes as f64 / (1024.0 * 1024.0),
                            summary.primary_path,
                            summary.secondary_path.unwrap_or_else(|| "None".to_string())
                        )
                    }]
                }),
                Err(e) => json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": format!("Ingest failed: {}", e) }]
                }),
            }
        }
        _ => json!({
            "isError": true,
            "content": [{ "type": "text", "text": format!("Unknown tool: {}", name) }]
        }),
    }
}

fn chrono_today() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let days = duration.as_secs() / 86400;
    let mut year = 1970;
    let mut d = days;
    loop {
        let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if leap { 366 } else { 365 };
        if d < days_in_year {
            break;
        }
        d -= days_in_year;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let month_days = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1;
    for &md in &month_days {
        if d < md {
            break;
        }
        d -= md;
        month += 1;
    }
    let day = d + 1;
    format!("{:04}-{:02}-{:02}", year, month, day)
}
