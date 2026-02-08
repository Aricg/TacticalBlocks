import Phaser from 'phaser';
import {
  NetworkManager,
  type NetworkUnitSnapshot,
  type NetworkUnitPositionUpdate,
} from './NetworkManager';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';
import { Team } from './Team';
import { Unit, UnitHitbox } from './Unit';

class BattleScene extends Phaser.Scene {
  private readonly units: Unit[] = [];
  private readonly unitsById: Map<string, Unit> = new Map<string, Unit>();
  private readonly lastPublishedUnitPositions: Map<string, Phaser.Math.Vector2> =
    new Map<string, Phaser.Math.Vector2>();
  private readonly selectedUnits: Set<Unit> = new Set<Unit>();
  private networkManager: NetworkManager | null = null;
  private nextUnitPositionSyncTime = 0;
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
  private fogOfWarLayer!: Phaser.GameObjects.RenderTexture;
  private visionBrush!: Phaser.GameObjects.Arc;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;

  private static readonly MAP_WIDTH = GAMEPLAY_CONFIG.map.width;
  private static readonly MAP_HEIGHT = GAMEPLAY_CONFIG.map.height;
  private static readonly FOG_ALPHA = GAMEPLAY_CONFIG.visibility.fogAlpha;
  private static readonly VISION_RADIUS = GAMEPLAY_CONFIG.visibility.visionRadius;
  private static readonly ENEMY_VISIBILITY_PADDING =
    GAMEPLAY_CONFIG.visibility.enemyVisibilityPadding;
  private static readonly FOG_DEPTH = GAMEPLAY_CONFIG.visibility.fogDepth;
  private static readonly DRAG_THRESHOLD = GAMEPLAY_CONFIG.input.dragThreshold;
  private static readonly PREVIEW_PATH_POINT_SPACING =
    GAMEPLAY_CONFIG.input.previewPathPointSpacing;
  private static readonly COMMAND_PATH_POINT_SPACING =
    GAMEPLAY_CONFIG.input.commandPathPointSpacing;
  private static readonly ENGAGEMENT_MAGNET_DISTANCE =
    GAMEPLAY_CONFIG.movement.engagementMagnetDistance;
  private static readonly ENGAGEMENT_HOLD_DISTANCE =
    GAMEPLAY_CONFIG.movement.engagementHoldDistance;
  private static readonly MAGNETISM_SPEED = GAMEPLAY_CONFIG.movement.magnetismSpeed;
  private static readonly ALLY_COLLISION_PUSH_SPEED =
    GAMEPLAY_CONFIG.movement.allyCollisionPushSpeed;
  private static readonly ALLY_SOFT_SEPARATION_DISTANCE =
    GAMEPLAY_CONFIG.movement.allySoftSeparationDistance;
  private static readonly ALLY_SOFT_SEPARATION_PUSH_SPEED =
    GAMEPLAY_CONFIG.movement.allySoftSeparationPushSpeed;
  private static readonly BATTLE_JIGGLE_SPEED =
    GAMEPLAY_CONFIG.combat.battleJiggleSpeed;
  private static readonly BATTLE_JIGGLE_FREQUENCY =
    GAMEPLAY_CONFIG.combat.battleJiggleFrequency;
  private static readonly CONTACT_DAMAGE_PER_SECOND =
    GAMEPLAY_CONFIG.combat.contactDamagePerSecond;
  private static readonly POSITION_SYNC_INTERVAL_MS =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
  private static readonly POSITION_SYNC_EPSILON =
    GAMEPLAY_CONFIG.network.positionSyncEpsilon;

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

