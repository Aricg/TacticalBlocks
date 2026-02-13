import { Client, Room, getStateCallbacks } from 'colyseus.js';
import {
  NETWORK_MESSAGE_TYPES,
  type BattleEndedMessage,
  type LobbyGenerateMapMessage,
  type LobbyRandomMapMessage,
  type LobbyReadyMessage,
  type LobbySelectMapMessage,
  type LobbyStateMessage,
  type MatchPhase,
  type PlayerTeam,
  type RuntimeTuningSnapshotMessage,
  type RuntimeTuningUpdateMessage,
  type TeamAssignedMessage,
  type UnitCancelMovementMessage,
  type UnitPathMessage,
} from '../../shared/src/networkContracts.js';

type ServerUnitState = {
  x: number;
  y: number;
  rotation: number;
  team: string;
  unitId: string;
  health: number;
  moraleScore: number;
};

type ServerInfluenceGridState = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  revision: number;
  cells: ArrayLike<number>;
};

type BattleRoomState = {
  units: unknown;
  influenceGrid: ServerInfluenceGridState;
  mapId: string;
  redCityOwner: string;
  blueCityOwner: string;
  neutralCityOwners: ArrayLike<string>;
};

export type NetworkUnitSnapshot = {
  unitId: string;
  team: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  moraleScore: number;
};

export type NetworkUnitPositionUpdate = {
  unitId: string;
  x: number;
  y: number;
};

export type NetworkUnitHealthUpdate = {
  unitId: string;
  health: number;
};

export type NetworkUnitRotationUpdate = {
  unitId: string;
  rotation: number;
};

export type NetworkUnitMoraleUpdate = {
  unitId: string;
  moraleScore: number;
};

export type NetworkInfluenceGridUpdate = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  revision: number;
  cells: number[];
};

export type NetworkCityOwnershipUpdate = {
  redCityOwner: string;
  blueCityOwner: string;
  neutralCityOwners: string[];
};

export type NetworkMatchPhase = MatchPhase;

export type NetworkLobbyPlayer = {
  sessionId: string;
  team: string;
  ready: boolean;
};

export type NetworkLobbyStateUpdate = {
  phase: NetworkMatchPhase;
  players: NetworkLobbyPlayer[];
  mapId: string;
  availableMapIds: string[];
  mapRevision: number;
  isGeneratingMap: boolean;
  selfSessionId: string;
};

export type NetworkBattleEndedUpdate = BattleEndedMessage;
export type NetworkUnitPathCommand = UnitPathMessage;

type UnitAddedHandler = (unit: NetworkUnitSnapshot) => void;
type UnitRemovedHandler = (unitId: string) => void;
type TeamAssignedHandler = (team: PlayerTeam) => void;
type UnitPositionChangedHandler = (position: NetworkUnitPositionUpdate) => void;
type UnitHealthChangedHandler = (healthUpdate: NetworkUnitHealthUpdate) => void;
type UnitRotationChangedHandler = (
  rotationUpdate: NetworkUnitRotationUpdate,
) => void;
type UnitMoraleChangedHandler = (
  moraleUpdate: NetworkUnitMoraleUpdate,
) => void;
type InfluenceGridChangedHandler = (
  influenceGridUpdate: NetworkInfluenceGridUpdate,
) => void;
type CityOwnershipChangedHandler = (
  cityOwnershipUpdate: NetworkCityOwnershipUpdate,
) => void;
type RuntimeTuningChangedHandler = (
  runtimeTuning: RuntimeTuningSnapshotMessage,
) => void;
type LobbyStateChangedHandler = (
  lobbyStateUpdate: NetworkLobbyStateUpdate,
) => void;
type BattleEndedHandler = (
  battleEndedUpdate: NetworkBattleEndedUpdate,
) => void;

export class NetworkManager {
  private readonly client: Client;
  private readonly roomName: string;
  private room: Room<BattleRoomState> | null = null;
  private detachCallbacks: Array<() => void> = [];

  constructor(
    private readonly onUnitAdded: UnitAddedHandler,
    private readonly onUnitRemoved: UnitRemovedHandler,
    private readonly onTeamAssigned: TeamAssignedHandler,
    private readonly onLobbyStateChanged: LobbyStateChangedHandler,
    private readonly onBattleEnded: BattleEndedHandler,
    private readonly onUnitPositionChanged: UnitPositionChangedHandler,
    private readonly onUnitHealthChanged: UnitHealthChangedHandler,
    private readonly onUnitRotationChanged: UnitRotationChangedHandler,
    private readonly onUnitMoraleChanged: UnitMoraleChangedHandler,
    private readonly onInfluenceGridChanged: InfluenceGridChangedHandler,
    private readonly onCityOwnershipChanged: CityOwnershipChangedHandler,
    private readonly onRuntimeTuningChanged: RuntimeTuningChangedHandler,
    endpoint = 'ws://localhost:2567',
    roomName = 'battle',
  ) {
    this.client = new Client(endpoint);
    this.roomName = roomName;
  }

