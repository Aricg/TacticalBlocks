import { GAMEPLAY_CONFIG } from "./gameplayConfig.js";

export type RuntimeTuning = {
  baseUnitHealth: number;
  healthInfluenceMultiplier: number;
  unitMoveSpeed: number;
  baseContactDps: number;
  dpsInfluenceMultiplier: number;
  influenceUpdateIntervalFrames: number;
  influenceDecayRate: number;
  influenceDecayZeroEpsilon: number;
  citySourceCoreRadius: number;
  staticUnitCapGate: number;
  staticCityCapGate: number;
  unitCapThreshold: number;
  unitInfluenceMultiplier: number;
  influenceEnemyPressureDebuffFloor: number;
  influenceCoreMinInfluenceFactor: number;
  influenceMaxExtraDecayAtZero: number;
  fogVisionRadius: number;
  cityVisionRadius: number;
  lineThickness: number;
  lineAlpha: number;
  cityInfluenceUnitsEquivalent: number;
};

export type RuntimeTuningKey = keyof RuntimeTuning;

type RuntimeTuningBound = {
  min: number;
  max: number;
  step: number;
};

export const DEFAULT_RUNTIME_TUNING: RuntimeTuning = {
  baseUnitHealth: GAMEPLAY_CONFIG.unit.healthMax,
  healthInfluenceMultiplier: 0,
  unitMoveSpeed: GAMEPLAY_CONFIG.movement.unitMoveSpeed,
  baseContactDps: GAMEPLAY_CONFIG.combat.contactDamagePerSecond,
  dpsInfluenceMultiplier: 0,
  influenceUpdateIntervalFrames: GAMEPLAY_CONFIG.influence.updateIntervalFrames,
  influenceDecayRate: GAMEPLAY_CONFIG.influence.decayRate,
  influenceDecayZeroEpsilon: GAMEPLAY_CONFIG.influence.decayZeroEpsilon,
  citySourceCoreRadius: GAMEPLAY_CONFIG.influence.citySourceCoreRadius,
  staticUnitCapGate: GAMEPLAY_CONFIG.influence.staticUnitCapGate,
  staticCityCapGate: GAMEPLAY_CONFIG.influence.staticCityCapGate,
  unitCapThreshold: GAMEPLAY_CONFIG.influence.unitCapThreshold,
  unitInfluenceMultiplier: GAMEPLAY_CONFIG.influence.unitInfluenceMultiplier,
  influenceEnemyPressureDebuffFloor: 0.05,
  influenceCoreMinInfluenceFactor: GAMEPLAY_CONFIG.influence.coreMinInfluenceFactor,
  influenceMaxExtraDecayAtZero: GAMEPLAY_CONFIG.influence.maxExtraDecayAtZero,
  fogVisionRadius: GAMEPLAY_CONFIG.visibility.visionRadius,
  cityVisionRadius: GAMEPLAY_CONFIG.visibility.cityVisionRadius,
  lineThickness: GAMEPLAY_CONFIG.influence.lineThickness,
  lineAlpha: GAMEPLAY_CONFIG.influence.lineAlpha,
  cityInfluenceUnitsEquivalent: GAMEPLAY_CONFIG.cities.influenceUnitsEquivalent,
};

export const RUNTIME_TUNING_BOUNDS: Record<RuntimeTuningKey, RuntimeTuningBound> = {
  baseUnitHealth: { min: 20, max: 200, step: 1 },
  healthInfluenceMultiplier: { min: 0, max: 1, step: 0.01 },
  unitMoveSpeed: { min: 20, max: 300, step: 1 },
  baseContactDps: { min: 1, max: 24, step: 0.1 },
  dpsInfluenceMultiplier: { min: 0, max: 1, step: 0.01 },
  influenceUpdateIntervalFrames: { min: 1, max: 20, step: 1 },
  influenceDecayRate: { min: 0.7, max: 0.999, step: 0.001 },
  influenceDecayZeroEpsilon: { min: 0, max: 2, step: 0.01 },
  citySourceCoreRadius: { min: 0, max: 50, step: 1 },
  staticUnitCapGate: { min: 0, max: 1, step: 1 },
  staticCityCapGate: { min: 0, max: 1, step: 1 },
  unitCapThreshold: { min: 0.1, max: 2, step: 0.05 },
  unitInfluenceMultiplier: { min: 0, max: 0.1, step: 0.0025 },
  influenceEnemyPressureDebuffFloor: { min: 0, max: 1, step: 0.01 },
  influenceCoreMinInfluenceFactor: { min: 0, max: 1, step: 0.01 },
  influenceMaxExtraDecayAtZero: { min: 0, max: 0.9, step: 0.01 },
  fogVisionRadius: { min: 40, max: 600, step: 1 },
  cityVisionRadius: { min: 40, max: 600, step: 1 },
  lineThickness: { min: 1, max: 24, step: 1 },
  lineAlpha: { min: 0.05, max: 1, step: 0.01 },
  cityInfluenceUnitsEquivalent: { min: 0, max: 40, step: 0.5 },
};

export const RUNTIME_TUNING_KEYS = Object.keys(
  DEFAULT_RUNTIME_TUNING,
) as RuntimeTuningKey[];

export function sanitizeRuntimeTuningUpdate(
  update: Partial<RuntimeTuning>,
): Partial<RuntimeTuning> {
  const sanitized: Partial<RuntimeTuning> = {};

  for (const key of RUNTIME_TUNING_KEYS) {
    const value = update[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    const bounds = RUNTIME_TUNING_BOUNDS[key];
    const clamped = clamp(value, bounds.min, bounds.max);
    const normalizedValue =
      key === "influenceUpdateIntervalFrames" ||
      key === "baseUnitHealth" ||
      key === "citySourceCoreRadius" ||
      key === "staticUnitCapGate" ||
      key === "staticCityCapGate"
        ? Math.round(clamped)
        : clamped;
    sanitized[key] = normalizedValue as RuntimeTuning[typeof key];
  }

  return sanitized;
}

export function applyRuntimeTuningUpdate(
  current: RuntimeTuning,
  update: Partial<RuntimeTuning>,
): RuntimeTuning {
  return {
    ...current,
    ...sanitizeRuntimeTuningUpdate(update),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
