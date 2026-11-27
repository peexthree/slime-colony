// Слой эффектов LUMIVORE: пульс-кольца, вспышки полигона, пятна био-крови,
// призрачный шлейф рывка, снаряды и души, цифры урона, био-радар и параллакс боке/снега.
// Все частицы живут в спрайтовых пулах: нулевые аллокации в горячем кадре.
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { SCALES } from '../engine/types';
import { RenderState, RenderTextures } from './views';
import { SpritePool, SpritePoolRegistry } from './SpritePool';

/** Пульс-кольцо: расходящийся ударный круг */
interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: number;
  alpha: number;
}

/** Данные частицы глубокого боке (плавающие клетки вне фокуса) */
interface BokehParticle {
  baseX: number;
  baseY: number;
  r: number;
  phase: number;
  alpha: number;
}

/** Данные частицы планктонной взвеси (морской снег перед линзой) */
interface SnowParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
  alpha: number;
}

export class VfxLayer {
  private rings: PulseRing[] = [];
  /** Вспышки полигона Кольца Смерти */
  private polys: { pts: { x: number; y: number }[]; life: number; color: number }[] = [];
  /** Пятна биомассы на месте погибших врагов */
  private splats: { x: number; y: number; r: number; color: number; life: number; maxLife: number }[] = [];
  /** Призрачный шлейф Фазового рывка */
  private afterimages: { x: number; y: number; r: number; life: number; color: number }[] = [];
  private afterimageCd = 0;
  /** Всплывающие цифры урона: пул Text-объектов.
   *  Раньше здесь был самодельный кэш canvas-текстур: браузер под давлением
   *  памяти вытесняет backing store офскрин-канвасов, Pixi перезаливает мусор
   *  при повторном использовании - цифры «размывались и заплывали» в кляксы
   *  (отзыв плейтеста). Text перерисовывает глифы всегда корректно. */
  private dmgPool: SpritePool<Text>;
  private dmgLive: { x: number; y: number; vy: number; life: number; color: number; txt: string }[] = [];

  /** Глубокий параллакс: пул боке-клеток и их данные */
  private bokehPool: SpritePool<Sprite>;
  private bokehData: BokehParticle[] = [];
  /** Передний план: пул планктонной взвеси и её данные */
  private snowPool: SpritePool<Sprite>;
  private snowData: SnowParticle[] = [];

  constructor(
    /** Корневой мировой контейнер: цифры урона живут поверх слоёв */
    private readonly world: Container,
    private readonly bgBokeh: Container,
    private readonly fgSnow: Container,
    private readonly fxUnder: Graphics,
    private readonly fxOver: Graphics,
    private readonly morphOverLayer: Container,
    private readonly registry: SpritePoolRegistry,
    private readonly tex: RenderTextures,
  ) {
    // Пул цифр урона: Text-объекты (стиль назначается при выдаче)
    this.dmgPool = new SpritePool<Text>(() => {
      const tx = new Text({
        text: '',
        style: {
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: 13,
          fontWeight: 'bold',
          fill: 0xffffff,
        },
      });
      tx.anchor.set(0.5);
      this.world.addChild(tx);
      return tx;
    });

    // Процедурные частицы микромира: глубокие клетки боке и планктонный морской снег
    this.bokehPool = new SpritePool<Sprite>(() => {
      const sp = new Sprite(this.tex.glow);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.visible = false;
      this.bgBokeh.addChild(sp);
      return sp;
    });
    for (let i = 0; i < 28; i++) {
      const color = i % 3 === 0 ? 0x0e7490 : i % 3 === 1 ? 0x1e3a8a : 0x064e3b;
      const sp = this.bokehPool.acquire();
      sp.tint = color;
      sp.visible = false;
      this.bokehData.push({
        baseX: (i * 137.5) % 2400,
        baseY: ((i * 223.7) % 2400),
        r: 32 + (i % 7) * 8,
        phase: i * 0.8,
        alpha: 0.045 + (i % 5) * 0.012,
      });
    }

    this.snowPool = new SpritePool<Sprite>(() => {
      const sp = new Sprite(this.tex.glow);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.visible = false;
      this.fgSnow.addChild(sp);
      return sp;
    });
    for (let i = 0; i < 35; i++) {
      const sp = this.snowPool.acquire();
      sp.tint = 0x9df5ff;
      sp.visible = false;
      this.snowData.push({
        x: (i * 91.3) % 2400,
        y: (i * 127.1) % 2400,
        r: 1.2 + (i % 3) * 0.7,
        vy: 0.4 + (i % 4) * 0.25,
        alpha: 0.25 + (i % 4) * 0.15,
      });
    }
  }

