// Рендер игрока LUMIVORE: ядро клетки, хвост-дракон, органы геномов и гибридов,
// зрачок хищника, Живой Карапакс, телеграф Кольца Смерти и анимация гибели.
import { Container, Graphics, Sprite } from 'pixi.js';
import { alignTailSegment, updatePredatorPupil } from '../engine/svgAssets';
import { SCALES } from '../engine/types';
import { RenderState, RenderTextures } from './views';
import { SpritePoolRegistry } from './SpritePool';
import { HybridOverlays } from './HybridOverlays';

/** Цвета хвоста по состоянию ресурса: здоровый циан -> жёлтый -> красный */
const TAIL_PALETTES: Record<'ok' | 'low' | 'crit', [number, number]> = {
  ok: [0x66fcf1, 0x9df5ff],
  low: [0xffd166, 0xffe9a3],
  crit: [0xff6b6b, 0xffb0b0],
};

export class PlayerRenderer {
  private playerGlow!: Sprite;
  private playerCore!: Sprite;
  private predatorEyeContainer1 = new Container();
  private predatorEyeContainer2 = new Container();
  private predatorEyeSprite!: Sprite;
  private predatorPupilSprite!: Sprite;
  private predatorEyeSprite2!: Sprite;
  private predatorPupilSprite2!: Sprite;

  constructor(
    private readonly entityLayer: Container,
    private readonly floorLayer: Container,
    private readonly organLayer: Graphics,
    private readonly morphOverLayer: Container,
    private readonly fxUnder: Graphics,
    private readonly fxOver: Graphics,
    private readonly registry: SpritePoolRegistry,
    private readonly tex: RenderTextures,
    private readonly hybrids: HybridOverlays,
  ) {
    this.initSprites();
  }

  /** Постоянные спрайты игрока: порядок добавления задаёт z-порядок в entityLayer */
  private initSprites(): void {
    this.playerGlow = this.registry.makeSprite('player', 0x66fcf1, 'add');
    this.playerCore = this.registry.makeSprite('playerCore', 0xffffff, 'normal');
    this.entityLayer.addChild(this.predatorEyeContainer1, this.predatorEyeContainer2);
    this.predatorEyeSprite = new Sprite(this.tex.v3?.eye.predatorEye ?? this.tex.glow);
    this.predatorEyeSprite.anchor.set(0.5);
    this.predatorPupilSprite = new Sprite(this.tex.v3?.eye.predatorPupil ?? this.tex.glow);
    this.predatorPupilSprite.anchor.set(0.5);
    this.predatorEyeContainer1.addChild(this.predatorEyeSprite, this.predatorPupilSprite);
    this.predatorEyeSprite2 = new Sprite(this.tex.v3?.eye.predatorEye ?? this.tex.glow);
    this.predatorEyeSprite2.anchor.set(0.5);
    this.predatorPupilSprite2 = new Sprite(this.tex.v3?.eye.predatorPupil ?? this.tex.glow);
    this.predatorPupilSprite2.anchor.set(0.5);
    this.predatorEyeContainer2.addChild(this.predatorEyeSprite2, this.predatorPupilSprite2);
    this.predatorEyeContainer1.visible = false;
    this.predatorEyeContainer2.visible = false;
  }

