import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
  game_path: string;
  minimize_to_tray: boolean;
  language: string;
  custom_width: string;
  custom_height: string;
  last_resolution: string;
  gpu_override: string;
  welcome_shown: boolean;
  auto_timer_resolution: boolean;
  auto_standby_cleaner: boolean;
  auto_priority: boolean;
  auto_affinity: boolean;
  auto_nvidia_profile: boolean;
  nvidia_lod_preset: string;
  nvidia_aa_preset: string;
  nvidia_tex_quality: string;
  nvidia_neg_lod: string;
}

export const getConfig = () => invoke<AppConfig>('get_config');
export const updateConfig = (config: AppConfig) => invoke<void>('update_config', { config });
export const updateConfigField = (key: string, value: string) =>
  invoke<void>('update_config_field', { key, value });

export interface GpuInfo {
  names: string[];
  nvidia: boolean;
  intel: boolean;
  amd: boolean;
  category: string;
}

export const getGpuInfo = () => invoke<GpuInfo>('get_gpu_info');

export interface LaunchResult {
  success: boolean;
  message: string;
}

export const checkFivemPath = (customPath: string) =>
  invoke<LaunchResult>('check_fivem_path', { customPath });
export const launchGame = (gamePath: string) =>
  invoke<string[]>('launch_game', { gamePath });
export const checkGameRunning = () => invoke<boolean>('check_game_running');

export const getResolutions = () => invoke<[string, string, string][]>('get_resolutions');

export interface StretchResult {
  success: boolean;
  needs_custom_res: boolean;
  native_w: number;
  native_h: number;
  message: string;
}

export const applyStretch = (resolutionKey: string, customW: number, customH: number) =>
  invoke<StretchResult>('apply_stretch', { resolutionKey, customW, customH });
export const revertStretch = (nativeW: number, nativeH: number) =>
  invoke<StretchResult>('revert_stretch', { nativeW, nativeH });
export const openNvidiaCp = () => invoke<[boolean, string]>('open_nvidia_cp');

export interface OptResult {
  name: string;
  success: boolean;
  message: string;
}

export const runFpsOptimizations = () => invoke<OptResult[]>('run_fps_optimizations');

export const applyGraphicsPreset = (presetFile: string) =>
  invoke<[boolean, string]>('apply_graphics_preset', { presetFile });
export const restoreGraphics = () => invoke<[boolean, string]>('restore_graphics');

export const applyNvidiaProfile = (lodKey: string, aaKey: string, texQualKey: string, negLodKey: string) =>
  invoke<[boolean, string]>('apply_nvidia_profile', { lodKey, aaKey, texQualKey, negLodKey });

export async function setTimerResolution(enable: boolean) {
  try {
    const res = await invoke<number>('set_timer_resolution', { enable });
    return { success: true, message: enable ? `Timer resolution applied (${(res / 10000).toFixed(4)} ms)` : 'Timer resolution reverted' };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export interface SystemInfoData {
  cpu: string;
  ram_total: number;
  ram_avail: number;
  os: string;
  storage_total: number;
}

export async function getSystemInfo(): Promise<SystemInfoData> {
  return invoke('get_system_info');
}

export async function purgeStandbyList() {
  try {
    await invoke<void>('purge_standby_list');
    return { success: true, message: 'Standby memory purged successfully' };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

// ═══════════════════════════════════════════════
//  NETWORK & POWER & GAMING
// ═══════════════════════════════════════════════

export const applyNetworkTweaks = () =>
  invoke<[boolean, string]>('apply_network_tweaks');

export const restoreNetworkTweaks = () =>
  invoke<[boolean, string]>('restore_network_tweaks');

export const setPowerPlan = (mode: string) =>
  invoke<[boolean, string]>('set_power_plan', { mode });

export const getActivePowerPlan = () =>
  invoke<string>('get_active_power_plan');

export const getWindowsGamingFeatures = () =>
  invoke<[boolean, boolean]>('get_windows_gaming_features');

export const setGameMode = (enabled: boolean) =>
  invoke<[boolean, string]>('set_game_mode', { enabled });

export const setHags = (enabled: boolean) =>
  invoke<[boolean, string]>('set_hags', { enabled });

// ═══════════════════════════════════════════════
//  ADVANCED TWEAKS
// ═══════════════════════════════════════════════

export const toggleGameDvr = (enable: boolean) =>
  invoke<[boolean, string]>('toggle_game_dvr', { enable });

export const getGameDvrStatus = () =>
  invoke<boolean>('get_game_dvr_status');

export const disableFsoForFivem = (fivemPath: string) =>
  invoke<[boolean, string]>('disable_fso_for_fivem', { fivemPath });

export const toggleMouseAcceleration = (enable: boolean) =>
  invoke<[boolean, string]>('toggle_mouse_acceleration', { enable });

export const getMouseAccelerationStatus = () =>
  invoke<boolean>('get_mouse_acceleration_status');

export const toggleCoreParking = (unpark: boolean) =>
  invoke<[boolean, string]>('toggle_core_parking', { unpark });

export const launchMsiUtility = () =>
  invoke<[boolean, string]>('launch_msi_utility');
