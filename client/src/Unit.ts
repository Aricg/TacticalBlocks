import Phaser from 'phaser';
import { Team } from './Team';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';

type MovementCommandMode = {
  speedMultiplier: number;
  rotateToFace: boolean;
};

export type UnitHitbox = {
  center: Phaser.Math.Vector2;
  axisX: Phaser.Math.Vector2;
  axisY: Phaser.Math.Vector2;
  halfWidth: number;
  halfHeight: number;
};

export class Unit extends Phaser.GameObjects.Container {
  public selected: boolean;
  public readonly engagedUnits: Set<Unit>;
  private readonly previouslyEngagedUnits: Set<Unit>;
  public readonly team: Team;
  private readonly speed: number;
  private readonly turnSpeed: number;
  private movementCommandMode: MovementCommandMode;
  private destination: Phaser.Math.Vector2 | null;
  private queuedWaypoints: Phaser.Math.Vector2[];
  private targetRotation: number | null;

  private readonly unitBody: Phaser.GameObjects.Rectangle;
  private readonly facingArrow: Phaser.GameObjects.Triangle;
  private readonly healthBoxBg: Phaser.GameObjects.Rectangle;
  private readonly healthBoxFill: Phaser.GameObjects.Rectangle;
  private readonly dpsText: Phaser.GameObjects.Text;
  private health: number;
  private currentDpsOutput: number;

  private static readonly BODY_WIDTH: number = GAMEPLAY_CONFIG.unit.bodyWidth;
  private static readonly BODY_HEIGHT: number = GAMEPLAY_CONFIG.unit.bodyHeight;
  private static readonly OUTLINE_WIDTH = 2;
  private static readonly HEALTH_BOX_WIDTH = 20;
  private static readonly HEALTH_BOX_HEIGHT = 4;
  private static readonly HEALTH_BOX_TOP_INSET = 3;
  private static readonly HEALTH_MAX: number = GAMEPLAY_CONFIG.unit.healthMax;
  private static readonly HEALTH_RED_THRESHOLD: number =
    GAMEPLAY_CONFIG.unit.healthRedThreshold;
  private static readonly HEALTH_BOX_INNER_WIDTH = Unit.HEALTH_BOX_WIDTH - 2;
  private static readonly HEALTH_BOX_INNER_HEIGHT = Unit.HEALTH_BOX_HEIGHT - 2;
  private static readonly ARROW_VERTICES = [
    { x: -5, y: 3 },
    { x: 0, y: -5 },
    { x: 5, y: 3 },
  ] as const;

  // Local forward is drawn upward in unit space.
  private static readonly FORWARD_OFFSET =
    GAMEPLAY_CONFIG.movement.unitForwardOffsetRadians;
  private static readonly REFACE_ANGLE_THRESHOLD =
    GAMEPLAY_CONFIG.movement.refaceAngleThresholdRadians;
  private static readonly WAYPOINT_MOVE_ANGLE_TOLERANCE =
    GAMEPLAY_CONFIG.movement.waypointMoveAngleToleranceRadians;
  private static readonly MIN_WAYPOINT_DISTANCE =
    GAMEPLAY_CONFIG.movement.minWaypointDistance;
  private static readonly DEFAULT_MOVEMENT_COMMAND_MODE: MovementCommandMode = {
    speedMultiplier: 1,
    rotateToFace: true,
  };
  private static readonly TEAM_FILL_COLORS: Record<Team, number> = {
    [Team.RED]: 0xa05555,
    [Team.BLUE]: 0x4e6f9e,
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    team: Team,
    rotation = 0,
    health = Unit.HEALTH_MAX,
  ) {
    super(scene, x, y);

    this.selected = false;
    this.engagedUnits = new Set();
    this.previouslyEngagedUnits = new Set();
    this.team = team;
    this.speed = GAMEPLAY_CONFIG.movement.unitMoveSpeed;
    this.turnSpeed = GAMEPLAY_CONFIG.movement.unitTurnSpeedRadians;
    this.movementCommandMode = { ...Unit.DEFAULT_MOVEMENT_COMMAND_MODE };
    this.destination = null;
    this.queuedWaypoints = [];
    this.targetRotation = null;
    this.health = Phaser.Math.Clamp(health, 0, Unit.HEALTH_MAX);
    this.currentDpsOutput = 0;
    this.rotation = rotation;

    // Rectangle source-of-truth: centered at local (0,0).
    this.unitBody = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      Unit.BODY_WIDTH,
      Unit.BODY_HEIGHT,
      Unit.TEAM_FILL_COLORS[this.team],
    );
    this.unitBody.setOrigin(0.5, 0.5);
    this.unitBody.setStrokeStyle(Unit.OUTLINE_WIDTH, 0x222222, 0.8);
    this.unitBody.setInteractive({ cursor: 'pointer' });
    this.unitBody.setData('unit', this);

