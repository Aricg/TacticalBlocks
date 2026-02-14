import type { RuntimeTuning } from './runtimeTuning.js';

export const NETWORK_MESSAGE_TYPES = {
  unitPath: 'unitPath',
  unitCancelMovement: 'unitCancelMovement',
  unitToggleMovementPause: 'unitToggleMovementPause',
  runtimeTuningUpdate: 'runtimeTuningUpdate',
  lobbyReady: 'lobbyReady',
  lobbySelectMap: 'lobbySelectMap',
  lobbyRandomMap: 'lobbyRandomMap',
  lobbyGenerateMap: 'lobbyGenerateMap',
  teamAssigned: 'teamAssigned',
  runtimeTuningSnapshot: 'runtimeTuningSnapshot',
  lobbyState: 'lobbyState',
  battleEnded: 'battleEnded',
} as const;

export type PlayerTeam = 'BLUE' | 'RED';
export type MatchPhase = 'LOBBY' | 'BATTLE';
export type BattleEndReason = 'NO_UNITS' | 'NO_CITIES' | 'TIEBREAKER';

export type Vector2 = {
  x: number;
  y: number;
};

export type MovementCommandMode = {
  speedMultiplier: number;
  rotateToFace: boolean;
};

export type UnitPathMessage = {
  unitId: string;
  path: Vector2[];
  movementCommandMode?: Partial<MovementCommandMode>;
};

export type UnitCancelMovementMessage = {
  unitId: string;
};

export type UnitToggleMovementPauseMessage = {
  unitId: string;
};

export type RuntimeTuningSnapshotMessage = RuntimeTuning;
export type RuntimeTuningUpdateMessage = Partial<RuntimeTuning>;

export type LobbyReadyMessage = {
  ready: boolean;
};

export type LobbySelectMapMessage = {
  mapId: string;
};

export type LobbyGenerateMapMessage = Record<string, never>;
export type LobbyRandomMapMessage = Record<string, never>;

export type TeamAssignedMessage = {
  team: PlayerTeam;
};

export type LobbyPlayerSnapshot = {
  sessionId: string;
  team: PlayerTeam;
  ready: boolean;
};

export type LobbyStateMessage = {
  phase: MatchPhase;
  players: LobbyPlayerSnapshot[];
  mapId: string;
  availableMapIds: string[];
  mapRevision: number;
  isGeneratingMap: boolean;
};

export type BattleEndedMessage = {
  winner: PlayerTeam | 'DRAW';
  loser: PlayerTeam | null;
  reason: BattleEndReason;
  blueUnits: number;
  redUnits: number;
  blueCities: number;
  redCities: number;
};
