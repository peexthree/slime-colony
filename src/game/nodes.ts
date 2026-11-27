// Территория: био-узлы, захватываемые удержанием области, их бонусы и тосты захвата.
import { t, getLocale } from '../i18n';
import { trNode } from '../i18n/gameData';
import { NODE_SHIELD_SEC, worldSize } from '../engine/types';
import type { BioNode, NodeKind } from '../engine/types';
import type { Ctx } from './context';
import { toSimX, toSimY } from './context';
import { showToast } from '../ui/toast';

export const NODE_KINDS: NodeKind[] = ['gen', 'amp', 'magnet', 'mutagen', 'incubator', 'gen', 'amp'];
export const NODE_NAMES: Record<NodeKind, string> = {
  gen: 'ГЕНЕРАТОР', amp: 'УСИЛИТЕЛЬ', magnet: 'МАГНИТ', mutagen: 'МУТАГЕН', incubator: 'ИНКУБАТОР',
};
export const NODE_POS_EFFECTS: Record<NodeKind, string> = {
  gen: '+1.5 HP/с', amp: '-40% таяния +12% урона', magnet: 'сбор x1.6', mutagen: '+1 карта, +15% XP', incubator: '+35% XP',
};
export const NODE_NEG_EFFECTS: Record<NodeKind, string> = {
  gen: 'враги быстрее', amp: '-20% урона', magnet: 'кража сфер', mutagen: '-1 карта', incubator: 'выводок роя',
};

/** Расставить био-узлы для шкалы: 7 стартовых, далее +3 новых узла за локацию */
export function spawnNodesForScale(ctx: Ctx, sIdx: number): void {
  const { curWorldW, curWorldH, bioNodes } = ctx;
  if (sIdx === 0) {
    bioNodes.length = 0;
    NODE_KINDS.forEach((kind, i) => {
      bioNodes.push({
        id: i,
        x: curWorldW * (0.18 + (i % 3) * 0.32) + (Math.random() - 0.5) * 60,
        y: curWorldH * (0.25 + Math.floor(i / 3) * 0.26) + (Math.random() - 0.5) * 50,
        radius: 68,
        owner: 0 as -1 | 0 | 1,
        capture: 0,
        kind,
        contested: false,
        raided: false,
        playerInside: false,
        enemyCount: 0,
        warnCooldown: 0,
        shieldT: 0,
      });
    });
  } else {
    const prevW = worldSize(sIdx - 1).w;
    const prevH = worldSize(sIdx - 1).h;
    // 3 новых узла за локацию: всего ~47 башен к финалу (лимит MAX_NODES 64 с запасом)
    const newKinds: NodeKind[] = ['mutagen', 'amp', 'gen', 'incubator'];
    for (let idx = 0; idx < 3; idx++) {
      const kind = newKinds[(sIdx + idx) % newKinds.length];
      const id = bioNodes.length;
      const angle = (idx / 3) * Math.PI * 2 + Math.random() * 0.4;
      const radX = (prevW / 2) + (curWorldW - prevW) * (0.35 + Math.random() * 0.35);
      const radY = (prevH / 2) + (curWorldH - prevH) * (0.35 + Math.random() * 0.35);
      const nx = Math.max(50, Math.min(curWorldW - 50, curWorldW / 2 + Math.cos(angle) * radX));
      const ny = Math.max(50, Math.min(curWorldH - 50, curWorldH / 2 + Math.sin(angle) * radY));
      bioNodes.push({
        id,
        x: nx,
        y: ny,
        radius: 68,
        owner: 0 as -1 | 0 | 1,
        capture: 0,
        kind,
        contested: false,
        raided: false,
        playerInside: false,
        enemyCount: 0,
        warnCooldown: 0,
        shieldT: 0,
      });
    }
  }
}

/** Эффект узла под контролем врагов: штрафы игроку */
export function underEnemy(ctx: Ctx, kind: NodeKind): void {
  if (kind === 'gen') { /* ближние враги ускоряются - применяется в цикле врагов */ }
  else if (kind === 'amp') ctx.weaponPenalty = 0.8;
  else if (kind === 'magnet') ctx.orbToEnemies = true;
  else if (kind === 'incubator') ctx.incubatorEnemy = true;
}

/** Пересчёт бонусов всех узлов по текущим владельцам */
export function recomputeNodeBonuses(ctx: Ctx): void {
  ctx.nodeRegenBonus = 0;
  ctx.ampOwned = false;
  ctx.weaponPenalty = 1;
  ctx.magnetNodeOwned = false;
  ctx.orbToEnemies = false;
  ctx.xpMul = 1;
  ctx.mutagenXpMul = 1;
  ctx.incubatorEnemy = false;
  for (const n of ctx.bioNodes) {
    if (n.owner === 1) {
      if (n.kind === 'gen') ctx.nodeRegenBonus += 1.5;
      else if (n.kind === 'amp') ctx.ampOwned = true;
      else if (n.kind === 'magnet') ctx.magnetNodeOwned = true;
      else if (n.kind === 'mutagen') ctx.mutagenXpMul *= 1.15;
      else if (n.kind === 'incubator') ctx.xpMul *= 1.35;
    } else if (n.owner === -1) {
      underEnemy(ctx, n.kind);
    }
  }
}

/** Смена владельца узла: тост, вспышка, мутаген-эффект */
export function onNodeCaptured(ctx: Ctx, n: BioNode): void {
  const tn = trNode(n.kind, NODE_NAMES[n.kind], NODE_POS_EFFECTS[n.kind], NODE_NEG_EFFECTS[n.kind]);
  const en = getLocale() === 'en';
  const icoTone = n.owner === 1 ? 'bio-cyan' : n.owner === -1 ? 'bio-crimson' : 'bio-violet';
  const icoHtml = `<svg class="bio-icon ${icoTone}" viewBox="0 0 32 32" aria-hidden="true"><use href="#ico-node-${n.kind}"/></svg>`;
  if (n.owner === 1) {
    showToast(
      ctx,
      `${icoHtml} ${en ? 'TOWER CAPTURED' : 'БАШНЯ ЗАХВАЧЕНА'}: ${tn.name} (${tn.pos})` +
      ` · ${t('toast_node_shield', { sec: NODE_SHIELD_SEC })}`,
      'success',
    );
    if (n.kind === 'mutagen') ctx.nextPickDelta = 1;
  } else if (n.owner === -1) {
    showToast(ctx, `${icoHtml} ${en ? 'TOWER LOST' : 'БАШНЯ ПОТЕРЯНА'}: ${tn.name} (${tn.neg})`, 'danger');
    if (n.kind === 'mutagen') ctx.nextPickDelta = -1;
  } else {
    showToast(ctx, `${icoHtml} ${en ? 'TOWER NEUTRALIZED' : 'БАШНЯ НЕЙТРАЛЬНА'}: ${tn.name}`, 'info');
  }
  ctx.svc.overlay.spawnPulse(n.x, n.y, n.owner === 1 ? 0x66fcf1 : n.owner === -1 ? 0xff3b4e : 0xc084fc, n.radius * 2.2);
  ctx.svc.sfx.capture(n.owner === 1);
  if (n.owner === 1) {
    ctx.svc.sim.spawnPlayerSpores(toSimX(ctx, n.x), toSimY(ctx, n.y), 1500);
  }
  recomputeNodeBonuses(ctx);
}
