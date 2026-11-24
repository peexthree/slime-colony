// Кодекс и Бестиарий LUMIVORE: THE LIVING FRACTAL
// Каталог организмов реактора «ЕвроКорп-3», открытые записи сохраняются в localStorage

export interface CodexEntry {
  id: string;
  name: string;
  category: 'enemy' | 'branch' | 'hybrid';
  iconId: string;
  color: string;
  lore: string;
  bonus: string;
}

export const CODEX_ENTRIES: CodexEntry[] = [
  // --- Базовые геномы ---
  {
    id: 'vermis',
    name: 'ВЕРМИС (Хлыст)',
    category: 'branch',
    iconId: 'ico-vermis',
    color: '#66fcf1',
    lore: 'Первичный биокинетический штамм. Превращает хвост особи в сегментированный хлыст кинетической энергии.',
    bonus: '+5% к ёмкости хвоста',
  },
  {
    id: 'chimera',
    name: 'ХИМЕРА (Мутант)',
    category: 'branch',
    iconId: 'ico-chimera',
    color: '#ff7b93',
    lore: 'Нестабильная клеточная масса реактора. Провоцирует выбросы плазмы и взрывные импульсы.',
    bonus: '+5% к взрывному урону',
  },
  {
    id: 'mycelium',
    name: 'МИЦЕЛИЙ (Споровик)',
    category: 'branch',
    iconId: 'ico-mycelium',
    color: '#86efac',
    lore: 'Нейросеть паразитических гиф. Заражает ткани врагов спорами и подчиняет павших особей.',
    bonus: '+0.2 HP/с регенерации',
  },
  {
    id: 'symbiont',
    name: 'СИМБИОНТ (Фаза)',
    category: 'branch',
    iconId: 'ico-symbiont',
    color: '#ffd166',
    lore: 'Фотонно-резонансный субстрат. Повышает скорость реакции, магнетизм и стабильность поля.',
    bonus: '+5% к радиусу сбора сфер',
  },

  // --- Великие Гибриды ---
  {
    id: 'plasma_leviathan',
    name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН',
    category: 'hybrid',
    iconId: 'ico-hybrid-plasma-leviathan',
    color: '#ff6b2b',
    lore: 'Слияние Вермиса и Химеры. Огненный Удав: Кольцо Смерти испепеляет обычных врагов внутри с уроном x4.',
    bonus: '+8% к урону Кольца Смерти',
  },
  {
    id: 'ouroboros',
    name: 'УРОБОРОС-ПАРАЗИТ',
    category: 'hybrid',
    iconId: 'ico-hybrid-ouroboros',
    color: '#00ff9d',
    lore: 'Слияние Вермиса и Мицелия. Живой Инкубатор: жертвы хвоста врастают в тело, восполняя сегменты.',
    bonus: '+10% к росту хвоста при поглощении',
  },
  {
    id: 'phase_serpent',
    name: 'ФАЗОВЫЙ ЗМЕЙ',
    category: 'hybrid',
    iconId: 'ico-hybrid-phase-serpent',
    color: '#66fcf1',
    lore: 'Слияние Вермиса и Симбионта. Грави-Хлыст: витки хвоста перехватывают вражеские снаряды и бьют обратно.',
    bonus: '+6% к скорости движения',
  },
  {
    id: 'spore_reactor',
    name: 'СПОРОВЫЙ РЕАКТОР',
    category: 'hybrid',
    iconId: 'ico-hybrid-spore-reactor',
    color: '#39ff14',
    lore: 'Слияние Химеры и Мицелия. Чумная Сверхновая: Нова заражает врагов спорами, вызывая цепной взрыв.',
    bonus: '+10% к радиусу Новы',
  },
  {
    id: 'ion_colossus',
    name: 'ИОННЫЙ КОЛОСС',
    category: 'hybrid',
    iconId: 'ico-hybrid-ion-colossus',
    color: '#ffb800',
    lore: 'Слияние Химеры и Симбионта. Тесла-Сеть: электроорбиты бьют дугами по ближайшим врагам.',
    bonus: '+8% к урону орбит',
  },
  {
    id: 'psi_web',
    name: 'ПСИ-СЕТЬ',
    category: 'hybrid',
    iconId: 'ico-hybrid-psi-web',
    color: '#b55cff',
    lore: 'Слияние Мицелия и Симбионта. Сверхразум: ускоренный захват био-узлов и лазерный огонь с них.',
    bonus: '+15% к скорости захвата узлов',
  },

  // --- Вражеская экосистема ---
  {
    id: 'grub',
    name: 'Личинка распада',
    category: 'enemy',
    iconId: 'ico-skull-hazard',
    color: '#39ff14',
    lore: 'Младшая форма биомассы роя. Слаба поодиночке, но опасна в плотных скоплениях.',
    bonus: '+3% урона по личинкам',
  },
  {
    id: 'runner',
    name: 'Бегун-фазовик',
    category: 'enemy',
    iconId: 'ico-fury',
    color: '#66fcf1',
    lore: 'Быстрый мутировавший хищник, преследующий цель на высокой скорости.',
    bonus: '+3% урона по бегунам',
  },
  {
    id: 'brute',
    name: 'Хитиновый громила',
    category: 'enemy',
    iconId: 'ico-macro-scale',
    color: '#ff3b4e',
    lore: 'Тяжелобронированная особь с плотным панцирем. Давит массой и высокой живучестью.',
    bonus: '+4% урона по громилам',
  },
  {
    id: 'splitter',
    name: 'Дробитель митоза',
    category: 'enemy',
    iconId: 'ico-chimera',
    color: '#d946ef',
    lore: 'Организм на грани нестабильного деления. При гибели распадается на двух бегунов.',
    bonus: '+3% урона по дробителям',
  },
  {
    id: 'spitter',
    name: 'Кислотный плеватель',
    category: 'enemy',
    iconId: 'ico-weapon-aura',
    color: '#ffb800',
    lore: 'Дальнебойная особь. Держит дистанцию и плюёт едкими токсичными сгустками.',
    bonus: '+3% урона по плевателям',
  },
  {
    id: 'healer',
    name: 'Симбиот-целитель',
    category: 'enemy',
    iconId: 'ico-node-incubator',
    color: '#00ff9d',
    lore: 'Биологический регенератор роя. Выделяет ферменты, залечивающие раны сородичей рядом.',
    bonus: '+4% урона по целителям',
  },
  {
    id: 'pulsar',
    name: 'Пульсар-страж',
    category: 'enemy',
    iconId: 'ico-damage-nova',
    color: '#b55cff',
    lore: 'Неподвижный био-резонатор. Сдерживает территорию периодическими волнами отброса.',
    bonus: '+4% урона по пульсарам',
  },
  {
    id: 'mirror',
    name: 'Призматический страж',
    category: 'enemy',
    iconId: 'ico-weapon-spikes',
    color: '#7df9ff',
    lore: 'Кристаллический организм. Удерживает дистанцию и ведёт частый обстрел сгустками энергии.',
    bonus: '+5% урона по стражам',
  },
  {
    id: 'colony',
    name: 'Био-матка колонии',
    category: 'enemy',
    iconId: 'ico-node-gen',
    color: '#ff8800',
    lore: 'Репродуктивный узел выводка. Непрерывно порождает паразитов, пока не будет уничтожена.',
    bonus: '+5% урона по маткам',
  },
  {
    id: 'brood',
    name: 'Выводок колонии',
    category: 'enemy',
    iconId: 'ico-skull-hazard',
    color: '#ffaa00',
    lore: 'Мелкие роевые паразиты био-матки. Гибнут вместе с ней, а их смерть лечит саму матку.',
    bonus: '+4% урона по выводку',
  },
  {
    id: 'boss',
    name: 'Страж цикла',
    category: 'enemy',
    iconId: 'ico-record-badge',
    color: '#ff2a85',
    lore: 'Крупный хищник реактора, появляющийся каждые 90 секунд. В ярости бьёт веером шипов.',
    bonus: '+5% урона по стражам цикла',
  },
  {
    id: 'titan',
    name: 'Титан ЕвроКорп-3',
    category: 'enemy',
    iconId: 'ico-macro-scale',
    color: '#ffd700',
    lore: 'Колоссальный хранитель рубежа метаморфоза. Его гибель открывает путь к новому масштабу бытия.',
    bonus: '+6% урона по титанам',
  },
];

