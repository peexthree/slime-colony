// Модальные окна: главное меню, биолаб, дневное испытание, достижения, кодекс,
// справка, настройки + переключатели звука/полноэкранного режима и пауза.
import { t, getLocale } from '../i18n';
import { dnaName, scaleName, scaleSub, trBiolab, trChallengeTitle, trCodex } from '../i18n/gameData';
import { CODEX_ENTRIES, loadCodex, loadMaxScale } from '../engine/codex';
import { SCALES } from '../engine/types';
import { ACHIEVEMENTS, loadAchievements } from '../engine/achievements';
import { addBiolabPoints, BIOLAB_UNLOCKS, BiolabCategory, MAX_ACTIVE_BIOLAB, getActiveIds, isActive, loadBiolab } from '../engine/biolab';
import { getDailyChallenge, isDailyCompleted } from '../engine/challenge';
import { ENEMY_SPRITES, ENEMY_SPRITES_V2, ENEMY_SPRITES_V4 } from '../engine/svgAssets';
import type { AchievementDef } from '../engine/achievements';
import type { Ctx } from '../game/context';
import { fmtTime, syncStagePhase, syncPauseButton } from './hud';
import { saveSettings } from '../game/save';
import { showToast } from './toast';

/** Какие модальные окна существуют в навигации */
export type ModalKind = 'intro' | 'biolab' | 'daily' | 'achievements' | 'codex' | 'help' | 'settings';

let lastModalFocus: HTMLElement | null = null;
let lastActiveModal: ModalKind | null = null;

/** Целевой модал для «назад»: меню, если игра не идёт или на паузе */
export function modalBackTarget(ctx: Ctx): ModalKind | null {
  return !ctx.started || (ctx.paused && !ctx.gameOver) ? 'intro' : null;
}

function modalElements(ctx: Ctx): Record<ModalKind, HTMLElement | null> {
  const dom = ctx.dom;
  return {
    intro: dom.intro,
    biolab: dom.biolabOverlay,
    daily: dom.dailyModal,
    achievements: dom.achievementsModal,
    codex: dom.codexModal,
    help: dom.helpModal,
    settings: dom.settingsModal,
  };
}

/** Показать/скрыть модальные окна (одно активное), фокус-ловушка доступности */
export function showModal(ctx: Ctx, which: ModalKind | null): void {
  const dom = ctx.dom;
  if (which !== null && lastActiveModal === null) {
    const active = document.activeElement as HTMLElement | null;
    if (active && !active.closest('#intro, #biolab, #daily-modal, #achievements-modal, #codex, #help-modal, #settings-modal, #upgrade')) {
      lastModalFocus = active;
    }
  }
  dom.intro.classList.toggle('show', which === 'intro');
  dom.biolabOverlay.classList.toggle('show', which === 'biolab');
  if (dom.dailyModal) dom.dailyModal.classList.toggle('show', which === 'daily');
  if (dom.achievementsModal) dom.achievementsModal.classList.toggle('show', which === 'achievements');
  if (dom.codexModal) dom.codexModal.classList.toggle('show', which === 'codex');
  if (dom.helpModal) dom.helpModal.classList.toggle('show', which === 'help');
  if (dom.settingsModal) dom.settingsModal.classList.toggle('show', which === 'settings');
  syncStagePhase(ctx);

  if (which === 'biolab') renderBiolab(ctx);
  if (which === 'daily') renderDailyModal(ctx);
  if (which === 'achievements') renderAchievements(ctx);
  if (which === 'codex') renderCodex(ctx);
  if (which === 'settings') syncSettingsUI(ctx);
  if (which === 'intro' && (dom.menuRecordText || dom.menuRecordBadge)) {
    const bl = loadBiolab();
    const recStr = t('record_badge', { time: fmtTime(bl.bestTime), runs: bl.runs, points: bl.points });
    if (dom.menuRecordText) dom.menuRecordText.textContent = recStr;
    else if (dom.menuRecordBadge) dom.menuRecordBadge.textContent = recStr;
  }

  if (which !== null) {
    const targetModal = modalElements(ctx)[which];
    const focusTarget = targetModal?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
    focusTarget?.focus({ preventScroll: true });
  } else if (lastModalFocus && lastModalFocus.isConnected) {
    lastModalFocus.focus({ preventScroll: true });
    lastModalFocus = null;
  }
  lastActiveModal = which;
}

