#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
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
const DEFAULT_METHOD = 'wfc';
const DEFAULT_WATER_MODE = 'auto';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = path.resolve(SCRIPT_DIR, '..');
const ELEVATION_GRID_SUFFIX = '.elevation-grid.json';
const HILL_ELEVATION_BYTE_MIN = 152;
const HILL_ELEVATION_BYTE_MAX = 208;
const GENERATION_METHODS = ['noise', 'wfc', 'auto'];
const WATER_MODES = ['auto', 'none', 'lake', 'river'];

const TERRAIN_SWATCHES = {
  water: [0x0f2232, 0x102236],
  grass: [0x71844b],
  forest: [0x364d31, 0x122115],
  hills: [0xc4a771, 0x9e8c5d, 0xa79168],
  mountains: [0x708188, 0x6d7e85, 0x5a6960, 0x404b3c, 0x6a7c8c],
};
const CITY_MARKER_COLOR = 0xefb72f;
const TERRAIN_TYPES = ['water', 'grass', 'forest', 'hills', 'mountains'];
const TERRAIN_CODE_BY_TYPE = {
  water: 'w',
  grass: 'g',
  forest: 'f',
  hills: 'h',
  mountains: 'm',
};

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
  console.log(`  --method <name>        noise | wfc | auto (default: ${DEFAULT_METHOD})`);
  console.log(
    `  --water-mode <name>    auto | none | lake | river (default: ${DEFAULT_WATER_MODE})`,
  );
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
    method: DEFAULT_METHOD,
    waterMode: DEFAULT_WATER_MODE,
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
      case '--method':
        options.method = (argv[i + 1] ?? '').trim().toLowerCase();
        i += 1;
        break;
      case '--water-mode':
        options.waterMode = (argv[i + 1] ?? '').trim().toLowerCase();
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

function assertGenerationMethod(method) {
  if (!GENERATION_METHODS.includes(method)) {
    console.error(
      `Invalid method: ${method}. Expected one of: ${GENERATION_METHODS.join(', ')}.`,
    );
    process.exit(1);
  }
}

function assertWaterMode(waterMode) {
  if (!WATER_MODES.includes(waterMode)) {
    console.error(
      `Invalid water mode: ${waterMode}. Expected one of: ${WATER_MODES.join(', ')}.`,
    );
    process.exit(1);
  }
}

function resolveGenerationMethod(method, rng) {
  if (method === 'auto') {
    return rng() < 0.5 ? 'noise' : 'wfc';
  }
  return method;
}

