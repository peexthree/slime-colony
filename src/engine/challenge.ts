// Режим «Испытание дня» (Daily Challenge) с детерминированным seed
import type { DnaBranch } from './types';

export interface DailyChallengeInfo {
  seed: number;
  dayKey: string;
  branch: DnaBranch;
  title: string;
  bonusPoints: number;
}

/** Быстрый детерминированный PRNG Mulberry32 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BRANCH_LIST: DnaBranch[] = ['vermis', 'chimera', 'mycelium', 'symbiont'];
const CHALLENGE_TITLES: Record<DnaBranch, string> = {
  vermis: 'КИНЕТИЧЕСКИЙ ХЛЫСТ',
  chimera: 'НЕСТАБИЛЬНЫЙ РЕАКТОР',
  mycelium: 'СПОРОВАЯ ЭКСПАНСИЯ',
  symbiont: 'ФАЗОВЫЙ РЕЗОНАНС',
};

export function getDailyChallenge(): DailyChallengeInfo {
  const dayNum = Math.floor(Date.now() / 86_400_000);
  const rng = mulberry32(dayNum * 2654435761);
  const branch = BRANCH_LIST[Math.floor(rng() * BRANCH_LIST.length)];
  const dayKey = new Date(dayNum * 86_400_000).toISOString().slice(0, 10);
  return {
    seed: dayNum,
    dayKey,
    branch,
    title: CHALLENGE_TITLES[branch],
    bonusPoints: 50,
  };
}
