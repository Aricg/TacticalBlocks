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
  waterElevationMax: number;
  mountainElevationMin: number;
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
      waterElevationMax: args.waterElevationMax,
      mountainElevationMin: args.mountainElevationMin,
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
      waterElevationMax: args.waterElevationMax,
      mountainElevationMin: args.mountainElevationMin,
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
}
