// LUMIVORE: THE LIVING FRACTAL - точка входа.
// Оркестратор: собирает DOM, сервисы и состояние в Ctx, вешает события
// и крутит fixed-timestep цикл (1/60 с, максимум 5 подшагов за кадр).
// Вся игровая логика живёт в src/game/**, вся UI-логика - в src/ui/**.
import { PixiOverlay } from './engine/PixiOverlay';
import { PetriRadar } from './engine/radar';
import { createPhysarumSim } from './engine/physarumSim';
import { Sfx } from './engine/audio';
import { GamepadController } from './engine/gamepad';
import { createJoystick } from './engine/joystick';
import { t } from './i18n';
import { SCALES } from './engine/types';
import type { DnaBranch } from './engine/types';
import { initDom } from './ui/dom';
import { loadSettings } from './game/save';
import type { Services } from './game/context';
import type { Ctx } from './game/context';
import { createRunState } from './game/state';
import { createWaveDirector } from './game/enemies';
import { spawnNodesForScale } from './game/nodes';
import { applyBiolabStart } from './game/runFlow';
import { startMetamorphosis } from './game/metamorphosis';
import { stepFrame } from './game/simulation';
import { refreshMainGenome } from './ui/upgrades';
import { applyQualitySettings, showModal } from './ui/modals';
import { wireEvents } from './ui/events';
import { applyI18n } from './ui/i18n';
import { showToast } from './ui/toast';
import './styles';
import { injectScreens } from './ui/screens';
import { updateBranchChip, updateDnaHud, updateScaleHud, updateStageBiome, updateWeaponHud } from './ui/hud';

async function bootstrap(): Promise<void> {
  injectScreens(document.body); // статические экраны и SVG-спрайт - до initDom()
  const dom = initDom();

  // ---------- Сервисы: радар, physarum-симуляция, Pixi-оверлей, звук, ввод ----------
  const radar = new PetriRadar();
  radar.init(dom.radarCanvas, dom.radarBadgeEl, dom.radarSweepSvg);
  const sim = await createPhysarumSim(); // WebGPU при наличии, WebGL2-фолбэк иначе
  const overlay = new PixiOverlay();
  const sfx = new Sfx();
  const joystick = createJoystick(dom.stage, dom.pixiCanvas);
  const gamepad = new GamepadController();

  try {
    await sim.init(dom.gpuCanvas);
    await overlay.init(dom.pixiCanvas, dom.stage);
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error('Initialization error:', err);
    dom.timerEl.textContent = errorMsg;
    const errorModal = document.createElement('div');
    errorModal.style.cssText = 'position:absolute;inset:0;z-index:999;background:rgba(2,6,12,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#ff5570;font-family:inherit;';
    errorModal.innerHTML = `
      <h2 style="font-size:22px;letter-spacing:0.1em;margin-bottom:14px;color:#ff3b5c;">${t('webgpu_required_title')}</h2>
      <p style="max-width:560px;font-size:13px;line-height:1.6;color:#cbd5e1;margin-bottom:16px;">
        ${t('webgpu_required_desc')}<br><br>
        ${errorMsg}
      </p>
      <div style="font-size:11px;color:#9ab0c4;max-width:480px;line-height:1.5;">
        ${t('webgpu_required_hint')}
      </div>
    `;
    dom.stage.appendChild(errorModal);
    return;
  }

  // ---------- Контекст: состояние забега + DOM + сервисы + настройки ----------
  const svc: Services = { overlay, sim, sfx, radar, waves: null as unknown as Services['waves'], gamepad, joystick };
  const ctx: Ctx = {
    ...createRunState(),
    dom,
    svc,
    settings: loadSettings(),
  };
  svc.waves = createWaveDirector(ctx);
  if (ctx.settings.muted) sfx.toggleMute();
  // Потеря GPU-устройства: пауза + тост (после сборки ctx, чтобы замыкать на него)
  sim.onDeviceLost = (reason: string) => {
    ctx.paused = true;
    sfx.setTailDrone(false);
    sfx.stopBgm();
    showToast(ctx, t('toast_webgpu_lost', { reason }), 'danger');
  };

  // ---------- Стартовая конфигурация ----------
  spawnNodesForScale(ctx, 0);
  applyQualitySettings(ctx);
  wireEvents(ctx);
  applyI18n(ctx);
  applyBiolabStart(ctx);
  sfx.setBgmVolume(ctx.settings.bgmVolume / 100);
  sfx.setSfxVolume(ctx.settings.sfxVolume / 100);
  updateStageBiome(ctx, SCALES[ctx.scaleIdx].id);
  updateBranchChip(ctx);
  updateDnaHud(ctx);
  updateScaleHud(ctx);
  updateWeaponHud(ctx);
  showModal(ctx, 'intro');

  // Отладочные хуки только для dev-сборки
  if (import.meta.env.DEV) {
    const debugApi = {
      addBio: (n: number) => { ctx.biomass = Math.max(0, ctx.biomass + n); updateScaleHud(ctx); },
      dna: (b: DnaBranch, n: number) => { ctx.dnaXp[b] += n; updateDnaHud(ctx); refreshMainGenome(ctx); updateBranchChip(ctx); },
      xpDump: () => { ctx.xp += 60; },
      spawnTitan: () => { ctx.biomass = SCALES[ctx.scaleIdx].biomassGoal; },
      killTitan: () => { const titan = ctx.enemies.find((e) => e.titan); if (titan) titan.hp = 0; },
      metamorph: () => startMetamorphosis(ctx),
      die: () => { ctx.player.hp = 0; },
      info: () => ({
        scale: SCALES[ctx.scaleIdx].id, biomass: ctx.biomass, goal: SCALES[ctx.scaleIdx].biomassGoal,
        camZoom: ctx.camZoom, dna: { ...ctx.dnaXp }, dnaLvl: {
          vermis: ctx.dnaXp.vermis, chimera: ctx.dnaXp.chimera,
          mycelium: ctx.dnaXp.mycelium, symbiont: ctx.dnaXp.symbiont,
        },
        hybrids: [...ctx.hybridsTaken], genes: [...ctx.genes], tailLen: ctx.tailLen, level: ctx.level, kills: ctx.kills,
      }),
    };
    (window as unknown as Record<string, unknown>).__lumivore = debugApi;
  }

  // ---------- Fixed timestep: аккумулятор 1/60 с, максимум 5 подшагов за кадр ----------
  let lastTime = performance.now();
  const frame = (now: number): void => {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    stepFrame(ctx, now / 1000, rawDt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

bootstrap();
