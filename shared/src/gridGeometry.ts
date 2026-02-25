export const GRID_SIZE_PROFILE_PRESETS = {
  small: {
    gridWidth: 64,
    gridHeight: 36,
  },
  medium: {
    gridWidth: 80,
    gridHeight: 44,
  },
  large: {
    gridWidth: 96,
    gridHeight: 54,
  },
  xl: {
    gridWidth: 128,
    gridHeight: 72,
  },
} as const;

export type GridSizeProfile = keyof typeof GRID_SIZE_PROFILE_PRESETS;

export type GridGeometry = {
  profile: GridSizeProfile;
  mapWidth: number;
  mapHeight: number;
  gridWidth: number;
  gridHeight: number;
  cellWidth: number;
  cellHeight: number;
};

type EnvironmentRecord = Record<string, unknown> | null | undefined;

const GRID_SIZE_PROFILE_NAMES = Object.keys(
  GRID_SIZE_PROFILE_PRESETS,
) as GridSizeProfile[];
const GRID_SIZE_PROFILE_SET = new Set<GridSizeProfile>(GRID_SIZE_PROFILE_NAMES);

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveGridSizeProfileName(args?: {
  importMetaEnv?: EnvironmentRecord;
  processEnv?: EnvironmentRecord;
  defaultProfile?: GridSizeProfile;
}): GridSizeProfile {
  const defaultProfile = args?.defaultProfile ?? 'large';
  const importMetaEnv = args?.importMetaEnv ?? undefined;
  const processEnv = args?.processEnv ?? undefined;

  const configuredProfile =
    normalizeNonEmptyString(importMetaEnv?.VITE_GRID_SIZE_PROFILE) ??
    normalizeNonEmptyString(importMetaEnv?.GRID_SIZE_PROFILE) ??
    normalizeNonEmptyString(processEnv?.VITE_GRID_SIZE_PROFILE) ??
    normalizeNonEmptyString(processEnv?.GRID_SIZE_PROFILE);

  if (!configuredProfile) {
    return defaultProfile;
  }

  const normalizedProfile = configuredProfile.toLowerCase();
  if (GRID_SIZE_PROFILE_SET.has(normalizedProfile as GridSizeProfile)) {
    return normalizedProfile as GridSizeProfile;
  }

  throw new Error(
    `Invalid GRID_SIZE_PROFILE "${configuredProfile}". Expected one of: ${GRID_SIZE_PROFILE_NAMES.join(', ')}.`,
  );
}

export function createGridGeometry(
  profile: GridSizeProfile,
  mapWidth: number,
  mapHeight: number,
): GridGeometry {
  if (!Number.isFinite(mapWidth) || mapWidth <= 0) {
    throw new Error(`Invalid map width "${mapWidth}" for grid geometry.`);
  }
  if (!Number.isFinite(mapHeight) || mapHeight <= 0) {
    throw new Error(`Invalid map height "${mapHeight}" for grid geometry.`);
  }

  const preset = GRID_SIZE_PROFILE_PRESETS[profile];
  return {
    profile,
    mapWidth,
    mapHeight,
    gridWidth: preset.gridWidth,
    gridHeight: preset.gridHeight,
    cellWidth: mapWidth / preset.gridWidth,
    cellHeight: mapHeight / preset.gridHeight,
  };
}
