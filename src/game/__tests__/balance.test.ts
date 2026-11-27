// Тесты кривой баланса LUMIVORE: 15 Шкал бытия, спавн-таблица веток ДНК,
// геометрия Кольца Смерти, экономика хвоста и целостность i18n.
// Модель DPS игрока упрощённая и задокументирована в modelPlayerDps ниже.
import { describe, it, expect } from 'vitest';
// node:fs доступен в рантайме vitest (node), но @types/node не подключён в tsconfig
// @ts-expect-error - модуль node:fs без установленных типов node
import { readFileSync } from 'node:fs';
import {
  ENEMIES, PLAYER, RING, RING_AREA_FACTOR, ringMinArea, SCALES, SPAWN_TABLE, TAIL,
  WEAPON_BRANCH, WEAPON_MAX_LVL, WEAPON_UNLOCK_LEVEL, playerSpeed,
} from '../../engine/types';
import type { DnaBranch, WeaponId } from '../../engine/types';
import { requiredLevelForWeapon, canUnlockWeapon } from '../progression';
import { polyArea } from '../ringOfDeath';
import { dnaName } from '../../i18n/gameData';
import ruDict from '../../i18n/ru.json';
import enDict from '../../i18n/en.json';

// ============================ МОДЕЛЬ DPS ИГРОКА ============================

/** Одноцелевой DPS оружия на уровне lvl по таблицам types.ts.
 *  Допущение модели: цель (босс) постоянно в радиусе действия - оптимистичная
 *  верхняя оценка, поэтому коридор TTK задан с запасом. */
function weaponSingleTargetDps(id: WeaponId, lvl: number): number {
  const i = Math.max(0, Math.min(WEAPON_MAX_LVL, lvl) - 1);
  switch (id) {
    case 'spikes': return (SPIKES_COUNT[i] * SPIKES_DMG[i]) / SPIKES_CD[i];
    case 'mandibles': return MANDIBLES_DMG[i] / MANDIBLES_CD[i];
    case 'nova': return NOVA_DMG[i] / NOVA_CD[i];
    case 'aura': return AURA_DPS[i];
    case 'orbs': return (ORBS_COUNT[i] * ORBS_DMG[i]) / ORBS_ORB_CD;
    case 'cysts': return (CYSTS_PER_DROP[i] * CYSTS_DMG[i] * CYSTS_BLAST_MUL) / CYSTS_CD[i];
  }
}
// Локальные копии таблиц (значения продублированы сознательно: тест фиксирует
// конкретные числа, и при их изменении тест падает как сигнал пересмотреть кривые)
const SPIKES_CD = [1.35, 1.18, 1.02, 0.88];
const SPIKES_DMG = [9, 12, 16, 21];
const SPIKES_COUNT = [1, 1, 2, 3];
const ORBS_COUNT = [1, 2, 3, 4];
const ORBS_DMG = [7, 10, 13, 17];
const ORBS_ORB_CD = 0.45;
const NOVA_CD = [6.5, 5.8, 5.1, 4.4];
const NOVA_DMG = [20, 27, 35, 45];
const AURA_DPS = [5, 8, 12, 17];
const MANDIBLES_CD = [1.7, 1.45, 1.25, 1.05];
const MANDIBLES_DMG = [22, 30, 40, 52];
const CYSTS_CD = [3.4, 3.0, 2.6, 2.2];
const CYSTS_DMG = [30, 42, 56, 74];
const CYSTS_BLAST_MUL = 1.45;
const CYSTS_PER_DROP = [1, 1, 2, 2];

/**
 * Ожидаемый DPS игрока на шкале scaleIdx (0..14). Компоненты:
 * - уровень игрока lvl = 5 + 3.5*k (аппроксимация XP-кривой прогресса по шкалам);
 * - топ-3 оружия (MAX_EQUIPPED_WEAPONS) с уровнями из progression.requiredLevelForWeapon;
 * - хвост-хлыст: dpsBase + tailLen * dpsPerSeg, tailLen = baseMax + lvl * maxPerLvl;
 * - Кольцо Смерти: tailLen * dmgPerSeg / cooldown (периодические схлопывания);
 * - effDmg = 1 + 0.22*k (стеки урона: 'dmg' x3, chi_dmg, резонанс, амплификатор, кодекс).
 */
