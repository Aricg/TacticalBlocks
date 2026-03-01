import Phaser from 'phaser';
import type { FormationLineAssignment } from './UnitCommandPlanner';

type SelectionOverlayRendererConfig = {
  selectionBoxDepth: number;
  selectionFillColor: number;
  selectionFillAlpha: number;
  selectionStrokeWidth: number;
  selectionStrokeColor: number;
  selectionStrokeAlpha: number;
  formationAreaDepth: number;
  formationFillColor: number;
  formationFillAlpha: number;
  formationStrokeWidth: number;
  formationStrokeColor: number;
  formationStrokeAlpha: number;
  formationSlotWidth: number;
  formationSlotHeight: number;
};

export class SelectionOverlayRenderer {
  private readonly selectionBox: Phaser.GameObjects.Graphics;
  private readonly formationAreaPreview: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly config: SelectionOverlayRendererConfig,
  ) {
    this.selectionBox = scene.add.graphics();
    this.selectionBox.setDepth(this.config.selectionBoxDepth);
    this.formationAreaPreview = scene.add.graphics();
    this.formationAreaPreview.setDepth(this.config.formationAreaDepth);
  }

  public clearSelectionBox(): void {
    this.selectionBox.clear();
    this.clearFormationAreaPreview();
  }

  public clearFormationAreaPreview(): void {
    this.formationAreaPreview.clear();
  }

  public drawSelectionBox(
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ): void {
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    this.selectionBox.clear();
    this.selectionBox.fillStyle(
      this.config.selectionFillColor,
      this.config.selectionFillAlpha,
    );
    this.selectionBox.lineStyle(
      this.config.selectionStrokeWidth,
      this.config.selectionStrokeColor,
      this.config.selectionStrokeAlpha,
    );
    this.selectionBox.fillRect(minX, minY, width, height);
    this.selectionBox.strokeRect(minX, minY, width, height);
  }

  public drawFormationAreaPreview(
    assignments: ReadonlyArray<FormationLineAssignment>,
  ): void {
    this.formationAreaPreview.clear();
    if (assignments.length === 0) {
      return;
    }

    const slotWidth = this.config.formationSlotWidth;
    const slotHeight = this.config.formationSlotHeight;
    const halfSlotWidth = slotWidth * 0.5;
    const halfSlotHeight = slotHeight * 0.5;
    this.formationAreaPreview.fillStyle(
      this.config.formationFillColor,
      this.config.formationFillAlpha,
    );
    this.formationAreaPreview.lineStyle(
      this.config.formationStrokeWidth,
      this.config.formationStrokeColor,
      this.config.formationStrokeAlpha,
    );
    for (const assignment of assignments) {
      const x = assignment.slot.x;
      const y = assignment.slot.y;
      this.formationAreaPreview.fillRect(
        x - halfSlotWidth,
        y - halfSlotHeight,
        slotWidth,
        slotHeight,
      );
      this.formationAreaPreview.strokeRect(
        x - halfSlotWidth,
        y - halfSlotHeight,
        slotWidth,
        slotHeight,
      );
    }
  }

  public destroy(): void {
    this.selectionBox.destroy();
    this.formationAreaPreview.destroy();
  }
}
