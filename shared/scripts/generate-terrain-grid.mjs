#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT_DIR = process.cwd();
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'src/terrainGrid.ts');
const DEFAULT_GRID_WIDTH = 80;
const DEFAULT_GRID_HEIGHT = 44;
const QUANTIZED_MAP_SUFFIX = '-16c.png';
const ELEVATION_GRID_SUFFIX = '.elevation-grid.json';
const SOURCE_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png'];

const MOUNTAIN_SWATCHES = new Set([
  '708188',
  '6d7e85',
  '5a6960',
  '404b3c',
  '6a7c8c',
  '4e5f5d',
  '3a4a54',
  '96a2a0',
  '556364',
  '6d7d83',
  '546264',
  '6e7d82',
  '778486',
  '424f46',
  '333d3c',
  '5a6965',
  'a0aeab',
  '556362',
]);

const NON_MOUNTAIN_TERRAIN_SWATCHES = [
  { color: 0x0f2232, type: 'water' },
  { color: 0x102236, type: 'water' },
  { color: 0x71844b, type: 'grass' },
  { color: 0x70834e, type: 'grass' },
  { color: 0x748764, type: 'grass' },
  { color: 0x364d31, type: 'forest' },
  { color: 0x122115, type: 'forest' },
  { color: 0xc4a771, type: 'hills' },
  { color: 0x9e8c5d, type: 'hills' },
  { color: 0xa79168, type: 'hills' },
  { color: 0xefb72f, type: 'hills' },
  { color: 0xddb650, type: 'hills' },
];

const NON_MOUNTAIN_TERRAIN_BY_COLOR = new Map(
  NON_MOUNTAIN_TERRAIN_SWATCHES.map((swatch) => [swatch.color, swatch.type]),
);

const TERRAIN_CODE_BY_TYPE = {
  water: 'w',
  grass: 'g',
  forest: 'f',
  hills: 'h',
  mountains: 'm',
  unknown: 'u',
};

const DEFAULT_ELEVATION_BYTE_BY_TERRAIN_CODE = {
  w: 16,
  g: 112,
  f: 124,
  h: 176,
  m: 230,
  u: 112,
};

const CITY_HUE_MIN = 38;
const CITY_HUE_MAX = 55;
const CITY_SATURATION_MIN = 0.58;
const CITY_VALUE_MIN = 0.68;

function printUsage() {
  console.log(
    'Usage: node ./scripts/generate-terrain-grid.mjs [inputDir] [outputPath] [gridWidth] [gridHeight]',
  );
  console.log(`Defaults: inputDir=${DEFAULT_INPUT_DIR}`);
  console.log(`          output=${DEFAULT_OUTPUT}`);
  console.log(`          gridWidth=${DEFAULT_GRID_WIDTH}`);
  console.log(`          gridHeight=${DEFAULT_GRID_HEIGHT}`);
}

