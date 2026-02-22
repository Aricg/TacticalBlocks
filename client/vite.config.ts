import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const allowedHosts = ['fnhl.ca', 'www.fnhl.ca', 'localhost', '127.0.0.1'];
const MAP_ROUTE_PREFIXES = ['/maps/', '/tacticalblocks/maps/'];
const MAP_FILE_NAME_PATTERN = /^[^/\\]+-16c\.png$/i;
const SHARED_MAP_DIRECTORY = path.resolve(__dirname, '../shared');

function createSharedMapRuntimePlugin(): Plugin {
  const mapMiddleware = (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    next: () => void,
  ): void => {
    const requestUrl = request.url;
    if (!requestUrl) {
      next();
      return;
    }

    const requestPath = requestUrl.split('?', 1)[0];
    if (!requestPath) {
      next();
      return;
    }

    const matchedPrefix = MAP_ROUTE_PREFIXES.find((prefix) =>
      requestPath.startsWith(prefix),
    );
    if (!matchedPrefix) {
      next();
      return;
    }

    const encodedMapFileName = requestPath.slice(matchedPrefix.length);
    let mapFileName = '';
    try {
      mapFileName = decodeURIComponent(encodedMapFileName);
    } catch {
      response.statusCode = 400;
      response.end('Invalid map URL encoding.');
      return;
    }

    if (!MAP_FILE_NAME_PATTERN.test(mapFileName)) {
      response.statusCode = 404;
      response.end('Map not found.');
      return;
    }

    const resolvedMapPath = path.resolve(SHARED_MAP_DIRECTORY, mapFileName);
    const relativePath = path.relative(SHARED_MAP_DIRECTORY, resolvedMapPath);
    const attemptsTraversal =
      relativePath.startsWith('..')
      || path.isAbsolute(relativePath);
    if (attemptsTraversal || !existsSync(resolvedMapPath)) {
      response.statusCode = 404;
      response.end('Map not found.');
      return;
    }

    const mapStat = statSync(resolvedMapPath);
    if (!mapStat.isFile()) {
      response.statusCode = 404;
      response.end('Map not found.');
      return;
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    const stream = createReadStream(resolvedMapPath);
    stream.on('error', () => {
      if (!response.writableEnded) {
        response.statusCode = 500;
        response.end('Failed to read map file.');
      }
    });
    stream.pipe(response);
  };

  return {
    name: 'shared-map-runtime',
    configureServer(server) {
      server.middlewares.use(mapMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mapMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [createSharedMapRuntimePlugin()],
  server: {
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
});
