# TacticalBlocks Smoke Test Checklist

Use this checklist before and after each refactor slice.

## Required Typecheck Gate (Every Slice)
Run both:

```bash
npm --prefix client run typecheck
npm --prefix server run typecheck
```

## Runtime Map Generation Smoke Flow (No Restart)
Use this flow after map-generation or map-loading changes to confirm one-process
runtime map switching works.

1. Start server without file-watch restarts:

```bash
cd /Users/agardner/Github/TacticalBlocks/server
npm run dev:nowatch
```

2. Start client in a separate terminal:

```bash
cd /Users/agardner/Github/TacticalBlocks/client
npm run dev
```

3. In lobby, run this cycle at least 3 times without restarting server:
   - Click `Generate Map` (alternate methods: `wfc`, `noise`, `auto`).
   - Wait for lobby map revision to increment.
   - Start battle, then verify:
     - Units spawn on playable terrain.
     - City ownership/influence markers align with visible map cities.
     - Movement pathing blocks mountains and allows water transitions as expected.
   - End/exit battle to return to lobby.

4. During each cycle, check server logs include:
   - `[map-bundle] revision=<n> mapId=<id> source=<runtime-sidecar|static-fallback> method=<...>`

5. Failure conditions:
   - Generated map appears mismatched vs gameplay collisions/city positions.
   - Switching maps requires server restart to take effect.
   - Runtime sidecar parse warnings for valid generated maps.

## Automated Lobby Cycle Smoke (Optional)
Use this to validate 3 no-restart generate/apply cycles from terminal.

1. Start server without file-watch restarts:

```bash
cd /Users/agardner/Github/TacticalBlocks/server
npm run dev:nowatch
```

2. In a second terminal, run:

```bash
cd /Users/agardner/Github/TacticalBlocks/client
node ./scripts/runtime-map-cycle-smoke.mjs
```

Expected: script exits successfully and prints one line per cycle with incrementing `mapRevision`.
