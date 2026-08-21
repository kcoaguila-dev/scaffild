// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    if !args.is_empty() {
        let first = args[0].to_lowercase();
        if first == "mcp" || first == "--mcp" {
            scaffild_lib::mcp::run_mcp_server();
            return;
        }

        if ["build", "create", "list", "templates", "ingest", "offload", "version", "--version", "-v", "help", "--help", "-h", "--cli"].contains(&first.as_str()) {
            scaffild_lib::cli::run_cli(&args);
            return;
        }
    }

    scaffild_lib::run()
}
