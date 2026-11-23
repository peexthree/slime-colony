// PixiJS v8 слой LUMIVORE: спрайтовые пулы с аддитивным свечением, камера-слежение,
// визуальная эволюция организма (органы геномов и гибридов), живой декор биома и границы мира
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { EliteMutation, EnemyType, NodeKind, SCALE_FORM, SIM_WIDTH } from './types';
import { loadBiopunkTextures, loadBiopunkTexturesV2, loadBiopunkTexturesV3, alignTailSegment, updatePredatorPupil, EnemySpriteKey, EnemySpriteV2Key, ParticleSpriteKey, NodeSpriteKey, PlayerSpriteKey } from './svgAssets';

interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: number;
  alpha: number;
}

export interface EnemyView {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  flash: number;
  type: EnemyType;
  /** Мутация элиты: золотой ореол */
  elite: EliteMutation | null;
  /** Заражённый союзник (Паразит): таймер > 0 - ходит на вашей стороне */
  infected: number;
  /** Титан масштаба: хранитель метаморфоза */
  titan?: boolean;
  /** Споровое заражение (Споровый Реактор): зелёная пульсация */
  sporeInf?: number;
  /** Хвостик: [старые ... новые], новый ближе к телу */
  tail: { x: number; y: number }[];
}

export interface NodeView {
  x: number;
  y: number;
  radius: number;
  owner: -1 | 0 | 1;
  capture: number;
  kind: NodeKind;
}

export interface MorphView {
  /** Направление головы организма (для жвал и органов на спине) */
  dirX: number;
  dirY: number;
  /** ДНК-уровни геномов 0..3 - от них растут органы */
  vermis: number;
  chimera: number;
  mycelium: number;
  symbiont: number;
  /** Активный гибрид - меняет силуэт целиком */
  hybrid: string | null;
  /** Шкала бытия 1..5: цвет тела и декор биома */
  scaleId: number;
  /** Размер мира в мировых единицах (для декора границ) */
  worldW: number;
  worldH: number;
}

export interface RenderState {
  player: { x: number; y: number; r: number; tail: { x: number; y: number }[] };
  /** Состояние хвоста: ok > 70% ёмкости, low 40-70%, crit < 40% */
  tailState: 'ok' | 'low' | 'crit';
  /** Голод > 3 сек без душ: кончик хвоста мигает */
  tailHunger: boolean;
  /** Камера: центр в мировых координатах, зум и границы мира */
  cam: { x: number; y: number; zoom: number; worldW: number; worldH: number } | null;
  /** Морфология организма: какие органы сейчас на теле */
  morph: MorphView | null;
  enemies: EnemyView[];
  projs: { x: number; y: number }[];
  /** Яд врагов-плевателей */
  eprojs: { x: number; y: number }[];
  xpOrbs: { x: number; y: number; value: number; color: number }[];
  nodes: NodeView[];
  orbit: { count: number; cx: number; cy: number; radius: number; angle: number } | null;
  aura: { x: number; y: number; r: number } | null;
  /** Дуги Тесла-сети (Ионный Колосс): одноразовые линии на кадр */
  arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[];
  /** Лазеры Пси-сети: лучи захваченных узлов */
  lasers: { x1: number; y1: number; x2: number; y2: number }[];
}

/** Радужная текстура свечения: яркое ядро + мягкий ореол */
function makeGlowTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return Texture.from(c);
}

