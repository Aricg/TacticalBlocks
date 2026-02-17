import type {
  CityOwner,
  CitySpawnSource,
  GridCoordinate,
  PlayerTeam,
  Vector2,
} from "../../rooms/BattleRoomTypes.js";
import { Unit } from "../../schema/Unit.js";
import { DEFAULT_UNIT_TYPE } from "../../../../shared/src/unitTypes.js";

export interface CollectCitySpawnSourcesParams {
  neutralCityCount: number;
  getCityOwner: (homeCity: PlayerTeam) => PlayerTeam;
  getCityCell: (homeCity: PlayerTeam) => GridCoordinate;
  getNeutralCityOwner: (index: number) => CityOwner;
  getNeutralCityCell: (index: number) => GridCoordinate | null;
}

export function getHomeCitySpawnSourceId(homeCity: PlayerTeam): string {
  return `home:${homeCity}`;
}

export function getNeutralCitySpawnSourceId(index: number): string {
  return `neutral:${index}`;
}

export function collectCitySpawnSources({
  neutralCityCount,
  getCityOwner,
  getCityCell,
  getNeutralCityOwner,
  getNeutralCityCell,
}: CollectCitySpawnSourcesParams): CitySpawnSource[] {
  const sources: CitySpawnSource[] = [];
  const homeCities: PlayerTeam[] = ["RED", "BLUE"];
  for (const homeCity of homeCities) {
    sources.push({
      sourceId: getHomeCitySpawnSourceId(homeCity),
      owner: getCityOwner(homeCity),
      cityCell: getCityCell(homeCity),
    });
  }

  for (let index = 0; index < neutralCityCount; index += 1) {
    const owner = getNeutralCityOwner(index);
    const cityCell = getNeutralCityCell(index);
    if (!cityCell) {
      continue;
    }

    sources.push({
      sourceId: getNeutralCitySpawnSourceId(index),
      owner,
      cityCell,
    });
  }

  return sources;
}

export function syncCityGenerationTimers(
  cityGenerationElapsedSecondsBySourceId: Map<string, number>,
  sources: CitySpawnSource[],
): void {
  const validSourceIds = new Set<string>();
  for (const source of sources) {
    validSourceIds.add(source.sourceId);
    if (!cityGenerationElapsedSecondsBySourceId.has(source.sourceId)) {
      cityGenerationElapsedSecondsBySourceId.set(source.sourceId, 0);
    }
  }

  for (const sourceId of cityGenerationElapsedSecondsBySourceId.keys()) {
    if (!validSourceIds.has(sourceId)) {
      cityGenerationElapsedSecondsBySourceId.delete(sourceId);
    }
  }
}

export interface UpdateCityUnitGenerationParams {
  deltaSeconds: number;
  generationIntervalSeconds: number;
  cityGenerationElapsedSecondsBySourceId: Map<string, number>;
  spawnSources: CitySpawnSource[];
  findOpenSpawnCellNearCity: (cityCell: GridCoordinate) => GridCoordinate | null;
  spawnCityUnit: (team: PlayerTeam, spawnCell: GridCoordinate) => void;
}

export function updateCityUnitGeneration({
  deltaSeconds,
  generationIntervalSeconds,
  cityGenerationElapsedSecondsBySourceId,
  spawnSources,
  findOpenSpawnCellNearCity,
  spawnCityUnit,
}: UpdateCityUnitGenerationParams): number {
  if (deltaSeconds <= 0) {
    return 0;
  }

  let totalSpawnedUnits = 0;
  for (const source of spawnSources) {
    let elapsedSeconds =
      cityGenerationElapsedSecondsBySourceId.get(source.sourceId) ?? 0;
    elapsedSeconds += deltaSeconds;

    while (elapsedSeconds >= generationIntervalSeconds) {
      elapsedSeconds -= generationIntervalSeconds;
      if (source.owner === "NEUTRAL") {
        continue;
      }

      const spawnCell = findOpenSpawnCellNearCity(source.cityCell);
      if (!spawnCell) {
        continue;
      }

      spawnCityUnit(source.owner, spawnCell);
      totalSpawnedUnits += 1;
    }

    cityGenerationElapsedSecondsBySourceId.set(source.sourceId, elapsedSeconds);
  }

  return totalSpawnedUnits;
}

function gridKey(cell: GridCoordinate): string {
  return `${cell.col}:${cell.row}`;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export interface FindOpenSpawnCellNearCityParams {
  cityCell: GridCoordinate;
  searchRadius: number;
  gridWidth: number;
  gridHeight: number;
  isCitySpawnCellOpen: (targetCell: GridCoordinate) => boolean;
}

export function findOpenSpawnCellNearCity({
  cityCell,
  searchRadius,
  gridWidth,
  gridHeight,
  isCitySpawnCellOpen,
}: FindOpenSpawnCellNearCityParams): GridCoordinate | null {
  const visitedCellKeys = new Set<string>();
  for (let radius = 0; radius <= searchRadius; radius += 1) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        if (
          radius > 0 &&
          Math.max(Math.abs(colOffset), Math.abs(rowOffset)) !== radius
        ) {
          continue;
        }

        const candidateCell: GridCoordinate = {
          col: clamp(cityCell.col + colOffset, 0, gridWidth - 1),
          row: clamp(cityCell.row + rowOffset, 0, gridHeight - 1),
        };
        const candidateKey = gridKey(candidateCell);
        if (visitedCellKeys.has(candidateKey)) {
          continue;
        }
        visitedCellKeys.add(candidateKey);

        if (!isCitySpawnCellOpen(candidateCell)) {
          continue;
        }

        return candidateCell;
      }
    }
  }

  return null;
}

export function allocateGeneratedCityUnitId(
  team: PlayerTeam,
  generatedUnitSequenceByTeam: Record<PlayerTeam, number>,
  hasUnitId: (unitId: string) => boolean,
): string {
  const teamPrefix = team.toLowerCase();
  let unitId = "";
  while (unitId.length === 0 || hasUnitId(unitId)) {
    const nextSequence = generatedUnitSequenceByTeam[team];
    unitId = `city-${teamPrefix}-${nextSequence}`;
    generatedUnitSequenceByTeam[team] = nextSequence + 1;
  }
  return unitId;
}

export function getSpawnRotationForTeam(
  team: PlayerTeam,
  spawnPosition: Vector2,
  getCityWorldPosition: (homeCity: PlayerTeam) => Vector2,
  unitForwardOffset: number,
): number {
  const enemyHomeCity: PlayerTeam = team === "BLUE" ? "RED" : "BLUE";
  const enemyCityPosition = getCityWorldPosition(enemyHomeCity);
  const angleToEnemyHomeCity = Math.atan2(
    enemyCityPosition.y - spawnPosition.y,
    enemyCityPosition.x - spawnPosition.x,
  );
  return angleToEnemyHomeCity - unitForwardOffset;
}

export function createSpawnedCityUnit(
  unitId: string,
  team: PlayerTeam,
  spawnPosition: Vector2,
  rotation: number,
  baseUnitHealth: number,
): Unit {
  return new Unit(
    unitId,
    team.toLowerCase(),
    spawnPosition.x,
    spawnPosition.y,
    rotation,
    baseUnitHealth,
    DEFAULT_UNIT_TYPE,
  );
}
