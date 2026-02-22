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

## Refactor Phases

## Phase 0: Safety Nets (No Behavior Change)
- Add characterization tests for:
  - map generation request flow
  - map application/swap in lobby
  - terrain blocking behavior
  - city anchors and neutral city refresh
  - initial spawn cardinality and symmetry
- Add telemetry/log markers for map revision, active map id, and bundle source.

Exit criteria:
- Existing behavior is captured by tests before structural changes.

## Phase 1: Introduce `MapBundle` and Runtime Loader
- Add `MapBundle` types and parser in shared/server.
- Build loader for sidecar artifacts with fallback semantics.
- Update `BattleRoom` terrain/city/spawn-mask reads to use active bundle.

Exit criteria:
- Map generation + map swap works without server restart.
- Runtime decisions no longer rely on mixed static/runtime terrain for active generated maps.

## Phase 2: Extract Server Services
- Move generation process execution out of `BattleRoom` into `MapGenerationService`.
- Move map apply/reload logic into `MapRuntimeService`.
- Keep `BattleRoom` as workflow coordinator.

Exit criteria:
- `BattleRoom` map-related methods significantly reduced.
- Service unit tests cover failure paths (missing script, parse errors, bad sidecar).

## Phase 3: Generator Modularization
- Split generation file into engine/passes/io modules.
- Preserve CLI behavior and output artifacts.
- Keep output compatibility with existing sync tooling.

Exit criteria:
- `generate-random-map` entry remains stable.
- New modules have unit tests for engine/passes.

## Phase 4: Add `GenerationProfile` End-to-End
- Extend network message contract to carry profile options.
- Add client UI controls in lobby and serialize profile.
- Add server validation for profile bounds and defaults.
- Pass profile into generation pipeline.

Exit criteria:
- Users can adjust city/river/mountain/forest/unit/layout settings from lobby.
- Invalid profile input is rejected safely with clear logs/errors.

## Phase 5: Spawn/Layout Strategy System
- Replace hardcoded `spawnTestUnits` logic with `StartingForcePlanner`.
- Implement configurable layouts and count settings.
- Ensure spawn obeys blocked/impassable/city constraints.

Exit criteria:
- Layout can be switched per generation/profile.
- Spawn invariants hold across generated maps.

## Compatibility and Migration Notes
- Keep sidecar format backward-compatible while introducing `MapBundle` fields.
- If a new field is missing, loader applies defaults and logs a warning.
- Maintain `terrainGrid.ts` generation for static/fallback use during migration.
- Do not remove old paths until runtime map consumers are fully migrated.

## Test Strategy

1. Unit tests
- `GenerationProfile` validation and defaulting
- `MapBundle` parsing and fallback behavior
- Spawn strategies and constraint handling
- WFC/noise module-level invariants

2. Integration tests
- Lobby generate-map request -> artifact generation -> server apply -> client revision update
- Re-generate map multiple times in one server session without restart
- Map swap preserves gameplay loop integrity

3. Invariant/property checks
- Team anchors always on playable cells
- Required city counts satisfied or gracefully degraded
- Spawn cells never on blocked mask
- Terrain ratios within configured bounds

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
3. Add integration test proving repeated generation/apply in a single session without restart.

This slice gives the biggest stability improvement and unlocks safe feature work on generation controls.
