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

export class InfluenceGridSystem {
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;

  constructor() {
    this.gridWidth = GAMEPLAY_CONFIG.influence.gridWidth;
    this.gridHeight = GAMEPLAY_CONFIG.influence.gridHeight;
    this.cellWidth = GAMEPLAY_CONFIG.map.width / this.gridWidth;
    this.cellHeight = GAMEPLAY_CONFIG.map.height / this.gridHeight;
  }

  public writeInfluenceScores(
    stateGrid: InfluenceGridState,
    units: Iterable<Unit>,
  ): void {
    const activeUnits = this.collectActiveUnits(units);
    const cellCount = this.gridWidth * this.gridHeight;

    for (let index = 0; index < cellCount; index += 1) {
      const cellX = index % this.gridWidth;
      const cellY = Math.floor(index / this.gridWidth);
      const worldX = (cellX + 0.5) * this.cellWidth;
      const worldY = (cellY + 0.5) * this.cellHeight;

      let score = 0;
      for (const unit of activeUnits) {
        const distance = Math.hypot(worldX - unit.x, worldY - unit.y);
        score += (unit.power / (distance + 1)) * unit.teamSign;
      }

      stateGrid.cells[index] = score;
    }

    stateGrid.revision += 1;
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
