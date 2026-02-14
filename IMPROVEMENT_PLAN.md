# TacticalBlocks Improvement Plan (Collaborative Working Draft)

## Goal
Create a single planning document where each existing subsystem has a dedicated place for targeted improvements, implementation slices, risks, and validation notes.

## How To Use This Plan
1. Pick one subsystem section at a time.
2. Convert a backlog item into a small slice (`x.y` naming).
3. Keep behavior-change work explicit and isolated.
4. For each completed slice:
   - run `npm run verify`
   - run relevant smoke checks from `SMOKE_TEST_CHECKLIST.md`
   - mark the slice and append a short result note

## Improvement Rules (Apply to Every Slice)
1. One subsystem/mechanic focus per slice.
2. Keep slices reviewable (target under ~300 changed lines when practical).
3. State expected behavior change before implementation.
4. Keep coupling points explicit (room tick order, scene update order, map reset paths, runtime tuning hooks).
5. Prefer pure helper/function changes before orchestration rewires.
6. `npm run verify` must pass for each slice.
7. Add or update tests/checklists when behavior changes.

## Status Legend
- `[ ]` not started
- `[~]` in progress
- `[x]` complete

## Phase 0: Baseline Refresh (Before New Improvement Work)
- [ ] Reconfirm baseline behavior notes for:
  - lobby ready/start flow
  - left-drag path drawing and right-click move command
  - city capture and spawn timing
  - battle end transition back to lobby
  - morale/influence visual behavior
- [ ] Capture current perf snapshot (server tick stability + client frame consistency).
- [ ] Verify `npm run verify` is green before first improvement slice.

## Phase 1: Server Gameplay Simulation Improvements

### Subsystem 1.1: Battle Room Orchestration
- Primary files:
  - `server/src/rooms/BattleRoom.ts`
  - `server/src/rooms/BattleRoomTypes.ts`
- Improvement backlog:
  - [ ] Reduce orchestration branching complexity while preserving tick determinism.
  - [ ] Make subsystem call-order contracts explicit near execution points.
  - [ ] Add higher-signal logs/diagnostics for invalid commands and phase gating.
- Slice slots:
  - [ ] 1.1a: ________________________________________
  - [ ] 1.1b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Battle tick order invariants still hold.

### Subsystem 1.2: Movement Domain
- Primary files:
  - `server/src/systems/movement/gridPathing.ts`
  - `server/src/systems/movement/MovementCommandRouter.ts`
  - `server/src/systems/movement/MovementSimulation.ts`
- Improvement backlog:
  - [ ] Evaluate path quality and command responsiveness under congestion.
  - [ ] Improve movement conflict resolution observability/debuggability.
  - [ ] Identify opportunities for lower-cost occupancy updates.
- Slice slots:
  - [ ] 1.2a: ________________________________________
  - [ ] 1.2b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Terrain blocking and occupancy semantics unchanged unless explicitly targeted.

### Subsystem 1.3: City Control + Spawn
- Primary files:
  - `server/src/systems/cities/CityControlSystem.ts`
  - `server/src/systems/cities/CitySpawnSystem.ts`
  - `server/src/systems/cities/CityInfluenceSourceSync.ts`
- Improvement backlog:
  - [ ] Tune capture clarity and ownership transition feedback hooks.
  - [ ] Improve spawn fairness and blocked-cell fallback behavior.
  - [ ] Harden map reset and ownership reset guarantees.
- Slice slots:
  - [ ] 1.3a: ________________________________________
  - [ ] 1.3b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Ownership sync and influence-source sync remain consistent.

### Subsystem 1.4: Morale + Combat
- Primary files:
  - `server/src/systems/morale/MoraleSystem.ts`
  - `server/src/systems/morale/moraleMath.ts`
  - `server/src/systems/combat/ContactCombatSystem.ts`
- Improvement backlog:
  - [ ] Evaluate combat readability (engagement onset, damage pacing, death cleanup timing).
  - [ ] Assess morale signal quality and player-facing interpretability.
  - [ ] Add targeted combat diagnostics for balance iteration.
- Slice slots:
  - [ ] 1.4a: ________________________________________
  - [ ] 1.4b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Engagement and pending-damage invariants preserved unless intentionally changed.

### Subsystem 1.5: Influence Grid
- Primary files:
  - `server/src/systems/InfluenceGridSystem.ts`
  - `server/src/systems/influenceGrid/*`
