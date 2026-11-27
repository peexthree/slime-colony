// Общие типы и константы LUMIVORE: THE LIVING FRACTAL
// Bio-Evolutive Roguelite: Змейка x Spore x Vampire Survivors x Physarum

/** Базовое разрешение physarum-сетки: старт игры и кламп минимума.
 *  Адаптивный выбор под зум камеры - pickSimResolution() в src/engine/simResolution.ts
 *  (рост до 2x на низких зумах для константной плотности текселей). */
export const SIM_WIDTH = 960;
export const SIM_HEIGHT = 540;
export const MAX_BEACONS = 32;
export const MAX_NODES = 64;
export const AGENT_COUNT = 120_000;

/** Маяк феромонного поля симуляции */
export interface Beacon {
  x: number;
  y: number;
  radius: number;
  /** 1 = аттрактор игрока, -1 = токсин, 2 = ИИ-маяк врага */
  kind: 1 | -1 | 2;
  ttl: number;
  maxTtl: number;
}

/** Тип бонуса био-узла территории */
export type NodeKind = 'gen' | 'amp' | 'magnet' | 'mutagen' | 'incubator';

/** Узел территории: захватывается удержанием зоны, даёт бафф владельцу */
export interface BioNode {
  id: number;
  x: number;
  y: number;
  radius: number;
  owner: -1 | 0 | 1;
  capture: number;
  kind: NodeKind;
  contested?: boolean;
  raided?: boolean;
  playerInside?: boolean;
  enemyCount?: number;
  warnCooldown?: number;
  /** Секунды био-щита после захвата: узел нельзя слить, пока щит активен */
  shieldT?: number;
}

/** Био-щит только что захваченной башни: время на уход и защиту других узлов */
export const NODE_SHIELD_SEC = 18;

/** Феромон-зов (пробел): токсин-маяк пугает рой и отбрасывает врагов */
export const CALL = {
  cd: 15,
  radius: 130,       // радиус отброса на CPU
  beaconRadius: 130, // радиус поля на GPU
  ttl: 5,
  knock: 350,
} as const;

export type EnemyType = 'grub' | 'runner' | 'brute' | 'boss' | 'splitter' | 'spitter' | 'healer' | 'pulsar' | 'mirror' | 'colony' | 'brood';
export type WeaponId = 'spikes' | 'orbs' | 'nova' | 'aura' | 'mandibles' | 'cysts';

// ============================ ДНК-МАТРИЦА ============================

/** Четыре базовых генома ДНК-матрицы (Spore-система) */
export type DnaBranch = 'vermis' | 'chimera' | 'mycelium' | 'symbiont';
export type DnaBranchOrNeutral = DnaBranch | 'neutral';
/** Гибриды 2-го порядка: скрещивание двух геномов на 3+ уровнях */
export type HybridId =
  | 'plasma_leviathan' | 'ouroboros' | 'phase_serpent'
  | 'spore_reactor' | 'ion_colossus' | 'psi_web';

export const DNA_COLORS: Record<DnaBranch, number> = {
  vermis: 0x66fcf1,   // циан - кинетика тела
  chimera: 0xff7b93,  // красный - реактор
  mycelium: 0x86efac, // зелёный - рой
  symbiont: 0xffd166, // золото - фаза
};

// Имена геномов (ВЕРМИС/ХИМЕРА/...) и все тексты гибридов живут в src/i18n/ru.json
// (доступ через trDnaName/dnaName в src/i18n/gameData.ts) - здесь только идентификаторы.

/** Пороги накопленной ДНК-биомассы для уровней 1..3 ветки */
export const DNA_LEVELS = [15, 35, 60] as const;

export interface HybridDef {
  id: HybridId;
  a: DnaBranch;
  b: DnaBranch;
}

/** Шесть Великих Гибридов: уникальная механика слияния двух геномов.
 *  Имена/описания - в i18n (hybrid_*_name / hybrid_*_desc). */
