# TacticalBlocks Code Cleanup Plan

## Goal
Reduce file size and complexity so future feature work (including AI-assisted iteration) is faster, safer, and easier to reason about.

## Current Hotspots
- `client/src/main.ts` (~2277 lines)
- `server/src/rooms/BattleRoom.ts` (~1974 lines)
- `server/src/systems/InfluenceGridSystem.ts` (~763 lines)
- `client/src/InfluenceRenderer.ts` (~723 lines)

## Guiding Principle
Split by behavior/domain boundaries, not arbitrary line chunks.

## Section 1: Baseline Safety (No Behavior Changes)
1. Add a simple smoke checklist for core flows:
   - Join room
   - Select unit / deselect
   - Box select
   - Right-click move
   - Path drag command
   - Lobby ready/map switch
   - Battle end flow
2. Run type checks before/after every refactor slice:
   - `npm --prefix client run typecheck`
   - `npm --prefix server run typecheck`

Deliverable: repeatable verification baseline for refactor PRs.
Reference: `SMOKE_TEST_CHECKLIST.md`

## Section 2: Client Input Split (Highest ROI First)
Extract pointer/keyboard interaction logic from `client/src/main.ts` into `BattleInputController`.

Scope:
- `gameobjectdown`
- `pointerdown`
- `pointermove`
- `pointerup`
- space/escape handlers

Target shape:
- `BattleScene` remains orchestrator.
- Input controller owns branching state transitions and invokes scene callbacks.

Deliverable: reduced complexity in `main.ts`, no gameplay behavior changes.

## Section 3: Client Scene Subsystems
Continue decomposing `client/src/main.ts` into focused modules:
- `FogOfWarController`
- `LobbyOverlayController`
- `PathPreviewRenderer` + grid/path utilities
- `CityOwnershipPresenter`

Deliverable: `main.ts` becomes composition/wiring code instead of implementation-heavy logic.

## Section 4: Server Room Decomposition
Keep `server/src/rooms/BattleRoom.ts` as Colyseus room boundary, move domain logic to services:
- `MovementService`
- `CombatService` (morale + damage resolution)
- `CityControlService` (ownership + generation/spawn)
- `LobbyService` (ready/map/start flow)
- `BattleLifecycleService` (outcome detection + conclude)

Deliverable: `BattleRoom` is orchestration and message routing only.

## Section 5: Influence Grid System Cleanup
Split `server/src/systems/InfluenceGridSystem.ts` into pure calc modules while keeping the same external API (`writeInfluenceScores`):
- Source collection
- Cell accumulation
- Contest multipliers
- Floor enforcement
- Decay/post-process

Deliverable: easier tuning and safer math changes with isolated responsibilities.

## Section 6: Shared Network Contracts
Move duplicated client/server message shapes into shared types in `shared/`.

Deliverable: lower client-server drift risk and clearer edit points for future features.

## Execution Order
1. Section 1 (baseline safety)
2. Section 2 (client input split)
3. Section 4 (server room decomposition)
4. Section 5 (influence system cleanup)
5. Section 3 (remaining client subsystem extraction)
6. Section 6 (shared contracts)

## PR Sizing Rules
- Keep each PR to one section or one sub-slice of a section.
- Prefer behavior-preserving extraction before renaming/restructuring internals.
- Validate with typecheck + smoke checklist on every PR.
