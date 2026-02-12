import type {
  CityOwner,
  GridCoordinate,
  PlayerTeam,
  Vector2,
} from "../../rooms/BattleRoomTypes.js";

type StaticCityInfluenceSource = {
  x: number;
  y: number;
  power: number;
  team: PlayerTeam;
};

export interface BuildCityInfluenceSourcesParams {
  redCityPosition: Vector2;
  blueCityPosition: Vector2;
  redCityOwner: PlayerTeam;
  blueCityOwner: PlayerTeam;
  neutralCityCount: number;
  getNeutralCityCell: (index: number) => GridCoordinate | null;
  getNeutralCityOwner: (index: number) => CityOwner;
  gridToWorldCenter: (cell: GridCoordinate) => Vector2;
  cityPower: number;
}

export function buildCityInfluenceSources({
  redCityPosition,
  blueCityPosition,
  redCityOwner,
  blueCityOwner,
  neutralCityCount,
  getNeutralCityCell,
  getNeutralCityOwner,
  gridToWorldCenter,
  cityPower,
}: BuildCityInfluenceSourcesParams): StaticCityInfluenceSource[] {
  const staticSources: StaticCityInfluenceSource[] = [
    {
      x: redCityPosition.x,
      y: redCityPosition.y,
      power: cityPower,
      team: redCityOwner,
    },
    {
      x: blueCityPosition.x,
      y: blueCityPosition.y,
      power: cityPower,
      team: blueCityOwner,
    },
  ];

  for (let index = 0; index < neutralCityCount; index += 1) {
    const cityCell = getNeutralCityCell(index);
    const owner = getNeutralCityOwner(index);
    if (!cityCell || owner === "NEUTRAL") {
      continue;
    }

    const cityPosition = gridToWorldCenter(cityCell);
    staticSources.push({
      x: cityPosition.x,
      y: cityPosition.y,
      power: cityPower,
      team: owner,
    });
  }

  return staticSources;
}
