import assert from 'node:assert/strict';
import { simulateMovementTick } from './MovementSimulation.js';
import type { UnitMovementState } from '../../rooms/BattleRoomTypes.js';
import type { Unit } from '../../schema/Unit.js';

function createMockUnit(unitId: string): Unit {
  return {
    unitId,
    team: 'red',
    x: 0,
    y: 0,
    rotation: 0,
    health: 100,
    moraleScore: 0,
    unitType: 'LINE',
  } as Unit;
}

function runRoadMultiplierMovementBudgetTest(): void {
  const unitWithoutRoad = createMockUnit('u-no-road');
  const noRoadMovementState: UnitMovementState = {
    destinationCell: { col: 2, row: 0 },
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
  };
  const movementStateByUnitId = new Map<string, UnitMovementState>([
    ['u-no-road', noRoadMovementState],
  ]);

  simulateMovementTick({
    deltaSeconds: 1,
    units: [unitWithoutRoad],
    movementStateByUnitId,
    unitMoveSpeed: 1,
    unitTurnSpeed: 1,
    unitForwardOffset: 0,
    refaceAngleThreshold: 0,
    waypointMoveAngleTolerance: Math.PI,
    ensureFiniteUnitState: () => {},
    snapUnitToGrid: (unit) => ({ col: Math.round(unit.x), row: Math.round(unit.y) }),
    worldToGridCoordinate: (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    getTerrainSpeedMultiplierAtCell: () => 1,
    isCellImpassable: () => false,
    isWaterCell: () => false,
    waterTransitionPauseSeconds: 0,
    gridToWorldCenter: (cell) => ({ x: cell.col, y: cell.row }),
    clearMovementForUnit: () => {},
    isUnitMovementSuppressed: () => false,
    faceCurrentDestination: () => {},
    wrapAngle: (angle) => angle,
  });

  assert.equal(unitWithoutRoad.x, 0);
  assert.equal(unitWithoutRoad.y, 0);

  const unitOnRoad = createMockUnit('u-road');
  const roadMovementState: UnitMovementState = {
    destinationCell: { col: 2, row: 0 },
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
  };
  const roadMovementStateByUnitId = new Map<string, UnitMovementState>([
    ['u-road', roadMovementState],
  ]);

  simulateMovementTick({
    deltaSeconds: 1,
    units: [unitOnRoad],
    movementStateByUnitId: roadMovementStateByUnitId,
    unitMoveSpeed: 1,
    unitTurnSpeed: 1,
    unitForwardOffset: 0,
    refaceAngleThreshold: 0,
    waypointMoveAngleTolerance: Math.PI,
    ensureFiniteUnitState: () => {},
    snapUnitToGrid: (unit) => ({ col: Math.round(unit.x), row: Math.round(unit.y) }),
    worldToGridCoordinate: (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    getTerrainSpeedMultiplierAtCell: () => 2,
    isCellImpassable: () => false,
    isWaterCell: () => false,
    waterTransitionPauseSeconds: 0,
    gridToWorldCenter: (cell) => ({ x: cell.col, y: cell.row }),
    clearMovementForUnit: () => {},
    isUnitMovementSuppressed: () => false,
    faceCurrentDestination: () => {},
    wrapAngle: (angle) => angle,
  });

  assert.equal(unitOnRoad.x, 2);
  assert.equal(unitOnRoad.y, 0);
}

runRoadMultiplierMovementBudgetTest();
