// Бой: урон игроку и i-frames, причины смерти, Кольцо Смерти, аномалии чашки
// Петри, хвост-хлыст и реликвии органелл (гальваника / абиссаль / карапакс).
import { getLocale } from '../i18n';
import { DNA_COLORS, ENEMY_CAP, RING, TAIL, ringMinArea, type EnemyType } from '../engine/types';
import type { DnaBranch, EliteMutation } from '../engine/types';
import { isActive } from '../engine/biolab';
import { inPoly, polyArea, segIsect } from './ringOfDeath';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import type { Enemy } from './entities';
import { nearby, nearbyRect } from './entities';
import { effDmg, iframeNow, maxTail, tailDps, visibleTail } from './state';
import { beginDeathSequence } from './runFlow';
import { spawnEnemy } from './enemies';
import { updateResonanceHud } from '../ui/hud';
import { showToast } from '../ui/toast';

/** Длительность медленного разрыва клетки перед финальным окном */
export const DYING_DURATION = 1.45;

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

/** Кто убил: для окна смерти и статистики */
export function enemyCauseLabel(
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

/** Вспышка урона: экранная кромка + тряска камеры + звук */
export function hurtFlash(ctx: Ctx): void {
  if (ctx.settings.screenFlashes !== 'off') {
    ctx.dom.hurtEl.classList.add('hit');
    setTimeout(() => ctx.dom.hurtEl.classList.remove('hit'), 120);
  }
  if (ctx.settings.cameraShake !== 'off') {
    const dur = ctx.settings.cameraShake === 'subtle' ? 0.08 : 0.16;
    ctx.svc.overlay.beginShake(dur);
  }
  ctx.svc.sfx.hurt();
}

/** Мягкое свечение по краям при критическом хвосте (без стробоскопа) */
export function tailwarnFlash(ctx: Ctx): void {
  if (ctx.settings.screenFlashes !== 'off') {
    ctx.dom.tailwarnEl.classList.add('active');
    setTimeout(() => ctx.dom.tailwarnEl.classList.remove('active'), 400);
  }
}

/** Урон игроку: i-frames, карапакс, сброс резонанса и смерть при 0 HP */
export function applyDamageToPlayer(ctx: Ctx, amount: number, cause?: { kind: string; labelRu: string; labelEn: string }): boolean {
  if (ctx.dying || ctx.gameOver) return false;
  if (ctx.relicCarapace && ctx.carapaceShieldReady) {
    ctx.carapaceShieldReady = false;
    ctx.carapaceCooldown = 18;
    ctx.player.iframe = iframeNow(ctx) + 0.3;
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x00ff9d, 90);
    showToast(ctx, getLocale() === 'en' ? 'CARAPACE: HIT ABSORBED!' : 'КАРАПАКС: УДАР ПОГЛОЩЁН!');
    ctx.svc.sfx.zap();
    return false;
  }
  const incomingDmg = isActive('perm_armor') ? amount * 0.90 : amount;
  ctx.lastDamageCause = cause
    ? { ...cause, amount: incomingDmg }
    : { kind: 'unknown', labelRu: 'Неизвестная угроза реактора', labelEn: 'Unknown reactor hazard', amount: incomingDmg };
  ctx.player.hp -= incomingDmg;
  ctx.player.iframe = iframeNow(ctx);
  hurtFlash(ctx);
  ctx.svc.gamepad.vibrate(110, 0.55, 0.25);
  if (ctx.resonanceStreak >= 3) ctx.svc.sfx.resDrop();
  ctx.resonanceStreak = 0;
  ctx.resonanceTimer = 0;
  ctx.resonanceMult = 1.0;
  updateResonanceHud(ctx);
  if (ctx.player.hp <= 0) {
    ctx.player.hp = 0;
    beginDeathSequence(ctx);
  }
  return true;
}

// ---------- Кольцо Смерти: замыкание траектории хвоста ----------

/**
 * Детектор Кольца Смерти: ищем самопересечение последнего сегмента движения
 * с ранней траекторией. Первое пересечение = самая большая замкнутая область.
 */
