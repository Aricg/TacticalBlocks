import type { MapGenerationMethod } from "./networkContracts.js";

export const GENERATION_WATER_MODES = ["auto", "none", "lake", "river"] as const;
export type GenerationWaterMode = (typeof GENERATION_WATER_MODES)[number];

export const STARTING_FORCE_LAYOUT_STRATEGIES = [
  "friendly-zones",
  "battle-line",
  "city-front",
  "mirrored-grid",
  "block",
] as const;
export type StartingForceLayoutStrategy =
  (typeof STARTING_FORCE_LAYOUT_STRATEGIES)[number];

export type GenerationProfile = {
  method: MapGenerationMethod;
  seed: string;
  terrain: {
    waterMode: GenerationWaterMode;
    riverCount: number;
    mountainDensity: number;
    forestDensity: number;
  };
  cities: {
    teamCityCount: number;
    neutralCityCount: number;
    friendlyCityCount: number;
  };
  startingForces: {
    unitCountPerTeam: number;
    commanderCount: number;
    layoutStrategy: StartingForceLayoutStrategy;
  };
};

export type GenerationProfileDraft = Partial<{
  method: MapGenerationMethod;
  seed: string;
  terrain: Partial<GenerationProfile["terrain"]>;
  cities: Partial<GenerationProfile["cities"]>;
  startingForces: Partial<GenerationProfile["startingForces"]>;
}>;

export type ResolveGenerationProfileOptions = {
  fallbackMethod?: MapGenerationMethod;
  fallbackSeed?: string;
};

export type ResolveGenerationProfileResult =
  | {
      ok: true;
      profile: GenerationProfile;
    }
  | {
      ok: false;
      errors: string[];
    };

export const DEFAULT_GENERATION_PROFILE: GenerationProfile = {
  method: "wfc",
  seed: "",
  terrain: {
    waterMode: "auto",
    riverCount: 2,
    mountainDensity: 0.03,
    forestDensity: 0,
  },
  cities: {
    teamCityCount: 1,
    neutralCityCount: 2,
    friendlyCityCount: 2,
  },
  startingForces: {
    unitCountPerTeam: 48,
    commanderCount: 1,
    layoutStrategy: "friendly-zones",
  },
};

const MAP_GENERATION_METHOD_SET = new Set<MapGenerationMethod>([
  "noise",
  "wfc",
  "auto",
]);

const WATER_MODE_SET = new Set<GenerationWaterMode>(GENERATION_WATER_MODES);
const STARTING_FORCE_LAYOUT_STRATEGY_SET = new Set<StartingForceLayoutStrategy>(
  STARTING_FORCE_LAYOUT_STRATEGIES,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIntegerInRange(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
  errors: string[],
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${fieldPath} must be an integer.`);
    return null;
  }
  if (value < min || value > max) {
    errors.push(`${fieldPath} must be between ${min} and ${max}.`);
    return null;
  }
  return value;
}

function parseFiniteInRange(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
  errors: string[],
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${fieldPath} must be a finite number.`);
    return null;
  }
  if (value < min || value > max) {
    errors.push(`${fieldPath} must be between ${min} and ${max}.`);
    return null;
  }
  return value;
}

