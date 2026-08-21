pub mod builder;
pub mod ingest;
pub mod template;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            template::list_templates,
            template::load_template,
            template::save_template,
            template::delete_template,
            template::scan_directory_structure,
            template::pick_folder_and_scan,
            template::pick_directory,
            builder::build_project,
            builder::open_project_in_premiere,
            builder::get_next_project_id,
            ingest::ingest_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}