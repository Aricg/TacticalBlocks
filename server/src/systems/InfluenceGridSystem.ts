import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import { RuntimeTuning } from "../../../shared/src/runtimeTuning.js";
import { InfluenceGridState } from "../schema/InfluenceGridState.js";
import { Unit } from "../schema/Unit.js";

type TeamSign = 1 | -1;
type UnitContributionSource = {
  unitId: string;
  x: number;
  y: number;
  teamSign: TeamSign;
  power: number;
  isStatic: boolean;
};
type StaticInfluenceSource = {
  x: number;
  y: number;
  teamSign: TeamSign;
  power: number;
};

type DominanceTarget = {
  index: number;
  weight: number;
};

const DEFAULT_ENEMY_PRESSURE_DEBUFF_FLOOR = 0.05;

export class InfluenceGridSystem {
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly cellDiagonal: number;
  private readonly coreRadius: number;
  private citySourceCoreRadius: number;
  private decayRate: number;
  private decayZeroEpsilon: number;
  private staticUnitCapGate: number;
  private staticCityCapGate: number;
  private unitCapThreshold: number;
  private unitInfluenceMultiplier: number;
  private staticVelocityEpsilon: number;
  private dominancePowerMultiplier: number;
  private dominanceMinFloor: number;
  private enemyPressureDebuffFloor: number;
  private coreMinInfluenceFactor: number;
  private maxExtraDecayAtZero: number;
  private maxAbsTacticalScore: number;
  private staticInfluenceSources: StaticInfluenceSource[] = [];
  private readonly previousUnitPositionById = new Map<
    string,
    { x: number; y: number }
  >();
  private static readonly DOMINANCE_REFERENCE_POWER = GAMEPLAY_CONFIG.unit.healthMax;

