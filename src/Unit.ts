import Phaser from 'phaser';

export class Unit extends Phaser.GameObjects.Container {
  public selected: boolean;
  private readonly speed: number;
  private readonly turnSpeed: number;
  private destination: Phaser.Math.Vector2 | null;
  private targetRotation: number | null;

  private readonly unitBody: Phaser.GameObjects.Rectangle;
  private readonly facingArrow: Phaser.GameObjects.Triangle;

  private static readonly BODY_WIDTH = 48;
  private static readonly BODY_HEIGHT = 28;
  private static readonly OUTLINE_WIDTH = 2;
  private static readonly ARROW_VERTICES = [
    { x: -10, y: 6 },
    { x: 0, y: -10 },
    { x: 10, y: 6 },
  ] as const;

  // Local forward is drawn upward in unit space.
  private static readonly FORWARD_OFFSET = -Math.PI / 2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.selected = false;
    this.speed = 120;
    this.turnSpeed = Phaser.Math.DegToRad(180);
    this.destination = null;
    this.targetRotation = null;

    // Rectangle source-of-truth: centered at local (0,0).
    this.unitBody = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      Unit.BODY_WIDTH,
      Unit.BODY_HEIGHT,
      0xd6c79e,
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

    this.add([this.unitBody, this.facingArrow]);

    scene.add.existing(this);
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

  public setDestination(x: number, y: number): void {
    this.destination = new Phaser.Math.Vector2(x, y);

    // Calculate angle to target so the unit faces its move direction.
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.targetRotation = angleToTarget - Unit.FORWARD_OFFSET;
  }

  public updateMovement(deltaMs: number): void {
    if (!this.destination) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
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
    if (this.targetRotation !== null) {
      return;
    }

    const toTargetX = this.destination.x - this.x;
    const toTargetY = this.destination.y - this.y;
    const distance = Math.hypot(toTargetX, toTargetY);
    const maxStep = this.speed * deltaSeconds;

    if (distance <= maxStep) {
      this.setPosition(this.destination.x, this.destination.y);
      this.destination = null;
      return;
    }

    // Move along the unit's declared local forward axis.
    const moveAngle = this.rotation + Unit.FORWARD_OFFSET;
    const stepX = Math.cos(moveAngle) * maxStep;
    const stepY = Math.sin(moveAngle) * maxStep;
    this.setPosition(this.x + stepX, this.y + stepY);
  }
}