export const HYBRIDS: HybridDef[] = [
  { id: 'plasma_leviathan', a: 'vermis', b: 'chimera' },
  { id: 'ouroboros', a: 'vermis', b: 'mycelium' },
  { id: 'phase_serpent', a: 'vermis', b: 'symbiont' },
  { id: 'spore_reactor', a: 'chimera', b: 'mycelium' },
  { id: 'ion_colossus', a: 'chimera', b: 'symbiont' },
  { id: 'psi_web', a: 'mycelium', b: 'symbiont' },
];

export interface EnemyDef {
  hp: number;
  speed: number;
  dmg: number;
  radius: number;
  xp: number;
  color: number;
  /** Длина хвостика врага в сегментах */
  tail: number;
  /** Геном души: душа врага даёт ДНК своего цвета */
  dna: DnaBranch;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  grub:     { hp: 13,  speed: 44, dmg: 8,  radius: 7,  xp: 2,  color: 0xc084fc, tail: 6,  dna: 'vermis' },
  runner:   { hp: 10,  speed: 74, dmg: 11, radius: 6,  xp: 2,  color: 0xe879f9, tail: 8,  dna: 'symbiont' },
  brute:    { hp: 66,  speed: 26, dmg: 17, radius: 12, xp: 6,  color: 0xa855f7, tail: 10, dna: 'mycelium' },
  boss:     { hp: 920, speed: 22, dmg: 25, radius: 22, xp: 40, color: 0xd946ef, tail: 18, dna: 'vermis' },
  // --- Экосистема: организмы с уникальным поведением ---
  splitter: { hp: 32,  speed: 44, dmg: 9,  radius: 9,  xp: 3,  color: 0xd8b4fe, tail: 8,  dna: 'mycelium' },  // при смерти -> 2 бегуна
  spitter:  { hp: 22,  speed: 52, dmg: 8,  radius: 7,  xp: 3,  color: 0xf0abfc, tail: 7,  dna: 'chimera' },   // держит дистанцию, плюёт ядом
  healer:   { hp: 28,  speed: 46, dmg: 6,  radius: 7,  xp: 4,  color: 0x86efac, tail: 6,  dna: 'mycelium' },  // лечит ближних - приоритетная цель
  pulsar:   { hp: 60,  speed: 0,  dmg: 15, radius: 14, xp: 8,  color: 0xfb7185, tail: 0,  dna: 'chimera' },   // стоит и бьёт кольцами
  mirror:   { hp: 150, speed: 62, dmg: 15, radius: 10, xp: 12, color: 0xfda4af, tail: 12, dna: 'symbiont' }, // отражает геном игрока
  colony:   { hp: 165, speed: 20, dmg: 15, radius: 16, xp: 15, color: 0xc4b5fd, tail: 10, dna: 'vermis' },   // матка + выводок
  brood:    { hp: 7,   speed: 68, dmg: 6,  radius: 4,  xp: 1,  color: 0xe9d5ff, tail: 4,  dna: 'vermis' },   // выводок колонии
};

/** Мутации элитных врагов (Этап 4.3) */
export type EliteMutation = 'armored' | 'enraged' | 'necromancer' | 'magnetic' | 'mirrored';

export const ELITE = {
  everySec: 45,      // период появления элит между боссами
  hpMul: 2.5,
  radiusMul: 1.3,
  xpMul: 3,
  haloColor: 0xffd166,
} as const;

/**
 * Время появления новых организмов в спавн-таблице (сек от начала забега).
 * Баланс веток ДНК: каждая из 4 веток должна быть представлена в первые 30 секунд
 * (vermis - базовый grub в пуле main.ts, chimera - spitter с 10-й секунды,
 * mycelium - splitter с 20-й, symbiont - runner с 25-й).
 */
export const SPAWN_TABLE: { since: number; type: EnemyType; chance: number }[] = [
  { since: 10,  type: 'spitter',  chance: 0.10 }, // Химера: ранний носитель ДНК, ветка не голодает до Новы
  { since: 20,  type: 'splitter', chance: 0.10 }, // Мицелий
  { since: 25,  type: 'runner',   chance: 0.09 }, // Симбионт: души этого генома в первые полминуты забега
  { since: 75,  type: 'healer',   chance: 0.08 },
  { since: 95,  type: 'pulsar',   chance: 0.06 },
  { since: 145, type: 'colony',   chance: 0.05 },
  { since: 230, type: 'mirror',   chance: 0.04 },
];

