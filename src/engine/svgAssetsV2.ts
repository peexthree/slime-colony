// svgAssetsV2.ts — Pack v2 (Wave 2): 5 недостающих врагов + Ядро/Шип игрока + UI-строки
import { Texture } from 'pixi.js';
import { svgToTexture } from './svgAssets';

export const HYBRID_EMBLEMS = {
  plasmaLeviathan: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Внешнее кольцо аннигиляции -->
  <circle cx="24" cy="24" r="18.5" stroke="currentColor" stroke-width="1.6" stroke-dasharray="10 4 3 4" stroke-linecap="round" stroke-opacity="0.72" vector-effect="non-scaling-stroke"/>
  <!-- Плазменный гребень и тело левиафана -->
  <path d="M13 33C9.5 27.5 10.5 18 17 13.5C21 10.8 25.5 10.5 29.5 12.5L35 8.5L33.5 15.5C38 19.5 39 27.5 34.5 33.5C30.5 38.8 22.5 40 16.5 36.5" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Внутренние спинные шипы пламени -->
  <path d="M14 16L11 11.5M20 11.5L19.5 6.5M37 22L42 20.5M35.5 30.5L40 33.5M12 27.5L7.5 29.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Раскрытые плазменные жвала и ядро -->
  <path d="M24 16.5C27.2 19.8 29.5 22.8 28.5 27.2C27.8 30.2 25.5 31.8 24 31.8C22.5 31.8 20.2 30.2 19.5 27.2C18.5 22.8 20.8 19.8 24 16.5Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="26" r="2.6" fill="currentColor"/>
  <path d="M24 31.8V36.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  ouroboros: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Тело змея-уробороса -->
  <path d="M28 9.2A15.4 15.4 0 1 1 18.5 9.8" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M29 14.2A10.4 10.4 0 1 1 18.8 14.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6" vector-effect="non-scaling-stroke"/>
  <!-- Голова паразита, заглатывающая хвост в верхней точке -->
  <path d="M24.5 5.2L31.5 9.2L26.2 14.2L22.5 11.2L24.5 5.2Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M18.5 9.8L23 9.5M16 12.2L19.2 14.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Сегментные насечки хитина по кольцу -->
  <path d="M38.5 20.5L34.2 21.8M36.8 32.5L33 29.8M24 39.5V35M11.2 32.5L15 29.8M9.5 20.5L13.8 21.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Символ бесконечной био-регенерации в центре -->
  <path d="M19.5 24C19.5 21.8 22.2 21.8 24 24C25.8 26.2 28.5 26.2 28.5 24C28.5 21.8 25.8 21.8 24 24C22.2 26.2 19.5 26.2 19.5 24Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="24" r="1.6" fill="currentColor"/>
</svg>`,
  phaseSerpent: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Гравитационные дуги портала -->
  <path d="M24 6.5C34 6.5 41.5 14 41.5 24C41.5 31.2 36.8 37.5 30 39.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
  <path d="M24 41.5C14 41.5 6.5 34 6.5 24C6.5 16.8 11.2 10.5 18 8.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
  <!-- Спиральный вихрь фазового змея -->
  <path d="M12.5 24C12.5 17 18.2 12 25 12.5C31.5 13 35.8 18.2 35.2 24.8C34.6 31.2 28.8 35.2 22.8 34.4C17.5 33.6 15.2 28.8 16.6 24.2C17.8 20.2 21.8 18.4 25.4 19.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Клиновидная голова фазового змея -->
  <path d="M35.5 12L31 19.5L26 15.5L35.5 12Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Сингулярность портала и фазовые осколки -->
  <polygon points="24,19.5 28.5,24 24,28.5 19.5,24" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="24" r="2" fill="currentColor"/>
  <circle cx="11" cy="14" r="1.4" fill="currentColor"/>
  <circle cx="37" cy="34" r="1.4" fill="currentColor"/>
</svg>`,
  sporeReactor: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Внешнее кольцо сдерживания -->
  <circle cx="24" cy="24" r="19" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <!-- 3 споровых сектора реактора -->
  <path d="M24 19.2L17.2 8.8A16.5 16.5 0 0 1 30.8 8.8L24 19.2Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M28.2 26.4L40.5 25.8A16.5 16.5 0 0 1 33.8 37.5L28.2 26.4Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M19.8 26.4L14.2 37.5A16.5 16.5 0 0 1 7.5 25.8L19.8 26.4Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Споровые пустулы в межсекторных зонах -->
  <circle cx="11.5" cy="17.5" r="2.4" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <circle cx="36.5" cy="17.5" r="2.4" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="39" r="2.4" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <!-- Центральная активная зона -->
  <circle cx="24" cy="24" r="5" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.9" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="24" r="2" fill="currentColor"/>
</svg>`,
  ionColossus: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Внешние бронированные плечи колосса -->
  <polygon points="24,5 39,13.5 39,34.5 24,43 9,34.5 9,13.5" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Тесла-рога и боковые разрядники -->
  <path d="M9 13.5L4.5 10.5M39 13.5L43.5 10.5M9 34.5L4.5 37.5M39 34.5L43.5 37.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Дуговые молнии вокруг ядра -->
  <path d="M13 24L17 20L15.5 25L19 23M35 24L31 20L32.5 25L29 23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Центральный ионный разряд -->
  <path d="M26.5 10.5L19.5 24.5H24.5L21.5 37.5L28.5 23.5H23.5L26.5 10.5Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <!-- Силовые узлы-конденсаторы -->
  <circle cx="24" cy="5" r="2" fill="currentColor"/>
  <circle cx="24" cy="43" r="2" fill="currentColor"/>
</svg>`,
  psiWeb: `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Внешние синаптические связи -->
  <path d="M24 7L38 15L38 33L24 41L10 33L10 15L24 7Z" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.55" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M24 7V17M38 15L29.5 20.5M38 33L29.5 27.5M24 41V31M10 33L18.5 27.5M10 15L18.5 20.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Псионическое полушарие / центральный нейрон -->
  <path d="M24 16C28.8 16 32 19.5 32 24C32 28.5 28.8 32 24 32C19.2 32 16 28.5 16 24C16 19.5 19.2 16 24 16Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.9" vector-effect="non-scaling-stroke"/>
  <!-- Извилины и глаз сверхразума -->
  <path d="M18.5 24C20.5 21 27.5 21 29.5 24C27.5 27 20.5 27 18.5 24Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="24" cy="24" r="2.2" fill="currentColor"/>
  <!-- 6 периферийных синапсов -->
  <circle cx="24" cy="7" r="2.3" fill="currentColor"/>
  <circle cx="38" cy="15" r="2.3" fill="currentColor"/>
  <circle cx="38" cy="33" r="2.3" fill="currentColor"/>
  <circle cx="24" cy="41" r="2.3" fill="currentColor"/>
  <circle cx="10" cy="33" r="2.3" fill="currentColor"/>
  <circle cx="10" cy="15" r="2.3" fill="currentColor"/>
</svg>`
} as const;

