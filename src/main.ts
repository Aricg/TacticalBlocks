import Phaser from 'phaser';
import { Team } from './Team';
import { Unit } from './Unit';

class BattleScene extends Phaser.Scene {
  private readonly units: Unit[] = [];
  private readonly selectedUnits: Set<Unit> = new Set<Unit>();
  private localPlayerTeam: Team = Team.BLUE;
  private suppressCommandOnPointerUp = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private pathDragStart: Phaser.Math.Vector2 | null = null;
  private pathDragStartedOnUnit = false;
  private boxSelecting = false;
  private pathDrawing = false;
  private draggedPath: Phaser.Math.Vector2[] = [];
  private selectionBox!: Phaser.GameObjects.Graphics;
  private pathPreview!: Phaser.GameObjects.Graphics;
  private movementLines!: Phaser.GameObjects.Graphics;

  private static readonly DRAG_THRESHOLD = 10;
  private static readonly PREVIEW_PATH_POINT_SPACING = 4;
  private static readonly COMMAND_PATH_POINT_SPACING = 50;
  private static readonly COLLISION_MIN_DISTANCE = 42;
  private static readonly ENGAGEMENT_MAGNET_DISTANCE = 100;
  private static readonly MAGNETISM_SPEED = 80;
  private static readonly CONTACT_DAMAGE_PER_SECOND = 12;

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
    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(950);
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);

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
        if (clickedUnit.team !== this.localPlayerTeam) {
          return;
        }

        // If unit is already selected, this might be the start of a path drag.
        if (this.selectedUnits.has(clickedUnit)) {
          this.pathDragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
          this.pathDragStartedOnUnit = true;
          this.pathDrawing = false;
          this.draggedPath = [this.pathDragStart.clone()];
          this.pathPreview.clear();
        } else {
          this.selectOnlyUnit(clickedUnit);
          this.suppressCommandOnPointerUp = true;
          this.pathDragStart = null;
          this.pathDragStartedOnUnit = false;
          this.pathDrawing = false;
          this.draggedPath = [];
          this.pathPreview.clear();
        }

        // Prevent this same click from also firing a terrain move command.
        event.stopPropagation();
      },
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.commandSelectedUnits(pointer.worldX, pointer.worldY);
        return;
      }

      if (pointer.button !== 0) {
        return;
      }

      if (this.suppressCommandOnPointerUp) {
        return;
      }

      // If units are selected, dragging anywhere draws a path.
      if (this.selectedUnits.size > 0) {
        if (!this.pathDragStart) {
          this.pathDragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
          this.pathDragStartedOnUnit = false;
          this.pathDrawing = false;
          this.draggedPath = [this.pathDragStart.clone()];
          this.pathPreview.clear();
        }
        return;
      }

      // Otherwise, we allow Box Selection or Move Command (if something was just selected but not by this click).
      this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.boxSelecting = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // 1. Handle Path Drawing (Dragging from a Unit)
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
          if (dragDistance >= BattleScene.DRAG_THRESHOLD) {
            this.pathDrawing = true;
            this.appendDraggedPathPoint(pointer.worldX, pointer.worldY, true);
          }
        }

        if (this.pathDrawing) {
          this.appendDraggedPathPoint(pointer.worldX, pointer.worldY);
          this.drawPathPreview();
        }
        return;
      }

      // 2. Handle Box Selection (Dragging from Terrain)
      if (this.dragStart && pointer.leftButtonDown()) {
        const dragDistance = Phaser.Math.Distance.Between(
          this.dragStart.x,
          this.dragStart.y,
          pointer.worldX,
          pointer.worldY,
        );
        if (!this.boxSelecting && dragDistance >= BattleScene.DRAG_THRESHOLD) {
          this.boxSelecting = true;
        }

        if (this.boxSelecting) {
          this.drawSelectionBox(pointer.worldX, pointer.worldY);
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }

      // Handle End of Path Drawing
      if (this.pathDragStart) {
        this.pathDragStart = null;

        if (this.pathDrawing) {
          this.appendDraggedPathPoint(pointer.worldX, pointer.worldY);
          const commandPath = this.buildCommandPath(this.draggedPath);
          if (commandPath.length > 1) {
            this.commandSelectedUnitsAlongPath(commandPath);
          } else {
            // Path was too short, do nothing?
          }
        } else {
          // Short click started on map deselects; short click started on a selected unit does nothing.
          if (!this.pathDragStartedOnUnit) {
            this.clearSelection();
          }
        }

        this.pathDragStartedOnUnit = false;
        this.pathDrawing = false;
        this.draggedPath = [];
        this.pathPreview.clear();
        return;
      }

      if (this.suppressCommandOnPointerUp) {
        this.suppressCommandOnPointerUp = false;
        this.pathDragStartedOnUnit = false;
        return;
      }

      // Handle End of Box Selection
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

      // Handle Simple Click on Terrain
      if (this.dragStart) {
        this.clearSelectionBox();
        this.dragStart = null;
        this.boxSelecting = false;
        
        // Short click on map -> Deselect
        this.clearSelection();
      }
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.cancelSelectedUnitMovement();
    });
  }

  private spawnUnits(centerX: number, centerY: number): void {
    const startSeparation = 180;
    const blueX = centerX - startSeparation * 0.5;
    const redX = centerX + startSeparation * 0.5;
    const rowOffsets = [-80, 0, 80];
    const blueFacingRotation = Math.PI / 2;
    const redFacingRotation = -Math.PI / 2;

    for (const rowOffset of rowOffsets) {
      const blueUnit = new Unit(this, blueX, centerY + rowOffset, Team.BLUE);
      blueUnit.setRotation(blueFacingRotation);
      this.units.push(blueUnit);

      const redUnit = new Unit(this, redX, centerY + rowOffset, Team.RED);
      redUnit.setRotation(redFacingRotation);
      this.units.push(redUnit);
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
      if (withinX && withinY && unit.team === this.localPlayerTeam) {
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

  private commandSelectedUnitsAlongPath(path: Phaser.Math.Vector2[]): void {
    if (this.selectedUnits.size === 0 || path.length === 0) {
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
      const unitPath = path.map(
        (point) => new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY),
      );
      unit.setPath(unitPath);
    }
  }

  private cancelSelectedUnitMovement(): void {
    for (const unit of this.selectedUnits) {
      unit.cancelMovement();
    }
  }

  private appendDraggedPathPoint(x: number, y: number, forceAppend = false): void {
    const nextPoint = new Phaser.Math.Vector2(x, y);
    const lastPoint = this.draggedPath[this.draggedPath.length - 1];
    if (!lastPoint || forceAppend || this.draggedPath.length === 1) {
      this.draggedPath.push(nextPoint);
      return;
    }

    const distance = Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, x, y);
    if (distance < BattleScene.PREVIEW_PATH_POINT_SPACING) {
      this.draggedPath[this.draggedPath.length - 1] = nextPoint;
      return;
    }

    const segmentCount = Math.floor(
      distance / BattleScene.PREVIEW_PATH_POINT_SPACING,
    );
    for (let i = 1; i <= segmentCount; i += 1) {
      const t =
        (i * BattleScene.PREVIEW_PATH_POINT_SPACING) / distance;
      if (t >= 1) {
        break;
      }
      this.draggedPath.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(lastPoint.x, x, t),
          Phaser.Math.Linear(lastPoint.y, y, t),
        ),
      );
    }

    this.draggedPath.push(nextPoint);
  }

  private buildCommandPath(path: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    if (path.length === 0) {
      return [];
    }

    if (path.length === 1) {
      return [path[0].clone()];
    }

    const commandPath: Phaser.Math.Vector2[] = [path[0].clone()];
    for (let i = 1; i < path.length - 1; i += 1) {
      const lastKeptPoint = commandPath[commandPath.length - 1];
      const candidatePoint = path[i];
      if (
        Phaser.Math.Distance.Between(
          lastKeptPoint.x,
          lastKeptPoint.y,
          candidatePoint.x,
          candidatePoint.y,
        ) >= BattleScene.COMMAND_PATH_POINT_SPACING
      ) {
        commandPath.push(candidatePoint.clone());
      }
    }

    const finalPoint = path[path.length - 1];
    const lastKeptPoint = commandPath[commandPath.length - 1];
    if (
      Phaser.Math.Distance.Between(
        finalPoint.x,
        finalPoint.y,
        lastKeptPoint.x,
        lastKeptPoint.y,
      ) > 0
    ) {
      commandPath.push(finalPoint.clone());
    }

    return commandPath;
  }

  private drawPathPreview(): void {
    this.pathPreview.clear();
    if (this.draggedPath.length < 2) {
      return;
    }

    this.pathPreview.lineStyle(2, 0xbad7f7, 0.9);
    this.pathPreview.beginPath();
    this.pathPreview.moveTo(this.draggedPath[0].x, this.draggedPath[0].y);
    for (let i = 1; i < this.draggedPath.length; i += 1) {
      this.pathPreview.lineTo(this.draggedPath[i].x, this.draggedPath[i].y);
    }
    this.pathPreview.strokePath();
  }

  private clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }

    this.selectedUnits.clear();
  }

  private updateUnitInteractions(deltaSeconds: number): void {
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i];
      if (!a.isAlive()) {
        continue;
      }

      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j];
        if (!b.isAlive()) {
          continue;
        }

        const delta = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y);
        const distance = Math.max(delta.length(), 0.0001);

        // 1. Magnetism (Opposing teams, close but not touching)
        if (
          a.team !== b.team &&
          distance <= BattleScene.ENGAGEMENT_MAGNET_DISTANCE &&
          distance > BattleScene.COLLISION_MIN_DISTANCE
        ) {
          const pull = delta
            .normalize()
            .scale(BattleScene.MAGNETISM_SPEED * deltaSeconds);
          a.x += pull.x;
          a.y += pull.y;
          b.x -= pull.x;
          b.y -= pull.y;
          a.engagedUnits.add(b);
          b.engagedUnits.add(a);
        }

        // 2. Collision / Combat (Touching)
        if (distance < BattleScene.COLLISION_MIN_DISTANCE) {
          if (a.team !== b.team) {
            a.cancelMovement();
            b.cancelMovement();
            a.applyContactDamage(BattleScene.CONTACT_DAMAGE_PER_SECOND, deltaSeconds);
            b.applyContactDamage(BattleScene.CONTACT_DAMAGE_PER_SECOND, deltaSeconds);
            a.engagedUnits.add(b);
            b.engagedUnits.add(a);
          }

          const overlap = BattleScene.COLLISION_MIN_DISTANCE - distance;
          const separation = delta.normalize().scale(overlap * 0.5);
          a.setPosition(a.x - separation.x, a.y - separation.y);
          b.setPosition(b.x + separation.x, b.y + separation.y);
        }
      }
    }
  }

  private removeDeadUnits(): void {
    for (let i = this.units.length - 1; i >= 0; i -= 1) {
      const unit = this.units[i];
      if (unit.isAlive()) {
        continue;
      }

      this.selectedUnits.delete(unit);
      unit.destroy();
      this.units.splice(i, 1);
    }
  }

  private renderMovementLines(): void {
    this.movementLines.clear();
    this.movementLines.lineStyle(2, 0xf4e7b2, 0.75);
    this.movementLines.fillStyle(0xf4e7b2, 0.9);

    for (const unit of this.units) {
      const waypoints = unit.getWaypoints();
      if (waypoints.length === 0) {
        continue;
      }

      this.movementLines.beginPath();
      this.movementLines.moveTo(unit.x, unit.y);
      for (const waypoint of waypoints) {
        this.movementLines.lineTo(waypoint.x, waypoint.y);
      }
      this.movementLines.strokePath();

      for (const waypoint of waypoints) {
        this.movementLines.fillCircle(waypoint.x, waypoint.y, 3);
      }
    }
  }

  update(_time: number, delta: number): void {
    for (const unit of this.units) {
      unit.resetCurrentDpsOutput();
    }

    for (const unit of this.units) {
      unit.updateMovement(delta);
    }
    this.updateUnitInteractions(delta / 1000);
    for (const unit of this.units) {
      unit.updateCombatRotation(delta);
    }
    this.removeDeadUnits();
    this.renderMovementLines();
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
