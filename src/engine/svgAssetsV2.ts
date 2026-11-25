// svgAssetsV2.ts — EvoToon Pack 2: 5 врагов V2, Ядро/Шип игрока, эмблемы гибридов, статистика и контролы
import { Texture } from 'pixi.js';
import { svgToTexture } from './svgAssets';

export const HYBRID_EMBLEMS = {
  plasmaLeviathan: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h1_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient><linearGradient id="p2_h1_b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><circle cx="24" cy="24" r="20" fill="url(#p2_h1_b)" stroke="#160e26" stroke-width="3"/>
           <path d="M10 26 C12 12 24 8 38 14 C32 20 34 28 38 34 C26 40 12 36 10 26 Z" fill="url(#p2_h1_a)" stroke="#160e26" stroke-width="2.8" stroke-linejoin="round"/>
           <circle cx="22" cy="20" r="3.5" fill="#fef08a" stroke="#160e26" stroke-width="2"/>
           <polygon points="31,20 39,24 31,28" fill="#fff" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/></svg>`,
  ouroboros: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h2_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#10b981"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><circle cx="24" cy="24" r="16" stroke="url(#p2_h2_a)" stroke-width="8"/>
           <circle cx="24" cy="24" r="20" stroke="#160e26" stroke-width="2.6"/>
           <circle cx="24" cy="24" r="12" stroke="#160e26" stroke-width="2.6"/>
           <!-- Serpent head -->
           <path d="M20 4 L34 9 L22 15 Z" fill="#fef08a" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="25" cy="8.5" r="1.6" fill="#160e26"/></svg>`,
  phaseSerpent: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h3_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><path d="M9 36 C12 22 24 28 24 18 C24 12 30 8 40 10 L34 20 C29 19 30 30 22 36 C16 40 12 40 9 36 Z" fill="url(#p2_h3_a)" stroke="#160e26" stroke-width="2.8" stroke-linejoin="round"/>
           <circle cx="32" cy="13" r="2.2" fill="#fef08a" stroke="#160e26" stroke-width="1.4"/>
           <path d="M8 14 H18 M30 38 H40" stroke="#67e8f9" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  sporeReactor: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="p2_h4_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><circle cx="24" cy="24" r="19" fill="#14532d" stroke="#160e26" stroke-width="3"/>
           <circle cx="24" cy="13" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="14" cy="30" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="34" cy="30" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="24" cy="24" r="5" fill="#fef9c3" stroke="#160e26" stroke-width="2.4"/></svg>`,
  ionColossus: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h5_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></linearGradient><radialGradient id="p2_h5_c" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#ffffff"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs><polygon points="24,4 42,14 40,34 24,44 8,34 6,14" fill="url(#p2_h5_a)" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <circle cx="24" cy="24" r="10" fill="url(#p2_h5_c)" stroke="#160e26" stroke-width="2.6"/>
           <polygon points="25,16 19,25 24,25 23,32 29,23 24,23" fill="#fef08a"/></svg>`,
  psiWeb: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="p2_h6_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#f5d0fe"/><stop offset="58%" stop-color="#a855f7"/><stop offset="100%" stop-color="#4c1d95"/></radialGradient></defs><polygon points="24,6 40,15 40,33 24,42 8,33 8,15" fill="#2e1065" stroke="#c084fc" stroke-width="2.8" stroke-linejoin="round"/>
           <path d="M24 6 V42 M8 15 L40 33 M40 15 L8 33" stroke="#e879f9" stroke-width="2.2"/>
           <circle cx="24" cy="24" r="8" fill="url(#p2_h6_a)" stroke="#160e26" stroke-width="2.6"/>
           <circle cx="24" cy="24" r="3" fill="#fef08a"/></svg>`,
} as const;

export const STAT_ICONS = {
  timer: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_st1" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></radialGradient></defs><rect x="13" y="3" width="6" height="4" rx="1.5" fill="#fbbf24" stroke="#160e26" stroke-width="2"/>
           <circle cx="16" cy="18" r="11" fill="url(#p2_st1)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="16" cy="18" r="7.5" fill="#f8fafc"/>
           <path d="M16 13 V18 L20 20" stroke="#160e26" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  skullHazard: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_st2" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff1f2"/><stop offset="58%" stop-color="#fecdd3"/><stop offset="100%" stop-color="#fda4af"/></radialGradient></defs><path d="M16 4 C23 4 27 9 27 15 C27 19 24 22 22 23 V27 H10 V23 C8 22 5 19 5 15 C5 9 9 4 16 4 Z" fill="url(#p2_st2)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="12" cy="15" r="2.8" fill="#160e26"/>
           <circle cx="20" cy="15" r="2.8" fill="#160e26"/>
           <path d="M14 23 V27 M18 23 V27" stroke="#160e26" stroke-width="2"/></svg>`,
  tailLength: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_st3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><circle cx="7" cy="23" r="3.5" fill="#a7f3d0" stroke="#160e26" stroke-width="2"/>
           <circle cx="13" cy="19" r="4.2" fill="#6ee7b7" stroke="#160e26" stroke-width="2"/>
           <circle cx="20" cy="14" r="5" fill="url(#p2_st3)" stroke="#160e26" stroke-width="2.2"/>
           <polygon points="24,10 30,6 27,13" fill="#fef08a" stroke="#160e26" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  nodeDominance: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_st4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><line x1="16" y1="8" x2="8" y2="23" stroke="#38bdf8" stroke-width="2.6"/>
           <line x1="16" y1="8" x2="24" y2="23" stroke="#38bdf8" stroke-width="2.6"/>
           <line x1="8" y1="23" x2="24" y2="23" stroke="#38bdf8" stroke-width="2.6"/>
           <circle cx="16" cy="8" r="4.5" fill="url(#p2_st4)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="8" cy="23" r="4" fill="#34d399" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="24" cy="23" r="4" fill="#34d399" stroke="#160e26" stroke-width="2.2"/></svg>`,
  macroScale: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_st5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_st5)" opacity="0.25" stroke="#38bdf8" stroke-width="2.4"/>
           <circle cx="16" cy="16" r="6" fill="url(#p2_st5)" stroke="#160e26" stroke-width="2.2"/>
           <path d="M21 11 L27 5 M22 5 H27 V10" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  damageNova: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_st6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><polygon points="16,2 19,11 29,8 22,16 29,24 19,21 16,30 13,21 3,24 10,16 3,8 13,11" fill="url(#p2_st6)" stroke="#160e26" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  recordBadge: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_st7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="52%" stop-color="#facc15"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><polygon points="10,20 7,30 16,26 25,30 22,20" fill="#f43f5e" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/>
           <circle cx="16" cy="13" r="9.5" fill="url(#p2_st7)" stroke="#160e26" stroke-width="2.4"/>
           <polygon points="16,7 18,11 22,11.5 19,14.5 20,18.5 16,16.5 12,18.5 13,14.5 10,11.5 14,11" fill="#fff" stroke="#160e26" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
} as const;

