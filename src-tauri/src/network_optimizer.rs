use std::os::windows::process::CommandExt;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ═══════════════════════════════════════════════
//  NETWORK / TCP OPTIMIZATION
// ═══════════════════════════════════════════════

/// Disables Nagle's Algorithm (TCPNoDelay + TcpAckFrequency) for all network interfaces
/// This reduces network latency significantly for online games
#[tauri::command]
pub fn apply_network_tweaks() -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Path to network interfaces
    let interfaces_path = r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces";
    let interfaces_key = match hklm.open_subkey_with_flags(interfaces_path, KEY_READ) {
        Ok(k) => k,
        Err(e) => return (false, format!("Cannot open network interfaces registry: {}", e)),
    };

    let mut count = 0;
    let mut errors: Vec<String> = Vec::new();

    for iface_name in interfaces_key.enum_keys().filter_map(|k| k.ok()) {
        let iface_path = format!("{}\\{}", interfaces_path, iface_name);
        match hklm.open_subkey_with_flags(&iface_path, KEY_READ | KEY_WRITE) {
            Ok(iface_key) => {
                // Check if this interface has an IP address (skip inactive ones)
                let has_ip: bool = iface_key
                    .get_value::<String, _>("DhcpIPAddress")
                    .map(|ip| !ip.is_empty() && ip != "0.0.0.0")
                    .unwrap_or(false)
                    || iface_key
                        .get_value::<String, _>("IPAddress")
                        .map(|ip| !ip.is_empty() && ip != "0.0.0.0")
                        .unwrap_or(false);

                if !has_ip {
                    continue;
                }

                // TcpAckFrequency = 1 (ACK every packet immediately)
                if let Err(e) = iface_key.set_value("TcpAckFrequency", &1u32) {
                    errors.push(format!("TcpAckFrequency: {}", e));
                }
                // TCPNoDelay = 1 (Disable Nagle's algorithm)
                if let Err(e) = iface_key.set_value("TCPNoDelay", &1u32) {
                    errors.push(format!("TCPNoDelay: {}", e));
                }
                count += 1;
            }
            Err(_) => continue,
        }
    }

    // Also set NetworkThrottlingIndex to disable multimedia throttling
    let mmcss_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile";
    match hklm.open_subkey_with_flags(mmcss_path, KEY_READ | KEY_WRITE) {
        Ok(mmcss_key) => {
            // 0xFFFFFFFF = disable throttling entirely
            if let Err(e) = mmcss_key.set_value("NetworkThrottlingIndex", &0xFFFFFFFFu32) {
                errors.push(format!("NetworkThrottlingIndex: {}", e));
            }
            // SystemResponsiveness = 0 (give all resources to games)
            if let Err(e) = mmcss_key.set_value("SystemResponsiveness", &0u32) {
                errors.push(format!("SystemResponsiveness: {}", e));
            }
        }
        Err(e) => errors.push(format!("MMCSS key: {}", e)),
    }

    if !errors.is_empty() {
        (false, format!("Applied to {} interfaces but had errors: {}", count, errors.join("; ")))
    } else if count == 0 {
        (false, "No active network interfaces found".to_string())
    } else {
        // Restart network adapters to apply changes instantly
        let ps_script = "Disable-NetAdapter -Name * -Physical -Confirm:$false; Start-Sleep -Seconds 1; Enable-NetAdapter -Name * -Physical -Confirm:$false";
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_script])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        (true, format!("Network optimized ({} interfaces). Connection restarted to apply changes instantly.", count))
    }
}

/// Restores network settings to Windows defaults
#[tauri::command]
pub fn restore_network_tweaks() -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let interfaces_path = r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces";

    let interfaces_key = match hklm.open_subkey_with_flags(interfaces_path, KEY_READ) {
        Ok(k) => k,
        Err(e) => return (false, format!("Cannot open registry: {}", e)),
    };

    let mut count = 0;
    for iface_name in interfaces_key.enum_keys().filter_map(|k| k.ok()) {
        let iface_path = format!("{}\\{}", interfaces_path, iface_name);
        if let Ok(iface_key) = hklm.open_subkey_with_flags(&iface_path, KEY_READ | KEY_WRITE) {
            let _ = iface_key.delete_value("TcpAckFrequency");
            let _ = iface_key.delete_value("TCPNoDelay");
            count += 1;
        }
    }

    // Restore MMCSS defaults
    let mmcss_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile";
    if let Ok(mmcss_key) = hklm.open_subkey_with_flags(mmcss_path, KEY_READ | KEY_WRITE) {
        let _ = mmcss_key.set_value("NetworkThrottlingIndex", &10u32);
        let _ = mmcss_key.set_value("SystemResponsiveness", &20u32);
    }

    // Restart network adapters to apply changes instantly
    let ps_script = "Disable-NetAdapter -Name * -Physical -Confirm:$false; Start-Sleep -Seconds 1; Enable-NetAdapter -Name * -Physical -Confirm:$false";
    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    (true, format!("Network settings restored to defaults ({} interfaces). Connection restarted.", count))
}

// ═══════════════════════════════════════════════
//  POWER PLAN
// ═══════════════════════════════════════════════

