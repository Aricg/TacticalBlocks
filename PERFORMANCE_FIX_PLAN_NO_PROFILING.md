# Performance Fix Plan (No In-Repo Profiling Code)

## Goal
Cut battle tick latency by reducing supply/influence work and schema churn, while proving improvement with black-box runs and external tooling only.

## Proof Strategy (without profiler code)
1. Use a fixed gameplay scenario for every run (same map size/profile, same player actions, same runtime length).
2. Capture external metrics only:
   - Node CPU profile via runtime flag (`--cpu-prof`) written to local temp files.
   - Process CPU and memory from OS tools (`time`, `ps` snapshots).
   - Player-visible behavior: command responsiveness and absence of hitching under the same scenario.
3. Compare before/after on identical conditions and keep a short evidence log in a markdown report.

## Optimization Slices
1. Influence write gating (highest expected win)
   - Add dirty flags so supply-evaluation and influence-grid writes run only when relevant state changes.
   - Trigger dirty on ownership flips, unit cell transitions, unit spawn/death, and map/source changes.
   - Add bounded refresh cadence fallback (safety refresh every N ticks).

2. Reduce schema write churn in supply state
   - Keep diff-based updates for supply-line state objects.
   - Skip path array rewrites when signature is unchanged.
   - Avoid clearing/rebuilding state maps when entries remain valid.

3. Reduce per-tick allocation/map-set churn
   - Reuse `Set`/`Map` containers across ticks (`clear()` and refill).
   - Reuse temporary buffers for zone/cell-key derivation.
   - Avoid repeated key string creation in inner loops where possible.

4. Frequency/cadence tuning
   - Run expensive supply/influence recomputation at a controlled cadence unless dirty flags demand immediate recompute.
   - Keep gameplay-correct paths immediate for ownership/combat-critical transitions.

## Validation Loop Per Slice
1. Record baseline run (external metrics + playability notes).
2. Implement one slice only.
3. Re-run identical scenario and compare.
4. Keep change only if:
   - CPU profile shows reduced time in supply/influence paths.
   - Command responsiveness is equal or better.
   - No gameplay regressions (supply links, city ownership, path behavior).

## Acceptance Criteria
- Stable improvement across at least 3 repeated runs.
- Clear reduction in server CPU cost under battle load.
- No regressions in supply correctness or client-visible behavior.

## Execution Order
1. Influence write gating.
2. Schema churn reduction.
3. Allocation/map-set reuse.
4. Cadence tuning and final verification report.
