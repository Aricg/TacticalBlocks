# TacticalBlocks Smoke Test Checklist

Use this checklist before and after each refactor slice.

## Required Typecheck Gate (Every Slice)
Run both:

```bash
npm --prefix client run typecheck
npm --prefix server run typecheck
```

If either command fails, do not merge the slice.

## Manual Smoke Checklist
Environment:
- Start server and client.
- Open at least one playable client session.

Checks:
1. Join room
   - Client connects and units render.
   - No join/connect errors in console.
2. Select + deselect
   - Left click owned unit selects it.
   - Left click empty map clears selection.
3. Box select
   - Left drag on empty map creates selection box.
   - Releasing selects owned units inside the box.
4. Right-click move
   - Right click with selection sends movement command.
   - Units move toward commanded location.
5. Path drag command
   - Left drag from selected unit (or map with selection) draws preview path.
   - Releasing applies multi-point movement path.
6. Lobby ready/map switch
   - Ready toggle updates correctly.
   - Map select/random/generate updates lobby state and map display.
7. Battle end
   - Trigger a finish condition (no units or no cities for a team).
   - End-of-battle state/message appears and match exits battle flow cleanly.

## Slice Log Template
Copy this into PR notes for each cleanup slice:

```text
Slice:
Typecheck:
- client: PASS/FAIL
- server: PASS/FAIL
Smoke checks:
- join room: PASS/FAIL
- select/deselect: PASS/FAIL
- box select: PASS/FAIL
- right-click move: PASS/FAIL
- path drag: PASS/FAIL
- lobby ready/map switch: PASS/FAIL
- battle end: PASS/FAIL
Notes:
```

