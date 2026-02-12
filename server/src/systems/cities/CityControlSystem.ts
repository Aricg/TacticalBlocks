import type {
  CityOwner,
  GridCoordinate,
  PlayerTeam,
} from "../../rooms/BattleRoomTypes.js";

export interface CityOwnershipUpdateParams {
  getOccupyingTeamAtCell: (targetCell: GridCoordinate) => PlayerTeam | null;
  getCityCell: (homeCity: PlayerTeam) => GridCoordinate;
  getCityOwner: (homeCity: PlayerTeam) => PlayerTeam;
  setCityOwner: (homeCity: PlayerTeam, owner: PlayerTeam) => void;
  neutralCityCount: number;
  getNeutralCityCell: (index: number) => GridCoordinate | null;
  getNeutralCityOwner: (index: number) => CityOwner;
  setNeutralCityOwner: (index: number, owner: CityOwner) => void;
}

export function updateCityOwnershipFromOccupancy({
  getOccupyingTeamAtCell,
  getCityCell,
  getCityOwner,
  setCityOwner,
  neutralCityCount,
  getNeutralCityCell,
  getNeutralCityOwner,
  setNeutralCityOwner,
}: CityOwnershipUpdateParams): boolean {
  let changed = false;
  const homeCities: PlayerTeam[] = ["RED", "BLUE"];
  for (const homeCity of homeCities) {
    const cityCell = getCityCell(homeCity);
    const occupyingTeam = getOccupyingTeamAtCell(cityCell);
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
    const cityCell = getNeutralCityCell(index);
    if (!cityCell) {
      continue;
    }

    const occupyingTeam = getOccupyingTeamAtCell(cityCell);
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
