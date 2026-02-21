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
  maxAbsInfluenceScore: number;
  moraleInfluenceCurveExponent: number;
  gridWidth: number;
  gridHeight: number;
  worldToGridCoordinate: (x: number, y: number) => GridCoordinate;
  getInfluenceScoreAtCell: (col: number, row: number) => number;
  getTerrainMoraleBonusAtCell: (cell: GridCoordinate) => number;
}

export function getUnitMoraleScore({
  unit,
  moraleSampleRadius,
  moraleMaxScore,
  maxAbsInfluenceScore,
  moraleInfluenceCurveExponent,
  gridWidth,
  gridHeight,
  worldToGridCoordinate,
  getInfluenceScoreAtCell,
  getTerrainMoraleBonusAtCell,
}: UnitMoraleScoreParams): number {
  const sampleCenter = worldToGridCoordinate(unit.x, unit.y);
  const teamSign = getTeamSign(unit.team);
  const influenceNormalization = Math.max(1, maxAbsInfluenceScore);
  const influenceCurveExponent = Math.max(0.001, moraleInfluenceCurveExponent);
  let accumulatedFriendlyWeight = 0;
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
      // Convert [-maxAbsInfluenceScore, +maxAbsInfluenceScore] to [0, 1]:
      // enemy-dominant cell => 0, neutral/contested => 0.5, friendly-dominant => 1.
      const normalizedAlignedScore = clamp(
        alignedCellScore / influenceNormalization,
        -1,
        1,
      );
      const curvedAlignedScore =
        Math.sign(normalizedAlignedScore) *
        Math.pow(Math.abs(normalizedAlignedScore), influenceCurveExponent);
      accumulatedFriendlyWeight += (curvedAlignedScore + 1) * 0.5;
      sampledCells += 1;
    }
  }

  if (sampledCells <= 0) {
    return 1;
  }

  const baseMoraleScore =
    (accumulatedFriendlyWeight / sampledCells) * moraleMaxScore;
  const terrainMoraleBonus = getTerrainMoraleBonusAtCell(sampleCenter);
  const moraleScore = baseMoraleScore + terrainMoraleBonus;
  return clamp(moraleScore, 1, moraleMaxScore);
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
