import type { Unit } from "../../schema/Unit.js";
import type { UnitMovementState } from "../../rooms/BattleRoomTypes.js";
import {
  getUnitDamageMultiplier,
  normalizeUnitType,
} from "../../../../shared/src/unitTypes.js";

type Engagements = Map<string, Set<string>>;

function addEngagement(engagements: Engagements, aId: string, bId: string): void {
  const aSet = engagements.get(aId);
  if (aSet) {
    aSet.add(bId);
  } else {
    engagements.set(aId, new Set([bId]));
  }

  const bSet = engagements.get(bId);
  if (bSet) {
    bSet.add(aId);
  } else {
    engagements.set(bId, new Set([aId]));
  }
}

function removeUnitFromEngagementMap(
  engagements: Engagements,
  unitId: string,
): void {
  engagements.delete(unitId);
  for (const peers of engagements.values()) {
    peers.delete(unitId);
  }
}

function applyPendingDamage(
  pendingDamageByUnitId: Map<string, number>,
  engagements: Engagements,
  unitsById: Map<string, Unit>,
  movementStateByUnitId: Map<string, UnitMovementState>,
): void {
  if (pendingDamageByUnitId.size === 0) {
    return;
  }

  const deadUnitIds: string[] = [];
  for (const [unitId, damage] of pendingDamageByUnitId) {
    const unit = unitsById.get(unitId);
    if (!unit || unit.health <= 0) {
      continue;
    }

    unit.health = Math.max(0, unit.health - damage);
    if (unit.health <= 0) {
      deadUnitIds.push(unitId);
    }
  }

  for (const unitId of deadUnitIds) {
    unitsById.delete(unitId);
    movementStateByUnitId.delete(unitId);
    removeUnitFromEngagementMap(engagements, unitId);
  }
}

export interface UpdateUnitInteractionsParams {
  deltaSeconds: number;
  unitsById: Map<string, Unit>;
  movementStateByUnitId: Map<string, UnitMovementState>;
  gridContactDistance: number;
  unitForwardOffset: number;
  attackFacingAngleTolerance: number;
  ensureFiniteUnitState: (unit: Unit) => void;
  updateUnitMoraleScores: (units: Unit[]) => void;
  wasUnitEngagedLastTick: (unit: Unit) => boolean;
  shouldPauseCombatForUnit: (unit: Unit) => boolean;
  getMoraleAdvantageNormalized: (unit: Unit) => number;
  getUnitContactDps: (influenceAdvantage: number) => number;
  getUnitHealthMitigationMultiplier: (influenceAdvantage: number) => number;
  wrapAngle: (angle: number) => number;
  setUnitAttacking: (unit: Unit, isAttacking: boolean) => void;
}

function canUnitAttackTarget(args: {
  unit: Unit;
  target: Unit;
  unitForwardOffset: number;
  attackFacingAngleTolerance: number;
  wrapAngle: (angle: number) => number;
}): boolean {
  const desiredFacingRotation =
    Math.atan2(args.target.y - args.unit.y, args.target.x - args.unit.x) -
    args.unitForwardOffset;
  const headingError = args.wrapAngle(desiredFacingRotation - args.unit.rotation);
  return Math.abs(headingError) <= args.attackFacingAngleTolerance;
}

