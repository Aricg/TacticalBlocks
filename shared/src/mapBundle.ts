import type { MapGenerationMethod, PlayerTeam } from "./networkContracts.js";

export type MapBundleCoordinate = {
  col: number;
  row: number;
};

export type MapBundleSource = "runtime-sidecar" | "static-fallback";

export type MapBundle = {
  mapId: string;
  revision: number;
  method: MapGenerationMethod | "unknown";
  seed: string | null;
  gridWidth: number;
  gridHeight: number;
  terrainCodeGrid: string | null;
  hillGradeGrid: Int8Array | null;
  cityAnchors: Record<PlayerTeam, MapBundleCoordinate>;
  neutralCityAnchors: MapBundleCoordinate[];
  blockedSpawnCellIndexSet: ReadonlySet<number>;
  impassableCellIndexSet: ReadonlySet<number>;
  source: MapBundleSource;
};
