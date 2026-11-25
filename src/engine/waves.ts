import { getLocale } from '../i18n';

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

const ANNOUNCE_NAMES_RU: Record<EnemyTypeShort, string> = { grub: 'Личинки', runner: 'Бегуны', brute: 'Громилы' };
const ANNOUNCE_NAMES_EN: Record<EnemyTypeShort, string> = { grub: 'Grubs', runner: 'Runners', brute: 'Brutes' };

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
  { time: 660, event: { kind: 'void', duration: 10 } },
  { time: 690, event: { kind: 'berserker', speedMul: 2.1, duration: 18 } },
  { time: 740, event: { kind: 'swarm', type: 'brute', count: 14 } },
  { time: 790, event: { kind: 'migration', dir: 'right', duration: 14 } },
  { time: 840, event: { kind: 'feast', orbCount: 60 } },
  { time: 870, event: { kind: 'ambush' } },
  { time: 920, event: { kind: 'swarm', type: 'runner', count: 45 } },
  { time: 970, event: { kind: 'void', duration: 10 } },
  { time: 1000, event: { kind: 'berserker', speedMul: 2.25, duration: 20 } },
  { time: 1060, event: { kind: 'migration', dir: 'left', duration: 15 } },
  { time: 1120, event: { kind: 'swarm', type: 'brute', count: 18 } },
  { time: 1170, event: { kind: 'feast', orbCount: 70 } },
  { time: 1200, event: { kind: 'ambush' } },
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
        const msg = getLocale() === 'en' ? 'SWARM BREACH' : 'ПРОРЫВ РОЯ';
        this.hooks.announce(`<span class="wave-event-banner bio-orange"><svg viewBox="0 0 32 32"><use href="#ico-damage-nova"/></svg> ${msg}</span>`);
        for (let k = 0; k < 12; k++) this.queue.push({ type: 'grub', side: null });
      }
      if (this.active.left <= 0) this.active = null;
    }
  }

  private fire(event: WaveEvent): void {
    const p = this.hooks.playerPos();
    const en = getLocale() === 'en';
    switch (event.kind) {
      case 'swarm': {
        const names = en ? ANNOUNCE_NAMES_EN : ANNOUNCE_NAMES_RU;
        const prefix = en ? 'WAVE' : 'ВОЛНА';
        this.hooks.announce(`<span class="wave-event-banner bio-cyan"><svg viewBox="0 0 32 32"><use href="#ico-wave-tide"/></svg> ${prefix}: ${names[event.type]} x${event.count}</span>`);
        for (let k = 0; k < event.count; k++) {
          this.queue.push({ type: event.type, side: this.active?.side ?? null });
        }
        break;
      }
      case 'ambush': {
        const txt = en ? 'AMBUSH FROM ALL SIDES' : 'ЗАСАДА СО ВСЕХ СТОРОН';
        this.hooks.announce(`<span class="wave-event-banner bio-magenta"><svg viewBox="0 0 32 32"><use href="#ico-ambush"/></svg> ${txt}</span>`);
        this.hooks.ringAround('runner', 14, p.x, p.y, 230);
        break;
      }
      case 'void': {
        const txt = en ? 'STILLNESS: spawning halted' : 'ЗАТИШЬЕ: спавн остановлен';
        this.hooks.announce(`<span class="wave-event-banner bio-violet"><svg viewBox="0 0 32 32"><use href="#ico-pause"/></svg> ${txt}</span>`);
        this.active = { kind: 'void', speedMul: 1, side: null, left: event.duration, burstPending: true };
        break;
      }
      case 'berserker': {
        const txt = en ? 'SWARM FRENZY: foes accelerated' : 'ЯРОСТЬ РОЯ: ускорение врагов';
        this.hooks.announce(`<span class="wave-event-banner bio-crimson"><svg viewBox="0 0 32 32"><use href="#ico-fury"/></svg> ${txt}</span>`);
        this.active = { kind: 'berserker', speedMul: event.speedMul, side: null, left: event.duration, burstPending: false };
        break;
      }
      case 'feast': {
        const txt = en ? 'FEAST: DNA orb eruption' : 'ПИР: выброс сфер ДНК';
        this.hooks.announce(`<span class="wave-event-banner bio-lime"><svg viewBox="0 0 32 32"><use href="#ico-feast"/></svg> ${txt}</span>`);
        for (let k = 0; k < event.orbCount; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * 200;
          this.hooks.dropOrb(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2 + Math.floor(Math.random() * 3));
        }
        break;
      }
      case 'migration': {
        const dirTxt = en ? (event.dir === 'right' ? 'from right' : 'from left') : (event.dir === 'right' ? 'справа' : 'слева');
        const prefix = en ? 'SWARM MIGRATION' : 'МИГРАЦИЯ РОЯ';
        this.hooks.announce(`<span class="wave-event-banner bio-amber"><svg viewBox="0 0 24 48"><use href="#ico-scale-bracket"/></svg> ${prefix}: ${dirTxt}</span>`);
        this.active = { kind: 'migration', speedMul: 1, side: event.dir === 'right' ? 1 : 3, left: event.duration, burstPending: false };
        break;
      }
    }
  }

  /** Основной спавн врагов остановлен во время «тишины» */
  canSpawn(): boolean {
    return this.active?.kind !== 'void';
  }

  /** Активно ли событие затишья «тишина» (хвост не тает от голода) */
  isVoidActive(): boolean {
    return this.active?.kind === 'void';
  }

  speedMul(): number {
    return this.active?.kind === 'berserker' ? this.active.speedMul : 1;
  }

  /** Сторона добавления врагов 0..3 или null (миграция: право=1, лево=3) */
  spawnSide(): number | null {
    return this.active?.kind === 'migration' ? this.active.side : null;
  }
}
