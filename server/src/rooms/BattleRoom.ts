import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
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
import { isTerrainBlocked } from "../systems/movement/gridPathing.js";
import {
  buildTerrainAwareRoute,
  normalizePathWaypoints,
} from "../systems/movement/MovementCommandRouter.js";
import { simulateMovementTick } from "../systems/movement/MovementSimulation.js";
import {
  getUnitMoraleAdvantageNormalized,
  getUnitMoraleScore as getUnitMoraleScoreSystem,
  updateUnitMoraleScores as updateUnitMoraleScoresSystem,
} from "../systems/morale/MoraleSystem.js";
import {
  getUnitContactDps as getUnitContactDpsSystem,
  getUnitHealthMitigationMultiplier as getUnitHealthMitigationMultiplierSystem,
} from "../systems/morale/moraleMath.js";
import { LobbyService } from "./services/LobbyService.js";
import { BattleLifecycleService } from "./services/BattleLifecycleService.js";
import { NETWORK_MESSAGE_TYPES } from "../../../shared/src/networkContracts.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
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
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();
  private readonly lastBroadcastPathSignatureByUnitId = new Map<string, string>();
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
  private static readonly TERRAIN_SPEED_MULTIPLIER: Record<TerrainType, number> =
    GAMEPLAY_CONFIG.terrain.movementMultiplierByType;
  private static readonly TERRAIN_MORALE_MULTIPLIER: Record<TerrainType, number> =
    GAMEPLAY_CONFIG.terrain.moraleMultiplierByType;
  private static readonly GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
  private static readonly GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;
  private static readonly CELL_WIDTH =
    GAMEPLAY_CONFIG.map.width / BattleRoom.GRID_WIDTH;
  private static readonly CELL_HEIGHT =
    GAMEPLAY_CONFIG.map.height / BattleRoom.GRID_HEIGHT;
  private static readonly GRID_CONTACT_DISTANCE =
    Math.max(BattleRoom.CELL_WIDTH, BattleRoom.CELL_HEIGHT) * 1.05;
  private static readonly MORALE_SAMPLE_RADIUS = 1;
  private static readonly MORALE_MAX_SCORE = 100;
  private static readonly CITY_SPAWN_SEARCH_RADIUS = 4;

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.state.mapId = this.lobbyService.getValidatedMapId(this.state.mapId);
    this.applyMapIdToRuntimeTerrain(this.state.mapId);
    this.refreshNeutralCityCells();
    this.initializeNeutralCityOwnership();
    this.resetCityUnitGenerationState();
    this.influenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.syncCityInfluenceSources();
    this.spawnTestUnits();
    this.updateInfluenceGrid(true);

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
      const preGenerationBattleOutcome = this.getBattleOutcome();
      if (preGenerationBattleOutcome) {
        this.concludeBattle(preGenerationBattleOutcome);
        return;
      }
      const generatedCityUnits = this.updateCityUnitGeneration(deltaSeconds);
      const engagements = this.updateUnitInteractions(deltaSeconds);
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
      (client, _message: LobbyGenerateMapMessage) => {
        this.handleLobbyGenerateMapMessage(client);
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
    return getGridCellTerrainType(cell.col, cell.row);
  }

  private getTerrainSpeedMultiplierAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    return BattleRoom.TERRAIN_SPEED_MULTIPLIER[terrainType] ?? 1.0;
  }

  private getTerrainMoraleMultiplierAtCell(cell: GridCoordinate): number {
    const terrainType = this.getTerrainTypeAtCell(cell);
    return BattleRoom.TERRAIN_MORALE_MULTIPLIER[terrainType] ?? 1.0;
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

  private initializeNeutralCityOwnership(): void {
    for (let index = 0; index < this.neutralCityCells.length; index += 1) {
      this.state.neutralCityOwners.push("NEUTRAL");
    }
  }

  private getCityWorldPosition(team: PlayerTeam): Vector2 {
    const cityCell = getTeamCityGridCoordinate(team);
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
    if (isTerrainBlocked(targetCell)) {
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

  private handleLobbyGenerateMapMessage(client: Client): void {
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
    const sharedDir = this.resolveSharedDirectory();
    if (!sharedDir) {
      console.error("Could not resolve shared directory for map generation.");
      return;
    }

    const generatorScriptPath = path.join(
      sharedDir,
      "scripts",
      "generate-random-map.mjs",
    );
    if (!existsSync(generatorScriptPath)) {
      console.error(`Map generator script not found: ${generatorScriptPath}`);
      return;
    }

    const seed = `lobby-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    this.isGeneratingMap = true;
    this.broadcastLobbyState();

    try {
      const commandResult = spawnSync(
        process.execPath,
        [
          generatorScriptPath,
          "--map-id",
          mapId,
          "--seed",
          seed,
          "--output-dir",
          sharedDir,
        ],
        {
          cwd: sharedDir,
          encoding: "utf8",
        },
      );

      if (commandResult.status !== 0) {
        const stderr = (commandResult.stderr ?? "").trim();
        const stdout = (commandResult.stdout ?? "").trim();
        console.error(
          `Map generation failed (status ${commandResult.status ?? "unknown"}).`,
        );
        if (stderr.length > 0) {
          console.error(stderr);
        }
        if (stdout.length > 0) {
          console.error(stdout);
        }
        return;
      }

      this.lobbyService.addAvailableMapId(mapId);
      this.applyLobbyMapSelection(mapId);
      console.log(`Generated new lobby map: ${mapId} (seed ${seed})`);
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
    const safeNextBase = Math.max(1, nextBaseUnitHealth);
    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }

      const healthRatio = this.clamp(unit.health / safePreviousBase, 0, 1);
      unit.health = healthRatio * safeNextBase;
    }
  }

  private applyMapIdToRuntimeTerrain(mapId: string): void {
    (
      GAMEPLAY_CONFIG.map as unknown as {
        activeMapId: string;
      }
    ).activeMapId = mapId;
  }

  private refreshNeutralCityCells(): void {
    this.neutralCityCells = getNeutralCityGridCoordinates();
  }

  private clearUnits(): void {
    for (const unitId of Array.from(this.state.units.keys())) {
      this.state.units.delete(unitId);
    }
    this.movementStateByUnitId.clear();
    this.lastBroadcastPathSignatureByUnitId.clear();
    this.engagedUnitIds.clear();
  }

  private clearInfluenceGrid(): void {
    const grid = this.state.influenceGrid;
    for (let i = 0; i < grid.cells.length; i += 1) {
      grid.cells[i] = 0;
    }
    grid.revision += 1;
  }

  private resetNeutralCityOwnership(): void {
    while (this.state.neutralCityOwners.length > 0) {
      this.state.neutralCityOwners.pop();
    }
    this.initializeNeutralCityOwnership();
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
    this.state.mapId = mapId;
    this.applyMapIdToRuntimeTerrain(mapId);
    this.refreshNeutralCityCells();
    this.state.redCityOwner = "RED";
    this.state.blueCityOwner = "BLUE";
    this.resetNeutralCityOwnership();
    this.resetCityUnitGenerationState();
    if (resetReadyStates) {
      this.lobbyService.resetLobbyReadyStates();
    }
    this.clearUnits();
    this.syncCityInfluenceSources();
    this.spawnTestUnits();
    this.clearInfluenceGrid();
    this.updateInfluenceGrid(true);
    this.simulationFrame = 0;
    if (incrementMapRevision) {
      this.mapRevision += 1;
    }
  }

  private resolveSharedDirectory(): string | null {
    const roomDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(process.cwd(), "../shared"),
      path.resolve(process.cwd(), "shared"),
      path.resolve(roomDir, "../../../shared"),
      path.resolve(roomDir, "../../../../shared"),
      path.resolve(roomDir, "../../../../../shared"),
      path.resolve(roomDir, "../../../../../../shared"),
    ];

    for (const candidate of candidates) {
      const generatorScriptPath = path.join(
        candidate,
        "scripts",
        "generate-random-map.mjs",
      );
      if (existsSync(generatorScriptPath)) {
        return candidate;
      }
    }

    return null;
  }

  private spawnTestUnits(): void {
    const redSpawn = this.getCityWorldPosition("RED");
    const blueSpawn = this.getCityWorldPosition("BLUE");
    const unitsPerSide = GAMEPLAY_CONFIG.spawn.unitsPerSide;
    const lineWidth = Math.max(1, GAMEPLAY_CONFIG.spawn.lineWidth);
    const spacingAcross = GAMEPLAY_CONFIG.spawn.spacingAcross;
    const spacingDepth = GAMEPLAY_CONFIG.spawn.spacingDepth;
    const centeredAcrossOffset = ((lineWidth - 1) * spacingAcross) / 2;
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

    for (let i = 0; i < unitsPerSide; i += 1) {
      const file = i % lineWidth;
      const rank = Math.floor(i / lineWidth);
      const acrossOffset = file * spacingAcross - centeredAcrossOffset;
      const depthOffset = rank * spacingDepth;

      const redUnit = new Unit(
        `red-${i + 1}`,
        "red",
        redSpawn.x - redForwardX * depthOffset + lateralX * acrossOffset,
        redSpawn.y - redForwardY * depthOffset + lateralY * acrossOffset,
        redRotation,
        this.runtimeTuning.baseUnitHealth,
      );
      const blueUnit = new Unit(
        `blue-${i + 1}`,
        "blue",
        blueSpawn.x - blueForwardX * depthOffset + lateralX * acrossOffset,
        blueSpawn.y - blueForwardY * depthOffset + lateralY * acrossOffset,
        blueRotation,
        this.runtimeTuning.baseUnitHealth,
      );

      this.snapUnitToGrid(redUnit);
      this.snapUnitToGrid(blueUnit);

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
      gridToWorldCenter: (cell) => this.gridToWorldCenter(cell),
      clearMovementForUnit: (unitId) => this.clearMovementForUnit(unitId),
      isUnitMovementSuppressed: (unitId) => this.engagedUnitIds.has(unitId),
      faceCurrentDestination: (unit, movementState) =>
        this.faceCurrentDestination(unit, movementState),
      wrapAngle: (angle) => BattleRoom.wrapAngle(angle),
    });
  }

  private updateUnitInteractions(deltaSeconds: number): Map<string, Set<string>> {
    const getUnitMoraleScore = (unit: Unit): number =>
      getUnitMoraleScoreSystem({
        unit,
        moraleSampleRadius: BattleRoom.MORALE_SAMPLE_RADIUS,
        moraleMaxScore: BattleRoom.MORALE_MAX_SCORE,
        gridWidth: this.state.influenceGrid.width,
        gridHeight: this.state.influenceGrid.height,
        worldToGridCoordinate: (x, y) => this.worldToGridCoordinate(x, y),
        getInfluenceScoreAtCell: (col, row) => this.getInfluenceScoreAtCell(col, row),
        getTerrainMoraleMultiplierAtCell: (cell) =>
          this.getTerrainMoraleMultiplierAtCell(cell),
      });

    const engagements = updateUnitInteractionsSystem({
      deltaSeconds,
      unitsById: this.state.units,
      movementStateByUnitId: this.movementStateByUnitId,
      gridContactDistance: BattleRoom.GRID_CONTACT_DISTANCE,
      ensureFiniteUnitState: (unit) => this.ensureFiniteUnitState(unit),
      updateUnitMoraleScores: (units) =>
        updateUnitMoraleScoresSystem(units, getUnitMoraleScore),
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
    return this.lobbyService.getLobbyStateMessage({
      phase: this.matchPhase,
      mapId: this.state.mapId,
      mapRevision: this.mapRevision,
      isGeneratingMap: this.isGeneratingMap,
    });
  }

  private broadcastLobbyState(): void {
    this.broadcast(NETWORK_MESSAGE_TYPES.lobbyState, this.getLobbyStateMessage());
  }

  private tryStartBattle(): void {
    if (!this.lobbyService.canStartBattle(this.matchPhase)) {
      return;
    }

    this.resetCityGenerationTimersForAllSources();
    this.matchPhase = "BATTLE";
    this.broadcastLobbyState();
    console.log("Battle started: all lobby players ready.");
  }
}
