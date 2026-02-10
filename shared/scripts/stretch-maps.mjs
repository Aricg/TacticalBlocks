#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = path.resolve(SCRIPT_DIR, '..');
const SOURCE_EXTENSIONS = new Set(['.jpeg', '.jpg', '.png']);
const QUANTIZED_SUFFIX = '-16c.png';
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

function printUsage() {
  console.log('Usage: node ./scripts/stretch-maps.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --width <pixels>       Default: ${DEFAULT_WIDTH}`);
  console.log(`  --height <pixels>      Default: ${DEFAULT_HEIGHT}`);
  console.log(`  --input-dir <path>     Default: ${SHARED_DIR}`);
  console.log('  --no-sync              Skip running map:sync');
  console.log('  --help, -h             Show help');
}

function parseArgs(argv) {
  const options = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    inputDir: SHARED_DIR,
    noSync: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--width':
        options.width = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--height':
        options.height = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--input-dir':
        options.inputDir = path.resolve(process.cwd(), argv[i + 1] ?? '.');
        i += 1;
        break;
      case '--no-sync':
        options.noSync = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown option: ${token}`);
        printUsage();
        process.exit(1);
    }
  }

  return options;
}

function assertPositiveInteger(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`Invalid ${name}: ${value}`);
    process.exit(1);
  }
}

function isStretchableSourceMap(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(QUANTIZED_SUFFIX)) {
    return false;
  }
  const extension = path.extname(lower);
  return SOURCE_EXTENSIONS.has(extension);
}

function runMagickResize(inputPath, outputPath, width, height) {
  const result = spawnSync(
    'magick',
    [
      inputPath,
      '-filter',
      'point',
      '-resize',
      `${width}x${height}!`,
      outputPath,
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  );

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('ImageMagick is required. Install it and ensure "magick" is in PATH.');
    } else {
      console.error(`Failed to run ImageMagick: ${result.error.message}`);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
}

function runSync(inputDir) {
  const result = spawnSync(process.execPath, ['./scripts/sync-maps.mjs', inputDir], {
    cwd: SHARED_DIR,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const options = parseArgs(process.argv.slice(2));
assertPositiveInteger('width', options.width);
assertPositiveInteger('height', options.height);

try {
  accessSync(options.inputDir, constants.R_OK | constants.W_OK);
} catch {
  console.error(`Input directory not readable/writable: ${options.inputDir}`);
  process.exit(1);
}

const sourceMapFileNames = readdirSync(options.inputDir)
  .filter(isStretchableSourceMap)
  .sort();

if (sourceMapFileNames.length === 0) {
  console.error(`No source maps found in ${options.inputDir}.`);
  process.exit(1);
}

for (const fileName of sourceMapFileNames) {
  const mapPath = path.join(options.inputDir, fileName);
  runMagickResize(mapPath, mapPath, options.width, options.height);
}

if (!options.noSync) {
  runSync(options.inputDir);
}

console.log(`Stretched source maps: ${sourceMapFileNames.length}`);
console.log(`Resolution: ${options.width}x${options.height}`);
if (options.noSync) {
  console.log('Skipped map:sync (--no-sync).');
}
