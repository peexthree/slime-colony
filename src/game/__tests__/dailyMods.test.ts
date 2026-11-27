// Тесты дневного испытания: применение модификаторов, seeded-RNG и сброс.
import { describe, it, expect, beforeEach } from 'vitest';
import { applyDailyChallenge, resetDailyMods, runRng, maybeCompleteDaily } from '../daily';
import { createRunState } from '../state';
import { getDailyChallenge, mulberry32 } from '../../engine/challenge';
import type { Ctx } from '../context';

function mockLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

/** Минимальный Ctx для логики daily: dom/svc подменены стабами */
function makeCtx(): Ctx {
  // Тост-стаб: showToast пишет innerHTML и дергает window.clearTimeout
  (globalThis as unknown as Record<string, unknown>).window = {
    clearTimeout: () => {},
    setTimeout: () => 0,
  };
  const st = createRunState() as unknown as Ctx;
  st.dom = {
    dailyHudPillEl: null,
    toastEl: {
      innerHTML: '',
      className: '',
      classList: { remove: () => {} },
    },
  } as unknown as Ctx['dom'];
  st.svc = { sfx: { hybrid: () => {} } } as unknown as Ctx['svc'];
  return st;
}

describe('daily mods', () => {
  beforeEach(mockLocalStorage);

  it('applyDailyChallenge включает режим и перемножает модификаторы', () => {
    const ctx = makeCtx();
    const ch = getDailyChallenge();
    applyDailyChallenge(ctx, ch);
    expect(ctx.dailyRunActive).toBe(true);
    expect(ctx.dailyInfo.dayKey).toBe(ch.dayKey);
    expect(ctx.dailyEnemySpeedMul).toBe(ch.modifiers.enemySpeedMul);
    expect(ctx.dailyTailDpsMul).toBe(ch.modifiers.tailDpsMul);
    expect(ctx.dailyDmgMul).toBe(ch.modifiers.dmgMul);
    expect(ctx.dailyCaptureSpeedMul).toBe(ch.modifiers.captureSpeedMul);
    expect(ctx.dailyEnemyNodeAggroMul).toBe(ch.modifiers.enemyNodeAggroMul);
    expect(ctx.dailyXpMul).toBe(ch.modifiers.xpMul);
    expect(ctx.dailyDashCdDelta).toBe(ch.modifiers.dashCdDelta);
  });

  it('seeded dailyRng детерминирован: одинаковые сиды - одинаковая последовательность', () => {
    const ctx = makeCtx();
    const ch = getDailyChallenge();
    applyDailyChallenge(ctx, ch);
    const seq1 = [ctx.dailyRng(), ctx.dailyRng(), ctx.dailyRng()];
    const ref = mulberry32(ch.seed);
    const seq2 = [ref(), ref(), ref()];
    expect(seq1).toEqual(seq2);
  });

  it('runRng использует dailyRng в испытании и Math.random вне его', () => {
    const ctx = makeCtx();
    let calls = 0;
    ctx.dailyRng = () => { calls++; return 0.42; };
    ctx.dailyRunActive = true;
    expect(runRng(ctx)).toBe(0.42);
    expect(calls).toBe(1);
    ctx.dailyRunActive = false;
    runRng(ctx);
    expect(calls).toBe(1); // Math.random, seeded не дёргается
  });

  it('resetDailyMods возвращает всё к нейтральным значениям', () => {
    const ctx = makeCtx();
    const ch = getDailyChallenge();
    applyDailyChallenge(ctx, ch);
    resetDailyMods(ctx);
    expect(ctx.dailyRunActive).toBe(false);
    expect(ctx.dailyRunDone).toBe(false);
    expect(ctx.dailyEnemySpeedMul).toBe(1);
    expect(ctx.dailyDmgMul).toBe(1);
    expect(ctx.dailyXpMul).toBe(1);
    expect(ctx.biolabNovaCdMul).toBe(1);
  });

  it('maybeCompleteDaily: цель по времени закрывает день и начисляет очки', () => {
    const ctx = makeCtx();
    const ch = getDailyChallenge();
    applyDailyChallenge(ctx, ch);
    ctx.gameTime = ch.goalTimeSec + 1;
    ctx.scaleMaxReached = 1;
    maybeCompleteDaily(ctx);
    expect(ctx.dailyRunDone).toBe(true);
    // Очки начислены через addBiolabPoints (localStorage-биолаб)
    const bl = JSON.parse(localStorage.getItem('lumivore-biolab-v1') ?? '{}');
    expect(bl.points).toBeGreaterThanOrEqual(ch.bonusPoints);
  });

  it('maybeCompleteDaily вне дневного забега - без операций', () => {
    const ctx = makeCtx();
    ctx.dailyRunActive = false;
    ctx.gameTime = 99999;
    maybeCompleteDaily(ctx);
    expect(ctx.dailyRunDone).toBe(false);
  });
});
