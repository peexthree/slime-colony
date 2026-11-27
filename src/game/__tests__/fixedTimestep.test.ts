// Тесты fixed timestep: планировщик аккумулятора ограничивает подшаги и сбрасывает хвост.
import { describe, it, expect } from 'vitest';
import { planFixedSteps, FIXED_DT, MAX_STEPS_PER_FRAME } from '../fixedStep';

describe('planFixedSteps (fixed timestep)', () => {
  it('при 60 FPS выполняется ровно один шаг за кадр (с накоплением дрейфа)', () => {
    // 1/60 кадр: аккумулятор периодически пуст, дрейф накапливается
    let acc = 0;
    let totalSteps = 0;
    for (let i = 0; i < 600; i++) {
      const r = planFixedSteps(acc, 1 / 60);
      acc = r.accAfter;
      totalSteps += r.steps;
    }
    expect(totalSteps).toBe(600);
  });

  it('низкий FPS (30) даёт два подшага за кадр', () => {
    const r = planFixedSteps(0, 1 / 30);
    expect(r.steps).toBe(2);
    expect(r.accAfter).toBeLessThan(FIXED_DT);
  });

  it('высокий FPS (144) даёт шаг не каждый кадр, но держит темп 1/60', () => {
    let acc = 0;
    let totalSteps = 0;
    for (let i = 0; i < 1440; i++) {
      const r = planFixedSteps(acc, 1 / 144);
      acc = r.accAfter;
      totalSteps += r.steps;
    }
    // За 10 секунд при 144 FPS должно быть ~600 шагов (1/60)
    expect(totalSteps).toBeGreaterThanOrEqual(595);
    expect(totalSteps).toBeLessThanOrEqual(605);
  });

  it('гигантская пауза ограничена максимумом подшагов и сбрасывает хвост', () => {
    const r = planFixedSteps(0, 10); // вкладка висела 10 секунд
    expect(r.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(r.accAfter).toBe(0);
  });

  it('максимум подшагов за кадр не превышен даже при большом аккумуляторе', () => {
    const r = planFixedSteps(0.5, 0.5); // уже секунда долга
    expect(r.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(r.steps).toBeLessThanOrEqual(5);
  });

  it('константы: шаг 1/60, лимит 5 подшагов', () => {
    expect(FIXED_DT).toBeCloseTo(1 / 60);
    expect(MAX_STEPS_PER_FRAME).toBe(5);
  });
});
