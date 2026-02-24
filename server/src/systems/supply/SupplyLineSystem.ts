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
  isCitySupplySourceEligible?: (
    team: PlayerTeam,
    cityCell: GridCoordinate,
  ) => boolean;
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

export type FarmToCitySupplyCity = {
  cityZoneId: string;
  owner: string;
  cityCell: GridCoordinate;
};

export type FarmToCitySupplyFarm = {
  farmZoneId: string;
  sourceCell: GridCoordinate;
};

export type FarmToCitySupplyLink = {
  farmZoneId: string;
  cityZoneId: string;
};

export type ComputeFarmToCitySupplyStatusParams = {
  cityZones: readonly FarmToCitySupplyCity[];
  farmZones: readonly FarmToCitySupplyFarm[];
  farmToCityLinks: readonly FarmToCitySupplyLink[];
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  enemyInfluenceSeverThreshold: number;
  isEnemyOccupiedCellForTeam?: (
    team: PlayerTeam,
    cell: GridCoordinate,
  ) => boolean;
};

export type ComputeFarmToCitySupplyStatusResult = {
  suppliedCityZoneIds: Set<string>;
  suppliedCityCellKeys: Set<string>;
  linkStates: ComputedFarmToCitySupplyLinkState[];
};

export type ComputedFarmToCitySupplyLinkState = {
  linkId: string;
  farmZoneId: string;
  cityZoneId: string;
  team: PlayerTeam;
  connected: boolean;
  severIndex: number;
  path: GridCoordinate[];
};

function normalizeTeam(team: string): PlayerTeam | null {
  const normalized = team.toUpperCase();
  if (normalized === "RED" || normalized === "BLUE") {
    return normalized;
  }
  return null;
}

