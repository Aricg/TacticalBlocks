import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  MapBundle,
  MapBundleCoordinate,
} from "../../../../shared/src/mapBundle.js";
import type { MapGenerationMethod, PlayerTeam } from "../../../../shared/src/networkContracts.js";
import {
  getGridCellHillGrade,
  getGridCellTerrainType,
  type TerrainType,
} from "../../../../shared/src/terrainGrid.js";
import {
  HILL_GRADE_NONE,
  getHillGradeFromElevationByte,
  getTerrainCodeFromType,
  normalizeHillGrade,
} from "../../../../shared/src/terrainSemantics.js";

type LoadMapBundleArgs = {
  mapId: string;
  revision: number;
  sharedDir: string | null;
  gridWidth: number;
  gridHeight: number;
  defaultCityAnchors: MapBundle["cityAnchors"];
  defaultNeutralCityAnchors: MapBundleCoordinate[];
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
  hillGradeGrid?: unknown;
  terrainCodeGrid?: unknown;
  cityAnchors?: unknown;
  neutralCityAnchors?: unknown;
  cityZones?: unknown;
  roadCells?: unknown;
  farmZones?: unknown;
  farmToCityLinks?: unknown;
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

function isValidCityHomeTeam(value: unknown): value is PlayerTeam | "NEUTRAL" {
  return value === "RED" || value === "BLUE" || value === "NEUTRAL";
}

function toCellKey(cell: MapBundleCoordinate): string {
  return `${cell.col},${cell.row}`;
}

function cloneCoordinate(cell: MapBundleCoordinate): MapBundleCoordinate {
  return {
    col: cell.col,
    row: cell.row,
  };
}

function parseCoordinateArray(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundleCoordinate[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: MapBundleCoordinate[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isValidGridCoordinate(entry, gridWidth, gridHeight)) {
      continue;
    }

    const key = toCellKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parsed.push(cloneCoordinate(entry));
  }
  return parsed;
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
    RED: cloneCoordinate(candidate.RED),
    BLUE: cloneCoordinate(candidate.BLUE),
  };
}

function parseNeutralCityAnchors(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundleCoordinate[] | null {
  return parseCoordinateArray(value, gridWidth, gridHeight);
}

function parseCityZones(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundle["cityZones"] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: MapBundle["cityZones"] = [];
  const seenZoneIds = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const candidate = entry as {
      cityZoneId?: unknown;
      homeTeam?: unknown;
      anchor?: unknown;
      cells?: unknown;
    };
    if (typeof candidate.cityZoneId !== "string" || candidate.cityZoneId.length === 0) {
      continue;
    }
    if (seenZoneIds.has(candidate.cityZoneId)) {
      continue;
    }
    if (!isValidCityHomeTeam(candidate.homeTeam)) {
      continue;
    }
    if (!isValidGridCoordinate(candidate.anchor, gridWidth, gridHeight)) {
      continue;
    }

    const parsedCells = parseCoordinateArray(candidate.cells, gridWidth, gridHeight) ?? [];
    if (parsedCells.length === 0) {
      continue;
    }

    const anchor = cloneCoordinate(candidate.anchor);
    const cellByKey = new Map<string, MapBundleCoordinate>();
    for (const cell of parsedCells) {
      cellByKey.set(toCellKey(cell), cloneCoordinate(cell));
    }
    cellByKey.set(toCellKey(anchor), anchor);

    parsed.push({
      cityZoneId: candidate.cityZoneId,
      homeTeam: candidate.homeTeam,
      anchor,
      cells: Array.from(cellByKey.values()),
    });
    seenZoneIds.add(candidate.cityZoneId);
  }

  return parsed;
}

