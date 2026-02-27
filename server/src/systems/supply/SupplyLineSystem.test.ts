import assert from 'node:assert/strict';
import {
  advanceBouncingSupplyTrip,
  computeSupplyPathOneWayTravelSeconds,
  consumeDepotSupplyStock,
  computeFarmToCitySupplyStatus,
  computeSupplyLinesForUnits,
} from './SupplyLineSystem.js';
import { traceGridLine } from '../movement/gridPathing.js';

function runFarmSupplyFallbackForLegacyMapsTest(): void {
  const result = computeFarmToCitySupplyStatus({
    cityZones: [
      {
        cityZoneId: 'home-red',
        owner: 'RED',
        cityCell: { col: 0, row: 0 },
      },
    ],
    farmZones: [],
    farmToCityLinks: [],
    getInfluenceScoreAtCell: () => 0,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
  });

  assert.equal(result.suppliedCityZoneIds.has('home-red'), true);
  assert.equal(result.suppliedCityCellKeys.has('0,0'), true);
}

function runUnsuppliedCityCannotSupplyUnitsTest(): void {
  const supplyStatus = computeFarmToCitySupplyStatus({
    cityZones: [
      {
        cityZoneId: 'home-red',
        owner: 'RED',
        cityCell: { col: 0, row: 0 },
      },
    ],
    farmZones: [
      {
        farmZoneId: 'farm-home-red',
        sourceCell: { col: 3, row: 0 },
      },
    ],
    farmToCityLinks: [
      {
        farmZoneId: 'farm-home-red',
        cityZoneId: 'home-red',
      },
    ],
    getInfluenceScoreAtCell: () => 1,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
  });

  assert.equal(supplyStatus.suppliedCityZoneIds.has('home-red'), false);

  const { supplyLinesByUnitId } = computeSupplyLinesForUnits({
    units: [
      {
        unitId: 'u-red',
        team: 'RED',
        health: 100,
        x: 1,
        y: 0,
      },
    ],
    worldToGridCoordinate: (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    getTeamCityCell: () => ({ col: 0, row: 0 }),
    redCityOwner: 'RED',
    blueCityOwner: 'BLUE',
    neutralCityOwners: [],
    neutralCityCells: [],
    getInfluenceScoreAtCell: () => 0,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
    isCitySupplySourceEligible: (_team, cityCell) =>
      supplyStatus.suppliedCityCellKeys.has(`${cityCell.col},${cityCell.row}`),
  });

  const line = supplyLinesByUnitId.get('u-red');
  assert.ok(line);
  assert.equal(line.connected, false);
  assert.equal(line.sourceCol, -1);
  assert.equal(line.path.length, 0);
}

function runSuppliedCityCanSupplyUnitsTest(): void {
  const supplyStatus = computeFarmToCitySupplyStatus({
    cityZones: [
      {
        cityZoneId: 'home-red',
        owner: 'RED',
        cityCell: { col: 0, row: 0 },
      },
    ],
    farmZones: [
      {
        farmZoneId: 'farm-home-red',
        sourceCell: { col: 2, row: 0 },
      },
    ],
    farmToCityLinks: [
      {
        farmZoneId: 'farm-home-red',
        cityZoneId: 'home-red',
      },
    ],
    getInfluenceScoreAtCell: () => 0,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
  });

  assert.equal(supplyStatus.suppliedCityZoneIds.has('home-red'), true);

  const { supplyLinesByUnitId } = computeSupplyLinesForUnits({
    units: [
      {
        unitId: 'u-red',
        team: 'RED',
        health: 100,
        x: 1,
        y: 0,
      },
    ],
    worldToGridCoordinate: (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    getTeamCityCell: () => ({ col: 0, row: 0 }),
    redCityOwner: 'RED',
    blueCityOwner: 'BLUE',
    neutralCityOwners: [],
    neutralCityCells: [],
    getInfluenceScoreAtCell: () => 0,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
    isCitySupplySourceEligible: (_team, cityCell) =>
      supplyStatus.suppliedCityCellKeys.has(`${cityCell.col},${cityCell.row}`),
  });

  const line = supplyLinesByUnitId.get('u-red');
  assert.ok(line);
  assert.equal(line.connected, true);
  assert.equal(line.sourceCol, 0);
  assert.equal(line.sourceRow, 0);
  assert.equal(line.path.length >= 2, true);
}

function runFarmSupplySeversWhenEnemyOccupiesLinkCellTest(): void {
  const supplyStatus = computeFarmToCitySupplyStatus({
    cityZones: [
      {
        cityZoneId: 'home-red',
        owner: 'RED',
        cityCell: { col: 0, row: 0 },
      },
    ],
    farmZones: [
      {
        farmZoneId: 'farm-home-red',
        sourceCell: { col: 3, row: 0 },
      },
    ],
    farmToCityLinks: [
      {
        farmZoneId: 'farm-home-red',
        cityZoneId: 'home-red',
      },
    ],
    // Friendly-leaning net influence should not sever by influence alone.
    getInfluenceScoreAtCell: () => -5,
    isCellImpassable: () => false,
    enemyInfluenceSeverThreshold: 0.0001,
    isEnemyOccupiedCellForTeam: (_team, cell) => cell.col === 2 && cell.row === 0,
  });

  assert.equal(supplyStatus.suppliedCityZoneIds.has('home-red'), false);
  assert.equal(supplyStatus.linkStates.length, 1);
  assert.equal(supplyStatus.linkStates[0]?.connected, false);
  assert.equal(supplyStatus.linkStates[0]?.severIndex, 1);
}

function runTraceGridLineDirectionInvarianceTest(): void {
  const pairs = [
    {
      start: { col: 0, row: 0 },
      end: { col: 1, row: 2 },
    },
    {
      start: { col: 13, row: 22 },
      end: { col: 34, row: 17 },
    },
    {
      start: { col: 67, row: 22 },
      end: { col: 42, row: 31 },
    },
    {
      start: { col: 40, row: 8 },
      end: { col: 19, row: 37 },
    },
  ];

  for (const { start, end } of pairs) {
    const forward = traceGridLine(start, end);
    const reverse = traceGridLine(end, start).reverse();
    assert.deepEqual(forward, reverse);
  }
}

function runSupplyPathTravelDurationScalesWithDistanceTest(): void {
  const shortDuration = computeSupplyPathOneWayTravelSeconds({
    path: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ],
    cellWidth: 10,
    cellHeight: 10,
    baseMoveSpeed: 5,
    getSpeedMultiplierAtCell: () => 1,
  });
  const longDuration = computeSupplyPathOneWayTravelSeconds({
    path: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ],
    cellWidth: 10,
    cellHeight: 10,
    baseMoveSpeed: 5,
    getSpeedMultiplierAtCell: () => 1,
  });

  assert.equal(shortDuration, 2);
  assert.equal(longDuration, 6);
}

