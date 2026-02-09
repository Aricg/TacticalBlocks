import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { Unit } from "../schema/Unit.js";
import { InfluenceGridSystem } from "../systems/InfluenceGridSystem.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import {
  applyRuntimeTuningUpdate,
  DEFAULT_RUNTIME_TUNING,
  RuntimeTuning,
} from "../../../shared/src/runtimeTuning.js";

type PlayerTeam = "BLUE" | "RED";
type Vector2 = {
  x: number;
  y: number;
};
type GridCoordinate = {
  col: number;
  row: number;
};
type MovementCommandMode = {
  speedMultiplier: number;
  rotateToFace: boolean;
};
type UnitPathMessage = {
  unitId: string;
  path: Vector2[];
  movementCommandMode?: Partial<MovementCommandMode>;
};
type UnitCancelMovementMessage = {
  unitId: string;
};
type RuntimeTuningUpdateMessage = Partial<RuntimeTuning>;
type UnitMovementState = {
  destinationCell: GridCoordinate | null;
  queuedCells: GridCoordinate[];
  targetRotation: number | null;
  movementCommandMode: MovementCommandMode;
  movementBudget: number;
};

export class BattleRoom extends Room<BattleState> {
  private readonly sessionTeamById = new Map<string, PlayerTeam>();
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();
  private readonly combatInfluenceAdvantageByUnitId = new Map<string, number>();
  private readonly influenceGridSystem = new InfluenceGridSystem();
  private simulationFrame = 0;
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
  private static readonly GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
  private static readonly GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;
  private static readonly CELL_WIDTH =
    GAMEPLAY_CONFIG.map.width / BattleRoom.GRID_WIDTH;
  private static readonly CELL_HEIGHT =
    GAMEPLAY_CONFIG.map.height / BattleRoom.GRID_HEIGHT;
  private static readonly GRID_CONTACT_DISTANCE =
    Math.max(BattleRoom.CELL_WIDTH, BattleRoom.CELL_HEIGHT) * 1.05;
  private static readonly MAX_ABS_TACTICAL_SCORE =
    GAMEPLAY_CONFIG.influence.maxAbsTacticalScore;
  private static readonly COMBAT_INFLUENCE_SHAPE_EXPONENT = 1.6;
  private static readonly COMBAT_INFLUENCE_RISE_RATE_PER_SECOND = 2.25;
  private static readonly COMBAT_INFLUENCE_FALL_RATE_PER_SECOND = 0.35;

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.influenceGridSystem.setRuntimeTuning(this.runtimeTuning);
    this.syncCityInfluenceSources();
    this.spawnTestUnits();
    this.updateInfluenceGrid(true);

    this.setSimulationInterval((deltaMs) => {
      const deltaSeconds = deltaMs / 1000;
      this.simulationFrame += 1;
      this.updateMovement(deltaSeconds);
      const engagements = this.updateUnitInteractions(deltaSeconds);
      this.updateCombatRotation(deltaSeconds, engagements);
      this.updateInfluenceGrid();
    }, GAMEPLAY_CONFIG.network.positionSyncIntervalMs);

