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
type UnitHitbox = {
  center: Vector2;
  axisX: Vector2;
  axisY: Vector2;
  halfWidth: number;
  halfHeight: number;
};
type Overlap = {
  normal: Vector2;
  depth: number;
};

export class BattleRoom extends Room<BattleState> {
  private readonly sessionTeamById = new Map<string, PlayerTeam>();
  private readonly movementStateByUnitId = new Map<string, UnitMovementState>();
  private previousEngagementByUnitId = new Map<string, Set<string>>();
  private simulationTimeMs = 0;

  private static readonly CONTACT_DAMAGE_PER_SECOND =
    GAMEPLAY_CONFIG.combat.contactDamagePerSecond;
  private static readonly BATTLE_JIGGLE_SPEED =
    GAMEPLAY_CONFIG.combat.battleJiggleSpeed;
  private static readonly BATTLE_JIGGLE_FREQUENCY =
    GAMEPLAY_CONFIG.combat.battleJiggleFrequency;
  private static readonly ENGAGEMENT_MAGNET_DISTANCE =
    GAMEPLAY_CONFIG.movement.engagementMagnetDistance;
  private static readonly ENGAGEMENT_HOLD_DISTANCE =
    GAMEPLAY_CONFIG.movement.engagementHoldDistance;
  private static readonly MAGNETISM_SPEED = GAMEPLAY_CONFIG.movement.magnetismSpeed;
  private static readonly ALLY_COLLISION_PUSH_SPEED =
    GAMEPLAY_CONFIG.movement.allyCollisionPushSpeed;
  private static readonly ALLY_SOFT_SEPARATION_DISTANCE =
    GAMEPLAY_CONFIG.movement.allySoftSeparationDistance;
  private static readonly ALLY_SOFT_SEPARATION_PUSH_SPEED =
    GAMEPLAY_CONFIG.movement.allySoftSeparationPushSpeed;
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
      this.simulationTimeMs += deltaMs;
      this.updateMovement(deltaSeconds);
      const engagements = this.updateUnitInteractions(deltaSeconds);
      this.updateCombatRotation(deltaSeconds, engagements);
      this.previousEngagementByUnitId = this.cloneEngagementMap(engagements);
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
    this.previousEngagementByUnitId.clear();
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

