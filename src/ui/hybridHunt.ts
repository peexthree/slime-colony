// Виджет «Схема мутаций» (бывшая «Охота за Гибридом»): центральный блок шапки
// окна выбора мутаций. Сетка 6 Великих Гибридов 3x2: для каждого гибрида -
// иконка, имя, статус и две строки родителей с ДНК-уровнями в формате
// "2/3 ВЕРМИС" и прогресс-барами веток; готовые к сборке светятся золотом,
// уже взятые гибриды (hybridsTaken) гасятся. Каноническая строка пары
// "2/3 ВЕРМИС + 3/3 ХИМЕРА -> ПЛАЗМЕННЫЙ ЛЕВИАФАН" сохраняется в футере ячейки.
// Виджет создаётся программно (без правки screens/**), стили - одна CSS-строка,
// инъекция один раз в document.head. Чистая логика (расчёт прогресса пары
// геномов и текст) вынесена в экспортируемые функции без DOM - их покрывают
// юнит-тесты src/game/__tests__/hybridHunt.test.ts.
import { DNA_LEVELS, HYBRIDS } from '../engine/types';
import type { DnaBranch, HybridDef, HybridId } from '../engine/types';
import type { RunState } from '../game/state';
import { dnaLvl } from '../game/state';
import type { Ctx } from '../game/context';
import { t } from '../i18n';
import { dnaName, hybridName } from '../i18n/gameData';

/** Цвета веток ДНК для баров/чипов (hex-строки, соответствуют палитре HUD) */
export const BRANCH_CSS: Record<DnaBranch, string> = {
  vermis: '#66fcf1',
  chimera: '#ff7b93',
  mycelium: '#a3ff6b',
  symbiont: '#ffd166',
};

/** Фирменные цвета Великих Гибридов - те же, что на золотых картах в upgrades.ts */
export const HYBRID_CSS: Record<HybridId, string> = {
  plasma_leviathan: '#ff6b2b',
  ouroboros: '#00ff9d',
  phase_serpent: '#66fcf1',
  spore_reactor: '#39ff14',
  ion_colossus: '#ffb800',
  psi_web: '#b55cff',
};

// ============================ ЧИСТАЯ ЛОГИКА (без DOM) ============================

/** Состояние сборки одного гибрида: уровни и прогресс родительских веток */
export interface HybridPairState {
  id: HybridId;
  /** ДНК-уровень ветки A (0..3) */
  aLvl: number;
  /** ДНК-уровень ветки B (0..3) */
  bLvl: number;
  /** Доля прогресса внутри текущего уровня ветки A (0..1, на 3-м уровне 1) */
  aFrac: number;
  /** Доля прогресса внутри текущего уровня ветки B (0..1, на 3-м уровне 1) */
  bFrac: number;
  /** Обе ветки на 3+ уровне и гибрид ещё не собран: карта слияния доступна */
  ready: boolean;
  /** Гибрид уже взят в этом забеге (state.hybridsTaken) */
  taken: boolean;
}

/** Прогресс ветки ДНК: уровень 0..3 и доля внутри текущего уровня 0..1.
 *  Пороги уровней - DNA_LEVELS из engine/types, как в updateDnaHud. */
export function branchLevelFrac(ctx: RunState, b: DnaBranch): { lvl: number; frac: number } {
  const lvl = dnaLvl(ctx, b);
  const cur = ctx.dnaXp[b];
  const prev = lvl === 0 ? 0 : DNA_LEVELS[lvl - 1];
  const next = lvl >= 3 ? DNA_LEVELS[2] : DNA_LEVELS[lvl];
  const frac = lvl >= 3 ? 1 : Math.max(0, Math.min(1, (cur - prev) / Math.max(1, next - prev)));
  return { lvl, frac };
}

/** Состояние сборки гибрида по состоянию забега */
export function hybridPairState(ctx: RunState, h: HybridDef): HybridPairState {
  const a = branchLevelFrac(ctx, h.a);
  const b = branchLevelFrac(ctx, h.b);
  const taken = ctx.hybridsTaken.has(h.id);
  return {
    id: h.id,
    aLvl: a.lvl,
    bLvl: b.lvl,
    aFrac: a.frac,
    bFrac: b.frac,
    ready: a.lvl >= 3 && b.lvl >= 3 && !taken,
    taken,
  };
}

