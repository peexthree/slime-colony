// Биом-модификаторы (каждая 3-я шкала): ТЕЧЕНИЕ, ТЕНИ РЁБЕР, СПОРОВЫЙ ВЕТЕР,
// СКОЛЬЗКАЯ ИНЕРЦИЯ, ФРАКТАЛЬНЫЕ ПРИЛИВЫ. Только силы и поля - без новых
// сущностей и коллизий. Чистая математика конвертов/полос живёт в engine/types
// (BIOME_FX), здесь - состояние забега и применение сил к игроку/врагам/душам.
//
// Состояние хранится в WeakMap по ctx: не расширяет RunState и автоматически
// изолирует забеги (headless-харнесс создаёт свежий ctx на каждый прогон).
// Работает без DOM: единственные DOM-зависимости - showToast (заглушки
// харнесса) и svc.overlay.spawnPulse (no-op-мок).
import { BIOME_FX } from '../engine/types';
import { flowPulseAt, gustEnvelopeAt, ribBandHit, ribBandsAt, rotAngleAt, telegraphActiveAt } from '../engine/types';
import type { BiomeFxConfig, BiomeFxKind } from '../engine/types';
import { t } from '../i18n';
import type { I18nKey } from '../i18n';
import { showToast } from '../ui/toast';
import type { Ctx } from './context';

/** Состояние модификатора одного забега */
interface BiomeFxState {
  scaleIdx: number;
  /** Игровое время модификатора (накопленный dt шагов, замедляется bullet-time) */
  time: number;
  /** Общий таймер полос "теней рёбер": совпадает с таймером рендера (nowSec) */
  nowSec: number;
  /** Скорость игрока при скользкой инерции (шкала 12) */
  pvx: number;
  pvy: number;
  /** Фронт порыва ветра: для одноразового пульса-телеграфа в мире */
  windWasGust: boolean;
  /** Фронт волны прилива: для одноразового пульса в мире */
  tideWasWave: boolean;
}

const fxStates = new WeakMap<object, BiomeFxState>();

function fxOf(ctx: Ctx): BiomeFxState | null {
  return fxStates.get(ctx) ?? null;
}

function freshState(scaleIdx: number, nowSec: number): BiomeFxState {
  return { scaleIdx, time: 0, nowSec, pvx: 0, pvy: 0, windWasGust: false, tideWasWave: false };
}

/** Конфиг модификатора активной шкалы или null */
export function biomeFxCfg(ctx: Ctx): BiomeFxConfig | null {
  return BIOME_FX[ctx.scaleIdx] ?? null;
}

/**
 * Пересинк при смене шкалы/рестарте: пересоздаёт состояние и анонсирует
 * правило биома. Вызывается из startMetamorphosis и resetRun.
 */
export function syncBiomeFxScale(ctx: Ctx): void {
  const cfg = biomeFxCfg(ctx);
  if (!cfg) {
    fxStates.delete(ctx);
    return;
  }
  const prev = fxOf(ctx);
  if (prev && prev.scaleIdx === ctx.scaleIdx) return;
  fxStates.set(ctx, freshState(ctx.scaleIdx, prev?.nowSec ?? 0));
  showToast(ctx, `<svg class="bio-icon bio-lime" viewBox="0 0 32 32" aria-hidden="true"><use href="#${FX_ICO[cfg.kind]}"/></svg> ${t(FX_TOAST_KEY[cfg.kind])}`);
}

/**
 * Шаг таймеров модификатора - раз за шаг симуляции перед stepPlayer.
 * На шкалах без модификатора состояние сбрасывается.
 */
export function updateBiomeFx(ctx: Ctx, dt: number, nowSec: number): void {
  const cfg = biomeFxCfg(ctx);
  if (!cfg) {
    fxStates.delete(ctx);
    return;
  }
  let st = fxOf(ctx);
  if (!st || st.scaleIdx !== ctx.scaleIdx) {
    st = freshState(ctx.scaleIdx, nowSec);
    fxStates.set(ctx, st);
  }
  st.time += dt;
  st.nowSec = nowSec;
  // Старт порыва ветра: лёгкий зелёный пульс вокруг игрока
  if (cfg.kind === 'wind') {
    const gusting = gustEnvelopeAt(st.time, cfg.gustPeriod, cfg.gustDur) > 0;
    if (gusting && !st.windWasGust) ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x86efac, 150);
    st.windWasGust = gusting;
  }
  // Старт волны прилива: фиолетовый пульс вокруг игрока
  if (cfg.kind === 'tide') {
    const waving = gustEnvelopeAt(st.time, cfg.period, cfg.dur) > 0;
    if (waving && !st.tideWasWave) ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xa86bff, 210);
    st.tideWasWave = waving;
  }
}

