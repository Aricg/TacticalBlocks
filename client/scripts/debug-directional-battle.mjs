import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "colyseus.js";

const SERVER_URL = process.env.TB_SMOKE_SERVER_URL ?? "ws://localhost:2567";
const ROOM_NAME = "battle";
const LOBBY_TIMEOUT_MS = 30_000;
const BATTLE_TIMEOUT_MS = 30_000;
const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;
const GRID_WIDTH = 80;
const GRID_HEIGHT = 44;
const MAP_ID = "runtime-generated-lobby";
const TOTAL_UNITS_PER_TEAM = 40;
const LINE_UNITS_PER_TEAM = TOTAL_UNITS_PER_TEAM - 1; // +1 commander.
const REQUESTED_ATTACKER_TEAM = (() => {
  const value = process.env.TB_ATTACKER_TEAM?.toUpperCase();
  if (value === "RED" || value === "BLUE") {
    return value;
  }
  return "BOTH";
})();

function normalizeTeam(value) {
  return value?.toUpperCase?.() === "RED" ? "RED" : "BLUE";
}

function toWorld(cell) {
  return {
    x: (cell.col + 0.5) * (MAP_WIDTH / GRID_WIDTH),
    y: (cell.row + 0.5) * (MAP_HEIGHT / GRID_HEIGHT),
  };
}

function createTracker(room) {
  const tracker = {
    room,
    latestLobbyState: null,
    battleEndedMessages: [],
    team: null,
    pathStateByUnitId: new Map(),
  };
  room.onMessage("runtimeTuningSnapshot", () => {});
  room.onMessage("unitPathState", (message) => {
    if (!message || typeof message.unitId !== "string") {
      return;
    }
    tracker.pathStateByUnitId.set(message.unitId, {
      pathLength: Array.isArray(message.path) ? message.path.length : 0,
      isPaused: message.isPaused === true,
      atMs: Date.now(),
    });
  });
  room.onMessage("lobbyState", (message) => {
    tracker.latestLobbyState = message;
  });
  room.onMessage("battleEnded", (message) => {
    tracker.battleEndedMessages.push(message);
  });
  room.onMessage("teamAssigned", (message) => {
    if (message?.team === "RED" || message?.team === "BLUE") {
      tracker.team = message.team;
    }
  });
  return tracker;
}

