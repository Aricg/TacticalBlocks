import Phaser from 'phaser';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';

export type InfluenceGridSnapshot = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  revision: number;
  cells: number[];
};

export type SupplyLinePathCellSnapshot = {
  col: number;
  row: number;
};

export type SupplyLineSnapshot = {
  unitId: string;
  team: 'BLUE' | 'RED';
  connected: boolean;
  sourceCol: number;
  sourceRow: number;
  severIndex: number;
  path: SupplyLinePathCellSnapshot[];
};

export type FarmCitySupplyLineSnapshot = {
  linkId: string;
  farmZoneId: string;
  cityZoneId: string;
  team: 'BLUE' | 'RED';
  connected: boolean;
  severIndex: number;
  path: SupplyLinePathCellSnapshot[];
};

type GridMeta = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
};

type ContourSegment = {
  aKey: string;
  bKey: string;
};

type TeamSign = 1 | -1;

type StaticInfluenceSource = {
  x: number;
  y: number;
  power: number;
  teamSign: TeamSign;
};

type StaticInfluenceSourceInput = {
  x: number;
  y: number;
  power: number;
  team: 'BLUE' | 'RED';
};

type InfluenceLineStyle = {
  lineThickness: number;
  lineAlpha: number;
};

type SupplyLineRenderCell = {
  x: number;
  y: number;
};

type SupplyLineRenderState = {
  team: 'BLUE' | 'RED';
  connected: boolean;
  endIndex: number;
  cells: SupplyLineRenderCell[];
};

type FarmCitySupplyLineRenderState = {
  linkId: string;
  team: 'BLUE' | 'RED';
  connected: boolean;
  endIndex: number;
  severCell: SupplyLineRenderCell | null;
  cells: SupplyLineRenderCell[];
};

type PlayerTeam = 'BLUE' | 'RED';

export class InfluenceRenderer {
  private readonly scene: Phaser.Scene;
  private readonly frontLineGraphics: Phaser.GameObjects.Graphics;
  private readonly farmCitySupplyGraphics: Phaser.GameObjects.Graphics;
  private readonly supplyWaveGraphics: Phaser.GameObjects.Graphics;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private readonly debugCellValueTexts: Phaser.GameObjects.Text[];
  private gridMeta: GridMeta | null = null;
  private previousServerCells: Float32Array | null = null;
  private targetServerCells: Float32Array | null = null;
  private displayCells: Float32Array | null = null;
  private renderCells: Float32Array | null = null;
  private staticInfluenceSources: StaticInfluenceSource[] = [];
  private debugFocusPoint: Phaser.Math.Vector2 | null = null;
  private debugFocusScoreOverride: number | null = null;
  private latestRevision = -1;
  private interpolationElapsedMs = 0;
  private lineThickness: number = GAMEPLAY_CONFIG.influence.lineThickness;
  private lineAlpha: number = GAMEPLAY_CONFIG.influence.lineAlpha;
  private visibleTeam: PlayerTeam | null = null;
  private supplyLines: SupplyLineSnapshot[] = [];
  private supplyLineRenderStates: SupplyLineRenderState[] = [];
  private farmCitySupplyLines: FarmCitySupplyLineSnapshot[] = [];
  private farmCitySupplyLineRenderStates: FarmCitySupplyLineRenderState[] = [];
  private farmCitySupplyTripDurationSeconds =
    Math.max(0.25, GAMEPLAY_CONFIG.runtimeTuning.defaults.cityUnitGenerationIntervalSeconds / 10);

