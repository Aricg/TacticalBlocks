import {
  HILL_GRADE_NONE,
  getHillGradeFromElevationByte,
  normalizeHillGrade,
} from '../../shared/src/terrainSemantics.js';
import type { GridCoordinate } from './UnitCommandPlanner';
import { Team } from './Team';

export type RuntimeMapGridSidecar = {
  terrainCodeGrid: string;
  hillGradeGrid: Int8Array;
  cityZones: RuntimeMapCityZone[];
};

export type RuntimeMapCityZone = {
  homeTeam: Team | 'NEUTRAL';
  anchor: GridCoordinate;
  cellSet: Set<string>;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function getGridCellKeyFromColRow(col: number, row: number): string {
  return `${col}:${row}`;
}

export function getGridCellKey(cell: GridCoordinate): string {
  return getGridCellKeyFromColRow(cell.col, cell.row);
}

function parseRuntimeMapGridCoordinate(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): GridCoordinate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as {
    col?: unknown;
    row?: unknown;
  };
  if (
    typeof candidate.col !== 'number'
    || !Number.isFinite(candidate.col)
    || typeof candidate.row !== 'number'
    || !Number.isFinite(candidate.row)
  ) {
    return null;
  }

  return {
    col: clamp(
      Math.round(candidate.col),
      0,
      gridWidth - 1,
    ),
    row: clamp(
      Math.round(candidate.row),
      0,
      gridHeight - 1,
    ),
  };
}

function parseRuntimeMapCityZones(
  payload: unknown,
  gridWidth: number,
  gridHeight: number,
): RuntimeMapCityZone[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const parsedZones: RuntimeMapCityZone[] = [];
  for (const rawZone of payload) {
    if (!rawZone || typeof rawZone !== 'object') {
      continue;
    }

    const candidateZone = rawZone as {
      homeTeam?: unknown;
      anchor?: unknown;
      cells?: unknown;
    };
    const homeTeam =
      candidateZone.homeTeam === Team.RED
      || candidateZone.homeTeam === Team.BLUE
      || candidateZone.homeTeam === 'NEUTRAL'
        ? candidateZone.homeTeam
        : null;
    if (!homeTeam || !Array.isArray(candidateZone.cells)) {
      continue;
    }

    const cellSet = new Set<string>();
    let firstCell: GridCoordinate | null = null;
    for (const rawCell of candidateZone.cells) {
      const cell = parseRuntimeMapGridCoordinate(rawCell, gridWidth, gridHeight);
      if (!cell) {
        continue;
      }
      if (!firstCell) {
        firstCell = cell;
      }
      cellSet.add(getGridCellKey(cell));
    }
    if (cellSet.size === 0) {
      continue;
    }

    const anchor =
      parseRuntimeMapGridCoordinate(candidateZone.anchor, gridWidth, gridHeight)
      ?? firstCell;
    if (!anchor) {
      continue;
    }

    parsedZones.push({
      homeTeam,
      anchor,
      cellSet,
    });
  }

  return parsedZones;
}

export function parseRuntimeMapGridSidecarPayload(
  payload: unknown,
  options: {
    gridWidth: number;
    gridHeight: number;
  },
): RuntimeMapGridSidecar | null {
  const { gridWidth, gridHeight } = options;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    gridWidth?: unknown;
    gridHeight?: unknown;
    terrainCodeGrid?: unknown;
    hillGradeGrid?: unknown;
    elevation?: unknown;
    cityZones?: unknown;
  };
  if (
    typeof candidate.gridWidth === 'number'
    && Number.isInteger(candidate.gridWidth)
    && typeof candidate.gridHeight === 'number'
    && Number.isInteger(candidate.gridHeight)
    && (
      candidate.gridWidth !== gridWidth
      || candidate.gridHeight !== gridHeight
    )
  ) {
    console.warn(
      `[map-sidecar][grid-mismatch] Ignoring sidecar with grid ${candidate.gridWidth}x${candidate.gridHeight}; expected ${gridWidth}x${gridHeight}.`,
    );
    return null;
  }
  const expectedLength = gridWidth * gridHeight;
  if (
    typeof candidate.terrainCodeGrid !== 'string'
    || candidate.terrainCodeGrid.length !== expectedLength
  ) {
    return null;
  }

  const hillGradeGrid = new Int8Array(expectedLength);
  hillGradeGrid.fill(HILL_GRADE_NONE);
  const sourceGrid =
    Array.isArray(candidate.hillGradeGrid) && candidate.hillGradeGrid.length === expectedLength
      ? candidate.hillGradeGrid
      : Array.isArray(candidate.elevation) && candidate.elevation.length === expectedLength
        ? candidate.elevation
        : null;
  if (!sourceGrid) {
    return null;
  }

  for (let index = 0; index < expectedLength; index += 1) {
    const rawValue = sourceGrid[index];
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      return null;
    }
    const terrainCode = candidate.terrainCodeGrid.charAt(index);
    if (terrainCode !== 'h') {
      hillGradeGrid[index] = HILL_GRADE_NONE;
      continue;
    }

    // Legacy fallback: convert elevation bytes from older sidecars to hill grades.
    if (sourceGrid === candidate.elevation) {
      const normalizedElevation = clamp(
        Math.round(rawValue <= 1 ? rawValue * 255 : rawValue),
        0,
        255,
      );
      hillGradeGrid[index] = getHillGradeFromElevationByte(normalizedElevation);
      continue;
    }
    const normalizedGrade = normalizeHillGrade(rawValue);
    hillGradeGrid[index] = normalizedGrade === HILL_GRADE_NONE ? 0 : normalizedGrade;
  }

  const cityZones = parseRuntimeMapCityZones(
    candidate.cityZones,
    gridWidth,
    gridHeight,
  );

  return {
    terrainCodeGrid: candidate.terrainCodeGrid,
    hillGradeGrid,
    cityZones,
  };
}
