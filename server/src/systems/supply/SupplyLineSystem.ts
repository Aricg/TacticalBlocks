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
}: ComputeSupplyLinesParams): Map<string, ComputedSupplyLineState> {
  const supplyLinesByUnitId = new Map<string, ComputedSupplyLineState>();
  const ownedCityCellsByTeam = collectOwnedCityCellsByTeam({
    getTeamCityCell,
    redCityOwner,
    blueCityOwner,
    neutralCityOwners,
    neutralCityCells,
  });

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
    const sourceCell = chooseNearestOwnedCityCell(ownedCities, unitCell);
    if (!sourceCell) {
      supplyLinesByUnitId.set(
        unit.unitId,
        createDisconnectedSupplyState(unit.unitId, team),
      );
      continue;
    }

    const path = traceGridLine(sourceCell, unitCell);
    const severIndex = findSupplySeverIndex({
      path,
      team,
      getInfluenceScoreAtCell,
      isCellImpassable,
      enemyInfluenceSeverThreshold,
    });

    supplyLinesByUnitId.set(unit.unitId, {
      unitId: unit.unitId,
      team,
      connected: severIndex === -1,
      sourceCol: sourceCell.col,
      sourceRow: sourceCell.row,
      severIndex,
      path,
    });
  }

  return supplyLinesByUnitId;
}
