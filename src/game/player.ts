// Игрок: ввод (мышь/WASD/джойстик/геймпад), рывок, регенерация, экономика
// хвоста, штаммы physarum, голод, Кольцо Смерти, «Нестабильный геном» и лужи.
import { DASH, SCALES, STRAIN, TAIL } from '../engine/types';
import { getLocale } from '../i18n';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import { maxTail, moveCost, visibleTail } from './state';
import { detectRingClosure, tailwarnFlash } from './combat';
import { beginDeathSequence } from './runFlow';
import { updateResonanceHud } from '../ui/hud';
import { showModal } from '../ui/modals';
import { showToast } from '../ui/toast';

/** Шаг игрока: ввод, движение, рывок, хвост, голод, кольцо, нестабильность, лужи */
export function stepPlayer(ctx: Ctx, dt: number): { mx: number; my: number } {
  // Движение игрока: мышь как цель, WASD и мобильный джойстик как альтернатива
  // Gamepad controller polling
  const gp = ctx.svc.gamepad.poll();
  if (gp.dashPressed) ctx.dashRequested = true;
  if (gp.callPressed) ctx.callRequested = true;
  if (gp.pausePressed && ctx.started && !ctx.gameOver && !ctx.dying && ctx.pendingUps === 0) {
    ctx.paused = !ctx.paused;
    if (ctx.paused) {
      ctx.svc.sfx.stopBgm();
      showModal(ctx, 'intro');
    } else {
      ctx.svc.sfx.startBgm();
      showModal(ctx, null);
    }
  }

  // Dash trigger & cooldown
  ctx.dashCd -= dt;
  if (ctx.dashT > 0) {
    ctx.dashT -= dt;
    ctx.player.iframe = Math.max(ctx.player.iframe, 0.1);
  }
  const joyDash = ctx.svc.joystick.dashRequested();
  if ((ctx.dashRequested || joyDash) && ctx.dashCd <= 0) {
    ctx.dashRequested = false;
    if (joyDash) ctx.svc.joystick.consumeDash();
    ctx.dashCd = Math.max(0.8, DASH.cd + ctx.dailyDashCdDelta);
    ctx.dashT = DASH.duration;
    ctx.player.iframe = Math.max(ctx.player.iframe, DASH.duration + 0.15);
    ctx.svc.sfx.dash();
    ctx.svc.gamepad.vibrate(120, 0.8, 0.4);
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x66fcf1, 55);
    ctx.svc.overlay.beginShake(0.08);
    ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, ctx.player.x), toSimY(ctx, ctx.player.y), 400);
  }
  ctx.dashRequested = false;

  let mx = 0;
  let my = 0;
  if (ctx.keys.has('w') || ctx.keys.has('arrowup')) my -= 1;
  if (ctx.keys.has('s') || ctx.keys.has('arrowdown')) my += 1;
  if (ctx.keys.has('a') || ctx.keys.has('arrowleft')) mx -= 1;
  if (ctx.keys.has('d') || ctx.keys.has('arrowright')) mx += 1;
  const jv = ctx.svc.joystick.vector();
  if (jv.x !== 0 || jv.y !== 0) { mx += jv.x; my += jv.y; }
  if (Math.hypot(gp.moveX, gp.moveY) > 0.1) { mx += gp.moveX; my += gp.moveY; }
  if (mx === 0 && my === 0 && ctx.mouse.active) {
    const dx = ctx.mouse.x - ctx.player.x;
    const dy = ctx.mouse.y - ctx.player.y;
    const d = Math.hypot(dx, dy);
    if (d > 7) { mx = dx / d; my = dy / d; }
  }
  const mLen = Math.hypot(mx, my) || 1;
  if (Math.hypot(gp.aimX, gp.aimY) > 0.2) {
    ctx.playerDirX = gp.aimX;
    ctx.playerDirY = gp.aimY;
  } else if (mx !== 0 || my !== 0) {
    ctx.playerDirX = mx / mLen;
    ctx.playerDirY = my / mLen;
  }
  // Симбиоз со штаммом: свой след ускоряет, чужой растворяет хвост.
  // Скорость Шкалы бытия - отдельный множитель: мир растёт 1.24^k,
  // а зум падает медленнее, поэтому базовую скорость нельзя терять из moveSpeed
  // (там уже сидят апгрейды x0.7/x1.08/x1.10)
  const dashMul = ctx.dashT > 0 ? DASH.speedMul : 1;
  const spdNow = ctx.moveSpeed
    * SCALES[ctx.scaleIdx].playerSpeedMul
    * ctx.codexBonuses.moveSpeedMul
    * dashMul
    * (ctx.trailOwn ? STRAIN.ownSpeedMul : 1)
    * (ctx.unstableT > 0 && ctx.unstableKind === 0 ? 0.55 : 1);
  const prevPx = ctx.player.x;
  const prevPy = ctx.player.y;
  ctx.player.x = Math.max(16, Math.min(ctx.curWorldW - 16, ctx.player.x + (mx / mLen) * spdNow * dt));
  ctx.player.y = Math.max(16, Math.min(ctx.curWorldH - 16, ctx.player.y + (my / mLen) * spdNow * dt));
  const movedDist = Math.hypot(ctx.player.x - prevPx, ctx.player.y - prevPy);
  ctx.cystMoveDist += movedDist;
  if (movedDist > 0.35) ctx.idleTime = 0;
  else ctx.idleTime += dt;

  ctx.player.iframe = Math.max(0, ctx.player.iframe - dt);
  ctx.player.hp = Math.min(ctx.maxHp, ctx.player.hp + (ctx.regen + ctx.resRegen + ctx.nodeRegenBonus + ctx.codexBonuses.regenAdd) * dt);

  stepTailEconomy(ctx, dt, mx, my);
  stepHungerAndMutations(ctx, dt, mx, my);
  return { mx, my };
}

