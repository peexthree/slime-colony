// Симуляция: оркестрация одного шага игры в исходном порядке, камера, рендер
// и fixed timestep (аккумулятор: 1/60 с на шаг, максимум 5 подшагов за кадр).
import { AURA, Beacon, METAMORPH, NOVA, ORBS, SCALES, SIM_HEIGHT, SIM_WIDTH, STRAIN, CALL, WEAPON_MAX_LVL } from '../engine/types';
import { SimNodeStat, SimResolutionProvider } from '../engine/physarumSim';
import { pickSimResolution } from '../engine/simResolution';
import { stepBioNodes } from './bioNodes';
import { t, getLocale } from '../i18n';
import { trNode } from '../i18n/gameData';
import { nearby } from './entities';
import { effDmg } from './state';
import { showToast } from '../ui/toast';
import type { Ctx } from './context';
import { toSimX, toSimY, viewHalfH, viewHalfW } from './context';
import { buildHash } from './entities';
import type { Enemy } from './entities';
import { runRng, maybeCompleteDaily } from './daily';
import { stepPlayer } from './player';
import { updateBiomeFx } from './biomeFx';
import { stepSpawns, stepNodeRaids, stepEnemies } from './enemies';
import { stepAnomalies, stepTailWhip, stepRelics, DYING_DURATION } from './combat';
import { stepWeapons, orbRadiusMul } from './weapons';
import { stepSouls } from './souls';
import { maybeSpawnTitan } from './metamorphosis';
import { beginDeathSequence, finishRun, checkLiveAchievements, maybePacifist, maybeTitanSated, maybeWatcher, maybeLevelUp } from './runFlow';
import { onNodeCaptured, NODE_NAMES, NODE_POS_EFFECTS, NODE_NEG_EFFECTS } from './nodes';
import { dnaLvl, visibleTail, playerRadius } from './state';
import { updateHud } from '../ui/hud';
import { FIXED_DT, MAX_STEPS_PER_FRAME, planFixedSteps } from './fixedStep';

// Переэкспорт для main.ts: единая точка импорта fixed timestep
export { FIXED_DT, MAX_STEPS_PER_FRAME, planFixedSteps };

/** Масштаб времени мира: bullet-time метаморфоза и замедление при смерти */
export function timeScaleOf(ctx: Ctx): number {
  return ctx.dying ? 0.18 : ctx.metamorphT > 0 ? METAMORPH.timeScale : 1;
}

/** Дуги Тесла-сети и лазеры Пси-сети: пересобираются каждый кадр */
const frameArcs: { x1: number; y1: number; x2: number; y2: number; color: number }[] = [];
const frameLasers: { x1: number; y1: number; x2: number; y2: number }[] = [];

// ---------- Адаптивное разрешение physarum-сетки (аудит Scrolling/Adaptive Grid) ----------

/** Период проверки адаптивного разрешения, сек игрового времени */
const SIM_RES_CHECK_PERIOD = 0.5;
/** Таймер последней проверки, сек сим-времени */
let simResCheckT = -1;
/** Бюджет текселей WebGL2-фолбэка: CPU-блюр следа растёт квадратично с сеткой */
const WEBGL2_SIM_TEX_BUDGET = 1280 * 720;

/** Множитель качества сетки: тот же ratio, что modals.ts передаёт в setQualityRatio */
function simQualityRatio(ctx: Ctx): number {
  return ctx.settings.quality === 'low' ? 0.5 : 1;
}

/** Кадр: фиксированные шаги симуляции -> камера (rawDt) -> рендер текущего состояния */
export function stepFrame(ctx: Ctx, nowSec: number, rawDt: number): void {
  const { steps, accAfter } = planFixedSteps(ctx.acc, rawDt);
  ctx.acc = accAfter;
  let simDt = FIXED_DT * timeScaleOf(ctx);
  for (let i = 0; i < steps; i++) {
    simDt = stepSimulation(ctx, FIXED_DT, nowSec, frameArcs, frameLasers);
  }
  // Камера и её зум живут в реальном времени: bullet-time не замедляет слежение
  updateCamera(ctx, rawDt);
  renderFrame(ctx, nowSec, simDt);
}

