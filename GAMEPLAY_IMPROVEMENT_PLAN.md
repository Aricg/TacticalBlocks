# TacticalBlocks Gameplay Improvement Plan (Collaborative Draft)

## Purpose
This is a gameplay-only planning document.
Use it to capture what each mechanic should feel like, what to improve, and how to validate the change.

## How We Will Use This
1. Pick one mechanic section.
2. Fill in the "Your Input" fields first.
3. Define one small gameplay slice.
4. Implement and validate.
5. Mark the slice complete and record outcomes.

## Gameplay Slice Rules
1. One mechanic focus per slice.
2. State desired player-facing behavior before coding.
3. Keep changes small and testable.
4. Keep side effects explicit across server/client/shared.
5. Run `npm run verify` for every slice.
6. Run relevant checks from `SMOKE_TEST_CHECKLIST.md`.

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## Mechanics Index
- M1 Input and Selection
- M2 Command Issuing and Path Drawing
- M3 Path Planning and Terrain Clipping
- M4 Unit Movement and Congestion
- M5 Terrain Gameplay Effects
- M6 City Capture and Ownership
- M7 City Unit Generation and Spawn Fairness
- M8 Influence Control and Frontline Behavior
- M9 Morale System
- M10 Contact Combat and Damage Pace
- M11 Combat Facing and Rotation
- M12 Fog of War and Vision Clarity
- M13 Battle Win Conditions and End Flow
- M14 Map Variety and Battlefield Readability
- M15 Runtime Tuning and Balance Workflow

## M1: Input and Selection
### Improvement Ideas
- [ ] Make selection behavior more predictable during fast clicks/drags.
- [ ] Reduce accidental deselects.
- [ ] Improve mode switching clarity (select vs drag-path vs box-select).

### Your Input
- Desired feel:
  - ________________________________________________
- Pain points right now:
  - ________________________________________________
- Must-not-change behavior:
  - ________________________________________________

### Slice Slots
- [ ] M1.a _________________________________________
- [ ] M1.b _________________________________________

## M2: Command Issuing and Path Drawing
### Improvement Ideas
- [ ] Improve command confidence when issuing long paths.
- [ ] Improve path-draw responsiveness at high cursor speed.
- [ ] Clarify right-click vs drag-path intent.

### Your Input
- Desired feel:
  - ________________________________________________
- Cases that feel wrong:
  - ________________________________________________
- Priority (High/Medium/Low): _______________________

### Slice Slots
- [ ] M2.a _________________________________________
- [ ] M2.b _________________________________________

## M3: Path Planning and Terrain Clipping
### Improvement Ideas
- [ ] Improve path quality near impassable terrain.
- [ ] Improve multi-waypoint path consistency.
- [ ] Reduce surprising truncation outcomes.

### Your Input
- Desired behavior examples:
  - ________________________________________________
- Current failures:
  - ________________________________________________
- Acceptable tradeoff (accuracy vs speed): __________

### Slice Slots
- [ ] M3.a _________________________________________
- [ ] M3.b _________________________________________

## M4: Unit Movement and Congestion
### Improvement Ideas
- [ ] Improve movement flow in crowded lanes.
- [ ] Reduce "stuck" behavior near occupied cells.
- [ ] Improve fairness when multiple units contest the same route.

### Your Input
- Desired battlefield motion style:
  - ________________________________________________
- Congestion scenarios to optimize:
  - ________________________________________________
- Limits (CPU/perf constraints): _____________________

### Slice Slots
- [ ] M4.a _________________________________________
- [ ] M4.b _________________________________________

## M5: Terrain Gameplay Effects
### Improvement Ideas
- [ ] Revisit terrain movement multipliers for tactical readability.
- [ ] Revisit terrain morale multipliers for meaningful decision-making.
- [ ] Improve terrain identity (what each type is "for").

### Your Input
- Terrain goals by type:
  - Water: _________________________________________
  - Forest: ________________________________________
  - Hills: _________________________________________
  - Grass: _________________________________________
- Desired risk/reward profile:
  - ________________________________________________

### Slice Slots
- [ ] M5.a _________________________________________
- [ ] M5.b _________________________________________

## M6: City Capture and Ownership
### Improvement Ideas
- [ ] Improve capture clarity during contested movement.
- [ ] Improve pacing of ownership swings.
- [ ] Improve player feedback when a city flips.

### Your Input
- Desired capture pacing:
  - ________________________________________________
- Desired contest behavior:
  - ________________________________________________
- Frustrating outcomes today:
  - ________________________________________________

### Slice Slots
- [ ] M6.a _________________________________________
- [ ] M6.b _________________________________________

## M7: City Unit Generation and Spawn Fairness
### Improvement Ideas
- [ ] Improve spawn fairness under heavy block pressure.
- [ ] Improve spawn timing impact on momentum.
- [ ] Reduce edge cases where spawn opportunities feel random.