function runMagickPixelDump(inputPath, gridWidth, gridHeight) {
  const imageDump = spawnSync(
    'magick',
    [
      inputPath,
      '-filter',
      'point',
      '-resize',
      `${gridWidth}x${gridHeight}!`,
      'txt:-',
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  );

  if (imageDump.error) {
    if (imageDump.error.code === 'ENOENT') {
      console.error(
        'ImageMagick is required. Install it and ensure "magick" is in PATH.',
      );
    } else {
      console.error(`Failed to run ImageMagick: ${imageDump.error.message}`);
    }
    process.exit(1);
  }

  if (imageDump.status !== 0) {
    if (imageDump.stderr) {
      process.stderr.write(imageDump.stderr);
    }
    process.exit(imageDump.status ?? 1);
  }

  return imageDump.stdout;
}

function parsePixelDump(pixelDump) {
  const pixels = [];
  for (const line of pixelDump.split(/\r?\n/)) {
    const match = line.match(/^(\d+),(\d+):\s+\((\d+),(\d+),(\d+)\)/);
    if (!match) {
      continue;
    }
    pixels.push({
      col: Number.parseInt(match[1], 10),
      row: Number.parseInt(match[2], 10),
      red: Number.parseInt(match[3], 10),
      green: Number.parseInt(match[4], 10),
      blue: Number.parseInt(match[5], 10),
    });
  }
  return pixels;
}

function rgbToHsv(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  const saturation = max === 0 ? 0 : delta / max;
  return { hue, saturation, value: max };
}

function isCityYellow(red, green, blue) {
  const { hue, saturation, value } = rgbToHsv(red, green, blue);
  return (
    hue >= CITY_HUE_MIN &&
    hue <= CITY_HUE_MAX &&
    saturation >= CITY_SATURATION_MIN &&
    value >= CITY_VALUE_MIN
  );
}

function getMountainIndexes(pixels, gridWidth) {
  const mountainIndexes = [];
  for (const pixel of pixels) {
    const hex = ((pixel.red << 16) | (pixel.green << 8) | pixel.blue)
      .toString(16)
      .padStart(6, '0');
    if (MOUNTAIN_SWATCHES.has(hex)) {
      mountainIndexes.push(pixel.row * gridWidth + pixel.col);
    }
  }
  return mountainIndexes;
}

function pruneIsolatedMountainIndexes(indexes, gridWidth, gridHeight) {
  const indexSet = new Set(indexes);
  const pruned = [];

  for (const index of indexes) {
    const col = index % gridWidth;
    const row = Math.floor(index / gridWidth);
    let hasMountainNeighbor = false;

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (colOffset === 0 && rowOffset === 0) {
          continue;
        }

        const neighborCol = col + colOffset;
        const neighborRow = row + rowOffset;
        if (
          neighborCol < 0 ||
          neighborRow < 0 ||
          neighborCol >= gridWidth ||
          neighborRow >= gridHeight
        ) {
          continue;
        }

        const neighborIndex = neighborRow * gridWidth + neighborCol;
        if (indexSet.has(neighborIndex)) {
          hasMountainNeighbor = true;
          break;
        }
      }
      if (hasMountainNeighbor) {
        break;
      }
    }

    if (hasMountainNeighbor) {
      pruned.push(index);
    }
  }

  return pruned;
}

function classifyTerrainType(red, green, blue) {
  const color = (red << 16) | (green << 8) | blue;
  const hex = color.toString(16).padStart(6, '0');
  if (MOUNTAIN_SWATCHES.has(hex)) {
    return 'mountains';
  }

  const directMatch = NON_MOUNTAIN_TERRAIN_BY_COLOR.get(color);
  if (directMatch) {
    return directMatch;
  }

  let closestDistanceSq = Number.POSITIVE_INFINITY;
  let closestTerrain = 'unknown';
  for (const swatch of NON_MOUNTAIN_TERRAIN_SWATCHES) {
    const swatchR = (swatch.color >> 16) & 0xff;
    const swatchG = (swatch.color >> 8) & 0xff;
    const swatchB = swatch.color & 0xff;
    const dr = red - swatchR;
    const dg = green - swatchG;
    const db = blue - swatchB;
    const distanceSq = dr * dr + dg * dg + db * db;
    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closestTerrain = swatch.type;
    }
  }

  return closestTerrain;
}

function getTerrainCodeGrid(pixels, gridWidth, gridHeight) {
  const cellCount = gridWidth * gridHeight;
  const codes = new Array(cellCount).fill(TERRAIN_CODE_BY_TYPE.unknown);
  for (const pixel of pixels) {
    const index = pixel.row * gridWidth + pixel.col;
    const terrainType = classifyTerrainType(pixel.red, pixel.green, pixel.blue);
    codes[index] = TERRAIN_CODE_BY_TYPE[terrainType] ?? TERRAIN_CODE_BY_TYPE.unknown;
  }
  return codes.join('');
}

