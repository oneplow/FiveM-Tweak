import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { t, type Lang } from './i18n';
import {
  applyNvidiaProfile,
  getConfig,
  getGpuInfo,
  getSystemInfo,
  type SystemInfoData,
  updateConfigField,
  setPowerPlan as setPowerPlanCmd,
  getActivePowerPlan,
  getWindowsGamingFeatures,
  setGameMode as setGameModeCmd,
  setHags as setHagsCmd,
  toggleGameDvr,
  getGameDvrStatus,
  disableFsoForFivem,
  launchMsiUtility,
  type AppConfig,
  type GpuInfo,
} from './lib/commands';
import { CustomSelect } from './components/CustomSelect';
import './index.css';

type Tab = 'dashboard' | 'system' | 'nvidia';
type LogEntry = { time: string; msg: string };
type Tone = 'neutral' | 'good' | 'warn' | 'accent';

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22 },
};

const tabMeta: { key: Tab; icon: ReactNode; labelKey: string }[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboardTitle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    key: 'system',
    labelKey: 'systemTitle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    key: 'nvidia',
    labelKey: 'nvidiaTitle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
];

function getLogColor(msg: string) {
  const lower = msg.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('timeout') || lower.includes('ล้มเหลว') || lower.includes('ข้อผิดพลาด')) return 'text-rose-400 font-medium';
  if (lower.includes('success') || lower.includes('ready') || lower.includes('done') || lower.includes('เสร็จ') || lower.includes('detected') || lower.includes('เจอกลุ่ม') || lower.includes('triggered')) return 'text-emerald-400 font-medium';
  if (lower.includes('warning') || lower.includes('alert')) return 'text-amber-400';
  if (lower.includes('nvidia') || lower.includes('gpu')) return 'text-sky-400';
  if (lower.includes('mods') || lower.includes('vng')) return 'text-fuchsia-400';
  if (lower.includes('fivem') || lower.includes('play')) return 'text-orange-400';
  return 'text-zinc-400';
}

