// Оружие: шипы, снаряды, орбиты, нова, токсин-аура, жвала, споровые цисты
// + вражеские снаряды и гибридные эффекты (Тесла-Сеть, перехват Грави-Хлыста).
import { AURA, CYSTS, ENEMIES, MANDIBLES, NOVA, ORBS, PLAYER, PROJ_LIFE, PROJ_RADIUS, PROJ_SPEED, SPIKES, WEAPON_MAX_LVL } from '../engine/types';
import type { EnemyType, EliteMutation } from '../engine/types';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import type { Enemy } from './entities';
import { nearby } from './entities';
import { effAtkSpd, effDmg, visibleTail } from './state';
import { enemyDmgBonus, hitCocoonsInArea, applyDamageToPlayer, enemyCauseLabel } from './combat';

/** Резонанс: орбиты шире (ген «Гармоника орбит») */
export function orbRadiusMul(ctx: Ctx): number {
  return ctx.genes.has('resonance') ? 1.25 : 1;
}

/** Резонанс: орбиты больнее */
export function orbDmgMul(ctx: Ctx): number {
  return ctx.genes.has('resonance') ? 1.2 : 1;
}

// ---------- Шипы ----------

/** Авто-выстрел шипами в до 3 ближайших целей за 1 линейный проход без аллокаций */
export function stepSpikes(ctx: Ctx, dt: number): void {
  ctx.spikesCd -= dt;
  if (ctx.wlvl.spikes <= 0 || ctx.spikesCd > 0 || ctx.enemies.length === 0) return;
  ctx.spikesFired++;
  const safeSpikesIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.spikes - 1));
  ctx.spikesCd = SPIKES.cd[safeSpikesIdx] / effAtkSpd(ctx);
  const count = SPIKES.count[safeSpikesIdx];
  const dmg = SPIKES.dmg[safeSpikesIdx] * effDmg(ctx);
  ctx.svc.sfx.shoot();
  const maxTargets = Math.min(count, 3);
  const closestTargets: Enemy[] = [];
  const closestD2: number[] = [];
  const range2 = SPIKES.range * SPIKES.range;
  for (let j = 0; j < ctx.enemies.length; j++) {
    const e = ctx.enemies[j];
    if (e.hp <= 0) continue;
    const dx = e.x - ctx.player.x;
    const dy = e.y - ctx.player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > range2) continue; // цели вне боевого радиуса не обстреливаются
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
    if (target) ang = Math.atan2(target.y - ctx.player.y, target.x - ctx.player.x) + spread;
    else ang = (i / count) * Math.PI * 2;
    ctx.projs.push({
      x: ctx.player.x, y: ctx.player.y,
      vx: Math.cos(ang) * PROJ_SPEED,
      vy: Math.sin(ang) * PROJ_SPEED,
      life: PROJ_LIFE,
      dmg,
      bounces: ctx.genes.has('chain') ? 4 : 0,
    });
  }
}

// ---------- Снаряды ----------

