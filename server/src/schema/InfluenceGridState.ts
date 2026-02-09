import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";

export class InfluenceGridState extends Schema {
  @type("number") width = GAMEPLAY_CONFIG.influence.gridWidth;
  @type("number") height = GAMEPLAY_CONFIG.influence.gridHeight;
  @type("number") cellWidth = GAMEPLAY_CONFIG.map.width / this.width;
  @type("number") cellHeight = GAMEPLAY_CONFIG.map.height / this.height;
  @type("number") revision = 0;
  @type(["number"]) cells = new ArraySchema<number>();

  constructor() {
    super();
    const cellCount = this.width * this.height;
    for (let i = 0; i < cellCount; i += 1) {
      this.cells.push(0);
    }
  }
}
