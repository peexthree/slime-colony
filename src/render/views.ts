// View-интерфейсы и текстурный бандл рендера LUMIVORE.
// Данные приходят из игры через эти интерфейсы - модули рендера не знают о симуляции.
import { Texture } from 'pixi.js';
import {
  loadBiopunkTexturesV3,
  BiopunkTexturesV4,
  ParticleSpriteKey,
  NodeSpriteKey,
  PlayerSpriteKey,
  HybridSpriteKey,
} from '../engine/svgAssets';
import { EnemyType, EliteMutation, NodeKind } from '../engine/types';

/** Состояние камеры в мировых координатах */
export interface CamView {
  x: number;
  y: number;
  zoom: number;
  worldW: number;
  worldH: number;
}

export interface EnemyView {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  flash: number;
  type: EnemyType;
  /** Мутация элиты: золотой ореол */
  elite: EliteMutation | null;
  /** Заражённый союзник (Паразит): таймер > 0 - ходит на вашей стороне */
  infected: number;
  /** Титан масштаба: хранитель метаморфоза */
  titan?: boolean;
  /** Споровое заражение (Споровый Реактор): зелёная пульсация */
  sporeInf?: number;
  /** Таймер особого навыка для визуального телеграфа атак */
  skillCd?: number;
  /** Хвостик: [старые ... новые], новый ближе к телу */
  tail: { x: number; y: number }[];
}

export interface NodeView {
  x: number;
  y: number;
  radius: number;
  owner: -1 | 0 | 1;
  capture: number;
  kind: NodeKind;
  contested?: boolean;
  raided?: boolean;
  playerInside?: boolean;
  enemyCount?: number;
}

export interface AnomalyView {
  kind: 'acid' | 'cocoon' | 'bloom';
  x: number;
  y: number;
  r: number;
  warnT: number;
  life: number;
  maxLife: number;
  hp?: number;
  maxHp?: number;
}

export interface MorphView {
  /** Направление головы организма (для жвал и органов на спине) */
  dirX: number;
  dirY: number;
  /** ДНК-уровни геномов 0..3 - от них растут органы */
  vermis: number;
  chimera: number;
  mycelium: number;
  symbiont: number;
  /** Активный гибрид - меняет силуэт целиком */
  hybrid: string | null;
  /** Шкала бытия 1..5: цвет тела и декор биома */
  scaleId: number;
  /** Размер мира в мировых единицах (для декор границ) */
  worldW: number;
  worldH: number;
}

/** Полное состояние одного кадра рендера (приходит из main.ts без изменений) */
export interface RenderState {
  player: { x: number; y: number; r: number; tail: { x: number; y: number }[] };
  /** Состояние хвоста: ok > 70% ёмкости, low 40-70%, crit < 40% */
  tailState: 'ok' | 'low' | 'crit';
  /** Голод > 3 сек без душ: кончик хвоста мигает */
  tailHunger: boolean;
  /** Камера: центр в мировых координатах, зум и границы мира */
  cam: CamView | null;
  /** Морфология организма: какие органы сейчас на теле */
  morph: MorphView | null;
  enemies: EnemyView[];
  projs: { x: number; y: number; vx?: number; vy?: number }[];
  /** Яд врагов-плевателей */
  eprojs: { x: number; y: number }[];
  xpOrbs: { x: number; y: number; value: number; color: number }[];
  nodes: NodeView[];
  orbit: { count: number; cx: number; cy: number; radius: number; angle: number } | null;
  aura: { x: number; y: number; r: number } | null;
  /** Споровые цисты (мины хвоста) */
  cysts?: { x: number; y: number; r: number; armed?: boolean }[];
  /** Удары жвалами (рассекающие конусы) */
  mandibleSwipes?: { x: number; y: number; dirX: number; dirY: number; range: number; arc: number; life: number }[];
  /** Маркеры био-радара на краях экрана (узлы и боссы) */
  radarMarkers?: { angle: number; dist: number; color: number; icon: 'node' | 'boss' | 'titan' | 'raid' }[];
  /** Анимация гибели организма (progress 0..1) */
  playerDeath?: { progress: number; x: number; y: number } | null;
  /** Дуги Тесла-сети (Ионный Колосс): одноразовые линии на кадр */
  arcs: { x1: number; y1: number; x2: number; y2: number; color: number }[];
  /** Лазеры Пси-сети: лучи захваченных узлов */
  lasers: { x1: number; y1: number; x2: number; y2: number }[];
  /** Настройки комфорта и глубины */
  settings?: { parallax?: boolean; softFlashes?: boolean; subtleShake?: boolean };
  /** Биологические аномалии чашки Петри (Кислотный прилив, Гнездо спор, Вспышка митоза) */
  anomalies?: AnomalyView[];
  /** Игрок находится в зоне действия нейросети своих захваченных узлов */
  neuralLinkActive?: boolean;
  /** Готовность барьера «Живой Карапакс» */
  carapaceReady?: boolean;
  /** Активен ли «Фазовый рывок» (шлейф) */
  dashing?: boolean;
  /** Готовность Кольца Смерти к замыканию */
  ringReady?: boolean;
}

/** Структурная проекция размеров экрана (совместимо с Application.screen) */
export interface ScreenProvider {
  readonly width: number;
  readonly height: number;
}

/** Полный набор текстур, загружаемых фасадом один раз при init */
export interface RenderTextures {
  /** Радужная текстура свечения: яркое ядро + мягкий ореол */
  glow: Texture;
  enemies?: Record<string, Texture>;
  particles?: Record<ParticleSpriteKey, Texture>;
  nodes?: Record<NodeSpriteKey, Texture>;
  player?: Record<PlayerSpriteKey, Texture>;
  hybrids?: Record<HybridSpriteKey, Texture>;
  v3?: Awaited<ReturnType<typeof loadBiopunkTexturesV3>>;
  v4?: BiopunkTexturesV4;
}

/** Радужная текстура свечения: яркое ядро + мягкий ореол (64x64 радиальный градиент) */
export function makeGlowTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return Texture.from(c);
}