/** Канонический текст пары геномов: "2/3 ВЕРМИС + 3/3 ХИМЕРА -> ПЛАЗМЕННЫЙ ЛЕВИАФАН".
 *  Пустое имя гибрида убирает хвост "-> ..." (используется виджетом для split-раскладки). */
export function hybridPairText(st: HybridPairState, aName: string, bName: string, hybridTitle: string): string {
  const tail = hybridTitle ? ` -> ${hybridTitle}` : '';
  return `${st.aLvl}/3 ${aName} + ${st.bLvl}/3 ${bName}${tail}`;
}

// ============================ DOM-ВИДЖЕТ ============================

/** Общая доля прогресса ветки к уровню 3: (уровень + доля внутри уровня) / 3 */
function branchPct(lvl: number, frac: number): number {
  return ((lvl + frac) / 3) * 100;
}

/** Компактные стили виджета: одна строка, инъекция один раз (не зависим от src/styles) */
const WIDGET_CSS = [
  '#hybrid-hunt{width:min(1080px,96%);display:flex;flex-direction:column;gap:9px;',
  'padding:11px 14px 12px;border:1px solid rgba(255,209,102,0.34);border-radius:12px;',
  'background:linear-gradient(160deg,rgba(24,17,5,0.5),rgba(4,10,18,0.62));}',
  '#hybrid-hunt .hh-head{display:flex;align-items:center;gap:10px;',
  'font-size:12.5px;font-weight:800;letter-spacing:0.14em;color:#ffd166;}',
  '#hybrid-hunt .hh-title{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;}',
  '#hybrid-hunt .hh-title svg{width:17px;height:17px;filter:drop-shadow(0 0 6px currentColor);}',
  '#hybrid-hunt .hh-hint{flex:1;min-width:0;font-size:10.5px;font-weight:600;letter-spacing:0.05em;',
  'color:#9ab0c4;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#hybrid-hunt .hh-count{flex-shrink:0;font-size:10.5px;font-weight:800;letter-spacing:0.06em;',
  'color:#ffd166;background:rgba(255,209,102,0.12);border:1px solid rgba(255,209,102,0.4);',
  'padding:2px 10px;border-radius:99px;}',
  '#hybrid-hunt .hh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}',
  '@media (max-width:900px){#hybrid-hunt .hh-grid{grid-template-columns:1fr;}}',
  '#hybrid-hunt .hh-cell{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px 10px;',
  'border-radius:9px;background:rgba(6,13,22,0.74);border:1px solid rgba(148,163,184,0.22);}',
  '#hybrid-hunt .hh-cell.hh-ready{background:rgba(36,26,6,0.82);border-color:rgba(255,209,102,0.7);',
  'box-shadow:0 0 16px rgba(255,209,102,0.2),inset 0 0 16px rgba(255,209,102,0.08);}',
  '#hybrid-hunt .hh-cell.hh-taken{opacity:0.4;}',
  '#hybrid-hunt .hh-cell.hh-taken .hh-name{text-decoration:line-through;}',
  '#hybrid-hunt .hh-cell-head{display:flex;align-items:center;gap:8px;min-width:0;}',
  '#hybrid-hunt .hh-ico{width:22px;height:22px;flex-shrink:0;filter:drop-shadow(0 0 6px currentColor);}',
  '#hybrid-hunt .hh-name{flex:1;min-width:0;font-size:11.5px;font-weight:800;letter-spacing:0.03em;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#hybrid-hunt .hh-status{flex-shrink:0;font-size:9px;font-weight:800;letter-spacing:0.06em;',
  'color:#9ab0c4;white-space:nowrap;}',
  '#hybrid-hunt .hh-status.hh-ready{color:#ffd166;text-shadow:0 0 8px rgba(255,209,102,0.6);}',
  '#hybrid-hunt .hh-parents{display:flex;flex-direction:column;gap:4px;}',
  '#hybrid-hunt .hh-parent{display:flex;align-items:center;gap:7px;font-size:10px;color:#c3d4e3;min-width:0;}',
  '#hybrid-hunt .hh-pico{width:13px;height:13px;flex-shrink:0;filter:drop-shadow(0 0 3px currentColor);}',
  '#hybrid-hunt .hh-pname{width:78px;flex-shrink:0;font-weight:700;letter-spacing:0.05em;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#hybrid-hunt .hh-plvl{flex-shrink:0;width:28px;font-weight:800;}',
  '#hybrid-hunt .hh-bar{flex:1;min-width:20px;height:5px;border-radius:3px;',
  'background:rgba(255,255,255,0.1);overflow:hidden;}',
  '#hybrid-hunt .hh-bar i{display:block;height:100%;border-radius:3px;}',
  '#hybrid-hunt .hh-pair{font-size:9px;letter-spacing:0.04em;color:#7e93a8;min-width:0;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
  'border-top:1px dashed rgba(148,163,184,0.2);padding-top:5px;}',
  '#hybrid-hunt .hh-pair.hh-ready{color:#ffd166;}',
].join('');

