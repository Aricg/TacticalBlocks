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
const TEST_PROFILE_SEED = process.env.TB_TEST_PROFILE_SEED ?? "tmp-debug-grass";
const STAGING_RED_COL = clamp(
  Math.round(Number(process.env.TB_STAGING_RED_COL ?? 30)),
  0,
  GRID_WIDTH - 1,
);
const STAGING_BLUE_COL = clamp(
  Math.round(Number(process.env.TB_STAGING_BLUE_COL ?? 50)),
  0,
  GRID_WIDTH - 1,
);
const ATTACK_STOP_OFFSET_CELLS = clamp(
  Math.round(Number(process.env.TB_ATTACK_STOP_OFFSET_CELLS ?? 1)),
  1,
  GRID_WIDTH - 1,
);
const ATTACK_TARGET_COL_BY_TEAM = {
  RED: STAGING_BLUE_COL - ATTACK_STOP_OFFSET_CELLS,
  BLUE: STAGING_RED_COL + ATTACK_STOP_OFFSET_CELLS,
};
const STAGING_SETTLE_TIMEOUT_MS = Math.max(
  1_000,
  Math.round(Number(process.env.TB_STAGING_SETTLE_TIMEOUT_MS ?? 14_000)),
);
const STAGING_SETTLE_MIN_RATIO = clamp(
  Number(process.env.TB_STAGING_SETTLE_MIN_RATIO ?? 0.92),
  0.5,
  1,
);
if (STAGING_RED_COL >= STAGING_BLUE_COL) {
  throw new Error(
    `Invalid staging columns: RED=${STAGING_RED_COL}, BLUE=${STAGING_BLUE_COL}. RED must be < BLUE.`,
  );
}
if (
  ATTACK_TARGET_COL_BY_TEAM.RED <= STAGING_RED_COL ||
  ATTACK_TARGET_COL_BY_TEAM.BLUE >= STAGING_BLUE_COL
) {
  throw new Error(
    `Invalid attack offset: ${ATTACK_STOP_OFFSET_CELLS}. Produced attack target columns RED->${ATTACK_TARGET_COL_BY_TEAM.RED}, BLUE->${ATTACK_TARGET_COL_BY_TEAM.BLUE} with staging RED=${STAGING_RED_COL}, BLUE=${STAGING_BLUE_COL}.`,
  );
}
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

function isCommander(unit) {
  return unit?.unitType?.toUpperCase?.() === "COMMANDER";
}

function toWorld(cell) {
  return {
    x: (cell.col + 0.5) * (MAP_WIDTH / GRID_WIDTH),
    y: (cell.row + 0.5) * (MAP_HEIGHT / GRID_HEIGHT),
  };
}

