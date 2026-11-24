// Система достижений LUMIVORE: THE LIVING FRACTAL
export interface AchievementStats {
  time: number;
  kills: number;
  nodesHeldMax: number;
  scaleMax: number;
  damageDealt: number;
  codexCount: number;
  codexTotal: number;
  win: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  condition: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', title: 'Первая кровь', desc: 'Уничтожить 50 организмов за забег', condition: (s) => s.kills >= 50 },
  { id: 'swarm_slayer', title: 'Истребитель роя', desc: 'Уничтожить 500 организмов за забег', condition: (s) => s.kills >= 500 },
  { id: 'node_master', title: 'Повелитель узлов', desc: 'Удерживать 10 био-узлов одновременно', condition: (s) => s.nodesHeldMax >= 10 },
  { id: 'scale_2', title: 'Второй масштаб', desc: 'Достичь 2-й шкалы бытия', condition: (s) => s.scaleMax >= 2 },
  { id: 'scale_5', title: 'Абсолютная форма', desc: 'Достичь 5-й шкалы бытия', condition: (s) => s.scaleMax >= 5 },
  { id: 'survivor_5m', title: 'Стойкий штамм', desc: 'Выжить 5 минут в реакторе', condition: (s) => s.time >= 300 },
  { id: 'survivor_10m', title: 'Ветеран ЕвроКорп-3', desc: 'Выжить 10 минут в реакторе', condition: (s) => s.time >= 600 },
  { id: 'damage_100k', title: 'Разрушитель', desc: 'Нанести 100 000 урона за забег', condition: (s) => s.damageDealt >= 100_000 },
  { id: 'codex_collector', title: 'Био-архивариус', desc: 'Открыть все записи Кодекса', condition: (s) => s.codexTotal > 0 && s.codexCount >= s.codexTotal },
  { id: 'apex_victory', title: 'Триумф фрактала', desc: 'Пройти все 5 шкал и победить Титана', condition: (s) => s.win },
];

const STORAGE_KEY = 'lumivore_achievements_v1';

export function loadAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function checkAchievements(stats: AchievementStats): AchievementDef[] {
  const unlocked = loadAchievements();
  const newly: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.condition(stats)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }
  if (newly.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
    } catch {}
  }
  return newly;
}