  // ================= Публичные спавн-методы (вызываются фасадом) =================

  /** Ударное пульс-кольцо в точке */
  spawnPulse(x: number, y: number, color: number, maxRadius = 90): void {
    if (this.rings.length > 14) this.rings.shift();
    this.rings.push({ x, y, radius: 8, maxRadius, color, alpha: 0.42 });
  }

  /** Вспышка полигона Кольца Смерти: обводка + слабая заливка, тает за ~0.55 сек */
  spawnPoly(pts: { x: number; y: number }[], color: number): void {
    if (this.polys.length > 6) this.polys.shift();
    this.polys.push({ pts, life: 0.55, color });
  }

  /** Пятно био-крови на месте смерти */
  spawnSplat(x: number, y: number, color: number): void {
    if (this.splats.length > 60) this.splats.shift();
    this.splats.push({ x, y, r: 8 + Math.random() * 10, color, life: 2.2, maxLife: 2.2 });
  }

  /** Всплывающая цифра урона над врагом */
  pushDamage(x: number, y: number, value: number, color: number): void {
    if (this.dmgLive.length > 40) this.dmgLive.shift();
    this.dmgLive.push({ x, y, vy: -34, life: 0.6, color, txt: String(Math.round(value)) });
  }

  // ================= Обновление за кадр =================

  /** Глубокий параллакс микромира (боке плавающих клеток в толще жидкости - спрайтовый пул) */
  updateBokehParallax(state: RenderState, time: number): void {
    this.bokehPool.releaseAll();
    const showParallax = state.settings?.parallax !== false && !!state.cam;
    const cam = state.cam;
    if (!showParallax || !cam) return;
    const pCamX = cam.x * 0.32;
    const pCamY = cam.y * 0.32;
    const wW = cam.worldW || 1200;
    const wH = cam.worldH || 1200;
    const texR = Math.max(1, this.tex.glow.width * 0.5);
    for (let i = 0; i < this.bokehData.length; i++) {
      const b = this.bokehData[i];
      const sp = this.bokehPool.acquire();
      const driftX = Math.sin(time * 0.2 + b.phase) * 35;
      const driftY = Math.cos(time * 0.18 + b.phase) * 35;
      let bx = (b.baseX + driftX + pCamX) % wW;
      let by = (b.baseY + driftY + pCamY) % wH;
      if (bx < 0) bx += wW;
      if (by < 0) by += wH;
      const pulse = 1 + Math.sin(time * 0.5 + b.phase) * 0.08;
      sp.position.set(bx, by);
      sp.scale.set((b.r * 1.6 * pulse) / texR);
      sp.alpha = b.alpha * 1.4;
    }
  }

  /** Планктонная взвесь / морской снег перед линзой объектива (спрайтовый пул) */
  updateSnowParallax(state: RenderState, time: number): void {
    this.snowPool.releaseAll();
    const cam = state.cam;
    if (state.settings?.parallax === false || !cam) return;
    const fgCamX = cam.x * 1.32;
    const fgCamY = cam.y * 1.32;
    const wW = cam.worldW || 1200;
    const wH = cam.worldH || 1200;
    const texR = Math.max(1, this.tex.glow.width * 0.5);
    for (let i = 0; i < this.snowData.length; i++) {
      const sn = this.snowData[i];
      const sp = this.snowPool.acquire();
      let sx = (sn.x + Math.sin(time * 0.7 + sn.y * 0.04) * 14 + fgCamX) % wW;
      let sy = (sn.y + (time * 16 * sn.vy) + fgCamY) % wH;
      if (sx < 0) sx += wW;
      if (sy < 0) sy += wH;
      sp.position.set(sx, sy);
      sp.scale.set((sn.r * 2.2) / texR);
      sp.alpha = sn.alpha * (0.6 + Math.sin(time * 2 + sn.x) * 0.35);
    }
  }

