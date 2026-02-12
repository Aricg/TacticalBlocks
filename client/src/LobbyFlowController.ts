import type { NetworkLobbyStateUpdate, NetworkMatchPhase } from './NetworkManager';
import type { LobbyOverlayPlayerView } from './LobbyOverlayController';
import { Team } from './Team';

type HasMapImage = (mapId: string) => boolean;
type NormalizeTeam = (teamValue: string) => Team;

export function resolveLobbyMapId({
  requestedMapId,
  availableMapIds,
  hasMapImage,
  resolveFallbackMapId,
}: {
  requestedMapId: string;
  availableMapIds: string[];
  hasMapImage: HasMapImage;
  resolveFallbackMapId: () => string;
}): string {
  if (hasMapImage(requestedMapId)) {
    return requestedMapId;
  }

  const firstLobbyMapIdWithImage = availableMapIds.find((mapId) =>
    hasMapImage(mapId),
  );
  if (firstLobbyMapIdWithImage) {
    return firstLobbyMapIdWithImage;
  }

  return resolveFallbackMapId();
}

export function getSteppedLobbyMapId({
  selectedLobbyMapId,
  availableMapIds,
  step,
  hasMapImage,
}: {
  selectedLobbyMapId: string;
  availableMapIds: string[];
  step: number;
  hasMapImage: HasMapImage;
}): string | null {
  const mapIds = availableMapIds.filter((mapId) => hasMapImage(mapId));
  if (mapIds.length === 0) {
    return null;
  }

  const currentIndex = mapIds.indexOf(selectedLobbyMapId);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (startIndex + step + mapIds.length) % mapIds.length;
  return mapIds[nextIndex] ?? null;
}

export function deriveLobbyState({
  lobbyStateUpdate,
  previousMapRevision,
  activeMapId,
  selectedLobbyMapId,
  fallbackAvailableMapIds,
  normalizeTeam,
}: {
  lobbyStateUpdate: NetworkLobbyStateUpdate;
  previousMapRevision: number;
  activeMapId: string;
  selectedLobbyMapId: string;
  fallbackAvailableMapIds: readonly string[];
  normalizeTeam: NormalizeTeam;
}): {
  nextPhase: NetworkMatchPhase;
  localSessionId: string;
  lobbyMapRevision: number;
  isLobbyGeneratingMap: boolean;
  availableMapIds: string[];
  requestedMapId: string;
  forceTextureReload: boolean;
  lobbyPlayers: LobbyOverlayPlayerView[];
  localLobbyReady: boolean;
} {
  const nextPhase: NetworkMatchPhase =
    lobbyStateUpdate.phase === 'BATTLE' ? 'BATTLE' : 'LOBBY';
  const localSessionId = lobbyStateUpdate.selfSessionId;
  const lobbyMapRevision = lobbyStateUpdate.mapRevision;
  const isLobbyGeneratingMap = lobbyStateUpdate.isGeneratingMap;
  const availableMapIds =
    lobbyStateUpdate.availableMapIds.length > 0
      ? [...lobbyStateUpdate.availableMapIds]
      : [...fallbackAvailableMapIds];
  const forceTextureReload =
    lobbyMapRevision !== previousMapRevision &&
    lobbyStateUpdate.mapId === activeMapId;
  const requestedMapId = lobbyStateUpdate.mapId || selectedLobbyMapId;

  const lobbyPlayers: LobbyOverlayPlayerView[] = lobbyStateUpdate.players.map(
    (player) => ({
      sessionId: player.sessionId,
      team: normalizeTeam(player.team),
      ready: player.ready,
    }),
  );

  const localLobbyPlayer = lobbyPlayers.find(
    (player) => player.sessionId === localSessionId,
  );
  const localLobbyReady = localLobbyPlayer?.ready ?? false;

  return {
    nextPhase,
    localSessionId,
    lobbyMapRevision,
    isLobbyGeneratingMap,
    availableMapIds,
    requestedMapId,
    forceTextureReload,
    lobbyPlayers,
    localLobbyReady,
  };
}
