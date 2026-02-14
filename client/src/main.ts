import Phaser from 'phaser';
import {
  type NetworkBattleEndedUpdate,
  type NetworkCityOwnershipUpdate,
  type NetworkInfluenceGridUpdate,
  type NetworkLobbyStateUpdate,
  NetworkManager,
  type NetworkUnitHealthUpdate,
  type NetworkMatchPhase,
  type NetworkUnitRotationUpdate,
  type NetworkUnitSnapshot,
  type NetworkUnitPositionUpdate,
  type NetworkUnitMoraleUpdate,
  type NetworkUnitPathCommand,
} from './NetworkManager';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';
import {
  getNeutralCityGridCoordinates,
  getTeamCityGridCoordinate,
  isGridCellImpassable,
} from '../../shared/src/terrainGrid.js';
import {
  applyRuntimeTuningUpdate,
  DEFAULT_RUNTIME_TUNING,
  type RuntimeTuning,
} from '../../shared/src/runtimeTuning.js';
import { City, type CityOwner } from './City';
import { BattleInputController } from './BattleInputController';
import { FogOfWarController } from './FogOfWarController';
import { InfluenceRenderer } from './InfluenceRenderer';
import {
  applyLobbyStateFlow,
  applySelectedLobbyMapFlow,
  canRequestGenerateLobbyMap,
  canRequestRandomLobbyMap,
  getLobbyMapStepRequest,
} from './LobbyFlowController';
import {
  LobbyOverlayController,
  type LobbyOverlayPlayerView,
} from './LobbyOverlayController';
import { PathPreviewRenderer } from './PathPreviewRenderer';
import { RuntimeTuningPanel } from './RuntimeTuningPanel';
import { Team } from './Team';
import {
  advancePlannedPaths,
  buildMovementCommandMode,
  clipPathTargetsByTerrain,
  getFormationCenter,
  gridToWorldCenter,
  setPlannedPath,
  snapAndCompactPath,
  worldToGridCoordinate,
  type GridCoordinate,
  type UnitCommandPlannerGridMetrics,
} from './UnitCommandPlanner';
import { type TerrainType, Unit } from './Unit';
import { buildBattleEndedAnnouncement } from './network/BattleTransitionApplier';
import { applyCityOwnershipState } from './network/CityStateApplier';
import {
  applyNetworkUnitHealthState,
  applyNetworkUnitMoraleState,
  applyNetworkUnitPositionState,
  applyNetworkUnitRotationState,
  normalizeNetworkTeam,
  removeNetworkUnitState,
  upsertNetworkUnitState,
} from './network/UnitStateApplier';
import {
  refreshUnitTerrainTint,
  runVisualUpdatePipeline,
} from './VisualUpdatePipeline';

type TerrainSwatch = {
  color: number;
  type: TerrainType;
};

const MAP_IMAGE_BY_PATH = import.meta.glob('../../shared/*-16c.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function getTextureKeyForMapId(mapId: string): string {
  return `battle-map-${mapId}`;
}

function resolveMapImageById(mapId: string): string | undefined {
  const exactPath = `../../shared/${mapId}-16c.png`;
  const exactMatch = MAP_IMAGE_BY_PATH[exactPath];
  if (exactMatch) {
    return exactMatch;
  }

  const suffix = `/${mapId}-16c.png`;
  for (const [path, image] of Object.entries(MAP_IMAGE_BY_PATH)) {
    if (path.endsWith(suffix)) {
      return image;
    }
  }

  return undefined;
}

function getBundledMapIds(): string[] {
  return Object.keys(MAP_IMAGE_BY_PATH)
    .map((filePath) => filePath.replace('../../shared/', '').replace('-16c.png', ''))
    .sort();
}

function resolveInitialMapId(): string {
  const configuredMapId = GAMEPLAY_CONFIG.map.activeMapId;
  if (resolveMapImageById(configuredMapId)) {
    return configuredMapId;
  }

  const fallbackFromConfig = GAMEPLAY_CONFIG.map.availableMapIds.find((mapId) =>
    Boolean(resolveMapImageById(mapId)),
  );
  if (fallbackFromConfig) {
    return fallbackFromConfig;
  }

  const bundledMapIds = getBundledMapIds();
  const firstBundledMapId = bundledMapIds[0];
  if (firstBundledMapId) {
    return firstBundledMapId;
  }

  throw new Error('No map images were bundled. Expected files matching "../../shared/*-16c.png".');
}

