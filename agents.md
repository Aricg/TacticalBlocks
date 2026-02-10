# Project Persona: Historical Battle Simulator

**Status:** MVP Implemented (Phase 1)
**Version:** 0.1.0

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



TODO:
To implement the "War of Dots" influence line, we should approach it as a Potential Field. Each unit projects a "force," and the line is the "zero-point" where those forces balance out.
Because we are in a multiplayer (Colyseus) environment, we want the Server to calculate the values (for fairness) and the Client to draw the line smoothly.
Here is the multi-step prompt for your AI agent:

Step 1: The Influence Grid (Server-Side)
Task: Create a low-resolution grid to track team "pressure" on the server.
"In the server folder, implement an InfluenceGrid system:
Create a 2D array (e.g., 40x22 for a 1920x1080 map) to represent 'Influence Cells'.
Each frame, calculate the 'Influence Score' for every cell.
The Math: For each cell, sum up the influence from all units. Influence = TeamPower / (Distance + 1). Blue adds to the score, Red subtracts.
Add this grid to the BattleRoom state so it syncs to the client.
Optimization: Only update the grid every 5-10 frames; it doesn't need to be 60fps on the server."

Step 2: The Visual Line (Client-Side)
Task: Draw the "zero-crossing" line where the influence scores balance out.
"In the client folder, create an InfluenceRenderer class:
Listen for updates to the server's InfluenceGrid.
Use a Phaser.Graphics object to draw the 'Front Line'.
Use an algorithm to find the 'Zero Crossing' points between grid cells (where the score switches from positive to negative).
Connect these points with a thick, smooth black line.
Vibe Check: Use catmullRom or a similar spline interpolation to ensure the line looks organic and 'snaky' like War of Dots, rather than jagged and pixelated."

"The Influence Line is purely a visual representation of the current state of units. It should not block unit movement, but simply reflect the balance of power on the map."


the units have an influece score and its displayed visually with a number, when a unit is clicked on. this value tops out at 100.

the calculation is a complicated field. I belive the field should stay the same so we can see each teams total influence, and the lines of influence can be drawn on the map. this part is working well.  but for an individual unit the score should be determined by the squares of influence surrounding it. for example if there are ajacent squares that are not of its color its strenght should never reach 100. 
basically the influcen score should apply to the map as it does and a new concept the units moral should be derived from the strenght of the field surrounding it