function resolveWaterMode(waterMode, rng) {
  if (waterMode !== 'auto') {
    return waterMode;
  }

  const roll = rng();
  if (roll < 0.68) {
    return 'river';
  }
  if (roll < 0.90) {
    return 'lake';
  }
  return 'none';
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

function getColorLuminance(color) {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

const HILL_SWATCHES_DARKEST_TO_LIGHTEST = [...TERRAIN_SWATCHES.hills].sort(
  (a, b) => getColorLuminance(a) - getColorLuminance(b),
);

function chooseHillSwatchForElevation(elevation) {
  const swatches = HILL_SWATCHES_DARKEST_TO_LIGHTEST;
  if (swatches.length === 0) {
    return { color: 0, levelIndex: 0 };
  }
  if (swatches.length === 1) {
    return { color: swatches[0], levelIndex: 0 };
  }

  const clampedElevation = clamp(elevation, 0, 1);
  const levelIndex = Math.round((1 - clampedElevation) * (swatches.length - 1));
  return {
    color: swatches[levelIndex] ?? swatches[swatches.length - 1],
    levelIndex,
  };
}

function getHillQuantileThresholds(terrain, elevationGrid, levelCount) {
  if (levelCount <= 1) {
    return [];
  }

  const hillElevations = [];
  for (let index = 0; index < terrain.length; index += 1) {
    if (terrain[index] !== 'hills') {
      continue;
    }
    hillElevations.push(clamp(elevationGrid[index] ?? 0, 0, 1));
  }

  if (hillElevations.length === 0) {
    return [];
  }

  hillElevations.sort((a, b) => a - b);
  const thresholds = [];
  for (let split = 1; split < levelCount; split += 1) {
    const rank = Math.floor((hillElevations.length * split) / levelCount);
    const clampedRank = clamp(rank, 0, hillElevations.length - 1);
    thresholds.push(hillElevations[clampedRank]);
  }
  return thresholds;
}

function chooseHillSwatchForQuantileElevation(elevation, thresholds) {
  const swatches = HILL_SWATCHES_DARKEST_TO_LIGHTEST;
  const levelCount = swatches.length;
  if (levelCount <= 1) {
    return chooseHillSwatchForElevation(elevation);
  }

  const clampedElevation = clamp(elevation, 0, 1);
  let quantileBin = 0;
  while (
    quantileBin < thresholds.length &&
    clampedElevation >= thresholds[quantileBin]
  ) {
    quantileBin += 1;
  }
  const levelIndex = clamp(levelCount - 1 - quantileBin, 0, levelCount - 1);
  return {
    color: swatches[levelIndex] ?? swatches[swatches.length - 1],
    levelIndex,
  };
}

function getHillElevationByteForLevel(levelIndex, levelCount) {
  if (levelCount <= 1) {
    return HILL_ELEVATION_BYTE_MAX;
  }

  const clampedLevelIndex = clamp(levelIndex, 0, levelCount - 1);
  const ratio = 1 - clampedLevelIndex / (levelCount - 1);
  return Math.round(
    HILL_ELEVATION_BYTE_MIN +
      (HILL_ELEVATION_BYTE_MAX - HILL_ELEVATION_BYTE_MIN) * ratio,
  );
}

function colorIntToRgb(color) {
  return {
    red: (color >> 16) & 0xff,
    green: (color >> 8) & 0xff,
    blue: color & 0xff,
  };
}

function buildNoiseTerrainGrid(config, rng) {
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

const WFC_ALLOWED_NEIGHBORS = {
  water: new Set(['water', 'grass', 'forest']),
  grass: new Set(['water', 'grass', 'forest', 'hills']),
  forest: new Set(['water', 'grass', 'forest', 'hills']),
  hills: new Set(['grass', 'forest', 'hills', 'mountains']),
  mountains: new Set(['hills', 'mountains']),
};
const WFC_BASE_TARGET_RATIOS = {
  water: 0.18,
  grass: 0.44,
  forest: 0.20,
  hills: 0.14,
  mountains: 0.04,
};

function randomIntInclusive(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function createTerrainCounts() {
  return {
    water: 0,
    grass: 0,
    forest: 0,
    hills: 0,
    mountains: 0,
  };
}

function getResolvedDomainCounts(domains) {
  const counts = createTerrainCounts();
  let resolvedCellCount = 0;
  for (const domain of domains) {
    if (domain.size !== 1) {
      continue;
    }
    const type = Array.from(domain)[0];
    if (!(type in counts)) {
      continue;
    }
    counts[type] += 1;
    resolvedCellCount += 1;
  }
  return { counts, resolvedCellCount };
}

function getWfcTargetRatios(config) {
  const waterMode = config.waterMode ?? 'river';
  let water;
  if (waterMode === 'none') {
    water = 0;
  } else if (waterMode === 'river') {
    water = clamp(0.10 + config.waterBias * 0.28, 0.03, 0.20);
  } else if (waterMode === 'lake') {
    water = clamp(0.17 + config.waterBias * 0.48, 0.08, 0.30);
  } else {
    water = clamp(WFC_BASE_TARGET_RATIOS.water + config.waterBias * 0.55, 0.08, 0.32);
  }
  let mountains = clamp(
    WFC_BASE_TARGET_RATIOS.mountains + config.mountainBias * 0.18,
    0.01,
    0.09,
  );
  let forest = clamp(
    WFC_BASE_TARGET_RATIOS.forest + config.forestBias * 0.40,
    0.08,
    0.30,
  );
  let hills = clamp(
    WFC_BASE_TARGET_RATIOS.hills + config.mountainBias * 0.12 - config.forestBias * 0.06,
    0.08,
    0.22,
  );

  let nonGrassTotal = water + mountains + forest + hills;
  if (nonGrassTotal > 0.65) {
    const scale = 0.65 / nonGrassTotal;
    water *= scale;
    mountains *= scale;
    forest *= scale;
    hills *= scale;
    nonGrassTotal = 0.65;
  }

  const grass = clamp(1 - nonGrassTotal, 0.35, 0.72);
  return { water, grass, forest, hills, mountains };
}

function getWfcFrequencyMultiplier(
  type,
  terrainCounts,
  resolvedCellCount,
  targetRatios,
) {
  const targetRatio = targetRatios[type] ?? 0;
  if (targetRatio <= 0) {
    return 0.15;
  }
  if (resolvedCellCount <= 0) {
    return 1;
  }

  const currentRatio = (terrainCounts[type] ?? 0) / resolvedCellCount;
  if (currentRatio > targetRatio) {
    const overshoot = (currentRatio - targetRatio) / targetRatio;
    return clamp(1 - overshoot * 0.92, 0.12, 1);
  }

  const undershoot = (targetRatio - currentRatio) / targetRatio;
  return 1 + clamp(undershoot * 1.2, 0, 1.35);
}

function chooseWeightedValue(candidates, rng) {
  let totalWeight = 0;
  for (const candidate of candidates) {
    totalWeight += candidate.weight;
  }
  if (totalWeight <= 0) {
    const fallbackIndex = Math.floor(rng() * candidates.length);
    return candidates[fallbackIndex]?.value ?? candidates[0]?.value;
  }

  let cursor = rng() * totalWeight;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) {
      return candidate.value;
    }
  }
  return candidates[candidates.length - 1]?.value ?? candidates[0]?.value;
}

function createInteriorSeed(width, height, rng, margin = 3) {
  const minCol = clamp(margin, 0, width - 1);
  const maxCol = clamp(width - 1 - margin, 0, width - 1);
  const minRow = clamp(margin, 0, height - 1);
  const maxRow = clamp(height - 1 - margin, 0, height - 1);
  return {
    col: randomIntInclusive(rng, minCol, Math.max(minCol, maxCol)),
    row: randomIntInclusive(rng, minRow, Math.max(minRow, maxRow)),
  };
}

function createEdgeSeed(width, height, rng) {
  const side = randomIntInclusive(rng, 0, 3);
  if (side === 0) {
    return { col: randomIntInclusive(rng, 0, width - 1), row: 0 };
  }
  if (side === 1) {
    return { col: randomIntInclusive(rng, 0, width - 1), row: height - 1 };
  }
  if (side === 2) {
    return { col: 0, row: randomIntInclusive(rng, 0, height - 1) };
  }
  return { col: width - 1, row: randomIntInclusive(rng, 0, height - 1) };
}

function indexToCell(index, width) {
  return {
    col: index % width,
    row: Math.floor(index / width),
  };
}

function addIndexDisk(indexes, width, height, centerCol, centerRow, radius, rng) {
  for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
    for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
      const distance = Math.hypot(colOffset, rowOffset);
      if (distance > radius + 0.25) {
        continue;
      }
      const col = clamp(centerCol + colOffset, 0, width - 1);
      const row = clamp(centerRow + rowOffset, 0, height - 1);
      if (distance > radius - 0.35 && rng() < 0.30) {
        continue;
      }
      indexes.add(row * width + col);
    }
  }
}

function stampWaterPath(path, width, height, waterIndexes, rng, options) {
  const baseRadius = options?.baseRadius ?? 0;
  const widenChance = options?.widenChance ?? 0;
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    let radius = baseRadius;
    if (rng() < widenChance) {
      radius += 1;
    }
    addIndexDisk(waterIndexes, width, height, cell.col, cell.row, radius, rng);
  }
}

function createSpacedInteriorSeeds(width, height, rng, seedCount, margin, minSpacing) {
  const seeds = [];
  if (seedCount <= 0) {
    return seeds;
  }

  for (let i = 0; i < seedCount; i += 1) {
    let bestCandidate = createInteriorSeed(width, height, rng, margin);
    let bestCandidateDistance = -1;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = createInteriorSeed(width, height, rng, margin);
      if (seeds.length === 0) {
        bestCandidate = candidate;
        break;
      }

      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const seed of seeds) {
        const distance = Math.hypot(seed.col - candidate.col, seed.row - candidate.row);
        nearestDistance = Math.min(nearestDistance, distance);
      }
      if (nearestDistance >= minSpacing) {
        bestCandidate = candidate;
        bestCandidateDistance = nearestDistance;
        break;
      }
      if (nearestDistance > bestCandidateDistance) {
        bestCandidate = candidate;
        bestCandidateDistance = nearestDistance;
      }
    }
    seeds.push(bestCandidate);
  }
  return seeds;
}

