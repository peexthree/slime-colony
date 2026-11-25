import { describe, it, expect, beforeEach } from 'vitest';
import { segIsect, polyArea, inPoly } from '../ringOfDeath';
import { SpatialHashGrid } from '../spatialHash';
import { canUnlockWeapon, canUpgradeWeapon, equippedWeaponCount, requiredLevelForWeapon, xpRequiredForLevel } from '../progression';
import { stepBioNodes } from '../bioNodes';
import { getDailyChallenge, isDailyCompleted, markDailyCompleted, mulberry32 } from '../../engine/challenge';
import { ACHIEVEMENTS } from '../../engine/achievements';
import { BioNode, HYBRIDS, MAX_EQUIPPED_WEAPONS, SCALES, DNA_LEVELS, WeaponId } from '../../engine/types';
import {
  MAX_ACTIVE_BIOLAB,
  addBiolabPoints,
  disableAllBiolab,
  getActiveIds,
  isActive,
  loadBiolab,
  purchase,
  recordRun,
  toggleModule,
} from '../../engine/biolab';
import { CODEX_ENTRIES, getCodexBonuses } from '../../engine/codex';
import { recordLeaderboardEntry, getTopForBranch } from '../../engine/leaderboard';
import { WaveDirector } from '../../engine/waves';

function mockLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('ringOfDeath geometry', () => {
  it('computes segment intersection accurately', () => {
    const p = segIsect(0, 0, 10, 10, 0, 10, 10, 0);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(5, 5);
    expect(p!.y).toBeCloseTo(5, 5);
  });

  it('returns null for parallel or disjoint segments', () => {
    expect(segIsect(0, 0, 10, 0, 0, 5, 10, 5)).toBeNull();
    expect(segIsect(0, 0, 2, 2, 5, 0, 5, 10)).toBeNull();
  });

  it('computes polygon area using shoelace formula', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(polyArea(square)).toBeCloseTo(10000, 5);
  });

  it('checks point-in-polygon correctly', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(inPoly(50, 50, square)).toBe(true);
    expect(inPoly(150, 50, square)).toBe(false);
    expect(inPoly(-10, 50, square)).toBe(false);
  });
});

describe('SpatialHashGrid', () => {
  interface Item { id: number; x: number; y: number }
  let grid: SpatialHashGrid<Item>;

  beforeEach(() => {
    grid = new SpatialHashGrid<Item>(50);
  });

  it('queries nearby items within radius buckets', () => {
    const items: Item[] = [
      { id: 1, x: 10, y: 10 },
      { id: 2, x: 35, y: 35 },
      { id: 3, x: 500, y: 500 },
    ];
    grid.insertAll(items);
    const near = grid.queryRadius(20, 20, 40);
    const ids = near.map((i) => i.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });
});

describe('Daily Challenge PRNG & Balance Constants', () => {
  it('mulberry32 is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('has 6 hybrids and 5 scales with strictly increasing biomass goals', () => {
    expect(HYBRIDS.length).toBe(6);
    expect(SCALES.length).toBe(5);
    expect(DNA_LEVELS.length).toBe(3);
    for (let i = 1; i < SCALES.length; i++) {
      expect(SCALES[i].biomassGoal).toBeGreaterThan(SCALES[i - 1].biomassGoal);
    }
  });

  it('evaluates achievement conditions cleanly', () => {
    const stats = {
      time: 610,
      kills: 520,
      nodesHeldMax: 10,
      scaleMax: 5,
      damageDealt: 120_000,
      codexCount: 10,
      codexTotal: 10,
      win: true,
    };
    for (const ach of ACHIEVEMENTS) {
      expect(ach.condition(stats)).toBe(true);
    }
  });
});

describe('Biolab, Codex, Leaderboard & WaveDirector', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('recovers safely from corrupted biolab localStorage', () => {
    localStorage.setItem('lumivore-biolab-v1', '{bad json');
    const s = loadBiolab();
    expect(s.points).toBe(0);
    expect(s.runs).toBe(0);
    const updated = recordRun({
      branch: 'vermis',
      weapons: ['spikes'],
      topUpgrades: [],
      survivalTime: 120,
      kills: 80,
      level: 5,
      bioNodesHeld: 3,
      tailMaxReached: 24,
      damageDealt: 5000,
      record: true,
    });
    expect(updated.runs).toBe(1);
    expect(updated.points).toBeGreaterThan(0);
  });

  it('computes codex bonuses when entries are unlocked', () => {
    const empty = getCodexBonuses(new Set());
    const full = getCodexBonuses(new Set(CODEX_ENTRIES.map((e) => e.id)));
    expect(empty.tailCapMul).toBe(1);
    expect(full.tailCapMul).toBeGreaterThan(1);
  });

  it('sorts and trims leaderboard entries per branch', () => {
    for (let i = 0; i < 7; i++) {
      recordLeaderboardEntry({ branch: 'chimera', time: 10 + i * 10, kills: 50, scale: 2, damageDealt: 1000 });
    }
    const top = getTopForBranch('chimera');
    expect(top.length).toBe(5);
    expect(top[0].time).toBe(70);
  });

  it('fires wave events in WaveDirector', () => {
    const announced: string[] = [];
    const wd = new WaveDirector({
      addEnemy: () => {},
      ringAround: () => {},
      dropOrb: () => {},
      announce: (txt) => announced.push(txt),
      playerPos: () => ({ x: 500, y: 500 }),
    });
    wd.update(0.1, 65);
    expect(announced.length).toBeGreaterThan(0);
  });
});

