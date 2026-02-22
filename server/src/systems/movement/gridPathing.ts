import type { GridCoordinate } from "../../rooms/BattleRoomTypes.js";

const gridKey = (cell: GridCoordinate): string => `${cell.col}:${cell.row}`;

export function isDestinationBlocked(
  occupiedByCellKey: Map<string, Set<string>>,
  destinationCell: GridCoordinate,
  unitId: string,
): boolean {
  const destinationSet = occupiedByCellKey.get(gridKey(destinationCell));
  if (!destinationSet) {
    return false;
  }

  return !(destinationSet.size === 1 && destinationSet.has(unitId));
}

export function traceGridLine(
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

export function compactGridCoordinates(
  path: GridCoordinate[],
): GridCoordinate[] {
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