/** Полёт снарядов шипов + попадания (+ «Цепная реакция» и броня элит) */
export function stepProjs(ctx: Ctx, dt: number): void {
  for (let i = ctx.projs.length - 1; i >= 0; i--) {
    const p = ctx.projs[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    let hit = false;
    for (const e of nearby(p.x, p.y, PROJ_RADIUS + 24)) {
      if (Math.hypot(p.x - e.x, p.y - e.y) < PROJ_RADIUS + e.radius) {
        const inDmg = p.dmg * (e.elite === 'armored' ? 0.4 : 1) * enemyDmgBonus(ctx, e);
        e.hp -= inDmg;
        e.flash = 0.1;
        ctx.svc.sfx.hit();
        ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0xffffff);
        ctx.damageDealt += inDmg;
        hit = true;
        // «Цепная реакция» (Мутант): снаряд отскакивает к ближайшему врагу
        if (p.bounces > 0) {
          let best: Enemy | null = null;
          let bestD = 220;
          for (const o of ctx.enemies) {
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
    if (!hit && hitCocoonsInArea(ctx, p.x, p.y, PROJ_RADIUS, p.dmg, 0xffffff)) {
      ctx.svc.sfx.hit();
      hit = true;
    }
    if (hit || p.life <= 0) ctx.projs.splice(i, 1);
  }
}

// ---------- Вражеские снаряды ----------

/** Яд врагов-плевателей: полёт, попадание в игрока;
 *  «Грави-Хлыст» (Фазовый Змей): хвост перехватывает снаряды и швыряет их во врагов */
export function stepEnemyProjs(ctx: Ctx, dt: number): void {
  for (let i = ctx.eprojs.length - 1; i >= 0; i--) {
    const p = ctx.eprojs[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (ctx.hybridsTaken.has('phase_serpent')) {
      const tailPts = visibleTail(ctx);
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
            best.hp -= 26 * effDmg(ctx);
            best.flash = 0.1;
            ctx.svc.overlay.pushDamage(best.x, best.y - best.radius - 6, 26 * effDmg(ctx), 0x9db4ff);
            ctx.damageDealt += 26 * effDmg(ctx);
            ctx.eprojs.splice(i, 1);
            continue;
          }
        }
      }
    }
    if (Math.hypot(p.x - ctx.player.x, p.y - ctx.player.y) < 6 + PLAYER.radius && ctx.player.iframe <= 0) {
      applyDamageToPlayer(ctx, p.dmg, enemyCauseLabel(p.sourceType as EnemyType, p.titan, p.elite as EliteMutation | null, 'снаряд', 'projectile'));
      p.life = 0;
    }
    if (p.life <= 0 || p.x < 0 || p.x > ctx.curWorldW || p.y < 0 || p.y > ctx.curWorldH) {
      if (p.x < 0 || p.x > ctx.curWorldW || p.y < 0 || p.y > ctx.curWorldH) {
        ctx.svc.overlay.spawnPulse(Math.max(4, Math.min(ctx.curWorldW - 4, p.x)), Math.max(4, Math.min(ctx.curWorldH - 4, p.y)), 0xff3b5c, 14);
      }
      ctx.eprojs.splice(i, 1);
    }
  }
}

// ---------- Орбиты ----------

/** Молния-орбиты (+ Резонанс: шире и больнее) + Тесла-Сеть Ионного Колосса */
export function stepOrbWeapon(ctx: Ctx, dt: number, arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[]): void {
  if (ctx.wlvl.orbs <= 0) return;
  ctx.orbAngle += ORBS.speed * dt;
  const safeOrbsIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.orbs - 1));
  const count = ORBS.count[safeOrbsIdx];
  const dmg = ORBS.dmg[safeOrbsIdx] * effDmg(ctx) * orbDmgMul(ctx) * ctx.codexBonuses.orbsDmgMul;
  const orbR = ORBS.radius[safeOrbsIdx] * orbRadiusMul(ctx);
  for (let k = 0; k < count; k++) {
    const ang = ctx.orbAngle + (k * Math.PI * 2) / count;
    const ox = ctx.player.x + Math.cos(ang) * orbR;
    const oy = ctx.player.y + Math.sin(ang) * orbR;
    for (const e of nearby(ox, oy, 24)) {
      if (e.orbCd > 0) continue;
      if (Math.hypot(ox - e.x, oy - e.y) < 12 + e.radius) {
        const inDmg = dmg * enemyDmgBonus(ctx, e);
        e.hp -= inDmg;
        e.flash = 0.1;
        e.orbCd = ORBS.orbCd;
        ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x9df5ff);
        ctx.damageDealt += inDmg;
      }
    }
  }
  // Тесла-Сеть (Ионный Колосс): дуги от сфер орбит к врагам рядом
  if (ctx.hybridsTaken.has('ion_colossus')) {
    for (let k = 0; k < count; k++) {
      const ang = ctx.orbAngle + (k * Math.PI * 2) / count;
      const ox = ctx.player.x + Math.cos(ang) * orbR;
      const oy = ctx.player.y + Math.sin(ang) * orbR;
      for (const e of nearby(ox, oy, 150)) {
        const dd = Math.hypot(e.x - ox, e.y - oy);
        if (dd < 150 && e.orbCd <= 0) {
          arcs.push({ x1: ox, y1: oy, x2: e.x, y2: e.y, color: 0x9df5ff });
          e.hp -= dmg * 0.9;
          e.flash = 0.08;
          e.orbCd = ORBS.orbCd + 0.15;
          ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, dmg * 0.9, 0x9df5ff);
          ctx.damageDealt += dmg * 0.9;
          ctx.svc.sfx.zap();
          break; // одна дуга на сферу за кадр
        }
      }
    }
  }
}

// ---------- Нова ----------

