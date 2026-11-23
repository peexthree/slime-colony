// Общие типы и константы LUMIVORE: THE LIVING FRACTAL
// Bio-Evolutive Roguelite: Змейка x Spore x Vampire Survivors x Physarum

export const SIM_WIDTH = 960;
export const SIM_HEIGHT = 540;
export const MAX_BEACONS = 32;
export const MAX_NODES = 16;
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

/** Узел территории: захватывается плотностью штаммов, даёт бонус владельцу */
export interface BioNode {
  id: number;
  x: number;
  y: number;
  radius: number;
  owner: -1 | 0 | 1;
  capture: number;
  kind: NodeKind;
}

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

export const DNA_ICONS: Record<DnaBranch, string> = { vermis: '🐍', chimera: '🧪', mycelium: '🌿', symbiont: '⚡' };
export const DNA_NAMES: Record<DnaBranch, string> = { vermis: 'ВЕРМИС', chimera: 'ХИМЕРА', mycelium: 'МИЦЕЛИЙ', symbiont: 'СИМБИОНТ' };

/** Пороги накопленной ДНК-биомассы для уровней 1..3 ветки */
export const DNA_LEVELS = [15, 35, 60] as const;

export interface HybridDef {
  id: HybridId;
  name: string;
  desc: string;
  a: DnaBranch;
  b: DnaBranch;
}

