# TacticalBlocks Refactor Plan (Reality-Aligned v3)

## Goal
Keep feature work fast and safe by reducing hotspot complexity, clarifying ownership, and enforcing small no-behavior-change slices that an agent can execute with low regression risk.

## Current Reality Snapshot
- Server extraction already started:
  - Influence grid logic is already in `server/src/systems/InfluenceGridSystem.ts`.
  - Lobby and battle outcome logic already have services:
    - `server/src/rooms/services/LobbyService.ts`
    - `server/src/rooms/services/BattleLifecycleService.ts`
- Client extraction already started:
  - Pointer event branching is already isolated in `client/src/BattleInputController.ts`.
  - Network normalization is already centralized in `client/src/NetworkManager.ts`.
- Remaining complexity is still concentrated in:
  - `server/src/rooms/BattleRoom.ts` (movement, city/spawn, morale/combat, map generation wiring).
  - `client/src/main.ts` (map/lobby flow, network-apply scene mutation, unit command math, render/update wiring).

## Updated Hotspots
- `server/src/rooms/BattleRoom.ts` (~1760 LOC):
  - movement command routing + simulation
  - city ownership + city unit generation
  - morale/combat math + combat loop
  - map/lobby orchestration and generator process wiring
- `client/src/main.ts` (~1750 LOC):
  - map and lobby state transitions
  - unit/network apply methods
  - command/path projection math and planned-path rendering
  - update loop orchestration for fog, terrain tint, influence debug

## Refactor Rules (Apply to Every Slice)
1. One subsystem per slice.
2. No gameplay tuning changes in structural slices.
3. Keep PRs small (target under ~300 changed lines when practical). If a slice is trending larger, split it into sub-slices before continuing.
4. Run `npm run verify` before merge.
5. Run smoke checks from `SMOKE_TEST_CHECKLIST.md` for affected flows.
6. Preserve call order and side effects. Before extraction, write down the specific behaviors that must remain identical.
7. Document coupling points touched (map reset, influence sync, ownership sync, message validation, runtime-tuning hooks).
8. Prefer extracting pure helpers first, then orchestration wrappers.
9. End each slice with an explicit rewiring checklist of old call sites now delegated.

## Baseline and Safety
1. Keep `SMOKE_TEST_CHECKLIST.md` as required regression gate.
2. Add baseline notes for current behavior before each major phase:
   - lobby start and ready flow
   - right-click command and path drag
   - city capture and city spawn timing
   - battle end transition back to lobby
   - morale/influence debug display behavior
3. Treat current core ordering as a behavior contract unless a slice explicitly targets behavior:
   - Server battle tick order in `BattleRoom`: movement -> city ownership -> city influence source sync on ownership change -> pre-spawn outcome check -> city spawn -> morale/combat damage -> combat rotation -> outcome check -> influence grid update.
   - Client frame update order in `main.ts:update`: remote smoothing -> combat wiggle -> terrain tint sampling -> planned-path advancement -> fog refresh -> planned-path rendering -> influence debug focus -> influence render.
4. Confirm `npm run verify` is green before and after each slice.

## Phase 1: Server Refactor (`BattleRoom.ts`)

### Slice 1.1 (Recommended Start): Movement Domain Extraction
- Extract from `BattleRoom.ts`:
  - path normalization and grid routing
  - destination facing and heading gate
  - occupancy-aware step execution and terrain blocking
- Candidate modules:
  - `server/src/systems/movement/gridPathing.ts`
  - `server/src/systems/movement/MovementCommandRouter.ts`
  - `server/src/systems/movement/MovementSimulation.ts`
- Recommended sub-slices to keep diffs reviewable:
  - [x] 1.1a: pure grid helpers (`traceGridLine`, compacting, terrain/block checks).
  - [x] 1.1b: message-path normalization + route construction.
  - [x] 1.1c: per-tick movement simulation + occupancy bookkeeping.
