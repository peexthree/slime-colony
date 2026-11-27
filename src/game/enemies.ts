// Враги: спавн по спавн-таблице и волнам, смерть с экосистемой расщеплений,
// ИИ (погоня/отступление/мембрана/навыки/хвостик/заражение/элиты), рейды на башни.
import { getLocale } from '../i18n';
import { BOSS_EVERY, DNA_COLORS, ELITE, ENEMIES, ENEMY_CAP, PLAYER, SCALES, SPAWN_TABLE } from '../engine/types';
import type { DnaBranch, EliteMutation, EnemyType } from '../engine/types';
import { WaveDirector } from '../engine/waves';
import { unlockCodexEntry } from '../engine/codex';
import type { Ctx } from './context';
import { toSimX, toSimY, viewHalfH, viewHalfW } from './context';
import type { Enemy } from './entities';
import { hashCell, nearby, sporeNearbyBuf } from './entities';
import { effDmg, playerRadius, refreshCodexBonuses } from './state';
import { biomeEnemyFlow, biomeEnemySpeedMul, biomeKbDecayRate } from './biomeFx';
import { applyDamageToPlayer, enemyCauseLabel } from './combat';
import { finishRun } from './runFlow';
import { startMetamorphosis } from './metamorphosis';
import { showToast } from '../ui/toast';

