// Рендер мира LUMIVORE: живой декор биома, био-мембрана границ арены, узлы территории,
// синаптическая нейросеть колонии, споровые цисты, аура токсина и аномалии чашки Петри.
import { Container, Graphics, Text, Texture } from 'pixi.js';
import { NodeView, RenderState, RenderTextures, ScreenProvider, CamView, MorphView } from './views';
import { NodeKind, biomeFxCfgForScaleId, ribBandsAt } from '../engine/types';
import { SpritePoolRegistry } from './SpritePool';

/** Короткие обозначения био-узлов (fallback при отсутствии SVG-текстур) */
const NODE_ICONS: Record<NodeKind, string> = {
  gen: '+HP',
  amp: 'AMP',
  magnet: 'MAG',
  mutagen: 'DNA',
  incubator: '+XP',
};

export class WorldLayer {
  private nodeTexts: Text[] = [];
  private nodeStatusTexts: Text[] = [];

  constructor(
    /** Корневой мировой контейнер: fallback-тексты узлов живут поверх слоёв */
    private readonly world: Container,
    private readonly fxUnder: Graphics,
    private readonly fxOver: Graphics,
    private readonly floorLayer: Container,
    private readonly entityLayer: Container,
    private readonly registry: SpritePoolRegistry,
    private readonly tex: RenderTextures,
    private readonly screen: ScreenProvider,
  ) {}

