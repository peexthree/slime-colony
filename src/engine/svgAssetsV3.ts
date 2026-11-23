// svgAssetsV3.ts — Pack v3 (Wave 3): Анатомия хвоста, Глаз хищника, 5 Биомов, VFX, Элита/Щиты
import { Texture, Sprite } from 'pixi.js';
import { svgToTexture } from './svgAssets';

export const TAIL_SPRITES = {
  tailVertebra: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vert-glow" cx="52%" cy="50%" r="46%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="52%" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vert-chitin" x1="20" y1="64" x2="110" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <ellipse cx="64" cy="64" rx="54" ry="44" fill="url(#vert-glow)"/>
  <!-- Задний шарнир-сочленение (стыкуется со следующим сегментом) -->
  <path d="M16 54L30 48V80L16 74C12 72 12 56 16 54Z" fill="#FFFFFF" fill-opacity="0.32" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
  <!-- Верхние и нижние хитиновые рёбра, отогнутые назад -->
  <path d="M84 42C66 20 42 16 20 28C34 32 46 39 54 47" fill="#FFFFFF" fill-opacity="0.28" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M84 86C66 108 42 112 20 100C34 96 46 89 54 81" fill="#FFFFFF" fill-opacity="0.28" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Вторичные микро-рёбра стабилизации -->
  <path d="M62 39C52 29 40 27 29 31M62 89C52 99 40 101 29 97" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-opacity="0.65"/>
  <!-- Основная панцирная пластина позвонка (сустав в +X) -->
  <path d="M32 48L58 37H84L109 53C115 57 115 71 109 75L84 91H58L32 80C27 72 27 56 32 48Z" fill="url(#vert-chitin)" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <!-- Передний замковый паз сочленения -->
  <path d="M98 49C106 54 106 74 98 79" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.8"/>
  <!-- Нервный канал и светящееся ядро сегмента -->
  <path d="M22 64H106" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.65"/>
  <polygon points="88,64 68,52 48,64 68,76" fill="#FFFFFF" fill-opacity="0.6" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
  <circle cx="68" cy="64" r="6.5" fill="#FFFFFF"/>
</svg>`,
  tailStinger: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sting-bulb" cx="28%" cy="50%" r="36%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sting-blade" x1="8" y1="64" x2="112" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.34"/>
    </linearGradient>
  </defs>
  <ellipse cx="42" cy="64" rx="38" ry="26" fill="url(#sting-bulb)"/>
  <!-- Зазубренные плавники хвостового хлыста -->
  <path d="M98 46C84 30 66 28 50 38C64 42 74 47 80 54" fill="#FFFFFF" fill-opacity="0.28" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M98 82C84 98 66 100 50 90C64 86 74 81 80 74" fill="#FFFFFF" fill-opacity="0.28" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
  <!-- Сустав крепления к последнему позвонку (+X) и сужающееся жало (-X) -->
  <path d="M114 50L106 44H86L48 53L10 64L48 75L86 84H106L114 78C119 72 119 56 114 50Z" fill="url(#sting-blade)" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round"/>
  <!-- Колючие боковые гарпуны жала -->
  <path d="M38 56L52 46M38 72L52 82" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  <!-- Биолюминесцентная ампула на конце жала -->
  <ellipse cx="52" cy="64" rx="14" ry="7" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="48" cy="64" r="4.5" fill="#FFFFFF"/>
  <!-- Светящийся кончик иглы -->
  <circle cx="14" cy="64" r="3" fill="#FFFFFF"/>
  <path d="M18 64H108" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.7"/>
</svg>`
} as const;

export const EYE_SPRITES = {
  predatorEye: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="eye-iris" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="52%" stop-color="#FFFFFF" stop-opacity="0.58"/>
      <stop offset="86%" stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.2"/>
    </radialGradient>
    <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="64" cy="64" rx="60" ry="42" fill="url(#eye-glow)"/>
  <!-- Внешняя хитиновая глазница (веки) -->
  <path d="M10 64C26 30 48 22 64 22C80 22 102 30 118 64C102 98 80 106 64 106C48 106 26 98 10 64Z" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-width="3.6" stroke-linejoin="round"/>
  <!-- Складки верхнего и нижнего хитинового века -->
  <path d="M22 44C38 28 90 28 106 44M22 84C38 100 90 100 106 84" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.7"/>
  <!-- Радужка глаза -->
  <circle cx="64" cy="64" r="32" fill="url(#eye-iris)" stroke="#FFFFFF" stroke-width="2.6"/>
  <!-- Радиальные мышечные волокна радужки -->
  <g stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.62">
    <path d="M64 34V43M64 85V94M34 64H43M85 64H94"/>
    <path d="M43 43L49 49M79 79L85 85M85 43L79 49M49 79L43 85"/>
    <path d="M52 36L56 44M72 84L76 92M92 52L84 56M44 72L36 76"/>
    <path d="M76 36L72 44M56 84L52 92M92 76L84 72M44 56L36 52"/>
  </g>
  <!-- Внутреннее кольцо зрачковой зоны -->
  <circle cx="64" cy="64" r="19" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="5 4" stroke-opacity="0.72"/>
  <!-- Влажный блик роговицы -->
  <ellipse cx="48" cy="48" rx="9" ry="5" transform="rotate(-32 48 48)" fill="#FFFFFF" fill-opacity="0.88"/>
  <circle cx="78" cy="76" r="3" fill="#FFFFFF" fill-opacity="0.55"/>
</svg>`,
  predatorPupil: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pupil-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="28" fill="url(#pupil-aura)"/>
  <!-- Внешнее фокусное кольцо зрачка -->
  <circle cx="32" cy="32" r="18" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.65"/>
  <!-- Вертикальный щелевидный зрачок рептилии / хищника -->
  <path d="M32 10C37.8 20 39 26 39 32C39 38 37.8 44 32 54C26.2 44 25 38 25 32C25 26 26.2 20 32 10Z" fill="#05080e" fill-opacity="0.92" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
  <!-- Внутренний светящийся хищный блик в глубине зрачка -->
  <path d="M32 17C34 24 34 40 32 47C30 40 30 24 32 17Z" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="29" cy="25" r="2.2" fill="#FFFFFF"/>
</svg>`
} as const;

export const BIOME_PARALLAX_SPRITES = {
  diatomShell: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="diatom-bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.34"/>
      <stop offset="65%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="122" fill="url(#diatom-bg)"/>
  <!-- 12 кремниевых игл радиолярии -->
  <g stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.72">
    <path d="M128 8V42M128 214V248M8 128H42M214 128H248"/>
    <path d="M43 43L68 68M188 188L213 213M213 43L188 68M68 188L43 213"/>
    <path d="M82 18L95 48M161 208L174 238M238 82L208 95M48 161L18 174"/>
    <path d="M174 18L161 48M95 208L82 238M238 174L208 161M48 95L18 82"/>
  </g>
  <!-- Внешняя зубчатая створка диатомеи -->
  <circle cx="128" cy="128" r="88" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="128" cy="128" r="74" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="6 6" stroke-opacity="0.75"/>
  <!-- Симметричный ребристый каркас -->
  <polygon points="128,44 198,86 198,170 128,212 58,170 58,86" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.75"/>
  <polygon points="128,60 184,94 184,162 128,196 72,162 72,94" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.6"/>
  <!-- Кольцо микропор -->
  <g fill="#FFFFFF" fill-opacity="0.65">
    <circle cx="128" cy="72" r="5"/><circle cx="176" cy="100" r="5"/><circle cx="176" cy="156" r="5"/>
    <circle cx="128" cy="184" r="5"/><circle cx="80" cy="156" r="5"/><circle cx="80" cy="100" r="5"/>
    <circle cx="152" cy="86" r="3.2"/><circle cx="184" cy="128" r="3.2"/><circle cx="152" cy="170" r="3.2"/>
    <circle cx="104" cy="170" r="3.2"/><circle cx="72" cy="128" r="3.2"/><circle cx="104" cy="86" r="3.2"/>
  </g>
  <!-- Центральная вакуоль / камера -->
  <circle cx="128" cy="128" r="32" fill="#FFFFFF" fill-opacity="0.18" stroke="#FFFFFF" stroke-width="2.6"/>
  <circle cx="128" cy="128" r="14" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="128" cy="128" r="5" fill="#FFFFFF"/>
</svg>`,
  capillaryNode: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cap-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="68%" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="118" fill="url(#cap-glow)"/>
  <!-- Коллагеновые перекрёстные волокна -->
  <g stroke="#FFFFFF" stroke-width="1.6" stroke-opacity="0.45" stroke-linecap="round">
    <path d="M18 74C86 92 162 56 238 82"/>
    <path d="M22 184C96 154 168 198 238 168"/>
    <path d="M68 20C96 92 64 166 90 238"/>
    <path d="M186 22C162 94 196 164 164 238"/>
  </g>
  <!-- Магистральные ветвящиеся сосуды капилляров (двойные стенки) -->
  <path d="M26 42C68 78 96 104 128 128C164 154 194 176 232 216" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" stroke-opacity="0.18"/>
  <path d="M26 42C68 78 96 104 128 128C164 154 194 176 232 216" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-opacity="0.82"/>
  <path d="M228 46C188 82 158 106 128 128C92 156 60 184 26 218" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-opacity="0.18"/>
  <path d="M228 46C188 82 158 106 128 128C92 156 60 184 26 218" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="round" stroke-opacity="0.78"/>
  <path d="M128 16C122 58 134 92 128 128C122 166 134 202 128 242" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-opacity="0.15"/>
  <path d="M128 16C122 58 134 92 128 128C122 166 134 202 128 242" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.72"/>
  <!-- Ответвления микрокапилляров -->
  <path d="M84 92C58 102 36 122 18 132M172 94C198 104 220 118 240 128M90 162C72 192 64 214 58 238M168 164C188 188 202 210 210 236" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.65"/>
  <!-- Центральный капиллярный узел и эритроциты в потоке -->
  <circle cx="128" cy="128" r="24" fill="#FFFFFF" fill-opacity="0.22" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="128" cy="128" r="10" fill="#FFFFFF" fill-opacity="0.78"/>
  <circle cx="76" cy="84" r="7" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="182" cy="86" r="6" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="176" cy="168" r="7.5" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="78" cy="172" r="6.5" fill="#FFFFFF" fill-opacity="0.55" stroke="#FFFFFF" stroke-width="2"/>
</svg>`,
  bioValve: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="valve-depth" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="48%" stop-color="#FFFFFF" stop-opacity="0.34"/>
      <stop offset="86%" stop-color="#FFFFFF" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="120" fill="url(#valve-depth)"/>
  <!-- Внешнее мышечное кольцо с радиальными складками -->
  <circle cx="128" cy="128" r="106" stroke="#FFFFFF" stroke-width="3.2" stroke-opacity="0.72"/>
  <circle cx="128" cy="128" r="92" stroke="#FFFFFF" stroke-width="8" stroke-dasharray="14 10" stroke-opacity="0.28"/>
  <circle cx="128" cy="128" r="80" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-width="2.6" stroke-opacity="0.82"/>
  <!-- 3 перекрывающиеся створки био-клапана -->
  <path d="M128 48C164 48 192 72 198 106C174 114 148 114 128 128C114 102 114 74 128 48Z" fill="#FFFFFF" fill-opacity="0.24" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M198 168C180 198 144 212 110 206C116 180 124 156 128 128C156 128 182 142 198 168Z" fill="#FFFFFF" fill-opacity="0.24" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M58 168C40 138 46 100 68 72C90 88 108 106 128 128C114 152 88 166 58 168Z" fill="#FFFFFF" fill-opacity="0.24" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <!-- Сухожильные тяжи (хорды) клапана -->
  <path d="M128 22V50M218 180L195 166M38 180L61 166M184 42L168 64M72 42L88 64M128 234V206" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.65"/>
  <!-- Центральное пульсирующее отверстие сфинктера -->
  <polygon points="128,108 145,138 111,138" fill="#FFFFFF" fill-opacity="0.45" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="128" cy="128" r="8" fill="#FFFFFF"/>
</svg>`,
  abyssalSpore: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="abyss-glow" cx="50%" cy="38%" r="52%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.72"/>
      <stop offset="48%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="108" r="112" fill="url(#abyss-glow)"/>
  <!-- Длинные дрейфующие биолюминесцентные нити -->
  <path d="M84 114C64 148 82 184 58 228" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.62"/>
  <path d="M106 122C94 162 114 198 98 242" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-opacity="0.78"/>
  <path d="M128 124C122 168 138 202 128 248" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-opacity="0.9"/>
  <path d="M150 122C162 162 142 198 158 242" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-opacity="0.78"/>
  <path d="M172 114C192 148 174 184 198 228" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.62"/>
  <!-- Светящиеся бусины-споры вдоль нитей -->
  <circle cx="71" cy="172" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
  <circle cx="105" cy="192" r="4.5" fill="#FFFFFF"/>
  <circle cx="131" cy="212" r="5" fill="#FFFFFF"/>
  <circle cx="151" cy="186" r="4.5" fill="#FFFFFF"/>
  <circle cx="185" cy="176" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
  <!-- Полупрозрачный купол-колокол глубоководной споры -->
  <path d="M52 104C52 52 84 22 128 22C172 22 204 52 204 104C204 122 184 128 164 122C148 117 142 128 128 128C114 128 108 117 92 122C72 128 52 122 52 104Z" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="3"/>
  <!-- Внутренний светящийся фонарь и лепестки -->
  <path d="M128 28C104 48 92 78 90 116M128 28C152 48 164 78 166 116M128 28V122" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.58"/>
  <ellipse cx="128" cy="78" rx="28" ry="34" fill="#FFFFFF" fill-opacity="0.26" stroke="#FFFFFF" stroke-width="2.4"/>
  <circle cx="128" cy="76" r="12" fill="#FFFFFF"/>
  <!-- Вокруг парящие микро-споры -->
  <circle cx="42" cy="64" r="3.5" fill="#FFFFFF" fill-opacity="0.65"/>
  <circle cx="216" cy="72" r="3.5" fill="#FFFFFF" fill-opacity="0.65"/>
  <circle cx="38" cy="144" r="2.6" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="220" cy="148" r="2.6" fill="#FFFFFF" fill-opacity="0.5"/>
</svg>`,
  sacredFractal: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="frac-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.58"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="124" fill="url(#frac-glow)"/>
  <!-- Внешние орбиты и рекурсивные сателлитные почки (мотив Мандельброта) -->
  <circle cx="128" cy="128" r="112" stroke="#FFFFFF" stroke-width="1.6" stroke-dasharray="4 6" stroke-opacity="0.6"/>
  <circle cx="128" cy="128" r="88" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.72"/>
  <!-- 8 рекурсивных лепестков-кардиоид -->
  <g stroke="#FFFFFF" stroke-width="2" fill="#FFFFFF" fill-opacity="0.08">
    <circle cx="128" cy="54" r="28"/><circle cx="128" cy="202" r="28"/>
    <circle cx="54" cy="128" r="28"/><circle cx="202" cy="128" r="28"/>
    <circle cx="76" cy="76" r="22"/><circle cx="180" cy="180" r="22"/>
    <circle cx="180" cy="76" r="22"/><circle cx="76" cy="180" r="22"/>
  </g>
  <!-- Вторичные микро-почки на вершинах -->
  <g fill="#FFFFFF" fill-opacity="0.65">
    <circle cx="128" cy="18" r="6"/><circle cx="128" cy="238" r="6"/>
    <circle cx="18" cy="128" r="6"/><circle cx="238" cy="128" r="6"/>
    <circle cx="50" cy="50" r="4.5"/><circle cx="206" cy="206" r="4.5"/>
    <circle cx="206" cy="50" r="4.5"/><circle cx="50" cy="206" r="4.5"/>
  </g>
  <!-- Сакральная 8-конечная октаграмма -->
  <polygon points="128,36 154,102 220,128 154,154 128,220 102,154 36,128 102,102" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
  <polygon points="63,63 128,92 193,63 164,128 193,193 128,164 63,193 92,128" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.75" stroke-linejoin="round"/>
  <!-- Рекурсивный центр-сингулярность -->
  <circle cx="128" cy="128" r="32" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="2.6"/>
  <polygon points="128,104 152,128 128,152 104,128" fill="#FFFFFF" fill-opacity="0.4" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="128" cy="128" r="8" fill="#FFFFFF"/>
</svg>`
} as const;

export const WEAPON_VFX_SPRITES = {
  orbitPlasmaSphere: `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="28%" stop-color="#FFFFFF" stop-opacity="0.82"/>
      <stop offset="58%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#orb-core)"/>
  <!-- Внешние вращающиеся плазменные протуберанцы -->
  <path d="M22 46C28 24 54 12 80 18M106 82C100 104 74 116 48 110" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-opacity="0.88"/>
  <path d="M104 42C116 62 110 88 90 102M24 86C12 66 18 40 38 26" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.65"/>
  <!-- Зигзагообразные дуги молний вокруг сферы -->
  <path d="M30 56L40 48L38 38L52 34M98 72L88 80L90 90L76 94" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M74 28L82 38L94 38L96 52M54 100L46 90L34 90L32 76" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.8"/>
  <!-- Внутренняя магнитная клетка -->
  <ellipse cx="64" cy="64" rx="34" ry="18" transform="rotate(35 64 64)" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.72"/>
  <ellipse cx="64" cy="64" rx="34" ry="18" transform="rotate(-35 64 64)" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.72"/>
  <!-- Раскалённое ядро сферы -->
  <circle cx="64" cy="64" r="22" fill="#FFFFFF" fill-opacity="0.45" stroke="#FFFFFF" stroke-width="2.6"/>
  <circle cx="64" cy="64" r="12" fill="#FFFFFF"/>
</svg>`,
  novaShockwave: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="nova-ring" cx="50%" cy="50%" r="50%">
      <stop offset="56%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="76%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="86%" stop-color="#FFFFFF" stop-opacity="0.96"/>
      <stop offset="93%" stop-color="#FFFFFF" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Основная световая волна давления -->
  <circle cx="128" cy="128" r="122" fill="url(#nova-ring)"/>
  <!-- Разорванный внешний фронт ударной волны -->
  <path d="M84 22A114 114 0 0 1 198 38M234 86A114 114 0 0 1 218 198M172 234A114 114 0 0 1 58 218M22 170A114 114 0 0 1 38 58" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Вторая зубчатая фрактальная дуга разрыва -->
  <path d="M128 24L138 42L158 28L162 48L186 42L182 64L208 68L196 88L222 102L204 118L230 136L208 148L224 172L198 178L206 204L180 198L178 224L154 212L142 234L128 216L114 234L102 212L78 224L76 198L50 204L58 178L32 172L48 148L26 136L52 118L34 102L60 88L48 68L74 64L70 42L94 48L98 28L118 42L128 24Z" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round" stroke-opacity="0.88"/>
  <!-- Радиальные разрывы материи (спицы импульса) -->
  <g stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-opacity="0.72">
    <path d="M128 8V34M128 222V248M8 128H34M222 128H248"/>
    <path d="M44 44L64 64M192 192L212 212M212 44L192 64M64 192L44 212"/>
  </g>
  <!-- Внутренний эхо-контур -->
  <circle cx="128" cy="128" r="82" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="14 12" stroke-opacity="0.58"/>
</svg>`,
  auraCiliaMembrane: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cilia-halo" cx="50%" cy="50%" r="50%">
      <stop offset="46%" stop-color="#FFFFFF" stop-opacity="0.04"/>
      <stop offset="72%" stop-color="#FFFFFF" stop-opacity="0.28"/>
      <stop offset="88%" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="122" fill="url(#cilia-halo)"/>
  <!-- Мембранное основание ауры -->
  <circle cx="128" cy="128" r="84" stroke="#FFFFFF" stroke-width="2.6" stroke-opacity="0.72"/>
  <circle cx="128" cy="128" r="74" stroke="#FFFFFF" stroke-width="1.6" stroke-dasharray="8 8" stroke-opacity="0.45"/>
  <!-- 24 изогнутых микро-реснички по кругу (эффект биения в жидкости) -->
  <g stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.88">
    <path d="M128 44C132 30 142 20 148 12"/><path d="M150 47C158 34 170 28 178 22"/>
    <path d="M170 55C181 45 194 42 204 38"/><path d="M187 69C200 62 214 62 224 62"/>
    <path d="M201 86C215 82 228 86 238 88"/><path d="M209 106C223 106 235 114 244 118"/>
    <path d="M212 128C226 132 236 142 244 148"/><path d="M209 150C222 158 228 170 234 178"/>
    <path d="M201 170C211 181 214 194 218 204"/><path d="M187 187C194 200 194 214 194 224"/>
    <path d="M170 201C174 215 170 228 168 238"/><path d="M150 209C150 223 142 235 138 244"/>
    <path d="M128 212C124 226 114 236 108 244"/><path d="M106 209C98 222 86 228 78 234"/>
    <path d="M86 201C75 211 62 214 52 218"/><path d="M69 187C56 194 42 194 32 194"/>
    <path d="M55 170C41 174 28 170 18 168"/><path d="M47 150C33 150 21 142 12 138"/>
    <path d="M44 128C30 124 20 114 12 108"/><path d="M47 106C34 98 28 86 22 78"/>
    <path d="M55 86C45 75 42 62 38 52"/><path d="M69 69C62 56 62 42 62 32"/>
    <path d="M86 55C82 41 86 28 88 18"/><path d="M106 47C106 33 114 21 118 12"/>
  </g>
  <!-- Токсичные микро-пузырьки в ореоле -->
  <g fill="#FFFFFF" fill-opacity="0.72">
    <circle cx="164" cy="36" r="3.4"/><circle cx="222" cy="102" r="3"/>
    <circle cx="212" cy="184" r="3.6"/><circle cx="144" cy="226" r="2.8"/>
    <circle cx="72" cy="214" r="3.4"/><circle cx="34" cy="148" r="3"/>
    <circle cx="48" cy="70" r="3.4"/><circle cx="106" cy="30" r="2.8"/>
  </g>
</svg>`
} as const;

export const OVERLAY_SPRITES = {
  eliteCrownHalo: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="elite-ring-glow" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="78%" stop-color="#FFFFFF" stop-opacity="0.48"/>
      <stop offset="92%" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="122" fill="url(#elite-ring-glow)"/>
  <!-- Двойное силовое кольцо элитного статуса -->
  <circle cx="128" cy="128" r="96" stroke="#FFFFFF" stroke-width="3.2" stroke-opacity="0.92"/>
  <circle cx="128" cy="128" r="84" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="18 8 4 8" stroke-linecap="round" stroke-opacity="0.72"/>
  <!-- 4 главные коронные иглы (N, E, S, W) -->
  <polygon points="128,8 140,36 128,46 116,36" fill="#FFFFFF" fill-opacity="0.95"/>
  <polygon points="128,248 140,220 128,210 116,220" fill="#FFFFFF" fill-opacity="0.95"/>
  <polygon points="248,128 220,140 210,128 220,116" fill="#FFFFFF" fill-opacity="0.95"/>
  <polygon points="8,128 36,140 46,128 36,116" fill="#FFFFFF" fill-opacity="0.95"/>
  <!-- 4 диагональных хитиновых клыка -->
  <polygon points="43,43 68,54 70,70 54,68" fill="#FFFFFF" fill-opacity="0.8"/>
  <polygon points="213,43 202,68 186,70 188,54" fill="#FFFFFF" fill-opacity="0.8"/>
  <polygon points="213,213 188,202 186,186 202,188" fill="#FFFFFF" fill-opacity="0.8"/>
  <polygon points="43,213 54,188 70,186 68,202" fill="#FFFFFF" fill-opacity="0.8"/>
  <!-- Руны мутации на орбитальном ободе -->
  <g stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.88">
    <path d="M162 42L172 48L168 58M94 42L84 48L88 58"/>
    <path d="M214 162L208 172L198 168M214 94L208 84L198 88"/>
    <path d="M162 214L172 208L168 198M94 214L84 208L88 198"/>
    <path d="M42 162L48 172L58 168M42 94L48 84L58 88"/>
  </g>
</svg>`,
  shieldBarrier: `<svg viewBox="0 0 256 256" width="256" height="256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="shield-fill" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="62%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="90%" stop-color="#FFFFFF" stop-opacity="0.58"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="shield-hex-clip">
      <polygon points="128,18 223,73 223,183 128,238 33,183 33,73"/>
    </clipPath>
  </defs>
  <!-- Внешнее свечение купола -->
  <circle cx="128" cy="128" r="120" fill="url(#shield-fill)"/>
  <!-- Сотовая гексагональная решётка внутри щита -->
  <g clip-path="url(#shield-hex-clip)" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.48">
    <polygon points="128,96 156,112 156,144 128,160 100,144 100,112" fill="#FFFFFF" fill-opacity="0.08"/>
    <polygon points="128,32 156,48 156,80 128,96 100,80 100,48"/>
    <polygon points="128,160 156,176 156,208 128,224 100,208 100,176"/>
    <polygon points="184,64 212,80 212,112 184,128 156,112 156,80" fill="#FFFFFF" fill-opacity="0.14"/>
    <polygon points="72,64 100,80 100,112 72,128 44,112 44,80"/>
    <polygon points="184,128 212,144 212,176 184,192 156,176 156,144"/>
    <polygon points="72,128 100,144 100,176 72,192 44,176 44,144" fill="#FFFFFF" fill-opacity="0.14"/>
  </g>
  <!-- Основной шестиугольный силовой контур -->
  <polygon points="128,18 223,73 223,183 128,238 33,183 33,73" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round"/>
  <!-- Усиленные угловые эмиттеры барьера -->
  <path d="M106 31L128 18L150 31M202 61L223 73V98M223 158V183L202 195M150 225L128 238L106 225M54 195L33 183V158M33 98V73L54 61" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Энергетические узлы в вершинах -->
  <circle cx="128" cy="18" r="4.5" fill="#FFFFFF"/>
  <circle cx="223" cy="73" r="4.5" fill="#FFFFFF"/>
  <circle cx="223" cy="183" r="4.5" fill="#FFFFFF"/>
  <circle cx="128" cy="238" r="4.5" fill="#FFFFFF"/>
  <circle cx="33" cy="183" r="4.5" fill="#FFFFFF"/>
  <circle cx="33" cy="73" r="4.5" fill="#FFFFFF"/>
</svg>`
} as const;

export const HUD_FRAMES_V3 = {
  hpVialFrame: `<svg viewBox="0 0 320 56" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Левый и правый металлические био-зажимы колбы -->
  <path d="M4 16L12 8H28V48H12L4 40V16Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M316 16L308 8H292V48H308L316 40V16Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <path d="M14 14V42M21 14V42M299 14V42M306 14V42" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/>
  <!-- Стеклянный цилиндр ампулы -->
  <rect x="24" y="12" width="272" height="32" rx="14" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>
  <!-- Верхний стеклянный блик на колбе -->
  <path d="M40 17.5H280" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.42"/>
  <path d="M44 39.5H120M200 39.5H276" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0.35"/>
  <!-- Мерные деления микроскопа (10 секций) -->
  <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.78" vector-effect="non-scaling-stroke">
    <path d="M56 12V20M82 12V18M108 12V20M134 12V18M160 12V23M186 12V18M212 12V20M238 12V18M264 12V20"/>
    <path d="M56 44V38M108 44V38M160 44V36M212 44V38M264 44V38"/>
  </g>
  <!-- Клапанные болты на скобах -->
  <circle cx="11" cy="28" r="2.2" fill="currentColor"/>
  <circle cx="309" cy="28" r="2.2" fill="currentColor"/>
</svg>`,
  xpConduit: `<svg viewBox="0 0 320 44" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Левый нагнетательный био-насос -->
  <polygon points="4,22 14,7 36,7 42,22 36,37 14,37" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <circle cx="23" cy="22" r="5.5" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
  <circle cx="23" cy="22" r="2" fill="currentColor"/>
  <!-- Правый приёмный узел метаморфоза -->
  <polygon points="316,22 306,7 284,7 278,22 284,37 306,37" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  <polygon points="297,15 304,22 297,29 290,22" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <!-- Питательная трубка-кондуит -->
  <rect x="38" y="13" width="244" height="18" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.9" vector-effect="non-scaling-stroke"/>
  <!-- Кольцевые манжеты давления по длине трубки -->
  <path d="M96 10V34M160 9V35M224 10V34" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Шевроны направления потока биомассы -->
  <path d="M64 18L69 22L64 26M126 18L131 22L126 26M190 18L195 22L190 26M252 18L257 22L252 26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <!-- Стеклянный блик -->
  <path d="M48 16.5H272" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.36"/>
</svg>`,
  petriRadar: `<svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Внешний обод чашки Петри -->
  <circle cx="80" cy="80" r="74" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
  <circle cx="80" cy="80" r="67" stroke="currentColor" stroke-width="1.4" stroke-dasharray="14 6 3 6" stroke-opacity="0.65" vector-effect="non-scaling-stroke"/>
  <!-- Кольца дальности сканера -->
  <circle cx="80" cy="80" r="48" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.38" vector-effect="non-scaling-stroke"/>
  <circle cx="80" cy="80" r="26" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity="0.45" vector-effect="non-scaling-stroke"/>
  <!-- Координатное перекрестие -->
  <path d="M80 12V148M12 80H148" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.3" vector-effect="non-scaling-stroke"/>
  <!-- 4 угловых зажима предметного столика микроскопа -->
  <path d="M80 2V11M80 149V158M2 80H11M149 80H158" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <path d="M25 25L32 32M135 25L128 32M135 135L128 128M25 135L32 128" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.72" vector-effect="non-scaling-stroke"/>
  <!-- Градусные микро-риски по кругу -->
  <path d="M104 10L101 16M130 28L125 33M150 56L144 59M150 104L144 101M130 132L125 127M104 150L101 144M56 150L59 144M30 132L35 127M10 104L16 101M10 56L16 59M30 28L35 33M56 10L59 16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-opacity="0.55" vector-effect="non-scaling-stroke"/>
  <!-- Центральная метка Светляка -->
  <circle cx="80" cy="80" r="4" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
  <circle cx="80" cy="80" r="1.6" fill="currentColor"/>
</svg>`,
  petriRadarSweep: `<svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sweep-grad" x1="80" y1="14" x2="136" y2="62" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="currentColor" stop-opacity="0.52"/>
      <stop offset="55%" stop-color="currentColor" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Сектор затухающего эха радара (65 градусов) -->
  <path d="M80 80V13A67 67 0 0 1 140.5 51.5L80 80Z" fill="url(#sweep-grad)"/>
  <!-- Передняя яркая линия сканирующего луча -->
  <path d="M80 80V13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <!-- Светящийся фронт на кромке -->
  <circle cx="80" cy="13" r="3" fill="currentColor"/>
</svg>`
} as const;

export type TailSpriteKey = keyof typeof TAIL_SPRITES;
export type EyeSpriteKey = keyof typeof EYE_SPRITES;
export type BiomeParallaxKey = keyof typeof BIOME_PARALLAX_SPRITES;
export type WeaponVfxKey = keyof typeof WEAPON_VFX_SPRITES;
export type OverlaySpriteKey = keyof typeof OVERLAY_SPRITES;

/**
 * Конвертирует SVG-строку в PixiJS v8 Texture через Data URI.
 */
export async function svgToTextureV3(svgString: string): Promise<Texture> {
  return svgToTexture(svgString);
}

/**
 * Предзагрузка всех 14 канвас-ассетов Wave 3 для PixiOverlay.ts.
 */
export async function loadBiopunkTexturesV3() {
  const loadMap = async <T extends Record<string, string>>(source: T) => {
    const out = {} as Record<keyof T, Texture>;
    await Promise.all(
      (Object.keys(source) as (keyof T)[]).map(async (key) => {
        out[key] = await svgToTextureV3(source[key]);
      })
    );
    return out;
  };

  const [tail, eye, biomes, vfx, overlays] = await Promise.all([
    loadMap(TAIL_SPRITES),
    loadMap(EYE_SPRITES),
    loadMap(BIOME_PARALLAX_SPRITES),
    loadMap(WEAPON_VFX_SPRITES),
    loadMap(OVERLAY_SPRITES),
  ]);

  return { tail, eye, biomes, vfx, overlays };
}

/**
 * Хелпер 1: поворот сегмента хвоста по касательной к цепи.
 * У tail-vertebra и tail-stinger сустав сочленения направлен в +X (к голове).
 */
export function alignTailSegment(
  sprite: Sprite,
  currX: number,
  currY: number,
  prevX: number,
  prevY: number
) {
  sprite.position.set(currX, currY);
  sprite.rotation = Math.atan2(prevY - currY, prevX - currX);
}

/**
 * Хелпер 2: слежение щелевидного зрачка за ближайшим врагом или курсором.
 * Вызывайте для дочернего спрайта predatorPupil внутри контейнера глаза.
 */
export function updatePredatorPupil(
  pupil: Sprite,
  eyeWorldX: number,
  eyeWorldY: number,
  targetWorldX: number,
  targetWorldY: number,
  maxOffsetPx = 10,
  eyeWorldRotation = 0
) {
  const angle = Math.atan2(targetWorldY - eyeWorldY, targetWorldX - eyeWorldX) - eyeWorldRotation;
  const dist = Math.hypot(targetWorldX - eyeWorldX, targetWorldY - eyeWorldY);
  const ratio = Math.min(1, dist / 140);
  pupil.position.set(
    Math.cos(angle) * maxOffsetPx * ratio,
    Math.sin(angle) * maxOffsetPx * ratio
  );
}
