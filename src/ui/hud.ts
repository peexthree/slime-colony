// HUD: чип генома, ДНК-панель, шкала бытия, кулдауны оружий, резонанс,
// HP/XP/таймер/волна/убийства, босс-бар, статус-пилюли и фаза сцены.
import { t, getLocale } from '../i18n';
import { dnaName, hybridName, scaleName, scaleSub, trNode } from '../i18n/gameData';
import {
  CYSTS, DASH, DNA_LEVELS, DnaBranch, HYBRIDS, MANDIBLES, MAX_EQUIPPED_WEAPONS,
  NOVA, RING, CALL, SCALES, SPIKES, WEAPON_BRANCH, WEAPON_MAX_LVL, WEAPON_UNLOCK_LEVEL,
  type WeaponId,
} from '../engine/types';
import { FOREIGN_BRANCH_PENALTY, equippedWeaponCount } from '../game/progression';
import { effAtkSpd, dnaLvl, maxTail, RESONANCE_WINDOW } from '../game/state';
import { NODE_NAMES, NODE_POS_EFFECTS, NODE_NEG_EFFECTS } from '../game/nodes';
import type { RunState } from '../game/state';
import type { Ctx } from '../game/context';

/** Формат времени MM:SS */
export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------- Рамка сцены: биом-палитра каждой из 15 локаций (синхронно с SCALE_FORM) ----------

const STAGE_BIOMES: { bg: string; rgb: string }[] = [
  { bg: '#03141c', rgb: '102, 252, 241' },   // 1 капля
  { bg: '#0c1c05', rgb: '154, 230, 110' },   // 2 агара
  { bg: '#051c12', rgb: '87, 230, 169' },    // 3 тракт
  { bg: '#04161c', rgb: '56, 189, 248' },    // 4 лимфа
  { bg: '#040f24', rgb: '77, 141, 255' },    // 5 океан
  { bg: '#14161a', rgb: '226, 232, 240' },   // 6 кость
  { bg: '#0d0620', rgb: '139, 92, 246' },    // 7 синапсы
  { bg: '#1a1303', rgb: '251, 191, 36' },    // 8 выдох
  { bg: '#031a10', rgb: '52, 211, 153' },    // 9 тайги
  { bg: '#1c0d04', rgb: '249, 115, 22' },    // 10 ржавые дюны
  { bg: '#1c0b03', rgb: '255, 138, 61' },    // 11 разлом
  { bg: '#061722', rgb: '125, 211, 252' },   // 12 полярный щит
  { bg: '#052026', rgb: '165, 243, 252' },   // 13 небесный планктон
  { bg: '#1b0620', rgb: '240, 171, 252' },   // 14 ионосфера
  { bg: '#130424', rgb: '168, 85, 247' },    // 15 фрактал
];

/** Перекрасить рамку сцены в биом текущей шкалы */
export function updateStageBiome(ctx: Ctx, scId: number): void {
  const theme = STAGE_BIOMES[Math.max(0, Math.min(SCALES.length - 1, scId - 1))];
  const stage = ctx.dom.stage;
  stage.style.background = theme.bg;
  stage.style.borderColor = `rgba(${theme.rgb}, 0.35)`;
  stage.style.boxShadow = `0 0 60px rgba(${theme.rgb}, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)`;
}

// ---------- Чип генома, ДНК-панель, шкала бытия ----------

/** Чип генома в HUD: активный гибрид сильнее, иначе лидер по ДНК-уровням */
export function updateBranchChip(ctx: Ctx): void {
  const branchChipEl = ctx.dom.branchChipEl;
  const hy = HYBRIDS.find((h) => h.id === ctx.mainGenome);
  if (hy) {
    const hybridSlug = hy.id.replace(/_/g, '-');
    branchChipEl.innerHTML = `<svg class="chip-ico" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg> ${hybridName(hy.id)}`;
    branchChipEl.dataset.branch = 'hybrid';
    return;
  }
  const b = ctx.mainGenome;
  branchChipEl.innerHTML = b === 'neutral'
    ? t('hud_specimen')
    : `<svg class="chip-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${b}"/></svg> ${dnaName(b as DnaBranch)}`;
  branchChipEl.dataset.branch = b;
}

