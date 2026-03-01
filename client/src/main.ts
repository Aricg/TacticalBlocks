import Phaser from 'phaser';
import {
  type NetworkBattleEndedUpdate,
  type NetworkCityOwnershipUpdate,
  type NetworkCitySupplyUpdate,
  type NetworkCitySupplyDepotLineUpdate,
  type NetworkFarmCitySupplyLineUpdate,
  type NetworkInfluenceGridUpdate,
  type NetworkLobbyStateUpdate,
  type NetworkSimulationFrameUpdate,
  NetworkManager,
  type NetworkUnitAttackingUpdate,
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
import {
  BattleInputController,
  type BattleInputCallbacks,
} from './BattleInputController';
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
import { SelectionOverlayRenderer } from './SelectionOverlayRenderer';
import { RuntimeTuningPanel } from './RuntimeTuningPanel';
import { Team } from './Team';
import { ControlsOverlay } from './ControlsOverlay';
import {
  getTextureKeyForMapId,
  resolveInitialMapId,
  resolveMapImageById,
  resolveRuntimeMapGridSidecarCandidatesById,
  resolveRuntimeMapImageCandidatesById,
  resolveServerEndpoint,
} from './MapAssetResolver';
import {
  getGridCellKey,
  parseRuntimeMapGridSidecarPayload,
  type RuntimeMapCityZone,
} from './RuntimeMapSidecar';
import {
  buildGridRouteFromWorldPath,
  buildMovementCommandMode,
  getFormationCenter,
  gridToWorldCenter,
  planFormationAreaAssignments,
  setPlannedPath,
  translateGridRouteForUnit,
  worldToGridCoordinate,
  type GridCoordinate,
  type UnitCommandPlannerGridMetrics,
} from './UnitCommandPlanner';
import {
  collectVisibleEnemyUnitTargets,
  findNearestEnemyUnitTarget,
} from './EnemyTargeting';
import { AutoAdvanceTargetCycler } from './AutoAdvanceTargetCycler';
import { buildAutoAdvanceTargetCityCells } from './AutoAdvanceTargets';
import { buildSelectedUnitsForPlanning } from './SelectedUnitPlanning';
import { buildOwnedCityCells } from './OwnedCityCells';
import { type TerrainType, Unit } from './Unit';
import {
  clearSelection as clearUnitSelection,
  forEachSelectedUnitEntry as forEachSelectedUnitEntryState,
  getSelectedUnitIdsSorted as getSelectedUnitIdsSortedState,
  selectAllOwnedUnits as selectAllOwnedUnitsState,
  selectOnlyUnit as selectOnlyUnitState,
  selectUnitsInBox as selectUnitsInBoxState,
} from './UnitSelectionState';
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
  private readonly pendingPathServerSyncByUnitId: Set<string> = new Set<string>();
  private readonly remoteUnitLatestTransformByUnitId: Map<string, RemoteUnitTransform> =
    new Map<string, RemoteUnitTransform>();
  private readonly remoteUnitRenderStateByUnitId: Map<string, RemoteUnitRenderState> =
    new Map<string, RemoteUnitRenderState>();
  private readonly authoritativeTerrainByUnitId: Map<string, TerrainType> =
    new Map<string, TerrainType>();
  private readonly lastKnownHealthByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly attackingUnitIds: Set<string> = new Set<string>();
  private readonly moraleScoreByUnitId: Map<string, number> =
    new Map<string, number>();
  private readonly supplyLinesByUnitId: Map<string, NetworkSupplyLineUpdate> =
    new Map<string, NetworkSupplyLineUpdate>();
  private readonly farmCitySupplyLinesByLinkId: Map<
    string,
    NetworkFarmCitySupplyLineUpdate
  > = new Map<string, NetworkFarmCitySupplyLineUpdate>();
  private readonly citySupplyDepotLinesByZoneId: Map<
    string,
    NetworkCitySupplyDepotLineUpdate
  > = new Map<string, NetworkCitySupplyDepotLineUpdate>();
  private readonly citySupplyBySourceId: Map<string, number> =
    new Map<string, number>();
  private readonly cities: City[] = [];
  private readonly cityByHomeTeam: Record<Team, City | null> = {
    [Team.RED]: null,
    [Team.BLUE]: null,
  };
  private cityGridCoordinatesByTeam: Record<Team, GridCoordinate> | null = null;
  private neutralCityGridCoordinates: GridCoordinate[] = [];
  private readonly neutralCities: City[] = [];
  private readonly supplyDepotMarkersByCityZoneId: Map<
    string,
    Phaser.GameObjects.Arc
  > = new Map<string, Phaser.GameObjects.Arc>();
  private readonly supplyDepotSupplyTextsByCityZoneId: Map<
    string,
    Phaser.GameObjects.Text
  > = new Map<string, Phaser.GameObjects.Text>();
  private readonly lastSentSupplyDepotCellByCityZoneId: Map<string, string> =
    new Map<string, string>();
  private activeSupplyDepotDragCityZoneId: string | null = null;
  private lastSupplyDepotDragSendAtMs = 0;
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
  private selectionOverlayRenderer: SelectionOverlayRenderer | null = null;
  private pathPreviewRenderer: PathPreviewRenderer | null = null;
  private fogOfWarController: FogOfWarController | null = null;
  private lobbyOverlayController: LobbyOverlayController | null = null;
  private movementLines!: Phaser.GameObjects.Graphics;
  private influenceRenderer: InfluenceRenderer | null = null;
  private moraleBreakdownOverlay: MoraleBreakdownOverlay | null = null;
  private shiftKey: Phaser.Input.Keyboard.Key | null = null;
  private runtimeTuning: RuntimeTuning = { ...DEFAULT_RUNTIME_TUNING };
  private tuningPanel: RuntimeTuningPanel | null = null;
  private controlsOverlay: ControlsOverlay | null = null;
  private tickRateText: Phaser.GameObjects.Text | null = null;
  private smoothedTickDeltaMs = 1000 / 60;
  private smoothedServerTickDeltaMs: number =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
  private tickRateDisplayAccumulatorMs = 0;
  private lastObservedSimulationFrame: number | null = null;
  private lastObservedSimulationFrameAtMs: number | null = null;
  private hasServerTickSample = false;
  private showMoraleBreakdownOverlay = true;
  private syncPlannedPathToServerRoute = true;
  private latestInfluenceGrid: NetworkInfluenceGridUpdate | null = null;
  private mapSamplingWidth = 0;
  private mapSamplingHeight = 0;
  private moraleDebugTerrainCodeGrid: string | null = null;
  private moraleDebugHillGradeGrid: Int8Array | null = null;
  private moraleDebugCityZones: RuntimeMapCityZone[] = [];
  private moraleDebugMapGridLoadToken = 0;
  private mapTextureRetryTimer: Phaser.Time.TimerEvent | null = null;
  private readonly autoAdvanceTargetCycler = new AutoAdvanceTargetCycler();

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
  private static readonly FOREST_ENEMY_REVEAL_DISTANCE_SQUARES =
    GAMEPLAY_CONFIG.visibility.forestEnemyRevealDistanceSquares;
  private static readonly FOG_DEPTH = GAMEPLAY_CONFIG.visibility.fogDepth;
  private static readonly DRAG_THRESHOLD = GAMEPLAY_CONFIG.input.dragThreshold;
  private static readonly SUPPLY_DEPOT_DEPTH = 1100;
  private static readonly SUPPLY_DEPOT_RADIUS = 7;
  private static readonly SUPPLY_DEPOT_FILL_COLOR = 0x8d5a34;
  private static readonly SUPPLY_DEPOT_FILL_ALPHA = 0.95;
  private static readonly SUPPLY_DEPOT_STROKE_COLOR = 0x2d1d0f;
  private static readonly SUPPLY_DEPOT_STROKE_ALPHA = 0.95;
  private static readonly SUPPLY_DEPOT_DRAG_SEND_INTERVAL_MS = 40;
  private static readonly SUPPLY_DEPOT_SUPPLY_TEXT_OFFSET_Y = 9;
  private static readonly SUPPLY_DEPOT_SUPPLY_TEXT_DEPTH = 1101;
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
  private static readonly COMBAT_WIGGLE_AMPLITUDE = 1.8;
  private static readonly COMBAT_WIGGLE_FREQUENCY = 0.018;
  private static readonly MORALE_SAMPLE_RADIUS = 1;
  private static readonly MORALE_MAX_SCORE = 9;
  private static readonly MORALE_INFLUENCE_MIN = 1;
  private static readonly COMMANDER_MORALE_AURA_RADIUS_CELLS = 4;
  private static readonly COMMANDER_MORALE_AURA_BONUS = 1;
  private static readonly SLOPE_MORALE_DOT_EQUIVALENT = 1;
  private static readonly LOBBY_OVERLAY_DEPTH = 2200;
  private static readonly TICK_RATE_DISPLAY_DEPTH = 2301;
  private static readonly TICK_RATE_DISPLAY_MARGIN = 12;
  private static readonly TICK_RATE_SMOOTHING_FACTOR = 0.15;
  private static readonly SERVER_TICK_SMOOTHING_FACTOR = 0.2;
  private static readonly TICK_RATE_DISPLAY_UPDATE_INTERVAL_MS = 120;
  private static readonly FORMATION_PREVIEW_DEPTH = 1001;
  private static readonly FORMATION_PREVIEW_FILL_COLOR = 0xbad7f7;
  private static readonly FORMATION_PREVIEW_FILL_ALPHA = 0.25;
  private static readonly FORMATION_PREVIEW_STROKE_COLOR = 0xe4f2ff;
  private static readonly FORMATION_PREVIEW_STROKE_ALPHA = 0.92;
  private static readonly FORMATION_PREVIEW_STROKE_WIDTH = 1;
  private static readonly FORMATION_PREVIEW_SLOT_WIDTH = Math.max(
    4,
    Math.round(GAMEPLAY_CONFIG.unit.bodyWidth * 0.78),
  );
  private static readonly FORMATION_PREVIEW_SLOT_HEIGHT = Math.max(
    4,
    Math.round(GAMEPLAY_CONFIG.unit.bodyHeight * 0.78),
  );

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

    this.selectionOverlayRenderer = new SelectionOverlayRenderer(this, {
      selectionBoxDepth: 1000,
      selectionFillColor: 0xffffff,
      selectionFillAlpha: 0.12,
      selectionStrokeWidth: 1,
      selectionStrokeColor: 0xffffff,
      selectionStrokeAlpha: 0.9,
      formationAreaDepth: BattleScene.FORMATION_PREVIEW_DEPTH,
      formationFillColor: BattleScene.FORMATION_PREVIEW_FILL_COLOR,
      formationFillAlpha: BattleScene.FORMATION_PREVIEW_FILL_ALPHA,
      formationStrokeWidth: BattleScene.FORMATION_PREVIEW_STROKE_WIDTH,
      formationStrokeColor: BattleScene.FORMATION_PREVIEW_STROKE_COLOR,
      formationStrokeAlpha: BattleScene.FORMATION_PREVIEW_STROKE_ALPHA,
      formationSlotWidth: BattleScene.FORMATION_PREVIEW_SLOT_WIDTH,
      formationSlotHeight: BattleScene.FORMATION_PREVIEW_SLOT_HEIGHT,
    });
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
      forestEnemyRevealDistanceSquares:
        BattleScene.FOREST_ENEMY_REVEAL_DISTANCE_SQUARES,
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
        initialServerRouteSyncEnabled: this.syncPlannedPathToServerRoute,
        onServerRouteSyncEnabledChange: (enabled) => {
          this.syncPlannedPathToServerRoute = enabled;
          if (!enabled) {
            this.pendingPathServerSyncByUnitId.clear();
          }
        },
      },
    );
    this.moraleBreakdownOverlay = new MoraleBreakdownOverlay(
      this.showMoraleBreakdownOverlay,
    );
    this.controlsOverlay = new ControlsOverlay();
    this.tickRateText = this.add
      .text(0, 0, 'Render: -- fps (-- ms)\nServer: -- tps', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#dbe9ff',
        backgroundColor: 'rgba(10, 14, 18, 0.62)',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(BattleScene.TICK_RATE_DISPLAY_DEPTH);
    this.layoutTickRateDisplay();
    this.applyRuntimeTuning(this.runtimeTuning);
    this.refreshFogOfWar();
    this.createLobbyOverlay();
    this.refreshLobbyOverlay();

    this.inputController = new BattleInputController(
      this,
      this.buildBattleInputCallbacks(),
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
      (simulationFrameUpdate) => {
        this.applyNetworkSimulationFrame(simulationFrameUpdate);
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
      (attackingUpdate) => {
        this.applyNetworkUnitAttacking(attackingUpdate);
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
      (citySupplyUpdate) => {
        this.applyCitySupply(citySupplyUpdate);
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
      (supplyDepotLineUpdate) => {
        this.applyCitySupplyDepotLineUpdate(supplyDepotLineUpdate);
      },
      (cityZoneId) => {
        this.removeCitySupplyDepotLine(cityZoneId);
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
      this.selectionOverlayRenderer?.destroy();
      this.selectionOverlayRenderer = null;
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
      this.clearCityAndSupplyDepotDisplayState();
      this.neutralCityOwners = this.neutralCityGridCoordinates.map(
        () => 'NEUTRAL',
      );
      this.lastKnownHealthByUnitId.clear();
      this.attackingUnitIds.clear();
      this.moraleScoreByUnitId.clear();
      this.citySupplyBySourceId.clear();
      this.supplyLinesByUnitId.clear();
      this.farmCitySupplyLinesByLinkId.clear();
      this.citySupplyDepotLinesByZoneId.clear();
      this.syncSupplyLinesToInfluenceRenderer();
      this.tuningPanel?.destroy();
      this.tuningPanel = null;
      this.moraleBreakdownOverlay?.destroy();
      this.moraleBreakdownOverlay = null;
      this.controlsOverlay?.destroy();
      this.controlsOverlay = null;
      this.tickRateText?.destroy();
      this.tickRateText = null;
      this.lastObservedSimulationFrame = null;
      this.lastObservedSimulationFrameAtMs = null;
      this.hasServerTickSample = false;
      this.smoothedServerTickDeltaMs = GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
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

    this.refreshCitySupplyLabels();
  }

  private buildBattleInputCallbacks(): BattleInputCallbacks {
    return {
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
      commandSelectedUnitsIntoFormationArea: (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        shiftHeld: boolean,
      ) => this.commandSelectedUnitsIntoFormationArea(
        startX,
        startY,
        endX,
        endY,
        shiftHeld,
      ),
      commandSelectedUnitsTowardEnemyInfluenceLine: (shiftHeld: boolean) =>
        this.commandSelectedUnitsTowardEnemyInfluenceLine(shiftHeld),
      commandSelectedUnitsTowardNearestVisibleEnemyUnit: (shiftHeld: boolean) =>
        this.commandSelectedUnitsTowardNearestVisibleEnemyUnit(shiftHeld),
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
      drawFormationAreaPreview: (
        startX: number,
        startY: number,
        currentX: number,
        currentY: number,
      ) => this.drawFormationAreaPreview(startX, startY, currentX, currentY),
      clearFormationAreaPreview: () => this.clearFormationAreaPreview(),
      appendDraggedPathPoint: (
        draggedPath: Phaser.Math.Vector2[],
        x: number,
        y: number,
        forceAppend?: boolean,
      ) => this.appendDraggedPathPoint(draggedPath, x, y, forceAppend),
      drawPathPreview: (draggedPath: Phaser.Math.Vector2[]) =>
        this.drawPathPreview(draggedPath),
      clearPathPreview: () => this.pathPreviewRenderer?.clear(),
      buildCommandPath: (path: Phaser.Math.Vector2[]) => this.buildCommandPath(path),
      cancelSelectedUnitMovement: () => this.cancelSelectedUnitMovement(),
      engageSelectedUnitMovement: () => this.engageSelectedUnitMovement(),
      isPointerInputBlocked: () => this.activeSupplyDepotDragCityZoneId !== null,
      isShiftHeld: (pointer: Phaser.Input.Pointer) => this.isShiftHeld(pointer),
      clearAllQueuedMovement: () => this.clearAllQueuedMovement(),
    };
  }

  private getHomeCitySupplySourceId(homeTeam: Team): string {
    return `home:${homeTeam}`;
  }

  private getNeutralCitySupplySourceId(index: number): string {
    return `neutral:${index}`;
  }

  private getCitySupplyAmountBySourceId(sourceId: string): number {
    const supplyAmount = this.citySupplyBySourceId.get(sourceId);
    if (typeof supplyAmount !== 'number' || !Number.isFinite(supplyAmount)) {
      return 0;
    }
    return Math.max(0, Math.floor(supplyAmount));
  }

  private refreshCitySupplyLabels(): void {
    this.cityByHomeTeam[Team.RED]?.setSupply(
      this.getCitySupplyAmountBySourceId(
        this.getHomeCitySupplySourceId(Team.RED),
      ),
    );
    this.cityByHomeTeam[Team.BLUE]?.setSupply(
      this.getCitySupplyAmountBySourceId(
        this.getHomeCitySupplySourceId(Team.BLUE),
      ),
    );
    for (let index = 0; index < this.neutralCities.length; index += 1) {
      this.neutralCities[index]?.setSupply(
        this.getCitySupplyAmountBySourceId(
          this.getNeutralCitySupplySourceId(index),
        ),
      );
    }
  }

  private rebuildCitiesForCurrentMap(): void {
    this.clearCityAndSupplyDepotDisplayState();
    this.createCities();
  }

  private clearCityAndSupplyDepotDisplayState(): void {
    for (const city of this.cities) {
      city.destroy();
    }
    for (const marker of this.supplyDepotMarkersByCityZoneId.values()) {
      marker.destroy();
    }
    for (const supplyText of this.supplyDepotSupplyTextsByCityZoneId.values()) {
      supplyText.destroy();
    }
    this.cities.length = 0;
    this.neutralCities.length = 0;
    this.supplyDepotMarkersByCityZoneId.clear();
    this.supplyDepotSupplyTextsByCityZoneId.clear();
    this.cityByHomeTeam[Team.RED] = null;
    this.cityByHomeTeam[Team.BLUE] = null;
    this.lastSentSupplyDepotCellByCityZoneId.clear();
    this.activeSupplyDepotDragCityZoneId = null;
  }

  private isSupplyDepotLocallyDraggable(owner: 'BLUE' | 'RED' | 'NEUTRAL'): boolean {
    if (!this.isBattleActive()) {
      return false;
    }
    if (owner === 'NEUTRAL') {
      return false;
    }
    const localTeam = this.localPlayerTeam === Team.RED ? 'RED' : 'BLUE';
    return owner === localTeam;
  }

  private ensureSupplyDepotMarker(cityZoneId: string): Phaser.GameObjects.Arc {
    const existing = this.supplyDepotMarkersByCityZoneId.get(cityZoneId);
    if (existing) {
      return existing;
    }

    const marker = this.add.circle(
      0,
      0,
      BattleScene.SUPPLY_DEPOT_RADIUS,
      BattleScene.SUPPLY_DEPOT_FILL_COLOR,
      BattleScene.SUPPLY_DEPOT_FILL_ALPHA,
    );
    marker.setDepth(BattleScene.SUPPLY_DEPOT_DEPTH);
    marker.setStrokeStyle(
      2,
      BattleScene.SUPPLY_DEPOT_STROKE_COLOR,
      BattleScene.SUPPLY_DEPOT_STROKE_ALPHA,
    );
    marker.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event?: Phaser.Types.Input.EventData,
      ) => {
        event?.stopPropagation();
      },
    );
    marker.on(
      'pointerup',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event?: Phaser.Types.Input.EventData,
      ) => {
        event?.stopPropagation();
      },
    );
    marker.on('dragstart', () => {
      const supplyDepotLine = this.citySupplyDepotLinesByZoneId.get(cityZoneId);
      if (!supplyDepotLine || !this.isSupplyDepotLocallyDraggable(supplyDepotLine.owner)) {
        this.activeSupplyDepotDragCityZoneId = null;
        return;
      }
      this.activeSupplyDepotDragCityZoneId = cityZoneId;
      this.lastSupplyDepotDragSendAtMs = 0;
    });
    marker.on(
      'drag',
      (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.activeSupplyDepotDragCityZoneId !== cityZoneId) {
          return;
        }
        const { targetCell, snappedX, snappedY } = this.resolveSnappedSupplyDepotDragPosition(
          pointer,
          dragX,
          dragY,
        );
        marker.setPosition(snappedX, snappedY);
        this.positionSupplyDepotSupplyText(cityZoneId, snappedX, snappedY);
        this.sendSupplyDepotMoveCommand(cityZoneId, targetCell);
      },
    );
    marker.on(
      'dragend',
      (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.activeSupplyDepotDragCityZoneId !== cityZoneId) {
          return;
        }
        const { targetCell, snappedX, snappedY } = this.resolveSnappedSupplyDepotDragPosition(
          pointer,
          dragX,
          dragY,
        );
        marker.setPosition(snappedX, snappedY);
        this.positionSupplyDepotSupplyText(cityZoneId, snappedX, snappedY);
        this.sendSupplyDepotMoveCommand(cityZoneId, targetCell, true);
        this.activeSupplyDepotDragCityZoneId = null;
      },
    );

    this.supplyDepotMarkersByCityZoneId.set(cityZoneId, marker);
    return marker;
  }

  private ensureSupplyDepotSupplyText(cityZoneId: string): Phaser.GameObjects.Text {
    const existing = this.supplyDepotSupplyTextsByCityZoneId.get(cityZoneId);
    if (existing) {
      return existing;
    }

    const text = this.add.text(0, 0, '0', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f5e1ce',
      stroke: '#2d1d0f',
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 0);
    text.setDepth(BattleScene.SUPPLY_DEPOT_SUPPLY_TEXT_DEPTH);
    this.supplyDepotSupplyTextsByCityZoneId.set(cityZoneId, text);
    return text;
  }

  private resolveSnappedSupplyDepotDragPosition(
    pointer: Phaser.Input.Pointer,
    dragX: number,
    dragY: number,
  ): {
    targetCell: GridCoordinate;
    snappedX: number;
    snappedY: number;
  } {
    const worldX = Number.isFinite(pointer.worldX) ? pointer.worldX : dragX;
    const worldY = Number.isFinite(pointer.worldY) ? pointer.worldY : dragY;
    const targetCell = this.toCommandCell(worldX, worldY);
    const snapped = this.toCommandWorld(targetCell);
    return {
      targetCell,
      snappedX: snapped.x,
      snappedY: snapped.y,
    };
  }

  private positionSupplyDepotSupplyText(
    cityZoneId: string,
    x: number,
    y: number,
  ): void {
    const text = this.supplyDepotSupplyTextsByCityZoneId.get(cityZoneId);
    if (!text) {
      return;
    }
    text.setPosition(
      x,
      y + BattleScene.SUPPLY_DEPOT_RADIUS + BattleScene.SUPPLY_DEPOT_SUPPLY_TEXT_OFFSET_Y,
    );
  }

  private sendSupplyDepotMoveCommand(
    cityZoneId: string,
    targetCell: GridCoordinate,
    force = false,
  ): void {
    if (!this.networkManager) {
      return;
    }

    const cellKey = `${targetCell.col}:${targetCell.row}`;
    const previousCellKey = this.lastSentSupplyDepotCellByCityZoneId.get(cityZoneId);
    const nowMs = this.time.now;
    if (!force) {
      if (previousCellKey === cellKey) {
        return;
      }
      if (
        nowMs - this.lastSupplyDepotDragSendAtMs
        < BattleScene.SUPPLY_DEPOT_DRAG_SEND_INTERVAL_MS
      ) {
        return;
      }
    }

    this.lastSupplyDepotDragSendAtMs = nowMs;
    this.lastSentSupplyDepotCellByCityZoneId.set(cityZoneId, cellKey);
    this.networkManager.sendCitySupplyDepotMove({
      cityZoneId,
      col: targetCell.col,
      row: targetCell.row,
    });
  }

  private syncSupplyDepotMarkers(): void {
    if (
      this.activeSupplyDepotDragCityZoneId &&
      !this.citySupplyDepotLinesByZoneId.has(this.activeSupplyDepotDragCityZoneId)
    ) {
      this.activeSupplyDepotDragCityZoneId = null;
    }

    const activeCityZoneIds = new Set<string>();
    for (const [cityZoneId, supplyDepotLine] of this.citySupplyDepotLinesByZoneId) {
      if (supplyDepotLine.owner === 'NEUTRAL') {
        continue;
      }
      activeCityZoneIds.add(cityZoneId);
      const marker = this.ensureSupplyDepotMarker(cityZoneId);
      const supplyText = this.ensureSupplyDepotSupplyText(cityZoneId);
      const depotCell = {
        col: supplyDepotLine.depotCol,
        row: supplyDepotLine.depotRow,
      };
      const depotPosition = gridToWorldCenter(
        depotCell,
        BattleScene.UNIT_COMMAND_GRID_METRICS,
      );
      if (this.activeSupplyDepotDragCityZoneId !== cityZoneId) {
        marker.setPosition(depotPosition.x, depotPosition.y);
      }
      this.positionSupplyDepotSupplyText(cityZoneId, marker.x, marker.y);
      supplyText.setText(`${Math.max(0, Math.floor(supplyDepotLine.depotSupplyStock))}`);
      supplyText.setVisible(true);

      const canDrag = this.isSupplyDepotLocallyDraggable(supplyDepotLine.owner);
      if (canDrag) {
        marker.setInteractive({ useHandCursor: true });
      } else {
        marker.setInteractive({ useHandCursor: false });
      }
      this.input.setDraggable(marker, canDrag);
      marker.setVisible(true);
    }

    for (const [cityZoneId, marker] of this.supplyDepotMarkersByCityZoneId) {
      if (activeCityZoneIds.has(cityZoneId)) {
        continue;
      }
      marker.destroy();
      this.supplyDepotMarkersByCityZoneId.delete(cityZoneId);
      const supplyText = this.supplyDepotSupplyTextsByCityZoneId.get(cityZoneId);
      supplyText?.destroy();
      this.supplyDepotSupplyTextsByCityZoneId.delete(cityZoneId);
      this.lastSentSupplyDepotCellByCityZoneId.delete(cityZoneId);
      if (this.activeSupplyDepotDragCityZoneId === cityZoneId) {
        this.activeSupplyDepotDragCityZoneId = null;
      }
    }
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
    this.moraleDebugCityZones = [];
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
          const sidecar = parseRuntimeMapGridSidecarPayload(payload, {
            gridWidth: BattleScene.GRID_WIDTH,
            gridHeight: BattleScene.GRID_HEIGHT,
          });
          if (!sidecar) {
            continue;
          }

          if (loadToken !== this.moraleDebugMapGridLoadToken) {
            return;
          }

          this.moraleDebugTerrainCodeGrid = sidecar.terrainCodeGrid;
          this.moraleDebugHillGradeGrid = sidecar.hillGradeGrid;
          this.moraleDebugCityZones = sidecar.cityZones;
          this.updateMoraleBreakdownOverlay();
          return;
        } catch {
          continue;
        }
      }
    })();
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
        this.resetBattleCommandAndSelectionState();
        if (nextPhase !== 'BATTLE') {
          this.clearSupplyAndLineState();
        }
        if (nextPhase === 'BATTLE') {
          this.lastBattleAnnouncement = null;
        }
        this.syncSupplyDepotMarkers();
      },
    });

    this.refreshLobbyOverlay();
  }

  private applyBattleEnded(battleEndedUpdate: NetworkBattleEndedUpdate): void {
    this.lastBattleAnnouncement = buildBattleEndedAnnouncement(battleEndedUpdate);
    this.matchPhase = 'LOBBY';
    this.resetBattleCommandAndSelectionState();
    this.clearSupplyAndLineState();
    this.syncSupplyDepotMarkers();
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
    this.activeSupplyDepotDragCityZoneId = null;
  }

  private resetBattleCommandAndSelectionState(): void {
    this.resetPointerInteractionState();
    this.clearSelection();
    this.plannedPathsByUnitId.clear();
    this.clearAllPendingUnitPathCommands();
    this.setAllUnitMovementHold(false);
  }

  private clearSupplyAndLineState(): void {
    this.citySupplyBySourceId.clear();
    this.refreshCitySupplyLabels();
    this.supplyLinesByUnitId.clear();
    this.farmCitySupplyLinesByLinkId.clear();
    this.syncSupplyLinesToInfluenceRenderer();
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
    this.resetBattleCommandAndSelectionState();
    this.clearSupplyAndLineState();
    this.syncSupplyDepotMarkers();

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
    this.influenceRenderer?.setFarmCitySupplyTripDurationSeconds(
      Math.max(0.25, this.runtimeTuning.cityUnitGenerationIntervalSeconds / 10),
    );
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
    this.autoAdvanceTargetCycler.reset();
  }

  private applyCitySupply(citySupplyUpdate: NetworkCitySupplyUpdate): void {
    this.citySupplyBySourceId.clear();
    for (const [sourceId, supplyAmount] of Object.entries(
      citySupplyUpdate.citySupplyBySourceId,
    )) {
      if (!Number.isFinite(supplyAmount)) {
        continue;
      }
      this.citySupplyBySourceId.set(sourceId, Math.max(0, Math.floor(supplyAmount)));
    }
    this.refreshCitySupplyLabels();
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

  private applyCitySupplyDepotLineUpdate(
    supplyDepotLineUpdate: NetworkCitySupplyDepotLineUpdate,
  ): void {
    this.citySupplyDepotLinesByZoneId.set(
      supplyDepotLineUpdate.cityZoneId,
      supplyDepotLineUpdate,
    );
    this.syncSupplyLinesToInfluenceRenderer();
    this.syncSupplyDepotMarkers();
  }

  private removeCitySupplyDepotLine(cityZoneId: string): void {
    this.citySupplyDepotLinesByZoneId.delete(cityZoneId);
    this.lastSentSupplyDepotCellByCityZoneId.delete(cityZoneId);
    if (this.activeSupplyDepotDragCityZoneId === cityZoneId) {
      this.activeSupplyDepotDragCityZoneId = null;
    }
    this.syncSupplyLinesToInfluenceRenderer();
    this.syncSupplyDepotMarkers();
  }

  private syncSupplyLinesToInfluenceRenderer(): void {
    this.influenceRenderer?.setSupplyLines(this.supplyLinesByUnitId.values());
    this.influenceRenderer?.setFarmCitySupplyLines(
      this.farmCitySupplyLinesByLinkId.values(),
    );
    this.influenceRenderer?.setCitySupplyDepotLines(
      this.citySupplyDepotLinesByZoneId.values(),
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
      attackingUnitIds: this.attackingUnitIds,
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
      attackingUnitIds: this.attackingUnitIds,
      moraleScoreByUnitId: this.moraleScoreByUnitId,
      selectedUnits: this.selectedUnits,
    });
    this.clearPendingUnitPathCommand(unitId);
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

  private applyNetworkSimulationFrame(
    simulationFrameUpdate: NetworkSimulationFrameUpdate,
  ): void {
    const nextFrame = Math.max(0, Math.round(simulationFrameUpdate.simulationFrame));
    const nowMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    if (
      this.lastObservedSimulationFrame !== null &&
      this.lastObservedSimulationFrameAtMs !== null &&
      nextFrame > this.lastObservedSimulationFrame
    ) {
      const elapsedMs = nowMs - this.lastObservedSimulationFrameAtMs;
      const framesAdvanced = nextFrame - this.lastObservedSimulationFrame;
      if (elapsedMs > 0 && framesAdvanced > 0) {
        const measuredServerTickDeltaMs = elapsedMs / framesAdvanced;
        this.smoothedServerTickDeltaMs = Phaser.Math.Linear(
          this.smoothedServerTickDeltaMs,
          measuredServerTickDeltaMs,
          BattleScene.SERVER_TICK_SMOOTHING_FACTOR,
        );
        this.hasServerTickSample = true;
      }
    } else if (
      this.lastObservedSimulationFrame !== null &&
      nextFrame < this.lastObservedSimulationFrame
    ) {
      this.hasServerTickSample = false;
      this.smoothedServerTickDeltaMs = GAMEPLAY_CONFIG.network.positionSyncIntervalMs;
    }
    this.lastObservedSimulationFrame = nextFrame;
    this.lastObservedSimulationFrameAtMs = nowMs;
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
    const hasPendingPathCommand = this.pendingUnitPathCommandsByUnitId.has(unitId);
    const allowServerRouteSyncForUnit =
      this.syncPlannedPathToServerRoute &&
      this.pendingPathServerSyncByUnitId.has(unitId);
    if (hasPendingPathCommand && !allowServerRouteSyncForUnit) {
      return;
    }

    if (path.length === 0) {
      this.pendingPathServerSyncByUnitId.delete(unitId);
      this.plannedPathsByUnitId.delete(unitId);
      return;
    }

    this.pendingPathServerSyncByUnitId.delete(unitId);
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
    });
  }

  private applyNetworkUnitAttacking(
    attackingUpdate: NetworkUnitAttackingUpdate,
  ): void {
    if (attackingUpdate.isAttacking) {
      this.attackingUnitIds.add(attackingUpdate.unitId);
      return;
    }
    this.attackingUnitIds.delete(attackingUpdate.unitId);
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
      this.clearAllPendingUnitPathCommands();
      this.rebuildRemoteRenderState();
      this.refreshFogOfWar();
    }
    this.influenceRenderer?.setVisibleTeam(
      this.localPlayerTeam === Team.RED ? 'RED' : 'BLUE',
    );
    this.syncSupplyDepotMarkers();
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
        this.attackingUnitIds.delete(unitId);
        continue;
      }

      if (!this.attackingUnitIds.has(unitId)) {
        unit.clearCombatVisualOffset();
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
    this.selectionOverlayRenderer?.drawSelectionBox(startX, startY, currentX, currentY);
  }

  private clearSelectionBox(): void {
    this.selectionOverlayRenderer?.clearSelectionBox();
  }

  private clearFormationAreaPreview(): void {
    this.selectionOverlayRenderer?.clearFormationAreaPreview();
  }

  private drawFormationAreaPreview(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): void {
    const assignments = this.getFormationAreaAssignmentsForSelectedUnits(
      startX,
      startY,
      endX,
      endY,
    );
    this.selectionOverlayRenderer?.drawFormationAreaPreview(assignments);
  }

  private selectOnlyUnit(unit: Unit): void {
    selectOnlyUnitState(this.selectedUnits, unit);
  }

  private selectUnitsInBox(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): void {
    selectUnitsInBoxState({
      selectedUnits: this.selectedUnits,
      units: this.units,
      localPlayerTeam: this.localPlayerTeam,
      startX,
      startY,
      endX,
      endY,
    });
  }

  private selectAllOwnedUnits(): void {
    selectAllOwnedUnitsState(this.selectedUnits, this.unitsById, this.localPlayerTeam);
  }

  private forEachSelectedUnitEntry(
    visitor: (unitId: string, unit: Unit) => void,
  ): void {
    forEachSelectedUnitEntryState(this.unitsById, this.selectedUnits, visitor);
  }

  private clearPlannedAndPendingPathCommand(unitId: string): void {
    this.plannedPathsByUnitId.delete(unitId);
    this.clearPendingUnitPathCommand(unitId);
  }

  private hasActiveSelectionInBattle(): boolean {
    return this.isBattleActive() && this.selectedUnits.size > 0;
  }

  private toCommandCell(worldX: number, worldY: number): GridCoordinate {
    return worldToGridCoordinate(
      worldX,
      worldY,
      BattleScene.UNIT_COMMAND_GRID_METRICS,
    );
  }

  private toCommandWorld(cell: GridCoordinate): Phaser.Math.Vector2 {
    return gridToWorldCenter(cell, BattleScene.UNIT_COMMAND_GRID_METRICS);
  }

  private stageUnitCommandToTargetCell(
    unitId: string,
    unitWorldX: number,
    unitWorldY: number,
    targetCell: GridCoordinate,
    movementCommandMode?: NetworkUnitPathCommand['movementCommandMode'],
  ): void {
    const unitCell = this.toCommandCell(unitWorldX, unitWorldY);
    this.stageUnitCommandForTargetCells(
      unitId,
      unitCell,
      [targetCell],
      movementCommandMode,
    );
  }

  private stageUnitCommandForTargetCells(
    unitId: string,
    unitCell: GridCoordinate,
    targetCells: ReadonlyArray<GridCoordinate>,
    movementCommandMode?: NetworkUnitPathCommand['movementCommandMode'],
  ): void {
    if (targetCells.length === 0) {
      this.clearPlannedAndPendingPathCommand(unitId);
      return;
    }
    if (
      targetCells.length === 1 &&
      unitCell.col === targetCells[0].col &&
      unitCell.row === targetCells[0].row
    ) {
      this.clearPlannedAndPendingPathCommand(unitId);
      return;
    }

    const unitPath = targetCells.map((cell) => this.toCommandWorld(cell));
    this.stageUnitPathCommand(unitId, unitPath, movementCommandMode);
  }

  private buildSelectionMovementCommandMode(
    shiftHeld: boolean,
    overrides: Parameters<typeof buildMovementCommandMode>[1] = {},
  ): NetworkUnitPathCommand['movementCommandMode'] {
    return buildMovementCommandMode(shiftHeld, {
      preferRoads: this.selectedUnits.size <= 1,
      ...overrides,
    });
  }

  private commandSelectedUnits(
    targetX: number,
    targetY: number,
    shiftHeld = false,
  ): void {
    if (!this.hasActiveSelectionInBattle()) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld);
    const sharedTargetCell = this.toCommandCell(targetX, targetY);

    this.forEachSelectedUnitEntry((unitId, unit) => {
      this.stageUnitCommandToTargetCell(
        unitId,
        unit.x,
        unit.y,
        sharedTargetCell,
        movementCommandMode,
      );
    });
  }

  private commandSelectedUnitsAlongPath(
    path: Phaser.Math.Vector2[],
    shiftHeld = false,
  ): void {
    if (
      !this.hasActiveSelectionInBattle() ||
      path.length === 0
    ) {
      return;
    }

    const commandRoute = path.map((point) =>
      this.toCommandCell(point.x, point.y),
    );
    if (commandRoute.length === 0) {
      return;
    }
    const formationCenter = getFormationCenter(this.selectedUnits);
    if (!formationCenter) {
      return;
    }
    const formationAnchorCell = this.toCommandCell(
      formationCenter.x,
      formationCenter.y,
    );

    const movementCommandMode = this.buildSelectionMovementCommandMode(shiftHeld);

    this.forEachSelectedUnitEntry((unitId, unit) => {
      const unitCell = this.toCommandCell(unit.x, unit.y);
      const targetCells = translateGridRouteForUnit({
        route: commandRoute,
        formationAnchorCell,
        unitCell,
        grid: BattleScene.UNIT_COMMAND_GRID_METRICS,
      });
      this.stageUnitCommandForTargetCells(
        unitId,
        unitCell,
        targetCells,
        movementCommandMode,
      );
    });
  }

  private getFormationAreaAssignmentsForSelectedUnits(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) {
    if (!this.hasActiveSelectionInBattle()) {
      return [];
    }

    const selectedUnitsForPlanning = buildSelectedUnitsForPlanning(
      this.unitsById,
      this.selectedUnits,
    );
    if (selectedUnitsForPlanning.length === 0) {
      return [];
    }

    return planFormationAreaAssignments({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      units: selectedUnitsForPlanning,
      grid: BattleScene.UNIT_COMMAND_GRID_METRICS,
    });
  }

  private commandSelectedUnitsIntoFormationArea(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    shiftHeld = false,
  ): void {
    const assignments = this.getFormationAreaAssignmentsForSelectedUnits(
      startX,
      startY,
      endX,
      endY,
    );
    if (assignments.length === 0) {
      return;
    }

    const movementCommandMode = this.buildSelectionMovementCommandMode(shiftHeld, {
      directPathing: true,
    });

    for (const assignment of assignments) {
      const unit = this.unitsById.get(assignment.unitId);
      if (!unit || !this.selectedUnits.has(unit)) {
        continue;
      }
      const targetCell = this.toCommandCell(
        assignment.slot.x,
        assignment.slot.y,
      );
      this.stageUnitCommandToTargetCell(
        assignment.unitId,
        unit.x,
        unit.y,
        targetCell,
        movementCommandMode,
      );
    }
  }

  private commandSelectedUnitsTowardEnemyInfluenceLine(shiftHeld = false): void {
    if (!this.hasActiveSelectionInBattle()) {
      return;
    }

    const targetCityCell = this.selectAutoAdvanceEnemyCityTarget(this.localPlayerTeam);
    if (!targetCityCell) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld, {
      preferRoads: false,
    });

    this.forEachSelectedUnitEntry((unitId, unit) => {
      const autoAdvanceCells = this.buildAutoAdvanceCellsToContestedInfluence(
        this.toCommandCell(unit.x, unit.y),
        unit.team,
        targetCityCell,
      );
      if (autoAdvanceCells.length === 0) {
        return;
      }

      const targetCell = autoAdvanceCells[autoAdvanceCells.length - 1];
      this.stageUnitCommandToTargetCell(
        unitId,
        unit.x,
        unit.y,
        targetCell,
        movementCommandMode,
      );
    });
  }

  private commandSelectedUnitsTowardNearestVisibleEnemyUnit(
    shiftHeld = false,
  ): void {
    if (!this.hasActiveSelectionInBattle()) {
      return;
    }

    const visibleEnemyTargets = collectVisibleEnemyUnitTargets(
      this.unitsById,
      this.localPlayerTeam,
      (unit) => this.getAuthoritativeUnitPosition(unit),
    );
    if (visibleEnemyTargets.length === 0) {
      return;
    }

    const movementCommandMode = buildMovementCommandMode(shiftHeld, {
      preferRoads: false,
    });

    this.forEachSelectedUnitEntry((unitId, unit) => {
      const unitPosition = this.getAuthoritativeUnitPosition(unit);
      const target = findNearestEnemyUnitTarget(
        unitPosition,
        visibleEnemyTargets,
      );
      if (!target) {
        return;
      }

      const targetCell = this.toCommandCell(target.x, target.y);
      this.stageUnitCommandToTargetCell(
        unitId,
        unitPosition.x,
        unitPosition.y,
        targetCell,
        movementCommandMode,
      );
    });
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

    this.forEachSelectedUnitEntry((unitId) => {
      this.cancelAndClearUnitMovementCommand(unitId);
    });
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
      this.cancelAndClearUnitMovementCommand(unitId);
    }
  }

  private engageSelectedUnitMovement(): void {
    const networkManager = this.networkManager;
    if (!this.hasActiveSelectionInBattle() || !networkManager) {
      return;
    }

    let engagedPendingCommand = false;
    this.forEachSelectedUnitEntry((unitId) => {
      const pendingCommand = this.pendingUnitPathCommandsByUnitId.get(unitId);
      if (!pendingCommand) {
        return;
      }

      this.applyPendingPathServerSyncIntent(unitId);
      networkManager.sendUnitPathCommand(pendingCommand);
      this.pendingUnitPathCommandsByUnitId.delete(unitId);
      engagedPendingCommand = true;
    });

    if (engagedPendingCommand) {
      return;
    }

    this.forEachSelectedUnitEntry((unitId) => {
      networkManager.sendUnitToggleMovementPause(unitId);
    });
  }

  private clearPendingUnitPathCommand(unitId: string): void {
    this.pendingUnitPathCommandsByUnitId.delete(unitId);
    this.pendingPathServerSyncByUnitId.delete(unitId);
  }

  private applyPendingPathServerSyncIntent(unitId: string): void {
    if (this.syncPlannedPathToServerRoute) {
      this.pendingPathServerSyncByUnitId.add(unitId);
      return;
    }
    this.pendingPathServerSyncByUnitId.delete(unitId);
  }

  private cancelAndClearUnitMovementCommand(unitId: string): void {
    this.networkManager?.sendUnitCancelMovement(unitId);
    this.clearPlannedAndPendingPathCommand(unitId);
  }

  private clearAllPendingUnitPathCommands(): void {
    this.pendingUnitPathCommandsByUnitId.clear();
    this.pendingPathServerSyncByUnitId.clear();
  }

  private stageUnitPathCommand(
    unitId: string,
    path: Phaser.Math.Vector2[],
    movementCommandMode?: NetworkUnitPathCommand['movementCommandMode'],
  ): void {
    this.pendingPathServerSyncByUnitId.delete(unitId);
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
    return gridRoute.map((cell) => this.toCommandWorld(cell));
  }

  private getCityWorldPosition(team: Team): Phaser.Math.Vector2 {
    return this.toCommandWorld(this.getCityGridCoordinate(team));
  }

  private getCityGridCoordinate(team: Team): GridCoordinate {
    const overrideCell = this.cityGridCoordinatesByTeam?.[team];
    if (overrideCell) {
      return { col: overrideCell.col, row: overrideCell.row };
    }
    const cityCell = getTeamCityGridCoordinate(team);
    return { col: cityCell.col, row: cityCell.row };
  }

  private getHomeCityGridByTeam(): Record<Team, GridCoordinate> {
    return {
      [Team.RED]: this.getCityGridCoordinate(Team.RED),
      [Team.BLUE]: this.getCityGridCoordinate(Team.BLUE),
    };
  }

  private getAutoAdvanceTargetCityCells(friendlyTeam: Team): GridCoordinate[] {
    return buildAutoAdvanceTargetCityCells({
      friendlyTeam,
      cityOwnerByHomeTeam: this.cityOwnerByHomeTeam,
      homeCityGridByTeam: this.getHomeCityGridByTeam(),
      neutralCityOwners: this.neutralCityOwners,
      neutralCityGridCoordinates: this.neutralCityGridCoordinates,
    });
  }

  private getSelectedUnitIdsSorted(): string[] {
    return getSelectedUnitIdsSortedState(this.unitsById, this.selectedUnits);
  }

  private selectAutoAdvanceEnemyCityTarget(friendlyTeam: Team): GridCoordinate | null {
    const enemyTeam = friendlyTeam === Team.BLUE ? Team.RED : Team.BLUE;
    const candidateTargets = this.getAutoAdvanceTargetCityCells(friendlyTeam);
    if (candidateTargets.length === 0) {
      candidateTargets.push(this.getCityGridCoordinate(enemyTeam));
    }
    if (candidateTargets.length === 0) {
      return null;
    }

    const formationCenter = getFormationCenter(this.selectedUnits);
    const formationCell = formationCenter
      ? this.toCommandCell(formationCenter.x, formationCenter.y)
      : null;

    return this.autoAdvanceTargetCycler.select({
      friendlyTeamKey: friendlyTeam,
      candidateTargets,
      formationCell,
      selectedUnitIds: this.getSelectedUnitIdsSorted(),
    });
  }

  private getOwnedCityPositions(ownerTeam: Team): Phaser.Math.Vector2[] {
    const ownedCityCells = buildOwnedCityCells({
      ownerTeam,
      cityOwnerByHomeTeam: this.cityOwnerByHomeTeam,
      homeCityGridByTeam: this.getHomeCityGridByTeam(),
      neutralCityOwners: this.neutralCityOwners,
      neutralCityGridCoordinates: this.neutralCityGridCoordinates,
    });
    return ownedCityCells.map((cell) => this.toCommandWorld(cell));
  }

  private drawPathPreview(draggedPath: Phaser.Math.Vector2[]): void {
    this.pathPreviewRenderer?.drawPathPreview(this.buildCommandPath(draggedPath));
  }

  private clearSelection(): void {
    clearUnitSelection(this.selectedUnits);
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
        supplyVisionPositions.push(this.toCommandWorld(cell));
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
        terrainType: 'unknown',
        terrainBonus: Number.NaN,
        commanderAuraBonus: Number.NaN,
        slopeDelta: Number.NaN,
        cityBonus: Number.NaN,
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
    const cityBonus = this.getCityMoraleBonusAtCell(centerCell, unit.team);
    const supplyBlocked = Boolean(supplyLine && !supplyLine.connected);
    const estimatedMoraleScore = supplyBlocked
      ? 0
      : Phaser.Math.Clamp(
          influenceWithTerrainScore + commanderAuraBonus + slopeDelta + cityBonus,
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
      terrainType,
      terrainBonus,
      commanderAuraBonus,
      slopeDelta,
      cityBonus,
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

  private getAlignedInfluenceScoreAtGridCell(
    col: number,
    row: number,
    team: Team,
  ): number {
    const score = this.getInfluenceScoreAtGridCell(col, row);
    if (team === Team.BLUE) {
      return score;
    }
    return -score;
  }

  private buildAutoAdvanceCellsToContestedInfluence(
    startCell: GridCoordinate,
    team: Team,
    targetCell: GridCoordinate,
  ): GridCoordinate[] {
    const directLine = this.traceGridLine(startCell, targetCell);
    if (directLine.length <= 1) {
      return [];
    }

    const contestedAlignedScore = this.runtimeTuning.influenceContestedThreshold;
    const startAlignedScore = this.getAlignedInfluenceScoreAtGridCell(
      startCell.col,
      startCell.row,
      team,
    );
    if (startAlignedScore <= contestedAlignedScore) {
      return [];
    }

    const pathCells: GridCoordinate[] = [];
    for (let i = 1; i < directLine.length; i += 1) {
      const cell = directLine[i];
      pathCells.push(cell);
      const alignedScore = this.getAlignedInfluenceScoreAtGridCell(
        cell.col,
        cell.row,
        team,
      );
      if (alignedScore <= contestedAlignedScore) {
        break;
      }
    }

    return pathCells;
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

  private getCityMoraleBonusAtCell(cell: GridCoordinate, team: Team): number {
    const configuredBonus = Number(GAMEPLAY_CONFIG.cities.moraleBonusInsideOwnedZone);
    if (!Number.isFinite(configuredBonus) || configuredBonus === 0) {
      return 0;
    }

    const cellKey = getGridCellKey(cell);
    for (const zone of this.moraleDebugCityZones) {
      const owner = this.getMoraleDebugCityZoneOwner(zone);
      if (owner !== team) {
        continue;
      }
      if (zone.cellSet.has(cellKey)) {
        return configuredBonus;
      }
    }

    return 0;
  }

  private getMoraleDebugCityZoneOwner(zone: RuntimeMapCityZone): CityOwner {
    if (zone.homeTeam === Team.RED) {
      return this.cityOwnerByHomeTeam[Team.RED];
    }
    if (zone.homeTeam === Team.BLUE) {
      return this.cityOwnerByHomeTeam[Team.BLUE];
    }

    const zoneAnchorKey = getGridCellKey(zone.anchor);
    for (let index = 0; index < this.neutralCityGridCoordinates.length; index += 1) {
      const neutralAnchor = this.neutralCityGridCoordinates[index];
      if (getGridCellKey(neutralAnchor) !== zoneAnchorKey) {
        continue;
      }
      return this.neutralCityOwners[index] ?? 'NEUTRAL';
    }

    return 'NEUTRAL';
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

  private layoutTickRateDisplay(): void {
    if (!this.tickRateText) {
      return;
    }
    this.tickRateText.setPosition(
      BattleScene.TICK_RATE_DISPLAY_MARGIN,
      this.cameras.main.height - BattleScene.TICK_RATE_DISPLAY_MARGIN,
    );
  }

  private updateTickRateDisplay(deltaMs: number): void {
    if (!this.tickRateText || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }
    this.layoutTickRateDisplay();
    this.smoothedTickDeltaMs = Phaser.Math.Linear(
      this.smoothedTickDeltaMs,
      deltaMs,
      BattleScene.TICK_RATE_SMOOTHING_FACTOR,
    );
    this.tickRateDisplayAccumulatorMs += deltaMs;
    if (
      this.tickRateDisplayAccumulatorMs
      < BattleScene.TICK_RATE_DISPLAY_UPDATE_INTERVAL_MS
    ) {
      return;
    }
    this.tickRateDisplayAccumulatorMs = 0;
    const safeRenderDeltaMs = Math.max(0.1, this.smoothedTickDeltaMs);
    const renderFps = 1000 / safeRenderDeltaMs;
    const targetServerTickDeltaMs = Math.max(
      0.1,
      GAMEPLAY_CONFIG.network.positionSyncIntervalMs,
    );
    const targetServerTps = 1000 / targetServerTickDeltaMs;
    const serverTickDeltaMs = Math.max(0.1, this.smoothedServerTickDeltaMs);
    const serverTps = 1000 / serverTickDeltaMs;
    const serverLine = this.hasServerTickSample
      ? `Server: ${serverTps.toFixed(1)} tps (${serverTickDeltaMs.toFixed(1)} ms)`
      : `Server: -- tps (target ${targetServerTps.toFixed(1)})`;
    this.tickRateText.setText(
      `Render: ${renderFps.toFixed(1)} fps (${safeRenderDeltaMs.toFixed(1)} ms)\n${serverLine}`,
    );
  }

  update(time: number, delta: number): void {
    this.updateTickRateDisplay(delta);
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
