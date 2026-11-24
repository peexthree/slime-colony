// Локальная таблица рекордов по веткам генома
export interface LeaderboardEntry {
  branch: string;
  time: number;
  kills: number;
  scale: number;
  damageDealt: number;
  date: string;
}

const STORAGE_KEY = 'lumivore_leaderboard_v1';
const MAX_PER_BRANCH = 5;

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recordLeaderboardEntry(entry: Omit<LeaderboardEntry, 'date'>): LeaderboardEntry[] {
  const all = loadLeaderboard();
  const item: LeaderboardEntry = {
    ...entry,
    date: new Date().toISOString().slice(0, 10),
  };
  all.push(item);

  const byBranch = new Map<string, LeaderboardEntry[]>();
  for (const e of all) {
    const list = byBranch.get(e.branch) ?? [];
    list.push(e);
    byBranch.set(e.branch, list);
  }

  const trimmed: LeaderboardEntry[] = [];
  for (const list of byBranch.values()) {
    list.sort((a, b) => b.time - a.time || b.damageDealt - a.damageDealt);
    trimmed.push(...list.slice(0, MAX_PER_BRANCH));
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
  return getTopForBranch(entry.branch, trimmed);
}

export function getTopForBranch(branch: string, list = loadLeaderboard()): LeaderboardEntry[] {
  return list
    .filter((e) => e.branch === branch)
    .sort((a, b) => b.time - a.time || b.damageDealt - a.damageDealt)
    .slice(0, MAX_PER_BRANCH);
}
