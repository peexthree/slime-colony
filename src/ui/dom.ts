// Типизированные ссылки на DOM: один объект вместо ~120 getElementById в замыкании.
// Только ссылки и initDom() - никакой бизнес-логики и слушателей (они в ui/events.ts).
import type { WeaponId } from '../engine/types';

/** Ключи слотов оружий/навыков в HUD */
export type WeaponSlotKey = WeaponId | 'dash' | 'call' | 'ring';

export interface Dom {
  // Сцена и канвасы
  stage: HTMLElement;
  gpuCanvas: HTMLCanvasElement;
  pixiCanvas: HTMLCanvasElement;
  bloomCanvas: HTMLCanvasElement;
  bloomCtx: CanvasRenderingContext2D;
  radarCanvas: HTMLCanvasElement;
  portraitCanvas: HTMLCanvasElement;
  // HP / хвост / ресурсы
  hpFillEl: HTMLElement;
  hpNumEl: HTMLElement;
  hpWrapEl: HTMLElement;
  tailNumEl: HTMLElement;
  tailFillEl: HTMLElement;
  tailwarnEl: HTMLElement;
  nodesChipEl: HTMLElement;
  xpConduitFillEl: HTMLElement | null;
  scaleChipEl: HTMLElement;
  bioFillEl: HTMLElement;
  resHudEl: HTMLElement | null;
  resMultEl: HTMLElement | null;
  resStreakEl: HTMLElement | null;
  resBarFillEl: HTMLElement | null;
  // Верхняя строка HUD
  levelEl: HTMLElement;
  timerEl: HTMLElement;
  waveEl: HTMLElement;
  killsEl: HTMLElement;
  // Тосты и вспышки
  toastEl: HTMLElement;
  hurtEl: HTMLElement;
  // Меню и топ-кнопки
  intro: HTMLElement;
  introStartBtn: HTMLElement;
  helpBtn: HTMLElement;
  muteBtn: HTMLButtonElement | null;
  muteBtnUse: HTMLElement | null;
  fullscreenBtn: HTMLButtonElement | null;
  pauseBtn: HTMLButtonElement | null;
  pauseBtnUse: HTMLElement | null;
  startBtnLabel: HTMLElement | null;
  menuRecordBadge: HTMLElement | null;
  menuRecordText: HTMLElement | null;
  // Босс-бар
  bossHudEl: HTMLElement | null;
  bossNameEl: HTMLElement | null;
  bossHudIcoUse: HTMLElement | null;
  bossHpFillEl: HTMLElement | null;
  bossHpTextEl: HTMLElement | null;
  statusChipsEl: HTMLElement | null;
  // Окно апгрейдов
  upgradeModal: HTMLElement;
  upgradeTitle: HTMLElement;
  cardsEl: HTMLElement;
  rerollBtn: HTMLButtonElement | null;
  // Финальное окно (смерть/победа)
  modal: HTMLElement;
  modalTitle: HTMLElement;
  modalSub: HTMLElement;
  deathStatsEl: HTMLElement;
  deathCauseEl: HTMLElement | null;
  deathAchBtn: HTMLElement | null;
  restartBtn: HTMLElement;
  endlessBtn: HTMLButtonElement | null;
  savePortraitBtn: HTMLElement;
  branchChipEl: HTMLElement;
  // Биолаб
  biolabBtn: HTMLElement;
  biolabOverlay: HTMLElement;
  biolabOpenBtn: HTMLElement | null;
  biolabCloseBtn: HTMLElement;
  biolabPointsEl: HTMLElement;
  biolabSlotsPillEl: HTMLElement | null;
  biolabDisableAllBtn: HTMLButtonElement | null;
  biolabListEl: HTMLElement;
  // Дневное испытание
  dailyModal: HTMLElement | null;
  dailyBriefBody: HTMLElement | null;
  dailyStartBtn: HTMLElement | null;
  dailyCloseBtn: HTMLElement | null;
  dailyHudPillEl: HTMLElement | null;
  dailyChallengeBtn: HTMLElement | null;
  // Достижения
  achievementsModal: HTMLElement | null;
  achievementsOpenBtn: HTMLElement | null;
  achievementsOpenLabel: HTMLElement | null;
  achStatsPillEl: HTMLElement | null;
  achProgressEl: HTMLProgressElement | null;
  achievementsGridEl: HTMLElement | null;
  achCloseBtn: HTMLElement | null;
  // Кодекс
  codexModal: HTMLElement | null;
  codexOpenBtn: HTMLElement | null;
  codexCloseBtn: HTMLElement | null;
  codexGridEl: HTMLElement | null;
  codexStatsEl: HTMLElement | null;
  codexPrevBtn: HTMLButtonElement | null;
  codexNextBtn: HTMLButtonElement | null;
  codexPageInfo: HTMLElement | null;
  // Справка и настройки
  helpModal: HTMLElement | null;
  helpModalOpenBtn: HTMLElement | null;
  helpCloseBtn: HTMLElement | null;
  settingsModal: HTMLElement | null;
  settingsOpenBtn: HTMLElement | null;
  settingsCloseBtn: HTMLElement | null;
  sliderBgm: HTMLInputElement | null;
  sliderSfx: HTMLInputElement | null;
  bgmVolLabel: HTMLElement | null;
  sfxVolLabel: HTMLElement | null;
  setBgmIcoUse: HTMLElement | null;
  setSfxIcoUse: HTMLElement | null;
  // Радар
  radarBadgeEl: HTMLElement | null;
  radarSweepSvg: SVGSVGElement | null;
  // Слоты оружий в HUD
  wSlots: Record<WeaponSlotKey, HTMLElement | null>;
  // Бэкап сохранения
  exportSaveBtn: HTMLElement | null;
  importSaveBtn: HTMLElement | null;
  importSaveFile: HTMLInputElement | null;
}

