import assert from 'node:assert/strict';
import {
  updateCityOwnershipFromOccupancy,
} from './CityControlSystem.js';
import type { GridCoordinate, PlayerTeam } from '../../rooms/BattleRoomTypes.js';

function zoneKey(zoneCells: readonly GridCoordinate[]): string {
  return zoneCells
    .map((cell) => `${cell.col},${cell.row}`)
    .sort()
    .join('|');
}

function runContestedZoneDoesNotFlipOwnershipTest(): void {
  const redZone: GridCoordinate[] = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
  ];
  const blueZone: GridCoordinate[] = [
    { col: 5, row: 5 },
    { col: 6, row: 5 },
  ];
  const neutralZone: GridCoordinate[] = [
    { col: 3, row: 3 },
    { col: 3, row: 4 },
  ];
  const occupancyByZoneKey = new Map<string, PlayerTeam | null>([
    [zoneKey(redZone), null],
    [zoneKey(blueZone), null],
    [zoneKey(neutralZone), null],
  ]);

  let redOwner: PlayerTeam = 'RED';
  let blueOwner: PlayerTeam = 'BLUE';
  let neutralOwner: PlayerTeam | 'NEUTRAL' = 'NEUTRAL';

  const changed = updateCityOwnershipFromOccupancy({
    getUncontestedOccupyingTeamAtZone: (zoneCells) =>
      occupancyByZoneKey.get(zoneKey(zoneCells)) ?? null,
    getCityZoneCells: (homeCity) => (homeCity === 'RED' ? redZone : blueZone),
    getCityOwner: (homeCity) => (homeCity === 'RED' ? redOwner : blueOwner),
    setCityOwner: (homeCity, owner) => {
      if (homeCity === 'RED') {
        redOwner = owner;
      } else {
        blueOwner = owner;
      }
    },
    neutralCityCount: 1,
    getNeutralCityZoneCells: (index) => (index === 0 ? neutralZone : null),
    getNeutralCityOwner: () => neutralOwner,
    setNeutralCityOwner: (_index, owner) => {
      neutralOwner = owner;
    },
  });

  assert.equal(changed, false);
  assert.equal(redOwner, 'RED');
  assert.equal(blueOwner, 'BLUE');
  assert.equal(neutralOwner, 'NEUTRAL');
}

function runUncontestedZoneFlipsOwnershipTest(): void {
  const redZone: GridCoordinate[] = [{ col: 0, row: 0 }];
  const blueZone: GridCoordinate[] = [{ col: 5, row: 5 }];
  const neutralZone: GridCoordinate[] = [{ col: 3, row: 3 }];
  const occupancyByZoneKey = new Map<string, PlayerTeam | null>([
    [zoneKey(redZone), 'BLUE'],
    [zoneKey(blueZone), 'BLUE'],
    [zoneKey(neutralZone), 'RED'],
  ]);

  let redOwner: PlayerTeam = 'RED';
  let blueOwner: PlayerTeam = 'BLUE';
  let neutralOwner: PlayerTeam | 'NEUTRAL' = 'NEUTRAL';

  const changed = updateCityOwnershipFromOccupancy({
    getUncontestedOccupyingTeamAtZone: (zoneCells) =>
      occupancyByZoneKey.get(zoneKey(zoneCells)) ?? null,
    getCityZoneCells: (homeCity) => (homeCity === 'RED' ? redZone : blueZone),
    getCityOwner: (homeCity) => (homeCity === 'RED' ? redOwner : blueOwner),
    setCityOwner: (homeCity, owner) => {
      if (homeCity === 'RED') {
        redOwner = owner;
      } else {
        blueOwner = owner;
      }
    },
    neutralCityCount: 1,
    getNeutralCityZoneCells: (index) => (index === 0 ? neutralZone : null),
    getNeutralCityOwner: () => neutralOwner,
    setNeutralCityOwner: (_index, owner) => {
      neutralOwner = owner;
    },
  });

  assert.equal(changed, true);
  assert.equal(redOwner, 'BLUE');
  assert.equal(blueOwner, 'BLUE');
  assert.equal(neutralOwner, 'RED');
}

runContestedZoneDoesNotFlipOwnershipTest();
runUncontestedZoneFlipsOwnershipTest();