/** Спавн врага: сторона от режиссёра волн или случайная, масштаб по шкале и времени */
export function spawnEnemy(ctx: Ctx, type: EnemyType, side?: number, atX?: number, atY?: number): void {
  const def = ENEMIES[type];
  // Миграция: режиссёр волн может фиксировать сторону появления
  const s = side ?? ctx.svc.waves.spawnSide() ?? Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (atX !== undefined && atY !== undefined) {
    x = Math.max(16, Math.min(ctx.curWorldW - 16, atX));
    y = Math.max(16, Math.min(ctx.curWorldH - 16, atY));
  } else {
    const halfViewW = viewHalfW(ctx);
    const halfViewH = viewHalfH(ctx);
    const angle = (s / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
    const spawnDist = Math.max(halfViewW, halfViewH) + 60 + Math.random() * 80;
    x = Math.max(12, Math.min(ctx.curWorldW - 12, ctx.camX + Math.cos(angle) * spawnDist));
    y = Math.max(12, Math.min(ctx.curWorldH - 12, ctx.camY + Math.sin(angle) * spawnDist));
  }
  const scale = SCALES[ctx.scaleIdx];
  const hpScale = (1 + (ctx.gameTime / 60) * 0.30) * scale.enemyHpMul;
  let maxHp = Math.round(def.hp * hpScale);
  // Размер врагов масштабируется со шкалой бытия: на макро-уровнях они равны и превосходят игрока
  let radius = Math.round(def.radius * scale.enemySizeMul);
  // Урон врагов масштабируется со шкалой и временем выживания
  const dmgScale = (1 + (ctx.gameTime / 60) * 0.15) * scale.enemyDmgMul;
  let dmg = Math.round(def.dmg * dmgScale);

  let elite: EliteMutation | null = null;
  // Элиты: каждые 45 сек следующий враг рождается мутировавшим (Этап 4.3)
  if (ctx.nextSpawnElite && type !== 'brood' && type !== 'boss') {
    ctx.nextSpawnElite = false;
    elite = (['armored', 'enraged', 'necromancer', 'magnetic', 'mirrored'] as EliteMutation[])[Math.floor(Math.random() * 5)];
    maxHp = Math.round(maxHp * ELITE.hpMul);
    radius = Math.round(radius * ELITE.radiusMul);
    dmg = Math.round(dmg * 1.3);
  }
  ctx.enemies.push({
    id: ctx.enemyIdSeq++,
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
    const e = ctx.enemies[ctx.enemies.length - 1];
    ctx.svc.overlay.spawnPulse(e.x, e.y, ELITE.haloColor, 60);
  }
}

/** Смерть врага: души ДНК, экосистема (расщепитель/матка/некромант), заражение, метаморфоз титана */
export function killEnemy(ctx: Ctx, e: Enemy, idx: number): void {
  if (e.dead) return;
  const def = ENEMIES[e.type];
  ctx.kills++;
  if (ctx.kills === 314) {
    ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xffd166, 220);
    showToast(ctx, 'РЕЗОНАНС π (3.14): ФРАКТАЛЬНАЯ СИММЕТРИЯ ДОСТИГНУТА');
  }
  ctx.svc.sfx.kill();
  if (unlockCodexEntry(e.titan ? 'titan' : e.type)) refreshCodexBonuses(ctx);
  const tip = e.tail.length > 0 ? e.tail[e.tail.length - 1] : e;
  ctx.svc.overlay.spawnSplat(tip.x, tip.y, def.color);
  ctx.corpseBeacons.push({ x: tip.x, y: tip.y, ttl: 4 });
  ctx.svc.sim.spawnPlayerSpores(toSimXSafe(ctx, tip.x), toSimYSafe(ctx, tip.y), e.type === 'boss' ? 1800 : 350);
  if (ctx.cursePredator && (e.elite || e.type === 'boss' || e.titan)) {
    ctx.player.hp = Math.min(ctx.maxHp, ctx.player.hp + 4);
  }
  // Хвостик отрывается и становится душой на его кончике.
  // Душа несёт ДНК своего генома (цвет = геном); босс рассыпается на 4 души всех геномов
  const xpVal = Math.round(def.xp * (e.elite ? ELITE.xpMul : 1));
  if (e.type === 'boss') {
    const per = Math.max(1, Math.round(xpVal / 4));
    const kinds: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      ctx.orbs.push({
        x: tip.x + Math.cos(a) * 14, y: tip.y + Math.sin(a) * 14,
        vx: 0, vy: 0, value: per, color: DNA_COLORS[kinds[k]], dna: kinds[k],
      });
    }
  } else {
    ctx.orbs.push({ x: tip.x, y: tip.y, vx: 0, vy: 0, value: xpVal, color: DNA_COLORS[def.dna], dna: def.dna });
  }
  if (e.type === 'boss' || e.elite || e.titan) {
    ctx.svc.overlay.spawnPulse(tip.x, tip.y, def.color, e.type === 'boss' ? 130 : 55);
    ctx.svc.sim.spawnPlayerSpores(toSimXSafe(ctx, tip.x), toSimYSafe(ctx, tip.y), 1500);
  }
  // Титан масштаба: убийство открывает метаморфоз (или финал на шкале 5)
  if (e.titan) {
    ctx.titanPending = false;
    ctx.enemies.splice(idx, 1);
    if (ctx.scaleIdx >= SCALES.length - 1) {
      finishRun(ctx, true);
      return;
    }
    startMetamorphosis(ctx);
    return;
  }
  // Споровый Реактор: заражённые спорами трупы детонируют цепной реакцией
  if (ctx.hybridsTaken.has('spore_reactor') && e.sporeInf > 0) {
    const boom = 16 * effDmg(ctx);
    ctx.svc.overlay.spawnPulse(e.x, e.y, 0x86efac, 70);
    for (const o of nearby(e.x, e.y, 70, sporeNearbyBuf)) {
      if (o === e || o.hp <= 0) continue;
      o.hp -= boom;
      o.flash = 0.1;
      if (o.sporeInf <= 0 && ctx.hybridsTaken.has('spore_reactor')) o.sporeInf = 3;
    }
  }
  // Этап 4.1: экосистема - организмы умирают по-своему
  if (e.type === 'splitter') {
    // Личинка-дробитель: распадается на двух бегунов
    for (let k = 0; k < 2; k++) {
      spawnEnemy(ctx, 'runner', undefined, e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30);
    }
  }
  if (e.type === 'colony') {
    // Матка умерла: выводок гибнет вместе с ней
    for (let k = 0; k < ctx.enemies.length; k++) {
      if (ctx.enemies[k].colonyId === e.id) {
        ctx.enemies[k].hp = 0;
        ctx.enemies[k].colonyId = 0;
      }
    }
  }
  if (e.type === 'brood' && e.colonyId > 0) {
    // Смерть выводка кормит матку
    const mom = ctx.enemies.find((x) => x.id === e.colonyId);
    if (mom) mom.hp = Math.min(mom.maxHp, mom.hp + mom.maxHp * 0.05);
  }
  if (e.elite === 'necromancer') {
    // Некромант поднимает трёх личинок на месте смерти
    for (let k = 0; k < 3; k++) {
      spawnEnemy(ctx, 'grub', undefined, e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50);
    }
  }
  if (e.infected > 0) {
    // Заражённый союзник умирает: пульс в цвет игрока
    ctx.svc.overlay.spawnPulse(e.x, e.y, 0x66fcf1, 30);
  }
  // «Инфицирование» / «Феромон-раб» (Паразит): жертва переходит на вашу сторону (только если не была уже заражена)
  if (!e.elite && e.type !== 'boss' && e.type !== 'brood' && e.infected === 0) {
    if (ctx.genes.has('infection') && Math.random() < 0.35) {
      e.infected = 8;
      e.hp = e.maxHp * 0.6;
      e.vx = 0; e.vy = 0;
      ctx.svc.overlay.spawnPulse(e.x, e.y, 0x66fcf1, 30);
      return;
    }
    if (ctx.genes.has('charm') && Math.random() < 0.25) {
      e.infected = 30;
      e.hp = e.maxHp * 0.6;
      e.vx = 0; e.vy = 0;
      ctx.svc.overlay.spawnPulse(e.x, e.y, 0x66fcf1, 40);
      return;
    }
  }
  e.dead = true;
  ctx.enemies.splice(idx, 1);
}

