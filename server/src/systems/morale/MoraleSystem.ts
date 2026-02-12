import type { Unit } from "../../schema/Unit.js";
import type { GridCoordinate } from "../../rooms/BattleRoomTypes.js";
import { getMoraleAdvantageNormalized } from "./moraleMath.js";

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getTeamSign(team: string): 1 | -1 {
  return team.toUpperCase() === "BLUE" ? 1 : -1;
}

export interface UnitMoraleScoreParams {
  unit: Unit;
  moraleSampleRadius: number;
  moraleMaxScore: number;
  gridWidth: number;
  gridHeight: number;
  worldToGridCoordinate: (x: number, y: number) => GridCoordinate;
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  getTerrainMoraleMultiplierAtCell: (cell: GridCoordinate) => number;
}

export function getUnitMoraleScore({
  unit,
  moraleSampleRadius,
  moraleMaxScore,
  gridWidth,
  gridHeight,
  worldToGridCoordinate,
  getInfluenceScoreAtCell,
  getTerrainMoraleMultiplierAtCell,
}: UnitMoraleScoreParams): number {
  const sampleCenter = worldToGridCoordinate(unit.x, unit.y);
  const teamSign = getTeamSign(unit.team);
  let friendlyDots = 0;
  let sampledCells = 0;

  for (
    let rowOffset = -moraleSampleRadius;
    rowOffset <= moraleSampleRadius;
    rowOffset += 1
  ) {
    for (
      let colOffset = -moraleSampleRadius;
      colOffset <= moraleSampleRadius;
      colOffset += 1
    ) {
      const sampleCol = clamp(sampleCenter.col + colOffset, 0, gridWidth - 1);
      const sampleRow = clamp(sampleCenter.row + rowOffset, 0, gridHeight - 1);
      const cellScore = getInfluenceScoreAtCell(sampleCol, sampleRow);
      const alignedCellScore = cellScore * teamSign;
      if (alignedCellScore >= 0) {
        friendlyDots += 1;
      }
      sampledCells += 1;
    }
  }

  if (sampledCells <= 0) {
    return 0;
  }

  const baseMoraleScore = (friendlyDots / sampledCells) * moraleMaxScore;
  const terrainMoraleMultiplier =
    getTerrainMoraleMultiplierAtCell(sampleCenter);
  const moraleScore = baseMoraleScore * terrainMoraleMultiplier;
  return clamp(moraleScore, 0, moraleMaxScore);
}

export function updateUnitMoraleScores(
  units: Unit[],
  getScore: (unit: Unit) => number,
): void {
  for (const unit of units) {
    unit.moraleScore = getScore(unit);
  }
}

export function getUnitMoraleAdvantageNormalized(
  unit: Unit,
  moraleMaxScore: number,
  getScore: (unit: Unit) => number,
): number {
  const rawMoraleScore = Number.isFinite(unit.moraleScore)
    ? unit.moraleScore
    : getScore(unit);
  return getMoraleAdvantageNormalized(rawMoraleScore, moraleMaxScore);
}
