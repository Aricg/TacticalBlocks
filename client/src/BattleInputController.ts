import Phaser from 'phaser';
import { Unit } from './Unit';

type BattleInputCallbacks = {
  isBattleActive: () => boolean;
  resolveOwnedUnit: (gameObject: Phaser.GameObjects.GameObject) => Unit | null;
  isUnitSelected: (unit: Unit) => boolean;
  hasSelectedUnits: () => boolean;
  selectOnlyUnit: (unit: Unit) => void;
  clearSelection: () => void;
  commandSelectedUnits: (targetX: number, targetY: number, shiftHeld: boolean) => void;
  commandSelectedUnitsAlongPath: (
    path: Phaser.Math.Vector2[],
    shiftHeld: boolean,
  ) => void;
  selectUnitsInBox: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => void;
  drawSelectionBox: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ) => void;
  clearSelectionBox: () => void;
  appendDraggedPathPoint: (
    draggedPath: Phaser.Math.Vector2[],
    x: number,
    y: number,
    forceAppend?: boolean,
  ) => void;
  drawPathPreview: (draggedPath: Phaser.Math.Vector2[]) => void;
  clearPathPreview: () => void;
  buildCommandPath: (path: Phaser.Math.Vector2[]) => Phaser.Math.Vector2[];
  cancelSelectedUnitMovement: () => void;
  engageSelectedUnitMovement: () => void;
  isShiftHeld: (pointer: Phaser.Input.Pointer) => boolean;
  clearAllQueuedMovement: () => void;
};

type BattleInputConfig = {
  dragThreshold: number;
};

export class BattleInputController {
  private suppressCommandOnPointerUp = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private pathDragStart: Phaser.Math.Vector2 | null = null;
  private pathDragStartedOnUnit = false;
  private boxSelecting = false;
  private pathDrawing = false;
  private draggedPath: Phaser.Math.Vector2[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly callbacks: BattleInputCallbacks,
    private readonly config: BattleInputConfig,
  ) {
    this.scene.input.on('gameobjectdown', this.handleGameObjectDown);
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.keyboard?.on('keydown-SPACE', this.handleKeyDownSpace);
    this.scene.input.keyboard?.on('keydown-ESC', this.handleKeyDownEsc);
  }

  public reset(): void {
    this.suppressCommandOnPointerUp = false;
    this.dragStart = null;
    this.pathDragStart = null;
    this.pathDragStartedOnUnit = false;
    this.boxSelecting = false;
    this.pathDrawing = false;
    this.draggedPath = [];
    this.callbacks.clearSelectionBox();
    this.callbacks.clearPathPreview();
  }

  public destroy(): void {
    this.scene.input.off('gameobjectdown', this.handleGameObjectDown);
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.keyboard?.off('keydown-SPACE', this.handleKeyDownSpace);
    this.scene.input.keyboard?.off('keydown-ESC', this.handleKeyDownEsc);
    this.reset();
  }

  private readonly handleGameObjectDown = (
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    event: Phaser.Types.Input.EventData,
  ): void => {
    if (!this.callbacks.isBattleActive() || pointer.button !== 0) {
      return;
    }

    const clickedUnit = this.callbacks.resolveOwnedUnit(gameObject);
    if (!clickedUnit) {
      return;
    }

    if (this.callbacks.isUnitSelected(clickedUnit)) {
      this.pathDragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.pathDragStartedOnUnit = true;
      this.pathDrawing = false;
      this.draggedPath = [this.pathDragStart.clone()];
      this.callbacks.clearPathPreview();
    } else {
      this.callbacks.selectOnlyUnit(clickedUnit);
      this.suppressCommandOnPointerUp = true;
      this.pathDragStart = null;
      this.pathDragStartedOnUnit = false;
      this.pathDrawing = false;
      this.draggedPath = [];
      this.callbacks.clearPathPreview();
    }

    event.stopPropagation();
  };

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }

    if (pointer.button === 2) {
      this.callbacks.cancelSelectedUnitMovement();
      return;
    }

    if (pointer.button !== 0 || this.suppressCommandOnPointerUp) {
      return;
    }

    if (this.callbacks.hasSelectedUnits()) {
      if (!this.pathDragStart) {
        this.pathDragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        this.pathDragStartedOnUnit = false;
        this.pathDrawing = false;
        this.draggedPath = [this.pathDragStart.clone()];
        this.callbacks.clearPathPreview();
      }
      return;
    }

    this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    this.boxSelecting = false;
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }

    if (this.pathDragStart) {
      if (!pointer.leftButtonDown()) {
        return;
      }

      if (!this.pathDrawing) {
        const dragDistance = Phaser.Math.Distance.Between(
          this.pathDragStart.x,
          this.pathDragStart.y,
          pointer.worldX,
          pointer.worldY,
        );
        if (dragDistance >= this.config.dragThreshold) {
          this.pathDrawing = true;
          this.callbacks.appendDraggedPathPoint(
            this.draggedPath,
            pointer.worldX,
            pointer.worldY,
            true,
          );
        }
      }

      if (this.pathDrawing) {
        this.callbacks.appendDraggedPathPoint(
          this.draggedPath,
          pointer.worldX,
          pointer.worldY,
        );
        this.callbacks.drawPathPreview(this.draggedPath);
      }
      return;
    }

    if (this.dragStart && pointer.leftButtonDown()) {
      const dragDistance = Phaser.Math.Distance.Between(
        this.dragStart.x,
        this.dragStart.y,
        pointer.worldX,
        pointer.worldY,
      );
      if (!this.boxSelecting && dragDistance >= this.config.dragThreshold) {
        this.boxSelecting = true;
      }

      if (this.boxSelecting) {
        this.callbacks.drawSelectionBox(
          this.dragStart.x,
          this.dragStart.y,
          pointer.worldX,
          pointer.worldY,
        );
      }
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive() || pointer.button !== 0) {
      return;
    }

    if (this.pathDragStart) {
      this.pathDragStart = null;

      if (this.pathDrawing) {
        const commandPath = this.callbacks.buildCommandPath(this.draggedPath);
        if (commandPath.length > 1) {
          this.callbacks.commandSelectedUnitsAlongPath(
            commandPath,
            this.callbacks.isShiftHeld(pointer),
          );
        }
      } else if (!this.pathDragStartedOnUnit) {
        this.callbacks.clearSelection();
      }

      this.pathDragStartedOnUnit = false;
      this.pathDrawing = false;
      this.draggedPath = [];
      this.callbacks.clearPathPreview();
      return;
    }

    if (this.suppressCommandOnPointerUp) {
      this.suppressCommandOnPointerUp = false;
      this.pathDragStartedOnUnit = false;
      return;
    }

    if (this.boxSelecting && this.dragStart) {
      this.callbacks.selectUnitsInBox(
        this.dragStart.x,
        this.dragStart.y,
        pointer.worldX,
        pointer.worldY,
      );
      this.callbacks.clearSelectionBox();
      this.dragStart = null;
      this.boxSelecting = false;
      return;
    }

    if (this.dragStart) {
      this.callbacks.clearSelectionBox();
      this.dragStart = null;
      this.boxSelecting = false;
      this.callbacks.clearSelection();
    }
  };

  private readonly handleKeyDownSpace = (): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.callbacks.engageSelectedUnitMovement();
  };

  private readonly handleKeyDownEsc = (): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.callbacks.clearAllQueuedMovement();
  };
}
