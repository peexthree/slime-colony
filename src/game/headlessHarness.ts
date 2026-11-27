// Headless-харнесс балансировки LUMIVORE: полная боевая симуляция без браузера.
// CLI-обёртка - scripts/simulate.ts, smoke-тесты - src/game/__tests__/headlessHarness.test.ts.
//
// Как это работает (модули src/game не модифицируются, только импортируются):
// 1) installHeadlessEnv() ставит заглушки window/document/localStorage в Node,
//    чтобы ui-модули (toast/hud/upgrades/modals), дергаемые из боевого цикла,
//    не падали: showToast зовёт window.setTimeout, openUpgrades строит карточки
//    через document.createElement, renderPortrait пишет в canvas 2d-контекст.
// 2) createHeadlessCtx() собирает полноценный Ctx: реальный RunState
//    (createRunState), реальный WaveDirector (createWaveDirector), моки
//    overlay/sim/sfx/radar/gamepad/joystick и универсальный заглушечный dom.
// 3) runSingleRun() крутит stepSimulation(ctx, 1/60) заданное число минут
//    игрового времени с простым кайт-ИИ (мышь как цель: собор душ, отход от
//    угроз, рывок в упор). Прокачка - настоящая механика chooseUpgrade
//    (окно апгрейдов открывается openUpgrades на заглушечном DOM), выбор
//    карточек - фиксированный приоритет арсенала ветки.
// 4) Метрики прогона и агрегаты по ветке для оценки винрейтов.
import {
  DNA_LEVELS,
  HYBRIDS,
  type DnaBranch,
  type HybridId,
  type WeaponId,
} from '../engine/types';
import { mulberry32 } from '../engine/challenge';
import type { PixiOverlay } from '../engine/PixiOverlay';
import type { PhysarumSim } from '../engine/physarumSim';
import type { Sfx } from '../engine/audio';
import type { PetriRadar } from '../engine/radar';
import type { Joystick } from '../engine/joystick';
import type { GamepadController } from '../engine/gamepad';
import type { WaveDirector } from '../engine/waves';
import type { Dom } from '../ui/dom';
import type { Ctx, Services } from './context';
import { createRunState, refreshResonance } from './state';
import { stepSimulation, FIXED_DT } from './simulation';
import { createWaveDirector } from './enemies';
import { spawnNodesForScale } from './nodes';
import { defaultSettings } from './save';
import { applyHybrid, chooseUpgrade, refreshMainGenome, UPGRADES } from '../ui/upgrades';

// ============================ ЗАГЛУШКИ ОКРУЖЕНИЯ ============================

type StubProps = Record<string, unknown>;

/** classList-заглушка: операции no-op, contains всегда false */
function stubClassList(): { add: (...c: string[]) => void; remove: (...c: string[]) => void; toggle: (c: string, f?: boolean) => void; contains: (c: string) => boolean } {
  return {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false,
  };
}

/** Универсальная вызываемая заглушка: функция и объект одновременно.
 *  Нужна для неизвестных свойств DOM-элементов и 2d-контекста: код игры и
 *  вызывает их как методы (bloomCtx.drawImage, card.focus), и читает/пишет
 *  как свойства (gradient.addColorStop, canvas.width). */
function stubCallable(): unknown {
  const fn = function stubFn() {
    return stubCallable();
  } as unknown as StubProps;
  const handler: ProxyHandler<StubProps> = {
    get(t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (Object.prototype.hasOwnProperty.call(t, prop)) return t[prop];
      const nested = stubCallable();
      t[prop as string] = nested;
      return nested;
    },
    set(t, prop, value) {
      t[prop as string] = value;
      return true;
    },
    apply() {
      return stubCallable();
    },
  };
  return new Proxy(fn, handler);
}

/** Универсальный DOM-элемент-заглушка: любые свойства читаются/пишутся,
 *  известные методы - no-op, незнакомые свойства - вызываемые заглушки. */
function stubElement(): HTMLElement {
  const target: StubProps = {
    style: {},
    dataset: {},
    classList: stubClassList(),
    children: [],
    hidden: false,
    width: 960,
    height: 540,
    isConnected: false,
    appendChild: (child: unknown) => child,
    insertBefore: (child: unknown) => child,
    querySelector: () => stubElement(),
    querySelectorAll: () => [],
    focus: () => {},
    click: () => {},
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    closest: () => null,
    getContext: () => stub2dCtx(),
  };
  const handler: ProxyHandler<StubProps> = {
    get(t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (Object.prototype.hasOwnProperty.call(t, prop)) return t[prop];
      // Мемоизованная вызываемая заглушка для прочих свойств (querySelector('.x') и т.п.)
      const nested = stubCallable();
      t[prop as string] = nested;
      return nested;
    },
    set(t, prop, value) {
      t[prop as string] = value;
      return true;
    },
  };
  return new Proxy(target, handler) as unknown as HTMLElement;
}