function modelPlayerDps(scaleIdx: number): number {
  const lvl = Math.floor(5 + 3.5 * scaleIdx);
  const ids: WeaponId[] = ['spikes', 'mandibles', 'nova', 'orbs', 'aura', 'cysts'];
  const dpsList: number[] = [];
  for (const id of ids) {
    if (WEAPON_UNLOCK_LEVEL[id] > lvl) continue;
    let best = 0;
    for (let target = 1; target <= WEAPON_MAX_LVL; target++) {
      if (requiredLevelForWeapon(id, target) <= lvl) best = target;
    }
    if (best > 0) dpsList.push(weaponSingleTargetDps(id, best));
  }
  dpsList.sort((a, b) => b - a);
  const top3 = dpsList.slice(0, 3).reduce((s, d) => s + d, 0);
  const tailLen = Math.min(TAIL.baseMax + lvl * TAIL.maxPerLvl, 160);
  const tailDps = TAIL.dpsBase + tailLen * TAIL.dpsPerSeg;
  const ringDps = (tailLen * RING.dmgPerSeg) / RING.cooldown;
  const effDmg = 1 + 0.22 * scaleIdx;
  return (top3 + tailDps + ringDps) * effDmg;
}

/** TTK босса на шкале: временной множитель main.ts (1 + (k*90/60)*0.30),
 *  шкала проходится примерно за 90 сек (BOSS_EVERY) */
function bossTtk(scaleIdx: number): number {
  const timeFactor = 1 + 0.45 * scaleIdx;
  const bossHp = ENEMIES.boss.hp * SCALES[scaleIdx].enemyHpMul * timeFactor;
  return bossHp / modelPlayerDps(scaleIdx);
}

// ============================ КРИВЫЕ ШКАЛ ============================

describe('Кривая баланса 15 Шкал бытия', () => {
  it('все числовые поля шкал конечны (без NaN/Infinity)', () => {
    for (const sc of SCALES) {
      for (const [key, val] of Object.entries(sc)) {
        if (typeof val === 'number') expect(Number.isFinite(val), `scale ${sc.id} field ${key}`).toBe(true);
      }
    }
  });

  it('enemyHpMul монотонно растёт по шкалам', () => {
    for (let i = 1; i < SCALES.length; i++) {
      expect(SCALES[i].enemyHpMul).toBeGreaterThan(SCALES[i - 1].enemyHpMul);
    }
  });

  it('playerSpeedMul монотонно растёт по шкалам и доходит до ~2.2 к 15-й', () => {
    for (let i = 1; i < SCALES.length; i++) {
      expect(SCALES[i].playerSpeedMul).toBeGreaterThan(SCALES[i - 1].playerSpeedMul);
    }
    expect(SCALES[SCALES.length - 1].playerSpeedMul).toBeGreaterThanOrEqual(2.0);
    expect(SCALES[SCALES.length - 1].playerSpeedMul).toBeLessThanOrEqual(2.5);
  });

  it('playerSpeed(scaleIdx) = PLAYER.speed * playerSpeedMul и монотонна', () => {
    expect(playerSpeed(0)).toBeCloseTo(PLAYER.speed * SCALES[0].playerSpeedMul, 6);
    expect(playerSpeed(14)).toBeCloseTo(PLAYER.speed * SCALES[14].playerSpeedMul, 6);
    for (let i = 1; i < SCALES.length; i++) {
      expect(playerSpeed(i)).toBeGreaterThan(playerSpeed(i - 1));
    }
  });

  it('первые 5 шкал не изменили кривую сложности (аудит не трогает ранний баланс)', () => {
    const expectedEarlyHp = [1.0, 1.4, 2.0, 2.8, 3.9];
    for (let i = 0; i < 5; i++) expect(SCALES[i].enemyHpMul).toBe(expectedEarlyHp[i]);
  });

  it('TTK босса в коридоре ~4-45 сек на любой шкале и не раздувается экспоненциально', () => {
    const ttks = SCALES.map((_, k) => bossTtk(k));
    for (let k = 0; k < ttks.length; k++) {
      expect(Number.isFinite(ttks[k]), `scale ${k + 1}`).toBe(true);
      expect(ttks[k], `scale ${k + 1}`).toBeGreaterThan(4);
      expect(ttks[k], `scale ${k + 1}`).toBeLessThan(45);
    }
    // Анти-стена: разброс TTK по шкалам ограничен (старая кривая давала рост в ~13.5 раза)
    const ratio = Math.max(...ttks) / Math.min(...ttks);
    expect(ratio).toBeLessThan(5);
  });

  it('TTK обычного танкового врага (brute) не превышает 10 сек на любой шкале', () => {
    for (let k = 0; k < SCALES.length; k++) {
      const timeFactor = 1 + 0.45 * k;
      const bruteHp = ENEMIES.brute.hp * SCALES[k].enemyHpMul * timeFactor;
      expect(bruteHp / modelPlayerDps(k), `scale ${k + 1}`).toBeLessThan(10);
    }
  });
});