export const CONTROL_ICONS = {
  biolab: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#bbf7d0"/><stop offset="52%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></linearGradient></defs><path d="M12 5 H20 V11 L26 23 C27 26 25 28 22 28 H10 C7 28 5 26 6 23 L12 11 Z" fill="url(#p2_ct1)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <rect x="10" y="3" width="12" height="3.5" rx="1.5" fill="#38bdf8" stroke="#160e26" stroke-width="2"/>
           <circle cx="14" cy="22" r="2.2" fill="#fef08a"/>
           <circle cx="19" cy="19" r="1.6" fill="#fff"/></svg>`,
  cameraDna: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="52%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><path d="M5 10 H10 L12 6 H20 L22 10 H27 C28.5 10 29 11 29 12.5 V25 C29 26.5 28 27.5 26.5 27.5 H5.5 C4 27.5 3 26.5 3 25 V12.5 C3 11 3.5 10 5 10 Z" fill="url(#p2_ct2)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="16" cy="18.5" r="5.5" fill="#38bdf8" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="14.5" cy="17" r="1.8" fill="#fff"/>
           <circle cx="24" cy="13.5" r="1.5" fill="#fef08a"/></svg>`,
  soundOn: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><path d="M4 12 H10 L18 6 V26 L10 20 H4 Z" fill="url(#p2_ct5)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <path d="M22 12 A5.5 5.5 0 0 1 22 20" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round"/>
           <path d="M25.5 8.5 A10 10 0 0 1 25.5 23.5" stroke="#4ade80" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  soundMute: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#475569"/></linearGradient></defs><path d="M4 12 H10 L18 6 V26 L10 20 H4 Z" fill="url(#p2_ct6)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <path d="M22 12 L29 19 M29 12 L22 19" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/></svg>`,
  pause: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect x="6" y="5" width="7.5" height="22" rx="3.2" fill="url(#p2_ct3)" stroke="#160e26" stroke-width="2.4"/>
           <rect x="18.5" y="5" width="7.5" height="22" rx="3.2" fill="url(#p2_ct3)" stroke="#160e26" stroke-width="2.4"/></svg>`,
  play: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#86efac"/><stop offset="52%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><path d="M8 5 L27 16 L8 27 Z" fill="url(#p2_ct4)" stroke="#160e26" stroke-width="2.6" stroke-linejoin="round"/>
           <path d="M11 10 L21 16" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/></svg>`,
  fullscreen: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ct7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs><g stroke="url(#p2_ct7)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
             <path d="M5 12 V5 H12"/>
             <path d="M20 5 H27 V12"/>
             <path d="M27 20 V27 H20"/>
             <path d="M12 27 H5 V20"/>
           </g>
           <rect x="11" y="11" width="10" height="10" rx="2.5" fill="#fef08a" stroke="#160e26" stroke-width="2"/></svg>`,
} as const;

export const EVENT_ICONS = {
  waveTide: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ev1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="52%" stop-color="#0284c7"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient></defs><path d="M3 22 C7 10 15 6 25 9 C19 12 20 17 29 19 C25 26 11 29 3 22 Z" fill="url(#p2_ev1)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <path d="M9 18 Q14 13 20 14" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/></svg>`,
  ambush: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ev2" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#e11d48"/><stop offset="100%" stop-color="#4c0519"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_ev2)" stroke="#160e26" stroke-width="2.4"/>
           <polygon points="8,13 15,16 10,19" fill="#fef08a" stroke="#160e26" stroke-width="1.6" stroke-linejoin="round"/>
           <polygon points="24,13 17,16 22,19" fill="#fef08a" stroke="#160e26" stroke-width="1.6" stroke-linejoin="round"/>
           <path d="M16 2 V7 M16 25 V30 M2 16 H7 M25 16 H30" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  fury: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ev3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M16 3 C22 10 26 14 26 20 C26 26 21.5 29 16 29 C10.5 29 6 26 6 20 C6 15 9 12 11 10 C11 13 13 14 14 12 C14 8 15 5 16 3 Z" fill="url(#p2_ev3)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <path d="M16 15 C19 19 20 24 16 26 C12 24 13 19 16 15 Z" fill="#fef9c3"/></svg>`,
  feast: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ev4a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="58%" stop-color="#facc15"/><stop offset="100%" stop-color="#d97706"/></radialGradient><radialGradient id="p2_ev4b" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#bbf7d0"/><stop offset="58%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><circle cx="11" cy="20" r="6.5" fill="url(#p2_ev4b)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="22" cy="19" r="5.5" fill="url(#p2_ev4a)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="16" cy="10" r="6.5" fill="url(#p2_ev4a)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="14" cy="8" r="1.8" fill="#fff"/>
           <circle cx="9.5" cy="18" r="1.6" fill="#fff"/></svg>`,
} as const;

export const ENEMY_SPRITES_V2 = {
  healer: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_hl_b" cx="38%" cy="30%" r="70%"><stop offset="0%" stop-color="#ccfbf1"/><stop offset="58%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#0f766e"/></radialGradient><linearGradient id="p2_hl_c" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f0fdf4"/><stop offset="100%" stop-color="#4ade80"/></linearGradient></defs><!-- Floating healing petals -->
           <circle cx="64" cy="14" r="9" fill="#5eead4" stroke="#160e26" stroke-width="4"/>
           <circle cx="64" cy="114" r="9" fill="#5eead4" stroke="#160e26" stroke-width="4"/>
           <circle cx="14" cy="64" r="9" fill="#5eead4" stroke="#160e26" stroke-width="4"/>
           <circle cx="114" cy="64" r="9" fill="#5eead4" stroke="#160e26" stroke-width="4"/>
           <!-- Round jelly cell -->
           <circle cx="64" cy="64" r="42" fill="url(#p2_hl_b)" stroke="#160e26" stroke-width="5.5"/>
           <path d="M98 46 C106 72 90 100 62 102 C46 103 34 94 28 84 C52 96 84 86 98 46 Z" fill="#134e4a" opacity="0.28"/>
           <!-- Cartoon medical bio-cross -->
           <path d="M54 40 H74 V54 H88 V74 H74 V88 H54 V74 H40 V54 H54 Z" fill="url(#p2_hl_c)" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <ellipse cx="46" cy="36" rx="9" ry="4.5" fill="#fff" opacity="0.75" transform="rotate(-30 46 36)"/></svg>`,
  mirror: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="p2_mir_s" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient><radialGradient id="p2_mir_b" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#e0e7ff"/><stop offset="58%" stop-color="#818cf8"/><stop offset="100%" stop-color="#312e81"/></radialGradient></defs><!-- Rear prismatic body (-X) -->
           <polygon points="18,64 46,28 86,36 86,92 46,100" fill="url(#p2_mir_b)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Curved mirror reflector shield facing RIGHT (+X) -->
           <path d="M78 16 C116 26 122 102 78 112 L68 96 C96 86 98 42 68 32 Z" fill="url(#p2_mir_s)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Mirror gleam lines -->
           <path d="M88 34 C104 48 104 80 88 94" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.9"/>
           <!-- Prism eye looking +X -->
           <polygon points="44,64 62,50 76,64 62,78" fill="#fef08a" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <circle cx="63" cy="64" r="5" fill="#160e26"/>
           <circle cx="60" cy="61" r="2" fill="#fff"/></svg>`,
  colony: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_col_b" cx="42%" cy="34%" r="66%"><stop offset="0%" stop-color="#f5d0fe"/><stop offset="58%" stop-color="#c026d3"/><stop offset="100%" stop-color="#581c87"/></radialGradient><radialGradient id="p2_col_p" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#f472b6"/><stop offset="100%" stop-color="#9d174d"/></radialGradient></defs><!-- Lobed hive membrane -->
           <path d="M64 14 C86 14 96 28 108 42 C118 54 118 76 106 90 C94 106 82 114 64 114 C46 114 34 106 22 90 C10 76 10 54 20 42 C32 28 42 14 64 14 Z" fill="url(#p2_col_b)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Brood chambers -->
           <circle cx="44" cy="54" r="16" fill="url(#p2_col_p)" stroke="#160e26" stroke-width="4.5"/>
           <circle cx="84" cy="54" r="16" fill="url(#p2_col_p)" stroke="#160e26" stroke-width="4.5"/>
           <circle cx="64" cy="84" r="18" fill="url(#p2_col_p)" stroke="#160e26" stroke-width="4.5"/>
           <!-- Tiny glowing eyes inside brood eggs -->
           <circle cx="41" cy="53" r="2.6" fill="#160e26"/><circle cx="47" cy="53" r="2.6" fill="#160e26"/>
           <circle cx="81" cy="53" r="2.6" fill="#160e26"/><circle cx="87" cy="53" r="2.6" fill="#160e26"/>
           <circle cx="60" cy="83" r="3" fill="#160e26"/><circle cx="68" cy="83" r="3" fill="#160e26"/>
           <!-- Glossy bubbles -->
           <ellipse cx="40" cy="44" rx="5" ry="2.6" fill="#fff" opacity="0.8" transform="rotate(-25 40 44)"/>
           <ellipse cx="80" cy="44" rx="5" ry="2.6" fill="#fff" opacity="0.8" transform="rotate(-25 80 44)"/></svg>`,
  splitter: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_spl_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="58%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#155e75"/></radialGradient><radialGradient id="p2_spl_b" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fbcfe8"/><stop offset="58%" stop-color="#ec4899"/><stop offset="100%" stop-color="#831843"/></radialGradient></defs><!-- Mitosis peanut silhouette -->
           <path d="M40 24 C56 24 58 46 64 46 C70 46 72 24 88 24 C108 24 118 42 118 64 C118 86 108 104 88 104 C72 104 70 82 64 82 C58 82 56 104 40 104 C20 104 10 86 10 64 C10 42 20 24 40 24 Z" fill="url(#p2_spl_a)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Tension seam -->
           <path d="M64 48 V80" stroke="#160e26" stroke-width="4" stroke-dasharray="5 5" stroke-linecap="round"/>
           <!-- Two mischievous nuclei -->
           <circle cx="38" cy="64" r="14" fill="url(#p2_spl_b)" stroke="#160e26" stroke-width="4"/>
           <circle cx="90" cy="64" r="14" fill="url(#p2_spl_b)" stroke="#160e26" stroke-width="4"/>
           <circle cx="38" cy="64" r="4.5" fill="#fef08a"/>
           <circle cx="90" cy="64" r="4.5" fill="#fef08a"/>
           <ellipse cx="30" cy="40" rx="8" ry="4" fill="#fff" opacity="0.65" transform="rotate(-25 30 40)"/>
           <ellipse cx="84" cy="40" rx="8" ry="4" fill="#fff" opacity="0.65" transform="rotate(-25 84 40)"/></svg>`,
  brood: `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><radialGradient id="p2_brd_a" cx="40%" cy="32%" r="68%"><stop offset="0%" stop-color="#f9a8d4"/><stop offset="58%" stop-color="#e11d48"/><stop offset="100%" stop-color="#881337"/></radialGradient></defs><!-- Wiggly tail (-X) -->
           <path d="M6 32 Q14 24 22 32 Q14 40 6 32 Z" fill="#fda4af" stroke="#160e26" stroke-width="3.2" stroke-linejoin="round"/>
           <!-- Tiny bite spikes (+X) -->
           <polygon points="48,24 58,27 50,31" fill="#fef08a" stroke="#160e26" stroke-width="2.5" stroke-linejoin="round"/>
           <polygon points="48,40 58,37 50,33" fill="#fef08a" stroke="#160e26" stroke-width="2.5" stroke-linejoin="round"/>
           <!-- Chubby round larva body -->
           <ellipse cx="36" cy="32" rx="18" ry="16" fill="url(#p2_brd_a)" stroke="#160e26" stroke-width="3.8"/>
           <!-- Cute angry eyes facing +X -->
           <circle cx="43" cy="26" r="4" fill="#fef08a" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="44.5" cy="26" r="1.8" fill="#160e26"/>
           <circle cx="43" cy="38" r="4" fill="#fef08a" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="44.5" cy="38" r="1.8" fill="#160e26"/>
           <ellipse cx="30" cy="23" rx="5.5" ry="2.8" fill="#fff" opacity="0.65" transform="rotate(-18 30 23)"/></svg>`,
} as const;

export const PLAYER_SPRITES = {
  projNeedle: `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><linearGradient id="p2_ndl_a" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#fb923c"/><stop offset="100%" stop-color="#e11d48"/></linearGradient></defs><!-- Rear bio-energy feathers (-X) -->
           <path d="M6 20 L24 27 L18 32 L24 37 L6 44 L14 32 Z" fill="#38bdf8" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <!-- Razor spike body pointing +X -->
           <path d="M16 25 L59 32 L16 39 L23 32 Z" fill="url(#p2_ndl_a)" stroke="#160e26" stroke-width="3.6" stroke-linejoin="round"/>
           <path d="M26 30 L50 32" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/></svg>`,
  playerNucleus: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_nuc_o" cx="38%" cy="30%" r="68%"><stop offset="0%" stop-color="#a7f3d0"/><stop offset="58%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></radialGradient><radialGradient id="p2_nuc_i" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></radialGradient></defs><!-- Outer living gel membrane -->
           <circle cx="64" cy="64" r="52" fill="url(#p2_nuc_o)" stroke="#160e26" stroke-width="6.5"/>
           <!-- Cel-shaded rim shadow -->
           <path d="M108 42 C118 76 96 112 60 112 C40 112 24 100 18 84 C46 102 92 94 108 42 Z" fill="#022c22" opacity="0.3"/>
           <!-- Inner luminous organelles -->
           <circle cx="42" cy="80" r="9" fill="#6ee7b7" stroke="#160e26" stroke-width="3.5" opacity="0.85"/>
           <circle cx="88" cy="76" r="7" fill="#34d399" stroke="#160e26" stroke-width="3.5" opacity="0.85"/>
           <circle cx="84" cy="40" r="6" fill="#a7f3d0" stroke="#160e26" stroke-width="3" opacity="0.85"/>
           <!-- Vibrant core nucleus -->
           <circle cx="64" cy="62" r="26" fill="url(#p2_nuc_i)" stroke="#160e26" stroke-width="5"/>
           <circle cx="64" cy="62" r="11" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <!-- Glossy cartoon speculars -->
           <ellipse cx="44" cy="34" rx="14" ry="7" fill="#fff" opacity="0.72" transform="rotate(-32 44 34)"/>
           <circle cx="58" cy="54" r="4.5" fill="#fff" opacity="0.9"/></svg>`,
} as const;

