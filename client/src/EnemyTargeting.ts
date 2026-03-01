import { Team } from './Team';
import { Unit } from './Unit';

export type EnemyUnitTarget = {
  unitId: string;
  x: number;
  y: number;
};

export function collectVisibleEnemyUnitTargets(
  unitsById: ReadonlyMap<string, Unit>,
  localPlayerTeam: Team,
  resolveUnitPosition: (unit: Unit) => { x: number; y: number },
): EnemyUnitTarget[] {
  const visibleEnemyTargets: EnemyUnitTarget[] = [];
  for (const [unitId, unit] of unitsById) {
    if (
      unit.team === localPlayerTeam ||
      !unit.isAlive() ||
      !unit.visible
    ) {
      continue;
    }

    const position = resolveUnitPosition(unit);
    visibleEnemyTargets.push({
      unitId,
      x: position.x,
      y: position.y,
    });
  }
  return visibleEnemyTargets;
}

export function findNearestEnemyUnitTarget(
  unitPosition: { x: number; y: number },
  visibleEnemyTargets: ReadonlyArray<EnemyUnitTarget>,
): EnemyUnitTarget | null {
  let nearestTarget: EnemyUnitTarget | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const target of visibleEnemyTargets) {
    const distanceSquared =
      (unitPosition.x - target.x) * (unitPosition.x - target.x)
      + (unitPosition.y - target.y) * (unitPosition.y - target.y);
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestTarget = target;
      continue;
    }
    if (
      distanceSquared === nearestDistanceSquared &&
      nearestTarget &&
      target.unitId.localeCompare(nearestTarget.unitId) < 0
    ) {
      nearestTarget = target;
    }
  }

  return nearestTarget;
}
