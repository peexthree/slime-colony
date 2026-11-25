// Мета-прогрессия «Биолаб» - очки, покупки, лимит активных слотов и переключение модулей.
// Хранение в localStorage; битые или отсутствующие данные безопасно заменяются дефолтом.

/** Геном ДНК-матрицы LUMIVORE (4 базовые ветки Библии) */
export type DnaBranch = 'vermis' | 'chimera' | 'mycelium' | 'symbiont';
/** Гибриды 2-го порядка записываются в геном забега наравне с чистыми геномами */
export type HybridBranch =
  | 'plasma_leviathan' | 'ouroboros' | 'phase_serpent'
  | 'spore_reactor' | 'ion_colossus' | 'psi_web';
export type Branch = 'neutral' | DnaBranch | HybridBranch;

export type BiolabCategory = 'form' | 'dna' | 'passive';

export const MAX_ACTIVE_BIOLAB = 4;

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

/** Состояние Биолаба: очки, покупки, отключённые модули, рекорды и последние геномы */
export interface BiolabState {
  points: number;
  unlocked: string[];
  disabled: string[];
  bestTime: number;
  bestKills: number;
  runs: number;
  genomes: RunGenome[];
}

/** Позиция каталога улучшений Биолаба */
export interface BiolabUnlock {
  id: string;
  cost: number;
  category: BiolabCategory;
  name: string;
  effect: string;
}

export const BIOLAB_UNLOCKS: BiolabUnlock[] = [
  { id: 'start_orbs', cost: 50, category: 'form', name: '«ГРОЗА»', effect: 'Старт с Электроорбитами (ур.1) вместо Шипов' },
  { id: 'start_aura', cost: 60, category: 'form', name: '«ЧУМА»', effect: 'Старт с Токсичной аурой (ур.1) вместо Шипов, но −15 макс. HP' },
  { id: 'start_nova2', cost: 75, category: 'form', name: '«ВЗРЫВ»', effect: 'Старт с Нова-импульсом (ур.1) вместо Шипов, перезарядка +15%' },
  { id: 'unlock_vermis', cost: 60, category: 'dna', name: 'Синтез «ВЕРМИС»', effect: 'Старт забега с 1-м уровнем ДНК Вермиса (хвост и хлыст)' },
  { id: 'unlock_chimera', cost: 60, category: 'dna', name: 'Синтез «ХИМЕРА»', effect: 'Старт забега с 1-м уровнем ДНК Химеры (плазма и урон)' },
  { id: 'unlock_mycelium', cost: 60, category: 'dna', name: 'Синтез «МИЦЕЛИЙ»', effect: 'Старт забега с 1-м уровнем ДНК Мицелия (споры и регенерация)' },
  { id: 'unlock_symbiont', cost: 60, category: 'dna', name: 'Синтез «СИМБИОНТ»', effect: 'Старт забега с 1-м уровнем ДНК Симбионта (магнетизм и скорость)' },
  { id: 'start_tail_xl', cost: 65, category: 'passive', name: '«МАКРОХВОСТ»', effect: '+6 стартовых сегментов хвоста на старте забега' },
  { id: 'perm_regen', cost: 40, category: 'passive', name: 'Регенерация', effect: '+0.25 HP/с постоянно' },
  { id: 'perm_magnet', cost: 35, category: 'passive', name: 'Магнетизм', effect: '+20% к радиусу сбора сфер ДНК' },
  { id: 'perm_dmg', cost: 85, category: 'passive', name: 'Мутагенная агрессия', effect: '+8% ко всему исходящему урону' },
  { id: 'perm_armor', cost: 80, category: 'passive', name: 'Хитиновая мембрана', effect: '−10% входящего урона' },
];

const STORAGE_KEY = 'lumivore-biolab-v1';
const MAX_GENOMES = 20;
const BRANCHES: Branch[] = [
  'neutral', 'vermis', 'chimera', 'mycelium', 'symbiont',
  'plasma_leviathan', 'ouroboros', 'phase_serpent', 'spore_reactor', 'ion_colossus', 'psi_web',
];

/** Чистое состояние по умолчанию */
function emptyState(): BiolabState {
  return { points: 0, unlocked: [], disabled: [], bestTime: 0, bestKills: 0, runs: 0, genomes: [] };
}

const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string'))) : [];

