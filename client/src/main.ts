import Phaser from 'phaser';
import {
  type NetworkBattleEndedUpdate,
  type NetworkCityOwnershipUpdate,
  type NetworkFarmCitySupplyLineUpdate,
  type NetworkInfluenceGridUpdate,
  type NetworkLobbyStateUpdate,
  NetworkManager,
  type NetworkUnitHealthUpdate,
  type NetworkMatchPhase,
  type NetworkUnitRotationUpdate,
  type NetworkSupplyLineUpdate,
  type NetworkUnitSnapshot,
  type NetworkUnitPositionUpdate,
  type NetworkUnitPathStateUpdate,
  type NetworkUnitMoraleUpdate,
  type NetworkUnitPathCommand,
} from './NetworkManager';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';
import {
  DEFAULT_GENERATION_PROFILE,
  GENERATION_WATER_MODES,
  STARTING_FORCE_LAYOUT_STRATEGIES,
  type GenerationWaterMode,
  type StartingForceLayoutStrategy,
} from '../../shared/src/generationProfile.js';
import type { MapGenerationMethod } from '../../shared/src/networkContracts.js';
import {
  getGridCellTerrainType,
  getNeutralCityGridCoordinates,
  getTeamCityGridCoordinate,
} from '../../shared/src/terrainGrid.js';
import {
  HILL_GRADE_NONE,
  TERRAIN_SWATCHES,
  getHillGradeFromElevationByte,
  normalizeHillGrade,
  getSlopeMoraleDeltaFromHillGrades,
  getTerrainTypeFromCode,
} from '../../shared/src/terrainSemantics.js';
import {
  applyRuntimeTuningUpdate,
  DEFAULT_RUNTIME_TUNING,
  type RuntimeTuning,
} from '../../shared/src/runtimeTuning.js';
import {
  getUnitDamageMultiplier,
  getUnitHealthMax,
} from '../../shared/src/unitTypes.js';
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
import {
  MoraleBreakdownOverlay,
  type MoraleBreakdownOverlayData,
} from './MoraleBreakdownOverlay';
import { PathPreviewRenderer } from './PathPreviewRenderer';
import { RuntimeTuningPanel } from './RuntimeTuningPanel';
import { Team } from './Team';
import { ControlsOverlay } from './ControlsOverlay';
import {
  buildGridRouteFromWorldPath,
  buildMovementCommandMode,
  getFormationCenter,
  gridToWorldCenter,
  planFormationLineAssignments,
  setPlannedPath,
  translateGridRouteForUnit,
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

type RemoteUnitTransform = {
  x: number;
  y: number;
  rotation: number;
};

type RemoteUnitRenderState = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startedAtMs: number;
  durationMs: number;
  pendingRotation: number | null;
};

type RuntimeMapGridSidecar = {
  terrainCodeGrid: string;
  hillGradeGrid: Int8Array;
};

const getNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const DEFAULT_SERVER_HOST = 'localhost';
const DEFAULT_SERVER_PORT = 2567;

const parseConfiguredPort = (configuredPort: unknown): number => {
  const configuredPortValue = getNonEmptyString(configuredPort);
  if (!configuredPortValue) {
    return DEFAULT_SERVER_PORT;
  }
  const parsedPort = Number.parseInt(configuredPortValue, 10);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return DEFAULT_SERVER_PORT;
  }
  return parsedPort;
};

const resolveServerEndpoint = (): string => {
  const explicitEndpoint = getNonEmptyString(import.meta.env.VITE_SERVER_ENDPOINT);
  if (explicitEndpoint) {
    return explicitEndpoint;
  }
  const host = getNonEmptyString(import.meta.env.VITE_SERVER_HOST)
    ?? DEFAULT_SERVER_HOST;
  const port = parseConfiguredPort(import.meta.env.VITE_SERVER_PORT);
  return `ws://${host}:${port}`;
};

const normalizeMapImageBaseUrl = (baseUrl: string): string =>
  baseUrl.replace(/\/+$/, '');

const resolveDefaultMapImageBaseUrl = (): string => {
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  if (
    pathname === '/tacticalblocks'
    || pathname.startsWith('/tacticalblocks/')
  ) {
    return '/tacticalblocks/maps';
  }
  return '/maps';
};

const MAP_IMAGE_BASE_URL = normalizeMapImageBaseUrl(
  getNonEmptyString(import.meta.env.VITE_MAP_IMAGE_BASE_URL)
    ?? resolveDefaultMapImageBaseUrl(),
);

function resolveBackendMapImageBaseUrls(): string[] {
  const endpoint = resolveServerEndpoint();
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return [];
  }

  const httpProtocol =
    parsedEndpoint.protocol === 'wss:' ? 'https:' : 'http:';
  const basePath = parsedEndpoint.pathname.replace(/\/+$/, '');
  const origin = `${httpProtocol}//${parsedEndpoint.host}`;
  const candidates: string[] = [];

  if (basePath.length > 0) {
    candidates.push(`${origin}${basePath}/maps`);
    if (basePath.endsWith('/ws')) {
      const withoutWs = basePath.slice(0, -3);
      candidates.push(`${origin}${withoutWs}/maps`);
    }
  } else {
    candidates.push(`${origin}/maps`);
  }

  return candidates.map((value) => normalizeMapImageBaseUrl(value));
}

const BACKEND_MAP_IMAGE_BASE_URLS = resolveBackendMapImageBaseUrls();

function getTextureKeyForMapId(mapId: string): string {
  return `battle-map-${mapId}`;
}

function resolveRuntimeMapImageCandidatesById(mapId: string): string[] {
  const normalizedMapId = mapId.trim();
  if (normalizedMapId.length === 0) {
    return [];
  }

  const mapFileName = `${encodeURIComponent(normalizedMapId)}-16c.png`;
  const candidateBaseUrls = [MAP_IMAGE_BASE_URL, ...BACKEND_MAP_IMAGE_BASE_URLS];
  const uniqueCandidates = new Set<string>();
  for (const baseUrl of candidateBaseUrls) {
    uniqueCandidates.add(`${baseUrl}/${mapFileName}`);
  }
  return Array.from(uniqueCandidates);
}

function resolveRuntimeMapGridSidecarCandidatesById(mapId: string): string[] {
  const normalizedMapId = mapId.trim();
  if (normalizedMapId.length === 0) {
    return [];
  }

  const mapFileName = `${encodeURIComponent(normalizedMapId)}.elevation-grid.json`;
  const candidateBaseUrls = [MAP_IMAGE_BASE_URL, ...BACKEND_MAP_IMAGE_BASE_URLS];
  const uniqueCandidates = new Set<string>();
  for (const baseUrl of candidateBaseUrls) {
    uniqueCandidates.add(`${baseUrl}/${mapFileName}`);
  }
  return Array.from(uniqueCandidates);
}

function resolveMapImageById(mapId: string): string | undefined {
  const candidates = resolveRuntimeMapImageCandidatesById(mapId);
  return candidates[0];
}

function resolveInitialMapId(): string {
  const configuredMapId = GAMEPLAY_CONFIG.map.activeMapId;
  if (configuredMapId.trim().length > 0) {
    return configuredMapId;
  }

  const fallbackFromConfig = GAMEPLAY_CONFIG.map.availableMapIds.find((mapId) =>
    mapId.trim().length > 0,
  );
  if (fallbackFromConfig) {
    return fallbackFromConfig;
  }

  throw new Error('No valid map IDs were configured.');
}