  /**
   * Живая среда биома:
   * 1. Светящаяся био-мембрана границы мира (граница текущего масштаба).
   * 2. Процедурные живые элементы среды (вакуоли, волокна ткани, планктон, магма, фракталы).
   */
  private drawBiome(
    morph: MorphView,
    time: number,
    s: number,
    cam: CamView,
    px: number,
    py: number,
  ): void {
    const scaleId = morph.scaleId;
    const w = cam.worldW;
    const h = cam.worldH;

    const wallCol = scaleId === 1 ? 0x66fcf1
      : scaleId === 2 ? 0xff3b5c
      : scaleId === 3 ? 0x3b82f6
      : scaleId === 4 ? 0xf97316
      : 0xa855f7;

    // 1. Граница мира: светящаяся био-мембрана + подсветка близости игрока
    this.fxUnder.rect(0, 0, w, h)
      .stroke({ width: 3.5, color: wallCol, alpha: 0.65 + Math.sin(time * 3) * 0.2 });
    this.fxUnder.rect(-10, -10, w + 20, h + 20)
      .stroke({ width: 1.5, color: wallCol, alpha: 0.22 });

    const wallWarnDist = 110;
    const segSpan = 140;
    if (px < wallWarnDist) {
      const intensity = (1 - px / wallWarnDist) * 0.85;
      this.fxUnder.moveTo(0, Math.max(0, py - segSpan)).lineTo(0, Math.min(h, py + segSpan))
        .stroke({ width: 6, color: 0xffffff, alpha: intensity * 0.55 });
    } else if (px > w - wallWarnDist) {
      const intensity = (1 - (w - px) / wallWarnDist) * 0.85;
      this.fxUnder.moveTo(w, Math.max(0, py - segSpan)).lineTo(w, Math.min(h, py + segSpan))
        .stroke({ width: 6, color: 0xffffff, alpha: intensity * 0.55 });
    }
    if (py < wallWarnDist) {
      const intensity = (1 - py / wallWarnDist) * 0.85;
      this.fxUnder.moveTo(Math.max(0, px - segSpan), 0).lineTo(Math.min(w, px + segSpan), 0)
        .stroke({ width: 6, color: 0xffffff, alpha: intensity * 0.55 });
    } else if (py > h - wallWarnDist) {
      const intensity = (1 - (h - py) / wallWarnDist) * 0.85;
      this.fxUnder.moveTo(Math.max(0, px - segSpan), h).lineTo(Math.min(w, px + segSpan), h)
        .stroke({ width: 6, color: 0xffffff, alpha: intensity * 0.55 });
    }

    // Био-реснички по кромкам мембраны
    const segsX = Math.min(50, Math.floor(w / 45));
    for (let i = 0; i < segsX; i++) {
      const rx = (i / segsX) * w;
      const wave = Math.sin(time * 4 + i * 0.6) * 7;
      this.fxUnder.moveTo(rx, 0).lineTo(rx + wave * 0.3, -10 + wave)
        .stroke({ width: 1.2, color: wallCol, alpha: 0.3 });
      this.fxUnder.moveTo(rx, h).lineTo(rx + wave * 0.3, h + 10 - wave)
        .stroke({ width: 1.2, color: wallCol, alpha: 0.3 });
    }
    const segsY = Math.min(30, Math.floor(h / 45));
    for (let i = 0; i < segsY; i++) {
      const ry = (i / segsY) * h;
      const wave = Math.cos(time * 4 + i * 0.6) * 7;
      this.fxUnder.moveTo(0, ry).lineTo(-10 + wave, ry + wave * 0.3)
        .stroke({ width: 1.2, color: wallCol, alpha: 0.3 });
      this.fxUnder.moveTo(w, ry).lineTo(w + 10 - wave, ry + wave * 0.3)
        .stroke({ width: 1.2, color: wallCol, alpha: 0.3 });
    }

    // 2. Процедурные живые структуры внутри текущей видимости
    const halfW = (this.screen.width / 2) / (s * cam.zoom) + 120;
    const halfH = (this.screen.height / 2) / (s * cam.zoom) + 120;
    const minX = Math.max(0, cam.x - halfW);
    const maxX = Math.min(w, cam.x + halfW);
    const minY = Math.max(0, cam.y - halfH);
    const maxY = Math.min(h, cam.y + halfH);

    const step = scaleId === 5 ? 130 : 100;
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    for (let gx = startX; gx <= maxX; gx += step) {
      for (let gy = startY; gy <= maxY; gy += step) {
        const hVal = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
        const rnd = hVal - Math.floor(hVal);
        const rnd2 = ((hVal * 1.33) - Math.floor(hVal * 1.33));
        const cx = gx + (rnd - 0.5) * (step * 0.6);
        const cy = gy + (rnd2 - 0.5) * (step * 0.6);

        if (scaleId === 1) {
          // ПЕРВИЧНАЯ КАПЛЯ: плавающие вакуоли и клеточные пузырьки
          const pr = 10 + rnd * 16;
          const pulse = Math.sin(time * 1.8 + rnd * 10) * 2.5;
          this.fxUnder.circle(cx, cy, pr + pulse)
            .stroke({ width: 1.2, color: 0x66fcf1, alpha: 0.14 + rnd * 0.08 })
            .fill({ color: 0x0e6e6b, alpha: 0.04 });
          this.fxUnder.circle(cx + pulse * 0.4, cy - pulse * 0.4, (pr + pulse) * 0.3)
            .fill({ color: 0x66fcf1, alpha: 0.1 + rnd * 0.08 });
        } else if (scaleId === 2) {
          // КРОВЕНОСНЫЙ ТРАКТ: волокна ткани и эритроциты
          const rL = 18 + rnd * 24;
          const ang = rnd * Math.PI + Math.sin(time * 2 + cx * 0.01) * 0.3;
          this.fxUnder.ellipse(cx, cy, rL, rL * 0.45)
            .stroke({ width: 1.2, color: 0xff3b5c, alpha: 0.18 + rnd * 0.1 })
            .fill({ color: 0x5c0e1e, alpha: 0.06 });
          this.fxUnder.moveTo(cx - Math.cos(ang) * 35, cy - Math.sin(ang) * 35)
            .lineTo(cx + Math.cos(ang) * 35, cy + Math.sin(ang) * 35)
            .stroke({ width: 1.0, color: 0xff7b93, alpha: 0.12 });
        } else if (scaleId === 3) {
          // ВНУТРЕННИЙ ОКЕАН: светящийся планктон и сифонофоры
          const pCount = 3 + Math.floor(rnd * 3);
          const drift = Math.sin(time * 1.2 + cx * 0.02) * 10;
          for (let p = 0; p < pCount; p++) {
            const py2 = cy + p * 9 + drift;
            const px2 = cx + Math.sin(time * 2 + p * 0.8) * 5;
            this.fxUnder.circle(px2, py2, 2.5)
              .fill({ color: 0x4d8dff, alpha: 0.28 - p * 0.05 })
              .stroke({ width: 1, color: 0x9df5ff, alpha: 0.4 - p * 0.06 });
          }
        } else if (scaleId === 4) {
          // КОНТИНЕНТАЛЬНЫЙ РАЗЛОМ: магматические трещины
          const crackLen = 25 + rnd * 30;
          const cAng = rnd * Math.PI * 2;
          const flick = 0.5 + Math.sin(time * 3 + rnd * 20) * 0.5;
          this.fxUnder.moveTo(cx, cy)
            .lineTo(cx + Math.cos(cAng) * crackLen, cy + Math.sin(cAng) * crackLen)
            .stroke({ width: 2.0, color: 0xff8a3d, alpha: 0.2 * flick });
          this.fxUnder.circle(cx, cy, 3.5)
            .fill({ color: 0xffd166, alpha: 0.35 * flick });
        } else {
          // ФРАКТАЛ БЕСКОНЕЧНОСТИ: сакральная геометрия
          const fr = 18 + rnd * 22;
          const rot = time * 0.4 + rnd * Math.PI;
          this.fxUnder.circle(cx, cy, fr)
            .stroke({ width: 1.0, color: 0xa86bff, alpha: 0.18 });
          const sz = fr * 0.7;
          this.fxUnder.poly([
            { x: cx + Math.cos(rot) * sz, y: cy + Math.sin(rot) * sz },
            { x: cx + Math.cos(rot + Math.PI / 2) * sz, y: cy + Math.sin(rot + Math.PI / 2) * sz },
            { x: cx + Math.cos(rot + Math.PI) * sz, y: cy + Math.sin(rot + Math.PI) * sz },
            { x: cx + Math.cos(rot + (Math.PI * 3) / 2) * sz, y: cy + Math.sin(rot + (Math.PI * 3) / 2) * sz },
          ]).stroke({ width: 1.0, color: 0xc084fc, alpha: 0.14 });
        }
      }
    }

    // 3. Атмосферный параллакс биома (Wave 3)
    this.registry.releasePool('biomeMacro');
    if (this.tex.v3?.biomes) {
      let biomeTex: Texture | null = null;
      let biomeTint = 0x66fcf1;
      if (scaleId === 1) {
        biomeTex = this.tex.v3.biomes.diatomShell;
        biomeTint = 0x66fcf1;
      } else if (scaleId === 2) {
        biomeTex = this.tex.v3.biomes.capillaryNode;
        biomeTint = 0xff3b5c;
      } else if (scaleId === 3) {
        biomeTex = this.tex.v3.biomes.bioValve;
        biomeTint = 0x3b82f6;
      } else if (scaleId === 4) {
        biomeTex = this.tex.v3.biomes.abyssalSpore;
        biomeTint = 0xf97316;
      } else {
        biomeTex = this.tex.v3.biomes.sacredFractal;
        biomeTint = 0xa855f7;
      }

      if (biomeTex) {
        const macroStep = 300;
        const mStartX = Math.floor(minX / macroStep) * macroStep;
        const mStartY = Math.floor(minY / macroStep) * macroStep;
        for (let bx = mStartX; bx <= maxX; bx += macroStep) {
          for (let by = mStartY; by <= maxY; by += macroStep) {
            const hVal = Math.sin(bx * 45.123 + by * 91.456) * 23456.78;
            const rnd = hVal - Math.floor(hVal);
            if (rnd < 0.4) continue;
            const floatX = bx + (rnd - 0.5) * 80 + Math.sin(time * 0.4 + rnd * 6) * 18;
            const floatY = by + (rnd - 0.5) * 80 + Math.cos(time * 0.35 + rnd * 5) * 18;
            const sp = this.registry.makeSprite('biomeMacro', 0xffffff, 'normal', biomeTex, this.floorLayer);
            sp.position.set(floatX, floatY);
            const size = 110 + rnd * 120;
            sp.scale.set(size / 256);
            sp.rotation = time * 0.08 * (rnd > 0.7 ? 1 : -1) + rnd * Math.PI * 2;
            sp.alpha = 0.22 + rnd * 0.12;
          }
        }
      }
    }
  }

