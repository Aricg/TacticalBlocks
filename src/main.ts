import Phaser from 'phaser';
import { Unit } from './Unit';

class BattleScene extends Phaser.Scene {
  private readonly units: Unit[] = [];
  private readonly selectedUnits: Set<Unit> = new Set<Unit>();
  private suppressCommandOnPointerUp = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private boxSelecting = false;
  private selectionBox!: Phaser.GameObjects.Graphics;

  private static readonly DRAG_THRESHOLD = 10;
  private static readonly COLLISION_MIN_DISTANCE = 42;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2f7d32);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, 1920, 1080);
    this.input.mouse?.disableContextMenu();

    const centerX = this.scale.width * 0.5;
    const centerY = this.scale.height * 0.5;
    this.spawnUnits(centerX, centerY);

    this.selectionBox = this.add.graphics();
    this.selectionBox.setDepth(1000);

    this.input.on(
      'gameobjectdown',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (pointer.button !== 0) {
          return;
        }

        const clickedUnit = Unit.fromGameObject(gameObject);
        if (!clickedUnit) {
          return;
        }

        this.selectOnlyUnit(clickedUnit);
        this.suppressCommandOnPointerUp = true;

        // Prevent this same click from also firing a terrain move command.
        event.stopPropagation();
      },
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.clearSelection();
        this.clearSelectionBox();
        this.suppressCommandOnPointerUp = false;
        this.dragStart = null;
        this.boxSelecting = false;
        return;
      }

      if (pointer.button !== 0) {
        return;
      }

      this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.boxSelecting = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() || !this.dragStart) {
        return;
      }

      const dragDistance = Phaser.Math.Distance.Between(
        this.dragStart.x,
        this.dragStart.y,
        pointer.worldX,
        pointer.worldY,
      );
      if (!this.boxSelecting && dragDistance >= BattleScene.DRAG_THRESHOLD) {
        this.boxSelecting = true;
      }

      if (!this.boxSelecting) {
        return;
      }

      this.drawSelectionBox(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }

      if (this.suppressCommandOnPointerUp) {
        this.suppressCommandOnPointerUp = false;
        return;
      }

      if (this.boxSelecting && this.dragStart) {
        this.selectUnitsInBox(
          this.dragStart.x,
          this.dragStart.y,
          pointer.worldX,
          pointer.worldY,
        );
        this.clearSelectionBox();
        this.dragStart = null;
        this.boxSelecting = false;
        return;
      }

      this.clearSelectionBox();
      this.dragStart = null;
      this.boxSelecting = false;

      this.commandSelectedUnits(pointer.worldX, pointer.worldY);
    });
  }

  private spawnUnits(centerX: number, centerY: number): void {
    const offsets = [
      { x: -140, y: -60 },
      { x: -60, y: -60 },
      { x: 20, y: -60 },
      { x: -140, y: 20 },
      { x: -60, y: 20 },
      { x: 20, y: 20 },
    ];

    for (const offset of offsets) {
      this.units.push(new Unit(this, centerX + offset.x, centerY + offset.y));
    }
  }

  private drawSelectionBox(currentX: number, currentY: number): void {
    if (!this.dragStart) {
      return;
    }

    const minX = Math.min(this.dragStart.x, currentX);
    const minY = Math.min(this.dragStart.y, currentY);
    const width = Math.abs(currentX - this.dragStart.x);
    const height = Math.abs(currentY - this.dragStart.y);

    this.selectionBox.clear();
    this.selectionBox.fillStyle(0xffffff, 0.12);
    this.selectionBox.lineStyle(1, 0xffffff, 0.9);
    this.selectionBox.fillRect(minX, minY, width, height);
    this.selectionBox.strokeRect(minX, minY, width, height);
  }

  private clearSelectionBox(): void {
    this.selectionBox.clear();
  }

  private selectOnlyUnit(unit: Unit): void {
    for (const selectedUnit of this.selectedUnits) {
      selectedUnit.setSelected(false);
    }

    this.selectedUnits.clear();
    this.selectedUnits.add(unit);
    unit.setSelected(true);
  }

  private selectUnitsInBox(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): void {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }
    this.selectedUnits.clear();

    for (const unit of this.units) {
      const withinX = unit.x >= minX && unit.x <= maxX;
      const withinY = unit.y >= minY && unit.y <= maxY;
      if (withinX && withinY) {
        this.selectedUnits.add(unit);
        unit.setSelected(true);
      }
    }
  }

  private commandSelectedUnits(targetX: number, targetY: number): void {
    if (this.selectedUnits.size === 0) {
      return;
    }

    let formationCenterX = 0;
    let formationCenterY = 0;
    for (const unit of this.selectedUnits) {
      formationCenterX += unit.x;
      formationCenterY += unit.y;
    }
    formationCenterX /= this.selectedUnits.size;
    formationCenterY /= this.selectedUnits.size;

    for (const unit of this.selectedUnits) {
      const offsetX = unit.x - formationCenterX;
      const offsetY = unit.y - formationCenterY;
      unit.setDestination(targetX + offsetX, targetY + offsetY);
    }
  }

  private clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }

    this.selectedUnits.clear();
  }

  private applyCollisionAvoidance(): void {
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i];
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j];
        const delta = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y);
        const distance = Math.max(delta.length(), 0.0001);
        if (distance >= BattleScene.COLLISION_MIN_DISTANCE) {
          continue;
        }

        const overlap = BattleScene.COLLISION_MIN_DISTANCE - distance;
        const separation = delta.normalize().scale(overlap * 0.5);
        a.setPosition(a.x - separation.x, a.y - separation.y);
        b.setPosition(b.x + separation.x, b.y + separation.y);
      }
    }
  }

  update(_time: number, delta: number): void {
    for (const unit of this.units) {
      unit.updateMovement(delta);
    }
    this.applyCollisionAvoidance();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: 'app',
  scene: [BattleScene],
};

new Phaser.Game(config);
