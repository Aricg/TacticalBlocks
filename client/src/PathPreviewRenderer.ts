import Phaser from 'phaser';

type PathPreviewRendererConfig = {
  depth: number;
  previewPointSpacing: number;
  lineThickness: number;
  lineColor: number;
  lineAlpha: number;
};

export class PathPreviewRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly config: PathPreviewRendererConfig,
  ) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(this.config.depth);
  }

  public clear(): void {
    this.graphics.clear();
  }

  public appendDraggedPathPoint(
    draggedPath: Phaser.Math.Vector2[],
    x: number,
    y: number,
    forceAppend = false,
  ): void {
    const nextPoint = new Phaser.Math.Vector2(x, y);
    const lastPoint = draggedPath[draggedPath.length - 1];
    if (!lastPoint || forceAppend || draggedPath.length === 1) {
      draggedPath.push(nextPoint);
      return;
    }

    const distance = Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, x, y);
    if (distance < this.config.previewPointSpacing) {
      draggedPath[draggedPath.length - 1] = nextPoint;
      return;
    }

    const segmentCount = Math.floor(distance / this.config.previewPointSpacing);
    for (let i = 1; i <= segmentCount; i += 1) {
      const t = (i * this.config.previewPointSpacing) / distance;
      if (t >= 1) {
        break;
      }
      draggedPath.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(lastPoint.x, x, t),
          Phaser.Math.Linear(lastPoint.y, y, t),
        ),
      );
    }

    draggedPath.push(nextPoint);
  }

  public drawPathPreview(path: Phaser.Math.Vector2[]): void {
    this.clear();
    if (path.length < 2) {
      return;
    }

    this.graphics.lineStyle(
      this.config.lineThickness,
      this.config.lineColor,
      this.config.lineAlpha,
    );
    this.graphics.beginPath();
    this.graphics.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i += 1) {
      this.graphics.lineTo(path[i].x, path[i].y);
    }
    this.graphics.strokePath();
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
