use std::path::PathBuf;
use std::process::Command;
use std::os::windows::process::CommandExt;

const SETTING_AA_TRANSPARENCY_SS: u32 = 0x10D48A85;
const SETTING_AUTO_LOD_BIAS: u32 = 0x00638E8F;
const SETTING_LOD_BIAS: u32 = 0x00738E8F;
const SETTING_TEXTURE_QUALITY: u32 = 0x00D55F7D;
const SETTING_NEGATIVE_LOD_BIAS: u32 = 0x0019BB68;

fn lod_preset_value(key: &str) -> Option<u32> {
    match key {
        "safe" => Some(0x00000000),
        "low" => Some(0x00000008),
        "medium" => Some(0x00000010),
        "balanced" => Some(0x00000018),
        "high" => Some(0x00000020),
        "performance" => Some(0x00000028),
        "extreme" => Some(0x00000036),
        "potato" => Some(0x00000048),
        _ => None,
    }
}

fn aa_preset_value(key: &str) -> u32 {
    match key {
        "2x" => 0x00000008,
        "4x" => 0x00000010,
        "8x" => 0x00000020,
        _ => 0x00000000, // off
    }
}

fn tex_quality_value(key: &str) -> u32 {
    match key {
        "high_performance" => 0x00000020,
        "performance" => 0x00000010,
        "quality" => 0x00000001,
        "high_quality" => 0x00000000,
        _ => 0x00000001, // default quality
    }
}

fn neg_lod_value(key: &str) -> u32 {
    match key {
        "clamp" => 0x00000001,
        "allow" => 0x00000000,
        _ => 0x00000000,
    }
}

/// Escape a string for use inside PowerShell single-quoted strings
fn ps_escape(s: &str) -> String {
    s.replace('\'', "''")
}

fn get_npi_exe(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::Manager;

    // Candidate paths to search
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1. Tauri resource_dir (production builds)
    //    resource_dir() returns the root of bundled resources, so the file is at:
    //    <resource_dir>/bin/npi/nvidiaProfileInspector.exe
    if let Ok(res) = app_handle.path().resource_dir() {
        // Primary: direct path (resource_dir already includes the resources folder)
        candidates.push(res.join("bin").join("npi").join("nvidiaProfileInspector.exe"));
        // Fallback: in case Tauri doesn't resolve into the resources subfolder
        candidates.push(res.join("resources").join("bin").join("npi").join("nvidiaProfileInspector.exe"));
    }

    // 2. Dev mode: relative to current exe → target/debug/ → go up to src-tauri/
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // target/debug/exe → ../../resources/...
            candidates.push(exe_dir.join("..").join("..").join("resources").join("bin").join("npi").join("nvidiaProfileInspector.exe"));
            // target/debug/exe → ../../../src-tauri/resources/...
            candidates.push(exe_dir.join("..").join("..").join("..").join("src-tauri").join("resources").join("bin").join("npi").join("nvidiaProfileInspector.exe"));
        }
    }

    // 3. Dev mode: relative to CARGO_MANIFEST_DIR (set at compile time)
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    candidates.push(PathBuf::from(manifest_dir).join("resources").join("bin").join("npi").join("nvidiaProfileInspector.exe"));

    // Log all candidates for debugging
    for (i, p) in candidates.iter().enumerate() {
        log::debug!("NPI candidate {}: {:?} (exists={})", i, p, p.exists());
    }

    // Return the first candidate that actually exists on disk
    for p in &candidates {
        let canonical = std::fs::canonicalize(p).unwrap_or_else(|_| p.clone());
        if canonical.exists() {
            log::info!("NPI found at: {:?}", canonical);
            return Some(canonical);
        }
    }

    log::error!("NPI executable not found in any candidate path");
    None
}

/// Build a NPI-compatible XML profile string for GTA V / FiveM
fn build_profile_xml(aa_val: u32, auto_val: u32, lod_value: u32, tex_qual_val: u32, neg_lod_val: u32) -> String {
    format!(
        r#"<?xml version="1.0" encoding="utf-16"?>
<ArrayOfProfile>
  <Profile>
    <ProfileName>Grand Theft Auto V</ProfileName>
    <Executeables>
      <string>GTA5.exe</string>
      <string>FiveM.exe</string>
      <string>FiveM_GTAProcess.exe</string>
      <string>FiveM_b2699_GTAProcess.exe</string>
    </Executeables>
    <Settings>
      <ProfileSetting>
        <SettingNameInfo> </SettingNameInfo>
        <SettingID>0x{aa_id:08X}</SettingID>
        <SettingValue>0x{aa_val:08X}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
      <ProfileSetting>
        <SettingNameInfo> </SettingNameInfo>
        <SettingID>0x{auto_id:08X}</SettingID>
        <SettingValue>0x{auto_val:08X}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
      <ProfileSetting>
        <SettingNameInfo> </SettingNameInfo>
        <SettingID>0x{lod_id:08X}</SettingID>
        <SettingValue>0x{lod_val:08X}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
      <ProfileSetting>
        <SettingNameInfo> </SettingNameInfo>
        <SettingID>0x{tex_qual_id:08X}</SettingID>
        <SettingValue>0x{tex_qual_val:08X}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
      <ProfileSetting>
        <SettingNameInfo> </SettingNameInfo>
        <SettingID>0x{neg_lod_id:08X}</SettingID>
        <SettingValue>0x{neg_lod_val:08X}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
    </Settings>
  </Profile>
</ArrayOfProfile>"#,
        aa_id = SETTING_AA_TRANSPARENCY_SS,
        aa_val = aa_val,
        auto_id = SETTING_AUTO_LOD_BIAS,
        auto_val = auto_val,
        lod_id = SETTING_LOD_BIAS,
        lod_val = lod_value,
        tex_qual_id = SETTING_TEXTURE_QUALITY,
        tex_qual_val = tex_qual_val,
        neg_lod_id = SETTING_NEGATIVE_LOD_BIAS,
        neg_lod_val = neg_lod_val,
    )
}