const ENEMY_COLORS: Record<EnemyType, number> = {
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
const ENEMY_CORES: Record<EnemyType, number> = {
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

/** Цвета хвоста по состоянию ресурса: здоровый циан -> жёлтый -> красный */
const TAIL_PALETTES: Record<'ok' | 'low' | 'crit', [number, number]> = {
  ok: [0x66fcf1, 0x9df5ff],
  low: [0xffd166, 0xffe9a3],
  crit: [0xff6b6b, 0xffb0b0],
};

/** Иконки био-узлов территории */
const NODE_ICONS: Record<NodeKind, string> = {
  gen: '🔋',
  amp: '⚡',
  magnet: '🧲',
  mutagen: '🧬',
  incubator: '💜',
};

export class PixiOverlay {
  private app = new Application();
  private glowTex!: Texture;
  private enemyTextures?: Record<string, Texture>;
  private particleTextures?: Record<ParticleSpriteKey, Texture>;
  private nodeTextures?: Record<NodeSpriteKey, Texture>;
  private playerTextures?: Record<PlayerSpriteKey, Texture>;
  /** Мир: контейнер для камеры (перемещение и зум происходят здесь) */
  private world = new Container();
  private fxUnder = new Graphics();    // биом, мембраны границ и ауры под сущностями
  private entityLayer = new Container();
  private organLayer = new Graphics(); // морфология организма: жвалы, шипы, усики, кристаллы
  private fxOver = new Graphics();     // полоски HP, вспышки, кольца, лазеры
  private rings: PulseRing[] = [];
  /** Вспышки полигона Кольца Смерти */
  private polys: { pts: { x: number; y: number }[]; life: number; color: number }[] = [];
  private shakeT = 0;

  private playerGlow!: Sprite;
  private playerCore!: Sprite;
  private v3Textures?: Awaited<ReturnType<typeof loadBiopunkTexturesV3>>;
  private predatorEyeSprite!: Sprite;
  private predatorPupilSprite!: Sprite;
  private predatorEyeSprite2!: Sprite;
  private predatorPupilSprite2!: Sprite;

  private pools = new Map<string, Sprite[]>();
  private poolCursor = new Map<string, number>();
  private nodeTexts: Text[] = [];
  /** Всплывающие цифры урона: спрайтовый пул с кэшированными текстурами */
  private dmgSprites: Sprite[] = [];
  private dmgTextureCache = new Map<string, Texture>();
  private dmgLive: { x: number; y: number; vy: number; life: number; color: number; txt: string }[] = [];

  private getDamageTexture(txt: string): Texture {
    let tex = this.dmgTextureCache.get(txt);
    if (!tex) {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
      const m = ctx.measureText(txt);
      c.width = Math.ceil(m.width) + 8;
      c.height = 20;
      ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, c.width / 2, c.height / 2);
      tex = Texture.from(c);
      this.dmgTextureCache.set(txt, tex);
    }
    return tex;
  }

  get screenWidth(): number {
    return this.app.screen.width;
  }
  get screenHeight(): number {
    return this.app.screen.height;
  }
  get scale(): number {
    return this.sx();
  }

  async init(canvas: HTMLCanvasElement, container: HTMLElement): Promise<void> {
    await this.app.init({
      canvas,
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      preference: 'webgpu',
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    this.glowTex = makeGlowTexture();
    try {
      const bioTex = await loadBiopunkTextures();
      const bioTexV2 = await loadBiopunkTexturesV2();
      const bioTexV3 = await loadBiopunkTexturesV3();
      this.enemyTextures = { ...bioTex.enemies, ...bioTexV2.enemies };
      this.particleTextures = bioTex.particles;
      this.nodeTextures = bioTex.nodes;
      this.playerTextures = bioTexV2.player;
      this.v3Textures = bioTexV3;
    } catch (e) {
      console.warn('Failed to load biopunk vector textures, falling back to glowTex', e);
    }

    this.app.stage.addChild(this.world);
    this.world.addChild(this.fxUnder);
    this.world.addChild(this.entityLayer);
    this.world.addChild(this.organLayer);
    this.world.addChild(this.fxOver);

    this.playerGlow = this.makeSprite('player', 0x66fcf1, 'add');
    this.playerCore = this.makeSprite('playerCore', 0xffffff, 'normal');
    this.predatorEyeSprite = this.makeSprite('predEye1', 0xffffff, 'normal', this.v3Textures?.eye.predatorEye);
    this.predatorPupilSprite = this.makeSprite('predPupil1', 0xffffff, 'normal', this.v3Textures?.eye.predatorPupil);
    this.predatorEyeSprite2 = this.makeSprite('predEye2', 0xffffff, 'normal', this.v3Textures?.eye.predatorEye);
    this.predatorPupilSprite2 = this.makeSprite('predPupil2', 0xffffff, 'normal', this.v3Textures?.eye.predatorPupil);
    this.predatorEyeSprite.visible = false;
    this.predatorPupilSprite.visible = false;
    this.predatorEyeSprite2.visible = false;
    this.predatorPupilSprite2.visible = false;
  }

  /** O(1): после releasePool курсор с нуля, каждый take занимает следующий слот */
  private makeSprite(poolKey: string, tint: number, blend: 'add' | 'normal', customTex?: Texture): Sprite {
    const pool = this.pools.get(poolKey) ?? [];
    this.pools.set(poolKey, pool);
    const idx = this.poolCursor.get(poolKey) ?? 0;
    this.poolCursor.set(poolKey, idx + 1);
    let s: Sprite;
    const targetTex = customTex ?? this.glowTex;
    if (idx < pool.length) {
      s = pool[idx];
      if (s.texture !== targetTex) {
        s.texture = targetTex;
      }
    } else {
      s = new Sprite(targetTex);
      s.anchor.set(0.5);
      s.visible = false;
      this.entityLayer.addChild(s);
      pool.push(s);
    }
    s.visible = true;
    s.tint = tint;
    s.blendMode = blend;
    s.rotation = 0;
    return s;
  }

  private releasePool(poolKey: string): void {
    const pool = this.pools.get(poolKey);
    if (pool) pool.forEach((sp) => (sp.visible = false));
    this.poolCursor.set(poolKey, 0);
  }

  spawnPulse(x: number, y: number, color: number, maxRadius = 90): void {
    if (this.rings.length > 40) this.rings.shift();
    this.rings.push({ x, y, radius: 8, maxRadius, color, alpha: 0.85 });
  }

  /** Вспышка полигона Кольца Смерти: обводка + слабая заливка, тает за ~0.55 сек */
  spawnPoly(pts: { x: number; y: number }[], color: number): void {
    if (this.polys.length > 6) this.polys.shift();
    this.polys.push({ pts, life: 0.55, color });
  }

  /** Всплывающая цифра урона над врагом */
  pushDamage(x: number, y: number, value: number, color: number): void {
    if (this.dmgLive.length > 40) this.dmgLive.shift();
    this.dmgLive.push({ x, y, vy: -34, life: 0.6, color, txt: String(Math.round(value)) });
  }

  /** Тряска экрана при уроне и нове */
  beginShake(duration: number): void {
    this.shakeT = Math.max(this.shakeT, duration);
  }

  /** Базовый масштаб видового окна (960px -> screen width) */
  private sx(): number {
    return this.app.screen.width / SIM_WIDTH;
  }

  render(state: RenderState, time: number, dt: number): void {
    const s = this.sx();
    this.fxUnder.clear();
    this.organLayer.clear();
    this.fxOver.clear();

    // Камера слежения: центрируется на игроке, плавно масштабирует весь мир
    const cam = state.cam;
    const k = (cam ? cam.zoom : 1.0) * s;
    if (cam) {
      this.world.scale.set(k);
      this.world.position.set(
        this.app.screen.width / 2 - cam.x * k,
        this.app.screen.height / 2 - cam.y * k
      );
    } else {
      this.world.scale.set(s);
      this.world.position.set(0, 0);
    }

    // Живой декор биома под сущностями: среда, граница арены, циркуляция
    if (state.morph && cam) {
      this.drawBiome(state.morph, time, s, cam);
    }

    // Тряска экрана: случайное смещение сцены
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const intensity = this.shakeT * 32;
      this.app.stage.position.set((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    } else {
      this.app.stage.position.set(0, 0);
    }

    // Аура токсина под сущностями в мировых координатах (Wave 3: мембрана с биением ресничек)
    this.releasePool('auraCilia');
    if (state.aura) {
      if (this.v3Textures?.vfx.auraCiliaMembrane) {
        const sp = this.makeSprite('auraCilia', 0xff3b5c, 'add', this.v3Textures.vfx.auraCiliaMembrane);
        sp.position.set(state.aura.x, state.aura.y);
        sp.scale.set((state.aura.r * 2.2) / 256);
        sp.rotation = time * 0.8;
        sp.alpha = 0.55 + Math.sin(time * 4) * 0.15;
      } else {
        this.fxUnder.circle(state.aura.x, state.aura.y, state.aura.r)
          .fill({ color: 0xff3b5c, alpha: 0.06 })
          .stroke({ width: 1.5, color: 0xff3b5c, alpha: 0.25 + Math.sin(time * 5) * 0.08 });
      }
    }

    // ---- Узлы территории: мягкое свечение + кольцо владельца + дуга захвата ----
    this.releasePool('nodeGlow');
    this.releasePool('nodeIco');
    for (let i = 0; i < state.nodes.length; i++) {
      const n = state.nodes[i];
      const col = n.owner === 1 ? 0x66fcf1 : n.owner === -1 ? 0xc084fc : 0x5a7186;
      const pulse = 0.8 + Math.sin(time * 2.4 + i * 1.7) * 0.2;
      const glow = this.makeSprite('nodeGlow', col, 'add');
      glow.position.set(n.x, n.y);
      glow.scale.set((n.radius * 3.4) / 64);
      glow.alpha = 0.16 + (n.owner !== 0 ? 0.12 : 0) + pulse * 0.06;

      this.fxOver.circle(n.x, n.y, n.radius * pulse)
        .stroke({ width: 1.5, color: col, alpha: 0.5 });

      // Дуга прогресса захвата
      const cf = Math.min(1, Math.abs(n.capture));
      if (cf > 0.02) {
        this.fxOver.moveTo(n.x + Math.cos(-Math.PI / 2) * (n.radius + 5), n.y + Math.sin(-Math.PI / 2) * (n.radius + 5));
        this.fxOver.arc(n.x, n.y, n.radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cf)
          .stroke({ width: 3, color: n.capture > 0 ? 0x66fcf1 : 0xc084fc, alpha: 0.85 });
      }

      // Векторная био-иконка типа узла
      const nodeTex = this.nodeTextures?.[n.kind];
      if (nodeTex) {
        const ico = this.makeSprite('nodeIco', col, 'normal', nodeTex);
        ico.position.set(n.x, n.y);
        const tw = nodeTex.width || 32;
        ico.scale.set((n.radius * 1.1) / tw);
        ico.alpha = 0.95;
      } else {
        let txt = this.nodeTexts[i];
        if (!txt) {
          txt = new Text({
            text: NODE_ICONS[n.kind],
            style: { fontSize: 14, fill: 0xffffff, fontFamily: 'Segoe UI Emoji, Consolas, monospace' },
          });
          txt.anchor.set(0.5);
          txt.alpha = 0.9;
          this.world.addChild(txt);
          this.nodeTexts.push(txt);
        }
        txt.visible = true;
        txt.position.set(n.x, n.y);
      }
    }
    const hideFrom = this.nodeTextures ? 0 : state.nodes.length;
    for (let j = hideFrom; j < this.nodeTexts.length; j++) this.nodeTexts[j].visible = false;

    // Хвост светляка: цепь сегментов от тела к кончику (Анатомия Wave 3)
    this.releasePool('ptail');
    this.releasePool('ptail_vert');
    this.releasePool('ptail_stinger');
    const tail = state.player.tail;
    const tn = tail.length;
    const [tc1, tc2] = TAIL_PALETTES[state.tailState];
    const critPulse = state.tailState === 'crit' ? 0.55 + Math.abs(Math.sin(time * 9)) * 0.45 : 1;
    const tipBlink = state.tailHunger && Math.sin(time * 12) > 0;
    // Прореживаем сегменты при огромной длине хвоста, чтобы не перегружать сцену и не сливать в сплошной коридор
    const step = tn > 70 ? Math.ceil(tn / 70) : 1;
    for (let i = 0; i < tn; i += step) {
      const frac = (tn - 1 - i) / Math.max(1, tn - 1);
      const segR = state.player.r * (0.95 - 0.65 * frac);
      let alpha = (0.78 * (1 - frac * 0.45) + 0.14) * critPulse;
      if (i === 0 && tipBlink) alpha *= 0.12;
      const tint = (i / step) % 2 === 0 ? tc1 : tc2;

      // Тангенс сочленения: точка впереди по цепи к голове
      const prevX = i < tn - 1 ? tail[i + 1].x : state.player.x;
      const prevY = i < tn - 1 ? tail[i + 1].y : state.player.y;

      if (i === 0 && this.v3Textures?.tail.tailStinger) {
        // Кончик хвоста: ядовитое хитиновое жало со светящейся ампулой
        const sp = this.makeSprite('ptail_stinger', tint, 'normal', this.v3Textures.tail.tailStinger);
        alignTailSegment(sp, tail[i].x, tail[i].y, prevX, prevY);
        sp.scale.set((segR * 2.8) / 128);
        sp.alpha = alpha;
      } else if (this.v3Textures?.tail.tailVertebra) {
        // Хитиновый позвонок с отогнутыми рёбрами и нервным каналом
        const sp = this.makeSprite('ptail_vert', tint, 'normal', this.v3Textures.tail.tailVertebra);
        alignTailSegment(sp, tail[i].x, tail[i].y, prevX, prevY);
        sp.scale.set((segR * 2.6) / 128);
        sp.alpha = alpha;
      } else {
        const sp = this.makeSprite('ptail', tint, 'normal');
        sp.position.set(tail[i].x, tail[i].y);
        sp.scale.set((segR * 2.0) / 64);
        sp.alpha = alpha;
      }
    }

    // Игрок: ядро и аура текущей шкалы бытия (компактные пропорции)
    const px = state.player.x;
    const py = state.player.y;
    const form = state.morph ? SCALE_FORM[state.morph.scaleId] : null;
    this.playerGlow.position.set(px, py);
    this.playerGlow.scale.set((state.player.r * 2.3) / 64);
    this.playerGlow.alpha = 0.42 + Math.sin(time * 5) * 0.08;
    if (form) this.playerGlow.tint = form.glow;

    // Живое ядро клетки Светляка с вращающимися органеллами
    const nucTex = this.playerTextures?.playerNucleus;
    if (nucTex && this.playerCore.texture !== nucTex) {
      this.playerCore.texture = nucTex;
    }
    this.playerCore.position.set(px, py);
    const nucW = nucTex?.width || 128;
    this.playerCore.scale.set((state.player.r * 1.9) / nucW);
    this.playerCore.rotation = time * 0.35;
    if (form) this.playerCore.tint = form.core;

    // Визуальная эволюция: челюсти, шипы, споры, кристаллы, крылья и ауры гибридов
    if (state.morph) {
      this.drawOrgans(state, time, s, px, py);
    } else {
      if (this.predatorEyeSprite) this.predatorEyeSprite.visible = false;
      if (this.predatorPupilSprite) this.predatorPupilSprite.visible = false;
      if (this.predatorEyeSprite2) this.predatorEyeSprite2.visible = false;
      if (this.predatorPupilSprite2) this.predatorPupilSprite2.visible = false;
    }

    // Враги: пул спрайтов
    this.releasePool('enemy');
    this.releasePool('enemyCore');
    this.releasePool('etail');
    this.releasePool('eliteHalo');
    this.releasePool('enemyShield');
    for (const e of state.enemies) {
      const isDead = e.hp <= 0;
      const spored = (e.sporeInf ?? 0) > 0;
      const baseTint = e.infected ? 0x66fcf1 : spored ? 0x86efac : ENEMY_COLORS[e.type];
      const coreTint = e.infected ? 0xdffffc : spored ? 0xd8ffd8 : ENEMY_CORES[e.type];

      // Обычный урон НЕ ослепляет игрока белой заливкой; только смерть или вспышка босса
      const flashWhite = isDead || (e.flash > 0.08 && (e.type === 'boss' || e.titan));

      let tex: Texture | undefined;
      if (e.titan) {
        tex = this.enemyTextures?.titan;
      } else {
        switch (e.type) {
          case 'grub':
            tex = this.enemyTextures?.grub;
            break;
          case 'runner':
            tex = this.enemyTextures?.runner;
            break;
          case 'spitter':
            tex = this.enemyTextures?.spitter;
            break;
          case 'brute':
            tex = this.enemyTextures?.brute;
            break;
          case 'pulsar':
            tex = this.enemyTextures?.pulsar;
            break;
          case 'boss':
            tex = this.enemyTextures?.titan;
            break;
          case 'healer':
            tex = this.enemyTextures?.healer;
            break;
          case 'mirror':
            tex = this.enemyTextures?.mirror;
            break;
          case 'colony':
            tex = this.enemyTextures?.colony;
            break;
          case 'splitter':
            tex = this.enemyTextures?.splitter;
            break;
          case 'brood':
            tex = this.enemyTextures?.brood;
            break;
        }
      }

      const sp = this.makeSprite('enemy', flashWhite ? 0xffffff : baseTint, 'normal', tex);
      sp.position.set(e.x, e.y);
      const texW = (tex && tex.width) ? tex.width : 64;
      const pulse = e.type === 'colony' ? (1 + 0.06 * Math.sin(time * 4)) : 1;
      sp.scale.set(((e.radius * 2.3) / texW) * pulse);
      sp.alpha = 0.95;

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
        rot = Math.sin(time * 0.9) * 0.15;
      }
      sp.rotation = rot;

      const core = this.makeSprite('enemyCore', flashWhite ? 0xffffff : coreTint, 'normal');
      core.position.set(e.x, e.y);
      core.scale.set((e.radius * 0.65) / 64);
      core.alpha = 0.85;

      // Хвостик врага: масштаб хвоста соразмерен радиусу врага
      const et = e.tail;
      const en = et.length;
      for (let i = 0; i < en; i++) {
        const frac = (en - 1 - i) / Math.max(1, en - 1);
        const seg = this.makeSprite('etail', ENEMY_COLORS[e.type], 'normal');
        seg.position.set(et[i].x, et[i].y);
        seg.scale.set((e.radius * (0.85 - 0.55 * frac)) / 64);
        seg.alpha = 0.55 * (1 - frac) + 0.12;
      }

      if (e.type === 'boss' || e.type === 'brute' || e.elite) {
        const progress = Math.max(0, e.hp / e.maxHp);
        const r = e.radius + 9;
        this.fxOver.moveTo(e.x + Math.cos(-Math.PI / 2) * r, e.y + Math.sin(-Math.PI / 2) * r);
        this.fxOver.arc(e.x, e.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
          .stroke({ width: 2.5, color: ENEMY_HP_ARC_COLOR, alpha: 0.85 });
      }

      if (e.elite) {
        if (this.v3Textures?.overlays.eliteCrownHalo) {
          const spHalo = this.makeSprite('eliteHalo', 0xffd166, 'add', this.v3Textures.overlays.eliteCrownHalo);
          spHalo.position.set(e.x, e.y);
          spHalo.scale.set(((e.radius + 14) * 2.3) / 256);
          spHalo.rotation = time * 1.4;
          spHalo.alpha = 0.88;
        } else {
          const haloR = e.radius + 6 + Math.sin(time * 5) * 1.5;
          this.fxOver.circle(e.x, e.y, haloR)
            .stroke({ width: 2, color: 0xffd166, alpha: 0.75 });
        }
      }

      if (e.type === 'mirror' && this.v3Textures?.overlays.shieldBarrier) {
        const spShield = this.makeSprite('enemyShield', 0x7df9ff, 'add', this.v3Textures.overlays.shieldBarrier);
        spShield.position.set(e.x, e.y);
        spShield.scale.set(((e.radius + 8) * 2.4) / 256);
        spShield.rotation = -time * 0.8;
        spShield.alpha = 0.82;
      }

      if (e.titan) {
        const tr = e.radius + 12 + Math.sin(time * 3.2) * 3;
        this.fxOver.circle(e.x, e.y, tr)
          .stroke({ width: 2.5, color: 0xffffff, alpha: 0.85 });
        this.fxOver.circle(e.x, e.y, tr + 7)
          .stroke({ width: 1.5, color: 0x9df5ff, alpha: 0.5 + Math.sin(time * 4.4) * 0.3 });
      }
    }

    // Дуги Тесла-сети (Ионный Колосс)
    for (const a of state.arcs) {
      this.fxOver.moveTo(a.x1, a.y1)
        .lineTo(a.x2, a.y2)
        .stroke({ width: 1.8, color: a.color, alpha: 0.85 });
    }

    // Лазеры Пси-сети
    for (const l of state.lasers) {
      this.fxOver.moveTo(l.x1, l.y1)
        .lineTo(l.x2, l.y2)
        .stroke({ width: 2.5, color: 0x9df5ff, alpha: 0.9 });
    }

    // Яд плевателей
    this.releasePool('eproj');
    for (const p of state.eprojs) {
      const sp = this.makeSprite('eproj', 0x39ff14, 'add', this.particleTextures?.spitVenom);
      sp.position.set(p.x, p.y);
      const pw = this.particleTextures?.spitVenom?.width || 64;
      sp.scale.set(16 / pw);
      sp.rotation = time * 4;
      sp.alpha = 0.95;
    }

    // Снаряды игрока: кинетические био-шипы с направлением полета
    this.releasePool('proj');
    for (const p of state.projs) {
      const needleTex = this.playerTextures?.projNeedle;
      const sp = this.makeSprite('proj', 0x66fcf1, 'add', needleTex);
      sp.position.set(p.x, p.y);
      const nw = needleTex?.width || 64;
      sp.scale.set(22 / nw);
      sp.rotation = Math.atan2(p.y - py, p.x - px);
    }

    // Души убитых врагов (хвост плазмоида ориентирован назад от вектора к игроку)
    this.releasePool('orb');
    let i = 0;
    for (const o of state.xpOrbs) {
      const sp = this.makeSprite('orb', o.color, 'add', this.particleTextures?.xpSoul);
      sp.position.set(o.x, o.y);
      const ow = this.particleTextures?.xpSoul?.width || 64;
      sp.scale.set((16 + Math.min(o.value, 10)) / ow);
      sp.alpha = 0.75 + 0.25 * Math.sin(time * 6 + i * 1.3);
      sp.rotation = Math.atan2(py - o.y, px - o.x);
      i++;
    }

    // Молния-орбиты вокруг игрока (Wave 3: плазменные сферы с протуберанцами)
    this.releasePool('orbit');
    if (state.orbit && state.orbit.count > 0) {
      for (let k = 0; k < state.orbit.count; k++) {
        const ang = state.orbit.angle + (k * Math.PI * 2) / state.orbit.count;
        const ox = state.orbit.cx + Math.cos(ang) * state.orbit.radius;
        const oy = state.orbit.cy + Math.sin(ang) * state.orbit.radius;
        const orbTex = this.v3Textures?.vfx.orbitPlasmaSphere;
        const sp = this.makeSprite('orbit', 0x9df5ff, orbTex ? 'normal' : 'add', orbTex);
        sp.position.set(ox, oy);
        if (orbTex) {
          sp.scale.set(34 / 128);
          sp.rotation = time * 3.5 + k * 1.5;
        } else {
          sp.scale.set(13 / 64);
        }
        sp.alpha = 0.95;
      }
    }

    // Ударные кольца (Wave 3: фрактальные ударные волны nova-shockwave)
    this.releasePool('ringShockwave');
    for (let j = this.rings.length - 1; j >= 0; j--) {
      const r = this.rings[j];
      r.radius += (r.maxRadius - r.radius) * 0.11;
      r.alpha *= 0.90;
      if (this.v3Textures?.vfx.novaShockwave) {
        const sp = this.makeSprite('ringShockwave', r.color, 'add', this.v3Textures.vfx.novaShockwave);
        sp.position.set(r.x, r.y);
        sp.scale.set((r.radius * 2.2) / 256);
        sp.alpha = r.alpha;
        sp.rotation = time * 1.2 + j;
      } else {
        this.fxOver.circle(r.x, r.y, r.radius)
          .stroke({ width: 2, color: r.color, alpha: r.alpha });
      }
      if (r.alpha < 0.04) this.rings.splice(j, 1);
    }

    // Всплывающие цифры урона (спрайтовый пул с кэшированными текстурами)
    for (let j = this.dmgLive.length - 1; j >= 0; j--) {
      const d = this.dmgLive[j];
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.94;
      if (d.life <= 0) {
        if (j < this.dmgSprites.length) this.dmgSprites[j].visible = false;
        this.dmgLive.splice(j, 1);
        continue;
      }
      let sp = this.dmgSprites[j];
      const tex = this.getDamageTexture(d.txt);
      if (!sp) {
        sp = new Sprite(tex);
        sp.anchor.set(0.5);
        this.world.addChild(sp);
        this.dmgSprites.push(sp);
      } else if (sp.texture !== tex) {
        sp.texture = tex;
      }
      sp.visible = true;
      sp.position.set(d.x, d.y);
      sp.tint = d.color;
      sp.alpha = Math.min(1, d.life / 0.35);
    }
    for (let j = this.dmgLive.length; j < this.dmgSprites.length; j++) this.dmgSprites[j].visible = false;

    // Вспышки полигона Кольца Смерти
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

  /**
   * Живая среда биома:
   * 1. Светящаяся био-мембрана границы мира (граница текущего масштаба).
   * 2. Процедурные живые элементы среды (вакуоли, волокна ткани, планктон, магма, фракталы).
   */
  private drawBiome(
    morph: MorphView,
    time: number,
    s: number,
    cam: { x: number; y: number; zoom: number; worldW: number; worldH: number }
  ): void {
    const scaleId = morph.scaleId;
    const w = cam.worldW;
    const h = cam.worldH;

    const wallCol = scaleId === 1 ? 0x66fcf1
      : scaleId === 2 ? 0xff3b5c
      : scaleId === 3 ? 0x3b82f6
      : scaleId === 4 ? 0xf97316
      : 0xa855f7;

    // 1. Граница мира: светящаяся био-мембрана
    this.fxUnder.rect(0, 0, w, h)
      .stroke({ width: 3.5, color: wallCol, alpha: 0.65 + Math.sin(time * 3) * 0.2 });
    this.fxUnder.rect(-10, -10, w + 20, h + 20)
      .stroke({ width: 1.5, color: wallCol, alpha: 0.22 });

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
    const halfW = (this.app.screen.width / 2) / (s * cam.zoom) + 120;
    const halfH = (this.app.screen.height / 2) / (s * cam.zoom) + 120;
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
            const py = cy + p * 9 + drift;
            const px = cx + Math.sin(time * 2 + p * 0.8) * 5;
            this.fxUnder.circle(px, py, 2.5)
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
    this.releasePool('biomeMacro');
    if (this.v3Textures?.biomes) {
      let biomeTex: Texture | null = null;
      let biomeTint = 0x66fcf1;
      if (scaleId === 1) {
        biomeTex = this.v3Textures.biomes.diatomShell;
        biomeTint = 0x66fcf1;
      } else if (scaleId === 2) {
        biomeTex = this.v3Textures.biomes.capillaryNode;
        biomeTint = 0xff3b5c;
      } else if (scaleId === 3) {
        biomeTex = this.v3Textures.biomes.bioValve;
        biomeTint = 0x3b82f6;
      } else if (scaleId === 4) {
        biomeTex = this.v3Textures.biomes.abyssalSpore;
        biomeTint = 0xf97316;
      } else {
        biomeTex = this.v3Textures.biomes.sacredFractal;
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
            const sp = this.makeSprite('biomeMacro', biomeTint, 'add', biomeTex);
            sp.position.set(floatX, floatY);
            const size = 110 + rnd * 120;
            sp.scale.set(size / 256);
            sp.rotation = time * 0.08 * (rnd > 0.7 ? 1 : -1) + rnd * Math.PI * 2;
            sp.alpha = 0.09 + rnd * 0.08;
          }
        }
      }
    }
  }

  /**
   * Визуальная эволюция организма:
   * Жвалы (Вермис), Шипы и Плазменный Рог (Химера), Споры и Усики (Мицелий),
   * Фазовые Кристаллы и Крылья (Симбионт), плюс уникальные силуэты Великих Гибридов.
   */
  private drawOrgans(state: RenderState, time: number, _s: number, px: number, py: number): void {
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

      if (this.v3Textures?.eye) {
        if (lvl >= 2) {
          // 2 стереоскопических глаза по бокам головы
          for (const side of [-1, 1]) {
            const isLeft = side === -1;
            const eyeSp = isLeft ? this.predatorEyeSprite : this.predatorEyeSprite2;
            const pupSp = isLeft ? this.predatorPupilSprite : this.predatorPupilSprite2;
            const eyeAngle = ang + side * 0.52;
            const eyeX = px + Math.cos(eyeAngle) * (r * 0.65);
            const eyeY = py + Math.sin(eyeAngle) * (r * 0.65);
            eyeSp.texture = this.v3Textures.eye.predatorEye;
            eyeSp.position.set(eyeX, eyeY);
            eyeSp.rotation = ang;
            eyeSp.scale.set((r * 0.72) / 128);
            eyeSp.visible = true;

            pupSp.texture = this.v3Textures.eye.predatorPupil;
            pupSp.rotation = ang;
            pupSp.scale.set((r * 0.72) / 64);
            updatePredatorPupil(pupSp, eyeX, eyeY, targetX, targetY, (r * 0.12), ang);
            pupSp.position.x += eyeX;
            pupSp.position.y += eyeY;
            pupSp.visible = true;
          }
        } else {
          // 1 циклопический глаз хищника по центру лба
          const eyeX = px + Math.cos(ang) * (r * 0.52);
          const eyeY = py + Math.sin(ang) * (r * 0.52);
          this.predatorEyeSprite.texture = this.v3Textures.eye.predatorEye;
          this.predatorEyeSprite.position.set(eyeX, eyeY);
          this.predatorEyeSprite.rotation = ang;
          this.predatorEyeSprite.scale.set((r * 0.85) / 128);
          this.predatorEyeSprite.visible = true;

          this.predatorPupilSprite.texture = this.v3Textures.eye.predatorPupil;
          this.predatorPupilSprite.rotation = ang;
          this.predatorPupilSprite.scale.set((r * 0.85) / 64);
          updatePredatorPupil(this.predatorPupilSprite, eyeX, eyeY, targetX, targetY, (r * 0.16), ang);
          this.predatorPupilSprite.position.x += eyeX;
          this.predatorPupilSprite.position.y += eyeY;
          this.predatorPupilSprite.visible = true;

          this.predatorEyeSprite2.visible = false;
          this.predatorPupilSprite2.visible = false;
        }
      }
    } else {
      if (this.predatorEyeSprite) this.predatorEyeSprite.visible = false;
      if (this.predatorPupilSprite) this.predatorPupilSprite.visible = false;
      if (this.predatorEyeSprite2) this.predatorEyeSprite2.visible = false;
      if (this.predatorPupilSprite2) this.predatorPupilSprite2.visible = false;
    }

    // ================= 2. ХИМЕРА (Костяные Шипы, Плазменный Рог) =================
    if (morph.chimera > 0) {
      const lvl = morph.chimera;
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
        const cTipX = cx + cosA * crestLen;
        const cTipY = cy + sinA * crestLen;

        this.organLayer.moveTo(cx - perpX * 4, cy - perpY * 4)
          .lineTo(cTipX, cTipY)
          .lineTo(cx + perpX * 4, cy + perpY * 4)
          .fill({ color: 0xff3b5c, alpha: 0.9 })
          .stroke({ width: 2, color: 0xffd166, alpha: 0.95 });
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
        const numAntenna = 4;
        for (let j = 0; j < numAntenna; j++) {
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

      if (lvl >= 2) {
        const ringRad = r * (1.3 + Math.sin(time * 3) * 0.1);
        this.organLayer.ellipse(px, py, ringRad, ringRad * 0.35)
          .stroke({ width: 1.6, color: cryCol, alpha: 0.65 });
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

    // ================= 5. ВЕЛИКИЕ ГИБРИДЫ (APEX СИЛУЭТЫ) =================
    if (morph.hybrid) {
      const hyd = morph.hybrid;
      if (hyd === 'plasma_leviathan') {
        this.organLayer.circle(px, py, r * 1.45)
          .stroke({ width: 3, color: 0xff4d00, alpha: 0.75 + Math.sin(time * 8) * 0.2 });
        for (const side of [-1, 1]) {
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
}
