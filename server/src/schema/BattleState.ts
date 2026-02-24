import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
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
  @type(InfluenceGridState) influenceGrid = new InfluenceGridState();
  @type("string") mapId: string = GAMEPLAY_CONFIG.map.activeMapId;
  @type("string") redCityOwner = "RED";
  @type("string") blueCityOwner = "BLUE";
  @type(["string"]) neutralCityOwners = new ArraySchema<string>();
}
