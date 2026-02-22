import { Client } from "colyseus.js";

const SERVER_URL = process.env.TB_SMOKE_SERVER_URL ?? "ws://localhost:2567";
const CYCLES = 3;
const TIMEOUT_MS = 15000;

const cycleProfiles = [
  {
    method: "wfc",
    profile: {
      terrain: { waterMode: "river", riverCount: 2, mountainDensity: 0.03, forestDensity: 0.08 },
      cities: { neutralCityCount: 3 },
      startingForces: { layoutStrategy: "battle-line", unitCountPerTeam: 24 },
    },
  },
  {
    method: "noise",
    profile: {
      terrain: { waterMode: "lake", riverCount: 0, mountainDensity: 0.05, forestDensity: 0.12 },
      cities: { neutralCityCount: 4 },
      startingForces: { layoutStrategy: "mirrored-grid", unitCountPerTeam: 32 },
    },
  },
  {
    method: "auto",
    profile: {
      terrain: { waterMode: "none", riverCount: 0, mountainDensity: 0.01, forestDensity: 0.04 },
      cities: { neutralCityCount: 2 },
      startingForces: { layoutStrategy: "wedge", unitCountPerTeam: 16 },
    },
  },
];

function waitForCondition(room, predicate, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    let timeout = null;
    let removeListener = null;
    const handler = (message) => {
      try {
        if (!predicate(message)) {
          return;
        }
        cleanup();
        resolve(message);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const cleanup = () => {
      if (typeof removeListener === "function") {
        removeListener();
        removeListener = null;
      }
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${label}.`));
    }, timeoutMs);
    removeListener = room.onMessage("lobbyState", handler);
  });
}

async function main() {
  const client = new Client(SERVER_URL);
  const room = await client.joinOrCreate("battle");
  room.onMessage("teamAssigned", () => {});
  room.onMessage("runtimeTuningSnapshot", () => {});
  let lastLobbyState = null;
  room.onMessage("lobbyState", (message) => {
    lastLobbyState = message;
  });

  // Ensure we have initial lobby state.
  if (!lastLobbyState) {
    lastLobbyState = await waitForCondition(
      room,
      (message) => message?.phase === "LOBBY",
      TIMEOUT_MS,
      "initial lobby state",
    );
  }

  console.log(
    `[smoke] connected room=${room.roomId} map=${lastLobbyState.mapId} revision=${lastLobbyState.mapRevision}`,
  );

  for (let cycleIndex = 0; cycleIndex < CYCLES; cycleIndex += 1) {
    const profileSpec = cycleProfiles[cycleIndex] ?? cycleProfiles[cycleProfiles.length - 1];
    const startRevision = lastLobbyState.mapRevision ?? 0;
    room.send("lobbyGenerateMap", {
      method: profileSpec.method,
      profile: profileSpec.profile,
    });

    await waitForCondition(
      room,
      (message) => message?.phase === "LOBBY" && message?.isGeneratingMap === true,
      TIMEOUT_MS,
      `generation start cycle ${cycleIndex + 1}`,
    );

    const completedLobbyState = await waitForCondition(
      room,
      (message) =>
        message?.phase === "LOBBY" &&
        message?.isGeneratingMap === false &&
        typeof message?.mapRevision === "number" &&
        message.mapRevision > startRevision,
      TIMEOUT_MS,
      `generation completion cycle ${cycleIndex + 1}`,
    );

    const neutralAnchors = Array.isArray(completedLobbyState.neutralCityAnchors)
      ? completedLobbyState.neutralCityAnchors
      : [];
    if (neutralAnchors.length !== profileSpec.profile.cities.neutralCityCount) {
      throw new Error(
        `Cycle ${cycleIndex + 1}: expected ${profileSpec.profile.cities.neutralCityCount} neutral cities, got ${neutralAnchors.length}.`,
      );
    }

    if (
      !completedLobbyState.cityAnchors ||
      !completedLobbyState.cityAnchors.RED ||
      !completedLobbyState.cityAnchors.BLUE
    ) {
      throw new Error(`Cycle ${cycleIndex + 1}: missing city anchors in lobby state.`);
    }

    lastLobbyState = completedLobbyState;
    console.log(
      `[smoke] cycle=${cycleIndex + 1} method=${profileSpec.method} layout=${profileSpec.profile.startingForces.layoutStrategy} map=${completedLobbyState.mapId} revision=${completedLobbyState.mapRevision} neutrals=${neutralAnchors.length}`,
    );
  }

  await room.leave(true);
  console.log("[smoke] runtime map cycle smoke completed successfully.");
}

main().catch((error) => {
  console.error("[smoke] failed:", error);
  process.exit(1);
});
