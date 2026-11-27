// Рендер врагов LUMIVORE: спрайтовый пул с типовыми анимациями дыхания/ползания,
// хвостики, элитные оверлеи мутаций, вспышки урона, телеграфы атак и фазы титанов.
import { Container, Graphics, Texture } from 'pixi.js';
import { alignTailSegment } from '../engine/svgAssets';
import { EnemyView, RenderState, RenderTextures } from './views';
import { SpritePoolRegistry } from './SpritePool';

const ENEMY_COLORS: Record<EnemyView['type'], number> = {
  grub: 0x39ff14,     // Токсичный зелёный (Biopunk Toxic Green)
  runner: 0x66fcf1,   // Биолюминесцентный циан (Bioluminescent Cyan)
  spitter: 0xffb800,  // Янтарно-кислотный оранжевый (Acid Orange)
  brute: 0xff3b4e,    // Кроваво-малиновый панцирь (Blood Crimson)
  pulsar: 0xb55cff,   // Электрический фиолетовый (Electric Violet)
  boss: 0xff2a85,     // Горячая неоновая маджента (Titan Magenta)
  splitter: 0xd946ef, // Митоз-маджента (Митозный расщепитель v2)
  healer: 0x00ff9d,   // Изумрудный симбиот-целитель (Healer v2)
  mirror: 0x7df9ff,   // Призматический кристалл (Mirror Shield v2)
  colony: 0xff8800,   // Янтарное био-гнездо (Colony Hive v2)
  brood: 0xffaa00,    // Роевой паразит (Brood Swarm v2)
};

/** Яркое ядро врага: контраст к мягкому ореолу фона */
const ENEMY_CORES: Record<EnemyView['type'], number> = {
  grub: 0xbbfabb,
  runner: 0xc5ffff,
  spitter: 0xffe49e,
  brute: 0xffa8b4,
  pulsar: 0xe2bfff,
  boss: 0xffa3d5,
  splitter: 0xf8c8ff,
  healer: 0xd0ffe0,
  mirror: 0xdffaff,
  colony: 0xffd59e,
  brood: 0xffe4b5,
};

const ENEMY_HP_ARC_COLOR = 0xff5c8a;

export class EnemyRenderer {
  constructor(
    private readonly entityLayer: Container,
    private readonly morphOverLayer: Container,
    private readonly fxOver: Graphics,
    private readonly registry: SpritePoolRegistry,
    private readonly tex: RenderTextures,
  ) {}

  /** Текстура врага по типу (титан и босс используют спрайт титана) */
  private enemyTexture(e: EnemyView): Texture | undefined {
    if (e.titan) return this.tex.enemies?.titan;
    switch (e.type) {
      case 'grub': return this.tex.enemies?.grub;
      case 'runner': return this.tex.enemies?.runner;
      case 'spitter': return this.tex.enemies?.spitter;
      case 'brute': return this.tex.enemies?.brute;
      case 'pulsar': return this.tex.enemies?.pulsar;
      case 'boss': return this.tex.enemies?.titan;
      case 'healer': return this.tex.enemies?.healer;
      case 'mirror': return this.tex.enemies?.mirror;
      case 'colony': return this.tex.enemies?.colony;
      case 'splitter': return this.tex.enemies?.splitter;
      case 'brood': return this.tex.enemies?.brood;
    }
  }