let styleInjected = false;

/** Однократная инъекция стилей виджета в head */
function ensureStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.id = 'hybrid-hunt-style';
  style.textContent = WIDGET_CSS;
  document.head.appendChild(style);
}

/** HTML одной ячейки схемы: шапка (иконка+имя+статус), две строки родителей
 *  с барами и каноническая строка пары в футере */
function cellHtml(st: HybridPairState): string {
  const h = HYBRIDS.find((x) => x.id === st.id)!;
  const aName = dnaName(h.a);
  const bName = dnaName(h.b);
  const name = hybridName(st.id);
  const slug = st.id.replace(/_/g, '-');
  const color = HYBRID_CSS[st.id] ?? '#ffd166';
  const cls = st.taken ? 'hh-taken' : st.ready ? 'hh-ready' : '';
  const status = st.taken ? t('hunt_taken') : st.ready ? t('hunt_ready') : t('hunt_need');
  // Каноническая строка пары сохраняется целиком (чистый hybridPairText)
  const pair = hybridPairText(st, aName, bName, name);
  const parents = [
    { branch: h.a, lvl: st.aLvl, frac: st.aFrac, name: aName },
    { branch: h.b, lvl: st.bLvl, frac: st.bFrac, name: bName },
  ]
    .map((p) => {
      const css = BRANCH_CSS[p.branch];
      const pct = branchPct(p.lvl, p.frac).toFixed(1);
      return (
        `<div class="hh-parent">` +
        `<svg class="hh-pico" style="color:${css}" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-${p.branch}"/></svg>` +
        `<span class="hh-pname">${p.name}</span>` +
        `<span class="hh-plvl" style="color:${css}">${p.lvl}/3</span>` +
        `<span class="hh-bar"><i style="width:${pct}%;background:${css};box-shadow:0 0 6px ${css}"></i></span>` +
        `</div>`
      );
    })
    .join('');
  return (
    `<div class="hh-cell ${cls}" data-hybrid="${slug}">` +
    `<div class="hh-cell-head">` +
    `<svg class="hh-ico" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${slug}"/></svg>` +
    `<span class="hh-name" style="color:${color}">${name}</span>` +
    `<span class="hh-status ${st.ready && !st.taken ? 'hh-ready' : ''}">${status}</span>` +
    `</div>` +
    `<div class="hh-parents">${parents}</div>` +
    `<div class="hh-pair ${st.ready && !st.taken ? 'hh-ready' : ''}">${pair}</div>` +
    `</div>`
  );
}

/** Ссылка на смонтированный виджет (живёт весь забег, обновляется in-place) */
let widgetEl: HTMLElement | null = null;

/**
 * Построить/обновить виджет «Схема мутаций» в шапке окна выбора мутаций
 * (перед сеткой карточек). Вызывается из openUpgrades перед показом окна:
 * каждое открытие окна апгрейдов и каждое переоткрытие после выбора карты /
 * реролла обновляют прогресс по текущему состоянию забега.
 */
export function renderHybridHunt(ctx: Ctx): void {
  const { upgradeModal, cardsEl } = ctx.dom;
  if (!widgetEl || !widgetEl.isConnected) {
    ensureStyle();
    widgetEl = document.createElement('div');
    widgetEl.id = 'hybrid-hunt';
    // Вставляем между заголовком окна и карточками выбора
    upgradeModal.insertBefore(widgetEl, cardsEl);
  }
  const states = HYBRIDS.map((h) => hybridPairState(ctx, h));
  const readyCount = states.filter((s) => s.ready).length;
  widgetEl.title = t('hunt_hint');
  widgetEl.innerHTML =
    `<div class="hh-head">` +
    `<span class="hh-title"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-ach-hybrid"/></svg>${t('mutations_scheme')}</span>` +
    `<span class="hh-hint">${t('mutations_scheme_hint')}</span>` +
    `<span class="hh-count">${t('hunt_ready_n', { n: readyCount })}</span>` +
    `</div>` +
    `<div class="hh-grid">${states.map(cellHtml).join('')}</div>`;
}