    const [v1, v2, v3] = Unit.ARROW_VERTICES;
    const centroidX = (v1.x + v2.x + v3.x) / 3;
    const centroidY = (v1.y + v2.y + v3.y) / 3;
    const r1 = { x: v1.x - centroidX, y: v1.y - centroidY };
    const r2 = { x: v2.x - centroidX, y: v2.y - centroidY };
    const r3 = { x: v3.x - centroidX, y: v3.y - centroidY };

    // Rebased triangle is placed at local (0,0), matching rectangle center.
    this.facingArrow = new Phaser.GameObjects.Triangle(
      scene,
      0,
      0,
      r1.x,
      r1.y,
      r2.x,
      r2.y,
      r3.x,
      r3.y,
      0x1f1f1f,
    );
    // Vertices are centroid-rebased, so (0,0) is the triangle center of mass.
    this.facingArrow.setDisplayOrigin(0, 0);
    this.facingArrow.setStrokeStyle(1, 0x222222, 1);

    this.healthBoxBg = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      -(Unit.BODY_HEIGHT * 0.5) + Unit.HEALTH_BOX_TOP_INSET,
      Unit.HEALTH_BOX_WIDTH,
      Unit.HEALTH_BOX_HEIGHT,
      0x1a1a1a,
    );
    this.healthBoxBg.setOrigin(0.5, 0.5);
    this.healthBoxBg.setStrokeStyle(1, 0xffffff, 0.7);

    this.healthBoxFill = new Phaser.GameObjects.Rectangle(
      scene,
      -(Unit.HEALTH_BOX_WIDTH * 0.5) + 1,
      this.healthBoxBg.y,
      Unit.HEALTH_BOX_INNER_WIDTH,
      Unit.HEALTH_BOX_INNER_HEIGHT,
      0x63d471,
    );
    this.healthBoxFill.setOrigin(0, 0.5);

    this.dpsText = new Phaser.GameObjects.Text(
      scene,
      0,
      Unit.BODY_HEIGHT * 0.5 - 6,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
      },
    );
    this.dpsText.setOrigin(0.5, 0.5);

    this.add([
      this.unitBody,
      this.facingArrow,
      this.healthBoxBg,
      this.healthBoxFill,
      this.dpsText,
    ]);

    scene.add.existing(this);
    this.refreshHealthVisuals();
    this.refreshDpsOutputVisual();
  }

  public static fromGameObject(
    gameObject: Phaser.GameObjects.GameObject,
  ): Unit | null {
    if (gameObject instanceof Unit) {
      return gameObject;
    }

    const withData = gameObject as Phaser.GameObjects.GameObject & {
      getData?: (key: string) => unknown;
    };
    if (!withData.getData) {
      return null;
    }

    const owner = withData.getData('unit');
    return owner instanceof Unit ? owner : null;
  }

  public setSelected(isSelected: boolean): void {
    this.selected = isSelected;
    this.unitBody.setStrokeStyle(
      Unit.OUTLINE_WIDTH,
      isSelected ? 0xffffff : 0x222222,
      1,
    );
  }

  public setDestination(
    x: number,
    y: number,
    movementCommandMode?: Partial<MovementCommandMode>,
  ): void {
    this.setPath([new Phaser.Math.Vector2(x, y)], movementCommandMode);
  }

  public setPath(
    path: Phaser.Math.Vector2[],
    movementCommandMode?: Partial<MovementCommandMode>,
  ): void {
    if (path.length === 0) {
      this.cancelMovement();
      return;
    }

    this.movementCommandMode = {
      ...Unit.DEFAULT_MOVEMENT_COMMAND_MODE,
      ...movementCommandMode,
    };

    let firstUsableWaypointIndex = 0;
    while (firstUsableWaypointIndex < path.length) {
      const waypoint = path[firstUsableWaypointIndex];
      const distanceToWaypoint = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        waypoint.x,
        waypoint.y,
      );
      if (distanceToWaypoint >= Unit.MIN_WAYPOINT_DISTANCE) {
        break;
      }
      firstUsableWaypointIndex += 1;
    }

    const usablePath = path.slice(firstUsableWaypointIndex);
    if (usablePath.length === 0) {
      this.cancelMovement();
      return;
    }

    const [first, ...rest] = usablePath;
    this.destination = first.clone();
    this.queuedWaypoints = rest.map((point) => point.clone());
    this.faceCurrentDestination();
  }

  public cancelMovement(): void {
    this.destination = null;
    this.queuedWaypoints = [];
    this.targetRotation = null;
    this.movementCommandMode = { ...Unit.DEFAULT_MOVEMENT_COMMAND_MODE };
  }

  public resetCurrentDpsOutput(): void {
    this.currentDpsOutput = 0;
    this.previouslyEngagedUnits.clear();
    for (const engagedUnit of this.engagedUnits) {
      this.previouslyEngagedUnits.add(engagedUnit);
    }
    this.engagedUnits.clear();
    this.refreshDpsOutputVisual();
  }

  public wasEngagedWith(unit: Unit): boolean {
    return this.previouslyEngagedUnits.has(unit);
  }

  public applyContactDamage(damagePerSecond: number, deltaSeconds: number): void {
    if (damagePerSecond <= 0 || deltaSeconds <= 0 || this.health <= 0) {
      return;
    }

    this.currentDpsOutput += damagePerSecond;
    this.health = Math.max(0, this.health - damagePerSecond * deltaSeconds);
    this.refreshHealthVisuals();
    this.refreshDpsOutputVisual();
  }

  public isAlive(): boolean {
    return this.health > 0;
  }

  public isHealthInRedZone(): boolean {
    return this.getHealthRatio() <= Unit.HEALTH_RED_THRESHOLD;
  }

  public setHealth(health: number): void {
    this.health = Phaser.Math.Clamp(health, 0, Unit.HEALTH_MAX);
    this.refreshHealthVisuals();
  }

  private faceCurrentDestination(): void {
    if (!this.destination) {
      this.targetRotation = null;
      return;
    }

    if (!this.movementCommandMode.rotateToFace) {
      this.targetRotation = null;
      return;
    }

    const angleToTarget = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.destination.x,
      this.destination.y,
    );
    this.targetRotation = angleToTarget - Unit.FORWARD_OFFSET;
  }

  public updateCombatRotation(deltaMs: number): void {
    if (this.engagedUnits.size === 0) {
      return;
    }

    const target = this.engagedUnits.values().next().value;
    if (!target) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const desiredRotation = targetAngle - Unit.FORWARD_OFFSET;

    const angleDelta = Phaser.Math.Angle.Wrap(desiredRotation - this.rotation);
    const maxTurnStep = this.turnSpeed * deltaSeconds;

    if (Math.abs(angleDelta) <= maxTurnStep) {
      this.rotation = desiredRotation;
    } else {
      this.rotation = Phaser.Math.Angle.Wrap(
        this.rotation + Math.sign(angleDelta) * maxTurnStep,
      );
    }
  }

  public updateMovement(deltaMs: number): void {
    if (!this.destination) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const maxStep =
      this.speed * this.movementCommandMode.speedMultiplier * deltaSeconds;

    if (this.movementCommandMode.rotateToFace) {
      const desiredRotation =
        Phaser.Math.Angle.Between(
          this.x,
          this.y,
          this.destination.x,
          this.destination.y,
        ) - Unit.FORWARD_OFFSET;

      // Collision separation can shove a unit sideways. If its heading drifts
      // away from the current waypoint, re-enter rotate state before moving.
      if (this.targetRotation === null) {
        const headingError = Phaser.Math.Angle.Wrap(desiredRotation - this.rotation);
        if (Math.abs(headingError) > Unit.REFACE_ANGLE_THRESHOLD) {
          this.targetRotation = desiredRotation;
        }
      }

      if (this.targetRotation !== null) {
        const maxTurnStep = this.turnSpeed * deltaSeconds;
        const angleDelta = Phaser.Math.Angle.Wrap(this.targetRotation - this.rotation);

        if (Math.abs(angleDelta) <= maxTurnStep) {
          this.rotation = this.targetRotation;
          this.targetRotation = null;
        } else {
          this.rotation = Phaser.Math.Angle.Wrap(
            this.rotation + Math.sign(angleDelta) * maxTurnStep,
          );
        }
      }

      // Move only after unit has finished turning to face the destination.
      // We allow movement if the heading is "close enough" to prevent stuttering in crowds.
      const isFacingDestination =
        this.targetRotation === null ||
        Math.abs(Phaser.Math.Angle.Wrap(this.targetRotation - this.rotation)) <=
          Unit.WAYPOINT_MOVE_ANGLE_TOLERANCE;

      if (!isFacingDestination) {
        return;
      }
    }

    let remainingStep = maxStep;
    while (this.destination && remainingStep > 0) {
      const toTargetX = this.destination.x - this.x;
      const toTargetY = this.destination.y - this.y;
      const distance = Math.hypot(toTargetX, toTargetY);

      if (distance <= remainingStep) {
        this.setPosition(this.destination.x, this.destination.y);
        remainingStep -= distance;

        const nextDestination = this.queuedWaypoints.shift() ?? null;
        this.destination = nextDestination;
        this.faceCurrentDestination();

        if (!this.destination) {
          return;
        }

        if (this.movementCommandMode.rotateToFace && this.targetRotation !== null) {
          const headingError = Math.abs(
            Phaser.Math.Angle.Wrap(this.targetRotation - this.rotation),
          );
          if (headingError > Unit.WAYPOINT_MOVE_ANGLE_TOLERANCE) {
            return;
          }
        }
        continue;
      }

      const stepScale = remainingStep / distance;
      const stepX = toTargetX * stepScale;
      const stepY = toTargetY * stepScale;
      this.setPosition(this.x + stepX, this.y + stepY);
      return;
    }
  }

  public getDestination(): Phaser.Math.Vector2 | null {
    return this.destination ? this.destination.clone() : null;
  }

  public getWaypoints(): Phaser.Math.Vector2[] {
    const waypoints: Phaser.Math.Vector2[] = [];
    if (this.destination) {
      waypoints.push(this.destination.clone());
    }
    for (const point of this.queuedWaypoints) {
      waypoints.push(point.clone());
    }
    return waypoints;
  }

  public getHitbox(): UnitHitbox {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    return {
      center: new Phaser.Math.Vector2(this.x, this.y),
      axisX: new Phaser.Math.Vector2(cos, sin),
      axisY: new Phaser.Math.Vector2(-sin, cos),
      halfWidth: Unit.BODY_WIDTH * 0.5,
      halfHeight: Unit.BODY_HEIGHT * 0.5,
    };
  }

  private refreshHealthVisuals(): void {
    const healthRatio = this.getHealthRatio();
    this.healthBoxFill.setDisplaySize(
      Unit.HEALTH_BOX_INNER_WIDTH * healthRatio,
      Unit.HEALTH_BOX_INNER_HEIGHT,
    );
    this.healthBoxFill.setFillStyle(
      healthRatio > Unit.HEALTH_RED_THRESHOLD ? 0x63d471 : 0xd44b4b,
    );
    this.healthBoxFill.setVisible(healthRatio > 0);
  }

  private getHealthRatio(): number {
    return Phaser.Math.Clamp(this.health / Unit.HEALTH_MAX, 0, 1);
  }

  private refreshDpsOutputVisual(): void {
    if (this.currentDpsOutput <= 0) {
      this.dpsText.setText('');
      return;
    }

    this.dpsText.setText(`${Math.round(this.currentDpsOutput)} DPS`);
  }
}
