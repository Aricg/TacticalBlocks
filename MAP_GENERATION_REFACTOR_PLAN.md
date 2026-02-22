# Map Generation Refactor Plan

## Context and Goal
The current map-generation path works, but it is difficult to evolve safely because generation, runtime application, and gameplay systems are tightly coupled across scripts and server room logic. The goal of this refactor is to make map generation extensible so users can choose:
- Number of cities and neutral cities
- River count/style and water mode
- Mountain and forest density
- Starting unit count
- Starting unit layout strategy (line/wedge/city-front/etc.)
- Generation mode (`noise`, `wfc`, `auto`, and future modes)

while keeping runtime map switching stable (no server restart required).

## Key Findings (Current Risks)

1. Orchestration is centralized in `BattleRoom`
- `BattleRoom` currently handles lobby requests, process spawning, runtime terrain loading, city anchor fallbacks, map switching, and unit reset/spawn.
- High-churn methods: `handleLobbyGenerateMapMessage`, `rebuildRuntimeBlockedSpawnCellIndexSet`, `applyLobbyMapSelection`, `spawnTestUnits`.

2. Generator script is monolithic
- `shared/scripts/generate-random-map.mjs` contains: argument parsing, RNG, mode selection, water planning, WFC/noise generation, validation, city placement, image/elevation writing, and sync.
- This creates high regression risk when adding new controls.

3. Data model is split between static and runtime sources
- Runtime map sidecar (`*.elevation-grid.json`) is loaded on server for some decisions.
- Static generated `shared/src/terrainGrid.ts` still backs other terrain/city/elevation lookups.
- This mixed-source model is a likely cause of "works only after restart" behavior.

4. Spawn layout logic is not modular
- Starting force and commander placement are hardcoded in `spawnTestUnits`.
- City-based generated unit spawn is separate (`CitySpawnSystem`).
- No single strategy abstraction for initial deployment layouts.

5. Network contract is too narrow for desired customization
- `LobbyGenerateMapMessage` only carries `method?: MapGenerationMethod`.
- No typed place to send generation profile options.

6. Generated map identity behavior is constrained
- `LobbyService.getGeneratedMapId()` prefers an existing `random-*` id.
- Repeated generation tends to overwrite one slot rather than create selectable variants.

## Target Architecture

### 1. Single Runtime Source of Truth: `MapBundle`
Introduce a typed runtime bundle used by server systems for active map decisions:
- `mapId`, `revision`, `method`, `seed`
- `gridWidth`, `gridHeight`
- `terrainCodeGrid`
- `elevationBytes`
- `cityAnchors`, `neutralCityAnchors`
- `spawnMask` / `impassableMask`
- optional `initialSpawnPlan` metadata

Principle: gameplay/runtime decisions must read from `MapBundle` for active maps, not from mixed static/runtime paths.

### 2. Generation Pipeline Modules
Split `generate-random-map.mjs` into composable modules:
- `generation/engines/noise.ts`
- `generation/engines/wfc.ts`
- `generation/passes/water.ts`
- `generation/passes/cities.ts`
- `generation/passes/starting-forces.ts` (optional metadata only)
- `generation/passes/validation.ts`
- `generation/io/writeArtifacts.ts`
- `generation/io/syncMaps.ts`

Keep a thin CLI wrapper for argument parsing and orchestration.

### 3. Configurable `GenerationProfile`
Define a profile schema shared by client/server/generator:
- `method`, `seed`
- terrain controls: `waterMode`, `riverCount`, `mountainDensity`, `forestDensity`
- city controls: `teamCityCount`, `neutralCityCount`, placement constraints
- starting force controls: `unitCountPerTeam`, `commanderCount`, `layoutStrategy`

Add validation and defaults in one place.

### 4. Server Services
Extract from `BattleRoom`:
- `MapGenerationService`: executes generator and returns artifact metadata.
- `MapRuntimeService`: loads/parses `MapBundle`, caches active bundle, applies map switch.
- `StartingForcePlanner`: computes initial spawn set from `MapBundle + profile`.

`BattleRoom` should orchestrate these services, not implement their algorithms.

### 5. Spawn Strategy Abstraction
Replace hardcoded initial deployment with strategy interface:
- `computeInitialSpawns(strategy, context): SpawnPlan`
- Implement strategies incrementally: `battle-line`, `city-front`, `mirrored-grid`, `wedge`.

## Implementation Checklist

### Stabilization (Already Completed)
- [x] Disable runtime `map:sync` in lobby generation (`--no-sync`) so runtime map generation does not rewrite shared TS files.
- [x] Move runtime-generated map IDs to a dedicated prefix (`runtime-generated-*`) to separate runtime artifacts from curated/static maps.
- [x] Ignore runtime-generated map artifacts in `.gitignore` (`shared/runtime-generated-*.png`, `shared/runtime-generated-*.elevation-grid.json`).

### Stability Gap Closures (Short Term)
- [x] Add `server` dev script for parity testing without file-watch restarts (`tsx src/index.ts`).
- [ ] Optionally add `tsx watch --exclude` patterns for runtime artifact paths if watch mode remains default.
- [x] Add atomic write + validate-before-apply for runtime map artifacts (image + sidecar).
- [x] Add a documented manual smoke flow: generate/apply/switch map multiple times in one process and verify map/layer consistency.

