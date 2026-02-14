import Phaser from 'phaser';
import type {
  NetworkUnitHealthUpdate,
  NetworkUnitMoraleUpdate,
  NetworkUnitPositionUpdate,
  NetworkUnitRotationUpdate,
  NetworkUnitSnapshot,
} from '../NetworkManager';
import { Team } from '../Team';
import { Unit } from '../Unit';

type MarkUnitInCombatVisual = (unitId: string) => void;

export function normalizeNetworkTeam(teamValue: string): Team {
  return teamValue.toUpperCase() === Team.RED ? Team.RED : Team.BLUE;
}

export function upsertNetworkUnitState({
  networkUnit,
  scene,
  units,
  unitsById,
  baseUnitHealth,
  lastKnownHealthByUnitId,
  moraleScoreByUnitId,
  combatVisualUntilByUnitId,
}: {
  networkUnit: NetworkUnitSnapshot;
  scene: Phaser.Scene;
  units: Unit[];
  unitsById: Map<string, Unit>;
  baseUnitHealth: number;
  lastKnownHealthByUnitId: Map<string, number>;
  moraleScoreByUnitId: Map<string, number>;
  combatVisualUntilByUnitId: Map<string, number>;
}): void {
  const existingUnit = unitsById.get(networkUnit.unitId);
  if (existingUnit) {
    existingUnit.setHealthMax(baseUnitHealth);
    existingUnit.rotation = networkUnit.rotation;
    existingUnit.setHealth(networkUnit.health);
    lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
    moraleScoreByUnitId.set(networkUnit.unitId, networkUnit.moraleScore);
    existingUnit.setPosition(networkUnit.x, networkUnit.y);
    return;
  }

  const spawnedUnit = new Unit(
    scene,
    networkUnit.x,
    networkUnit.y,
    normalizeNetworkTeam(networkUnit.team),
    networkUnit.rotation,
    networkUnit.health,
  );
  spawnedUnit.setHealthMax(baseUnitHealth);
  units.push(spawnedUnit);
  unitsById.set(networkUnit.unitId, spawnedUnit);
  lastKnownHealthByUnitId.set(networkUnit.unitId, networkUnit.health);
  moraleScoreByUnitId.set(networkUnit.unitId, networkUnit.moraleScore);
  combatVisualUntilByUnitId.delete(networkUnit.unitId);
}

export function removeNetworkUnitState({
  unitId,
  units,
  unitsById,
  plannedPathsByUnitId,
  lastKnownHealthByUnitId,
  combatVisualUntilByUnitId,
  moraleScoreByUnitId,
  selectedUnits,
}: {
  unitId: string;
  units: Unit[];
  unitsById: Map<string, Unit>;
  plannedPathsByUnitId: Map<string, Phaser.Math.Vector2[]>;
  lastKnownHealthByUnitId: Map<string, number>;
  combatVisualUntilByUnitId: Map<string, number>;
  moraleScoreByUnitId: Map<string, number>;
  selectedUnits: Set<Unit>;
}): void {
  const unit = unitsById.get(unitId);
  if (!unit) {
    return;
  }

  unitsById.delete(unitId);
  plannedPathsByUnitId.delete(unitId);
  lastKnownHealthByUnitId.delete(unitId);
  combatVisualUntilByUnitId.delete(unitId);
  moraleScoreByUnitId.delete(unitId);
  selectedUnits.delete(unit);
  const index = units.indexOf(unit);
  if (index >= 0) {
    units.splice(index, 1);
  }
  unit.destroy();
}

export function applyNetworkUnitPositionState({
  positionUpdate,
  unitsById,
}: {
  positionUpdate: NetworkUnitPositionUpdate;
  unitsById: ReadonlyMap<string, Unit>;
}): void {
  const unit = unitsById.get(positionUpdate.unitId);
  if (!unit) {
    return;
  }

  unit.setPosition(positionUpdate.x, positionUpdate.y);
}

export function applyNetworkUnitHealthState({
  healthUpdate,
  unitsById,
  lastKnownHealthByUnitId,
  markUnitInCombatVisual,
}: {
  healthUpdate: NetworkUnitHealthUpdate;
  unitsById: ReadonlyMap<string, Unit>;
  lastKnownHealthByUnitId: Map<string, number>;
  markUnitInCombatVisual: MarkUnitInCombatVisual;
}): void {
  const unit = unitsById.get(healthUpdate.unitId);
  if (!unit) {
    return;
  }

  const previousHealth =
    lastKnownHealthByUnitId.get(healthUpdate.unitId) ?? healthUpdate.health;
  if (healthUpdate.health < previousHealth - 0.0001) {
    markUnitInCombatVisual(healthUpdate.unitId);
  }
  lastKnownHealthByUnitId.set(healthUpdate.unitId, healthUpdate.health);
  unit.setHealth(healthUpdate.health);
}

export function applyNetworkUnitRotationState({
  rotationUpdate,
  unitsById,
}: {
  rotationUpdate: NetworkUnitRotationUpdate;
  unitsById: ReadonlyMap<string, Unit>;
}): void {
  const unit = unitsById.get(rotationUpdate.unitId);
  if (!unit) {
    return;
  }

  unit.rotation = rotationUpdate.rotation;
}

export function applyNetworkUnitMoraleState({
  moraleUpdate,
  unitsById,
  moraleScoreByUnitId,
}: {
  moraleUpdate: NetworkUnitMoraleUpdate;
  unitsById: ReadonlyMap<string, Unit>;
  moraleScoreByUnitId: Map<string, number>;
}): void {
  if (!unitsById.has(moraleUpdate.unitId)) {
    return;
  }

  moraleScoreByUnitId.set(moraleUpdate.unitId, moraleUpdate.moraleScore);
}
