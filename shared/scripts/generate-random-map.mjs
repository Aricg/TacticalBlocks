#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_GRID_WIDTH = 80;
const DEFAULT_GRID_HEIGHT = 44;
const DEFAULT_OUTPUT_WIDTH = 1920;
const DEFAULT_OUTPUT_HEIGHT = 1080;
const DEFAULT_WATER_BIAS = 0.05;
const DEFAULT_MOUNTAIN_BIAS = 0.03;
const DEFAULT_FOREST_BIAS = 0.0;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = path.resolve(SCRIPT_DIR, '..');
const ELEVATION_GRID_SUFFIX = '.elevation-grid.json';

const TERRAIN_SWATCHES = {
  water: [0x0f2232, 0x102236],
  grass: [0x71844b, 0x70834e, 0x748764],
  forest: [0x364d31, 0x122115],
  hills: [0xc4a771, 0x9e8c5d, 0xa79168],
  mountains: [0x708188, 0x6d7e85, 0x5a6960, 0x404b3c, 0x6a7c8c],
};
const CITY_MARKER_COLOR = 0xefb72f;
const TERRAIN_TYPES = ['water', 'grass', 'forest', 'hills', 'mountains'];

function printUsage() {
  console.log('Usage: node ./scripts/generate-random-map.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --map-id <id>          Use a specific map ID/file prefix');
  console.log('  --seed <seed>          Seed for reproducible generation');
  console.log(`  --grid-width <n>       Default: ${DEFAULT_GRID_WIDTH}`);
  console.log(`  --grid-height <n>      Default: ${DEFAULT_GRID_HEIGHT}`);
  console.log(`  --width <pixels>       Default: ${DEFAULT_OUTPUT_WIDTH}`);
  console.log(`  --height <pixels>      Default: ${DEFAULT_OUTPUT_HEIGHT}`);
  console.log(`  --water-bias <value>   Default: ${DEFAULT_WATER_BIAS}`);
  console.log(`  --mountain-bias <value> Default: ${DEFAULT_MOUNTAIN_BIAS}`);
  console.log(`  --forest-bias <value>  Default: ${DEFAULT_FOREST_BIAS}`);
  console.log(`  --output-dir <path>    Default: ${SHARED_DIR}`);
  console.log('  --no-sync              Skip running map:sync');
  console.log('  --help, -h             Show this help');
}

function parseArgs(argv) {
  const options = {
    mapId: '',
    seed: '',
    gridWidth: DEFAULT_GRID_WIDTH,
    gridHeight: DEFAULT_GRID_HEIGHT,
    width: DEFAULT_OUTPUT_WIDTH,
    height: DEFAULT_OUTPUT_HEIGHT,
    waterBias: DEFAULT_WATER_BIAS,
    mountainBias: DEFAULT_MOUNTAIN_BIAS,
    forestBias: DEFAULT_FOREST_BIAS,
    outputDir: SHARED_DIR,
    noSync: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--map-id':
        options.mapId = argv[i + 1] ?? '';
        i += 1;
        break;
      case '--seed':
        options.seed = argv[i + 1] ?? '';
        i += 1;
        break;
      case '--grid-width':
        options.gridWidth = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--grid-height':
        options.gridHeight = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--width':
        options.width = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--height':
        options.height = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--water-bias':
        options.waterBias = Number.parseFloat(argv[i + 1] ?? '');
        i += 1;
        break;
      case '--mountain-bias':
        options.mountainBias = Number.parseFloat(argv[i + 1] ?? '');
        i += 1;
        break;
      case '--forest-bias':
        options.forestBias = Number.parseFloat(argv[i + 1] ?? '');
        i += 1;
        break;
      case '--output-dir':
        options.outputDir = path.resolve(process.cwd(), argv[i + 1] ?? '.');
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

function assertInteger(name, value, min) {
  if (!Number.isInteger(value) || value < min) {
    console.error(`Invalid ${name}: ${value}`);
    process.exit(1);
  }
}

function assertFinite(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    console.error(`Invalid ${name}: ${value}. Expected ${min}..${max}.`);
    process.exit(1);
  }
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createNoise(width, height, rng) {
  const noise = new Float32Array(width * height);
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = rng();
  }
  return noise;
}

function blurNoise(source, width, height, passes) {
  let current = source;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Float32Array(current.length);
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        let weightedSum = 0;
        let weightTotal = 0;
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
            const sampleCol = clamp(col + colOffset, 0, width - 1);
            const sampleRow = clamp(row + rowOffset, 0, height - 1);
            const sampleIndex = sampleRow * width + sampleCol;
            const manhattan = Math.abs(rowOffset) + Math.abs(colOffset);
            const weight = manhattan === 0 ? 4 : manhattan === 1 ? 2 : 1;
            weightedSum += current[sampleIndex] * weight;
            weightTotal += weight;
          }
        }
        next[row * width + col] = weightedSum / weightTotal;
      }
    }
    current = next;
  }
  return current;
}

