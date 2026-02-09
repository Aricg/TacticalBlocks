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
    fogAlpha: 0.82,
    fogDepth: 925,
    visionRadius: 240,
    enemyVisibilityPadding: 24,
  },
  input: {
    dragThreshold: 10,
    previewPathPointSpacing: 4,
    commandPathPointSpacing: 50,
  },
  movement: {
    engagementMagnetDistance: 80,
    engagementHoldDistance: 120,
    magnetismSpeed: 14,
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
    red: { x: 220, y: 300, rotation: 0 },
    blue: { x: 580, y: 300, rotation: Math.PI },
  },
} as const;
