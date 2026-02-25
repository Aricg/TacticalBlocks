import assert from 'node:assert/strict';
import { isMoraleSafeStep, simulateMovementTick } from './MovementSimulation.js';
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

function runMovementSimulationTickForTest({
  units,
  movementStateByUnitId,
  unitMoveSpeed = 1,
  isCellImpassable,
}: {
  units: Unit[];
  movementStateByUnitId: Map<string, UnitMovementState>;
  unitMoveSpeed?: number;
  isCellImpassable?: (cell: { col: number; row: number }) => boolean;
}): void {
  simulateMovementTick({
    deltaSeconds: 1,
    units,
    movementStateByUnitId,
    unitMoveSpeed,
    unitTurnSpeed: 1,
    unitForwardOffset: 0,
    refaceAngleThreshold: 0,
    waypointMoveAngleTolerance: Math.PI,
    ensureFiniteUnitState: () => {},
    snapUnitToGrid: (unit) => ({ col: Math.round(unit.x), row: Math.round(unit.y) }),
    worldToGridCoordinate: (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    getTerrainSpeedMultiplierAtCell: () => 1,
    isCellImpassable: isCellImpassable ?? (() => false),
    isWaterCell: () => false,
    waterTransitionPauseSeconds: 0,
    gridToWorldCenter: (cell) => ({ x: cell.col, y: cell.row }),
    clearMovementForUnit: () => {},
    isUnitMovementSuppressed: () => false,
    faceCurrentDestination: () => {},
    wrapAngle: (angle) => angle,
  });
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

function runMoraleSafeStepRejectsMoraleLossTest(): void {
  assert.equal(
    isMoraleSafeStep({
      currentCell: { col: 0, row: 0 },
      destinationCell: { col: 1, row: 0 },
      getTerrainMoraleBonusAtCell: (cell) => (cell.col === 0 ? 0 : -5),
      getHillGradeAtCell: () => 0,
      getCityMoraleBonusAtCell: () => 0,
    }),
    false,
  );

  assert.equal(
    isMoraleSafeStep({
      currentCell: { col: 0, row: 0 },
      destinationCell: { col: 1, row: 0 },
      getTerrainMoraleBonusAtCell: () => 0,
      getHillGradeAtCell: (cell) => (cell.col === 0 ? 2 : 1),
      getCityMoraleBonusAtCell: () => 0,
    }),
    false,
  );

  assert.equal(
    isMoraleSafeStep({
      currentCell: { col: 0, row: 0 },
      destinationCell: { col: 1, row: 0 },
      getTerrainMoraleBonusAtCell: () => 0,
      getHillGradeAtCell: () => 0,
      getCityMoraleBonusAtCell: (cell) => (cell.col === 0 ? 1 : 0),
    }),
    false,
  );
}

function runMoraleSafeStepAllowsEqualOrBetterMoraleTest(): void {
  assert.equal(
    isMoraleSafeStep({
      currentCell: { col: 0, row: 0 },
      destinationCell: { col: 1, row: 0 },
      getTerrainMoraleBonusAtCell: () => 0,
      getHillGradeAtCell: () => 0,
      getCityMoraleBonusAtCell: () => 0,
    }),
    true,
  );

  assert.equal(
    isMoraleSafeStep({
      currentCell: { col: 0, row: 0 },
      destinationCell: { col: 1, row: 0 },
      getTerrainMoraleBonusAtCell: (cell) => (cell.col === 0 ? 0 : 1),
      getHillGradeAtCell: (cell) => (cell.col === 0 ? 1 : 2),
      getCityMoraleBonusAtCell: (cell) => (cell.col === 0 ? 0 : 1),
    }),
    true,
  );
}

function runBlockedByUnitTrackingTest(): void {
  const blocker = createMockUnit('u-blocker');
  blocker.x = 1;
  blocker.y = 0;
  const blocked = createMockUnit('u-blocked');
  blocked.x = 0;
  blocked.y = 0;

  const blockerMovementState: UnitMovementState = {
    destinationCell: null,
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
    blockedByUnitId: null,
    blockedTicks: 0,
  };
  const blockedMovementState: UnitMovementState = {
    destinationCell: { col: 1, row: 0 },
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
    blockedByUnitId: null,
    blockedTicks: 0,
  };
  const movementStateByUnitId = new Map<string, UnitMovementState>([
    ['u-blocker', blockerMovementState],
    ['u-blocked', blockedMovementState],
  ]);

  runMovementSimulationTickForTest({
    units: [blocker, blocked],
    movementStateByUnitId,
  });
  assert.equal(blockedMovementState.blockedByUnitId, 'u-blocker');
  assert.equal(blockedMovementState.blockedTicks, 1);
  assert.equal(blocked.x, 0);
  assert.equal(blocked.y, 0);

  runMovementSimulationTickForTest({
    units: [blocker, blocked],
    movementStateByUnitId,
  });
  assert.equal(blockedMovementState.blockedByUnitId, 'u-blocker');
  assert.equal(blockedMovementState.blockedTicks, 2);
}

function runArrivedUnitSidestepUnblocksFollowerTest(): void {
  const blocker = createMockUnit('u-arrived-blocker');
  blocker.x = 1;
  blocker.y = 0;
  const blocked = createMockUnit('u-follower');
  blocked.x = 0;
  blocked.y = 0;

  const blockerMovementState: UnitMovementState = {
    destinationCell: null,
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
    blockedByUnitId: null,
    blockedTicks: 0,
  };
  const blockedMovementState: UnitMovementState = {
    destinationCell: { col: 1, row: 0 },
    queuedCells: [],
    targetRotation: null,
    movementCommandMode: {
      speedMultiplier: 1,
      rotateToFace: false,
    },
    movementBudget: 0,
    isPaused: false,
    terrainTransitionPauseRemainingSeconds: 0,
    blockedByUnitId: null,
    blockedTicks: 0,
  };
  const movementStateByUnitId = new Map<string, UnitMovementState>([
    ['u-arrived-blocker', blockerMovementState],
    ['u-follower', blockedMovementState],
  ]);
  const isCellImpassable = (cell: { col: number; row: number }): boolean =>
    cell.col < 0 || cell.row < 0 || cell.col > 4 || cell.row > 4;

  for (let i = 0; i < 6; i += 1) {
    runMovementSimulationTickForTest({
      units: [blocker, blocked],
      movementStateByUnitId,
      isCellImpassable,
    });
  }

  assert.ok(blockerMovementState.destinationCell !== null);
  assert.equal(blockerMovementState.queuedCells.length, 1);
  assert.equal(blockerMovementState.queuedCells[0]?.col, 1);
  assert.equal(blockerMovementState.queuedCells[0]?.row, 0);

  runMovementSimulationTickForTest({
    units: [blocker, blocked],
    movementStateByUnitId,
    unitMoveSpeed: 2,
    isCellImpassable,
  });

  assert.equal(blocked.x, 1);
  assert.equal(blocked.y, 0);
  assert.equal(blockedMovementState.blockedByUnitId, null);
  assert.equal(blockedMovementState.blockedTicks, 0);
}

runRoadMultiplierMovementBudgetTest();
runMoraleSafeStepRejectsMoraleLossTest();
runMoraleSafeStepAllowsEqualOrBetterMoraleTest();
runBlockedByUnitTrackingTest();
runArrivedUnitSidestepUnblocksFollowerTest();
