#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT_DIR = process.cwd();
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'src/terrainGrid.ts');
const DEFAULT_GRID_WIDTH = 80;
const DEFAULT_GRID_HEIGHT = 44;
const MAP_SUFFIX = '-16c.png';
const MOUNTAIN_SWATCHES = new Set(['708188', '6d7e85', '5a6960', '404b3c']);

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

function getMountainIndexes(pixelDump, gridWidth) {
  const mountainIndexes = [];
  for (const line of pixelDump.split(/\r?\n/)) {
    const match = line.match(/^(\d+),(\d+):\s+\((\d+),(\d+),(\d+)\)/);
    if (!match) {
      continue;
    }
    const col = Number.parseInt(match[1], 10);
    const row = Number.parseInt(match[2], 10);
    const red = Number.parseInt(match[3], 10);
    const green = Number.parseInt(match[4], 10);
    const blue = Number.parseInt(match[5], 10);
    const hex = ((red << 16) | (green << 8) | blue)
      .toString(16)
      .padStart(6, '0');
    if (MOUNTAIN_SWATCHES.has(hex)) {
      mountainIndexes.push(row * gridWidth + col);
    }
  }
  return mountainIndexes;
}

function formatIndexArray(indexes) {
  if (indexes.length === 0) {
    return '    ';
  }

  const lines = [];
  for (let i = 0; i < indexes.length; i += 16) {
    lines.push(`    ${indexes.slice(i, i + 16).join(', ')},`);
  }
  return lines.join('\n');
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
  .filter((fileName) => fileName.endsWith(MAP_SUFFIX))
  .sort();

if (mapFiles.length === 0) {
  console.error(
    `No map files matching "*${MAP_SUFFIX}" found in ${inputDir}.`,
  );
  process.exit(1);
}

const mountainIndexesByMapId = new Map();
for (const mapFile of mapFiles) {
  const mapId = mapFile.slice(0, -MAP_SUFFIX.length);
  const inputPath = path.join(inputDir, mapFile);
  const pixelDump = runMagickPixelDump(inputPath, gridWidth, gridHeight);
  const mountainIndexes = getMountainIndexes(pixelDump, gridWidth);
  mountainIndexesByMapId.set(mapId, mountainIndexes);
}

const mapEntries = [];
let totalMountainCells = 0;
for (const [mapId, indexes] of mountainIndexesByMapId) {
  totalMountainCells += indexes.length;
  mapEntries.push(
    `  '${mapId}': [\n${formatIndexArray(indexes)}\n  ],`,
  );
}

const fileContent = `import { GAMEPLAY_CONFIG } from './gameplayConfig.js';

export const TERRAIN_GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
export const TERRAIN_GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
${mapEntries.join('\n')}
};

const MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(MOUNTAIN_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

function getActiveMountainCellIndexSet(): Set<number> {
  const activeMapId = GAMEPLAY_CONFIG.map.activeMapId;
  const activeSet = MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(activeMapId);
  if (activeSet) {
    return activeSet;
  }

  const fallbackMapId = GAMEPLAY_CONFIG.map.availableMapIds[0];
  return MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(fallbackMapId) ?? new Set<number>();
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
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Created: ${outputPath}`);
console.log(`Maps processed: ${mapFiles.length}`);
console.log(`Mountain cells total: ${totalMountainCells}`);
