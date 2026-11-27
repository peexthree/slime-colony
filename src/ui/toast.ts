// Тост-уведомления: единая точка показа сообщений в #toast.
import type { Ctx } from '../game/context';

let toastTimer = 0;

export type ToastType = 'info' | 'success' | 'warn' | 'danger';

/** Показать тост: HTML допускается (инлайн-иконки), авто-скрытие через 1.9 с */
export function showToast(ctx: Ctx, msg: string, type: ToastType = 'info'): void {
  const toastEl = ctx.dom.toastEl;
  toastEl.innerHTML = msg;
  toastEl.className = `show toast--${type}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 1900);
}