/** Шесть Великих Гибридов: уникальная механика слияния двух геномов */
export const HYBRIDS: HybridDef[] = [
  { id: 'plasma_leviathan', name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', desc: 'Огненный Удав: кольцо смерти аннигилирует всё внутри', a: 'vermis', b: 'chimera' },
  { id: 'ouroboros', name: 'УРОБОРОС-ПАРАЗИТ', desc: 'Живой Инкубатор: жертвы хвоста прирастают сегментами тела', a: 'vermis', b: 'mycelium' },
  { id: 'phase_serpent', name: 'ФАЗОВЫЙ ЗМЕЙ', desc: 'Грави-Хлыст: хвост перехватывает снаряды и швыряет их во врагов', a: 'vermis', b: 'symbiont' },
  { id: 'spore_reactor', name: 'СПОРОВЫЙ РЕАКТОР', desc: 'Чумная Сверхновая: нова заражает спорами, трупы детонируют цепью', a: 'chimera', b: 'mycelium' },
  { id: 'ion_colossus', name: 'ИОННЫЙ КОЛОСС', desc: 'Тесла-Сеть: орбиты бьют дугами по врагам, разрезая толпу', a: 'chimera', b: 'symbiont' },
  { id: 'psi_web', name: 'ПСИ-СЕТЬ', desc: 'Сверхразум: захваченные узлы бьют лазерами, захват ускорен', a: 'mycelium', b: 'symbiont' },
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
  grub:     { hp: 12,  speed: 38, dmg: 8,  radius: 7,  xp: 1,  color: 0xc084fc, tail: 6,  dna: 'vermis' },
  runner:   { hp: 9,   speed: 66, dmg: 10, radius: 6,  xp: 2,  color: 0xe879f9, tail: 8,  dna: 'symbiont' },
  brute:    { hp: 62,  speed: 24, dmg: 16, radius: 12, xp: 6,  color: 0xa855f7, tail: 10, dna: 'mycelium' },
  boss:     { hp: 850, speed: 20, dmg: 24, radius: 22, xp: 40, color: 0xd946ef, tail: 18, dna: 'vermis' },
  // --- Экосистема: организмы с уникальным поведением ---
  splitter: { hp: 30,  speed: 40, dmg: 8,  radius: 9,  xp: 3,  color: 0xd8b4fe, tail: 8,  dna: 'mycelium' },  // при смерти -> 2 бегуна
  spitter:  { hp: 20,  speed: 48, dmg: 6,  radius: 7,  xp: 3,  color: 0xf0abfc, tail: 7,  dna: 'chimera' },   // держит дистанцию, плюёт ядом
  healer:   { hp: 26,  speed: 44, dmg: 6,  radius: 7,  xp: 4,  color: 0x86efac, tail: 6,  dna: 'mycelium' },  // лечит ближних - приоритетная цель
  pulsar:   { hp: 55,  speed: 0,  dmg: 14, radius: 14, xp: 8,  color: 0xfb7185, tail: 0,  dna: 'chimera' },   // стоит и бьёт кольцами
  mirror:   { hp: 140, speed: 58, dmg: 14, radius: 10, xp: 12, color: 0xfda4af, tail: 12, dna: 'symbiont' }, // отражает геном игрока
  colony:   { hp: 150, speed: 18, dmg: 14, radius: 16, xp: 15, color: 0xc4b5fd, tail: 10, dna: 'vermis' },   // матка + выводок
  brood:    { hp: 6,   speed: 62, dmg: 6,  radius: 4,  xp: 1,  color: 0xe9d5ff, tail: 4,  dna: 'vermis' },   // выводок колонии
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

/** Время появления новых организмов в спавн-таблице */
export const SPAWN_TABLE: { since: number; type: EnemyType; chance: number }[] = [
  { since: 40,  type: 'splitter', chance: 0.10 },
  { since: 60,  type: 'spitter',  chance: 0.10 },
  { since: 80,  type: 'healer',   chance: 0.08 },
  { since: 100, type: 'pulsar',   chance: 0.06 },
  { since: 150, type: 'colony',   chance: 0.05 },
  { since: 240, type: 'mirror',   chance: 0.04 },
];

/** Шипы: авто-выстрел в ближайшую цель. Таблицы по уровням 1..4 */
export const SPIKES = {
  cd:    [1.15, 1.05, 0.95, 0.85],
  dmg:   [10, 12, 15, 18],
  count: [1, 2, 2, 3],
} as const;

/** Молния-орбиты: сферы вращаются вокруг игрока */
export const ORBS = {
  count:  [2, 3, 4, 5],
  dmg:    [8, 10, 12, 15],
  radius: [55, 62, 70, 78],
  speed:  2.4,
  orbCd:  0.4,
} as const;

/** Нова-импульс: периодический взрыв-кольцо с отбросом */
export const NOVA = {
  cd:     [5, 4.6, 4.2, 3.8],
  dmg:    [24, 30, 36, 44],
  radius: [90, 100, 112, 124],
} as const;

/** Токсин-аура: постоянный урон вокруг игрока */
export const AURA = {
  dps:    [6, 9, 12, 16],
  radius: [45, 52, 60, 70],
  tick:   0.25,
} as const;

/** Жвалы: рассекающий фронтальный укус перед организмом */
export const MANDIBLES = {
  cd:     [1.6, 1.4, 1.2, 1.0],
  dmg:    [28, 38, 52, 68],
  range:  [58, 66, 75, 86],
  arc:    Math.PI * 0.65, // ~117 градусов сектор удара
} as const;

/** Споровые цисты: коконы-мины, оставляемые хвостом */
export const CYSTS = {
  cd:       [3.2, 2.7, 2.2, 1.8],
  dmg:      [32, 45, 60, 80],
  radius:   [48, 54, 60, 68],
  maxCysts: [3, 4, 5, 6],
} as const;

/** Фазовый рывок (Dash) */
export const DASH = {
  cd: 3.5,
  duration: 0.22,
  speedMul: 3.4,
  iframe: 0.35,
} as const;

export const WEAPON_MAX_LVL = 4;
export const STAT_MAX_STACKS = 5;

export const PLAYER = {
  hp: 100,
  speed: 122,
  radius: 6,
  magnet: 90,
} as const;

export const PROJ_SPEED = 330;
export const PROJ_LIFE = 1.3;
export const PROJ_RADIUS = 5;
export const IFRAME = 0.35;
export const ENEMY_CAP = 260;

/** Первый босс и период появления следующих */
export const BOSS_FIRST_AT = 90;
export const BOSS_EVERY = 90;

/**
 * Хвост светляка - это ресурс и тело одновременно:
 * растёт от собранных душ, тает от движения, чем длиннее - тем сильнее
 */
export const TAIL = {
  startLen: 14,
  minLen: 6,
  baseMax: 16,
  maxPerLvl: 2,      // ёмкость хвоста растёт с уровнем
  moveCost: 1.2,     // сегментов в секунду при движении (умножается на размер)
  idleCost: 1.0,     // сегментов в секунду без движения (метаболизм формы)
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
  minArea: 3800,     // минимальная площадь полигона в px симуляции
  cooldown: 2.5,     // сек между схлопываниями
  dmgPerSeg: 1.6,    // урон внутри = длина хвоста x этот множитель
  historyWindow: 130,// сегментов траектории в поиске замыкания
  skipAdj: 5,        // соседние сегменты не считаются пересечением
} as const;

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
  name: string;
  sub: string;
  zoom: number;          // целевой зум камеры после метаморфоза
  enemyHpMul: number;    // множитель HP врагов на шкале
  enemyDmgMul: number;   // множитель урона врагов на шкале
  enemySizeMul: number;  // множитель физического размера врагов
  enemySpeedMul: number; // множитель скорости врагов
  biomassGoal: number;   // биомасса для созревания Титана
}

/** 5 масштабов бытия: от капли до фрактала. Зумаут - кульминация шкалы */
export const SCALES: ScaleTheme[] = [
  { id: 1, name: 'ПЕРВИЧНАЯ КАПЛЯ', sub: 'Микро-мир: капля жижи из реактора зонда', zoom: 1.0, enemyHpMul: 1.0, enemyDmgMul: 1.0, enemySizeMul: 1.0, enemySpeedMul: 1.0, biomassGoal: 120 },
  { id: 2, name: 'КРОВЕНОСНЫЙ ТРАКТ', sub: 'Ткань: пульсирующие стенки сосуда', zoom: 0.85, enemyHpMul: 2.0, enemyDmgMul: 1.6, enemySizeMul: 1.45, enemySpeedMul: 1.12, biomassGoal: 240 },
  { id: 3, name: 'ВНУТРЕННИЙ ОКЕАН', sub: 'Орган: чёрная желчь и светящийся планктон', zoom: 0.72, enemyHpMul: 3.8, enemyDmgMul: 2.4, enemySizeMul: 2.0, enemySpeedMul: 1.25, biomassGoal: 380 },
  { id: 4, name: 'КОНТИНЕНТАЛЬНЫЙ РАЗЛОМ', sub: 'Планета: полушарие Ξ-9', zoom: 0.60, enemyHpMul: 6.5, enemyDmgMul: 3.5, enemySizeMul: 2.7, enemySpeedMul: 1.4, biomassGoal: 560 },
  { id: 5, name: 'ФРАКТАЛ БЕСКОНЕЧНОСТИ', sub: 'Метаматематика: выход за пределы биологии', zoom: 0.50, enemyHpMul: 11.0, enemyDmgMul: 4.8, enemySizeMul: 3.5, enemySpeedMul: 1.55, biomassGoal: 760 },
];

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
  step: 1.55,        // множитель размера мира за метаморфоз
  tailKeep: 0.45,    // доля хвоста, стягиваемая в ядро при метаморфозе
  tailDpsBonus: 0.35, // прибавка урона хлыста за пережитый метаморфоз
} as const;

/** Размер мира в мировых единицах для индекса шкалы 0..4 */
export function worldSize(scaleIdx: number): { w: number; h: number } {
  const m = Math.pow(WORLD.step, Math.max(0, scaleIdx));
  return { w: Math.round(WORLD.baseW * m), h: Math.round(WORLD.baseH * m) };
}

// ============================ ВИЗУАЛЬНАЯ ЭВОЛЮЦИЯ ============================

/** Тело игрока: цвет ядра и ореола по шкале бытия (синхронно с wgsl-палитрой) */
export const SCALE_FORM: Record<number, { core: number; glow: number }> = {
  1: { core: 0xeafffb, glow: 0x66fcf1 },
  2: { core: 0xeafff4, glow: 0x57e6a9 },
  3: { core: 0xe8f2ff, glow: 0x4d8dff },
  4: { core: 0xfff1e0, glow: 0xff8a3d },
  5: { core: 0xf4ecff, glow: 0xa86bff },
};

/** Лимит фиолетовых маяков за элитными врагами */
export const ELITE_BEACONS = 8;
