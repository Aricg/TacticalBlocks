import { Unit } from './Unit';

export type SelectedUnitPlanningEntry = {
  unitId: string;
  x: number;
  y: number;
};

export function buildSelectedUnitsForPlanning(
  unitsById: ReadonlyMap<string, Unit>,
  selectedUnits: ReadonlySet<Unit>,
): SelectedUnitPlanningEntry[] {
  return Array.from(unitsById.entries())
    .filter(([, unit]) => selectedUnits.has(unit))
    .map(([unitId, unit]) => ({
      unitId,
      x: unit.x,
      y: unit.y,
    }));
}
