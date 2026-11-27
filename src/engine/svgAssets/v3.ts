// v3.ts - EvoToon Pack 2: Анатомия хвоста, Глаз хищника, 5 Биомов, VFX, Элита/Щиты и HUD-рамки
import { Texture, Sprite } from 'pixi.js';
import { svgToTexture } from './core';

export const TAIL_SPRITES = {
  tailVertebra: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="p2_tv_b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="52%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></linearGradient><radialGradient id="p2_tv_c" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#34d399"/><stop offset="100%" stop-color="#047857"/></radialGradient></defs><!-- Dorsal & ventral cartilage fins -->
           <path d="M44 36 L68 14 L84 36 Z" fill="#34d399" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <path d="M44 92 L68 114 L84 92 Z" fill="#34d399" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <!-- Main vertebra body aligned along +X -->
           <path d="M18 46 C36 28 90 28 110 46 C118 54 118 74 110 82 C90 100 36 100 18 82 C10 74 10 54 18 46 Z" fill="url(#p2_tv_b)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Inner nerve node -->
           <ellipse cx="64" cy="64" rx="28" ry="16" fill="url(#p2_tv_c)" stroke="#160e26" stroke-width="4"/>
           <line x1="22" y1="64" x2="106" y2="64" stroke="#ecfdf5" stroke-width="3.5" stroke-linecap="round" opacity="0.65"/>
           <ellipse cx="56" cy="46" rx="16" ry="5" fill="#fff" opacity="0.55"/></svg>`,
  tailStinger: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="p2_ts_b" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#a3e635"/><stop offset="100%" stop-color="#15803d"/></linearGradient><linearGradient id="p2_ts_j" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="52%" stop-color="#059669"/><stop offset="100%" stop-color="#064e3b"/></linearGradient></defs><!-- Joint socket (-X) -->
           <ellipse cx="26" cy="64" rx="16" ry="26" fill="url(#p2_ts_j)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Barbed venomous stinger blade pointing +X -->
           <path d="M26 38 C56 36 86 46 122 64 C86 82 56 92 26 90 L38 74 L28 64 L38 54 Z" fill="url(#p2_ts_b)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Barbs & venom channel -->
           <path d="M48 64 H104" stroke="#ecfccb" stroke-width="4.5" stroke-linecap="round"/>
           <path d="M46 50 L82 56" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/></svg>`,
} as const;

