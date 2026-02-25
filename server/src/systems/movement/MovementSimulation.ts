import type { Unit } from "../../schema/Unit.js";
import type {
  GridCoordinate,
  UnitMovementState,
  Vector2,
} from "../../rooms/BattleRoomTypes.js";
import { getDestinationBlockers } from "./gridPathing.js";

type OccupiedByCellKey = Map<string, Set<string>>;
type UnitByUnitId = Map<string, Unit>;

const BLOCKED_TICKS_BEFORE_SIDESTEP = 6;
const SIDESTEP_NEIGHBOR_OFFSETS: ReadonlyArray<{
  colOffset: number;
  rowOffset: number;
}> = [
  { colOffset: 1, rowOffset: 0 },
  { colOffset: -1, rowOffset: 0 },
  { colOffset: 0, rowOffset: 1 },
  { colOffset: 0, rowOffset: -1 },
  { colOffset: 1, rowOffset: 1 },
  { colOffset: 1, rowOffset: -1 },
  { colOffset: -1, rowOffset: 1 },
  { colOffset: -1, rowOffset: -1 },
];

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

function clearBlockedState(movementState: UnitMovementState): void {
  movementState.blockedByUnitId = null;
  movementState.blockedTicks = 0;
}

function setBlockedByUnit(
  movementState: UnitMovementState,
  blockerUnitId: string,
): number {
  if (movementState.blockedByUnitId === blockerUnitId) {
    const nextBlockedTicks = (movementState.blockedTicks ?? 0) + 1;
    movementState.blockedTicks = nextBlockedTicks;
    return nextBlockedTicks;
  }

  movementState.blockedByUnitId = blockerUnitId;
  movementState.blockedTicks = 1;
  return 1;
}

function hasPendingMovement(movementState: UnitMovementState): boolean {
  return (
    movementState.destinationCell !== null || movementState.queuedCells.length > 0
  );
}

function selectSidestepCell({
  blockerCell,
  blockedUnitCell,
  occupiedByCellKey,
  isCellImpassable,
  isWaterCell,
}: {
  blockerCell: GridCoordinate;
  blockedUnitCell: GridCoordinate;
  occupiedByCellKey: OccupiedByCellKey;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  isWaterCell: (cell: GridCoordinate) => boolean;
}): GridCoordinate | null {
  const blockerIsInWater = isWaterCell(blockerCell);
  const candidates = SIDESTEP_NEIGHBOR_OFFSETS.map(({ colOffset, rowOffset }) => ({
    col: blockerCell.col + colOffset,
    row: blockerCell.row + rowOffset,
  })).filter((candidate) => {
    if (isCellImpassable(candidate)) {
      return false;
    }
    const occupiedUnits = occupiedByCellKey.get(gridKey(candidate));
    if (occupiedUnits && occupiedUnits.size > 0) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    const leftTerrainPenalty = isWaterCell(left) === blockerIsInWater ? 0 : 1;
    const rightTerrainPenalty = isWaterCell(right) === blockerIsInWater ? 0 : 1;
    if (leftTerrainPenalty !== rightTerrainPenalty) {
      return leftTerrainPenalty - rightTerrainPenalty;
    }

    const leftDistanceSquared =
      (left.col - blockedUnitCell.col) * (left.col - blockedUnitCell.col) +
      (left.row - blockedUnitCell.row) * (left.row - blockedUnitCell.row);
    const rightDistanceSquared =
      (right.col - blockedUnitCell.col) * (right.col - blockedUnitCell.col) +
      (right.row - blockedUnitCell.row) * (right.row - blockedUnitCell.row);
    if (leftDistanceSquared !== rightDistanceSquared) {
      return rightDistanceSquared - leftDistanceSquared;
    }

    if (left.row !== right.row) {
      return left.row - right.row;
    }
    return left.col - right.col;
  });

  return candidates[0] ?? null;
}