/** Один шаг симуляции (dt шага масштабируется timeScale); возвращает фактический dt */
export function stepSimulation(ctx: Ctx, fixedDt: number, nowSec: number, arcs: typeof frameArcs, lasers: typeof frameLasers): number {
  // Метаморфоз: bullet-time замедляет весь мир на переходе масштаба
  if (ctx.metamorphT > 0) ctx.metamorphT -= fixedDt;
  const timeScale = timeScaleOf(ctx);
  const dt = fixedDt * timeScale; // игровое время: таймеры и физика мира

  if (ctx.dying) {
    ctx.dyingT -= fixedDt;
    ctx.prevCamX = ctx.camX;
    ctx.prevCamY = ctx.camY;
    ctx.simTime += dt;
    ctx.svc.sim.step(ctx.simTime, dt, [], [], { x: -500, y: -500 }, -0.75, 0.90, SCALES[ctx.scaleIdx].id, 0, 0, () => {});
    if (ctx.dyingT <= 0) {
      finishRun(ctx, false);
    }
    return dt;
  }
  if (!ctx.started || ctx.paused || ctx.gameOver) {
    ctx.prevCamX = ctx.camX;
    ctx.prevCamY = ctx.camY;
    // До старта / на паузе / после конца: пыль дрейфует без маяков
    ctx.svc.sfx.setTailDrone(false);
    ctx.simTime += dt;
    ctx.svc.sim.step(ctx.simTime, dt, [], [], { x: -500, y: -500 }, -0.75, 0.90, SCALES[ctx.scaleIdx].id, 0, 0, () => {});
    return dt;
  }

  // ---------- Активный забег: порядок секций сохранён из исходного loop() ----------
  ctx.gameTime += dt;
  maybeCompleteDaily(ctx);
  checkLiveAchievements(ctx, dt);
  maybePacifist(ctx);
  maybeTitanSated(ctx, dt);
  maybeWatcher(ctx, dt);

  // Биом-модификатор шкалы: шаг таймеров сил (течение/полосы/ветер/инерция/прилив)
  updateBiomeFx(ctx, dt, nowSec);
  // Игрок: ввод, движение, рывок, хвост, голод, кольцо, нестабильность
  stepPlayer(ctx, dt);
  // Биомасса шкалы созрела - пробуждается Титан масштаба
  maybeSpawnTitan(ctx);
  // Боссы, инкубатор, элиты, спавн-таблица, режиссёр волн
  stepSpawns(ctx, dt);
  // Пространственный хеш по свежим позициям
  buildHash(ctx);
  // Аномалии чашки Петри: спавн + жизненный цикл
  stepAnomalies(ctx, dt, () => runRng(ctx));
  // Набеги монстров на оставленные без охраны био-башни
  stepNodeRaids(ctx, dt);
  // Враги: погоня, рейды, расталкивание, контактный урон, навыки
  stepEnemies(ctx, dt);
  // Хвост-хлыст: урон по траектории
  stepTailWhip(ctx, dt);
  // Оружия: шипы, снаряды, орбиты, нова, аура, жвала, цисты
  stepWeapons(ctx, dt, arcs);
  // Сферы ДНК: магнит, консолидация, резонанс
  stepSouls(ctx, dt);
  // Уровень и окно апгрейдов
  maybeLevelUp(ctx);
  // Смерть игрока: медленный разрыв клетки
  if (ctx.player.hp <= 0) {
    beginDeathSequence(ctx);
  }
  // Physarum живёт вместе с игроком + захват башен + пси-лазеры
  stepPhysarumBridge(ctx, dt, nowSec, lasers);
  // HUD-синк
  updateHud(ctx);
  // Реликвии органелл (карапакс/гальваника/абиссаль)
  stepRelics(ctx, dt, arcs);
  return dt;
}

// ---------- Камера ----------

/** Камера: слежение за игроком и твин зума текущей шкалы (rawDt без timeScale) */
export function updateCamera(ctx: Ctx, rawDt: number): void {
  const zoomTarget = SCALES[ctx.scaleIdx].zoom * (ctx.dying ? 1.18 : 1);
  ctx.camZoom += (zoomTarget - ctx.camZoom) * Math.min(1, rawDt * (ctx.dying ? 3.5 : 2.0));

  ctx.camX += (ctx.player.x - ctx.camX) * Math.min(1, rawDt * 5.0);
  ctx.camY += (ctx.player.y - ctx.camY) * Math.min(1, rawDt * 5.0);

  const halfViewW = viewHalfW(ctx);
  const halfViewH = viewHalfH(ctx);
  if (ctx.curWorldW > halfViewW * 2) {
    ctx.camX = Math.max(halfViewW, Math.min(ctx.curWorldW - halfViewW, ctx.camX));
  } else {
    ctx.camX = ctx.curWorldW / 2;
  }
  if (ctx.curWorldH > halfViewH * 2) {
    ctx.camY = Math.max(halfViewH, Math.min(ctx.curWorldH - halfViewH, ctx.camY));
  } else {
    ctx.camY = ctx.curWorldH / 2;
  }
}

