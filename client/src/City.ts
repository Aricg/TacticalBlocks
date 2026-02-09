import Phaser from 'phaser';

export class City extends Phaser.GameObjects.Container {
  private readonly marker: Phaser.GameObjects.Star;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y);

    this.marker = new Phaser.GameObjects.Star(
      scene,
      0,
      0,
      5,
      8,
      18,
      0xe6c84d,
      1,
    );
    this.marker.setStrokeStyle(2, 0x3a320f, 0.95);

    this.label = new Phaser.GameObjects.Text(scene, 0, 28, name, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e8dfb7',
    });
    this.label.setOrigin(0.5, 0.5);

    this.add([this.marker, this.label]);
    this.setDepth(120);
    scene.add.existing(this);
  }
}
