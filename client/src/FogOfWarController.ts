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
  forestEnemyRevealDistanceSquares: number;
  supplyCellWidth: number;
  supplyCellHeight: number;
};

export class FogOfWarController {
  private readonly layer: Phaser.GameObjects.RenderTexture;
  private readonly unitVisionBrush: Phaser.GameObjects.Arc;
  private readonly cityVisionBrush: Phaser.GameObjects.Arc;
  private readonly supplyVisionBrush: Phaser.GameObjects.Rectangle;
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
    this.supplyVisionBrush = scene.add.rectangle(
      0,
      0,
      Math.max(1, this.config.supplyCellWidth),
      Math.max(1, this.config.supplyCellHeight),
      0xffffff,
      1,
    );
    this.supplyVisionBrush.setVisible(false);
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
    supplyVisionPositions: Phaser.Math.Vector2[],
  ): void {
    this.layer.clear();
    this.layer.fill(this.config.shroudColor, this.config.shroudAlpha);

    const allyVisionSources = units.filter(
      (unit) => unit.team === localPlayerTeam && unit.isAlive(),
    );
    const allyUnitVisionCells = allyVisionSources.map((unit) =>
      this.resolveGridCell(unit.x, unit.y),
    );

    for (const unit of allyVisionSources) {
      this.layer.erase(this.unitVisionBrush, unit.x, unit.y);
    }

    for (const cityPosition of allyCityPositions) {
      this.layer.erase(this.cityVisionBrush, cityPosition.x, cityPosition.y);
    }

    for (const supplyPosition of supplyVisionPositions) {
      this.layer.erase(this.supplyVisionBrush, supplyPosition.x, supplyPosition.y);
    }

    const supplyRevealRadius =
      Math.max(this.config.supplyCellWidth, this.config.supplyCellHeight) * 0.5;
    const visibilitySources: Array<{
      x: number;
      y: number;
      radius: number;
      cellCol: number;
      cellRow: number;
    }> = [
      ...allyVisionSources.map((unit) => ({
        x: unit.x,
        y: unit.y,
        radius: this.unitVisionRadius,
        ...this.resolveGridCell(unit.x, unit.y),
      })),
      ...allyCityPositions.map((cityPosition) => ({
        x: cityPosition.x,
        y: cityPosition.y,
        radius: this.cityVisionRadius,
        ...this.resolveGridCell(cityPosition.x, cityPosition.y),
      })),
      ...supplyVisionPositions.map((supplyPosition) => ({
        x: supplyPosition.x,
        y: supplyPosition.y,
        radius: supplyRevealRadius,
        ...this.resolveGridCell(supplyPosition.x, supplyPosition.y),
      })),
    ];
    const forestRevealDistanceSquares = Math.max(
      0,
      this.config.forestEnemyRevealDistanceSquares,
    );

    for (const unit of units) {
      if (unit.team === localPlayerTeam) {
        unit.setVisible(true);
        continue;
      }

      if (unit.getTerrainType() === 'forest') {
        const { cellCol, cellRow } = this.resolveGridCell(unit.x, unit.y);
        const canRevealForestedUnit = allyUnitVisionCells.some((sourceCell) => {
          const colDistance = Math.abs(sourceCell.cellCol - cellCol);
          const rowDistance = Math.abs(sourceCell.cellRow - cellRow);
          return (
            Math.max(colDistance, rowDistance) <= forestRevealDistanceSquares
          );
        });
        unit.setVisible(canRevealForestedUnit);
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

  private resolveGridCell(
    worldX: number,
    worldY: number,
  ): { cellCol: number; cellRow: number } {
    const safeCellWidth = Math.max(1, this.config.supplyCellWidth);
    const safeCellHeight = Math.max(1, this.config.supplyCellHeight);
    const maxCol = Math.max(
      0,
      Math.round(this.config.mapWidth / safeCellWidth) - 1,
    );
    const maxRow = Math.max(
      0,
      Math.round(this.config.mapHeight / safeCellHeight) - 1,
    );
    const cellCol = Phaser.Math.Clamp(
      Math.floor(worldX / safeCellWidth),
      0,
      maxCol,
    );
    const cellRow = Phaser.Math.Clamp(
      Math.floor(worldY / safeCellHeight),
      0,
      maxRow,
    );
    return { cellCol, cellRow };
  }

  public destroy(): void {
    this.layer.destroy();
    this.unitVisionBrush.destroy();
    this.cityVisionBrush.destroy();
    this.supplyVisionBrush.destroy();
  }
}
