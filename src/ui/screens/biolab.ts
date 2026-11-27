// Биолаборатория (#biolab): мета-прогрессия, модули за очки выживания.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function biolabScreen(): string {
  return `
    <div id="biolab" role="dialog" aria-modal="true" aria-labelledby="biolab-title">
      <div class="biolab-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="modal-header-bar">
          <div>
            <h1 class="intro-title" id="biolab-title">БИОЛАБ</h1>
            <p class="intro-sub" id="biolab-sub">Модули между забегами. Покупайте за очки выживания и включайте/отключайте по желанию (лимит: 4 активных модуля).</p>
          </div>
          <button class="modal-x-btn" type="button" data-close-modal="biolab" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
        </div>
        <div class="biolab-toolbar">
          <p id="biolab-points"><svg class="bio-icon bio-violet" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-incubator"/></svg> 0 ОЧКОВ БИОЛАБА</p>
          <div class="biolab-toolbar-actions">
            <span id="biolab-slots-pill" class="codex-stats-pill">СЛОТЫ: 0 / 4</span>
            <button id="biolab-disable-all" class="nav-btn" type="button">ОТКЛЮЧИТЬ ВСЁ</button>
          </div>
        </div>
        <div id="biolab-list"></div>
        <div class="modal-footer">
          <button id="biolab-close" class="modal-close-btn" type="button">ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
`;
}