describe('Progression Level Gates & Caps', () => {
  it('enforces level gates per weapon and 4-slot cap', () => {
    const wlvl: Record<WeaponId, number> = {
      spikes: 1, mandibles: 0, orbs: 0, aura: 0, nova: 0, cysts: 0,
    };
    expect(equippedWeaponCount(wlvl)).toBe(1);
    expect(canUnlockWeapon('mandibles', wlvl, 2)).toBe(false);
    expect(canUnlockWeapon('mandibles', wlvl, 3)).toBe(true);
    expect(canUnlockWeapon('cysts', wlvl, 9)).toBe(false);
    expect(canUnlockWeapon('cysts', wlvl, 11)).toBe(true);

    wlvl.mandibles = 1;
    wlvl.orbs = 1;
    wlvl.aura = 1;
    expect(equippedWeaponCount(wlvl)).toBe(MAX_EQUIPPED_WEAPONS);
    expect(canUnlockWeapon('nova', wlvl, 20)).toBe(false);
    expect(canUnlockWeapon('cysts', wlvl, 20)).toBe(false);

    expect(canUpgradeWeapon('spikes', 1, 2)).toBe(false);
    expect(canUpgradeWeapon('spikes', 1, 3)).toBe(true);
    expect(canUpgradeWeapon('spikes', 2, 5)).toBe(false);
    expect(canUpgradeWeapon('spikes', 2, 6)).toBe(true);
    expect(requiredLevelForWeapon('cysts', 1)).toBe(11);
  });

  it('grows XP curve smoothly and monotonically', () => {
    let prev = xpRequiredForLevel(1);
    expect(prev).toBeGreaterThan(10);
    for (let lvl = 2; lvl <= 15; lvl++) {
      const next = xpRequiredForLevel(lvl);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });
});

describe('Bio-Node Zone Hold & Contesting', () => {
  const makeNode = (): BioNode => ({
    id: 0,
    x: 200,
    y: 200,
    radius: 68,
    owner: 0,
    capture: 0,
    kind: 'gen',
  });

  it('captures node when player holds empty zone, pauses on contest, and drains when raided', () => {
    const node = makeNode();
    const res1 = stepBioNodes([node], { x: 200, y: 200 }, [], 4.0, 1, false);
    expect(node.owner).toBe(1);
    expect(node.capture).toBe(1);
    expect(res1.ownerChanged).toContain(node);

    const beforeContest = node.capture;
    stepBioNodes([node], { x: 200, y: 200 }, [{ x: 210, y: 200, hp: 10, infected: 0 }], 1.0, 1, false);
    expect(node.contested).toBe(true);
    expect(node.capture).toBe(beforeContest);

    const resRaid = stepBioNodes([node], { x: 800, y: 800 }, [
      { x: 205, y: 200, hp: 10, infected: 0 },
      { x: 195, y: 205, hp: 10, infected: 0 },
    ], 1.0, 1, false);
    expect(node.raided).toBe(true);
    expect(resRaid.newlyRaided).toContain(node);
    expect(node.capture).toBeLessThan(1);

    stepBioNodes([node], { x: 800, y: 800 }, [
      { x: 205, y: 200, hp: 10, infected: 0 },
      { x: 195, y: 205, hp: 10, infected: 0 },
      { x: 200, y: 210, hp: 10, infected: 0 },
    ], 4.0, 1, false);
    expect(node.owner).toBe(0);
  });
});

describe('Biolab Toggles, Slot Cap & Daily Completion', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('enforces 4 active slots, exclusive categories, toggles and disableAllBiolab', () => {
    addBiolabPoints(500);
    expect(purchase('start_orbs')).toBe(true);
    expect(purchase('start_aura')).toBe(true);
    expect(isActive('start_orbs')).toBe(true);
    expect(isActive('start_aura')).toBe(false);

    const swapRes = toggleModule('start_aura');
    expect(swapRes.ok).toBe(true);
    expect(swapRes.swappedId).toBe('start_orbs');
    expect(isActive('start_aura')).toBe(true);
    expect(isActive('start_orbs')).toBe(false);

    expect(purchase('unlock_vermis')).toBe(true);
    expect(purchase('perm_regen')).toBe(true);
    expect(purchase('perm_magnet')).toBe(true);
    expect(purchase('perm_dmg')).toBe(true);
    expect(getActiveIds().length).toBe(MAX_ACTIVE_BIOLAB);
    expect(isActive('perm_dmg')).toBe(false);

    const limitRes = toggleModule('perm_dmg');
    expect(limitRes.ok).toBe(false);
    expect(limitRes.reason).toBe('limit');

    disableAllBiolab();
    expect(getActiveIds().length).toBe(0);
  });

  it('tracks daily challenge modifiers and once-per-day completion', () => {
    const ch = getDailyChallenge(Date.UTC(2026, 4, 15));
    expect(ch.goalTimeSec).toBe(180);
    expect(ch.goalScale).toBe(2);
    expect(ch.bonusPoints).toBe(50);
    expect(ch.modifiers.xpMul).toBeGreaterThan(0);

    expect(isDailyCompleted(ch.dayKey)).toBe(false);
    expect(markDailyCompleted(ch.dayKey)).toBe(true);
    expect(isDailyCompleted(ch.dayKey)).toBe(true);
    expect(markDailyCompleted(ch.dayKey)).toBe(false);
  });
});