/** ДНК-панель: прогресс каждого генома к следующему уровню */
export function updateDnaHud(ctx: Ctx): void {
  for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
    const row = document.getElementById(`dna-${b}`);
    if (!row) continue;
    const fill = row.querySelector('.dna-fill') as HTMLElement;
    const lvlEl = row.querySelector('.dna-lvl') as HTMLElement;
    const lvl = dnaLvl(ctx, b);
    const th = DNA_LEVELS;
    const cur = ctx.dnaXp[b];
    const prev = lvl === 0 ? 0 : th[lvl - 1];
    const next = lvl >= 3 ? th[2] : th[lvl];
    const frac = lvl >= 3 ? 1 : Math.max(0, Math.min(1, (cur - prev) / Math.max(1, next - prev)));
    fill.style.width = `${(frac * 100).toFixed(1)}%`;
    lvlEl.textContent = lvl >= 3 ? '3+★' : String(lvl);
    row.dataset.max = lvl >= 3 ? '1' : '0';
  }
}

/** Шкала бытия: имя масштаба и заполнение биомассы до Титана */
export function updateScaleHud(ctx: Ctx): void {
  const sc = SCALES[ctx.scaleIdx];
  ctx.dom.scaleChipEl.textContent = `${t('hud_scale')} ${sc.id} — ${scaleName(sc.id)}`;
  ctx.dom.scaleChipEl.title = scaleSub(sc.id);
  const goal = sc.biomassGoal;
  const frac = Math.min(1, ctx.biomass / goal);
  ctx.dom.bioFillEl.style.width = `${(frac * 100).toFixed(1)}%`;
  ctx.dom.bioFillEl.classList.toggle('titan-ready', frac >= 1);
}

// ---------- Кулдауны оружий ----------

function setSlot(el: HTMLElement | null, frac: number, lvl: number, labelOverride?: string, tooltip?: string): void {
  if (!el) return;
  const ring = el.querySelector('.wh-ring') as HTMLElement;
  const lvlEl = el.querySelector('.wh-lvl') as HTMLElement;
  const clamped = Math.max(0, Math.min(1, frac));
  ring.style.background = `conic-gradient(var(--cyan) ${Math.round(clamped * 360)}deg, rgba(255,255,255,0.1) 0deg)`;
  lvlEl.textContent = labelOverride ?? (lvl > 0 ? t('wh_lvl', { lvl }) : t('wh_locked'));
  if (tooltip) el.title = tooltip;
  el.classList.toggle('locked', lvl === 0);
  el.classList.toggle('ready', clamped >= 1 && lvl > 0);
}

