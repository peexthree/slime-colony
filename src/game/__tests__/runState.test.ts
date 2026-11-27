// Тесты состояния забега: фабрика начального состояния и производные геттеры.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRunState, dnaLvl, effDmg, maxTail, getResonanceMult, refreshResonance, mainBranchForWeapons, visibleTail } from '../state';
import { PLAYER, TAIL, DNA_LEVELS, SCALES, WEAPON_MAX_LVL } from '../../engine/types';

function mockLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('createRunState', () => {
  beforeEach(mockLocalStorage);

  it('инициализирует стартовый мир шкалы 1 и игрока в центре', () => {
    const st = createRunState();
    const w0 = { w: Math.round(1120), h: Math.round(630) };
    expect(st.curWorldW).toBe(w0.w);
    expect(st.curWorldH).toBe(w0.h);
    expect(st.player.x).toBe(w0.w / 2);
    expect(st.player.y).toBe(w0.h / 2);
    expect(st.player.hp).toBe(PLAYER.hp);
    expect(st.camZoom).toBe(SCALES[0].zoom);
    expect(st.camX).toBe(st.player.x);
    expect(st.started).toBe(false);
    expect(st.paused).toBe(false);
    expect(st.gameOver).toBe(false);
  });

  it('стартовый арсенал: только шипы 1 уровня', () => {
    const st = createRunState();
    expect(st.wlvl.spikes).toBe(1);
    expect(st.wlvl.orbs).toBe(0);
    expect(st.wlvl.nova).toBe(0);
    expect(st.wlvl.aura).toBe(0);
    expect(st.wlvl.mandibles).toBe(0);
    expect(st.wlvl.cysts).toBe(0);
  });

  it('нейтральные множители и daily-модификаторы', () => {
    const st = createRunState();
    expect(st.dmgMul).toBe(1);
    expect(st.atkSpdMul).toBe(1);
    expect(st.resDmgMul).toBe(1);
    expect(st.dailyEnemySpeedMul).toBe(1);
    expect(st.dailyRunActive).toBe(false);
    expect(st.tailLen).toBe(TAIL.startLen);
    expect(st.level).toBe(1);
    expect(st.nextBossAt).toBe(90);
  });
});

describe('dnaLvl / getResonanceMult', () => {
  beforeEach(mockLocalStorage);

  it('ДНК-уровень растёт по порогам DNA_LEVELS', () => {
    const st = createRunState();
    expect(dnaLvl(st, 'vermis')).toBe(0);
    st.dnaXp.vermis = DNA_LEVELS[0];
    expect(dnaLvl(st, 'vermis')).toBe(1);
    st.dnaXp.vermis = DNA_LEVELS[1];
    expect(dnaLvl(st, 'vermis')).toBe(2);
    st.dnaXp.vermis = DNA_LEVELS[2];
    expect(dnaLvl(st, 'vermis')).toBe(3);
    st.dnaXp.vermis = DNA_LEVELS[2] + 1000;
    expect(dnaLvl(st, 'vermis')).toBe(3); // потолок 3
  });

  it('ступени резонанса: 1.0 -> 1.2 -> 1.5 -> 2.0 -> 2.5 -> 3.0', () => {
    expect(getResonanceMult(0)).toBe(1.0);
    expect(getResonanceMult(2)).toBe(1.0);
    expect(getResonanceMult(3)).toBe(1.2);
    expect(getResonanceMult(7)).toBe(1.5);
    expect(getResonanceMult(14)).toBe(2.0);
    expect(getResonanceMult(22)).toBe(2.5);
    expect(getResonanceMult(35)).toBe(3.0);
  });
});

describe('effDmg и refreshResonance', () => {
  beforeEach(mockLocalStorage);

  it('резонанс химеры: 2+ оружия ветки дают +10% урона', () => {
    const st = createRunState();
    st.wlvl.nova = 1; // chimera
    refreshResonance(st);
    expect(st.resDmgMul).toBe(1);
    st.wlvl.spikes = 1; // vermis - не химера
    refreshResonance(st);
    expect(st.resDmgMul).toBe(1);
    st.wlvl.aura = 1; // mycelium
    refreshResonance(st);
    expect(st.resDmgMul).toBe(1);
    st.wlvl.cysts = 1; // второй mycelium: резонанс мицелия, не химеры
    refreshResonance(st);
    expect(st.resRegen).toBe(1);
    expect(st.resDmgMul).toBe(1);
    st.wlvl.mandibles = 1; // второй vermis
    refreshResonance(st);
    expect(st.resTailMul).toBe(1.15);
    // Химера по-прежнему одна
    expect(st.resDmgMul).toBe(1);
    st.wlvl.orbs = 1; // symbiont единственный
    refreshResonance(st);
    expect(st.resAtkMul).toBe(1);
    expect(st.resTailMul).toBe(1.15);
  });

  it('effDmg учитывает weaponPenalty и ген unstable', () => {
    const st = createRunState();
    expect(effDmg(st)).toBe(1);
    st.weaponPenalty = 0.8;
    expect(effDmg(st)).toBeCloseTo(0.8);
    st.genes.add('unstable');
    st.unstableT = 0;
    expect(effDmg(st)).toBeCloseTo(0.8 * 1.8);
    st.unstableT = 3;
    expect(effDmg(st)).toBeCloseTo(0.8 * 0.55);
  });

  it('mainBranchForWeapons: гибрид открывает все ветки', () => {
    const st = createRunState();
    expect(mainBranchForWeapons(st)).toBeNull();
    st.mainGenome = 'vermis';
    expect(mainBranchForWeapons(st)).toBe('vermis');
    st.mainGenome = 'plasma_leviathan';
    expect(mainBranchForWeapons(st)).toBeNull();
  });
});

describe('maxTail и visibleTail', () => {
  beforeEach(mockLocalStorage);

  it('ёмкость хвоста растёт с уровнем и бонусами', () => {
    const st = createRunState();
    // baseMax 16 + level 1 * 2, множитель кодекса из стартовых бонусов
    const base = 16 + 1 * 2;
    expect(maxTail(st)).toBe(Math.round(base * st.codexBonuses.tailCapMul));
    st.level = WEAPON_MAX_LVL;
    const lvl4 = 16 + 4 * 2;
    expect(maxTail(st)).toBe(Math.round(lvl4 * st.codexBonuses.tailCapMul));
    st.tailCapBonus = 8;
    expect(maxTail(st)).toBe(Math.round((lvl4 + 8) * st.codexBonuses.tailCapMul));
  });

  it('visibleTail отрезает последний tailLen сегментов пути', () => {
    const st = createRunState();
    st.tailLen = 3;
    st.pathHistory.push({ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 });
    expect(visibleTail(st)).toHaveLength(3);
    expect(visibleTail(st)[0]).toEqual({ x: 3, y: 3 });
  });
});