/** Нова-импульс (+ «Суперзаряд» Мутанта: дольше кулдаун, x4 урон, x2 радиус) */
export function stepNova(ctx: Ctx, dt: number): void {
  ctx.novaCd -= dt;
  ctx.toxinFlash = Math.max(0, ctx.toxinFlash - dt);
  if (ctx.wlvl.nova <= 0 || ctx.novaCd > 0) return;
  const safeNovaIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.nova - 1));
  const scMul = ctx.genes.has('supercharge') ? 4 : 1;
  ctx.novaCd = (NOVA.cd[safeNovaIdx] * ctx.biolabNovaCdMul * (ctx.genes.has('supercharge') ? 1.6 : 1)) / effAtkSpd(ctx);
  const radius = NOVA.radius[safeNovaIdx] * (ctx.genes.has('supercharge') ? 2 : 1) * ctx.codexBonuses.novaRadiusMul;
  const dmg = NOVA.dmg[safeNovaIdx] * effDmg(ctx) * scMul * ctx.codexBonuses.explosiveDmgMul;
  ctx.svc.sfx.nova();
  for (const e of nearby(ctx.player.x, ctx.player.y, radius)) {
    const d = Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y);
    if (d < radius + ENEMIES[e.type].radius) {
      const inDmg = dmg * (e.elite === 'armored' ? 0.4 : 1) * enemyDmgBonus(ctx, e);
      e.hp -= inDmg;
      e.flash = 0.12;
      const push = 200;
      e.kbx += ((e.x - ctx.player.x) / Math.max(1, d)) * push;
      e.kby += ((e.y - ctx.player.y) / Math.max(1, d)) * push;
      ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0xff7b93);
      ctx.damageDealt += inDmg;
      // Чумная Сверхновая (Споровый Реактор): нова заражает спорами
      if (ctx.hybridsTaken.has('spore_reactor') && e.sporeInf <= 0) e.sporeInf = 3;
    }
  }
  hitCocoonsInArea(ctx, ctx.player.x, ctx.player.y, radius, dmg, 0xff7b93);
  ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xff7b93, radius + 14);
  ctx.svc.overlay.beginShake(0.22);
  ctx.toxinFlash = 0.5;
}

// ---------- Токсин-аура ----------

/** Токсин-аура: тик урона вокруг игрока */
export function stepAura(ctx: Ctx, dt: number): void {
  if (ctx.wlvl.aura <= 0) return;
  ctx.auraTick -= dt;
  if (ctx.auraTick > 0) return;
  ctx.auraTick = AURA.tick;
  const safeAuraIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.aura - 1));
  const radius = AURA.radius[safeAuraIdx];
  const dmg = AURA.dps[safeAuraIdx] * AURA.tick * effDmg(ctx);
  for (const e of nearby(ctx.player.x, ctx.player.y, radius + 24)) {
    if (Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y) < radius + ENEMIES[e.type].radius) {
      e.hp -= dmg;
      e.flash = 0.06;
      ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, dmg, 0x86efac);
      ctx.damageDealt += dmg;
    }
  }
  hitCocoonsInArea(ctx, ctx.player.x, ctx.player.y, radius, dmg, 0x86efac);
}

// ---------- Жвала ----------

/** Хищные жвала: фронтальный конус урона (включая гнёзда спор в секторе) */
export function stepMandibles(ctx: Ctx, dt: number): void {
  ctx.mandiblesCd -= dt;
  for (let i = ctx.mandibleSwipes.length - 1; i >= 0; i--) {
    ctx.mandibleSwipes[i].life -= dt;
    if (ctx.mandibleSwipes[i].life <= 0) ctx.mandibleSwipes.splice(i, 1);
  }
  if (ctx.wlvl.mandibles <= 0 || ctx.mandiblesCd > 0 || ctx.enemies.length === 0) return;
  const mandIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.mandibles - 1));
  const range = MANDIBLES.range[mandIdx];
  const arc = MANDIBLES.arc;
  const dmg = MANDIBLES.dmg[mandIdx] * effDmg(ctx);
  let enemyInCone = false;
  for (const a of ctx.anomalies) {
    if (a.kind !== 'cocoon') continue;
    const dx = a.x - ctx.player.x;
    const dy = a.y - ctx.player.y;
    const d = Math.hypot(dx, dy);
    if (d <= range + a.r && (dx * ctx.playerDirX + dy * ctx.playerDirY) / Math.max(0.001, d) >= Math.cos(arc / 2)) {
      enemyInCone = true;
      break;
    }
  }
  if (!enemyInCone) {
    for (const e of nearby(ctx.player.x, ctx.player.y, range + 20)) {
      const dx = e.x - ctx.player.x;
      const dy = e.y - ctx.player.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + ENEMIES[e.type].radius) {
        const dot = (dx * ctx.playerDirX + dy * ctx.playerDirY) / Math.max(0.001, d);
        if (dot >= Math.cos(arc / 2)) { enemyInCone = true; break; }
      }
    }
  }
  if (!enemyInCone) return;
  ctx.mandiblesCd = MANDIBLES.cd[mandIdx] / effAtkSpd(ctx);
  ctx.svc.sfx.mandible();
  ctx.mandibleSwipes.push({ x: ctx.player.x, y: ctx.player.y, dirX: ctx.playerDirX, dirY: ctx.playerDirY, range, arc, life: 0.22 });
  hitCocoonsInArea(ctx, ctx.player.x + ctx.playerDirX * (range * 0.5), ctx.player.y + ctx.playerDirY * (range * 0.5), range * 0.65, dmg, 0x00ff9d);
  for (const e of nearby(ctx.player.x, ctx.player.y, range + 20)) {
    const dx = e.x - ctx.player.x;
    const dy = e.y - ctx.player.y;
    const d = Math.hypot(dx, dy);
    if (d <= range + ENEMIES[e.type].radius) {
      const dot = (dx * ctx.playerDirX + dy * ctx.playerDirY) / Math.max(0.001, d);
      if (dot >= Math.cos(arc / 2)) {
        e.hp -= dmg;
        e.flash = 0.1;
        e.kbx += ctx.playerDirX * 180;
        e.kby += ctx.playerDirY * 180;
        ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, dmg, 0x00ff9d);
        ctx.damageDealt += dmg;
      }
    }
  }
}

