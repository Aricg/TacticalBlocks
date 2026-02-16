import { traceGridLine } from "../movement/gridPathing.js";
import type { GridCoordinate } from "../../rooms/BattleRoomTypes.js";
import type { PlayerTeam } from "../../../../shared/src/networkContracts.js";

export type SupplyUnitInput = {
  unitId: string;
  team: string;
  health: number;
  x: number;
  y: number;
};

export type ComputedSupplyLineState = {
  unitId: string;
  team: PlayerTeam;
  connected: boolean;
  sourceCol: number;
  sourceRow: number;
  severIndex: number;
  path: GridCoordinate[];
};

type OwnedCityCellsByTeam = Record<PlayerTeam, GridCoordinate[]>;

export type ComputeSupplyLinesParams = {
  units: Iterable<SupplyUnitInput>;
  worldToGridCoordinate: (x: number, y: number) => GridCoordinate;
  getTeamCityCell: (team: PlayerTeam) => GridCoordinate;
  redCityOwner: string;
  blueCityOwner: string;
  neutralCityOwners: ArrayLike<string>;
  neutralCityCells: readonly GridCoordinate[];
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  enemyInfluenceSeverThreshold: number;
  previousRetryStateByUnitId?: ReadonlyMap<string, SupplySourceRetryState>;
  blockedSourceRetryIntervalMs?: number;
  nowMs?: number;
};

export type SupplySourceRetryState = {
  sourceCol: number;
  sourceRow: number;
  nextSwitchAtMs: number;
};

export type ComputeSupplyLinesResult = {
  supplyLinesByUnitId: Map<string, ComputedSupplyLineState>;
  retryStateByUnitId: Map<string, SupplySourceRetryState>;
};

function normalizeTeam(team: string): PlayerTeam | null {
  const normalized = team.toUpperCase();
  if (normalized === "RED" || normalized === "BLUE") {
    return normalized;
  }
  return null;
}

function getTeamSign(team: PlayerTeam): 1 | -1 {
  return team === "BLUE" ? 1 : -1;
}

function createDisconnectedSupplyState(
  unitId: string,
  team: PlayerTeam,
): ComputedSupplyLineState {
  return {
    unitId,
    team,
    connected: false,
    sourceCol: -1,
    sourceRow: -1,
    severIndex: -1,
    path: [],
  };
}

export function collectOwnedCityCellsByTeam({
  getTeamCityCell,
  redCityOwner,
  blueCityOwner,
  neutralCityOwners,
  neutralCityCells,
}: {
  getTeamCityCell: (team: PlayerTeam) => GridCoordinate;
  redCityOwner: string;
  blueCityOwner: string;
  neutralCityOwners: ArrayLike<string>;
  neutralCityCells: readonly GridCoordinate[];
}): OwnedCityCellsByTeam {
  const ownedByTeam: OwnedCityCellsByTeam = {
    BLUE: [],
    RED: [],
  };

  const normalizedRedOwner = normalizeTeam(redCityOwner);
  if (normalizedRedOwner) {
    ownedByTeam[normalizedRedOwner].push(getTeamCityCell("RED"));
  }

  const normalizedBlueOwner = normalizeTeam(blueCityOwner);
  if (normalizedBlueOwner) {
    ownedByTeam[normalizedBlueOwner].push(getTeamCityCell("BLUE"));
  }

  const neutralCount = Math.min(
    neutralCityOwners.length ?? 0,
    neutralCityCells.length,
  );
  for (let index = 0; index < neutralCount; index += 1) {
    const owner = normalizeTeam(neutralCityOwners[index] ?? "");
    if (!owner) {
      continue;
    }
    const cityCell = neutralCityCells[index];
    ownedByTeam[owner].push({
      col: cityCell.col,
      row: cityCell.row,
    });
  }

  return ownedByTeam;
}

