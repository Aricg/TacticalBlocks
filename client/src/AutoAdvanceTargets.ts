import type { GridCoordinate } from './UnitCommandPlanner';
import { Team } from './Team';

type AutoAdvanceCityOwners = Readonly<Record<Team, Team>>;

type BuildAutoAdvanceTargetCityCellsParams = {
  friendlyTeam: Team;
  cityOwnerByHomeTeam: AutoAdvanceCityOwners;
  homeCityGridByTeam: Readonly<Record<Team, GridCoordinate>>;
  neutralCityOwners: ReadonlyArray<Team | 'NEUTRAL'>;
  neutralCityGridCoordinates: ReadonlyArray<GridCoordinate>;
};

export function buildAutoAdvanceTargetCityCells({
  friendlyTeam,
  cityOwnerByHomeTeam,
  homeCityGridByTeam,
  neutralCityOwners,
  neutralCityGridCoordinates,
}: BuildAutoAdvanceTargetCityCellsParams): GridCoordinate[] {
  const uniqueByKey = new Map<string, GridCoordinate>();
  const homeTeams: Team[] = [Team.RED, Team.BLUE];
  for (const homeTeam of homeTeams) {
    const owner = cityOwnerByHomeTeam[homeTeam];
    if (owner === friendlyTeam) {
      continue;
    }
    const cell = homeCityGridByTeam[homeTeam];
    uniqueByKey.set(`${cell.col}:${cell.row}`, cell);
  }

  for (let index = 0; index < neutralCityGridCoordinates.length; index += 1) {
    const owner = neutralCityOwners[index];
    if (owner === friendlyTeam) {
      continue;
    }
    const cell = neutralCityGridCoordinates[index];
    uniqueByKey.set(`${cell.col}:${cell.row}`, { col: cell.col, row: cell.row });
  }

  return Array.from(uniqueByKey.values());
}