/** Слоты оружий и навыков: кольца перезарядки + подписи блокировок */
export function updateWeaponHud(ctx: Ctx): void {
  const wSlots = ctx.dom.wSlots;
  const wlvl = ctx.wlvl;
  const slotsFull = equippedWeaponCount(wlvl) >= MAX_EQUIPPED_WEAPONS;
  const mainBranch = mainBranchSafe(ctx);
  const lockedLabel = (id: WeaponId): string | undefined => {
    if (wlvl[id] > 0) return undefined;
    if (slotsFull) return t('wh_slot_cap');
    const foreign = mainBranch !== null && WEAPON_BRANCH[id] !== mainBranch;
    const req = WEAPON_UNLOCK_LEVEL[id] + (foreign ? FOREIGN_BRANCH_PENALTY : 0);
    return req > 1 ? t('wh_unlock_lvl', { lvl: req }) : t('wh_locked');
  };
  const spIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.spikes - 1));
  const spMax = SPIKES.cd[spIdx] / effAtkSpd(ctx);
  setSlot(wSlots.spikes, wlvl.spikes > 0 ? 1 - Math.max(0, ctx.spikesCd) / spMax : 0, wlvl.spikes, lockedLabel('spikes'), t('w_name_spikes'));
  setSlot(wSlots.orbs, 1, wlvl.orbs, lockedLabel('orbs'), t('w_name_orbs'));
  const nvIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.nova - 1));
  const nvMax = (NOVA.cd[nvIdx] * ctx.biolabNovaCdMul * (ctx.genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd(ctx);
  setSlot(wSlots.nova, wlvl.nova > 0 ? 1 - Math.max(0, ctx.novaCd) / nvMax : 0, wlvl.nova, lockedLabel('nova'), t('w_name_nova'));
  setSlot(wSlots.aura, 1, wlvl.aura, lockedLabel('aura'), t('w_name_aura'));

  const mandIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.mandibles - 1));
  const mandMax = MANDIBLES.cd[mandIdx] / effAtkSpd(ctx);
  setSlot(wSlots.mandibles, wlvl.mandibles > 0 ? 1 - Math.max(0, ctx.mandiblesCd) / mandMax : 0, wlvl.mandibles, lockedLabel('mandibles'), t('w_name_mandibles'));

  const cystIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.cysts - 1));
  const cystMax = CYSTS.cd[cystIdx] / effAtkSpd(ctx);
  setSlot(wSlots.cysts, wlvl.cysts > 0 ? 1 - Math.max(0, ctx.cystsCd) / cystMax : 0, wlvl.cysts, lockedLabel('cysts'), t('w_name_cysts'));

  const dashReady = ctx.dashCd <= 0;
  const dashMaxCd = Math.max(0.8, DASH.cd + ctx.dailyDashCdDelta);
  setSlot(
    wSlots.dash,
    1 - Math.max(0, ctx.dashCd) / dashMaxCd,
    1,
    dashReady ? t('wh_dash_key') : `${ctx.dashCd.toFixed(1)}s`,
    t('w_name_dash')
  );
  const callReady = ctx.callCd <= 0;
  setSlot(
    wSlots.call,
    1 - Math.max(0, ctx.callCd) / CALL.cd,
    1,
    callReady ? t('wh_call_key') : `${Math.ceil(ctx.callCd)}s`,
    t('w_name_call')
  );
  const ringReady = ctx.ringCd <= 0;
  setSlot(
    wSlots.ring,
    1 - Math.max(0, ctx.ringCd) / RING.cooldown,
    ctx.pathHistory.length >= 24 ? 1 : 0,
    ringReady ? t('wh_ring_key') : `${ctx.ringCd.toFixed(1)}s`,
    t('w_name_ring')
  );
}

/** Локальный импорт через параметр, чтобы не тянуть цикл: доминирующая ветка */
function mainBranchSafe(ctx: RunState): DnaBranch | null {
  const g = ctx.mainGenome;
  if (g === 'neutral') return null;
  if (HYBRIDS.some((h) => h.id === g)) return null;
  return g as DnaBranch;
}

// ---------- Резонанс ----------

/** Панель Симбиотического Резонанса: множитель, серия, окно таймера */
export function updateResonanceHud(ctx: Ctx): void {
  const resHudEl = ctx.dom.resHudEl;
  if (!resHudEl) return;
  const active = ctx.resonanceTimer > 0 && ctx.resonanceStreak >= 2;
  resHudEl.classList.toggle('show', active);
  resHudEl.classList.toggle('tier-mid', ctx.resonanceMult >= 1.5 && ctx.resonanceMult < 2.5);
  resHudEl.classList.toggle('tier-high', ctx.resonanceMult >= 2.5);
  if (ctx.dom.resMultEl) ctx.dom.resMultEl.textContent = `x${ctx.resonanceMult.toFixed(1)}`;
  if (ctx.dom.resStreakEl) ctx.dom.resStreakEl.textContent = String(ctx.resonanceStreak);
  if (ctx.dom.resBarFillEl) {
    const pct = Math.max(0, Math.min(100, (ctx.resonanceTimer / RESONANCE_WINDOW) * 100));
    ctx.dom.resBarFillEl.style.width = `${pct}%`;
  }
}

// ---------- Фаза сцены и кнопка паузы ----------

