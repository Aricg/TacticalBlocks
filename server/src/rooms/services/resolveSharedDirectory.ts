import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSharedDirectory(
  roomModuleUrl: string,
  cwd: string = process.cwd(),
): string | null {
  const roomDir = path.dirname(fileURLToPath(roomModuleUrl));
  const candidates = [
    path.resolve(cwd, "../shared"),
    path.resolve(cwd, "shared"),
    path.resolve(roomDir, "../../../shared"),
    path.resolve(roomDir, "../../../../shared"),
    path.resolve(roomDir, "../../../../../shared"),
    path.resolve(roomDir, "../../../../../../shared"),
  ];

  for (const candidate of candidates) {
    const generatorScriptPath = path.join(
      candidate,
      "scripts",
      "generate-random-map.mjs",
    );
    if (existsSync(generatorScriptPath)) {
      return candidate;
    }
  }

  return null;
}
