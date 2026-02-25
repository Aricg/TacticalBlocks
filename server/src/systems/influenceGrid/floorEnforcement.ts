import { PhaserMath } from "./math.js";
import {
  DominanceTarget,
  TeamSign,
  UnitContributionSource,
} from "./types.js";

type GridGeometry = {
  gridWidth: number;
  gridHeight: number;
  cellWidth: number;
  cellHeight: number;
  cellDiagonal: number;
};

type ApplyTeamFloorsParams = GridGeometry & {
  scores: Float32Array;
  balanceNeutralizationFactorByCell: Float32Array;
  activeUnits: UnitContributionSource[];
  contributingUnits: UnitContributionSource[];
  contestMultiplierByUnitId: ReadonlyMap<string, number>;
  coreRadius: number;
  dominanceReferencePower: number;
  dominancePowerMultiplier: number;
  dominanceMinFloor: number;
  coreMinInfluenceFactor: number;
};

export function applyTeamFloors(params: ApplyTeamFloorsParams): void {
  const {
    scores,
    balanceNeutralizationFactorByCell,
    activeUnits,
    contributingUnits,
    contestMultiplierByUnitId,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
    cellDiagonal,
    coreRadius,
    dominanceReferencePower,
    dominancePowerMultiplier,
    dominanceMinFloor,
    coreMinInfluenceFactor,
  } = params;
  const cellCount = gridWidth * gridHeight;
  const blueFloorByCell = new Float32Array(cellCount);
  const redFloorByCell = new Float32Array(cellCount);

  for (const unit of contributingUnits) {
    const targets = getDominanceTargets(
      unit.x,
      unit.y,
      gridWidth,
      gridHeight,
      cellWidth,
      cellHeight,
      cellDiagonal,
    );
    if (targets.length === 0) {
      continue;
    }

    const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
    const absoluteDominance = getAbsoluteDominance(
      unit.power * contestMultiplier,
      dominanceReferencePower,
      dominancePowerMultiplier,
      dominanceMinFloor,
    );
    for (const target of targets) {
      const weightedFloor = absoluteDominance * target.weight;
      setTeamFloorAtIndex(
        blueFloorByCell,
        redFloorByCell,
        target.index,
        unit.teamSign,
        weightedFloor,
      );
    }
  }

  for (const unit of activeUnits) {
    const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
    enforceCoreMinimumInfluence({
      blueFloorByCell,
      redFloorByCell,
      unit,
      effectivePower: unit.power * contestMultiplier,
      coreRadius,
      gridWidth,
      gridHeight,
      cellWidth,
      cellHeight,
      dominanceReferencePower,
      dominancePowerMultiplier,
      dominanceMinFloor,
      coreMinInfluenceFactor,
    });
  }

  for (let index = 0; index < cellCount; index += 1) {
    const balanceNeutralizationFactor = balanceNeutralizationFactorByCell[index] ?? 1;
    const floorDamping = balanceNeutralizationFactor * balanceNeutralizationFactor;
    const blueFloor = blueFloorByCell[index] * floorDamping;
    const redFloor = redFloorByCell[index] * floorDamping;
    if (blueFloor > 0 && redFloor > 0) {
      continue;
    }
    if (blueFloor > 0) {
      scores[index] = Math.max(scores[index], blueFloor);
      continue;
    }
    if (redFloor > 0) {
      scores[index] = Math.min(scores[index], -redFloor);
    }
  }
}

function getAbsoluteDominance(
  power: number,
  dominanceReferencePower: number,
  dominancePowerMultiplier: number,
  dominanceMinFloor: number,
): number {
  const dominancePower = Math.max(power, dominanceReferencePower);
  return Math.max(dominanceMinFloor, dominancePower * dominancePowerMultiplier);
}