- Required behavior invariants:
  - Message validation and team authorization stay in room handler.
  - Route still truncates at first terrain-blocked step.
  - Heading gate/rotate-to-face behavior remains unchanged.
  - Occupancy blocking semantics remain unchanged (self-cell allowance only).
- Keep `BattleRoom` as orchestrator and message auth gate.

### Slice 1.2: City Ownership + Spawn Extraction
- Extract from `BattleRoom.ts`:
  - occupancy-based ownership transitions
  - city spawn source resolution and timer bookkeeping
  - spawn-cell search and spawn creation flow
- Progress:
  - [x] ownership transitions extracted.
  - [x] spawn source resolution + timer bookkeeping extracted.
  - [x] spawn-cell search + spawn creation flow extracted.
- Candidate modules:
  - `server/src/systems/cities/CityControlSystem.ts`
  - `server/src/systems/cities/CitySpawnSystem.ts`
  - `server/src/systems/cities/CityInfluenceSourceSync.ts`
- Important coupling to keep explicit:
  - `syncCityInfluenceSources()` must still run from all required paths:
    - room startup initialization
    - ownership-change path in battle tick
    - runtime tuning update path (city power changes)
    - `applyLobbyMapSelection(...)` reset path
  - Map selection reset must still clear units, reset city ownership, reset generation timers, and rebuild influence before battle resumes.

### Slice 1.3: Morale + Combat Domain Extraction
- Extract from `BattleRoom.ts`:
  - morale sampling and normalization
  - influence-based DPS and mitigation multipliers
  - engagement accumulation + pending damage application
- Progress:
  - [x] engagement accumulation + pending damage application extracted.
  - [x] combat rotation pass extracted.
  - [x] morale sampling/normalization extracted.
  - [x] influence-based DPS/mitigation extracted.
- Candidate modules:
  - `server/src/systems/morale/MoraleSystem.ts`
  - `server/src/systems/morale/moraleMath.ts`
  - `server/src/systems/combat/ContactCombatSystem.ts`
- Required side effects to preserve:
  - Contact still clears movement state for both engaged units.
  - Pending damage still accumulates per unit across multiple engagements in the same tick.
  - Unit death still removes from `state.units`, `movementStateByUnitId`, and engagement maps.
  - Combat rotation stage still runs after damage pass using current engagements.
- Note:
  - Influence grid calculation is already extracted; this slice focuses on morale/combat logic still in room.

### Slice 1.4: Room Wiring Cleanup (After 1.1-1.3)
- Keep room wiring central but thin:
  - message handlers stay in room, delegate quickly to systems/services
  - preserve explicit authorization and match-phase guards
- Progress:
  - [x] room handlers keep auth/phase guards and delegate movement/city/combat work to extracted systems.
- Preserve current simulation tick order from baseline notes.
- Avoid broad rewrites here; this is a consolidation slice.

## Phase 2: Client Refactor (`main.ts`)

### Slice 2.1 (Promoted): Map/Lobby Flow Extraction
- Isolate lobby map selection/reload/state-apply logic from scene orchestration:
  - `applySelectedLobbyMap`
  - `applyLobbyState`
  - `requestLobbyMapStep` / random / generate
- Progress:
  - [x] lobby map id resolution/stepping/state-derive logic extracted to `client/src/LobbyFlowController.ts`.
  - [x] scene-side map texture reload/apply side-effect orchestration extracted behind `client/src/LobbyFlowController.ts` flow helpers.
- Candidate module:
  - `client/src/LobbyFlowController.ts`
- Preserve:
  - map revision force-reload behavior
  - phase-transition reset behavior (pointer state, selection, planned paths)

### Slice 2.2: Unit Command/Selection Domain Extraction
- Keep `BattleInputController` as event-state owner.
- Keep selection ownership in scene/input layer; extract command-planning math from scene methods:
  - formation-center offsets
  - snap/compact/clip path utilities
  - planned-path bookkeeping helpers