/** Минимальный уровень игрока для открытия каждого оружия и максимум слотов.
 *  Лимит слотов сознательно тесный: итог прокачки - одно целостное существо
 *  (или его Гибрид), а не «куча пушек». Родное оружие генома дешёвое,
 *  чужое - дороже на 4 уровня (см. progression.canUnlockWeapon). */
export const MAX_EQUIPPED_WEAPONS = 3;
/** Родной геном каждого оружия: ветка сборки диктует арсенал */
export const WEAPON_BRANCH: Record<WeaponId, DnaBranch> = {
  spikes: 'vermis',
  mandibles: 'vermis',
  nova: 'chimera',
  aura: 'mycelium',
  cysts: 'mycelium',
  orbs: 'symbiont',
};
export const WEAPON_UNLOCK_LEVEL: Record<WeaponId, number> = {
  spikes: 1,
  mandibles: 3,
  nova: 4,   // родное оружие Химеры: без него ветка без арсенала до 9 ур. (аудит баланса)
  orbs: 5,
  aura: 7,
  cysts: 13, // мины - капстоун поздней стадии: мощно, но открывается в конце
};

/** Таблица значений оружия по уровням 1..4: кортеж фиксированной длины WEAPON_MAX_LVL */
export type LevelTable = readonly [number, number, number, number];

/** Шипы: авто-выстрел в ближайшую цель. Таблицы по уровням 1..4 */
export const SPIKES = {
  // Калибровка ранней кривой (плейтест + headless-сим): ур.1 должен биться
  // с базовым давлением спавна (~1.05 врага/с x 13 hp), иначе рой растёт
  // монотонно и окружает игрока до первой карты апгрейда.
  cd:    [1.2, 1.1, 1.0, 0.9] as LevelTable,
  dmg:   [12, 15, 19, 24] as LevelTable,
  count: [2, 2, 2, 3] as LevelTable,
  // Радиус таргетинга: без лимита иглы били по всей арене, души падали в
  // 300-400px от игрока и не долетали (11 убийств -> 0 XP за 19с в плейтесте)
  range: 280,
} as const;

/** Молния-орбиты: сферы вращаются вокруг игрока (открываются с 5 ур.) */
export const ORBS = {
  count:  [1, 2, 3, 4] as LevelTable,
  dmg:    [7, 10, 13, 17] as LevelTable,
  radius: [50, 56, 63, 70] as LevelTable,
  speed:  2.3,
  orbCd:  0.45,
} as const;

/** Нова-импульс: периодический взрыв-кольцо с отбросом (родное оружие Химеры, 4 ур.) */
export const NOVA = {
  cd:     [6.5, 5.8, 5.1, 4.4] as LevelTable,
  dmg:    [20, 27, 35, 45] as LevelTable,
  radius: [80, 92, 104, 118] as LevelTable,
} as const;

/** Токсин-аура: постоянный урон вокруг игрока (открывается с 7 ур.) */
export const AURA = {
  dps:    [5, 8, 12, 17] as LevelTable,
  radius: [38, 45, 53, 62] as LevelTable,
  tick:   0.25,
} as const;

/** Жвалы: рассекающий фронтальный укус перед организмом (открываются с 3 ур.) */
export const MANDIBLES = {
  cd:     [1.7, 1.45, 1.25, 1.05] as LevelTable,
  dmg:    [22, 30, 40, 52] as LevelTable,
  range:  [54, 62, 70, 80] as LevelTable,
  arc:    Math.PI * 0.62, // ~112 градусов сектор удара
} as const;

/** Споровые цисты: коконы-мины, сбрасываются только при движении.
 *  Капстоун мицелия поздней стадии: открывается с 13 ур. при ДНК мицелия 2+,
 *  поэтому мощность в разы выше ранних оружий. */
