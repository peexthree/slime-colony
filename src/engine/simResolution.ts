// simResolution.ts - адаптивное разрешение physarum-сетки (аудит Scrolling/Adaptive Grid)
// Проблема: сетка симуляции жёстко 960x540 и покрывает видимую область мира через
// zoom-компрессию (toSimX/Y в src/game/context.ts умножают на camZoom). Ширина
// видимого окна = SIM_WIDTH / zoom world px, поэтому на шкале 15 (zoom 0.45)
// один тексель растягивается до ~2.2 world px - след теряет чёткость.
// Решение: чем меньше зум (больше видимый мир), тем больше сетка, чтобы плотность
// текселей на world-пиксель оставалась константной. Ограничения: рост до 2x по
// каждой оси (GPU-бюджет), кратность 2, качество и бюджет клампят потолок.
import { SIM_HEIGHT, SIM_WIDTH } from './types';

/** Базовая сетка: стартовое разрешение и минимум (zoom >= SIM_ZOOM_BASE) */
export const BASE_SIM_W = SIM_WIDTH;
export const BASE_SIM_H = SIM_HEIGHT;

/** Зум, ниже которого начинается рост сетки (шкалы 1-2 остаются на базе) */
export const SIM_ZOOM_BASE = 0.9;
/** Зум, при котором сетка достигает максимума (последняя шкала) */
export const SIM_ZOOM_LOW = 0.45;
/** Максимальный рост сетки по каждой оси: 960x540 -> 1920x1080 */
export const SIM_SCALE_MAX = 2;
/** Потолок сетки при максимальном качестве (тексели) */
export const MAX_SIM_W = BASE_SIM_W * SIM_SCALE_MAX;
export const MAX_SIM_H = BASE_SIM_H * SIM_SCALE_MAX;
/** Нижний кламп множителя качества (согласован с setQualityRatio бэкендов) */
export const SIM_QUALITY_MIN = 0.35;

/** Размер сетки симуляции в текселях */
export interface SimResolution {
  w: number;
  h: number;
}

/** Округление до чётного значения (кратность 2), минимум 2 */
export function roundEvenSim(v: number): number {
  const n = Number.isFinite(v) ? Math.round(v / 2) * 2 : 2;
  return Math.max(2, n);
}

/**
 * Выбор разрешения сетки под текущий зум и качество. Чистая функция:
 * одинаковые входы дают одинаковый размер (no-realloc контракт бэкендов).
 *
 * Формула:
 *   t        = clamp((SIM_ZOOM_BASE - zoom) / (SIM_ZOOM_BASE - SIM_ZOOM_LOW), 0, 1)
 *   maxScale = 1 + (SIM_SCALE_MAX - 1) * clamp(qualityRatio, SIM_QUALITY_MIN, 1)
 *   scale    = 1 + (maxScale - 1) * t
 *   res      = round2(BASE * scale), бюджет: пропорциональное сжатие до w*h <= maxTexBudget
 *
 * Качество ограничивает потолок роста слабых GPU; база 960x540 сохраняется
 * при zoom >= 0.9 для любого качества (без регрессии базового масштаба).
 */
export function pickSimResolution(
  zoom: number,
  qualityRatio = 1,
  maxTexBudget?: number,
): SimResolution {
  const z = Number.isFinite(zoom) ? zoom : 1;
  const q = Number.isFinite(qualityRatio)
    ? Math.max(SIM_QUALITY_MIN, Math.min(1, qualityRatio))
    : 1;
  // Прогресс 0..1: 0 при базовом зуме, 1 при минимальном (ниже - кламп)
  const t = Math.max(0, Math.min(1, (SIM_ZOOM_BASE - z) / (SIM_ZOOM_BASE - SIM_ZOOM_LOW)));
  const maxScale = 1 + (SIM_SCALE_MAX - 1) * q;
  const scale = 1 + (maxScale - 1) * t;
  let w = roundEvenSim(BASE_SIM_W * scale);
  let h = roundEvenSim(BASE_SIM_H * scale);
  // Бюджет текселей (лимит GPU/CPU-памяти): обе оси сжимаются пропорционально
  if (typeof maxTexBudget === 'number' && Number.isFinite(maxTexBudget) && maxTexBudget > 0) {
    const k = Math.sqrt(maxTexBudget / (w * h));
    if (k < 1) {
      w = roundEvenSim(w * k);
      h = roundEvenSim(h * k);
    }
    // Округление вверх может чуть превысить лимит: дожимаем парами по 2 текселя
    while (w * h > maxTexBudget && (w > 2 || h > 2)) {
      w = Math.max(2, w - 2);
      h = Math.max(2, h - 2);
    }
  }
  return { w, h };
}

/**
 * Мировых пикселей на тексель при данном зуме и сетке - метрика чёткости следа.
 * База 960x540 на zoom 1.0 даёт 1.0; жёсткая сетка на zoom 0.45 давала ~2.22
 * (проблема аудита), рост сетки до 1920x1080 возвращает ~1.11.
 */
export function simTexelWorldPx(zoom: number, res: SimResolution): number {
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return (SIM_WIDTH / z) / Math.max(1, res.w);
}