  /** Хвост светляка: цепь сегментов от тела к кончику (Анатомия Wave 3) */
  updateTail(state: RenderState, time: number): void {
    this.registry.releasePool('ptail');
    this.registry.releasePool('ptail_vert');
    this.registry.releasePool('ptail_stinger');
    const tail = state.player.tail;
    const tn = tail.length;
    const deathP = state.playerDeath ? Math.max(0, Math.min(1, state.playerDeath.progress)) : 0;
    const isDying = Boolean(state.playerDeath);
    const [tc1, tc2] = TAIL_PALETTES[state.tailState];
    const critPulse = state.tailState === 'crit' ? 0.55 + Math.abs(Math.sin(time * 9)) * 0.45 : 1;
    const tipBlink = state.tailHunger && Math.sin(time * 12) > 0;
    // Прореживаем сегменты при огромной длине хвоста, чтобы не перегружать сцену и не сливать в сплошной коридор
    const step = tn > 70 ? Math.ceil(tn / 70) : 1;
    for (let i = 0; i < tn; i += step) {
      const frac = (tn - 1 - i) / Math.max(1, tn - 1);
      const segFade = isDying ? Math.max(0, 1 - Math.max(0, deathP * 1.4 - (1 - frac) * 0.4)) : 1;
      if (segFade <= 0.02) continue;
      const segR = state.player.r * (0.95 - 0.65 * frac) * (isDying ? (0.4 + 0.6 * segFade) : 1);
      let alpha = (0.78 * (1 - frac * 0.45) + 0.14) * critPulse * segFade;
      if (i === 0 && tipBlink) alpha *= 0.12;
      const tint = isDying ? 0xff3b5c : (i / step) % 2 === 0 ? tc1 : tc2;

      // Тангенс сочленения: вектор к голове
      const prevX = i < tn - 1 ? tail[i + 1].x : state.player.x;
      const prevY = i < tn - 1 ? tail[i + 1].y : state.player.y;
      const tdx = prevX - tail[i].x;
      const tdy = prevY - tail[i].y;
      const tLen = Math.hypot(tdx, tdy) || 1;
      const tnx = -tdy / tLen;
      const tny = tdx / tLen;

      // Синусоидальная био-волна плавания глубоководного угря (при смерти сегменты распадаются в стороны)
      const waveAmp = Math.sin((1 - frac) * Math.PI) * Math.min(7, state.player.r * 0.55);
      const scatter = isDying ? Math.sin(i * 2.1) * deathP * 26 : 0;
      const waveOffset = Math.sin(time * 7 - (tn - 1 - i) * 0.28) * waveAmp + scatter;
      const finalX = tail[i].x + tnx * waveOffset;
      const finalY = tail[i].y + tny * waveOffset;
      const alignPrevX = prevX + tnx * waveOffset * 0.8;
      const alignPrevY = prevY + tny * waveOffset * 0.8;

      // Тонкие боковые плавники угря вдоль туловища
      if (i > 1 && i < tn - 2 && (i / step) % 2 === 0) {
        const finW = segR * 1.3;
        const finWave = Math.sin(time * 8.5 - (tn - 1 - i) * 0.35) * (segR * 0.22);
        this.organLayer.moveTo(finalX - tnx * (finW + finWave), finalY - tny * (finW + finWave))
          .lineTo(finalX + tnx * (finW + finWave), finalY + tny * (finW + finWave))
          .stroke({ width: 1.4, color: tc1, alpha: alpha * 0.4 });
      }

      const segTint = isDying
        ? 0xff5c77
        : state.tailState === 'crit'
          ? ((i / step) % 2 === 0 ? 0xffa6b8 : 0xffd0d8)
          : state.tailState === 'low'
            ? 0xfff0b3
            : 0xffffff;

      if (i === 0 && this.tex.v3?.tail.tailStinger) {
        // Кончик хвоста: мультяшное ядовитое жало
        const sp = this.registry.makeSprite('ptail_stinger', segTint, 'normal', this.tex.v3.tail.tailStinger);
        alignTailSegment(sp, finalX, finalY, alignPrevX, alignPrevY);
        sp.scale.set((segR * 2.8) / 128);
        sp.alpha = alpha;
      } else if (this.tex.v3?.tail.tailVertebra) {
        // Мультяшный позвонок хвоста
        const sp = this.registry.makeSprite('ptail_vert', segTint, 'normal', this.tex.v3.tail.tailVertebra);
        alignTailSegment(sp, finalX, finalY, alignPrevX, alignPrevY);
        sp.scale.set((segR * 2.6) / 128);
        sp.alpha = alpha;
      } else {
        const sp = this.registry.makeSprite('ptail', tint, 'normal');
        sp.position.set(finalX, finalY);
        sp.scale.set((segR * 2.0) / 64);
        sp.alpha = alpha;
      }
    }
  }

