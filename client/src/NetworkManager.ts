import { Client, Room, getStateCallbacks } from 'colyseus.js';
import {
  NETWORK_MESSAGE_TYPES,
  type BattleEndedMessage,
  type LobbyGenerateMapMessage,
  type LobbyRandomMapMessage,
  type LobbyReadyMessage,
  type LobbySelectMapMessage,
  type LobbyStateMessage,
  type MapGenerationMethod,
  type MatchPhase,
  type PlayerTeam,
  type RuntimeTuningSnapshotMessage,
  type RuntimeTuningUpdateMessage,
  type TeamAssignedMessage,
  type UnitCancelMovementMessage,
  type UnitToggleMovementPauseMessage,
  type UnitPathMessage,
  type UnitPathStateMessage,
} from '../../shared/src/networkContracts.js';
import { DEFAULT_UNIT_TYPE } from '../../shared/src/unitTypes.js';

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

const resolveServerEndpoint = (): string => {
  const explicitEndpoint = getNonEmptyString(import.meta.env.VITE_SERVER_ENDPOINT);
  if (explicitEndpoint) {
    return explicitEndpoint;
  }
  const host = getNonEmptyString(import.meta.env.VITE_SERVER_HOST)
    ?? DEFAULT_SERVER_HOST;
  const port = parseConfiguredPort(import.meta.env.VITE_SERVER_PORT);
  return `ws://${host}:${port}`;
};

type ServerUnitState = {
  x: number;
  y: number;
  rotation: number;
  team: string;
  unitId: string;
  health: number;
  moraleScore: number;
  unitType?: string;
};

type ServerInfluenceGridState = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  revision: number;
  cells: ArrayLike<number>;
};

type ServerGridCellState = {
  col: number;
  row: number;
};

type ServerSupplyLineState = {
  unitId: string;
  team: string;
  connected: boolean;
  sourceCol: number;
  sourceRow: number;
  severIndex: number;
  path: ArrayLike<ServerGridCellState>;
};