export const STAT_ICONS = {
  timer: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.5 4H19.5M16 4V7.5M23.5 9L25.8 6.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="18" r="10.2" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
  <path d="M16 11.2V18L20.8 20.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="18" r="1.6" fill="currentColor"/>
  <path d="M16 9.8V10.8M24.2 18H23.2M16 26.2V25.2M7.8 18H8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
</svg>`,
  skullHazard: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 4.5C9.8 4.5 6 8.8 6 14.5C6 18.2 8 21 10.5 22.4V26.2C10.5 27 11.2 27.5 12 27.5H20C20.8 27.5 21.5 27 21.5 26.2V22.4C24 21 26 18.2 26 14.5C26 8.8 22.2 4.5 16 4.5Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <polygon points="10.2,14.5 14,13.5 13.4,17 10.6,17" fill="currentColor"/>
  <polygon points="21.8,14.5 18,13.5 18.6,17 21.4,17" fill="currentColor"/>
  <path d="M16 18.5L14.8 21H17.2L16 18.5Z" fill="currentColor"/>
  <path d="M13.5 24.5V27.5M16 24.5V27.5M18.5 24.5V27.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  tailLength: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7.5 24.5C12.5 24.5 12 17.5 16 16C20 14.5 19.5 7.5 24.5 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <circle cx="24.5" cy="7.5" r="3.4" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
  <circle cx="24.5" cy="7.5" r="1.2" fill="currentColor"/>
  <circle cx="19.8" cy="12.5" r="2.8" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.7" vector-effect="non-scaling-stroke"/>
  <circle cx="15" cy="17.2" r="2.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.7" vector-effect="non-scaling-stroke"/>
  <circle cx="10.4" cy="22" r="2.1" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
  <path d="M8.5 24L5 27" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  nodeDominance: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,4.5 26,10.2 26,21.8 16,27.5 6,21.8 6,10.2" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M16 4.5V12.5M26 21.8L19 17.8M6 21.8L13 17.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <polygon points="16,12 19.6,14 19.6,18 16,20 12.4,18 12.4,14" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="4.5" r="1.8" fill="currentColor"/>
  <circle cx="26" cy="21.8" r="1.8" fill="currentColor"/>
  <circle cx="6" cy="21.8" r="1.8" fill="currentColor"/>
</svg>`,
  macroScale: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,4 28,25.5 4,25.5" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <polygon points="16,25.5 22,14.8 10,14.8" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <polygon points="16,14.8 19,20 13,20" fill="currentColor"/>
  <path d="M16 4V11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
</svg>`,
  damageNova: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,3.5 19,11.2 27,7 22,14.2 29,17.5 21.2,19.8 24.5,27.5 16.8,22.5 12.5,28.5 11.8,20.5 4,21.5 9.8,15.2 5.2,8.2 13,11.4" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16.2" r="2.8" fill="currentColor"/>
</svg>`,
  recordBadge: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,3.5 19.6,11.2 28,12.2 21.8,18 23.4,26.5 16,22.2 8.6,26.5 10.2,18 4,12.2 12.4,11.2" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <polygon points="16,10 18.2,14.6 22.8,15.2 19.4,18.4 20.2,23 16,20.6 11.8,23 12.6,18.4 9.2,15.2 13.8,14.6" fill="currentColor"/>
  <path d="M16 25.5V29M11.5 28L16 26.5L20.5 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`
} as const;