### Your Input
- Desired reinforcement tempo:
  - ________________________________________________
- Spawn fairness concerns:
  - ________________________________________________
- Preferred comeback pressure level:
  - ________________________________________________

### Slice Slots
- [ ] M7.a _________________________________________
- [ ] M7.b _________________________________________

## M8: Influence Control and Frontline Behavior
### Improvement Ideas
- [ ] Improve frontline stability vs jitter.
- [ ] Improve contest behavior near equal pressure.
- [ ] Improve tactical readability of influence shifts.

### Your Input
- Desired frontline feel (stable/fluid): ______________
- Desired response speed to movement:
  - ________________________________________________
- Cases that feel "wrong":
  - ________________________________________________

### Slice Slots
- [ ] M8.a _________________________________________
- [ ] M8.b _________________________________________

## M9: Morale System
### Improvement Ideas
- [ ] Improve morale signal relevance to combat outcomes.
- [ ] Improve morale readability for players.
- [ ] Reduce hidden or confusing morale swings.

### Your Input
- Desired morale impact on fights:
  - ________________________________________________
- Desired player-facing clarity:
  - ________________________________________________
- Keep subtle or make explicit? ______________________

### Slice Slots
- [ ] M9.a _________________________________________
- [ ] M9.b _________________________________________

## M10: Contact Combat and Damage Pace
### Improvement Ideas
- [ ] Improve time-to-kill pacing.
- [ ] Improve engagement readability in clustered fights.
- [ ] Improve perceived fairness of simultaneous damage exchange.

### Your Input
- Desired TTK range:
  - ________________________________________________
- Desired combat intensity curve:
  - ________________________________________________
- Current pain points:
  - ________________________________________________

### Slice Slots
- [ ] M10.a ________________________________________
- [ ] M10.b ________________________________________

## M11: Combat Facing and Rotation
### Improvement Ideas
- [ ] Improve facing behavior so engagements look intentional.
- [ ] Reduce visual snapping in rotation updates.
- [ ] Align facing response with movement/command intent.

### Your Input
- Desired facing feel:
  - ________________________________________________
- Cases that look awkward:
  - ________________________________________________
- Priority: _________________________________________

### Slice Slots
- [ ] M11.a ________________________________________
- [ ] M11.b ________________________________________

## M12: Fog of War and Vision Clarity
### Improvement Ideas
- [ ] Improve visibility feedback around cities and unit vision.
- [ ] Improve readability in dense fights.
- [ ] Improve scouting value and map-control decisions.

### Your Input
- Desired fog aggressiveness:
  - ________________________________________________
- Desired information certainty:
  - ________________________________________________
- Edge cases to fix first:
  - ________________________________________________

### Slice Slots
- [ ] M12.a ________________________________________
- [ ] M12.b ________________________________________

## M13: Battle Win Conditions and End Flow
### Improvement Ideas
- [ ] Improve clarity of why a battle ended.
- [ ] Improve pacing around terminal states.
- [ ] Improve tie/borderline resolution behavior.

### Your Input
- Preferred win-condition emphasis (units vs cities): ___
- Desired end-of-battle timing/transition:
  - ________________________________________________
- Messaging improvements:
  - ________________________________________________

### Slice Slots
- [ ] M13.a ________________________________________
- [ ] M13.b ________________________________________

## M14: Map Variety and Battlefield Readability
### Improvement Ideas
- [ ] Improve map-to-map strategic diversity.
- [ ] Improve readability of lanes/chokepoints/objectives.
- [ ] Improve neutral-city placement quality.

### Your Input
- Desired map archetypes:
  - ________________________________________________
- Desired match length variance by map:
  - ________________________________________________
- Layouts to avoid:
  - ________________________________________________

### Slice Slots
- [ ] M14.a ________________________________________
- [ ] M14.b ________________________________________

## M15: Runtime Tuning and Balance Workflow
### Improvement Ideas
- [ ] Improve balancing workflow (fewer hidden interactions).
- [ ] Improve grouping of high-leverage tuning knobs.
- [ ] Improve ability to capture/compare tuning experiments.

### Your Input
- Top 5 knobs you want to tune most:
  - 1) ______________________________________________
  - 2) ______________________________________________
  - 3) ______________________________________________
  - 4) ______________________________________________
  - 5) ______________________________________________
- Desired balancing workflow:
  - ________________________________________________

### Slice Slots
- [ ] M15.a ________________________________________
- [ ] M15.b ________________________________________

## Per-Slice Notes Template
Use this for each slice after implementation.

```text
Slice ID:
Mechanic:
Goal:
Changes made:
Expected gameplay impact:
Validation:
- npm run verify: PASS/FAIL
- Smoke checks run:
Observed result:
Follow-up:
```

## Suggested First Pass
1. Fill Your Input for M4, M8, M10 first (movement, influence, combat pace).
2. Choose one high-impact slice from those three mechanics.
3. Implement a single slice and capture results in the template.
