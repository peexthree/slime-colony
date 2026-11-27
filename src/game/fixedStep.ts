// Fixed timestep: чистый планировщик аккумулятора без зависимостей от DOM/сервисов.
// Тестируется напрямую в src/game/__tests__/fixedTimestep.test.ts.

/** Фиксированный шаг симуляции: 1/60 секунды */
export const FIXED_DT = 1 / 60;
/** Максимум подшагов за кадр: ограничивает догоняющую симуляцию */
export const MAX_STEPS_PER_FRAME = 5;

/** Чистый планировщик аккумулятора: сколько фиксированных шагов выполнить в этом кадре */
export function planFixedSteps(accBefore: number, rawDt: number): { steps: number; accAfter: number } {
  let acc = accBefore + rawDt;
  let steps = 0;
  while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    acc -= FIXED_DT;
    steps++;
  }
  // Кадры с огромной паузой не должны накапливать бесконечный хвост симуляции
  if (steps === MAX_STEPS_PER_FRAME && acc >= FIXED_DT) acc = 0;
  return { steps, accAfter: acc };
}