#[tauri::command]
pub fn apply_nvidia_profile(app_handle: tauri::AppHandle, lod_key: String, aa_key: String, tex_qual_key: String, neg_lod_key: String) -> (bool, String) {
    let lod_key = lod_key.to_lowercase();
    let aa_key = aa_key.to_lowercase();
    let tex_qual_key = tex_qual_key.to_lowercase();
    let neg_lod_key = neg_lod_key.to_lowercase();

    let (aa_val, auto_val, lod_value, tex_qual_val, neg_lod_val) = if lod_key == "restore" {
        // Defaults: AA off, Auto LOD allow, LOD 0, Texture Quality Quality, Negative LOD Allow
        (0x00000000, 0x00000001, 0x00000000, 0x00000001, 0x00000000)
    } else {
        match lod_preset_value(&lod_key) {
            Some(v) => (aa_preset_value(&aa_key), 0x00000000, v, tex_quality_value(&tex_qual_key), neg_lod_value(&neg_lod_key)),
            None => return (false, format!("Unknown preset: {}", lod_key)),
        }
    };

    let npi_exe = match get_npi_exe(&app_handle) {
        Some(p) => p,
        None => return (false, "NPI executable not found".to_string()),
    };

    // Write a temporary XML profile
    let xml = build_profile_xml(aa_val, auto_val, lod_value, tex_qual_val, neg_lod_val);
    let temp_dir = std::env::temp_dir();
    let xml_path = temp_dir.join("fivemtweak_npi_profile.xml");

    // NPI expects UTF-16 LE with BOM
    use std::io::Write;
    let utf16_bytes: Vec<u8> = {
        let mut buf = vec![0xFF, 0xFE]; // UTF-16 LE BOM
        for c in xml.encode_utf16() {
            buf.push(c as u8);
            buf.push((c >> 8) as u8);
        }
        buf
    };

    if let Err(e) = std::fs::File::create(&xml_path).and_then(|mut f| f.write_all(&utf16_bytes)) {
        return (false, format!("Failed to write temp profile: {}", e));
    }

    let xml_path_str = xml_path.to_string_lossy().to_string();

    // Try running NPI with -import directly
    let cmd_result = Command::new(&npi_exe)
        .args(["-silentImport", &xml_path_str])
        .creation_flags(0x08000000)
        .output();

    // Clean up temp file (best-effort)
    let _ = std::fs::remove_file(&xml_path);

    match cmd_result {
        Ok(output) if output.status.success() => {
            (
                true,
                format!("Applied NVIDIA profile ({}) — success", lod_key),
            )
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let detail = if !stderr.is_empty() { stderr } else if !stdout.is_empty() { stdout } else { format!("exit code: {:?}", output.status.code()) };
            // If it failed, try with elevation
            try_elevated_import(&npi_exe, &xml, &lod_key).unwrap_or_else(|| (false, format!("NPI failed: {}", detail)))
        }
        Err(e) => {
            if e.raw_os_error() == Some(740) {
                try_elevated_import(&npi_exe, &xml, &lod_key)
                    .unwrap_or_else(|| (false, format!("NPI elevation error: {}", e)))
            } else {
                (false, format!("NPI error: {}", e))
            }
        }
    }
}

fn try_elevated_import(npi_exe: &PathBuf, xml: &str, lod_key: &str) -> Option<(bool, String)> {
    // Write XML again for the elevated process
    let temp_dir = std::env::temp_dir();
    let xml_path = temp_dir.join("fivemtweak_npi_profile.xml");

    use std::io::Write;
    let utf16_bytes: Vec<u8> = {
        let mut buf = vec![0xFF, 0xFE];
        for c in xml.encode_utf16() {
            buf.push(c as u8);
            buf.push((c >> 8) as u8);
        }
        buf
    };

    std::fs::File::create(&xml_path).ok()?.write_all(&utf16_bytes).ok()?;

    let exe_escaped = ps_escape(&npi_exe.to_string_lossy());
    let xml_escaped = ps_escape(&xml_path.to_string_lossy());

    let script = format!(
        "Start-Process -FilePath '{}' -ArgumentList '-silentImport','{}' -WindowStyle Hidden -Verb RunAs -Wait",
        exe_escaped, xml_escaped
    );

    let result = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(0x08000000)
        .output();

    let _ = std::fs::remove_file(&xml_path);

    match result {
        Ok(out) if out.status.success() => {
            Some((true, format!("Applied NVIDIA profile ({}) via elevation", lod_key)))
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let detail = if !stderr.is_empty() { &stderr } else if !stdout.is_empty() { &stdout } else { "unknown" };
            Some((false, format!("NPI elevation failed: {}", detail)))
        }
        Err(e) => Some((false, format!("Failed to request elevation: {}", e))),
    }
}

