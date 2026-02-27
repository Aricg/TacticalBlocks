import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GridCellState } from "./GridCellState.js";

export class FarmCitySupplyLineState extends Schema {
  @type("string") linkId = "";
  @type("string") farmZoneId = "";
  @type("string") cityZoneId = "";
  @type("string") team = "";
  @type("boolean") connected = true;
  @type("number") oneWayTravelSeconds = 0.25;
  @type("number") severIndex = -1;
  @type([GridCellState]) path = new ArraySchema<GridCellState>();

  constructor() {
    super();
  }
}
