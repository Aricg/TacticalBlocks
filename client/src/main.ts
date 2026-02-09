import Phaser from 'phaser';
import {
  type NetworkInfluenceGridUpdate,
  NetworkManager,
  type NetworkUnitHealthUpdate,
  type NetworkUnitPathCommand,
  type NetworkUnitRotationUpdate,
  type NetworkUnitSnapshot,
  type NetworkUnitPositionUpdate,
} from './NetworkManager';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';
import {
  applyRuntimeTuningUpdate,
  DEFAULT_RUNTIME_TUNING,
  type RuntimeTuning,
} from '../../shared/src/runtimeTuning.js';
import { City } from './City';
import { InfluenceRenderer } from './InfluenceRenderer';
import { RuntimeTuningPanel } from './RuntimeTuningPanel';
import { Team } from './Team';
import { Unit } from './Unit';

class BattleScene extends Phaser.Scene {
  private readonly units: Unit[] = [];
  private readonly unitsById: Map<string, Unit> = new Map<string, Unit>();
  private readonly plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]> =
    new Map<string, Phaser.Math.Vector2[]>();
  private readonly remoteUnitTargetPositions: Map<string, Phaser.Math.Vector2> =
    new Map<string, Phaser.Math.Vector2>();
  private readonly lastKnownHealthByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly combatVisualUntilByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly cities: City[] = [];
  private readonly selectedUnits: Set<Unit> = new Set<Unit>();
  private networkManager: NetworkManager | null = null;
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
  private influenceRenderer: InfluenceRenderer | null = null;
  private fogOfWarLayer!: Phaser.GameObjects.RenderTexture;
  private visionBrush!: Phaser.GameObjects.Arc;
  private cityVisionBrush!: Phaser.GameObjects.Arc;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private tuningPanel: RuntimeTuningPanel | null = null;

  private static readonly MAP_WIDTH = GAMEPLAY_CONFIG.map.width;
  private static readonly MAP_HEIGHT = GAMEPLAY_CONFIG.map.height;
  private static readonly SHROUD_COLOR = GAMEPLAY_CONFIG.visibility.shroudColor;
  private static readonly SHROUD_ALPHA = GAMEPLAY_CONFIG.visibility.shroudAlpha;
  private static readonly ENEMY_VISIBILITY_PADDING =
    GAMEPLAY_CONFIG.visibility.enemyVisibilityPadding;
  private static readonly FOG_DEPTH = GAMEPLAY_CONFIG.visibility.fogDepth;
  private static readonly CITY_BACKLINE_OFFSET =
    GAMEPLAY_CONFIG.cities.backlineOffset;
  private static readonly DRAG_THRESHOLD = GAMEPLAY_CONFIG.input.dragThreshold;
  private static readonly PREVIEW_PATH_POINT_SPACING =
    GAMEPLAY_CONFIG.input.previewPathPointSpacing;
  private static readonly COMMAND_PATH_POINT_SPACING =
    GAMEPLAY_CONFIG.input.commandPathPointSpacing;
  private static readonly GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
  private static readonly GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;
  private static readonly GRID_CELL_WIDTH =
    BattleScene.MAP_WIDTH / BattleScene.GRID_WIDTH;
  private static readonly GRID_CELL_HEIGHT =
    BattleScene.MAP_HEIGHT / BattleScene.GRID_HEIGHT;
  private static readonly REMOTE_POSITION_LERP_RATE =
    GAMEPLAY_CONFIG.network.remotePositionLerpRate;
  private static readonly REMOTE_POSITION_SNAP_DISTANCE =
    GAMEPLAY_CONFIG.network.remotePositionSnapDistance;
  private static readonly PLANNED_PATH_WAYPOINT_REACHED_DISTANCE = 12;
  private static readonly COMBAT_WIGGLE_HOLD_MS = 250;
  private static readonly COMBAT_WIGGLE_AMPLITUDE = 1.8;
  private static readonly COMBAT_WIGGLE_FREQUENCY = 0.018;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2f7d32);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, BattleScene.MAP_WIDTH, BattleScene.MAP_HEIGHT);
    this.input.mouse?.disableContextMenu();
    this.shiftKey =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) ?? null;
    this.createCities();

    this.selectionBox = this.add.graphics();
    this.selectionBox.setDepth(1000);
    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(950);
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);
    this.influenceRenderer = new InfluenceRenderer(this);
    this.fogOfWarLayer = this.add.renderTexture(
      0,
      0,
      BattleScene.MAP_WIDTH,
      BattleScene.MAP_HEIGHT,
    );
    this.fogOfWarLayer.setOrigin(0, 0);
    this.fogOfWarLayer.setDepth(BattleScene.FOG_DEPTH);
    this.visionBrush = this.add.circle(
      0,
      0,
      this.runtimeTuning.fogVisionRadius,
      0xffffff,
      1,
    );
    this.visionBrush.setVisible(false);
    this.cityVisionBrush = this.add.circle(
      0,
      0,
      this.runtimeTuning.cityVisionRadius,
      0xffffff,
      1,
    );
    this.cityVisionBrush.setVisible(false);
    this.tuningPanel = new RuntimeTuningPanel(
      this.runtimeTuning,
      (update) => {
        this.applyRuntimeTuning(
          applyRuntimeTuningUpdate(this.runtimeTuning, update),
        );
        if (!this.networkManager) {
          return;
        }
        this.networkManager.sendRuntimeTuningUpdate(update);
      },
    );
    this.applyRuntimeTuning(this.runtimeTuning);
    this.refreshFogOfWar();

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
        this.commandSelectedUnits(
          pointer.worldX,
          pointer.worldY,
          this.isShiftHeld(pointer),
        );
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
            this.commandSelectedUnitsAlongPath(
              commandPath,
              this.isShiftHeld(pointer),
            );
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

    this.networkManager = new NetworkManager(
      (networkUnit) => {
        this.upsertNetworkUnit(networkUnit);
      },
      (unitId) => {
        this.removeNetworkUnit(unitId);
      },
      (assignedTeam) => {
        this.applyAssignedTeam(assignedTeam);
      },
      (positionUpdate) => {
        this.applyNetworkUnitPosition(positionUpdate);
      },
      (healthUpdate) => {
        this.applyNetworkUnitHealth(healthUpdate);
      },
      (rotationUpdate) => {
        this.applyNetworkUnitRotation(rotationUpdate);
      },
      (influenceGridUpdate) => {
        this.applyInfluenceGrid(influenceGridUpdate);
      },
      (runtimeTuning) => {
        this.applyRuntimeTuning(runtimeTuning);
      },
    );
    void this.networkManager.connect().catch((error: unknown) => {
      console.error('Failed to connect to battle room.', error);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      const networkManager = this.networkManager;
      this.networkManager = null;
      if (networkManager) {
        void networkManager.disconnect();
      }
      if (this.influenceRenderer) {
        this.influenceRenderer.destroy();
        this.influenceRenderer = null;
      }
      for (const city of this.cities) {
        city.destroy();
      }
      this.cities.length = 0;
      this.lastKnownHealthByUnitId.clear();
      this.combatVisualUntilByUnitId.clear();
      this.tuningPanel?.destroy();
      this.tuningPanel = null;
    });
  }

  private createCities(): void {
    const redSpawn = GAMEPLAY_CONFIG.spawn.red;
    const blueSpawn = GAMEPLAY_CONFIG.spawn.blue;

    this.cities.push(
      new City(
        this,
        redSpawn.x - BattleScene.CITY_BACKLINE_OFFSET,
        redSpawn.y,
        'Red City',
      ),
      new City(
        this,
        blueSpawn.x + BattleScene.CITY_BACKLINE_OFFSET,
        blueSpawn.y,
        'Blue City',
      ),
    );
  }

  private applyRuntimeTuning(runtimeTuning: RuntimeTuning): void {
    this.runtimeTuning = runtimeTuning;
    this.tuningPanel?.setValues(runtimeTuning);
    this.visionBrush?.setRadius(this.runtimeTuning.fogVisionRadius);
    this.cityVisionBrush?.setRadius(this.runtimeTuning.cityVisionRadius);
    this.influenceRenderer?.setLineStyle({
      lineThickness: this.runtimeTuning.lineThickness,
      lineAlpha: this.runtimeTuning.lineAlpha,
    });
  }

  private applyInfluenceGrid(
    influenceGridUpdate: NetworkInfluenceGridUpdate,
  ): void {
    this.influenceRenderer?.setInfluenceGrid(influenceGridUpdate);
  }

  private upsertNetworkUnit(networkUnit: NetworkUnitSnapshot): void {
    const existingUnit = this.unitsById.get(networkUnit.unitId);
    if (existingUnit) {
      existingUnit.rotation = networkUnit.rotation;
      existingUnit.setHealth(networkUnit.health);
      this.lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
      this.applyNetworkUnitPositionSnapshot(
        existingUnit,
        networkUnit.unitId,
        networkUnit.x,
        networkUnit.y,
        true,
      );
      return;
    }

    const team =
      networkUnit.team.toUpperCase() === Team.RED
        ? Team.RED
        : Team.BLUE;
    const spawnedUnit = new Unit(
      this,
      networkUnit.x,
      networkUnit.y,
      team,
      networkUnit.rotation,
      networkUnit.health,
    );
    this.units.push(spawnedUnit);
    this.unitsById.set(networkUnit.unitId, spawnedUnit);
    this.lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
    this.combatVisualUntilByUnitId.delete(networkUnit.unitId);
    this.remoteUnitTargetPositions.set(
      networkUnit.unitId,
      new Phaser.Math.Vector2(networkUnit.x, networkUnit.y),
    );
  }

  private removeNetworkUnit(unitId: string): void {
    const unit = this.unitsById.get(unitId);
    if (!unit) {
      return;
    }

    this.unitsById.delete(unitId);
    this.plannedPathsByUnitId.delete(unitId);
    this.remoteUnitTargetPositions.delete(unitId);
    this.lastKnownHealthByUnitId.delete(unitId);
    this.combatVisualUntilByUnitId.delete(unitId);
    this.selectedUnits.delete(unit);
    const index = this.units.indexOf(unit);
    if (index >= 0) {
      this.units.splice(index, 1);
    }
    unit.destroy();
  }

  private applyNetworkUnitPosition(positionUpdate: NetworkUnitPositionUpdate): void {
    const unit = this.unitsById.get(positionUpdate.unitId);
    if (!unit) {
      return;
    }

    this.applyNetworkUnitPositionSnapshot(
      unit,
      positionUpdate.unitId,
      positionUpdate.x,
      positionUpdate.y,
    );
  }

  private applyNetworkUnitHealth(healthUpdate: NetworkUnitHealthUpdate): void {
    const unit = this.unitsById.get(healthUpdate.unitId);
    if (!unit) {
      return;
    }

    const previousHealth =
      this.lastKnownHealthByUnitId.get(healthUpdate.unitId) ?? healthUpdate.health;
    if (healthUpdate.health < previousHealth - 0.0001) {
      this.markUnitInCombatVisual(healthUpdate.unitId);
    }
    this.lastKnownHealthByUnitId.set(healthUpdate.unitId, healthUpdate.health);
    unit.setHealth(healthUpdate.health);
  }

  private applyNetworkUnitRotation(rotationUpdate: NetworkUnitRotationUpdate): void {
    const unit = this.unitsById.get(rotationUpdate.unitId);
    if (!unit) {
      return;
    }

    unit.rotation = rotationUpdate.rotation;
  }

  private applyAssignedTeam(teamValue: string): void {
    const assignedTeam =
      teamValue.toUpperCase() === Team.RED ? Team.RED : Team.BLUE;
    if (assignedTeam === this.localPlayerTeam) {
      return;
    }

    this.clearSelection();
    this.localPlayerTeam = assignedTeam;
    this.plannedPathsByUnitId.clear();
    this.rebuildRemotePositionTargets();
    this.refreshFogOfWar();
  }

  private applyNetworkUnitPositionSnapshot(
    unit: Unit,
    unitId: string,
    x: number,
    y: number,
    snapImmediately = false,
  ): void {
    const existingTarget = this.remoteUnitTargetPositions.get(unitId);
    if (existingTarget) {
      existingTarget.set(x, y);
    } else {
      this.remoteUnitTargetPositions.set(unitId, new Phaser.Math.Vector2(x, y));
    }

    if (snapImmediately) {
      unit.setPosition(x, y);
      return;
    }

    const distance = Phaser.Math.Distance.Between(unit.x, unit.y, x, y);
    if (distance >= BattleScene.REMOTE_POSITION_SNAP_DISTANCE) {
      unit.setPosition(x, y);
    }
  }

  private rebuildRemotePositionTargets(): void {
    this.remoteUnitTargetPositions.clear();
    for (const [unitId, unit] of this.unitsById) {
      this.remoteUnitTargetPositions.set(
        unitId,
        new Phaser.Math.Vector2(unit.x, unit.y),
      );
    }
  }

  private smoothRemoteUnitPositions(deltaMs: number): void {
    const lerpT = Phaser.Math.Clamp(
      (BattleScene.REMOTE_POSITION_LERP_RATE * deltaMs) / 1000,
      0,
      1,
    );
    if (lerpT <= 0) {
      return;
    }

    const staleUnitIds: string[] = [];
    for (const [unitId, target] of this.remoteUnitTargetPositions) {
      const unit = this.unitsById.get(unitId);
      if (!unit || !unit.isAlive()) {
        staleUnitIds.push(unitId);
        continue;
      }

      unit.setPosition(
        Phaser.Math.Linear(unit.x, target.x, lerpT),
        Phaser.Math.Linear(unit.y, target.y, lerpT),
      );
    }

    for (const unitId of staleUnitIds) {
      this.remoteUnitTargetPositions.delete(unitId);
    }
  }

  private markUnitInCombatVisual(unitId: string): void {
    const existingUntil = this.combatVisualUntilByUnitId.get(unitId) ?? 0;
    const combatUntil = this.time.now + BattleScene.COMBAT_WIGGLE_HOLD_MS;
    this.combatVisualUntilByUnitId.set(unitId, Math.max(existingUntil, combatUntil));
  }

  private getCombatWigglePhaseSeed(unitId: string): number {
    let hash = 2166136261;
    for (let i = 0; i < unitId.length; i += 1) {
      hash ^= unitId.charCodeAt(i);
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (Math.abs(hash) % 4096) / 128;
  }

  private applyCombatVisualWiggle(timeMs: number): void {
    for (const [unitId, unit] of this.unitsById) {
      if (!unit.isAlive()) {
        unit.clearCombatVisualOffset();
        this.combatVisualUntilByUnitId.delete(unitId);
        continue;
      }

      const combatUntil = this.combatVisualUntilByUnitId.get(unitId) ?? 0;
      if (combatUntil <= timeMs) {
        unit.clearCombatVisualOffset();
        if (combatUntil > 0) {
          this.combatVisualUntilByUnitId.delete(unitId);
        }
        continue;
      }

      const phase =
        timeMs * BattleScene.COMBAT_WIGGLE_FREQUENCY +
        this.getCombatWigglePhaseSeed(unitId);
      const offsetX = Math.sin(phase) * BattleScene.COMBAT_WIGGLE_AMPLITUDE;
      const offsetY =
        Math.cos(phase * 1.21) * BattleScene.COMBAT_WIGGLE_AMPLITUDE * 0.5;
      unit.setCombatVisualOffset(offsetX, offsetY);
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

  private commandSelectedUnits(
    targetX: number,
    targetY: number,
    shiftHeld = false,
  ): void {
    if (this.selectedUnits.size === 0 || !this.networkManager) {
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

    const movementCommandMode: NetworkUnitPathCommand['movementCommandMode'] = shiftHeld
      ? { speedMultiplier: 0.5, rotateToFace: false }
      : undefined;

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const offsetX = unit.x - formationCenterX;
      const offsetY = unit.y - formationCenterY;
      const snappedTarget = this.snapPointToGrid(
        targetX + offsetX,
        targetY + offsetY,
      );
      const unitPath = [snappedTarget];
      this.networkManager.sendUnitPathCommand({
        unitId,
        path: [{ x: unitPath[0].x, y: unitPath[0].y }],
        movementCommandMode,
      });
      this.setPlannedPath(unitId, unitPath);
    }
  }

  private commandSelectedUnitsAlongPath(
    path: Phaser.Math.Vector2[],
    shiftHeld = false,
  ): void {
    if (this.selectedUnits.size === 0 || path.length === 0 || !this.networkManager) {
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

    const movementCommandMode: NetworkUnitPathCommand['movementCommandMode'] = shiftHeld
      ? { speedMultiplier: 0.5, rotateToFace: false }
      : undefined;

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const offsetX = unit.x - formationCenterX;
      const offsetY = unit.y - formationCenterY;
      const unitPath = this.snapAndCompactPath(
        path.map((point) =>
          new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY),
        ),
      );
      if (unitPath.length === 0) {
        continue;
      }
      this.networkManager.sendUnitPathCommand({
        unitId,
        path: unitPath.map((point) => ({ x: point.x, y: point.y })),
        movementCommandMode,
      });
      this.setPlannedPath(
        unitId,
        unitPath.map((point) => point.clone()),
      );
    }
  }

  private isShiftHeld(pointer: Phaser.Input.Pointer): boolean {
    const pointerEvent = pointer.event as
      | MouseEvent
      | PointerEvent
      | undefined;
    return Boolean(pointerEvent?.shiftKey || this.shiftKey?.isDown);
  }

  private cancelSelectedUnitMovement(): void {
    if (!this.networkManager) {
      return;
    }

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      this.networkManager.sendUnitCancelMovement(unitId);
      this.plannedPathsByUnitId.delete(unitId);
    }
  }

  private setPlannedPath(unitId: string, path: Phaser.Math.Vector2[]): void {
    if (path.length === 0) {
      this.plannedPathsByUnitId.delete(unitId);
      return;
    }

    this.plannedPathsByUnitId.set(
      unitId,
      path.map((point) => point.clone()),
    );
  }

  private advancePlannedPaths(): void {
    const reachedDistanceSq =
      BattleScene.PLANNED_PATH_WAYPOINT_REACHED_DISTANCE *
      BattleScene.PLANNED_PATH_WAYPOINT_REACHED_DISTANCE;

    for (const [unitId, path] of this.plannedPathsByUnitId) {
      const unit = this.unitsById.get(unitId);
      if (!unit || path.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        continue;
      }

      while (path.length > 0) {
        const nextWaypoint = path[0];
        const dx = nextWaypoint.x - unit.x;
        const dy = nextWaypoint.y - unit.y;
        if (dx * dx + dy * dy > reachedDistanceSq) {
          break;
        }
        path.shift();
      }

      if (path.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
      }
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

    return this.snapAndCompactPath(commandPath);
  }

  private snapPointToGrid(x: number, y: number): Phaser.Math.Vector2 {
    const colBasis = x / BattleScene.GRID_CELL_WIDTH - 0.5;
    const rowBasis = y / BattleScene.GRID_CELL_HEIGHT - 0.5;
    const col = Phaser.Math.Clamp(
      Math.round(colBasis),
      0,
      BattleScene.GRID_WIDTH - 1,
    );
    const row = Phaser.Math.Clamp(
      Math.round(rowBasis),
      0,
      BattleScene.GRID_HEIGHT - 1,
    );

    return new Phaser.Math.Vector2(
      (col + 0.5) * BattleScene.GRID_CELL_WIDTH,
      (row + 0.5) * BattleScene.GRID_CELL_HEIGHT,
    );
  }

  private snapAndCompactPath(
    path: Phaser.Math.Vector2[],
  ): Phaser.Math.Vector2[] {
    if (path.length === 0) {
      return [];
    }

    const snappedPath = path.map((point) => this.snapPointToGrid(point.x, point.y));
    const compactedPath: Phaser.Math.Vector2[] = [snappedPath[0]];
    for (let i = 1; i < snappedPath.length; i += 1) {
      const next = snappedPath[i];
      const previous = compactedPath[compactedPath.length - 1];
      if (next.x === previous.x && next.y === previous.y) {
        continue;
      }
      compactedPath.push(next);
    }

    return compactedPath;
  }

  private drawPathPreview(): void {
    this.pathPreview.clear();
    const previewPath = this.buildCommandPath(this.draggedPath);
    if (previewPath.length < 2) {
      return;
    }

    this.pathPreview.lineStyle(2, 0xbad7f7, 0.9);
    this.pathPreview.beginPath();
    this.pathPreview.moveTo(previewPath[0].x, previewPath[0].y);
    for (let i = 1; i < previewPath.length; i += 1) {
      this.pathPreview.lineTo(previewPath[i].x, previewPath[i].y);
    }
    this.pathPreview.strokePath();
  }

  private clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }

    this.selectedUnits.clear();
  }

  private refreshFogOfWar(): void {
    this.fogOfWarLayer.clear();
    this.fogOfWarLayer.fill(
      BattleScene.SHROUD_COLOR,
      BattleScene.SHROUD_ALPHA,
    );

    const allyVisionSources = this.units.filter(
      (unit) => unit.team === this.localPlayerTeam && unit.isAlive(),
    );

    for (const unit of allyVisionSources) {
      this.fogOfWarLayer.erase(this.visionBrush, unit.x, unit.y);
    }

    const allyCityPosition =
      this.localPlayerTeam === Team.RED
        ? {
            x: GAMEPLAY_CONFIG.spawn.red.x - BattleScene.CITY_BACKLINE_OFFSET,
            y: GAMEPLAY_CONFIG.spawn.red.y,
          }
        : {
            x: GAMEPLAY_CONFIG.spawn.blue.x + BattleScene.CITY_BACKLINE_OFFSET,
            y: GAMEPLAY_CONFIG.spawn.blue.y,
          };
    this.fogOfWarLayer.erase(
      this.cityVisionBrush,
      allyCityPosition.x,
      allyCityPosition.y,
    );

    const visibilitySources: Array<{ x: number; y: number; radius: number }> = [
      ...allyVisionSources.map((unit) => ({
        x: unit.x,
        y: unit.y,
        radius: this.runtimeTuning.fogVisionRadius,
      })),
      {
        x: allyCityPosition.x,
        y: allyCityPosition.y,
        radius: this.runtimeTuning.cityVisionRadius,
      },
    ];

    for (const unit of this.units) {
      if (unit.team === this.localPlayerTeam) {
        unit.setVisible(true);
        continue;
      }

      let isVisibleToPlayer = false;
      for (const source of visibilitySources) {
        const dx = unit.x - source.x;
        const dy = unit.y - source.y;
        const revealRadius =
          source.radius + BattleScene.ENEMY_VISIBILITY_PADDING;
        if (dx * dx + dy * dy <= revealRadius * revealRadius) {
          isVisibleToPlayer = true;
          break;
        }
      }
      unit.setVisible(isVisibleToPlayer);
    }
  }

  private renderMovementLines(): void {
    this.movementLines.clear();
    this.movementLines.lineStyle(2, 0xf4e7b2, 0.75);
    this.movementLines.fillStyle(0xf4e7b2, 0.9);

    for (const [unitId, unit] of this.unitsById) {
      const waypoints = this.plannedPathsByUnitId.get(unitId);
      if (!waypoints || waypoints.length === 0) {
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

  private updateInfluenceDebugFocus(): void {
    if (!this.influenceRenderer) {
      return;
    }

    const focusUnit = this.getInfluenceDebugFocusUnit();
    if (!focusUnit) {
      this.influenceRenderer.setDebugFocusPoint(null);
      return;
    }

    this.influenceRenderer.setDebugFocusPoint({
      x: focusUnit.x,
      y: focusUnit.y,
    });
  }

  private getInfluenceDebugFocusUnit(): Unit | null {
    if (this.selectedUnits.size === 1) {
      const selectedUnit = this.selectedUnits.values().next().value as Unit | undefined;
      if (
        selectedUnit &&
        selectedUnit.team === this.localPlayerTeam &&
        selectedUnit.isAlive()
      ) {
        return selectedUnit;
      }
    }

    const allyUnits = this.units.filter(
      (unit) => unit.team === this.localPlayerTeam && unit.isAlive(),
    );
    if (allyUnits.length === 1) {
      return allyUnits[0];
    }

    return null;
  }

  update(time: number, delta: number): void {
    this.smoothRemoteUnitPositions(delta);
    this.applyCombatVisualWiggle(time);
    this.advancePlannedPaths();
    this.refreshFogOfWar();
    this.renderMovementLines();
    this.updateInfluenceDebugFocus();
    this.influenceRenderer?.render(delta);
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
