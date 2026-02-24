import assert from "node:assert/strict";
import {
  buildTerrainAwareRoute,
  type GetStepCost,
} from "./MovementCommandRouter.js";
import type { GridCoordinate } from "../../rooms/BattleRoomTypes.js";

function toCellKey(cell: GridCoordinate): string {
  return `${cell.col}:${cell.row}`;
}

function toWaypoint(cell: GridCoordinate): { x: number; y: number } {
  return { x: cell.col, y: cell.row };
}

function buildRoute(args: {
  width: number;
  height: number;
  start: GridCoordinate;
  targets: GridCoordinate[];
  isCellImpassable: (cell: GridCoordinate) => boolean;
  getStepCost: GetStepCost;
}): GridCoordinate[] {
  return buildTerrainAwareRoute(
    args.start,
    args.targets.map((cell) => toWaypoint(cell)),
    (x, y) => ({ col: Math.round(x), row: Math.round(y) }),
    args.getStepCost,
    (cell) =>
      cell.col < 0 ||
      cell.row < 0 ||
      cell.col >= args.width ||
      cell.row >= args.height ||
      args.isCellImpassable(cell),
    {
      maxExpansionsPerSegment: 3000,
      heuristicMinStepCost: 0.5,
    },
  );
}

function runPrefersRoadCorridorTest(): void {
  const mountainCells = new Set<string>(["2:1"]);
  const roadCells = new Set<string>(["2:2"]);
  const route = buildRoute({
    width: 5,
    height: 3,
    start: { col: 0, row: 1 },
    targets: [{ col: 4, row: 1 }],
    isCellImpassable: (cell) => mountainCells.has(toCellKey(cell)),
    getStepCost: (_fromCell, toCell) =>
      roadCells.has(toCellKey(toCell)) ? 0.15 : 1,
  });

  assert.equal(route[route.length - 1]?.col, 4);
  assert.equal(route[route.length - 1]?.row, 1);
  assert.ok(route.some((cell) => cell.col === 2 && cell.row === 2));
  assert.ok(!route.some((cell) => cell.col === 2 && cell.row === 0));
}

function runAvoidsWaterWhenDryDetourReasonableTest(): void {
  const waterCells = new Set<string>(["1:1", "2:1", "3:1"]);
  const route = buildRoute({
    width: 5,
    height: 3,
    start: { col: 0, row: 1 },
    targets: [{ col: 4, row: 1 }],
    isCellImpassable: () => false,
    getStepCost: (_fromCell, toCell) =>
      waterCells.has(toCellKey(toCell)) ? 5 : 1,
  });

  assert.equal(route[route.length - 1]?.col, 4);
  assert.equal(route[route.length - 1]?.row, 1);
  assert.ok(!route.some((cell) => waterCells.has(toCellKey(cell))));
}

function runNavigatesMountainBarrierWithGapTest(): void {
  const mountainCells = new Set<string>([
    "3:0",
    "3:1",
    "3:2",
    "3:3",
  ]);
  const route = buildRoute({
    width: 7,
    height: 5,
    start: { col: 1, row: 2 },
    targets: [{ col: 5, row: 2 }],
    isCellImpassable: (cell) => mountainCells.has(toCellKey(cell)),
    getStepCost: () => 1,
  });

  assert.equal(route[route.length - 1]?.col, 5);
  assert.equal(route[route.length - 1]?.row, 2);
  assert.ok(route.some((cell) => cell.col === 3 && cell.row === 4));
  assert.ok(!route.some((cell) => mountainCells.has(toCellKey(cell))));
}

function runReturnsPartialPathWhenBlockedTest(): void {
  const mountainCells = new Set<string>([
    "3:0",
    "3:1",
    "3:2",
    "3:3",
    "3:4",
  ]);
  const route = buildRoute({
    width: 7,
    height: 5,
    start: { col: 1, row: 2 },
    targets: [{ col: 5, row: 2 }],
    isCellImpassable: (cell) => mountainCells.has(toCellKey(cell)),
    getStepCost: () => 1,
  });

  assert.ok(route.length > 0);
  const finalCell = route[route.length - 1];
  assert.equal(finalCell.col, 2);
  assert.equal(finalCell.row, 2);
}

function runSkipsStationaryLeadingWaypointTest(): void {
  const route = buildRoute({
    width: 8,
    height: 5,
    start: { col: 2, row: 2 },
    targets: [
      { col: 2, row: 2 },
      { col: 6, row: 2 },
    ],
    isCellImpassable: () => false,
    getStepCost: () => 1,
  });

  assert.ok(route.length > 0);
  const finalCell = route[route.length - 1];
  assert.equal(finalCell.col, 6);
  assert.equal(finalCell.row, 2);
}

runPrefersRoadCorridorTest();
runAvoidsWaterWhenDryDetourReasonableTest();
runNavigatesMountainBarrierWithGapTest();
runReturnsPartialPathWhenBlockedTest();
runSkipsStationaryLeadingWaypointTest();
