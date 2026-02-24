import type { GridCoordinate, Vector2 } from "../../rooms/BattleRoomTypes.js";
import {
  compactGridCoordinates,
  findWeightedRoute,
  type StepCostResolver,
} from "./gridPathing.js";

export type WorldToGridCoordinate = (x: number, y: number) => GridCoordinate;
export type IsCellImpassable = (cell: GridCoordinate) => boolean;
export type GetStepCost = StepCostResolver;
export type BuildTerrainAwareRouteOptions = {
  maxExpansionsPerSegment?: number;
  heuristicMinStepCost?: number;
};

function isFiniteWaypoint(waypoint: unknown): waypoint is Vector2 {
  if (typeof waypoint !== "object" || waypoint === null) {
    return false;
  }

  const candidate = waypoint as { x?: unknown; y?: unknown };
  return (
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y)
  );
}

export function normalizePathWaypoints(path: unknown[]): Vector2[] | null {
  const normalizedPath: Vector2[] = [];
  for (const waypoint of path) {
    if (!isFiniteWaypoint(waypoint)) {
      return null;
    }
    normalizedPath.push({ x: waypoint.x, y: waypoint.y });
  }

  return normalizedPath;
}

export function buildTerrainAwareRoute(
  startCell: GridCoordinate,
  normalizedPath: Vector2[],
  worldToGridCoordinate: WorldToGridCoordinate,
  getStepCost: GetStepCost,
  isCellImpassable: IsCellImpassable,
  options?: BuildTerrainAwareRouteOptions,
): GridCoordinate[] {
  const snappedTargetCells = compactGridCoordinates(
    normalizedPath.map((waypoint) =>
      worldToGridCoordinate(waypoint.x, waypoint.y),
    ),
  );

  let pathCursor = { col: startCell.col, row: startCell.row };
  const route: GridCoordinate[] = [];

  for (const targetCell of snappedTargetCells) {
    const segmentResult = findWeightedRoute(
      pathCursor,
      targetCell,
      getStepCost,
      isCellImpassable,
      {
        maxExpansions: options?.maxExpansionsPerSegment,
        heuristicMinStepCost: options?.heuristicMinStepCost,
      },
    );
    const traversedCells = segmentResult.path.slice(1);
    if (traversedCells.length === 0) {
      if (segmentResult.reachedGoal) {
        pathCursor = targetCell;
        continue;
      }
      break;
    }

    route.push(...traversedCells);
    pathCursor = segmentResult.path[segmentResult.path.length - 1] ?? pathCursor;

    if (!segmentResult.reachedGoal) {
      break;
    }
  }

  return compactRouteForExecution(route);
}

function compactRouteForExecution(path: GridCoordinate[]): GridCoordinate[] {
  const dedupedPath = compactGridCoordinates(path);
  const compacted: GridCoordinate[] = [];
  for (const cell of dedupedPath) {
    if (compacted.length >= 2) {
      const previous = compacted[compacted.length - 1];
      const beforePrevious = compacted[compacted.length - 2];
      if (cell.col === beforePrevious.col && cell.row === beforePrevious.row) {
        compacted.pop();
        continue;
      }

      if (isTightZigZag(beforePrevious, previous, cell)) {
        compacted[compacted.length - 1] = cell;
        continue;
      }
    }

    compacted.push(cell);
  }

  return compacted;
}

function isTightZigZag(
  fromCell: GridCoordinate,
  pivotCell: GridCoordinate,
  toCell: GridCoordinate,
): boolean {
  if (!areNeighboringCells(fromCell, pivotCell)) {
    return false;
  }
  if (!areNeighboringCells(pivotCell, toCell)) {
    return false;
  }
  if (!areNeighboringCells(fromCell, toCell)) {
    return false;
  }

  const fromDelta = {
    col: pivotCell.col - fromCell.col,
    row: pivotCell.row - fromCell.row,
  };
  const toDelta = {
    col: toCell.col - pivotCell.col,
    row: toCell.row - pivotCell.row,
  };
  return fromDelta.col !== toDelta.col || fromDelta.row !== toDelta.row;
}

function areNeighboringCells(left: GridCoordinate, right: GridCoordinate): boolean {
  const deltaCol = Math.abs(left.col - right.col);
  const deltaRow = Math.abs(left.row - right.row);
  return deltaCol <= 1 && deltaRow <= 1 && (deltaCol !== 0 || deltaRow !== 0);
}
