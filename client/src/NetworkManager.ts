import { Client, Room, getStateCallbacks } from 'colyseus.js';
import type { RuntimeTuning } from '../../shared/src/runtimeTuning.js';

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

export type NetworkMatchPhase = 'LOBBY' | 'BATTLE';

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

export type NetworkUnitPathCommand = {
  unitId: string;
  path: Array<{ x: number; y: number }>;
  movementCommandMode?: {
    speedMultiplier: number;
    rotateToFace: boolean;
  };
};

type UnitAddedHandler = (unit: NetworkUnitSnapshot) => void;
type UnitRemovedHandler = (unitId: string) => void;
type TeamAssignedHandler = (team: string) => void;
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
type RuntimeTuningChangedHandler = (runtimeTuning: RuntimeTuning) => void;
type LobbyStateChangedHandler = (
  lobbyStateUpdate: NetworkLobbyStateUpdate,
) => void;

type TeamAssignedMessage = {
  team: string;
};
type LobbyPlayerMessage = {
  sessionId: string;
  team: string;
  ready: boolean;
};
type LobbyStateMessage = {
  phase: string;
  players: LobbyPlayerMessage[];
  mapId: string;
  availableMapIds: string[];
  mapRevision: number;
  isGeneratingMap: boolean;
};

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

    room.onMessage('teamAssigned', (message: TeamAssignedMessage) => {
      this.onTeamAssigned(message.team);
    });
    room.onMessage('runtimeTuningSnapshot', (message: RuntimeTuning) => {
      this.onRuntimeTuningChanged(message);
    });
    room.onMessage('lobbyState', (message: LobbyStateMessage) => {
      this.onLobbyStateChanged(
        this.normalizeLobbyStateUpdate(message, room.sessionId),
      );
    });

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

    this.room.send('unitPath', command);
  }

  public sendUnitCancelMovement(unitId: string): void {
    if (!this.room) {
      return;
    }

    this.room.send('unitCancelMovement', { unitId });
  }

  public sendRuntimeTuningUpdate(update: Partial<RuntimeTuning>): void {
    if (!this.room) {
      return;
    }

    this.room.send('runtimeTuningUpdate', update);
  }

  public sendLobbyReady(ready: boolean): void {
    if (!this.room) {
      return;
    }

    this.room.send('lobbyReady', { ready });
  }

  public sendLobbySelectMap(mapId: string): void {
    if (!this.room) {
      return;
    }

    this.room.send('lobbySelectMap', { mapId });
  }

  public sendLobbyRandomMap(): void {
    if (!this.room) {
      return;
    }

    this.room.send('lobbyRandomMap', {});
  }

  public sendLobbyGenerateMap(): void {
    if (!this.room) {
      return;
    }

    this.room.send('lobbyGenerateMap', {});
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

    return {
      phase,
      players: players
        .filter(
          (player): player is LobbyPlayerMessage =>
            typeof player?.sessionId === 'string' &&
            typeof player?.team === 'string' &&
            typeof player?.ready === 'boolean',
        )
        .map((player) => ({
          sessionId: player.sessionId,
          team: player.team,
          ready: player.ready,
        })),
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
}