// ---------- Споровые цисты ----------

/** Споровые цисты: выкладываются только при движении и взводятся с задержкой */
export function stepCysts(ctx: Ctx, dt: number): void {
  ctx.cystsCd -= dt;
  if (ctx.wlvl.cysts > 0 && ctx.cystsCd <= 0 && ctx.cystMoveDist >= CYSTS.moveDist) {
    const cIdx = Math.min(WEAPON_MAX_LVL - 1, Math.max(0, ctx.wlvl.cysts - 1));
    ctx.cystMoveDist = 0;
    ctx.cystsCd = CYSTS.cd[cIdx] / effAtkSpd(ctx);
    const perDrop = CYSTS.perDrop[cIdx];
    const maxActive = CYSTS.maxCysts[cIdx];
    const dmg = CYSTS.dmg[cIdx] * effDmg(ctx);
    const r = CYSTS.radius[cIdx];
    for (let k = 0; k < perDrop; k++) {
      if (ctx.liveCysts.length >= maxActive) ctx.liveCysts.shift();
      const dropA = Math.atan2(-ctx.playerDirY, -ctx.playerDirX) + (Math.random() - 0.5) * 1.1;
      const dropD = 18 + Math.random() * 20;
      ctx.liveCysts.push({
        x: ctx.player.x + Math.cos(dropA) * dropD,
        y: ctx.player.y + Math.sin(dropA) * dropD,
        r,
        dmg,
        life: 14,
        armT: CYSTS.armTime,
        armed: false,
      });
    }
    ctx.svc.sfx.cyst();
  }
  for (let i = ctx.liveCysts.length - 1; i >= 0; i--) {
    const cyst = ctx.liveCysts[i];
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
    if (!explode) continue;
    const blastR = cyst.r * CYSTS.blastMul;
    ctx.svc.sfx.nova();
    ctx.svc.overlay.spawnPulse(cyst.x, cyst.y, 0x39ff14, blastR);
    ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, cyst.x), toSimY(ctx, cyst.y), 300);
    for (const e of nearby(cyst.x, cyst.y, blastR + 20)) {
      if (Math.hypot(e.x - cyst.x, e.y - cyst.y) < blastR + e.radius) {
        const inDmg = cyst.dmg * ctx.codexBonuses.explosiveDmgMul * enemyDmgBonus(ctx, e);
        e.hp -= inDmg;
        e.flash = 0.12;
        ctx.svc.overlay.pushDamage(e.x, e.y - e.radius - 6, inDmg, 0x39ff14);
        ctx.damageDealt += inDmg;
      }
    }
    ctx.liveCysts.splice(i, 1);
  }
}

// ---------- Оркестрация ----------

/** Все оружия в исходном порядке шага симуляции */
export function stepWeapons(ctx: Ctx, dt: number, arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[]): void {
  stepSpikes(ctx, dt);
  stepProjs(ctx, dt);
  stepEnemyProjs(ctx, dt);
  stepOrbWeapon(ctx, dt, arcs);
  stepNova(ctx, dt);
  stepAura(ctx, dt);
  stepMandibles(ctx, dt);
  stepCysts(ctx, dt);
}
