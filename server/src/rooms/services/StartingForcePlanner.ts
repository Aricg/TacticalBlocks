import {
  findOpenSpawnCellNearCity as findOpenSpawnCellNearCitySystem,
} from "../../systems/cities/CitySpawnSystem.js";
import type { MapBundle } from "../../../../shared/src/mapBundle.js";
import {
  DEFAULT_UNIT_TYPE,
  getUnitHealthMax,
  type UnitType,
} from "../../../../shared/src/unitTypes.js";
import type {
  GridCoordinate,
  PlayerTeam,
  Vector2,
} from "../BattleRoomTypes.js";

export type StartingForceLayoutStrategy = "battle-line";

export type PlannedStartingUnit = {
  unitId: string;
  team: PlayerTeam;
  position: Vector2;
  rotation: number;
  health: number;
  unitType: UnitType;
};

export type StartingForcePlan = {
  units: PlannedStartingUnit[];
};

export type ComputeInitialSpawnsArgs = {
  strategy: StartingForceLayoutStrategy;
  cityAnchors: MapBundle["cityAnchors"];
  blockedSpawnCellIndexSet: ReadonlySet<number>;
  baseUnitHealth: number;
  unitForwardOffset: number;
  mapWidth: number;
  mapHeight: number;
  gridWidth: number;
  gridHeight: number;
  citySpawnSearchRadius: number;
};