export const CYSTS = {
  cd:       [3.4, 3.0, 2.6, 2.2] as LevelTable,
  dmg:      [30, 42, 56, 74] as LevelTable,
  radius:   [42, 50, 58, 68] as LevelTable,
  maxCysts: [4, 5, 6, 8] as LevelTable,
  perDrop:  [1, 1, 2, 2] as LevelTable,
  moveDist: 85,
  armTime:  0.55,
  blastMul: 1.45,
} as const;

/** Фазовый рывок (Dash) */
export const DASH = {
  cd: 3.8,
  duration: 0.22,
  speedMul: 3.3,
  iframe: 0.35,
} as const;

export const WEAPON_MAX_LVL = 4;
export const STAT_MAX_STACKS = 3;

export const PLAYER = {
  hp: 120, // +20% запаса: плейтест показал смерть за ~12с после первого окружения
  speed: 120,
  radius: 6,
  magnet: 90,
} as const;

export const PROJ_SPEED = 330;
export const PROJ_LIFE = 1.3;
export const PROJ_RADIUS = 5;
export const IFRAME = 0.45;
export const ENEMY_CAP = 260;

/** Первый босс и период появления следующих */
export const BOSS_FIRST_AT = 90;
export const BOSS_EVERY = 90;

/**
 * Хвост особи — это ресурс и тело одновременно:
 * растёт от собранных сфер ДНК, тает от движения, чем длиннее — тем сильнее
 */
export const TAIL = {
  startLen: 14,
  minLen: 6,
  baseMax: 16,
  maxPerLvl: 2,      // ёмкость хвоста растёт с уровнем
  moveCost: 0.7,     // сегментов в секунду при движении (умножается на размер):
                     // плейтест: при 1.0 хвост падал до минимума за ~9с движения,
                     // раньше, чем спиннулся килл-движок шипов (0.7 даёт ~25с)
                     // движение - естественный режим охотника, тает дешевле метаболизма
  idleCost: 1.45,    // сегментов в секунду без движения: неподвижность тает БЫСТРЕЕ
                     // движения - поощряет движение (аудит баланса: было наоборот)
  soulGain: 0.9,     // сегментов за единицу ценности души
  dpsBase: 2,
  dpsPerSeg: 0.35,   // хвост бьёт тем сильнее, чем он длиннее
  tick: 0.1,
  hitRadius: 15,
  cd: 0.25,
  segSpacing: 5,     // шаг записи траектории, px симуляции
} as const;

/** Пассивный рост за уровень */
export const GROWTH = {
  hpPerLvl: 2,
  radiusPerLvl: 0.1,
} as const;

// ============================ КОЛЬЦО СМЕРТИ ============================

/** Замыкание траектории хвоста в полигон: схлопывание вакуума внутри */
export const RING = {
  cooldown: 2.5,     // сек между схлопываниями
  dmgPerSeg: 1.6,    // урон внутри = длина хвоста x этот множитель
  historyWindow: 130,// сегментов траектории в поиске замыкания
  skipAdj: 5,        // соседние сегменты не считаются пересечением
} as const;

/**
 * Минимальная площадь Кольца Смерти как функция длины хвоста (аудит баланса).
 * Геометрия: максимальная площадь замкнутого полигона из N сегментов хвоста
 * с шагом TAIL.segSpacing - это круг с длиной окружности N * segSpacing:
 *   A_max = (N * segSpacing)^2 / (4 * PI)
 * Для стартового хвоста 16 сегментов с шагом 5px это ~509 px^2, поэтому
 * прежняя константа minArea 3800 была физически недостижима.
 * Игрок не рисует идеальную окружность, поэтому порог = 75% от максимума:
 *   ringMinArea(16) = 0.75 * (16 * 5)^2 / (4 * PI) ~= 382 px^2
 */
export const RING_AREA_FACTOR = 0.75;

export function ringMinArea(tailLen: number): number {
  const n = Math.max(1, Math.floor(tailLen));
  const circumference = n * TAIL.segSpacing;
  return Math.round((RING_AREA_FACTOR * circumference * circumference) / (4 * Math.PI));
}

