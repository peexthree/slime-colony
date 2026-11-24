/** Пространственная хэш-сетка для O(1) выборки ближайших сущностей */
export class SpatialHashGrid<T extends { x: number; y: number }> {
  private readonly cellSize: number;
  private readonly cells = new Map<number, T[]>();
  private readonly pool: T[][] = [];

  constructor(cellSize = 80) {
    this.cellSize = Math.max(16, cellSize);
  }

  private hashKey(cx: number, cy: number): number {
    // Упаковка 2x16-bit signed координат в безопасное целое
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  clear(): void {
    for (const bucket of this.cells.values()) {
      bucket.length = 0;
      this.pool.push(bucket);
    }
    this.cells.clear();
  }

  insertAll(items: readonly T[]): void {
    this.clear();
    const inv = 1 / this.cellSize;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cx = Math.floor(item.x * inv);
      const cy = Math.floor(item.y * inv);
      const key = this.hashKey(cx, cy);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = this.pool.pop() ?? [];
        this.cells.set(key, bucket);
      }
      bucket.push(item);
    }
  }

  queryRadius(x: number, y: number, radius: number, out: T[] = []): T[] {
    out.length = 0;
    const inv = 1 / this.cellSize;
    const minX = Math.floor((x - radius) * inv);
    const maxX = Math.floor((x + radius) * inv);
    const minY = Math.floor((y - radius) * inv);
    const maxY = Math.floor((y + radius) * inv);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const bucket = this.cells.get(this.hashKey(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          out.push(bucket[i]);
        }
      }
    }
    return out;
  }
}