- Improvement backlog:
  - [ ] Validate influence smoothing/decay behavior against desired gameplay feel.
  - [ ] Improve debug pathways for contested cells and source attribution.
  - [ ] Profile and optimize costly influence recomputation paths.
- Slice slots:
  - [ ] 1.5a: ________________________________________
  - [ ] 1.5b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Influence revision/update semantics remain network-safe.

### Subsystem 1.6: Room Services (Lobby/Battle Lifecycle)
- Primary files:
  - `server/src/rooms/services/LobbyService.ts`
  - `server/src/rooms/services/BattleLifecycleService.ts`
- Improvement backlog:
  - [ ] Improve lifecycle transition clarity and failure handling.
  - [ ] Ensure deterministic handling for reconnect/ready-state edge cases.
  - [ ] Expand service-level tests around lobby-to-battle transitions.
- Slice slots:
  - [ ] 1.6a: ________________________________________
  - [ ] 1.6b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Ready/start/outcome transitions stay consistent.

## Phase 2: Client Interaction + Presentation Improvements

### Subsystem 2.1: Scene Orchestration
- Primary files:
  - `client/src/main.ts`
- Improvement backlog:
  - [ ] Further thin scene orchestration and remove residual cross-domain coupling.
  - [ ] Improve scene-level state transition readability and invariants.
- Slice slots:
  - [ ] 2.1a: ________________________________________
  - [ ] 2.1b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Frame-stage ordering remains explicit and intentional.

### Subsystem 2.2: Input + Selection Control
- Primary files:
  - `client/src/BattleInputController.ts`
- Improvement backlog:
  - [ ] Assess interaction-state robustness for rapid mode switching.
  - [ ] Improve debuggability for pointer edge cases and cancellation paths.
  - [ ] Evaluate whether a lightweight interaction state machine is now justified.
- Slice slots:
  - [ ] 2.2a: ________________________________________
  - [ ] 2.2b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Control scheme semantics remain aligned with `agents.md` unless intentionally changed.

### Subsystem 2.3: Command Planning + Path Preview
- Primary files:
  - `client/src/UnitCommandPlanner.ts`
  - `client/src/PathPreviewRenderer.ts`
- Improvement backlog:
  - [ ] Improve formation offset quality and path projection readability.
  - [ ] Tighten planned-path lifecycle handling for canceled/overwritten commands.
  - [ ] Evaluate path preview performance under large multi-select sets.
- Slice slots:
  - [ ] 2.3a: ________________________________________
  - [ ] 2.3b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Shift-modifier behavior and terrain clipping contract remain explicit.

### Subsystem 2.4: Lobby/Map Flow
- Primary files:
  - `client/src/LobbyFlowController.ts`
  - `client/src/LobbyOverlayController.ts`
- Improvement backlog:
  - [ ] Improve map-selection UX resilience (rapid stepping, random, generate).
  - [ ] Harden phase-transition resets and stale-state protection.
  - [ ] Improve messaging and fallback behavior for map load/generation failures.
- Slice slots:
  - [ ] 2.4a: ________________________________________
  - [ ] 2.4b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Map revision reload and reset semantics preserved.

### Subsystem 2.5: Network Apply Layer
- Primary files:
  - `client/src/NetworkManager.ts`
  - `client/src/network/UnitStateApplier.ts`
  - `client/src/network/CityStateApplier.ts`
  - `client/src/network/BattleTransitionApplier.ts`
- Improvement backlog:
  - [ ] Improve reconciliation robustness for out-of-order or burst updates.
  - [ ] Expand guardrails around partial payload/state mismatch scenarios.
  - [ ] Add focused tests around normalization and apply boundaries.
- Slice slots:
  - [ ] 2.5a: ________________________________________
  - [ ] 2.5b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Transport normalization boundaries remain centralized.

### Subsystem 2.6: Visual Update Pipeline
- Primary files:
  - `client/src/VisualUpdatePipeline.ts`
  - `client/src/FogOfWarController.ts`
  - `client/src/InfluenceRenderer.ts`
- Improvement backlog:
  - [ ] Profile update stage costs and identify low-risk performance wins.
  - [ ] Improve visual readability of fog/influence layering in dense battles.
  - [ ] Clarify debug focus behavior and tuning knobs.
- Slice slots:
  - [ ] 2.6a: ________________________________________
  - [ ] 2.6b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Update order and cadence changes only in explicitly behavior-changing slices.

### Subsystem 2.7: Domain Visual Objects
- Primary files:
  - `client/src/Unit.ts`
  - `client/src/City.ts`
  - `client/src/Team.ts`
