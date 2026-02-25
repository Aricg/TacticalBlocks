import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { FarmCitySupplyLineState } from "../schema/FarmCitySupplyLineState.js";
import { GridCellState } from "../schema/GridCellState.js";
import { InfluenceGridState } from "../schema/InfluenceGridState.js";
import { SupplyLineState } from "../schema/SupplyLineState.js";
import { Unit } from "../schema/Unit.js";
import { InfluenceGridSystem } from "../systems/InfluenceGridSystem.js";
import {
  BlockedSupplyEndpointInfluenceTracker,
  DEFAULT_BLOCKED_SUPPLY_ENDPOINT_INFLUENCE_OPTIONS,
  resolveBlockedSupplyEndpointCellFromPath,
  type BlockedSupplyEndpointSample,
} from "../systems/influenceGrid/blockedSupplyEndpointInfluence.js";
import {
  updateCombatRotation as updateCombatRotationSystem,
  updateUnitInteractions as updateUnitInteractionsSystem,
} from "../systems/combat/ContactCombatSystem.js";
import {
  allocateGeneratedCityUnitId as allocateGeneratedCityUnitIdSystem,
  collectCitySpawnSources,
  createSpawnedCityUnit,
  findOpenSpawnCellNearCity as findOpenSpawnCellNearCitySystem,
  getSpawnRotationForTeam as getSpawnRotationForTeamSystem,
} from "../systems/cities/CitySpawnSystem.js";
import {
  buildCitySupplySourceIdByCityZoneId as buildCitySupplySourceIdByCityZoneIdSystem,
  resetCitySupplyForSources as resetCitySupplyForSourcesSystem,
  syncCitySupplyState as syncCitySupplyStateSystem,
  updateCitySupplyAndGenerateUnits as updateCitySupplyAndGenerateUnitsSystem,
} from "../systems/cities/CitySupplySystem.js";
import { buildCityInfluenceSources } from "../systems/cities/CityInfluenceSourceSync.js";
import {
  updateCityOwnershipFromOccupancy as updateCityOwnershipFromOccupancySystem,
} from "../systems/cities/CityControlSystem.js";
import {
  buildTerrainAwareRoute,
  normalizePathWaypoints,
} from "../systems/movement/MovementCommandRouter.js";
import {
  isMoraleSafeStep,
  simulateMovementTick,
} from "../systems/movement/MovementSimulation.js";
import {
  computeFarmToCitySupplyStatus,
  type ComputedFarmToCitySupplyLinkState,
  computeSupplyLinesForUnits,
  type ComputedSupplyLineState,
  type SupplySourceRetryState,
} from "../systems/supply/SupplyLineSystem.js";
import {
  getUnitMoraleAdvantageNormalized,
  getUnitMoraleScore as getUnitMoraleScoreSystem,
} from "../systems/morale/MoraleSystem.js";
import {
  getUnitContactDps as getUnitContactDpsSystem,
  getUnitHealthMitigationMultiplier as getUnitHealthMitigationMultiplierSystem,
} from "../systems/morale/moraleMath.js";
import { LobbyService } from "./services/LobbyService.js";
import { BattleLifecycleService } from "./services/BattleLifecycleService.js";
import { LobbyMapGenerationService } from "./services/LobbyMapGenerationService.js";
import {
  MapRuntimeService,
  type LoadActiveMapBundleResult,
} from "./services/MapRuntimeService.js";
import { StartingForcePlanner } from "./services/StartingForcePlanner.js";
import { StartingZoneResolver } from "./services/StartingZoneResolver.js";
import { NETWORK_MESSAGE_TYPES } from "../../../shared/src/networkContracts.js";
import {
  DEFAULT_GENERATION_PROFILE,
  type GenerationProfile,
  type StartingForceLayoutStrategy,
} from "../../../shared/src/generationProfile.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import type { MapBundle } from "../../../shared/src/mapBundle.js";
import {
  getNeutralCityGridCoordinates,
  getTeamCityGridCoordinate,
  type TerrainType,
} from "../../../shared/src/terrainGrid.js";
import {
  HILL_GRADE_NONE,
  getSlopeMoraleDeltaFromHillGrades,
  getTerrainTypeFromCode,
} from "../../../shared/src/terrainSemantics.js";
import {
  applyRuntimeTuningUpdate,
  DEFAULT_RUNTIME_TUNING,
  type RuntimeTuning,
} from "../../../shared/src/runtimeTuning.js";
import {
  DEFAULT_UNIT_TYPE,
  getUnitHealthMax,
  normalizeUnitType,
} from "../../../shared/src/unitTypes.js";
import type {
  BattleEndedMessage,
  CityOwner,
  CitySpawnSource,
  GridCoordinate,
  LobbyGenerateMapMessage,
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
  UnitHoldMovementMessage,
  UnitToggleMovementPauseMessage,
  UnitMovementState,
  UnitPathMessage,
  UnitPathStateMessage,
  Vector2,
} from "./BattleRoomTypes.js";

type StaticInfluenceSourceInput = {
  x: number;
  y: number;
  power: number;
  team: PlayerTeam;
};

export class BattleRoom extends Room<BattleState> {
  private readonly lobbyService = new LobbyService(
    GAMEPLAY_CONFIG.map.availableMapIds,
  );
  private readonly battleLifecycleService = new BattleLifecycleService();
  private readonly lobbyMapGenerationService = new LobbyMapGenerationService();
  private readonly mapRuntimeService = new MapRuntimeService();
  private readonly startingForcePlanner = new StartingForcePlanner();
  private readonly startingZoneResolver = new StartingZoneResolver();
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();
  private readonly lastBroadcastPathSignatureByUnitId = new Map<string, string>();
  private readonly supplySignatureByUnitId = new Map<string, string>();
  private readonly farmCitySupplySignatureByLinkId = new Map<string, string>();
  private readonly supplySourceRetryStateByUnitId = new Map<
    string,
    SupplySourceRetryState
  >();
  private readonly moraleStepElapsedSecondsByUnitId = new Map<string, number>();
  private readonly moraleStepPendingUnitIds = new Set<string>();
  private readonly engagedUnitIds = new Set<string>();
  private readonly influenceGridSystem = new InfluenceGridSystem();
  private readonly supplyInfluenceGridSystem = new InfluenceGridSystem();
  private readonly supplyEvaluationInfluenceGrid = new InfluenceGridState();
  private readonly blockedSupplyEndpointInfluenceTracker =
    new BlockedSupplyEndpointInfluenceTracker(
      DEFAULT_BLOCKED_SUPPLY_ENDPOINT_INFLUENCE_OPTIONS,
    );
  private readonly generationProfileByMapId = new Map<string, GenerationProfile>();
  private readonly roadCellIndexSet = new Set<number>();
  private readonly cityZoneCellSetByHomeTeam: Record<PlayerTeam, Set<string>> = {
    BLUE: new Set<string>(),
    RED: new Set<string>(),
  };
  private readonly cityZoneCellsByHomeTeam: Record<PlayerTeam, GridCoordinate[]> = {
    BLUE: [],
    RED: [],
  };
  private readonly cityZoneIdByHomeTeam: Record<PlayerTeam, string> = {
    BLUE: "home-blue",
    RED: "home-red",
  };
  private readonly neutralCityZoneCellSets: Set<string>[] = [];
  private readonly neutralCityZoneCells: GridCoordinate[][] = [];
  private readonly neutralCityZoneIds: string[] = [];
  private readonly neutralCityInitialOwnerByIndex: CityOwner[] = [];
  private readonly friendlySpawnCityCellsByTeam: Record<PlayerTeam, GridCoordinate[]> =
    {
      BLUE: [],
      RED: [],
    };
  private readonly friendlySpawnFarmCellsByTeam: Record<PlayerTeam, GridCoordinate[]> =
    {
      BLUE: [],
      RED: [],
    };
  private readonly farmZoneAnchorById = new Map<string, GridCoordinate>();
  private farmToCityLinks: Array<{
    farmZoneId: string;
    cityZoneId: string;
  }> = [];
  private neutralCityCells: GridCoordinate[] = [];
  private matchPhase: MatchPhase = "LOBBY";
  private mapRevision = 0;
  private isGeneratingMap = false;
  private simulationFrame = 0;
  private readonly citySupplyTripProgressBySourceId = new Map<
    string,
    number
  >();
  private readonly citySupplyDecayProgressBySourceId = new Map<string, number>();
  private readonly citySupplyOwnerBySourceId = new Map<string, CityOwner>();
  private generatedUnitSequenceByTeam: Record<PlayerTeam, number> = {
    BLUE: 1,
    RED: 1,
  };
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private cityInfluenceSources: StaticInfluenceSourceInput[] = [];
  private startingForceLayoutStrategy: StartingForceLayoutStrategy =
    DEFAULT_GENERATION_PROFILE.startingForces.layoutStrategy;
  private startingForceLineUnitCountPerTeam: number | null = null;
  private activeMapBundle: MapBundle | null = null;

