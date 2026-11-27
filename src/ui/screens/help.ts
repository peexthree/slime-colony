// Руководство организма (#help-modal): три вкладки с подсказками.
// Перенесено из index.html в TS-шаблон: вставляется в DOM синхронно через
// injectScreens() (src/ui/screens/index.ts) ДО initDom(), поэтому все
// getElementById из ui/dom.ts продолжают находить свои элементы.
// Структура DOM, id- и data-i18n-атрибуты сохранены 1:1 с исходным index.html.

export function helpScreen(): string {
  return `
    <div id="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title-el">
      <div class="help-card">
        <svg class="corner tl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner tr" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner bl" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>
        <svg class="corner br" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-corner-frame"/></svg>

        <div class="help-header">
          <h2 class="help-title" id="help-title-el">РУКОВОДСТВО ОРГАНИЗМА</h2>
          <button class="modal-x-btn" type="button" data-close-modal="help" aria-label="Закрыть"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ui-close"/></svg></button>
        </div>

        <div class="help-tabs" role="tablist" aria-label="Разделы руководства">
          <button class="help-tab active" id="htab-basics" type="button" role="tab" aria-selected="true" data-tab="basics">ОСНОВЫ</button>
          <button class="help-tab" id="htab-dna" type="button" role="tab" aria-selected="false" data-tab="dna">ДНК И ЭВОЛЮЦИЯ</button>
          <button class="help-tab" id="htab-world" type="button" role="tab" aria-selected="false" data-tab="world">МИР И ШТАММЫ</button>
        </div>

        <div class="help-content" id="help-content-basics" role="tabpanel" aria-labelledby="htab-basics">
          <div class="help-grid">
            <div class="help-box">
              <h3 id="help-b1-t">ХВОСТ-ОРУЖИЕ</h3>
              <p id="help-b1-p">Хвост — ваше тело, биомасса и оружие. Движение сжигает сегменты, сферы ДНК восстанавливают длину. Если хвост истощится при полной неподвижности, голод начнёт сжигать HP.</p>
            </div>
            <div class="help-box">
              <h3 id="help-b2-t">КОЛЬЦО СМЕРТИ</h3>
              <p id="help-b2-p">Замкните траекторию хвоста вокруг толпы. Контур мгновенно схлопывается и поражает всё внутри, включая Гнёзда спор. Чем длиннее хвост, тем выше урон.</p>
            </div>
            <div class="help-box">
              <h3 id="help-b3-t">ФАЗОВЫЙ РЫВОК</h3>
              <p id="help-b3-p"><b>Shift</b> или <b>ПКМ</b> — мгновенное скольжение сквозь врагов. Дарует кратковременную неуязвимость и сеет за собой плотный споровый след.</p>
            </div>
            <div class="help-box">
              <h3 id="help-b4-t">ЗОВ И АРСЕНАЛ</h3>
              <p id="help-b4-p"><b>Пробел</b> — токсин-маяк в точке курсора (перезарядка 15 с). Слотов оружия всего <b>3</b>: оружие родного генома открывается по уровню (3, 5, 7, 9 ур.), чужого - на 4 уровня дороже. <b>Споровые цисты</b> - мощные мины поздней стадии (13 ур., ДНК Мицелия 2+), сбрасываются только в движении.</p>
            </div>
          </div>
        </div>

        <div class="help-content" id="help-content-dna" role="tabpanel" aria-labelledby="htab-dna" hidden>
          <div class="help-grid">
            <div class="help-box">
              <h3 id="help-d1-t">4 ГЕНОМА ДНК</h3>
              <p id="help-d1-p"><span class="bio-cyan">Вермис</span> (хлыст и длина хвоста), <span class="bio-magenta">Химера</span> (плазма и взрывы), <span class="bio-lime">Мицелий</span> (споры и нейрозахват), <span class="bio-amber">Симбионт</span> (магнетизм и скорость).</p>
            </div>
            <div class="help-box">
              <h3 id="help-d2-t">ВЕЛИКИЕ ГИБРИДЫ</h3>
              <p id="help-d2-p">3+3 уровня ДНК в двух ветках открывают карту слияния: Плазменный Левиафан, Уроборос-Паразит, Фазовый Змей, Споровый Реактор, Ионный Колосс, Пси-Сеть.</p>
            </div>
            <div class="help-box">
              <h3 id="help-d3-t">МЕТАМОРФОЗ И 15 ЛОКАЦИЙ</h3>
              <p id="help-d3-p">Заполните шкалу биомассы до 100% и победите Титана масштаба. Мир физически расширится, а вы подниметесь по Лестнице Эволюции: из капли в реакторе зонда «ЕвроКорп-3» сквозь тело носителя на поверхность Ξ-9 и выше, в небо и за пределы биологии - 15 локаций, у каждой свой биом, палитра и узор среды.</p>
            </div>
            <div class="help-box">
              <h3 id="help-d4-t">ПАТОЛОГИИ И ОРГАНЕЛЛЫ</h3>
              <p id="help-d4-p"><b>Патологии</b> (с алой каймой) дают огромную мощь ценой суровых штрафов. <b>Прото-органеллы</b> наделяют особь автономными защитными системами.</p>
            </div>
          </div>
        </div>

        <div class="help-content" id="help-content-world" role="tabpanel" aria-labelledby="htab-world" hidden>
          <div class="help-grid">
            <div class="help-box">
              <h3 id="help-w1-t">ПОЛЕ PHYSARUM</h3>
              <p id="help-w1-p">Ваш штамм ускоряет особь (+25%) и регенерирует хвост. Вражеский штамм ускоряет таяние хвоста в 1.8 раза. На каждой Шкале бытия палитра полей меняется.</p>
            </div>
            <div class="help-box">
              <h3 id="help-w2-t">БИО-БАШНИ И НЕЙРОСЕТЬ</h3>
              <p id="help-w2-p">Удерживайте область вокруг башни без врагов, чтобы заполнить её своей энергией (~3 с) и получить бафф (Генератор +HP, Усилитель замедляет таяние и +урон, Магнит +сбор, Мутаген +карта, Инкубатор +XP). Захваченная башня получает <b>био-щит на 18 с</b>: её нельзя слить, пока щит активен. После щита башню защищает гарнизон - одиночные монстры почти бессильны, опасна только толпа. Войдите в башню, чтобы восстановить её энергию. 2+ своих башни образуют нейросеть.</p>
            </div>
            <div class="help-box">
              <h3 id="help-w3-t">РАДАР И АНОМАЛИИ</h3>
              <p id="help-w3-p">Чашка Петри в углу отслеживает рой, элитных особей, стражей цикла, Титанов, башни (включая тревогу при их штурме) и аномалии: Кислотный прилив, Гнездо спор и Вспышку митоза.</p>
            </div>
            <div class="help-box">
              <h3 id="help-w4-t">РЕЗОНАНС И БИОЛАБ</h3>
              <p id="help-w4-p">Быстрый сбор сфер ДНК разгоняет <b>Симбиотический Резонанс</b> до x3.0 опыта и биомассы. 2+ оружия одного генома дают <b>Резонанс генома</b>: Вермис +урон хлыста, Химера +урон, Мицелий +регенерация, Симбионт +скорость атаки. В Биолабе можно покупать модули и включать/отключать их (лимит 4 слота).</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="help-close" class="modal-close-btn" type="button">ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
`;
}