function parseRoadCells(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundleCoordinate[] | null {
  return parseCoordinateArray(value, gridWidth, gridHeight);
}

function parseFarmZones(
  value: unknown,
  gridWidth: number,
  gridHeight: number,
): MapBundle["farmZones"] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: MapBundle["farmZones"] = [];
  const seenZoneIds = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const candidate = entry as {
      farmZoneId?: unknown;
      anchor?: unknown;
      cells?: unknown;
    };
    if (typeof candidate.farmZoneId !== "string" || candidate.farmZoneId.length === 0) {
      continue;
    }
    if (seenZoneIds.has(candidate.farmZoneId)) {
      continue;
    }
    if (!isValidGridCoordinate(candidate.anchor, gridWidth, gridHeight)) {
      continue;
    }

    const parsedCells = parseCoordinateArray(candidate.cells, gridWidth, gridHeight) ?? [];
    if (parsedCells.length === 0) {
      continue;
    }

    const anchor = cloneCoordinate(candidate.anchor);
    const cellByKey = new Map<string, MapBundleCoordinate>();
    for (const cell of parsedCells) {
      cellByKey.set(toCellKey(cell), cloneCoordinate(cell));
    }
    cellByKey.set(toCellKey(anchor), anchor);

    parsed.push({
      farmZoneId: candidate.farmZoneId,
      anchor,
      cells: Array.from(cellByKey.values()),
    });
    seenZoneIds.add(candidate.farmZoneId);
  }

  return parsed;
}

function parseFarmToCityLinks(value: unknown): MapBundle["farmToCityLinks"] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: MapBundle["farmToCityLinks"] = [];
  const seenLinks = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const candidate = entry as {
      farmZoneId?: unknown;
      cityZoneId?: unknown;
    };
    if (
      typeof candidate.farmZoneId !== "string" ||
      candidate.farmZoneId.length === 0 ||
      typeof candidate.cityZoneId !== "string" ||
      candidate.cityZoneId.length === 0
    ) {
      continue;
    }

    const key = `${candidate.farmZoneId}->${candidate.cityZoneId}`;
    if (seenLinks.has(key)) {
      continue;
    }
    seenLinks.add(key);
    parsed.push({
      farmZoneId: candidate.farmZoneId,
      cityZoneId: candidate.cityZoneId,
    });
  }

  return parsed;
}

function cloneCityAnchors(
  cityAnchors: MapBundle["cityAnchors"],
): MapBundle["cityAnchors"] {
  return {
    RED: cloneCoordinate(cityAnchors.RED),
    BLUE: cloneCoordinate(cityAnchors.BLUE),
  };
}

function cloneNeutralCityAnchors(
  neutralCityAnchors: MapBundleCoordinate[],
): MapBundleCoordinate[] {
  return neutralCityAnchors.map((anchor) => cloneCoordinate(anchor));
}

function cloneCityZones(cityZones: MapBundle["cityZones"]): MapBundle["cityZones"] {
  return cityZones.map((zone) => ({
    cityZoneId: zone.cityZoneId,
    homeTeam: zone.homeTeam,
    anchor: cloneCoordinate(zone.anchor),
    cells: zone.cells.map((cell) => cloneCoordinate(cell)),
  }));
}

function cloneRoadCells(cells: MapBundleCoordinate[]): MapBundleCoordinate[] {
  return cells.map((cell) => cloneCoordinate(cell));
}

function cloneFarmZones(farmZones: MapBundle["farmZones"]): MapBundle["farmZones"] {
  return farmZones.map((zone) => ({
    farmZoneId: zone.farmZoneId,
    anchor: cloneCoordinate(zone.anchor),
    cells: zone.cells.map((cell) => cloneCoordinate(cell)),
  }));
}

