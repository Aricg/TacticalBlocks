import { GAMEPLAY_CONFIG } from "../../../../shared/src/gameplayConfig.js";
import type {
  LobbyPlayerSnapshot,
  LobbyReadyMessage,
  LobbySelectMapMessage,
  LobbyStateMessage,
  MatchPhase,
  PlayerTeam,
} from "../BattleRoomTypes.js";

type HandleLobbyReadyArgs = {
  sessionId: string;
  message: LobbyReadyMessage;
  matchPhase: MatchPhase;
};

type HandleLobbyMapSelectionArgs = {
  sessionId: string;
  matchPhase: MatchPhase;
  currentMapId: string;
};

type HandleLobbySelectMapArgs = HandleLobbyMapSelectionArgs & {
  message: LobbySelectMapMessage;
};

type LobbyStateMessageArgs = {
  phase: MatchPhase;
  mapId: string;
  mapRevision: number;
  isGeneratingMap: boolean;
};

export class LobbyService {
  private readonly availableMapIds: string[];
  private readonly sessionTeamById = new Map<string, PlayerTeam>();
  private readonly readyBySessionId = new Map<string, boolean>();

  constructor(initialAvailableMapIds: readonly string[]) {
    this.availableMapIds = [...initialAvailableMapIds];
  }

  dispose(): void {
    this.sessionTeamById.clear();
    this.readyBySessionId.clear();
  }

  getAssignedTeam(sessionId: string): PlayerTeam | undefined {
    return this.sessionTeamById.get(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessionTeamById.has(sessionId);
  }

  registerJoin(sessionId: string): PlayerTeam {
    const team = this.assignTeam(sessionId);
    this.readyBySessionId.set(sessionId, false);
    return team;
  }

  unregisterSession(sessionId: string): PlayerTeam | null {
    const team = this.sessionTeamById.get(sessionId) ?? null;
    if (team) {
      this.sessionTeamById.delete(sessionId);
    }
    this.readyBySessionId.delete(sessionId);
    return team;
  }

  handleReadyMessage(args: HandleLobbyReadyArgs): {
    updated: boolean;
    shouldTryStart: boolean;
  } {
    if (args.matchPhase !== "LOBBY") {
      return { updated: false, shouldTryStart: false };
    }

    if (!this.sessionTeamById.has(args.sessionId)) {
      return { updated: false, shouldTryStart: false };
    }

    const ready = args.message?.ready;
    if (typeof ready !== "boolean") {
      return { updated: false, shouldTryStart: false };
    }

    this.readyBySessionId.set(args.sessionId, ready);
    return { updated: true, shouldTryStart: true };
  }

  handleSelectMapMessage(args: HandleLobbySelectMapArgs): {
    nextMapId: string | null;
  } {
    if (args.matchPhase !== "LOBBY") {
      return { nextMapId: null };
    }

    if (!this.sessionTeamById.has(args.sessionId)) {
      return { nextMapId: null };
    }

    const requestedMapId = args.message?.mapId;
    if (typeof requestedMapId !== "string") {
      return { nextMapId: null };
    }

    const mapId = this.getValidatedMapId(requestedMapId);
    if (mapId === args.currentMapId) {
      return { nextMapId: null };
    }

    return { nextMapId: mapId };
  }

  handleRandomMapMessage(args: HandleLobbyMapSelectionArgs): {
    nextMapId: string | null;
  } {
    if (args.matchPhase !== "LOBBY") {
      return { nextMapId: null };
    }

    if (!this.sessionTeamById.has(args.sessionId)) {
      return { nextMapId: null };
    }

    const candidateMapIds = this.availableMapIds.filter(
      (mapId) => mapId !== args.currentMapId,
    );
    if (candidateMapIds.length === 0) {
      return { nextMapId: null };
    }

    const randomIndex = Math.floor(Math.random() * candidateMapIds.length);
    const randomMapId = candidateMapIds[randomIndex];
    return { nextMapId: randomMapId ?? null };
  }

  canStartBattle(matchPhase: MatchPhase): boolean {
    if (matchPhase !== "LOBBY") {
      return false;
    }

    const players = this.getLobbyPlayersSnapshot();
    if (players.length < 2) {
      return false;
    }

    const hasBlue = players.some((player) => player.team === "BLUE");
    const hasRed = players.some((player) => player.team === "RED");
    if (!hasBlue || !hasRed) {
      return false;
    }

    return players.every((player) => player.ready);
  }

  resetLobbyReadyStates(): void {
    for (const sessionId of this.readyBySessionId.keys()) {
      this.readyBySessionId.set(sessionId, false);
    }
  }

  getValidatedMapId(requestedMapId: string): string {
    if (this.availableMapIds.includes(requestedMapId)) {
      return requestedMapId;
    }

    return this.availableMapIds[0] ?? GAMEPLAY_CONFIG.map.activeMapId;
  }

  getGeneratedMapId(): string {
    const existingGeneratedMapId = this.availableMapIds.find((mapId) =>
      mapId.startsWith("random-"),
    );
    if (existingGeneratedMapId) {
      return existingGeneratedMapId;
    }

    return "random-frontier-01";
  }

  addAvailableMapId(mapId: string): void {
    if (!this.availableMapIds.includes(mapId)) {
      this.availableMapIds.push(mapId);
    }
  }

  getLobbyPlayersSnapshot(): LobbyPlayerSnapshot[] {
    const players = Array.from(this.sessionTeamById, ([sessionId, team]) => ({
      sessionId,
      team,
      ready: this.readyBySessionId.get(sessionId) === true,
    }));

    players.sort((a, b) => {
      if (a.team !== b.team) {
        return a.team === "BLUE" ? -1 : 1;
      }
      return a.sessionId.localeCompare(b.sessionId);
    });

    return players;
  }

  getLobbyStateMessage(args: LobbyStateMessageArgs): LobbyStateMessage {
    return {
      phase: args.phase,
      players: this.getLobbyPlayersSnapshot(),
      mapId: args.mapId,
      availableMapIds: this.availableMapIds,
      mapRevision: args.mapRevision,
      isGeneratingMap: args.isGeneratingMap,
    };
  }

  private assignTeam(sessionId: string): PlayerTeam {
    let blueCount = 0;
    let redCount = 0;
    for (const team of this.sessionTeamById.values()) {
      if (team === "BLUE") {
        blueCount += 1;
      } else {
        redCount += 1;
      }
    }

    const team: PlayerTeam = blueCount <= redCount ? "BLUE" : "RED";
    this.sessionTeamById.set(sessionId, team);
    return team;
  }
}
