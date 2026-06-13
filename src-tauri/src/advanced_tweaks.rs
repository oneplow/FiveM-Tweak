use std::os::windows::process::CommandExt;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[link(name = "user32")]
extern "system" {
    fn SystemParametersInfoA(
        uiAction: u32,
        uiParam: u32,
        pvParam: *mut std::ffi::c_void,
        fWinIni: u32,
    ) -> i32;
}

const SPI_GETMOUSE: u32 = 0x0003;
const SPI_SETMOUSE: u32 = 0x0004;
const SPIF_UPDATEINIFILE: u32 = 0x0001;
const SPIF_SENDCHANGE: u32 = 0x0002;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GAME DVR & XBOX BACKGROUND RECORDING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[tauri::command]
pub fn toggle_game_dvr(enable: bool) -> (bool, String) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut success = true;
    let mut errors = Vec::new();

    let val = if enable { 1u32 } else { 0u32 };

    if let Ok(key) = hkcu.open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\GameDVR", KEY_WRITE) {
        if let Err(e) = key.set_value("AppCaptureEnabled", &val) {
            success = false;
            errors.push(format!("AppCaptureEnabled: {}", e));
        }
    } else {
        success = false;
        errors.push("Could not open GameDVR key".to_string());
    }

    if let Ok(key) = hkcu.open_subkey_with_flags(r"System\GameConfigStore", KEY_WRITE) {
        if let Err(e) = key.set_value("GameDVR_Enabled", &val) {
            success = false;
            errors.push(format!("GameDVR_Enabled: {}", e));
        }
    } else {
        success = false;
        errors.push("Could not open GameConfigStore key".to_string());
    }

    if success {
        (true, format!("GameDVR {}", if enable { "enabled" } else { "disabled" }))
    } else {
        (false, errors.join(" | "))
    }
}

#[tauri::command]
pub fn get_game_dvr_status() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(r"System\GameConfigStore")
        .and_then(|key| key.get_value::<u32, _>("GameDVR_Enabled"))
        .unwrap_or(1) == 1
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FULLSCREEN OPTIMIZATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[tauri::command]
pub fn disable_fso_for_fivem(fivem_path: String) -> (bool, String) {
    if fivem_path.is_empty() {
        return (false, "FiveM path is empty".to_string());
    }

    // Usually the actual game process is FiveM_GTAProcess.exe or GTA5.exe inside the application data folder
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let layers_path = r"Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers";
    
    // Create or open the Layers key
    let key = match hkcu.create_subkey_with_flags(layers_path, KEY_WRITE) {
        Ok((key, _)) => key,
        Err(e) => return (false, format!("Failed to open AppCompatFlags: {}", e)),
    };

    // Construct common paths based on the fivem_path
    // E.g. if path is ...\FiveM.exe, the app data is usually ...\FiveM.app
    let path_obj = std::path::Path::new(&fivem_path);
    if let Some(parent) = path_obj.parent() {
        let app_dir = parent.join("FiveM.app");
        let process_names = vec!["FiveM_GTAProcess.exe", "GTA5.exe", "FiveM_b2699_GTAProcess.exe", "FiveM_b2802_GTAProcess.exe", "FiveM.exe"];
        
        let mut count = 0;
        for name in process_names {
            let full_exe = if name == "FiveM.exe" {
                fivem_path.clone()
            } else {
                app_dir.join(name).to_string_lossy().to_string()
            };
            let _ = key.set_value(&full_exe, &"~ DISABLEDXMAXIMIZEDWINDOWEDMODE");
            count += 1;
        }
        (true, format!("Disabled FSO for {} related executables.", count))
    } else {
        (false, "Invalid FiveM path directory".to_string())
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MOUSE ACCELERATION (Enhance Pointer Precision)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[tauri::command]
pub fn toggle_mouse_acceleration(enable: bool) -> (bool, String) {
    let mut mouse_params: [i32; 3] = [0, 0, 0];
    
    unsafe {
        // Get current params
        SystemParametersInfoA(
            SPI_GETMOUSE,
            0,
            mouse_params.as_mut_ptr() as *mut std::ffi::c_void,
            0,
        );

        // Param 2 is the acceleration toggle (1 = on, 0 = off)
        mouse_params[2] = if enable { 1 } else { 0 };

        // Set new params
        let result = SystemParametersInfoA(
            SPI_SETMOUSE,
            0,
            mouse_params.as_mut_ptr() as *mut std::ffi::c_void,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
        );

        if result != 0 {
            (true, format!("Mouse acceleration {}", if enable { "enabled" } else { "disabled" }))
        } else {
            (false, "Failed to call SystemParametersInfoA".to_string())
        }
    }
}

#[tauri::command]
pub fn get_mouse_acceleration_status() -> bool {
    let mut mouse_params: [i32; 3] = [0, 0, 0];
    unsafe {
        SystemParametersInfoA(
            SPI_GETMOUSE,
            0,
            mouse_params.as_mut_ptr() as *mut std::ffi::c_void,
            0,
        );
    }
    mouse_params[2] != 0
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CORE PARKING (Unpark CPU Cores)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[tauri::command]
pub fn toggle_core_parking(unpark: bool) -> (bool, String) {
    // 100 = unpark all cores (100% minimum active)
    // 0 = allow all cores to park (0% minimum active - default Windows behavior on balanced)
    let val = if unpark { "100" } else { "0" };

    let _ = Command::new("powercfg")
        .args(["-setacvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "CPMINCORES", val])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let _ = Command::new("powercfg")
        .args(["-setdcvalueindex", "SCHEME_CURRENT", "SUB_PROCESSOR", "CPMINCORES", val])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let result = Command::new("powercfg")
        .args(["-setactive", "SCHEME_CURRENT"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match result {
        Ok(out) if out.status.success() => {
            (true, format!("Core parking {}", if unpark { "disabled (100% active)" } else { "restored to default" }))
        }
        Ok(out) => {
            (false, format!("Failed: {}", String::from_utf8_lossy(&out.stderr)))
        }
        Err(e) => (false, format!("Command error: {}", e)),
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MSI MODE UTILITY (Launch External App)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

#[tauri::command]
pub fn launch_msi_utility(app_handle: tauri::AppHandle) -> (bool, String) {
    use tauri::Manager;
    

    let resource_dir = match app_handle.path().resource_dir() {
        Ok(dir) => dir,
        Err(_) => return (false, "Could not locate resources directory".to_string()),
    };

    // Look for MSI Mode Utility in resources directory
    let msi_path = resource_dir.join("resources").join("Msi_Utility_v3.exe");
    
    // Check alternative name if first doesn't exist
    let path_to_use = if msi_path.exists() {
        msi_path
    } else {
        let alt_path = resource_dir.join("resources").join("MSI_util_v3.exe");
        if alt_path.exists() {
            alt_path
        } else {
            return (false, "MSI Mode Utility.exe not found in resources folder. Please put it there first.".to_string());
        }
    };

    let result = Command::new(&path_to_use)
        .spawn();

    match result {
        Ok(_) => (true, "MSI Mode Utility launched successfully.".to_string()),
        Err(e) => (false, format!("Failed to launch MSI Mode Utility: {}", e)),
    }
}
