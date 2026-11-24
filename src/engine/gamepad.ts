// Поддержка Gamepad API для LUMIVORE: THE LIVING FRACTAL
// Twin-stick управление: левый стик = перемещение, правый = прицеливание, кнопки A/RT = рывок, B/LT = зов, Start = пауза.

export interface GamepadState {
  connected: boolean;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  dashPressed: boolean;
  callPressed: boolean;
  pausePressed: boolean;
  navLeft: boolean;
  navRight: boolean;
  navUp: boolean;
  navDown: boolean;
  confirmPressed: boolean;
  cancelPressed: boolean;
}

export class GamepadController {
  private prevDash = false;
  private prevCall = false;
  private prevPause = false;
  private prevNavL = false;
  private prevNavR = false;
  private prevNavU = false;
  private prevNavD = false;
  private prevConfirm = false;
  private prevCancel = false;

  poll(): GamepadState {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i]!.connected) {
        gp = gamepads[i];
        break;
      }
    }
    if (!gp || !gp.connected) {
      return {
        connected: false,
        moveX: 0,
        moveY: 0,
        aimX: 0,
        aimY: 0,
        dashPressed: false,
        callPressed: false,
        pausePressed: false,
        navLeft: false,
        navRight: false,
        navUp: false,
        navDown: false,
        confirmPressed: false,
        cancelPressed: false,
      };
    }

    const deadzone = (val: number, th = 0.16): number => (Math.abs(val) > th ? val : 0);

    // Левый стик (оси 0 и 1)
    let mx = deadzone(gp.axes[0] ?? 0);
    let my = deadzone(gp.axes[1] ?? 0);

    // D-Pad кнопки (12=up, 13=down, 14=left, 15=right)
    if (gp.buttons[14]?.pressed) mx = -1;
    if (gp.buttons[15]?.pressed) mx = 1;
    if (gp.buttons[12]?.pressed) my = -1;
    if (gp.buttons[13]?.pressed) my = 1;

    // Нормализация вектора перемещения
    const mLen = Math.hypot(mx, my);
    if (mLen > 1) {
      mx /= mLen;
      my /= mLen;
    }

    // Правый стик (оси 2 и 3)
    const ax = deadzone(gp.axes[2] ?? 0);
    const ay = deadzone(gp.axes[3] ?? 0);

    // Кнопки действий: A (0) или RT (7) = рывок, B (1) или LT (6) = зов, Start (9) = пауза
    const rawDash = !!(gp.buttons[0]?.pressed || gp.buttons[7]?.pressed || gp.buttons[5]?.pressed);
    const rawCall = !!(gp.buttons[1]?.pressed || gp.buttons[6]?.pressed || gp.buttons[2]?.pressed || gp.buttons[4]?.pressed);
    const rawPause = !!(gp.buttons[9]?.pressed || gp.buttons[8]?.pressed);

    const dashPressed = rawDash && !this.prevDash;
    const callPressed = rawCall && !this.prevCall;
    const pausePressed = rawPause && !this.prevPause;

    const rawNavL = !!(gp.buttons[14]?.pressed || (gp.axes[0] ?? 0) < -0.55);
    const rawNavR = !!(gp.buttons[15]?.pressed || (gp.axes[0] ?? 0) > 0.55);
    const rawNavU = !!(gp.buttons[12]?.pressed || (gp.axes[1] ?? 0) < -0.55);
    const rawNavD = !!(gp.buttons[13]?.pressed || (gp.axes[1] ?? 0) > 0.55);
    const rawConfirm = !!(gp.buttons[0]?.pressed);
    const rawCancel = !!(gp.buttons[1]?.pressed);

    const navLeft = rawNavL && !this.prevNavL;
    const navRight = rawNavR && !this.prevNavR;
    const navUp = rawNavU && !this.prevNavU;
    const navDown = rawNavD && !this.prevNavD;
    const confirmPressed = rawConfirm && !this.prevConfirm;
    const cancelPressed = rawCancel && !this.prevCancel;

    this.prevDash = rawDash;
    this.prevCall = rawCall;
    this.prevPause = rawPause;
    this.prevNavL = rawNavL;
    this.prevNavR = rawNavR;
    this.prevNavU = rawNavU;
    this.prevNavD = rawNavD;
    this.prevConfirm = rawConfirm;
    this.prevCancel = rawCancel;

    return {
      connected: true,
      moveX: mx,
      moveY: my,
      aimX: ax,
      aimY: ay,
      dashPressed,
      callPressed,
      pausePressed,
      navLeft,
      navRight,
      navUp,
      navDown,
      confirmPressed,
      cancelPressed,
    };
  }

  /** Тактильная вибрация геймпада (Haptic rumble) */
  vibrate(durationMs = 120, strongMagnitude = 0.5, weakMagnitude = 0.25): void {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp?.vibrationActuator) {
        try {
          void (gp.vibrationActuator as { playEffect?: (type: string, opts: object) => Promise<unknown> }).playEffect?.(
            'dual-rumble',
            {
              startDelay: 0,
              duration: durationMs,
              strongMagnitude,
              weakMagnitude,
            }
          );
        } catch {}
      }
    }
  }
}