function formatIndexArray(indexes, indent = '    ') {
  if (indexes.length === 0) {
    return `${indent}`;
  }

  const lines = [];
  for (let i = 0; i < indexes.length; i += 16) {
    lines.push(`${indent}${indexes.slice(i, i + 16).join(', ')},`);
  }
  return lines.join('\n');
}

function formatGridCoordinateArray(coordinates, indent = '    ') {
  if (coordinates.length === 0) {
    return `${indent}`;
  }

  return coordinates
    .map((coordinate) => `${indent}{ col: ${coordinate.col}, row: ${coordinate.row} },`)
    .join('\n');
}

function formatTerrainCodeGrid(codeGrid, gridWidth, indent = '    ') {
  if (codeGrid.length === 0 || gridWidth <= 0) {
    return `${indent}''`;
  }

  const lines = [];
  const rowCount = Math.ceil(codeGrid.length / gridWidth);
  for (let row = 0; row < rowCount; row += 1) {
    const start = row * gridWidth;
    const end = start + gridWidth;
    const rowCode = codeGrid.slice(start, end);
    const suffix = row < rowCount - 1 ? ' +' : '';
    lines.push(`${indent}'${rowCode}'${suffix}`);
  }

  return lines.join('\n');
}

function formatElevationHexGrid(elevationHexGrid, gridWidth, indent = '    ') {
  if (elevationHexGrid.length === 0 || gridWidth <= 0) {
    return `${indent}''`;
  }

  const lines = [];
  const charsPerRow = gridWidth * 2;
  const rowCount = Math.ceil(elevationHexGrid.length / charsPerRow);
  for (let row = 0; row < rowCount; row += 1) {
    const start = row * charsPerRow;
    const end = start + charsPerRow;
    const rowHex = elevationHexGrid.slice(start, end);
    const suffix = row < rowCount - 1 ? ' +' : '';
    lines.push(`${indent}'${rowHex}'${suffix}`);
  }

  return lines.join('\n');
}

function normalizeElevationByte(value, normalizedRange = false) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const scaled = normalizedRange ? value * 255 : value;
  const rounded = Math.round(scaled);
  if (!Number.isFinite(rounded)) {
    return null;
  }

  return Math.max(0, Math.min(255, rounded));
}

function decodeElevationHexGrid(elevationHexGrid, expectedCellCount) {
  if (
    typeof elevationHexGrid !== 'string' ||
    elevationHexGrid.length !== expectedCellCount * 2
  ) {
    return null;
  }

  const bytes = new Uint8Array(expectedCellCount);
  for (let index = 0; index < expectedCellCount; index += 1) {
    const value = Number.parseInt(
      elevationHexGrid.slice(index * 2, index * 2 + 2),
      16,
    );
    if (!Number.isFinite(value)) {
      return null;
    }
    bytes[index] = value;
  }
  return bytes;
}