export function detectRingClosure(ctx: Ctx): void {
  if (ctx.ringCd > 0) return;
  const pts = ctx.pathHistory;
  const n = pts.length;
  if (n < 24) return;
  const ax = pts[n - 1].x;
  const ay = pts[n - 1].y;
  const bx = ctx.player.x;
  const by = ctx.player.y;
  const win = Math.min(n - 1, RING.historyWindow);
  for (let i = 0; i < win - RING.skipAdj; i++) {
    const isect = segIsect(ax, ay, bx, by, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (isect) {
      const poly: { x: number; y: number }[] = [isect];
      for (let k = i + 1; k < n; k++) poly.push({ x: pts[k].x, y: pts[k].y });
      poly.push({ x: bx, y: by });
      const area = polyArea(poly);
      // Порог площади динамический: замкнуть кольцо коротким хвостом физически
      // невозможно (ringMinArea растёт квадратично от длины хвоста)
      if (area >= ringMinArea(ctx.tailLen)) {
        triggerRing(ctx, poly);
        return;
      }
      return; // замыкание слишком маленькое - не ищем меньшие
    }
  }
}

/** Схлопывание полигона: урон всем внутри, вспышка, звук */
export function triggerRing(ctx: Ctx, poly: { x: number; y: number }[]): void {
  ctx.ringCd = RING.cooldown;
  const plasma = ctx.hybridsTaken.has('plasma_leviathan');
  const dmg = ctx.tailLen * RING.dmgPerSeg * effDmg(ctx) * (plasma ? 4 : 1)
    * ctx.codexBonuses.explosiveDmgMul * ctx.codexBonuses.ringDmgMul;
  let cx = 0;
  let cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  cx /= poly.length;
  cy /= poly.length;
  const color = plasma ? 0xff9d5c : 0xffd166;
  ctx.svc.overlay.spawnPoly(poly, color);
  ctx.svc.overlay.spawnPulse(cx, cy, color, 120);
  ctx.svc.overlay.beginShake(0.25);
  ctx.svc.sfx.ring();
  // Цели: враги в охвате полигона, точный тест - лучом
  let maxR = 0;
  let ringHits = 0;
  for (const p of poly) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
  for (const e of nearby(cx, cy, maxR + 40)) {
    if (e.hp <= 0) continue;
    if (!inPoly(e.x, e.y, poly)) continue;
    ringHits++;
    const inDmg = dmg * enemyDmgBonus(ctx, e);
    e.hp -= inDmg;
    e.flash = 0.12;
    e.tailCd = Math.max(e.tailCd, 0.3);
    ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, color);
    ctx.damageDealt += inDmg;
    ctx.dmgRing += inDmg;
    // Огненный Удав: всё не-элитное внутри кольца аннигилирует
    if (plasma && !e.elite && e.type !== 'boss') e.hp = 0;
  }
  // Кольцо Смерти наносит x2.5 осадного урона Гнёздам спор внутри полигона
  for (let ai = ctx.anomalies.length - 1; ai >= 0; ai--) {
    const a = ctx.anomalies[ai];
    if (a.kind !== 'cocoon' || (a.hp ?? 0) <= 0) continue;
    if (inPoly(a.x, a.y, poly)) {
      const siegeDmg = dmg * 2.5;
      a.hp = (a.hp ?? 0) - siegeDmg;
      ctx.svc.overlay.pushDamage(a.x, a.y - a.r - 6, siegeDmg, color);
      ctx.damageDealt += siegeDmg;
      if ((a.hp ?? 0) <= 0) destroyCocoon(ctx, ai);
    }
  }
  // Маленькая плата за кольцо: хвост тратится на замыкание
  ctx.tailLen = Math.max(TAIL.minLen, ctx.tailLen - 1.5);
  // Пасхалка «Пакт Уробороса»: 3 пустых кольца подряд дают +5 HP
  if (ringHits === 0) {
    ctx.emptyRingsCount++;
    if (ctx.emptyRingsCount === 3) {
      ctx.emptyRingsCount = 0;
      ctx.player.hp = Math.min(ctx.maxHp, ctx.player.hp + 5);
      showToast(ctx, getLocale() === 'en' ? 'OUROBOROS PACT: Self-knowledge is hunger (+5 HP)' : 'ПАКТ УРОБОРОСА: Самопознание — это тоже форма голода (+5 HP)');
    }
  } else {
    ctx.emptyRingsCount = 0;
  }
}

