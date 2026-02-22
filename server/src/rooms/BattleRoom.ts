import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { GridCellState } from "../schema/GridCellState.js";
import { SupplyLineState } from "../schema/SupplyLineState.js";
import { Unit } from "../schema/Unit.js";
import { InfluenceGridSystem } from "../systems/InfluenceGridSystem.js";
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
  syncCityGenerationTimers as syncCityGenerationTimersSystem,
  updateCityUnitGeneration as updateCityUnitGenerationSystem,
} from "../systems/cities/CitySpawnSystem.js";
import { buildCityInfluenceSources } from "../systems/cities/CityInfluenceSourceSync.js";
import {
  updateCityOwnershipFromOccupancy as updateCityOwnershipFromOccupancySystem,
} from "../systems/cities/CityControlSystem.js";
import {
  buildTerrainAwareRoute,
  normalizePathWaypoints,
} from "../systems/movement/MovementCommandRouter.js";
import { simulateMovementTick } from "../systems/movement/MovementSimulation.js";
import {
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
import { MapGenerationService } from "./services/MapGenerationService.js";
import {
  MapRuntimeService,
  type LoadActiveMapBundleResult,
} from "./services/MapRuntimeService.js";
import { NETWORK_MESSAGE_TYPES } from "../../../shared/src/networkContracts.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import type { MapBundle } from "../../../shared/src/mapBundle.js";
import { getGridCellPaletteElevationByte } from "../../../shared/src/terrainPaletteElevation.js";
import {
  getGridCellTerrainType,
  getNeutralCityGridCoordinates,
  getTeamCityGridCoordinate,
  type TerrainType,
} from "../../../shared/src/terrainGrid.js";
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
  UnitToggleMovementPauseMessage,
  UnitMovementState,
  UnitPathMessage,
  UnitPathStateMessage,
  Vector2,
} from "./BattleRoomTypes.js";

export class BattleRoom extends Room<BattleState> {
  private readonly lobbyService = new LobbyService(
    GAMEPLAY_CONFIG.map.availableMapIds,
  );
  private readonly battleLifecycleService = new BattleLifecycleService();
  private readonly mapGenerationService = new MapGenerationService();
  private readonly mapRuntimeService = new MapRuntimeService();
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();
  private readonly lastBroadcastPathSignatureByUnitId = new Map<string, string>();
  private readonly supplySignatureByUnitId = new Map<string, string>();
  private readonly supplySourceRetryStateByUnitId = new Map<
    string,
    SupplySourceRetryState
  >();
  private readonly moraleStepElapsedSecondsByUnitId = new Map<string, number>();
  private readonly engagedUnitIds = new Set<string>();
  private readonly influenceGridSystem = new InfluenceGridSystem();
  private neutralCityCells: GridCoordinate[] = [];
  private matchPhase: MatchPhase = "LOBBY";
  private mapRevision = 0;
  private isGeneratingMap = false;
  private simulationFrame = 0;
  private readonly cityGenerationElapsedSecondsBySourceId = new Map<
    string,
    number
  >();
  private generatedUnitSequenceByTeam: Record<PlayerTeam, number> = {
    BLUE: 1,
    RED: 1,
  };
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
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
  private static readonly GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
  private static readonly GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;
  private static readonly CELL_WIDTH =
    GAMEPLAY_CONFIG.map.width / BattleRoom.GRID_WIDTH;
  private static readonly CELL_HEIGHT =
    GAMEPLAY_CONFIG.map.height / BattleRoom.GRID_HEIGHT;
  private static readonly GRID_CONTACT_DISTANCE =
    Math.hypot(BattleRoom.CELL_WIDTH, BattleRoom.CELL_HEIGHT) * 1.05;
  private static readonly MORALE_SAMPLE_RADIUS = 1;
  private static readonly MORALE_MAX_SCORE = 9;
  private static readonly MAX_ABS_INFLUENCE_SCORE = Math.max(
    1,
    GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
  );
  private static readonly MORALE_STEP_INTERVAL_SECONDS = 3;
  // Radius 2 in each axis yields a 5x5 commander aura area.
  private static readonly COMMANDER_MORALE_AURA_RADIUS_CELLS = 2;
  private static readonly COMMANDER_MORALE_AURA_BONUS = 1;
  private static readonly SLOPE_MORALE_DOT_EQUIVALENT = 1;
  private static readonly SUPPLY_HEAL_PER_SECOND_WHEN_CONNECTED = 1;
  private static readonly SUPPLY_BLOCKED_SOURCE_RETRY_INTERVAL_MS =
    Number.isFinite(GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds) &&
    GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds > 0
      ? GAMEPLAY_CONFIG.supply.blockedSourceRetryIntervalSeconds * 1000
      : 3000;
  private static readonly CITY_SPAWN_SEARCH_RADIUS = 4;
  private static readonly RUNTIME_WATER_ELEVATION_MAX = 28;
  private static readonly RUNTIME_MOUNTAIN_ELEVATION_MIN = 218;

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.state.mapId = this.lobbyService.getValidatedMapId(this.state.mapId);
    this.ensureStartupRuntimeGeneratedMap(this.state.mapId);
    this.mapRuntimeService.applyMapIdToRuntimeTerrain(this.state.mapId);
    this.loadActiveMapBundle(this.state.mapId, this.mapRevision);
    this.neutralCityCells = this.mapRuntimeService.resolveNeutralCityCells(
      this.activeMapBundle,
      getNeutralCityGridCoordinates(),
    );
    this.mapRuntimeService.initializeNeutralCityOwnership(
      this.state.neutralCityOwners,
      this.neutralCityCells.length,
    );
    this.resetCityUnitGenerationState();
    this.influenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.syncCityInfluenceSources();
    this.spawnTestUnits();
    this.updateInfluenceGrid(true);
    this.updateSupplyLines();