/** CanvasRenderingContext2D-заглушка: известные методы рисования no-op,
 *  градиенты/метрики - валидные объекты, незнакомые - вызываемые заглушки */
function stub2dCtx(): CanvasRenderingContext2D {
  const target: StubProps = {
    canvas: null,
    drawImage: () => {},
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    rect: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    setTransform: () => {},
    fillText: () => {},
    strokeText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
  };
  const handler: ProxyHandler<StubProps> = {
    get(t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (Object.prototype.hasOwnProperty.call(t, prop)) return t[prop];
      const nested = stubCallable();
      t[prop as string] = nested;
      return nested;
    },
    set(t, prop, value) {
      t[prop as string] = value;
      return true;
    },
  };
  return new Proxy(target, handler) as unknown as CanvasRenderingContext2D;
}

let headlessEnvInstalled = false;
/** In-memory store заглушки localStorage: сбрасывается перед каждым прогоном,
 *  чтобы кодекс/ачивки/биолаб предыдущего прогона не усиливали следующий
 *  (в живой игре кодекс персистентен, но для честного сравнения сборок каждый
 *  прогон должен стартовать с одинаковым дефолтным состоянием). */
const headlessSaveStore = new Map<string, string>();

/** Сброс состояния сейвов харнесса (кодекс, биолаб, ачивки, лидерборд, daily) */
export function resetHeadlessState(): void {
  headlessSaveStore.clear();
}

/** Однократная установка заглушек window/document/localStorage для Node.
 *  В браузерной среде (document уже есть) ничего не перезаписывает. */
export function installHeadlessEnv(): void {
  if (headlessEnvInstalled) return;
  headlessEnvInstalled = true;
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.localStorage === 'undefined') {
    g.localStorage = {
      getItem: (k: string) => headlessSaveStore.get(k) ?? null,
      setItem: (k: string, v: string) => headlessSaveStore.set(k, String(v)),
      removeItem: (k: string) => headlessSaveStore.delete(k),
      clear: () => headlessSaveStore.clear(),
    };
  }
  if (typeof g.window === 'undefined') {
    // showToast пользуется только window.setTimeout/clearTimeout: no-op без таймеров
    g.window = {
      setTimeout: () => 0,
      clearTimeout: () => {},
    };
  }
  if (typeof g.document === 'undefined') {
    g.document = {
      getElementById: () => null,
      createElement: () => stubElement(),
      querySelector: () => null,
      querySelectorAll: () => [],
      activeElement: null,
      fullscreenEnabled: false,
      fullscreenElement: null,
      head: stubElement(),
      body: stubElement(),
      documentElement: stubElement(),
    };
  }
}

// ============================ МОКИ СЕРВИСОВ ============================

/** Overlay-мок: экран 1280x720, все эффекты no-op (вызовы не рисуются) */
function makeMockOverlay(): PixiOverlay {
  return {
    screenWidth: 1280,
    screenHeight: 720,
    scale: 1,
    spawnPulse: () => {},
    spawnPoly: () => {},
    spawnSplat: () => {},
    pushDamage: () => {},
    beginShake: () => {},
    reset: () => {},
    render: () => {},
  } as unknown as PixiOverlay;
}

/** PhysarumSim-мок: no-op-симуляция слизи. step никогда не зовёт onNodeStats,
 *  поэтому readback плотности штаммов у игрока эквивалентен нулю
 *  (trailOwn/trailEnemy всегда false, как велит ТЗ). */
function makeMockSim(): PhysarumSim {
  return {
    backend: 'webgl2',
    agentCount: 0,
    init: () => Promise.resolve(),
    setQualityRatio: () => {},
    resetColonies: () => {},
    spawnPlayerSpores: () => {},
    step: () => {},
    captureFrame: () => Promise.resolve(null),
  } as unknown as PhysarumSim;
}

/** Sfx-мок: Proxy возвращает no-op для любого метода (список вызовов обширен
 *  и пополняется, Proxy устойчивее явного перечня) */
function makeMockSfx(): Sfx {
  const target: StubProps = {};
  const handler: ProxyHandler<StubProps> = {
    get(t, prop) {
      if (!Object.prototype.hasOwnProperty.call(t, prop)) t[prop as string] = () => {};
      return t[prop as string];
    },
  };
  return new Proxy(target, handler) as unknown as Sfx;
}

