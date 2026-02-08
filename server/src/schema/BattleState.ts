import { MapSchema, Schema, type } from "@colyseus/schema";
import { Unit } from "./Unit.js";

export class BattleState extends Schema {
  @type({ map: Unit }) units = new MapSchema<Unit>();
}
