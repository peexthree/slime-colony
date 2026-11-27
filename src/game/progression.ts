import type { DnaBranch, WeaponId } from '../engine/types';
import { MAX_EQUIPPED_WEAPONS, WEAPON_BRANCH, WEAPON_MAX_LVL, WEAPON_UNLOCK_LEVEL } from '../engine/types';

/** Дополнительные уровни игрока для открытия оружия чужого генома:
 *  сборка ведёт к одному итоговому существу, а не к «куче пушек» */
export const FOREIGN_BRANCH_PENALTY = 4;

/** Минимальный уровень игрока для разблокировки или улучшения оружия до targetLvl (1..4) */
export function requiredLevelForWeapon(id: WeaponId, targetLvl: number): number {
  const unlockLvl = WEAPON_UNLOCK_LEVEL[id] ?? 1;
  if (targetLvl <= 1) return unlockLvl;
  const tierFloor = targetLvl === 2 ? 3 : targetLvl === 3 ? 6 : 10;
  return Math.max(unlockLvl + (targetLvl - 1), tierFloor);
}

/** Количество экипированных оружий у игрока */
export function equippedWeaponCount(wlvl: Record<WeaponId, number>): number {
  let count = 0;
  for (const id of Object.keys(wlvl) as WeaponId[]) {
    if (wlvl[id] > 0) count++;
  }
  return count;
}

/**
 * Можно ли открыть новое оружие (учитывая уровень игрока и лимит слотов).
 * mainBranch - доминирующий геном забега: оружие чужой ветки требует
 * на FOREIGN_BRANCH_PENALTY уровней больше. null/undefined - без штрафа.
 */
export function canUnlockWeapon(
  id: WeaponId,
  wlvl: Record<WeaponId, number>,
  playerLevel: number,
  mainBranch?: DnaBranch | null,
): boolean {
  if (wlvl[id] > 0) return false;
  if (equippedWeaponCount(wlvl) >= MAX_EQUIPPED_WEAPONS) return false;
  let req = requiredLevelForWeapon(id, 1);
  if (mainBranch && WEAPON_BRANCH[id] !== mainBranch) req += FOREIGN_BRANCH_PENALTY;
  return playerLevel >= req;
}

/** Можно ли улучшить уже открытое оружие до следующего уровня */
export function canUpgradeWeapon(id: WeaponId, curLvl: number, playerLevel: number): boolean {
  if (curLvl <= 0 || curLvl >= WEAPON_MAX_LVL) return false;
  return playerLevel >= requiredLevelForWeapon(id, curLvl + 1);
}

/** Опыт, требуемый для перехода с уровня `level` на `level + 1` */
export function xpRequiredForLevel(level: number): number {
  const safeLvl = Math.max(1, Math.floor(level));
  return Math.round(9 + safeLvl * 5 + Math.pow(safeLvl, 1.35));
}