    this.onMessage("unitPath", (client, message: UnitPathMessage) => {
      this.handleUnitPathMessage(client, message);
    });
    this.onMessage(
      "unitCancelMovement",
      (client, message: UnitCancelMovementMessage) => {
        this.handleUnitCancelMovementMessage(client, message);
      },
    );
    this.onMessage(
      "runtimeTuningUpdate",
      (client, message: RuntimeTuningUpdateMessage) => {
        this.handleRuntimeTuningUpdate(client, message);
      },
    );
  }

  onJoin(client: Client): void {
    const assignedTeam = this.assignTeam(client.sessionId);
    client.send("teamAssigned", { team: assignedTeam });
    client.send("runtimeTuningSnapshot", this.runtimeTuning);
    console.log(`Client joined battle room: ${client.sessionId} (${assignedTeam})`);
  }

  onLeave(client: Client): void {
    const team = this.sessionTeamById.get(client.sessionId);
    if (team) {
      this.sessionTeamById.delete(client.sessionId);
    }
    console.log(
      `Client left battle room: ${client.sessionId}${team ? ` (${team})` : ""}`,
    );
  }

  onDispose(): void {
    this.movementStateByUnitId.clear();
    this.combatInfluenceAdvantageByUnitId.clear();
    this.sessionTeamById.clear();
    this.simulationFrame = 0;
  }

  private createMovementState(): UnitMovementState {
    return {
      destinationCell: null,
      queuedCells: [],
      targetRotation: null,
      movementCommandMode: { ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE },
      movementBudget: 0,
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
  }

  private normalizeMovementCommandMode(
    movementCommandMode?: Partial<MovementCommandMode>,
  ): MovementCommandMode {
    const speedMultiplier = movementCommandMode?.speedMultiplier;
    const normalizedSpeedMultiplier =
      typeof speedMultiplier === "number" &&
      Number.isFinite(speedMultiplier) &&
      speedMultiplier > 0
        ? Math.min(speedMultiplier, GAMEPLAY_CONFIG.movement.maxCommandSpeedMultiplier)
        : BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE.speedMultiplier;

    const rotateToFace = movementCommandMode?.rotateToFace;
    const normalizedRotateToFace =
      typeof rotateToFace === "boolean"
        ? rotateToFace
        : BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE.rotateToFace;

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

  private getTeamSign(team: string): 1 | -1 {
    return team.toUpperCase() === "BLUE" ? 1 : -1;
  }

  private getInfluenceScoreAtUnit(unit: Unit): number {
    return this.getInfluenceScoreAtPoint(unit.x, unit.y);
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

  private getInfluenceAdvantageNormalized(unit: Unit): number {
    return this.getInfluenceAdvantageNormalizedAtPoint(
      unit.x,
      unit.y,
      this.getTeamSign(unit.team),
    );
  }

  private getInfluenceAdvantageNormalizedAtPoint(
    x: number,
    y: number,
    teamSign: 1 | -1,
  ): number {
    const score = this.getInfluenceScoreAtPoint(x, y);
    const alignedScore = score * teamSign;
    return this.clamp(
      alignedScore / BattleRoom.MAX_ABS_TACTICAL_SCORE,
      0,
      1,
    );
  }

  private shapeCombatInfluenceAdvantage(rawAdvantage: number): number {
    return Math.pow(
      rawAdvantage,
      BattleRoom.COMBAT_INFLUENCE_SHAPE_EXPONENT,
    );
  }

  private getCombatInfluenceAdvantageAtPoint(
    x: number,
    y: number,
    teamSign: 1 | -1,
  ): number {
    return this.shapeCombatInfluenceAdvantage(
      this.getInfluenceAdvantageNormalizedAtPoint(x, y, teamSign),
    );
  }

  private getInfluenceBuffMultiplier(
    influenceAdvantage: number,
    influenceMultiplier: number,
  ): number {
    return 1 + influenceAdvantage * influenceMultiplier;
  }

  private getUnitContactDps(influenceAdvantage: number): number {
    const baseDps = Math.max(0, this.runtimeTuning.baseContactDps);
    return (
      baseDps *
      this.getInfluenceBuffMultiplier(
        influenceAdvantage,
        this.runtimeTuning.dpsInfluenceMultiplier,
      )
    );
  }

  private getUnitHealthMitigationMultiplier(influenceAdvantage: number): number {
    return this.getInfluenceBuffMultiplier(
      influenceAdvantage,
      this.runtimeTuning.healthInfluenceMultiplier,
    );
  }

  private stepTowardInfluenceAdvantage(
    current: number,
    target: number,
    deltaSeconds: number,
  ): number {
    const delta = target - current;
    if (Math.abs(delta) <= 0.000001) {
      return target;
    }

    const safeDeltaSeconds = Math.max(0, deltaSeconds);
    const stepRate =
      delta > 0
        ? BattleRoom.COMBAT_INFLUENCE_RISE_RATE_PER_SECOND
        : BattleRoom.COMBAT_INFLUENCE_FALL_RATE_PER_SECOND;
    const maxStep = stepRate * safeDeltaSeconds;
    if (Math.abs(delta) <= maxStep) {
      return target;
    }

    return current + Math.sign(delta) * maxStep;
  }

  private buildCombatInfluenceAdvantageByUnitId(
    units: Unit[],
    deltaSeconds: number,
  ): Map<string, number> {
    const smoothedByUnitId = new Map<string, number>();
    const aliveUnitIds = new Set<string>();

    for (const unit of units) {
      aliveUnitIds.add(unit.unitId);
      const rawAdvantage = this.getInfluenceAdvantageNormalized(unit);
      const shapedAdvantage = this.shapeCombatInfluenceAdvantage(rawAdvantage);
      const previousAdvantage = this.combatInfluenceAdvantageByUnitId.get(unit.unitId);
      const smoothedAdvantage =
        previousAdvantage === undefined
          ? shapedAdvantage
          : this.stepTowardInfluenceAdvantage(
              previousAdvantage,
              shapedAdvantage,
              deltaSeconds,
            );
      unit.combatInfluenceScore =
        smoothedAdvantage *
        BattleRoom.MAX_ABS_TACTICAL_SCORE *
        this.getTeamSign(unit.team);
      this.combatInfluenceAdvantageByUnitId.set(unit.unitId, smoothedAdvantage);
      smoothedByUnitId.set(unit.unitId, smoothedAdvantage);
    }

    for (const unitId of this.combatInfluenceAdvantageByUnitId.keys()) {
      if (!aliveUnitIds.has(unitId)) {
        this.combatInfluenceAdvantageByUnitId.delete(unitId);
      }
    }

    return smoothedByUnitId;
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

  private gridKey(cell: GridCoordinate): string {
    return `${cell.col}:${cell.row}`;
  }

  private addOccupancy(
    occupiedByCellKey: Map<string, Set<string>>,
    cell: GridCoordinate,
    unitId: string,
  ): void {
    const key = this.gridKey(cell);
    const set = occupiedByCellKey.get(key);
    if (set) {
      set.add(unitId);
      return;
    }

    occupiedByCellKey.set(key, new Set([unitId]));
  }

  private removeOccupancy(
    occupiedByCellKey: Map<string, Set<string>>,
    cell: GridCoordinate,
    unitId: string,
  ): void {
    const key = this.gridKey(cell);
    const set = occupiedByCellKey.get(key);
    if (!set) {
      return;
    }

    set.delete(unitId);
    if (set.size === 0) {
      occupiedByCellKey.delete(key);
    }
  }

  private isDestinationBlocked(
    occupiedByCellKey: Map<string, Set<string>>,
    destinationCell: GridCoordinate,
    unitId: string,
  ): boolean {
    const destinationSet = occupiedByCellKey.get(this.gridKey(destinationCell));
    if (!destinationSet) {
      return false;
    }

    return !(destinationSet.size === 1 && destinationSet.has(unitId));
  }

  private traceGridLine(
    start: GridCoordinate,
    end: GridCoordinate,
  ): GridCoordinate[] {
    const points: GridCoordinate[] = [];
    let x0 = start.col;
    let y0 = start.row;
    const x1 = end.col;
    const y1 = end.row;

    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;

    while (true) {
      points.push({ col: x0, row: y0 });
      if (x0 === x1 && y0 === y1) {
        break;
      }

      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y0 += sy;
      }
    }

    return points;
  }

  private compactGridCoordinates(path: GridCoordinate[]): GridCoordinate[] {
    if (path.length <= 1) {
      return path;
    }

    const compacted: GridCoordinate[] = [path[0]];
    for (let i = 1; i < path.length; i += 1) {
      const next = path[i];
      const previous = compacted[compacted.length - 1];
      if (next.col === previous.col && next.row === previous.row) {
        continue;
      }
      compacted.push(next);
    }

    return compacted;
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

  private syncCityInfluenceSources(): void {
    const redSpawn = GAMEPLAY_CONFIG.spawn.red;
    const blueSpawn = GAMEPLAY_CONFIG.spawn.blue;
    const cityPower =
      this.runtimeTuning.baseUnitHealth *
      this.runtimeTuning.cityInfluenceUnitsEquivalent;

    this.influenceGridSystem.setStaticInfluenceSources([
      {
        x: redSpawn.x - GAMEPLAY_CONFIG.cities.backlineOffset,
        y: redSpawn.y,
        power: cityPower,
        team: "RED",
      },
      {
        x: blueSpawn.x + GAMEPLAY_CONFIG.cities.backlineOffset,
        y: blueSpawn.y,
        power: cityPower,
        team: "BLUE",
      },
    ]);
  }

  private handleRuntimeTuningUpdate(
    client: Client,
    message: RuntimeTuningUpdateMessage,
  ): void {
    if (!this.sessionTeamById.has(client.sessionId)) {
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
    this.broadcast("runtimeTuningSnapshot", this.runtimeTuning);
    this.updateInfluenceGrid(true);
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

  private spawnTestUnits(): void {
    const redSpawn = GAMEPLAY_CONFIG.spawn.red;
    const blueSpawn = GAMEPLAY_CONFIG.spawn.blue;
    const unitsPerSide = GAMEPLAY_CONFIG.spawn.unitsPerSide;
    const lineWidth = Math.max(1, GAMEPLAY_CONFIG.spawn.lineWidth);
    const spacingAcross = GAMEPLAY_CONFIG.spawn.spacingAcross;
    const spacingDepth = GAMEPLAY_CONFIG.spawn.spacingDepth;
    const centeredAcrossOffset = ((lineWidth - 1) * spacingAcross) / 2;

    for (let i = 0; i < unitsPerSide; i += 1) {
      const file = i % lineWidth;
      const rank = Math.floor(i / lineWidth);
      const offsetY = file * spacingAcross - centeredAcrossOffset;
      const redDepthOffsetX = -rank * spacingDepth;
      const blueDepthOffsetX = rank * spacingDepth;

      const redUnit = new Unit(
        `red-${i + 1}`,
        "red",
        redSpawn.x + redDepthOffsetX,
        redSpawn.y + offsetY,
        redSpawn.rotation,
        this.runtimeTuning.baseUnitHealth,
      );
      const blueUnit = new Unit(
        `blue-${i + 1}`,
        "blue",
        blueSpawn.x + blueDepthOffsetX,
        blueSpawn.y + offsetY,
        blueSpawn.rotation,
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

  private assignTeam(sessionId: string): PlayerTeam {
    const takenTeams = new Set(this.sessionTeamById.values());
    const team: PlayerTeam = takenTeams.has("BLUE") ? "RED" : "BLUE";
    this.sessionTeamById.set(sessionId, team);
    return team;
  }

  private handleUnitPathMessage(client: Client, message: UnitPathMessage): void {
    const assignedTeam = this.sessionTeamById.get(client.sessionId);
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

    const normalizedPath: Vector2[] = [];
    for (const waypoint of message.path) {
      if (
        typeof waypoint?.x !== "number" ||
        typeof waypoint?.y !== "number" ||
        !Number.isFinite(waypoint.x) ||
        !Number.isFinite(waypoint.y)
      ) {
        return;
      }
      normalizedPath.push({ x: waypoint.x, y: waypoint.y });
    }

    const movementState = this.getOrCreateMovementState(unit.unitId);
    movementState.movementCommandMode = this.normalizeMovementCommandMode(
      message.movementCommandMode,
    );
    movementState.targetRotation = null;
    movementState.movementBudget = 0;

    if (normalizedPath.length === 0) {
      this.clearMovementForUnit(unit.unitId);
      return;
    }

    const snappedTargetCells = this.compactGridCoordinates(
      normalizedPath.map((waypoint) =>
        this.worldToGridCoordinate(waypoint.x, waypoint.y),
      ),
    );

    const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
    let pathCursor = { col: unitCell.col, row: unitCell.row };
    const route: GridCoordinate[] = [];

    for (const targetCell of snappedTargetCells) {
      const segment = this.traceGridLine(pathCursor, targetCell);
      for (let i = 1; i < segment.length; i += 1) {
        route.push(segment[i]);
      }
      pathCursor = targetCell;
    }

    if (route.length === 0) {
      this.clearMovementForUnit(unit.unitId);
      return;
    }

    movementState.destinationCell = route[0];
    movementState.queuedCells = route.slice(1);
    this.faceCurrentDestination(unit, movementState);
  }

  private handleUnitCancelMovementMessage(
    client: Client,
    message: UnitCancelMovementMessage,
  ): void {
    const assignedTeam = this.sessionTeamById.get(client.sessionId);
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
  }

  private updateMovement(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    const aliveUnits: Unit[] = [];
    const cellByUnitId = new Map<string, GridCoordinate>();
    const occupiedByCellKey = new Map<string, Set<string>>();

    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }
      this.ensureFiniteUnitState(unit);
      const snappedCell = this.snapUnitToGrid(unit);
      aliveUnits.push(unit);
      cellByUnitId.set(unit.unitId, snappedCell);
      this.addOccupancy(occupiedByCellKey, snappedCell, unit.unitId);
    }

    for (const unit of aliveUnits) {
      const movementState = this.movementStateByUnitId.get(unit.unitId);
      if (!movementState) {
        continue;
      }

      if (!movementState.destinationCell && movementState.queuedCells.length > 0) {
        movementState.destinationCell = movementState.queuedCells.shift() ?? null;
        this.faceCurrentDestination(unit, movementState);
      }

      if (!movementState.destinationCell) {
        continue;
      }

      const perSecondSpeed =
        this.runtimeTuning.unitMoveSpeed *
        movementState.movementCommandMode.speedMultiplier;
      if (perSecondSpeed <= 0 || !Number.isFinite(perSecondSpeed)) {
        continue;
      }

      movementState.movementBudget += perSecondSpeed * deltaSeconds;

      if (movementState.movementCommandMode.rotateToFace) {
        const destination = this.gridToWorldCenter(movementState.destinationCell);
        const desiredRotation =
          Math.atan2(destination.y - unit.y, destination.x - unit.x) -
          BattleRoom.UNIT_FORWARD_OFFSET;

        if (movementState.targetRotation === null) {
          const headingError = BattleRoom.wrapAngle(desiredRotation - unit.rotation);
          if (Math.abs(headingError) > BattleRoom.REFACE_ANGLE_THRESHOLD) {
            movementState.targetRotation = desiredRotation;
          }
        }

        if (movementState.targetRotation !== null) {
          const maxTurnStep = BattleRoom.UNIT_TURN_SPEED * deltaSeconds;
          const angleDelta = BattleRoom.wrapAngle(
            movementState.targetRotation - unit.rotation,
          );
          if (Math.abs(angleDelta) <= maxTurnStep) {
            unit.rotation = movementState.targetRotation;
            movementState.targetRotation = null;
          } else {
            unit.rotation = BattleRoom.wrapAngle(
              unit.rotation + Math.sign(angleDelta) * maxTurnStep,
            );
          }
        }

        const isFacingDestination =
          movementState.targetRotation === null ||
          Math.abs(
            BattleRoom.wrapAngle(movementState.targetRotation - unit.rotation),
          ) <= BattleRoom.WAYPOINT_MOVE_ANGLE_TOLERANCE;
        if (!isFacingDestination) {
          continue;
        }
      }

      while (movementState.destinationCell && movementState.movementBudget > 0) {
        const destinationCell = movementState.destinationCell;
        const destination = this.gridToWorldCenter(destinationCell);
        const toTargetX = destination.x - unit.x;
        const toTargetY = destination.y - unit.y;
        const distance = Math.hypot(toTargetX, toTargetY);

        if (distance <= 0.0001) {
          movementState.destinationCell = movementState.queuedCells.shift() ?? null;
          this.faceCurrentDestination(unit, movementState);
          continue;
        }

        if (movementState.movementBudget + 0.0001 < distance) {
          break;
        }

        if (
          this.isDestinationBlocked(
            occupiedByCellKey,
            destinationCell,
            unit.unitId,
          )
        ) {
          break;
        }

        const currentCell =
          cellByUnitId.get(unit.unitId) ?? this.worldToGridCoordinate(unit.x, unit.y);
        this.removeOccupancy(occupiedByCellKey, currentCell, unit.unitId);

        unit.x = destination.x;
        unit.y = destination.y;
        movementState.movementBudget -= distance;

        const reachedCell = { col: destinationCell.col, row: destinationCell.row };
        cellByUnitId.set(unit.unitId, reachedCell);
        this.addOccupancy(occupiedByCellKey, reachedCell, unit.unitId);

        movementState.destinationCell = movementState.queuedCells.shift() ?? null;
        this.faceCurrentDestination(unit, movementState);

        if (
          movementState.movementCommandMode.rotateToFace &&
          movementState.targetRotation !== null
        ) {
          const headingError = Math.abs(
            BattleRoom.wrapAngle(movementState.targetRotation - unit.rotation),
          );
          if (headingError > BattleRoom.WAYPOINT_MOVE_ANGLE_TOLERANCE) {
            break;
          }
        }
      }
    }
  }

  private addEngagement(
    engagements: Map<string, Set<string>>,
    aId: string,
    bId: string,
  ): void {
    const aSet = engagements.get(aId);
    if (aSet) {
      aSet.add(bId);
    } else {
      engagements.set(aId, new Set([bId]));
    }

    const bSet = engagements.get(bId);
    if (bSet) {
      bSet.add(aId);
    } else {
      engagements.set(bId, new Set([aId]));
    }
  }

  private removeUnitFromEngagementMap(
    engagements: Map<string, Set<string>>,
    unitId: string,
  ): void {
    engagements.delete(unitId);
    for (const peers of engagements.values()) {
      peers.delete(unitId);
    }
  }

  private applyPendingDamage(
    pendingDamageByUnitId: Map<string, number>,
    engagements: Map<string, Set<string>>,
  ): void {
    if (pendingDamageByUnitId.size === 0) {
      return;
    }

    const deadUnitIds: string[] = [];
    for (const [unitId, damage] of pendingDamageByUnitId) {
      const unit = this.state.units.get(unitId);
      if (!unit || unit.health <= 0) {
        continue;
      }

      unit.health = Math.max(0, unit.health - damage);
      if (unit.health <= 0) {
        deadUnitIds.push(unitId);
      }
    }

    for (const unitId of deadUnitIds) {
      this.state.units.delete(unitId);
      this.movementStateByUnitId.delete(unitId);
      this.removeUnitFromEngagementMap(engagements, unitId);
    }
  }

  private updateUnitInteractions(deltaSeconds: number): Map<string, Set<string>> {
    const engagements = new Map<string, Set<string>>();
    if (deltaSeconds <= 0) {
      return engagements;
    }

    const units = Array.from(this.state.units.values()).filter((unit) => unit.health > 0);
    const pendingDamageByUnitId = new Map<string, number>();
    this.buildCombatInfluenceAdvantageByUnitId(units, deltaSeconds);

    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      this.ensureFiniteUnitState(a);

      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        this.ensureFiniteUnitState(b);

        if (a.team === b.team) {
          continue;
        }

        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance > BattleRoom.GRID_CONTACT_DISTANCE) {
          continue;
        }

        this.clearMovementForUnit(a.unitId);
        this.clearMovementForUnit(b.unitId);

        // Use a shared engagement sample point so both sides evaluate the same local battle context.
        const engagementX = (a.x + b.x) * 0.5;
        const engagementY = (a.y + b.y) * 0.5;
        const aCombatInfluenceAdvantage = this.getCombatInfluenceAdvantageAtPoint(
          engagementX,
          engagementY,
          this.getTeamSign(a.team),
        );
        const bCombatInfluenceAdvantage = this.getCombatInfluenceAdvantageAtPoint(
          engagementX,
          engagementY,
          this.getTeamSign(b.team),
        );
        const aContactDps = this.getUnitContactDps(aCombatInfluenceAdvantage);
        const bContactDps = this.getUnitContactDps(bCombatInfluenceAdvantage);
        const aHealthMitigation =
          this.getUnitHealthMitigationMultiplier(aCombatInfluenceAdvantage);
        const bHealthMitigation =
          this.getUnitHealthMitigationMultiplier(bCombatInfluenceAdvantage);

        const incomingDamageToA =
          (bContactDps * deltaSeconds) /
          Math.max(1, aHealthMitigation);
        const incomingDamageToB =
          (aContactDps * deltaSeconds) /
          Math.max(1, bHealthMitigation);
        pendingDamageByUnitId.set(
          a.unitId,
          (pendingDamageByUnitId.get(a.unitId) ?? 0) + incomingDamageToA,
        );
        pendingDamageByUnitId.set(
          b.unitId,
          (pendingDamageByUnitId.get(b.unitId) ?? 0) + incomingDamageToB,
        );
        this.addEngagement(engagements, a.unitId, b.unitId);
      }
    }

    this.applyPendingDamage(pendingDamageByUnitId, engagements);
    return engagements;
  }

  private updateCombatRotation(
    deltaSeconds: number,
    engagements: Map<string, Set<string>>,
  ): void {
    if (deltaSeconds <= 0) {
      return;
    }

    for (const [unitId, engagedUnitIds] of engagements) {
      if (engagedUnitIds.size === 0) {
        continue;
      }

      const unit = this.state.units.get(unitId);
      if (!unit || unit.health <= 0) {
        continue;
      }

      const targetId = engagedUnitIds.values().next().value;
      if (typeof targetId !== "string") {
        continue;
      }

      const target = this.state.units.get(targetId);
      if (!target || target.health <= 0) {
        continue;
      }

      const targetAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
      const desiredRotation = targetAngle - BattleRoom.UNIT_FORWARD_OFFSET;
      const angleDelta = BattleRoom.wrapAngle(desiredRotation - unit.rotation);
      const maxTurnStep = BattleRoom.UNIT_TURN_SPEED * deltaSeconds;

      if (Math.abs(angleDelta) <= maxTurnStep) {
        unit.rotation = desiredRotation;
      } else {
        unit.rotation = BattleRoom.wrapAngle(
          unit.rotation + Math.sign(angleDelta) * maxTurnStep,
        );
      }
    }
  }
}
