import Phaser from 'phaser';
import { Unit } from './Unit';

export type BattleInputCallbacks = {
  isBattleActive: () => boolean;
  resolveOwnedUnit: (gameObject: Phaser.GameObjects.GameObject) => Unit | null;
  isUnitSelected: (unit: Unit) => boolean;
  hasSelectedUnits: () => boolean;
  selectOnlyUnit: (unit: Unit) => void;
  selectAllOwnedUnits: () => void;
  clearSelection: () => void;
  commandSelectedUnits: (targetX: number, targetY: number, shiftHeld: boolean) => void;
  commandSelectedUnitsAlongPath: (
    path: Phaser.Math.Vector2[],
    shiftHeld: boolean,
  ) => void;
  commandSelectedUnitsIntoFormationArea: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    shiftHeld: boolean,
  ) => void;
  commandSelectedUnitsTowardEnemyInfluenceLine: (shiftHeld: boolean) => void;
  commandSelectedUnitsTowardNearestVisibleEnemyUnit: (shiftHeld: boolean) => void;
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
  drawFormationAreaPreview: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ) => void;
  clearFormationAreaPreview: () => void;
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
  isPointerInputBlocked?: () => boolean;
  isShiftHeld: (pointer: Phaser.Input.Pointer) => boolean;
  clearAllQueuedMovement: () => void;
};

export type BattleInputConfig = {
  dragThreshold: number;
};