/** data-phase сцены: menu / gameover / paused / playing (синхронизирует виньетку и фон) */
export function syncStagePhase(ctx: Ctx): void {
  const dom = ctx.dom;
  const anyModal =
    dom.intro.classList.contains('show') ||
    dom.biolabOverlay.classList.contains('show') ||
    Boolean(dom.dailyModal?.classList.contains('show')) ||
    Boolean(dom.achievementsModal?.classList.contains('show')) ||
    Boolean(dom.codexModal?.classList.contains('show')) ||
    Boolean(dom.helpModal?.classList.contains('show')) ||
    Boolean(dom.settingsModal?.classList.contains('show')) ||
    dom.upgradeModal.classList.contains('show');
  if (!ctx.started) {
    dom.stage.dataset.phase = 'menu';
  } else if (ctx.gameOver) {
    dom.stage.dataset.phase = 'gameover';
  } else if (ctx.paused || anyModal) {
    dom.stage.dataset.phase = 'paused';
  } else {
    dom.stage.dataset.phase = 'playing';
  }
  syncPauseButton(ctx);
}

/** Иконка кнопки паузы: play/pause */
export function syncPauseButton(ctx: Ctx): void {
  const { pauseBtn, pauseBtnUse } = ctx.dom;
  if (pauseBtnUse) pauseBtnUse.setAttribute('href', ctx.paused ? '#ico-play' : '#ico-pause');
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed', ctx.paused ? 'true' : 'false');
}

// ---------- Основной HUD-синк (каждый шаг симуляции) ----------

/** Полный синк боевого HUD: полосы, счётчики, чипы узлов, босс-бар, статусы, BGM */
export function updateHud(ctx: Ctx): void {
  const dom = ctx.dom;
  dom.hpFillEl.style.width = `${Math.max(0, (ctx.player.hp / ctx.maxHp) * 100)}%`;
  dom.hpNumEl.textContent = `${Math.ceil(ctx.player.hp)}/${ctx.maxHp}`;
  const xpPct = `${Math.min(100, (ctx.xp / ctx.xpNext) * 100)}%`;
  if (dom.xpConduitFillEl) dom.xpConduitFillEl.style.width = xpPct;
  dom.levelEl.textContent = `${t('hud_lvl')} ${ctx.level}`;
  dom.timerEl.textContent = fmtTime(ctx.gameTime);
  dom.waveEl.textContent = `${t('hud_cycle')} ${Math.floor(ctx.gameTime / 30) + 1}`;
  dom.killsEl.textContent = `x${ctx.kills}`;
  // Хвост-ресурс: счётчик + цвет состояния + мигание при голоде
  dom.tailNumEl.textContent = `${Math.round(ctx.tailLen)}/${Math.round(maxTail(ctx))}`;
  dom.tailFillEl.style.width = `${Math.min(100, (ctx.tailLen / maxTail(ctx)) * 100)}%`;
  dom.hpWrapEl.dataset.state = ctx.tailState;
  dom.hpWrapEl.classList.toggle('hunger', ctx.sinceSoul > 3);
  // Захваченные узлы: иконки прямо в HUD с тултипами
  let chip = '';
  for (const n of ctx.bioNodes) {
    if (n.owner === 1) {
      const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
      chip += `<svg class="chip-node-ico" viewBox="0 0 32 32" title="${tn.name}: ${tn.pos}"><use href="#ico-node-${n.kind}"/></svg>`;
    }
  }
  dom.nodesChipEl.innerHTML = chip || `<span class="dim">${t('no_nodes')}</span>`;

  updateBossHud(ctx);
  updateStatusChips(ctx);

  // BGM адаптивная интенсивность
  ctx.svc.sfx.setBgmIntensity(SCALES[ctx.scaleIdx].id, ctx.titanPending || ctx.enemies.some((e) => e.type === 'boss'));

  // Кулдауны оружий и зова
  updateWeaponHud(ctx);
  // Дрон тревоги звучит только в критике хвоста
  ctx.svc.sfx.setTailDrone(ctx.tailState === 'crit');

  // Органическая низкоуровневая виньетка при критическом здоровье (без стробоскопа)
  const hpRatio = ctx.player.hp / ctx.maxHp;
  if (hpRatio < 0.35 && ctx.settings.screenFlashes !== 'off') {
    dom.hurtEl.classList.add('low-hp');
  } else {
    dom.hurtEl.classList.remove('low-hp');
  }
}