// ---------- Настройки комфорта и звука ----------

/** Синхронизация UI настроек с gameSettings (кнопки/слайдеры/язык) */
export function syncSettingsUI(ctx: Ctx): void {
  const syncPressed = (selector: string, match: (btn: Element) => boolean) => {
    document.querySelectorAll(selector).forEach((btn) => {
      const active = match(btn);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };
  const s = ctx.settings;
  syncPressed('#opt-flashes .settings-btn', (btn) => btn.getAttribute('data-val') === s.screenFlashes);
  syncPressed('#opt-shake .settings-btn', (btn) => btn.getAttribute('data-val') === s.cameraShake);
  syncPressed('#opt-parallax .settings-btn', (btn) => btn.getAttribute('data-val') === (s.microParallax ? 'on' : 'off'));
  if (ctx.dom.sliderBgm) ctx.dom.sliderBgm.value = String(s.bgmVolume);
  if (ctx.dom.sliderSfx) ctx.dom.sliderSfx.value = String(s.sfxVolume);
  if (ctx.dom.bgmVolLabel) ctx.dom.bgmVolLabel.textContent = `${s.bgmVolume}%`;
  if (ctx.dom.sfxVolLabel) ctx.dom.sfxVolLabel.textContent = `${s.sfxVolume}%`;
  syncPressed('#opt-quality .settings-btn', (btn) => btn.getAttribute('data-val') === s.quality);
  syncPressed('#opt-lang .settings-btn', (btn) => btn.getAttribute('data-val') === getLocale());
}

/** Применить качество: доля агентов симуляции + bloom-канвас */
export function applyQualitySettings(ctx: Ctx): void {
  const ratio = ctx.settings.quality === 'low' ? 0.5 : 1.0;
  ctx.svc.sim.setQualityRatio(ratio);
  ctx.dom.bloomCanvas.style.display = ctx.settings.quality === 'low' ? 'none' : '';
}

/** Иконки звука: кнопка mute и слайдеры BGM/SFX */
export function syncAudioIcons(ctx: Ctx): void {
  const isMuted = ctx.svc.sfx.muted;
  const dom = ctx.dom;
  if (dom.muteBtnUse) dom.muteBtnUse.setAttribute('href', isMuted ? '#ico-sound-mute' : '#ico-sound-on');
  if (dom.muteBtn) {
    const label = t(isMuted ? 'unmute_btn_title' : 'mute_btn_title');
    dom.muteBtn.title = label;
    dom.muteBtn.setAttribute('aria-label', label);
    dom.muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  }
  if (dom.setBgmIcoUse) {
    dom.setBgmIcoUse.setAttribute('href', isMuted || ctx.settings.bgmVolume === 0 ? '#ico-sound-mute' : '#ico-sound-on');
  }
  if (dom.setSfxIcoUse) {
    dom.setSfxIcoUse.setAttribute('href', isMuted || ctx.settings.sfxVolume === 0 ? '#ico-sound-mute' : '#ico-sound-on');
  }
}

/** Кнопка полноэкранного режима: поддержка и активное состояние */
export function syncFullscreenButton(ctx: Ctx): void {
  const fullscreenBtn = ctx.dom.fullscreenBtn;
  if (!fullscreenBtn) return;
  const supported = Boolean(document.fullscreenEnabled);
  fullscreenBtn.hidden = !supported;
  if (!supported) return;
  const active = Boolean(document.fullscreenElement);
  const label = t(active ? 'exit_fullscreen_btn_title' : 'fullscreen_btn_title');
  fullscreenBtn.title = label;
  fullscreenBtn.setAttribute('aria-label', label);
  fullscreenBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

export function toggleMuteAction(ctx: Ctx): void {
  ctx.svc.sfx.unlock();
  const isMuted = ctx.svc.sfx.toggleMute();
  ctx.settings.muted = isMuted;
  saveSettings(ctx);
  syncAudioIcons(ctx);
  showToast(
    ctx,
    `<svg class="bio-icon ${isMuted ? 'bio-amber' : 'bio-cyan'}" viewBox="0 0 32 32" aria-hidden="true"><use href="#${isMuted ? 'ico-sound-mute' : 'ico-sound-on'}"/></svg> ${t(isMuted ? 'toast_muted' : 'toast_unmuted')}`
  );
}

export async function toggleFullscreenAction(ctx: Ctx): Promise<void> {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await ctx.dom.stage.requestFullscreen();
    }
  } catch {
    // Отклонено политикой браузера или жестом без фокуса
  } finally {
    syncFullscreenButton(ctx);
  }
}

export function togglePause(ctx: Ctx): void {
  if (!ctx.started || ctx.gameOver || ctx.dying || ctx.pendingUps > 0) return;
  ctx.paused = !ctx.paused;
  if (ctx.paused) {
    ctx.svc.sfx.setTailDrone(false);
    ctx.svc.sfx.stopBgm();
    showModal(ctx, 'intro');
  } else {
    ctx.svc.sfx.startBgm();
    showModal(ctx, null);
  }
}

// ---------- Справка ----------

let helpOpenedFromGame = false;

/** Флаг «справка открыта из боя» (пауза при закрытии снимается) */
export function setHelpOpenedFromGame(v: boolean): void {
  helpOpenedFromGame = v;
}

/** Чтение флага для обработчиков Escape и крестиков модалок */
export function isHelpOpenedFromGame(): boolean {
  return helpOpenedFromGame;
}

export function closeHelpModal(ctx: Ctx): void {
  if (helpOpenedFromGame) {
    helpOpenedFromGame = false;
    ctx.paused = false;
    ctx.svc.sfx.startBgm();
    showModal(ctx, null);
  } else {
    showModal(ctx, !ctx.started || ctx.paused ? 'intro' : null);
  }
}

// ---------- Бестиарий и Кодекс Гибридов: постраничная кнопочная навигация (Без скролла) ----------

let codexCategory: 'all' | 'enemy' | 'hybrid' | 'branch' | 'scale' = 'all';
let codexPage = 0;
const CODEX_PAGE_SIZE = 6;

export function codexIconSvg(entryId: string, category: string, fallbackIconId: string): string {
  if (category === 'enemy') {
    const map: Record<string, string> = {
      grub: ENEMY_SPRITES.grub,
      runner: ENEMY_SPRITES.runner,
      brute: ENEMY_SPRITES.brute,
      spitter: ENEMY_SPRITES.spitter,
      pulsar: ENEMY_SPRITES.pulsar,
      boss: ENEMY_SPRITES_V4.boss,
      titan: ENEMY_SPRITES.titan,
      healer: ENEMY_SPRITES_V2.healer,
      mirror: ENEMY_SPRITES_V2.mirror,
      colony: ENEMY_SPRITES_V2.colony,
      splitter: ENEMY_SPRITES_V2.splitter,
      brood: ENEMY_SPRITES_V2.brood,
    };
    if (map[entryId]) return map[entryId];
  }
  const vb = category === 'hybrid' ? '0 0 48 48' : '0 0 32 32';
  return `<svg viewBox="${vb}" aria-hidden="true"><use href="#${fallbackIconId}"/></svg>`;
}

/** Кодекс: сетка записей с фильтром по категории и пагинацией */
export function renderCodex(ctx: Ctx): void {
  const codexGridEl = ctx.dom.codexGridEl;
  const unlocked = loadCodex();
  if (ctx.dom.codexStatsEl) {
    ctx.dom.codexStatsEl.textContent = t('codex_stats', { unlocked: unlocked.size, total: CODEX_ENTRIES.length });
  }

  const filtered = CODEX_ENTRIES.filter((e) => {
    if (codexCategory === 'all') return true;
    return e.category === codexCategory;
  });

  const maxPage = Math.max(0, Math.ceil(filtered.length / CODEX_PAGE_SIZE) - 1);
  if (codexPage > maxPage) codexPage = maxPage;
  if (codexPage < 0) codexPage = 0;

  if (ctx.dom.codexPageInfo) {
    ctx.dom.codexPageInfo.textContent = t('codex_page', { cur: codexPage + 1, max: Math.max(1, maxPage + 1) });
  }

  if (ctx.dom.codexPrevBtn) ctx.dom.codexPrevBtn.disabled = codexPage <= 0;
  if (ctx.dom.codexNextBtn) ctx.dom.codexNextBtn.disabled = codexPage >= maxPage;

  if (!codexGridEl) return;
  codexGridEl.innerHTML = '';

  if (codexCategory === 'scale') {
    renderScaleCards(codexGridEl);
    return;
  }

  const start = codexPage * CODEX_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + CODEX_PAGE_SIZE);

  for (const entry of pageItems) {
    const isUnl = unlocked.has(entry.id);
    const item = document.createElement('div');
    item.className = 'codex-item ' + (isUnl ? 'unlocked' : 'locked');
    const catLabel = entry.category === 'enemy'
      ? t('codex_cat_enemy')
      : entry.category === 'hybrid'
        ? t('codex_cat_hybrid')
        : t('codex_cat_branch');
    const trE = trCodex(entry.id, entry.name, entry.lore, entry.bonus);
    item.innerHTML = `
      <div class="codex-item-top">
        <div class="codex-icon-wrap" style="color: ${isUnl ? entry.color : '#70879e'};">
          ${codexIconSvg(entry.id, entry.category, entry.iconId)}
        </div>
        <div class="codex-meta">
          <span class="codex-cat-badge" style="color: ${entry.color};">${catLabel}</span>
          <div class="codex-item-title" style="color: ${isUnl ? entry.color : '#9ab0c4'};">
            ${isUnl ? trE.name : t('codex_unknown_title')}
          </div>
        </div>
      </div>
      <div class="codex-lore">${isUnl ? trE.lore : t('codex_unknown_lore')}</div>
      <div class="codex-bonus">${isUnl && trE.bonus ? `<svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-symbiont"/></svg> ${t('codex_bonus_prefix')}${trE.bonus}` : t('codex_need_research')}</div>
    `;
    codexGridEl.appendChild(item);
  }
}

/** Кодекс: карточки 15 шкал бытия с иллюстрациями public/assets/codex */
function renderScaleCards(grid: HTMLElement): void {
  const maxScale = loadMaxScale();
  for (const scale of SCALES) {
    const visited = scale.id <= maxScale;
    const glowHex = `#${scale.glow.toString(16).padStart(6, '0')}`;
    const item = document.createElement('div');
    item.className = 'codex-item scale-item ' + (visited ? 'unlocked scale-visited' : 'locked scale-ahead');
    item.innerHTML = `
      <div class="codex-scale-img-wrap">
        <img loading="lazy" src="/assets/codex/scale-${String(scale.id).padStart(2, '0')}.webp" alt="${scaleName(scale.id)}" />
        <span class="codex-scale-num">${scale.id}/15</span>
      </div>
      <div class="codex-item-top">
        <div class="codex-meta">
          <span class="codex-cat-badge" style="color: ${glowHex};">${t('codex_cat_scale')}</span>
          <div class="codex-item-title" style="color: ${visited ? glowHex : '#9ab0c4'};">${scaleName(scale.id)}</div>
        </div>
      </div>
      <div class="codex-lore">${scaleSub(scale.id)}</div>
      <div class="codex-bonus">${t(visited ? 'codex_scale_visited' : 'codex_scale_ahead')}</div>
    `;
    grid.appendChild(item);
  }
}

