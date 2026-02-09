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
  { key: 'unitMoveSpeed', label: 'Unit Speed', group: 'Movement' },
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
];

export class RuntimeTuningPanel {
  private readonly root: HTMLDivElement;
  private readonly inputByKey = new Map<RuntimeTuningKey, HTMLInputElement>();
  private readonly valueByKey = new Map<RuntimeTuningKey, HTMLSpanElement>();
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

    const title = document.createElement('div');
    title.textContent = 'Runtime Tuning';
    title.style.fontWeight = '700';
    title.style.marginBottom = '4px';
    this.root.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'City sliders affect city-only influence/vision, not unit stats.';
    subtitle.style.opacity = '0.75';
    subtitle.style.marginBottom = '8px';
    this.root.appendChild(subtitle);

    const groupContainerByName = new Map<string, HTMLDivElement>();
    for (const slider of SLIDERS) {
      let groupContainer = groupContainerByName.get(slider.group);
      if (!groupContainer) {
        groupContainer = document.createElement('div');
        groupContainer.style.marginBottom = '10px';
        groupContainerByName.set(slider.group, groupContainer);
        this.root.appendChild(groupContainer);

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
