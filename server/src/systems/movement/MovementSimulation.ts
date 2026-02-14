import type { Unit } from "../../schema/Unit.js";
import type {
  GridCoordinate,
  UnitMovementState,
  Vector2,
} from "../../rooms/BattleRoomTypes.js";
import { isDestinationBlocked, isTerrainBlocked } from "./gridPathing.js";

type OccupiedByCellKey = Map<string, Set<string>>;

function gridKey(cell: GridCoordinate): string {
  return `${cell.col}:${cell.row}`;
}

function addOccupancy(
  occupiedByCellKey: OccupiedByCellKey,
  cell: GridCoordinate,
  unitId: string,
): void {
  const key = gridKey(cell);
  const set = occupiedByCellKey.get(key);
  if (set) {
    set.add(unitId);
    return;
  }

  occupiedByCellKey.set(key, new Set([unitId]));
}

function removeOccupancy(
  occupiedByCellKey: OccupiedByCellKey,
  cell: GridCoordinate,
  unitId: string,
): void {
  const key = gridKey(cell);
  const set = occupiedByCellKey.get(key);
  if (!set) {
    return;
  }

  set.delete(unitId);
  if (set.size === 0) {
    occupiedByCellKey.delete(key);
  }
}

export interface MovementSimulationParams {
  deltaSeconds: number;
  units: Iterable<Unit>;
  movementStateByUnitId: Map<string, UnitMovementState>;
  unitMoveSpeed: number;
  unitTurnSpeed: number;
  unitForwardOffset: number;
  refaceAngleThreshold: number;
  waypointMoveAngleTolerance: number;
  ensureFiniteUnitState: (unit: Unit) => void;
  snapUnitToGrid: (unit: Unit) => GridCoordinate;
  worldToGridCoordinate: (x: number, y: number) => GridCoordinate;
  getTerrainSpeedMultiplierAtCell: (cell: GridCoordinate) => number;
  gridToWorldCenter: (cell: GridCoordinate) => Vector2;
  clearMovementForUnit: (unitId: string) => void;
  faceCurrentDestination: (unit: Unit, movementState: UnitMovementState) => void;
  wrapAngle: (angle: number) => number;
}

export function simulateMovementTick({
  deltaSeconds,
  units,
  movementStateByUnitId,
  unitMoveSpeed,
  unitTurnSpeed,
  unitForwardOffset,
  refaceAngleThreshold,
  waypointMoveAngleTolerance,
  ensureFiniteUnitState,
  snapUnitToGrid,
  worldToGridCoordinate,
  getTerrainSpeedMultiplierAtCell,
  gridToWorldCenter,
  clearMovementForUnit,
  faceCurrentDestination,
  wrapAngle,
}: MovementSimulationParams): void {
  if (deltaSeconds <= 0) {
    return;
  }

  const aliveUnits: Unit[] = [];
  const cellByUnitId = new Map<string, GridCoordinate>();
  const occupiedByCellKey: OccupiedByCellKey = new Map<string, Set<string>>();

  for (const unit of units) {
    if (unit.health <= 0) {
      continue;
    }
    ensureFiniteUnitState(unit);
    const snappedCell = snapUnitToGrid(unit);
    aliveUnits.push(unit);
    cellByUnitId.set(unit.unitId, snappedCell);
    addOccupancy(occupiedByCellKey, snappedCell, unit.unitId);
  }

  for (const unit of aliveUnits) {
    const movementState = movementStateByUnitId.get(unit.unitId);
    if (!movementState) {
      continue;
    }

    if (movementState.isPaused) {
      movementState.movementBudget = 0;
      continue;
    }

    if (!movementState.destinationCell && movementState.queuedCells.length > 0) {
      movementState.destinationCell = movementState.queuedCells.shift() ?? null;
      faceCurrentDestination(unit, movementState);
    }

    if (!movementState.destinationCell) {
      continue;
    }

    const currentCell =
      cellByUnitId.get(unit.unitId) ?? worldToGridCoordinate(unit.x, unit.y);
    const terrainSpeedMultiplier = getTerrainSpeedMultiplierAtCell(currentCell);
    const perSecondSpeed =
      unitMoveSpeed *
      movementState.movementCommandMode.speedMultiplier *
      terrainSpeedMultiplier;
    if (perSecondSpeed <= 0 || !Number.isFinite(perSecondSpeed)) {
      continue;
    }

    movementState.movementBudget += perSecondSpeed * deltaSeconds;

    if (movementState.movementCommandMode.rotateToFace) {
      const destination = gridToWorldCenter(movementState.destinationCell);
      const desiredRotation =
        Math.atan2(destination.y - unit.y, destination.x - unit.x) -
        unitForwardOffset;

      if (movementState.targetRotation === null) {
        const headingError = wrapAngle(desiredRotation - unit.rotation);
        if (Math.abs(headingError) > refaceAngleThreshold) {
          movementState.targetRotation = desiredRotation;
        }
      }

      if (movementState.targetRotation !== null) {
        const maxTurnStep = unitTurnSpeed * deltaSeconds;
        const angleDelta = wrapAngle(movementState.targetRotation - unit.rotation);
        if (Math.abs(angleDelta) <= maxTurnStep) {
          unit.rotation = movementState.targetRotation;
          movementState.targetRotation = null;
        } else {
          unit.rotation = wrapAngle(
            unit.rotation + Math.sign(angleDelta) * maxTurnStep,
          );
        }
      }

      const isFacingDestination =
        movementState.targetRotation === null ||
        Math.abs(wrapAngle(movementState.targetRotation - unit.rotation)) <=
          waypointMoveAngleTolerance;
      if (!isFacingDestination) {
        continue;
      }
    }

    while (movementState.destinationCell && movementState.movementBudget > 0) {
      const destinationCell = movementState.destinationCell;
      if (isTerrainBlocked(destinationCell)) {
        clearMovementForUnit(unit.unitId);
        break;
      }
      const destination = gridToWorldCenter(destinationCell);
      const toTargetX = destination.x - unit.x;
      const toTargetY = destination.y - unit.y;
      const distance = Math.hypot(toTargetX, toTargetY);

      if (distance <= 0.0001) {
        movementState.destinationCell = movementState.queuedCells.shift() ?? null;
        faceCurrentDestination(unit, movementState);
        continue;
      }

      if (movementState.movementBudget + 0.0001 < distance) {
        break;
      }

      if (
        isDestinationBlocked(occupiedByCellKey, destinationCell, unit.unitId)
      ) {
        break;
      }

      const currentCell =
        cellByUnitId.get(unit.unitId) ?? worldToGridCoordinate(unit.x, unit.y);
      removeOccupancy(occupiedByCellKey, currentCell, unit.unitId);

      unit.x = destination.x;
      unit.y = destination.y;
      movementState.movementBudget -= distance;

      const reachedCell = { col: destinationCell.col, row: destinationCell.row };
      cellByUnitId.set(unit.unitId, reachedCell);
      addOccupancy(occupiedByCellKey, reachedCell, unit.unitId);

      movementState.destinationCell = movementState.queuedCells.shift() ?? null;
      faceCurrentDestination(unit, movementState);

      if (
        movementState.movementCommandMode.rotateToFace &&
        movementState.targetRotation !== null
      ) {
        const headingError = Math.abs(
          wrapAngle(movementState.targetRotation - unit.rotation),
        );
        if (headingError > waypointMoveAngleTolerance) {
          break;
        }
      }
    }
  }
}
