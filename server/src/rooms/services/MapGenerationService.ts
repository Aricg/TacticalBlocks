import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { MapGenerationMethod } from "../../../../shared/src/networkContracts.js";
import { resolveSharedDirectory } from "./resolveSharedDirectory.js";

type GenerateRuntimeMapArgs = {
  mapId: string;
  method: MapGenerationMethod;
  seed: string;
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

    const commandResult = spawnSync(
      process.execPath,
      [
        generatorScriptPath,
        "--map-id",
        args.mapId,
        "--seed",
        args.seed,
        "--method",
        args.method,
        "--output-dir",
        sharedDir,
        "--no-sync",
      ],
      {
        cwd: sharedDir,
        encoding: "utf8",
      },
    );

    if (commandResult.status !== 0) {
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

    return {
      ok: true,
    };
  }
}
