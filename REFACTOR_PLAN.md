# TacticalBlocks Refactor Plan (Reality-Aligned v2)

## Goal
Keep feature work fast and safe by reducing hotspot complexity, clarifying ownership, and enforcing small no-behavior-change slices.

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
3. Keep PRs small (target under ~300 changed lines when practical).
4. Run `npm run verify` before merge.
5. Run smoke checks from `SMOKE_TEST_CHECKLIST.md` for affected flows.
6. Document coupling points touched (map reset, influence sync, ownership sync, message validation).
7. Prefer extracting pure helpers first, then orchestration wrappers.

## Baseline and Safety
1. Keep `SMOKE_TEST_CHECKLIST.md` as required regression gate.
2. Add baseline notes for current behavior before each major phase:
   - lobby start and ready flow
   - right-click command and path drag
   - city capture and city spawn timing
   - battle end transition back to lobby
   - morale/influence debug display behavior
3. Confirm `npm run verify` is green before and after each slice.

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
- Keep `BattleRoom` as orchestrator and message auth gate.

### Slice 1.2: City Ownership + Spawn Extraction
- Extract from `BattleRoom.ts`:
  - occupancy-based ownership transitions
  - city spawn source resolution and timer bookkeeping
  - spawn-cell search and spawn creation flow
- Candidate modules:
  - `server/src/systems/cities/CityControlSystem.ts`
  - `server/src/systems/cities/CitySpawnSystem.ts`
  - `server/src/systems/cities/CityInfluenceSourceSync.ts`
- Important coupling to keep explicit:
  - `applyLobbyMapSelection(...)` reset path
  - `syncCityInfluenceSources()` updates when ownership changes

### Slice 1.3: Morale + Combat Domain Extraction
- Extract from `BattleRoom.ts`:
  - morale sampling and normalization
  - influence-based DPS and mitigation multipliers
  - engagement accumulation + pending damage application
- Candidate modules:
  - `server/src/systems/morale/MoraleSystem.ts`
  - `server/src/systems/morale/moraleMath.ts`
  - `server/src/systems/combat/ContactCombatSystem.ts`
- Note:
  - Influence grid calculation is already extracted; this slice focuses on morale/combat logic still in room.

### Slice 1.4: Room Wiring Cleanup (After 1.1-1.3)
- Keep room wiring central but thin:
  - message handlers stay in room, delegate quickly to systems/services
  - preserve explicit authorization and match-phase guards
- Avoid broad rewrites here; this is a consolidation slice.

## Phase 2: Client Refactor (`main.ts`)

### Slice 2.1 (Promoted): Map/Lobby Flow Extraction
- Isolate lobby map selection/reload/state-apply logic from scene orchestration:
  - `applySelectedLobbyMap`
  - `applyLobbyState`
  - `requestLobbyMapStep` / random / generate
- Candidate module:
  - `client/src/LobbyFlowController.ts`

### Slice 2.2: Unit Command/Selection Domain Extraction
- Keep `BattleInputController` as event-state owner.
- Extract command math and path clipping from scene methods:
  - formation-center offsets
  - snap/compact/clip path utilities
  - planned-path bookkeeping helpers
- Candidate module:
  - `client/src/UnitCommandPlanner.ts`

### Slice 2.3: Network Apply Layer Refinement
- Keep transport/schema normalization in `NetworkManager`.
- Extract scene mutation handlers into focused appliers:
  - unit snapshot/position/health/rotation/morale apply
  - city ownership apply
  - battle/lobby transition apply
- Candidate modules:
  - `client/src/network/UnitStateApplier.ts`
  - `client/src/network/CityStateApplier.ts`

### Slice 2.4: Visual Update Pipeline Cleanup
- Keep `update()` as thin coordinator.
- Extract trigger policy and rendering orchestration for:
  - fog refresh strategy
  - terrain tint refresh
  - influence debug focus update
  - planned path rendering
- Focus on readability and explicit ordering, no visual behavior changes.

## Phase 3: Shared Contracts and Config Hygiene (Optional/ROI-Based)
1. Split `shared/src/gameplayConfig.ts` by domain only when change frequency or merge conflicts justify it.
2. Group network contracts by domain only when `networkContracts.ts` grows enough to reduce review friction.
3. Add short ownership docs for boundaries across `client/`, `server/`, `shared/`.

## Suggested Execution Order
1. Baseline notes refresh + verify gate.
2. Server movement extraction (Slice 1.1).
3. Server city ownership/spawn extraction (Slice 1.2).
4. Server morale/combat extraction (Slice 1.3).
5. Server room wiring consolidation (Slice 1.4).
6. Client map/lobby flow extraction (Slice 2.1).
7. Client unit command/selection math extraction (Slice 2.2).
8. Client network apply layer refinement (Slice 2.3).
9. Client visual pipeline cleanup (Slice 2.4).
10. Shared config/contracts hygiene only if warranted (Phase 3).

## Done Criteria Per Slice
1. `npm run verify` passes.
2. Relevant smoke checks in `SMOKE_TEST_CHECKLIST.md` pass.
3. Top-level room/scene file is smaller or has clearer orchestration boundaries.
4. New module has a narrow interface and single responsibility.
5. Diff is reviewable in one pass.
6. No gameplay behavior regression observed in touched flows.

## First Slice Kickoff Checklist (Slice 1.1)
1. Identify movement-related methods in `BattleRoom.ts` (routing + simulation + occupancy helpers).
2. Move pure grid/path helpers first (`traceGridLine`, compacting, block checks).
3. Extract movement command normalization and route construction.
4. Extract per-tick movement simulation loop while preserving existing constants and guards.
5. Rewire `handleUnitPathMessage` and `updateMovement` to delegate.
6. Run `npm run verify`.
7. Manual smoke checks:
   - right-click move
   - path drag command
   - terrain blocking behavior
   - occupancy blocking behavior
