// Фасад рендера LUMIVORE над PixiJS v8.
// Создаёт слои и загружает текстуры, весь рисунок делегируют модули из src/render:
// CameraController, PlayerRenderer, EnemyRenderer, VfxLayer, WorldLayer.
// Публичный API не изменился: init/render/reset, spawn-методы и геттеры экрана.
import { Application, Container, Graphics } from 'pixi.js';
import {
  loadBiopunkTextures,
  loadBiopunkTexturesV2,
  loadBiopunkTexturesV3,
  loadBiopunkTexturesV4,
} from './svgAssets';
import { CameraController } from '../render/CameraController';
import { HybridOverlays } from '../render/HybridOverlays';
import { PlayerRenderer } from '../render/PlayerRenderer';
import { EnemyRenderer } from '../render/EnemyRenderer';
import { VfxLayer } from '../render/VfxLayer';
import { WorldLayer } from '../render/WorldLayer';
import { SpritePoolRegistry } from '../render/SpritePool';
import { makeGlowTexture, RenderState, RenderTextures } from '../render/views';

// View-интерфейсы переехали в src/render/views.ts - реэкспортируем для совместимости
export type { EnemyView, NodeView, AnomalyView, MorphView, RenderState, CamView } from '../render/views';

export class PixiOverlay {
  private app = new Application();
  /** Мир: контейнер для камеры (перемещение и зум происходят здесь) */
  private world = new Container();
  private bgBokeh = new Container();     // глубина микромира: плавающие вне фокуса клетки боке (Sprite pool)
  private fxUnder = new Graphics();      // биом, мембраны границ и ауры под сущностями
  private floorLayer = new Container();  // напольные аномалии, споровые цисты, ауры гибридов, крылья под сущностями
  private entityLayer = new Container();
  private organLayer = new Graphics();   // морфология организма: жвалы, шипы, усики, кристаллы
  private morphOverLayer = new Container(); // мультяшные оверлеи морфологии, элит, слэша жвал и маркеров
  private fxOver = new Graphics();       // полоски HP, вспышки, кольца, лазеры, телеграфы
  private fgSnow = new Container();      // планктонная взвесь / морской снег перед линзой (Sprite pool)

  private camera!: CameraController;
  private registry!: SpritePoolRegistry;
  private hybrids!: HybridOverlays;
  private player!: PlayerRenderer;
  private enemy!: EnemyRenderer;
  private vfx!: VfxLayer;
  private worldLayer!: WorldLayer;
  private tex: RenderTextures = { glow: makeGlowTexture() };

  get screenWidth(): number {
    return this.app.screen.width;
  }
  get screenHeight(): number {
    return this.app.screen.height;
  }
  get scale(): number {
    return this.camera.baseScale;
  }

