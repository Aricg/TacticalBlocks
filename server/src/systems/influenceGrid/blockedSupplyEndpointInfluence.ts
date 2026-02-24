import type { PlayerTeam } from "../../../../shared/src/networkContracts.js";

export type GridCoordinate = {
  col: number;
  row: number;
};

export type BlockedSupplyEndpointSample = {
  unitId: string;
  team: PlayerTeam | null;
  endpointCell: GridCoordinate | null;
};

export type SupplyEndpointInfluenceSource = {
  x: number;
  y: number;
  power: number;
  team: PlayerTeam;
};

export type BlockedSupplyEndpointInfluenceOptions = {
  perEndpointUnitEquivalent: number;
  stackCapUnits: number;
  stickyMs: number;
  lingerMs: number;
  switchDistanceCells: number;
  riseSeconds: number;
  fadeSeconds: number;
  minStrength: number;
};

type BlockedSupplyEndpointInfluenceState = {
  team: PlayerTeam;
  col: number;
  row: number;
  strength: number;
  lastUpdateMs: number;
  lastAnchorChangeMs: number;
  lastDisconnectedAtMs: number;
};

type EndpointStack = {
  team: PlayerTeam;
  col: number;
  row: number;
  unitEquivalent: number;
};

export const DEFAULT_BLOCKED_SUPPLY_ENDPOINT_INFLUENCE_OPTIONS: BlockedSupplyEndpointInfluenceOptions =
  {
    perEndpointUnitEquivalent: 0.5,
    stackCapUnits: 1.5,
    stickyMs: 900,
    lingerMs: 1200,
    switchDistanceCells: 2,
    riseSeconds: 0.35,
    fadeSeconds: 1.2,
    minStrength: 0.01,
  };

export class BlockedSupplyEndpointInfluenceTracker {
  private readonly stateByUnitId = new Map<
    string,
    BlockedSupplyEndpointInfluenceState
  >();

  constructor(
    private readonly options: BlockedSupplyEndpointInfluenceOptions,
  ) {}

  public clear(): void {
    this.stateByUnitId.clear();
  }

  public deleteUnit(unitId: string): void {
    this.stateByUnitId.delete(unitId);
  }

  public buildSources({
    samples,
    nowMs,
    unitPower,
    gridToWorldCenter,
  }: {
    samples: Iterable<BlockedSupplyEndpointSample>;
    nowMs: number;
    unitPower: number;
    gridToWorldCenter: (cell: GridCoordinate) => { x: number; y: number };
  }): SupplyEndpointInfluenceSource[] {
    if (unitPower <= 0) {
      return [];
    }

    if (
      this.options.perEndpointUnitEquivalent <= 0 ||
      this.options.stackCapUnits <= 0
    ) {
      return [];
    }

    const activeUnitIds = new Set<string>();
    for (const sample of samples) {
      activeUnitIds.add(sample.unitId);
      this.updateState(sample, nowMs);
    }
    this.pruneInactiveStates(activeUnitIds);

    const endpointStacksByCellKey = new Map<string, EndpointStack>();
    for (const endpointState of this.stateByUnitId.values()) {
      if (endpointState.strength < this.options.minStrength) {
        continue;
      }

      const key = `${endpointState.team}:${endpointState.col},${endpointState.row}`;
      const unitEquivalentContribution =
        this.options.perEndpointUnitEquivalent * endpointState.strength;
      const existingStack = endpointStacksByCellKey.get(key);
      if (!existingStack) {
        endpointStacksByCellKey.set(key, {
          team: endpointState.team,
          col: endpointState.col,
          row: endpointState.row,
          unitEquivalent: unitEquivalentContribution,
        });
        continue;
      }
      existingStack.unitEquivalent += unitEquivalentContribution;
    }

    const influenceSources: SupplyEndpointInfluenceSource[] = [];
    for (const stack of endpointStacksByCellKey.values()) {
      const unitEquivalent = Math.min(
        this.options.stackCapUnits,
        stack.unitEquivalent,
      );
      if (unitEquivalent <= 0) {
        continue;
      }

      const worldPosition = gridToWorldCenter({ col: stack.col, row: stack.row });
      influenceSources.push({
        x: worldPosition.x,
        y: worldPosition.y,
        team: stack.team,
        power: unitPower * unitEquivalent,
      });
    }

    return influenceSources;
  }

