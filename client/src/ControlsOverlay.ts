type ControlEntry = {
  input: string;
  effect: string;
};

type ControlSection = {
  title: string;
  entries: ControlEntry[];
};

const CONTROL_SECTIONS: ControlSection[] = [
  {
    title: 'Battle',
    entries: [
      {
        input: 'Left Click (friendly unit)',
        effect: 'Select that unit.',
      },
      {
        input: 'Left Click (map)',
        effect: 'Clear current selection.',
      },
      {
        input: 'Left Drag (from selected unit or while units selected)',
        effect: 'Draw a movement path; release to stage that path.',
      },
      {
        input: 'Left Drag (from map with no selection)',
        effect: 'Box select friendly units.',
      },
      {
        input: 'Right Click (map)',
        effect: 'Stage a move command to the clicked location.',
      },
      {
        input: 'Shift + Right Click or Shift + path release',
        effect: 'Queue the movement command instead of replacing.',
      },
      {
        input: 'F then Left Drag (with units selected)',
        effect: 'Draw a one-shot line formation; release to stage unit slots.',
      },
      {
        input: 'Space',
        effect:
          'Send staged movement for selected units, or toggle pause if no staged path.',
      },
      {
        input: 'H',
        effect: 'Toggle hold for selected units (red border when held).',
      },
      {
        input: 'Esc',
        effect: 'Cancel all queued movement for your team.',
      },
      {
        input: 'D',
        effect: 'Clear selection and reset drag/path preview state.',
      },
      {
        input: 'S',
        effect: 'Select all friendly units.',
      },
      {
        input: 'A',
        effect:
          'Stage per-unit paths to enemy city pressure line; repeated presses cycle enemy city target.',
      },
    ],
  },
  {
    title: 'Lobby',
    entries: [
      {
        input: 'Left Click (Map/Method/Water/Rivers/Mountains/Forests/Layout/Counts)',
        effect: 'Cycle that setting forward.',
      },
      {
        input: 'Shift + Left Click (same settings)',
        effect: 'Cycle that setting backward.',
      },
      {
        input: 'Left Click RANDOM MAP',
        effect: 'Pick a random available map.',
      },
      {
        input: 'Left Click GENERATE MAP',
        effect: 'Generate terrain from current map settings.',
      },
      {
        input: 'Left Click READY/UNREADY',
        effect: 'Toggle your lobby ready state.',
      },
    ],
  },
  {
    title: 'Debug Panel',
    entries: [
      {
        input: 'Top-left slider controls',
        effect: 'Adjust runtime tuning values live.',
      },
      {
        input: 'Show Morale Breakdown checkbox',
        effect: 'Toggle the morale breakdown overlay.',
      },
      {
        input: 'Expand/Minimize Debug Controls',
        effect: 'Show or collapse runtime tuning controls.',
      },
    ],
  },
];

export class ControlsOverlay {
  private readonly root: HTMLDivElement;

  constructor() {
    const existingOverlay = document.getElementById('controls-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    this.root = document.createElement('div');
    this.root.id = 'controls-overlay';
    this.root.style.position = 'fixed';
    this.root.style.right = '12px';
    this.root.style.bottom = '12px';
    this.root.style.zIndex = '9997';
    this.root.style.pointerEvents = 'none';

    const details = document.createElement('details');
    details.style.width = 'min(420px, calc(100vw - 24px))';
    details.style.maxHeight = '52vh';
    details.style.overflowY = 'auto';
    details.style.border = '1px solid rgba(255,255,255,0.2)';
    details.style.borderRadius = '8px';
    details.style.background = 'rgba(10, 14, 18, 0.9)';
    details.style.color = '#ebf3ff';
    details.style.backdropFilter = 'blur(2px)';
    details.style.pointerEvents = 'auto';
    details.style.padding = '0';

    const summary = document.createElement('summary');
    summary.textContent = 'Controls';
    summary.style.cursor = 'pointer';
    summary.style.userSelect = 'none';
    summary.style.listStyle = 'none';
    summary.style.padding = '8px 10px';
    summary.style.fontFamily = 'monospace';
    summary.style.fontSize = '13px';
    summary.style.fontWeight = '700';
    summary.style.letterSpacing = '0.3px';
    summary.style.borderBottom = '1px solid rgba(255,255,255,0.16)';
    details.appendChild(summary);

    const content = document.createElement('div');
    content.style.padding = '10px';
    content.style.fontFamily = 'monospace';
    content.style.fontSize = '12px';
    content.style.lineHeight = '1.35';

    for (const section of CONTROL_SECTIONS) {
      const sectionTitle = document.createElement('div');
      sectionTitle.textContent = section.title;
      sectionTitle.style.fontWeight = '700';
      sectionTitle.style.color = '#9fc3ff';
      sectionTitle.style.marginBottom = '6px';
      content.appendChild(sectionTitle);

      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridTemplateColumns = 'minmax(170px, 44%) 1fr';
      list.style.columnGap = '10px';
      list.style.rowGap = '5px';
      list.style.marginBottom = '10px';

      for (const entry of section.entries) {
        const input = document.createElement('div');
        input.textContent = entry.input;
        input.style.opacity = '0.95';

        const effect = document.createElement('div');
        effect.textContent = entry.effect;
        effect.style.opacity = '0.85';

        list.append(input, effect);
      }

      content.appendChild(list);
    }

    details.appendChild(content);
    this.root.appendChild(details);
    document.body.appendChild(this.root);
  }

  public destroy(): void {
    this.root.remove();
  }
}
