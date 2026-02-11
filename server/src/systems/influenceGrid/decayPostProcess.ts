import { InfluenceGridState } from "../../schema/InfluenceGridState.js";
import { PhaserMath } from "./math.js";

type CreateDecayedScoresParams = {
  previousScores: ArrayLike<number>;
  cellCount: number;
  decayRate: number;
  decayZeroEpsilon: number;
  dominanceReferencePower: number;
  dominancePowerMultiplier: number;
  maxExtraDecayAtZero: number;
  maxAbsTacticalScore: number;
  maxMagnitudeExtraDecay: number;
};

type DecayRateForMagnitudeParams = Omit<
  CreateDecayedScoresParams,
  "previousScores" | "cellCount" | "decayZeroEpsilon"
>;

export function createDecayedScores(
  params: CreateDecayedScoresParams,
): Float32Array {
  const {
    previousScores,
    cellCount,
    decayZeroEpsilon,
    ...decayRateForMagnitudeParams
  } = params;
  const scores = new Float32Array(cellCount);
  for (let index = 0; index < cellCount; index += 1) {
    const previousScore = previousScores[index] ?? 0;
    const decayedScore =
      previousScore *
      getDecayRateForMagnitude(previousScore, decayRateForMagnitudeParams);
    scores[index] = Math.abs(decayedScore) < decayZeroEpsilon ? 0 : decayedScore;
  }
  return scores;
}

export function getDecayRateForMagnitude(
  value: number,
  params: DecayRateForMagnitudeParams,
): number {
  const {
    dominanceReferencePower,
    dominancePowerMultiplier,
    maxExtraDecayAtZero,
    maxAbsTacticalScore,
    maxMagnitudeExtraDecay,
    decayRate,
  } = params;
  const smallMagnitudeDecayReference = Math.max(
    1,
    dominanceReferencePower * dominancePowerMultiplier,
  );
  const normalizedSmallMagnitude = PhaserMath.clamp(
    Math.abs(value) / smallMagnitudeDecayReference,
    0,
    1,
  );
  const extraDecayNearZero = (1 - normalizedSmallMagnitude) * maxExtraDecayAtZero;
  const normalizedMagnitudeToMax = PhaserMath.clamp(
    Math.abs(value) / maxAbsTacticalScore,
    0,
    1,
  );
  const extraDecayNearMax = normalizedMagnitudeToMax * maxMagnitudeExtraDecay;
  return PhaserMath.clamp(
    decayRate - extraDecayNearZero - extraDecayNearMax,
    0,
    1,
  );
}

export function writeClampedScoresToStateGrid(
  stateGrid: InfluenceGridState,
  scores: Float32Array,
  maxAbsTacticalScore: number,
): void {
  for (let index = 0; index < scores.length; index += 1) {
    stateGrid.cells[index] = PhaserMath.clamp(
      scores[index],
      -maxAbsTacticalScore,
      maxAbsTacticalScore,
    );
  }
}
