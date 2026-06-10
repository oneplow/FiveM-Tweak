use serde::Serialize;
use std::path::{Path, PathBuf};
use std::os::windows::process::CommandExt;
use std::process::Command;
use sysinfo::System;

const FIVEM_PROCESS: &str = "FiveM.exe";
const GTA5_PROCESS: &str = "GTA5.exe";
const FIVEM_GTA_PROCESS: &str = "FiveM_GTAProcess.exe";

const FIVEM_COMMON_PATHS: &[&str] = &[
    r"C:\FiveM\FiveM.exe",
    r"D:\FiveM\FiveM.exe",
    r"E:\FiveM\FiveM.exe",
    r"C:\Program Files\FiveM\FiveM.exe",
    r"D:\Program Files\FiveM\FiveM.exe",
    r"C:\Program Files (x86)\FiveM\FiveM.exe",
];

#[derive(Debug, Clone, Serialize)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
}

pub fn is_game_running() -> bool {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    sys.processes().values().any(|p| {
        p.name()
            .to_str()
            .map(|n| n.eq_ignore_ascii_case(FIVEM_PROCESS) || n.eq_ignore_ascii_case(GTA5_PROCESS) || n.eq_ignore_ascii_case(FIVEM_GTA_PROCESS))
            .unwrap_or(false)
    })
}

pub fn find_fivem(custom_path: &str) -> Option<String> {
    // 1. User-supplied path
    if !custom_path.is_empty() && Path::new(custom_path).exists() {
        return Some(custom_path.to_string());
    }

    // 2. Check running process
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    for p in sys.processes().values() {
        if p.name().to_str().map(|n| n.eq_ignore_ascii_case(FIVEM_PROCESS)).unwrap_or(false) {
            if let Some(exe) = p.exe() {
                return Some(exe.to_string_lossy().to_string());
            }
        }
    }

    // 3. Check LOCALAPPDATA (default FiveM install location)
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let path = Path::new(&local).join("FiveM").join("FiveM.exe");
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    // 4. Check known common paths
    for path in FIVEM_COMMON_PATHS {
        if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    // 5. Desktop shortcut target via registry (FiveM doesn't have a standard uninstall key, skip)

    None
}

// ── Tauri Commands ──

#[tauri::command]
pub async fn check_fivem_path(custom_path: String) -> LaunchResult {
    match find_fivem(&custom_path) {
        Some(path) => LaunchResult {
            success: true,
            message: path,
        },
        None => LaunchResult {
            success: false,
            message: "FiveM not found".to_string(),
        },
    }
}

#[tauri::command]
pub async fn launch_game(
    game_path: String,
) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();

    // Step 1: Find FiveM
    let fivem_exe = find_fivem(&game_path)
        .ok_or("FiveM not found. Please set the path in settings.")?;
    logs.push(format!("FiveM: {}", fivem_exe));

    // Step 2: Check if already running
    if is_game_running() {
        logs.push("FiveM / GTA V is already running.".to_string());
        return Ok(logs);
    }

    // Step 3: Launch FiveM
    logs.push("Starting FiveM...".to_string());
    Command::new("cmd")
        .args(["/c", "start", "", &fivem_exe])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| format!("Failed to start FiveM: {}", e))?;

    logs.push("FiveM launched successfully".to_string());

    Ok(logs)
}

#[tauri::command]
pub async fn check_game_running() -> bool {
    is_game_running()
}