### Phase 0: Safety Nets (No Behavior Change)
- [x] Add telemetry/log markers for map revision, active map ID, and map-bundle source.
- [x] Add a repeatable manual validation checklist for lobby generation + map switching behavior.
- [ ] Done when current behavior is baselined with logs and manual validation steps before structural changes.

### Phase 1: `MapBundle` + Runtime Loader
- [x] Add `MapBundle` types in shared/server.
- [x] Add sidecar loader/parser with fallback semantics.
- [x] Migrate `BattleRoom` terrain reads to active `MapBundle`.
- [x] Migrate `BattleRoom` city anchor/neutral city reads to active `MapBundle`.
- [x] Migrate spawn blocking/impassable mask reads to active `MapBundle`.
- [ ] Done when map generation + map swap works without server restart.
- [ ] Done when runtime decisions no longer depend on mixed static/runtime terrain for generated maps.

### Cross-Cutting Checklist: Elevation/Terrain Convergence
- [ ] Server runtime path: generated maps use `MapBundle.elevationBytes` + `MapBundle.terrainCodeGrid` for all gameplay decisions (movement, morale/slope, spawn blocking, impassable checks, supply/path severing).
- [ ] Server static fallback path: when no sidecar exists, static `terrainGrid.ts` remains the only source for that map (no mixed per-system source).
- [ ] Eliminate direct static terrain/elevation reads inside server gameplay loops for generated-map decisions (grep guard: `rg "getGridCellTerrainType|getGridCellElevation|getGridCellPaletteElevationByte" server/src`).
- [ ] Keep sidecar schema validation strict (dimensions/lengths/types) and reject invalid artifacts before apply.
- [ ] Verify no-restart runtime map cycle at least 3 times using the smoke flow; confirm map visuals, city anchors, and gameplay blocking remain aligned each cycle.
- [ ] Client parity note: document that client still uses static/shared elevation sources for rendering until a runtime elevation feed is introduced, and track this separately from server gameplay correctness.

### Phase 2: Extract Server Services
- [ ] Introduce `MapGenerationService` (process execution + artifact metadata handling).
- [ ] Introduce `MapRuntimeService` (load/parse/cache/apply active map bundle).
- [ ] Move map-switch orchestration from `BattleRoom` into services.
- [ ] Keep `BattleRoom` as coordinator only.
- [ ] Add explicit error handling paths for missing script, parse error, and invalid sidecar.
- [ ] Done when `BattleRoom` map-related methods are significantly reduced.

### Phase 3: Generator Modularization
- [ ] Split `generate-random-map.mjs` into engine modules (`noise`, `wfc`).
- [ ] Split terrain/city/water/validation logic into composable passes.
- [ ] Split artifact writing and sync logic into IO modules.
- [ ] Keep CLI interface and outputs backward-compatible.
- [ ] Done when `generate-random-map` entry behavior remains stable.

### Phase 4: `GenerationProfile` End-to-End
- [ ] Define `GenerationProfile` schema (method, seed, terrain, city, starting-force settings).
- [ ] Extend shared network contract to include profile payload on generate-map requests.
- [ ] Add client lobby controls and profile serialization.
- [ ] Add server-side profile validation/defaulting with strict bounds.
- [ ] Pipe validated profile into generation pipeline.
- [ ] Done when users can control city/river/mountain/forest/unit/layout settings from lobby.
- [ ] Done when invalid profile input is rejected safely with clear errors/logs.

### Phase 5: Spawn/Layout Strategy System
- [ ] Replace `spawnTestUnits` with `StartingForcePlanner`.
- [ ] Introduce `computeInitialSpawns(strategy, context): SpawnPlan`.
- [ ] Implement `battle-line` strategy.
- [ ] Implement `city-front` strategy.
- [ ] Implement `mirrored-grid` strategy.
- [ ] Implement `wedge` strategy.
- [ ] Add invariant checks: no blocked spawn, symmetry expectations, commander placement rules.
- [ ] Done when layout is switchable per profile and spawn invariants hold across generated maps.

## Compatibility and Migration Notes
- Keep sidecar format backward-compatible while introducing `MapBundle` fields.
- If a new field is missing, loader applies defaults and logs a warning.
- Maintain `terrainGrid.ts` generation for static/fallback use during migration.
- Do not remove old paths until runtime map consumers are fully migrated.

## Risk Register

1. Runtime/static divergence during migration
- Mitigation: route runtime decisions through `MapBundle` first; keep static fallback only as compatibility.

2. WFC instability with new options
- Mitigation: explicit retry budgets, post-validation passes, deterministic seeds for repro.

3. Client/server contract drift
- Mitigation: shared types in `shared/src/networkContracts.ts`, strict runtime validation.

4. Growing option complexity
- Mitigation: validated `GenerationProfile` schema + per-mode capability flags.

## Immediate Next Slice (Recommended)
1. Implement `MapBundle` types + loader.
2. Migrate `BattleRoom` terrain/city/spawn-mask reads to `MapBundle`.
3. Add a manual no-restart smoke runbook proving repeated generation/apply in a single session.

This slice gives the biggest stability improvement and unlocks safe feature work on generation controls.