export function chooseNearestOwnedCityCell(
  ownedCityCells: readonly GridCoordinate[],
  unitCell: GridCoordinate,
): GridCoordinate | null {
  let nearestCell: GridCoordinate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const cityCell of ownedCityCells) {
    const manhattanDistance =
      Math.abs(cityCell.col - unitCell.col) + Math.abs(cityCell.row - unitCell.row);
    if (manhattanDistance < nearestDistance) {
      nearestDistance = manhattanDistance;
      nearestCell = cityCell;
      continue;
    }

    if (manhattanDistance > nearestDistance || !nearestCell) {
      continue;
    }

    if (cityCell.row < nearestCell.row) {
      nearestCell = cityCell;
      continue;
    }

    if (cityCell.row === nearestCell.row && cityCell.col < nearestCell.col) {
      nearestCell = cityCell;
    }
  }

  return nearestCell;
}

function isSameCell(
  leftCell: GridCoordinate,
  rightCell: GridCoordinate,
): boolean {
  return leftCell.col === rightCell.col && leftCell.row === rightCell.row;
}

function findCityCellIndex(
  cityCells: readonly GridCoordinate[],
  targetCell: { col: number; row: number },
): number {
  for (let index = 0; index < cityCells.length; index += 1) {
    if (
      cityCells[index].col === targetCell.col &&
      cityCells[index].row === targetCell.row
    ) {
      return index;
    }
  }

  return -1;
}

function listOwnedCityCellsBySupplyPriority(
  ownedCityCells: readonly GridCoordinate[],
  unitCell: GridCoordinate,
): GridCoordinate[] {
  const sortedCells = ownedCityCells.map((cityCell) => ({
    col: cityCell.col,
    row: cityCell.row,
  }));
  sortedCells.sort((leftCell, rightCell) => {
    const leftDistance =
      Math.abs(leftCell.col - unitCell.col) + Math.abs(leftCell.row - unitCell.row);
    const rightDistance =
      Math.abs(rightCell.col - unitCell.col) + Math.abs(rightCell.row - unitCell.row);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    if (leftCell.row !== rightCell.row) {
      return leftCell.row - rightCell.row;
    }
    return leftCell.col - rightCell.col;
  });
  return sortedCells;
}

function evaluateSupplyPath({
  sourceCell,
  unitCell,
  team,
  getInfluenceScoreAtCell,
  isCellImpassable,
  enemyInfluenceSeverThreshold,
}: {
  sourceCell: GridCoordinate;
  unitCell: GridCoordinate;
  team: PlayerTeam;
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  enemyInfluenceSeverThreshold: number;
}): { path: GridCoordinate[]; severIndex: number } {
  const path = traceGridLine(sourceCell, unitCell);
  const severIndex = findSupplySeverIndex({
    path,
    team,
    getInfluenceScoreAtCell,
    isCellImpassable,
    enemyInfluenceSeverThreshold,
  });
  return { path, severIndex };
}

export function findSupplySeverIndex({
  path,
  team,
  getInfluenceScoreAtCell,
  isCellImpassable,
  enemyInfluenceSeverThreshold,
}: {
  path: readonly GridCoordinate[];
  team: PlayerTeam;
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  enemyInfluenceSeverThreshold: number;
}): number {
  const teamSign = getTeamSign(team);
  const severThreshold = Math.max(0, enemyInfluenceSeverThreshold);
  for (let index = 1; index < path.length; index += 1) {
    const cell = path[index];
    const cellScore = getInfluenceScoreAtCell(cell.col, cell.row);
    if (cellScore * teamSign < -severThreshold || isCellImpassable(cell)) {
      return index;
    }
  }

  return -1;
}

