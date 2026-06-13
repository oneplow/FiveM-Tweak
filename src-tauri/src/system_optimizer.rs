#![allow(non_snake_case)]
use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[link(name = "ntdll")]
extern "system" {
    fn NtSetTimerResolution(
        DesiredResolution: u32,
        SetResolution: u8,
        CurrentResolution: *mut u32,
    ) -> i32;
}

/// Applies a 0.5ms Timer Resolution natively via NtSetTimerResolution
#[tauri::command]
pub fn set_timer_resolution(enable: bool) -> Result<u32, String> {
    let mut current_res: u32 = 0;
    let status;

    unsafe {
        // Enforce 0.5000 ms resolution (5000 100-ns intervals)
        let requested_res = if enable { 5000 } else { 0 };
        let set_flag = if enable { 1 } else { 0 };
        
        status = NtSetTimerResolution(requested_res, set_flag, &mut current_res);
    }

    if status >= 0 {
        Ok(current_res)
    } else {
        Err(format!("NtSetTimerResolution failed with status: {:#X}", status))
    }
}

/// Runs a memory purge to clear the Windows Standby List (similar to ISLC)
#[tauri::command]
pub fn purge_standby_list() -> Result<(), String> {
    let ps_script = r#"
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MemClean {
            [DllImport("ntdll.dll")]
            public static extern int NtSetSystemInformation(int SystemInformationClass, IntPtr SystemInformation, int SystemInformationLength);

            [DllImport("advapi32.dll", SetLastError = true)]
            public static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

            [DllImport("advapi32.dll", SetLastError = true)]
            public static extern bool LookupPrivilegeValue(string lpSystemName, string lpName, out LUID lpLuid);

            [DllImport("advapi32.dll", SetLastError = true)]
            public static extern bool AdjustTokenPrivileges(IntPtr TokenHandle, bool DisableAllPrivileges, ref TOKEN_PRIVILEGES NewState, uint BufferLength, IntPtr PreviousState, IntPtr ReturnLength);

            public struct LUID { public uint LowPart; public int HighPart; }
            public struct TOKEN_PRIVILEGES { public uint PrivilegeCount; public LUID Luid; public uint Attributes; }

            public static void Run() {
                IntPtr token;
                OpenProcessToken(System.Diagnostics.Process.GetCurrentProcess().Handle, 0x0020 | 0x0008, out token);
                
                TOKEN_PRIVILEGES tp = new TOKEN_PRIVILEGES();
                tp.PrivilegeCount = 1;
                tp.Attributes = 2; // SE_PRIVILEGE_ENABLED
                LookupPrivilegeValue(null, "SeProfileSingleProcessPrivilege", out tp.Luid);
                AdjustTokenPrivileges(token, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero);

                int cmd = 4; // MemoryPurgeStandbyList
                IntPtr ptr = Marshal.AllocHGlobal(4);
                Marshal.WriteInt32(ptr, cmd);
                NtSetSystemInformation(80, ptr, 4);
                Marshal.FreeHGlobal(ptr);
            }
        }
"@
        [MemClean]::Run()
    "#;

    let child = Command::new("powershell")
        .args(&["-NoProfile", "-NonInteractive", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match child {
        Ok(out) => {
            if out.status.success() { Ok(()) }
            else { Err(format!("Failed to purge standby list: {:?}", String::from_utf8_lossy(&out.stderr))) }
        }
        Err(e) => Err(format!("Failed to run empty standby command: {}", e)),
    }
}

use serde::Serialize;
use sysinfo::{System, CpuRefreshKind, RefreshKind, Disks, MemoryRefreshKind};

#[derive(Serialize)]
pub struct SystemInfoData {
    pub cpu: String,
    pub ram_total: f64,
    pub ram_avail: f64,
    pub os: String,
    pub storage_total: f64,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfoData {
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_cpu_all();
    sys.refresh_memory();
    
    let cpu = if let Some(cpu) = sys.cpus().first() {
        cpu.brand().trim().to_string()
    } else {
        "Unknown CPU".to_string()
    };
    
    let ram_total = sys.total_memory() as f64 / 1_073_741_824.0;
    let ram_avail = sys.available_memory() as f64 / 1_073_741_824.0;
    
    let os = System::long_os_version().unwrap_or_else(|| "Unknown Windows Version".to_string());
    
    let disks = Disks::new_with_refreshed_list();
    let mut storage_total = 0.0;
    for disk in &disks {
        storage_total += disk.total_space() as f64 / 1_073_741_824.0;
    }

    SystemInfoData {
        cpu,
        ram_total,
        ram_avail,
        os,
        storage_total,
    }
}
