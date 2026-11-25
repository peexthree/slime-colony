// svgAssets.ts — EvoToon Pack 2 (полноцветный мультяшный cel-shaded стиль с обводкой #160e26)
import { Texture } from 'pixi.js';

export const UI_ICONS = {
  vermis: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_dv_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fda4af"/><stop offset="52%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></linearGradient></defs><path d="M7 24 C6 13 13 5 25 6 C21 12 20 17 24 22 C18 26 11 27 7 24 Z" fill="url(#p2_dv_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="17" cy="14" r="3.6" fill="#fef08a" stroke="#160e26" stroke-width="1.8"/>
           <ellipse cx="17.5" cy="14" rx="1.2" ry="2.6" fill="#160e26"/>
           <polygon points="22,19 28,17 24,23" fill="#fff" stroke="#160e26" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  chimera: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_dc_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><polygon points="16,3 27,10 25,24 16,29 7,24 5,10" fill="url(#p2_dc_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <polygon points="16,8 21,15 16,24 11,15" fill="#fff7ed" opacity="0.65" stroke="#160e26" stroke-width="1.8" stroke-linejoin="round"/>
           <path d="M7 10 L3 5 M25 10 L29 5" stroke="#160e26" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  mycelium: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_dm_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><rect x="12" y="18" width="8" height="10" rx="3" fill="#fef3c7" stroke="#160e26" stroke-width="2.2"/>
           <path d="M4 19 C4 9 10 5 16 5 C22 5 28 9 28 19 Z" fill="url(#p2_dm_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <circle cx="12" cy="12" r="2.4" fill="#fef08a" stroke="#160e26" stroke-width="1.4"/>
           <circle cx="20" cy="13" r="2.6" fill="#fef08a" stroke="#160e26" stroke-width="1.4"/></svg>`,
  symbiont: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ds_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><polygon points="16,3 26,14 20,28 12,28 6,14" fill="url(#p2_ds_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <polygon points="16,3 20,14 16,28 12,14" fill="#fff" opacity="0.5" stroke="#160e26" stroke-width="1.6"/>
           <circle cx="16" cy="14" r="2.2" fill="#fef08a"/></svg>`,
  weaponSpikes: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_ws_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#fb923c"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><polygon points="6,11 28,6 14,17" fill="url(#p2_ws_a)" stroke="#160e26" stroke-width="2.2" stroke-linejoin="round"/>
           <polygon points="4,21 29,16 14,26" fill="url(#p2_ws_a)" stroke="#160e26" stroke-width="2.2" stroke-linejoin="round"/>
           <polygon points="10,27 26,25 16,30" fill="#fde047" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/></svg>`,
  weaponOrbs: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_wo_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs><circle cx="16" cy="16" r="10.5" stroke="#67e8f9" stroke-width="2.2" stroke-dasharray="4 3"/>
           <circle cx="16" cy="5.5" r="4" fill="url(#p2_wo_a)" stroke="#160e26" stroke-width="2"/>
           <circle cx="7" cy="21" r="4" fill="url(#p2_wo_a)" stroke="#160e26" stroke-width="2"/>
           <circle cx="25" cy="21" r="4" fill="url(#p2_wo_a)" stroke="#160e26" stroke-width="2"/>
           <circle cx="16" cy="16" r="3" fill="#fef08a" stroke="#160e26" stroke-width="1.8"/></svg>`,
  weaponNova: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_wn_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#f472b6"/><stop offset="100%" stop-color="#9333ea"/></radialGradient></defs><path d="M16 2 L19 10 L28 7 L23 15 L30 20 L21 22 L22 30 L16 24 L10 30 L11 22 L2 20 L9 15 L4 7 L13 10 Z" fill="url(#p2_wn_a)" stroke="#160e26" stroke-width="2.2" stroke-linejoin="round"/>
           <circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#160e26" stroke-width="1.8"/></svg>`,
  weaponAura: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_wa_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#4ade80"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_wa_a)" opacity="0.35" stroke="#84cc16" stroke-width="2.6" stroke-dasharray="4 3"/>
           <circle cx="16" cy="16" r="7" fill="url(#p2_wa_a)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="14" cy="14" r="1.8" fill="#fef08a"/></svg>`,
  skillCall: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_sc_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs><path d="M5 16 A11 11 0 0 1 16 5" stroke="#67e8f9" stroke-width="2.6" stroke-linecap="round"/>
           <path d="M27 16 A11 11 0 0 1 16 27" stroke="#67e8f9" stroke-width="2.6" stroke-linecap="round"/>
           <path d="M16 5 A11 11 0 0 1 27 16" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round"/>
           <path d="M16 27 A11 11 0 0 1 5 16" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round"/>
           <circle cx="16" cy="16" r="6" fill="url(#p2_sc_a)" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="16" cy="16" r="2.2" fill="#fff"/></svg>`,
  nodeGen: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ng_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></radialGradient></defs><polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="url(#p2_ng_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <polygon points="17,8 11,17 16,17 15,24 21,15 16,15" fill="#fff" stroke="#160e26" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  nodeAmp: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_na_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_na_a)" stroke="#160e26" stroke-width="2.4"/>
           <path d="M16 8 L23 16 H19 V24 H13 V16 H9 Z" fill="#fef08a" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/></svg>`,
  nodeMagnet: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_nm_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><circle cx="16" cy="16" r="12" fill="#1e293b" stroke="#160e26" stroke-width="2.4"/>
           <path d="M10 10 V17 C10 21 12.5 23.5 16 23.5 C19.5 23.5 22 21 22 17 V10 H18.5 V17 C18.5 18.8 17.4 20 16 20 C14.6 20 13.5 18.8 13.5 17 V10 Z" fill="url(#p2_nm_a)" stroke="#160e26" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  nodeMutagen: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_nmu_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#e9d5ff"/><stop offset="58%" stop-color="#a855f7"/><stop offset="100%" stop-color="#581c87"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_nmu_a)" stroke="#160e26" stroke-width="2.4"/>
           <path d="M11 9 C21 12 21 16 11 19 C21 22 21 24 11 25" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round"/>
           <path d="M21 9 C11 12 11 16 21 19 C11 22 11 24 21 25" stroke="#67e8f9" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  nodeIncubator: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ni_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#bbf7d0"/><stop offset="58%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></radialGradient></defs><path d="M16 4 C23 4 27 11 26 20 C25 25 21 28 16 28 C11 28 7 25 6 20 C5 11 9 4 16 4 Z" fill="url(#p2_ni_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="16" cy="17" r="5.5" fill="#fef08a" stroke="#160e26" stroke-width="2"/>
           <circle cx="14.5" cy="15.5" r="1.5" fill="#fff"/></svg>`,
} as const;

export const ENEMY_SPRITES = {
  grub: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_grub_b" cx="40%" cy="30%" r="68%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></radialGradient><radialGradient id="p2_grub_t" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fecdd3"/><stop offset="58%" stop-color="#fb7185"/><stop offset="100%" stop-color="#be123c"/></radialGradient></defs><!-- Rear tail segments (-X) -->
           <ellipse cx="26" cy="64" rx="14" ry="16" fill="url(#p2_grub_t)" stroke="#160e26" stroke-width="5"/>
           <ellipse cx="48" cy="64" rx="20" ry="24" fill="url(#p2_grub_t)" stroke="#160e26" stroke-width="5"/>
           <!-- Front mandibles (+X) -->
           <path d="M100 50 Q116 44 120 55 Q111 58 103 58 Z" fill="#fef08a" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <path d="M100 78 Q116 84 120 73 Q111 70 103 70 Z" fill="#fef08a" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <!-- Main head/thorax body -->
           <ellipse cx="76" cy="64" rx="30" ry="32" fill="url(#p2_grub_b)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Cel shadow bottom -->
           <path d="M52 78 C64 94 94 92 102 74 C92 84 68 86 52 78 Z" fill="#4c0519" opacity="0.35"/>
           <!-- Glossy back shine -->
           <ellipse cx="68" cy="46" rx="11" ry="5" fill="#fff" opacity="0.55" transform="rotate(-14 68 46)"/>
           <!-- Angry cartoon eyes facing +X -->
           <circle cx="88" cy="52" r="8" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="91" cy="52" r="3.4" fill="#160e26"/>
           <circle cx="87" cy="49" r="2" fill="#fff"/>
           <circle cx="88" cy="76" r="8" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="91" cy="76" r="3.4" fill="#160e26"/>
           <circle cx="87" cy="73" r="2" fill="#fff"/>
           <!-- Cute brow lines -->
           <path d="M80 43 L95 47" stroke="#160e26" stroke-width="3.5" stroke-linecap="round"/>
           <path d="M80 85 L95 81" stroke="#160e26" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  runner: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="p2_run_a" x1="0%" y1="20%" x2="100%" y2="80%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#fb923c"/><stop offset="100%" stop-color="#dc2626"/></linearGradient><linearGradient id="p2_run_f" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fdba74"/><stop offset="52%" stop-color="#ea580c"/><stop offset="100%" stop-color="#7c2d12"/></linearGradient></defs><!-- Speed trail fin back (-X) -->
           <path d="M12 64 L40 50 L34 64 L40 78 Z" fill="#fef08a" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <!-- Swept-back predator wings -->
           <path d="M70 46 L22 14 L38 52 Z" fill="url(#p2_run_f)" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <path d="M70 82 L22 114 L38 76 Z" fill="url(#p2_run_f)" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <!-- Sleek dart fuselage facing +X -->
           <path d="M28 64 C36 42 68 34 118 64 C68 94 36 86 28 64 Z" fill="url(#p2_run_a)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Racing stripe -->
           <path d="M46 64 H98" stroke="#fff7ed" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
           <!-- Sharp glowing eyes -->
           <polygon points="74,48 92,55 78,58" fill="#fef08a" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <polygon points="74,80 92,73 78,70" fill="#fef08a" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/></svg>`,
  spitter: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_spit_b" cx="42%" cy="30%" r="68%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#166534"/></radialGradient><radialGradient id="p2_spit_c" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#bef264"/><stop offset="100%" stop-color="#3f6212"/></radialGradient></defs><!-- Wavy tentacles -->
           <g fill="none" stroke="#65a30d" stroke-width="9" stroke-linecap="round">
             <path d="M36 78 C28 94 40 104 30 116"/>
             <path d="M56 82 C50 98 62 108 54 120"/>
             <path d="M72 82 C78 98 66 108 74 120"/>
             <path d="M92 78 C100 94 88 104 98 116"/>
           </g>
           <g fill="none" stroke="#160e26" stroke-width="3.5" stroke-linecap="round">
             <path d="M36 78 C28 94 40 104 30 116"/>
             <path d="M56 82 C50 98 62 108 54 120"/>
             <path d="M72 82 C78 98 66 108 74 120"/>
             <path d="M92 78 C100 94 88 104 98 116"/>
           </g>
           <!-- Bell dome -->
           <path d="M18 72 C18 28 38 14 64 14 C90 14 110 28 110 72 C98 84 82 78 64 84 C46 78 30 84 18 72 Z" fill="url(#p2_spit_b)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Venom sac inside -->
           <ellipse cx="64" cy="46" rx="22" ry="18" fill="url(#p2_spit_c)" stroke="#160e26" stroke-width="4"/>
           <!-- Cheeky spitting face -->
           <circle cx="52" cy="54" r="6" fill="#fff" stroke="#160e26" stroke-width="3"/>
           <circle cx="53" cy="54" r="2.6" fill="#160e26"/>
           <circle cx="76" cy="54" r="6" fill="#fff" stroke="#160e26" stroke-width="3"/>
           <circle cx="75" cy="54" r="2.6" fill="#160e26"/>
           <circle cx="64" cy="67" r="6" fill="#14532d" stroke="#160e26" stroke-width="3"/>
           <ellipse cx="44" cy="30" rx="10" ry="5" fill="#fff" opacity="0.7" transform="rotate(-25 44 30)"/></svg>`,
  brute: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="p2_br_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fcd34d"/><stop offset="52%" stop-color="#d97706"/><stop offset="100%" stop-color="#78350f"/></linearGradient><linearGradient id="p2_br_p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="52%" stop-color="#64748b"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><!-- Side shoulder spikes -->
           <polygon points="8,56 30,44 28,76" fill="#fef3c7" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="120,56 98,44 100,76" fill="#fef3c7" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="36,12 48,32 24,36" fill="#fef3c7" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="92,12 80,32 104,36" fill="#fef3c7" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <!-- Heavy armored hexagon shell -->
           <polygon points="64,16 106,36 108,88 64,114 20,88 22,36" fill="url(#p2_br_a)" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <!-- Metal-chitin plate bands -->
           <path d="M24 54 Q64 38 104 54 L100 72 Q64 58 28 72 Z" fill="url(#p2_br_p)" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <!-- Angry visor eyes -->
           <path d="M36 66 L58 72 L40 78 Z" fill="#fef08a" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <path d="M92 66 L70 72 L88 78 Z" fill="#fef08a" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <!-- Jaw plate -->
           <path d="M44 92 H84 L78 102 H50 Z" fill="#451a03" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <ellipse cx="52" cy="32" rx="14" ry="5" fill="#fff" opacity="0.45" transform="rotate(-10 52 32)"/></svg>`,
  pulsar: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_pul_c" cx="45%" cy="40%" r="62%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="58%" stop-color="#f97316"/><stop offset="100%" stop-color="#be123c"/></radialGradient><linearGradient id="p2_pul_r" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#ec4899"/><stop offset="100%" stop-color="#7e22ce"/></linearGradient></defs><!-- Rotating star blades -->
           <path d="M64 8 L76 34 L104 24 L92 52 L120 64 L92 76 L104 104 L76 94 L64 120 L52 94 L24 104 L36 76 L8 64 L36 52 L24 24 L52 34 Z" fill="url(#p2_pul_r)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <!-- Glowing core -->
           <circle cx="64" cy="64" r="28" fill="url(#p2_pul_c)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Spiral hazard core -->
           <circle cx="64" cy="64" r="14" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="64" cy="64" r="6" fill="#dc2626"/>
           <circle cx="56" cy="54" r="4" fill="#fff" opacity="0.85"/></svg>`,
  titan: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs><radialGradient id="p2_tit_b" cx="45%" cy="30%" r="68%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="58%" stop-color="#059669"/><stop offset="100%" stop-color="#064e3b"/></radialGradient><linearGradient id="p2_tit_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></linearGradient></defs><!-- Giant horn mandibles -->
           <path d="M36 30 C20 14 26 4 46 18 L48 36 Z" fill="url(#p2_tit_g)" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <path d="M92 30 C108 14 102 4 82 18 L80 36 Z" fill="url(#p2_tit_g)" stroke="#160e26" stroke-width="4.5" stroke-linejoin="round"/>
           <!-- Heavy layered carapace -->
           <path d="M64 20 C96 20 116 44 114 74 C112 104 90 118 64 118 C38 118 16 104 14 74 C12 44 32 20 64 20 Z" fill="url(#p2_tit_b)" stroke="#160e26" stroke-width="6"/>
           <!-- Gold dorsal ridge -->
           <path d="M64 22 L76 48 L64 112 L52 48 Z" fill="url(#p2_tit_g)" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <!-- Four glowing titan eyes -->
           <circle cx="42" cy="56" r="8" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="43" cy="56" r="3" fill="#160e26"/>
           <circle cx="86" cy="56" r="8" fill="#fef08a" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="85" cy="56" r="3" fill="#160e26"/>
           <circle cx="34" cy="72" r="5" fill="#fb923c" stroke="#160e26" stroke-width="2.8"/>
           <circle cx="94" cy="72" r="5" fill="#fb923c" stroke="#160e26" stroke-width="2.8"/>
           <!-- Gloss highlight -->
           <ellipse cx="44" cy="36" rx="9" ry="4" fill="#fff" opacity="0.55" transform="rotate(-24 44 36)"/></svg>`,
} as const;

