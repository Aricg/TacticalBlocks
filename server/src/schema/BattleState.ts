import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { CitySupplyDepotLineState } from "./CitySupplyDepotLineState.js";
import { FarmCitySupplyLineState } from "./FarmCitySupplyLineState.js";
import { InfluenceGridState } from "./InfluenceGridState.js";
import { SupplyLineState } from "./SupplyLineState.js";
import { Unit } from "./Unit.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";

export class BattleState extends Schema {
  @type({ map: Unit }) units = new MapSchema<Unit>();
  @type({ map: SupplyLineState }) supplyLines = new MapSchema<SupplyLineState>();
  @type({ map: FarmCitySupplyLineState })
  farmCitySupplyLines = new MapSchema<FarmCitySupplyLineState>();
  @type({ map: CitySupplyDepotLineState })
  citySupplyDepotLines = new MapSchema<CitySupplyDepotLineState>();
  @type({ map: "number" }) citySupplyBySourceId = new MapSchema<number>();
  @type({ map: "number" }) cityFarmSupplyReceivedBySourceId = new MapSchema<number>();
  @type(InfluenceGridState) influenceGrid = new InfluenceGridState();
  @type("number") simulationFrame = 0;
  @type("string") mapId: string = GAMEPLAY_CONFIG.map.activeMapId;
  @type("string") redCityOwner = "RED";
  @type("string") blueCityOwner = "BLUE";
  @type(["string"]) neutralCityOwners = new ArraySchema<string>();
}
