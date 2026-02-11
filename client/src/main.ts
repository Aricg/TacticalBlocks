import Phaser from 'phaser';
import {
  type NetworkBattleEndedUpdate,
  type NetworkCityOwnershipUpdate,
  type NetworkInfluenceGridUpdate,
  type NetworkLobbyStateUpdate,
  NetworkManager,
  type NetworkUnitHealthUpdate,
  type NetworkMatchPhase,
  type NetworkUnitPathCommand,
  type NetworkUnitRotationUpdate,
  type NetworkUnitSnapshot,
  type NetworkUnitPositionUpdate,
  type NetworkUnitMoraleUpdate,
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
import { InfluenceRenderer } from './InfluenceRenderer';
import { RuntimeTuningPanel } from './RuntimeTuningPanel';
import { Team } from './Team';
import { type TerrainType, Unit } from './Unit';

type TerrainSwatch = {
  color: number;
  type: TerrainType;
};

type GridCoordinate = {
  col: number;
  row: number;
};

type LobbyPlayerView = {
  sessionId: string;
  team: Team;
  ready: boolean;
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
  private readonly remoteUnitTargetPositions: Map<string, Phaser.Math.Vector2> =
    new Map<string, Phaser.Math.Vector2>();
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
  private lobbyPlayers: LobbyPlayerView[] = [];
  private inputController: BattleInputController | null = null;
  private selectionBox!: Phaser.GameObjects.Graphics;
  private pathPreview!: Phaser.GameObjects.Graphics;
  private movementLines!: Phaser.GameObjects.Graphics;
  private impassableOverlay!: Phaser.GameObjects.Graphics;
  private influenceRenderer: InfluenceRenderer | null = null;
  private fogOfWarLayer!: Phaser.GameObjects.RenderTexture;
  private visionBrush!: Phaser.GameObjects.Arc;
  private cityVisionBrush!: Phaser.GameObjects.Arc;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private tuningPanel: RuntimeTuningPanel | null = null;
  private lobbyPanel: Phaser.GameObjects.Container | null = null;
  private lobbyTeamText: Phaser.GameObjects.Text | null = null;
  private lobbyStatusText: Phaser.GameObjects.Text | null = null;
  private lobbyActionText: Phaser.GameObjects.Text | null = null;
  private lobbyMapText: Phaser.GameObjects.Text | null = null;
  private lobbyRandomMapButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private lobbyRandomMapButtonText: Phaser.GameObjects.Text | null = null;
  private lobbyGenerateMapButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private lobbyGenerateMapButtonText: Phaser.GameObjects.Text | null = null;
  private lobbyReadyButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private lobbyReadyButtonText: Phaser.GameObjects.Text | null = null;
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
  private static readonly REMOTE_POSITION_LERP_RATE =
    GAMEPLAY_CONFIG.network.remotePositionLerpRate;
  private static readonly REMOTE_POSITION_SNAP_DISTANCE =
    GAMEPLAY_CONFIG.network.remotePositionSnapDistance;
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
    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(950);
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);
    this.impassableOverlay = this.add.graphics();
    this.impassableOverlay.setDepth(BattleScene.IMPASSABLE_OVERLAY_DEPTH);
    this.drawImpassableOverlay();
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
        clearPathPreview: () => this.pathPreview.clear(),
        buildCommandPath: (path: Phaser.Math.Vector2[]) =>
          this.buildCommandPath(path),
        cancelSelectedUnitMovement: () => this.cancelSelectedUnitMovement(),
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
      this.lobbyPanel?.destroy();
      this.lobbyPanel = null;
      this.lobbyTeamText = null;
      this.lobbyStatusText = null;
      this.lobbyActionText = null;
      this.lobbyMapText = null;
      this.lobbyRandomMapButtonBg = null;
      this.lobbyRandomMapButtonText = null;
      this.lobbyGenerateMapButtonBg = null;
      this.lobbyGenerateMapButtonText = null;
      this.lobbyReadyButtonBg = null;
      this.lobbyReadyButtonText = null;
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
      const neutralPosition = this.gridToWorldCenter(neutralCell);
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

  private getResolvedLobbyMapId(requestedMapId: string): string {
    if (resolveMapImageById(requestedMapId)) {
      return requestedMapId;
    }

    const firstLobbyMapIdWithImage = this.availableMapIds.find((mapId) =>
      Boolean(resolveMapImageById(mapId)),
    );
    if (firstLobbyMapIdWithImage) {
      return firstLobbyMapIdWithImage;
    }

    return resolveInitialMapId();
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
    const nextMapId = this.getResolvedLobbyMapId(requestedMapId);
    this.selectedLobbyMapId = nextMapId;
    if (nextMapId === this.activeMapId && !forceTextureReload) {
      return;
    }

    if (nextMapId === this.activeMapId && forceTextureReload) {
      this.applyMapIdToRuntimeTerrain(nextMapId);
      this.neutralCityGridCoordinates = getNeutralCityGridCoordinates();
      this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');
      this.rebuildCitiesForCurrentMap();
      this.drawImpassableOverlay();
      this.reloadMapTexture(nextMapId, this.lobbyMapRevision);
      this.refreshFogOfWar();
      return;
    }

    this.activeMapId = nextMapId;
    this.mapTextureKey = getTextureKeyForMapId(nextMapId);
    this.applyMapIdToRuntimeTerrain(nextMapId);
    this.neutralCityGridCoordinates = getNeutralCityGridCoordinates();
    this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');

    if (this.mapBackground) {
      this.mapBackground.setTexture(this.mapTextureKey);
    }

    this.rebuildCitiesForCurrentMap();
    this.drawImpassableOverlay();
    this.initializeMapTerrainSampling();
    this.refreshFogOfWar();
  }

  private requestLobbyMapStep(step: number): void {
    if (!this.networkManager || this.matchPhase !== 'LOBBY' || this.hasExitedBattle) {
      return;
    }

    const mapIds = this.availableMapIds.filter((mapId) =>
      Boolean(resolveMapImageById(mapId)),
    );
    if (mapIds.length === 0) {
      return;
    }

    const currentIndex = mapIds.indexOf(this.selectedLobbyMapId);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (startIndex + step + mapIds.length) % mapIds.length;
    const nextMapId = mapIds[nextIndex];

    this.selectedLobbyMapId = nextMapId;
    this.networkManager.sendLobbySelectMap(nextMapId);
    this.refreshLobbyOverlay();
  }

  private requestRandomLobbyMap(): void {
    if (!this.networkManager || this.matchPhase !== 'LOBBY' || this.hasExitedBattle) {
      return;
    }

    const selectableMapIds = this.availableMapIds.filter((mapId) =>
      Boolean(resolveMapImageById(mapId)),
    );
    if (selectableMapIds.length <= 1) {
      return;
    }

    this.networkManager.sendLobbyRandomMap();
  }

  private requestGenerateLobbyMap(): void {
    if (
      !this.networkManager ||
      this.matchPhase !== 'LOBBY' ||
      this.hasExitedBattle ||
      this.isLobbyGeneratingMap
    ) {
      return;
    }

    this.networkManager.sendLobbyGenerateMap();
  }

  private createLobbyOverlay(): void {
    const panel = this.add.container(
      BattleScene.MAP_WIDTH * 0.5,
      BattleScene.MAP_HEIGHT * 0.5,
    );
    panel.setDepth(BattleScene.LOBBY_OVERLAY_DEPTH);
    panel.setScrollFactor(0);

    const panelBackground = this.add.rectangle(0, 0, 680, 360, 0x121212, 0.9);
    panelBackground.setStrokeStyle(2, 0xffffff, 0.35);

    const titleText = this.add.text(0, -145, 'Battle Lobby', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#f1f1f1',
    });
    titleText.setOrigin(0.5, 0.5);

    this.lobbyTeamText = this.add.text(0, -95, 'Team: BLUE', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#d7d7d7',
    });
    this.lobbyTeamText.setOrigin(0.5, 0.5);

    this.lobbyStatusText = this.add.text(0, -15, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e0e0e0',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.lobbyStatusText.setOrigin(0.5, 0.5);

    this.lobbyMapText = this.add.text(0, 55, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#b9d9ff',
      align: 'center',
    });
    this.lobbyMapText.setOrigin(0.5, 0.5);
    this.lobbyMapText.setInteractive({ useHandCursor: true });
    this.lobbyMapText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      this.requestLobbyMapStep(this.isShiftHeld(pointer) ? -1 : 1);
    });

    this.lobbyActionText = this.add.text(0, 92, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f4e7b2',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.lobbyActionText.setOrigin(0.5, 0.5);

    this.lobbyRandomMapButtonBg = this.add.rectangle(-220, 140, 180, 46, 0x47627a, 1);
    this.lobbyRandomMapButtonBg.setStrokeStyle(2, 0xeaf6ff, 0.45);
    this.lobbyRandomMapButtonBg.setInteractive({ useHandCursor: true });
    this.lobbyRandomMapButtonBg.on('pointerdown', () => {
      this.requestRandomLobbyMap();
    });

    this.lobbyRandomMapButtonText = this.add.text(-220, 140, 'RANDOM MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.lobbyRandomMapButtonText.setOrigin(0.5, 0.5);
    this.lobbyRandomMapButtonText.setInteractive({ useHandCursor: true });
    this.lobbyRandomMapButtonText.on('pointerdown', () => {
      this.requestRandomLobbyMap();
    });

    this.lobbyGenerateMapButtonBg = this.add.rectangle(0, 140, 180, 46, 0x66573a, 1);
    this.lobbyGenerateMapButtonBg.setStrokeStyle(2, 0xffe7bd, 0.45);
    this.lobbyGenerateMapButtonBg.setInteractive({ useHandCursor: true });
    this.lobbyGenerateMapButtonBg.on('pointerdown', () => {
      this.requestGenerateLobbyMap();
    });

    this.lobbyGenerateMapButtonText = this.add.text(0, 140, 'GENERATE MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.lobbyGenerateMapButtonText.setOrigin(0.5, 0.5);
    this.lobbyGenerateMapButtonText.setInteractive({ useHandCursor: true });
    this.lobbyGenerateMapButtonText.on('pointerdown', () => {
      this.requestGenerateLobbyMap();
    });

    this.lobbyReadyButtonBg = this.add.rectangle(220, 140, 180, 46, 0x2f8f46, 1);
    this.lobbyReadyButtonBg.setStrokeStyle(2, 0xefffef, 0.55);
    this.lobbyReadyButtonBg.setInteractive({ useHandCursor: true });
    this.lobbyReadyButtonBg.on('pointerdown', () => {
      this.toggleLobbyReady();
    });

    this.lobbyReadyButtonText = this.add.text(220, 140, 'READY', {
      fontFamily: 'monospace',
      fontSize: '21px',
      color: '#ffffff',
    });
    this.lobbyReadyButtonText.setOrigin(0.5, 0.5);
    this.lobbyReadyButtonText.setInteractive({ useHandCursor: true });
    this.lobbyReadyButtonText.on('pointerdown', () => {
      this.toggleLobbyReady();
    });

    panel.add([
      panelBackground,
      titleText,
      this.lobbyTeamText,
      this.lobbyStatusText,
      this.lobbyMapText,
      this.lobbyActionText,
      this.lobbyRandomMapButtonBg,
      this.lobbyRandomMapButtonText,
      this.lobbyGenerateMapButtonBg,
      this.lobbyGenerateMapButtonText,
      this.lobbyReadyButtonBg,
      this.lobbyReadyButtonText,
    ]);

    this.lobbyPanel = panel;
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
    const nextPhase = lobbyStateUpdate.phase === 'BATTLE' ? 'BATTLE' : 'LOBBY';
    const previousPhase = this.matchPhase;

    this.matchPhase = nextPhase;
    this.localSessionId = lobbyStateUpdate.selfSessionId;
    const previousMapRevision = this.lobbyMapRevision;
    this.lobbyMapRevision = lobbyStateUpdate.mapRevision;
    this.isLobbyGeneratingMap = lobbyStateUpdate.isGeneratingMap;
    this.availableMapIds =
      lobbyStateUpdate.availableMapIds.length > 0
        ? [...lobbyStateUpdate.availableMapIds]
        : [...GAMEPLAY_CONFIG.map.availableMapIds];
    const forceTextureReload =
      this.lobbyMapRevision !== previousMapRevision &&
      lobbyStateUpdate.mapId === this.activeMapId;
    this.applySelectedLobbyMap(
      lobbyStateUpdate.mapId || this.selectedLobbyMapId,
      forceTextureReload,
    );
    this.lobbyPlayers = lobbyStateUpdate.players.map((player) => ({
      sessionId: player.sessionId,
      team: this.normalizeTeam(player.team),
      ready: player.ready,
    }));

    const localLobbyPlayer = this.localSessionId
      ? this.lobbyPlayers.find((player) => player.sessionId === this.localSessionId)
      : undefined;
    this.localLobbyReady = localLobbyPlayer?.ready ?? false;

    if (previousPhase !== this.matchPhase) {
      this.resetPointerInteractionState();
      this.clearSelection();
      this.plannedPathsByUnitId.clear();
      if (this.matchPhase === 'BATTLE') {
        this.lastBattleAnnouncement = null;
      }
    }

    this.refreshLobbyOverlay();
  }

  private applyBattleEnded(battleEndedUpdate: NetworkBattleEndedUpdate): void {
    const reasonText =
      battleEndedUpdate.reason === 'NO_UNITS'
        ? 'enemy had no units'
        : battleEndedUpdate.reason === 'NO_CITIES'
          ? 'enemy had no cities'
          : 'tiebreaker';
    const summaryText =
      battleEndedUpdate.winner === 'DRAW'
        ? 'Battle ended in a draw.'
        : `Winner: ${battleEndedUpdate.winner} (${reasonText}).`;
    this.lastBattleAnnouncement =
      `${summaryText} ` +
      `Cities B:${battleEndedUpdate.blueCities} R:${battleEndedUpdate.redCities} | ` +
      `Units B:${battleEndedUpdate.blueUnits} R:${battleEndedUpdate.redUnits}`;
    this.matchPhase = 'LOBBY';
    this.refreshLobbyOverlay();
  }

  private refreshLobbyOverlay(): void {
    if (
      !this.lobbyPanel ||
      !this.lobbyTeamText ||
      !this.lobbyStatusText ||
      !this.lobbyActionText ||
      !this.lobbyMapText ||
      !this.lobbyRandomMapButtonBg ||
      !this.lobbyRandomMapButtonText ||
      !this.lobbyGenerateMapButtonBg ||
      !this.lobbyGenerateMapButtonText ||
      !this.lobbyReadyButtonBg ||
      !this.lobbyReadyButtonText
    ) {
      return;
    }

    const isLobby = this.matchPhase === 'LOBBY';
    this.lobbyPanel.setVisible(isLobby);
    if (!isLobby) {
      return;
    }

    if (this.hasExitedBattle) {
      this.lobbyTeamText.setText('Disconnected');
      this.lobbyStatusText.setText('You exited the battle room.');
      this.lobbyActionText.setText('Refresh the page to join again.');
      this.lobbyMapText.setVisible(false);
      this.lobbyRandomMapButtonBg.setVisible(false);
      this.lobbyRandomMapButtonBg.disableInteractive();
      this.lobbyRandomMapButtonText.setVisible(false);
      this.lobbyGenerateMapButtonBg.setVisible(false);
      this.lobbyGenerateMapButtonBg.disableInteractive();
      this.lobbyGenerateMapButtonText.setVisible(false);
      this.lobbyReadyButtonBg.setVisible(false);
      this.lobbyReadyButtonBg.disableInteractive();
      this.lobbyReadyButtonText.setVisible(false);
      return;
    }

    this.lobbyMapText.setVisible(true);
    this.lobbyMapText.setText(
      `Map: ${this.selectedLobbyMapId}  (click to cycle, shift+click back)`,
    );

    const selectableMapIds = this.availableMapIds.filter((mapId) =>
      Boolean(resolveMapImageById(mapId)),
    );
    const canRandomizeMap = selectableMapIds.length > 1;
    this.lobbyRandomMapButtonBg.setVisible(true);
    this.lobbyRandomMapButtonText.setVisible(true);
    this.lobbyRandomMapButtonBg.setFillStyle(canRandomizeMap ? 0x47627a : 0x3d3d3d, 1);
    this.lobbyRandomMapButtonText.setText('RANDOM MAP');
    if (canRandomizeMap) {
      this.lobbyRandomMapButtonBg.setInteractive({ useHandCursor: true });
      this.lobbyRandomMapButtonText.setInteractive({ useHandCursor: true });
    } else {
      this.lobbyRandomMapButtonBg.disableInteractive();
      this.lobbyRandomMapButtonText.disableInteractive();
    }

    this.lobbyGenerateMapButtonBg.setVisible(true);
    this.lobbyGenerateMapButtonText.setVisible(true);
    if (this.isLobbyGeneratingMap) {
      this.lobbyGenerateMapButtonBg.setFillStyle(0x5a503e, 1);
      this.lobbyGenerateMapButtonText.setText('GENERATING...');
      this.lobbyGenerateMapButtonBg.disableInteractive();
      this.lobbyGenerateMapButtonText.disableInteractive();
    } else {
      this.lobbyGenerateMapButtonBg.setFillStyle(0x66573a, 1);
      this.lobbyGenerateMapButtonText.setText('GENERATE MAP');
      this.lobbyGenerateMapButtonBg.setInteractive({ useHandCursor: true });
      this.lobbyGenerateMapButtonText.setInteractive({ useHandCursor: true });
    }

    this.lobbyReadyButtonBg.setVisible(true);
    this.lobbyReadyButtonBg.setInteractive({ useHandCursor: true });
    this.lobbyReadyButtonText.setVisible(true);

    const bluePlayers = this.lobbyPlayers.filter((player) => player.team === Team.BLUE);
    const redPlayers = this.lobbyPlayers.filter((player) => player.team === Team.RED);
    const rosterLines =
      this.lobbyPlayers.length === 0
        ? 'No players in lobby yet.'
        : this.lobbyPlayers
            .map((player, index) => {
              const label =
                player.sessionId === this.localSessionId
                  ? 'You'
                  : `Player ${index + 1}`;
              return `${label}: ${player.team} ${player.ready ? '[READY]' : '[NOT READY]'}`;
            })
            .join('\n');

    this.lobbyTeamText.setText(`Team: ${this.localPlayerTeam}`);
    this.lobbyStatusText.setText(
      `Blue: ${bluePlayers.length}   Red: ${redPlayers.length}\n${rosterLines}`,
    );

    const hasBothTeams = bluePlayers.length > 0 && redPlayers.length > 0;
    const everyoneReady =
      this.lobbyPlayers.length > 0 &&
      this.lobbyPlayers.every((player) => player.ready);
    if (this.isLobbyGeneratingMap) {
      this.lobbyActionText.setText('Generating new terrain map...');
    } else if (this.lastBattleAnnouncement) {
      this.lobbyActionText.setText(this.lastBattleAnnouncement);
    } else if (!hasBothTeams) {
      this.lobbyActionText.setText('Waiting for one player on each team.');
    } else if (!everyoneReady) {
      this.lobbyActionText.setText('Waiting for all players to ready up.');
    } else {
      this.lobbyActionText.setText('All players ready. Starting battle...');
    }

    const readyButtonColor = this.localLobbyReady ? 0x956a24 : 0x2f8f46;
    this.lobbyReadyButtonBg.setFillStyle(readyButtonColor, 1);
    this.lobbyReadyButtonText.setText(this.localLobbyReady ? 'UNREADY' : 'READY');
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
    this.visionBrush?.setRadius(this.runtimeTuning.fogVisionRadius);
    this.cityVisionBrush?.setRadius(this.runtimeTuning.cityVisionRadius);
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

  private normalizeTeam(teamValue: string): Team {
    return teamValue.toUpperCase() === Team.RED ? Team.RED : Team.BLUE;
  }

  private normalizeCityOwner(ownerValue: string): CityOwner {
    const normalizedOwner = ownerValue.toUpperCase();
    if (normalizedOwner === Team.RED) {
      return Team.RED;
    }
    if (normalizedOwner === Team.BLUE) {
      return Team.BLUE;
    }
    return 'NEUTRAL';
  }

  private applyCityOwnership(
    cityOwnershipUpdate: NetworkCityOwnershipUpdate,
  ): void {
    const redOwner = this.normalizeTeam(cityOwnershipUpdate.redCityOwner);
    const blueOwner = this.normalizeTeam(cityOwnershipUpdate.blueCityOwner);
    this.neutralCityOwners = this.neutralCityGridCoordinates.map(
      (_, index) =>
        this.normalizeCityOwner(cityOwnershipUpdate.neutralCityOwners[index] ?? 'NEUTRAL'),
    );
    this.cityOwnerByHomeTeam = {
      [Team.RED]: redOwner,
      [Team.BLUE]: blueOwner,
    };
    this.cityByHomeTeam[Team.RED]?.setOwner(redOwner);
    this.cityByHomeTeam[Team.BLUE]?.setOwner(blueOwner);
    for (let index = 0; index < this.neutralCities.length; index += 1) {
      this.neutralCities[index]?.setOwner(
        this.neutralCityOwners[index] ?? 'NEUTRAL',
      );
    }
    this.refreshFogOfWar();
  }

  private upsertNetworkUnit(networkUnit: NetworkUnitSnapshot): void {
    const existingUnit = this.unitsById.get(networkUnit.unitId);
    if (existingUnit) {
      existingUnit.setHealthMax(this.runtimeTuning.baseUnitHealth);
      existingUnit.rotation = networkUnit.rotation;
      existingUnit.setHealth(networkUnit.health);
      this.lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
      this.moraleScoreByUnitId.set(
        networkUnit.unitId,
        networkUnit.moraleScore,
      );
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
    spawnedUnit.setHealthMax(this.runtimeTuning.baseUnitHealth);
    this.units.push(spawnedUnit);
    this.unitsById.set(networkUnit.unitId, spawnedUnit);
    this.lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
    this.moraleScoreByUnitId.set(networkUnit.unitId, networkUnit.moraleScore);
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
    this.moraleScoreByUnitId.delete(unitId);
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

  private applyNetworkUnitMorale(moraleUpdate: NetworkUnitMoraleUpdate): void {
    if (!this.unitsById.has(moraleUpdate.unitId)) {
      return;
    }

    this.moraleScoreByUnitId.set(
      moraleUpdate.unitId,
      moraleUpdate.moraleScore,
    );
  }

  private applyAssignedTeam(teamValue: string): void {
    const assignedTeam =
      teamValue.toUpperCase() === Team.RED ? Team.RED : Team.BLUE;
    if (assignedTeam !== this.localPlayerTeam) {
      this.clearSelection();
      this.localPlayerTeam = assignedTeam;
      this.plannedPathsByUnitId.clear();
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
    if (!this.isBattleActive() || this.selectedUnits.size === 0 || !this.networkManager) {
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
      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      const targetCell = this.worldToGridCoordinate(
        targetX + offsetX,
        targetY + offsetY,
      );
      const clippedTargetCells = this.clipPathTargetsByTerrain(unitCell, [
        targetCell,
      ]);
      if (clippedTargetCells.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = clippedTargetCells.map((cell) =>
        this.gridToWorldCenter(cell),
      );
      this.networkManager.sendUnitPathCommand({
        unitId,
        path: unitPath.map((point) => ({ x: point.x, y: point.y })),
        movementCommandMode,
      });
      this.setPlannedPath(unitId, unitPath);
    }
  }

  private commandSelectedUnitsAlongPath(
    path: Phaser.Math.Vector2[],
    shiftHeld = false,
  ): void {
    if (
      !this.isBattleActive() ||
      this.selectedUnits.size === 0 ||
      path.length === 0 ||
      !this.networkManager
    ) {
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
      const snappedPath = this.snapAndCompactPath(
        path.map((point) =>
          new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY),
        ),
      );
      if (snappedPath.length === 0) {
        continue;
      }
      const targetCells = snappedPath.map((point) =>
        this.worldToGridCoordinate(point.x, point.y),
      );
      const unitCell = this.worldToGridCoordinate(unit.x, unit.y);
      const clippedTargetCells = this.clipPathTargetsByTerrain(
        unitCell,
        targetCells,
      );
      if (clippedTargetCells.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = clippedTargetCells.map((cell) =>
        this.gridToWorldCenter(cell),
      );
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
    if (!this.isBattleActive() || !this.networkManager) {
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

  private appendDraggedPathPoint(
    draggedPath: Phaser.Math.Vector2[],
    x: number,
    y: number,
    forceAppend = false,
  ): void {
    const nextPoint = new Phaser.Math.Vector2(x, y);
    const lastPoint = draggedPath[draggedPath.length - 1];
    if (!lastPoint || forceAppend || draggedPath.length === 1) {
      draggedPath.push(nextPoint);
      return;
    }

    const distance = Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, x, y);
    if (distance < BattleScene.PREVIEW_PATH_POINT_SPACING) {
      draggedPath[draggedPath.length - 1] = nextPoint;
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
      draggedPath.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(lastPoint.x, x, t),
          Phaser.Math.Linear(lastPoint.y, y, t),
        ),
      );
    }

    draggedPath.push(nextPoint);
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

  private worldToGridCoordinate(x: number, y: number): GridCoordinate {
    const colBasis = x / BattleScene.GRID_CELL_WIDTH - 0.5;
    const rowBasis = y / BattleScene.GRID_CELL_HEIGHT - 0.5;
    return {
      col: Phaser.Math.Clamp(
        Math.round(colBasis),
        0,
        BattleScene.GRID_WIDTH - 1,
      ),
      row: Phaser.Math.Clamp(
        Math.round(rowBasis),
        0,
        BattleScene.GRID_HEIGHT - 1,
      ),
    };
  }

  private gridToWorldCenter(cell: GridCoordinate): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      (cell.col + 0.5) * BattleScene.GRID_CELL_WIDTH,
      (cell.row + 0.5) * BattleScene.GRID_CELL_HEIGHT,
    );
  }

  private snapPointToGrid(x: number, y: number): Phaser.Math.Vector2 {
    return this.gridToWorldCenter(this.worldToGridCoordinate(x, y));
  }

  private traceGridLine(
    start: GridCoordinate,
    end: GridCoordinate,
  ): GridCoordinate[] {
    const points: GridCoordinate[] = [];
    let x0 = start.col;
    let y0 = start.row;
    const x1 = end.col;
    const y1 = end.row;
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;

    while (true) {
      points.push({ col: x0, row: y0 });
      if (x0 === x1 && y0 === y1) {
        break;
      }
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y0 += sy;
      }
    }

    return points;
  }

  private clipPathTargetsByTerrain(
    start: GridCoordinate,
    targets: GridCoordinate[],
  ): GridCoordinate[] {
    const clippedTargets: GridCoordinate[] = [];
    let cursor = { col: start.col, row: start.row };

    for (const target of targets) {
      const segment = this.traceGridLine(cursor, target);
      let lastTraversable = { col: cursor.col, row: cursor.row };
      let blocked = false;

      for (let i = 1; i < segment.length; i += 1) {
        const step = segment[i];
        if (isGridCellImpassable(step.col, step.row)) {
          blocked = true;
          break;
        }
        lastTraversable = step;
      }

      if (blocked) {
        if (
          lastTraversable.col !== cursor.col ||
          lastTraversable.row !== cursor.row
        ) {
          clippedTargets.push(lastTraversable);
        }
        break;
      }

      clippedTargets.push(target);
      cursor = target;
    }

    return this.compactGridCoordinates(clippedTargets);
  }

  private compactGridCoordinates(path: GridCoordinate[]): GridCoordinate[] {
    if (path.length <= 1) {
      return path;
    }

    const compacted: GridCoordinate[] = [path[0]];
    for (let i = 1; i < path.length; i += 1) {
      const next = path[i];
      const previous = compacted[compacted.length - 1];
      if (next.col === previous.col && next.row === previous.row) {
        continue;
      }
      compacted.push(next);
    }

    return compacted;
  }

  private getCityWorldPosition(team: Team): Phaser.Math.Vector2 {
    return this.gridToWorldCenter(getTeamCityGridCoordinate(team));
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
      positions.push(this.gridToWorldCenter(this.neutralCityGridCoordinates[index]));
    }
    return positions;
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

  private drawPathPreview(draggedPath: Phaser.Math.Vector2[]): void {
    this.pathPreview.clear();
    const previewPath = this.buildCommandPath(draggedPath);
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

    const allyCityPositions = this.getOwnedCityPositions(this.localPlayerTeam);
    for (const cityPosition of allyCityPositions) {
      this.fogOfWarLayer.erase(this.cityVisionBrush, cityPosition.x, cityPosition.y);
    }

    const visibilitySources: Array<{ x: number; y: number; radius: number }> = [
      ...allyVisionSources.map((unit) => ({
        x: unit.x,
        y: unit.y,
        radius: this.runtimeTuning.fogVisionRadius,
      })),
      ...allyCityPositions.map((cityPosition) => ({
        x: cityPosition.x,
        y: cityPosition.y,
        radius: this.runtimeTuning.cityVisionRadius,
      })),
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
    for (const unit of this.units) {
      const terrainColor = this.sampleMapColorAt(unit.x, unit.y);
      unit.setTerrainColor(terrainColor);
      unit.setTerrainType(this.resolveTerrainType(terrainColor));
    }
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
    this.smoothRemoteUnitPositions(delta);
    this.applyCombatVisualWiggle(time);
    this.updateUnitTerrainColors();
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