/** PetriRadar-мок */
function makeMockRadar(): PetriRadar {
  return { update: () => {} } as unknown as PetriRadar;
}

/** Gamepad-мок: ввод всегда нейтральный, вибрация no-op */
function makeMockGamepad(): GamepadController {
  return {
    poll: () => ({ dashPressed: false, callPressed: false, pausePressed: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0 }),
    vibrate: () => {},
  } as unknown as GamepadController;
}

/** Joystick-мок: ввод всегда нейтральный */
function makeMockJoystick(): Joystick {
  return {
    vector: () => ({ x: 0, y: 0 }),
    dashRequested: () => false,
    consumeDash: () => {},
    callRequested: () => false,
    consumeCall: () => {},
  } as unknown as Joystick;
}

// ============================ КОНТЕКСТ ПРОГОНА ============================

export interface HeadlessCtxBundle {
  ctx: Ctx;
  svc: Services;
  dom: Dom;
}

/** Применить стартовую ветку: инъекция ДНК как в дневном испытании.
 *  Чистая ветка: 1-й уровень ДНК (mainGenome = ветка через refreshMainGenome).
 *  Гибрид: оба родителя на 3-м уровне (порог hybridAvail) и гибрид применяется
 *  сразу на старте через настоящую механику applyHybrid. Упрощение: в живой
 *  игре гибрид берется карточкой в окне апгрейдов, но ИИ-зонд за короткое окно
 *  симуляции не всегда доживает до level-up - чтобы прогон гибрида вообще
 *  тестируал гибридную механику, применяем его до первого шага. */
export function applyHeadlessBranch(ctx: Ctx, branch: DnaBranch | 'neutral', hybrid: HybridId | null): void {
  if (hybrid) {
    const def = HYBRIDS.find((h) => h.id === hybrid);
    if (!def) throw new Error(`headlessHarness: неизвестный гибрид "${hybrid}"`);
    ctx.dnaXp[def.a] = DNA_LEVELS[2];
    ctx.dnaXp[def.b] = DNA_LEVELS[2];
    ctx.lastDnaLvl[def.a] = 3;
    ctx.lastDnaLvl[def.b] = 3;
    applyHybrid(ctx, hybrid);
  } else if (branch !== 'neutral') {
    ctx.dnaXp[branch] = DNA_LEVELS[0];
    ctx.lastDnaLvl[branch] = 1;
    refreshMainGenome(ctx);
  } else {
    refreshMainGenome(ctx);
  }
}

/** Собрать полный Ctx с моками (без DOM). Реальные подсистемы: RunState,
 *  WaveDirector, био-узлы шкалы 1; моки: overlay/sim/sfx/radar/gamepad/joystick/dom. */
export function createHeadlessCtx(options: { branch?: DnaBranch | 'neutral'; hybrid?: HybridId | null } = {}): HeadlessCtxBundle {
  installHeadlessEnv();
  resetHeadlessState();
  const state = createRunState();
  const ctx = state as unknown as Ctx;
  const dom = stubElement() as unknown as Dom;
  const svc = {
    overlay: makeMockOverlay(),
    sim: makeMockSim(),
    sfx: makeMockSfx(),
    radar: makeMockRadar(),
    waves: undefined as unknown as WaveDirector,
    gamepad: makeMockGamepad(),
    joystick: makeMockJoystick(),
  } as unknown as Services;
  ctx.dom = dom;
  ctx.svc = svc;
  // screenFlashes/cameraShake 'off': убирает window/setTimeout-вспышки hurtFlash
  // и tailwarnFlash (в Node таймеры не нужны, overlay всё равно no-op)
  const settings = defaultSettings();
  settings.screenFlashes = 'off';
  settings.cameraShake = 'off';
  ctx.settings = settings;

  applyHeadlessBranch(ctx, options.branch ?? 'neutral', options.hybrid ?? null);
  refreshResonance(ctx);
  // Настоящий режиссёр волн: сценарные волны/засады/затишья работают как в игре
  svc.waves = createWaveDirector(ctx);

  // Старт забега: минимальный эквивалент startOrResumeRun без UI и Биолаба
  // (мета-прогрессия Биолаба сознательно не применяется: чистая база баланса)
  ctx.started = true;
  spawnNodesForScale(ctx, 0);
  return { ctx, svc, dom };
}

// ============================ АВТО-ПРОКАЧКА ============================

