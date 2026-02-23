import { GAMEPLAY_CONFIG } from "../../../../shared/src/gameplayConfig.js";
import type { MapBundle } from "../../../../shared/src/mapBundle.js";
import {
  loadMapBundle,
  type MapBundleLoadWarning,
} from "./MapBundleLoader.js";
import { resolveSharedDirectory } from "./resolveSharedDirectory.js";

type LoadActiveMapBundleArgs = {
  mapId: string;
  revision: number;
  roomModuleUrl: string;
  gridWidth: number;
  gridHeight: number;
  defaultCityAnchors: MapBundle["cityAnchors"];
  defaultNeutralCityAnchors: MapBundle["neutralCityAnchors"];
};

export type LoadActiveMapBundleResult = {
  bundle: MapBundle;
  warnings: MapBundleLoadWarning[];
};

type SwitchRuntimeMapArgs = Omit<LoadActiveMapBundleArgs, "revision"> & {
  currentMapRevision: number;
  incrementMapRevision: boolean;
};

export type SwitchRuntimeMapResult = LoadActiveMapBundleResult & {
  nextMapRevision: number;
  neutralCityAnchors: MapBundle["neutralCityAnchors"];
};

export class MapRuntimeService {
  applyMapIdToRuntimeTerrain(mapId: string): void {
    (
      GAMEPLAY_CONFIG.map as unknown as {
        activeMapId: string;
      }
    ).activeMapId = mapId;
  }

  loadActiveMapBundle(args: LoadActiveMapBundleArgs): LoadActiveMapBundleResult {
    const warnings: MapBundleLoadWarning[] = [];
    const bundle = loadMapBundle({
      mapId: args.mapId,
      revision: args.revision,
      sharedDir: resolveSharedDirectory(args.roomModuleUrl),
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      defaultCityAnchors: args.defaultCityAnchors,
      defaultNeutralCityAnchors: args.defaultNeutralCityAnchors,
      logWarning: (warning) => {
        warnings.push(warning);
      },
    });

    return {
      bundle,
      warnings,
    };
  }

  switchRuntimeMap(args: SwitchRuntimeMapArgs): SwitchRuntimeMapResult {
    const nextMapRevision = args.incrementMapRevision
      ? args.currentMapRevision + 1
      : args.currentMapRevision;
    this.applyMapIdToRuntimeTerrain(args.mapId);
    const loadResult = this.loadActiveMapBundle({
      mapId: args.mapId,
      roomModuleUrl: args.roomModuleUrl,
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      defaultCityAnchors: args.defaultCityAnchors,
      defaultNeutralCityAnchors: args.defaultNeutralCityAnchors,
      revision: nextMapRevision,
    });

    return {
      ...loadResult,
      nextMapRevision,
      neutralCityAnchors: loadResult.bundle.neutralCityAnchors.map((cell) => ({
        ...cell,
      })),
    };
  }

  resolveNeutralCityCells(
    activeMapBundle: MapBundle | null,
    fallbackNeutralCityAnchors: ReadonlyArray<{
      col: number;
      row: number;
    }>,
  ): MapBundle["neutralCityAnchors"] {
    const sourceAnchors =
      activeMapBundle?.neutralCityAnchors ?? fallbackNeutralCityAnchors;
    return sourceAnchors.map((cell) => ({ ...cell }));
  }

  initializeNeutralCityOwnership(
    neutralCityOwners: {
      push: (owner: "NEUTRAL") => number;
    },
    neutralCityCount: number,
  ): void {
    for (let index = 0; index < neutralCityCount; index += 1) {
      neutralCityOwners.push("NEUTRAL");
    }
  }

  resetNeutralCityOwnership(
    neutralCityOwners: {
      length: number;
      pop: () => unknown;
      push: (owner: "NEUTRAL") => number;
    },
    neutralCityCount: number,
  ): void {
    while (neutralCityOwners.length > 0) {
      neutralCityOwners.pop();
    }
    this.initializeNeutralCityOwnership(neutralCityOwners, neutralCityCount);
  }

  clearInfluenceGrid(grid: {
    cells: {
      length: number;
      [index: number]: number;
    };
    revision: number;
  }): void {
    for (let index = 0; index < grid.cells.length; index += 1) {
      grid.cells[index] = 0;
    }
    grid.revision += 1;
  }
}