  /** Живой декор биома и границы мира (вызывается при активной камере и морфологии) */
  updateBiome(state: RenderState, time: number, s: number): void {
    if (state.morph && state.cam) {
      this.drawBiome(state.morph, time, s, state.cam, state.player.x, state.player.y);
    }
    // --- Точечная правка: биом-модификатор шкалы 6 "ТЕНИ РЁБЕР" ---
    // Полупрозрачные дрейфующие полосы-телеграфы: та же чистая функция ribBandsAt
    // и тот же таймер nowSec, что и у проверок геймплея в src/game/biomeFx.ts.
    if (state.morph && state.cam && state.morph.scaleId === 6) {
      const cfg = biomeFxCfgForScaleId(6);
      if (cfg && cfg.kind === 'ribs') {
        const bands = ribBandsAt(time, state.cam.worldW, cfg);
        for (const b of bands) {
          this.fxUnder.rect(b.x0, 0, b.x1 - b.x0, state.cam.worldH)
            .fill({ color: 0xe2e8f0, alpha: 0.05 })
            .stroke({ width: 1.4, color: 0xe2e8f0, alpha: 0.13 });
        }
      }
    }
  }

  /** Споровые цисты (мины на земле) */
  updateCysts(state: RenderState, time: number): void {
    this.registry.releasePool('cystMine');
    if (!state.cysts) return;
    for (const cy of state.cysts) {
      const armed = cy.armed !== false;
      const pulse = armed ? 1 + Math.sin(time * 6 + cy.x) * 0.12 : 0.85;
      if (this.tex.v4?.sporeCystMine) {
        this.fxUnder.circle(cy.x, cy.y, cy.r * pulse)
          .fill({ color: armed ? 0x86efac : 0x94a3b8, alpha: armed ? 0.12 : 0.06 })
          .stroke({ width: armed ? 1.6 : 1.2, color: armed ? 0x39ff14 : 0x94a3b8, alpha: armed ? 0.58 : 0.35 });
        const spCy = this.registry.makeSprite('cystMine', armed ? 0xffffff : 0xb0bec5, 'normal', this.tex.v4.sporeCystMine, this.floorLayer);
        spCy.position.set(cy.x, cy.y);
        spCy.scale.set((cy.r * 2.15 * pulse) / 256);
        spCy.rotation = Math.sin(time * 2 + cy.x) * 0.15;
        spCy.alpha = armed ? 0.96 : 0.48;
      } else {
        this.fxUnder.circle(cy.x, cy.y, cy.r * pulse)
          .fill({ color: armed ? 0x86efac : 0x94a3b8, alpha: armed ? 0.18 : 0.08 })
          .stroke({ width: armed ? 2 : 1.4, color: armed ? 0x39ff14 : 0x94a3b8, alpha: armed ? 0.85 : 0.5 });
        this.fxUnder.circle(cy.x, cy.y, cy.r * 0.42)
          .fill({ color: 0xffffff, alpha: armed ? 0.78 : 0.32 });
      }
    }
  }

