use std::path::PathBuf;
use std::process::Command;
use std::os::windows::process::CommandExt;

const SETTING_AA_TRANSPARENCY_SS: u32 = 0x10D48A85;
const SETTING_AUTO_LOD_BIAS: u32 = 0x00638E8F;
const SETTING_LOD_BIAS: u32 = 0x00738E8F;

const AA_MODE_REPLAY_ALL: u32 = 0x00000008;
const AUTO_LOD_BIAS_OFF: u32 = 0x00000000;

fn lod_preset_value(key: &str) -> Option<u32> {
    match key {
        "safe" | "low" => Some(0x00000008),
        "balanced" | "medium" => Some(0x00000010),
        "performance" | "high" => Some(0x00000018),
        "extreme" | "dindommum" => Some(0x00000036),
        _ => None,
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
    if let Ok(res) = app_handle.path().resource_dir() {
        candidates.push(res.join("resources").join("bin").join("npi").join("nvidiaProfileInspector.exe"));
    }

    // 2. Dev mode: relative to current exe â†’ target/debug/ â†’ go up to src-tauri/
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // target/debug/exe â†’ ../../resources/...
            candidates.push(exe_dir.join("..").join("..").
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/**/*"
    ]
  },
  "plugins": {
    "shell": {
      "open": true
    }
  }
}
        $choice = Read-Host " "
        if ($choice -match '^[1-6]$') {
        switch ($choice) {
        1 {

Clear-Host
Write-Host "LOD: Positive"
# revert read only nvdrsdb0.bin
Set-ItemProperty -Path "$env:SystemDrive\ProgramData\NVIDIA Corporation\Drs\nvdrsdb0.bin" -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue | Out-Null
# revert read only nvdrsdb1.bin
Set-ItemProperty -Path "$env:SystemDrive\ProgramData\NVIDIA Corporation\Drs\nvdrsdb1.bin" -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue | Out-Null
# create config for inspector
$MultilineComment = @"
<?xml version="1.0" encoding="utf-16"?>
<ArrayOfProfile>
  <Profile>
    <ProfileName>Base Profile</ProfileName>
    <Executeables />
    <Settings>
      <ProfileSetting>
        <SettingNameInfo> </Se


    // Usually the actual game process is FiveM_GTAProcess.exe or GTA5.exe inside the application data folder
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let layers_path = r"Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers";
    
    // Create or open the Layers key
    let key = match hkcu.create_subkey_with_flags(layers_path, KEY_WRITE) {
        Ok((key, _)) => key,
        Err(e) => return (false, format!("Failed to open AppCompatFlags: {}", e)),
    return 'text-rose-400 font-medium';

  }

  if (lower.includes('success') || lower.includes('ready') || lower.includes('done') || lower.includes('à¹€à¸ªà¸£à¹‡à¸ˆ') || lower.includes('detected') || lower.includes('à¹€à¸ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡') || lower.includes('triggered')) {

    return 'text-emerald-400 font-medium';

  }

        }
        Err(e) => {
            if e.raw_os_error() == Some(740) {
                // OS Error 740: The requested operation requires elevation
                // Build properly escaped PowerShell command
                let exe_escaped = ps_escape(&npi_exe.to_string_lossy());
                let args_str = args.iter()
                    .map(|a| format!("'{}'", ps_escape(a)))
                    .collect::<Vec<_>>()
                    .join(",");

                let script = format!(
                    "Start-Process -FilePath '{}' -ArgumentList {} -WindowStyle Hidden -Verb RunAs -Wait",
                    exe_escaped, args_str
                );

                let elevate_res = Command::new("powershell")
                    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
                    .creation_flags(0x08000000)
                    .output();
        }
        Err(e) => {
            if e.raw_os_error() == Some(740) {
                // OS Error 740: The requested operation requires elevation
                // Build properly escaped PowerShell command
                let exe_escaped = ps_escape(&npi_exe.to_string_lossy());
                let args_str = args.iter()
                    .map(|a| format!("'{}'", ps_escape(a)))
                    .collect::<Vec<_>>()
                    .join(",");

                let script = format!(
                    "Start-Process -FilePath '{}' -ArgumentList {} -WindowStyle Hidden -Verb RunAs -Wait",
                    exe_escaped, args_str
                );

                let elevate_res = Command::new("powershell")
                    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
                    .creation_flags(0x08000000)
                    .output();

                match elevate_res {
                    Ok(out) if out.status.success() => {
                        (true, format!("Applied NVIDIA profile ({}) via elevation", lod_key))
                    }
                    Ok(out) => {
                        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                        let detail = if !stderr.is_empty() { &stderr } else if !stdout.is_empty() { &stdout } else { "unknown" };
                        (false, format!("NPI elevation failed: {}", detail))
                    }
                    Err(e2) => (false, format!("Failed to request elevation: {}", e2)),
                }
            } else {
                (false, format!("NPI error: {}", e))
            }
        }
    }
}

}

