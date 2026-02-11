import { PhaserMath } from "./math.js";
import { StaticInfluenceSource, UnitContributionSource } from "./types.js";

type GridGeometry = {
  gridWidth: number;
  gridHeight: number;
  cellWidth: number;
  cellHeight: number;
};

type SelectContributingSourcesParams = GridGeometry & {
  scores: Float32Array;
  activeUnits: UnitContributionSource[];
  staticInfluenceSources: StaticInfluenceSource[];
  staticUnitCapGate: number;
  staticCityCapGate: number;
  coreRadius: number;
  citySourceCoreRadius: number;
  unitCapThreshold: number;
};

type SelectContributingSourcesResult = {
  contributingUnits: UnitContributionSource[];
  contributingStaticSources: StaticInfluenceSource[];
};

type AccumulateCellInfluenceParams = GridGeometry & {
  scores: Float32Array;
  contributingUnits: UnitContributionSource[];
  contributingStaticSources: StaticInfluenceSource[];
  contestMultiplierByUnitId: ReadonlyMap<string, number>;
  cityEnemyGateAlpha: number;
  balanceNeutralMinTotalPressure: number;
  balanceNeutralSnapDominance: number;
  balanceNeutralFadeDominance: number;
};

type AccumulateCellInfluenceResult = {
  balanceNeutralizationFactorByCell: Float32Array;
};

export function selectContributingSources(
  params: SelectContributingSourcesParams,
): SelectContributingSourcesResult {
  const {
    activeUnits,
    staticInfluenceSources,
    staticUnitCapGate,
    staticCityCapGate,
    scores,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
    coreRadius,
    citySourceCoreRadius,
    unitCapThreshold,
  } = params;
  const contributingUnits = activeUnits.filter((unit) => {
    if (staticUnitCapGate < 0.5 || !unit.isStatic) {
      return true;
    }

    return !hasStaticUnitReachedCoreCap({
      scores,
      unit,
      gridWidth,
      gridHeight,
      cellWidth,
      cellHeight,
      coreRadius,
      unitCapThreshold,
    });
  });

  const contributingStaticSources = staticInfluenceSources.filter(
    (source) =>
      staticCityCapGate < 0.5 ||
      !hasStaticSourceReachedCoreCap({
        scores,
        source,
        gridWidth,
        gridHeight,
        cellWidth,
        cellHeight,
        coreRadius: citySourceCoreRadius,
      }),
  );

  return {
    contributingUnits,
    contributingStaticSources,
  };
}

export function accumulateCellInfluence(
  params: AccumulateCellInfluenceParams,
): AccumulateCellInfluenceResult {
  const {
    scores,
    contributingUnits,
    contributingStaticSources,
    contestMultiplierByUnitId,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
    cityEnemyGateAlpha,
    balanceNeutralMinTotalPressure,
    balanceNeutralSnapDominance,
    balanceNeutralFadeDominance,
  } = params;
  const cellCount = gridWidth * gridHeight;
  const balanceNeutralizationFactorByCell = new Float32Array(cellCount);

  for (let index = 0; index < cellCount; index += 1) {
    const cellX = index % gridWidth;
    const cellY = Math.floor(index / gridWidth);
    const worldX = (cellX + 0.5) * cellWidth;
    const worldY = (cellY + 0.5) * cellHeight;
    let blueUnitPressure = 0;
    let redUnitPressure = 0;
    let blueTotalPressure = 0;
    let redTotalPressure = 0;

    for (const unit of contributingUnits) {
      const distance = Math.hypot(worldX - unit.x, worldY - unit.y);
      const contestMultiplier = contestMultiplierByUnitId.get(unit.unitId) ?? 1;
      const localInfluence =
        (unit.power * contestMultiplier) / (distance * distance + 1);
      scores[index] += localInfluence * unit.teamSign;
      if (unit.teamSign > 0) {
        blueUnitPressure += localInfluence;
        blueTotalPressure += localInfluence;
      } else {
        redUnitPressure += localInfluence;
        redTotalPressure += localInfluence;
      }
    }

    for (const source of contributingStaticSources) {
      const distance = Math.hypot(worldX - source.x, worldY - source.y);
      const localInfluence = source.power / (distance * distance + 1);
      const enemyPressure = source.teamSign > 0 ? redUnitPressure : blueUnitPressure;
      const gateMultiplier = getCityGateMultiplier(enemyPressure, cityEnemyGateAlpha);
      const effectiveInfluence = localInfluence * gateMultiplier;
      scores[index] += effectiveInfluence * source.teamSign;
      if (source.teamSign > 0) {
        blueTotalPressure += effectiveInfluence;
      } else {
        redTotalPressure += effectiveInfluence;
      }
    }

    const balanceNeutralizationFactor = getBalanceNeutralizationFactor(
      blueTotalPressure,
      redTotalPressure,
      balanceNeutralMinTotalPressure,
      balanceNeutralSnapDominance,
      balanceNeutralFadeDominance,
    );
    balanceNeutralizationFactorByCell[index] = balanceNeutralizationFactor;
    scores[index] *= balanceNeutralizationFactor;
  }

  return {
    balanceNeutralizationFactorByCell,
  };
}

