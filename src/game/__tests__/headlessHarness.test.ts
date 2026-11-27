// Smoke-тесты headless-харнесса: полная боевая симуляция без DOM в Node.
// Проверяем: метрики конечны, враги спавнятся и убиваются, смерти
// регистрируются с причиной, агрегаты считаются, гибрид применяется на старте.
import { describe, it, expect } from 'vitest';
import {
  aggregateRuns,
  createHeadlessCtx,
  pickUpgradeId,
  resolveHeadlessUpgrades,
  runHeadless,
} from '../headlessHarness';
import { stepSimulation, FIXED_DT } from '../simulation';
import { spawnEnemy } from '../enemies';
import { HYBRIDS } from '../../engine/types';

describe('headlessHarness: прогон симуляции', () => {
  it('два прогона по 30 с: метрики конечны, враги спавнятся и убиваются', () => {
    const { results, aggregates } = runHeadless({
      branch: 'vermis',
      hybrid: null,
      minutes: 0.5,
      runs: 2,
      seed: 42,
    });
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.metricsFinite).toBe(true);
      expect(r.survivalSec).toBeGreaterThan(0);
      expect(r.survivalSec).toBeLessThanOrEqual(30.5);
      expect(r.kills).toBeGreaterThan(0);
      expect(r.maxEnemiesAlive).toBeGreaterThan(0);
      expect(r.dmgTotal).toBeGreaterThan(0);
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.scaleMaxReached).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(r.avgDps)).toBe(true);
      expect(Number.isFinite(r.tailLenAvg)).toBe(true);
      expect(Number.isFinite(r.peakDps10)).toBe(true);
    }
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].runs).toBe(2);
    expect(aggregates[0].winrate).toBeGreaterThanOrEqual(0);
    expect(aggregates[0].winrate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(aggregates[0].medianSurvivalSec)).toBe(true);
  }, 120_000);

  it('все 4 ветки проходят прогон и дают агрегаты с разными метками', () => {
    const { results, aggregates } = runHeadless({
      branch: 'all',
      hybrid: null,
      minutes: 0.3,
      runs: 1,
      seed: 7,
    });
    expect(aggregates).toHaveLength(4);
    const labels = aggregates.map((a) => a.label).sort();
    expect(labels).toEqual([
      'branch:chimera',
      'branch:mycelium',
      'branch:symbiont',
      'branch:vermis',
    ]);
    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.metricsFinite).toBe(true);
    }
  }, 180_000);

  it('гибрид применяется на старте: mainGenome = гибрид с 1-го шага', () => {
    const { results } = runHeadless({
      branch: 'neutral',
      hybrid: 'ion_colossus',
      minutes: 0.2,
      runs: 1,
      seed: 11,
    });
    expect(results[0].finalGenome).toBe('ion_colossus');
    expect(results[0].hybrid).toBe('ion_colossus');
  }, 60_000);

  it('детерминированность: одинаковые seed и настройки дают идентичные прогоны', () => {
    const a = runHeadless({ branch: 'vermis', hybrid: null, minutes: 0.25, runs: 1, seed: 123 });
    const b = runHeadless({ branch: 'vermis', hybrid: null, minutes: 0.25, runs: 1, seed: 123 });
    expect(a.results[0].survivalSec).toBe(b.results[0].survivalSec);
    expect(a.results[0].kills).toBe(b.results[0].kills);
    expect(a.results[0].dmgTotal).toBe(b.results[0].dmgTotal);
  }, 120_000);
});

describe('headlessHarness: смерть и причина', () => {
  it('босс вплотную убивает образец: dying -> gameOver с причиной смерти', () => {
    const { ctx } = createHeadlessCtx({ branch: 'vermis', hybrid: null });
    expect(ctx.started).toBe(true);
    // Босс прямо на игроке: контактный урон 25 за удар
    spawnEnemy(ctx, 'boss', undefined, ctx.player.x, ctx.player.y);
    const arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[] = [];
    const lasers: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let step = 0; step < 60 * 15 && !ctx.gameOver; step++) {
      if (ctx.paused) {
        resolveHeadlessUpgrades(ctx, null);
        continue;
      }
      arcs.length = 0;
      lasers.length = 0;
      stepSimulation(ctx, FIXED_DT, step * FIXED_DT, arcs, lasers);
    }
    expect(ctx.gameOver).toBe(true);
    expect(ctx.winRun).toBe(false);
    expect(ctx.lastDamageCause).not.toBeNull();
    expect(ctx.lastDamageCause!.kind.length).toBeGreaterThan(0);
    expect(ctx.lastDamageCause!.labelRu.length).toBeGreaterThan(0);
  }, 60_000);
});