/** Экономика хвоста: движение сжигает энергию, неподвижность истощает форму.
 *  Усилитель (-40% таяния), Нейросеть (2+ узла) и Вспышка митоза замедляют таяние и питают хвост. */
function stepTailEconomy(ctx: Ctx, dt: number, mx: number, my: number): void {
  let ownedNodeCnt = 0;
  for (const n of ctx.bioNodes) if (n.owner === 1) ownedNodeCnt++;
  ctx.neuralLinkActive = false;
  if (ownedNodeCnt >= 2) {
    for (const n of ctx.bioNodes) {
      if (n.owner === 1 && Math.hypot(ctx.player.x - n.x, ctx.player.y - n.y) <= 380) {
        ctx.neuralLinkActive = true;
        break;
      }
    }
  }
  if (ctx.bloomBuffT > 0) ctx.bloomBuffT = Math.max(0, ctx.bloomBuffT - dt);
  if (ctx.resonanceTimer > 0) {
    ctx.resonanceTimer -= dt;
    if (ctx.resonanceTimer <= 0) {
      if (ctx.resonanceStreak >= 3) ctx.svc.sfx.resDrop();
      ctx.resonanceStreak = 0;
      ctx.resonanceTimer = 0;
      ctx.resonanceMult = 1.0;
    }
  }
  updateResonanceHud(ctx);

  const isMoving = mx !== 0 || my !== 0;
  const isVoidEvent = ctx.svc.waves.isVoidActive();
  const networkMeltMul = (ctx.neuralLinkActive ? 0.85 : 1) * (ctx.bloomBuffT > 0 ? 0.5 : 1);
  const unstableMeltMul = ctx.unstableT > 0 && ctx.unstableKind === 1 ? 2 : 1;
  const ampMeltMul = ctx.ampOwned ? 0.6 : 1;
  if (!isVoidEvent) {
    if (isMoving) {
      const melt = moveCost(ctx) * (ctx.trailEnemy ? STRAIN.enemyMeltMul : 1) * (ctx.cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul * ampMeltMul;
      ctx.tailLen = Math.max(TAIL.minLen, ctx.tailLen - melt * dt);
    } else {
      // Метаболический голод неподвижности: если стоять на месте, организм тратит биомассу хвоста
      const idleMelt = TAIL.idleCost * (ctx.trailEnemy ? STRAIN.enemyMeltMul : 1) * (ctx.cursePredator ? 3 : 1) * networkMeltMul * unstableMeltMul * ampMeltMul;
      ctx.tailLen = Math.max(TAIL.minLen, ctx.tailLen - idleMelt * dt);
    }
  }
  if (ctx.trailOwn && ctx.tailLen < maxTail(ctx)) {
    ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + STRAIN.ownTailRegen * dt);
  }
  if (ctx.neuralLinkActive && ctx.tailLen < maxTail(ctx)) {
    ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + 1.4 * dt);
  }
  if (ctx.bloomBuffT > 0 && ctx.tailLen < maxTail(ctx)) {
    ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + 2.8 * dt);
  }
  // Если хвост сжался до минимума и игрок стоит на месте без движения - голод грызёт здоровье
  if (ctx.tailLen <= TAIL.minLen + 0.1 && !isMoving && !isVoidEvent) {
    ctx.player.hp = Math.max(0, ctx.player.hp - 6 * dt);
    if (ctx.player.hp <= 0) {
      ctx.lastDamageCause = {
        kind: 'starvation',
        labelRu: 'Истощение хвоста (неподвижность без энергии)',
        labelEn: 'Tail starvation (idle with depleted tail)',
        amount: 6 * dt,
      };
      beginDeathSequence(ctx);
    }
  }
  // Траектория пишется с шагом, длина ограничена ёмкостью
  const lastPt = ctx.pathHistory[ctx.pathHistory.length - 1];
  if (!lastPt || Math.hypot(ctx.player.x - lastPt.x, ctx.player.y - lastPt.y) >= TAIL.segSpacing) {
    ctx.pathHistory.push({ x: ctx.player.x, y: ctx.player.y });
  }
  const cap = Math.ceil(maxTail(ctx)) + 2;
  while (ctx.pathHistory.length > cap) ctx.pathHistory.shift();

  // Кольцо Смерти: самопересечение траектории хвоста -> схлопывание полигона
  ctx.ringCd -= dt;
  detectRingClosure(ctx);
}

