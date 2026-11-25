// Общие типы и константы LUMIVORE: THE LIVING FRACTAL
// Bio-Evolutive Roguelite: Змейка x Spore x Vampire Survivors x Physarum

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
  { id: 'plasma_leviathan', name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', desc: 'Огненный Удав: Кольцо Смерти наносит x4 урона и аннигилирует обычных врагов внутри', a: 'vermis', b: 'chimera' },
  { id: 'ouroboros', name: 'УРОБОРОС-ПАРАЗИТ', desc: 'Живой Инкубатор: враги, убитые хвостом, прирастают живыми сегментами', a: 'vermis', b: 'mycelium' },
  { id: 'phase_serpent', name: 'ФАЗОВЫЙ ЗМЕЙ', desc: 'Грави-Хлыст: хвост перехватывает вражеские снаряды и швыряет их обратно', a: 'vermis', b: 'symbiont' },
  { id: 'spore_reactor', name: 'СПОРОВЫЙ РЕАКТОР', desc: 'Чумная Сверхновая: Нова заражает врагов спорами, их тела детонируют цепью', a: 'chimera', b: 'mycelium' },
  { id: 'ion_colossus', name: 'ИОННЫЙ КОЛОСС', desc: 'Тесла-Сеть: электроорбиты бьют дугами по ближайшим врагам', a: 'chimera', b: 'symbiont' },
  { id: 'psi_web', name: 'ПСИ-СЕТЬ', desc: 'Сверхразум: узлы захватываются быстрее, а ваши узлы бьют лазерами', a: 'mycelium', b: 'symbiont' },
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
  grub:     { hp: 13,  speed: 44, dmg: 9,  radius: 7,  xp: 1,  color: 0xc084fc, tail: 6,  dna: 'vermis' },
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

/** Время появления новых организмов в спавн-таблице */
export const SPAWN_TABLE: { since: number; type: EnemyType; chance: number }[] = [
  { since: 35,  type: 'splitter', chance: 0.10 },
  { since: 55,  type: 'spitter',  chance: 0.11 },
  { since: 75,  type: 'healer',   chance: 0.08 },
  { since: 95,  type: 'pulsar',   chance: 0.06 },
  { since: 145, type: 'colony',   chance: 0.05 },
  { since: 230, type: 'mirror',   chance: 0.04 },
];

/** Минимальный уровень игрока для открытия каждого оружия и максимум слотов */
export const MAX_EQUIPPED_WEAPONS = 4;
export const WEAPON_UNLOCK_LEVEL: Record<WeaponId, number> = {
  spikes: 1,
  mandibles: 3,
  orbs: 5,
  aura: 7,
  nova: 9,
  cysts: 11,
};

/** Шипы: авто-выстрел в ближайшую цель. Таблицы по уровням 1..4 */
export const SPIKES = {
  cd:    [1.35, 1.18, 1.02, 0.88],
  dmg:   [9, 12, 16, 21],
  count: [1, 1, 2, 3],
} as const;

/** Молния-орбиты: сферы вращаются вокруг игрока (открываются с 5 ур.) */
export const ORBS = {
  count:  [1, 2, 3, 4],
  dmg:    [7, 10, 13, 17],
  radius: [50, 56, 63, 70],
  speed:  2.3,
  orbCd:  0.45,
} as const;

/** Нова-импульс: периодический взрыв-кольцо с отбросом (открывается с 9 ур.) */
export const NOVA = {
  cd:     [6.5, 5.8, 5.1, 4.4],
  dmg:    [20, 27, 35, 45],
  radius: [80, 92, 104, 118],
} as const;

/** Токсин-аура: постоянный урон вокруг игрока (открывается с 7 ур.) */
export const AURA = {
  dps:    [5, 8, 12, 17],
  radius: [38, 45, 53, 62],
  tick:   0.25,
} as const;

/** Жвалы: рассекающий фронтальный укус перед организмом (открываются с 3 ур.) */
export const MANDIBLES = {
  cd:     [1.7, 1.45, 1.25, 1.05],
  dmg:    [22, 30, 40, 52],
  range:  [54, 62, 70, 80],
  arc:    Math.PI * 0.62, // ~112 градусов сектор удара
} as const;

/** Споровые цисты: коконы-мины, сбрасываются только при движении (открываются с 11 ур.) */
export const CYSTS = {
  cd:       [3.8, 3.3, 2.8, 2.3],
  dmg:      [18, 25, 34, 44],
  radius:   [34, 40, 46, 52],
  maxCysts: [3, 4, 5, 7],
  perDrop:  [1, 1, 1, 2],
  moveDist: 85,
  armTime:  0.55,
  blastMul: 1.3,
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
  hp: 100,
  speed: 120,
  radius: 6,
  magnet: 66,
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
 * Хвост особи — это ресурс и тело одновременно:
 * растёт от собранных сфер ДНК, тает от движения, чем длиннее — тем сильнее
 */
export const TAIL = {
  startLen: 14,
  minLen: 6,
  baseMax: 16,
  maxPerLvl: 2,      // ёмкость хвоста растёт с уровнем
  moveCost: 1.25,    // сегментов в секунду при движении (умножается на размер)
  idleCost: 1.15,    // сегментов в секунду без движения (метаболизм формы — поощряет движение)
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

/** 5 масштабов бытия: от капли до фрактала. Зумаут — кульминация шкалы */
export const SCALES: ScaleTheme[] = [
  { id: 1, name: 'ПЕРВИЧНАЯ КАПЛЯ', sub: 'Микромир: капля биомассы в реакторе зонда «ЕвроКорп-3»', zoom: 1.0, enemyHpMul: 1.0, enemyDmgMul: 1.0, enemySizeMul: 1.0, enemySpeedMul: 1.0, biomassGoal: 130 },
  { id: 2, name: 'КРОВЕНОСНЫЙ ТРАКТ', sub: 'Ткань носителя: пульсирующие стенки сосуда', zoom: 0.85, enemyHpMul: 2.1, enemyDmgMul: 1.65, enemySizeMul: 1.45, enemySpeedMul: 1.14, biomassGoal: 270 },
  { id: 3, name: 'ВНУТРЕННИЙ ОКЕАН', sub: 'Орган: чёрная желчь и биолюминесцентная взвесь', zoom: 0.72, enemyHpMul: 4.0, enemyDmgMul: 2.5, enemySizeMul: 2.0, enemySpeedMul: 1.28, biomassGoal: 440 },
  { id: 4, name: 'КОНТИНЕНТАЛЬНЫЙ РАЗЛОМ', sub: 'Планета Ξ-9: магматическая кора полушария', zoom: 0.60, enemyHpMul: 6.8, enemyDmgMul: 3.6, enemySizeMul: 2.7, enemySpeedMul: 1.42, biomassGoal: 660 },
  { id: 5, name: 'ФРАКТАЛ БЕСКОНЕЧНОСТИ', sub: 'Метаматематика: выход за пределы биологии', zoom: 0.50, enemyHpMul: 11.5, enemyDmgMul: 5.0, enemySizeMul: 3.5, enemySpeedMul: 1.58, biomassGoal: 920 },
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