async function waitFor(condition, timeoutMs, pollMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = condition();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Timed out waiting for ${label} (${timeoutMs}ms).`);
}

async function waitForLobbyState(tracker, predicate, timeoutMs, label) {
  return waitFor(() => {
    const message = tracker.latestLobbyState;
    if (!message) {
      return null;
    }
    return predicate(message) ? message : null;
  }, timeoutMs, 50, label);
}

async function configureScenario(controllerTracker) {
  const initialLobbyState = await waitForLobbyState(
    controllerTracker,
    (message) => message.phase === "LOBBY" && message.isGeneratingMap === false,
    LOBBY_TIMEOUT_MS,
    "initial lobby state",
  );
  const startRevision = initialLobbyState.mapRevision ?? 0;

  controllerTracker.room.send("lobbyGenerateMap", {
    method: "noise",
    profile: {
      terrain: {
        waterMode: "none",
        riverCount: 0,
        mountainDensity: 0,
        forestDensity: 0,
      },
      cities: {
        neutralCityCount: 0,
        friendlyCityCount: 0,
      },
      startingForces: {
        layoutStrategy: "city-front",
        unitCountPerTeam: LINE_UNITS_PER_TEAM,
      },
    },
  });

  await waitForLobbyState(
    controllerTracker,
    (message) => message.phase === "LOBBY" && message.isGeneratingMap === true,
    LOBBY_TIMEOUT_MS,
    "map generation start",
  );

  const completedLobbyState = await waitForLobbyState(
    controllerTracker,
    (message) =>
      message.phase === "LOBBY" &&
      message.isGeneratingMap === false &&
      typeof message.mapRevision === "number" &&
      message.mapRevision > startRevision &&
      message.mapId === MAP_ID &&
      message.cityAnchors?.RED &&
      message.cityAnchors?.BLUE &&
      Array.isArray(message.neutralCityAnchors) &&
      message.neutralCityAnchors.length === 0,
    LOBBY_TIMEOUT_MS,
    "map generation completion",
  );

  const sidecarPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "shared",
    `${MAP_ID}.elevation-grid.json`,
  );
  const sidecar = JSON.parse(await readFile(sidecarPath, "utf8"));
  const terrainCodeGrid =
    typeof sidecar?.terrainCodeGrid === "string" ? sidecar.terrainCodeGrid : "";
  if (terrainCodeGrid.length !== GRID_WIDTH * GRID_HEIGHT) {
    throw new Error(
      `Generated terrain grid has invalid length: ${terrainCodeGrid.length}.`,
    );
  }
  const nonGrassCells = [...terrainCodeGrid].filter((code) => code !== "g").length;
  if (nonGrassCells > 0) {
    throw new Error(`Grass-only terrain check failed: found ${nonGrassCells} non-grass cells.`);
  }

  return completedLobbyState;
}

function countAliveUnitsByTeam(room) {
  let red = 0;
  let blue = 0;
  for (const unit of room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    const team = normalizeTeam(unit.team);
    if (team === "RED") {
      red += 1;
    } else {
      blue += 1;
    }
  }
  return { red, blue };
}

function sendAdvanceOrders(attackerTracker, enemyCityAnchor) {
  const destination = toWorld(enemyCityAnchor);
  const commandedUnitIds = [];
  for (const unit of attackerTracker.room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    if (normalizeTeam(unit.team) !== attackerTracker.team) {
      continue;
    }
    attackerTracker.room.send("unitPath", {
      unitId: unit.unitId,
      path: [destination],
      movementCommandMode: {
        rotateToFace: true,
        preferRoads: true,
      },
    });
    commandedUnitIds.push(unit.unitId);
  }
  return commandedUnitIds;
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function buildAlternatingOffsets(maxOffset) {
  const offsets = [0];
  for (let offset = 1; offset <= maxOffset; offset += 1) {
    offsets.push(offset, -offset);
  }
  return offsets;
}

function sendDistributedAdvanceOrders({
  attackerTracker,
  attackerTeam,
  attackerCityAnchor,
  defenderCityAnchor,
}) {
  const attackerUnits = [];
  for (const unit of attackerTracker.room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    if (normalizeTeam(unit.team) !== attackerTracker.team) {
      continue;
    }
    attackerUnits.push(unit);
  }
  attackerUnits.sort((a, b) => a.y - b.y);

  const forwardColStep = Math.sign(defenderCityAnchor.col - attackerCityAnchor.col) || 1;
  const assaultCol = clamp(
    defenderCityAnchor.col - forwardColStep * 4,
    0,
    GRID_WIDTH - 1,
  );
  const rowOffsets = buildAlternatingOffsets(Math.max(GRID_HEIGHT, attackerUnits.length));
  const commandedUnitIds = [];

  for (let index = 0; index < attackerUnits.length; index += 1) {
    const unit = attackerUnits[index];
    const offset = rowOffsets[index] ?? 0;
    const targetRow = clamp(defenderCityAnchor.row + offset, 0, GRID_HEIGHT - 1);
    const targetCell = { col: assaultCol, row: targetRow };
    attackerTracker.room.send("unitPath", {
      unitId: unit.unitId,
      path: [toWorld(targetCell)],
      movementCommandMode: {
        rotateToFace: true,
        preferRoads: true,
      },
    });
    commandedUnitIds.push(unit.unitId);
  }

  return commandedUnitIds;
}

function captureUnitsSnapshot(room) {
  const byUnitId = new Map();
  for (const unit of room.state.units.values()) {
    byUnitId.set(unit.unitId, {
      x: unit.x,
      y: unit.y,
      health: unit.health,
      team: normalizeTeam(unit.team),
    });
  }
  return byUnitId;
}

function computeMoraleSnapshot(room) {
  let redMoraleTotal = 0;
  let blueMoraleTotal = 0;
  let redUnits = 0;
  let blueUnits = 0;
  for (const unit of room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    const morale = Number.isFinite(unit.moraleScore) ? unit.moraleScore : 0;
    if (normalizeTeam(unit.team) === "RED") {
      redMoraleTotal += morale;
      redUnits += 1;
    } else {
      blueMoraleTotal += morale;
      blueUnits += 1;
    }
  }
  return {
    redAverage: redUnits > 0 ? redMoraleTotal / redUnits : 0,
    blueAverage: blueUnits > 0 ? blueMoraleTotal / blueUnits : 0,
  };
}

function createMoraleSampler(room) {
  const accumulator = {
    sampleCount: 0,
    redAverageSum: 0,
    blueAverageSum: 0,
  };

  const sample = () => {
    const snapshot = computeMoraleSnapshot(room);
    accumulator.redAverageSum += snapshot.redAverage;
    accumulator.blueAverageSum += snapshot.blueAverage;
    accumulator.sampleCount += 1;
  };

  sample();
  const timer = setInterval(sample, 250);

  return () => {
    clearInterval(timer);
    sample();
    const sampleCount = Math.max(1, accumulator.sampleCount);
    const finalSnapshot = computeMoraleSnapshot(room);
    return {
      redAverageDuringBattle: accumulator.redAverageSum / sampleCount,
      blueAverageDuringBattle: accumulator.blueAverageSum / sampleCount,
      redAverageFinal: finalSnapshot.redAverage,
      blueAverageFinal: finalSnapshot.blueAverage,
      sampleCount,
    };
  };
}

function countMovedUnits(room, unitIds, snapshot, minDistance = 1) {
  let moved = 0;
  for (const unitId of unitIds) {
    const previous = snapshot.get(unitId);
    const current = room.state.units.get(unitId);
    if (!previous || !current) {
      continue;
    }
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (distance >= minDistance) {
      moved += 1;
    }
  }
  return moved;
}

function countUnitsWithHealthLoss(room, snapshot) {
  let count = 0;
  for (const [unitId, previous] of snapshot) {
    const current = room.state.units.get(unitId);
    if (!current) {
      continue;
    }
    if (current.health < previous.health - 0.001) {
      count += 1;
    }
  }
  return count;
}

async function startBattle(trackers) {
  for (const tracker of trackers) {
    tracker.room.send("lobbyReady", { ready: true });
  }
  await Promise.all(
    trackers.map((tracker) =>
      waitForLobbyState(
        tracker,
        (message) => message.phase === "BATTLE",
        LOBBY_TIMEOUT_MS,
        "battle start",
      ),
    ),
  );
}

async function waitForBattleEnd(trackers) {
  const startMessageCounts = trackers.map(
    (tracker) => tracker.battleEndedMessages.length,
  );
  return waitFor(() => {
    for (let index = 0; index < trackers.length; index += 1) {
      const tracker = trackers[index];
      if (tracker.battleEndedMessages.length > startMessageCounts[index]) {
        return tracker.battleEndedMessages[tracker.battleEndedMessages.length - 1];
      }
    }
    return null;
  }, BATTLE_TIMEOUT_MS, 100, "battle end");
}

function countOwnedCitiesByTeam(room) {
  let red = 0;
  let blue = 0;
  const redCityOwner = normalizeTeam(room.state.redCityOwner);
  const blueCityOwner = normalizeTeam(room.state.blueCityOwner);
  if (redCityOwner === "RED") {
    red += 1;
  } else {
    blue += 1;
  }
  if (blueCityOwner === "BLUE") {
    blue += 1;
  } else {
    red += 1;
  }
  for (const owner of room.state.neutralCityOwners ?? []) {
    if (owner === "RED") {
      red += 1;
    } else if (owner === "BLUE") {
      blue += 1;
    }
  }
  return { red, blue };
}

function buildSnapshotOutcome(room) {
  const unitCounts = countAliveUnitsByTeam(room);
  const cityCounts = countOwnedCitiesByTeam(room);
  const winner =
    unitCounts.red === unitCounts.blue
      ? "DRAW"
      : unitCounts.red > unitCounts.blue
        ? "RED"
        : "BLUE";
  return {
    winner,
    loser: winner === "DRAW" ? null : winner === "RED" ? "BLUE" : "RED",
    reason: "TIEBREAKER",
    redUnits: unitCounts.red,
    blueUnits: unitCounts.blue,
    redCities: cityCounts.red,
    blueCities: cityCounts.blue,
    completion: "TIME_CAP",
  };
}

async function runDirectionalBattle({
  trackers,
  trackerByTeam,
  attackerTeam,
  cityAnchors,
}) {
  await Promise.all(
    trackers.map((tracker) =>
      waitForLobbyState(
        tracker,
        (message) => message.phase === "LOBBY" && message.isGeneratingMap === false,
        LOBBY_TIMEOUT_MS,
        "lobby before battle",
      ),
    ),
  );

  await startBattle(trackers);
  const stopMoraleSampler = createMoraleSampler(trackers[0].room);
  const initialCounts = countAliveUnitsByTeam(trackers[0].room);
  if (
    initialCounts.red !== TOTAL_UNITS_PER_TEAM ||
    initialCounts.blue !== TOTAL_UNITS_PER_TEAM
  ) {
    throw new Error(
      `Unexpected starting unit totals. RED=${initialCounts.red}, BLUE=${initialCounts.blue}, expected ${TOTAL_UNITS_PER_TEAM} vs ${TOTAL_UNITS_PER_TEAM}.`,
    );
  }

  const attackerTracker = trackerByTeam[attackerTeam];
  const defenderTeam = attackerTeam === "RED" ? "BLUE" : "RED";
  const preOrderSnapshot = captureUnitsSnapshot(trackers[0].room);
  const commandedUnitIds = sendDistributedAdvanceOrders({
    attackerTracker,
    attackerTeam,
    attackerCityAnchor: cityAnchors[attackerTeam],
    defenderCityAnchor: cityAnchors[defenderTeam],
  });
  const expectedAckCount = Math.max(
    1,
    Math.floor(commandedUnitIds.length * 0.75),
  );
  const ackedCount = await waitFor(
    () => {
      let acked = 0;
      for (const unitId of commandedUnitIds) {
        const pathState = attackerTracker.pathStateByUnitId.get(unitId);
        if (!pathState || pathState.pathLength <= 0) {
          continue;
        }
        acked += 1;
      }
      return acked >= expectedAckCount ? acked : null;
    },
    8_000,
    100,
    "attacker order acknowledgements",
  );

  const movedCount = await waitFor(
    () => {
      const moved = countMovedUnits(
        trackers[0].room,
        commandedUnitIds,
        preOrderSnapshot,
        1,
      );
      return moved > 0 ? moved : null;
    },
    12_000,
    100,
    "attacker movement",
  );

  const healthLossCount = await waitFor(
    () => {
      const losses = countUnitsWithHealthLoss(trackers[0].room, preOrderSnapshot);
      return losses > 0 ? losses : null;
    },
    Math.max(1_000, BATTLE_TIMEOUT_MS - 2_000),
    150,
    "combat engagement (health loss)",
  );

  const diagnostics = {
    attackerTeam,
    commandedUnits: commandedUnitIds.length,
    ackedUnits: ackedCount,
    movedUnits: movedCount,
    unitsWithHealthLoss: healthLossCount,
  };

  try {
    const outcome = await waitForBattleEnd(trackers);
    await Promise.all(
      trackers.map((tracker) =>
        waitForLobbyState(
          tracker,
          (message) => message.phase === "LOBBY",
          LOBBY_TIMEOUT_MS,
          "lobby after battle",
        ),
      ),
    );
    return {
      ...outcome,
      completion: "BATTLE_ENDED",
      diagnostics,
      morale: stopMoraleSampler(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Timed out waiting for battle end")
    ) {
      return {
        ...buildSnapshotOutcome(trackers[0].room),
        diagnostics,
        morale: stopMoraleSampler(),
      };
    }
    stopMoraleSampler();
    throw error;
  }
}

async function main() {
  const clientA = new Client(SERVER_URL);
  const clientB = new Client(SERVER_URL);
  const roomA = await clientA.joinOrCreate(ROOM_NAME);
  const trackerA = createTracker(roomA);
  const roomB = await clientB.joinOrCreate(ROOM_NAME);
  const trackerB = createTracker(roomB);
  const trackers = [trackerA, trackerB];

  try {
    // Force a lobby-state broadcast in case initial join snapshots were emitted
    // before listeners attached.
    for (const tracker of trackers) {
      tracker.room.send("lobbyReady", { ready: false });
    }

    const lobbyState = await waitForLobbyState(
      trackerA,
      (message) => message.phase === "LOBBY" && message.players.length === 2,
      LOBBY_TIMEOUT_MS,
      "both players in lobby",
    );

    for (const tracker of trackers) {
      await waitFor(
        () => {
          if (tracker.team === "RED" || tracker.team === "BLUE") {
            return tracker.team;
          }
          const latest = tracker.latestLobbyState;
          if (!latest) {
            return null;
          }
          const player = latest.players.find(
            (entry) => entry.sessionId === tracker.room.sessionId,
          );
          if (!player) {
            return null;
          }
          tracker.team = normalizeTeam(player.team);
          return tracker.team;
        },
        LOBBY_TIMEOUT_MS,
        50,
        `team assignment for ${tracker.room.sessionId}`,
      );
    }

    const trackerByTeam = {
      BLUE: trackers.find((tracker) => tracker.team === "BLUE"),
      RED: trackers.find((tracker) => tracker.team === "RED"),
    };
    if (!trackerByTeam.RED || !trackerByTeam.BLUE) {
      throw new Error("Failed to resolve both RED and BLUE players.");
    }

    const configuredLobbyState = await configureScenario(trackerA);
    const cityAnchors = configuredLobbyState.cityAnchors;
    if (!cityAnchors?.RED || !cityAnchors?.BLUE) {
      throw new Error("Missing city anchors after map generation.");
    }

    trackerA.room.send("runtimeTuningUpdate", {
      baseUnitHealth: 40,
      unitMoveSpeed: 300,
      baseContactDps: 24,
      dpsInfluenceMultiplier: 3,
      cityUnitGenerationIntervalSeconds: 60,
    });
    await waitFor(
      () => {
        let lineUnitCount = 0;
        let commanderCount = 0;
        for (const unit of trackerA.room.state.units.values()) {
          if (!unit || unit.health <= 0) {
            continue;
          }
          if (unit.unitType === "COMMANDER") {
            if (unit.health <= 80.001) {
              commanderCount += 1;
            }
            continue;
          }
          if (unit.health <= 40.001) {
            lineUnitCount += 1;
          }
        }
        return lineUnitCount >= 10 && commanderCount >= 2 ? true : null;
      },
      8_000,
      100,
      "runtime tuning application",
    );

    const outcomes = [];
    if (REQUESTED_ATTACKER_TEAM === "RED" || REQUESTED_ATTACKER_TEAM === "BOTH") {
      outcomes.push({
        label: "Red advancing toward Blue",
        outcome: await runDirectionalBattle({
          trackers,
          trackerByTeam,
          attackerTeam: "RED",
          cityAnchors,
        }),
      });
    }
    if (REQUESTED_ATTACKER_TEAM === "BLUE" || REQUESTED_ATTACKER_TEAM === "BOTH") {
      const previousOutcome = outcomes[outcomes.length - 1]?.outcome;
      if (previousOutcome?.completion === "TIME_CAP") {
        throw new Error(
          "First direction reached the 30s cap while still in BATTLE. Re-run BLUE in a fresh process with TB_ATTACKER_TEAM=BLUE.",
        );
      }
      outcomes.push({
        label: "Blue advancing toward Red",
        outcome: await runDirectionalBattle({
          trackers,
          trackerByTeam,
          attackerTeam: "BLUE",
          cityAnchors,
        }),
      });
    }

    console.log("Scenario:");
    console.log("- Map: grass-only blocks (water/forest/hills/mountains removed)");
    console.log("- Cities: one home city per side, no neutral/friendly extra cities");
    console.log("- Formation: city-front (home city behind each side's line)");
    console.log("- Units: 40 per side (39 line + 1 commander)");
    console.log("- Debug tuning: fast move/combat, low health, city spawn enabled");
    console.log(`- Cap: ${Math.round(BATTLE_TIMEOUT_MS / 1000)}s per direction`);
    console.log("");
    for (const { label, outcome } of outcomes) {
      console.log(
        `${label} -> winner=${outcome.winner}, RED left=${outcome.redUnits}, BLUE left=${outcome.blueUnits}, reason=${outcome.reason}, completion=${outcome.completion}`,
      );
      console.log(
        `  diagnostics: attacker=${outcome.diagnostics.attackerTeam} commanded=${outcome.diagnostics.commandedUnits} acked=${outcome.diagnostics.ackedUnits} moved=${outcome.diagnostics.movedUnits} healthLoss=${outcome.diagnostics.unitsWithHealthLoss}`,
      );
      console.log(
        `  morale: avgDuringBattle RED=${outcome.morale.redAverageDuringBattle.toFixed(2)} BLUE=${outcome.morale.blueAverageDuringBattle.toFixed(2)} | final RED=${outcome.morale.redAverageFinal.toFixed(2)} BLUE=${outcome.morale.blueAverageFinal.toFixed(2)} | samples=${outcome.morale.sampleCount}`,
      );
    }
  } finally {
    await Promise.allSettled(trackers.map((tracker) => tracker.room.leave(true)));
  }
}

main().catch((error) => {
  console.error("[debug-directional-battle] failed:", error);
  process.exit(1);
});
