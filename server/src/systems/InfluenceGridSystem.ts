import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
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

type DominanceTarget = {
  index: number;
  weight: number;
};

export class InfluenceGridSystem {
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly cellDiagonal: number;
  private readonly coreRadius: number;
  private readonly decayRate: number;
  private readonly previousUnitPositionById = new Map<
    string,
    { x: number; y: number }
  >();
  private static readonly DECAY_ZERO_EPSILON = 0.05;
  private static readonly STATIC_VELOCITY_EPSILON = 0.0001;
  private static readonly DOMINANCE_REFERENCE_POWER = GAMEPLAY_CONFIG.unit.healthMax;
  private static readonly DOMINANCE_POWER_MULTIPLIER = 0.22;
  private static readonly DOMINANCE_MIN_FLOOR = 1;
  private static readonly SMALL_MAGNITUDE_DECAY_REFERENCE =
    InfluenceGridSystem.DOMINANCE_REFERENCE_POWER *
    InfluenceGridSystem.DOMINANCE_POWER_MULTIPLIER;
  private static readonly MAX_EXTRA_DECAY_AT_ZERO = 0.3;
  private static readonly MAX_ABS_TACTICAL_SCORE = 500;

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
    this.decayRate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.decayRate,
      0,
      1,
    );
  }

  public writeInfluenceScores(
    stateGrid: InfluenceGridState,
    units: Iterable<Unit>,
  ): void {
    const activeUnits = this.collectActiveUnits(units);
    const cellCount = this.gridWidth * this.gridHeight;
    const scores = new Float32Array(cellCount);

    // Persistent field: start from previous frame and decay toward neutral.
    for (let index = 0; index < cellCount; index += 1) {
      const previousScore = stateGrid.cells[index] ?? 0;
      const decayedScore =
        previousScore * this.getDecayRateForMagnitude(previousScore);
      scores[index] =
        Math.abs(decayedScore) < InfluenceGridSystem.DECAY_ZERO_EPSILON
          ? 0
          : decayedScore;
    }

    const contributingUnits = activeUnits.filter((unit) => {
      if (!unit.isStatic) {
        return true;
      }

      return !this.hasStaticUnitReachedCoreCap(scores, unit);
    });

    for (let index = 0; index < cellCount; index += 1) {
      const cellX = index % this.gridWidth;
      const cellY = Math.floor(index / this.gridWidth);
      const worldX = (cellX + 0.5) * this.cellWidth;
      const worldY = (cellY + 0.5) * this.cellHeight;

      for (const unit of contributingUnits) {
        const distance = Math.hypot(worldX - unit.x, worldY - unit.y);
        const localInfluence = unit.power / (distance * distance + 1);
        scores[index] += localInfluence * unit.teamSign;
      }
    }

    for (const unit of contributingUnits) {
      const targets = this.getDominanceTargets(unit.x, unit.y);
      if (targets.length === 0) {
        continue;
      }

      const absoluteDominance = this.getAbsoluteDominance(unit.power);
      for (const target of targets) {
        const weightedFloor = absoluteDominance * target.weight;
        if (unit.teamSign > 0) {
          scores[target.index] = Math.max(scores[target.index], weightedFloor);
        } else {
          scores[target.index] = Math.min(scores[target.index], -weightedFloor);
        }
      }
    }

    for (let index = 0; index < cellCount; index += 1) {
      stateGrid.cells[index] = PhaserMath.clamp(
        scores[index],
        -InfluenceGridSystem.MAX_ABS_TACTICAL_SCORE,
        InfluenceGridSystem.MAX_ABS_TACTICAL_SCORE,
      );
    }

    stateGrid.revision += 1;
  }

  private getDecayRateForMagnitude(value: number): number {
    const normalizedMagnitude = PhaserMath.clamp(
      Math.abs(value) / InfluenceGridSystem.SMALL_MAGNITUDE_DECAY_REFERENCE,
      0,
      1,
    );
    const extraDecay =
      (1 - normalizedMagnitude) * InfluenceGridSystem.MAX_EXTRA_DECAY_AT_ZERO;
    return PhaserMath.clamp(this.decayRate - extraDecay, 0, 1);
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

    const maxInfluence = Math.max(1, unit.power);
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

  private getAbsoluteDominance(power: number): number {
    const dominancePower = Math.max(
      power,
      InfluenceGridSystem.DOMINANCE_REFERENCE_POWER,
    );
    return Math.max(
      InfluenceGridSystem.DOMINANCE_MIN_FLOOR,
      dominancePower * InfluenceGridSystem.DOMINANCE_POWER_MULTIPLIER,
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
      const power = Math.max(0, unit.health);
      const previousPosition = this.previousUnitPositionById.get(unit.unitId);
      const isStatic =
        previousPosition !== undefined &&
        Math.hypot(unit.x - previousPosition.x, unit.y - previousPosition.y) <=
          InfluenceGridSystem.STATIC_VELOCITY_EPSILON;

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
