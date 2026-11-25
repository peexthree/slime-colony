import { getLocale } from './index';
import type { DnaBranchOrNeutral, HybridId, NodeKind } from '../engine/types';

export const EN_DNA_NAMES: Record<DnaBranchOrNeutral, string> = {
  neutral: 'SPECIMEN',
  vermis: 'VERMIS',
  chimera: 'CHIMERA',
  mycelium: 'MYCELIUM',
  symbiont: 'SYMBIONT',
};

export const EN_HYBRIDS: Record<HybridId, { name: string; desc: string }> = {
  plasma_leviathan: {
    name: 'PLASMA LEVIATHAN',
    desc: 'Flame Serpent: Ring of Death deals 4x damage and annihilates standard foes inside',
  },
  ouroboros: {
    name: 'OUROBOROS PARASITE',
    desc: 'Living Incubator: foes slain by your tail fuse into living segments',
  },
  phase_serpent: {
    name: 'PHASE SERPENT',
    desc: 'Grav-Whip: tail intercepts enemy projectiles and hurls them back',
  },
  spore_reactor: {
    name: 'SPORE REACTOR',
    desc: 'Plague Supernova: Nova infects foes with spores that chain-detonate on death',
  },
  ion_colossus: {
    name: 'ION COLOSSUS',
    desc: 'Tesla Web: electro-orbs arc lightning to nearby enemies',
  },
  psi_web: {
    name: 'PSI-WEB',
    desc: 'Overmind: faster node capture and owned bio-nodes fire laser beams',
  },
};

export const EN_SCALES: Record<number, { name: string; sub: string }> = {
  1: { name: 'PRIMARY DROPLET', sub: 'Microcosm: biomass droplet inside EuroCorp-3 probe reactor' },
  2: { name: 'VASCULAR TRACT', sub: 'Host tissue: pulsing vessel walls' },
  3: { name: 'INNER OCEAN', sub: 'Organ depths: black bile and bioluminescent suspension' },
  4: { name: 'CONTINENTAL RIFT', sub: 'Planet Ξ-9: magmatic crust of the hemisphere' },
  5: { name: 'INFINITY FRACTAL', sub: 'Metamathematics: transcending biology itself' },
};

export const EN_NODES: Record<NodeKind, { name: string; pos: string; neg: string }> = {
  gen: { name: 'GENERATOR', pos: '+2 HP/s', neg: 'faster foes' },
  amp: { name: 'AMPLIFIER', pos: 'no tail melt', neg: '-20% dmg' },
  magnet: { name: 'MAGNET', pos: 'pickup x2.5', neg: 'orb theft' },
  mutagen: { name: 'MUTAGEN', pos: '+1 card', neg: '-1 card' },
  incubator: { name: 'INCUBATOR', pos: '+50% XP', neg: 'swarm brood' },
};

export const EN_CHALLENGES: Record<string, string> = {
  vermis: 'KINETIC WHIP',
  chimera: 'UNSTABLE REACTOR',
  mycelium: 'SPORE EXPANSION',
  symbiont: 'PHASE RESONANCE',
};

export const EN_BIOLAB: Record<string, { name: string; effect: string }> = {
  start_orbs: { name: '«TEMPEST»', effect: 'Start with Electro-Orbs instead of initial Spikes' },
  start_aura: { name: '«PLAGUE»', effect: 'Start with Toxic Aura, but -20 max HP' },
  start_tail_xl: { name: '«MACRO-TAIL»', effect: 'Start with double initial tail length' },
  start_nova2: { name: '«DETONATION»', effect: 'Start with Level 2 Nova Pulse' },
  perm_regen: { name: 'Regeneration', effect: '+0.3 HP/s permanently' },
  perm_magnet: { name: 'Magnetism', effect: '+25% DNA orb pickup radius permanently' },
  unlock_vermis: { name: 'Synthesis «VERMIS»', effect: 'Start each run with Vermis DNA Level 1' },
  unlock_chimera: { name: 'Synthesis «CHIMERA»', effect: 'Start each run with Chimera DNA Level 1' },
  unlock_mycelium: { name: 'Synthesis «MYCELIUM»', effect: 'Start each run with Mycelium DNA Level 1' },
  unlock_symbiont: { name: 'Synthesis «SYMBIONT»', effect: 'Start each run with Symbiont DNA Level 1' },
  perm_dmg: { name: 'Mutagenic Aggression', effect: '+10% outgoing damage permanently' },
  perm_armor: { name: 'Chitin Membrane', effect: '-15% incoming damage permanently' },
};

