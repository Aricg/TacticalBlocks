const GRID_SIZE_PROFILE_PRESETS = Object.freeze({
  small: Object.freeze({
    gridWidth: 64,
    gridHeight: 36,
  }),
  medium: Object.freeze({
    gridWidth: 80,
    gridHeight: 44,
  }),
  large: Object.freeze({
    gridWidth: 96,
    gridHeight: 54,
  }),
  xl: Object.freeze({
    gridWidth: 128,
    gridHeight: 72,
  }),
});

const GRID_SIZE_PROFILE_NAMES = Object.keys(GRID_SIZE_PROFILE_PRESETS);
const GRID_SIZE_PROFILE_SET = new Set(GRID_SIZE_PROFILE_NAMES);

function readNonEmptyEnvValue(key) {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveGridSizeProfileName(defaultProfile = 'large') {
  const configuredProfile =
    readNonEmptyEnvValue('VITE_GRID_SIZE_PROFILE') ??
    readNonEmptyEnvValue('GRID_SIZE_PROFILE');
  if (!configuredProfile) {
    return defaultProfile;
  }

  const normalizedProfile = configuredProfile.toLowerCase();
  if (GRID_SIZE_PROFILE_SET.has(normalizedProfile)) {
    return normalizedProfile;
  }

  throw new Error(
    `Invalid GRID_SIZE_PROFILE "${configuredProfile}". Expected one of: ${GRID_SIZE_PROFILE_NAMES.join(', ')}.`,
  );
}

export function resolveGridSizePreset(defaultProfile = 'large') {
  const profile = resolveGridSizeProfileName(defaultProfile);
  return {
    profile,
    ...GRID_SIZE_PROFILE_PRESETS[profile],
  };
}