    this.setSimulationInterval((deltaMs) => {
      if (this.matchPhase !== "BATTLE") {
        return;
      }
      const deltaSeconds = deltaMs / 1000;
      this.simulationFrame += 1;
      this.updateMovement(deltaSeconds);
      const cityOwnershipChanged = this.updateCityOwnershipFromOccupancy();
      if (cityOwnershipChanged) {
        this.syncCityInfluenceSources();
      }
      const generatedCityUnits = this.updateCityUnitGeneration(deltaSeconds);
      this.updateSupplyLines();
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
      return "";
    }

    return cells.map((cell) => `${cell.col},${cell.row}`).join(";");
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

  private buildUnitPathStateMessage(unitId: string): UnitPathStateMessage {
    const movementState = this.movementStateByUnitId.get(unitId);
    if (!movementState) {
      return { unitId, path: [] };
    }

    const pathCells: GridCoordinate[] = [];
    if (movementState.destinationCell) {
      pathCells.push(movementState.destinationCell);
    }
    pathCells.push(...movementState.queuedCells);

    return {
      unitId,
      path: pathCells.map((cell) => this.gridToWorldCenter(cell)),
    };
  }

  private syncUnitPathState(unitId: string): void {
    const movementState = this.movementStateByUnitId.get(unitId);
    if (!movementState) {
      this.lastBroadcastPathSignatureByUnitId.delete(unitId);
      return;
    }

    const nextSignature = this.buildPathSignature(movementState);
    const previousSignature = this.lastBroadcastPathSignatureByUnitId.get(unitId);
    if (previousSignature === nextSignature) {
      return;
    }

    this.lastBroadcastPathSignatureByUnitId.set(unitId, nextSignature);
    this.broadcast(
      NETWORK_MESSAGE_TYPES.unitPathState,
      this.buildUnitPathStateMessage(unitId),
    );
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
    for (const [unitId, movementState] of this.movementStateByUnitId) {
      const signature = this.buildPathSignature(movementState);
      if (signature.length === 0) {
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
    if (terrainCode === "w") {
      return "water";
    }
    if (terrainCode === "g") {
      return "grass";
    }
    if (terrainCode === "f") {
      return "forest";
    }
    if (terrainCode === "h") {
      return "hills";
    }
    if (terrainCode === "m") {
      return "mountains";
    }
    return null;
  }

  private getMapBundleElevationByteAtCell(
    cell: GridCoordinate,
  ): number | null {
    const elevationBytes = this.activeMapBundle?.elevationBytes;
    if (!elevationBytes) {
      return null;
    }
    const index = this.getGridCellIndex(cell.col, cell.row);
    if (index < 0 || index >= elevationBytes.length) {
      return null;
    }
    const byte = elevationBytes[index];
    return Number.isFinite(byte) ? byte : null;
  }

  private getElevationByteAtCell(cell: GridCoordinate): number {
    const runtimeElevationByte = this.getMapBundleElevationByteAtCell(cell);
    if (runtimeElevationByte !== null) {
      return runtimeElevationByte;
    }
    return getGridCellPaletteElevationByte(cell.col, cell.row);
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
      waterElevationMax: BattleRoom.RUNTIME_WATER_ELEVATION_MAX,
      mountainElevationMin: BattleRoom.RUNTIME_MOUNTAIN_ELEVATION_MIN,
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

    if (this.activeMapBundle?.source === "runtime-sidecar") {
      return this.activeMapBundle.impassableCellIndexSet.has(
        this.getGridCellIndex(cell.col, cell.row),
      );
    }

    return this.getTerrainTypeAtCell(cell) === "mountains";
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

    if (this.activeMapBundle?.source === "runtime-sidecar") {
      return this.activeMapBundle.blockedSpawnCellIndexSet.has(
        this.getGridCellIndex(cell.col, cell.row),
      );
    }

    const terrainType = this.getTerrainTypeAtCell(cell);
    return terrainType === "mountains" || terrainType === "water";
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
    const grid = this.state.influenceGrid;
    const index = row * grid.width + col;
    const value = grid.cells[index];
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
    return getGridCellTerrainType(cell.col, cell.row);
  }

  private getTerrainSpeedMultiplierAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    return BattleRoom.TERRAIN_SPEED_MULTIPLIER[terrainType] ?? 1.0;
  }

  private getTerrainMoraleBonusAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    return BattleRoom.TERRAIN_MORALE_BONUS[terrainType] ?? 0;
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
    const currentElevationByte = this.getElevationByteAtCell(currentCell);
    const forwardElevationByte = this.getElevationByteAtCell(forwardCell);
    const elevationDeltaBytes = forwardElevationByte - currentElevationByte;
    const moralePerInfluenceDot =
      BattleRoom.MORALE_MAX_SCORE /
      Math.max(
        1,
        (BattleRoom.MORALE_SAMPLE_RADIUS * 2 + 1) *
          (BattleRoom.MORALE_SAMPLE_RADIUS * 2 + 1),
      );
    if (elevationDeltaBytes > 0) {
      return -moralePerInfluenceDot * BattleRoom.SLOPE_MORALE_DOT_EQUIVALENT;
    }
    if (elevationDeltaBytes < 0) {
      return moralePerInfluenceDot * BattleRoom.SLOPE_MORALE_DOT_EQUIVALENT;
    }
    return 0;
  }

  private updateInfluenceGrid(force = false): void {
    const influenceUpdateIntervalFrames = Math.max(
      1,
      Math.round(this.runtimeTuning.influenceUpdateIntervalFrames),
    );
    if (!force && this.simulationFrame % influenceUpdateIntervalFrames !== 0) {
      return;
    }

    this.influenceGridSystem.writeInfluenceScores(
      this.state.influenceGrid,
      this.state.units.values(),
    );
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

  private getOccupyingTeamAtCell(targetCell: GridCoordinate): PlayerTeam | null {
    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }
      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      if (unitCell.col !== targetCell.col || unitCell.row !== targetCell.row) {
        continue;
      }
      return this.normalizeTeam(unit.team);
    }

    return null;
  }