// ---------- Применение сил: игрок ----------

/**
 * Множитель скорости игрока от полей шкалы: тени рёбер (-8% в полосе)
 * и фрактальный прилив (+30% в волне). Остальные шкалы - 1.
 */
export function biomePlayerSpeedMul(ctx: Ctx, x: number): number {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st) return 1;
  if (cfg.kind === 'ribs') {
    return ribBandHit(ribBandsAt(st.nowSec, ctx.curWorldW, cfg), x) ? cfg.playerMul : 1;
  }
  if (cfg.kind === 'tide') {
    return gustEnvelopeAt(st.time, cfg.period, cfg.dur) > 0 ? cfg.speedMul : 1;
  }
  return 1;
}

/**
 * Итоговая скорость игрока на этот шаг: целевая скорость ввода с учётом
 * скользкой инерции (шкала 12) плюс дрейфы течения (шкала 3) и
 * спорового ветра (шкала 9). Возвращает скорость в px/s.
 */
export function biomePlayerVelocity(ctx: Ctx, dt: number, targetSpeed: number, dirX: number, dirY: number): { vx: number; vy: number } {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st) return { vx: dirX * targetSpeed, vy: dirY * targetSpeed };
  let vx = dirX * targetSpeed;
  let vy = dirY * targetSpeed;
  if (cfg.kind === 'slick') {
    // Инерция: скорость сближается с целевой с конечным темпом (разгон/торможение)
    const rate = cfg.accel * (ctx.dashT > 0 ? cfg.dashAccelMul : 1);
    const k = Math.min(1, dt * rate);
    st.pvx += (vx - st.pvx) * k;
    st.pvy += (vy - st.pvy) * k;
    vx = st.pvx;
    vy = st.pvy;
  } else {
    st.pvx = vx;
    st.pvy = vy;
  }
  if (cfg.kind === 'flow') {
    // Течение: пульс-сердцебиение 1.2 Гц, направление медленно вращается
    const p = flowPulseAt(st.time, cfg.pulseHz);
    const a = rotAngleAt(st.time, cfg.rotPeriod);
    vx += Math.cos(a) * targetSpeed * cfg.playerFrac * p;
    vy += Math.sin(a) * targetSpeed * cfg.playerFrac * p;
  }
  if (cfg.kind === 'wind') {
    // Споровый ветер: порывы толкают тело по ветру (телеграф без силы)
    const env = gustEnvelopeAt(st.time, cfg.gustPeriod, cfg.gustDur);
    const a = rotAngleAt(st.time, cfg.rotPeriod);
    vx += Math.cos(a) * targetSpeed * cfg.playerFrac * env;
    vy += Math.sin(a) * targetSpeed * cfg.playerFrac * env;
  }
  return { vx, vy };
}

// ---------- Применение сил: враги ----------

/** Множитель скорости врага: тени рёбер (+25% в полосе) и прилив (+30% в волне) */
export function biomeEnemySpeedMul(ctx: Ctx, x: number): number {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st) return 1;
  if (cfg.kind === 'ribs') {
    return ribBandHit(ribBandsAt(st.nowSec, ctx.curWorldW, cfg), x) ? cfg.enemyMul : 1;
  }
  if (cfg.kind === 'tide') {
    return gustEnvelopeAt(st.time, cfg.period, cfg.dur) > 0 ? cfg.speedMul : 1;
  }
  return 1;
}

/** Дрейф врага течением: доля от его текущей скорости по пульсу конвекции */
export function biomeEnemyFlow(ctx: Ctx, eSpeed: number): { x: number; y: number } {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st || cfg.kind !== 'flow') return { x: 0, y: 0 };
  const p = flowPulseAt(st.time, cfg.pulseHz);
  const a = rotAngleAt(st.time, cfg.rotPeriod);
  return { x: Math.cos(a) * eSpeed * cfg.enemyFrac * p, y: Math.sin(a) * eSpeed * cfg.enemyFrac * p };
}

