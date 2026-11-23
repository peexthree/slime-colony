// Кодекс и Бестиарий LUMIVORE: THE LIVING FRACTAL
// Каталог организмов ЕвроКорп-3, открытые виды сохраняются в localStorage

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
    name: 'ВЕРМИС (Змей)',
    category: 'branch',
    iconId: 'ico-vermis',
    color: '#66fcf1',
    lore: 'Первичный биокинетический штамм. Превращает тело змеи в сегментированный хлыст чистой кинетической энергии.',
    bonus: '+5% к ёмкости хвоста',
  },
  {
    id: 'chimera',
    name: 'ХИМЕРА (Мутант)',
    category: 'branch',
    iconId: 'ico-chimera',
    color: '#ff7b93',
    lore: 'Нестабильная клеточная масса реактора. Провоцирует спонтанные выбросы плазмы и взрывные сверхновые.',
    bonus: '+5% к взрывному урону',
  },
  {
    id: 'mycelium',
    name: 'МИЦЕЛИЙ (Рой)',
    category: 'branch',
    iconId: 'ico-mycelium',
    color: '#86efac',
    lore: 'Нейросеть паразитических гиф. Заражает ткани противников спорами, заставляя павших служить организму.',
    bonus: '+0.2 HP/сек регенерации',
  },
  {
    id: 'symbiont',
    name: 'СИМБИОНТ (Фаза)',
    category: 'branch',
    iconId: 'ico-symbiont',
    color: '#ffd166',
    lore: 'Фотонно-резонансный субстрат. Позволяет организму смещаться в фазовое пространство и генерировать тесла-дуги.',
    bonus: '+5% к радиусу сбора душ',
  },

  // --- Великие Гибриды ---
  {
    id: 'plasma_leviathan',
    name: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН',
    category: 'hybrid',
    iconId: 'ico-hybrid-plasma-leviathan',
    color: '#ff6b2b',
    lore: 'Слияние Вермиса и Химеры. Огненный Удав: Кольцо Смерти испепеляет всё живое внутри себя четырёхкратным плазменным жаром.',
    bonus: '+8% к урону Кольца Смерти',
  },
  {
    id: 'ouroboros',
    name: 'УРОБОРОС-ПАРАЗИТ',
    category: 'hybrid',
    iconId: 'ico-hybrid-ouroboros',
    color: '#00ff9d',
    lore: 'Слияние Вермиса и Мицелия. Живой Инкубатор: жертвы хвоста органически врастают в тело змеи, мгновенно регенерируя биомассу.',
    bonus: '+10% к длине хвоста при поглощении',
  },
  {
    id: 'phase_serpent',
    name: 'ФАЗОВЫЙ ЗМЕЙ',
    category: 'hybrid',
    iconId: 'ico-hybrid-phase-serpent',
    color: '#66fcf1',
    lore: 'Слияние Вермиса и Симбионта. Грави-Хлыст: витки хвоста искривляют траектории вражеских ядовитых снарядов и метают их обратно в рой.',
    bonus: '+6% к скорости бега',
  },
  {
    id: 'spore_reactor',
    name: 'СПОРОВЫЙ РЕАКТОР',
    category: 'hybrid',
    iconId: 'ico-hybrid-spore-reactor',
    color: '#39ff14',
    lore: 'Слияние Химеры и Мицелия. Чумная Сверхновая: взрыв Новы заражает спорами, детонирующими цепной реакцией через тела погибших.',
    bonus: '+10% к радиусу Новы',
  },
  {
    id: 'ion_colossus',
    name: 'ИОННЫЙ КОЛОСС',
    category: 'hybrid',
    iconId: 'ico-hybrid-ion-colossus',
    color: '#ffb800',
    lore: 'Слияние Химеры и Симбионта. Тесла-Сеть: сферы орбит соединяются высоковольтными световыми дугами, разрезая орду световой паутиной.',
    bonus: '+8% к урону орбит',
  },
  {
    id: 'psi_web',
    name: 'ПСИ-СЕТЬ',
    category: 'hybrid',
    iconId: 'ico-hybrid-psi-web',
    color: '#b55cff',
    lore: 'Слияние Мицелия и Симбионта. Сверхразум: био-узлы территории захватываются дистанционно и ведут непрерывный огонь лазерами.',
    bonus: '+15% к скорости захвата узлов',
  },

  // --- Вражеская экосистема ---
  {
    id: 'grub',
    name: 'Личинка распада',
    category: 'enemy',
    iconId: 'ico-skull-hazard',
    color: '#39ff14',
    lore: 'Младшая форма биологического мусора реактора. Не представляет угрозы поодиночке, но собирается в лавины.',
    bonus: '+3% урона по личинкам',
  },
  {
    id: 'runner',
    name: 'Бегун-фазовик',
    category: 'enemy',
    iconId: 'ico-fury',
    color: '#66fcf1',
    lore: 'Быстрый мутировавший хищник. Способен развивать высокую скорость на прямых участках охоты.',
    bonus: '+3% урона по бегунам',
  },
  {
    id: 'brute',
    name: 'Хитиновый громила',
    category: 'enemy',
    iconId: 'ico-macro-scale',
    color: '#ff3b4e',
    lore: 'Тяжелобронированная особь с плотным панцирем. Пробивает оборону массой и высокой живучестью.',
    bonus: '+4% урона по громилам',
  },
  {
    id: 'splitter',
    name: 'Дробитель митоза',
    category: 'enemy',
    iconId: 'ico-chimera',
    color: '#d946ef',
    lore: 'Организм на грани нестабильного деления. При гибели распадается на двух агрессивных бегунов.',
    bonus: '+3% урона по дробителям',
  },
  {
    id: 'spitter',
    name: 'Кислотный плеватель',
    category: 'enemy',
    iconId: 'ico-weapon-aura',
    color: '#ffb800',
    lore: 'Осторожная дальнебойная особь. Держит дистанцию и обстреливает цель едкими токсичными сгустками.',
    bonus: '+3% урона по плевателям',
  },
  {
    id: 'healer',
    name: 'Симбиот-целитель',
    category: 'enemy',
    iconId: 'ico-node-incubator',
    color: '#00ff9d',
    lore: 'Биологический регенератор роя. Испускает ферменты, залечивающие раны окружающих сородичей. Приоритетная цель.',
    bonus: '+4% урона по целителям',
  },
  {
    id: 'pulsar',
    name: 'Пульсар-страж',
    category: 'enemy',
    iconId: 'ico-damage-nova',
    color: '#b55cff',
    lore: 'Неподвижный био-резонатор. Контролирует территорию периодическими мощными грави-волнами отброса.',
    bonus: '+4% урона по пульсарам',
  },
  {
    id: 'mirror',
    name: 'Призматический страж',
    category: 'enemy',
    iconId: 'ico-weapon-spikes',
    color: '#7df9ff',
    lore: 'Хрустальный организм, отражающий получаемый урон обратно в атакующего в ближнем радиусе.',
    bonus: '+5% урона по стражам',
  },
  {
    id: 'colony',
    name: 'Био-матка колонии',
    category: 'enemy',
    iconId: 'ico-node-gen',
    color: '#ff8800',
    lore: 'Репродуктивный узел выводка. Непрерывно порождает роевых паразитов, пока не будет уничтожена.',
    bonus: '+5% урона по маткам',
  },
  {
    id: 'boss',
    name: 'Титан ЕвроКорп-3',
    category: 'enemy',
    iconId: 'ico-record-badge',
    color: '#ff2a85',
    lore: 'Колоссальное воплощение био-эволюции текущей шкалы бытия. Хранитель рубежа метаморфоза.',
    bonus: '+6% урона по боссам и титанам',
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