  /** Телеграф Кольца Смерти: подсказка-связь при сближении головы с ранней траекторией хвоста */
  private drawRingTelegraph(state: RenderState, time: number): void {
    const tail = state.player.tail;
    const tn = tail.length;
    const px = state.player.x;
    const py = state.player.y;
    if (!state.ringReady || tn < 24) return;
    let snapPt: { x: number; y: number } | null = null;
    let snapD = 68;
    const limit = tn - 10;
    for (let i = 0; i < limit; i += 2) {
      const d = Math.hypot(tail[i].x - px, tail[i].y - py);
      if (d < snapD) {
        snapD = d;
        snapPt = tail[i];
      }
    }
    if (snapPt) {
      const pulse = 0.55 + Math.sin(time * 14) * 0.35;
      this.fxOver.moveTo(px, py).lineTo(snapPt.x, snapPt.y)
        .stroke({ width: 2.2, color: 0xffd166, alpha: 0.55 * pulse });
      this.fxOver.circle(snapPt.x, snapPt.y, 5.5 + pulse * 2.5)
        .stroke({ width: 1.8, color: 0xffd166, alpha: 0.8 * pulse });
    }
  }

  /** Живой Карапакс: защитный био-барьер вокруг организма */
  private drawCarapace(state: RenderState, time: number): void {
    this.registry.releasePool('carapaceShield');
    if (!state.carapaceReady) return;
    const px = state.player.x;
    const py = state.player.y;
    if (this.tex.v3?.overlays.shieldBarrier) {
      const sp = this.registry.makeSprite('carapaceShield', 0xffffff, 'normal', this.tex.v3.overlays.shieldBarrier);
      sp.position.set(px, py);
      sp.scale.set(((state.player.r + 12) * 2.3) / 256);
      sp.rotation = time * 0.7;
      sp.alpha = 0.78 + Math.sin(time * 4) * 0.12;
    } else {
      this.fxOver.circle(px, py, state.player.r + 9)
        .stroke({ width: 2, color: 0x00ff9d, alpha: 0.72 });
    }
  }

