// Мета-прогрессия «Биолаб» - очки и покупки между забегами.
// Хранение в localStorage; битые или отсутствующие данные безопасно заменяются дефолтом.

/** Геном ДНК-матрицы LUMIVORE (4 базовые ветки Библии) */
export type DnaBranch = 'vermis' | 'chimera' | 'mycelium' | 'symbiont';
/** Гибриды 2-го порядка записываются в геном забега наравне с чистыми геномами */
export type HybridBranch =
  | 'plasma_leviathan' | 'ouroboros' | 'phase_serpent'
  | 'spore_reactor' | 'ion_colossus' | 'psi_web';
export type Branch = 'neutral' | DnaBranch | HybridBranch;

/** Геном завершённого забега - то, что Биолаб запоминает о прогоне */
export interface RunGenome {
  branch: Branch;
  weapons: string[];
  topUpgrades: string[];
  survivalTime: number;
  kills: number;
  level: number;
  bioNodesHeld: number;
  tailMaxReached: number;
  damageDealt: number;
  record: boolean;
}

/** Состояние Биолаба: очки, покупки, рекорды и последние геномы */
export interface BiolabState {
  points: number;
  unlocked: string[];
  bestTime: number;
  bestKills: number;
  runs: number;
  genomes: RunGenome[];
}

/** Позиция каталога улучшений Биолаба */
export interface BiolabUnlock {
  id: string;
  cost: number;
  name: string;
  effect: string;
}

export const BIOLAB_UNLOCKS: BiolabUnlock[] = [
  { id: 'start_orbs', cost: 50, name: '«ГРОЗА»', effect: 'Старт с электроорбитами вместо стартовых шипов' },
  { id: 'start_aura', cost: 60, name: '«ЧУМА»', effect: 'Старт с токсичной аурой, но -20 макс. HP' },
  { id: 'start_tail_xl', cost: 70, name: '«МАКРОХВОСТ»', effect: 'Старт с хвостом вдвое длиннее' },
  { id: 'start_nova2', cost: 90, name: '«ВЗРЫВ»', effect: 'Старт с Нова-импульсом 2-го уровня' },
  { id: 'perm_regen', cost: 40, name: 'Регенерация', effect: '+0.3 HP/с всегда' },
  { id: 'perm_magnet', cost: 35, name: 'Магнетизм', effect: '+25% к радиусу сбора сфер ДНК навсегда' },
  { id: 'unlock_vermis', cost: 60, name: 'Синтез «ВЕРМИС»', effect: 'Старт забега с 1-м уровнем ДНК Вермиса' },
  { id: 'unlock_chimera', cost: 60, name: 'Синтез «ХИМЕРА»', effect: 'Старт забега с 1-м уровнем ДНК Химеры' },
  { id: 'unlock_mycelium', cost: 60, name: 'Синтез «МИЦЕЛИЙ»', effect: 'Старт забега с 1-м уровнем ДНК Мицелия' },
  { id: 'unlock_symbiont', cost: 60, name: 'Синтез «СИМБИОНТ»', effect: 'Старт забега с 1-м уровнем ДНК Симбионта' },
  { id: 'perm_dmg', cost: 85, name: 'Мутагенная агрессия', effect: '+10% ко всему исходящему урону навсегда' },
  { id: 'perm_armor', cost: 80, name: 'Хитиновая мембрана', effect: '-15% входящего урона навсегда' },
];

const STORAGE_KEY = 'lumivore-biolab-v1';
const MAX_GENOMES = 20;
const BRANCHES: Branch[] = [
  'neutral', 'vermis', 'chimera', 'mycelium', 'symbiont',
  'plasma_leviathan', 'ouroboros', 'phase_serpent', 'spore_reactor', 'ion_colossus', 'psi_web',
];

/** Чистое состояние по умолчанию */
function emptyState(): BiolabState {
  return { points: 0, unlocked: [], bestTime: 0, bestKills: 0, runs: 0, genomes: [] };
}

