// simResolution.test.ts - юнит-тесты адаптивного разрешения physarum-сетки.
// Чистая функция pickSimResolution + контракт no-realloc у бэкендов (Node-среда,
// без GPU: WebGPUSim/WebGL2Sim безопасны до init).
import { describe, it, expect, vi } from 'vitest';
import {
  pickSimResolution,
  simTexelWorldPx,
  roundEvenSim,
  MAX_SIM_W,
  MAX_SIM_H,
} from '../../engine/simResolution';
import { SIM_HEIGHT, SIM_WIDTH } from '../../engine/types';
import { WebGL2Sim } from '../../engine/WebGL2Sim';
import { WebGPUSim } from '../../engine/WebGPUSim';
import { SimResolutionProvider } from '../../engine/physarumSim';

/** Порог начала роста сетки (SIM_ZOOM_BASE) */
const SIM_ZOOM_BASE = 0.9;

// Compile-time: оба бэкенда сообщают фактический размер сетки
type WebGPUSizeProvider = WebGPUSim extends SimResolutionProvider ? true : false;
type WebGL2SizeProvider = WebGL2Sim extends SimResolutionProvider ? true : false;
const webgpuSized: WebGPUSizeProvider = true;
const webgl2Sized: WebGL2SizeProvider = true;

describe('pickSimResolution: базовый и максимальный размер', () => {
  it('zoom >= 0.9 даёт базовую сетку 960x540 при любом качестве (без регрессии базы)', () => {
    for (const z of [1.0, 1.5, 2.0, SIM_ZOOM_BASE]) {
      expect(pickSimResolution(z, 1)).toEqual({ w: SIM_WIDTH, h: SIM_HEIGHT });
      expect(pickSimResolution(z, 0.5)).toEqual({ w: SIM_WIDTH, h: SIM_HEIGHT });
      expect(pickSimResolution(z, 0.35)).toEqual({ w: SIM_WIDTH, h: SIM_HEIGHT });
    }
  });

  it('zoom 0.45 при полном качестве даёт потолок 1920x1080', () => {
    expect(pickSimResolution(0.45, 1)).toEqual({ w: MAX_SIM_W, h: MAX_SIM_H });
    expect(pickSimResolution(0.45, 1)).toEqual({ w: 1920, h: 1080 });
  });

  it('zoom ниже минимального клампится к потолку (0.30 как 0.45)', () => {
    expect(pickSimResolution(0.30, 1)).toEqual({ w: 1920, h: 1080 });
    expect(pickSimResolution(0.05, 1)).toEqual({ w: 1920, h: 1080 });
  });

  it('низкое качество ограничивает потолок роста (q=0.5 -> максимум 1.5x)', () => {
    expect(pickSimResolution(0.45, 0.5)).toEqual({ w: 1440, h: 810 });
    expect(pickSimResolution(0.30, 0.5)).toEqual({ w: 1440, h: 810 });
    // Промежуточный зум растёт меньше: t=1/3 от потолка 1.5x -> 1.1667x
    const res = pickSimResolution(0.75, 0.5);
    expect(res).toEqual({ w: 1120, h: 630 });
  });

  it('NaN входы трактоваются безопасно (zoom -> 1, quality -> максимум)', () => {
    expect(pickSimResolution(Number.NaN)).toEqual({ w: SIM_WIDTH, h: SIM_HEIGHT });
    expect(pickSimResolution(0.45, Number.NaN)).toEqual({ w: 1920, h: 1080 });
  });
});