/** Переключение вкладки кодекса (кнопки-фильтры) */
export function setCodexCategory(ctx: Ctx, cat: 'all' | 'enemy' | 'hybrid' | 'branch' | 'scale'): void {
  codexCategory = cat;
  codexPage = 0;
  renderCodex(ctx);
}

export function codexPrevPage(ctx: Ctx): void {
  if (codexPage > 0) {
    codexPage--;
    renderCodex(ctx);
  }
}

export function codexNextPage(ctx: Ctx): void {
  codexPage++;
  renderCodex(ctx);
}

// ---------- Биолаб: мета-прогрессия между забегами ----------

/** Биолаб: очки, слоты и карточки модулей по категориям */
export function renderBiolab(ctx: Ctx): void {
  const bl = loadBiolab();
  const ownedCount = BIOLAB_UNLOCKS.filter((u) => bl.unlocked.includes(u.id)).length;
  const activeCount = getActiveIds(bl).length;
  const pct = Math.round((ownedCount / BIOLAB_UNLOCKS.length) * 100);
  ctx.dom.biolabPointsEl.innerHTML =
    `<svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-incubator"/></svg> ${t('biolab_points', { pts: bl.points, owned: ownedCount, total: BIOLAB_UNLOCKS.length, pct, best: fmtTime(bl.bestTime) })}`;
  if (ctx.dom.biolabSlotsPillEl) {
    ctx.dom.biolabSlotsPillEl.textContent = t('biolab_slots', { active: activeCount, max: MAX_ACTIVE_BIOLAB });
  }
  if (ctx.dom.biolabDisableAllBtn) {
    ctx.dom.biolabDisableAllBtn.disabled = activeCount === 0;
  }

  ctx.dom.biolabListEl.innerHTML = '';
  const categories: BiolabCategory[] = ['form', 'dna', 'passive'];
  for (const cat of categories) {
    const catHead = document.createElement('div');
    catHead.className = 'bl-section-title';
    catHead.textContent = t(`biolab_cat_${cat}` as Parameters<typeof t>[0]);
    ctx.dom.biolabListEl.appendChild(catHead);

    for (const u of BIOLAB_UNLOCKS.filter((item) => item.category === cat)) {
      const bought = bl.unlocked.includes(u.id);
      const active = bought && isActive(u.id, bl);
      const can = !bought && bl.points >= u.cost;
      const trB = trBiolab(u.id, u.name, u.effect);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'bl-card' + (active ? ' owned' : bought ? ' disabled-mod' : can ? ' afford' : '');
      card.dataset.id = u.id;
      card.setAttribute('aria-pressed', bought ? (active ? 'true' : 'false') : 'false');
      let ico = 'ico-node-gen';
      let icoVb = '0 0 32 32';
      if (u.id.includes('orbs')) ico = 'ico-weapon-orbs';
      else if (u.id.includes('aura')) ico = 'ico-weapon-aura';
      else if (u.id.includes('tail')) ico = 'ico-tail-length';
      else if (u.id.includes('nova')) ico = 'ico-weapon-nova';
      else if (u.id.includes('magnet')) ico = 'ico-node-magnet';
      else if (u.id.includes('regen')) ico = 'ico-node-gen';
      else if (u.id === 'perm_dmg') { ico = 'ico-perm-dmg'; icoVb = '0 0 64 64'; }
      else if (u.id === 'perm_armor') { ico = 'ico-perm-armor'; icoVb = '0 0 64 64'; }
      else if (u.id === 'unlock_vermis') ico = 'ico-vermis';
      else if (u.id === 'unlock_chimera') ico = 'ico-chimera';
      else if (u.id === 'unlock_mycelium') ico = 'ico-mycelium';
      else if (u.id === 'unlock_symbiont') ico = 'ico-symbiont';

      const costLabel = active
        ? t('biolab_bought')
        : bought
          ? t('biolab_disabled')
          : t('biolab_cost', { cost: u.cost });

      card.innerHTML =
        `<div class="bl-head"><h3><svg class="bio-icon bio-cyan" viewBox="${icoVb}" style="width:16px;height:16px;vertical-align:-3px;margin-right:5px;" aria-hidden="true"><use href="#${ico}"/></svg>${trB.name}</h3><span class="bl-cost">${costLabel}</span></div>` +
        `<p>${trB.effect}</p>`;
      ctx.dom.biolabListEl.appendChild(card);
    }
  }
}

