import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  MapBundle,
  MapBundleCoordinate,
} from "../../../../shared/src/mapBundle.js";
import type { MapGenerationMethod } from "../../../../shared/src/networkContracts.js";

type LoadMapBundleArgs = {
  mapId: string;
  revision: number;
  sharedDir: string | null;
  gridWidth: number;
  gridHeight: number;
  defaultCityAnchors: MapBundle["cityAnchors"];
  defaultNeutralCityAnchors: MapBundleCoordinate[];
  waterElevationMax: number;
  mountainElevationMin: number;
  logWarning?: (warning: MapBundleLoadWarning) => void;
};

export type MapBundleLoadWarningCode =
  | "shared-dir-unresolved"
  | "sidecar-parse-failed"
  | "sidecar-grid-mismatch"
  | "sidecar-data-invalid";

export type MapBundleLoadWarning = {
  code: MapBundleLoadWarningCode;
  message: string;
  error?: unknown;
};

type RuntimeMapSidecar = {
  method?: unknown;
  seed?: unknown;
  gridWidth?: unknown;
  gridHeight?: unknown;
  elevation?: unknown;
  terrainCodeGrid?: unknown;
  cityAnchors?: unknown;
  neutralCityAnchors?: unknown;
};

const ELEVATION_GRID_SUFFIX = ".elevation-grid.json";

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function isValidGridCoordinate(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): value is MapBundleCoordinate {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { col?: unknown; row?: unknown };
  return (
    typeof candidate.col === "number" &&
    Number.isInteger(candidate.col) &&
    candidate.col >= 0 &&
    candidate.col < gridWidth &&
    typeof candidate.row === "number" &&
    Number.isInteger(candidate.row) &&
    candidate.row >= 0 &&
    candidate.row < gridHeight
  );
}

function parseCityAnchors(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundle["cityAnchors"] | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as { RED?: unknown; BLUE?: unknown };
  if (
    !isValidGridCoordinate(candidate.RED, gridWidth, gridHeight) ||
    !isValidGridCoordinate(candidate.BLUE, gridWidth, gridHeight)
  ) {
    return null;
  }
  return {
    RED: { ...candidate.RED },
    BLUE: { ...candidate.BLUE },
  };
}

function parseNeutralCityAnchors(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundleCoordinate[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed: MapBundleCoordinate[] = [];
  for (const entry of value) {
    if (!isValidGridCoordinate(entry, gridWidth, gridHeight)) {
      continue;
    }
    parsed.push({ ...entry });
  }
  return parsed;
}

function getGridCellIndex(col: number, row: number, gridWidth: number): number {
  return row * gridWidth + col;
}

function isPlayableTerrainCode(terrainCode: string): boolean {
  return terrainCode !== "w" && terrainCode !== "m";
}

function findNearestPlayableTerrainCell(
  terrainCodeGrid: string,
  targetCol: number,
  targetRow: number,
  gridWidth: number,
  gridHeight: number,
): MapBundleCoordinate {
  const clampedTarget: MapBundleCoordinate = {
    col: clamp(targetCol, 0, gridWidth - 1),
    row: clamp(targetRow, 0, gridHeight - 1),
  };
  const maxRadius = Math.max(gridWidth, gridHeight);
  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        if (
          Math.abs(colOffset) !== radius &&
          Math.abs(rowOffset) !== radius
        ) {
          continue;
        }
        const candidate: MapBundleCoordinate = {
          col: clamp(clampedTarget.col + colOffset, 0, gridWidth - 1),
          row: clamp(clampedTarget.row + rowOffset, 0, gridHeight - 1),
        };
        const terrainCode = terrainCodeGrid.charAt(
          getGridCellIndex(candidate.col, candidate.row, gridWidth),
        );
        if (isPlayableTerrainCode(terrainCode)) {
          return candidate;
        }
      }
    }
  }
  return clampedTarget;
}

function deriveCityAnchorsFromTerrainCodeGrid(
  terrainCodeGrid: string,
  gridWidth: number,
  gridHeight: number,
): {
  cityAnchors: MapBundle["cityAnchors"];
  neutralCityAnchors: MapBundleCoordinate[];
} {
  return {
    cityAnchors: {
      RED: findNearestPlayableTerrainCell(
        terrainCodeGrid,
        Math.round(gridWidth * 0.16),
        Math.round(gridHeight * 0.5),
        gridWidth,
        gridHeight,
      ),
      BLUE: findNearestPlayableTerrainCell(
        terrainCodeGrid,
        Math.round(gridWidth * 0.84),
        Math.round(gridHeight * 0.5),
        gridWidth,
        gridHeight,
      ),
    },
    neutralCityAnchors: [
      findNearestPlayableTerrainCell(
        terrainCodeGrid,
        Math.round(gridWidth * 0.5),
        Math.round(gridHeight * 0.3),
        gridWidth,
        gridHeight,
      ),
      findNearestPlayableTerrainCell(
        terrainCodeGrid,
        Math.round(gridWidth * 0.5),
        Math.round(gridHeight * 0.7),
        gridWidth,
        gridHeight,
      ),
    ],
  };
}

function parseMethod(value: unknown): MapGenerationMethod | "unknown" {
  if (value === "noise" || value === "wfc" || value === "auto") {
    return value;
  }
  return "unknown";
}

function parseElevationBytes(
  value: unknown,
  expectedLength: number,
): Uint8Array | null {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }
  const bytes = new Uint8Array(expectedLength);
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return null;
    }
    bytes[index] = clamp(Math.round(entry), 0, 255);
  }
  return bytes;
}