/** Бонус урона кодекса по типу врага (титан отдельно) */
export function enemyDmgBonus(ctx: Ctx, e: Enemy): number {
  return ctx.codexBonuses.enemyDmgMul[e.titan ? 'titan' : e.type] ?? 1;
}

// ---------- Аномалии чашки Петри ----------

/** Уничтожить гнездо спор: взрыв бьёт окружающих и осыпает арену душами ДНК */
export function destroyCocoon(ctx: Ctx, idx: number): void {
  const a = ctx.anomalies[idx];
  if (!a) return;
  ctx.anomalies.splice(idx, 1);
  ctx.svc.overlay.spawnPulse(a.x, a.y, 0xa3e635, 160);
  ctx.svc.overlay.spawnSplat(a.x, a.y, 0x86efac);
  ctx.svc.overlay.beginShake(0.24);
  ctx.svc.sfx.capture(true);
  ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, a.x), toSimY(ctx, a.y), 1400);
  // Взрыв гнезда бьёт окружающих врагов и осыпает арену богатыми душами ДНК
  for (const o of nearby(a.x, a.y, 140)) {
    if (o.hp > 0) {
      o.hp -= 55 * effDmg(ctx);
      o.flash = 0.12;
    }
  }
  const branches: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
  for (let k = 0; k < 14; k++) {
    const ang = (k / 14) * Math.PI * 2 + Math.random() * 0.3;
    const spd = 80 + Math.random() * 140;
    const dna = branches[k % branches.length];
    ctx.orbs.push({
      x: a.x, y: a.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      value: 2 + ctx.scaleIdx,
      color: DNA_COLORS[dna],
      dna,
    });
  }
  showToast(ctx, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-cocoon"/></svg> ${getLocale() === 'en' ? 'SPORE COCOON DESTROYED! +14 DNA ORBS' : 'ГНЕЗДО СПОР УНИЧТОЖЕНО! +14 СФЕР ДНК'}`);
}

/** Осадный урон по гнёздам спор в радиусе; true - хоть одно задето */
export function hitCocoonsInArea(ctx: Ctx, x: number, y: number, radius: number, dmg: number, color: number): boolean {
  let hitAny = false;
  for (let ai = ctx.anomalies.length - 1; ai >= 0; ai--) {
    const a = ctx.anomalies[ai];
    if (a.kind !== 'cocoon' || (a.hp ?? 0) <= 0) continue;
    if (Math.hypot(x - a.x, y - a.y) < radius + a.r) {
      a.hp = (a.hp ?? 0) - dmg;
      ctx.svc.overlay.pushDamage(a.x, a.y - a.r - 6, dmg, color);
      ctx.damageDealt += dmg;
      hitAny = true;
      if ((a.hp ?? 0) <= 0) destroyCocoon(ctx, ai);
    }
  }
  return hitAny;
}