function encodeElevationHexGrid(elevationBytes) {
  return Array.from(elevationBytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

function getFallbackElevationBytes(terrainCodeGrid, gridWidth, gridHeight) {
  const cellCount = gridWidth * gridHeight;
  const bytes = new Uint8Array(cellCount);
  for (let index = 0; index < cellCount; index += 1) {
    const terrainCode = terrainCodeGrid.charAt(index);
    bytes[index] =
      DEFAULT_ELEVATION_BYTE_BY_TERRAIN_CODE[terrainCode] ??
      DEFAULT_ELEVATION_BYTE_BY_TERRAIN_CODE.u;
  }
  return bytes;
}

function readElevationBytesFromSidecar(inputDir, mapId, gridWidth, gridHeight) {
  const sidecarPath = path.join(inputDir, `${mapId}${ELEVATION_GRID_SUFFIX}`);
  if (!existsSync(sidecarPath)) {
    return null;
  }

  try {
    const expectedCellCount = gridWidth * gridHeight;
    const parsed = JSON.parse(readFileSync(sidecarPath, 'utf8'));
    if (parsed && typeof parsed === 'object') {
      if (
        Number.isInteger(parsed.gridWidth) &&
        Number.isInteger(parsed.gridHeight) &&
        (parsed.gridWidth !== gridWidth || parsed.gridHeight !== gridHeight)
      ) {
        console.warn(
          `Skipping elevation sidecar for ${mapId}: grid size mismatch (${parsed.gridWidth}x${parsed.gridHeight}, expected ${gridWidth}x${gridHeight}).`,
        );
        return null;
      }

      if (typeof parsed.elevationHex === 'string') {
        const decoded = decodeElevationHexGrid(
          parsed.elevationHex,
          expectedCellCount,
        );
        if (decoded) {
          return decoded;
        }
      }

      if (Array.isArray(parsed.elevation)) {
        if (parsed.elevation.length !== expectedCellCount) {
          console.warn(
            `Skipping elevation sidecar for ${mapId}: expected ${expectedCellCount} entries, got ${parsed.elevation.length}.`,
          );
          return null;
        }

        const normalizedRange = parsed.elevation.every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        );
        const bytes = new Uint8Array(expectedCellCount);
        for (let index = 0; index < expectedCellCount; index += 1) {
          const normalized = normalizeElevationByte(
            parsed.elevation[index],
            normalizedRange,
          );
          if (normalized === null) {
            console.warn(
              `Skipping elevation sidecar for ${mapId}: non-numeric elevation at index ${index}.`,
            );
            return null;
          }
          bytes[index] = normalized;
        }
        return bytes;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown parsing error';
    console.warn(`Skipping elevation sidecar for ${mapId}: ${message}`);
  }

  return null;
}

function getConnectedComponents(cells) {
  const components = [];
  const cellByKey = new Map(cells.map((cell) => [`${cell.col},${cell.row}`, cell]));
  const visited = new Set();

  for (const cell of cells) {
    const key = `${cell.col},${cell.row}`;
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    const queue = [cell];
    const component = [];
    while (queue.length > 0) {
      const current = queue.pop();
      component.push(current);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nextCol = current.col + dx;
        const nextRow = current.row + dy;
        const nextKey = `${nextCol},${nextRow}`;
        if (visited.has(nextKey)) {
          continue;
        }
        const nextCell = cellByKey.get(nextKey);
        if (!nextCell) {
          continue;
        }
        visited.add(nextKey);
        queue.push(nextCell);
      }
    }
    components.push(component);
  }

  return components;
}

function getComponentCenter(component) {
  const totalCol = component.reduce((sum, cell) => sum + cell.col, 0);
  const totalRow = component.reduce((sum, cell) => sum + cell.row, 0);
  return {
    col: totalCol / component.length,
    row: totalRow / component.length,
  };
}

function chooseCityComponentPair(components) {
  if (components.length < 2) {
    return null;
  }

  let bestPair = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < components.length; i += 1) {
    for (let j = i + 1; j < components.length; j += 1) {
      const a = components[i];
      const b = components[j];
      const centerA = getComponentCenter(a);
      const centerB = getComponentCenter(b);
      const xDistance = Math.abs(centerA.col - centerB.col);
      const sizeScore = a.length + b.length;
      const score = xDistance * 100 + sizeScore * 10;
      if (score > bestScore) {
        bestScore = score;
        bestPair = [a, b];
      }
    }
  }

  return bestPair;
}

function getTeamCityData(sourcePixels, gridWidth) {
  const cityCells = sourcePixels.filter((pixel) =>
    isCityYellow(pixel.red, pixel.green, pixel.blue),
  );
  const components = getConnectedComponents(cityCells);
  const chosenPair = chooseCityComponentPair(components);
  if (!chosenPair) {
    return null;
  }

  const [firstComponent, secondComponent] = chosenPair;
  const firstCenter = getComponentCenter(firstComponent);
  const secondCenter = getComponentCenter(secondComponent);
  const firstIsRed =
    firstCenter.col < secondCenter.col ||
    (firstCenter.col === secondCenter.col && firstCenter.row <= secondCenter.row);

  const redComponent = firstIsRed ? firstComponent : secondComponent;
  const blueComponent = firstIsRed ? secondComponent : firstComponent;
  const redCenter = firstIsRed ? firstCenter : secondCenter;
  const blueCenter = firstIsRed ? secondCenter : firstCenter;
  const neutralComponents = components.filter(
    (component) => component !== redComponent && component !== blueComponent,
  );

  const toIndexes = (component) =>
    component.map((cell) => cell.row * gridWidth + cell.col).sort((a, b) => a - b);
  const toAnchor = (center) => ({
    col: Math.round(center.col),
    row: Math.round(center.row),
  });

  return {
    redIndexes: toIndexes(redComponent),
    blueIndexes: toIndexes(blueComponent),
    neutralIndexes: neutralComponents
      .flatMap((component) => component.map((cell) => cell.row * gridWidth + cell.col))
      .sort((a, b) => a - b),
    redAnchor: toAnchor(redCenter),
    blueAnchor: toAnchor(blueCenter),
    neutralAnchors: neutralComponents
      .map((component) => toAnchor(getComponentCenter(component)))
      .sort((a, b) => a.col - b.col || a.row - b.row),
  };
}

function resolveSourceImagePath(inputDir, mapId) {
  for (const extension of SOURCE_IMAGE_EXTENSIONS) {
    const candidatePath = path.join(inputDir, `${mapId}${extension}`);
    try {
      accessSync(candidatePath, constants.R_OK);
      return candidatePath;
    } catch {
      // Try next extension.
    }
  }
  return path.join(inputDir, `${mapId}${QUANTIZED_MAP_SUFFIX}`);
}

const [, , inputDirArg, outputArg, widthArg, heightArg] = process.argv;

if (inputDirArg === '--help' || inputDirArg === '-h') {
  printUsage();
  process.exit(0);
}

const inputDir = path.resolve(process.cwd(), inputDirArg ?? DEFAULT_INPUT_DIR);
const outputPath = path.resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT);
const gridWidth = Number.parseInt(widthArg ?? `${DEFAULT_GRID_WIDTH}`, 10);
const gridHeight = Number.parseInt(heightArg ?? `${DEFAULT_GRID_HEIGHT}`, 10);