export const CONTROL_ICONS = {
  biolab: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="11.5" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16" r="8.6" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <circle cx="13.2" cy="14" r="2.8" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <circle cx="13.2" cy="14" r="1" fill="currentColor"/>
  <circle cx="19.5" cy="18.2" r="2.3" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <circle cx="19.2" cy="12" r="1.4" fill="currentColor"/>
  <circle cx="12.8" cy="20.4" r="1.3" fill="currentColor"/>
</svg>`,
  cameraDna: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 10.5V6.5C4.5 5.4 5.4 4.5 6.5 4.5H10.5M21.5 4.5H25.5C26.6 4.5 27.5 5.4 27.5 6.5V10.5M27.5 21.5V25.5C27.5 26.6 26.6 27.5 25.5 27.5H21.5M10.5 27.5H6.5C5.4 27.5 4.5 26.6 4.5 25.5V21.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M12.2 8.8C12.2 12.8 19.8 13.2 19.8 16C19.8 18.8 12.2 19.2 12.2 23.2M19.8 8.8C19.8 12.8 12.2 13.2 12.2 16C12.2 18.8 19.8 19.2 19.8 23.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M13 10.8H19M13 21.2H19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.75" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16" r="1.4" fill="currentColor"/>
</svg>`,
  soundOn: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 12.5H9.5L16.5 7V25L9.5 19.5H5C4.4 19.5 4 19.1 4 18.5V13.5C4 12.9 4.4 12.5 5 12.5Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M20.5 11.8C22.4 13.8 22.4 18.2 20.5 20.2M24 8.5C27.5 12.5 27.5 19.5 24 23.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  soundMute: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 12.5H9.5L16.5 7V25L9.5 19.5H5C4.4 19.5 4 19.1 4 18.5V13.5C4 12.9 4.4 12.5 5 12.5Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M21 12.5L27.5 19M27.5 12.5L21 19" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  pause: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.5 7.5L10.5 5.5H13.5V26.5H10.5L8.5 24.5V7.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M18.5 5.5H21.5L23.5 7.5V24.5L21.5 26.5H18.5V5.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  play: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 6.5L26 16L9 25.5L11.5 16L9 6.5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="15.5" cy="16" r="1.8" fill="currentColor"/>
</svg>`,
  fullscreen: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 11.5V6.5L6.5 4.5H11.5M20.5 4.5H25.5L27.5 6.5V11.5M27.5 20.5V25.5L25.5 27.5H20.5M11.5 27.5H6.5L4.5 25.5V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M11 11L6.5 6.5M21 11L25.5 6.5M21 21L25.5 25.5M11 21L6.5 25.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16" r="2.2" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
</svg>`
} as const;