function cloneCityAnchors(
  cityAnchors: MapBundle["cityAnchors"],
): MapBundle["cityAnchors"] {
  return {
    RED: { ...cityAnchors.RED },
    BLUE: { ...cityAnchors.BLUE },
  };
}

function cloneNeutralCityAnchors(
  neutralCityAnchors: MapBundleCoordinate[],
): MapBundleCoordinate[] {
  return neutralCityAnchors.map((anchor) => ({ ...anchor }));
}

function createFallbackMapBundle(args: LoadMapBundleArgs): MapBundle {
  return {
    mapId: args.mapId,
    revision: args.revision,
    method: "unknown",
    seed: null,
    gridWidth: args.gridWidth,
    gridHeight: args.gridHeight,
    terrainCodeGrid: null,
    elevationBytes: null,
    cityAnchors: cloneCityAnchors(args.defaultCityAnchors),
    neutralCityAnchors: cloneNeutralCityAnchors(args.defaultNeutralCityAnchors),
    blockedSpawnCellIndexSet: new Set<number>(),
    impassableCellIndexSet: new Set<number>(),
    source: "static-fallback",
  };
}

export function loadMapBundle(args: LoadMapBundleArgs): MapBundle {
  const fallbackBundle = createFallbackMapBundle(args);
  if (!args.sharedDir) {
    args.logWarning?.({
      code: "shared-dir-unresolved",
      message:
        "Shared directory could not be resolved. Using static fallback map bundle.",
    });
    return fallbackBundle;
  }

  const sidecarPath = path.join(
    args.sharedDir,
    `${args.mapId}${ELEVATION_GRID_SUFFIX}`,
  );
  if (!existsSync(sidecarPath)) {
    return fallbackBundle;
  }

  let parsed: RuntimeMapSidecar;
  try {
    parsed = JSON.parse(readFileSync(sidecarPath, "utf8")) as RuntimeMapSidecar;
  } catch (error) {
    args.logWarning?.({
      code: "sidecar-parse-failed",
      message: `Failed to parse runtime map sidecar: ${sidecarPath}`,
      error,
    });
    return fallbackBundle;
  }

  const fileGridWidth =
    typeof parsed.gridWidth === "number" ? parsed.gridWidth : NaN;
  const fileGridHeight =
    typeof parsed.gridHeight === "number" ? parsed.gridHeight : NaN;
  if (
    !Number.isFinite(fileGridWidth) ||
    !Number.isFinite(fileGridHeight) ||
    fileGridWidth !== args.gridWidth ||
    fileGridHeight !== args.gridHeight
  ) {
    args.logWarning?.({
      code: "sidecar-grid-mismatch",
      message: `Ignoring runtime map sidecar with mismatched grid size: ${sidecarPath}`,
    });
    return fallbackBundle;
  }

  const expectedLength = args.gridWidth * args.gridHeight;
  const terrainCodeGrid =
    typeof parsed.terrainCodeGrid === "string" &&
    parsed.terrainCodeGrid.length === expectedLength
      ? parsed.terrainCodeGrid
      : null;
  const elevationBytes = parseElevationBytes(parsed.elevation, expectedLength);
  if (!terrainCodeGrid && !elevationBytes) {
    args.logWarning?.({
      code: "sidecar-data-invalid",
      message: `Ignoring runtime map sidecar without valid terrain/elevation data: ${sidecarPath}`,
    });
    return fallbackBundle;
  }

  const blockedSpawnCellIndexSet = new Set<number>();
  const impassableCellIndexSet = new Set<number>();
  if (terrainCodeGrid) {
    for (let index = 0; index < terrainCodeGrid.length; index += 1) {
      const terrainCode = terrainCodeGrid.charAt(index);
      if (terrainCode === "m") {
        impassableCellIndexSet.add(index);
        blockedSpawnCellIndexSet.add(index);
      } else if (terrainCode === "w") {
        blockedSpawnCellIndexSet.add(index);
      }
    }
  } else if (elevationBytes) {
    for (let index = 0; index < elevationBytes.length; index += 1) {
      const byte = elevationBytes[index];
      if (byte >= args.mountainElevationMin) {
        impassableCellIndexSet.add(index);
        blockedSpawnCellIndexSet.add(index);
      } else if (byte <= args.waterElevationMax) {
        blockedSpawnCellIndexSet.add(index);
      }
    }
  }

  const parsedCityAnchors = parseCityAnchors(
    parsed.cityAnchors,
    args.gridWidth,
    args.gridHeight,
  );
  const parsedNeutralCityAnchors = parseNeutralCityAnchors(
    parsed.neutralCityAnchors,
    args.gridWidth,
    args.gridHeight,
  );
  const derivedAnchors = terrainCodeGrid
    ? deriveCityAnchorsFromTerrainCodeGrid(
        terrainCodeGrid,
        args.gridWidth,
        args.gridHeight,
      )
    : null;

  const cityAnchors =
    parsedCityAnchors ??
    derivedAnchors?.cityAnchors ??
    cloneCityAnchors(args.defaultCityAnchors);
  const neutralCityAnchors =
    parsedNeutralCityAnchors ??
    derivedAnchors?.neutralCityAnchors ??
    cloneNeutralCityAnchors(args.defaultNeutralCityAnchors);

  return {
    mapId: args.mapId,
    revision: args.revision,
    method: parseMethod(parsed.method),
    seed: typeof parsed.seed === "string" ? parsed.seed : null,
    gridWidth: args.gridWidth,
    gridHeight: args.gridHeight,
    terrainCodeGrid,
    elevationBytes,
    cityAnchors,
    neutralCityAnchors,
    blockedSpawnCellIndexSet,
    impassableCellIndexSet,
    source: "runtime-sidecar",
  };
}