/** Голод, критика хвоста, «Нестабильный геном» и ядовитые лужи «Спор» */
function stepHungerAndMutations(ctx: Ctx, dt: number, mx: number, my: number): void {
  // Голод: без сфер ДНК дольше 3 секунд кончик мигает, критика - оранжевая кромка
  ctx.sinceSoul += dt;
  if (ctx.curseHunger && ctx.sinceSoul > 3.0) {
    ctx.player.hp = Math.max(1, ctx.player.hp - 3 * dt);
  }
  ctx.tailMaxReached = Math.max(ctx.tailMaxReached, ctx.tailLen);
  const tailRatio = ctx.tailLen / maxTail(ctx);
  const newTailState: 'ok' | 'low' | 'crit' = tailRatio > 0.7 ? 'ok' : tailRatio > 0.4 ? 'low' : 'crit';
  if (newTailState !== ctx.tailState && newTailState === 'crit' && ctx.critFlashT <= 0) {
    tailwarnFlash(ctx);
    ctx.critFlashT = 4;
  }
  ctx.tailState = newTailState;
  ctx.critFlashT -= dt;

  // «Нестабильный геном» (Мутант): каждые 20 сек случайный дебаф на 5 сек
  ctx.unstableT -= dt;
  ctx.unstableRollT -= dt;
  if (ctx.genes.has('unstable') && ctx.unstableRollT <= 0) {
    ctx.unstableRollT = 20;
    ctx.unstableT = 5;
    ctx.unstableKind = Math.floor(Math.random() * 3);
    const en = getLocale() === 'en';
    showToast(ctx, ctx.unstableKind === 0
      ? `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: speed -45%' : 'ГЕНОМ ДРОЖИТ: скорость -45%'}`
      : ctx.unstableKind === 1
        ? `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: 2x tail melt' : 'ГЕНОМ ДРОЖИТ: хвост тает вдвое'}`
        : `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-chimera"/></svg> ${en ? 'UNSTABLE GENOME: slower attacks' : 'ГЕНОМ ДРОЖИТ: атака замедлена'}`);
  }
  // «Споры» (Паразит): хвост оставляет ядовитые лужи
  ctx.puddleT -= dt;
  if (ctx.genes.has('puddles') && (mx !== 0 || my !== 0) && ctx.puddleT <= 0) {
    ctx.puddleT = 0.45;
    const pts = visibleTail(ctx);
    const src = pts.length > 4 ? pts[Math.floor(pts.length / 2)] : ctx.player;
    ctx.pendingPuddles.push({ x: src.x, y: src.y });
  }
}
