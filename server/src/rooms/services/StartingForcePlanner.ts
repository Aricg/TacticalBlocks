import {
  findOpenSpawnCellNearCity as findOpenSpawnCellNearCitySystem,
} from "../../systems/cities/CitySpawnSystem.js";
import type { MapBundle } from "../../../../shared/src/mapBundle.js";
import type { StartingForceLayoutStrategy } from "../../../../shared/src/generationProfile.js";
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
  lineUnitCountPerTeam?: number | null;
  friendlyCitySpawnCellsByTeam?: Record<PlayerTeam, readonly GridCoordinate[]>;
  friendlyFarmSpawnCellsByTeam?: Record<PlayerTeam, readonly GridCoordinate[]>;
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
    if (args.strategy === "friendly-zones") {
      return this.computeFriendlyZoneSpawns(args);
    }
    if (args.strategy === "battle-line") {
      return this.computeBattleLineSpawns(args);
    }
    if (args.strategy === "city-front") {
      return this.computeCityFrontSpawns(args);
    }
    if (args.strategy === "mirrored-grid") {
      return this.computeMirroredGridSpawns(args);
    }
    if (args.strategy === "block") {
      return this.computeBlockSpawns(args);
    }
    return this.computeBattleLineSpawns(args);
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

    return this.buildPlannedUnitsFromCandidates({
      computeArgs: args,
      redRotation,
      blueRotation,
      redSpawnCandidates,
      blueSpawnCandidates,
      cellWidth,
      cellHeight,
    });
  }

  private computeCityFrontSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
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
    const blockSize = Math.min(cellWidth, cellHeight);
    const spacingAcross = Math.max(1, blockSize);
    const frontOffset = blockSize * 3;
    const redLineX = redSpawn.x + redForwardX * frontOffset;
    const redLineY = redSpawn.y + redForwardY * frontOffset;
    const blueLineX = blueSpawn.x + blueForwardX * frontOffset;
    const blueLineY = blueSpawn.y + blueForwardY * frontOffset;
    const mapMinX = cellWidth * 0.5;
    const mapMaxX = args.mapWidth - cellWidth * 0.5;
    const mapMinY = cellHeight * 0.5;
    const mapMaxY = args.mapHeight - cellHeight * 0.5;
    const redXInterval = this.resolveLineInterval(redLineX, lateralX, mapMinX, mapMaxX);
    const redYInterval = this.resolveLineInterval(redLineY, lateralY, mapMinY, mapMaxY);
    const blueXInterval = this.resolveLineInterval(
      blueLineX,
      lateralX,
      mapMinX,
      mapMaxX,
    );
    const blueYInterval = this.resolveLineInterval(
      blueLineY,
      lateralY,
      mapMinY,
      mapMaxY,
    );
    if (!redXInterval || !redYInterval || !blueXInterval || !blueYInterval) {
      return { units: [] };
    }

    const redMinAcrossOffset = Math.max(redXInterval.min, redYInterval.min);
    const redMaxAcrossOffset = Math.min(redXInterval.max, redYInterval.max);
    const blueMinAcrossOffset = Math.max(blueXInterval.min, blueYInterval.min);
    const blueMaxAcrossOffset = Math.min(blueXInterval.max, blueYInterval.max);
    const minAcrossOffset = Math.max(redMinAcrossOffset, blueMinAcrossOffset);
    const maxAcrossOffset = Math.min(redMaxAcrossOffset, blueMaxAcrossOffset);
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

    return this.buildPlannedUnitsFromCandidates({
      computeArgs: args,
      redRotation,
      blueRotation,
      redSpawnCandidates,
      blueSpawnCandidates,
      cellWidth,
      cellHeight,
    });
  }

  private computeMirroredGridSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
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
    const rowSpacing = blockSize * 1.5;
    const rowCount = 2;
    const redBaseLineX = battleLineCenterX - redForwardX * oneBlockBackOffset;
    const redBaseLineY = battleLineCenterY - redForwardY * oneBlockBackOffset;
    const blueBaseLineX = battleLineCenterX - blueForwardX * oneBlockBackOffset;
    const blueBaseLineY = battleLineCenterY - blueForwardY * oneBlockBackOffset;
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
    const unitsPerRow = Math.max(1, Math.floor(lineLengthAcross / spacingAcross) + 1);
    const usedAcrossLength = (unitsPerRow - 1) * spacingAcross;
    const centeredAcrossStart =
      (minAcrossOffset + maxAcrossOffset - usedAcrossLength) * 0.5;

    const redSpawnCandidates: Vector2[] = [];
    const blueSpawnCandidates: Vector2[] = [];
    const redSpawnCellKeys = new Set<string>();
    const blueSpawnCellKeys = new Set<string>();

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const rowOffset = rowIndex * rowSpacing;
      const redRowX = redBaseLineX - redForwardX * rowOffset;
      const redRowY = redBaseLineY - redForwardY * rowOffset;
      const blueRowX = blueBaseLineX - blueForwardX * rowOffset;
      const blueRowY = blueBaseLineY - blueForwardY * rowOffset;

      for (let i = 0; i < unitsPerRow; i += 1) {
        const acrossOffset = centeredAcrossStart + i * spacingAcross;
        const redCell = this.worldToGridCoordinate(
          redRowX + lateralX * acrossOffset,
          redRowY + lateralY * acrossOffset,
          args.gridWidth,
          args.gridHeight,
          cellWidth,
          cellHeight,
        );
        this.addSpawnCandidateIfOpen({
          candidateCell: redCell,
          candidates: redSpawnCandidates,
          seenCellKeys: redSpawnCellKeys,
          gridWidth: args.gridWidth,
          blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
          cellWidth,
          cellHeight,
        });

        const blueCell = this.worldToGridCoordinate(
          blueRowX + lateralX * acrossOffset,
          blueRowY + lateralY * acrossOffset,
          args.gridWidth,
          args.gridHeight,
          cellWidth,
          cellHeight,
        );
        this.addSpawnCandidateIfOpen({
          candidateCell: blueCell,
          candidates: blueSpawnCandidates,
          seenCellKeys: blueSpawnCellKeys,
          gridWidth: args.gridWidth,
          blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
          cellWidth,
          cellHeight,
        });
      }
    }

    return this.buildPlannedUnitsFromCandidates({
      computeArgs: args,
      redRotation,
      blueRotation,
      redSpawnCandidates,
      blueSpawnCandidates,
      cellWidth,
      cellHeight,
    });
  }

  private computeBlockSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
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
    const requestedUnitsPerSide =
      typeof args.lineUnitCountPerTeam === "number" &&
      Number.isInteger(args.lineUnitCountPerTeam) &&
      args.lineUnitCountPerTeam > 0
        ? args.lineUnitCountPerTeam
        : args.gridWidth * args.gridHeight;
    const targetUnitsPerSide = this.clamp(
      requestedUnitsPerSide,
      1,
      args.gridWidth * args.gridHeight,
    );
    const redSpawnCandidates = this.collectCityBlockCandidates({
      cityAnchor: args.cityAnchors.RED,
      targetUnitsPerSide,
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      cellWidth,
      cellHeight,
    });
    const blueSpawnCandidates = this.collectCityBlockCandidates({
      cityAnchor: args.cityAnchors.BLUE,
      targetUnitsPerSide,
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      cellWidth,
      cellHeight,
    });

    return this.buildPlannedUnitsFromCandidates({
      computeArgs: args,
      redRotation,
      blueRotation,
      redSpawnCandidates,
      blueSpawnCandidates,
      cellWidth,
      cellHeight,
    });
  }

  private computeFriendlyZoneSpawns(args: ComputeInitialSpawnsArgs): StartingForcePlan {
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
    const redRotation = Math.atan2(redForwardY, redForwardX) - args.unitForwardOffset;
    const blueRotation =
      Math.atan2(blueForwardY, blueForwardX) - args.unitForwardOffset;
    const redSpawnCandidates = this.collectFriendlyZoneSpawnCandidates({
      cityCells: args.friendlyCitySpawnCellsByTeam?.RED ?? [],
      farmCells: args.friendlyFarmSpawnCellsByTeam?.RED ?? [],
      gridWidth: args.gridWidth,
      blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      cellWidth,
      cellHeight,
    });
    const blueSpawnCandidates = this.collectFriendlyZoneSpawnCandidates({
      cityCells: args.friendlyCitySpawnCellsByTeam?.BLUE ?? [],
      farmCells: args.friendlyFarmSpawnCellsByTeam?.BLUE ?? [],
      gridWidth: args.gridWidth,
      blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
      cellWidth,
      cellHeight,
    });
    if (redSpawnCandidates.length === 0 || blueSpawnCandidates.length === 0) {
      return this.computeBlockSpawns(args);
    }

    return this.buildPlannedUnitsFromCandidates({
      computeArgs: args,
      redRotation,
      blueRotation,
      redSpawnCandidates,
      blueSpawnCandidates,
      cellWidth,
      cellHeight,
    });
  }

  private collectFriendlyZoneSpawnCandidates(args: {
    cityCells: readonly GridCoordinate[];
    farmCells: readonly GridCoordinate[];
    gridWidth: number;
    blockedSpawnCellIndexSet: ReadonlySet<number>;
    cellWidth: number;
    cellHeight: number;
  }): Vector2[] {
    const candidates: Vector2[] = [];
    const seenCellKeys = new Set<string>();
    for (const cell of args.cityCells) {
      this.addSpawnCandidateIfOpen({
        candidateCell: cell,
        candidates,
        seenCellKeys,
        gridWidth: args.gridWidth,
        blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
        cellWidth: args.cellWidth,
        cellHeight: args.cellHeight,
      });
    }
    for (const cell of args.farmCells) {
      this.addSpawnCandidateIfOpen({
        candidateCell: cell,
        candidates,
        seenCellKeys,
        gridWidth: args.gridWidth,
        blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
        cellWidth: args.cellWidth,
        cellHeight: args.cellHeight,
      });
    }
    return candidates;
  }

  private collectCityBlockCandidates(args: {
    cityAnchor: GridCoordinate;
    targetUnitsPerSide: number;
    gridWidth: number;
    gridHeight: number;
    blockedSpawnCellIndexSet: ReadonlySet<number>;
    cellWidth: number;
    cellHeight: number;
  }): Vector2[] {
    const candidates: Vector2[] = [];
    const seenCellKeys = new Set<string>();
    const maxRadius = Math.max(args.gridWidth, args.gridHeight);

    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (
        let row = args.cityAnchor.row - radius;
        row <= args.cityAnchor.row + radius;
        row += 1
      ) {
        if (row < 0 || row >= args.gridHeight) {
          continue;
        }
        for (
          let col = args.cityAnchor.col - radius;
          col <= args.cityAnchor.col + radius;
          col += 1
        ) {
          if (col < 0 || col >= args.gridWidth) {
            continue;
          }
          if (
            Math.max(
              Math.abs(col - args.cityAnchor.col),
              Math.abs(row - args.cityAnchor.row),
            ) !== radius
          ) {
            continue;
          }

          this.addSpawnCandidateIfOpen({
            candidateCell: { col, row },
            candidates,
            seenCellKeys,
            gridWidth: args.gridWidth,
            blockedSpawnCellIndexSet: args.blockedSpawnCellIndexSet,
            cellWidth: args.cellWidth,
            cellHeight: args.cellHeight,
          });
          if (candidates.length >= args.targetUnitsPerSide) {
            return candidates;
          }
        }
      }
    }

    return candidates;
  }

  private buildPlannedUnitsFromCandidates(input: {
    computeArgs: ComputeInitialSpawnsArgs;
    redRotation: number;
    blueRotation: number;
    redSpawnCandidates: Vector2[];
    blueSpawnCandidates: Vector2[];
    cellWidth: number;
    cellHeight: number;
  }): StartingForcePlan {
    const cappedLineUnitCount =
      typeof input.computeArgs.lineUnitCountPerTeam === "number" &&
      Number.isInteger(input.computeArgs.lineUnitCountPerTeam) &&
      input.computeArgs.lineUnitCountPerTeam > 0
        ? input.computeArgs.lineUnitCountPerTeam
        : Number.POSITIVE_INFINITY;
    const mirroredUnitsPerSide = Math.min(
      input.redSpawnCandidates.length,
      input.blueSpawnCandidates.length,
      cappedLineUnitCount,
    );
    const commanderHealth = getUnitHealthMax(
      input.computeArgs.baseUnitHealth,
      "COMMANDER",
    );
    const redCommanderSpawnCell =
      this.findOpenSpawnCellNearCity({
        cityCell: input.computeArgs.cityAnchors.RED,
        searchRadius: input.computeArgs.citySpawnSearchRadius,
        gridWidth: input.computeArgs.gridWidth,
        gridHeight: input.computeArgs.gridHeight,
        blockedSpawnCellIndexSet: input.computeArgs.blockedSpawnCellIndexSet,
      }) ?? input.computeArgs.cityAnchors.RED;
    const blueCommanderSpawnCell =
      this.findOpenSpawnCellNearCity({
        cityCell: input.computeArgs.cityAnchors.BLUE,
        searchRadius: input.computeArgs.citySpawnSearchRadius,
        gridWidth: input.computeArgs.gridWidth,
        gridHeight: input.computeArgs.gridHeight,
        blockedSpawnCellIndexSet: input.computeArgs.blockedSpawnCellIndexSet,
      }) ?? input.computeArgs.cityAnchors.BLUE;
    const redCommanderSpawn = this.gridToWorldCenter(
      redCommanderSpawnCell,
      input.cellWidth,
      input.cellHeight,
    );
    const blueCommanderSpawn = this.gridToWorldCenter(
      blueCommanderSpawnCell,
      input.cellWidth,
      input.cellHeight,
    );

    const units: PlannedStartingUnit[] = [
      {
        unitId: "red-commander",
        team: "RED",
        position: redCommanderSpawn,
        rotation: input.redRotation,
        health: commanderHealth,
        unitType: "COMMANDER",
      },
      {
        unitId: "blue-commander",
        team: "BLUE",
        position: blueCommanderSpawn,
        rotation: input.blueRotation,
        health: commanderHealth,
        unitType: "COMMANDER",
      },
    ];

    for (let i = 0; i < mirroredUnitsPerSide; i += 1) {
      const redPosition = input.redSpawnCandidates[i];
      const bluePosition = input.blueSpawnCandidates[i];
      units.push({
        unitId: `red-${i + 1}`,
        team: "RED",
        position: redPosition,
        rotation: input.redRotation,
        health: input.computeArgs.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
      units.push({
        unitId: `blue-${i + 1}`,
        team: "BLUE",
        position: bluePosition,
        rotation: input.blueRotation,
        health: input.computeArgs.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
    }

    return this.applySpawnInvariants({
      plannedUnits: units,
      computeArgs: input.computeArgs,
      redRotation: input.redRotation,
      blueRotation: input.blueRotation,
      cellWidth: input.cellWidth,
      cellHeight: input.cellHeight,
    });
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

  private addSpawnCandidateIfOpen(args: {
    candidateCell: GridCoordinate;
    candidates: Vector2[];
    seenCellKeys: Set<string>;
    gridWidth: number;
    blockedSpawnCellIndexSet: ReadonlySet<number>;
    cellWidth: number;
    cellHeight: number;
  }): void {
    if (
      this.isBlockedSpawnCell(
        args.candidateCell,
        args.gridWidth,
        args.blockedSpawnCellIndexSet,
      )
    ) {
      return;
    }

    const cellKey = `${args.candidateCell.col}:${args.candidateCell.row}`;
    if (args.seenCellKeys.has(cellKey)) {
      return;
    }
    args.seenCellKeys.add(cellKey);
    args.candidates.push(
      this.gridToWorldCenter(args.candidateCell, args.cellWidth, args.cellHeight),
    );
  }

  private applySpawnInvariants(args: {
    plannedUnits: PlannedStartingUnit[];
    computeArgs: ComputeInitialSpawnsArgs;
    redRotation: number;
    blueRotation: number;
    cellWidth: number;
    cellHeight: number;
  }): StartingForcePlan {
    const unblockedUnits = args.plannedUnits.filter((plannedUnit) => {
      const cell = this.worldToGridCoordinate(
        plannedUnit.position.x,
        plannedUnit.position.y,
        args.computeArgs.gridWidth,
        args.computeArgs.gridHeight,
        args.cellWidth,
        args.cellHeight,
      );
      return !this.isBlockedSpawnCell(
        cell,
        args.computeArgs.gridWidth,
        args.computeArgs.blockedSpawnCellIndexSet,
      );
    });

    const commanderHealth = getUnitHealthMax(args.computeArgs.baseUnitHealth, "COMMANDER");
    const redCommander = this.ensureCommander({
      team: "RED",
      commanderCandidates: unblockedUnits.filter(
        (unit) => unit.team === "RED" && unit.unitType === "COMMANDER",
      ),
      commanderHealth,
      rotation: args.redRotation,
      computeArgs: args.computeArgs,
      cellWidth: args.cellWidth,
      cellHeight: args.cellHeight,
    });
    const blueCommander = this.ensureCommander({
      team: "BLUE",
      commanderCandidates: unblockedUnits.filter(
        (unit) => unit.team === "BLUE" && unit.unitType === "COMMANDER",
      ),
      commanderHealth,
      rotation: args.blueRotation,
      computeArgs: args.computeArgs,
      cellWidth: args.cellWidth,
      cellHeight: args.cellHeight,
    });

    const redLineUnits = unblockedUnits.filter(
      (unit) => unit.team === "RED" && unit.unitType !== "COMMANDER",
    );
    const blueLineUnits = unblockedUnits.filter(
      (unit) => unit.team === "BLUE" && unit.unitType !== "COMMANDER",
    );
    const mirroredLineCount = Math.min(redLineUnits.length, blueLineUnits.length);
    const normalizedUnits: PlannedStartingUnit[] = [redCommander, blueCommander];
    for (let index = 0; index < mirroredLineCount; index += 1) {
      const redUnit = redLineUnits[index];
      const blueUnit = blueLineUnits[index];
      normalizedUnits.push({
        unitId: `red-${index + 1}`,
        team: "RED",
        position: redUnit.position,
        rotation: args.redRotation,
        health: args.computeArgs.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
      normalizedUnits.push({
        unitId: `blue-${index + 1}`,
        team: "BLUE",
        position: blueUnit.position,
        rotation: args.blueRotation,
        health: args.computeArgs.baseUnitHealth,
        unitType: DEFAULT_UNIT_TYPE,
      });
    }

    return { units: normalizedUnits };
  }

  private ensureCommander(args: {
    team: PlayerTeam;
    commanderCandidates: PlannedStartingUnit[];
    commanderHealth: number;
    rotation: number;
    computeArgs: ComputeInitialSpawnsArgs;
    cellWidth: number;
    cellHeight: number;
  }): PlannedStartingUnit {
    const existingCommander = args.commanderCandidates[0];
    if (existingCommander) {
      return {
        unitId: `${args.team.toLowerCase()}-commander`,
        team: args.team,
        position: existingCommander.position,
        rotation: args.rotation,
        health: args.commanderHealth,
        unitType: "COMMANDER",
      };
    }

    const fallbackCityCell = args.computeArgs.cityAnchors[args.team];
    const fallbackCell =
      this.findOpenSpawnCellNearCity({
        cityCell: fallbackCityCell,
        searchRadius: args.computeArgs.citySpawnSearchRadius,
        gridWidth: args.computeArgs.gridWidth,
        gridHeight: args.computeArgs.gridHeight,
        blockedSpawnCellIndexSet: args.computeArgs.blockedSpawnCellIndexSet,
      }) ?? this.findFirstOpenSpawnCell(args.computeArgs) ?? fallbackCityCell;
    return {
      unitId: `${args.team.toLowerCase()}-commander`,
      team: args.team,
      position: this.gridToWorldCenter(fallbackCell, args.cellWidth, args.cellHeight),
      rotation: args.rotation,
      health: args.commanderHealth,
      unitType: "COMMANDER",
    };
  }

  private findFirstOpenSpawnCell(
    computeArgs: ComputeInitialSpawnsArgs,
  ): GridCoordinate | null {
    for (let row = 0; row < computeArgs.gridHeight; row += 1) {
      for (let col = 0; col < computeArgs.gridWidth; col += 1) {
        const cell = { col, row };
        if (
          !this.isBlockedSpawnCell(
            cell,
            computeArgs.gridWidth,
            computeArgs.blockedSpawnCellIndexSet,
          )
        ) {
          return cell;
        }
      }
    }

    return null;
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