/** Режиссёр событий волн (Этап 4.2): волны, засады, тишина, ярость, пир, миграция */
export function createWaveDirector(ctx: Ctx): WaveDirector {
  return new WaveDirector({
    addEnemy: (type, side) => spawnEnemy(ctx, type, side),
    ringAround: (type, count, cx, cy, radius) => {
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        spawnEnemy(ctx, type, undefined, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      }
    },
    dropOrb: (x, y, value) => ctx.orbs.push({ x, y, vx: 0, vy: 0, value, color: 0xbdfdf8, dna: 'vermis' }),
    announce: (text) => showToast(ctx, text),
    playerPos: () => ({ x: ctx.player.x, y: ctx.player.y }),
  });
}

// ---------- Спавны и таймеры волны ----------

/** Боссы, Титан-инкубатор, элиты, спавн-таблица + режиссёр волн; в конце buildHash */
export function stepSpawns(ctx: Ctx, dt: number): void {
  if (ctx.gameTime >= ctx.nextBossAt) {
    ctx.nextBossAt += BOSS_EVERY;
    spawnEnemy(ctx, 'boss');
    showToast(
      ctx,
      `<svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg> ` +
      `${getLocale() === 'en' ? 'CYCLE WARDEN APPROACHING' : 'СТРАЖ ЦИКЛА ПРИБЛИЖАЕТСЯ'}`,
      'danger'
    );
    ctx.svc.sfx.boss();
  }
  // Вражеский инкубатор (💜): плодит личинок каждые 20 секунд
  ctx.incubatorSpawnT -= dt;
  if (ctx.incubatorEnemy && ctx.incubatorSpawnT <= 0 && ctx.enemies.length < ENEMY_CAP) {
    ctx.incubatorSpawnT = 20;
    spawnEnemy(ctx, 'grub');
    spawnEnemy(ctx, 'grub');
  }
  // Элиты с мутациями: каждые 45 сек между боссами (Этап 4.3)
  ctx.eliteTimer -= dt;
  if (ctx.eliteTimer <= 0) {
    ctx.eliteTimer = ELITE.everySec;
    ctx.nextSpawnElite = true;
    showToast(ctx, `<svg class="bio-icon bio-magenta" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-mutagen"/></svg> ${getLocale() === 'en' ? 'MUTATION: elite approaching' : 'МУТАЦИЯ: элита приближается'}`);
  }
  // Спавн-таблица новых организмов вытесняет старый рол по мере времени
  ctx.spawnT -= dt;
  ctx.svc.waves.update(dt, ctx.gameTime);
  if (ctx.spawnT <= 0 && ctx.svc.waves.canSpawn() && ctx.enemies.length < ENEMY_CAP) {
    // Калибровка ранней кривой (плейтест + headless-сим): grace-период -
    // 1.25с между спавнами на старте (0.8/с < килрейт шипов ур.1), к 60-й
    // секунде разгон до 0.97с; пачки растут каждые 120с - ступенька 1->2
    // совпадает с открытием второго оружия.
    ctx.spawnT = Math.max(0.3, 1.25 - (ctx.gameTime / 60) * 0.14);
    const batch = 1 + Math.floor(ctx.gameTime / 120);
    for (let i2 = 0; i2 < batch; i2++) {
      spawnEnemy(ctx, rollSpawnType(ctx));
    }
  }
}

