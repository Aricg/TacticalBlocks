import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const DEFAULT_GRID_WIDTH = 80;
export const DEFAULT_GRID_HEIGHT = 44;
export const DEFAULT_OUTPUT_WIDTH = 1920;
export const DEFAULT_OUTPUT_HEIGHT = 1080;
export const DEFAULT_WATER_BIAS = 0.05;
export const DEFAULT_MOUNTAIN_BIAS = 0.03;
export const DEFAULT_FOREST_BIAS = 0.0;
export const MIN_MOUNTAIN_BIAS = -0.25;
export const MAX_MOUNTAIN_BIAS = 0.25;
export const MIN_FOREST_BIAS = -0.25;
export const MAX_FOREST_BIAS = 0.25;
export const DEFAULT_RIVER_COUNT = 2;
export const DEFAULT_NEUTRAL_CITY_COUNT = 2;
export const DEFAULT_FRIENDLY_CITY_COUNT = 2;
export const DEFAULT_METHOD = 'wfc';
export const DEFAULT_WATER_MODE = 'auto';
export const GENERATION_METHODS = ['noise', 'wfc', 'auto'];
export const WATER_MODES = ['auto', 'none', 'lake', 'river'];

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SHARED_DIR = path.resolve(SCRIPT_DIR, '../..');

export function printUsage() {
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
  console.log(`  --river-count <n>      Default: ${DEFAULT_RIVER_COUNT}`);
  console.log(`  --neutral-city-count <n> Default: ${DEFAULT_NEUTRAL_CITY_COUNT}`);
  console.log(`  --friendly-city-count <n> Default: ${DEFAULT_FRIENDLY_CITY_COUNT}`);
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

export function parseArgs(argv) {
  const options = {
    mapId: '',
    seed: '',
    gridWidth: DEFAULT_GRID_WIDTH,
    gridHeight: DEFAULT_GRID_HEIGHT,
    width: DEFAULT_OUTPUT_WIDTH,
    height: DEFAULT_OUTPUT_HEIGHT,
    waterBias: DEFAULT_WATER_BIAS,
    riverCount: DEFAULT_RIVER_COUNT,
    neutralCityCount: DEFAULT_NEUTRAL_CITY_COUNT,
    friendlyCityCount: DEFAULT_FRIENDLY_CITY_COUNT,
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
      case '--river-count':
        options.riverCount = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--neutral-city-count':
        options.neutralCityCount = Number.parseInt(argv[i + 1] ?? '', 10);
        i += 1;
        break;
      case '--friendly-city-count':
        options.friendlyCityCount = Number.parseInt(argv[i + 1] ?? '', 10);
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

export function assertInteger(name, value, min) {
  if (!Number.isInteger(value) || value < min) {
    console.error(`Invalid ${name}: ${value}`);
    process.exit(1);
  }
}

export function assertIntegerInRange(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    console.error(`Invalid ${name}: ${value}. Expected ${min}..${max}.`);
    process.exit(1);
  }
}

export function assertFinite(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    console.error(`Invalid ${name}: ${value}. Expected ${min}..${max}.`);
    process.exit(1);
  }
}

export function assertGenerationMethod(method) {
  if (!GENERATION_METHODS.includes(method)) {
    console.error(
      `Invalid method: ${method}. Expected one of: ${GENERATION_METHODS.join(', ')}.`,
    );
    process.exit(1);
  }
}

export function assertWaterMode(waterMode) {
  if (!WATER_MODES.includes(waterMode)) {
    console.error(
      `Invalid water mode: ${waterMode}. Expected one of: ${WATER_MODES.join(', ')}.`,
    );
    process.exit(1);
  }
}

export function resolveGenerationMethod(method, rng) {
  if (method === 'auto') {
    return rng() < 0.5 ? 'noise' : 'wfc';
  }
  return method;
}

export function resolveWaterMode(waterMode, rng) {
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
