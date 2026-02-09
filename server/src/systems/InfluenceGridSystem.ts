import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import { InfluenceGridState } from "../schema/InfluenceGridState.js";
import { Unit } from "../schema/Unit.js";

type TeamSign = 1 | -1;
type UnitContributionSource = {
  x: number;
  y: number;
  teamSign: TeamSign;
  power: number;
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
  private static readonly DOMINANCE_REFERENCE_POWER = GAMEPLAY_CONFIG.unit.healthMax;
  private static readonly DOMINANCE_POWER_MULTIPLIER = 0.22;
  private static readonly DOMINANCE_MIN_FLOOR = 1;

  constructor() {
    this.gridWidth = GAMEPLAY_CONFIG.influence.gridWidth;
    this.gridHeight = GAMEPLAY_CONFIG.influence.gridHeight;
    this.cellWidth = GAMEPLAY_CONFIG.map.width / this.gridWidth;
    this.cellHeight = GAMEPLAY_CONFIG.map.height / this.gridHeight;
    this.cellDiagonal = Math.hypot(this.cellWidth, this.cellHeight);
  }

  public writeInfluenceScores(
    stateGrid: InfluenceGridState,
    units: Iterable<Unit>,
  ): void {
    const activeUnits = this.collectActiveUnits(units);
    const cellCount = this.gridWidth * this.gridHeight;
    const scores = new Float32Array(cellCount);

    for (let index = 0; index < cellCount; index += 1) {
      const cellX = index % this.gridWidth;
      const cellY = Math.floor(index / this.gridWidth);
      const worldX = (cellX + 0.5) * this.cellWidth;
      const worldY = (cellY + 0.5) * this.cellHeight;

      let score = 0;
      for (const unit of activeUnits) {
        const distance = Math.hypot(worldX - unit.x, worldY - unit.y);
        const localInfluence = unit.power / (distance * distance + 1);
        score += localInfluence * unit.teamSign;
      }

      scores[index] = score;
    }

    for (const unit of activeUnits) {
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
      stateGrid.cells[index] = scores[index];
    }

    stateGrid.revision += 1;
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

    for (const unit of units) {
      if (unit.health <= 0) {
        continue;
      }

      const normalizedTeam = unit.team.toUpperCase();
      const teamSign: TeamSign = normalizedTeam === "BLUE" ? 1 : -1;
      const power = Math.max(0, unit.health);
      activeUnits.push({
        x: unit.x,
        y: unit.y,
        teamSign,
        power,
      });
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
