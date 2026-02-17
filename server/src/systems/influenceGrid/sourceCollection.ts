import { Unit } from "../../schema/Unit.js";
import { UnitContributionSource } from "./types.js";
import {
  getUnitInfluencePowerMultiplier,
  normalizeUnitType,
} from "../../../../shared/src/unitTypes.js";

export type Position = {
  x: number;
  y: number;
};

type CollectActiveUnitsParams = {
  units: Iterable<Unit>;
  previousUnitPositionById: ReadonlyMap<string, Position>;
  staticVelocityEpsilon: number;
  unitInfluenceMultiplier: number;
};

type CollectActiveUnitsResult = {
  activeUnits: UnitContributionSource[];
  nextPreviousUnitPositionById: Map<string, Position>;
};

export function collectActiveUnits(
  params: CollectActiveUnitsParams,
): CollectActiveUnitsResult {
  const {
    units,
    previousUnitPositionById,
    staticVelocityEpsilon,
    unitInfluenceMultiplier,
  } = params;
  const activeUnits: UnitContributionSource[] = [];
  const nextPreviousUnitPositionById = new Map<string, Position>();

  for (const unit of units) {
    if (unit.health <= 0) {
      continue;
    }

    const normalizedTeam = unit.team.toUpperCase();
    const teamSign = normalizedTeam === "BLUE" ? 1 : -1;
    const unitType = normalizeUnitType(unit.unitType);
    const power = Math.max(
      0,
      unit.health *
        unitInfluenceMultiplier *
        getUnitInfluencePowerMultiplier(unitType),
    );
    const previousPosition = previousUnitPositionById.get(unit.unitId);
    const isStatic =
      previousPosition !== undefined &&
      Math.hypot(unit.x - previousPosition.x, unit.y - previousPosition.y) <=
        staticVelocityEpsilon;

    activeUnits.push({
      unitId: unit.unitId,
      x: unit.x,
      y: unit.y,
      teamSign,
      power,
      isStatic,
    });
    nextPreviousUnitPositionById.set(unit.unitId, { x: unit.x, y: unit.y });
  }

  return {
    activeUnits,
    nextPreviousUnitPositionById,
  };
}
