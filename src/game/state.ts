// Состояние забега: единый mutable-объект вместо гигантского замыкания main.ts.
// Все таймеры, массивы сущностей, множители и флаги одного забега + производные
// геттеры (эффективный урон, ёмкость хвоста, ДНК-уровень) над этим состоянием.
import type { BioNode, DnaBranch, DnaBranchOrNeutral, EnemyType, HybridId, WeaponId } from '../engine/types';
import { BOSS_FIRST_AT, DNA_LEVELS, ELITE, HYBRIDS, IFRAME, PLAYER, SCALES, SPAWN, TAIL, WEAPON_BRANCH, worldSize } from '../engine/types';
import { getCodexBonuses } from '../engine/codex';
import type { CodexBonusSummary } from '../engine/codex';
import { getDailyChallenge } from '../engine/challenge';
import type { DailyChallengeInfo } from '../engine/challenge';
import type { RunGenome } from '../engine/biolab';
import { xpRequiredForLevel } from './progression';
import type {
  Anomaly, CorpseBeacon, Cyst, DamageCause, EProj, Enemy, MandibleSwipe, Proj, XpOrb,
} from './entities';

/** Состояние хвоста для HUD и рендера */
export type TailState = 'ok' | 'low' | 'crit';

/** Основной геном: нейтральный образец, ветка ДНК или Великий Гибрид */
export type GenomeId = DnaBranchOrNeutral | HybridId;

/** Окно Симбиотического Резонанса: сколько секунд держится серия сбора душ */
export const RESONANCE_WINDOW = 3.0;

export interface RunState {
  // ---------- Мир и камера ----------
  curWorldW: number;
  curWorldH: number;
  player: { x: number; y: number; hp: number; iframe: number };
  playerDirX: number;
  playerDirY: number;
  camX: number;
  camY: number;
  prevCamX: number;
  prevCamY: number;
  camZoom: number;

  // ---------- Характеристики организма ----------
  maxHp: number;
  moveSpeed: number;
  magnetR: number;
  regen: number;
  dmgMul: number;
  atkSpdMul: number;
  /** Резонанс генома: 2+ оружия одной ветки дают пассивку сборки */
  resDmgMul: number;
  resTailMul: number;
  resAtkMul: number;
  resRegen: number;
  statStacks: Record<string, number>;
  wlvl: Record<WeaponId, number>;

  // ---------- Кулдауны оружий и навыков ----------
  spikesCd: number;
  novaCd: number;
  auraTick: number;
  orbAngle: number;
  toxinFlash: number;
  mandiblesCd: number;
  cystsCd: number;
  cystMoveDist: number;
  idleTime: number;
  dashCd: number;
  dashT: number;
  dashRequested: boolean;
  callCd: number;
  callRequested: boolean;
  ringCd: number;

  // ---------- Сущности ----------
  liveCysts: Cyst[];
  mandibleSwipes: MandibleSwipe[];
  corpseBeacons: CorpseBeacon[];
  enemies: Enemy[];
  projs: Proj[];
  eprojs: EProj[];
  orbs: XpOrb[];
  enemyIdSeq: number;

  // ---------- Смерть и финал ----------
  dying: boolean;
  dyingT: number;
  lastDamageCause: DamageCause | null;
  capturedDeathBg: HTMLCanvasElement | null;
  liveAchCheckT: number;

  // ---------- Дневное испытание ----------
  dailyRunActive: boolean;
  dailyRunDone: boolean;
  dailyInfo: DailyChallengeInfo;
  dailyRng: () => number;
  dailyEnemySpeedMul: number;
  dailyTailDpsMul: number;
  dailyDmgMul: number;
  dailyCaptureSpeedMul: number;
  dailyEnemyNodeAggroMul: number;
  dailyXpMul: number;
  dailyDashCdDelta: number;
  biolabNovaCdMul: number;

  // ---------- ДНК-матрица: души, гены, гибриды ----------
  dnaXp: Record<DnaBranch, number>;
  lastDnaLvl: Record<DnaBranch, number>;
  genes: Set<string>;
  hybridsTaken: Set<HybridId>;
  /** Пары геномов, для которых уже был тост о готовности гибридизации */
  hybridNotified: Set<string>;
  mainGenome: GenomeId;
  tailCapBonus: number;
  tailDpsMul: number;
  unstableT: number;
  unstableRollT: number;
  unstableKind: number;
  puddleT: number;
  whipTipCd: number;
  psiZapT: number;
  pendingPuddles: { x: number; y: number }[];

