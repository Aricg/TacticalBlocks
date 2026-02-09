export const GAMEPLAY_CONFIG = {
  map: {
    width: 1920,
    height: 1080,
  },
  network: {
    maxPlayers: 2,
    positionSyncIntervalMs: 50,
    positionSyncEpsilon: 0.5,
    remotePositionLerpRate: 14,
    remotePositionSnapDistance: 48,
  },
  visibility: {
    shroudColor: 0x8f979d,
    shroudAlpha: 0.46,
    fogDepth: 925,
    visionRadius: 178,
    cityVisionRadius: 240,
    enemyVisibilityPadding: 24,
  },
  influence: {
    // Influence-grid resolution in cells (higher = smoother line, more CPU/network cost).
    gridWidth: 80,
    gridHeight: 44,
    // Server recomputes influence every N simulation frames.
    updateIntervalFrames: 6,
    // Base per-update decay multiplier applied to existing influence.
    decayRate: 0.95,
    // After decay, snap tiny magnitudes to 0 to prevent crawling/drift.
    decayZeroEpsilon: 1.83,
    // Max position delta between influence updates to consider a unit "static".
    staticVelocityEpsilon: 0.0001,
    // Core dominance stamp strength relative to unit power.
    dominancePowerMultiplier: 0.22,
    // Multiplier on per-unit influence contribution.
    unitInfluenceMultiplier: 0.05,
    // Never allow dominance/core floors below this absolute value.
    dominanceMinFloor: 1,
    // Guaranteed minimum core influence as a fraction of dominance strength.
    coreMinInfluenceFactor: 0.13,
    // Extra decay applied near zero magnitude (small residuals collapse faster).
    maxExtraDecayAtZero: 0.4,
    // Hard cap for signed tactical score in each cell.
    maxAbsTacticalScore: 100,
    // City source core radius used for static-source cap checks.
    citySourceCoreRadius: 27,
    // 1 enables static-unit cap gate, 0 disables it.
    staticUnitCapGate: 0,
    // 1 enables static-city cap gate, 0 disables it.
    staticCityCapGate: 0,
    // Multiplier applied to unit cap threshold checks.
    unitCapThreshold: 1.05,
    lineColor: 0x111111,
    lineAlpha: 0.92,
    lineThickness: 8,
    splineDensityMultiplier: 8,
  },
  cities: {
    backlineOffset: 140,
    influenceUnitsEquivalent: 3,
  },
  input: {
    dragThreshold: 10,
    previewPathPointSpacing: 4,
    commandPathPointSpacing: 50,
  },
  movement: {
    // Baseline unit locomotion tuning.
    unitMoveSpeed: 120,
    unitTurnSpeedRadians: Math.PI,
    unitForwardOffsetRadians: -Math.PI / 2,
    refaceAngleThresholdRadians: (Math.PI / 180) * 3,
    waypointMoveAngleToleranceRadians: 0.35,
    minWaypointDistance: 1,
    // Clamp for player-provided command speed multipliers.
    maxCommandSpeedMultiplier: 4,
    allyCollisionPushSpeed: 180,
    allySoftSeparationDistance: 28,
    allySoftSeparationPushSpeed: 90,
  },
  combat: {
    battleJiggleSpeed: 44,
    battleJiggleFrequency: 0.018,
    contactDamagePerSecond: 12,
  },
  unit: {
    bodyWidth: 24,
    bodyHeight: 14,
    healthMax: 100,
    healthRedThreshold: 0.35,
  },
  spawn: {
    unitsPerSide: 10,
    lineWidth: 10,
    spacingAcross: 28,
    spacingDepth: 32,
    red: { x: 860, y: 540, rotation: Math.PI / 2 },
    blue: { x: 1060, y: 540, rotation: -Math.PI / 2 },
  },
  runtimeTuning: {
    defaults: {
      baseUnitHealth: 500,
      healthInfluenceMultiplier: 0.5,
      unitMoveSpeed: 120,
      baseContactDps: 12,
      dpsInfluenceMultiplier: 0.5,
      influenceUpdateIntervalFrames: 6,
      influenceDecayRate: 0.999,
      influenceDecayZeroEpsilon: 2.00,
      citySourceCoreRadius: 27,
      staticUnitCapGate: 0,
      staticCityCapGate: 0,
      unitCapThreshold: 1.05,
      unitInfluenceMultiplier: 0.05,
      influenceEnemyPressureDebuffFloor: 0.05,
      influenceCoreMinInfluenceFactor: 0.13,
      influenceMaxExtraDecayAtZero: 0.4,
      fogVisionRadius: 178,
      cityVisionRadius: 240,
      lineThickness: 8,
      lineAlpha: 0.92,
      cityInfluenceUnitsEquivalent: 3,
    },
    bounds: {
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
    },
  },
} as const;
