import type { NetworkLobbyStateUpdate, NetworkMatchPhase } from './NetworkManager';
import type { LobbyOverlayPlayerView } from './LobbyOverlayController';
import { Team } from './Team';

type HasMapImage = (mapId: string) => boolean;
type NormalizeTeam = (teamValue: string) => Team;
type ApplySelectedLobbyMap = (
  requestedMapId: string,
  forceTextureReload: boolean,
) => void;
type ApplyDerivedLobbyState = (lobbyState: LobbyStateDerivation) => void;
type OnPhaseTransition = (phase: NetworkMatchPhase) => void;

type LobbyMapRequestGate = {
  matchPhase: NetworkMatchPhase;
  hasExitedBattle: boolean;
};

export type LobbyMapSelectionEffects = {
  setSelectedLobbyMapId: (mapId: string) => void;
  applyMapIdToRuntimeTerrain: (mapId: string) => void;
  resetNeutralCities: () => void;
  rebuildCitiesForCurrentMap: () => void;
  drawImpassableOverlay: () => void;
  reloadMapTexture: (mapId: string, revision: number) => void;
  applyLoadedMapTexture: (mapId: string) => void;
  initializeMapTerrainSampling: () => void;
  refreshFogOfWar: () => void;
};

export type LobbyStateDerivation = {
  nextPhase: NetworkMatchPhase;
  localSessionId: string;
  lobbyMapRevision: number;
  isLobbyGeneratingMap: boolean;
  availableMapIds: string[];
  requestedMapId: string;
  forceTextureReload: boolean;
  lobbyPlayers: LobbyOverlayPlayerView[];
  localLobbyReady: boolean;
};

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

export function applySelectedLobbyMapFlow({
  requestedMapId,
  availableMapIds,
  activeMapId,
  lobbyMapRevision,
  forceTextureReload = false,
  hasMapImage,
  resolveFallbackMapId,
  effects,
}: {
  requestedMapId: string;
  availableMapIds: string[];
  activeMapId: string;
  lobbyMapRevision: number;
  forceTextureReload?: boolean;
  hasMapImage: HasMapImage;
  resolveFallbackMapId: () => string;
  effects: LobbyMapSelectionEffects;
}): void {
  const nextMapId = resolveLobbyMapId({
    requestedMapId,
    availableMapIds,
    hasMapImage,
    resolveFallbackMapId,
  });
  effects.setSelectedLobbyMapId(nextMapId);

  if (nextMapId === activeMapId && !forceTextureReload) {
    return;
  }

  if (nextMapId === activeMapId) {
    effects.applyMapIdToRuntimeTerrain(nextMapId);
    effects.resetNeutralCities();
    effects.rebuildCitiesForCurrentMap();
    effects.drawImpassableOverlay();
    effects.reloadMapTexture(nextMapId, lobbyMapRevision);
    effects.refreshFogOfWar();
    return;
  }

  effects.applyLoadedMapTexture(nextMapId);
  effects.applyMapIdToRuntimeTerrain(nextMapId);
  effects.resetNeutralCities();
  effects.rebuildCitiesForCurrentMap();
  effects.drawImpassableOverlay();
  effects.initializeMapTerrainSampling();
  effects.refreshFogOfWar();
}

export function deriveLobbyState({
  lobbyStateUpdate,
  previousMapRevision,
  previousLobbyPlayers,
  activeMapId,
  selectedLobbyMapId,
  fallbackAvailableMapIds,
  normalizeTeam,
}: {
  lobbyStateUpdate: NetworkLobbyStateUpdate;
  previousMapRevision: number;
  previousLobbyPlayers: readonly LobbyOverlayPlayerView[];
  activeMapId: string;
  selectedLobbyMapId: string;
  fallbackAvailableMapIds: readonly string[];
  normalizeTeam: NormalizeTeam;
}): LobbyStateDerivation {
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

  const normalizedLobbyPlayers: LobbyOverlayPlayerView[] = lobbyStateUpdate.players.map(
    (player) => ({
      sessionId: player.sessionId,
      team: normalizeTeam(player.team),
      ready: player.ready,
    }),
  );
  const lobbyPlayers =
    normalizedLobbyPlayers.length > 0 || !isLobbyGeneratingMap
      ? normalizedLobbyPlayers
      : [...previousLobbyPlayers];

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

export function applyLobbyStateFlow({
  lobbyStateUpdate,
  previousPhase,
  previousMapRevision,
  previousLobbyPlayers,
  activeMapId,
  selectedLobbyMapId,
  fallbackAvailableMapIds,
  normalizeTeam,
  applySelectedLobbyMap,
  applyDerivedLobbyState,
  onPhaseTransition,
}: {
  lobbyStateUpdate: NetworkLobbyStateUpdate;
  previousPhase: NetworkMatchPhase;
  previousMapRevision: number;
  previousLobbyPlayers: readonly LobbyOverlayPlayerView[];
  activeMapId: string;
  selectedLobbyMapId: string;
  fallbackAvailableMapIds: readonly string[];
  normalizeTeam: NormalizeTeam;
  applySelectedLobbyMap: ApplySelectedLobbyMap;
  applyDerivedLobbyState: ApplyDerivedLobbyState;
  onPhaseTransition: OnPhaseTransition;
}): void {
  const lobbyState = deriveLobbyState({
    lobbyStateUpdate,
    previousMapRevision,
    previousLobbyPlayers,
    activeMapId,
    selectedLobbyMapId,
    fallbackAvailableMapIds,
    normalizeTeam,
  });

  applyDerivedLobbyState(lobbyState);
  applySelectedLobbyMap(lobbyState.requestedMapId, lobbyState.forceTextureReload);

  if (previousPhase !== lobbyState.nextPhase) {
    onPhaseTransition(lobbyState.nextPhase);
  }
}

export function getLobbyMapStepRequest({
  matchPhase,
  hasExitedBattle,
  selectedLobbyMapId,
  availableMapIds,
  step,
  hasMapImage,
}: LobbyMapRequestGate & {
  selectedLobbyMapId: string;
  availableMapIds: string[];
  step: number;
  hasMapImage: HasMapImage;
}): string | null {
  if (!canRequestLobbyMapChange({ matchPhase, hasExitedBattle })) {
    return null;
  }

  return getSteppedLobbyMapId({
    selectedLobbyMapId,
    availableMapIds,
    step,
    hasMapImage,
  });
}

export function canRequestRandomLobbyMap({
  matchPhase,
  hasExitedBattle,
  availableMapIds,
  hasMapImage,
}: LobbyMapRequestGate & {
  availableMapIds: string[];
  hasMapImage: HasMapImage;
}): boolean {
  if (!canRequestLobbyMapChange({ matchPhase, hasExitedBattle })) {
    return false;
  }

  return availableMapIds.filter((mapId) => hasMapImage(mapId)).length > 1;
}

export function canRequestGenerateLobbyMap({
  matchPhase,
  hasExitedBattle,
  isLobbyGeneratingMap,
}: LobbyMapRequestGate & {
  isLobbyGeneratingMap: boolean;
}): boolean {
  return (
    canRequestLobbyMapChange({ matchPhase, hasExitedBattle }) &&
    !isLobbyGeneratingMap
  );
}

function canRequestLobbyMapChange({
  matchPhase,
  hasExitedBattle,
}: LobbyMapRequestGate): boolean {
  return matchPhase === 'LOBBY' && !hasExitedBattle;
}