  // ---------- Шкала бытия: метаморфоз и Титан ----------
  scaleIdx: number;
  biomass: number;
  titanPending: boolean;
  metamorphT: number;
  trailOwn: boolean;
  trailEnemy: boolean;
  winRun: boolean;

  // ---------- Элиты и статистика забега ----------
  eliteTimer: number;
  nextSpawnElite: boolean;
  damageDealt: number;
  tailMaxReached: number;
  nodesHeldMax: number;
  scaleMaxReached: number;
  lastGenome: RunGenome | null;

  // ---------- Аномалии чашки Петри ----------
  anomalies: Anomaly[];
  anomalyCd: number;
  bloomBuffT: number;
  neuralLinkActive: boolean;

  // ---------- Симбиотический Резонанс ----------
  resonanceStreak: number;
  resonanceTimer: number;
  resonanceMult: number;

  // ---------- Территория: био-узлы ----------
  bioNodes: BioNode[];
  /** Зонд плотности штамма у игрока: идёт последним узлом в readback симуляции */
  strainProbe: BioNode;
  /** Переиспользуемый буфер узлов для sim.step */
  simNodes: BioNode[];
  nextPickDelta: number;
  incubatorSpawnT: number;
  nodeRegenBonus: number;
  ampOwned: boolean;
  weaponPenalty: number;
  magnetNodeOwned: boolean;
  orbToEnemies: boolean;
  xpMul: number;
  mutagenXpMul: number;
  incubatorEnemy: boolean;
  nodeRaidScanT: number;
  nodeUnattendedT: Map<number, number>;
  frameBloom3: number;

  // ---------- Хвост как живое существо ----------
  tailLen: number;
  pathHistory: { x: number; y: number }[];
  tailTick: number;
  sinceSoul: number;
  critFlashT: number;
  tailState: TailState;
  frameN: number;
  lastStatusKey: string;
  codexBonuses: CodexBonusSummary;

  // ---------- Прогресс забега ----------
  kills: number;
  level: number;
  xp: number;
  xpNext: number;
  pendingUps: number;
  rerollsLeft: number;
  emptyRingsCount: number;
  overdriveTier: number;
  dmgTail: number;
  dmgRing: number;
  spikesFired: number;
  pacifistShown: boolean;
  scale5NoNodeTime: number;
  watcherSpawned: boolean;
  titanTrailTime: number;
  titanSatedDone: boolean;

  // ---------- Поток забега ----------
  started: boolean;
  paused: boolean;
  gameOver: boolean;
  gameTime: number;
  spawnT: number;
  /** Волновой пейсинг: таймер до следующего прилива биомассы */
  spawnWaveT: number;
  /** Телеграф волны уже показан (тост за 2с до прилива) */
  spawnWaveAnnounced: boolean;
  /** Очередь прилива: враги с задержкой старта (волна заходит пачкой, не ручейком) */
  spawnQueue: { type: EnemyType; delay: number }[];
  nextBossAt: number;

  // ---------- Ввод ----------
  mouse: { x: number; y: number; active: boolean };
  keys: Set<string>;

  // ---------- Проклятые мутации ----------
  cursePredator: boolean;
  curseChitin: boolean;
  curseHunger: boolean;

  // ---------- Реликвии органелл ----------
  relicGalvanic: boolean;
  galvanicTimer: number;
  relicAbyssal: boolean;
  abyssalLureTimer: number;
  relicCarapace: boolean;
  carapaceShieldReady: boolean;
  carapaceCooldown: number;

  // ---------- Fixed timestep ----------
  acc: number;
  simTime: number;
}

