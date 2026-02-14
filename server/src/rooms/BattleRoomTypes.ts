import type {
  MovementCommandMode,
  MovementCommandModeInput,
  PlayerTeam,
} from "../../../shared/src/networkContracts.js";

export type {
  BattleEndReason,
  BattleEndedMessage,
  LobbyGenerateMapMessage,
  LobbyPlayerSnapshot,
  LobbyRandomMapMessage,
  LobbyReadyMessage,
  LobbySelectMapMessage,
  LobbyStateMessage,
  MatchPhase,
  MovementCommandMode,
  MovementCommandModeInput,
  PlayerTeam,
  RuntimeTuningUpdateMessage,
  UnitCancelMovementMessage,
  UnitToggleMovementPauseMessage,
  UnitPathMessage,
  UnitPathStateMessage,
  Vector2,
} from "../../../shared/src/networkContracts.js";

export type CityOwner = PlayerTeam | "NEUTRAL";
export type GridCoordinate = {
  col: number;
  row: number;
};
export type UnitMovementState = {
  destinationCell: GridCoordinate | null;
  queuedCells: GridCoordinate[];
  targetRotation: number | null;
  movementCommandMode: MovementCommandMode;
  movementBudget: number;
  isPaused: boolean;
};
export type CitySpawnSource = {
  sourceId: string;
  owner: CityOwner;
  cityCell: GridCoordinate;
};
