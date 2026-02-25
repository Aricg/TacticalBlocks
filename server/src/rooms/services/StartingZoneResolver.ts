import type { MapBundle } from "../../../../shared/src/mapBundle.js";
import type {
  CityOwner,
  GridCoordinate,
  PlayerTeam,
} from "../BattleRoomTypes.js";

type ResolveStartingZoneStateArgs = {
  cityZones: MapBundle["cityZones"];
  farmZones: MapBundle["farmZones"];
  farmToCityLinks: ReadonlyArray<{
    farmZoneId: string;
    cityZoneId: string;
  }>;
  homeCityZoneIdsByTeam: Record<PlayerTeam, string>;
  neutralCityZoneIds: readonly string[];
  configuredFriendlyCityCount: number;
};

export type ResolvedStartingZoneState = {
  neutralCityInitialOwnerByIndex: CityOwner[];
  friendlySpawnCityCellsByTeam: Record<PlayerTeam, GridCoordinate[]>;
  friendlySpawnFarmCellsByTeam: Record<PlayerTeam, GridCoordinate[]>;
};

export class StartingZoneResolver {
  resolve(args: ResolveStartingZoneStateArgs): ResolvedStartingZoneState {
    const friendlyCityZoneIdsByTeam: Record<PlayerTeam, Set<string>> = {
      RED: new Set<string>([args.homeCityZoneIdsByTeam.RED]),
      BLUE: new Set<string>([args.homeCityZoneIdsByTeam.BLUE]),
    };
    for (const cityZone of args.cityZones) {
      if (cityZone.homeTeam === "RED" || cityZone.homeTeam === "BLUE") {
        friendlyCityZoneIdsByTeam[cityZone.homeTeam].add(cityZone.cityZoneId);
        continue;
      }
      const parsedFriendlyTeam = this.parseFriendlyCityZoneTeam(cityZone.cityZoneId);
      if (parsedFriendlyTeam) {
        friendlyCityZoneIdsByTeam[parsedFriendlyTeam].add(cityZone.cityZoneId);
      }
    }

    if (args.configuredFriendlyCityCount > 0) {
      const assignedNeutralZoneIds = new Set<string>();
      for (
        let index = 0;
        index < args.configuredFriendlyCityCount && index < args.neutralCityZoneIds.length;
        index += 1
      ) {
        const zoneId = args.neutralCityZoneIds[index];
        friendlyCityZoneIdsByTeam.RED.add(zoneId);
        assignedNeutralZoneIds.add(zoneId);
      }
      for (
        let offset = 0;
        offset < args.configuredFriendlyCityCount && offset < args.neutralCityZoneIds.length;
        offset += 1
      ) {
        const zoneId =
          args.neutralCityZoneIds[args.neutralCityZoneIds.length - 1 - offset];
        if (assignedNeutralZoneIds.has(zoneId)) {
          continue;
        }
        friendlyCityZoneIdsByTeam.BLUE.add(zoneId);
        assignedNeutralZoneIds.add(zoneId);
      }
    }

    const cityZoneById = new Map<
      string,
      {
        anchor: GridCoordinate;
        cells: GridCoordinate[];
      }
    >();
    for (const cityZone of args.cityZones) {
      cityZoneById.set(cityZone.cityZoneId, {
        anchor: { col: cityZone.anchor.col, row: cityZone.anchor.row },
        cells: cityZone.cells.map((cell) => ({ col: cell.col, row: cell.row })),
      });
    }

    const cityCellGroupsByTeam: Record<PlayerTeam, GridCoordinate[][]> = {
      RED: [],
      BLUE: [],
    };
    for (const team of ["RED", "BLUE"] as const) {
      for (const cityZoneId of friendlyCityZoneIdsByTeam[team]) {
        const cityZone = cityZoneById.get(cityZoneId);
        if (!cityZone) {
          continue;
        }
        cityCellGroupsByTeam[team].push(
          this.sortZoneCellsByAnchorProximity(cityZone.cells, cityZone.anchor),
        );
      }
    }
    const friendlySpawnCityCellsByTeam: Record<PlayerTeam, GridCoordinate[]> = {
      RED: this.roundRobinCells(cityCellGroupsByTeam.RED),
      BLUE: this.roundRobinCells(cityCellGroupsByTeam.BLUE),
    };

    const farmZoneById = new Map<
      string,
      {
        anchor: GridCoordinate;
        cells: GridCoordinate[];
      }
    >();
    for (const farmZone of args.farmZones) {
      farmZoneById.set(farmZone.farmZoneId, {
        anchor: { col: farmZone.anchor.col, row: farmZone.anchor.row },
        cells: farmZone.cells.map((cell) => ({ col: cell.col, row: cell.row })),
      });
    }

    const farmCellGroupsByTeam: Record<PlayerTeam, GridCoordinate[][]> = {
      RED: [],
      BLUE: [],
    };
    const assignedFarmZoneIdsByTeam: Record<PlayerTeam, Set<string>> = {
      RED: new Set<string>(),
      BLUE: new Set<string>(),
    };
    for (const link of args.farmToCityLinks) {
      let team: PlayerTeam | null = null;
      if (friendlyCityZoneIdsByTeam.RED.has(link.cityZoneId)) {
        team = "RED";
      } else if (friendlyCityZoneIdsByTeam.BLUE.has(link.cityZoneId)) {
        team = "BLUE";
      }
      if (!team) {
        continue;
      }
      if (assignedFarmZoneIdsByTeam[team].has(link.farmZoneId)) {
        continue;
      }
      assignedFarmZoneIdsByTeam[team].add(link.farmZoneId);
      const farmZone = farmZoneById.get(link.farmZoneId);
      if (!farmZone) {
        continue;
      }
      farmCellGroupsByTeam[team].push(
        this.sortZoneCellsByAnchorProximity(farmZone.cells, farmZone.anchor),
      );
    }
    const friendlySpawnFarmCellsByTeam: Record<PlayerTeam, GridCoordinate[]> = {
      RED: this.roundRobinCells(farmCellGroupsByTeam.RED),
      BLUE: this.roundRobinCells(farmCellGroupsByTeam.BLUE),
    };

    const neutralCityInitialOwnerByIndex: CityOwner[] = [];
    for (const zoneId of args.neutralCityZoneIds) {
      if (friendlyCityZoneIdsByTeam.RED.has(zoneId)) {
        neutralCityInitialOwnerByIndex.push("RED");
        continue;
      }
      if (friendlyCityZoneIdsByTeam.BLUE.has(zoneId)) {
        neutralCityInitialOwnerByIndex.push("BLUE");
        continue;
      }
      neutralCityInitialOwnerByIndex.push("NEUTRAL");
    }

    return {
      neutralCityInitialOwnerByIndex,
      friendlySpawnCityCellsByTeam,
      friendlySpawnFarmCellsByTeam,
    };
  }

