export type TerrainType =
  | 'water'
  | 'grass'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'unknown';

export type TerrainCode = 'w' | 'g' | 'f' | 'h' | 'm' | 'u';

export type TerrainSwatch = {
  color: number;
  type: TerrainType;
};

type SlopeMoraleInput = {
  currentTerrainType: TerrainType;
  forwardTerrainType: TerrainType;
  currentHillGrade: number;
  forwardHillGrade: number;
  moralePerInfluenceDot: number;
  slopeMoraleDotEquivalent: number;
};

type NoiseTerrainClassificationInput = {
  allowWater: boolean;
  forceWater: boolean;
  waterScore: number;
  mountainScore: number;
  forestScore: number;
  canBeForest: boolean;
};

const HILL_ELEVATION_BYTE_MIN = 152;
const HILL_ELEVATION_BYTE_MAX = 208;
const DEFAULT_UNKNOWN_ELEVATION_BYTE = 112;

export const TERRAIN_CODE_BY_TYPE: Record<TerrainType, TerrainCode> = {
  water: 'w',
  grass: 'g',
  forest: 'f',
  hills: 'h',
  mountains: 'm',
  unknown: 'u',
};

export const TERRAIN_TYPE_BY_CODE: Record<TerrainCode, TerrainType> = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

export const TERRAIN_COLORS_BY_TYPE: Record<TerrainType, readonly number[]> = {
  water: [0x0f2232, 0x102236],
  grass: [0x71844b],
  forest: [0x364d31, 0x122115],
  hills: [0x9e8c5d, 0xa79168, 0xc4a771, 0xddb650, 0xefb72f],
  mountains: [0xffffff],
  unknown: [0x707070],
};

export const HILL_GRADE_NONE = -1;
export const HILL_COLORS_BY_GRADE = TERRAIN_COLORS_BY_TYPE.hills;
export const HILL_GRADE_COUNT = HILL_COLORS_BY_GRADE.length;

const HILL_ELEVATION_BYTES_BY_GRADE = buildHillElevationBytes();

const DEFAULT_ELEVATION_BYTE_BY_TERRAIN_TYPE: Record<TerrainType, number> = {
  water: 16,
  grass: 112,
  forest: 124,
  hills: HILL_ELEVATION_BYTES_BY_GRADE[Math.floor(HILL_GRADE_COUNT / 2)] ?? 176,
  mountains: 230,
  unknown: DEFAULT_UNKNOWN_ELEVATION_BYTE,
};

export const TERRAIN_SWATCHES: readonly TerrainSwatch[] = (
  Object.entries(TERRAIN_COLORS_BY_TYPE) as Array<[TerrainType, readonly number[]]>
).flatMap(([type, colors]) =>
  colors.map((color) => ({ color, type })),
);

const TERRAIN_TYPE_BY_COLOR = new Map<number, TerrainType>(
  TERRAIN_SWATCHES.map((swatch) => [swatch.color, swatch.type]),
);
const HILL_GRADE_BY_COLOR = new Map<number, number>(
  HILL_COLORS_BY_GRADE.map((color, grade) => [color, grade]),
);

export const NOISE_TERRAIN_THRESHOLDS = {
  waterScore: 0,
  mountains: 0.88,
  hills: 0.72,
  forest: 0.56,
} as const;

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function buildHillElevationBytes(): number[] {
  if (HILL_GRADE_COUNT <= 0) {
    return [];
  }
  if (HILL_GRADE_COUNT === 1) {
    return [HILL_ELEVATION_BYTE_MAX];
  }

  const output: number[] = [];
  for (let grade = 0; grade < HILL_GRADE_COUNT; grade += 1) {
    const ratio = 1 - grade / (HILL_GRADE_COUNT - 1);
    output.push(
      Math.round(
        HILL_ELEVATION_BYTE_MIN +
          (HILL_ELEVATION_BYTE_MAX - HILL_ELEVATION_BYTE_MIN) * ratio,
      ),
    );
  }
  return output;
}

function quantizeToNearestLevel(value: number, levels: readonly number[]): number {
  if (!Number.isFinite(value) || levels.length === 0) {
    return levels[0] ?? 0;
  }

  const clampedValue = clamp(Math.round(value), 0, 255);
  let closestLevel = levels[0];
  let closestDistance = Math.abs(clampedValue - closestLevel);
  for (let index = 1; index < levels.length; index += 1) {
    const level = levels[index];
    const distance = Math.abs(clampedValue - level);
    if (distance < closestDistance) {
      closestLevel = level;
      closestDistance = distance;
    }
  }

  return closestLevel;
}

export function normalizeHillGrade(rawGrade: number): number {
  if (!Number.isFinite(rawGrade)) {
    return HILL_GRADE_NONE;
  }
  const roundedGrade = Math.round(rawGrade);
  if (roundedGrade < 0) {
    return HILL_GRADE_NONE;
  }
  return clamp(roundedGrade, 0, HILL_GRADE_COUNT - 1);
}

export function getTerrainTypeFromCode(code: string): TerrainType {
  if (code === 'w' || code === 'g' || code === 'f' || code === 'h' || code === 'm' || code === 'u') {
    return TERRAIN_TYPE_BY_CODE[code];
  }
  return 'unknown';
}

export function getTerrainCodeFromType(terrainType: TerrainType): TerrainCode {
  return TERRAIN_CODE_BY_TYPE[terrainType] ?? TERRAIN_CODE_BY_TYPE.unknown;
}

export function getTerrainTypeForColor(color: number | null): TerrainType {
  if (!Number.isFinite(color ?? Number.NaN)) {
    return 'unknown';
  }
  return TERRAIN_TYPE_BY_COLOR.get(Math.round(color ?? 0)) ?? 'unknown';
}

