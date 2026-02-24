import Phaser from 'phaser';
import { Team } from './Team';

export type CityOwner = Team | 'NEUTRAL';

export class City extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly core: Phaser.GameObjects.Arc;
  private owner: CityOwner;
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

    this.add(this.ring);
    this.add(this.core);
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
}
