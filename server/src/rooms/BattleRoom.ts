import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { Unit } from "../schema/Unit.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";

type PlayerTeam = "BLUE" | "RED";
type Vector2 = {
  x: number;
  y: number;
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
type UnitMovementState = {
  destination: Vector2 | null;
  queuedWaypoints: Vector2[];
  targetRotation: number | null;
  movementCommandMode: MovementCommandMode;
};

export class BattleRoom extends Room<BattleState> {
  private readonly sessionTeamById = new Map<string, PlayerTeam>();
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();

  private static readonly CONTACT_DAMAGE_PER_SECOND =
    GAMEPLAY_CONFIG.combat.contactDamagePerSecond;
  private static readonly UNIT_HALF_WIDTH = 12;
  private static readonly UNIT_HALF_HEIGHT = 7;
  private static readonly UNIT_MOVE_SPEED = 120;
  private static readonly UNIT_TURN_SPEED = Math.PI;
  private static readonly UNIT_FORWARD_OFFSET = -Math.PI / 2;
  private static readonly REFACE_ANGLE_THRESHOLD = (Math.PI / 180) * 3;
  private static readonly WAYPOINT_MOVE_ANGLE_TOLERANCE = 0.35;
  private static readonly MIN_WAYPOINT_DISTANCE = 1;
  private static readonly DEFAULT_MOVEMENT_COMMAND_MODE: MovementCommandMode = {
    speedMultiplier: 1,
    rotateToFace: true,
  };

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.spawnTestUnits();

    this.setSimulationInterval((deltaMs) => {
      const deltaSeconds = deltaMs / 1000;
      this.updateMovement(deltaSeconds);
      this.updateCombat(deltaSeconds);
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
  }

  onJoin(client: Client): void {
    const assignedTeam = this.assignTeam(client.sessionId);
    client.send("teamAssigned", { team: assignedTeam });
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
    this.sessionTeamById.clear();
  }

  private createMovementState(): UnitMovementState {
    return {
      destination: null,
      queuedWaypoints: [],
      targetRotation: null,
      movementCommandMode: { ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE },
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

    movementState.destination = null;
    movementState.queuedWaypoints = [];
    movementState.targetRotation = null;
    movementState.movementCommandMode = {
      ...BattleRoom.DEFAULT_MOVEMENT_COMMAND_MODE,
    };
  }

  private normalizeMovementCommandMode(
    movementCommandMode?: Partial<MovementCommandMode>,
  ): MovementCommandMode {
    const speedMultiplier = movementCommandMode?.speedMultiplier;
    const normalizedSpeedMultiplier =
      typeof speedMultiplier === "number" &&
      Number.isFinite(speedMultiplier) &&
      speedMultiplier > 0
        ? Math.min(speedMultiplier, 4)
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
    if (!movementState.destination) {
      movementState.targetRotation = null;
      return;
    }

    if (!movementState.movementCommandMode.rotateToFace) {
      movementState.targetRotation = null;
      return;
    }

    const angleToTarget = Math.atan2(
      movementState.destination.y - unit.y,
      movementState.destination.x - unit.x,
    );
    movementState.targetRotation = angleToTarget - BattleRoom.UNIT_FORWARD_OFFSET;
  }

  private static wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  private spawnTestUnits(): void {
    const redSpawn = GAMEPLAY_CONFIG.spawn.red;
    const blueSpawn = GAMEPLAY_CONFIG.spawn.blue;
    const unitsPerSide = 10;
    const columns = 5;
    const spacingX = 32;
    const spacingY = 28;
    const centerOffsetX = ((columns - 1) * spacingX) / 2;

    for (let i = 0; i < unitsPerSide; i += 1) {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const offsetX = column * spacingX - centerOffsetX;
      const offsetY = row * spacingY;

      const redUnit = new Unit(
        `red-${i + 1}`,
        "red",
        redSpawn.x + offsetX,
        redSpawn.y + offsetY,
        redSpawn.rotation,
      );
      const blueUnit = new Unit(
        `blue-${i + 1}`,
        "blue",
        blueSpawn.x + offsetX,
        blueSpawn.y + offsetY,
        blueSpawn.rotation,
      );

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

    let firstUsableWaypointIndex = 0;
    while (firstUsableWaypointIndex < normalizedPath.length) {
      const waypoint = normalizedPath[firstUsableWaypointIndex];
      const distance = Math.hypot(waypoint.x - unit.x, waypoint.y - unit.y);
      if (distance >= BattleRoom.MIN_WAYPOINT_DISTANCE) {
        break;
      }
      firstUsableWaypointIndex += 1;
    }

    const usablePath = normalizedPath.slice(firstUsableWaypointIndex);
    if (usablePath.length === 0) {
      this.clearMovementForUnit(unit.unitId);
      return;
    }

    const [first, ...rest] = usablePath;
    movementState.destination = { x: first.x, y: first.y };
    movementState.queuedWaypoints = rest.map((point) => ({
      x: point.x,
      y: point.y,
    }));
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

    for (const unit of this.state.units.values()) {
      if (unit.health <= 0) {
        continue;
      }

      const movementState = this.movementStateByUnitId.get(unit.unitId);
      if (!movementState || !movementState.destination) {
        continue;
      }

      const maxStep =
        BattleRoom.UNIT_MOVE_SPEED *
        movementState.movementCommandMode.speedMultiplier *
        deltaSeconds;
      if (maxStep <= 0) {
        continue;
      }

      if (movementState.movementCommandMode.rotateToFace) {
        const desiredRotation =
          Math.atan2(
            movementState.destination.y - unit.y,
            movementState.destination.x - unit.x,
          ) - BattleRoom.UNIT_FORWARD_OFFSET;

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

      let remainingStep = maxStep;
      while (movementState.destination && remainingStep > 0) {
        const toTargetX = movementState.destination.x - unit.x;
        const toTargetY = movementState.destination.y - unit.y;
        const distance = Math.hypot(toTargetX, toTargetY);

        if (distance <= remainingStep) {
          unit.x = movementState.destination.x;
          unit.y = movementState.destination.y;
          remainingStep -= distance;

          const nextDestination = movementState.queuedWaypoints.shift() ?? null;
          movementState.destination = nextDestination
            ? { x: nextDestination.x, y: nextDestination.y }
            : null;
          this.faceCurrentDestination(unit, movementState);

          if (!movementState.destination) {
            break;
          }

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
          continue;
        }

        const stepScale = remainingStep / distance;
        unit.x += toTargetX * stepScale;
        unit.y += toTargetY * stepScale;
        break;
      }
    }
  }

  private updateCombat(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    const units = Array.from(this.state.units.values());
    const pendingDamageByUnitId = new Map<string, number>();

    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      if (a.health <= 0) {
        continue;
      }

      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        if (b.health <= 0 || a.team === b.team) {
          continue;
        }

        if (!this.areUnitsInContact(a, b)) {
          continue;
        }

        this.clearMovementForUnit(a.unitId);
        this.clearMovementForUnit(b.unitId);

        const damage = BattleRoom.CONTACT_DAMAGE_PER_SECOND * deltaSeconds;
        pendingDamageByUnitId.set(
          a.unitId,
          (pendingDamageByUnitId.get(a.unitId) ?? 0) + damage,
        );
        pendingDamageByUnitId.set(
          b.unitId,
          (pendingDamageByUnitId.get(b.unitId) ?? 0) + damage,
        );
      }
    }

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
    }
  }

  private areUnitsInContact(a: Unit, b: Unit): boolean {
    const overlapX = Math.abs(a.x - b.x) <= BattleRoom.UNIT_HALF_WIDTH * 2;
    const overlapY = Math.abs(a.y - b.y) <= BattleRoom.UNIT_HALF_HEIGHT * 2;
    return overlapX && overlapY;
  }
}