  /** Аура и живое ядро клетки Светляка + анимация гибели организма */
  private drawCore(state: RenderState, time: number): void {
    const px = state.player.x;
    const py = state.player.y;
    const form = state.morph ? SCALES[state.morph.scaleId - 1] : null;
    const deathP = state.playerDeath ? Math.max(0, Math.min(1, state.playerDeath.progress)) : 0;
    const isDying = Boolean(state.playerDeath);
    const deathCoreScale = isDying
      ? (deathP < 0.22 ? 1 + deathP * 2.2 : Math.max(0, 1.48 - (deathP - 0.22) * 1.9))
      : 1;
    const deathCoreAlpha = isDying ? Math.max(0, 1 - Math.max(0, deathP - 0.18) / 0.65) : 1;

    this.playerGlow.position.set(px, py);
    this.playerGlow.scale.set(((state.player.r * 2.3) / 64) * deathCoreScale);
    this.playerGlow.alpha = (0.42 + Math.sin(time * 5) * 0.08) * deathCoreAlpha;
    if (isDying) this.playerGlow.tint = 0xff3b5c;
    else if (form) this.playerGlow.tint = form.glow;

    // Живое ядро клетки Светляка с вращающимися органеллами
    const nucTex = this.tex.player?.playerNucleus;
    if (nucTex && this.playerCore.texture !== nucTex) {
      this.playerCore.texture = nucTex;
    }
    this.playerCore.position.set(px, py);
    const nucW = nucTex?.width || 128;
    this.playerCore.scale.set(((state.player.r * 1.9) / nucW) * deathCoreScale);
    this.playerCore.rotation = time * (isDying ? 3.5 : 0.35);
    this.playerCore.alpha = deathCoreAlpha;
    if (isDying) this.playerCore.tint = 0xff7b93;
    else this.playerCore.tint = nucTex ? 0xffffff : (form?.core ?? 0xffffff);

    // Анимация гибели организма: разлом мембраны, распад на светящиеся фрагменты и ударная волна
    if (!isDying) return;
    const rBase = state.player.r;
    if (deathP < 0.72) {
      const crackAlpha = Math.sin(Math.min(1, deathP / 0.72) * Math.PI);
      for (let c = 0; c < 7; c++) {
        const ang = c * 0.9 + deathP * 1.2;
        const len = rBase * (0.9 + deathP * 2.2);
        this.fxOver.moveTo(px, py)
          .lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len)
          .stroke({ width: 2.6, color: c % 2 === 0 ? 0xff3b5c : 0xffd166, alpha: crackAlpha * 0.95 });
      }
    }
    if (deathP >= 0.15) {
      const burstT = Math.min(1, (deathP - 0.15) / 0.85);
      const burstAlpha = Math.max(0, 1 - burstT);
      const waveR = rBase + burstT * 115;
      this.fxOver.circle(px, py, waveR)
        .stroke({ width: 3.2 * burstAlpha + 0.5, color: 0xff3b5c, alpha: burstAlpha * 0.9 });
      this.fxOver.circle(px, py, waveR * 0.62)
        .stroke({ width: 2.0 * burstAlpha + 0.4, color: 0xc084fc, alpha: burstAlpha * 0.75 });
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * Math.PI * 2 + 0.21;
        const spd = 28 + (k % 3) * 24;
        const fx = px + Math.cos(ang) * (burstT * spd * 2.4);
        const fy = py + Math.sin(ang) * (burstT * spd * 2.4);
        const fr = Math.max(1.2, (5 - (k % 3)) * burstAlpha);
        this.fxOver.circle(fx, fy, fr)
          .fill({ color: k % 2 === 0 ? 0x66fcf1 : 0xff3b5c, alpha: burstAlpha * 0.92 });
      }
    }
  }

  /** Тело игрока: телеграф кольца, карапакс, аура, ядро и гибель */
  updateBody(state: RenderState, time: number): void {
    this.drawRingTelegraph(state, time);
    this.drawCarapace(state, time);
    this.drawCore(state, time);
  }

  /**
   * Визуальная эволюция организма: челюсти, шипы, споры, кристаллы, крылья и ауры гибридов.
   * При гибели организма органы скрываются вместе с аурами.
   */
  updateOrgans(state: RenderState, time: number): void {
    this.registry.releasePool('morphFloor');
    this.registry.releasePool('morphOver');
    if (state.morph && !state.playerDeath) {
      this.drawOrgans(state, time, state.player.x, state.player.y);
    } else {
      this.hybrids.hide();
      this.predatorEyeContainer1.visible = false;
      this.predatorEyeContainer2.visible = false;
    }
  }

  /**
   * Визуальная эволюция организма:
   * Жвалы (Вермис), Шипы и Плазменный Рог (Химера), Споры и Усики (Мицелий),
   * Фазовые Кристаллы и Крылья (Симбионт), плюс уникальные силуэты Великих Гибридов.
   */
  private drawOrgans(state: RenderState, time: number, px: number, py: number): void {
    const morph = state.morph;
    if (!morph) return;

    const r = state.player.r;
    let ang = Math.atan2(morph.dirY, morph.dirX);
    if (Math.hypot(morph.dirX, morph.dirY) < 0.05 && state.player.tail.length > 0) {
      const seg0 = state.player.tail[state.player.tail.length - 1];
      ang = Math.atan2(state.player.y - seg0.y, state.player.x - seg0.x);
    }

    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const perpX = -sinA;
    const perpY = cosA;

    // ================= 1. ВЕРМИС (Жвалы, Зазубрины, Глаза-Хищники) =================
    if (morph.vermis > 0) {
      const lvl = morph.vermis;
      const snap = Math.sin(time * 7) * 0.14 * (1 + lvl * 0.25);
      const mLen = r * (0.85 + lvl * 0.35);
      const col = 0x66fcf1;
      const glowCol = 0xeafffb;

      for (const side of [-1, 1]) {
        const rootAngle = ang + side * (0.42 + snap);
        const rootX = px + Math.cos(rootAngle) * (r * 0.85);
        const rootY = py + Math.sin(rootAngle) * (r * 0.85);

        const tipAngle = ang + side * (0.12 - snap);
        const tipX = rootX + Math.cos(tipAngle) * mLen;
        const tipY = rootY + Math.sin(tipAngle) * mLen;

        const midAngle = ang + side * (0.65 + snap * 0.5);
        const midX = rootX + Math.cos(midAngle) * (mLen * 0.6);
        const midY = rootY + Math.sin(midAngle) * (mLen * 0.6);

        this.organLayer.moveTo(rootX, rootY)
          .quadraticCurveTo(midX, midY, tipX, tipY)
          .stroke({ width: 2.2 + lvl * 0.7, color: col, alpha: 0.95 });

        this.organLayer.circle(tipX, tipY, 2 + lvl * 0.7)
          .fill({ color: glowCol, alpha: 0.95 });

        if (lvl >= 2) {
          const toothX = rootX + (tipX - rootX) * 0.5 + perpX * side * 4;
          const toothY = rootY + (tipY - rootY) * 0.5 + perpY * side * 4;
          this.organLayer.moveTo(toothX, toothY)
            .lineTo(toothX - perpX * side * 6, toothY - perpY * side * 6)
            .stroke({ width: 2, color: col, alpha: 0.85 });
        }

        if (lvl >= 3) {
          const eyeX = px + Math.cos(ang + side * 0.7) * (r * 0.65);
          const eyeY = py + Math.sin(ang + side * 0.7) * (r * 0.65);
          this.organLayer.circle(eyeX, eyeY, 3.2)
            .fill({ color: 0xffffff, alpha: 1 })
            .stroke({ width: 1.5, color: col, alpha: 0.9 });
        }
      }

      if (lvl >= 2) {
        for (let j = 1; j <= lvl; j++) {
          const scX = px - cosA * (r * 0.3 * j);
          const scY = py - sinA * (r * 0.3 * j);
          const scW = r * (0.7 - j * 0.12);
          this.organLayer.moveTo(scX - perpX * scW, scY - perpY * scW)
            .quadraticCurveTo(scX - cosA * 5, scY - sinA * 5, scX + perpX * scW, scY + perpY * scW)
            .stroke({ width: 2.2, color: col, alpha: 0.75 });
        }
      }

      // Живой Глаз Хищника со следящим зрачком (Wave 3)
      let targetX = px + Math.cos(ang) * 300;
      let targetY = py + Math.sin(ang) * 300;
      let closestDist = 550;
      for (const en of state.enemies) {
        const d = Math.hypot(en.x - px, en.y - py);
        if (d < closestDist) {
          closestDist = d;
          targetX = en.x;
          targetY = en.y;
        }
      }

      if (this.tex.v3?.eye) {
        if (lvl >= 2) {
          // 2 стереоскопических глаза по бокам головы
          for (const side of [-1, 1]) {
            const isLeft = side === -1;
            const eyeCont = isLeft ? this.predatorEyeContainer1 : this.predatorEyeContainer2;
            const eyeSp = isLeft ? this.predatorEyeSprite : this.predatorEyeSprite2;
            const pupSp = isLeft ? this.predatorPupilSprite : this.predatorPupilSprite2;
            const eyeAngle = ang + side * 0.52;
            const eyeX = px + Math.cos(eyeAngle) * (r * 0.65);
            const eyeY = py + Math.sin(eyeAngle) * (r * 0.65);
            eyeCont.position.set(eyeX, eyeY);
            eyeCont.visible = true;

            eyeSp.texture = this.tex.v3.eye.predatorEye;
            eyeSp.position.set(0, 0);
            eyeSp.rotation = ang;
            eyeSp.scale.set((r * 0.72) / 128);

            pupSp.texture = this.tex.v3.eye.predatorPupil;
            pupSp.rotation = ang;
            pupSp.scale.set((r * 0.72) / 64);
            updatePredatorPupil(pupSp, eyeX, eyeY, targetX, targetY, (r * 0.12), 0);
          }
        } else {
          // 1 циклопический глаз хищника по центру лба
          const eyeX = px + Math.cos(ang) * (r * 0.52);
          const eyeY = py + Math.sin(ang) * (r * 0.52);
          this.predatorEyeContainer1.position.set(eyeX, eyeY);
          this.predatorEyeContainer1.visible = true;

          this.predatorEyeSprite.texture = this.tex.v3.eye.predatorEye;
          this.predatorEyeSprite.position.set(0, 0);
          this.predatorEyeSprite.rotation = ang;
          this.predatorEyeSprite.scale.set((r * 0.85) / 128);

          this.predatorPupilSprite.texture = this.tex.v3.eye.predatorPupil;
          this.predatorPupilSprite.rotation = ang;
          this.predatorPupilSprite.scale.set((r * 0.85) / 64);
          updatePredatorPupil(this.predatorPupilSprite, eyeX, eyeY, targetX, targetY, (r * 0.16), 0);

          this.predatorEyeContainer2.visible = false;
        }
      }
    } else {
      this.predatorEyeContainer1.visible = false;
      this.predatorEyeContainer2.visible = false;
    }

    // ================= 2. ХИМЕРА (Костяные Шипы, Плазменный Рог) =================
    if (morph.chimera > 0) {
      const lvl = morph.chimera;
      if (this.tex.v4?.morphology) {
        const spSpines = this.registry.makeSprite('morphOver', 0xffffff, 'normal', this.tex.v4.morphology.chimeraSpines, this.morphOverLayer);
        spSpines.position.set(px, py);
        spSpines.rotation = ang + Math.PI / 2;
        spSpines.scale.set((r * (2.6 + lvl * 0.25)) / 256);
        spSpines.alpha = 0.94;
        if (lvl >= 2) {
          const spHorn = this.registry.makeSprite('morphOver', 0xffffff, 'normal', this.tex.v4.morphology.chimeraHorn, this.morphOverLayer);
          spHorn.position.set(px, py);
          spHorn.rotation = ang + Math.PI / 2;
          spHorn.scale.set((r * (2.7 + lvl * 0.28)) / 256);
          spHorn.alpha = 0.96;
        }
      } else {
        const spikeCol = 0xff7b93;
        const hotCol = 0xffffff;
        const numSpikes = 2 + lvl * 2;
        for (let j = 0; j < numSpikes; j++) {
          const side = j % 2 === 0 ? 1 : -1;
          const rank = Math.floor(j / 2);
          const spAngle = ang + Math.PI - side * (0.6 + rank * 0.4);
          const sLen = r * (0.6 + lvl * 0.35 + Math.sin(time * 6 + j) * 0.1);
          const bx = px + Math.cos(spAngle) * (r * 0.75);
          const by = py + Math.sin(spAngle) * (r * 0.75);
          const tx = bx + Math.cos(spAngle) * sLen;
          const ty = by + Math.sin(spAngle) * sLen;
          this.organLayer.moveTo(bx - perpX * side * 3, by - perpY * side * 3)
            .lineTo(tx, ty)
            .lineTo(bx + perpX * side * 3, by + perpY * side * 3)
            .fill({ color: spikeCol, alpha: 0.85 })
            .stroke({ width: 1.5, color: hotCol, alpha: 0.9 });
          this.organLayer.circle(tx, ty, 1.8 + lvl * 0.4)
            .fill({ color: hotCol, alpha: 0.95 });
        }
        if (lvl >= 2) {
          const crestLen = r * (0.7 + lvl * 0.3);
          const cx = px + cosA * (r * 0.8);
          const cy = py + sinA * (r * 0.8);
          this.organLayer.moveTo(cx - perpX * 4, cy - perpY * 4)
            .lineTo(cx + cosA * crestLen, cy + sinA * crestLen)
            .lineTo(cx + perpX * 4, cy + perpY * 4)
            .fill({ color: 0xff3b5c, alpha: 0.9 })
            .stroke({ width: 2, color: 0xffd166, alpha: 0.95 });
        }
      }

      if (lvl >= 3) {
        const ventFlick = Math.sin(time * 12);
        if (ventFlick > 0) {
          const vx = px - cosA * (r * 0.6);
          const vy = py - sinA * (r * 0.6);
          this.organLayer.circle(vx + perpX * 8, vy + perpY * 8, 3.5 * ventFlick)
            .fill({ color: 0xffd166, alpha: 0.8 });
          this.organLayer.circle(vx - perpX * 8, vy - perpY * 8, 3.5 * ventFlick)
            .fill({ color: 0xffd166, alpha: 0.8 });
        }
      }
    }

    // ================= 3. МИЦЕЛИЙ (Пустулы, Плавающие Усики, Споры) =================
    if (morph.mycelium > 0) {
      const lvl = morph.mycelium;
      const sporeCol = 0x86efac;
      const toxicCol = 0x34d399;

      if (this.tex.v4?.morphology) {
        const spPus = this.registry.makeSprite('morphOver', 0xffffff, 'normal', this.tex.v4.morphology.myceliumPustules, this.morphOverLayer);
        spPus.position.set(px, py);
        spPus.rotation = ang + Math.PI / 2;
        spPus.scale.set((r * (2.2 + lvl * 0.22)) / 256);
        spPus.alpha = 0.9;
        if (lvl >= 2) {
          const spTen = this.registry.makeSprite('morphFloor', 0xffffff, 'normal', this.tex.v4.morphology.myceliumTendrils, this.floorLayer);
          spTen.position.set(px, py);
          spTen.rotation = ang + Math.PI / 2 + Math.sin(time * 3) * 0.08;
          spTen.scale.set((r * (3.1 + lvl * 0.25)) / 256);
          spTen.alpha = 0.94;
        }
      } else {
        const pustuleCount = 3 + lvl * 2;
        for (let j = 0; j < pustuleCount; j++) {
          const pAng = j * 2.399;
          const pDist = r * (0.35 + (j % 3) * 0.18);
          const pusX = px + Math.cos(pAng) * pDist;
          const pusY = py + Math.sin(pAng) * pDist;
          const pusR = 2.5 + (j % 2) * 1.5 + Math.sin(time * 4 + j) * 0.8;
          this.organLayer.circle(pusX, pusY, pusR)
            .fill({ color: sporeCol, alpha: 0.85 })
            .stroke({ width: 1.2, color: toxicCol, alpha: 0.9 });
        }
        if (lvl >= 2) {
          for (let j = 0; j < 4; j++) {
            const side = j % 2 === 0 ? 1 : -1;
            const aRootX = px + cosA * (r * 0.3) + perpX * side * (r * 0.7);
            const aRootY = py + sinA * (r * 0.3) + perpY * side * (r * 0.7);
            const aLen = r * (1.2 + lvl * 0.4);
            const w1 = Math.sin(time * 5 + j * 1.5) * 12;
            const w2 = Math.cos(time * 4 + j * 1.2) * 14;
            const ctrlX = aRootX - cosA * (aLen * 0.5) + perpX * (side * 14 + w1);
            const ctrlY = aRootY - sinA * (aLen * 0.5) + perpY * (side * 14 + w1);
            const endX = aRootX - cosA * aLen + perpX * (side * 22 + w2);
            const endY = aRootY - sinA * aLen + perpY * (side * 22 + w2);
            this.organLayer.moveTo(aRootX, aRootY)
              .quadraticCurveTo(ctrlX, ctrlY, endX, endY)
              .stroke({ width: 1.8, color: sporeCol, alpha: 0.75 });
            this.organLayer.circle(endX, endY, 2.5)
              .fill({ color: 0xeafff4, alpha: 0.9 });
          }
        }
      }

      if (lvl >= 3) {
        for (let sIdx = 0; sIdx < 6; sIdx++) {
          const sOrb = time * 2.2 + sIdx * (Math.PI / 3);
          const sRad = r * 1.5 + Math.sin(time * 3 + sIdx) * 6;
          const sx = px + Math.cos(sOrb) * sRad;
          const sy = py + Math.sin(sOrb) * sRad;
          this.organLayer.circle(sx, sy, 2.0)
            .fill({ color: sporeCol, alpha: 0.7 + Math.sin(time * 5 + sIdx) * 0.3 });
        }
      }
    }

    // ================= 4. СИМБИОНТ (Кристаллы, Резонансные Кольца, Крылья) =================
    if (morph.symbiont > 0) {
      const lvl = morph.symbiont;
      const cryCol = 0xffd166;
      const phaseCol = 0xffffff;

      if (this.tex.v4?.morphology) {
        const spCry = this.registry.makeSprite('morphOver', 0xffffff, 'normal', this.tex.v4.morphology.symbiontCrystals, this.morphOverLayer);
        spCry.position.set(px, py);
        spCry.rotation = time * 0.65;
        spCry.scale.set((r * (2.5 + lvl * 0.22)) / 256);
        spCry.alpha = 0.92;
        if (lvl >= 3) {
          const spWings = this.registry.makeSprite('morphFloor', 0xffffff, 'normal', this.tex.v4.morphology.symbiontWings, this.floorLayer);
          spWings.position.set(px, py);
          spWings.rotation = ang + Math.PI / 2;
          const flap = 1 + Math.sin(time * 4) * 0.08;
          spWings.scale.set((r * 3.5 * flap) / 256, (r * 3.2) / 256);
          spWings.alpha = 0.92;
        }
      } else {
        const cryCount = 1 + lvl;
        for (let j = 0; j < cryCount; j++) {
          const cOff = (j - (cryCount - 1) / 2) * (r * 0.45);
          const cx = px - cosA * cOff;
          const cy = py - sinA * cOff;
          const cSz = 4 + lvl * 1.5;
          this.organLayer.poly([
            { x: cx, y: cy - cSz },
            { x: cx + cSz * 0.7, y: cy },
            { x: cx, y: cy + cSz },
            { x: cx - cSz * 0.7, y: cy },
          ]).fill({ color: cryCol, alpha: 0.9 })
            .stroke({ width: 1.5, color: phaseCol, alpha: 0.95 });
        }
        if (lvl >= 3) {
          for (const side of [-1, 1]) {
            const wRootX = px - cosA * (r * 0.2) + perpX * side * (r * 0.6);
            const wRootY = py - sinA * (r * 0.2) + perpY * side * (r * 0.6);
            const wingSpan = r * 2.2;
            const flap = Math.sin(time * 4) * 0.2;
            const wTipX = wRootX - cosA * (r * 0.4) + perpX * side * (wingSpan * (1 + flap));
            const wTipY = wRootY - sinA * (r * 0.4) + perpY * side * (wingSpan * (1 + flap));
            const wBackX = wRootX - cosA * (r * 1.6);
            const wBackY = wRootY - sinA * (r * 1.6);
            this.organLayer.poly([
              { x: wRootX, y: wRootY },
              { x: wTipX, y: wTipY },
              { x: wBackX, y: wBackY },
            ]).fill({ color: cryCol, alpha: 0.22 })
              .stroke({ width: 2, color: phaseCol, alpha: 0.75 });
          }
        }
      }

      if (lvl >= 2) {
        const ringRad = r * (1.3 + Math.sin(time * 3) * 0.1);
        this.organLayer.ellipse(px, py, ringRad, ringRad * 0.35)
          .stroke({ width: 1.6, color: cryCol, alpha: 0.65 });
      }
    }

    // ================= 5. ВЕЛИКИЕ ГИБРИДЫ (APEX СИЛУЭТЫ И МУЛЬТЯШНЫЕ АУРЫ) =================
    this.hybrids.update(morph, time, px, py, ang, r);
  }

  /** Скрыть постоянные спрайты игрока при рестарте забега */
  reset(): void {
    this.hybrids.hide();
    this.predatorEyeContainer1.visible = false;
    this.predatorEyeContainer2.visible = false;
    this.playerGlow.alpha = 1;
    this.playerCore.alpha = 1;
  }
}