/** Родной арсенал ветки (WEAPON_BRANCH из engine/types, приоритет по силе открытия) */
const NATIVE_WEAPONS: Record<DnaBranch, WeaponId[]> = {
  vermis: ['spikes', 'mandibles'],
  chimera: ['nova', 'spikes'],
  mycelium: ['aura', 'spikes'],
  symbiont: ['orbs', 'spikes'],
};

/** Карточки-поддержки ветки (ID из UPGRADES) */
const BRANCH_CARDS: Record<DnaBranch, string[]> = {
  vermis: ['ver_dps', 'ver_cap'],
  chimera: ['chi_dmg', 'chi_lvl'],
  mycelium: ['my_regen', 'my_aura'],
  symbiont: ['si_aspd', 'si_move', 'si_magnet'],
};

/** Эксклюзивные гены ветки (3-й уровень ДНК) */
const BRANCH_GENES: Record<DnaBranch, string[]> = {
  vermis: ['absorb', 'whip2', 'scales'],
  chimera: ['unstable', 'supercharge', 'chain'],
  mycelium: ['infection', 'puddles', 'charm'],
  symbiont: ['phantom', 'overload', 'resonance'],
};

const WEAPON_UNLOCK_CARD: Record<WeaponId, string> = {
  spikes: 'spikes0',
  orbs: 'orbits0',
  nova: 'nova0',
  aura: 'aura0',
  mandibles: 'mandibles0',
  cysts: 'cysts0',
};

const WEAPON_LEVEL_CARD: Record<WeaponId, string> = {
  spikes: 'spikes+',
  orbs: 'orbits+',
  nova: 'nova+',
  aura: 'aura+',
  mandibles: 'mandibles+',
  cysts: 'cysts+',
};

const ALL_WEAPONS: WeaponId[] = ['spikes', 'mandibles', 'orbs', 'nova', 'aura', 'cysts'];
const GENERIC_STATS = ['dmg', 'aspd', 'hp', 'regen', 'magnet', 'move'];

/** ID доминирующей ветки арсенала (для гибрида - гены обоих родителей) */
function branchIdsFor(ctx: Ctx, hybrid: HybridId | null): DnaBranch[] {
  if (hybrid) {
    const def = HYBRIDS.find((h) => h.id === hybrid);
    return def ? [def.a, def.b] : [];
  }
  const g = ctx.mainGenome;
  if (g === 'neutral' || HYBRIDS.some((h) => h.id === g)) return [];
  return [g as DnaBranch];
}

/** Приоритетный список карточек апгрейда для сборки ветки/гибрида */
function buildUpgradePriority(ctx: Ctx, hybrid: HybridId | null): string[] {
  const ids: string[] = [];
  const branches = branchIdsFor(ctx, hybrid);
  const natives: WeaponId[] = branches.length > 0 ? branches.flatMap((b) => NATIVE_WEAPONS[b]) : ['spikes'];
  // 1) Гибрид: берётся первым, пока слот свободен
  if (hybrid && ctx.hybridsTaken.size === 0) ids.push(`hy_${hybrid}`);
  // 2) Открытие родных оружий ветки, 3) их уровни
  for (const w of natives) ids.push(WEAPON_UNLOCK_CARD[w]);
  for (const w of natives) ids.push(WEAPON_LEVEL_CARD[w]);
  // 4) Карточки-поддержки ветки, 5) гены ветки(веток)
  for (const b of branches) ids.push(...BRANCH_CARDS[b]);
  for (const b of branches) ids.push(...BRANCH_GENES[b]);
  // 6) Базовые статы
  ids.push(...GENERIC_STATS);
  // 7) Открытие второстепенных оружий (свободные слоты проверяет avail), 8) их уровни
  for (const w of ALL_WEAPONS) {
    if (!natives.includes(w)) ids.push(WEAPON_UNLOCK_CARD[w]);
  }
  for (const w of ALL_WEAPONS) ids.push(WEAPON_LEVEL_CARD[w]);
  return ids;
}

/** Выбрать карточку: первый доступный приоритет, иначе любая не-проклятая, иначе любая */
export function pickUpgradeId(ctx: Ctx, hybrid: HybridId | null): string | null {
  const avail = UPGRADES.filter((u) => u.avail(ctx));
  if (avail.length === 0) return null;
  for (const id of buildUpgradePriority(ctx, hybrid)) {
    const found = avail.find((u) => u.id === id);
    if (found) return found.id;
  }
  const nonCurse = avail.find((u) => !u.curse);
  return (nonCurse ?? avail[0]).id;
}

