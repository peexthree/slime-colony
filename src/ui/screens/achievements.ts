// Достижения (#achievements-modal): сетка испытаний и прогресс.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function achievementsScreen(): string {
  return `
    <div id="achievements-modal" role="dialog" aria-modal="true" aria-labelledby="ach-title-el">
      <div class="ach-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="codex-header">
          <div>
            <h1 class="codex-title" id="ach-title-el">ДОСТИЖЕНИЯ</h1>
            <p class="intro-sub" id="ach-sub-el">Испытания реактора «ЕвроКорп-3». Каждое достижение приносит очки Биолаба.</p>
          </div>
          <div class="codex-header-right">
            <div id="ach-stats-pill" class="codex-stats-pill">ОТКРЫТО: 0 / 10</div>
            <button class="modal-x-btn" type="button" data-close-modal="achievements" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
          </div>
        </div>
        <div class="ach-progress-row">
          <progress id="ach-progress" class="bio-progress" max="10" value="0" aria-labelledby="ach-title-el"></progress>
        </div>
        <div id="achievements-grid" class="ach-grid scroll-region"></div>
        <div class="modal-footer">
          <button id="ach-close" class="modal-close-btn" type="button">ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
`;
}
