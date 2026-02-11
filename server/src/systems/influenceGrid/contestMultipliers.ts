import { PhaserMath } from "./math.js";
import { StaticInfluenceSource, UnitContributionSource } from "./types.js";

type BuildContestMultiplierByUnitIdParams = {
  activeUnits: UnitContributionSource[];
  staticSources: StaticInfluenceSource[];
  enemyPressureDebuffFloor: number;
  isolatedUnitInfluenceFloor: number;
  supportPressureReference: number;
};

export function buildContestMultiplierByUnitId(
  params: BuildContestMultiplierByUnitIdParams,
): Map<string, number> {
  const {
    activeUnits,
    staticSources,
    enemyPressureDebuffFloor,
    isolatedUnitInfluenceFloor,
    supportPressureReference,
  } = params;
  const multiplierByUnitId = new Map<string, number>();
  for (const unit of activeUnits) {
    multiplierByUnitId.set(
      unit.unitId,
      getContestMultiplier(
        unit,
        activeUnits,
        staticSources,
        enemyPressureDebuffFloor,
        isolatedUnitInfluenceFloor,
        supportPressureReference,
      ),
    );
  }
  return multiplierByUnitId;
}

function getContestMultiplier(
  focusUnit: UnitContributionSource,
  allUnits: UnitContributionSource[],
  staticSources: StaticInfluenceSource[],
  enemyPressureDebuffFloor: number,
  isolatedUnitInfluenceFloor: number,
  supportPressureReference: number,
): number {
  let alliedPressure = 0;
  let enemyPressure = 0;

  for (const unit of allUnits) {
    if (unit.unitId === focusUnit.unitId) {
      continue;
    }

    const distance = Math.hypot(focusUnit.x - unit.x, focusUnit.y - unit.y);
    const pressure = unit.power / (distance * distance + 1);
    if (unit.teamSign === focusUnit.teamSign) {
      alliedPressure += pressure;
    } else {
      enemyPressure += pressure;
    }
  }

  for (const source of staticSources) {
    const distance = Math.hypot(focusUnit.x - source.x, focusUnit.y - source.y);
    const pressure = source.power / (distance * distance + 1);
    if (source.teamSign === focusUnit.teamSign) {
      alliedPressure += pressure;
    } else {
      enemyPressure += pressure;
    }
  }

  const totalPressure = alliedPressure + enemyPressure;
  const alliedShare =
    totalPressure <= 0.00001
      ? 1
      : PhaserMath.clamp(alliedPressure / totalPressure, 0, 1);
  const minContestMultiplier = enemyPressureDebuffFloor;
  const ratioMultiplier =
    minContestMultiplier + alliedShare * (1 - minContestMultiplier);
  const supportStrength =
    alliedPressure / (alliedPressure + supportPressureReference);
  const supportCeiling =
    isolatedUnitInfluenceFloor +
    supportStrength * (1 - isolatedUnitInfluenceFloor);

  return PhaserMath.clamp(
    Math.min(ratioMultiplier, supportCeiling),
    minContestMultiplier,
    1,
  );
}
