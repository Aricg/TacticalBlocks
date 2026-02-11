import {
  type RuntimeTuning,
  type RuntimeTuningKey,
  RUNTIME_TUNING_BOUNDS,
} from '../../shared/src/runtimeTuning.js';

type SliderDescriptor = {
  key: RuntimeTuningKey;
  label: string;
  group: string;
};

const SLIDERS: SliderDescriptor[] = [
  { key: 'baseUnitHealth', label: 'Base Unit Health', group: 'Combat' },
  {
    key: 'healthInfluenceMultiplier',
    label: 'Health Influence Bonus',
    group: 'Combat',
  },
  { key: 'unitMoveSpeed', label: 'Unit Speed', group: 'Movement' },
  { key: 'baseContactDps', label: 'Base Contact DPS', group: 'Combat' },
  {
    key: 'dpsInfluenceMultiplier',
    label: 'DPS Influence Bonus',
    group: 'Combat',
  },
  {
    key: 'influenceUpdateIntervalFrames',
    label: 'Update Interval (frames)',
    group: 'Influence',
  },
  { key: 'influenceDecayRate', label: 'Decay Rate', group: 'Influence' },
  { key: 'influenceDecayZeroEpsilon', label: 'Decay Zero Epsilon', group: 'Influence' },
  {
    key: 'citySourceCoreRadius',
    label: 'City Source Radius',
    group: 'Influence',
  },
  {
    key: 'staticUnitCapGate',
    label: 'Static Unit Cap Gate',
    group: 'Influence',
  },
  {
    key: 'staticCityCapGate',
    label: 'Static City Cap Gate',
    group: 'Influence',
  },
  {
    key: 'unitCapThreshold',
    label: 'Unit Cap Threshold',
    group: 'Influence',
  },
  {
    key: 'unitInfluenceMultiplier',
    label: 'Unit Influence Power',
    group: 'Influence',
  },
  {
    key: 'cityEnemyGateAlpha',
    label: 'City Enemy Gate',
    group: 'Influence',
  },
  {
    key: 'isolatedUnitInfluenceFloor',
    label: 'Isolated Unit Floor',
    group: 'Influence',
  },
  {
    key: 'supportPressureReference',
    label: 'Support Pressure Ref',
    group: 'Influence',
  },
  {
    key: 'influenceEnemyPressureDebuffFloor',
    label: 'Enemy Pressure Floor',
    group: 'Influence',
  },
  {
    key: 'influenceCoreMinInfluenceFactor',
    label: 'Core Min Influence',
    group: 'Influence',
  },
  {
    key: 'influenceMaxExtraDecayAtZero',
    label: 'Extra Decay @ Zero',
    group: 'Influence',
  },
  { key: 'fogVisionRadius', label: 'Vision Radius', group: 'Fog' },
  { key: 'cityVisionRadius', label: 'City Vision Radius', group: 'Cities' },
  { key: 'lineThickness', label: 'Line Thickness', group: 'Line' },
  { key: 'lineAlpha', label: 'Line Alpha', group: 'Line' },
  {
    key: 'cityInfluenceUnitsEquivalent',
    label: 'City Influence Power',
    group: 'Cities',
  },
  {
    key: 'cityUnitGenerationIntervalSeconds',
    label: 'City Unit Generation (s)',
    group: 'Cities',
  },
];

export class RuntimeTuningPanel {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly inputByKey = new Map<RuntimeTuningKey, HTMLInputElement>();
  private readonly valueByKey = new Map<RuntimeTuningKey, HTMLSpanElement>();
  private isMinimized = false;
  private suppressInputEvents = false;