function chooseSwatch(type, rng) {
  const swatches = TERRAIN_SWATCHES[type];
  const index = Math.floor(rng() * swatches.length);
  return swatches[index] ?? swatches[0];
}

function colorIntToRgb(color) {
  return {
    red: (color >> 16) & 0xff,
    green: (color >> 8) & 0xff,
    blue: color & 0xff,
  };
}

function buildTerrainGrid(config, rng) {
  const width = config.gridWidth;
  const height = config.gridHeight;
  const heightNoise = blurNoise(createNoise(width, height, rng), width, height, 4);
  const moistureNoise = blurNoise(createNoise(width, height, rng), width, height, 3);
  const roughnessNoise = blurNoise(createNoise(width, height, rng), width, height, 2);
  const terrain = new Array(width * height).fill('grass');
  const elevationGrid = new Float32Array(width * height);

  const riverPhase = rng() * Math.PI * 2;
  const riverAmplitude = 0.18 + rng() * 0.12;
  const riverWidth = 0.03 + rng() * 0.03;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const edgeX = Math.min(col, width - 1 - col) / Math.max(1, width - 1);
      const edgeY = Math.min(row, height - 1 - row) / Math.max(1, height - 1);
      const edgeDistance = Math.min(edgeX, edgeY) * 2;
      const elevation =
        heightNoise[index] * 0.72 +
        roughnessNoise[index] * 0.28 +
        (edgeDistance - 0.5) * 0.30;
      elevationGrid[index] = clamp(elevation, 0, 1);
      const moisture = moistureNoise[index];

      const riverCenterX =
        (0.5 + Math.sin((row / Math.max(1, height - 1)) * Math.PI * 2 + riverPhase) * riverAmplitude) *
        width;
      const riverDistance = Math.abs(col - riverCenterX) / width;
      const riverCarves = riverDistance < riverWidth && rng() < 0.68;

      const waterThreshold =
        0.35 - edgeDistance * 0.18 + config.waterBias;
      if (elevation < waterThreshold || riverCarves) {
        terrain[index] = 'water';
        continue;
      }

      const mountainScore =
        elevation * 0.75 +
        roughnessNoise[index] * 0.70 -
        moisture * 0.28 +
        config.mountainBias;
      if (mountainScore > 0.88 && edgeDistance > 0.12) {
        terrain[index] = 'mountains';
        continue;
      }
      if (mountainScore > 0.72) {
        terrain[index] = 'hills';
        continue;
      }

      if (moisture + config.forestBias > 0.56 && elevation > waterThreshold + 0.03) {
        terrain[index] = 'forest';
      } else {
        terrain[index] = 'grass';
      }
    }
  }

  // Light smoothing pass to reduce one-cell speckles.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = terrain.slice();
    for (let row = 1; row < height - 1; row += 1) {
      for (let col = 1; col < width - 1; col += 1) {
        const counts = new Map(TERRAIN_TYPES.map((type) => [type, 0]));
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
            const index = (row + rowOffset) * width + (col + colOffset);
            const type = terrain[index];
            counts.set(type, (counts.get(type) ?? 0) + 1);
          }
        }
        let dominantType = terrain[row * width + col];
        let dominantCount = 0;
        for (const [type, count] of counts) {
          if (count > dominantCount) {
            dominantCount = count;
            dominantType = type;
          }
        }
        if (dominantCount >= 5) {
          next[row * width + col] = dominantType;
        }
      }
    }
    for (let i = 0; i < terrain.length; i += 1) {
      terrain[i] = next[i];
    }
  }

  return { terrain, elevationGrid };
}

function findNearestPlayableCell(
  terrain,
  width,
  height,
  targetCol,
  targetRow,
) {
  const maxRadius = Math.max(width, height);
  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        if (
          Math.abs(colOffset) !== radius &&
          Math.abs(rowOffset) !== radius
        ) {
          continue;
        }
        const col = clamp(targetCol + colOffset, 0, width - 1);
        const row = clamp(targetRow + rowOffset, 0, height - 1);
        const index = row * width + col;
        const type = terrain[index];
        if (type !== 'water' && type !== 'mountains') {
          return { col, row };
        }
      }
    }
  }
  return { col: clamp(targetCol, 0, width - 1), row: clamp(targetRow, 0, height - 1) };
}

function placeCityMarkers(terrain, width, height) {
  const redAnchor = findNearestPlayableCell(
    terrain,
    width,
    height,
    Math.round(width * 0.16),
    Math.round(height * 0.50),
  );
  const blueAnchor = findNearestPlayableCell(
    terrain,
    width,
    height,
    Math.round(width * 0.84),
    Math.round(height * 0.50),
  );
  const neutralA = findNearestPlayableCell(
    terrain,
    width,
    height,
    Math.round(width * 0.50),
    Math.round(height * 0.30),
  );
  const neutralB = findNearestPlayableCell(
    terrain,
    width,
    height,
    Math.round(width * 0.50),
    Math.round(height * 0.70),
  );

  const markers = [];
  for (const anchor of [redAnchor, blueAnchor]) {
    // 2x2 marker for robust component detection.
    for (let rowOffset = 0; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = 0; colOffset <= 1; colOffset += 1) {
        markers.push({
          col: clamp(anchor.col + colOffset, 0, width - 1),
          row: clamp(anchor.row + rowOffset, 0, height - 1),
        });
      }
    }
  }
  markers.push(neutralA, neutralB);

  return markers;
}

