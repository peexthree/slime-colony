// Сплэш-иллюстрация шкалы бытия: полноэкранная картинка public/assets/codex
// на время метаморфоза (bullet-time + твин камеры = METAMORPH.slowT + zoomT).
import { METAMORPH } from '../engine/types';
import { scaleName, scaleSub } from '../i18n/gameData';

const FADE_MS = 600;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function els(): { root: HTMLElement | null; img: HTMLElement | null; name: HTMLElement | null; sub: HTMLElement | null } {
  return {
    root: document.getElementById('scale-splash'),
    img: document.getElementById('scale-splash-img'),
    name: document.getElementById('scale-splash-name'),
    sub: document.getElementById('scale-splash-sub'),
  };
}

/** Показать иллюстрацию шкалы на время метаморфоза, затем плавно погасить */
export function showScaleSplash(scaleId: number): void {
  const { root, img, name, sub } = els();
  if (!root || !img || !(img instanceof HTMLImageElement)) return;
  const num = String(scaleId).padStart(2, '0');
  img.src = `/assets/codex/scale-${num}.webp`;
  img.alt = scaleName(scaleId);
  if (name) name.textContent = scaleName(scaleId);
  if (sub) sub.textContent = scaleSub(scaleId);
  root.classList.add('show');
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(hideScaleSplash, (METAMORPH.slowT + METAMORPH.zoomT + FADE_MS / 1000) * 1000);
}

/** Погасить сплэш (таймер метаморфоза, смерть, финиш забега) */
export function hideScaleSplash(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  els().root?.classList.remove('show');
}
