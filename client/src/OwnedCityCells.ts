import { Team } from './Team';
import type { GridCoordinate } from './UnitCommandPlanner';

type BuildOwnedCityCellsParams = {
  ownerTeam: Team;
  cityOwnerByHomeTeam: Readonly<Record<Team, Team>>;
  homeCityGridByTeam: Readonly<Record<Team, GridCoordinate>>;
  neutralCityOwners: ReadonlyArray<Team | 'NEUTRAL'>;
  neutralCityGridCoordinates: ReadonlyArray<GridCoordinate>;
};

export function buildOwnedCityCells({
  ownerTeam,
  cityOwnerByHomeTeam,
  homeCityGridByTeam,
  neutralCityOwners,
  neutralCityGridCoordinates,
}: BuildOwnedCityCellsParams): GridCoordinate[] {
  const positions: GridCoordinate[] = [];
  const homeTeams: Team[] = [Team.RED, Team.BLUE];
  for (const homeTeam of homeTeams) {
    if (cityOwnerByHomeTeam[homeTeam] !== ownerTeam) {
      continue;
    }
    positions.push(homeCityGridByTeam[homeTeam]);
  }
  for (let index = 0; index < neutralCityGridCoordinates.length; index += 1) {
    if (neutralCityOwners[index] !== ownerTeam) {
      continue;
    }
    const cell = neutralCityGridCoordinates[index];
    positions.push({ col: cell.col, row: cell.row });
  }
  return positions;
}