function tryQueueArrivedUnitSidestep({
  blockedUnitId,
  blockerUnitId,
  movementStateByUnitId,
  unitByUnitId,
  cellByUnitId,
  occupiedByCellKey,
  isCellImpassable,
  isWaterCell,
  faceCurrentDestination,
}: {
  blockedUnitId: string;
  blockerUnitId: string;
  movementStateByUnitId: Map<string, UnitMovementState>;
  unitByUnitId: UnitByUnitId;
  cellByUnitId: Map<string, GridCoordinate>;
  occupiedByCellKey: OccupiedByCellKey;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  isWaterCell: (cell: GridCoordinate) => boolean;
  faceCurrentDestination: (unit: Unit, movementState: UnitMovementState) => void;
}): boolean {
  const blockerMovementState = movementStateByUnitId.get(blockerUnitId);
  const blockerUnit = unitByUnitId.get(blockerUnitId);
  const blockerCell = cellByUnitId.get(blockerUnitId);
  const blockedUnitCell = cellByUnitId.get(blockedUnitId);
  if (
    !blockerMovementState ||
    !blockerUnit ||
    !blockerCell ||
    !blockedUnitCell ||
    blockerMovementState.isPaused ||
    blockerMovementState.terrainTransitionPauseRemainingSeconds > 0 ||
    hasPendingMovement(blockerMovementState)
  ) {
    return false;
  }

  const sidestepCell = selectSidestepCell({
    blockerCell,
    blockedUnitCell,
    occupiedByCellKey,
    isCellImpassable,
    isWaterCell,
  });
  if (!sidestepCell) {
    return false;
  }

  blockerMovementState.destinationCell = {
    col: sidestepCell.col,
    row: sidestepCell.row,
  };
  blockerMovementState.queuedCells = [
    {
      col: blockerCell.col,
      row: blockerCell.row,
    },
  ];
  blockerMovementState.targetRotation = null;
  blockerMovementState.movementBudget = 0;
  clearBlockedState(blockerMovementState);
  faceCurrentDestination(blockerUnit, blockerMovementState);
  return true;
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
  isCellImpassable: (cell: GridCoordinate) => boolean;
  isWaterCell: (cell: GridCoordinate) => boolean;
  waterTransitionPauseSeconds: number;
  gridToWorldCenter: (cell: GridCoordinate) => Vector2;
  clearMovementForUnit: (unitId: string) => void;
  isUnitMovementSuppressed: (unitId: string) => boolean;
  faceCurrentDestination: (unit: Unit, movementState: UnitMovementState) => void;
  wrapAngle: (angle: number) => number;
}

export interface MoraleSafeStepParams {
  currentCell: GridCoordinate;
  destinationCell: GridCoordinate;
  getTerrainMoraleBonusAtCell: (cell: GridCoordinate) => number;
  getHillGradeAtCell: (cell: GridCoordinate) => number;
  getCityMoraleBonusAtCell: (cell: GridCoordinate) => number;
}

