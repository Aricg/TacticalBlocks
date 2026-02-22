import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveSharedDirectory } from "./rooms/services/resolveSharedDirectory.js";

const MAP_ROUTE_PREFIXES = [
  "/maps/",
  "/tacticalblocks/maps/",
  "/tacticalblocks/ws/maps/",
] as const;
const MAP_FILE_NAME_PATTERN = /^[^/\\]+\.(?:png)$/i;

function getRequestPath(requestUrl: string): string | null {
  try {
    const parsed = new URL(requestUrl, "http://localhost");
    return parsed.pathname;
  } catch {
    return null;
  }
}

function resolveRuntimeMapPath(requestPath: string, sharedDir: string): string | null {
  const matchedPrefix = MAP_ROUTE_PREFIXES.find((prefix) =>
    requestPath.startsWith(prefix),
  );
  if (!matchedPrefix) {
    return null;
  }

  const encodedMapFileName = requestPath.slice(matchedPrefix.length);
  let mapFileName = "";
  try {
    mapFileName = decodeURIComponent(encodedMapFileName);
  } catch {
    return null;
  }

  if (!MAP_FILE_NAME_PATTERN.test(mapFileName)) {
    return null;
  }

  const resolvedMapPath = path.resolve(sharedDir, mapFileName);
  const relativePath = path.relative(sharedDir, resolvedMapPath);
  const attemptsTraversal =
    relativePath.startsWith("..") || path.isAbsolute(relativePath);
  if (attemptsTraversal) {
    return null;
  }
  return resolvedMapPath;
}

export function attachRuntimeMapAssetHandler(
  server: {
    prependListener: (
      event: "request",
      listener: (request: IncomingMessage, response: ServerResponse) => void,
    ) => void;
  },
): void {
  server.prependListener("request", (request, response) => {
    if (response.writableEnded) {
      return;
    }
    const requestUrl = request.url;
    if (!requestUrl) {
      return;
    }
    const requestPath = getRequestPath(requestUrl);
    if (!requestPath) {
      return;
    }

    const sharedDir = resolveSharedDirectory(import.meta.url);
    if (!sharedDir) {
      return;
    }

    const resolvedMapPath = resolveRuntimeMapPath(requestPath, sharedDir);
    if (!resolvedMapPath) {
      return;
    }

    if (!existsSync(resolvedMapPath)) {
      response.statusCode = 404;
      response.end("Map not found.");
      return;
    }

    const mapStat = statSync(resolvedMapPath);
    if (!mapStat.isFile()) {
      response.statusCode = 404;
      response.end("Map not found.");
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "no-store, max-age=0");
    const stream = createReadStream(resolvedMapPath);
    stream.on("error", () => {
      if (!response.writableEnded) {
        response.statusCode = 500;
        response.end("Failed to read map file.");
      }
    });
    stream.pipe(response);
  });
}
