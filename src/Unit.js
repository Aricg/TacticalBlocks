import Phaser from 'phaser';

export class Unit extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, 48, 28, 0xd6c79e);

    this.scene = scene;
    this.selected = false;
    this.speed = 120; // Pixels per second.
    this.destination = null;

    this.setOrigin(0.5);
    this.setInteractive({ cursor: 'pointer' });
    this.setStrokeStyle(2, 0x222222, 0.8);

    scene.add.existing(this);
  }

  setSelected(isSelected) {
    this.selected = isSelected;
    this.setStrokeStyle(2, isSelected ? 0xffffff : 0x222222, 1);
  }

  setDestination(x, y) {
    this.destination = new Phaser.Math.Vector2(x, y);

    // Calculate angle to target so the block faces its move direction.
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.rotation = angleToTarget;
  }

  update(deltaMs) {
    if (!this.destination) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const toTarget = new Phaser.Math.Vector2(
      this.destination.x - this.x,
      this.destination.y - this.y,
    );

    const distance = toTarget.length();
    const maxStep = this.speed * deltaSeconds;

    if (distance <= maxStep) {
      this.setPosition(this.destination.x, this.destination.y);
      this.destination = null;
      return;
    }

    const step = toTarget.normalize().scale(maxStep);
    this.setPosition(this.x + step.x, this.y + step.y);
  }
}
