import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { MapGenerationMethod } from "../../../../shared/src/networkContracts.js";
import type { GenerationWaterMode } from "../../../../shared/src/generationProfile.js";
import { resolveSharedDirectory } from "./resolveSharedDirectory.js";

type GenerateRuntimeMapArgs = {
  mapId: string;
  method: MapGenerationMethod;
  seed: string;
  waterMode?: GenerationWaterMode;
  riverCount?: number;
  neutralCityCount?: number;
  mountainBias?: number;
  forestBias?: number;
  contextLabel: string;
  roomModuleUrl: string;
};

type MapGenerationFailureReason =
  | "shared-dir-unresolved"
  | "generator-script-missing"
  | "generator-process-failed";

export type MapGenerationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: MapGenerationFailureReason;
      message: string;
      stderr?: string;
      stdout?: string;
      exitStatus?: number;
    };

export class MapGenerationService {
  normalizeGenerationMethod(
    requestedMethod: unknown,
    fallback: MapGenerationMethod = "wfc",
  ): MapGenerationMethod {
    if (
      requestedMethod === "noise" ||
      requestedMethod === "wfc" ||
      requestedMethod === "auto"
    ) {
      return requestedMethod;
    }

    return fallback;
  }

  generateRuntimeMap(args: GenerateRuntimeMapArgs): MapGenerationResult {
    const sharedDir = resolveSharedDirectory(args.roomModuleUrl);
    if (!sharedDir) {
      return {
        ok: false,
        reason: "shared-dir-unresolved",
        message: "Could not resolve shared directory for map generation.",
      };
    }

    const generatorScriptPath = path.join(
      sharedDir,
      "scripts",
      "generate-random-map.mjs",
    );
    if (!existsSync(generatorScriptPath)) {
      return {
        ok: false,
        reason: "generator-script-missing",
        message: `Map generator script not found: ${generatorScriptPath}`,
      };
    }

    const runGenerator = (
      method: MapGenerationMethod,
    ): SpawnSyncReturns<string> => {
      const generatorArgs = [
        generatorScriptPath,
        "--map-id",
        args.mapId,
        "--seed",
        args.seed,
        "--method",
        method,
        "--output-dir",
        sharedDir,
        "--no-sync",
      ];
      if (typeof args.waterMode === "string") {
        generatorArgs.push("--water-mode", args.waterMode);
      }
      if (typeof args.riverCount === "number" && Number.isInteger(args.riverCount)) {
        generatorArgs.push("--river-count", `${args.riverCount}`);
      }
      if (
        typeof args.neutralCityCount === "number" &&
        Number.isInteger(args.neutralCityCount)
      ) {
        generatorArgs.push("--neutral-city-count", `${args.neutralCityCount}`);
      }
      if (
        typeof args.mountainBias === "number" &&
        Number.isFinite(args.mountainBias)
      ) {
        generatorArgs.push("--mountain-bias", `${args.mountainBias}`);
      }
      if (typeof args.forestBias === "number" && Number.isFinite(args.forestBias)) {
        generatorArgs.push("--forest-bias", `${args.forestBias}`);
      }
      return spawnSync(
        process.execPath,
        generatorArgs,
        {
          cwd: sharedDir,
          encoding: "utf8",
        },
      );
    };

    const commandResult = runGenerator(args.method);
    if (commandResult.status === 0) {
      return { ok: true };
    }

    if (args.method === "wfc") {
      const fallbackResult = runGenerator("noise");
      if (fallbackResult.status === 0) {
        console.warn(
          `[map-generation][fallback] context=${args.contextLabel} mapId=${args.mapId} requested=wfc fallback=noise`,
        );
        return { ok: true };
      }
    }

    const stderr = (commandResult.stderr ?? "").trim();
    const stdout = (commandResult.stdout ?? "").trim();
    return {
      ok: false,
      reason: "generator-process-failed",
      message: `Map generation failed during ${args.contextLabel} (status ${commandResult.status ?? "unknown"}).`,
      stderr: stderr.length > 0 ? stderr : undefined,
      stdout: stdout.length > 0 ? stdout : undefined,
      exitStatus: commandResult.status ?? undefined,
    };
  }
}