// ============================ ШТАММЫ PHYSARUM ============================

/** Симбиоз со своим штаммом: на своём поле организм сильнее */
export const STRAIN = {
  ownSpeedMul: 1.25,    // +25% скорость на своём следе
  ownTailRegen: 1.4,    // сегментов/сек регенерации хвоста на своём следе
  enemyMeltMul: 1.8,    // вражеский штамм ускоряет таяние хвоста
  densityThreshold: 0.075, // порог плотности readback: считаем «на поле»
} as const;

// ============================ ШКАЛА БЫТИЯ ============================

export interface ScaleTheme {
  id: number;
  zoom: number;           // целевой зум камеры после метаморфоза
  enemyHpMul: number;     // множитель HP врагов на шкале
  enemyDmgMul: number;    // множитель урона врагов на шкале
  enemySizeMul: number;   // множитель физического размера врагов
  enemySpeedMul: number;  // множитель скорости врагов
  playerSpeedMul: number; // множитель скорости игрока: мир растёт 1.24^k,
                          // а зум падает лишь до 0.45 - игрок должен успевать за миром
  biomassGoal: number;    // биомасса для созревания Титана
  core: number;           // цвет ядра тела игрока (палитра шкалы)
  glow: number;           // цвет ореола/ауры игрока (палитра шкалы)
}

/**
 * 15 локаций - Лестница Эволюции. Лор: зонд «ЕвроКорп-3» упал на планету Ξ-9,
 * и в его реакторе очнулась капля забытой биомассы. Она прорастает сквозь агару,
 * тело носителя, выходит на поверхность планеты, поднимается в её небо
 * и переступает предел биологии. Каждая локация - зумаут и новый биом.
 *
 * Кривая HP (аудит баланса): после 5-й шкалы рост enemyHpMul резко сглажен
 * (было 1.0 -> 45.5, экспоненциальная стена: TTK босса вырастал с 12с до 168с).
 * Оружие игрока ограничено 3 слотами и 4 уровнями, поэтому поздний рост сложности
 * идёт за счёт плотности роя и урона врагов, а не квадратичных HP.
 * Первые 5 шкал не тронуты - их кривая сбалансирована.
 * Имена/описания шкал - в i18n (scale_*_name / scale_*_sub).
 */
