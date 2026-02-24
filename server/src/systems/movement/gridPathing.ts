import type { GridCoordinate } from "../../rooms/BattleRoomTypes.js";

const gridKey = (cell: GridCoordinate): string => `${cell.col}:${cell.row}`;
const DIAGONAL_DISTANCE = Math.SQRT2;
const DEFAULT_MAX_ROUTE_EXPANSIONS = 3500;

type WeightedPathNode = {
  cell: GridCoordinate;
  gCost: number;
  heuristicCost: number;
  fCost: number;
  parentKey: string | null;
};

export type StepCostResolver = (
  fromCell: GridCoordinate,
  toCell: GridCoordinate,
) => number;

export type FindWeightedRouteOptions = {
  maxExpansions?: number;
  heuristicMinStepCost?: number;
};

export type FindWeightedRouteResult = {
  path: GridCoordinate[];
  reachedGoal: boolean;
};

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

export function findWeightedRoute(
  start: GridCoordinate,
  goal: GridCoordinate,
  getStepCost: StepCostResolver,
  isCellImpassable: (cell: GridCoordinate) => boolean,
  options?: FindWeightedRouteOptions,
): FindWeightedRouteResult {
  if (start.col === goal.col && start.row === goal.row) {
    return {
      path: [{ col: start.col, row: start.row }],
      reachedGoal: true,
    };
  }

  if (isCellImpassable(start)) {
    return { path: [], reachedGoal: false };
  }

  const maxExpansions =
    Number.isFinite(options?.maxExpansions) && (options?.maxExpansions ?? 0) > 0
      ? Math.floor(options?.maxExpansions ?? DEFAULT_MAX_ROUTE_EXPANSIONS)
      : DEFAULT_MAX_ROUTE_EXPANSIONS;
  const heuristicMinStepCost =
    Number.isFinite(options?.heuristicMinStepCost) &&
    (options?.heuristicMinStepCost ?? 0) > 0
      ? options?.heuristicMinStepCost ?? 0
      : 0;

  const startKey = gridKey(start);
  const goalKey = gridKey(goal);
  const startHeuristic = estimateOctileDistance(
    start,
    goal,
    heuristicMinStepCost,
  );

  const nodeByKey = new Map<string, WeightedPathNode>([
    [
      startKey,
      {
        cell: { col: start.col, row: start.row },
        gCost: 0,
        heuristicCost: startHeuristic,
        fCost: startHeuristic,
        parentKey: null,
      },
    ],
  ]);
  const openSet = new Set<string>([startKey]);
  const closedSet = new Set<string>();

  let bestExploredKey = startKey;
  let bestExploredHeuristic = startHeuristic;
  let bestExploredGCost = 0;
  let expansions = 0;

  while (openSet.size > 0 && expansions < maxExpansions) {
    const currentKey = selectBestOpenNode(openSet, nodeByKey);
    if (!currentKey) {
      break;
    }

    openSet.delete(currentKey);
    if (closedSet.has(currentKey)) {
      continue;
    }

    const currentNode = nodeByKey.get(currentKey);
    if (!currentNode) {
      continue;
    }

    closedSet.add(currentKey);
    expansions += 1;

    if (
      currentNode.heuristicCost < bestExploredHeuristic ||
      (currentNode.heuristicCost === bestExploredHeuristic &&
        currentNode.gCost < bestExploredGCost)
    ) {
      bestExploredKey = currentKey;
      bestExploredHeuristic = currentNode.heuristicCost;
      bestExploredGCost = currentNode.gCost;
    }

    if (currentKey === goalKey) {
      return {
        path: reconstructPath(nodeByKey, goalKey),
        reachedGoal: true,
      };
    }

    for (const neighborCell of getNeighborCells(currentNode.cell)) {
      if (closedSet.has(gridKey(neighborCell)) || isCellImpassable(neighborCell)) {
        continue;
      }

      const stepCost = getStepCost(currentNode.cell, neighborCell);
      if (!Number.isFinite(stepCost) || stepCost <= 0) {
        continue;
      }

      const transitionCost = stepCost * getStepDistance(currentNode.cell, neighborCell);
      const tentativeGCost = currentNode.gCost + transitionCost;
      const neighborKey = gridKey(neighborCell);
      const existingNode = nodeByKey.get(neighborKey);

      if (existingNode && tentativeGCost >= existingNode.gCost) {
        continue;
      }

      const heuristicCost = estimateOctileDistance(
        neighborCell,
        goal,
        heuristicMinStepCost,
      );
      nodeByKey.set(neighborKey, {
        cell: neighborCell,
        gCost: tentativeGCost,
        heuristicCost,
        fCost: tentativeGCost + heuristicCost,
        parentKey: currentKey,
      });
      openSet.add(neighborKey);
    }
  }

  return {
    path: reconstructPath(nodeByKey, bestExploredKey),
    reachedGoal: false,
  };
}

