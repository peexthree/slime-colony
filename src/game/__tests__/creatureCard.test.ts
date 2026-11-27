// Тесты чистой логики «Карточки организма» (шаринг 1200x630):
// геометрия макета, расчёт строк билда, форматирование, нормализация входа.
// Canvas-рисование не проверяется - только чистые функции из engine/portrait.ts.
import { describe, it, expect } from 'vitest';
import {
  CARD_W,
  CARD_H,
  creatureCardLayout,
  normalizeCardInput,
  pickActiveWeapons,
  collectDnaLevels,
  formatWeaponLine,
  formatDnaLine,
  buildCardBuildLines,
} from '../../engine/portrait';
import type { CreatureCardInput } from '../../engine/portrait';
import { setLocale } from '../../i18n';

function mockLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('creatureCardLayout', () => {
  it('карточка имеет формат OG-image 1200x630', () => {
    expect(CARD_W).toBe(1200);
    expect(CARD_H).toBe(630);
    const L = creatureCardLayout();
    expect(L.card.w).toBe(CARD_W);
    expect(L.card.h).toBe(CARD_H);
  });

  it('панель портрета квадратная (~500x500) и целиком внутри карточки', () => {
    const L = creatureCardLayout();
    expect(L.portrait.w).toBe(L.portrait.h);
    expect(L.portrait.w).toBeGreaterThanOrEqual(490);
    expect(L.portrait.x).toBeGreaterThanOrEqual(0);
    expect(L.portrait.y).toBeGreaterThanOrEqual(0);
    expect(L.portrait.x + L.portrait.w).toBeLessThanOrEqual(CARD_W);
    expect(L.portrait.y + L.portrait.h).toBeLessThanOrEqual(CARD_H);
  });

  it('зона организма вложена в панель портрета, правая колонка не пересекает панель', () => {
    const L = creatureCardLayout();
    expect(L.organism.x).toBeGreaterThanOrEqual(L.portrait.x);
    expect(L.organism.y).toBeGreaterThanOrEqual(L.portrait.y);
    expect(L.organism.x + L.organism.w).toBeLessThanOrEqual(L.portrait.x + L.portrait.w);
    expect(L.organism.y + L.organism.h).toBeLessThanOrEqual(L.portrait.y + L.portrait.h);
    expect(L.right.x).toBeGreaterThanOrEqual(L.portrait.x + L.portrait.w);
    expect(L.right.x + L.right.w).toBeLessThanOrEqual(CARD_W);
  });
});

describe('pickActiveWeapons', () => {
  it('отбирает только активные оружия и сортирует по уровню убыв.', () => {
    const res = pickActiveWeapons({ spikes: 2, orbs: 3, nova: 0, aura: 0 });
    expect(res).toEqual([
      { id: 'orbs', level: 3 },
      { id: 'spikes', level: 2 },
    ]);
  });

  it('игнорирует неизвестные id и нечисловой мусор', () => {
    expect(pickActiveWeapons({ spikes: 1, laser: 5, orbs: Number.NaN })).toEqual([{ id: 'spikes', level: 1 }]);
    expect(pickActiveWeapons(undefined)).toEqual([]);
  });

  it('ограничивает длину списка (max) с сохранением сортировки', () => {
    const res = pickActiveWeapons({ spikes: 1, orbs: 2, nova: 3, aura: 4 }, 3);
    expect(res.map((w) => w.id)).toEqual(['aura', 'nova', 'orbs']);
  });
});

describe('collectDnaLevels', () => {
  it('возвращает 4 ветки в фиксированном порядке, нули сохраняются', () => {
    expect(collectDnaLevels({ vermis: 2 })).toEqual([
      { id: 'vermis', level: 2 },
      { id: 'chimera', level: 0 },
      { id: 'mycelium', level: 0 },
      { id: 'symbiont', level: 0 },
    ]);
  });

  it('мусор и отрицательные значения дают уровень 0', () => {
    const res = collectDnaLevels({ vermis: -3, chimera: Number.NaN, mycelium: 2.9 });
    expect(res[0].level).toBe(0);
    expect(res[1].level).toBe(0);
    expect(res[2].level).toBe(2);
  });
});