/** Разрешить все открытые окна апгрейдов настоящей механикой chooseUpgrade */
export function resolveHeadlessUpgrades(ctx: Ctx, hybrid: HybridId | null): void {
  let guard = 0;
  while (ctx.paused && ctx.pendingUps > 0 && guard++ < 24) {
    const id = pickUpgradeId(ctx, hybrid);
    // Страховка: карточек нет, а окно висит - принудительно снимаем паузу
    if (!id) {
      ctx.pendingUps = 0;
      ctx.paused = false;
      return;
    }
    chooseUpgrade(ctx, id);
  }
}

// ============================ КАРТ-ИИ ИГРОКА ============================

interface HeadlessAi {
  waypoint: { x: number; y: number };
  wpT: number;
  thinkT: number;
  mode: 'collect' | 'kite';
  orbAng: number;
}

function makeAi(): HeadlessAi {
  return { waypoint: { x: 560, y: 315 }, wpT: 0, thinkT: 0, mode: 'collect', orbAng: 0 };
}

/** Сайдстеп снарядов: перпендикуляр к скорости снаряда в сторону от траектории
 *  + мягкое отталкивание. Возвращает вектор уклонения (px/с в масштабе рулевого). */
function projectileDodge(ctx: Ctx): { x: number; y: number } {
  const p = ctx.player;
  let x = 0;
  let y = 0;
  const R = 220;
  for (const pr of ctx.eprojs) {
    const dx = p.x - pr.x;
    const dy = p.y - pr.y;
    const d = Math.hypot(dx, dy);
    if (d > R) continue;
    const vlen = Math.max(1, Math.hypot(pr.vx, pr.vy));
    const vpx = pr.vx / vlen;
    const vpy = pr.vy / vlen;
    // с какой стороны траектории снаряда мы находимся
    const cross = vpx * dy - vpy * dx;
    const sgn = cross >= 0 ? 1 : -1;
    const wgt = 2.2 * (1 - d / R);
    x += -vpy * sgn * wgt;
    y += vpx * sgn * wgt;
    x += (dx / Math.max(1, d)) * wgt * 0.4;
    y += (dy / Math.max(1, d)) * wgt * 0.4;
  }
  return { x, y };
}

/** Ввод через мышь: двухрежимный ИИ-зонд (одинаковый для всех сборок).
 *  collect (HP > 0.55): движение к самому свежему кластеру душ (орбы в массиве
 *  упорядочены по вставке, поэтому свежий лут ищем с конца), внутри кластера -
 *  малая орбита, чтобы магнит (66px) успевал всосать души. Шипы бьют ближних
 *  сами, контактный урон прохода ограничен i-frames.
 *  kite (HP < 0.45): отход - прочь от ближайшего врага + касательная орбита,
 *  отталкивание от стен, сайдстеп снарядов. Гистерезис 0.45..0.55. */
