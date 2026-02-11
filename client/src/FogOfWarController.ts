import Phaser from 'phaser';
import { Team } from './Team';
import { Unit } from './Unit';

type FogOfWarConfig = {
  mapWidth: number;
  mapHeight: number;
  depth: number;
  shroudColor: number;
  shroudAlpha: number;
  enemyVisibilityPadding: number;
};

export class FogOfWarController {
  private readonly layer: Phaser.GameObjects.RenderTexture;
  private readonly unitVisionBrush: Phaser.GameObjects.Arc;
  private readonly cityVisionBrush: Phaser.GameObjects.Arc;
  private unitVisionRadius = 0;
  private cityVisionRadius = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly config: FogOfWarConfig,
  ) {
    this.layer = scene.add.renderTexture(
      0,
      0,
      this.config.mapWidth,
      this.config.mapHeight,
    );
    this.layer.setOrigin(0, 0);
    this.layer.setDepth(this.config.depth);

    this.unitVisionBrush = scene.add.circle(0, 0, 0, 0xffffff, 1);
    this.unitVisionBrush.setVisible(false);
    this.cityVisionBrush = scene.add.circle(0, 0, 0, 0xffffff, 1);
    this.cityVisionBrush.setVisible(false);
  }

  public setVisionRadii(unitVisionRadius: number, cityVisionRadius: number): void {
    this.unitVisionRadius = Math.max(0, unitVisionRadius);
    this.cityVisionRadius = Math.max(0, cityVisionRadius);
    this.unitVisionBrush.setRadius(this.unitVisionRadius);
    this.cityVisionBrush.setRadius(this.cityVisionRadius);
  }

  public refresh(
    localPlayerTeam: Team,
    units: Unit[],
    allyCityPositions: Phaser.Math.Vector2[],
  ): void {
    this.layer.clear();
    this.layer.fill(this.config.shroudColor, this.config.shroudAlpha);

    const allyVisionSources = units.filter(
      (unit) => unit.team === localPlayerTeam && unit.isAlive(),
    );

    for (const unit of allyVisionSources) {
      this.layer.erase(this.unitVisionBrush, unit.x, unit.y);
    }

    for (const cityPosition of allyCityPositions) {
      this.layer.erase(this.cityVisionBrush, cityPosition.x, cityPosition.y);
    }

    const visibilitySources: Array<{ x: number; y: number; radius: number }> = [
      ...allyVisionSources.map((unit) => ({
        x: unit.x,
        y: unit.y,
        radius: this.unitVisionRadius,
      })),
      ...allyCityPositions.map((cityPosition) => ({
        x: cityPosition.x,
        y: cityPosition.y,
        radius: this.cityVisionRadius,
      })),
    ];

    for (const unit of units) {
      if (unit.team === localPlayerTeam) {
        unit.setVisible(true);
        continue;
      }

      let isVisibleToPlayer = false;
      for (const source of visibilitySources) {
        const dx = unit.x - source.x;
        const dy = unit.y - source.y;
        const revealRadius = source.radius + this.config.enemyVisibilityPadding;
        if (dx * dx + dy * dy <= revealRadius * revealRadius) {
          isVisibleToPlayer = true;
          break;
        }
      }
      unit.setVisible(isVisibleToPlayer);
    }
  }

  public destroy(): void {
    this.layer.destroy();
    this.unitVisionBrush.destroy();
    this.cityVisionBrush.destroy();
  }
}