function runSupplyPathRoadSpeedMultiplierTest(): void {
  const noRoadDuration = computeSupplyPathOneWayTravelSeconds({
    path: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ],
    cellWidth: 10,
    cellHeight: 10,
    baseMoveSpeed: 10,
    getSpeedMultiplierAtCell: () => 1,
  });
  const withRoadDuration = computeSupplyPathOneWayTravelSeconds({
    path: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ],
    cellWidth: 10,
    cellHeight: 10,
    baseMoveSpeed: 10,
    getSpeedMultiplierAtCell: (cell) => (cell.col >= 1 ? 2 : 1),
  });

  assert.equal(noRoadDuration, 2);
  assert.equal(withRoadDuration, 1.5);
  assert.equal(withRoadDuration < noRoadDuration, true);
}

function runBouncingSupplyTripCountsOutboundArrivalsTest(): void {
  const result = advanceBouncingSupplyTrip({
    previousPhase: 0.8,
    deltaSeconds: 1.4,
    oneWayTravelSeconds: 1,
  });

  assert.equal(result.completedOutboundTrips, 1);
  assert.ok(Math.abs(result.nextPhase - 0.2) < 1e-9);
}

function runDepotSupplyPulseConsumptionTest(): void {
  const result = consumeDepotSupplyStock({
    currentStock: 3,
    pulseElapsedSeconds: 0.4,
    deltaSeconds: 1.8,
    pulseIntervalSeconds: 1,
  });

  assert.equal(result.pulsesTriggered, 2);
  assert.equal(result.nextStock, 1);
  assert.ok(Math.abs(result.nextPulseElapsedSeconds - 0.2) < 1e-9);

  const depleted = consumeDepotSupplyStock({
    currentStock: 1,
    pulseElapsedSeconds: 0.9,
    deltaSeconds: 0.2,
    pulseIntervalSeconds: 1,
  });
  assert.equal(depleted.pulsesTriggered, 1);
  assert.equal(depleted.nextStock, 0);
  assert.equal(depleted.nextPulseElapsedSeconds, 0);
}

runFarmSupplyFallbackForLegacyMapsTest();
runUnsuppliedCityCannotSupplyUnitsTest();
runSuppliedCityCanSupplyUnitsTest();
runFarmSupplySeversWhenEnemyOccupiesLinkCellTest();
runTraceGridLineDirectionInvarianceTest();
runSupplyPathTravelDurationScalesWithDistanceTest();
runSupplyPathRoadSpeedMultiplierTest();
runBouncingSupplyTripCountsOutboundArrivalsTest();
runDepotSupplyPulseConsumptionTest();