/** Рол спавн-таблицы: базовый пул + таблица из types, с учётом dailyRng */
export function rollSpawnType(ctx: Ctx): EnemyType {
  const pool: { type: EnemyType; weight: number }[] = [{ type: 'grub', weight: 0.45 }];
  if (ctx.gameTime > 40) pool.push({ type: 'runner', weight: 0.30 });
  if (ctx.gameTime > 110) pool.push({ type: 'brute', weight: 0.15 });
  for (const row of SPAWN_TABLE) {
    if (ctx.gameTime >= row.since) pool.push({ type: row.type, weight: row.chance });
  }
  const totalW = pool.reduce((s, e) => s + e.weight, 0);
  let r = (ctx.dailyRunActive ? ctx.dailyRng() : Math.random()) * totalW;
  let type: EnemyType = 'grub';
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) { type = entry.type; break; }
  }
  return type;
}

// ---------- Набеги на башни ----------

/** Набеги монстров на оставленные без охраны био-башни */
export function stepNodeRaids(ctx: Ctx, dt: number): void {
  ctx.nodeRaidScanT -= dt;
  if (ctx.nodeRaidScanT > 0) return;
  ctx.nodeRaidScanT = 1.6;
  const targetRaiders = Math.max(1, Math.round(2 * ctx.dailyEnemyNodeAggroMul));
  const unattendedLimit = Math.max(5, 11 / ctx.dailyEnemyNodeAggroMul);
  for (const n of ctx.bioNodes) {
    if (n.owner !== 1 && n.capture <= 0.25) {
      ctx.nodeUnattendedT.set(n.id, 0);
      continue;
    }
    const pDist = Math.hypot(ctx.player.x - n.x, ctx.player.y - n.y);
    if (pDist <= n.radius + 95) {
      ctx.nodeUnattendedT.set(n.id, 0);
      continue;
    }
    let curRaiders = 0;
    for (const e of ctx.enemies) {
      if (e.hp > 0 && e.infected <= 0 && e.raidNodeId === n.id) curRaiders++;
    }
    if (curRaiders < targetRaiders) {
      for (const e of ctx.enemies) {
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
      const acc = (ctx.nodeUnattendedT.get(n.id) ?? 0) + 1.6;
      ctx.nodeUnattendedT.set(n.id, acc);
      if (acc >= unattendedLimit && ctx.enemies.length < ENEMY_CAP - 2) {
        ctx.nodeUnattendedT.set(n.id, 0);
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const ang = (Math.random() * Math.PI * 2);
          const sx = Math.max(24, Math.min(ctx.curWorldW - 24, n.x + Math.cos(ang) * (n.radius + 115)));
          const sy = Math.max(24, Math.min(ctx.curWorldH - 24, n.y + Math.sin(ang) * (n.radius + 115)));
          spawnEnemy(ctx, rIdx === 0 ? 'runner' : 'grub', undefined, sx, sy);
          const spawned = ctx.enemies[ctx.enemies.length - 1];
          if (spawned) spawned.raidNodeId = n.id;
        }
      }
    } else {
      ctx.nodeUnattendedT.set(n.id, 0);
    }
  }
}