export function isMoraleSafeStep({
  currentCell,
  destinationCell,
  getTerrainMoraleBonusAtCell,
  getHillGradeAtCell,
  getCityMoraleBonusAtCell,
}: MoraleSafeStepParams): boolean {
  const currentTerrainMoraleBonus = getTerrainMoraleBonusAtCell(currentCell);
  const destinationTerrainMoraleBonus =
    getTerrainMoraleBonusAtCell(destinationCell);
  if (destinationTerrainMoraleBonus < currentTerrainMoraleBonus) {
    return false;
  }

  const currentHillGrade = getHillGradeAtCell(currentCell);
  const destinationHillGrade = getHillGradeAtCell(destinationCell);
  if (destinationHillGrade < currentHillGrade) {
    return false;
  }

  const currentCityMoraleBonus = getCityMoraleBonusAtCell(currentCell);
  const destinationCityMoraleBonus = getCityMoraleBonusAtCell(destinationCell);
  if (destinationCityMoraleBonus < currentCityMoraleBonus) {
    return false;
  }

  return true;
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
  isCellImpassable,
  isWaterCell,
  waterTransitionPauseSeconds,
  gridToWorldCenter,
  clearMovementForUnit,
  isUnitMovementSuppressed,
  faceCurrentDestination,
  wrapAngle,
}: MovementSimulationParams): void {
  if (deltaSeconds <= 0) {
    return;
  }
  const normalizedWaterTransitionPauseSeconds =
    Number.isFinite(waterTransitionPauseSeconds) &&
    waterTransitionPauseSeconds > 0
      ? waterTransitionPauseSeconds
      : 0;

  const aliveUnits: Unit[] = [];
  const unitByUnitId: UnitByUnitId = new Map<string, Unit>();
  const cellByUnitId = new Map<string, GridCoordinate>();
  const occupiedByCellKey: OccupiedByCellKey = new Map<string, Set<string>>();

  for (const unit of units) {
    if (unit.health <= 0) {
      continue;
    }
    ensureFiniteUnitState(unit);
    const snappedCell = snapUnitToGrid(unit);
    aliveUnits.push(unit);
    unitByUnitId.set(unit.unitId, unit);
    cellByUnitId.set(unit.unitId, snappedCell);
    addOccupancy(occupiedByCellKey, snappedCell, unit.unitId);
  }

  for (const unit of aliveUnits) {
    const movementState = movementStateByUnitId.get(unit.unitId);
    if (!movementState) {
      continue;
    }

    if (movementState.terrainTransitionPauseRemainingSeconds > 0) {
      clearBlockedState(movementState);
      movementState.terrainTransitionPauseRemainingSeconds = Math.max(
        0,
        movementState.terrainTransitionPauseRemainingSeconds - deltaSeconds,
      );
      movementState.movementBudget = 0;
      continue;
    }

    if (isUnitMovementSuppressed(unit.unitId)) {
      clearBlockedState(movementState);
      movementState.movementBudget = 0;
      continue;
    }

    if (movementState.isPaused) {
      clearBlockedState(movementState);
      movementState.movementBudget = 0;
      continue;
    }

    if (!movementState.destinationCell && movementState.queuedCells.length > 0) {
      movementState.destinationCell = movementState.queuedCells.shift() ?? null;
      faceCurrentDestination(unit, movementState);
    }

    if (!movementState.destinationCell) {
      clearBlockedState(movementState);
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
      clearBlockedState(movementState);
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
        clearBlockedState(movementState);
        continue;
      }
    }

    let blockedByUnitIdForTick: string | null = null;
    while (movementState.destinationCell && movementState.movementBudget > 0) {
      const destinationCell = movementState.destinationCell;
      if (isCellImpassable(destinationCell)) {
        clearBlockedState(movementState);
        clearMovementForUnit(unit.unitId);
        break;
      }
      const destination = gridToWorldCenter(destinationCell);
      const toTargetX = destination.x - unit.x;
      const toTargetY = destination.y - unit.y;
      const distance = Math.hypot(toTargetX, toTargetY);

      if (distance <= 0.0001) {
        clearBlockedState(movementState);
        movementState.destinationCell = movementState.queuedCells.shift() ?? null;
        faceCurrentDestination(unit, movementState);
        continue;
      }

      if (movementState.movementBudget + 0.0001 < distance) {
        break;
      }

      const blockerUnitIds = getDestinationBlockers(
        occupiedByCellKey,
        destinationCell,
        unit.unitId,
      );
      if (blockerUnitIds.length > 0) {
        const primaryBlockerUnitId = blockerUnitIds[0];
        blockedByUnitIdForTick = primaryBlockerUnitId;
        const blockedTicks = setBlockedByUnit(
          movementState,
          primaryBlockerUnitId,
        );
        if (blockedTicks >= BLOCKED_TICKS_BEFORE_SIDESTEP) {
          tryQueueArrivedUnitSidestep({
            blockedUnitId: unit.unitId,
            blockerUnitId: primaryBlockerUnitId,
            movementStateByUnitId,
            unitByUnitId,
            cellByUnitId,
            occupiedByCellKey,
            isCellImpassable,
            isWaterCell,
            faceCurrentDestination,
          });
        }
        break;
      }

      const currentCell =
        cellByUnitId.get(unit.unitId) ?? worldToGridCoordinate(unit.x, unit.y);
      const crossedWaterBoundary =
        isWaterCell(currentCell) !== isWaterCell(destinationCell);
      removeOccupancy(occupiedByCellKey, currentCell, unit.unitId);

      unit.x = destination.x;
      unit.y = destination.y;
      movementState.movementBudget -= distance;
      clearBlockedState(movementState);

      const reachedCell = { col: destinationCell.col, row: destinationCell.row };
      cellByUnitId.set(unit.unitId, reachedCell);
      addOccupancy(occupiedByCellKey, reachedCell, unit.unitId);

      movementState.destinationCell = movementState.queuedCells.shift() ?? null;
      faceCurrentDestination(unit, movementState);
      if (crossedWaterBoundary && normalizedWaterTransitionPauseSeconds > 0) {
        movementState.terrainTransitionPauseRemainingSeconds =
          normalizedWaterTransitionPauseSeconds;
        movementState.movementBudget = 0;
        break;
      }

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

    if (blockedByUnitIdForTick === null) {
      clearBlockedState(movementState);
    }
  }
}
