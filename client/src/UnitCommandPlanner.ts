import Phaser from 'phaser';
import type { NetworkUnitPathCommand } from './NetworkManager';

export type GridCoordinate = {
  col: number;
  row: number;
};

export type UnitCommandPlannerGridMetrics = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
};

type UnitPosition = {
  x: number;
  y: number;
};

type ClipPathTargetsByTerrainArgs = {
  start: GridCoordinate;
  targets: GridCoordinate[];
  isGridCellImpassable: (col: number, row: number) => boolean;
};

type SetPlannedPathArgs = {
  plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]>;
  unitId: string;
  path: Phaser.Math.Vector2[];
};

type AdvancePlannedPathsArgs = {
  plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]>;
  unitsById: ReadonlyMap<string, UnitPosition>;
  waypointReachedDistance: number;
};

export function buildMovementCommandMode(
  shiftHeld: boolean,
): NetworkUnitPathCommand['movementCommandMode'] {
  if (!shiftHeld) {
    return undefined;
  }

  return {
    speedMultiplier: 0.5,
    rotateToFace: false,
  };
}

export function getFormationCenter(
  units: Iterable<UnitPosition>,
): Phaser.Math.Vector2 | null {
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const unit of units) {
    totalX += unit.x;
    totalY += unit.y;
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  return new Phaser.Math.Vector2(totalX / count, totalY / count);
}

export function worldToGridCoordinate(
  x: number,
  y: number,
  grid: UnitCommandPlannerGridMetrics,
): GridCoordinate {
  const colBasis = x / grid.cellWidth - 0.5;
  const rowBasis = y / grid.cellHeight - 0.5;
  return {
    col: Phaser.Math.Clamp(Math.round(colBasis), 0, grid.width - 1),
    row: Phaser.Math.Clamp(Math.round(rowBasis), 0, grid.height - 1),
  };
}

export function gridToWorldCenter(
  cell: GridCoordinate,
  grid: UnitCommandPlannerGridMetrics,
): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(
    (cell.col + 0.5) * grid.cellWidth,
    (cell.row + 0.5) * grid.cellHeight,
  );
}

export function snapAndCompactPath(
  path: Phaser.Math.Vector2[],
  grid: UnitCommandPlannerGridMetrics,
): Phaser.Math.Vector2[] {
  if (path.length === 0) {
    return [];
  }

  const snappedPath = path.map((point) =>
    gridToWorldCenter(worldToGridCoordinate(point.x, point.y, grid), grid),
  );
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

export function buildGridRouteFromWorldPath(
  path: Phaser.Math.Vector2[],
  grid: UnitCommandPlannerGridMetrics,
): GridCoordinate[] {
  if (path.length === 0) {
    return [];
  }

  const snappedTargets = compactGridCoordinates(
    path.map((point) => worldToGridCoordinate(point.x, point.y, grid)),
  );
  if (snappedTargets.length <= 1) {
    return snappedTargets;
  }

  const route: GridCoordinate[] = [snappedTargets[0]];
  for (let i = 1; i < snappedTargets.length; i += 1) {
    const segment = traceGridLine(route[route.length - 1], snappedTargets[i]);
    for (let segmentIndex = 1; segmentIndex < segment.length; segmentIndex += 1) {
      const step = segment[segmentIndex];
      if (
        route.length >= 2 &&
        step.col === route[route.length - 2].col &&
        step.row === route[route.length - 2].row
      ) {
        // Dragging back over the just-laid segment should erase tail steps.
        route.pop();
        continue;
      }

      const current = route[route.length - 1];
      if (step.col === current.col && step.row === current.row) {
        continue;
      }

      route.push(step);
    }
  }

  return compactGridCoordinates(route);
}

export function clipPathTargetsByTerrain({
  start,
  targets,
  isGridCellImpassable,
}: ClipPathTargetsByTerrainArgs): GridCoordinate[] {
  const clippedTargets: GridCoordinate[] = [];
  let cursor = { col: start.col, row: start.row };

  for (const target of targets) {
    const segment = traceGridLine(cursor, target);
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

  return compactGridCoordinates(clippedTargets);
}

export function setPlannedPath({
  plannedPathsByUnitId,
  unitId,
  path,
}: SetPlannedPathArgs): void {
  if (path.length === 0) {
    plannedPathsByUnitId.delete(unitId);
    return;
  }

  plannedPathsByUnitId.set(
    unitId,
    path.map((point) => point.clone()),
  );
}

export function advancePlannedPaths({
  plannedPathsByUnitId,
  unitsById,
  waypointReachedDistance,
}: AdvancePlannedPathsArgs): void {
  const reachedDistanceSq = waypointReachedDistance * waypointReachedDistance;

  for (const [unitId, path] of plannedPathsByUnitId) {
    const unit = unitsById.get(unitId);
    if (!unit || path.length === 0) {
      plannedPathsByUnitId.delete(unitId);
      continue;
    }

    while (path.length > 0) {
      const nextWaypoint = path[0];
      const dx = nextWaypoint.x - unit.x;
      const dy = nextWaypoint.y - unit.y;
      if (dx * dx + dy * dy > reachedDistanceSq) {
        // If server authority skipped an intermediate waypoint, resync by
        // fast-forwarding to the nearest reached waypoint in the remaining path.
        let reachedLaterWaypointIndex = -1;
        for (let i = 1; i < path.length; i += 1) {
          const candidate = path[i];
          const cdx = candidate.x - unit.x;
          const cdy = candidate.y - unit.y;
          if (cdx * cdx + cdy * cdy <= reachedDistanceSq) {
            reachedLaterWaypointIndex = i;
            break;
          }
        }
        if (reachedLaterWaypointIndex >= 1) {
          path.splice(0, reachedLaterWaypointIndex + 1);
          continue;
        }
        break;
      }
      path.shift();
    }

    if (path.length === 0) {
      plannedPathsByUnitId.delete(unitId);
    }
  }
}

function traceGridLine(
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

function compactGridCoordinates(path: GridCoordinate[]): GridCoordinate[] {
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
