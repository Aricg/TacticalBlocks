import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GridCellState } from "./GridCellState.js";

export class SupplyLineState extends Schema {
  @type("string") unitId = "";
  @type("string") team = "";
  @type("boolean") connected = true;
  @type("number") sourceCol = -1;
  @type("number") sourceRow = -1;
  @type("number") severIndex = -1;
  @type([GridCellState]) path = new ArraySchema<GridCellState>();

  constructor() {
    super();
  }
}
