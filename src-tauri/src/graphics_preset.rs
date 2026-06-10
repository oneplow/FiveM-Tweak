use std::fs;
use std::path::{Path, PathBuf};

/// Returns the path to the FiveM CitizenFX.ini if it exists
fn find_fivem_config() -> Option<PathBuf> {
    let local = std::env::var("LOCALAPPDATA").ok()?;
    let cfg = Path::new(&local)
        .join("FiveM")
        .join("FiveM.app")
        .join("CitizenFX.ini");
    if cfg.exists() { Some(cfg) } else { None }
}

/// Returns all GTA V settings.xml files (Documents\Rockstar Games\GTA V\)
fn find_gta_settings() -> Vec<PathBuf> {
    let docs = match std::env::var("USERPROFILE") {
        Ok(p) => p,
        Err(_) => return vec![],
    };
    let base = Path::new(&docs)
        .join("Documents")
        .join("Rockstar Games")
        .join("GTA V");
    if !base.exists() {
        return vec![];
    }

    let mut paths = Vec::new();
    let settings = base.join("settings.xml");
    if settings.exists() {
        paths.push(settings);
    }
    paths
}

fn backup_file(path: &Path) {
    let backup = PathBuf::from(format!("{}.hd_backup", path.display()));
    if !backup.exists() {
        if let Err(e) = fs::copy(path, &backup) {
            log::error!("Failed to backup {:?}: {}", path, e);
        }
    }
}

#[tauri::command]
pub fn apply_graphics_preset(preset_file: String) -> (bool, String) {
    let gta_paths = find_gta_settings();
    let fivem_cfg = find_fivem_config();

    if gta_paths.is_empty() && fivem_cfg.is_none() {
        return (
            false,
            "Could not find GTA V settings or FiveM config. Launch GTA V / FiveM at least once first."
                .to_string(),
        );
    }

    let preset = Path::new(&preset_file);
    if !preset.exists() {
        return (false, format!("Preset file not found: {}", preset_file));
    }

    let mut applied = 0;
    for settings_path in &gta_paths {
        backup_file(settings_path);
        if fs::copy(preset, settings_path).is_ok() {
            applied += 1;
        }
    }

    (
        true,
        format!("Graphics preset applied to {} config(s)", applied),
    )
}

#[tauri::command]
pub fn restore_graphics() -> (bool, String) {
    let gta_paths = find_gta_settings();
    if gta_paths.is_empty() {
        return (false, "Could not find any GTA V settings.xml".to_string());
    }

    let mut restored = 0;
    for settings_path in &gta_paths {
        let backup = PathBuf::from(format!("{}.hd_backup", settings_path.display()));
        if backup.exists() {
            if fs::copy(&backup, settings_path).is_ok() {
                restored += 1;
            }
        }
    }

    if restored == 0 {
        (false, "No backups found. Cannot restore.".to_string())
    } else {
        (
            true,
            format!("Restored {} config(s)", restored),
        )
    }
}