export const EVENT_ICONS = {
  waveTide: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3.5 20.5C7 20.5 9.5 17 12.2 12.5C14.8 8.2 19.5 6.5 23.8 8.2C26.5 9.2 27.5 11.8 25.5 13.8C23.8 15.5 21 14.5 21 12.5C21 11.5 21.8 11 22.6 11.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M3.5 20.5C8 20.5 11 23 15.8 23C20.5 23 24 20.5 28.5 20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M5.5 26C9.5 26 12.5 27.5 16.5 27.5C20.5 27.5 23.5 26 27 26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
  <circle cx="12" cy="8" r="1.4" fill="currentColor"/>
  <circle cx="8" cy="12" r="1.1" fill="currentColor" fill-opacity="0.8"/>
</svg>`,
  ambush: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="10.5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3.5 3.5" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16" r="3" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.7" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="16" r="1.1" fill="currentColor"/>
  <path d="M5 5L11.5 11.5M11.5 7.5V11.5H7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M27 5L20.5 11.5M20.5 7.5V11.5H24.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M27 27L20.5 20.5M20.5 24.5V20.5H24.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M5 27L11.5 20.5M11.5 24.5V20.5H7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  fury: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.5 11L13.5 14.8L11.5 18L5.5 14.5V11Z" fill="currentColor"/>
  <path d="M26.5 11L18.5 14.8L20.5 18L26.5 14.5V11Z" fill="currentColor"/>
  <path d="M4.5 7.5L13 12.2M27.5 7.5L19 12.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M7.5 21.5L11 26.5L14 22L16 26.5L18 22L21 26.5L24.5 21.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M16 4V8.5M10 5L11.5 7.5M22 5L20.5 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`,
  feast: `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="17.5" r="7.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
  <circle cx="13.5" cy="16" r="2.2" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
  <circle cx="18.6" cy="19.2" r="2.4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
  <circle cx="18.2" cy="14" r="1.3" fill="currentColor"/>
  <path d="M16 10V5M11.5 11.5L8 7.5M20.5 11.5L24 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="4.5" r="1.6" fill="currentColor"/>
  <circle cx="7.5" cy="7" r="1.4" fill="currentColor"/>
  <circle cx="24.5" cy="7" r="1.4" fill="currentColor"/>
</svg>`
} as const;

