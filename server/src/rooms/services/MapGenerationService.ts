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

  generateRuntimeMap(args: GenerateRuntimeMapArgs): boolean {
    const sharedDir = resolveSharedDirectory(args.roomModuleUrl);
    if (!sharedDir) {
      console.error("Could not resolve shared directory for map generation.");
      return false;
    }

    const generatorScriptPath = path.join(
      sharedDir,
      "scripts",
      "generate-random-map.mjs",
    );
    if (!existsSync(generatorScriptPath)) {
      console.error(`Map generator script not found: ${generatorScriptPath}`);
      return false;
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
      console.error(
        `Map generation failed during ${args.contextLabel} (status ${commandResult.status ?? "unknown"}).`,
      );
      if (stderr.length > 0) {
        console.error(stderr);
      }
      if (stdout.length > 0) {
        console.error(stdout);
      }
      return false;
    }

    return true;
  }
}