function cloneFarmToCityLinks(
  links: MapBundle["farmToCityLinks"],
): MapBundle["farmToCityLinks"] {
  return links.map((link) => ({
    farmZoneId: link.farmZoneId,
    cityZoneId: link.cityZoneId,
  }));
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

function deriveCityAnchorsFromCityZones(
  cityZones: MapBundle["cityZones"],
): MapBundle["cityAnchors"] | null {
  let redAnchor: MapBundleCoordinate | null = null;
  let blueAnchor: MapBundleCoordinate | null = null;

  for (const zone of cityZones) {
    if (zone.homeTeam === "RED" && !redAnchor) {
      redAnchor = cloneCoordinate(zone.anchor);
      continue;
    }
    if (zone.homeTeam === "BLUE" && !blueAnchor) {
      blueAnchor = cloneCoordinate(zone.anchor);
    }
  }

  if (!redAnchor || !blueAnchor) {
    return null;
  }

  return {
    RED: redAnchor,
    BLUE: blueAnchor,
  };
}

function deriveNeutralAnchorsFromCityZones(
  cityZones: MapBundle["cityZones"],
): MapBundleCoordinate[] {
  return cityZones
    .filter((zone) => zone.homeTeam === "NEUTRAL")
    .map((zone) => cloneCoordinate(zone.anchor));
}

function buildSingleCellCityZones(
  cityAnchors: MapBundle["cityAnchors"],
  neutralCityAnchors: MapBundleCoordinate[],
): MapBundle["cityZones"] {
  const cityZones: MapBundle["cityZones"] = [
    {
      cityZoneId: "home-red",
      homeTeam: "RED",
      anchor: cloneCoordinate(cityAnchors.RED),
      cells: [cloneCoordinate(cityAnchors.RED)],
    },
    {
      cityZoneId: "home-blue",
      homeTeam: "BLUE",
      anchor: cloneCoordinate(cityAnchors.BLUE),
      cells: [cloneCoordinate(cityAnchors.BLUE)],
    },
  ];

  for (let index = 0; index < neutralCityAnchors.length; index += 1) {
    const anchor = cloneCoordinate(neutralCityAnchors[index]);
    cityZones.push({
      cityZoneId: `neutral-${index}`,
      homeTeam: "NEUTRAL",
      anchor,
      cells: [cloneCoordinate(anchor)],
    });
  }

  return cityZones;
}

function resolveHomeCityZone(
  parsedCityZones: MapBundle["cityZones"],
  homeTeam: PlayerTeam,
  anchor: MapBundleCoordinate,
  fallbackZoneId: string,
): MapBundle["cityZones"][number] {
  for (const zone of parsedCityZones) {
    if (zone.homeTeam !== homeTeam) {
      continue;
    }

    if (zone.anchor.col === anchor.col && zone.anchor.row === anchor.row) {
      return {
        cityZoneId: zone.cityZoneId,
        homeTeam: zone.homeTeam,
        anchor: cloneCoordinate(zone.anchor),
        cells: zone.cells.map((cell) => cloneCoordinate(cell)),
      };
    }
  }

  for (const zone of parsedCityZones) {
    if (zone.homeTeam !== homeTeam) {
      continue;
    }

    return {
      cityZoneId: zone.cityZoneId,
      homeTeam: zone.homeTeam,
      anchor: cloneCoordinate(zone.anchor),
      cells: zone.cells.map((cell) => cloneCoordinate(cell)),
    };
  }

  return {
    cityZoneId: fallbackZoneId,
    homeTeam,
    anchor: cloneCoordinate(anchor),
    cells: [cloneCoordinate(anchor)],
  };
}

function resolveNeutralCityZoneForAnchor(
  parsedCityZones: MapBundle["cityZones"],
  usedZoneIds: Set<string>,
  anchor: MapBundleCoordinate,
  fallbackZoneId: string,
): MapBundle["cityZones"][number] {
  for (const zone of parsedCityZones) {
    if (zone.homeTeam !== "NEUTRAL" || usedZoneIds.has(zone.cityZoneId)) {
      continue;
    }

    if (zone.anchor.col === anchor.col && zone.anchor.row === anchor.row) {
      usedZoneIds.add(zone.cityZoneId);
      return {
        cityZoneId: zone.cityZoneId,
        homeTeam: zone.homeTeam,
        anchor: cloneCoordinate(zone.anchor),
        cells: zone.cells.map((cell) => cloneCoordinate(cell)),
      };
    }
  }

  for (const zone of parsedCityZones) {
    if (zone.homeTeam !== "NEUTRAL" || usedZoneIds.has(zone.cityZoneId)) {
      continue;
    }

    usedZoneIds.add(zone.cityZoneId);
    return {
      cityZoneId: zone.cityZoneId,
      homeTeam: zone.homeTeam,
      anchor: cloneCoordinate(zone.anchor),
      cells: zone.cells.map((cell) => cloneCoordinate(cell)),
    };
  }

  return {
    cityZoneId: fallbackZoneId,
    homeTeam: "NEUTRAL",
    anchor: cloneCoordinate(anchor),
    cells: [cloneCoordinate(anchor)],
  };
}

function resolveCityZones(
  parsedCityZones: MapBundle["cityZones"] | null,
  cityAnchors: MapBundle["cityAnchors"],
  neutralCityAnchors: MapBundleCoordinate[],
): MapBundle["cityZones"] {
  if (!parsedCityZones || parsedCityZones.length === 0) {
    return buildSingleCellCityZones(cityAnchors, neutralCityAnchors);
  }

  const resolvedCityZones: MapBundle["cityZones"] = [];
  resolvedCityZones.push(
    resolveHomeCityZone(parsedCityZones, "RED", cityAnchors.RED, "home-red"),
  );
  resolvedCityZones.push(
    resolveHomeCityZone(parsedCityZones, "BLUE", cityAnchors.BLUE, "home-blue"),
  );

  const usedNeutralZoneIds = new Set<string>();
  for (let index = 0; index < neutralCityAnchors.length; index += 1) {
    resolvedCityZones.push(
      resolveNeutralCityZoneForAnchor(
        parsedCityZones,
        usedNeutralZoneIds,
        neutralCityAnchors[index],
        `neutral-${index}`,
      ),
    );
  }

  return resolvedCityZones;
}

function normalizeFarmToCityLinks(
  links: MapBundle["farmToCityLinks"] | null,
  farmZones: MapBundle["farmZones"],
  cityZones: MapBundle["cityZones"],
): MapBundle["farmToCityLinks"] {
  if (!links || links.length === 0) {
    return [];
  }

  const farmZoneIds = new Set(farmZones.map((zone) => zone.farmZoneId));
  const cityZoneIds = new Set(cityZones.map((zone) => zone.cityZoneId));
  const normalized: MapBundle["farmToCityLinks"] = [];
  const seenLinks = new Set<string>();
  for (const link of links) {
    if (!farmZoneIds.has(link.farmZoneId) || !cityZoneIds.has(link.cityZoneId)) {
      continue;
    }

    const key = `${link.farmZoneId}->${link.cityZoneId}`;
    if (seenLinks.has(key)) {
      continue;
    }
    seenLinks.add(key);
    normalized.push({
      farmZoneId: link.farmZoneId,
      cityZoneId: link.cityZoneId,
    });
  }

  return normalized;
}

function parseMethod(value: unknown): MapGenerationMethod | "unknown" {
  if (value === "noise" || value === "wfc" || value === "auto") {
    return value;
  }
  return "unknown";
}

function parseHillGradeGrid(
  value: unknown,
  expectedLength: number,
): Int8Array | null {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }
  const grades = new Int8Array(expectedLength);
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return null;
    }
    const normalizedValue = Math.round(entry);
    grades[index] =
      normalizedValue < HILL_GRADE_NONE
        ? HILL_GRADE_NONE
        : clamp(normalizedValue, HILL_GRADE_NONE, 127);
  }
  return grades;
}

