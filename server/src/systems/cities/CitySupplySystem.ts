import type {
  CityOwner,
  CitySpawnSource,
  GridCoordinate,
  PlayerTeam,
} from "../../rooms/BattleRoomTypes.js";

function getHomeCitySupplySourceId(homeCity: PlayerTeam): string {
  return `home:${homeCity}`;
}

function getNeutralCitySupplySourceId(index: number): string {
  return `neutral:${index}`;
}

type MutableNumberStore = {
  has: (key: string) => boolean;
  get: (key: string) => number | undefined;
  set: (key: string, value: number) => void;
  delete: (key: string) => boolean;
  keys: () => Iterable<string>;
};

type FarmCitySupplyLinkState = {
  cityZoneId: string;
  connected: boolean;
};

function getNormalizedSupplyAmount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function syncCitySupplyState({
  spawnSources,
  citySupplyBySourceId,
  citySupplyTripProgressBySourceId,
  citySupplyDecayProgressBySourceId,
  citySupplyOwnerBySourceId,
}: {
  spawnSources: readonly CitySpawnSource[];
  citySupplyBySourceId: MutableNumberStore;
  citySupplyTripProgressBySourceId: Map<string, number>;
  citySupplyDecayProgressBySourceId: Map<string, number>;
  citySupplyOwnerBySourceId: Map<string, CityOwner>;
}): void {
  const validSourceIds = new Set<string>();
  for (const source of spawnSources) {
    validSourceIds.add(source.sourceId);
    if (!citySupplyBySourceId.has(source.sourceId)) {
      citySupplyBySourceId.set(source.sourceId, 0);
    }
    if (!citySupplyTripProgressBySourceId.has(source.sourceId)) {
      citySupplyTripProgressBySourceId.set(source.sourceId, 0);
    }
    if (!citySupplyDecayProgressBySourceId.has(source.sourceId)) {
      citySupplyDecayProgressBySourceId.set(source.sourceId, 0);
    }
    if (!citySupplyOwnerBySourceId.has(source.sourceId)) {
      citySupplyOwnerBySourceId.set(source.sourceId, source.owner);
    }
  }

  for (const sourceId of Array.from(citySupplyBySourceId.keys())) {
    if (validSourceIds.has(sourceId)) {
      continue;
    }
    citySupplyBySourceId.delete(sourceId);
  }
  for (const sourceId of Array.from(citySupplyTripProgressBySourceId.keys())) {
    if (validSourceIds.has(sourceId)) {
      continue;
    }
    citySupplyTripProgressBySourceId.delete(sourceId);
  }
  for (const sourceId of Array.from(citySupplyDecayProgressBySourceId.keys())) {
    if (validSourceIds.has(sourceId)) {
      continue;
    }
    citySupplyDecayProgressBySourceId.delete(sourceId);
  }
  for (const sourceId of Array.from(citySupplyOwnerBySourceId.keys())) {
    if (validSourceIds.has(sourceId)) {
      continue;
    }
    citySupplyOwnerBySourceId.delete(sourceId);
  }
}

export function resetCitySupplyForSources({
  spawnSources,
  citySupplyBySourceId,
  citySupplyTripProgressBySourceId,
  citySupplyDecayProgressBySourceId,
  citySupplyOwnerBySourceId,
}: {
  spawnSources: readonly CitySpawnSource[];
  citySupplyBySourceId: MutableNumberStore;
  citySupplyTripProgressBySourceId: Map<string, number>;
  citySupplyDecayProgressBySourceId: Map<string, number>;
  citySupplyOwnerBySourceId: Map<string, CityOwner>;
}): void {
  syncCitySupplyState({
    spawnSources,
    citySupplyBySourceId,
    citySupplyTripProgressBySourceId,
    citySupplyDecayProgressBySourceId,
    citySupplyOwnerBySourceId,
  });
  for (const source of spawnSources) {
    citySupplyBySourceId.set(source.sourceId, 0);
    citySupplyTripProgressBySourceId.set(source.sourceId, 0);
    citySupplyDecayProgressBySourceId.set(source.sourceId, 0);
    citySupplyOwnerBySourceId.set(source.sourceId, source.owner);
  }
}

export function buildCitySupplySourceIdByCityZoneId({
  homeCityZoneIdByTeam,
  neutralCityZoneIds,
}: {
  homeCityZoneIdByTeam: Record<PlayerTeam, string>;
  neutralCityZoneIds: readonly string[];
}): Map<string, string> {
  const sourceIdByCityZoneId = new Map<string, string>();
  sourceIdByCityZoneId.set(
    homeCityZoneIdByTeam.RED,
    getHomeCitySupplySourceId("RED"),
  );
  sourceIdByCityZoneId.set(
    homeCityZoneIdByTeam.BLUE,
    getHomeCitySupplySourceId("BLUE"),
  );
  for (let index = 0; index < neutralCityZoneIds.length; index += 1) {
    sourceIdByCityZoneId.set(
      neutralCityZoneIds[index] ?? `neutral-${index}`,
      getNeutralCitySupplySourceId(index),
    );
  }
  return sourceIdByCityZoneId;
}