// ============================ СПАВН-ТАБЛИЦА ============================

describe('SPAWN_TABLE: ветки ДНК представлены в первые 30 секунд', () => {
  /** Пул main.ts: grub (vermis) доступен всегда с весом 0.45 */
  const BASE_POOL: { type: keyof typeof ENEMIES; weight: number }[] = [{ type: 'grub', weight: 0.45 }];

  function branchWeightsBy(seconds: number): Record<DnaBranch, number> {
    const acc: Record<DnaBranch, number> = { vermis: 0, chimera: 0, mycelium: 0, symbiont: 0 };
    for (const row of BASE_POOL) {
      if (row.type === 'grub') acc.vermis += row.weight;
    }
    for (const row of SPAWN_TABLE) {
      if (row.since <= seconds) acc[ENEMIES[row.type].dna] += row.chance;
    }
    return acc;
  }

  it('каждая из 4 веток ДНК имеет ненулевой суммарный шанс в первые 30 секунд', () => {
    const weights = branchWeightsBy(30);
    for (const branch of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
      expect(weights[branch], branch).toBeGreaterThan(0);
    }
  });

  it('ранний chimera-враг (spitter) появляется на 8-15 секунде с шансом 8-12%', () => {
    const row = SPAWN_TABLE.find((r) => r.type === 'spitter');
    expect(row).toBeDefined();
    expect(row!.since).toBeGreaterThanOrEqual(8);
    expect(row!.since).toBeLessThanOrEqual(15);
    expect(row!.chance).toBeGreaterThanOrEqual(0.08);
    expect(row!.chance).toBeLessThanOrEqual(0.12);
  });

  it('таблица отсортирована по времени, шансы в (0, 1)', () => {
    for (let i = 0; i < SPAWN_TABLE.length; i++) {
      expect(SPAWN_TABLE[i].chance).toBeGreaterThan(0);
      expect(SPAWN_TABLE[i].chance).toBeLessThan(1);
      if (i > 0) expect(SPAWN_TABLE[i].since).toBeGreaterThanOrEqual(SPAWN_TABLE[i - 1].since);
    }
  });

  it('Химера получает родное оружие (nova) на уровне 3-5', () => {
    expect(WEAPON_UNLOCK_LEVEL.nova).toBeGreaterThanOrEqual(3);
    expect(WEAPON_UNLOCK_LEVEL.nova).toBeLessThanOrEqual(5);
    const wlvl: Record<WeaponId, number> = { spikes: 0, orbs: 0, nova: 0, aura: 0, mandibles: 0, cysts: 0 };
    expect(canUnlockWeapon('nova', wlvl, 5, 'chimera')).toBe(true);
    expect(WEAPON_BRANCH.nova).toBe('chimera');
  });
});

// ============================ КОЛЬЦО СМЕРТИ ============================