function parseLegacyElevationBytes(
  value: unknown,
  expectedLength: number,
): Uint8Array | null {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }
  const normalizedRange = value.every(
    (entry) =>
      typeof entry === "number" &&
      Number.isFinite(entry) &&
      entry >= 0 &&
      entry <= 1,
  );
  const bytes = new Uint8Array(expectedLength);
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return null;
    }
    const normalizedValue = normalizedRange ? entry * 255 : entry;
    bytes[index] = clamp(Math.round(normalizedValue), 0, 255);
  }
  return bytes;
}

function deriveHillGradeGridFromTerrainAndElevation(
  terrainCodeGrid: string,
  elevationBytes: Uint8Array,
): Int8Array {
  const hillGradeGrid = new Int8Array(terrainCodeGrid.length);
  hillGradeGrid.fill(HILL_GRADE_NONE);
  for (let index = 0; index < terrainCodeGrid.length; index += 1) {
    if (terrainCodeGrid.charAt(index) !== "h") {
      continue;
    }
    hillGradeGrid[index] = getHillGradeFromElevationByte(elevationBytes[index] ?? 0);
  }
  return hillGradeGrid;
}

function coupleHillGradeGridToTerrain(
  terrainCodeGrid: string,
  hillGradeGrid: Int8Array,
): Int8Array {
  const coupled = new Int8Array(hillGradeGrid.length);
  coupled.fill(HILL_GRADE_NONE);
  for (let index = 0; index < hillGradeGrid.length; index += 1) {
    if (terrainCodeGrid.charAt(index) !== "h") {
      continue;
    }
    const normalized = normalizeHillGrade(hillGradeGrid[index] ?? HILL_GRADE_NONE);
    coupled[index] = normalized === HILL_GRADE_NONE ? 0 : normalized;
  }
  return coupled;
}