// ---------- Physarum-мост ----------

/** Маяки поля, захват башен, пси-лазеры и шаг physarum-симуляции */
function stepPhysarumBridge(ctx: Ctx, dt: number, _nowSec: number, lasers: typeof frameLasers): void {
  const sim = ctx.svc.sim;
  const overlay = ctx.svc.overlay;
  const simBeacons: Beacon[] = [];
  // Био-цветение Physarum на телах павших
  for (let i = ctx.corpseBeacons.length - 1; i >= 0; i--) {
    ctx.corpseBeacons[i].ttl -= dt;
    if (ctx.corpseBeacons[i].ttl <= 0) {
      ctx.corpseBeacons.splice(i, 1);
    } else {
      simBeacons.push({
        x: ctx.corpseBeacons[i].x,
        y: ctx.corpseBeacons[i].y,
        radius: 45,
        kind: 1,
        ttl: ctx.corpseBeacons[i].ttl,
        maxTtl: 4,
      });
    }
  }
  // Нова: токсин подсвечивается на полсекунды
  if (ctx.toxinFlash > 0) {
    const safeNovaIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.nova - 1));
    simBeacons.push({
      x: ctx.player.x, y: ctx.player.y,
      radius: NOVA.radius[safeNovaIdx] * 0.9,
      kind: -1, ttl: ctx.toxinFlash, maxTtl: 0.5,
    });
  }
  // Ядовитые лужи Паразита: токсин-маяки на 3 сек
  while (ctx.pendingPuddles.length > 0) {
    const pd = ctx.pendingPuddles.pop()!;
    simBeacons.push({ x: pd.x, y: pd.y, radius: 28, kind: -1, ttl: 3, maxTtl: 3 });
  }
  // Феромон-зов (пробел или кнопка «ЗОВ»): токсин-маяк пугает рой, отброс на CPU
  ctx.callCd -= dt;
  const joyCall = ctx.svc.joystick.callRequested();
  const callTap = ctx.keys.has(' ') || ctx.callRequested || joyCall;
  if (ctx.callRequested || joyCall) { ctx.callRequested = false; ctx.svc.joystick.consumeCall(); }
  if (callTap && ctx.callCd <= 0) {
    ctx.callCd = CALL.cd;
    const callTargetX = ctx.mouse.active ? ctx.mouse.x : (ctx.player.x + ctx.playerDirX * 120);
    const callTargetY = ctx.mouse.active ? ctx.mouse.y : (ctx.player.y + ctx.playerDirY * 120);
    simBeacons.push({ x: callTargetX, y: callTargetY, radius: CALL.beaconRadius, kind: -1, ttl: CALL.ttl, maxTtl: CALL.ttl });
    for (const e of nearby(callTargetX, callTargetY, CALL.radius)) {
      const d = Math.max(1, Math.hypot(e.x - callTargetX, e.y - callTargetY));
      e.kbx += ((e.x - callTargetX) / d) * CALL.knock;
      e.kby += ((e.y - callTargetY) / d) * CALL.knock;
    }
    overlay.spawnPulse(callTargetX, callTargetY, 0xff3b5c, CALL.beaconRadius + 40);
    overlay.beginShake(0.12);
    ctx.svc.sfx.call();
    showToast(
      ctx,
      `<svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skill-call"/></svg> ` +
      `${getLocale() === 'en' ? 'PHEROMONE CALL' : 'ФЕРОМОН-ЗОВ'}`
    );
  }
  if (ctx.callRequested) ctx.callRequested = false;

  ctx.frameN++;
  // Маяк игрока: грибница тянется к нему и к кончику хвоста
  simBeacons.push({ x: ctx.player.x, y: ctx.player.y, radius: 80 + ctx.tailLen * 1.6, kind: 1, ttl: 9, maxTtl: 9 });
  const tailPts = visibleTail(ctx);
  if (tailPts.length > 0) {
    const tip = tailPts[0];
    simBeacons.push({ x: tip.x, y: tip.y, radius: 42, kind: 1, ttl: 6, maxTtl: 9 });
  }
  // Элитные враги тянут свои фиолетовые маяки - штамм врага сплочён
  for (const e of ctx.enemies) {
    if (e.type === 'brute') simBeacons.push({ x: e.x, y: e.y, radius: 90, kind: 2, ttl: 9, maxTtl: 9 });
    else if (e.type === 'boss') simBeacons.push({ x: e.x, y: e.y, radius: 110, kind: 2, ttl: 9, maxTtl: 9 });
  }
  // Захват био-башен удержанием зоны + тревоги при атаке монстров на оставленные башни
  const nodeStep = stepBioNodes(
    ctx.bioNodes,
    ctx.player,
    ctx.enemies,
    dt,
    ctx.codexBonuses.captureSpeedMul * ctx.dailyCaptureSpeedMul,
    ctx.hybridsTaken.has('psi_web'),
  );
  for (const n of nodeStep.ownerChanged) onNodeCaptured(ctx, n);
  ctx.nodesHeldMax = Math.max(ctx.nodesHeldMax, nodeStep.heldCount);
  for (const n of nodeStep.newlyRaided) {
    const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
    showToast(
      ctx,
      `<svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-${n.kind}"/></svg> ` +
      t('node_raided_toast', { name: tn.name }),
      'warn'
    );
  }

  // GPU readback теперь отслеживает только плотность штаммов непосредственно под игроком
  const onNodeStatsCb = (stats: SimNodeStat[]): void => {
    if (stats.length > ctx.bioNodes.length) {
      const s = stats[ctx.bioNodes.length];
      ctx.trailOwn = s.playerDensity >= STRAIN.densityThreshold;
      ctx.trailEnemy = s.enemyDensity >= STRAIN.densityThreshold;
    }
  };
  // Пси-Сеть: захваченные узлы бьют лазерами по ближайшим врагам
  ctx.psiZapT -= dt;
  if (ctx.hybridsTaken.has('psi_web') && ctx.psiZapT <= 0) {
    ctx.psiZapT = 0.8;
    for (const n of ctx.bioNodes) {
      if (n.owner !== 1) continue;
      let best: Enemy | null = null;
      let bestD = 240;
      for (const e of nearby(n.x, n.y, 240)) {
        const dd = Math.hypot(e.x - n.x, e.y - n.y);
        if (dd < bestD && e.hp > 0) { bestD = dd; best = e; }
      }
      if (best) {
        lasers.push({ x1: n.x, y1: n.y, x2: best.x, y2: best.y });
        best.hp -= 8 * effDmg(ctx);
        best.flash = 0.08;
        overlay.pushDamage(best.x, best.y - best.radius - 6, 8 * effDmg(ctx), 0x9df5ff);
        ctx.damageDealt += 8 * effDmg(ctx);
        ctx.svc.sfx.laser();
      }
    }
  }
  // Адаптивное разрешение сетки: троттлинг 0.5с. Реаллок делает бэкенд только
  // при фактической смене размера (вызов с текущим размером - no-op внутри
  // бэкенда, заодно лечит рассинхрон после пересоздания сима на device lost).
  // Headless-мок без setResolution защищён typeof-проверкой.
  if (ctx.simTime - simResCheckT >= SIM_RES_CHECK_PERIOD) {
    simResCheckT = ctx.simTime;
    const target = pickSimResolution(
      ctx.camZoom,
      simQualityRatio(ctx),
      sim.backend === 'webgl2' ? WEBGL2_SIM_TEX_BUDGET : undefined,
    );
    if (typeof sim.setResolution === 'function') sim.setResolution(target.w, target.h);
  }
  // Фактическая сетка после возможного ресайза: масштаб координат из базовой
  // системы SIM_WIDTH x SIM_HEIGHT (как отдаёт toSimX/toSimY) в текущую
  const sized = sim as Partial<SimResolutionProvider>;
  const curW = typeof sized.simWidth === 'number' && sized.simWidth > 0 ? sized.simWidth : SIM_WIDTH;
  const curH = typeof sized.simHeight === 'number' && sized.simHeight > 0 ? sized.simHeight : SIM_HEIGHT;
  const kx = curW / SIM_WIDTH;
  const ky = curH / SIM_HEIGHT;
  const km = (kx + ky) * 0.5;

  // Переводим маяки и узлы в видовое окно симуляции (базовый маппинг x масштаб сетки)
  const mappedBeacons: Beacon[] = [];
  for (const b of simBeacons) {
    const sx = toSimX(ctx, b.x) * kx;
    const sy = toSimY(ctx, b.y) * ky;
    const sr = b.radius * ctx.camZoom * km;
    if (sx >= -120 && sx <= curW + 120 && sy >= -120 && sy <= curH + 120) {
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

  ctx.simNodes.length = 0;
  for (let i = 0; i < ctx.bioNodes.length; i++) {
    const bn = ctx.bioNodes[i];
    ctx.simNodes.push({
      id: bn.id,
      x: toSimX(ctx, bn.x) * kx,
      y: toSimY(ctx, bn.y) * ky,
      radius: bn.radius * ctx.camZoom * km,
      owner: bn.owner,
      capture: bn.capture,
      kind: bn.kind,
    });
  }
  ctx.strainProbe.x = toSimX(ctx, ctx.player.x) * kx;
  ctx.strainProbe.y = toSimY(ctx, ctx.player.y) * ky;
  ctx.simNodes.push(ctx.strainProbe);

  // Смещение камеры в системе координат симуляции (для удержания штаммов в мировом пространстве)
  const simDeltaX = (ctx.camX - ctx.prevCamX) * ctx.camZoom * kx;
  const simDeltaY = (ctx.camY - ctx.prevCamY) * ctx.camZoom * ky;
  ctx.prevCamX = ctx.camX;
  ctx.prevCamY = ctx.camY;

  // Адаптивное испарение (Этап 5.4): поздняя игра - меньше следов, читаемость
  const evap = 0.955 - Math.min(ctx.gameTime / 600, 1) * 0.025;
  ctx.simTime += dt;
  sim.step(
    ctx.simTime,
    dt,
    ctx.simNodes,
    mappedBeacons,
    { x: toSimX(ctx, ctx.player.x) * kx, y: toSimY(ctx, ctx.player.y) * ky },
    0.5 + Math.min(ctx.gameTime / 240, 1) * 0.5,
    evap,
    SCALES[ctx.scaleIdx].id,
    simDeltaX,
    simDeltaY,
    onNodeStatsCb
  );

  // Мягкий неон bloom: обновление каждые 3 кадра
  if (++ctx.frameBloom3 % 3 === 0) {
    ctx.dom.bloomCtx.drawImage(ctx.dom.gpuCanvas, 0, 0, ctx.dom.bloomCanvas.width, ctx.dom.bloomCanvas.height);
  }
}

// ---------- Радар и рендер ----------

/** Стрелки радара к скрытым угрозам: гнёзда, узлы, рейды, титаны, боссы */
function buildRadarMarkers(ctx: Ctx): { angle: number; dist: number; color: number; icon: 'boss' | 'titan' | 'node' | 'raid' }[] {
  const radarMarkers: { angle: number; dist: number; color: number; icon: 'boss' | 'titan' | 'node' | 'raid' }[] = [];
  const halfViewW = (ctx.svc.overlay.screenWidth / 2) / (ctx.camZoom * ctx.svc.overlay.scale);
  const halfViewH = (ctx.svc.overlay.screenHeight / 2) / (ctx.camZoom * ctx.svc.overlay.scale);
  for (const a of ctx.anomalies) {
    if (a.kind !== 'cocoon') continue;
    const dx = a.x - ctx.camX;
    const dy = a.y - ctx.camY;
    if (Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30) {
      radarMarkers.push({
        angle: Math.atan2(a.y - ctx.player.y, a.x - ctx.player.x),
        dist: Math.hypot(a.x - ctx.player.x, a.y - ctx.player.y),
        color: 0xa3e635,
        icon: 'node',
      });
    }
  }
  for (const n of ctx.bioNodes) {
    const dx = n.x - ctx.camX;
    const dy = n.y - ctx.camY;
    const offscreen = Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30;
    if (!offscreen) continue;
    if (n.owner === 1 && n.raided) {
      radarMarkers.push({
        angle: Math.atan2(n.y - ctx.player.y, n.x - ctx.player.x),
        dist: Math.hypot(n.x - ctx.player.x, n.y - ctx.player.y),
        color: 0xff3b4e,
        icon: 'raid',
      });
    } else if (n.owner !== 1) {
      radarMarkers.push({
        angle: Math.atan2(n.y - ctx.player.y, n.x - ctx.player.x),
        dist: Math.hypot(n.x - ctx.player.x, n.y - ctx.player.y),
        color: n.owner === -1 ? 0xff3b4e : 0xa855f7,
        icon: 'node',
      });
    }
  }
  for (const e of ctx.enemies) {
    if (!e.titan && e.type !== 'boss' && !e.elite) continue;
    const dx = e.x - ctx.camX;
    const dy = e.y - ctx.camY;
    if (Math.abs(dx) > halfViewW - 30 || Math.abs(dy) > halfViewH - 30) {
      radarMarkers.push({
        angle: Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x),
        dist: Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y),
        color: e.titan ? 0xffb800 : e.type === 'boss' ? 0xff2a85 : 0xfacc15,
        icon: e.titan ? 'titan' : 'boss',
      });
    }
  }
  radarMarkers.sort((a, b) => a.dist - b.dist);
  if (radarMarkers.length > 6) radarMarkers.length = 6;
  return radarMarkers;
}