:root[data-theme="light"] .nav-item:hover {

  background: #f3f4f6;

  color: #111827;

}

:root[data-theme="light"] .nav-item.active {

  background: #ecfdf5;

  const [sysInfo, setSysInfo] = useState<SystemInfoData | null>(null);

  const [gpuCategory, setGpuCategory] = useState('unknown');



  const [theme, setTheme] = useState<'dark' | 'light'>('dark');



  const [showWelcome, setShowWelcome] = useState(false);

  const [showGpuPicker, setShowGpuPicker] = useState(false);



  const [nvidiaLinked, setNvidiaLinked] = useState(false);

  const [lodPreset, setLodPreset] = useState('safe');



  const [autoTimer, setAutoTimer] = useState(false);

  const [autoStandby, setAutoStandby] = useState(false);

  const [autoPriority, setAutoPriority] = useState(false);

  const [autoAffinity, setAutoAffinity] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const [showLangMenu, setShowLangMenu] = useState(false);

  const [welcomeAccepted, setWelcomeAccepted] = useState(false);



  // Optimization state

  const [powerPlan, setPowerPlan] = useState('');

  background: #e5e7eb;

}



:root[data-theme="light"] .glass-card {

  background: #ffffff;

  border-color: #e5e7eb;

  backdrop-filter: none;

}



:root[data-theme="light"] .toggle-track {

  background: #d1d5db;

}

:root[data-theme="light"] .toggle-track.is-on {

  background: #059669;

}



/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

   RESET & BASE

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

* {

  box-sizing: border-box;

}



html, body, #root {

  height: 100%;

  margin: 0;

  padding: 0;

}



body {

  background: var(--bg-deep);

  color: var(--text-primary);

  font-family: var(--font-sans);

  font-size: 13px;

  line-height: 1.5;

  overflow: hidden;

  text-rendering: optimizeLegibility;

  -webkit-font-smoothing: antialiased;

  -moz-osx-font-smoothing: grayscale;

}



button, input, select, textarea {

  font: inherit;

  -webkit-tap-highlight-color: transparent;

}



/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

   SCROLLBAR (Dark)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

::-webkit-scrollbar {

  width: 6px;

}

::-webkit-scrollbar-track {

  background: transparent;

}

::-webkit-scrollbar-thumb {

  background: rgba(255, 255, 255, 0.12);

  border-radius: 999px;

}

::-webkit-scrollbar-thumb:hover {

  background: rgba(255, 255, 255, 0.2);

}



