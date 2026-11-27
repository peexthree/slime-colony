// Контроллер камеры LUMIVORE: позиция и зум мира, тряска экрана, базовый масштаб.
// Работает с корневым world-контейнером (масштаб/смещение) и stage (тряска).
import { Container } from 'pixi.js';
import { SIM_HEIGHT, SIM_WIDTH } from '../engine/types';
import { CamView, ScreenProvider } from './views';

export class CameraController {
  private shakeT = 0;

  constructor(
    /** Корневой мировой контейнер: к нему применяются масштаб и позиция */
    private readonly world: Container,
    /** Сцена приложения: к ней применяется тряска */
    private readonly stage: Container,
    /** Размеры видового окна (Application.screen) */
    private readonly screen: ScreenProvider,
  ) {}

  /** Базовый масштаб видового окна (покрытие экрана с сохранением пропорций) */
  get baseScale(): number {
    return Math.max(this.screen.width / SIM_WIDTH, this.screen.height / SIM_HEIGHT);
  }

  /**
   * Применить камеру слежения к world-контейнеру.
   * Возвращает базовый масштаб s для модулей, рисующих в мировых координатах.
   */
  applyTransform(cam: CamView | null): number {
    const s = this.baseScale;
    const k = (cam ? cam.zoom : 1.0) * s;
    if (cam) {
      this.world.scale.set(k);
      this.world.position.set(
        this.screen.width / 2 - cam.x * k,
        this.screen.height / 2 - cam.y * k,
      );
    } else {
      this.world.scale.set(s);
      this.world.position.set(0, 0);
    }
    return s;
  }

  /** Заявить тряску экрана (урон, нова): длительности суммируются по максимуму */
  beginShake(duration: number): void {
    this.shakeT = Math.max(this.shakeT, duration);
  }

  /** Тряска экрана: случайное смещение сцены с мягким затуханием (без укачивания) */
  applyShake(dt: number): void {
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const intensity = Math.min(8, this.shakeT * 12);
      this.stage.position.set((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    } else {
      this.stage.position.set(0, 0);
    }
  }

  /** Сброс камеры при рестарте забега */
  reset(): void {
    this.shakeT = 0;
    this.world.position.set(0, 0);
    this.world.scale.set(1);
  }
}