  /** Аура токсина под сущностями в мировых координатах (Wave 3: мембрана с биением ресничек) */
  updateAura(state: RenderState, time: number): void {
    this.registry.releasePool('auraCilia');
    const aura = state.aura;
    if (!aura) return;
    if (this.tex.v3?.vfx.auraCiliaMembrane) {
      const sp = this.registry.makeSprite('auraCilia', 0xffffff, 'normal', this.tex.v3.vfx.auraCiliaMembrane, this.floorLayer);
      sp.position.set(aura.x, aura.y);
      sp.scale.set((aura.r * 2.2) / 256);
      sp.rotation = time * 0.8;
      sp.alpha = 0.72 + Math.sin(time * 4) * 0.12;
    } else {
      this.fxUnder.circle(aura.x, aura.y, aura.r)
        .fill({ color: 0xff3b5c, alpha: 0.06 })
        .stroke({ width: 1.5, color: 0xff3b5c, alpha: 0.25 + Math.sin(time * 5) * 0.08 });
    }
  }

  /** Биологические аномалии среды (Кислотный прилив, Вспышка митоза, Гнездо спор) */
  updateAnomalies(state: RenderState, time: number): void {
    this.registry.releasePool('anomaly');
    if (!state.anomalies) return;
    for (const a of state.anomalies) {
      if (a.kind === 'acid') {
        if (a.warnT > 0) {
          // Фаза предупреждения: пульсирующий янтарный контур
          const warnPulse = 0.5 + 0.5 * Math.sin(time * 10);
          this.fxUnder.circle(a.x, a.y, a.r)
            .fill({ color: 0xf59e0b, alpha: 0.07 + warnPulse * 0.06 })
            .stroke({ width: 2.2, color: 0xfacc15, alpha: 0.55 + warnPulse * 0.35 });
          const shrinkR = Math.max(12, a.r * Math.min(1, a.warnT / 3.5));
          this.fxUnder.circle(a.x, a.y, shrinkR)
            .stroke({ width: 1.5, color: 0xff7b93, alpha: 0.65 });
        } else {
          // Активная кислотная зона: багряно-кислотное озеро с мультяшным спрайтом
          const fade = Math.min(1, a.life / 1.5);
          const wobble = 1 + Math.sin(time * 4 + a.x) * 0.03;
          this.fxUnder.circle(a.x, a.y, a.r * wobble)
            .fill({ color: 0x365314, alpha: 0.18 * fade })
            .stroke({ width: 2.5, color: 0xa3e635, alpha: 0.65 * fade });
          if (this.tex.v4?.anomalies.acid) {
            const spAcid = this.registry.makeSprite('anomaly', 0xffffff, 'normal', this.tex.v4.anomalies.acid, this.floorLayer);
            spAcid.position.set(a.x, a.y);
            spAcid.scale.set((a.r * 2.05 * wobble) / 256);
            spAcid.rotation = time * 0.16;
            spAcid.alpha = 0.74 * fade;
          } else {
            this.fxUnder.circle(a.x, a.y, a.r * 0.72)
              .fill({ color: 0xbe123c, alpha: 0.14 * fade });
            for (let b = 0; b < 7; b++) {
              const phase = (time * 0.9 + b * 0.142 + a.x * 0.01) % 1;
              const ang = b * 1.9 + Math.floor(time * 0.9 + b * 0.142) * 0.7;
              const dist = a.r * (0.2 + ((b * 0.37) % 0.65));
              const bx = a.x + Math.cos(ang) * dist;
              const by = a.y + Math.sin(ang) * dist;
              const br = 3 + phase * 8;
              this.fxUnder.circle(bx, by, br)
                .stroke({ width: 1.4, color: 0xfb7185, alpha: (1 - phase) * 0.7 * fade });
            }
          }
        }
      } else if (a.kind === 'bloom') {
        const fade = Math.min(1, a.life / 2.0);
        const pulse = 1 + Math.sin(time * 5) * 0.06;
        this.fxUnder.circle(a.x, a.y, a.r * pulse)
          .fill({ color: 0x10b981, alpha: 0.08 * fade })
          .stroke({ width: 2, color: 0x66fcf1, alpha: 0.5 * fade });
        if (this.tex.v4?.anomalies.bloom) {
          const spBloom = this.registry.makeSprite('anomaly', 0xffffff, 'normal', this.tex.v4.anomalies.bloom, this.floorLayer);
          spBloom.position.set(a.x, a.y);
          spBloom.scale.set((Math.min(180, a.r * 0.75) * pulse) / 256);
          spBloom.rotation = time * 0.35;
          spBloom.alpha = 0.78 * fade;
        }
      } else if (a.kind === 'cocoon') {
        const pulse = 1 + Math.sin(time * 5.2) * 0.11;
        for (let v = 0; v < 6; v++) {
          const ang = (v * Math.PI * 2) / 6 + 0.3;
          const len = a.r * (1.8 + Math.sin(time * 3 + v) * 0.2);
          this.fxUnder.moveTo(a.x, a.y)
            .lineTo(a.x + Math.cos(ang) * len, a.y + Math.sin(ang) * len)
            .stroke({ width: 2.2, color: 0x84cc16, alpha: 0.55 });
        }
        if (this.tex.v4?.anomalies.cocoon) {
          const spCoc = this.registry.makeSprite('anomaly', 0xffffff, 'normal', this.tex.v4.anomalies.cocoon, this.entityLayer);
          spCoc.position.set(a.x, a.y);
          spCoc.scale.set((a.r * 2.4 * pulse) / 256, (a.r * 2.4 / pulse) / 256);
          spCoc.rotation = Math.sin(time * 2.5 + a.x) * 0.08;
          spCoc.alpha = 0.98;
        } else {
          this.fxOver.circle(a.x, a.y, a.r * pulse)
            .fill({ color: 0x365314, alpha: 0.68 })
            .stroke({ width: 2.8, color: 0xa3e635, alpha: 0.92 });
          this.fxOver.circle(a.x, a.y, a.r * 0.52 * (1 + Math.sin(time * 8) * 0.15))
            .fill({ color: 0xc084fc, alpha: 0.85 });
        }
        // Дуга здоровья гнезда с контрастной подложкой
        if (a.hp !== undefined && a.maxHp) {
          const hpFrac = Math.max(0, Math.min(1, a.hp / a.maxHp));
          const hr = a.r + 8;
          this.fxOver.circle(a.x, a.y, hr)
            .stroke({ width: 4.5, color: 0x040a10, alpha: 0.72 });
          this.fxOver.moveTo(a.x + Math.cos(-Math.PI / 2) * hr, a.y + Math.sin(-Math.PI / 2) * hr);
          this.fxOver.arc(a.x, a.y, hr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac)
            .stroke({ width: 3, color: 0x86efac, alpha: 0.94 });
        }
      }
    }
  }

