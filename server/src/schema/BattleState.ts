import { MapSchema, Schema, type } from "@colyseus/schema";
import { InfluenceGridState } from "./InfluenceGridState.js";
import { Unit } from "./Unit.js";

export class BattleState extends Schema {
  @type({ map: Unit }) units = new MapSchema<Unit>();
  @type(InfluenceGridState) influenceGrid = new InfluenceGridState();
  @type("string") redCityOwner = "RED";
  @type("string") blueCityOwner = "BLUE";
}