export const EYE_SPRITES = {
  predatorEye: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_eye_s" cx="52%" cy="46%" r="58%"><stop offset="0%" stop-color="#ffffff"/><stop offset="58%" stop-color="#fef9c3"/><stop offset="100%" stop-color="#fde68a"/></radialGradient><linearGradient id="p2_eye_l" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fb7185"/><stop offset="52%" stop-color="#e11d48"/><stop offset="100%" stop-color="#881337"/></linearGradient></defs><!-- Outer fleshy predator eyelid -->
           <path d="M12 64 C24 24 72 16 116 64 C72 112 24 104 12 64 Z" fill="url(#p2_eye_l)" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <!-- Bright cartoon sclera -->
           <path d="M24 64 C34 34 72 28 106 64 C72 100 34 94 24 64 Z" fill="url(#p2_eye_s)" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <!-- Subtle upper eyelid shadow -->
           <path d="M28 58 C42 36 74 34 102 60 C74 44 46 46 28 58 Z" fill="#f59e0b" opacity="0.22"/>
           <!-- Fierce brow crest facing +X -->
           <path d="M22 36 Q64 16 112 46" stroke="#160e26" stroke-width="6" stroke-linecap="round"/></svg>`,
  predatorPupil: `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><radialGradient id="p2_pup_i" cx="45%" cy="42%" r="58%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#f97316"/><stop offset="100%" stop-color="#b91c1c"/></radialGradient></defs><circle cx="32" cy="32" r="24" fill="url(#p2_pup_i)" stroke="#160e26" stroke-width="4.5"/>
           <!-- Vertical cat-predator slit -->
           <ellipse cx="32" cy="32" rx="7.5" ry="18" fill="#160e26"/>
           <!-- Cartoon glossy eye catchlights -->
           <circle cx="24" cy="23" r="5.5" fill="#fff"/>
           <circle cx="39" cy="40" r="2.8" fill="#fff" opacity="0.85"/></svg>`,
} as const;

export const BIOME_PARALLAX_SPRITES = {
  diatomShell: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_b1_a" cx="45%" cy="40%" r="62%"><stop offset="0%" stop-color="#99f6e4"/><stop offset="58%" stop-color="#0d9488"/><stop offset="100%" stop-color="#134e4a"/></radialGradient></defs><ellipse cx="128" cy="128" rx="108" ry="74" fill="url(#p2_b1_a)" opacity="0.6" stroke="#160e26" stroke-width="6"/>
           <ellipse cx="128" cy="128" rx="84" ry="52" fill="none" stroke="#5eead4" stroke-width="4.5" stroke-dasharray="14 10"/>
           <line x1="26" y1="128" x2="230" y2="128" stroke="#2dd4bf" stroke-width="5"/>
           <g fill="#ccfbf1" stroke="#160e26" stroke-width="3.5" opacity="0.8">
             <circle cx="74" cy="106" r="10"/><circle cx="110" cy="100" r="12"/><circle cx="146" cy="100" r="12"/><circle cx="182" cy="106" r="10"/>
             <circle cx="74" cy="150" r="10"/><circle cx="110" cy="156" r="12"/><circle cx="146" cy="156" r="12"/><circle cx="182" cy="150" r="10"/>
           </g></svg>`,
  capillaryNode: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_b2_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#be123c"/><stop offset="100%" stop-color="#4c0519"/></radialGradient></defs><g stroke="#fb7185" stroke-width="18" stroke-linecap="round" opacity="0.65">
             <path d="M128 128 Q78 86 24 44"/>
             <path d="M128 128 Q180 78 232 48"/>
             <path d="M128 128 Q72 178 28 220"/>
             <path d="M128 128 Q184 176 228 214"/>
             <path d="M128 128 V242"/>
           </g>
           <g stroke="#160e26" stroke-width="4" stroke-linecap="round" opacity="0.7">
             <path d="M128 128 Q78 86 24 44"/><path d="M128 128 Q180 78 232 48"/>
             <path d="M128 128 Q72 178 28 220"/><path d="M128 128 Q184 176 228 214"/>
           </g>
           <circle cx="128" cy="128" r="40" fill="url(#p2_b2_a)" stroke="#160e26" stroke-width="6"/>
           <circle cx="128" cy="128" r="18" fill="#fecdd3" opacity="0.65"/></svg>`,
  bioValve: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_b3_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fde68a"/><stop offset="58%" stop-color="#d97706"/><stop offset="100%" stop-color="#78350f"/></radialGradient></defs><circle cx="128" cy="128" r="106" fill="#451a03" opacity="0.45" stroke="#160e26" stroke-width="7"/>
           <!-- 3 muscular valve flaps -->
           <path d="M128 128 L128 26 A102 102 0 0 1 216 179 Z" fill="url(#p2_b3_a)" opacity="0.72" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <path d="M128 128 L216 179 A102 102 0 0 1 40 179 Z" fill="#f59e0b" opacity="0.62" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <path d="M128 128 L40 179 A102 102 0 0 1 128 26 Z" fill="#b45309" opacity="0.68" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <circle cx="128" cy="128" r="24" fill="#fef3c7" stroke="#160e26" stroke-width="5"/></svg>`,
  abyssalSpore: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_b4_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="58%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e1b4b"/></radialGradient></defs><g stroke="#60a5fa" stroke-width="6" stroke-linecap="round" opacity="0.7">
             <line x1="128" y1="128" x2="128" y2="16"/><line x1="128" y1="128" x2="218" y2="62"/>
             <line x1="128" y1="128" x2="232" y2="168"/><line x1="128" y1="128" x2="164" y2="236"/>
             <line x1="128" y1="128" x2="78" y2="230"/><line x1="128" y1="128" x2="24" y2="154"/>
             <line x1="128" y1="128" x2="46" y2="56"/>
           </g>
           <circle cx="128" cy="128" r="64" fill="url(#p2_b4_a)" opacity="0.72" stroke="#160e26" stroke-width="6"/>
           <circle cx="128" cy="128" r="28" fill="#67e8f9" opacity="0.55" stroke="#160e26" stroke-width="4"/>
           <g fill="#bae6fd" stroke="#160e26" stroke-width="3.5">
             <circle cx="128" cy="18" r="10"/><circle cx="218" cy="62" r="9"/><circle cx="232" cy="168" r="9"/>
             <circle cx="164" cy="236" r="10"/><circle cx="78" cy="230" r="9"/><circle cx="24" cy="154" r="9"/><circle cx="46" cy="56" r="10"/>
           </g></svg>`,
  sacredFractal: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="p2_b5_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#c084fc"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><circle cx="128" cy="128" r="108" stroke="url(#p2_b5_a)" stroke-width="7" opacity="0.75"/>
           <polygon points="128,22 220,182 36,182" fill="none" stroke="#e879f9" stroke-width="6" stroke-linejoin="round" opacity="0.7"/>
           <polygon points="128,234 220,74 36,74" fill="none" stroke="#fde047" stroke-width="6" stroke-linejoin="round" opacity="0.7"/>
           <circle cx="128" cy="128" r="54" stroke="#a855f7" stroke-width="5" stroke-dasharray="12 10" opacity="0.8"/>
           <polygon points="128,88 162,128 128,168 94,128" fill="url(#p2_b5_a)" opacity="0.55" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <circle cx="128" cy="128" r="14" fill="#fef9c3" stroke="#160e26" stroke-width="4"/></svg>`,
} as const;

