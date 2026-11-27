// Сущности забега и spatial hash: общие интерфейсы + zero-allocation сетка коллизий.
// Раньше жили в замыкании main.ts - вынесены, чтобы доменные модули не циклили друг друга.
import type { AnomalyView } from '../engine/PixiOverlay';
import type { DnaBranch, EliteMutation, EnemyType } from '../engine/types';
import type { Ctx } from './context';

/** Враг: тело + хвостик + таймеры поведения и мутации элиты */
export interface Enemy {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  radius: number;
  dmg: number;
  type: EnemyType;
  flash: number;
  atkCd: number;
  orbCd: number;
  tailCd: number;
  kbx: number; kby: number; // отброс от новы
  /** Мутация элиты (золотой ореол) */
  elite: EliteMutation | null;
  /** Заражённый союзник (Паразит): таймер, 0 = обычный враг */
  infected: number;
  /** Споровое заражение (Споровый Реактор): тик урона + детонация при смерти */
  sporeInf: number;
  /** Титан масштаба: хранитель метаморфоза */
  titan: boolean;
  /** Активирована фаза ярости босса/титана при < 40% HP */
  enragedPhase?: boolean;
  /** Ссылка на матку для выводка колонии */
  colonyId: number;
  /** Перезарядка особого поведения (плевок/кольцо/выводок) */
  skillCd: number;
  /** Хвостик: история позиций [старые ... новые] */
  tail: { x: number; y: number }[];
  tailCap: number;
  /** ID био-башни, которую враг пытается отбить у игрока */
  raidNodeId?: number;
  dead?: boolean;
}

/** Снаряд шипов игрока */
export interface Proj {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  dmg: number;
  /** Сколько отскоков осталось (Цепная реакция) */
  bounces: number;
}

/** Снаряд врагов (плевок/залп босса) */
export interface EProj {
  x: number; y: number;
  vx: number; vy: number;
  dmg: number;
  life: number;
  sourceType: EnemyType;
  titan?: boolean;
  elite?: EliteMutation | null;
}

/** Душа XP: сфера ДНК, несущая цвет своего генома */
export interface XpOrb {
  x: number; y: number;
  vx: number; vy: number;
  value: number;
  color: number;
  dna: DnaBranch;
}

/** Споровая циста: мина, взводится с задержкой */
export interface Cyst {
  x: number; y: number;
  r: number;
  dmg: number;
  life: number;
  armT: number;
  armed: boolean;
}

/** Визуальный след жвал: конус рассечения */
export interface MandibleSwipe {
  x: number; y: number;
  dirX: number; dirY: number;
  range: number;
  arc: number;
  life: number;
}

/** Био-цветение на теле павшего: маяк physarum-поля */
export interface CorpseBeacon {
  x: number; y: number;
  ttl: number;
}

/** Аномалия чашки Петри: кислотный прилив / гнездо спор / вспышка митоза */
export interface Anomaly extends AnomalyView {
  spawnCd: number;
}

/** Причина смертельного урона: показывает, что именно убило образец */
export interface DamageCause {
  kind: string;
  labelRu: string;
  labelEn: string;
  amount: number;
}

// ---------- Пространственный хеш для коллизий (Zero-Allocation Pool) ----------

const CELL = 40;
const hash = new Map<number, Enemy[]>();
const cellPool: Enemy[][] = [];
const activeKeys: number[] = [];

/** Переиспользуемые буферы запросов: nearby() без аллокаций */
export const defaultNearbyBuf: Enemy[] = [];
export const sporeNearbyBuf: Enemy[] = [];

/** Пересборка сетки по текущим позициям врагов (вызывается раз за шаг симуляции) */
export function buildHash(ctx: Ctx): void {
  for (let i = 0; i < activeKeys.length; i++) {
    const arr = hash.get(activeKeys[i]);
    if (arr) {
      arr.length = 0;
      cellPool.push(arr);
    }
  }
  hash.clear();
  activeKeys.length = 0;

  const enemies = ctx.enemies;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const cx = Math.floor(e.x / CELL);
    const cy = Math.floor(e.y / CELL);
    const key = cx * 1024 + cy;
    let arr = hash.get(key);
    if (!arr) {
      arr = cellPool.pop() ?? [];
      hash.set(key, arr);
      activeKeys.push(key);
    }
    arr.push(e);
  }
}

/** Все враги в квадратно-клеточном радиусе вокруг точки */
export function nearby(x: number, y: number, radius: number, outBuf: Enemy[] = defaultNearbyBuf): Enemy[] {
  outBuf.length = 0;
  const c0x = Math.floor((x - radius) / CELL);
  const c1x = Math.floor((x + radius) / CELL);
  const c0y = Math.floor((y - radius) / CELL);
  const c1y = Math.floor((y + radius) / CELL);
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      const arr = hash.get(cx * 1024 + cy);
      if (arr) {
        for (let k = 0; k < arr.length; k++) outBuf.push(arr[k]);
      }
    }
  }
  return outBuf;
}

/** Все враги в прямоугольнике (bbox хвоста): расширенный на pad bbox собирается по клеткам */
export function nearbyRect(x0: number, y0: number, x1: number, y1: number, pad: number, outBuf: Enemy[] = defaultNearbyBuf): Enemy[] {
  outBuf.length = 0;
  const c0x = Math.floor((x0 - pad) / CELL);
  const c1x = Math.floor((x1 + pad) / CELL);
  const c0y = Math.floor((y0 - pad) / CELL);
  const c1y = Math.floor((y1 + pad) / CELL);
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      const arr = hash.get(cx * 1024 + cy);
      if (arr) {
        for (let k = 0; k < arr.length; k++) outBuf.push(arr[k]);
      }
    }
  }
  return outBuf;
}

/** Прямой доступ к клетке хеша (расталкивание врагов) */
export function hashCell(ex: number, ey: number): Enemy[] | undefined {
  return hash.get(Math.floor(ex / CELL) * 1024 + Math.floor(ey / CELL));
}