class BattleScene extends Phaser.Scene {
  private static readonly TERRAIN_BY_COLOR = new Map<number, TerrainType>(
    TERRAIN_SWATCHES.map((swatch) => [swatch.color, swatch.type as TerrainType]),
  );
  private readonly units: Unit[] = [];
  private readonly unitsById: Map<string, Unit> = new Map<string, Unit>();
  private readonly plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]> =
    new Map<string, Phaser.Math.Vector2[]>();
  private readonly pendingUnitPathCommandsByUnitId: Map<
    string,
    NetworkUnitPathCommand
  > = new Map<string, NetworkUnitPathCommand>();
  private readonly remoteUnitLatestTransformByUnitId: Map<string, RemoteUnitTransform> =
    new Map<string, RemoteUnitTransform>();
  private readonly remoteUnitRenderStateByUnitId: Map<string, RemoteUnitRenderState> =
    new Map<string, RemoteUnitRenderState>();
  private readonly authoritativeTerrainByUnitId: Map<string, TerrainType> =
    new Map<string, TerrainType>();
  private readonly lastKnownHealthByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly combatVisualUntilByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly moraleScoreByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly supplyLinesByUnitId: Map<string, NetworkSupplyLineUpdate> =
    new Map<string, NetworkSupplyLineUpdate>();
  private readonly farmCitySupplyLinesByLinkId: Map<
    string,
    NetworkFarmCitySupplyLineUpdate
  > = new Map<string, NetworkFarmCitySupplyLineUpdate>();
  private readonly cities: City[] = [];
  private readonly cityByHomeTeam: Record<Team, City | null> = {
    [Team.RED]: null,
    [Team.BLUE]: null,
  };
  private cityGridCoordinatesByTeam: Record<Team, GridCoordinate> | null = null;
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
  private selectedGenerationMethod: MapGenerationMethod = 'wfc';
  private selectedWaterMode: GenerationWaterMode =
    DEFAULT_GENERATION_PROFILE.terrain.waterMode;
  private selectedRiverCount = DEFAULT_GENERATION_PROFILE.terrain.riverCount;
  private selectedMountainDensity = DEFAULT_GENERATION_PROFILE.terrain.mountainDensity;
  private selectedForestDensity = DEFAULT_GENERATION_PROFILE.terrain.forestDensity;
  private selectedLayoutStrategy: StartingForceLayoutStrategy =
    DEFAULT_GENERATION_PROFILE.startingForces.layoutStrategy;
  private selectedUnitCountPerTeam =
    DEFAULT_GENERATION_PROFILE.startingForces.unitCountPerTeam;
  private selectedNeutralCityCount = DEFAULT_GENERATION_PROFILE.cities.neutralCityCount;
  private selectedFriendlyCityCount = DEFAULT_GENERATION_PROFILE.cities.friendlyCityCount;
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
  private influenceRenderer: InfluenceRenderer | null = null;
  private moraleBreakdownOverlay: MoraleBreakdownOverlay | null = null;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private tuningPanel: RuntimeTuningPanel | null = null;
  private controlsOverlay: ControlsOverlay | null = null;
  private showMoraleBreakdownOverlay = true;
  private latestInfluenceGrid: NetworkInfluenceGridUpdate | null = null;
  private mapSamplingWidth = 0;
  private mapSamplingHeight = 0;
  private moraleDebugTerrainCodeGrid: string | null = null;
  private moraleDebugHillGradeGrid: Int8Array | null = null;
  private moraleDebugMapGridLoadToken = 0;
  private mapTextureRetryTimer: Phaser.Time.TimerEvent | null = null;

  private static readonly MAP_WIDTH = GAMEPLAY_CONFIG.map.width;
  private static readonly MAP_HEIGHT = GAMEPLAY_CONFIG.map.height;
  private static readonly GENERATION_METHODS: MapGenerationMethod[] = [
    'wfc',
    'noise',
    'auto',
  ];
  private static readonly MOUNTAIN_DENSITY_PRESETS = [0, 0.01, 0.03, 0.05, 0.08, 0.12];
  private static readonly FOREST_DENSITY_PRESETS = [0, 0.04, 0.08, 0.12, 0.18, 0.24];
  private static readonly RIVER_COUNT_PRESETS = [0, 1, 2, 3, 4];
  private static readonly UNIT_COUNT_PER_TEAM_PRESETS = [8, 16, 24, 32, 48, 64, 96, 128, 250];
  private static readonly NEUTRAL_CITY_COUNT_PRESETS = [0, 1, 2, 3, 4, 5, 6];
  private static readonly FRIENDLY_CITY_COUNT_PRESETS = [0, 1, 2, 3];
  private static readonly SHROUD_COLOR = GAMEPLAY_CONFIG.visibility.shroudColor;
  private static readonly SHROUD_ALPHA = GAMEPLAY_CONFIG.visibility.shroudAlpha;
  private static readonly ENEMY_VISIBILITY_PADDING =
    GAMEPLAY_CONFIG.visibility.enemyVisibilityPadding;
  private static readonly FOG_DEPTH = GAMEPLAY_CONFIG.visibility.fogDepth;
  private static readonly DRAG_THRESHOLD = GAMEPLAY_CONFIG.input.dragThreshold;
  private static readonly PREVIEW_PATH_POINT_SPACING =
    GAMEPLAY_CONFIG.input.previewPathPointSpacing;
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
  private static readonly REMOTE_POSITION_SNAP_DISTANCE =
    GAMEPLAY_CONFIG.network.remotePositionSnapDistance;
  private static readonly REMOTE_POSITION_AUTHORITATIVE_SNAP_DISTANCE =
    BattleScene.REMOTE_POSITION_SNAP_DISTANCE * 3;
  private static readonly REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
  private static readonly REMOTE_POSITION_INTERPOLATION_MAX_DURATION_MS = 3000;
  private static readonly WATER_TRANSITION_FLASH_DURATION_MS = Math.max(
    0,
    Math.round(GAMEPLAY_CONFIG.movement.waterTransitionPauseSeconds * 1000),
  );
  private static readonly COMBAT_WIGGLE_HOLD_MS = 250;
  private static readonly COMBAT_WIGGLE_AMPLITUDE = 1.8;
  private static readonly COMBAT_WIGGLE_FREQUENCY = 0.018;
  private static readonly MORALE_SAMPLE_RADIUS = 1;
  private static readonly MORALE_MAX_SCORE = 9;
  private static readonly MORALE_INFLUENCE_MIN = 1;
  private static readonly COMMANDER_MORALE_AURA_RADIUS_CELLS = 4;
  private static readonly COMMANDER_MORALE_AURA_BONUS = 1;
  private static readonly SLOPE_MORALE_DOT_EQUIVALENT = 1;
  private static readonly LOBBY_OVERLAY_DEPTH = 2200;

  constructor() {
    super({ key: 'BattleScene' });
  }

  preload(): void {
    const mapIdsToPreload = new Set<string>([
      this.activeMapId,
      ...this.availableMapIds,
    ]);
    for (const mapId of mapIdsToPreload) {
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
      lineThickness: 2,
      lineColor: 0xbad7f7,
      lineAlpha: 0.9,
    });
    this.movementLines = this.add.graphics();
    this.movementLines.setDepth(900);
    this.ensureActiveMapTextureLoaded();
    this.influenceRenderer = new InfluenceRenderer(this);
    this.influenceRenderer.setVisibleTeam(
      this.localPlayerTeam === Team.RED ? 'RED' : 'BLUE',
    );
    this.syncSupplyLinesToInfluenceRenderer();
    this.fogOfWarController = new FogOfWarController(this, {
      mapWidth: BattleScene.MAP_WIDTH,
      mapHeight: BattleScene.MAP_HEIGHT,
      depth: BattleScene.FOG_DEPTH,
      shroudColor: BattleScene.SHROUD_COLOR,
      shroudAlpha: BattleScene.SHROUD_ALPHA,
      enemyVisibilityPadding: BattleScene.ENEMY_VISIBILITY_PADDING,
      supplyCellWidth: BattleScene.GRID_CELL_WIDTH,
      supplyCellHeight: BattleScene.GRID_CELL_HEIGHT,
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
      {
        initialMoraleBreakdownOverlayVisible: this.showMoraleBreakdownOverlay,
        onMoraleBreakdownOverlayVisibilityChange: (visible) => {
          this.setMoraleBreakdownOverlayVisible(visible);
        },
      },
    );
    this.moraleBreakdownOverlay = new MoraleBreakdownOverlay(
      this.showMoraleBreakdownOverlay,
    );
    this.controlsOverlay = new ControlsOverlay();
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
        selectAllOwnedUnits: () => this.selectAllOwnedUnits(),
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
        commandSelectedUnitsIntoLine: (
          path: Phaser.Math.Vector2[],
          shiftHeld: boolean,
        ) => this.commandSelectedUnitsIntoLine(path, shiftHeld),
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
        holdSelectedUnitMovement: () => this.holdSelectedUnitMovement(),
        isShiftHeld: (pointer: Phaser.Input.Pointer) => this.isShiftHeld(pointer),
        clearAllQueuedMovement: () => this.clearAllQueuedMovement(),
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
      (pathStateUpdate) => {
        this.applyNetworkUnitPathState(pathStateUpdate);
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
      (supplyLineUpdate) => {
        this.applySupplyLineUpdate(supplyLineUpdate);
      },
      (unitId) => {
        this.removeSupplyLine(unitId);
      },
      (supplyLineUpdate) => {
        this.applyFarmCitySupplyLineUpdate(supplyLineUpdate);
      },
      (linkId) => {
        this.removeFarmCitySupplyLine(linkId);
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
      this.supplyLinesByUnitId.clear();
      this.farmCitySupplyLinesByLinkId.clear();
      this.syncSupplyLinesToInfluenceRenderer();
      this.tuningPanel?.destroy();
      this.tuningPanel = null;
      this.moraleBreakdownOverlay?.destroy();
      this.moraleBreakdownOverlay = null;
      this.controlsOverlay?.destroy();
      this.controlsOverlay = null;
      this.latestInfluenceGrid = null;
      this.mapBackground = null;
      this.stopMapTextureRetryLoop();
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
    this.refreshMoraleDebugMapGridData(mapId, this.lobbyMapRevision);
  }

  private refreshMoraleDebugMapGridData(mapId: string, revision: number): void {
    const normalizedMapId = mapId.trim();
    this.moraleDebugTerrainCodeGrid = null;
    this.moraleDebugHillGradeGrid = null;
    const loadToken = this.moraleDebugMapGridLoadToken + 1;
    this.moraleDebugMapGridLoadToken = loadToken;
    this.updateMoraleBreakdownOverlay();

    if (normalizedMapId.length === 0) {
      return;
    }

    const candidateUrls = resolveRuntimeMapGridSidecarCandidatesById(normalizedMapId);
    if (candidateUrls.length === 0) {
      return;
    }

    const cacheBustSuffix = `rev=${encodeURIComponent(String(revision))}&t=${Date.now()}`;
    void (async () => {
      for (const candidateUrl of candidateUrls) {
        const requestUrl = `${candidateUrl}${candidateUrl.includes('?') ? '&' : '?'}${cacheBustSuffix}`;
        try {
          const response = await fetch(requestUrl, { cache: 'no-store' });
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as unknown;
          const sidecar = this.parseRuntimeMapGridSidecarPayload(payload);
          if (!sidecar) {
            continue;
          }

          if (loadToken !== this.moraleDebugMapGridLoadToken) {
            return;
          }

          this.moraleDebugTerrainCodeGrid = sidecar.terrainCodeGrid;
          this.moraleDebugHillGradeGrid = sidecar.hillGradeGrid;
          this.updateMoraleBreakdownOverlay();
          return;
        } catch {
          continue;
        }
      }
    })();
  }

  private parseRuntimeMapGridSidecarPayload(payload: unknown): RuntimeMapGridSidecar | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidate = payload as {
      terrainCodeGrid?: unknown;
      hillGradeGrid?: unknown;
      elevation?: unknown;
    };
    const expectedLength = BattleScene.GRID_WIDTH * BattleScene.GRID_HEIGHT;
    if (
      typeof candidate.terrainCodeGrid !== 'string'
      || candidate.terrainCodeGrid.length !== expectedLength
    ) {
      return null;
    }

    const hillGradeGrid = new Int8Array(expectedLength);
    hillGradeGrid.fill(HILL_GRADE_NONE);
    const sourceGrid =
      Array.isArray(candidate.hillGradeGrid) && candidate.hillGradeGrid.length === expectedLength
        ? candidate.hillGradeGrid
        : Array.isArray(candidate.elevation) && candidate.elevation.length === expectedLength
          ? candidate.elevation
          : null;
    if (!sourceGrid) {
      return null;
    }

    for (let index = 0; index < expectedLength; index += 1) {
      const rawValue = sourceGrid[index];
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        return null;
      }
      const terrainCode = candidate.terrainCodeGrid.charAt(index);
      if (terrainCode !== 'h') {
        hillGradeGrid[index] = HILL_GRADE_NONE;
        continue;
      }

      // Legacy fallback: convert elevation bytes from older sidecars to hill grades.
      if (sourceGrid === candidate.elevation) {
        const normalizedElevation = Phaser.Math.Clamp(
          Math.round(rawValue <= 1 ? rawValue * 255 : rawValue),
          0,
          255,
        );
        hillGradeGrid[index] = getHillGradeFromElevationByte(normalizedElevation);
        continue;
      }
      const normalizedGrade = normalizeHillGrade(rawValue);
      hillGradeGrid[index] = normalizedGrade === HILL_GRADE_NONE ? 0 : normalizedGrade;
    }

    return {
      terrainCodeGrid: candidate.terrainCodeGrid,
      hillGradeGrid,
    };
  }

  private reloadMapTexture(mapId: string, revision: number): void {
    const imagePathCandidates = resolveRuntimeMapImageCandidatesById(mapId);
    if (imagePathCandidates.length === 0) {
      return;
    }

    const textureKey = getTextureKeyForMapId(mapId);
    const attemptedPaths: string[] = [];

    const tryLoadFromCandidate = (candidateIndex: number): void => {
      if (candidateIndex >= imagePathCandidates.length) {
        console.error(
          `Failed to load map texture "${mapId}" from all candidates: ${attemptedPaths.join(', ')}`,
        );
        return;
      }

      const imagePath = imagePathCandidates[candidateIndex];
      const pendingTextureKey = `${textureKey}--pending-${revision}-${candidateIndex}`;
      const cacheBustedPath = `${imagePath}${imagePath.includes('?') ? '&' : '?'}rev=${revision}&t=${Date.now()}`;
      attemptedPaths.push(cacheBustedPath);
      if (this.textures.exists(pendingTextureKey)) {
        this.textures.remove(pendingTextureKey);
      }

      const onLoadError = (file: Phaser.Loader.File): void => {
        if (file.key !== pendingTextureKey) {
          return;
        }
        this.load.off('loaderror', onLoadError);
        if (this.textures.exists(pendingTextureKey)) {
          this.textures.remove(pendingTextureKey);
        }
        if (candidateIndex + 1 < imagePathCandidates.length) {
          console.warn(
            `Failed map texture candidate for "${mapId}": ${cacheBustedPath}. Retrying...`,
          );
          tryLoadFromCandidate(candidateIndex + 1);
          return;
        }
        console.error(`Failed to load map texture "${mapId}" from ${cacheBustedPath}.`);
      };
      this.load.on('loaderror', onLoadError);

      this.load.once(`filecomplete-image-${pendingTextureKey}`, () => {
        this.load.off('loaderror', onLoadError);
        if (!this.textures.exists(pendingTextureKey)) {
          return;
        }
        if (this.textures.exists(textureKey)) {
          this.textures.remove(textureKey);
        }
        const renamed = this.textures.renameTexture(pendingTextureKey, textureKey);
        this.mapTextureKey = renamed ? textureKey : pendingTextureKey;

        if (!this.mapBackground || this.activeMapId !== mapId) {
          return;
        }
        this.mapBackground.setTexture(this.mapTextureKey);
        this.initializeMapTerrainSampling();
        this.refreshFogOfWar();
        this.stopMapTextureRetryLoop();
      });
      this.load.image(pendingTextureKey, cacheBustedPath);
      if (!this.load.isLoading()) {
        this.load.start();
      }
    };

    tryLoadFromCandidate(0);
  }

  private stopMapTextureRetryLoop(): void {
    if (!this.mapTextureRetryTimer) {
      return;
    }
    this.mapTextureRetryTimer.remove();
    this.mapTextureRetryTimer = null;
  }

  private ensureActiveMapTextureLoaded(): void {
    const activeTextureKey = getTextureKeyForMapId(this.activeMapId);
    if (this.textures.exists(activeTextureKey)) {
      this.stopMapTextureRetryLoop();
      if (this.mapBackground) {
        this.mapBackground.setTexture(activeTextureKey);
      }
      this.mapTextureKey = activeTextureKey;
      this.initializeMapTerrainSampling();
      this.refreshFogOfWar();
      return;
    }

    this.reloadMapTexture(this.activeMapId, this.lobbyMapRevision);
    if (this.mapTextureRetryTimer) {
      return;
    }

    this.mapTextureRetryTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const textureKey = getTextureKeyForMapId(this.activeMapId);
        if (this.textures.exists(textureKey)) {
          this.stopMapTextureRetryLoop();
          return;
        }
        this.reloadMapTexture(this.activeMapId, this.lobbyMapRevision);
      },
    });
  }

  private applySelectedLobbyMap(
    requestedMapId: string,
    forceTextureReload = false,
  ): void {
    const hasLoadedTexture = this.textures.exists(
      getTextureKeyForMapId(requestedMapId),
    );
    const effectiveForceTextureReload =
      forceTextureReload || !hasLoadedTexture;

    applySelectedLobbyMapFlow({
      requestedMapId,
      availableMapIds: this.availableMapIds,
      activeMapId: this.activeMapId,
      lobbyMapRevision: this.lobbyMapRevision,
      forceTextureReload: effectiveForceTextureReload,
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
          if (!this.cityGridCoordinatesByTeam) {
            this.neutralCityGridCoordinates = getNeutralCityGridCoordinates();
          } else {
            this.neutralCityGridCoordinates = this.neutralCityGridCoordinates.map(
              (anchor) => ({ ...anchor }),
            );
          }
          this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');
        },
        rebuildCitiesForCurrentMap: () => {
          this.rebuildCitiesForCurrentMap();
        },
        reloadMapTexture: (mapId: string, revision: number) => {
          this.reloadMapTexture(mapId, revision);
        },
        applyLoadedMapTexture: (mapId: string) => {
          this.activeMapId = mapId;
          this.mapTextureKey = getTextureKeyForMapId(mapId);
          this.authoritativeTerrainByUnitId.clear();
          for (const unit of this.unitsById.values()) {
            unit.clearWaterTransitionFlash();
          }
          if (!this.textures.exists(this.mapTextureKey)) {
            this.reloadMapTexture(mapId, this.lobbyMapRevision);
            return;
          }
          if (this.mapBackground) {
            this.mapBackground.setTexture(this.mapTextureKey);
          }
          this.initializeMapTerrainSampling();
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

    this.networkManager.sendLobbyGenerateMap(
      this.selectedGenerationMethod,
      {
        terrain: {
          waterMode: this.selectedWaterMode,
          riverCount: this.selectedRiverCount,
          mountainDensity: this.selectedMountainDensity,
          forestDensity: this.selectedForestDensity,
        },
        cities: {
          neutralCityCount: this.selectedNeutralCityCount,
          friendlyCityCount: this.selectedFriendlyCityCount,
        },
        startingForces: {
          layoutStrategy: this.selectedLayoutStrategy,
          unitCountPerTeam: this.selectedUnitCountPerTeam,
        },
      },
    );
  }

  private cycleGenerationMethod(step: number): void {
    const methods = BattleScene.GENERATION_METHODS;
    const currentIndex = methods.indexOf(this.selectedGenerationMethod);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const methodCount = methods.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex =
      (safeCurrentIndex + normalizedStep + methodCount) % methodCount;
    this.selectedGenerationMethod = methods[nextIndex] ?? methods[0];
    this.refreshLobbyOverlay();
  }

  private cycleLayoutStrategy(step: number): void {
    const layouts = STARTING_FORCE_LAYOUT_STRATEGIES;
    const currentIndex = layouts.indexOf(this.selectedLayoutStrategy);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const layoutCount = layouts.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex =
      (safeCurrentIndex + normalizedStep + layoutCount) % layoutCount;
    this.selectedLayoutStrategy = layouts[nextIndex] ?? layouts[0];
    this.refreshLobbyOverlay();
  }

  private cycleWaterMode(step: number): void {
    const modes = GENERATION_WATER_MODES;
    const currentIndex = modes.indexOf(this.selectedWaterMode);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const modeCount = modes.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + modeCount) % modeCount;
    this.selectedWaterMode = modes[nextIndex] ?? modes[0];
    this.refreshLobbyOverlay();
  }

  private cycleMountainDensity(step: number): void {
    const presets = BattleScene.MOUNTAIN_DENSITY_PRESETS;
    const currentIndex = presets.indexOf(this.selectedMountainDensity);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedMountainDensity = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private cycleRiverCount(step: number): void {
    const presets = BattleScene.RIVER_COUNT_PRESETS;
    const currentIndex = presets.indexOf(this.selectedRiverCount);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedRiverCount = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private cycleForestDensity(step: number): void {
    const presets = BattleScene.FOREST_DENSITY_PRESETS;
    const currentIndex = presets.indexOf(this.selectedForestDensity);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedForestDensity = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private cycleUnitCountPerTeam(step: number): void {
    const presets = BattleScene.UNIT_COUNT_PER_TEAM_PRESETS;
    const currentIndex = presets.indexOf(this.selectedUnitCountPerTeam);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedUnitCountPerTeam = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private cycleNeutralCityCount(step: number): void {
    const presets = BattleScene.NEUTRAL_CITY_COUNT_PRESETS;
    const currentIndex = presets.indexOf(this.selectedNeutralCityCount);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedNeutralCityCount = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private cycleFriendlyCityCount(step: number): void {
    const presets = BattleScene.FRIENDLY_CITY_COUNT_PRESETS;
    const currentIndex = presets.indexOf(this.selectedFriendlyCityCount);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const presetCount = presets.length;
    const normalizedStep = step >= 0 ? 1 : -1;
    const nextIndex = (safeCurrentIndex + normalizedStep + presetCount) % presetCount;
    this.selectedFriendlyCityCount = presets[nextIndex] ?? presets[0];
    this.refreshLobbyOverlay();
  }

  private createLobbyOverlay(): void {
    this.lobbyOverlayController = new LobbyOverlayController(
      this,
      {
        onCycleMap: (step: number) => this.requestLobbyMapStep(step),
        onRandomMap: () => this.requestRandomLobbyMap(),
        onCycleGenerationMethod: (step: number) => this.cycleGenerationMethod(step),
        onCycleWaterMode: (step: number) => this.cycleWaterMode(step),
        onCycleRiverCount: (step: number) => this.cycleRiverCount(step),
        onCycleMountainDensity: (step: number) => this.cycleMountainDensity(step),
        onCycleForestDensity: (step: number) => this.cycleForestDensity(step),
        onCycleLayoutStrategy: (step: number) => this.cycleLayoutStrategy(step),
        onCycleUnitCountPerTeam: (step: number) => this.cycleUnitCountPerTeam(step),
        onCycleNeutralCityCount: (step: number) => this.cycleNeutralCityCount(step),
        onCycleFriendlyCityCount: (step: number) => this.cycleFriendlyCityCount(step),
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
    this.cityGridCoordinatesByTeam = lobbyStateUpdate.cityAnchors
      ? {
          [Team.RED]: { ...lobbyStateUpdate.cityAnchors.RED },
          [Team.BLUE]: { ...lobbyStateUpdate.cityAnchors.BLUE },
        }
      : null;
    this.neutralCityGridCoordinates = Array.isArray(lobbyStateUpdate.neutralCityAnchors)
      ? lobbyStateUpdate.neutralCityAnchors.map((anchor) => ({ ...anchor }))
      : getNeutralCityGridCoordinates();
    this.neutralCityOwners = this.neutralCityGridCoordinates.map(() => 'NEUTRAL');

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
        this.setAllUnitMovementHold(false);
        if (nextPhase !== 'BATTLE') {
          this.supplyLinesByUnitId.clear();
          this.farmCitySupplyLinesByLinkId.clear();
          this.syncSupplyLinesToInfluenceRenderer();
        }
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
    this.setAllUnitMovementHold(false);
    this.supplyLinesByUnitId.clear();
    this.farmCitySupplyLinesByLinkId.clear();
    this.syncSupplyLinesToInfluenceRenderer();
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
      selectedGenerationMethod: this.selectedGenerationMethod,
      selectedWaterMode: this.selectedWaterMode,
      selectedRiverCount: this.selectedRiverCount,
      selectedMountainDensity: this.selectedMountainDensity,
      selectedForestDensity: this.selectedForestDensity,
      selectedLayoutStrategy: this.selectedLayoutStrategy,
      selectedUnitCountPerTeam: this.selectedUnitCountPerTeam,
      selectedNeutralCityCount: this.selectedNeutralCityCount,
      selectedFriendlyCityCount: this.selectedFriendlyCityCount,
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
    this.setAllUnitMovementHold(false);
    this.supplyLinesByUnitId.clear();
    this.farmCitySupplyLinesByLinkId.clear();
    this.syncSupplyLinesToInfluenceRenderer();

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
      unit.setHealthMax(
        Math.max(1, getUnitHealthMax(this.runtimeTuning.baseUnitHealth, unit.unitType)),
      );
    }
    this.influenceRenderer?.setLineStyle({
      lineThickness: this.runtimeTuning.lineThickness,
      lineAlpha: this.runtimeTuning.lineAlpha,
    });
    this.updateMoraleBreakdownOverlay();
  }

  private applyInfluenceGrid(
    influenceGridUpdate: NetworkInfluenceGridUpdate,
  ): void {
    this.latestInfluenceGrid = influenceGridUpdate;
    this.influenceRenderer?.setInfluenceGrid(influenceGridUpdate);
    this.updateMoraleBreakdownOverlay();
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

  private applySupplyLineUpdate(supplyLineUpdate: NetworkSupplyLineUpdate): void {
    this.supplyLinesByUnitId.set(supplyLineUpdate.unitId, supplyLineUpdate);
    this.syncSupplyLinesToInfluenceRenderer();
  }

  private removeSupplyLine(unitId: string): void {
    this.supplyLinesByUnitId.delete(unitId);
    this.syncSupplyLinesToInfluenceRenderer();
  }

  private applyFarmCitySupplyLineUpdate(
    supplyLineUpdate: NetworkFarmCitySupplyLineUpdate,
  ): void {
    this.farmCitySupplyLinesByLinkId.set(supplyLineUpdate.linkId, supplyLineUpdate);
    this.syncSupplyLinesToInfluenceRenderer();
  }

  private removeFarmCitySupplyLine(linkId: string): void {
    this.farmCitySupplyLinesByLinkId.delete(linkId);
    this.syncSupplyLinesToInfluenceRenderer();
  }

  private syncSupplyLinesToInfluenceRenderer(): void {
    this.influenceRenderer?.setSupplyLines(this.supplyLinesByUnitId.values());
    this.influenceRenderer?.setFarmCitySupplyLines(
      this.farmCitySupplyLinesByLinkId.values(),
    );
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
      applyNetworkUnitRotationSnapshot: (
        unit,
        unitId,
        rotation,
        snapImmediately,
      ) =>
        this.applyNetworkUnitRotationSnapshot(
          unit,
          unitId,
          rotation,
          snapImmediately,
        ),
    });
    this.refreshUnitMoraleVisual(networkUnit.unitId);
    this.updateMoraleBreakdownOverlay();
  }

  private removeNetworkUnit(unitId: string): void {
    removeNetworkUnitState({
      unitId,
      units: this.units,
      unitsById: this.unitsById,
      plannedPathsByUnitId: this.plannedPathsByUnitId,
      lastKnownHealthByUnitId: this.lastKnownHealthByUnitId,
      combatVisualUntilByUnitId: this.combatVisualUntilByUnitId,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
      selectedUnits: this.selectedUnits,
    });
    this.pendingUnitPathCommandsByUnitId.delete(unitId);
    this.remoteUnitLatestTransformByUnitId.delete(unitId);
    this.remoteUnitRenderStateByUnitId.delete(unitId);
    this.authoritativeTerrainByUnitId.delete(unitId);
    this.removeSupplyLine(unitId);
    this.updateMoraleBreakdownOverlay();
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

  private applyNetworkUnitPathState(
    pathStateUpdate: NetworkUnitPathStateUpdate,
  ): void {
    const { unitId, path, isPaused } = pathStateUpdate;
    const unit = this.unitsById.get(unitId);
    if (!unit || unit.team !== this.localPlayerTeam) {
      return;
    }
    unit.setMovementHold(isPaused);
    if (this.pendingUnitPathCommandsByUnitId.has(unitId)) {
      return;
    }

    if (path.length === 0) {
      this.plannedPathsByUnitId.delete(unitId);
      return;
    }

    this.setPlannedPath(
      unitId,
      path.map((point) => new Phaser.Math.Vector2(point.x, point.y)),
    );
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
      applyNetworkUnitRotationSnapshot: (
        unit,
        unitId,
        rotation,
        snapImmediately,
      ) =>
        this.applyNetworkUnitRotationSnapshot(
          unit,
          unitId,
          rotation,
          snapImmediately,
        ),
    });
  }

  private applyNetworkUnitMorale(moraleUpdate: NetworkUnitMoraleUpdate): void {
    applyNetworkUnitMoraleState({
      moraleUpdate,
      unitsById: this.unitsById,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
    });
    this.refreshUnitMoraleVisual(moraleUpdate.unitId);
    this.updateMoraleBreakdownOverlay();
  }

  private refreshUnitMoraleVisual(unitId: string): void {
    const unit = this.unitsById.get(unitId);
    if (!unit) {
      return;
    }

    const moraleScore = this.moraleScoreByUnitId.get(unitId) ?? null;
    unit.setMoraleScore(moraleScore);
  }

  private setMoraleBreakdownOverlayVisible(visible: boolean): void {
    this.showMoraleBreakdownOverlay = visible;
    this.moraleBreakdownOverlay?.setVisible(visible);
    this.updateMoraleBreakdownOverlay();
  }

  private applyAssignedTeam(teamValue: string): void {
    const assignedTeam = normalizeNetworkTeam(teamValue);
    if (assignedTeam !== this.localPlayerTeam) {
      this.clearSelection();
      this.localPlayerTeam = assignedTeam;
      this.plannedPathsByUnitId.clear();
      this.pendingUnitPathCommandsByUnitId.clear();
      this.rebuildRemoteRenderState();
      this.refreshFogOfWar();
    }
    this.influenceRenderer?.setVisibleTeam(
      this.localPlayerTeam === Team.RED ? 'RED' : 'BLUE',
    );
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
    const latestTransform =
      this.remoteUnitLatestTransformByUnitId.get(unitId) ?? {
        x: unit.x,
        y: unit.y,
        rotation: unit.rotation,
      };
    const previousAuthoritativeX = latestTransform.x;
    const previousAuthoritativeY = latestTransform.y;
    const authoritativeStepDistance = Phaser.Math.Distance.Between(
      previousAuthoritativeX,
      previousAuthoritativeY,
      x,
      y,
    );
    const authoritativePositionChanged =
      authoritativeStepDistance > GAMEPLAY_CONFIG.network.positionSyncEpsilon;
    const nextTransform: RemoteUnitTransform = {
      x,
      y,
      rotation: latestTransform.rotation,
    };
    const nextTerrain = this.resolveTerrainType(this.sampleMapColorAt(x, y));
    const previousTerrain = this.authoritativeTerrainByUnitId.get(unitId) ?? null;
    this.authoritativeTerrainByUnitId.set(unitId, nextTerrain);
    if (
      !snapImmediately &&
      previousTerrain !== null &&
      this.didCrossWaterBoundary(previousTerrain, nextTerrain)
    ) {
      unit.triggerWaterTransitionFlash(
        nowMs,
        BattleScene.WATER_TRANSITION_FLASH_DURATION_MS,
      );
    }
    this.remoteUnitLatestTransformByUnitId.set(unitId, nextTransform);

    if (snapImmediately) {
      unit.setPosition(x, y);
      this.remoteUnitRenderStateByUnitId.set(unitId, {
        startX: x,
        startY: y,
        targetX: x,
        targetY: y,
        startedAtMs: nowMs,
        durationMs: 0,
        pendingRotation: null,
      });
      return;
    }

    const renderState = this.remoteUnitRenderStateByUnitId.get(unitId);
    const currentX = unit.x;
    const currentY = unit.y;
    const visualErrorToAuthoritative = Phaser.Math.Distance.Between(
      currentX,
      currentY,
      x,
      y,
    );

    if (!authoritativePositionChanged) {
      if (
        visualErrorToAuthoritative >=
        BattleScene.REMOTE_POSITION_AUTHORITATIVE_SNAP_DISTANCE
      ) {
        unit.setPosition(x, y);
      }

      if (!renderState) {
        this.remoteUnitRenderStateByUnitId.set(unitId, {
          startX: unit.x,
          startY: unit.y,
          targetX: x,
          targetY: y,
          startedAtMs: nowMs,
          durationMs: 0,
          pendingRotation: null,
        });
      }
      return;
    }

    if (renderState && renderState.pendingRotation !== null) {
      unit.rotation = renderState.pendingRotation;
      renderState.pendingRotation = null;
    }

    if (
      visualErrorToAuthoritative >=
      BattleScene.REMOTE_POSITION_AUTHORITATIVE_SNAP_DISTANCE
    ) {
      unit.setPosition(x, y);
      this.remoteUnitRenderStateByUnitId.set(unitId, {
        startX: x,
        startY: y,
        targetX: x,
        targetY: y,
        startedAtMs: nowMs,
        durationMs: 0,
        pendingRotation: null,
      });
      return;
    }

    const durationMs = Phaser.Math.Clamp(
      (authoritativeStepDistance / Math.max(0.001, this.runtimeTuning.unitMoveSpeed)) *
        1000,
      BattleScene.REMOTE_POSITION_INTERPOLATION_MIN_DURATION_MS,
      BattleScene.REMOTE_POSITION_INTERPOLATION_MAX_DURATION_MS,
    );
    this.remoteUnitRenderStateByUnitId.set(unitId, {
      startX: currentX,
      startY: currentY,
      targetX: x,
      targetY: y,
      startedAtMs: nowMs,
      durationMs,
      pendingRotation: null,
    });
  }

  private applyNetworkUnitRotationSnapshot(
    unit: Unit,
    unitId: string,
    rotation: number,
    snapImmediately = false,
  ): void {
    const nowMs = this.time.now;
    const latestTransform =
      this.remoteUnitLatestTransformByUnitId.get(unitId) ?? {
        x: unit.x,
        y: unit.y,
        rotation: unit.rotation,
      };
    const nextTransform: RemoteUnitTransform = {
      x: latestTransform.x,
      y: latestTransform.y,
      rotation,
    };
    this.remoteUnitLatestTransformByUnitId.set(unitId, nextTransform);

    if (snapImmediately) {
      unit.rotation = rotation;
      const renderState = this.remoteUnitRenderStateByUnitId.get(unitId);
      if (renderState) {
        renderState.pendingRotation = null;
      }
      return;
    }

    const renderState = this.remoteUnitRenderStateByUnitId.get(unitId);
    if (renderState && this.isRemoteRenderStateActive(renderState, nowMs)) {
      renderState.pendingRotation = rotation;
      return;
    }

    unit.rotation = rotation;
  }

  private rebuildRemoteRenderState(): void {
    const nowMs = this.time.now;
    this.remoteUnitLatestTransformByUnitId.clear();
    this.remoteUnitRenderStateByUnitId.clear();
    this.authoritativeTerrainByUnitId.clear();
    for (const [unitId, unit] of this.unitsById) {
      const transform: RemoteUnitTransform = {
        x: unit.x,
        y: unit.y,
        rotation: unit.rotation,
      };
      this.remoteUnitLatestTransformByUnitId.set(unitId, transform);
      this.remoteUnitRenderStateByUnitId.set(unitId, {
        startX: unit.x,
        startY: unit.y,
        targetX: unit.x,
        targetY: unit.y,
        startedAtMs: nowMs,
        durationMs: 0,
        pendingRotation: null,
      });
    }
  }

  private smoothRemoteUnitPositions(_deltaMs: number): void {
    const nowMs = this.time.now;
    const staleUnitIds: string[] = [];
    for (const [unitId, renderState] of this.remoteUnitRenderStateByUnitId) {
      const unit = this.unitsById.get(unitId);
      if (!unit || !unit.isAlive()) {
        staleUnitIds.push(unitId);
        continue;
      }

      if (!this.isRemoteRenderStateActive(renderState, nowMs)) {
        unit.setPosition(renderState.targetX, renderState.targetY);
        if (renderState.pendingRotation !== null) {
          unit.rotation = renderState.pendingRotation;
          renderState.pendingRotation = null;
        }
        renderState.startX = renderState.targetX;
        renderState.startY = renderState.targetY;
        renderState.startedAtMs = nowMs;
        renderState.durationMs = 0;
        continue;
      }

      const t = Phaser.Math.Clamp(
        (nowMs - renderState.startedAtMs) / Math.max(1, renderState.durationMs),
        0,
        1,
      );
      unit.setPosition(
        Phaser.Math.Linear(renderState.startX, renderState.targetX, t),
        Phaser.Math.Linear(renderState.startY, renderState.targetY, t),
      );
    }

    for (const unitId of staleUnitIds) {
      this.remoteUnitLatestTransformByUnitId.delete(unitId);
      this.remoteUnitRenderStateByUnitId.delete(unitId);
    }
  }

  private isRemoteRenderStateActive(
    renderState: RemoteUnitRenderState,
    nowMs: number,
  ): boolean {
    if (renderState.durationMs <= 0) {
      return false;
    }

    return nowMs < renderState.startedAtMs + renderState.durationMs - 0.001;
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

  private updateWaterTransitionFlashes(timeMs: number): void {
    for (const unit of this.unitsById.values()) {
      unit.updateWaterTransitionFlash(timeMs);
    }
  }

  private didCrossWaterBoundary(
    previousTerrain: TerrainType,
    nextTerrain: TerrainType,
  ): boolean {
    if (previousTerrain === 'unknown' || nextTerrain === 'unknown') {
      return false;
    }

    return (previousTerrain === 'water') !== (nextTerrain === 'water');
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

  private selectAllOwnedUnits(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }
    this.selectedUnits.clear();

    for (const unit of this.unitsById.values()) {
      if (unit.team !== this.localPlayerTeam || !unit.isAlive()) {
        continue;
      }
      this.selectedUnits.add(unit);
      unit.setSelected(true);
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

    const movementCommandMode = buildMovementCommandMode(shiftHeld);
    const sharedTargetCell = worldToGridCoordinate(
      targetX,
      targetY,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const unitCell = worldToGridCoordinate(
        unit.x,
        unit.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      if (
        unitCell.col === sharedTargetCell.col &&
        unitCell.row === sharedTargetCell.row
      ) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = [sharedTargetCell].map((cell) =>
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

    const commandRoute = path.map((point) =>
      worldToGridCoordinate(
        point.x,
        point.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      ),
    );
    if (commandRoute.length === 0) {
      return;
    }
    const formationCenter = getFormationCenter(this.selectedUnits);
    if (!formationCenter) {
      return;
    }
    const formationAnchorCell = worldToGridCoordinate(
      formationCenter.x,
      formationCenter.y,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );

    const movementCommandMode = buildMovementCommandMode(shiftHeld, {
      preferRoads: this.selectedUnits.size <= 1,
    });

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      const unitCell = worldToGridCoordinate(
        unit.x,
        unit.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const targetCells = translateGridRouteForUnit({
        route: commandRoute,
        formationAnchorCell,
        unitCell,
        grid: BattleScene.UNIT_COMMAND_GRID_METRICS,
      });
      if (targetCells.length === 0) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      if (
        targetCells.length === 1 &&
        unitCell.col === targetCells[0].col &&
        unitCell.row === targetCells[0].row
      ) {
        this.plannedPathsByUnitId.delete(unitId);
        this.pendingUnitPathCommandsByUnitId.delete(unitId);
        continue;
      }
      const unitPath = targetCells.map((cell) =>
        gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS),
      );
      this.stageUnitPathCommand(unitId, unitPath, movementCommandMode);
    }
  }

  private commandSelectedUnitsIntoLine(
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

    const selectedUnitsForPlanning = Array.from(this.unitsById.entries())
      .filter(([, unit]) => this.selectedUnits.has(unit))
      .map(([unitId, unit]) => ({
        unitId,
        x: unit.x,
        y: unit.y,
      }));
    if (selectedUnitsForPlanning.length === 0) {
      return;
    }

    const assignments = planFormationLineAssignments({
      path,
      units: selectedUnitsForPlanning,
      grid: BattleScene.UNIT_COMMAND_GRID_METRICS,
    });
    if (assignments.length === 0) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld, {
      preferRoads: this.selectedUnits.size <= 1,
    });

    for (const assignment of assignments) {
      const unit = this.unitsById.get(assignment.unitId);
      if (!unit || !this.selectedUnits.has(unit)) {
        continue;
      }
      const unitCell = worldToGridCoordinate(
        unit.x,
        unit.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const targetCell = worldToGridCoordinate(
        assignment.slot.x,
        assignment.slot.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      if (unitCell.col === targetCell.col && unitCell.row === targetCell.row) {
        this.plannedPathsByUnitId.delete(assignment.unitId);
        this.pendingUnitPathCommandsByUnitId.delete(assignment.unitId);
        continue;
      }
      const unitPath = [
        gridToWorldCenter(targetCell, BattleScene.UNIT_COMMAND_GRID_METRICS),
      ];
      this.stageUnitPathCommand(assignment.unitId, unitPath, movementCommandMode);
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

  private clearAllQueuedMovement(): void {
    if (!this.isBattleActive()) {
      return;
    }

    this.resetPointerInteractionState();
    for (const [unitId, unit] of this.unitsById) {
      if (unit.team !== this.localPlayerTeam) {
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

    let engagedPendingCommand = false;
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
      engagedPendingCommand = true;
    }

    if (engagedPendingCommand) {
      return;
    }

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      this.networkManager.sendUnitToggleMovementPause(unitId);
    }
  }

  private holdSelectedUnitMovement(): void {
    if (!this.isBattleActive() || this.selectedUnits.size === 0 || !this.networkManager) {
      return;
    }

    for (const [unitId, unit] of this.unitsById) {
      if (!this.selectedUnits.has(unit)) {
        continue;
      }
      this.networkManager.sendUnitHoldMovement(unitId);
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
    const gridRoute = buildGridRouteFromWorldPath(
      path,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );
    return gridRoute.map((cell) =>
      gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS),
    );
  }

  private getCityWorldPosition(team: Team): Phaser.Math.Vector2 {
    const overrideCell = this.cityGridCoordinatesByTeam?.[team];
    if (overrideCell) {
      return gridToWorldCenter(overrideCell, BattleScene.UNIT_COMMAND_GRID_METRICS);
    }
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

  private setAllUnitMovementHold(isHeld: boolean): void {
    for (const unit of this.unitsById.values()) {
      unit.setMovementHold(isHeld);
    }
  }

  private refreshFogOfWar(): void {
    const supplyVisionPositions: Phaser.Math.Vector2[] = [];
    const seenSupplyCells = new Set<string>();
    for (const supplyLine of this.supplyLinesByUnitId.values()) {
      if (supplyLine.team !== this.localPlayerTeam) {
        continue;
      }
      for (const cell of supplyLine.path) {
        const cellKey = `${cell.col}:${cell.row}`;
        if (seenSupplyCells.has(cellKey)) {
          continue;
        }
        seenSupplyCells.add(cellKey);
        supplyVisionPositions.push(
          gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS),
        );
      }
    }

    this.fogOfWarController?.refresh(
      this.localPlayerTeam,
      this.units,
      this.getOwnedCityPositions(this.localPlayerTeam),
      supplyVisionPositions,
    );
  }

  private renderMovementLines(): void {
    this.movementLines.clear();
    this.movementLines.lineStyle(2, 0xf4e7b2, 0.75);
    this.movementLines.fillStyle(0xf4e7b2, 0.9);

    for (const [unitId, unit] of this.unitsById) {
      if (unit.team !== this.localPlayerTeam) {
        continue;
      }
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

    for (const swatch of TERRAIN_SWATCHES) {
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

      const transform = this.remoteUnitLatestTransformByUnitId.get(unitId);
      if (transform) {
        return { x: transform.x, y: transform.y };
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

  private updateMoraleBreakdownOverlay(): void {
    if (!this.moraleBreakdownOverlay || !this.showMoraleBreakdownOverlay) {
      return;
    }

    const focusUnit = this.getInfluenceDebugFocusUnit();
    if (!focusUnit) {
      this.moraleBreakdownOverlay.render(null);
      return;
    }

    const focusUnitId = this.getUnitId(focusUnit);
    if (!focusUnitId) {
      this.moraleBreakdownOverlay.render(null);
      return;
    }

    this.moraleBreakdownOverlay.render(
      this.buildMoraleBreakdownOverlayData(focusUnit, focusUnitId),
    );
  }

  private buildMoraleBreakdownOverlayData(
    unit: Unit,
    unitId: string,
  ): MoraleBreakdownOverlayData {
    const maxAbsInfluenceScore = Math.max(
      1,
      GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
    );
    const sampleRadius = BattleScene.MORALE_SAMPLE_RADIUS;
    const authoritativePosition = this.getAuthoritativeUnitPosition(unit);
    const centerColBasis =
      authoritativePosition.x / BattleScene.GRID_CELL_WIDTH - 0.5;
    const centerRowBasis =
      authoritativePosition.y / BattleScene.GRID_CELL_HEIGHT - 0.5;
    const centerCell = worldToGridCoordinate(
      authoritativePosition.x,
      authoritativePosition.y,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );
    const teamSign = unit.team === Team.BLUE ? 1 : -1;

    let accumulatedFriendlyWeight = 0;
    let sampledCells = 0;
    const mirrorSampleCenterCol = BattleScene.GRID_WIDTH - 1 - centerCell.col;
    const mirrorSampleCenterRow = centerCell.row;
    const influenceSampleScores: number[] = [];
    const influenceSampleAlignedScores: number[] = [];
    const influenceSampleFriendlyWeights: number[] = [];
    const mirrorInfluenceSampleScores: number[] = [];
    const mirrorAntiSymmetryErrors: number[] = [];
    for (let rowOffset = -sampleRadius; rowOffset <= sampleRadius; rowOffset += 1) {
      for (let colOffset = -sampleRadius; colOffset <= sampleRadius; colOffset += 1) {
        const sampleCol = Phaser.Math.Clamp(
          centerCell.col + colOffset,
          0,
          BattleScene.GRID_WIDTH - 1,
        );
        const sampleRow = Phaser.Math.Clamp(
          centerCell.row + rowOffset,
          0,
          BattleScene.GRID_HEIGHT - 1,
        );
        const cellScore = this.getInfluenceScoreAtGridCell(sampleCol, sampleRow);
        const mirroredCounterpartCol = Phaser.Math.Clamp(
          BattleScene.GRID_WIDTH - 1 - sampleCol,
          0,
          BattleScene.GRID_WIDTH - 1,
        );
        const mirroredCounterpartScore = this.getInfluenceScoreAtGridCell(
          mirroredCounterpartCol,
          sampleRow,
        );
        const mirrorWindowCol = Phaser.Math.Clamp(
          mirrorSampleCenterCol + colOffset,
          0,
          BattleScene.GRID_WIDTH - 1,
        );
        mirrorInfluenceSampleScores.push(
          this.getInfluenceScoreAtGridCell(mirrorWindowCol, sampleRow),
        );
        mirrorAntiSymmetryErrors.push(cellScore + mirroredCounterpartScore);
        const alignedCellScore = cellScore * teamSign;
        influenceSampleScores.push(cellScore);
        influenceSampleAlignedScores.push(alignedCellScore);
        const normalizedAlignedScore = Phaser.Math.Clamp(
          alignedCellScore / maxAbsInfluenceScore,
          -1,
          1,
        );
        const friendlyWeight = (normalizedAlignedScore + 1) * 0.5;
        influenceSampleFriendlyWeights.push(friendlyWeight);
        accumulatedFriendlyWeight += friendlyWeight;
        sampledCells += 1;
      }
    }

    const influenceBaseScore =
      sampledCells <= 0
        ? BattleScene.MORALE_INFLUENCE_MIN
        : (accumulatedFriendlyWeight / sampledCells) * BattleScene.MORALE_MAX_SCORE;
    const averageFriendlyWeight =
      sampledCells <= 0 ? 0 : accumulatedFriendlyWeight / sampledCells;
    let mirrorAntiSymmetryAbsSum = 0;
    let mirrorAntiSymmetryMaxAbsError = 0;
    for (const errorValue of mirrorAntiSymmetryErrors) {
      const absoluteError = Math.abs(errorValue);
      mirrorAntiSymmetryAbsSum += absoluteError;
      mirrorAntiSymmetryMaxAbsError = Math.max(
        mirrorAntiSymmetryMaxAbsError,
        absoluteError,
      );
    }
    const mirrorAntiSymmetryMeanAbsError =
      mirrorAntiSymmetryErrors.length > 0
        ? mirrorAntiSymmetryAbsSum / mirrorAntiSymmetryErrors.length
        : 0;
    const usingRuntimeMapGrid = this.hasMoraleDebugRuntimeMapGrid();
    const serverMoraleScore = this.moraleScoreByUnitId.get(unitId) ?? null;
    const supplyLine = this.supplyLinesByUnitId.get(unitId);
    if (!usingRuntimeMapGrid) {
      return {
        serverMoraleScore,
        estimatedMoraleScore: Number.NaN,
        contactDps: this.getContactDpsForMorale(unit, serverMoraleScore),
        runtimeSidecarAvailable: false,
        influenceBaseScore,
        unitTeam: unit.team === Team.RED ? "RED" : "BLUE",
        teamSign: teamSign > 0 ? 1 : -1,
        authoritativeX: authoritativePosition.x,
        authoritativeY: authoritativePosition.y,
        centerColBasis,
        centerRowBasis,
        sampleCenterCol: centerCell.col,
        sampleCenterRow: centerCell.row,
        sampleRadius,
        averageFriendlyWeight,
        influenceSampleScores,
        influenceSampleAlignedScores,
        influenceSampleFriendlyWeights,
        mirrorSampleCenterCol,
        mirrorSampleCenterRow,
        mirrorInfluenceSampleScores,
        mirrorAntiSymmetryErrors,
        mirrorAntiSymmetryMeanAbsError,
        mirrorAntiSymmetryMaxAbsError,
        supplyConnected: supplyLine ? supplyLine.connected : null,
        supplySourceCol: supplyLine ? supplyLine.sourceCol : null,
        supplySourceRow: supplyLine ? supplyLine.sourceRow : null,
        supplySeverIndex: supplyLine ? supplyLine.severIndex : null,
        supplyPathLength: supplyLine ? supplyLine.path.length : null,
        terrainType: 'unknown',
        terrainBonus: Number.NaN,
        commanderAuraBonus: Number.NaN,
        slopeDelta: Number.NaN,
      };
    }

    const terrainType = this.getMoraleDebugTerrainTypeAtCell(centerCell) ?? unit.getTerrainType();
    const terrainBonus = GAMEPLAY_CONFIG.terrain.moraleBonusByType[terrainType] ?? 0;
    const influenceWithTerrainScore = Phaser.Math.Clamp(
      influenceBaseScore + terrainBonus,
      BattleScene.MORALE_INFLUENCE_MIN,
      BattleScene.MORALE_MAX_SCORE,
    );

    const commanderAuraBonus = this.getCommanderAuraBonusForUnit(
      unit,
      unitId,
      centerCell,
    );
    const slopeDelta = this.getSlopeMoraleDeltaForUnit(unitId, centerCell);
    const supplyBlocked = Boolean(supplyLine && !supplyLine.connected);
    const estimatedMoraleScore = supplyBlocked
      ? 0
      : Phaser.Math.Clamp(
          influenceWithTerrainScore + commanderAuraBonus + slopeDelta,
          0,
          BattleScene.MORALE_MAX_SCORE,
        );
    const contactDps = this.getContactDpsForMorale(
      unit,
      serverMoraleScore ?? estimatedMoraleScore,
    );

    return {
      serverMoraleScore,
      estimatedMoraleScore,
      contactDps,
      runtimeSidecarAvailable: true,
      influenceBaseScore,
      unitTeam: unit.team === Team.RED ? "RED" : "BLUE",
      teamSign: teamSign > 0 ? 1 : -1,
      authoritativeX: authoritativePosition.x,
      authoritativeY: authoritativePosition.y,
      centerColBasis,
      centerRowBasis,
      sampleCenterCol: centerCell.col,
      sampleCenterRow: centerCell.row,
      sampleRadius,
      averageFriendlyWeight,
      influenceSampleScores,
      influenceSampleAlignedScores,
      influenceSampleFriendlyWeights,
      mirrorSampleCenterCol,
      mirrorSampleCenterRow,
      mirrorInfluenceSampleScores,
      mirrorAntiSymmetryErrors,
      mirrorAntiSymmetryMeanAbsError,
      mirrorAntiSymmetryMaxAbsError,
      supplyConnected: supplyLine ? supplyLine.connected : null,
      supplySourceCol: supplyLine ? supplyLine.sourceCol : null,
      supplySourceRow: supplyLine ? supplyLine.sourceRow : null,
      supplySeverIndex: supplyLine ? supplyLine.severIndex : null,
      supplyPathLength: supplyLine ? supplyLine.path.length : null,
      terrainType,
      terrainBonus,
      commanderAuraBonus,
      slopeDelta,
    };
  }

  private getInfluenceScoreAtGridCell(col: number, row: number): number {
    const grid = this.latestInfluenceGrid;
    if (!grid || grid.width <= 0 || grid.height <= 0 || grid.cells.length === 0) {
      return 0;
    }

    const clampedCol = Phaser.Math.Clamp(col, 0, grid.width - 1);
    const clampedRow = Phaser.Math.Clamp(row, 0, grid.height - 1);
    const index = clampedRow * grid.width + clampedCol;
    const value = grid.cells[index];
    return Number.isFinite(value) ? value : 0;
  }

  private hasMoraleDebugRuntimeMapGrid(): boolean {
    return Boolean(this.moraleDebugTerrainCodeGrid && this.moraleDebugHillGradeGrid);
  }

  private getMoraleDebugTerrainTypeAtCell(cell: GridCoordinate): TerrainType | null {
    const terrainCodeGrid = this.moraleDebugTerrainCodeGrid;
    if (!terrainCodeGrid) {
      return null;
    }

    const clampedCol = Phaser.Math.Clamp(cell.col, 0, BattleScene.GRID_WIDTH - 1);
    const clampedRow = Phaser.Math.Clamp(cell.row, 0, BattleScene.GRID_HEIGHT - 1);
    const terrainCode = terrainCodeGrid.charAt(
      clampedRow * BattleScene.GRID_WIDTH + clampedCol,
    );
    const terrainType = getTerrainTypeFromCode(terrainCode);
    return terrainType === 'unknown' ? null : terrainType;
  }

  private getMoraleDebugHillGradeAtCell(cell: GridCoordinate): number {
    const hillGradeGrid = this.moraleDebugHillGradeGrid;
    if (!hillGradeGrid) {
      return HILL_GRADE_NONE;
    }

    const clampedCol = Phaser.Math.Clamp(cell.col, 0, BattleScene.GRID_WIDTH - 1);
    const clampedRow = Phaser.Math.Clamp(cell.row, 0, BattleScene.GRID_HEIGHT - 1);
    const index = clampedRow * BattleScene.GRID_WIDTH + clampedCol;
    const value = hillGradeGrid[index];
    return Number.isFinite(value) ? value : HILL_GRADE_NONE;
  }

  private getCommanderAuraBonusForUnit(
    unit: Unit,
    unitId: string,
    unitCell: GridCoordinate,
  ): number {
    if (unit.team !== Team.BLUE && unit.team !== Team.RED) {
      return 0;
    }

    let commandersInRange = 0;
    for (const [candidateUnitId, candidateUnit] of this.unitsById) {
      if (
        !candidateUnit.isAlive() ||
        candidateUnit.unitType !== 'COMMANDER' ||
        candidateUnit.team !== unit.team
      ) {
        continue;
      }

      const candidatePosition =
        candidateUnitId === unitId
          ? this.getAuthoritativeUnitPosition(unit)
          : this.getAuthoritativeUnitPosition(candidateUnit);
      const commanderCell = worldToGridCoordinate(
        candidatePosition.x,
        candidatePosition.y,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      const colDelta = Math.abs(commanderCell.col - unitCell.col);
      const rowDelta = Math.abs(commanderCell.row - unitCell.row);
      if (
        colDelta <= BattleScene.COMMANDER_MORALE_AURA_RADIUS_CELLS &&
        rowDelta <= BattleScene.COMMANDER_MORALE_AURA_RADIUS_CELLS
      ) {
        commandersInRange += 1;
      }
    }

    return commandersInRange * BattleScene.COMMANDER_MORALE_AURA_BONUS;
  }

  private getSlopeMoraleDeltaForUnit(
    unitId: string,
    currentCell: GridCoordinate,
  ): number {
    const currentRotation = this.getAuthoritativeUnitRotation(unitId);
    const facingAngle =
      currentRotation + GAMEPLAY_CONFIG.movement.unitForwardOffsetRadians;
    const forwardCell: GridCoordinate = {
      col: Phaser.Math.Clamp(
        currentCell.col + Math.round(Math.cos(facingAngle)),
        0,
        BattleScene.GRID_WIDTH - 1,
      ),
      row: Phaser.Math.Clamp(
        currentCell.row + Math.round(Math.sin(facingAngle)),
        0,
        BattleScene.GRID_HEIGHT - 1,
      ),
    };
    const currentTerrainType =
      this.getMoraleDebugTerrainTypeAtCell(currentCell)
      ?? getGridCellTerrainType(currentCell.col, currentCell.row);
    const forwardTerrainType =
      this.getMoraleDebugTerrainTypeAtCell(forwardCell)
      ?? getGridCellTerrainType(forwardCell.col, forwardCell.row);
    const moralePerInfluenceDot =
      BattleScene.MORALE_MAX_SCORE /
      Math.max(
        1,
        (BattleScene.MORALE_SAMPLE_RADIUS * 2 + 1) *
          (BattleScene.MORALE_SAMPLE_RADIUS * 2 + 1),
      );
    return getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType,
      forwardTerrainType,
      currentHillGrade: this.getMoraleDebugHillGradeAtCell(currentCell),
      forwardHillGrade: this.getMoraleDebugHillGradeAtCell(forwardCell),
      moralePerInfluenceDot,
      slopeMoraleDotEquivalent: BattleScene.SLOPE_MORALE_DOT_EQUIVALENT,
    });
  }

  private getContactDpsForMorale(unit: Unit, moraleScore: number | null): number | null {
    if (moraleScore === null || !Number.isFinite(moraleScore)) {
      return null;
    }
    const moraleAdvantage = Phaser.Math.Clamp(
      moraleScore / BattleScene.MORALE_MAX_SCORE,
      0,
      1,
    );
    const safeBaseDps = Math.max(0, this.runtimeTuning.baseContactDps);
    const moraleBuffMultiplier =
      1 + moraleAdvantage * this.runtimeTuning.dpsInfluenceMultiplier;
    return safeBaseDps * moraleBuffMultiplier * getUnitDamageMultiplier(unit.unitType);
  }

  private getAuthoritativeUnitRotation(unitId: string): number {
    const transform = this.remoteUnitLatestTransformByUnitId.get(unitId);
    if (transform && Number.isFinite(transform.rotation)) {
      return transform.rotation;
    }

    const unit = this.unitsById.get(unitId);
    return unit ? unit.rotation : 0;
  }

  update(time: number, delta: number): void {
    runVisualUpdatePipeline({
      timeMs: time,
      deltaMs: delta,
      callbacks: {
        smoothRemoteUnitPositions: (deltaMs) => this.smoothRemoteUnitPositions(deltaMs),
        applyCombatVisualWiggle: (timeMs) => this.applyCombatVisualWiggle(timeMs),
        updateTerrainTransitionFlash: (timeMs) =>
          this.updateWaterTransitionFlashes(timeMs),
        refreshTerrainTint: () => this.updateUnitTerrainColors(),
        refreshFogOfWar: () => this.refreshFogOfWar(),
        renderPlannedPaths: () => this.renderMovementLines(),
        updateInfluenceDebugFocus: () => this.updateInfluenceDebugFocus(),
        renderInfluence: (timeMs, deltaMs) =>
          this.influenceRenderer?.render(timeMs, deltaMs),
      },
    });
    this.updateMoraleBreakdownOverlay();
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