function createFeatureClusterPlan(
  width,
  height,
  rng,
  seedCountRange,
  margin,
  minSpacing,
  radiusRange,
  lobeCountRange,
) {
  const seedCount = randomIntInclusive(rng, seedCountRange.min, seedCountRange.max);
  const seeds = createSpacedInteriorSeeds(
    width,
    height,
    rng,
    seedCount,
    margin,
    minSpacing,
  );
  const indexes = new Set();

  for (const seed of seeds) {
    const radius = randomIntInclusive(rng, radiusRange.min, radiusRange.max);
    addIndexDisk(indexes, width, height, seed.col, seed.row, radius, rng);
    const lobeCount = randomIntInclusive(rng, lobeCountRange.min, lobeCountRange.max);
    for (let lobe = 0; lobe < lobeCount; lobe += 1) {
      const lobeAngle = rng() * Math.PI * 2;
      const lobeDistance = randomIntInclusive(
        rng,
        Math.max(1, Math.floor(radius * 0.35)),
        Math.max(2, Math.floor(radius * 0.95)),
      );
      const lobeCol = clamp(
        Math.round(seed.col + Math.cos(lobeAngle) * lobeDistance),
        0,
        width - 1,
      );
      const lobeRow = clamp(
        Math.round(seed.row + Math.sin(lobeAngle) * lobeDistance),
        0,
        height - 1,
      );
      const lobeRadius = Math.max(1, radius - randomIntInclusive(rng, 1, 2));
      addIndexDisk(indexes, width, height, lobeCol, lobeRow, lobeRadius, rng);
    }
  }

  return {
    seedCells: seeds,
    indexes,
  };
}

function createMainRiverPath(width, height, rng) {
  const horizontal = rng() < 0.5;
  const cells = [];
  if (horizontal) {
    const startAtLeft = rng() < 0.5;
    const startRow = randomIntInclusive(rng, Math.max(2, Math.floor(height * 0.18)), Math.max(2, Math.floor(height * 0.82)));
    const endRow = randomIntInclusive(rng, Math.max(2, Math.floor(height * 0.18)), Math.max(2, Math.floor(height * 0.82)));
    const waveAmplitude = Math.max(1.5, height * (0.06 + rng() * 0.08));
    const waveCycles = 0.85 + rng() * 1.15;
    const phase = rng() * Math.PI * 2;
    let rowFloat = startRow;
    for (let step = 0; step < width; step += 1) {
      const progress = step / Math.max(1, width - 1);
      const col = startAtLeft ? step : width - 1 - step;
      const trend = startRow + (endRow - startRow) * progress;
      const wave = Math.sin(progress * Math.PI * 2 * waveCycles + phase) * waveAmplitude;
      const targetRow = trend + wave;
      rowFloat += (targetRow - rowFloat) * 0.38 + (rng() - 0.5) * 0.55;
      const row = clamp(Math.round(rowFloat), 1, height - 2);
      cells.push({ col, row });
    }
  } else {
    const startAtTop = rng() < 0.5;
    const startCol = randomIntInclusive(rng, Math.max(2, Math.floor(width * 0.16)), Math.max(2, Math.floor(width * 0.84)));
    const endCol = randomIntInclusive(rng, Math.max(2, Math.floor(width * 0.16)), Math.max(2, Math.floor(width * 0.84)));
    const waveAmplitude = Math.max(2, width * (0.05 + rng() * 0.08));
    const waveCycles = 0.85 + rng() * 1.15;
    const phase = rng() * Math.PI * 2;
    let colFloat = startCol;
    for (let step = 0; step < height; step += 1) {
      const progress = step / Math.max(1, height - 1);
      const row = startAtTop ? step : height - 1 - step;
      const trend = startCol + (endCol - startCol) * progress;
      const wave = Math.sin(progress * Math.PI * 2 * waveCycles + phase) * waveAmplitude;
      const targetCol = trend + wave;
      colFloat += (targetCol - colFloat) * 0.38 + (rng() - 0.5) * 0.80;
      const col = clamp(Math.round(colFloat), 1, width - 2);
      cells.push({ col, row });
    }
  }
  return { cells, horizontal };
}

function createMeanderingPathToTarget(start, target, width, height, rng) {
  const path = [{ col: start.col, row: start.row }];
  let col = start.col;
  let row = start.row;
  const maxSteps = width + height + Math.max(width, height) * 2;

  for (let step = 0; step < maxSteps; step += 1) {
    if (col === target.col && row === target.row) {
      return path;
    }
    const deltaCol = target.col - col;
    const deltaRow = target.row - row;
    const preferHorizontal = Math.abs(deltaCol) >= Math.abs(deltaRow);
    let stepCol = 0;
    let stepRow = 0;
    if (preferHorizontal && deltaCol !== 0) {
      stepCol = Math.sign(deltaCol);
    } else if (deltaRow !== 0) {
      stepRow = Math.sign(deltaRow);
    } else if (deltaCol !== 0) {
      stepCol = Math.sign(deltaCol);
    }

    if (rng() < 0.30) {
      if (preferHorizontal && deltaRow !== 0) {
        stepCol = 0;
        stepRow = Math.sign(deltaRow);
      } else if (!preferHorizontal && deltaCol !== 0) {
        stepRow = 0;
        stepCol = Math.sign(deltaCol);
      }
    }

    if (stepCol === 0 && stepRow === 0) {
      break;
    }

    col = clamp(col + stepCol, 0, width - 1);
    row = clamp(row + stepRow, 0, height - 1);
    path.push({ col, row });
  }

  const tail = getLineCells({ col, row }, target);
  for (let i = 1; i < tail.length; i += 1) {
    path.push(tail[i]);
  }
  return path;
}

function createRiverWaterPlan(width, height, rng) {
  const waterIndexes = new Set();
  const mainRiver = createMainRiverPath(width, height, rng);
  stampWaterPath(mainRiver.cells, width, height, waterIndexes, rng, {
    baseRadius: rng() < 0.74 ? 0 : 1,
    widenChance: 0.22,
  });

  const tributaryCount = randomIntInclusive(rng, 0, 3);
  for (let i = 0; i < tributaryCount; i += 1) {
    const branchIndex = randomIntInclusive(
      rng,
      Math.max(1, Math.floor(mainRiver.cells.length * 0.20)),
      Math.max(1, Math.floor(mainRiver.cells.length * 0.80)),
    );
    const branchCell = mainRiver.cells[branchIndex] ?? mainRiver.cells[Math.floor(mainRiver.cells.length / 2)];
    let start;
    if (mainRiver.horizontal) {
      const fromTop = rng() < 0.5;
      const colOffsetRange = Math.max(4, Math.floor(width * 0.24));
      start = {
        col: clamp(
          branchCell.col + randomIntInclusive(rng, -colOffsetRange, colOffsetRange),
          0,
          width - 1,
        ),
        row: fromTop ? 0 : height - 1,
      };
    } else {
      const fromLeft = rng() < 0.5;
      const rowOffsetRange = Math.max(3, Math.floor(height * 0.24));
      start = {
        col: fromLeft ? 0 : width - 1,
        row: clamp(
          branchCell.row + randomIntInclusive(rng, -rowOffsetRange, rowOffsetRange),
          0,
          height - 1,
        ),
      };
    }
    const tributaryPath = createMeanderingPathToTarget(start, branchCell, width, height, rng);
    stampWaterPath(tributaryPath, width, height, waterIndexes, rng, {
      baseRadius: 0,
      widenChance: 0.12,
    });
  }

  const seedCells = Array.from(waterIndexes, (index) => indexToCell(index, width));
  return {
    waterIndexes,
    seedCells,
    tributaryCount,
  };
}

