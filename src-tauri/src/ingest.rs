use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use rayon::prelude::*;
use tauri::{AppHandle, Emitter};
use twox_hash::XxHash64;
use std::hash::Hasher;
use walkdir::WalkDir;

#[derive(Clone, serde::Serialize)]
pub struct ProgressEvent {
    pub file: String,
    pub bytes_copied: u64,
    pub total_bytes: u64,
    pub status: String,
}


fn copy_and_hash(
    src: &Path,
    dest: &Path,
    app: &AppHandle,
    file_name: &str,
    total_size: u64,
) -> Result<String, String> {
    let mut src_file = fs::File::open(src).map_err(|e| e.to_string())?;
    let mut dest_file = fs::File::create(dest).map_err(|e| e.to_string())?;

    let mut hasher = XxHash64::default();
    let buffer_size = std::cmp::min(total_size as usize, 8 * 1024 * 1024);
    let buffer_size = std::cmp::max(buffer_size, 4096); // Ensure at least 4KB buffer
    let mut buffer = vec![0; buffer_size];
    let mut bytes_copied = 0;

    loop {
        let n = src_file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }

        dest_file.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
        hasher.write(&buffer[..n]);

        bytes_copied += n as u64;

        // Emit progress periodically
        if bytes_copied % (32 * 1024 * 1024) == 0 || bytes_copied == total_size {
            let _ = app.emit("ingest-progress", ProgressEvent {
                file: file_name.to_string(),
                bytes_copied,
                total_bytes: total_size,
                status: "copying".into(),
            });
        }
    }

    // Calculate hash on destination to verify it actually wrote correctly (read back)
    // Wait, reading it back defeats the purpose of single pass.
    // To be perfectly safe, we calculate hash of destination file as well,
    // but the requirement said "fast SD card offloading" and "reading source twice is a bottleneck".
    // We only need to read dest once, which is on a fast SSD, not the slow SD card.

    let mut dest_read_file = fs::File::open(dest).map_err(|e| e.to_string())?;
    let mut dest_hasher = XxHash64::default();

    loop {
        let n = dest_read_file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        dest_hasher.write(&buffer[..n]);
    }

    let src_hash = format!("{:016x}", hasher.finish());
    let dest_hash = format!("{:016x}", dest_hasher.finish());

    if src_hash != dest_hash {
        return Err(format!("Checksum mismatch for {}", file_name));
    }

    Ok(src_hash)
}

#[tauri::command]
pub async fn ingest_media(
    app: AppHandle,
    source_dir: String,
    target_project_dir: String,
) -> Result<(), String> {
    let app_handle = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let src_path = PathBuf::from(&source_dir);
        let dest_base = PathBuf::from(&target_project_dir).join("02_FOOTAGE").join("A_ROLL");

        if !dest_base.exists() {
            fs::create_dir_all(&dest_base).map_err(|e| e.to_string())?;
        }

        let manifest = Mutex::new(String::new());

        let walker = WalkDir::new(&src_path).into_iter();
        let entries: Vec<_> = walker.filter_map(|e| e.ok()).filter(|e| e.file_type().is_file()).collect();

        // Process files in parallel
        entries.par_iter().try_for_each(|entry| -> Result<(), String> {
            let relative_path = entry.path().strip_prefix(&src_path).unwrap();
            let dest_path = dest_base.join(relative_path);

            if let Some(parent) = dest_path.parent() {
                let _ = fs::create_dir_all(parent);
            }

            let file_name = entry.file_name().to_string_lossy().to_string();
            let total_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            let _ = app_handle.emit("ingest-progress", ProgressEvent {
                file: file_name.clone(),
                bytes_copied: 0,
                total_bytes: total_size,
                status: "copying".into(),
            });

            match copy_and_hash(entry.path(), &dest_path, &app_handle, &file_name, total_size) {
                Ok(hash) => {
                    let mut m = manifest.lock().unwrap();
                    m.push_str(&format!("{} {}\n", hash, relative_path.display()));

                    let _ = app_handle.emit("ingest-progress", ProgressEvent {
                        file: file_name.clone(),
                        bytes_copied: total_size,
                        total_bytes: total_size,
                        status: "done".into(),
                    });
                    Ok(())
                }
                Err(err) => {
                    let _ = app_handle.emit("ingest-progress", ProgressEvent {
                        file: file_name.clone(),
                        bytes_copied: total_size,
                        total_bytes: total_size,
                        status: "error".into(),
                    });
                    Err(err)
                }
            }
        })?;

        let manifest_path = dest_base.join("checksum_manifest.txt");
        let final_manifest = manifest.into_inner().unwrap();
        fs::write(manifest_path, final_manifest).map_err(|e| e.to_string())?;

        Ok(())
    }).await.map_err(|e| e.to_string())?
}