export class StartingForcePlanner {
  computeInitialSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
    if (args.strategy === "battle-line") {
      return this.computeBattleLineSpawns(args);
    }
    return { units: [] };
  }

  private computeBattleLineSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
    const cellWidth = args.mapWidth / args.gridWidth;
    const cellHeight = args.mapHeight / args.gridHeight;
    const redSpawn = this.gridToWorldCenter(args.cityAnchors.RED, cellWidth, cellHeight);
    const blueSpawn = this.gridToWorldCenter(
      args.cityAnchors.BLUE,
      cellWidth,
      cellHeight,
    );
    const axisX = blueSpawn.x - redSpawn.x;
    const axisY = blueSpawn.y - redSpawn.y;
    const axisLength = Math.hypot(axisX, axisY);
    const redForwardX = axisLength > 0.0001 ? axisX / axisLength : 1;
    const redForwardY = axisLength > 0.0001 ? axisY / axisLength : 0;
    const blueForwardX = -redForwardX;
    const blueForwardY = -redForwardY;
    const lateralX = -redForwardY;
    const lateralY = redForwardX;
    const redRotation = Math.atan2(redForwardY, redForwardX) - args.unitForwardOffset;
    const blueRotation =
      Math.atan2(blueForwardY, blueForwardX) - args.unitForwardOffset;
    const battleLineCenterX = (redSpawn.x + blueSpawn.x) * 0.5;
    const battleLineCenterY = (redSpawn.y + blueSpawn.y) * 0.5;
    const blockSize = Math.min(cellWidth, cellHeight);
    const oneBlockBackOffset = blockSize * 2;
    const spacingAcross = Math.max(1, blockSize);
    const redLineX = battleLineCenterX - redForwardX * oneBlockBackOffset;
    const redLineY = battleLineCenterY - redForwardY * oneBlockBackOffset;
    const blueLineX = battleLineCenterX - blueForwardX * oneBlockBackOffset;
    const blueLineY = battleLineCenterY - blueForwardY * oneBlockBackOffset;
    const mapMinX = cellWidth * 0.5;
    const mapMaxX = args.mapWidth - cellWidth * 0.5;
    const mapMinY = cellHeight * 0.5;
    const mapMaxY = args.mapHeight - cellHeight * 0.5;
    const xInterval = this.resolveLineInterval(
      battleLineCenterX,
      lateralX,
      mapMinX,
      mapMaxX,
    );
    const yInterval = this.resolveLineInterval(
      battleLineCenterY,
      lateralY,
      mapMinY,
      mapMaxY,
    );
    if (!xInterval || !yInterval) {
      return { units: [] };
    }

    const minAcrossOffset = Math.max(xInterval.min, yInterval.min);
    const maxAcrossOffset = Math.min(xInterval.max, yInterval.max);
    if (
      !Number.isFinite(minAcrossOffset) ||
      !Number.isFinite(maxAcrossOffset) ||
      minAcrossOffset > maxAcrossOffset
    ) {
      return { units: [] };
    }

    const lineLengthAcross = maxAcrossOffset - minAcrossOffset;
    const unitsPerSide = Math.max(1, Math.floor(lineLengthAcross / spacingAcross) + 1);
    const usedAcrossLength = (unitsPerSide - 1) * spacingAcross;
    const centeredAcrossStart =
      (minAcrossOffset + maxAcrossOffset - usedAcrossLength) * 0.5;

    const redSpawnCandidates: Vector2[] = [];
    const blueSpawnCandidates: Vector2[] = [];

    for (let i = 0; i < unitsPerSide; i += 1) {
      const acrossOffset = centeredAcrossStart + i * spacingAcross;
      const redCell = this.worldToGridCoordinate(
        redLineX + lateralX * acrossOffset,
        redLineY + lateralY * acrossOffset,
        args.gridWidth,
        args.gridHeight,
        cellWidth,
        cellHeight,
      );
      if (!this.isBlockedSpawnCell(redCell, args.gridWidth, args.blockedSpawnCellIndexSet)) {
        redSpawnCandidates.push(this.gridToWorldCenter(redCell, cellWidth, cellHeight));
      }

      const blueCell = this.worldToGridCoordinate(
        blueLineX + lateralX * acrossOffset,
        blueLineY + lateralY * acrossOffset,
        args.gridWidth,
        args.gridHeight,
        cellWidth,
        cellHeight,
      );
      if (
        !this.isBlockedSpawnCell(blueCell, args.gridWidth, args.blockedSpawnCellIndexSet)
      ) {
        blueSpawnCandidates.push(
          this.gridToWorldCenter(blueCell, cellWidth, cellHeight),
        );
      }
    }

    const mirroredUnitsPerSide = Math.min(
      redSpawnCandidates.length,
      blueSpawnCandidates.length,
    );
    const commanderHealth = getUnitHealthMax(args.baseUnitHealth, "COMMANDER");
    const redCommanderSpawnCell =
      this.findOpenSpawnCellNearCity({
        cityCell: args.cityAnchors.RED,
        searchRadius: args.citySpawnSearchRadius,
        gridWidth: args.gridWidth,
        gridHeight: args.gridHeight,
        blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      }) ?? args.cityAnchors.RED;
    const blueCommanderSpawnCell =
      this.findOpenSpawnCellNearCity({
        cityCell: args.cityAnchors.BLUE,
        searchRadius: args.citySpawnSearchRadius,
        gridWidth: args.gridWidth,
        gridHeight: args.gridHeight,
        blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      }) ?? args.cityAnchors.BLUE;
    const redCommanderSpawn = this.gridToWorldCenter(
      redCommanderSpawnCell,
      cellWidth,
      cellHeight,
    );
    const blueCommanderSpawn = this.gridToWorldCenter(
      blueCommanderSpawnCell,
      cellWidth,
      cellHeight,
    );

    const units: PlannedStartingUnit[] = [
      {
        unitId: "red-commander",
        team: "RED",
        position: redCommanderSpawn,
        rotation: redRotation,
        health: commanderHealth,
        unitType: "COMMANDER",
      },
      {
        unitId: "blue-commander",
        team: "BLUE",
        position: blueCommanderSpawn,
        rotation: blueRotation,
        health: commanderHealth,
        unitType: "COMMANDER",
      },
    ];

    for (let i = 0; i < mirroredUnitsPerSide; i += 1) {
      const redPosition = redSpawnCandidates[i];
      const bluePosition = blueSpawnCandidates[i];
      units.push({
        unitId: `red-${i + 1}`,
        team: "RED",
        position: redPosition,
        rotation: redRotation,
        health: args.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
      units.push({
        unitId: `blue-${i + 1}`,
        team: "BLUE",
        position: bluePosition,
        rotation: blueRotation,
        health: args.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
    }

    return { units };
  }

  private findOpenSpawnCellNearCity(args: {
    cityCell: GridCoordinate;
    searchRadius: number;
    gridWidth: number;
    gridHeight: number;
    blockedSpawnCellIndexSet: ReadonlySet<number>;
  }): GridCoordinate | null {
    return findOpenSpawnCellNearCitySystem({
      cityCell: args.cityCell,
      searchRadius: args.searchRadius,
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      isCitySpawnCellOpen: (targetCell) =>
        !this.isBlockedSpawnCell(
          targetCell,
          args.gridWidth,
          args.blockedSpawnCellIndexSet,
        ),
    });
  }

  private resolveLineInterval(
    origin: number,
    direction: number,
    min: number,
    max: number,
  ): { min: number; max: number } | null {
    if (Math.abs(direction) <= 0.0001) {
      if (origin < min || origin > max) {
        return null;
      }

      return {
        min: Number.NEGATIVE_INFINITY,
        max: Number.POSITIVE_INFINITY,
      };
    }

    const intervalA = (min - origin) / direction;
    const intervalB = (max - origin) / direction;
    return {
      min: Math.min(intervalA, intervalB),
      max: Math.max(intervalA, intervalB),
    };
  }

  private worldToGridCoordinate(
    x: number,
    y: number,
    gridWidth: number,
    gridHeight: number,
    cellWidth: number,
    cellHeight: number,
  ): GridCoordinate {
    const colBasis = x / cellWidth - 0.5;
    const rowBasis = y / cellHeight - 0.5;
    return {
      col: this.clamp(Math.round(colBasis), 0, gridWidth - 1),
      row: this.clamp(Math.round(rowBasis), 0, gridHeight - 1),
    };
  }

  private gridToWorldCenter(
    cell: GridCoordinate,
    cellWidth: number,
    cellHeight: number,
  ): Vector2 {
    return {
      x: (cell.col + 0.5) * cellWidth,
      y: (cell.row + 0.5) * cellHeight,
    };
  }

  private isBlockedSpawnCell(
    cell: GridCoordinate,
    gridWidth: number,
    blockedSpawnCellIndexSet: ReadonlySet<number>,
  ): boolean {
    return blockedSpawnCellIndexSet.has(this.getGridCellIndex(cell.col, cell.row, gridWidth));
  }

  private getGridCellIndex(col: number, row: number, gridWidth: number): number {
    return row * gridWidth + col;
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }
}