describe('pickSimResolution: монотонность и кратность 2', () => {
  it('сетка монотонно растёт при снижении зума (и не убывает обратно)', () => {
    const zooms = [1.0, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3];
    let prevW = 0;
    let prevH = 0;
    for (const z of zooms) {
      const res = pickSimResolution(z, 1);
      expect(res.w).toBeGreaterThanOrEqual(prevW);
      expect(res.h).toBeGreaterThanOrEqual(prevH);
      prevW = res.w;
      prevH = res.h;
    }
    // Обратный ход: сетка монотонно сжимается при росте зума
    let prevMax = Infinity;
    for (let i = zooms.length - 1; i >= 0; i--) {
      const w = pickSimResolution(zooms[i], 1).w;
      expect(w).toBeLessThanOrEqual(prevMax);
      prevMax = w;
    }
  });

  it('все размеры кратны 2 и не меньше 2 (комбинации зума/качества/бюджета)', () => {
    for (const z of [1.0, 0.85, 0.7, 0.55, 0.45, 0.3]) {
      for (const q of [1, 0.75, 0.5, 0.35]) {
        for (const budget of [undefined, 1280 * 720, 960 * 540, 100, 10]) {
          const res = pickSimResolution(z, q, budget);
          expect(res.w % 2).toBe(0);
          expect(res.h % 2).toBe(0);
          expect(res.w).toBeGreaterThanOrEqual(2);
          expect(res.h).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('pickSimResolution: кламп бюджетом текселей', () => {
  it('бюджет WebGPU-уровня не трогает базу', () => {
    const res = pickSimResolution(1.0, 1, 960 * 540);
    expect(res).toEqual({ w: 960, h: 540 });
  });

  it('бюджет 1280x720 сжимает потолок пропорционально (WebGL2-фолбэк)', () => {
    const res = pickSimResolution(0.45, 1, 1280 * 720);
    expect(res).toEqual({ w: 1280, h: 720 });
    expect(res.w * res.h).toBeLessThanOrEqual(1280 * 720);
    // Пропорции 16:9 сохраняются с точностью до кратности 2
    expect(Math.abs(res.w / res.h - 16 / 9)).toBeLessThan(0.02);
  });

  it('жёсткий бюджет ужимает сетку вплоть до минимальной, оставаясь чётной', () => {
    const res = pickSimResolution(1.0, 1, 100);
    expect(res.w * res.h).toBeLessThanOrEqual(100);
    expect(res.w % 2).toBe(0);
    expect(res.h % 2).toBe(0);
    expect(res.w).toBeGreaterThanOrEqual(2);
    expect(res.h).toBeGreaterThanOrEqual(2);
  });
});

describe('pickSimResolution: no-realloc контракт', () => {
  it('чистая функция: одинаковые входы дают одинаковый размер (без ложных ресайзов)', () => {
    for (const z of [1.0, 0.8, 0.6, 0.45, 0.3]) {
      const a = pickSimResolution(z, 0.75, 1280 * 720);
      const b = pickSimResolution(z, 0.75, 1280 * 720);
      expect(a).toEqual(b);
    }
  });
});

describe('simTexelWorldPx: метрика плотности', () => {
  it('база на zoom 1.0 = 1.0 world px на тексель', () => {
    expect(simTexelWorldPx(1.0, { w: 960, h: 540 })).toBeCloseTo(1.0, 6);
  });

  it('жёсткая сетка на zoom 0.45 давала ~2.22 world px на тексель (проблема аудита)', () => {
    expect(simTexelWorldPx(0.45, { w: 960, h: 540 })).toBeCloseTo(2.2222, 3);
  });

  it('адаптивная сетка возвращает плотность ~1.1 на zoom 0.45', () => {
    expect(simTexelWorldPx(0.45, { w: 1920, h: 1080 })).toBeCloseTo(1.1111, 3);
  });

  it('плотность почти константна по всему диапазону зума (рост сетки компенсирует)', () => {
    for (const z of [0.9, 0.8, 0.7, 0.6, 0.5, 0.45]) {
      const texel = simTexelWorldPx(z, pickSimResolution(z, 1));
      expect(texel).toBeGreaterThan(0.95);
      expect(texel).toBeLessThan(1.15);
    }
  });
});

describe('roundEvenSim: кратность 2', () => {
  it('округляет до чётного с минимумом 2', () => {
    expect(roundEvenSim(960)).toBe(960);
    expect(roundEvenSim(961)).toBe(962);
    expect(roundEvenSim(963)).toBe(964);
    expect(roundEvenSim(3)).toBe(4);
    expect(roundEvenSim(2)).toBe(2);
    expect(roundEvenSim(1)).toBe(2);
    expect(roundEvenSim(0)).toBe(2);
    expect(roundEvenSim(Number.NaN)).toBe(2);
    expect(roundEvenSim(Number.POSITIVE_INFINITY)).toBe(2);
  });
});

describe('бэкенды: контракт setResolution и no-realloc при том же размере', () => {
  it('WebGL2Sim: ресайз применяется, колонии переселяются только при смене размера', () => {
    const sim = new WebGL2Sim();
    const spy = vi.spyOn(sim, 'resetColonies');
    sim.setResolution(1920, 1080);
    expect(sim.simWidth).toBe(1920);
    expect(sim.simHeight).toBe(1080);
    expect(spy).toHaveBeenCalledTimes(1);
    // Тот же размер: no-op без реаллокаций и без сброса следа
    sim.setResolution(1920, 1080);
    expect(sim.simWidth).toBe(1920);
    expect(spy).toHaveBeenCalledTimes(1);
    // Обратный переход и нечётный вход (кратность 2)
    sim.setResolution(1280, 720);
    expect(sim.simWidth).toBe(1280);
    expect(spy).toHaveBeenCalledTimes(2);
    sim.setResolution(961, 539);
    expect(sim.simWidth).toBe(962);
    expect(sim.simHeight).toBe(540);
  });

  it('WebGL2Sim: CPU-симуляция работает после ресайза (шаг без выбросов)', () => {
    const sim = new WebGL2Sim();
    sim.setResolution(1280, 720);
    expect(() =>
      sim.step(0, 1 / 60, [], [], { x: -500, y: -500 }, 0.9, 0.9, 1, 0, 0, () => {})
    ).not.toThrow();
    // Вброс спор в базовых координатах (контракт spawnPlayerSpores) масштабируется сам
    expect(() => sim.spawnPlayerSpores(640, 360, 100)).not.toThrow();
  });

  it('WebGPUSim: ресайз до init безопасен (поля применяются, GPU-ветка пропущена)', () => {
    const sim = new WebGPUSim();
    expect(() => sim.setResolution(1600, 900)).not.toThrow();
    expect(sim.simWidth).toBe(1600);
    expect(sim.simHeight).toBe(900);
    // Тот же размер: no-op
    sim.setResolution(1600, 900);
    expect(sim.simWidth).toBe(1600);
  });

  it('обе реализации сообщают размер (compile-time SimResolutionProvider)', () => {
    expect(webgpuSized).toBe(true);
    expect(webgl2Sized).toBe(true);
  });
});