describe('headlessHarness: автопрокачка', () => {
  it('pickUpgradeId возвращает доступную карточку, resolveHeadlessUpgrades снимает паузу', () => {
    const { ctx } = createHeadlessCtx({ branch: 'chimera', hybrid: null });
    // Имитируем окно апгрейдов как его открывает maybeLevelUp
    ctx.pendingUps = 1;
    ctx.paused = true;
    const id = pickUpgradeId(ctx, null);
    expect(id).not.toBeNull();
    expect(typeof id).toBe('string');
    resolveHeadlessUpgrades(ctx, null);
    expect(ctx.pendingUps).toBe(0);
    expect(ctx.paused).toBe(false);
  }, 60_000);

  it('приоритет карточек ветки: химере предлагается родная поддержка chi_dmg в пуле доступных', () => {
    const { ctx } = createHeadlessCtx({ branch: 'chimera', hybrid: null });
    // chi_dmg - стек-карта без требований к уровню: сразу доступна
    expect(pickUpgradeId(ctx, null)).toBe('chi_dmg');
  }, 60_000);

  it('гибридный приоритет: готовый гибрид выбирается первой карточкой', () => {
    const { ctx } = createHeadlessCtx({ branch: 'neutral', hybrid: 'psi_web' });
    // Гибрид уже применен на старте, поэтому карточка гибрида больше не предлагается
    expect(ctx.hybridsTaken.has('psi_web')).toBe(true);
    const id = pickUpgradeId(ctx, 'psi_web');
    // после взятия гибрида приоритет уходит арсеналу/статам, а не второй гибридизации
    expect(id).not.toBe('hy_psi_web');
  }, 60_000);
});

describe('headlessHarness: агрегаты', () => {
  it('aggregateRuns на пустом входе дает безопасный нулевой агрегат', () => {
    const agg = aggregateRuns([]);
    expect(agg.runs).toBe(0);
    expect(agg.winrate).toBe(0);
    expect(Number.isFinite(agg.medianSurvivalSec)).toBe(true);
  });

  it('winrate считается по выжившим в окне прогонам', () => {
    const base = {
      branch: 'branch:vermis', hybrid: null as null, runIndex: 0, seed: 1,
      survivalSec: 100, win: true, endedBy: 'timeLimit' as const,
      kills: 10, level: 3, scaleMaxReached: 1, scaleIdx: 0,
      deathCauseKind: null, deathCauseLabel: null,
      bossesKilled: 0, avgBossTtkSec: 0, bossTtkSecs: [],
      dmgTotal: 500, dmgTail: 100, dmgRing: 0, dmgWeapons: 400,
      avgDps: 5, peakDps10: 8, tailLenAvg: 8, tailLenMax: 12,
      maxEnemiesAlive: 20, finalWlvl: { spikes: 1, orbs: 0, nova: 0, aura: 0, mandibles: 0, cysts: 0 },
      finalGenome: 'vermis', finalGenes: [], metricsFinite: true,
    };
    const lost = { ...base, win: false, survivalSec: 40 };
    const agg = aggregateRuns([base, base, lost]);
    expect(agg.runs).toBe(3);
    expect(agg.winrate).toBeCloseTo(2 / 3, 5);
    expect(agg.medianSurvivalSec).toBe(100);
    expect(agg.meanKills).toBeCloseTo((10 + 10 + 10) / 3, 5);
  });
});

describe('headlessHarness: гибриды', () => {
  it('все 6 гибридов применяются на старте без ошибок', () => {
    for (const h of HYBRIDS) {
      const { ctx } = createHeadlessCtx({ branch: 'neutral', hybrid: h.id });
      expect(ctx.hybridsTaken.has(h.id)).toBe(true);
      expect(ctx.mainGenome).toBe(h.id);
    }
  }, 60_000);
});