function createLakeWaterPlan(width, height, rng) {
  const waterIndexes = new Set();
  const lakeCenters = [];
  const lakeCount = randomIntInclusive(rng, 1, 2);
  const centerMarginCol = Math.max(6, Math.floor(width * 0.12));
  const centerMarginRow = Math.max(4, Math.floor(height * 0.16));

  for (let i = 0; i < lakeCount; i += 1) {
    let center = createInteriorSeed(width, height, rng, Math.max(centerMarginCol, centerMarginRow));
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = createInteriorSeed(
        width,
        height,
        rng,
        Math.max(centerMarginCol, centerMarginRow),
      );
      const farEnough = lakeCenters.every(
        (existing) => Math.hypot(existing.col - candidate.col, existing.row - candidate.row) >= Math.max(7, width * 0.14),
      );
      if (farEnough) {
        center = candidate;
        break;
      }
    }
    lakeCenters.push(center);

    const radius = randomIntInclusive(rng, 4, 8);
    addIndexDisk(waterIndexes, width, height, center.col, center.row, radius, rng);
    const lobeCount = randomIntInclusive(rng, 1, 3);
    for (let lobe = 0; lobe < lobeCount; lobe += 1) {
      const lobeAngle = rng() * Math.PI * 2;
      const lobeDistance = randomIntInclusive(rng, Math.max(1, Math.floor(radius * 0.35)), Math.max(2, Math.floor(radius * 0.9)));
      const lobeCenterCol = clamp(Math.round(center.col + Math.cos(lobeAngle) * lobeDistance), 0, width - 1);
      const lobeCenterRow = clamp(Math.round(center.row + Math.sin(lobeAngle) * lobeDistance), 0, height - 1);
      const lobeRadius = Math.max(2, radius - randomIntInclusive(rng, 1, 3));
      addIndexDisk(waterIndexes, width, height, lobeCenterCol, lobeCenterRow, lobeRadius, rng);
    }
  }

  const seedCells = Array.from(waterIndexes, (index) => indexToCell(index, width));
  return {
    waterIndexes,
    seedCells,
  };
}

function createAffinityField(width, height, seeds, influenceRadiusCells, power = 1.8) {
  const field = new Float32Array(width * height);
  const safeRadius = Math.max(1, influenceRadiusCells);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const seed of seeds) {
        const dx = col - seed.col;
        const dy = row - seed.row;
        const distance = Math.hypot(dx, dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
        }
      }
      const normalized = clamp(1 - nearestDistance / safeRadius, 0, 1);
      field[index] = normalized ** power;
    }
  }
  return field;
}

function createEdgeProximityField(width, height) {
  const field = new Float32Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const edgeX = Math.min(col, width - 1 - col) / Math.max(1, width - 1);
      const edgeY = Math.min(row, height - 1 - row) / Math.max(1, height - 1);
      const edgeDistance = Math.min(edgeX, edgeY) * 2;
      field[row * width + col] = clamp(1 - edgeDistance, 0, 1);
    }
  }
  return field;
}

function getNeighborIndexes(index, width, height) {
  const neighbors = [];
  const col = index % width;
  const row = Math.floor(index / width);
  if (col > 0) {
    neighbors.push(index - 1);
  }
  if (col < width - 1) {
    neighbors.push(index + 1);
  }
  if (row > 0) {
    neighbors.push(index - width);
  }
  if (row < height - 1) {
    neighbors.push(index + width);
  }
  return neighbors;
}

function createWfcDomains(cellCount) {
  return Array.from({ length: cellCount }, () => new Set(TERRAIN_TYPES));
}

function constrainDomainToType(domains, index, type) {
  const domain = domains[index];
  if (!domain.has(type)) {
    return false;
  }
  if (domain.size === 1) {
    return true;
  }
  domain.clear();
  domain.add(type);
  return true;
}

function propagateWfcConstraints(domains, width, height, queue) {
  while (queue.length > 0) {
    const index = queue.pop();
    const sourceDomain = domains[index];
    const neighborIndexes = getNeighborIndexes(index, width, height);
    for (const neighborIndex of neighborIndexes) {
      const neighborDomain = domains[neighborIndex];
      let changed = false;
      for (const neighborType of Array.from(neighborDomain)) {
        let supported = false;
        for (const sourceType of sourceDomain) {
          const allowed = WFC_ALLOWED_NEIGHBORS[sourceType];
          if (allowed && allowed.has(neighborType)) {
            supported = true;
            break;
          }
        }
        if (!supported) {
          neighborDomain.delete(neighborType);
          changed = true;
        }
      }
      if (neighborDomain.size === 0) {
        return false;
      }
      if (changed) {
        queue.push(neighborIndex);
      }
    }
  }
  return true;
}

function pickNextWfcCellIndex(domains, rng) {
  let minEntropy = Number.POSITIVE_INFINITY;
  const candidates = [];
  for (let index = 0; index < domains.length; index += 1) {
    const entropy = domains[index].size;
    if (entropy <= 1) {
      continue;
    }
    if (entropy < minEntropy) {
      minEntropy = entropy;
      candidates.length = 0;
      candidates.push(index);
      continue;
    }
    if (entropy === minEntropy) {
      candidates.push(index);
    }
  }
  if (candidates.length === 0) {
    return -1;
  }
  return candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
}