  private static readonly EPSILON = 0.0001;
  private static readonly KEY_PRECISION = 1000;
  private static readonly DEBUG_OVERLAY_ENABLED =
    GAMEPLAY_CONFIG.influence.debugDotsEnabled;
  private static readonly DEBUG_POSITIVE_COLOR = 0x1e8bff;
  private static readonly DEBUG_NEGATIVE_COLOR = 0xff3030;
  private static readonly DEBUG_NEUTRAL_COLOR = 0xd9d9d9;
  private static readonly DEBUG_DOT_RADIUS = 3;
  private static readonly DEBUG_TEXT_OFFSET_X = 6;
  private static readonly DEBUG_TEXT_OFFSET_Y = 6;
  private static readonly DEBUG_ALPHA_SCORE_RANGE = Math.max(
    1,
    GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
  );
  private static readonly SUPPLY_WAVE_BLUE_COLOR = 0x65bfff;
  private static readonly SUPPLY_WAVE_RED_COLOR = 0xff7f6c;
  private static readonly SUPPLY_SEVER_COLOR = 0xfff3ad;
  private static readonly FARM_CITY_SUPPLY_COLOR = 0xffd700;
  private static readonly FARM_CITY_SUPPLY_DISCONNECTED_ALPHA = 0.55;
  private static readonly FARM_CITY_SUPPLY_CONNECTED_ALPHA = 0.9;
  private static readonly FARM_CITY_SUPPLY_SEVER_COLOR = 0xff4a4a;
  private static readonly FARM_CITY_SUPPLY_LINE_WIDTH = 2;
  private static readonly FARM_CITY_SUPPLY_DOT_RADIUS = 4;
  private static readonly FARM_CITY_SUPPLY_DOT_COLOR = 0xfff3ad;
  private static readonly FARM_CITY_SUPPLY_DOT_ALPHA = 0.95;
  private static readonly SUPPLY_WAVE_RADIUS = 4;
  private static readonly SUPPLY_WAVE_SPEED_CELLS_PER_MS = 0.006;
  private static readonly SUPPLY_WAVE_SIGMA_CELLS = 1.6;
  private static readonly SUPPLY_WAVE_BASE_ALPHA = 0.08;
  private static readonly SUPPLY_WAVE_PEAK_ALPHA = 0.72;
  private static readonly SUPPLY_WAVE_OFFSCREEN_PADDING = 24;
  private static readonly INTERPOLATION_DURATION_MS =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs *
    GAMEPLAY_CONFIG.influence.updateIntervalFrames;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.frontLineGraphics = scene.add.graphics();
    this.frontLineGraphics.setDepth(910);
    this.farmCitySupplyGraphics = scene.add.graphics();
    this.farmCitySupplyGraphics.setDepth(978);
    this.supplyWaveGraphics = scene.add.graphics();
    this.supplyWaveGraphics.setDepth(979);
    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(980);
    this.debugCellValueTexts = Array.from({ length: 4 }, () => {
      const text = scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#111111',
      });
      text.setDepth(981);
      text.setVisible(false);
      return text;
    });
  }

  public setStaticInfluenceSources(
    sources: StaticInfluenceSourceInput[],
  ): void {
    this.staticInfluenceSources = sources
      .filter(
        (source) =>
          Number.isFinite(source.x) &&
          Number.isFinite(source.y) &&
          Number.isFinite(source.power) &&
          source.power > 0,
      )
      .map((source) => ({
        x: source.x,
        y: source.y,
        power: source.power,
        teamSign: source.team === 'BLUE' ? 1 : -1,
      }));
  }

  public setInfluenceGrid(influenceGrid: InfluenceGridSnapshot): void {
    if (influenceGrid.cells.length !== influenceGrid.width * influenceGrid.height) {
      return;
    }
    if (influenceGrid.revision <= this.latestRevision) {
      return;
    }

    const nextGridMeta: GridMeta = {
      width: influenceGrid.width,
      height: influenceGrid.height,
      cellWidth: influenceGrid.cellWidth,
      cellHeight: influenceGrid.cellHeight,
    };
    const nextTargetCells = Float32Array.from(influenceGrid.cells);

    const isResized =
      !this.gridMeta ||
      this.gridMeta.width !== nextGridMeta.width ||
      this.gridMeta.height !== nextGridMeta.height;

    if (isResized || !this.displayCells) {
      this.gridMeta = nextGridMeta;
      this.previousServerCells = nextTargetCells.slice();
      this.targetServerCells = nextTargetCells;
      this.displayCells = nextTargetCells.slice();
      this.renderCells = nextTargetCells.slice();
      this.interpolationElapsedMs = InfluenceRenderer.INTERPOLATION_DURATION_MS;
      this.latestRevision = influenceGrid.revision;
      this.rebuildSupplyLineRenderStates();
      this.rebuildFarmCitySupplyLineRenderStates();
      return;
    }

    this.interpolateDisplayGrid(0);
    this.previousServerCells = this.displayCells.slice();
    this.targetServerCells = nextTargetCells;
    this.gridMeta = nextGridMeta;
    this.interpolationElapsedMs = 0;
    this.latestRevision = influenceGrid.revision;
    this.rebuildSupplyLineRenderStates();
    this.rebuildFarmCitySupplyLineRenderStates();
  }

  public setSupplyLines(supplyLines: Iterable<SupplyLineSnapshot>): void {
    const normalized: SupplyLineSnapshot[] = [];
    for (const supplyLine of supplyLines) {
      if (
        !supplyLine ||
        typeof supplyLine.unitId !== 'string' ||
        supplyLine.unitId.length === 0
      ) {
        continue;
      }

      const team = supplyLine.team === 'RED' ? 'RED' : 'BLUE';
      const path = Array.isArray(supplyLine.path)
        ? supplyLine.path
            .map((cell) => {
              if (
                !cell ||
                !Number.isFinite(cell.col) ||
                !Number.isFinite(cell.row)
              ) {
                return null;
              }
              return {
                col: Math.round(cell.col),
                row: Math.round(cell.row),
              };
            })
            .filter((cell): cell is SupplyLinePathCellSnapshot => cell !== null)
        : [];

      normalized.push({
        unitId: supplyLine.unitId,
        team,
        connected: supplyLine.connected === true,
        sourceCol: Number.isFinite(supplyLine.sourceCol)
          ? Math.round(supplyLine.sourceCol)
          : -1,
        sourceRow: Number.isFinite(supplyLine.sourceRow)
          ? Math.round(supplyLine.sourceRow)
          : -1,
        severIndex: Number.isFinite(supplyLine.severIndex)
          ? Math.round(supplyLine.severIndex)
          : -1,
        path,
      });
    }

    this.supplyLines = normalized;
    this.rebuildSupplyLineRenderStates();
  }

  public setFarmCitySupplyLines(
    supplyLines: Iterable<FarmCitySupplyLineSnapshot>,
  ): void {
    const normalized: FarmCitySupplyLineSnapshot[] = [];
    for (const supplyLine of supplyLines) {
      if (
        !supplyLine ||
        typeof supplyLine.linkId !== 'string' ||
        supplyLine.linkId.length === 0
      ) {
        continue;
      }

      const team = supplyLine.team === 'RED' ? 'RED' : 'BLUE';
      const path = Array.isArray(supplyLine.path)
        ? supplyLine.path
            .map((cell) => {
              if (
                !cell ||
                !Number.isFinite(cell.col) ||
                !Number.isFinite(cell.row)
              ) {
                return null;
              }
              return {
                col: Math.round(cell.col),
                row: Math.round(cell.row),
              };
            })
            .filter((cell): cell is SupplyLinePathCellSnapshot => cell !== null)
        : [];

      normalized.push({
        linkId: supplyLine.linkId,
        farmZoneId:
          typeof supplyLine.farmZoneId === 'string' ? supplyLine.farmZoneId : '',
        cityZoneId:
          typeof supplyLine.cityZoneId === 'string' ? supplyLine.cityZoneId : '',
        team,
        connected: supplyLine.connected === true,
        severIndex: Number.isFinite(supplyLine.severIndex)
          ? Math.round(supplyLine.severIndex)
          : -1,
        path,
      });
    }

    this.farmCitySupplyLines = normalized;
    this.rebuildFarmCitySupplyLineRenderStates();
  }

  public setDebugFocusPoint(
    point: { x: number; y: number } | null,
    scoreOverride: number | null = null,
  ): void {
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      this.debugFocusPoint = null;
      this.debugFocusScoreOverride = null;
      return;
    }

    this.debugFocusPoint = new Phaser.Math.Vector2(point.x, point.y);
    this.debugFocusScoreOverride = Number.isFinite(scoreOverride)
      ? scoreOverride
      : null;
  }

  public setLineStyle(style: InfluenceLineStyle): void {
    if (Number.isFinite(style.lineThickness) && style.lineThickness > 0) {
      this.lineThickness = style.lineThickness;
    }
    if (Number.isFinite(style.lineAlpha)) {
      this.lineAlpha = Phaser.Math.Clamp(style.lineAlpha, 0, 1);
    }
  }

  public setVisibleTeam(team: PlayerTeam | null): void {
    this.visibleTeam = team;
  }

  public setFarmCitySupplyTripDurationSeconds(durationSeconds: number): void {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }
    this.farmCitySupplyTripDurationSeconds = Math.max(0.25, durationSeconds);
  }

  public render(timeMs: number, deltaMs: number): void {
    this.frontLineGraphics.clear();
    this.farmCitySupplyGraphics.clear();
    this.supplyWaveGraphics.clear();
    this.debugGraphics.clear();
    if (
      !this.gridMeta ||
      !this.displayCells ||
      !this.previousServerCells ||
      !this.targetServerCells
    ) {
      this.hideDebugTexts();
      return;
    }

    this.interpolateDisplayGrid(deltaMs);
    const contourCells = this.buildContourCells();
    if (!contourCells) {
      this.hideDebugTexts();
      return;
    }

    const contourPaths = this.extractContourPaths(contourCells);
    if (contourPaths.length > 0) {
      this.frontLineGraphics.lineStyle(
        this.lineThickness,
        GAMEPLAY_CONFIG.influence.lineColor,
        this.lineAlpha,
      );

      for (const path of contourPaths) {
        if (path.length < 2) {
          continue;
        }

        const smoothedPath = this.smoothPath(path);
        if (smoothedPath.length < 2) {
          continue;
        }

        this.frontLineGraphics.beginPath();
        this.frontLineGraphics.moveTo(smoothedPath[0].x, smoothedPath[0].y);
        for (let i = 1; i < smoothedPath.length; i += 1) {
          this.frontLineGraphics.lineTo(smoothedPath[i].x, smoothedPath[i].y);
        }
        this.frontLineGraphics.strokePath();
      }
    }

    this.renderDebugOverlay(this.targetServerCells);
    this.renderFarmCitySupplyLines(timeMs);
    this.renderSupplyWave(timeMs, deltaMs);
  }

  public destroy(): void {
    this.frontLineGraphics.destroy();
    this.farmCitySupplyGraphics.destroy();
    this.supplyWaveGraphics.destroy();
    this.debugGraphics.destroy();
    for (const text of this.debugCellValueTexts) {
      text.destroy();
    }
    this.gridMeta = null;
    this.previousServerCells = null;
    this.targetServerCells = null;
    this.displayCells = null;
    this.renderCells = null;
    this.staticInfluenceSources = [];
    this.supplyLines = [];
    this.supplyLineRenderStates = [];
    this.farmCitySupplyLines = [];
    this.farmCitySupplyLineRenderStates = [];
    this.debugFocusPoint = null;
    this.debugFocusScoreOverride = null;
  }

  private rebuildSupplyLineRenderStates(): void {
    if (!this.gridMeta || this.supplyLines.length === 0) {
      this.supplyLineRenderStates = [];
      return;
    }

    const cellWidth = this.gridMeta.cellWidth;
    const cellHeight = this.gridMeta.cellHeight;
    const nextRenderStates: SupplyLineRenderState[] = [];

    for (const supplyLine of this.supplyLines) {
      if (supplyLine.path.length === 0) {
        continue;
      }

      const cells: SupplyLineRenderCell[] = supplyLine.path.map((pathCell) => ({
        x: (pathCell.col + 0.5) * cellWidth,
        y: (pathCell.row + 0.5) * cellHeight,
      }));

      let endIndex = cells.length - 1;
      if (!supplyLine.connected) {
        if (supplyLine.severIndex < 0) {
          continue;
        }
        endIndex = Math.min(supplyLine.severIndex, cells.length - 1);
      }
      if (endIndex < 0) {
        continue;
      }

      nextRenderStates.push({
        team: supplyLine.team,
        connected: supplyLine.connected,
        endIndex,
        cells,
      });
    }

    this.supplyLineRenderStates = nextRenderStates;
  }

  private rebuildFarmCitySupplyLineRenderStates(): void {
    if (!this.gridMeta || this.farmCitySupplyLines.length === 0) {
      this.farmCitySupplyLineRenderStates = [];
      return;
    }

    const cellWidth = this.gridMeta.cellWidth;
    const cellHeight = this.gridMeta.cellHeight;
    const nextRenderStates: FarmCitySupplyLineRenderState[] = [];

    for (const supplyLine of this.farmCitySupplyLines) {
      if (supplyLine.path.length === 0) {
        continue;
      }

      const cells: SupplyLineRenderCell[] = supplyLine.path.map((pathCell) => ({
        x: (pathCell.col + 0.5) * cellWidth,
        y: (pathCell.row + 0.5) * cellHeight,
      }));
      let endIndex = cells.length - 1;
      let severCell: SupplyLineRenderCell | null = null;
      if (!supplyLine.connected) {
        if (supplyLine.severIndex < 0) {
          continue;
        }
        const severIndex = Math.min(supplyLine.severIndex, cells.length - 1);
        severCell = cells[severIndex] ?? null;
        // Stop one cell before the severed point so broken links are visibly cut.
        endIndex = severIndex - 1;
      }
      if (endIndex < 0 && !severCell) {
        continue;
      }

      nextRenderStates.push({
        linkId: supplyLine.linkId,
        team: supplyLine.team,
        connected: supplyLine.connected,
        endIndex,
        severCell,
        cells,
      });
    }

    this.farmCitySupplyLineRenderStates = nextRenderStates;
  }

  private renderFarmCitySupplyLines(timeMs: number): void {
    if (this.farmCitySupplyLineRenderStates.length === 0) {
      return;
    }

    const tripDurationMs = this.farmCitySupplyTripDurationSeconds * 1000;
    const cycleDurationMs = tripDurationMs * 2;

    for (const supplyLine of this.farmCitySupplyLineRenderStates) {
      this.farmCitySupplyGraphics.lineStyle(
        InfluenceRenderer.FARM_CITY_SUPPLY_LINE_WIDTH,
        InfluenceRenderer.FARM_CITY_SUPPLY_COLOR,
        supplyLine.connected
          ? InfluenceRenderer.FARM_CITY_SUPPLY_CONNECTED_ALPHA
          : InfluenceRenderer.FARM_CITY_SUPPLY_DISCONNECTED_ALPHA,
      );
      if (supplyLine.endIndex >= 1) {
        this.farmCitySupplyGraphics.beginPath();
        this.farmCitySupplyGraphics.moveTo(
          supplyLine.cells[0].x,
          supplyLine.cells[0].y,
        );
        for (let index = 1; index <= supplyLine.endIndex; index += 1) {
          this.farmCitySupplyGraphics.lineTo(
            supplyLine.cells[index].x,
            supplyLine.cells[index].y,
          );
        }
        this.farmCitySupplyGraphics.strokePath();
      }
      if (!supplyLine.connected && supplyLine.severCell) {
        const severCell = supplyLine.severCell;
        this.farmCitySupplyGraphics.fillStyle(
          InfluenceRenderer.FARM_CITY_SUPPLY_COLOR,
          0.75,
        );
        this.farmCitySupplyGraphics.fillCircle(severCell.x, severCell.y, 3);
        this.farmCitySupplyGraphics.lineStyle(
          2,
          InfluenceRenderer.FARM_CITY_SUPPLY_SEVER_COLOR,
          0.95,
        );
        this.farmCitySupplyGraphics.lineBetween(
          severCell.x - 4,
          severCell.y - 4,
          severCell.x + 4,
          severCell.y + 4,
        );
        this.farmCitySupplyGraphics.lineBetween(
          severCell.x - 4,
          severCell.y + 4,
          severCell.x + 4,
          severCell.y - 4,
        );
      }

      if (
        !supplyLine.connected ||
        supplyLine.endIndex < 1 ||
        cycleDurationMs <= 0
      ) {
        continue;
      }

      const phaseOffset = this.getStablePhaseOffset(supplyLine.linkId);
      const rawCyclePhase = ((timeMs / cycleDurationMs) + phaseOffset) % 1;
      const forwardPhase =
        rawCyclePhase < 0.5 ? rawCyclePhase * 2 : (1 - rawCyclePhase) * 2;
      const segmentPosition = forwardPhase * supplyLine.endIndex;
      const segmentIndex = Math.floor(segmentPosition);
      const interpolationT = segmentPosition - segmentIndex;
      const startCell = supplyLine.cells[segmentIndex];
      const endCell = supplyLine.cells[Math.min(segmentIndex + 1, supplyLine.endIndex)];
      if (!startCell || !endCell) {
        continue;
      }
      const dotX = Phaser.Math.Linear(startCell.x, endCell.x, interpolationT);
      const dotY = Phaser.Math.Linear(startCell.y, endCell.y, interpolationT);
      this.farmCitySupplyGraphics.fillStyle(
        InfluenceRenderer.FARM_CITY_SUPPLY_DOT_COLOR,
        InfluenceRenderer.FARM_CITY_SUPPLY_DOT_ALPHA,
      );
      this.farmCitySupplyGraphics.fillCircle(
        dotX,
        dotY,
        InfluenceRenderer.FARM_CITY_SUPPLY_DOT_RADIUS,
      );
    }
  }

  private getStablePhaseOffset(seed: string): number {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0xffffffff;
  }

  private renderSupplyWave(timeMs: number, deltaMs: number): void {
    if (this.supplyLineRenderStates.length === 0) {
      return;
    }

    const cameraView = this.scene.cameras.main.worldView;
    const minX = cameraView.x - InfluenceRenderer.SUPPLY_WAVE_OFFSCREEN_PADDING;
    const minY = cameraView.y - InfluenceRenderer.SUPPLY_WAVE_OFFSCREEN_PADDING;
    const maxX =
      cameraView.right + InfluenceRenderer.SUPPLY_WAVE_OFFSCREEN_PADDING;
    const maxY =
      cameraView.bottom + InfluenceRenderer.SUPPLY_WAVE_OFFSCREEN_PADDING;
    const sigma = InfluenceRenderer.SUPPLY_WAVE_SIGMA_CELLS;
    const inverseTwoSigmaSquared = 1 / (2 * sigma * sigma);
    const waveTimeMs = timeMs + deltaMs;
    const waveTravel =
      waveTimeMs * InfluenceRenderer.SUPPLY_WAVE_SPEED_CELLS_PER_MS;

    for (const supplyLine of this.supplyLineRenderStates) {
      const cycleLength = supplyLine.endIndex + 1;
      if (cycleLength <= 0) {
        continue;
      }

      const waveHeadIndex = waveTravel % cycleLength;
      const teamColor =
        supplyLine.team === 'BLUE'
          ? InfluenceRenderer.SUPPLY_WAVE_BLUE_COLOR
          : InfluenceRenderer.SUPPLY_WAVE_RED_COLOR;

      for (let i = 0; i <= supplyLine.endIndex; i += 1) {
        const cell = supplyLine.cells[i];
        if (cell.x < minX || cell.x > maxX || cell.y < minY || cell.y > maxY) {
          continue;
        }

        const waveDistance = i - waveHeadIndex;
        const waveIntensity = Math.exp(
          -(waveDistance * waveDistance) * inverseTwoSigmaSquared,
        );
        const alpha = Phaser.Math.Clamp(
          InfluenceRenderer.SUPPLY_WAVE_BASE_ALPHA +
            waveIntensity * InfluenceRenderer.SUPPLY_WAVE_PEAK_ALPHA,
          0,
          1,
        );
        const radius =
          InfluenceRenderer.SUPPLY_WAVE_RADIUS + waveIntensity * 1.6;

        this.supplyWaveGraphics.fillStyle(teamColor, alpha);
        this.supplyWaveGraphics.fillCircle(cell.x, cell.y, radius);
      }

      if (!supplyLine.connected) {
        const severCell = supplyLine.cells[supplyLine.endIndex];
        if (
          severCell &&
          severCell.x >= minX &&
          severCell.x <= maxX &&
          severCell.y >= minY &&
          severCell.y <= maxY
        ) {
          const severPulse = (Math.sin(waveTimeMs * 0.01) + 1) * 0.5;
          this.supplyWaveGraphics.fillStyle(
            InfluenceRenderer.SUPPLY_SEVER_COLOR,
            0.35 + severPulse * 0.45,
          );
          this.supplyWaveGraphics.fillCircle(
            severCell.x,
            severCell.y,
            InfluenceRenderer.SUPPLY_WAVE_RADIUS + 2 + severPulse * 1.5,
          );
        }
      }
    }
  }

  private renderDebugOverlay(rawServerCells: Float32Array): void {
    if (!InfluenceRenderer.DEBUG_OVERLAY_ENABLED || !this.gridMeta) {
      this.hideDebugTexts();
      return;
    }

    const width = this.gridMeta.width;
    const height = this.gridMeta.height;
    const cellWidth = this.gridMeta.cellWidth;
    const cellHeight = this.gridMeta.cellHeight;

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const index = row * width + col;
        const score = rawServerCells[index] ?? 0;
        if (!this.shouldRenderDotForScore(score)) {
          continue;
        }
        const color = this.getDebugColor(score);
        const alpha = Phaser.Math.Clamp(
          Math.abs(score) / InfluenceRenderer.DEBUG_ALPHA_SCORE_RANGE,
          0.25,
          0.95,
        );
        const centerX = (col + 0.5) * cellWidth;
        const centerY = (row + 0.5) * cellHeight;

        this.debugGraphics.fillStyle(color, alpha);
        this.debugGraphics.fillCircle(
          centerX,
          centerY,
          InfluenceRenderer.DEBUG_DOT_RADIUS,
        );
      }
    }

    // Keep influence dots, but hide per-unit numeric debug labels to avoid
    // overlapping combat stat text on selected units.
    this.hideDebugTexts();
  }

  private renderFocusCellValues(rawServerCells: Float32Array): void {
    if (!this.gridMeta || !this.debugFocusPoint) {
      this.hideDebugTexts();
      return;
    }

    const hasScoreOverride = this.debugFocusScoreOverride !== null;
    const sampledScore =
      this.debugFocusScoreOverride ??
      this.sampleInfluenceAtCell(rawServerCells, this.debugFocusPoint);
    const color = hasScoreOverride
      ? InfluenceRenderer.DEBUG_NEUTRAL_COLOR
      : this.getDebugColor(sampledScore);
    const primaryText = this.debugCellValueTexts[0];
    primaryText.setText(
      hasScoreOverride ? sampledScore.toFixed(1) : sampledScore.toFixed(2),
    );
    primaryText.setColor(this.toCssColor(color));
    primaryText.setPosition(
      this.debugFocusPoint.x + InfluenceRenderer.DEBUG_TEXT_OFFSET_X,
      this.debugFocusPoint.y + InfluenceRenderer.DEBUG_TEXT_OFFSET_Y,
    );
    primaryText.setVisible(true);

    for (let i = 1; i < this.debugCellValueTexts.length; i += 1) {
      this.debugCellValueTexts[i].setVisible(false);
    }
  }

  private sampleInfluenceAtCell(
    cells: Float32Array,
    point: Phaser.Math.Vector2,
  ): number {
    if (!this.gridMeta) {
      return 0;
    }

    const col = Phaser.Math.Clamp(
      Math.round(point.x / this.gridMeta.cellWidth - 0.5),
      0,
      this.gridMeta.width - 1,
    );
    const row = Phaser.Math.Clamp(
      Math.round(point.y / this.gridMeta.cellHeight - 0.5),
      0,
      this.gridMeta.height - 1,
    );
    return this.getInfluenceValue(cells, col, row);
  }

  private getDebugColor(score: number): number {
    if (score > InfluenceRenderer.EPSILON) {
      return InfluenceRenderer.DEBUG_POSITIVE_COLOR;
    }
    if (score < -InfluenceRenderer.EPSILON) {
      return InfluenceRenderer.DEBUG_NEGATIVE_COLOR;
    }
    return InfluenceRenderer.DEBUG_NEUTRAL_COLOR;
  }

  private hideDebugTexts(): void {
    for (const text of this.debugCellValueTexts) {
      text.setVisible(false);
    }
  }

  private toCssColor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private shouldRenderDotForScore(score: number): boolean {
    if (this.visibleTeam === null) {
      return true;
    }
    if (Math.abs(score) <= InfluenceRenderer.EPSILON) {
      return false;
    }
    if (this.visibleTeam === 'BLUE') {
      return score > 0;
    }
    return score < 0;
  }

  private interpolateDisplayGrid(deltaMs: number): void {
    if (!this.previousServerCells || !this.targetServerCells || !this.displayCells) {
      return;
    }

    this.interpolationElapsedMs = Math.min(
      this.interpolationElapsedMs + Math.max(0, deltaMs),
      InfluenceRenderer.INTERPOLATION_DURATION_MS,
    );

    const interpolationT =
      InfluenceRenderer.INTERPOLATION_DURATION_MS <= 0
        ? 1
        : Phaser.Math.Clamp(
            this.interpolationElapsedMs / InfluenceRenderer.INTERPOLATION_DURATION_MS,
            0,
            1,
          );

    for (let i = 0; i < this.displayCells.length; i += 1) {
      this.displayCells[i] = Phaser.Math.Linear(
        this.previousServerCells[i],
        this.targetServerCells[i],
        interpolationT,
      );
    }
  }

  private buildContourCells(): Float32Array | null {
    if (!this.gridMeta || !this.displayCells) {
      return null;
    }

    if (this.staticInfluenceSources.length === 0) {
      return this.displayCells;
    }

    if (!this.renderCells || this.renderCells.length !== this.displayCells.length) {
      this.renderCells = new Float32Array(this.displayCells.length);
    }
    this.renderCells.set(this.displayCells);

    const width = this.gridMeta.width;
    const height = this.gridMeta.height;
    const cellWidth = this.gridMeta.cellWidth;
    const cellHeight = this.gridMeta.cellHeight;

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const index = row * width + col;
        const worldX = (col + 0.5) * cellWidth;
        const worldY = (row + 0.5) * cellHeight;

        let score = 0;
        for (const source of this.staticInfluenceSources) {
          const distance = Math.hypot(worldX - source.x, worldY - source.y);
          score += (source.power / (distance * distance + 1)) * source.teamSign;
        }

        this.renderCells[index] += score;
      }
    }

    return this.renderCells;
  }

  private extractContourPaths(cells: Float32Array): Phaser.Math.Vector2[][] {
    if (!this.gridMeta) {
      return [];
    }

    const width = this.gridMeta.width;
    const height = this.gridMeta.height;
    const pointByKey = new Map<string, Phaser.Math.Vector2>();
    const segments: ContourSegment[] = [];
    const segmentKeySet = new Set<string>();

    for (let row = 0; row < height - 1; row += 1) {
      for (let col = 0; col < width - 1; col += 1) {
        const topLeftValue = this.getInfluenceValue(cells, col, row);
        const topRightValue = this.getInfluenceValue(cells, col + 1, row);
        const bottomRightValue = this.getInfluenceValue(cells, col + 1, row + 1);
        const bottomLeftValue = this.getInfluenceValue(cells, col, row + 1);

        const caseIndex =
          Number(topLeftValue > 0) |
          (Number(topRightValue > 0) << 1) |
          (Number(bottomRightValue > 0) << 2) |
          (Number(bottomLeftValue > 0) << 3);

        if (caseIndex === 0 || caseIndex === 15) {
          continue;
        }

        const topLeftPoint = this.getGridPoint(col, row);
        const topRightPoint = this.getGridPoint(col + 1, row);
        const bottomRightPoint = this.getGridPoint(col + 1, row + 1);
        const bottomLeftPoint = this.getGridPoint(col, row + 1);

        const edgePoints = [
          this.interpolatePoint(topLeftPoint, topRightPoint, topLeftValue, topRightValue),
          this.interpolatePoint(
            topRightPoint,
            bottomRightPoint,
            topRightValue,
            bottomRightValue,
          ),
          this.interpolatePoint(
            bottomLeftPoint,
            bottomRightPoint,
            bottomLeftValue,
            bottomRightValue,
          ),
          this.interpolatePoint(
            topLeftPoint,
            bottomLeftPoint,
            topLeftValue,
            bottomLeftValue,
          ),
        ];

        for (const edgePoint of edgePoints) {
          pointByKey.set(this.pointKey(edgePoint), edgePoint);
        }

        const centerValue =
          (topLeftValue + topRightValue + bottomRightValue + bottomLeftValue) * 0.25;
        const edgePairs = this.getEdgePairs(caseIndex, centerValue);

        for (const [aEdge, bEdge] of edgePairs) {
          const aPoint = edgePoints[aEdge];
          const bPoint = edgePoints[bEdge];
          const aKey = this.pointKey(aPoint);
          const bKey = this.pointKey(bPoint);
          if (aKey === bKey) {
            continue;
          }

          const segmentKey = `${aKey}|${bKey}`;
          const inverseSegmentKey = `${bKey}|${aKey}`;
          if (segmentKeySet.has(segmentKey) || segmentKeySet.has(inverseSegmentKey)) {
            continue;
          }

          segmentKeySet.add(segmentKey);
          segments.push({ aKey, bKey });
        }
      }
    }

    if (segments.length === 0) {
      return [];
    }

    return this.stitchSegmentsIntoPaths(segments, pointByKey);
  }

  private getEdgePairs(caseIndex: number, centerValue: number): Array<[number, number]> {
    switch (caseIndex) {
      case 1:
        return [[3, 0]];
      case 2:
        return [[0, 1]];
      case 3:
        return [[3, 1]];
      case 4:
        return [[1, 2]];
      case 5:
        return centerValue > 0 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
      case 6:
        return [[0, 2]];
      case 7:
        return [[3, 2]];
      case 8:
        return [[2, 3]];
      case 9:
        return [[0, 2]];
      case 10:
        return centerValue > 0 ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];
      case 11:
        return [[1, 2]];
      case 12:
        return [[1, 3]];
      case 13:
        return [[0, 1]];
      case 14:
        return [[0, 3]];
      default:
        return [];
    }
  }

  private stitchSegmentsIntoPaths(
    segments: ContourSegment[],
    pointByKey: Map<string, Phaser.Math.Vector2>,
  ): Phaser.Math.Vector2[][] {
    const adjacency = new Map<string, number[]>();
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const aConnections = adjacency.get(segment.aKey);
      if (aConnections) {
        aConnections.push(i);
      } else {
        adjacency.set(segment.aKey, [i]);
      }

      const bConnections = adjacency.get(segment.bKey);
      if (bConnections) {
        bConnections.push(i);
      } else {
        adjacency.set(segment.bKey, [i]);
      }
    }

    const usedSegments = new Array<boolean>(segments.length).fill(false);
    const paths: Phaser.Math.Vector2[][] = [];
    const danglingNodeKeys = Array.from(adjacency.entries())
      .filter(([, segmentIndices]) => segmentIndices.length === 1)
      .map(([key]) => key);

    for (const startKey of danglingNodeKeys) {
      const tracedPath = this.tracePath(startKey, segments, usedSegments, adjacency, pointByKey);
      if (tracedPath.length >= 2) {
        paths.push(tracedPath);
      }
    }

    for (let i = 0; i < segments.length; i += 1) {
      if (usedSegments[i]) {
        continue;
      }

      const tracedPath = this.tracePath(
        segments[i].aKey,
        segments,
        usedSegments,
        adjacency,
        pointByKey,
      );
      if (tracedPath.length >= 2) {
        paths.push(tracedPath);
      }
    }

    return paths;
  }

  private tracePath(
    startKey: string,
    segments: ContourSegment[],
    usedSegments: boolean[],
    adjacency: Map<string, number[]>,
    pointByKey: Map<string, Phaser.Math.Vector2>,
  ): Phaser.Math.Vector2[] {
    const startPoint = pointByKey.get(startKey);
    if (!startPoint) {
      return [];
    }

    const path: Phaser.Math.Vector2[] = [startPoint.clone()];
    let currentKey = startKey;

    while (true) {
      const connectedSegments = adjacency.get(currentKey);
      if (!connectedSegments || connectedSegments.length === 0) {
        break;
      }

      let nextSegmentIndex = -1;
      for (const segmentIndex of connectedSegments) {
        if (!usedSegments[segmentIndex]) {
          nextSegmentIndex = segmentIndex;
          break;
        }
      }
      if (nextSegmentIndex < 0) {
        break;
      }

      usedSegments[nextSegmentIndex] = true;
      const nextSegment = segments[nextSegmentIndex];
      const nextKey =
        nextSegment.aKey === currentKey ? nextSegment.bKey : nextSegment.aKey;
      const nextPoint = pointByKey.get(nextKey);
      if (!nextPoint) {
        break;
      }

      path.push(nextPoint.clone());
      currentKey = nextKey;
      if (currentKey === startKey) {
        break;
      }
    }

    return path;
  }

  private smoothPath(path: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    if (path.length < 3) {
      return path;
    }

    const dedupedPath: Phaser.Math.Vector2[] = [path[0]];
    for (let i = 1; i < path.length; i += 1) {
      const previous = dedupedPath[dedupedPath.length - 1];
      const next = path[i];
      if (
        Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y) <
        InfluenceRenderer.EPSILON
      ) {
        continue;
      }
      dedupedPath.push(next);
    }
    if (dedupedPath.length < 3) {
      return dedupedPath;
    }

    const spline = new Phaser.Curves.Spline(dedupedPath);
    const interpolationPointCount = Math.max(
      dedupedPath.length * GAMEPLAY_CONFIG.influence.splineDensityMultiplier,
      dedupedPath.length,
    );
    return spline.getPoints(interpolationPointCount);
  }

  private getGridPoint(col: number, row: number): Phaser.Math.Vector2 {
    if (!this.gridMeta) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return new Phaser.Math.Vector2(
      (col + 0.5) * this.gridMeta.cellWidth,
      (row + 0.5) * this.gridMeta.cellHeight,
    );
  }

  private interpolatePoint(
    a: Phaser.Math.Vector2,
    b: Phaser.Math.Vector2,
    aValue: number,
    bValue: number,
  ): Phaser.Math.Vector2 {
    const denominator = aValue - bValue;
    const t =
      Math.abs(denominator) < InfluenceRenderer.EPSILON
        ? 0.5
        : Phaser.Math.Clamp(aValue / denominator, 0, 1);

    return new Phaser.Math.Vector2(
      Phaser.Math.Linear(a.x, b.x, t),
      Phaser.Math.Linear(a.y, b.y, t),
    );
  }

  private getInfluenceValue(
    cells: Float32Array,
    col: number,
    row: number,
  ): number {
    if (!this.gridMeta) {
      return 0;
    }

    return cells[row * this.gridMeta.width + col] ?? 0;
  }

  private pointKey(point: Phaser.Math.Vector2): string {
    return `${Math.round(point.x * InfluenceRenderer.KEY_PRECISION)}:${Math.round(
      point.y * InfluenceRenderer.KEY_PRECISION,
    )}`;
  }
}
