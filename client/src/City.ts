import Phaser from 'phaser';
import { Team } from './Team';

export class City extends Phaser.GameObjects.Container {
  private readonly marker: Phaser.GameObjects.Star;
  private owner: Team;
  private static readonly TEAM_FILL_COLORS: Record<Team, number> = {
    [Team.RED]: 0xa05555,
    [Team.BLUE]: 0x4e6f9e,
  };

  constructor(scene: Phaser.Scene, x: number, y: number, owner: Team) {
    super(scene, x, y);
    this.owner = owner;

    this.marker = new Phaser.GameObjects.Star(
      scene,
      0,
      0,
      5,
      5,
      12,
      City.TEAM_FILL_COLORS[this.owner],
      1,
    );
    this.marker.setStrokeStyle(1, 0x3a320f, 0.95);

    this.add(this.marker);
    this.setDepth(120);
    scene.add.existing(this);
  }

  public setOwner(nextOwner: Team): void {
    if (nextOwner === this.owner) {
      return;
    }

    this.owner = nextOwner;
    this.marker.setFillStyle(City.TEAM_FILL_COLORS[this.owner], 1);
  }
}