    this.selectionBox = this.add.graphics();
    this.selectionBox.setDepth(1000);
    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(950);
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);
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
      BattleScene.VISION_RADIUS,
      0xffffff,
      1,
    );
    this.visionBrush.setVisible(false);
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
    );
    void this.networkManager.connect().catch((error: unknown) => {
      console.error('Failed to connect to battle room.', error);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!this.networkManager) {
        return;
      }

      void this.networkManager.disconnect();
      this.networkManager = null;
    });
  }

  private upsertNetworkUnit(networkUnit: NetworkUnitSnapshot): void {
    const existingUnit = this.unitsById.get(networkUnit.unitId);
    if (existingUnit) {
      existingUnit.setPosition(networkUnit.x, networkUnit.y);
      return;
    }

    const team =
      networkUnit.team.toUpperCase() === Team.RED
        ? Team.RED
        : Team.BLUE;
    const spawnedUnit = new Unit(this, networkUnit.x, networkUnit.y, team);
    this.units.push(spawnedUnit);
    this.unitsById.set(networkUnit.unitId, spawnedUnit);
  }

  private removeNetworkUnit(unitId: string): void {
    const unit = this.unitsById.get(unitId);
    if (!unit) {
      return;
    }

    this.unitsById.delete(unitId);
    this.lastPublishedUnitPositions.delete(unitId);
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

    unit.setPosition(positionUpdate.x, positionUpdate.y);
  }

  private applyAssignedTeam(teamValue: string): void {
    const assignedTeam =
      teamValue.toUpperCase() === Team.RED ? Team.RED : Team.BLUE;
    if (assignedTeam === this.localPlayerTeam) {
      return;
    }

    this.clearSelection();
    this.localPlayerTeam = assignedTeam;
    this.lastPublishedUnitPositions.clear();
    this.refreshFogOfWar();
  }

  private publishLocalUnitPositions(time: number): void {
    if (!this.networkManager || time < this.nextUnitPositionSyncTime) {
      return;
    }

    this.nextUnitPositionSyncTime = time + BattleScene.POSITION_SYNC_INTERVAL_MS;

    for (const [unitId, unit] of this.unitsById) {
      if (!unit.isAlive() || unit.team !== this.localPlayerTeam) {
        continue;
      }

      const lastPublished = this.lastPublishedUnitPositions.get(unitId);
      if (lastPublished) {
        const distance = Phaser.Math.Distance.Between(
          lastPublished.x,
          lastPublished.y,
          unit.x,
          unit.y,
        );
        if (distance < BattleScene.POSITION_SYNC_EPSILON) {
          continue;
        }
      }

      this.networkManager.sendUnitPosition({
        unitId,
        x: unit.x,
        y: unit.y,
      });

      if (lastPublished) {
        lastPublished.set(unit.x, unit.y);
      } else {
        this.lastPublishedUnitPositions.set(
          unitId,
          new Phaser.Math.Vector2(unit.x, unit.y),
        );
      }
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

    const movementCommandMode = shiftHeld
      ? { speedMultiplier: 0.5, rotateToFace: false }
      : undefined;

    for (const unit of this.selectedUnits) {
      const offsetX = unit.x - formationCenterX;
      const offsetY = unit.y - formationCenterY;
      unit.setDestination(
        targetX + offsetX,
        targetY + offsetY,
        movementCommandMode,
      );
    }
  }

  private commandSelectedUnitsAlongPath(
    path: Phaser.Math.Vector2[],
    shiftHeld = false,
  ): void {
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

    const movementCommandMode = shiftHeld
      ? { speedMultiplier: 0.5, rotateToFace: false }
      : undefined;

    for (const unit of this.selectedUnits) {
      const offsetX = unit.x - formationCenterX;
      const offsetY = unit.y - formationCenterY;
      const unitPath = path.map(
        (point) => new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY),
      );
      unit.setPath(unitPath, movementCommandMode);
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
    const timeNow = this.time.now;

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
        const overlap = this.getHitboxOverlap(a, b);
        const hitboxesOverlap = overlap !== null;
        const opposingTeams = a.team !== b.team;
        const previouslyEngagedPair =
          opposingTeams && (a.wasEngagedWith(b) || b.wasEngagedWith(a));
        const canStartNewEngagement =
          opposingTeams && a.engagedUnits.size === 0 && b.engagedUnits.size === 0;
        const engagementAllowed = previouslyEngagedPair || canStartNewEngagement;
        const stickyEngagement =
          previouslyEngagedPair &&
          distance <= BattleScene.ENGAGEMENT_HOLD_DISTANCE;
        const shouldMagnetize =
          engagementAllowed &&
          !hitboxesOverlap &&
          (distance <= BattleScene.ENGAGEMENT_MAGNET_DISTANCE || stickyEngagement);
        const shouldBattleJiggle =
          engagementAllowed &&
          (hitboxesOverlap || stickyEngagement);
        const safeDirection =
          distance > 0.0001
            ? delta.clone().scale(1 / distance)
            : new Phaser.Math.Vector2(1, 0);
        const aCanBePushedByEnemy = this.canBePushedByEnemy(a);
        const bCanBePushedByEnemy = this.canBePushedByEnemy(b);
        const pushableUnitCount =
          Number(aCanBePushedByEnemy) + Number(bCanBePushedByEnemy);
        const displacementNormalization =
          pushableUnitCount > 0 ? 2 / pushableUnitCount : 0;

        // 0. Soft ally spacing: keep formations from collapsing into dense clumps.
        if (!opposingTeams && distance < BattleScene.ALLY_SOFT_SEPARATION_DISTANCE) {
          const spacingRatio =
            1 - distance / BattleScene.ALLY_SOFT_SEPARATION_DISTANCE;
          const pushDistance =
            BattleScene.ALLY_SOFT_SEPARATION_PUSH_SPEED *
            spacingRatio *
            deltaSeconds;
          const separation = safeDirection.clone().scale(pushDistance * 0.5);
          a.setPosition(a.x - separation.x, a.y - separation.y);
          b.setPosition(b.x + separation.x, b.y + separation.y);
        }

        // 0. Ally collision response: apply a separation force each frame while overlapping.
        if (!opposingTeams && overlap) {
          const maxPushDistance =
            BattleScene.ALLY_COLLISION_PUSH_SPEED * deltaSeconds;
          const pushDistance = Math.min(overlap.depth * 0.5, maxPushDistance);
          const separation = overlap.normal.clone().scale(pushDistance);
          a.setPosition(a.x - separation.x, a.y - separation.y);
          b.setPosition(b.x + separation.x, b.y + separation.y);
        }

        // 1. Magnetism (Opposing teams, close but not touching)
        if (shouldMagnetize) {
          const pull = safeDirection
            .clone()
            .scale(BattleScene.MAGNETISM_SPEED * deltaSeconds);
          if (aCanBePushedByEnemy) {
            const aStep = displacementNormalization;
            a.x += pull.x * aStep;
            a.y += pull.y * aStep;
          }
          if (bCanBePushedByEnemy) {
            const bStep = displacementNormalization;
            b.x -= pull.x * bStep;
            b.y -= pull.y * bStep;
          }
          a.engagedUnits.add(b);
          b.engagedUnits.add(a);
        }

        // 2. Combat close-range jitter cue (opposing teams only)
        if (shouldBattleJiggle) {
          const phase =
            timeNow * BattleScene.BATTLE_JIGGLE_FREQUENCY + i * 1.7 + j * 2.3;
          const jiggleStep =
            Math.sin(phase) * BattleScene.BATTLE_JIGGLE_SPEED * deltaSeconds;
          if (aCanBePushedByEnemy) {
            const aStep = jiggleStep * displacementNormalization;
            a.x += safeDirection.x * aStep;
            a.y += safeDirection.y * aStep;
          }
          if (bCanBePushedByEnemy) {
            const bStep = jiggleStep * displacementNormalization;
            b.x -= safeDirection.x * bStep;
            b.y -= safeDirection.y * bStep;
          }
          a.engagedUnits.add(b);
          b.engagedUnits.add(a);
        }

        // 3. Contact combat + hard collision separation (same hitbox model as selection body)
        if (opposingTeams && overlap) {
          if (engagementAllowed) {
            a.cancelMovement();
            b.cancelMovement();
            a.applyContactDamage(BattleScene.CONTACT_DAMAGE_PER_SECOND, deltaSeconds);
            b.applyContactDamage(BattleScene.CONTACT_DAMAGE_PER_SECOND, deltaSeconds);
            a.engagedUnits.add(b);
            b.engagedUnits.add(a);
          }
          const totalPushable =
            pushableUnitCount;
          if (totalPushable > 0) {
            const separationPerShare = overlap.depth / totalPushable;
            if (aCanBePushedByEnemy) {
              const separationA = overlap.normal
                .clone()
                .scale(separationPerShare);
              a.setPosition(a.x - separationA.x, a.y - separationA.y);
            }
            if (bCanBePushedByEnemy) {
              const separationB = overlap.normal
                .clone()
                .scale(separationPerShare);
              b.setPosition(b.x + separationB.x, b.y + separationB.y);
            }
          }
        }
      }
    }
  }

  private canBePushedByEnemy(unit: Unit): boolean {
    if (unit.team === this.localPlayerTeam) {
      return true;
    }

    return unit.isHealthInRedZone();
  }

  private getHitboxOverlap(
    a: Unit,
    b: Unit,
  ): { normal: Phaser.Math.Vector2; depth: number } | null {
    const hitboxA = a.getHitbox();
    const hitboxB = b.getHitbox();
    const centerDelta = hitboxB.center.clone().subtract(hitboxA.center);
    const axes = [hitboxA.axisX, hitboxA.axisY, hitboxB.axisX, hitboxB.axisY];

    let minimumOverlap = Number.POSITIVE_INFINITY;
    let minimumAxis: Phaser.Math.Vector2 | null = null;

    for (const axis of axes) {
      const centerDistance = Math.abs(centerDelta.dot(axis));
      const projectedRadiusA = this.projectHitboxRadius(hitboxA, axis);
      const projectedRadiusB = this.projectHitboxRadius(hitboxB, axis);
      const overlap = projectedRadiusA + projectedRadiusB - centerDistance;

      if (overlap <= 0) {
        return null;
      }

      if (overlap < minimumOverlap) {
        minimumOverlap = overlap;
        minimumAxis = axis.clone();
      }
    }

    if (!minimumAxis) {
      return null;
    }

    if (centerDelta.dot(minimumAxis) < 0) {
      minimumAxis.scale(-1);
    }

    return {
      normal: minimumAxis,
      depth: minimumOverlap,
    };
  }

  private projectHitboxRadius(
    hitbox: UnitHitbox,
    axis: Phaser.Math.Vector2,
  ): number {
    return (
      hitbox.halfWidth * Math.abs(axis.dot(hitbox.axisX)) +
      hitbox.halfHeight * Math.abs(axis.dot(hitbox.axisY))
    );
  }

  private removeDeadUnits(): void {
    for (let i = this.units.length - 1; i >= 0; i -= 1) {
      const unit = this.units[i];
      if (unit.isAlive()) {
        continue;
      }

      for (const [unitId, trackedUnit] of this.unitsById) {
        if (trackedUnit === unit) {
          this.unitsById.delete(unitId);
          this.lastPublishedUnitPositions.delete(unitId);
          break;
        }
      }
      this.selectedUnits.delete(unit);
      unit.destroy();
      this.units.splice(i, 1);
    }
  }

  private refreshFogOfWar(): void {
    this.fogOfWarLayer.clear();
    this.fogOfWarLayer.fill(0x000000, BattleScene.FOG_ALPHA);

    const allyVisionSources = this.units.filter(
      (unit) => unit.team === this.localPlayerTeam && unit.isAlive(),
    );

    for (const unit of allyVisionSources) {
      this.fogOfWarLayer.erase(this.visionBrush, unit.x, unit.y);
    }

    const revealRadiusSq =
      (BattleScene.VISION_RADIUS + BattleScene.ENEMY_VISIBILITY_PADDING) **
      2;
    for (const unit of this.units) {
      if (unit.team === this.localPlayerTeam) {
        unit.setVisible(true);
        continue;
      }

      let isVisibleToPlayer = false;
      for (const ally of allyVisionSources) {
        const dx = unit.x - ally.x;
        const dy = unit.y - ally.y;
        if (dx * dx + dy * dy <= revealRadiusSq) {
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

  update(time: number, delta: number): void {
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
    this.publishLocalUnitPositions(time);
    this.removeDeadUnits();
    this.refreshFogOfWar();
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