function buildPixelColors(terrain, cityMarkers, width, height, rng) {
  const cityMarkerSet = new Set(
    cityMarkers.map((marker) => `${marker.col},${marker.row}`),
  );
  const pixels = new Array(width * height).fill(0);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      if (cityMarkerSet.has(`${col},${row}`)) {
        pixels[index] = CITY_MARKER_COLOR;
        continue;
      }
      pixels[index] = chooseSwatch(terrain[index], rng);
    }
  }

  return pixels;
}

function toPpm(width, height, pixels) {
  const lines = [`P3`, `${width} ${height}`, `255`];
  for (let i = 0; i < pixels.length; i += 1) {
    const rgb = colorIntToRgb(pixels[i]);
    lines.push(`${rgb.red} ${rgb.green} ${rgb.blue}`);
  }
  return `${lines.join('\n')}\n`;
}

function runMagick(args) {
  const result = spawnSync('magick', args, { stdio: 'pipe', encoding: 'utf8' });
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

function runSyncMaps(outputDir) {
  const result = spawnSync(process.execPath, ['./scripts/sync-maps.mjs', outputDir], {
    cwd: SHARED_DIR,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const options = parseArgs(process.argv.slice(2));
assertInteger('grid width', options.gridWidth, 8);
assertInteger('grid height', options.gridHeight, 8);
assertInteger('output width', options.width, 64);
assertInteger('output height', options.height, 64);
assertFinite('water bias', options.waterBias, -0.25, 0.25);
assertFinite('mountain bias', options.mountainBias, -0.25, 0.25);
assertFinite('forest bias', options.forestBias, -0.25, 0.25);

try {
  accessSync(options.outputDir, constants.W_OK);
} catch {
  console.error(`Output directory not writable: ${options.outputDir}`);
  process.exit(1);
}

const seedText =
  options.seed.trim().length > 0
    ? options.seed.trim()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
const seed = hashSeed(seedText);
const rng = createRng(seed);

const mapId =
  options.mapId.trim().length > 0
    ? options.mapId.trim()
    : `random-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`;

if (!/^[a-zA-Z0-9._-]+$/.test(mapId)) {
  console.error(`Invalid map ID "${mapId}". Use letters, numbers, dot, underscore, or dash.`);
  process.exit(1);
}

const { terrain, elevationGrid } = buildTerrainGrid(
  {
    gridWidth: options.gridWidth,
    gridHeight: options.gridHeight,
    waterBias: options.waterBias,
    mountainBias: options.mountainBias,
    forestBias: options.forestBias,
  },
  rng,
);
const cityMarkers = placeCityMarkers(
  terrain,
  options.gridWidth,
  options.gridHeight,
);
const pixels = buildPixelColors(
  terrain,
  cityMarkers,
  options.gridWidth,
  options.gridHeight,
  rng,
);

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tb-random-map-'));
const ppmPath = path.join(tempDir, `${mapId}.ppm`);
const sourcePath = path.join(options.outputDir, `${mapId}.png`);
const quantizedPath = path.join(options.outputDir, `${mapId}-16c.png`);
const elevationGridPath = path.join(
  options.outputDir,
  `${mapId}${ELEVATION_GRID_SUFFIX}`,
);

try {
  writeFileSync(
    ppmPath,
    toPpm(options.gridWidth, options.gridHeight, pixels),
    'utf8',
  );
  runMagick([
    ppmPath,
    '-filter',
    'point',
    '-resize',
    `${options.width}x${options.height}!`,
    sourcePath,
  ]);
  runMagick([
    sourcePath,
    '-dither',
    'None',
    '-colors',
    '16',
    '-type',
    'Palette',
    quantizedPath,
  ]);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

writeFileSync(
  elevationGridPath,
  `${JSON.stringify({
    mapId,
    gridWidth: options.gridWidth,
    gridHeight: options.gridHeight,
    elevation: Array.from(elevationGrid, (value) =>
      Math.round(clamp(value, 0, 1) * 255),
    ),
  })}\n`,
  'utf8',
);

if (!options.noSync) {
  runSyncMaps(options.outputDir);
}

console.log(`Generated map ID: ${mapId}`);
console.log(`Seed: ${seedText}`);
console.log(`Source map: ${sourcePath}`);
console.log(`Quantized map: ${quantizedPath}`);
console.log(`Elevation grid: ${elevationGridPath}`);
if (options.noSync) {
  console.log('Skipped map:sync (--no-sync).');
} else {
  console.log('map:sync completed (gameplayConfig + terrainGrid updated).');
}