export const EN_CODEX: Record<string, { name: string; lore: string; bonus: string }> = {
  vermis: {
    name: 'VERMIS (Whip)',
    lore: 'Primary biokinetic strain. Turns your tail into a segmented whip of kinetic force.',
    bonus: '+5% tail capacity',
  },
  chimera: {
    name: 'CHIMERA (Mutant)',
    lore: 'Volatile reactor cellular mass. Triggers plasma surges and explosive blasts.',
    bonus: '+5% explosive damage',
  },
  mycelium: {
    name: 'MYCELIUM (Spore)',
    lore: 'Parasitic hyphal neural web. Infects enemy tissue and subverts fallen foes.',
    bonus: '+0.2 HP/s regeneration',
  },
  symbiont: {
    name: 'SYMBIONT (Phase)',
    lore: 'Photonic-resonant substrate. Boosts reaction speed, magnetism, and field stability.',
    bonus: '+5% orb pickup radius',
  },
  plasma_leviathan: {
    name: 'PLASMA LEVIATHAN',
    lore: 'Vermis + Chimera fusion. Ring of Death incinerates standard foes inside at 4x damage.',
    bonus: '+8% Ring of Death damage',
  },
  ouroboros: {
    name: 'OUROBOROS PARASITE',
    lore: 'Vermis + Mycelium fusion. Tail kills fuse directly into your body as new segments.',
    bonus: '+10% tail growth on absorption',
  },
  phase_serpent: {
    name: 'PHASE SERPENT',
    lore: 'Vermis + Symbiont fusion. Tail coils intercept enemy projectiles and hurl them back.',
    bonus: '+6% movement speed',
  },
  spore_reactor: {
    name: 'SPORE REACTOR',
    lore: 'Chimera + Mycelium fusion. Nova infects enemies with spores causing chain detonations.',
    bonus: '+10% Nova radius',
  },
  ion_colossus: {
    name: 'ION COLOSSUS',
    lore: 'Chimera + Symbiont fusion. Electro-orbs discharge lightning arcs at nearby foes.',
    bonus: '+8% orb damage',
  },
  psi_web: {
    name: 'PSI-WEB',
    lore: 'Mycelium + Symbiont fusion. Faster bio-node capture and laser fire from owned nodes.',
    bonus: '+15% node capture speed',
  },
  grub: {
    name: 'Decay Grub',
    lore: 'Juvenile swarm biomass. Fragile alone, dangerous in dense clusters.',
    bonus: '+3% damage vs Grubs',
  },
  runner: {
    name: 'Phase Runner',
    lore: 'Fast mutated predator that pursues its prey at high velocity.',
    bonus: '+3% damage vs Runners',
  },
  brute: {
    name: 'Chitin Brute',
    lore: 'Heavily armored organism with a dense carapace and high endurance.',
    bonus: '+4% damage vs Brutes',
  },
  splitter: {
    name: 'Mitosis Splitter',
    lore: 'Organism on the brink of fission. Splits into two runners upon death.',
    bonus: '+3% damage vs Splitters',
  },
  spitter: {
    name: 'Acid Spitter',
    lore: 'Ranged organism. Maintains distance and fires corrosive toxic globs.',
    bonus: '+3% damage vs Spitters',
  },
  healer: {
    name: 'Symbiont Healer',
    lore: 'Swarm bio-regenerator. Secretes enzymes that mend nearby allies.',
    bonus: '+4% damage vs Healers',
  },
  pulsar: {
    name: 'Pulsar Sentinel',
    lore: 'Stationary bio-resonator. Controls space with periodic shockwave rings.',
    bonus: '+4% damage vs Pulsars',
  },
  mirror: {
    name: 'Prismatic Warden',
    lore: 'Crystalline organism. Keeps distance and fires rapid energy volleys.',
    bonus: '+5% damage vs Wardens',
  },
  colony: {
    name: 'Colony Broodmother',
    lore: 'Reproductive swarm hub. Continuously spawns parasites until destroyed.',
    bonus: '+5% damage vs Broodmothers',
  },
  brood: {
    name: 'Colony Brood',
    lore: 'Tiny swarm parasites bound to a Broodmother. Perish with her; their death heals her.',
    bonus: '+4% damage vs Brood',
  },
  boss: {
    name: 'Cycle Warden',
    lore: 'Apex reactor predator arriving every 90 seconds. Fires spike fans when enraged.',
    bonus: '+5% damage vs Wardens',
  },
  titan: {
    name: 'EuroCorp-3 Titan',
    lore: 'Colossal guardian of the Metamorphosis threshold. Slaying it unlocks the next Scale.',
    bonus: '+6% damage vs Titans',
  },
};

