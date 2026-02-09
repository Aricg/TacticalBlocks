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
  baseUnitHealth: GAMEPLAY_CONFIG.runtimeTuning.defaults.baseUnitHealth,
  healthInfluenceMultiplier:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.healthInfluenceMultiplier,
  unitMoveSpeed: GAMEPLAY_CONFIG.runtimeTuning.defaults.unitMoveSpeed,
  baseContactDps: GAMEPLAY_CONFIG.runtimeTuning.defaults.baseContactDps,
  dpsInfluenceMultiplier:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.dpsInfluenceMultiplier,
  influenceUpdateIntervalFrames:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceUpdateIntervalFrames,
  influenceDecayRate: GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceDecayRate,
  influenceDecayZeroEpsilon:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceDecayZeroEpsilon,
  citySourceCoreRadius: GAMEPLAY_CONFIG.runtimeTuning.defaults.citySourceCoreRadius,
  staticUnitCapGate: GAMEPLAY_CONFIG.runtimeTuning.defaults.staticUnitCapGate,
  staticCityCapGate: GAMEPLAY_CONFIG.runtimeTuning.defaults.staticCityCapGate,
  unitCapThreshold: GAMEPLAY_CONFIG.runtimeTuning.defaults.unitCapThreshold,
  unitInfluenceMultiplier:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.unitInfluenceMultiplier,
  influenceEnemyPressureDebuffFloor:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceEnemyPressureDebuffFloor,
  influenceCoreMinInfluenceFactor:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceCoreMinInfluenceFactor,
  influenceMaxExtraDecayAtZero:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceMaxExtraDecayAtZero,
  fogVisionRadius: GAMEPLAY_CONFIG.runtimeTuning.defaults.fogVisionRadius,
  cityVisionRadius: GAMEPLAY_CONFIG.runtimeTuning.defaults.cityVisionRadius,
  lineThickness: GAMEPLAY_CONFIG.runtimeTuning.defaults.lineThickness,
  lineAlpha: GAMEPLAY_CONFIG.runtimeTuning.defaults.lineAlpha,
  cityInfluenceUnitsEquivalent:
    GAMEPLAY_CONFIG.runtimeTuning.defaults.cityInfluenceUnitsEquivalent,
};

export const RUNTIME_TUNING_BOUNDS: Record<RuntimeTuningKey, RuntimeTuningBound> = {
  baseUnitHealth: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.baseUnitHealth },
  healthInfluenceMultiplier: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.healthInfluenceMultiplier,
  },
  unitMoveSpeed: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.unitMoveSpeed },
  baseContactDps: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.baseContactDps },
  dpsInfluenceMultiplier: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.dpsInfluenceMultiplier,
  },
  influenceUpdateIntervalFrames: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceUpdateIntervalFrames,
  },
  influenceDecayRate: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceDecayRate },
  influenceDecayZeroEpsilon: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceDecayZeroEpsilon,
  },
  citySourceCoreRadius: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.citySourceCoreRadius },
  staticUnitCapGate: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.staticUnitCapGate },
  staticCityCapGate: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.staticCityCapGate },
  unitCapThreshold: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.unitCapThreshold },
  unitInfluenceMultiplier: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.unitInfluenceMultiplier,
  },
  influenceEnemyPressureDebuffFloor: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceEnemyPressureDebuffFloor,
  },
  influenceCoreMinInfluenceFactor: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceCoreMinInfluenceFactor,
  },
  influenceMaxExtraDecayAtZero: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.influenceMaxExtraDecayAtZero,
  },
  fogVisionRadius: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.fogVisionRadius },
  cityVisionRadius: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.cityVisionRadius },
  lineThickness: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.lineThickness },
  lineAlpha: { ...GAMEPLAY_CONFIG.runtimeTuning.bounds.lineAlpha },
  cityInfluenceUnitsEquivalent: {
    ...GAMEPLAY_CONFIG.runtimeTuning.bounds.cityInfluenceUnitsEquivalent,
  },
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
