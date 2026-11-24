// Генератор «Портрета организма» - PNG-карточка итогов забега (1280x720).
// Стиль: неон / биолюминесценция, тёмный фон, моноширинный шрифт.
// Исключения не бросаются: при любых проблемах рисуем максимум возможного.

export interface PortraitInput {
  branch:
    | 'neutral'
    | 'vermis'
    | 'chimera'
    | 'mycelium'
    | 'symbiont'
    | 'plasma_leviathan'
    | 'ouroboros'
    | 'phase_serpent'
    | 'spore_reactor'
    | 'ion_colossus'
    | 'psi_web';
  weapons: string[]; // id открытых оружий: 'spikes' | 'orbs' | 'nova' | 'aura'
  tail: { x: number; y: number }[]; // точки хвоста в координатах 960x540, [старые...новые]
  bodyRadius: number; // радиус тела в координатах 960x540
  stats: {
    time: number;
    kills: number;
    level: number;
    tailMax: number;
    nodesHeld: number;
    damage: number;
    points: number;
    record: boolean;
    scale?: number; // номер масштаба бытия 1..5 (опционально, дефолт 1)
  };
}

export const PORTRAIT_W = 1280;
export const PORTRAIT_H = 720;

type Vec = { x: number; y: number };
type RGB = [number, number, number];
type Branch = PortraitInput['branch'];

interface BranchStyle {
  name: string; // крупное имя организма
  tag: string; // подпись ветки в шапке
  color: string;
  dim: string; // приглушённый оттенок для глубины
}