/** Темп гашения отброса: на скользкой шкале затухает в kbDecayMul раз медленнее */
export function biomeKbDecayRate(ctx: Ctx, baseRate: number): number {
  const cfg = biomeFxCfg(ctx);
  if (cfg && cfg.kind === 'slick') return baseRate / cfg.kbDecayMul;
  return baseRate;
}

// ---------- Применение сил: души XP ----------

/** Ускорение душ XP споровым ветром (0 вне порыва), px/s^2 */
export function biomeOrbWindAccel(ctx: Ctx): { x: number; y: number } {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st || cfg.kind !== 'wind') return { x: 0, y: 0 };
  const env = gustEnvelopeAt(st.time, cfg.gustPeriod, cfg.gustDur);
  if (env <= 0) return { x: 0, y: 0 };
  const a = rotAngleAt(st.time, cfg.rotPeriod);
  return { x: Math.cos(a) * cfg.orbAccel * env, y: Math.sin(a) * cfg.orbAccel * env };
}

// ---------- Сигналы для HUD и рендера ----------

/** Телеграф/волна прилива: мигание виньетки через существующий механизм hurt */
export function biomeTideVignette(ctx: Ctx): boolean {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st || cfg.kind !== 'tide') return false;
  const wave = gustEnvelopeAt(st.time, cfg.period, cfg.dur) > 0;
  const warn = telegraphActiveAt(st.time, cfg.period, cfg.telegraph);
  return wave || warn;
}

/** Данные чипа активности модификатора: активная фаза и окно телеграфа */
export interface BiomeFxChipInfo {
  kind: BiomeFxKind;
  active: boolean;
  warn: boolean;
}

/** Активность модификатора для HUD-чипа (null - шкала без модификатора) */
export function biomeFxChipInfo(ctx: Ctx): BiomeFxChipInfo | null {
  const cfg = biomeFxCfg(ctx);
  const st = fxOf(ctx);
  if (!cfg || !st) return null;
  switch (cfg.kind) {
    case 'flow':
      // Пульс конвекции: чип подсвечивается на пике сердцебиения
      return { kind: 'flow', active: flowPulseAt(st.time, cfg.pulseHz) > 0.35, warn: false };
    case 'ribs':
      return { kind: 'ribs', active: ribBandHit(ribBandsAt(st.nowSec, ctx.curWorldW, cfg), ctx.player.x), warn: false };
    case 'wind':
      return {
        kind: 'wind',
        active: gustEnvelopeAt(st.time, cfg.gustPeriod, cfg.gustDur) > 0,
        warn: telegraphActiveAt(st.time, cfg.gustPeriod, cfg.telegraph),
      };
    case 'slick':
      return { kind: 'slick', active: true, warn: false };
    case 'tide':
      return {
        kind: 'tide',
        active: gustEnvelopeAt(st.time, cfg.period, cfg.dur) > 0,
        warn: telegraphActiveAt(st.time, cfg.period, cfg.telegraph),
      };
  }
}

// ---------- i18n-ключи чипа и тостов (строгий паритет ru/en) ----------

/** Ключи имён модификаторов для чипа HUD */
export const FX_LABEL_KEY: Record<BiomeFxKind, I18nKey> = {
  flow: 'biome_fx_flow',
  ribs: 'biome_fx_ribs',
  wind: 'biome_fx_wind',
  slick: 'biome_fx_slick',
  tide: 'biome_fx_tide',
};

/** Ключи тост-анонсов при входе на шкалу с модификатором */
const FX_TOAST_KEY: Record<BiomeFxKind, I18nKey> = {
  flow: 'biome_fx_flow_toast',
  ribs: 'biome_fx_ribs_toast',
  wind: 'biome_fx_wind_toast',
  slick: 'biome_fx_slick_toast',
  tide: 'biome_fx_tide_toast',
};

/** Иконки чипа/тостов: только существующие спрайты symbols.ts */
export const FX_ICO: Record<BiomeFxKind, string> = {
  flow: 'ico-chip-haste',
  ribs: 'ico-chip-armor',
  wind: 'ico-chip-poison',
  slick: 'ico-chip-shield',
  tide: 'ico-chip-frenzy',
};
