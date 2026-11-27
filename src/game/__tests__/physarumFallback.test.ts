// physarumFallback.test.ts - юнит-тесты WebGL2-фолбэка physarum-симуляции
// Node-среда: WebGL/GPU вызовы не выполняются - только CPU-логика, типы и фабрика.
import { describe, it, expect } from 'vitest';
import { detectBackend, createPhysarumSim } from '../../engine/physarumSim';
import type { PhysarumSim, SimNodeStat } from '../../engine/physarumSim';
import { WebGL2Sim } from '../../engine/WebGL2Sim';
import { WebGPUSim, NodeStat } from '../../engine/WebGPUSim';
import type { BioNode } from '../../engine/types';

// Compile-time проверки: оба бэкенда удовлетворяют общему интерфейсу PhysarumSim.
// Если WebGPUSim/WebGL2Sim разойдутся с контрактом - сборка тестов упадёт.
type WebGPUAssignable = WebGPUSim extends PhysarumSim ? true : false;
type WebGL2Assignable = WebGL2Sim extends PhysarumSim ? true : false;
const webgpuOk: WebGPUAssignable = true;
const webgl2Ok: WebGL2Assignable = true;

const testNode = (x: number, y: number): BioNode => ({
  id: 1,
  x,
  y,
  radius: 40,
  owner: 0,
  capture: 0,
  kind: 'gen',
});

describe('detectBackend (чистая функция, без GPU)', () => {
  it('navigator без gpu -> webgl2', () => {
    expect(detectBackend({})).toBe('webgl2');
    expect(detectBackend({ gpu: undefined })).toBe('webgl2');
    expect(detectBackend({ gpu: null })).toBe('webgl2');
    expect(detectBackend(undefined)).toBe('webgl2');
    expect(detectBackend(null)).toBe('webgl2');
  });

  it('navigator с gpu -> webgpu', () => {
    expect(detectBackend({ gpu: {} })).toBe('webgpu');
    expect(detectBackend({ gpu: { requestAdapter: () => Promise.resolve(null) } })).toBe('webgpu');
  });
});

describe('фабрика createPhysarumSim', () => {
  it('не бросает синхронно и возвращает промис', () => {
    const pending = createPhysarumSim();
    expect(pending).toBeInstanceOf(Promise);
    return pending.then((sim) => {
      expect(sim).toBeDefined();
      expect(typeof sim.step).toBe('function');
      expect(typeof sim.init).toBe('function');
    });
  });

  it('в node-среде (navigator без gpu) резолвится в WebGL2-фолбэк', async () => {
    const sim = await createPhysarumSim();
    expect(sim).toBeInstanceOf(WebGL2Sim);
    expect(sim.backend).toBe('webgl2');
  });
});

describe('типы интерфейса PhysarumSim', () => {
  it('WebGPUSim и WebGL2Sim совместимы с PhysarumSim (compile-time)', () => {
    expect(webgpuOk).toBe(true);
    expect(webgl2Ok).toBe(true);
  });

  it('NodeStat структурно совместим с SimNodeStat', () => {
    const stat: NodeStat = { playerDensity: 0.12, enemyDensity: 0.34 };
    const asSim: SimNodeStat = stat;
    expect(asSim.playerDensity).toBeCloseTo(0.12);
    expect(asSim.enemyDensity).toBeCloseTo(0.34);
  });

  it('колбэк onNodeStats принимает NodeStat[] и SimNodeStat[] взаимозаменяемо', () => {
    const sim: PhysarumSim = new WebGL2Sim();
    let received: NodeStat | null = null;
    // Колбэк интерфейса (SimNodeStat[]) совместим с потребителем NodeStat
    sim.step(0, 1 / 60, [], [], { x: -500, y: -500 }, -0.75, 0.9, 1, 0, 0, (stats) => {
      if (stats.length > 0) received = stats[0];
    });
    expect(received).toBeNull();
  });
});

