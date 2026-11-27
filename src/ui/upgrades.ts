// Улучшения: пул карточек, геномы/гены/гибриды/проклятия, окно выбора и реролл.
import { t, getLocale } from '../i18n';
import { hybridDesc, hybridName, trUpgrade } from '../i18n/gameData';
import { HYBRIDS, MAX_EQUIPPED_WEAPONS, STAT_MAX_STACKS, WEAPON_MAX_LVL } from '../engine/types';
import type { DnaBranch, HybridId, WeaponId } from '../engine/types';
import { canUnlockWeapon, canUpgradeWeapon, equippedWeaponCount } from '../game/progression';
import { unlockCodexEntry } from '../engine/codex';
import type { Ctx } from '../game/context';
import { toSimX, toSimY } from '../game/context';
import { dnaLvl, mainBranchForWeapons, refreshCodexBonuses, refreshResonance } from '../game/state';
import { updateBranchChip, syncStagePhase } from './hud';
import { renderHybridHunt } from './hybridHunt';
import { showToast } from './toast';

/** Определение карточки улучшения: доступность и эффект замыкаются на ctx */
export interface UpgradeDef {
  id: string;
  title: string;
  desc: string;
  avail: (ctx: Ctx) => boolean;
  apply: (ctx: Ctx) => void;
  /** Геном ДНК-матрицы: карточка требует вложений душ в этот геном */
  branch?: DnaBranch;
  /** Великий Гибрид: золотая карта слияния двух геномов */
  hybrid?: HybridId;
  /** Проклятая мутация: колоссальная мощь с фатальной расплатой */
  curse?: boolean;
}

const stack = (ctx: Ctx, id: string) => (ctx.statStacks[id] ?? 0) < STAT_MAX_STACKS;
const bump = (ctx: Ctx, id: string) => (ctx.statStacks[id] = (ctx.statStacks[id] ?? 0) + 1);

/** Эксклюзивный ген генома открыт: 3 ДНК-уровня ветки */
const geneAvail = (ctx: Ctx, branch: DnaBranch, gene: string): boolean =>
  dnaLvl(ctx, branch) >= 3 && !ctx.genes.has(gene);

/** Гибрид - итоговая форма забега: строго одна за прогон */
export const hybridAvail = (ctx: Ctx, id: HybridId): boolean => {
  const def = HYBRIDS.find((h) => h.id === id);
  if (!def) return false;
  if (ctx.hybridsTaken.size > 0) return false;
  return dnaLvl(ctx, def.a) >= 3 && dnaLvl(ctx, def.b) >= 3 && !ctx.hybridsTaken.has(id);
};

/** Взятие гибрида: флавор-бонус + механика включается через hybridsTaken */
export function applyHybrid(ctx: Ctx, id: HybridId): void {
  ctx.hybridsTaken.add(id);
  if (unlockCodexEntry(id)) refreshCodexBonuses(ctx);
  ctx.svc.sfx.hybrid();
  const hybridSlug = id.replace(/_/g, '-');
  showToast(
    ctx,
    `<svg class="bio-icon bio-amber" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg> ` +
    `${getLocale() === 'en' ? 'HYBRIDIZATION' : 'ГИБРИДИЗАЦИЯ'}: ${hybridName(id)}`,
    'warn'
  );
  ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0xffd166, 160);
  if (id === 'plasma_leviathan') ctx.dmgMul += 0.25;
  if (id === 'ouroboros') ctx.tailCapBonus += 8;
  if (id === 'phase_serpent') ctx.moveSpeed *= 1.12;
  if (id === 'spore_reactor') { if (ctx.wlvl.aura > 0) ctx.wlvl.aura = Math.min(WEAPON_MAX_LVL, ctx.wlvl.aura + 1); else ctx.dmgMul += 0.15; }
  if (id === 'ion_colossus') { if (ctx.wlvl.orbs > 0) ctx.wlvl.orbs = Math.min(WEAPON_MAX_LVL, ctx.wlvl.orbs + 1); else ctx.wlvl.orbs = 1; }
  if (id === 'psi_web') ctx.magnetR *= 1.3;
  refreshResonance(ctx);
  refreshMainGenome(ctx);
}

