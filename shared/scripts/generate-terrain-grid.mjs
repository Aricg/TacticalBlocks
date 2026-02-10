#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT_DIR = process.cwd();
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'src/terrainGrid.ts');
const DEFAULT_GRID_WIDTH = 80;
const DEFAULT_GRID_HEIGHT = 44;
const QUANTIZED_MAP_SUFFIX = '-16c.png';
const SOURCE_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png'];

const MOUNTAIN_SWATCHES = new Set([
  '708188',
  '6d7e85',
  '5a6960',
  '404b3c',
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

  const toIndexes = (component) =>
    component.map((cell) => cell.row * gridWidth + cell.col).sort((a, b) => a - b);

  return {
    redIndexes: toIndexes(redComponent),
    blueIndexes: toIndexes(blueComponent),
    redAnchor: {
      col: Math.round(redCenter.col),
      row: Math.round(redCenter.row),
    },
    blueAnchor: {
      col: Math.round(blueCenter.col),
      row: Math.round(blueCenter.row),
    },
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
const cityIndexesByMapId = new Map();
const cityAnchorsByMapId = new Map();

for (const mapFile of mapFiles) {
  const mapId = mapFile.slice(0, -QUANTIZED_MAP_SUFFIX.length);
  const quantizedPath = path.join(inputDir, mapFile);
  const quantizedPixels = parsePixelDump(
    runMagickPixelDump(quantizedPath, gridWidth, gridHeight),
  );
  const mountainIndexes = getMountainIndexes(quantizedPixels, gridWidth);
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
  }
}

const mountainEntries = [];
const cityMaskEntries = [];
const cityAnchorEntries = [];
let totalMountainCells = 0;

for (const [mapId, indexes] of mountainIndexesByMapId) {
  totalMountainCells += indexes.length;
  mountainEntries.push(
    `  '${mapId}': [\n${formatIndexArray(indexes)}\n  ],`,
  );

  const cityMasks = cityIndexesByMapId.get(mapId) ?? { RED: [], BLUE: [] };
  cityMaskEntries.push(
    `  '${mapId}': {\n` +
      `    RED: [\n${formatIndexArray(cityMasks.RED, '      ')}\n    ],\n` +
      `    BLUE: [\n${formatIndexArray(cityMasks.BLUE, '      ')}\n    ],\n` +
      `  },`,
  );

  const cityAnchors = cityAnchorsByMapId.get(mapId);
  if (cityAnchors) {
    cityAnchorEntries.push(
      `  '${mapId}': { RED: { col: ${cityAnchors.RED.col}, row: ${cityAnchors.RED.row} }, BLUE: { col: ${cityAnchors.BLUE.col}, row: ${cityAnchors.BLUE.row} } },`,
    );
  }
}

const fileContent = `import { GAMEPLAY_CONFIG } from './gameplayConfig.js';

export const TERRAIN_GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
export const TERRAIN_GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;

type Team = 'RED' | 'BLUE';
type GridCoordinate = { col: number; row: number };

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
${mountainEntries.join('\n')}
};

const CITY_CELL_INDEXES_BY_MAP_ID: Record<
  string,
  Record<Team, number[]>
> = {
${cityMaskEntries.join('\n')}
};

const CITY_ANCHOR_BY_MAP_ID: Partial<Record<string, Record<Team, GridCoordinate>>> = {
${cityAnchorEntries.join('\n')}
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

export function getGridCellIndex(col: number, row: number): number {
  return row * TERRAIN_GRID_WIDTH + col;
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
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Created: ${outputPath}`);
console.log(`Maps processed: ${mapFiles.length}`);
console.log(`Mountain cells total: ${totalMountainCells}`);
