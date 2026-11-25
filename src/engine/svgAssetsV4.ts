// svgAssetsV4.ts — EvoToon Pack (84 cartoon cel-shaded SVGs: 25 canvas sprites + UI/HUD symbols)
import { Texture } from 'pixi.js';
import type { EliteMutation, HybridId } from './types';
import { svgToTexture } from './svgAssets';

export type AnomalyKind = 'acid' | 'cocoon' | 'bloom';

function sizedSvg(svg: string, size: number): string {
  return svg.replace(/width="100%"\s+height="100%"/, `width="${size}" height="${size}"`);
}

export const ENEMY_SPRITES_V4 = {
  boss: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="eb_body" cx="45%" cy="35%" r="65%"><stop offset="0%" stop-color="#f472b6"/><stop offset="58%" stop-color="#9333ea"/><stop offset="100%" stop-color="#3b0764"/></radialGradient><linearGradient id="eb_horn" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#9a3412"/></linearGradient><linearGradient id="eb_plate" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="52%" stop-color="#6b21a8"/><stop offset="100%" stop-color="#2e1065"/></linearGradient><radialGradient id="eb_eye" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#facc15"/><stop offset="100%" stop-color="#ea580c"/></radialGradient></defs><!-- Outer cycle crest spikes -->
           <g fill="url(#eb_horn)" stroke="#160e26" stroke-width="7" stroke-linejoin="round">
             <path d="M128 12 L108 58 L148 58 Z"/>
             <path d="M60 32 L78 82 L106 60 Z"/>
             <path d="M196 32 L178 82 L150 60 Z"/>
             <path d="M18 118 L62 98 L62 146 Z"/>
             <path d="M238 118 L194 98 L194 146 Z"/>
           </g>
           <!-- Massive pincer arms -->
           <path d="M48 152 C18 176 24 222 68 232 C56 212 58 194 74 182 Z" fill="url(#eb_horn)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <path d="M208 152 C238 176 232 222 188 232 C200 212 198 194 182 182 Z" fill="url(#eb_horn)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <!-- Main boss carapace body -->
           <path d="M128 44 C182 44 214 82 212 134 C210 186 176 226 128 228 C80 226 46 186 44 134 C42 82 74 44 128 44 Z" fill="url(#eb_body)" stroke="#160e26" stroke-width="9"/>
           <!-- Cel-shaded lower armor shadow -->
           <path d="M198 106 C206 164 176 218 128 222 C90 222 62 198 52 164 C88 196 172 188 198 106 Z" fill="#1e0536" opacity="0.38"/>
           <!-- Armored brow plates -->
           <path d="M62 106 Q128 74 194 106 L184 126 Q128 102 72 126 Z" fill="url(#eb_plate)" stroke="#160e26" stroke-width="6.5" stroke-linejoin="round"/>
           <!-- Three glowing cartoon eyes -->
           <circle cx="128" cy="118" r="20" fill="url(#eb_eye)" stroke="#160e26" stroke-width="6"/>
           <ellipse cx="128" cy="118" rx="5.5" ry="13" fill="#160e26"/>
           <circle cx="122" cy="111" r="4.5" fill="#fff"/>
           <circle cx="88" cy="138" r="14" fill="url(#eb_eye)" stroke="#160e26" stroke-width="5.5"/>
           <circle cx="91" cy="138" r="5" fill="#160e26"/>
           <circle cx="84" cy="133" r="3.5" fill="#fff"/>
           <circle cx="168" cy="138" r="14" fill="url(#eb_eye)" stroke="#160e26" stroke-width="5.5"/>
           <circle cx="165" cy="138" r="5" fill="#160e26"/>
           <circle cx="164" cy="133" r="3.5" fill="#fff"/>
           <!-- Jagged mouth with cartoon fangs -->
           <path d="M84 172 Q128 198 172 172 Q154 208 128 208 Q102 208 84 172 Z" fill="#310626" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <polygon points="98,178 106,196 114,182" fill="#fff" stroke="#160e26" stroke-width="3.5" stroke-linejoin="round"/>
           <polygon points="158,178 150,196 142,182" fill="#fff" stroke="#160e26" stroke-width="3.5" stroke-linejoin="round"/>
           <polygon points="122,185 128,198 134,185" fill="#fff" stroke="#160e26" stroke-width="3.5" stroke-linejoin="round"/>
           <!-- Glossy dome specular -->
           <ellipse cx="96" cy="70" rx="22" ry="9" fill="#fff" opacity="0.38" transform="rotate(-18 96 70)"/></svg>`,
} as const;

export const ANOMALY_SPRITES_V4: Record<AnomalyKind, string> = {
  cocoon: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="ac_web" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#f0abfc"/><stop offset="58%" stop-color="#a855f7"/><stop offset="100%" stop-color="#3b0764"/></radialGradient><radialGradient id="ac_shell" cx="40%" cy="30%" r="70%"><stop offset="0%" stop-color="#fde68a"/><stop offset="58%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></radialGradient><radialGradient id="ac_egg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#65a30d"/><stop offset="100%" stop-color="#14532d"/></radialGradient></defs><!-- Sticky silk anchor web -->
           <path d="M26 156 Q80 144 128 198 Q176 144 230 156 Q190 218 128 232 Q66 218 26 156 Z" fill="url(#ac_web)" opacity="0.45" stroke="#160e26" stroke-width="5"/>
           <!-- Main cocoon pod -->
           <path d="M128 24 C178 24 208 78 202 146 C196 196 168 224 128 224 C88 224 60 196 54 146 C48 78 78 24 128 24 Z" fill="url(#ac_shell)" stroke="#160e26" stroke-width="8"/>
           <!-- Silk wrappings -->
           <path d="M62 104 Q128 132 194 98" stroke="#78350f" stroke-width="7" stroke-linecap="round" opacity="0.5"/>
           <path d="M56 152 Q128 182 200 148" stroke="#78350f" stroke-width="7" stroke-linecap="round" opacity="0.5"/>
           <path d="M74 64 Q128 84 182 62" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
           <!-- Translucent egg window -->
           <ellipse cx="128" cy="128" rx="44" ry="52" fill="#451a03" opacity="0.35"/>
           <circle cx="114" cy="116" r="18" fill="url(#ac_egg)" stroke="#160e26" stroke-width="5"/>
           <circle cx="144" cy="134" r="16" fill="url(#ac_egg)" stroke="#160e26" stroke-width="5"/>
           <circle cx="118" cy="150" r="14" fill="url(#ac_egg)" stroke="#160e26" stroke-width="5"/>
           <!-- Highlights -->
           <ellipse cx="108" cy="110" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 108 110)"/>
           <ellipse cx="139" cy="128" rx="5" ry="3" fill="#fff" opacity="0.85" transform="rotate(-30 139 128)"/>
           <!-- Top crown opening -->
           <ellipse cx="128" cy="30" rx="26" ry="10" fill="#fef3c7" stroke="#160e26" stroke-width="6"/></svg>`,
  acid: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="aa_pool" cx="45%" cy="45%" r="55%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#15803d"/></radialGradient><radialGradient id="aa_bub" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="58%" stop-color="#a3e635"/><stop offset="100%" stop-color="#3f6212"/></radialGradient></defs><!-- Outer toxic ooze blot -->
           <path d="M44 128 C34 86 76 42 126 46 C164 49 184 32 210 66 C236 100 228 158 196 190 C168 218 118 226 78 206 C42 188 52 162 44 128 Z" fill="url(#aa_pool)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <!-- Inner glowing caustic ring -->
           <path d="M74 132 C70 98 100 74 134 78 C168 82 194 106 184 146 C174 182 132 190 100 176 C78 166 76 150 74 132 Z" fill="#bef264" opacity="0.45"/>
           <!-- Cartoon acid bubbles -->
           <circle cx="102" cy="112" r="22" fill="url(#aa_bub)" stroke="#160e26" stroke-width="5.5"/>
           <circle cx="156" cy="146" r="18" fill="url(#aa_bub)" stroke="#160e26" stroke-width="5"/>
           <circle cx="152" cy="96" r="12" fill="url(#aa_bub)" stroke="#160e26" stroke-width="4.5"/>
           <circle cx="96" cy="160" r="10" fill="url(#aa_bub)" stroke="#160e26" stroke-width="4"/>
           <!-- Specular shine on bubbles -->
           <ellipse cx="95" cy="105" rx="7" ry="4" fill="#fff" opacity="0.9" transform="rotate(-30 95 105)"/>
           <ellipse cx="150" cy="140" rx="5.5" ry="3.2" fill="#fff" opacity="0.9" transform="rotate(-30 150 140)"/>
           <!-- Droplets around perimeter -->
           <circle cx="30" cy="76" r="9" fill="#a3e635" stroke="#160e26" stroke-width="4.5"/>
           <circle cx="226" cy="186" r="11" fill="#84cc16" stroke="#160e26" stroke-width="4.5"/></svg>`,
  bloom: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="ab_glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f9a8d4"/><stop offset="58%" stop-color="#ec4899"/><stop offset="100%" stop-color="#831843"/></radialGradient><radialGradient id="ab_cell" cx="38%" cy="35%" r="65%"><stop offset="0%" stop-color="#fbcfe8"/><stop offset="58%" stop-color="#f472b6"/><stop offset="100%" stop-color="#be185d"/></radialGradient></defs><!-- Starburst bloom aura -->
           <path d="M128 14 L148 64 L202 42 L182 94 L240 112 L192 146 L224 196 L166 188 L158 242 L124 200 L82 238 L86 184 L28 192 L62 144 L16 108 L74 94 L56 40 L108 64 Z" fill="url(#ab_glow)" opacity="0.55" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <!-- Mitosis dividing figure-8 cell -->
           <path d="M88 86 C110 86 120 106 128 106 C136 106 146 86 168 86 C194 86 212 106 212 128 C212 152 194 170 168 170 C146 170 136 150 128 150 C120 150 110 170 88 170 C62 170 44 152 44 128 C44 106 62 86 88 86 Z" fill="url(#ab_cell)" stroke="#160e26" stroke-width="7.5"/>
           <!-- Two glowing nuclei -->
           <circle cx="88" cy="128" r="19" fill="#fef08a" stroke="#160e26" stroke-width="5"/>
           <circle cx="168" cy="128" r="19" fill="#fef08a" stroke="#160e26" stroke-width="5"/>
           <circle cx="83" cy="122" r="5.5" fill="#fff"/>
           <circle cx="163" cy="122" r="5.5" fill="#fff"/></svg>`,
};

export const ELITE_OVERLAY_SPRITES_V4: Record<EliteMutation, string> = {
  armored: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="ea_p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e2e8f0"/><stop offset="52%" stop-color="#64748b"/><stop offset="100%" stop-color="#1e293b"/></linearGradient><linearGradient id="ea_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><!-- 4 curved armor shields orbiting center -->
           <path d="M72 34 Q128 10 184 34 L172 64 Q128 46 84 64 Z" fill="url(#ea_p)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <path d="M72 222 Q128 246 184 222 L172 192 Q128 210 84 192 Z" fill="url(#ea_p)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <path d="M34 72 Q10 128 34 184 L64 172 Q46 128 64 84 Z" fill="url(#ea_p)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <path d="M222 72 Q246 128 222 184 L192 172 Q210 128 192 84 Z" fill="url(#ea_p)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <!-- Golden rivets -->
           <circle cx="128" cy="36" r="7" fill="url(#ea_g)" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="128" cy="220" r="7" fill="url(#ea_g)" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="36" cy="128" r="7" fill="url(#ea_g)" stroke="#160e26" stroke-width="3.5"/>
           <circle cx="220" cy="128" r="7" fill="url(#ea_g)" stroke="#160e26" stroke-width="3.5"/></svg>`,
  enraged: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="ee_s" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><circle cx="128" cy="128" r="96" stroke="#f97316" stroke-width="6" stroke-dasharray="14 10" opacity="0.65"/>
           <g fill="url(#ee_s)" stroke="#160e26" stroke-width="6.5" stroke-linejoin="round">
             <polygon points="128,8 112,54 144,54"/>
             <polygon points="128,248 112,202 144,202"/>
             <polygon points="8,128 54,112 54,144"/>
             <polygon points="248,128 202,112 202,144"/>
             <polygon points="40,40 62,82 82,62"/>
             <polygon points="216,40 194,82 174,62"/>
             <polygon points="40,216 62,174 82,194"/>
             <polygon points="216,216 194,174 174,194"/>
           </g></svg>`,
  necromancer: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="en_orb" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d8b4fe"/><stop offset="58%" stop-color="#9333ea"/><stop offset="100%" stop-color="#3b0764"/></radialGradient><radialGradient id="en_wisp" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#bef264"/><stop offset="58%" stop-color="#22c55e"/><stop offset="100%" stop-color="#14532d"/></radialGradient></defs><circle cx="128" cy="128" r="96" stroke="#a855f7" stroke-width="5" stroke-dasharray="22 14" opacity="0.8"/>
           <!-- 4 orbiting miasma skulls/orbs -->
           <g stroke="#160e26" stroke-width="5.5">
             <circle cx="128" cy="30" r="22" fill="url(#en_orb)"/>
             <circle cx="128" cy="226" r="22" fill="url(#en_orb)"/>
             <circle cx="30" cy="128" r="22" fill="url(#en_wisp)"/>
             <circle cx="226" cy="128" r="22" fill="url(#en_wisp)"/>
           </g>
           <!-- Cute spooky eyes in orbs -->
           <circle cx="121" cy="28" r="3.5" fill="#fef08a"/><circle cx="135" cy="28" r="3.5" fill="#fef08a"/>
           <circle cx="121" cy="224" r="3.5" fill="#fef08a"/><circle cx="135" cy="224" r="3.5" fill="#fef08a"/>
           <circle cx="24" cy="126" r="3.5" fill="#160e26"/><circle cx="36" cy="126" r="3.5" fill="#160e26"/>
           <circle cx="220" cy="126" r="3.5" fill="#160e26"/><circle cx="232" cy="126" r="3.5" fill="#160e26"/></svg>`,
  magnetic: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="em_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="52%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient><linearGradient id="em_b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fda4af"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><!-- Swirl vortex arcs -->
           <path d="M52 72 C88 22 168 22 204 72" stroke="url(#em_a)" stroke-width="14" stroke-linecap="round"/>
           <path d="M52 72 C88 22 168 22 204 72" stroke="#160e26" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 18"/>
           <path d="M204 184 C168 234 88 234 52 184" stroke="url(#em_b)" stroke-width="14" stroke-linecap="round"/>
           <path d="M26 128 C26 70 74 28 128 28" stroke="#67e8f9" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
           <path d="M230 128 C230 186 182 228 128 228" stroke="#fda4af" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
           <!-- Polar nodes -->
           <polygon points="204,54 226,82 192,84" fill="#38bdf8" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="52,202 30,174 64,172" fill="#f43f5e" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/></svg>`,
  mirrored: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="emir_1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#a855f7"/></linearGradient><linearGradient id="emir_2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f472b6"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs><!-- 6 hovering mirror prisms -->
           <g stroke="#160e26" stroke-width="6" stroke-linejoin="round">
             <polygon points="128,14 152,42 128,62 104,42" fill="url(#emir_1)"/>
             <polygon points="128,242 152,214 128,194 104,214" fill="url(#emir_1)"/>
             <polygon points="26,70 58,64 66,94 34,102" fill="url(#emir_2)"/>
             <polygon points="230,70 198,64 190,94 222,102" fill="url(#emir_2)"/>
             <polygon points="26,186 58,192 66,162 34,154" fill="url(#emir_2)"/>
             <polygon points="230,186 198,192 190,162 222,154" fill="url(#emir_2)"/>
           </g>
           <line x1="128" y1="22" x2="128" y2="54" stroke="#fff" stroke-width="3.5" opacity="0.85"/>
           <line x1="128" y1="202" x2="128" y2="234" stroke="#fff" stroke-width="3.5" opacity="0.85"/></svg>`,
};

export const MORPHOLOGY_SPRITES_V4 = {
  chimeraSpines: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="mcs_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef3c7"/><stop offset="52%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><g fill="url(#mcs_a)" stroke="#160e26" stroke-width="6.5" stroke-linejoin="round">
             <polygon points="128,16 112,68 144,68"/>
             <polygon points="64,34 78,84 104,66"/>
             <polygon points="192,34 178,84 152,66"/>
             <polygon points="22,94 68,108 78,82"/>
             <polygon points="234,94 188,108 178,82"/>
             <polygon points="28,168 74,154 80,178"/>
             <polygon points="228,168 182,154 176,178"/>
           </g></svg>`,
  chimeraHorn: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="mch_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="52%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#78350f"/></linearGradient></defs><path d="M98 112 C104 68 118 28 128 10 C138 28 152 68 158 112 Q128 96 98 112 Z" fill="url(#mch_a)" stroke="#160e26" stroke-width="7" stroke-linejoin="round"/>
           <path d="M110 86 Q128 78 146 86" stroke="#160e26" stroke-width="5" stroke-linecap="round"/>
           <path d="M116 62 Q128 56 140 62" stroke="#160e26" stroke-width="4.5" stroke-linecap="round"/>
           <path d="M124 26 L120 50" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.8"/></svg>`,
  myceliumTendrils: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="mmt_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#bef264"/><stop offset="52%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></linearGradient></defs><g fill="none" stroke="url(#mmt_a)" stroke-width="11" stroke-linecap="round">
             <path d="M84 86 C48 64 38 38 56 24"/>
             <path d="M172 86 C208 64 218 38 200 24"/>
             <path d="M68 136 C32 140 20 172 38 194"/>
             <path d="M188 136 C224 140 236 172 218 194"/>
           </g>
           <g fill="#fef08a" stroke="#160e26" stroke-width="5.5">
             <circle cx="56" cy="24" r="14"/>
             <circle cx="200" cy="24" r="14"/>
             <circle cx="38" cy="194" r="13"/>
             <circle cx="218" cy="194" r="13"/>
           </g></svg>`,
  myceliumPustules: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="mmp_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#166534"/></radialGradient></defs><g fill="url(#mmp_a)" stroke="#160e26" stroke-width="6">
             <circle cx="88" cy="96" r="22"/>
             <circle cx="168" cy="96" r="20"/>
             <circle cx="128" cy="166" r="24"/>
             <circle cx="76" cy="148" r="15"/>
             <circle cx="180" cy="148" r="15"/>
           </g>
           <ellipse cx="82" cy="89" rx="7" ry="4" fill="#fff" opacity="0.85" transform="rotate(-30 82 89)"/>
           <ellipse cx="162" cy="89" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 162 89)"/>
           <ellipse cx="121" cy="158" rx="8" ry="4.5" fill="#fff" opacity="0.85" transform="rotate(-30 121 158)"/></svg>`,
  symbiontCrystals: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="msc_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><g fill="url(#msc_a)" stroke="#160e26" stroke-width="6" stroke-linejoin="round">
             <polygon points="74,40 98,74 78,104 52,78"/>
             <polygon points="182,40 204,78 178,104 158,74"/>
             <polygon points="44,136 74,126 84,158 50,168"/>
             <polygon points="212,136 206,168 172,158 182,126"/>
             <polygon points="128,194 148,220 128,244 108,220"/>
           </g></svg>`,
  symbiontWings: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="msw_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#818cf8"/></linearGradient></defs><path d="M96 116 C66 54 16 42 12 88 C16 114 44 122 24 148 C48 174 82 162 96 140 Z" fill="url(#msw_a)" stroke="#160e26" stroke-width="6.5" stroke-linejoin="round"/>
           <path d="M160 116 C190 54 240 42 244 88 C240 114 212 122 232 148 C208 174 174 162 160 140 Z" fill="url(#msw_a)" stroke="#160e26" stroke-width="6.5" stroke-linejoin="round"/>
           <path d="M78 106 C56 76 36 72 28 88" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
           <path d="M178 106 C200 76 220 72 228 88" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.75"/></svg>`,
} as const;

export const HYBRID_AURA_SPRITES_V4: Record<HybridId, string> = {
  plasma_leviathan: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="al_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><circle cx="128" cy="128" r="92" stroke="url(#al_a)" stroke-width="10" opacity="0.7"/>
           <path d="M36 128 C36 60 88 22 128 16 C168 22 220 60 220 128 C206 80 172 48 128 44 C84 48 50 80 36 128 Z" fill="url(#al_a)" stroke="#160e26" stroke-width="6" stroke-linejoin="round" opacity="0.9"/>
           <path d="M52 172 Q128 238 204 172 Q128 210 52 172 Z" fill="#f97316" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/></svg>`,
  ouroboros: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="ao_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde047"/><stop offset="52%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><circle cx="128" cy="128" r="98" stroke="url(#ao_a)" stroke-width="18" opacity="0.88"/>
           <circle cx="128" cy="128" r="98" stroke="#160e26" stroke-width="4" stroke-dasharray="16 10"/>
           <!-- Serpent head biting tail at top -->
           <path d="M112 18 L148 28 L116 44 Z" fill="#fde047" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round"/>
           <circle cx="126" cy="27" r="4" fill="#160e26"/>
           <circle cx="128" cy="128" r="76" stroke="#6ee7b7" stroke-width="3" stroke-dasharray="8 12" opacity="0.7"/></svg>`,
  phase_serpent: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="as_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><circle cx="128" cy="128" r="88" stroke="#fef08a" stroke-width="6" opacity="0.8"/>
           <g fill="url(#as_a)" stroke="#160e26" stroke-width="5.5" stroke-linejoin="round" opacity="0.92">
             <path d="M128 12 L144 58 L112 58 Z"/>
             <path d="M128 244 L144 198 L112 198 Z"/>
             <path d="M16 74 L68 88 L52 114 Z"/>
             <path d="M240 74 L188 88 L204 114 Z"/>
             <path d="M16 182 L68 168 L52 142 Z"/>
             <path d="M240 182 L188 168 L204 142 Z"/>
           </g></svg>`,
  spore_reactor: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="ap_a" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d9f99d"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#14532d"/></radialGradient></defs><circle cx="128" cy="128" r="96" stroke="#84cc16" stroke-width="8" stroke-dasharray="20 14" opacity="0.75"/>
           <g fill="url(#ap_a)" stroke="#160e26" stroke-width="5.5">
             <circle cx="128" cy="28" r="18"/>
             <circle cx="214" cy="78" r="16"/>
             <circle cx="214" cy="178" r="16"/>
             <circle cx="128" cy="228" r="18"/>
             <circle cx="42" cy="178" r="16"/>
             <circle cx="42" cy="78" r="16"/>
           </g></svg>`,
  ion_colossus: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="abeh_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="52%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></linearGradient></defs><polygon points="128,16 218,68 218,188 128,240 38,188 38,68" fill="none" stroke="url(#abeh_a)" stroke-width="14" stroke-linejoin="round" opacity="0.85"/>
           <polygon points="128,16 218,68 218,188 128,240 38,188 38,68" fill="none" stroke="#160e26" stroke-width="4" stroke-dasharray="14 14"/>
           <circle cx="128" cy="20" r="14" fill="#fef08a" stroke="#160e26" stroke-width="5"/>
           <circle cx="216" cy="186" r="14" fill="#84cc16" stroke="#160e26" stroke-width="5"/>
           <circle cx="40" cy="186" r="14" fill="#84cc16" stroke="#160e26" stroke-width="5"/></svg>`,
  psi_web: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="aaeg_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="52%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><polygon points="128,18 206,50 238,128 206,206 128,238 50,206 18,128 50,50" fill="none" stroke="url(#aaeg_a)" stroke-width="12" stroke-linejoin="round" opacity="0.9"/>
           <circle cx="128" cy="128" r="82" stroke="#bae6fd" stroke-width="3.5" stroke-dasharray="10 8" opacity="0.7"/>
           <polygon points="128,6 142,26 128,44 114,26" fill="#67e8f9" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="128,250 142,230 128,212 114,230" fill="#67e8f9" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="6,128 26,114 44,128 26,142" fill="#818cf8" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/>
           <polygon points="250,128 230,114 212,128 230,142" fill="#818cf8" stroke="#160e26" stroke-width="5" stroke-linejoin="round"/></svg>`,
};

export const COMBAT_SPRITES_V4 = {
  enemyTailSegment: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><defs><radialGradient id="ets_a" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="#fda4af"/><stop offset="58%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#881337"/></radialGradient></defs><path d="M12 32 C12 18 22 10 34 10 C47 10 56 19 56 32 C56 45 47 54 34 54 C22 54 12 46 12 32 Z" fill="url(#ets_a)" stroke="#160e26" stroke-width="3.4"/>
           <circle cx="35" cy="32" r="10" fill="#fecdd3" opacity="0.55"/>
           <circle cx="35" cy="32" r="5" fill="#fff1f2"/>
           <ellipse cx="26" cy="21" rx="6" ry="3.2" fill="#fff" opacity="0.8" transform="rotate(-25 26 21)"/></svg>`,
  sporeCystMine: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><radialGradient id="scm_halo" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#a3e635"/><stop offset="58%" stop-color="#4d7c0f"/><stop offset="100%" stop-color="#052e16"/></radialGradient><radialGradient id="scm_core" cx="38%" cy="32%" r="65%"><stop offset="0%" stop-color="#ecfccb"/><stop offset="58%" stop-color="#84cc16"/><stop offset="100%" stop-color="#166534"/></radialGradient><radialGradient id="scm_bub" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fef08a"/><stop offset="58%" stop-color="#bef264"/><stop offset="100%" stop-color="#4d7c0f"/></radialGradient></defs><!-- Sticky puddle base -->
           <path d="M40 144 C30 100 74 52 128 50 C186 48 228 96 218 144 C208 192 174 218 128 214 C80 210 50 188 40 144 Z" fill="url(#scm_halo)" opacity="0.35"/>
           <!-- Radial spiky triggers -->
           <g fill="#a3e635" stroke="#160e26" stroke-width="6" stroke-linejoin="round">
             <polygon points="128,22 114,62 142,62"/>
             <polygon points="128,234 114,194 142,194"/>
             <polygon points="22,128 62,114 62,142"/>
             <polygon points="234,128 194,114 194,142"/>
             <polygon points="52,52 72,88 92,68"/>
             <polygon points="204,52 184,88 164,68"/>
             <polygon points="52,204 72,168 92,188"/>
             <polygon points="204,204 184,168 164,188"/>
           </g>
           <!-- Main bulbous mine dome -->
           <circle cx="128" cy="128" r="74" fill="url(#scm_core)" stroke="#160e26" stroke-width="8"/>
           <path d="M188 98 C202 146 174 196 124 198 C96 199 74 186 64 166 C98 184 166 172 188 98 Z" fill="#052e16" opacity="0.32"/>
           <!-- Glowing pustules -->
           <circle cx="104" cy="108" r="22" fill="url(#scm_bub)" stroke="#160e26" stroke-width="6"/>
           <circle cx="154" cy="118" r="17" fill="url(#scm_bub)" stroke="#160e26" stroke-width="5.5"/>
           <circle cx="124" cy="154" r="15" fill="url(#scm_bub)" stroke="#160e26" stroke-width="5.5"/>
           <!-- Glossy speculars -->
           <ellipse cx="97" cy="100" rx="8" ry="5" fill="#fff" opacity="0.85" transform="rotate(-30 97 100)"/>
           <ellipse cx="149" cy="111" rx="6" ry="3.5" fill="#fff" opacity="0.8" transform="rotate(-30 149 111)"/>
           <circle cx="128" cy="128" r="10" fill="#fef08a" stroke="#160e26" stroke-width="4.5"/></svg>`,
  mandiblesSlash: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><defs><linearGradient id="vms_1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="52%" stop-color="#fb923c"/><stop offset="100%" stop-color="#e11d48"/></linearGradient><linearGradient id="vms_2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#fde047"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs><!-- Outer upper slash arc -->
           <path d="M26 98 C72 22 184 22 232 104 C188 54 96 50 42 108 Z" fill="url(#vms_1)" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <path d="M58 76 C104 38 168 40 208 82 C164 56 106 54 58 76 Z" fill="url(#vms_2)"/>
           <!-- Outer lower slash arc -->
           <path d="M26 158 C72 234 184 234 232 152 C188 202 96 206 42 148 Z" fill="url(#vms_1)" stroke="#160e26" stroke-width="6" stroke-linejoin="round"/>
           <path d="M58 180 C104 218 168 216 208 174 C164 200 106 202 58 180 Z" fill="url(#vms_2)"/>
           <!-- Crossing bite snap bursts -->
           <path d="M214 128 L236 116 L228 128 L244 134 L224 140 L230 152 L212 136 Z" fill="#fef08a" stroke="#160e26" stroke-width="4" stroke-linejoin="round"/>
           <circle cx="192" cy="128" r="10" fill="#ffffff" stroke="#160e26" stroke-width="4"/>
           <circle cx="152" cy="108" r="5" fill="#fde047" stroke="#160e26" stroke-width="3"/>
           <circle cx="152" cy="148" r="5" fill="#fde047" stroke="#160e26" stroke-width="3"/></svg>`,
  uiRadarArrow: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none"><defs><linearGradient id="ura_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="52%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M16 3 L28 26 L16 21 L4 26 Z" fill="url(#ura_a)" stroke="#160e26" stroke-width="2.6" stroke-linejoin="round"/>
           <circle cx="16" cy="15" r="2.5" fill="#fff"/></svg>`,
} as const;

export type MorphologySpriteKey = keyof typeof MORPHOLOGY_SPRITES_V4;

export interface BiopunkTexturesV4 {
  boss: Texture;
  anomalies: Record<AnomalyKind, Texture>;
  elites: Record<EliteMutation, Texture>;
  morphology: Record<MorphologySpriteKey, Texture>;
  hybridAuras: Record<HybridId, Texture>;
  enemyTailSegment: Texture;
  sporeCystMine: Texture;
  mandiblesSlash: Texture;
  uiRadarArrow: Texture;
}

export async function loadBiopunkTexturesV4(): Promise<BiopunkTexturesV4> {
  const anomalies = {} as Record<AnomalyKind, Texture>;
  const elites = {} as Record<EliteMutation, Texture>;
  const morphology = {} as Record<MorphologySpriteKey, Texture>;
  const hybridAuras = {} as Record<HybridId, Texture>;

  const [boss, enemyTailSegment, sporeCystMine, mandiblesSlash, uiRadarArrow] = await Promise.all([
    svgToTexture(sizedSvg(ENEMY_SPRITES_V4.boss, 256)),
    svgToTexture(sizedSvg(COMBAT_SPRITES_V4.enemyTailSegment, 64)),
    svgToTexture(sizedSvg(COMBAT_SPRITES_V4.sporeCystMine, 256)),
    svgToTexture(sizedSvg(COMBAT_SPRITES_V4.mandiblesSlash, 256)),
    svgToTexture(sizedSvg(COMBAT_SPRITES_V4.uiRadarArrow, 64)),
    ...(Object.keys(ANOMALY_SPRITES_V4) as AnomalyKind[]).map(async (k) => {
      anomalies[k] = await svgToTexture(sizedSvg(ANOMALY_SPRITES_V4[k], 256));
    }),
    ...(Object.keys(ELITE_OVERLAY_SPRITES_V4) as EliteMutation[]).map(async (k) => {
      elites[k] = await svgToTexture(sizedSvg(ELITE_OVERLAY_SPRITES_V4[k], 256));
    }),
    ...(Object.keys(MORPHOLOGY_SPRITES_V4) as MorphologySpriteKey[]).map(async (k) => {
      morphology[k] = await svgToTexture(sizedSvg(MORPHOLOGY_SPRITES_V4[k], 256));
    }),
    ...(Object.keys(HYBRID_AURA_SPRITES_V4) as HybridId[]).map(async (k) => {
      hybridAuras[k] = await svgToTexture(sizedSvg(HYBRID_AURA_SPRITES_V4[k], 256));
    }),
  ]);

  return {
    boss,
    anomalies,
    elites,
    morphology,
    hybridAuras,
    enemyTailSegment,
    sporeCystMine,
    mandiblesSlash,
    uiRadarArrow,
  };
}
