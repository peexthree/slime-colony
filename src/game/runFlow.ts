// Поток забега: старт, рестарт, смерть, финал, Overdrive, живые достижения,
// скрытые титулы и стартовые бонусы Биолаба.
import { t, getLocale } from '../i18n';
import { dnaName, hybridName, trChallengeTitle } from '../i18n/gameData';
import {
  BOSS_FIRST_AT, DNA_COLORS, DNA_LEVELS, ELITE, GROWTH, HYBRIDS, NOVA, PLAYER, SCALES, TAIL,
  worldSize,
} from '../engine/types';
import type { DnaBranch, WeaponId } from '../engine/types';
import { xpRequiredForLevel } from './progression';
import { isActive, loadBiolab, pointsEarned, recordRun } from '../engine/biolab';
import type { RunGenome } from '../engine/biolab';
import { checkAchievements } from '../engine/achievements';
import { CODEX_ENTRIES, loadCodex } from '../engine/codex';
import { recordLeaderboardEntry } from '../engine/leaderboard';
import { renderPortrait } from '../engine/portrait';
import { getDailyChallenge } from '../engine/challenge';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import { refreshResonance, visibleTail, playerRadius } from './state';
import { spawnNodesForScale, recomputeNodeBonuses } from './nodes';
import { spawnEnemy } from './enemies';
import { fmtTime, updateBranchChip, updateDnaHud, updateScaleHud, updateStageBiome, updateWeaponHud, updateResonanceHud, syncStagePhase } from '../ui/hud';
import { grantAchievements, showModal, updateDailyHudPill } from '../ui/modals';
import { openUpgrades, refreshMainGenome } from '../ui/upgrades';
import { showToast } from '../ui/toast';
import { applyDailyChallenge, resetDailyMods } from './daily';

/** Длительность медленного разрыва клетки перед финальным окном */
export const DYING_DURATION = 1.45;

/** Стартовые бонусы Биолаба применяются к каждому новому забегу (только активные модули!) */
export function applyBiolabStart(ctx: Ctx): void {
  const bl = loadBiolab();
  if (isActive('start_orbs', bl)) { ctx.wlvl.orbs = 1; ctx.wlvl.spikes = 0; }
  if (isActive('start_aura', bl)) {
    ctx.wlvl.aura = 1;
    ctx.wlvl.spikes = 0;
    ctx.maxHp = Math.max(50, ctx.maxHp - 15);
    ctx.player.hp = Math.min(ctx.player.hp, ctx.maxHp);
  }
  if (isActive('start_nova2', bl)) {
    ctx.wlvl.nova = 1;
    ctx.wlvl.spikes = 0;
    ctx.biolabNovaCdMul = 1.15;
    ctx.novaCd = NOVA.cd[0] * ctx.biolabNovaCdMul;
  }
  refreshResonance(ctx);
  if (isActive('start_tail_xl', bl)) ctx.tailLen = TAIL.startLen + 6;
  if (isActive('perm_regen', bl)) ctx.regen += 0.25;
  if (isActive('perm_magnet', bl)) ctx.magnetR *= 1.2;
  if (isActive('perm_dmg', bl)) ctx.dmgMul *= 1.08;
  // Синтез генома: старт с 1 ДНК-уровнем выбранной ветки
  if (isActive('unlock_vermis', bl)) { ctx.dnaXp.vermis = DNA_LEVELS[0]; ctx.lastDnaLvl.vermis = 1; }
  if (isActive('unlock_chimera', bl)) { ctx.dnaXp.chimera = DNA_LEVELS[0]; ctx.lastDnaLvl.chimera = 1; }
  if (isActive('unlock_mycelium', bl)) { ctx.dnaXp.mycelium = DNA_LEVELS[0]; ctx.lastDnaLvl.mycelium = 1; }
  if (isActive('unlock_symbiont', bl)) { ctx.dnaXp.symbiont = DNA_LEVELS[0]; ctx.lastDnaLvl.symbiont = 1; }
}