export const SCALES: ScaleTheme[] = [
  { id: 1, zoom: 1.0, enemyHpMul: 1.0, enemyDmgMul: 1.0, enemySizeMul: 1.0, enemySpeedMul: 1.0, playerSpeedMul: 1.0, biomassGoal: 130, core: 0xeafffb, glow: 0x66fcf1 },
  { id: 2, zoom: 0.92, enemyHpMul: 1.4, enemyDmgMul: 1.15, enemySizeMul: 1.12, enemySpeedMul: 1.04, playerSpeedMul: 1.06, biomassGoal: 240, core: 0xf2ffe4, glow: 0x9ae66e },
  { id: 3, zoom: 0.84, enemyHpMul: 2.0, enemyDmgMul: 1.33, enemySizeMul: 1.25, enemySpeedMul: 1.08, playerSpeedMul: 1.12, biomassGoal: 350, core: 0xeafff4, glow: 0x57e6a9 },
  { id: 4, zoom: 0.77, enemyHpMul: 2.8, enemyDmgMul: 1.53, enemySizeMul: 1.4, enemySpeedMul: 1.13, playerSpeedMul: 1.19, biomassGoal: 470, core: 0xe9fbff, glow: 0x38bdf8 },
  { id: 5, zoom: 0.71, enemyHpMul: 3.9, enemyDmgMul: 1.76, enemySizeMul: 1.56, enemySpeedMul: 1.18, playerSpeedMul: 1.26, biomassGoal: 600, core: 0xe8f2ff, glow: 0x4d8dff },
  { id: 6, zoom: 0.66, enemyHpMul: 4.6, enemyDmgMul: 2.02, enemySizeMul: 1.74, enemySpeedMul: 1.23, playerSpeedMul: 1.34, biomassGoal: 740, core: 0xf5f7fa, glow: 0xe2e8f0 },
  { id: 7, zoom: 0.62, enemyHpMul: 5.2, enemyDmgMul: 2.32, enemySizeMul: 1.95, enemySpeedMul: 1.28, playerSpeedMul: 1.42, biomassGoal: 890, core: 0xf1ecff, glow: 0x8b5cf6 },
  { id: 8, zoom: 0.58, enemyHpMul: 5.8, enemyDmgMul: 2.67, enemySizeMul: 2.18, enemySpeedMul: 1.33, playerSpeedMul: 1.5, biomassGoal: 1050, core: 0xfff6e0, glow: 0xfbbf24 },
  { id: 9, zoom: 0.55, enemyHpMul: 6.3, enemyDmgMul: 3.07, enemySizeMul: 2.44, enemySpeedMul: 1.39, playerSpeedMul: 1.59, biomassGoal: 1220, core: 0xeafff2, glow: 0x34d399 },
  { id: 10, zoom: 0.52, enemyHpMul: 6.8, enemyDmgMul: 3.53, enemySizeMul: 2.73, enemySpeedMul: 1.45, playerSpeedMul: 1.69, biomassGoal: 1400, core: 0xfff0e2, glow: 0xf97316 },
  { id: 11, zoom: 0.5, enemyHpMul: 7.2, enemyDmgMul: 4.06, enemySizeMul: 3.06, enemySpeedMul: 1.51, playerSpeedMul: 1.79, biomassGoal: 1590, core: 0xfff1e0, glow: 0xff8a3d },
  { id: 12, zoom: 0.48, enemyHpMul: 7.6, enemyDmgMul: 4.67, enemySizeMul: 3.42, enemySpeedMul: 1.57, playerSpeedMul: 1.9, biomassGoal: 1790, core: 0xeaf7ff, glow: 0x7dd3fc },
  { id: 13, zoom: 0.47, enemyHpMul: 8.0, enemyDmgMul: 5.37, enemySizeMul: 3.6, enemySpeedMul: 1.64, playerSpeedMul: 2.01, biomassGoal: 2000, core: 0xe6feff, glow: 0xa5f3fc },
  { id: 14, zoom: 0.46, enemyHpMul: 8.4, enemyDmgMul: 6.17, enemySizeMul: 3.75, enemySpeedMul: 1.7, playerSpeedMul: 2.13, biomassGoal: 2220, core: 0xfdeaff, glow: 0xf0abfc },
  { id: 15, zoom: 0.45, enemyHpMul: 8.8, enemyDmgMul: 7.1, enemySizeMul: 3.9, enemySpeedMul: 1.77, playerSpeedMul: 2.26, biomassGoal: 2450, core: 0xf4ecff, glow: 0xa86bff },
];

/** Скорость игрока с учётом Шкалы бытия (0..14): базовая скорость x множитель шкалы */
export function playerSpeed(scaleIdx: number): number {
  const idx = Math.max(0, Math.min(SCALES.length - 1, Math.floor(scaleIdx)));
  return PLAYER.speed * SCALES[idx].playerSpeedMul;
}

export const METAMORPH = {
  slowT: 1.6,       // длительность bullet-time
  timeScale: 0.32,  // скорость мира в bullet-time
  zoomT: 2.6,       // длительность твина камеры
} as const;

// ============================ РАСТУЩИЙ МИР ============================

/**
 * Мир растёт с каждой шкалой: прошлый масштаб становится окрестностью нового.
 * Игрок физически уплывает за рамки первой арены в новые просторы биома.
 */
export const WORLD = {
  baseW: 1120,
  baseH: 630,
  step: 1.24,        // множитель размера мира за метаморфоз (15 шкал - шаг мягче)
  tailKeep: 0.45,    // доля хвоста, стягиваемая в ядро при метаморфозе
  tailDpsBonus: 0.22, // прибавка урона хлыста за пережитый метаморфоз
} as const;