export const HYBRID_SPRITES = {
  plasma_leviathan: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h1_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient><linearGradient id="p2_h1_b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><circle cx="24" cy="24" r="20" fill="url(#p2_h1_b)" stroke="#160e26" stroke-width="3"/>
           <path d="M10 26 C12 12 24 8 38 14 C32 20 34 28 38 34 C26 40 12 36 10 26 Z" fill="url(#p2_h1_a)" stroke="#160e26" stroke-width="2.8" stroke-linejoin="round"/>
           <circle cx="22" cy="20" r="3.5" fill="#fef08a" stroke="#160e26" stroke-width="2"/>
           <polygon points="31,20 39,24 31,28" fill="#fff" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/></svg>`,
  ouroboros: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h2_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#10b981"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><circle cx="24" cy="24" r="16" stroke="url(#p2_h2_a)" stroke-width="8"/>
           <circle cx="24" cy="24" r="20" stroke="#160e26" stroke-width="2.6"/>
           <circle cx="24" cy="24" r="12" stroke="#160e26" stroke-width="2.6"/>
           <!-- Serpent head -->
           <path d="M20 4 L34 9 L22 15 Z" fill="#fef08a" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="25" cy="8.5" r="1.6" fill="#160e26"/></svg>`,
  phase_serpent: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h3_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><path d="M9 36 C12 22 24 28 24 18 C24 12 30 8 40 10 L34 20 C29 19 30 30 22 36 C16 40 12 40 9 36 Z" fill="url(#p2_h3_a)" stroke="#160e26" stroke-width="2.8" stroke-linejoin="round"/>
           <circle cx="32" cy="13" r="2.2" fill="#fef08a" stroke="#160e26" stroke-width="1.4"/>
           <path d="M8 14 H18 M30 38 H40" stroke="#67e8f9" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  spore_reactor: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="p2_h4_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><circle cx="24" cy="24" r="19" fill="#14532d" stroke="#160e26" stroke-width="3"/>
           <circle cx="24" cy="13" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="14" cy="30" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="34" cy="30" r="6.5" fill="url(#p2_h4_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="24" cy="24" r="5" fill="#fef9c3" stroke="#160e26" stroke-width="2.4"/></svg>`,
  ion_colossus: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_h5_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></linearGradient><radialGradient id="p2_h5_c" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#ffffff"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs><polygon points="24,4 42,14 40,34 24,44 8,34 6,14" fill="url(#p2_h5_a)" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <circle cx="24" cy="24" r="10" fill="url(#p2_h5_c)" stroke="#160e26" stroke-width="2.6"/>
           <polygon points="25,16 19,25 24,25 23,32 29,23 24,23" fill="#fef08a"/></svg>`,
  psi_web: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="p2_h6_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#f5d0fe"/><stop offset="58%" stop-color="#a855f7"/><stop offset="100%" stop-color="#4c1d95"/></radialGradient></defs><polygon points="24,6 40,15 40,33 24,42 8,33 8,15" fill="#2e1065" stroke="#c084fc" stroke-width="2.8" stroke-linejoin="round"/>
           <path d="M24 6 V42 M8 15 L40 33 M40 15 L8 33" stroke="#e879f9" stroke-width="2.2"/>
           <circle cx="24" cy="24" r="8" fill="url(#p2_h6_a)" stroke="#160e26" stroke-width="2.6"/>
           <circle cx="24" cy="24" r="3" fill="#fef08a"/></svg>`,
} as const;

export type EnemySpriteV2Key = keyof typeof ENEMY_SPRITES_V2;
export type PlayerSpriteKey = keyof typeof PLAYER_SPRITES;
export type HybridSpriteKey = keyof typeof HYBRID_SPRITES;

export const svgToTextureV2 = svgToTexture;

export async function loadBiopunkTexturesV2() {
  const enemies = {} as Record<EnemySpriteV2Key, Texture>;
  const player = {} as Record<PlayerSpriteKey, Texture>;
  const hybrids = {} as Record<HybridSpriteKey, Texture>;

  await Promise.all([
    ...(Object.keys(ENEMY_SPRITES_V2) as EnemySpriteV2Key[]).map(async (key) => {
      enemies[key] = await svgToTextureV2(ENEMY_SPRITES_V2[key]);
    }),
    ...(Object.keys(PLAYER_SPRITES) as PlayerSpriteKey[]).map(async (key) => {
      player[key] = await svgToTextureV2(PLAYER_SPRITES[key]);
    }),
    ...(Object.keys(HYBRID_SPRITES) as HybridSpriteKey[]).map(async (key) => {
      hybrids[key] = await svgToTextureV2(HYBRID_SPRITES[key]);
    }),
  ]);

  return { enemies, player, hybrids };
}
