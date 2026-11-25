import type { BioNode } from '../engine/types';

export interface NodeEnemySnapshot {
  x: number;
  y: number;
  hp: number;
  infected: number;
}

export interface NodeStepResult {
  ownerChanged: BioNode[];
  newlyRaided: BioNode[];
  heldCount: number;
}

/**
 * Обновление захвата био-узлов по удержанию зоны:
 * - Игрок внутри зоны без врагов -> заполняет узел своей энергией до +1.0 (захват)
 * - Игрок и враги в зоне одновременно -> бой за узел (прогресс на паузе)
 * - Игрок снаружи, враги внутри -> монстры откачивают энергию и отвоёвывают башню
 */
export function stepBioNodes(
  nodes: BioNode[],
  player: { x: number; y: number },
  enemies: NodeEnemySnapshot[],
  dt: number,
  captureSpeedMul: number,
  psiWeb: boolean,
): NodeStepResult {
  const ownerChanged: BioNode[] = [];
  const newlyRaided: BioNode[] = [];
  let heldCount = 0;

  const playerChargeRate = 0.28 * captureSpeedMul * (psiWeb ? 1.5 : 1.0);

  for (const n of nodes) {
    const prevRaided = Boolean(n.raided);
    const pDist = Math.hypot(player.x - n.x, player.y - n.y);
    const playerIn = pDist <= n.radius;

    let enemyIn = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0 || e.infected > 0) continue;
      if (Math.hypot(e.x - n.x, e.y - n.y) <= n.radius) {
        enemyIn++;
      }
    }

    n.playerInside = playerIn;
    n.enemyCount = enemyIn;
    if (n.warnCooldown && n.warnCooldown > 0) {
      n.warnCooldown = Math.max(0, n.warnCooldown - dt);
    }

    let delta = 0;
    if (playerIn && enemyIn === 0) {
      delta = playerChargeRate * dt;
      n.contested = false;
      n.raided = false;
    } else if (playerIn && enemyIn > 0) {
      // Бой в круге: захват приостанавливается, пока враги не выбиты из зоны
      delta = 0;
      n.contested = true;
      n.raided = false;
    } else if (!playerIn && enemyIn > 0) {
      const drainRate = Math.min(0.42, 0.14 + (enemyIn - 1) * 0.08);
      delta = -drainRate * dt;
      n.contested = false;
      n.raided = n.owner === 1 || n.capture > 0.15;
    } else {
      n.contested = false;
      n.raided = false;
      if (n.owner === 0 && Math.abs(n.capture) > 0.001) {
        const decay = 0.03 * dt;
        if (Math.abs(n.capture) <= decay) n.capture = 0;
        else n.capture -= Math.sign(n.capture) * decay;
      }
    }

    if (delta !== 0) {
      n.capture = Math.max(-1, Math.min(1, n.capture + delta));
    }

    const prevOwner = n.owner;
    if (n.owner === 0) {
      if (n.capture >= 1) n.owner = 1;
      else if (n.capture <= -1) n.owner = -1;
    } else if (n.owner === 1) {
      if (n.capture <= 0) n.owner = 0;
    } else if (n.owner === -1) {
      if (n.capture >= 0) n.owner = 0;
    }

    if (n.owner !== prevOwner) {
      ownerChanged.push(n);
    }
    if (n.raided && !prevRaided && (n.warnCooldown ?? 0) <= 0) {
      n.warnCooldown = 12;
      newlyRaided.push(n);
    }
    if (n.owner === 1) heldCount++;
  }

  return { ownerChanged, newlyRaided, heldCount };
}
