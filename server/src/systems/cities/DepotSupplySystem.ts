import {
  advanceBouncingSupplyTrip,
  consumeDepotSupplyStock,
} from "../supply/SupplyLineSystem.js";
import type { CityOwner } from "../../rooms/BattleRoomTypes.js";

export type DepotSupplyLineState = {
  cityZoneId: string;
  owner: CityOwner;
  connected: boolean;
  oneWayTravelSeconds: number;
  depotSupplyStock: number;
};

type MutableNumberStore = {
  get: (key: string) => number | undefined;
  set: (key: string, value: number) => void;
};

function normalizeDepotSupplyStateForCityZone({
  cityZoneId,
  owner,
  depotSupplyStockByCityZoneId,
  depotSupplyPulseElapsedSecondsByCityZoneId,
  depotSupplyTripPhaseByCityZoneId,
  depotSupplyOwnerByCityZoneId,
}: {
  cityZoneId: string;
  owner: CityOwner;
  depotSupplyStockByCityZoneId: ReadonlyMap<string, number>;
  depotSupplyPulseElapsedSecondsByCityZoneId: ReadonlyMap<string, number>;
  depotSupplyTripPhaseByCityZoneId: ReadonlyMap<string, number>;
  depotSupplyOwnerByCityZoneId: Map<string, CityOwner>;
}): {
  stock: number;
  pulseElapsedSeconds: number;
  tripPhase: number;
} {
  const previousOwner = depotSupplyOwnerByCityZoneId.get(cityZoneId);
  const ownerChanged = previousOwner !== undefined && previousOwner !== owner;
  const neutralOwner = owner === "NEUTRAL";
  const stock =
    ownerChanged || neutralOwner
      ? 0
      : Math.max(0, Math.floor(depotSupplyStockByCityZoneId.get(cityZoneId) ?? 0));
  const pulseElapsedSeconds =
    ownerChanged || neutralOwner
      ? 0
      : Math.max(
          0,
          depotSupplyPulseElapsedSecondsByCityZoneId.get(cityZoneId) ?? 0,
        );
  const tripPhase =
    ownerChanged || neutralOwner
      ? 0
      : ((depotSupplyTripPhaseByCityZoneId.get(cityZoneId) ?? 0) % 2 + 2) % 2;

  depotSupplyOwnerByCityZoneId.set(cityZoneId, owner);
  return {
    stock,
    pulseElapsedSeconds,
    tripPhase,
  };
}