export function updateUnitInteractions({
  deltaSeconds,
  unitsById,
  movementStateByUnitId,
  gridContactDistance,
  unitForwardOffset,
  attackFacingAngleTolerance,
  ensureFiniteUnitState,
  updateUnitMoraleScores,
  wasUnitEngagedLastTick,
  shouldPauseCombatForUnit,
  getMoraleAdvantageNormalized,
  getUnitContactDps,
  getUnitHealthMitigationMultiplier,
  wrapAngle,
  setUnitAttacking,
}: UpdateUnitInteractionsParams): Engagements {
  const engagements: Engagements = new Map<string, Set<string>>();
  for (const unit of unitsById.values()) {
    if (unit.health > 0) {
      setUnitAttacking(unit, false);
    }
  }
  if (deltaSeconds <= 0) {
    return engagements;
  }

  const units = Array.from(unitsById.values()).filter((unit) => unit.health > 0);
  const pendingDamageByUnitId = new Map<string, number>();
  updateUnitMoraleScores(units);

  for (let i = 0; i < units.length; i += 1) {
    const a = units[i];
    ensureFiniteUnitState(a);

    for (let j = i + 1; j < units.length; j += 1) {
      const b = units[j];
      ensureFiniteUnitState(b);

      if (a.team === b.team) {
        continue;
      }

      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance > gridContactDistance) {
        continue;
      }

      addEngagement(engagements, a.unitId, b.unitId);
      const isEngagementStartingNow =
        !wasUnitEngagedLastTick(a) || !wasUnitEngagedLastTick(b);
      const aCombatPaused =
        isEngagementStartingNow && shouldPauseCombatForUnit(a);
      const bCombatPaused =
        isEngagementStartingNow && shouldPauseCombatForUnit(b);

      const aCanAttack = canUnitAttackTarget({
        unit: a,
        target: b,
        unitForwardOffset,
        attackFacingAngleTolerance,
        wrapAngle,
      }) && !aCombatPaused;
      const bCanAttack = canUnitAttackTarget({
        unit: b,
        target: a,
        unitForwardOffset,
        attackFacingAngleTolerance,
        wrapAngle,
      }) && !bCombatPaused;
      if (!aCanAttack && !bCanAttack) {
        continue;
      }

      if (aCanAttack) {
        setUnitAttacking(a, true);
      }
      if (bCanAttack) {
        setUnitAttacking(b, true);
      }

      const aMoraleAdvantage = getMoraleAdvantageNormalized(a);
      const bMoraleAdvantage = getMoraleAdvantageNormalized(b);
      const aContactDps =
        getUnitContactDps(aMoraleAdvantage) *
        getUnitDamageMultiplier(normalizeUnitType(a.unitType));
      const bContactDps =
        getUnitContactDps(bMoraleAdvantage) *
        getUnitDamageMultiplier(normalizeUnitType(b.unitType));
      const aHealthMitigation =
        getUnitHealthMitigationMultiplier(aMoraleAdvantage);
      const bHealthMitigation =
        getUnitHealthMitigationMultiplier(bMoraleAdvantage);

      const incomingDamageToA =
        bCanAttack
          ? (bContactDps * deltaSeconds) / Math.max(1, aHealthMitigation)
          : 0;
      const incomingDamageToB =
        aCanAttack
          ? (aContactDps * deltaSeconds) / Math.max(1, bHealthMitigation)
          : 0;

      if (incomingDamageToA > 0) {
        pendingDamageByUnitId.set(
          a.unitId,
          (pendingDamageByUnitId.get(a.unitId) ?? 0) + incomingDamageToA,
        );
      }
      if (incomingDamageToB > 0) {
        pendingDamageByUnitId.set(
          b.unitId,
          (pendingDamageByUnitId.get(b.unitId) ?? 0) + incomingDamageToB,
        );
      }
    }
  }

  applyPendingDamage(
    pendingDamageByUnitId,
    engagements,
    unitsById,
    movementStateByUnitId,
  );
  return engagements;
}

export interface UpdateCombatRotationParams {
  deltaSeconds: number;
  engagements: Engagements;
  unitsById: Map<string, Unit>;
  unitForwardOffset: number;
  unitTurnSpeed: number;
  wrapAngle: (angle: number) => number;
}

export function updateCombatRotation({
  deltaSeconds,
  engagements,
  unitsById,
  unitForwardOffset,
  unitTurnSpeed,
  wrapAngle,
}: UpdateCombatRotationParams): void {
  if (deltaSeconds <= 0) {
    return;
  }

  for (const [unitId, engagedUnitIds] of engagements) {
    if (engagedUnitIds.size === 0) {
      continue;
    }

    const unit = unitsById.get(unitId);
    if (!unit || unit.health <= 0) {
      continue;
    }

    const targetId = engagedUnitIds.values().next().value;
    if (typeof targetId !== "string") {
      continue;
    }

    const target = unitsById.get(targetId);
    if (!target || target.health <= 0) {
      continue;
    }

    const targetAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
    const desiredRotation = targetAngle - unitForwardOffset;
    const angleDelta = wrapAngle(desiredRotation - unit.rotation);
    const maxTurnStep = unitTurnSpeed * deltaSeconds;

    if (Math.abs(angleDelta) <= maxTurnStep) {
      unit.rotation = desiredRotation;
    } else {
      unit.rotation = wrapAngle(
        unit.rotation + Math.sign(angleDelta) * maxTurnStep,
      );
    }
  }
}