function terrainTypeToCode(terrainType: TerrainType): string {
  return getTerrainCodeFromType(terrainType);
}

function buildStaticMapGridArtifacts(args: LoadMapBundleArgs): {
  terrainCodeGrid: string;
  hillGradeGrid: Int8Array;
  blockedSpawnCellIndexSet: Set<number>;
  impassableCellIndexSet: Set<number>;
} {
  const expectedLength = args.gridWidth * args.gridHeight;
  const terrainCodes = new Array<string>(expectedLength);
  const hillGradeGrid = new Int8Array(expectedLength);
  hillGradeGrid.fill(HILL_GRADE_NONE);
  const blockedSpawnCellIndexSet = new Set<number>();
  const impassableCellIndexSet = new Set<number>();

  for (let row = 0; row < args.gridHeight; row += 1) {
    for (let col = 0; col < args.gridWidth; col += 1) {
      const index = getGridCellIndex(col, row, args.gridWidth);
      const terrainType = getGridCellTerrainType(col, row);
      const terrainCode = terrainTypeToCode(terrainType);
      terrainCodes[index] = terrainCode;
      if (terrainCode === "h") {
        hillGradeGrid[index] = getGridCellHillGrade(col, row);
      }
      if (terrainCode === "m") {
        blockedSpawnCellIndexSet.add(index);
        impassableCellIndexSet.add(index);
      } else if (terrainCode === "w") {
        blockedSpawnCellIndexSet.add(index);
      }
    }
  }

  return {
    terrainCodeGrid: terrainCodes.join(""),
    hillGradeGrid,
    blockedSpawnCellIndexSet,
    impassableCellIndexSet,
  };
}

