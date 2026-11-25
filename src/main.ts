// LUMIVORE: THE LIVING FRACTAL - игровой цикл био-эволютивного рогалика
// Змейка-хвост + ДНК-матрица Spore + Кольцо Смерти + метаморфоз 5 шкал.
// Сущности на CPU + Pixi-пулы, physarum-симуляция живёт вместе с игроком
import { PixiOverlay, AnomalyView } from './engine/PixiOverlay';
import { PetriRadar } from './engine/radar';
import { WebGPUSim, NodeStat } from './engine/WebGPUSim';
import { Sfx } from './engine/audio';
import { WaveDirector } from './engine/waves';
import {
  BIOLAB_UNLOCKS, BiolabCategory, DnaBranch, MAX_ACTIVE_BIOLAB, RunGenome,
  addBiolabPoints, disableAllBiolab, getActiveIds, isActive, isUnlocked,
  loadBiolab, pointsEarned, purchase, recordRun, toggleModule,
} from './engine/biolab';
import { downloadPortrait, renderPortrait } from './engine/portrait';
import { createJoystick } from './engine/joystick';
import { GamepadController } from './engine/gamepad';
import { CODEX_ENTRIES, getCodexBonuses, loadCodex, unlockCodexEntry } from './engine/codex';
import { AchievementDef, ACHIEVEMENTS, checkAchievements, loadAchievements } from './engine/achievements';
import { recordLeaderboardEntry } from './engine/leaderboard';
import { getDailyChallenge, isDailyCompleted, markDailyCompleted, mulberry32 } from './engine/challenge';
import { getLocale, setLocale, t, I18nKey } from './i18n';
import { trBiolab, trChallengeTitle, trCodex, trDnaName, trHybrid, trNode, trScale, trUpgrade } from './i18n/gameData';
import { inPoly, polyArea, segIsect } from './game/ringOfDeath';
import { SpatialHashGrid } from './game/spatialHash';
import { canUnlockWeapon, canUpgradeWeapon, equippedWeaponCount, xpRequiredForLevel } from './game/progression';
import { stepBioNodes } from './game/bioNodes';
import { ENEMY_SPRITES, ENEMY_SPRITES_V2, ENEMY_SPRITES_V4 } from './engine/svgAssets';
import {
  AURA, Beacon, BioNode, BOSS_EVERY, BOSS_FIRST_AT, CALL, CYSTS, DASH, DNA_COLORS, DNA_LEVELS,
  DNA_NAMES, ELITE, ENEMIES, ENEMY_CAP, EnemyType, GROWTH, HybridId, HYBRIDS, IFRAME, MANDIBLES,
  MAX_EQUIPPED_WEAPONS, METAMORPH, NOVA, NodeKind, ORBS, PLAYER, PROJ_LIFE, PROJ_RADIUS, PROJ_SPEED, RING,
  SCALES, SIM_HEIGHT, SIM_WIDTH, SPAWN_TABLE, SPIKES, STAT_MAX_STACKS, STRAIN, TAIL,
  WeaponId, WEAPON_MAX_LVL, WEAPON_UNLOCK_LEVEL, WORLD, worldSize,
} from './engine/types';
import type { DnaBranchOrNeutral, EliteMutation } from './engine/types';

interface Enemy {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  radius: number;
  dmg: number;
  type: EnemyType;
  flash: number;
  atkCd: number;
  orbCd: number;
  tailCd: number;
  kbx: number; kby: number; // отброс от новы
  /** Мутация элиты (золотой ореол) */
  elite: EliteMutation | null;
  /** Заражённый союзник (Паразит): таймер, 0 = обычный враг */
  infected: number;
  /** Споровое заражение (Споровый Реактор): тик урона + детонация при смерти */
  sporeInf: number;
  /** Титан масштаба: хранитель метаморфоза */
  titan: boolean;
  /** Активирована фаза ярости босса/титана при < 40% HP */
  enragedPhase?: boolean;
  /** Ссылка на матку для выводка колонии */
  colonyId: number;
  /** Перезарядка особого поведения (плевок/кольцо/выводок) */
  skillCd: number;
  /** Хвостик: история позиций [старые ... новые] */
  tail: { x: number; y: number }[];
  tailCap: number;
  /** ID био-башни, которую враг пытается отбить у игрока */
  raidNodeId?: number;
  dead?: boolean;
}

interface Proj {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  dmg: number;
  /** Сколько отскоков осталось (Цепная реакция) */
  bounces: number;
}

