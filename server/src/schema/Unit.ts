import { Schema, type } from "@colyseus/schema";
import {
  DEFAULT_UNIT_TYPE,
  type UnitType,
} from "../../../shared/src/unitTypes.js";

export class Unit extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") rotation = 0;
  @type("number") health = 100;
  @type("number") moraleScore = 0;
  @type("string") team = "";
  @type("string") unitId = "";
  @type("string") unitType = DEFAULT_UNIT_TYPE;

  constructor(
    unitId: string,
    team: string,
    x: number,
    y: number,
    rotation = 0,
    health = 100,
    unitType: UnitType = DEFAULT_UNIT_TYPE,
  ) {
    super();
    this.unitId = unitId;
    this.team = team;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.health = health;
    this.unitType = unitType;
  }
}
