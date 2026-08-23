use scaffild_lib::watcher::{get_relative_bin_hierarchy, is_ignored_path, is_media_file};
use std::path::Path;

#[test]
fn test_is_media_file_detection() {
    assert!(is_media_file(Path::new("clip.mp4")));
    assert!(is_media_file(Path::new("video.MOV")));
    assert!(is_media_file(Path::new("audio.wav")));
    assert!(is_media_file(Path::new("graphic.png")));
    assert!(is_media_file(Path::new("render.EXR")));
    assert!(!is_media_file(Path::new("project.prproj")));
    assert!(!is_media_file(Path::new("script.jsx")));
    assert!(!is_media_file(Path::new("notes.txt")));
}

#[test]
fn test_is_ignored_path_detection() {
    let root = Path::new("C:/Projects/001_MyProject");
    
    // Project files & auto-save must be ignored
    assert!(is_ignored_path(Path::new("C:/Projects/001_MyProject/01_PROJECT_FILES/project.prproj"), root));
    assert!(is_ignored_path(Path::new("C:/Projects/001_MyProject/Adobe Premiere Pro Auto-Save/backup.prproj"), root));
    assert!(is_ignored_path(Path::new("C:/Projects/001_MyProject/.git/config"), root));
    
    // Custom media folders must NOT be ignored
    assert!(!is_ignored_path(Path::new("C:/Projects/001_MyProject/Drone_4K/flight_01.mp4"), root));
    assert!(!is_ignored_path(Path::new("C:/Projects/001_MyProject/02_FOOTAGE/CAM_A/clip.mov"), root));
    assert!(!is_ignored_path(Path::new("C:/Projects/001_MyProject/Sound_Design/Whoosh.wav"), root));
}

#[test]
fn test_dynamic_relative_bin_hierarchy() {
    let root = Path::new("C:/Projects/001_MyProject");
    
    let file1 = Path::new("C:/Projects/001_MyProject/Drone_4K/Day_01/flight_01.mp4");
    let bins1 = get_relative_bin_hierarchy(file1, root).unwrap();
    assert_eq!(bins1, vec!["Drone_4K", "Day_01"]);

    let file2 = Path::new("C:/Projects/001_MyProject/Sound_FX/whoosh.wav");
    let bins2 = get_relative_bin_hierarchy(file2, root).unwrap();
    assert_eq!(bins2, vec!["Sound_FX"]);

    let file3 = Path::new("C:/Projects/001_MyProject/02_FOOTAGE/CAM_A/2026-08-23/clip.mov");
    let bins3 = get_relative_bin_hierarchy(file3, root).unwrap();
    assert_eq!(bins3, vec!["02_FOOTAGE", "CAM_A", "2026-08-23"]);
}