export function updateCitySupplyAndGenerateUnits({
  deltaSeconds,
  generationIntervalSeconds,
  supplyPerUnitThreshold,
  spawnSources,
  farmCitySupplyLines,
  sourceIdByCityZoneId,
  citySupplyBySourceId,
  citySupplyTripProgressBySourceId,
  citySupplyDecayProgressBySourceId,
  citySupplyOwnerBySourceId,
  findOpenSpawnCellNearCity,
  spawnCityUnit,
}: {
  deltaSeconds: number;
  generationIntervalSeconds: number;
  supplyPerUnitThreshold: number;
  spawnSources: readonly CitySpawnSource[];
  farmCitySupplyLines: Iterable<FarmCitySupplyLinkState>;
  sourceIdByCityZoneId: ReadonlyMap<string, string>;
  citySupplyBySourceId: MutableNumberStore;
  citySupplyTripProgressBySourceId: Map<string, number>;
  citySupplyDecayProgressBySourceId: Map<string, number>;
  citySupplyOwnerBySourceId: Map<string, CityOwner>;
  findOpenSpawnCellNearCity: (cityCell: GridCoordinate) => GridCoordinate | null;
  spawnCityUnit: (team: PlayerTeam, spawnCell: GridCoordinate) => void;
}): number {
  if (
    deltaSeconds <= 0 ||
    generationIntervalSeconds <= 0 ||
    supplyPerUnitThreshold <= 0
  ) {
    return 0;
  }

  syncCitySupplyState({
    spawnSources,
    citySupplyBySourceId,
    citySupplyTripProgressBySourceId,
    citySupplyDecayProgressBySourceId,
    citySupplyOwnerBySourceId,
  });

  const supplyTripDurationSeconds =
    generationIntervalSeconds / supplyPerUnitThreshold;
  if (supplyTripDurationSeconds <= 0) {
    return 0;
  }
  const tripProgressPerSecond = 1 / supplyTripDurationSeconds;

  const connectedLinkCountBySourceId = new Map<string, number>();
  let farmCityLinkCount = 0;
  for (const supplyLine of farmCitySupplyLines) {
    farmCityLinkCount += 1;
    if (!supplyLine.connected) {
      continue;
    }
    const sourceId = sourceIdByCityZoneId.get(supplyLine.cityZoneId);
    if (!sourceId) {
      continue;
    }
    connectedLinkCountBySourceId.set(
      sourceId,
      (connectedLinkCountBySourceId.get(sourceId) ?? 0) + 1,
    );
  }
  if (farmCityLinkCount === 0) {
    for (const source of spawnSources) {
      if (source.owner === "NEUTRAL") {
        continue;
      }
      connectedLinkCountBySourceId.set(source.sourceId, 1);
    }
  }

  let totalSpawnedUnits = 0;
  for (const source of spawnSources) {
    const sourceId = source.sourceId;
    const lastOwner = citySupplyOwnerBySourceId.get(sourceId);
    if (lastOwner !== source.owner) {
      citySupplyBySourceId.set(sourceId, 0);
      citySupplyTripProgressBySourceId.set(sourceId, 0);
      citySupplyDecayProgressBySourceId.set(sourceId, 0);
    }
    citySupplyOwnerBySourceId.set(sourceId, source.owner);

    if (source.owner === "NEUTRAL") {
      citySupplyBySourceId.set(sourceId, 0);
      citySupplyTripProgressBySourceId.set(sourceId, 0);
      citySupplyDecayProgressBySourceId.set(sourceId, 0);
      continue;
    }

    let supplyAmount = getNormalizedSupplyAmount(citySupplyBySourceId.get(sourceId));
    const connectedLinkCount = connectedLinkCountBySourceId.get(sourceId) ?? 0;

    if (connectedLinkCount > 0) {
      const tripProgress =
        (citySupplyTripProgressBySourceId.get(sourceId) ?? 0) +
        deltaSeconds * tripProgressPerSecond * connectedLinkCount;
      const completedTrips = Math.floor(tripProgress);
      citySupplyTripProgressBySourceId.set(sourceId, tripProgress - completedTrips);
      citySupplyDecayProgressBySourceId.set(sourceId, 0);
      if (completedTrips > 0) {
        supplyAmount += completedTrips;
      }
    } else {
      const decayProgress =
        (citySupplyDecayProgressBySourceId.get(sourceId) ?? 0) +
        deltaSeconds * tripProgressPerSecond;
      const completedDecaySteps = Math.floor(decayProgress);
      citySupplyDecayProgressBySourceId.set(
        sourceId,
        decayProgress - completedDecaySteps,
      );
      citySupplyTripProgressBySourceId.set(sourceId, 0);
      if (completedDecaySteps > 0) {
        supplyAmount = Math.max(0, supplyAmount - completedDecaySteps);
      }
    }

    while (supplyAmount >= supplyPerUnitThreshold) {
      const spawnCell = findOpenSpawnCellNearCity(source.cityCell);
      if (!spawnCell) {
        break;
      }
      spawnCityUnit(source.owner, spawnCell);
      totalSpawnedUnits += 1;
      supplyAmount -= supplyPerUnitThreshold;
    }

    const normalizedSupplyAmount = Math.max(0, Math.floor(supplyAmount));
    if (getNormalizedSupplyAmount(citySupplyBySourceId.get(sourceId)) !== normalizedSupplyAmount) {
      citySupplyBySourceId.set(sourceId, normalizedSupplyAmount);
    }
  }

  return totalSpawnedUnits;
}