/// Switches to High Performance or Ultimate Performance power plan
#[tauri::command]
pub fn set_power_plan(mode: String) -> (bool, String) {
    let guid = match mode.as_str() {
        "ultimate" => {
            let mut found_guid = None;
            // Check if Ultimate Performance already exists to avoid making duplicates
            if let Ok(out) = Command::new("powercfg").args(["-l"]).creation_flags(CREATE_NO_WINDOW).output() {
                let output_str = String::from_utf8_lossy(&out.stdout);
                for line in output_str.lines() {
                    if line.contains("Ultimate Performance") {
                        if let Some(start) = line.find("GUID: ") {
                            let guid_start = start + 6;
                            if let Some(end) = line[guid_start..].find(' ') {
                                found_guid = Some(line[guid_start..guid_start + end].to_string());
                                break;
                            }
                        }
                    }
                }
            }
            
            if let Some(g) = found_guid {
                g
            } else {
                // If not found, duplicate the hidden Ultimate Performance plan
                let mut new_guid = "e9a42b02-d5df-448d-aa00-03f14749eb61".to_string(); // fallback
                if let Ok(out) = Command::new("powercfg")
                    .args(["-duplicatescheme", "e9a42b02-d5df-448d-aa00-03f14749eb61"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output()
                {
                    let output_str = String::from_utf8_lossy(&out.stdout);
                    if let Some(start) = output_str.find("GUID: ") {
                        let guid_start = start + 6;
                        if let Some(end) = output_str[guid_start..].find(' ') {
                            new_guid = output_str[guid_start..guid_start + end].to_string();
                        }
                    }
                }
                new_guid
            }
        }
        "high" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".to_string(),
        "balanced" | "restore" => "381b4222-f694-41f0-9685-ff5bb260df2e".to_string(),
        _ => return (false, format!("Unknown power plan: {}", mode)),
    };

    let result = Command::new("powercfg")
        .args(["-setactive", &guid])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match result {
        Ok(out) if out.status.success() => {
            let label = match mode.as_str() {
                "ultimate" => "Ultimate Performance",
                "high" => "High Performance",
                _ => "Balanced (Default)",
            };
            (true, format!("Power plan set to: {}", label))
        }
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
            (false, format!("Failed to set power plan: {}", if err.is_empty() { "unknown error" } else { &err }))
        }
        Err(e) => (false, format!("powercfg error: {}", e)),
    }
}

/// Gets the currently active power plan name
#[tauri::command]
pub fn get_active_power_plan() -> String {
    let result = Command::new("powercfg")
        .args(["-getactivescheme"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match result {
        Ok(out) if out.status.success() => {
            let output = String::from_utf8_lossy(&out.stdout).trim().to_string();
            // Output format: "Power Scheme GUID: xxx-xxx  (Plan Name)"
            if let Some(start) = output.find('(') {
                if let Some(end) = output.find(')') {
                    return output[start + 1..end].to_string();
                }
            }
            output
        }
        _ => "Unknown".to_string(),
    }
}

// ═══════════════════════════════════════════════
//  GAME MODE & HAGS (Hardware-Accelerated GPU Scheduling)
// ═══════════════════════════════════════════════

/// Gets the current state of Game Mode and HAGS
#[tauri::command]
pub fn get_windows_gaming_features() -> (bool, bool) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Game Mode: HKCU\Software\Microsoft\GameBar
    let game_mode = hkcu
        .open_subkey(r"Software\Microsoft\GameBar")
        .and_then(|key| key.get_value::<u32, _>("AutoGameModeEnabled"))
        .unwrap_or(1) // Default is enabled on modern Windows
        == 1;

    // HAGS: HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers
    let hags = hklm
        .open_subkey(r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers")
        .and_then(|key| key.get_value::<u32, _>("HwSchMode"))
        .unwrap_or(1) // 1 = off, 2 = on
        == 2;

    (game_mode, hags)
}

/// Toggles Windows Game Mode
#[tauri::command]
pub fn set_game_mode(enabled: bool) -> (bool, String) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    match hkcu.open_subkey_with_flags(r"Software\Microsoft\GameBar", KEY_WRITE) {
        Ok(key) => {
            let val: u32 = if enabled { 1 } else { 0 };
            match key.set_value("AutoGameModeEnabled", &val) {
                Ok(_) => (true, format!("Game Mode {}", if enabled { "enabled" } else { "disabled" })),
                Err(e) => (false, format!("Failed to set Game Mode: {}", e)),
            }
        }
        Err(e) => (false, format!("Cannot open GameBar registry: {}", e)),
    }
}

/// Toggles Hardware-Accelerated GPU Scheduling
#[tauri::command]
pub fn set_hags(enabled: bool) -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    match hklm.open_subkey_with_flags(
        r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers",
        KEY_WRITE,
    ) {
        Ok(key) => {
            // HwSchMode: 1 = off, 2 = on
            let val: u32 = if enabled { 2 } else { 1 };
            match key.set_value("HwSchMode", &val) {
                Ok(_) => (
                    true,
                    format!(
                        "HAGS {} (restart required to take effect)",
                        if enabled { "enabled" } else { "disabled" }
                    ),
                ),
                Err(e) => (false, format!("Failed to set HAGS: {}", e)),
            }
        }
        Err(e) => (false, format!("Cannot open GraphicsDrivers registry: {} (try running as admin)", e)),
    }
}