export function updateHeadlessInput(ctx: Ctx, ai: HeadlessAi, dt: number): void {
  ai.thinkT -= dt;
  if (ai.thinkT > 0) return;
  ai.thinkT = 0.12;
  const p = ctx.player;
  const hpRatio = p.hp / Math.max(1, ctx.maxHp);
  if (hpRatio > 0.55) ai.mode = 'collect';
  else if (hpRatio < 0.45) ai.mode = 'kite';

  let nd = Infinity;
  let ndx = 0;
  let ndy = 0;
  let crowd = 0;
  for (const e of ctx.enemies) {
    if (e.hp <= 0 || e.infected > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nd) {
      nd = d;
      ndx = p.x - e.x;
      ndy = p.y - e.y;
    }
    if (d < 200) crowd++;
  }
  const dodge = projectileDodge(ctx);

  let tx: number;
  let ty: number;
  if (ai.mode === 'collect' && ctx.orbs.length > 0) {
    // Кластер свежих душ: орб с максимумом соседей в 140px, поиск с конца массива
    let best = -1;
    let bestScore = 0;
    const len = ctx.orbs.length;
    const from = Math.max(0, len - 120);
    for (let i = len - 1; i >= from; i--) {
      const o = ctx.orbs[i];
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d > 550) continue;
      let nb = 0;
      for (let j = len - 1; j >= from; j--) {
        if (Math.hypot(ctx.orbs[j].x - o.x, ctx.orbs[j].y - o.y) < 140) nb++;
      }
      const score = (nb + 0.5) * (1 - d / 550);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best >= 0) {
      const o = ctx.orbs[best];
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < 90) {
        // Лизание кластера: малая орбита внутри радиуса магнита
        ai.orbAng += 0.4;
        tx = o.x + Math.cos(ai.orbAng) * 45;
        ty = o.y + Math.sin(ai.orbAng) * 45;
      } else {
        tx = o.x;
        ty = o.y;
      }
    } else {
      // Свежих душ в зоне нет - мягкий дрейф
      ai.wpT -= 0.12;
      if (ai.wpT <= 0 || Math.hypot(ai.waypoint.x - p.x, ai.waypoint.y - p.y) < 70) {
        ai.wpT = 2.6;
        ai.waypoint = {
          x: 90 + Math.random() * Math.max(1, ctx.curWorldW - 180),
          y: 90 + Math.random() * Math.max(1, ctx.curWorldH - 180),
        };
      }
      tx = ai.waypoint.x;
      ty = ai.waypoint.y;
    }
    tx += dodge.x * 60;
    ty += dodge.y * 60;
  } else {
    // Кайт: прочь от ближайшего + касательная (орбита) + стены + сайдстеп
    let sx = Math.cos(ctx.gameTime * 2.1);
    let sy = Math.sin(ctx.gameTime * 2.1);
    if (nd < Infinity) {
      const md = Math.max(1, nd);
      const w = nd < 240 ? 1 - nd / 240 : 0;
      // Прочь от ближайшего (вес растет при сближении) + касательная (орбита)
      sx = (ndx / md) * (0.6 + w);
      sy = (ndy / md) * (0.6 + w);
      sx += (-ndy / md) * 1.0;
      sy += (ndx / md) * 1.0;
    }
    const M = 150;
    if (p.x < M) sx += (M - p.x) / M;
    if (p.x > ctx.curWorldW - M) sx -= (p.x - (ctx.curWorldW - M)) / M;
    if (p.y < M) sy += (M - p.y) / M;
    if (p.y > ctx.curWorldH - M) sy -= (p.y - (ctx.curWorldH - M)) / M;
    sx += dodge.x;
    sy += dodge.y;
    const l = Math.hypot(sx, sy) || 1;
    tx = p.x + (sx / l) * 160;
    ty = p.y + (sy / l) * 160;
  }
  ctx.mouse.active = true;
  ctx.mouse.x = Math.max(40, Math.min(ctx.curWorldW - 40, tx));
  ctx.mouse.y = Math.max(40, Math.min(ctx.curWorldH - 40, ty));
  // Рывок: выскок из окружения только в кайте (в collect рывок бережем)
  if (ai.mode === 'kite' && nd < 90 && ctx.dashCd <= 0) ctx.dashRequested = true;
  // Феромон-зов: толпа сжалась - отпугнуть и отбросить (реальный навык)
  if (crowd >= 8 && ctx.callCd <= 0) ctx.callRequested = true;
}

// ============================ МЕТРИКИ И ПРОГОН ============================

/** Опции серии прогонов. branch 'all' - все 4 ветки; hybrid 'all' - все 6 гибридов */
export interface HeadlessOptions {
  branch: DnaBranch | 'neutral' | 'all';
  hybrid: HybridId | 'all' | null;
  /** Минут игрового времени на прогон (может быть дробным, например 0.5) */
  minutes: number;
  runs: number;
  seed: number;
}

export interface HeadlessRunResult {
  branch: string;
  hybrid: string | null;
  runIndex: number;
  seed: number;
  /** Секунды выживания (заморожены в момент смерти; полный лимит при выживании) */
  survivalSec: number;
  win: boolean;
  endedBy: 'death' | 'timeLimit' | 'win';
  kills: number;
  level: number;
  /** Максимальная достигнутая шкала бытия (id из SCALES) */
  scaleMaxReached: number;
  scaleIdx: number;
  deathCauseKind: string | null;
  deathCauseLabel: string | null;
  bossesKilled: number;
  avgBossTtkSec: number;
  bossTtkSecs: number[];
  /** DPS-профиль: суммарный урон по счётчикам RunState (детализация по типам
   *  оружий в state не ведётся, поэтому профиль = хвост / кольцо / оружия) */
  dmgTotal: number;
  dmgTail: number;
  dmgRing: number;
  dmgWeapons: number;
  avgDps: number;
  peakDps10: number;
  tailLenAvg: number;
  tailLenMax: number;
  maxEnemiesAlive: number;
  finalWlvl: Record<WeaponId, number>;
  finalGenome: string;
  finalGenes: string[];
  metricsFinite: boolean;
}

export interface HeadlessAggregate {
  label: string;
  branch: string;
  hybrid: string | null;
  runs: number;
  /** Доля прогонов, выживших до конца окна симуляции */
  winrate: number;
  medianSurvivalSec: number;
  meanSurvivalSec: number;
  meanKills: number;
  maxScale: number;
  meanBossTtkSec: number;
  meanDps: number;
  meanTailLen: number;
}