/** Босс-бар активного Стража Цикла или Титана Масштаба */
function updateBossHud(ctx: Ctx): void {
  const dom = ctx.dom;
  const activeBoss = ctx.enemies.find((e) => e.titan && e.hp > 0 && e.infected <= 0)
    ?? ctx.enemies.find((e) => e.type === 'boss' && e.hp > 0 && e.infected <= 0);
  if (dom.bossHudEl && dom.bossNameEl && dom.bossHpTextEl && dom.bossHpFillEl) {
    if (activeBoss) {
      dom.bossHudEl.classList.add('show');
      dom.bossHudEl.classList.toggle('titan', Boolean(activeBoss.titan));
      const sc = SCALES[ctx.scaleIdx];
      const baseName = activeBoss.titan ? `${t('boss_titan')} · ${scaleName(sc.id)}` : t('boss_guardian');
      dom.bossNameEl.textContent = activeBoss.enragedPhase ? `${baseName} · ${t('boss_enraged')}` : baseName;
      if (dom.bossHudIcoUse) dom.bossHudIcoUse.setAttribute('href', activeBoss.titan ? '#ico-macro-scale' : '#ico-skull-hazard');
      const bPct = Math.max(0, Math.min(100, (activeBoss.hp / Math.max(1, activeBoss.maxHp)) * 100));
      dom.bossHpFillEl.style.width = `${bPct.toFixed(1)}%`;
      dom.bossHpTextEl.textContent = `${Math.ceil(activeBoss.hp)}/${Math.round(activeBoss.maxHp)}`;
    } else {
      dom.bossHudEl.classList.remove('show');
    }
  }
}

/** Тактические статус-пилюли (обновляются только при смене состояния) */
function updateStatusChips(ctx: Ctx): void {
  const statusChipsEl = ctx.dom.statusChipsEl;
  if (!statusChipsEl) return;
  const stagnating = ctx.idleTime > 2.5;
  const key = `${ctx.trailOwn ? 1 : 0}${ctx.trailEnemy ? 1 : 0}${ctx.neuralLinkActive ? 1 : 0}${ctx.bloomBuffT > 0 ? 1 : 0}${ctx.relicCarapace && ctx.carapaceShieldReady ? 1 : 0}${ctx.ampOwned ? 1 : 0}${stagnating ? 1 : 0}:${getLocale()}`;
  if (key !== ctx.lastStatusKey) {
    ctx.lastStatusKey = key;
    const pills: string[] = [];
    const pillIco = (id: string) => `<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#${id}"/></svg>`;
    if (ctx.trailOwn) pills.push(`<span class="status-pill" style="color:var(--cyan)">${pillIco('ico-chip-haste')}${t('status_own_strain')}</span>`);
    if (ctx.trailEnemy) pills.push(`<span class="status-pill" style="color:var(--red)">${pillIco('ico-chip-poison')}${t('status_enemy_strain')}</span>`);
    if (ctx.neuralLinkActive) pills.push(`<span class="status-pill" style="color:#00ff9d">${pillIco('ico-chip-regen')}${t('status_neural')}</span>`);
    if (ctx.bloomBuffT > 0) pills.push(`<span class="status-pill" style="color:var(--lime)">${pillIco('ico-chip-frenzy')}${t('status_bloom')}</span>`);
    if (ctx.relicCarapace && ctx.carapaceShieldReady) pills.push(`<span class="status-pill" style="color:#00ff9d">${pillIco('ico-chip-shield')}${t('status_carapace')}</span>`);
    if (ctx.ampOwned) pills.push(`<span class="status-pill" style="color:var(--amber)">${pillIco('ico-chip-armor')}${t('status_freeze')}</span>`);
    if (stagnating) pills.push(`<span class="status-pill" style="color:#ff8599">${pillIco('ico-skull-hazard')}${t('status_stagnation')}</span>`);
    statusChipsEl.innerHTML = pills.join('');
  }
}

