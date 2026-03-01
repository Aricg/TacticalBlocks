import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';

const DEFAULT_SERVER_HOST = 'localhost';
const DEFAULT_SERVER_PORT = 2567;

const getNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const parseConfiguredPort = (configuredPort: unknown): number => {
  const configuredPortValue = getNonEmptyString(configuredPort);
  if (!configuredPortValue) {
    return DEFAULT_SERVER_PORT;
  }
  const parsedPort = Number.parseInt(configuredPortValue, 10);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return DEFAULT_SERVER_PORT;
  }
  return parsedPort;
};

export const resolveServerEndpoint = (): string => {
  const explicitEndpoint = getNonEmptyString(import.meta.env.VITE_SERVER_ENDPOINT);
  if (explicitEndpoint) {
    return explicitEndpoint;
  }
  const host = getNonEmptyString(import.meta.env.VITE_SERVER_HOST)
    ?? DEFAULT_SERVER_HOST;
  const port = parseConfiguredPort(import.meta.env.VITE_SERVER_PORT);
  return `ws://${host}:${port}`;
};

const normalizeMapImageBaseUrl = (baseUrl: string): string =>
  baseUrl.replace(/\/+$/, '');

const resolveDefaultMapImageBaseUrl = (): string => {
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  if (
    pathname === '/tacticalblocks'
    || pathname.startsWith('/tacticalblocks/')
  ) {
    return '/tacticalblocks/maps';
  }
  return '/maps';
};

function resolveBackendMapImageBaseUrls(): string[] {
  const endpoint = resolveServerEndpoint();
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return [];
  }

  const httpProtocol =
    parsedEndpoint.protocol === 'wss:' ? 'https:' : 'http:';
  const basePath = parsedEndpoint.pathname.replace(/\/+$/, '');
  const origin = `${httpProtocol}//${parsedEndpoint.host}`;
  const candidates: string[] = [];

  if (basePath.length > 0) {
    candidates.push(`${origin}${basePath}/maps`);
    if (basePath.endsWith('/ws')) {
      const withoutWs = basePath.slice(0, -3);
      candidates.push(`${origin}${withoutWs}/maps`);
    }
  } else {
    candidates.push(`${origin}/maps`);
  }

  return candidates.map((value) => normalizeMapImageBaseUrl(value));
}

const MAP_IMAGE_BASE_URL = normalizeMapImageBaseUrl(
  getNonEmptyString(import.meta.env.VITE_MAP_IMAGE_BASE_URL)
    ?? resolveDefaultMapImageBaseUrl(),
);
const BACKEND_MAP_IMAGE_BASE_URLS = resolveBackendMapImageBaseUrls();

export function getTextureKeyForMapId(mapId: string): string {
  return `battle-map-${mapId}`;
}

export function resolveRuntimeMapImageCandidatesById(mapId: string): string[] {
  const normalizedMapId = mapId.trim();
  if (normalizedMapId.length === 0) {
    return [];
  }

  const mapFileName = `${encodeURIComponent(normalizedMapId)}-16c.png`;
  const candidateBaseUrls = [MAP_IMAGE_BASE_URL, ...BACKEND_MAP_IMAGE_BASE_URLS];
  const uniqueCandidates = new Set<string>();
  for (const baseUrl of candidateBaseUrls) {
    uniqueCandidates.add(`${baseUrl}/${mapFileName}`);
  }
  return Array.from(uniqueCandidates);
}

export function resolveRuntimeMapGridSidecarCandidatesById(mapId: string): string[] {
  const normalizedMapId = mapId.trim();
  if (normalizedMapId.length === 0) {
    return [];
  }

  const mapFileName = `${encodeURIComponent(normalizedMapId)}.elevation-grid.json`;
  const candidateBaseUrls = [MAP_IMAGE_BASE_URL, ...BACKEND_MAP_IMAGE_BASE_URLS];
  const uniqueCandidates = new Set<string>();
  for (const baseUrl of candidateBaseUrls) {
    uniqueCandidates.add(`${baseUrl}/${mapFileName}`);
  }
  return Array.from(uniqueCandidates);
}

export function resolveMapImageById(mapId: string): string | undefined {
  const candidates = resolveRuntimeMapImageCandidatesById(mapId);
  return candidates[0];
}

export function resolveInitialMapId(): string {
  const configuredMapId = GAMEPLAY_CONFIG.map.activeMapId;
  if (configuredMapId.trim().length > 0) {
    return configuredMapId;
  }

  const fallbackFromConfig = GAMEPLAY_CONFIG.map.availableMapIds.find((mapId) =>
    mapId.trim().length > 0,
  );
  if (fallbackFromConfig) {
    return fallbackFromConfig;
  }

  throw new Error('No valid map IDs were configured.');
}
