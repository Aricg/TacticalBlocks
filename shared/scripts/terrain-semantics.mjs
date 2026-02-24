export const TERRAIN_CODE_BY_TYPE = {
  water: 'w',
  grass: 'g',
  forest: 'f',
  hills: 'h',
  mountains: 'm',
  unknown: 'u',
};

export const TERRAIN_TYPE_BY_CODE = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

export const TERRAIN_COLORS_BY_TYPE = {
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

const HILL_ELEVATION_BYTE_MIN = 152;
const HILL_ELEVATION_BYTE_MAX = 208;

const HILL_ELEVATION_BYTES_BY_GRADE = buildHillElevationBytes();
const HILL_GRADE_BY_COLOR = new Map(
  HILL_COLORS_BY_GRADE.map((color, index) => [color, index]),
);
export const TERRAIN_SWATCHES = Object.entries(TERRAIN_COLORS_BY_TYPE).flatMap(
  ([type, colors]) => colors.map((color) => ({ color, type })),
);
const TERRAIN_TYPE_BY_COLOR = new Map(
  TERRAIN_SWATCHES.map((swatch) => [swatch.color, swatch.type]),
);

export const NOISE_TERRAIN_THRESHOLDS = {
  waterScore: 0,
  mountains: 0.88,
  hills: 0.72,
  forest: 0.56,
};

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function buildHillElevationBytes() {
  if (HILL_GRADE_COUNT <= 0) {
    return [];
  }
  if (HILL_GRADE_COUNT === 1) {
    return [HILL_ELEVATION_BYTE_MAX];
  }
  const output = [];
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

function quantizeToNearestLevel(value, levels) {
  if (!Number.isFinite(value) || levels.length === 0) {
    return levels[0] ?? 0;
  }
  const clampedValue = clamp(Math.round(value), 0, 255);
  let closest = levels[0];
  let closestDistance = Math.abs(clampedValue - closest);
  for (let index = 1; index < levels.length; index += 1) {
    const level = levels[index];
    const distance = Math.abs(clampedValue - level);
    if (distance < closestDistance) {
      closest = level;
      closestDistance = distance;
    }
  }
  return closest;
}

export function normalizeHillGrade(value) {
  if (!Number.isFinite(value)) {
    return HILL_GRADE_NONE;
  }
  const rounded = Math.round(value);
  if (rounded < 0) {
    return HILL_GRADE_NONE;
  }
  return clamp(rounded, 0, HILL_GRADE_COUNT - 1);
}

export function quantizeHillGradeFromNoise(noiseSample) {
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

export function getHillGradeFromElevationByte(elevationByte) {
  const quantized = quantizeToNearestLevel(
    elevationByte,
    HILL_ELEVATION_BYTES_BY_GRADE,
  );
  const grade = HILL_ELEVATION_BYTES_BY_GRADE.findIndex(
    (value) => value === quantized,
  );
  return grade >= 0 ? grade : HILL_GRADE_NONE;
}

export function getTerrainTypeForColor(color) {
  if (!Number.isFinite(color)) {
    return 'unknown';
  }
  return TERRAIN_TYPE_BY_COLOR.get(Math.round(color)) ?? 'unknown';
}

export function getHillGradeForColor(color) {
  if (!Number.isFinite(color)) {
    return HILL_GRADE_NONE;
  }
  const grade = HILL_GRADE_BY_COLOR.get(Math.round(color));
  return typeof grade === 'number' ? grade : HILL_GRADE_NONE;
}

export function getTerrainColorForRendering(
  terrainType,
  {
    hillGrade = HILL_GRADE_NONE,
    variantIndex = 0,
  } = {},
) {
  if (terrainType === 'hills') {
    const normalizedGrade = normalizeHillGrade(hillGrade);
    return (
      HILL_COLORS_BY_GRADE[normalizedGrade] ??
      HILL_COLORS_BY_GRADE[0] ??
      TERRAIN_COLORS_BY_TYPE.unknown[0]
    );
  }
  const swatches = TERRAIN_COLORS_BY_TYPE[terrainType] ?? TERRAIN_COLORS_BY_TYPE.unknown;
  if (swatches.length === 0) {
    return TERRAIN_COLORS_BY_TYPE.unknown[0];
  }
  const normalizedIndex = clamp(Math.round(variantIndex), 0, Number.MAX_SAFE_INTEGER);
  return swatches[normalizedIndex % swatches.length] ?? swatches[0];
}

export function getTerrainPaletteElevationByte(terrainType, hillGrade = HILL_GRADE_NONE) {
  if (terrainType === 'water') {
    return 16;
  }
  if (terrainType === 'grass') {
    return 112;
  }
  if (terrainType === 'forest') {
    return 124;
  }
  if (terrainType === 'mountains') {
    return 230;
  }
  if (terrainType === 'hills') {
    const normalizedGrade = normalizeHillGrade(hillGrade);
    return HILL_ELEVATION_BYTES_BY_GRADE[normalizedGrade] ?? 176;
  }
  return 112;
}

export function classifyTerrainFromGeneratedNoise({
  allowWater,
  forceWater,
  waterScore,
  mountainScore,
  forestScore,
  canBeForest,
}) {
  if (
    allowWater &&
    (forceWater || waterScore <= NOISE_TERRAIN_THRESHOLDS.waterScore)
  ) {
    return 'water';
  }
  if (mountainScore > NOISE_TERRAIN_THRESHOLDS.mountains) {
    return 'mountains';
  }
  if (mountainScore > NOISE_TERRAIN_THRESHOLDS.hills) {
    return 'hills';
  }
  if (canBeForest && forestScore > NOISE_TERRAIN_THRESHOLDS.forest) {
    return 'forest';
  }
  return 'grass';
}
