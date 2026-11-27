// Тесты биом-модификаторов: чистая математика полей (вращение направления,
// конверт пульса 1.2 Гц, окна порывов/приливов, дрейф полос) и применение
// сил через состояние WeakMap (с ограничением силы и инерцией).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BIOME_FX,
  biomeFxCfgForScaleId,
  flowPulseAt,
  gustEnvelopeAt,
  ribBandHit,
  ribBandsAt,
  rotAngleAt,
  telegraphActiveAt,
} from '../../engine/types';
import {
  biomeEnemyFlow,
  biomeEnemySpeedMul,
  biomeFxChipInfo,
  biomeKbDecayRate,
  biomeOrbWindAccel,
  biomePlayerSpeedMul,
  biomePlayerVelocity,
  biomeTideVignette,
  syncBiomeFxScale,
  updateBiomeFx,
} from '../biomeFx';
import type { Ctx } from '../context';

/** Минимальный фейковый ctx: biomeFx читает только шкалу, мир, игрока и overlay-мок */
function fakeCtx(
  scaleIdx: number,
  opts: { x?: number; dashT?: number; worldW?: number } = {},
): Ctx {
  const worldW = opts.worldW ?? 3000;
  return {
    scaleIdx,
    curWorldW: worldW,
    curWorldH: 1700,
    player: { x: opts.x ?? 1500, y: 850, hp: 100, iframe: 0 },
    dashT: opts.dashT ?? 0,
    svc: { overlay: { spawnPulse: () => {} } },
  } as unknown as Ctx;
}

/** Заглушка window для showToast (тосты синхронизации шкалы) */
function stubWindow(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.window === 'undefined') {
    g.window = { setTimeout: () => 0, clearTimeout: () => {} };
  }
}

describe('BIOME_FX: таблица шкал', () => {
  it('модификатор есть ровно на каждой 3-й шкале: 3/6/9/12/15', () => {
    const kinds = Object.keys(BIOME_FX).map(Number).sort((a, b) => a - b);
    expect(kinds).toEqual([2, 5, 8, 11, 14]); // индексы шкал 3/6/9/12/15
    expect(BIOME_FX[2].kind).toBe('flow');
    expect(BIOME_FX[5].kind).toBe('ribs');
    expect(BIOME_FX[8].kind).toBe('wind');
    expect(BIOME_FX[11].kind).toBe('slick');
    expect(BIOME_FX[14].kind).toBe('tide');
  });

  it('biomeFxCfgForScaleId: поиск по id шкалы 1..15', () => {
    expect(biomeFxCfgForScaleId(3)?.kind).toBe('flow');
    expect(biomeFxCfgForScaleId(6)?.kind).toBe('ribs');
    expect(biomeFxCfgForScaleId(15)?.kind).toBe('tide');
    expect(biomeFxCfgForScaleId(1)).toBeNull();
    expect(biomeFxCfgForScaleId(7)).toBeNull();
  });
});