function ToggleRow({ title, description, risk, checked, onChange }: { title: string; description: string; risk: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <div className="toggle-row">
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-zinc-100" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        <p className="mt-2 flex items-center gap-2 text-[10px] leading-4 text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{risk}</span>
        </p>
      </div>
      <label className="toggle">
        <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
      </label>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [lang, setLang] = useState<Lang>('th');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [sysInfo, setSysInfo] = useState<SystemInfoData | null>(null);
  const [gpuCategory, setGpuCategory] = useState('unknown');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lodPreset, setLodPreset] = useState('safe');
  const [aaPreset, setAaPreset] = useState('off');
  const [texQualPreset, setTexQualPreset] = useState('quality');
  const [negLodPreset, setNegLodPreset] = useState('allow');
  const [autoTimer, setAutoTimer] = useState(false);
  const [autoStandby, setAutoStandby] = useState(false);
  const [autoPriority, setAutoPriority] = useState(false);
  const [autoAffinity, setAutoAffinity] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showGpuModal, setShowGpuModal] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [powerPlan, setPowerPlan] = useState('');
  const [gameMode, setGameMode] = useState(false);
  const [hags, setHags] = useState(false);
  const [gameDvrDisabled, setGameDvrDisabled] = useState(false);
  const [mouseAccelDisabled, setMouseAccelDisabled] = useState(false);
  const [coreParkingUnparked, setCoreParkingUnparked] = useState(false);
  const [networkOptimized, setNetworkOptimized] = useState(false);

  // Batch Apply State
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyTotal, setApplyTotal] = useState(0);
  const [applyLogs, setApplyLogs] = useState<{msg: string, isError: boolean}[]>([]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { time, msg }]);
    setTimeout(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, 50);
  }, []);

  // Listen to background director logs
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string>('director-log', (event) => {
        addLog(event.payload);
      }).then((unsub) => { unlisten = unsub; });
    });
    return () => { if (unlisten) unlisten(); };
  }, [addLog]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      try {
        const cfg = await getConfig();
        setConfig(cfg);
        const nextLang = (cfg.language as Lang) || 'th';
        setLang(nextLang);
        setAutoTimer(cfg.auto_timer_resolution || false);
        setAutoStandby(cfg.auto_standby_cleaner || false);
        setAutoPriority(cfg.auto_priority || false);
        setAutoAffinity(cfg.auto_affinity || false);
        setLodPreset(cfg.nvidia_lod_preset || 'safe');
        setAaPreset(cfg.nvidia_aa_preset || 'off');
        setTexQualPreset(cfg.nvidia_tex_quality || 'quality');
        setNegLodPreset(cfg.nvidia_neg_lod || 'allow');

        const [gpu, sys] = await Promise.all([
          getGpuInfo(),
          getSystemInfo(),
        ]);

        setGpuInfo(gpu);
        setSysInfo(sys);
        setGpuCategory(cfg.gpu_override && cfg.gpu_override !== 'auto' ? cfg.gpu_override : gpu.category);

        // The user explicitly requested the modal to pop up every time to report the detected GPU.
        setShowGpuModal(true);

      } catch (error) {
        addLog(`Init error: ${String(error)}`);
      }
    };
    void init();
  }, [addLog]);

  useEffect(() => {
    getActivePowerPlan().then((plan) => setPowerPlan(plan)).catch(console.error);
    getWindowsGamingFeatures().then(([gm, hg]) => { setGameMode(gm); setHags(hg); }).catch(console.error);
    getGameDvrStatus().then((enabled) => setGameDvrDisabled(!enabled)).catch(console.error);
    import('./lib/commands').then(({ getMouseAccelerationStatus }) => {
      getMouseAccelerationStatus().then((accel) => setMouseAccelDisabled(!accel)).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (!showLangMenu) return;
    const handlePointerDown = (e: MouseEvent) => { if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) setShowLangMenu(false); };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLangMenu(false); };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('mousedown', handlePointerDown); window.removeEventListener('keydown', handleKeyDown); };
  }, [showLangMenu]);

  const handleLangChange = async (nextLang: Lang) => {
    setLang(nextLang);
    setShowLangMenu(false);
    await updateConfigField('language', nextLang);
  };

  const handleApplyNvidia = async () => {
    addLog(t(lang, 'logNvidiaApplying'));
    try {
      const [ok, msg] = await applyNvidiaProfile(lodPreset, aaPreset, texQualPreset, negLodPreset);
      if (ok) { addLog(msg); }
    }
    catch (error) { addLog(`${t(lang, 'error')}: ${String(error)}`); }
  };

  const handleRestoreNvidia = async () => {
    addLog(t(lang, 'logNvidiaRestoring'));
    try { const [, msg] = await applyNvidiaProfile("restore", "off", "quality", "allow"); addLog(msg); }
    catch (error) { addLog(`${t(lang, 'error')}: ${String(error)}`); }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    setApplyLogs([]);
    let completed = 0;
    const total = 11;
    setApplyTotal(total);

    const logApply = (msg: string, isError = false) => {
      setApplyLogs(prev => [...prev, {msg, isError}]);
    };

    // Auto Settings (Timer, Standby, Priority, Affinity)
    logApply('Saving auto configurations...');
    await updateConfigField('auto_timer_resolution', String(autoTimer));
    await updateConfigField('auto_standby_cleaner', String(autoStandby));
    await updateConfigField('auto_priority', String(autoPriority));
    await updateConfigField('auto_affinity', String(autoAffinity));
    completed += 4;
    setApplyProgress(completed);

    // Power Plan
    logApply('Applying Power Plan...');
    try {
      const [ok, msg] = await setPowerPlanCmd(powerPlan);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // Game Mode
    logApply('Applying Windows Game Mode...');
    try {
      const [ok, msg] = await setGameModeCmd(gameMode);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // HAGS
    logApply('Applying HAGS...');
    try {
      const [ok, msg] = await setHagsCmd(hags);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // Game DVR
    logApply('Applying Game DVR setting...');
    try {
      const [ok, msg] = await toggleGameDvr(!gameDvrDisabled);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // Mouse Accel
    logApply('Applying Mouse Acceleration...');
    try {
      const { toggleMouseAcceleration } = await import('./lib/commands');
      const [ok, msg] = await toggleMouseAcceleration(!mouseAccelDisabled);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // Core Parking
    logApply('Applying Core Parking...');
    try {
      const { toggleCoreParking } = await import('./lib/commands');
      const [ok, msg] = await toggleCoreParking(coreParkingUnparked);
      logApply(msg, !ok);
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    // Network
    logApply('Applying Network Optimizations...');
    try {
      const { applyNetworkTweaks, restoreNetworkTweaks } = await import('./lib/commands');
      if (networkOptimized) {
        const [ok, msg] = await applyNetworkTweaks();
        logApply(msg, !ok);
      } else {
        const [ok, msg] = await restoreNetworkTweaks();
        logApply(msg, !ok);
      }
    } catch (e) { logApply(String(e), true); }
    completed++; setApplyProgress(completed);

    logApply('All changes applied successfully!');
  };

  if (!config) return null;
  const hasNvidiaGpu = gpuInfo?.nvidia || gpuCategory === 'NVIDIA' || gpuCategory === 'nvidia_only' || gpuCategory === 'hybrid';
  const isNvidiaDisabled = !hasNvidiaGpu;

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <h1 className="app-logo">
            <span className="app-logo-accent">Tweak</span>FiveM
          </h1>
          <span className="app-version">v1.1</span>
        </div>
        <div className="app-topbar-right">
          <button
            className="btn-primary border-none px-4 py-1.5 text-xs font-bold shadow-lg shadow-emerald-500/20 mr-2 animate-pulse"
            onClick={handleApplyAll}
          >
            {lang === 'th' ? 'บันทึกค่าระบบ' : 'Save System Tweaks'}
          </button>
          <button className="btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t(lang, 'themeMode')}>
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-400">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-600">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
            )}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <div className="relative" ref={langMenuRef}>
            <button className="btn-secondary px-3 py-1.5 text-xs font-semibold" onClick={() => setShowLangMenu(!showLangMenu)}>
              <span className="uppercase">{lang}</span>
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="language-menu">
                  {(['th', 'en'] as Lang[]).map((option) => (
                    <button key={option} className={`language-option ${lang === option ? 'is-active' : ''}`} onClick={() => { void handleLangChange(option); }}>
                      {option.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <aside className="app-sidebar">
        {tabMeta.map((tab) => (
          <button key={tab.key} className={`sidebar-tab ${activeTab === tab.key ? 'is-active' : ''}`} onClick={() => setActiveTab(tab.key)} title={tab.key.toUpperCase()}>
            {tab.icon}
          </button>
        ))}
      </aside>

      <main className="app-content">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" {...fadeIn} className="flex flex-col gap-5">
              <div>
                <p className="section-label">{lang === 'th' ? 'ภาพรวม' : 'Overview'}</p>
                <h2 className="section-title mt-1">{lang === 'th' ? 'ข้อมูลระบบ' : 'System Info'}</h2>
                <p className="section-desc mt-2">{lang === 'th' ? 'ระบบจะตรวจจับ FiveM อัตโนมัติในพื้นหลัง' : 'System will automatically detect FiveM in background'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>CPU</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.cpu || '...'}</span>
                </div>
                <div className="glass-card p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>GPU</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{gpuInfo?.names.join(', ') || '...'}</span>
                </div>
                <div className="glass-card p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>RAM</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {sysInfo ? `${sysInfo.ram_avail.toFixed(1)} GB / ${sysInfo.ram_total.toFixed(1)} GB Free` : '...'}
                  </span>
                </div>
                <div className="glass-card p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Storage</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {sysInfo ? `${sysInfo.storage_total.toFixed(0)} GB Total` : '...'}
                  </span>
                </div>
                <div className="glass-card p-4 flex flex-col gap-1 col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>OS</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sysInfo?.os || '...'}</span>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'gpuPickerTitle')}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t(lang, 'gpuPickerSubtitle')}</p>
                </div>
                <div>
                  <CustomSelect
                    value={gpuCategory === 'unknown' ? 'auto' : (config?.gpu_override && config.gpu_override !== 'auto' ? config.gpu_override : 'auto')}
                    onChange={async (val) => {
                      setGpuCategory(val === 'auto' ? (gpuInfo?.category || 'unknown') : val);
                      await updateConfigField('gpu_override', val);
                      addLog(t(lang, 'logGpuSaved'));
                    }}
                    options={[
                      { value: 'auto', label: t(lang, 'gpuModeAuto') },
                      { value: 'nvidia_only', label: t(lang, 'gpuModeNvidia') },
                      { value: 'hybrid', label: t(lang, 'gpuModeHybrid') },
                      { value: 'non_nvidia', label: t(lang, 'gpuModeNonNvidia') },
                    ]}
                  />
                  <p className="text-[10px] mt-2 italic text-amber-500">{t(lang, 'gpuPickerNote')}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div key="system" {...fadeIn} className="flex flex-col gap-5">
              <div>
                <p className="section-label">{t(lang, 'systemTitle')}</p>
                <h2 className="section-title mt-1">{lang === 'th' ? 'ระบบ & แรม' : 'System & Memory'}</h2>
                <p className="section-desc mt-2">{t(lang, 'systemDesc')}</p>
              </div>

              <div className="flex flex-col gap-3">
                <ToggleRow title={t(lang, 'timerTitle')} description={t(lang, 'timerDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoTimer} onChange={setAutoTimer} />
                <ToggleRow title={t(lang, 'standbyTitle')} description={t(lang, 'standbyDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoStandby} onChange={setAutoStandby} />
                <ToggleRow title={t(lang, 'priorityTitle')} description={t(lang, 'priorityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoPriority} onChange={setAutoPriority} />
                <ToggleRow title={t(lang, 'affinityTitle')} description={t(lang, 'affinityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoAffinity} onChange={setAutoAffinity} />
              </div>

              <div className="glass-card p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'powerPlanTitle')}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'powerPlanDesc')} (Current: <span className="text-amber-400">{powerPlan}</span>)</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className={`flex-1 py-2 px-3 text-xs font-semibold ${powerPlan.toLowerCase().includes('ultimate') ? 'btn-primary border-none' : 'btn-secondary'}`} onClick={() => setPowerPlan('ultimate')}>{t(lang, 'powerPlanUltimate')}</button>
                  <button className={`flex-1 py-2 px-3 text-xs font-semibold ${powerPlan.toLowerCase().includes('balanced') ? 'btn-primary border-none' : 'btn-secondary'}`} onClick={() => setPowerPlan('balanced')}>{t(lang, 'powerPlanBalanced')}</button>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'gameModeTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'gameModeDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={gameMode} onChange={(e) => setGameMode(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${gameMode ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${gameMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'hagsTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'hagsDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={hags} onChange={(e) => setHags(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${hags ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hags ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col gap-4 border border-rose-500/20">
                <div>
                  <h3 className="text-sm font-semibold text-rose-400">{t(lang, 'advTweaksTitle')}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'advTweaksDesc')}</p>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'Game DVR' : 'Game DVR'}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ปิดระบบบันทึกวิดีโอเพื่อลดการกินทรัพยากร' : 'Disable Windows game recording'}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={gameDvrDisabled} onChange={(e) => setGameDvrDisabled(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${gameDvrDisabled ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${gameDvrDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'mouseAccelTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'mouseAccelDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={mouseAccelDisabled} onChange={(e) => setMouseAccelDisabled(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${mouseAccelDisabled ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${mouseAccelDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'coreParkingTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'coreParkingDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={coreParkingUnparked} onChange={(e) => setCoreParkingUnparked(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${coreParkingUnparked ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${coreParkingUnparked ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'networkTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'networkDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={networkOptimized} onChange={(e) => setNetworkOptimized(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${networkOptimized ? 'bg-[var(--accent)]' : 'bg-[var(--toggle-bg)]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${networkOptimized ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'fsoTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'fsoDesc')}</p>
                  </div>
                  <button
                    className="btn-primary border-none text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    onClick={async () => {
                      addLog(t(lang, 'logFso'));
                      try {
                        import('./lib/commands').then(async ({ disableFsoForFivem }) => {
                          // Try to get FiveM path from config, or use a default fallback
                          const path = config?.game_path || "C:\\Users\\User\\AppData\\Local\\FiveM\\FiveM.exe";
                          const [ok, msg] = await disableFsoForFivem(path);
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}
                  >
                    {t(lang, 'applyFso')}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'ปรับแต่ง FPS ทั่วไป' : 'General FPS Optimizations'}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'รันสคริปต์ปรับแต่ง Windows เบื้องต้นเพื่อรีดเฟรมเรต' : 'Run basic Windows optimization scripts for better framerate'}</p>
                  </div>
                  <button
                    className="btn-primary border-none text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    onClick={async () => {
                      addLog(lang === 'th' ? 'กำลังรัน FPS Optimizations...' : 'Running FPS Optimizations...');
                      try {
                        import('./lib/commands').then(async ({ runFpsOptimizations }) => {
                          const results = await runFpsOptimizations();
                          results.forEach(res => {
                            addLog(res.success ? `✓ ${res.name}: ${res.message}` : `✗ ${res.name}: ${res.message}`);
                          });
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}
                  >
                    {lang === 'th' ? 'รัน Optimizer' : 'Run Optimizer'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'nvidia' && (
            <motion.div key="nvidia" {...fadeIn} className="flex flex-col gap-5">
              <div>
                <p className="section-label">{t(lang, 'nvidiaTitle')}</p>
                <h2 className="section-title mt-1">{lang === 'th' ? 'กราฟิก และ ความละเอียด' : 'Graphics & Resolution'}</h2>
                <p className="section-desc mt-2">{t(lang, 'nvidiaDesc')}</p>
              </div>

              <div className={`glass-card p-5 flex flex-col gap-4 ${isNvidiaDisabled ? 'opacity-60' : ''}`}>
                <div className="space-y-1 mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'NVIDIA Profile (ออโต้เมื่อเกมเริ่ม)' : 'NVIDIA Profile (Auto-apply on launch)'}</h3>
                  <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ตั้งค่าความละเอียดล่วงหน้า ระบบจะใส่ให้เองตอนเข้าเกม' : 'Configure presets. The system will apply them automatically.'}</p>
                </div>

                {/* --- 1. LOD Bias --- */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'lodPreset')}</p>
                    <p className="text-[10px] text-zinc-500">{lang === 'th' ? 'ระดับความหยาบของกราฟิก (LOD Bias)' : 'LOD Bias level'}</p>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <CustomSelect
                      disabled={isNvidiaDisabled}
                      value={lodPreset}
                      onChange={(val) => {
                        setLodPreset(val);
                        void updateConfigField('nvidia_lod_preset', val);
                      }}
                      options={[
                        { value: 'safe', label: lang === 'th' ? 'Safe (+0.0)' : 'Safe (+0.0)' },
                        { value: 'low', label: lang === 'th' ? 'Low (+1.0)' : 'Low (+1.0)' },
                        { value: 'medium', label: lang === 'th' ? 'Medium (+1.5)' : 'Medium (+1.5)' },
                        { value: 'balanced', label: lang === 'th' ? 'Balanced (+2.0)' : 'Balanced (+2.0)' },
                        { value: 'high', label: lang === 'th' ? 'High (+2.5)' : 'High (+2.5)' },
                        { value: 'performance', label: lang === 'th' ? 'Performance (+3.0)' : 'Performance (+3.0)' },
                        { value: 'extreme', label: lang === 'th' ? 'Extreme (+4.5)' : 'Extreme (+4.5)' },
                        { value: 'potato', label: lang === 'th' ? 'Potato (+6.0) ดินน้ำมัน' : 'Potato (+6.0)' },
                      ]}
                    />
                  </div>
                </div>

                {/* --- 2. AA Transparency --- */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-2 border-t border-zinc-700/30 pt-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'ลบรอยหยักโปร่งใส' : 'AA Transparency'}</p>
                    <p className="text-[10px] text-zinc-500">{lang === 'th' ? 'ลดรอยหยักของต้นไม้และรั้ว' : 'Antialiasing - Transparency Supersampling'}</p>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <CustomSelect
                      disabled={isNvidiaDisabled}
                      value={aaPreset}
                      onChange={(val) => {
                        setAaPreset(val);
                        void updateConfigField('nvidia_aa_preset', val);
                      }}
                      options={[
                        { value: 'off', label: lang === 'th' ? 'Off (ลื่นที่สุด)' : 'Off (Fastest)' },
                        { value: '2x', label: '2x SGSSAA' },
                        { value: '4x', label: '4x SGSSAA' },
                        { value: '8x', label: lang === 'th' ? '8x SGSSAA (ภาพสวยสุด)' : '8x SGSSAA (Best Quality)' },
                      ]}
                    />
                  </div>
                </div>

                {/* --- 3. Texture Quality --- */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-2 border-t border-zinc-700/30 pt-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'คุณภาพพื้นผิว' : 'Texture Quality'}</p>
                    <p className="text-[10px] text-zinc-500">{lang === 'th' ? 'Texture filtering - Quality' : 'Texture filtering - Quality'}</p>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <CustomSelect
                      disabled={isNvidiaDisabled}
                      value={texQualPreset}
                      onChange={(val) => {
                        setTexQualPreset(val);
                        void updateConfigField('nvidia_tex_quality', val);
                      }}
                      options={[
                        { value: 'high_performance', label: lang === 'th' ? 'High Performance (เน้นลื่นมากๆ)' : 'High Performance' },
                        { value: 'performance', label: lang === 'th' ? 'Performance (เน้นลื่น)' : 'Performance' },
                        { value: 'quality', label: lang === 'th' ? 'Quality (สมดุล)' : 'Quality' },
                        { value: 'high_quality', label: lang === 'th' ? 'High Quality (เน้นภาพสวย)' : 'High Quality' },
                      ]}
                    />
                  </div>
                </div>

                {/* --- 4. Negative LOD Bias --- */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-2 border-t border-zinc-700/30 pt-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'Negative LOD Bias' : 'Negative LOD Bias'}</p>
                    <p className="text-[10px] text-zinc-500">{lang === 'th' ? 'เลือก Allow เพื่อให้ภาพเบลอได้ (FPS เพิ่ม)' : 'Texture filtering - Negative LOD bias'}</p>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <CustomSelect
                      disabled={isNvidiaDisabled}
                      value={negLodPreset}
                      onChange={(val) => {
                        setNegLodPreset(val);
                        void updateConfigField('nvidia_neg_lod', val);
                      }}
                      options={[
                        { value: 'allow', label: lang === 'th' ? 'Allow (แนะนำ)' : 'Allow (Recommended)' },
                        { value: 'clamp', label: lang === 'th' ? 'Clamp (ล็อกคุณภาพ)' : 'Clamp (Lock Quality)' },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row mt-4">
                  <button className="btn-primary flex-1 border-none" disabled={isNvidiaDisabled} onClick={handleApplyNvidia}>{t(lang, 'applyNvidia')}</button>
                  <button className="btn-secondary flex-1" disabled={isNvidiaDisabled} onClick={handleRestoreNvidia}>{t(lang, 'restoreNvidia')}</button>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col gap-4 border border-blue-500/20">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-blue-400">MSI Mode Utility</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'msiDesc')}</p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <button
                    className="btn-primary border-none text-xs font-semibold px-4 py-2 rounded-lg"
                    onClick={async () => {
                      addLog("Launching MSI Mode Utility...");
                      try {
                        const [ok, msg] = await launchMsiUtility();
                        addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}
                  >
                    Launch MSI Utility
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="app-bottom">
        <div className="flex-1 log-surface" ref={logRef}>
          {logs.length === 0 ? (
            <p className="opacity-50 text-zinc-500">{lang === 'th' ? 'พร้อมใช้งานแล้ว...' : 'Ready...'}</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className="animate-in fade-in duration-200">
                <span className="opacity-40 mr-2">[{log.time}]</span>
                <span className={getLogColor(log.msg)}>{log.msg}</span>
              </p>
            ))
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showGpuModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="modal-panel p-6 max-w-md w-full relative"
            >
              <h3 className="text-xl font-bold mb-2" style={{ color: hasNvidiaGpu ? 'var(--accent)' : '#fb7185' }}>
                {hasNvidiaGpu
                  ? (lang === 'th' ? 'ตรวจพบการ์ดจอ NVIDIA' : 'NVIDIA GPU Detected')
                  : (lang === 'th' ? 'ไม่พบการ์ดจอ NVIDIA' : 'NVIDIA GPU Not Detected')
                }
              </h3>
              <p className="text-sm text-zinc-300 mb-4 whitespace-pre-line">
                {hasNvidiaGpu
                  ? (lang === 'th'
                    ? `ระบบตรวจพบ: ${gpuInfo?.names.join(', ')}\nคุณสามารถใช้งานฟีเจอร์ปรับกราฟิก (NVIDIA Profile) ได้อย่างเต็มประสิทธิภาพ`
                    : `Detected: ${gpuInfo?.names.join(', ')}\nYou can use all NVIDIA-specific features.`)
                  : (lang === 'th'
                    ? `ระบบตรวจพบ: ${gpuInfo?.names.join(', ')}\nฟีเจอร์ปรับกราฟิก (NVIDIA Profile) จะถูกปิดใช้งาน คุณต้องการฝืนเปิดใช้งานหรือไม่ (ไม่แนะนำ)?`
                    : `Detected: ${gpuInfo?.names.join(', ')}\nNVIDIA-specific features will be disabled. Force enable them anyway?`)
                }
              </p>
              <div className="flex gap-3 mt-6">
                {hasNvidiaGpu ? (
                  <button className="btn-primary flex-1 border-none" onClick={() => setShowGpuModal(false)}>
                    {lang === 'th' ? 'เข้าสู่โปรแกรม' : 'Continue'}
                  </button>
                ) : (
                  <>
                    <button className="btn-secondary flex-1" onClick={() => {
                      void updateConfigField('gpu_override', 'auto');
                      setGpuCategory('unknown');
                      setShowGpuModal(false);
                    }}>
                      {lang === 'th' ? 'ปิดใช้งาน (แนะนำ)' : 'Disable (Recommended)'}
                    </button>
                    <button className="btn-primary flex-1 border-none !bg-rose-500 hover:!bg-rose-600" onClick={() => {
                      void updateConfigField('gpu_override', 'NVIDIA');
                      setGpuCategory('NVIDIA');
                      setShowGpuModal(false);
                    }}>
                      {lang === 'th' ? 'ฝืนเปิดใช้งาน' : 'Force Enable'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Loading Modal */}
      <AnimatePresence>
        {isApplying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 modal-backdrop"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-panel w-full max-w-md p-6 flex flex-col gap-6 relative overflow-hidden"
            >
              <div className="text-center space-y-2 relative z-10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4"></path>
                    <path d="M12 18v4"></path>
                    <path d="M4.93 4.93l2.83 2.83"></path>
                    <path d="M16.24 16.24l2.83 2.83"></path>
                    <path d="M2 12h4"></path>
                    <path d="M18 12h4"></path>
                    <path d="M4.93 19.07l2.83-2.83"></path>
                    <path d="M16.24 7.76l2.83-2.83"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'กำลังปรับแต่งระบบ...' : 'Optimizing System...'}</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'th' ? 'กรุณารอสักครู่ ระบบกำลังปรับตั้งค่าต่างๆ ตามที่คุณเลือก' : 'Please wait, applying your selected settings...'}
                </p>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs font-semibold">
                  <span style={{ color: 'var(--text-primary)' }}>Progress</span>
                  <span style={{ color: 'var(--accent)' }}>{applyProgress} / {applyTotal}</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-hover)' }}>
                  <motion.div
                    className="h-full"
                    style={{ background: 'var(--accent)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${applyTotal > 0 ? (applyProgress / applyTotal) * 100 : 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="apply-log-box rounded-lg p-3 h-40 overflow-y-auto relative z-10 font-mono text-[11px] flex flex-col gap-1">
                {applyLogs.map((log, i) => (
                  <div key={i} className={log.isError ? 'text-rose-400' : 'text-emerald-400'}>
                    {log.isError ? '✗' : '✓'} {log.msg}
                  </div>
                ))}
                {applyProgress === applyTotal && applyTotal > 0 && (
                  <div className="mt-2 pt-2 font-bold text-center" style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border-subtle)' }}>
                    {lang === 'th' ? 'ปรับแต่งระบบเสร็จสมบูรณ์!' : 'Optimization Complete!'}
                  </div>
                )}
              </div>
              
              {applyProgress === applyTotal && applyTotal > 0 && (
                <button
                  className="btn-primary border-none w-full py-2 text-sm font-bold relative z-10"
                  onClick={() => setIsApplying(false)}
                >
                  {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
