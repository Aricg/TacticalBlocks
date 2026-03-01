import { Team } from './Team';
import { Unit } from './Unit';

export function forEachSelectedUnitEntry(
  unitsById: ReadonlyMap<string, Unit>,
  selectedUnits: ReadonlySet<Unit>,
  visitor: (unitId: string, unit: Unit) => void,
): void {
  for (const [unitId, unit] of unitsById) {
    if (!selectedUnits.has(unit)) {
      continue;
    }
    visitor(unitId, unit);
  }
}

export function getSelectedUnitIdsSorted(
  unitsById: ReadonlyMap<string, Unit>,
  selectedUnits: ReadonlySet<Unit>,
): string[] {
  const selectedUnitIds: string[] = [];
  forEachSelectedUnitEntry(unitsById, selectedUnits, (unitId) => {
    selectedUnitIds.push(unitId);
  });
  selectedUnitIds.sort();
  return selectedUnitIds;
}

export function clearSelection(selectedUnits: Set<Unit>): void {
  for (const unit of selectedUnits) {
    unit.setSelected(false);
  }
  selectedUnits.clear();
}

export function selectOnlyUnit(selectedUnits: Set<Unit>, unit: Unit): void {
  clearSelection(selectedUnits);
  selectedUnits.add(unit);
  unit.setSelected(true);
}

type SelectUnitsInBoxArgs = {
  selectedUnits: Set<Unit>;
  units: ReadonlyArray<Unit>;
  localPlayerTeam: Team;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function selectUnitsInBox({
  selectedUnits,
  units,
  localPlayerTeam,
  startX,
  startY,
  endX,
  endY,
}: SelectUnitsInBoxArgs): void {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  clearSelection(selectedUnits);
  for (const unit of units) {
    const withinX = unit.x >= minX && unit.x <= maxX;
    const withinY = unit.y >= minY && unit.y <= maxY;
    if (withinX && withinY && unit.team === localPlayerTeam) {
      selectedUnits.add(unit);
      unit.setSelected(true);
    }
  }
}

export function selectAllOwnedUnits(
  selectedUnits: Set<Unit>,
  unitsById: ReadonlyMap<string, Unit>,
  localPlayerTeam: Team,
): void {
  clearSelection(selectedUnits);
  for (const unit of unitsById.values()) {
    if (unit.team !== localPlayerTeam || !unit.isAlive()) {
      continue;
    }
    selectedUnits.add(unit);
    unit.setSelected(true);
  }
}