export function resolveGenerationProfile(
  input: unknown,
  options?: ResolveGenerationProfileOptions,
): ResolveGenerationProfileResult {
  const profile: GenerationProfile = {
    method: options?.fallbackMethod ?? DEFAULT_GENERATION_PROFILE.method,
    seed: options?.fallbackSeed ?? DEFAULT_GENERATION_PROFILE.seed,
    terrain: { ...DEFAULT_GENERATION_PROFILE.terrain },
    cities: { ...DEFAULT_GENERATION_PROFILE.cities },
    startingForces: { ...DEFAULT_GENERATION_PROFILE.startingForces },
  };

  if (input === null || input === undefined) {
    return { ok: true, profile };
  }

  if (!isRecord(input)) {
    return { ok: false, errors: ["profile must be an object."] };
  }

  const errors: string[] = [];

  if (input.method !== undefined) {
    if (typeof input.method !== "string" || !MAP_GENERATION_METHOD_SET.has(input.method as MapGenerationMethod)) {
      errors.push("profile.method must be one of: noise, wfc, auto.");
    } else {
      profile.method = input.method as MapGenerationMethod;
    }
  }

  if (input.seed !== undefined) {
    if (typeof input.seed !== "string") {
      errors.push("profile.seed must be a string.");
    } else if (input.seed.trim().length === 0) {
      errors.push("profile.seed must not be empty.");
    } else if (input.seed.length > 200) {
      errors.push("profile.seed must be 200 characters or fewer.");
    } else {
      profile.seed = input.seed;
    }
  }

  if (input.terrain !== undefined) {
    if (!isRecord(input.terrain)) {
      errors.push("profile.terrain must be an object.");
    } else {
      if (input.terrain.waterMode !== undefined) {
        if (
          typeof input.terrain.waterMode !== "string" ||
          !WATER_MODE_SET.has(input.terrain.waterMode as GenerationWaterMode)
        ) {
          errors.push("profile.terrain.waterMode must be one of: auto, none, lake, river.");
        } else {
          profile.terrain.waterMode = input.terrain.waterMode as GenerationWaterMode;
        }
      }
      if (input.terrain.riverCount !== undefined) {
        const parsedRiverCount = parseIntegerInRange(
          input.terrain.riverCount,
          "profile.terrain.riverCount",
          0,
          8,
          errors,
        );
        if (parsedRiverCount !== null) {
          profile.terrain.riverCount = parsedRiverCount;
        }
      }
      if (input.terrain.mountainDensity !== undefined) {
        const parsedMountainDensity = parseFiniteInRange(
          input.terrain.mountainDensity,
          "profile.terrain.mountainDensity",
          0,
          1,
          errors,
        );
        if (parsedMountainDensity !== null) {
          profile.terrain.mountainDensity = parsedMountainDensity;
        }
      }
      if (input.terrain.forestDensity !== undefined) {
        const parsedForestDensity = parseFiniteInRange(
          input.terrain.forestDensity,
          "profile.terrain.forestDensity",
          0,
          1,
          errors,
        );
        if (parsedForestDensity !== null) {
          profile.terrain.forestDensity = parsedForestDensity;
        }
      }
    }
  }

  if (input.cities !== undefined) {
    if (!isRecord(input.cities)) {
      errors.push("profile.cities must be an object.");
    } else {
      if (input.cities.teamCityCount !== undefined) {
        if (
          typeof input.cities.teamCityCount !== "number" ||
          !Number.isInteger(input.cities.teamCityCount)
        ) {
          errors.push("profile.cities.teamCityCount must be an integer.");
        } else if (input.cities.teamCityCount !== 1) {
          errors.push(
            "profile.cities.teamCityCount currently supports only 1.",
          );
        } else {
          profile.cities.teamCityCount = 1;
        }
      }
      if (input.cities.neutralCityCount !== undefined) {
        const parsedNeutralCityCount = parseIntegerInRange(
          input.cities.neutralCityCount,
          "profile.cities.neutralCityCount",
          0,
          12,
          errors,
        );
        if (parsedNeutralCityCount !== null) {
          profile.cities.neutralCityCount = parsedNeutralCityCount;
        }
      }
      if (input.cities.friendlyCityCount !== undefined) {
        const parsedFriendlyCityCount = parseIntegerInRange(
          input.cities.friendlyCityCount,
          "profile.cities.friendlyCityCount",
          0,
          6,
          errors,
        );
        if (parsedFriendlyCityCount !== null) {
          profile.cities.friendlyCityCount = parsedFriendlyCityCount;
        }
      }
    }
  }

  if (input.startingForces !== undefined) {
    if (!isRecord(input.startingForces)) {
      errors.push("profile.startingForces must be an object.");
    } else {
      if (input.startingForces.unitCountPerTeam !== undefined) {
        const parsedUnitCountPerTeam = parseIntegerInRange(
          input.startingForces.unitCountPerTeam,
          "profile.startingForces.unitCountPerTeam",
          1,
          250,
          errors,
        );
        if (parsedUnitCountPerTeam !== null) {
          profile.startingForces.unitCountPerTeam = parsedUnitCountPerTeam;
        }
      }
      if (input.startingForces.commanderCount !== undefined) {
        if (
          typeof input.startingForces.commanderCount !== "number" ||
          !Number.isInteger(input.startingForces.commanderCount)
        ) {
          errors.push("profile.startingForces.commanderCount must be an integer.");
        } else if (input.startingForces.commanderCount !== 1) {
          errors.push(
            "profile.startingForces.commanderCount currently supports only 1.",
          );
        } else {
          profile.startingForces.commanderCount = 1;
        }
      }
      if (input.startingForces.layoutStrategy !== undefined) {
        if (
          typeof input.startingForces.layoutStrategy !== "string" ||
          !STARTING_FORCE_LAYOUT_STRATEGY_SET.has(
            input.startingForces.layoutStrategy as StartingForceLayoutStrategy,
          )
        ) {
          errors.push(
            "profile.startingForces.layoutStrategy must be one of: friendly-zones, battle-line, city-front, mirrored-grid, block.",
          );
        } else {
          profile.startingForces.layoutStrategy =
            input.startingForces.layoutStrategy as StartingForceLayoutStrategy;
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    profile,
  };
}