function getStepDistance(fromCell: GridCoordinate, toCell: GridCoordinate): number {
  const deltaCol = Math.abs(toCell.col - fromCell.col);
  const deltaRow = Math.abs(toCell.row - fromCell.row);
  if (deltaCol === 1 && deltaRow === 1) {
    return DIAGONAL_DISTANCE;
  }
  return 1;
}

function getNeighborCells(cell: GridCoordinate): GridCoordinate[] {
  const neighbors: GridCoordinate[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (colOffset === 0 && rowOffset === 0) {
        continue;
      }

      neighbors.push({
        col: cell.col + colOffset,
        row: cell.row + rowOffset,
      });
    }
  }
  return neighbors;
}

function estimateOctileDistance(
  cell: GridCoordinate,
  goal: GridCoordinate,
  minStepCost: number,
): number {
  if (minStepCost <= 0) {
    return 0;
  }

  const deltaCol = Math.abs(goal.col - cell.col);
  const deltaRow = Math.abs(goal.row - cell.row);
  const diagonalSteps = Math.min(deltaCol, deltaRow);
  const straightSteps = Math.max(deltaCol, deltaRow) - diagonalSteps;
  return (diagonalSteps * DIAGONAL_DISTANCE + straightSteps) * minStepCost;
}

function selectBestOpenNode(
  openSet: Set<string>,
  nodeByKey: Map<string, WeightedPathNode>,
): string | null {
  let selectedKey: string | null = null;
  let selectedNode: WeightedPathNode | null = null;

  for (const key of openSet) {
    const node = nodeByKey.get(key);
    if (!node) {
      continue;
    }

    if (!selectedNode) {
      selectedNode = node;
      selectedKey = key;
      continue;
    }

    if (node.fCost < selectedNode.fCost) {
      selectedNode = node;
      selectedKey = key;
      continue;
    }
    if (node.fCost === selectedNode.fCost && node.heuristicCost < selectedNode.heuristicCost) {
      selectedNode = node;
      selectedKey = key;
      continue;
    }
    if (node.fCost === selectedNode.fCost && node.heuristicCost === selectedNode.heuristicCost) {
      if (node.gCost < selectedNode.gCost) {
        selectedNode = node;
        selectedKey = key;
        continue;
      }
      if (node.gCost === selectedNode.gCost && key < (selectedKey ?? key)) {
        selectedNode = node;
        selectedKey = key;
      }
    }
  }

  return selectedKey;
}

function reconstructPath(
  nodeByKey: Map<string, WeightedPathNode>,
  endKey: string,
): GridCoordinate[] {
  const reversedPath: GridCoordinate[] = [];
  let cursorKey: string | null = endKey;
  while (cursorKey) {
    const node = nodeByKey.get(cursorKey);
    if (!node) {
      break;
    }

    reversedPath.push({ col: node.cell.col, row: node.cell.row });
    cursorKey = node.parentKey;
  }

  reversedPath.reverse();
  return compactGridCoordinates(reversedPath);
}