/** Рендер текущего состояния: радар + PixiOverlay + очистка кадра эффектов */
function renderFrame(ctx: Ctx, nowSec: number, dt: number): void {
  const overlay = ctx.svc.overlay;
  // Био-радар чашки Петри: обновление миникарты и направлений
  if (ctx.started && !ctx.gameOver && !ctx.dying) {
    ctx.svc.radar.update(
      dt,
      { x: ctx.player.x, y: ctx.player.y, dirX: ctx.playerDirX, dirY: ctx.playerDirY },
      ctx.enemies,
      ctx.bioNodes,
      ctx.curWorldW,
      ctx.curWorldH,
      Math.max(650, 850 / ctx.camZoom),
      ctx.anomalies
    );
  }

  // Маркеры радара считаются только в активном забеге (как в исходном loop())
  const radarMarkers = ctx.started && !ctx.gameOver && !ctx.dying ? buildRadarMarkers(ctx) : [];
  if (!ctx.paused || !ctx.started) {
    overlay.render(
      {
        player: { x: ctx.player.x, y: ctx.player.y, r: playerRadius(ctx), tail: visibleTail(ctx) },
        playerDeath: ctx.dying ? { progress: Math.min(1, 1 - Math.max(0, ctx.dyingT) / DYING_DURATION), x: ctx.player.x, y: ctx.player.y } : null,
        tailState: ctx.tailState,
        tailHunger: ctx.sinceSoul > 3,
        cam: { x: ctx.camX, y: ctx.camY, zoom: ctx.camZoom, worldW: ctx.curWorldW, worldH: ctx.curWorldH },
        morph: {
          dirX: ctx.playerDirX,
          dirY: ctx.playerDirY,
          vermis: dnaLvl(ctx, 'vermis'),
          chimera: dnaLvl(ctx, 'chimera'),
          mycelium: dnaLvl(ctx, 'mycelium'),
          symbiont: dnaLvl(ctx, 'symbiont'),
          hybrid: ([...ctx.hybridsTaken].pop() ?? null),
          scaleId: SCALES[ctx.scaleIdx].id,
          worldW: ctx.curWorldW,
          worldH: ctx.curWorldH,
        },
        enemies: ctx.enemies,
        projs: ctx.projs,
        eprojs: ctx.eprojs,
        xpOrbs: ctx.orbs,
        nodes: ctx.bioNodes,
        orbit: ctx.wlvl.orbs > 0
          ? {
              count: ORBS.count[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.orbs - 1))],
              cx: ctx.player.x,
              cy: ctx.player.y,
              radius: ORBS.radius[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.orbs - 1))] * orbRadiusMul(ctx),
              angle: ctx.orbAngle,
            }
          : null,
        aura: ctx.wlvl.aura > 0 ? { x: ctx.player.x, y: ctx.player.y, r: AURA.radius[Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.aura - 1))] } : null,
        arcs: frameArcs,
        lasers: frameLasers,
        cysts: ctx.liveCysts,
        mandibleSwipes: ctx.mandibleSwipes,
        radarMarkers,
        anomalies: ctx.anomalies,
        neuralLinkActive: ctx.neuralLinkActive,
        carapaceReady: ctx.relicCarapace && ctx.carapaceShieldReady,
        dashing: ctx.dashT > 0,
        ringReady: ctx.ringCd <= 0 && ctx.pathHistory.length >= 24,
        settings: {
          parallax: ctx.settings.microParallax,
          subtleShake: ctx.settings.cameraShake === 'subtle',
          softFlashes: ctx.settings.screenFlashes === 'soft',
        },
      },
      nowSec,
      dt
    );
  }
  frameArcs.length = 0;
  frameLasers.length = 0;
}
