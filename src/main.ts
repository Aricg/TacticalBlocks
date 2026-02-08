import Phaser from 'phaser';
import { Unit } from './Unit';

class BattleScene extends Phaser.Scene {
  private unit!: Unit;
  private selectedUnit: Unit | null = null;
  private suppressTerrainClick = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2f7d32);
    this.input.mouse?.disableContextMenu();

    const centerX = this.scale.width * 0.5;
    const centerY = this.scale.height * 0.5;
    this.unit = new Unit(this, centerX, centerY);

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

        this.selectUnit(clickedUnit);
        this.suppressTerrainClick = true;

        // Prevent this same click from also firing a terrain move command.
        event.stopPropagation();
      },
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.clearSelection();
        this.suppressTerrainClick = false;
        return;
      }

      if (pointer.button !== 0) {
        return;
      }

      if (this.suppressTerrainClick) {
        this.suppressTerrainClick = false;
        return;
      }

      if (!this.selectedUnit) {
        return;
      }

      this.selectedUnit.setDestination(pointer.worldX, pointer.worldY);
    });
  }

  private selectUnit(unit: Unit): void {
    if (this.selectedUnit && this.selectedUnit !== unit) {
      this.selectedUnit.setSelected(false);
    }

    this.selectedUnit = unit;
    this.selectedUnit.setSelected(true);
  }

  private clearSelection(): void {
    if (!this.selectedUnit) {
      return;
    }

    this.selectedUnit.setSelected(false);
    this.selectedUnit = null;
  }

  update(_time: number, delta: number): void {
    this.unit.updateMovement(delta);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 640,
  parent: 'app',
  scene: [BattleScene],
};

new Phaser.Game(config);
