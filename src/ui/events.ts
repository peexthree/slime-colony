// Разводка событий: клавиатура, мышь, кнопки меню, слайдеры настроек, геймпад,
// пасхалки и авто-пауза. Только слушатели - вся логика в game/ui-модулях.
import { t, setLocale } from '../i18n';
import { SIM_HEIGHT, SIM_WIDTH } from '../engine/types';
import { downloadPortrait } from '../engine/portrait';
import type { Ctx } from '../game/context';
import type { ModalKind } from './modals';
import {
  applyQualitySettings, closeHelpModal, codexNextPage, codexPrevPage, isHelpOpenedFromGame,
  modalBackTarget, setCodexCategory, setHelpOpenedFromGame, showModal, syncAudioIcons,
  syncFullscreenButton, syncSettingsUI, toggleFullscreenAction, toggleMuteAction, togglePause,
  renderBiolab,
} from './modals';
import { applyI18n } from './i18n';
import { chooseUpgrade, rerollUpgrades } from './upgrades';
import { showToast } from './toast';
import { exportSave, importSave, saveSettings } from '../game/save';
import { enterOverdrive, resetRun, startDailyRun, startOrResumeRun } from '../game/runFlow';
import { isUnlocked, purchase, toggleModule, disableAllBiolab, MAX_ACTIVE_BIOLAB } from '../engine/biolab';

