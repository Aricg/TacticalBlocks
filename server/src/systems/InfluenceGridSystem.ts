import { GAMEPLAY_CONFIG } from "../../../shared/src/gameplayConfig.js";
import { RuntimeTuning } from "../../../shared/src/runtimeTuning.js";
import { InfluenceGridState } from "../schema/InfluenceGridState.js";
import { Unit } from "../schema/Unit.js";
import {
  accumulateCellInfluence,
  selectContributingSources,
} from "./influenceGrid/cellAccumulation.js";
import { buildContestMultiplierByUnitId } from "./influenceGrid/contestMultipliers.js";
import {
  createDecayedScores,
  writeClampedScoresToStateGrid,
} from "./influenceGrid/decayPostProcess.js";
import { applyTeamFloors } from "./influenceGrid/floorEnforcement.js";
import { collectActiveUnits } from "./influenceGrid/sourceCollection.js";
import { StaticInfluenceSource } from "./influenceGrid/types.js";

export class InfluenceGridSystem {
  private static readonly MAX_MAGNITUDE_EXTRA_DECAY = 0.05;
  private static readonly BALANCE_NEUTRAL_SNAP_DOMINANCE = 0.04;
  private static readonly BALANCE_NEUTRAL_FADE_DOMINANCE = 0.12;
  private static readonly BALANCE_NEUTRAL_MIN_TOTAL_PRESSURE = 0.000001;
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly cellDiagonal: number;
  private readonly coreRadius: number;
  private citySourceCoreRadius: number;
  private decayRate: number;
  private decayZeroEpsilon: number;
  private staticUnitCapGate: number;
  private staticCityCapGate: number;
  private unitCapThreshold: number;
  private unitInfluenceMultiplier: number;
  private cityEnemyGateAlpha: number;
  private isolatedUnitInfluenceFloor: number;
  private supportPressureReference: number;
  private staticVelocityEpsilon: number;
  private dominancePowerMultiplier: number;
  private dominanceMinFloor: number;
  private enemyPressureDebuffFloor: number;
  private coreMinInfluenceFactor: number;
  private maxExtraDecayAtZero: number;
  private maxAbsTacticalScore: number;
  private staticInfluenceSources: StaticInfluenceSource[] = [];
  private readonly previousUnitPositionById = new Map<
    string,
    { x: number; y: number }
  >();
  private static readonly DOMINANCE_REFERENCE_POWER = GAMEPLAY_CONFIG.unit.healthMax;