/** Выравнивание активных модулей под лимит и взаимоисключающие категории при загрузке старых сейвов */
function normalizeActiveConstraints(s: BiolabState): void {
  const disabledSet = new Set(s.disabled.filter((id) => s.unlocked.includes(id)));
  let activeCount = 0;
  let hasForm = false;
  let hasDna = false;

  for (const id of s.unlocked) {
    if (disabledSet.has(id)) continue;
    const def = BIOLAB_UNLOCKS.find((u) => u.id === id);
    if (!def) {
      disabledSet.add(id);
      continue;
    }
    const conflict = (def.category === 'form' && hasForm) || (def.category === 'dna' && hasDna);
    if (conflict || activeCount >= MAX_ACTIVE_BIOLAB) {
      disabledSet.add(id);
      continue;
    }
    if (def.category === 'form') hasForm = true;
    if (def.category === 'dna') hasDna = true;
    activeCount++;
  }
  s.disabled = Array.from(disabledSet);
}

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
  if (Array.isArray(r.disabled)) s.disabled = toStrArr(r.disabled);
  if (typeof r.bestTime === 'number' && Number.isFinite(r.bestTime)) s.bestTime = Math.max(0, r.bestTime);
  if (typeof r.bestKills === 'number' && Number.isFinite(r.bestKills)) s.bestKills = Math.max(0, Math.floor(r.bestKills));
  if (typeof r.runs === 'number' && Number.isFinite(r.runs)) s.runs = Math.max(0, Math.floor(r.runs));
  if (Array.isArray(r.genomes)) {
    s.genomes = r.genomes
      .slice(0, MAX_GENOMES)
      .map(sanitizeGenome)
      .filter((g): g is RunGenome => g !== null);
  }
  normalizeActiveConstraints(s);
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

/** Начислить бонусные очки Биолаба (за Испытание дня или Достижения) */
export function addBiolabPoints(amount: number): BiolabState {
  const s = loadBiolab();
  const add = Math.max(0, Math.floor(amount));
  if (add > 0) {
    s.points += add;
    saveBiolab(s);
  }
  return s;
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

/** Список id активных (купленных и не отключённых) модулей */
export function getActiveIds(state = loadBiolab()): string[] {
  return state.unlocked.filter((id) => !state.disabled.includes(id));
}

/** Активен ли купленный модуль в текущих забегах */
export function isActive(id: string, state = loadBiolab()): boolean {
  return state.unlocked.includes(id) && !state.disabled.includes(id);
}

/**
 * Покупка апгреда из каталога: если хватает очков и ещё не куплено -
 * списать стоимость, добавить в unlocked. Если есть свободный слот и нет конфликта -
 * активировать сразу, иначе поместить в резерв (disabled).
 */
export function purchase(id: string): boolean {
  const item = BIOLAB_UNLOCKS.find((u) => u.id === id);
  if (!item) return false;
  const s = loadBiolab();
  if (s.unlocked.includes(id) || s.points < item.cost) return false;
  const prevActive = getActiveIds(s);
  const hasSameExclusive = (item.category === 'form' || item.category === 'dna') &&
    prevActive.some((aid) => BIOLAB_UNLOCKS.find((u) => u.id === aid)?.category === item.category);
  s.points -= item.cost;
  s.unlocked.push(id);
  if (prevActive.length >= MAX_ACTIVE_BIOLAB || hasSameExclusive) {
    s.disabled.push(id);
  }
  saveBiolab(s);
  return true;
}

/** Переключить купленный модуль (вкл/выкл) с учётом лимита 4 слотов и автозамены формы/ДНК */
export function toggleModule(id: string): { ok: boolean; active: boolean; reason?: 'not_owned' | 'limit'; swappedId?: string } {
  const item = BIOLAB_UNLOCKS.find((u) => u.id === id);
  if (!item) return { ok: false, active: false, reason: 'not_owned' };
  const s = loadBiolab();
  if (!s.unlocked.includes(id)) return { ok: false, active: false, reason: 'not_owned' };

  if (!s.disabled.includes(id)) {
    s.disabled.push(id);
    saveBiolab(s);
    return { ok: true, active: false };
  }

  const active = getActiveIds(s);
  let swappedId: string | undefined;
  if (item.category === 'form' || item.category === 'dna') {
    swappedId = active.find((aid) => BIOLAB_UNLOCKS.find((u) => u.id === aid)?.category === item.category);
  }

  const nextActiveCount = active.length - (swappedId ? 1 : 0) + 1;
  if (nextActiveCount > MAX_ACTIVE_BIOLAB) {
    return { ok: false, active: false, reason: 'limit' };
  }

  if (swappedId && !s.disabled.includes(swappedId)) {
    s.disabled.push(swappedId);
  }
  s.disabled = s.disabled.filter((d) => d !== id);
  saveBiolab(s);
  return { ok: true, active: true, swappedId };
}

/** Отключить все активные модули Биолаба (чистый забег без баффов) */
export function disableAllBiolab(): BiolabState {
  const s = loadBiolab();
  s.disabled = [...s.unlocked];
  saveBiolab(s);
  return s;
}