export const PARTICLE_SPRITES = {
  xpSoul: `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><radialGradient id="p2_xp_a" cx="38%" cy="32%" r="65%"><stop offset="0%" stop-color="#ecfeff"/><stop offset="58%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0284c7"/></radialGradient></defs><circle cx="32" cy="32" r="26" fill="#22d3ee" opacity="0.24"/>
           <circle cx="32" cy="32" r="19" fill="url(#p2_xp_a)" stroke="#160e26" stroke-width="3.8"/>
           <!-- Tiny DNA sparkle inside -->
           <path d="M32 21 L35 29 L43 32 L35 35 L32 43 L29 35 L21 32 L29 29 Z" fill="#fef9c3" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/>
           <ellipse cx="25" cy="22" rx="4.5" ry="2.6" fill="#fff" opacity="0.9" transform="rotate(-30 25 22)"/></svg>`,
  spitVenom: `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><radialGradient id="p2_ven_a" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><path d="M12 32 C12 18 22 10 34 12 C48 14 54 22 54 32 C54 44 44 52 32 52 C20 52 12 44 12 32 Z" fill="url(#p2_ven_a)" stroke="#160e26" stroke-width="3.8"/>
           <circle cx="28" cy="28" r="5.5" fill="#fef9c3" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="40" cy="38" r="4" fill="#d9f99d" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="10" cy="18" r="3.5" fill="#a3e635" stroke="#160e26" stroke-width="2.2"/>
           <circle cx="54" cy="48" r="3" fill="#84cc16" stroke="#160e26" stroke-width="2"/></svg>`,
} as const;

