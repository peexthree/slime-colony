// Режиссёр событий волн: не просто «плотнее», а сценарные моменты (Этап 4.2)
export type EnemyTypeShort = 'grub' | 'runner' | 'brute';

export type WaveEvent =
  | { kind: 'swarm'; type: EnemyTypeShort; count: number }
  | { kind: 'ambush' }
  | { kind: 'void'; duration: number }
  | { kind: 'berserker'; speedMul: number; duration: number }
  | { kind: 'feast'; orbCount: number }
  | { kind: 'migration'; dir: 'left' | 'right'; duration: number };

export interface WaveHooks {
  /** Поставить врага на поле; side: 0=верх 1=право 2=низ 3=лево, undefined = случайно */
  addEnemy(type: EnemyTypeShort, side?: number): void;
  /** Кольцо врагов вокруг точки (засада) */
  ringAround(type: EnemyTypeShort, count: number, cx: number, cy: number, radius: number): void;
  /** Бросить душу опыта на поле */
  dropOrb(x: number, y: number, value: number): void;
  announce(text: string): void;
  playerPos(): { x: number; y: number };
}

interface ActiveEffect {
  kind: 'void' | 'berserker' | 'migration';
  speedMul: number;
  side: number | null;
  left: number;
  burstPending: boolean;
}

const ANNOUNCE_NAMES: Record<EnemyTypeShort, string> = { grub: 'Личинки', runner: 'Бегуны', brute: 'Громилы' };

/** Расписание сценарных событий: срабатывают однократно по времени забега */
export const WAVE_EVENTS: { time: number; event: WaveEvent }[] = [
  { time: 60,  event: { kind: 'swarm', type: 'runner', count: 25 } },
  { time: 100, event: { kind: 'feast', orbCount: 30 } },
  { time: 130, event: { kind: 'ambush' } },
  { time: 180, event: { kind: 'void', duration: 10 } },
  { time: 210, event: { kind: 'berserker', speedMul: 1.8, duration: 15 } },
  { time: 260, event: { kind: 'migration', dir: 'right', duration: 12 } },
  { time: 300, event: { kind: 'swarm', type: 'brute', count: 8 } },
  { time: 330, event: { kind: 'feast', orbCount: 40 } },
  { time: 372, event: { kind: 'ambush' } },
  { time: 420, event: { kind: 'void', duration: 12 } },
  { time: 452, event: { kind: 'berserker', speedMul: 2.0, duration: 18 } },
  { time: 500, event: { kind: 'migration', dir: 'left', duration: 12 } },
  { time: 555, event: { kind: 'swarm', type: 'runner', count: 35 } },
  { time: 600, event: { kind: 'feast', orbCount: 50 } },
  { time: 612, event: { kind: 'ambush' } },
];

export class WaveDirector {
  private hooks: WaveHooks;
  private fired = new Set<number>();
  private queue: { type: EnemyTypeShort; side: number | null }[] = [];
  private queueT = 0;
  private active: ActiveEffect | null = null;

  constructor(hooks: WaveHooks) {
    this.hooks = hooks;
  }

  reset(): void {
    this.fired.clear();
    this.queue.length = 0;
    this.queueT = 0;
    this.active = null;
  }

  update(dt: number, gameTime: number): void {
    // Расписание: события срабатывают однократно
    for (let i = 0; i < WAVE_EVENTS.length; i++) {
      const ev = WAVE_EVENTS[i];
      if (gameTime >= ev.time && !this.fired.has(i)) {
        this.fired.add(i);
        this.fire(ev.event);
      }
    }
    // Очередь постепенного добавления: swarm не вываливается мгновенно
    this.queueT -= dt;
    while (this.queue.length > 0 && this.queueT <= 0) {
      const q = this.queue.shift()!;
      this.queueT = 0.08;
      this.hooks.addEnemy(q.type, q.side === null ? undefined : q.side);
    }
    // Активные эффекты
    if (this.active) {
      this.active.left -= dt;
      if (this.active.kind === 'void' && this.active.left <= 0 && this.active.burstPending) {
        this.active.burstPending = false;
        this.hooks.announce('<span class="wave-event-banner bio-orange"><svg viewBox="0 0 32 32"><use href="#ico-damage-nova"/></svg> ОНИ ВЕРНУЛИСЬ</span>');
        for (let k = 0; k < 12; k++) this.queue.push({ type: 'grub', side: null });
      }
      if (this.active.left <= 0) this.active = null;
    }
  }

  private fire(event: WaveEvent): void {
    const p = this.hooks.playerPos();
    switch (event.kind) {
      case 'swarm': {
        this.hooks.announce('<span class="wave-event-banner bio-cyan"><svg viewBox="0 0 32 32"><use href="#ico-wave-tide"/></svg> ВОЛНА: ' + ANNOUNCE_NAMES[event.type] + ' x' + event.count + '</span>');
        for (let k = 0; k < event.count; k++) {
          this.queue.push({ type: event.type, side: this.active?.side ?? null });
        }
        break;
      }
      case 'ambush': {
        this.hooks.announce('<span class="wave-event-banner bio-magenta"><svg viewBox="0 0 32 32"><use href="#ico-ambush"/></svg> ЗАСАДА СО ВСЕХ СТОРОН</span>');
        this.hooks.ringAround('runner', 14, p.x, p.y, 230);
        break;
      }
      case 'void': {
        this.hooks.announce('<span class="wave-event-banner bio-violet"><svg viewBox="0 0 32 32"><use href="#ico-pause"/></svg> ТИШИНА...</span>');
        this.active = { kind: 'void', speedMul: 1, side: null, left: event.duration, burstPending: true };
        break;
      }
      case 'berserker': {
        this.hooks.announce('<span class="wave-event-banner bio-crimson"><svg viewBox="0 0 32 32"><use href="#ico-fury"/></svg> ЯРОСТЬ РОЯ x' + event.speedMul + '</span>');
        this.active = { kind: 'berserker', speedMul: event.speedMul, side: null, left: event.duration, burstPending: false };
        break;
      }
      case 'feast': {
        this.hooks.announce('<span class="wave-event-banner bio-lime"><svg viewBox="0 0 32 32"><use href="#ico-feast"/></svg> ПИР: души без врагов</span>');
        for (let k = 0; k < event.orbCount; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * 200;
          this.hooks.dropOrb(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2 + Math.floor(Math.random() * 3));
        }
        break;
      }
      case 'migration': {
        this.hooks.announce('<span class="wave-event-banner bio-amber"><svg viewBox="0 0 24 48"><use href="#ico-scale-bracket"/></svg> МИГРАЦИЯ: ' + (event.dir === 'right' ? 'справа' : 'слева') + '</span>');
        this.active = { kind: 'migration', speedMul: 1, side: event.dir === 'right' ? 1 : 3, left: event.duration, burstPending: false };
        break;
      }
    }
  }

  /** Основной спавн врагов остановлен во время «тишины» */
  canSpawn(): boolean {
    return this.active?.kind !== 'void';
  }

  speedMul(): number {
    return this.active?.kind === 'berserker' ? this.active.speedMul : 1;
  }

  /** Сторона добавления врагов 0..3 или null (миграция: право=1, лево=3) */
  spawnSide(): number | null {
    return this.active?.kind === 'migration' ? this.active.side : null;
  }
}
