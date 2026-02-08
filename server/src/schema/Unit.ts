import { Schema, type } from "@colyseus/schema";

export class Unit extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") rotation = 0;
  @type("string") team = "";
  @type("string") unitId = "";

  constructor(unitId: string, team: string, x: number, y: number, rotation = 0) {
    super();
    this.unitId = unitId;
    this.team = team;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }
}
