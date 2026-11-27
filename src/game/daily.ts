// Дневное испытание: применение модификаторов челленджа, seeded-RNG к спавнам
// и аномалиям, завершение цели дня.
import { t } from '../i18n';
import { addBiolabPoints } from '../engine/biolab';
import { isDailyCompleted, markDailyCompleted, mulberry32 } from '../engine/challenge';
import type { DailyChallengeInfo } from '../engine/challenge';
import type { Ctx } from './context';
import { updateDailyHudPill } from '../ui/modals';
import { showToast } from '../ui/toast';

/** Сброс daily-модификаторов к нейтральным (обычный забег) */
export function resetDailyMods(ctx: Ctx): void {
  ctx.dailyRunActive = false;
  ctx.dailyRunDone = false;
  ctx.dailyEnemySpeedMul = 1;
  ctx.dailyTailDpsMul = 1;
  ctx.dailyDmgMul = 1;
  ctx.dailyCaptureSpeedMul = 1;
  ctx.dailyEnemyNodeAggroMul = 1;
  ctx.dailyXpMul = 1;
  ctx.dailyDashCdDelta = 0;
  ctx.dailyRng = Math.random;
  ctx.biolabNovaCdMul = 1;
}

/** Применить модификаторы дневного испытания к состоянию забега */
export function applyDailyChallenge(ctx: Ctx, ch: DailyChallengeInfo): void {
  ctx.dailyInfo = ch;
  ctx.dailyRunActive = true;
  ctx.dailyRunDone = isDailyCompleted(ch.dayKey);
  ctx.dailyRng = mulberry32(ch.seed);
  ctx.dailyEnemySpeedMul = ch.modifiers.enemySpeedMul;
  ctx.dailyTailDpsMul = ch.modifiers.tailDpsMul;
  ctx.dailyDmgMul = ch.modifiers.dmgMul;
  ctx.dailyCaptureSpeedMul = ch.modifiers.captureSpeedMul;
  ctx.dailyEnemyNodeAggroMul = ch.modifiers.enemyNodeAggroMul;
  ctx.dailyXpMul = ch.modifiers.xpMul;
  ctx.dailyDashCdDelta = ch.modifiers.dashCdDelta;
}

/** Единый источник случайности: seeded dailyRng в испытании, Math.random иначе */
export function runRng(ctx: Ctx): number {
  return ctx.dailyRunActive ? ctx.dailyRng() : Math.random();
}

/** Цель дня: время/шкала достигнуты - награда, иначе обновление HUD-пилюли каждые 16 шагов */
export function maybeCompleteDaily(ctx: Ctx): void {
  if (!ctx.dailyRunActive) return;
  if (!ctx.dailyRunDone && (ctx.gameTime >= ctx.dailyInfo.goalTimeSec || ctx.scaleMaxReached >= ctx.dailyInfo.goalScale)) {
    ctx.dailyRunDone = true;
    if (markDailyCompleted(ctx.dailyInfo.dayKey)) {
      addBiolabPoints(ctx.dailyInfo.bonusPoints);
      ctx.svc.sfx.hybrid();
      showToast(ctx, t('daily_completed_toast', { pts: ctx.dailyInfo.bonusPoints }), 'success');
    }
    updateDailyHudPill(ctx);
  } else if ((ctx.frameN & 15) === 0) {
    updateDailyHudPill(ctx);
  }
}
