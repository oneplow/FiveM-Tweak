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
                <ToggleRow title={t(lang, 'timerTitle')} description={t(lang, 'timerDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoTimer} onChange={(v) => { setAutoTimer(v); void updateConfigField('auto_timer_resolution', String(v)); addLog(lang === 'th' ? (v ? '✓ เปิดใช้ Auto Timer 0.5ms' : '✗ ปิด Auto Timer 0.5ms') : (v ? '✓ Auto Timer 0.5ms Enabled' : '✗ Auto Timer 0.5ms Disabled')); }} />
                <ToggleRow title={t(lang, 'standbyTitle')} description={t(lang, 'standbyDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoStandby} onChange={(v) => { setAutoStandby(v); void updateConfigField('auto_standby_cleaner', String(v)); addLog(lang === 'th' ? (v ? '✓ เปิดใช้ล้าง Standby Memory อัตโนมัติ' : '✗ ปิดล้าง Standby Memory อัตโนมัติ') : (v ? '✓ Auto Standby Memory Enabled' : '✗ Auto Standby Memory Disabled')); }} />
                <ToggleRow title={t(lang, 'priorityTitle')} description={t(lang, 'priorityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoPriority} onChange={(v) => { setAutoPriority(v); void updateConfigField('auto_priority', String(v)); addLog(lang === 'th' ? (v ? '✓ เปิดบังคับ High Priority อัตโนมัติ' : '✗ ปิดบังคับ High Priority อัตโนมัติ') : (v ? '✓ Auto High Priority Enabled' : '✗ Auto High Priority Disabled')); }} />
                <ToggleRow title={t(lang, 'affinityTitle')} description={t(lang, 'affinityDesc')} risk={t(lang, 'riskNoneConfig')} checked={autoAffinity} onChange={(v) => { setAutoAffinity(v); void updateConfigField('auto_affinity', String(v)); addLog(lang === 'th' ? (v ? '✓ เปิดปรับ CPU Affinity อัตโนมัติ' : '✗ ปิดปรับ CPU Affinity อัตโนมัติ') : (v ? '✓ Auto CPU Affinity Enabled' : '✗ Auto CPU Affinity Disabled')); }} />
              </div>

              <div className="glass-card p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'powerPlanTitle')}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'powerPlanDesc')} (Current: <span className="text-amber-400">{powerPlan}</span>)</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="btn-primary border-none flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                    addLog(t(lang, 'logPowerPlan'));
                    try {
                      const [ok, msg] = await setPowerPlanCmd('ultimate');
                      addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                      if (ok) setPowerPlan(await getActivePowerPlan());
                    } catch (e) { addLog(`✗ ${String(e)}`); }
                  }}>{t(lang, 'powerPlanUltimate')}</button>
                  <button className="btn-secondary flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                    addLog(t(lang, 'logPowerPlan'));
                    try {
                      const [ok, msg] = await setPowerPlanCmd('balanced');
                      addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                      if (ok) setPowerPlan(await getActivePowerPlan());
                    } catch (e) { addLog(`✗ ${String(e)}`); }
                  }}>{t(lang, 'powerPlanBalanced')}</button>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'gameModeTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'gameModeDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={gameMode} onChange={async (e) => {
                      const val = e.target.checked;
                      addLog(t(lang, 'logGameMode'));
                      try {
                        const [ok, msg] = await setGameModeCmd(val);
                        addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        if (ok) setGameMode(val);
                      } catch (err) { addLog(`✗ ${String(err)}`); }
                    }} />
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
                    <input type="checkbox" className="hidden" checked={hags} onChange={async (e) => {
                      const val = e.target.checked;
                      addLog(t(lang, 'logHags'));
                      try {
                        const [ok, msg] = await setHagsCmd(val);
                        addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        if (ok) setHags(val);
                      } catch (err) { addLog(`✗ ${String(err)}`); }
                    }} />
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
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'th' ? 'ปิด Game DVR' : 'Game DVR'}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ปิดระบบบันทึกวิดีโอเพื่อลดการกินทรัพยากร' : 'Disable Windows game recording'}</p>
                  </div>
                  <button
                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${!gameDvrDisabled ? 'btn-primary border-none' : 'btn-secondary'}`}
                    onClick={async () => {
                      addLog(lang === 'th' ? 'ตั้งค่า Game DVR...' : 'Setting Game DVR...');
                      try {
                        const [ok, msg] = await toggleGameDvr(!gameDvrDisabled);
                        addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        if (ok) setGameDvrDisabled(!gameDvrDisabled);
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}
                  >
                    {gameDvrDisabled ? (lang === 'th' ? 'เปิด Game DVR' : 'Enable DVR') : (lang === 'th' ? 'ปิด Game DVR' : 'Disable DVR')}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'mouseAccelTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'mouseAccelDesc')}</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" className="hidden" checked={mouseAccelDisabled} onChange={async (e) => {
                      const val = e.target.checked;
                      addLog(t(lang, 'logToggle'));
                      try {
                        import('./lib/commands').then(async ({ toggleMouseAcceleration }) => {
                          const [ok, msg] = await toggleMouseAcceleration(!val); // false to disable
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                          if (ok) setMouseAccelDisabled(val);
                        });
                      } catch (err) { addLog(`✗ ${String(err)}`); }
                    }} />
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="btn-primary border-none flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                      addLog(t(lang, 'logToggle'));
                      try {
                        import('./lib/commands').then(async ({ toggleCoreParking }) => {
                          const [ok, msg] = await toggleCoreParking(true);
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}>{lang === 'th' ? 'Unpark Cores' : 'Unpark Cores'}</button>
                    <button className="btn-secondary flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                      addLog(t(lang, 'logToggle'));
                      try {
                        import('./lib/commands').then(async ({ toggleCoreParking }) => {
                          const [ok, msg] = await toggleCoreParking(false);
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}>{lang === 'th' ? 'Restore' : 'Restore'}</button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-700/30 pt-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(lang, 'networkTitle')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t(lang, 'networkDesc')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="btn-primary border-none flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                      addLog(t(lang, 'logNetworkApplying'));
                      try {
                        import('./lib/commands').then(async ({ applyNetworkTweaks }) => {
                          const [ok, msg] = await applyNetworkTweaks();
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}>{t(lang, 'applyNetwork')}</button>
                    <button className="btn-secondary flex-1 py-2 px-3 text-xs font-semibold" onClick={async () => {
                      addLog(t(lang, 'logNetworkRestoring'));
                      try {
                        import('./lib/commands').then(async ({ restoreNetworkTweaks }) => {
                          const [ok, msg] = await restoreNetworkTweaks();
                          addLog(ok ? `✓ ${msg}` : `✗ ${msg}`);
                        });
                      } catch (e) { addLog(`✗ ${String(e)}`); }
                    }}>{t(lang, 'restoreNetwork')}</button>
                  </div>
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
    </div>
  );
}
