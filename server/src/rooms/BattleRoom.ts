import { Client, Room } from "colyseus";
import { BattleState } from "../schema/BattleState.js";
import { Unit } from "../schema/Unit.js";
import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";

type PlayerTeam = "BLUE" | "RED";
type UnitPositionMessage = {
  unitId: string;
  x: number;
  y: number;
};

export class BattleRoom extends Room<BattleState> {
  private readonly sessionTeamById = new Map<string, PlayerTeam>();

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.spawnTestUnits();

    this.onMessage("unitPosition", (client, message: UnitPositionMessage) => {
      this.handleUnitPositionMessage(client, message);
    });
  }

  onJoin(client: Client): void {
    const assignedTeam = this.assignTeam(client.sessionId);
    client.send("teamAssigned", { team: assignedTeam });
    console.log(`Client joined battle room: ${client.sessionId} (${assignedTeam})`);
  }

  onLeave(client: Client): void {
    const team = this.sessionTeamById.get(client.sessionId);
    if (team) {
      this.sessionTeamById.delete(client.sessionId);
    }
    console.log(`Client left battle room: ${client.sessionId}${team ? ` (${team})` : ""}`);
  }

  private spawnTestUnits(): void {
    const redSpawn = GAMEPLAY_CONFIG.spawn.red;
    const blueSpawn = GAMEPLAY_CONFIG.spawn.blue;
    const redUnit = new Unit(
      "red-1",
      "red",
      redSpawn.x,
      redSpawn.y,
      redSpawn.rotation,
    );
    const blueUnit = new Unit(
      "blue-1",
      "blue",
      blueSpawn.x,
      blueSpawn.y,
      blueSpawn.rotation,
    );

    this.state.units.set(redUnit.unitId, redUnit);
    this.state.units.set(blueUnit.unitId, blueUnit);
  }

  private assignTeam(sessionId: string): PlayerTeam {
    const takenTeams = new Set(this.sessionTeamById.values());
    const team: PlayerTeam = takenTeams.has("BLUE") ? "RED" : "BLUE";
    this.sessionTeamById.set(sessionId, team);
    return team;
  }

  private handleUnitPositionMessage(
    client: Client,
    message: UnitPositionMessage,
  ): void {
    const assignedTeam = this.sessionTeamById.get(client.sessionId);
    if (!assignedTeam) {
      return;
    }

    if (
      typeof message?.unitId !== "string" ||
      !Number.isFinite(message.x) ||
      !Number.isFinite(message.y)
    ) {
      return;
    }

    const unit = this.state.units.get(message.unitId);
    if (!unit) {
      return;
    }

    if (unit.team.toUpperCase() !== assignedTeam) {
      return;
    }

    unit.x = message.x;
    unit.y = message.y;
  }
}
