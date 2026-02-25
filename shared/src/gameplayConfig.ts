import {
  GRID_SIZE_PROFILE_PRESETS,
  createGridGeometry,
  resolveGridSizeProfileName,
} from './gridGeometry.js';

const MAP_IDS = [
  'tmp-debug-grass',
] as const;

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;
const UNIT_BASE_MOVE_SPEED = 40;
const ROAD_MOVEMENT_MULTIPLIER = 2.0;
const TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE = {
  water: 0.3,
  forest: 0.7,
  hills: 0.5,
  grass: 1.0,
  unknown: 1.0,
  mountains: 0,
} as const;
const TERRAIN_PATHFINDING_STEP_COST_BY_TYPE = {
  water: 1 / TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE.water,
  forest: 1 / TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE.forest,
  hills: 1 / TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE.hills,
  grass: 1 / TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE.grass,
  unknown: 1 / TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE.unknown,
  mountains: Number.POSITIVE_INFINITY,
} as const;
const PATHFINDING_ROAD_STEP_COST_MULTIPLIER = 1 / ROAD_MOVEMENT_MULTIPLIER;
const PATHFINDING_MAX_ROUTE_EXPANSIONS_PER_SEGMENT = 3500;
const IMPORT_META_ENV = (
  import.meta as ImportMeta & { env?: Record<string, unknown> }
).env;
const PROCESS_ENV = (
  globalThis as { process?: { env?: Record<string, unknown> } }
).process?.env;

export const STARTUP_GRID_SIZE_PROFILE = resolveGridSizeProfileName({
  importMetaEnv: IMPORT_META_ENV,
  processEnv: PROCESS_ENV,
  defaultProfile: 'large',
});
export const STARTUP_GRID_GEOMETRY = createGridGeometry(
  STARTUP_GRID_SIZE_PROFILE,
  MAP_WIDTH,
  MAP_HEIGHT,
);