// ---------- Старт / рестарт ----------

/** Кнопка «СТАРТ/ПРОДОЛЖИТЬ»: первый запуск пересобирает арсенал и бонусы Биолаба */
export function startOrResumeRun(ctx: Ctx): void {
  if (!ctx.started && ctx.gameTime === 0 && !ctx.gameOver) {
    // Пересчитываем стартовый арсенал и активные модули Биолаба перед первым выходом
    ctx.wlvl.spikes = 1; ctx.wlvl.orbs = 0; ctx.wlvl.nova = 0; ctx.wlvl.aura = 0; ctx.wlvl.mandibles = 0; ctx.wlvl.cysts = 0;
    ctx.maxHp = PLAYER.hp;
    ctx.player.hp = PLAYER.hp;
    ctx.regen = 0.18;
    ctx.magnetR = PLAYER.magnet;
    ctx.dmgMul = 1;
    ctx.tailLen = TAIL.startLen;
    ctx.novaCd = 2;
    ctx.biolabNovaCdMul = 1;
    ctx.dnaXp.vermis = 0; ctx.dnaXp.chimera = 0; ctx.dnaXp.mycelium = 0; ctx.dnaXp.symbiont = 0;
    ctx.lastDnaLvl.vermis = 0; ctx.lastDnaLvl.chimera = 0; ctx.lastDnaLvl.mycelium = 0; ctx.lastDnaLvl.symbiont = 0;
    applyBiolabStart(ctx);
    refreshMainGenome(ctx);
    updateBranchChip(ctx);
    updateDnaHud(ctx);
    updateWeaponHud(ctx);
  }
  ctx.started = true;
  ctx.paused = false;
  ctx.svc.sfx.startBgm();
  showModal(ctx, null);
  if (ctx.dom.startBtnLabel) ctx.dom.startBtnLabel.textContent = t('resume_run');
}