  /** Уникальный визуальный био-силуэт мутации элиты (fallback без SVG-текстур) */
  private drawEliteFallback(e: EnemyView, elite: NonNullable<EnemyView['elite']>, time: number): void {
    switch (elite) {
      case 'armored': {
        const plates = 4;
        const plateR = e.radius + 7;
        for (let k = 0; k < plates; k++) {
          const ang = time * 1.3 + (k * Math.PI * 2) / plates;
          this.fxOver.moveTo(e.x + Math.cos(ang - 0.42) * plateR, e.y + Math.sin(ang - 0.42) * plateR);
          this.fxOver.arc(e.x, e.y, plateR, ang - 0.42, ang + 0.42)
            .stroke({ width: 3.5, color: 0xf59e0b, alpha: 0.92 });
        }
        break;
      }
      case 'enraged': {
        const spikes = 6;
        const spikePulse = 1 + Math.sin(time * 12) * 0.28;
        for (let k = 0; k < spikes; k++) {
          const ang = time * 2.5 + (k * Math.PI * 2) / spikes;
          const inR = e.radius + 2;
          const outR = e.radius + 13 * spikePulse;
          this.fxOver.moveTo(e.x + Math.cos(ang) * inR, e.y + Math.sin(ang) * inR)
            .lineTo(e.x + Math.cos(ang) * outR, e.y + Math.sin(ang) * outR)
            .stroke({ width: 2.4, color: 0xff1744, alpha: 0.95 });
        }
        this.fxOver.circle(e.x, e.y, e.radius + 4)
          .stroke({ width: 1.5, color: 0xff3b5c, alpha: 0.65 });
        break;
      }
      case 'necromancer': {
        const necroR = e.radius + 9;
        this.fxOver.circle(e.x, e.y, necroR)
          .stroke({ width: 1.8, color: 0x10b981, alpha: 0.85 });
        for (let k = 0; k < 3; k++) {
          const ang = -time * 3.2 + (k * Math.PI * 2) / 3;
          const wx = e.x + Math.cos(ang) * (necroR + 4);
          const wy = e.y + Math.sin(ang) * (necroR + 4);
          this.fxOver.circle(wx, wy, 3.2).fill({ color: 0x86efac, alpha: 0.95 });
        }
        break;
      }
      case 'magnetic': {
        const vortexR = e.radius + 12;
        this.fxOver.circle(e.x, e.y, vortexR)
          .stroke({ width: 1.5, color: 0x38bdf8, alpha: 0.7 });
        for (let k = 0; k < 4; k++) {
          const phase = ((time * 2.2 + k * 0.25) % 1);
          const r = e.radius + 18 * (1 - phase);
          const ang = time * 4.5 + k * (Math.PI / 2) + phase * 2.2;
          this.fxOver.circle(e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r, 2.2)
            .fill({ color: 0x7dd3fc, alpha: 0.85 * phase });
        }
        break;
      }
      case 'mirrored': {
        const prismR = e.radius + 8;
        const prismPulse = 1 + Math.sin(time * 5.5) * 0.15;
        for (let k = 0; k < 3; k++) {
          const ang = time * 1.8 + (k * Math.PI * 2) / 3;
          const px = e.x + Math.cos(ang) * (prismR * prismPulse);
          const py = e.y + Math.sin(ang) * (prismR * prismPulse);
          this.fxOver.moveTo(px, py - 4.5).lineTo(px + 4, py + 3.5).lineTo(px - 4, py + 3.5).closePath()
            .stroke({ width: 1.6, color: 0xe0e7ff, alpha: 0.95 });
        }
        break;
      }
    }
  }