function chooseWfcTypeForCell(
  domain,
  index,
  width,
  height,
  edgeField,
  waterAffinity,
  forestAffinity,
  hillAffinity,
  mountainAffinity,
  moistureNoise,
  roughnessNoise,
  config,
  terrainCounts,
  resolvedCellCount,
  targetRatios,
  waterMode,
  rng,
) {
  const col = index % width;
  const row = Math.floor(index / width);
  const edge = edgeField[index] ?? 0;
  const moisture = moistureNoise[index] ?? 0.5;
  const roughness = roughnessNoise[index] ?? 0.5;
  const waterNear = waterAffinity[index] ?? 0;
  const forestNear = forestAffinity[index] ?? 0;
  const hillNear = hillAffinity[index] ?? 0;
  const mountainNear = mountainAffinity[index] ?? 0;
  const centerBiasX =
    1 - Math.abs(col / Math.max(1, width - 1) - 0.5) * 2;
  const centerBiasY =
    1 - Math.abs(row / Math.max(1, height - 1) - 0.5) * 2;
  const centerBias = clamp((centerBiasX + centerBiasY) * 0.5, 0, 1);

  let waterWeight =
    0.03 +
    edge * (0.95 + config.waterBias * 2) +
    waterNear * 1.35 +
    (0.55 - moisture) * 0.24;
  if (waterMode === 'none') {
    waterWeight = 0.0001;
  } else if (waterMode === 'lake') {
    waterWeight =
      0.02 +
      waterNear * 2.10 +
      (0.5 - Math.abs(moisture - 0.5)) * 0.12 +
      centerBias * 0.08;
  } else if (waterMode === 'river') {
    waterWeight =
      0.01 +
      waterNear * 2.45 +
      (0.56 - moisture) * 0.08 +
      roughness * 0.10;
    if (waterNear < 0.20) {
      waterWeight *= 0.07;
    }
  }

  const weightsByType = {
    water: waterWeight,
    grass:
      0.65 +
      (1 - edge) * 0.35 +
      (0.5 - Math.abs(moisture - 0.5)) * 0.2 +
      centerBias * 0.12 -
      forestNear * 0.20 -
      hillNear * 0.14,
    forest:
      0.25 +
      moisture * 1.05 +
      config.forestBias * 2 +
      (1 - edge) * 0.16 +
      forestNear * 1.35 +
      hillNear * 0.15 +
      mountainNear * -0.40 +
      (forestNear < 0.10 ? -0.18 : 0),
    hills:
      0.23 +
      roughness * 0.96 +
      mountainNear * 0.35 +
      centerBias * 0.2 +
      hillNear * 1.20 +
      forestNear * 0.18 +
      (hillNear < 0.08 ? -0.16 : 0),
    mountains:
      0.04 +
      mountainNear * 1.55 +
      roughness * 0.82 +
      config.mountainBias * 2 +
      centerBias * 0.2 -
      forestNear * 0.45 -
      edge * 0.25,
  };

  const weighted = Array.from(domain, (type) => {
    const localWeight = Math.max(0.001, weightsByType[type] ?? 0.001);
    const frequencyMultiplier = getWfcFrequencyMultiplier(
      type,
      terrainCounts,
      resolvedCellCount,
      targetRatios,
    );
    return {
      value: type,
      weight: Math.max(0.001, localWeight * frequencyMultiplier),
    };
  });
  return chooseWeightedValue(weighted, rng);
}

function pinWfcSeedCluster(
  domains,
  width,
  height,
  seed,
  radius,
  type,
  fillProbability,
  rng,
  queue,
) {
  for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
    for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
      const distance = Math.hypot(colOffset, rowOffset);
      if (distance > radius + 0.01) {
        continue;
      }
      if (rng() > fillProbability) {
        continue;
      }
      const col = clamp(seed.col + colOffset, 0, width - 1);
      const row = clamp(seed.row + rowOffset, 0, height - 1);
      const index = row * width + col;
      if (!constrainDomainToType(domains, index, type)) {
        return false;
      }
      queue.push(index);
    }
  }
  return true;
}

function smoothTerrain(terrain, width, height, passes) {
  for (let pass = 0; pass < passes; pass += 1) {
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
}

function isPlayableTerrainType(type) {
  return type !== 'water' && type !== 'mountains';
}

function hasPlayablePath(terrain, width, height, from, to) {
  const startIndex = from.row * width + from.col;
  const targetIndex = to.row * width + to.col;
  if (!isPlayableTerrainType(terrain[startIndex]) || !isPlayableTerrainType(terrain[targetIndex])) {
    return false;
  }

  const queue = [startIndex];
  const visited = new Set([startIndex]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetIndex) {
      return true;
    }
    const neighbors = getNeighborIndexes(current, width, height);
    for (const neighborIndex of neighbors) {
      if (visited.has(neighborIndex)) {
        continue;
      }
      if (!isPlayableTerrainType(terrain[neighborIndex])) {
        continue;
      }
      visited.add(neighborIndex);
      queue.push(neighborIndex);
    }
  }
  return false;
}

function getLineCells(start, end) {
  const cells = [];
  let x0 = start.col;
  let y0 = start.row;
  const x1 = end.col;
  const y1 = end.row;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    cells.push({ col: x0, row: y0 });
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const doubledError = err * 2;
    if (doubledError > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (doubledError < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return cells;
}

function carvePlayableCorridor(terrain, width, height, from, to, rng) {
  const line = getLineCells(from, to);
  for (const point of line) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (Math.abs(rowOffset) + Math.abs(colOffset) > 2) {
          continue;
        }
        const col = clamp(point.col + colOffset, 0, width - 1);
        const row = clamp(point.row + rowOffset, 0, height - 1);
        const index = row * width + col;
        const existing = terrain[index];
        if (existing === 'water' || existing === 'mountains') {
          terrain[index] = rng() < 0.24 ? 'hills' : 'grass';
        }
      }
    }
  }
}

function countTerrainTypes(terrain) {
  const counts = createTerrainCounts();
  for (const type of terrain) {
    if (type in counts) {
      counts[type] += 1;
    }
  }
  return counts;
}

