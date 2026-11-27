// Применение i18n ко всем статическим текстам UI (вызывается на старте и смене языка).
import { t, getLocale } from '../i18n';
import type { I18nKey } from '../i18n';
import { trChallengeTitle } from '../i18n/gameData';
import { CODEX_ENTRIES } from '../engine/codex';
import { ACHIEVEMENTS, loadAchievements } from '../engine/achievements';
import { MAX_ACTIVE_BIOLAB, loadBiolab } from '../engine/biolab';
import { getDailyChallenge } from '../engine/challenge';
import type { Ctx } from '../game/context';
import { fmtTime, syncPauseButton, updateBranchChip, updateScaleHud, updateWeaponHud } from './hud';
import { renderAchievements, renderBiolab, renderCodex, renderDailyModal, syncAudioIcons, syncFullscreenButton, updateDailyHudPill } from './modals';
import { syncRerollBtn } from './upgrades';

/** Полный переперевод статических текстов + перерисовка всех мета-экранов */
export function applyI18n(ctx: Ctx): void {
  document.documentElement.lang = getLocale();
  const setText = (id: string, key: I18nKey) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  };
  const setHtml = (id: string, key: I18nKey) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = t(key);
  };

  const dom = ctx.dom;
  setText('menu-brand-badge', 'brand_badge');
  setText('menu-tagline', 'tagline');
  if (dom.menuRecordText || dom.menuRecordBadge) {
    const bl = loadBiolab();
    const recStr = t('record_badge', { time: fmtTime(bl.bestTime), runs: bl.runs, points: bl.points });
    if (dom.menuRecordText) dom.menuRecordText.textContent = recStr;
    else if (dom.menuRecordBadge) dom.menuRecordBadge.textContent = recStr;
  }
  if (dom.startBtnLabel) dom.startBtnLabel.textContent = ctx.started ? t('resume_run') : t('start_run');
  const dcLabel = document.getElementById('daily-challenge-label');
  if (dcLabel) {
    const ch = getDailyChallenge();
    dcLabel.textContent = `${t('daily_challenge')}: ${trChallengeTitle(ch.branch, ch.title)}`;
  }
  if (dom.achievementsOpenLabel) {
    dom.achievementsOpenLabel.textContent = t('achievements_btn', { unlocked: loadAchievements().size, total: ACHIEVEMENTS.length });
  }
  if (dom.biolabOpenBtn) {
    const sp = dom.biolabOpenBtn.querySelector('span');
    if (sp) sp.textContent = t('biolab');
  }
  if (dom.codexOpenBtn) {
    const sp = dom.codexOpenBtn.querySelector('span');
    if (sp) sp.textContent = t('codex');
  }
  if (dom.helpModalOpenBtn) {
    const sp = dom.helpModalOpenBtn.querySelector('span');
    if (sp) sp.textContent = t('help');
  }
  if (dom.settingsOpenBtn) {
    const sp = dom.settingsOpenBtn.querySelector('span');
    if (sp) sp.textContent = t('settings');
  }

  // Controls strip
  setText('ctrl-k-mouse', 'ctrl_mouse');
  setText('ctrl-a-aim', 'ctrl_aim');
  setText('ctrl-k-wasd', 'ctrl_wasd');
  setText('ctrl-a-move', 'ctrl_move');
  setText('ctrl-k-dash', 'ctrl_dash_key');
  setText('ctrl-a-dash', 'ctrl_dash');
  setText('ctrl-k-call', 'ctrl_call_key');
  setText('ctrl-a-call', 'ctrl_call');
  setText('ctrl-k-pause', 'ctrl_pause_key');
  setText('ctrl-a-pause', 'ctrl_pause');

  // HUD labels & tooltips
  setText('hud-hp-label', 'hud_hp');
  setText('hud-tail-label', 'hud_tail');
  setText('res-label', 'hud_resonance');
  dom.nodesChipEl.title = t('nodes_chip_title');
  dom.branchChipEl.title = t('branch_chip_title');
  dom.helpBtn.title = t('help_btn_title');
  dom.helpBtn.setAttribute('aria-label', t('help_btn_title'));
  if (dom.pauseBtn) {
    dom.pauseBtn.title = t('pause_btn_title');
    dom.pauseBtn.setAttribute('aria-label', t('pause_btn_title'));
  }
  syncAudioIcons(ctx);
  syncFullscreenButton(ctx);
  syncPauseButton(ctx);
  for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as const) {
    const nameEl = document.querySelector(`#dna-${b} .dna-name`);
    if (nameEl) nameEl.textContent = t(`dna_${b}` as I18nKey);
  }
  ctx.svc.joystick.setLabels(t('touch_call'), t('touch_dash'));
  if (!ctx.started && dom.radarBadgeEl) {
    const rbText = dom.radarBadgeEl.querySelector('#radar-badge-text') ?? dom.radarBadgeEl;
    rbText.textContent = t('radar_threats', { n: 0 });
  }

  // Death modal buttons
  if (dom.restartBtn) dom.restartBtn.textContent = t('restart_btn');
  if (dom.endlessBtn) {
    const sp = dom.endlessBtn.querySelector('span');
    if (sp) sp.textContent = t('endless_btn');
    else dom.endlessBtn.textContent = t('endless_btn');
  }
  if (dom.savePortraitBtn) {
    const sp = dom.savePortraitBtn.querySelector('span');
    if (sp) sp.textContent = t('save_portrait');
  }
  if (dom.biolabBtn) {
    const sp = dom.biolabBtn.querySelector('span');
    if (sp) sp.textContent = t('biolab');
  }
  if (dom.deathAchBtn) {
    const sp = dom.deathAchBtn.querySelector('span');
    if (sp) sp.textContent = t('achievements');
  }

  // Biolab
  setText('biolab-title', 'biolab_title');
  const bSub = document.getElementById('biolab-sub');
  if (bSub) bSub.textContent = t('biolab_sub', { max: MAX_ACTIVE_BIOLAB });
  if (dom.biolabDisableAllBtn) dom.biolabDisableAllBtn.textContent = t('biolab_disable_all');
  if (dom.biolabCloseBtn) dom.biolabCloseBtn.textContent = t('biolab_close');

  // Daily Challenge & Achievements
  setText('daily-modal-title', 'daily_challenge');
  setText('daily-modal-sub', 'daily_modal_sub');
  setText('daily-start-label', 'daily_start');
  if (dom.dailyCloseBtn) dom.dailyCloseBtn.textContent = t('daily_back');
  setText('ach-title-el', 'ach_title');
  setText('ach-sub-el', 'ach_sub');
  if (dom.achCloseBtn) dom.achCloseBtn.textContent = t('codex_close');

  // Codex
  setText('codex-title-el', 'codex_title');
  setText('codex-sub', 'codex_sub');
  setText('codex-prev-label', 'codex_prev');
  setText('codex-next-label', 'codex_next');
  if (dom.codexCloseBtn) dom.codexCloseBtn.textContent = t('codex_close');
  const codexCounts: Record<string, number> = {
    all: CODEX_ENTRIES.length,
    enemy: CODEX_ENTRIES.filter((e) => e.category === 'enemy').length,
    hybrid: CODEX_ENTRIES.filter((e) => e.category === 'hybrid').length,
    branch: CODEX_ENTRIES.filter((e) => e.category === 'branch').length,
    scale: 15, // шкалы бытия: иллюстрации public/assets/codex, считаются отдельно от записей
  };
  document.querySelectorAll('.codex-tab').forEach((tab) => {
    const cat = tab.getAttribute('data-cat') || 'all';
    tab.textContent = t(`codex_tab_${cat}` as I18nKey, { n: codexCounts[cat] ?? 0 });
  });

  // Help modal
  setText('help-title-el', 'help_title');
  setText('htab-basics', 'help_tab_basics');
  setText('htab-dna', 'help_tab_dna');
  setText('htab-world', 'help_tab_world');
  if (dom.helpCloseBtn) dom.helpCloseBtn.textContent = t('help_close');
  for (const prefix of ['b', 'd', 'w'] as const) {
    for (let i = 1; i <= 4; i++) {
      setText(`help-${prefix}${i}-t`, `help_${prefix}${i}_t` as I18nKey);
      setHtml(`help-${prefix}${i}-p`, `help_${prefix}${i}_p` as I18nKey);
    }
  }

  // Settings
  setText('settings-title-el', 'settings_title');
  setText('settings-subtitle-el', 'settings_sub');
  setText('set-flashes-name', 'settings_flashes');
  setText('set-flashes-hint', 'settings_flashes_hint');
  setText('set-shake-name', 'settings_shake');
  setText('set-shake-hint', 'settings_shake_hint');
  setText('set-parallax-name', 'settings_parallax');
  setText('set-parallax-hint', 'settings_parallax_hint');
  setText('set-quality-name', 'settings_quality');
  setText('set-quality-hint', 'settings_quality_hint');
  setText('set-lang-name', 'settings_lang');
  setText('set-lang-hint', 'settings_lang_hint');
  setText('set-bgm-name', 'settings_bgm');
  setText('set-sfx-name', 'settings_sfx');
  setText('set-backup-name', 'settings_backup');
  setText('set-backup-hint', 'settings_backup_hint');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n') as I18nKey | null;
    if (k) el.textContent = t(k);
  });
  document.querySelectorAll('.modal-x-btn').forEach((btn) => {
    btn.setAttribute('aria-label', t('close_aria'));
  });
  if (dom.settingsCloseBtn) dom.settingsCloseBtn.textContent = t('settings_close');
  setText('export-save-label', 'export_save');
  setText('import-save-label', 'import_save');

  syncRerollBtn(ctx);
  updateBranchChip(ctx);
  updateScaleHud(ctx);
  updateWeaponHud(ctx);
  renderBiolab(ctx);
  renderCodex(ctx);
  renderAchievements(ctx);
  if (dom.dailyModal?.classList.contains('show')) renderDailyModal(ctx);
  updateDailyHudPill(ctx);
}