/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

   APP SHELL LAYOUT

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.app-shell {

  display: grid;

  grid-template-rows: var(--topbar-h) 1fr var(--bottombar-h);

  grid-template-columns: var(--sidebar-w) 1fr;

    if (!config || launching) return;

    setLaunching(true);

    addLog(t(lang, 'startSeq'));

    try {

      if (nvidiaLinked) { const [, msg] = await applyNvidiaProfile(lodPreset); addLog(msg); }

      if (autoStandby) { addLog(t(lang, 'logPurgingMemory')); const r = await purgeStandbyList(); addLog(r.message); }

      if (autoTimer) { addLog(t(lang, 'logSettingTimer')); const r = await setTimerResolution(true); addLog(r.message); }

      const results = await launchGame(config.game_path);

      results.forEach((msg) => addLog(msg));

  background: var(--accent);

}



/* â”€â”€ Content Area â”€â”€ */

.app-content {

  grid-area: content;

  overflow-y: auto;

  overflow-x: hidden;

  overscroll-behavior-y: contain;

  scrollbar-width: thin;

      if (selected && typeof selected === 'string') {

        if (!/fivem\.exe$/i.test(selected)) {

          addLog(lang === 'th' ? 'à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¹„à¸Ÿà¸¥à¹Œ FiveM.exe à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™' : 'Please select FiveM.exe only.');

          return;

        }

        setConfig((prev) => (prev ? { ...prev, game_path: selected } : prev));

        await persistGamePath(selected);

      }

    } catch (error) {

      addLog(`Browse error: ${String(error)}`);

    }

  };



  const handleLaunch = async () => {

    if (!config || launching) return;

    setLaunching(true);

    addLog(t(lang, 'startSeq'));

    try {

      if (nvidiaLinked) { const [, msg] = await applyNvidiaProfile(lodPreset); addLog(msg); }

      if (autoStandby) { addLog(t(lang, 'logPurgingMemory')); const r = await purgeStandbyList(); addLog(r.message); }

      if (autoTimer) { addLog(t(lang, 'logSettingTimer')); const r = await setTimerResolution(true); addLog(r.message); }

      const results = await launchGame(config.game_path);

      results.forEach((msg) => addLog(msg));

      addLog(t(lang, 'done'));

    } catch (error) {

      addLog(`${t(lang, 'error')}: ${String(error)}`);

    } finally {

      setLaunching(false);

    }

  };











  const handleApplyNvidia = async () => {

    addLog(t(lang, 'logNvidiaApplying'));

    try { const [, msg] = await applyNvidiaProfile(lodPreset); addLog(msg); }

    catch (error) { addLog(`${t(lang, 'error')}: ${String(error)}`); }

  };



  const handleRestoreNvidia = async () => {

    addLog(t(lang, 'logNvidiaRestoring'));

    try { const [, msg] = await applyNvidiaProfile("restore"); addLog(msg); }

    catch (error) { addLog(`${t(lang, 'error')}: ${String(error)}`); }

  };



  const handleWelcomeClose = async () => {

    setShowWelcome(false);

    await updateConfigField('welcome_shown', 'true');

  };

.section-title {

  font-size: 18px;

  font-weight: 700;

  letter-spacing: -0.01em;

  color: var(--text-primary);

}