/** Размер мира в мировых единицах для индекса шкалы 0..14 */
export function worldSize(scaleIdx: number): { w: number; h: number } {
  const m = Math.pow(WORLD.step, Math.max(0, scaleIdx));
  return { w: Math.round(WORLD.baseW * m), h: Math.round(WORLD.baseH * m) };
}

// ============================ ВИЗУАЛЬНАЯ ЭВОЛЮЦИЯ ============================

// Палитра тела игрока (ядро core / ореол glow) перенесена прямо в ScaleTheme:
// см. поля SCALES[i].core и SCALES[i].glow (синхронно с wgsl-палитрой).

/** Лимит фиолетовых маяков за элитными врагами */
export const ELITE_BEACONS = 8;

// ============================ БИОМ-МОДИФИКАТОРЫ ============================

/**
 * Интерактивные биом-модификаторы каждой 3-й шкалы: смена масштаба ощущается
 * как смена правил, а не просто зумаут. Только силы и поля - без новых сущностей
 * и коллизий. Все тайминги и множители собраны здесь, в BIOME_FX.
 */
export type BiomeFxKind = 'flow' | 'ribs' | 'wind' | 'slick' | 'tide';

/** Шкала 3 КРОВЕНОСНЫЙ ТРАКТ: ТЕЧЕНИЕ - пульсирующая конвекция, сносит тело */
export interface BiomeFlowFx {
  kind: 'flow';
  /** Частота пульса-сердцебиения конвекции, Гц */
  pulseHz: number;
  /** Период полного оборота направления (360 град), сек */
  rotPeriod: number;
  /** Сила на игрока как доля от его текущей скорости */
  playerFrac: number;
  /** Сила на врагов как доля от их текущей скорости */
  enemyFrac: number;
}

/** Шкала 6 КОСТНЫЙ ЛАБИРИНТ: ТЕНИ РЁБЕР - дрейфующие вертикальные полосы */
export interface BiomeRibsFx {
  kind: 'ribs';
  /** Число полос */
  count: number;
  /** Ширина полосы как доля ширины мира */
  widthFrac: number;
  /** Период дрейфа центров полос, сек */
  driftPeriod: number;
  /** Амплитуда дрейфа как доля ширины мира */
  driftAmpFrac: number;
  /** Множитель скорости врагов внутри полосы */
  enemyMul: number;
  /** Множитель скорости игрока внутри полосы */
  playerMul: number;
}

/** Шкала 9 ГРИБНЫЕ ТАЙГИ: СПОРОВЫЙ ВЕТЕР - порывы сносят души и тело */
export interface BiomeWindFx {
  kind: 'wind';
  /** Период следования порывов, сек */
  gustPeriod: number;
  /** Длительность порыва, сек */
  gustDur: number;
  /** Телеграф до порыва, сек */
  telegraph: number;
  /** Период оборота направления ветра (резче течения), сек */
  rotPeriod: number;
  /** Толчок игрока как доля от его скорости */
  playerFrac: number;
  /** Ускорение душ XP в порыве, px/s^2 */
  orbAccel: number;
}

/** Шкала 12 ПОЛЯРНЫЙ ЩИТ: СКОЛЬЗКАЯ ИНЕРЦИЯ - разгон/торможение, вязкий отброс */
export interface BiomeSlickFx {
  kind: 'slick';
  /** Темп сближения скорости с целевой (меньше - скользче), 1/с */
  accel: number;
  /** Множитель темпа разгона во время рывка */
  dashAccelMul: number;
  /** Во сколько раз медленнее гаснет отброс врагов */
  kbDecayMul: number;
}

/** Шкала 15 ФРАКТАЛ БЕСКОНЕЧНОСТИ: ФРАКТАЛЬНЫЕ ПРИЛИВЫ - волна ускоряет всё */
export interface BiomeTideFx {
  kind: 'tide';
  /** Период волн, сек */
  period: number;
  /** Длительность волны, сек */
  dur: number;
  /** Телеграф до волны, сек */
  telegraph: number;
  /** Множитель скорости всего живого в волне */
  speedMul: number;
}