/** Заспавнить случайную аномалию: кислотный прилив / гнездо спор / вспышка митоза */
export function spawnAnomaly(ctx: Ctx): void {
  const roll = Math.random();
  const ang = Math.random() * Math.PI * 2;
  const en = getLocale() === 'en';
  if (roll < 0.36) {
    // Кислотный прилив: зона 3.5с предупреждения -> 9с едкой кислоты
    const r = 160 + ctx.scaleIdx * 18;
    const dist = 210 + Math.random() * 140;
    const ax = Math.max(r + 20, Math.min(ctx.curWorldW - r - 20, ctx.player.x + Math.cos(ang) * dist));
    const ay = Math.max(r + 20, Math.min(ctx.curWorldH - r - 20, ctx.player.y + Math.sin(ang) * dist));
    ctx.anomalies.push({ kind: 'acid', x: ax, y: ay, r, warnT: 3.5, life: 9, maxLife: 9, spawnCd: 0 });
    showToast(ctx, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-acid"/></svg> ${en ? 'ACID TIDE IN SECTOR' : 'КИСЛОТНЫЙ ПРИЛИВ В СЕКТОРЕ'}`);
    ctx.svc.sfx.anomalyAlert();
  } else if (roll < 0.72) {
    // Гнездо спор: кокон, плодящий выводок, пока не уничтожен (особенно уязвим к Кольцу Смерти)
    const dist = 260 + Math.random() * 150;
    const ax = Math.max(70, Math.min(ctx.curWorldW - 70, ctx.player.x + Math.cos(ang) * dist));
    const ay = Math.max(70, Math.min(ctx.curWorldH - 70, ctx.player.y + Math.sin(ang) * dist));
    const maxHp = Math.round(180 * (1 + ctx.scaleIdx * 0.5));
    ctx.anomalies.push({ kind: 'cocoon', x: ax, y: ay, r: 30, warnT: 1.5, life: 32, maxLife: 32, hp: maxHp, maxHp, spawnCd: 2.5 });
    ctx.svc.overlay.spawnPulse(ax, ay, 0xa3e635, 110);
    showToast(ctx, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-cocoon"/></svg> ${en ? 'SPORE COCOON: CRUSH WITH RING!' : 'ГНЕЗДО СПОР: СХЛОПНИТЕ КОЛЬЦОМ!'}`);
    ctx.svc.sfx.anomalyAlert();
  } else {
    // Вспышка митоза: питательный дождь из 22 сфер ДНК и бафф хвоста на 10 сек
    ctx.bloomBuffT = 10;
    ctx.anomalies.push({ kind: 'bloom', x: ctx.player.x, y: ctx.player.y, r: 240, warnT: 0, life: 10, maxLife: 10, spawnCd: 0 });
    const branches: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
    for (let k = 0; k < 22; k++) {
      const oa = (k / 22) * Math.PI * 2 + Math.random() * 0.25;
      const od = 90 + Math.random() * 210;
      const ox = Math.max(16, Math.min(ctx.curWorldW - 16, ctx.player.x + Math.cos(oa) * od));
      const oy = Math.max(16, Math.min(ctx.curWorldH - 16, ctx.player.y + Math.sin(oa) * od));
      const dna = branches[k % branches.length];
      ctx.orbs.push({ x: ox, y: oy, vx: 0, vy: 0, value: 1 + Math.floor(ctx.scaleIdx * 0.5), color: DNA_COLORS[dna], dna });
    }
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x66fcf1, 180);
    showToast(ctx, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-anomaly-bloom"/></svg> ${en ? 'MITOSIS BLOOM: NUTRIENT SURGE (10s)' : 'ВСПЫШКА МИТОЗА: ПИТАТЕЛЬНАЯ СРЕДА (10 с)'}`);
    ctx.svc.sfx.capture(true);
  }
}

/** Периодический спавн аномалий + жизненный цикл активных (кислота/гнёзда) */
export function stepAnomalies(ctx: Ctx, dt: number, runRng: () => number): void {
  ctx.anomalyCd -= dt;
  if (ctx.anomalyCd <= 0 && ctx.anomalies.length < 3 && ctx.metamorphT <= 0) {
    spawnAnomaly(ctx);
    ctx.anomalyCd = 46 + runRng() * 18;
  }
  for (let ai = ctx.anomalies.length - 1; ai >= 0; ai--) {
    const a = ctx.anomalies[ai];
    if (a.warnT > 0) {
      a.warnT -= dt;
      continue;
    }
    a.life -= dt;
    if (a.life <= 0) {
      ctx.anomalies.splice(ai, 1);
      continue;
    }
    if (a.kind === 'acid') {
      if (Math.hypot(ctx.player.x - a.x, ctx.player.y - a.y) < a.r) {
        ctx.tailLen = Math.max(TAIL.minLen, ctx.tailLen - 12 * dt);
        if (ctx.tailLen <= TAIL.minLen + 0.1) {
          ctx.player.hp = Math.max(0, ctx.player.hp - 6 * dt);
          if (ctx.player.hp <= 0) {
            ctx.lastDamageCause = {
              kind: 'acid',
              labelRu: 'Кислотный прилив (хвост растворён)',
              labelEn: 'Acid Tide (tail dissolved)',
              amount: 6 * dt,
            };
            beginDeathSequence(ctx);
          }
        }
      }
      for (const e of nearby(a.x, a.y, a.r + 16)) {
        if (e.hp > 0 && Math.hypot(e.x - a.x, e.y - a.y) < a.r) {
          e.hp -= 32 * effDmg(ctx) * dt;
          e.flash = Math.max(e.flash, 0.04);
        }
      }
    } else if (a.kind === 'cocoon') {
      a.spawnCd -= dt;
      if (a.spawnCd <= 0 && ctx.enemies.length < ENEMY_CAP) {
        a.spawnCd = 3.4;
        const spawnT: EnemyType = Math.random() < 0.35 ? 'runner' : 'grub';
        spawnEnemy(ctx, spawnT, undefined, a.x + (Math.random() - 0.5) * 44, a.y + (Math.random() - 0.5) * 44);
        spawnEnemy(ctx, 'grub', undefined, a.x + (Math.random() - 0.5) * 44, a.y + (Math.random() - 0.5) * 44);
        ctx.svc.overlay.spawnPulse(a.x, a.y, 0xa3e635, a.r + 18);
      }
    }
  }
}

// ---------- Хвост-хлыст ----------

/** Хвост-хлыст: враги на траектории хвоста горят; чем длиннее хвост, тем больнее */
export function stepTailWhip(ctx: Ctx, dt: number): void {
  ctx.tailTick -= dt;
  ctx.whipTipCd -= dt;
  if (ctx.tailTick > 0) return;
  ctx.tailTick = TAIL.tick;
  const dmg = tailDps(ctx) * TAIL.tick * effDmg(ctx);
  const pts = visibleTail(ctx);
  if (pts.length > 0) {
    // Bounding Box хвоста: гарантирует попадания по всей длине любого хвоста
    let minX = ctx.player.x, maxX = ctx.player.x, minY = ctx.player.y, maxY = ctx.player.y;
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const pad = TAIL.hitRadius + 32;
    const buf = nearbyRect(minX, minY, maxX, maxY, pad);
    for (let k = 0; k < buf.length; k++) {
      const e = buf[k];
      if (e.tailCd > 0 || e.hp <= 0) continue;
      const hitDist = TAIL.hitRadius + e.radius * 0.4;
      const hitDistSq = hitDist * hitDist;
      for (let i = pts.length - 1; i >= 0; i -= 2) {
        const pt = pts[i];
        const dx = e.x - pt.x;
        const dy = e.y - pt.y;
        if (dx * dx + dy * dy < hitDistSq) {
          const inDmg = dmg * enemyDmgBonus(ctx, e);
          e.hp -= inDmg;
          e.flash = 0.06;
          e.tailCd = TAIL.cd;
          ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x66fcf1);
          ctx.damageDealt += inDmg;
          ctx.dmgTail += inDmg;
          // «Отражение» элиты: часть урона возвращается бойцу вблизи
          if (e.elite === 'mirrored' && Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y) < 200 && ctx.player.iframe <= 0) {
            applyDamageToPlayer(ctx, inDmg * 0.15, enemyCauseLabel(e.type, e.titan, e.elite, 'отражение урона', 'damage reflect'));
          }
          // «Поглощение» (Вермис) и «Живой Инкубатор» (Уроборос-Паразит):
          // тело жертвы прирастает сегментами, гибрид растёт втрое сильнее
          if (e.hp <= 0 && (ctx.genes.has('absorb') || ctx.hybridsTaken.has('ouroboros'))) {
            const gain = e.radius * (ctx.hybridsTaken.has('ouroboros') ? 2.4 : 0.8) * ctx.codexBonuses.absorbMul;
            ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + gain);
          }
          break;
        }
      }
    }
    // Хвост также задевает Гнёзда спор на арене
    for (let i = pts.length - 1; i >= 0; i -= 4) {
      if (hitCocoonsInArea(ctx, pts[i].x, pts[i].y, TAIL.hitRadius, dmg, 0x66fcf1)) break;
    }
  }
  // «Змея-хлыст» (Змея): кончик бьёт второй точкой с отдельной перезарядкой
  if (ctx.genes.has('whip2') && ctx.whipTipCd <= 0 && pts.length > 3) {
    const tip = pts[0];
    const tipDmg = dmg * 0.6;
    for (const e of nearby(tip.x, tip.y, 60)) {
      if (e.hp <= 0) continue;
      if (Math.hypot(e.x - tip.x, e.y - tip.y) < TAIL.hitRadius + e.radius * 0.4) {
        const inDmg = tipDmg * enemyDmgBonus(ctx, e);
        e.hp -= inDmg;
        e.flash = 0.06;
        ctx.whipTipCd = TAIL.cd;
        ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x9df5ff);
        ctx.damageDealt += inDmg;
        if (e.hp <= 0 && (ctx.genes.has('absorb') || ctx.hybridsTaken.has('ouroboros'))) {
          const gain = e.radius * (ctx.hybridsTaken.has('ouroboros') ? 2.4 : 0.8) * ctx.codexBonuses.absorbMul;
          ctx.tailLen = Math.min(maxTail(ctx), ctx.tailLen + gain);
        }
        break;
      }
    }
  }
}