  constructor(
    initialValues: RuntimeTuning,
    private readonly onSliderInput: (update: Partial<RuntimeTuning>) => void,
  ) {
    const existingPanel = document.getElementById('runtime-tuning-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    this.root = document.createElement('div');
    this.root.id = 'runtime-tuning-panel';
    this.root.style.position = 'fixed';
    this.root.style.top = '12px';
    this.root.style.left = '12px';
    this.root.style.width = '320px';
    this.root.style.maxHeight = '70vh';
    this.root.style.overflowY = 'auto';
    this.root.style.padding = '10px 12px';
    this.root.style.border = '1px solid rgba(255,255,255,0.2)';
    this.root.style.borderRadius = '8px';
    this.root.style.background = 'rgba(14, 16, 18, 0.86)';
    this.root.style.color = '#ececec';
    this.root.style.fontFamily = 'monospace';
    this.root.style.fontSize = '12px';
    this.root.style.zIndex = '9999';
    this.root.style.backdropFilter = 'blur(2px)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';
    header.style.marginBottom = '4px';
    this.root.appendChild(header);

    const title = document.createElement('div');
    title.textContent = 'Runtime Tuning';
    title.style.fontWeight = '700';
    header.appendChild(title);

    this.toggleButton = document.createElement('button');
    this.toggleButton.type = 'button';
    this.toggleButton.textContent = 'Minimize';
    this.toggleButton.style.padding = '2px 8px';
    this.toggleButton.style.border = '1px solid rgba(255,255,255,0.24)';
    this.toggleButton.style.borderRadius = '4px';
    this.toggleButton.style.background = 'rgba(255,255,255,0.08)';
    this.toggleButton.style.color = '#ececec';
    this.toggleButton.style.fontFamily = 'inherit';
    this.toggleButton.style.fontSize = '11px';
    this.toggleButton.style.cursor = 'pointer';
    this.toggleButton.addEventListener('click', () => {
      this.setMinimized(!this.isMinimized);
    });
    header.appendChild(this.toggleButton);

    this.content = document.createElement('div');
    this.root.appendChild(this.content);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'City sliders affect city influence, vision, and production.';
    subtitle.style.opacity = '0.75';
    subtitle.style.marginBottom = '8px';
    this.content.appendChild(subtitle);

    const groupContainerByName = new Map<string, HTMLDivElement>();
    for (const slider of SLIDERS) {
      let groupContainer = groupContainerByName.get(slider.group);
      if (!groupContainer) {
        groupContainer = document.createElement('div');
        groupContainer.style.marginBottom = '10px';
        groupContainerByName.set(slider.group, groupContainer);
        this.content.appendChild(groupContainer);

        const groupTitle = document.createElement('div');
        groupTitle.textContent = slider.group;
        groupTitle.style.color = '#9fc3ff';
        groupTitle.style.margin = '6px 0';
        groupTitle.style.fontWeight = '700';
        groupContainer.appendChild(groupTitle);
      }

      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto';
      row.style.gridTemplateRows = 'auto auto';
      row.style.columnGap = '8px';
      row.style.rowGap = '3px';
      row.style.marginBottom = '7px';

      const label = document.createElement('label');
      label.textContent = slider.label;
      label.style.alignSelf = 'center';
      label.style.opacity = '0.92';

      const value = document.createElement('span');
      value.style.opacity = '0.85';
      value.style.textAlign = 'right';

      const input = document.createElement('input');
      const bounds = RUNTIME_TUNING_BOUNDS[slider.key];
      input.type = 'range';
      input.min = String(bounds.min);
      input.max = String(bounds.max);
      input.step = String(bounds.step);
      input.style.gridColumn = '1 / span 2';
      input.value = String(initialValues[slider.key]);

      input.addEventListener('input', () => {
        const nextValue = Number(input.value);
        this.setDisplayedValue(slider.key, nextValue);
        if (this.suppressInputEvents) {
          return;
        }
        this.onSliderInput({ [slider.key]: nextValue });
      });

      row.appendChild(label);
      row.appendChild(value);
      row.appendChild(input);
      groupContainer.appendChild(row);
      this.inputByKey.set(slider.key, input);
      this.valueByKey.set(slider.key, value);
    }

    document.body.appendChild(this.root);
    this.setMinimized(true);
    this.setValues(initialValues);
  }

  public setValues(values: RuntimeTuning): void {
    this.suppressInputEvents = true;
    for (const key of this.inputByKey.keys()) {
      const input = this.inputByKey.get(key);
      if (!input) {
        continue;
      }

      input.value = String(values[key]);
      this.setDisplayedValue(key, values[key]);
    }
    this.suppressInputEvents = false;
  }

  public destroy(): void {
    this.root.remove();
    this.inputByKey.clear();
    this.valueByKey.clear();
  }

  private setMinimized(minimized: boolean): void {
    this.isMinimized = minimized;
    this.content.style.display = minimized ? 'none' : 'block';
    this.root.style.maxHeight = minimized ? 'none' : '70vh';
    this.toggleButton.textContent = minimized ? 'Expand' : 'Minimize';
    this.toggleButton.setAttribute(
      'aria-label',
      minimized ? 'Expand runtime tuning panel' : 'Minimize runtime tuning panel',
    );
  }

  private setDisplayedValue(key: RuntimeTuningKey, value: number): void {
    const valueEl = this.valueByKey.get(key);
    if (!valueEl) {
      return;
    }

    const bounds = RUNTIME_TUNING_BOUNDS[key];
    const decimals = countStepDecimals(bounds.step);
    valueEl.textContent = value.toFixed(decimals);
  }
}

function countStepDecimals(step: number): number {
  const stepString = String(step);
  const dotIndex = stepString.indexOf('.');
  if (dotIndex < 0) {
    return 0;
  }
  return stepString.length - dotIndex - 1;
}