// ---------- Дневное испытание ----------

/** HUD-пилюля дневного испытания: прогресс цели дня */
export function updateDailyHudPill(ctx: Ctx): void {
  const dailyHudPillEl = ctx.dom.dailyHudPillEl;
  if (!dailyHudPillEl) return;
  if (!ctx.dailyRunActive) {
    dailyHudPillEl.hidden = true;
    dailyHudPillEl.classList.remove('done');
    return;
  }
  dailyHudPillEl.hidden = false;
  dailyHudPillEl.classList.toggle('done', ctx.dailyRunDone);
  dailyHudPillEl.textContent = ctx.dailyRunDone
    ? t('daily_hud_done')
    : t('daily_hud_progress', { cur: fmtTime(ctx.gameTime), goal: fmtTime(ctx.dailyInfo.goalTimeSec), scale: ctx.dailyInfo.goalScale });
}

/** Брифинг дневного испытания: механика, геном дня, модификаторы и статус цели */
export function renderDailyModal(ctx: Ctx): void {
  const dailyBriefBody = ctx.dom.dailyBriefBody;
  if (!dailyBriefBody) return;
  const ch = getDailyChallenge();
  const en = getLocale() === 'en';
  const done = isDailyCompleted(ch.dayKey);
  const dnaTitle = dnaName(ch.branch);
  const modName = en ? ch.modNameEn : ch.modNameRu;
  const modDesc = en ? ch.modDescEn : ch.modDescRu;
  const goalDesc = en ? ch.goalDescEn : ch.goalDescRu;
  const challengeTitle = trChallengeTitle(ch.branch, ch.title);
  dailyBriefBody.innerHTML = `
    <div class="daily-box">
      <h3>${t('daily_what_title')}</h3>
      <p>${t('daily_what_desc', { pts: ch.bonusPoints })}</p>
    </div>
    <div class="daily-box">
      <h3>${t('daily_genome_title', { day: ch.dayKey })}</h3>
      <p><svg class="chip-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${ch.branch}"/></svg><strong>${dnaTitle}</strong> · ${challengeTitle}</p>
    </div>
    <div class="daily-box full">
      <h3>${t('daily_mods_title', { name: modName })}</h3>
      <p>${modDesc}</p>
    </div>
    <div class="daily-box full">
      <h3>${t('daily_goal_title')}</h3>
      <p>${goalDesc}</p>
      <div class="daily-status-pill" style="color:${done ? '#00ff9d' : '#fde047'};">
        ${t(done ? 'daily_status_done' : 'daily_status_todo', { pts: ch.bonusPoints })}
      </div>
    </div>
  `;
}