  private updateCityOwnershipFromOccupancy(): boolean {
    return updateCityOwnershipFromOccupancySystem({
      getOccupyingTeamAtCell: (targetCell) => this.getOccupyingTeamAtCell(targetCell),
      getCityCell: (homeCity) => this.getCityCell(homeCity),
      getCityOwner: (homeCity) => this.getCityOwner(homeCity),
      setCityOwner: (homeCity, owner) => this.setCityOwner(homeCity, owner),
      neutralCityCount: this.neutralCityCells.length,
      getNeutralCityCell: (index) => this.getNeutralCityCell(index),
      getNeutralCityOwner: (index) => this.getNeutralCityOwner(index),
      setNeutralCityOwner: (index, owner) => this.setNeutralCityOwner(index, owner),
    });
  }

  private resetCityUnitGenerationState(): void {
    this.cityGenerationElapsedSecondsBySourceId.clear();
    this.syncCityGenerationTimers();
    this.generatedUnitSequenceByTeam = {
      BLUE: 1,
      RED: 1,
    };
  }

  private resetCityGenerationTimersForAllSources(): void {
    this.cityGenerationElapsedSecondsBySourceId.clear();
    this.syncCityGenerationTimers();
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

  private syncCityGenerationTimers(): void {
    syncCityGenerationTimersSystem(
      this.cityGenerationElapsedSecondsBySourceId,
      this.getCitySpawnSources(),
    );
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
    this.syncCityGenerationTimers();
    return updateCityUnitGenerationSystem({
      deltaSeconds,
      generationIntervalSeconds,
      cityGenerationElapsedSecondsBySourceId:
        this.cityGenerationElapsedSecondsBySourceId,
      spawnSources: this.getCitySpawnSources(),
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

    const staticSources = buildCityInfluenceSources({
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

    this.influenceGridSystem.setStaticInfluenceSources(staticSources);
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

    const generationMethod = this.mapGenerationService.normalizeGenerationMethod(
      message?.method,
    );
    const mapId = this.lobbyService.getGeneratedMapId();
    const seed = `lobby-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    this.isGeneratingMap = true;
    this.broadcastLobbyState();

    try {
      const generated = this.mapGenerationService.generateRuntimeMap({
        mapId,
        method: generationMethod,
        seed,
        contextLabel: "lobby",
        roomModuleUrl: import.meta.url,
      });
      if (!generated.ok) {
        this.logMapGenerationFailure("lobby", mapId, generated);
        return;
      }

      this.lobbyService.addAvailableMapId(mapId);
      this.applyLobbyMapSelection(mapId);
      console.log(
        `Generated new lobby map: ${mapId} (seed ${seed}, method ${generationMethod})`,
      );
    } finally {
      this.isGeneratingMap = false;
      this.broadcastLobbyState();
    }
  }

  private ensureStartupRuntimeGeneratedMap(mapId: string): void {
    if (!mapId.startsWith("runtime-generated-")) {
      return;
    }

    const seed = `startup-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const generated = this.mapGenerationService.generateRuntimeMap({
      mapId,
      method: "auto",
      seed,
      contextLabel: "startup",
      roomModuleUrl: import.meta.url,
    });
    if (!generated.ok) {
      console.error(
        `Failed to generate startup runtime map "${mapId}" (reason ${generated.reason}). Continuing with existing artifacts if available.`,
      );
      this.logMapGenerationFailure("startup", mapId, generated);
    }
  }

  private logMapGenerationFailure(
    contextLabel: string,
    mapId: string,
    failure: {
      reason: string;
      message: string;
      stderr?: string;
      stdout?: string;
      exitStatus?: number;
    },
  ): void {
    const statusSuffix =
      typeof failure.exitStatus === "number" ? ` status=${failure.exitStatus}` : "";
    console.error(
      `[map-generation][${failure.reason}] context=${contextLabel} mapId=${mapId}${statusSuffix} ${failure.message}`,
    );
    if (failure.stderr) {
      console.error(failure.stderr);
    }
    if (failure.stdout) {
      console.error(failure.stdout);
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
    this.supplySignatureByUnitId.clear();
    this.supplySourceRetryStateByUnitId.clear();
  }

  private clearUnits(): void {
    for (const unitId of Array.from(this.state.units.keys())) {
      this.state.units.delete(unitId);
    }
    this.clearSupplyLineState();
    this.moraleStepElapsedSecondsByUnitId.clear();
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
      waterElevationMax: BattleRoom.RUNTIME_WATER_ELEVATION_MAX,
      mountainElevationMin: BattleRoom.RUNTIME_MOUNTAIN_ELEVATION_MIN,
    });
    this.state.mapId = mapId;
    this.applyLoadedMapBundle(mapId, switchResult);
    this.neutralCityCells = switchResult.neutralCityAnchors;
    this.state.redCityOwner = "RED";
    this.state.blueCityOwner = "BLUE";
    this.mapRuntimeService.resetNeutralCityOwnership(
      this.state.neutralCityOwners,
      this.neutralCityCells.length,
    );
    this.resetCityUnitGenerationState();
    if (resetReadyStates) {
      this.lobbyService.resetLobbyReadyStates();
    }
    this.clearUnits();
    this.syncCityInfluenceSources();
    this.spawnTestUnits();
    this.mapRuntimeService.clearInfluenceGrid(this.state.influenceGrid);
    this.updateInfluenceGrid(true);
    this.updateSupplyLines();
    this.simulationFrame = 0;
    this.mapRevision = switchResult.nextMapRevision;
  }

  private spawnTestUnits(): void {
    const redSpawn = this.getCityWorldPosition("RED");
    const blueSpawn = this.getCityWorldPosition("BLUE");
    const axisX = blueSpawn.x - redSpawn.x;
    const axisY = blueSpawn.y - redSpawn.y;
    const axisLength = Math.hypot(axisX, axisY);
    const redForwardX = axisLength > 0.0001 ? axisX / axisLength : 1;
    const redForwardY = axisLength > 0.0001 ? axisY / axisLength : 0;
    const blueForwardX = -redForwardX;
    const blueForwardY = -redForwardY;
    const lateralX = -redForwardY;
    const lateralY = redForwardX;
    const redRotation =
      Math.atan2(redForwardY, redForwardX) - BattleRoom.UNIT_FORWARD_OFFSET;
    const blueRotation =
      Math.atan2(blueForwardY, blueForwardX) - BattleRoom.UNIT_FORWARD_OFFSET;
    const battleLineCenterX = (redSpawn.x + blueSpawn.x) * 0.5;
    const battleLineCenterY = (redSpawn.y + blueSpawn.y) * 0.5;
    const blockSize = Math.min(BattleRoom.CELL_WIDTH, BattleRoom.CELL_HEIGHT);
    const oneBlockBackOffset = blockSize * 2;
    const spacingAcross = Math.max(1, blockSize);
    const redLineX = battleLineCenterX - redForwardX * oneBlockBackOffset;
    const redLineY = battleLineCenterY - redForwardY * oneBlockBackOffset;
    const blueLineX = battleLineCenterX - blueForwardX * oneBlockBackOffset;
    const blueLineY = battleLineCenterY - blueForwardY * oneBlockBackOffset;
    const mapMinX = BattleRoom.CELL_WIDTH * 0.5;
    const mapMaxX = GAMEPLAY_CONFIG.map.width - BattleRoom.CELL_WIDTH * 0.5;
    const mapMinY = BattleRoom.CELL_HEIGHT * 0.5;
    const mapMaxY = GAMEPLAY_CONFIG.map.height - BattleRoom.CELL_HEIGHT * 0.5;
    const resolveLineInterval = (
      origin: number,
      direction: number,
      min: number,
      max: number,
    ): { min: number; max: number } | null => {
      if (Math.abs(direction) <= 0.0001) {
        if (origin < min || origin > max) {
          return null;
        }

        return {
          min: Number.NEGATIVE_INFINITY,
          max: Number.POSITIVE_INFINITY,
        };
      }

      const intervalA = (min - origin) / direction;
      const intervalB = (max - origin) / direction;
      return {
        min: Math.min(intervalA, intervalB),
        max: Math.max(intervalA, intervalB),
      };
    };
    const xInterval = resolveLineInterval(
      battleLineCenterX,
      lateralX,
      mapMinX,
      mapMaxX,
    );
    const yInterval = resolveLineInterval(
      battleLineCenterY,
      lateralY,
      mapMinY,
      mapMaxY,
    );
    if (!xInterval || !yInterval) {
      return;
    }
    const minAcrossOffset = Math.max(xInterval.min, yInterval.min);
    const maxAcrossOffset = Math.min(xInterval.max, yInterval.max);
    if (
      !Number.isFinite(minAcrossOffset) ||
      !Number.isFinite(maxAcrossOffset) ||
      minAcrossOffset > maxAcrossOffset
    ) {
      return;
    }
    const lineLengthAcross = maxAcrossOffset - minAcrossOffset;
    const unitsPerSide = Math.max(1, Math.floor(lineLengthAcross / spacingAcross) + 1);
    const usedAcrossLength = (unitsPerSide - 1) * spacingAcross;
    const centeredAcrossStart =
      (minAcrossOffset + maxAcrossOffset - usedAcrossLength) * 0.5;

    const redSpawnCandidates: Vector2[] = [];
    const blueSpawnCandidates: Vector2[] = [];

    for (let i = 0; i < unitsPerSide; i += 1) {
      const acrossOffset = centeredAcrossStart + i * spacingAcross;
      const redCell = this.worldToGridCoordinate(
        redLineX + lateralX * acrossOffset,
        redLineY + lateralY * acrossOffset,
      );
      if (!this.isBlockedSpawnCell(redCell)) {
        redSpawnCandidates.push(this.gridToWorldCenter(redCell));
      }

      const blueCell = this.worldToGridCoordinate(
        blueLineX + lateralX * acrossOffset,
        blueLineY + lateralY * acrossOffset,
      );
      if (!this.isBlockedSpawnCell(blueCell)) {
        blueSpawnCandidates.push(this.gridToWorldCenter(blueCell));
      }
    }

    const mirroredUnitsPerSide = Math.min(
      redSpawnCandidates.length,
      blueSpawnCandidates.length,
    );

    const commanderHealth = getUnitHealthMax(
      this.runtimeTuning.baseUnitHealth,
      "COMMANDER",
    );
    const redCommanderSpawnCell =
      this.findOpenSpawnCellNearCity(this.getCityCell("RED")) ?? this.getCityCell("RED");
    const blueCommanderSpawnCell =
      this.findOpenSpawnCellNearCity(this.getCityCell("BLUE")) ?? this.getCityCell("BLUE");
    const redCommanderSpawn = this.gridToWorldCenter(redCommanderSpawnCell);
    const blueCommanderSpawn = this.gridToWorldCenter(blueCommanderSpawnCell);
    const redCommander = new Unit(
      "red-commander",
      "red",
      redCommanderSpawn.x,
      redCommanderSpawn.y,
      redRotation,
      commanderHealth,
      "COMMANDER",
    );
    const blueCommander = new Unit(
      "blue-commander",
      "blue",
      blueCommanderSpawn.x,
      blueCommanderSpawn.y,
      blueRotation,
      commanderHealth,
      "COMMANDER",
    );
    this.state.units.set(redCommander.unitId, redCommander);
    this.state.units.set(blueCommander.unitId, blueCommander);
    this.movementStateByUnitId.set(
      redCommander.unitId,
      this.createMovementState(),
    );
    this.movementStateByUnitId.set(
      blueCommander.unitId,
      this.createMovementState(),
    );

    for (let i = 0; i < mirroredUnitsPerSide; i += 1) {
      const redPosition = redSpawnCandidates[i];
      const bluePosition = blueSpawnCandidates[i];

      const redUnit = new Unit(
        `red-${i + 1}`,
        "red",
        redPosition.x,
        redPosition.y,
        redRotation,
        this.runtimeTuning.baseUnitHealth,
        DEFAULT_UNIT_TYPE,
      );
      const blueUnit = new Unit(
        `blue-${i + 1}`,
        "blue",
        bluePosition.x,
        bluePosition.y,
        blueRotation,
        this.runtimeTuning.baseUnitHealth,
        DEFAULT_UNIT_TYPE,
      );

      this.state.units.set(redUnit.unitId, redUnit);
      this.state.units.set(blueUnit.unitId, blueUnit);
      this.movementStateByUnitId.set(redUnit.unitId, this.createMovementState());
      this.movementStateByUnitId.set(blueUnit.unitId, this.createMovementState());
    }
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
    const route = buildTerrainAwareRoute(
      unitCell,
      normalizedPath,
      (x, y) => this.worldToGridCoordinate(x, y),
      (cell) => this.isCellImpassable(cell),
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
    const { supplyLinesByUnitId: computedSupplyLines, retryStateByUnitId } =
      computeSupplyLinesForUnits({
        units: this.state.units.values(),
        worldToGridCoordinate: (x, y) => this.worldToGridCoordinate(x, y),
        getTeamCityCell: (team) => this.getCityCell(team),
        redCityOwner: this.state.redCityOwner,
        blueCityOwner: this.state.blueCityOwner,
        neutralCityOwners: this.state.neutralCityOwners,
        neutralCityCells: this.neutralCityCells,
        getInfluenceScoreAtCell: (col, row) => this.getInfluenceScoreAtCell(col, row),
        isCellImpassable: (cell) => this.isCellImpassable(cell),
        enemyInfluenceSeverThreshold:
          GAMEPLAY_CONFIG.supply.enemyInfluenceSeverThreshold,
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

    const activeSupplyUnitIds = new Set(computedSupplyLines.keys());
    for (const unitId of Array.from(this.state.supplyLines.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.state.supplyLines.delete(unitId);
      this.supplySignatureByUnitId.delete(unitId);
    }

    for (const unitId of Array.from(this.supplySignatureByUnitId.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.supplySignatureByUnitId.delete(unitId);
    }

    for (const unitId of Array.from(this.supplySourceRetryStateByUnitId.keys())) {
      if (activeSupplyUnitIds.has(unitId)) {
        continue;
      }
      this.supplySourceRetryStateByUnitId.delete(unitId);
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
    }

    for (const unitId of Array.from(this.supplySignatureByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.supplySignatureByUnitId.delete(unitId);
    }

    for (const unitId of Array.from(this.supplySourceRetryStateByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.supplySourceRetryStateByUnitId.delete(unitId);
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
        moraleInfluenceCurveExponent: this.runtimeTuning.moraleInfluenceCurveExponent,
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
      return this.clamp(
        baseMoraleScore + commanderAuraBonus + slopeMoraleDelta,
        0,
        BattleRoom.MORALE_MAX_SCORE,
      );
    };

    const engagements = updateUnitInteractionsSystem({
      deltaSeconds,
      unitsById: this.state.units,
      movementStateByUnitId: this.movementStateByUnitId,
      gridContactDistance: BattleRoom.GRID_CONTACT_DISTANCE,
      ensureFiniteUnitState: (unit) => this.ensureFiniteUnitState(unit),
      updateUnitMoraleScores: (units) =>
        this.updateUnitMoraleScoresStepped(units, getUnitMoraleScore, deltaSeconds),
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
    });

    this.engagedUnitIds.clear();
    for (const [unitId, engagedPeers] of engagements) {
      if (engagedPeers.size > 0) {
        this.engagedUnitIds.add(unitId);
      }
    }

    return engagements;
  }

  private updateUnitMoraleScoresStepped(
    units: Unit[],
    getUnitMoraleScore: (unit: Unit) => number,
    deltaSeconds: number,
  ): void {
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
        continue;
      }

      unit.moraleScore = targetMoraleScore;
      this.moraleStepElapsedSecondsByUnitId.set(
        unit.unitId,
        elapsedSeconds - BattleRoom.MORALE_STEP_INTERVAL_SECONDS,
      );
    }
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