if (!Number.isInteger(gridWidth) || gridWidth <= 0) {
  console.error(`Invalid grid width "${widthArg ?? DEFAULT_GRID_WIDTH}".`);
  process.exit(1);
}

if (!Number.isInteger(gridHeight) || gridHeight <= 0) {
  console.error(`Invalid grid height "${heightArg ?? DEFAULT_GRID_HEIGHT}".`);
  process.exit(1);
}

try {
  accessSync(inputDir, constants.R_OK);
} catch {
  console.error(`Input directory not found or unreadable: ${inputDir}`);
  process.exit(1);
}

const mapFiles = readdirSync(inputDir)
  .filter((fileName) => fileName.endsWith(QUANTIZED_MAP_SUFFIX))
  .sort();

if (mapFiles.length === 0) {
  console.error(
    `No map files matching "*${QUANTIZED_MAP_SUFFIX}" found in ${inputDir}.`,
  );
  process.exit(1);
}

const mountainIndexesByMapId = new Map();
const terrainCodeGridByMapId = new Map();
const elevationHexGridByMapId = new Map();
const cityIndexesByMapId = new Map();
const cityAnchorsByMapId = new Map();
const neutralCityIndexesByMapId = new Map();
const neutralCityAnchorsByMapId = new Map();

for (const mapFile of mapFiles) {
  const mapId = mapFile.slice(0, -QUANTIZED_MAP_SUFFIX.length);
  const quantizedPath = path.join(inputDir, mapFile);
  const quantizedPixels = parsePixelDump(
    runMagickPixelDump(quantizedPath, gridWidth, gridHeight),
  );
  const terrainCodeGrid = getTerrainCodeGrid(quantizedPixels, gridWidth, gridHeight);
  terrainCodeGridByMapId.set(mapId, terrainCodeGrid);
  const elevationBytes =
    readElevationBytesFromSidecar(inputDir, mapId, gridWidth, gridHeight) ??
    getFallbackElevationBytes(terrainCodeGrid, gridWidth, gridHeight);
  elevationHexGridByMapId.set(mapId, encodeElevationHexGrid(elevationBytes));
  const rawMountainIndexes = getMountainIndexes(quantizedPixels, gridWidth);
  const mountainIndexes = pruneIsolatedMountainIndexes(
    rawMountainIndexes,
    gridWidth,
    gridHeight,
  );
  mountainIndexesByMapId.set(mapId, mountainIndexes);

  const sourcePath = resolveSourceImagePath(inputDir, mapId);
  const sourcePixels = parsePixelDump(
    runMagickPixelDump(sourcePath, gridWidth, gridHeight),
  );
  const teamCityData = getTeamCityData(sourcePixels, gridWidth);
  if (teamCityData) {
    cityIndexesByMapId.set(mapId, {
      RED: teamCityData.redIndexes,
      BLUE: teamCityData.blueIndexes,
    });
    cityAnchorsByMapId.set(mapId, {
      RED: teamCityData.redAnchor,
      BLUE: teamCityData.blueAnchor,
    });
    neutralCityIndexesByMapId.set(mapId, teamCityData.neutralIndexes);
    neutralCityAnchorsByMapId.set(mapId, teamCityData.neutralAnchors);
  }
}

