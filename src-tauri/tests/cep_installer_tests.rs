use scaffild_lib::cep_installer;

#[test]
fn test_get_cep_extensions_dir() {
    let dir = cep_installer::get_cep_extensions_dir();
    assert!(dir.is_ok());
    let path = dir.unwrap();
    assert!(path.to_string_lossy().contains("CEP") || path.to_string_lossy().contains("extensions"));
}

#[test]
fn test_install_premiere_extension_idempotent() {
    let res = cep_installer::install_premiere_extension();
    assert!(res.is_ok());
    assert!(cep_installer::is_premiere_extension_installed());
}