  private parseFriendlyCityZoneTeam(cityZoneId: string): PlayerTeam | null {
    const normalizedZoneId = cityZoneId.trim().toLowerCase();
    if (
      normalizedZoneId === "home-red" ||
      normalizedZoneId.startsWith("friendly-red-")
    ) {
      return "RED";
    }
    if (
      normalizedZoneId === "home-blue" ||
      normalizedZoneId.startsWith("friendly-blue-")
    ) {
      return "BLUE";
    }
    return null;
  }

  private sortZoneCellsByAnchorProximity(
    cells: readonly GridCoordinate[],
    anchor: GridCoordinate,
  ): GridCoordinate[] {
    return cells
      .map((cell) => ({ col: cell.col, row: cell.row }))
      .sort((left, right) => {
        const leftDistance =
          Math.abs(left.col - anchor.col) + Math.abs(left.row - anchor.row);
        const rightDistance =
          Math.abs(right.col - anchor.col) + Math.abs(right.row - anchor.row);
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }
        if (left.row !== right.row) {
          return left.row - right.row;
        }
        return left.col - right.col;
      });
  }

  private roundRobinCells(
    groups: readonly (readonly GridCoordinate[])[],
  ): GridCoordinate[] {
    const cells: GridCoordinate[] = [];
    const seenCellKeys = new Set<string>();
    let index = 0;
    let foundAtIndex = true;
    while (foundAtIndex) {
      foundAtIndex = false;
      for (const group of groups) {
        const cell = group[index];
        if (!cell) {
          continue;
        }
        foundAtIndex = true;
        const cellKey = `${cell.col},${cell.row}`;
        if (seenCellKeys.has(cellKey)) {
          continue;
        }
        seenCellKeys.add(cellKey);
        cells.push({ col: cell.col, row: cell.row });
      }
      index += 1;
    }
    return cells;
  }
}