const ARCS_SCRATCH: { x1: number; y1: number; x2: number; y2: number; color: number }[] = [];
const LASERS_SCRATCH: { x1: number; y1: number; x2: number; y2: number }[] = [];

function meanOf(list: number[]): number {
  if (list.length === 0) return 0;
  let s = 0;
  for (const v of list) s += v;
  return s / list.length;
}

function medianOf(list: number[]): number {
  if (list.length === 0) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Один прогон фиксированной длины. Seed подменяет Math.random ДО создания
 *  контекста: единственная точка входа случайности в src/game - глобальный
 *  Math.random (dailyRng в обычном забеге неактивен), а стартовые био-узлы
 *  (spawnNodesForScale) тоже бросают кубик - они должны быть одинаковыми
 *  между прогонами с одним seed. */
export function runSingleRun(options: HeadlessOptions, runIndex: number): HeadlessRunResult {
  const hybrid: HybridId | null = typeof options.hybrid === 'string' && options.hybrid !== 'all' ? options.hybrid : null;
  const branch: DnaBranch | 'neutral' = options.branch === 'all' || options.branch === 'neutral' ? 'neutral' : options.branch;
  const origRandom = Math.random;
  Math.random = mulberry32(options.seed + runIndex);
  try {
    const { ctx } = createHeadlessCtx({ branch, hybrid });
    const ai = makeAi();
    const totalSteps = Math.max(1, Math.round(options.minutes * 60 * 60)); // минуты * 60 с * 60 шагов/с
    const winThresholdSec = options.minutes * 60;

    const bossSpawnT = new Map<number, number>();
    const bossTtkSecs: number[] = [];
    const tailSamples: number[] = [];
    const dpsSamples: number[] = []; // кумулятивный damageDealt раз в секунду
    let maxEnemiesAlive = 0;
    let lastSampleSec = -1;

    for (let step = 0; step < totalSteps; step++) {
      if (ctx.gameOver) break;
      if (ctx.paused) {
        resolveHeadlessUpgrades(ctx, hybrid);
        if (ctx.paused) ctx.paused = false; // посторонняя пауза без апгрейдов не должна вешать симуляцию
        continue;
      }
      updateHeadlessInput(ctx, ai, FIXED_DT);
      ARCS_SCRATCH.length = 0;
      LASERS_SCRATCH.length = 0;
      stepSimulation(ctx, FIXED_DT, step * FIXED_DT, ARCS_SCRATCH, LASERS_SCRATCH);
      // Выборка метрик раз в секунду игрового времени
      const sec = Math.floor(ctx.gameTime);
      if (sec !== lastSampleSec) {
        lastSampleSec = sec;
        tailSamples.push(ctx.tailLen);
        dpsSamples.push(ctx.damageDealt);
        if (ctx.enemies.length > maxEnemiesAlive) maxEnemiesAlive = ctx.enemies.length;
        // TTK боссов: спавн -> исчезновение (убийство; незавершённые не считаются)
        const alive = new Set<number>();
        for (const e of ctx.enemies) {
          if ((e.type === 'boss' || e.titan) && e.hp > 0) alive.add(e.id);
        }
        for (const [id, t0] of bossSpawnT) {
          if (!alive.has(id)) {
            bossTtkSecs.push(Math.max(0, ctx.gameTime - t0));
            bossSpawnT.delete(id);
          }
        }
        for (const id of alive) {
          if (!bossSpawnT.has(id)) bossSpawnT.set(id, ctx.gameTime);
        }
      }
    }

    // ---------- Метрики прогона ----------
    const survivalSec = ctx.gameTime;
  const endedBy: HeadlessRunResult['endedBy'] = ctx.winRun ? 'win' : (ctx.dying || ctx.gameOver) ? 'death' : 'timeLimit';
  const win = ctx.winRun || (!ctx.gameOver && !ctx.dying && survivalSec >= winThresholdSec - 1e-6);
  const dmgWeapons = Math.max(0, ctx.damageDealt - ctx.dmgTail - ctx.dmgRing);
  // Пиковый DPS: окно 10 с по кумулятивным секундным выборкам; если окно не набралось,
  // падаем на средний DPS за всё время выживания
  let peakDps10 = 0;
  if (dpsSamples.length > 10) {
    for (let i = 10; i < dpsSamples.length; i++) {
      const windowDps = (dpsSamples[i] - dpsSamples[i - 10]) / 10;
      if (windowDps > peakDps10) peakDps10 = windowDps;
    }
  } else if (survivalSec > 0 && ctx.damageDealt > 0) {
    peakDps10 = ctx.damageDealt / survivalSec;
  }
  const avgBossTtkSec = meanOf(bossTtkSecs);
  const metricsFinite = [
    survivalSec, ctx.kills, ctx.level, ctx.damageDealt, ctx.dmgTail, ctx.dmgRing,
    avgBossTtkSec, peakDps10, meanOf(tailSamples), ctx.tailMaxReached,
  ].every((v) => Number.isFinite(v));

  return {
    branch: hybrid ? `hybrid:${hybrid}` : `branch:${branch}`,
    hybrid,
    runIndex,
    seed: options.seed + runIndex,
    survivalSec,
    win,
    endedBy,
    kills: ctx.kills,
    level: ctx.level,
    scaleMaxReached: ctx.scaleMaxReached,
    scaleIdx: ctx.scaleIdx,
    deathCauseKind: ctx.lastDamageCause?.kind ?? null,
    deathCauseLabel: ctx.lastDamageCause?.labelRu ?? null,
    bossesKilled: bossTtkSecs.length,
    avgBossTtkSec,
    bossTtkSecs,
    dmgTotal: ctx.damageDealt,
    dmgTail: ctx.dmgTail,
    dmgRing: ctx.dmgRing,
    dmgWeapons,
    avgDps: survivalSec > 0 ? ctx.damageDealt / survivalSec : 0,
    peakDps10,
    tailLenAvg: meanOf(tailSamples),
    tailLenMax: ctx.tailMaxReached,
    maxEnemiesAlive,
    finalWlvl: { ...ctx.wlvl },
    finalGenome: ctx.mainGenome,
    finalGenes: [...ctx.genes],
    metricsFinite,
    };
  } finally {
    Math.random = origRandom;
  }
}

/** Агрегат по серии прогонов одной сборки */
export function aggregateRuns(results: HeadlessRunResult[]): HeadlessAggregate {
  if (results.length === 0) {
    return {
      label: 'branch:empty', branch: '', hybrid: null, runs: 0, winrate: 0,
      medianSurvivalSec: 0, meanSurvivalSec: 0, meanKills: 0, maxScale: 0,
      meanBossTtkSec: 0, meanDps: 0, meanTailLen: 0,
    };
  }
  const first = results[0];
  return {
    label: first.branch,
    branch: first.hybrid ? first.hybrid : first.branch.replace('branch:', ''),
    hybrid: first.hybrid,
    runs: results.length,
    winrate: results.filter((r) => r.win).length / results.length,
    medianSurvivalSec: medianOf(results.map((r) => r.survivalSec)),
    meanSurvivalSec: meanOf(results.map((r) => r.survivalSec)),
    meanKills: meanOf(results.map((r) => r.kills)),
    maxScale: Math.max(...results.map((r) => r.scaleMaxReached)),
    meanBossTtkSec: meanOf(results.filter((r) => r.avgBossTtkSec > 0).map((r) => r.avgBossTtkSec)),
    meanDps: meanOf(results.map((r) => r.avgDps)),
    meanTailLen: meanOf(results.map((r) => r.tailLenAvg)),
  };
}

/** Серия прогонов по одной или нескольким сборкам + агрегаты */
export function runHeadless(options: HeadlessOptions): { results: HeadlessRunResult[]; aggregates: HeadlessAggregate[] } {
  const branches: (DnaBranch | 'neutral')[] = options.branch === 'all'
    ? ['vermis', 'chimera', 'mycelium', 'symbiont']
    : [options.branch];
  const hybrids: (HybridId | null)[] = options.hybrid === 'all'
    ? HYBRIDS.map((h) => h.id)
    : [options.hybrid];

  const results: HeadlessRunResult[] = [];
  const aggregates: HeadlessAggregate[] = [];
  // Гибриды и чистые ветки не смешиваются: если задан гибрид, ветка игнорируется
  const configs: { branch: DnaBranch | 'neutral'; hybrid: HybridId | null }[] = hybrids.some((h) => h !== null)
    ? hybrids.filter((h): h is HybridId => h !== null).map((h) => ({ branch: 'neutral', hybrid: h }))
    : branches.map((b) => ({ branch: b, hybrid: null }));

  for (const cfg of configs) {
    const groupResults: HeadlessRunResult[] = [];
    for (let i = 0; i < Math.max(1, options.runs); i++) {
      groupResults.push(runSingleRun({ ...options, branch: cfg.branch, hybrid: cfg.hybrid }, i));
    }
    results.push(...groupResults);
    aggregates.push(aggregateRuns(groupResults));
  }
  return { results, aggregates };
}
