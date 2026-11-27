// Юнит-тесты чистой логики SpritePool: acquire/release/переиспользование/сброс.
// Pixi в node не запускается - используем фейковые объекты {x, y, visible}.
import { describe, it, expect } from 'vitest';
import { SpritePool } from '../SpritePool';

interface FakeSprite {
  x: number;
  y: number;
  visible: boolean;
}

describe('SpritePool', () => {
  it('acquire создаёт новый объект через фабрику и показывает его', () => {
    let created = 0;
    const pool = new SpritePool<FakeSprite>(() => {
      created++;
      return { x: 0, y: 0, visible: false };
    });

    const a = pool.acquire();
    expect(created).toBe(1);
    expect(a.visible).toBe(true);
    expect(pool.activeCount).toBe(1);
  });

  it('acquire возвращает разные объекты без повторного вызова фабрики внутри кадра', () => {
    let created = 0;
    const pool = new SpritePool<FakeSprite>(() => {
      created++;
      return { x: 0, y: 0, visible: false };
    });

    const a = pool.acquire();
    const b = pool.acquire();
    expect(created).toBe(2);
    expect(a).not.toBe(b);
    expect(a.visible).toBe(true);
    expect(b.visible).toBe(true);
  });

  it('releaseAll прячет все объекты и сбрасывает курсор', () => {
    const pool = new SpritePool<FakeSprite>(() => ({ x: 0, y: 0, visible: false }));
    pool.acquire();
    pool.acquire();
    pool.acquire();

    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
  });

  it('переиспользует объекты после releaseAll: фабрика вызывается один раз на слот', () => {
    let created = 0;
    const pool = new SpritePool<FakeSprite>(() => {
      created++;
      return { x: 0, y: 0, visible: false };
    });

    // Первый кадр: 3 выдачи
    pool.acquire();
    pool.acquire();
    pool.acquire();
    pool.releaseAll();

    // Второй кадр: те же 3 слота, без новых аллокаций
    const again = [pool.acquire(), pool.acquire(), pool.acquire()];
    expect(created).toBe(3);
    expect(pool.activeCount).toBe(3);
    expect(again.every((s) => s.visible)).toBe(true);

    // Четвёртая выдача сверх ёмкости создаёт новый объект
    pool.acquire();
    expect(created).toBe(4);
    expect(pool.size).toBe(4);
  });

  it('acquire после releaseAll выдаёт слоты в стабильном порядке (LIFO не смешивает объекты)', () => {
    const pool = new SpritePool<FakeSprite>(() => ({ x: 0, y: 0, visible: false }));
    const first = [pool.acquire(), pool.acquire(), pool.acquire()];
    first.forEach((s, i) => { s.x = 10 + i; });

    pool.releaseAll();
    const second = [pool.acquire(), pool.acquire(), pool.acquire()];
    second.forEach((s, i) => expect(s.x).toBe(10 + i));
  });

  it('hideRest прячет объекты за курсором, активные остаются видимыми', () => {
    const pool = new SpritePool<FakeSprite>(() => ({ x: 0, y: 0, visible: false }));
    // Прогрев до 4 слотов
    pool.acquire(); pool.acquire(); pool.acquire(); pool.acquire();
    pool.releaseAll();

    const active = [pool.acquire(), pool.acquire()];
    pool.hideRest();
    expect(active.every((s) => s.visible)).toBe(true);
    expect(pool.size).toBe(4);
    expect(pool.activeCount).toBe(2);
  });

  it('reserve прогревает пул заранее, не показывая объекты', () => {
    let created = 0;
    const pool = new SpritePool<FakeSprite>(() => {
      created++;
      return { x: 0, y: 0, visible: false };
    });

    pool.reserve(5);
    expect(created).toBe(5);
    expect(pool.size).toBe(5);
    expect(pool.activeCount).toBe(0);

    // acquire после прогрева не создаёт новых объектов
    const s = pool.acquire();
    expect(created).toBe(5);
    expect(s.visible).toBe(true);
  });

  it('reset эквивалентен releaseAll', () => {
    const pool = new SpritePool<FakeSprite>(() => ({ x: 0, y: 0, visible: false }));
    pool.acquire();
    pool.acquire();
    pool.reset();
    expect(pool.activeCount).toBe(0);
    expect(pool.size).toBe(2);
  });

  it('повторный releaseAll идемпотентен', () => {
    const pool = new SpritePool<FakeSprite>(() => ({ x: 0, y: 0, visible: false }));
    pool.acquire();
    pool.releaseAll();
    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    expect(pool.size).toBe(1);
  });
});
