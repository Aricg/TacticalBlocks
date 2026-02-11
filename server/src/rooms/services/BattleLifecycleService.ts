import { Unit } from "../../schema/Unit.js";
import type {
  BattleEndedMessage,
  MatchPhase,
  PlayerTeam,
} from "../BattleRoomTypes.js";

type BattleOutcomeContext = {
  matchPhase: MatchPhase;
  units: Iterable<Unit>;
  getOwnedCityCount: (team: PlayerTeam) => number;
};

type ConcludeBattleContext = {
  outcome: BattleEndedMessage;
  broadcastBattleEnded: (outcome: BattleEndedMessage) => void;
  setMatchPhase: (phase: MatchPhase) => void;
  resetLobbyStateAfterBattle: () => void;
  broadcastLobbyState: () => void;
  log: (message: string) => void;
};

export class BattleLifecycleService {
  getBattleOutcome(context: BattleOutcomeContext): BattleEndedMessage | null {
    if (context.matchPhase !== "BATTLE") {
      return null;
    }

    const units = Array.from(context.units);
    const blueUnits = this.getAliveUnitCount(units, "BLUE");
    const redUnits = this.getAliveUnitCount(units, "RED");
    const blueCities = context.getOwnedCityCount("BLUE");
    const redCities = context.getOwnedCityCount("RED");

    const blueDefeatedByUnits = blueUnits <= 0;
    const redDefeatedByUnits = redUnits <= 0;
    const blueDefeatedByCities = blueCities <= 0;
    const redDefeatedByCities = redCities <= 0;
    const blueDefeated = blueDefeatedByUnits || blueDefeatedByCities;
    const redDefeated = redDefeatedByUnits || redDefeatedByCities;

    if (!blueDefeated && !redDefeated) {
      return null;
    }

    const createOutcome = (
      winner: PlayerTeam | "DRAW",
      loser: PlayerTeam | null,
      reason: BattleEndedMessage["reason"],
    ): BattleEndedMessage => ({
      winner,
      loser,
      reason,
      blueUnits,
      redUnits,
      blueCities,
      redCities,
    });

    if (blueDefeated && !redDefeated) {
      return createOutcome(
        "RED",
        "BLUE",
        blueDefeatedByUnits ? "NO_UNITS" : "NO_CITIES",
      );
    }

    if (redDefeated && !blueDefeated) {
      return createOutcome(
        "BLUE",
        "RED",
        redDefeatedByUnits ? "NO_UNITS" : "NO_CITIES",
      );
    }

    if (blueCities !== redCities) {
      return blueCities > redCities
        ? createOutcome("BLUE", "RED", "TIEBREAKER")
        : createOutcome("RED", "BLUE", "TIEBREAKER");
    }

    if (blueUnits !== redUnits) {
      return blueUnits > redUnits
        ? createOutcome("BLUE", "RED", "TIEBREAKER")
        : createOutcome("RED", "BLUE", "TIEBREAKER");
    }

    return createOutcome("DRAW", null, "TIEBREAKER");
  }

  concludeBattle(context: ConcludeBattleContext): void {
    context.broadcastBattleEnded(context.outcome);
    context.setMatchPhase("LOBBY");
    context.resetLobbyStateAfterBattle();
    context.broadcastLobbyState();
    context.log(
      `Battle ended. Winner: ${context.outcome.winner} (reason: ${context.outcome.reason}).`,
    );
  }

  private getAliveUnitCount(units: Iterable<Unit>, team: PlayerTeam): number {
    let aliveUnits = 0;
    for (const unit of units) {
      if (unit.health <= 0) {
        continue;
      }
      if (unit.team.toUpperCase() === team) {
        aliveUnits += 1;
      }
    }

    return aliveUnits;
  }
}
