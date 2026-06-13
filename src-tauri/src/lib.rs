mod config;
mod gpu_detect;
mod game_launcher;
mod stretch;
mod fps_optimizer;
mod graphics_preset;
pub mod nvidia_profile;
pub mod system_optimizer;
mod network_optimizer;
mod advanced_tweaks;
mod process_director;

use config::{load_config, ConfigState};
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ConfigState(std::sync::Mutex::new(initial_config)))
        .invoke_handler(tauri::generate_handler![
            // Config
            config::get_config,
            config::update_config,
            config::update_config_field,
            // GPU
            gpu_detect::get_gpu_info,
            // Game Launcher
            game_launcher::check_fivem_path,
            game_launcher::launch_game,
            game_launcher::check_game_running,
            // Stretch
            stretch::get_resolutions,
            stretch::apply_stretch,
            stretch::revert_stretch,
            stretch::open_nvidia_cp,
            // FPS
            fps_optimizer::run_fps_optimizations,
            // Graphics
            graphics_preset::apply_graphics_preset,
            graphics_preset::restore_graphics,
            // NVIDIA Profile
            nvidia_profile::apply_nvidia_profile,
            // System Optimizer (Timer & Memory)
            system_optimizer::set_timer_resolution,
            system_optimizer::purge_standby_list,
            system_optimizer::get_system_info,
            // Network & Power
            network_optimizer::apply_network_tweaks,
            network_optimizer::restore_network_tweaks,
            network_optimizer::set_power_plan,
            network_optimizer::get_active_power_plan,
            network_optimizer::get_windows_gaming_features,
            network_optimizer::set_game_mode,
            network_optimizer::set_hags,
            // Advanced Tweaks
            advanced_tweaks::toggle_game_dvr,
            advanced_tweaks::get_game_dvr_status,
            advanced_tweaks::disable_fso_for_fivem,
            advanced_tweaks::toggle_mouse_acceleration,
            advanced_tweaks::get_mouse_acceleration_status,
            advanced_tweaks::toggle_core_parking,
            advanced_tweaks::launch_msi_utility,
        ])
        .setup(|app| {
            // ── Logging ──
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) { log::LevelFilter::Debug } else { log::LevelFilter::Warn })
                    .build(),
            )?;

            // ── Tray Menu ──
            let show_item = MenuItem::with_id(app, "show", "เปิดหน้าต่าง / Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "ออกจากโปรแกรม / Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("FiveMTweak")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Window close → hide to tray ──
            let app_handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Read config to check minimize_to_tray
                        let minimize_to_tray = app_handle
                            .try_state::<ConfigState>()
                            .map(|state| state.0.lock().unwrap().minimize_to_tray)
                            .unwrap_or(true);

                        if minimize_to_tray {
                            api.prevent_close();
                            if let Some(win) = app_handle.get_webview_window("main") {
                                let _ = win.hide();
                            }
                        }
                    }
                });
            }

            // ── Background Process Director ──
            process_director::spawn_director_thread(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
