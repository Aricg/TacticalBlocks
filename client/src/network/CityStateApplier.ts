import type { NetworkCityOwnershipUpdate } from '../NetworkManager';
import type { City, CityOwner } from '../City';
import { Team } from '../Team';
import { normalizeNetworkTeam } from './UnitStateApplier';

type GridCoordinate = {
  col: number;
  row: number;
};

type SetNeutralCityOwners = (owners: CityOwner[]) => void;
type SetCityOwnerByHomeTeam = (owners: Record<Team, Team>) => void;

function normalizeCityOwner(ownerValue: string): CityOwner {
  const normalizedOwner = ownerValue.toUpperCase();
  if (normalizedOwner === Team.RED) {
    return Team.RED;
  }
  if (normalizedOwner === Team.BLUE) {
    return Team.BLUE;
  }
  return 'NEUTRAL';
}

export function applyCityOwnershipState({
  cityOwnershipUpdate,
  neutralCityGridCoordinates,
  setNeutralCityOwners,
  setCityOwnerByHomeTeam,
  cityByHomeTeam,
  neutralCities,
  refreshFogOfWar,
}: {
  cityOwnershipUpdate: NetworkCityOwnershipUpdate;
  neutralCityGridCoordinates: readonly GridCoordinate[];
  setNeutralCityOwners: SetNeutralCityOwners;
  setCityOwnerByHomeTeam: SetCityOwnerByHomeTeam;
  cityByHomeTeam: Readonly<Record<Team, City | null>>;
  neutralCities: readonly City[];
  refreshFogOfWar: () => void;
}): void {
  const redOwner = normalizeNetworkTeam(cityOwnershipUpdate.redCityOwner);
  const blueOwner = normalizeNetworkTeam(cityOwnershipUpdate.blueCityOwner);
  const neutralCityOwners = neutralCityGridCoordinates.map((_, index) =>
    normalizeCityOwner(cityOwnershipUpdate.neutralCityOwners[index] ?? 'NEUTRAL'),
  );

  setNeutralCityOwners(neutralCityOwners);
  setCityOwnerByHomeTeam({
    [Team.RED]: redOwner,
    [Team.BLUE]: blueOwner,
  });
  cityByHomeTeam[Team.RED]?.setOwner(redOwner);
  cityByHomeTeam[Team.BLUE]?.setOwner(blueOwner);
  for (let index = 0; index < neutralCities.length; index += 1) {
    neutralCities[index]?.setOwner(neutralCityOwners[index] ?? 'NEUTRAL');
  }
  refreshFogOfWar();
}