function byId<T extends Element>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

function opt<T extends Element>(id: string): T | null {
  return document.getElementById(id) as unknown as T | null;
}

/** Собрать все ссылки DOM за один проход. Вызывается один раз из bootstrap. */
export function initDom(): Dom {
  const bloomCanvas = byId<HTMLCanvasElement>('bloom-canvas');
  return {
    stage: byId('stage'),
    gpuCanvas: byId<HTMLCanvasElement>('gpu-canvas'),
    pixiCanvas: byId<HTMLCanvasElement>('pixi-canvas'),
    bloomCanvas,
    bloomCtx: bloomCanvas.getContext('2d')!,
    radarCanvas: byId<HTMLCanvasElement>('radar-canvas'),
    portraitCanvas: byId<HTMLCanvasElement>('portrait-canvas'),

    hpFillEl: byId('hp-fill'),
    hpNumEl: byId('hp-num'),
    hpWrapEl: byId('hp-wrap'),
    tailNumEl: byId('tail-num'),
    tailFillEl: byId('tail-fill'),
    tailwarnEl: byId('tailwarn'),
    nodesChipEl: byId('nodes-chip'),
    xpConduitFillEl: opt('xp-conduit-fill'),
    scaleChipEl: byId('scale-chip'),
    bioFillEl: byId('bio-fill'),
    resHudEl: opt('resonance-hud'),
    resMultEl: opt('res-mult'),
    resStreakEl: opt('res-streak'),
    resBarFillEl: opt('res-bar-fill'),

    levelEl: byId('level'),
    timerEl: byId('timer'),
    waveEl: byId('wave'),
    killsEl: byId('kills'),

    toastEl: byId('toast'),
    hurtEl: byId('hurt'),

    intro: byId('intro'),
    introStartBtn: byId('intro-start'),
    helpBtn: byId('help-btn'),
    muteBtn: byId<HTMLButtonElement>('mute-btn'),
    muteBtnUse: opt('mute-btn-use'),
    fullscreenBtn: byId<HTMLButtonElement>('fullscreen-btn'),
    pauseBtn: byId<HTMLButtonElement>('pause-btn'),
    pauseBtnUse: opt('pause-btn-use'),
    startBtnLabel: opt('start-btn-label'),
    menuRecordBadge: opt('menu-record-badge'),
    menuRecordText: opt('menu-record-text'),

    bossHudEl: opt('boss-hud'),
    bossNameEl: opt('boss-name'),
    bossHudIcoUse: opt('boss-hud-ico-use'),
    bossHpFillEl: opt('boss-hp-fill'),
    bossHpTextEl: opt('boss-hp-text'),
    statusChipsEl: opt('status-chips'),

    upgradeModal: byId('upgrade'),
    upgradeTitle: byId('upgrade-title'),
    cardsEl: byId('cards'),
    rerollBtn: byId<HTMLButtonElement>('reroll-btn'),

    modal: byId('modal'),
    modalTitle: byId('modal-title'),
    modalSub: byId('modal-sub'),
    deathStatsEl: byId('death-stats'),
    deathCauseEl: opt('death-cause'),
    deathAchBtn: opt('death-ach-btn'),
    restartBtn: byId('restart-btn'),
    endlessBtn: byId<HTMLButtonElement>('endless-btn'),
    savePortraitBtn: byId('save-portrait'),
    branchChipEl: byId('branch-chip'),

    biolabBtn: byId('biolab-btn'),
    biolabOverlay: byId('biolab'),
    biolabOpenBtn: opt('biolab-open'),
    biolabCloseBtn: byId('biolab-close'),
    biolabPointsEl: byId('biolab-points'),
    biolabSlotsPillEl: opt('biolab-slots-pill'),
    biolabDisableAllBtn: byId<HTMLButtonElement>('biolab-disable-all'),
    biolabListEl: byId('biolab-list'),

    dailyModal: opt('daily-modal'),
    dailyBriefBody: opt('daily-brief-body'),
    dailyStartBtn: opt('daily-start-btn'),
    dailyCloseBtn: opt('daily-close'),
    dailyHudPillEl: opt('daily-hud-pill'),
    dailyChallengeBtn: opt('daily-challenge-btn'),

    achievementsModal: opt('achievements-modal'),
    achievementsOpenBtn: opt('achievements-open'),
    achievementsOpenLabel: opt('achievements-open-label'),
    achStatsPillEl: opt('ach-stats-pill'),
    achProgressEl: opt<HTMLProgressElement>('ach-progress'),
    achievementsGridEl: opt('achievements-grid'),
    achCloseBtn: opt('ach-close'),

    codexModal: opt('codex'),
    codexOpenBtn: opt('codex-open'),
    codexCloseBtn: opt('codex-close'),
    codexGridEl: opt('codex-grid'),
    codexStatsEl: opt('codex-stats'),
    codexPrevBtn: opt<HTMLButtonElement>('codex-prev-btn'),
    codexNextBtn: opt<HTMLButtonElement>('codex-next-btn'),
    codexPageInfo: opt('codex-page-info'),

    helpModal: opt('help-modal'),
    helpModalOpenBtn: opt('help-modal-open'),
    helpCloseBtn: opt('help-close'),
    settingsModal: opt('settings-modal'),
    settingsOpenBtn: opt('settings-open'),
    settingsCloseBtn: opt('settings-close'),
    sliderBgm: opt<HTMLInputElement>('slider-bgm'),
    sliderSfx: opt<HTMLInputElement>('slider-sfx'),
    bgmVolLabel: opt('bgm-vol-label'),
    sfxVolLabel: opt('sfx-vol-label'),
    setBgmIcoUse: opt('set-bgm-ico-use'),
    setSfxIcoUse: opt('set-sfx-ico-use'),

    radarBadgeEl: opt('radar-badge'),
    radarSweepSvg: opt<SVGSVGElement>('radar-sweep-svg'),

    wSlots: {
      spikes: opt('wh-spikes'),
      orbs: opt('wh-orbs'),
      nova: opt('wh-nova'),
      aura: opt('wh-aura'),
      mandibles: opt('wh-mandibles'),
      cysts: opt('wh-cysts'),
      dash: opt('wh-dash'),
      call: opt('wh-call'),
      ring: opt('wh-ring'),
    },

    exportSaveBtn: opt('export-save-btn'),
    importSaveBtn: opt('import-save-btn'),
    importSaveFile: opt<HTMLInputElement>('import-save-file'),
  };
}
