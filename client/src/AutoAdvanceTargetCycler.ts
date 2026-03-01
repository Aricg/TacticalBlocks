import type { GridCoordinate } from './UnitCommandPlanner';

type AutoAdvanceSelectionParams = {
  friendlyTeamKey: string;
  candidateTargets: ReadonlyArray<GridCoordinate>;
  formationCell: GridCoordinate | null;
  selectedUnitIds: ReadonlyArray<string>;
};

export class AutoAdvanceTargetCycler {
  private cycleSignature: string | null = null;
  private orderedTargets: GridCoordinate[] = [];
  private nextIndex = 0;

  public reset(): void {
    this.cycleSignature = null;
    this.orderedTargets = [];
    this.nextIndex = 0;
  }

  public select({
    friendlyTeamKey,
    candidateTargets,
    formationCell,
    selectedUnitIds,
  }: AutoAdvanceSelectionParams): GridCoordinate | null {
    if (candidateTargets.length === 0) {
      return null;
    }

    if (!formationCell) {
      return candidateTargets[0] ?? null;
    }

    const candidateKeys = candidateTargets
      .map((cell) => `${cell.col}:${cell.row}`)
      .sort();
    const cycleSignature =
      `${friendlyTeamKey}|${selectedUnitIds.join(',')}|${candidateKeys.join(';')}`;

    if (this.cycleSignature !== cycleSignature || this.orderedTargets.length === 0) {
      const sortedByDistance = candidateTargets
        .map((cell) => ({ cell, key: `${cell.col}:${cell.row}` }))
        .sort((left, right) => {
          const leftDistance =
            (left.cell.col - formationCell.col) * (left.cell.col - formationCell.col) +
            (left.cell.row - formationCell.row) * (left.cell.row - formationCell.row);
          const rightDistance =
            (right.cell.col - formationCell.col) * (right.cell.col - formationCell.col) +
            (right.cell.row - formationCell.row) * (right.cell.row - formationCell.row);
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
          return left.key.localeCompare(right.key);
        });

      this.cycleSignature = cycleSignature;
      this.orderedTargets = sortedByDistance.map(({ cell }) => ({
        col: cell.col,
        row: cell.row,
      }));
      this.nextIndex = 1;
      return this.orderedTargets[0] ?? null;
    }

    const targetCount = this.orderedTargets.length;
    const selectedIndex = this.nextIndex % targetCount;
    this.nextIndex = (selectedIndex + 1) % targetCount;
    const target = this.orderedTargets[selectedIndex];
    return target ? { col: target.col, row: target.row } : null;
  }
}