// ---------- ИИ врагов ----------

/** Враги: погоня + рейды на башни + расталкивание + контактный урон + навыки */
export function stepEnemies(ctx: Ctx, dt: number): void {
  const overlay = ctx.svc.overlay;
  const sfx = ctx.svc.sfx;
  for (let i = ctx.enemies.length - 1; i >= 0; i--) {
    const e = ctx.enemies[i];
    if (e.hp <= 0) {
      killEnemy(ctx, e, i);
      continue;
    }
    const def = ENEMIES[e.type];
    let eSpeed = def.speed * ctx.svc.waves.speedMul() * SCALES[ctx.scaleIdx].enemySpeedMul * ctx.dailyEnemySpeedMul;
    for (const n of ctx.bioNodes) {
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
        showToast(ctx, e.titan
          ? (en ? 'TITAN ENRAGED! CARAPACE FRACTURING!' : 'ТИТАН ВПАЛ В ЯРОСТЬ! РАСТРЕСКИВАНИЕ ПАНЦИРЯ!')
          : (en ? 'CYCLE WARDEN ENRAGED!' : 'СТРАЖ ЦИКЛА ВПАЛ В ЯРОСТЬ!'));
      }
      if (e.enragedPhase) eSpeed *= 1.4;
    }
    // Биом-модификатор шкалы: тени рёбер (+25% в полосе) и фрактальный прилив (+30% в волне)
    eSpeed *= biomeEnemySpeedMul(ctx, e.x);

    // Цель: заражённые союзники охотятся на врагов, а рейдеры идут отвоёвывать башню
    let tx = ctx.player.x;
    let ty = ctx.player.y;
    let keepDist = 0; // >0: держать дистанцию (плеватель/целитель/зеркало)
    if (e.infected > 0) {
      e.raidNodeId = undefined;
      let bestD = 1e9;
      for (const o of ctx.enemies) {
        if (o === e || o.infected > 0) continue;
        const dd = Math.hypot(o.x - e.x, o.y - e.y);
        if (dd < bestD) { bestD = dd; tx = o.x; ty = o.y; }
      }
      if (bestD > 1e8) { tx = ctx.player.x; ty = ctx.player.y; }
    } else if (e.raidNodeId !== undefined) {
      const rn = ctx.bioNodes.find((n) => n.id === e.raidNodeId);
      if (!rn || rn.owner === -1 || e.flash > 0 || Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y) < 95) {
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
        } else if (e.x > ctx.curWorldW - wallMargin && desiredVx > 0) {
          desiredVx = 0;
          desiredVy = (dy >= 0 ? 1 : -1) * eSpeed;
        }
        if (e.y < wallMargin && desiredVy < 0) {
          desiredVy = 0;
          desiredVx = (dx >= 0 ? 1 : -1) * eSpeed;
        } else if (e.y > ctx.curWorldH - wallMargin && desiredVy > 0) {
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

    // Затухание импульса отброса по ОБЕИМ осям (X и Y);
    // скользкая инерция шкалы 12 гасит отброс в 1.6 раза медленнее
    const kbDecayRate = biomeKbDecayRate(ctx, 6);
    e.kbx *= Math.max(0, 1 - dt * kbDecayRate);
    e.kby *= Math.max(0, 1 - dt * kbDecayRate);

    // Мягкое поле отталкивания био-мембраны по периметру чашки Петри (36px зона)
    const bMargin = 36;
    if (e.x < bMargin) {
      const p = (bMargin - e.x) / bMargin;
      e.vx += p * 340 * dt;
    } else if (e.x > ctx.curWorldW - bMargin) {
      const p = (e.x - (ctx.curWorldW - bMargin)) / bMargin;
      e.vx -= p * 340 * dt;
    }
    if (e.y < bMargin) {
      const p = (bMargin - e.y) / bMargin;
      e.vy += p * 340 * dt;
    } else if (e.y > ctx.curWorldH - bMargin) {
      const p = (e.y - (ctx.curWorldH - bMargin)) / bMargin;
      e.vy -= p * 340 * dt;
    }

    // Течение шкалы 3: пульсирующая конвекция сносит рой
    const flow = biomeEnemyFlow(ctx, eSpeed);
    e.x += (e.vx + e.kbx + flow.x) * dt;
    e.y += (e.vy + e.kby + flow.y) * dt;

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
    } else if (e.x >= ctx.curWorldW - pad) {
      e.x = ctx.curWorldW - pad;
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
    } else if (e.y >= ctx.curWorldH - pad) {
      e.y = ctx.curWorldH - pad;
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
    if (e.x < 0 || e.x > ctx.curWorldW || e.y < 0 || e.y > ctx.curWorldH) {
      const toCenterX = (ctx.curWorldW / 2) - e.x;
      const toCenterY = (ctx.curWorldH / 2) - e.y;
      const cDist = Math.hypot(toCenterX, toCenterY) || 1;
      e.vx = (toCenterX / cDist) * Math.max(eSpeed, 180);
      e.vy = (toCenterY / cDist) * Math.max(eSpeed, 180);
      e.kbx = 0;
      e.kby = 0;
      e.x = Math.max(pad, Math.min(ctx.curWorldW - pad, e.x));
      e.y = Math.max(pad, Math.min(ctx.curWorldH - pad, e.y));
    }

    // Особые навыки организмов
    e.skillCd -= dt;
    if (e.skillCd <= 0 && e.infected <= 0) {
      stepEnemySkill(ctx, e, def);
    }
    // Заражённые союзники тают со временем
    if (e.infected > 0) {
      e.infected -= dt;
      if (e.infected <= 0) { e.hp = 0; e.infected = -1; }
    }
    // Споровое заражение (Споровый Реактор): тик урона зелёными спорами
    if (e.sporeInf > 0) {
      e.sporeInf -= dt;
      e.hp -= 4 * effDmg(ctx) * dt;
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

    const cellArr = hashCell(e.x, e.y);
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
      e.x = Math.max(pad, Math.min(ctx.curWorldW - pad, e.x));
      e.y = Math.max(pad, Math.min(ctx.curWorldH - pad, e.y));
    }

    const touchD = Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y);
    if (e.infected <= 0 && touchD < e.radius + playerRadius(ctx) && e.atkCd <= 0 && ctx.player.iframe <= 0) {
      // «Броня чешуёй» (Змея): хвост гасит до 50% урона, но не более 14 единиц
      const maxReduction = Math.min(Math.round(e.dmg * 0.5), Math.floor(ctx.tailLen / 20));
      const incoming = ctx.genes.has('scales') ? Math.max(2, e.dmg - maxReduction) : e.dmg;
      applyDamageToPlayer(ctx, incoming, enemyCauseLabel(e.type, e.titan, e.elite));
      e.atkCd = 0.8;
    }
    // Заражённый союзник врезается во врагов
    if (e.infected > 0 && e.atkCd <= 0) {
      for (const o of ctx.enemies) {
        if (o === e || o.infected > 0 || o.hp <= 0) continue;
        if (Math.hypot(o.x - e.x, o.y - o.y) < e.radius + o.radius) {
          o.hp -= def.dmg * 2;
          o.flash = 0.1;
          e.atkCd = 0.5;
          break;
        }
      }
    }

    if (e.hp <= 0) killEnemy(ctx, e, i);
  }
}