class BattleScene extends Phaser.Scene {
  private static readonly TERRAIN_SWATCHES: TerrainSwatch[] = [
    { color: 0x0f2232, type: 'water' },
    { color: 0x102236, type: 'water' },
    { color: 0x71844b, type: 'grass' },
    { color: 0x70834e, type: 'grass' },
    { color: 0x748764, type: 'grass' },
    { color: 0x364d31, type: 'forest' },
    { color: 0x122115, type: 'forest' },
    { color: 0xc4a771, type: 'hills' },
    { color: 0x9e8c5d, type: 'hills' },
    { color: 0xa79168, type: 'hills' },
    { color: 0xefb72f, type: 'hills' },
    { color: 0xddb650, type: 'hills' },
    { color: 0x708188, type: 'mountains' },
    { color: 0x6d7e85, type: 'mountains' },
    { color: 0x5a6960, type: 'mountains' },
    { color: 0x404b3c, type: 'mountains' },
    { color: 0x6a7c8c, type: 'mountains' },
    { color: 0x4e5f5d, type: 'mountains' },
    { color: 0x3a4a54, type: 'mountains' },
    { color: 0x96a2a0, type: 'mountains' },
  ];
  private static readonly TERRAIN_BY_COLOR = new Map<number, TerrainType>(
    BattleScene.TERRAIN_SWATCHES.map((swatch) => [swatch.color, swatch.type]),
  );
  private readonly units: Unit[] = [];
  private readonly unitsById: Map<string, Unit> = new Map<string, Unit>();
  private readonly plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]> =
    new Map<string, Phaser.Math.Vector2[]>();
  private readonly pendingUnitPathCommandsByUnitId: Map<
    string,
    NetworkUnitPathCommand
  > = new Map<string, NetworkUnitPathCommand>();
  private readonly remoteUnitTargetPositions: Map<string, Phaser.Math.Vector2> =
    new Map<string, Phaser.Math.Vector2>();
  private readonly remoteUnitInterpolationByUnitId: Map<
    string,
    {
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      startedAtMs: number;
      durationMs: number;
      lastAuthoritativeAtMs: number;
    }
  > = new Map<
    string,
    {
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      startedAtMs: number;
      durationMs: number;
      lastAuthoritativeAtMs: number;
    }
  >();
  private readonly lastKnownHealthByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly combatVisualUntilByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly moraleScoreByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly cities: City[] = [];
  private readonly cityByHomeTeam: Record<Team, City | null> = {
    [Team.RED]: null,
    [Team.BLUE]: null,
  };
  private neutralCityGridCoordinates: GridCoordinate[] = [];
  private readonly neutralCities: City[] = [];
  private cityOwnerByHomeTeam: Record<Team, Team> = {
    [Team.RED]: Team.RED,
    [Team.BLUE]: Team.BLUE,
  };
  private neutralCityOwners: CityOwner[] = [];
  private readonly selectedUnits: Set<Unit> = new Set<Unit>();
  private networkManager: NetworkManager | null = null;
  private mapBackground: Phaser.GameObjects.Image | null = null;
  private activeMapId = resolveInitialMapId();
  private availableMapIds: string[] = [...GAMEPLAY_CONFIG.map.availableMapIds];
  private selectedLobbyMapId = this.activeMapId;
  private lobbyMapRevision = 0;
  private isLobbyGeneratingMap = false;
  private lastBattleAnnouncement: string | null = null;
  private mapTextureKey = getTextureKeyForMapId(this.activeMapId);
  private localPlayerTeam: Team = Team.BLUE;
  private matchPhase: NetworkMatchPhase = 'LOBBY';
  private localSessionId: string | null = null;
  private localLobbyReady = false;
  private hasExitedBattle = false;
  private lobbyPlayers: LobbyOverlayPlayerView[] = [];
  private inputController: BattleInputController | null = null;
  private pathPreviewRenderer: PathPreviewRenderer | null = null;
  private fogOfWarController: FogOfWarController | null = null;
  private lobbyOverlayController: LobbyOverlayController | null = null;
  private selectionBox!: Phaser.GameObjects.Graphics;
  private movementLines!: Phaser.GameObjects.Graphics;
  private impassableOverlay!: Phaser.GameObjects.Graphics;
  private influenceRenderer: InfluenceRenderer | null = null;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private tuningPanel: RuntimeTuningPanel | null = null;
  private mapSamplingWidth = 0;
  private mapSamplingHeight = 0;

  private static readonly MAP_WIDTH = GAMEPLAY_CONFIG.map.width;
  private static readonly MAP_HEIGHT = GAMEPLAY_CONFIG.map.height;
  private static readonly SHROUD_COLOR = GAMEPLAY_CONFIG.visibility.shroudColor;
  private static readonly SHROUD_ALPHA = GAMEPLAY_CONFIG.visibility.shroudAlpha;
  private static readonly ENEMY_VISIBILITY_PADDING =
    GAMEPLAY_CONFIG.visibility.enemyVisibilityPadding;
  private static readonly FOG_DEPTH = GAMEPLAY_CONFIG.visibility.fogDepth;
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
  private static readonly UNIT_COMMAND_GRID_METRICS: UnitCommandPlannerGridMetrics =
    {
      width: BattleScene.GRID_WIDTH,
      height: BattleScene.GRID_HEIGHT,
      cellWidth: BattleScene.GRID_CELL_WIDTH,
      cellHeight: BattleScene.GRID_CELL_HEIGHT,
    };
  private static readonly REMOTE_POSITION_LERP_RATE =
    GAMEPLAY_CONFIG.network.remotePositionLerpRate;
  private static readonly REMOTE_POSITION_SNAP_DISTANCE =
    GAMEPLAY_CONFIG.network.remotePositionSnapDistance;
  private static readonly REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
  private static readonly REMOTE_POSITION_INTERPOLATION_MAX_DURATION_MS = 3000;
  private static readonly REMOTE_POSITION_INTERPOLATION_BASE_SPEED =
    GAMEPLAY_CONFIG.movement.unitMoveSpeed;
  private static readonly REMOTE_POSITION_AUTHORITATIVE_SNAP_DISTANCE =
    BattleScene.REMOTE_POSITION_SNAP_DISTANCE * 3;
  private static readonly PLANNED_PATH_WAYPOINT_REACHED_DISTANCE = 12;
  private static readonly COMBAT_WIGGLE_HOLD_MS = 250;
  private static readonly COMBAT_WIGGLE_AMPLITUDE = 1.8;
  private static readonly COMBAT_WIGGLE_FREQUENCY = 0.018;
  private static readonly SHOW_IMPASSABLE_OVERLAY = true;
  private static readonly IMPASSABLE_OVERLAY_DEPTH = 930;
  private static readonly IMPASSABLE_OVERLAY_FILL_COLOR = 0xff1f1f;
  private static readonly IMPASSABLE_OVERLAY_FILL_ALPHA = 0.28;
  private static readonly IMPASSABLE_OVERLAY_STROKE_COLOR = 0xb30000;
  private static readonly IMPASSABLE_OVERLAY_STROKE_ALPHA = 0.55;
  private static readonly LOBBY_OVERLAY_DEPTH = 2200;

  constructor() {
    super({ key: 'BattleScene' });
  }

  preload(): void {
    const bundledMapIds = getBundledMapIds();
    for (const mapId of bundledMapIds) {
      const imagePath = resolveMapImageById(mapId);
      if (!imagePath) {
        continue;
      }
      this.load.image(getTextureKeyForMapId(mapId), imagePath);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2f7d32);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, BattleScene.MAP_WIDTH, BattleScene.MAP_HEIGHT);
    this.applyMapIdToRuntimeTerrain(this.activeMapId);
    this.neutralCityGridCoordinates = getNeutralCityGridCoordinates();
    this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');
    this.mapBackground = this.add
      .image(0, 0, this.mapTextureKey)
      .setOrigin(0, 0)
      .setDisplaySize(BattleScene.MAP_WIDTH, BattleScene.MAP_HEIGHT)
      .setDepth(-1000);
    this.initializeMapTerrainSampling();
    this.input.mouse?.disableContextMenu();
    this.shiftKey =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) ?? null;
    this.createCities();

    this.selectionBox = this.add.graphics();
    this.selectionBox.setDepth(1000);
    this.pathPreviewRenderer = new PathPreviewRenderer(this, {
      depth: 950,
      previewPointSpacing: BattleScene.PREVIEW_PATH_POINT_SPACING,
      commandPointSpacing: BattleScene.COMMAND_PATH_POINT_SPACING,
      lineThickness: 2,
      lineColor: 0xbad7f7,
      lineAlpha: 0.9,
    });
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);
    this.impassableOverlay = this.add.graphics();
    this.impassableOverlay.setDepth(BattleScene.IMPASSABLE_OVERLAY_DEPTH);
    this.drawImpassableOverlay();
    this.influenceRenderer = new InfluenceRenderer(this);
    this.fogOfWarController = new FogOfWarController(this, {
      mapWidth: BattleScene.MAP_WIDTH,
      mapHeight: BattleScene.MAP_HEIGHT,
      depth: BattleScene.FOG_DEPTH,
      shroudColor: BattleScene.SHROUD_COLOR,
      shroudAlpha: BattleScene.SHROUD_ALPHA,
      enemyVisibilityPadding: BattleScene.ENEMY_VISIBILITY_PADDING,
    });
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
    this.createLobbyOverlay();
    this.refreshLobbyOverlay();

    this.inputController = new BattleInputController(
      this,
      {
        isBattleActive: () => this.isBattleActive(),
        resolveOwnedUnit: (gameObject: Phaser.GameObjects.GameObject) => {
          const clickedUnit = Unit.fromGameObject(gameObject);
          if (!clickedUnit || clickedUnit.team !== this.localPlayerTeam) {
            return null;
          }
          return clickedUnit;
        },
        isUnitSelected: (unit: Unit) => this.selectedUnits.has(unit),
        hasSelectedUnits: () => this.selectedUnits.size > 0,
        selectOnlyUnit: (unit: Unit) => this.selectOnlyUnit(unit),
        clearSelection: () => this.clearSelection(),
        commandSelectedUnits: (
          targetX: number,
          targetY: number,
          shiftHeld: boolean,
        ) => this.commandSelectedUnits(targetX, targetY, shiftHeld),
        commandSelectedUnitsAlongPath: (
          path: Phaser.Math.Vector2[],
          shiftHeld: boolean,
        ) => this.commandSelectedUnitsAlongPath(path, shiftHeld),
        selectUnitsInBox: (
          startX: number,
          startY: number,
          endX: number,
          endY: number,
        ) => this.selectUnitsInBox(startX, startY, endX, endY),
        drawSelectionBox: (
          startX: number,
          startY: number,
          currentX: number,
          currentY: number,
        ) => this.drawSelectionBox(startX, startY, currentX, currentY),
        clearSelectionBox: () => this.clearSelectionBox(),
        appendDraggedPathPoint: (
          draggedPath: Phaser.Math.Vector2[],
          x: number,
          y: number,
          forceAppend?: boolean,
        ) => this.appendDraggedPathPoint(draggedPath, x, y, forceAppend),
        drawPathPreview: (draggedPath: Phaser.Math.Vector2[]) =>
          this.drawPathPreview(draggedPath),
        clearPathPreview: () => this.pathPreviewRenderer?.clear(),
        buildCommandPath: (path: Phaser.Math.Vector2[]) =>
          this.buildCommandPath(path),
        cancelSelectedUnitMovement: () => this.cancelSelectedUnitMovement(),
        engageSelectedUnitMovement: () => this.engageSelectedUnitMovement(),
        isShiftHeld: (pointer: Phaser.Input.Pointer) => this.isShiftHeld(pointer),
        exitBattle: () => this.exitBattle(),
      },
      {
        dragThreshold: BattleScene.DRAG_THRESHOLD,
      },
    );

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
      (lobbyState) => {
        this.applyLobbyState(lobbyState);
      },
      (battleEnded) => {
        this.applyBattleEnded(battleEnded);
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
      (moraleUpdate) => {
        this.applyNetworkUnitMorale(moraleUpdate);
      },
      (influenceGridUpdate) => {
        this.applyInfluenceGrid(influenceGridUpdate);
      },
      (cityOwnershipUpdate) => {
        this.applyCityOwnership(cityOwnershipUpdate);
      },
      (runtimeTuning) => {
        this.applyRuntimeTuning(runtimeTuning);
      },
    );
    const networkManager = this.networkManager;
    void networkManager
      .connect()
      .then(() => {
        if (!this.hasExitedBattle) {
          return;
        }
        void networkManager.disconnect().catch((error: unknown) => {
          console.error('Failed to disconnect after escape exit.', error);
        });
      })
      .catch((error: unknown) => {
        console.error('Failed to connect to battle room.', error);
      });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputController?.destroy();
      this.inputController = null;
      this.pathPreviewRenderer?.destroy();
      this.pathPreviewRenderer = null;
      this.fogOfWarController?.destroy();
      this.fogOfWarController = null;
      this.lobbyOverlayController?.destroy();
      this.lobbyOverlayController = null;
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
      this.neutralCities.length = 0;
      this.cityByHomeTeam[Team.RED] = null;
      this.cityByHomeTeam[Team.BLUE] = null;
      this.neutralCityOwners = this.neutralCityGridCoordinates.map(
        () => 'NEUTRAL',
      );
      this.lastKnownHealthByUnitId.clear();
      this.combatVisualUntilByUnitId.clear();
      this.moraleScoreByUnitId.clear();
      this.tuningPanel?.destroy();
      this.tuningPanel = null;
      this.mapBackground = null;
    });
  }

  private createCities(): void {
    const redCityPosition = this.getCityWorldPosition(Team.RED);
    const blueCityPosition = this.getCityWorldPosition(Team.BLUE);
    const redCity = new City(
      this,
      redCityPosition.x,
      redCityPosition.y,
      this.cityOwnerByHomeTeam[Team.RED],
    );
    const blueCity = new City(
      this,
      blueCityPosition.x,
      blueCityPosition.y,
      this.cityOwnerByHomeTeam[Team.BLUE],
    );

    this.cityByHomeTeam[Team.RED] = redCity;
    this.cityByHomeTeam[Team.BLUE] = blueCity;
    this.cities.push(redCity, blueCity);

    for (let index = 0; index < this.neutralCityGridCoordinates.length; index += 1) {
      const neutralCell = this.neutralCityGridCoordinates[index];
      const neutralPosition = gridToWorldCenter(
        neutralCell,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const neutralCity = new City(
        this,
        neutralPosition.x,
        neutralPosition.y,
        this.neutralCityOwners[index] ?? 'NEUTRAL',
      );
      this.cities.push(neutralCity);
      this.neutralCities.push(neutralCity);
    }
  }

  private rebuildCitiesForCurrentMap(): void {
    for (const city of this.cities) {
      city.destroy();
    }
    this.cities.length = 0;
    this.neutralCities.length = 0;
    this.cityByHomeTeam[Team.RED] = null;
    this.cityByHomeTeam[Team.BLUE] = null;
    this.createCities();
  }

  private applyMapIdToRuntimeTerrain(mapId: string): void {
    (
      GAMEPLAY_CONFIG.map as unknown as {
        activeMapId: string;
      }
    ).activeMapId = mapId;
  }

  private reloadMapTexture(mapId: string, revision: number): void {
    const imagePath = resolveMapImageById(mapId);
    if (!imagePath) {
      return;
    }

    const textureKey = getTextureKeyForMapId(mapId);
    const cacheBustedPath = `${imagePath}${imagePath.includes('?') ? '&' : '?'}rev=${revision}`;
    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }

    this.load.once('complete', () => {
      if (!this.mapBackground || this.activeMapId !== mapId) {
        return;
      }
      this.mapBackground.setTexture(textureKey);
      this.initializeMapTerrainSampling();
      this.refreshFogOfWar();
    });
    this.load.image(textureKey, cacheBustedPath);
    if (!this.load.isLoading()) {
      this.load.start();
    }
  }

  private applySelectedLobbyMap(
    requestedMapId: string,
    forceTextureReload = false,
  ): void {
    applySelectedLobbyMapFlow({
      requestedMapId,
      availableMapIds: this.availableMapIds,
      activeMapId: this.activeMapId,
      lobbyMapRevision: this.lobbyMapRevision,
      forceTextureReload,
      hasMapImage: (mapId) => Boolean(resolveMapImageById(mapId)),
      resolveFallbackMapId: () => resolveInitialMapId(),
      effects: {
        setSelectedLobbyMapId: (mapId: string) => {
          this.selectedLobbyMapId = mapId;
        },
        applyMapIdToRuntimeTerrain: (mapId: string) => {
          this.applyMapIdToRuntimeTerrain(mapId);
        },
        resetNeutralCities: () => {
          this.neutralCityGridCoordinates = getNeutralCityGridCoordinates();
          this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');
        },
        rebuildCitiesForCurrentMap: () => {
          this.rebuildCitiesForCurrentMap();
        },
        drawImpassableOverlay: () => {
          this.drawImpassableOverlay();
        },
        reloadMapTexture: (mapId: string, revision: number) => {
          this.reloadMapTexture(mapId, revision);
        },
        applyLoadedMapTexture: (mapId: string) => {
          this.activeMapId = mapId;
          this.mapTextureKey = getTextureKeyForMapId(mapId);
          if (this.mapBackground) {
            this.mapBackground.setTexture(this.mapTextureKey);
          }
        },
        initializeMapTerrainSampling: () => {
          this.initializeMapTerrainSampling();
        },
        refreshFogOfWar: () => {
          this.refreshFogOfWar();
        },
      },
    });
  }

  private requestLobbyMapStep(step: number): void {
    if (!this.networkManager) {
      return;
    }

    const nextMapId = getLobbyMapStepRequest({
      matchPhase: this.matchPhase,
      hasExitedBattle: this.hasExitedBattle,
      selectedLobbyMapId: this.selectedLobbyMapId,
      availableMapIds: this.availableMapIds,
      step,
      hasMapImage: (mapId) => Boolean(resolveMapImageById(mapId)),
    });
    if (!nextMapId) {
      return;
    }

    this.selectedLobbyMapId = nextMapId;
    this.networkManager.sendLobbySelectMap(nextMapId);
    this.refreshLobbyOverlay();
  }

  private requestRandomLobbyMap(): void {
    if (!this.networkManager) {
      return;
    }

    if (
      !canRequestRandomLobbyMap({
        matchPhase: this.matchPhase,
        hasExitedBattle: this.hasExitedBattle,
        availableMapIds: this.availableMapIds,
        hasMapImage: (mapId) => Boolean(resolveMapImageById(mapId)),
      })
    ) {
      return;
    }

    this.networkManager.sendLobbyRandomMap();
  }

  private requestGenerateLobbyMap(): void {
    if (!this.networkManager) {
      return;
    }

    if (
      !canRequestGenerateLobbyMap({
        matchPhase: this.matchPhase,
        hasExitedBattle: this.hasExitedBattle,
        isLobbyGeneratingMap: this.isLobbyGeneratingMap,
      })
    ) {
      return;
    }

    this.networkManager.sendLobbyGenerateMap();
  }

  private createLobbyOverlay(): void {
    this.lobbyOverlayController = new LobbyOverlayController(
      this,
      {
        onCycleMap: (step: number) => this.requestLobbyMapStep(step),
        onRandomMap: () => this.requestRandomLobbyMap(),
        onGenerateMap: () => this.requestGenerateLobbyMap(),
        onToggleReady: () => this.toggleLobbyReady(),
        isShiftHeld: (pointer: Phaser.Input.Pointer) => this.isShiftHeld(pointer),
        canUseMapId: (mapId: string) => Boolean(resolveMapImageById(mapId)),
      },
      {
        mapWidth: BattleScene.MAP_WIDTH,
        mapHeight: BattleScene.MAP_HEIGHT,
        depth: BattleScene.LOBBY_OVERLAY_DEPTH,
      },
    );
  }

  private toggleLobbyReady(): void {
    if (!this.networkManager || this.matchPhase !== 'LOBBY') {
      return;
    }

    this.localLobbyReady = !this.localLobbyReady;
    this.networkManager.sendLobbyReady(this.localLobbyReady);
    this.refreshLobbyOverlay();
  }

  private applyLobbyState(lobbyStateUpdate: NetworkLobbyStateUpdate): void {
    const previousPhase = this.matchPhase;
    applyLobbyStateFlow({
      lobbyStateUpdate,
      previousPhase,
      previousMapRevision: this.lobbyMapRevision,
      previousLobbyPlayers: this.lobbyPlayers,
      activeMapId: this.activeMapId,
      selectedLobbyMapId: this.selectedLobbyMapId,
      fallbackAvailableMapIds: GAMEPLAY_CONFIG.map.availableMapIds,
      normalizeTeam: (teamValue) => normalizeNetworkTeam(teamValue),
      applySelectedLobbyMap: (requestedMapId, forceTextureReload) => {
        this.applySelectedLobbyMap(requestedMapId, forceTextureReload);
      },
      applyDerivedLobbyState: (lobbyState) => {
        this.matchPhase = lobbyState.nextPhase;
        this.localSessionId = lobbyState.localSessionId;
        this.lobbyMapRevision = lobbyState.lobbyMapRevision;
        this.isLobbyGeneratingMap = lobbyState.isLobbyGeneratingMap;
        this.availableMapIds = lobbyState.availableMapIds;
        this.lobbyPlayers = lobbyState.lobbyPlayers;
        this.localLobbyReady = lobbyState.localLobbyReady;
      },
      onPhaseTransition: (nextPhase) => {
        this.resetPointerInteractionState();
        this.clearSelection();
        this.plannedPathsByUnitId.clear();
        this.pendingUnitPathCommandsByUnitId.clear();
        if (nextPhase === 'BATTLE') {
          this.lastBattleAnnouncement = null;
        }
      },
    });

    this.refreshLobbyOverlay();
  }

  private applyBattleEnded(battleEndedUpdate: NetworkBattleEndedUpdate): void {
    this.lastBattleAnnouncement = buildBattleEndedAnnouncement(battleEndedUpdate);
    this.matchPhase = 'LOBBY';
    this.resetPointerInteractionState();
    this.clearSelection();
    this.plannedPathsByUnitId.clear();
    this.pendingUnitPathCommandsByUnitId.clear();
    this.refreshLobbyOverlay();
  }

  private refreshLobbyOverlay(): void {
    this.lobbyOverlayController?.render({
      matchPhase: this.matchPhase,
      hasExitedBattle: this.hasExitedBattle,
      localPlayerTeam: this.localPlayerTeam,
      lobbyPlayers: this.lobbyPlayers,
      localSessionId: this.localSessionId,
      selectedLobbyMapId: this.selectedLobbyMapId,
      availableMapIds: this.availableMapIds,
      isLobbyGeneratingMap: this.isLobbyGeneratingMap,
      localLobbyReady: this.localLobbyReady,
      lastBattleAnnouncement: this.lastBattleAnnouncement,
    });
  }

  private isBattleActive(): boolean {
    return this.matchPhase === 'BATTLE' && !this.hasExitedBattle;
  }

  private resetPointerInteractionState(): void {
    this.inputController?.reset();
  }

  private exitBattle(): void {
    if (this.hasExitedBattle) {
      return;
    }

    this.hasExitedBattle = true;
    this.matchPhase = 'LOBBY';
    this.localLobbyReady = false;
    this.isLobbyGeneratingMap = false;
    this.lastBattleAnnouncement = null;
    this.lobbyPlayers = [];
    this.localSessionId = null;
    this.resetPointerInteractionState();
    this.clearSelection();
    this.plannedPathsByUnitId.clear();
    this.pendingUnitPathCommandsByUnitId.clear();

    for (const unitId of Array.from(this.unitsById.keys())) {
      this.removeNetworkUnit(unitId);
    }

    const networkManager = this.networkManager;
    this.networkManager = null;
    if (networkManager) {
      void networkManager.disconnect().catch((error: unknown) => {
        console.error('Failed to disconnect from battle room.', error);
      });
    }

    this.refreshLobbyOverlay();
  }

  private applyRuntimeTuning(runtimeTuning: RuntimeTuning): void {
    this.runtimeTuning = runtimeTuning;
    this.tuningPanel?.setValues(runtimeTuning);
    this.fogOfWarController?.setVisionRadii(
      this.runtimeTuning.fogVisionRadius,
      this.runtimeTuning.cityVisionRadius,
    );
    for (const unit of this.unitsById.values()) {
      unit.setHealthMax(this.runtimeTuning.baseUnitHealth);
    }
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

  private applyCityOwnership(
    cityOwnershipUpdate: NetworkCityOwnershipUpdate,
  ): void {
    applyCityOwnershipState({
      cityOwnershipUpdate,
      neutralCityGridCoordinates: this.neutralCityGridCoordinates,
      setNeutralCityOwners: (owners) => {
        this.neutralCityOwners = owners;
      },
      setCityOwnerByHomeTeam: (owners) => {
        this.cityOwnerByHomeTeam = owners;
      },
      cityByHomeTeam: this.cityByHomeTeam,
      neutralCities: this.neutralCities,
      refreshFogOfWar: () => this.refreshFogOfWar(),
    });
  }

  private upsertNetworkUnit(networkUnit: NetworkUnitSnapshot): void {
    upsertNetworkUnitState({
      networkUnit,
      scene: this,
      units: this.units,
      unitsById: this.unitsById,
      baseUnitHealth: this.runtimeTuning.baseUnitHealth,
      lastKnownHealthByUnitId: this.lastKnownHealthByUnitId,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
      combatVisualUntilByUnitId: this.combatVisualUntilByUnitId,
      remoteUnitTargetPositions: this.remoteUnitTargetPositions,
      applyNetworkUnitPositionSnapshot: (
        unit,
        unitId,
        x,
        y,
        snapImmediately,
      ) =>
        this.applyNetworkUnitPositionSnapshot(
          unit,
          unitId,
          x,
          y,
          snapImmediately,
        ),
    });
  }

  private removeNetworkUnit(unitId: string): void {
    removeNetworkUnitState({
      unitId,
      units: this.units,
      unitsById: this.unitsById,
      plannedPathsByUnitId: this.plannedPathsByUnitId,
      remoteUnitTargetPositions: this.remoteUnitTargetPositions,
      lastKnownHealthByUnitId: this.lastKnownHealthByUnitId,
      combatVisualUntilByUnitId: this.combatVisualUntilByUnitId,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
      selectedUnits: this.selectedUnits,
    });
    this.pendingUnitPathCommandsByUnitId.delete(unitId);
    this.remoteUnitInterpolationByUnitId.delete(unitId);
  }

  private applyNetworkUnitPosition(positionUpdate: NetworkUnitPositionUpdate): void {
    applyNetworkUnitPositionState({
      positionUpdate,
      unitsById: this.unitsById,
      applyNetworkUnitPositionSnapshot: (
        unit,
        unitId,
        x,
        y,
        snapImmediately,
      ) =>
        this.applyNetworkUnitPositionSnapshot(
          unit,
          unitId,
          x,
          y,
          snapImmediately,
        ),
    });
  }

  private applyNetworkUnitHealth(healthUpdate: NetworkUnitHealthUpdate): void {
    applyNetworkUnitHealthState({
      healthUpdate,
      unitsById: this.unitsById,
      lastKnownHealthByUnitId: this.lastKnownHealthByUnitId,
      markUnitInCombatVisual: (unitId) => this.markUnitInCombatVisual(unitId),
    });
  }

  private applyNetworkUnitRotation(rotationUpdate: NetworkUnitRotationUpdate): void {
    applyNetworkUnitRotationState({
      rotationUpdate,
      unitsById: this.unitsById,
    });
  }

  private applyNetworkUnitMorale(moraleUpdate: NetworkUnitMoraleUpdate): void {
    applyNetworkUnitMoraleState({
      moraleUpdate,
      unitsById: this.unitsById,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
    });
  }

  private applyAssignedTeam(teamValue: string): void {
    const assignedTeam = normalizeNetworkTeam(teamValue);
    if (assignedTeam !== this.localPlayerTeam) {
      this.clearSelection();
      this.localPlayerTeam = assignedTeam;
      this.plannedPathsByUnitId.clear();
      this.pendingUnitPathCommandsByUnitId.clear();
      this.rebuildRemotePositionTargets();
      this.refreshFogOfWar();
    }
    this.refreshLobbyOverlay();
  }

  private applyNetworkUnitPositionSnapshot(
    unit: Unit,
    unitId: string,
    x: number,
    y: number,
    snapImmediately = false,
  ): void {
    const nowMs = this.time.now;
    const existingTarget = this.remoteUnitTargetPositions.get(unitId);
    const previousTargetX = existingTarget?.x ?? unit.x;
    const previousTargetY = existingTarget?.y ?? unit.y;
    if (existingTarget) {
      existingTarget.set(x, y);
    } else {
      this.remoteUnitTargetPositions.set(unitId, new Phaser.Math.Vector2(x, y));
    }

    if (snapImmediately) {
      unit.setPosition(x, y);
      this.remoteUnitInterpolationByUnitId.set(unitId, {
        startX: x,
        startY: y,
        targetX: x,
        targetY: y,
        startedAtMs: nowMs,
        durationMs: 0,
        lastAuthoritativeAtMs: nowMs,
      });
      return;
    }

    const authoritativeStepDistance = Phaser.Math.Distance.Between(
      previousTargetX,
      previousTargetY,
      x,
      y,
    );
    if (
      authoritativeStepDistance >=
      BattleScene.REMOTE_POSITION_AUTHORITATIVE_SNAP_DISTANCE
    ) {
      unit.setPosition(x, y);
      this.remoteUnitInterpolationByUnitId.set(unitId, {
        startX: x,
        startY: y,
        targetX: x,
        targetY: y,
        startedAtMs: nowMs,
        durationMs: 0,
        lastAuthoritativeAtMs: nowMs,
      });
      return;
    }

    const previousInterpolation =
      this.remoteUnitInterpolationByUnitId.get(unitId);
    const previousAuthoritativeAtMs =
      previousInterpolation?.lastAuthoritativeAtMs ??
      nowMs - BattleScene.REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS;
    const observedStepMs = Math.max(
      BattleScene.REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS,
      nowMs - previousAuthoritativeAtMs,
    );
    const stepDistance = authoritativeStepDistance;
    const expectedStepDurationMs =
      (stepDistance /
        Math.max(
          0.001,
          BattleScene.REMOTE_POSITION_INTERPOLATION_BASE_SPEED,
        )) *
      1000;
    const durationMs = Phaser.Math.Clamp(
      Math.max(observedStepMs, expectedStepDurationMs),
      BattleScene.REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS,
      BattleScene.REMOTE_POSITION_INTERPOLATION_MAX_DURATION_MS,
    );
    this.remoteUnitInterpolationByUnitId.set(unitId, {
      startX: unit.x,
      startY: unit.y,
      targetX: x,
      targetY: y,
      startedAtMs: nowMs,
      durationMs,
      lastAuthoritativeAtMs: nowMs,
    });
  }

  private rebuildRemotePositionTargets(): void {
    const nowMs = this.time.now;
    this.remoteUnitTargetPositions.clear();
    this.remoteUnitInterpolationByUnitId.clear();
    for (const [unitId, unit] of this.unitsById) {
      this.remoteUnitTargetPositions.set(
        unitId,
        new Phaser.Math.Vector2(unit.x, unit.y),
      );
      this.remoteUnitInterpolationByUnitId.set(unitId, {
        startX: unit.x,
        startY: unit.y,
        targetX: unit.x,
        targetY: unit.y,
        startedAtMs: nowMs,
        durationMs: 0,
        lastAuthoritativeAtMs: nowMs,
      });
    }
  }

  private smoothRemoteUnitPositions(deltaMs: number): void {
    const nowMs = this.time.now;
    const lerpT = Phaser.Math.Clamp(
      (BattleScene.REMOTE_POSITION_LERP_RATE * deltaMs) / 1000,
      0,
      1,
    );

    const staleUnitIds: string[] = [];
    for (const [unitId, target] of this.remoteUnitTargetPositions) {
      const unit = this.unitsById.get(unitId);
      if (!unit || !unit.isAlive()) {
        staleUnitIds.push(unitId);
        continue;
      }

      const interpolation = this.remoteUnitInterpolationByUnitId.get(unitId);
      if (interpolation) {
        const durationMs = Math.max(interpolation.durationMs, 0);
        const t =
          durationMs <= 0
            ? 1
            : Phaser.Math.Clamp(
                (nowMs - interpolation.startedAtMs) / durationMs,
                0,
                1,
              );
        unit.setPosition(
          Phaser.Math.Linear(interpolation.startX, interpolation.targetX, t),
          Phaser.Math.Linear(interpolation.startY, interpolation.targetY, t),
        );
        if (t >= 1) {
          interpolation.startX = interpolation.targetX;
          interpolation.startY = interpolation.targetY;
          interpolation.startedAtMs = nowMs;
          interpolation.durationMs = 0;
        }
        continue;
      }

      if (lerpT > 0) {
        unit.setPosition(
          Phaser.Math.Linear(unit.x, target.x, lerpT),
          Phaser.Math.Linear(unit.y, target.y, lerpT),
        );
      }
    }

    for (const unitId of staleUnitIds) {
      this.remoteUnitTargetPositions.delete(unitId);
      this.remoteUnitInterpolationByUnitId.delete(unitId);
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

  private drawSelectionBox(
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
    this.selectionBox.fillStyle(0xffffff, 0.12);
    this.selectionBox.lineStyle(1, 0xffffff, 0.9);
    this.selectionBox.fillRect(minX, minY, width, height);
    this.selectionBox.strokeRect(minX, minY, width, height);
  }

  private clearSelectionBox(): void {
    this.selectionBox.clear();
  }

  private drawImpassableOverlay(): void {
    this.impassableOverlay.clear();
    if (!BattleScene.SHOW_IMPASSABLE_OVERLAY) {
      return;
    }

    this.impassableOverlay.fillStyle(
      BattleScene.IMPASSABLE_OVERLAY_FILL_COLOR,
      BattleScene.IMPASSABLE_OVERLAY_FILL_ALPHA,
    );
    this.impassableOverlay.lineStyle(
      1,
      BattleScene.IMPASSABLE_OVERLAY_STROKE_COLOR,
      BattleScene.IMPASSABLE_OVERLAY_STROKE_ALPHA,
    );

    for (let row = 0; row < BattleScene.GRID_HEIGHT; row += 1) {
      for (let col = 0; col < BattleScene.GRID_WIDTH; col += 1) {
        if (!isGridCellImpassable(col, row)) {
          continue;
        }

        const x = col * BattleScene.GRID_CELL_WIDTH;
        const y = row * BattleScene.GRID_CELL_HEIGHT;
        this.impassableOverlay.fillRect(
          x,
          y,
          BattleScene.GRID_CELL_WIDTH,
          BattleScene.GRID_CELL_HEIGHT,
        );
        this.impassableOverlay.strokeRect(
          x,
          y,
          BattleScene.GRID_CELL_WIDTH,
          BattleScene.GRID_CELL_HEIGHT,
        );
      }
    }
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
    if (!this.isBattleActive() || this.selectedUnits.size === 0) {
      return;
    }

    const formationCenter = getFormationCenter(this.selectedUnits);
    if (!formationCenter) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld);

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const offsetX = unit.x - formationCenter.x;
      const offsetY = unit.y - formationCenter.y;
      const unitCell = worldToGridCoordinate(
        unit.x,
        unit.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const targetCell = worldToGridCoordinate(
        targetX + offsetX,
        targetY + offsetY,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const clippedTargetCells = clipPathTargetsByTerrain({
        start: unitCell,
        targets: [targetCell],
        isGridCellImpassable,
      });
      if (clippedTargetCells.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = clippedTargetCells.map((cell) =>
        gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS),
      );
      this.stageUnitPathCommand(unitId, unitPath, movementCommandMode);
    }
  }

  private commandSelectedUnitsAlongPath(
    path: Phaser.Math.Vector2[],
    shiftHeld = false,
  ): void {
    if (
      !this.isBattleActive() ||
      this.selectedUnits.size === 0 ||
      path.length === 0
    ) {
      return;
    }

    const formationCenter = getFormationCenter(this.selectedUnits);
    if (!formationCenter) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld);

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const offsetX = unit.x - formationCenter.x;
      const offsetY = unit.y - formationCenter.y;
      const snappedPath = snapAndCompactPath(
        path.map((point) =>
          new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY),
        ),
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      if (snappedPath.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      const targetCells = snappedPath.map((point) =>
        worldToGridCoordinate(
          point.x,
          point.y,
          BattleScene.UNIT_COMMAND_GRID_METRICS,
        ),
      );
      const unitCell = worldToGridCoordinate(
        unit.x,
        unit.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const clippedTargetCells = clipPathTargetsByTerrain({
        start: unitCell,
        targets: targetCells,
        isGridCellImpassable,
      });
      if (clippedTargetCells.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = clippedTargetCells.map((cell) =>
        gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS),
      );
      this.stageUnitPathCommand(unitId, unitPath, movementCommandMode);
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
    if (!this.isBattleActive()) {
      return;
    }

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      this.networkManager?.sendUnitCancelMovement(unitId);
      this.plannedPathsByUnitId.delete(unitId);
      this.pendingUnitPathCommandsByUnitId.delete(unitId);
    }
  }

  private engageSelectedUnitMovement(): void {
    if (!this.isBattleActive() || this.selectedUnits.size === 0 || !this.networkManager) {
      return;
    }

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }

      const pendingCommand = this.pendingUnitPathCommandsByUnitId.get(unitId);
      if (!pendingCommand) {
        continue;
      }

      this.networkManager.sendUnitPathCommand(pendingCommand);
      this.pendingUnitPathCommandsByUnitId.delete(unitId);
    }
  }

  private stageUnitPathCommand(
    unitId: string,
    path: Phaser.Math.Vector2[],
    movementCommandMode?: NetworkUnitPathCommand['movementCommandMode'],
  ): void {
    this.pendingUnitPathCommandsByUnitId.set(unitId, {
      unitId,
      path: path.map((point) => ({ x: point.x, y: point.y })),
      movementCommandMode,
    });
    this.setPlannedPath(unitId, path);
  }

  private setPlannedPath(unitId: string, path: Phaser.Math.Vector2[]): void {
    setPlannedPath({
      plannedPathsByUnitId: this.plannedPathsByUnitId,
      unitId,
      path,
    });
  }

  private advancePlannedPaths(): void {
    const activePlannedPathsByUnitId = new Map<string, Phaser.Math.Vector2[]>();
    for (const [unitId, path] of this.plannedPathsByUnitId) {
      if (this.pendingUnitPathCommandsByUnitId.has(unitId)) {
        continue;
      }
      activePlannedPathsByUnitId.set(unitId, path);
    }

    advancePlannedPaths({
      plannedPathsByUnitId: activePlannedPathsByUnitId,
      unitsById: this.unitsById,
      waypointReachedDistance:
        BattleScene.PLANNED_PATH_WAYPOINT_REACHED_DISTANCE,
    });

    for (const unitId of Array.from(this.plannedPathsByUnitId.keys())) {
      if (this.pendingUnitPathCommandsByUnitId.has(unitId)) {
        continue;
      }
      if (!activePlannedPathsByUnitId.has(unitId)) {
        this.plannedPathsByUnitId.delete(unitId);
      }
    }
  }

  private appendDraggedPathPoint(
    draggedPath: Phaser.Math.Vector2[],
    x: number,
    y: number,
    forceAppend = false,
  ): void {
    this.pathPreviewRenderer?.appendDraggedPathPoint(
      draggedPath,
      x,
      y,
      forceAppend,
    );
  }

  private buildCommandPath(path: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    const commandPath = this.pathPreviewRenderer?.buildCommandPath(path) ?? [];
    return snapAndCompactPath(
      commandPath,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );
  }

  private getCityWorldPosition(team: Team): Phaser.Math.Vector2 {
    return gridToWorldCenter(
      getTeamCityGridCoordinate(team),
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );
  }

  private getOwnedCityPositions(ownerTeam: Team): Phaser.Math.Vector2[] {
    const positions: Phaser.Math.Vector2[] = [];
    const homeTeams: Team[] = [Team.RED, Team.BLUE];
    for (const homeTeam of homeTeams) {
      if (this.cityOwnerByHomeTeam[homeTeam] !== ownerTeam) {
        continue;
      }
      positions.push(this.getCityWorldPosition(homeTeam));
    }
    for (let index = 0; index < this.neutralCityGridCoordinates.length; index += 1) {
      if (this.neutralCityOwners[index] !== ownerTeam) {
        continue;
      }
      positions.push(
        gridToWorldCenter(
          this.neutralCityGridCoordinates[index],
          BattleScene.UNIT_COMMAND_GRID_METRICS,
        ),
      );
    }
    return positions;
  }

  private drawPathPreview(draggedPath: Phaser.Math.Vector2[]): void {
    this.pathPreviewRenderer?.drawPathPreview(this.buildCommandPath(draggedPath));
  }

  private clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }

    this.selectedUnits.clear();
  }

  private refreshFogOfWar(): void {
    this.fogOfWarController?.refresh(
      this.localPlayerTeam,
      this.units,
      this.getOwnedCityPositions(this.localPlayerTeam),
    );
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

  private initializeMapTerrainSampling(): void {
    const texture = this.textures.get(this.mapTextureKey);
    const sourceImage = texture?.getSourceImage() as
      | {
          width?: number;
          height?: number;
          naturalWidth?: number;
          naturalHeight?: number;
          videoWidth?: number;
          videoHeight?: number;
        }
      | undefined;
    if (!sourceImage) {
      this.mapSamplingWidth = 0;
      this.mapSamplingHeight = 0;
      return;
    }

    const width =
      sourceImage.naturalWidth ??
      sourceImage.videoWidth ??
      sourceImage.width ??
      0;
    const height =
      sourceImage.naturalHeight ??
      sourceImage.videoHeight ??
      sourceImage.height ??
      0;

    this.mapSamplingWidth = width > 0 ? width : 0;
    this.mapSamplingHeight = height > 0 ? height : 0;
  }

  private updateUnitTerrainColors(): void {
    refreshUnitTerrainTint({
      units: this.units,
      sampleMapColorAt: (worldX, worldY) => this.sampleMapColorAt(worldX, worldY),
      resolveTerrainType: (color) => this.resolveTerrainType(color),
    });
  }

  private sampleMapColorAt(worldX: number, worldY: number): number | null {
    if (this.mapSamplingWidth <= 0 || this.mapSamplingHeight <= 0) {
      return null;
    }

    const sampleX = Phaser.Math.Clamp(
      Math.floor((worldX / BattleScene.MAP_WIDTH) * this.mapSamplingWidth),
      0,
      this.mapSamplingWidth - 1,
    );
    const sampleY = Phaser.Math.Clamp(
      Math.floor((worldY / BattleScene.MAP_HEIGHT) * this.mapSamplingHeight),
      0,
      this.mapSamplingHeight - 1,
    );
    const pixel = this.textures.getPixel(
      sampleX,
      sampleY,
      this.mapTextureKey,
    );
    if (!pixel) {
      return null;
    }

    return Phaser.Display.Color.GetColor(pixel.red, pixel.green, pixel.blue);
  }

  private resolveTerrainType(color: number | null): TerrainType {
    if (color === null) {
      return 'unknown';
    }

    const directMatch = BattleScene.TERRAIN_BY_COLOR.get(color);
    if (directMatch) {
      return directMatch;
    }

    // Fallback for future maps where colors are close but not exact swatches.
    let closestDistance = Number.POSITIVE_INFINITY;
    let closestType: TerrainType = 'unknown';
    const colorR = (color >> 16) & 0xff;
    const colorG = (color >> 8) & 0xff;
    const colorB = color & 0xff;

    for (const swatch of BattleScene.TERRAIN_SWATCHES) {
      const swatchR = (swatch.color >> 16) & 0xff;
      const swatchG = (swatch.color >> 8) & 0xff;
      const swatchB = swatch.color & 0xff;
      const dr = colorR - swatchR;
      const dg = colorG - swatchG;
      const db = colorB - swatchB;
      const distanceSq = dr * dr + dg * dg + db * db;
      if (distanceSq < closestDistance) {
        closestDistance = distanceSq;
        closestType = swatch.type;
      }
    }

    return closestType;
  }

  private updateInfluenceDebugFocus(): void {
    if (!this.influenceRenderer) {
      return;
    }

    const focusUnit = this.getInfluenceDebugFocusUnit();
    if (!focusUnit) {
      this.influenceRenderer.setDebugFocusPoint(null, null);
      return;
    }

    const focusPosition = this.getAuthoritativeUnitPosition(focusUnit);
    const focusUnitId = this.getUnitId(focusUnit);
    const moraleScore =
      focusUnitId !== null
        ? (this.moraleScoreByUnitId.get(focusUnitId) ?? null)
        : null;
    this.influenceRenderer.setDebugFocusPoint(focusPosition, moraleScore);
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

  private getAuthoritativeUnitPosition(unit: Unit): { x: number; y: number } {
    for (const [unitId, candidate] of this.unitsById) {
      if (candidate !== unit) {
        continue;
      }

      const target = this.remoteUnitTargetPositions.get(unitId);
      if (target) {
        return { x: target.x, y: target.y };
      }
      break;
    }

    return { x: unit.x, y: unit.y };
  }

  private getUnitId(unit: Unit): string | null {
    for (const [unitId, candidate] of this.unitsById) {
      if (candidate === unit) {
        return unitId;
      }
    }

    return null;
  }

  update(time: number, delta: number): void {
    runVisualUpdatePipeline({
      timeMs: time,
      deltaMs: delta,
      callbacks: {
        smoothRemoteUnitPositions: (deltaMs) => this.smoothRemoteUnitPositions(deltaMs),
        applyCombatVisualWiggle: (timeMs) => this.applyCombatVisualWiggle(timeMs),
        refreshTerrainTint: () => this.updateUnitTerrainColors(),
        advancePlannedPaths: () => this.advancePlannedPaths(),
        refreshFogOfWar: () => this.refreshFogOfWar(),
        renderPlannedPaths: () => this.renderMovementLines(),
        updateInfluenceDebugFocus: () => this.updateInfluenceDebugFocus(),
        renderInfluence: (deltaMs) => this.influenceRenderer?.render(deltaMs),
      },
    });
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