const mountainEntries = [];
const terrainCodeEntries = [];
const elevationEntries = [];
const cityMaskEntries = [];
const cityAnchorEntries = [];
const neutralCityMaskEntries = [];
const neutralCityAnchorEntries = [];
let totalMountainCells = 0;

for (const [mapId, indexes] of mountainIndexesByMapId) {
  totalMountainCells += indexes.length;
  mountainEntries.push(
    `  '${mapId}': [\n${formatIndexArray(indexes)}\n  ],`,
  );

  const terrainCodeGrid = terrainCodeGridByMapId.get(mapId) ?? '';
  terrainCodeEntries.push(
    `  '${mapId}':\n${formatTerrainCodeGrid(terrainCodeGrid, gridWidth)},`,
  );
  const elevationHexGrid = elevationHexGridByMapId.get(mapId) ?? '';
  elevationEntries.push(
    `  '${mapId}':\n${formatElevationHexGrid(elevationHexGrid, gridWidth)},`,
  );

  const cityMasks = cityIndexesByMapId.get(mapId) ?? { RED: [], BLUE: [] };
  cityMaskEntries.push(
    `  '${mapId}': {\n` +
      `    RED: [\n${formatIndexArray(cityMasks.RED, '      ')}\n    ],\n` +
      `    BLUE: [\n${formatIndexArray(cityMasks.BLUE, '      ')}\n    ],\n` +
      `  },`,
  );
  const neutralCityMasks = neutralCityIndexesByMapId.get(mapId) ?? [];
  neutralCityMaskEntries.push(
    `  '${mapId}': [\n${formatIndexArray(neutralCityMasks)}\n  ],`,
  );

  const cityAnchors = cityAnchorsByMapId.get(mapId);
  if (cityAnchors) {
    cityAnchorEntries.push(
      `  '${mapId}': { RED: { col: ${cityAnchors.RED.col}, row: ${cityAnchors.RED.row} }, BLUE: { col: ${cityAnchors.BLUE.col}, row: ${cityAnchors.BLUE.row} } },`,
    );
  }
  const neutralCityAnchors = neutralCityAnchorsByMapId.get(mapId) ?? [];
  neutralCityAnchorEntries.push(
    `  '${mapId}': [\n${formatGridCoordinateArray(neutralCityAnchors)}\n  ],`,
  );
}