.section-desc {

  font-size: 13px;

  color: var(--text-secondary);

            <button

              className="btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-2"

              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}

              title={t(lang, 'themeMode')}

            >

              <span className="text-sm">{theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™'}</span>

              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>

            </button>

                  {(['th', 'en'] as Lang[]).map((option) => (

                    <button key={option} className={`language-option ${lang === option ? 'is-active' : ''}`} type="button" role="menuitemradio" aria-checked={lang === option} onClick={() => { void handleLangChange(option); }}>

                      {option.toUpperCase()}

                    </button>

                  ))}

                </motion.div>

              )}

            </AnimatePresence>

          </div>

        </div>

      </header>





      if (autoTimer) {

        addLog(t(lang, 'logSettingTimer'));

                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                // Moon Icon (à¸ªà¸³à¸«à¸£à¸±à¸šà¹‚à¸«à¸¡à¸”à¸¡à¸·à¸”)
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-1">
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${lang === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => void handleLangChange('en')}
              >
                EN
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${lang === 'th' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => void handleLangChange('th')}
              >
                TH
              </button>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>GPU</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{gpuInfo?.names.join(', ') || '...'}</span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>RAM</span>

                  <span clas
                    {sysInfo ? `${sysInfo.ram_avail.toFixed(1)} GB / ${sysInfo.ram_total.toFixed(1)} GB Available` : '...'}

                  </span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Storage</span>

          )}



          {/* â”€â”€â”€ TAB: Graphics â”€â”€â”€ */}

          {activeTab === 'graphics' && (

            <motion.div key="graphics" {...fadeIn} className="flex flex-col gap-8">

              

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.os || '...'}</span>
                </div>

              </div>

      <main className="app-content">

        <AnimatePresence mode="wait">



          {/* â”€â”€â”€ TAB: Dashboard â”€â”€â”€ */}

          {activeTab === 'dashboard' && (

            <motion.div key="dashboard" {...fadeIn} className="flex flex-col gap-5">

              <div>

                <p className="section-label">{t(lang, 'dashboardTitle')}</p>

                <h2 className="section-title mt-1">{lang === 'th' ? 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸š' : 'System Info'}</h2>

                <p className="section-desc mt-2">{t(lang, 'dashboardDesc')}</p>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>CPU</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.cpu || '...'}</span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>GPU</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{gpuInfo?.names.join(', ') || '...'}</span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>RAM</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>

                    {sysInfo ? `${sysInfo.ram_avail.toFixed(1)} GB / ${sysInfo.ram_total.toFixed(1)} GB Available` : '...'}

                  </span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Storage</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>

                    {sysInfo ? `${sysInfo.storage_total.toFixed(0)} GB Total` : '...'}

                  </span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1 col-span-2">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>OS</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.os || '...'}</span>

                </div>

              </div>

            </motion.div>

          )}



                <p className="section-label">{t(lang, 'dashboardTitle')}</p>

                <h2 className="section-title mt-1">{lang === 'th' ? 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸š' : 'System Info'}</h2>

                <p className="section-desc mt-2">{t(lang, 'dashboardDesc')}</p>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>CPU</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.cpu || '...'}</span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>GPU</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{gpuInfo?.names.join(', ') || '...'}</span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>RAM</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>

                    {sysInfo ? `${sysInfo.ram_avail.toFixed(1)} GB / ${sysInfo.ram_total.toFixed(1)} GB Available` : '...'}

                  </span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Storage</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>

                    {sysInfo ? `${sysInfo.storage_total.toFixed(0)} GB Total` : '...'}

                  </span>

                </div>

                <div className="glass-card p-4 flex flex-col gap-1 col-span-2">

                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>OS</span>

                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.os || '...'}</span>

                </div>

              </div>

            </motion.div>

          )}



          {/* â”€â”€â”€ TAB: System â”€â”€â”€ */}

          {activeTab === 'system' && (

            <motion.div key="system" {...fadeIn} className="flex flex-col gap-5">

              <div>

                <p className="section-label">{t(lang, 'systemTitle')}</p>

                <h2 className="section-title mt-1">{lang === 'th' ? 'à¸£à¸°à¸šà¸š & à¹à¸£à¸¡' : 'System & Memory'}</h2>

                <p className="section-desc mt-2">{t(lang, 'systemDesc')}</p>

              </div>



              <div className="flex flex-col gap-3">

                <ToggleRow title={t(lang, 'timerTitle')} description={t(lang, 'timerDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoTimer} onChange={(v) => { setAutoTimer(v); void updateConfigField('auto_timer_resolution', String(v)); }} />

                <ToggleRow title={t(lang, 'standbyTitle')} description={t(lang, 'standbyDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoStandby} onChange={(v) => { setAutoStandby(v); void updateConfigField('auto_standby_cleaner', String(v)); }} />

                <ToggleRow title={t(lang, 'priorityTitle')} description={t(lang, 'priorityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoPriority} onChange={(v) => { setAutoPriority(v); void updateConfigField('auto_priority', String(v)); }} />

                <ToggleRow title={t(lang, 'affinityTitle')} description={t(lang, 'affinityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoAffinity} onChange={(v) => { setAutoAffinity(v); void updateConfigField('auto_affinity', String(v)); }} />

              </div>



              {/* â”€â”€ Network â”€â”€ */}

              <div className="glass-card p-5 flex flex-col gap-4">

                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition hover:bg-zinc-800">

                  <input

                    type="checkbox"

                    className="mt-0.5 h-4 w-4 appearance-none rounded border border-zinc-600 bg-zinc-900 checked:border-emerald-500 checked:bg-emerald-500 flex-shrink-0"

                    style={{

                      backgroundImage: welcomeAccepted ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z' fill='white'/%3E%3C/svg%3E")` : 'none',

                      backgroundSize: '100% 100%',

                    }}

                    checked={welcomeAccepted}

                    onChange={(e) => setWelcomeAccepted(e.target.checked)}

                  />

                  <span className="text-sm font-medium text-zinc-200">{t(lang, 'welcomeAcceptRisk')}</span>

                </label>

                <button className="btn-primary w-full" disabled={!welcomeAccepted} onClick={() => void handleWelcomeClose()}>

                  {t(lang, 'welcomeClose')}

                </button>

              </div>
