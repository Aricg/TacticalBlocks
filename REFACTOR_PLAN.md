# TacticalBlocks Refactor Plan (AI-Friendly Iteration)

## Goal
Keep future feature work fast and safe by reducing file complexity, clarifying ownership, and enforcing small refactor slices.

## Current Hotspots
- `server/src/rooms/BattleRoom.ts` (~1760 LOC): orchestration + simulation + lobby + spawning + movement + morale/combat.
- `client/src/main.ts` (~1750 LOC): scene bootstrap + input + network sync + rendering updates + map/lobby flows.

## Refactor Rules (Apply to Every Slice)
1. One subsystem per slice.
2. No behavior change in cleanup slices.
3. Keep PRs small (target under ~300 changed lines when possible).
4. Add/keep tests where practical for extracted pure logic.
5. Run `npm run verify` for every code slice before merge.
6. Do not mix gameplay tuning changes with structural extraction.

## File Size / Responsibility Targets
- Target file size: generally <= 400-500 LOC for high-change files.
- A module should answer one question only (input handling, movement sim, morale scoring, lobby state, rendering pass, etc.).
- Keep top-level room/scene files as orchestrators.

## Phase 0: Baseline and Safety
1. Capture baseline behavior notes for lobby start, move commands, combat, city control, influence line, and morale display.
2. Add short smoke-check script/checklist for manual validation after each slice.
3. Confirm `npm run verify` is green before any refactor starts.

## Phase 1: Server Refactor (`BattleRoom.ts`)

### Slice 1.1 (Recommended Start): Morale/Influence Domain Extraction
- Extract from `BattleRoom.ts`:
  - unit morale score calculation
  - local field sampling around unit
  - influence advantage mapping used by combat modifiers
- Create pure domain module(s), e.g.:
  - `server/src/systems/morale/MoraleSystem.ts`
  - `server/src/systems/morale/moraleMath.ts`
- Keep `BattleRoom` calling these modules; no rule changes.

### Slice 1.2: Movement and Path Execution
- Extract path stepping, destination facing, occupancy-aware movement checks.
- Candidate module(s):
  - `server/src/systems/movement/MovementSystem.ts`
  - `server/src/systems/movement/gridPathing.ts`

### Slice 1.3: City Ownership and Spawn Generation
- Extract city occupancy checks, ownership transitions, spawn timers, spawn placement.
- Candidate module(s):
  - `server/src/systems/cities/CityControlSystem.ts`
  - `server/src/systems/cities/CitySpawnSystem.ts`

### Slice 1.4: Room Message Handlers Cleanup
- Move message handling into dedicated handler module(s) while keeping room wiring central.
- Keep authorization checks and match-phase checks explicit.

## Phase 2: Client Refactor (`main.ts`)

### Slice 2.1: Input/Selection/Path Intent Isolation
- Move pointerdown/pointermove/pointerup branching into controller(s).
- Expand existing `BattleInputController` responsibility to own interaction state transitions.

### Slice 2.2: Network Update Application Layer
- Extract state patch/apply functions for units, lobby, and battle events.
- Goal: scene receives normalized view-model updates, not raw network branching.

### Slice 2.3: Visual Update Pipelines
- Extract frame update responsibilities:
  - fog refresh triggers
  - terrain color pass
  - influence debug focus + line renderer wiring
- Keep scene `update()` as a thin coordinator.

### Slice 2.4: Map/Lobby Flow Cleanup
- Isolate lobby map selection/generation/reload logic from gameplay scene updates.

## Phase 3: Shared Contracts and Config Hygiene
1. Separate config by domain in `shared/src/` (influence, combat, movement, lobby/map).
2. Normalize network contract grouping by message domain.
3. Add short docs on ownership boundaries between `client/`, `server/`, `shared/`.

## Suggested Execution Order
1. Server morale/influence extraction (highest leverage for current roadmap).
2. Server movement extraction.
3. Client input extraction.
4. Client network-apply extraction.
5. Shared config/contracts cleanup.

## Done Criteria Per Slice
1. `npm run verify` passes.
2. No gameplay behavior regressions in smoke checks.
3. Top-level file reduced and clearer (orchestration only).
4. New module has explicit interface and focused unit responsibility.
5. Diff is reviewable in one pass.

## First Slice Kickoff Checklist (Slice 1.1)
1. Identify morale/influence methods currently in `BattleRoom.ts`.
2. Move pure math into `moraleMath.ts`.
3. Move orchestration helper into `MoraleSystem.ts`.
4. Inject/call from `BattleRoom` with same inputs/outputs.
5. Run `npm run verify`.
6. Manual check: selected unit morale still updates and remains bounded (0-100).
