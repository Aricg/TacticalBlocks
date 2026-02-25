import Phaser from 'phaser';
import { Team } from './Team';

export type CityOwner = Team | 'NEUTRAL';

export class City extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly core: Phaser.GameObjects.Arc;
  private readonly supplyText: Phaser.GameObjects.Text;
  private owner: CityOwner;
  private supply = 0;
  private static readonly TEAM_MARKER_COLORS: Record<CityOwner, number> = {
    [Team.RED]: 0xd06b6b,
    [Team.BLUE]: 0x7298cf,
    NEUTRAL: 0x9f9f9f,
  };
  private static readonly RING_BASE_COLOR = 0x1f1f1f;

  constructor(scene: Phaser.Scene, x: number, y: number, owner: CityOwner) {
    super(scene, x, y);
    this.owner = owner;

    this.ring = new Phaser.GameObjects.Arc(
      scene,
      0,
      0,
      12,
      0,
      360,
      false,
      City.RING_BASE_COLOR,
      0.22,
    );
    this.ring.setStrokeStyle(2, City.TEAM_MARKER_COLORS[this.owner], 0.95);
    this.core = new Phaser.GameObjects.Arc(
      scene,
      0,
      0,
      5,
      0,
      360,
      false,
      City.TEAM_MARKER_COLORS[this.owner],
      0.95,
    );
    this.core.setStrokeStyle(1, 0x242424, 0.9);
    this.supplyText = new Phaser.GameObjects.Text(scene, 0, 19, '0', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f5df8d',
      stroke: '#1b1b1b',
      strokeThickness: 2,
    });
    this.supplyText.setOrigin(0.5, 0.5);

    this.add(this.ring);
    this.add(this.core);
    this.add(this.supplyText);
    this.setDepth(120);
    scene.add.existing(this);
  }

  public setOwner(nextOwner: CityOwner): void {
    if (nextOwner === this.owner) {
      return;
    }

    this.owner = nextOwner;
    this.ring.setStrokeStyle(2, City.TEAM_MARKER_COLORS[this.owner], 0.95);
    this.core.setFillStyle(City.TEAM_MARKER_COLORS[this.owner], 0.95);
  }

  public setSupply(nextSupply: number): void {
    if (!Number.isFinite(nextSupply)) {
      return;
    }
    const normalizedSupply = Math.max(0, Math.floor(nextSupply));
    if (normalizedSupply === this.supply) {
      return;
    }
    this.supply = normalizedSupply;
    this.supplyText.setText(`${this.supply}`);
    this.supplyText.setColor(this.supply > 0 ? '#f5df8d' : '#8f8456');
  }
}