  private updateState(sample: BlockedSupplyEndpointSample, nowMs: number): void {
    const hasBlockedEndpoint =
      sample.team !== null && sample.endpointCell !== null;
    let endpointState = this.stateByUnitId.get(sample.unitId);
    if (!endpointState) {
      if (!hasBlockedEndpoint || !sample.team || !sample.endpointCell) {
        return;
      }
      endpointState = {
        team: sample.team,
        col: sample.endpointCell.col,
        row: sample.endpointCell.row,
        strength: 0,
        lastUpdateMs: nowMs,
        lastAnchorChangeMs: nowMs,
        lastDisconnectedAtMs: nowMs,
      };
      this.stateByUnitId.set(sample.unitId, endpointState);
    }

    const elapsedSeconds = Math.max(0, (nowMs - endpointState.lastUpdateMs) / 1000);
    if (hasBlockedEndpoint && sample.team && sample.endpointCell) {
      if (this.shouldSwitchAnchor(endpointState, sample.team, sample.endpointCell, nowMs)) {
        endpointState.col = sample.endpointCell.col;
        endpointState.row = sample.endpointCell.row;
        endpointState.lastAnchorChangeMs = nowMs;
      }
      endpointState.team = sample.team;
      endpointState.lastDisconnectedAtMs = nowMs;
    }

    const targetStrength = hasBlockedEndpoint ? 1 : 0;
    const transitionSeconds =
      targetStrength > endpointState.strength
        ? this.options.riseSeconds
        : this.options.fadeSeconds;
    const maxDelta =
      transitionSeconds <= 0 ? 1 : Math.min(1, elapsedSeconds / transitionSeconds);
    if (targetStrength > endpointState.strength) {
      endpointState.strength = Math.min(
        targetStrength,
        endpointState.strength + maxDelta,
      );
    } else if (targetStrength < endpointState.strength) {
      endpointState.strength = Math.max(
        targetStrength,
        endpointState.strength - maxDelta,
      );
    }
    endpointState.lastUpdateMs = nowMs;

    if (
      !hasBlockedEndpoint &&
      nowMs - endpointState.lastDisconnectedAtMs > this.options.lingerMs &&
      endpointState.strength <= this.options.minStrength
    ) {
      this.stateByUnitId.delete(sample.unitId);
    }
  }

  private shouldSwitchAnchor(
    endpointState: BlockedSupplyEndpointInfluenceState,
    team: PlayerTeam,
    endpointCell: GridCoordinate,
    nowMs: number,
  ): boolean {
    if (endpointState.team !== team) {
      return true;
    }
    if (
      endpointState.col === endpointCell.col &&
      endpointState.row === endpointCell.row
    ) {
      return false;
    }

    const manhattanDistance =
      Math.abs(endpointState.col - endpointCell.col) +
      Math.abs(endpointState.row - endpointCell.row);
    if (manhattanDistance >= this.options.switchDistanceCells) {
      return true;
    }

    return nowMs - endpointState.lastAnchorChangeMs >= this.options.stickyMs;
  }

  private pruneInactiveStates(activeUnitIds: ReadonlySet<string>): void {
    for (const unitId of Array.from(this.stateByUnitId.keys())) {
      if (activeUnitIds.has(unitId)) {
        continue;
      }
      this.stateByUnitId.delete(unitId);
    }
  }
}

export function resolveBlockedSupplyEndpointCellFromPath(
  path: ArrayLike<GridCoordinate>,
  severIndex: number,
): GridCoordinate | null {
  const pathLength = path.length;
  if (pathLength === 0 || severIndex < 0) {
    return null;
  }

  const endpointIndex = Math.min(pathLength - 1, Math.max(0, severIndex - 1));
  const endpointCell = path[endpointIndex];
  if (!endpointCell) {
    return null;
  }

  return {
    col: endpointCell.col,
    row: endpointCell.row,
  };
}
