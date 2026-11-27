// Настройки (#settings-modal): комфорт, качество, звук, язык, бэкап.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function settingsScreen(): string {
  return `
    <div id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title-el">
      <div class="settings-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="settings-header">
          <div class="settings-header-text">
            <div class="settings-header-left">
              <svg class="settings-title-ico bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-gear-settings"/></svg>
              <h2 class="settings-title" id="settings-title-el">НАСТРОЙКИ КОМФОРТА И ЗВУКА</h2>
            </div>
            <span class="settings-subtitle" id="settings-subtitle-el">ВИЗУАЛЬНАЯ БЕЗОПАСНОСТЬ И БИОАКУСТИКА</span>
          </div>
          <button class="modal-x-btn" type="button" data-close-modal="settings" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
        </div>

        <div class="settings-grid">
          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-flashes-name">ВСПЫШКИ ЭКРАНА</span>
              <span class="settings-hint" id="set-flashes-hint">Смягчает или отключает световые импульсы при уроне</span>
            </div>
            <div class="settings-options" id="opt-flashes">
              <button class="settings-btn active" type="button" data-val="soft" data-i18n="opt_soft">МЯГКИЕ</button>
              <button class="settings-btn" type="button" data-val="off" data-i18n="opt_off">ВЫКЛ</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-shake-name">ТРЯСКА КАМЕРЫ</span>
              <span class="settings-hint" id="set-shake-hint">Микро-толчки камеры при взрывах и получении урона</span>
            </div>
            <div class="settings-options" id="opt-shake">
              <button class="settings-btn active" type="button" data-val="subtle" data-i18n="opt_subtle">СЛАБАЯ</button>
              <button class="settings-btn" type="button" data-val="off" data-i18n="opt_off">ВЫКЛ</button>
              <button class="settings-btn" type="button" data-val="full" data-i18n="opt_full">ПОЛНАЯ</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-parallax-name">ГЛУБИНА МИКРОМИРА</span>
              <span class="settings-hint" id="set-parallax-hint">Плавающие вне фокуса клетки боке и планктонная взвесь</span>
            </div>
            <div class="settings-options" id="opt-parallax">
              <button class="settings-btn active" type="button" data-val="on" data-i18n="opt_on">ВКЛ</button>
              <button class="settings-btn" type="button" data-val="off" data-i18n="opt_off">ВЫКЛ</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-quality-name">КАЧЕСТВО WEBGPU</span>
              <span class="settings-hint" id="set-quality-hint">Плотность роя частиц и постобработка bloom</span>
            </div>
            <div class="settings-options" id="opt-quality">
              <button class="settings-btn" type="button" data-val="low" data-i18n="opt_low">НИЗКОЕ</button>
              <button class="settings-btn active" type="button" data-val="medium" data-i18n="opt_medium">СРЕДНЕЕ</button>
              <button class="settings-btn" type="button" data-val="high" data-i18n="opt_high">ВЫСОКОЕ</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-lang-name">ЯЗЫК / LANGUAGE</span>
              <span class="settings-hint" id="set-lang-hint">Локализация интерфейса</span>
            </div>
            <div class="settings-options" id="opt-lang">
              <button class="settings-btn active" type="button" data-val="ru">RU</button>
              <button class="settings-btn" type="button" data-val="en">EN</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <label class="settings-name settings-label-row" for="slider-bgm"><svg class="inline-card-ico bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use id="set-bgm-ico-use" href="#ico-sound-on"/></svg><span id="set-bgm-name">ГРОМКОСТЬ МУЗЫКИ</span></label>
              <span class="settings-hint" id="bgm-vol-label">60%</span>
            </div>
            <input type="range" id="slider-bgm" class="bio-slider" min="0" max="100" value="60" />
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <label class="settings-name settings-label-row" for="slider-sfx"><svg class="inline-card-ico bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use id="set-sfx-ico-use" href="#ico-sound-on"/></svg><span id="set-sfx-name">ГРОМКОСТЬ ЭФФЕКТОВ (SFX)</span></label>
              <span class="settings-hint" id="sfx-vol-label">80%</span>
            </div>
            <input type="range" id="slider-sfx" class="bio-slider" min="0" max="100" value="80" />
          </div>

          <div class="settings-row">
            <div class="settings-info">
              <span class="settings-name" id="set-backup-name">РЕЗЕРВНОЕ КОПИРОВАНИЕ</span>
              <span class="settings-hint" id="set-backup-hint">Биолаб, Кодекс, Достижения (JSON)</span>
            </div>
            <div class="settings-options">
              <button id="export-save-btn" class="settings-btn" type="button"><svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-export"/></svg> <span id="export-save-label">ЭКСПОРТ СЕЙВА</span></button>
              <button id="import-save-btn" class="settings-btn" type="button"><svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-import"/></svg> <span id="import-save-label">ИМПОРТ СЕЙВА</span></button>
              <input type="file" id="import-save-file" accept="application/json" style="display:none" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="settings-close" class="modal-close-btn" type="button">СОХРАНИТЬ И ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
`;
}