const fileContent = `import { GAMEPLAY_CONFIG } from './gameplayConfig.js';

export const TERRAIN_GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
export const TERRAIN_GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;

type Team = 'RED' | 'BLUE';
type GridCoordinate = { col: number; row: number };
export type TerrainType =
  | 'water'
  | 'grass'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'unknown';

const TERRAIN_CODE_GRID_BY_MAP_ID: Record<string, string> = {
${terrainCodeEntries.join('\n')}
};

const ELEVATION_HEX_GRID_BY_MAP_ID: Record<string, string> = {
${elevationEntries.join('\n')}
};

const TERRAIN_TYPE_BY_CODE: Record<string, TerrainType> = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

function decodeElevationHexGrid(elevationHexGrid: string): Uint8Array {
  const expectedLength = TERRAIN_GRID_WIDTH * TERRAIN_GRID_HEIGHT;
  if (elevationHexGrid.length !== expectedLength * 2) {
    return new Uint8Array(expectedLength);
  }

  const bytes = new Uint8Array(expectedLength);
  for (let index = 0; index < expectedLength; index += 1) {
    const byteValue = Number.parseInt(
      elevationHexGrid.slice(index * 2, index * 2 + 2),
      16,
    );
    bytes[index] = Number.isFinite(byteValue) ? byteValue : 0;
  }
  return bytes;
}

const ELEVATION_GRID_BY_MAP_ID = new Map<string, Uint8Array>(
  Object.entries(ELEVATION_HEX_GRID_BY_MAP_ID).map(([mapId, elevationHexGrid]) => [
    mapId,
    decodeElevationHexGrid(elevationHexGrid),
  ]),
);

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
${mountainEntries.join('\n')}
};

const CITY_CELL_INDEXES_BY_MAP_ID: Record<
  string,
  Record<Team, number[]>
> = {
${cityMaskEntries.join('\n')}
};

const NEUTRAL_CITY_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
${neutralCityMaskEntries.join('\n')}
};

const CITY_ANCHOR_BY_MAP_ID: Partial<Record<string, Record<Team, GridCoordinate>>> = {
${cityAnchorEntries.join('\n')}
};

const NEUTRAL_CITY_ANCHORS_BY_MAP_ID: Record<string, GridCoordinate[]> = {
${neutralCityAnchorEntries.join('\n')}
};

const MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(MOUNTAIN_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

const CITY_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Record<Team, Set<number>>>(
  Object.entries(CITY_CELL_INDEXES_BY_MAP_ID).map(([mapId, byTeam]) => [
    mapId,
    {
      RED: new Set<number>(byTeam.RED),
      BLUE: new Set<number>(byTeam.BLUE),
    },
  ]),
);

const NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(NEUTRAL_CITY_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

function getActiveMapId(): string {
  return GAMEPLAY_CONFIG.map.activeMapId;
}

function getFallbackMapId(): string {
  return GAMEPLAY_CONFIG.map.availableMapIds[0];
}

function getGridCellFromWorld(x: number, y: number): GridCoordinate {
  const cellWidth = GAMEPLAY_CONFIG.map.width / TERRAIN_GRID_WIDTH;
  const cellHeight = GAMEPLAY_CONFIG.map.height / TERRAIN_GRID_HEIGHT;
  const colBasis = x / cellWidth - 0.5;
  const rowBasis = y / cellHeight - 0.5;
  return {
    col: Math.max(0, Math.min(TERRAIN_GRID_WIDTH - 1, Math.round(colBasis))),
    row: Math.max(0, Math.min(TERRAIN_GRID_HEIGHT - 1, Math.round(rowBasis))),
  };
}

function getDefaultTeamCityGridCoordinate(team: Team): GridCoordinate {
  const spawn = team === 'RED' ? GAMEPLAY_CONFIG.spawn.red : GAMEPLAY_CONFIG.spawn.blue;
  const rawX =
    team === 'RED'
      ? spawn.x - GAMEPLAY_CONFIG.cities.backlineOffset
      : spawn.x + GAMEPLAY_CONFIG.cities.backlineOffset;
  return getGridCellFromWorld(rawX, spawn.y);
}

function getActiveMountainCellIndexSet(): Set<number> {
  const activeSet = MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }

  return MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ?? new Set<number>();
}

function getActiveTerrainCodeGrid(): string {
  const activeGrid = TERRAIN_CODE_GRID_BY_MAP_ID[getActiveMapId()];
  if (activeGrid) {
    return activeGrid;
  }

  return TERRAIN_CODE_GRID_BY_MAP_ID[getFallbackMapId()] ?? '';
}

function getActiveElevationGrid(): Uint8Array {
  const expectedLength = TERRAIN_GRID_WIDTH * TERRAIN_GRID_HEIGHT;
  const activeGrid = ELEVATION_GRID_BY_MAP_ID.get(getActiveMapId());
  if (activeGrid && activeGrid.length === expectedLength) {
    return activeGrid;
  }

  const fallbackGrid = ELEVATION_GRID_BY_MAP_ID.get(getFallbackMapId());
  if (fallbackGrid && fallbackGrid.length === expectedLength) {
    return fallbackGrid;
  }

  return new Uint8Array(expectedLength);
}

function getActiveCityIndexSetByTeam(): Record<Team, Set<number>> {
  const activeSet = CITY_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }
  return (
    CITY_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ?? {
      RED: new Set<number>(),
      BLUE: new Set<number>(),
    }
  );
}

function getActiveNeutralCityIndexSet(): Set<number> {
  const activeSet = NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }

  return (
    NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ??
    new Set<number>()
  );
}

export function getGridCellIndex(col: number, row: number): number {
  return row * TERRAIN_GRID_WIDTH + col;
}

export function getGridCellTerrainType(col: number, row: number): TerrainType {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return 'unknown';
  }

  const terrainCode = getActiveTerrainCodeGrid().charAt(getGridCellIndex(col, row));
  return TERRAIN_TYPE_BY_CODE[terrainCode] ?? 'unknown';
}

export function getGridCellElevation(col: number, row: number): number {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return 0;
  }

  const elevationByte = getActiveElevationGrid()[getGridCellIndex(col, row)] ?? 0;
  return elevationByte / 255;
}

export function getWorldTerrainType(x: number, y: number): TerrainType {
  const cell = getGridCellFromWorld(x, y);
  return getGridCellTerrainType(cell.col, cell.row);
}

export function isGridCellMountain(col: number, row: number): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveMountainCellIndexSet().has(getGridCellIndex(col, row));
}

export function isGridCellImpassable(col: number, row: number): boolean {
  return isGridCellMountain(col, row);
}

export function isGridCellTeamCity(col: number, row: number, team: Team): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveCityIndexSetByTeam()[team].has(getGridCellIndex(col, row));
}

export function isGridCellNeutralCity(col: number, row: number): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveNeutralCityIndexSet().has(getGridCellIndex(col, row));
}

export function getTeamCityGridCoordinate(team: Team): GridCoordinate {
  const activeAnchors = CITY_ANCHOR_BY_MAP_ID[getActiveMapId()];
  if (activeAnchors) {
    return activeAnchors[team];
  }

  const fallbackAnchors = CITY_ANCHOR_BY_MAP_ID[getFallbackMapId()];
  if (fallbackAnchors) {
    return fallbackAnchors[team];
  }

  return getDefaultTeamCityGridCoordinate(team);
}

export function getNeutralCityGridCoordinates(): GridCoordinate[] {
  const activeAnchors = NEUTRAL_CITY_ANCHORS_BY_MAP_ID[getActiveMapId()];
  if (activeAnchors) {
    return activeAnchors.map((anchor) => ({ ...anchor }));
  }

  const fallbackAnchors = NEUTRAL_CITY_ANCHORS_BY_MAP_ID[getFallbackMapId()];
  if (fallbackAnchors) {
    return fallbackAnchors.map((anchor) => ({ ...anchor }));
  }

  return [];
}
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Created: ${outputPath}`);
console.log(`Maps processed: ${mapFiles.length}`);
console.log(`Mountain cells total: ${totalMountainCells}`);