function getLargestConnectedComponentSizeForType(terrain, width, height, terrainType) {
  const visited = new Uint8Array(terrain.length);
  let largestSize = 0;

  for (let index = 0; index < terrain.length; index += 1) {
    if (visited[index] === 1 || terrain[index] !== terrainType) {
      continue;
    }
    visited[index] = 1;
    const queue = [index];
    let componentSize = 0;
    while (queue.length > 0) {
      const current = queue.pop();
      componentSize += 1;
      const neighbors = getNeighborIndexes(current, width, height);
      for (const neighbor of neighbors) {
        if (visited[neighbor] === 1 || terrain[neighbor] !== terrainType) {
          continue;
        }
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    if (componentSize > largestSize) {
      largestSize = componentSize;
    }
  }

  return largestSize;
}

function pruneSmallComponentsSurroundedByType(
  terrain,
  width,
  height,
  terrainType,
  replacementType,
  maxComponentSize,
  minReplacementNeighborRatio,
) {
  const visited = new Uint8Array(terrain.length);
  const indexesToReplace = [];

  for (let index = 0; index < terrain.length; index += 1) {
    if (visited[index] === 1 || terrain[index] !== terrainType) {
      continue;
    }

    visited[index] = 1;
    const queue = [index];
    const component = [];
    let replacementNeighbors = 0;
    let totalBoundaryNeighbors = 0;

    while (queue.length > 0) {
      const current = queue.pop();
      component.push(current);
      const neighbors = getNeighborIndexes(current, width, height);
      for (const neighbor of neighbors) {
        const neighborType = terrain[neighbor];
        if (neighborType === terrainType) {
          if (visited[neighbor] !== 1) {
            visited[neighbor] = 1;
            queue.push(neighbor);
          }
          continue;
        }

        totalBoundaryNeighbors += 1;
        if (neighborType === replacementType) {
          replacementNeighbors += 1;
        }
      }
    }

    if (component.length > maxComponentSize || totalBoundaryNeighbors === 0) {
      continue;
    }
    const replacementNeighborRatio = replacementNeighbors / totalBoundaryNeighbors;
    if (replacementNeighborRatio < minReplacementNeighborRatio) {
      continue;
    }

    indexesToReplace.push(...component);
  }

  for (const index of indexesToReplace) {
    terrain[index] = replacementType;
  }

  return indexesToReplace.length;
}

function buildWfcElevationGrid(
  terrain,
  moistureNoise,
  roughnessNoise,
  mountainAffinity,
) {
  const baseByType = {
    water: 0.08,
    grass: 0.44,
    forest: 0.50,
    hills: 0.70,
    mountains: 0.90,
  };
  const varianceByType = {
    water: 0.06,
    grass: 0.08,
    forest: 0.09,
    hills: 0.13,
    mountains: 0.10,
  };
  const elevationGrid = new Float32Array(terrain.length);
  for (let index = 0; index < terrain.length; index += 1) {
    const type = terrain[index];
    const base = baseByType[type] ?? 0.45;
    const variance = varianceByType[type] ?? 0.05;
    const roughness = roughnessNoise[index] ?? 0.5;
    const moisture = moistureNoise[index] ?? 0.5;
    const ridge = mountainAffinity[index] ?? 0;
    const signedNoise = (roughness - 0.5) * 2;
    const moistureShift =
      type === 'water'
        ? -moisture * 0.04
        : type === 'forest'
          ? moisture * 0.03
          : 0;
    const ridgeShift = type === 'mountains' ? ridge * 0.06 : type === 'hills' ? ridge * 0.04 : 0;
    elevationGrid[index] = clamp(base + signedNoise * variance + moistureShift + ridgeShift, 0, 1);
  }
  return elevationGrid;
}

function buildWfcTerrainGrid(config, rng) {
  const width = config.gridWidth;
  const height = config.gridHeight;
  const cellCount = width * height;
  const waterMode = config.waterMode ?? 'river';
  const maxAttempts = waterMode === 'river' ? 60 : 28;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const moistureNoise = blurNoise(createNoise(width, height, rng), width, height, 3);
    const roughnessNoise = blurNoise(createNoise(width, height, rng), width, height, 2);
    const edgeField = createEdgeProximityField(width, height);

    const mountainSeeds = [];
    const mountainSeedCount = randomIntInclusive(rng, 2, 4);
    for (let i = 0; i < mountainSeedCount; i += 1) {
      mountainSeeds.push(createInteriorSeed(width, height, rng, 7));
    }

    const domains = createWfcDomains(cellCount);
    const targetRatios = getWfcTargetRatios(config);
    const queue = [];
    const forcedWaterIndexes = new Set();
    const forcedForestIndexes = new Set();
    const forcedHillIndexes = new Set();
    let waterSeeds = [];
    let forestSeeds = [];
    let hillSeeds = [];

    if (waterMode === 'none') {
      let invalid = false;
      for (const domain of domains) {
        domain.delete('water');
        if (domain.size === 0) {
          invalid = true;
          break;
        }
      }
      if (invalid) {
        continue;
      }
    } else if (waterMode === 'lake') {
      const lakePlan = createLakeWaterPlan(width, height, rng);
      waterSeeds = lakePlan.seedCells;
      for (const index of lakePlan.waterIndexes) {
        forcedWaterIndexes.add(index);
      }
    } else {
      const riverPlan = createRiverWaterPlan(width, height, rng);
      waterSeeds = riverPlan.seedCells;
      for (const index of riverPlan.waterIndexes) {
        forcedWaterIndexes.add(index);
      }
    }

    const forestPlan = createFeatureClusterPlan(
      width,
      height,
      rng,
      targetRatios.forest >= 0.22 ? { min: 3, max: 5 } : { min: 2, max: 4 },
      Math.max(5, Math.floor(width * 0.08)),
      Math.max(5, width * 0.12),
      { min: 1, max: 3 },
      { min: 1, max: 3 },
    );
    forestSeeds = forestPlan.seedCells;

    const hillPlan = createFeatureClusterPlan(
      width,
      height,
      rng,
      targetRatios.hills >= 0.16 ? { min: 3, max: 5 } : { min: 2, max: 4 },
      Math.max(5, Math.floor(width * 0.09)),
      Math.max(6, width * 0.14),
      { min: 1, max: 2 },
      { min: 1, max: 2 },
    );
    hillSeeds = hillPlan.seedCells;

    let invalidForcedWater = false;
    for (const index of forcedWaterIndexes) {
      if (!constrainDomainToType(domains, index, 'water')) {
        invalidForcedWater = true;
        break;
      }
      queue.push(index);
    }
    if (invalidForcedWater) {
      continue;
    }

    let invalidForcedTerrain = false;
    for (const index of forcedForestIndexes) {
      if (!constrainDomainToType(domains, index, 'forest')) {
        invalidForcedTerrain = true;
        break;
      }
      queue.push(index);
    }
    if (invalidForcedTerrain) {
      continue;
    }
    for (const index of forcedHillIndexes) {
      if (!constrainDomainToType(domains, index, 'hills')) {
        invalidForcedTerrain = true;
        break;
      }
      queue.push(index);
    }
    if (invalidForcedTerrain) {
      continue;
    }

    const waterAffinity =
      waterSeeds.length > 0
        ? createAffinityField(
            width,
            height,
            waterSeeds,
            waterMode === 'river' ? Math.max(3, width * 0.12) : Math.max(4, width * 0.22),
            waterMode === 'river' ? 2.6 : 2.0,
          )
        : new Float32Array(cellCount);
    const forestAffinity =
      forestSeeds.length > 0
        ? createAffinityField(width, height, forestSeeds, Math.max(5, width * 0.20), 2.2)
        : new Float32Array(cellCount);
    const hillAffinity =
      hillSeeds.length > 0
        ? createAffinityField(width, height, hillSeeds, Math.max(5, width * 0.22), 2.1)
        : new Float32Array(cellCount);
    const mountainAffinity = createAffinityField(
      width,
      height,
      mountainSeeds,
      width * 0.28,
      1.9,
    );

    for (const seed of mountainSeeds) {
      const radius = randomIntInclusive(rng, 1, 2);
      const fillProbability = 0.55 + rng() * 0.25;
      if (
        !pinWfcSeedCluster(
          domains,
          width,
          height,
          seed,
          radius,
          'mountains',
          fillProbability,
          rng,
          queue,
        )
      ) {
        queue.length = 0;
        break;
      }
    }
    if (queue.length === 0 && domains.some((domain) => domain.size !== TERRAIN_TYPES.length)) {
      continue;
    }

    if (!propagateWfcConstraints(domains, width, height, queue)) {
      continue;
    }

    let hasContradiction = false;
    while (true) {
      const index = pickNextWfcCellIndex(domains, rng);
      if (index < 0) {
        break;
      }
      const { counts: resolvedTerrainCounts, resolvedCellCount } =
        getResolvedDomainCounts(domains);
      const domain = domains[index];
      const chosenType = chooseWfcTypeForCell(
        domain,
        index,
        width,
        height,
        edgeField,
        waterAffinity,
        forestAffinity,
        hillAffinity,
        mountainAffinity,
        moistureNoise,
        roughnessNoise,
        config,
        resolvedTerrainCounts,
        resolvedCellCount,
        targetRatios,
        waterMode,
        rng,
      );
      domain.clear();
      domain.add(chosenType);
      if (!propagateWfcConstraints(domains, width, height, [index])) {
        hasContradiction = true;
        break;
      }
    }
    if (hasContradiction) {
      continue;
    }

    const terrain = domains.map((domain) => Array.from(domain)[0] ?? 'grass');
    smoothTerrain(terrain, width, height, 1);
    if (forcedWaterIndexes.size > 0) {
      for (const index of forcedWaterIndexes) {
        terrain[index] = 'water';
      }
    }
    if (forcedForestIndexes.size > 0) {
      for (const index of forcedForestIndexes) {
        if (!forcedWaterIndexes.has(index)) {
          terrain[index] = 'forest';
        }
      }
    }
    if (forcedHillIndexes.size > 0) {
      for (const index of forcedHillIndexes) {
        if (!forcedWaterIndexes.has(index)) {
          terrain[index] = 'hills';
        }
      }
    }
    // Trim noisy "island" patches that are mostly enclosed by grass.
    pruneSmallComponentsSurroundedByType(
      terrain,
      width,
      height,
      'forest',
      'grass',
      Math.max(8, Math.floor(cellCount * 0.0045)),
      0.70,
    );
    pruneSmallComponentsSurroundedByType(
      terrain,
      width,
      height,
      'hills',
      'grass',
      Math.max(7, Math.floor(cellCount * 0.0040)),
      0.67,
    );

    const counts = countTerrainTypes(terrain);
    const waterRatio = counts.water / Math.max(1, cellCount);
    const mountainRatio = counts.mountains / Math.max(1, cellCount);
    const playableRatio =
      (cellCount - counts.water - counts.mountains) / Math.max(1, cellCount);
    if (waterMode === 'none' && counts.water > 0) {
      continue;
    }
    if (waterMode === 'river' && (waterRatio < 0.04 || waterRatio > 0.22)) {
      continue;
    }
    if (waterMode === 'lake' && (waterRatio < 0.08 || waterRatio > 0.34)) {
      continue;
    }
    if (mountainRatio > 0.12 || playableRatio < 0.45) {
      continue;
    }
    if (counts.grass < counts.water || counts.grass < counts.forest || counts.grass < counts.hills) {
      continue;
    }
    if (counts.water > 0) {
      const largestWaterComponentSize = getLargestConnectedComponentSizeForType(
        terrain,
        width,
        height,
        'water',
      );
      const dominantWaterComponentRatio = largestWaterComponentSize / counts.water;
      const minimumDominantRatio =
        waterMode === 'river' ? 0.78 : waterMode === 'lake' ? 0.65 : 0.58;
      if (dominantWaterComponentRatio < minimumDominantRatio) {
        continue;
      }
    }
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
    if (!hasPlayablePath(terrain, width, height, redAnchor, blueAnchor)) {
      carvePlayableCorridor(terrain, width, height, redAnchor, blueAnchor, rng);
      smoothTerrain(terrain, width, height, 1);
      if (!hasPlayablePath(terrain, width, height, redAnchor, blueAnchor)) {
        continue;
      }
    }

    const elevationGrid = buildWfcElevationGrid(
      terrain,
      moistureNoise,
      roughnessNoise,
      mountainAffinity,
    );
    return { terrain, elevationGrid };
  }

  throw new Error('WFC map generation failed after multiple attempts.');
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

  return {
    markers,
    cityAnchors: {
      RED: redAnchor,
      BLUE: blueAnchor,
    },
    neutralCityAnchors: [neutralA, neutralB],
  };
}

function buildPixelColors(terrain, elevationGrid, cityMarkers, width, height, rng) {
  const cityMarkerSet = new Set(
    cityMarkers.map((marker) => `${marker.col},${marker.row}`),
  );
  const pixels = new Array(width * height).fill(0);
  const elevationBytes = new Uint8Array(width * height);
  const hillQuantileThresholds = getHillQuantileThresholds(
    terrain,
    elevationGrid,
    HILL_SWATCHES_DARKEST_TO_LIGHTEST.length,
  );
  for (let index = 0; index < elevationBytes.length; index += 1) {
    elevationBytes[index] = Math.round(clamp(elevationGrid[index] ?? 0, 0, 1) * 255);
  }

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      if (cityMarkerSet.has(`${col},${row}`)) {
        pixels[index] = CITY_MARKER_COLOR;
        continue;
      }
      if (terrain[index] === 'hills') {
        const hillSwatch = chooseHillSwatchForQuantileElevation(
          elevationGrid[index] ?? 0,
          hillQuantileThresholds,
        );
        pixels[index] = hillSwatch.color;
        elevationBytes[index] = getHillElevationByteForLevel(
          hillSwatch.levelIndex,
          HILL_SWATCHES_DARKEST_TO_LIGHTEST.length,
        );
        continue;
      }
      pixels[index] = chooseSwatch(terrain[index], rng);
    }
  }

  return { pixels, elevationBytes };
}

