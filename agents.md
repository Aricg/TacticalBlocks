# Project Persona: Historical Battle Simulator

**Status:** MVP Implemented (Phase 1)
**Version:** 0.1.0

## Required Checks
- For every code change/refactor slice, run:
  - `npm run verify`
- `npm run verify` must pass before commit/merge.

## 1. Project Overview
- **Genre:** Multiplayer Top-down 2D real-time tactical simulation.
- **Visual Style:** Minimalist "Animated Battle Map" (e.g., Historia Civilis style).
- **Core Aesthetic:** Solid color backgrounds, rectangular blocks representing army units.

## 2. Technical Stack
- **Engine:** Phaser 3.
- **Build Tool:** Vite.
- **Language:** TypeScript
- **Architecture:** Component-based. Game logic is encapsulated within custom Classes extending Phaser GameObjects.

  Potential Improvement (Refactoring):
   * The pointerdown and pointermove logic in main.ts is starting to get quite
     dense with branching conditions (if (this.selectedUnits.size > 0), if
     (this.pathDrawing), etc.). While perfectly functional for an MVP, this might
     be a good candidate for a simple State Machine if more complex interaction
     modes (like attack-move or guard) are added.
  
    Control Scheme:
   * Left Click (on unit): Select Unit.
   * Left Click (on map): Deselect All.
   * Left Drag (from unit/map with selection): Draw Path.
   * Left Drag (from map with no selection): Box Select.
   * Right Click (on map): Move Command.

