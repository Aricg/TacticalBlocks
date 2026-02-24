import type {
  CityOwner,
  GridCoordinate,
  PlayerTeam,
} from "../../rooms/BattleRoomTypes.js";

export interface CityOwnershipUpdateParams {
  getUncontestedOccupyingTeamAtZone: (
    zoneCells: readonly GridCoordinate[],
  ) => PlayerTeam | null;
  getCityZoneCells: (homeCity: PlayerTeam) => readonly GridCoordinate[];
  getCityOwner: (homeCity: PlayerTeam) => PlayerTeam;
  setCityOwner: (homeCity: PlayerTeam, owner: PlayerTeam) => void;
  neutralCityCount: number;
  getNeutralCityZoneCells: (index: number) => readonly GridCoordinate[] | null;
  getNeutralCityOwner: (index: number) => CityOwner;
  setNeutralCityOwner: (index: number, owner: CityOwner) => void;
}

export function updateCityOwnershipFromOccupancy({
  getUncontestedOccupyingTeamAtZone,
  getCityZoneCells,
  getCityOwner,
  setCityOwner,
  neutralCityCount,
  getNeutralCityZoneCells,
  getNeutralCityOwner,
  setNeutralCityOwner,
}: CityOwnershipUpdateParams): boolean {
  let changed = false;
  const homeCities: PlayerTeam[] = ["RED", "BLUE"];
  for (const homeCity of homeCities) {
    const cityZoneCells = getCityZoneCells(homeCity);
    const occupyingTeam = getUncontestedOccupyingTeamAtZone(cityZoneCells);
    if (!occupyingTeam) {
      continue;
    }

    const currentOwner = getCityOwner(homeCity);
    if (occupyingTeam === currentOwner) {
      continue;
    }

    setCityOwner(homeCity, occupyingTeam);
    changed = true;
  }

  for (let index = 0; index < neutralCityCount; index += 1) {
    const cityZoneCells = getNeutralCityZoneCells(index);
    if (!cityZoneCells || cityZoneCells.length === 0) {
      continue;
    }

    const occupyingTeam = getUncontestedOccupyingTeamAtZone(cityZoneCells);
    if (!occupyingTeam) {
      continue;
    }

    const currentOwner = getNeutralCityOwner(index);
    if (occupyingTeam === currentOwner) {
      continue;
    }

    setNeutralCityOwner(index, occupyingTeam);
    changed = true;
  }

  return changed;
}
