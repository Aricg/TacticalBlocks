import { Schema, type } from "@colyseus/schema";

export class GridCellState extends Schema {
  @type("number") col = 0;
  @type("number") row = 0;

  constructor(col = 0, row = 0) {
    super();
    this.col = col;
    this.row = row;
  }
}
