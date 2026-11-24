// LUMIVORE: THE LIVING FRACTAL - игровой цикл био-эволютивного рогалика
// Змейка-хвост + ДНК-матрица Spore + Кольцо Смерти + метаморфоз 5 шкал.
// Сущности на CPU + Pixi-пулы, physarum-симуляция живёт вместе с игроком
import { PixiOverlay, AnomalyView } from './engine/PixiOverlay';
import { PetriRadar } from './engine/radar';
import { WebGPUSim, NodeStat } from './engine/WebGPUSim';
import { Sfx } from './engine/audio';
import { WaveDirector } from './engine/waves';
import { BIOLAB_UNLOCKS, DnaBranch, RunGenome, isUnlocked, loadBiolab, pointsEarned, purchase, recordRun } from './engine/biolab';
import { downloadPortrait, renderPortrait } from './engine/portrait';
import { createJoystick } from './engine/joystick';
import { GamepadController } from './engine/gamepad';
import { CODEX_ENTRIES, getCodexBonuses, loadCodex, unlockCodexEntry } from './engine/codex';
import { checkAchievements } from './engine/achievements';
import { recordLeaderboardEntry } from './engine/leaderboard';
import { getDailyChallenge } from './engine/challenge';
import { getLocale, setLocale, t } from './i18n';
import { inPoly, polyArea, segIsect } from './game/ringOfDeath';
import { SpatialHashGrid } from './game/spatialHash';
import { ENEMY_SPRITES, ENEMY_SPRITES_V2 } from './engine/svgAssets';
import {
  AURA, Beacon, BioNode, BOSS_EVERY, BOSS_FIRST_AT, CALL, CYSTS, DASH, DNA_COLORS, DNA_LEVELS,
  DNA_NAMES, ELITE, ENEMIES, ENEMY_CAP, EnemyType, GROWTH, HybridId, HYBRIDS, IFRAME, MANDIBLES,
  METAMORPH, NOVA, NodeKind, ORBS, PLAYER, PROJ_LIFE, PROJ_RADIUS, PROJ_SPEED, RING,
  SCALES, SIM_HEIGHT, SIM_WIDTH, SPAWN_TABLE, SPIKES, STAT_MAX_STACKS, STRAIN, TAIL,
  WeaponId, WEAPON_MAX_LVL, WORLD, worldSize,
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
  const upgradeModal = document.getElementById('upgrade')!;
  const upgradeTitle = document.getElementById('upgrade-title')!;
  const cardsEl = document.getElementById('cards')!;
  const rerollBtn = document.getElementById('reroll-btn') as HTMLButtonElement | null;
  const modal = document.getElementById('modal')!;
  const modalTitle = document.getElementById('modal-title')!;
  const modalSub = document.getElementById('modal-sub')!;
  const restartBtn = document.getElementById('restart-btn')!;
  const endlessBtn = document.getElementById('endless-btn') as HTMLButtonElement | null;
  const branchChipEl = document.getElementById('branch-chip')!;
  const savePortraitBtn = document.getElementById('save-portrait')!;
  const biolabBtn = document.getElementById('biolab-btn')!;
  const biolabOverlay = document.getElementById('biolab')!;
  const biolabOpenBtn = document.getElementById('biolab-open')!;
  const biolabCloseBtn = document.getElementById('biolab-close')!;
  const biolabPointsEl = document.getElementById('biolab-points')!;
  const biolabListEl = document.getElementById('biolab-list')!;
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

  const startBtnLabel = document.getElementById('start-btn-label');
  const menuRecordBadge = document.getElementById('menu-record-badge');
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
  };
  const bloomCanvas = document.getElementById('bloom-canvas') as HTMLCanvasElement;
  const bloomCtx = bloomCanvas.getContext('2d')!;
  const radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
  const radarBadgeEl = document.getElementById('radar-badge');
  const resHudEl = document.getElementById('resonance-hud');
  const resMultEl = document.getElementById('res-mult');
  const resStreakEl = document.getElementById('res-streak');
  const resBarFillEl = document.getElementById('res-bar-fill');
  const radar = new PetriRadar();
  if (radarCanvas) {
    radar.init(radarCanvas, radarBadgeEl);
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
      showToast(`WEBGPU ПОТЕРЯН (${reason}) — ОБНОВИТЕ СТРАНИЦУ`, 'danger');
    };
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error('Initialization error:', err);
    timerEl.textContent = errorMsg;
    const errorModal = document.createElement('div');
    errorModal.style.cssText = 'position:absolute;inset:0;z-index:999;background:rgba(2,6,12,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#ff5570;font-family:inherit;';
    errorModal.innerHTML = `
      <h2 style="font-size:22px;letter-spacing:0.1em;margin-bottom:14px;color:#ff3b5c;">ТРЕБУЕТСЯ WEBGPU</h2>
      <p style="max-width:560px;font-size:13px;line-height:1.6;color:#cbd5e1;margin-bottom:16px;">
        Для физической симуляции 120 000 агентов слизевика Physarum необходима поддержка <b>WebGPU Compute Shaders</b>.<br><br>
        ${errorMsg}
      </p>
      <div style="font-size:11px;color:#7c8ba1;max-width:480px;line-height:1.5;">
        Рекомендуется: Chromium / Chrome 113+, Edge 113+, или Firefox с включённым флагом <code>dom.webgpu.enabled</code>.
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
  let regen = 0.5; // базовая регенерация, улучшения добавляют сверху
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
  let dashCd = 0;
  let dashT = 0;
  let dashRequested = false;

  const liveCysts: { x: number; y: number; r: number; dmg: number; life: number }[] = [];
  const mandibleSwipes: { x: number; y: number; dirX: number; dirY: number; range: number; arc: number; life: number }[] = [];
  const corpseBeacons: { x: number; y: number; ttl: number }[] = [];

  let cursePredator = false;
  let curseChitin = false;
  let curseHunger = false;

  let enemies: Enemy[] = [];
  let projs: Proj[] = [];
  let eprojs: { x: number; y: number; vx: number; vy: number; dmg: number; life: number }[] = [];
  let orbs: XpOrb[] = [];
  let enemyIdSeq = 1;

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

  // ---- Территория: био-узлы, захваченные плотностью штаммов ----
  const NODE_KINDS: NodeKind[] = ['gen', 'amp', 'magnet', 'mutagen', 'incubator', 'gen', 'amp'];
  const NODE_NAMES: Record<NodeKind, string> = {
    gen: 'ГЕНЕРАТОР', amp: 'УСИЛИТЕЛЬ', magnet: 'МАГНИТ', mutagen: 'МУТАГЕН', incubator: 'ИНКУБАТОР',
  };
  const NODE_POS_EFFECTS: Record<NodeKind, string> = {
    gen: '+2 HP/с', amp: 'хвост не тает', magnet: 'сбор x2.5', mutagen: '+1 карта', incubator: '+50% XP',
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
          radius: 32,
          owner: 0 as -1 | 0 | 1,
          capture: 0,
          kind,
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
          radius: 32,
          owner: 0 as -1 | 0 | 1,
          capture: 0,
          kind,
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
  let nodeRegenBonus = 0;     // 🔋 генератор: +2 HP/сек
  let tailFreeze = false;     // ⚡ усилитель: хвост не тает
  let weaponPenalty = 1;      // вражеский усилитель: оружие -20% урон
  let magnetNodeOwned = false;// 🧲 магнит: радиус сбора душ x2.5
  let orbToEnemies = false;   // вражеский магнит: души утекают к рою
  let xpMul = 1;              // 💜 инкубатор: +50% XP
  let incubatorEnemy = false; // вражеский инкубатор активен
  let callCd = 0;             // феромон-зов
  let callRequested = false;  // запрос от кнопки «ЗОВ» (мобильный джойстик)
  let frameBloom3 = 0;        // кадр для раз в 3 кадра bloom-копии

  // ---- Хвост как живое существо (Этап 1.1) ----
  let sinceSoul = 0;   // секунд без добычи душ
  let critFlashT = 0;  // анти-спам оранжевой вспышки по краям
  let tailState: 'ok' | 'low' | 'crit' = 'ok';
  let frameN = 0;

  let codexBonuses = getCodexBonuses();
  const refreshCodexBonuses = () => { codexBonuses = getCodexBonuses(); };
  const enemyDmgBonus = (e: Enemy) => codexBonuses.enemyDmgMul[e.titan ? 'titan' : e.type] ?? 1;

  // Хвост особи — ресурс: растёт от сфер ДНК, тает от движения
  let tailLen: number = TAIL.startLen;
  const pathHistory: { x: number; y: number }[] = [];
  let tailTick = 0;
  const maxTail = () => Math.round((TAIL.baseMax + level * TAIL.maxPerLvl + tailCapBonus) * codexBonuses.tailCapMul);
  const tailDps = () => (TAIL.dpsBase + tailLen * TAIL.dpsPerSeg) * tailDpsMul;
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
  const effDmg = () => dmgMul * weaponPenalty * (genes.has('unstable') ? (unstableT > 0 ? 0.55 : 1.8) : 1);
  const effAtkSpd = () => atkSpdMul * (unstableT > 0 && unstableKind === 2 ? 0.6 : 1);
  /** Неуязвимость после урона: ген «Фазовый сдвиг» удваивает окно */
  const iframeNow = () => IFRAME * (genes.has('phantom') ? 2 : 1) + (curseChitin ? 1.5 : 0);

  let kills = 0;
  let level = 1;
  let xp = 0;
  let xpNext = 6;
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
      if (codexModal?.classList.contains('show')) { showModal('intro'); return; }
      if (biolabOverlay.classList.contains('show')) { showModal('intro'); return; }
      if (settingsModal?.classList.contains('show')) { showModal('intro'); return; }
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
      if (started && !gameOver && pendingUps === 0) {
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
    if (e.key.toLowerCase() === 'p' && started && !gameOver && pendingUps === 0) {
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
      quality: 'medium',
    };
  }

  const gameSettings: SettingsData = loadSettings();

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

  function applyDamageToPlayer(amount: number): boolean {
    if (relicCarapace && carapaceShieldReady) {
      carapaceShieldReady = false;
      carapaceCooldown = 18;
      player.iframe = iframeNow() + 0.3;
      overlay.spawnPulse(player.x, player.y, 0x00ff9d, 90);
      showToast('КАРАПАКС: УДАР ПОГЛОЩЁН!');
      sfx.zap();
      return false;
    }
    const incomingDmg = isUnlocked('perm_armor') ? amount * 0.85 : amount;
    player.hp -= incomingDmg;
    player.iframe = iframeNow();
    hurtFlash();
    gamepad.vibrate(110, 0.55, 0.25);
    if (resonanceStreak >= 3) sfx.resDrop();
    resonanceStreak = 0;
    resonanceTimer = 0;
    resonanceMult = 1.0;
    updateResonanceHud();
    return true;
  }

  /** Пересчёт бонусов всех узлов по текущим владельцам (Этап 2.1) */
  function recomputeNodeBonuses(): void {
    nodeRegenBonus = 0;
    tailFreeze = false;
    weaponPenalty = 1;
    magnetNodeOwned = false;
    orbToEnemies = false;
    xpMul = 1;
    incubatorEnemy = false;
    for (const n of bioNodes) {
      if (n.owner === 1) {
        if (n.kind === 'gen') nodeRegenBonus += 2;
        else if (n.kind === 'amp') tailFreeze = true;
        else if (n.kind === 'magnet') magnetNodeOwned = true;
        else if (n.kind === 'incubator') xpMul = 1.5;
      } else underEnemy(n.kind);
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
    if (n.owner === 1) {
      showToast(`УЗЕЛ ЗАХВАЧЕН: ${NODE_NAMES[n.kind]} (${NODE_POS_EFFECTS[n.kind]})`);
      if (n.kind === 'mutagen') nextPickDelta = 1;
    } else if (n.owner === -1) {
      showToast(`УЗЕЛ ПОТЕРЯН: ${NODE_NAMES[n.kind]} (${NODE_NEG_EFFECTS[n.kind]})`);
      if (n.kind === 'mutagen') nextPickDelta = -1;
    } else {
      showToast(`УЗЕЛ НЕЙТРАЛЕН: ${NODE_NAMES[n.kind]}`);
    }
    overlay.spawnPulse(n.x, n.y, n.owner === 1 ? 0x66fcf1 : 0xc084fc, n.radius * 3);
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
    showToast(`ГИБРИДИЗАЦИЯ: ${def.name}`);
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
    { id: 'spikes0', title: 'Шипы', desc: 'Автоматические иглы: поражают ближайших врагов', avail: () => wlvl.spikes === 0, apply: () => (wlvl.spikes = 1) },
    { id: 'spikes+', title: 'Шипы', desc: 'Больше урона, шипов и выше скорострельность', avail: () => wlvl.spikes > 0 && wlvl.spikes < WEAPON_MAX_LVL, apply: () => wlvl.spikes++ },
    { id: 'orbits0', title: 'Электроорбиты', desc: 'Сферы вращаются вокруг вас и жгут врагов рядом', avail: () => wlvl.orbs === 0, apply: () => (wlvl.orbs = 1) },
    { id: 'orbits+', title: 'Электроорбиты', desc: '+1 сфера и повышение урона', avail: () => wlvl.orbs > 0 && wlvl.orbs < WEAPON_MAX_LVL, apply: () => wlvl.orbs++ },
    { id: 'nova0', title: 'Нова-импульс', desc: 'Взрывное кольцо: урон и отброс толпы', avail: () => wlvl.nova === 0, apply: () => (wlvl.nova = 1) },
    { id: 'nova+', title: 'Нова-импульс', desc: 'Больше радиус и урон, быстрее перезарядка', avail: () => wlvl.nova > 0 && wlvl.nova < WEAPON_MAX_LVL, apply: () => wlvl.nova++ },
    { id: 'aura0', title: 'Токсичная аура', desc: 'Едкое поле отравляет всех врагов вокруг', avail: () => wlvl.aura === 0, apply: () => (wlvl.aura = 1) },
    { id: 'aura+', title: 'Токсичная аура', desc: 'Больше радиус и урон в секунду', avail: () => wlvl.aura > 0 && wlvl.aura < WEAPON_MAX_LVL, apply: () => wlvl.aura++ },
    { id: 'mandibles0', title: 'Хищные жвала', desc: 'Фронтальный конус урона: разрывает врагов перед вами', avail: () => wlvl.mandibles === 0, apply: () => (wlvl.mandibles = 1) },
    { id: 'mandibles+', title: 'Хищные жвала', desc: 'Больше радиус, угол рассечения и урон', avail: () => wlvl.mandibles > 0 && wlvl.mandibles < WEAPON_MAX_LVL, apply: () => wlvl.mandibles++ },
    { id: 'cysts0', title: 'Споровые цисты', desc: 'Органические мины: сбрасываются позади и взрываются при контакте', avail: () => wlvl.cysts === 0, apply: () => (wlvl.cysts = 1) },
    { id: 'cysts+', title: 'Споровые цисты', desc: 'Больше цист в кладке, выше радиус и урон детонации', avail: () => wlvl.cysts > 0 && wlvl.cysts < WEAPON_MAX_LVL, apply: () => wlvl.cysts++ },
    // --- Критические мутации (патологии): сверхсила с расплатой ---
    {
      id: 'curse_predator',
      title: 'СВЕРХХИЩНИК',
      desc: 'Урон x2.2 и лечение +4 HP за элит и боссов, но хвост тает в 3 раза быстрее',
      curse: true,
      avail: () => !cursePredator,
      apply: () => { cursePredator = true; dmgMul *= 2.2; showToast('ПАТОЛОГИЯ: СВЕРХХИЩНИК'); },
    },
    {
      id: 'curse_chitin',
      title: 'ТИТАНОВЫЙ ХИТИН',
      desc: 'Макс. HP +120 и неуязвимость +1.5 с, но скорость движения снижена на 30%',
      curse: true,
      avail: () => !curseChitin,
      apply: () => { curseChitin = true; maxHp += 120; player.hp += 120; moveSpeed *= 0.70; showToast('ПАТОЛОГИЯ: ТИТАНОВЫЙ ХИТИН'); },
    },
    {
      id: 'curse_hunger',
      title: 'ВЕЧНЫЙ ГОЛОД',
      desc: 'Радиус сбора x2 и скорость атаки +40%, но при голоде (>3 с без сфер) теряет 3 HP/с (не смертельно)',
      curse: true,
      avail: () => !curseHunger,
      apply: () => { curseHunger = true; magnetR *= 2; atkSpdMul += 0.40; showToast('ПАТОЛОГИЯ: ВЕЧНЫЙ ГОЛОД'); },
    },
    // --- Прото-органеллы ---
    {
      id: 'relic_galvanic',
      title: 'БИО-ГАЛЬВАНИКА',
      desc: 'Организм накапливает статику: цепная микро-молния поражает 3 врагов каждые 4 с',
      avail: () => !relicGalvanic,
      apply: () => { relicGalvanic = true; showToast('ОРГАНЕЛЛА: БИО-ГАЛЬВАНИКА'); },
    },
    {
      id: 'relic_abyssal',
      title: 'АБИССАЛЬНЫЙ ЛЮМИНОФОР',
      desc: 'Радиус сбора сфер +50%, а био-фонарь каждые 6 с ослепляет врагов вокруг вас',
      avail: () => !relicAbyssal,
      apply: () => { relicAbyssal = true; magnetR *= 1.5; showToast('ОРГАНЕЛЛА: АБИССАЛЬНЫЙ ЛЮМИНОФОР'); },
    },
    {
      id: 'relic_carapace',
      title: 'ЖИВОЙ КАРАПАКС',
      desc: 'Каждые 18 с формирует живой барьер, полностью поглощающий следующий удар',
      avail: () => !relicCarapace,
      apply: () => { relicCarapace = true; carapaceShieldReady = true; showToast('ОРГАНЕЛЛА: ЖИВОЙ КАРАПАКС'); },
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
      avail: () => (['spikes', 'orbs', 'nova', 'aura', 'mandibles', 'cysts'] as WeaponId[]).some((w) => wlvl[w] < WEAPON_MAX_LVL),
      apply: () => {
        const ids = (['spikes', 'orbs', 'nova', 'aura', 'mandibles', 'cysts'] as WeaponId[]).filter((w) => wlvl[w] < WEAPON_MAX_LVL);
        if (ids.length > 0) wlvl[ids[Math.floor(Math.random() * ids.length)]]++;
      },
    },
    { id: 'my_regen', branch: 'mycelium', title: 'Симбиоз', desc: '+1.5 HP/с восстановления', avail: () => stack('my_regen'), apply: () => { regen += 1.5; bump('my_regen'); } },
    { id: 'my_aura', branch: 'mycelium', title: 'Спороносность', desc: 'Токсичная аура +1 уровень', avail: () => wlvl.aura > 0 && wlvl.aura < WEAPON_MAX_LVL, apply: () => { wlvl.aura++; } },
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
    if (id === 'spikes0') return ' · открытие';
    if (id === 'spikes+') return ` · ур.${wlvl.spikes} → ${wlvl.spikes + 1}`;
    if (id === 'orbits0') return ' · открытие';
    if (id === 'orbits+') return ` · ур.${wlvl.orbs} → ${wlvl.orbs + 1}`;
    if (id === 'nova0') return ' · открытие';
    if (id === 'nova+') return ` · ур.${wlvl.nova} → ${wlvl.nova + 1}`;
    if (id === 'aura0') return ' · открытие';
    if (id === 'aura+') return ` · ур.${wlvl.aura} → ${wlvl.aura + 1}`;
    if (id === 'mandibles0') return ' · открытие';
    if (id === 'mandibles+') return ` · ур.${wlvl.mandibles} → ${wlvl.mandibles + 1}`;
    if (id === 'cysts0') return ' · открытие';
    if (id === 'cysts+') return ` · ур.${wlvl.cysts} → ${wlvl.cysts + 1}`;
    if (STACKABLE_STATS.has(id)) return ` · ${(statStacks[id] ?? 0)}/${STAT_MAX_STACKS}`;
    return '';
  }

  function resolveCardDesc(u: UpgradeDef): string {
    if (u.id === 'spikes+' && wlvl.spikes === 2) {
      return 'Больше урона и выше скорострельность';
    }
    return u.desc;
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
    upgradeTitle.textContent = `УРОВЕНЬ ${level} — ВЫБЕРИТЕ МУТАЦИЮ`;
    cardsEl.innerHTML = '';
    for (let cardIdx = 0; cardIdx < picks.length; cardIdx++) {
      const u = picks[cardIdx];
      const card = document.createElement('button');
      card.className = 'up-card';
      card.dataset.id = u.id;
      let crestHtml = '';
      if (u.branch) card.classList.add(`branch-${u.branch}`);
      if (u.curse) {
        card.classList.add('curse');
        crestHtml = '<div class="card-crest curse-crest"><svg class="inline-card-ico" viewBox="0 0 32 32"><use href="#ico-skull-hazard"/></svg> ПАТОЛОГИЯ</div>';
      }
      if (u.hybrid) card.classList.add('hybrid');
      let branchTag = '';
      if (u.branch) {
        branchTag = `<span class="b-ico"><svg class="inline-card-ico" viewBox="0 0 32 32"><use href="#ico-${u.branch}"/></svg></span> `;
      } else if (u.hybrid) {
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
        branchTag = `<span class="b-ico"><svg class="inline-card-ico" style="color:${color}" viewBox="0 0 48 48"><use href="#ico-hybrid-${hybridSlug}"/></svg></span> `;
        crestHtml = `<div style="text-align:center;margin:6px 0;"><svg class="hybrid-crest" style="color:${color}" viewBox="0 0 48 48"><use href="#ico-hybrid-${hybridSlug}"/></svg></div>`;
      }
      const cleanTitle = u.title.replace(/^[^\w\sа-яА-ЯёЁ]+/, '').trim();
      card.innerHTML = `
        <svg class="corner tl" viewBox="0 0 48 48"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48"><use href="#ico-corner-frame"/></svg>
        <h3><span class="key-hint" style="opacity:0.55;font-size:10px;margin-right:4px;">[${cardIdx + 1}]</span>${branchTag}${cleanTitle}${weaponLvlTag(u.id)}</h3>${crestHtml}<p>${resolveCardDesc(u)}</p>
      `;
      cardsEl.appendChild(card);
    }
    paused = true;
    sfx.setTailDrone(false);
    syncRerollBtn();
    upgradeModal.classList.add('show');
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
      upgradeModal.classList.remove('show');
    }
  });

  // ---------- HUD: геном организма, ДНК-панель и кулдауны оружий ----------
  function updateBranchChip(): void {
    // Гибриды перечислены в HYBRIDS - ищем по id
    const hy = HYBRIDS.find((h) => h.id === mainGenome);
    if (hy) {
      branchChipEl.innerHTML = `<svg class="chip-ico" viewBox="0 0 32 32"><use href="#ico-node-mutagen"/></svg> ${hy.name}`;
      branchChipEl.dataset.branch = 'hybrid';
      return;
    }
    const b = mainGenome as DnaBranchOrNeutral;
    branchChipEl.innerHTML = b === 'neutral' ? 'ОСОБЬ' : `<svg class="chip-ico" viewBox="0 0 32 32"><use href="#ico-${b}"/></svg> ${DNA_NAMES[b]}`;
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
    scaleChipEl.textContent = `ШКАЛА ${sc.id} — ${sc.name}`;
    scaleChipEl.title = sc.sub;
    const goal = sc.biomassGoal;
    const frac = Math.min(1, biomass / goal);
    bioFillEl.style.width = `${(frac * 100).toFixed(1)}%`;
    bioFillEl.classList.toggle('titan-ready', frac >= 1);
  }

  function setSlot(el: HTMLElement | null, frac: number, lvl: number): void {
    if (!el) return;
    const ring = el.querySelector('.wh-ring') as HTMLElement;
    const lvlEl = el.querySelector('.wh-lvl') as HTMLElement;
    const clamped = Math.max(0, Math.min(1, frac));
    ring.style.background = `conic-gradient(var(--cyan) ${Math.round(clamped * 360)}deg, rgba(255,255,255,0.08) 0deg)`;
    lvlEl.textContent = lvl > 0 ? `ур.${lvl}` : 'нет';
    el.classList.toggle('locked', lvl === 0);
    el.classList.toggle('ready', clamped >= 1 && lvl > 0);
  }

  function updateWeaponHud(): void {
    const spIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.spikes - 1));
    const spMax = SPIKES.cd[spIdx] / effAtkSpd();
    setSlot(wSlots.spikes, wlvl.spikes > 0 ? 1 - Math.max(0, spikesCd) / spMax : 0, wlvl.spikes);
    setSlot(wSlots.orbs, 1, wlvl.orbs);
    const nvIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.nova - 1));
    const nvMax = (NOVA.cd[nvIdx] * (genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd();
    setSlot(wSlots.nova, wlvl.nova > 0 ? 1 - Math.max(0, novaCd) / nvMax : 0, wlvl.nova);
    setSlot(wSlots.aura, 1, wlvl.aura);

    const mandIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.mandibles - 1));
    const mandMax = MANDIBLES.cd[mandIdx] / effAtkSpd();
    setSlot(wSlots.mandibles, wlvl.mandibles > 0 ? 1 - Math.max(0, mandiblesCd) / mandMax : 0, wlvl.mandibles);

    const cystIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.cysts - 1));
    const cystMax = CYSTS.cd[cystIdx] / effAtkSpd();
    setSlot(wSlots.cysts, wlvl.cysts > 0 ? 1 - Math.max(0, cystsCd) / cystMax : 0, wlvl.cysts);

    setSlot(wSlots.dash, 1 - Math.max(0, dashCd) / DASH.cd, 1);
    setSlot(wSlots.call, 1 - Math.max(0, callCd) / CALL.cd, 1);
  }

  // ---------- Навигация по модальным окнам (Главное Меню, Кодекс, Биолаб, Справка, Настройки) ----------
  function showModal(which: 'intro' | 'biolab' | 'codex' | 'help' | 'settings' | null): void {
    intro.classList.toggle('show', which === 'intro');
    biolabOverlay.classList.toggle('show', which === 'biolab');
    if (codexModal) codexModal.classList.toggle('show', which === 'codex');
    if (helpModal) helpModal.classList.toggle('show', which === 'help');
    if (settingsModal) settingsModal.classList.toggle('show', which === 'settings');

    if (which === 'biolab') renderBiolab();
    if (which === 'codex') renderCodex();
    if (which === 'settings') syncSettingsUI();
    if (which === 'intro' && menuRecordBadge) {
      const bl = loadBiolab();
      menuRecordBadge.textContent = `РЕКОРД: ${fmtTime(bl.bestTime)} · ЗАБЕГОВ ${bl.runs} · ОЧКИ: ${bl.points}`;
    }
  }

  function syncSettingsUI(): void {
    document.querySelectorAll('#opt-flashes .settings-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === gameSettings.screenFlashes);
    });
    document.querySelectorAll('#opt-shake .settings-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === gameSettings.cameraShake);
    });
    document.querySelectorAll('#opt-parallax .settings-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === (gameSettings.microParallax ? 'on' : 'off'));
    });
    if (sliderBgm) sliderBgm.value = String(gameSettings.bgmVolume);
    if (sliderSfx) sliderSfx.value = String(gameSettings.sfxVolume);
    if (bgmVolLabel) bgmVolLabel.textContent = `${gameSettings.bgmVolume}%`;
    if (sfxVolLabel) sfxVolLabel.textContent = `${gameSettings.sfxVolume}%`;
    document.querySelectorAll('#opt-quality .settings-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === gameSettings.quality);
    });
    document.querySelectorAll('#opt-lang .settings-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === getLocale());
    });
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
        boss: ENEMY_SPRITES.titan,
        titan: ENEMY_SPRITES.titan,
        healer: ENEMY_SPRITES_V2.healer,
        mirror: ENEMY_SPRITES_V2.mirror,
        colony: ENEMY_SPRITES_V2.colony,
        splitter: ENEMY_SPRITES_V2.splitter,
        brood: ENEMY_SPRITES_V2.brood,
      };
      if (map[entryId]) return map[entryId];
    }
    return `<svg viewBox="0 0 32 32"><use href="#${fallbackIconId}"/></svg>`;
  }

  function renderCodex(): void {
    const unlocked = loadCodex();
    if (codexStatsEl) {
      codexStatsEl.textContent = `ОТКРЫТО: ${unlocked.size} / ${CODEX_ENTRIES.length}`;
    }

    const filtered = CODEX_ENTRIES.filter((e) => {
      if (codexCategory === 'all') return true;
      return e.category === codexCategory;
    });

    const maxPage = Math.max(0, Math.ceil(filtered.length / CODEX_PAGE_SIZE) - 1);
    if (codexPage > maxPage) codexPage = maxPage;
    if (codexPage < 0) codexPage = 0;

    if (codexPageInfo) {
      codexPageInfo.textContent = `СТРАНИЦА ${codexPage + 1} / ${Math.max(1, maxPage + 1)}`;
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
      const catLabel = entry.category === 'enemy' ? 'ВРАГ РОЯ' : entry.category === 'hybrid' ? 'ВЕЛИКИЙ ГИБРИД' : 'ШТАММ ДНК';
      item.innerHTML = `
        <div class="codex-item-top">
          <div class="codex-icon-wrap" style="color: ${isUnl ? entry.color : '#475569'};">
            ${codexIconSvg(entry.id, entry.category, entry.iconId)}
          </div>
          <div class="codex-meta">
            <span class="codex-cat-badge" style="color: ${entry.color};">${catLabel}</span>
            <div class="codex-item-title" style="color: ${isUnl ? entry.color : '#94a3b8'};">
              ${isUnl ? entry.name : '??? НЕИЗВЕСТНАЯ ЗАПИСЬ'}
            </div>
          </div>
        </div>
        <div class="codex-lore">${isUnl ? entry.lore : 'Биологический образец не исследован. Встретьте или активируйте его в бою.'}</div>
        <div class="codex-bonus">${isUnl && entry.bonus ? `<svg class="inline-card-ico" viewBox="0 0 32 32"><use href="#ico-symbiont"/></svg> БОНУС: ${entry.bonus}` : 'ТРЕБУЕТСЯ ИССЛЕДОВАНИЕ'}</div>
      `;
      codexGridEl.appendChild(item);
    }
  }

  // Переключение вкладок Кодекса
  document.querySelectorAll('.codex-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.codex-tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
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
      document.querySelectorAll('.help-tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      const targetId = 'help-content-' + tabBtn.getAttribute('data-tab');
      document.querySelectorAll('.help-content').forEach((c) => {
        (c as HTMLElement).style.display = c.id === targetId ? 'block' : 'none';
      });
    });
  });

  let helpOpenedFromGame = false;
  if (helpModalOpenBtn) helpModalOpenBtn.addEventListener('click', () => { helpOpenedFromGame = false; showModal('help'); });
  if (helpCloseBtn) helpCloseBtn.addEventListener('click', () => {
    if (helpOpenedFromGame) {
      helpOpenedFromGame = false;
      paused = false;
      sfx.startBgm();
      showModal(null);
    } else {
      showModal(!started || paused ? 'intro' : null);
    }
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
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener('input', () => {
      gameSettings.sfxVolume = Number(sliderSfx.value);
      if (sfxVolLabel) sfxVolLabel.textContent = `${gameSettings.sfxVolume}%`;
      sfx.setSfxVolume(gameSettings.sfxVolume / 100);
      saveSettings();
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
    if (startBtnLabel) startBtnLabel.textContent = started ? t('resume_run') : t('start_run');
    const dcLabel = document.getElementById('daily-challenge-label');
    if (dcLabel) {
      const ch = getDailyChallenge();
      dcLabel.textContent = `${t('daily_challenge')}: ${ch.title}`;
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
    if (restartBtn) restartBtn.textContent = t('restart_btn');
    if (endlessBtn) endlessBtn.textContent = t('endless_btn');
    if (savePortraitBtn) {
      const sp = savePortraitBtn.querySelector('span');
      if (sp) sp.textContent = t('save_portrait');
    }
    if (biolabBtn) {
      const sp = biolabBtn.querySelector('span');
      if (sp) sp.textContent = t('biolab');
    }
    const codexTitleEl = document.querySelector('#codex .codex-title');
    if (codexTitleEl) codexTitleEl.textContent = t('codex_title');
    const settingsTitleEl = document.querySelector('#settings-modal .settings-title');
    if (settingsTitleEl) settingsTitleEl.textContent = t('settings_title');
    if (settingsCloseBtn) settingsCloseBtn.textContent = t('settings_close');
    if (biolabCloseBtn) biolabCloseBtn.textContent = t('biolab_close');
    const expBtn = document.getElementById('export-save-btn');
    if (expBtn) expBtn.textContent = t('export_save');
    const impBtn = document.getElementById('import-save-btn');
    if (impBtn) impBtn.textContent = t('import_save');
    syncRerollBtn();
  }
  applyI18n();

  const SAVE_KEYS = [
    'lumivore-biolab-v1',
    'lumivore_codex_v1',
    'lumivore_achievements_v1',
    'lumivore_leaderboard_v1',
    'lumivore_settings_v1',
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
      showToast('СЕЙВ ЭКСПОРТИРОВАН');
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
        refreshCodexBonuses();
        showToast('СЕЙВ ИМПОРТИРОВАН', 'success');
      } catch {
        showToast('ОШИБКА ИМПОРТА СЕЙВА', 'danger');
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

  // ---------- Биолаб: мета-прогрессия между забегами (Этап 6.1) ----------
  function renderBiolab(): void {
    const bl = loadBiolab();
    const ownedCount = BIOLAB_UNLOCKS.filter((u) => isUnlocked(u.id)).length;
    const pct = Math.round((ownedCount / BIOLAB_UNLOCKS.length) * 100);
    biolabPointsEl.innerHTML =
      `<svg class="bio-icon bio-violet" viewBox="0 0 32 32"><use href="#ico-node-incubator"/></svg> ${bl.points} ОЧКОВ · ПРОГРЕСС ${ownedCount}/${BIOLAB_UNLOCKS.length} (${pct}%) · РЕКОРД ${fmtTime(bl.bestTime)}`;
    biolabListEl.innerHTML = '';
    for (const u of BIOLAB_UNLOCKS) {
      const bought = isUnlocked(u.id);
      const can = !bought && bl.points >= u.cost;
      const card = document.createElement('button');
      card.className = 'bl-card' + (bought ? ' owned' : can ? ' afford' : '');
      card.dataset.id = u.id;
      let ico = 'ico-node-gen';
      if (u.id.includes('orbs')) ico = 'ico-weapon-orbs';
      else if (u.id.includes('aura')) ico = 'ico-weapon-aura';
      else if (u.id.includes('tail')) ico = 'ico-vermis';
      else if (u.id.includes('nova')) ico = 'ico-weapon-nova';
      else if (u.id.includes('magnet')) ico = 'ico-node-magnet';
      else if (u.id.includes('regen')) ico = 'ico-node-gen';
      else if (u.id === 'unlock_vermis') ico = 'ico-vermis';
      else if (u.id === 'unlock_chimera') ico = 'ico-chimera';
      else if (u.id === 'unlock_mycelium') ico = 'ico-mycelium';
      else if (u.id === 'unlock_symbiont') ico = 'ico-symbiont';

      card.innerHTML =
        `<div class="bl-head"><h3><svg class="bio-icon bio-cyan" viewBox="0 0 32 32" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><use href="#${ico}"/></svg>${u.name}</h3><span class="bl-cost">${bought ? 'КУПЛЕНО' : u.cost + ' ОЧКОВ'}</span></div>` +
        `<p>${u.effect}</p>`;
      biolabListEl.appendChild(card);
    }
  }

  biolabListEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.bl-card') as HTMLElement | null;
    if (!card || !card.dataset.id) return;
    if (purchase(card.dataset.id)) {
      sfx.biolabUnlock();
      showToast('БИОЛАБ: улучшение куплено', 'success');
    } else {
      sfx.capture(false);
    }
    renderBiolab();
  });
  if (biolabOpenBtn) biolabOpenBtn.addEventListener('click', () => showModal('biolab'));
  if (biolabBtn) biolabBtn.addEventListener('click', () => showModal('biolab'));
  biolabCloseBtn.addEventListener('click', () => showModal(!started || paused ? 'intro' : null));
  savePortraitBtn.addEventListener('click', () => {
    if (!lastGenome) return;
    downloadPortrait(portraitCanvas, `lumivore-${lastGenome.branch}-${Math.round(lastGenome.survivalTime)}s.png`);
  });

  // Стартовые бонусы Биолаба применяются к каждому новому забегу
  function applyBiolabStart(): void {
    if (isUnlocked('start_orbs')) { wlvl.orbs = 1; wlvl.spikes = 0; }
    if (isUnlocked('start_aura')) { wlvl.aura = 1; maxHp -= 20; player.hp = Math.min(player.hp, maxHp); }
    if (isUnlocked('start_tail_xl')) tailLen = TAIL.startLen * 2;
    if (isUnlocked('start_nova2')) { wlvl.nova = 2; novaCd = NOVA.cd[1]; }
    if (isUnlocked('perm_regen')) regen += 0.3;
    if (isUnlocked('perm_magnet')) magnetR *= 1.25;
    if (isUnlocked('perm_dmg')) dmgMul *= 1.1;
    // Синтез генома: старт с 1 ДНК-уровнем ветки
    if (isUnlocked('unlock_vermis')) { dnaXp.vermis = DNA_LEVELS[0]; lastDnaLvl.vermis = 1; }
    if (isUnlocked('unlock_chimera')) { dnaXp.chimera = DNA_LEVELS[0]; lastDnaLvl.chimera = 1; }
    if (isUnlocked('unlock_mycelium')) { dnaXp.mycelium = DNA_LEVELS[0]; lastDnaLvl.mycelium = 1; }
    if (isUnlocked('unlock_symbiont')) { dnaXp.symbiont = DNA_LEVELS[0]; lastDnaLvl.symbiont = 1; }
  }

  // ---------- Старт / пауза / рестарт ----------
  introStartBtn.addEventListener('click', () => {
    started = true;
    paused = false;
    sfx.startBgm();
    showModal(null);
    if (startBtnLabel) startBtnLabel.textContent = t('resume_run');
  });

  const dailyChallengeBtn = document.getElementById('daily-challenge-btn');
  if (dailyChallengeBtn) {
    dailyChallengeBtn.addEventListener('click', () => {
      const ch = getDailyChallenge();
      restartBtn.click();
      started = true;
      paused = false;
      dnaXp[ch.branch] = Math.max(dnaXp[ch.branch], DNA_LEVELS[0]);
      lastDnaLvl[ch.branch] = Math.max(lastDnaLvl[ch.branch], 1);
      updateDnaHud();
      updateBranchChip();
      showModal(null);
      showToast(`ИСПЫТАНИЕ ДНЯ (${ch.dayKey}): ${ch.title}`, 'warn');
    });
  }
  helpBtn.addEventListener('click', () => {
    if (!started || gameOver) return;
    paused = true;
    helpOpenedFromGame = true;
    sfx.setTailDrone(false);
    sfx.stopBgm();
    showModal('help');
  });

  restartBtn.addEventListener('click', () => {
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
    regen = 0.5;
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
    xpNext = 6;
    pendingUps = 0;
    gameTime = 0;
    spawnT = 1;
    nextBossAt = BOSS_FIRST_AT;
    nextPickDelta = 0;
    incubatorSpawnT = 20;
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
    paused = false;
    gameOver = false;
    sfx.startBgm();
    modal.classList.remove('show');
    upgradeModal.classList.remove('show');
    if (startBtnLabel) startBtnLabel.textContent = 'ПРОДОЛЖИТЬ';
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
      const halfViewW = (SIM_WIDTH / 2) / camZoom;
      const halfViewH = (SIM_HEIGHT / 2) / camZoom;
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
        showToast(`OVERDRIVE TIER ${overdriveTier}: ФРАКТАЛ РАСШИРЯЕТСЯ`);
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
    showToast(`МЕТАМОРФОЗ: ${SCALES[scaleIdx].name} — ${SCALES[scaleIdx].sub}`);
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

  /** Финал забега: смерть (win=false) или Фрактальный Парадокс (win=true) */
  function finishRun(win: boolean): void {
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
    for (const ach of newAchs) {
      showToast(`ДОСТИЖЕНИЕ: ${ach.title}`, 'success');
    }
    const topStr = topRecords.slice(0, 3).map((r, i) => `#${i + 1} ${fmtTime(r.time)}`).join(' · ');
    modalTitle.textContent = win ? 'ФРАКТАЛЬНЫЙ ПАРАДОКС' : 'ОРГАНИЗМ РАСТВОРЁН';
    modalTitle.classList.toggle('win', win);
    modalTitle.classList.toggle('lose', !win);
    const hybridDef = HYBRIDS.find((h) => h.id === mainGenome);
    const genomeLabel = mainGenome === 'neutral'
      ? 'БАЗОВАЯ ОСОБЬ'
      : hybridDef
        ? `ГИБРИД: ${hybridDef.name}`
        : `ГЕНОМ: ${DNA_NAMES[mainGenome as DnaBranch] ?? mainGenome}`;
    modalSub.textContent = win
      ? 'Ты стал мозгом Макро-Левиафана. Левиафан — лишь молекула в реакторе «ЕвроКорп-3». Каждый новый забег — новая вселенная.'
      : `${genomeLabel} · +${blAfter.points - bl.points} ОЧКОВ БИОЛАБА`;
    const dmgOther = Math.max(0, Math.round(damageDealt - dmgTail - dmgRing));
    deathStatsEl.innerHTML =
      `<span class="stat-metric-row"><svg class="bio-icon bio-cyan" viewBox="0 0 32 32"><use href="#ico-timer"/></svg> ${fmtTime(gameTime)}${genome.record ? ' <svg class="bio-icon bio-amber" viewBox="0 0 32 32"><use href="#ico-record-badge"/></svg> РЕКОРД' : ''}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-crimson" viewBox="0 0 32 32"><use href="#ico-skull-hazard"/></svg> ${kills} УБИТО</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32"><use href="#ico-weapon-spikes"/></svg> УР.${level}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-lime" viewBox="0 0 32 32"><use href="#ico-tail-length"/></svg> ХВОСТ ${Math.round(tailMaxReached)}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32"><use href="#ico-node-dominance"/></svg> УЗЛЫ ${nodesHeldMax}/${bioNodes.length}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-violet" viewBox="0 0 32 32"><use href="#ico-macro-scale"/></svg> ШКАЛА ${scaleMaxReached}/5${overdriveTier > 0 ? ` · OD+${overdriveTier}` : ''}</span>` +
      `<span class="stat-metric-row"><svg class="bio-icon bio-orange" viewBox="0 0 32 32"><use href="#ico-damage-nova"/></svg> УРОН ${Math.round(damageDealt).toLocaleString('ru')}</span>` +
      `<span class="stat-metric-row" style="font-size:10px;opacity:0.8;">Хвост ${Math.round(dmgTail)} · Кольцо ${Math.round(dmgRing)} · Оружие ${dmgOther}</span>` +
      (topStr ? `<span class="stat-metric-row" style="color:var(--cyan);">ТОП (${mainGenome}): ${topStr}</span>` : '');
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
    drawPortrait(null);
    void sim.captureFrame().then((fc) => { if (fc && gameOver) drawPortrait(fc); });
    modal.classList.add('show');
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
        showToast('ПАКТ УРОБОРОСА: Самопознание — это тоже форма голода (+5 HP)');
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
    showToast('<svg class="bio-icon bio-lime" viewBox="0 0 32 32"><use href="#ico-node-incubator"/></svg> ГНЕЗДО СПОР УНИЧТОЖЕНО! +14 СФЕР ДНК');
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
    if (roll < 0.36) {
      // Кислотный прилив: зона 3.5с предупреждения -> 9с едкой кислоты
      const r = 160 + scaleIdx * 18;
      const dist = 210 + Math.random() * 140;
      const ax = Math.max(r + 20, Math.min(curWorldW - r - 20, player.x + Math.cos(ang) * dist));
      const ay = Math.max(r + 20, Math.min(curWorldH - r - 20, player.y + Math.sin(ang) * dist));
      anomalies.push({ kind: 'acid', x: ax, y: ay, r, warnT: 3.5, life: 9, maxLife: 9, spawnCd: 0 });
      showToast('<svg class="bio-icon bio-amber" viewBox="0 0 32 32"><use href="#ico-skull-hazard"/></svg> КИСЛОТНЫЙ ПРИЛИВ В СЕКТОРЕ');
      sfx.anomalyAlert();
    } else if (roll < 0.72) {
      // Гнездо спор: кокон, плодящий выводок, пока не уничтожен (особенно уязвим к Кольцу Смерти)
      const dist = 260 + Math.random() * 150;
      const ax = Math.max(70, Math.min(curWorldW - 70, player.x + Math.cos(ang) * dist));
      const ay = Math.max(70, Math.min(curWorldH - 70, player.y + Math.sin(ang) * dist));
      const maxHp = Math.round(180 * (1 + scaleIdx * 0.5));
      anomalies.push({ kind: 'cocoon', x: ax, y: ay, r: 30, warnT: 1.5, life: 32, maxLife: 32, hp: maxHp, maxHp, spawnCd: 2.5 });
      overlay.spawnPulse(ax, ay, 0xa3e635, 110);
      showToast('<svg class="bio-icon bio-lime" viewBox="0 0 32 32"><use href="#ico-node-incubator"/></svg> ГНЕЗДО СПОР: СХЛОПНИТЕ КОЛЬЦОМ!');
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
      showToast('<svg class="bio-icon bio-cyan" viewBox="0 0 32 32"><use href="#ico-mycelium"/></svg> ВСПЫШКА МИТОЗА: ПИТАТЕЛЬНАЯ СРЕДА (10 с)');
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
    const t = now / 1000;

    // Метаморфоз: bullet-time замедляет весь мир на переходе масштаба
    if (metamorphT > 0) metamorphT -= rawDt;
    const timeScale = metamorphT > 0 ? METAMORPH.timeScale : 1;
    const dt = rawDt * timeScale; // игровое время: таймеры и физика мира

    // Камера: плавное слежение за игроком и твин зума текущей шкалы бытия
    const zoomTarget = SCALES[scaleIdx].zoom;
    camZoom += (zoomTarget - camZoom) * Math.min(1, rawDt * 2.0);

    camX += (player.x - camX) * Math.min(1, rawDt * 5.0);
    camY += (player.y - camY) * Math.min(1, rawDt * 5.0);

    const halfViewW = (SIM_WIDTH / 2) / camZoom;
    const halfViewH = (SIM_HEIGHT / 2) / camZoom;
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

    if (started && !paused && !gameOver) {
      gameTime += dt;
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
      if (gp.pausePressed && started && !gameOver && pendingUps === 0) {
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
        dashCd = DASH.cd;
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
      player.x = Math.max(16, Math.min(curWorldW - 16, player.x + (mx / mLen) * spdNow * dt));
      player.y = Math.max(16, Math.min(curWorldH - 16, player.y + (my / mLen) * spdNow * dt));
      player.iframe = Math.max(0, player.iframe - dt);
      player.hp = Math.min(maxHp, player.hp + (regen + nodeRegenBonus + codexBonuses.regenAdd) * dt);

      // Экономика хвоста: движение сжигает энергию, хвост растворяется.
      // Усилитель (Этап 2.1) замораживает таяние, пока узел ваш;
      // Нейросеть (2+ узла) и Вспышка митоза замедляют таяние и питают хвост.
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
      if (!tailFreeze && !isVoidEvent) {
        if (isMoving) {
          const melt = moveCost() * (trailEnemy ? STRAIN.enemyMeltMul : 1) * (cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul;
          tailLen = Math.max(TAIL.minLen, tailLen - melt * dt);
        } else {
          // Метаболический голод неподвижности: если стоять на месте, организм тратит биомассу хвоста
          const idleMelt = TAIL.idleCost * (trailEnemy ? STRAIN.enemyMeltMul : 1) * (cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul;
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
      if (tailLen <= TAIL.minLen + 0.1 && !isMoving && !tailFreeze && !isVoidEvent) {
        player.hp = Math.max(0, player.hp - 10 * dt);
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
        showToast(unstableKind === 0 ? '<svg class="bio-icon bio-magenta" viewBox="0 0 32 32"><use href="#ico-chimera"/></svg> ГЕНОМ ДРОЖИТ: скорость -45%'
          : unstableKind === 1 ? '<svg class="bio-icon bio-magenta" viewBox="0 0 32 32"><use href="#ico-chimera"/></svg> ГЕНОМ ДРОЖИТ: хвост тает вдвое'
          : '<svg class="bio-icon bio-magenta" viewBox="0 0 32 32"><use href="#ico-chimera"/></svg> ГЕНОМ ДРОЖИТ: атака замедлена');
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
        showToast('СТРАЖ ЦИКЛА ПРИБЛИЖАЕТСЯ');
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
        showToast(`ТИТАН МАСШТАБА ПРОБУДИЛСЯ — ${SCALES[scaleIdx].name}`);
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
        showToast('<svg class="bio-icon bio-magenta" viewBox="0 0 32 32"><use href="#ico-node-mutagen"/></svg> МУТАЦИЯ: элита приближается');
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
          let r = Math.random() * totalW;
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
        anomalyCd = 46 + Math.random() * 18;
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

      // Враги: погоня + лёгкое расталкивание + контактный урон + экосистема (Этап 4.1)
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
          killEnemy(e, i);
          continue;
        }
        const def = ENEMIES[e.type];
        // Вражеский генератор (🔋): ближние враги +25% скорость (Этап 2.1);
        // Шкала бытия: каждый следующий масштаб быстрее предыдущего
        let eSpeed = def.speed * waves.speedMul() * SCALES[scaleIdx].enemySpeedMul;
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
            showToast(e.titan ? 'ТИТАН ВПАЛ В ЯРОСТЬ! РАСТРЕСКИВАНИЕ ПАНЦИРЯ!' : 'СТРАЖ ЦИКЛА ВПАЛ В ЯРОСТЬ!');
          }
          if (e.enragedPhase) eSpeed *= 1.4;
        }

        // Цель: заражённые союзники охотятся на штамм врага (Этап 3.1 «Инфицирование»)
        let tx = player.x;
        let ty = player.y;
        let keepDist = 0; // >0: держать дистанцию (плеватель/целитель/зеркало)
        if (e.infected > 0) {
          let bestD = 1e9;
          for (const o of enemies) {
            if (o === e || o.infected > 0) continue;
            const dd = Math.hypot(o.x - e.x, o.y - e.y);
            if (dd < bestD) { bestD = dd; tx = o.x; ty = o.y; }
          }
          if (bestD > 1e8) { tx = player.x; ty = player.y; }
        } else if (e.type === 'spitter') {
          keepDist = 190;
        } else if (e.type === 'healer') {
          keepDist = 260;
        } else if (e.type === 'mirror') {
          keepDist = 150;
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
              applyDamageToPlayer(def.dmg);
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
          applyDamageToPlayer(incoming);
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
                  applyDamageToPlayer(inDmg * 0.15);
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
          applyDamageToPlayer(p.dmg);
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
        novaCd = (NOVA.cd[safeNovaIdx] * (genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd();
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

      // Споровые цисты (Cysts)
      cystsCd -= dt;
      if (wlvl.cysts > 0 && cystsCd <= 0) {
        const cIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, wlvl.cysts - 1));
        cystsCd = CYSTS.cd[cIdx] / effAtkSpd();
        const count = CYSTS.maxCysts[cIdx];
        const dmg = CYSTS.dmg[cIdx] * effDmg();
        const r = CYSTS.radius[cIdx];
        const MAX_CYSTS = 24;
        for (let k = 0; k < count; k++) {
          if (liveCysts.length >= MAX_CYSTS) liveCysts.shift();
          const dropA = Math.atan2(-playerDirY, -playerDirX) + (Math.random() - 0.5) * 1.2;
          const dropD = 18 + Math.random() * 26;
          liveCysts.push({
            x: player.x + Math.cos(dropA) * dropD,
            y: player.y + Math.sin(dropA) * dropD,
            r,
            dmg,
            life: 14,
          });
        }
        sfx.cyst();
      }
      for (let i = liveCysts.length - 1; i >= 0; i--) {
        const cyst = liveCysts[i];
        cyst.life -= dt;
        let explode = cyst.life <= 0;
        if (!explode) {
          for (const e of nearby(cyst.x, cyst.y, cyst.r + 20)) {
            if (Math.hypot(e.x - cyst.x, e.y - cyst.y) < cyst.r + e.radius) {
              explode = true;
              break;
            }
          }
        }
        if (explode) {
          sfx.nova();
          overlay.spawnPulse(cyst.x, cyst.y, 0x39ff14, cyst.r * 1.8);
          sim.spawnPlayerSpores(toSimX(cyst.x), toSimY(cyst.y), 300);
          for (const e of nearby(cyst.x, cyst.y, cyst.r * 1.8)) {
            if (Math.hypot(e.x - cyst.x, e.y - cyst.y) < cyst.r * 1.8 + e.radius) {
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

      // Сферы ДНК: вялый дрейф к игроку отовсюду + магнит вблизи
      const effMagnet = magnetR * (magnetNodeOwned ? 2.5 : 1) * codexBonuses.magnetMul;
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
            o.vx += (dx / d) * 30 * dt;
            o.vy += (dy / d) * 30 * dt;
            o.vx *= Math.max(0, 1 - dt * 4);
            o.vy *= Math.max(0, 1 - dt * 4);
          }
        } else if (eliteMagnetPull(o, dt)) {
          // Магнитная элита (Этап 4.3) тянет эту душу к себе
        } else {
          // не даём осколкам застревать вдалеке навсегда
          o.vx += (dx / d) * 30 * dt;
          o.vy += (dy / d) * 30 * dt;
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
            if (resonanceMult >= 2.0) showToast(`<svg class="bio-icon bio-cyan" viewBox="0 0 32 32"><use href="#ico-symbiont"/></svg> СИМБИОТИЧЕСКИЙ РЕЗОНАНС x${resonanceMult.toFixed(1)}`);
          }
          updateResonanceHud();

          // Душа съедена: опыт + энергия хвоста + ДНК её генома + биомасса шкалы
          xp += o.value * xpMul * resonanceMult;
          tailLen = Math.min(maxTail(), tailLen + o.value * TAIL.soulGain);
          sinceSoul = 0;
          sfx.eat();
          dnaXp[o.dna] += o.value;
          biomass += o.value * resonanceMult;
          updateScaleHud();
          const lvl = dnaLvl(o.dna);
          if (lvl > lastDnaLvl[o.dna]) {
            lastDnaLvl[o.dna] = lvl;
            showToast(`<svg class="bio-icon" viewBox="0 0 32 32"><use href="#ico-${o.dna}"/></svg> ДНК ${DNA_NAMES[o.dna]}: уровень ${lvl}`);
            sfx.levelUp();
            overlay.spawnPulse(player.x, player.y, DNA_COLORS[o.dna], 70);
            updateDnaHud();
          }
          // Оба родительских генома гибрида созрели - сообщаем один раз
          for (const h of HYBRIDS) {
            if (hybridAvail(h.id) && !hybridNotified.has(h.id)) {
              hybridNotified.add(h.id);
              showToast(`<svg class="bio-icon bio-amber" viewBox="0 0 32 32"><use href="#ico-node-mutagen"/></svg> ГИБРИДИЗАЦИЯ ВОЗМОЖНА: ${h.name}`);
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
        xpNext = 5 + level * 3;
        pendingUps++;
        maxHp = Math.min(220, maxHp + GROWTH.hpPerLvl);
        player.hp = Math.min(maxHp, player.hp + 14);
        overlay.spawnPulse(player.x, player.y, 0xbdfdf8, 80);
        sim.spawnPlayerSpores(toSimX(player.x), toSimY(player.y), 1600);
        openUpgrades();
      }

      // Смерть игрока: геном забега + портрет организма (см. finishRun)
      if (player.hp <= 0) {
        player.hp = 0;
        finishRun(false);
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
        showToast('ФЕРОМОН-ЗОВ');
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
      // Захват узлов: readback плотности штаммов раз в ~160 мс (Этап 2.1).
      // Последняя запись - зонд под игроком: свой штамм ускоряет, чужой растворяет
      const onNodeStatsCb = (stats: NodeStat[]): void => {
        stats.forEach((s, i) => {
          if (i >= bioNodes.length) {
            trailOwn = s.playerDensity >= STRAIN.densityThreshold;
            trailEnemy = s.enemyDensity >= STRAIN.densityThreshold;
            return;
          }
          const n = bioNodes[i];
          if (!n) return;
          // Пси-Сеть: захват узлов ускорен - сверхразум тянет территорию дистанционно
          const psiBoost = (hybridsTaken.has('psi_web') ? 1.7 : 1) * codexBonuses.captureSpeedMul;
          const delta = (s.playerDensity - s.enemyDensity) * 0.05 * psiBoost;
          n.capture = Math.max(-1, Math.min(1, n.capture + delta));
          const prev = n.owner;
          n.owner = n.capture > 0.4 ? 1 : n.capture < -0.4 ? -1 : 0;
          if (n.owner !== prev) onNodeCaptured(n);
        });
        // Статистика территории для генома забега
        let held = 0;
        for (const n of bioNodes) if (n.owner === 1) held++;
        nodesHeldMax = Math.max(nodesHeldMax, held);
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
        t,
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
      levelEl.textContent = `УР. ${level}`;
      timerEl.textContent = fmtTime(gameTime);
      waveEl.textContent = `ЦИКЛ ${Math.floor(gameTime / 30) + 1}`;
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
          chip += `<svg class="chip-node-ico" viewBox="0 0 32 32" title="${NODE_NAMES[n.kind]}: ${NODE_POS_EFFECTS[n.kind]}"><use href="#ico-node-${n.kind}"/></svg>`;
        }
      }
      nodesChipEl.innerHTML = chip || '<span class="dim">нет узлов</span>';
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
          showToast('КАРАПАКС: ЩИТ ГОТОВ');
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
          showToast('АБИССАЛЬНЫЙ СВЕТ: РОЙ ОСЛЕПЛЁН');
        }
      }
    } else {
      prevCamX = camX;
      prevCamY = camY;
      // До старта / на паузе / после конца: пыль дрейфует без маяков
      sfx.setTailDrone(false);
      sim.step(t, dt, [], [], { x: -500, y: -500 }, -0.75, 0.90, SCALES[scaleIdx].id, 0, 0, () => {});
    }

    // Био-радар чашки Петри: обновление миникарты и направлений
    if (started && !gameOver) {
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

    // Био-радар: стрелки к скрытым за экраном вражеским узлам, титанам и гнёздам спор
    const radarMarkers: { angle: number; dist: number; color: number; icon: 'boss' | 'titan' | 'node' }[] = [];
    if (started && !gameOver) {
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
        if (n.owner === 1) continue;
        const dx = n.x - camX;
        const dy = n.y - camY;
        if (Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30) {
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
          settings: {
            parallax: gameSettings.microParallax,
            subtleShake: gameSettings.cameraShake === 'subtle',
            softFlashes: gameSettings.screenFlashes === 'soft',
          },
        },
        t,
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
      showToast(`OVERDRIVE TIER ${overdriveTier}: БЕСКОНЕЧНЫЙ ФРАКТАЛ АКТИВЕН`);
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