export const UI_DECOR = {
  cornerFrame: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="p2_cf_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><path d="M6 42 V14 C6 9 9 6 14 6 H42 L34 14 H16 C14.5 14 14 14.5 14 16 V34 Z" fill="url(#p2_cf_a)" stroke="#160e26" stroke-width="3" stroke-linejoin="round"/>
           <circle cx="14" cy="14" r="4" fill="#fef08a" stroke="#160e26" stroke-width="2"/></svg>`,
  scaleBracket: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 48" fill="none"><defs><linearGradient id="p2_sb_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs><path d="M20 4 H10 C6 4 4 7 4 12 V36 C4 41 6 44 10 44 H20 L16 38 H11 V10 H16 Z" fill="url(#p2_sb_a)" stroke="#160e26" stroke-width="2.6" stroke-linejoin="round"/>
           <circle cx="7.5" cy="24" r="3" fill="#fef08a" stroke="#160e26" stroke-width="1.8"/></svg>`,
} as const;

export const NODE_SPRITES = {
  gen: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ng_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></radialGradient></defs><polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="url(#p2_ng_a)" stroke="#160e26" stroke-width="2.4" stroke-linejoin="round"/>
           <polygon points="17,8 11,17 16,17 15,24 21,15 16,15" fill="#fff" stroke="#160e26" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  amp: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_na_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_na_a)" stroke="#160e26" stroke-width="2.4"/>
           <path d="M16 8 L23 16 H19 V24 H13 V16 H9 Z" fill="#fef08a" stroke="#160e26" stroke-width="2" stroke-linejoin="round"/></svg>`,
  magnet: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="p2_nm_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><circle cx="16" cy="16" r="12" fill="#1e293b" stroke="#160e26" stroke-width="2.4"/>
           <path d="M10 10 V17 C10 21 12.5 23.5 16 23.5 C19.5 23.5 22 21 22 17 V10 H18.5 V17 C18.5 18.8 17.4 20 16 20 C14.6 20 13.5 18.8 13.5 17 V10 Z" fill="url(#p2_nm_a)" stroke="#160e26" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  mutagen: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_nmu_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#e9d5ff"/><stop offset="58%" stop-color="#a855f7"/><stop offset="100%" stop-color="#581c87"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#p2_nmu_a)" stroke="#160e26" stroke-width="2.4"/>
           <path d="M11 9 C21 12 21 16 11 19 C21 22 21 24 11 25" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round"/>
           <path d="M21 9 C11 12 11 16 21 19 C11 22 11 24 21 25" stroke="#67e8f9" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  incubator: `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><radialGradient id="p2_ni_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#bbf7d0"/><stop offset="58%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></radialGradient></defs><path d="M16 4 C23 4 27 11 26 20 C25 25 21 28 16 28 C11 28 7 25 6 20 C5 11 9 4 16 4 Z" fill="url(#p2_ni_a)" stroke="#160e26" stroke-width="2.4"/>
           <circle cx="16" cy="17" r="5.5" fill="#fef08a" stroke="#160e26" stroke-width="2"/>
           <circle cx="14.5" cy="15.5" r="1.5" fill="#fff"/></svg>`,
} as const;

export type EnemySpriteKey = keyof typeof ENEMY_SPRITES;
export type ParticleSpriteKey = keyof typeof PARTICLE_SPRITES;
export type NodeSpriteKey = keyof typeof NODE_SPRITES;

/**
 * Конвертирует SVG-строку в PixiJS v8 Texture через Data URI.
 * Если у SVG нет явных пиксельных width/height, подставляет их из viewBox во избежание искажения в Chromium.
 */
export async function svgToTexture(svgString: string): Promise<Texture> {
  let normalized = svgString;
  const vb = svgString.match(/viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/);
  if (vb) {
    const [, w, h] = vb;
    if (/width="100%"/.test(normalized)) {
      normalized = normalized
        .replace(/width="100%"/, `width="${w}"`)
        .replace(/height="100%"/, `height="${h}"`);
    } else if (!/\swidth="/.test(normalized.slice(0, normalized.indexOf('>')))) {
      normalized = normalized.replace(/^<svg\s+/, `<svg width="${w}" height="${h}" `);
    }
  }
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;
  return new Promise<Texture>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const tex = Texture.from(img);
        resolve(tex);
      } catch {
        resolve(Texture.WHITE);
      }
    };
    img.onerror = () => resolve(Texture.WHITE);
    img.src = dataUri;
  });
}

/**
 * Предзагрузка всех игровых спрайтов врагов, частиц и узлов при старте PixiOverlay.
 */
export async function loadBiopunkTextures() {
  const enemies = {} as Record<EnemySpriteKey, Texture>;
  const particles = {} as Record<ParticleSpriteKey, Texture>;
  const nodes = {} as Record<NodeSpriteKey, Texture>;

  await Promise.all([
    ...(Object.keys(ENEMY_SPRITES) as EnemySpriteKey[]).map(async (key) => {
      enemies[key] = await svgToTexture(ENEMY_SPRITES[key]);
    }),
    ...(Object.keys(PARTICLE_SPRITES) as ParticleSpriteKey[]).map(async (key) => {
      particles[key] = await svgToTexture(PARTICLE_SPRITES[key]);
    }),
    ...(Object.keys(NODE_SPRITES) as NodeSpriteKey[]).map(async (key) => {
      nodes[key] = await svgToTexture(NODE_SPRITES[key]);
    }),
  ]);

  return { enemies, particles, nodes };
}

export * from './svgAssetsV2';
export * from './svgAssetsV3';
export * from './svgAssetsV4';
