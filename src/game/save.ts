// Сохранения и настройки: localStorage-настройки комфорта + JSON экспорт/импорт
// всех ключей прогресса (биолаб, кодекс, достижения, лидерборд, daily).
import { t } from '../i18n';
import type { Ctx } from './context';
import { refreshCodexBonuses } from './state';
import { renderAchievements, renderBiolab, renderCodex } from '../ui/modals';
import { showToast } from '../ui/toast';

export interface SettingsData {
  screenFlashes: 'soft' | 'off';
  cameraShake: 'subtle' | 'off' | 'full';
  microParallax: boolean;
  bgmVolume: number; // 0..100
  sfxVolume: number; // 0..100
  muted: boolean;
  quality: 'low' | 'medium' | 'high';
}

/** Ключи прогресса, входящие в бэкап сохранения */
export const SAVE_KEYS = [
  'lumivore-biolab-v1',
  'lumivore_codex_v1',
  'lumivore_achievements_v1',
  'lumivore_leaderboard_v1',
  'lumivore_settings_v1',
  'lumivore_daily_done_v1',
] as const;

/** Настройки по умолчанию (и фолбэк при битом JSON) */
export function defaultSettings(): SettingsData {
  return {
    screenFlashes: 'soft',
    cameraShake: 'subtle',
    microParallax: true,
    bgmVolume: 60,
    sfxVolume: 80,
    muted: false,
    quality: 'medium',
  };
}

/** Загрузить настройки комфорта из localStorage с try/catch и дефолтами */
export function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem('lumivore_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        screenFlashes: parsed.screenFlashes ?? 'soft',
        cameraShake: parsed.cameraShake ?? 'subtle',
        microParallax: parsed.microParallax ?? true,
        bgmVolume: parsed.bgmVolume ?? 60,
        sfxVolume: parsed.sfxVolume ?? 80,
        muted: parsed.muted === true,
        quality: parsed.quality ?? 'medium',
      };
    }
  } catch {}
  return defaultSettings();
}

/** Сохранить текущие настройки (ctx.settings) в localStorage */
export function saveSettings(ctx: Ctx): void {
  try {
    localStorage.setItem('lumivore_settings_v1', JSON.stringify(ctx.settings));
  } catch {}
}

/** Экспорт всех ключей прогресса в JSON-файл (кнопка в настройках) */
export function exportSave(ctx: Ctx): void {
  const payload: Record<string, unknown> = { version: 1, exportedAt: new Date().toISOString() };
  for (const k of SAVE_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try { payload[k] = JSON.parse(raw); } catch { payload[k] = raw; }
    }
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumivore-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(ctx, t('toast_save_exported'));
}

/** Импорт бэкапа: перезаписывает ключи прогресса и перерисовывает все мета-экраны */
export async function importSave(ctx: Ctx, file: File): Promise<void> {
  try {
    const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
    for (const k of SAVE_KEYS) {
      if (k in parsed && parsed[k] !== undefined) {
        localStorage.setItem(k, typeof parsed[k] === 'string' ? parsed[k] as string : JSON.stringify(parsed[k]));
      }
    }
    renderBiolab(ctx);
    renderCodex(ctx);
    renderAchievements(ctx);
    refreshCodexBonuses(ctx);
    showToast(ctx, t('toast_save_imported'), 'success');
  } catch {
    showToast(ctx, t('toast_save_error'), 'danger');
  }
}
