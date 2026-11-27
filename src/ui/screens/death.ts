// Финальный экран смерти/победы (#modal): заголовок, статистика, портрет, кнопки.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function deathScreen(): string {
  return `
    <div id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="death-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="death-header">
          <h1 id="modal-title"></h1>
          <p id="modal-sub"></p>
          <div id="death-cause" class="death-cause" hidden></div>
        </div>
        <div class="death-body">
          <div id="death-stats"></div>
          <canvas id="portrait-canvas" width="1280" height="720"></canvas>
        </div>
        <div id="death-actions">
          <button id="restart-btn" type="button">НОВЫЙ ЗАБЕГ</button>
          <button id="endless-btn" class="ghost-btn" type="button" style="display:none"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-play"/></svg> <span>OVERDRIVE ∞</span></button>
          <button id="save-portrait" class="ghost-btn" type="button"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-camera-dna"/></svg> <span>ПОРТРЕТ PNG</span></button>
          <button id="biolab-btn" class="ghost-btn" type="button"><svg viewBox="0 0 32 32" class="bio-emerald" aria-hidden="true"><use href="#ico-biolab"/></svg> <span>БИОЛАБ</span></button>
          <button id="death-ach-btn" class="ghost-btn" type="button"><svg viewBox="0 0 32 32" class="bio-amber" aria-hidden="true"><use href="#ico-record-badge"/></svg> <span>ДОСТИЖЕНИЯ</span></button>
        </div>
      </div>
    </div>
`;
}