const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Валидация генома из внешних данных, невалидный -> null */
function sanitizeGenome(raw: unknown): RunGenome | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const branch = BRANCHES.find((b) => b === r.branch);
  if (!branch) return null;
  return {
    branch,
    weapons: toStrArr(r.weapons),
    topUpgrades: toStrArr(r.topUpgrades),
    survivalTime: toNum(r.survivalTime),
    kills: toNum(r.kills),
    level: toNum(r.level),
    bioNodesHeld: toNum(r.bioNodesHeld),
    tailMaxReached: toNum(r.tailMaxReached),
    damageDealt: toNum(r.damageDealt),
    record: r.record === true,
  };
}

/** Валидация состояния из внешних данных, битые поля -> дефолт */
function sanitizeState(raw: unknown): BiolabState {
  const s = emptyState();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (typeof r.points === 'number' && Number.isFinite(r.points)) s.points = Math.max(0, Math.floor(r.points));
  if (Array.isArray(r.unlocked)) s.unlocked = toStrArr(r.unlocked);
  if (typeof r.bestTime === 'number' && Number.isFinite(r.bestTime)) s.bestTime = Math.max(0, r.bestTime);
  if (typeof r.bestKills === 'number' && Number.isFinite(r.bestKills)) s.bestKills = Math.max(0, Math.floor(r.bestKills));
  if (typeof r.runs === 'number' && Number.isFinite(r.runs)) s.runs = Math.max(0, Math.floor(r.runs));
  if (Array.isArray(r.genomes)) {
    s.genomes = r.genomes
      .slice(0, MAX_GENOMES)
      .map(sanitizeGenome)
      .filter((g): g is RunGenome => g !== null);
  }
  return s;
}

/** Загрузить состояние Биолаба (безопасно: исключения и мусор -> дефолт) */
export function loadBiolab(): BiolabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return sanitizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

/** Сохранить состояние (тихо игнорируем недоступный localStorage) */
export function saveBiolab(state: BiolabState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // приватный режим / переполнение - прогрессия просто не persistится
  }
}

/** Очки за забег: kills / 10 + survivalTime / 6, округление вниз */
export function pointsEarned(genome: Pick<RunGenome, 'kills' | 'survivalTime'>): number {
  const kills = toNum(genome?.kills);
  const time = toNum(genome?.survivalTime);
  return Math.floor(kills / 10 + time / 6);
}

/**
 * Зафиксировать забег: обновить рекорды и счётчик, начислить очки,
 * вставить геном в историю (новейший первым, максимум 20) и сохранить.
 */
export function recordRun(genome: RunGenome): BiolabState {
  const s = loadBiolab();
  const safe = sanitizeGenome(genome) ?? { ...genome };
  s.runs += 1;
  if (safe.survivalTime > s.bestTime) s.bestTime = safe.survivalTime;
  if (safe.kills > s.bestKills) s.bestKills = safe.kills;
  s.points += pointsEarned(safe);
  s.genomes.unshift(safe);
  if (s.genomes.length > MAX_GENOMES) s.genomes.length = MAX_GENOMES;
  saveBiolab(s);
  return s;
}

/** Куплен ли апгрейд по id */
export function isUnlocked(id: string): boolean {
  return loadBiolab().unlocked.includes(id);
}

/**
 * Покупка апгрейда из каталога: если хватает очков и ещё не куплено -
 * списать стоимость, добавить в unlocked, сохранить и вернуть true.
 */
export function purchase(id: string): boolean {
  const item = BIOLAB_UNLOCKS.find((u) => u.id === id);
  if (!item) return false;
  const s = loadBiolab();
  if (s.unlocked.includes(id) || s.points < item.cost) return false;
  s.points -= item.cost;
  s.unlocked.push(id);
  saveBiolab(s);
  return true;
}