/** Особые навыки организмов: плевок, лечение, пульсар, матка, веерный залп босса */
function stepEnemySkill(ctx: Ctx, e: Enemy, def: (typeof ENEMIES)[EnemyType]): void {
  const overlay = ctx.svc.overlay;
  const sfx = ctx.svc.sfx;
  if (e.type === 'spitter' || e.type === 'mirror') {
    // Плеватель/зеркало: ядовитый снаряд в игрока
    e.skillCd = e.type === 'mirror' ? 1.6 : 2.2;
    const pd = Math.max(1, Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y));
    const pDmg = Math.round((e.type === 'mirror' ? 12 : 8) * (1 + ctx.scaleIdx * 0.75));
    ctx.eprojs.push({
      x: e.x, y: e.y,
      vx: ((ctx.player.x - e.x) / pd) * (150 + ctx.scaleIdx * 15),
      vy: ((ctx.player.y - e.y) / pd) * (150 + ctx.scaleIdx * 15),
      dmg: pDmg, life: 2.8,
      sourceType: e.type, titan: e.titan, elite: e.elite,
    });
  } else if (e.type === 'healer') {
    // Целитель: лечит ближний штамм - приоритетная цель
    e.skillCd = 0.6;
    e.flash = 0.15;
    for (const o of ctx.enemies) {
      if (o === e || o.infected > 0 || o.hp <= 0) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < 90) o.hp = Math.min(o.maxHp, o.hp + 7);
    }
  } else if (e.type === 'pulsar') {
    // Пульсар: взрывное кольцо с отбросом
    e.skillCd = 5;
    const radius = 130;
    overlay.spawnPulse(e.x, e.y, ENEMIES.pulsar.color, radius + 20);
    sfx.nova();
    for (const o of ctx.enemies) { if (o === e) continue; o.tailCd = Math.max(o.tailCd, 0); }
    const pd = Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y);
    if (pd < radius + PLAYER.radius && ctx.player.iframe <= 0) {
      applyDamageToPlayer(ctx, def.dmg, enemyCauseLabel('pulsar', false, e.elite, 'импульс', 'shockwave'));
      const kx = (ctx.player.x - e.x) / Math.max(1, pd);
      const ky = (ctx.player.y - e.y) / Math.max(1, pd);
      ctx.player.x = Math.max(16, Math.min(ctx.curWorldW - 16, ctx.player.x + kx * 40));
      ctx.player.y = Math.max(16, Math.min(ctx.curWorldH - 16, ctx.player.y + ky * 40));
    }
  } else if (e.type === 'colony') {
    // Матка: плодит выводок (максимум 6 живых)
    e.skillCd = 6;
    let broodAlive = 0;
    for (const o of ctx.enemies) if (o.colonyId === e.id) broodAlive++;
    if (broodAlive < 6) {
      for (let k = 0; k < 2; k++) {
        spawnEnemy(ctx, 'brood', undefined, e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 40);
        const b = ctx.enemies[ctx.enemies.length - 1];
        if (b.type === 'brood') b.colonyId = e.id;
      }
    }
  } else if (e.type === 'boss') {
    // Босс / Титан: веерный залп шипов или радиальный шквал в фазе ярости (< 40% HP)
    const baseAng = Math.atan2(ctx.player.y - e.y, ctx.player.x - e.x);
    const pDmg = Math.round((e.titan ? 14 : 11) * (1 + ctx.scaleIdx * 0.7));
    const pSpd = 175 + ctx.scaleIdx * 18;
    if (e.enragedPhase) {
      e.skillCd = 3.0;
      overlay.spawnPulse(e.x, e.y, 0xff1744, e.radius + 45);
      for (let k = 0; k < 8; k++) {
        const ang = baseAng + (k * Math.PI * 2) / 8;
        ctx.eprojs.push({
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
        ctx.eprojs.push({
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

// Локальные обёртки перевода координат для killEnemy
function toSimXSafe(ctx: Ctx, wx: number): number {
  return toSimX(ctx, wx);
}

function toSimYSafe(ctx: Ctx, wy: number): number {
  return toSimY(ctx, wy);
}