/** Полный сброс забега (кнопка «ЗАНОВО»): состояние, сущности, HUD, мир */
export function resetRun(ctx: Ctx): void {
  const dom = ctx.dom;
  ctx.dying = false;
  ctx.dyingT = 0;
  ctx.lastDamageCause = null;
  ctx.capturedDeathBg = null;
  ctx.liveAchCheckT = 0;
  resetDailyMods(ctx);
  if (dom.deathCauseEl) dom.deathCauseEl.hidden = true;
  updateDailyHudPill(ctx);
  ctx.scaleIdx = 0;
  ctx.curWorldW = worldSize(0).w;
  ctx.curWorldH = worldSize(0).h;
  spawnNodesForScale(ctx, 0);
  ctx.player.x = ctx.curWorldW / 2;
  ctx.player.y = ctx.curWorldH / 2;
  ctx.camX = ctx.player.x;
  ctx.camY = ctx.player.y;
  ctx.prevCamX = ctx.camX;
  ctx.prevCamY = ctx.camY;
  ctx.camZoom = SCALES[0].zoom;
  ctx.playerDirX = 1;
  ctx.playerDirY = 0;
  ctx.player.hp = PLAYER.hp;
  ctx.player.iframe = 0;
  ctx.maxHp = PLAYER.hp;
  ctx.moveSpeed = PLAYER.speed;
  ctx.magnetR = PLAYER.magnet;
  ctx.regen = 0.18;
  ctx.dmgMul = 1;
  ctx.atkSpdMul = 1;
  for (const k of Object.keys(ctx.statStacks)) delete ctx.statStacks[k];
  ctx.wlvl.spikes = 1;
  ctx.wlvl.orbs = 0;
  ctx.wlvl.nova = 0;
  ctx.wlvl.aura = 0;
  ctx.wlvl.mandibles = 0;
  ctx.wlvl.cysts = 0;
  ctx.resDmgMul = 1; ctx.resTailMul = 1; ctx.resAtkMul = 1; ctx.resRegen = 0;
  ctx.spikesCd = 0;
  ctx.mandiblesCd = 0;
  ctx.cystsCd = 0;
  ctx.cystMoveDist = 0;
  ctx.idleTime = 0;
  ctx.dashCd = 0;
  ctx.dashT = 0;
  ctx.dashRequested = false;
  ctx.liveCysts.length = 0;
  ctx.mandibleSwipes.length = 0;
  ctx.corpseBeacons.length = 0;
  ctx.cursePredator = false;
  ctx.curseChitin = false;
  ctx.curseHunger = false;
  ctx.novaCd = 2;
  ctx.auraTick = 0;
  ctx.orbAngle = 0;
  ctx.toxinFlash = 0;
  ctx.enemies = [];
  ctx.projs = [];
  ctx.orbs = [];
  ctx.pathHistory.length = 0;
  ctx.tailTick = 0;
  ctx.tailLen = TAIL.startLen;
  ctx.kills = 0;
  ctx.rerollsLeft = 2;
  ctx.emptyRingsCount = 0;
  ctx.overdriveTier = 0;
  ctx.dmgTail = 0;
  ctx.dmgRing = 0;
  ctx.spikesFired = 0;
  ctx.pacifistShown = false;
  ctx.scale5NoNodeTime = 0;
  ctx.watcherSpawned = false;
  ctx.titanTrailTime = 0;
  ctx.titanSatedDone = false;
  ctx.level = 1;
  ctx.xp = 0;
  ctx.xpNext = xpRequiredForLevel(1);
  ctx.pendingUps = 0;
  ctx.gameTime = 0;
  ctx.spawnT = 1;
  ctx.nextBossAt = BOSS_FIRST_AT;
  ctx.nextPickDelta = 0;
  ctx.incubatorSpawnT = 20;
  ctx.nodeRaidScanT = 0;
  ctx.nodeUnattendedT.clear();
  ctx.callCd = 0;
  ctx.callRequested = false;
  ctx.frameBloom3 = 0;
  ctx.sinceSoul = 0;
  ctx.critFlashT = 0;
  ctx.tailState = 'ok';
  ctx.frameN = 0;
  // Сброс ДНК-матрицы, гибридов, шкалы бытия и статистики забега
  ctx.dnaXp.vermis = 0; ctx.dnaXp.chimera = 0; ctx.dnaXp.mycelium = 0; ctx.dnaXp.symbiont = 0;
  ctx.lastDnaLvl.vermis = 0; ctx.lastDnaLvl.chimera = 0; ctx.lastDnaLvl.mycelium = 0; ctx.lastDnaLvl.symbiont = 0;
  ctx.genes.clear();
  ctx.hybridsTaken.clear();
  ctx.hybridNotified.clear();
  ctx.tailCapBonus = 0;
  ctx.tailDpsMul = 1;
  ctx.unstableT = 0;
  ctx.unstableRollT = 0;
  ctx.puddleT = 0;
  ctx.whipTipCd = 0;
  ctx.psiZapT = 0;
  ctx.ringCd = 0;
  ctx.pendingPuddles.length = 0;
  ctx.eprojs = [];
  ctx.eliteTimer = ELITE.everySec;
  ctx.nextSpawnElite = false;
  ctx.damageDealt = 0;
  ctx.tailMaxReached = 0;
  ctx.relicGalvanic = false;
  ctx.galvanicTimer = 0;
  ctx.relicAbyssal = false;
  ctx.abyssalLureTimer = 0;
  ctx.relicCarapace = false;
  ctx.carapaceShieldReady = false;
  ctx.carapaceCooldown = 0;
  ctx.unstableKind = 0;
  recomputeNodeBonuses(ctx);
  ctx.svc.overlay.reset();
  ctx.nodesHeldMax = 0;
  ctx.scaleMaxReached = 1;
  ctx.biomass = 0;
  ctx.titanPending = false;
  ctx.metamorphT = 0;
  ctx.trailOwn = false;
  ctx.trailEnemy = false;
  ctx.winRun = false;
  ctx.anomalies.length = 0;
  ctx.anomalyCd = 42;
  ctx.bloomBuffT = 0;
  ctx.neuralLinkActive = false;
  ctx.resonanceStreak = 0;
  ctx.resonanceTimer = 0;
  ctx.resonanceMult = 1.0;
  updateResonanceHud(ctx);
  dom.gpuCanvas.style.transform = '';
  dom.gpuCanvas.style.transformOrigin = '';
  dom.bloomCanvas.style.transform = '';
  dom.bloomCanvas.style.transformOrigin = '';
  ctx.mainGenome = 'neutral';
  updateStageBiome(ctx, 1);
  updateBranchChip(ctx);
  updateDnaHud(ctx);
  updateScaleHud(ctx);
  ctx.svc.waves.reset();
  ctx.svc.sim.resetColonies();
  applyBiolabStart(ctx);
  updateWeaponHud(ctx);
  ctx.lastStatusKey = '';
  if (dom.statusChipsEl) dom.statusChipsEl.innerHTML = '';
  dom.bossHudEl?.classList.remove('show');
  ctx.paused = false;
  ctx.gameOver = false;
  ctx.svc.sfx.startBgm();
  dom.modal.classList.remove('show');
  dom.upgradeModal.classList.remove('show');
  syncStagePhase(ctx);
  if (dom.startBtnLabel) dom.startBtnLabel.textContent = t('resume_run');
}

