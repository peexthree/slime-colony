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
  titleEn: string;
  desc: string;
  descEn: string;
  iconId: string;
  reward: number;
  condition: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    title: 'Первая кровь',
    titleEn: 'First Blood',
    desc: 'Уничтожить 50 организмов за забег',
    descEn: 'Slay 50 organisms in a single run',
    iconId: 'ico-ach-first-blood',
    reward: 15,
    condition: (s) => s.kills >= 50,
  },
  {
    id: 'swarm_slayer',
    title: 'Истребитель роя',
    titleEn: 'Swarm Slayer',
    desc: 'Уничтожить 500 организмов за забег',
    descEn: 'Slay 500 organisms in a single run',
    iconId: 'ico-ach-swarm-survivor',
    reward: 30,
    condition: (s) => s.kills >= 500,
  },
  {
    id: 'node_master',
    title: 'Повелитель башен',
    titleEn: 'Tower Overlord',
    desc: 'Удерживать 6 био-башен одновременно',
    descEn: 'Hold 6 bio-towers simultaneously',
    iconId: 'ico-ach-untouchable',
    reward: 25,
    condition: (s) => s.nodesHeldMax >= 6,
  },
  {
    id: 'scale_2',
    title: 'Второй масштаб',
    titleEn: 'Second Scale',
    desc: 'Достичь 2-й шкалы бытия',
    descEn: 'Reach Scale 2',
    iconId: 'ico-ach-evolution',
    reward: 20,
    condition: (s) => s.scaleMax >= 2,
  },
  {
    id: 'scale_5',
    title: 'Абсолютная форма',
    titleEn: 'Apex Form',
    desc: 'Достичь 5-й шкалы бытия',
    descEn: 'Reach Scale 5',
    iconId: 'ico-ach-apex-tail',
    reward: 45,
    condition: (s) => s.scaleMax >= 5,
  },
  {
    id: 'survivor_5m',
    title: 'Стойкий штамм',
    titleEn: 'Resilient Strain',
    desc: 'Выжить 5 минут в реакторе',
    descEn: 'Survive 5 minutes in the reactor',
    iconId: 'ico-ach-speedrunner',
    reward: 20,
    condition: (s) => s.time >= 300,
  },
  {
    id: 'survivor_10m',
    title: 'Ветеран ЕвроКорп-3',
    titleEn: 'EuroCorp-3 Veteran',
    desc: 'Выжить 10 минут в реакторе',
    descEn: 'Survive 10 minutes in the reactor',
    iconId: 'ico-ach-hybrid',
    reward: 35,
    condition: (s) => s.time >= 600,
  },
  {
    id: 'damage_100k',
    title: 'Разрушитель',
    titleEn: 'Devastator',
    desc: 'Нанести 100 000 урона за забег',
    descEn: 'Deal 100,000 damage in a single run',
    iconId: 'ico-ach-cursed',
    reward: 30,
    condition: (s) => s.damageDealt >= 100_000,
  },
  {
    id: 'codex_collector',
    title: 'Био-архивариус',
    titleEn: 'Bio-Archivist',
    desc: 'Открыть все записи Кодекса',
    descEn: 'Unlock all Codex entries',
    iconId: 'ico-ach-collector',
    reward: 40,
    condition: (s) => s.codexTotal > 0 && s.codexCount >= s.codexTotal,
  },
  {
    id: 'apex_victory',
    title: 'Триумф фрактала',
    titleEn: 'Fractal Triumph',
    desc: 'Пройти все 5 шкал и победить Титана',
    descEn: 'Clear all 5 scales and defeat the Final Titan',
    iconId: 'ico-ach-boss-slayer',
    reward: 60,
    condition: (s) => s.win,
  },
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