  private static readonly UNIT_TURN_SPEED =
    GAMEPLAY_CONFIG.movement.unitTurnSpeedRadians;
  private static readonly UNIT_FORWARD_OFFSET =
    GAMEPLAY_CONFIG.movement.unitForwardOffsetRadians;
  private static readonly REFACE_ANGLE_THRESHOLD =
    GAMEPLAY_CONFIG.movement.refaceAngleThresholdRadians;
  private static readonly WAYPOINT_MOVE_ANGLE_TOLERANCE =
    GAMEPLAY_CONFIG.movement.waypointMoveAngleToleranceRadians;
  private static readonly DEFAULT_MOVEMENT_COMMAND_MODE: MovementCommandMode = {
    speedMultiplier: 1,
    rotateToFace: true,
  };
  private static readonly ROTATE_TO_FACE_DISABLED_SPEED_MULTIPLIER =
    Number.isFinite(GAMEPLAY_CONFIG.movement.rotateToFaceDisabledSpeedMultiplier) &&
    GAMEPLAY_CONFIG.movement.rotateToFaceDisabledSpeedMultiplier > 0
      ? GAMEPLAY_CONFIG.movement.rotateToFaceDisabledSpeedMultiplier
      : BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE.speedMultiplier;
  private static readonly WATER_TRANSITION_PAUSE_SECONDS =
    Number.isFinite(GAMEPLAY_CONFIG.movement.waterTransitionPauseSeconds) &&
    GAMEPLAY_CONFIG.movement.waterTransitionPauseSeconds > 0
      ? GAMEPLAY_CONFIG.movement.waterTransitionPauseSeconds
      : 3;
  private static readonly TERRAIN_SPEED_MULTIPLIER: Record<TerrainType, number> =
    GAMEPLAY_CONFIG.terrain.movementMultiplierByType;
  private static readonly TERRAIN_MORALE_BONUS: Record<TerrainType, number> =
    GAMEPLAY_CONFIG.terrain.moraleBonusByType;
  private static readonly ROAD_MOVEMENT_MULTIPLIER =
    Number.isFinite(GAMEPLAY_CONFIG.terrain.roadMovementMultiplier) &&
    GAMEPLAY_CONFIG.terrain.roadMovementMultiplier > 0
      ? GAMEPLAY_CONFIG.terrain.roadMovementMultiplier
      : 1;
  private static readonly TERRAIN_PATHFINDING_STEP_COST: Record<TerrainType, number> =
    GAMEPLAY_CONFIG.terrain.pathfindingStepCostByType;
  private static readonly PATHFINDING_ROAD_STEP_COST_MULTIPLIER =
    Number.isFinite(GAMEPLAY_CONFIG.terrain.pathfindingRoadStepCostMultiplier) &&
    GAMEPLAY_CONFIG.terrain.pathfindingRoadStepCostMultiplier > 0
      ? GAMEPLAY_CONFIG.terrain.pathfindingRoadStepCostMultiplier
      : 1;
  private static readonly PATHFINDING_HEURISTIC_MIN_STEP_COST =
    Number.isFinite(GAMEPLAY_CONFIG.terrain.pathfindingHeuristicMinStepCost) &&
    GAMEPLAY_CONFIG.terrain.pathfindingHeuristicMinStepCost > 0
      ? GAMEPLAY_CONFIG.terrain.pathfindingHeuristicMinStepCost
      : 0;
  private static readonly PATHFINDING_MAX_ROUTE_EXPANSIONS_PER_SEGMENT =
    Number.isFinite(GAMEPLAY_CONFIG.terrain.pathfindingMaxRouteExpansionsPerSegment) &&
    GAMEPLAY_CONFIG.terrain.pathfindingMaxRouteExpansionsPerSegment > 0
      ? Math.floor(GAMEPLAY_CONFIG.terrain.pathfindingMaxRouteExpansionsPerSegment)
      : 3500;
  private static readonly CITY_MORALE_BONUS_INSIDE_OWNED_ZONE =
    Number.isFinite(GAMEPLAY_CONFIG.cities.moraleBonusInsideOwnedZone)
      ? GAMEPLAY_CONFIG.cities.moraleBonusInsideOwnedZone
      : 0;
  private static readonly GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
  private static readonly GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;
  private static readonly CELL_WIDTH =
    GAMEPLAY_CONFIG.map.width / BattleRoom.GRID_WIDTH;
  private static readonly CELL_HEIGHT =
    GAMEPLAY_CONFIG.map.height / BattleRoom.GRID_HEIGHT;
  private static readonly GRID_CONTACT_DISTANCE =
    Math.max(BattleRoom.CELL_WIDTH, BattleRoom.CELL_HEIGHT) * 1.05;
  private static readonly MORALE_SAMPLE_RADIUS = 1;
  private static readonly MORALE_MAX_SCORE = 9;
  private static readonly MAX_ABS_INFLUENCE_SCORE = Math.max(
    1,
    GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
  );
  private static readonly MORALE_STEP_INTERVAL_SECONDS = 3;
  // Radius 4 in each axis yields a 9x9 commander aura area.
  private static readonly COMMANDER_MORALE_AURA_RADIUS_CELLS = 4;
  private static readonly COMMANDER_MORALE_AURA_BONUS = 1;
  private static readonly SLOPE_MORALE_DOT_EQUIVALENT = 1;
  private static readonly SUPPLY_HEAL_PER_SECOND_WHEN_CONNECTED = 1;
  private static readonly SUPPLY_BLOCKED_SOURCE_RETRY_INTERVAL_MS =
    Number.isFinite(GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds) &&
    GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds > 0
      ? GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds * 1000
      : 3000;
  private static readonly CITY_SPAWN_SEARCH_RADIUS = 4;
  private static readonly CITY_SUPPLY_PER_UNIT_THRESHOLD = 10;

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.state.mapId = this.lobbyService.getValidatedMapId(this.state.mapId);
    const startupMapResult =
      this.lobbyMapGenerationService.ensureStartupRuntimeGeneratedMap(
        this.state.mapId,
        import.meta.url,
      );
    if (startupMapResult.attempted && !startupMapResult.ok) {
      console.error(
        `Failed to generate startup runtime map "${this.state.mapId}" (reason ${startupMapResult.failure.reason}). Continuing with existing artifacts if available.`,
      );
      this.lobbyMapGenerationService.logMapGenerationFailure(
        "startup",
        this.state.mapId,
        startupMapResult.failure,
      );
    }
    this.mapRuntimeService.applyMapIdToRuntimeTerrain(this.state.mapId);
    this.loadActiveMapBundle(this.state.mapId, this.mapRevision);
    this.neutralCityCells = this.mapRuntimeService.resolveNeutralCityCells(
      this.activeMapBundle,
      getNeutralCityGridCoordinates(),
    );
    this.syncMapFeatureMetadataFromBundle();
    this.mapRuntimeService.initializeNeutralCityOwnership(
      this.state.neutralCityOwners,
      this.neutralCityCells.length,
    );
    this.applyInitialNeutralCityOwnership();
    this.resetCityUnitGenerationState();
    this.influenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.supplyInfluenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.syncCityInfluenceSources();
    this.startingForceLayoutStrategy = this.resolveStartingForceLayoutStrategyForMap(
      this.state.mapId,
    );
    this.startingForceLineUnitCountPerTeam =
      this.resolveStartingForceUnitCountPerTeamForMap(this.state.mapId);
    this.spawnStartingForces();
    this.updateInfluenceGrid(true);
    this.updateSupplyLines();

    this.setSimulationInterval((deltaMs) => {
      if (this.matchPhase !== "BATTLE") {
        return;
      }
      const deltaSeconds = deltaMs / 1000;
      this.simulationFrame += 1;
      this.state.simulationFrame = this.simulationFrame;
      this.updateMovement(deltaSeconds);
      const cityOwnershipChanged = this.updateCityOwnershipFromOccupancy();
      if (cityOwnershipChanged) {
        this.syncCityInfluenceSources();
      }
      this.updateSupplyLines();
      const generatedCityUnits = this.updateCityUnitGeneration(deltaSeconds);
      const engagements = this.updateUnitInteractions(deltaSeconds);
      this.pruneSupplyLinesForMissingUnits();
      this.syncAllUnitPathStates();
      this.updateCombatRotation(deltaSeconds, engagements);
      const battleOutcome = this.getBattleOutcome();
      if (battleOutcome) {
        this.concludeBattle(battleOutcome);
        return;
      }
      this.updateInfluenceGrid(cityOwnershipChanged || generatedCityUnits > 0);
    }, GAMEPLAY_CONFIG.network.positionSyncIntervalMs);

