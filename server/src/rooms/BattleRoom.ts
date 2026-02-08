import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { Unit } from "../schema/Unit.js";

export class BattleRoom extends Room<BattleState> {
  onCreate(): void {
    this.setState(new BattleState());
    this.spawnTestUnits();
  }

  onJoin(client: Client): void {
    console.log(`Client joined battle room: ${client.sessionId}`);
  }

  onLeave(client: Client): void {
    console.log(`Client left battle room: ${client.sessionId}`);
  }

  private spawnTestUnits(): void {
    const redUnit = new Unit("red-1", "red", 220, 300, 0);
    const blueUnit = new Unit("blue-1", "blue", 580, 300, Math.PI);

    this.state.units.set(redUnit.unitId, redUnit);
    this.state.units.set(blueUnit.unitId, blueUnit);
  }
}