export const WEAPON_VFX_SPRITES = {
  orbitPlasmaSphere: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_orb_a" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#ffffff"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#4f46e5"/></radialGradient></defs><!-- Electric outer arcs -->
           <path d="M22 46 L12 34 L28 24 L42 14" stroke="#fef08a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M106 82 L116 94 L100 104 L86 114" stroke="#fef08a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
           <circle cx="64" cy="64" r="44" stroke="#67e8f9" stroke-width="4" stroke-dasharray="16 12" opacity="0.8"/>
           <!-- Plasma orb body -->
           <circle cx="64" cy="64" r="34" fill="url(#p2_orb_a)" stroke="#160e26" stroke-width="5.5"/>
           <path d="M44 68 L58 52 L66 64 L84 48" stroke="#fef08a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
           <ellipse cx="50" cy="46" rx="9" ry="5" fill="#fff" opacity="0.85" transform="rotate(-30 50 46)"/></svg>`,
  novaShockwave: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_nov_r" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="58%" stop-color="#f472b6"/><stop offset="100%" stop-color="#7c3aed"/></radialGradient></defs><!-- Outer comic starburst shock ring -->
           <circle cx="128" cy="128" r="112" stroke="url(#p2_nov_r)" stroke-width="20" opacity="0.88"/>
           <circle cx="128" cy="128" r="112" stroke="#160e26" stroke-width="5" stroke-dasharray="28 16"/>
           <circle cx="128" cy="128" r="88" stroke="#fef08a" stroke-width="7" stroke-dasharray="20 14" opacity="0.9"/>
           <circle cx="128" cy="128" r="66" stroke="#38bdf8" stroke-width="4" opacity="0.55"/>
           <!-- Radial speed streaks -->
           <g stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.85">
             <line x1="128" y1="8" x2="128" y2="26"/>
             <line x1="128" y1="230" x2="128" y2="248"/>
             <line x1="8" y1="128" x2="26" y2="128"/>
             <line x1="230" y1="128" x2="248" y2="128"/>
           </g></svg>`,
  auraCiliaMembrane: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_aur_m" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#4ade80"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><circle cx="128" cy="128" r="98" fill="url(#p2_aur_m)" opacity="0.18"/>
           <circle cx="128" cy="128" r="98" stroke="#84cc16" stroke-width="10" opacity="0.85"/>
           <circle cx="128" cy="128" r="98" stroke="#160e26" stroke-width="3.5" stroke-dasharray="14 10"/>
           <!-- Cartoon cilia hairs around perimeter -->
           <g stroke="#bef264" stroke-width="6" stroke-linecap="round">
             <line x1="128" y1="26" x2="128" y2="10"/>
             <line x1="179" y1="40" x2="188" y2="26"/>
             <line x1="216" y1="77" x2="230" y2="68"/>
             <line x1="230" y1="128" x2="246" y2="128"/>
             <line x1="216" y1="179" x2="230" y2="188"/>
             <line x1="179" y1="216" x2="188" y2="230"/>
             <line x1="128" y1="230" x2="128" y2="246"/>
             <line x1="77" y1="216" x2="68" y2="230"/>
             <line x1="40" y1="179" x2="26" y2="188"/>
             <line x1="26" y1="128" x2="10" y2="128"/>
             <line x1="40" y1="77" x2="26" y2="68"/>
             <line x1="77" y1="40" x2="68" y2="26"/>
           </g>
           <circle cx="86" cy="56" r="8" fill="#fef08a" stroke="#160e26" stroke-width="3" opacity="0.8"/>
           <circle cx="190" cy="182" r="7" fill="#d9f99d" stroke="#160e26" stroke-width="3" opacity="0.8"/></svg>`,
} as const;

export const OVERLAY_SPRITES = {
  eliteCrownHalo: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="p2_ech_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="52%" stop-color="#facc15"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><circle cx="128" cy="128" r="102" stroke="url(#p2_ech_g)" stroke-width="14" opacity="0.9"/>
           <circle cx="128" cy="128" r="102" stroke="#160e26" stroke-width="4" stroke-dasharray="22 14"/>
           <circle cx="128" cy="128" r="84" stroke="#fef08a" stroke-width="4" stroke-dasharray="10 12" opacity="0.75"/>
           <!-- Top & bottom royal crown points -->
           <path d="M98 28 L108 8 L128 22 L148 8 L158 28 Z" fill="url(#p2_ech_g)" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <circle cx="128" cy="24" r="6" fill="#f43f5e" stroke="#160e26" stroke-width="3"/></svg>`,
  shieldBarrier: `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="p2_shb_a" cx="50%" cy="50%" r="52%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></radialGradient></defs><polygon points="128,16 226,72 226,184 128,240 30,184 30,72" fill="url(#p2_shb_a)" opacity="0.22"/>
           <polygon points="128,16 226,72 226,184 128,240 30,184 30,72" fill="none" stroke="#38bdf8" stroke-width="12" stroke-linejoin="round"/>
           <polygon points="128,16 226,72 226,184 128,240 30,184 30,72" fill="none" stroke="#160e26" stroke-width="4" stroke-dasharray="24 14"/>
           <!-- Inner hexagonal honeycomb struts -->
           <polygon points="128,58 188,92 188,164 128,198 68,164 68,92" fill="none" stroke="#bae6fd" stroke-width="4.5" opacity="0.65"/>
           <line x1="128" y1="16" x2="128" y2="58" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <line x1="128" y1="198" x2="128" y2="240" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <line x1="30" y1="72" x2="68" y2="92" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <line x1="226" y1="72" x2="188" y2="92" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <line x1="30" y1="184" x2="68" y2="164" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <line x1="226" y1="184" x2="188" y2="164" stroke="#67e8f9" stroke-width="4" opacity="0.7"/>
           <!-- Gloss arc -->
           <path d="M58 76 Q128 36 198 76" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.65"/></svg>`,
} as const;