/** Фабрика начального состояния забега (без DOM и сервисов) */
export function createRunState(): RunState {
  const w = worldSize(0);
  return {
    curWorldW: w.w,
    curWorldH: w.h,
    player: { x: w.w / 2, y: w.h / 2, hp: PLAYER.hp, iframe: 0 },
    playerDirX: 1,
    playerDirY: 0,
    camX: w.w / 2,
    camY: w.h / 2,
    prevCamX: w.w / 2,
    prevCamY: w.h / 2,
    camZoom: SCALES[0].zoom,

    maxHp: PLAYER.hp,
    moveSpeed: PLAYER.speed,
    magnetR: PLAYER.magnet,
    regen: 0.18, // базовая регенерация, улучшения добавляют сверху
    dmgMul: 1,
    atkSpdMul: 1,
    resDmgMul: 1,
    resTailMul: 1,
    resAtkMul: 1,
    resRegen: 0,
    statStacks: {},
    wlvl: { spikes: 1, orbs: 0, nova: 0, aura: 0, mandibles: 0, cysts: 0 },

    spikesCd: 0,
    novaCd: 2,
    auraTick: 0,
    orbAngle: 0,
    toxinFlash: 0,
    mandiblesCd: 0,
    cystsCd: 0,
    cystMoveDist: 0,
    idleTime: 0,
    dashCd: 0,
    dashT: 0,
    dashRequested: false,
    callCd: 0,
    callRequested: false,
    ringCd: 0,

    liveCysts: [],
    mandibleSwipes: [],
    corpseBeacons: [],
    enemies: [],
    projs: [],
    eprojs: [],
    orbs: [],
    enemyIdSeq: 1,

    dying: false,
    dyingT: 0,
    lastDamageCause: null,
    capturedDeathBg: null,
    liveAchCheckT: 0,

    dailyRunActive: false,
    dailyRunDone: false,
    dailyInfo: getDailyChallenge(),
    dailyRng: Math.random,
    dailyEnemySpeedMul: 1,
    dailyTailDpsMul: 1,
    dailyDmgMul: 1,
    dailyCaptureSpeedMul: 1,
    dailyEnemyNodeAggroMul: 1,
    dailyXpMul: 1,
    dailyDashCdDelta: 0,
    biolabNovaCdMul: 1,

    dnaXp: { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 },
    lastDnaLvl: { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 },
    genes: new Set<string>(),
    hybridsTaken: new Set<HybridId>(),
    hybridNotified: new Set<string>(),
    mainGenome: 'neutral',
    tailCapBonus: 0,
    tailDpsMul: 1,
    unstableT: 0,
    unstableRollT: 0,
    unstableKind: 0,
    puddleT: 0,
    whipTipCd: 0,
    psiZapT: 0,
    pendingPuddles: [],

    scaleIdx: 0,
    biomass: 0,
    titanPending: false,
    metamorphT: 0,
    trailOwn: false,
    trailEnemy: false,
    winRun: false,

    eliteTimer: ELITE.everySec,
    nextSpawnElite: false,
    damageDealt: 0,
    tailMaxReached: 0,
    nodesHeldMax: 0,
    scaleMaxReached: 1,
    lastGenome: null,

    anomalies: [],
    anomalyCd: 42,
    bloomBuffT: 0,
    neuralLinkActive: false,

    resonanceStreak: 0,
    resonanceTimer: 0,
    resonanceMult: 1.0,

    bioNodes: [],
    strainProbe: { id: 99, x: 0, y: 0, radius: 0, owner: 0, capture: 0, kind: 'gen' },
    simNodes: [],
    nextPickDelta: 0,
    incubatorSpawnT: 20,
    nodeRegenBonus: 0,
    ampOwned: false,
    weaponPenalty: 1,
    magnetNodeOwned: false,
    orbToEnemies: false,
    xpMul: 1,
    mutagenXpMul: 1,
    incubatorEnemy: false,
    nodeRaidScanT: 0,
    nodeUnattendedT: new Map<number, number>(),
    frameBloom3: 0,

    tailLen: TAIL.startLen,
    pathHistory: [],
    tailTick: 0,
    sinceSoul: 0,
    critFlashT: 0,
    tailState: 'ok',
    frameN: 0,
    lastStatusKey: '',
    codexBonuses: getCodexBonuses(),

    kills: 0,
    level: 1,
    xp: 0,
    xpNext: xpRequiredForLevel(1),
    pendingUps: 0,
    rerollsLeft: 2,
    emptyRingsCount: 0,
    overdriveTier: 0,
    dmgTail: 0,
    dmgRing: 0,
    spikesFired: 0,
    pacifistShown: false,
    scale5NoNodeTime: 0,
    watcherSpawned: false,
    titanTrailTime: 0,
    titanSatedDone: false,

    started: false,
    paused: false,
    gameOver: false,
    gameTime: 0,
    spawnT: 1,
    spawnWaveT: SPAWN.waveFirstAt,
    spawnWaveAnnounced: false,
    spawnQueue: [],
    nextBossAt: BOSS_FIRST_AT,

    mouse: { x: w.w / 2, y: w.h / 2, active: false },
    keys: new Set<string>(),

    cursePredator: false,
    curseChitin: false,
    curseHunger: false,

    relicGalvanic: false,
    galvanicTimer: 0,
    relicAbyssal: false,
    abyssalLureTimer: 0,
    relicCarapace: false,
    carapaceShieldReady: false,
    carapaceCooldown: 0,

    acc: 0,
    simTime: 0,
  };
}