  private static distance(a: Vector2, b: Vector2): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private static scaleVector(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  private static cloneVector(v: Vector2): Vector2 {
    return { x: v.x, y: v.y };
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
      this.ensureFiniteUnitState(unit);

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

  private getHitbox(unit: Unit): UnitHitbox {
    const cos = Math.cos(unit.rotation);
    const sin = Math.sin(unit.rotation);

    return {
      center: { x: unit.x, y: unit.y },
      axisX: { x: cos, y: sin },
      axisY: { x: -sin, y: cos },
      halfWidth: BattleRoom.UNIT_HALF_WIDTH,
      halfHeight: BattleRoom.UNIT_HALF_HEIGHT,
    };
  }

  private projectHitboxRadius(hitbox: UnitHitbox, axis: Vector2): number {
    const dotXX = axis.x * hitbox.axisX.x + axis.y * hitbox.axisX.y;
    const dotXY = axis.x * hitbox.axisY.x + axis.y * hitbox.axisY.y;
    return (
      hitbox.halfWidth * Math.abs(dotXX) + hitbox.halfHeight * Math.abs(dotXY)
    );
  }

  private getHitboxOverlap(a: Unit, b: Unit): Overlap | null {
    const hitboxA = this.getHitbox(a);
    const hitboxB = this.getHitbox(b);
    const centerDelta = {
      x: hitboxB.center.x - hitboxA.center.x,
      y: hitboxB.center.y - hitboxA.center.y,
    };
    const axes = [hitboxA.axisX, hitboxA.axisY, hitboxB.axisX, hitboxB.axisY];

    let minimumOverlap = Number.POSITIVE_INFINITY;
    let minimumAxis: Vector2 | null = null;

    for (const axis of axes) {
      const centerDistance = Math.abs(centerDelta.x * axis.x + centerDelta.y * axis.y);
      const projectedRadiusA = this.projectHitboxRadius(hitboxA, axis);
      const projectedRadiusB = this.projectHitboxRadius(hitboxB, axis);
      const overlap = projectedRadiusA + projectedRadiusB - centerDistance;

      if (overlap <= 0) {
        return null;
      }

      if (overlap < minimumOverlap) {
        minimumOverlap = overlap;
        minimumAxis = BattleRoom.cloneVector(axis);
      }
    }

    if (!minimumAxis) {
      return null;
    }

    if (centerDelta.x * minimumAxis.x + centerDelta.y * minimumAxis.y < 0) {
      minimumAxis.x *= -1;
      minimumAxis.y *= -1;
    }

    return {
      normal: minimumAxis,
      depth: minimumOverlap,
    };
  }

  private hasCurrentEngagement(
    engagements: Map<string, Set<string>>,
    unitId: string,
  ): boolean {
    return (engagements.get(unitId)?.size ?? 0) > 0;
  }

  private wasEngagedPreviously(aId: string, bId: string): boolean {
    return this.previousEngagementByUnitId.get(aId)?.has(bId) ?? false;
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

  private cloneEngagementMap(
    source: Map<string, Set<string>>,
  ): Map<string, Set<string>> {
    const cloned = new Map<string, Set<string>>();
    for (const [unitId, peers] of source) {
      cloned.set(unitId, new Set(peers));
    }
    return cloned;
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

  private canBePushedByEnemy(_unit: Unit): boolean {
    return true;
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
      this.removeUnitFromEngagementMap(this.previousEngagementByUnitId, unitId);
    }
  }

  private updateUnitInteractions(deltaSeconds: number): Map<string, Set<string>> {
    const engagements = new Map<string, Set<string>>();
    if (deltaSeconds <= 0) {
      return engagements;
    }

    const units = Array.from(this.state.units.values()).filter((unit) => unit.health > 0);
    const pendingDamageByUnitId = new Map<string, number>();

    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      this.ensureFiniteUnitState(a);

      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        this.ensureFiniteUnitState(b);

        const delta = { x: b.x - a.x, y: b.y - a.y };
        const distance = Math.max(Math.hypot(delta.x, delta.y), 0.0001);
        const overlap = this.getHitboxOverlap(a, b);
        const hitboxesOverlap = overlap !== null;
        const opposingTeams = a.team !== b.team;
        const previouslyEngagedPair =
          opposingTeams &&
          (this.wasEngagedPreviously(a.unitId, b.unitId) ||
            this.wasEngagedPreviously(b.unitId, a.unitId));
        const canStartNewEngagement =
          opposingTeams &&
          !this.hasCurrentEngagement(engagements, a.unitId) &&
          !this.hasCurrentEngagement(engagements, b.unitId);
        const engagementAllowed = previouslyEngagedPair || canStartNewEngagement;
        const stickyEngagement =
          previouslyEngagedPair && distance <= BattleRoom.ENGAGEMENT_HOLD_DISTANCE;
        const shouldMagnetize =
          engagementAllowed &&
          !hitboxesOverlap &&
          (distance <= BattleRoom.ENGAGEMENT_MAGNET_DISTANCE || stickyEngagement);
        const shouldBattleJiggle =
          engagementAllowed && (hitboxesOverlap || stickyEngagement);
        const safeDirection =
          distance > 0.0001
            ? BattleRoom.scaleVector(delta, 1 / distance)
            : { x: 1, y: 0 };
        const aCanBePushedByEnemy = this.canBePushedByEnemy(a);
        const bCanBePushedByEnemy = this.canBePushedByEnemy(b);
        const pushableUnitCount =
          Number(aCanBePushedByEnemy) + Number(bCanBePushedByEnemy);
        const displacementNormalization =
          pushableUnitCount > 0 ? 2 / pushableUnitCount : 0;

        if (!opposingTeams && distance < BattleRoom.ALLY_SOFT_SEPARATION_DISTANCE) {
          const spacingRatio =
            1 - distance / BattleRoom.ALLY_SOFT_SEPARATION_DISTANCE;
          const pushDistance =
            BattleRoom.ALLY_SOFT_SEPARATION_PUSH_SPEED * spacingRatio * deltaSeconds;
          const separation = BattleRoom.scaleVector(safeDirection, pushDistance * 0.5);
          a.x -= separation.x;
          a.y -= separation.y;
          b.x += separation.x;
          b.y += separation.y;
        }

        if (!opposingTeams && overlap) {
          const maxPushDistance = BattleRoom.ALLY_COLLISION_PUSH_SPEED * deltaSeconds;
          const pushDistance = Math.min(overlap.depth * 0.5, maxPushDistance);
          const separation = BattleRoom.scaleVector(overlap.normal, pushDistance);
          a.x -= separation.x;
          a.y -= separation.y;
          b.x += separation.x;
          b.y += separation.y;
        }

        if (shouldMagnetize) {
          const pull = BattleRoom.scaleVector(
            safeDirection,
            BattleRoom.MAGNETISM_SPEED * deltaSeconds,
          );
          if (aCanBePushedByEnemy) {
            const aStep = displacementNormalization;
            a.x += pull.x * aStep;
            a.y += pull.y * aStep;
          }
          if (bCanBePushedByEnemy) {
            const bStep = displacementNormalization;
            b.x -= pull.x * bStep;
            b.y -= pull.y * bStep;
          }
          this.addEngagement(engagements, a.unitId, b.unitId);
        }

        if (shouldBattleJiggle) {
          const phase =
            this.simulationTimeMs * BattleRoom.BATTLE_JIGGLE_FREQUENCY + i * 1.7 + j * 2.3;
          const jiggleStep =
            Math.sin(phase) * BattleRoom.BATTLE_JIGGLE_SPEED * deltaSeconds;
          if (aCanBePushedByEnemy) {
            const aStep = jiggleStep * displacementNormalization;
            a.x += safeDirection.x * aStep;
            a.y += safeDirection.y * aStep;
          }
          if (bCanBePushedByEnemy) {
            const bStep = jiggleStep * displacementNormalization;
            b.x -= safeDirection.x * bStep;
            b.y -= safeDirection.y * bStep;
          }
          this.addEngagement(engagements, a.unitId, b.unitId);
        }

        if (opposingTeams && overlap) {
          if (engagementAllowed) {
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
            this.addEngagement(engagements, a.unitId, b.unitId);
          }

          const totalPushable = pushableUnitCount;
          if (totalPushable > 0) {
            const separationPerShare = overlap.depth / totalPushable;
            if (aCanBePushedByEnemy) {
              const separationA = BattleRoom.scaleVector(
                overlap.normal,
                separationPerShare,
              );
              a.x -= separationA.x;
              a.y -= separationA.y;
            }
            if (bCanBePushedByEnemy) {
              const separationB = BattleRoom.scaleVector(
                overlap.normal,
                separationPerShare,
              );
              b.x += separationB.x;
              b.y += separationB.y;
            }
          }
        }
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