function createFallbackMapBundle(args: LoadMapBundleArgs): MapBundle {
  const {
    terrainCodeGrid,
    hillGradeGrid,
    blockedSpawnCellIndexSet,
    impassableCellIndexSet,
  } = buildStaticMapGridArtifacts(args);
  const cityAnchors = cloneCityAnchors(args.defaultCityAnchors);
  const neutralCityAnchors = cloneNeutralCityAnchors(args.defaultNeutralCityAnchors);
  return {
    mapId: args.mapId,
    revision: args.revision,
    method: "unknown",
    seed: null,
    gridWidth: args.gridWidth,
    gridHeight: args.gridHeight,
    terrainCodeGrid,
    hillGradeGrid,
    cityAnchors,
    neutralCityAnchors,
    cityZones: buildSingleCellCityZones(cityAnchors, neutralCityAnchors),
    roadCells: [],
    farmZones: [],
    farmToCityLinks: [],
    blockedSpawnCellIndexSet,
    impassableCellIndexSet,
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
    const reportedGridWidth = Number.isFinite(fileGridWidth)
      ? `${fileGridWidth}`
      : "unknown";
    const reportedGridHeight = Number.isFinite(fileGridHeight)
      ? `${fileGridHeight}`
      : "unknown";
    args.logWarning?.({
      code: "sidecar-grid-mismatch",
      message: `Ignoring runtime map sidecar with mismatched grid size at ${sidecarPath}. Expected ${args.gridWidth}x${args.gridHeight}, received ${reportedGridWidth}x${reportedGridHeight}.`,
    });
    return fallbackBundle;
  }

  const expectedLength = args.gridWidth * args.gridHeight;
  const terrainCodeGrid =
    typeof parsed.terrainCodeGrid === "string" &&
    parsed.terrainCodeGrid.length === expectedLength
      ? parsed.terrainCodeGrid
      : null;
  const parsedHillGradeGrid = parseHillGradeGrid(
    parsed.hillGradeGrid,
    expectedLength,
  );
  const legacyElevationBytes = parseLegacyElevationBytes(
    parsed.elevation,
    expectedLength,
  );
  const hillGradeGrid =
    parsedHillGradeGrid ??
    (terrainCodeGrid && legacyElevationBytes
      ? deriveHillGradeGridFromTerrainAndElevation(
          terrainCodeGrid,
          legacyElevationBytes,
        )
      : null);
  if (!terrainCodeGrid || !hillGradeGrid) {
    const missingFields: string[] = [];
    if (!terrainCodeGrid) {
      missingFields.push("terrainCodeGrid");
    }
    if (!hillGradeGrid) {
      missingFields.push("hillGradeGrid");
    }
    args.logWarning?.({
      code: "sidecar-data-invalid",
      message: `Ignoring runtime map sidecar without complete terrain/hill-grade data (${missingFields.join(", ")}): ${sidecarPath}`,
    });
    return fallbackBundle;
  }
  const coupledHillGradeGrid = coupleHillGradeGridToTerrain(
    terrainCodeGrid,
    hillGradeGrid,
  );

  const blockedSpawnCellIndexSet = new Set<number>();
  const impassableCellIndexSet = new Set<number>();
  for (let index = 0; index < terrainCodeGrid.length; index += 1) {
    const terrainCode = terrainCodeGrid.charAt(index);
    if (terrainCode === "m") {
      impassableCellIndexSet.add(index);
      blockedSpawnCellIndexSet.add(index);
    } else if (terrainCode === "w") {
      blockedSpawnCellIndexSet.add(index);
    }
  }

  const parsedCityZones = parseCityZones(
    parsed.cityZones,
    args.gridWidth,
    args.gridHeight,
  );
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
  const cityAnchorsFromZones = parsedCityZones
    ? deriveCityAnchorsFromCityZones(parsedCityZones)
    : null;
  const neutralAnchorsFromZones = parsedCityZones
    ? deriveNeutralAnchorsFromCityZones(parsedCityZones)
    : [];
  const derivedAnchors = deriveCityAnchorsFromTerrainCodeGrid(
    terrainCodeGrid,
    args.gridWidth,
    args.gridHeight,
  );

  const cityAnchors =
    parsedCityAnchors ??
    cityAnchorsFromZones ??
    derivedAnchors.cityAnchors ??
    cloneCityAnchors(args.defaultCityAnchors);
  const neutralCityAnchors =
    parsedNeutralCityAnchors ??
    (neutralAnchorsFromZones.length > 0 ? neutralAnchorsFromZones : null) ??
    derivedAnchors.neutralCityAnchors ??
    cloneNeutralCityAnchors(args.defaultNeutralCityAnchors);

  const cityZones = resolveCityZones(parsedCityZones, cityAnchors, neutralCityAnchors);
  const roadCells = parseRoadCells(parsed.roadCells, args.gridWidth, args.gridHeight) ?? [];
  const farmZones = parseFarmZones(parsed.farmZones, args.gridWidth, args.gridHeight) ?? [];
  const parsedFarmToCityLinks = parseFarmToCityLinks(parsed.farmToCityLinks);
  const farmToCityLinks = normalizeFarmToCityLinks(
    parsedFarmToCityLinks,
    farmZones,
    cityZones,
  );

  return {
    mapId: args.mapId,
    revision: args.revision,
    method: parseMethod(parsed.method),
    seed: typeof parsed.seed === "string" ? parsed.seed : null,
    gridWidth: args.gridWidth,
    gridHeight: args.gridHeight,
    terrainCodeGrid,
    hillGradeGrid: coupledHillGradeGrid,
    cityAnchors: cloneCityAnchors(cityAnchors),
    neutralCityAnchors: cloneNeutralCityAnchors(neutralCityAnchors),
    cityZones: cloneCityZones(cityZones),
    roadCells: cloneRoadCells(roadCells),
    farmZones: cloneFarmZones(farmZones),
    farmToCityLinks: cloneFarmToCityLinks(farmToCityLinks),
    blockedSpawnCellIndexSet,
    impassableCellIndexSet,
    source: "runtime-sidecar",
  };
}
