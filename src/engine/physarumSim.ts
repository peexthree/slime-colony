// physarumSim.ts - общий контракт physarum-симуляции и выбор бэкенда
// Игра обязана запускаться и без WebGPU: фабрика пробует WebGPU (adapter + device)
// и при любой неудаче откатывается на WebGL2-фолбэк (WebGL2Sim) -
// старый Safari, Firefox без флагов, бюджетные Android.
import { Beacon, BioNode } from './types';
import { WebGPUSim } from './WebGPUSim';
import { WebGL2Sim } from './WebGL2Sim';

/** Доступный графический бэкенд симуляции */
export type PhysarumBackend = 'webgpu' | 'webgl2';

/**
 * Плотность штаммов на узле. Структурный двойник NodeStat из WebGPUSim -
 * оба типа взаимно совместимы, main.ts может продолжать импортировать NodeStat.
 */
export interface SimNodeStat {
  playerDensity: number;
  enemyDensity: number;
}

/**
 * Общий интерфейс симуляции slime mold. Публичный API повторяет фактический
 * API WebGPUSim, чтобы оба бэкенда были взаимозаменяемы в main.ts.
 */
export interface PhysarumSim {
  /** Какой бэкенд реально используется (для диагностики и метрик) */
  readonly backend: PhysarumBackend;
  /** Общий размер популяции агентов (константа бэкенда) */
  readonly agentCount: number;
  /** Колбэк потери GPU/контекста (WebGPU device.lost / webglcontextlost) */
  onDeviceLost?: (reason: string) => void;
  /** Привязка симуляции к канвасу: выбор контекста, ресурсы, стартовое состояние */
  init(canvas: HTMLCanvasElement): Promise<void>;
  /** Качество симуляции: доля активных агентов (0.35..1.0) */
  setQualityRatio(ratio: number): void;
  /** Сброс поля и расселение обоих штаммов по всей карте */
  resetColonies(): void;
  /**
   * Вброс свежих агентов игрока у точки (кольцевой курсор по активной половине).
   * Координаты - в БАЗОВОЙ системе SIM_WIDTH x SIM_HEIGHT (как отдаёт toSimX/toSimY);
   * бэкенд сам масштабирует их в текущую адаптивную сетку.
   */
  spawnPlayerSpores(x: number, y: number, count?: number): void;
  /**
   * Адаптивное разрешение сетки (см. simResolution.ts): переподключение
   * ping-pong буферов/текстур и uniforms под новый размер. Содержимое следа
   * НЕ сохраняется (сброс при ресайзе допустим по контракту, колонии
   * расселяются заново). Вызов с текущим размером - no-op без реаллокаций.
   */
  setResolution(w: number, h: number): void;
  /** Шаг симуляции + рендер поля + асинхронная статистика узлов */
  step(
    time: number,
    dt: number,
    nodes: BioNode[],
    beacons: Beacon[],
    aiTarget: { x: number; y: number },
    aiIntensity: number,
    evaporation: number,
    scaleId: number,
    camDeltaX: number,
    camDeltaY: number,
    onNodeStats: (stats: SimNodeStat[]) => void
  ): void;
  /** Снимок последнего кадра physarum-поля (Портрет организма) */
  captureFrame(): Promise<HTMLCanvasElement | null>;
}

/**
 * Фактический размер сетки после возможного адаптивного ресайза. Реализуют
 * оба бэкенда; headless-моки поле не имеют - потребители читают через
 * typeof-проверку (Partial<SimResolutionProvider>).
 */
export interface SimResolutionProvider {
  readonly simWidth: number;
  readonly simHeight: number;
}

/**
 * Дешёвая синхронная проверка наличия WebGPU. Чистая функция - используется
 * фабрикой и юнит-тестами (navigator без gpu -> webgl2).
 */
export function detectBackend(navigatorLike: { gpu?: unknown } | undefined | null): PhysarumBackend {
  if (!navigatorLike) return 'webgl2';
  const gpu = navigatorLike.gpu;
  // GPU-объект это живой объект/функция; null и undefined означают отсутствие API
  return (typeof gpu === 'object' || typeof gpu === 'function') && gpu !== null ? 'webgpu' : 'webgl2';
}

/** Минимальный структурный срез WebGPU API для пробы устройства */
interface GpuAdapterLike {
  requestDevice(): Promise<{ destroy(): void }>;
}

interface GpuLike {
  requestAdapter(options?: { powerPreference?: string }): Promise<GpuAdapterLike | null>;
}

/**
 * Фабрика бэкенда: navigator.gpu есть -> requestAdapter() -> requestDevice().
 * Если адаптера нет или устройство не создаётся (try/catch) - WebGL2 путь.
 * Синхронно не бросает никогда: любые ошибки WebGPU дают фолбэк.
 */
export async function createPhysarumSim(): Promise<PhysarumSim> {
  const nav: { gpu?: unknown } | undefined =
    typeof navigator !== 'undefined' ? navigator : undefined;
  if (detectBackend(nav) === 'webgpu') {
    try {
      const gpu = nav!.gpu as GpuLike;
      const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) {
        // Проба устройства: создаём и сразу освобождаем,
        // финальный контекст создаст WebGPUSim.init()
        const device = await adapter.requestDevice();
        device.destroy();
        return new WebGPUSim();
      }
    } catch {
      // adapter null / устройство не создалось / среда сломана -> фолбэк ниже
    }
  }
  return new WebGL2Sim();
}
