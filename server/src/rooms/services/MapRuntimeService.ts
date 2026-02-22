import { GAMEPLAY_CONFIG } from "../../../../shared/src/gameplayConfig.js";
import type { MapBundle } from "../../../../shared/src/mapBundle.js";
import { loadMapBundle } from "./MapBundleLoader.js";
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
  logWarning?: (message: string, error?: unknown) => void;
};

export class MapRuntimeService {
  applyMapIdToRuntimeTerrain(mapId: string): void {
    (
      GAMEPLAY_CONFIG.map as unknown as {
        activeMapId: string;
      }
    ).activeMapId = mapId;
  }

  loadActiveMapBundle(args: LoadActiveMapBundleArgs): MapBundle {
    return loadMapBundle({
      mapId: args.mapId,
      revision: args.revision,
      sharedDir: resolveSharedDirectory(args.roomModuleUrl),
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
      defaultCityAnchors: args.defaultCityAnchors,
      defaultNeutralCityAnchors: args.defaultNeutralCityAnchors,
      waterElevationMax: args.waterElevationMax,
      mountainElevationMin: args.mountainElevationMin,
      logWarning: args.logWarning,
    });
  }
}
