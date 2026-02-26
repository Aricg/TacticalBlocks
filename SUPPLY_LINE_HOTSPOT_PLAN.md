# Supply Line Hotspot Plan

## Objective
Reduce server tick cost by targeting the real hotspots inside `updateSupplyLines()` and `updateInfluenceGrid()` first, with measurement-driven validation at each step.

## Current Hotspot Signal (from previous profiling run)
- Primary hotspot: `writeInfluenceScores` (both supply-eval and periodic influence grid updates), commonly ~15-23ms.
- Secondary hotspot: `applyUnitSupplyLineState` with large spikes (high p95 / max), indicating schema-write churn.
- Minor hotspot: `computeSupplyLinesForUnits` is comparatively low (typically sub-1.5ms), so path search is not the first optimization target.

## Constraints
- Keep current gameplay behavior unchanged.
- Do not add or keep in-repo profiling instrumentation.
- Validate each slice with external tooling and repeatable scenarios.

## Phase 1: Eliminate unnecessary influence writes (highest ROI)
1. Add dirty gating for supply evaluation influence writes.
   - Only call `writeInfluenceScores` when static sources or ownership-relevant inputs changed.
   - Reuse previous score buffer when nothing changed.
2. Add cadence throttling for expensive influence writes.
   - Update at bounded interval (example: every N ticks) when no meaningful state delta is present.
3. Add no-op short-circuit.
   - Skip full write pass if candidate source set and score deltas are below threshold.

Success metric:
- CPU profiles show reduced server time under influence-score write paths.
- End-to-end server CPU cost improves under the same scenario/load.

## Phase 2: Reduce schema/map-set churn in unit supply application
1. Make `applyUnitSupplyLineState` diff-based.
   - Write only when value actually changes (`isSupplied`, `turnsOutOfSupply`, path fields).
2. Avoid per-tick object recreation for unchanged state.
   - Reuse cached keys/containers where possible.
3. Defer/prioritize non-critical writes.
   - Apply urgent gameplay-critical fields immediately; batch cosmetic/debug fields.

Success metric:
- CPU profiles show lower time in supply state-application paths.
- Fewer observable server hitch spikes and better command responsiveness.

## Phase 3: Tighten remaining compute path (only after phases 1-2)
1. Cache/reuse zone and occupancy-derived structures.
2. Minimize repeated key construction and map lookups inside loops.
3. Validate whether `computeSupplyLinesForUnits` still merits deeper algorithmic changes.

Success metric:
- Incremental CPU-time reduction in supply-path computation without regressions elsewhere.

## Instrumentation and Validation Loop
1. Capture baseline with 3 identical runs before each phase (same map, actions, and runtime).
2. Record external metrics per run:
   - Node CPU profile (`--cpu-prof`)
   - Process CPU and RSS snapshots (`time` / `ps`)
   - Playability checks (input responsiveness and hitching notes)
3. Implement one optimization slice.
4. Re-run the same 3 runs and compare hotspot distribution and total server CPU cost.
5. Keep only changes that improve cost while preserving gameplay behavior.

## Execution Order
1. Dirty-gate + throttle influence writes.
2. Diff-only unit supply state writes.
3. Re-measure with external profiles and decide if deeper path computation changes are still warranted.