  async init(canvas: HTMLCanvasElement, container: HTMLElement): Promise<void> {
    await this.app.init({
      canvas,
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      preference: 'webgpu',
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    try {
      const bioTex = await loadBiopunkTextures();
      const bioTexV2 = await loadBiopunkTexturesV2();
      const bioTexV3 = await loadBiopunkTexturesV3();
      const bioTexV4 = await loadBiopunkTexturesV4();
      this.tex.enemies = { ...bioTex.enemies, ...bioTexV2.enemies };
      this.tex.particles = bioTex.particles;
      this.tex.nodes = bioTex.nodes;
      this.tex.player = bioTexV2.player;
      this.tex.hybrids = bioTexV2.hybrids;
      this.tex.v3 = bioTexV3;
      this.tex.v4 = bioTexV4;
    } catch (e) {
      console.warn('Failed to load biopunk vector textures, falling back to glowTex', e);
    }

    // Порядок слоёв задаёт z-порядок всей сцены: боке под всем, снег поверх всего
    this.app.stage.addChild(this.world);
    this.world.addChild(this.bgBokeh);
    this.world.addChild(this.fxUnder);
    this.world.addChild(this.floorLayer);
    this.world.addChild(this.entityLayer);
    this.world.addChild(this.organLayer);
    this.world.addChild(this.morphOverLayer);
    this.world.addChild(this.fxOver);
    this.world.addChild(this.fgSnow);

    // Модули рендера: каждый получает свои слои и общий реестр спрайтовых пулов.
    // HybridOverlays создаётся раньше PlayerRenderer, чтобы его спрайты шли первыми в слоях (z-порядок)
    this.registry = new SpritePoolRegistry(this.entityLayer, this.tex.glow);
    this.camera = new CameraController(this.world, this.app.stage, this.app.screen);
    this.hybrids = new HybridOverlays(this.entityLayer, this.floorLayer, this.organLayer, this.tex);
    this.player = new PlayerRenderer(this.entityLayer, this.floorLayer, this.organLayer, this.morphOverLayer, this.fxUnder, this.fxOver, this.registry, this.tex, this.hybrids);
    this.enemy = new EnemyRenderer(this.entityLayer, this.morphOverLayer, this.fxOver, this.registry, this.tex);
    this.worldLayer = new WorldLayer(this.world, this.fxUnder, this.fxOver, this.floorLayer, this.entityLayer, this.registry, this.tex, this.app.screen);
    this.vfx = new VfxLayer(this.world, this.bgBokeh, this.fgSnow, this.fxUnder, this.fxOver, this.morphOverLayer, this.registry, this.tex);
  }

  /** Кадр: порядок вызовов модулей сохраняет исторический порядок рисования */
  render(state: RenderState, time: number, dt: number): void {
    this.fxUnder.clear();
    this.organLayer.clear();
    this.fxOver.clear();

    // Камера слежения: центрируется на игроке, плавно масштабирует весь мир
    const s = this.camera.applyTransform(state.cam);

    // Глубокий параллакс микромира (боке плавающих клеток в толще жидкости - спрайтовый пул)
    this.vfx.updateBokehParallax(state, time);

    // Живой декор биома под сущностями: среда, граница арены, циркуляция
    this.worldLayer.updateBiome(state, time, s);

    // Тряска экрана: случайное смещение сцены с мягким затуханием (без укачивания)
    this.camera.applyShake(dt);

    // Пятна био-крови и цисты/аура/аномалии/узлы на полу
    this.vfx.updateSplats(dt);
    this.worldLayer.updateCysts(state, time);
    this.worldLayer.updateAura(state, time);
    this.worldLayer.updateAnomalies(state, time);
    this.worldLayer.updateNodes(state, time);
    this.worldLayer.updateNeuralLinks(state, time);

    // Игрок: хвост, шлейф рывка, тело, органы морфологии
    this.player.updateTail(state, time);
    this.vfx.updateDashTrail(state, dt);
    this.player.updateBody(state, time);
    this.player.updateOrgans(state, time);

    // Враги: пулы тел, элиты, телеграфы
    this.enemy.update(state, time);

    // Верхние эффекты: лучи, снаряды, кольца, цифры урона, полигоны, радар, снег
    this.vfx.updateBeams(state);
    this.vfx.updateProjectiles(state, time, state.player.x, state.player.y);
    this.vfx.updateRings(time);
    this.vfx.updateDamageNumbers(dt);
    this.vfx.updatePolys(dt);
    this.vfx.updateMandibles(state);
    this.vfx.updateRadar(state, time);
    this.vfx.updateSnowParallax(state, time);
  }

  /** Ударное пульс-кольцо в точке */
  spawnPulse(x: number, y: number, color: number, maxRadius = 90): void {
    this.vfx.spawnPulse(x, y, color, maxRadius);
  }

  /** Вспышка полигона Кольца Смерти */
  spawnPoly(pts: { x: number; y: number }[], color: number): void {
    this.vfx.spawnPoly(pts, color);
  }

  /** Пятно био-крови на месте смерти */
  spawnSplat(x: number, y: number, color: number): void {
    this.vfx.spawnSplat(x, y, color);
  }

  /** Всплывающая цифра урона над врагом */
  pushDamage(x: number, y: number, value: number, color: number): void {
    this.vfx.pushDamage(x, y, value, color);
  }

  /** Тряска экрана при уроне и нове */
  beginShake(duration: number): void {
    this.camera.beginShake(duration);
  }

  /** Полный сброс пулов, эффектов и слоёв при рестарте забега */
  reset(): void {
    this.camera.reset();
    this.registry.reset();
    this.player.reset();
    this.worldLayer.reset();
    this.vfx.reset();
    this.fxUnder.clear();
    this.organLayer.clear();
    this.fxOver.clear();
  }
}
