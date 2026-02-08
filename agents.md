# Project Persona: Historical Battle Simulator (MVP)

nvm use 20.18.1

## 1. Project Overview
- **Genre:** Top-down 2D real-time tactical simulation.
- **Visual Style:** Minimalist "Animated Battle Map" (e.g., Historia Civilis style).
- **Core Aesthetic:** Solid color backgrounds, rectangular blocks representing army units.

## 2. Technical Stack
- **Engine:** Phaser 3 (Local installation via npm).
- **Environment:** Local development on macOS (Vite as the bundler).
- **Architecture:** Modular JavaScript. Avoid global variables; use classes for Game Objects (Units).
- **No CDNs:** All dependencies must be managed locally.

## 3. Visual Standards
- **Map:** Plain green background.
- **Units:** Simple 2D rectangles.
- **Movement:** Units should rotate to face their destination and move at a constant speed.

## 4. Interaction Logic
- **Selection:** Left-click on a unit to select it. Only one unit can be selected at a time (for now).
- **Commands:** If a unit is selected, clicking on the map (terrain) issues a "Move" command.
- **State Management:** Ensure "Selecting a unit" and "Moving a unit" are distinct actions to avoid accidental moves when trying to select.

## 5. Coding Guidelines for AI
- **Logic over Physics:** Prefer coordinate-based movement or Phaser Tweens over complex Arcade Physics unless specified.
- **Modularity:** Keep the Unit logic inside a `Unit` class.
- **Comments:** Provide brief comments for tactical logic (e.g., "Calculate angle to target").
- **Mac Specifics:** Assume a standard Mac file structure and Terminal commands (zsh).

## 6. Current MVP Goal
- A single green screen with one block that can be selected and moved via mouse clicks.
