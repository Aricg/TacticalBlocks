import Phaser from 'phaser';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';

export type InfluenceGridSnapshot = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  revision: number;
  cells: number[];
};

export class InfluenceRenderer {
  private readonly frontLineGraphics: Phaser.GameObjects.Graphics;
  private influenceGrid: InfluenceGridSnapshot | null = null;

  private static readonly EPSILON = 0.0001;

  constructor(scene: Phaser.Scene) {
    this.frontLineGraphics = scene.add.graphics();
    this.frontLineGraphics.setDepth(910);
  }

  public setInfluenceGrid(influenceGrid: InfluenceGridSnapshot): void {
    if (influenceGrid.cells.length !== influenceGrid.width * influenceGrid.height) {
      return;
    }

    this.influenceGrid = {
      width: influenceGrid.width,
      height: influenceGrid.height,
      cellWidth: influenceGrid.cellWidth,
      cellHeight: influenceGrid.cellHeight,
      revision: influenceGrid.revision,
      cells: influenceGrid.cells.slice(),
    };
  }

  public render(): void {
    this.frontLineGraphics.clear();
    if (!this.influenceGrid) {
      return;
    }

    const frontLinePoints = this.buildFrontLinePoints(this.influenceGrid);
    if (frontLinePoints.length < 2) {
      return;
    }

    const smoothedPoints = this.smoothPoints(frontLinePoints);
    this.frontLineGraphics.lineStyle(
      GAMEPLAY_CONFIG.influence.lineThickness,
      GAMEPLAY_CONFIG.influence.lineColor,
      GAMEPLAY_CONFIG.influence.lineAlpha,
    );
    this.frontLineGraphics.beginPath();
    this.frontLineGraphics.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);
    for (let i = 1; i < smoothedPoints.length; i += 1) {
      this.frontLineGraphics.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
    }
    this.frontLineGraphics.strokePath();
  }

  public destroy(): void {
    this.frontLineGraphics.destroy();
    this.influenceGrid = null;
  }

  private buildFrontLinePoints(influenceGrid: InfluenceGridSnapshot): Phaser.Math.Vector2[] {
    const points: Phaser.Math.Vector2[] = [];
    const mapCenterX = (influenceGrid.width * influenceGrid.cellWidth) * 0.5;
    let previousX: number | null = null;

    for (let row = 0; row < influenceGrid.height; row += 1) {
      const rowCrossings = this.findRowCrossings(influenceGrid, row);
      if (rowCrossings.length === 0) {
        continue;
      }

      const targetX = previousX ?? mapCenterX;
      let chosenX = rowCrossings[0];
      let bestDistance = Math.abs(chosenX - targetX);

      for (let i = 1; i < rowCrossings.length; i += 1) {
        const candidateX = rowCrossings[i];
        const distance = Math.abs(candidateX - targetX);
        if (distance < bestDistance) {
          chosenX = candidateX;
          bestDistance = distance;
        }
      }

      points.push(
        new Phaser.Math.Vector2(
          chosenX,
          (row + 0.5) * influenceGrid.cellHeight,
        ),
      );
      previousX = chosenX;
    }

    return points;
  }

  private findRowCrossings(influenceGrid: InfluenceGridSnapshot, row: number): number[] {
    const crossings: number[] = [];
    for (let col = 0; col < influenceGrid.width - 1; col += 1) {
      const leftScore = this.getInfluenceValue(influenceGrid, col, row);
      const rightScore = this.getInfluenceValue(influenceGrid, col + 1, row);
      const edgeT = this.getZeroCrossingT(leftScore, rightScore);
      if (edgeT === null) {
        continue;
      }

      const leftCenterX = (col + 0.5) * influenceGrid.cellWidth;
      const rightCenterX = (col + 1.5) * influenceGrid.cellWidth;
      crossings.push(Phaser.Math.Linear(leftCenterX, rightCenterX, edgeT));
    }

    return crossings;
  }

  private smoothPoints(points: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    if (points.length < 3) {
      return points;
    }

    const spline = new Phaser.Curves.Spline(points);
    const interpolationPointCount = Math.max(
      points.length * GAMEPLAY_CONFIG.influence.splineDensityMultiplier,
      points.length,
    );
    return spline.getPoints(interpolationPointCount);
  }

  private getInfluenceValue(
    influenceGrid: InfluenceGridSnapshot,
    col: number,
    row: number,
  ): number {
    return influenceGrid.cells[row * influenceGrid.width + col] ?? 0;
  }

  private getZeroCrossingT(leftValue: number, rightValue: number): number | null {
    if (Math.abs(leftValue) < InfluenceRenderer.EPSILON) {
      return 0;
    }
    if (Math.abs(rightValue) < InfluenceRenderer.EPSILON) {
      return 1;
    }
    if ((leftValue < 0) === (rightValue < 0)) {
      return null;
    }

    const denominator = leftValue - rightValue;
    if (Math.abs(denominator) < InfluenceRenderer.EPSILON) {
      return 0.5;
    }

    return Phaser.Math.Clamp(leftValue / denominator, 0, 1);
  }
}