    this.onMessage(NETWORK_MESSAGE_TYPES.unitPath, (client, message: UnitPathMessage) => {
      this.handleUnitPathMessage(client, message);
    });
    this.onMessage(
      NETWORK_MESSAGE_TYPES.unitCancelMovement,
      (client, message: UnitCancelMovementMessage) => {
        this.handleUnitCancelMovementMessage(client, message);
      },
    );
    this.onMessage(
      NETWORK_MESSAGE_TYPES.unitToggleMovementPause,
      (client, message: UnitToggleMovementPauseMessage) => {
        this.handleUnitToggleMovementPauseMessage(client, message);
      },
    );
    this.onMessage(
      NETWORK_MESSAGE_TYPES.unitHoldMovement,
      (client, message: UnitHoldMovementMessage) => {
        this.handleUnitHoldMovementMessage(client, message);
      },
    );
    this.onMessage(
      NETWORK_MESSAGE_TYPES.runtimeTuningUpdate,
      (client, message: RuntimeTuningUpdateMessage) => {
        this.handleRuntimeTuningUpdate(client, message);
      },
    );
    this.onMessage(NETWORK_MESSAGE_TYPES.lobbyReady, (client, message: LobbyReadyMessage) => {
      this.handleLobbyReadyMessage(client, message);
    });
    this.onMessage(NETWORK_MESSAGE_TYPES.lobbySelectMap, (client, message: LobbySelectMapMessage) => {
      this.handleLobbySelectMapMessage(client, message);
    });
    this.onMessage(
      NETWORK_MESSAGE_TYPES.lobbyRandomMap,
      (client, _message: LobbyRandomMapMessage) => {
        this.handleLobbyRandomMapMessage(client);
      },
    );
    this.onMessage(
      NETWORK_MESSAGE_TYPES.lobbyGenerateMap,
      (client, message: LobbyGenerateMapMessage) => {
        this.handleLobbyGenerateMapMessage(client, message);
      },
    );
  }

  onJoin(client: Client): void {
    const assignedTeam = this.lobbyService.registerJoin(client.sessionId);
    client.send(NETWORK_MESSAGE_TYPES.teamAssigned, { team: assignedTeam });
    client.send(NETWORK_MESSAGE_TYPES.runtimeTuningSnapshot, this.runtimeTuning);
    this.sendUnitPathStateSnapshot(client);
    this.broadcastLobbyState();
    console.log(`Client joined battle room: ${client.sessionId} (${assignedTeam})`);
  }

  onLeave(client: Client): void {
    const team = this.lobbyService.unregisterSession(client.sessionId);
    this.broadcastLobbyState();
    console.log(
      `Client left battle room: ${client.sessionId}${team ? ` (${team})` : ""}`,
    );
  }

  onDispose(): void {
    this.movementStateByUnitId.clear();
    this.lastBroadcastPathSignatureByUnitId.clear();
    this.clearSupplyLineState();
    this.engagedUnitIds.clear();
    this.lobbyService.dispose();
    this.simulationFrame = 0;
    this.state.simulationFrame = 0;
    this.resetCityUnitGenerationState();
  }

  private createMovementState(): UnitMovementState {
    return {
      destinationCell: null,
      queuedCells: [],
      targetRotation: null,
      movementCommandMode: { ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE },
      movementBudget: 0,
      isPaused: false,
      terrainTransitionPauseRemainingSeconds: 0,
    };
  }

  private getOrCreateMovementState(unitId: string): UnitMovementState {
    const existing = this.movementStateByUnitId.get(unitId);
    if (existing) {
      return existing;
    }

    const created = this.createMovementState();
    this.movementStateByUnitId.set(unitId, created);
    return created;
  }

  private clearMovementForUnit(unitId: string): void {
    const movementState = this.movementStateByUnitId.get(unitId);
    if (!movementState) {
      return;
    }

    movementState.destinationCell = null;
    movementState.queuedCells = [];
    movementState.targetRotation = null;
    movementState.movementCommandMode = {
      ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE,
    };
    movementState.movementBudget = 0;
    movementState.isPaused = false;
    movementState.terrainTransitionPauseRemainingSeconds = 0;
  }

  private buildPathSignature(movementState: UnitMovementState): string {
    const cells: GridCoordinate[] = [];
    if (movementState.destinationCell) {
      cells.push(movementState.destinationCell);
    }
    cells.push(...movementState.queuedCells);
    if (cells.length === 0) {
      return movementState.isPaused ? "|paused=1" : "";
    }

    const pathSignature = cells.map((cell) => `${cell.col},${cell.row}`).join(";");
    return `${pathSignature}|paused=${movementState.isPaused ? "1" : "0"}`;
  }

  private buildSupplyLineSignature(supplyLine: ComputedSupplyLineState): string {
    const pathSignature = supplyLine.path
      .map((cell) => `${cell.col},${cell.row}`)
      .join(";");
    return [
      supplyLine.team,
      `${supplyLine.sourceCol},${supplyLine.sourceRow}`,
      supplyLine.connected ? "1" : "0",
      `${supplyLine.severIndex}`,
      pathSignature,
    ].join("|");
  }

  private buildFarmCitySupplyLineSignature(
    supplyLine: ComputedFarmToCitySupplyLinkState,
  ): string {
    const pathSignature = supplyLine.path
      .map((cell) => `${cell.col},${cell.row}`)
      .join(";");
    return [
      supplyLine.team,
      supplyLine.farmZoneId,
      supplyLine.cityZoneId,
      supplyLine.connected ? "1" : "0",
      `${supplyLine.severIndex}`,
      pathSignature,
    ].join("|");
  }

  private createSupplyLineState(
    supplyLine: ComputedSupplyLineState,
  ): SupplyLineState {
    const state = new SupplyLineState();
    state.unitId = supplyLine.unitId;
    state.team = supplyLine.team;
    state.connected = supplyLine.connected;
    state.sourceCol = supplyLine.sourceCol;
    state.sourceRow = supplyLine.sourceRow;
    state.severIndex = supplyLine.severIndex;
    for (const cell of supplyLine.path) {
      state.path.push(new GridCellState(cell.col, cell.row));
    }
    return state;
  }

  private createFarmCitySupplyLineState(
    supplyLine: ComputedFarmToCitySupplyLinkState,
  ): FarmCitySupplyLineState {
    const state = new FarmCitySupplyLineState();
    state.linkId = supplyLine.linkId;
    state.farmZoneId = supplyLine.farmZoneId;
    state.cityZoneId = supplyLine.cityZoneId;
    state.team = supplyLine.team;
    state.connected = supplyLine.connected;
    state.severIndex = supplyLine.severIndex;
    for (const cell of supplyLine.path) {
      state.path.push(new GridCellState(cell.col, cell.row));
    }
    return state;
  }

  private buildUnitPathStateMessage(unitId: string): UnitPathStateMessage {
    const movementState = this.movementStateByUnitId.get(unitId);
    if (!movementState) {
      return { unitId, path: [], isPaused: false };
    }

    const pathCells: GridCoordinate[] = [];
    if (movementState.destinationCell) {
      pathCells.push(movementState.destinationCell);
    }
    pathCells.push(...movementState.queuedCells);

    return {
      unitId,
      path: pathCells.map((cell) => this.gridToWorldCenter(cell)),
      isPaused: movementState.isPaused,
    };
  }

  private sendUnitPathStateToTeam(
    team: PlayerTeam,
    message: UnitPathStateMessage,
  ): void {
    for (const client of this.clients) {
      const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
      if (assignedTeam !== team) {
        continue;
      }
      client.send(NETWORK_MESSAGE_TYPES.unitPathState, message);
    }
  }

  private syncUnitPathState(unitId: string): void {
    const movementState = this.movementStateByUnitId.get(unitId);
    if (!movementState) {
      this.lastBroadcastPathSignatureByUnitId.delete(unitId);
      return;
    }
    const unit = this.state.units.get(unitId);
    if (!unit) {
      this.lastBroadcastPathSignatureByUnitId.delete(unitId);
      return;
    }

    const nextSignature = this.buildPathSignature(movementState);
    const previousSignature = this.lastBroadcastPathSignatureByUnitId.get(unitId);
    if (previousSignature === nextSignature) {
      return;
    }

    this.lastBroadcastPathSignatureByUnitId.set(unitId, nextSignature);
    const team: PlayerTeam = unit.team.toUpperCase() === "RED" ? "RED" : "BLUE";
    this.sendUnitPathStateToTeam(team, this.buildUnitPathStateMessage(unitId));
  }

  private syncAllUnitPathStates(): void {
    const activeUnitIds = new Set<string>();
    for (const [unitId] of this.movementStateByUnitId) {
      activeUnitIds.add(unitId);
      this.syncUnitPathState(unitId);
    }

    for (const unitId of Array.from(this.lastBroadcastPathSignatureByUnitId.keys())) {
      if (!activeUnitIds.has(unitId)) {
        this.lastBroadcastPathSignatureByUnitId.delete(unitId);
      }
    }
  }

  private sendUnitPathStateSnapshot(client: Client): void {
    const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    for (const [unitId, movementState] of this.movementStateByUnitId) {
      const signature = this.buildPathSignature(movementState);
      if (signature.length === 0) {
        continue;
      }
      const unit = this.state.units.get(unitId);
      if (!unit) {
        continue;
      }
      const unitTeam: PlayerTeam = unit.team.toUpperCase() === "RED" ? "RED" : "BLUE";
      if (unitTeam !== assignedTeam) {
        continue;
      }
      client.send(
        NETWORK_MESSAGE_TYPES.unitPathState,
        this.buildUnitPathStateMessage(unitId),
      );
    }
  }

  private normalizeMovementCommandMode(
    movementCommandMode?: Partial<MovementCommandModeInput>,
  ): MovementCommandMode {
    const rotateToFace = movementCommandMode?.rotateToFace;
    const normalizedRotateToFace =
      typeof rotateToFace === "boolean"
        ? rotateToFace
        : BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE.rotateToFace;
    const normalizedSpeedMultiplier = normalizedRotateToFace
      ? BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE.speedMultiplier
      : BattleRoom.ROTATE_TO_FACE_DISABLED_SPEED_MULTIPLIER;

    return {
      speedMultiplier: normalizedSpeedMultiplier,
      rotateToFace: normalizedRotateToFace,
    };
  }

  private resolvePathRoadPreference(
    movementCommandMode?: Partial<MovementCommandModeInput>,
  ): boolean {
    if (typeof movementCommandMode?.preferRoads === "boolean") {
      return movementCommandMode.preferRoads;
    }
    return true;
  }

  private faceCurrentDestination(unit: Unit, movementState: UnitMovementState): void {
    if (!movementState.destinationCell) {
      movementState.targetRotation = null;
      return;
    }

    if (!movementState.movementCommandMode.rotateToFace) {
      movementState.targetRotation = null;
      return;
    }

    const destination = this.gridToWorldCenter(movementState.destinationCell);
    const angleToTarget = Math.atan2(destination.y - unit.y, destination.x - unit.x);
    movementState.targetRotation = angleToTarget - BattleRoom.UNIT_FORWARD_OFFSET;
  }

  private static wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  private ensureFiniteUnitState(unit: Unit): void {
    if (!Number.isFinite(unit.x)) {
      unit.x = 0;
    }
    if (!Number.isFinite(unit.y)) {
      unit.y = 0;
    }
    if (!Number.isFinite(unit.rotation)) {
      unit.rotation = 0;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  private getGridCellIndex(col: number, row: number): number {
    return row * BattleRoom.GRID_WIDTH + col;
  }

  private getGridCellKey(cell: GridCoordinate): string {
    return `${cell.col},${cell.row}`;
  }

  private getGridCellKeyFromColRow(col: number, row: number): string {
    return `${col},${row}`;
  }

  private buildCityZoneFallback(
    zoneId: string,
    homeTeam: PlayerTeam | "NEUTRAL",
    anchor: GridCoordinate,
  ): {
    cityZoneId: string;
    homeTeam: PlayerTeam | "NEUTRAL";
    anchor: GridCoordinate;
    cells: GridCoordinate[];
  } {
    return {
      cityZoneId: zoneId,
      homeTeam,
      anchor: { col: anchor.col, row: anchor.row },
      cells: [{ col: anchor.col, row: anchor.row }],
    };
  }

  private findHomeCityZone(
    homeTeam: PlayerTeam,
    fallbackAnchor: GridCoordinate,
  ): {
    cityZoneId: string;
    homeTeam: PlayerTeam | "NEUTRAL";
    anchor: GridCoordinate;
    cells: GridCoordinate[];
  } {
    const parsedZones = this.activeMapBundle?.cityZones ?? [];
    const matchingZone = parsedZones.find((zone) => zone.homeTeam === homeTeam);
    if (!matchingZone) {
      return this.buildCityZoneFallback(
        homeTeam === "RED" ? "home-red" : "home-blue",
        homeTeam,
        fallbackAnchor,
      );
    }
    return {
      cityZoneId: matchingZone.cityZoneId,
      homeTeam: matchingZone.homeTeam,
      anchor: { col: matchingZone.anchor.col, row: matchingZone.anchor.row },
      cells: matchingZone.cells.map((cell) => ({ col: cell.col, row: cell.row })),
    };
  }

  private findNeutralCityZoneForAnchor(
    anchor: GridCoordinate,
    usedZoneIds: Set<string>,
    fallbackZoneId: string,
  ): {
    cityZoneId: string;
    homeTeam: PlayerTeam | "NEUTRAL";
    anchor: GridCoordinate;
    cells: GridCoordinate[];
  } {
    const parsedZones = this.activeMapBundle?.cityZones ?? [];
    for (const zone of parsedZones) {
      if (zone.homeTeam !== "NEUTRAL" || usedZoneIds.has(zone.cityZoneId)) {
        continue;
      }
      if (zone.anchor.col !== anchor.col || zone.anchor.row !== anchor.row) {
        continue;
      }
      usedZoneIds.add(zone.cityZoneId);
      return {
        cityZoneId: zone.cityZoneId,
        homeTeam: zone.homeTeam,
        anchor: { col: zone.anchor.col, row: zone.anchor.row },
        cells: zone.cells.map((cell) => ({ col: cell.col, row: cell.row })),
      };
    }

    for (const zone of parsedZones) {
      if (zone.homeTeam !== "NEUTRAL" || usedZoneIds.has(zone.cityZoneId)) {
        continue;
      }
      usedZoneIds.add(zone.cityZoneId);
      return {
        cityZoneId: zone.cityZoneId,
        homeTeam: zone.homeTeam,
        anchor: { col: zone.anchor.col, row: zone.anchor.row },
        cells: zone.cells.map((cell) => ({ col: cell.col, row: cell.row })),
      };
    }

    return this.buildCityZoneFallback(fallbackZoneId, "NEUTRAL", anchor);
  }

  private resolveFriendlyCityCountForMap(mapId: string): number {
    const configuredFriendlyCityCount =
      this.generationProfileByMapId.get(mapId)?.cities.friendlyCityCount;
    if (
      typeof configuredFriendlyCityCount === "number" &&
      Number.isInteger(configuredFriendlyCityCount) &&
      configuredFriendlyCityCount > 0
    ) {
      return configuredFriendlyCityCount;
    }
    return 0;
  }

  private applyInitialNeutralCityOwnership(): void {
    const neutralCityCount = this.state.neutralCityOwners.length;
    for (let index = 0; index < neutralCityCount; index += 1) {
      this.state.neutralCityOwners[index] =
        this.neutralCityInitialOwnerByIndex[index] ?? "NEUTRAL";
    }
  }

  private syncMapFeatureMetadataFromBundle(): void {
    this.roadCellIndexSet.clear();
    this.cityZoneCellSetByHomeTeam.RED.clear();
    this.cityZoneCellSetByHomeTeam.BLUE.clear();
    this.cityZoneCellsByHomeTeam.RED = [];
    this.cityZoneCellsByHomeTeam.BLUE = [];
    this.cityZoneIdByHomeTeam.RED = "home-red";
    this.cityZoneIdByHomeTeam.BLUE = "home-blue";
    this.neutralCityZoneCellSets.length = 0;
    this.neutralCityZoneCells.length = 0;
    this.neutralCityZoneIds.length = 0;
    this.neutralCityInitialOwnerByIndex.length = 0;
    this.friendlySpawnCityCellsByTeam.RED = [];
    this.friendlySpawnCityCellsByTeam.BLUE = [];
    this.friendlySpawnFarmCellsByTeam.RED = [];
    this.friendlySpawnFarmCellsByTeam.BLUE = [];
    this.farmZoneAnchorById.clear();
    this.farmToCityLinks = [];

    if (!this.activeMapBundle) {
      return;
    }

    for (const roadCell of this.activeMapBundle.roadCells) {
      const index = this.getGridCellIndex(roadCell.col, roadCell.row);
      this.roadCellIndexSet.add(index);
    }

    const redZone = this.findHomeCityZone("RED", this.activeMapBundle.cityAnchors.RED);
    const blueZone = this.findHomeCityZone("BLUE", this.activeMapBundle.cityAnchors.BLUE);
    this.cityZoneIdByHomeTeam.RED = redZone.cityZoneId;
    this.cityZoneIdByHomeTeam.BLUE = blueZone.cityZoneId;
    this.cityZoneCellsByHomeTeam.RED = redZone.cells;
    this.cityZoneCellsByHomeTeam.BLUE = blueZone.cells;
    for (const cell of redZone.cells) {
      this.cityZoneCellSetByHomeTeam.RED.add(this.getGridCellKey(cell));
    }
    for (const cell of blueZone.cells) {
      this.cityZoneCellSetByHomeTeam.BLUE.add(this.getGridCellKey(cell));
    }

    const usedNeutralZoneIds = new Set<string>();
    for (let index = 0; index < this.neutralCityCells.length; index += 1) {
      const anchor = this.neutralCityCells[index];
      const neutralZone = this.findNeutralCityZoneForAnchor(
        anchor,
        usedNeutralZoneIds,
        `neutral-${index}`,
      );
      const cellSet = new Set<string>(
        neutralZone.cells.map((cell) => this.getGridCellKey(cell)),
      );
      this.neutralCityZoneIds.push(neutralZone.cityZoneId);
      this.neutralCityZoneCells.push(neutralZone.cells);
      this.neutralCityZoneCellSets.push(cellSet);
    }

    for (const farmZone of this.activeMapBundle.farmZones) {
      this.farmZoneAnchorById.set(farmZone.farmZoneId, {
        col: farmZone.anchor.col,
        row: farmZone.anchor.row,
      });
    }
    this.farmToCityLinks = this.activeMapBundle.farmToCityLinks.map((link) => ({
      farmZoneId: link.farmZoneId,
      cityZoneId: link.cityZoneId,
    }));
    const resolvedStartingZoneState = this.startingZoneResolver.resolve({
      cityZones: this.activeMapBundle.cityZones,
      farmZones: this.activeMapBundle.farmZones,
      farmToCityLinks: this.farmToCityLinks,
      homeCityZoneIdsByTeam: {
        RED: redZone.cityZoneId,
        BLUE: blueZone.cityZoneId,
      },
      neutralCityZoneIds: this.neutralCityZoneIds,
      configuredFriendlyCityCount: this.resolveFriendlyCityCountForMap(
        this.state.mapId,
      ),
    });
    this.neutralCityInitialOwnerByIndex.push(
      ...resolvedStartingZoneState.neutralCityInitialOwnerByIndex,
    );
    this.friendlySpawnCityCellsByTeam.RED =
      resolvedStartingZoneState.friendlySpawnCityCellsByTeam.RED;
    this.friendlySpawnCityCellsByTeam.BLUE =
      resolvedStartingZoneState.friendlySpawnCityCellsByTeam.BLUE;
    this.friendlySpawnFarmCellsByTeam.RED =
      resolvedStartingZoneState.friendlySpawnFarmCellsByTeam.RED;
    this.friendlySpawnFarmCellsByTeam.BLUE =
      resolvedStartingZoneState.friendlySpawnFarmCellsByTeam.BLUE;
  }

  private getMapBundleTerrainTypeAtCell(
    cell: GridCoordinate,
  ): TerrainType | null {
    const terrainCodeGrid = this.activeMapBundle?.terrainCodeGrid;
    if (!terrainCodeGrid) {
      return null;
    }
    const terrainCode = terrainCodeGrid.charAt(
      this.getGridCellIndex(cell.col, cell.row),
    );
    return getTerrainTypeFromCode(terrainCode);
  }

  private getMapBundleHillGradeAtCell(
    cell: GridCoordinate,
  ): number | null {
    const hillGradeGrid = this.activeMapBundle?.hillGradeGrid;
    if (!hillGradeGrid) {
      return null;
    }
    const index = this.getGridCellIndex(cell.col, cell.row);
    if (index < 0 || index >= hillGradeGrid.length) {
      return null;
    }
    const grade = hillGradeGrid[index];
    return Number.isFinite(grade) ? grade : null;
  }

  private getHillGradeAtCell(cell: GridCoordinate): number {
    const hillGrade = this.getMapBundleHillGradeAtCell(cell);
    return hillGrade ?? HILL_GRADE_NONE;
  }

  private loadActiveMapBundle(mapId: string, revision: number): void {
    const bundleLoadResult = this.mapRuntimeService.loadActiveMapBundle({
      mapId,
      revision,
      roomModuleUrl: import.meta.url,
      gridWidth: BattleRoom.GRID_WIDTH,
      gridHeight: BattleRoom.GRID_HEIGHT,
      defaultCityAnchors: {
        RED: getTeamCityGridCoordinate("RED"),
        BLUE: getTeamCityGridCoordinate("BLUE"),
      },
      defaultNeutralCityAnchors: getNeutralCityGridCoordinates(),
    });
    this.applyLoadedMapBundle(mapId, bundleLoadResult);
  }

  private applyLoadedMapBundle(
    mapId: string,
    bundleLoadResult: LoadActiveMapBundleResult,
  ): void {
    this.activeMapBundle = bundleLoadResult.bundle;
    for (const warning of bundleLoadResult.warnings) {
      if (warning.error) {
        console.warn(
          `[map-bundle][${warning.code}] mapId=${mapId} ${warning.message}`,
          warning.error,
        );
        continue;
      }
      console.warn(`[map-bundle][${warning.code}] mapId=${mapId} ${warning.message}`);
    }

    console.log(
      `[map-bundle] revision=${this.activeMapBundle.revision} mapId=${this.activeMapBundle.mapId} source=${this.activeMapBundle.source} method=${this.activeMapBundle.method} blocked=${this.activeMapBundle.blockedSpawnCellIndexSet.size} impassable=${this.activeMapBundle.impassableCellIndexSet.size}`,
    );
  }

  private isCellImpassable(cell: GridCoordinate): boolean {
    if (
      cell.col < 0 ||
      cell.row < 0 ||
      cell.col >= BattleRoom.GRID_WIDTH ||
      cell.row >= BattleRoom.GRID_HEIGHT
    ) {
      return true;
    }

    return (
      this.activeMapBundle?.impassableCellIndexSet.has(
        this.getGridCellIndex(cell.col, cell.row),
      ) ?? false
    );
  }

  private isBlockedSpawnCell(cell: GridCoordinate): boolean {
    if (
      cell.col < 0 ||
      cell.row < 0 ||
      cell.col >= BattleRoom.GRID_WIDTH ||
      cell.row >= BattleRoom.GRID_HEIGHT
    ) {
      return true;
    }

    return (
      this.activeMapBundle?.blockedSpawnCellIndexSet.has(
        this.getGridCellIndex(cell.col, cell.row),
      ) ?? false
    );
  }

  private worldToGridCoordinate(x: number, y: number): GridCoordinate {
    const colBasis = x / BattleRoom.CELL_WIDTH - 0.5;
    const rowBasis = y / BattleRoom.CELL_HEIGHT - 0.5;

    return {
      col: this.clamp(
        Math.round(colBasis),
        0,
        BattleRoom.GRID_WIDTH - 1,
      ),
      row: this.clamp(
        Math.round(rowBasis),
        0,
        BattleRoom.GRID_HEIGHT - 1,
      ),
    };
  }

  private getInfluenceScoreAtPoint(x: number, y: number): number {
    const grid = this.state.influenceGrid;
    const colBasis = x / BattleRoom.CELL_WIDTH - 0.5;
    const rowBasis = y / BattleRoom.CELL_HEIGHT - 0.5;

    const baseCol = this.clamp(Math.floor(colBasis), 0, grid.width - 1);
    const baseRow = this.clamp(Math.floor(rowBasis), 0, grid.height - 1);
    const nextCol = this.clamp(baseCol + 1, 0, grid.width - 1);
    const nextRow = this.clamp(baseRow + 1, 0, grid.height - 1);
    const tCol = this.clamp(colBasis - baseCol, 0, 1);
    const tRow = this.clamp(rowBasis - baseRow, 0, 1);

    const topLeft = this.getInfluenceScoreAtCell(baseCol, baseRow);
    const topRight = this.getInfluenceScoreAtCell(nextCol, baseRow);
    const bottomLeft = this.getInfluenceScoreAtCell(baseCol, nextRow);
    const bottomRight = this.getInfluenceScoreAtCell(nextCol, nextRow);

    const top = topLeft + (topRight - topLeft) * tCol;
    const bottom = bottomLeft + (bottomRight - bottomLeft) * tCol;
    return top + (bottom - top) * tRow;
  }

  private getInfluenceScoreAtCell(col: number, row: number): number {
    return this.getGridScoreAtCell(this.state.influenceGrid, col, row);
  }

  private getSupplyEvaluationInfluenceScoreAtCell(col: number, row: number): number {
    return this.getGridScoreAtCell(this.supplyEvaluationInfluenceGrid, col, row);
  }

  private getGridScoreAtCell(
    targetGrid: {
      width: number;
      cells: ArrayLike<number>;
    },
    col: number,
    row: number,
  ): number {
    const index = row * targetGrid.width + col;
    const value = targetGrid.cells[index];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return 0;
    }
    return value;
  }

  private gridToWorldCenter(cell: GridCoordinate): Vector2 {
    return {
      x: (cell.col + 0.5) * BattleRoom.CELL_WIDTH,
      y: (cell.row + 0.5) * BattleRoom.CELL_HEIGHT,
    };
  }

  private snapUnitToGrid(unit: Unit): GridCoordinate {
    const cell = this.worldToGridCoordinate(unit.x, unit.y);
    const snapped = this.gridToWorldCenter(cell);
    unit.x = snapped.x;
    unit.y = snapped.y;
    return cell;
  }

  private getTerrainTypeAtCell(cell: GridCoordinate): TerrainType {
    const bundleTerrainType = this.getMapBundleTerrainTypeAtCell(cell);
    if (bundleTerrainType) {
      return bundleTerrainType;
    }
    return "unknown";
  }

  private getTerrainSpeedMultiplierAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    const terrainMultiplier = BattleRoom.TERRAIN_SPEED_MULTIPLIER[terrainType] ?? 1.0;
    if (
      terrainMultiplier <= 0 ||
      !Number.isFinite(terrainMultiplier) ||
      !this.roadCellIndexSet.has(this.getGridCellIndex(cell.col, cell.row))
    ) {
      return terrainMultiplier;
    }
    return terrainMultiplier * BattleRoom.ROAD_MOVEMENT_MULTIPLIER;
  }

  private getPathfindingStepCostAtCell(
    cell: GridCoordinate,
    preferRoads: boolean,
  ): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    const baseStepCost = BattleRoom.TERRAIN_PATHFINDING_STEP_COST[terrainType] ?? 1;
    if (!Number.isFinite(baseStepCost) || baseStepCost <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    if (
      !preferRoads ||
      !this.roadCellIndexSet.has(this.getGridCellIndex(cell.col, cell.row))
    ) {
      return baseStepCost;
    }

    const roadCostMultiplier = BattleRoom.PATHFINDING_ROAD_STEP_COST_MULTIPLIER;
    if (!Number.isFinite(roadCostMultiplier) || roadCostMultiplier <= 0) {
      return baseStepCost;
    }
    return baseStepCost * roadCostMultiplier;
  }

  private getTerrainMoraleBonusAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    return BattleRoom.TERRAIN_MORALE_BONUS[terrainType] ?? 0;
  }

  private getCityMoraleBonusAtCell(cell: GridCoordinate, team: PlayerTeam): number {
    const configuredBonus = BattleRoom.CITY_MORALE_BONUS_INSIDE_OWNED_ZONE;
    if (!Number.isFinite(configuredBonus) || configuredBonus === 0) {
      return 0;
    }

    const cellKey = this.getGridCellKey(cell);
    if (
      this.getCityOwner("RED") === team &&
      this.cityZoneCellSetByHomeTeam.RED.has(cellKey)
    ) {
      return configuredBonus;
    }
    if (
      this.getCityOwner("BLUE") === team &&
      this.cityZoneCellSetByHomeTeam.BLUE.has(cellKey)
    ) {
      return configuredBonus;
    }

    for (let index = 0; index < this.neutralCityZoneCellSets.length; index += 1) {
      if (this.getNeutralCityOwner(index) !== team) {
        continue;
      }
      if (this.neutralCityZoneCellSets[index]?.has(cellKey)) {
        return configuredBonus;
      }
    }

    return 0;
  }

  private getSlopeMoraleDelta(unit: Unit): number {
    const currentCell = this.worldToGridCoordinate(unit.x, unit.y);
    const unitRotation = Number.isFinite(unit.rotation) ? unit.rotation : 0;
    const facingAngle = unitRotation + BattleRoom.UNIT_FORWARD_OFFSET;
    const forwardCell: GridCoordinate = {
      col: this.clamp(
        currentCell.col + Math.round(Math.cos(facingAngle)),
        0,
        BattleRoom.GRID_WIDTH - 1,
      ),
      row: this.clamp(
        currentCell.row + Math.round(Math.sin(facingAngle)),
        0,
        BattleRoom.GRID_HEIGHT - 1,
      ),
    };
    const currentTerrainType = this.getTerrainTypeAtCell(currentCell);
    const forwardTerrainType = this.getTerrainTypeAtCell(forwardCell);
    const moralePerInfluenceDot =
      BattleRoom.MORALE_MAX_SCORE /
      Math.max(
        1,
        (BattleRoom.MORALE_SAMPLE_RADIUS * 2 + 1) *
          (BattleRoom.MORALE_SAMPLE_RADIUS * 2 + 1),
      );
    return getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType,
      forwardTerrainType,
      currentHillGrade: this.getHillGradeAtCell(currentCell),
      forwardHillGrade: this.getHillGradeAtCell(forwardCell),
      moralePerInfluenceDot,
      slopeMoraleDotEquivalent: BattleRoom.SLOPE_MORALE_DOT_EQUIVALENT,
    });
  }

  private updateInfluenceGrid(force = false): void {
    const influenceUpdateIntervalFrames = Math.max(
      1,
      Math.round(this.runtimeTuning.influenceUpdateIntervalFrames),
    );
    if (!force && this.simulationFrame % influenceUpdateIntervalFrames !== 0) {
      return;
    }

    this.syncStaticInfluenceSources();
    this.influenceGridSystem.writeInfluenceScores(
      this.state.influenceGrid,
      this.state.units.values(),
    );
  }

  private syncStaticInfluenceSources(): void {
    this.supplyInfluenceGridSystem.setStaticInfluenceSources(
      this.cityInfluenceSources,
    );
    const blockedSupplySources = this.buildBlockedSupplyEndpointInfluenceSources();
    this.influenceGridSystem.setStaticInfluenceSources([
      ...this.cityInfluenceSources,
      ...blockedSupplySources,
    ]);
  }

  private updateSupplyEvaluationInfluenceGrid(): void {
    this.syncStaticInfluenceSources();
    this.supplyInfluenceGridSystem.writeInfluenceScores(
      this.supplyEvaluationInfluenceGrid,
      this.state.units.values(),
    );
  }

  private buildBlockedSupplyEndpointInfluenceSources(): StaticInfluenceSourceInput[] {
    const unitPower =
      this.runtimeTuning.baseUnitHealth * this.runtimeTuning.unitInfluenceMultiplier;
    const samples: BlockedSupplyEndpointSample[] = [];
    for (const [unitId, supplyLine] of this.state.supplyLines) {
      const endpointCell =
        supplyLine.connected || supplyLine.severIndex < 0
          ? null
          : resolveBlockedSupplyEndpointCellFromPath(
              supplyLine.path,
              supplyLine.severIndex,
            );
      samples.push({
        unitId,
        team: endpointCell ? this.normalizeTeam(supplyLine.team) : null,
        endpointCell,
      });
    }
    return this.blockedSupplyEndpointInfluenceTracker.buildSources({
      samples,
      nowMs: Date.now(),
      unitPower,
      gridToWorldCenter: (cell) => this.gridToWorldCenter(cell),
    });
  }

  private getCityWorldPosition(team: PlayerTeam): Vector2 {
    const cityCell =
      this.activeMapBundle?.cityAnchors[team] ?? getTeamCityGridCoordinate(team);
    return this.gridToWorldCenter(cityCell);
  }

  private normalizeTeam(teamValue: string): PlayerTeam {
    return teamValue.toUpperCase() === "RED" ? "RED" : "BLUE";
  }

  private getCityOwner(homeCity: PlayerTeam): PlayerTeam {
    const owner = homeCity === "RED" ? this.state.redCityOwner : this.state.blueCityOwner;
    return this.normalizeTeam(owner);
  }

  private setCityOwner(homeCity: PlayerTeam, owner: PlayerTeam): void {
    if (homeCity === "RED") {
      this.state.redCityOwner = owner;
      return;
    }
    this.state.blueCityOwner = owner;
  }

  private getCityCell(homeCity: PlayerTeam): GridCoordinate {
    const cityPosition = this.getCityWorldPosition(homeCity);
    return this.worldToGridCoordinate(cityPosition.x, cityPosition.y);
  }

  private getNeutralCityCell(index: number): GridCoordinate | null {
    const cityCell = this.neutralCityCells[index];
    if (!cityCell) {
      return null;
    }

    return cityCell;
  }

  private getNeutralCityOwner(index: number): CityOwner {
    const owner = this.state.neutralCityOwners[index];
    if (owner === "RED" || owner === "BLUE") {
      return owner;
    }

    return "NEUTRAL";
  }

  private setNeutralCityOwner(index: number, owner: CityOwner): void {
    this.state.neutralCityOwners[index] = owner;
  }

  private getCityZoneCells(homeCity: PlayerTeam): readonly GridCoordinate[] {
    return this.cityZoneCellsByHomeTeam[homeCity];
  }

  private getNeutralCityZoneCells(index: number): readonly GridCoordinate[] | null {
    const zoneCells = this.neutralCityZoneCells[index];
    return zoneCells ?? null;
  }

  private getUncontestedOccupyingTeamAtZone(
    zoneCells: readonly GridCoordinate[],
  ): PlayerTeam | null {
    if (zoneCells.length === 0) {
      return null;
    }

    const zoneCellSet = new Set<string>(zoneCells.map((cell) => this.getGridCellKey(cell)));
    let occupyingTeam: PlayerTeam | null = null;
    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }
      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      if (!zoneCellSet.has(this.getGridCellKey(unitCell))) {
        continue;
      }

      const unitTeam = this.normalizeTeam(unit.team);
      if (!occupyingTeam) {
        occupyingTeam = unitTeam;
        continue;
      }
      if (occupyingTeam !== unitTeam) {
        return null;
      }
    }

    return occupyingTeam;
  }

  private updateCityOwnershipFromOccupancy(): boolean {
    return updateCityOwnershipFromOccupancySystem({
      getUncontestedOccupyingTeamAtZone: (zoneCells) =>
        this.getUncontestedOccupyingTeamAtZone(zoneCells),
      getCityZoneCells: (homeCity) => this.getCityZoneCells(homeCity),
      getCityOwner: (homeCity) => this.getCityOwner(homeCity),
      setCityOwner: (homeCity, owner) => this.setCityOwner(homeCity, owner),
      neutralCityCount: this.neutralCityCells.length,
      getNeutralCityZoneCells: (index) => this.getNeutralCityZoneCells(index),
      getNeutralCityOwner: (index) => this.getNeutralCityOwner(index),
      setNeutralCityOwner: (index, owner) => this.setNeutralCityOwner(index, owner),
    });
  }

  private resetCityUnitGenerationState(): void {
    this.state.citySupplyBySourceId.clear();
    this.citySupplyTripProgressBySourceId.clear();
    this.citySupplyDecayProgressBySourceId.clear();
    this.citySupplyOwnerBySourceId.clear();
    this.syncCitySupplyState(this.getCitySpawnSources());
    this.generatedUnitSequenceByTeam = {
      BLUE: 1,
      RED: 1,
    };
  }

  private resetCityGenerationTimersForAllSources(): void {
    const spawnSources = this.getCitySpawnSources();
    resetCitySupplyForSourcesSystem({
      spawnSources,
      citySupplyBySourceId: this.state.citySupplyBySourceId,
      citySupplyTripProgressBySourceId: this.citySupplyTripProgressBySourceId,
      citySupplyDecayProgressBySourceId: this.citySupplyDecayProgressBySourceId,
      citySupplyOwnerBySourceId: this.citySupplyOwnerBySourceId,
    });
  }

  private getCitySpawnSources(): CitySpawnSource[] {
    return collectCitySpawnSources({
      neutralCityCount: this.neutralCityCells.length,
      getCityOwner: (homeCity) => this.getCityOwner(homeCity),
      getCityCell: (homeCity) => this.getCityCell(homeCity),
      getNeutralCityOwner: (index) => this.getNeutralCityOwner(index),
      getNeutralCityCell: (index) => this.getNeutralCityCell(index),
    });
  }

  private syncCitySupplyState(spawnSources: CitySpawnSource[]): void {
    syncCitySupplyStateSystem({
      spawnSources,
      citySupplyBySourceId: this.state.citySupplyBySourceId,
      citySupplyTripProgressBySourceId: this.citySupplyTripProgressBySourceId,
      citySupplyDecayProgressBySourceId: this.citySupplyDecayProgressBySourceId,
      citySupplyOwnerBySourceId: this.citySupplyOwnerBySourceId,
    });
  }

  private getCitySupplySourceIdByCityZoneId(): Map<string, string> {
    return buildCitySupplySourceIdByCityZoneIdSystem({
      homeCityZoneIdByTeam: this.cityZoneIdByHomeTeam,
      neutralCityZoneIds: this.neutralCityZoneIds,
    });
  }

  private isCellOccupiedByActiveUnit(targetCell: GridCoordinate): boolean {
    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }

      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      if (unitCell.col === targetCell.col && unitCell.row === targetCell.row) {
        return true;
      }
    }

    return false;
  }

  private isCitySpawnCellOpen(targetCell: GridCoordinate): boolean {
    if (this.isBlockedSpawnCell(targetCell)) {
      return false;
    }
    return !this.isCellOccupiedByActiveUnit(targetCell);
  }

  private findOpenSpawnCellNearCity(cityCell: GridCoordinate): GridCoordinate | null {
    return findOpenSpawnCellNearCitySystem({
      cityCell,
      searchRadius: BattleRoom.CITY_SPAWN_SEARCH_RADIUS,
      gridWidth: BattleRoom.GRID_WIDTH,
      gridHeight: BattleRoom.GRID_HEIGHT,
      isCitySpawnCellOpen: (targetCell) => this.isCitySpawnCellOpen(targetCell),
    });
  }

  private allocateGeneratedCityUnitId(team: PlayerTeam): string {
    return allocateGeneratedCityUnitIdSystem(
      team,
      this.generatedUnitSequenceByTeam,
      (unitId) => this.state.units.has(unitId),
    );
  }

  private getSpawnRotationForTeam(team: PlayerTeam, spawnPosition: Vector2): number {
    return getSpawnRotationForTeamSystem(
      team,
      spawnPosition,
      (homeCity) => this.getCityWorldPosition(homeCity),
      BattleRoom.UNIT_FORWARD_OFFSET,
    );
  }

  private spawnCityUnit(team: PlayerTeam, spawnCell: GridCoordinate): void {
    const spawnPosition = this.gridToWorldCenter(spawnCell);
    const unitId = this.allocateGeneratedCityUnitId(team);
    const spawnedUnit = createSpawnedCityUnit(
      unitId,
      team,
      spawnPosition,
      this.getSpawnRotationForTeam(team, spawnPosition),
      this.runtimeTuning.baseUnitHealth,
    );
    this.state.units.set(spawnedUnit.unitId, spawnedUnit);
    this.movementStateByUnitId.set(
      spawnedUnit.unitId,
      this.createMovementState(),
    );
  }

  private updateCityUnitGeneration(deltaSeconds: number): number {
    if (deltaSeconds <= 0) {
      return 0;
    }

    const generationIntervalSeconds = Math.max(
      1,
      this.runtimeTuning.cityUnitGenerationIntervalSeconds,
    );
    const spawnSources = this.getCitySpawnSources();
    return updateCitySupplyAndGenerateUnitsSystem({
      deltaSeconds,
      generationIntervalSeconds,
      supplyPerUnitThreshold: BattleRoom.CITY_SUPPLY_PER_UNIT_THRESHOLD,
      spawnSources,
      farmCitySupplyLines: this.state.farmCitySupplyLines.values(),
      sourceIdByCityZoneId: this.getCitySupplySourceIdByCityZoneId(),
      citySupplyBySourceId: this.state.citySupplyBySourceId,
      citySupplyTripProgressBySourceId: this.citySupplyTripProgressBySourceId,
      citySupplyDecayProgressBySourceId: this.citySupplyDecayProgressBySourceId,
      citySupplyOwnerBySourceId: this.citySupplyOwnerBySourceId,
      findOpenSpawnCellNearCity: (cityCell) =>
        this.findOpenSpawnCellNearCity(cityCell),
      spawnCityUnit: (team, spawnCell) => this.spawnCityUnit(team, spawnCell),
    });
  }

  private syncCityInfluenceSources(): void {
    const redCityPosition = this.getCityWorldPosition("RED");
    const blueCityPosition = this.getCityWorldPosition("BLUE");
    const redCityOwner = this.getCityOwner("RED");
    const blueCityOwner = this.getCityOwner("BLUE");
    const cityPower =
      this.runtimeTuning.baseUnitHealth *
      this.runtimeTuning.unitInfluenceMultiplier *
      this.runtimeTuning.cityInfluenceUnitsEquivalent;

    this.cityInfluenceSources = buildCityInfluenceSources({
      redCityPosition,
      blueCityPosition,
      redCityOwner,
      blueCityOwner,
      neutralCityCount: this.neutralCityCells.length,
      getNeutralCityCell: (index) => this.getNeutralCityCell(index),
      getNeutralCityOwner: (index) => this.getNeutralCityOwner(index),
      gridToWorldCenter: (cell) => this.gridToWorldCenter(cell),
      cityPower,
    });
    this.syncStaticInfluenceSources();
  }

  private handleRuntimeTuningUpdate(
    client: Client,
    message: RuntimeTuningUpdateMessage,
  ): void {
    if (!this.lobbyService.hasSession(client.sessionId)) {
      return;
    }

    const normalizedMessage =
      typeof message === "object" && message !== null ? message : {};
    const previousBaseUnitHealth = this.runtimeTuning.baseUnitHealth;
    this.runtimeTuning = applyRuntimeTuningUpdate(
      this.runtimeTuning,
      normalizedMessage,
    );
    if (this.runtimeTuning.baseUnitHealth !== previousBaseUnitHealth) {
      this.rescaleUnitHealthForNewBase(
        previousBaseUnitHealth,
        this.runtimeTuning.baseUnitHealth,
      );
    }
    this.influenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.supplyInfluenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.syncCityInfluenceSources();
    this.broadcast(NETWORK_MESSAGE_TYPES.runtimeTuningSnapshot, this.runtimeTuning);
    this.updateInfluenceGrid(true);
  }

  private handleLobbyReadyMessage(
    client: Client,
    message: LobbyReadyMessage,
  ): void {
    const result = this.lobbyService.handleReadyMessage({
      sessionId: client.sessionId,
      message,
      matchPhase: this.matchPhase,
    });
    if (!result.updated) {
      return;
    }

    this.broadcastLobbyState();
    if (result.shouldTryStart) {
      this.tryStartBattle();
    }
  }

  private handleLobbySelectMapMessage(
    client: Client,
    message: LobbySelectMapMessage,
  ): void {
    const result = this.lobbyService.handleSelectMapMessage({
      sessionId: client.sessionId,
      message,
      matchPhase: this.matchPhase,
      currentMapId: this.state.mapId,
    });
    if (!result.nextMapId) {
      return;
    }

    this.applyLobbyMapSelection(result.nextMapId);
    this.broadcastLobbyState();
  }

  private handleLobbyRandomMapMessage(client: Client): void {
    const result = this.lobbyService.handleRandomMapMessage({
      sessionId: client.sessionId,
      matchPhase: this.matchPhase,
      currentMapId: this.state.mapId,
    });
    if (!result.nextMapId) {
      return;
    }

    this.applyLobbyMapSelection(result.nextMapId);
    this.broadcastLobbyState();
  }

  private handleLobbyGenerateMapMessage(
    client: Client,
    message: LobbyGenerateMapMessage,
  ): void {
    if (this.matchPhase !== "LOBBY") {
      return;
    }

    if (!this.lobbyService.hasSession(client.sessionId)) {
      return;
    }

    if (this.isGeneratingMap) {
      return;
    }

    const mapId = this.lobbyService.getGeneratedMapId();
    this.isGeneratingMap = true;
    this.broadcastLobbyState();

    try {
      const generationResult = this.lobbyMapGenerationService.generateLobbyRuntimeMap({
        mapId,
        message,
        roomModuleUrl: import.meta.url,
      });
      if (!generationResult.ok && generationResult.reason === "invalid-profile") {
        console.warn(
          `[map-generation][invalid-profile] mapId=${mapId} ${generationResult.errors.join("; ")}`,
        );
        return;
      }
      if (!generationResult.ok) {
        this.lobbyMapGenerationService.logMapGenerationFailure(
          "lobby",
          mapId,
          generationResult.failure,
        );
        return;
      }
      const profile = generationResult.profile;
      this.generationProfileByMapId.set(mapId, profile);
      this.lobbyService.addAvailableMapId(mapId);
      this.applyLobbyMapSelection(mapId);
      console.log(
        `Generated new lobby map: ${mapId} (seed ${profile.seed}, method ${profile.method}, layout ${profile.startingForces.layoutStrategy})`,
      );
    } finally {
      this.isGeneratingMap = false;
      this.broadcastLobbyState();
    }
  }

  private rescaleUnitHealthForNewBase(
    previousBaseUnitHealth: number,
    nextBaseUnitHealth: number,
  ): void {
    const safePreviousBase = Math.max(1, previousBaseUnitHealth);
    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }

      const unitType = normalizeUnitType(unit.unitType);
      const previousMaxHealth = Math.max(
        1,
        getUnitHealthMax(safePreviousBase, unitType),
      );
      const nextMaxHealth = Math.max(1, getUnitHealthMax(nextBaseUnitHealth, unitType));
      const healthRatio = this.clamp(unit.health / previousMaxHealth, 0, 1);
      unit.health = healthRatio * nextMaxHealth;
    }
  }

  private clearSupplyLineState(): void {
    for (const unitId of Array.from(this.state.supplyLines.keys())) {
      this.state.supplyLines.delete(unitId);
    }
    for (const linkId of Array.from(this.state.farmCitySupplyLines.keys())) {
      this.state.farmCitySupplyLines.delete(linkId);
    }
    this.supplySignatureByUnitId.clear();
    this.farmCitySupplySignatureByLinkId.clear();
    this.supplySourceRetryStateByUnitId.clear();
    this.blockedSupplyEndpointInfluenceTracker.clear();
  }

  private clearUnits(): void {
    for (const unitId of Array.from(this.state.units.keys())) {
      this.state.units.delete(unitId);
    }
    this.clearSupplyLineState();
    this.moraleStepElapsedSecondsByUnitId.clear();
    this.moraleStepPendingUnitIds.clear();
    this.movementStateByUnitId.clear();
    this.lastBroadcastPathSignatureByUnitId.clear();
    this.engagedUnitIds.clear();
  }

  private applyLobbyMapSelection(
    mapId: string,
    options?: {
      incrementMapRevision?: boolean;
      resetReadyStates?: boolean;
    },
  ): void {
    const incrementMapRevision = options?.incrementMapRevision ?? true;
    const resetReadyStates = options?.resetReadyStates ?? true;
    const switchResult = this.mapRuntimeService.switchRuntimeMap({
      mapId,
      currentMapRevision: this.mapRevision,
      incrementMapRevision,
      roomModuleUrl: import.meta.url,
      gridWidth: BattleRoom.GRID_WIDTH,
      gridHeight: BattleRoom.GRID_HEIGHT,
      defaultCityAnchors: {
        RED: getTeamCityGridCoordinate("RED"),
        BLUE: getTeamCityGridCoordinate("BLUE"),
      },
      defaultNeutralCityAnchors: getNeutralCityGridCoordinates(),
    });
    this.state.mapId = mapId;
    this.applyLoadedMapBundle(mapId, switchResult);
    this.neutralCityCells = switchResult.neutralCityAnchors;
    this.syncMapFeatureMetadataFromBundle();
    this.state.redCityOwner = "RED";
    this.state.blueCityOwner = "BLUE";
    this.mapRuntimeService.resetNeutralCityOwnership(
      this.state.neutralCityOwners,
      this.neutralCityCells.length,
    );
    this.applyInitialNeutralCityOwnership();
    this.resetCityUnitGenerationState();
    if (resetReadyStates) {
      this.lobbyService.resetLobbyReadyStates();
    }
    this.startingForceLayoutStrategy = this.resolveStartingForceLayoutStrategyForMap(
      mapId,
    );
    this.startingForceLineUnitCountPerTeam =
      this.resolveStartingForceUnitCountPerTeamForMap(mapId);
    this.clearUnits();
    this.syncCityInfluenceSources();
    this.spawnStartingForces();
    this.mapRuntimeService.clearInfluenceGrid(this.state.influenceGrid);
    this.mapRuntimeService.clearInfluenceGrid(this.supplyEvaluationInfluenceGrid);
    this.updateInfluenceGrid(true);
    this.updateSupplyLines();
    this.simulationFrame = 0;
    this.state.simulationFrame = 0;
    this.mapRevision = switchResult.nextMapRevision;
  }

  private spawnStartingForces(): void {
    const cityAnchors = this.activeMapBundle?.cityAnchors ?? {
      RED: getTeamCityGridCoordinate("RED"),
      BLUE: getTeamCityGridCoordinate("BLUE"),
    };
    const plannedUnits = this.startingForcePlanner.computeInitialSpawns({
      strategy: this.startingForceLayoutStrategy,
      cityAnchors,
      blockedSpawnCellIndexSet:
        this.activeMapBundle?.blockedSpawnCellIndexSet ?? new Set<number>(),
      lineUnitCountPerTeam: this.startingForceLineUnitCountPerTeam,
      friendlyCitySpawnCellsByTeam: this.friendlySpawnCityCellsByTeam,
      friendlyFarmSpawnCellsByTeam: this.friendlySpawnFarmCellsByTeam,
      baseUnitHealth: this.runtimeTuning.baseUnitHealth,
      unitForwardOffset: BattleRoom.UNIT_FORWARD_OFFSET,
      mapWidth: GAMEPLAY_CONFIG.map.width,
      mapHeight: GAMEPLAY_CONFIG.map.height,
      gridWidth: BattleRoom.GRID_WIDTH,
      gridHeight: BattleRoom.GRID_HEIGHT,
      citySpawnSearchRadius: BattleRoom.CITY_SPAWN_SEARCH_RADIUS,
    });

    for (const plannedUnit of plannedUnits.units) {
      const unit = new Unit(
        plannedUnit.unitId,
        plannedUnit.team.toLowerCase(),
        plannedUnit.position.x,
        plannedUnit.position.y,
        plannedUnit.rotation,
        plannedUnit.health,
        plannedUnit.unitType,
      );
      this.state.units.set(unit.unitId, unit);
      this.movementStateByUnitId.set(unit.unitId, this.createMovementState());
    }
  }

  private resolveStartingForceLayoutStrategyForMap(
    mapId: string,
  ): StartingForceLayoutStrategy {
    return (
      this.generationProfileByMapId.get(mapId)?.startingForces.layoutStrategy ??
      DEFAULT_GENERATION_PROFILE.startingForces.layoutStrategy
    );
  }

  private resolveStartingForceUnitCountPerTeamForMap(mapId: string): number | null {
    const unitCount =
      this.generationProfileByMapId.get(mapId)?.startingForces.unitCountPerTeam;
    if (
      typeof unitCount === "number" &&
      Number.isInteger(unitCount) &&
      unitCount > 0
    ) {
      return unitCount;
    }
    return null;
  }

  private handleUnitPathMessage(client: Client, message: UnitPathMessage): void {
    if (this.matchPhase !== "BATTLE") {
      return;
    }

    const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    if (typeof message?.unitId !== "string" || !Array.isArray(message.path)) {
      return;
    }

    const unit = this.state.units.get(message.unitId);
    if (!unit || unit.health <= 0) {
      return;
    }

    if (unit.team.toUpperCase() !== assignedTeam) {
      return;
    }

    const normalizedPath = normalizePathWaypoints(message.path);
    if (!normalizedPath) {
      return;
    }

    const movementState = this.getOrCreateMovementState(unit.unitId);
    movementState.movementCommandMode = this.normalizeMovementCommandMode(
      message.movementCommandMode,
    );
    movementState.targetRotation = null;
    movementState.movementBudget = 0;
    movementState.isPaused = false;
    movementState.terrainTransitionPauseRemainingSeconds = 0;

    if (normalizedPath.length === 0) {
      this.clearMovementForUnit(unit.unitId);
      this.syncUnitPathState(unit.unitId);
      return;
    }

    const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
    const preferRoads = this.resolvePathRoadPreference(message.movementCommandMode);
    const route = buildTerrainAwareRoute(
      unitCell,
      normalizedPath,
      (x, y) => this.worldToGridCoordinate(x, y),
      (_fromCell, toCell) => this.getPathfindingStepCostAtCell(toCell, preferRoads),
      (cell) => this.isCellImpassable(cell),
      {
        maxExpansionsPerSegment:
          BattleRoom.PATHFINDING_MAX_ROUTE_EXPANSIONS_PER_SEGMENT,
        heuristicMinStepCost: BattleRoom.PATHFINDING_HEURISTIC_MIN_STEP_COST,
      },
    );

    if (route.length === 0) {
      this.clearMovementForUnit(unit.unitId);
      this.syncUnitPathState(unit.unitId);
      return;
    }

    movementState.destinationCell = route[0];
    movementState.queuedCells = route.slice(1);
    this.faceCurrentDestination(unit, movementState);
    this.syncUnitPathState(unit.unitId);
  }

  private handleUnitCancelMovementMessage(
    client: Client,
    message: UnitCancelMovementMessage,
  ): void {
    if (this.matchPhase !== "BATTLE") {
      return;
    }

    const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    if (typeof message?.unitId !== "string") {
      return;
    }

    const unit = this.state.units.get(message.unitId);
    if (!unit) {
      return;
    }

    if (unit.team.toUpperCase() !== assignedTeam) {
      return;
    }

    this.clearMovementForUnit(unit.unitId);
    this.syncUnitPathState(unit.unitId);
  }

  private handleUnitToggleMovementPauseMessage(
    client: Client,
    message: UnitToggleMovementPauseMessage,
  ): void {
    if (this.matchPhase !== "BATTLE") {
      return;
    }

    const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    if (typeof message?.unitId !== "string") {
      return;
    }

    const unit = this.state.units.get(message.unitId);
    if (!unit) {
      return;
    }

    if (unit.team.toUpperCase() !== assignedTeam) {
      return;
    }

    const movementState = this.movementStateByUnitId.get(unit.unitId);
    if (!movementState) {
      return;
    }

    const hasPath =
      movementState.destinationCell !== null || movementState.queuedCells.length > 0;
    if (!hasPath) {
      return;
    }

    movementState.isPaused = !movementState.isPaused;
    if (movementState.isPaused) {
      movementState.movementBudget = 0;
      movementState.targetRotation = null;
    }
    this.syncUnitPathState(unit.unitId);
  }

  private handleUnitHoldMovementMessage(
    client: Client,
    message: UnitHoldMovementMessage,
  ): void {
    if (this.matchPhase !== "BATTLE") {
      return;
    }

    const assignedTeam = this.lobbyService.getAssignedTeam(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    if (typeof message?.unitId !== "string") {
      return;
    }

    const unit = this.state.units.get(message.unitId);
    if (!unit) {
      return;
    }

    if (unit.team.toUpperCase() !== assignedTeam) {
      return;
    }

    const movementState = this.getOrCreateMovementState(unit.unitId);
    movementState.isPaused = !movementState.isPaused;
    if (movementState.isPaused) {
      movementState.movementBudget = 0;
      movementState.targetRotation = null;
    }

    this.syncUnitPathState(unit.unitId);
  }

  private updateMovement(deltaSeconds: number): void {
    simulateMovementTick({
      deltaSeconds,
      units: this.state.units.values(),
      movementStateByUnitId: this.movementStateByUnitId,
      unitMoveSpeed: this.runtimeTuning.unitMoveSpeed,
      unitTurnSpeed: BattleRoom.UNIT_TURN_SPEED,
      unitForwardOffset: BattleRoom.UNIT_FORWARD_OFFSET,
      refaceAngleThreshold: BattleRoom.REFACE_ANGLE_THRESHOLD,
      waypointMoveAngleTolerance: BattleRoom.WAYPOINT_MOVE_ANGLE_TOLERANCE,
      ensureFiniteUnitState: (unit) => this.ensureFiniteUnitState(unit),
      snapUnitToGrid: (unit) => this.snapUnitToGrid(unit),
      worldToGridCoordinate: (x, y) => this.worldToGridCoordinate(x, y),
      getTerrainSpeedMultiplierAtCell: (cell) =>
        this.getTerrainSpeedMultiplierAtCell(cell),
      isCellImpassable: (cell) => this.isCellImpassable(cell),
      isWaterCell: (cell) => this.getTerrainTypeAtCell(cell) === "water",
      waterTransitionPauseSeconds: BattleRoom.WATER_TRANSITION_PAUSE_SECONDS,
      gridToWorldCenter: (cell) => this.gridToWorldCenter(cell),
      clearMovementForUnit: (unitId) => this.clearMovementForUnit(unitId),
      isUnitMovementSuppressed: (unitId) => this.engagedUnitIds.has(unitId),
      faceCurrentDestination: (unit, movementState) =>
        this.faceCurrentDestination(unit, movementState),
      wrapAngle: (angle) => BattleRoom.wrapAngle(angle),
    });
  }

  private updateSupplyLines(): void {
    this.updateSupplyEvaluationInfluenceGrid();
    const enemyOccupiedCellKeysByTeam: Record<PlayerTeam, Set<string>> = {
      BLUE: new Set<string>(),
      RED: new Set<string>(),
    };
    for (const unit of this.state.units.values()) {
      if (!unit || unit.health <= 0) {
        continue;
      }
      const team = this.normalizeTeam(unit.team);
      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      const cellKey = this.getGridCellKeyFromColRow(unitCell.col, unitCell.row);
      if (team === "BLUE") {
        enemyOccupiedCellKeysByTeam.RED.add(cellKey);
      } else {
        enemyOccupiedCellKeysByTeam.BLUE.add(cellKey);
      }
    }

    const cityZonesForSupply = [
      {
        cityZoneId: this.cityZoneIdByHomeTeam.RED,
        owner: this.state.redCityOwner,
        cityCell: this.getCityCell("RED"),
      },
      {
        cityZoneId: this.cityZoneIdByHomeTeam.BLUE,
        owner: this.state.blueCityOwner,
        cityCell: this.getCityCell("BLUE"),
      },
      ...this.neutralCityCells.map((cityCell, index) => ({
        cityZoneId: this.neutralCityZoneIds[index] ?? `neutral-${index}`,
        owner: this.state.neutralCityOwners[index] ?? "NEUTRAL",
        cityCell: {
          col: cityCell.col,
          row: cityCell.row,
        },
      })),
    ];
    const farmZonesForSupply = Array.from(this.farmZoneAnchorById.entries()).map(
      ([farmZoneId, sourceCell]) => ({
        farmZoneId,
        sourceCell: {
          col: sourceCell.col,
          row: sourceCell.row,
        },
      }),
    );
    const farmToCitySupplyStatus = computeFarmToCitySupplyStatus({
      cityZones: cityZonesForSupply,
      farmZones: farmZonesForSupply,
      farmToCityLinks: this.farmToCityLinks,
      getInfluenceScoreAtCell: (col, row) =>
        this.getSupplyEvaluationInfluenceScoreAtCell(col, row),
      isCellImpassable: (cell) => this.isCellImpassable(cell),
      enemyInfluenceSeverThreshold:
        GAMEPLAY_CONFIG.supply.enemyInfluenceSeverThreshold,
      isEnemyOccupiedCellForTeam: (team, cell) =>
        enemyOccupiedCellKeysByTeam[team].has(
          this.getGridCellKeyFromColRow(cell.col, cell.row),
        ),
    });
    const computedFarmCitySupplyLines = farmToCitySupplyStatus.linkStates;

    const { supplyLinesByUnitId: computedSupplyLines, retryStateByUnitId } =
      computeSupplyLinesForUnits({
        units: this.state.units.values(),
        worldToGridCoordinate: (x, y) => this.worldToGridCoordinate(x, y),
        getTeamCityCell: (team) => this.getCityCell(team),
        redCityOwner: this.state.redCityOwner,
        blueCityOwner: this.state.blueCityOwner,
        neutralCityOwners: this.state.neutralCityOwners,
        neutralCityCells: this.neutralCityCells,
        getInfluenceScoreAtCell: (col, row) =>
          this.getSupplyEvaluationInfluenceScoreAtCell(col, row),
        isCellImpassable: (cell) => this.isCellImpassable(cell),
        enemyInfluenceSeverThreshold:
          GAMEPLAY_CONFIG.supply.enemyInfluenceSeverThreshold,
        isCitySupplySourceEligible: (_team, cityCell) =>
          farmToCitySupplyStatus.suppliedCityCellKeys.has(
            this.getGridCellKeyFromColRow(cityCell.col, cityCell.row),
          ),
        previousRetryStateByUnitId: this.supplySourceRetryStateByUnitId,
        blockedSourceRetryIntervalMs:
          BattleRoom.SUPPLY_BLOCKED_SOURCE_RETRY_INTERVAL_MS,
        nowMs: Date.now(),
      });
    this.supplySourceRetryStateByUnitId.clear();
    for (const [unitId, retryState] of retryStateByUnitId) {
      this.supplySourceRetryStateByUnitId.set(unitId, retryState);
    }

    for (const [unitId, supplyLine] of computedSupplyLines) {
      const nextSignature = this.buildSupplyLineSignature(supplyLine);
      const previousSignature = this.supplySignatureByUnitId.get(unitId);
      if (previousSignature === nextSignature) {
        continue;
      }

      this.supplySignatureByUnitId.set(unitId, nextSignature);
      const existingState = this.state.supplyLines.get(unitId);
      if (!existingState) {
        this.state.supplyLines.set(unitId, this.createSupplyLineState(supplyLine));
        continue;
      }

      existingState.unitId = supplyLine.unitId;
      existingState.team = supplyLine.team;
      existingState.connected = supplyLine.connected;
      existingState.sourceCol = supplyLine.sourceCol;
      existingState.sourceRow = supplyLine.sourceRow;
      existingState.severIndex = supplyLine.severIndex;
      while (existingState.path.length > 0) {
        existingState.path.pop();
      }
      for (const cell of supplyLine.path) {
        existingState.path.push(new GridCellState(cell.col, cell.row));
      }
    }

    for (const supplyLine of computedFarmCitySupplyLines) {
      const linkId = supplyLine.linkId;
      const nextSignature = this.buildFarmCitySupplyLineSignature(supplyLine);
      const previousSignature = this.farmCitySupplySignatureByLinkId.get(linkId);
      if (previousSignature === nextSignature) {
        continue;
      }

      this.farmCitySupplySignatureByLinkId.set(linkId, nextSignature);
      const existingState = this.state.farmCitySupplyLines.get(linkId);
      if (!existingState) {
        this.state.farmCitySupplyLines.set(
          linkId,
          this.createFarmCitySupplyLineState(supplyLine),
        );
        continue;
      }

      existingState.linkId = supplyLine.linkId;
      existingState.farmZoneId = supplyLine.farmZoneId;
      existingState.cityZoneId = supplyLine.cityZoneId;
      existingState.team = supplyLine.team;
      existingState.connected = supplyLine.connected;
      existingState.severIndex = supplyLine.severIndex;
      while (existingState.path.length > 0) {
        existingState.path.pop();
      }
      for (const cell of supplyLine.path) {
        existingState.path.push(new GridCellState(cell.col, cell.row));
      }
    }

    const activeSupplyUnitIds = new Set(computedSupplyLines.keys());
    for (const unitId of Array.from(this.state.supplyLines.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.state.supplyLines.delete(unitId);
      this.supplySignatureByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }

    for (const unitId of Array.from(this.supplySignatureByUnitId.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.supplySignatureByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }

    for (const unitId of Array.from(this.supplySourceRetryStateByUnitId.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.supplySourceRetryStateByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }

    const activeFarmCityLinkIds = new Set(
      computedFarmCitySupplyLines.map((supplyLine) => supplyLine.linkId),
    );
    for (const linkId of Array.from(this.state.farmCitySupplyLines.keys())) {
      if (activeFarmCityLinkIds.has(linkId)) {
        continue;
      }
      this.state.farmCitySupplyLines.delete(linkId);
      this.farmCitySupplySignatureByLinkId.delete(linkId);
    }
    for (const linkId of Array.from(this.farmCitySupplySignatureByLinkId.keys())) {
      if (activeFarmCityLinkIds.has(linkId)) {
        continue;
      }
      this.farmCitySupplySignatureByLinkId.delete(linkId);
    }
  }

  private pruneSupplyLinesForMissingUnits(): void {
    const activeUnitIds = new Set<string>(this.state.units.keys());
    for (const unitId of Array.from(this.state.supplyLines.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.state.supplyLines.delete(unitId);
      this.supplySignatureByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }

    for (const unitId of Array.from(this.supplySignatureByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.supplySignatureByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }

    for (const unitId of Array.from(this.supplySourceRetryStateByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.supplySourceRetryStateByUnitId.delete(unitId);
      this.blockedSupplyEndpointInfluenceTracker.deleteUnit(unitId);
    }
  }

  private updateUnitInteractions(deltaSeconds: number): Map<string, Set<string>> {
    this.applySupplyHealthEffects(deltaSeconds);
    const commanderCellsByTeam: Record<PlayerTeam, GridCoordinate[]> = {
      BLUE: [],
      RED: [],
    };
    for (const candidateUnit of this.state.units.values()) {
      if (
        candidateUnit.health <= 0 ||
        normalizeUnitType(candidateUnit.unitType) !== "COMMANDER"
      ) {
        continue;
      }

      const commanderTeam = this.normalizeTeam(candidateUnit.team);
      commanderCellsByTeam[commanderTeam].push(
        this.worldToGridCoordinate(candidateUnit.x, candidateUnit.y),
      );
    }

    const getCommanderAuraBonus = (unit: Unit): number => {
      const unitTeam = this.normalizeTeam(unit.team);
      const friendlyCommanderCells = commanderCellsByTeam[unitTeam];
      if (friendlyCommanderCells.length === 0) {
        return 0;
      }

      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      let commandersInRange = 0;
      for (const commanderCell of friendlyCommanderCells) {
        const colDelta = Math.abs(commanderCell.col - unitCell.col);
        const rowDelta = Math.abs(commanderCell.row - unitCell.row);
        if (
          colDelta <= BattleRoom.COMMANDER_MORALE_AURA_RADIUS_CELLS &&
          rowDelta <= BattleRoom.COMMANDER_MORALE_AURA_RADIUS_CELLS
        ) {
          commandersInRange += 1;
        }
      }

      return commandersInRange * BattleRoom.COMMANDER_MORALE_AURA_BONUS;
    };

    const getUnitMoraleScore = (unit: Unit): number => {
      const baseMoraleScore = getUnitMoraleScoreSystem({
        unit,
        moraleSampleRadius: BattleRoom.MORALE_SAMPLE_RADIUS,
        moraleMaxScore: BattleRoom.MORALE_MAX_SCORE,
        maxAbsInfluenceScore: BattleRoom.MAX_ABS_INFLUENCE_SCORE,
        gridWidth: this.state.influenceGrid.width,
        gridHeight: this.state.influenceGrid.height,
        worldToGridCoordinate: (x, y) => this.worldToGridCoordinate(x, y),
        getInfluenceScoreAtCell: (col, row) => this.getInfluenceScoreAtCell(col, row),
        getTerrainMoraleBonusAtCell: (cell) =>
          this.getTerrainMoraleBonusAtCell(cell),
      });
      const supplyLine = this.state.supplyLines.get(unit.unitId);
      if (supplyLine && !supplyLine.connected) {
        return 0;
      }
      const commanderAuraBonus = getCommanderAuraBonus(unit);
      const slopeMoraleDelta = this.getSlopeMoraleDelta(unit);
      const unitTeam = this.normalizeTeam(unit.team);
      const cityMoraleBonus = this.getCityMoraleBonusAtCell(
        this.worldToGridCoordinate(unit.x, unit.y),
        unitTeam,
      );
      return this.clamp(
        baseMoraleScore + commanderAuraBonus + slopeMoraleDelta + cityMoraleBonus,
        0,
        BattleRoom.MORALE_MAX_SCORE,
      );
    };

    this.applyCornerAttractionTowardDiagonalEnemies();

    const engagements = updateUnitInteractionsSystem({
      deltaSeconds,
      unitsById: this.state.units,
      movementStateByUnitId: this.movementStateByUnitId,
      gridContactDistance: BattleRoom.GRID_CONTACT_DISTANCE,
      unitForwardOffset: BattleRoom.UNIT_FORWARD_OFFSET,
      attackFacingAngleTolerance: BattleRoom.REFACE_ANGLE_THRESHOLD,
      ensureFiniteUnitState: (unit) => this.ensureFiniteUnitState(unit),
      updateUnitMoraleScores: (units) => {
        this.moraleStepPendingUnitIds.clear();
        const pendingUnitIds = this.updateUnitMoraleScoresStepped(
          units,
          getUnitMoraleScore,
          deltaSeconds,
        );
        for (const unitId of pendingUnitIds) {
          this.moraleStepPendingUnitIds.add(unitId);
        }
      },
      wasUnitEngagedLastTick: (unit) => this.engagedUnitIds.has(unit.unitId),
      shouldPauseCombatForUnit: (unit) =>
        this.moraleStepPendingUnitIds.has(unit.unitId),
      getMoraleAdvantageNormalized: (unit) =>
        getUnitMoraleAdvantageNormalized(
          unit,
          BattleRoom.MORALE_MAX_SCORE,
          getUnitMoraleScore,
        ),
      getUnitContactDps: (influenceAdvantage) =>
        getUnitContactDpsSystem(
          this.runtimeTuning.baseContactDps,
          influenceAdvantage,
          this.runtimeTuning.dpsInfluenceMultiplier,
        ),
      getUnitHealthMitigationMultiplier: (influenceAdvantage) =>
        getUnitHealthMitigationMultiplierSystem(
          influenceAdvantage,
          this.runtimeTuning.healthInfluenceMultiplier,
        ),
      wrapAngle: (angle) => BattleRoom.wrapAngle(angle),
      setUnitAttacking: (unit, isAttacking) => {
        if (unit.isAttacking === isAttacking) {
          return;
        }
        unit.isAttacking = isAttacking;
      },
    });

    this.engagedUnitIds.clear();
    for (const [unitId, engagedPeers] of engagements) {
      if (engagedPeers.size > 0) {
        this.engagedUnitIds.add(unitId);
      }
    }

    return engagements;
  }

  private applyCornerAttractionTowardDiagonalEnemies(): void {
    const liveUnits = Array.from(this.state.units.values()).filter((unit) => unit.health > 0);
    if (liveUnits.length <= 1) {
      return;
    }

    const unitCellByUnitId = new Map<string, GridCoordinate>();
    const occupiedCellIndexes = new Set<number>();
    for (const unit of liveUnits) {
      const cell = this.worldToGridCoordinate(unit.x, unit.y);
      unitCellByUnitId.set(unit.unitId, cell);
      occupiedCellIndexes.add(this.getGridCellIndex(cell.col, cell.row));
    }

    const assignAdvanceCellTowardDiagonalEnemy = (unit: Unit, enemy: Unit): void => {
      if (unit.team === enemy.team || this.engagedUnitIds.has(unit.unitId)) {
        return;
      }

      const movementState = this.getOrCreateMovementState(unit.unitId);
      if (
        movementState.isPaused ||
        movementState.destinationCell !== null ||
        movementState.queuedCells.length > 0
      ) {
        return;
      }

      const unitCell = unitCellByUnitId.get(unit.unitId);
      const enemyCell = unitCellByUnitId.get(enemy.unitId);
      if (!unitCell || !enemyCell) {
        return;
      }

      const colDelta = enemyCell.col - unitCell.col;
      const rowDelta = enemyCell.row - unitCell.row;
      if (Math.abs(colDelta) !== 1 || Math.abs(rowDelta) !== 1) {
        return;
      }

      const colStep = Math.sign(colDelta);
      const rowStep = Math.sign(rowDelta);
      const candidateAdvanceCells: GridCoordinate[] = [
        { col: unitCell.col + colStep, row: unitCell.row },
        { col: unitCell.col, row: unitCell.row + rowStep },
      ];
      const unitTeam = this.normalizeTeam(unit.team);

      for (const candidateCell of candidateAdvanceCells) {
        if (this.isCellImpassable(candidateCell)) {
          continue;
        }
        if (
          !isMoraleSafeStep({
            currentCell: unitCell,
            destinationCell: candidateCell,
            getTerrainMoraleBonusAtCell: (cell) =>
              this.getTerrainMoraleBonusAtCell(cell),
            getHillGradeAtCell: (cell) => this.getHillGradeAtCell(cell),
            getCityMoraleBonusAtCell: (cell) =>
              this.getCityMoraleBonusAtCell(cell, unitTeam),
          })
        ) {
          continue;
        }
        const candidateIndex = this.getGridCellIndex(
          candidateCell.col,
          candidateCell.row,
        );
        if (occupiedCellIndexes.has(candidateIndex)) {
          continue;
        }

        movementState.destinationCell = candidateCell;
        movementState.queuedCells = [];
        movementState.targetRotation = null;
        movementState.movementCommandMode = {
          ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE,
        };
        movementState.movementBudget = 0;
        occupiedCellIndexes.add(candidateIndex);
        return;
      }
    };

    for (let i = 0; i < liveUnits.length; i += 1) {
      const a = liveUnits[i];
      for (let j = i + 1; j < liveUnits.length; j += 1) {
        const b = liveUnits[j];
        if (a.team === b.team) {
          continue;
        }
        assignAdvanceCellTowardDiagonalEnemy(a, b);
        assignAdvanceCellTowardDiagonalEnemy(b, a);
      }
    }
  }

  private updateUnitMoraleScoresStepped(
    units: Unit[],
    getUnitMoraleScore: (unit: Unit) => number,
    deltaSeconds: number,
  ): Set<string> {
    const pendingUnitIds = new Set<string>();
    const activeUnitIds = new Set<string>();
    for (const unit of units) {
      activeUnitIds.add(unit.unitId);
    }
    for (const unitId of Array.from(this.moraleStepElapsedSecondsByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.moraleStepElapsedSecondsByUnitId.delete(unitId);
    }

    for (const unit of units) {
      const targetMoraleScore = getUnitMoraleScore(unit);
      if (!this.moraleStepElapsedSecondsByUnitId.has(unit.unitId)) {
        unit.moraleScore = targetMoraleScore;
        this.moraleStepElapsedSecondsByUnitId.set(unit.unitId, 0);
        continue;
      }

      const currentMoraleScore = Number.isFinite(unit.moraleScore)
        ? unit.moraleScore
        : targetMoraleScore;
      if (currentMoraleScore === targetMoraleScore) {
        this.moraleStepElapsedSecondsByUnitId.set(unit.unitId, 0);
        continue;
      }

      const elapsedSeconds =
        (this.moraleStepElapsedSecondsByUnitId.get(unit.unitId) ?? 0) +
        deltaSeconds;
      if (elapsedSeconds < BattleRoom.MORALE_STEP_INTERVAL_SECONDS) {
        this.moraleStepElapsedSecondsByUnitId.set(unit.unitId, elapsedSeconds);
        pendingUnitIds.add(unit.unitId);
        continue;
      }

      unit.moraleScore = targetMoraleScore;
      this.moraleStepElapsedSecondsByUnitId.set(
        unit.unitId,
        elapsedSeconds - BattleRoom.MORALE_STEP_INTERVAL_SECONDS,
      );
    }
    return pendingUnitIds;
  }

  private applySupplyHealthEffects(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    const healthGainPerSecond = Math.max(
      0,
      BattleRoom.SUPPLY_HEAL_PER_SECOND_WHEN_CONNECTED,
    );
    const healthGainPerTick = healthGainPerSecond * deltaSeconds;
    if (healthGainPerTick <= 0) {
      return;
    }

    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }

      const supplyLine = this.state.supplyLines.get(unit.unitId);
      if (!supplyLine || !supplyLine.connected) {
        continue;
      }

      const unitType = normalizeUnitType(unit.unitType);
      const maxUnitHealth = getUnitHealthMax(this.runtimeTuning.baseUnitHealth, unitType);
      unit.health = Math.min(maxUnitHealth, unit.health + healthGainPerTick);
    }
  }

  private updateCombatRotation(
    deltaSeconds: number,
    engagements: Map<string, Set<string>>,
  ): void {
    updateCombatRotationSystem({
      deltaSeconds,
      engagements,
      unitsById: this.state.units,
      unitForwardOffset: BattleRoom.UNIT_FORWARD_OFFSET,
      unitTurnSpeed: BattleRoom.UNIT_TURN_SPEED,
      wrapAngle: (angle) => BattleRoom.wrapAngle(angle),
    });
  }

  private getOwnedCityCount(team: PlayerTeam): number {
    let ownedCities = 0;
    if (this.getCityOwner("RED") === team) {
      ownedCities += 1;
    }
    if (this.getCityOwner("BLUE") === team) {
      ownedCities += 1;
    }
    for (let index = 0; index < this.neutralCityCells.length; index += 1) {
      if (this.getNeutralCityOwner(index) === team) {
        ownedCities += 1;
      }
    }
    return ownedCities;
  }

  private getBattleOutcome(): BattleEndedMessage | null {
    return this.battleLifecycleService.getBattleOutcome({
      matchPhase: this.matchPhase,
      units: this.state.units.values(),
      getOwnedCityCount: (team) => this.getOwnedCityCount(team),
    });
  }

  private concludeBattle(outcome: BattleEndedMessage): void {
    this.battleLifecycleService.concludeBattle({
      outcome,
      broadcastBattleEnded: (nextOutcome) => {
        this.broadcast(NETWORK_MESSAGE_TYPES.battleEnded, nextOutcome);
      },
      setMatchPhase: (nextPhase) => {
        this.matchPhase = nextPhase;
      },
      resetLobbyStateAfterBattle: () => {
        this.applyLobbyMapSelection(this.state.mapId, {
          incrementMapRevision: false,
          resetReadyStates: true,
        });
      },
      broadcastLobbyState: () => {
        this.broadcastLobbyState();
      },
      log: (message) => {
        console.log(message);
      },
    });
  }

  private getLobbyStateMessage(): LobbyStateMessage {
    const baseLobbyStateMessage = this.lobbyService.getLobbyStateMessage({
      phase: this.matchPhase,
      mapId: this.state.mapId,
      mapRevision: this.mapRevision,
      isGeneratingMap: this.isGeneratingMap,
    });

    if (!this.activeMapBundle) {
      return baseLobbyStateMessage;
    }

    return {
      ...baseLobbyStateMessage,
      cityAnchors: {
        RED: { ...this.activeMapBundle.cityAnchors.RED },
        BLUE: { ...this.activeMapBundle.cityAnchors.BLUE },
      },
      neutralCityAnchors: this.activeMapBundle.neutralCityAnchors.map((cell) => ({
        ...cell,
      })),
      redCityOwner: this.state.redCityOwner,
      blueCityOwner: this.state.blueCityOwner,
      neutralCityOwners: this.state.neutralCityOwners.map((owner) => owner),
    };
  }

  private broadcastLobbyState(): void {
    this.broadcast(NETWORK_MESSAGE_TYPES.lobbyState, this.getLobbyStateMessage());
  }

  private tryStartBattle(): void {
    if (!this.lobbyService.canStartBattle(this.matchPhase)) {
      return;
    }

    this.resetCityGenerationTimersForAllSources();
    this.updateSupplyLines();
    this.matchPhase = "BATTLE";
    this.broadcastLobbyState();
    console.log("Battle started: all lobby players ready.");
  }
}