export const EN_UPGRADES: Record<string, { title: string; desc: string }> = {
  spikes0: { title: 'Spikes', desc: 'Auto-fired needles targeting the nearest foes' },
  'spikes+': { title: 'Spikes', desc: 'Higher damage, extra spikes, and faster fire rate' },
  orbits0: { title: 'Electro-Orbs', desc: 'Plasma spheres orbit you and scorch nearby foes' },
  'orbits+': { title: 'Electro-Orbs', desc: '+1 orbiting sphere and increased damage' },
  nova0: { title: 'Nova Pulse', desc: 'Periodic blast ring dealing damage and knockback' },
  'nova+': { title: 'Nova Pulse', desc: 'Larger blast radius, higher damage, shorter cooldown' },
  aura0: { title: 'Toxic Aura', desc: 'Corrosive field continuously poisons nearby foes' },
  'aura+': { title: 'Toxic Aura', desc: 'Wider aura radius and higher damage per second' },
  mandibles0: { title: 'Ravenous Mandibles', desc: 'Frontal cone slash tearing enemies ahead of you' },
  'mandibles+': { title: 'Ravenous Mandibles', desc: 'Longer reach, wider cleave, and higher damage' },
  cysts0: { title: 'Spore Cysts', desc: 'Organic mines dropped behind you that detonate on contact' },
  'cysts+': { title: 'Spore Cysts', desc: 'More cysts per cluster, bigger blast radius and damage' },
  curse_predator: { title: 'APEX PREDATOR', desc: '2.2x damage and +4 HP heal on elites/bosses, but tail melts 3x faster' },
  curse_chitin: { title: 'TITAN CHITIN', desc: '+120 max HP and +1.5s invulnerability, but -30% movement speed' },
  curse_hunger: { title: 'ETERNAL HUNGER', desc: '2x pickup radius & +40% attack speed, but starving (>3s without orbs) drains 3 HP/s' },
  relic_galvanic: { title: 'BIO-GALVANICS', desc: 'Accumulates static charge: chain micro-lightning strikes 3 foes every 4s' },
  relic_abyssal: { title: 'ABYSSAL LUMINOPHORE', desc: '+50% orb pickup radius and flashes every 6s to stun nearby foes' },
  relic_carapace: { title: 'LIVING CARAPACE', desc: 'Every 18s forms a living barrier that completely absorbs the next hit' },
  dmg: { title: 'Keen Edge', desc: '+15% to all outgoing damage' },
  aspd: { title: 'Reflexes', desc: '+12% attack speed' },
  move: { title: 'Streamlined', desc: '+8% movement speed' },
  hp: { title: 'Biomass', desc: '+20 max HP and heal' },
  magnet: { title: 'Magnetism', desc: '+30% DNA orb pickup radius' },
  regen: { title: 'Regeneration', desc: '+1 HP/s health recovery' },
  ver_cap: { title: 'Longer Tail', desc: '+6 tail capacity: your body-weapon grows longer' },
  ver_dps: { title: 'Whip Force', desc: 'Tail whip damage x1.3' },
  chi_dmg: { title: 'Damage Mutation', desc: '+25% to all outgoing damage' },
  chi_lvl: { title: 'Radical Surge', desc: 'Random unlocked weapon gains +1 level' },
  my_regen: { title: 'Symbiosis', desc: '+1.5 HP/s health recovery' },
  my_aura: { title: 'Spore Cloud', desc: 'Toxic Aura gains +1 level' },
  si_magnet: { title: 'Pheromone Magnet', desc: '+35% DNA orb pickup radius' },
  si_aspd: { title: 'Phase Reflexes', desc: '+15% attack speed' },
  si_move: { title: 'Phase Glide', desc: '+10% movement speed' },
  absorb: { title: 'Absorption', desc: 'Enemies slain by your tail lengthen it' },
  whip2: { title: 'Whip Lash', desc: 'Your tail tip delivers a second pinpoint strike' },
  scales: { title: 'Scale Armor', desc: 'Every 20 tail segments block 1 contact damage (up to 50%)' },
  unstable: { title: 'Unstable Genome', desc: '1.8x damage, but triggers a random 5s debuff every 20s' },
  supercharge: { title: 'Supercharge', desc: 'Nova has longer cooldown, but deals 4x damage in 2x radius' },
  chain: { title: 'Chain Reaction', desc: 'Spikes ricochet to the nearest enemy (up to 4 bounces)' },
  infection: { title: 'Infection', desc: '35% chance slain standard foes fight for you for 8s' },
  puddles: { title: 'Toxic Spores', desc: 'Your tail leaves behind corrosive spore pools' },
  charm: { title: 'Pheromone Thrall', desc: '25% chance slain standard foes serve you for 30s' },
  phantom: { title: 'Phase Shift', desc: 'Post-hit invulnerability lasts twice as long' },
  overload: { title: 'Overload', desc: '-25% Nova Pulse cooldown' },
  resonance: { title: 'Orb Harmonics', desc: 'Electro-Orbs gain +25% orbit radius and +20% damage' },
  hy_plasma_leviathan: { title: EN_HYBRIDS.plasma_leviathan.name, desc: EN_HYBRIDS.plasma_leviathan.desc },
  hy_ouroboros: { title: EN_HYBRIDS.ouroboros.name, desc: EN_HYBRIDS.ouroboros.desc },
  hy_phase_serpent: { title: EN_HYBRIDS.phase_serpent.name, desc: EN_HYBRIDS.phase_serpent.desc },
  hy_spore_reactor: { title: EN_HYBRIDS.spore_reactor.name, desc: EN_HYBRIDS.spore_reactor.desc },
  hy_ion_colossus: { title: EN_HYBRIDS.ion_colossus.name, desc: EN_HYBRIDS.ion_colossus.desc },
  hy_psi_web: { title: EN_HYBRIDS.psi_web.name, desc: EN_HYBRIDS.psi_web.desc },
};