  /** Пул врагов: тела, ядра, хвостики, элиты, телеграфы и атаки */
  update(state: RenderState, time: number): void {
    this.registry.releasePool('enemy');
    this.registry.releasePool('enemyCore');
    this.registry.releasePool('etail');
    this.registry.releasePool('eliteHalo');
    this.registry.releasePool('eliteMutation');
    this.registry.releasePool('enemyShield');
    for (const e of state.enemies) {
      const isDead = e.hp <= 0;
      const spored = (e.sporeInf ?? 0) > 0;
      const baseTint = e.infected ? 0x66fcf1 : spored ? 0x86efac : ENEMY_COLORS[e.type];
      const coreTint = e.infected ? 0xdffffc : spored ? 0xd8ffd8 : ENEMY_CORES[e.type];

      // Органический отклик на урон: мягкая алая/янтарная вспышка вместо ослепляющего чисто-белого
      const hitFlash = e.flash > 0.04;
      const enemyTint = isDead ? 0xff3b5c : hitFlash ? 0xff7b93 : baseTint;
      const enemyCoreTint = isDead ? 0xffffff : hitFlash ? 0xffcad4 : coreTint;

      const tex = this.enemyTexture(e);
      const texW = (tex && tex.width) ? tex.width : 64;
      const baseScale = (e.radius * 2.3) / texW;
      let scaleX = baseScale;
      let scaleY = baseScale;

      if (e.type === 'grub' || e.type === 'runner' || e.type === 'brood') {
        // Гусеничный цикл растяжения-сжатия
        const crawl = Math.sin(time * 7 + (e.x + e.y) * 0.06);
        scaleX = baseScale * (1 + crawl * 0.16);
        scaleY = baseScale * (1 - crawl * 0.14);
      } else if (e.type === 'spitter' || e.type === 'mirror') {
        // Медузоподобное пульсирование колокола
        const bellPulse = Math.sin(time * 4.5 + e.x * 0.05);
        scaleX = baseScale * (1 - bellPulse * 0.12);
        scaleY = baseScale * (1 + bellPulse * 0.16);
      } else if (e.type === 'colony') {
        // Ритм сокращения матки
        const heart = 1 + Math.sin(time * 3) * 0.08 + Math.sin(time * 6) * 0.04;
        scaleX = baseScale * heart;
        scaleY = baseScale * heart;
      } else if (e.type === 'brute') {
        // Бронированный панцирник: тяжёлое дыхание
        const heavy = 1 + Math.sin(time * 2 + e.y * 0.05) * 0.05;
        scaleX = baseScale * heavy;
        scaleY = baseScale * heavy;
      } else if (e.type === 'boss' || e.titan) {
        // Колоссальный титан
        const bossBreath = 1 + Math.sin(time * 1.8) * 0.08;
        scaleX = baseScale * bossBreath;
        scaleY = baseScale * bossBreath;
      }

      if (hitFlash) {
        scaleX *= 1.14;
        scaleY *= 0.88;
      }

      const isCartoonSprite = Boolean(tex);
      const spTint = isCartoonSprite
        ? (isDead ? 0xff3b5c : hitFlash ? 0xff94a8 : e.infected > 0 ? 0x67e8f9 : spored ? 0x86efac : 0xffffff)
        : enemyTint;
      const sp = this.registry.makeSprite('enemy', spTint, 'normal', tex);
      sp.position.set(e.x, e.y);
      sp.scale.set(scaleX, scaleY);
      sp.alpha = 0.98;

      // Ориентация и вращение сущностей по вектору движения
      let rot = 0;
      if (e.type === 'grub' || e.type === 'runner' || e.type === 'brood' || e.type === 'mirror') {
        if (e.tail.length > 0) {
          const lastSeg = e.tail[e.tail.length - 1];
          const dx = e.x - lastSeg.x;
          const dy = e.y - lastSeg.y;
          if (Math.hypot(dx, dy) > 0.05) {
            rot = Math.atan2(dy, dx);
          }
        }
      } else if (e.type === 'healer') {
        rot = Math.sin(time * 3 + e.x * 0.05) * 0.18;
      } else if (e.type === 'colony') {
        rot = Math.sin(time * 0.7 + e.y * 0.05) * 0.1;
      } else if (e.type === 'splitter') {
        rot = Math.sin(time * 2 + e.x * 0.1) * 0.25;
      } else if (e.type === 'pulsar') {
        rot = time * 2.8;
      } else if (e.type === 'boss' || e.titan) {
        rot = Math.sin(time * 0.9) * (isCartoonSprite ? 0.09 : 0.15);
      }
      sp.rotation = rot;

      if (!isCartoonSprite) {
        const core = this.registry.makeSprite('enemyCore', enemyCoreTint, 'normal');
        core.position.set(e.x, e.y);
        core.scale.set((e.radius * 0.65) / 64);
        core.alpha = 0.85;
      }

      // Визуальный телеграф атак врагов (предупреждения перед ударом)
      if (state.player && e.infected <= 0 && !isDead) {
        const skillCd = e.skillCd ?? 99;
        if ((e.type === 'spitter' || e.type === 'mirror') && skillCd <= 0.45 && skillCd > 0) {
          const prog = 1 - skillCd / 0.45;
          const beamAlpha = 0.3 + prog * 0.55;
          this.fxOver.moveTo(e.x, e.y).lineTo(state.player.x, state.player.y)
            .stroke({ width: 1.5 + prog * 1.8, color: 0xff3b5c, alpha: beamAlpha });
          this.fxOver.circle(e.x, e.y, e.radius + 6 * prog)
            .stroke({ width: 2, color: 0xff3b5c, alpha: beamAlpha });
        } else if (e.type === 'pulsar' && skillCd <= 0.75 && skillCd > 0) {
          const prog = 1 - skillCd / 0.75;
          const warnRad = 130 * prog;
          this.fxOver.circle(e.x, e.y, warnRad)
            .stroke({ width: 2, color: 0xf97316, alpha: 0.35 + prog * 0.55 });
        } else if (e.type === 'boss' || e.titan) {
          const auraRad = e.radius * 1.35;
          const aStart = time * 2.2;
          this.fxOver.arc(e.x, e.y, auraRad, aStart, aStart + 1.2)
            .stroke({ width: 3, color: 0xff3b5c, alpha: 0.65 });
          this.fxOver.arc(e.x, e.y, auraRad, aStart + Math.PI, aStart + Math.PI + 1.2)
            .stroke({ width: 3, color: 0xff3b5c, alpha: 0.65 });
        }
      }

      // Хвостик врага: мультяшные сегменты (или fallback glowTex).
      // Отзыв плейтеста: яркие розовые капсулы читались как мусор на карте -
      // хвостик приглушён (альфа и размер снижены), механика отрыва в душу не тронута.
      const et = e.tail;
      const en = et.length;
      const tailSegTex = this.tex.v4?.enemyTailSegment;
      for (let i = 0; i < en; i++) {
        const frac = (en - 1 - i) / Math.max(1, en - 1);
        const nextPt = i + 1 < en ? et[i + 1] : e;
        if (tailSegTex) {
          const seg = this.registry.makeSprite('etail', isDead ? 0xff3b5c : 0xffffff, 'normal', tailSegTex);
          alignTailSegment(seg, et[i].x, et[i].y, nextPt.x, nextPt.y);
          seg.scale.set((e.radius * (0.62 - 0.36 * frac)) / 64);
          seg.alpha = 0.4 * (1 - frac * 0.6);
        } else {
          const seg = this.registry.makeSprite('etail', ENEMY_COLORS[e.type], 'normal');
          seg.position.set(et[i].x, et[i].y);
          seg.scale.set((e.radius * (0.6 - 0.4 * frac)) / 64);
          seg.alpha = 0.34 * (1 - frac) + 0.08;
        }
      }

      if (e.type === 'boss' || e.type === 'brute' || e.elite) {
        const progress = Math.max(0, e.hp / e.maxHp);
        const r = e.radius + 9;
        this.fxOver.circle(e.x, e.y, r)
          .stroke({ width: 4, color: 0x040a10, alpha: 0.7 });
        this.fxOver.moveTo(e.x + Math.cos(-Math.PI / 2) * r, e.y + Math.sin(-Math.PI / 2) * r);
        this.fxOver.arc(e.x, e.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
          .stroke({ width: 2.6, color: ENEMY_HP_ARC_COLOR, alpha: 0.94 });
      }

      if (e.elite) {
        // Базовый золотой нимб элиты
        if (this.tex.v3?.overlays.eliteCrownHalo) {
          const spHalo = this.registry.makeSprite('eliteHalo', 0xffffff, 'normal', this.tex.v3.overlays.eliteCrownHalo);
          spHalo.position.set(e.x, e.y);
          spHalo.scale.set(((e.radius + 14) * 2.3) / 256);
          spHalo.rotation = time * 1.4;
          spHalo.alpha = 0.92;
        } else {
          const haloR = e.radius + 6 + Math.sin(time * 5) * 1.5;
          this.fxOver.circle(e.x, e.y, haloR)
            .stroke({ width: 2, color: 0xffd166, alpha: 0.75 });
        }

        // Уникальный визуальный био-силуэт каждой мутации
        const eliteTex = this.tex.v4?.elites[e.elite];
        if (eliteTex) {
          const spMut = this.registry.makeSprite('eliteMutation', 0xffffff, 'normal', eliteTex, this.morphOverLayer);
          spMut.position.set(e.x, e.y);
          const pulseScale = e.elite === 'enraged' ? 1 + Math.sin(time * 10) * 0.08 : 1;
          spMut.scale.set(((e.radius + 14) * 2.35 * pulseScale) / 256);
          spMut.alpha = 0.92;
          switch (e.elite) {
            case 'armored':
              spMut.rotation = time * 0.9;
              break;
            case 'enraged':
              spMut.rotation = time * 1.6;
              break;
            case 'necromancer':
              spMut.rotation = -time * 0.8;
              break;
            case 'magnetic':
              spMut.rotation = -time * 2.2;
              break;
            case 'mirrored':
              spMut.rotation = time * 1.1;
              break;
          }
        } else {
          this.drawEliteFallback(e, e.elite, time);
        }
      }

      if (e.type === 'mirror' && this.tex.v3?.overlays.shieldBarrier) {
        const spShield = this.registry.makeSprite('enemyShield', 0xffffff, 'normal', this.tex.v3.overlays.shieldBarrier);
        spShield.position.set(e.x, e.y);
        spShield.scale.set(((e.radius + 8) * 2.4) / 256);
        spShield.rotation = -time * 0.8;
        spShield.alpha = 0.88;
      }

      if (e.titan || e.type === 'boss') {
        const tr = e.radius + 12 + Math.sin(time * 3.2) * 3;
        this.fxOver.circle(e.x, e.y, tr)
          .stroke({ width: 2.5, color: e.titan ? 0xffd700 : 0xffffff, alpha: 0.85 });
        this.fxOver.circle(e.x, e.y, tr + 7)
          .stroke({ width: 1.5, color: 0x9df5ff, alpha: 0.5 + Math.sin(time * 4.4) * 0.3 });

        // Фаза 2: Растрескивание панциря и пылающая аура ярости при HP < 40%
        if (e.hp < e.maxHp * 0.4) {
          const crackPulse = 0.8 + Math.sin(time * 10) * 0.2;
          for (let c = 0; c < 6; c++) {
            const baseA = c * 1.05 + 0.2;
            const r0 = e.radius * 0.22;
            const rMid = e.radius * 0.62;
            const rEnd = e.radius * 0.95;
            const midA = baseA + Math.sin(c * 2 + time * 2) * 0.22;
            this.fxOver.moveTo(e.x + Math.cos(baseA) * r0, e.y + Math.sin(baseA) * r0)
              .lineTo(e.x + Math.cos(midA) * rMid, e.y + Math.sin(midA) * rMid)
              .lineTo(e.x + Math.cos(baseA + 0.1) * rEnd, e.y + Math.sin(baseA + 0.1) * rEnd)
              .stroke({ width: 3.2, color: 0xff1744, alpha: 0.92 * crackPulse });
          }
          // Огненное кольцо ярости титана
          this.fxOver.circle(e.x, e.y, e.radius + 18 + Math.sin(time * 8) * 4)
            .stroke({ width: 2.6, color: 0xff3b5c, alpha: 0.85 });
        }
      }
    }
  }
}