// ---------- Достижения ----------

/** Сетка достижений: открытые и заблокированные с наградами */
export function renderAchievements(ctx: Ctx): void {
  const unlocked = loadAchievements();
  const en = getLocale() === 'en';
  if (ctx.dom.achievementsOpenLabel) {
    ctx.dom.achievementsOpenLabel.textContent = t('achievements_btn', { unlocked: unlocked.size, total: ACHIEVEMENTS.length });
  }
  if (ctx.dom.achStatsPillEl) {
    ctx.dom.achStatsPillEl.textContent = t('ach_stats', { unlocked: unlocked.size, total: ACHIEVEMENTS.length });
  }
  if (ctx.dom.achProgressEl) {
    ctx.dom.achProgressEl.max = ACHIEVEMENTS.length;
    ctx.dom.achProgressEl.value = unlocked.size;
  }
  const achievementsGridEl = ctx.dom.achievementsGridEl;
  if (!achievementsGridEl) return;
  achievementsGridEl.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const has = unlocked.has(a.id);
    const item = document.createElement('div');
    item.className = 'ach-item ' + (has ? 'unlocked' : 'locked');
    const title = en ? a.titleEn : a.title;
    const desc = en ? a.descEn : a.desc;
    item.innerHTML = `
      <div class="ach-ico"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#${a.iconId}"/></svg></div>
      <div class="ach-info">
        <div class="ach-head">
          <h3>${title}</h3>
          <span class="ach-badge" style="color:${has ? '#fde047' : '#9ab0c4'};">${t(has ? 'ach_unlocked' : 'ach_locked')}</span>
        </div>
        <p>${desc}</p>
        <span class="ach-badge" style="color:${has ? '#00ff9d' : '#f59e0b'};">${t('ach_reward', { pts: a.reward })}</span>
      </div>
    `;
    achievementsGridEl.appendChild(item);
  }
}

/** Выдать новые достижения: очки биолаба, перерисовка, тосты (с пачкой за раз) */
export function grantAchievements(ctx: Ctx, newly: AchievementDef[]): void {
  if (newly.length === 0) return;
  const en = getLocale() === 'en';
  let pts = 0;
  for (const a of newly) pts += a.reward;
  if (pts > 0) addBiolabPoints(pts);
  renderAchievements(ctx);
  if (!ctx.dying && !ctx.gameOver) ctx.svc.sfx.biolabUnlock();
  for (const ach of newly) {
    const title = en ? ach.titleEn : ach.title;
    showToast(
      ctx,
      `<svg class="bio-icon bio-amber" viewBox="0 0 64 64" aria-hidden="true"><use href="#${ach.iconId}"/></svg> ` +
      `${en ? 'ACHIEVEMENT' : 'ДОСТИЖЕНИЕ'}: ${title} (+${ach.reward})`,
      'success'
    );
  }
}

// Иконка паузы синхронизируется через hud.syncPauseButton (переэкспорт для событий)
export { syncPauseButton };