function buildTerrainCodeGrid(terrain, width, height) {
  const expectedLength = width * height;
  if (!Array.isArray(terrain)) {
    return '';
  }

  // Primary shape used by this script: flat terrain array.
  if (terrain.length === expectedLength) {
    return terrain
      .map((terrainType) => TERRAIN_CODE_BY_TYPE[terrainType] ?? 'u')
      .join('');
  }

  // Defensive fallback for 2D row/column terrain arrays.
  if (terrain.length !== height) {
    return '';
  }
  const codes = [];
  for (let row = 0; row < height; row += 1) {
    const rowValues = terrain[row];
    if (!Array.isArray(rowValues) || rowValues.length !== width) {
      return '';
    }
    for (let col = 0; col < width; col += 1) {
      const terrainType = rowValues[col];
      codes.push(TERRAIN_CODE_BY_TYPE[terrainType] ?? 'u');
    }
  }
  return codes.join('');
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

function buildAtomicTempPath(targetPath) {
  const randomSuffix = Math.floor(Math.random() * 1e9).toString(36);
  const directory = path.dirname(targetPath);
  const extension = path.extname(targetPath);
  const fileStem = path.basename(targetPath, extension);
  return path.join(
    directory,
    `${fileStem}.tmp-${process.pid}-${Date.now()}-${randomSuffix}${extension}`,
  );
}

function assertNonEmptyFile(filePath, label) {
  let stats;
  try {
    stats = statSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to validate ${label}: ${message}`);
    process.exit(1);
  }
  if (!stats.isFile() || stats.size <= 0) {
    console.error(`Invalid ${label}: expected non-empty file (${filePath}).`);
    process.exit(1);
  }
}

function assertPngSignature(filePath, label) {
  let fileBytes;
  try {
    fileBytes = readFileSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to validate ${label} PNG signature: ${message}`);
    process.exit(1);
  }

  if (fileBytes.length < 8) {
    console.error(`Invalid ${label}: file is too short to be a PNG (${filePath}).`);
    process.exit(1);
  }

  // PNG signature bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    fileBytes[0] === 0x89 &&
    fileBytes[1] === 0x50 &&
    fileBytes[2] === 0x4e &&
    fileBytes[3] === 0x47 &&
    fileBytes[4] === 0x0d &&
    fileBytes[5] === 0x0a &&
    fileBytes[6] === 0x1a &&
    fileBytes[7] === 0x0a;
  if (!isPng) {
    console.error(`Invalid ${label}: expected PNG signature (${filePath}).`);
    process.exit(1);
  }
}

