import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { InfluenceGridState } from "./InfluenceGridState.js";
import { Unit } from "./Unit.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";

export class BattleState extends Schema {
  @type({ map: Unit }) units = new MapSchema<Unit>();
  @type(InfluenceGridState) influenceGrid = new InfluenceGridState();
  @type("string") mapId: string = GAMEPLAY_CONFIG.map.activeMapId;
  @type("string") redCityOwner = "RED";
  @type("string") blueCityOwner = "BLUE";
  @type(["string"]) neutralCityOwners = new ArraySchema<string>();
}