interface XpOrb {
  x: number; y: number;
  vx: number; vy: number;
  value: number;
  color: number; // душа несёт цвет своего генома
  dna: DnaBranch;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function bootstrap() {
  const stage = document.getElementById('stage')!;
  const gpuCanvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
  const pixiCanvas = document.getElementById('pixi-canvas') as HTMLCanvasElement;

  const hpFillEl = document.getElementById('hp-fill')!;
  const hpNumEl = document.getElementById('hp-num')!;
  const hpWrapEl = document.getElementById('hp-wrap')!;
  const tailNumEl = document.getElementById('tail-num')!;
  const tailFillEl = document.getElementById('tail-fill')!;
  const tailwarnEl = document.getElementById('tailwarn')!;
  const nodesChipEl = document.getElementById('nodes-chip')!;
  const xpConduitFillEl = document.getElementById('xp-conduit-fill');
  const levelEl = document.getElementById('level')!;
  const timerEl = document.getElementById('timer')!;
  const waveEl = document.getElementById('wave')!;
  const killsEl = document.getElementById('kills')!;
  const scaleChipEl = document.getElementById('scale-chip')!;
  const bioFillEl = document.getElementById('bio-fill')!;
  const toastEl = document.getElementById('toast')!;
  const hurtEl = document.getElementById('hurt')!;
  const intro = document.getElementById('intro')!;
  const introStartBtn = document.getElementById('intro-start')!;
  const helpBtn = document.getElementById('help-btn')!;
  const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement | null;
  const muteBtnUse = document.getElementById('mute-btn-use');
  const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement | null;
  const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement | null;
  const pauseBtnUse = document.getElementById('pause-btn-use');
  const bossHudEl = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name');
  const bossHudIcoUse = document.getElementById('boss-hud-ico-use');
  const bossHpFillEl = document.getElementById('boss-hp-fill');
  const bossHpTextEl = document.getElementById('boss-hp-text');
  const statusChipsEl = document.getElementById('status-chips');
  const upgradeModal = document.getElementById('upgrade')!;
  const upgradeTitle = document.getElementById('upgrade-title')!;
  const cardsEl = document.getElementById('cards')!;
  const rerollBtn = document.getElementById('reroll-btn') as HTMLButtonElement | null;
  const modal = document.getElementById('modal')!;
  const modalTitle = document.getElementById('modal-title')!;
  const modalSub = document.getElementById('modal-sub')!;
  const deathCauseEl = document.getElementById('death-cause');
  const deathAchBtn = document.getElementById('death-ach-btn');
  const restartBtn = document.getElementById('restart-btn')!;
  const endlessBtn = document.getElementById('endless-btn') as HTMLButtonElement | null;
  const branchChipEl = document.getElementById('branch-chip')!;
  const savePortraitBtn = document.getElementById('save-portrait')!;
  const biolabBtn = document.getElementById('biolab-btn')!;
  const biolabOverlay = document.getElementById('biolab')!;
  const biolabOpenBtn = document.getElementById('biolab-open')!;
  const biolabCloseBtn = document.getElementById('biolab-close')!;
  const biolabPointsEl = document.getElementById('biolab-points')!;
  const biolabSlotsPillEl = document.getElementById('biolab-slots-pill');
  const biolabDisableAllBtn = document.getElementById('biolab-disable-all') as HTMLButtonElement | null;
  const biolabListEl = document.getElementById('biolab-list')!;
  const dailyModal = document.getElementById('daily-modal');
  const dailyBriefBody = document.getElementById('daily-brief-body');
  const dailyStartBtn = document.getElementById('daily-start-btn');
  const dailyCloseBtn = document.getElementById('daily-close');
  const dailyHudPillEl = document.getElementById('daily-hud-pill');
  const achievementsModal = document.getElementById('achievements-modal');
  const achievementsOpenBtn = document.getElementById('achievements-open');
  const achievementsOpenLabel = document.getElementById('achievements-open-label');
  const achStatsPillEl = document.getElementById('ach-stats-pill');
  const achProgressEl = document.getElementById('ach-progress') as HTMLProgressElement | null;
  const achievementsGridEl = document.getElementById('achievements-grid');
  const achCloseBtn = document.getElementById('ach-close');
  const codexModal = document.getElementById('codex');
  const codexOpenBtn = document.getElementById('codex-open');
  const codexCloseBtn = document.getElementById('codex-close');
  const codexGridEl = document.getElementById('codex-grid');
  const codexStatsEl = document.getElementById('codex-stats');
  const codexPrevBtn = document.getElementById('codex-prev-btn') as HTMLButtonElement | null;
  const codexNextBtn = document.getElementById('codex-next-btn') as HTMLButtonElement | null;
  const codexPageInfo = document.getElementById('codex-page-info');

  const helpModal = document.getElementById('help-modal');
  const helpModalOpenBtn = document.getElementById('help-modal-open');
  const helpCloseBtn = document.getElementById('help-close');

  const settingsModal = document.getElementById('settings-modal');
  const settingsOpenBtn = document.getElementById('settings-open');
  const settingsCloseBtn = document.getElementById('settings-close');
  const sliderBgm = document.getElementById('slider-bgm') as HTMLInputElement | null;
  const sliderSfx = document.getElementById('slider-sfx') as HTMLInputElement | null;
  const bgmVolLabel = document.getElementById('bgm-vol-label');
  const sfxVolLabel = document.getElementById('sfx-vol-label');
  const setBgmIcoUse = document.getElementById('set-bgm-ico-use');
  const setSfxIcoUse = document.getElementById('set-sfx-ico-use');

  const startBtnLabel = document.getElementById('start-btn-label');
  const menuRecordBadge = document.getElementById('menu-record-badge');
  const menuRecordText = document.getElementById('menu-record-text');
  const deathStatsEl = document.getElementById('death-stats')!;
  const portraitCanvas = document.getElementById('portrait-canvas') as HTMLCanvasElement;
  const gamepad = new GamepadController();
  const wSlots: Record<string, HTMLElement | null> = {
    spikes: document.getElementById('wh-spikes'),
    orbs: document.getElementById('wh-orbs'),
    nova: document.getElementById('wh-nova'),
    aura: document.getElementById('wh-aura'),
    mandibles: document.getElementById('wh-mandibles'),
    cysts: document.getElementById('wh-cysts'),
    dash: document.getElementById('wh-dash'),
    call: document.getElementById('wh-call'),
    ring: document.getElementById('wh-ring'),
  };
  const bloomCanvas = document.getElementById('bloom-canvas') as HTMLCanvasElement;
  const bloomCtx = bloomCanvas.getContext('2d')!;
  const radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
  const radarBadgeEl = document.getElementById('radar-badge');
  const radarSweepSvg = document.getElementById('radar-sweep-svg') as SVGSVGElement | null;
  const resHudEl = document.getElementById('resonance-hud');
  const resMultEl = document.getElementById('res-mult');
  const resStreakEl = document.getElementById('res-streak');
  const resBarFillEl = document.getElementById('res-bar-fill');
  const radar = new PetriRadar();
  if (radarCanvas) {
    radar.init(radarCanvas, radarBadgeEl, radarSweepSvg);
  }

  const sim = new WebGPUSim();
  const overlay = new PixiOverlay();
  const sfx = new Sfx();
  const joystick = createJoystick(stage, pixiCanvas);

  try {
    await sim.init(gpuCanvas);
    await overlay.init(pixiCanvas, stage);
    sim.onDeviceLost = (reason) => {
      paused = true;
      sfx.setTailDrone(false);
      sfx.stopBgm();
      showToast(t('toast_webgpu_lost', { reason }), 'danger');
    };
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error('Initialization error:', err);
    timerEl.textContent = errorMsg;
    const errorModal = document.createElement('div');
    errorModal.style.cssText = 'position:absolute;inset:0;z-index:999;background:rgba(2,6,12,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#ff5570;font-family:inherit;';
    errorModal.innerHTML = `
      <h2 style="font-size:22px;letter-spacing:0.1em;margin-bottom:14px;color:#ff3b5c;">${t('webgpu_required_title')}</h2>
      <p style="max-width:560px;font-size:13px;line-height:1.6;color:#cbd5e1;margin-bottom:16px;">
        ${t('webgpu_required_desc')}<br><br>
        ${errorMsg}
      </p>
      <div style="font-size:11px;color:#9ab0c4;max-width:480px;line-height:1.5;">
        ${t('webgpu_required_hint')}
      </div>
    `;
    stage.appendChild(errorModal);
    return;
  }

  // ---------- Состояние забега ----------
  let curWorldW = worldSize(0).w;
  let curWorldH = worldSize(0).h;
  const player = { x: curWorldW / 2, y: curWorldH / 2, hp: PLAYER.hp as number, iframe: 0 };
  let playerDirX = 1;
  let playerDirY = 0;
  let camX = player.x;
  let camY = player.y;
  let prevCamX = player.x;
  let prevCamY = player.y;
  let camZoom = SCALES[0].zoom;
  const viewHalfW = () => (overlay.screenWidth / 2) / Math.max(0.01, camZoom * (overlay.scale || 1));
  const viewHalfH = () => (overlay.screenHeight / 2) / Math.max(0.01, camZoom * (overlay.scale || 1));
  const toSimX = (wx: number) => {
    const halfViewW = (SIM_WIDTH / 2) / camZoom;
    return (wx - (camX - halfViewW)) * camZoom;
  };
  const toSimY = (wy: number) => {
    const halfViewH = (SIM_HEIGHT / 2) / camZoom;
    return (wy - (camY - halfViewH)) * camZoom;
  };
  let maxHp: number = PLAYER.hp;
  let moveSpeed = PLAYER.speed;
  let magnetR = PLAYER.magnet;
  let regen = 0.18; // базовая регенерация, улучшения добавляют сверху
  let dmgMul = 1;
  let atkSpdMul = 1;
  const statStacks: Record<string, number> = {};

const wlvl: Record<WeaponId, number> = { spikes: 1, orbs: 0, nova: 0, aura: 0, mandibles: 0, cysts: 0 };
  let spikesCd = 0;
  let novaCd = 2;
  let auraTick = 0;
  let orbAngle = 0;
  let toxinFlash = 0;
  let mandiblesCd = 0;
  let cystsCd = 0;
  let cystMoveDist = 0;
  let idleTime = 0;
  let dashCd = 0;
  let dashT = 0;
  let dashRequested = false;

  const liveCysts: { x: number; y: number; r: number; dmg: number; life: number; armT: number; armed: boolean }[] = [];
  const mandibleSwipes: { x: number; y: number; dirX: number; dirY: number; range: number; arc: number; life: number }[] = [];
  const corpseBeacons: { x: number; y: number; ttl: number }[] = [];

  let cursePredator = false;
  let curseChitin = false;
  let curseHunger = false;

  let enemies: Enemy[] = [];
  let projs: Proj[] = [];
  let eprojs: { x: number; y: number; vx: number; vy: number; dmg: number; life: number; sourceType: EnemyType; titan?: boolean; elite?: EliteMutation | null }[] = [];
  let orbs: XpOrb[] = [];
  let enemyIdSeq = 1;

  interface DamageCause {
    kind: string;
    labelRu: string;
    labelEn: string;
    amount: number;
  }
  const DYING_DURATION = 1.45;
  let dying = false;
  let dyingT = 0;
  let lastDamageCause: DamageCause | null = null;
  let capturedDeathBg: HTMLCanvasElement | null = null;
  let liveAchCheckT = 0;

  let dailyRunActive = false;
  let dailyRunDone = false;
  let dailyInfo = getDailyChallenge();
  let dailyRng: () => number = Math.random;
  let dailyEnemySpeedMul = 1;
  let dailyTailDpsMul = 1;
  let dailyDmgMul = 1;
  let dailyCaptureSpeedMul = 1;
  let dailyEnemyNodeAggroMul = 1;
  let dailyXpMul = 1;
  let dailyDashCdDelta = 0;
  let biolabNovaCdMul = 1;

  // ---- ДНК-матрица: накопленная биомасса душ по 4 геномам + гены и гибриды ----
  const dnaXp: Record<DnaBranch, number> = { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 };
  const lastDnaLvl: Record<DnaBranch, number> = { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 };
  const genes = new Set<string>();
  const hybridsTaken = new Set<HybridId>();
  const hybridNotified = new Set<string>(); // пары геномов, для которых уже был тост
  let tailCapBonus = 0;
  let tailDpsMul = 1;
  let unstableT = 0;      // дебаф «Нестабильного генома»
  let unstableRollT = 0;  // таймер до следующего дебафа
  let unstableKind = 0;
  let puddleT = 0;        // ядовитые лужи Мицелия
  let whipTipCd = 0;      // второй удар «Змеи-хлыста» Вермиса
  let psiZapT = 0;        // пульс лазеров Пси-Сети
  let ringCd = 0;         // перезарядка Кольца Смерти
  const pendingPuddles: { x: number; y: number }[] = [];

  /** ДНК-уровень генома: 0..3 по порогам накопленной биомассы душ */
  function dnaLvl(b: DnaBranch): number {
    const v = dnaXp[b];
    let lvl = 0;
    for (const th of DNA_LEVELS) if (v >= th) lvl++;
    return lvl;
  }

  // ---- Шкала бытия: метаморфоз, биомасса, Титан, камера зумаут ----
  let scaleIdx = 0;              // индекс в SCALES (0..4)
  let biomass = 0;               // прогресс к Титану текущей шкалы
  let titanPending = false;      // Титан заспавнен и ждёт боя
  let metamorphT = 0;            // >0 = идёт переход масштаба (bullet-time)
  let trailOwn = false;          // организм на своём штамме (+25% скорость)
  let trailEnemy = false;        // организм на чужом штамме (хвост тает вдвое)
  let winRun = false;            // финал: Фрактальный Парадокс

  // ---- Элиты (Этап 4.3) и статистика забега ----
  let eliteTimer = ELITE.everySec;
  let nextSpawnElite = false;
  let damageDealt = 0;
  let tailMaxReached = 0;
  let nodesHeldMax = 0;
  let scaleMaxReached = 1;
  let lastGenome: RunGenome | null = null;

  // ---- Аномалии чашки Петри, нейросеть узлов и Симбиотический Резонанс ----
  interface Anomaly extends AnomalyView {
    spawnCd: number;
  }
  const anomalies: Anomaly[] = [];
  let anomalyCd = 42;
  let bloomBuffT = 0;
  let neuralLinkActive = false;

  const RESONANCE_WINDOW = 3.0;
  let resonanceStreak = 0;
  let resonanceTimer = 0;
  let resonanceMult = 1.0;

  function getResonanceMult(streak: number): number {
    if (streak >= 35) return 3.0;
    if (streak >= 22) return 2.5;
    if (streak >= 14) return 2.0;
    if (streak >= 7) return 1.5;
    if (streak >= 3) return 1.2;
    return 1.0;
  }

  function updateResonanceHud(): void {
    if (!resHudEl) return;
    const active = resonanceTimer > 0 && resonanceStreak >= 2;
    resHudEl.classList.toggle('show', active);
    resHudEl.classList.toggle('tier-mid', resonanceMult >= 1.5 && resonanceMult < 2.5);
    resHudEl.classList.toggle('tier-high', resonanceMult >= 2.5);
    if (resMultEl) resMultEl.textContent = `x${resonanceMult.toFixed(1)}`;
    if (resStreakEl) resStreakEl.textContent = String(resonanceStreak);
    if (resBarFillEl) {
      const pct = Math.max(0, Math.min(100, (resonanceTimer / RESONANCE_WINDOW) * 100));
      resBarFillEl.style.width = `${pct}%`;
    }
  }

  // ---- Территория: био-узлы, захватываемые удержанием области ----
  const NODE_KINDS: NodeKind[] = ['gen', 'amp', 'magnet', 'mutagen', 'incubator', 'gen', 'amp'];
  const NODE_NAMES: Record<NodeKind, string> = {
    gen: 'ГЕНЕРАТОР', amp: 'УСИЛИТЕЛЬ', magnet: 'МАГНИТ', mutagen: 'МУТАГЕН', incubator: 'ИНКУБАТОР',
  };
  const NODE_POS_EFFECTS: Record<NodeKind, string> = {
    gen: '+1.5 HP/с', amp: '-40% таяния +12% урона', magnet: 'сбор x1.6', mutagen: '+1 карта, +15% XP', incubator: '+35% XP',
  };
  const NODE_NEG_EFFECTS: Record<NodeKind, string> = {
    gen: 'враги быстрее', amp: '-20% урона', magnet: 'кража сфер', mutagen: '-1 карта', incubator: 'выводок роя',
  };
  const bioNodes: BioNode[] = [];
  function spawnNodesForScale(sIdx: number): void {
    if (sIdx === 0) {
      bioNodes.length = 0;
      NODE_KINDS.forEach((kind, i) => {
        bioNodes.push({
          id: i,
          x: curWorldW * (0.18 + (i % 3) * 0.32) + (Math.random() - 0.5) * 60,
          y: curWorldH * (0.25 + Math.floor(i / 3) * 0.26) + (Math.random() - 0.5) * 50,
          radius: 68,
          owner: 0 as -1 | 0 | 1,
          capture: 0,
          kind,
          contested: false,
          raided: false,
          playerInside: false,
          enemyCount: 0,
          warnCooldown: 0,
        });
      });
    } else {
      const prevW = worldSize(sIdx - 1).w;
      const prevH = worldSize(sIdx - 1).h;
      const newKinds: NodeKind[] = ['mutagen', 'amp', 'gen', 'incubator'];
      newKinds.forEach((kind, idx) => {
        const id = bioNodes.length;
        const angle = (idx / newKinds.length) * Math.PI * 2 + Math.random() * 0.4;
        const radX = (prevW / 2) + (curWorldW - prevW) * (0.35 + Math.random() * 0.35);
        const radY = (prevH / 2) + (curWorldH - prevH) * (0.35 + Math.random() * 0.35);
        const nx = Math.max(50, Math.min(curWorldW - 50, curWorldW / 2 + Math.cos(angle) * radX));
        const ny = Math.max(50, Math.min(curWorldH - 50, curWorldH / 2 + Math.sin(angle) * radY));
        bioNodes.push({
          id,
          x: nx,
          y: ny,
          radius: 68,
          owner: 0 as -1 | 0 | 1,
          capture: 0,
          kind,
          contested: false,
          raided: false,
          playerInside: false,
          enemyCount: 0,
          warnCooldown: 0,
        });
      });
    }
  }
  spawnNodesForScale(0);

  /** Зонд плотности штамма у игрока: идёт последним узлом в readback симуляции */
  const strainProbe: BioNode = { id: 99, x: 0, y: 0, radius: 0, owner: 0, capture: 0, kind: 'gen' };
  const simNodes: BioNode[] = [];
  let nextPickDelta = 0;      // мутаген: +1 карта в следующем выборе, вражеский: -1
  let incubatorSpawnT = 20;   // вражеский инкубатор плодит личинок
  let nodeRegenBonus = 0;     // 🔋 генератор: +1.5 HP/сек
  let ampOwned = false;       // ⚡ усилитель: -40% таяния хвоста и +12% урона
  let weaponPenalty = 1;      // вражеский усилитель: оружие -20% урон
  let magnetNodeOwned = false;// 🧲 магнит: радиус сбора душ x1.6
  let orbToEnemies = false;   // вражеский магнит: души утекают к рою
  let xpMul = 1;              // 💜 инкубатор: +35% XP
  let mutagenXpMul = 1;       // 🧬 мутаген: +15% XP
  let incubatorEnemy = false; // вражеский инкубатор активен
  let nodeRaidScanT = 0;      // периодический скан башен для рейда монстров
  const nodeUnattendedT = new Map<number, number>();
  let callCd = 0;             // феромон-зов
  let callRequested = false;  // запрос от кнопки «ЗОВ» (мобильный джойстик)
  let frameBloom3 = 0;        // кадр для раз в 3 кадра bloom-копии

  // ---- Хвост как живое существо (Этап 1.1) ----
  let sinceSoul = 0;   // секунд без добычи душ
  let critFlashT = 0;  // анти-спам оранжевой вспышки по краям
  let tailState: 'ok' | 'low' | 'crit' = 'ok';
  let frameN = 0;
  let lastStatusKey = '';

  let codexBonuses = getCodexBonuses();
  const refreshCodexBonuses = () => { codexBonuses = getCodexBonuses(); };
  const enemyDmgBonus = (e: Enemy) => codexBonuses.enemyDmgMul[e.titan ? 'titan' : e.type] ?? 1;

  // Хвост особи — ресурс: растёт от сфер ДНК, тает от движения
  let tailLen: number = TAIL.startLen;
  const pathHistory: { x: number; y: number }[] = [];
  let tailTick = 0;
  const maxTail = () => Math.round((TAIL.baseMax + level * TAIL.maxPerLvl + tailCapBonus) * codexBonuses.tailCapMul);
  const tailDps = () => (TAIL.dpsBase + tailLen * TAIL.dpsPerSeg) * tailDpsMul * dailyTailDpsMul;
  // Компактный размер: организм не раздувается на весь экран, сохраняет ловкость и изящество
  const playerRadius = () => {
    const base = PLAYER.radius;
    const tailBonus = Math.sqrt(Math.max(0, tailLen)) * 0.35;
    const lvlBonus = Math.min(25, level) * 0.12;
    return Math.min(17, base + tailBonus + lvlBonus);
  };
  const moveCost = () => TAIL.moveCost * (0.8 + tailLen * 0.02); // большой хвост дороже тащить
  const visibleTail = () => pathHistory.slice(-Math.max(1, Math.floor(tailLen)));
  // Эффективный урон: множители бонусов, узлов и «Нестабильного генома»
  const effDmg = () =>
    dmgMul * weaponPenalty * (ampOwned ? 1.12 : 1) * dailyDmgMul * (genes.has('unstable') ? (unstableT > 0 ? 0.55 : 1.8) : 1);
  const effAtkSpd = () => atkSpdMul * (unstableT > 0 && unstableKind === 2 ? 0.6 : 1);
  /** Неуязвимость после урона: ген «Фазовый сдвиг» удваивает окно */
  const iframeNow = () => IFRAME * (genes.has('phantom') ? 2 : 1) + (curseChitin ? 1.5 : 0);

  let kills = 0;
  let level = 1;
  let xp = 0;
  let xpNext = xpRequiredForLevel(1);
  let pendingUps = 0;

  let started = false;
  let paused = false;
  let gameOver = false;
  let gameTime = 0;
  let spawnT = 1;
  let nextBossAt = BOSS_FIRST_AT;

  const mouse = { x: curWorldW / 2, y: curWorldH / 2, active: false };
  const keys = new Set<string>();

  pixiCanvas.addEventListener('mousemove', (e) => {
    const rect = pixiCanvas.getBoundingClientRect();
    const scrX = ((e.clientX - rect.left) / rect.width) * overlay.screenWidth;
    const scrY = ((e.clientY - rect.top) / rect.height) * overlay.screenHeight;
    const k = camZoom * overlay.scale;
    mouse.x = camX + (scrX - overlay.screenWidth / 2) / k;
    mouse.y = camY + (scrY - overlay.screenHeight / 2) / k;
    mouse.active = true;
  });
  pixiCanvas.addEventListener('mouseleave', () => (mouse.active = false));
  pixiCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (started && !gameOver && !paused) {
      dashRequested = true;
    }
  });
  window.addEventListener('keydown', (e) => {
    sfx.unlock();
    keys.add(e.key.toLowerCase());
    if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && started && !gameOver) {
      dashRequested = true;
    }
    // Клавиши 1-4: быстрый выбор карточки апгрейда
    if (upgradeModal.classList.contains('show') && ['1', '2', '3', '4'].includes(e.key)) {
      const idx = Number(e.key) - 1;
      const card = cardsEl.children[idx] as HTMLButtonElement | undefined;
      if (card) card.click();
      return;
    }
    // Escape: сначала закрыть активное подменю на один шаг назад, иначе пауза
    if (e.key === 'Escape') {
      const backTarget: ModalKind | null = !started || (paused && !gameOver) ? 'intro' : null;
      if (dailyModal?.classList.contains('show')) { showModal(backTarget); return; }
      if (achievementsModal?.classList.contains('show')) { showModal(backTarget); return; }
      if (codexModal?.classList.contains('show')) { showModal(backTarget); return; }
      if (biolabOverlay.classList.contains('show')) { showModal(backTarget); return; }
      if (settingsModal?.classList.contains('show')) { showModal(backTarget); return; }
      if (helpModal?.classList.contains('show')) {
        if (helpOpenedFromGame) {
          helpOpenedFromGame = false;
          paused = false;
          sfx.startBgm();
          showModal(null);
        } else {
          showModal('intro');
        }
        return;
      }
      if (started && !gameOver && !dying && pendingUps === 0) {
        paused = !paused;
        if (paused) {
          sfx.setTailDrone(false);
          sfx.stopBgm();
          showModal('intro');
        } else {
          sfx.startBgm();
          showModal(null);
        }
      }
    }
    // P: пауза / возобновление во время забега
    if (e.key.toLowerCase() === 'p' && started && !gameOver && !dying && pendingUps === 0) {
      paused = !paused;
      if (paused) {
        sfx.setTailDrone(false);
        sfx.stopBgm();
        showModal('intro');
      } else {
        sfx.startBgm();
        showModal(null);
      }
    }
    // M: быстрое включение/выключение звука
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'm') {
      toggleMuteAction();
      return;
    }
    // F: полноэкранный режим
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') {
      void toggleFullscreenAction();
      return;
    }
    // Пробел не должен скроллить страницу во время игры
    if (e.key === ' ' && started && !gameOver) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  // Аудио разблокируется первым жестом пользователя (клик или клавиша)
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: false });

  let toastTimer = 0;
  function showToast(msg: string, type: 'info' | 'success' | 'warn' | 'danger' = 'info'): void {
    toastEl.innerHTML = msg;
    toastEl.className = `show toast--${type}`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  function updateStageBiome(scId: number): void {
    if (scId === 1) {
      stage.style.background = '#03141c';
      stage.style.borderColor = 'rgba(102, 252, 241, 0.35)';
      stage.style.boxShadow = '0 0 60px rgba(102, 252, 241, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)';
    } else if (scId === 2) {
      stage.style.background = '#1c050b';
      stage.style.borderColor = 'rgba(255, 59, 92, 0.35)';
      stage.style.boxShadow = '0 0 60px rgba(255, 59, 92, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)';
    } else if (scId === 3) {
      stage.style.background = '#040f24';
      stage.style.borderColor = 'rgba(59, 130, 246, 0.35)';
      stage.style.boxShadow = '0 0 60px rgba(59, 130, 246, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)';
    } else if (scId === 4) {
      stage.style.background = '#1c0b03';
      stage.style.borderColor = 'rgba(249, 115, 22, 0.35)';
      stage.style.boxShadow = '0 0 60px rgba(249, 115, 22, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)';
    } else {
      stage.style.background = '#130424';
      stage.style.borderColor = 'rgba(168, 85, 247, 0.35)';
      stage.style.boxShadow = '0 0 60px rgba(168, 85, 247, 0.12), inset 0 0 80px rgba(0, 0, 0, 0.6)';
    }
  }

  interface SettingsData {
    screenFlashes: 'soft' | 'off';
    cameraShake: 'subtle' | 'off' | 'full';
    microParallax: boolean;
    bgmVolume: number; // 0..100
    sfxVolume: number; // 0..100
    muted: boolean;
    quality: 'low' | 'medium' | 'high';
  }

  function loadSettings(): SettingsData {
    try {
      const raw = localStorage.getItem('lumivore_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          screenFlashes: parsed.screenFlashes ?? 'soft',
          cameraShake: parsed.cameraShake ?? 'subtle',
          microParallax: parsed.microParallax ?? true,
          bgmVolume: parsed.bgmVolume ?? 60,
          sfxVolume: parsed.sfxVolume ?? 80,
          muted: parsed.muted === true,
          quality: parsed.quality ?? 'medium',
        };
      }
    } catch {}
    return {
      screenFlashes: 'soft',
      cameraShake: 'subtle',
      microParallax: true,
      bgmVolume: 60,
      sfxVolume: 80,
      muted: false,
      quality: 'medium',
    };
  }

  const gameSettings: SettingsData = loadSettings();
  if (gameSettings.muted) sfx.toggleMute();

  function saveSettings(): void {
    try {
      localStorage.setItem('lumivore_settings_v1', JSON.stringify(gameSettings));
    } catch {}
  }

  // --- Реликвии органелл (Wave 3.5) ---
  let relicGalvanic = false;
  let galvanicTimer = 0;
  let relicAbyssal = false;
  let abyssalLureTimer = 0;
  let relicCarapace = false;
  let carapaceShieldReady = false;
  let carapaceCooldown = 0;

  function hurtFlash(): void {
    if (gameSettings.screenFlashes !== 'off') {
      hurtEl.classList.add('hit');
      setTimeout(() => hurtEl.classList.remove('hit'), 120);
    }
    if (gameSettings.cameraShake !== 'off') {
      const dur = gameSettings.cameraShake === 'subtle' ? 0.08 : 0.16;
      overlay.beginShake(dur);
    }
    sfx.hurt();
  }

  /** Мягкое свечение по краям при критическом хвосте (без стробоскопа) */
  function tailwarnFlash(): void {
    if (gameSettings.screenFlashes !== 'off') {
      tailwarnEl.classList.add('active');
      setTimeout(() => tailwarnEl.classList.remove('active'), 400);
    }
  }

  const ENEMY_NAMES_RU: Record<EnemyType, string> = {
    grub: 'Личинка',
    runner: 'Бегун',
    brute: 'Громила',
    boss: 'Страж Цикла',
    splitter: 'Дробитель',
    spitter: 'Плеватель',
    healer: 'Целитель',
    pulsar: 'Пульсар',
    mirror: 'Зеркало',
    colony: 'Матка колонии',
    brood: 'Выводок роя',
  };
  const ENEMY_NAMES_EN: Record<EnemyType, string> = {
    grub: 'Grub',
    runner: 'Runner',
    brute: 'Brute',
    boss: 'Cycle Warden',
    splitter: 'Splitter',
    spitter: 'Spitter',
    healer: 'Healer',
    pulsar: 'Pulsar',
    mirror: 'Mirror',
    colony: 'Colony Hive',
    brood: 'Swarm Brood',
  };

  function enemyCauseLabel(
    type: EnemyType,
    titan?: boolean,
    elite?: EliteMutation | null,
    detailRu?: string,
    detailEn?: string,
  ): { kind: string; labelRu: string; labelEn: string } {
    const baseRu = titan ? 'Титан Масштаба' : ENEMY_NAMES_RU[type];
    const baseEn = titan ? 'Scale Titan' : ENEMY_NAMES_EN[type];
    const prefRu = elite && !titan ? `Элитный «${baseRu}»` : baseRu;
    const prefEn = elite && !titan ? `Elite ${baseEn}` : baseEn;
    return {
      kind: titan ? 'titan' : type,
      labelRu: detailRu ? `${prefRu} (${detailRu})` : prefRu,
      labelEn: detailEn ? `${prefEn} (${detailEn})` : prefEn,
    };
  }

  function applyDamageToPlayer(amount: number, cause?: { kind: string; labelRu: string; labelEn: string }): boolean {
    if (dying || gameOver) return false;
    if (relicCarapace && carapaceShieldReady) {
      carapaceShieldReady = false;
      carapaceCooldown = 18;
      player.iframe = iframeNow() + 0.3;
      overlay.spawnPulse(player.x, player.y, 0x00ff9d, 90);
      showToast(getLocale() === 'en' ? 'CARAPACE: HIT ABSORBED!' : 'КАРАПАКС: УДАР ПОГЛОЩЁН!');
      sfx.zap();
      return false;
    }
    const incomingDmg = isActive('perm_armor') ? amount * 0.90 : amount;
    lastDamageCause = cause
      ? { ...cause, amount: incomingDmg }
      : { kind: 'unknown', labelRu: 'Неизвестная угроза реактора', labelEn: 'Unknown reactor hazard', amount: incomingDmg };
    player.hp -= incomingDmg;
    player.iframe = iframeNow();
    hurtFlash();
    gamepad.vibrate(110, 0.55, 0.25);
    if (resonanceStreak >= 3) sfx.resDrop();
    resonanceStreak = 0;
    resonanceTimer = 0;
    resonanceMult = 1.0;
    updateResonanceHud();
    if (player.hp <= 0) {
      player.hp = 0;
      beginDeathSequence();
    }
    return true;
  }

  /** Пересчёт бонусов всех узлов по текущим владельцам (Этап 2.1) */
  function recomputeNodeBonuses(): void {
    nodeRegenBonus = 0;
    ampOwned = false;
    weaponPenalty = 1;
    magnetNodeOwned = false;
    orbToEnemies = false;
    xpMul = 1;
    mutagenXpMul = 1;
    incubatorEnemy = false;
    for (const n of bioNodes) {
      if (n.owner === 1) {
        if (n.kind === 'gen') nodeRegenBonus += 1.5;
        else if (n.kind === 'amp') ampOwned = true;
        else if (n.kind === 'magnet') magnetNodeOwned = true;
        else if (n.kind === 'mutagen') mutagenXpMul *= 1.15;
        else if (n.kind === 'incubator') xpMul *= 1.35;
      } else if (n.owner === -1) {
        underEnemy(n.kind);
      }
    }
  }

  function underEnemy(kind: NodeKind): void {
    if (kind === 'gen') { /* ближние враги ускоряются - применяется в цикле врагов */ }
    else if (kind === 'amp') weaponPenalty = 0.8;
    else if (kind === 'magnet') orbToEnemies = true;
    else if (kind === 'incubator') incubatorEnemy = true;
  }

  /** Смена владельца узла: тост, вспышка, мутаген-эффект (Этап 2.1) */
  function onNodeCaptured(n: BioNode): void {
    const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
    const en = getLocale() === 'en';
    const icoTone = n.owner === 1 ? 'bio-cyan' : n.owner === -1 ? 'bio-crimson' : 'bio-violet';
    const icoHtml = `<svg class="bio-icon ${icoTone}" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-${n.kind}"/></svg>`;
    if (n.owner === 1) {
      showToast(`${icoHtml} ${en ? 'TOWER CAPTURED' : 'БАШНЯ ЗАХВАЧЕНА'}: ${tn.name} (${tn.pos})`, 'success');
      if (n.kind === 'mutagen') nextPickDelta = 1;
    } else if (n.owner === -1) {
      showToast(`${icoHtml} ${en ? 'TOWER LOST' : 'БАШНЯ ПОТЕРЯНА'}: ${tn.name} (${tn.neg})`, 'danger');
      if (n.kind === 'mutagen') nextPickDelta = -1;
    } else {
      showToast(`${icoHtml} ${en ? 'TOWER NEUTRALIZED' : 'БАШНЯ НЕЙТРАЛЬНА'}: ${tn.name}`, 'info');
    }
    overlay.spawnPulse(n.x, n.y, n.owner === 1 ? 0x66fcf1 : n.owner === -1 ? 0xff3b4e : 0xc084fc, n.radius * 2.2);
    sfx.capture(n.owner === 1);
    if (n.owner === 1) sim.spawnPlayerSpores(toSimX(n.x), toSimY(n.y), 1500);
    recomputeNodeBonuses();
  }

  // ---------- Улучшения ----------
  interface UpgradeDef {
    id: string;
    title: string;
    desc: string;
    avail: () => boolean;
    apply: () => void;
    /** Геном ДНК-матрицы: карточка требует вложений душ в этот геном */
    branch?: DnaBranch;
    /** Великий Гибрид: золотая карта слияния двух геномов */
    hybrid?: HybridId;
    /** Проклятая мутация: колоссальная мощь с фатальной расплатой */
    curse?: boolean;
  }
  const stack = (id: string) => (statStacks[id] ?? 0) < STAT_MAX_STACKS;
  const bump = (id: string) => (statStacks[id] = (statStacks[id] ?? 0) + 1);
  /** Эксклюзивный ген генома открыт: 3 ДНК-уровня ветки */
  const geneAvail = (branch: DnaBranch, gene: string): boolean =>
    dnaLvl(branch) >= 3 && !genes.has(gene);
  /** Гибрид доступен: оба родительских генома на 3 ДНК-уровне, ещё не взят */
  const hybridAvail = (id: HybridId): boolean => {
    const def = HYBRIDS.find((h) => h.id === id);
    if (!def) return false;
    return dnaLvl(def.a) >= 3 && dnaLvl(def.b) >= 3 && !hybridsTaken.has(id);
  };
  /** Взятие гибрида: флавор-бонус + механика включается через hybridsTaken */
  function applyHybrid(id: HybridId): void {
    hybridsTaken.add(id);
    if (unlockCodexEntry(id)) refreshCodexBonuses();
    sfx.hybrid();
    const def = HYBRIDS.find((h) => h.id === id)!;
    const trH = trHybrid(id, def.name, def.desc);
    const hybridSlug = id.replace(/_/g, '-');
    showToast(
      `<svg class="bio-icon bio-amber" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg> ` +
      `${getLocale() === 'en' ? 'HYBRIDIZATION' : 'ГИБРИДИЗАЦИЯ'}: ${trH.name}`,
      'warn'
    );
    overlay.spawnPulse(player.x, player.y, 0xffd166, 160);
    if (id === 'plasma_leviathan') dmgMul += 0.25;
    if (id === 'ouroboros') tailCapBonus += 8;
    if (id === 'phase_serpent') moveSpeed *= 1.12;
    if (id === 'spore_reactor') { if (wlvl.aura > 0) wlvl.aura = Math.min(WEAPON_MAX_LVL, wlvl.aura + 1); else dmgMul += 0.15; }
    if (id === 'ion_colossus') { if (wlvl.orbs > 0) wlvl.orbs = Math.min(WEAPON_MAX_LVL, wlvl.orbs + 1); else wlvl.orbs = 1; }
    if (id === 'psi_web') magnetR *= 1.3;
    refreshMainGenome();
  }

  const UPGRADES: UpgradeDef[] = [
    { id: 'spikes0', title: 'Шипы', desc: 'Автоматические иглы: поражают ближайших врагов', avail: () => canUnlockWeapon('spikes', wlvl, level), apply: () => (wlvl.spikes = 1) },
    { id: 'spikes+', title: 'Шипы', desc: 'Больше урона, шипов и выше скорострельность', avail: () => canUpgradeWeapon('spikes', wlvl.spikes, level), apply: () => wlvl.spikes++ },
    { id: 'orbits0', title: 'Электроорбиты', desc: 'Сферы вращаются вокруг вас и жгут врагов рядом', avail: () => canUnlockWeapon('orbs', wlvl, level), apply: () => (wlvl.orbs = 1) },
    { id: 'orbits+', title: 'Электроорбиты', desc: '+1 сфера и повышение урона', avail: () => canUpgradeWeapon('orbs', wlvl.orbs, level), apply: () => wlvl.orbs++ },
    { id: 'nova0', title: 'Нова-импульс', desc: 'Взрывное кольцо: урон и отброс толпы', avail: () => canUnlockWeapon('nova', wlvl, level), apply: () => (wlvl.nova = 1) },
    { id: 'nova+', title: 'Нова-импульс', desc: 'Больше радиус и урон, быстрее перезарядка', avail: () => canUpgradeWeapon('nova', wlvl.nova, level), apply: () => wlvl.nova++ },
    { id: 'aura0', title: 'Токсичная аура', desc: 'Едкое поле отравляет всех врагов вокруг', avail: () => canUnlockWeapon('aura', wlvl, level), apply: () => (wlvl.aura = 1) },
    { id: 'aura+', title: 'Токсичная аура', desc: 'Больше радиус и урон в секунду', avail: () => canUpgradeWeapon('aura', wlvl.aura, level), apply: () => wlvl.aura++ },
    { id: 'mandibles0', title: 'Хищные жвала', desc: 'Фронтальный конус урона: разрывает врагов перед вами', avail: () => canUnlockWeapon('mandibles', wlvl, level), apply: () => (wlvl.mandibles = 1) },
    { id: 'mandibles+', title: 'Хищные жвала', desc: 'Больше радиус, угол рассечения и урон', avail: () => canUpgradeWeapon('mandibles', wlvl.mandibles, level), apply: () => wlvl.mandibles++ },
    { id: 'cysts0', title: 'Споровые цисты', desc: 'Органические мины: сбрасываются только в движении', avail: () => canUnlockWeapon('cysts', wlvl, level), apply: () => (wlvl.cysts = 1) },
    { id: 'cysts+', title: 'Споровые цисты', desc: 'Больше цист, выше радиус и урон детонации', avail: () => canUpgradeWeapon('cysts', wlvl.cysts, level), apply: () => wlvl.cysts++ },
    // --- Критические мутации (патологии): сверхсила с расплатой ---
    {
      id: 'curse_predator',
      title: 'СВЕРХХИЩНИК',
      desc: 'Урон x2.2 и лечение +4 HP за элит и боссов, но хвост тает в 3 раза быстрее',
      curse: true,
      avail: () => !cursePredator,
      apply: () => { cursePredator = true; dmgMul *= 2.2; showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-predator"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_predator', 'СВЕРХХИЩНИК', '').title}`); },
    },
    {
      id: 'curse_chitin',
      title: 'ТИТАНОВЫЙ ХИТИН',
      desc: 'Макс. HP +120 и неуязвимость +1.5 с, но скорость движения снижена на 30%',
      curse: true,
      avail: () => !curseChitin,
      apply: () => { curseChitin = true; maxHp += 120; player.hp += 120; moveSpeed *= 0.70; showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-chitin"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_chitin', 'ТИТАНОВЫЙ ХИТИН', '').title}`); },
    },
    {
      id: 'curse_hunger',
      title: 'ВЕЧНЫЙ ГОЛОД',
      desc: 'Радиус сбора x2 и скорость атаки +40%, но при голоде (>3 с без сфер) теряет 3 HP/с (не смертельно)',
      curse: true,
      avail: () => !curseHunger,
      apply: () => { curseHunger = true; magnetR *= 2; atkSpdMul += 0.40; showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-hunger"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_hunger', 'ВЕЧНЫЙ ГОЛОД', '').title}`); },
    },
    // --- Прото-органеллы ---
    {
      id: 'relic_galvanic',
      title: 'БИО-ГАЛЬВАНИКА',
      desc: 'Организм накапливает статику: цепная микро-молния поражает 3 врагов каждые 4 с',
      avail: () => !relicGalvanic,
      apply: () => { relicGalvanic = true; showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-relic-galvanic"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_galvanic', 'БИО-ГАЛЬВАНИКА', '').title}`); },
    },
    {
      id: 'relic_abyssal',
      title: 'АБИССАЛЬНЫЙ ЛЮМИНОФОР',
      desc: 'Радиус сбора сфер +50%, а био-фонарь каждые 6 с ослепляет врагов вокруг вас',
      avail: () => !relicAbyssal,
      apply: () => { relicAbyssal = true; magnetR *= 1.5; showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-relic-abyssal"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_abyssal', 'АБИССАЛЬНЫЙ ЛЮМИНОФОР', '').title}`); },
    },
    {
      id: 'relic_carapace',
      title: 'ЖИВОЙ КАРАПАКС',
      desc: 'Каждые 18 с формирует живой барьер, полностью поглощающий следующий удар',
      avail: () => !relicCarapace,
      apply: () => { relicCarapace = true; carapaceShieldReady = true; showToast(`<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-relic-carapace"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_carapace', 'ЖИВОЙ КАРАПАКС', '').title}`); },
    },
    { id: 'dmg', title: 'Острота', desc: '+15% ко всему урону', avail: () => stack('dmg'), apply: () => { dmgMul += 0.15; bump('dmg'); } },
    { id: 'aspd', title: 'Рефлексы', desc: '+12% к скорости атаки', avail: () => stack('aspd'), apply: () => { atkSpdMul += 0.12; bump('aspd'); } },
    { id: 'move', title: 'Обтекаемость', desc: '+8% к скорости движения', avail: () => stack('move'), apply: () => { moveSpeed *= 1.08; bump('move'); } },
    { id: 'hp', title: 'Биомасса', desc: '+20 к макс. HP и лечение', avail: () => stack('hp'), apply: () => { maxHp += 20; player.hp += 20; bump('hp'); } },
    { id: 'magnet', title: 'Магнетизм', desc: '+30% к радиусу сбора сфер ДНК', avail: () => stack('magnet'), apply: () => { magnetR *= 1.3; bump('magnet'); } },
    { id: 'regen', title: 'Регенерация', desc: '+1 HP/с восстановления', avail: () => stack('regen'), apply: () => { regen += 1; bump('regen'); } },
    // --- Геномы ДНК-матрицы: специализация через вложенные сферы ДНК ---
    { id: 'ver_cap', branch: 'vermis', title: 'Хвост длиннее', desc: '+6 к ёмкости хвоста: тело-оружие растёт', avail: () => tailCapBonus < 30, apply: () => { tailCapBonus += 6; } },
    { id: 'ver_dps', branch: 'vermis', title: 'Мощь хлыста', desc: 'Урон хвоста x1.3', avail: () => tailDpsMul < 3.2, apply: () => { tailDpsMul *= 1.3; } },
    { id: 'chi_dmg', branch: 'chimera', title: 'Мутация урона', desc: '+25% ко всему урону', avail: () => stack('chi_dmg'), apply: () => { dmgMul += 0.25; bump('chi_dmg'); } },
    {
      id: 'chi_lvl',
      branch: 'chimera',
      title: 'Радикал',
      desc: 'Случайное оружие +1 уровень',
      avail: () => (['spikes', 'orbs', 'nova', 'aura', 'mandibles', 'cysts'] as WeaponId[]).some((w) => canUpgradeWeapon(w, wlvl[w], level)),
      apply: () => {
        const ids = (['spikes', 'orbs', 'nova', 'aura', 'mandibles', 'cysts'] as WeaponId[]).filter((w) => canUpgradeWeapon(w, wlvl[w], level));
        if (ids.length > 0) wlvl[ids[Math.floor(Math.random() * ids.length)]]++;
      },
    },
    { id: 'my_regen', branch: 'mycelium', title: 'Симбиоз', desc: '+1.5 HP/с восстановления', avail: () => stack('my_regen'), apply: () => { regen += 1.5; bump('my_regen'); } },
    { id: 'my_aura', branch: 'mycelium', title: 'Спороносность', desc: 'Токсичная аура +1 уровень', avail: () => canUpgradeWeapon('aura', wlvl.aura, level), apply: () => { wlvl.aura++; } },
    { id: 'si_magnet', branch: 'symbiont', title: 'Феромонный магнит', desc: '+35% к радиусу сбора сфер ДНК', avail: () => stack('si_magnet'), apply: () => { magnetR *= 1.35; bump('si_magnet'); } },
    { id: 'si_aspd', branch: 'symbiont', title: 'Фазовые рефлексы', desc: '+15% к скорости атаки', avail: () => stack('si_aspd'), apply: () => { atkSpdMul += 0.15; bump('si_aspd'); } },
    { id: 'si_move', branch: 'symbiont', title: 'Фазовое скольжение', desc: '+10% к скорости движения', avail: () => stack('si_move'), apply: () => { moveSpeed *= 1.10; bump('si_move'); } },
    // --- Эксклюзивные гены геномов: 3-й уровень ДНК ветки ---
    { id: 'absorb', branch: 'vermis', title: 'Поглощение', desc: 'Убитые хвостом враги удлиняют его', avail: () => geneAvail('vermis', 'absorb'), apply: () => genes.add('absorb') },
    { id: 'whip2', branch: 'vermis', title: 'Змея-хлыст', desc: 'Кончик хвоста наносит дополнительный точечный удар', avail: () => geneAvail('vermis', 'whip2'), apply: () => genes.add('whip2') },
    { id: 'scales', branch: 'vermis', title: 'Броня чешуёй', desc: 'Каждые 20 сегментов гасят 1 контактного урона (до 50%)', avail: () => geneAvail('vermis', 'scales'), apply: () => genes.add('scales') },
    { id: 'unstable', branch: 'chimera', title: 'Нестабильный геном', desc: 'Урон x1.8, но каждые 20 с случайное ослабление на 5 с', avail: () => geneAvail('chimera', 'unstable'), apply: () => genes.add('unstable') },
    { id: 'supercharge', branch: 'chimera', title: 'Суперзаряд', desc: 'Нова: перезарядка дольше, но урон x4 и радиус x2', avail: () => geneAvail('chimera', 'supercharge'), apply: () => genes.add('supercharge') },
    { id: 'chain', branch: 'chimera', title: 'Цепная реакция', desc: 'Снаряд отскакивает к ближайшему врагу (до 4 раз)', avail: () => geneAvail('chimera', 'chain'), apply: () => genes.add('chain') },
    { id: 'infection', branch: 'mycelium', title: 'Инфицирование', desc: 'Обычные враги при гибели с шансом 35% переходят на вашу сторону на 8 с', avail: () => geneAvail('mycelium', 'infection'), apply: () => genes.add('infection') },
    { id: 'puddles', branch: 'mycelium', title: 'Споры', desc: 'Хвост оставляет ядовитые следы-лужи', avail: () => geneAvail('mycelium', 'puddles'), apply: () => genes.add('puddles') },
    { id: 'charm', branch: 'mycelium', title: 'Феромон-раб', desc: 'Обычные враги при гибели с шансом 25% служат вам 30 с', avail: () => geneAvail('mycelium', 'charm'), apply: () => genes.add('charm') },
    { id: 'phantom', branch: 'symbiont', title: 'Фазовый сдвиг', desc: 'Неуязвимость после урона длится вдвое дольше', avail: () => geneAvail('symbiont', 'phantom'), apply: () => genes.add('phantom') },
    { id: 'overload', branch: 'symbiont', title: 'Перегрузка', desc: 'Перезарядка Новы -25%', avail: () => geneAvail('symbiont', 'overload'), apply: () => genes.add('overload') },
    { id: 'resonance', branch: 'symbiont', title: 'Гармоника орбит', desc: 'Электроорбиты: +25% к радиусу и +20% к урону', avail: () => geneAvail('symbiont', 'resonance'), apply: () => genes.add('resonance') },
    // --- 6 Великих Гибридов: золотые карты слияния двух геномов на 3+3 ---
    { id: 'hy_plasma_leviathan', hybrid: 'plasma_leviathan', title: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', desc: HYBRIDS.find((h) => h.id === 'plasma_leviathan')!.desc, avail: () => hybridAvail('plasma_leviathan'), apply: () => applyHybrid('plasma_leviathan') },
    { id: 'hy_ouroboros', hybrid: 'ouroboros', title: 'УРОБОРОС-ПАРАЗИТ', desc: HYBRIDS.find((h) => h.id === 'ouroboros')!.desc, avail: () => hybridAvail('ouroboros'), apply: () => applyHybrid('ouroboros') },
    { id: 'hy_phase_serpent', hybrid: 'phase_serpent', title: 'ФАЗОВЫЙ ЗМЕЙ', desc: HYBRIDS.find((h) => h.id === 'phase_serpent')!.desc, avail: () => hybridAvail('phase_serpent'), apply: () => applyHybrid('phase_serpent') },
    { id: 'hy_spore_reactor', hybrid: 'spore_reactor', title: 'СПОРОВЫЙ РЕАКТОР', desc: HYBRIDS.find((h) => h.id === 'spore_reactor')!.desc, avail: () => hybridAvail('spore_reactor'), apply: () => applyHybrid('spore_reactor') },
    { id: 'hy_ion_colossus', hybrid: 'ion_colossus', title: 'ИОННЫЙ КОЛОСС', desc: HYBRIDS.find((h) => h.id === 'ion_colossus')!.desc, avail: () => hybridAvail('ion_colossus'), apply: () => applyHybrid('ion_colossus') },
    { id: 'hy_psi_web', hybrid: 'psi_web', title: 'ПСИ-СЕТЬ', desc: HYBRIDS.find((h) => h.id === 'psi_web')!.desc, avail: () => hybridAvail('psi_web'), apply: () => applyHybrid('psi_web') },
  ];

  type GenomeId = DnaBranchOrNeutral | HybridId;
  let mainGenome: GenomeId = 'neutral';

  /** Основной геном: активный гибрид сильнее, иначе лидер по ДНК-уровням */
  function refreshMainGenome(): void {
    const lastHybrid = [...hybridsTaken].pop();
    if (lastHybrid) { mainGenome = lastHybrid; return; }
    let best: GenomeId = 'neutral';
    let bestLvl = 0;
    for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
      const lvl = dnaLvl(b);
      if (lvl > bestLvl) { bestLvl = lvl; best = b; }
    }
    mainGenome = best;
  }

  const STACKABLE_STATS = new Set(['dmg', 'aspd', 'move', 'hp', 'magnet', 'regen', 'chi_dmg', 'my_regen', 'si_magnet', 'si_aspd', 'si_move']);

  function weaponLvlTag(id: string): string {
    const open = t('badge_weapon_new', { cur: equippedWeaponCount(wlvl), max: MAX_EQUIPPED_WEAPONS });
    const fmt = (lvl: number) => ` · ${t('badge_weapon_lvl', { from: lvl, to: lvl + 1 })}`;
    if (id === 'spikes0') return ` · ${open}`;
    if (id === 'spikes+') return fmt(wlvl.spikes);
    if (id === 'orbits0') return ` · ${open}`;
    if (id === 'orbits+') return fmt(wlvl.orbs);
    if (id === 'nova0') return ` · ${open}`;
    if (id === 'nova+') return fmt(wlvl.nova);
    if (id === 'aura0') return ` · ${open}`;
    if (id === 'aura+') return fmt(wlvl.aura);
    if (id === 'mandibles0') return ` · ${open}`;
    if (id === 'mandibles+') return fmt(wlvl.mandibles);
    if (id === 'cysts0') return ` · ${open}`;
    if (id === 'cysts+') return fmt(wlvl.cysts);
    if (STACKABLE_STATS.has(id)) return ` · ${(statStacks[id] ?? 0)}/${STAT_MAX_STACKS}`;
    return '';
  }

  function resolveCardDesc(u: UpgradeDef): string {
    if (u.id === 'spikes+' && wlvl.spikes === 2) {
      return getLocale() === 'en' ? 'Higher damage and faster fire rate' : 'Больше урона и выше скорострельность';
    }
    return trUpgrade(u.id, u.title, u.desc).desc;
  }

  let rerollsLeft = 2;
  let emptyRingsCount = 0;
  let overdriveTier = 0;
  let dmgTail = 0;
  let dmgRing = 0;
  let spikesFired = 0;
  let pacifistShown = false;
  let scale5NoNodeTime = 0;
  let watcherSpawned = false;
  let titanTrailTime = 0;
  let titanSatedDone = false;

  function syncRerollBtn(): void {
    if (!rerollBtn) return;
    rerollBtn.textContent = `${t('reroll_btn')} (${rerollsLeft})`;
    rerollBtn.disabled = rerollsLeft <= 0;
  }

  const UPGRADE_CARD_ICONS: Record<string, { id: string; vb: string }> = {
    spikes0: { id: 'ico-weapon-spikes', vb: '0 0 32 32' },
    'spikes+': { id: 'ico-weapon-spikes', vb: '0 0 32 32' },
    orbits0: { id: 'ico-weapon-orbs', vb: '0 0 32 32' },
    'orbits+': { id: 'ico-weapon-orbs', vb: '0 0 32 32' },
    nova0: { id: 'ico-weapon-nova', vb: '0 0 32 32' },
    'nova+': { id: 'ico-weapon-nova', vb: '0 0 32 32' },
    aura0: { id: 'ico-weapon-aura', vb: '0 0 32 32' },
    'aura+': { id: 'ico-weapon-aura', vb: '0 0 32 32' },
    mandibles0: { id: 'ico-weapon-mandibles', vb: '0 0 64 64' },
    'mandibles+': { id: 'ico-weapon-mandibles', vb: '0 0 64 64' },
    cysts0: { id: 'ico-weapon-cysts', vb: '0 0 64 64' },
    'cysts+': { id: 'ico-weapon-cysts', vb: '0 0 64 64' },
    curse_predator: { id: 'ico-curse-predator', vb: '0 0 64 64' },
    curse_chitin: { id: 'ico-curse-chitin', vb: '0 0 64 64' },
    curse_hunger: { id: 'ico-curse-hunger', vb: '0 0 64 64' },
    relic_galvanic: { id: 'ico-relic-galvanic', vb: '0 0 64 64' },
    relic_abyssal: { id: 'ico-relic-abyssal', vb: '0 0 64 64' },
    relic_carapace: { id: 'ico-relic-carapace', vb: '0 0 32 32' },
    dmg: { id: 'ico-stat-dmg', vb: '0 0 64 64' },
    aspd: { id: 'ico-stat-aspd', vb: '0 0 64 64' },
    move: { id: 'ico-stat-move', vb: '0 0 64 64' },
    hp: { id: 'ico-stat-hp', vb: '0 0 64 64' },
    magnet: { id: 'ico-stat-magnet', vb: '0 0 64 64' },
    regen: { id: 'ico-stat-regen', vb: '0 0 64 64' },
    absorb: { id: 'ico-gene-predator-devour', vb: '0 0 64 64' },
    whip2: { id: 'ico-gene-predator-apex', vb: '0 0 64 64' },
    scales: { id: 'ico-gene-predator-frenzy', vb: '0 0 64 64' },
    unstable: { id: 'ico-gene-chimera-horn', vb: '0 0 64 64' },
    supercharge: { id: 'ico-gene-chimera-carapace', vb: '0 0 64 64' },
    chain: { id: 'ico-gene-chimera-spines', vb: '0 0 64 64' },
    infection: { id: 'ico-gene-mycelium-hyphae', vb: '0 0 64 64' },
    puddles: { id: 'ico-gene-mycelium-toxin', vb: '0 0 64 64' },
    charm: { id: 'ico-gene-mycelium-spores', vb: '0 0 64 64' },
    phantom: { id: 'ico-gene-symbiont-wings', vb: '0 0 64 64' },
    overload: { id: 'ico-gene-symbiont-swarm', vb: '0 0 64 64' },
    resonance: { id: 'ico-gene-symbiont-prism', vb: '0 0 64 64' },
  };

  function openUpgrades(): void {
    const avail = UPGRADES.filter((u) => u.avail());
    // Все улучшения выкачаны: пустое окно замкнуло бы игру в вечную паузу
    if (avail.length === 0) {
      pendingUps = 0;
      paused = false;
      upgradeModal.classList.remove('show');
      return;
    }
    const picks: UpgradeDef[] = [];
    const bag = [...avail];
    // Мутаген: +1 опция в следующем выборе (вражеский мутаген: всего 2)
    const want = Math.max(2, Math.min(4, 3 + nextPickDelta));
    nextPickDelta = 0;
    while (picks.length < want && bag.length > 0) {
      picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    }
    upgradeTitle.textContent = `${t('upgrade_title', { lvl: level })} · ${t('weapon_limit_hint', { cur: equippedWeaponCount(wlvl), max: MAX_EQUIPPED_WEAPONS })}`;
    cardsEl.innerHTML = '';
    for (let cardIdx = 0; cardIdx < picks.length; cardIdx++) {
      const u = picks[cardIdx];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'up-card';
      card.dataset.id = u.id;
      const upIco = UPGRADE_CARD_ICONS[u.id];
      let crestHtml = '';
      if (u.branch) card.classList.add(`branch-${u.branch}`);
      if (u.curse) {
        card.classList.add('curse');
        const curseIco = upIco ?? { id: 'ico-skull-hazard', vb: '0 0 32 32' };
        crestHtml = `<div class="card-crest curse-crest"><svg class="inline-card-ico" viewBox="${curseIco.vb}" aria-hidden="true"><use href="#${curseIco.id}"/></svg> ${t('badge_pathology')}</div>`;
      }
      if (u.hybrid) card.classList.add('hybrid');
      let branchTag = '';
      if (u.hybrid) {
        const hybridColors: Record<string, string> = {
          plasma_leviathan: '#ff6b2b',
          ouroboros: '#00ff9d',
          phase_serpent: '#66fcf1',
          spore_reactor: '#39ff14',
          ion_colossus: '#ffb800',
          psi_web: '#b55cff',
        };
        const hybridSlug = u.hybrid.replace(/_/g, '-');
        const color = hybridColors[u.hybrid] || '#ffd166';
        branchTag = `<span class="b-ico"><svg class="inline-card-ico" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg></span> `;
        crestHtml = `<div style="text-align:center;margin:4px 0;"><svg class="hybrid-crest" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg></div>`;
      } else if (upIco && !u.curse) {
        branchTag = `<span class="b-ico"><svg class="up-card-ico" viewBox="${upIco.vb}" aria-hidden="true"><use href="#${upIco.id}"/></svg></span>`;
      } else if (u.branch) {
        branchTag = `<span class="b-ico"><svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${u.branch}"/></svg></span> `;
      }
      const trUp = trUpgrade(u.id, u.title, u.desc);
      const cleanTitle = trUp.title.replace(/^[^\w\sа-яА-ЯёЁ]+/, '').trim();
      card.innerHTML = `
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <h3><span class="key-hint" style="opacity:0.68;font-size:10px;margin-right:4px;">[${cardIdx + 1}]</span>${branchTag}${cleanTitle}${weaponLvlTag(u.id)}</h3>${crestHtml}<p>${resolveCardDesc(u)}</p>
      `;
      cardsEl.appendChild(card);
    }
    paused = true;
    syncStagePhase();
    sfx.setTailDrone(false);
    syncRerollBtn();
    upgradeModal.classList.add('show');
    (cardsEl.firstElementChild as HTMLElement | null)?.focus();
  }

  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      if (rerollsLeft <= 0 || !upgradeModal.classList.contains('show')) return;
      rerollsLeft--;
      sfx.upgradeSelect();
      openUpgrades();
    });
  }

  cardsEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.up-card') as HTMLElement | null;
    if (!card) return;
    const u = UPGRADES.find((x) => x.id === card.dataset.id);
    if (!u) return;
    u.apply();
    sfx.upgradeSelect();
    // Разовый выброс спор в честь эволюции / выбора мутации
    sim.spawnPlayerSpores(toSimX(player.x), toSimY(player.y), 2200);
    // Гибрид меняет представление генома в HUD сразу после выбора
    if (u.branch || u.hybrid) {
      refreshMainGenome();
      updateBranchChip();
    }
    pendingUps--;
    if (pendingUps > 0 && UPGRADES.some((x) => x.avail())) {
      openUpgrades();
    } else {
      paused = false;
      syncStagePhase();
      upgradeModal.classList.remove('show');
    }
  });

  // ---------- HUD: геном организма, ДНК-панель и кулдауны оружий ----------
  function updateBranchChip(): void {
    const hy = HYBRIDS.find((h) => h.id === mainGenome);
    if (hy) {
      const trH = trHybrid(hy.id, hy.name, hy.desc);
      const hybridSlug = hy.id.replace(/_/g, '-');
      branchChipEl.innerHTML = `<svg class="chip-ico" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg> ${trH.name}`;
      branchChipEl.dataset.branch = 'hybrid';
      return;
    }
    const b = mainGenome as DnaBranchOrNeutral;
    branchChipEl.innerHTML = b === 'neutral'
      ? t('hud_specimen')
      : `<svg class="chip-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${b}"/></svg> ${trDnaName(b, DNA_NAMES[b])}`;
    branchChipEl.dataset.branch = b;
  }

  /** ДНК-панель: прогресс каждого генома к следующему уровню */
  function updateDnaHud(): void {
    for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
      const row = document.getElementById(`dna-${b}`);
      if (!row) continue;
      const fill = row.querySelector('.dna-fill') as HTMLElement;
      const lvlEl = row.querySelector('.dna-lvl') as HTMLElement;
      const lvl = dnaLvl(b);
      const th = DNA_LEVELS;
      const cur = dnaXp[b];
      const prev = lvl === 0 ? 0 : th[lvl - 1];
      const next = lvl >= 3 ? th[2] : th[lvl];
      const frac = lvl >= 3 ? 1 : Math.max(0, Math.min(1, (cur - prev) / Math.max(1, next - prev)));
      fill.style.width = `${(frac * 100).toFixed(1)}%`;
      lvlEl.textContent = lvl >= 3 ? '3+★' : String(lvl);
      row.dataset.max = lvl >= 3 ? '1' : '0';
    }
  }

  /** Шкала бытия: имя масштаба и заполнение биомассы до Титана */
  function updateScaleHud(): void {
    const sc = SCALES[scaleIdx];
    const trS = trScale(sc.id, sc.name, sc.sub);
    scaleChipEl.textContent = `${t('hud_scale')} ${sc.id} — ${trS.name}`;
    scaleChipEl.title = trS.sub;
    const goal = sc.biomassGoal;
    const frac = Math.min(1, biomass / goal);
    bioFillEl.style.width = `${(frac * 100).toFixed(1)}%`;
    bioFillEl.classList.toggle('titan-ready', frac >= 1);
  }

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

  function updateWeaponHud(): void {
    const slotsFull = equippedWeaponCount(wlvl) >= MAX_EQUIPPED_WEAPONS;
    const lockedLabel = (id: WeaponId): string | undefined => {
      if (wlvl[id] > 0) return undefined;
      if (slotsFull) return t('wh_slot_cap');
      const req = WEAPON_UNLOCK_LEVEL[id];
      return req > 1 ? t('wh_unlock_lvl', { lvl: req }) : t('wh_locked');
    };
    const spIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.spikes - 1));
    const spMax = SPIKES.cd[spIdx] / effAtkSpd();
    setSlot(wSlots.spikes, wlvl.spikes > 0 ? 1 - Math.max(0, spikesCd) / spMax : 0, wlvl.spikes, lockedLabel('spikes'), t('w_name_spikes'));
    setSlot(wSlots.orbs, 1, wlvl.orbs, lockedLabel('orbs'), t('w_name_orbs'));
    const nvIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.nova - 1));
    const nvMax = (NOVA.cd[nvIdx] * biolabNovaCdMul * (genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd();
    setSlot(wSlots.nova, wlvl.nova > 0 ? 1 - Math.max(0, novaCd) / nvMax : 0, wlvl.nova, lockedLabel('nova'), t('w_name_nova'));
    setSlot(wSlots.aura, 1, wlvl.aura, lockedLabel('aura'), t('w_name_aura'));

    const mandIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.mandibles - 1));
    const mandMax = MANDIBLES.cd[mandIdx] / effAtkSpd();
    setSlot(wSlots.mandibles, wlvl.mandibles > 0 ? 1 - Math.max(0, mandiblesCd) / mandMax : 0, wlvl.mandibles, lockedLabel('mandibles'), t('w_name_mandibles'));

    const cystIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.cysts - 1));
    const cystMax = CYSTS.cd[cystIdx] / effAtkSpd();
    setSlot(wSlots.cysts, wlvl.cysts > 0 ? 1 - Math.max(0, cystsCd) / cystMax : 0, wlvl.cysts, lockedLabel('cysts'), t('w_name_cysts'));

    const dashReady = dashCd <= 0;
    const dashMaxCd = Math.max(0.8, DASH.cd + dailyDashCdDelta);
    setSlot(
      wSlots.dash,
      1 - Math.max(0, dashCd) / dashMaxCd,
      1,
      dashReady ? t('wh_dash_key') : `${dashCd.toFixed(1)}s`,
      t('w_name_dash')
    );
    const callReady = callCd <= 0;
    setSlot(
      wSlots.call,
      1 - Math.max(0, callCd) / CALL.cd,
      1,
      callReady ? t('wh_call_key') : `${Math.ceil(callCd)}s`,
      t('w_name_call')
    );
    const ringReady = ringCd <= 0;
    setSlot(
      wSlots.ring,
      1 - Math.max(0, ringCd) / RING.cooldown,
      pathHistory.length >= 24 ? 1 : 0,
      ringReady ? t('wh_ring_key') : `${ringCd.toFixed(1)}s`,
      t('w_name_ring')
    );
  }

  // ---------- Навигация по модальным окнам (Главное Меню, Биолаб, Испытание, Достижения, Кодекс, Справка, Настройки) ----------
  type ModalKind = 'intro' | 'biolab' | 'daily' | 'achievements' | 'codex' | 'help' | 'settings';
  let lastModalFocus: HTMLElement | null = null;
  let lastActiveModal: ModalKind | null = null;
  const MODAL_ELEMENTS: Record<ModalKind, HTMLElement | null> = {
    intro,
    biolab: biolabOverlay,
    daily: dailyModal,
    achievements: achievementsModal,
    codex: codexModal,
    help: helpModal,
    settings: settingsModal,
  };

  function syncStagePhase(): void {
    const anyModal =
      intro.classList.contains('show') ||
      biolabOverlay.classList.contains('show') ||
      Boolean(dailyModal?.classList.contains('show')) ||
      Boolean(achievementsModal?.classList.contains('show')) ||
      Boolean(codexModal?.classList.contains('show')) ||
      Boolean(helpModal?.classList.contains('show')) ||
      Boolean(settingsModal?.classList.contains('show')) ||
      upgradeModal.classList.contains('show');
    if (!started) {
      stage.dataset.phase = 'menu';
    } else if (gameOver) {
      stage.dataset.phase = 'gameover';
    } else if (paused || anyModal) {
      stage.dataset.phase = 'paused';
    } else {
      stage.dataset.phase = 'playing';
    }
    syncPauseButton();
  }

  function showModal(which: ModalKind | null): void {
    if (which !== null && lastActiveModal === null) {
      const active = document.activeElement as HTMLElement | null;
      if (active && !active.closest('#intro, #biolab, #daily-modal, #achievements-modal, #codex, #help-modal, #settings-modal, #upgrade')) {
        lastModalFocus = active;
      }
    }
    intro.classList.toggle('show', which === 'intro');
    biolabOverlay.classList.toggle('show', which === 'biolab');
    if (dailyModal) dailyModal.classList.toggle('show', which === 'daily');
    if (achievementsModal) achievementsModal.classList.toggle('show', which === 'achievements');
    if (codexModal) codexModal.classList.toggle('show', which === 'codex');
    if (helpModal) helpModal.classList.toggle('show', which === 'help');
    if (settingsModal) settingsModal.classList.toggle('show', which === 'settings');
    syncStagePhase();

    if (which === 'biolab') renderBiolab();
    if (which === 'daily') renderDailyModal();
    if (which === 'achievements') renderAchievements();
    if (which === 'codex') renderCodex();
    if (which === 'settings') syncSettingsUI();
    if (which === 'intro' && (menuRecordText || menuRecordBadge)) {
      const bl = loadBiolab();
      const recStr = t('record_badge', { time: fmtTime(bl.bestTime), runs: bl.runs, points: bl.points });
      if (menuRecordText) menuRecordText.textContent = recStr;
      else if (menuRecordBadge) menuRecordBadge.textContent = recStr;
    }

    if (which !== null) {
      const targetModal = MODAL_ELEMENTS[which];
      const focusTarget = targetModal?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus({ preventScroll: true });
    } else if (lastModalFocus && lastModalFocus.isConnected) {
      lastModalFocus.focus({ preventScroll: true });
      lastModalFocus = null;
    }
    lastActiveModal = which;
  }

  function syncSettingsUI(): void {
    const syncPressed = (selector: string, match: (btn: Element) => boolean) => {
      document.querySelectorAll(selector).forEach((btn) => {
        const active = match(btn);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };
    syncPressed('#opt-flashes .settings-btn', (btn) => btn.getAttribute('data-val') === gameSettings.screenFlashes);
    syncPressed('#opt-shake .settings-btn', (btn) => btn.getAttribute('data-val') === gameSettings.cameraShake);
    syncPressed('#opt-parallax .settings-btn', (btn) => btn.getAttribute('data-val') === (gameSettings.microParallax ? 'on' : 'off'));
    if (sliderBgm) sliderBgm.value = String(gameSettings.bgmVolume);
    if (sliderSfx) sliderSfx.value = String(gameSettings.sfxVolume);
    if (bgmVolLabel) bgmVolLabel.textContent = `${gameSettings.bgmVolume}%`;
    if (sfxVolLabel) sfxVolLabel.textContent = `${gameSettings.sfxVolume}%`;
    syncPressed('#opt-quality .settings-btn', (btn) => btn.getAttribute('data-val') === gameSettings.quality);
    syncPressed('#opt-lang .settings-btn', (btn) => btn.getAttribute('data-val') === getLocale());
  }

  function applyQualitySettings(): void {
    const ratio = gameSettings.quality === 'low' ? 0.5 : 1.0;
    sim.setQualityRatio(ratio);
    bloomCanvas.style.display = gameSettings.quality === 'low' ? 'none' : '';
  }
  applyQualitySettings();

  // ---------- Бестиарий и Кодекс Гибридов: постраничная кнопочная навигация (Без скролла) ----------
  let codexCategory: 'all' | 'enemy' | 'hybrid' | 'branch' = 'all';
  let codexPage = 0;
  const CODEX_PAGE_SIZE = 6;

  function codexIconSvg(entryId: string, category: string, fallbackIconId: string): string {
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

  function renderCodex(): void {
    const unlocked = loadCodex();
    if (codexStatsEl) {
      codexStatsEl.textContent = t('codex_stats', { unlocked: unlocked.size, total: CODEX_ENTRIES.length });
    }

    const filtered = CODEX_ENTRIES.filter((e) => {
      if (codexCategory === 'all') return true;
      return e.category === codexCategory;
    });

    const maxPage = Math.max(0, Math.ceil(filtered.length / CODEX_PAGE_SIZE) - 1);
    if (codexPage > maxPage) codexPage = maxPage;
    if (codexPage < 0) codexPage = 0;

    if (codexPageInfo) {
      codexPageInfo.textContent = t('codex_page', { cur: codexPage + 1, max: Math.max(1, maxPage + 1) });
    }

    if (codexPrevBtn) codexPrevBtn.disabled = codexPage <= 0;
    if (codexNextBtn) codexNextBtn.disabled = codexPage >= maxPage;

    if (!codexGridEl) return;
    codexGridEl.innerHTML = '';

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

  // Переключение вкладок Кодекса
  document.querySelectorAll('.codex-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.codex-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      codexCategory = (tabBtn.getAttribute('data-cat') || 'all') as typeof codexCategory;
      codexPage = 0;
      renderCodex();
    });
  });

  if (codexPrevBtn) {
    codexPrevBtn.addEventListener('click', () => {
      if (codexPage > 0) {
        codexPage--;
        renderCodex();
      }
    });
  }
  if (codexNextBtn) {
    codexNextBtn.addEventListener('click', () => {
      codexPage++;
      renderCodex();
    });
  }

  if (codexOpenBtn) codexOpenBtn.addEventListener('click', () => { sfx.codexOpen(); showModal('codex'); });
  if (codexCloseBtn) codexCloseBtn.addEventListener('click', () => showModal(!started || paused ? 'intro' : null));

  // Переключение вкладок Руководства
  document.querySelectorAll('.help-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      const targetId = 'help-content-' + tabBtn.getAttribute('data-tab');
      document.querySelectorAll('.help-content').forEach((c) => {
        c.toggleAttribute('hidden', c.id !== targetId);
      });
    });
  });

  let helpOpenedFromGame = false;
  function closeHelpModal(): void {
    if (helpOpenedFromGame) {
      helpOpenedFromGame = false;
      paused = false;
      sfx.startBgm();
      showModal(null);
    } else {
      showModal(!started || paused ? 'intro' : null);
    }
  }
  if (helpModalOpenBtn) helpModalOpenBtn.addEventListener('click', () => { helpOpenedFromGame = false; showModal('help'); });
  if (helpCloseBtn) helpCloseBtn.addEventListener('click', closeHelpModal);

  function syncPauseButton(): void {
    if (pauseBtnUse) pauseBtnUse.setAttribute('href', paused ? '#ico-play' : '#ico-pause');
    if (pauseBtn) pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
  }

  function syncAudioIcons(): void {
    const isMuted = sfx.muted;
    if (muteBtnUse) muteBtnUse.setAttribute('href', isMuted ? '#ico-sound-mute' : '#ico-sound-on');
    if (muteBtn) {
      const label = t(isMuted ? 'unmute_btn_title' : 'mute_btn_title');
      muteBtn.title = label;
      muteBtn.setAttribute('aria-label', label);
      muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
    }
    if (setBgmIcoUse) {
      setBgmIcoUse.setAttribute('href', isMuted || gameSettings.bgmVolume === 0 ? '#ico-sound-mute' : '#ico-sound-on');
    }
    if (setSfxIcoUse) {
      setSfxIcoUse.setAttribute('href', isMuted || gameSettings.sfxVolume === 0 ? '#ico-sound-mute' : '#ico-sound-on');
    }
  }

  function syncFullscreenButton(): void {
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

  function toggleMuteAction(): void {
    sfx.unlock();
    const isMuted = sfx.toggleMute();
    gameSettings.muted = isMuted;
    saveSettings();
    syncAudioIcons();
    showToast(
      `<svg class="bio-icon ${isMuted ? 'bio-amber' : 'bio-cyan'}" viewBox="0 0 32 32" aria-hidden="true"><use href="#${isMuted ? 'ico-sound-mute' : 'ico-sound-on'}"/></svg> ${t(isMuted ? 'toast_muted' : 'toast_unmuted')}`
    );
  }

  async function toggleFullscreenAction(): Promise<void> {
    if (!document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch {
      // Отклонено политикой браузера или жестом без фокуса
    } finally {
      syncFullscreenButton();
    }
  }

  function togglePause(): void {
    if (!started || gameOver || dying || pendingUps > 0) return;
    paused = !paused;
    if (paused) {
      sfx.setTailDrone(false);
      sfx.stopBgm();
      showModal('intro');
    } else {
      sfx.startBgm();
      showModal(null);
    }
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', toggleMuteAction);
  }
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => { void toggleFullscreenAction(); });
  }
  document.addEventListener('fullscreenchange', syncFullscreenButton);

  document.querySelectorAll('.modal-x-btn[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-close-modal') === 'help' && helpOpenedFromGame) {
        closeHelpModal();
      } else {
        showModal(!started || (paused && !gameOver) ? 'intro' : null);
      }
    });
  });

  // Настройки комфорта и звука
  document.querySelectorAll('#opt-flashes .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      gameSettings.screenFlashes = (btn.getAttribute('data-val') || 'soft') as typeof gameSettings.screenFlashes;
      saveSettings();
      syncSettingsUI();
    });
  });

  document.querySelectorAll('#opt-shake .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      gameSettings.cameraShake = (btn.getAttribute('data-val') || 'subtle') as typeof gameSettings.cameraShake;
      saveSettings();
      syncSettingsUI();
    });
  });

  document.querySelectorAll('#opt-parallax .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      gameSettings.microParallax = btn.getAttribute('data-val') === 'on';
      saveSettings();
      syncSettingsUI();
    });
  });

  if (sliderBgm) {
    sliderBgm.addEventListener('input', () => {
      gameSettings.bgmVolume = Number(sliderBgm.value);
      if (bgmVolLabel) bgmVolLabel.textContent = `${gameSettings.bgmVolume}%`;
      sfx.setBgmVolume(gameSettings.bgmVolume / 100);
      saveSettings();
      syncAudioIcons();
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener('input', () => {
      gameSettings.sfxVolume = Number(sliderSfx.value);
      if (sfxVolLabel) sfxVolLabel.textContent = `${gameSettings.sfxVolume}%`;
      sfx.setSfxVolume(gameSettings.sfxVolume / 100);
      saveSettings();
      syncAudioIcons();
    });
  }

  if (settingsOpenBtn) settingsOpenBtn.addEventListener('click', () => showModal('settings'));
  if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', () => showModal(!started || paused ? 'intro' : null));

  document.querySelectorAll('#opt-quality .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      gameSettings.quality = (btn.getAttribute('data-val') || 'medium') as typeof gameSettings.quality;
      saveSettings();
      applyQualitySettings();
      syncSettingsUI();
    });
  });

  function applyI18n(): void {
    document.documentElement.lang = getLocale();
    const setText = (id: string, key: I18nKey) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(key);
    };
    const setHtml = (id: string, key: I18nKey) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = t(key);
    };

    setText('menu-brand-badge', 'brand_badge');
    setText('menu-tagline', 'tagline');
    if (menuRecordText || menuRecordBadge) {
      const bl = loadBiolab();
      const recStr = t('record_badge', { time: fmtTime(bl.bestTime), runs: bl.runs, points: bl.points });
      if (menuRecordText) menuRecordText.textContent = recStr;
      else if (menuRecordBadge) menuRecordBadge.textContent = recStr;
    }
    if (startBtnLabel) startBtnLabel.textContent = started ? t('resume_run') : t('start_run');
    const dcLabel = document.getElementById('daily-challenge-label');
    if (dcLabel) {
      const ch = getDailyChallenge();
      dcLabel.textContent = `${t('daily_challenge')}: ${trChallengeTitle(ch.branch, ch.title)}`;
    }
    if (achievementsOpenLabel) {
      achievementsOpenLabel.textContent = t('achievements_btn', { unlocked: loadAchievements().size, total: ACHIEVEMENTS.length });
    }
    if (biolabOpenBtn) {
      const sp = biolabOpenBtn.querySelector('span');
      if (sp) sp.textContent = t('biolab');
    }
    if (codexOpenBtn) {
      const sp = codexOpenBtn.querySelector('span');
      if (sp) sp.textContent = t('codex');
    }
    if (helpModalOpenBtn) {
      const sp = helpModalOpenBtn.querySelector('span');
      if (sp) sp.textContent = t('help');
    }
    if (settingsOpenBtn) {
      const sp = settingsOpenBtn.querySelector('span');
      if (sp) sp.textContent = t('settings');
    }

    // Controls strip
    setText('ctrl-k-mouse', 'ctrl_mouse');
    setText('ctrl-a-aim', 'ctrl_aim');
    setText('ctrl-k-wasd', 'ctrl_wasd');
    setText('ctrl-a-move', 'ctrl_move');
    setText('ctrl-k-dash', 'ctrl_dash_key');
    setText('ctrl-a-dash', 'ctrl_dash');
    setText('ctrl-k-call', 'ctrl_call_key');
    setText('ctrl-a-call', 'ctrl_call');
    setText('ctrl-k-pause', 'ctrl_pause_key');
    setText('ctrl-a-pause', 'ctrl_pause');

    // HUD labels & tooltips
    setText('hud-hp-label', 'hud_hp');
    setText('hud-tail-label', 'hud_tail');
    setText('res-label', 'hud_resonance');
    nodesChipEl.title = t('nodes_chip_title');
    branchChipEl.title = t('branch_chip_title');
    helpBtn.title = t('help_btn_title');
    helpBtn.setAttribute('aria-label', t('help_btn_title'));
    if (pauseBtn) {
      pauseBtn.title = t('pause_btn_title');
      pauseBtn.setAttribute('aria-label', t('pause_btn_title'));
    }
    syncAudioIcons();
    syncFullscreenButton();
    syncPauseButton();
    for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
      const nameEl = document.querySelector(`#dna-${b} .dna-name`);
      if (nameEl) nameEl.textContent = t(`dna_${b}` as I18nKey);
    }
    joystick.setLabels(t('touch_call'), t('touch_dash'));
    if (!started && radarBadgeEl) {
      const rbText = radarBadgeEl.querySelector('#radar-badge-text') ?? radarBadgeEl;
      rbText.textContent = t('radar_threats', { n: 0 });
    }

    // Death modal buttons
    if (restartBtn) restartBtn.textContent = t('restart_btn');
    if (endlessBtn) {
      const sp = endlessBtn.querySelector('span');
      if (sp) sp.textContent = t('endless_btn');
      else endlessBtn.textContent = t('endless_btn');
    }
    if (savePortraitBtn) {
      const sp = savePortraitBtn.querySelector('span');
      if (sp) sp.textContent = t('save_portrait');
    }
    if (biolabBtn) {
      const sp = biolabBtn.querySelector('span');
      if (sp) sp.textContent = t('biolab');
    }
    if (deathAchBtn) {
      const sp = deathAchBtn.querySelector('span');
      if (sp) sp.textContent = t('achievements');
    }

    // Biolab
    setText('biolab-title', 'biolab_title');
    const bSub = document.getElementById('biolab-sub');
    if (bSub) bSub.textContent = t('biolab_sub', { max: MAX_ACTIVE_BIOLAB });
    if (biolabDisableAllBtn) biolabDisableAllBtn.textContent = t('biolab_disable_all');
    if (biolabCloseBtn) biolabCloseBtn.textContent = t('biolab_close');

    // Daily Challenge & Achievements
    setText('daily-modal-title', 'daily_challenge');
    setText('daily-modal-sub', 'daily_modal_sub');
    setText('daily-start-label', 'daily_start');
    if (dailyCloseBtn) dailyCloseBtn.textContent = t('daily_back');
    setText('ach-title-el', 'ach_title');
    setText('ach-sub-el', 'ach_sub');
    if (achCloseBtn) achCloseBtn.textContent = t('codex_close');

    // Codex
    setText('codex-title-el', 'codex_title');
    setText('codex-sub', 'codex_sub');
    setText('codex-prev-label', 'codex_prev');
    setText('codex-next-label', 'codex_next');
    if (codexCloseBtn) codexCloseBtn.textContent = t('codex_close');
    const codexCounts: Record<string, number> = {
      all: CODEX_ENTRIES.length,
      enemy: CODEX_ENTRIES.filter((e) => e.category === 'enemy').length,
      hybrid: CODEX_ENTRIES.filter((e) => e.category === 'hybrid').length,
      branch: CODEX_ENTRIES.filter((e) => e.category === 'branch').length,
    };
    document.querySelectorAll('.codex-tab').forEach((tab) => {
      const cat = tab.getAttribute('data-cat') || 'all';
      tab.textContent = t(`codex_tab_${cat}` as I18nKey, { n: codexCounts[cat] ?? 0 });
    });

    // Help modal
    setText('help-title-el', 'help_title');
    setText('htab-basics', 'help_tab_basics');
    setText('htab-dna', 'help_tab_dna');
    setText('htab-world', 'help_tab_world');
    if (helpCloseBtn) helpCloseBtn.textContent = t('help_close');
    for (const prefix of ['b', 'd', 'w'] as const) {
      for (let i = 1; i <= 4; i++) {
        setText(`help-${prefix}${i}-t`, `help_${prefix}${i}_t` as I18nKey);
        setHtml(`help-${prefix}${i}-p`, `help_${prefix}${i}_p` as I18nKey);
      }
    }

    // Settings
    setText('settings-title-el', 'settings_title');
    setText('settings-subtitle-el', 'settings_sub');
    setText('set-flashes-name', 'settings_flashes');
    setText('set-flashes-hint', 'settings_flashes_hint');
    setText('set-shake-name', 'settings_shake');
    setText('set-shake-hint', 'settings_shake_hint');
    setText('set-parallax-name', 'settings_parallax');
    setText('set-parallax-hint', 'settings_parallax_hint');
    setText('set-quality-name', 'settings_quality');
    setText('set-quality-hint', 'settings_quality_hint');
    setText('set-lang-name', 'settings_lang');
    setText('set-lang-hint', 'settings_lang_hint');
    setText('set-bgm-name', 'settings_bgm');
    setText('set-sfx-name', 'settings_sfx');
    setText('set-backup-name', 'settings_backup');
    setText('set-backup-hint', 'settings_backup_hint');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n') as I18nKey | null;
      if (k) el.textContent = t(k);
    });
    document.querySelectorAll('.modal-x-btn').forEach((btn) => {
      btn.setAttribute('aria-label', t('close_aria'));
    });
    if (settingsCloseBtn) settingsCloseBtn.textContent = t('settings_close');
    setText('export-save-label', 'export_save');
    setText('import-save-label', 'import_save');

    syncRerollBtn();
    updateBranchChip();
    updateScaleHud();
    updateWeaponHud();
    renderBiolab();
    renderCodex();
    renderAchievements();
    if (dailyModal?.classList.contains('show')) renderDailyModal();
    updateDailyHudPill();
  }
  applyI18n();

  const SAVE_KEYS = [
    'lumivore-biolab-v1',
    'lumivore_codex_v1',
    'lumivore_achievements_v1',
    'lumivore_leaderboard_v1',
    'lumivore_settings_v1',
    'lumivore_daily_done_v1',
  ] as const;

  const exportSaveBtn = document.getElementById('export-save-btn');
  const importSaveBtn = document.getElementById('import-save-btn');
  const importSaveFile = document.getElementById('import-save-file') as HTMLInputElement | null;

  if (exportSaveBtn) {
    exportSaveBtn.addEventListener('click', () => {
      const payload: Record<string, unknown> = { version: 1, exportedAt: new Date().toISOString() };
      for (const k of SAVE_KEYS) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try { payload[k] = JSON.parse(raw); } catch { payload[k] = raw; }
        }
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumivore-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast_save_exported'));
    });
  }

  if (importSaveBtn && importSaveFile) {
    importSaveBtn.addEventListener('click', () => importSaveFile.click());
    importSaveFile.addEventListener('change', async () => {
      const file = importSaveFile.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
        for (const k of SAVE_KEYS) {
          if (k in parsed && parsed[k] !== undefined) {
            localStorage.setItem(k, typeof parsed[k] === 'string' ? parsed[k] as string : JSON.stringify(parsed[k]));
          }
        }
        renderBiolab();
        renderCodex();
        renderAchievements();
        refreshCodexBonuses();
        showToast(t('toast_save_imported'), 'success');
      } catch {
        showToast(t('toast_save_error'), 'danger');
      } finally {
        importSaveFile.value = '';
      }
    });
  }

  document.querySelectorAll('#opt-lang .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = (btn.getAttribute('data-val') || 'ru') as 'ru' | 'en';
      setLocale(lang);
      applyI18n();
      syncSettingsUI();
    });
  });

  // ---------- Биолаб: мета-прогрессия между забегами, категории и переключение модулей ----------
  function renderBiolab(): void {
    const bl = loadBiolab();
    const ownedCount = BIOLAB_UNLOCKS.filter((u) => bl.unlocked.includes(u.id)).length;
    const activeCount = getActiveIds(bl).length;
    const pct = Math.round((ownedCount / BIOLAB_UNLOCKS.length) * 100);
    biolabPointsEl.innerHTML =
      `<svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-incubator"/></svg> ${t('biolab_points', { pts: bl.points, owned: ownedCount, total: BIOLAB_UNLOCKS.length, pct, best: fmtTime(bl.bestTime) })}`;
    if (biolabSlotsPillEl) {
      biolabSlotsPillEl.textContent = t('biolab_slots', { active: activeCount, max: MAX_ACTIVE_BIOLAB });
    }
    if (biolabDisableAllBtn) {
      biolabDisableAllBtn.disabled = activeCount === 0;
    }

    biolabListEl.innerHTML = '';
    const categories: BiolabCategory[] = ['form', 'dna', 'passive'];
    for (const cat of categories) {
      const catHead = document.createElement('div');
      catHead.className = 'bl-section-title';
      catHead.textContent = t(`biolab_cat_${cat}` as I18nKey);
      biolabListEl.appendChild(catHead);

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
        biolabListEl.appendChild(card);
      }
    }
  }

  biolabListEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.bl-card') as HTMLElement | null;
    if (!card || !card.dataset.id) return;
    const id = card.dataset.id;
    if (!isUnlocked(id)) {
      if (purchase(id)) {
        sfx.biolabUnlock();
        showToast(t('toast_biolab_bought'), 'success');
      } else {
        sfx.capture(false);
      }
    } else {
      const res = toggleModule(id);
      if (!res.ok && res.reason === 'limit') {
        sfx.capture(false);
        showToast(t('biolab_limit_toast', { max: MAX_ACTIVE_BIOLAB }), 'warn');
      } else if (res.ok) {
        sfx.upgradeSelect();
      }
    }
    renderBiolab();
  });
  if (biolabDisableAllBtn) {
    biolabDisableAllBtn.addEventListener('click', () => {
      disableAllBiolab();
      sfx.upgradeSelect();
      showToast(t('biolab_disabled_all_toast'), 'info');
      renderBiolab();
    });
  }
  const modalBackTarget = (): ModalKind | null => (!started || (paused && !gameOver) ? 'intro' : null);
  if (biolabOpenBtn) biolabOpenBtn.addEventListener('click', () => showModal('biolab'));
  if (biolabBtn) biolabBtn.addEventListener('click', () => showModal('biolab'));
  biolabCloseBtn.addEventListener('click', () => showModal(modalBackTarget()));
  savePortraitBtn.addEventListener('click', () => {
    if (!lastGenome) return;
    downloadPortrait(portraitCanvas, `lumivore-${lastGenome.branch}-${Math.round(lastGenome.survivalTime)}s.png`);
  });

  // Стартовые бонусы Биолаба применяются к каждому новому забегу (только активные модули!)
  function applyBiolabStart(): void {
    const bl = loadBiolab();
    if (isActive('start_orbs', bl)) { wlvl.orbs = 1; wlvl.spikes = 0; }
    if (isActive('start_aura', bl)) {
      wlvl.aura = 1;
      wlvl.spikes = 0;
      maxHp = Math.max(50, maxHp - 15);
      player.hp = Math.min(player.hp, maxHp);
    }
    if (isActive('start_nova2', bl)) {
      wlvl.nova = 1;
      wlvl.spikes = 0;
      biolabNovaCdMul = 1.15;
      novaCd = NOVA.cd[0] * biolabNovaCdMul;
    }
    if (isActive('start_tail_xl', bl)) tailLen = TAIL.startLen + 6;
    if (isActive('perm_regen', bl)) regen += 0.25;
    if (isActive('perm_magnet', bl)) magnetR *= 1.2;
    if (isActive('perm_dmg', bl)) dmgMul *= 1.08;
    // Синтез генома: старт с 1 ДНК-уровнем выбранной ветки
    if (isActive('unlock_vermis', bl)) { dnaXp.vermis = DNA_LEVELS[0]; lastDnaLvl.vermis = 1; }
    if (isActive('unlock_chimera', bl)) { dnaXp.chimera = DNA_LEVELS[0]; lastDnaLvl.chimera = 1; }
    if (isActive('unlock_mycelium', bl)) { dnaXp.mycelium = DNA_LEVELS[0]; lastDnaLvl.mycelium = 1; }
    if (isActive('unlock_symbiont', bl)) { dnaXp.symbiont = DNA_LEVELS[0]; lastDnaLvl.symbiont = 1; }
  }

  function updateDailyHudPill(): void {
    if (!dailyHudPillEl) return;
    if (!dailyRunActive) {
      dailyHudPillEl.hidden = true;
      dailyHudPillEl.classList.remove('done');
      return;
    }
    dailyHudPillEl.hidden = false;
    dailyHudPillEl.classList.toggle('done', dailyRunDone);
    dailyHudPillEl.textContent = dailyRunDone
      ? t('daily_hud_done')
      : t('daily_hud_progress', { cur: fmtTime(gameTime), goal: fmtTime(dailyInfo.goalTimeSec), scale: dailyInfo.goalScale });
  }

  function renderDailyModal(): void {
    if (!dailyBriefBody) return;
    const ch = getDailyChallenge();
    const en = getLocale() === 'en';
    const done = isDailyCompleted(ch.dayKey);
    const dnaName = trDnaName(ch.branch, DNA_NAMES[ch.branch]);
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
        <p><svg class="chip-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${ch.branch}"/></svg><strong>${dnaName}</strong> · ${challengeTitle}</p>
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

  function renderAchievements(): void {
    const unlocked = loadAchievements();
    const en = getLocale() === 'en';
    if (achievementsOpenLabel) {
      achievementsOpenLabel.textContent = t('achievements_btn', { unlocked: unlocked.size, total: ACHIEVEMENTS.length });
    }
    if (achStatsPillEl) {
      achStatsPillEl.textContent = t('ach_stats', { unlocked: unlocked.size, total: ACHIEVEMENTS.length });
    }
    if (achProgressEl) {
      achProgressEl.max = ACHIEVEMENTS.length;
      achProgressEl.value = unlocked.size;
    }
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

  function grantAchievements(newly: AchievementDef[]): void {
    if (newly.length === 0) return;
    const en = getLocale() === 'en';
    let pts = 0;
    for (const a of newly) pts += a.reward;
    if (pts > 0) addBiolabPoints(pts);
    renderAchievements();
    if (!dying && !gameOver) sfx.biolabUnlock();
    for (const ach of newly) {
      const title = en ? ach.titleEn : ach.title;
      showToast(
        `<svg class="bio-icon bio-amber" viewBox="0 0 64 64" aria-hidden="true"><use href="#${ach.iconId}"/></svg> ` +
        `${en ? 'ACHIEVEMENT' : 'ДОСТИЖЕНИЕ'}: ${title} (+${ach.reward})`,
        'success'
      );
    }
  }

  // ---------- Старт / пауза / рестарт ----------
  introStartBtn.addEventListener('click', () => {
    if (!started && gameTime === 0 && !gameOver) {
      // Пересчитываем стартовый арсенал и активные модули Биолаба перед первым выходом
      wlvl.spikes = 1; wlvl.orbs = 0; wlvl.nova = 0; wlvl.aura = 0; wlvl.mandibles = 0; wlvl.cysts = 0;
      maxHp = PLAYER.hp;
      player.hp = PLAYER.hp;
      regen = 0.18;
      magnetR = PLAYER.magnet;
      dmgMul = 1;
      tailLen = TAIL.startLen;
      novaCd = 2;
      biolabNovaCdMul = 1;
      dnaXp.vermis = 0; dnaXp.chimera = 0; dnaXp.mycelium = 0; dnaXp.symbiont = 0;
      lastDnaLvl.vermis = 0; lastDnaLvl.chimera = 0; lastDnaLvl.mycelium = 0; lastDnaLvl.symbiont = 0;
      applyBiolabStart();
      refreshMainGenome();
      updateBranchChip();
      updateDnaHud();
      updateWeaponHud();
    }
    started = true;
    paused = false;
    sfx.startBgm();
    showModal(null);
    if (startBtnLabel) startBtnLabel.textContent = t('resume_run');
  });

  const dailyChallengeBtn = document.getElementById('daily-challenge-btn');
  if (dailyChallengeBtn) {
    dailyChallengeBtn.addEventListener('click', () => showModal('daily'));
  }
  if (dailyStartBtn) {
    dailyStartBtn.addEventListener('click', () => {
      const ch = getDailyChallenge();
      restartBtn.click();
      dailyInfo = ch;
      dailyRunActive = true;
      dailyRunDone = isDailyCompleted(ch.dayKey);
      dailyRng = mulberry32(ch.seed);
      dailyEnemySpeedMul = ch.modifiers.enemySpeedMul;
      dailyTailDpsMul = ch.modifiers.tailDpsMul;
      dailyDmgMul = ch.modifiers.dmgMul;
      dailyCaptureSpeedMul = ch.modifiers.captureSpeedMul;
      dailyEnemyNodeAggroMul = ch.modifiers.enemyNodeAggroMul;
      dailyXpMul = ch.modifiers.xpMul;
      dailyDashCdDelta = ch.modifiers.dashCdDelta;
      maxHp = Math.max(40, maxHp + ch.modifiers.maxHpDelta);
      player.hp = Math.min(player.hp, maxHp);
      started = true;
      paused = false;
      dnaXp[ch.branch] = Math.max(dnaXp[ch.branch], DNA_LEVELS[0]);
      lastDnaLvl[ch.branch] = Math.max(lastDnaLvl[ch.branch], 1);
      refreshMainGenome();
      updateDnaHud();
      updateBranchChip();
      updateDailyHudPill();
      showModal(null);
      showToast(`${t('daily_challenge')} (${ch.dayKey}): ${trChallengeTitle(ch.branch, ch.title)}`, 'warn');
    });
  }
  if (dailyCloseBtn) dailyCloseBtn.addEventListener('click', () => showModal(modalBackTarget()));
  if (achievementsOpenBtn) achievementsOpenBtn.addEventListener('click', () => showModal('achievements'));
  if (deathAchBtn) deathAchBtn.addEventListener('click', () => showModal('achievements'));
  if (achCloseBtn) achCloseBtn.addEventListener('click', () => showModal(modalBackTarget()));
  helpBtn.addEventListener('click', () => {
    if (!started || gameOver || dying) return;
    paused = true;
    helpOpenedFromGame = true;
    sfx.setTailDrone(false);
    sfx.stopBgm();
    showModal('help');
  });

  restartBtn.addEventListener('click', () => {
    dying = false;
    dyingT = 0;
    lastDamageCause = null;
    capturedDeathBg = null;
    liveAchCheckT = 0;
    dailyRunActive = false;
    dailyRunDone = false;
    dailyEnemySpeedMul = 1;
    dailyTailDpsMul = 1;
    dailyDmgMul = 1;
    dailyCaptureSpeedMul = 1;
    dailyEnemyNodeAggroMul = 1;
    dailyXpMul = 1;
    dailyDashCdDelta = 0;
    dailyRng = Math.random;
    biolabNovaCdMul = 1;
    if (deathCauseEl) deathCauseEl.hidden = true;
    updateDailyHudPill();
    scaleIdx = 0;
    curWorldW = worldSize(0).w;
    curWorldH = worldSize(0).h;
    spawnNodesForScale(0);
    player.x = curWorldW / 2;
    player.y = curWorldH / 2;
    camX = player.x;
    camY = player.y;
    prevCamX = camX;
    prevCamY = camY;
    camZoom = SCALES[0].zoom;
    playerDirX = 1;
    playerDirY = 0;
    player.hp = PLAYER.hp;
    player.iframe = 0;
    maxHp = PLAYER.hp;
    moveSpeed = PLAYER.speed;
    magnetR = PLAYER.magnet;
    regen = 0.18;
    dmgMul = 1;
    atkSpdMul = 1;
    for (const k of Object.keys(statStacks)) delete statStacks[k];
    wlvl.spikes = 1;
    wlvl.orbs = 0;
    wlvl.nova = 0;
    wlvl.aura = 0;
    wlvl.mandibles = 0;
    wlvl.cysts = 0;
    spikesCd = 0;
    mandiblesCd = 0;
    cystsCd = 0;
    cystMoveDist = 0;
    idleTime = 0;
    dashCd = 0;
    dashT = 0;
    dashRequested = false;
    liveCysts.length = 0;
    mandibleSwipes.length = 0;
    corpseBeacons.length = 0;
    cursePredator = false;
    curseChitin = false;
    curseHunger = false;
    novaCd = 2;
    auraTick = 0;
    orbAngle = 0;
    toxinFlash = 0;
    enemies = [];
    projs = [];
    orbs = [];
    pathHistory.length = 0;
    tailTick = 0;
    tailLen = TAIL.startLen as number;
    kills = 0;
    rerollsLeft = 2;
    emptyRingsCount = 0;
    overdriveTier = 0;
    dmgTail = 0;
    dmgRing = 0;
    spikesFired = 0;
    pacifistShown = false;
    scale5NoNodeTime = 0;
    watcherSpawned = false;
    titanTrailTime = 0;
    titanSatedDone = false;
    level = 1;
    xp = 0;
    xpNext = xpRequiredForLevel(1);
    pendingUps = 0;
    gameTime = 0;
    spawnT = 1;
    nextBossAt = BOSS_FIRST_AT;
    nextPickDelta = 0;
    incubatorSpawnT = 20;
    nodeRaidScanT = 0;
    nodeUnattendedT.clear();
    callCd = 0;
    callRequested = false;
    frameBloom3 = 0;
    sinceSoul = 0;
    critFlashT = 0;
    tailState = 'ok';
    frameN = 0;
    // Сброс ДНК-матрицы, гибридов, шкалы бытия и статистики забега
    dnaXp.vermis = 0; dnaXp.chimera = 0; dnaXp.mycelium = 0; dnaXp.symbiont = 0;
    lastDnaLvl.vermis = 0; lastDnaLvl.chimera = 0; lastDnaLvl.mycelium = 0; lastDnaLvl.symbiont = 0;
    genes.clear();
    hybridsTaken.clear();
    hybridNotified.clear();
    tailCapBonus = 0;
    tailDpsMul = 1;
    unstableT = 0;
    unstableRollT = 0;
    puddleT = 0;
    whipTipCd = 0;
    psiZapT = 0;
    ringCd = 0;
    pendingPuddles.length = 0;
    eprojs = [];
    eliteTimer = ELITE.everySec;
    nextSpawnElite = false;
    damageDealt = 0;
    tailMaxReached = 0;
    relicGalvanic = false;
    galvanicTimer = 0;
    relicAbyssal = false;
    abyssalLureTimer = 0;
    relicCarapace = false;
    carapaceShieldReady = false;
    carapaceCooldown = 0;
    unstableKind = 0;
    recomputeNodeBonuses();
    overlay.reset();
    nodesHeldMax = 0;
    scaleMaxReached = 1;
    biomass = 0;
    titanPending = false;
    metamorphT = 0;
    trailOwn = false;
    trailEnemy = false;
    winRun = false;
    anomalies.length = 0;
    anomalyCd = 42;
    bloomBuffT = 0;
    neuralLinkActive = false;
    resonanceStreak = 0;
    resonanceTimer = 0;
    resonanceMult = 1.0;
    updateResonanceHud();
    gpuCanvas.style.transform = '';
    gpuCanvas.style.transformOrigin = '';
    bloomCanvas.style.transform = '';
    bloomCanvas.style.transformOrigin = '';
    mainGenome = 'neutral';
    updateStageBiome(1);
    updateBranchChip();
    updateDnaHud();
    updateScaleHud();
    waves.reset();
    sim.resetColonies();
    applyBiolabStart();
    updateWeaponHud();
    lastStatusKey = '';
    if (statusChipsEl) statusChipsEl.innerHTML = '';
    bossHudEl?.classList.remove('show');
    paused = false;
    gameOver = false;
    sfx.startBgm();
    modal.classList.remove('show');
    upgradeModal.classList.remove('show');
    syncStagePhase();
    if (startBtnLabel) startBtnLabel.textContent = t('resume_run');
  });

  // ---------- Пространственный хеш для коллизий (Zero-Allocation Pool) ----------
  const CELL = 40;
  const hash = new Map<number, Enemy[]>();
  const cellPool: Enemy[][] = [];
  const activeKeys: number[] = [];
  function buildHash(): void {
    for (let i = 0; i < activeKeys.length; i++) {
      const arr = hash.get(activeKeys[i]);
      if (arr) {
        arr.length = 0;
        cellPool.push(arr);
      }
    }
    hash.clear();
    activeKeys.length = 0;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      const key = cx * 1024 + cy;
      let arr = hash.get(key);
      if (!arr) {
        arr = cellPool.pop() ?? [];
        hash.set(key, arr);
        activeKeys.push(key);
      }
      arr.push(e);
    }
  }

  const defaultNearbyBuf: Enemy[] = [];
  const sporeNearbyBuf: Enemy[] = [];
  function nearby(x: number, y: number, radius: number, outBuf: Enemy[] = defaultNearbyBuf): Enemy[] {
    outBuf.length = 0;
    const c0x = Math.floor((x - radius) / CELL);
    const c1x = Math.floor((x + radius) / CELL);
    const c0y = Math.floor((y - radius) / CELL);
    const c1y = Math.floor((y + radius) / CELL);
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cy = c0y; cy <= c1y; cy++) {
        const arr = hash.get(cx * 1024 + cy);
        if (arr) {
          for (let k = 0; k < arr.length; k++) outBuf.push(arr[k]);
        }
      }
    }
    return outBuf;
  }

  function spawnEnemy(type: EnemyType, side?: number, atX?: number, atY?: number): void {
    const def = ENEMIES[type];
    // Миграция: режиссёр волн может фиксировать сторону появления
    const s = side ?? waves.spawnSide() ?? Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (atX !== undefined && atY !== undefined) {
      x = Math.max(16, Math.min(curWorldW - 16, atX));
      y = Math.max(16, Math.min(curWorldH - 16, atY));
    } else {
      const halfViewW = viewHalfW();
      const halfViewH = viewHalfH();
      const angle = (s / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const spawnDist = Math.max(halfViewW, halfViewH) + 60 + Math.random() * 80;
      x = Math.max(12, Math.min(curWorldW - 12, camX + Math.cos(angle) * spawnDist));
      y = Math.max(12, Math.min(curWorldH - 12, camY + Math.sin(angle) * spawnDist));
    }
    const scale = SCALES[scaleIdx];
    const hpScale = (1 + (gameTime / 60) * 0.45) * scale.enemyHpMul;
    let maxHp = Math.round(def.hp * hpScale);
    // Размер врагов масштабируется со шкалой бытия: на макро-уровнях они равны и превосходят игрока
    let radius = Math.round(def.radius * scale.enemySizeMul);
    // Урон врагов масштабируется со шкалой и временем выживания
    const dmgScale = (1 + (gameTime / 60) * 0.20) * scale.enemyDmgMul;
    let dmg = Math.round(def.dmg * dmgScale);

    let elite: EliteMutation | null = null;
    // Элиты: каждые 45 сек следующий враг рождается мутировавшим (Этап 4.3)
    if (nextSpawnElite && type !== 'brood' && type !== 'boss') {
      nextSpawnElite = false;
      elite = (['armored', 'enraged', 'necromancer', 'magnetic', 'mirrored'] as EliteMutation[])[Math.floor(Math.random() * 5)];
      maxHp = Math.round(maxHp * ELITE.hpMul);
      radius = Math.round(radius * ELITE.radiusMul);
      dmg = Math.round(dmg * 1.3);
    }
    enemies.push({
      id: enemyIdSeq++,
      x, y, vx: 0, vy: 0,
      hp: maxHp, maxHp,
      radius,
      dmg,
      type,
      flash: 0,
      atkCd: 0,
      orbCd: 0,
      tailCd: 0,
      kbx: 0, kby: 0,
      elite,
      infected: 0,
      sporeInf: 0,
      titan: false,
      colonyId: 0,
      skillCd: type === 'pulsar' ? 3 : 2,
      tail: [],
      tailCap: Math.round((def.tail + 2) * (scale.enemySizeMul > 1.5 ? 1.4 : 1)),
    });
    if (elite) {
      const e = enemies[enemies.length - 1];
      overlay.spawnPulse(e.x, e.y, ELITE.haloColor, 60);
    }
  }

  function killEnemy(e: Enemy, idx: number): void {
    if (e.dead) return;
    const def = ENEMIES[e.type];
    kills++;
    if (kills === 314) {
      overlay.spawnPulse(player.x, player.y, 0xffd166, 220);
      showToast('РЕЗОНАНС π (3.14): ФРАКТАЛЬНАЯ СИММЕТРИЯ ДОСТИГНУТА');
    }
    sfx.kill();
    if (unlockCodexEntry(e.titan ? 'titan' : e.type)) refreshCodexBonuses();
    const tip = e.tail.length > 0 ? e.tail[e.tail.length - 1] : e;
    overlay.spawnSplat(tip.x, tip.y, def.color);
    corpseBeacons.push({ x: tip.x, y: tip.y, ttl: 4 });
    sim.spawnPlayerSpores(toSimX(tip.x), toSimY(tip.y), e.type === 'boss' ? 1800 : 350);
    if (cursePredator && (e.elite || e.type === 'boss' || e.titan)) {
      player.hp = Math.min(maxHp, player.hp + 4);
    }
    // Хвостик отрывается и становится душой на его кончике.
    // Душа несёт ДНК своего генома (цвет = геном); босс рассыпается на 4 души всех геномов
    const xpVal = Math.round(def.xp * (e.elite ? ELITE.xpMul : 1));
    if (e.type === 'boss') {
      const per = Math.max(1, Math.round(xpVal / 4));
      const kinds: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        orbs.push({
          x: tip.x + Math.cos(a) * 14, y: tip.y + Math.sin(a) * 14,
          vx: 0, vy: 0, value: per, color: DNA_COLORS[kinds[k]], dna: kinds[k],
        });
      }
    } else {
      orbs.push({ x: tip.x, y: tip.y, vx: 0, vy: 0, value: xpVal, color: DNA_COLORS[def.dna], dna: def.dna });
    }
    if (e.type === 'boss' || e.elite || e.titan) {
      overlay.spawnPulse(tip.x, tip.y, def.color, e.type === 'boss' ? 130 : 55);
      sim.spawnPlayerSpores(toSimX(tip.x), toSimY(tip.y), 1500);
    }
    // Титан масштаба: убийство открывает метаморфоз (или финал на шкале 5)
    if (e.titan) {
      titanPending = false;
      enemies.splice(idx, 1);
      if (scaleIdx >= SCALES.length - 1) {
        finishRun(true);
        return;
      }
      startMetamorphosis();
      return;
    }
    // Споровый Реактор: заражённые спорами трупы детонируют цепной реакцией
    if (hybridsTaken.has('spore_reactor') && e.sporeInf > 0) {
      const boom = 16 * effDmg();
      overlay.spawnPulse(e.x, e.y, 0x86efac, 70);
      for (const o of nearby(e.x, e.y, 70, sporeNearbyBuf)) {
        if (o === e || o.hp <= 0) continue;
        o.hp -= boom;
        o.flash = 0.1;
        if (o.sporeInf <= 0 && hybridsTaken.has('spore_reactor')) o.sporeInf = 3;
      }
    }
    // Этап 4.1: экосистема - организмы умирают по-своему
    if (e.type === 'splitter') {
      // Личинка-дробитель: распадается на двух бегунов
      for (let k = 0; k < 2; k++) {
        spawnEnemy('runner', undefined, e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30);
      }
    }
    if (e.type === 'colony') {
      // Матка умерла: выводок гибнет вместе с ней
      for (let k = 0; k < enemies.length; k++) {
        if (enemies[k].colonyId === e.id) {
          enemies[k].hp = 0;
          enemies[k].colonyId = 0;
        }
      }
    }
    if (e.type === 'brood' && e.colonyId > 0) {
      // Смерть выводка кормит матку
      const mom = enemies.find((x) => x.id === e.colonyId);
      if (mom) mom.hp = Math.min(mom.maxHp, mom.hp + mom.maxHp * 0.05);
    }
    if (e.elite === 'necromancer') {
      // Некромант поднимает трёх личинок на месте смерти
      for (let k = 0; k < 3; k++) {
        spawnEnemy('grub', undefined, e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50);
      }
    }
    if (e.infected > 0) {
      // Заражённый союзник умирает: пульс в цвет игрока
      overlay.spawnPulse(e.x, e.y, 0x66fcf1, 30);
    }
    // «Инфицирование» / «Феромон-раб» (Паразит): жертва переходит на вашу сторону (только если не была уже заражена)
    if (!e.elite && e.type !== 'boss' && e.type !== 'brood' && e.infected === 0) {
      if (genes.has('infection') && Math.random() < 0.35) {
        e.infected = 8;
        e.hp = e.maxHp * 0.6;
        e.vx = 0; e.vy = 0;
        overlay.spawnPulse(e.x, e.y, 0x66fcf1, 30);
        return;
      }
      if (genes.has('charm') && Math.random() < 0.25) {
        e.infected = 30;
        e.hp = e.maxHp * 0.6;
        e.vx = 0; e.vy = 0;
        overlay.spawnPulse(e.x, e.y, 0x66fcf1, 40);
        return;
      }
    }
    e.dead = true;
    enemies.splice(idx, 1);
  }

  // Режиссёр событий волн (Этап 4.2): волны, засады, тишина, ярость, пир, миграция
  const waves = new WaveDirector({
    addEnemy: (type, side) => spawnEnemy(type, side),
    ringAround: (type, count, cx, cy, radius) => {
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        spawnEnemy(type, undefined, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      }
    },
    dropOrb: (x, y, value) => orbs.push({ x, y, vx: 0, vy: 0, value, color: 0xbdfdf8, dna: 'vermis' }),
    announce: (text) => showToast(text),
    playerPos: () => ({ x: player.x, y: player.y }),
  });

  // ---------- Метаморфоз: переход между шкалами бытия ----------
  function startMetamorphosis(): void {
    if (scaleIdx >= SCALES.length - 1) {
      if (overdriveTier > 0) {
        overdriveTier++;
        biomass = 0;
        player.hp = Math.min(maxHp, player.hp + maxHp * 0.3);
        sfx.metamorph();
        showToast(getLocale() === 'en' ? `OVERDRIVE TIER ${overdriveTier}: FRACTAL EXPANDS` : `OVERDRIVE TIER ${overdriveTier}: ФРАКТАЛ РАСШИРЯЕТСЯ`);
        overlay.spawnPulse(player.x, player.y, 0xffd166, 300);
        updateScaleHud();
        return;
      }
      finishRun(true);
      return;
    }
    scaleIdx++;
    scaleMaxReached = Math.max(scaleMaxReached, SCALES[scaleIdx].id);
    biomass = 0;
    metamorphT = METAMORPH.slowT + METAMORPH.zoomT;
    sfx.metamorph();
    const trSc = trScale(SCALES[scaleIdx].id, SCALES[scaleIdx].name, SCALES[scaleIdx].sub);
    showToast(
      `<svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ` +
      `${getLocale() === 'en' ? 'METAMORPHOSIS' : 'МЕТАМОРФОЗ'}: ${trSc.name} — ${trSc.sub}`
    );
    overlay.spawnPulse(player.x, player.y, 0xffffff, 280);
    overlay.beginShake(0.5);
    sim.spawnPlayerSpores(toSimX(player.x), toSimY(player.y), 3500);

    // Мир растёт: расширяем физические границы и открываем новые территории биома!
    curWorldW = worldSize(scaleIdx).w;
    curWorldH = worldSize(scaleIdx).h;
    spawnNodesForScale(scaleIdx);

    // Эволюционный скачок хвоста
    tailLen = Math.max(TAIL.minLen, tailLen * WORLD.tailKeep);
    tailDpsMul += WORLD.tailDpsBonus;

    updateStageBiome(SCALES[scaleIdx].id);
    updateScaleHud();
  }

  /** Запуск медленной анимации разрыва организма перед финальным окном */
  function beginDeathSequence(): void {
    if (dying || gameOver) return;
    dying = true;
    dyingT = DYING_DURATION;
    player.hp = 0;
    paused = false;
    upgradeModal.classList.remove('show');
    sfx.setTailDrone(false);
    sfx.stopBgm();
    sfx.death();
    overlay.spawnPulse(player.x, player.y, 0xff3b5c, 165);
    overlay.beginShake(0.45);
    if (gameSettings.screenFlashes !== 'off') hurtEl.classList.add('hit');
    const en = getLocale() === 'en';
    const causeText = lastDamageCause
      ? (en ? lastDamageCause.labelEn : lastDamageCause.labelRu)
      : t('death_cause_unknown');
    showToast(t('death_toast_fatal', { cause: causeText }), 'danger');
    capturedDeathBg = null;
    void sim.captureFrame().then((fc) => { if (fc) capturedDeathBg = fc; });
    syncStagePhase();
  }

  /** Финал забега: смерть (win=false) или Фрактальный Парадокс (win=true) */
  function finishRun(win: boolean): void {
    dying = false;
    gameOver = true;
    winRun = win;
    sfx.setTailDrone(false);
    sfx.stopBgm();
    if (win) sfx.victory();
    const bl = loadBiolab();
    const genome: RunGenome = {
      branch: mainGenome,
      weapons: (Object.entries(wlvl) as [WeaponId, number][]).filter(([, l]) => l > 0).map(([w]) => w),
      topUpgrades: Object.keys(statStacks).sort((a, b) => statStacks[b] - statStacks[a]).slice(0, 3),
      survivalTime: gameTime,
      kills,
      level,
      bioNodesHeld: nodesHeldMax,
      tailMaxReached: Math.round(tailMaxReached),
      damageDealt: Math.round(damageDealt),
      record: gameTime > bl.bestTime,
    };
    const blAfter = recordRun(genome);
    lastGenome = genome;
    const topRecords = recordLeaderboardEntry({
      branch: mainGenome,
      time: gameTime,
      kills,
      scale: scaleMaxReached,
      damageDealt: Math.round(damageDealt),
    });
    const newAchs = checkAchievements({
      time: gameTime,
      kills,
      nodesHeldMax,
      scaleMax: scaleMaxReached,
      damageDealt,
      codexCount: loadCodex().size,
      codexTotal: CODEX_ENTRIES.length,
      win,
    });
    const achBonusPts = newAchs.reduce((acc, a) => acc + a.reward, 0);
    grantAchievements(newAchs);
    const totalPtsGained = (blAfter.points - bl.points) + achBonusPts;

    const topStr = topRecords.slice(0, 3).map((r, i) => `#${i + 1} ${fmtTime(r.time)}`).join(' · ');
    modalTitle.textContent = win ? t('modal_win_title') : t('modal_lose_title');
    modalTitle.classList.toggle('win', win);
    modalTitle.classList.toggle('lose', !win);
    if (deathCauseEl) {
      if (!win) {
        const en = getLocale() === 'en';
        const causeText = lastDamageCause
          ? (en ? lastDamageCause.labelEn : lastDamageCause.labelRu)
          : t('death_cause_unknown');
        deathCauseEl.hidden = false;
        deathCauseEl.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg><span>${t('death_cause_label', { cause: causeText })}</span>`;
      } else {
        deathCauseEl.hidden = true;
      }
    }
    const hybridDef = HYBRIDS.find((h) => h.id === mainGenome);
    const trMainGenome = mainGenome === 'neutral'
      ? t('hud_specimen')
      : hybridDef
        ? trHybrid(hybridDef.id, hybridDef.name, hybridDef.desc).name
        : trDnaName(mainGenome as DnaBranch, DNA_NAMES[mainGenome as DnaBranch] ?? mainGenome);
    const genomeLabel = mainGenome === 'neutral'
      ? t('genome_base')
      : hybridDef
        ? `${t('hybrid_prefix')}: ${trMainGenome}`
        : `${t('genome_prefix')}: ${trMainGenome}`;
    modalSub.textContent = win
      ? t('modal_win_sub')
      : t('modal_lose_sub', { genome: genomeLabel, pts: totalPtsGained });
    const dmgOther = Math.max(0, Math.round(damageDealt - dmgTail - dmgRing));
    deathStatsEl.innerHTML =
      `<span class="stat-metric-row"><svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-timer"/></svg> ${fmtTime(gameTime)}${genome.record ? ` <svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-record-badge"/></svg> ${t('stat_record')}` : ''}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg> ${t('stat_kills', { n: kills })}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-weapon-spikes"/></svg> ${t('stat_lvl', { n: level })}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-lime" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-tail-length"/></svg> ${t('stat_tail', { n: Math.round(tailMaxReached) })}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-dominance"/></svg> ${t('stat_nodes', { held: nodesHeldMax, total: bioNodes.length })}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ${t('stat_scale', { n: scaleMaxReached })}${overdriveTier > 0 ? ` · OD+${overdriveTier}` : ''}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-orange" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-damage-nova"/></svg> ${t('stat_dmg', { n: Math.round(damageDealt).toLocaleString(getLocale()) })}</span>` +
      `<span class="stat-metric-row" style="font-size:10px;opacity:0.85;">${t('stat_breakdown', { tail: Math.round(dmgTail), ring: Math.round(dmgRing), other: dmgOther })}</span>` +
      (topStr ? `<span class="stat-metric-row" style="color:var(--cyan);">${t('stat_top', { branch: trMainGenome, list: topStr })}</span>` : '');
    if (endlessBtn) {
      endlessBtn.style.display = win ? '' : 'none';
    }
    // Портрет организма: процедурный фон + асинхронный readback physarum-поля
    const drawPortrait = (bg: HTMLCanvasElement | null): void => {
      const p = renderPortrait(bg, {
        branch: mainGenome,
        weapons: genome.weapons,
        tail: visibleTail(),
        bodyRadius: playerRadius(),
        stats: {
          time: gameTime, kills, level,
          tailMax: Math.round(tailMaxReached),
          nodesHeld: nodesHeldMax,
          damage: Math.round(damageDealt),
          points: Math.floor(pointsEarned(genome)),
          record: genome.record,
          scale: scaleMaxReached,
        },
      });
      const pctx = portraitCanvas.getContext('2d')!;
      portraitCanvas.width = p.width;
      portraitCanvas.height = p.height;
      pctx.drawImage(p, 0, 0);
    };
    drawPortrait(capturedDeathBg);
    if (!capturedDeathBg) {
      void sim.captureFrame().then((fc) => { if (fc && gameOver) drawPortrait(fc); });
    }
    bossHudEl?.classList.remove('show');
    modal.classList.add('show');
    syncStagePhase();
  }

  // ---------- Кольцо Смерти: замыкание траектории хвоста ----------
  // (геометрия вынесена в src/game/ringOfDeath.ts)

  /**
   * Детектор Кольца Смерти: ищем самопересечение последнего сегмента движения
   * с ранней траекторией. Первое пересечение = самая большая замкнутая область.
   */
  function detectRingClosure(): void {
    if (ringCd > 0) return;
    const pts = pathHistory;
    const n = pts.length;
    if (n < 24) return;
    const ax = pts[n - 1].x;
    const ay = pts[n - 1].y;
    const bx = player.x;
    const by = player.y;
    const win = Math.min(n - 1, RING.historyWindow);
    for (let i = 0; i < win - RING.skipAdj; i++) {
      const isect = segIsect(ax, ay, bx, by, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      if (isect) {
        const poly: { x: number; y: number }[] = [isect];
        for (let k = i + 1; k < n; k++) poly.push({ x: pts[k].x, y: pts[k].y });
        poly.push({ x: bx, y: by });
        const area = polyArea(poly);
        if (area >= RING.minArea) {
          triggerRing(poly);
          return;
        }
        return; // замыкание слишком маленькое - не ищем меньшие
      }
    }
  }

  /** Схлопывание полигона: урон всем внутри, вспышка, звук */
  function triggerRing(poly: { x: number; y: number }[]): void {
    ringCd = RING.cooldown;
    const plasma = hybridsTaken.has('plasma_leviathan');
    const dmg = tailLen * RING.dmgPerSeg * effDmg() * (plasma ? 4 : 1) * codexBonuses.explosiveDmgMul * codexBonuses.ringDmgMul;
    let cx = 0;
    let cy = 0;
    for (const p of poly) { cx += p.x; cy += p.y; }
    cx /= poly.length;
    cy /= poly.length;
    const color = plasma ? 0xff9d5c : 0xffd166;
    overlay.spawnPoly(poly, color);
    overlay.spawnPulse(cx, cy, color, 120);
    overlay.beginShake(0.25);
    sfx.ring();
    // Цели: враги в охвате полигона, точный тест - лучом
    let maxR = 0;
    let ringHits = 0;
    for (const p of poly) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
    for (const e of nearby(cx, cy, maxR + 40)) {
      if (e.hp <= 0) continue;
      if (!inPoly(e.x, e.y, poly)) continue;
      ringHits++;
      const inDmg = dmg * enemyDmgBonus(e);
      e.hp -= inDmg;
      e.flash = 0.12;
      e.tailCd = Math.max(e.tailCd, 0.3);
      overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, color);
      damageDealt += inDmg;
      dmgRing += inDmg;
      // Огненный Удав: всё не-элитное внутри кольца аннигилирует
      if (plasma && !e.elite && e.type !== 'boss') e.hp = 0;
    }
    // Кольцо Смерти наносит x2.5 осадного урона Гнёздам спор внутри полигона
    for (let ai = anomalies.length - 1; ai >= 0; ai--) {
      const a = anomalies[ai];
      if (a.kind !== 'cocoon' || (a.hp ?? 0) <= 0) continue;
      if (inPoly(a.x, a.y, poly)) {
        const siegeDmg = dmg * 2.5;
        a.hp = (a.hp ?? 0) - siegeDmg;
        overlay.pushDamage(a.x, a.y - a.r - 6, siegeDmg, color);
        damageDealt += siegeDmg;
        if ((a.hp ?? 0) <= 0) destroyCocoon(ai);
      }
    }
    // Маленькая плата за кольцо: хвост тратится на замыкание
    tailLen = Math.max(TAIL.minLen, tailLen - 1.5);
    // Пасхалка «Пакт Уробороса»: 3 пустых кольца подряд дают +5 HP
    if (ringHits === 0) {
      emptyRingsCount++;
      if (emptyRingsCount === 3) {
        emptyRingsCount = 0;
        player.hp = Math.min(maxHp, player.hp + 5);
        showToast(getLocale() === 'en' ? 'OUROBOROS PACT: Self-knowledge is hunger (+5 HP)' : 'ПАКТ УРОБОРОСА: Самопознание — это тоже форма голода (+5 HP)');
      }
    } else {
      emptyRingsCount = 0;
    }
  }

  function destroyCocoon(idx: number): void {
    const a = anomalies[idx];
    if (!a) return;
    anomalies.splice(idx, 1);
    overlay.spawnPulse(a.x, a.y, 0xa3e635, 160);
    overlay.spawnSplat(a.x, a.y, 0x86efac);
    overlay.beginShake(0.24);
    sfx.capture(true);
    sim.spawnPlayerSpores(toSimX(a.x), toSimY(a.y), 1400);
    // Взрыв гнезда бьёт окружающих врагов и осыпает арену богатыми душами ДНК
    for (const o of nearby(a.x, a.y, 140)) {
      if (o.hp > 0) {
        o.hp -= 55 * effDmg();
        o.flash = 0.12;
      }
    }
    const branches: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 80 + Math.random() * 140;
      const dna = branches[k % branches.length];
      orbs.push({
        x: a.x, y: a.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        value: 2 + scaleIdx,
        color: DNA_COLORS[dna],
        dna,
      });
    }
    showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-cocoon"/></svg> ${getLocale() === 'en' ? 'SPORE COCOON DESTROYED! +14 DNA ORBS' : 'ГНЕЗДО СПОР УНИЧТОЖЕНО! +14 СФЕР ДНК'}`);
  }

  function hitCocoonsInArea(x: number, y: number, radius: number, dmg: number, color: number): boolean {
    let hitAny = false;
    for (let ai = anomalies.length - 1; ai >= 0; ai--) {
      const a = anomalies[ai];
      if (a.kind !== 'cocoon' || (a.hp ?? 0) <= 0) continue;
      if (Math.hypot(x - a.x, y - a.y) < radius + a.r) {
        a.hp = (a.hp ?? 0) - dmg;
        overlay.pushDamage(a.x, a.y - a.r - 6, dmg, color);
        damageDealt += dmg;
        hitAny = true;
        if ((a.hp ?? 0) <= 0) destroyCocoon(ai);
      }
    }
    return hitAny;
  }

  function spawnAnomaly(): void {
    const roll = Math.random();
    const ang = Math.random() * Math.PI * 2;
    const en = getLocale() === 'en';
    if (roll < 0.36) {
      // Кислотный прилив: зона 3.5с предупреждения -> 9с едкой кислоты
      const r = 160 + scaleIdx * 18;
      const dist = 210 + Math.random() * 140;
      const ax = Math.max(r + 20, Math.min(curWorldW - r - 20, player.x + Math.cos(ang) * dist));
      const ay = Math.max(r + 20, Math.min(curWorldH - r - 20, player.y + Math.sin(ang) * dist));
      anomalies.push({ kind: 'acid', x: ax, y: ay, r, warnT: 3.5, life: 9, maxLife: 9, spawnCd: 0 });
      showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-acid"/></svg> ${en ? 'ACID TIDE IN SECTOR' : 'КИСЛОТНЫЙ ПРИЛИВ В СЕКТОРЕ'}`);
      sfx.anomalyAlert();
    } else if (roll < 0.72) {
      // Гнездо спор: кокон, плодящий выводок, пока не уничтожен (особенно уязвим к Кольцу Смерти)
      const dist = 260 + Math.random() * 150;
      const ax = Math.max(70, Math.min(curWorldW - 70, player.x + Math.cos(ang) * dist));
      const ay = Math.max(70, Math.min(curWorldH - 70, player.y + Math.sin(ang) * dist));
      const maxHp = Math.round(180 * (1 + scaleIdx * 0.5));
      anomalies.push({ kind: 'cocoon', x: ax, y: ay, r: 30, warnT: 1.5, life: 32, maxLife: 32, hp: maxHp, maxHp, spawnCd: 2.5 });
      overlay.spawnPulse(ax, ay, 0xa3e635, 110);
      showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-cocoon"/></svg> ${en ? 'SPORE COCOON: CRUSH WITH RING!' : 'ГНЕЗДО СПОР: СХЛОПНИТЕ КОЛЬЦОМ!'}`);
      sfx.anomalyAlert();
    } else {
      // Вспышка митоза: питательный дождь из 22 сфер ДНК и бафф хвоста на 10 сек
      bloomBuffT = 10;
      anomalies.push({ kind: 'bloom', x: player.x, y: player.y, r: 240, warnT: 0, life: 10, maxLife: 10, spawnCd: 0 });
      const branches: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
      for (let k = 0; k < 22; k++) {
        const oa = (k / 22) * Math.PI * 2 + Math.random() * 0.25;
        const od = 90 + Math.random() * 210;
        const ox = Math.max(16, Math.min(curWorldW - 16, player.x + Math.cos(oa) * od));
        const oy = Math.max(16, Math.min(curWorldH - 16, player.y + Math.sin(oa) * od));
        const dna = branches[k % branches.length];
        orbs.push({ x: ox, y: oy, vx: 0, vy: 0, value: 1 + Math.floor(scaleIdx * 0.5), color: DNA_COLORS[dna], dna });
      }
      overlay.spawnPulse(player.x, player.y, 0x66fcf1, 180);
      showToast(`<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-bloom"/></svg> ${en ? 'MITOSIS BLOOM: NUTRIENT SURGE (10s)' : 'ВСПЫШКА МИТОЗА: ПИТАТЕЛЬНАЯ СРЕДА (10 с)'}`);
      sfx.capture(true);
    }
  }


  // ---------- Игровой цикл ----------
  let lastTime = performance.now();
  /** Дуги Тесла-сети и лазеры Пси-сети: пересобираются каждый кадр */
  const frameArcs: { x1: number; y1: number; x2: number; y2: number; color: number }[] = [];
  const frameLasers: { x1: number; y1: number; x2: number; y2: number }[] = [];
  /** Резонанс: орбиты шире и больнее (используется и в рендере) */
  const orbRadiusMul = () => (genes.has('resonance') ? 1.25 : 1);
  const orbDmgMul = () => (genes.has('resonance') ? 1.2 : 1);

  /** Магнитная элита притягивает душу; true - душа захвачена её полем */
  function eliteMagnetPull(o: XpOrb, dt: number): boolean {
    for (const e of enemies) {
      if (e.elite !== 'magnetic' || e.infected > 0) continue;
      const dd = Math.hypot(e.x - o.x, e.y - o.y);
      if (dd < 200) {
        o.vx += ((e.x - o.x) / Math.max(1, dd)) * 480 * dt;
        o.vy += ((e.y - o.y) / Math.max(1, dd)) * 480 * dt;
        if (dd < 16) { o.x = e.x; o.y = e.y; } // душа поглощена элитой
        return true;
      }
    }
    return false;
  }

  function loop(now: number) {
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const nowSec = now / 1000;

    // Метаморфоз: bullet-time замедляет весь мир на переходе масштаба
    if (metamorphT > 0) metamorphT -= rawDt;
    const timeScale = dying ? 0.18 : metamorphT > 0 ? METAMORPH.timeScale : 1;
    const dt = rawDt * timeScale; // игровое время: таймеры и физика мира

    // Камера: плавное слежение за игроком и твин зума текущей шкалы бытия (в момент смерти мягко приближается)
    const zoomTarget = SCALES[scaleIdx].zoom * (dying ? 1.18 : 1);
    camZoom += (zoomTarget - camZoom) * Math.min(1, rawDt * (dying ? 3.5 : 2.0));

    camX += (player.x - camX) * Math.min(1, rawDt * 5.0);
    camY += (player.y - camY) * Math.min(1, rawDt * 5.0);

    const halfViewW = viewHalfW();
    const halfViewH = viewHalfH();
    if (curWorldW > halfViewW * 2) {
      camX = Math.max(halfViewW, Math.min(curWorldW - halfViewW, camX));
    } else {
      camX = curWorldW / 2;
    }
    if (curWorldH > halfViewH * 2) {
      camY = Math.max(halfViewH, Math.min(curWorldH - halfViewH, camY));
    } else {
      camY = curWorldH / 2;
    }

    if (dying) {
      dyingT -= rawDt;
      prevCamX = camX;
      prevCamY = camY;
      sim.step(nowSec, dt, [], [], { x: -500, y: -500 }, -0.75, 0.90, SCALES[scaleIdx].id, 0, 0, () => {});
      if (dyingT <= 0) {
        finishRun(false);
      }
    } else if (started && !paused && !gameOver) {
      gameTime += dt;
      if (dailyRunActive) {
        if (!dailyRunDone && (gameTime >= dailyInfo.goalTimeSec || scaleMaxReached >= dailyInfo.goalScale)) {
          dailyRunDone = true;
          if (markDailyCompleted(dailyInfo.dayKey)) {
            addBiolabPoints(dailyInfo.bonusPoints);
            sfx.hybrid();
            showToast(t('daily_completed_toast', { pts: dailyInfo.bonusPoints }), 'success');
          }
          updateDailyHudPill();
        } else if ((frameN & 15) === 0) {
          updateDailyHudPill();
        }
      }
      liveAchCheckT += dt;
      if (liveAchCheckT >= 2.5) {
        liveAchCheckT = 0;
        grantAchievements(checkAchievements({
          time: gameTime,
          kills,
          nodesHeldMax,
          scaleMax: scaleMaxReached,
          damageDealt,
          codexCount: loadCodex().size,
          codexTotal: CODEX_ENTRIES.length,
          win: false,
        }));
      }

      if (!pacifistShown && gameTime >= 60 && spikesFired === 0) {
        pacifistShown = true;
        showToast('СКРЫТЫЙ ТИТУЛ «СИМБИОНТ МИРА»: 60с без агрессии шипов');
      }
      if (!titanSatedDone && trailOwn) {
        const titan = enemies.find((e) => e.titan && e.hp > 0);
        if (titan && Math.hypot(titan.x - player.x, titan.y - player.y) < 180) {
          titanTrailTime += dt;
          if (titanTrailTime >= 20) {
            titanSatedDone = true;
            orbs.push({ x: titan.x, y: titan.y, vx: 0, vy: 0, value: 15, color: DNA_COLORS.symbiont, dna: 'symbiont' });
            overlay.spawnPulse(titan.x, titan.y, DNA_COLORS.symbiont, 140);
            showToast('СЫТЫЙ ТИТАН: МУТАЦИЯ ПОГЛОТИЛА СЛЕД (+ДНК)');
          }
        }
      }
      if (!watcherSpawned && scaleIdx >= 4) {
        const owned = bioNodes.filter((n) => n.owner === 0).length;
        if (owned === 0) {
          scale5NoNodeTime += dt;
          if (scale5NoNodeTime >= 60) {
            watcherSpawned = true;
            spawnEnemy('boss');
            showToast('ОБРАЗЕЦ ОТКАЗЫВАЕТСЯ ОТ СИМБИОЗА: НАБЛЮДАТЕЛЬ');
          }
        } else {
          scale5NoNodeTime = 0;
        }
      }

      // Движение игрока: мышь как цель, WASD и мобильный джойстик как альтернатива
      // Gamepad controller polling
      const gp = gamepad.poll();
      if (gp.dashPressed) dashRequested = true;
      if (gp.callPressed) callRequested = true;
      if (gp.pausePressed && started && !gameOver && !dying && pendingUps === 0) {
        paused = !paused;
        if (paused) {
          sfx.stopBgm();
          showModal('intro');
        } else {
          sfx.startBgm();
          showModal(null);
        }
      }

      // Dash trigger & cooldown
      dashCd -= dt;
      if (dashT > 0) {
        dashT -= dt;
        player.iframe = Math.max(player.iframe, 0.1);
      }
      const joyDash = joystick.dashRequested();
      if ((dashRequested || joyDash) && dashCd <= 0) {
        dashRequested = false;
        if (joyDash) joystick.consumeDash();
        dashCd = Math.max(0.8, DASH.cd + dailyDashCdDelta);
        dashT = DASH.duration;
        player.iframe = Math.max(player.iframe, DASH.duration + 0.15);
        sfx.dash();
        gamepad.vibrate(120, 0.8, 0.4);
        overlay.spawnPulse(player.x, player.y, 0x66fcf1, 55);
        overlay.beginShake(0.08);
        sim.spawnPlayerSpores(toSimX(player.x), toSimY(player.y), 400);
      }
      dashRequested = false;

      let mx = 0;
      let my = 0;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      const jv = joystick.vector();
      if (jv.x !== 0 || jv.y !== 0) { mx += jv.x; my += jv.y; }
      if (Math.hypot(gp.moveX, gp.moveY) > 0.1) { mx += gp.moveX; my += gp.moveY; }
      if (mx === 0 && my === 0 && mouse.active) {
        const dx = mouse.x - player.x;
        const dy = mouse.y - player.y;
        const d = Math.hypot(dx, dy);
        if (d > 7) { mx = dx / d; my = dy / d; }
      }
      const mLen = Math.hypot(mx, my) || 1;
      if (Math.hypot(gp.aimX, gp.aimY) > 0.2) {
        playerDirX = gp.aimX;
        playerDirY = gp.aimY;
      } else if (mx !== 0 || my !== 0) {
        playerDirX = mx / mLen;
        playerDirY = my / mLen;
      }
      // Симбиоз со штаммом: свой след ускоряет, чужой растворяет хвост
      const dashMul = dashT > 0 ? DASH.speedMul : 1;
      const spdNow = moveSpeed
        * codexBonuses.moveSpeedMul
        * dashMul
        * (trailOwn ? STRAIN.ownSpeedMul : 1)
        * (unstableT > 0 && unstableKind === 0 ? 0.55 : 1);
      const prevPx = player.x;
      const prevPy = player.y;
      player.x = Math.max(16, Math.min(curWorldW - 16, player.x + (mx / mLen) * spdNow * dt));
      player.y = Math.max(16, Math.min(curWorldH - 16, player.y + (my / mLen) * spdNow * dt));
      const movedDist = Math.hypot(player.x - prevPx, player.y - prevPy);
      cystMoveDist += movedDist;
      if (movedDist > 0.35) idleTime = 0;
      else idleTime += dt;

      player.iframe = Math.max(0, player.iframe - dt);
      player.hp = Math.min(maxHp, player.hp + (regen + nodeRegenBonus + codexBonuses.regenAdd) * dt);

      // Экономика хвоста: движение сжигает энергию, неподвижность истощает форму.
      // Усилитель (-40% таяния), Нейросеть (2+ узла) и Вспышка митоза замедляют таяние и питают хвост.
      let ownedNodeCnt = 0;
      for (const n of bioNodes) if (n.owner === 1) ownedNodeCnt++;
      neuralLinkActive = false;
      if (ownedNodeCnt >= 2) {
        for (const n of bioNodes) {
          if (n.owner === 1 && Math.hypot(player.x - n.x, player.y - n.y) <= 380) {
            neuralLinkActive = true;
            break;
          }
        }
      }
      if (bloomBuffT > 0) bloomBuffT = Math.max(0, bloomBuffT - dt);
      if (resonanceTimer > 0) {
        resonanceTimer -= dt;
        if (resonanceTimer <= 0) {
          if (resonanceStreak >= 3) sfx.resDrop();
          resonanceStreak = 0;
          resonanceTimer = 0;
          resonanceMult = 1.0;
        }
      }
      updateResonanceHud();

      const isMoving = mx !== 0 || my !== 0;
      const isVoidEvent = waves.isVoidActive();
      const networkMeltMul = (neuralLinkActive ? 0.85 : 1) * (bloomBuffT > 0 ? 0.5 : 1);
      const unstableMeltMul = unstableT > 0 && unstableKind === 1 ? 2 : 1;
      const ampMeltMul = ampOwned ? 0.6 : 1;
      if (!isVoidEvent) {
        if (isMoving) {
          const melt = moveCost() * (trailEnemy ? STRAIN.enemyMeltMul : 1) * (cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul * ampMeltMul;
          tailLen = Math.max(TAIL.minLen, tailLen - melt * dt);
        } else {
          // Метаболический голод неподвижности: если стоять на месте, организм тратит биомассу хвоста
          const idleMelt = TAIL.idleCost * (trailEnemy ? STRAIN.enemyMeltMul : 1) * (cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul * ampMeltMul;
          tailLen = Math.max(TAIL.minLen, tailLen - idleMelt * dt);
        }
      }
      if (trailOwn && tailLen < maxTail()) {
        tailLen = Math.min(maxTail(), tailLen + STRAIN.ownTailRegen * dt);
      }
      if (neuralLinkActive && tailLen < maxTail()) {
        tailLen = Math.min(maxTail(), tailLen + 1.4 * dt);
      }
      if (bloomBuffT > 0 && tailLen < maxTail()) {
        tailLen = Math.min(maxTail(), tailLen + 2.8 * dt);
      }
      // Если хвост сжался до минимума и игрок стоит на месте без движения - голод грызёт здоровье
      if (tailLen <= TAIL.minLen + 0.1 && !isMoving && !isVoidEvent) {
        player.hp = Math.max(0, player.hp - 6 * dt);
        if (player.hp <= 0) {
          lastDamageCause = {
            kind: 'starvation',
            labelRu: 'Истощение хвоста (неподвижность без энергии)',
            labelEn: 'Tail starvation (idle with depleted tail)',
            amount: 6 * dt,
          };
          beginDeathSequence();
        }
      }
      // Траектория пишется с шагом, длина ограничена ёмкостью
      const lastPt = pathHistory[pathHistory.length - 1];
      if (!lastPt || Math.hypot(player.x - lastPt.x, player.y - lastPt.y) >= TAIL.segSpacing) {
        pathHistory.push({ x: player.x, y: player.y });
      }
      const cap = Math.ceil(maxTail()) + 2;
      while (pathHistory.length > cap) pathHistory.shift();

      // Кольцо Смерти: самопересечение траектории хвоста -> схлопывание полигона
      ringCd -= dt;
      detectRingClosure();

      // Голод: без сфер ДНК дольше 3 секунд кончик мигает, критика - оранжевая кромка
      sinceSoul += dt;
      if (curseHunger && sinceSoul > 3.0) {
        player.hp = Math.max(1, player.hp - 3 * dt);
      }
      tailMaxReached = Math.max(tailMaxReached, tailLen);
      const tailRatio = tailLen / maxTail();
      const newTailState: 'ok' | 'low' | 'crit' = tailRatio > 0.7 ? 'ok' : tailRatio > 0.4 ? 'low' : 'crit';
      if (newTailState !== tailState && newTailState === 'crit' && critFlashT <= 0) {
        tailwarnFlash();
        critFlashT = 4;
      }
      tailState = newTailState;
      critFlashT -= dt;

      // «Нестабильный геном» (Мутант): каждые 20 сек случайный дебаф на 5 сек
      unstableT -= dt;
      unstableRollT -= dt;
      if (genes.has('unstable') && unstableRollT <= 0) {
        unstableRollT = 20;
        unstableT = 5;
        unstableKind = Math.floor(Math.random() * 3);
        const en = getLocale() === 'en';
        showToast(unstableKind === 0
          ? `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: speed -45%' : 'ГЕНОМ ДРОЖИТ: скорость -45%'}`
          : unstableKind === 1
            ? `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: 2x tail melt' : 'ГЕНОМ ДРОЖИТ: хвост тает вдвое'}`
            : `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: slower attacks' : 'ГЕНОМ ДРОЖИТ: атака замедлена'}`);
      }
      // «Споры» (Паразит): хвост оставляет ядовитые лужи
      puddleT -= dt;
      if (genes.has('puddles') && (mx !== 0 || my !== 0) && puddleT <= 0) {
        puddleT = 0.45;
        const pts = visibleTail();
        const src = pts.length > 4 ? pts[Math.floor(pts.length / 2)] : player;
        pendingPuddles.push({ x: src.x, y: src.y });
      }

      if (gameTime >= nextBossAt) {
        nextBossAt += BOSS_EVERY;
        spawnEnemy('boss');
        showToast(
          `<svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg> ` +
          `${getLocale() === 'en' ? 'CYCLE WARDEN APPROACHING' : 'СТРАЖ ЦИКЛА ПРИБЛИЖАЕТСЯ'}`,
          'danger'
        );
        sfx.boss();
      }
      // Биомасса шкалы созрела: из глубин пробуждается Титан масштаба
      const bioGoal = SCALES[scaleIdx].biomassGoal;
      if (biomass >= bioGoal && !titanPending && !enemies.some((e) => e.titan) && metamorphT <= 0) {
        titanPending = true;
        spawnEnemy('boss');
        const titan = enemies[enemies.length - 1];
        titan.titan = true;
        titan.hp = titan.maxHp = Math.round(titan.maxHp * (1 + scaleIdx * 0.35));
        overlay.spawnPulse(titan.x, titan.y, 0xffffff, 150);
        const trS = trScale(SCALES[scaleIdx].id, SCALES[scaleIdx].name, SCALES[scaleIdx].sub);
        showToast(
          `<svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ` +
          `${getLocale() === 'en' ? `SCALE TITAN AWAKENED — ${trS.name}` : `ТИТАН МАСШТАБА ПРОБУДИЛСЯ — ${trS.name}`}`,
          'warn'
        );
        sfx.boss();
      }
      // Вражеский инкубатор (💜): плодит личинок каждые 20 секунд
      incubatorSpawnT -= dt;
      if (incubatorEnemy && incubatorSpawnT <= 0 && enemies.length < ENEMY_CAP) {
        incubatorSpawnT = 20;
        spawnEnemy('grub');
        spawnEnemy('grub');
      }
      // Элиты с мутациями: каждые 45 сек между боссами (Этап 4.3)
      eliteTimer -= dt;
      if (eliteTimer <= 0) {
        eliteTimer = ELITE.everySec;
        nextSpawnElite = true;
        showToast(`<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-mutagen"/></svg> ${getLocale() === 'en' ? 'MUTATION: elite approaching' : 'МУТАЦИЯ: элита приближается'}`);
      }
      // Спавн-таблица новых организмов вытесняет старый рол по мере времени
      spawnT -= dt;
      waves.update(dt, gameTime);
      if (spawnT <= 0 && waves.canSpawn() && enemies.length < ENEMY_CAP) {
        spawnT = Math.max(0.26, 0.75 - (gameTime / 60) * 0.12);
        const batch = 1 + Math.floor(gameTime / 75);
        for (let i2 = 0; i2 < batch; i2++) {
          const pool: { type: EnemyType; weight: number }[] = [{ type: 'grub', weight: 0.45 }];
          if (gameTime > 40) pool.push({ type: 'runner', weight: 0.30 });
          if (gameTime > 90) pool.push({ type: 'brute', weight: 0.15 });
          for (const row of SPAWN_TABLE) {
            if (gameTime >= row.since) pool.push({ type: row.type, weight: row.chance });
          }
          const totalW = pool.reduce((s, e) => s + e.weight, 0);
          let r = (dailyRunActive ? dailyRng() : Math.random()) * totalW;
          let type: EnemyType = 'grub';
          for (const entry of pool) {
            r -= entry.weight;
            if (r <= 0) { type = entry.type; break; }
          }
          spawnEnemy(type);
        }
      }

      buildHash();

      // Аномалии чашки Петри: периодические биологические события и их эффекты
      anomalyCd -= dt;
      if (anomalyCd <= 0 && anomalies.length < 3 && metamorphT <= 0) {
        spawnAnomaly();
        anomalyCd = 46 + (dailyRunActive ? dailyRng() : Math.random()) * 18;
      }
      for (let ai = anomalies.length - 1; ai >= 0; ai--) {
        const a = anomalies[ai];
        if (a.warnT > 0) {
          a.warnT -= dt;
          continue;
        }
        a.life -= dt;
        if (a.life <= 0) {
          anomalies.splice(ai, 1);
          continue;
        }
        if (a.kind === 'acid') {
          if (Math.hypot(player.x - a.x, player.y - a.y) < a.r) {
            tailLen = Math.max(TAIL.minLen, tailLen - 12 * dt);
            if (tailLen <= TAIL.minLen + 0.1) {
              player.hp = Math.max(0, player.hp - 6 * dt);
              if (player.hp <= 0) {
                lastDamageCause = {
                  kind: 'acid',
                  labelRu: 'Кислотный прилив (хвост растворён)',
                  labelEn: 'Acid Tide (tail dissolved)',
                  amount: 6 * dt,
                };
                beginDeathSequence();
              }
            }
          }
          for (const e of nearby(a.x, a.y, a.r + 16)) {
            if (e.hp > 0 && Math.hypot(e.x - a.x, e.y - a.y) < a.r) {
              e.hp -= 32 * effDmg() * dt;
              e.flash = Math.max(e.flash, 0.04);
            }
          }
        } else if (a.kind === 'cocoon') {
          a.spawnCd -= dt;
          if (a.spawnCd <= 0 && enemies.length < ENEMY_CAP) {
            a.spawnCd = 3.4;
            const spawnT1: EnemyType = Math.random() < 0.35 ? 'runner' : 'grub';
            spawnEnemy(spawnT1, undefined, a.x + (Math.random() - 0.5) * 44, a.y + (Math.random() - 0.5) * 44);
            spawnEnemy('grub', undefined, a.x + (Math.random() - 0.5) * 44, a.y + (Math.random() - 0.5) * 44);
            overlay.spawnPulse(a.x, a.y, 0xa3e635, a.r + 18);
          }
        }
      }

      // Набеги монстров на оставленные без охраны био-башни
      nodeRaidScanT -= dt;
      if (nodeRaidScanT <= 0) {
        nodeRaidScanT = 1.6;
        const targetRaiders = Math.max(1, Math.round(2 * dailyEnemyNodeAggroMul));
        const unattendedLimit = Math.max(5, 11 / dailyEnemyNodeAggroMul);
        for (const n of bioNodes) {
          if (n.owner !== 1 && n.capture <= 0.25) {
            nodeUnattendedT.set(n.id, 0);
            continue;
          }
          const pDist = Math.hypot(player.x - n.x, player.y - n.y);
          if (pDist <= n.radius + 95) {
            nodeUnattendedT.set(n.id, 0);
            continue;
          }
          let curRaiders = 0;
          for (const e of enemies) {
            if (e.hp > 0 && e.infected <= 0 && e.raidNodeId === n.id) curRaiders++;
          }
          if (curRaiders < targetRaiders) {
            for (const e of enemies) {
              if (curRaiders >= targetRaiders) break;
              if (
                e.hp > 0 && e.infected <= 0 && e.raidNodeId === undefined &&
                e.type !== 'boss' && !e.titan && e.type !== 'pulsar' && e.type !== 'colony' &&
                Math.hypot(e.x - n.x, e.y - n.y) < 460
              ) {
                e.raidNodeId = n.id;
                curRaiders++;
              }
            }
          }
          if (curRaiders === 0) {
            const acc = (nodeUnattendedT.get(n.id) ?? 0) + 1.6;
            nodeUnattendedT.set(n.id, acc);
            if (acc >= unattendedLimit && enemies.length < ENEMY_CAP - 2) {
              nodeUnattendedT.set(n.id, 0);
              for (let rIdx = 0; rIdx < 2; rIdx++) {
                const ang = (Math.random() * Math.PI * 2);
                const sx = Math.max(24, Math.min(curWorldW - 24, n.x + Math.cos(ang) * (n.radius + 115)));
                const sy = Math.max(24, Math.min(curWorldH - 24, n.y + Math.sin(ang) * (n.radius + 115)));
                spawnEnemy(rIdx === 0 ? 'runner' : 'grub', undefined, sx, sy);
                const spawned = enemies[enemies.length - 1];
                if (spawned) spawned.raidNodeId = n.id;
              }
            }
          } else {
            nodeUnattendedT.set(n.id, 0);
          }
        }
      }

      // Враги: погоня + рейды на башни + расталкивание + контактный урон
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
          killEnemy(e, i);
          continue;
        }
        const def = ENEMIES[e.type];
        let eSpeed = def.speed * waves.speedMul() * SCALES[scaleIdx].enemySpeedMul * dailyEnemySpeedMul;
        for (const n of bioNodes) {
          if (n.owner === -1 && n.kind === 'gen' && Math.hypot(e.x - n.x, e.y - n.y) < 220) {
            eSpeed *= 1.25;
            break;
          }
        }
        // Ярость элиты: +100% скорость при низком HP (Этап 4.3)
        if (e.elite === 'enraged' && e.hp < e.maxHp * 0.3) eSpeed *= 2;
        // Фаза 2 Титана/Босса: ярость и растрескивание панциря при HP < 40%
        if ((e.type === 'boss' || e.titan) && e.infected <= 0) {
          if (e.hp < e.maxHp * 0.4 && !e.enragedPhase) {
            e.enragedPhase = true;
            overlay.spawnPulse(e.x, e.y, 0xff1744, e.radius * 4.5);
            overlay.beginShake(0.28);
            sfx.boss();
            const en = getLocale() === 'en';
            showToast(e.titan
              ? (en ? 'TITAN ENRAGED! CARAPACE FRACTURING!' : 'ТИТАН ВПАЛ В ЯРОСТЬ! РАСТРЕСКИВАНИЕ ПАНЦИРЯ!')
              : (en ? 'CYCLE WARDEN ENRAGED!' : 'СТРАЖ ЦИКЛА ВПАЛ В ЯРОСТЬ!'));
          }
          if (e.enragedPhase) eSpeed *= 1.4;
        }

        // Цель: заражённые союзники охотятся на врагов, а рейдеры идут отвоёвывать башню
        let tx = player.x;
        let ty = player.y;
        let keepDist = 0; // >0: держать дистанцию (плеватель/целитель/зеркало)
        if (e.infected > 0) {
          e.raidNodeId = undefined;
          let bestD = 1e9;
          for (const o of enemies) {
            if (o === e || o.infected > 0) continue;
            const dd = Math.hypot(o.x - e.x, o.y - e.y);
            if (dd < bestD) { bestD = dd; tx = o.x; ty = o.y; }
          }
          if (bestD > 1e8) { tx = player.x; ty = player.y; }
        } else if (e.raidNodeId !== undefined) {
          const rn = bioNodes.find((n) => n.id === e.raidNodeId);
          if (!rn || rn.owner === -1 || e.flash > 0 || Math.hypot(player.x - e.x, player.y - e.y) < 95) {
            e.raidNodeId = undefined;
          } else {
            tx = rn.x;
            ty = rn.y;
            if (Math.hypot(tx - e.x, ty - e.y) < rn.radius * 0.45) {
              eSpeed *= 0.25;
            }
          }
        }
        if (e.infected <= 0 && e.raidNodeId === undefined) {
          if (e.type === 'spitter') keepDist = 190;
          else if (e.type === 'healer') keepDist = 260;
          else if (e.type === 'mirror') keepDist = 150;
        }

        const dx = tx - e.x;
        const dy = ty - e.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const steer = Math.min(1, dt * 4);
        if (e.type !== 'pulsar') {
          // Пульсар стоит на месте и контролирует зону
          const dirSign = keepDist > 0 && d < keepDist ? -1 : 1;
          let desiredVx = (dx / d) * eSpeed * dirSign;
          let desiredVy = (dy / d) * eSpeed * dirSign;

          // Умное отступление: если враг пытается держать дистанцию, но прижат к кромке чашки Петри,
          // он не бьётся головой об стенку наружу, а смещается по касательной вдоль мембраны
          if (keepDist > 0 && d < keepDist) {
            const wallMargin = 85;
            if (e.x < wallMargin && desiredVx < 0) {
              desiredVx = 0;
              desiredVy = (dy >= 0 ? 1 : -1) * eSpeed;
            } else if (e.x > curWorldW - wallMargin && desiredVx > 0) {
              desiredVx = 0;
              desiredVy = (dy >= 0 ? 1 : -1) * eSpeed;
            }
            if (e.y < wallMargin && desiredVy < 0) {
              desiredVy = 0;
              desiredVx = (dx >= 0 ? 1 : -1) * eSpeed;
            } else if (e.y > curWorldH - wallMargin && desiredVy > 0) {
              desiredVy = 0;
              desiredVx = (dx >= 0 ? 1 : -1) * eSpeed;
            }
          }

          e.vx += (desiredVx - e.vx) * steer;
          e.vy += (desiredVy - e.vy) * steer;
        } else {
          e.vx *= Math.max(0, 1 - dt * 8);
          e.vy *= Math.max(0, 1 - dt * 8);
        }

        // Затухание импульса отброса по ОБЕИМ осям (X и Y)
        e.kbx *= Math.max(0, 1 - dt * 6);
        e.kby *= Math.max(0, 1 - dt * 6);

        // Мягкое поле отталкивания био-мембраны по периметру чашки Петри (36px зона)
        const bMargin = 36;
        if (e.x < bMargin) {
          const p = (bMargin - e.x) / bMargin;
          e.vx += p * 340 * dt;
        } else if (e.x > curWorldW - bMargin) {
          const p = (e.x - (curWorldW - bMargin)) / bMargin;
          e.vx -= p * 340 * dt;
        }
        if (e.y < bMargin) {
          const p = (bMargin - e.y) / bMargin;
          e.vy += p * 340 * dt;
        } else if (e.y > curWorldH - bMargin) {
          const p = (e.y - (curWorldH - bMargin)) / bMargin;
          e.vy -= p * 340 * dt;
        }

        e.x += (e.vx + e.kbx) * dt;
        e.y += (e.vy + e.kby) * dt;

        // Физика упругого отскока от мембраны чашки Петри при сильном ударе/отбросе
        const pad = Math.max(8, e.radius);
        if (e.x <= pad) {
          e.x = pad;
          if (e.vx < 0) {
            if (Math.abs(e.vx) + Math.abs(e.kbx) > 60) {
              overlay.spawnPulse(e.x, e.y, 0x66fcf1, e.radius + 12);
              sfx.membraneBounce();
            }
            e.vx = Math.abs(e.vx) * 0.45;
            e.kbx = 0;
          }
        } else if (e.x >= curWorldW - pad) {
          e.x = curWorldW - pad;
          if (e.vx > 0) {
            if (Math.abs(e.vx) + Math.abs(e.kbx) > 60) {
              overlay.spawnPulse(e.x, e.y, 0x66fcf1, e.radius + 12);
              sfx.membraneBounce();
            }
            e.vx = -Math.abs(e.vx) * 0.45;
            e.kbx = 0;
          }
        }
        if (e.y <= pad) {
          e.y = pad;
          if (e.vy < 0) {
            if (Math.abs(e.vy) + Math.abs(e.kby) > 60) {
              overlay.spawnPulse(e.x, e.y, 0x66fcf1, e.radius + 12);
              sfx.membraneBounce();
            }
            e.vy = Math.abs(e.vy) * 0.45;
            e.kby = 0;
          }
        } else if (e.y >= curWorldH - pad) {
          e.y = curWorldH - pad;
          if (e.vy > 0) {
            if (Math.abs(e.vy) + Math.abs(e.kby) > 60) {
              overlay.spawnPulse(e.x, e.y, 0x66fcf1, e.radius + 12);
              sfx.membraneBounce();
            }
            e.vy = -Math.abs(e.vy) * 0.45;
            e.kby = 0;
          }
        }

        // Аварийный возврат, если сущность каким-либо образом оказалась за пределами карты
        if (e.x < 0 || e.x > curWorldW || e.y < 0 || e.y > curWorldH) {
          const toCenterX = (curWorldW / 2) - e.x;
          const toCenterY = (curWorldH / 2) - e.y;
          const cDist = Math.hypot(toCenterX, toCenterY) || 1;
          e.vx = (toCenterX / cDist) * Math.max(eSpeed, 180);
          e.vy = (toCenterY / cDist) * Math.max(eSpeed, 180);
          e.kbx = 0;
          e.kby = 0;
          e.x = Math.max(pad, Math.min(curWorldW - pad, e.x));
          e.y = Math.max(pad, Math.min(curWorldH - pad, e.y));
        }

        // Особые навыки организмов
        e.skillCd -= dt;
        if (e.skillCd <= 0 && e.infected <= 0) {
          if (e.type === 'spitter' || e.type === 'mirror') {
            // Плеватель/зеркало: ядовитый снаряд в игрока
            e.skillCd = e.type === 'mirror' ? 1.6 : 2.2;
            const pd = Math.max(1, Math.hypot(player.x - e.x, player.y - e.y));
            const pDmg = Math.round((e.type === 'mirror' ? 12 : 8) * (1 + scaleIdx * 0.75));
            eprojs.push({
              x: e.x, y: e.y,
              vx: ((player.x - e.x) / pd) * (150 + scaleIdx * 15),
              vy: ((player.y - e.y) / pd) * (150 + scaleIdx * 15),
              dmg: pDmg, life: 2.8,
              sourceType: e.type, titan: e.titan, elite: e.elite,
            });
          } else if (e.type === 'healer') {
            // Целитель: лечит ближний штамм - приоритетная цель
            e.skillCd = 0.6;
            e.flash = 0.15;
            for (const o of enemies) {
              if (o === e || o.infected > 0 || o.hp <= 0) continue;
              if (Math.hypot(o.x - e.x, o.y - e.y) < 90) o.hp = Math.min(o.maxHp, o.hp + 7);
            }
          } else if (e.type === 'pulsar') {
            // Пульсар: взрывное кольцо с отбросом
            e.skillCd = 5;
            const radius = 130;
            overlay.spawnPulse(e.x, e.y, ENEMIES.pulsar.color, radius + 20);
            sfx.nova();
            for (const o of enemies) { if (o === e) continue; o.tailCd = Math.max(o.tailCd, 0); }
            const pd = Math.hypot(player.x - e.x, player.y - e.y);
            if (pd < radius + PLAYER.radius && player.iframe <= 0) {
              applyDamageToPlayer(def.dmg, enemyCauseLabel('pulsar', false, e.elite, 'импульс', 'shockwave'));
              const kx = (player.x - e.x) / Math.max(1, pd);
              const ky = (player.y - e.y) / Math.max(1, pd);
              player.x = Math.max(16, Math.min(curWorldW - 16, player.x + kx * 40));
              player.y = Math.max(16, Math.min(curWorldH - 16, player.y + ky * 40));
            }
          } else if (e.type === 'colony') {
            // Матка: плодит выводок (максимум 6 живых)
            e.skillCd = 6;
            let broodAlive = 0;
            for (const o of enemies) if (o.colonyId === e.id) broodAlive++;
            if (broodAlive < 6) {
              for (let k = 0; k < 2; k++) {
                spawnEnemy('brood', undefined, e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 40);
                const b = enemies[enemies.length - 1];
                if (b.type === 'brood') b.colonyId = e.id;
              }
            }
          } else if (e.type === 'boss') {
            // Босс / Титан: веерный залп шипов или радиальный шквал в фазе ярости (< 40% HP)
            const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
            const pDmg = Math.round((e.titan ? 14 : 11) * (1 + scaleIdx * 0.7));
            const pSpd = 175 + scaleIdx * 18;
            if (e.enragedPhase) {
              e.skillCd = 3.0;
              overlay.spawnPulse(e.x, e.y, 0xff1744, e.radius + 45);
              for (let k = 0; k < 8; k++) {
                const ang = baseAng + (k * Math.PI * 2) / 8;
                eprojs.push({
                  x: e.x, y: e.y,
                  vx: Math.cos(ang) * pSpd,
                  vy: Math.sin(ang) * pSpd,
                  dmg: pDmg, life: 3.0,
                  sourceType: e.type, titan: e.titan, elite: e.elite,
                });
              }
            } else {
              e.skillCd = 4.2;
              overlay.spawnPulse(e.x, e.y, 0xff2a85, e.radius + 20);
              for (const spread of [-0.24, 0, 0.24]) {
                const ang = baseAng + spread;
                eprojs.push({
                  x: e.x, y: e.y,
                  vx: Math.cos(ang) * pSpd,
                  vy: Math.sin(ang) * pSpd,
                  dmg: pDmg, life: 2.8,
                  sourceType: e.type, titan: e.titan, elite: e.elite,
                });
              }
            }
          }
        }
        // Заражённые союзники тают со временем
        if (e.infected > 0) {
          e.infected -= dt;
          if (e.infected <= 0) { e.hp = 0; e.infected = -1; }
        }
        // Споровое заражение (Споровый Реактор): тик урона зелёными спорами
        if (e.sporeInf > 0) {
          e.sporeInf -= dt;
          e.hp -= 4 * effDmg() * dt;
          e.flash = Math.max(e.flash, 0.04);
        }

        // Хвостик врага следует за телом: пишем точки по дистанции, не каждый кадр
        const lastE = e.tail[e.tail.length - 1];
        if (!lastE || Math.hypot(e.x - lastE.x, e.y - lastE.y) >= 2.5) {
          e.tail.push({ x: e.x, y: e.y });
        }
        while (e.tail.length > e.tailCap) e.tail.shift();

        e.flash = Math.max(0, e.flash - dt);
        e.atkCd -= dt;
        e.orbCd -= dt;
        e.tailCd -= dt;

        const cellArr = hash.get(Math.floor(e.x / CELL) * 1024 + Math.floor(e.y / CELL));
        if (cellArr && cellArr.length > 1) {
          for (let j = 1; j <= 3; j++) {
            const o = cellArr[(cellArr.indexOf(e) + j) % cellArr.length];
            if (o === e) continue;
            const ox = e.x - o.x;
            const oy = e.y - o.y;
            const od = Math.hypot(ox, oy);
            const minD = (e.radius + o.radius) * 0.75;
            if (od > 0.01 && od < minD) {
              const push = ((minD - od) / minD) * 26 * dt;
              e.x += (ox / od) * push;
              e.y += (oy / od) * push;
            }
          }
          e.x = Math.max(pad, Math.min(curWorldW - pad, e.x));
          e.y = Math.max(pad, Math.min(curWorldH - pad, e.y));
        }

        const touchD = Math.hypot(player.x - e.x, player.y - e.y);
        if (e.infected <= 0 && touchD < e.radius + playerRadius() && e.atkCd <= 0 && player.iframe <= 0) {
          // «Броня чешуёй» (Змея): хвост гасит до 50% урона, но не более 14 единиц
          const maxReduction = Math.min(Math.round(e.dmg * 0.5), Math.floor(tailLen / 20));
          const incoming = genes.has('scales') ? Math.max(2, e.dmg - maxReduction) : e.dmg;
          applyDamageToPlayer(incoming, enemyCauseLabel(e.type, e.titan, e.elite));
          e.atkCd = 0.8;
        }
        // Заражённый союзник врезается во врагов
        if (e.infected > 0 && e.atkCd <= 0) {
          for (const o of enemies) {
            if (o === e || o.infected > 0 || o.hp <= 0) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < e.radius + o.radius) {
              o.hp -= def.dmg * 2;
              o.flash = 0.1;
              e.atkCd = 0.5;
              break;
            }
          }
        }

        if (e.hp <= 0) killEnemy(e, i);
      }

      // Хвост-хлыст: враги на траектории хвоста горят; чем длиннее хвост, тем больнее
      tailTick -= dt;
      whipTipCd -= dt;
      if (tailTick <= 0) {
        tailTick = TAIL.tick;
        const dmg = tailDps() * TAIL.tick * effDmg();
        const pts = visibleTail();
        if (pts.length > 0) {
          // Bounding Box хвоста: гарантирует попадания по всей длине любого хвоста
          let minX = player.x, maxX = player.x, minY = player.y, maxY = player.y;
          for (let i = 0; i < pts.length; i++) {
            const pt = pts[i];
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }
          const pad = TAIL.hitRadius + 32;
          const c0x = Math.floor((minX - pad) / CELL);
          const c1x = Math.floor((maxX + pad) / CELL);
          const c0y = Math.floor((minY - pad) / CELL);
          const c1y = Math.floor((maxY + pad) / CELL);

          defaultNearbyBuf.length = 0;
          for (let cx = c0x; cx <= c1x; cx++) {
            for (let cy = c0y; cy <= c1y; cy++) {
              const arr = hash.get(cx * 1024 + cy);
              if (arr) {
                for (let k = 0; k < arr.length; k++) defaultNearbyBuf.push(arr[k]);
              }
            }
          }

          for (let k = 0; k < defaultNearbyBuf.length; k++) {
            const e = defaultNearbyBuf[k];
            if (e.tailCd > 0 || e.hp <= 0) continue;
            const hitDist = TAIL.hitRadius + e.radius * 0.4;
            const hitDistSq = hitDist * hitDist;
            for (let i = pts.length - 1; i >= 0; i -= 2) {
              const pt = pts[i];
              const dx = e.x - pt.x;
              const dy = e.y - pt.y;
              if (dx * dx + dy * dy < hitDistSq) {
                const inDmg = dmg * enemyDmgBonus(e);
                e.hp -= inDmg;
                e.flash = 0.06;
                e.tailCd = TAIL.cd;
                overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x66fcf1);
                damageDealt += inDmg;
                dmgTail += inDmg;
                // «Отражение» элиты: часть урона возвращается бойцу вблизи
                if (e.elite === 'mirrored' && Math.hypot(e.x - player.x, e.y - player.y) < 200 && player.iframe <= 0) {
                  applyDamageToPlayer(inDmg * 0.15, enemyCauseLabel(e.type, e.titan, e.elite, 'отражение урона', 'damage reflect'));
                }
                // «Поглощение» (Вермис) и «Живой Инкубатор» (Уроборос-Паразит):
                // тело жертвы прирастает сегментами, гибрид растёт втрое сильнее
                if (e.hp <= 0 && (genes.has('absorb') || hybridsTaken.has('ouroboros'))) {
                  const gain = e.radius * (hybridsTaken.has('ouroboros') ? 2.4 : 0.8) * codexBonuses.absorbMul;
                  tailLen = Math.min(maxTail(), tailLen + gain);
                }
                break;
              }
            }
          }
          // Хвост также задевает Гнёзда спор на арене
          for (let i = pts.length - 1; i >= 0; i -= 4) {
            if (hitCocoonsInArea(pts[i].x, pts[i].y, TAIL.hitRadius, dmg, 0x66fcf1)) break;
          }
        }
        // «Змея-хлыст» (Змея): кончик бьёт второй точкой с отдельной перезарядкой
        if (genes.has('whip2') && whipTipCd <= 0 && pts.length > 3) {
          const tip = pts[0];
          const tipDmg = dmg * 0.6;
          for (const e of nearby(tip.x, tip.y, 60)) {
            if (e.hp <= 0) continue;
            if (Math.hypot(e.x - tip.x, e.y - tip.y) < TAIL.hitRadius + e.radius * 0.4) {
              const inDmg = tipDmg * enemyDmgBonus(e);
              e.hp -= inDmg;
              e.flash = 0.06;
              whipTipCd = TAIL.cd;
              overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x9df5ff);
              damageDealt += inDmg;
              if (e.hp <= 0 && (genes.has('absorb') || hybridsTaken.has('ouroboros'))) {
                const gain = e.radius * (hybridsTaken.has('ouroboros') ? 2.4 : 0.8) * codexBonuses.absorbMul;
                tailLen = Math.min(maxTail(), tailLen + gain);
              }
              break;
            }
          }
        }
      }

      // Оружие: шипы
      spikesCd -= dt;
      if (wlvl.spikes > 0 && spikesCd <= 0 && enemies.length > 0) {
        spikesFired++;
        const safeSpikesIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.spikes - 1));
        spikesCd = SPIKES.cd[safeSpikesIdx] / effAtkSpd();
        const count = SPIKES.count[safeSpikesIdx];
        const dmg = SPIKES.dmg[safeSpikesIdx] * effDmg();
        sfx.shoot();
        // Поиск до 3 ближайших целей за 1 линейный проход без аллокаций
        const maxTargets = Math.min(count, 3);
        const closestTargets: Enemy[] = [];
        const closestD2: number[] = [];
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.hp <= 0) continue;
          const dx = e.x - player.x;
          const dy = e.y - player.y;
          const d2 = dx * dx + dy * dy;
          if (closestTargets.length < maxTargets) {
            closestTargets.push(e);
            closestD2.push(d2);
          } else {
            let maxIdx = 0;
            let maxVal = closestD2[0];
            for (let k = 1; k < closestD2.length; k++) {
              if (closestD2[k] > maxVal) { maxVal = closestD2[k]; maxIdx = k; }
            }
            if (d2 < maxVal) {
              closestTargets[maxIdx] = e;
              closestD2[maxIdx] = d2;
            }
          }
        }
        for (let i = 0; i < count; i++) {
          const target = closestTargets[i % Math.max(1, closestTargets.length)];
          const spread = count > 1 ? (i - (count - 1) / 2) * 0.12 : 0;
          let ang: number;
          if (target) ang = Math.atan2(target.y - player.y, target.x - player.x) + spread;
          else ang = (i / count) * Math.PI * 2;
          projs.push({
            x: player.x, y: player.y,
            vx: Math.cos(ang) * PROJ_SPEED,
            vy: Math.sin(ang) * PROJ_SPEED,
            life: PROJ_LIFE,
            dmg,
            bounces: genes.has('chain') ? 4 : 0,
          });
        }
      }

      // Снаряды: полёт + попадания (+ «Цепная реакция» и броня элит)
      for (let i = projs.length - 1; i >= 0; i--) {
        const p = projs[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        let hit = false;
        for (const e of nearby(p.x, p.y, PROJ_RADIUS + 24)) {
          if (Math.hypot(p.x - e.x, p.y - e.y) < PROJ_RADIUS + e.radius) {
            const inDmg = p.dmg * (e.elite === 'armored' ? 0.4 : 1) * enemyDmgBonus(e);
            e.hp -= inDmg;
            e.flash = 0.1;
            sfx.hit();
            overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0xffffff);
            damageDealt += inDmg;
            hit = true;
            // «Цепная реакция» (Мутант): снаряд отскакивает к ближайшему врагу
            if (p.bounces > 0) {
              let best: Enemy | null = null;
              let bestD = 220;
              for (const o of enemies) {
                if (o === e || o.hp <= 0) continue;
                const dd = Math.hypot(o.x - e.x, o.y - e.y);
                if (dd < bestD) { bestD = dd; best = o; }
              }
              if (best) {
                p.bounces--;
                const nd = Math.max(1, bestD);
                p.vx = ((best.x - e.x) / nd) * PROJ_SPEED;
                p.vy = ((best.y - e.y) / nd) * PROJ_SPEED;
                p.life = PROJ_LIFE;
                p.x = e.x;
                p.y = e.y;
                hit = false; // снаряд продолжает полёт
              }
            }
            break;
          }
        }
        if (!hit && hitCocoonsInArea(p.x, p.y, PROJ_RADIUS, p.dmg, 0xffffff)) {
          sfx.hit();
          hit = true;
        }
        if (hit || p.life <= 0) projs.splice(i, 1);
      }

      // Яд врагов-плевателей: полёт, попадание в игрока;
      // «Грави-Хлыст» (Фазовый Змей): хвост перехватывает снаряды и швыряет их во врагов
      for (let i = eprojs.length - 1; i >= 0; i--) {
        const p = eprojs[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (hybridsTaken.has('phase_serpent')) {
          const tailPts = visibleTail();
          let nearTail = false;
          for (let k = 0; k < tailPts.length; k += 3) {
            if (Math.hypot(p.x - tailPts[k].x, p.y - tailPts[k].y) < 130) { nearTail = true; break; }
          }
          if (nearTail) {
            const prey = nearby(p.x, p.y, 170);
            let best: Enemy | null = null;
            let bestD = 170;
            for (const o of prey) {
              const dd = Math.hypot(o.x - p.x, o.y - p.y);
              if (dd < bestD) { bestD = dd; best = o; }
            }
            if (best) {
              const spd = Math.hypot(p.vx, p.vy) * 1.25 + 40;
              p.vx = ((best.x - p.x) / Math.max(1, bestD)) * spd;
              p.vy = ((best.y - p.y) / Math.max(1, bestD)) * spd;
              p.life = Math.max(p.life, 1.2);
              // Снаряд-перехватчик бьёт врага в полёте
              if (bestD < best.radius + 8) {
                best.hp -= 26 * effDmg();
                best.flash = 0.1;
                overlay.pushDamage(best.x, best.y - best.radius - 6, 26 * effDmg(), 0x9db4ff);
                damageDealt += 26 * effDmg();
                eprojs.splice(i, 1);
                continue;
              }
            }
          }
        }
        if (Math.hypot(p.x - player.x, p.y - player.y) < 6 + PLAYER.radius && player.iframe <= 0) {
          applyDamageToPlayer(p.dmg, enemyCauseLabel(p.sourceType, p.titan, p.elite, 'снаряд', 'projectile'));
          p.life = 0;
        }
        if (p.life <= 0 || p.x < 0 || p.x > curWorldW || p.y < 0 || p.y > curWorldH) {
          if (p.x < 0 || p.x > curWorldW || p.y < 0 || p.y > curWorldH) {
            overlay.spawnPulse(Math.max(4, Math.min(curWorldW - 4, p.x)), Math.max(4, Math.min(curWorldH - 4, p.y)), 0xff3b5c, 14);
          }
          eprojs.splice(i, 1);
        }
      }

      // Молния-орбиты (+ Резонанс: шире и больнее)
      if (wlvl.orbs > 0) {
        orbAngle += ORBS.speed * dt;
        const safeOrbsIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.orbs - 1));
        const count = ORBS.count[safeOrbsIdx];
        const dmg = ORBS.dmg[safeOrbsIdx] * effDmg() * orbDmgMul() * codexBonuses.orbsDmgMul;
        const orbR = ORBS.radius[safeOrbsIdx] * orbRadiusMul();
        for (let k = 0; k < count; k++) {
          const ang = orbAngle + (k * Math.PI * 2) / count;
          const ox = player.x + Math.cos(ang) * orbR;
          const oy = player.y + Math.sin(ang) * orbR;
          for (const e of nearby(ox, oy, 24)) {
            if (e.orbCd > 0) continue;
            if (Math.hypot(ox - e.x, oy - e.y) < 12 + e.radius) {
              const inDmg = dmg * enemyDmgBonus(e);
              e.hp -= inDmg;
              e.flash = 0.1;
              e.orbCd = ORBS.orbCd;
              overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x9df5ff);
              damageDealt += inDmg;
            }
          }
        }
        // Тесла-Сеть (Ионный Колосс): дуги от сфер орбит к врагам рядом
        if (hybridsTaken.has('ion_colossus')) {
          for (let k = 0; k < count; k++) {
            const ang = orbAngle + (k * Math.PI * 2) / count;
            const ox = player.x + Math.cos(ang) * orbR;
            const oy = player.y + Math.sin(ang) * orbR;
            for (const e of nearby(ox, oy, 150)) {
              const dd = Math.hypot(e.x - ox, e.y - oy);
              if (dd < 150 && e.orbCd <= 0) {
                frameArcs.push({ x1: ox, y1: oy, x2: e.x, y2: e.y, color: 0x9df5ff });
                e.hp -= dmg * 0.9;
                e.flash = 0.08;
                e.orbCd = ORBS.orbCd + 0.15;
                overlay.pushDamage(e.x, e.y - e.radius - 6, dmg * 0.9, 0x9df5ff);
                damageDealt += dmg * 0.9;
                sfx.zap();
                break; // одна дуга на сферу за кадр
              }
            }
          }
        }
      }

      // Нова-импульс (+ «Суперзаряд» Мутанта: дольше кулдаун, x4 урон, x2 радиус)
      novaCd -= dt;
      toxinFlash = Math.max(0, toxinFlash - dt);
      if (wlvl.nova > 0 && novaCd <= 0) {
        const safeNovaIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.nova - 1));
        const scMul = genes.has('supercharge') ? 4 : 1;
        novaCd = (NOVA.cd[safeNovaIdx] * biolabNovaCdMul * (genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd();
        const radius = NOVA.radius[safeNovaIdx] * (genes.has('supercharge') ? 2 : 1) * codexBonuses.novaRadiusMul;
        const dmg = NOVA.dmg[safeNovaIdx] * effDmg() * scMul * codexBonuses.explosiveDmgMul;
        sfx.nova();
        for (const e of nearby(player.x, player.y, radius)) {
          const d = Math.hypot(player.x - e.x, player.y - e.y);
          if (d < radius + ENEMIES[e.type].radius) {
            const inDmg = dmg * (e.elite === 'armored' ? 0.4 : 1) * enemyDmgBonus(e);
            e.hp -= inDmg;
            e.flash = 0.12;
            const push = 200;
            e.kbx += ((e.x - player.x) / Math.max(1, d)) * push;
            e.kby += ((e.y - player.y) / Math.max(1, d)) * push;
            overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0xff7b93);
            damageDealt += inDmg;
            // Чумная Сверхновая (Споровый Реактор): нова заражает спорами
            if (hybridsTaken.has('spore_reactor') && e.sporeInf <= 0) e.sporeInf = 3;
          }
        }
        hitCocoonsInArea(player.x, player.y, radius, dmg, 0xff7b93);
        overlay.spawnPulse(player.x, player.y, 0xff7b93, radius + 14);
        overlay.beginShake(0.22);
        toxinFlash = 0.5;
      }

      // Токсин-аура: тик урона вокруг игрока
      if (wlvl.aura > 0) {
        auraTick -= dt;
        if (auraTick <= 0) {
          auraTick = AURA.tick;
          const safeAuraIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.aura - 1));
          const radius = AURA.radius[safeAuraIdx];
          const dmg = AURA.dps[safeAuraIdx] * AURA.tick * effDmg();
          for (const e of nearby(player.x, player.y, radius + 24)) {
            if (Math.hypot(player.x - e.x, player.y - e.y) < radius + ENEMIES[e.type].radius) {
              e.hp -= dmg;
              e.flash = 0.06;
              overlay.pushDamage(e.x, e.y - e.radius - 6, dmg, 0x86efac);
              damageDealt += dmg;
            }
          }
          hitCocoonsInArea(player.x, player.y, radius, dmg, 0x86efac);
        }
      }

      // Хищные жвала (Mandibles)
      mandiblesCd -= dt;
      for (let i = mandibleSwipes.length - 1; i >= 0; i--) {
        mandibleSwipes[i].life -= dt;
        if (mandibleSwipes[i].life <= 0) mandibleSwipes.splice(i, 1);
      }
      if (wlvl.mandibles > 0 && mandiblesCd <= 0 && enemies.length > 0) {
        const mandIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.mandibles - 1));
        const range = MANDIBLES.range[mandIdx];
        const arc = MANDIBLES.arc;
        const dmg = MANDIBLES.dmg[mandIdx] * effDmg();
        let enemyInCone = false;
        for (const a of anomalies) {
          if (a.kind !== 'cocoon') continue;
          const dx = a.x - player.x;
          const dy = a.y - player.y;
          const d = Math.hypot(dx, dy);
          if (d <= range + a.r && (dx * playerDirX + dy * playerDirY) / Math.max(0.001, d) >= Math.cos(arc / 2)) {
            enemyInCone = true;
            break;
          }
        }
        if (!enemyInCone) {
          for (const e of nearby(player.x, player.y, range + 20)) {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const d = Math.hypot(dx, dy);
            if (d <= range + ENEMIES[e.type].radius) {
              const dot = (dx * playerDirX + dy * playerDirY) / Math.max(0.001, d);
              if (dot >= Math.cos(arc / 2)) { enemyInCone = true; break; }
            }
          }
        }
        if (enemyInCone) {
          mandiblesCd = MANDIBLES.cd[mandIdx] / effAtkSpd();
          sfx.mandible();
          mandibleSwipes.push({ x: player.x, y: player.y, dirX: playerDirX, dirY: playerDirY, range, arc, life: 0.22 });
          hitCocoonsInArea(player.x + playerDirX * (range * 0.5), player.y + playerDirY * (range * 0.5), range * 0.65, dmg, 0x00ff9d);
          for (const e of nearby(player.x, player.y, range + 20)) {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const d = Math.hypot(dx, dy);
            if (d <= range + ENEMIES[e.type].radius) {
              const dot = (dx * playerDirX + dy * playerDirY) / Math.max(0.001, d);
              if (dot >= Math.cos(arc / 2)) {
                e.hp -= dmg;
                e.flash = 0.1;
                e.kbx += playerDirX * 180;
                e.kby += playerDirY * 180;
                overlay.pushDamage(e.x, e.y - e.radius - 6, dmg, 0x00ff9d);
                damageDealt += dmg;
              }
            }
          }
        }
      }

      // Споровые цисты (Cysts): выкладываются только при движении и взводятся с задержкой
      cystsCd -= dt;
      if (wlvl.cysts > 0 && cystsCd <= 0 && cystMoveDist >= CYSTS.moveDist) {
        const cIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.cysts - 1));
        cystMoveDist = 0;
        cystsCd = CYSTS.cd[cIdx] / effAtkSpd();
        const perDrop = CYSTS.perDrop[cIdx];
        const maxActive = CYSTS.maxCysts[cIdx];
        const dmg = CYSTS.dmg[cIdx] * effDmg();
        const r = CYSTS.radius[cIdx];
        for (let k = 0; k < perDrop; k++) {
          if (liveCysts.length >= maxActive) liveCysts.shift();
          const dropA = Math.atan2(-playerDirY, -playerDirX) + (Math.random() - 0.5) * 1.1;
          const dropD = 18 + Math.random() * 20;
          liveCysts.push({
            x: player.x + Math.cos(dropA) * dropD,
            y: player.y + Math.sin(dropA) * dropD,
            r,
            dmg,
            life: 14,
            armT: CYSTS.armTime,
            armed: false,
          });
        }
        sfx.cyst();
      }
      for (let i = liveCysts.length - 1; i >= 0; i--) {
        const cyst = liveCysts[i];
        cyst.life -= dt;
        if (!cyst.armed) {
          cyst.armT -= dt;
          if (cyst.armT <= 0) {
            cyst.armT = 0;
            cyst.armed = true;
          }
        }
        let explode = cyst.life <= 0;
        if (!explode && cyst.armed) {
          for (const e of nearby(cyst.x, cyst.y, cyst.r + 20)) {
            if (Math.hypot(e.x - cyst.x, e.y - cyst.y) < cyst.r + e.radius) {
              explode = true;
              break;
            }
          }
        }
        if (explode) {
          const blastR = cyst.r * CYSTS.blastMul;
          sfx.nova();
          overlay.spawnPulse(cyst.x, cyst.y, 0x39ff14, blastR);
          sim.spawnPlayerSpores(toSimX(cyst.x), toSimY(cyst.y), 300);
          for (const e of nearby(cyst.x, cyst.y, blastR + 20)) {
            if (Math.hypot(e.x - cyst.x, e.y - cyst.y) < blastR + e.radius) {
              const inDmg = cyst.dmg * codexBonuses.explosiveDmgMul * enemyDmgBonus(e);
              e.hp -= inDmg;
              e.flash = 0.12;
              overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x39ff14);
              damageDealt += inDmg;
            }
          }
          liveCysts.splice(i, 1);
        }
      }

      // Сферы ДНК: магнит притягивает вблизи; вне радиуса сбора нужно подбираться самому
      const effMagnet = magnetR * (magnetNodeOwned ? 1.6 : 1) * codexBonuses.magnetMul;
      // Консолидация душ: если душ на поле больше 70, объединяем дальние, устраняя мусор
      if (orbs.length > 70) {
        let bestDist = 1e9;
        let mergeA = -1;
        let mergeB = -1;
        const checkLimit = Math.min(orbs.length, 40);
        for (let i = 0; i < checkLimit; i++) {
          const oi = orbs[i];
          if (Math.hypot(player.x - oi.x, player.y - oi.y) < effMagnet) continue;
          for (let j = i + 1; j < checkLimit; j++) {
            const oj = orbs[j];
            const d = Math.hypot(oi.x - oj.x, oi.y - oj.y);
            if (d < bestDist) {
              bestDist = d;
              mergeA = i;
              mergeB = j;
            }
          }
        }
        if (mergeA >= 0 && mergeB >= 0) {
          if (orbs[mergeB].value > orbs[mergeA].value) {
            orbs[mergeA].dna = orbs[mergeB].dna;
            orbs[mergeA].color = orbs[mergeB].color;
          }
          orbs[mergeA].value += orbs[mergeB].value;
          orbs.splice(mergeB, 1);
        }
      }
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        const dx = player.x - o.x;
        const dy = player.y - o.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        if (d < effMagnet) {
          o.vx += (dx / d) * 900 * dt;
          o.vy += (dy / d) * 900 * dt;
        } else if (orbToEnemies) {
          // Вражеский магнит (🧲): души утекают к ближайшему врагу и съедаются им
          let best: Enemy | null = null;
          let bestD = 170;
          const near = nearby(o.x, o.y, 170);
          for (const e of near) {
            const dd = Math.hypot(e.x - o.x, e.y - o.y);
            if (dd < bestD) { bestD = dd; best = e; }
          }
          if (best) {
            o.vx += ((best.x - o.x) / bestD) * 700 * dt;
            o.vy += ((best.y - o.y) / bestD) * 700 * dt;
            if (bestD < 14) { orbs.splice(i, 1); continue; } // душа украдена
          } else {
            o.vx *= Math.max(0, 1 - dt * 4);
            o.vy *= Math.max(0, 1 - dt * 4);
          }
        } else if (eliteMagnetPull(o, dt)) {
          // Магнитная элита (Этап 4.3) тянет эту душу к себе
        } else {
          // Сфера остаётся на месте (затухание остаточного импульса)
          o.vx *= Math.max(0, 1 - dt * 4);
          o.vy *= Math.max(0, 1 - dt * 4);
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.x = Math.max(10, Math.min(curWorldW - 10, o.x));
        o.y = Math.max(10, Math.min(curWorldH - 10, o.y));
        if (d < 12) {
          // Симбиотический Резонанс: непрерывный сбор душ повышает множитель x1.0 .. x3.0
          const prevMult = resonanceMult;
          resonanceStreak++;
          resonanceTimer = RESONANCE_WINDOW;
          resonanceMult = getResonanceMult(resonanceStreak);
          if (resonanceMult > prevMult) {
            sfx.resTierUp(resonanceMult);
            overlay.spawnPulse(player.x, player.y, resonanceMult >= 2.5 ? 0xff7b93 : 0x00ff9d, 48 + resonanceMult * 14);
            if (resonanceMult >= 2.0) showToast(`<svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-symbiont"/></svg> ${t('hud_resonance')} x${resonanceMult.toFixed(1)}`);
          }
          updateResonanceHud();

          // Душа съедена: опыт + энергия хвоста + ДНК её генома + биомасса шкалы
          xp += o.value * xpMul * mutagenXpMul * dailyXpMul * resonanceMult;
          tailLen = Math.min(maxTail(), tailLen + o.value * TAIL.soulGain);
          sinceSoul = 0;
          sfx.eat();
          dnaXp[o.dna] += o.value;
          biomass += o.value * resonanceMult;
          updateScaleHud();
          const lvl = dnaLvl(o.dna);
          if (lvl > lastDnaLvl[o.dna]) {
            lastDnaLvl[o.dna] = lvl;
            const en = getLocale() === 'en';
            showToast(`<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${o.dna}"/></svg> ${en ? 'DNA' : 'ДНК'} ${trDnaName(o.dna, DNA_NAMES[o.dna])}: ${en ? 'level' : 'уровень'} ${lvl}`);
            sfx.levelUp();
            overlay.spawnPulse(player.x, player.y, DNA_COLORS[o.dna], 70);
            updateDnaHud();
          }
          // Оба родительских генома гибрида созрели - сообщаем один раз
          for (const h of HYBRIDS) {
            if (hybridAvail(h.id) && !hybridNotified.has(h.id)) {
              hybridNotified.add(h.id);
              const trH = trHybrid(h.id, h.name, h.desc);
              showToast(`<svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-mutagen"/></svg> ${getLocale() === 'en' ? 'HYBRIDIZATION READY' : 'ГИБРИДИЗАЦИЯ ВОЗМОЖНА'}: ${trH.name}`);
              sfx.capture(true);
            }
          }
          orbs.splice(i, 1);
        }
      }

      // Уровень и апгрейды
      if (xp >= xpNext) {
        xp -= xpNext;
        level++;
        xpNext = xpRequiredForLevel(level);
        pendingUps++;
        maxHp = Math.min(220, maxHp + GROWTH.hpPerLvl);
        player.hp = Math.min(maxHp, player.hp + 14);
        overlay.spawnPulse(player.x, player.y, 0xbdfdf8, 80);
        sim.spawnPlayerSpores(toSimX(player.x), toSimY(player.y), 1600);
        openUpgrades();
      }

      // Смерть игрока: медленный разрыв клетки, затем портрет организма и причина гибели
      if (player.hp <= 0) {
        beginDeathSequence();
      }

      // ---- Physarum живёт вместе с игроком (Этапы 1.2 / 2.2 / 2.3) ----
      const simBeacons: Beacon[] = [];
      // Био-цветение Physarum на телах павших
      for (let i = corpseBeacons.length - 1; i >= 0; i--) {
        corpseBeacons[i].ttl -= dt;
        if (corpseBeacons[i].ttl <= 0) {
          corpseBeacons.splice(i, 1);
        } else {
          simBeacons.push({
            x: corpseBeacons[i].x,
            y: corpseBeacons[i].y,
            radius: 45,
            kind: 1,
            ttl: corpseBeacons[i].ttl,
            maxTtl: 4,
          });
        }
      }
      // Нова: токсин подсвечивается на полсекунды
      if (toxinFlash > 0) {
        const safeNovaIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.nova - 1));
        simBeacons.push({
          x: player.x, y: player.y,
          radius: NOVA.radius[safeNovaIdx] * 0.9,
          kind: -1, ttl: toxinFlash, maxTtl: 0.5,
        });
      }
      // Ядовитые лужи Паразита: токсин-маяки на 3 сек
      while (pendingPuddles.length > 0) {
        const pd = pendingPuddles.pop()!;
        simBeacons.push({ x: pd.x, y: pd.y, radius: 28, kind: -1, ttl: 3, maxTtl: 3 });
      }
      // Феромон-зов (пробел или кнопка «ЗОВ»): токсин-маяк пугает рой, отброс на CPU
      callCd -= dt;
      const joyCall = joystick.callRequested();
      const callTap = keys.has(' ') || callRequested || joyCall;
      if (callRequested || joyCall) { callRequested = false; joystick.consumeCall(); }
      if (callTap && callCd <= 0) {
        callCd = CALL.cd;
        const callTargetX = mouse.active ? mouse.x : (player.x + playerDirX * 120);
        const callTargetY = mouse.active ? mouse.y : (player.y + playerDirY * 120);
        simBeacons.push({ x: callTargetX, y: callTargetY, radius: CALL.beaconRadius, kind: -1, ttl: CALL.ttl, maxTtl: CALL.ttl });
        for (const e of nearby(callTargetX, callTargetY, CALL.radius)) {
          const d = Math.max(1, Math.hypot(e.x - callTargetX, e.y - callTargetY));
          e.kbx += ((e.x - callTargetX) / d) * CALL.knock;
          e.kby += ((e.y - callTargetY) / d) * CALL.knock;
        }
        overlay.spawnPulse(callTargetX, callTargetY, 0xff3b5c, CALL.beaconRadius + 40);
        overlay.beginShake(0.12);
        sfx.call();
        showToast(
          `<svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skill-call"/></svg> ` +
          `${getLocale() === 'en' ? 'PHEROMONE CALL' : 'ФЕРОМОН-ЗОВ'}`
        );
      }
      if (callRequested) callRequested = false;

      frameN++;
      // Маяк игрока: грибница тянется к нему и к кончику хвоста
      simBeacons.push({ x: player.x, y: player.y, radius: 80 + tailLen * 1.6, kind: 1, ttl: 9, maxTtl: 9 });
      const tailPts = visibleTail();
      if (tailPts.length > 0) {
        const tip = tailPts[0];
        simBeacons.push({ x: tip.x, y: tip.y, radius: 42, kind: 1, ttl: 6, maxTtl: 9 });
      }
      // Элитные враги тянут свои фиолетовые маяки - штамм врага сплочён
      for (const e of enemies) {
        if (e.type === 'brute') simBeacons.push({ x: e.x, y: e.y, radius: 90, kind: 2, ttl: 9, maxTtl: 9 });
        else if (e.type === 'boss') simBeacons.push({ x: e.x, y: e.y, radius: 110, kind: 2, ttl: 9, maxTtl: 9 });
      }
      // Захват био-башен удержанием зоны + тревоги при атаке монстров на оставленные башни
      const nodeStep = stepBioNodes(
        bioNodes,
        player,
        enemies,
        dt,
        codexBonuses.captureSpeedMul * dailyCaptureSpeedMul,
        hybridsTaken.has('psi_web'),
      );
      for (const n of nodeStep.ownerChanged) onNodeCaptured(n);
      nodesHeldMax = Math.max(nodesHeldMax, nodeStep.heldCount);
      for (const n of nodeStep.newlyRaided) {
        const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
        showToast(
          `<svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-${n.kind}"/></svg> ` +
          t('node_raided_toast', { name: tn.name }),
          'warn'
        );
      }

      // GPU readback теперь отслеживает только плотность штаммов непосредственно под игроком
      const onNodeStatsCb = (stats: NodeStat[]): void => {
        if (stats.length > bioNodes.length) {
          const s = stats[bioNodes.length];
          trailOwn = s.playerDensity >= STRAIN.densityThreshold;
          trailEnemy = s.enemyDensity >= STRAIN.densityThreshold;
        }
      };
      // Пси-Сеть: захваченные узлы бьют лазерами по ближайшим врагам
      psiZapT -= dt;
      if (hybridsTaken.has('psi_web') && psiZapT <= 0) {
        psiZapT = 0.8;
        for (const n of bioNodes) {
          if (n.owner !== 1) continue;
          let best: Enemy | null = null;
          let bestD = 240;
          for (const e of nearby(n.x, n.y, 240)) {
            const dd = Math.hypot(e.x - n.x, e.y - n.y);
            if (dd < bestD && e.hp > 0) { bestD = dd; best = e; }
          }
          if (best) {
            frameLasers.push({ x1: n.x, y1: n.y, x2: best.x, y2: best.y });
            best.hp -= 8 * effDmg();
            best.flash = 0.08;
            overlay.pushDamage(best.x, best.y - best.radius - 6, 8 * effDmg(), 0x9df5ff);
            damageDealt += 8 * effDmg();
            sfx.laser();
          }
        }
      }
      // Переводим маяки и узлы в видовое окно WebGPU
      const mappedBeacons: Beacon[] = [];
      for (const b of simBeacons) {
        const sx = toSimX(b.x);
        const sy = toSimY(b.y);
        const sr = b.radius * camZoom;
        if (sx >= -120 && sx <= SIM_WIDTH + 120 && sy >= -120 && sy <= SIM_HEIGHT + 120) {
          mappedBeacons.push({
            x: sx,
            y: sy,
            radius: sr,
            kind: b.kind,
            ttl: b.ttl,
            maxTtl: b.maxTtl,
          });
        }
      }

      simNodes.length = 0;
      for (let i = 0; i < bioNodes.length; i++) {
        const bn = bioNodes[i];
        simNodes.push({
          id: bn.id,
          x: toSimX(bn.x),
          y: toSimY(bn.y),
          radius: bn.radius * camZoom,
          owner: bn.owner,
          capture: bn.capture,
          kind: bn.kind,
        });
      }
      strainProbe.x = toSimX(player.x);
      strainProbe.y = toSimY(player.y);
      simNodes.push(strainProbe);

      // Смещение камеры в системе координат симуляции (для удержания штаммов в мировом пространстве)
      const simDeltaX = (camX - prevCamX) * camZoom;
      const simDeltaY = (camY - prevCamY) * camZoom;
      prevCamX = camX;
      prevCamY = camY;

      // Адаптивное испарение (Этап 5.4): поздняя игра - меньше следов, читаемость
      const evap = 0.955 - Math.min(gameTime / 600, 1) * 0.025;
      sim.step(
        nowSec,
        dt,
        simNodes,
        mappedBeacons,
        { x: toSimX(player.x), y: toSimY(player.y) },
        0.5 + Math.min(gameTime / 240, 1) * 0.5,
        evap,
        SCALES[scaleIdx].id,
        simDeltaX,
        simDeltaY,
        onNodeStatsCb
      );

      // Мягкий неон bloom: обновление каждые 3 кадра
      if (++frameBloom3 % 3 === 0) {
        bloomCtx.drawImage(gpuCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
      }

      // HUD
      hpFillEl.style.width = `${Math.max(0, (player.hp / maxHp) * 100)}%`;
      hpNumEl.textContent = `${Math.ceil(player.hp)}/${maxHp}`;
      const xpPct = `${Math.min(100, (xp / xpNext) * 100)}%`;
      if (xpConduitFillEl) xpConduitFillEl.style.width = xpPct;
      levelEl.textContent = `${t('hud_lvl')} ${level}`;
      timerEl.textContent = fmtTime(gameTime);
      waveEl.textContent = `${t('hud_cycle')} ${Math.floor(gameTime / 30) + 1}`;
      killsEl.textContent = `x${kills}`;
      // Хвост-ресурс: счётчик + цвет состояния + мигание при голоде
      tailNumEl.textContent = `${Math.round(tailLen)}/${Math.round(maxTail())}`;
      tailFillEl.style.width = `${Math.min(100, tailRatio * 100)}%`;
      hpWrapEl.dataset.state = tailState;
      hpWrapEl.classList.toggle('hunger', sinceSoul > 3);
      // Захваченные узлы: иконки прямо в HUD с тултипами
      let chip = '';
      for (const n of bioNodes) {
        if (n.owner === 1) {
          const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
          chip += `<svg class="chip-node-ico" viewBox="0 0 32 32" title="${tn.name}: ${tn.pos}"><use href="#ico-node-${n.kind}"/></svg>`;
        }
      }
      nodesChipEl.innerHTML = chip || `<span class="dim">${t('no_nodes')}</span>`;

      // Босс-бар активного Стража Цикла или Титана Масштаба
      const activeBoss = enemies.find((e) => e.titan && e.hp > 0 && e.infected <= 0)
        ?? enemies.find((e) => e.type === 'boss' && e.hp > 0 && e.infected <= 0);
      if (bossHudEl && bossNameEl && bossHpTextEl && bossHpFillEl) {
        if (activeBoss) {
          bossHudEl.classList.add('show');
          bossHudEl.classList.toggle('titan', Boolean(activeBoss.titan));
          const sc = SCALES[scaleIdx];
          const trS = trScale(sc.id, sc.name, sc.sub);
          const baseName = activeBoss.titan ? `${t('boss_titan')} · ${trS.name}` : t('boss_guardian');
          bossNameEl.textContent = activeBoss.enragedPhase ? `${baseName} · ${t('boss_enraged')}` : baseName;
          if (bossHudIcoUse) bossHudIcoUse.setAttribute('href', activeBoss.titan ? '#ico-macro-scale' : '#ico-skull-hazard');
          const bPct = Math.max(0, Math.min(100, (activeBoss.hp / Math.max(1, activeBoss.maxHp)) * 100));
          bossHpFillEl.style.width = `${bPct.toFixed(1)}%`;
          bossHpTextEl.textContent = `${Math.ceil(activeBoss.hp)}/${Math.round(activeBoss.maxHp)}`;
        } else {
          bossHudEl.classList.remove('show');
        }
      }

      // Тактические статус-пилюли (обновляются только при смене состояния)
      if (statusChipsEl) {
        const stagnating = idleTime > 2.5;
        const key = `${trailOwn ? 1 : 0}${trailEnemy ? 1 : 0}${neuralLinkActive ? 1 : 0}${bloomBuffT > 0 ? 1 : 0}${relicCarapace && carapaceShieldReady ? 1 : 0}${ampOwned ? 1 : 0}${stagnating ? 1 : 0}:${getLocale()}`;
        if (key !== lastStatusKey) {
          lastStatusKey = key;
          const pills: string[] = [];
          const pillIco = (id: string) => `<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#${id}"/></svg>`;
          if (trailOwn) pills.push(`<span class="status-pill" style="color:var(--cyan)">${pillIco('ico-chip-haste')}${t('status_own_strain')}</span>`);
          if (trailEnemy) pills.push(`<span class="status-pill" style="color:var(--red)">${pillIco('ico-chip-poison')}${t('status_enemy_strain')}</span>`);
          if (neuralLinkActive) pills.push(`<span class="status-pill" style="color:#00ff9d">${pillIco('ico-chip-regen')}${t('status_neural')}</span>`);
          if (bloomBuffT > 0) pills.push(`<span class="status-pill" style="color:var(--lime)">${pillIco('ico-chip-frenzy')}${t('status_bloom')}</span>`);
          if (relicCarapace && carapaceShieldReady) pills.push(`<span class="status-pill" style="color:#00ff9d">${pillIco('ico-chip-shield')}${t('status_carapace')}</span>`);
          if (ampOwned) pills.push(`<span class="status-pill" style="color:var(--amber)">${pillIco('ico-chip-armor')}${t('status_freeze')}</span>`);
          if (stagnating) pills.push(`<span class="status-pill" style="color:#ff8599">${pillIco('ico-skull-hazard')}${t('status_stagnation')}</span>`);
          statusChipsEl.innerHTML = pills.join('');
        }
      }

      // BGM адаптивная интенсивность
      const danger = Math.min(1, enemies.length / 28 + (tailState === 'crit' ? 0.35 : tailState === 'low' ? 0.15 : 0) + (titanPending ? 0.4 : 0));
      sfx.setBgmIntensity(SCALES[scaleIdx].id, titanPending || enemies.some((e) => e.type === 'boss'));

      // Кулдауны оружий и зова (Этап 5.2)
      updateWeaponHud();
      // Дрон тревоги звучит только в критике хвоста
      sfx.setTailDrone(tailState === 'crit');

      // Органическая низкоуровневая виньетка при критическом здоровье (без стробоскопа)
      const hpRatio = player.hp / maxHp;
      if (hpRatio < 0.35 && gameSettings.screenFlashes !== 'off') {
        hurtEl.classList.add('low-hp');
      } else {
        hurtEl.classList.remove('low-hp');
      }

      // Обновление реликвий органелл
      if (relicCarapace && !carapaceShieldReady) {
        carapaceCooldown -= dt;
        if (carapaceCooldown <= 0) {
          carapaceShieldReady = true;
          showToast(`<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-relic-carapace"/></svg> ${getLocale() === 'en' ? 'CARAPACE: SHIELD READY' : 'КАРАПАКС: ЩИТ ГОТОВ'}`);
          overlay.spawnPulse(player.x, player.y, 0x00ff9d, 60);
        }
      }

      if (relicGalvanic) {
        galvanicTimer += dt;
        if (galvanicTimer >= 4.0) {
          galvanicTimer = 0;
          const targets = enemies
            .filter((e) => e.hp > 0 && e.infected <= 0 && Math.hypot(e.x - player.x, e.y - player.y) < 220)
            .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))
            .slice(0, 3);
          if (targets.length > 0) {
            let prevPt = { x: player.x, y: player.y };
            for (const t of targets) {
              frameArcs.push({ x1: prevPt.x, y1: prevPt.y, x2: t.x, y2: t.y, color: 0x66fcf1 });
              t.hp -= 28 * effDmg();
              t.flash = 0.08;
              t.atkCd = Math.max(t.atkCd, 0.8);
              overlay.pushDamage(t.x, t.y - t.radius - 6, 28 * effDmg(), 0x66fcf1);
              prevPt = { x: t.x, y: t.y };
            }
            sfx.zap();
          }
        }
      }

      if (relicAbyssal) {
        abyssalLureTimer += dt;
        if (abyssalLureTimer >= 6.0) {
          abyssalLureTimer = 0;
          overlay.spawnPulse(player.x, player.y, 0xa855f7, 180);
          for (const e of enemies) {
            if (e.hp > 0 && e.infected <= 0 && Math.hypot(e.x - player.x, e.y - player.y) < 180) {
              e.atkCd = Math.max(e.atkCd, 2.0);
              e.flash = 0.12;
            }
          }
          showToast(getLocale() === 'en' ? 'ABYSSAL LIGHT: SWARM BLINDED' : 'АБИССАЛЬНЫЙ СВЕТ: РОЙ ОСЛЕПЛЁН');
        }
      }
    } else {
      prevCamX = camX;
      prevCamY = camY;
      // До старта / на паузе / после конца: пыль дрейфует без маяков
      sfx.setTailDrone(false);
      sim.step(nowSec, dt, [], [], { x: -500, y: -500 }, -0.75, 0.90, SCALES[scaleIdx].id, 0, 0, () => {});
    }

    // Био-радар чашки Петри: обновление миникарты и направлений
    if (started && !gameOver && !dying) {
      radar.update(
        dt,
        { x: player.x, y: player.y, dirX: playerDirX, dirY: playerDirY },
        enemies,
        bioNodes,
        curWorldW,
        curWorldH,
        Math.max(650, 850 / camZoom),
        anomalies
      );
    }

    // Био-радар: стрелки к скрытым за экраном вражеским узлам, титанам, гнёздам спор и атакуемым башням
    const radarMarkers: { angle: number; dist: number; color: number; icon: 'boss' | 'titan' | 'node' | 'raid' }[] = [];
    if (started && !gameOver && !dying) {
      const halfViewW = (overlay.screenWidth / 2) / (camZoom * overlay.scale);
      const halfViewH = (overlay.screenHeight / 2) / (camZoom * overlay.scale);
      for (const a of anomalies) {
        if (a.kind !== 'cocoon') continue;
        const dx = a.x - camX;
        const dy = a.y - camY;
        if (Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30) {
          radarMarkers.push({
            angle: Math.atan2(a.y - player.y, a.x - player.x),
            dist: Math.hypot(a.x - player.x, a.y - player.y),
            color: 0xa3e635,
            icon: 'node',
          });
        }
      }
      for (const n of bioNodes) {
        const dx = n.x - camX;
        const dy = n.y - camY;
        const offscreen = Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30;
        if (!offscreen) continue;
        if (n.owner === 1 && n.raided) {
          radarMarkers.push({
            angle: Math.atan2(n.y - player.y, n.x - player.x),
            dist: Math.hypot(n.x - player.x, n.y - player.y),
            color: 0xff3b4e,
            icon: 'raid',
          });
        } else if (n.owner !== 1) {
          radarMarkers.push({
            angle: Math.atan2(n.y - player.y, n.x - player.x),
            dist: Math.hypot(n.x - player.x, n.y - player.y),
            color: n.owner === -1 ? 0xff3b4e : 0xa855f7,
            icon: 'node',
          });
        }
      }
      for (const e of enemies) {
        if (!e.titan && e.type !== 'boss' && !e.elite) continue;
        const dx = e.x - camX;
        const dy = e.y - camY;
        if (Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30) {
          radarMarkers.push({
            angle: Math.atan2(e.y - player.y, e.x - player.x),
            dist: Math.hypot(e.x - player.x, e.y - player.y),
            color: e.titan ? 0xffb800 : e.type === 'boss' ? 0xff2a85 : 0xfacc15,
            icon: e.titan ? 'titan' : 'boss',
          });
        }
      }
      radarMarkers.sort((a, b) => a.dist - b.dist);
      if (radarMarkers.length > 6) radarMarkers.length = 6;
    }

    if (!paused || !started) {
      overlay.render(
        {
          player: { x: player.x, y: player.y, r: playerRadius(), tail: visibleTail() },
          playerDeath: dying ? { progress: Math.min(1, 1 - Math.max(0, dyingT) / DYING_DURATION), x: player.x, y: player.y } : null,
          tailState,
          tailHunger: sinceSoul > 3,
          cam: { x: camX, y: camY, zoom: camZoom, worldW: curWorldW, worldH: curWorldH },
          morph: {
            dirX: playerDirX,
            dirY: playerDirY,
            vermis: dnaLvl('vermis'),
            chimera: dnaLvl('chimera'),
            mycelium: dnaLvl('mycelium'),
            symbiont: dnaLvl('symbiont'),
            hybrid: ([...hybridsTaken].pop() ?? null),
            scaleId: SCALES[scaleIdx].id,
            worldW: curWorldW,
            worldH: curWorldH,
          },
          enemies,
          projs,
          eprojs,
          xpOrbs: orbs,
          nodes: bioNodes,
          orbit: wlvl.orbs > 0
            ? {
                count: ORBS.count[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.orbs - 1))],
                cx: player.x,
                cy: player.y,
                radius: ORBS.radius[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.orbs - 1))] * orbRadiusMul(),
                angle: orbAngle,
              }
            : null,
          aura: wlvl.aura > 0 ? { x: player.x, y: player.y, r: AURA.radius[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.aura - 1))] } : null,
          arcs: frameArcs,
          lasers: frameLasers,
          cysts: liveCysts,
          mandibleSwipes,
          radarMarkers,
          anomalies,
          neuralLinkActive,
          carapaceReady: relicCarapace && carapaceShieldReady,
          dashing: dashT > 0,
          ringReady: ringCd <= 0 && pathHistory.length >= 24,
          settings: {
            parallax: gameSettings.microParallax,
            subtleShake: gameSettings.cameraShake === 'subtle',
            softFlashes: gameSettings.screenFlashes === 'soft',
          },
        },
        nowSec,
        dt
      );
    }
    frameArcs.length = 0;
    frameLasers.length = 0;

    requestAnimationFrame(loop);
  }

  // Первый запуск: стартовые бонусы Биолаба, чип генома, ДНК и шкалы
  applyBiolabStart();
  sfx.setBgmVolume(gameSettings.bgmVolume / 100);
  sfx.setSfxVolume(gameSettings.sfxVolume / 100);
  updateStageBiome(SCALES[scaleIdx].id);
  updateBranchChip();
  updateDnaHud();
  updateScaleHud();
  updateWeaponHud();
  showModal('intro');

  // Отладочные хуки только для dev-сборки
  if (import.meta.env.DEV) {
    const debugApi = {
      addBio: (n: number) => { biomass = Math.max(0, biomass + n); updateScaleHud(); },
      dna: (b: DnaBranch, n: number) => { dnaXp[b] += n; updateDnaHud(); refreshMainGenome(); updateBranchChip(); },
      xpDump: () => { xp += 60; },
      spawnTitan: () => { biomass = SCALES[scaleIdx].biomassGoal; },
      killTitan: () => { const t = enemies.find((e) => e.titan); if (t) t.hp = 0; },
      metamorph: () => startMetamorphosis(),
      die: () => { player.hp = 0; },
      info: () => ({
        scale: SCALES[scaleIdx].id, biomass, goal: SCALES[scaleIdx].biomassGoal,
        camZoom, dna: { ...dnaXp }, dnaLvl: {
          vermis: dnaLvl('vermis'), chimera: dnaLvl('chimera'),
          mycelium: dnaLvl('mycelium'), symbiont: dnaLvl('symbiont'),
        },
        hybrids: [...hybridsTaken], genes: [...genes], tailLen, level, kills,
      }),
    };
    (window as unknown as Record<string, unknown>).__lumivore = debugApi;
  }

  // Авто-пауза при сворачивании/переключении вкладки
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && started && !paused && !gameOver) {
      paused = true;
      sfx.setTailDrone(false);
      sfx.stopBgm();
      showModal('intro');
    }
  });

  // Пасхалка 1: Код Контаминации (Konami Code: ↑↑↓↓←→←→BA) -> режим ретро-осциллографа
  const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === konamiSeq[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konamiSeq.length) {
        konamiIdx = 0;
        const active = document.body.classList.toggle('retro-oscilloscope');
        showToast(active ? 'ПРОТОКОЛ 1984: ОСЦИЛЛОГРАФ АКТИВЕН' : 'ПРОТОКОЛ 1984: ОТКЛЮЧЕН');
      }
    } else {
      konamiIdx = k === konamiSeq[0] ? 1 : 0;
    }
  });

  // Пасхалка 2: Ночная смена в реакторе (00:00-04:00)
  const localHour = new Date().getHours();
  if (localHour >= 0 && localHour < 4) {
    showToast('НОЧНАЯ СМЕНА ЕВРОКОРП-3: УЛЬТРАФИОЛЕТОВЫЙ ПРОТОКОЛ');
  }

  // Пасхалка 3: 10 кликов по заголовку меню вызывают «чих» спор
  const menuTitleEl = document.querySelector('#intro h1');
  if (menuTitleEl) {
    let titleClicks = 0;
    menuTitleEl.addEventListener('click', () => {
      titleClicks++;
      if (titleClicks >= 10) {
        titleClicks = 0;
        sim.spawnPlayerSpores(SIM_WIDTH / 2, SIM_HEIGHT / 2, 4000);
        overlay.spawnPulse(player.x, player.y, 0x66fcf1, 180);
        showToast('ОБРАЗЕЦ ЧИХНУЛ СПОРАМИ!');
      }
    });
  }

  // Пасхалка 4: 7 кликов по заголовку Биолаба -> секретное досье 0xDEAD_SLIME
  const biolabTitleEl = document.querySelector('#biolab h1');
  if (biolabTitleEl) {
    let blClicks = 0;
    biolabTitleEl.addEventListener('click', () => {
      blClicks++;
      if (blClicks >= 7) {
        blClicks = 0;
        showToast('ДОСЬЕ 0xDEAD_SLIME: Проект-0 сбежал из реактора в 2024 г.');
      }
    });
  }

  // Бесконечный режим Overdrive после победы над 5-м Титаном
  if (endlessBtn) {
    endlessBtn.addEventListener('click', () => {
      overdriveTier++;
      gameOver = false;
      paused = false;
      biomass = 0;
      player.hp = maxHp;
      modal.classList.remove('show');
      sfx.startBgm();
      updateScaleHud();
      syncStagePhase();
      showToast(getLocale() === 'en' ? `OVERDRIVE TIER ${overdriveTier}: INFINITE FRACTAL ACTIVE` : `OVERDRIVE TIER ${overdriveTier}: БЕСКОНЕЧНЫЙ ФРАКТАЛ АКТИВЕН`);
    });
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  let gpUpgradeFocus = 0;
  window.setInterval(() => {
    if (!upgradeModal.classList.contains('show')) return;
    const gp = gamepad.poll();
    if (!gp.connected) return;
    const cards = Array.from(cardsEl.children) as HTMLButtonElement[];
    if (cards.length === 0) return;
    if (gp.navLeft) gpUpgradeFocus = (gpUpgradeFocus - 1 + cards.length) % cards.length;
    if (gp.navRight) gpUpgradeFocus = (gpUpgradeFocus + 1) % cards.length;
    cards.forEach((c, idx) => c.classList.toggle('gp-focus', idx === gpUpgradeFocus));
    if (gp.confirmPressed && cards[gpUpgradeFocus]) {
      cards[gpUpgradeFocus].click();
    }
  }, 80);

  requestAnimationFrame(loop);
}

bootstrap();
