// Кодекс (#codex): бестиарий роя, фильтры по категориям и пагинация.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function codexScreen(): string {
  return `
    <div id="codex" role="dialog" aria-modal="true" aria-labelledby="codex-title-el">
      <div class="codex-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="codex-header">
          <div>
            <h2 class="codex-title" id="codex-title-el">БЕСТИАРИЙ И КОДЕКС ГИБРИДОВ</h2>
            <p class="intro-sub" id="codex-sub">Каталог организмов роя, штаммов ДНК и Великих Гибридов реактора «ЕвроКорп-3».</p>
          </div>
          <div class="codex-header-right">
            <div id="codex-stats" class="codex-stats-pill">ОТКРЫТО: 0 / 22</div>
            <button class="modal-x-btn" type="button" data-close-modal="codex" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
          </div>
        </div>

        <div class="codex-filter-tabs" role="tablist" aria-label="Фильтр Кодекса">
          <button class="codex-tab active" type="button" role="tab" aria-selected="true" data-cat="all">ВСЕ (22)</button>
          <button class="codex-tab" type="button" role="tab" aria-selected="false" data-cat="enemy">ВРАГИ РОЯ (12)</button>
          <button class="codex-tab" type="button" role="tab" aria-selected="false" data-cat="hybrid">ВЕЛИКИЕ ГИБРИДЫ (6)</button>
          <button class="codex-tab" type="button" role="tab" aria-selected="false" data-cat="branch">ШТАММЫ ДНК (4)</button>
          <button class="codex-tab" type="button" role="tab" aria-selected="false" data-cat="scale">ШКАЛЫ БЫТИЯ (15)</button>
        </div>

        <div id="codex-grid" class="codex-grid"></div>

        <div class="codex-footer">
          <div class="codex-page-nav">
            <button id="codex-prev-btn" class="nav-btn" type="button"><svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-arrow-prev"/></svg> <span id="codex-prev-label">ПРЕДЫДУЩАЯ</span></button>
            <span id="codex-page-info">СТРАНИЦА 1 / 4</span>
            <button id="codex-next-btn" class="nav-btn" type="button"><span id="codex-next-label">СЛЕДУЮЩАЯ</span> <svg class="inline-card-ico" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-arrow-next"/></svg></button>
          </div>
          <button id="codex-close" class="modal-close-btn" type="button">ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
`;
}
