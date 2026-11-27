// Точка входа статических экранов: injectScreens() заменяет экраны-модалки и
// SVG-спрайт, которые раньше были зашиты в index.html (~1000 строк разметки).
// Контракт: вызывается из main.ts ОДИН раз, синхронно, ДО initDom() - тогда все
// getElementById из ui/dom.ts находят элементы как раньше, а applyI18n из
// ui/i18n.ts перепереводит data-i18n без изменений.
//
// Порядок DOM сохранён 1:1 с исходным index.html через плейсхолдеры-слоты:
//   #screens-slot-pre  - место блоков #upgrade / #modal / #biolab (перед #intro);
//   #screens-slot-post - место #daily-modal / #achievements-modal / #codex /
//                        #help-modal / #settings-modal (после #intro).
// Слоты находятся внутри #stage и после вставки удаляются, поэтому DOM после
// injectScreens() идентичен исходному index.html.
import { svgSymbols } from './symbols';
import { upgradeScreen } from './upgrade';
import { deathScreen } from './death';
import { biolabScreen } from './biolab';
import { dailyScreen } from './daily';
import { achievementsScreen } from './achievements';
import { codexScreen } from './codex';
import { helpScreen } from './help';
import { settingsScreen } from './settings';

/** Вставить SVG-спрайт и все статические экраны в DOM. root - контейнер со слотами (document.body). */
export function injectScreens(root: HTMLElement): void {
  // SVG-спрайт символов: первый ребёнок body, как в исходном index.html
  // (ссылки <use href="#ico-*"> резолвятся по документу и работают из любого места).
  document.body.insertAdjacentHTML('afterbegin', svgSymbols());

  // Экраны до #intro: апгрейд-модалка, финальный экран, Биолаборатория
  const preSlot = root.querySelector('#screens-slot-pre');
  if (preSlot) {
    preSlot.insertAdjacentHTML(
      'beforebegin',
      upgradeScreen() + deathScreen() + biolabScreen()
    );
    preSlot.remove();
  }

  // Экраны после #intro: испытание дня, достижения, кодекс, справка, настройки
  const postSlot = root.querySelector('#screens-slot-post');
  if (postSlot) {
    postSlot.insertAdjacentHTML(
      'beforebegin',
      dailyScreen() + achievementsScreen() + codexScreen() + helpScreen() + settingsScreen()
    );
    postSlot.remove();
  }
}