  /** Пятна био-крови от погибших врагов (рисуются под сущностями) */
  updateSplats(dt: number): void {
    for (let j = this.splats.length - 1; j >= 0; j--) {
      const sp = this.splats[j];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.splats.splice(j, 1);
        continue;
      }
      const a = Math.min(1, sp.life / sp.maxLife);
      this.fxUnder.circle(sp.x, sp.y, sp.r)
        .fill({ color: sp.color, alpha: 0.25 * a });
    }
  }

  /** Фазовый рывок: призрачные афтер-имиджи за организмом */
  updateDashTrail(state: RenderState, dt: number): void {
    const px = state.player.x;
    const py = state.player.y;
    const form = state.morph ? SCALES[state.morph.scaleId - 1] : null;
    const formGlow = form?.glow ?? 0x66fcf1;
    this.afterimageCd -= dt;
    if (state.dashing && this.afterimageCd <= 0) {
      this.afterimageCd = 0.028;
      if (this.afterimages.length > 10) this.afterimages.shift();
      this.afterimages.push({ x: px, y: py, r: state.player.r, life: 0.28, color: formGlow });
    }
    for (let j = this.afterimages.length - 1; j >= 0; j--) {
      const af = this.afterimages[j];
      af.life -= dt;
      if (af.life <= 0) {
        this.afterimages.splice(j, 1);
        continue;
      }
      const frac = af.life / 0.28;
      this.fxUnder.circle(af.x, af.y, af.r * (0.75 + frac * 0.45))
        .fill({ color: af.color, alpha: 0.26 * frac })
        .stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 * frac });
    }
  }

  /** Дуги Тесла-сети (Ионный Колосс) и лазеры Пси-сети */
  updateBeams(state: RenderState): void {
    for (const a of state.arcs) {
      this.fxOver.moveTo(a.x1, a.y1)
        .lineTo(a.x2, a.y2)
        .stroke({ width: 1.8, color: a.color, alpha: 0.85 });
    }
    for (const l of state.lasers) {
      this.fxOver.moveTo(l.x1, l.y1)
        .lineTo(l.x2, l.y2)
        .stroke({ width: 2.5, color: 0x9df5ff, alpha: 0.9 });
    }
  }

  /** Снаряды обеих сторон, души убитых врагов и молнии-орбиты */
  updateProjectiles(state: RenderState, time: number, px: number, py: number): void {
    // Яд плевателей (мультяшный сгусток кислотной слизи)
    this.registry.releasePool('eproj');
    this.registry.releasePool('eproj_core');
    for (const p of state.eprojs) {
      const spitTex = this.tex.particles?.spitVenom;
      const sp = this.registry.makeSprite('eproj', spitTex ? 0xffffff : 0xff2a6d, spitTex ? 'normal' : 'add', spitTex);
      sp.position.set(p.x, p.y);
      const pw = spitTex?.width || 64;
      sp.scale.set(24 / pw);
      sp.rotation = time * 4.5;
      sp.alpha = 0.98;

      if (!spitTex) {
        const c = this.registry.makeSprite('eproj_core', 0xffffff, 'normal');
        c.position.set(p.x, p.y);
        c.scale.set(6 / 64);
        c.alpha = 0.9;
      }
    }

    // Снаряды игрока: мультяшные био-шипы с направлением полета
    this.registry.releasePool('proj');
    for (const p of state.projs) {
      const needleTex = this.tex.player?.projNeedle;
      const sp = this.registry.makeSprite('proj', needleTex ? 0xffffff : 0x66fcf1, needleTex ? 'normal' : 'add', needleTex);
      sp.position.set(p.x, p.y);
      const nw = needleTex?.width || 64;
      sp.scale.set(24 / nw);
      sp.rotation = (p.vx !== undefined && p.vy !== undefined)
        ? Math.atan2(p.vy, p.vx)
        : Math.atan2(p.y - py, p.x - px);
    }

    // Души убитых врагов (полноцветная сфера + аура цвета ветки ДНК)
    this.registry.releasePool('orbGlow');
    this.registry.releasePool('orb');
    let i = 0;
    for (const o of state.xpOrbs) {
      // Дальние души притушены: после волновой зачистки поле не устилается
      // капсулами - душа вспыхивает, когда игрок к ней приближается
      const dxo = o.x - px;
      const dyo = o.y - py;
      const distFade = Math.max(0.28, 1 - Math.max(0, Math.hypot(dxo, dyo) - 420) / 520);
      const xpTex = this.tex.particles?.xpSoul;
      if (xpTex) {
        const g = this.registry.makeSprite('orbGlow', o.color, 'add');
        g.position.set(o.x, o.y);
        g.scale.set((24 + Math.min(o.value, 10)) / 64);
        g.alpha = (0.45 + 0.15 * Math.sin(time * 6 + i * 1.3)) * distFade;
      }
      const sp = this.registry.makeSprite('orb', xpTex ? 0xffffff : o.color, xpTex ? 'normal' : 'add', xpTex);
      sp.position.set(o.x, o.y);
      const ow = xpTex?.width || 64;
      sp.scale.set((16 + Math.min(o.value, 10)) / ow);
      sp.alpha = xpTex ? 0.96 * distFade : (0.75 + 0.25 * Math.sin(time * 6 + i * 1.3)) * distFade;
      sp.rotation = xpTex ? 0 : Math.atan2(py - o.y, px - o.x);
      i++;
    }

    // Молния-орбиты вокруг игрока (Wave 3: плазменные сферы с протуберанцами)
    this.registry.releasePool('orbit');
    if (state.orbit && state.orbit.count > 0) {
      for (let k = 0; k < state.orbit.count; k++) {
        const ang = state.orbit.angle + (k * Math.PI * 2) / state.orbit.count;
        const ox = state.orbit.cx + Math.cos(ang) * state.orbit.radius;
        const oy = state.orbit.cy + Math.sin(ang) * state.orbit.radius;
        const orbTex = this.tex.v3?.vfx.orbitPlasmaSphere;
        const sp = this.registry.makeSprite('orbit', orbTex ? 0xffffff : 0x9df5ff, orbTex ? 'normal' : 'add', orbTex);
        sp.position.set(ox, oy);
        if (orbTex) {
          sp.scale.set(34 / 128);
          sp.rotation = time * 3.5 + k * 1.5;
        } else {
          sp.scale.set(13 / 64);
        }
        sp.alpha = 0.96;
      }
    }
  }

  /** Ударные кольца (Wave 3: фрактальные ударные волны nova-shockwave) */
  updateRings(time: number): void {
    this.registry.releasePool('ringShockwave');
    for (let j = this.rings.length - 1; j >= 0; j--) {
      const r = this.rings[j];
      r.radius += (r.maxRadius - r.radius) * 0.12;
      r.alpha *= 0.86;
      if (this.tex.v3?.vfx.novaShockwave) {
        const sp = this.registry.makeSprite('ringShockwave', 0xffffff, 'normal', this.tex.v3.vfx.novaShockwave);
        sp.position.set(r.x, r.y);
        sp.scale.set((r.radius * 2.2) / 256);
        sp.alpha = Math.min(1, r.alpha * 1.25);
        sp.rotation = time * 1.2 + j;
      } else {
        this.fxOver.circle(r.x, r.y, r.radius)
          .stroke({ width: 1.8, color: r.color, alpha: r.alpha * 0.7 });
      }
      if (r.alpha < 0.03) this.rings.splice(j, 1);
    }
  }

  /** Всплывающие цифры урона (спрайтовый пул с кэшированными текстурами) */
  updateDamageNumbers(dt: number): void {
    for (let j = this.dmgLive.length - 1; j >= 0; j--) {
      const d = this.dmgLive[j];
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.94;
      if (d.life <= 0) this.dmgLive.splice(j, 1);
    }
    for (let j = 0; j < this.dmgLive.length; j++) {
      const d = this.dmgLive[j];
      const sp = this.dmgPool.acquire();
      sp.text = d.txt;
      sp.style.fill = `#${d.color.toString(16).padStart(6, '0')}`;
      sp.position.set(d.x, d.y);
      sp.scale.set(1 + Math.max(0, d.life - 0.35) * 0.65);
      sp.alpha = Math.min(1, d.life / 0.35);
    }
    this.dmgPool.hideRest();
  }

  /** Вспышки полигона Кольца Смерти */
  updatePolys(dt: number): void {
    for (let j = this.polys.length - 1; j >= 0; j--) {
      const p = this.polys[j];
      p.life -= dt;
      if (p.life <= 0 || p.pts.length < 3) {
        this.polys.splice(j, 1);
        continue;
      }
      const a = Math.min(1, p.life / 0.55);
      const path = p.pts;
      this.fxOver.moveTo(path[0].x, path[0].y);
      for (let k = 1; k < path.length; k++) this.fxOver.lineTo(path[k].x, path[k].y);
      this.fxOver.closePath()
        .stroke({ width: 2.5, color: p.color, alpha: 0.85 * a })
        .fill({ color: p.color, alpha: 0.10 * a });
    }
  }

  /** Рассекающие удары жвал (мандибулы) */
  updateMandibles(state: RenderState): void {
    this.registry.releasePool('mandibleSlash');
    if (!state.mandibleSwipes) return;
    for (const ms of state.mandibleSwipes) {
      const a = Math.min(1, ms.life / 0.16);
      const dirAng = Math.atan2(ms.dirY, ms.dirX);
      if (this.tex.v4?.mandiblesSlash) {
        const spSlash = this.registry.makeSprite('mandibleSlash', 0xffffff, 'normal', this.tex.v4.mandiblesSlash, this.morphOverLayer);
        spSlash.position.set(ms.x + Math.cos(dirAng) * (ms.range * 0.35), ms.y + Math.sin(dirAng) * (ms.range * 0.35));
        spSlash.rotation = dirAng;
        spSlash.scale.set((ms.range * 1.3) / 256);
        spSlash.alpha = a;
      } else {
        const startAng = dirAng - ms.arc / 2;
        const endAng = dirAng + ms.arc / 2;
        this.fxOver.arc(ms.x, ms.y, ms.range, startAng, endAng)
          .stroke({ width: 4.5 * a, color: 0xffd166, alpha: 0.9 * a });
        this.fxOver.arc(ms.x, ms.y, ms.range * 0.8, startAng + 0.1, endAng - 0.1)
          .stroke({ width: 2.0 * a, color: 0xffffff, alpha: 0.75 * a });
      }
    }
  }

  /** Био-радар: стрелки-маркеры направления на удалённые узлы и боссов */
  updateRadar(state: RenderState, time: number): void {
    this.registry.releasePool('radarArrow');
    if (!state.radarMarkers || !state.player) return;
    for (const rm of state.radarMarkers) {
      const markerDist = 95;
      const mx = state.player.x + Math.cos(rm.angle) * markerDist;
      const my = state.player.y + Math.sin(rm.angle) * markerDist;
      if (this.tex.v4?.uiRadarArrow) {
        const spArr = this.registry.makeSprite('radarArrow', 0xffffff, 'normal', this.tex.v4.uiRadarArrow, this.morphOverLayer);
        spArr.position.set(mx, my);
        spArr.rotation = rm.angle + Math.PI / 2;
        spArr.scale.set((rm.icon === 'boss' || rm.icon === 'titan' || rm.icon === 'raid' ? 28 : 22) / 64);
        spArr.alpha = 0.95;
        this.fxOver.circle(mx, my, rm.icon === 'boss' || rm.icon === 'titan' || rm.icon === 'raid' ? 12 + Math.sin(time * 8) * 2 : 10)
          .stroke({ width: 1.8, color: rm.icon === 'raid' ? 0xffb800 : rm.color, alpha: 0.88 });
      } else {
        const tipX = mx + Math.cos(rm.angle) * 12;
        const tipY = my + Math.sin(rm.angle) * 12;
        const leftX = mx + Math.cos(rm.angle + 2.4) * 8;
        const leftY = my + Math.sin(rm.angle + 2.4) * 8;
        const rightX = mx + Math.cos(rm.angle - 2.4) * 8;
        const rightY = my + Math.sin(rm.angle - 2.4) * 8;
        this.fxOver.moveTo(tipX, tipY).lineTo(leftX, leftY).lineTo(rightX, rightY).closePath()
          .fill({ color: rm.color, alpha: 0.95 });
        if (rm.icon === 'boss' || rm.icon === 'titan' || rm.icon === 'raid') {
          this.fxOver.circle(mx, my, 5 + Math.sin(time * 8) * 2)
            .stroke({ width: 2, color: rm.icon === 'raid' ? 0xffb800 : 0xff3b5c, alpha: 0.9 });
        }
      }
    }
  }

  /** Полный сброс эффектов при рестарте забега (боке/снег не трогаем - их перерисует следующий кадр) */
  reset(): void {
    this.rings.length = 0;
    this.polys.length = 0;
    this.splats.length = 0;
    this.afterimages.length = 0;
    this.afterimageCd = 0;
    this.dmgLive.length = 0;
    this.dmgPool.releaseAll();
  }
}
