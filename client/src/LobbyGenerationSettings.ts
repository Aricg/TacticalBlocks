import {
  DEFAULT_GENERATION_PROFILE,
  GENERATION_WATER_MODES,
  STARTING_FORCE_LAYOUT_STRATEGIES,
  type GenerationProfileDraft,
  type GenerationWaterMode,
  type StartingForceLayoutStrategy,
} from '../../shared/src/generationProfile.js';
import type { MapGenerationMethod } from '../../shared/src/networkContracts.js';

const GENERATION_METHODS: readonly MapGenerationMethod[] = ['wfc', 'noise', 'auto'];
const MOUNTAIN_DENSITY_PRESETS = [0, 0.01, 0.03, 0.05, 0.08, 0.12] as const;
const FOREST_DENSITY_PRESETS = [0, 0.04, 0.08, 0.12, 0.18, 0.24] as const;
const RIVER_COUNT_PRESETS = [0, 1, 2, 3, 4] as const;
const UNIT_COUNT_PER_TEAM_PRESETS = [8, 16, 24, 32, 48, 64, 96, 128, 250] as const;
const NEUTRAL_CITY_COUNT_PRESETS = [0, 1, 2, 3, 4, 5, 6] as const;
const FRIENDLY_CITY_COUNT_PRESETS = [0, 1, 2, 3] as const;

const cyclePresetValue = <T>(
  values: readonly T[],
  currentValue: T,
  step: number,
): T => {
  const currentIndex = values.indexOf(currentValue);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const normalizedStep = step >= 0 ? 1 : -1;
  const nextIndex =
    (safeCurrentIndex + normalizedStep + values.length) % values.length;
  return values[nextIndex] ?? values[0];
};

export type LobbyGenerationSettingsSnapshot = {
  selectedGenerationMethod: MapGenerationMethod;
  selectedWaterMode: GenerationWaterMode;
  selectedRiverCount: number;
  selectedMountainDensity: number;
  selectedForestDensity: number;
  selectedLayoutStrategy: StartingForceLayoutStrategy;
  selectedUnitCountPerTeam: number;
  selectedNeutralCityCount: number;
  selectedFriendlyCityCount: number;
};

export class LobbyGenerationSettings {
  private selectedGenerationMethod: MapGenerationMethod = 'wfc';
  private selectedWaterMode: GenerationWaterMode =
    DEFAULT_GENERATION_PROFILE.terrain.waterMode;
  private selectedRiverCount = DEFAULT_GENERATION_PROFILE.terrain.riverCount;
  private selectedMountainDensity = DEFAULT_GENERATION_PROFILE.terrain.mountainDensity;
  private selectedForestDensity = DEFAULT_GENERATION_PROFILE.terrain.forestDensity;
  private selectedLayoutStrategy: StartingForceLayoutStrategy =
    DEFAULT_GENERATION_PROFILE.startingForces.layoutStrategy;
  private selectedUnitCountPerTeam =
    DEFAULT_GENERATION_PROFILE.startingForces.unitCountPerTeam;
  private selectedNeutralCityCount = DEFAULT_GENERATION_PROFILE.cities.neutralCityCount;
  private selectedFriendlyCityCount = DEFAULT_GENERATION_PROFILE.cities.friendlyCityCount;

  public cycleGenerationMethod(step: number): void {
    this.selectedGenerationMethod = cyclePresetValue(
      GENERATION_METHODS,
      this.selectedGenerationMethod,
      step,
    );
  }

  public cycleLayoutStrategy(step: number): void {
    this.selectedLayoutStrategy = cyclePresetValue(
      STARTING_FORCE_LAYOUT_STRATEGIES,
      this.selectedLayoutStrategy,
      step,
    );
  }

  public cycleWaterMode(step: number): void {
    this.selectedWaterMode = cyclePresetValue(
      GENERATION_WATER_MODES,
      this.selectedWaterMode,
      step,
    );
  }

  public cycleMountainDensity(step: number): void {
    this.selectedMountainDensity = cyclePresetValue(
      MOUNTAIN_DENSITY_PRESETS,
      this.selectedMountainDensity,
      step,
    );
  }

  public cycleRiverCount(step: number): void {
    this.selectedRiverCount = cyclePresetValue(
      RIVER_COUNT_PRESETS,
      this.selectedRiverCount,
      step,
    );
  }

  public cycleForestDensity(step: number): void {
    this.selectedForestDensity = cyclePresetValue(
      FOREST_DENSITY_PRESETS,
      this.selectedForestDensity,
      step,
    );
  }

  public cycleUnitCountPerTeam(step: number): void {
    this.selectedUnitCountPerTeam = cyclePresetValue(
      UNIT_COUNT_PER_TEAM_PRESETS,
      this.selectedUnitCountPerTeam,
      step,
    );
  }

  public cycleNeutralCityCount(step: number): void {
    this.selectedNeutralCityCount = cyclePresetValue(
      NEUTRAL_CITY_COUNT_PRESETS,
      this.selectedNeutralCityCount,
      step,
    );
  }

  public cycleFriendlyCityCount(step: number): void {
    this.selectedFriendlyCityCount = cyclePresetValue(
      FRIENDLY_CITY_COUNT_PRESETS,
      this.selectedFriendlyCityCount,
      step,
    );
  }

  public toGenerateMapRequest(): {
    method: MapGenerationMethod;
    profile: GenerationProfileDraft;
  } {
    return {
      method: this.selectedGenerationMethod,
      profile: {
        terrain: {
          waterMode: this.selectedWaterMode,
          riverCount: this.selectedRiverCount,
          mountainDensity: this.selectedMountainDensity,
          forestDensity: this.selectedForestDensity,
        },
        cities: {
          neutralCityCount: this.selectedNeutralCityCount,
          friendlyCityCount: this.selectedFriendlyCityCount,
        },
        startingForces: {
          layoutStrategy: this.selectedLayoutStrategy,
          unitCountPerTeam: this.selectedUnitCountPerTeam,
        },
      },
    };
  }

  public toSnapshot(): LobbyGenerationSettingsSnapshot {
    return {
      selectedGenerationMethod: this.selectedGenerationMethod,
      selectedWaterMode: this.selectedWaterMode,
      selectedRiverCount: this.selectedRiverCount,
      selectedMountainDensity: this.selectedMountainDensity,
      selectedForestDensity: this.selectedForestDensity,
      selectedLayoutStrategy: this.selectedLayoutStrategy,
      selectedUnitCountPerTeam: this.selectedUnitCountPerTeam,
      selectedNeutralCityCount: this.selectedNeutralCityCount,
      selectedFriendlyCityCount: this.selectedFriendlyCityCount,
    };
  }
}