- Improvement backlog:
  - [ ] Improve object lifecycle consistency (spawn, update, teardown).
  - [ ] Evaluate opportunities for clearer rendering/state ownership boundaries.
  - [ ] Add tests/checks for visual-state parity with authoritative state.
- Slice slots:
  - [ ] 2.7a: ________________________________________
  - [ ] 2.7b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Render object cleanup remains leak-safe.

### Subsystem 2.8: Runtime Tuning + Debug UI
- Primary files:
  - `client/src/RuntimeTuningPanel.ts`
- Improvement backlog:
  - [ ] Improve grouping/discoverability for frequently adjusted tuning values.
  - [ ] Add safer bounds/validation for runtime-editable fields.
  - [ ] Improve feedback loop between tuning changes and visible outcomes.
- Slice slots:
  - [ ] 2.8a: ________________________________________
  - [ ] 2.8b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Runtime tuning hooks remain synchronized with server expectations.

## Phase 3: Shared Contracts + Data Model Improvements

### Subsystem 3.1: Gameplay Config
- Primary files:
  - `shared/src/gameplayConfig.ts`
- Improvement backlog:
  - [ ] Improve config organization for higher-signal balancing passes.
  - [ ] Define versioning/migration strategy for config shape changes.
  - [ ] Add validation for invalid or conflicting config combinations.
- Slice slots:
  - [ ] 3.1a: ________________________________________
  - [ ] 3.1b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Existing config defaults remain stable unless intentionally retuned.

### Subsystem 3.2: Runtime Tuning Contracts
- Primary files:
  - `shared/src/runtimeTuning.ts`
- Improvement backlog:
  - [ ] Expand type-level safety for runtime tuning payloads.
  - [ ] Improve compatibility checks between client controls and server handlers.
  - [ ] Add stricter schema checks for missing/extra fields.
- Slice slots:
  - [ ] 3.2a: ________________________________________
  - [ ] 3.2b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Existing tuning keys remain backward compatible unless explicitly migrated.

### Subsystem 3.3: Network Contracts
- Primary files:
  - `shared/src/networkContracts.ts`
  - `server/src/schema/*`
- Improvement backlog:
  - [ ] Clarify event/message ownership and lifecycle expectations.
  - [ ] Improve contract consistency checks between schema and transport payloads.
  - [ ] Add contract-focused tests to prevent drift.
- Slice slots:
  - [ ] 3.3a: ________________________________________
  - [ ] 3.3b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Backward compatibility expectations are documented per change.

### Subsystem 3.4: Terrain Grid + Map Data Pipeline
- Primary files:
  - `shared/src/terrainGrid.ts`
  - `shared/scripts/*`
- Improvement backlog:
  - [ ] Improve map generation/rebuild reproducibility and parameter visibility.
  - [ ] Add validation around malformed terrain assets or script outputs.
  - [ ] Improve map pipeline ergonomics for iterative design.
- Slice slots:
  - [ ] 3.4a: ________________________________________
  - [ ] 3.4b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Generated terrain compatibility with runtime loading is preserved.

## Phase 4: Quality, Tooling, and Observability Improvements

### Subsystem 4.1: Verification + Smoke Coverage
- Primary files:
  - `SMOKE_TEST_CHECKLIST.md`
  - workspace `package.json` scripts
- Improvement backlog:
  - [ ] Expand smoke checks for highest-risk mechanics and regressions.
  - [ ] Improve verification speed/signal for iterative development.
  - [ ] Add explicit mapping from subsystem slices to required smoke checks.
- Slice slots:
  - [ ] 4.1a: ________________________________________
  - [ ] 4.1b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Smoke checklist remains actionable and current.

### Subsystem 4.2: Diagnostics + Performance Instrumentation
- Primary files:
  - server/client debug pathways (distributed)
- Improvement backlog:
  - [ ] Define lightweight perf counters for battle tick and frame stages.
  - [ ] Add togglable diagnostic snapshots for movement/combat/influence anomalies.
  - [ ] Standardize debug output format for faster triage.
- Slice slots:
  - [ ] 4.2a: ________________________________________
  - [ ] 4.2b: ________________________________________
- Validation notes:
  - `npm run verify`
  - Instrumentation overhead remains bounded.

## Suggested Next Collaboration Pass
1. Pick one subsystem from Phase 1 or Phase 2 as immediate priority.
2. Fill in the first `a` slice with a concrete behavior goal and constraints.
3. Define exact acceptance checks (verify + smoke + targeted manual check).
4. Execute the slice and record notes directly in this document.