function validateElevationGridSidecar(
  sidecarPath,
  {
    mapId,
    gridWidth,
    gridHeight,
  },
) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Invalid elevation sidecar JSON at ${sidecarPath}: ${message}`);
    process.exit(1);
  }

  const expectedCellCount = gridWidth * gridHeight;
  if (parsed.mapId !== mapId) {
    console.error(
      `Invalid elevation sidecar mapId at ${sidecarPath}: expected ${mapId}, received ${parsed.mapId}.`,
    );
    process.exit(1);
  }
  if (parsed.gridWidth !== gridWidth || parsed.gridHeight !== gridHeight) {
    console.error(
      `Invalid elevation sidecar dimensions at ${sidecarPath}: expected ${gridWidth}x${gridHeight}.`,
    );
    process.exit(1);
  }
  if (
    !Array.isArray(parsed.elevation) ||
    parsed.elevation.length !== expectedCellCount
  ) {
    console.error(
      `Invalid elevation sidecar elevation grid length at ${sidecarPath}.`,
    );
    process.exit(1);
  }
  if (
    typeof parsed.terrainCodeGrid !== 'string' ||
    parsed.terrainCodeGrid.length !== expectedCellCount
  ) {
    console.error(
      `Invalid elevation sidecar terrain code grid length at ${sidecarPath}.`,
    );
    process.exit(1);
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
assertGenerationMethod(options.method);
assertWaterMode(options.waterMode);

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

const generationMethod = resolveGenerationMethod(options.method, rng);
const resolvedWaterMode = resolveWaterMode(options.waterMode, rng);
const generationConfig = {
  gridWidth: options.gridWidth,
  gridHeight: options.gridHeight,
  waterBias: options.waterBias,
  mountainBias: options.mountainBias,
  forestBias: options.forestBias,
  waterMode: resolvedWaterMode,
};
let generatedTerrain;
try {
  generatedTerrain =
    generationMethod === 'wfc'
      ? buildWfcTerrainGrid(generationConfig, rng)
      : buildNoiseTerrainGrid(generationConfig, rng);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown generation error';
  console.error(`Map generation failed (${generationMethod}): ${message}`);
  process.exit(1);
}

const { terrain, elevationGrid } = generatedTerrain;
const cityLayout = placeCityMarkers(
  terrain,
  options.gridWidth,
  options.gridHeight,
);
const { pixels, elevationBytes } = buildPixelColors(
  terrain,
  elevationGrid,
  cityLayout.markers,
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
const sourceTempPath = buildAtomicTempPath(sourcePath);
const quantizedTempPath = buildAtomicTempPath(quantizedPath);
const elevationGridTempPath = buildAtomicTempPath(elevationGridPath);
const terrainCodeGrid = buildTerrainCodeGrid(
  terrain,
  options.gridWidth,
  options.gridHeight,
);
const elevationSidecar = {
  mapId,
  method: generationMethod,
  waterMode: resolvedWaterMode,
  gridWidth: options.gridWidth,
  gridHeight: options.gridHeight,
  elevation: Array.from(elevationBytes),
  cityAnchors: cityLayout.cityAnchors,
  neutralCityAnchors: cityLayout.neutralCityAnchors,
  terrainCodeGrid,
};

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
    `png:${sourceTempPath}`,
  ]);
  runMagick([
    sourceTempPath,
    '-dither',
    'None',
    '-colors',
    '16',
    '-type',
    'Palette',
    `png:${quantizedTempPath}`,
  ]);
  writeFileSync(
    elevationGridTempPath,
    `${JSON.stringify(elevationSidecar)}\n`,
    'utf8',
  );
  assertNonEmptyFile(sourceTempPath, 'source map image');
  assertNonEmptyFile(quantizedTempPath, 'quantized map image');
  assertPngSignature(sourceTempPath, 'source map image');
  assertPngSignature(quantizedTempPath, 'quantized map image');
  validateElevationGridSidecar(elevationGridTempPath, {
    mapId,
    gridWidth: options.gridWidth,
    gridHeight: options.gridHeight,
  });

  renameSync(sourceTempPath, sourcePath);
  renameSync(quantizedTempPath, quantizedPath);
  renameSync(elevationGridTempPath, elevationGridPath);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  rmSync(sourceTempPath, { force: true });
  rmSync(quantizedTempPath, { force: true });
  rmSync(elevationGridTempPath, { force: true });
}

if (!options.noSync) {
  runSyncMaps(options.outputDir);
}

console.log(`Generated map ID: ${mapId}`);
console.log(`Method: ${generationMethod}`);
console.log(`Water mode: ${resolvedWaterMode}`);
console.log(`Seed: ${seedText}`);
console.log(`Source map: ${sourcePath}`);
console.log(`Quantized map: ${quantizedPath}`);
console.log(`Elevation grid: ${elevationGridPath}`);
if (options.noSync) {
  console.log('Skipped map:sync (--no-sync).');
} else {
  console.log('map:sync completed (gameplayConfig + terrainGrid updated).');
}
