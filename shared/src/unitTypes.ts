export type UnitType = "LINE" | "COMMANDER";

export const DEFAULT_UNIT_TYPE: UnitType = "LINE";

export function normalizeUnitType(unitTypeValue: string | null | undefined): UnitType {
  return unitTypeValue?.toUpperCase() === "COMMANDER" ? "COMMANDER" : "LINE";
}

export function getUnitHealthMultiplier(unitType: UnitType): number {
  return unitType === "COMMANDER" ? 0.5 : 1;
}

export function getUnitDamageMultiplier(unitType: UnitType): number {
  return unitType === "COMMANDER" ? 0.5 : 1;
}

export function getUnitInfluencePowerMultiplier(unitType: UnitType): number {
  return unitType === "COMMANDER" ? 2 : 1;
}

export function getUnitHealthMax(baseUnitHealth: number, unitType: UnitType): number {
  return Math.max(0, baseUnitHealth) * getUnitHealthMultiplier(unitType);
}
