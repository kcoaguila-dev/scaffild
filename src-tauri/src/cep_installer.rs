use std::fs;
use std::path::PathBuf;

const MANIFEST_XML: &str = include_str!("../../src-cep/scaffild-autosync/CSXS/manifest.xml");
const INDEX_HTML: &str = include_str!("../../src-cep/scaffild-autosync/index.html");
const CSINTERFACE_JS: &str = include_str!("../../src-cep/scaffild-autosync/CSInterface.js");
const MAIN_JS: &str = include_str!("../../src-cep/scaffild-autosync/main.js");
const HOST_JSX: &str = include_str!("../../src-cep/scaffild-autosync/host.jsx");

/// Resolves the user's Adobe CEP extensions directory
pub fn get_cep_extensions_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join("AppData").join("Roaming"));
        Ok(appdata.join("Adobe").join("CEP").join("extensions"))
    }
    #[cfg(target_os = "macos")]
    {
        let home = dirs::home_dir().ok_or_else(|| "Could not find home directory".to_string())?;
        Ok(home.join("Library").join("Application Support").join("Adobe").join("CEP").join("extensions"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("Unsupported operating system for Adobe CEP".to_string())
    }
}

/// Enables Adobe CEP PlayerDebugMode in Windows Registry or macOS defaults
pub fn enable_player_debug_mode() {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        for version in 8..=16 {
            let key = format!(r"HKCU\Software\Adobe\CSXS.{}", version);
            let _ = Command::new("reg")
                .args(["add", &key, "/v", "PlayerDebugMode", "/t", "REG_SZ", "/d", "1", "/f"])
                .output();
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        for version in 8..=16 {
            let key = format!("com.adobe.CSXS.{}", version);
            let _ = Command::new("defaults")
                .args(["write", &key, "PlayerDebugMode", "1"])
                .output();
        }
    }
}

/// Checks whether Scaffild AutoSync CEP extension is currently installed
#[tauri::command]
pub fn is_premiere_extension_installed() -> bool {
    if let Ok(cep_dir) = get_cep_extensions_dir() {
        let ext_dir = cep_dir.join("scaffild-autosync");
        let manifest = ext_dir.join("CSXS").join("manifest.xml");
        ext_dir.exists() && manifest.exists()
    } else {
        false
    }
}

/// Installs or updates the Scaffild AutoSync CEP extension into Adobe Premiere Pro
#[tauri::command]
pub fn install_premiere_extension() -> Result<String, String> {
    let cep_dir = get_cep_extensions_dir()?;
    let target_ext_dir = cep_dir.join("scaffild-autosync");
    let csxs_dir = target_ext_dir.join("CSXS");

    fs::create_dir_all(&csxs_dir)
        .map_err(|e| format!("Failed to create CEP directory {}: {}", csxs_dir.display(), e))?;

    fs::write(csxs_dir.join("manifest.xml"), MANIFEST_XML)
        .map_err(|e| format!("Failed to write manifest.xml: {}", e))?;
    fs::write(target_ext_dir.join("index.html"), INDEX_HTML)
        .map_err(|e| format!("Failed to write index.html: {}", e))?;
    fs::write(target_ext_dir.join("CSInterface.js"), CSINTERFACE_JS)
        .map_err(|e| format!("Failed to write CSInterface.js: {}", e))?;
    fs::write(target_ext_dir.join("main.js"), MAIN_JS)
        .map_err(|e| format!("Failed to write main.js: {}", e))?;
    fs::write(target_ext_dir.join("host.jsx"), HOST_JSX)
        .map_err(|e| format!("Failed to write host.jsx: {}", e))?;

    enable_player_debug_mode();

    Ok(format!(
        "Successfully installed Scaffild AutoSync extension into {}",
        target_ext_dir.display()
    ))
}