  /** Читаемый статус над башней при захвате, бое или атаке монстров */
  private updateNodeStatus(stTxt: Text, n: NodeView, coreR: number, isRaided: boolean, isContested: boolean, isPlayerIn: boolean): void {
    if (isRaided) {
      stTxt.text = `! ${Math.max(0, Math.round(n.capture * 100))}%`;
      stTxt.style.fill = 0xff6b81;
      stTxt.visible = true;
      stTxt.position.set(n.x, n.y - coreR - 14);
    } else if (isContested) {
      stTxt.text = '⚔';
      stTxt.style.fill = 0xffd166;
      stTxt.visible = true;
      stTxt.position.set(n.x, n.y - coreR - 14);
    } else if (isPlayerIn && n.owner !== 1) {
      stTxt.text = `${Math.max(0, Math.round(((n.capture + 1) * 0.5) * 100))}%`;
      stTxt.style.fill = 0x66fcf1;
      stTxt.visible = true;
      stTxt.position.set(n.x, n.y - coreR - 14);
    } else {
      stTxt.visible = false;
    }
  }

  /** Узлы территории (башни): зона удержания + прогресс энергии + тревога отвоевания */
  updateNodes(state: RenderState, time: number): void {
    this.registry.releasePool('nodeGlow');
    this.registry.releasePool('nodeIco');
    for (let i = 0; i < state.nodes.length; i++) {
      const n = state.nodes[i];
      const isRaided = Boolean(n.raided);
      const isContested = Boolean(n.contested);
      const isPlayerIn = Boolean(n.playerInside);
      const zoneCol = isRaided ? 0xff3b5c
        : isContested ? 0xffb800
        : n.owner === 1 ? 0x66fcf1
        : n.owner === -1 ? 0xff3b5c
        : isPlayerIn ? 0x66fcf1
        : 0x7c8ea6;
      const coreCol = n.owner === 1 ? 0x66fcf1 : n.owner === -1 ? 0xff3b5c : 0x94a3b8;
      const pulse = 0.94 + Math.sin(time * 2.8 + i * 1.7) * 0.06;
      const coreR = 22;

      const glow = this.registry.makeSprite('nodeGlow', zoneCol, 'add');
      glow.position.set(n.x, n.y);
      glow.scale.set((n.radius * 2.3) / 64);
      glow.alpha = isRaided ? (0.24 + Math.sin(time * 8) * 0.08) : isPlayerIn ? 0.24 : (n.owner !== 0 ? 0.18 : 0.1);

      // Чёткая область удержания вокруг башни
      this.fxUnder.circle(n.x, n.y, n.radius * pulse)
        .fill({ color: zoneCol, alpha: isPlayerIn ? 0.11 : isRaided ? 0.12 : n.owner === 1 ? 0.07 : 0.045 })
        .stroke({ width: isPlayerIn || isRaided || isContested ? 2.4 : 1.5, color: zoneCol, alpha: isPlayerIn || isRaided ? 0.85 : 0.45 });

      // Кольцо ядра башни
      this.fxOver.circle(n.x, n.y, coreR)
        .fill({ color: 0x040b12, alpha: 0.72 })
        .stroke({ width: 1.8, color: coreCol, alpha: 0.85 });

      // Энергетический поток от игрока при зарядке башни
      if (isPlayerIn && !state.playerDeath) {
        this.fxOver.moveTo(state.player.x, state.player.y).lineTo(n.x, n.y)
          .stroke({ width: isContested ? 1.5 : 2.6, color: isContested ? 0xffb800 : 0x66fcf1, alpha: 0.72 });
      }
      // Тревожное кольцо при попытке монстров отбить башню
      if (isRaided) {
        const warnWave = ((time * 1.6 + i * 0.3) % 1);
        this.fxOver.circle(n.x, n.y, coreR + warnWave * (n.radius - coreR))
          .stroke({ width: 2.2, color: 0xff3b5c, alpha: (1 - warnWave) * 0.85 });
      }

      // Дуга прогресса энергии (-1..+1) вокруг ядра башни
      const cf = Math.min(1, Math.abs(n.capture));
      if (cf > 0.01) {
        const arcR = coreR + 5;
        this.fxOver.circle(n.x, n.y, arcR)
          .stroke({ width: 3.5, color: 0x050c14, alpha: 0.7 });
        this.fxOver.moveTo(n.x + Math.cos(-Math.PI / 2) * arcR, n.y + Math.sin(-Math.PI / 2) * arcR);
        this.fxOver.arc(n.x, n.y, arcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cf)
          .stroke({ width: 3.2, color: n.capture >= 0 ? 0x66fcf1 : 0xff3b5c, alpha: 0.94 });
      }

      // Векторная био-иконка типа узла (полноцветный мультяшный спрайт)
      const nodeTex = this.tex.nodes?.[n.kind];
      if (nodeTex) {
        const ico = this.registry.makeSprite('nodeIco', 0xffffff, 'normal', nodeTex);
        ico.position.set(n.x, n.y);
        const tw = nodeTex.width || 128;
        ico.scale.set((coreR * 1.45) / tw);
        ico.alpha = 0.98;
      } else {
        let txt = this.nodeTexts[i];
        if (!txt) {
          txt = new Text({
            text: NODE_ICONS[n.kind],
            style: { fontSize: 10, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'JetBrains Mono, Consolas, monospace' },
          });
          txt.anchor.set(0.5);
          txt.alpha = 0.9;
          this.world.addChild(txt);
          this.nodeTexts.push(txt);
        }
        txt.text = NODE_ICONS[n.kind];
        txt.visible = true;
        txt.position.set(n.x, n.y);
      }

      // Читаемый статус над башней при захвате, бое или атаке монстров
      let stTxt = this.nodeStatusTexts[i];
      if (!stTxt) {
        stTxt = new Text({
          text: '',
          style: { fontSize: 10, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'JetBrains Mono, Consolas, monospace' },
        });
        stTxt.anchor.set(0.5);
        this.world.addChild(stTxt);
        this.nodeStatusTexts.push(stTxt);
      }
      this.updateNodeStatus(stTxt, n, coreR, isRaided, isContested, isPlayerIn);
    }
    const hideFrom = this.tex.nodes ? 0 : state.nodes.length;
    for (let j = hideFrom; j < this.nodeTexts.length; j++) this.nodeTexts[j].visible = false;
    for (let j = state.nodes.length; j < this.nodeStatusTexts.length; j++) this.nodeStatusTexts[j].visible = false;
  }