const BRANCHES: Record<Branch, BranchStyle> = {
  neutral: { name: 'ОСОБЬ', tag: 'ГЕНОМ: БАЗОВЫЙ', color: '#9df5ff', dim: '#264d59' },
  // чистые геномы
  vermis: { name: 'ВЕРМИС', tag: 'ГЕНОМ: ВЕРМИС', color: '#66fcf1', dim: '#1d5a55' },
  chimera: { name: 'ХИМЕРА', tag: 'ГЕНОМ: ХИМЕРА', color: '#ff7b93', dim: '#5f2231' },
  mycelium: { name: 'МИЦЕЛИЙ', tag: 'ГЕНОМ: МИЦЕЛИЙ', color: '#a3ff6b', dim: '#2c5c1d' },
  symbiont: { name: 'СИМБИОНТ', tag: 'ГЕНОМ: СИМБИОНТ', color: '#ffd166', dim: '#5f4a1d' },
  // гибриды
  plasma_leviathan: { name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', tag: 'ГИБРИД: ВЕРМИС+ХИМЕРА', color: '#ff9d5c', dim: '#5f2b12' },
  ouroboros: { name: 'УРОБОРОС-ПАРАЗИТ', tag: 'ГИБРИД: ВЕРМИС+МИЦЕЛИЙ', color: '#7bffb0', dim: '#1d5c3c' },
  phase_serpent: { name: 'ФАЗОВЫЙ ЗМЕЙ', tag: 'ГИБРИД: ВЕРМИС+СИМБИОНТ', color: '#9db4ff', dim: '#232d5f' },
  spore_reactor: { name: 'СПОРОВЫЙ РЕАКТОР', tag: 'ГИБРИД: ХИМЕРА+МИЦЕЛИЙ', color: '#d9ff6b', dim: '#3f5c1d' },
  ion_colossus: { name: 'ИОННЫЙ КОЛОСС', tag: 'ГИБРИД: ХИМЕРА+СИМБИОНТ', color: '#6bd6ff', dim: '#124d5f' },
  psi_web: { name: 'ПСИ-СЕТЬ', tag: 'ГИБРИД: МИЦЕЛИЙ+СИМБИОНТ', color: '#c8a2ff', dim: '#3c2460' },
};

const MONO = "'JetBrains Mono', 'Cascadia Mono', Consolas, 'Courier New', monospace";
const TAU = Math.PI * 2;
const WHITE: RGB = [255, 255, 255];
const GOLD = '#ffd166';

// ---------- утилиты ----------

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function hexRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h
        .split('')
        .map((c) => c + c)
        .join('')
    : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [157, 245, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp(t, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

/** Детерминированный PRNG - одинаковый ввод даёт одинаковый портрет */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setTracking(ctx: CanvasRenderingContext2D, px: number): void {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`;
}

/** Скруглённый прямоугольник (свой путь - без опоры на roundRect) */
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fmtNum(n: number): string {
  try {
    return Math.round(n).toLocaleString('ru-RU');
  } catch {
    return String(Math.round(n));
  }
}

// ---------- нормализация входа ----------

function normInput(input: PortraitInput | null | undefined) {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<PortraitInput>;
  const st = (typeof raw.stats === 'object' && raw.stats !== null ? raw.stats : {}) as Partial<PortraitInput['stats']>;
  const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const b = raw.branch;
  const branch: Branch = b && b in BRANCHES ? b : 'neutral';
  const tail = Array.isArray(raw.tail)
    ? raw.tail
        .filter(
          (p): p is Vec =>
            !!p && typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y),
        )
        .map((p) => ({ x: p.x, y: p.y }))
    : [];
  return {
    branch,
    weapons: Array.isArray(raw.weapons) ? raw.weapons.filter((w): w is string => typeof w === 'string') : [],
    tail,
    bodyRadius: clamp(num(raw.bodyRadius, 26), 8, 130),
    stats: {
      time: Math.max(0, num(st.time)),
      kills: Math.max(0, Math.floor(num(st.kills))),
      level: Math.max(0, Math.floor(num(st.level))),
      tailMax: Math.max(0, Math.floor(num(st.tailMax))),
      nodesHeld: Math.max(0, Math.floor(num(st.nodesHeld))),
      damage: Math.max(0, num(st.damage)),
      points: Math.max(0, Math.floor(num(st.points))),
      record: st.record === true,
      scale: clamp(Math.floor(num(st.scale, 1)), 1, 5), // масштаб бытия 1..5, дефолт 1
    },
  };
}

type NormInput = ReturnType<typeof normInput>;

// ---------- фон ----------

/** Процедурная подложка: тёмный градиент, звёздный шум, мягкие свечения */
function drawProcedural(ctx: CanvasRenderingContext2D, rng: () => number, col: RGB): void {
  for (let i = 0; i < 4; i++) {
    const gx = rng() * PORTRAIT_W;
    const gy = rng() * PORTRAIT_H;
    const gr = 120 + rng() * 260;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, rgba(col, 0.07));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }
  // звёздный шум
  for (let i = 0; i < 260; i++) {
    const a = 0.08 + rng() * 0.4;
    const s = 0.5 + rng() * 1.4;
    ctx.fillStyle = `rgba(190,220,230,${a.toFixed(3)})`;
    ctx.fillRect(rng() * PORTRAIT_W, rng() * PORTRAIT_H, s, s);
  }
  // крупные светила с ореолом
  for (let i = 0; i < 14; i++) {
    const x = rng() * PORTRAIT_W;
    const y = rng() * PORTRAIT_H;
    ctx.save();
    ctx.shadowColor = rgba(col, 0.8);
    ctx.shadowBlur = 10;
    ctx.fillStyle = rgba(col, 0.8);
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement | null, rng: () => number, col: RGB): void {
  ctx.fillStyle = '#03070c';
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);
  let painted = false;
  if (bg && bg.width > 0 && bg.height > 0) {
    try {
      // cover-вписка снимка physarum-поля
      const s = Math.max(PORTRAIT_W / bg.width, PORTRAIT_H / bg.height);
      const w = bg.width * s;
      const h = bg.height * s;
      ctx.drawImage(bg, (PORTRAIT_W - w) / 2, (PORTRAIT_H - h) / 2, w, h);
      painted = true;
    } catch {
      painted = false;
    }
  }
  if (!painted) drawProcedural(ctx, rng, col);
  // затемнение поля
  ctx.fillStyle = 'rgba(2,6,10,0.5)';
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);
  // тонкая техно-сетка
  ctx.strokeStyle = rgba(col, 0.05);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = 32; gx < PORTRAIT_W; gx += 64) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, PORTRAIT_H);
  }
  for (let gy = 32; gy < PORTRAIT_H; gy += 64) {
    ctx.moveTo(0, gy);
    ctx.lineTo(PORTRAIT_W, gy);
  }
  ctx.stroke();
  // виньетка
  const v = ctx.createRadialGradient(PORTRAIT_W / 2, PORTRAIT_H / 2, PORTRAIT_H * 0.35, PORTRAIT_W / 2, PORTRAIT_H / 2, PORTRAIT_W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);
}

// ---------- организм ----------

/** Хвост: сегменты с градиентом и утончением от кончика к телу + био-узлы */
function drawTail(ctx: CanvasRenderingContext2D, pts: Vec[], r: number, col: RGB, dim: RGB): void {
  const n = pts.length;
  if (n < 2) return;
  const passes = [
    { blur: 22, wMul: 2.8, aMul: 0.3 }, // мягкое свечение
    { blur: 0, wMul: 1, aMul: 1 }, // чёткое ядро
  ];
  for (const pass of passes) {
    ctx.save();
    if (pass.blur > 0) {
      ctx.shadowColor = rgba(col, 0.8);
      ctx.shadowBlur = pass.blur;
    }
    for (let i = 0; i < n - 1; i++) {
      const t = i / (n - 1); // 0 - кончик, 1 - тело
      const tt = t * t; // яркость нарастает к телу
      ctx.strokeStyle = rgba(mix(dim, col, 0.2 + 0.8 * tt), (0.1 + 0.9 * tt) * pass.aMul);
      ctx.lineWidth = Math.max(1, (1.5 + r * 0.55 * t) * pass.wMul);
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // светящиеся био-узлы вдоль хвоста
  for (let i = 2; i < n - 1; i += 3) {
    const t = i / (n - 1);
    ctx.fillStyle = rgba(col, 0.3 + 0.6 * t);
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, 1.5 + t * 2.5, 0, TAU);
    ctx.fill();
  }
}

/** Шипы: треугольные выросты по кругу тела */
function drawSpikes(ctx: CanvasRenderingContext2D, c: Vec, r: number, col: RGB, rng: () => number): void {
  ctx.save();
  ctx.shadowColor = rgba(col, 0.7);
  ctx.shadowBlur = 10;
  const count = 12;
  for (let k = 0; k < count; k++) {
    const ang = (k / count) * TAU + 0.26 + rng() * 0.14;
    const len = r * (0.7 + rng() * 0.4);
    const bx = c.x + Math.cos(ang) * r * 0.85;
    const by = c.y + Math.sin(ang) * r * 0.85;
    const tx = c.x + Math.cos(ang) * (r * 0.85 + len);
    const ty = c.y + Math.sin(ang) * (r * 0.85 + len);
    const px = -Math.sin(ang);
    const py = Math.cos(ang);
    const hw = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(bx + px * hw, by + py * hw);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - px * hw, by - py * hw);
    ctx.closePath();
    ctx.fillStyle = rgba(col, 0.8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(col, 1);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Тело: ореол, сфера с бликом, обод, мембрана, ядро */
function drawBody(ctx: CanvasRenderingContext2D, c: Vec, r: number, col: RGB, dim: RGB): void {
  const halo = ctx.createRadialGradient(c.x, c.y, r * 0.4, c.x, c.y, r * 2.6);
  halo.addColorStop(0, rgba(col, 0.4));
  halo.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 2.6, 0, TAU);
  ctx.fill();

  const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.35, r * 0.1, c.x, c.y, r * 1.05);
  g.addColorStop(0, rgba(WHITE, 0.95));
  g.addColorStop(0.45, rgba(col, 0.95));
  g.addColorStop(1, rgba(dim, 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = rgba(col, 0.9);
  ctx.shadowBlur = 14;
  ctx.strokeStyle = rgba(col, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r + 1, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = rgba(col, 0.25);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.2, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = rgba(WHITE, 0.85);
  ctx.beginPath();
  ctx.arc(c.x - r * 0.18, c.y - r * 0.18, Math.max(2, r * 0.14), 0, TAU);
  ctx.fill();
}

/** Аура: пульс - концентрические полупрозрачные окружности */
function drawAura(ctx: CanvasRenderingContext2D, c: Vec, r: number, col: RGB): void {
  const g = ctx.createRadialGradient(c.x, c.y, r * 0.8, c.x, c.y, r * 2.4);
  g.addColorStop(0, rgba(col, 0.12));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 2.4, 0, TAU);
  ctx.fill();
  const rings = [
    { rr: r * 1.5, a: 0.45 },
    { rr: r * 1.95, a: 0.28 },
    { rr: r * 2.4, a: 0.15 },
  ];
  for (const ring of rings) {
    ctx.strokeStyle = rgba(col, ring.a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, ring.rr, 0, TAU);
    ctx.stroke();
  }
}

/** Нова: светящееся кольцо с рисками */
function drawNova(ctx: CanvasRenderingContext2D, c: Vec, r: number, col: RGB): void {
  ctx.save();
  ctx.shadowColor = rgba(col, 0.9);
  ctx.shadowBlur = 16;
  ctx.strokeStyle = rgba(col, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.5, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(col, 0.2);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.66, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r1 = r * 1.5;
    const r2 = r * 1.5 + (i % 3 === 0 ? 10 : 5);
    ctx.strokeStyle = rgba(col, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1);
    ctx.lineTo(c.x + Math.cos(a) * r2, c.y + Math.sin(a) * r2);
    ctx.stroke();
  }
}

/** Орбиты: кольца + светящиеся сферы на них */
function drawOrbs(ctx: CanvasRenderingContext2D, c: Vec, r: number, col: RGB, rng: () => number): void {
  const ring1 = r * 1.85;
  const ring2 = r * 2.65;
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = rgba(col, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c.x, c.y, ring1, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, ring2, 0, TAU);
  ctx.stroke();
  ctx.restore();
  const base = rng() * TAU;
  const spheres = [
    { ang: base, ring: ring1 },
    { ang: base + Math.PI, ring: ring1 },
    { ang: base + Math.PI / 2, ring: ring2 },
  ];
  for (const s of spheres) {
    const x = c.x + Math.cos(s.ang) * s.ring;
    const y = c.y + Math.sin(s.ang) * s.ring;
    const sr = Math.max(5, r * 0.2);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, sr * 2.4);
    glow.addColorStop(0, rgba(col, 0.55));
    glow.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, sr * 2.4, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(x - sr * 0.3, y - sr * 0.3, sr * 0.1, x, y, sr);
    g.addColorStop(0, rgba(WHITE, 0.95));
    g.addColorStop(0.5, rgba(col, 0.95));
    g.addColorStop(1, rgba(col, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, sr, 0, TAU);
    ctx.fill();
  }
}

/** Вписать организм из 960x540 в левую зону карточки с сохранением пропорций */
function drawOrganism(ctx: CanvasRenderingContext2D, inp: NormInput, col: RGB, dim: RGB, rng: () => number): void {
  const box = { x: 70, y: 158, w: 700, h: 448 };
  const pts = inp.tail.length ? inp.tail : [{ x: 480, y: 270 }];
  const bodySrc = pts[pts.length - 1]; // «новая» точка хвоста - у тела
  let minX = bodySrc.x - inp.bodyRadius;
  let maxX = bodySrc.x + inp.bodyRadius;
  let minY = bodySrc.y - inp.bodyRadius;
  let maxY = bodySrc.y + inp.bodyRadius;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 34; // запас под ореол и выросты
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const scale = clamp(Math.min(box.w / (bw + pad * 2), box.h / (bh + pad * 2)), 0.3, 2.2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tx = box.x + box.w / 2;
  const ty = box.y + box.h / 2;
  const map = (p: Vec): Vec => ({ x: tx + (p.x - cx) * scale, y: ty + (p.y - cy) * scale });
  const body = map(bodySrc);
  const r = Math.max(16, inp.bodyRadius * scale);
  const ptsT = pts.map(map);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawTail(ctx, ptsT, r, col, dim);
  if (inp.weapons.includes('spikes')) drawSpikes(ctx, body, r, col, rng);
  if (inp.weapons.includes('cysts')) {
    for (let i = 1; i < ptsT.length; i += Math.max(3, Math.floor(ptsT.length / 4))) {
      ctx.fillStyle = 'rgba(57,255,20,0.45)';
      ctx.strokeStyle = 'rgba(134,239,172,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ptsT[i].x, ptsT[i].y, Math.max(4, r * 0.25), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }
  drawBody(ctx, body, r, col, dim);
  if (inp.weapons.includes('mandibles')) {
    const prev = ptsT.length >= 2 ? ptsT[ptsT.length - 2] : { x: body.x - 1, y: body.y };
    const ang = Math.atan2(body.y - prev.y, body.x - prev.x);
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      const a0 = ang + side * 0.45;
      const a1 = ang + side * 0.12;
      ctx.beginPath();
      ctx.moveTo(body.x + Math.cos(a0) * r * 0.85, body.y + Math.sin(a0) * r * 0.85);
      ctx.lineTo(body.x + Math.cos(a1) * r * 1.55, body.y + Math.sin(a1) * r * 1.55);
      ctx.stroke();
    }
  }
  if (inp.weapons.includes('aura')) drawAura(ctx, body, r, col);
  if (inp.weapons.includes('nova')) drawNova(ctx, body, r, col);
  if (inp.weapons.includes('orbs')) drawOrbs(ctx, body, r, col, rng);
  ctx.restore();
}

// ---------- оформление карточки ----------

function drawRecordBadge(ctx: CanvasRenderingContext2D): void {
  const label = '★ РЕКОРД';
  ctx.font = `700 20px ${MONO}`;
  setTracking(ctx, 2);
  const w = ctx.measureText(label).width + 44;
  const h = 44;
  const x = PORTRAIT_W - 70 - w;
  const y = 62;
  rrPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = 'rgba(255,209,102,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.shadowColor = 'rgba(255,209,102,0.6)';
  ctx.shadowBlur = 14;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';
}

function drawHeader(ctx: CanvasRenderingContext2D, style: BranchStyle, record: boolean, scale: number): void {
  const col = hexRgb(style.color);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setTracking(ctx, 5);
  ctx.font = `500 17px ${MONO}`;
  ctx.fillStyle = 'rgba(140,175,185,0.9)';
  // строка метаданных: тег ветки + масштаб бытия
  const meta = `ОРГАНИЗМ // ${style.tag} // ШКАЛА: ${scale}/5`;
  ctx.fillText(meta, 70, 76);
  setTracking(ctx, 2);
  ctx.font = `700 58px ${MONO}`;
  ctx.shadowColor = rgba(col, 0.7);
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f4fdff';
  ctx.fillText(style.name, 68, 138);
  ctx.shadowBlur = 0;
  // акцентная плашка под названием
  ctx.fillStyle = rgba(col, 0.9);
  ctx.fillRect(70, 150, 150, 3);
  ctx.fillStyle = rgba(col, 0.35);
  ctx.fillRect(228, 150, 90, 3);
  if (record) drawRecordBadge(ctx);
}

function drawStatsPanel(ctx: CanvasRenderingContext2D, stats: NormInput['stats'], col: RGB): void {
  const x = 812;
  const y = 168;
  const w = 398;
  const rowH = 48;
  const rows: [string, string][] = [
    ['ВРЕМЯ', fmtTime(stats.time)],
    ['УБИЙСТВА', fmtNum(stats.kills)],
    ['УРОВЕНЬ', String(stats.level)],
    ['МАКС. ХВОСТ', String(stats.tailMax)],
    ['БИО-УЗЛЫ', String(stats.nodesHeld)],
    ['УРОН', fmtNum(stats.damage)],
    ['ОЧКИ БИОЛАБА', fmtNum(stats.points)],
  ];
  const h = 66 + rows.length * rowH;
  rrPath(ctx, x, y, w, h, 14);
  ctx.fillStyle = 'rgba(4,12,18,0.78)';
  ctx.fill();
  ctx.strokeStyle = rgba(col, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  // заголовок панели
  setTracking(ctx, 3);
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = rgba(col, 0.75);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ТЕЛЕМЕТРИЯ ЗАБЕГА', x + 24, y + 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 48);
  ctx.lineTo(x + w - 16, y + 48);
  ctx.stroke();
  // строки: подпись слева, значение справа
  rows.forEach(([label, value], i) => {
    const ry = y + 78 + i * rowH;
    setTracking(ctx, 2);
    ctx.font = `500 14px ${MONO}`;
    ctx.fillStyle = 'rgba(150,180,190,0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 24, ry);
    const last = i === rows.length - 1;
    setTracking(ctx, 0);
    ctx.font = `700 ${last ? 26 : 24}px ${MONO}`;
    ctx.fillStyle = last ? rgba(col, 1) : '#eafcff';
    if (last) {
      ctx.shadowColor = rgba(col, 0.8);
      ctx.shadowBlur = 12;
    }
    ctx.textAlign = 'right';
    ctx.fillText(value, x + w - 24, ry);
    ctx.shadowBlur = 0;
  });
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  setTracking(ctx, 6);
  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = 'rgba(150,190,200,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LUMIVORE // ПОРТРЕТ ОРГАНИЗМА', PORTRAIT_W / 2, PORTRAIT_H - 34);
}

/** Неоновые уголки рамки + едва заметная окантовка */
function drawFrame(ctx: CanvasRenderingContext2D, col: RGB): void {
  const inset = 22;
  const len = 30;
  ctx.strokeStyle = rgba(col, 0.14);
  ctx.lineWidth = 1;
  ctx.strokeRect(inset, inset, PORTRAIT_W - inset * 2, PORTRAIT_H - inset * 2);
  ctx.strokeStyle = rgba(col, 0.65);
  ctx.lineWidth = 2;
  const corner = (x: number, y: number, dx: number, dy: number): void => {
    ctx.beginPath();
    ctx.moveTo(x + dx * len, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * len);
    ctx.stroke();
  };
  corner(inset, inset, 1, 1);
  corner(PORTRAIT_W - inset, inset, -1, 1);
  corner(inset, PORTRAIT_H - inset, 1, -1);
  corner(PORTRAIT_W - inset, PORTRAIT_H - inset, -1, -1);
}

// ---------- публичное API ----------

/**
 * Отрисовать карточку «Портрет организма» 1280x720.
 * bg - снимок GPU-канваса с physarum-полем (может быть null - процедурный фон со звёздами).
 */
export function renderPortrait(bg: HTMLCanvasElement | null, input: PortraitInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_W;
  canvas.height = PORTRAIT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  try {
    const inp = normInput(input);
    const style = BRANCHES[inp.branch];
    const col = hexRgb(style.color);
    const dim = hexRgb(style.dim);
    const seed = (inp.stats.time * 1000 + inp.stats.kills * 7 + inp.stats.level * 131 + inp.stats.tailMax * 17) | 0;
    const rng = mulberry32(seed);
    drawBackground(ctx, bg, rng, col);
    drawOrganism(ctx, inp, col, dim, rng);
    drawHeader(ctx, style, inp.stats.record, inp.stats.scale);
    drawStatsPanel(ctx, inp.stats, col);
    drawFooter(ctx);
    drawFrame(ctx, col);
  } catch {
    // рисование не удалось полностью - возвращаем канвас как есть, без исключений
  }
  return canvas;
}

/** Скачать канвас как PNG через toBlob -> временная ссылка download */
export function downloadPortrait(canvas: HTMLCanvasElement, filename: string): void {
  let done = false;
  const name = (filename && filename.trim() ? filename.trim() : 'lumivore-portrait.png').replace(/\.png$/i, '') + '.png';
  const fallback = (): void => {
    // запасной путь: data URL (например, если toBlob недоступен)
    if (done) return;
    done = true;
    try {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // совсем без прав на сохранение - тихо выходим
    }
  };
  try {
    if (typeof canvas.toBlob !== 'function') {
      fallback();
      return;
    }
    canvas.toBlob(
      (blob) => {
        try {
          if (!blob) {
            fallback();
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch {
          fallback();
        }
      },
      'image/png',
    );
  } catch {
    fallback();
  }
}