// ---------- Реликвии органелл ----------

/** Обновление реликвий: карапакс (щит), гальваника (цепная молния), абиссаль (ослепление) */
export function stepRelics(ctx: Ctx, dt: number, arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[]): void {
  const overlay = ctx.svc.overlay;
  if (ctx.relicCarapace && !ctx.carapaceShieldReady) {
    ctx.carapaceCooldown -= dt;
    if (ctx.carapaceCooldown <= 0) {
      ctx.carapaceShieldReady = true;
      showToast(ctx, `<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-relic-carapace"/></svg> ${getLocale() === 'en' ? 'CARAPACE: SHIELD READY' : 'КАРАПАКС: ЩИТ ГОТОВ'}`);
      overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x00ff9d, 60);
    }
  }
  if (ctx.relicGalvanic) {
    ctx.galvanicTimer += dt;
    if (ctx.galvanicTimer >= 4.0) {
      ctx.galvanicTimer = 0;
      const targets = ctx.enemies
        .filter((e) => e.hp > 0 && e.infected <= 0 && Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y) < 220)
        .sort((a, b) => Math.hypot(a.x - ctx.player.x, a.y - ctx.player.y) - Math.hypot(b.x - ctx.player.x, b.y - ctx.player.y))
        .slice(0, 3);
      if (targets.length > 0) {
        let prevPt = { x: ctx.player.x, y: ctx.player.y };
        for (const tgt of targets) {
          arcs.push({ x1: prevPt.x, y1: prevPt.y, x2: tgt.x, y2: tgt.y, color: 0x66fcf1 });
          tgt.hp -= 28 * effDmg(ctx);
          tgt.flash = 0.08;
          tgt.atkCd = Math.max(tgt.atkCd, 0.8);
          overlay.pushDamage(tgt.x, tgt.y - tgt.radius - 6, 28 * effDmg(ctx), 0x66fcf1);
          prevPt = { x: tgt.x, y: tgt.y };
        }
        ctx.svc.sfx.zap();
      }
    }
  }
  if (ctx.relicAbyssal) {
    ctx.abyssalLureTimer += dt;
    if (ctx.abyssalLureTimer >= 6.0) {
      ctx.abyssalLureTimer = 0;
      overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xa855f7, 180);
      for (const e of ctx.enemies) {
        if (e.hp > 0 && e.infected <= 0 && Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y) < 180) {
          e.atkCd = Math.max(e.atkCd, 2.0);
          e.flash = 0.12;
        }
      }
      showToast(ctx, getLocale() === 'en' ? 'ABYSSAL LIGHT: SWARM BLINDED' : 'АБИССАЛЬНЫЙ СВЕТ: РОЙ ОСЛЕПЛЁН');
    }
  }
}