/** Основной геном: активный гибрид сильнее, иначе лидер по ДНК-уровням */
export function refreshMainGenome(ctx: Ctx): void {
  const lastHybrid = [...ctx.hybridsTaken].pop();
  if (lastHybrid) { ctx.mainGenome = lastHybrid; return; }
  let best: Ctx['mainGenome'] = 'neutral';
  let bestLvl = 0;
  for (const b of ['vermis', 'chimera', 'mycelium', 'symbiont'] as DnaBranch[]) {
    const lvl = dnaLvl(ctx, b);
    if (lvl > bestLvl) { bestLvl = lvl; best = b; }
  }
  ctx.mainGenome = best;
}

const WEAPON_IDS: WeaponId[] = ['spikes', 'orbs', 'nova', 'aura', 'mandibles', 'cysts'];

export const UPGRADES: UpgradeDef[] = [
  { id: 'spikes0', title: 'Шипы', desc: 'Автоматические иглы: поражают ближайших врагов', avail: (c) => canUnlockWeapon('spikes', c.wlvl, c.level, mainBranchForWeapons(c)), apply: (c) => { c.wlvl.spikes = 1; refreshResonance(c); } },
  { id: 'spikes+', title: 'Шипы', desc: 'Больше урона, шипов и выше скорострельность', avail: (c) => canUpgradeWeapon('spikes', c.wlvl.spikes, c.level), apply: (c) => c.wlvl.spikes++ },
  { id: 'orbits0', title: 'Электроорбиты', desc: 'Сферы вращаются вокруг вас и жгут врагов рядом', avail: (c) => canUnlockWeapon('orbs', c.wlvl, c.level, mainBranchForWeapons(c)), apply: (c) => { c.wlvl.orbs = 1; refreshResonance(c); } },
  { id: 'orbits+', title: 'Электроорбиты', desc: '+1 сфера и повышение урона', avail: (c) => canUpgradeWeapon('orbs', c.wlvl.orbs, c.level), apply: (c) => c.wlvl.orbs++ },
  { id: 'nova0', title: 'Нова-импульс', desc: 'Взрывное кольцо: урон и отброс толпы', avail: (c) => canUnlockWeapon('nova', c.wlvl, c.level, mainBranchForWeapons(c)), apply: (c) => { c.wlvl.nova = 1; refreshResonance(c); } },
  { id: 'nova+', title: 'Нова-импульс', desc: 'Больше радиус и урон, быстрее перезарядка', avail: (c) => canUpgradeWeapon('nova', c.wlvl.nova, c.level), apply: (c) => c.wlvl.nova++ },
  { id: 'aura0', title: 'Токсичная аура', desc: 'Едкое поле отравляет всех врагов вокруг', avail: (c) => canUnlockWeapon('aura', c.wlvl, c.level, mainBranchForWeapons(c)), apply: (c) => { c.wlvl.aura = 1; refreshResonance(c); } },
  { id: 'aura+', title: 'Токсичная аура', desc: 'Больше радиус и урон в секунду', avail: (c) => canUpgradeWeapon('aura', c.wlvl.aura, c.level), apply: (c) => c.wlvl.aura++ },
  { id: 'mandibles0', title: 'Хищные жвала', desc: 'Фронтальный конус урона: разрывает врагов перед вами', avail: (c) => canUnlockWeapon('mandibles', c.wlvl, c.level, mainBranchForWeapons(c)), apply: (c) => { c.wlvl.mandibles = 1; refreshResonance(c); } },
  { id: 'mandibles+', title: 'Хищные жвала', desc: 'Больше радиус, угол рассечения и урон', avail: (c) => canUpgradeWeapon('mandibles', c.wlvl.mandibles, c.level), apply: (c) => c.wlvl.mandibles++ },
  { id: 'cysts0', title: 'Споровые цисты', desc: 'Мощные органические мины поздней стадии: сбрасываются только в движении', avail: (c) => canUnlockWeapon('cysts', c.wlvl, c.level, mainBranchForWeapons(c)) && dnaLvl(c, 'mycelium') >= 2, apply: (c) => { c.wlvl.cysts = 1; refreshResonance(c); } },
  { id: 'cysts+', title: 'Споровые цисты', desc: 'Больше цист, выше радиус и урон детонации', avail: (c) => canUpgradeWeapon('cysts', c.wlvl.cysts, c.level), apply: (c) => c.wlvl.cysts++ },
  // --- Критические мутации (патологии): сверхсила с расплатой ---
  {
    id: 'curse_predator',
    title: 'СВЕРХХИЩНИК',
    desc: 'Урон x2.2 и лечение +4 HP за элит и боссов, но хвост тает в 3 раза быстрее',
    curse: true,
    avail: (c) => !c.cursePredator,
    apply: (c) => { c.cursePredator = true; c.dmgMul *= 2.2; showToast(c, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-predator"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_predator', 'СВЕРХХИЩНИК', '').title}`); },
  },
  {
    id: 'curse_chitin',
    title: 'ТИТАНОВЫЙ ХИТИН',
    desc: 'Макс. HP +120 и неуязвимость +1.5 с, но скорость движения снижена на 30%',
    curse: true,
    avail: (c) => !c.curseChitin,
    apply: (c) => { c.curseChitin = true; c.maxHp += 120; c.player.hp += 120; c.moveSpeed *= 0.70; showToast(c, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-chitin"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_chitin', 'ТИТАНОВЫЙ ХИТИН', '').title}`); },
  },
  {
    id: 'curse_hunger',
    title: 'ВЕЧНЫЙ ГОЛОД',
    desc: 'Радиус сбора x2 и скорость атаки +40%, но при голоде (>3 с без сфер) теряет 3 HP/с (не смертельно)',
    curse: true,
    avail: (c) => !c.curseHunger,
    apply: (c) => { c.curseHunger = true; c.magnetR *= 2; c.atkSpdMul += 0.40; showToast(c, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-curse-hunger"/></svg> ${t('badge_pathology')}: ${trUpgrade('curse_hunger', 'ВЕЧНЫЙ ГОЛОД', '').title}`); },
  },
  // --- Прото-органеллы ---
  {
    id: 'relic_galvanic',
    title: 'БИО-ГАЛЬВАНИКА',
    desc: 'Организм накапливает статику: цепная микро-молния поражает 3 врагов каждые 4 с',
    avail: (c) => !c.relicGalvanic,
    apply: (c) => { c.relicGalvanic = true; showToast(c, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-relic-galvanic"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_galvanic', 'БИО-ГАЛЬВАНИКА', '').title}`); },
  },
  {
    id: 'relic_abyssal',
    title: 'АБИССАЛЬНЫЙ ЛЮМИНОФОР',
    desc: 'Радиус сбора сфер +50%, а био-фонарь каждые 6 с ослепляет врагов вокруг вас',
    avail: (c) => !c.relicAbyssal,
    apply: (c) => { c.relicAbyssal = true; c.magnetR *= 1.5; showToast(c, `<svg class="bio-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#ico-relic-abyssal"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_abyssal', 'АБИССАЛЬНЫЙ ЛЮМИНОФОР', '').title}`); },
  },
  {
    id: 'relic_carapace',
    title: 'ЖИВОЙ КАРАПАКС',
    desc: 'Каждые 18 с формирует живой барьер, полностью поглощающий следующий удар',
    avail: (c) => !c.relicCarapace,
    apply: (c) => { c.relicCarapace = true; c.carapaceShieldReady = true; showToast(c, `<svg class="bio-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-relic-carapace"/></svg> ${t('badge_organelle')}: ${trUpgrade('relic_carapace', 'ЖИВОЙ КАРАПАКС', '').title}`); },
  },
  { id: 'dmg', title: 'Острота', desc: '+15% ко всему урону', avail: (c) => stack(c, 'dmg'), apply: (c) => { c.dmgMul += 0.15; bump(c, 'dmg'); } },
  { id: 'aspd', title: 'Рефлексы', desc: '+12% к скорости атаки', avail: (c) => stack(c, 'aspd'), apply: (c) => { c.atkSpdMul += 0.12; bump(c, 'aspd'); } },
  { id: 'move', title: 'Обтекаемость', desc: '+8% к скорости движения', avail: (c) => stack(c, 'move'), apply: (c) => { c.moveSpeed *= 1.08; bump(c, 'move'); } },
  { id: 'hp', title: 'Биомасса', desc: '+20 к макс. HP и лечение', avail: (c) => stack(c, 'hp'), apply: (c) => { c.maxHp += 20; c.player.hp += 20; bump(c, 'hp'); } },
  { id: 'magnet', title: 'Магнетизм', desc: '+30% к радиусу сбора сфер ДНК', avail: (c) => stack(c, 'magnet'), apply: (c) => { c.magnetR *= 1.3; bump(c, 'magnet'); } },
  { id: 'regen', title: 'Регенерация', desc: '+1 HP/с восстановления', avail: (c) => stack(c, 'regen'), apply: (c) => { c.regen += 1; bump(c, 'regen'); } },
  // --- Геномы ДНК-матрицы: специализация через вложенные сферы ДНК ---
  { id: 'ver_cap', branch: 'vermis', title: 'Хвост длиннее', desc: '+6 к ёмкости хвоста: тело-оружие растёт', avail: (c) => c.tailCapBonus < 30, apply: (c) => { c.tailCapBonus += 6; } },
  { id: 'ver_dps', branch: 'vermis', title: 'Мощь хлыста', desc: 'Урон хвоста x1.3', avail: (c) => c.tailDpsMul < 3.2, apply: (c) => { c.tailDpsMul *= 1.3; } },
  { id: 'chi_dmg', branch: 'chimera', title: 'Мутация урона', desc: '+25% ко всему урону', avail: (c) => stack(c, 'chi_dmg'), apply: (c) => { c.dmgMul += 0.25; bump(c, 'chi_dmg'); } },
  {
    id: 'chi_lvl',
    branch: 'chimera',
    title: 'Радикал',
    desc: 'Случайное оружие +1 уровень',
    avail: (c) => WEAPON_IDS.some((w) => canUpgradeWeapon(w, c.wlvl[w], c.level)),
    apply: (c) => {
      const ids = WEAPON_IDS.filter((w) => canUpgradeWeapon(w, c.wlvl[w], c.level));
      if (ids.length > 0) c.wlvl[ids[Math.floor(Math.random() * ids.length)]]++;
    },
  },
  { id: 'my_regen', branch: 'mycelium', title: 'Симбиоз', desc: '+1.5 HP/с восстановления', avail: (c) => stack(c, 'my_regen'), apply: (c) => { c.regen += 1.5; bump(c, 'my_regen'); } },
  { id: 'my_aura', branch: 'mycelium', title: 'Спороносность', desc: 'Токсичная аура +1 уровень', avail: (c) => canUpgradeWeapon('aura', c.wlvl.aura, c.level), apply: (c) => { c.wlvl.aura++; } },
  { id: 'si_magnet', branch: 'symbiont', title: 'Феромонный магнит', desc: '+35% к радиусу сбора сфер ДНК', avail: (c) => stack(c, 'si_magnet'), apply: (c) => { c.magnetR *= 1.35; bump(c, 'si_magnet'); } },
  { id: 'si_aspd', branch: 'symbiont', title: 'Фазовые рефлексы', desc: '+15% к скорости атаки', avail: (c) => stack(c, 'si_aspd'), apply: (c) => { c.atkSpdMul += 0.15; bump(c, 'si_aspd'); } },
  { id: 'si_move', branch: 'symbiont', title: 'Фазовое скольжение', desc: '+10% к скорости движения', avail: (c) => stack(c, 'si_move'), apply: (c) => { c.moveSpeed *= 1.10; bump(c, 'si_move'); } },
  // --- Эксклюзивные гены геномов: 3-й уровень ДНК ветки ---
  { id: 'absorb', branch: 'vermis', title: 'Поглощение', desc: 'Убитые хвостом враги удлиняют его', avail: (c) => geneAvail(c, 'vermis', 'absorb'), apply: (c) => c.genes.add('absorb') },
  { id: 'whip2', branch: 'vermis', title: 'Змея-хлыст', desc: 'Кончик хвоста наносит дополнительный точечный удар', avail: (c) => geneAvail(c, 'vermis', 'whip2'), apply: (c) => c.genes.add('whip2') },
  { id: 'scales', branch: 'vermis', title: 'Броня чешуёй', desc: 'Каждые 20 сегментов гасят 1 контактного урона (до 50%)', avail: (c) => geneAvail(c, 'vermis', 'scales'), apply: (c) => c.genes.add('scales') },
  { id: 'unstable', branch: 'chimera', title: 'Нестабильный геном', desc: 'Урон x1.8, но каждые 20 с случайное ослабление на 5 с', avail: (c) => geneAvail(c, 'chimera', 'unstable'), apply: (c) => c.genes.add('unstable') },
  { id: 'supercharge', branch: 'chimera', title: 'Суперзаряд', desc: 'Нова: перезарядка дольше, но урон x4 и радиус x2', avail: (c) => geneAvail(c, 'chimera', 'supercharge'), apply: (c) => c.genes.add('supercharge') },
  { id: 'chain', branch: 'chimera', title: 'Цепная реакция', desc: 'Снаряд отскакивает к ближайшему врагу (до 4 раз)', avail: (c) => geneAvail(c, 'chimera', 'chain'), apply: (c) => c.genes.add('chain') },
  { id: 'infection', branch: 'mycelium', title: 'Инфицирование', desc: 'Обычные враги при гибели с шансом 35% переходят на вашу сторону на 8 с', avail: (c) => geneAvail(c, 'mycelium', 'infection'), apply: (c) => c.genes.add('infection') },
  { id: 'puddles', branch: 'mycelium', title: 'Споры', desc: 'Хвост оставляет ядовитые следы-лужи', avail: (c) => geneAvail(c, 'mycelium', 'puddles'), apply: (c) => c.genes.add('puddles') },
  { id: 'charm', branch: 'mycelium', title: 'Феромон-раб', desc: 'Обычные враги при гибели с шансом 25% служат вам 30 с', avail: (c) => geneAvail(c, 'mycelium', 'charm'), apply: (c) => c.genes.add('charm') },
  { id: 'phantom', branch: 'symbiont', title: 'Фазовый сдвиг', desc: 'Неуязвимость после урона длится вдвое дольше', avail: (c) => geneAvail(c, 'symbiont', 'phantom'), apply: (c) => c.genes.add('phantom') },
  { id: 'overload', branch: 'symbiont', title: 'Перегрузка', desc: 'Перезарядка Новы -25%', avail: (c) => geneAvail(c, 'symbiont', 'overload'), apply: (c) => c.genes.add('overload') },
  { id: 'resonance', branch: 'symbiont', title: 'Гармоника орбит', desc: 'Электроорбиты: +25% к радиусу и +20% к урону', avail: (c) => geneAvail(c, 'symbiont', 'resonance'), apply: (c) => c.genes.add('resonance') },
  // --- 6 Великих Гибридов: золотые карты слияния двух геномов на 3+3 ---
  { id: 'hy_plasma_leviathan', hybrid: 'plasma_leviathan', title: 'ПЛАЗМЕННЫЙ ЛЕВИАФАН', desc: hybridDesc('plasma_leviathan'), avail: (c) => hybridAvail(c, 'plasma_leviathan'), apply: (c) => applyHybrid(c, 'plasma_leviathan') },
  { id: 'hy_ouroboros', hybrid: 'ouroboros', title: 'УРОБОРОС-ПАРАЗИТ', desc: hybridDesc('ouroboros'), avail: (c) => hybridAvail(c, 'ouroboros'), apply: (c) => applyHybrid(c, 'ouroboros') },
  { id: 'hy_phase_serpent', hybrid: 'phase_serpent', title: 'ФАЗОВЫЙ ЗМЕЙ', desc: hybridDesc('phase_serpent'), avail: (c) => hybridAvail(c, 'phase_serpent'), apply: (c) => applyHybrid(c, 'phase_serpent') },
  { id: 'hy_spore_reactor', hybrid: 'spore_reactor', title: 'СПОРОВЫЙ РЕАКТОР', desc: hybridDesc('spore_reactor'), avail: (c) => hybridAvail(c, 'spore_reactor'), apply: (c) => applyHybrid(c, 'spore_reactor') },
  { id: 'hy_ion_colossus', hybrid: 'ion_colossus', title: 'ИОННЫЙ КОЛОСС', desc: hybridDesc('ion_colossus'), avail: (c) => hybridAvail(c, 'ion_colossus'), apply: (c) => applyHybrid(c, 'ion_colossus') },
  { id: 'hy_psi_web', hybrid: 'psi_web', title: 'ПСИ-СЕТЬ', desc: hybridDesc('psi_web'), avail: (c) => hybridAvail(c, 'psi_web'), apply: (c) => applyHybrid(c, 'psi_web') },
];

const STACKABLE_STATS = new Set(['dmg', 'aspd', 'move', 'hp', 'magnet', 'regen', 'chi_dmg', 'my_regen', 'si_magnet', 'si_aspd', 'si_move']);

export function weaponLvlTag(ctx: Ctx, id: string): string {
  const open = t('badge_weapon_new', { cur: equippedWeaponCount(ctx.wlvl), max: MAX_EQUIPPED_WEAPONS });
  const fmt = (lvl: number) => ` · ${t('badge_weapon_lvl', { from: lvl, to: lvl + 1 })}`;
  if (id === 'spikes0') return ` · ${open}`;
  if (id === 'spikes+') return fmt(ctx.wlvl.spikes);
  if (id === 'orbits0') return ` · ${open}`;
  if (id === 'orbits+') return fmt(ctx.wlvl.orbs);
  if (id === 'nova0') return ` · ${open}`;
  if (id === 'nova+') return fmt(ctx.wlvl.nova);
  if (id === 'aura0') return ` · ${open}`;
  if (id === 'aura+') return fmt(ctx.wlvl.aura);
  if (id === 'mandibles0') return ` · ${open}`;
  if (id === 'mandibles+') return fmt(ctx.wlvl.mandibles);
  if (id === 'cysts0') return ` · ${open}`;
  if (id === 'cysts+') return fmt(ctx.wlvl.cysts);
  if (STACKABLE_STATS.has(id)) return ` · ${(ctx.statStacks[id] ?? 0)}/${STAT_MAX_STACKS}`;
  return '';
}

export function resolveCardDesc(ctx: Ctx, u: UpgradeDef): string {
  if (u.id === 'spikes+' && ctx.wlvl.spikes === 2) {
    return getLocale() === 'en' ? 'Higher damage and faster fire rate' : 'Больше урона и выше скорострельность';
  }
  return trUpgrade(u.id, u.title, u.desc).desc;
}

const UPGRADE_CARD_ICONS: Record<string, { id: string; vb: string }> = {
  spikes0: { id: 'ico-weapon-spikes', vb: '0 0 32 32' },
  'spikes+': { id: 'ico-weapon-spikes', vb: '0 0 32 32' },
  orbits0: { id: 'ico-weapon-orbs', vb: '0 0 32 32' },
  'orbits+': { id: 'ico-weapon-orbs', vb: '0 0 32 32' },
  nova0: { id: 'ico-weapon-nova', vb: '0 0 32 32' },
  'nova+': { id: 'ico-weapon-nova', vb: '0 0 32 32' },
  aura0: { id: 'ico-weapon-aura', vb: '0 0 32 32' },
  'aura+': { id: 'ico-weapon-aura', vb: '0 0 32 32' },
  mandibles0: { id: 'ico-weapon-mandibles', vb: '0 0 64 64' },
  'mandibles+': { id: 'ico-weapon-mandibles', vb: '0 0 64 64' },
  cysts0: { id: 'ico-weapon-cysts', vb: '0 0 64 64' },
  'cysts+': { id: 'ico-weapon-cysts', vb: '0 0 64 64' },
  curse_predator: { id: 'ico-curse-predator', vb: '0 0 64 64' },
  curse_chitin: { id: 'ico-curse-chitin', vb: '0 0 64 64' },
  curse_hunger: { id: 'ico-curse-hunger', vb: '0 0 64 64' },
  relic_galvanic: { id: 'ico-relic-galvanic', vb: '0 0 64 64' },
  relic_abyssal: { id: 'ico-relic-abyssal', vb: '0 0 64 64' },
  relic_carapace: { id: 'ico-relic-carapace', vb: '0 0 32 32' },
  dmg: { id: 'ico-stat-dmg', vb: '0 0 64 64' },
  aspd: { id: 'ico-stat-aspd', vb: '0 0 64 64' },
  move: { id: 'ico-stat-move', vb: '0 0 64 64' },
  hp: { id: 'ico-stat-hp', vb: '0 0 64 64' },
  magnet: { id: 'ico-stat-magnet', vb: '0 0 64 64' },
  regen: { id: 'ico-stat-regen', vb: '0 0 64 64' },
  absorb: { id: 'ico-gene-predator-devour', vb: '0 0 64 64' },
  whip2: { id: 'ico-gene-predator-apex', vb: '0 0 64 64' },
  scales: { id: 'ico-gene-predator-frenzy', vb: '0 0 64 64' },
  unstable: { id: 'ico-gene-chimera-horn', vb: '0 0 64 64' },
  supercharge: { id: 'ico-gene-chimera-carapace', vb: '0 0 64 64' },
  chain: { id: 'ico-gene-chimera-spines', vb: '0 0 64 64' },
  infection: { id: 'ico-gene-mycelium-hyphae', vb: '0 0 64 64' },
  puddles: { id: 'ico-gene-mycelium-toxin', vb: '0 0 64 64' },
  charm: { id: 'ico-gene-mycelium-spores', vb: '0 0 64 64' },
  phantom: { id: 'ico-gene-symbiont-wings', vb: '0 0 64 64' },
  overload: { id: 'ico-gene-symbiont-swarm', vb: '0 0 64 64' },
  resonance: { id: 'ico-gene-symbiont-prism', vb: '0 0 64 64' },
};

/** Открыть окно апгрейдов: выбрать доступные карты с учётом мутагена и лимитов */
export function openUpgrades(ctx: Ctx): void {
  const { upgradeModal, upgradeTitle, cardsEl } = ctx.dom;
  const avail = UPGRADES.filter((u) => u.avail(ctx));
  // Все улучшения выкачаны: пустое окно замкнуло бы игру в вечную паузу
  if (avail.length === 0) {
    ctx.pendingUps = 0;
    ctx.paused = false;
    upgradeModal.classList.remove('show');
    return;
  }
  const picks: UpgradeDef[] = [];
  const bag = [...avail];
  // Мутаген: +1 опция в следующем выборе (вражеский мутаген: всего 2)
  const want = Math.max(2, Math.min(4, 3 + ctx.nextPickDelta));
  ctx.nextPickDelta = 0;
  while (picks.length < want && bag.length > 0) {
    picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  upgradeTitle.textContent = `${t('upgrade_title', { lvl: ctx.level })} · ${t('weapon_limit_hint', { cur: equippedWeaponCount(ctx.wlvl), max: MAX_EQUIPPED_WEAPONS })}`;
  cardsEl.innerHTML = '';
  for (let cardIdx = 0; cardIdx < picks.length; cardIdx++) {
    const u = picks[cardIdx];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'up-card';
    card.dataset.id = u.id;
    const upIco = UPGRADE_CARD_ICONS[u.id];
    let crestHtml = '';
    if (u.branch) card.classList.add(`branch-${u.branch}`);
    if (u.curse) {
      card.classList.add('curse');
      const curseIco = upIco ?? { id: 'ico-skull-hazard', vb: '0 0 32 32' };
      crestHtml = `<div class="card-crest curse-crest"><svg class="inline-card-ico" viewBox="${curseIco.vb}" aria-hidden="true"><use href="#${curseIco.id}"/></svg> ${t('badge_pathology')}</div>`;
    }
    if (u.hybrid) card.classList.add('hybrid');
    let branchTag = '';
    if (u.hybrid) {
      const hybridColors: Record<string, string> = {
        plasma_leviathan: '#ff6b2b',
        ouroboros: '#00ff9d',
        phase_serpent: '#66fcf1',
        spore_reactor: '#39ff14',
        ion_colossus: '#ffb800',
        psi_web: '#b55cff',
      };
      const hybridSlug = u.hybrid.replace(/_/g, '-');
      const color = hybridColors[u.hybrid] || '#ffd166';
      branchTag = `<span class="b-ico"><svg class="inline-card-ico" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg></span> `;
      crestHtml = `<div style="text-align:center;margin:4px 0;"><svg class="hybrid-crest" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${hybridSlug}"/></svg></div>`;
    } else if (upIco && !u.curse) {
      branchTag = `<span class="b-ico"><svg class="up-card-ico" viewBox="${upIco.vb}" aria-hidden="true"><use href="#${upIco.id}"/></svg></span>`;
    } else if (u.branch) {
      branchTag = `<span class="b-ico"><svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${u.branch}"/></svg></span> `;
    }
    const trUp = trUpgrade(u.id, u.title, u.desc);
    const cleanTitle = trUp.title.replace(/^[^\w\sа-яА-ЯёЁ]+/, '').trim();
    card.innerHTML = `
      <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
      <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
      <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
      <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
      <h3><span class="key-hint" style="opacity:0.68;font-size:10px;margin-right:4px;">[${cardIdx + 1}]</span>${branchTag}${cleanTitle}${weaponLvlTag(ctx, u.id)}</h3>${crestHtml}<p>${resolveCardDesc(ctx, u)}</p>
    `;
    cardsEl.appendChild(card);
  }
  ctx.paused = true;
  syncStagePhase(ctx);
  ctx.svc.sfx.setTailDrone(false);
  syncRerollBtn(ctx);
  // Виджет охоты за гибридами: обновляется при каждом открытии окна
  // (включая переоткрытие после выбора карты и реролл - оба идут через openUpgrades)
  renderHybridHunt(ctx);
  upgradeModal.classList.add('show');
  (cardsEl.firstElementChild as HTMLElement | null)?.focus();
}

/** Выбор карточки улучшения (клик по карте / геймпад-подтверждение) */
export function chooseUpgrade(ctx: Ctx, id: string | undefined): void {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return;
  u.apply(ctx);
  refreshResonance(ctx);
  ctx.svc.sfx.upgradeSelect();
  // Разовый выброс спор в честь эволюции / выбора мутации
  ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, ctx.player.x), toSimY(ctx, ctx.player.y), 2200);
  // Гибрид меняет представление генома в HUD сразу после выбора
  if (u.branch || u.hybrid) {
    refreshMainGenome(ctx);
    updateBranchChip(ctx);
  }
  ctx.pendingUps--;
  if (ctx.pendingUps > 0 && UPGRADES.some((x) => x.avail(ctx))) {
    openUpgrades(ctx);
  } else {
    ctx.paused = false;
    syncStagePhase(ctx);
    ctx.dom.upgradeModal.classList.remove('show');
  }
}

/** Кнопка реролла: перераздать карты выбора */
export function rerollUpgrades(ctx: Ctx): void {
  if (ctx.rerollsLeft <= 0 || !ctx.dom.upgradeModal.classList.contains('show')) return;
  ctx.rerollsLeft--;
  ctx.svc.sfx.upgradeSelect();
  openUpgrades(ctx);
}

export function syncRerollBtn(ctx: Ctx): void {
  const rerollBtn = ctx.dom.rerollBtn;
  if (!rerollBtn) return;
  rerollBtn.textContent = `${t('reroll_btn')} (${ctx.rerollsLeft})`;
  rerollBtn.disabled = ctx.rerollsLeft <= 0;
}
