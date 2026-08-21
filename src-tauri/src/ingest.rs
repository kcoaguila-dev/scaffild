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

#[derive(Clone, serde::Serialize)]
pub struct IngestSummary {
    pub total_files: usize,
    pub total_bytes: u64,
    pub verified_checksums: usize,
}

fn resolve_destination_folder(base: &str) -> PathBuf {
    let p = PathBuf::from(base);
    // If the folder already ends with or contains footage/media, use it directly
    let name_lower = p.file_name().map(|s| s.to_string_lossy().to_lowercase()).unwrap_or_default();
    if name_lower.contains("footage") || name_lower.contains("media") || name_lower.contains("raw") {
        return p;
    }
    // Check if 02_FOOTAGE/A_ROLL or 02_FOOTAGE exists inside
    if p.join("02_FOOTAGE").join("A_ROLL").exists() {
        return p.join("02_FOOTAGE").join("A_ROLL");
    }
    if p.join("02_FOOTAGE").exists() {
        return p.join("02_FOOTAGE").join("A_ROLL");
    }
    p.join("02_FOOTAGE").join("A_ROLL")
}

fn copy_and_hash_dual(
    src: &Path,
    dest1: &Path,
    dest2: Option<&Path>,
    app: &AppHandle,
    file_name: &str,
    total_size: u64,
) -> Result<String, String> {
    let mut src_file = fs::File::open(src).map_err(|e| e.to_string())?;
    let mut dest1_file = fs::File::create(dest1).map_err(|e| e.to_string())?;
    let mut dest2_file = if let Some(d2) = dest2 {
        Some(fs::File::create(d2).map_err(|e| e.to_string())?)
    } else {
        None
    };

    let mut hasher = XxHash64::default();
    let buffer_size = std::cmp::min(total_size as usize, 8 * 1024 * 1024);
    let buffer_size = std::cmp::max(buffer_size, 4096);
    let mut buffer = vec![0; buffer_size];
    let mut bytes_copied = 0;

    loop {
        let n = src_file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }

        dest1_file.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
        if let Some(ref mut d2_file) = dest2_file {
            d2_file.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
        }
        hasher.write(&buffer[..n]);

        bytes_copied += n as u64;

        if bytes_copied % (32 * 1024 * 1024) == 0 || bytes_copied == total_size {
            let _ = app.emit("ingest-progress", ProgressEvent {
                file: file_name.to_string(),
                bytes_copied,
                total_bytes: total_size,
                status: "copying".into(),
            });
        }
    }

    let src_hash = format!("{:016x}", hasher.finish());

    // Verify Primary Destination
    let mut dest1_read = fs::File::open(dest1).map_err(|e| e.to_string())?;
    let mut dest1_hasher = XxHash64::default();
    loop {
        let n = dest1_read.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        dest1_hasher.write(&buffer[..n]);
    }
    let dest1_hash = format!("{:016x}", dest1_hasher.finish());
    if src_hash != dest1_hash {
        return Err(format!("Checksum mismatch on primary destination for {}", file_name));
    }

    // Verify Backup Destination if configured
    if let Some(d2) = dest2 {
        let mut dest2_read = fs::File::open(d2).map_err(|e| e.to_string())?;
        let mut dest2_hasher = XxHash64::default();
        loop {
            let n = dest2_read.read(&mut buffer).map_err(|e| e.to_string())?;
            if n == 0 { break; }
            dest2_hasher.write(&buffer[..n]);
        }
        let dest2_hash = format!("{:016x}", dest2_hasher.finish());
        if src_hash != dest2_hash {
            return Err(format!("Checksum mismatch on backup destination for {}", file_name));
        }
    }

    Ok(src_hash)
}

#[tauri::command]
pub async fn ingest_media(
    app: AppHandle,
    source_dir: String,
    target_project_dir: String,
    secondary_target_dir: Option<String>,
) -> Result<IngestSummary, String> {
    let app_handle = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let src_path = PathBuf::from(&source_dir);
        let dest1_base = resolve_destination_folder(&target_project_dir);

        if !dest1_base.exists() {
            fs::create_dir_all(&dest1_base).map_err(|e| e.to_string())?;
        }

        let dest2_base = secondary_target_dir.as_ref().map(|s| {
            let p = resolve_destination_folder(s);
            let _ = fs::create_dir_all(&p);
            p
        });

        let manifest = Mutex::new(String::new());

        let walker = WalkDir::new(&src_path).into_iter();
        let entries: Vec<_> = walker.filter_map(|e| e.ok()).filter(|e| e.file_type().is_file()).collect();

        let total_files = entries.len();
        let mut total_bytes: u64 = 0;
        for entry in &entries {
            total_bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }

        // Process files in parallel
        entries.par_iter().try_for_each(|entry| -> Result<(), String> {
            let relative_path = entry.path().strip_prefix(&src_path).unwrap();
            let dest1_path = dest1_base.join(relative_path);
            let dest2_path = dest2_base.as_ref().map(|b| b.join(relative_path));

            if let Some(parent) = dest1_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            if let Some(ref d2_p) = dest2_path {
                if let Some(parent) = d2_p.parent() {
                    let _ = fs::create_dir_all(parent);
                }
            }

            let file_name = entry.file_name().to_string_lossy().to_string();
            let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            let _ = app_handle.emit("ingest-progress", ProgressEvent {
                file: file_name.clone(),
                bytes_copied: 0,
                total_bytes: file_size,
                status: "copying".into(),
            });

            match copy_and_hash_dual(
                entry.path(),
                &dest1_path,
                dest2_path.as_deref(),
                &app_handle,
                &file_name,
                file_size,
            ) {
                Ok(hash) => {
                    let mut m = manifest.lock().unwrap();
                    m.push_str(&format!("{} {}\n", hash, relative_path.display()));

                    let _ = app_handle.emit("ingest-progress", ProgressEvent {
                        file: file_name.clone(),
                        bytes_copied: file_size,
                        total_bytes: file_size,
                        status: "done".into(),
                    });
                    Ok(())
                }
                Err(err) => {
                    let _ = app_handle.emit("ingest-progress", ProgressEvent {
                        file: file_name.clone(),
                        bytes_copied: file_size,
                        total_bytes: file_size,
                        status: "error".into(),
                    });
                    Err(err)
                }
            }
        })?;

        let final_manifest = manifest.into_inner().unwrap();
        let manifest_path1 = dest1_base.join("checksum_manifest.txt");
        let _ = fs::write(manifest_path1, &final_manifest);

        if let Some(ref d2_b) = dest2_base {
            let manifest_path2 = d2_b.join("checksum_manifest.txt");
            let _ = fs::write(manifest_path2, &final_manifest);
        }

        Ok(IngestSummary {
            total_files,
            total_bytes,
            verified_checksums: total_files,
        })
    }).await.map_err(|e| e.to_string())?
}