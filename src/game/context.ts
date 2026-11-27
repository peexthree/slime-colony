// Контекст игры: состояние забега + DOM-ссылки + сервисы (overlay/sim/sfx/radar/...)
// + настройки. Все доменные функции имеют сигнатуру (ctx: Ctx, ...) - явная
// зависимость вместо общего замыкания.
import type { PixiOverlay } from '../engine/PixiOverlay';
import type { PhysarumSim } from '../engine/physarumSim';
import type { Sfx } from '../engine/audio';
import type { PetriRadar } from '../engine/radar';
import type { WaveDirector } from '../engine/waves';
import type { Joystick } from '../engine/joystick';
import type { GamepadController } from '../engine/gamepad';
import { SIM_HEIGHT, SIM_WIDTH } from '../engine/types';
import type { RunState } from './state';
import type { Dom } from '../ui/dom';
import type { SettingsData } from './save';

/** Инфраструктурные сервисы, живущие весь жизненный цикл приложения */
export interface Services {
  overlay: PixiOverlay;
  sim: PhysarumSim;
  sfx: Sfx;
  radar: PetriRadar;
  waves: WaveDirector;
  gamepad: GamepadController;
  joystick: Joystick;
}

/** Полный контекст: состояние забега + ссылки на DOM + сервисы + настройки */
export interface Ctx extends RunState {
  dom: Dom;
  svc: Services;
  settings: SettingsData;
}

/** Половина ширины вида в мировых единицах */
export function viewHalfW(ctx: Ctx): number {
  return (ctx.svc.overlay.screenWidth / 2) / Math.max(0.01, ctx.camZoom * (ctx.svc.overlay.scale || 1));
}

/** Половина высоты вида в мировых единицах */
export function viewHalfH(ctx: Ctx): number {
  return (ctx.svc.overlay.screenHeight / 2) / Math.max(0.01, ctx.camZoom * (ctx.svc.overlay.scale || 1));
}

/** Мировая координата X -> координата симуляции physarum */
export function toSimX(ctx: Ctx, wx: number): number {
  const halfViewW = (SIM_WIDTH / 2) / ctx.camZoom;
  return (wx - (ctx.camX - halfViewW)) * ctx.camZoom;
}

/** Мировая координата Y -> координата симуляции physarum */
export function toSimY(ctx: Ctx, wy: number): number {
  const halfViewH = (SIM_HEIGHT / 2) / ctx.camZoom;
  return (wy - (ctx.camY - halfViewH)) * ctx.camZoom;
}
