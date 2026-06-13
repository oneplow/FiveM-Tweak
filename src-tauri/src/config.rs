use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub game_path: String,
    #[serde(default = "default_true")]
    pub minimize_to_tray: bool,
    #[serde(default = "default_lang")]
    pub language: String,
    #[serde(default)]
    pub custom_width: String,
    #[serde(default)]
    pub custom_height: String,
    #[serde(default)]
    pub last_resolution: String,
    #[serde(default)]
    pub gpu_override: String,
    #[serde(default)]
    pub welcome_shown: bool,
    #[serde(default)]
    pub auto_timer_resolution: bool,
    #[serde(default)]
    pub auto_standby_cleaner: bool,
    #[serde(default)]
    pub auto_priority: bool,
    #[serde(default)]
    pub auto_affinity: bool,
    #[serde(default)]
    pub auto_nvidia_profile: bool,
    #[serde(default = "default_lod")]
    pub nvidia_lod_preset: String,
    #[serde(default = "default_aa")]
    pub nvidia_aa_preset: String,
    #[serde(default = "default_tex_qual")]
    pub nvidia_tex_quality: String,
    #[serde(default = "default_neg_lod")]
    pub nvidia_neg_lod: String,
}

fn default_aa() -> String { "off".to_string() }
fn default_tex_qual() -> String { "quality".to_string() }
fn default_neg_lod() -> String { "allow".to_string() }

fn default_true() -> bool {
    true
}

fn default_lang() -> String {
    "th".to_string()
}

fn default_lod() -> String {
    "safe".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            game_path: String::new(),
            minimize_to_tray: true,
            language: "th".to_string(),
            custom_width: String::new(),
            custom_height: String::new(),
            last_resolution: String::new(),
            gpu_override: "auto".to_string(),
            welcome_shown: false,
            auto_timer_resolution: false,
            auto_standby_cleaner: false,
            auto_priority: false,
            auto_affinity: false,
            auto_nvidia_profile: false,
            nvidia_lod_preset: "safe".to_string(),
            nvidia_aa_preset: "off".to_string(),
            nvidia_tex_quality: "quality".to_string(),
            nvidia_neg_lod: "allow".to_string(),
        }
    }
}

pub struct ConfigState(pub Mutex<AppConfig>);

fn config_path() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    exe_dir.join("config.json")
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => AppConfig::default(),
        }
    } else {
        let config = AppConfig::default();
        save_config(&config);
        config
    }
}

pub fn save_config(config: &AppConfig) {
    let path = config_path();
    match serde_json::to_string_pretty(config) {
        Ok(json) => {
            if let Err(e) = fs::write(&path, json) {
                log::error!("Failed to save config to {:?}: {}", path, e);
            }
        }
        Err(e) => log::error!("Failed to serialize config: {}", e),
    }
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, ConfigState>) -> AppConfig {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn update_config(state: tauri::State<'_, ConfigState>, config: AppConfig) {
    save_config(&config);
    *state.0.lock().unwrap() = config;
}

#[tauri::command]
pub fn update_config_field(state: tauri::State<'_, ConfigState>, key: String, value: String) {
    let mut config = state.0.lock().unwrap();
    match key.as_str() {
        "game_path" => config.game_path = value,
        "minimize_to_tray" => config.minimize_to_tray = value == "true",
        "language" => config.language = value,
        "custom_width" => config.custom_width = value,
        "custom_height" => config.custom_height = value,
        "last_resolution" => config.last_resolution = value,
        "gpu_override" => config.gpu_override = value,
        "welcome_shown" => config.welcome_shown = value == "true",
        "auto_timer_resolution" => config.auto_timer_resolution = value == "true",
        "auto_standby_cleaner" => config.auto_standby_cleaner = value == "true",
        "auto_priority" => config.auto_priority = value == "true",
        "auto_affinity" => config.auto_affinity = value == "true",
        "auto_nvidia_profile" => config.auto_nvidia_profile = value == "true",
        "nvidia_lod_preset" => config.nvidia_lod_preset = value,
        _ => {}
    }
    save_config(&config);
}
