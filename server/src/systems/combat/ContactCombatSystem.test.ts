import assert from "node:assert/strict";
import type { UnitMovementState } from "../../rooms/BattleRoomTypes.js";
import type { Unit } from "../../schema/Unit.js";
import { updateUnitInteractions } from "./ContactCombatSystem.js";

const CONTACT_DAMAGE_PER_SECOND = 10;
const UNIT_FORWARD_OFFSET = -Math.PI / 2;
const ATTACK_FACING_TOLERANCE = (Math.PI / 180) * 3;

function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped <= -Math.PI) {
    wrapped += Math.PI * 2;
  }
  while (wrapped > Math.PI) {
    wrapped -= Math.PI * 2;
  }
  return wrapped;
}

function createUnit(args: {
  unitId: string;
  team: "red" | "blue";
  x: number;
  y: number;
  rotation: number;
}): Unit {
  return {
    unitId: args.unitId,
    team: args.team,
    x: args.x,
    y: args.y,
    rotation: args.rotation,
    health: 100,
    moraleScore: 0,
    unitType: "LINE",
  } as Unit;
}

function createMovementStateByUnitId(unitIds: string[]): Map<string, UnitMovementState> {
  const movementStateByUnitId = new Map<string, UnitMovementState>();
  for (const unitId of unitIds) {
    movementStateByUnitId.set(unitId, {
      destinationCell: null,
      queuedCells: [],
      targetRotation: null,
      movementCommandMode: {
        speedMultiplier: 1,
        rotateToFace: true,
      },
      movementBudget: 0,
      isPaused: false,
      terrainTransitionPauseRemainingSeconds: 0,
    });
  }
  return movementStateByUnitId;
}

function runInteractionTick(args: {
  aRotation: number;
  bRotation: number;
  pausedUnitIds?: ReadonlySet<string>;
}): {
  a: Unit;
  b: Unit;
  engagements: Map<string, Set<string>>;
  attackingByUnitId: Map<string, boolean>;
} {
  const a = createUnit({
    unitId: "a",
    team: "red",
    x: 0,
    y: 0,
    rotation: args.aRotation,
  });
  const b = createUnit({
    unitId: "b",
    team: "blue",
    x: 1,
    y: 0,
    rotation: args.bRotation,
  });

  const unitsById = new Map<string, Unit>([
    [a.unitId, a],
    [b.unitId, b],
  ]);
  const movementStateByUnitId = createMovementStateByUnitId([a.unitId, b.unitId]);
  const attackingByUnitId = new Map<string, boolean>();

  const engagements = updateUnitInteractions({
    deltaSeconds: 1,
    unitsById,
    movementStateByUnitId,
    gridContactDistance: 2,
    unitForwardOffset: UNIT_FORWARD_OFFSET,
    attackFacingAngleTolerance: ATTACK_FACING_TOLERANCE,
    ensureFiniteUnitState: () => {},
    updateUnitMoraleScores: () => {},
    wasUnitEngagedLastTick: () => false,
    shouldPauseCombatForUnit: (unit) =>
      args.pausedUnitIds?.has(unit.unitId) ?? false,
    getMoraleAdvantageNormalized: () => 0,
    getUnitContactDps: () => CONTACT_DAMAGE_PER_SECOND,
    getUnitHealthMitigationMultiplier: () => 1,
    wrapAngle,
    setUnitAttacking: (unit, isAttacking) => {
      attackingByUnitId.set(unit.unitId, isAttacking);
    },
  });

  return { a, b, engagements, attackingByUnitId };
}

function runPausedUnitCannotAttackButCanTakeDamageTest(): void {
  const { a, b, attackingByUnitId } = runInteractionTick({
    aRotation: Math.PI / 2,
    bRotation: -Math.PI / 2,
    pausedUnitIds: new Set<string>(["b"]),
  });

  assert.equal(a.health, 100);
  assert.equal(b.health, 90);
  assert.equal(attackingByUnitId.get("a"), true);
  assert.equal(attackingByUnitId.get("b"), false);
}

function runBothFacingCanDamageTest(): void {
  const { a, b, engagements, attackingByUnitId } = runInteractionTick({
    aRotation: Math.PI / 2,
    bRotation: -Math.PI / 2,
  });

  assert.equal(a.health, 90);
  assert.equal(b.health, 90);
  assert.equal(engagements.get("a")?.has("b"), true);
  assert.equal(engagements.get("b")?.has("a"), true);
  assert.equal(attackingByUnitId.get("a"), true);
  assert.equal(attackingByUnitId.get("b"), true);
}

function runOnlyFacingUnitCanDamageTest(): void {
  const { a, b, attackingByUnitId } = runInteractionTick({
    aRotation: Math.PI / 2,
    bRotation: 0,
  });

  assert.equal(a.health, 100);
  assert.equal(b.health, 90);
  assert.equal(attackingByUnitId.get("a"), true);
  assert.equal(attackingByUnitId.get("b"), false);
}

function runNotFacingUnitsCannotDamageTest(): void {
  const { a, b, engagements, attackingByUnitId } = runInteractionTick({
    aRotation: 0,
    bRotation: 0,
  });

  assert.equal(a.health, 100);
  assert.equal(b.health, 100);
  assert.equal(engagements.get("a")?.has("b"), true);
  assert.equal(engagements.get("b")?.has("a"), true);
  assert.equal(attackingByUnitId.get("a"), false);
  assert.equal(attackingByUnitId.get("b"), false);
}

runBothFacingCanDamageTest();
runOnlyFacingUnitCanDamageTest();
runNotFacingUnitsCannotDamageTest();
runPausedUnitCannotAttackButCanTakeDamageTest();
