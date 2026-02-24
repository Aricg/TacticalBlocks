import assert from 'node:assert/strict';
import {
  assignUnitsToSlotsStable,
  distributeSlotsAlongPolyline,
  type FormationLinePoint,
  type FormationLineUnit,
} from './formationLinePlanner.js';

function assertPointClose(
  point: FormationLinePoint,
  expected: FormationLinePoint,
  message: string,
): void {
  const tolerance = 1e-6;
  assert.ok(Math.abs(point.x - expected.x) <= tolerance, `${message} (x)`);
  assert.ok(Math.abs(point.y - expected.y) <= tolerance, `${message} (y)`);
}

function runSingleUnitDistributionTest(): void {
  const slots = distributeSlotsAlongPolyline(
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    1,
  );

  assert.equal(slots.length, 1);
  assertPointClose(slots[0], { x: 5, y: 0 }, 'single unit sits at midpoint');
}

function runVeryShortLineDistributionTest(): void {
  const slots = distributeSlotsAlongPolyline(
    [
      { x: 100, y: 100 },
      { x: 100.4, y: 100.2 },
    ],
    6,
  );

  assert.equal(slots.length, 6);
  for (let index = 1; index < slots.length; index += 1) {
    assert.ok(slots[index].x >= slots[index - 1].x);
    assert.ok(slots[index].y >= slots[index - 1].y);
  }
}

function runLongLineDistributionTest(): void {
  const slots = distributeSlotsAlongPolyline(
    [
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ],
    5,
  );

  assert.deepEqual(
    slots.map((slot) => slot.x),
    [0, 25, 50, 75, 100],
  );
  assert.ok(slots.every((slot) => slot.y === 10));
}

function runDiagonalLineDistributionTest(): void {
  const slots = distributeSlotsAlongPolyline(
    [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    3,
  );

  assertPointClose(slots[0], { x: 0, y: 0 }, 'diagonal slot 0');
  assertPointClose(slots[1], { x: 5, y: 5 }, 'diagonal slot 1');
  assertPointClose(slots[2], { x: 10, y: 10 }, 'diagonal slot 2');
}

function runManyUnitsStableAssignmentTest(): void {
  const slots = distributeSlotsAlongPolyline(
    [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ],
    5,
  );
  const units: FormationLineUnit[] = [
    { unitId: 'u0', x: 40, y: 0 },
    { unitId: 'u1', x: 30, y: 0 },
    { unitId: 'u2', x: 20, y: 0 },
    { unitId: 'u3', x: 10, y: 0 },
    { unitId: 'u4', x: 0, y: 0 },
  ];

  const assignments = assignUnitsToSlotsStable(units, slots);

  assert.deepEqual(
    assignments.map((assignment) => assignment.unitId),
    ['u4', 'u3', 'u2', 'u1', 'u0'],
  );
  assert.deepEqual(
    assignments.map((assignment) => assignment.slot.x),
    [0, 10, 20, 30, 40],
  );
}

runSingleUnitDistributionTest();
runVeryShortLineDistributionTest();
runLongLineDistributionTest();
runDiagonalLineDistributionTest();
runManyUnitsStableAssignmentTest();