export function trDnaName(branch: DnaBranchOrNeutral, ruFallback: string): string {
  return getLocale() === 'en' ? (EN_DNA_NAMES[branch] ?? ruFallback) : ruFallback;
}

export function trScale(id: number, ruName: string, ruSub: string): { name: string; sub: string } {
  if (getLocale() === 'en' && EN_SCALES[id]) return EN_SCALES[id];
  return { name: ruName, sub: ruSub };
}

export function trHybrid(id: HybridId, ruName: string, ruDesc: string): { name: string; desc: string } {
  if (getLocale() === 'en' && EN_HYBRIDS[id]) return EN_HYBRIDS[id];
  return { name: ruName, desc: ruDesc };
}

export function trNode(kind: NodeKind, ruName: string, ruPos: string, ruNeg: string) {
  if (getLocale() === 'en' && EN_NODES[kind]) return EN_NODES[kind];
  return { name: ruName, pos: ruPos, neg: ruNeg };
}

export function trBiolab(id: string, ruName: string, ruEffect: string) {
  if (getLocale() === 'en' && EN_BIOLAB[id]) return EN_BIOLAB[id];
  return { name: ruName, effect: ruEffect };
}

export function trCodex(id: string, ruName: string, ruLore: string, ruBonus: string) {
  if (getLocale() === 'en' && EN_CODEX[id]) return EN_CODEX[id];
  return { name: ruName, lore: ruLore, bonus: ruBonus };
}

export function trUpgrade(id: string, ruTitle: string, ruDesc: string) {
  if (getLocale() === 'en' && EN_UPGRADES[id]) return EN_UPGRADES[id];
  return { title: ruTitle, desc: ruDesc };
}

export function trChallengeTitle(branch: string, ruTitle: string): string {
  return getLocale() === 'en' ? (EN_CHALLENGES[branch] ?? ruTitle) : ruTitle;
}