export const GAMEPLAY_CONFIG = {
  startup: {
    gridSizeProfile: STARTUP_GRID_SIZE_PROFILE,
    gridSizePresets: GRID_SIZE_PROFILE_PRESETS,
  },
  map: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    activeMapId: 'tmp-debug-grass',
    availableMapIds: MAP_IDS,
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
    forestEnemyRevealDistanceSquares: 2,
  },
  influence: {
    // Influence-grid resolution in cells (higher = smoother line, more CPU/network cost).
    gridWidth: STARTUP_GRID_GEOMETRY.gridWidth,
    gridHeight: STARTUP_GRID_GEOMETRY.gridHeight,
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
    // Exponential damping strength for city influence under enemy unit pressure.
    cityEnemyGateAlpha: 0.02,
    // Maximum unit influence multiplier when effectively isolated from allied support.
    isolatedUnitInfluenceFloor: 0.4,
    // Allied-pressure reference used to ease isolated units from floor back to full strength.
    supportPressureReference: 0.05,
    // Never allow dominance/core floors below this absolute value.
    dominanceMinFloor: 1,
    // Guaranteed minimum core influence as a fraction of dominance strength.
    coreMinInfluenceFactor: 0.13,
    // Extra decay applied near zero magnitude (small residuals collapse faster).
    maxExtraDecayAtZero: 0.4,
    // Hard cap for signed tactical score in each cell.
    maxAbsTacticalScore: 9,
    // City source core radius used for static-source cap checks.
    citySourceCoreRadius: 27,
    // 1 enables static-unit cap gate, 0 disables it.
    staticUnitCapGate: 0,
    // 1 enables static-city cap gate, 0 disables it.
    staticCityCapGate: 0,
    // Multiplier applied to unit cap threshold checks.
    unitCapThreshold: 1.05,
    lineColor: 0x5a5a5a,
    lineAlpha: 0.58,
    lineThickness: 8,
    splineDensityMultiplier: 8,
    // Show per-cell influence dots in the client debug overlay.
    debugDotsEnabled: true,
  },
  cities: {
    backlineOffset: 140,
    influenceUnitsEquivalent: 3,
    moraleBonusInsideOwnedZone: 1,
  },
  input: {
    dragThreshold: 10,
    previewPathPointSpacing: 4,
    commandPathPointSpacing: 50,
  },
  movement: {
    // Baseline unit locomotion tuning.
    unitMoveSpeed: UNIT_BASE_MOVE_SPEED,
    unitTurnSpeedRadians: Math.PI,
    unitForwardOffsetRadians: -Math.PI / 2,
    refaceAngleThresholdRadians: (Math.PI / 180) * 3,
    waypointMoveAngleToleranceRadians: 0.35,
    minWaypointDistance: 1,
    waterTransitionPauseSeconds: 3,
    // Server-side speed multiplier for commands that disable rotate-to-face.
    rotateToFaceDisabledSpeedMultiplier: 0.5,
    allyCollisionPushSpeed: 180,
    allySoftSeparationDistance: 28,
    allySoftSeparationPushSpeed: 90,
  },
  terrain: {
    roadMovementMultiplier: ROAD_MOVEMENT_MULTIPLIER,
    movementMultiplierByType: TERRAIN_MOVEMENT_MULTIPLIER_BY_TYPE,
    pathfindingStepCostByType: TERRAIN_PATHFINDING_STEP_COST_BY_TYPE,
    pathfindingRoadStepCostMultiplier: PATHFINDING_ROAD_STEP_COST_MULTIPLIER,
    pathfindingHeuristicMinStepCost: PATHFINDING_ROAD_STEP_COST_MULTIPLIER,
    pathfindingMaxRouteExpansionsPerSegment: PATHFINDING_MAX_ROUTE_EXPANSIONS_PER_SEGMENT,
    moraleBonusByType: {
      water: -5,
      forest: 0,
      hills: 0,
      grass: 0,
      unknown: 0,
      mountains: 0,
    },
  },
  combat: {
    battleJiggleSpeed: 44,
    battleJiggleFrequency: 0.018,
    contactDamagePerSecond: 12,
  },
  supply: {
    enemyInfluenceSeverThreshold: 0.0001,
    blockedSourceRetryIntervalSeconds: 3,
  },
  unit: {
    baseSpeed: UNIT_BASE_MOVE_SPEED,
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
      // Slider: Base Unit Health
      baseUnitHealth: 100,
      // Slider: Health Influence Bonus
      healthInfluenceMultiplier: 0.5,
      // Slider: Unit Speed
      unitMoveSpeed: UNIT_BASE_MOVE_SPEED,
      // Slider: Base Contact DPS
      baseContactDps: 10,
      // Slider: DPS Influence Bonus
      dpsInfluenceMultiplier: 2.0,
      // Slider: Update Interval (frames)
      influenceUpdateIntervalFrames: 6,
      // Slider: Decay Rate
      influenceDecayRate: 0.999,
      // Slider: Decay Zero Epsilon
      influenceDecayZeroEpsilon: 2.00,
      // Slider: City Source Radius
      citySourceCoreRadius: 27,
      // Slider: Static Unit Cap Gate
      staticUnitCapGate: 0,
      // Slider: Static City Cap Gate
      staticCityCapGate: 0,
      // Slider: Unit Cap Threshold
      unitCapThreshold: 1.05,
      // Slider: Unit Influence Power
      unitInfluenceMultiplier: 0.0125,
      // Slider: City Enemy Gate
      cityEnemyGateAlpha: 0.02,
      // Slider: Isolated Unit Floor
      isolatedUnitInfluenceFloor: 0.4,
      // Slider: Support Pressure Ref
      supportPressureReference: 0.05,
      // Slider: Enemy Pressure Floor
      influenceEnemyPressureDebuffFloor: 0.5,
      // Slider: Core Min Influence
      influenceCoreMinInfluenceFactor: 0.13,
      // Slider: Extra Decay @ Zero
      influenceMaxExtraDecayAtZero: 0.99,
      // Slider: A-Key contested influence threshold
      influenceContestedThreshold: 0,
      // Slider: Vision Radius
      fogVisionRadius: 178,
      // Slider: City Vision Radius
      cityVisionRadius: 240,
      // Slider: Line Thickness
      lineThickness: 8,
      // Slider: Line Alpha
      lineAlpha: 0.58,
      // Slider: City Influence Power
      cityInfluenceUnitsEquivalent: 1.0,
      // Slider: City Unit Generation (seconds)
      cityUnitGenerationIntervalSeconds: 60,
    },
    bounds: {
      baseUnitHealth: { min: 20, max: 200, step: 1 },
      healthInfluenceMultiplier: { min: 0, max: 1, step: 0.01 },
      unitMoveSpeed: { min: 20, max: 300, step: 1 },
      baseContactDps: { min: 1, max: 24, step: 0.1 },
      dpsInfluenceMultiplier: { min: 1, max: 3, step: 0.01 },
      influenceUpdateIntervalFrames: { min: 1, max: 20, step: 1 },
      influenceDecayRate: { min: 0.7, max: 0.999, step: 0.001 },
      influenceDecayZeroEpsilon: { min: 0, max: 2, step: 0.01 },
      citySourceCoreRadius: { min: 0, max: 50, step: 1 },
      staticUnitCapGate: { min: 0, max: 1, step: 1 },
      staticCityCapGate: { min: 0, max: 1, step: 1 },
      unitCapThreshold: { min: 0.1, max: 2, step: 0.05 },
      unitInfluenceMultiplier: { min: 0, max: 0.1, step: 0.0025 },
      cityEnemyGateAlpha: { min: 0, max: 0.2, step: 0.002 },
      isolatedUnitInfluenceFloor: { min: 0, max: 1, step: 0.01 },
      supportPressureReference: { min: 0.001, max: 1, step: 0.005 },
      influenceEnemyPressureDebuffFloor: { min: 0, max: 1, step: 0.01 },
      influenceCoreMinInfluenceFactor: { min: 0, max: 1, step: 0.01 },
      influenceMaxExtraDecayAtZero: { min: 0, max: 0.9, step: 0.01 },
      influenceContestedThreshold: { min: -3, max: 3, step: 0.05 },
      fogVisionRadius: { min: 40, max: 600, step: 1 },
      cityVisionRadius: { min: 40, max: 600, step: 1 },
      lineThickness: { min: 1, max: 24, step: 1 },
      lineAlpha: { min: 0.05, max: 1, step: 0.01 },
      cityInfluenceUnitsEquivalent: { min: 0, max: 40, step: 0.5 },
      cityUnitGenerationIntervalSeconds: { min: 20, max: 180, step: 1 },
    },
  },
} as const;