  public async connect(): Promise<void> {
    if (this.room) {
      return;
    }

    const room = await this.client.joinOrCreate<BattleRoomState>(this.roomName);
    this.room = room;

    room.onMessage(
      NETWORK_MESSAGE_TYPES.teamAssigned,
      (message: TeamAssignedMessage) => {
        this.onTeamAssigned(message.team);
      },
    );
    room.onMessage(
      NETWORK_MESSAGE_TYPES.runtimeTuningSnapshot,
      (message: RuntimeTuningSnapshotMessage) => {
        this.onRuntimeTuningChanged(message);
      },
    );
    room.onMessage(
      NETWORK_MESSAGE_TYPES.lobbyState,
      (message: LobbyStateMessage) => {
        this.onLobbyStateChanged(
          this.normalizeLobbyStateUpdate(message, room.sessionId),
        );
      },
    );
    room.onMessage(
      NETWORK_MESSAGE_TYPES.battleEnded,
      (message: BattleEndedMessage) => {
        this.onBattleEnded(this.normalizeBattleEndedUpdate(message));
      },
    );

    const $ = getStateCallbacks(room);
    room.onStateChange.once((state) => {
      const emitInfluenceGridUpdate = () => {
        this.onInfluenceGridChanged({
          width: state.influenceGrid.width,
          height: state.influenceGrid.height,
          cellWidth: state.influenceGrid.cellWidth,
          cellHeight: state.influenceGrid.cellHeight,
          revision: state.influenceGrid.revision,
          cells: Array.from(state.influenceGrid.cells, (value) =>
            Number.isFinite(value) ? value : 0,
          ),
        });
      };
      const emitCityOwnershipUpdate = () => {
        this.onCityOwnershipChanged({
          redCityOwner: state.redCityOwner,
          blueCityOwner: state.blueCityOwner,
          neutralCityOwners: Array.from(
            state.neutralCityOwners,
            (owner) => owner ?? 'NEUTRAL',
          ),
        });
      };

      const detachInfluenceGridRevision = $(state.influenceGrid).listen(
        'revision',
        () => {
          emitInfluenceGridUpdate();
        },
      );
      const detachRedCityOwner = $(state).listen('redCityOwner', () => {
        emitCityOwnershipUpdate();
      });
      const detachBlueCityOwner = $(state).listen('blueCityOwner', () => {
        emitCityOwnershipUpdate();
      });
      const detachNeutralCityOwnerChange = $(state).neutralCityOwners.onChange(
        () => {
          emitCityOwnershipUpdate();
        },
      );
      this.detachCallbacks.push(
        detachInfluenceGridRevision,
        detachRedCityOwner,
        detachBlueCityOwner,
        detachNeutralCityOwnerChange,
      );
      emitInfluenceGridUpdate();
      emitCityOwnershipUpdate();

      const detachUnitAdd = $(state).units.onAdd(
        (serverUnit: ServerUnitState, unitKey: string) => {
          const unitId = serverUnit.unitId || unitKey;
          this.onUnitAdded({
            unitId,
            team: serverUnit.team,
            x: serverUnit.x,
            y: serverUnit.y,
            rotation: serverUnit.rotation,
            health: serverUnit.health,
            moraleScore: Number.isFinite(serverUnit.moraleScore)
              ? serverUnit.moraleScore
              : 0,
          });

          const detachX = $(serverUnit).listen('x', (x: number) => {
            this.onUnitPositionChanged({
              unitId,
              x,
              y: serverUnit.y,
            });
          });
          const detachY = $(serverUnit).listen('y', (y: number) => {
            this.onUnitPositionChanged({
              unitId,
              x: serverUnit.x,
              y,
            });
          });
          const detachHealth = $(serverUnit).listen('health', (health: number) => {
            this.onUnitHealthChanged({
              unitId,
              health,
            });
          });
          const detachRotation = $(serverUnit).listen(
            'rotation',
            (rotation: number) => {
              this.onUnitRotationChanged({
                unitId,
                rotation,
              });
            },
          );
          const detachMoraleScore = $(serverUnit).listen(
            'moraleScore',
            (moraleScore: number) => {
              this.onUnitMoraleChanged({
                unitId,
                moraleScore: Number.isFinite(moraleScore)
                  ? moraleScore
                  : 0,
              });
            },
          );
          this.detachCallbacks.push(
            detachX,
            detachY,
            detachHealth,
            detachRotation,
            detachMoraleScore,
          );
        },
        true,
      );
      const detachUnitRemove = $(state).units.onRemove(
        (serverUnit: ServerUnitState, unitKey: string) => {
          this.onUnitRemoved(serverUnit.unitId || unitKey);
        },
      );

      this.detachCallbacks.push(detachUnitAdd, detachUnitRemove);
    });

    room.onError((code, message) => {
      console.error(`Colyseus room error (${code}): ${message ?? 'unknown error'}`);
    });
  }

