import { getGridCellElevation, getGridCellTerrainType, type TerrainType } from './terrainGrid.js';

type TerrainElevationQuantizationConfig = {
  min: number;
  max: number;
  swatchCount: number;
};

const ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE: Record<
  TerrainType,
  TerrainElevationQuantizationConfig
> = {
  water: { min: 8, max: 28, swatchCount: 2 },
  grass: { min: 104, max: 120, swatchCount: 1 },
  forest: { min: 116, max: 138, swatchCount: 2 },
  hills: { min: 152, max: 208, swatchCount: 5 },
  mountains: { min: 218, max: 248, swatchCount: 18 },
  unknown: { min: 112, max: 112, swatchCount: 1 },
};

function buildTerrainElevationLevels({
  min,
  max,
  swatchCount,
}: TerrainElevationQuantizationConfig): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || swatchCount <= 0) {
    return [112];
  }

  const levels: number[] = [];
  for (let index = 0; index < swatchCount; index += 1) {
    const ratio = swatchCount <= 1 ? 1 : 1 - index / (swatchCount - 1);
    const byteValue = Math.round(min + (max - min) * ratio);
    levels.push(Math.max(0, Math.min(255, byteValue)));
  }

  return Array.from(new Set(levels)).sort((a, b) => a - b);
}

const ELEVATION_LEVELS_BY_TERRAIN_TYPE: Record<TerrainType, number[]> = {
  water: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.water,
  ),
  grass: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.grass,
  ),
  forest: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.forest,
  ),
  hills: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.hills,
  ),
  mountains: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.mountains,
  ),
  unknown: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.unknown,
  ),
};

function quantizeElevationByteToPaletteLevel(
  elevationByte: number,
  levels: readonly number[],
): number {
  if (levels.length === 0) {
    return 0;
  }

  const clampedElevationByte = Math.max(0, Math.min(255, Math.round(elevationByte)));
  let closestLevel = levels[0];
  let closestDistance = Math.abs(clampedElevationByte - closestLevel);
  for (let index = 1; index < levels.length; index += 1) {
    const level = levels[index];
    const distance = Math.abs(clampedElevationByte - level);
    if (distance < closestDistance) {
      closestLevel = level;
      closestDistance = distance;
    }
  }

  return closestLevel;
}

export function getGridCellPaletteElevationByte(col: number, row: number): number {
  const terrainType = getGridCellTerrainType(col, row);
  const elevationByte = Math.round(getGridCellElevation(col, row) * 255);
  const elevationLevels =
    ELEVATION_LEVELS_BY_TERRAIN_TYPE[terrainType] ??
    ELEVATION_LEVELS_BY_TERRAIN_TYPE.unknown;
  return quantizeElevationByteToPaletteLevel(elevationByte, elevationLevels);
}
