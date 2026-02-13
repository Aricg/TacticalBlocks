import type { TerrainType, Unit } from './Unit';

type VisualUpdateCallbacks = {
  smoothRemoteUnitPositions: (deltaMs: number) => void;
  applyCombatVisualWiggle: (timeMs: number) => void;
  refreshTerrainTint: () => void;
  advancePlannedPaths: () => void;
  refreshFogOfWar: () => void;
  renderPlannedPaths: () => void;
  updateInfluenceDebugFocus: () => void;
  renderInfluence: (deltaMs: number) => void;
};

export function runVisualUpdatePipeline({
  timeMs,
  deltaMs,
  callbacks,
}: {
  timeMs: number;
  deltaMs: number;
  callbacks: VisualUpdateCallbacks;
}): void {
  callbacks.smoothRemoteUnitPositions(deltaMs);
  callbacks.applyCombatVisualWiggle(timeMs);
  runTerrainTintRefresh(callbacks);
  callbacks.advancePlannedPaths();
  runFogRefresh(callbacks);
  runPlannedPathRendering(callbacks);
  runInfluenceDebugFocusUpdate(callbacks);
  callbacks.renderInfluence(deltaMs);
}

export function refreshUnitTerrainTint({
  units,
  sampleMapColorAt,
  resolveTerrainType,
}: {
  units: readonly Unit[];
  sampleMapColorAt: (worldX: number, worldY: number) => number | null;
  resolveTerrainType: (color: number | null) => TerrainType;
}): void {
  for (const unit of units) {
    const terrainColor = sampleMapColorAt(unit.x, unit.y);
    unit.setTerrainColor(terrainColor);
    unit.setTerrainType(resolveTerrainType(terrainColor));
  }
}

function runTerrainTintRefresh(callbacks: VisualUpdateCallbacks): void {
  callbacks.refreshTerrainTint();
}

function runFogRefresh(callbacks: VisualUpdateCallbacks): void {
  callbacks.refreshFogOfWar();
}

function runPlannedPathRendering(callbacks: VisualUpdateCallbacks): void {
  callbacks.renderPlannedPaths();
}

function runInfluenceDebugFocusUpdate(callbacks: VisualUpdateCallbacks): void {
  callbacks.updateInfluenceDebugFocus();
}
