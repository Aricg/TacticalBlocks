import { Client, Room, getStateCallbacks } from 'colyseus.js';
import {
  type CitySupplyDepotMoveMessage,
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
  isAttacking?: boolean;
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

type ServerFarmCitySupplyLineState = {
  linkId: string;
  farmZoneId: string;
  cityZoneId: string;
  team: string;
  connected: boolean;
  oneWayTravelSeconds: number;
  severIndex: number;
  path: ArrayLike<ServerGridCellState>;
};

type ServerCitySupplyDepotLineState = {
  cityZoneId: string;
  owner: string;
  connected: boolean;
  cityCol: number;
  cityRow: number;
  depotCol: number;
  depotRow: number;
  depotSupplyStock: number;
  oneWayTravelSeconds: number;
  severIndex: number;
  path: ArrayLike<ServerGridCellState>;
};

type BattleRoomState = {
  units: unknown;
  supplyLines: unknown;
  farmCitySupplyLines: unknown;
  citySupplyDepotLines: unknown;
  citySupplyBySourceId: unknown;
  cityFarmSupplyReceivedBySourceId: unknown;
  influenceGrid: ServerInfluenceGridState;
  simulationFrame: number;
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
  isAttacking: boolean;
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

export type NetworkUnitAttackingUpdate = {
  unitId: string;
  isAttacking: boolean;
};

export type NetworkSimulationFrameUpdate = {
  simulationFrame: number;
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

export type NetworkCitySupplyUpdate = {
  citySupplyBySourceId: Record<string, number>;
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

export type NetworkFarmCitySupplyLineUpdate = {
  linkId: string;
  farmZoneId: string;
  cityZoneId: string;
  team: 'BLUE' | 'RED';
  connected: boolean;
  oneWayTravelSeconds: number;
  severIndex: number;
  path: NetworkSupplyLinePathCell[];
};

export type NetworkCitySupplyDepotLineUpdate = {
  cityZoneId: string;
  owner: 'BLUE' | 'RED' | 'NEUTRAL';
  connected: boolean;
  cityCol: number;
  cityRow: number;
  depotCol: number;
  depotRow: number;
  depotSupplyStock: number;
  oneWayTravelSeconds: number;
  severIndex: number;
  path: NetworkSupplyLinePathCell[];
};

export type NetworkMatchPhase = MatchPhase;

export type NetworkLobbyPlayer = {
  sessionId: string;
  team: string;
  ready: boolean;
};

export type NetworkGridCoordinate = {
  col: number;
  row: number;
};

export type NetworkLobbyStateUpdate = {
  phase: NetworkMatchPhase;
  players: NetworkLobbyPlayer[];
  mapId: string;
  availableMapIds: string[];
  mapRevision: number;
  isGeneratingMap: boolean;
  selfSessionId: string;
  cityAnchors: {
    RED: NetworkGridCoordinate;
    BLUE: NetworkGridCoordinate;
  } | null;
  neutralCityAnchors: NetworkGridCoordinate[] | null;
};

export type NetworkBattleEndedUpdate = BattleEndedMessage;
export type NetworkUnitPathCommand = UnitPathMessage;

type UnitAddedHandler = (unit: NetworkUnitSnapshot) => void;
type UnitRemovedHandler = (unitId: string) => void;
type TeamAssignedHandler = (team: PlayerTeam) => void;
type SimulationFrameChangedHandler = (
  simulationFrameUpdate: NetworkSimulationFrameUpdate,
) => void;
type UnitPositionChangedHandler = (position: NetworkUnitPositionUpdate) => void;
type UnitPathStateChangedHandler = (
  pathStateUpdate: NetworkUnitPathStateUpdate,
) => void;
type UnitHealthChangedHandler = (healthUpdate: NetworkUnitHealthUpdate) => void;
type UnitAttackingChangedHandler = (
  attackingUpdate: NetworkUnitAttackingUpdate,
) => void;
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
type CitySupplyChangedHandler = (
  citySupplyUpdate: NetworkCitySupplyUpdate,
) => void;
type SupplyLineChangedHandler = (
  supplyLineUpdate: NetworkSupplyLineUpdate,
) => void;
type SupplyLineRemovedHandler = (unitId: string) => void;
type FarmCitySupplyLineChangedHandler = (
  supplyLineUpdate: NetworkFarmCitySupplyLineUpdate,
) => void;
type FarmCitySupplyLineRemovedHandler = (linkId: string) => void;
type CitySupplyDepotLineChangedHandler = (
  supplyDepotLineUpdate: NetworkCitySupplyDepotLineUpdate,
) => void;
type CitySupplyDepotLineRemovedHandler = (cityZoneId: string) => void;
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
    private readonly onSimulationFrameChanged: SimulationFrameChangedHandler,
    private readonly onUnitPositionChanged: UnitPositionChangedHandler,
    private readonly onUnitPathStateChanged: UnitPathStateChangedHandler,
    private readonly onUnitHealthChanged: UnitHealthChangedHandler,
    private readonly onUnitAttackingChanged: UnitAttackingChangedHandler,
    private readonly onUnitRotationChanged: UnitRotationChangedHandler,
    private readonly onUnitMoraleChanged: UnitMoraleChangedHandler,
    private readonly onInfluenceGridChanged: InfluenceGridChangedHandler,
    private readonly onCityOwnershipChanged: CityOwnershipChangedHandler,
    private readonly onCitySupplyChanged: CitySupplyChangedHandler,
    private readonly onSupplyLineChanged: SupplyLineChangedHandler,
    private readonly onSupplyLineRemoved: SupplyLineRemovedHandler,
    private readonly onFarmCitySupplyLineChanged: FarmCitySupplyLineChangedHandler,
    private readonly onFarmCitySupplyLineRemoved: FarmCitySupplyLineRemovedHandler,
    private readonly onCitySupplyDepotLineChanged: CitySupplyDepotLineChangedHandler,
    private readonly onCitySupplyDepotLineRemoved: CitySupplyDepotLineRemovedHandler,
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
        this.emitCityOwnershipFromLobbyStateMessage(message);
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
          isPaused: message?.isPaused === true,
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
      const buildCityOwnershipUpdate = (): NetworkCityOwnershipUpdate => ({
        redCityOwner: state.redCityOwner,
        blueCityOwner: state.blueCityOwner,
        neutralCityOwners: Array.from(
          state.neutralCityOwners,
          (owner) => owner ?? 'NEUTRAL',
        ),
      });
      const getCityOwnershipSignature = (
        update: NetworkCityOwnershipUpdate,
      ): string =>
        `${update.redCityOwner}|${update.blueCityOwner}|${update.neutralCityOwners.join(',')}`;
      let lastCityOwnershipSignature: string | null = null;
      let lastCitySupplySignature: string | null = null;

      const emitSimulationFrameUpdate = () => {
        const simulationFrame =
          typeof state.simulationFrame === 'number' &&
          Number.isFinite(state.simulationFrame)
            ? Math.max(0, Math.round(state.simulationFrame))
            : 0;
        this.onSimulationFrameChanged({
          simulationFrame,
        });
      };
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
      const emitCityOwnershipUpdate = (force = false) => {
        const update = buildCityOwnershipUpdate();
        const signature = getCityOwnershipSignature(update);
        if (!force && signature === lastCityOwnershipSignature) {
          return;
        }
        lastCityOwnershipSignature = signature;
        this.onCityOwnershipChanged(update);
      };
      const emitCitySupplyUpdate = (force = false) => {
        const update = this.buildCitySupplyUpdate(
          state.cityFarmSupplyReceivedBySourceId,
        );
        const signature = this.getCitySupplySignature(update);
        if (!force && signature === lastCitySupplySignature) {
          return;
        }
        lastCitySupplySignature = signature;
        this.onCitySupplyChanged(update);
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
      const detachCitySupplyAdd = $(state).cityFarmSupplyReceivedBySourceId.onAdd(() => {
        emitCitySupplyUpdate();
      });
      const detachCitySupplyChange = $(state).cityFarmSupplyReceivedBySourceId.onChange(() => {
        emitCitySupplyUpdate();
      });
      const detachCitySupplyRemove = $(state).cityFarmSupplyReceivedBySourceId.onRemove(() => {
        emitCitySupplyUpdate();
      });
      const detachSimulationFrame = $(state).listen('simulationFrame', () => {
        emitSimulationFrameUpdate();
        emitCityOwnershipUpdate();
      });
      this.detachCallbacks.push(
        detachInfluenceGridRevision,
        detachRedCityOwner,
        detachBlueCityOwner,
        detachNeutralCityOwnerChange,
        detachCitySupplyAdd,
        detachCitySupplyChange,
        detachCitySupplyRemove,
        detachSimulationFrame,
      );
      emitSimulationFrameUpdate();
      emitInfluenceGridUpdate();
      emitCityOwnershipUpdate(true);
      emitCitySupplyUpdate(true);

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

      const farmCitySupplyLineListenerDetachersByLinkId = new Map<
        string,
        Array<() => void>
      >();
      const detachFarmCitySupplyLineListeners = (linkId: string) => {
        const listeners = farmCitySupplyLineListenerDetachersByLinkId.get(linkId);
        if (!listeners) {
          return;
        }
        for (const detach of listeners) {
          detach();
        }
        farmCitySupplyLineListenerDetachersByLinkId.delete(linkId);
      };
      const attachFarmCitySupplyLineListeners = (
        serverSupplyLine: ServerFarmCitySupplyLineState,
        linkKey: string,
      ) => {
        const normalized = this.normalizeFarmCitySupplyLineUpdate(
          serverSupplyLine,
          linkKey,
        );
        if (!normalized) {
          return;
        }

        detachFarmCitySupplyLineListeners(normalized.linkId);
        let flushQueued = false;
        const queueSupplyLineUpdate = () => {
          if (flushQueued) {
            return;
          }
          flushQueued = true;
          NetworkManager.queuePositionFlush(() => {
            flushQueued = false;
            const latest = this.normalizeFarmCitySupplyLineUpdate(
              serverSupplyLine,
              linkKey,
            );
            if (!latest) {
              return;
            }
            this.onFarmCitySupplyLineChanged(latest);
          });
        };

        this.onFarmCitySupplyLineChanged(normalized);
        const detachers: Array<() => void> = [
          $(serverSupplyLine).listen('team', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('connected', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('oneWayTravelSeconds', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('severIndex', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('farmZoneId', queueSupplyLineUpdate),
          $(serverSupplyLine).listen('cityZoneId', queueSupplyLineUpdate),
          $(serverSupplyLine).path.onChange(() => {
            queueSupplyLineUpdate();
          }),
        ];
        farmCitySupplyLineListenerDetachersByLinkId.set(
          normalized.linkId,
          detachers,
        );
      };
      const detachFarmCitySupplyLineAdd = $(state).farmCitySupplyLines.onAdd(
        (serverSupplyLine: ServerFarmCitySupplyLineState, linkKey: string) => {
          attachFarmCitySupplyLineListeners(serverSupplyLine, linkKey);
        },
        true,
      );
      const detachFarmCitySupplyLineRemove = $(state).farmCitySupplyLines.onRemove(
        (serverSupplyLine: ServerFarmCitySupplyLineState, linkKey: string) => {
          const normalized = this.normalizeFarmCitySupplyLineUpdate(
            serverSupplyLine,
            linkKey,
          );
          const linkId = normalized?.linkId ?? linkKey;
          if (linkId.length === 0) {
            return;
          }
          detachFarmCitySupplyLineListeners(linkId);
          this.onFarmCitySupplyLineRemoved(linkId);
        },
      );
      this.detachCallbacks.push(
        detachFarmCitySupplyLineAdd,
        detachFarmCitySupplyLineRemove,
        () => {
          for (const linkId of farmCitySupplyLineListenerDetachersByLinkId.keys()) {
            detachFarmCitySupplyLineListeners(linkId);
          }
        },
      );

      const citySupplyDepotLineListenerDetachersByZoneId = new Map<
        string,
        Array<() => void>
      >();
      const detachCitySupplyDepotLineListeners = (cityZoneId: string) => {
        const listeners =
          citySupplyDepotLineListenerDetachersByZoneId.get(cityZoneId);
        if (!listeners) {
          return;
        }
        for (const detach of listeners) {
          detach();
        }
        citySupplyDepotLineListenerDetachersByZoneId.delete(cityZoneId);
      };
      const attachCitySupplyDepotLineListeners = (
        serverDepotLine: ServerCitySupplyDepotLineState,
        zoneKey: string,
      ) => {
        const normalized = this.normalizeCitySupplyDepotLineUpdate(
          serverDepotLine,
          zoneKey,
        );
        if (!normalized) {
          return;
        }

        detachCitySupplyDepotLineListeners(normalized.cityZoneId);

        let flushQueued = false;
        const queueDepotLineUpdate = () => {
          if (flushQueued) {
            return;
          }
          flushQueued = true;
          NetworkManager.queuePositionFlush(() => {
            flushQueued = false;
            const latest = this.normalizeCitySupplyDepotLineUpdate(
              serverDepotLine,
              zoneKey,
            );
            if (!latest) {
              return;
            }
            this.onCitySupplyDepotLineChanged(latest);
          });
        };

        this.onCitySupplyDepotLineChanged(normalized);
        const detachers: Array<() => void> = [
          $(serverDepotLine).listen('owner', queueDepotLineUpdate),
          $(serverDepotLine).listen('connected', queueDepotLineUpdate),
          $(serverDepotLine).listen('cityCol', queueDepotLineUpdate),
          $(serverDepotLine).listen('cityRow', queueDepotLineUpdate),
          $(serverDepotLine).listen('depotCol', queueDepotLineUpdate),
          $(serverDepotLine).listen('depotRow', queueDepotLineUpdate),
          $(serverDepotLine).listen('depotSupplyStock', queueDepotLineUpdate),
          $(serverDepotLine).listen('oneWayTravelSeconds', queueDepotLineUpdate),
          $(serverDepotLine).listen('severIndex', queueDepotLineUpdate),
          $(serverDepotLine).path.onChange(() => {
            queueDepotLineUpdate();
          }),
        ];
        citySupplyDepotLineListenerDetachersByZoneId.set(
          normalized.cityZoneId,
          detachers,
        );
      };
      const detachCitySupplyDepotLineAdd = $(state).citySupplyDepotLines.onAdd(
        (serverDepotLine: ServerCitySupplyDepotLineState, zoneKey: string) => {
          attachCitySupplyDepotLineListeners(serverDepotLine, zoneKey);
        },
        true,
      );
      const detachCitySupplyDepotLineRemove = $(state).citySupplyDepotLines.onRemove(
        (serverDepotLine: ServerCitySupplyDepotLineState, zoneKey: string) => {
          const normalized = this.normalizeCitySupplyDepotLineUpdate(
            serverDepotLine,
            zoneKey,
          );
          const cityZoneId = normalized?.cityZoneId ?? zoneKey;
          if (cityZoneId.length === 0) {
            return;
          }
          detachCitySupplyDepotLineListeners(cityZoneId);
          this.onCitySupplyDepotLineRemoved(cityZoneId);
        },
      );
      this.detachCallbacks.push(
        detachCitySupplyDepotLineAdd,
        detachCitySupplyDepotLineRemove,
        () => {
          for (const cityZoneId of citySupplyDepotLineListenerDetachersByZoneId.keys()) {
            detachCitySupplyDepotLineListeners(cityZoneId);
          }
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
            isAttacking: serverUnit.isAttacking === true,
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
          const detachIsAttacking = $(serverUnit).listen(
            'isAttacking',
            (isAttacking: boolean | undefined) => {
              this.onUnitAttackingChanged({
                unitId,
                isAttacking: isAttacking === true,
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
            detachIsAttacking,
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

  public sendCitySupplyDepotMove(message: CitySupplyDepotMoveMessage): void {
    if (!this.room) {
      return;
    }

    this.room.send(NETWORK_MESSAGE_TYPES.citySupplyDepotMove, message);
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

  public sendLobbyGenerateMap(
    method: MapGenerationMethod = 'wfc',
    profile?: LobbyGenerateMapMessage['profile'],
  ): void {
    if (!this.room) {
      return;
    }

    const message: LobbyGenerateMapMessage = profile
      ? { method, profile }
      : { method };
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

    const parseGridCoordinate = (
      value: unknown,
    ): NetworkGridCoordinate | null => {
      if (typeof value !== 'object' || value === null) {
        return null;
      }
      const candidate = value as { col?: unknown; row?: unknown };
      if (
        typeof candidate.col !== 'number' ||
        !Number.isFinite(candidate.col) ||
        typeof candidate.row !== 'number' ||
        !Number.isFinite(candidate.row)
      ) {
        return null;
      }
      return {
        col: Math.round(candidate.col),
        row: Math.round(candidate.row),
      };
    };

    const parsedRedCityAnchor = parseGridCoordinate(message?.cityAnchors?.RED);
    const parsedBlueCityAnchor = parseGridCoordinate(message?.cityAnchors?.BLUE);
    const cityAnchors =
      parsedRedCityAnchor && parsedBlueCityAnchor
        ? {
            RED: parsedRedCityAnchor,
            BLUE: parsedBlueCityAnchor,
          }
        : null;

    const neutralCityAnchors = Array.isArray(message?.neutralCityAnchors)
      ? message.neutralCityAnchors
          .map((anchor) => parseGridCoordinate(anchor))
          .filter(
            (anchor): anchor is NetworkGridCoordinate => anchor !== null,
          )
      : null;

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
      cityAnchors,
      neutralCityAnchors,
    };
  }

  private emitCityOwnershipFromLobbyStateMessage(
    message: LobbyStateMessage,
  ): void {
    if (
      typeof message?.redCityOwner !== 'string' ||
      typeof message?.blueCityOwner !== 'string' ||
      !Array.isArray(message?.neutralCityOwners)
    ) {
      return;
    }

    this.onCityOwnershipChanged({
      redCityOwner: message.redCityOwner,
      blueCityOwner: message.blueCityOwner,
      neutralCityOwners: message.neutralCityOwners.filter(
        (owner): owner is string => typeof owner === 'string',
      ),
    });
  }

  private buildCitySupplyUpdate(rawCitySupplyBySourceId: unknown): NetworkCitySupplyUpdate {
    const citySupplyBySourceId: Record<string, number> = {};
    if (
      rawCitySupplyBySourceId &&
      typeof rawCitySupplyBySourceId === 'object' &&
      'forEach' in rawCitySupplyBySourceId &&
      typeof rawCitySupplyBySourceId.forEach === 'function'
    ) {
      (
        rawCitySupplyBySourceId as {
          forEach: (callback: (value: unknown, key: unknown) => void) => void;
        }
      ).forEach((value, key) => {
        if (typeof key !== 'string' || typeof value !== 'number' || !Number.isFinite(value)) {
          return;
        }
        citySupplyBySourceId[key] = Math.max(0, Math.floor(value));
      });
    }
    return { citySupplyBySourceId };
  }

  private getCitySupplySignature(update: NetworkCitySupplyUpdate): string {
    return Object.entries(update.citySupplyBySourceId)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([sourceId, supplyAmount]) => `${sourceId}:${supplyAmount}`)
      .join('|');
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

  private normalizeFarmCitySupplyLineUpdate(
    serverSupplyLine: ServerFarmCitySupplyLineState,
    linkKey: string,
  ): NetworkFarmCitySupplyLineUpdate | null {
    const linkId =
      typeof serverSupplyLine?.linkId === 'string' &&
      serverSupplyLine.linkId.length > 0
        ? serverSupplyLine.linkId
        : linkKey;
    if (linkId.length === 0) {
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
    const safePositiveFloat = (
      value: number | null | undefined,
      fallback = 0.25,
    ): number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0
        ? value
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
      linkId,
      farmZoneId:
        typeof serverSupplyLine?.farmZoneId === 'string'
          ? serverSupplyLine.farmZoneId
          : '',
      cityZoneId:
        typeof serverSupplyLine?.cityZoneId === 'string'
          ? serverSupplyLine.cityZoneId
          : '',
      team: normalizedTeam,
      connected: serverSupplyLine?.connected === true,
      oneWayTravelSeconds: safePositiveFloat(serverSupplyLine?.oneWayTravelSeconds),
      severIndex: safeInteger(serverSupplyLine?.severIndex),
      path: normalizedPath,
    };
  }

  private normalizeCitySupplyDepotLineUpdate(
    serverSupplyDepotLine: ServerCitySupplyDepotLineState,
    zoneKey: string,
  ): NetworkCitySupplyDepotLineUpdate | null {
    const cityZoneId =
      typeof serverSupplyDepotLine?.cityZoneId === 'string' &&
      serverSupplyDepotLine.cityZoneId.length > 0
        ? serverSupplyDepotLine.cityZoneId
        : zoneKey;
    if (cityZoneId.length === 0) {
      return null;
    }

    const normalizeOwner = (ownerValue: string | undefined): 'BLUE' | 'RED' | 'NEUTRAL' => {
      if (ownerValue?.toUpperCase() === 'RED') {
        return 'RED';
      }
      if (ownerValue?.toUpperCase() === 'BLUE') {
        return 'BLUE';
      }
      return 'NEUTRAL';
    };
    const safeInteger = (
      value: number | null | undefined,
      fallback = -1,
    ): number =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.round(value)
        : fallback;
    const safePositiveFloat = (
      value: number | null | undefined,
      fallback = 0.25,
    ): number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0
        ? value
        : fallback;
    const safeNonNegativeInteger = (
      value: number | null | undefined,
      fallback = 0,
    ): number =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : fallback;

    const normalizedPath = Array.from(serverSupplyDepotLine?.path ?? [])
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
      cityZoneId,
      owner: normalizeOwner(serverSupplyDepotLine?.owner),
      connected: serverSupplyDepotLine?.connected === true,
      cityCol: safeInteger(serverSupplyDepotLine?.cityCol),
      cityRow: safeInteger(serverSupplyDepotLine?.cityRow),
      depotCol: safeInteger(serverSupplyDepotLine?.depotCol),
      depotRow: safeInteger(serverSupplyDepotLine?.depotRow),
      depotSupplyStock: safeNonNegativeInteger(
        serverSupplyDepotLine?.depotSupplyStock,
      ),
      oneWayTravelSeconds: safePositiveFloat(
        serverSupplyDepotLine?.oneWayTravelSeconds,
      ),
      severIndex: safeInteger(serverSupplyDepotLine?.severIndex),
      path: normalizedPath,
    };
  }
}
