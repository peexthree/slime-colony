// Режим «Испытание дня» (Daily Challenge) с детерминированным seed, модификаторами, целью и наградой
import type { DnaBranch } from './types';

export interface DailyChallengeModifiers {
  tailDpsMul: number;
  enemySpeedMul: number;
  dmgMul: number;
  maxHpDelta: number;
  captureSpeedMul: number;
  enemyNodeAggroMul: number;
  xpMul: number;
  dashCdDelta: number;
}

export interface DailyChallengeInfo {
  seed: number;
  dayKey: string;
  branch: DnaBranch;
  title: string;
  bonusPoints: number;
  modNameRu: string;
  modNameEn: string;
  modDescRu: string;
  modDescEn: string;
  goalTimeSec: number;
  goalScale: number;
  goalDescRu: string;
  goalDescEn: string;
  modifiers: DailyChallengeModifiers;
}

/** Быстрый детерминированный PRNG Mulberry32 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BRANCH_LIST: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
const CHALLENGE_TITLES: Record<DnaBranch, string> = {
  vermis: 'КИНЕТИЧЕСКИЙ ХЛЫСТ',
  chimera: 'НЕСТАБИЛЬНЫЙ РЕАКТОР',
  mycelium: 'СПОРОВАЯ ЭКСПАНСИЯ',
  symbiont: 'ФАЗОВЫЙ РЕЗОНАНС',
};

const MODIFIER_PRESETS: Record<DnaBranch, {
  modNameRu: string;
  modNameEn: string;
  modDescRu: string;
  modDescEn: string;
  modifiers: DailyChallengeModifiers;
}> = {
  vermis: {
    modNameRu: 'Живой Хлыст',
    modNameEn: 'Living Whip',
    modDescRu: 'Урон хвоста +25%, но скорость всех врагов +15%',
    modDescEn: 'Tail whip damage +25%, but enemy speed +15%',
    modifiers: { tailDpsMul: 1.25, enemySpeedMul: 1.15, dmgMul: 1, maxHpDelta: 0, captureSpeedMul: 1, enemyNodeAggroMul: 1, xpMul: 1, dashCdDelta: 0 },
  },
  chimera: {
    modNameRu: 'Перегрузка ядра',
    modNameEn: 'Core Overload',
    modDescRu: 'Исходящий урон +25%, но макс. HP −20',
    modDescEn: 'Outgoing damage +25%, but max HP −20',
    modifiers: { tailDpsMul: 1, enemySpeedMul: 1, dmgMul: 1.25, maxHpDelta: -20, captureSpeedMul: 1, enemyNodeAggroMul: 1, xpMul: 1, dashCdDelta: 0 },
  },
  mycelium: {
    modNameRu: 'Война за башни',
    modNameEn: 'Tower Siege',
    modDescRu: 'Захват башен +35% быстрее, но монстры вдвое чаще атакуют ваши башни',
    modDescEn: 'Tower capture +35% faster, but monsters raid your towers twice as often',
    modifiers: { tailDpsMul: 1, enemySpeedMul: 1.08, dmgMul: 1, maxHpDelta: 0, captureSpeedMul: 1.35, enemyNodeAggroMul: 2.0, xpMul: 1, dashCdDelta: 0 },
  },
  symbiont: {
    modNameRu: 'Ускоренный синтез',
    modNameEn: 'Accelerated Synthesis',
    modDescRu: 'Опыт +30%, но перезарядка Рывка +1.2 с',
    modDescEn: 'XP gain +30%, but Phase Dash cooldown +1.2s',
    modifiers: { tailDpsMul: 1, enemySpeedMul: 1.05, dmgMul: 1, maxHpDelta: 0, captureSpeedMul: 1, enemyNodeAggroMul: 1, xpMul: 1.3, dashCdDelta: 1.2 },
  },
};

const DAILY_DONE_KEY = 'lumivore_daily_done_v1';

export function getDailyChallenge(nowMs = Date.now()): DailyChallengeInfo {
  const dayNum = Math.floor(nowMs / 86_400_000);
  const rng = mulberry32(dayNum * 2654435761);
  const branch = BRANCH_LIST[Math.floor(rng() * BRANCH_LIST.length)];
  const dayKey = new Date(dayNum * 86_400_000).toISOString().slice(0, 10);
  const preset = MODIFIER_PRESETS[branch];
  return {
    seed: dayNum,
    dayKey,
    branch,
    title: CHALLENGE_TITLES[branch],
    bonusPoints: 50,
    modNameRu: preset.modNameRu,
    modNameEn: preset.modNameEn,
    modDescRu: preset.modDescRu,
    modDescEn: preset.modDescEn,
    goalTimeSec: 180,
    goalScale: 2,
    goalDescRu: 'Продержаться 03:00 или достичь 2-й Шкалы бытия',
    goalDescEn: 'Survive 03:00 or reach Scale 2',
    modifiers: { ...preset.modifiers },
  };
}

export function loadCompletedDailyDays(): Set<string> {
  try {
    const raw = localStorage.getItem(DAILY_DONE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function isDailyCompleted(dayKey: string): boolean {
  return loadCompletedDailyDays().has(dayKey);
}

/** Отметить испытание дня пройденным. Возвращает true, если выполнено впервые за этот день */
export function markDailyCompleted(dayKey: string): boolean {
  const set = loadCompletedDailyDays();
  if (set.has(dayKey)) return false;
  set.add(dayKey);
  try {
    localStorage.setItem(DAILY_DONE_KEY, JSON.stringify([...set].slice(-30)));
  } catch {}
  return true;
}