  /** Нейросеть колонии: живые синаптические био-аксоны между захваченными узлами игрока */
  updateNeuralLinks(state: RenderState, time: number): void {
    const ownedNodes: NodeView[] = [];
    for (let i = 0; i < state.nodes.length; i++) {
      if (state.nodes[i].owner === 1) ownedNodes.push(state.nodes[i]);
    }
    if (ownedNodes.length < 2) return;
    for (let i = 0; i < ownedNodes.length; i++) {
      for (let j = i + 1; j < ownedNodes.length; j++) {
        const n1 = ownedNodes[i];
        const n2 = ownedNodes[j];
        const dist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
        if (dist > 820) continue;
        const midX = (n1.x + n2.x) * 0.5;
        const midY = (n1.y + n2.y) * 0.5;
        const perpX = -(n2.y - n1.y) / Math.max(1, dist);
        const perpY = (n2.x - n1.x) / Math.max(1, dist);
        const bend = Math.sin(time * 2.2 + i * 1.7 + j * 0.9) * 18;
        const cx = midX + perpX * bend;
        const cy = midY + perpY * bend;

        this.fxUnder.moveTo(n1.x, n1.y)
          .quadraticCurveTo(cx, cy, n2.x, n2.y)
          .stroke({ width: 2.2, color: 0x66fcf1, alpha: 0.24 + Math.sin(time * 3 + i) * 0.08 });

        // Бегущий синаптический импульс по кривой Безье
        const p = (time * 0.65 + (i * 0.27 + j * 0.13)) % 1;
        const inv = 1 - p;
        const px = inv * inv * n1.x + 2 * inv * p * cx + p * p * n2.x;
        const py = inv * inv * n1.y + 2 * inv * p * cy + p * p * n2.y;
        this.fxUnder.circle(px, py, 3.2).fill({ color: 0xbdfdf8, alpha: 0.85 });
      }
    }
    // Связь игрока с ближайшим узлом нейросети, когда активен бафф регенерации
    if (state.neuralLinkActive) {
      let bestN: NodeView | null = null;
      let bestD = 1e9;
      for (const n of ownedNodes) {
        const d = Math.hypot(n.x - state.player.x, n.y - state.player.y);
        if (d < bestD) { bestD = d; bestN = n; }
      }
      if (bestN) {
        this.fxUnder.moveTo(bestN.x, bestN.y)
          .lineTo(state.player.x, state.player.y)
          .stroke({ width: 1.4, color: 0x00ff9d, alpha: 0.28 + Math.sin(time * 6) * 0.12 });
      }
    }
  }

  /** Скрыть fallback-тексты узлов при рестарте забега */
  reset(): void {
    for (const t of this.nodeTexts) t.visible = false;
    for (const t of this.nodeStatusTexts) t.visible = false;
  }
}