// ---------- Смерть и финал ----------

/** Запуск медленной анимации разрыва организма перед финальным окном */
export function beginDeathSequence(ctx: Ctx): void {
  if (ctx.dying || ctx.gameOver) return;
  ctx.dying = true;
  ctx.dyingT = DYING_DURATION;
  ctx.player.hp = 0;
  ctx.paused = false;
  ctx.dom.upgradeModal.classList.remove('show');
  const sfx = ctx.svc.sfx;
  sfx.setTailDrone(false);
  sfx.stopBgm();
  sfx.death();
  ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xff3b5c, 165);
  ctx.svc.overlay.beginShake(0.45);
  if (ctx.settings.screenFlashes !== 'off') ctx.dom.hurtEl.classList.add('hit');
  const en = getLocale() === 'en';
  const causeText = ctx.lastDamageCause
    ? (en ? ctx.lastDamageCause.labelEn : ctx.lastDamageCause.labelRu)
    : t('death_cause_unknown');
  showToast(ctx, t('death_toast_fatal', { cause: causeText }), 'danger');
  ctx.capturedDeathBg = null;
  void ctx.svc.sim.captureFrame().then((fc) => { if (fc) ctx.capturedDeathBg = fc; });
  syncStagePhase(ctx);
}

/** Финал забега: смерть (win=false) или Фрактальный Парадокс (win=true) */
export function finishRun(ctx: Ctx, win: boolean): void {
  ctx.dying = false;
  ctx.gameOver = true;
  ctx.winRun = win;
  const sfx = ctx.svc.sfx;
  sfx.setTailDrone(false);
  sfx.stopBgm();
  if (win) sfx.victory();
  const bl = loadBiolab();
  const genome: RunGenome = {
    branch: ctx.mainGenome,
    weapons: (Object.entries(ctx.wlvl) as [WeaponId, number][]).filter(([, l]) => l > 0).map(([w]) => w),
    topUpgrades: Object.keys(ctx.statStacks).sort((a, b) => ctx.statStacks[b] - ctx.statStacks[a]).slice(0, 3),
    survivalTime: ctx.gameTime,
    kills: ctx.kills,
    level: ctx.level,
    bioNodesHeld: ctx.nodesHeldMax,
    tailMaxReached: Math.round(ctx.tailMaxReached),
    damageDealt: Math.round(ctx.damageDealt),
    record: ctx.gameTime > bl.bestTime,
  };
  const blAfter = recordRun(genome);
  ctx.lastGenome = genome;
  const topRecords = recordLeaderboardEntry({
    branch: ctx.mainGenome,
    time: ctx.gameTime,
    kills: ctx.kills,
    scale: ctx.scaleMaxReached,
    damageDealt: Math.round(ctx.damageDealt),
  });
  const newAchs = checkAchievements({
    time: ctx.gameTime,
    kills: ctx.kills,
    nodesHeldMax: ctx.nodesHeldMax,
    scaleMax: ctx.scaleMaxReached,
    damageDealt: ctx.damageDealt,
    codexCount: loadCodex().size,
    codexTotal: CODEX_ENTRIES.length,
    win,
  });
  const achBonusPts = newAchs.reduce((acc, a) => acc + a.reward, 0);
  grantAchievements(ctx, newAchs);
  const totalPtsGained = (blAfter.points - bl.points) + achBonusPts;

  const topStr = topRecords.slice(0, 3).map((r, i) => `#${i + 1} ${fmtTime(r.time)}`).join(' · ');
  const dom = ctx.dom;
  dom.modalTitle.textContent = win ? t('modal_win_title') : t('modal_lose_title');
  dom.modalTitle.classList.toggle('win', win);
  dom.modalTitle.classList.toggle('lose', !win);
  if (dom.deathCauseEl) {
    if (!win) {
      const en = getLocale() === 'en';
      const causeText = ctx.lastDamageCause
        ? (en ? ctx.lastDamageCause.labelEn : ctx.lastDamageCause.labelRu)
        : t('death_cause_unknown');
      dom.deathCauseEl.hidden = false;
      dom.deathCauseEl.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg><span>${t('death_cause_label', { cause: causeText })}</span>`;
    } else {
      dom.deathCauseEl.hidden = true;
    }
  }
  const hybridDef = HYBRIDS.find((h) => h.id === ctx.mainGenome);
  const trMainGenome = ctx.mainGenome === 'neutral'
    ? t('hud_specimen')
    : hybridDef
      ? hybridName(hybridDef.id)
      : dnaName(ctx.mainGenome as DnaBranch);
  const genomeLabel = ctx.mainGenome === 'neutral'
    ? t('genome_base')
    : hybridDef
      ? `${t('hybrid_prefix')}: ${trMainGenome}`
      : `${t('genome_prefix')}: ${trMainGenome}`;
  dom.modalSub.textContent = win
    ? t('modal_win_sub')
    : t('modal_lose_sub', { genome: genomeLabel, pts: totalPtsGained });
  const dmgOther = Math.max(0, Math.round(ctx.damageDealt - ctx.dmgTail - ctx.dmgRing));
  dom.deathStatsEl.innerHTML =
    `<span class="stat-metric-row"><svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-timer"/></svg> ${fmtTime(ctx.gameTime)}${genome.record ? ` <svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-record-badge"/></svg> ${t('stat_record')}` : ''}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-crimson" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-skull-hazard"/></svg> ${t('stat_kills', { n: ctx.kills })}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-weapon-spikes"/></svg> ${t('stat_lvl', { n: ctx.level })}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-lime" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-tail-length"/></svg> ${t('stat_tail', { n: Math.round(ctx.tailMaxReached) })}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-dominance"/></svg> ${t('stat_nodes', { held: ctx.nodesHeldMax, total: ctx.bioNodes.length })}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ${t('stat_scale', { n: ctx.scaleMaxReached })}${ctx.overdriveTier > 0 ? ` · OD+${ctx.overdriveTier}` : ''}</span>` +
    `<span class="stat-metric-row"><svg class="bio-icon bio-orange" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-damage-nova"/></svg> ${t('stat_dmg', { n: Math.round(ctx.damageDealt).toLocaleString(getLocale()) })}</span>` +
    `<span class="stat-metric-row" style="font-size:10px;opacity:0.85;">${t('stat_breakdown', { tail: Math.round(ctx.dmgTail), ring: Math.round(ctx.dmgRing), other: dmgOther })}</span>` +
    (topStr ? `<span class="stat-metric-row" style="color:var(--cyan);">${t('stat_top', { branch: trMainGenome, list: topStr })}</span>` : '');
  if (dom.endlessBtn) {
    dom.endlessBtn.style.display = win ? '' : 'none';
  }
  // Портрет организма: процедурный фон + асинхронный readback physarum-поля
  const drawPortrait = (bg: HTMLCanvasElement | null): void => {
    const p = renderPortrait(bg, {
      branch: ctx.mainGenome,
      weapons: genome.weapons,
      tail: visibleTail(ctx),
      bodyRadius: playerRadius(ctx),
      stats: {
        time: ctx.gameTime, kills: ctx.kills, level: ctx.level,
        tailMax: Math.round(ctx.tailMaxReached),
        nodesHeld: ctx.nodesHeldMax,
        damage: Math.round(ctx.damageDealt),
        points: Math.floor(pointsEarned(genome)),
        record: genome.record,
        scale: ctx.scaleMaxReached,
      },
    });
    const pctx = dom.portraitCanvas.getContext('2d')!;
    dom.portraitCanvas.width = p.width;
    dom.portraitCanvas.height = p.height;
    pctx.drawImage(p, 0, 0);
  };
  drawPortrait(ctx.capturedDeathBg);
  if (!ctx.capturedDeathBg) {
    void ctx.svc.sim.captureFrame().then((fc) => { if (fc && ctx.gameOver) drawPortrait(fc); });
  }
  dom.bossHudEl?.classList.remove('show');
  dom.modal.classList.add('show');
  syncStagePhase(ctx);
}

/** Бесконечный режим Overdrive после победы над 5-м Титаном */
export function enterOverdrive(ctx: Ctx): void {
  ctx.overdriveTier++;
  ctx.gameOver = false;
  ctx.paused = false;
  ctx.biomass = 0;
  ctx.player.hp = ctx.maxHp;
  ctx.dom.modal.classList.remove('show');
  ctx.svc.sfx.startBgm();
  updateScaleHud(ctx);
  syncStagePhase(ctx);
  showToast(ctx, getLocale() === 'en' ? `OVERDRIVE TIER ${ctx.overdriveTier}: INFINITE FRACTAL ACTIVE` : `OVERDRIVE TIER ${ctx.overdriveTier}: БЕСКОНЕЧНЫЙ ФРАКТАЛ АКТИВЕН`);
}

// ---------- Живые достижения и скрытые титулы ----------

/** Живая проверка достижений раз в 2.5 с во время забега */
export function checkLiveAchievements(ctx: Ctx, dt: number): void {
  ctx.liveAchCheckT += dt;
  if (ctx.liveAchCheckT < 2.5) return;
  ctx.liveAchCheckT = 0;
  grantAchievements(ctx, checkAchievements({
    time: ctx.gameTime,
    kills: ctx.kills,
    nodesHeldMax: ctx.nodesHeldMax,
    scaleMax: ctx.scaleMaxReached,
    damageDealt: ctx.damageDealt,
    codexCount: loadCodex().size,
    codexTotal: CODEX_ENTRIES.length,
    win: false,
  }));
}

/** Скрытый титул «Симбионт Мира»: 60 с без агрессии шипов */
export function maybePacifist(ctx: Ctx): void {
  if (!ctx.pacifistShown && ctx.gameTime >= 60 && ctx.spikesFired === 0) {
    ctx.pacifistShown = true;
    showToast(ctx, 'СКРЫТЫЙ ТИТУЛ «СИМБИОНТ МИРА»: 60с без агрессии шипов');
  }
}

/** «Сытый Титан»: 20 с рядом с Титаном на своём штамме - мутация отдаёт ДНК */
export function maybeTitanSated(ctx: Ctx, dt: number): void {
  if (ctx.titanSatedDone || !ctx.trailOwn) return;
  const titan = ctx.enemies.find((e) => e.titan && e.hp > 0);
  if (titan && Math.hypot(titan.x - ctx.player.x, titan.y - ctx.player.y) < 180) {
    ctx.titanTrailTime += dt;
    if (ctx.titanTrailTime >= 20) {
      ctx.titanSatedDone = true;
      ctx.orbs.push({ x: titan.x, y: titan.y, vx: 0, vy: 0, value: 15, color: DNA_COLORS.symbiont, dna: 'symbiont' });
      ctx.svc.overlay.spawnPulse(titan.x, titan.y, DNA_COLORS.symbiont, 140);
      showToast(ctx, 'СЫТЫЙ ТИТАН: МУТАЦИЯ ПОГЛОТИЛА СЛЕД (+ДНК)');
    }
  }
}

/** «Наблюдатель»: на шкале 5+ отказаться от всех узлов на 60 с - особый босс */
export function maybeWatcher(ctx: Ctx, dt: number): void {
  if (ctx.watcherSpawned || ctx.scaleIdx < 4) return;
  const owned = ctx.bioNodes.filter((n) => n.owner === 0).length;
  if (owned === 0) {
    ctx.scale5NoNodeTime += dt;
    if (ctx.scale5NoNodeTime >= 60) {
      ctx.watcherSpawned = true;
      spawnEnemy(ctx, 'boss');
      showToast(ctx, 'ОБРАЗЕЦ ОТКАЗЫВАЕТСЯ ОТ СИМБИОЗА: НАБЛЮДАТЕЛЬ');
    }
  } else {
    ctx.scale5NoNodeTime = 0;
  }
}

/** Уровень и апгрейды */
export function maybeLevelUp(ctx: Ctx): void {
  if (ctx.xp < ctx.xpNext) return;
  ctx.xp -= ctx.xpNext;
  ctx.level++;
  ctx.xpNext = xpRequiredForLevel(ctx.level);
  ctx.pendingUps++;
  ctx.maxHp = Math.min(220, ctx.maxHp + GROWTH.hpPerLvl);
  ctx.player.hp = Math.min(ctx.maxHp, ctx.player.hp + 14);
  ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xbdfdf8, 80);
  ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, ctx.player.x), toSimY(ctx, ctx.player.y), 1600);
  openUpgrades(ctx);
}

// ---------- Дневное испытание: старт ----------

/** Кнопка «ИСПОЛНИТЬ» в окне дневного испытания (вызывается после полного сброса) */
export function startDailyRun(ctx: Ctx): void {
  const ch = getDailyChallenge();
  applyDailyChallenge(ctx, ch);
  ctx.maxHp = Math.max(40, ctx.maxHp + ch.modifiers.maxHpDelta);
  ctx.player.hp = Math.min(ctx.player.hp, ctx.maxHp);
  ctx.started = true;
  ctx.paused = false;
  ctx.dnaXp[ch.branch] = Math.max(ctx.dnaXp[ch.branch], DNA_LEVELS[0]);
  ctx.lastDnaLvl[ch.branch] = Math.max(ctx.lastDnaLvl[ch.branch], 1);
  refreshMainGenome(ctx);
  updateDnaHud(ctx);
  updateBranchChip(ctx);
  updateDailyHudPill(ctx);
  showModal(ctx, null);
  showToast(ctx, `${t('daily_challenge')} (${ch.dayKey}): ${trChallengeTitle(ch.branch, ch.title)}`, 'warn');
}