export const ENEMY_SPRITES_V2 = {
  healer: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="healer-aura" cx="50%" cy="44%" r="52%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.82"/>
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="healer-bell" x1="64" y1="14" x2="64" y2="76" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="58" r="56" fill="url(#healer-aura)"/>
  <!-- Регенерирующие жгутики медузы -->
  <path d="M36 72C31 86 38 98 30 112" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-opacity="0.68"/>
  <path d="M48 75C44 92 52 104 46 118" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.82"/>
  <path d="M64 76C61 94 67 106 64 120" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-opacity="0.9"/>
  <path d="M80 75C84 92 76 104 82 118" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.82"/>
  <path d="M92 72C97 86 90 98 98 112" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-opacity="0.68"/>
  <!-- Светящиеся капли регенерации на концах -->
  <circle cx="46" cy="118" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="64" cy="120" r="3.4" fill="#FFFFFF"/>
  <circle cx="82" cy="118" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <!-- Купол симбиотической медузы -->
  <path d="M22 62C22 33 40 16 64 16C88 16 106 33 106 62C106 72 95 75 84 73C76 71.5 72 76 64 76C56 76 52 71.5 44 73C33 75 22 72 22 62Z" fill="url(#healer-bell)" stroke="#FFFFFF" stroke-width="3"/>
  <!-- Внутренние рёбра купола -->
  <path d="M64 18C52 32 46 50 45 71M64 18C76 32 82 50 83 71" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.55"/>
  <!-- Изумрудное лечащее ядро (готово к тинту 0x00ff9d) -->
  <circle cx="64" cy="49" r="15" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2.4"/>
  <path d="M64 40V58M55 49H73" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round"/>
</svg>`,
  mirror: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="mirror-aura" cx="54%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mirror-facet" x1="20" y1="22" x2="112" y2="106" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="58" fill="url(#mirror-aura)"/>
  <!-- Передняя призматическая отражающая дуга -->
  <path d="M98 28L118 64L98 100" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95"/>
  <!-- Кристаллический панцирь жука -->
  <polygon points="108,64 78,22 34,30 16,64 34,98 78,106" fill="url(#mirror-facet)" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <!-- Гранёные преломляющие плоскости -->
  <polygon points="108,64 78,22 64,64" fill="#FFFFFF" fill-opacity="0.48"/>
  <polygon points="108,64 64,64 78,106" fill="#FFFFFF" fill-opacity="0.22"/>
  <polygon points="16,64 34,30 64,64" fill="#FFFFFF" fill-opacity="0.18"/>
  <polygon points="16,64 64,64 34,98" fill="#FFFFFF" fill-opacity="0.42"/>
  <!-- Внутренние грани преломления -->
  <path d="M34 30L64 64L78 22M34 98L64 64L78 106M16 64H108" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.88"/>
  <!-- Ядро-призма -->
  <polygon points="84,64 64,48 46,64 64,80" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
  <polygon points="73,64 64,56 55,64 64,72" fill="#FFFFFF"/>
</svg>`,
  colony: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="colony-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.88"/>
      <stop offset="56%" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="61" fill="url(#colony-aura)"/>
  <!-- Внешняя органическая стенка био-гнезда -->
  <path d="M64 11C79 11 91 18 101 29C111 40 117 51 116 66C115 81 107 95 94 105C81 115 68 118 52 115C36 112 22 102 16 86C10 70 11 52 20 37C29 22 46 11 64 11Z" fill="#FFFFFF" fill-opacity="0.24" stroke="#FFFFFF" stroke-width="3.4"/>
  <!-- 6 периферийных яйцевых камер / коконов -->
  <ellipse cx="64" cy="27" rx="11" ry="8.5" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <ellipse cx="96" cy="46" rx="11" ry="8.5" transform="rotate(60 96 46)" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <ellipse cx="96" cy="82" rx="11" ry="8.5" transform="rotate(120 96 82)" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <ellipse cx="64" cy="101" rx="11" ry="8.5" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <ellipse cx="32" cy="82" rx="11" ry="8.5" transform="rotate(60 32 82)" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <ellipse cx="32" cy="46" rx="11" ry="8.5" transform="rotate(120 32 46)" fill="#FFFFFF" fill-opacity="0.58" stroke="#FFFFFF" stroke-width="2.4"/>
  <!-- Эмбрионы внутри камер -->
  <circle cx="64" cy="27" r="3.5" fill="#FFFFFF"/>
  <circle cx="96" cy="46" r="3.5" fill="#FFFFFF"/>
  <circle cx="96" cy="82" r="3.5" fill="#FFFFFF"/>
  <circle cx="64" cy="101" r="3.5" fill="#FFFFFF"/>
  <circle cx="32" cy="82" r="3.5" fill="#FFFFFF"/>
  <circle cx="32" cy="46" r="3.5" fill="#FFFFFF"/>
  <!-- Маточное сердце гнезда -->
  <circle cx="64" cy="64" r="21" fill="#FFFFFF" fill-opacity="0.4" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="64" cy="64" r="11" fill="#FFFFFF"/>
</svg>`,
  splitter: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="split-aura-l" cx="30%" cy="50%" r="36%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="split-aura-r" cx="70%" cy="50%" r="36%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="38" cy="64" r="44" fill="url(#split-aura-l)"/>
  <circle cx="90" cy="64" r="44" fill="url(#split-aura-r)"/>
  <!-- Две головы-мандибулы по краям -->
  <path d="M18 52L7 44M18 76L7 84M110 52L121 44M110 76L121 84" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
  <!-- Восьмёркообразное тело в процессе деления -->
  <path d="M36 28C51 28 55 48 64 48C73 48 77 28 92 28C107 28 116 44 116 64C116 84 107 100 92 100C77 100 73 80 64 80C55 80 51 100 36 100C21 100 12 84 12 64C12 44 21 28 36 28Z" fill="#FFFFFF" fill-opacity="0.32" stroke="#FFFFFF" stroke-width="3.2"/>
  <!-- Нити веретена деления (митоз) -->
  <path d="M40 54C52 57 76 57 88 54M40 64H88M40 74C52 71 76 71 88 74" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.8" stroke-dasharray="4 3"/>
  <!-- Перетяжка разрыва по центру -->
  <path d="M64 40V88" stroke="#FFFFFF" stroke-width="2.4" stroke-dasharray="3 4" stroke-opacity="0.9"/>
  <!-- Два независимых ядра -->
  <circle cx="37" cy="64" r="14" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2.4"/>
  <circle cx="37" cy="64" r="7.5" fill="#FFFFFF"/>
  <circle cx="91" cy="64" r="14" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2.4"/>
  <circle cx="91" cy="64" r="7.5" fill="#FFFFFF"/>
</svg>`,
  brood: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="brood-glow" cx="62%" cy="50%" r="44%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.88"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="38" cy="32" r="24" fill="url(#brood-glow)"/>
  <!-- Микро-жвала -->
  <path d="M49 26L57 23M49 38L57 41" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  <!-- Хвост-жгутик -->
  <path d="M18 32C12 30 9 35 5 32" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.72"/>
  <!-- Тело микро-личинки -->
  <path d="M16 32C18 22 29 18 42 20C50 21.5 54 26 54 32C54 38 50 42.5 42 44C29 46 18 42 16 32Z" fill="#FFFFFF" fill-opacity="0.48" stroke="#FFFFFF" stroke-width="2.4"/>
  <!-- Сегментные полоски и ядро -->
  <path d="M29 22C32 28 32 36 29 42M39 21C42 28 42 36 39 43" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.82"/>
  <circle cx="44" cy="32" r="4.5" fill="#FFFFFF"/>
</svg>`
} as const;

export const PLAYER_SPRITES = {
  projNeedle: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="needle-wake" x1="4" y1="32" x2="60" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="needle-tip" cx="78%" cy="50%" r="36%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="44" cy="32" rx="18" ry="12" fill="url(#needle-tip)"/>
  <!-- Сверхзвуковой шлейф -->
  <path d="M4 32H44" stroke="url(#needle-wake)" stroke-width="4" stroke-linecap="round"/>
  <!-- Зазубренный хитиновый шип -->
  <path d="M60 32L35 21L40 29L18 32L40 35L35 43L60 32Z" fill="#FFFFFF" fill-opacity="0.92"/>
  <!-- Яркая кинетическая жилка -->
  <path d="M56 32H30" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
</svg>`,
  playerNucleus: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="nuc-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="32%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="72%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="62" fill="url(#nuc-glow)"/>
  <!-- Внешняя полупроницаемая липидная мембрана -->
  <circle cx="64" cy="64" r="50" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-width="3.2"/>
  <circle cx="64" cy="64" r="44" stroke="#FFFFFF" stroke-width="1.6" stroke-dasharray="8 6" stroke-opacity="0.65"/>
  <!-- Органелла 1: Митохондрия (верх-лево) с внутренними кристами -->
  <g transform="rotate(-35 41 42)">
    <rect x="28" y="35" width="26" height="13" rx="6.5" fill="#FFFFFF" fill-opacity="0.34" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M32 41.5C34 38 36 45 38.5 41.5C41 38 43 45 45.5 41.5C47.5 38.5 49 43 50.5 41.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <!-- Органелла 2: Митохондрия (низ-право) -->
  <g transform="rotate(142 87 86)">
    <rect x="74" y="79" width="26" height="13" rx="6.5" fill="#FFFFFF" fill-opacity="0.34" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M78 85.5C80 82 82 89 84.5 85.5C87 82 89 89 91.5 85.5C93.5 82.5 95 87 96.5 85.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <!-- Органелла 3: Аппарат Гольджи (дуги справа-сверху и слева-снизу) -->
  <path d="M84 36C91 41 94 49 92 56M79 41C85 45 87 51 86 56" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.78"/>
  <path d="M44 92C37 87 34 79 36 72M49 87C43 83 41 77 42 72" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.78"/>
  <!-- Рибосомы / везикулы -->
  <circle cx="96" cy="64" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="32" cy="64" r="2.8" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="64" cy="28" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="64" cy="100" r="2.8" fill="#FFFFFF" fill-opacity="0.85"/>
  <!-- Ядерная оболочка и скрещённые хромосомы -->
  <circle cx="64" cy="64" r="22" fill="#FFFFFF" fill-opacity="0.32" stroke="#FFFFFF" stroke-width="2.6"/>
  <path d="M55 54C59 59 69 69 73 74M73 54C69 59 59 69 55 74" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-opacity="0.9"/>
  <!-- Центральное светящееся ядрышко -->
  <circle cx="64" cy="64" r="8.5" fill="#FFFFFF"/>
</svg>`
} as const;

export type EnemySpriteV2Key = keyof typeof ENEMY_SPRITES_V2;
export type PlayerSpriteKey = keyof typeof PLAYER_SPRITES;

/**
 * Конвертирует SVG-строку в PixiJS v8 Texture через Data URI.
 * Белый цвет (#FFFFFF) + альфа-градиенты предназначены под sprite.tint.
 */
export const svgToTextureV2 = svgToTexture;

/**
 * Предзагрузка недостающих 5 врагов (healer, mirror, colony, splitter, brood),
 * снаряда projNeedle и ядра playerNucleus. Можно слить с текстурами из Pack v1:
 *   const allEnemies = { ...v1.enemies, ...v2.enemies };
 */
export async function loadBiopunkTexturesV2() {
  const enemies = {} as Record<EnemySpriteV2Key, Texture>;
  const player = {} as Record<PlayerSpriteKey, Texture>;

  await Promise.all([
    ...(Object.keys(ENEMY_SPRITES_V2) as EnemySpriteV2Key[]).map(async (key) => {
      enemies[key] = await svgToTextureV2(ENEMY_SPRITES_V2[key]);
    }),
    ...(Object.keys(PLAYER_SPRITES) as PlayerSpriteKey[]).map(async (key) => {
      player[key] = await svgToTextureV2(PLAYER_SPRITES[key]);
    }),
  ]);

  return { enemies, player };
}