  constructor() {
    this.gridWidth = GAMEPLAY_CONFIG.influence.gridWidth;
    this.gridHeight = GAMEPLAY_CONFIG.influence.gridHeight;
    this.cellWidth = GAMEPLAY_CONFIG.map.width / this.gridWidth;
    this.cellHeight = GAMEPLAY_CONFIG.map.height / this.gridHeight;
    this.cellDiagonal = Math.hypot(this.cellWidth, this.cellHeight);
    this.coreRadius = Math.max(
      Math.hypot(
        GAMEPLAY_CONFIG.unit.bodyWidth * 0.5,
        GAMEPLAY_CONFIG.unit.bodyHeight * 0.5,
      ),
      Math.min(this.cellWidth, this.cellHeight) * 0.5,
    );
    this.citySourceCoreRadius = Math.max(
      GAMEPLAY_CONFIG.influence.citySourceCoreRadius,
      Math.min(this.cellWidth, this.cellHeight) * 0.5,
    );
    this.decayRate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.decayRate,
      0,
      1,
    );
    this.decayZeroEpsilon = Math.max(0, GAMEPLAY_CONFIG.influence.decayZeroEpsilon);
    this.staticUnitCapGate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.staticUnitCapGate,
      0,
      1,
    );
    this.staticCityCapGate = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.staticCityCapGate,
      0,
      1,
    );
    this.unitCapThreshold = Math.max(0.1, GAMEPLAY_CONFIG.influence.unitCapThreshold);
    this.unitInfluenceMultiplier = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.unitInfluenceMultiplier,
    );
    this.cityEnemyGateAlpha = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.cityEnemyGateAlpha,
    );
    this.isolatedUnitInfluenceFloor = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.isolatedUnitInfluenceFloor,
      0,
      1,
    );
    this.supportPressureReference = Math.max(
      0.0001,
      GAMEPLAY_CONFIG.influence.supportPressureReference,
    );
    this.staticVelocityEpsilon = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.staticVelocityEpsilon,
    );
    this.dominancePowerMultiplier = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.dominancePowerMultiplier,
    );
    this.dominanceMinFloor = Math.max(0, GAMEPLAY_CONFIG.influence.dominanceMinFloor);
    this.enemyPressureDebuffFloor = PhaserMath.clamp(
      GAMEPLAY_CONFIG.runtimeTuning.defaults.influenceEnemyPressureDebuffFloor,
      0,
      1,
    );
    this.coreMinInfluenceFactor = Math.max(
      0,
      GAMEPLAY_CONFIG.influence.coreMinInfluenceFactor,
    );
    this.maxExtraDecayAtZero = PhaserMath.clamp(
      GAMEPLAY_CONFIG.influence.maxExtraDecayAtZero,
      0,
      1,
    );
    this.maxAbsTacticalScore = Math.max(
      1,
      GAMEPLAY_CONFIG.influence.maxAbsTacticalScore,
    );
  }

  public setRuntimeTuning(tuning: RuntimeTuning): void {
    this.decayRate = PhaserMath.clamp(tuning.influenceDecayRate, 0, 1);
    this.decayZeroEpsilon = Math.max(0, tuning.influenceDecayZeroEpsilon);
    this.citySourceCoreRadius = Math.max(0, tuning.citySourceCoreRadius);
    this.staticUnitCapGate = PhaserMath.clamp(tuning.staticUnitCapGate, 0, 1);
    this.staticCityCapGate = PhaserMath.clamp(tuning.staticCityCapGate, 0, 1);
    this.unitCapThreshold = Math.max(0.1, tuning.unitCapThreshold);
    this.unitInfluenceMultiplier = Math.max(0, tuning.unitInfluenceMultiplier);
    this.cityEnemyGateAlpha = Math.max(0, tuning.cityEnemyGateAlpha);
    this.isolatedUnitInfluenceFloor = PhaserMath.clamp(
      tuning.isolatedUnitInfluenceFloor,
      0,
      1,
    );
    this.supportPressureReference = Math.max(0.0001, tuning.supportPressureReference);
    this.enemyPressureDebuffFloor = PhaserMath.clamp(
      tuning.influenceEnemyPressureDebuffFloor,
      0,
      1,
    );
    this.coreMinInfluenceFactor = Math.max(0, tuning.influenceCoreMinInfluenceFactor);
    this.maxExtraDecayAtZero = PhaserMath.clamp(
      tuning.influenceMaxExtraDecayAtZero,
      0,
      1,
    );
  }

  public setStaticInfluenceSources(
    sources: Array<{ x: number; y: number; team: "BLUE" | "RED"; power: number }>,
  ): void {
    this.staticInfluenceSources = sources
      .filter(
        (source) =>
          Number.isFinite(source.x) &&
          Number.isFinite(source.y) &&
          Number.isFinite(source.power) &&
          source.power > 0,
      )
      .map((source) => ({
        x: source.x,
        y: source.y,
        power: source.power,
        teamSign: source.team === "BLUE" ? 1 : -1,
      }));
  }

  public writeInfluenceScores(
    stateGrid: InfluenceGridState,
    units: Iterable<Unit>,
  ): void {
    const { activeUnits, nextPreviousUnitPositionById } = collectActiveUnits({
      units,
      previousUnitPositionById: this.previousUnitPositionById,
      staticVelocityEpsilon: this.staticVelocityEpsilon,
      unitInfluenceMultiplier: this.unitInfluenceMultiplier,
    });

    this.previousUnitPositionById.clear();
    for (const [unitId, position] of nextPreviousUnitPositionById) {
      this.previousUnitPositionById.set(unitId, position);
    }

    const cellCount = this.gridWidth * this.gridHeight;
    const scores = createDecayedScores({
      previousScores: stateGrid.cells,
      cellCount,
      decayRate: this.decayRate,
      decayZeroEpsilon: this.decayZeroEpsilon,
      dominanceReferencePower: InfluenceGridSystem.DOMINANCE_REFERENCE_POWER,
      dominancePowerMultiplier: this.dominancePowerMultiplier,
      maxExtraDecayAtZero: this.maxExtraDecayAtZero,
      maxAbsTacticalScore: this.maxAbsTacticalScore,
      maxMagnitudeExtraDecay: InfluenceGridSystem.MAX_MAGNITUDE_EXTRA_DECAY,
    });

    const { contributingUnits, contributingStaticSources } =
      selectContributingSources({
        scores,
        activeUnits,
        staticInfluenceSources: this.staticInfluenceSources,
        staticUnitCapGate: this.staticUnitCapGate,
        staticCityCapGate: this.staticCityCapGate,
        coreRadius: this.coreRadius,
        citySourceCoreRadius: this.citySourceCoreRadius,
        unitCapThreshold: this.unitCapThreshold,
        gridWidth: this.gridWidth,
        gridHeight: this.gridHeight,
        cellWidth: this.cellWidth,
        cellHeight: this.cellHeight,
      });

    const contestMultiplierByUnitId = buildContestMultiplierByUnitId({
      activeUnits,
      staticSources: contributingStaticSources,
      enemyPressureDebuffFloor: this.enemyPressureDebuffFloor,
      isolatedUnitInfluenceFloor: this.isolatedUnitInfluenceFloor,
      supportPressureReference: this.supportPressureReference,
    });

    const { balanceNeutralizationFactorByCell } = accumulateCellInfluence({
      scores,
      contributingUnits,
      contributingStaticSources,
      contestMultiplierByUnitId,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      cityEnemyGateAlpha: this.cityEnemyGateAlpha,
      balanceNeutralMinTotalPressure:
        InfluenceGridSystem.BALANCE_NEUTRAL_MIN_TOTAL_PRESSURE,
      balanceNeutralSnapDominance:
        InfluenceGridSystem.BALANCE_NEUTRAL_SNAP_DOMINANCE,
      balanceNeutralFadeDominance:
        InfluenceGridSystem.BALANCE_NEUTRAL_FADE_DOMINANCE,
    });

    applyTeamFloors({
      scores,
      balanceNeutralizationFactorByCell,
      activeUnits,
      contributingUnits,
      contestMultiplierByUnitId,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      cellDiagonal: this.cellDiagonal,
      coreRadius: this.coreRadius,
      dominanceReferencePower: InfluenceGridSystem.DOMINANCE_REFERENCE_POWER,
      dominancePowerMultiplier: this.dominancePowerMultiplier,
      dominanceMinFloor: this.dominanceMinFloor,
      coreMinInfluenceFactor: this.coreMinInfluenceFactor,
    });

    writeClampedScoresToStateGrid(stateGrid, scores, this.maxAbsTacticalScore);
    stateGrid.revision += 1;
  }
}

const PhaserMath = {
  clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  },
};
