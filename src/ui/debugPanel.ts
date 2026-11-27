// DEV-ONLY отладочная панель LUMIVORE. Монтируется из main.ts динамическим
// import только при import.meta.env.DEV - в prod-сборке модуль не попадает
// в основной бандл, а внутренний guard страхует от случайного запуска.
// Открытие: F9 или ` (backquote, на русской раскладке - физическая та же
// клавиша даёт 'ё'); обработчик клавиш в ui/events.ts вызывает
// window.__lumivoreDebugToggle, который регистрирует mountDebugPanel.
// Возможности:
//  1) график FPS / frame-time за последние ~120 кадров (маленький canvas 2D);
//  2) степперы Шкалы бытия 1..15 через debug-хук window.__lumivore.setScale;
//  3) выдача любого из 6 Великих Гибридов через window.__lumivore.hybrid;
//  4) визуализация хитбоксов: canvas 2D поверх игровой сцены
//     (pointer-events none, z-index выше pixi-canvas): окружности врагов,
//     снарядов, радиус игрока и сетка spatial hash (клетка 40 px симуляции).
// Стили панели - inline, модуль не зависит от src/styles.
import { HYBRIDS, PROJ_RADIUS } from '../engine/types';
import type { HybridId } from '../engine/types';
import { playerRadius } from '../game/state';
import { hybridName } from '../i18n/gameData';
import type { Ctx } from '../game/context';

/** Размер клетки spatial hash (const CELL не экспортируется из entities.ts) */
const HASH_CELL = 40;
/** Ключ клетки: та же формула хеша, что в entities.ts (cx * 1024 + cy) */
const HASH_KEY = (cx: number, cy: number): number => cx * 1024 + cy;
/** Глубина графика: последние ~120 кадров */
const MAX_FRAMES = 120;

/** Тип debug-хуков window.__lumivore, нужных панели (см. main.ts) */
interface LumivoreDebugApi {
  setScale?: (idx: number) => void;
  hybrid?: (id: HybridId) => void;
}

// ============================ ХИТБОКС-ОВЕРЛЕЙ ============================

/** Отрисовка одного кадра визуализации хитбоксов в экранных координатах */
function drawHitboxes(ctx: Ctx, cv: HTMLCanvasElement, g: CanvasRenderingContext2D): void {
  const overlay = ctx.svc.overlay;
  const w = overlay.screenWidth;
  const h = overlay.screenHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  // Мировые -> экранные координаты: та же формула, что в events.ts (мышь)
  const k = Math.max(0.0001, ctx.camZoom * overlay.scale);
  const toX = (x: number): number => (x - ctx.camX) * k + w / 2;
  const toY = (y: number): number => (y - ctx.camY) * k + h / 2;

  // --- Сетка spatial hash: слабая сетка видимой области + подсветка занятых клеток ---
  const occupied = new Set<number>();
  for (let i = 0; i < ctx.enemies.length; i++) {
    const e = ctx.enemies[i];
    occupied.add(HASH_KEY(Math.floor(e.x / HASH_CELL), Math.floor(e.y / HASH_CELL)));
  }
  const cellPx = HASH_CELL * k;
  const wx0 = ctx.camX - w / 2 / k;
  const wy0 = ctx.camY - h / 2 / k;
  const c0x = Math.floor(wx0 / HASH_CELL);
  const c0y = Math.floor(wy0 / HASH_CELL);
  const c1x = Math.floor((wx0 + w / k) / HASH_CELL);
  const c1y = Math.floor((wy0 + h / k) / HASH_CELL);
  g.lineWidth = 1;
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      const px = toX(cx * HASH_CELL);
      const py = toY(cy * HASH_CELL);
      if (occupied.has(HASH_KEY(cx, cy))) {
        g.fillStyle = 'rgba(102, 252, 241, 0.07)';
        g.fillRect(px, py, cellPx, cellPx);
        g.strokeStyle = 'rgba(102, 252, 241, 0.45)';
      } else {
        g.strokeStyle = 'rgba(102, 252, 241, 0.09)';
      }
      g.strokeRect(px, py, cellPx, cellPx);
    }
  }

  // --- Враги: окружности (титан - белый, элита - золото, рой - алый) ---
  g.lineWidth = 1.5;
  for (let i = 0; i < ctx.enemies.length; i++) {
    const e = ctx.enemies[i];
    g.strokeStyle = e.titan
      ? 'rgba(255,255,255,0.95)'
      : e.elite
        ? 'rgba(255,209,102,0.9)'
        : 'rgba(255,59,92,0.75)';
    g.beginPath();
    g.arc(toX(e.x), toY(e.y), Math.max(2, e.radius * k), 0, Math.PI * 2);
    g.stroke();
  }

  // --- Снаряды игрока (циан) и врагов (магента) ---
  g.strokeStyle = 'rgba(102, 252, 241, 0.85)';
  for (let i = 0; i < ctx.projs.length; i++) {
    const p = ctx.projs[i];
    g.beginPath();
    g.arc(toX(p.x), toY(p.y), Math.max(1.5, PROJ_RADIUS * k), 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255, 42, 133, 0.85)';
  for (let i = 0; i < ctx.eprojs.length; i++) {
    const p = ctx.eprojs[i];
    // У eprojs нет поля радиуса - вражеский плевок визуально ~5 px симуляции
    g.beginPath();
    g.arc(toX(p.x), toY(p.y), Math.max(1.5, 5 * k), 0, Math.PI * 2);
    g.stroke();
  }

  // --- Игрок: радиус тела + перекрестие ---
  const pr = Math.max(3, playerRadius(ctx) * k);
  g.strokeStyle = 'rgba(57, 255, 20, 0.9)';
  g.beginPath();
  g.arc(toX(ctx.player.x), toY(ctx.player.y), pr, 0, Math.PI * 2);
  g.stroke();
  const px = toX(ctx.player.x);
  const py = toY(ctx.player.y);
  g.beginPath();
  g.moveTo(px - pr - 6, py);
  g.lineTo(px - pr + 2, py);
  g.moveTo(px + pr - 2, py);
  g.lineTo(px + pr + 6, py);
  g.moveTo(px, py - pr - 6);
  g.lineTo(px, py - pr + 2);
  g.moveTo(px, py + pr - 2);
  g.lineTo(px, py + pr + 6);
  g.stroke();
}