const STORAGE_KEY = 'lumivore-codex-v1';

export function loadCodex(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>(['grub', 'vermis']);
    const arr = JSON.parse(raw);
    return new Set<string>(Array.isArray(arr) ? arr : ['grub', 'vermis']);
  } catch {
    return new Set<string>(['grub', 'vermis']);
  }
}

export function unlockCodexEntry(id: string): boolean {
  const set = loadCodex();
  if (set.has(id)) return false;
  set.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
  return true;
}

export interface CodexBonusSummary {
  tailCapMul: number;
  explosiveDmgMul: number;
  regenAdd: number;
  magnetMul: number;
  ringDmgMul: number;
  absorbMul: number;
  moveSpeedMul: number;
  novaRadiusMul: number;
  orbsDmgMul: number;
  captureSpeedMul: number;
  enemyDmgMul: Record<string, number>;
}

/** Расчёт пассивных бонусов Кодекса по открытым записям */
export function getCodexBonuses(unlocked = loadCodex()): CodexBonusSummary {
  const has = (id: string) => unlocked.has(id);
  return {
    tailCapMul: has('vermis') ? 1.05 : 1,
    explosiveDmgMul: has('chimera') ? 1.05 : 1,
    regenAdd: has('mycelium') ? 0.2 : 0,
    magnetMul: has('symbiont') ? 1.05 : 1,
    ringDmgMul: has('plasma_leviathan') ? 1.08 : 1,
    absorbMul: has('ouroboros') ? 1.1 : 1,
    moveSpeedMul: has('phase_serpent') ? 1.06 : 1,
    novaRadiusMul: has('spore_reactor') ? 1.1 : 1,
    orbsDmgMul: has('ion_colossus') ? 1.08 : 1,
    captureSpeedMul: has('psi_web') ? 1.15 : 1,
    enemyDmgMul: {
      grub: has('grub') ? 1.03 : 1,
      runner: has('runner') ? 1.03 : 1,
      brute: has('brute') ? 1.04 : 1,
      splitter: has('splitter') ? 1.03 : 1,
      spitter: has('spitter') ? 1.03 : 1,
      healer: has('healer') ? 1.04 : 1,
      pulsar: has('pulsar') ? 1.04 : 1,
      mirror: has('mirror') ? 1.05 : 1,
      colony: has('colony') ? 1.05 : 1,
      brood: has('brood') ? 1.04 : 1,
      boss: has('boss') ? 1.05 : 1,
      titan: has('titan') ? 1.06 : 1,
    },
  };
}
