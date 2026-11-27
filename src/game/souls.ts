// Души XP: магнит, консолидация, вражеский магнит, магнитные элиты,
// Симбиотический Резонанс и feeding ДНК-матрицы.
import { DNA_COLORS, HYBRIDS, TAIL } from '../engine/types';
import type { DnaBranch } from '../engine/types';
import { t, getLocale } from '../i18n';
import { dnaName, hybridName } from '../i18n/gameData';
import type { Ctx } from './context';
import type { XpOrb } from './entities';
import { nearby } from './entities';
import { dnaLvl, getResonanceMult, maxTail, RESONANCE_WINDOW } from './state';
import { biomeOrbWindAccel } from './biomeFx';
import { hybridAvail } from '../ui/upgrades';
import { updateDnaHud, updateResonanceHud, updateScaleHud } from '../ui/hud';
import { showToast } from '../ui/toast';

/** Магнитная элита притягивает душу; true - душа захвачена её полем */
export function eliteMagnetPull(ctx: Ctx, o: XpOrb, dt: number): boolean {
  for (const e of ctx.enemies) {
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

/** Сферы ДНК: магнит притягивает вблизи; вне радиуса сбора нужно подбираться самому */
export function stepSouls(ctx: Ctx, dt: number): void {
  const effMagnet = ctx.magnetR * (ctx.magnetNodeOwned ? 1.6 : 1) * ctx.codexBonuses.magnetMul;
  // Споровый ветер шкалы 9: порывы сносят души XP по ветру (0 вне порыва)
  const windAcc = biomeOrbWindAccel(ctx);
  // Консолидация душ: если душ на поле больше 70, объединяем дальние, устраняя мусор
  if (ctx.orbs.length > 70) {
    let bestDist = 1e9;
    let mergeA = -1;
    let mergeB = -1;
    const checkLimit = Math.min(ctx.orbs.length, 40);
    for (let i = 0; i < checkLimit; i++) {
      const oi = ctx.orbs[i];
      if (Math.hypot(ctx.player.x - oi.x, ctx.player.y - oi.y) < effMagnet) continue;
      for (let j = i + 1; j < checkLimit; j++) {
        const oj = ctx.orbs[j];
        const d = Math.hypot(oi.x - oj.x, oi.y - oj.y);
        if (d < bestDist) {
          bestDist = d;
          mergeA = i;
          mergeB = j;
        }
      }
    }
    if (mergeA >= 0 && mergeB >= 0) {
      if (ctx.orbs[mergeB].value > ctx.orbs[mergeA].value) {
        ctx.orbs[mergeA].dna = ctx.orbs[mergeB].dna;
        ctx.orbs[mergeA].color = ctx.orbs[mergeB].color;
      }
      ctx.orbs[mergeA].value += ctx.orbs[mergeB].value;
      ctx.orbs.splice(mergeB, 1);
    }
  }
  for (let i = ctx.orbs.length - 1; i >= 0; i--) {
    const o = ctx.orbs[i];
    const dx = ctx.player.x - o.x;
    const dy = ctx.player.y - o.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    if (d < effMagnet) {
      o.vx += (dx / d) * 900 * dt;
      o.vy += (dy / d) * 900 * dt;
    } else if (ctx.orbToEnemies) {
      // Вражеский магнит (🧲): души утекают к ближайшему врагу и съедаются им
      let best: { x: number; y: number } | null = null;
      let bestD = 170;
      const near = nearby(o.x, o.y, 170);
      for (const e of near) {
        const dd = Math.hypot(e.x - o.x, e.y - o.y);
        if (dd < bestD) { bestD = dd; best = e; }
      }
      if (best) {
        o.vx += ((best.x - o.x) / bestD) * 700 * dt;
        o.vy += ((best.y - o.y) / bestD) * 700 * dt;
        if (bestD < 14) { ctx.orbs.splice(i, 1); continue; } // душа украдена
      } else {
        o.vx *= Math.max(0, 1 - dt * 4);
        o.vy *= Math.max(0, 1 - dt * 4);
      }
    } else if (eliteMagnetPull(ctx, o, dt)) {
      // Магнитная элита (Этап 4.3) тянет эту душу к себе
    } else {
      // Сфера остаётся на месте (затухание остаточного импульса)
      o.vx *= Math.max(0, 1 - dt * 4);
      o.vy *= Math.max(0, 1 - dt * 4);
    }
    // Глобальный дрейф душ к игроку: кайт оставляет лут позади, и без
    // слабого вакуума уровни стоят до событий (находка плейтеста/сима).
    // Затухание x4 даёт терминальную скорость ~140 px/с - деликатно.
    const driftA = Math.min(1, d / 500) * 560;
    o.vx += (dx / d) * driftA * dt;
    o.vy += (dy / d) * driftA * dt;
    o.vx += windAcc.x * dt;
    o.vy += windAcc.y * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.x = Math.max(10, Math.min(ctx.curWorldW - 10, o.x));
    o.y = Math.max(10, Math.min(ctx.curWorldH - 10, o.y));
    if (d >= 12) continue;
    collectSoul(ctx, o);
    ctx.orbs.splice(i, 1);
  }
}

/** Душа съедена: опыт + энергия хвоста + ДНК её генома + биомасса шкалы */
function collectSoul(ctx: Ctx, o: XpOrb): void {
  // Симбиотический Резонанс: непрерывный сбор душ повышает множитель x1.0 .. x3.0
  const prevMult = ctx.resonanceMult;
  ctx.resonanceStreak++;
  ctx.resonanceTimer = RESONANCE_WINDOW;
  ctx.resonanceMult = getResonanceMult(ctx.resonanceStreak);
  if (ctx.resonanceMult > prevMult) {
    ctx.svc.sfx.resTierUp(ctx.resonanceMult);
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, ctx.resonanceMult >= 2.5 ? 0xff7b93 : 0x00ff9d, 48 + ctx.resonanceMult * 14);
    if (ctx.resonanceMult >= 2.0) {
      showToast(ctx, `<svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-symbiont"/></svg> ${t('hud_resonance')} x${ctx.resonanceMult.toFixed(1)}`);
    }
  }
  updateResonanceHud(ctx);

  ctx.xp += o.value * ctx.xpMul * ctx.mutagenXpMul * ctx.dailyXpMul * ctx.resonanceMult;
  ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + o.value * TAIL.soulGain);
  ctx.sinceSoul = 0;
  ctx.svc.sfx.eat();
  ctx.dnaXp[o.dna] += o.value;
  ctx.biomass += o.value * ctx.resonanceMult;
  updateScaleHud(ctx);
  const lvl = dnaLvl(ctx, o.dna);
  if (lvl > ctx.lastDnaLvl[o.dna]) {
    ctx.lastDnaLvl[o.dna] = lvl;
    const en = getLocale() === 'en';
    showToast(ctx, `<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${o.dna}"/></svg> ${en ? 'DNA' : 'ДНК'} ${dnaName(o.dna)}: ${en ? 'level' : 'уровень'} ${lvl}`);
    ctx.svc.sfx.levelUp();
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, DNA_COLORS[o.dna as DnaBranch], 70);
    updateDnaHud(ctx);
  }
  // Оба родительских генома гибрида созрели - сообщаем один раз
  for (const h of HYBRIDS) {
    if (hybridAvail(ctx, h.id) && !ctx.hybridNotified.has(h.id)) {
      ctx.hybridNotified.add(h.id);
      showToast(ctx, `<svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-mutagen"/></svg> ${getLocale() === 'en' ? 'HYBRIDIZATION READY' : 'ГИБРИДИЗАЦИЯ ВОЗМОЖНА'}: ${hybridName(h.id)}`);
      ctx.svc.sfx.capture(true);
    }
  }
}
