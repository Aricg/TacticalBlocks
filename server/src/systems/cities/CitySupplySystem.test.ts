import assert from "node:assert/strict";
import {
  buildCitySupplySourceIdByCityZoneId,
  resetCitySupplyForSources,
  updateCitySupplyAndGenerateUnits,
} from "./CitySupplySystem.js";
import type { CityOwner, CitySpawnSource } from "../../rooms/BattleRoomTypes.js";

function runSupplyTripsAccumulateAndSpawnUnitsTest(): void {
  const spawnSources: CitySpawnSource[] = [
    {
      sourceId: "home:RED",
      owner: "RED",
      cityCell: { col: 3, row: 4 },
    },
  ];
  const citySupplyBySourceId = new Map<string, number>();
  const citySupplyTripProgressBySourceId = new Map<string, number>();
  const citySupplyDecayProgressBySourceId = new Map<string, number>();
  const citySupplyOwnerBySourceId = new Map<string, CityOwner>();
  resetCitySupplyForSources({
    spawnSources,
    citySupplyBySourceId,
    citySupplyTripProgressBySourceId,
    citySupplyDecayProgressBySourceId,
    citySupplyOwnerBySourceId,
  });

  const sourceIdByCityZoneId = buildCitySupplySourceIdByCityZoneId({
    homeCityZoneIdByTeam: {
      RED: "home-red",
      BLUE: "home-blue",
    },
    neutralCityZoneIds: [],
  });

  let spawnedUnits = 0;
  for (let tick = 0; tick < 10; tick += 1) {
    updateCitySupplyAndGenerateUnits({
      deltaSeconds: 1,
      generationIntervalSeconds: 10,
      supplyPerUnitThreshold: 10,
      spawnSources,
      farmCitySupplyLines: [
        {
          cityZoneId: "home-red",
          connected: true,
        },
      ],
      sourceIdByCityZoneId,
      citySupplyBySourceId,
      citySupplyTripProgressBySourceId,
      citySupplyDecayProgressBySourceId,
      citySupplyOwnerBySourceId,
      findOpenSpawnCellNearCity: () => ({ col: 3, row: 5 }),
      spawnCityUnit: () => {
        spawnedUnits += 1;
      },
    });
  }

  assert.equal(spawnedUnits, 1);
  assert.equal(citySupplyBySourceId.get("home:RED"), 0);
}

function runUnsuppliedCitiesDecaySupplyTest(): void {
  const spawnSources: CitySpawnSource[] = [
    {
      sourceId: "home:RED",
      owner: "RED",
      cityCell: { col: 3, row: 4 },
    },
  ];
  const citySupplyBySourceId = new Map<string, number>([["home:RED", 5]]);
  const citySupplyTripProgressBySourceId = new Map<string, number>([
    ["home:RED", 0],
  ]);
  const citySupplyDecayProgressBySourceId = new Map<string, number>([
    ["home:RED", 0],
  ]);
  const citySupplyOwnerBySourceId = new Map<string, CityOwner>([
    ["home:RED", "RED"],
  ]);
  const sourceIdByCityZoneId = buildCitySupplySourceIdByCityZoneId({
    homeCityZoneIdByTeam: {
      RED: "home-red",
      BLUE: "home-blue",
    },
    neutralCityZoneIds: [],
  });

  for (let tick = 0; tick < 6; tick += 1) {
    updateCitySupplyAndGenerateUnits({
      deltaSeconds: 1,
      generationIntervalSeconds: 10,
      supplyPerUnitThreshold: 10,
      spawnSources,
      farmCitySupplyLines: [
        {
          cityZoneId: "home-red",
          connected: false,
        },
      ],
      sourceIdByCityZoneId,
      citySupplyBySourceId,
      citySupplyTripProgressBySourceId,
      citySupplyDecayProgressBySourceId,
      citySupplyOwnerBySourceId,
      findOpenSpawnCellNearCity: () => ({ col: 3, row: 5 }),
      spawnCityUnit: () => {},
    });
  }

  assert.equal(citySupplyBySourceId.get("home:RED"), 0);
}

function runOwnerChangeResetsSupplyTest(): void {
  const spawnSources: CitySpawnSource[] = [
    {
      sourceId: "home:RED",
      owner: "BLUE",
      cityCell: { col: 3, row: 4 },
    },
  ];
  const citySupplyBySourceId = new Map<string, number>([["home:RED", 9]]);
  const citySupplyTripProgressBySourceId = new Map<string, number>([
    ["home:RED", 0],
  ]);
  const citySupplyDecayProgressBySourceId = new Map<string, number>([
    ["home:RED", 0],
  ]);
  const citySupplyOwnerBySourceId = new Map<string, CityOwner>([
    ["home:RED", "RED"],
  ]);
  const sourceIdByCityZoneId = buildCitySupplySourceIdByCityZoneId({
    homeCityZoneIdByTeam: {
      RED: "home-red",
      BLUE: "home-blue",
    },
    neutralCityZoneIds: [],
  });

  const spawnedUnits = updateCitySupplyAndGenerateUnits({
    deltaSeconds: 1,
    generationIntervalSeconds: 10,
    supplyPerUnitThreshold: 10,
    spawnSources,
    farmCitySupplyLines: [
      {
        cityZoneId: "home-red",
        connected: true,
      },
    ],
    sourceIdByCityZoneId,
    citySupplyBySourceId,
    citySupplyTripProgressBySourceId,
    citySupplyDecayProgressBySourceId,
    citySupplyOwnerBySourceId,
    findOpenSpawnCellNearCity: () => ({ col: 3, row: 5 }),
    spawnCityUnit: () => {},
  });

  assert.equal(spawnedUnits, 0);
  assert.equal(citySupplyBySourceId.get("home:RED"), 1);
}

runSupplyTripsAccumulateAndSpawnUnitsTest();
runUnsuppliedCitiesDecaySupplyTest();
runOwnerChangeResetsSupplyTest();