  public sendUnitPathCommand(command: NetworkUnitPathCommand): void {
    if (!this.room) {
      return;
    }

    this.room.send(NETWORK_MESSAGE_TYPES.unitPath, command);
  }

  public sendUnitCancelMovement(unitId: string): void {
    if (!this.room) {
      return;
    }

    const message: UnitCancelMovementMessage = { unitId };
    this.room.send(NETWORK_MESSAGE_TYPES.unitCancelMovement, message);
  }

  public sendRuntimeTuningUpdate(update: RuntimeTuningUpdateMessage): void {
    if (!this.room) {
      return;
    }

    this.room.send(NETWORK_MESSAGE_TYPES.runtimeTuningUpdate, update);
  }

  public sendLobbyReady(ready: boolean): void {
    if (!this.room) {
      return;
    }

    const message: LobbyReadyMessage = { ready };
    this.room.send(NETWORK_MESSAGE_TYPES.lobbyReady, message);
  }

  public sendLobbySelectMap(mapId: string): void {
    if (!this.room) {
      return;
    }

    const message: LobbySelectMapMessage = { mapId };
    this.room.send(NETWORK_MESSAGE_TYPES.lobbySelectMap, message);
  }

  public sendLobbyRandomMap(): void {
    if (!this.room) {
      return;
    }

    const message: LobbyRandomMapMessage = {};
    this.room.send(NETWORK_MESSAGE_TYPES.lobbyRandomMap, message);
  }

  public sendLobbyGenerateMap(): void {
    if (!this.room) {
      return;
    }

    const message: LobbyGenerateMapMessage = {};
    this.room.send(NETWORK_MESSAGE_TYPES.lobbyGenerateMap, message);
  }

  public async disconnect(): Promise<void> {
    if (!this.room) {
      return;
    }

    for (const detach of this.detachCallbacks) {
      detach();
    }
    this.detachCallbacks = [];

    const room = this.room;
    this.room = null;
    await room.leave();
  }

  private normalizeLobbyStateUpdate(
    message: LobbyStateMessage,
    selfSessionId: string,
  ): NetworkLobbyStateUpdate {
    const phase: NetworkMatchPhase =
      message?.phase === 'BATTLE' ? 'BATTLE' : 'LOBBY';
    const players = Array.isArray(message?.players)
      ? message.players
      : [];

    const normalizedPlayers = players
      .map((player) => {
        if (typeof player?.sessionId !== 'string') {
          return null;
        }

        const rawTeam =
          typeof player?.team === 'string' ? player.team.toUpperCase() : '';
        const normalizedTeam = rawTeam === 'RED' ? 'RED' : 'BLUE';
        const normalizedReady = player?.ready === true;

        return {
          sessionId: player.sessionId,
          team: normalizedTeam,
          ready: normalizedReady,
        };
      })
      .filter((player): player is NetworkLobbyPlayer => player !== null);

    return {
      phase,
      players: normalizedPlayers,
      mapId: typeof message?.mapId === 'string' ? message.mapId : '',
      availableMapIds: Array.isArray(message?.availableMapIds)
        ? message.availableMapIds.filter(
            (mapId): mapId is string => typeof mapId === 'string',
          )
        : [],
      mapRevision:
        typeof message?.mapRevision === 'number' &&
        Number.isFinite(message.mapRevision)
          ? message.mapRevision
          : 0,
      isGeneratingMap: message?.isGeneratingMap === true,
      selfSessionId,
    };
  }

  private normalizeBattleEndedUpdate(
    message: BattleEndedMessage,
  ): NetworkBattleEndedUpdate {
    const winner =
      message?.winner === 'BLUE' || message?.winner === 'RED'
        ? message.winner
        : 'DRAW';
    const loser =
      message?.loser === 'BLUE' || message?.loser === 'RED'
        ? message.loser
        : null;
    const reason =
      message?.reason === 'NO_UNITS' ||
      message?.reason === 'NO_CITIES' ||
      message?.reason === 'TIEBREAKER'
        ? message.reason
        : 'TIEBREAKER';
    const safeCount = (value: number) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.round(value))
        : 0;

    return {
      winner,
      loser,
      reason,
      blueUnits: safeCount(message?.blueUnits),
      redUnits: safeCount(message?.redUnits),
      blueCities: safeCount(message?.blueCities),
      redCities: safeCount(message?.redCities),
    };
  }
}