- Progress:
  - [x] formation-center offsets + movement command mode derivation extracted to `client/src/UnitCommandPlanner.ts`.
  - [x] snap/compact/clip path utilities extracted to `client/src/UnitCommandPlanner.ts`.
  - [x] planned-path bookkeeping helpers extracted to `client/src/UnitCommandPlanner.ts`.
- Candidate module:
  - `client/src/UnitCommandPlanner.ts`
- Preserve:
  - shift-modifier command mode mapping
  - terrain-clipping behavior parity

### Slice 2.3: Network Apply Layer Refinement
- Keep transport/schema normalization in `NetworkManager`.
- Extract scene mutation handlers into focused appliers:
  - unit snapshot/position/health/rotation/morale apply
  - city ownership apply
  - battle/lobby transition apply
- Progress:
  - [x] unit snapshot/position/health/rotation/morale apply extracted to `client/src/network/UnitStateApplier.ts`.
  - [x] city ownership apply extracted to `client/src/network/CityStateApplier.ts`.
  - [x] battle-end transition announcement derivation extracted to `client/src/network/BattleTransitionApplier.ts`.
- Candidate modules:
  - `client/src/network/UnitStateApplier.ts`
  - `client/src/network/CityStateApplier.ts`
- Preserve:
  - normalization boundaries in `NetworkManager`
  - callback side-effect parity in scene state mutation

### Slice 2.4: Visual Update Pipeline Cleanup
- Keep `update()` as thin coordinator.
- Extract rendering orchestration wrappers for:
  - fog refresh
  - terrain tint refresh
  - influence debug focus update
  - planned path rendering
- Guardrail:
  - Do not change update trigger cadence or ordering in this structural slice.
  - Any cadence/perf changes require a dedicated behavior-change slice.

## Phase 3: Shared Contracts and Config Hygiene (Optional/ROI-Based)
1. Split `shared/src/gameplayConfig.ts` by domain only when change frequency or merge conflicts justify it.
2. Group network contracts by domain only when `networkContracts.ts` grows enough to reduce review friction.
3. Add short ownership docs for boundaries across `client/`, `server/`, `shared/`.
4. Current state suggests Phase 3 is optional, not urgent.

## Suggested Execution Order
1. Baseline notes refresh + verify gate.
2. [x] Server movement extraction 1.1a (pure helpers).
3. [x] Server movement extraction 1.1b (route construction).
4. [x] Server movement extraction 1.1c (simulation loop).
5. [x] Server city ownership/spawn extraction (Slice 1.2).
6. [x] Server morale/combat extraction (Slice 1.3).
7. [x] Server room wiring consolidation (Slice 1.4).
8. [x] Client map/lobby flow extraction (Slice 2.1).
9. [x] Client unit command planning extraction (Slice 2.2).
10. [x] Client network apply layer refinement (Slice 2.3).
11. Client visual pipeline cleanup (Slice 2.4).
12. Shared config/contracts hygiene only if warranted (Phase 3).

## Done Criteria Per Slice
1. `npm run verify` passes.
2. Relevant smoke checks in `SMOKE_TEST_CHECKLIST.md` pass.
3. Top-level room/scene file is smaller or has clearer orchestration boundaries.
4. New module has a narrow interface and single responsibility.
5. All expected call sites are rewired and listed in slice notes.
6. Side-effect invariants from slice kickoff are still true.
7. Diff is reviewable in one pass.
8. No gameplay behavior regression observed in touched flows.

## First Slice Kickoff Checklist (Slice 1.1)
1. Capture movement invariants to preserve:
   - validation/auth gates
   - terrain truncation behavior
   - occupancy block behavior
   - heading/rotation gate behavior
2. Move pure grid/path helpers first (`traceGridLine`, compacting, terrain/block checks).
3. Extract movement command normalization and route construction.
4. Extract per-tick movement simulation loop while preserving existing constants and guards.
5. Rewire `handleUnitPathMessage` and `updateMovement` to delegate.
6. Run `npm run verify`.
7. Manual smoke checks:
   - right-click move
   - path drag command
   - terrain blocking behavior
   - occupancy blocking behavior