describe('чистая математика: течение (шкала 3)', () => {
  it('направление делает полный оборот за 90 с и повторяется', () => {
    expect(rotAngleAt(90, 90)).toBeCloseTo(Math.PI * 2, 6);
    expect(rotAngleAt(45, 90)).toBeCloseTo(Math.PI, 6);
    // Вектор направления в t и t+period совпадает
    const a1 = rotAngleAt(7.3, 90);
    const a2 = rotAngleAt(97.3, 90);
    expect(Math.cos(a1)).toBeCloseTo(Math.cos(a2), 6);
    expect(Math.sin(a1)).toBeCloseTo(Math.sin(a2), 6);
  });

  it('конверт пульса 1.2 Гц: ограничен, периодичен, достигает пика', () => {
    const flowCfg = BIOME_FX[2];
    const hz = flowCfg.kind === 'flow' ? flowCfg.pulseHz : 1.2;
    expect(hz).toBe(1.2);
    // Ограничение 0..1 по всему циклу вращения
    for (let t = 0; t < 90; t += 0.11) {
      const p = flowPulseAt(t, hz);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    // Период конверта = 1 / 1.2 c
    expect(flowPulseAt(0.31, hz)).toBeCloseTo(flowPulseAt(0.31 + 1 / 1.2, hz), 6);
    // Пик сердцебиения при sin = 1: t = 0.25 / 1.2
    expect(flowPulseAt(0.25 / 1.2, hz)).toBeGreaterThan(0.99);
    // Спад до нуля при sin = -1: t = 0.75 / 1.2
    expect(flowPulseAt(0.75 / 1.2, hz)).toBeLessThan(0.001);
  });
});

describe('чистая математика: порывы и приливы', () => {
  it('окна порывов спорового ветра: 2.2 с силы в цикле 9 с', () => {
    expect(gustEnvelopeAt(0.5, 9, 2.2)).toBeGreaterThan(0);
    expect(gustEnvelopeAt(1.1, 9, 2.2)).toBeCloseTo(1, 5); // пик в середине порыва
    expect(gustEnvelopeAt(2.19, 9, 2.2)).toBeGreaterThan(0);
    expect(gustEnvelopeAt(3, 9, 2.2)).toBe(0);
    expect(gustEnvelopeAt(8.9, 9, 2.2)).toBe(0);
  });

  it('телеграф ветра: последние 0.8 с цикла перед порывом', () => {
    expect(telegraphActiveAt(4, 9, 0.8)).toBe(false);
    expect(telegraphActiveAt(8.2, 9, 0.8)).toBe(true);
    expect(telegraphActiveAt(8.5, 9, 0.8)).toBe(true);
    expect(telegraphActiveAt(9.2, 9, 0.8)).toBe(false); // новый цикл: 0.2 < 8.2
  });

  it('окна фрактальных приливов: волна 1.5 с в цикле 8 с', () => {
    expect(gustEnvelopeAt(0.75, 8, 1.5)).toBeGreaterThan(0);
    expect(gustEnvelopeAt(3, 8, 1.5)).toBe(0);
    expect(telegraphActiveAt(5, 8, 1.0)).toBe(false);
    expect(telegraphActiveAt(7.5, 8, 1.0)).toBe(true);
  });
});

describe('чистая математика: полосы теней рёбер (шкала 6)', () => {
  const ribsCfg = biomeFxCfgForScaleId(6);
  it('ровно 5 вертикальных полос заявленной ширины', () => {
    expect(ribsCfg?.kind).toBe('ribs');
    if (!ribsCfg || ribsCfg.kind !== 'ribs') return;
    const worldW = 3283;
    const bands = ribBandsAt(0, worldW, ribsCfg);
    expect(bands).toHaveLength(5);
    for (const b of bands) {
      expect(b.x1 - b.x0).toBeCloseTo(worldW * ribsCfg.widthFrac, 4);
    }
  });

  it('полосы дрейфуют и возвращаются через период дрейфа', () => {
    if (!ribsCfg || ribsCfg.kind !== 'ribs') return;
    const worldW = 3000;
    const t0 = ribBandsAt(0, worldW, ribsCfg);
    const t6 = ribBandsAt(6.5, worldW, ribsCfg);
    const tPeriod = ribBandsAt(ribsCfg.driftPeriod, worldW, ribsCfg);
    // Дрейф реально смещает центры
    let moved = false;
    for (let i = 0; i < t0.length; i++) {
      if (Math.abs((t0[i].x0 + t0[i].x1) / 2 - (t6[i].x0 + t6[i].x1) / 2) > 1) moved = true;
    }
    expect(moved).toBe(true);
    // Период дрейфа возвращает полосы на место
    for (let i = 0; i < t0.length; i++) {
      expect(tPeriod[i].x0).toBeCloseTo(t0[i].x0, 4);
      expect(tPeriod[i].x1).toBeCloseTo(t0[i].x1, 4);
    }
  });

  it('ribBandHit определяет попадание точки в полосу', () => {
    const bands = [{ x0: 100, x1: 200 }, { x0: 500, x1: 600 }];
    expect(ribBandHit(bands, 150)).toBe(true);
    expect(ribBandHit(bands, 550)).toBe(true);
    expect(ribBandHit(bands, 350)).toBe(false);
    expect(ribBandHit(bands, 0)).toBe(false);
  });
});

describe('применение сил: множители скорости', () => {
  beforeEach(stubWindow);

  it('тени рёбер: игрок -8% внутри полосы, 1 снаружи', () => {
    const ctx = fakeCtx(5);
    updateBiomeFx(ctx, 1 / 60, 0);
    // Центр средней полосы при worldW=3000: x=1500, ширина 255
    expect(biomePlayerSpeedMul(ctx, 1500)).toBeCloseTo(0.92, 6);
    expect(biomePlayerSpeedMul(ctx, 650)).toBe(1); // между полосами
  });

  it('тени рёбер: враги +25% внутри полосы', () => {
    const ctx = fakeCtx(5);
    updateBiomeFx(ctx, 1 / 60, 0);
    expect(biomeEnemySpeedMul(ctx, 1500)).toBeCloseTo(1.25, 6);
    expect(biomeEnemySpeedMul(ctx, 650)).toBe(1);
  });

  it('фрактальный прилив: +30% в волне, 1 в затишье', () => {
    const ctx = fakeCtx(14);
    updateBiomeFx(ctx, 1, 0); // t=1 < 1.5: волна активна
    expect(biomePlayerSpeedMul(ctx, 1500)).toBeCloseTo(1.3, 6);
    expect(biomeEnemySpeedMul(ctx, 1500)).toBeCloseTo(1.3, 6);
    updateBiomeFx(ctx, 3, 0); // t=4: затишье
    expect(biomePlayerSpeedMul(ctx, 1500)).toBe(1);
    expect(biomeEnemySpeedMul(ctx, 1500)).toBe(1);
  });

  it('на шкале без модификатора все множители равны 1', () => {
    const ctx = fakeCtx(0);
    updateBiomeFx(ctx, 1 / 60, 0);
    expect(biomePlayerSpeedMul(ctx, 1500)).toBe(1);
    expect(biomeEnemySpeedMul(ctx, 1500)).toBe(1);
    expect(biomeFxChipInfo(ctx)).toBeNull();
  });
});

describe('применение сил: течение на игрока и врагов', () => {
  beforeEach(stubWindow);

  it('дрейф игрока ограничен долей от скорости и направлен по вращению', () => {
    const ctx = fakeCtx(2);
    updateBiomeFx(ctx, 0.4, 0);
    const flowCfg = BIOME_FX[2];
    const frac = flowCfg.kind === 'flow' ? flowCfg.playerFrac : 0.22;
    const v = biomePlayerVelocity(ctx, 1 / 60, 200, 1, 0);
    // Направление в t=0.4 почти по +X: дрейф добавляется к целевой скорости
    expect(v.vx).toBeGreaterThan(200);
    expect(Math.abs(v.vy)).toBeLessThanOrEqual(200 * frac + 1e-6);
    // Ограничение по всему циклу вращения
    const ctx2 = fakeCtx(2);
    for (let t = 0; t < 90; t += 0.13) {
      updateBiomeFx(ctx2, 0.13, 0);
      const vv = biomePlayerVelocity(ctx2, 1 / 60, 200, 1, 0);
      const mag = Math.hypot(vv.vx, vv.vy);
      expect(mag).toBeLessThanOrEqual(200 * (1 + frac) + 1e-6);
      expect(mag).toBeGreaterThanOrEqual(200 * (1 - frac) - 1e-6);
    }
  });

  it('дрейф врагов течением ограничен и нулевой на других шкалах', () => {
    const ctx = fakeCtx(2);
    updateBiomeFx(ctx, 0.4, 0);
    const f = biomeEnemyFlow(ctx, 100);
    expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(100 * 0.3 + 1e-6);
    const ctxRibs = fakeCtx(5);
    updateBiomeFx(ctxRibs, 0.4, 0);
    expect(biomeEnemyFlow(ctxRibs, 100).x).toBe(0);
  });
});

describe('применение сил: споровый ветер', () => {
  beforeEach(stubWindow);

  it('души XP толкаются в порыве и покоятся вне его', () => {
    const ctx = fakeCtx(8);
    updateBiomeFx(ctx, 0.05, 0); // t=0.05: порыв начался
    const a = biomeOrbWindAccel(ctx);
    const mag = Math.hypot(a.x, a.y);
    expect(mag).toBeGreaterThan(0);
    expect(mag).toBeLessThanOrEqual(420 + 1e-6);
    updateBiomeFx(ctx, 3, 0); // t=3.05 > 2.2: затишье
    expect(biomeOrbWindAccel(ctx).x).toBe(0);
    expect(biomeOrbWindAccel(ctx).y).toBe(0);
  });

  it('скорость игрока добавляет ветер только в окне порыва', () => {
    const ctx = fakeCtx(8);
    updateBiomeFx(ctx, 1.1, 0); // пик порыва
    const windCfg = BIOME_FX[8];
    const frac = windCfg.kind === 'wind' ? windCfg.playerFrac : 0.3;
    const v = biomePlayerVelocity(ctx, 1 / 60, 200, 0, 0);
    // Стоящий игрок сносится ветром
    expect(Math.hypot(v.vx, v.vy)).toBeLessThanOrEqual(200 * frac + 1e-6);
    expect(Math.hypot(v.vx, v.vy)).toBeGreaterThan(0);
    updateBiomeFx(ctx, 5, 0); // t=6.1: вне порыва
    const still = biomePlayerVelocity(ctx, 1 / 60, 200, 0, 0);
    expect(Math.hypot(still.vx, still.vy)).toBe(0);
  });
});

describe('применение сил: скользкая инерция', () => {
  beforeEach(stubWindow);

  it('разгон и торможение вместо мгновенной скорости', () => {
    const ctx = fakeCtx(11);
    updateBiomeFx(ctx, 1 / 60, 0);
    // Первый шаг: скорость заметно меньше целевой
    const first = biomePlayerVelocity(ctx, 1 / 60, 120, 1, 0);
    expect(first.vx).toBeGreaterThan(1);
    expect(first.vx).toBeLessThan(40);
    // Через секунду разгона скорость почти целевая
    for (let i = 0; i < 60; i++) {
      updateBiomeFx(ctx, 1 / 60, 0);
      biomePlayerVelocity(ctx, 1 / 60, 120, 1, 0);
    }
    const warm = biomePlayerVelocity(ctx, 1 / 60, 120, 1, 0);
    expect(warm.vx).toBeGreaterThan(116);
    // Торможение: без ввода скорость гаснет плавно, но за секунду почти до нуля
    for (let i = 0; i < 60; i++) {
      updateBiomeFx(ctx, 1 / 60, 0);
      biomePlayerVelocity(ctx, 1 / 60, 0, 0, 0);
    }
    const stop = biomePlayerVelocity(ctx, 1 / 60, 0, 0, 0);
    expect(Math.abs(stop.vx)).toBeLessThan(4);
  });

  it('рывок на скользкой шкале разгоняется быстрее обычного шага', () => {
    const dashing = fakeCtx(11, { dashT: 0.2 });
    updateBiomeFx(dashing, 1 / 60, 0);
    const withDash = biomePlayerVelocity(dashing, 1 / 60, 300, 1, 0);
    const plain = fakeCtx(11);
    updateBiomeFx(plain, 1 / 60, 0);
    const withoutDash = biomePlayerVelocity(plain, 1 / 60, 300, 1, 0);
    expect(withDash.vx).toBeGreaterThan(withoutDash.vx);
  });

  it('отброс врагов гаснет в 1.6 раза медленнее', () => {
    const ctx = fakeCtx(11);
    updateBiomeFx(ctx, 1 / 60, 0);
    expect(biomeKbDecayRate(ctx, 6)).toBeCloseTo(6 / 1.6, 6);
    const other = fakeCtx(2);
    updateBiomeFx(other, 1 / 60, 0);
    expect(biomeKbDecayRate(other, 6)).toBe(6);
  });
});

describe('сигналы HUD: чип и виньетка прилива', () => {
  beforeEach(stubWindow);

  it('чип slick всегда активен, wind различает порыв и телеграф', () => {
    const slick = fakeCtx(11);
    updateBiomeFx(slick, 1 / 60, 0);
    expect(biomeFxChipInfo(slick)).toEqual({ kind: 'slick', active: true, warn: false });

    const wind = fakeCtx(8);
    updateBiomeFx(wind, 8.5, 0); // телеграф перед порывом
    expect(biomeFxChipInfo(wind)).toEqual({ kind: 'wind', active: false, warn: true });
    updateBiomeFx(wind, 1.0, 0); // t=9.5 -> фаза 0.5: порыв
    expect(biomeFxChipInfo(wind)).toEqual({ kind: 'wind', active: true, warn: false });
  });

  it('чип ribs подсвечивается в полосе под игроком', () => {
    const inside = fakeCtx(5, { x: 1500 });
    updateBiomeFx(inside, 1 / 60, 0);
    expect(biomeFxChipInfo(inside)?.active).toBe(true);
    const outside = fakeCtx(5, { x: 650 });
    updateBiomeFx(outside, 1 / 60, 0);
    expect(biomeFxChipInfo(outside)?.active).toBe(false);
  });

  it('виньетка прилива горит в волне и в телеграфе, гаснет в затишье', () => {
    const ctx = fakeCtx(14);
    updateBiomeFx(ctx, 1, 0); // волна
    expect(biomeTideVignette(ctx)).toBe(true);
    updateBiomeFx(ctx, 3, 0); // t=4: затишье
    expect(biomeTideVignette(ctx)).toBe(false);
    updateBiomeFx(ctx, 3.6, 0); // t=7.6: телеграф
    expect(biomeTideVignette(ctx)).toBe(true);
  });
});

describe('синхронизация шкалы: включение и сброс', () => {
  beforeEach(stubWindow);

  function ctxWithDom(scaleIdx: number): Ctx {
    // Тосту синхронизации нужен только ctx.dom.toastEl с classList.remove
    return {
      ...fakeCtx(scaleIdx),
      dom: { toastEl: { classList: { remove: () => {} } } },
    } as unknown as Ctx;
  }

  it('syncBiomeFxScale сбрасывает модификатор при рестарте на шкалу 1', () => {
    const ctx = ctxWithDom(2);
    updateBiomeFx(ctx, 0.5, 0);
    expect(biomeFxChipInfo(ctx)?.kind).toBe('flow');
    ctx.scaleIdx = 0;
    syncBiomeFxScale(ctx);
    expect(biomeFxChipInfo(ctx)).toBeNull();
    expect(biomePlayerSpeedMul(ctx, 1500)).toBe(1);
    expect(biomePlayerVelocity(ctx, 1 / 60, 120, 1, 0)).toEqual({ vx: 120, vy: 0 });
  });

  it('syncBiomeFxScale на той же шкале не сбрасывает идущие таймеры', () => {
    const ctx = ctxWithDom(8);
    updateBiomeFx(ctx, 1.1, 0); // середина порыва
    syncBiomeFxScale(ctx); // повторный вызов (та же шкала) - состояние живо
    expect(Math.hypot(biomeOrbWindAccel(ctx).x, biomeOrbWindAccel(ctx).y)).toBeGreaterThan(0);
  });

  it('переход на новую шкалу создаёт свежее состояние (инерция сброшена)', () => {
    const ctx = ctxWithDom(11);
    for (let i = 0; i < 120; i++) {
      updateBiomeFx(ctx, 1 / 60, 0);
      biomePlayerVelocity(ctx, 1 / 60, 120, 1, 0);
    }
    ctx.scaleIdx = 14;
    syncBiomeFxScale(ctx); // шкала 15: прилив
    updateBiomeFx(ctx, 0.5, 0);
    // Разогнанная инерция не переезжает на новую шкалу: прилив даёт чистый множитель,
    // а целевая скорость (уже с множителем прилива из player.ts) достигается мгновенно
    expect(biomePlayerSpeedMul(ctx, 1500)).toBeCloseTo(1.3, 6);
    const v = biomePlayerVelocity(ctx, 1 / 60, 120 * 1.3, 1, 0);
    expect(v.vx).toBeCloseTo(120 * 1.3, 0);
  });
});
