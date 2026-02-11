import type { RuntimeTuning } from "../../../shared/src/runtimeTuning.js";

export type PlayerTeam = "BLUE" | "RED";
export type CityOwner = PlayerTeam | "NEUTRAL";
export type MatchPhase = "LOBBY" | "BATTLE";
export type Vector2 = {
  x: number;
  y: number;
};
export type GridCoordinate = {
  col: number;
  row: number;
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
export type RuntimeTuningUpdateMessage = Partial<RuntimeTuning>;
export type LobbyReadyMessage = {
  ready: boolean;
};
export type LobbySelectMapMessage = {
  mapId: string;
};
export type LobbyGenerateMapMessage = Record<string, never>;
export type LobbyRandomMapMessage = Record<string, never>;
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
export type BattleEndReason = "NO_UNITS" | "NO_CITIES" | "TIEBREAKER";
export type BattleEndedMessage = {
  winner: PlayerTeam | "DRAW";
  loser: PlayerTeam | null;
  reason: BattleEndReason;
  blueUnits: number;
  redUnits: number;
  blueCities: number;
  redCities: number;
};
export type UnitMovementState = {
  destinationCell: GridCoordinate | null;
  queuedCells: GridCoordinate[];
  targetRotation: number | null;
  movementCommandMode: MovementCommandMode;
  movementBudget: number;
};
export type CitySpawnSource = {
  sourceId: string;
  owner: CityOwner;
  cityCell: GridCoordinate;
};
