export type EnemyUnitTarget = {
  unitId: string;
  x: number;
  y: number;
};

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
