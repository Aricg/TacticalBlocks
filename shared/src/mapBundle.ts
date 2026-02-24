import type { MapGenerationMethod, PlayerTeam } from "./networkContracts.js";

export type MapBundleCoordinate = {
  col: number;
  row: number;
};

export type MapBundleCityZoneId = string;
export type MapBundleFarmZoneId = string;

export type MapBundleCityZone = {
  cityZoneId: MapBundleCityZoneId;
  homeTeam: PlayerTeam | "NEUTRAL";
  anchor: MapBundleCoordinate;
  cells: MapBundleCoordinate[];
};

export type MapBundleFarmZone = {
  farmZoneId: MapBundleFarmZoneId;
  anchor: MapBundleCoordinate;
  cells: MapBundleCoordinate[];
};

export type MapBundleFarmToCityLink = {
  farmZoneId: MapBundleFarmZoneId;
  cityZoneId: MapBundleCityZoneId;
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
  cityZones: MapBundleCityZone[];
  roadCells: MapBundleCoordinate[];
  farmZones: MapBundleFarmZone[];
  farmToCityLinks: MapBundleFarmToCityLink[];
  blockedSpawnCellIndexSet: ReadonlySet<number>;
  impassableCellIndexSet: ReadonlySet<number>;
  source: MapBundleSource;
};
