// Оверлеи Великих Гибридов LUMIVORE: мультяшная аура и эмблема поверх организма,
// плюс процедурные APEX-силуэты (плазменный Левиафан, Уроборос, Фазовый Змей и др.).
import { Container, Graphics, Sprite } from 'pixi.js';
import { HybridSpriteKey } from '../engine/svgAssets';
import { HybridId } from '../engine/types';
import { MorphView, RenderTextures } from './views';

export class HybridOverlays {
  private hybridAura!: Sprite;
  private hybridCrest!: Sprite;

  constructor(
    private readonly entityLayer: Container,
    private readonly floorLayer: Container,
    private readonly organLayer: Graphics,
    private readonly tex: RenderTextures,
  ) {
    // Порядок добавления задаёт z-порядок: аура под всем в floorLayer, эмблема под телом в entityLayer
    this.hybridAura = new Sprite(this.tex.glow);
    this.hybridAura.anchor.set(0.5);
    this.hybridAura.visible = false;
    this.floorLayer.addChild(this.hybridAura);

    this.hybridCrest = new Sprite(this.tex.glow);
    this.hybridCrest.anchor.set(0.5);
    this.hybridCrest.blendMode = 'normal';
    this.hybridCrest.visible = false;
    this.entityLayer.addChild(this.hybridCrest);
  }

  /** Скрыть ауру и эмблему (при гибели организма или отсутствии гибрида) */
  hide(): void {
    this.hybridAura.visible = false;
    this.hybridCrest.visible = false;
  }

  /** ================= 5. ВЕЛИКИЕ ГИБРИДЫ (APEX СИЛУЭТЫ И МУЛЬТЯШНЫЕ АУРЫ) ================= */
  update(morph: MorphView, time: number, px: number, py: number, ang: number, r: number): void {
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    if (morph.hybrid && this.tex.v4?.hybridAuras && morph.hybrid in this.tex.v4.hybridAuras) {
      const aTex = this.tex.v4.hybridAuras[morph.hybrid as HybridId];
      this.hybridAura.texture = aTex;
      this.hybridAura.position.set(px, py);
      this.hybridAura.scale.set((r * 4.2) / 256);
      this.hybridAura.rotation = time * 0.35;
      this.hybridAura.tint = 0xffffff;
      this.hybridAura.alpha = 0.86;
      this.hybridAura.visible = true;
    } else {
      this.hybridAura.visible = false;
    }
    if (morph.hybrid && this.tex.hybrids && morph.hybrid in this.tex.hybrids) {
      const hTex = this.tex.hybrids[morph.hybrid as HybridSpriteKey];
      this.hybridCrest.texture = hTex;
      this.hybridCrest.position.set(px, py);
      this.hybridCrest.scale.set((r * 3.1) / (hTex.width || 128));
      this.hybridCrest.rotation = time * 0.45;
      this.hybridCrest.tint = 0xffffff;
      this.hybridCrest.blendMode = 'normal';
      this.hybridCrest.alpha = 0.52 + Math.sin(time * 3.2) * 0.1;
      this.hybridCrest.visible = true;
    } else {
      this.hybridCrest.visible = false;
    }
    if (!morph.hybrid) return;
    const hyd = morph.hybrid;
    if (hyd === 'plasma_leviathan') {
      this.organLayer.circle(px, py, r * 1.45)
        .stroke({ width: 3, color: 0xff4d00, alpha: 0.75 + Math.sin(time * 8) * 0.2 });
      for (const side of [-1, 1]) {
        const perpX = -sinA;
        const perpY = cosA;
        const hX = px + cosA * (r * 0.9) + perpX * side * (r * 0.6);
        const hY = py + sinA * (r * 0.9) + perpY * side * (r * 0.6);
        this.organLayer.moveTo(hX, hY)
          .lineTo(hX + cosA * (r * 0.8) + perpX * side * 12, hY + sinA * (r * 0.8) + perpY * side * 12)
          .stroke({ width: 3.5, color: 0xffd166, alpha: 0.95 });
      }
    } else if (hyd === 'ouroboros') {
      const oRad = r * 1.4;
      this.organLayer.circle(px, py, oRad)
        .stroke({ width: 2.5, color: 0x86efac, alpha: 0.8 });
      for (let k = 0; k < 6; k++) {
        const rotK = time * 3 + k * (Math.PI / 3);
        const kx = px + Math.cos(rotK) * oRad;
        const ky = py + Math.sin(rotK) * oRad;
        this.organLayer.circle(kx, ky, 4)
          .fill({ color: 0x66fcf1, alpha: 0.9 });
      }
    } else if (hyd === 'phase_serpent') {
      this.organLayer.circle(px + Math.sin(time * 9) * 4, py, r * 1.3)
        .stroke({ width: 2, color: 0x66fcf1, alpha: 0.7 });
      this.organLayer.circle(px - Math.sin(time * 9) * 4, py, r * 1.3)
        .stroke({ width: 2, color: 0xffd166, alpha: 0.7 });
    } else if (hyd === 'spore_reactor') {
      for (let j = 0; j < 4; j++) {
        const gAng = time * 2.5 + j * (Math.PI / 2);
        const gx = px + Math.cos(gAng) * (r * 1.2);
        const gy = py + Math.sin(gAng) * (r * 1.2);
        this.organLayer.circle(gx, gy, 6 + Math.sin(time * 7 + j) * 2)
          .fill({ color: 0xa3ff6b, alpha: 0.5 })
          .stroke({ width: 1.5, color: 0xff3b5c, alpha: 0.8 });
      }
    } else if (hyd === 'ion_colossus') {
      const colRad = r * 1.6;
      for (let j = 0; j < 5; j++) {
        const a1 = time * 2 + j * ((Math.PI * 2) / 5);
        const a2 = time * 2 + (((j + 2) % 5) * (Math.PI * 2)) / 5;
        const x1 = px + Math.cos(a1) * colRad;
        const y1 = py + Math.sin(a1) * colRad;
        const x2 = px + Math.cos(a2) * colRad;
        const y2 = py + Math.sin(a2) * colRad;
        this.organLayer.moveTo(x1, y1).lineTo(x2, y2)
          .stroke({ width: 1.8, color: 0x9df5ff, alpha: 0.75 });
      }
    } else if (hyd === 'psi_web') {
      this.organLayer.circle(px + cosA * (r * 0.9), py + sinA * (r * 0.9), 6)
        .fill({ color: 0xffffff, alpha: 1.0 })
        .stroke({ width: 2.5, color: 0xc084fc, alpha: 0.9 });
      this.organLayer.circle(px, py, r * 1.5)
        .stroke({ width: 1.2, color: 0xc084fc, alpha: 0.5 + Math.sin(time * 5) * 0.3 });
    }
  }
}
