// Синтезированный звук на Web Audio API - без ассетов, всё генерируется на лету.
// Один контекст, мастер-гейн, гейт от спама одинаковых звуков.
export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private lastPlay = new Map<string, number>();
  muted = false;

  /** Вызвать на первом пользовательском жесте (клик по кнопке старта) */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5 * this.sfxVol;
    this.master.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.35 * this.bgmVol;
    this.bgmGain.connect(this.master);

    // Буфер белого шума для перкуссии
    const len = Math.floor(this.ctx.sampleRate * 0.4);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    // Автоматическая пауза/возобновление при скрытии вкладки
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        if (this.ctx.state === 'running') void this.ctx.suspend();
      } else {
        if (this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume();
      }
    });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.value = this.muted ? 0 : 0.4;
    return this.muted;
  }

  /** Одинаковые звуки не спамят чаще, чем раз в N мс */
  private gate(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay.get(key) ?? 0) < ms) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  private env(g: GainNode, t0: number, attack: number, peak: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, delay = 0): void {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    this.env(g, t0, 0.006, peak, dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.08);
  }

  private burst(dur: number, peak: number, freq: number, q = 0.8, delay = 0): void {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t0, 0.004, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.08);
  }

  // ---------- игровые события ----------
  shoot(): void {
    if (!this.gate('shoot', 50)) return;
    this.tone('sawtooth', 880, 260, 0.06, 0.045);
  }

  hit(): void {
    if (!this.gate('hit', 60)) return;
    this.burst(0.05, 0.1, 1500, 0.7);
  }

  kill(): void {
    if (!this.gate('kill', 70)) return;
    this.tone('triangle', 300, 90, 0.14, 0.1);
    this.burst(0.08, 0.07, 500, 0.9);
  }

  biolabUnlock(): void {
    if (!this.gate('biolab', 80)) return;
    this.tone('sine', 420, 680, 0.16, 0.08);
    this.tone('triangle', 680, 960, 0.18, 0.06, 0.06);
  }

  codexOpen(): void {
    if (!this.gate('codex', 80)) return;
    this.tone('sine', 340, 520, 0.1, 0.05);
  }

  upgradeSelect(): void {
    if (!this.gate('up_sel', 80)) return;
    this.tone('triangle', 480, 820, 0.14, 0.07);
  }

  upgradeHover(): void {
    if (!this.gate('up_hov', 40)) return;
    this.tone('sine', 620, 660, 0.035, 0.025);
  }

  eat(): void {
    if (!this.gate('eat', 45)) return;
    this.tone('sine', 520, 940, 0.07, 0.09);
  }

  hurt(): void {
    this.burst(0.18, 0.2, 300, 0.6);
    this.tone('sawtooth', 160, 60, 0.22, 0.12);
  }

  nova(): void {
    this.tone('sine', 70, 34, 0.55, 0.34);
    this.tone('triangle', 230, 115, 0.35, 0.14);
    this.burst(0.3, 0.14, 220, 0.5);
  }

  levelUp(): void {
    // Восходящий аккорд C-E-G
    this.tone('triangle', 523, 523, 0.16, 0.1, 0);
    this.tone('triangle', 659, 659, 0.16, 0.1, 0.09);
    this.tone('triangle', 784, 784, 0.22, 0.12, 0.18);
  }

  capture(win: boolean): void {
    if (win) {
      this.tone('sine', 392, 392, 0.18, 0.11, 0);
      this.tone('sine', 587, 587, 0.24, 0.11, 0.1);
    } else {
      this.tone('sawtooth', 320, 140, 0.28, 0.1);
    }
  }

  /** Феромон-зов: пугающий нисходящий свип */
  call(): void {
    this.tone('sawtooth', 620, 120, 0.45, 0.13);
    this.burst(0.25, 0.08, 800, 0.4);
  }

  boss(): void {
    this.tone('sawtooth', 110, 82, 0.7, 0.16);
    this.tone('sawtooth', 55, 41, 0.9, 0.18, 0.12);
  }

  /** Упругий био-отскок от мембраны чашки Петри */
  membraneBounce(): void {
    if (!this.gate('membrane', 90)) return;
    this.tone('sine', 160, 50, 0.12, 0.08);
    this.burst(0.06, 0.05, 380, 0.8);
  }

  /** Повышение уровня Симбиотического Резонанса */
  resTierUp(mult: number): void {
    if (!this.gate('resUp', 180)) return;
    const base = 440 + (mult - 1) * 190;
    this.tone('triangle', base, base * 1.25, 0.14, 0.09, 0);
    this.tone('sine', base * 1.5, base * 1.5, 0.18, 0.08, 0.07);
  }

  /** Сброс комбо Резонанса */
  resDrop(): void {
    if (!this.gate('resDrop', 250)) return;
    this.tone('sine', 240, 110, 0.16, 0.07);
  }

  /** Предупреждение о биологической аномалии в чашке Петри */
  anomalyAlert(): void {
    if (!this.gate('anomaly', 500)) return;
    this.tone('sine', 640, 480, 0.22, 0.09, 0);
    this.tone('sine', 480, 640, 0.25, 0.09, 0.16);
  }

  /** Низкий пульс при критическом хвосте: включается/выключается состоянием */
  setTailDrone(on: boolean): void {
    if (!this.ctx) return;
    if (on && !this.droneOsc) {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 48;
      g.gain.value = 0.0001;
      lfo.frequency.value = 2.4;
      lfoG.gain.value = 0.045;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.075, t + 0.5);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      lfo.start(t);
      this.droneOsc = o;
      this.droneGain = g;
      this.droneLfo = lfo;
    } else if (!on && this.droneOsc && this.droneGain) {
      const t = this.ctx.currentTime;
      this.droneGain.gain.cancelScheduledValues(t);
      this.droneGain.gain.setValueAtTime(Math.max(0.0001, this.droneGain.gain.value), t);
      this.droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      this.droneOsc.stop(t + 0.4);
      if (this.droneLfo) this.droneLfo.stop(t + 0.4);
      this.droneOsc = null;
      this.droneGain = null;
      this.droneLfo = null;
    }
  }

  /** Металлический щелчок схлопывания кольца смерти */
  ring(): void {
    if (!this.gate('ring', 200)) return;
    this.tone('triangle', 700, 140, 0.12, 0.16);
    this.burst(0.12, 0.12, 2400, 1.2);
  }

  /** Вакуумный бас зумаута - глубокий и длинный */
  metamorph(): void {
    if (!this.gate('metamorph', 4000)) return;
    this.tone('sine', 130, 26, 2.6, 0.4);
    this.tone('sine', 60, 24, 2.2, 0.28, 0.5);
    this.burst(1.8, 0.09, 120, 0.4);
  }

  /** Загадочный восходящий аккорд гибридизации */
  hybrid(): void {
    this.tone('sine', 392, 392, 0.5, 0.12, 0);
    this.tone('sine', 494, 494, 0.5, 0.12, 0.15);
    this.tone('sine', 587, 587, 0.5, 0.12, 0.3);
    this.tone('sine', 784, 784, 0.5, 0.12, 0.45);
  }

  /** Короткий электрический тик дуги */
  zap(): void {
    if (!this.gate('zap', 40)) return;
    this.tone('sawtooth', 1200, 300, 0.05, 0.07);
  }

  /** Выстрел лазера узла */
  laser(): void {
    if (!this.gate('laser', 120)) return;
    this.tone('sawtooth', 900, 180, 0.12, 0.1);
  }

  /** Финальное разрешение */
  victory(): void {
    this.tone('triangle', 523, 523, 1.2, 0.13, 0);
    this.tone('triangle', 659, 659, 1.2, 0.13, 0.12);
    this.tone('triangle', 784, 784, 1.2, 0.13, 0.24);
    this.tone('triangle', 1047, 1047, 1.2, 0.13, 0.5);
    this.burst(0.8, 0.05, 3000, 0.5);
  }

  /** Фазовый рывок */
  dash(): void {
    if (!this.gate('dash', 100)) return;
    this.tone('sine', 480, 160, 0.22, 0.12);
    this.burst(0.18, 0.14, 2200, 0.6);
  }

  /** Удар жвалами */
  mandible(): void {
    if (!this.gate('mandible', 80)) return;
    this.tone('sawtooth', 240, 60, 0.09, 0.16);
    this.burst(0.08, 0.12, 1100, 0.8);
  }

  /** Взрыв/сброс цисты */
  cyst(): void {
    if (!this.gate('cyst', 70)) return;
    this.tone('sine', 160, 440, 0.08, 0.14);
    this.burst(0.12, 0.15, 600, 0.9);
  }

  // ---------- Процедурный био-саундтрек (Adaptive BGM) ----------
  private bgmGain: GainNode | null = null;
  private bgmActive = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmScaleId = 1;
  private bgmBoss = false;
  private nextNoteTime = 0;
  private bgmVol = 0.6;
  private sfxVol = 0.8;

  setBgmVolume(ratio: number): void {
    this.bgmVol = Math.max(0, Math.min(1, ratio));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(0.35 * this.bgmVol, this.ctx.currentTime);
    }
  }

  setSfxVolume(ratio: number): void {
    this.sfxVol = Math.max(0, Math.min(1, ratio));
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setValueAtTime(0.5 * this.sfxVol, this.ctx.currentTime);
    }
  }

  startBgm(): void {
    if (!this.ctx || this.bgmActive) return;
    this.bgmActive = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduleBgmLoop();
  }

  stopBgm(): void {
    this.bgmActive = false;
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setBgmIntensity(scaleId: number, isBoss: boolean): void {
    this.bgmScaleId = scaleId;
    this.bgmBoss = isBoss;
  }

  private scheduleBgmLoop(): void {
    if (!this.bgmActive || !this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.nextNoteTime < now + 0.25) {
      this.playBgmStep(this.nextNoteTime);
      const bpm = this.bgmBoss ? 135 : 95 + (this.bgmScaleId - 1) * 8;
      const stepDuration = 60 / (bpm * 4); // 16-я нота
      this.nextNoteTime += stepDuration;
      this.bgmStep = (this.bgmStep + 1) % 32;
    }
    this.bgmTimer = window.setTimeout(() => this.scheduleBgmLoop(), 40);
  }

  private playBgmStep(t: number): void {
    if (!this.ctx || !this.bgmGain || this.muted) return;
    const roots = [55, 55, 65.4, 73.4, 49, 55, 65.4, 82.4];
    const root = roots[Math.floor(this.bgmStep / 4) % roots.length];

    // Бас каждые 4 шага (четверть)
    if (this.bgmStep % 4 === 0) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = this.bgmBoss ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(root, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(this.bgmBoss ? 0.08 : 0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g);
      g.connect(this.bgmGain);
      o.start(t);
      o.stop(t + 0.4);
    }

    // Арпеджиатор на 16-х
    const arpIntervals = [0, 3, 7, 10, 12, 10, 7, 3];
    const arpFreq = root * 2 * Math.pow(2, arpIntervals[this.bgmStep % arpIntervals.length] / 12);
    if (this.bgmScaleId > 1 || this.bgmBoss || this.bgmStep % 2 === 0) {
      const o = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(arpFreq, t);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(this.bgmBoss ? 2200 : 600 + this.bgmScaleId * 250, t);
      f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(this.bgmBoss ? 0.03 : 0.02, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(f);
      f.connect(g);
      g.connect(this.bgmGain);
      o.start(t);
      o.stop(t + 0.14);
    }
  }
}