// ============================ FPS-ГРАФИК ============================

/** Бар-график frame-time: зелёный <= 17.5 мс, жёлтый <= 34 мс, красный дальше */
function drawGraph(g: CanvasRenderingContext2D, data: number[], w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  // Линия 60 FPS (16.7 мс)
  const y60 = h - (16.7 / 40) * h;
  g.strokeStyle = 'rgba(102, 252, 241, 0.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0.5, y60);
  g.lineTo(w - 0.5, y60);
  g.stroke();
  const bw = w / MAX_FRAMES;
  for (let i = 0; i < data.length; i++) {
    const ms = data[i];
    const bh = Math.min(1, ms / 40) * (h - 2);
    g.fillStyle = ms <= 17.5 ? '#39ff14' : ms <= 34 ? '#ffd166' : '#ff3b5c';
    g.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
  }
}

// ============================ МОНТАЖ ПАНЕЛИ ============================

/**
 * Смонтировать отладочную панель. Вызывается из main.ts только в DEV:
 *   void import('./ui/debugPanel').then((m) => m.mountDebugPanel(ctx));
 * Повторный вызов игнорируется (панель одна). Панель стартует скрытой.
 */
export function mountDebugPanel(ctx: Ctx): void {
  // Страховка: модуль предназначен только для dev-сборки
  if (!import.meta.env.DEV) return;
  const win = window as unknown as {
    __lumivore?: LumivoreDebugApi;
    __lumivoreDebugToggle?: () => void;
  };
  if (win.__lumivoreDebugToggle) return; // уже смонтирована
  const api = win.__lumivore ?? {};

  // ---------- Панель ----------
  const panel = document.createElement('div');
  panel.id = 'lumivore-debug';
  panel.style.cssText =
    'position:fixed;left:10px;bottom:10px;z-index:9000;display:none;flex-direction:column;gap:6px;' +
    'width:268px;padding:8px 10px;background:rgba(2,6,10,0.93);border:1px solid rgba(102,252,241,0.4);' +
    'border-radius:10px;font:11px/1.45 ui-monospace,Consolas,monospace;color:#9ab0c4;' +
    'box-shadow:0 6px 24px rgba(0,0,0,0.5);user-select:none;';
  panel.innerHTML =
    '<div class="db-head" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">' +
    '<b style="color:#66fcf1;letter-spacing:0.12em;">LUMIVORE DEBUG</b>' +
    '<span class="db-fps" style="color:#eaf4f8;font-weight:700;">-- fps</span></div>';
  document.body.appendChild(panel);

  // ---------- График FPS ----------
  const graph = document.createElement('canvas');
  graph.width = 246;
  graph.height = 54;
  graph.style.cssText = 'width:100%;border-radius:4px;background:rgba(102,252,241,0.05);';
  const gctx = graph.getContext('2d')!;
  panel.appendChild(graph);

  // ---------- Шкала бытия: степперы и прямые кнопки 1..15 ----------
  const scaleRow = document.createElement('div');
  scaleRow.style.cssText = 'display:flex;align-items:center;gap:3px;flex-wrap:wrap;';
  const scaleLabel = document.createElement('span');
  scaleLabel.style.cssText = 'width:100%;letter-spacing:0.1em;color:#66fcf1;font-weight:700;';
  scaleLabel.textContent = 'ШКАЛА БЫТИЯ';
  scaleRow.appendChild(scaleLabel);
  const mkBtn = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText =
      'min-width:18px;height:18px;padding:0 3px;font:inherit;color:#c3d4e3;background:rgba(102,252,241,0.08);' +
      'border:1px solid rgba(102,252,241,0.3);border-radius:4px;cursor:pointer;';
    btn.addEventListener('click', onClick);
    return btn;
  };
  scaleRow.appendChild(mkBtn('-', 'Шкала вниз', () => api.setScale?.(ctx.scaleIdx - 1)));
  const scaleBtns: HTMLButtonElement[] = [];
  for (let i = 1; i <= 15; i++) {
    const idx = i - 1;
    const btn = mkBtn(String(i), `Перейти на шкалу ${i}`, () => api.setScale?.(idx));
    scaleBtns.push(btn);
    scaleRow.appendChild(btn);
  }
  scaleRow.appendChild(mkBtn('+', 'Шкала вверх', () => api.setScale?.(ctx.scaleIdx + 1)));
  panel.appendChild(scaleRow);

  // ---------- Выдача гибридов ----------
  const hybRow = document.createElement('div');
  hybRow.style.cssText = 'display:flex;align-items:center;gap:3px;flex-wrap:wrap;';
  const hybLabel = document.createElement('span');
  hybLabel.style.cssText = 'width:100%;letter-spacing:0.1em;color:#ffd166;font-weight:700;';
  hybLabel.textContent = 'ВЫДАТЬ ГИБРИД';
  hybRow.appendChild(hybLabel);
  for (const h of HYBRIDS) {
    // Короткая метка: первое слово полного имени (полное - в title)
    const btn = mkBtn(hybridName(h.id).split(' ')[0], `Выдать: ${hybridName(h.id)}`, () =>
      api.hybrid?.(h.id),
    );
    btn.style.borderColor = 'rgba(255,209,102,0.35)';
    btn.style.background = 'rgba(255,209,102,0.08)';
    hybRow.appendChild(btn);
  }
  panel.appendChild(hybRow);

  // ---------- Хитбоксы ----------
  const hbRow = document.createElement('div');
  hbRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'lumivore-debug-hitboxes';
  const cbLabel = document.createElement('label');
  cbLabel.htmlFor = cb.id;
  cbLabel.style.cssText = 'cursor:pointer;';
  cbLabel.textContent = 'Хитбоксы / spatial hash';
  hbRow.appendChild(cb);
  hbRow.appendChild(cbLabel);
  const hint = document.createElement('span');
  hint.style.cssText = 'margin-left:auto;color:#64748b;';
  hint.textContent = 'F9 / ` - скрыть';
  hbRow.appendChild(hint);
  panel.appendChild(hbRow);

  // Хитбокс-канвас: поверх pixi-canvas (z-index 3), под модалками, без ввода
  const hbCanvas = document.createElement('canvas');
  hbCanvas.id = 'lumivore-hitboxes';
  hbCanvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;display:none;';
  ctx.dom.stage.appendChild(hbCanvas);
  const hctx = hbCanvas.getContext('2d')!;

  cb.addEventListener('change', () => {
    hbCanvas.style.display = cb.checked ? 'block' : 'none';
    if (!cb.checked) hctx.clearRect(0, 0, hbCanvas.width, hbCanvas.height);
  });

  // ---------- rAF-цикл панели: замер кадров, график, синхронизация, хитбоксы ----------
  let visible = false;
  let last = performance.now();
  const frameMs: number[] = [];
  const fpsEl = panel.querySelector('.db-fps') as HTMLElement;
  let fpsTimer = 0;

  const loop = (now: number): void => {
    requestAnimationFrame(loop);
    frameMs.push(now - last);
    if (frameMs.length > MAX_FRAMES) frameMs.shift();
    last = now;
    if (!visible) return;
    drawGraph(gctx, frameMs, graph.width, graph.height);
    // Подсветка текущей шкалы
    for (let i = 0; i < scaleBtns.length; i++) {
      scaleBtns[i].style.background = i === ctx.scaleIdx ? 'rgba(102,252,241,0.45)' : 'rgba(102,252,241,0.08)';
      scaleBtns[i].style.color = i === ctx.scaleIdx ? '#eafffb' : '#c3d4e3';
    }
    // FPS-подпись обновляем ~4 раза в секунду
    fpsTimer += frameMs[frameMs.length - 1];
    if (fpsTimer >= 250) {
      fpsTimer = 0;
      const tail = frameMs.slice(-30);
      const avg = tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length);
      fpsEl.textContent = `${(1000 / Math.max(0.001, avg)).toFixed(0)} fps · ${avg.toFixed(1)} ms`;
    }
    if (cb.checked) drawHitboxes(ctx, hbCanvas, hctx);
  };
  requestAnimationFrame(loop);

  // ---------- Переключатель: регистрируется для ui/events.ts (F9 / `) ----------
  win.__lumivoreDebugToggle = () => {
    visible = !visible;
    panel.style.display = visible ? 'flex' : 'none';
  };
}
