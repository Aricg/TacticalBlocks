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

export class InfluenceRenderer {
  private readonly frontLineGraphics: Phaser.GameObjects.Graphics;
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

  private static readonly EPSILON = 0.0001;
  private static readonly KEY_PRECISION = 1000;
  private static readonly DEBUG_OVERLAY_ENABLED = true;
  private static readonly DEBUG_POSITIVE_COLOR = 0x1e8bff;
  private static readonly DEBUG_NEGATIVE_COLOR = 0xff3030;
  private static readonly DEBUG_NEUTRAL_COLOR = 0xd9d9d9;
  private static readonly DEBUG_DOT_RADIUS = 3;
  private static readonly DEBUG_TEXT_OFFSET_X = 6;
  private static readonly DEBUG_TEXT_OFFSET_Y = 6;
  private static readonly INTERPOLATION_DURATION_MS =
    GAMEPLAY_CONFIG.network.positionSyncIntervalMs *
    GAMEPLAY_CONFIG.influence.updateIntervalFrames;

  constructor(scene: Phaser.Scene) {
    this.frontLineGraphics = scene.add.graphics();
    this.frontLineGraphics.setDepth(910);
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
      return;
    }

    this.interpolateDisplayGrid(0);
    this.previousServerCells = this.displayCells.slice();
    this.targetServerCells = nextTargetCells;
    this.gridMeta = nextGridMeta;
    this.interpolationElapsedMs = 0;
    this.latestRevision = influenceGrid.revision;
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

  public render(deltaMs: number): void {
    this.frontLineGraphics.clear();
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
  }

  public destroy(): void {
    this.frontLineGraphics.destroy();
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
    this.debugFocusPoint = null;
    this.debugFocusScoreOverride = null;
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
        const color = this.getDebugColor(score);
        const alpha = Phaser.Math.Clamp(Math.abs(score) / 8, 0.25, 0.95);
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

    this.renderFocusCellValues(rawServerCells);
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
      hasScoreOverride ? `${Math.round(sampledScore)}` : sampledScore.toFixed(2),
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