// ============================ ПРОИЗВОДНЫЕ ГЕТТЕРЫ ============================

/** ДНК-уровень генома: 0..3 по порогам накопленной биомассы душ */
export function dnaLvl(ctx: RunState, b: DnaBranch): number {
  const v = ctx.dnaXp[b];
  let lvl = 0;
  for (const th of DNA_LEVELS) if (v >= th) lvl++;
  return lvl;
}

/** Множитель Симбиотического Резонанса по длине серии сбора душ */
export function getResonanceMult(streak: number): number {
  if (streak >= 35) return 3.0;
  if (streak >= 22) return 2.5;
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

/** Ёмкость хвоста: базовый максимум + уровни + бонусы (уровни растут за забег) */
export function maxTail(ctx: RunState): number {
  return Math.round((TAIL.baseMax + ctx.level * TAIL.maxPerLvl + ctx.tailCapBonus) * ctx.codexBonuses.tailCapMul);
}

/** Урон хлыста в секунду: чем длиннее хвост, тем больнее */
export function tailDps(ctx: RunState): number {
  return (TAIL.dpsBase + ctx.tailLen * TAIL.dpsPerSeg) * ctx.tailDpsMul * ctx.resTailMul * ctx.dailyTailDpsMul;
}

/** Радиус тела: компактный организм растёт с хвостом и уровнем, но с потолком */
export function playerRadius(ctx: RunState): number {
  const base = PLAYER.radius;
  const tailBonus = Math.sqrt(Math.max(0, ctx.tailLen)) * 0.35;
  const lvlBonus = Math.min(25, ctx.level) * 0.12;
  return Math.min(17, base + tailBonus + lvlBonus);
}

/** Стоимость движения: большой хвост дороже тащить */
export function moveCost(ctx: RunState): number {
  return TAIL.moveCost * (0.8 + ctx.tailLen * 0.02);
}

/** Видимая траектория хвоста: последние tailLen точек пути */
export function visibleTail(ctx: RunState): { x: number; y: number }[] {
  return ctx.pathHistory.slice(-Math.max(1, Math.floor(ctx.tailLen)));
}

/** Эффективный урон: множители бонусов, узлов, резонанса и «Нестабильного генома» */
export function effDmg(ctx: RunState): number {
  return ctx.dmgMul
    * ctx.resDmgMul
    * ctx.weaponPenalty
    * (ctx.ampOwned ? 1.12 : 1)
    * ctx.dailyDmgMul
    * (ctx.genes.has('unstable') ? (ctx.unstableT > 0 ? 0.55 : 1.8) : 1);
}

/** Эффективная скорость атаки */
export function effAtkSpd(ctx: RunState): number {
  return ctx.atkSpdMul * ctx.resAtkMul * (ctx.unstableT > 0 && ctx.unstableKind === 2 ? 0.6 : 1);
}

/** Неуязвимость после урона: ген «Фазовый сдвиг» удваивает окно */
export function iframeNow(ctx: RunState): number {
  return IFRAME * (ctx.genes.has('phantom') ? 2 : 1) + (ctx.curseChitin ? 1.5 : 0);
}

/** Доминирующий геном для оружия: гибрид считается финалом - все ветки открыты */
export function mainBranchForWeapons(ctx: RunState): DnaBranch | null {
  const g = ctx.mainGenome;
  if (g === 'neutral') return null;
  if (HYBRIDS.some((h) => h.id === g)) return null;
  return g as DnaBranch;
}

/** Резонанс генома: 2+ оружия одной ветки -> пассивка сборки.
 *  Награда за цельность: итог прокачки - одно существо с фирменным арсеналом. */
export function refreshResonance(ctx: RunState): void {
  ctx.resDmgMul = 1; ctx.resTailMul = 1; ctx.resAtkMul = 1; ctx.resRegen = 0;
  const cnt: Record<DnaBranch, number> = { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 };
  for (const w of Object.keys(ctx.wlvl) as WeaponId[]) {
    if (ctx.wlvl[w] > 0) cnt[WEAPON_BRANCH[w]]++;
  }
  for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
    if (cnt[b] < 2) continue;
    if (b === 'vermis') ctx.resTailMul = 1.15;
    else if (b === 'chimera') ctx.resDmgMul = 1.10;
    else if (b === 'mycelium') ctx.resRegen = 1;
    else ctx.resAtkMul = 1.10;
  }
}

/** Перечитать бонусы кодекса после открытия новой записи */
export function refreshCodexBonuses(ctx: RunState): void {
  ctx.codexBonuses = getCodexBonuses();
}
