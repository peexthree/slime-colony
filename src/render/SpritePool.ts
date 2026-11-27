// Пулы спрайтов LUMIVORE: нулевые аллокации в горячем кадре.
// SpritePool - чистая дженерик-логика выдачи/возврата (тестируется без Pixi),
// SpritePoolRegistry - именованные спрайтовые пулы Pixi с переиспользованием текстур.
import { Container, Sprite, Texture } from 'pixi.js';

/** Минимальный контракт объекта пула: умеет прятаться и показываться */
export interface Poolable {
  visible: boolean;
}

/**
 * Универсальный пул объектов с acquire/release и переиспользованием.
 * Дисциплина кадра: в начале обработки сущностей - releaseAll(), затем каждый
 * acquire занимает следующий слот O(1). Новые объекты создаются только при
 * расширении пула, поэтому в горячем кадре аллокаций нет.
 */
export class SpritePool<T extends Poolable> {
  private items: T[] = [];
  private cursor = 0;

  constructor(private readonly factory: () => T) {}

  /** O(1): выдаёт следующий слот, при расширении создаёт объект через фабрику */
  acquire(): T {
    const idx = this.cursor;
    this.cursor++;
    if (idx < this.items.length) {
      const item = this.items[idx];
      item.visible = true;
      return item;
    }
    const item = this.factory();
    this.items.push(item);
    item.visible = true;
    return item;
  }

  /** Скрыть все объекты и сбросить курсор: после этого acquire идёт с нуля */
  releaseAll(): void {
    for (const item of this.items) item.visible = false;
    this.cursor = 0;
  }

  /** Скрыть объекты за текущим курсором (пул без пофреймового releaseAll) */
  hideRest(): void {
    for (let i = this.cursor; i < this.items.length; i++) this.items[i].visible = false;
  }

  /** Прогрев: заранее создать n объектов, не показывая их */
  reserve(n: number): void {
    while (this.items.length < n) {
      const item = this.factory();
      item.visible = false;
      this.items.push(item);
    }
  }

  /** Полный сброс состояния курсора (объекты остаются в пуле) */
  reset(): void {
    this.releaseAll();
  }

  /** Всего объектов в пуле (созданных с начала жизни) */
  get size(): number {
    return this.items.length;
  }

  /** Сколько объектов выдано с последнего releaseAll */
  get activeCount(): number {
    return this.cursor;
  }
}

/**
 * Реестр именованных спрайтовых пулов Pixi.
 * Семантика совпадает с историческим makeSprite/releasePool монолита:
 * спрайт выдаётся O(1) за кадр, при переиспользовании меняется только текстура
 * и родитель (без пересоздания), releasePool прячет пул и сбрасывает курсор.
 */
export class SpritePoolRegistry {
  private pools = new Map<string, SpritePool<Sprite>>();

  constructor(
    /** Родитель по умолчанию для новых пулов (в монолите - entityLayer) */
    private readonly defaultParent: Container,
    /** Текстура по умолчанию (glowTex) */
    private readonly defaultTex: Texture,
  ) {}

  /** O(1): взять спрайт из именованного пула с заданными tint/blend/текстурой */
  makeSprite(
    poolKey: string,
    tint: number,
    blend: 'add' | 'normal',
    customTex?: Texture,
    parent: Container = this.defaultParent,
  ): Sprite {
    let pool = this.pools.get(poolKey);
    if (!pool) {
      const tex0 = customTex ?? this.defaultTex;
      const parent0 = parent;
      pool = new SpritePool<Sprite>(() => {
        const s = new Sprite(tex0);
        s.anchor.set(0.5);
        s.visible = false;
        parent0.addChild(s);
        return s;
      });
      this.pools.set(poolKey, pool);
    }
    const s = pool.acquire();
    const targetTex = customTex ?? this.defaultTex;
    if (s.texture !== targetTex) s.texture = targetTex;
    if (s.parent !== parent) parent.addChild(s);
    s.tint = tint;
    s.blendMode = blend;
    s.rotation = 0;
    return s;
  }

  /** Скрыть весь именованный пул и сбросить его курсор (в начале каждого кадра) */
  releasePool(poolKey: string): void {
    this.pools.get(poolKey)?.releaseAll();
  }

  /** Полный сброс всех пулов при рестарте забега */
  reset(): void {
    for (const pool of this.pools.values()) pool.releaseAll();
  }
}
