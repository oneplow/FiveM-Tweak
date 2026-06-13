use std::thread;
use std::time::Duration;
use sysinfo::System;
use tauri::Emitter;
use windows::Win32::System::Threading::{
    GetProcessAffinityMask, OpenProcess, SetPriorityClass, SetProcessAffinityMask,
    HIGH_PRIORITY_CLASS, PROCESS_QUERY_INFORMATION, PROCESS_SET_INFORMATION,
};

use crate::nvidia_profile;
use crate::system_optimizer;

/// Emits a log message to the frontend via Tauri events
fn emit_log(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("director-log", msg.to_string());
    log::info!("[director] {}", msg);
}

pub fn spawn_director_thread(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let mut sys = System::new();
        let mut was_running = false;

        loop {
            // Read config dynamically to catch live toggles
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                .unwrap_or_else(|| std::path::PathBuf::from("."));
            let config_path = exe_dir.join("config.json");

            let mut auto_priority = false;
            let mut auto_affinity = false;
            let mut auto_timer = false;
            let mut auto_standby = false;
            let mut auto_nvidia = false;
            let mut nvidia_lod = String::from("safe");
            let mut nvidia_aa = String::from("off");
            let mut nvidia_tex_qual = String::from("quality");
            let mut nvidia_neg_lod = String::from("allow");

            if let Ok(content) = std::fs::read_to_string(&config_path) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                    auto_priority = v.get("auto_priority").and_then(|v| v.as_bool()).unwrap_or(false);
                    auto_affinity = v.get("auto_affinity").and_then(|v| v.as_bool()).unwrap_or(false);
                    auto_timer = v.get("auto_timer_resolution").and_then(|v| v.as_bool()).unwrap_or(false);
                    auto_standby = v.get("auto_standby_cleaner").and_then(|v| v.as_bool()).unwrap_or(false);
                    auto_nvidia = true; // Always true as requested
                    nvidia_lod = v.get("nvidia_lod_preset").and_then(|v| v.as_str()).unwrap_or("safe").to_string();
                    nvidia_aa = v.get("nvidia_aa_preset").and_then(|v| v.as_str()).unwrap_or("off").to_string();
                    nvidia_tex_qual = v.get("nvidia_tex_quality").and_then(|v| v.as_str()).unwrap_or("quality").to_string();
                    nvidia_neg_lod = v.get("nvidia_neg_lod").and_then(|v| v.as_str()).unwrap_or("allow").to_string();
                }
            }

            // Refresh processes
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

            let game_pids: Vec<u32> = sys.processes().values()
                .filter(|p| {
                    let name = p.name().to_str().unwrap_or("").to_lowercase();
                    name == "fivem.exe" || name == "gta5.exe" || name.ends_with("_gtaprocess.exe")
                })
                .map(|p| p.pid().as_u32())
                .collect();

            let is_running = !game_pids.is_empty();

            // ── State transition: game just started ──
            if is_running && !was_running {
                emit_log(&app_handle, "🎮 FiveM detected — applying auto-optimizations...");

                // 1. NVIDIA Profile (one-shot)
                if auto_nvidia {
                    emit_log(&app_handle, &format!("🔧 Applying NVIDIA profile ({})...", nvidia_lod));
                    let (ok, msg) = nvidia_profile::apply_nvidia_profile(app_handle.clone(), nvidia_lod.clone(), nvidia_aa.clone(), nvidia_tex_qual.clone(), nvidia_neg_lod.clone());
                    emit_log(&app_handle, &format!("{} {}", if ok { "✓" } else { "✗" }, msg));
                }

                // 2. Timer Resolution (one-shot)
                if auto_timer {
                    emit_log(&app_handle, "⏱ Setting Timer Resolution (0.5ms)...");
                    match system_optimizer::set_timer_resolution(true) {
                        Ok(res) => emit_log(&app_handle, &format!("✓ Timer resolution applied ({:.4} ms)", res as f64 / 10000.0)),
                        Err(e) => emit_log(&app_handle, &format!("✗ Timer failed: {}", e)),
                    }
                }

                // 3. Standby Memory Purge (one-shot)
                if auto_standby {
                    emit_log(&app_handle, "🧹 Purging Standby Memory...");
                    match system_optimizer::purge_standby_list() {
                        Ok(()) => emit_log(&app_handle, "✓ Standby memory purged"),
                        Err(e) => emit_log(&app_handle, &format!("✗ Purge failed: {}", e)),
                    }
                }

                emit_log(&app_handle, "✅ Auto-optimization complete — enjoy your game!");
            }

            // ── State transition: game just closed ──
            if !is_running && was_running {
                emit_log(&app_handle, "🛑 FiveM closed — restoring settings...");

                if auto_nvidia {
                    emit_log(&app_handle, "🔧 Restoring NVIDIA profile...");
                    let (ok, msg) = nvidia_profile::apply_nvidia_profile(app_handle.clone(), "restore".to_string(), "off".to_string(), "quality".to_string(), "allow".to_string());
                    emit_log(&app_handle, &format!("{} {}", if ok { "✓" } else { "✗" }, msg));
                }

                if auto_timer {
                    emit_log(&app_handle, "⏱ Restoring Timer Resolution...");
                    match system_optimizer::set_timer_resolution(false) {
                        Ok(_) => emit_log(&app_handle, "✓ Timer resolution restored"),
                        Err(e) => emit_log(&app_handle, &format!("✗ Restore failed: {}", e)),
                    }
                }

                emit_log(&app_handle, "✅ System restored to normal state.");
            }

            // ── Continuous checking (Priority & Affinity) ──
            if is_running {
                if auto_priority || auto_affinity {
                    unsafe {
                        for pid in &game_pids {
                            if let Ok(handle) = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_INFORMATION, false, *pid) {
                                if auto_priority {
                                    let _ = SetPriorityClass(handle, HIGH_PRIORITY_CLASS);
                                }
                                if auto_affinity {
                                    let mut pmask = 0;
                                    let mut smask = 0;
                                    if GetProcessAffinityMask(handle, &mut pmask, &mut smask).is_ok() {
                                        let mask_no_core0 = smask & !1;
                                        if mask_no_core0 != 0 {
                                            let _ = SetProcessAffinityMask(handle, mask_no_core0);
                                        }
                                    }
                                }
                                let _ = windows::Win32::Foundation::CloseHandle(handle);
                            }
                        }
                    }
                }
            }

            was_running = is_running;
            thread::sleep(Duration::from_secs(4));
        }
    });
}
