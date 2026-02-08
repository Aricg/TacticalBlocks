import Phaser from 'phaser';
import { Unit } from './Unit';

class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.selectedUnit = null;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2f7d32);

    const centerX = this.scale.width * 0.5;
    const centerY = this.scale.height * 0.5;

    this.unit = new Unit(this, centerX, centerY);

    this.input.on('gameobjectdown', (pointer, gameObject, event) => {
      if (gameObject !== this.unit) {
        return;
      }

      this.selectUnit(this.unit);

      // Prevent this same click from also firing a terrain move command.
      event.stopPropagation();
    });

    this.input.on('pointerdown', (pointer) => {
      if (!pointer.leftButtonDown()) {
        return;
      }

      if (!this.selectedUnit) {
        return;
      }

      this.selectedUnit.setDestination(pointer.worldX, pointer.worldY);
    });
  }

  selectUnit(unit) {
    if (this.selectedUnit && this.selectedUnit !== unit) {
      this.selectedUnit.setSelected(false);
    }

    this.selectedUnit = unit;
    this.selectedUnit.setSelected(true);
  }

  update(_time, delta) {
    this.unit.update(delta);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 640,
  parent: 'app',
  scene: [BattleScene],
};

new Phaser.Game(config);
