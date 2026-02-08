# Project Persona: Historical Battle Simulator

**Status:** MVP Implemented (Phase 1)
**Version:** 0.1.0

## 1. Project Overview
- **Genre:** Top-down 2D real-time tactical simulation.
- **Visual Style:** Minimalist "Animated Battle Map" (e.g., Historia Civilis style).
- **Core Aesthetic:** Solid color backgrounds, rectangular blocks representing army units.

## 2. Technical Stack
- **Engine:** Phaser 3 (Local installation via npm).
- **Build Tool:** Vite.
- **Language:** TypeScript (Strict mode).
- **Architecture:** Component-based. Game logic is encapsulated within custom Classes extending Phaser GameObjects.

## 3. Current Implementation (Phase 1 MVP)

### The Unit (`src/Unit.ts`)
- **Structure:** Extends `Phaser.GameObjects.Container`.
- **Visuals:** 
  - `Phaser.GameObjects.Rectangle` representing the formation body.
  - `Phaser.GameObjects.Triangle` representing the facing direction.
- **Movement Logic:** Custom kinematic steering behavior (No Arcade Physics).
  - **State 1 (Rotate):** Unit rotates in place until facing the target coordinates.
  - **State 2 (Move):** Once aligned, unit moves forward at constant speed until reaching the destination.
- **Selection:** Visual feedback via stroke/outline color change (White = Selected, Dark = Unselected).

### The Scene (`src/main.ts`)
- **Map:** Simple green background (`0x2f7d32`).
- **Input Handling:**
  - **Left-Click (Unit):** Selects the unit. Stops event propagation to prevent triggering a move command simultaneously.
  - **Left-Click (Terrain):** If a unit is selected, issues a Move command to the clicked location.
  - **Right-Click:** Deselects the current unit.

## 4. Coding Standards & Conventions
- **State Management:** Distinct states for "Selecting" and "Commanding" to avoid input conflicts.
- **Math:** Use `Phaser.Math` helpers (Vector2, Angle) for all spatial calculations.
- **Typing:** strictly typed; avoid `any`. Use `Unit.fromGameObject` helper for type-safe event delegation.
- **File Structure:** 
  - `src/` contains all source code.
  - `dist/` is the build output.
  - Local `start-dev.sh` for environment setup.

  Potential Improvement (Refactoring):
   * The pointerdown and pointermove logic in main.ts is starting to get quite
     dense with branching conditions (if (this.selectedUnits.size > 0), if
     (this.pathDrawing), etc.). While perfectly functional for an MVP, this might
     be a good candidate for a simple State Machine if more complex interaction
     modes (like attack-move or guard) are added.
