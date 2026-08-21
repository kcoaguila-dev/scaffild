use std::fs;
use std::io::Write;
use tempfile::TempDir;
use scaffild_lib::ingest::ingest_media_core;

#[test]
fn test_dual_ingest_and_checksum_verification() {
    let source_tmp = TempDir::new().expect("create temp source dir");
    let primary_tmp = TempDir::new().expect("create temp primary dir");
    let secondary_tmp = TempDir::new().expect("create temp secondary dir");

    let src_path = source_tmp.path();
    let prim_path = primary_tmp.path();
    let sec_path = secondary_tmp.path();

    // Create mock camera card files
    fs::create_dir_all(src_path.join("DCIM/100EOS1D")).unwrap();
    let clip1 = src_path.join("DCIM/100EOS1D/CLIP_0001.MP4");
    let clip2 = src_path.join("DCIM/100EOS1D/CLIP_0002.MP4");
    let audio = src_path.join("DCIM/100EOS1D/AUDIO_0001.WAV");

    fs::write(&clip1, b"MOCK_VIDEO_STREAM_DATA_FRAME_001_TO_100_HIGH_BITRATE").unwrap();
    fs::write(&clip2, b"MOCK_VIDEO_STREAM_DATA_FRAME_101_TO_200_4K_PRORES").unwrap();
    fs::write(&audio, b"MOCK_PCM_24BIT_48KHZ_AUDIO_STEMS_DIALOGUE").unwrap();

    let summary = ingest_media_core(
        src_path.to_string_lossy().to_string(),
        prim_path.to_string_lossy().to_string(),
        Some(sec_path.to_string_lossy().to_string()),
        None,
    ).expect("Ingest should succeed");

    assert_eq!(summary.total_files, 3);
    assert_eq!(summary.verified_checksums, 3);
    assert!(summary.total_bytes > 0);

    // Verify Primary destination files exist and match bit-for-bit
    let p_root = scaffild_lib::ingest::resolve_destination_folder(&prim_path.to_string_lossy());
    assert!(p_root.join("DCIM/100EOS1D/CLIP_0001.MP4").exists());
    assert!(p_root.join("DCIM/100EOS1D/CLIP_0002.MP4").exists());
    assert!(p_root.join("DCIM/100EOS1D/AUDIO_0001.WAV").exists());
    assert!(p_root.join("checksum_manifest.txt").exists());

    // Verify Secondary backup destination files exist
    let s_root = scaffild_lib::ingest::resolve_destination_folder(&sec_path.to_string_lossy());
    assert!(s_root.join("DCIM/100EOS1D/CLIP_0001.MP4").exists());
    assert!(s_root.join("DCIM/100EOS1D/CLIP_0002.MP4").exists());
    assert!(s_root.join("checksum_manifest.txt").exists());

    // Verify checksum manifest content
    let manifest_content = fs::read_to_string(p_root.join("checksum_manifest.txt")).unwrap();
    assert!(manifest_content.contains("CLIP_0001.MP4"));
    assert!(manifest_content.contains("CLIP_0002.MP4"));
    assert!(manifest_content.contains("AUDIO_0001.WAV"));
}

#[test]
fn test_ingest_nonexistent_source_returns_error() {
    let prim_tmp = TempDir::new().unwrap();
    let res = ingest_media_core(
        "Z:\\NonExistent\\Drive\\Card".to_string(),
        prim_tmp.path().to_string_lossy().to_string(),
        None,
        None,
    );
    assert!(res.is_err(), "Non-existent source should return Err");
}