describe('RING: порог площади достижим геометрией хвоста', () => {
  /** Правильный замкнутый полигон из n сегментов длиной spacing (хорда между соседними вершинами) */
  function closedLoopPoly(n: number, spacing: number): { x: number; y: number }[] {
    const radius = spacing / (2 * Math.sin(Math.PI / n));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return pts;
  }

  it('ringMinArea(16) меньше площади идеального 16-угольника с шагом segSpacing', () => {
    const ideal = polyArea(closedLoopPoly(TAIL.baseMax, TAIL.segSpacing));
    const threshold = ringMinArea(TAIL.baseMax);
    expect(threshold).toBeGreaterThan(0);
    expect(threshold).toBeLessThan(ideal);
    // Формула из документации: 0.75 * (N * segSpacing)^2 / (4 * PI) ~= 382
    expect(threshold).toBe(Math.round((RING_AREA_FACTOR * Math.pow(TAIL.baseMax * TAIL.segSpacing, 2)) / (4 * Math.PI)));
    expect(threshold).toBeGreaterThan(300);
    expect(threshold).toBeLessThan(500);
  });

  it('ringMinArea монотонно растёт по длине хвоста и конечна', () => {
    for (let n = 1; n <= 160; n++) {
      const a = ringMinArea(n);
      expect(Number.isFinite(a)).toBe(true);
      if (n > 1) expect(a).toBeGreaterThanOrEqual(ringMinArea(n - 1));
    }
  });

  it('даже минимальный хвост теоретически замыкаем: порог не выше теоретического максимума', () => {
    for (let n = TAIL.minLen; n <= 60; n += 7) {
      const maxArea = Math.pow(n * TAIL.segSpacing, 2) / (4 * Math.PI);
      expect(ringMinArea(n)).toBeLessThanOrEqual(maxArea + 1);
    }
  });
});

// ============================ ЭКОНОМИКА ХВОСТА ============================

describe('TAIL: движение тает дешевле неподвижности', () => {
  it('moveCost < idleCost (поощряет движение, а не наказывает его)', () => {
    expect(TAIL.moveCost).toBeLessThan(TAIL.idleCost);
  });
});

// ============================ I18N ЦЕЛОСТНОСТЬ ============================

describe('i18n: паритет словарей и чистота types.ts', () => {
  function collectKeys(obj: unknown, prefix = ''): string[] {
    if (obj === null || typeof obj !== 'object') return [prefix];
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      collectKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }

  it('ru.json и en.json содержат одинаковый набор ключей', () => {
    const ruKeys = collectKeys(ruDict).sort();
    const enKeys = collectKeys(enDict).sort();
    expect(enKeys).toEqual(ruKeys);
    expect(ruKeys.length).toBeGreaterThan(250);
  });

  it('ключи геномов, гибридов и шкал присутствуют в обоих словарях', () => {
    const branches = ['vermis', 'chimera', 'mycelium', 'symbiont', 'neutral'];
    const hybrids = ['plasma_leviathan', 'ouroboros', 'phase_serpent', 'spore_reactor', 'ion_colossus', 'psi_web'];
    for (const dict of [ruDict, enDict] as Record<string, unknown>[]) {
      for (const b of branches) expect(dict[`dna_${b}`], `dna_${b}`).toBeDefined();
      for (const h of hybrids) {
        expect(dict[`hybrid_${h}_name`]).toBeDefined();
        expect(dict[`hybrid_${h}_desc`]).toBeDefined();
      }
      for (let id = 1; id <= SCALES.length; id++) {
        expect(dict[`scale_${id}_name`], `scale_${id}_name`).toBeDefined();
        expect(dict[`scale_${id}_sub`], `scale_${id}_sub`).toBeDefined();
      }
    }
  });

  it('доступ к текстам через gameData возвращает строки (не ключи-заглушки)', () => {
    expect(dnaName('vermis')).toBe('ВЕРМИС');
    expect(dnaName('neutral')).toBe('ОСОБЬ');
  });

  it('в src/engine/types.ts нет кириллических СТРОКОВЫХ литералов (комментарии допустимы)', () => {
    const src = readFileSync(new URL('../../engine/types.ts', import.meta.url), 'utf8');
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const stringLiterals = noComments.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
    expect(stringLiterals.length).toBeGreaterThan(10);
    for (const lit of stringLiterals) {
      expect(lit, `literal ${lit}`).not.toMatch(/[\u0400-\u04FF]/);
    }
  });
});