export class BattleInputController {
  private suppressCommandOnPointerUp = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private pathDragStart: Phaser.Math.Vector2 | null = null;
  private boxSelecting = false;
  private leftDragStartedWithSelection = false;
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
    this.scene.input.keyboard?.on('keydown-D', this.handleKeyDownD);
    this.scene.input.keyboard?.on('keydown-S', this.handleKeyDownS);
    this.scene.input.keyboard?.on('keydown-A', this.handleKeyDownA);
    this.scene.input.keyboard?.on('keydown-Q', this.handleKeyDownQ);
  }

  public reset(): void {
    this.resetInteractionState();
    this.clearInputPreviews();
  }

  public destroy(): void {
    this.scene.input.off('gameobjectdown', this.handleGameObjectDown);
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.keyboard?.off('keydown-SPACE', this.handleKeyDownSpace);
    this.scene.input.keyboard?.off('keydown-ESC', this.handleKeyDownEsc);
    this.scene.input.keyboard?.off('keydown-D', this.handleKeyDownD);
    this.scene.input.keyboard?.off('keydown-S', this.handleKeyDownS);
    this.scene.input.keyboard?.off('keydown-A', this.handleKeyDownA);
    this.scene.input.keyboard?.off('keydown-Q', this.handleKeyDownQ);
    this.reset();
  }

  private readonly handleGameObjectDown = (
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    event: Phaser.Types.Input.EventData,
  ): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }

    const clickedUnit = this.callbacks.resolveOwnedUnit(gameObject);
    if (!clickedUnit) {
      return;
    }

    if (pointer.button === 0) {
      if (!this.callbacks.isUnitSelected(clickedUnit)) {
        this.callbacks.selectOnlyUnit(clickedUnit);
        this.suppressCommandOnPointerUp = true;
      }
      event.stopPropagation();
      return;
    }

    if (pointer.button === 2 && this.callbacks.isUnitSelected(clickedUnit)) {
      this.beginPathDrag(pointer);
      event.stopPropagation();
    }
  };

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    if (this.callbacks.isPointerInputBlocked?.()) {
      return;
    }

    if (pointer.button === 2) {
      if (this.callbacks.hasSelectedUnits()) {
        this.beginPathDrag(pointer);
      }
      return;
    }

    if (pointer.button !== 0 || this.suppressCommandOnPointerUp) {
      return;
    }

    this.leftDragStartedWithSelection = this.callbacks.hasSelectedUnits();
    this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    this.boxSelecting = false;
    this.callbacks.clearFormationAreaPreview();
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    if (this.callbacks.isPointerInputBlocked?.()) {
      return;
    }

    if (this.pathDragStart) {
      if (!pointer.rightButtonDown()) {
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
        if (this.leftDragStartedWithSelection) {
          this.callbacks.drawFormationAreaPreview(
            this.dragStart.x,
            this.dragStart.y,
            pointer.worldX,
            pointer.worldY,
          );
        } else {
          this.callbacks.clearFormationAreaPreview();
        }
      } else {
        this.callbacks.clearFormationAreaPreview();
      }
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    if (this.callbacks.isPointerInputBlocked?.()) {
      return;
    }

    if (pointer.button === 2 && this.pathDragStart) {
      this.pathDragStart = null;

      if (this.pathDrawing) {
        const commandPath = this.callbacks.buildCommandPath(this.draggedPath);
        if (commandPath.length > 1) {
          this.callbacks.commandSelectedUnitsAlongPath(
            commandPath,
            this.callbacks.isShiftHeld(pointer),
          );
        }
      } else {
        this.callbacks.commandSelectedUnits(
          pointer.worldX,
          pointer.worldY,
          this.callbacks.isShiftHeld(pointer),
        );
      }

      this.pathDrawing = false;
      this.draggedPath = [];
      this.callbacks.clearPathPreview();
      return;
    }

    if (pointer.button !== 0) {
      return;
    }

    if (this.suppressCommandOnPointerUp) {
      this.suppressCommandOnPointerUp = false;
      return;
    }

    if (this.boxSelecting && this.dragStart) {
      if (this.leftDragStartedWithSelection) {
        this.callbacks.commandSelectedUnitsIntoFormationArea(
          this.dragStart.x,
          this.dragStart.y,
          pointer.worldX,
          pointer.worldY,
          this.callbacks.isShiftHeld(pointer),
        );
      } else {
        this.callbacks.selectUnitsInBox(
          this.dragStart.x,
          this.dragStart.y,
          pointer.worldX,
          pointer.worldY,
        );
      }
      this.callbacks.clearSelectionBox();
      this.callbacks.clearFormationAreaPreview();
      this.clearLeftDragState();
      return;
    }

    if (this.dragStart) {
      this.callbacks.clearSelectionBox();
      this.callbacks.clearFormationAreaPreview();
      this.clearLeftDragState();
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

  private readonly handleKeyDownD = (): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.reset();
    this.callbacks.clearSelection();
  };

  private readonly handleKeyDownS = (): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.callbacks.selectAllOwnedUnits();
  };

  private readonly handleKeyDownA = (event: KeyboardEvent): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.callbacks.commandSelectedUnitsTowardEnemyInfluenceLine(
      Boolean(event?.shiftKey),
    );
  };

  private readonly handleKeyDownQ = (event: KeyboardEvent): void => {
    if (!this.callbacks.isBattleActive()) {
      return;
    }
    this.callbacks.commandSelectedUnitsTowardNearestVisibleEnemyUnit(
      Boolean(event?.shiftKey),
    );
  };

  private beginPathDrag(pointer: Phaser.Input.Pointer): void {
    this.pathDragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    this.pathDrawing = false;
    this.draggedPath = [this.pathDragStart.clone()];
    this.callbacks.clearSelectionBox();
    this.callbacks.clearFormationAreaPreview();
    this.callbacks.clearPathPreview();
  }

  private resetInteractionState(): void {
    this.suppressCommandOnPointerUp = false;
    this.clearLeftDragState();
    this.pathDragStart = null;
    this.pathDrawing = false;
    this.draggedPath = [];
  }

  private clearLeftDragState(): void {
    this.dragStart = null;
    this.boxSelecting = false;
    this.leftDragStartedWithSelection = false;
  }

  private clearInputPreviews(): void {
    this.callbacks.clearSelectionBox();
    this.callbacks.clearFormationAreaPreview();
    this.callbacks.clearPathPreview();
  }
}