export function updateDepotSupplyAvailability({
  deltaSeconds,
  suppliedCityZoneIds,
  computedCitySupplyDepotLines,
  sourceIdByCityZoneId,
  citySupplyBySourceId,
  depotSupplyStockByCityZoneId,
  depotSupplyPulseElapsedSecondsByCityZoneId,
  depotSupplyTripPhaseByCityZoneId,
  depotSupplyOwnerByCityZoneId,
  depotSupplyPerDelivery,
  depotSupplyPulseIntervalSeconds,
}: {
  deltaSeconds: number;
  suppliedCityZoneIds: ReadonlySet<string>;
  computedCitySupplyDepotLines: DepotSupplyLineState[];
  sourceIdByCityZoneId: ReadonlyMap<string, string>;
  citySupplyBySourceId: MutableNumberStore;
  depotSupplyStockByCityZoneId: Map<string, number>;
  depotSupplyPulseElapsedSecondsByCityZoneId: Map<string, number>;
  depotSupplyTripPhaseByCityZoneId: Map<string, number>;
  depotSupplyOwnerByCityZoneId: Map<string, CityOwner>;
  depotSupplyPerDelivery: number;
  depotSupplyPulseIntervalSeconds: number;
}): Set<string> {
  const eligibleDepotCityZoneIds = new Set<string>();
  const activeCityZoneIds = new Set<string>();
  for (const supplyDepotLine of computedCitySupplyDepotLines) {
    const cityZoneId = supplyDepotLine.cityZoneId;
    activeCityZoneIds.add(cityZoneId);
    const normalizedState = normalizeDepotSupplyStateForCityZone({
      cityZoneId,
      owner: supplyDepotLine.owner,
      depotSupplyStockByCityZoneId,
      depotSupplyPulseElapsedSecondsByCityZoneId,
      depotSupplyTripPhaseByCityZoneId,
      depotSupplyOwnerByCityZoneId,
    });
    let stock = normalizedState.stock;
    let pulseElapsedSeconds = normalizedState.pulseElapsedSeconds;
    let tripPhase = normalizedState.tripPhase;

    const canReceiveSupplyDelivery =
      supplyDepotLine.connected && suppliedCityZoneIds.has(cityZoneId);
    if (canReceiveSupplyDelivery) {
      const tripProgress = advanceBouncingSupplyTrip({
        previousPhase: tripPhase,
        deltaSeconds,
        oneWayTravelSeconds: supplyDepotLine.oneWayTravelSeconds,
      });
      tripPhase = tripProgress.nextPhase;
      if (tripProgress.completedOutboundTrips > 0) {
        const sourceId = sourceIdByCityZoneId.get(cityZoneId);
        const citySupplyAvailable =
          sourceId !== undefined
            ? Math.max(0, Math.floor(citySupplyBySourceId.get(sourceId) ?? 0))
            : 0;
        const completedDeliveries = Math.min(
          tripProgress.completedOutboundTrips,
          citySupplyAvailable,
        );
        if (sourceId !== undefined && completedDeliveries > 0) {
          citySupplyBySourceId.set(sourceId, citySupplyAvailable - completedDeliveries);
        }
        if (completedDeliveries > 0) {
          stock += completedDeliveries * depotSupplyPerDelivery;
        }
      }
    } else {
      tripPhase = 0;
    }

    const stockConsumption = consumeDepotSupplyStock({
      currentStock: stock,
      pulseElapsedSeconds,
      deltaSeconds,
      pulseIntervalSeconds: depotSupplyPulseIntervalSeconds,
    });
    stock = stockConsumption.nextStock;
    pulseElapsedSeconds = stockConsumption.nextPulseElapsedSeconds;

    depotSupplyStockByCityZoneId.set(cityZoneId, stock);
    depotSupplyPulseElapsedSecondsByCityZoneId.set(cityZoneId, pulseElapsedSeconds);
    depotSupplyTripPhaseByCityZoneId.set(cityZoneId, tripPhase);
    supplyDepotLine.depotSupplyStock = stock;

    if (stock > 0) {
      eligibleDepotCityZoneIds.add(cityZoneId);
    }
  }

  for (const cityZoneId of Array.from(depotSupplyStockByCityZoneId.keys())) {
    if (activeCityZoneIds.has(cityZoneId)) {
      continue;
    }
    depotSupplyStockByCityZoneId.delete(cityZoneId);
    depotSupplyPulseElapsedSecondsByCityZoneId.delete(cityZoneId);
    depotSupplyTripPhaseByCityZoneId.delete(cityZoneId);
    depotSupplyOwnerByCityZoneId.delete(cityZoneId);
  }
  for (const cityZoneId of Array.from(
    depotSupplyPulseElapsedSecondsByCityZoneId.keys(),
  )) {
    if (activeCityZoneIds.has(cityZoneId)) {
      continue;
    }
    depotSupplyPulseElapsedSecondsByCityZoneId.delete(cityZoneId);
  }
  for (const cityZoneId of Array.from(depotSupplyTripPhaseByCityZoneId.keys())) {
    if (activeCityZoneIds.has(cityZoneId)) {
      continue;
    }
    depotSupplyTripPhaseByCityZoneId.delete(cityZoneId);
  }
  for (const cityZoneId of Array.from(depotSupplyOwnerByCityZoneId.keys())) {
    if (activeCityZoneIds.has(cityZoneId)) {
      continue;
    }
    depotSupplyOwnerByCityZoneId.delete(cityZoneId);
  }

  return eligibleDepotCityZoneIds;
}
