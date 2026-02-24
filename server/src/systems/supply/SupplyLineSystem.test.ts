import assert from 'node:assert/strict';
import {
  computeFarmToCitySupplyStatus,
  computeSupplyLinesForUnits,
} from './SupplyLineSystem.js';

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

runFarmSupplyFallbackForLegacyMapsTest();
runUnsuppliedCityCannotSupplyUnitsTest();
runSuppliedCityCanSupplyUnitsTest();
runFarmSupplySeversWhenEnemyOccupiesLinkCellTest();