  constructor() {
    this.gridWidth = GAMEPLAY_CONFIG.influence.gridWidth;
    this.gridHeight = GAMEPLAY_CONFIG.influence.gridHeight;
    this.cellWidth = GAMEPLAY_CONFIG.map.width / this.gridWidth;
    this.cellHeight = GAMEPLAY_CONFIG.map.height / this.gridHeight;
    this.cellDiagonal = Math.hypot(this.cellWidth, this.cellHeight);
    this.coreRadius = Math.max(
      Math.hypot(
        GAMEPLAY_CONFIG.unit.bodyWidth * 0.5,
        GAMEPLAY_CONFIG.unit.bodyHeight * 0.5,
      ),
      Math.min(this.cellWidth, this.cellHeight) * 0.5,
    );
    this.citySourceCoreRadius = Math.max(
      GAMEPLAY_CONFIG.influence.citySourceCoreRadius,
      Math.min(this.cellWidth, this.cellHeight) * 0.5,
    );
    this.decayRate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.decayRate,
      0,
      1,
    );
    this.decayZeroEpsilon = Math.max(0, GAMEPLAY_CONFIG.influence.decayZeroEpsilon);
    this.staticUnitCapGate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.staticUnitCapGate,
      0,
      1,
    );
    this.staticCityCapGate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.staticCityCapGate,
      0,
      1,
    );
    this.unitCapThreshold = Math.max(0.1, GAMEPLAY_CONFIG.influence.unitCapThreshold);
    this.unitInfluenceMultiplier = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.unitInfluenceMultiplier,
    );
    this.staticVelocityEpsilon = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.staticVelocityEpsilon,
    );
    this.dominancePowerMultiplier = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.dominancePowerMultiplier,
    );
    this.dominanceMinFloor = Math.max(0, GAMEPLAY_CONFIG.influence.dominanceMinFloor);
    this.enemyPressureDebuffFloor = PhaserMath.clamp(
      DEFAULT_ENEMY_PRESSURE_DEBUFF_FLOOR,
      0,
      1,
    );
    this.coreMinInfluenceFactor = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.coreMinInfluenceFactor,
    );
    this.maxExtraDecayAtZero = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.maxExtraDecayAtZero,
      0,
      1,
    );
    this.maxAbsTacticalScore = Math.max(
      1,
      GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
    );
  }

  public setRuntimeTuning(tuning: RuntimeTuning): void {
    this.decayRate = PhaserMath.clamp(tuning.influenceDecayRate, 0, 1);
    this.decayZeroEpsilon = Math.max(0, tuning.influenceDecayZeroEpsilon);
    this.citySourceCoreRadius = Math.max(0, tuning.citySourceCoreRadius);
    this.staticUnitCapGate = PhaserMath.clamp(tuning.staticUnitCapGate, 0, 1);
    this.staticCityCapGate = PhaserMath.clamp(tuning.staticCityCapGate, 0, 1);
    this.unitCapThreshold = Math.max(0.1, tuning.unitCapThreshold);
    this.unitInfluenceMultiplier = Math.max(0, tuning.unitInfluenceMultiplier);
    this.enemyPressureDebuffFloor = PhaserMath.clamp(
      tuning.influenceEnemyPressureDebuffFloor,
      0,
      1,
    );
    this.coreMinInfluenceFactor = Math.max(0, tuning.influenceCoreMinInfluenceFactor);
    this.maxExtraDecayAtZero = PhaserMath.clamp(
      tuning.influenceMaxExtraDecayAtZero,
      0,
      1,
    );
  }

  public setStaticInfluenceSources(
    sources: Array<{ x: number; y: number; team: "BLUE" | "RED"; power: number }>,
  ): void {
    this.staticInfluenceSources = sources
      .filter(
        (source) =>
          Number.isFinite(source.x) &&
          Number.isFinite(source.y) &&
          Number.isFinite(source.power) &&
          source.power > 0,
      )
      .map((source) => ({
        x: source.x,
        y: source.y,
        power: source.power,
        teamSign: source.team === "BLUE" ? 1 : -1,
      }));
  }

  public writeInfluenceScores(
    stateGrid: InfluenceGridState,
    units: Iterable<Unit>,
  ): void {
    const activeUnits = this.collectActiveUnits(units);
    const cellCount = this.gridWidth * this.gridHeight;
    const scores = new Float32Array(cellCount);
    const blueFloorByCell = new Float32Array(cellCount);
    const redFloorByCell = new Float32Array(cellCount);

    // Persistent field: start from previous frame and decay toward neutral.
    for (let index = 0; index < cellCount; index += 1) {
      const previousScore = stateGrid.cells[index] ?? 0;
      const decayedScore =
        previousScore * this.getDecayRateForMagnitude(previousScore);
      scores[index] =
        Math.abs(decayedScore) < this.decayZeroEpsilon
          ? 0
          : decayedScore;
    }

    const contributingUnits = activeUnits.filter((unit) => {
      if (this.staticUnitCapGate < 0.5 || !unit.isStatic) {
        return true;
      }

      return !this.hasStaticUnitReachedCoreCap(scores, unit);
    });
    const contributingStaticSources = this.staticInfluenceSources.filter(
      (source) =>
        this.staticCityCapGate < 0.5 ||
        !this.hasStaticSourceReachedCoreCap(scores, source),
    );
    const contestMultiplierByUnitId = this.buildContestMultiplierByUnitId(
      activeUnits,
      contributingStaticSources,
    );

    for (let index = 0; index < cellCount; index += 1) {
      const cellX = index % this.gridWidth;
      const cellY = Math.floor(index / this.gridWidth);
      const worldX = (cellX + 0.5) * this.cellWidth;
      const worldY = (cellY + 0.5) * this.cellHeight;

      for (const unit of contributingUnits) {
        const distance = Math.hypot(worldX - unit.x, worldY - unit.y);
        const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
        const localInfluence =
          (unit.power * contestMultiplier) / (distance * distance + 1);
        scores[index] += localInfluence * unit.teamSign;
      }

      for (const source of contributingStaticSources) {
        const distance = Math.hypot(worldX - source.x, worldY - source.y);
        const localInfluence = source.power / (distance * distance + 1);
        scores[index] += localInfluence * source.teamSign;
      }
    }

    for (const unit of contributingUnits) {
      const targets = this.getDominanceTargets(unit.x, unit.y);
      if (targets.length === 0) {
        continue;
      }

      const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
      const absoluteDominance = this.getAbsoluteDominance(
        unit.power * contestMultiplier,
      );
      for (const target of targets) {
        const weightedFloor = absoluteDominance * target.weight;
        this.setTeamFloorAtIndex(
          blueFloorByCell,
          redFloorByCell,
          target.index,
          unit.teamSign,
          weightedFloor,
        );
      }
    }

    for (const unit of activeUnits) {
      const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
      this.enforceCoreMinimumInfluence(
        blueFloorByCell,
        redFloorByCell,
        unit,
        unit.power * contestMultiplier,
      );
    }

    // Resolve floors order-independently. In contested cells, avoid forcing either
    // side's floor so small numerical asymmetries can't accumulate into side bias.
    for (let index = 0; index < cellCount; index += 1) {
      const blueFloor = blueFloorByCell[index];
      const redFloor = redFloorByCell[index];
      if (blueFloor > 0 && redFloor > 0) {
        continue;
      }
      if (blueFloor > 0) {
        scores[index] = Math.max(scores[index], blueFloor);
      } else if (redFloor > 0) {
        scores[index] = Math.min(scores[index], -redFloor);
      }
    }

    for (let index = 0; index < cellCount; index += 1) {
      stateGrid.cells[index] = PhaserMath.clamp(
        scores[index],
        -this.maxAbsTacticalScore,
        this.maxAbsTacticalScore,
      );
    }

    stateGrid.revision += 1;
  }

  private getDecayRateForMagnitude(value: number): number {
    const smallMagnitudeDecayReference = Math.max(
      1,
      InfluenceGridSystem.DOMINANCE_REFERENCE_POWER * this.dominancePowerMultiplier,
    );
    const normalizedMagnitude = PhaserMath.clamp(
      Math.abs(value) / smallMagnitudeDecayReference,
      0,
      1,
    );
    const extraDecay = (1 - normalizedMagnitude) * this.maxExtraDecayAtZero;
    return PhaserMath.clamp(this.decayRate - extraDecay, 0, 1);
  }

  private enforceCoreMinimumInfluence(
    blueFloorByCell: Float32Array,
    redFloorByCell: Float32Array,
    unit: UnitContributionSource,
    effectivePower: number,
  ): void {
    const coreRadiusSquared = this.coreRadius * this.coreRadius;
    const minCol = PhaserMath.floorClamp(
      (unit.x - this.coreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const maxCol = PhaserMath.floorClamp(
      (unit.x + this.coreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const minRow = PhaserMath.floorClamp(
      (unit.y - this.coreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );
    const maxRow = PhaserMath.floorClamp(
      (unit.y + this.coreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );
    const minimumInfluence = Math.max(
      this.dominanceMinFloor,
      this.getAbsoluteDominance(effectivePower) * this.coreMinInfluenceFactor,
    );

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cellCenterX = (col + 0.5) * this.cellWidth;
        const cellCenterY = (row + 0.5) * this.cellHeight;
        const deltaX = cellCenterX - unit.x;
        const deltaY = cellCenterY - unit.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared > coreRadiusSquared) {
          continue;
        }

        const index = row * this.gridWidth + col;
        this.setTeamFloorAtIndex(
          blueFloorByCell,
          redFloorByCell,
          index,
          unit.teamSign,
          minimumInfluence,
        );
      }
    }
  }

  private setTeamFloorAtIndex(
    blueFloorByCell: Float32Array,
    redFloorByCell: Float32Array,
    index: number,
    teamSign: TeamSign,
    floorMagnitude: number,
  ): void {
    if (floorMagnitude <= 0) {
      return;
    }

    if (teamSign > 0) {
      blueFloorByCell[index] = Math.max(blueFloorByCell[index], floorMagnitude);
    } else {
      redFloorByCell[index] = Math.max(redFloorByCell[index], floorMagnitude);
    }
  }

  private buildContestMultiplierByUnitId(
    activeUnits: UnitContributionSource[],
    staticSources: StaticInfluenceSource[],
  ): Map<string, number> {
    const multiplierByUnitId = new Map<string, number>();
    for (const unit of activeUnits) {
      multiplierByUnitId.set(
        unit.unitId,
        this.getContestMultiplier(unit, activeUnits, staticSources),
      );
    }
    return multiplierByUnitId;
  }

  private getContestMultiplier(
    focusUnit: UnitContributionSource,
    allUnits: UnitContributionSource[],
    staticSources: StaticInfluenceSource[],
  ): number {
    let alliedPressure = 0;
    let enemyPressure = 0;

    for (const unit of allUnits) {
      if (unit.unitId === focusUnit.unitId) {
        continue;
      }

      const distance = Math.hypot(focusUnit.x - unit.x, focusUnit.y - unit.y);
      const pressure = unit.power / (distance * distance + 1);
      if (unit.teamSign === focusUnit.teamSign) {
        alliedPressure += pressure;
      } else {
        enemyPressure += pressure;
      }
    }

    for (const source of staticSources) {
      const distance = Math.hypot(focusUnit.x - source.x, focusUnit.y - source.y);
      const pressure = source.power / (distance * distance + 1);
      if (source.teamSign === focusUnit.teamSign) {
        alliedPressure += pressure;
      } else {
        enemyPressure += pressure;
      }
    }

    const totalPressure = alliedPressure + enemyPressure;
    if (totalPressure <= 0.00001) {
      return 1;
    }

    const alliedShare = PhaserMath.clamp(alliedPressure / totalPressure, 0, 1);
    // Stronger contest debuff: isolated units under enemy pressure can fall well below full strength.
    // A low floor preserves a visible circle while allowing mid-scale values (~50 on a 100 cap).
    const minContestMultiplier = this.enemyPressureDebuffFloor;
    return minContestMultiplier + alliedShare * (1 - minContestMultiplier);
  }

  private hasStaticUnitReachedCoreCap(
    scores: Float32Array,
    unit: UnitContributionSource,
  ): boolean {
    const coreRadiusSquared = this.coreRadius * this.coreRadius;
    const minCol = PhaserMath.floorClamp(
      (unit.x - this.coreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const maxCol = PhaserMath.floorClamp(
      (unit.x + this.coreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const minRow = PhaserMath.floorClamp(
      (unit.y - this.coreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );
    const maxRow = PhaserMath.floorClamp(
      (unit.y + this.coreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );

    const maxInfluence = Math.max(1, unit.power * this.unitCapThreshold);
    let hasCoreCell = false;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cellCenterX = (col + 0.5) * this.cellWidth;
        const cellCenterY = (row + 0.5) * this.cellHeight;
        const deltaX = cellCenterX - unit.x;
        const deltaY = cellCenterY - unit.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared > coreRadiusSquared) {
          continue;
        }

        hasCoreCell = true;
        const score = scores[row * this.gridWidth + col];
        if (unit.teamSign > 0) {
          if (score < maxInfluence) {
            return false;
          }
        } else if (score > -maxInfluence) {
          return false;
        }
      }
    }

    return hasCoreCell;
  }

  private hasStaticSourceReachedCoreCap(
    scores: Float32Array,
    source: StaticInfluenceSource,
  ): boolean {
    const coreRadiusSquared = this.citySourceCoreRadius * this.citySourceCoreRadius;
    const minCol = PhaserMath.floorClamp(
      (source.x - this.citySourceCoreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const maxCol = PhaserMath.floorClamp(
      (source.x + this.citySourceCoreRadius) / this.cellWidth - 0.5,
      0,
      this.gridWidth - 1,
    );
    const minRow = PhaserMath.floorClamp(
      (source.y - this.citySourceCoreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );
    const maxRow = PhaserMath.floorClamp(
      (source.y + this.citySourceCoreRadius) / this.cellHeight - 0.5,
      0,
      this.gridHeight - 1,
    );

    const maxInfluence = Math.max(1, source.power);
    let hasCoreCell = false;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cellCenterX = (col + 0.5) * this.cellWidth;
        const cellCenterY = (row + 0.5) * this.cellHeight;
        const deltaX = cellCenterX - source.x;
        const deltaY = cellCenterY - source.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared > coreRadiusSquared) {
          continue;
        }

        hasCoreCell = true;
        const score = scores[row * this.gridWidth + col];
        if (source.teamSign > 0) {
          if (score < maxInfluence) {
            return false;
          }
        } else if (score > -maxInfluence) {
          return false;
        }
      }
    }

    return hasCoreCell;
  }

  private getAbsoluteDominance(power: number): number {
    const dominancePower = Math.max(
      power,
      InfluenceGridSystem.DOMINANCE_REFERENCE_POWER,
    );
    return Math.max(
      this.dominanceMinFloor,
      dominancePower * this.dominancePowerMultiplier,
    );
  }

  private getDominanceTargets(x: number, y: number): DominanceTarget[] {
    const colBasis = x / this.cellWidth - 0.5;
    const rowBasis = y / this.cellHeight - 0.5;
    const baseCol = PhaserMath.floorClamp(colBasis, 0, this.gridWidth - 1);
    const baseRow = PhaserMath.floorClamp(rowBasis, 0, this.gridHeight - 1);
    const nextCol = PhaserMath.clamp(baseCol + 1, 0, this.gridWidth - 1);
    const nextRow = PhaserMath.clamp(baseRow + 1, 0, this.gridHeight - 1);

    const candidateCoords = [
      { col: baseCol, row: baseRow },
      { col: nextCol, row: baseRow },
      { col: baseCol, row: nextRow },
      { col: nextCol, row: nextRow },
    ];

    const uniqueCoords = new Map<string, { col: number; row: number }>();
    for (const coord of candidateCoords) {
      uniqueCoords.set(`${coord.col}:${coord.row}`, coord);
    }

    const weightedTargets: Array<{ index: number; rawWeight: number }> = [];
    let totalWeight = 0;
    for (const coord of uniqueCoords.values()) {
      const cellCenterX = (coord.col + 0.5) * this.cellWidth;
      const cellCenterY = (coord.row + 0.5) * this.cellHeight;
      const distance = Math.hypot(x - cellCenterX, y - cellCenterY);
      const normalizedDistance = this.cellDiagonal > 0 ? distance / this.cellDiagonal : 0;
      const rawWeight = Math.max(0, 1 - normalizedDistance);
      if (rawWeight <= 0) {
        continue;
      }

      const index = coord.row * this.gridWidth + coord.col;
      weightedTargets.push({ index, rawWeight });
      totalWeight += rawWeight;
    }

    if (weightedTargets.length === 0 || totalWeight <= 0) {
      return [];
    }

    return weightedTargets.map((target) => ({
      index: target.index,
      weight: target.rawWeight / totalWeight,
    }));
  }

  private collectActiveUnits(units: Iterable<Unit>): UnitContributionSource[] {
    const activeUnits: UnitContributionSource[] = [];
    const activeUnitIds = new Set<string>();

    for (const unit of units) {
      if (unit.health <= 0) {
        continue;
      }

      activeUnitIds.add(unit.unitId);
      const normalizedTeam = unit.team.toUpperCase();
      const teamSign: TeamSign = normalizedTeam === "BLUE" ? 1 : -1;
      const power = Math.max(0, unit.health * this.unitInfluenceMultiplier);
      const previousPosition = this.previousUnitPositionById.get(unit.unitId);
      const isStatic =
        previousPosition !== undefined &&
        Math.hypot(unit.x - previousPosition.x, unit.y - previousPosition.y) <=
          this.staticVelocityEpsilon;

      activeUnits.push({
        unitId: unit.unitId,
        x: unit.x,
        y: unit.y,
        teamSign,
        power,
        isStatic,
      });
    }

    for (const unitId of this.previousUnitPositionById.keys()) {
      if (!activeUnitIds.has(unitId)) {
        this.previousUnitPositionById.delete(unitId);
      }
    }

    for (const unit of activeUnits) {
      this.previousUnitPositionById.set(unit.unitId, { x: unit.x, y: unit.y });
    }

    return activeUnits;
  }
}

const PhaserMath = {
  clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  },
  floorClamp(value: number, min: number, max: number): number {
    return PhaserMath.clamp(Math.floor(value), min, max);
  },
};