export type BiomeFxConfig = BiomeFlowFx | BiomeRibsFx | BiomeWindFx | BiomeSlickFx | BiomeTideFx;

/**
 * Таблица модификаторов по индексу шкалы 0..14 (вне таблицы модификатора нет):
 * 2 - КРОВЕНОСНЫЙ ТРАКТ (ТЕЧЕНИЕ), 5 - КОСТНЫЙ ЛАБИРИНТ (ТЕНИ РЁБЕР),
 * 8 - ГРИБНЫЕ ТАЙГИ (СПОРОВЫЙ ВЕТЕР), 11 - ПОЛЯРНЫЙ ЩИТ (СКОЛЬЗКАЯ ИНЕРЦИЯ),
 * 14 - ФРАКТАЛ БЕСКОНЕЧНОСТИ (ФРАКТАЛЬНЫЕ ПРИЛИВЫ).
 */
export const BIOME_FX: Record<number, BiomeFxConfig> = {
  2: { kind: 'flow', pulseHz: 1.2, rotPeriod: 90, playerFrac: 0.22, enemyFrac: 0.3 },
  5: { kind: 'ribs', count: 5, widthFrac: 0.085, driftPeriod: 26, driftAmpFrac: 0.055, enemyMul: 1.25, playerMul: 0.92 },
  8: { kind: 'wind', gustPeriod: 9, gustDur: 2.2, telegraph: 0.8, rotPeriod: 34, playerFrac: 0.3, orbAccel: 420 },
  11: { kind: 'slick', accel: 3.6, dashAccelMul: 2.2, kbDecayMul: 1.6 },
  14: { kind: 'tide', period: 8, dur: 1.5, telegraph: 1.0, speedMul: 1.3 },
};

/** Конфиг модификатора по id шкалы 1..15 (для рендера) или null */
export function biomeFxCfgForScaleId(scaleId: number): BiomeFxConfig | null {
  return BIOME_FX[scaleId - 1] ?? null;
}

/** Пульс течения: гладкий конверт 0..1 с частотой hz (сердцебиение) */
export function flowPulseAt(t: number, hz: number): number {
  return Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t), 1.5);
}

/** Направление медленно вращающегося поля в момент t, радианы */
export function rotAngleAt(t: number, period: number): number {
  return (t / period) * Math.PI * 2;
}

/** Конверт порыва/волны 0..1 в цикле period: активен первые dur сек цикла */
export function gustEnvelopeAt(t: number, period: number, dur: number): number {
  const phase = ((t % period) + period) % period;
  if (phase >= dur) return 0;
  return Math.sin((phase / dur) * Math.PI);
}

/** Телеграф: последние telegraph сек цикла (прямо перед следующим порывом) */
export function telegraphActiveAt(t: number, period: number, telegraph: number): boolean {
  const phase = ((t % period) + period) % period;
  return phase >= period - telegraph;
}

/**
 * Полосы "теней рёбер" шкалы 6: x-диапазоны вертикальных зон в момент t.
 * t - общий таймер симуляции и рендера (nowSec из главного цикла), поэтому
 * отрисовка совпадает с проверками геймплея с точностью до кадра.
 */
export function ribBandsAt(t: number, worldW: number, cfg: BiomeRibsFx): { x0: number; x1: number }[] {
  const bands: { x0: number; x1: number }[] = [];
  const width = worldW * cfg.widthFrac;
  const amp = worldW * cfg.driftAmpFrac;
  for (let i = 0; i < cfg.count; i++) {
    const center = worldW * ((i + 0.5) / cfg.count)
      + amp * Math.sin((t / cfg.driftPeriod) * Math.PI * 2 + i * 1.7);
    bands.push({ x0: center - width / 2, x1: center + width / 2 });
  }
  return bands;
}

/** Точка внутри одной из полос? */
export function ribBandHit(bands: { x0: number; x1: number }[], x: number): boolean {
  for (const b of bands) if (x >= b.x0 && x <= b.x1) return true;
  return false;
}
