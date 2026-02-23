import { getGridCellHillGrade, getGridCellTerrainType } from './terrainGrid.js';
import { getTerrainPaletteElevationByte } from './terrainSemantics.js';

export function getGridCellPaletteElevationByte(col: number, row: number): number {
  const terrainType = getGridCellTerrainType(col, row);
  const hillGrade = getGridCellHillGrade(col, row);
  return getTerrainPaletteElevationByte(terrainType, hillGrade);
}
