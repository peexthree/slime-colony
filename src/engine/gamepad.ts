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
}

export class GamepadController {
  private prevDash = false;
  private prevCall = false;
  private prevPause = false;

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

    this.prevDash = rawDash;
    this.prevCall = rawCall;
    this.prevPause = rawPause;

    return {
      connected: true,
      moveX: mx,
      moveY: my,
      aimX: ax,
      aimY: ay,
      dashPressed,
      callPressed,
      pausePressed,
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