type BattleRoomState = {
  units: unknown;
  supplyLines: unknown;
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
  unitType: string;
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

export type NetworkUnitPathStateUpdate = UnitPathStateMessage;

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

export type NetworkSupplyLinePathCell = {
  col: number;
  row: number;
};

export type NetworkSupplyLineUpdate = {
  unitId: string;
  team: 'BLUE' | 'RED';
  connected: boolean;
  sourceCol: number;
  sourceRow: number;
  severIndex: number;
  path: NetworkSupplyLinePathCell[];
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
type UnitPathStateChangedHandler = (
  pathStateUpdate: NetworkUnitPathStateUpdate,
) => void;
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
type SupplyLineChangedHandler = (
  supplyLineUpdate: NetworkSupplyLineUpdate,
) => void;
type SupplyLineRemovedHandler = (unitId: string) => void;
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
  private assignedTeam: PlayerTeam | null = null;
  private resyncSupplyLineVisibility: (() => void) | null = null;

  private static queuePositionFlush(flush: () => void): void {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(flush);
      return;
    }
    void Promise.resolve().then(flush);
  }

  constructor(
    private readonly onUnitAdded: UnitAddedHandler,
    private readonly onUnitRemoved: UnitRemovedHandler,
    private readonly onTeamAssigned: TeamAssignedHandler,
    private readonly onLobbyStateChanged: LobbyStateChangedHandler,
    private readonly onBattleEnded: BattleEndedHandler,
    private readonly onUnitPositionChanged: UnitPositionChangedHandler,
    private readonly onUnitPathStateChanged: UnitPathStateChangedHandler,
    private readonly onUnitHealthChanged: UnitHealthChangedHandler,
    private readonly onUnitRotationChanged: UnitRotationChangedHandler,
    private readonly onUnitMoraleChanged: UnitMoraleChangedHandler,
    private readonly onInfluenceGridChanged: InfluenceGridChangedHandler,
    private readonly onCityOwnershipChanged: CityOwnershipChangedHandler,
    private readonly onSupplyLineChanged: SupplyLineChangedHandler,
    private readonly onSupplyLineRemoved: SupplyLineRemovedHandler,
    private readonly onRuntimeTuningChanged: RuntimeTuningChangedHandler,
    endpoint = resolveServerEndpoint(),
    roomName = 'battle',
  ) {
    this.client = new Client(endpoint);
    this.roomName = roomName;
  }

  public async connect(): Promise<void> {
    if (this.room) {
      return;
    }

    this.assignedTeam = null;
    this.resyncSupplyLineVisibility = null;
    const room = await this.client.joinOrCreate<BattleRoomState>(this.roomName);
    this.room = room;

    room.onMessage(
      NETWORK_MESSAGE_TYPES.teamAssigned,
      (message: TeamAssignedMessage) => {
        const assignedTeam: PlayerTeam = message.team === 'RED' ? 'RED' : 'BLUE';
        this.assignedTeam = assignedTeam;
        this.onTeamAssigned(assignedTeam);
        this.resyncSupplyLineVisibility?.();
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
      NETWORK_MESSAGE_TYPES.unitPathState,
      (message: UnitPathStateMessage) => {
        const unitId = typeof message?.unitId === 'string' ? message.unitId : '';
        if (unitId.length === 0) {
          return;
        }
        const path = Array.isArray(message?.path)
          ? message.path
              .filter(
                (waypoint): waypoint is { x: number; y: number } =>
                  typeof waypoint?.x === 'number' &&
                  Number.isFinite(waypoint.x) &&
                  typeof waypoint?.y === 'number' &&
                  Number.isFinite(waypoint.y),
              )
              .map((waypoint) => ({ x: waypoint.x, y: waypoint.y }))
          : [];
        this.onUnitPathStateChanged({
          unitId,
          path,
        });
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

      const supplyLineListenerDetachersByUnitId = new Map<
        string,
        Array<() => void>
      >();
      const supplyLineEmitterByUnitId = new Map<string, () => void>();
      const emitVisibleSupplyLineUpdate = (update: NetworkSupplyLineUpdate): void => {
        if (!this.assignedTeam) {
          return;
        }
        if (update.team === this.assignedTeam) {
          this.onSupplyLineChanged(update);
          return;
        }
        this.onSupplyLineRemoved(update.unitId);
      };
      const detachSupplyLineListeners = (unitId: string) => {
        const listeners = supplyLineListenerDetachersByUnitId.get(unitId);
        if (!listeners) {
          return;
        }
        for (const detach of listeners) {
          detach();
        }
        supplyLineListenerDetachersByUnitId.delete(unitId);
        supplyLineEmitterByUnitId.delete(unitId);
      };
      const attachSupplyLineListeners = (
        serverSupplyLine: ServerSupplyLineState,
        unitKey: string,
      ) => {
        const normalized = this.normalizeSupplyLineUpdate(serverSupplyLine, unitKey);
        if (!normalized) {
          return;
        }

        detachSupplyLineListeners(normalized.unitId);

        let flushQueued = false;
        const queueSupplyLineUpdate = () => {
          if (flushQueued) {
            return;
          }
          flushQueued = true;
          NetworkManager.queuePositionFlush(() => {
            flushQueued = false;
            const latest = this.normalizeSupplyLineUpdate(
              serverSupplyLine,
              unitKey,
            );
            if (!latest) {
              return;
            }
            emitVisibleSupplyLineUpdate(latest);
          });
        };

        supplyLineEmitterByUnitId.set(normalized.unitId, () => {
          const latest = this.normalizeSupplyLineUpdate(serverSupplyLine, unitKey);
          if (!latest) {
            return;
          }
          emitVisibleSupplyLineUpdate(latest);
        });

        emitVisibleSupplyLineUpdate(normalized);

        const detachers: Array<() => void> = [
          $(serverSupplyLine).listen('team', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('connected', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('sourceCol', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('sourceRow', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('severIndex', queueSupplyLineUpdate),
          $(serverSupplyLine).path.onChange(() => {
            queueSupplyLineUpdate();
          }),
        ];
        supplyLineListenerDetachersByUnitId.set(normalized.unitId, detachers);
      };
      const detachSupplyLineAdd = $(state).supplyLines.onAdd(
        (serverSupplyLine: ServerSupplyLineState, unitKey: string) => {
          attachSupplyLineListeners(serverSupplyLine, unitKey);
        },
        true,
      );
      const detachSupplyLineRemove = $(state).supplyLines.onRemove(
        (serverSupplyLine: ServerSupplyLineState, unitKey: string) => {
          const normalized = this.normalizeSupplyLineUpdate(
            serverSupplyLine,
            unitKey,
          );
          const unitId = normalized?.unitId ?? unitKey;
          if (unitId.length === 0) {
            return;
          }
          detachSupplyLineListeners(unitId);
          this.onSupplyLineRemoved(unitId);
        },
      );
      this.resyncSupplyLineVisibility = () => {
        for (const emitSupplyLine of supplyLineEmitterByUnitId.values()) {
          emitSupplyLine();
        }
      };
      this.detachCallbacks.push(
        detachSupplyLineAdd,
        detachSupplyLineRemove,
        () => {
          for (const unitId of supplyLineListenerDetachersByUnitId.keys()) {
            detachSupplyLineListeners(unitId);
          }
          this.resyncSupplyLineVisibility = null;
        },
      );

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
            unitType:
              typeof serverUnit.unitType === 'string'
                ? serverUnit.unitType
                : DEFAULT_UNIT_TYPE,
          });

          let positionFlushQueued = false;
          const queuePositionChange = () => {
            if (positionFlushQueued) {
              return;
            }
            positionFlushQueued = true;
            NetworkManager.queuePositionFlush(() => {
              positionFlushQueued = false;
              this.onUnitPositionChanged({
                unitId,
                x: serverUnit.x,
                y: serverUnit.y,
              });
            });
          };
          const detachX = $(serverUnit).listen('x', () => {
            queuePositionChange();
          });
          const detachY = $(serverUnit).listen('y', () => {
            queuePositionChange();
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

  public sendUnitToggleMovementPause(unitId: string): void {
    if (!this.room) {
      return;
    }

    const message: UnitToggleMovementPauseMessage = { unitId };
    this.room.send(NETWORK_MESSAGE_TYPES.unitToggleMovementPause, message);
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

  public sendLobbyGenerateMap(method: MapGenerationMethod = 'wfc'): void {
    if (!this.room) {
      return;
    }

    const message: LobbyGenerateMapMessage = { method };
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
    this.resyncSupplyLineVisibility = null;
    this.assignedTeam = null;
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

  private normalizeSupplyLineUpdate(
    serverSupplyLine: ServerSupplyLineState,
    unitKey: string,
  ): NetworkSupplyLineUpdate | null {
    const unitId =
      typeof serverSupplyLine?.unitId === 'string' &&
      serverSupplyLine.unitId.length > 0
        ? serverSupplyLine.unitId
        : unitKey;
    if (unitId.length === 0) {
      return null;
    }

    const normalizedTeam = serverSupplyLine?.team?.toUpperCase() === 'RED'
      ? 'RED'
      : 'BLUE';
    const safeInteger = (
      value: number | null | undefined,
      fallback = -1,
    ): number =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.round(value)
        : fallback;

    const normalizedPath = Array.from(serverSupplyLine?.path ?? [])
      .map((cell) => {
        const col = safeInteger(cell?.col, Number.NaN);
        const row = safeInteger(cell?.row, Number.NaN);
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return null;
        }
        return { col, row };
      })
      .filter((cell): cell is NetworkSupplyLinePathCell => cell !== null);

    return {
      unitId,
      team: normalizedTeam,
      connected: serverSupplyLine?.connected === true,
      sourceCol: safeInteger(serverSupplyLine?.sourceCol),
      sourceRow: safeInteger(serverSupplyLine?.sourceRow),
      severIndex: safeInteger(serverSupplyLine?.severIndex),
      path: normalizedPath,
    };
  }
}