function getCellKey(cell: GridCoordinate): string {
  return `${cell.col},${cell.row}`;
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

function getManhattanDistance(
  leftCell: GridCoordinate,
  rightCell: GridCoordinate,
): number {
  return Math.abs(leftCell.col - rightCell.col) + Math.abs(leftCell.row - rightCell.row);
}

function compareCellsByRowThenCol(
  leftCell: GridCoordinate,
  rightCell: GridCoordinate,
): number {
  if (leftCell.row !== rightCell.row) {
    return leftCell.row - rightCell.row;
  }
  return leftCell.col - rightCell.col;
}

function buildCombinedRelayPath(
  candidateSupplyLine: ComputedSupplyLineState,
  relayLeg: { path: GridCoordinate[]; severIndex: number },
): { path: GridCoordinate[]; severIndex: number } {
  if (candidateSupplyLine.path.length === 0) {
    return {
      path: relayLeg.path,
      severIndex: relayLeg.severIndex,
    };
  }

  const combinedPath = [...candidateSupplyLine.path, ...relayLeg.path.slice(1)];
  if (relayLeg.severIndex === -1) {
    return {
      path: combinedPath,
      severIndex: -1,
    };
  }

  return {
    path: combinedPath,
    severIndex: candidateSupplyLine.path.length - 1 + relayLeg.severIndex,
  };
}

function shouldReplaceDisconnectedSupplyLine(
  currentLine: ComputedSupplyLineState,
  candidateLine: ComputedSupplyLineState,
): boolean {
  if (currentLine.connected) {
    return false;
  }
  if (candidateLine.connected) {
    return true;
  }
  if (candidateLine.path.length === 0) {
    return false;
  }
  if (currentLine.path.length === 0) {
    return true;
  }

  const currentRemainingCells =
    currentLine.severIndex === -1 ? 0 : currentLine.path.length - currentLine.severIndex;
  const candidateRemainingCells =
    candidateLine.severIndex === -1
      ? 0
      : candidateLine.path.length - candidateLine.severIndex;
  if (candidateRemainingCells !== currentRemainingCells) {
    return candidateRemainingCells < currentRemainingCells;
  }

  if (candidateLine.path.length !== currentLine.path.length) {
    return candidateLine.path.length < currentLine.path.length;
  }

  if (candidateLine.sourceRow !== currentLine.sourceRow) {
    return candidateLine.sourceRow < currentLine.sourceRow;
  }
  return candidateLine.sourceCol < currentLine.sourceCol;
}

function buildRelayConnectedSupplyLine({
  teamUnits,
  targetUnitId,
  team,
  unitCellByUnitId,
  supplyLinesByUnitId,
  getInfluenceScoreAtCell,
  isCellImpassable,
  enemyInfluenceSeverThreshold,
}: {
  teamUnits: readonly string[];
  targetUnitId: string;
  team: PlayerTeam;
  unitCellByUnitId: ReadonlyMap<string, GridCoordinate>;
  supplyLinesByUnitId: ReadonlyMap<string, ComputedSupplyLineState>;
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  isCellImpassable: (cell: GridCoordinate) => boolean;
  enemyInfluenceSeverThreshold: number;
}): ComputedSupplyLineState | null {
  const targetUnitCell = unitCellByUnitId.get(targetUnitId);
  if (!targetUnitCell) {
    return null;
  }

  const candidateUnitIds: string[] = [];
  for (const unitId of teamUnits) {
    if (unitId === targetUnitId) {
      continue;
    }
    const candidateLine = supplyLinesByUnitId.get(unitId);
    if (!candidateLine || !candidateLine.connected) {
      continue;
    }
    candidateUnitIds.push(unitId);
  }

  candidateUnitIds.sort((leftUnitId, rightUnitId) => {
    const leftCell = unitCellByUnitId.get(leftUnitId);
    const rightCell = unitCellByUnitId.get(rightUnitId);
    if (!leftCell || !rightCell) {
      return leftUnitId.localeCompare(rightUnitId);
    }

    const leftDistance = getManhattanDistance(leftCell, targetUnitCell);
    const rightDistance = getManhattanDistance(rightCell, targetUnitCell);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const cellComparison = compareCellsByRowThenCol(leftCell, rightCell);
    if (cellComparison !== 0) {
      return cellComparison;
    }
    return leftUnitId.localeCompare(rightUnitId);
  });

  let bestBlockedRelayLine: ComputedSupplyLineState | null = null;
  for (const candidateUnitId of candidateUnitIds) {
    const candidateUnitCell = unitCellByUnitId.get(candidateUnitId);
    const candidateSupplyLine = supplyLinesByUnitId.get(candidateUnitId);
    if (!candidateUnitCell || !candidateSupplyLine) {
      continue;
    }

    const relayLeg = evaluateSupplyPath({
      sourceCell: candidateUnitCell,
      unitCell: targetUnitCell,
      team,
      getInfluenceScoreAtCell,
      isCellImpassable,
      enemyInfluenceSeverThreshold,
    });
    const combinedRelay = buildCombinedRelayPath(candidateSupplyLine, relayLeg);
    if (combinedRelay.severIndex === -1) {
      return {
        unitId: targetUnitId,
        team,
        connected: true,
        sourceCol: candidateSupplyLine.sourceCol,
        sourceRow: candidateSupplyLine.sourceRow,
        severIndex: -1,
        path: combinedRelay.path,
      };
    }

    const blockedRelayLine: ComputedSupplyLineState = {
      unitId: targetUnitId,
      team,
      connected: false,
      sourceCol: candidateSupplyLine.sourceCol,
      sourceRow: candidateSupplyLine.sourceRow,
      severIndex: combinedRelay.severIndex,
      path: combinedRelay.path,
    };
    if (
      !bestBlockedRelayLine ||
      shouldReplaceDisconnectedSupplyLine(bestBlockedRelayLine, blockedRelayLine)
    ) {
      bestBlockedRelayLine = blockedRelayLine;
    }
  }

  return bestBlockedRelayLine;
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

export function computeFarmToCitySupplyStatus({
  cityZones,
  farmZones,
  farmToCityLinks,
  getInfluenceScoreAtCell,
  isCellImpassable,
  enemyInfluenceSeverThreshold,
  isEnemyOccupiedCellForTeam,
}: ComputeFarmToCitySupplyStatusParams): ComputeFarmToCitySupplyStatusResult {
  const suppliedCityZoneIds = new Set<string>();
  const suppliedCityCellKeys = new Set<string>();
  const linkStates: ComputedFarmToCitySupplyLinkState[] = [];
  if (cityZones.length === 0) {
    return {
      suppliedCityZoneIds,
      suppliedCityCellKeys,
      linkStates,
    };
  }

  // Legacy sidecars had no farm metadata; preserve prior behavior in that mode.
  if (farmZones.length === 0 || farmToCityLinks.length === 0) {
    for (const cityZone of cityZones) {
      suppliedCityZoneIds.add(cityZone.cityZoneId);
      suppliedCityCellKeys.add(getCellKey(cityZone.cityCell));
    }
    return {
      suppliedCityZoneIds,
      suppliedCityCellKeys,
      linkStates,
    };
  }

  const farmById = new Map(farmZones.map((farmZone) => [farmZone.farmZoneId, farmZone]));
  const linksByCityZoneId = new Map<string, FarmToCitySupplyLink[]>();
  for (const link of farmToCityLinks) {
    const existingLinks = linksByCityZoneId.get(link.cityZoneId);
    if (existingLinks) {
      existingLinks.push(link);
      continue;
    }
    linksByCityZoneId.set(link.cityZoneId, [link]);
  }

  for (const cityZone of cityZones) {
    const team = normalizeTeam(cityZone.owner);
    if (!team) {
      continue;
    }

    const inboundLinks = linksByCityZoneId.get(cityZone.cityZoneId) ?? [];
    for (let inboundIndex = 0; inboundIndex < inboundLinks.length; inboundIndex += 1) {
      const inboundLink = inboundLinks[inboundIndex];
      const farmZone = farmById.get(inboundLink.farmZoneId);
      if (!farmZone) {
        continue;
      }

      const supplyPath = evaluateSupplyPath({
        sourceCell: farmZone.sourceCell,
        unitCell: cityZone.cityCell,
        team,
        getInfluenceScoreAtCell,
        isCellImpassable,
        enemyInfluenceSeverThreshold,
      });

      let severIndex = supplyPath.severIndex;
      if (severIndex === -1 && isEnemyOccupiedCellForTeam) {
        for (let pathIndex = 1; pathIndex < supplyPath.path.length; pathIndex += 1) {
          const pathCell = supplyPath.path[pathIndex];
          if (!isEnemyOccupiedCellForTeam(team, pathCell)) {
            continue;
          }
          severIndex = pathIndex;
          break;
        }
      }

      const connected = severIndex === -1;
      linkStates.push({
        linkId: `${inboundLink.farmZoneId}->${cityZone.cityZoneId}#${inboundIndex}`,
        farmZoneId: inboundLink.farmZoneId,
        cityZoneId: cityZone.cityZoneId,
        team,
        connected,
        severIndex,
        path: supplyPath.path,
      });
      if (connected) {
        suppliedCityZoneIds.add(cityZone.cityZoneId);
        suppliedCityCellKeys.add(getCellKey(cityZone.cityCell));
      }
    }
  }

  return {
    suppliedCityZoneIds,
    suppliedCityCellKeys,
    linkStates,
  };
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
  isCitySupplySourceEligible,
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
  const unitIdsByTeam: Record<PlayerTeam, string[]> = {
    BLUE: [],
    RED: [],
  };
  const unitCellByUnitId = new Map<string, GridCoordinate>();
  const teamByUnitId = new Map<string, PlayerTeam>();

  for (const unit of units) {
    if (!unit || unit.health <= 0 || unit.unitId.length === 0) {
      continue;
    }

    const team = normalizeTeam(unit.team);
    if (!team) {
      continue;
    }

    const unitCell = worldToGridCoordinate(unit.x, unit.y);
    unitIdsByTeam[team].push(unit.unitId);
    unitCellByUnitId.set(unit.unitId, unitCell);
    teamByUnitId.set(unit.unitId, team);
  }

  for (const team of ["BLUE", "RED"] as const) {
    const teamUnitIds = unitIdsByTeam[team];
    teamUnitIds.sort((leftUnitId, rightUnitId) => leftUnitId.localeCompare(rightUnitId));
    const ownedCities = ownedCityCellsByTeam[team].filter((cityCell) =>
      isCitySupplySourceEligible ? isCitySupplySourceEligible(team, cityCell) : true,
    );

    for (const unitId of teamUnitIds) {
      const resolvedTeam = teamByUnitId.get(unitId);
      const unitCell = unitCellByUnitId.get(unitId);
      if (!resolvedTeam || !unitCell) {
        continue;
      }

      const prioritizedCities = listOwnedCityCellsBySupplyPriority(ownedCities, unitCell);
      const nearestCityCell = prioritizedCities[0];
      if (!nearestCityCell) {
        supplyLinesByUnitId.set(unitId, createDisconnectedSupplyState(unitId, resolvedTeam));
        continue;
      }

      const previousRetry = previousRetryState.get(unitId);
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
        team: resolvedTeam,
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
            team: resolvedTeam,
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
          team: resolvedTeam,
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
        retryStateByUnitId.set(unitId, {
          sourceCol: sourceCell.col,
          sourceRow: sourceCell.row,
          nextSwitchAtMs,
        });
      }

      supplyLinesByUnitId.set(unitId, {
        unitId,
        team: resolvedTeam,
        connected: supplyPath.severIndex === -1,
        sourceCol: sourceCell.col,
        sourceRow: sourceCell.row,
        severIndex: supplyPath.severIndex,
        path: supplyPath.path,
      });
    }

    let relayProgressMade = true;
    while (relayProgressMade) {
      relayProgressMade = false;
      for (const unitId of teamUnitIds) {
        const currentSupplyLine = supplyLinesByUnitId.get(unitId);
        if (!currentSupplyLine || currentSupplyLine.connected) {
          continue;
        }

        const relaySupplyLine = buildRelayConnectedSupplyLine({
          teamUnits: teamUnitIds,
          targetUnitId: unitId,
          team,
          unitCellByUnitId,
          supplyLinesByUnitId,
          getInfluenceScoreAtCell,
          isCellImpassable,
          enemyInfluenceSeverThreshold,
        });
        if (!relaySupplyLine) {
          continue;
        }

        if (relaySupplyLine.connected) {
          supplyLinesByUnitId.set(unitId, relaySupplyLine);
          relayProgressMade = true;
          continue;
        }
        if (shouldReplaceDisconnectedSupplyLine(currentSupplyLine, relaySupplyLine)) {
          supplyLinesByUnitId.set(unitId, relaySupplyLine);
        }
      }
    }
  }

  return { supplyLinesByUnitId, retryStateByUnitId };
}
