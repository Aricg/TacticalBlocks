#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_EXTENSIONS = ['.jpeg', '.jpg', '.png'];
const QUANTIZED_SUFFIX = '-16c.png';
const DEFAULT_COLORS = 16;
const DEFAULT_INPUT_DIR = process.cwd();
const GAMEPLAY_CONFIG_PATH = path.resolve(
  process.cwd(),
  'src/gameplayConfig.ts',
);

function printUsage() {
  console.log('Usage: node ./scripts/sync-maps.mjs [inputDir]');
  console.log(`Defaults: inputDir=${DEFAULT_INPUT_DIR}`);
}

function isSourceMapFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(QUANTIZED_SUFFIX)) {
    return false;
  }
  const extension = path.extname(lower);
  return SOURCE_EXTENSIONS.includes(extension);
}

function getMapIdFromFileName(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function runMagickQuantize(inputPath, outputPath) {
  const command = spawnSync(
    'magick',
    [
      inputPath,
      '-dither',
      'None',
      '-colors',
      `${DEFAULT_COLORS}`,
      '-type',
      'Palette',
      outputPath,
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  );

  if (command.error) {
    if (command.error.code === 'ENOENT') {
      console.error(
        'ImageMagick is required. Install it and ensure "magick" is in PATH.',
      );
    } else {
      console.error(`Failed to run ImageMagick: ${command.error.message}`);
    }
    process.exit(1);
  }

  if (command.status !== 0) {
    if (command.stderr) {
      process.stderr.write(command.stderr);
    }
    process.exit(command.status ?? 1);
  }
}

function updateMapIdsInGameplayConfig(gameplayConfigPath, discoveredMapIds) {
  const content = readFileSync(gameplayConfigPath, 'utf8');
  const mapIdsBlockMatch = content.match(
    /const MAP_IDS = \[[\s\S]*?\] as const;/,
  );
  if (!mapIdsBlockMatch) {
    throw new Error(`Could not find MAP_IDS block in ${gameplayConfigPath}`);
  }

  const existingIds = Array.from(
    mapIdsBlockMatch[0].matchAll(/'([^']+)'/g),
    (match) => match[1],
  );
  const mergedIds = [...existingIds];
  for (const mapId of discoveredMapIds) {
    if (!mergedIds.includes(mapId)) {
      mergedIds.push(mapId);
    }
  }

  const nextBlock =
    'const MAP_IDS = [\n' +
    mergedIds.map((mapId) => `  '${mapId}',`).join('\n') +
    '\n] as const;';

  if (nextBlock === mapIdsBlockMatch[0]) {
    return { updated: false, mapIds: mergedIds };
  }

  writeFileSync(
    gameplayConfigPath,
    content.replace(mapIdsBlockMatch[0], nextBlock),
    'utf8',
  );
  return { updated: true, mapIds: mergedIds };
}

function runTerrainGridGeneration(cwd) {
  const command = spawnSync(process.execPath, ['./scripts/generate-terrain-grid.mjs'], {
    cwd,
    stdio: 'inherit',
  });
  if (command.status !== 0) {
    process.exit(command.status ?? 1);
  }
}

const [, , inputDirArg] = process.argv;

if (inputDirArg === '--help' || inputDirArg === '-h') {
  printUsage();
  process.exit(0);
}

const inputDir = path.resolve(process.cwd(), inputDirArg ?? DEFAULT_INPUT_DIR);

try {
  accessSync(inputDir, constants.R_OK);
} catch {
  console.error(`Input directory not found or unreadable: ${inputDir}`);
  process.exit(1);
}

const sourceMapFileNames = readdirSync(inputDir)
  .filter(isSourceMapFileName)
  .sort();

if (sourceMapFileNames.length === 0) {
  console.error(`No source map files found in ${inputDir}.`);
  process.exit(1);
}

const mapIdToSourcePath = new Map();
for (const sourceFileName of sourceMapFileNames) {
  const sourcePath = path.join(inputDir, sourceFileName);
  const mapId = getMapIdFromFileName(sourceFileName);
  if (!mapIdToSourcePath.has(mapId)) {
    mapIdToSourcePath.set(mapId, sourcePath);
  }
}

const discoveredMapIds = Array.from(mapIdToSourcePath.keys()).sort();
const converted = [];
const skipped = [];

for (const mapId of discoveredMapIds) {
  const sourcePath = mapIdToSourcePath.get(mapId);
  const outputPath = path.join(inputDir, `${mapId}${QUANTIZED_SUFFIX}`);

  const needsConversion =
    !existsSync(outputPath) ||
    statSync(sourcePath).mtimeMs > statSync(outputPath).mtimeMs;
  if (!needsConversion) {
    skipped.push(mapId);
    continue;
  }

  runMagickQuantize(sourcePath, outputPath);
  converted.push(mapId);
}

let updateResult;
try {
  updateResult = updateMapIdsInGameplayConfig(
    GAMEPLAY_CONFIG_PATH,
    discoveredMapIds,
  );
} catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : 'Failed to update MAP_IDS.';
  console.error(errorMessage);
  process.exit(1);
}

runTerrainGridGeneration(process.cwd());

console.log('Map sync complete.');
console.log(`Discovered maps: ${discoveredMapIds.length}`);
console.log(`Converted maps: ${converted.length}`);
if (converted.length > 0) {
  console.log(`Converted IDs: ${converted.join(', ')}`);
}
console.log(`Unchanged maps: ${skipped.length}`);
console.log(
  `Updated gameplayConfig MAP_IDS: ${updateResult.updated ? 'yes' : 'no'}`,
);