describe('форматирование строк', () => {
  it('formatWeaponLine: «ШИПЫ · УР.2»', () => {
    expect(formatWeaponLine('ШИПЫ', 'УР.2')).toBe('ШИПЫ · УР.2');
    expect(formatWeaponLine('SPIKES', 'LV.2')).toBe('SPIKES · LV.2');
  });

  it('formatWeaponLine переживает пустые части', () => {
    expect(formatWeaponLine('', 'УР.1')).toBe('УР.1');
    expect(formatWeaponLine('НОВА', '')).toBe('НОВА');
    expect(formatWeaponLine('', '')).toBe('');
  });

  it('formatDnaLine склеивает пары через разделитель, пустой набор даёт заглушку', () => {
    expect(formatDnaLine([{ label: 'ВЕРМИС', level: 2 }, { label: 'ХИМЕРА', level: 0 }], 'нет')).toBe(
      'ВЕРМИС 2 · ХИМЕРА 0',
    );
    expect(formatDnaLine([], 'нет')).toBe('нет');
  });
});

describe('buildCardBuildLines', () => {
  it('строки билда собираются через подставляемые подписи', () => {
    const lines = buildCardBuildLines(
      { spikes: 2, orbs: 1, nova: 0 },
      { vermis: 1, symbiont: 3 },
      {
        weaponLabel: (id) => id.toUpperCase(),
        dnaLabel: (id) => id.toUpperCase(),
        lvlText: (n) => `LV.${n}`,
      },
    );
    expect(lines.weapons).toEqual(['SPIKES · LV.2', 'ORBS · LV.1']);
    expect(lines.dna).toBe('VERMIS 1 · CHIMERA 0 · MYCELIUM 0 · SYMBIONT 3');
  });

  it('дефолтные подписи берутся из i18n (русская локаль)', () => {
    mockLocalStorage();
    setLocale('ru');
    const lines = buildCardBuildLines({ spikes: 1 }, { vermis: 2 });
    expect(lines.weapons).toEqual(['ШИПЫ · УР.1']);
    expect(lines.dna).toContain('ВЕРМИС 2');
    expect(lines.dna).toContain('СИМБИОНТ 0');
  });
});

describe('normalizeCardInput', () => {
  it('шкала бытия клампится в 1..15 (шире, чем 1..5 у портрета)', () => {
    expect(normalizeCardInput({ stats: { scale: 42 } }).stats.scale).toBe(15);
    expect(normalizeCardInput({ stats: { scale: 0 } }).stats.scale).toBe(1);
    expect(normalizeCardInput({ stats: { scale: Number.NaN } }).stats.scale).toBe(1);
    expect(normalizeCardInput(null).stats.scale).toBe(1);
  });

  it('гибрид валидируется: гибрид-ветка подхватывается, неизвестный id отбрасывается', () => {
    expect(normalizeCardInput({ branch: 'ouroboros' }).hybrid).toBe('ouroboros');
    expect(normalizeCardInput({ branch: 'vermis', hybrid: 'not-a-hybrid' }).hybrid).toBeNull();
    expect(normalizeCardInput({ branch: 'vermis', hybrid: 'psi_web' }).hybrid).toBe('psi_web');
    expect(normalizeCardInput({}).hybrid).toBeNull();
    expect(normalizeCardInput({ branch: 'unknown_x' } as unknown as Partial<CreatureCardInput>).branch).toBe('neutral');
  });

  it('хвост фильтруется от мусорных точек, радиус клампится, числа нормализуются', () => {
    const d = normalizeCardInput({
      tail: [
        { x: 10, y: 20 },
        { x: Number.NaN, y: 0 },
        null,
        { x: 'a', y: 2 },
        { x: 30, y: 40 },
      ],
      bodyRadius: 999,
      stats: { time: -5, kills: 3.9 },
    } as never);
    expect(d.tail).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(d.bodyRadius).toBe(130);
    expect(d.stats.time).toBe(0);
    expect(d.stats.kills).toBe(3);
  });

  it('wlvl и dnaLvl очищаются от нечисловых значений', () => {
    const d = normalizeCardInput({ wlvl: { spikes: 2, junk: 'x' }, dnaLvl: { vermis: 1, bad: null } } as never);
    expect(d.wlvl).toEqual({ spikes: 2 });
    expect(d.dnaLvl).toEqual({ vermis: 1 });
  });
});
