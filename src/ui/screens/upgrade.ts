// Экран «Выбор мутации» (#upgrade): карточки ДНК при leveling up.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function upgradeScreen(): string {
  return `
    <div id="upgrade" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <h2 id="upgrade-title">УРОВЕНЬ 2 — ВЫБЕРИТЕ МУТАЦИЮ</h2>
      <div id="cards"></div>
      <button id="reroll-btn" class="ghost-btn" type="button">ПЕРЕРОЛЛ (2)</button>
    </div>
`;
}
