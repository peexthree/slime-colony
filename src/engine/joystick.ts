// Этап 5.3 LUMIVORE - виртуальный джойстик для мобильных.
// Управление чистым свайпом: касание задаёт плавающий центр, отклонение пальца даёт вектор.
// Реагирует только на pointerType === 'touch' - мышь не затрагивается (десктоп имеет своё управление).

const MAX_RADIUS = 60; // радиус действия джойстика, px
const DEAD_ZONE = 6;   // мёртвая зона, px
const BASE_SIZE = 124; // диаметр базы (2 * радиус + кольцо)
const KNOB_SIZE = 48;  // диаметр ручки
const CALL_SIZE = 60;  // размер кнопки «ЗОВ»

export interface Joystick {
  vector(): { x: number; y: number }; // -1..1, {0,0} когда неактивен
  active(): boolean;
  callRequested(): boolean; // true один раз после тапа по «ЗОВ»
  consumeCall(): void;      // сбросить флаг запроса
  dispose(): void;          // снять слушатели и удалить DOM
}

export function createJoystick(stage: HTMLElement, canvas: HTMLCanvasElement): Joystick {
  // Состояние
  let pointerId: number | null = null; // палец, управляющий джойстиком
  let cx = 0; // центр базы (viewport px)
  let cy = 0;
  let vx = 0; // нормализованный вектор
  let vy = 0;
  let isActive = false;
  let callFlag = false;
  let callShown = false; // кнопка появляется после первого touch
  let disposed = false;
  const prevTouchAction = canvas.style.touchAction; // вернуть при dispose

  // ---- DOM: база, ручка, кнопка «ЗОВ» ----
  const base = document.createElement('div');
  base.style.cssText = [
    'position:fixed', 'left:0', 'top:0',
    `width:${BASE_SIZE}px`, `height:${BASE_SIZE}px`,
    'border-radius:50%',
    'border:2px solid rgba(102,252,241,0.55)',
    'background:rgba(102,252,241,0.07)',
    'box-shadow:0 0 24px rgba(102,252,241,0.3), inset 0 0 18px rgba(102,252,241,0.15)',
    'pointer-events:none', 'z-index:60', 'display:none',
  ].join(';');

  const knob = document.createElement('div');
  knob.style.cssText = [
    'position:fixed', 'left:0', 'top:0',
    `width:${KNOB_SIZE}px`, `height:${KNOB_SIZE}px`,
    'border-radius:50%',
    'border:2px solid rgba(102,252,241,0.9)',
    'background:rgba(102,252,241,0.28)',
    'box-shadow:0 0 16px rgba(102,252,241,0.6)',
    'pointer-events:none', 'z-index:60', 'display:none',
  ].join(';');

  const callBtn = document.createElement('div');
  callBtn.textContent = 'ЗОВ';
  const callGlow = 'box-shadow:0 0 18px rgba(170,80,255,0.45), inset 0 0 12px rgba(170,80,255,0.25)';
  callBtn.style.cssText = [
    'position:fixed',
    'right:calc(18px + env(safe-area-inset-right))',
    'bottom:calc(18px + env(safe-area-inset-bottom))',
    `width:${CALL_SIZE}px`, `height:${CALL_SIZE}px`,
    'border-radius:50%',
    'border:2px solid rgba(186,110,255,0.85)',
    'background:rgba(120,50,210,0.28)',
    callGlow,
    'color:#e8d5ff', 'font:bold 12px/1 monospace', 'letter-spacing:1px',
    'display:none', 'align-items:center', 'justify-content:center',
    'user-select:none', '-webkit-user-select:none', '-webkit-tap-highlight-color:transparent',
    'touch-action:none', 'cursor:pointer',
    'pointer-events:auto', 'z-index:60',
  ].join(';');

  stage.appendChild(base);
  stage.appendChild(knob);
  stage.appendChild(callBtn);

  canvas.style.touchAction = 'none'; // запрет браузерных жестов на игровом поле

  // ---- Отрисовка DOM ----
  const showBase = (): void => {
    base.style.display = 'block';
    knob.style.display = 'block';
    base.style.transform = `translate(${cx - BASE_SIZE / 2}px, ${cy - BASE_SIZE / 2}px)`;
    knob.style.transform = `translate(${cx - KNOB_SIZE / 2}px, ${cy - KNOB_SIZE / 2}px)`;
  };

  const moveKnob = (dx: number, dy: number): void => {
    knob.style.transform =
      `translate(${cx - KNOB_SIZE / 2 + dx}px, ${cy - KNOB_SIZE / 2 + dy}px)`;
  };

  const hideBase = (): void => {
    base.style.display = 'none';
    knob.style.display = 'none';
  };

  const showCall = (): void => {
    if (callShown) return;
    callShown = true;
    callBtn.style.display = 'flex';
  };

  // ---- Вектор: клэмп по радиусу, мёртвая зона, нормировка ----
  const updateVector = (px: number, py: number): void => {
    let dx = px - cx;
    let dy = py - cy;
    let dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      const k = MAX_RADIUS / dist;
      dx *= k;
      dy *= k;
      dist = MAX_RADIUS;
    }
    moveKnob(dx, dy);
    if (dist <= DEAD_ZONE) {
      vx = 0;
      vy = 0;
      return;
    }
    // нормировка с вычетом мёртвой зоны: на границе радиуса ровно 1
    const norm = (dist - DEAD_ZONE) / (MAX_RADIUS - DEAD_ZONE);
    vx = (dx / dist) * norm;
    vy = (dy / dist) * norm;
  };

  const reset = (): void => {
    pointerId = null;
    isActive = false;
    vx = 0;
    vy = 0;
    hideBase();
  };

  // ---- Слушатели ----
  const onCanvasDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return; // мышь/перо игнорируем
    e.preventDefault();
    showCall(); // первый touch открывает кнопку «ЗОВ»
    if (pointerId !== null) return; // свайп уже идёт другим пальцем
    pointerId = e.pointerId;
    isActive = true;
    cx = e.clientX;
    cy = e.clientY;
    vx = 0;
    vy = 0;
    showBase();
  };

  const onWindowMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    e.preventDefault(); // блокируем скролл/зум во время свайпа
    updateVector(e.clientX, e.clientY);
  };

  const onWindowUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    reset();
  };

  const onWindowCancel = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    reset();
  };

  const onBlur = (): void => {
    if (pointerId !== null) reset(); // страховка при уходе со страницы
  };

  const CALL_DOWN_GLOW =
    'box-shadow:0 0 26px rgba(170,80,255,0.8), inset 0 0 16px rgba(170,80,255,0.5)';

  const onCallDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    e.stopPropagation(); // не задеваем игровой канвас
    callFlag = true;     // тап = запрос феромон-зова
    callBtn.style.boxShadow = CALL_DOWN_GLOW;
  };

  const onCallUp = (): void => {
    callBtn.style.boxShadow = callGlow.slice(callGlow.indexOf(':') + 1);
  };

  canvas.addEventListener('pointerdown', onCanvasDown, { passive: false });
  window.addEventListener('pointermove', onWindowMove, { passive: false });
  window.addEventListener('pointerup', onWindowUp);
  window.addEventListener('pointercancel', onWindowCancel);
  window.addEventListener('blur', onBlur);
  callBtn.addEventListener('pointerdown', onCallDown, { passive: false });
  callBtn.addEventListener('pointerup', onCallUp);
  callBtn.addEventListener('pointercancel', onCallUp);

  // ---- API ----
  return {
    vector: () => ({ x: vx, y: vy }),
    active: () => isActive,
    callRequested: () => callFlag,
    consumeCall: () => { callFlag = false; },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('pointerdown', onCanvasDown);
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowCancel);
      window.removeEventListener('blur', onBlur);
      callBtn.removeEventListener('pointerdown', onCallDown);
      callBtn.removeEventListener('pointerup', onCallUp);
      callBtn.removeEventListener('pointercancel', onCallUp);
      base.remove();
      knob.remove();
      callBtn.remove();
      canvas.style.touchAction = prevTouchAction;
    },
  };
}