export function computeSupplyLinesForUnits({
  units,
  worldToGridCoordinate,
  getTeamCityCell,
  redCityOwner,
  blueCityOwner,
  neutralCityOwners,
  neutralCityCells,
  getInfluenceScoreAtCell,
  isCellImpassable,
  enemyInfluenceSeverThreshold,
  previousRetryStateByUnitId,
  blockedSourceRetryIntervalMs,
  nowMs,
}: ComputeSupplyLinesParams): ComputeSupplyLinesResult {
  const supplyLinesByUnitId = new Map<string, ComputedSupplyLineState>();
  const retryStateByUnitId = new Map<string, SupplySourceRetryState>();
  const ownedCityCellsByTeam = collectOwnedCityCellsByTeam({
    getTeamCityCell,
    redCityOwner,
    blueCityOwner,
    neutralCityOwners,
    neutralCityCells,
  });
  const previousRetryState = previousRetryStateByUnitId ?? new Map();
  const retryIntervalMs = Math.max(0, blockedSourceRetryIntervalMs ?? 3000);
  const resolvedNowMs =
    typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();

  for (const unit of units) {
    if (!unit || unit.health <= 0 || unit.unitId.length === 0) {
      continue;
    }

    const team = normalizeTeam(unit.team);
    if (!team) {
      continue;
    }

    const unitCell = worldToGridCoordinate(unit.x, unit.y);
    const ownedCities = ownedCityCellsByTeam[team];
    const prioritizedCities = listOwnedCityCellsBySupplyPriority(ownedCities, unitCell);
    const nearestCityCell = prioritizedCities[0];
    if (!nearestCityCell) {
      supplyLinesByUnitId.set(
        unit.unitId,
        createDisconnectedSupplyState(unit.unitId, team),
      );
      continue;
    }

    const previousRetry = previousRetryState.get(unit.unitId);
    let sourceCell = nearestCityCell;
    let nextSwitchAtMs = resolvedNowMs + retryIntervalMs;
    if (previousRetry) {
      const previousSourceIndex = findCityCellIndex(prioritizedCities, {
        col: previousRetry.sourceCol,
        row: previousRetry.sourceRow,
      });
      if (previousSourceIndex !== -1) {
        sourceCell = prioritizedCities[previousSourceIndex];
      }
      if (Number.isFinite(previousRetry.nextSwitchAtMs)) {
        nextSwitchAtMs = previousRetry.nextSwitchAtMs;
      }
    }

    let supplyPath = evaluateSupplyPath({
      sourceCell,
      unitCell,
      team,
      getInfluenceScoreAtCell,
      isCellImpassable,
      enemyInfluenceSeverThreshold,
    });
    if (supplyPath.severIndex !== -1 && prioritizedCities.length > 1) {
      if (!previousRetry) {
        nextSwitchAtMs = resolvedNowMs + retryIntervalMs;
      }
      if (resolvedNowMs >= nextSwitchAtMs) {
        const currentSourceIndex = findCityCellIndex(prioritizedCities, sourceCell);
        const nextSourceIndex =
          currentSourceIndex === -1
            ? 0
            : (currentSourceIndex + 1) % prioritizedCities.length;
        sourceCell = prioritizedCities[nextSourceIndex];
        supplyPath = evaluateSupplyPath({
          sourceCell,
          unitCell,
          team,
          getInfluenceScoreAtCell,
          isCellImpassable,
          enemyInfluenceSeverThreshold,
        });
        nextSwitchAtMs = resolvedNowMs + retryIntervalMs;
      }
    }

    if (supplyPath.severIndex === -1 && !isSameCell(sourceCell, nearestCityCell)) {
      const nearestSupplyPath = evaluateSupplyPath({
        sourceCell: nearestCityCell,
        unitCell,
        team,
        getInfluenceScoreAtCell,
        isCellImpassable,
        enemyInfluenceSeverThreshold,
      });
      if (nearestSupplyPath.severIndex === -1) {
        sourceCell = nearestCityCell;
        supplyPath = nearestSupplyPath;
      }
    }

    if (
      (supplyPath.severIndex !== -1 && prioritizedCities.length > 1) ||
      (supplyPath.severIndex === -1 && !isSameCell(sourceCell, nearestCityCell))
    ) {
      if (supplyPath.severIndex === -1 && nextSwitchAtMs < resolvedNowMs) {
        nextSwitchAtMs = resolvedNowMs + retryIntervalMs;
      }
      retryStateByUnitId.set(unit.unitId, {
        sourceCol: sourceCell.col,
        sourceRow: sourceCell.row,
        nextSwitchAtMs,
      });
    }

    supplyLinesByUnitId.set(unit.unitId, {
      unitId: unit.unitId,
      team,
      connected: supplyPath.severIndex === -1,
      sourceCol: sourceCell.col,
      sourceRow: sourceCell.row,
      severIndex: supplyPath.severIndex,
      path: supplyPath.path,
    });
  }

  return { supplyLinesByUnitId, retryStateByUnitId };
}
