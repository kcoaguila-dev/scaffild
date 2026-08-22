pub mod builder;
pub mod cli;
pub mod ingest;
pub mod mcp;
pub mod template;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::include_image!("icons/128x128.png");
                let _ = window.set_icon(icon);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            template::list_templates,
            template::load_template,
            template::save_template,
            template::delete_template,
            template::scan_directory_structure,
            template::pick_folder_and_scan,
            template::pick_directory,
            template::open_templates_dir,
            builder::build_project,
            builder::open_project_in_premiere,
            builder::get_next_project_id,
            ingest::ingest_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}