export const HUD_FRAMES_V3 = {
  hpVialFrame: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" fill="none"><defs><linearGradient id="p2_hp_m" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#475569"/><stop offset="52%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="p2_hp_c" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fda4af"/><stop offset="52%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></linearGradient></defs><!-- Left heart bio-cap -->
           <rect x="6" y="10" width="32" height="36" rx="12" fill="url(#p2_hp_m)" stroke="#160e26" stroke-width="4.5"/>
           <circle cx="22" cy="28" r="9" fill="url(#p2_hp_c)" stroke="#160e26" stroke-width="3"/>
           <!-- Glass vial outer frame (hollow interior for bar fill) -->
           <rect x="34" y="10" width="268" height="36" rx="18" fill="none" stroke="url(#p2_hp_m)" stroke-width="9"/>
           <rect x="34" y="10" width="268" height="36" rx="18" fill="none" stroke="#160e26" stroke-width="3.5"/>
           <!-- Measurement ticks & glass gloss -->
           <path d="M90 12 V20 M144 12 V20 M198 12 V20 M252 12 V20" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
           <path d="M52 17 H282" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
           <!-- Right steel end-cap -->
           <path d="M298 12 H310 C314 12 316 18 316 28 C316 38 314 44 310 44 H298 Z" fill="url(#p2_hp_m)" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/></svg>`,
  xpConduit: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 44" fill="none"><defs><linearGradient id="p2_xp_f" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#334155"/><stop offset="52%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="p2_xp_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><!-- Left glowing DNA connector -->
           <polygon points="8,22 22,8 36,8 36,36 22,36" fill="url(#p2_xp_f)" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <circle cx="24" cy="22" r="5.5" fill="url(#p2_xp_g)" stroke="#160e26" stroke-width="2.5"/>
           <!-- Conduit frame (hollow center) -->
           <rect x="34" y="9" width="264" height="26" rx="13" fill="none" stroke="url(#p2_xp_f)" stroke-width="8"/>
           <rect x="34" y="9" width="264" height="26" rx="13" fill="none" stroke="#160e26" stroke-width="3"/>
           <!-- Conduit clamps -->
           <rect x="112" y="5" width="10" height="34" rx="4" fill="url(#p2_xp_f)" stroke="#160e26" stroke-width="3"/>
           <rect x="210" y="5" width="10" height="34" rx="4" fill="url(#p2_xp_f)" stroke="#160e26" stroke-width="3"/>
           <!-- Right end valve -->
           <circle cx="304" cy="22" r="10" fill="url(#p2_xp_g)" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="301" cy="19" r="2.8" fill="#fff"/></svg>`,
  petriRadar: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none"><defs><radialGradient id="p2_rad_b" cx="42%" cy="38%" r="65%"><stop offset="0%" stop-color="#0f2942"/><stop offset="58%" stop-color="#091526"/><stop offset="100%" stop-color="#040a14"/></radialGradient><linearGradient id="p2_rad_r" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#64748b"/><stop offset="52%" stop-color="#334155"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><circle cx="80" cy="80" r="74" fill="url(#p2_rad_r)" stroke="#160e26" stroke-width="5"/>
           <circle cx="80" cy="80" r="64" fill="url(#p2_rad_b)" stroke="#160e26" stroke-width="4"/>
           <!-- Radar rings & crosshair -->
           <circle cx="80" cy="80" r="44" stroke="#22d3ee" stroke-width="1.8" stroke-dasharray="6 6" opacity="0.45"/>
           <circle cx="80" cy="80" r="22" stroke="#22d3ee" stroke-width="1.5" opacity="0.45"/>
           <line x1="16" y1="80" x2="144" y2="80" stroke="#38bdf8" stroke-width="1.5" opacity="0.35"/>
           <line x1="80" y1="16" x2="80" y2="144" stroke="#38bdf8" stroke-width="1.5" opacity="0.35"/>
           <!-- Rim rivets -->
           <circle cx="80" cy="11" r="3.5" fill="#34d399" stroke="#160e26" stroke-width="2"/>
           <circle cx="80" cy="149" r="3.5" fill="#34d399" stroke="#160e26" stroke-width="2"/>
           <circle cx="11" cy="80" r="3.5" fill="#34d399" stroke="#160e26" stroke-width="2"/>
           <circle cx="149" cy="80" r="3.5" fill="#34d399" stroke="#160e26" stroke-width="2"/>
           <!-- Glass sheen -->
           <path d="M36 42 A54 54 0 0 1 114 34" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.35"/></svg>`,
  petriRadarSweep: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none"><defs><linearGradient id="p2_swp_a" x1="80%" y1="20%" x2="20%" y2="80%"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient></defs><path d="M80 80 L80 18 A62 62 0 0 1 134 49 Z" fill="url(#p2_swp_a)" opacity="0.42"/>
           <line x1="80" y1="80" x2="80" y2="18" stroke="#a7f3d0" stroke-width="3.5" stroke-linecap="round"/>
           <circle cx="80" cy="80" r="5" fill="#6ee7b7" stroke="#160e26" stroke-width="2.5"/></svg>`,
} as const;

export async function svgToTextureV3(svgString: string): Promise<Texture> {
  return svgToTexture(svgString);
}

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
