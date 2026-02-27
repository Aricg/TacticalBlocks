import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GridCellState } from "./GridCellState.js";

export class CitySupplyDepotLineState extends Schema {
  @type("string") cityZoneId = "";
  @type("string") owner = "NEUTRAL";
  @type("boolean") connected = false;
  @type("boolean") transferActive = false;
  @type("number") cityCol = -1;
  @type("number") cityRow = -1;
  @type("number") depotCol = -1;
  @type("number") depotRow = -1;
  @type("number") depotSupplyStock = 0;
  @type("number") oneWayTravelSeconds = 0.25;
  @type("number") severIndex = -1;
  @type([GridCellState]) path = new ArraySchema<GridCellState>();

  constructor() {
    super();
  }
}
