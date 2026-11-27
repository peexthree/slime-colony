// Виджет «Охота за Гибридом» (режим Охоты за Гибридом): мини-панель прогресса
// сборки шести Великих Гибридов в окне выбора мутации. Для каждого гибрида
// показывает текущие ДНК-уровни родительских веток в формате
// "2/3 ВЕРМИС + 3/3 ХИМЕРА -> ПЛАЗМЕННЫЙ ЛЕВИАФАН", два прогресс-бара веток
// и подсветку готовых к сборке; уже взятые гибриды (hybridsTaken) гасятся.
// Виджет создаётся программно (без правки screens/** и styles/**), стили -
// одна маленькая CSS-строка, инъекция один раз в document.head.
// Чистая логика (расчёт прогресса пары геномов и текст) вынесена в
// экспортируемые функции без DOM - их покрывают юнит-тесты
// src/game/__tests__/hybridHunt.test.ts.
import { DNA_LEVELS, HYBRIDS } from '../engine/types';
import type { DnaBranch, HybridDef, HybridId } from '../engine/types';
import type { RunState } from '../game/state';
import { dnaLvl } from '../game/state';
import type { Ctx } from '../game/context';
import { t } from '../i18n';
import { dnaName, hybridName } from '../i18n/gameData';

/** Цвета веток ДНК для мини-баров (hex-строки, соответствуют палитре HUD) */
const BRANCH_CSS: Record<DnaBranch, string> = {
  vermis: '#66fcf1',
  chimera: '#ff7b93',
  mycelium: '#a3ff6b',
  symbiont: '#ffd166',
};

/** Фирменные цвета Великих Гибридов - те же, что на золотых картах в upgrades.ts */
const HYBRID_CSS: Record<HybridId, string> = {
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

/** Компактные стили виджета: одна строка, инъекция один раз (не зависим от src/styles) */
const WIDGET_CSS = [
  '#hybrid-hunt{width:min(880px,96%);display:flex;flex-direction:column;gap:4px;',
  'padding:7px 10px 8px;border:1px solid rgba(255,209,102,0.28);border-radius:9px;background:rgba(4,10,18,0.6);}',
  '#hybrid-hunt .hh-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;',
  'font-size:10px;font-weight:800;letter-spacing:0.14em;color:#ffd166;}',
  '#hybrid-hunt .hh-count{color:#c3d4e3;font-weight:600;letter-spacing:0.08em;}',
  '#hybrid-hunt .hh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:3px 16px;}',
  '#hybrid-hunt .hh-row{display:flex;align-items:center;gap:7px;min-width:0;padding:3px 5px;border-radius:5px;',
  'font-size:10px;color:#c3d4e3;overflow:hidden;}',
  '#hybrid-hunt .hh-row.hh-ready{background:rgba(255,209,102,0.12);box-shadow:inset 0 0 0 1px rgba(255,209,102,0.5);}',
  '#hybrid-hunt .hh-row.hh-taken{opacity:0.38;}',
  '#hybrid-hunt .hh-row.hh-taken .hh-name{text-decoration:line-through;}',
  '#hybrid-hunt .hh-ico{width:15px;height:15px;flex-shrink:0;filter:drop-shadow(0 0 4px rgba(0,0,0,0.6));}',
  '#hybrid-hunt .hh-pair{white-space:nowrap;color:#9ab0c4;flex-shrink:0;}',
  '#hybrid-hunt .hh-name{font-weight:800;letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#hybrid-hunt .hh-bars{display:flex;flex-direction:column;gap:2px;margin-left:auto;flex-shrink:0;}',
  '#hybrid-hunt .hh-bar{width:46px;height:3px;border-radius:2px;background:rgba(255,255,255,0.12);overflow:hidden;}',
  '#hybrid-hunt .hh-bar i{display:block;height:100%;border-radius:2px;}',
  '#hybrid-hunt .hh-status{flex-shrink:0;font-size:9px;font-weight:800;letter-spacing:0.08em;color:#9ab0c4;}',
  '#hybrid-hunt .hh-status.hh-ready{color:#ffd166;text-shadow:0 0 8px rgba(255,209,102,0.6);}',
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

/** HTML одной строки виджета: иконка, пара "a/3 + b/3 ->", имя, бары, статус */
function rowHtml(st: HybridPairState): string {
  const h = HYBRIDS.find((x) => x.id === st.id)!;
  const aName = dnaName(h.a);
  const bName = dnaName(h.b);
  const name = hybridName(st.id);
  const slug = st.id.replace(/_/g, '-');
  const color = HYBRID_CSS[st.id] ?? '#ffd166';
  const cls = st.taken ? 'hh-taken' : st.ready ? 'hh-ready' : '';
  // Пара через канонический форматтер (без имени гибрида - имя в своём span)
  const pair = `${hybridPairText(st, aName, bName, '')} ->`;
  const status = st.taken ? t('hunt_taken') : st.ready ? t('hunt_ready') : t('hunt_need');
  const bars = [
    { frac: st.aFrac, css: BRANCH_CSS[h.a] },
    { frac: st.bFrac, css: BRANCH_CSS[h.b] },
  ]
    .map(
      (bar) =>
        `<span class="hh-bar"><i style="width:${(bar.frac * 100).toFixed(1)}%;background:${bar.css}"></i></span>`,
    )
    .join('');
  return (
    `<div class="hh-row ${cls}">` +
    `<svg class="hh-ico" style="color:${color}" viewBox="0 0 48 48" aria-hidden="true"><use href="#ico-hybrid-${slug}"/></svg>` +
    `<span class="hh-pair">${pair}</span>` +
    `<span class="hh-name" style="color:${color}">${name}</span>` +
    `<span class="hh-bars">${bars}</span>` +
    `<span class="hh-status ${st.ready && !st.taken ? 'hh-ready' : ''}">${status}</span>` +
    `</div>`
  );
}

/** Ссылка на смонтированный виджет (живёт весь забег, обновляется in-place) */
let widgetEl: HTMLElement | null = null;

/**
 * Построить/обновить виджет охоты за гибридами.
 * Вызывается из openUpgrades перед показом окна: каждое открытие окна
 * апгрейдов и каждое переоткрытие после выбора карты / реролла обновляют
 * прогресс по текущему состоянию забега.
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
    `<div class="hh-head"><span>${t('hunt_title')}</span>` +
    `<span class="hh-count">${t('hunt_ready_n', { n: readyCount })}</span></div>` +
    `<div class="hh-grid">${states.map(rowHtml).join('')}</div>`;
}
