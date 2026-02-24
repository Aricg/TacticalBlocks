import {
  resolveGenerationProfile,
  type GenerationProfile,
} from "../../../../shared/src/generationProfile.js";
import type { LobbyGenerateMapMessage } from "../../../../shared/src/networkContracts.js";
import {
  MapGenerationService,
  type MapGenerationResult,
} from "./MapGenerationService.js";

const MOUNTAIN_DENSITY_AT_MAX_BIAS = 0.12;
const MOUNTAIN_BIAS_MIN = -0.25;
const MOUNTAIN_BIAS_MAX = 0.25;
const FOREST_DENSITY_AT_MAX_BIAS = 0.24;
const FOREST_BIAS_MIN = -0.25;
const FOREST_BIAS_MAX = 0.25;

type GenerationFailure = Extract<MapGenerationResult, { ok: false }>;

type GenerateLobbyRuntimeMapArgs = {
  mapId: string;
  message: LobbyGenerateMapMessage;
  roomModuleUrl: string;
};

export type GenerateLobbyRuntimeMapResult =
  | {
      ok: true;
      profile: GenerationProfile;
    }
  | {
      ok: false;
      reason: "invalid-profile";
      errors: string[];
    }
  | {
      ok: false;
      reason: "generation-failed";
      failure: GenerationFailure;
    };

export type EnsureStartupRuntimeGeneratedMapResult =
  | {
      attempted: false;
    }
  | {
      attempted: true;
      ok: true;
    }
  | {
      attempted: true;
      ok: false;
      failure: GenerationFailure;
    };

export class LobbyMapGenerationService {
  private readonly mapGenerationService = new MapGenerationService();

  private clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  private resolveForestBiasFromDensity(forestDensity: number): number {
    const safeForestDensity = Number.isFinite(forestDensity)
      ? this.clamp(forestDensity, 0, 1)
      : 0;
    const normalizedDensity =
      FOREST_DENSITY_AT_MAX_BIAS > 0
        ? this.clamp(safeForestDensity / FOREST_DENSITY_AT_MAX_BIAS, 0, 1)
        : 0;
    return FOREST_BIAS_MIN + normalizedDensity * (FOREST_BIAS_MAX - FOREST_BIAS_MIN);
  }

  private resolveMountainBiasFromDensity(mountainDensity: number): number {
    const safeMountainDensity = Number.isFinite(mountainDensity)
      ? this.clamp(mountainDensity, 0, 1)
      : 0;
    const normalizedDensity =
      MOUNTAIN_DENSITY_AT_MAX_BIAS > 0
        ? this.clamp(safeMountainDensity / MOUNTAIN_DENSITY_AT_MAX_BIAS, 0, 1)
        : 0;
    return (
      MOUNTAIN_BIAS_MIN +
      normalizedDensity * (MOUNTAIN_BIAS_MAX - MOUNTAIN_BIAS_MIN)
    );
  }

  generateLobbyRuntimeMap(
    args: GenerateLobbyRuntimeMapArgs,
  ): GenerateLobbyRuntimeMapResult {
    const generationMethod = this.mapGenerationService.normalizeGenerationMethod(
      args.message?.method,
    );
    const seed = `lobby-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const profileResult = resolveGenerationProfile(args.message?.profile, {
      fallbackMethod: generationMethod,
      fallbackSeed: seed,
    });
    if (!profileResult.ok) {
      return {
        ok: false,
        reason: "invalid-profile",
        errors: profileResult.errors,
      };
    }

    const profile = profileResult.profile;
    const generated = this.mapGenerationService.generateRuntimeMap({
      mapId: args.mapId,
      method: profile.method,
      seed: profile.seed,
      waterMode: profile.terrain.waterMode,
      riverCount: profile.terrain.riverCount,
      neutralCityCount: profile.cities.neutralCityCount,
      friendlyCityCount: profile.cities.friendlyCityCount,
      mountainBias: this.resolveMountainBiasFromDensity(
        profile.terrain.mountainDensity,
      ),
      forestBias: this.resolveForestBiasFromDensity(profile.terrain.forestDensity),
      contextLabel: "lobby",
      roomModuleUrl: args.roomModuleUrl,
    });
    if (!generated.ok) {
      return {
        ok: false,
        reason: "generation-failed",
        failure: generated,
      };
    }

    return {
      ok: true,
      profile,
    };
  }

  ensureStartupRuntimeGeneratedMap(
    mapId: string,
    roomModuleUrl: string,
  ): EnsureStartupRuntimeGeneratedMapResult {
    if (!mapId.startsWith("runtime-generated-")) {
      return {
        attempted: false,
      };
    }

    const seed = `startup-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const generated = this.mapGenerationService.generateRuntimeMap({
      mapId,
      method: "auto",
      seed,
      contextLabel: "startup",
      roomModuleUrl,
    });
    if (!generated.ok) {
      return {
        attempted: true,
        ok: false,
        failure: generated,
      };
    }

    return {
      attempted: true,
      ok: true,
    };
  }

  logMapGenerationFailure(
    contextLabel: string,
    mapId: string,
    failure: GenerationFailure,
  ): void {
    const statusSuffix =
      typeof failure.exitStatus === "number" ? ` status=${failure.exitStatus}` : "";
    console.error(
      `[map-generation][${failure.reason}] context=${contextLabel} mapId=${mapId}${statusSuffix} ${failure.message}`,
    );
    if (failure.stderr) {
      console.error(failure.stderr);
    }
    if (failure.stdout) {
      console.error(failure.stdout);
    }
  }
}
