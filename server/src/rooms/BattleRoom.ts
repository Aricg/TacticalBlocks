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
  private static readonly CONTACT_DAMAGE_PER_SECOND =
    GAMEPLAY_CONFIG.combat.contactDamagePerSecond;
  private static readonly UNIT_HALF_WIDTH = 12;
  private static readonly UNIT_HALF_HEIGHT = 7;

  onCreate(): void {
    this.maxClients = GAMEPLAY_CONFIG.network.maxPlayers;
    this.setState(new BattleState());
    this.spawnTestUnits();
    this.setSimulationInterval((deltaMs) => {
      this.updateCombat(deltaMs / 1000);
    }, 50);

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
    const unitsPerSide = 10;
    const columns = 5;
    const spacingX = 32;
    const spacingY = 28;
    const centerOffsetX = ((columns - 1) * spacingX) / 2;

    for (let i = 0; i < unitsPerSide; i += 1) {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const offsetX = column * spacingX - centerOffsetX;
      const offsetY = row * spacingY;

      const redUnit = new Unit(
        `red-${i + 1}`,
        "red",
        redSpawn.x + offsetX,
        redSpawn.y + offsetY,
        redSpawn.rotation,
      );
      const blueUnit = new Unit(
        `blue-${i + 1}`,
        "blue",
        blueSpawn.x + offsetX,
        blueSpawn.y + offsetY,
        blueSpawn.rotation,
      );

      this.state.units.set(redUnit.unitId, redUnit);
      this.state.units.set(blueUnit.unitId, blueUnit);
    }
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

  private updateCombat(deltaSeconds: number): void {
    if (deltaSeconds <= 0) {
      return;
    }

    const units = Array.from(this.state.units.values());
    const pendingDamageByUnitId = new Map<string, number>();

    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      if (a.health <= 0) {
        continue;
      }

      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        if (b.health <= 0 || a.team === b.team) {
          continue;
        }

        if (!this.areUnitsInContact(a, b)) {
          continue;
        }

        const damage = BattleRoom.CONTACT_DAMAGE_PER_SECOND * deltaSeconds;
        pendingDamageByUnitId.set(
          a.unitId,
          (pendingDamageByUnitId.get(a.unitId) ?? 0) + damage,
        );
        pendingDamageByUnitId.set(
          b.unitId,
          (pendingDamageByUnitId.get(b.unitId) ?? 0) + damage,
        );
      }
    }

    if (pendingDamageByUnitId.size === 0) {
      return;
    }

    const deadUnitIds: string[] = [];
    for (const [unitId, damage] of pendingDamageByUnitId) {
      const unit = this.state.units.get(unitId);
      if (!unit || unit.health <= 0) {
        continue;
      }

      unit.health = Math.max(0, unit.health - damage);
      if (unit.health <= 0) {
        deadUnitIds.push(unitId);
      }
    }

    for (const unitId of deadUnitIds) {
      this.state.units.delete(unitId);
    }
  }

  private areUnitsInContact(a: Unit, b: Unit): boolean {
    const overlapX = Math.abs(a.x - b.x) <= BattleRoom.UNIT_HALF_WIDTH * 2;
    const overlapY = Math.abs(a.y - b.y) <= BattleRoom.UNIT_HALF_HEIGHT * 2;
    return overlapX && overlapY;
  }
}
