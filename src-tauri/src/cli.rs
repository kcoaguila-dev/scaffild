use std::collections::HashMap;
use std::env;
use crate::builder::{build_project, ProjectParams};
use crate::ingest::ingest_media_core;
use crate::template::{list_templates, load_template};

pub fn run_cli(args: &[String]) {
    if args.is_empty() {
        print_help();
        return;
    }

    let command = args[0].to_lowercase();
    match command.as_str() {
        "help" | "--help" | "-h" => {
            print_help();
        }
        "version" | "--version" | "-v" => {
            println!("Scaffild v{}", env!("CARGO_PKG_VERSION"));
        }
        "list" | "templates" => {
            handle_list();
        }
        "build" | "create" => {
            handle_build(&args[1..]);
        }
        "ingest" | "offload" => {
            handle_ingest(&args[1..]);
        }
        _ => {
            eprintln!("Unknown command: {}", command);
            print_help();
        }
    }
}

fn print_help() {
    println!(r#"
Scaffild CLI - High-Speed Video Project Automation & DIT Engine

USAGE:
    scaffild [COMMAND] [OPTIONS]

COMMANDS:
    mcp                 Run the Model Context Protocol (MCP) server over stdio
    list, templates     List all available project templates and parameters
    build, create       Scaffold a new project directory with master files
    ingest, offload     Offload media with xxHash64 verification and dual backup
    version, -v         Print version information
    help, -h            Print this help menu

BUILD OPTIONS:
    --template <NAME>   Template name (e.g. Horizontal_Video, Social_Vertical_Reels_Shorts)
    --target <PATH>     Base directory path for project creation
    --title <TITLE>     Project title/hook
    --id <ID>           Project ID (default: 0001)
    --date <YYYY-MM-DD> Date string (default: today)
    --editor <NAME>     Editor or client name
    --open              Automatically launch in Adobe Premiere Pro
    --reveal            Reveal created folder in File Explorer / Finder

INGEST OPTIONS:
    --source <PATH>     Camera card or source folder path
    --primary <PATH>    Primary storage target folder
    --secondary <PATH>  Optional secondary backup target folder
"#);
}

fn handle_list() {
    match list_templates() {
        Ok(templates) => {
            println!("\nAvailable Scaffild Templates ({} total):", templates.len());
            for t in templates {
                if let Ok(data) = load_template(t.clone()) {
                    println!("  • {:<32} {}", t, data.description.unwrap_or_default());
                } else {
                    println!("  • {}", t);
                }
            }
            println!();
        }
        Err(e) => eprintln!("Error listing templates: {}", e),
    }
}

fn handle_build(args: &[String]) {
    let mut template_name = String::new();
    let mut target_dir = String::new();
    let mut title = String::new();
    let mut id = "0001".to_string();
    let mut date = String::new();
    let mut editor = String::new();
    let mut open_premiere = false;
    let mut reveal = false;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--template" | "-t" => {
                if i + 1 < args.len() { template_name = args[i + 1].clone(); i += 1; }
            }
            "--target" | "-d" => {
                if i + 1 < args.len() { target_dir = args[i + 1].clone(); i += 1; }
            }
            "--title" => {
                if i + 1 < args.len() { title = args[i + 1].clone(); i += 1; }
            }
            "--id" => {
                if i + 1 < args.len() { id = args[i + 1].clone(); i += 1; }
            }
            "--date" => {
                if i + 1 < args.len() { date = args[i + 1].clone(); i += 1; }
            }
            "--editor" => {
                if i + 1 < args.len() { editor = args[i + 1].clone(); i += 1; }
            }
            "--open" => open_premiere = true,
            "--reveal" => reveal = true,
            _ => {}
        }
        i += 1;
    }

    if template_name.is_empty() || target_dir.is_empty() || title.is_empty() {
        eprintln!("Error: Missing required arguments. --template, --target, and --title are required.");
        println!("Example: scaffild build --template Horizontal_Video --target D:\\Projects --title Nike_Ad");
        return;
    }

    let mut param_map = HashMap::new();
    param_map.insert("id".to_string(), id);
    param_map.insert("title".to_string(), title);
    if !date.is_empty() {
        param_map.insert("date".to_string(), date);
    }
    if !editor.is_empty() {
        param_map.insert("editor".to_string(), editor);
    }

    let params = ProjectParams { params: param_map, custom: HashMap::new() };

    println!("Scaffolding project using template '{}'...", template_name);
    match build_project(target_dir, template_name, params, Some(open_premiere), Some(reveal), Some(true)) {
        Ok(path) => {
            println!("Project created successfully at:\n  {}", path);
        }
        Err(e) => {
            eprintln!("Failed to build project: {}", e);
        }
    }
}

fn handle_ingest(args: &[String]) {
    let mut source = String::new();
    let mut primary = String::new();
    let mut secondary: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--source" | "-s" => {
                if i + 1 < args.len() { source = args[i + 1].clone(); i += 1; }
            }
            "--primary" | "-p" => {
                if i + 1 < args.len() { primary = args[i + 1].clone(); i += 1; }
            }
            "--secondary" => {
                if i + 1 < args.len() { secondary = Some(args[i + 1].clone()); i += 1; }
            }
            _ => {}
        }
        i += 1;
    }

    if source.is_empty() || primary.is_empty() {
        eprintln!("Error: Missing required arguments. --source and --primary are required.");
        println!("Example: scaffild ingest --source E:\\DCIM --primary D:\\Projects\\Footage --secondary F:\\Backup");
        return;
    }

    println!("Starting xxHash64 multi-threaded media ingest...");
    match ingest_media_core(source, primary, secondary, None) {
        Ok(summary) => {
            println!("\nIngest Summary:");
            println!("  Total Files:     {}", summary.total_files);
            println!("  Total Size:      {:.2} MB", summary.total_bytes as f64 / (1024.0 * 1024.0));
            println!("  Primary Path:    {}", summary.primary_path);
            if let Some(sec) = summary.secondary_path {
                println!("  Secondary Path:  {}", sec);
            }
            println!("  Checksum Status: 100% xxHash64 Verified\n");
        }
        Err(e) => {
            eprintln!("Ingest failed: {}", e);
        }
    }
}