/** Подключить все слушатели событий приложения. Вызывается один раз из bootstrap. */
export function wireEvents(ctx: Ctx): void {
  const dom = ctx.dom;
  const sfx = ctx.svc.sfx;

  // ---------- Мышь над канвасом: цель движения и рывок по правой кнопке ----------
  dom.pixiCanvas.addEventListener('mousemove', (e) => {
    const rect = dom.pixiCanvas.getBoundingClientRect();
    const scrX = ((e.clientX - rect.left) / rect.width) * ctx.svc.overlay.screenWidth;
    const scrY = ((e.clientY - rect.top) / rect.height) * ctx.svc.overlay.screenHeight;
    const k = ctx.camZoom * ctx.svc.overlay.scale;
    ctx.mouse.x = ctx.camX + (scrX - ctx.svc.overlay.screenWidth / 2) / k;
    ctx.mouse.y = ctx.camY + (scrY - ctx.svc.overlay.screenHeight / 2) / k;
    ctx.mouse.active = true;
  });
  dom.pixiCanvas.addEventListener('mouseleave', () => (ctx.mouse.active = false));
  dom.pixiCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (ctx.started && !ctx.gameOver && !ctx.paused) {
      ctx.dashRequested = true;
    }
  });

  // ---------- Клавиатура ----------
  window.addEventListener('keydown', (e) => {
    sfx.unlock();
    ctx.keys.add(e.key.toLowerCase());
    if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && ctx.started && !ctx.gameOver) {
      ctx.dashRequested = true;
    }
    // Клавиши 1-4: быстрый выбор карточки апгрейда
    if (dom.upgradeModal.classList.contains('show') && ['1', '2', '3', '4'].includes(e.key)) {
      const idx = Number(e.key) - 1;
      const card = dom.cardsEl.children[idx] as HTMLButtonElement | undefined;
      if (card) card.click();
      return;
    }
    // Escape: сначала закрыть активное подменю на один шаг назад, иначе пауза
    if (e.key === 'Escape') {
      const backTarget: ModalKind | null = modalBackTarget(ctx);
      if (dom.dailyModal?.classList.contains('show')) { showModal(ctx, backTarget); return; }
      if (dom.achievementsModal?.classList.contains('show')) { showModal(ctx, backTarget); return; }
      if (dom.codexModal?.classList.contains('show')) { showModal(ctx, backTarget); return; }
      if (dom.biolabOverlay.classList.contains('show')) { showModal(ctx, backTarget); return; }
      if (dom.settingsModal?.classList.contains('show')) { showModal(ctx, backTarget); return; }
      if (dom.helpModal?.classList.contains('show')) { escapeFromHelp(ctx); return; }
      if (ctx.started && !ctx.gameOver && !ctx.dying && ctx.pendingUps === 0) {
        togglePause(ctx);
      }
    }
    // P: пауза / возобновление во время забега
    if (e.key.toLowerCase() === 'p' && ctx.started && !ctx.gameOver && !ctx.dying && ctx.pendingUps === 0) {
      togglePause(ctx);
    }
    // M: быстрое включение/выключение звука
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'm') {
      toggleMuteAction(ctx);
      return;
    }
    // F: полноэкранный режим
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') {
      void toggleFullscreenAction(ctx);
      return;
    }
    // Пробел не должен скроллить страницу во время игры
    if (e.key === ' ' && ctx.started && !ctx.gameOver) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => ctx.keys.delete(e.key.toLowerCase()));
  // Аудио разблокируется первым жестом пользователя (клик или клавиша)
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: false });

  // ---------- Апгрейды: реролл и выбор карточки ----------
  if (dom.rerollBtn) {
    dom.rerollBtn.addEventListener('click', () => rerollUpgrades(ctx));
  }
  dom.cardsEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.up-card') as HTMLElement | null;
    if (!card) return;
    chooseUpgrade(ctx, card.dataset.id);
  });

  // ---------- Кодекс ----------
  document.querySelectorAll('.codex-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.codex-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      const cat = (tabBtn.getAttribute('data-cat') || 'all') as 'all' | 'enemy' | 'hybrid' | 'branch';
      setCodexCategory(ctx, cat);
    });
  });
  if (dom.codexPrevBtn) dom.codexPrevBtn.addEventListener('click', () => codexPrevPage(ctx));
  if (dom.codexNextBtn) dom.codexNextBtn.addEventListener('click', () => codexNextPage(ctx));
  if (dom.codexOpenBtn) dom.codexOpenBtn.addEventListener('click', () => { sfx.codexOpen(); showModal(ctx, 'codex'); });
  if (dom.codexCloseBtn) dom.codexCloseBtn.addEventListener('click', () => showModal(ctx, !ctx.started || ctx.paused ? 'intro' : null));

  // ---------- Руководство ----------
  document.querySelectorAll('.help-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      const targetId = 'help-content-' + tabBtn.getAttribute('data-tab');
      document.querySelectorAll('.help-content').forEach((c) => {
        c.toggleAttribute('hidden', c.id !== targetId);
      });
    });
  });
  if (dom.helpModalOpenBtn) {
    dom.helpModalOpenBtn.addEventListener('click', () => { setHelpOpenedFromGame(false); showModal(ctx, 'help'); });
  }
  if (dom.helpCloseBtn) dom.helpCloseBtn.addEventListener('click', () => closeHelpModal(ctx));

  // ---------- Пауза / звук / полноэкранный режим ----------
  if (dom.pauseBtn) dom.pauseBtn.addEventListener('click', () => togglePause(ctx));
  if (dom.muteBtn) dom.muteBtn.addEventListener('click', () => toggleMuteAction(ctx));
  if (dom.fullscreenBtn) dom.fullscreenBtn.addEventListener('click', () => { void toggleFullscreenAction(ctx); });
  document.addEventListener('fullscreenchange', () => syncFullscreenButton(ctx));

  document.querySelectorAll('.modal-x-btn[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-close-modal') === 'help' && isHelpOpenedFromGame()) {
        closeHelpModal(ctx);
      } else {
        showModal(ctx, !ctx.started || (ctx.paused && !ctx.gameOver) ? 'intro' : null);
      }
    });
  });

  // ---------- Настройки комфорта и звука ----------
  document.querySelectorAll('#opt-flashes .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.settings.screenFlashes = (btn.getAttribute('data-val') || 'soft') as typeof ctx.settings.screenFlashes;
      saveSettings(ctx);
      syncSettingsUI(ctx);
    });
  });
  document.querySelectorAll('#opt-shake .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.settings.cameraShake = (btn.getAttribute('data-val') || 'subtle') as typeof ctx.settings.cameraShake;
      saveSettings(ctx);
      syncSettingsUI(ctx);
    });
  });
  document.querySelectorAll('#opt-parallax .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.settings.microParallax = btn.getAttribute('data-val') === 'on';
      saveSettings(ctx);
      syncSettingsUI(ctx);
    });
  });
  if (dom.sliderBgm) {
    dom.sliderBgm.addEventListener('input', () => {
      ctx.settings.bgmVolume = Number(dom.sliderBgm!.value);
      if (dom.bgmVolLabel) dom.bgmVolLabel.textContent = `${ctx.settings.bgmVolume}%`;
      sfx.setBgmVolume(ctx.settings.bgmVolume / 100);
      saveSettings(ctx);
      syncAudioIcons(ctx);
    });
  }
  if (dom.sliderSfx) {
    dom.sliderSfx.addEventListener('input', () => {
      ctx.settings.sfxVolume = Number(dom.sliderSfx!.value);
      if (dom.sfxVolLabel) dom.sfxVolLabel.textContent = `${ctx.settings.sfxVolume}%`;
      sfx.setSfxVolume(ctx.settings.sfxVolume / 100);
      saveSettings(ctx);
      syncAudioIcons(ctx);
    });
  }
  if (dom.settingsOpenBtn) dom.settingsOpenBtn.addEventListener('click', () => showModal(ctx, 'settings'));
  if (dom.settingsCloseBtn) dom.settingsCloseBtn.addEventListener('click', () => showModal(ctx, !ctx.started || ctx.paused ? 'intro' : null));
  document.querySelectorAll('#opt-quality .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.settings.quality = (btn.getAttribute('data-val') || 'medium') as typeof ctx.settings.quality;
      saveSettings(ctx);
      applyQualitySettings(ctx);
      syncSettingsUI(ctx);
    });
  });
  document.querySelectorAll('#opt-lang .settings-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = (btn.getAttribute('data-val') || 'ru') as 'ru' | 'en';
      setLocale(lang);
      applyI18n(ctx);
      syncSettingsUI(ctx);
    });
  });

  // ---------- Бэкап сохранения ----------
  if (dom.exportSaveBtn) dom.exportSaveBtn.addEventListener('click', () => exportSave(ctx));
  if (dom.importSaveBtn && dom.importSaveFile) {
    dom.importSaveBtn.addEventListener('click', () => dom.importSaveFile!.click());
    dom.importSaveFile.addEventListener('change', async () => {
      const file = dom.importSaveFile!.files?.[0];
      if (!file) return;
      try {
        await importSave(ctx, file);
      } finally {
        dom.importSaveFile!.value = '';
      }
    });
  }

  // ---------- Биолаб ----------
  dom.biolabListEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.bl-card') as HTMLElement | null;
    if (!card || !card.dataset.id) return;
    const id = card.dataset.id;
    if (!isUnlocked(id)) {
      if (purchase(id)) {
        sfx.biolabUnlock();
        showToast(ctx, t('toast_biolab_bought'), 'success');
      } else {
        sfx.capture(false);
      }
    } else {
      const res = toggleModule(id);
      if (!res.ok && res.reason === 'limit') {
        sfx.capture(false);
        showToast(ctx, t('biolab_limit_toast', { max: MAX_ACTIVE_BIOLAB }), 'warn');
      } else if (res.ok) {
        sfx.upgradeSelect();
      }
    }
    renderBiolab(ctx);
  });
  if (dom.biolabDisableAllBtn) {
    dom.biolabDisableAllBtn.addEventListener('click', () => {
      disableAllBiolab();
      sfx.upgradeSelect();
      showToast(ctx, t('biolab_disabled_all_toast'), 'info');
      renderBiolab(ctx);
    });
  }
  if (dom.biolabOpenBtn) dom.biolabOpenBtn.addEventListener('click', () => showModal(ctx, 'biolab'));
  if (dom.biolabBtn) dom.biolabBtn.addEventListener('click', () => showModal(ctx, 'biolab'));
  dom.biolabCloseBtn.addEventListener('click', () => showModal(ctx, modalBackTarget(ctx)));
  dom.savePortraitBtn.addEventListener('click', () => {
    if (!ctx.lastGenome) return;
    downloadPortrait(dom.portraitCanvas, `lumivore-${ctx.lastGenome.branch}-${Math.round(ctx.lastGenome.survivalTime)}s.png`);
  });

  // ---------- Старт / дневное испытание / достижения / справка ----------
  dom.introStartBtn.addEventListener('click', () => startOrResumeRun(ctx));
  if (dom.dailyChallengeBtn) dom.dailyChallengeBtn.addEventListener('click', () => showModal(ctx, 'daily'));
  if (dom.dailyStartBtn) {
    dom.dailyStartBtn.addEventListener('click', () => {
      resetRun(ctx);
      startDailyRun(ctx);
    });
  }
  if (dom.dailyCloseBtn) dom.dailyCloseBtn.addEventListener('click', () => showModal(ctx, modalBackTarget(ctx)));
  if (dom.achievementsOpenBtn) dom.achievementsOpenBtn.addEventListener('click', () => showModal(ctx, 'achievements'));
  if (dom.deathAchBtn) dom.deathAchBtn.addEventListener('click', () => showModal(ctx, 'achievements'));
  if (dom.achCloseBtn) dom.achCloseBtn.addEventListener('click', () => showModal(ctx, modalBackTarget(ctx)));
  dom.helpBtn.addEventListener('click', () => {
    if (!ctx.started || ctx.gameOver || ctx.dying) return;
    ctx.paused = true;
    setHelpOpenedFromGame(true);
    sfx.setTailDrone(false);
    sfx.stopBgm();
    showModal(ctx, 'help');
  });

  // ---------- Рестарт и бесконечный режим ----------
  dom.restartBtn.addEventListener('click', () => resetRun(ctx));
  if (dom.endlessBtn) {
    dom.endlessBtn.addEventListener('click', () => enterOverdrive(ctx));
  }

  // ---------- Авто-пауза при сворачивании/переключении вкладки ----------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ctx.started && !ctx.paused && !ctx.gameOver) {
      ctx.paused = true;
      sfx.setTailDrone(false);
      sfx.stopBgm();
      showModal(ctx, 'intro');
    }
  });

  // ---------- Пасхалка 1: Код Контаминации (Konami Code: ↑↑↓↓←→←→BA) ----------
  const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === konamiSeq[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konamiSeq.length) {
        konamiIdx = 0;
        const active = document.body.classList.toggle('retro-oscilloscope');
        showToast(ctx, active ? 'ПРОТОКОЛ 1984: ОСЦИЛЛОГРАФ АКТИВЕН' : 'ПРОТОКОЛ 1984: ОТКЛЮЧЕН');
      }
    } else {
      konamiIdx = k === konamiSeq[0] ? 1 : 0;
    }
  });

  // ---------- Пасхалка 2: Ночная смена в реакторе (00:00-04:00) ----------
  const localHour = new Date().getHours();
  if (localHour >= 0 && localHour < 4) {
    showToast(ctx, 'НОЧНАЯ СМЕНА ЕВРОКОРП-3: УЛЬТРАФИОЛЕТОВЫЙ ПРОТОКОЛ');
  }

  // ---------- Пасхалка 3: 10 кликов по заголовку меню вызывают «чих» спор ----------
  const menuTitleEl = document.querySelector('#intro h1');
  if (menuTitleEl) {
    let titleClicks = 0;
    menuTitleEl.addEventListener('click', () => {
      titleClicks++;
      if (titleClicks >= 10) {
        titleClicks = 0;
        ctx.svc.sim.spawnPlayerSpores(SIM_WIDTH / 2, SIM_HEIGHT / 2, 4000);
        ctx.svc.overlay.spawnPulse(ctx.player.x, ctx.player.y, 0x66fcf1, 180);
        showToast(ctx, 'ОБРАЗЕЦ ЧИХНУЛ СПОРАМИ!');
      }
    });
  }

  // ---------- Пасхалка 4: 7 кликов по заголовку Биолаба -> секретное досье ----------
  const biolabTitleEl = document.querySelector('#biolab h1');
  if (biolabTitleEl) {
    let blClicks = 0;
    biolabTitleEl.addEventListener('click', () => {
      blClicks++;
      if (blClicks >= 7) {
        blClicks = 0;
        showToast(ctx, 'ДОСЬЕ 0xDEAD_SLIME: Проект-0 сбежал из реактора в 2024 г.');
      }
    });
  }

  // ---------- Геймпад: навигация по карточкам апгрейда ----------
  let gpUpgradeFocus = 0;
  window.setInterval(() => {
    if (!dom.upgradeModal.classList.contains('show')) return;
    const gp = ctx.svc.gamepad.poll();
    if (!gp.connected) return;
    const cards = Array.from(dom.cardsEl.children) as HTMLButtonElement[];
    if (cards.length === 0) return;
    if (gp.navLeft) gpUpgradeFocus = (gpUpgradeFocus - 1 + cards.length) % cards.length;
    if (gp.navRight) gpUpgradeFocus = (gpUpgradeFocus + 1) % cards.length;
    cards.forEach((c, idx) => c.classList.toggle('gp-focus', idx === gpUpgradeFocus));
    if (gp.confirmPressed && cards[gpUpgradeFocus]) {
      cards[gpUpgradeFocus].click();
    }
  }, 80);
}

/** Escape в справке: возврат в бой снимает паузу, иначе в меню */
function escapeFromHelp(ctx: Ctx): void {
  if (isHelpOpenedFromGame()) {
    setHelpOpenedFromGame(false);
    ctx.paused = false;
    ctx.svc.sfx.startBgm();
    showModal(ctx, null);
  } else {
    showModal(ctx, 'intro');
  }
}
