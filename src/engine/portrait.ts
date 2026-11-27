// Генератор «Портрета организма» - PNG-карточка итогов забега (1280x720).
// Стиль: неон / биолюминесценция, тёмный фон, моноширинный шрифт.
// Исключения не бросаются: при любых проблемах рисуем максимум возможного.
import { getLocale, t } from '../i18n';
import type { I18nKey } from '../i18n';
import { dnaName, hybridName, scaleName, scaleSub } from '../i18n/gameData';
import { HYBRIDS } from './types';
import type { DnaBranch, DnaBranchOrNeutral, HybridId } from './types';

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
type Box = { x: number; y: number; w: number; h: number };
type Branch = PortraitInput['branch'];

interface BranchStyle {
  name: string; // крупное имя организма
  nameEn: string;
  tag: string; // подпись ветки в шапке
  tagEn: string;
  color: string;
  dim: string; // приглушённый оттенок для глубины
}

const BRANCHES: Record<Branch, BranchStyle> = {
  neutral: { name: 'ОСОБЬ', nameEn: 'SPECIMEN', tag: 'ГЕНОМ: БАЗОВЫЙ', tagEn: 'GENOME: BASE', color: '#9df5ff', dim: '#264d59' },
  vermis: { name: 'ВЕРМИС', nameEn: 'VERMIS', tag: 'ГЕНОМ: ВЕРМИС', tagEn: 'GENOME: VERMIS', color: '#66fcf1', dim: '#1d5a55' },
  chimera: { name: 'ХИМЕРА', nameEn: 'CHIMERA', tag: 'ГЕНОМ: ХИМЕРА', tagEn: 'GENOME: CHIMERA', color: '#ff7b93', dim: '#5f2231' },
  mycelium: { name: 'МИЦЕЛИЙ', nameEn: 'MYCELIUM', tag: 'ГЕНОМ: МИЦЕЛИЙ', tagEn: 'GENOME: MYCELIUM', color: '#a3ff6b', dim: '#2c5c1d' },
  symbiont: { name: 'СИМБИОНТ', nameEn: 'SYMBIONT', tag: 'ГЕНОМ: СИМБИОНТ', tagEn: 'GENOME: SYMBIONT', color: '#ffd166', dim: '#5f4a1d' },
  plasma_leviathan: { name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', nameEn: 'PLASMA LEVIATHAN', tag: 'ГИБРИД: ВЕРМИС+ХИМЕРА', tagEn: 'HYBRID: VERMIS+CHIMERA', color: '#ff9d5c', dim: '#5f2b12' },
  ouroboros: { name: 'УРОБОРОС-ПАРАЗИТ', nameEn: 'OUROBOROS PARASITE', tag: 'ГИБРИД: ВЕРМИС+МИЦЕЛИЙ', tagEn: 'HYBRID: VERMIS+MYCELIUM', color: '#7bffb0', dim: '#1d5c3c' },
  phase_serpent: { name: 'ФАЗОВЫЙ ЗМЕЙ', nameEn: 'PHASE SERPENT', tag: 'ГИБРИД: ВЕРМИС+СИМБИОНТ', tagEn: 'HYBRID: VERMIS+SYMBIONT', color: '#9db4ff', dim: '#232d5f' },
  spore_reactor: { name: 'СПОРОВЫЙ РЕАКТОР', nameEn: 'SPORE REACTOR', tag: 'ГИБРИД: ХИМЕРА+МИЦЕЛИЙ', tagEn: 'HYBRID: CHIMERA+MYCELIUM', color: '#d9ff6b', dim: '#3f5c1d' },
  ion_colossus: { name: 'ИОННЫЙ КОЛОСС', nameEn: 'ION COLOSSUS', tag: 'ГИБРИД: ХИМЕРА+СИМБИОНТ', tagEn: 'HYBRID: CHIMERA+SYMBIONT', color: '#6bd6ff', dim: '#124d5f' },
  psi_web: { name: 'ПСИ-СЕТЬ', nameEn: 'PSI-WEB', tag: 'ГИБРИД: МИЦЕЛИЙ+СИМБИОНТ', tagEn: 'HYBRID: MYCELIUM+SYMBIONT', color: '#c8a2ff', dim: '#3c2460' },
};

const WEAPON_LABELS: Record<string, { ru: string; en: string }> = {
  spikes: { ru: 'ШИПЫ', en: 'SPIKES' },
  orbs: { ru: 'ОРБИТЫ', en: 'ORBS' },
  nova: { ru: 'НОВА', en: 'NOVA' },
  aura: { ru: 'АУРА', en: 'AURA' },
  mandibles: { ru: 'ЖВАЛЫ', en: 'MANDIBLES' },
  cysts: { ru: 'ЦИСТЫ', en: 'CYSTS' },
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

/** Разбивка текста на строки по ширине (для лора шкалы и строки ДНК) */
function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(cand).width <= maxWidth) cur = cand;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
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

/** Минимальный вход для рисования организма (общий для портрета и карточки) */
interface OrganismDrawInput {
  weapons: string[];
  tail: Vec[];
  bodyRadius: number;
}

/** Вписать организм из 960x540 в заданную зону с сохранением пропорций */
function drawOrganism(
  ctx: CanvasRenderingContext2D,
  inp: OrganismDrawInput,
  col: RGB,
  dim: RGB,
  rng: () => number,
  box: Box = { x: 70, y: 158, w: 700, h: 448 },
): void {
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

function drawRecordBadge(ctx: CanvasRenderingContext2D, en: boolean, cw: number = PORTRAIT_W, cy: number = 62): void {
  const label = en ? '★ RECORD' : '★ РЕКОРД';
  ctx.font = `700 20px ${MONO}`;
  setTracking(ctx, 2);
  const w = ctx.measureText(label).width + 44;
  const h = 44;
  const x = cw - 70 - w;
  const y = cy;
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

function drawHeader(ctx: CanvasRenderingContext2D, style: BranchStyle, record: boolean, scale: number, en: boolean): void {
  const col = hexRgb(style.color);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setTracking(ctx, 5);
  ctx.font = `500 17px ${MONO}`;
  ctx.fillStyle = 'rgba(176,208,218,0.92)';
  const tagText = en ? style.tagEn : style.tag;
  const orgWord = en ? 'ORGANISM' : 'ОРГАНИЗМ';
  const scaleWord = en ? 'SCALE' : 'ШКАЛА';
  const meta = `${orgWord} // ${tagText} // ${scaleWord}: ${scale}/5`;
  ctx.fillText(meta, 70, 76);
  setTracking(ctx, 2);
  ctx.font = `700 54px ${MONO}`;
  ctx.shadowColor = rgba(col, 0.7);
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f4fdff';
  const titleText = en ? style.nameEn : style.name;
  ctx.fillText(titleText, 68, 136, record ? 830 : 1120);
  ctx.shadowBlur = 0;
  // акцентная плашка под названием
  ctx.fillStyle = rgba(col, 0.9);
  ctx.fillRect(70, 150, 150, 3);
  ctx.fillStyle = rgba(col, 0.35);
  ctx.fillRect(228, 150, 90, 3);
  if (record) drawRecordBadge(ctx, en);
}

function drawWeaponsStrip(ctx: CanvasRenderingContext2D, weapons: string[], col: RGB, en: boolean): void {
  if (!weapons.length) return;
  let wx = 70;
  const wy = PORTRAIT_H - 96;
  ctx.font = `700 13px ${MONO}`;
  setTracking(ctx, 1.5);
  for (const wId of weapons.slice(0, 6)) {
    const lbl = WEAPON_LABELS[wId]?.[en ? 'en' : 'ru'] ?? wId.toUpperCase();
    const bw = ctx.measureText(lbl).width + 24;
    rrPath(ctx, wx, wy, bw, 30, 8);
    ctx.fillStyle = rgba(col, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.48);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#eafcff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, wx + bw / 2, wy + 15);
    wx += bw + 10;
  }
  ctx.textBaseline = 'alphabetic';
}

function drawStatsPanel(ctx: CanvasRenderingContext2D, stats: NormInput['stats'], col: RGB, en: boolean): void {
  const x = 812;
  const y = 168;
  const w = 398;
  const rowH = 48;
  const rows: [string, string][] = en
    ? [
        ['TIME', fmtTime(stats.time)],
        ['KILLS', fmtNum(stats.kills)],
        ['LEVEL', String(stats.level)],
        ['MAX TAIL', String(stats.tailMax)],
        ['BIO-NODES', String(stats.nodesHeld)],
        ['DAMAGE', fmtNum(stats.damage)],
        ['BIOLAB PTS', fmtNum(stats.points)],
      ]
    : [
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
  ctx.fillStyle = 'rgba(4,12,18,0.84)';
  ctx.fill();
  ctx.strokeStyle = rgba(col, 0.45);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // заголовок панели
  setTracking(ctx, 3);
  ctx.font = `700 13px ${MONO}`;
  ctx.fillStyle = rgba(col, 0.88);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(en ? 'RUN TELEMETRY' : 'ТЕЛЕМЕТРИЯ ЗАБЕГА', x + 24, y + 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 48);
  ctx.lineTo(x + w - 16, y + 48);
  ctx.stroke();
  // строки: подпись слева, значение справа
  rows.forEach(([label, value], i) => {
    const ry = y + 78 + i * rowH;
    setTracking(ctx, 2);
    ctx.font = `500 14px ${MONO}`;
    ctx.fillStyle = 'rgba(186,214,224,0.88)';
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

function drawFooter(ctx: CanvasRenderingContext2D, en: boolean): void {
  setTracking(ctx, 6);
  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = 'rgba(170,208,218,0.68)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(en ? 'LUMIVORE // ORGANISM PORTRAIT' : 'LUMIVORE // ПОРТРЕТ ОРГАНИЗМА', PORTRAIT_W / 2, PORTRAIT_H - 34);
}

/** Неоновые уголки рамки + едва заметная окантовка (размер параметризован) */
function drawFrame(ctx: CanvasRenderingContext2D, col: RGB, w: number = PORTRAIT_W, h: number = PORTRAIT_H): void {
  const inset = 22;
  const len = 30;
  ctx.strokeStyle = rgba(col, 0.14);
  ctx.lineWidth = 1;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
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
  corner(w - inset, inset, -1, 1);
  corner(inset, h - inset, 1, -1);
  corner(w - inset, h - inset, -1, -1);
}

// ---------- Карточка организма (шаринг-изображение 1200x630) ----------

/** Размер карточки организма: формат OG-image для соцсетей и Telegram */
export const CARD_W = 1200;
export const CARD_H = 630;
const CARD_BG = '#020304';

/** Вход renderCreatureCard: данные забега + билд организма (все поля defensive-опциональны) */
export interface CreatureCardInput {
  branch?: PortraitInput['branch']; // основной геном (ветка ДНК или гибрид)
  hybrid?: string | null; // взятый Великий Гибрид (если есть)
  weapons?: string[]; // id активных оружий
  wlvl?: Record<string, number>; // уровни оружий
  dnaLvl?: Record<string, number>; // уровни веток ДНК
  tail?: { x: number; y: number }[];
  bodyRadius?: number;
  stats: {
    time?: number;
    kills?: number;
    level?: number;
    scale?: number; // шкала бытия 1..15
    record?: boolean;
  };
}

/** Нормализованные данные карточки (результат normalizeCardInput) */
export interface CreatureCardData {
  branch: Branch;
  hybrid: string | null;
  weapons: string[];
  wlvl: Record<string, number>;
  dnaLvl: Record<string, number>;
  tail: Vec[];
  bodyRadius: number;
  stats: { time: number; kills: number; level: number; scale: number; record: boolean };
}

export interface CardWeaponEntry { id: string; level: number }
export interface CardDnaEntry { id: string; level: number }

/** Строки билда для карточки: подписанные оружия с уровнями + строка ДНК */
export interface CardBuildLines {
  weapons: string[];
  dna: string;
}

/** Подставляемые подписи для buildCardBuildLines (по умолчанию - i18n-словарь) */
export interface CardBuildResolvers {
  maxWeapons?: number;
  weaponLabel?: (id: string) => string;
  dnaLabel?: (id: string) => string;
  lvlText?: (level: number) => string;
  noneDna?: string;
}

/** Геометрия макета карточки: панель портрета слева, правая колонка с телеметрией */
export interface CreatureCardLayout {
  card: { w: number; h: number };
  portrait: Box;
  organism: Box;
  right: { x: number; w: number };
  stats: { y: number; h: number };
  build: { y: number };
}

/** Порядок веток ДНК в строке билда */
const DNA_ORDER: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];

/** Чистая функция: геометрия макета 1200x630 (панель ~500x500 слева, телеметрия справа) */
export function creatureCardLayout(): CreatureCardLayout {
  const portrait: Box = { x: 40, y: 66, w: 500, h: 500 };
  const rightX = portrait.x + portrait.w + 36;
  return {
    card: { w: CARD_W, h: CARD_H },
    portrait,
    organism: { x: portrait.x + 14, y: portrait.y + 14, w: portrait.w - 28, h: portrait.h - 28 },
    right: { x: rightX, w: CARD_W - rightX - 40 },
    stats: { y: 252, h: 64 },
    build: { y: 352 },
  };
}

/** Чистая функция: активные оружия (уровень >= 1), сортировка по уровню убыв., затем по id */
export function pickActiveWeapons(wlvl: Record<string, number> | undefined, max = 6): CardWeaponEntry[] {
  const src = (typeof wlvl === 'object' && wlvl !== null ? wlvl : {}) as Record<string, number>;
  const out: CardWeaponEntry[] = [];
  for (const [id, lvl] of Object.entries(src)) {
    if (typeof lvl !== 'number' || !Number.isFinite(lvl) || lvl < 1) continue;
    if (WEAPON_LABELS[id] === undefined) continue; // неизвестные id не попадают в карточку
    out.push({ id, level: Math.max(1, Math.floor(lvl)) });
  }
  out.sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
  return out.slice(0, Math.max(0, max));
}

/** Чистая функция: уровни 4 веток ДНК в фиксированном порядке (нули сохраняются) */
export function collectDnaLevels(dnaLvl: Record<string, number> | undefined): CardDnaEntry[] {
  const src = (typeof dnaLvl === 'object' && dnaLvl !== null ? dnaLvl : {}) as Record<string, number>;
  return DNA_ORDER.map((id) => {
    const raw = src[id];
    const lvl = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return { id, level: lvl };
  });
}

/** Чистая функция: строка оружия вида «ШИПЫ · УР.2» */
export function formatWeaponLine(label: string, lvlText: string): string {
  const l = String(label ?? '').trim();
  const lv = String(lvlText ?? '').trim();
  return l && lv ? `${l} · ${lv}` : l || lv;
}

/** Чистая функция: строка ДНК вида «ВЕРМИС 2 · ХИМЕРА 0» (или заглушка для пустого набора) */
export function formatDnaLine(pairs: { label: string; level: number }[], noneLabel: string): string {
  const parts = (Array.isArray(pairs) ? pairs : [])
    .filter((p) => !!p && typeof p.label === 'string' && p.label.trim().length > 0)
    .map((p) => `${p.label.trim()} ${Math.max(0, Math.floor(p.level ?? 0))}`);
  return parts.length ? parts.join(' · ') : noneLabel;
}

const defaultWeaponLabel = (id: string): string => t(`w_name_${id}` as I18nKey).toUpperCase();
const defaultDnaLabel = (id: string): string => dnaName(id as DnaBranchOrNeutral);
const defaultLvlText = (level: number): string => t('wh_lvl', { lvl: level }).toUpperCase();

/** Чистая функция: строки билда для карточки (оружия с уровнями + уровни 4 геномов) */
export function buildCardBuildLines(
  wlvl: Record<string, number> | undefined,
  dnaLvl: Record<string, number> | undefined,
  res: CardBuildResolvers = {},
): CardBuildLines {
  const weapons = pickActiveWeapons(wlvl, res.maxWeapons ?? 6).map((w) =>
    formatWeaponLine((res.weaponLabel ?? defaultWeaponLabel)(w.id), (res.lvlText ?? defaultLvlText)(w.level)),
  );
  const dna = formatDnaLine(
    collectDnaLevels(dnaLvl).map((d) => ({ label: (res.dnaLabel ?? defaultDnaLabel)(d.id), level: d.level })),
    res.noneDna ?? '-',
  );
  return { weapons, dna };
}

const isHybridId = (id: unknown): id is HybridId =>
  typeof id === 'string' && HYBRIDS.some((h) => h.id === id);

/** Чистая функция: нормализация входа карточки (шкала бытия 1..15, мусор отбрасывается) */
export function normalizeCardInput(input: Partial<CreatureCardInput> | null | undefined): CreatureCardData {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<CreatureCardInput>;
  const st = (typeof raw.stats === 'object' && raw.stats !== null ? raw.stats : {}) as Partial<NonNullable<CreatureCardInput['stats']>>;
  const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const b = raw.branch;
  const branch: Branch = !!b && b in BRANCHES ? b : 'neutral';
  const hybrid = isHybridId(raw.hybrid) ? raw.hybrid : isHybridId(branch) ? branch : null;
  const wlvl: Record<string, number> = {};
  if (typeof raw.wlvl === 'object' && raw.wlvl !== null) {
    for (const [id, lvl] of Object.entries(raw.wlvl)) {
      if (typeof lvl === 'number' && Number.isFinite(lvl)) wlvl[id] = lvl;
    }
  }
  const dnaLvl: Record<string, number> = {};
  if (typeof raw.dnaLvl === 'object' && raw.dnaLvl !== null) {
    for (const [id, lvl] of Object.entries(raw.dnaLvl)) {
      if (typeof lvl === 'number' && Number.isFinite(lvl)) dnaLvl[id] = lvl;
    }
  }
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
    hybrid,
    weapons: Array.isArray(raw.weapons) ? raw.weapons.filter((w): w is string => typeof w === 'string') : [],
    wlvl,
    dnaLvl,
    tail,
    bodyRadius: clamp(num(raw.bodyRadius, 26), 8, 130),
    stats: {
      time: Math.max(0, num(st.time)),
      kills: Math.max(0, Math.floor(num(st.kills))),
      level: Math.max(0, Math.floor(num(st.level))),
      scale: clamp(Math.floor(num(st.scale, 1)), 1, 15), // шкала бытия 1..15 (у портрета - 1..5)
      record: st.record === true,
    },
  };
}

// ---------- рисование карточки организма ----------

/** Тёмный фон #020304 с лёгким фрактал-паттерном (дендриты) и споровой пылью */
function drawCardBackground(ctx: CanvasRenderingContext2D, rng: () => number, col: RGB): void {
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // рекурсивные дендриты - «живой фрактал» реактора
  const tree = (x: number, y: number, ang: number, len: number, depth: number): void => {
    if (depth <= 0 || len < 6) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = rgba(col, 0.02 + 0.018 * depth);
    ctx.lineWidth = Math.max(0.6, depth * 0.55);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const spread = 0.36 + rng() * 0.28;
    const shrink = 0.62 + rng() * 0.12;
    tree(x2, y2, ang - spread, len * shrink, depth - 1);
    tree(x2, y2, ang + spread, len * shrink, depth - 1);
    if (rng() < 0.3) tree(x2, y2, ang + (rng() - 0.5) * 0.24, len * 0.55, depth - 1);
  };
  tree(170, CARD_H + 24, -Math.PI / 2, 165, 8);
  tree(CARD_W - 150, CARD_H + 24, -Math.PI / 2 + 0.35, 135, 7);
  tree(CARD_W * 0.52, -24, Math.PI / 2 + 0.25, 120, 7);
  // споровая пыль
  for (let i = 0; i < 240; i++) {
    const a = 0.05 + rng() * 0.28;
    const s = 0.5 + rng() * 1.4;
    ctx.fillStyle = `rgba(190,220,230,${a.toFixed(3)})`;
    ctx.fillRect(rng() * CARD_W, rng() * CARD_H, s, s);
  }
  // виньетка
  const v = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, CARD_H * 0.32, CARD_W / 2, CARD_H / 2, CARD_W * 0.74);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
}

/** Панель портрета слева: подложка, организм (клип по панели), рамка */
function drawCardPortrait(
  ctx: CanvasRenderingContext2D,
  L: CreatureCardLayout,
  inp: CreatureCardData,
  col: RGB,
  dim: RGB,
  rng: () => number,
  bg: HTMLCanvasElement | null,
): void {
  const p = L.portrait;
  rrPath(ctx, p.x, p.y, p.w, p.h, 18);
  ctx.fillStyle = 'rgba(4,12,18,0.72)';
  ctx.fill();
  ctx.save();
  rrPath(ctx, p.x, p.y, p.w, p.h, 18);
  ctx.clip();
  if (bg && bg.width > 0 && bg.height > 0) {
    try {
      // cover-вписка снимка physarum-поля внутрь панели
      const s = Math.max(p.w / bg.width, p.h / bg.height);
      const w = bg.width * s;
      const h = bg.height * s;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(bg, p.x + (p.w - w) / 2, p.y + (p.h - h) / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(2,6,10,0.5)';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    } catch {
      ctx.globalAlpha = 1;
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawOrganism(ctx, inp, col, dim, rng, L.organism);
  ctx.restore();
  rrPath(ctx, p.x, p.y, p.w, p.h, 18);
  ctx.strokeStyle = rgba(col, 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Правая колонка: бренд, имя организма, тег генома/гибрида, шкала бытия */
function drawCardHeader(
  ctx: CanvasRenderingContext2D,
  L: CreatureCardLayout,
  inp: CreatureCardData,
  style: BranchStyle,
  col: RGB,
  en: boolean,
): void {
  const x = L.right.x;
  const w = L.right.w;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // бренд игры
  setTracking(ctx, 4);
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = 'rgba(176,208,218,0.85)';
  ctx.fillText('LUMIVORE // THE LIVING FRACTAL', x, 66);
  // имя организма: гибрид из i18n, иначе имя генома
  const name = inp.hybrid ? hybridName(inp.hybrid as HybridId) : dnaName(inp.branch as DnaBranchOrNeutral);
  setTracking(ctx, 1);
  ctx.font = `700 34px ${MONO}`;
  ctx.shadowColor = rgba(col, 0.7);
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f4fdff';
  ctx.fillText(name, x - 2, 118, w);
  ctx.shadowBlur = 0;
  // акцентная плашка под названием
  ctx.fillStyle = rgba(col, 0.9);
  ctx.fillRect(x, 134, 150, 3);
  ctx.fillStyle = rgba(col, 0.35);
  ctx.fillRect(x + 158, 134, 90, 3);
  // тег: ГЕНОМ/ГИБРИД - из таблицы веток
  setTracking(ctx, 3);
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = 'rgba(176,208,218,0.92)';
  ctx.fillText(en ? style.tagEn : style.tag, x, 162);
  // шкала бытия: номер/15 + имя шкалы
  setTracking(ctx, 2);
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(t('stat_scale', { n: inp.stats.scale }), x, 202);
  setTracking(ctx, 1);
  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = '#dff6ff';
  const sName = scaleName(inp.stats.scale);
  if (sName) ctx.fillText(sName, x, 228, w);
}

/** Два чипа телеметрии: время забега и убийства */
function drawCardStatChips(
  ctx: CanvasRenderingContext2D,
  L: CreatureCardLayout,
  col: RGB,
  en: boolean,
  time: number,
  kills: number,
): void {
  const x0 = L.right.x;
  const w = L.right.w;
  const h = L.stats.h;
  const y = L.stats.y;
  const cw = (w - 16) / 2;
  const chips: [string, string][] = [
    [en ? 'TIME' : 'ВРЕМЯ', fmtTime(time)],
    [en ? 'KILLS' : 'УБИЙСТВА', fmtNum(kills)],
  ];
  chips.forEach(([label, value], i) => {
    const cx = x0 + i * (cw + 16);
    rrPath(ctx, cx, y, cw, h, 12);
    ctx.fillStyle = 'rgba(4,12,18,0.8)';
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    setTracking(ctx, 2);
    ctx.font = `500 11px ${MONO}`;
    ctx.fillStyle = 'rgba(186,214,224,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, cx + 18, y + 24);
    setTracking(ctx, 0);
    ctx.font = `700 26px ${MONO}`;
    ctx.fillStyle = '#eafcff';
    ctx.shadowColor = rgba(col, 0.8);
    ctx.shadowBlur = 10;
    ctx.fillText(value, cx + 18, y + 50);
    ctx.shadowBlur = 0;
  });
}

/** Блок билда: заголовок, пилюли оружий с уровнями, строка уровней ДНК */
function drawCardBuild(
  ctx: CanvasRenderingContext2D,
  L: CreatureCardLayout,
  inp: CreatureCardData,
  col: RGB,
  en: boolean,
): void {
  const x = L.right.x;
  const w = L.right.w;
  const y0 = L.build.y;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setTracking(ctx, 3);
  ctx.font = `700 13px ${MONO}`;
  ctx.fillStyle = rgba(col, 0.88);
  ctx.fillText(en ? 'BUILD // ARSENAL AND DNA' : 'БИЛД // АРСЕНАЛ И ДНК', x, y0);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y0 + 12);
  ctx.lineTo(x + w, y0 + 12);
  ctx.stroke();
  // пилюли оружий: перенос по ширине колонки
  const lines = buildCardBuildLines(inp.wlvl, inp.dnaLvl);
  let px = x;
  let py = y0 + 26;
  ctx.font = `700 12px ${MONO}`;
  setTracking(ctx, 1.5);
  for (const line of lines.weapons) {
    const pw = ctx.measureText(line).width + 24;
    if (px + pw > x + w && px > x) {
      px = x;
      py += 36;
    }
    rrPath(ctx, px, py, pw, 28, 8);
    ctx.fillStyle = rgba(col, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.48);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#eafcff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, px + pw / 2, py + 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    px += pw + 10;
  }
  // строка уровней ДНК (с переносом при необходимости)
  const dnaY = py + 48;
  setTracking(ctx, 1);
  ctx.font = `500 14px ${MONO}`;
  ctx.fillStyle = 'rgba(186,214,224,0.92)';
  const dnaLabel = `${en ? 'DNA' : 'ДНК'}: ${lines.dna}`;
  wrapLine(ctx, dnaLabel, w)
    .slice(0, 2)
    .forEach((ln, i) => {
      ctx.fillText(ln, x, dnaY + i * 20, w);
    });
}

/** Футер карточки: лор текущей шкалы бытия (scaleSub) по центру */
function drawCardFooter(ctx: CanvasRenderingContext2D, inp: CreatureCardData): void {
  const lore = scaleSub(inp.stats.scale);
  if (!lore) return;
  setTracking(ctx, 1);
  ctx.font = `500 12.5px ${MONO}`;
  ctx.fillStyle = 'rgba(170,208,218,0.62)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const maxW = CARD_W - 160;
  wrapLine(ctx, lore, maxW)
    .slice(0, 2)
    .forEach((ln, i) => {
      ctx.fillText(ln, CARD_W / 2, CARD_H - 40 + i * 18, maxW);
    });
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
    const en = getLocale() === 'en';
    drawBackground(ctx, bg, rng, col);
    drawOrganism(ctx, inp, col, dim, rng);
    drawHeader(ctx, style, inp.stats.record, inp.stats.scale, en);
    drawWeaponsStrip(ctx, inp.weapons, col, en);
    drawStatsPanel(ctx, inp.stats, col, en);
    drawFooter(ctx, en);
    drawFrame(ctx, col);
  } catch {
    // рисование не удалось полностью - возвращаем канвас как есть, без исключений
  }
  return canvas;
}

/** Опции макета renderCreatureCard */
export interface CreatureCardOptions {
  bg?: HTMLCanvasElement | null; // снимок physarum-поля внутрь панели портрета
  showRecord?: boolean; // плашка «РЕКОРД» (по умолчанию - из stats.record)
}

/**
 * Отрисовать «Карточку организма» 1200x630 для шаринга в соцсети/Telegram.
 * target - готовый канвас (или null: создаётся новый 1200x630).
 * Отдельная от renderPortrait функция: тот же организм, но макет под OG-image -
 * портрет слева, справа билд (оружия с уровнями + ДНК), шкала бытия и телеметрия.
 */
export function renderCreatureCard(
  target: HTMLCanvasElement | null,
  input: CreatureCardInput,
  opts: CreatureCardOptions = {},
): HTMLCanvasElement {
  const canvas = target ?? document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  try {
    const inp = normalizeCardInput(input);
    const style = BRANCHES[inp.branch];
    const col = hexRgb(style.color);
    const dim = hexRgb(style.dim);
    const en = getLocale() === 'en';
    const seed = (inp.stats.time * 1000 + inp.stats.kills * 7 + inp.stats.level * 131 + inp.stats.scale * 17) | 0;
    const rng = mulberry32(seed);
    const L = creatureCardLayout();
    drawCardBackground(ctx, rng, col);
    drawCardPortrait(ctx, L, inp, col, dim, rng, opts.bg ?? null);
    drawCardHeader(ctx, L, inp, style, col, en);
    drawCardStatChips(ctx, L, col, en, inp.stats.time, inp.stats.kills);
    drawCardBuild(ctx, L, inp, col, en);
    drawCardFooter(ctx, inp);
    if (opts.showRecord ?? inp.stats.record) drawRecordBadge(ctx, en, CARD_W, 40);
    drawFrame(ctx, col, CARD_W, CARD_H);
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