type HasStaticUnitReachedCoreCapParams = GridGeometry & {
  scores: Float32Array;
  unit: UnitContributionSource;
  coreRadius: number;
  unitCapThreshold: number;
};

function hasStaticUnitReachedCoreCap(
  params: HasStaticUnitReachedCoreCapParams,
): boolean {
  const {
    scores,
    unit,
    coreRadius,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
    unitCapThreshold,
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

  const maxInfluence = Math.max(1, unit.power * unitCapThreshold);
  let hasCoreCell = false;

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

      hasCoreCell = true;
      const score = scores[row * gridWidth + col];
      if (unit.teamSign > 0) {
        if (score < maxInfluence) {
          return false;
        }
      } else if (score > -maxInfluence) {
        return false;
      }
    }
  }

  return hasCoreCell;
}

type HasStaticSourceReachedCoreCapParams = GridGeometry & {
  scores: Float32Array;
  source: StaticInfluenceSource;
  coreRadius: number;
};

function hasStaticSourceReachedCoreCap(
  params: HasStaticSourceReachedCoreCapParams,
): boolean {
  const {
    scores,
    source,
    coreRadius,
    gridWidth,
    gridHeight,
    cellWidth,
    cellHeight,
  } = params;
  const coreRadiusSquared = coreRadius * coreRadius;
  const minCol = PhaserMath.floorClamp(
    (source.x - coreRadius) / cellWidth - 0.5,
    0,
    gridWidth - 1,
  );
  const maxCol = PhaserMath.floorClamp(
    (source.x + coreRadius) / cellWidth - 0.5,
    0,
    gridWidth - 1,
  );
  const minRow = PhaserMath.floorClamp(
    (source.y - coreRadius) / cellHeight - 0.5,
    0,
    gridHeight - 1,
  );
  const maxRow = PhaserMath.floorClamp(
    (source.y + coreRadius) / cellHeight - 0.5,
    0,
    gridHeight - 1,
  );

  const maxInfluence = Math.max(1, source.power);
  let hasCoreCell = false;

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cellCenterX = (col + 0.5) * cellWidth;
      const cellCenterY = (row + 0.5) * cellHeight;
      const deltaX = cellCenterX - source.x;
      const deltaY = cellCenterY - source.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared > coreRadiusSquared) {
        continue;
      }

      hasCoreCell = true;
      const score = scores[row * gridWidth + col];
      if (source.teamSign > 0) {
        if (score < maxInfluence) {
          return false;
        }
      } else if (score > -maxInfluence) {
        return false;
      }
    }
  }

  return hasCoreCell;
}

function getCityGateMultiplier(
  enemyPressure: number,
  cityEnemyGateAlpha: number,
): number {
  if (cityEnemyGateAlpha <= 0) {
    return 1;
  }
  return Math.exp(-cityEnemyGateAlpha * Math.max(0, enemyPressure));
}

function getBalanceNeutralizationFactor(
  bluePressure: number,
  redPressure: number,
  balanceNeutralMinTotalPressure: number,
  balanceNeutralSnapDominance: number,
  balanceNeutralFadeDominance: number,
): number {
  const totalPressure = bluePressure + redPressure;
  if (totalPressure <= balanceNeutralMinTotalPressure) {
    return 0;
  }

  const dominance = Math.abs(bluePressure - redPressure) / totalPressure;
  if (dominance <= balanceNeutralSnapDominance) {
    return 0;
  }
  if (dominance >= balanceNeutralFadeDominance) {
    return 1;
  }

  const t =
    (dominance - balanceNeutralSnapDominance) /
    (balanceNeutralFadeDominance - balanceNeutralSnapDominance);
  return t * t * (3 - 2 * t);
}