function worldToCell(point) {
  const colBasis = point.x / (MAP_WIDTH / GRID_WIDTH) - 0.5;
  const rowBasis = point.y / (MAP_HEIGHT / GRID_HEIGHT) - 0.5;
  return {
    col: clamp(Math.round(colBasis), 0, GRID_WIDTH - 1),
    row: clamp(Math.round(rowBasis), 0, GRID_HEIGHT - 1),
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
      seed: TEST_PROFILE_SEED,
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

function countAliveUnitsDetailed(room) {
  let redTotal = 0;
  let blueTotal = 0;
  let redLine = 0;
  let blueLine = 0;
  let redCommanders = 0;
  let blueCommanders = 0;

  for (const unit of room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    const team = normalizeTeam(unit.team);
    const commander = isCommander(unit);
    if (team === "RED") {
      redTotal += 1;
      if (commander) {
        redCommanders += 1;
      } else {
        redLine += 1;
      }
      continue;
    }
    blueTotal += 1;
    if (commander) {
      blueCommanders += 1;
    } else {
      blueLine += 1;
    }
  }

  return {
    redTotal,
    blueTotal,
    redLine,
    blueLine,
    redCommanders,
    blueCommanders,
  };
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
    if (isCommander(unit)) {
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

function issueEquidistantStagingOrders({ roomStateSource, trackerByTeam }) {
  const lineUnitsByTeam = {
    RED: [],
    BLUE: [],
  };

  for (const unit of roomStateSource.state.units.values()) {
    if (!unit || unit.health <= 0 || isCommander(unit)) {
      continue;
    }
    const team = normalizeTeam(unit.team);
    if (team !== "RED" && team !== "BLUE") {
      continue;
    }
    const unitCell = worldToCell({ x: unit.x, y: unit.y });
    lineUnitsByTeam[team].push({
      unitId: unit.unitId,
      y: unit.y,
      currentCol: unitCell.col,
      currentRow: unitCell.row,
    });
  }

  const commandedUnitIds = [];
  const stagedCellByUnitId = new Map();
  const rowOffsets = buildAlternatingOffsets(Math.max(GRID_HEIGHT, LINE_UNITS_PER_TEAM));
  const centerRow = Math.floor(GRID_HEIGHT * 0.5);

  for (const team of ["RED", "BLUE"]) {
    const teamTracker = trackerByTeam[team];
    if (!teamTracker) {
      continue;
    }
    const targetCol = team === "RED" ? STAGING_RED_COL : STAGING_BLUE_COL;
    const units = lineUnitsByTeam[team];
    units.sort((a, b) => a.y - b.y);
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      const targetRow = clamp(centerRow + (rowOffsets[index] ?? 0), 0, GRID_HEIGHT - 1);
      stagedCellByUnitId.set(unit.unitId, { col: targetCol, row: targetRow });
      if (unit.currentCol === targetCol && unit.currentRow === targetRow) {
        continue;
      }
      teamTracker.room.send("unitPath", {
        unitId: unit.unitId,
        path: [toWorld({ col: targetCol, row: targetRow })],
        movementCommandMode: {
          rotateToFace: true,
          preferRoads: true,
        },
      });
      commandedUnitIds.push(unit.unitId);
    }
  }

  return {
    commandedUnitIds,
    redTargetCol: STAGING_RED_COL,
    blueTargetCol: STAGING_BLUE_COL,
    stagedCellByUnitId,
  };
}

function sendDistributedAdvanceOrders({
  attackerTracker,
  attackerTeam,
  stagedCellByUnitId,
  attackTargetColByTeam,
}) {
  const targetCol = attackTargetColByTeam[attackerTeam];
  const attackerUnits = [];

  for (const unit of attackerTracker.room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    if (normalizeTeam(unit.team) !== attackerTracker.team) {
      continue;
    }
    if (isCommander(unit)) {
      continue;
    }
    attackerUnits.push(unit);
  }
  attackerUnits.sort((a, b) => a.y - b.y);

  const commandedUnitIds = [];

  for (let index = 0; index < attackerUnits.length; index += 1) {
    const unit = attackerUnits[index];
    const currentCell = worldToCell({ x: unit.x, y: unit.y });
    const stagedCell = stagedCellByUnitId.get(unit.unitId);
    const targetRow = stagedCell?.row ?? currentCell.row;
    const targetCell = { col: targetCol, row: targetRow };
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

function computeFormationAlignment(room, targetCellByUnitId) {
  let total = 0;
  let aligned = 0;
  for (const [unitId, targetCell] of targetCellByUnitId) {
    const unit = room.state.units.get(unitId);
    if (!unit || unit.health <= 0) {
      continue;
    }
    total += 1;
    const currentCell = worldToCell({ x: unit.x, y: unit.y });
    if (currentCell.col === targetCell.col && currentCell.row === targetCell.row) {
      aligned += 1;
    }
  }
  return {
    aligned,
    total,
    ratio: total > 0 ? aligned / total : 1,
  };
}

function sendCommanderRetreatOrders(trackers) {
  const commandedUnitIds = [];
  for (const tracker of trackers) {
    if (tracker.team !== "RED" && tracker.team !== "BLUE") {
      continue;
    }
    const retreatCell =
      tracker.team === "RED"
        ? { col: 0, row: 0 }
        : { col: GRID_WIDTH - 1, row: GRID_HEIGHT - 1 };
    const retreatTarget = toWorld(retreatCell);
    for (const unit of tracker.room.state.units.values()) {
      if (!unit || unit.health <= 0) {
        continue;
      }
      if (normalizeTeam(unit.team) !== tracker.team || !isCommander(unit)) {
        continue;
      }
      tracker.room.send("unitPath", {
        unitId: unit.unitId,
        path: [retreatTarget],
        movementCommandMode: {
          rotateToFace: true,
          preferRoads: true,
        },
      });
      commandedUnitIds.push(unit.unitId);
    }
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

function getInfluenceScoreAtCell(room, col, row) {
  const grid = room?.state?.influenceGrid;
  if (!grid || !Number.isFinite(grid.width) || !Number.isFinite(grid.height)) {
    return 0;
  }
  if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) {
    return 0;
  }
  const index = row * grid.width + col;
  const value = grid.cells[index];
  return Number.isFinite(value) ? value : 0;
}

function computeBattleTelemetrySnapshot(room) {
  let redMoraleTotal = 0;
  let blueMoraleTotal = 0;
  let redUnits = 0;
  let blueUnits = 0;
  let redSuppliedMoraleTotal = 0;
  let blueSuppliedMoraleTotal = 0;
  let redSuppliedUnits = 0;
  let blueSuppliedUnits = 0;
  let redAlignedInfluenceTotal = 0;
  let blueAlignedInfluenceTotal = 0;
  let redInfluenceSamples = 0;
  let blueInfluenceSamples = 0;
  let redSupplyConnected = 0;
  let blueSupplyConnected = 0;
  let redSupplySamples = 0;
  let blueSupplySamples = 0;

  for (const unit of room.state.units.values()) {
    if (!unit || unit.health <= 0) {
      continue;
    }
    const team = normalizeTeam(unit.team);
    const morale = Number.isFinite(unit.moraleScore) ? unit.moraleScore : 0;
    const unitCell = worldToCell({ x: unit.x, y: unit.y });
    const influenceScore = getInfluenceScoreAtCell(room, unitCell.col, unitCell.row);
    const alignedInfluence = influenceScore * (team === "BLUE" ? 1 : -1);
    const isLineUnit = !isCommander(unit);
    const supplyLine = isLineUnit ? room.state.supplyLines.get(unit.unitId) : null;
    const isSuppliedLineUnit = isLineUnit && supplyLine?.connected === true;
    if (team === "RED") {
      redMoraleTotal += morale;
      redUnits += 1;
      redAlignedInfluenceTotal += alignedInfluence;
      redInfluenceSamples += 1;
      if (isSuppliedLineUnit) {
        redSuppliedMoraleTotal += morale;
        redSuppliedUnits += 1;
      }
      if (isLineUnit && supplyLine) {
        redSupplySamples += 1;
        if (supplyLine.connected) {
          redSupplyConnected += 1;
        }
      }
    } else {
      blueMoraleTotal += morale;
      blueUnits += 1;
      blueAlignedInfluenceTotal += alignedInfluence;
      blueInfluenceSamples += 1;
      if (isSuppliedLineUnit) {
        blueSuppliedMoraleTotal += morale;
        blueSuppliedUnits += 1;
      }
      if (isLineUnit && supplyLine) {
        blueSupplySamples += 1;
        if (supplyLine.connected) {
          blueSupplyConnected += 1;
        }
      }
    }
  }
  return {
    morale: {
      redAverage: redUnits > 0 ? redMoraleTotal / redUnits : 0,
      blueAverage: blueUnits > 0 ? blueMoraleTotal / blueUnits : 0,
    },
    suppliedLineMorale: {
      redAverage: redSuppliedUnits > 0 ? redSuppliedMoraleTotal / redSuppliedUnits : 0,
      blueAverage: blueSuppliedUnits > 0 ? blueSuppliedMoraleTotal / blueSuppliedUnits : 0,
      redUnits: redSuppliedUnits,
      blueUnits: blueSuppliedUnits,
    },
    alignedInfluence: {
      redAverage: redInfluenceSamples > 0 ? redAlignedInfluenceTotal / redInfluenceSamples : 0,
      blueAverage:
        blueInfluenceSamples > 0 ? blueAlignedInfluenceTotal / blueInfluenceSamples : 0,
    },
    supplyConnectedRatio: {
      redAverage: redSupplySamples > 0 ? redSupplyConnected / redSupplySamples : 1,
      blueAverage: blueSupplySamples > 0 ? blueSupplyConnected / blueSupplySamples : 1,
    },
  };
}

function createMoraleSampler(room) {
  const accumulator = {
    sampleCount: 0,
    redMoraleAverageSum: 0,
    blueMoraleAverageSum: 0,
    redSuppliedLineMoraleAverageSum: 0,
    blueSuppliedLineMoraleAverageSum: 0,
    redAlignedInfluenceAverageSum: 0,
    blueAlignedInfluenceAverageSum: 0,
    redSupplyConnectedRatioAverageSum: 0,
    blueSupplyConnectedRatioAverageSum: 0,
    bothSuppliedSampleCount: 0,
    bothSuppliedRedMoraleAverageSum: 0,
    bothSuppliedBlueMoraleAverageSum: 0,
    bothSuppliedRedSuppliedLineMoraleAverageSum: 0,
    bothSuppliedBlueSuppliedLineMoraleAverageSum: 0,
  };

  const sample = () => {
    const snapshot = computeBattleTelemetrySnapshot(room);
    accumulator.redMoraleAverageSum += snapshot.morale.redAverage;
    accumulator.blueMoraleAverageSum += snapshot.morale.blueAverage;
    accumulator.redSuppliedLineMoraleAverageSum += snapshot.suppliedLineMorale.redAverage;
    accumulator.blueSuppliedLineMoraleAverageSum += snapshot.suppliedLineMorale.blueAverage;
    accumulator.redAlignedInfluenceAverageSum += snapshot.alignedInfluence.redAverage;
    accumulator.blueAlignedInfluenceAverageSum += snapshot.alignedInfluence.blueAverage;
    accumulator.redSupplyConnectedRatioAverageSum += snapshot.supplyConnectedRatio.redAverage;
    accumulator.blueSupplyConnectedRatioAverageSum += snapshot.supplyConnectedRatio.blueAverage;
    if (
      snapshot.supplyConnectedRatio.redAverage >= 0.999 &&
      snapshot.supplyConnectedRatio.blueAverage >= 0.999
    ) {
      accumulator.bothSuppliedSampleCount += 1;
      accumulator.bothSuppliedRedMoraleAverageSum += snapshot.morale.redAverage;
      accumulator.bothSuppliedBlueMoraleAverageSum += snapshot.morale.blueAverage;
      accumulator.bothSuppliedRedSuppliedLineMoraleAverageSum +=
        snapshot.suppliedLineMorale.redAverage;
      accumulator.bothSuppliedBlueSuppliedLineMoraleAverageSum +=
        snapshot.suppliedLineMorale.blueAverage;
    }
    accumulator.sampleCount += 1;
  };

  sample();
  const timer = setInterval(sample, 250);

  return () => {
    clearInterval(timer);
    sample();
    const sampleCount = Math.max(1, accumulator.sampleCount);
    const finalSnapshot = computeBattleTelemetrySnapshot(room);
    return {
      redAverageDuringBattle: accumulator.redMoraleAverageSum / sampleCount,
      blueAverageDuringBattle: accumulator.blueMoraleAverageSum / sampleCount,
      redAverageFinal: finalSnapshot.morale.redAverage,
      blueAverageFinal: finalSnapshot.morale.blueAverage,
      redSuppliedLineAverageDuringBattle:
        accumulator.redSuppliedLineMoraleAverageSum / sampleCount,
      blueSuppliedLineAverageDuringBattle:
        accumulator.blueSuppliedLineMoraleAverageSum / sampleCount,
      redSuppliedLineAverageFinal: finalSnapshot.suppliedLineMorale.redAverage,
      blueSuppliedLineAverageFinal: finalSnapshot.suppliedLineMorale.blueAverage,
      redSuppliedLineUnitsFinal: finalSnapshot.suppliedLineMorale.redUnits,
      blueSuppliedLineUnitsFinal: finalSnapshot.suppliedLineMorale.blueUnits,
      redAlignedInfluenceAverageDuringBattle:
        accumulator.redAlignedInfluenceAverageSum / sampleCount,
      blueAlignedInfluenceAverageDuringBattle:
        accumulator.blueAlignedInfluenceAverageSum / sampleCount,
      redAlignedInfluenceAverageFinal: finalSnapshot.alignedInfluence.redAverage,
      blueAlignedInfluenceAverageFinal: finalSnapshot.alignedInfluence.blueAverage,
      redSupplyConnectedRatioDuringBattle:
        accumulator.redSupplyConnectedRatioAverageSum / sampleCount,
      blueSupplyConnectedRatioDuringBattle:
        accumulator.blueSupplyConnectedRatioAverageSum / sampleCount,
      redSupplyConnectedRatioFinal: finalSnapshot.supplyConnectedRatio.redAverage,
      blueSupplyConnectedRatioFinal: finalSnapshot.supplyConnectedRatio.blueAverage,
      bothSuppliedSampleCount: accumulator.bothSuppliedSampleCount,
      bothSuppliedRedMoraleAverage:
        accumulator.bothSuppliedSampleCount > 0
          ? accumulator.bothSuppliedRedMoraleAverageSum /
            accumulator.bothSuppliedSampleCount
          : 0,
      bothSuppliedBlueMoraleAverage:
        accumulator.bothSuppliedSampleCount > 0
          ? accumulator.bothSuppliedBlueMoraleAverageSum /
            accumulator.bothSuppliedSampleCount
          : 0,
      bothSuppliedRedSuppliedLineMoraleAverage:
        accumulator.bothSuppliedSampleCount > 0
          ? accumulator.bothSuppliedRedSuppliedLineMoraleAverageSum /
            accumulator.bothSuppliedSampleCount
          : 0,
      bothSuppliedBlueSuppliedLineMoraleAverage:
        accumulator.bothSuppliedSampleCount > 0
          ? accumulator.bothSuppliedBlueSuppliedLineMoraleAverageSum /
            accumulator.bothSuppliedSampleCount
          : 0,
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
  const commanderRetreatSnapshot = captureUnitsSnapshot(trackers[0].room);
  const retreatCommanderIds = sendCommanderRetreatOrders(trackers);
  if (retreatCommanderIds.length > 0) {
    await waitFor(
      () => {
        const moved = countMovedUnits(
          trackers[0].room,
          retreatCommanderIds,
          commanderRetreatSnapshot,
          1,
        );
        return moved >= Math.max(1, Math.floor(retreatCommanderIds.length * 0.5))
          ? moved
          : null;
      },
      8_000,
      100,
      "commander retreat movement",
    );
  }

  const stagingSnapshot = captureUnitsSnapshot(trackers[0].room);
  const staging = issueEquidistantStagingOrders({
    roomStateSource: trackers[0].room,
    trackerByTeam,
  });
  const stagingAlignment = await waitFor(
    () => {
      const moved = countMovedUnits(
        trackers[0].room,
        staging.commandedUnitIds,
        stagingSnapshot,
        1,
      );
      const alignment = computeFormationAlignment(
        trackers[0].room,
        staging.stagedCellByUnitId,
      );
      if (alignment.ratio < STAGING_SETTLE_MIN_RATIO) {
        return null;
      }
      return {
        moved,
        ...alignment,
      };
    },
    STAGING_SETTLE_TIMEOUT_MS,
    100,
    "equidistant staging alignment",
  );

  const stopMoraleSampler = createMoraleSampler(trackers[0].room);
  const initialDetailedCounts = countAliveUnitsDetailed(trackers[0].room);
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
  const preOrderSnapshot = captureUnitsSnapshot(trackers[0].room);
  const commandedUnitIds = sendDistributedAdvanceOrders({
    attackerTracker,
    attackerTeam,
    stagedCellByUnitId: staging.stagedCellByUnitId,
    attackTargetColByTeam: ATTACK_TARGET_COL_BY_TEAM,
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

  const minimumMovedUnits = Math.max(
    1,
    Math.floor(commandedUnitIds.length * 0.2),
  );
  const movedCount = await waitFor(
    () => {
      const moved = countMovedUnits(
        trackers[0].room,
        commandedUnitIds,
        preOrderSnapshot,
        1,
      );
      return moved >= minimumMovedUnits ? moved : null;
    },
    12_000,
    100,
    "attacker movement",
  );

  let healthLossCount = 0;
  try {
    healthLossCount = await waitFor(
      () => {
        const losses = countUnitsWithHealthLoss(trackers[0].room, preOrderSnapshot);
        return losses > 0 ? losses : null;
      },
      Math.max(1_000, BATTLE_TIMEOUT_MS - 2_000),
      150,
      "combat engagement (health loss)",
    );
  } catch {
    healthLossCount = 0;
  }

  const diagnostics = {
    attackerTeam,
    stagingRedCol: staging.redTargetCol,
    stagingBlueCol: staging.blueTargetCol,
    attackTargetCol: ATTACK_TARGET_COL_BY_TEAM[attackerTeam],
    stagingAlignedUnits: stagingAlignment.aligned,
    stagingAlignmentTotalUnits: stagingAlignment.total,
    stagingAlignmentRatio: stagingAlignment.ratio,
    stagingMovedUnits: stagingAlignment.moved,
    commandedUnits: commandedUnitIds.length,
    ackedUnits: ackedCount,
    movedUnits: movedCount,
    unitsWithHealthLoss: healthLossCount,
  };

  try {
    const outcome = await waitForBattleEnd(trackers);
    const lineUnitCounts = countAliveUnitsByTeam(trackers[0].room);
    const finalDetailedCounts = countAliveUnitsDetailed(trackers[0].room);
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
      redUnits: lineUnitCounts.red,
      blueUnits: lineUnitCounts.blue,
      totalUnitsBefore: {
        red: initialDetailedCounts.redTotal,
        blue: initialDetailedCounts.blueTotal,
      },
      totalUnitsAfter: {
        red: finalDetailedCounts.redTotal,
        blue: finalDetailedCounts.blueTotal,
      },
      completion: "BATTLE_ENDED",
      diagnostics,
      morale: stopMoraleSampler(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Timed out waiting for battle end")
    ) {
      const finalDetailedCounts = countAliveUnitsDetailed(trackers[0].room);
      return {
        ...buildSnapshotOutcome(trackers[0].room),
        totalUnitsBefore: {
          red: initialDetailedCounts.redTotal,
          blue: initialDetailedCounts.blueTotal,
        },
        totalUnitsAfter: {
          red: finalDetailedCounts.redTotal,
          blue: finalDetailedCounts.blueTotal,
        },
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
        }),
      });
    }

    console.log("Scenario:");
    console.log("- Map: grass-only blocks (water/forest/hills/mountains removed)");
    console.log("- Cities: one home city per side, no neutral/friendly extra cities");
    console.log("- Formation: city-front (home city behind each side's line)");
    console.log("- Units: 40 per side (39 line + 1 commander)");
    console.log(`- Seed: ${TEST_PROFILE_SEED}`);
    console.log(
      `- Staging: scripted start columns RED=${STAGING_RED_COL}, BLUE=${STAGING_BLUE_COL}`,
    );
    console.log(
      `- Advance targets: RED->${ATTACK_TARGET_COL_BY_TEAM.RED}, BLUE->${ATTACK_TARGET_COL_BY_TEAM.BLUE} (offset ${ATTACK_STOP_OFFSET_CELLS} from defender line)`,
    );
    console.log("- Movement target: attacker line advances directly toward defender line");
    console.log("- Commander handling: commanders are moved away from the battle line");
    console.log("- Debug tuning: fast move/combat, low health, city spawn enabled");
    console.log(`- Cap: ${Math.round(BATTLE_TIMEOUT_MS / 1000)}s per direction`);
    console.log("");
    for (const { label, outcome } of outcomes) {
      const attackerTeam = outcome.diagnostics.attackerTeam;
      const defenderTeam = attackerTeam === "RED" ? "BLUE" : "RED";
      const attackerMoraleDuring =
        attackerTeam === "RED"
          ? outcome.morale.redAverageDuringBattle
          : outcome.morale.blueAverageDuringBattle;
      const defenderMoraleDuring =
        defenderTeam === "RED"
          ? outcome.morale.redAverageDuringBattle
          : outcome.morale.blueAverageDuringBattle;
      const attackerInfluenceDuring =
        attackerTeam === "RED"
          ? outcome.morale.redAlignedInfluenceAverageDuringBattle
          : outcome.morale.blueAlignedInfluenceAverageDuringBattle;
      const defenderInfluenceDuring =
        defenderTeam === "RED"
          ? outcome.morale.redAlignedInfluenceAverageDuringBattle
          : outcome.morale.blueAlignedInfluenceAverageDuringBattle;
      const attackerSupplyDuring =
        attackerTeam === "RED"
          ? outcome.morale.redSupplyConnectedRatioDuringBattle
          : outcome.morale.blueSupplyConnectedRatioDuringBattle;
      const defenderSupplyDuring =
        defenderTeam === "RED"
          ? outcome.morale.redSupplyConnectedRatioDuringBattle
          : outcome.morale.blueSupplyConnectedRatioDuringBattle;
      console.log(
        `${label} -> winner=${outcome.winner}, RED left=${outcome.redUnits}, BLUE left=${outcome.blueUnits}, reason=${outcome.reason}, completion=${outcome.completion}`,
      );
      console.log(
        `  totals (all units): before RED=${outcome.totalUnitsBefore.red} BLUE=${outcome.totalUnitsBefore.blue} | after RED=${outcome.totalUnitsAfter.red} BLUE=${outcome.totalUnitsAfter.blue}`,
      );
      console.log(
        `  diagnostics: attacker=${outcome.diagnostics.attackerTeam} stagingRedCol=${outcome.diagnostics.stagingRedCol} stagingBlueCol=${outcome.diagnostics.stagingBlueCol} attackTargetCol=${outcome.diagnostics.attackTargetCol} stagingAligned=${outcome.diagnostics.stagingAlignedUnits}/${outcome.diagnostics.stagingAlignmentTotalUnits} (${(outcome.diagnostics.stagingAlignmentRatio * 100).toFixed(1)}%) stagingMoved=${outcome.diagnostics.stagingMovedUnits} commanded=${outcome.diagnostics.commandedUnits} acked=${outcome.diagnostics.ackedUnits} moved=${outcome.diagnostics.movedUnits} healthLoss=${outcome.diagnostics.unitsWithHealthLoss}`,
      );
      console.log(
        `  morale: avgDuringBattle RED=${outcome.morale.redAverageDuringBattle.toFixed(2)} BLUE=${outcome.morale.blueAverageDuringBattle.toFixed(2)} | final RED=${outcome.morale.redAverageFinal.toFixed(2)} BLUE=${outcome.morale.blueAverageFinal.toFixed(2)} | samples=${outcome.morale.sampleCount}`,
      );
      console.log(
        `  supplied-line morale: avgDuringBattle RED=${outcome.morale.redSuppliedLineAverageDuringBattle.toFixed(2)} BLUE=${outcome.morale.blueSuppliedLineAverageDuringBattle.toFixed(2)} | final RED=${outcome.morale.redSuppliedLineAverageFinal.toFixed(2)} BLUE=${outcome.morale.blueSuppliedLineAverageFinal.toFixed(2)} | finalSuppliedUnits RED=${outcome.morale.redSuppliedLineUnitsFinal} BLUE=${outcome.morale.blueSuppliedLineUnitsFinal}`,
      );
      console.log(
        `  both-fully-supplied window: moraleAvg RED=${outcome.morale.bothSuppliedRedMoraleAverage.toFixed(2)} BLUE=${outcome.morale.bothSuppliedBlueMoraleAverage.toFixed(2)} | suppliedLineMoraleAvg RED=${outcome.morale.bothSuppliedRedSuppliedLineMoraleAverage.toFixed(2)} BLUE=${outcome.morale.bothSuppliedBlueSuppliedLineMoraleAverage.toFixed(2)} | samples=${outcome.morale.bothSuppliedSampleCount}`,
      );
      console.log(
        `  role telemetry: attacker=${attackerTeam} moraleAvg=${attackerMoraleDuring.toFixed(2)} influenceAvg=${attackerInfluenceDuring.toFixed(2)} supplyConnectedAvg=${(attackerSupplyDuring * 100).toFixed(1)}% | defender=${defenderTeam} moraleAvg=${defenderMoraleDuring.toFixed(2)} influenceAvg=${defenderInfluenceDuring.toFixed(2)} supplyConnectedAvg=${(defenderSupplyDuring * 100).toFixed(1)}%`,
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