export function getHillGradeForColor(color: number | null): number {
  if (!Number.isFinite(color ?? Number.NaN)) {
    return HILL_GRADE_NONE;
  }
  const grade = HILL_GRADE_BY_COLOR.get(Math.round(color ?? 0));
  return typeof grade === 'number' ? grade : HILL_GRADE_NONE;
}

export function quantizeHillGradeFromNoise(noiseSample: number): number {
  if (HILL_GRADE_COUNT <= 0) {
    return HILL_GRADE_NONE;
  }
  if (!Number.isFinite(noiseSample)) {
    return 0;
  }
  const clampedNoise = clamp(noiseSample, 0, 1);
  return clamp(
    Math.round((1 - clampedNoise) * (HILL_GRADE_COUNT - 1)),
    0,
    HILL_GRADE_COUNT - 1,
  );
}

export function getHillGradeFromElevationByte(elevationByte: number): number {
  if (HILL_ELEVATION_BYTES_BY_GRADE.length === 0) {
    return HILL_GRADE_NONE;
  }
  const quantizedByte = quantizeToNearestLevel(
    elevationByte,
    HILL_ELEVATION_BYTES_BY_GRADE,
  );
  const grade = HILL_ELEVATION_BYTES_BY_GRADE.findIndex(
    (value) => value === quantizedByte,
  );
  return grade >= 0 ? grade : HILL_GRADE_NONE;
}

export function getHillColorForGrade(hillGrade: number): number {
  const normalizedGrade = normalizeHillGrade(hillGrade);
  if (normalizedGrade === HILL_GRADE_NONE) {
    return HILL_COLORS_BY_GRADE[0] ?? TERRAIN_COLORS_BY_TYPE.unknown[0];
  }
  return (
    HILL_COLORS_BY_GRADE[normalizedGrade] ??
    HILL_COLORS_BY_GRADE[0] ??
    TERRAIN_COLORS_BY_TYPE.unknown[0]
  );
}

export function getTerrainColorForRendering(
  terrainType: TerrainType,
  options?: {
    hillGrade?: number;
    variantIndex?: number;
  },
): number {
  if (terrainType === 'hills') {
    return getHillColorForGrade(options?.hillGrade ?? HILL_GRADE_NONE);
  }

  const swatches = TERRAIN_COLORS_BY_TYPE[terrainType] ?? TERRAIN_COLORS_BY_TYPE.unknown;
  const swatchCount = swatches.length;
  if (swatchCount === 0) {
    return TERRAIN_COLORS_BY_TYPE.unknown[0];
  }

  const variantIndex = options?.variantIndex ?? 0;
  const safeIndex = clamp(Math.round(variantIndex), 0, Number.MAX_SAFE_INTEGER);
  return swatches[safeIndex % swatchCount] ?? swatches[0];
}

export function getTerrainPaletteElevationByte(
  terrainType: TerrainType,
  hillGrade: number = HILL_GRADE_NONE,
): number {
  if (terrainType !== 'hills') {
    return (
      DEFAULT_ELEVATION_BYTE_BY_TERRAIN_TYPE[terrainType] ??
      DEFAULT_ELEVATION_BYTE_BY_TERRAIN_TYPE.unknown
    );
  }

  const normalizedGrade = normalizeHillGrade(hillGrade);
  if (normalizedGrade === HILL_GRADE_NONE) {
    return DEFAULT_ELEVATION_BYTE_BY_TERRAIN_TYPE.hills;
  }
  return (
    HILL_ELEVATION_BYTES_BY_GRADE[normalizedGrade] ??
    DEFAULT_ELEVATION_BYTE_BY_TERRAIN_TYPE.hills
  );
}

export function classifyTerrainFromGeneratedNoise(
  input: NoiseTerrainClassificationInput,
): TerrainType {
  if (
    input.allowWater &&
    (input.forceWater || input.waterScore <= NOISE_TERRAIN_THRESHOLDS.waterScore)
  ) {
    return 'water';
  }
  if (input.mountainScore > NOISE_TERRAIN_THRESHOLDS.mountains) {
    return 'mountains';
  }
  if (input.mountainScore > NOISE_TERRAIN_THRESHOLDS.hills) {
    return 'hills';
  }
  if (
    input.canBeForest &&
    input.forestScore > NOISE_TERRAIN_THRESHOLDS.forest
  ) {
    return 'forest';
  }
  return 'grass';
}

export function getSlopeMoraleDeltaFromHillGrades(input: SlopeMoraleInput): number {
  if (
    input.currentTerrainType === 'mountains' ||
    input.forwardTerrainType === 'mountains'
  ) {
    return 0;
  }

  const currentHeight = getSlopeHeightTier(
    input.currentTerrainType,
    input.currentHillGrade,
  );
  const forwardHeight = getSlopeHeightTier(
    input.forwardTerrainType,
    input.forwardHillGrade,
  );
  if (currentHeight === forwardHeight) {
    return 0;
  }

  const slopeUnit = input.moralePerInfluenceDot * input.slopeMoraleDotEquivalent;
  // Looking up toward the forward cell is a morale penalty; looking down is a bonus.
  return forwardHeight > currentHeight ? -slopeUnit : slopeUnit;
}

function getSlopeHeightTier(terrainType: TerrainType, hillGrade: number): number {
  if (terrainType !== 'hills') {
    return 0;
  }

  const normalizedGrade = normalizeHillGrade(hillGrade);
  if (normalizedGrade === HILL_GRADE_NONE) {
    return 0;
  }
  // Grade 0 is highest, so invert to a monotonic "height tier".
  return HILL_GRADE_COUNT - normalizedGrade;
}
