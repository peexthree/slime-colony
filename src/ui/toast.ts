// Тост-уведомления: единая точка показа сообщений в #toast.
import type { Ctx } from '../game/context';

let toastTimer = 0;
const TOAST_MS = 5200;

export type ToastType = 'info' | 'success' | 'warn' | 'danger';

/** Показать тост: HTML допускается (инлайн-иконки). Держится на экране
 *  TOAST_MS - на плейтесте 1.9с не хватало даже прочитать сообщение. */
export function showToast(ctx: Ctx, msg: string, type: ToastType = 'info'): void {
  const toastEl = ctx.dom.toastEl;
  toastEl.innerHTML = msg;
  toastEl.className = `show toast--${type}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), TOAST_MS);
}
