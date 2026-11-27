// Испытание дня (#daily-modal): брифинг условий и старт забега.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function dailyScreen(): string {
  return `
    <div id="daily-modal" role="dialog" aria-modal="true" aria-labelledby="daily-modal-title">
      <div class="daily-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="modal-header-bar">
          <div>
            <h1 class="intro-title" id="daily-modal-title">ИСПЫТАНИЕ ДНЯ</h1>
            <p class="intro-sub" id="daily-modal-sub">Особый забег суток с фиксированными условиями и бонусной наградой Биолаба.</p>
          </div>
          <button class="modal-x-btn" type="button" data-close-modal="daily" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
        </div>
        <div id="daily-brief-body" class="daily-brief-grid"></div>
        <div class="modal-footer">
          <button id="daily-start-btn" class="primary-btn" type="button" style="width:auto;min-width:220px;">
            <svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-play"/></svg>
            <span id="daily-start-label">НАЧАТЬ ИСПЫТАНИЕ</span>
          </button>
          <button id="daily-close" class="modal-close-btn" type="button">НАЗАД</button>
        </div>
      </div>
    </div>
`;
}
