// Тесты чистой логики виджета «Охота за Гибридом» (src/ui/hybridHunt.ts):
// расчёт прогресса пары геномов (DNA_LEVELS), готовность гибрида к сборке,
// погашение уже взятых гибридов и канонический формат текста пары.
// Без DOM: RunState создаётся фабрикой createRunState().
import { describe, it, expect } from 'vitest';
import { HYBRIDS } from '../../engine/types';
import { createRunState } from '../state';
import { branchLevelFrac, hybridPairState, hybridPairText } from '../../ui/hybridHunt';
import { dnaName, hybridName } from '../../i18n/gameData';

describe('branchLevelFrac: ДНК-уровень и прогресс внутри уровня', () => {
  it('пустая ветка: уровень 0 и нулевой прогресс', () => {
    const ctx = createRunState();
    expect(branchLevelFrac(ctx, 'vermis')).toEqual({ lvl: 0, frac: 0 });
  });

  it('ровно порог 15 ДНК: уровень 1, прогресс внутри уровня 0', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 15;
    expect(branchLevelFrac(ctx, 'vermis')).toEqual({ lvl: 1, frac: 0 });
  });

  it('промежуточное значение даёт долю внутри уровня (20 между 15 и 35 -> 0.25)', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 20;
    expect(branchLevelFrac(ctx, 'vermis')).toEqual({ lvl: 1, frac: 0.25 });
  });

  it('60 ДНК: уровень 3, прогресс зафиксирован на 1 (cap без перелива)', () => {
    const ctx = createRunState();
    ctx.dnaXp.chimera = 60;
    expect(branchLevelFrac(ctx, 'chimera')).toEqual({ lvl: 3, frac: 1 });
    ctx.dnaXp.chimera = 250;
    expect(branchLevelFrac(ctx, 'chimera')).toEqual({ lvl: 3, frac: 1 });
  });
});

describe('hybridPairState: готовность Великого Гибрида', () => {
  it('3+3 в обеих родительских ветках -> готов к сборке', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 60;
    ctx.dnaXp.chimera = 60;
    // plasma_leviathan = vermis + chimera (первый в HYBRIDS)
    const st = hybridPairState(ctx, HYBRIDS[0]);
    expect(st.aLvl).toBe(3);
    expect(st.bLvl).toBe(3);
    expect(st.ready).toBe(true);
    expect(st.taken).toBe(false);
  });

  it('3+2 -> не готов (нужны обе ветки на 3+)', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 60; // уровень 3
    ctx.dnaXp.chimera = 35; // уровень 2
    const st = hybridPairState(ctx, HYBRIDS[0]);
    expect(st.bLvl).toBe(2);
    expect(st.ready).toBe(false);
  });

  it('взятый гибрид помечен taken и больше не готов', () => {
    const ctx = createRunState();
    ctx.dnaXp.mycelium = 60;
    ctx.dnaXp.symbiont = 60;
    const def = HYBRIDS.find((h) => h.id === 'psi_web')!;
    expect(hybridPairState(ctx, def).ready).toBe(true);
    ctx.hybridsTaken.add('psi_web');
    const st = hybridPairState(ctx, def);
    expect(st.taken).toBe(true);
    expect(st.ready).toBe(false);
  });

  it('готовность считается строго по своей паре геномов (из 6 гибридов готов один)', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 60;
    ctx.dnaXp.chimera = 60;
    const states = HYBRIDS.map((h) => hybridPairState(ctx, h));
    const ready = states.filter((s) => s.ready);
    expect(ready).toHaveLength(1);
    expect(ready[0]!.id).toBe('plasma_leviathan');
    // Остальные ветки ещё нулевые: прогресс их баров 0
    const ouroboros = states.find((s) => s.id === 'ouroboros')!;
    expect(ouroboros.aLvl).toBe(3);
    expect(ouroboros.bLvl).toBe(0);
    expect(ouroboros.bFrac).toBe(0);
  });

  it('частичный прогресс веток попадает в состояние (aFrac/bFrac)', () => {
    const ctx = createRunState();
    ctx.dnaXp.vermis = 25; // lvl 1, (25-15)/(35-15) = 0.5
    ctx.dnaXp.symbiont = 50; // lvl 2, (50-35)/(60-35) = 0.6
    const def = HYBRIDS.find((h) => h.id === 'phase_serpent')!; // vermis + symbiont
    const st = hybridPairState(ctx, def);
    expect(st.aLvl).toBe(1);
    expect(st.bLvl).toBe(2);
    expect(st.aFrac).toBeCloseTo(0.5, 5);
    expect(st.bFrac).toBeCloseTo(0.6, 5);
  });
});

describe('hybridPairText: канонический формат строки пары', () => {
  const st = {
    id: 'plasma_leviathan' as const,
    aLvl: 2,
    bLvl: 3,
    aFrac: 0.5,
    bFrac: 1,
    ready: false,
    taken: false,
  };

  it('формат "2/3 X + 3/3 Y -> Z"', () => {
    expect(hybridPairText(st, 'ВЕРМИС', 'ХИМЕРА', 'ПЛАЗМЕННЫЙ ЛЕВИАФАН')).toBe(
      '2/3 ВЕРМИС + 3/3 ХИМЕРА -> ПЛАЗМЕННЫЙ ЛЕВИАФАН',
    );
  });

  it('без имени гибрида хвост "-> ..." не добавляется (split-раскладка виджета)', () => {
    expect(hybridPairText(st, 'ВЕРМИС', 'ХИМЕРА', '')).toBe('2/3 ВЕРМИС + 3/3 ХИМЕРА');
  });

  it('склеивается с реальными именами из i18n (ru по умолчанию)', () => {
    const stFull = { ...st, aLvl: 3 };
    const text = hybridPairText(stFull, dnaName('vermis'), dnaName('chimera'), hybridName('plasma_leviathan'));
    expect(dnaName('vermis')).toBe('ВЕРМИС');
    expect(hybridName('plasma_leviathan')).toBe('ПЛАЗМЕННЫЙ ЛЕВИАФАН');
    expect(text).toBe('3/3 ВЕРМИС + 3/3 ХИМЕРА -> ПЛАЗМЕННЫЙ ЛЕВИАФАН');
  });
});