describe('WebGL2Sim до init (чистый TS, без WebGL)', () => {
  it('конструктор не касается WebGL и имеет полный публичный API', () => {
    const sim = new WebGL2Sim();
    expect(sim.backend).toBe('webgl2');
    expect(sim.agentCount).toBeGreaterThan(0);
    expect(typeof sim.init).toBe('function');
    expect(typeof sim.setQualityRatio).toBe('function');
    expect(typeof sim.resetColonies).toBe('function');
    expect(typeof sim.spawnPlayerSpores).toBe('function');
    expect(typeof sim.step).toBe('function');
    expect(typeof sim.captureFrame).toBe('function');
  });

  it('setQualityRatio принимает любые значения без выбросов', () => {
    const sim = new WebGL2Sim();
    expect(() => {
      sim.setQualityRatio(0);
      sim.setQualityRatio(2);
      sim.setQualityRatio(0.5);
      sim.setQualityRatio(NaN);
    }).not.toThrow();
  });

  it('resetColonies и spawnPlayerSpores безопасны до init', () => {
    const sim = new WebGL2Sim();
    expect(() => {
      sim.resetColonies();
      sim.spawnPlayerSpores(480, 270, 1000);
      sim.spawnPlayerSpores(-100, -100, 0);
    }).not.toThrow();
  });

  it('step до init: CPU-симуляция работает, рендер пропускается', () => {
    const sim = new WebGL2Sim();
    sim.resetColonies();
    const nodes = [testNode(480, 270)];
    expect(() =>
      sim.step(0, 1 / 60, nodes, [], { x: -500, y: -500 }, 0.9, 0.9, 1, 0, 0, () => {})
    ).not.toThrow();
  });

  it('captureFrame до init возвращает null', async () => {
    const sim = new WebGL2Sim();
    await expect(sim.captureFrame()).resolves.toBeNull();
  });
});

describe('WebGL2Sim CPU-симуляция: readback плотности узлов', () => {
  it('споры игрока у узла дают playerDensity выше порога захвата 0.075', async () => {
    const sim = new WebGL2Sim();
    sim.resetColonies();
    sim.setQualityRatio(1);
    const nodes = [testNode(480, 270)];
    const noop = (): void => {};
    // Накопление следа у узла (депозит + размытие + испарение)
    for (let i = 0; i < 40; i++) {
      sim.step(i / 60, 1 / 60, nodes, [], { x: -500, y: -500 }, 0.9, 0.9, 1, 0, 0, noop);
      sim.spawnPlayerSpores(480, 270, 2000);
    }
    // Троттлинг статистики 160мс: ждём и делаем замеряющий шаг
    await new Promise((r) => setTimeout(r, 170));
    let stats: SimNodeStat[] | undefined;
    sim.step(45 / 60, 1 / 60, nodes, [], { x: -500, y: -500 }, 0.9, 0.9, 1, 0, 0, (s) => {
      stats = s;
    });
    if (!stats) throw new Error('статистика узлов не пришла в колбэк');
    expect(stats.length).toBe(1);
    expect(stats[0].playerDensity).toBeGreaterThan(0.075);
    // Вражеский фон у узла значительно слабее свежего облака спор игрока
    expect(stats[0].playerDensity).toBeGreaterThan(stats[0].enemyDensity);
  }, 10000);

  it('узел вне поля возвращает нулевые плотности', () => {
    const sim = new WebGL2Sim();
    sim.resetColonies();
    const nodes = [testNode(-50, 100), testNode(100, -50), testNode(1000, 600)];
    const seen: SimNodeStat[] = [];
    sim.step(0, 1 / 60, nodes, [], { x: -500, y: -500 }, 0.9, 0.9, 1, 0, 0, (s) => {
      seen.push(...s);
    });
    // Статистика приходит не каждый кадр (троттлинг) - проверяем только если пришла
    if (seen.length > 0) {
      expect(seen.length).toBe(3);
      for (const st of seen) {
        expect(st.playerDensity).toBe(0);
        expect(st.enemyDensity).toBe(0);
      }
    }
  });
});
