import Phaser from 'phaser';

export class Unit extends Phaser.GameObjects.Container {
  public selected: boolean;
  private readonly speed: number;
  private readonly turnSpeed: number;
  private destination: Phaser.Math.Vector2 | null;
  private targetRotation: number | null;
  private readonly unitBody: Phaser.GameObjects.Rectangle;
  private static readonly BODY_WIDTH = 48;
  private static readonly BODY_HEIGHT = 28;
  // Local forward is drawn upward in unit space.
  private static readonly FORWARD_OFFSET = -Math.PI / 2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.selected = false;
    this.speed = 120;
    this.turnSpeed = Phaser.Math.DegToRad(180);
    this.destination = null;
    this.targetRotation = null;
    this.unitBody = scene.add.rectangle(
      0,
      0,
      Unit.BODY_WIDTH,
      Unit.BODY_HEIGHT,
      0xd6c79e,
    );
    const arrowOffsetY = -Unit.BODY_HEIGHT * 0.5 - 2;
    const facingArrow = scene.add.triangle(
      0,
      arrowOffsetY,
      0,
      -10,
      -8,
      8,
      8,
      8,
      0x1f1f1f,
    );

    this.unitBody.setStrokeStyle(2, 0x222222, 0.8);
    this.add([this.unitBody, facingArrow]);

    this.setSize(Unit.BODY_WIDTH, Unit.BODY_HEIGHT);
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -Unit.BODY_WIDTH * 0.5,
        -Unit.BODY_HEIGHT * 0.5,
        Unit.BODY_WIDTH,
        Unit.BODY_HEIGHT,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.input) {
      this.input.cursor = 'pointer';
    }

    scene.add.existing(this);
  }

  public setSelected(isSelected: boolean): void {
    this.selected = isSelected;
    this.unitBody.setStrokeStyle(2, isSelected ? 0xffffff : 0x222222, 1);
  }

  public setDestination(x: number, y: number): void {
    this.destination = new Phaser.Math.Vector2(x, y);

    // Calculate angle to target so the block faces its move direction.
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
