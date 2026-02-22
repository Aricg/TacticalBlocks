import type { GridCoordinate, Vector2 } from "../../rooms/BattleRoomTypes.js";
import {
  compactGridCoordinates,
  traceGridLine,
} from "./gridPathing.js";

export type WorldToGridCoordinate = (x: number, y: number) => GridCoordinate;
export type IsCellImpassable = (cell: GridCoordinate) => boolean;

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
  isCellImpassable: IsCellImpassable,
): GridCoordinate[] {
  const snappedTargetCells = compactGridCoordinates(
    normalizedPath.map((waypoint) =>
      worldToGridCoordinate(waypoint.x, waypoint.y),
    ),
  );

  let pathCursor = { col: startCell.col, row: startCell.row };
  const route: GridCoordinate[] = [];
  let blockedByTerrain = false;

  for (const targetCell of snappedTargetCells) {
    const segment = traceGridLine(pathCursor, targetCell);
    for (let i = 1; i < segment.length; i += 1) {
      const nextCell = segment[i];
      if (isCellImpassable(nextCell)) {
        blockedByTerrain = true;
        break;
      }
      route.push(nextCell);
    }
    if (blockedByTerrain) {
      break;
    }
    pathCursor = targetCell;
  }

  return route;
}
