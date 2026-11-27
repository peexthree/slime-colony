// Метаморфоз: переход между шкалами бытия, пробуждение Титана масштаба.
import { getLocale } from '../i18n';
import { scaleName, scaleSub } from '../i18n/gameData';
import { METAMORPH, SCALES, TAIL, WORLD, worldSize } from '../engine/types';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import { spawnNodesForScale } from './nodes';
import { finishRun } from './runFlow';
import { spawnEnemy } from './enemies';
import { syncBiomeFxScale } from './biomeFx';
import { updateScaleHud, updateStageBiome } from '../ui/hud';
import { showToast } from '../ui/toast';

/** Метаморфоз: переход на следующую шкалу - bullet-time, рост мира, эволюция хвоста */
export function startMetamorphosis(ctx: Ctx): void {
  const sfx = ctx.svc.sfx;
  const overlay = ctx.svc.overlay;
  if (ctx.scaleIdx >= SCALES.length - 1) {
    if (ctx.overdriveTier > 0) {
      ctx.overdriveTier++;
      ctx.biomass = 0;
      ctx.player.hp = Math.min(ctx.maxHp, ctx.player.hp + ctx.maxHp * 0.3);
      sfx.metamorph();
      showToast(ctx, getLocale() === 'en' ? `OVERDRIVE TIER ${ctx.overdriveTier}: FRACTAL EXPANDS` : `OVERDRIVE TIER ${ctx.overdriveTier}: ФРАКТАЛ РАСШИРЯЕТСЯ`);
      overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xffd166, 300);
      updateScaleHud(ctx);
      return;
    }
    finishRun(ctx, true);
    return;
  }
  ctx.scaleIdx++;
  ctx.scaleMaxReached = Math.max(ctx.scaleMaxReached, SCALES[ctx.scaleIdx].id);
  ctx.biomass = 0;
  ctx.metamorphT = METAMORPH.slowT + METAMORPH.zoomT;
  sfx.metamorph();
  showToast(
    ctx,
    `<svg class="bio-icon bio-cyan" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ` +
    `${getLocale() === 'en' ? 'METAMORPHOSIS' : 'МЕТАМОРФОЗ'}: ${scaleName(SCALES[ctx.scaleIdx].id)} — ${scaleSub(SCALES[ctx.scaleIdx].id)}`
  );
  overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xffffff, 280);
  overlay.beginShake(0.5);
  ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, ctx.player.x), toSimY(ctx, ctx.player.y), 3500);

  // Мир растёт: расширяем физические границы и открываем новые территории биома!
  ctx.curWorldW = worldSize(ctx.scaleIdx).w;
  ctx.curWorldH = worldSize(ctx.scaleIdx).h;
  spawnNodesForScale(ctx, ctx.scaleIdx);
  // Биом-модификатор новой шкалы: сброс таймеров сил и анонс правила биома
  syncBiomeFxScale(ctx);

  // Эволюционный скачок хвоста
  ctx.tailLen = Math.max(TAIL.minLen, ctx.tailLen * WORLD.tailKeep);
  ctx.tailDpsMul += WORLD.tailDpsBonus;

  updateStageBiome(ctx, SCALES[ctx.scaleIdx].id);
  updateScaleHud(ctx);
}

/** Биомасса шкалы созрела: из глубин пробуждается Титан масштаба */
export function maybeSpawnTitan(ctx: Ctx): void {
  const bioGoal = SCALES[ctx.scaleIdx].biomassGoal;
  if (ctx.biomass < bioGoal || ctx.titanPending || ctx.enemies.some((e) => e.titan) || ctx.metamorphT > 0) return;
  ctx.titanPending = true;
  spawnEnemy(ctx, 'boss');
  const titan = ctx.enemies[ctx.enemies.length - 1];
  titan.titan = true;
  titan.hp = titan.maxHp = Math.round(titan.maxHp * (1 + ctx.scaleIdx * 0.35));
  ctx.svc.overlay.spawnPulse(titan.x, titan.y, 0xffffff, 150);
  showToast(
    ctx,
    `<svg class="bio-icon bio-amber" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-macro-scale"/></svg> ` +
    `${getLocale() === 'en' ? `SCALE TITAN AWAKENED — ${scaleName(SCALES[ctx.scaleIdx].id)}` : `ТИТАН МАСШТАБА ПРОБУДИЛСЯ — ${scaleName(SCALES[ctx.scaleIdx].id)}`}`,
    'warn'
  );
  ctx.svc.sfx.boss();
}