function getDominanceTargets(
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number,
  cellWidth: number,
  cellHeight: number,
  cellDiagonal: number,
): DominanceTarget[] {
  const colBasis = x / cellWidth - 0.5;
  const rowBasis = y / cellHeight - 0.5;
  const minCol = PhaserMath.floorClamp(colBasis, 0, gridWidth - 1);
  const maxCol = PhaserMath.clamp(Math.ceil(colBasis), 0, gridWidth - 1);
  const minRow = PhaserMath.floorClamp(rowBasis, 0, gridHeight - 1);
  const maxRow = PhaserMath.clamp(Math.ceil(rowBasis), 0, gridHeight - 1);

  const candidateCoords = [
    { col: minCol, row: minRow },
    { col: maxCol, row: minRow },
    { col: minCol, row: maxRow },
    { col: maxCol, row: maxRow },
  ];

  const uniqueCoords = new Map<string, { col: number; row: number }>();
  for (const coord of candidateCoords) {
    uniqueCoords.set(`${coord.col}:${coord.row}`, coord);
  }

  const weightedTargets: Array<{ index: number; rawWeight: number }> = [];
  let totalWeight = 0;
  for (const coord of uniqueCoords.values()) {
    const cellCenterX = (coord.col + 0.5) * cellWidth;
    const cellCenterY = (coord.row + 0.5) * cellHeight;
    const distance = Math.hypot(x - cellCenterX, y - cellCenterY);
    const normalizedDistance = cellDiagonal > 0 ? distance / cellDiagonal : 0;
    const rawWeight = Math.max(0, 1 - normalizedDistance);
    if (rawWeight <= 0) {
      continue;
    }

    const index = coord.row * gridWidth + coord.col;
    weightedTargets.push({ index, rawWeight });
    totalWeight += rawWeight;
  }

  if (weightedTargets.length === 0 || totalWeight <= 0) {
    return [];
  }

  return weightedTargets.map((target) => ({
    index: target.index,
    weight: target.rawWeight / totalWeight,
  }));
}

type EnforceCoreMinimumInfluenceParams = {
  blueFloorByCell: Float32Array;
  redFloorByCell: Float32Array;
  unit: UnitContributionSource;
  effectivePower: number;
  coreRadius: number;
  gridWidth: number;
  gridHeight: number;
  cellWidth: number;
  cellHeight: number;
  dominanceReferencePower: number;
  dominancePowerMultiplier: number;
  dominanceMinFloor: number;
  coreMinInfluenceFactor: number;
};

function enforceCoreMinimumInfluence(
  params: EnforceCoreMinimumInfluenceParams,
): void {
  const {
    blueFloorByCell,
    redFloorByCell,
    unit,
    effectivePower,
    coreRadius,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
    dominanceReferencePower,
    dominancePowerMultiplier,
    dominanceMinFloor,
    coreMinInfluenceFactor,
  } = params;
  const coreRadiusSquared = coreRadius * coreRadius;
  const minCol = PhaserMath.floorClamp(
    (unit.x - coreRadius) / cellWidth - 0.5,
    0,
    gridWidth - 1,
  );
  const maxCol = PhaserMath.floorClamp(
    (unit.x + coreRadius) / cellWidth - 0.5,
    0,
    gridWidth - 1,
  );
  const minRow = PhaserMath.floorClamp(
    (unit.y - coreRadius) / cellHeight - 0.5,
    0,
    gridHeight - 1,
  );
  const maxRow = PhaserMath.floorClamp(
    (unit.y + coreRadius) / cellHeight - 0.5,
    0,
    gridHeight - 1,
  );
  const minimumInfluence = Math.max(
    dominanceMinFloor,
    getAbsoluteDominance(
      effectivePower,
      dominanceReferencePower,
      dominancePowerMultiplier,
      dominanceMinFloor,
    ) * coreMinInfluenceFactor,
  );

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cellCenterX = (col + 0.5) * cellWidth;
      const cellCenterY = (row + 0.5) * cellHeight;
      const deltaX = cellCenterX - unit.x;
      const deltaY = cellCenterY - unit.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared > coreRadiusSquared) {
        continue;
      }

      const index = row * gridWidth + col;
      setTeamFloorAtIndex(
        blueFloorByCell,
        redFloorByCell,
        index,
        unit.teamSign,
        minimumInfluence,
      );
    }
  }
}

function setTeamFloorAtIndex(
  blueFloorByCell: Float32Array,
  redFloorByCell: Float32Array,
  index: number,
  teamSign: TeamSign,
  floorMagnitude: number,
): void {
  if (floorMagnitude <= 0) {
    return;
  }

  if (teamSign > 0) {
    blueFloorByCell[index] = Math.max(blueFloorByCell[index], floorMagnitude);
  } else {
    redFloorByCell[index] = Math.max(redFloorByCell[index], floorMagnitude);
  }
}
