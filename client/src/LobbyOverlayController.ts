import Phaser from 'phaser';
import { Team } from './Team';
import type { MapGenerationMethod } from '../../shared/src/networkContracts.js';
import type {
  GenerationWaterMode,
  StartingForceLayoutStrategy,
} from '../../shared/src/generationProfile.js';

export type LobbyOverlayPlayerView = {
  sessionId: string;
  team: Team;
  ready: boolean;
};

export type LobbyOverlayViewModel = {
  matchPhase: 'LOBBY' | 'BATTLE';
  hasExitedBattle: boolean;
  localPlayerTeam: Team;
  lobbyPlayers: LobbyOverlayPlayerView[];
  localSessionId: string | null;
  selectedLobbyMapId: string;
  availableMapIds: string[];
  selectedGenerationMethod: MapGenerationMethod;
  selectedWaterMode: GenerationWaterMode;
  selectedRiverCount: number;
  selectedMountainDensity: number;
  selectedForestDensity: number;
  selectedLayoutStrategy: StartingForceLayoutStrategy;
  selectedUnitCountPerTeam: number;
  selectedNeutralCityCount: number;
  selectedFriendlyCityCount: number;
  isLobbyGeneratingMap: boolean;
  localLobbyReady: boolean;
  lastBattleAnnouncement: string | null;
};

type LobbyOverlayCallbacks = {
  onCycleMap: (step: number) => void;
  onRandomMap: () => void;
  onCycleGenerationMethod: (step: number) => void;
  onCycleWaterMode: (step: number) => void;
  onCycleRiverCount: (step: number) => void;
  onCycleMountainDensity: (step: number) => void;
  onCycleForestDensity: (step: number) => void;
  onCycleLayoutStrategy: (step: number) => void;
  onCycleUnitCountPerTeam: (step: number) => void;
  onCycleNeutralCityCount: (step: number) => void;
  onCycleFriendlyCityCount: (step: number) => void;
  onGenerateMap: () => void;
  onToggleReady: () => void;
  isShiftHeld: (pointer: Phaser.Input.Pointer) => boolean;
  canUseMapId: (mapId: string) => boolean;
};

type LobbyOverlayConfig = {
  mapWidth: number;
  mapHeight: number;
  depth: number;
};

export class LobbyOverlayController {
  private readonly panel: Phaser.GameObjects.Container;
  private readonly teamText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly actionText: Phaser.GameObjects.Text;
  private readonly mapText: Phaser.GameObjects.Text;
  private readonly generationMethodText: Phaser.GameObjects.Text;
  private readonly waterModeText: Phaser.GameObjects.Text;
  private readonly riverCountText: Phaser.GameObjects.Text;
  private readonly mountainDensityText: Phaser.GameObjects.Text;
  private readonly forestDensityText: Phaser.GameObjects.Text;
  private readonly layoutStrategyText: Phaser.GameObjects.Text;
  private readonly unitCountText: Phaser.GameObjects.Text;
  private readonly neutralCityCountText: Phaser.GameObjects.Text;
  private readonly friendlyCityCountText: Phaser.GameObjects.Text;
  private readonly randomMapButtonBg: Phaser.GameObjects.Rectangle;
  private readonly randomMapButtonText: Phaser.GameObjects.Text;
  private readonly generateMapButtonBg: Phaser.GameObjects.Rectangle;
  private readonly generateMapButtonText: Phaser.GameObjects.Text;
  private readonly readyButtonBg: Phaser.GameObjects.Rectangle;
  private readonly readyButtonText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly callbacks: LobbyOverlayCallbacks,
    config: LobbyOverlayConfig,
  ) {
    this.panel = scene.add.container(config.mapWidth * 0.5, config.mapHeight * 0.5);
    this.panel.setDepth(config.depth);
    this.panel.setScrollFactor(0);

    const panelWidth = 680;
    const panelHeight = 730;
    const topY = -panelHeight * 0.5 + 42;
    const titleY = topY;
    const teamY = titleY + 50;
    const statusY = teamY + 78;
    const mapY = statusY + 82;
    const generationMethodY = mapY + 28;
    const waterModeY = generationMethodY + 28;
    const riverCountY = waterModeY + 28;
    const mountainDensityY = riverCountY + 28;
    const forestDensityY = mountainDensityY + 28;
    const layoutStrategyY = forestDensityY + 28;
    const unitCountY = layoutStrategyY + 28;
    const neutralCityCountY = unitCountY + 28;
    const friendlyCityCountY = neutralCityCountY + 28;
    const actionY = friendlyCityCountY + 34;
    const buttonsY = actionY + 58;

    const panelBackground = scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x121212, 0.9);
    panelBackground.setStrokeStyle(2, 0xffffff, 0.35);

    const titleText = scene.add.text(0, titleY, 'Battle Lobby', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#f1f1f1',
    });
    titleText.setOrigin(0.5, 0.5);

    this.teamText = scene.add.text(0, teamY, 'Team: BLUE', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#d7d7d7',
    });
    this.teamText.setOrigin(0.5, 0.5);

    this.statusText = scene.add.text(0, statusY, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e0e0e0',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.statusText.setOrigin(0.5, 0.5);

    this.mapText = scene.add.text(0, mapY, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#b9d9ff',
      align: 'center',
    });
    this.mapText.setOrigin(0.5, 0.5);
    this.mapText.setInteractive({ useHandCursor: true });
    this.mapText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleMap(step);
    });

    this.generationMethodText = scene.add.text(0, generationMethodY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#d0f0c0',
      align: 'center',
    });
    this.generationMethodText.setOrigin(0.5, 0.5);
    this.generationMethodText.setInteractive({ useHandCursor: true });
    this.generationMethodText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleGenerationMethod(step);
    });

    this.waterModeText = scene.add.text(0, waterModeY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fd9ff',
      align: 'center',
    });
    this.waterModeText.setOrigin(0.5, 0.5);
    this.waterModeText.setInteractive({ useHandCursor: true });
    this.waterModeText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleWaterMode(step);
    });

    this.riverCountText = scene.add.text(0, riverCountY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9ac2dd',
      align: 'center',
    });
    this.riverCountText.setOrigin(0.5, 0.5);
    this.riverCountText.setInteractive({ useHandCursor: true });
    this.riverCountText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleRiverCount(step);
    });

    this.mountainDensityText = scene.add.text(0, mountainDensityY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ded0b2',
      align: 'center',
    });
    this.mountainDensityText.setOrigin(0.5, 0.5);
    this.mountainDensityText.setInteractive({ useHandCursor: true });
    this.mountainDensityText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleMountainDensity(step);
    });

    this.forestDensityText = scene.add.text(0, forestDensityY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#b8dfb7',
      align: 'center',
    });
    this.forestDensityText.setOrigin(0.5, 0.5);
    this.forestDensityText.setInteractive({ useHandCursor: true });
    this.forestDensityText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleForestDensity(step);
    });

    this.layoutStrategyText = scene.add.text(0, layoutStrategyY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd8b0',
      align: 'center',
    });
    this.layoutStrategyText.setOrigin(0.5, 0.5);
    this.layoutStrategyText.setInteractive({ useHandCursor: true });
    this.layoutStrategyText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleLayoutStrategy(step);
    });

    this.unitCountText = scene.add.text(0, unitCountY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f0d7c9',
      align: 'center',
    });
    this.unitCountText.setOrigin(0.5, 0.5);
    this.unitCountText.setInteractive({ useHandCursor: true });
    this.unitCountText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleUnitCountPerTeam(step);
    });

    this.neutralCityCountText = scene.add.text(0, neutralCityCountY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8e0a5',
      align: 'center',
    });
    this.neutralCityCountText.setOrigin(0.5, 0.5);
    this.neutralCityCountText.setInteractive({ useHandCursor: true });
    this.neutralCityCountText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleNeutralCityCount(step);
    });

    this.friendlyCityCountText = scene.add.text(0, friendlyCityCountY, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f2d8ad',
      align: 'center',
    });
    this.friendlyCityCountText.setOrigin(0.5, 0.5);
    this.friendlyCityCountText.setInteractive({ useHandCursor: true });
    this.friendlyCityCountText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) {
        return;
      }
      const step = this.callbacks.isShiftHeld(pointer) ? -1 : 1;
      this.callbacks.onCycleFriendlyCityCount(step);
    });

    this.actionText = scene.add.text(0, actionY, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f4e7b2',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.actionText.setOrigin(0.5, 0.5);

    this.randomMapButtonBg = scene.add.rectangle(-220, buttonsY, 180, 46, 0x47627a, 1);
    this.randomMapButtonBg.setStrokeStyle(2, 0xeaf6ff, 0.45);
    this.randomMapButtonBg.setInteractive({ useHandCursor: true });
    this.randomMapButtonBg.on('pointerdown', () => {
      this.callbacks.onRandomMap();
    });

    this.randomMapButtonText = scene.add.text(-220, buttonsY, 'RANDOM MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.randomMapButtonText.setOrigin(0.5, 0.5);
    this.randomMapButtonText.setInteractive({ useHandCursor: true });
    this.randomMapButtonText.on('pointerdown', () => {
      this.callbacks.onRandomMap();
    });

    this.generateMapButtonBg = scene.add.rectangle(0, buttonsY, 180, 46, 0x66573a, 1);
    this.generateMapButtonBg.setStrokeStyle(2, 0xffe7bd, 0.45);
    this.generateMapButtonBg.setInteractive({ useHandCursor: true });
    this.generateMapButtonBg.on('pointerdown', () => {
      this.callbacks.onGenerateMap();
    });

    this.generateMapButtonText = scene.add.text(0, buttonsY, 'GENERATE MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.generateMapButtonText.setOrigin(0.5, 0.5);
    this.generateMapButtonText.setInteractive({ useHandCursor: true });
    this.generateMapButtonText.on('pointerdown', () => {
      this.callbacks.onGenerateMap();
    });

    this.readyButtonBg = scene.add.rectangle(220, buttonsY, 180, 46, 0x2f8f46, 1);
    this.readyButtonBg.setStrokeStyle(2, 0xefffef, 0.55);
    this.readyButtonBg.setInteractive({ useHandCursor: true });
    this.readyButtonBg.on('pointerdown', () => {
      this.callbacks.onToggleReady();
    });

    this.readyButtonText = scene.add.text(220, buttonsY, 'READY', {
      fontFamily: 'monospace',
      fontSize: '21px',
      color: '#ffffff',
    });
    this.readyButtonText.setOrigin(0.5, 0.5);
    this.readyButtonText.setInteractive({ useHandCursor: true });
    this.readyButtonText.on('pointerdown', () => {
      this.callbacks.onToggleReady();
    });

    this.panel.add([
      panelBackground,
      titleText,
      this.teamText,
      this.statusText,
      this.mapText,
      this.generationMethodText,
      this.waterModeText,
      this.riverCountText,
      this.mountainDensityText,
      this.forestDensityText,
      this.layoutStrategyText,
      this.unitCountText,
      this.neutralCityCountText,
      this.friendlyCityCountText,
      this.actionText,
      this.randomMapButtonBg,
      this.randomMapButtonText,
      this.generateMapButtonBg,
      this.generateMapButtonText,
      this.readyButtonBg,
      this.readyButtonText,
    ]);
  }

  public render(view: LobbyOverlayViewModel): void {
    const isLobby = view.matchPhase === 'LOBBY';
    this.panel.setVisible(isLobby);
    if (!isLobby) {
      return;
    }

    if (view.hasExitedBattle) {
      this.teamText.setText('Disconnected');
      this.statusText.setText('You exited the battle room.');
      this.actionText.setText('Refresh the page to join again.');
      this.mapText.setVisible(false);
      this.mapText.disableInteractive();
      this.generationMethodText.setVisible(false);
      this.generationMethodText.disableInteractive();
      this.waterModeText.setVisible(false);
      this.waterModeText.disableInteractive();
      this.riverCountText.setVisible(false);
      this.riverCountText.disableInteractive();
      this.mountainDensityText.setVisible(false);
      this.mountainDensityText.disableInteractive();
      this.forestDensityText.setVisible(false);
      this.forestDensityText.disableInteractive();
      this.layoutStrategyText.setVisible(false);
      this.layoutStrategyText.disableInteractive();
      this.unitCountText.setVisible(false);
      this.unitCountText.disableInteractive();
      this.neutralCityCountText.setVisible(false);
      this.neutralCityCountText.disableInteractive();
      this.friendlyCityCountText.setVisible(false);
      this.friendlyCityCountText.disableInteractive();
      this.setButtonVisibleAndInteractive(
        this.randomMapButtonBg,
        this.randomMapButtonText,
        false,
        false,
      );
      this.setButtonVisibleAndInteractive(
        this.generateMapButtonBg,
        this.generateMapButtonText,
        false,
        false,
      );
      this.setButtonVisibleAndInteractive(
        this.readyButtonBg,
        this.readyButtonText,
        false,
        false,
      );
      return;
    }

    this.mapText.setVisible(true);
    this.mapText.setInteractive({ useHandCursor: true });
    this.mapText.setText(
      `Map: ${view.selectedLobbyMapId}  (click to cycle, shift+click back)`,
    );
    this.generationMethodText.setVisible(true);
    this.generationMethodText.setInteractive({ useHandCursor: true });
    this.generationMethodText.setText(
      `Method: ${view.selectedGenerationMethod.toUpperCase()}  (click to cycle)`,
    );
    this.waterModeText.setVisible(true);
    this.waterModeText.setInteractive({ useHandCursor: true });
    this.waterModeText.setText(
      `Water: ${view.selectedWaterMode.toUpperCase()}  (click to cycle)`,
    );
    this.riverCountText.setVisible(true);
    this.riverCountText.setInteractive({ useHandCursor: true });
    this.riverCountText.setText(
      `Rivers: ${view.selectedRiverCount}  (click to cycle)`,
    );
    this.mountainDensityText.setVisible(true);
    this.mountainDensityText.setInteractive({ useHandCursor: true });
    this.mountainDensityText.setText(
      `Mountains: ${Math.round(view.selectedMountainDensity * 100)}%  (click to cycle)`,
    );
    this.forestDensityText.setVisible(true);
    this.forestDensityText.setInteractive({ useHandCursor: true });
    this.forestDensityText.setText(
      `Forests: ${Math.round(view.selectedForestDensity * 100)}%  (click to cycle)`,
    );
    this.layoutStrategyText.setVisible(true);
    this.layoutStrategyText.setInteractive({ useHandCursor: true });
    this.layoutStrategyText.setText(
      `Layout: ${view.selectedLayoutStrategy}  (click to cycle)`,
    );
    this.unitCountText.setVisible(true);
    this.unitCountText.setInteractive({ useHandCursor: true });
    this.unitCountText.setText(
      `Units/Team: ${view.selectedUnitCountPerTeam}  (click to cycle)`,
    );
    this.neutralCityCountText.setVisible(true);
    this.neutralCityCountText.setInteractive({ useHandCursor: true });
    this.neutralCityCountText.setText(
      `Neutral Cities: ${view.selectedNeutralCityCount}  (click to cycle)`,
    );
    this.friendlyCityCountText.setVisible(true);
    this.friendlyCityCountText.setInteractive({ useHandCursor: true });
    this.friendlyCityCountText.setText(
      `Friendly Cities/Team: ${view.selectedFriendlyCityCount}  (click to cycle)`,
    );

    const selectableMapIds = view.availableMapIds.filter((mapId) =>
      this.callbacks.canUseMapId(mapId),
    );
    const canRandomizeMap = selectableMapIds.length > 1;
    this.setButtonVisibleAndInteractive(
      this.randomMapButtonBg,
      this.randomMapButtonText,
      true,
      canRandomizeMap,
    );
    this.randomMapButtonBg.setFillStyle(canRandomizeMap ? 0x47627a : 0x3d3d3d, 1);
    this.randomMapButtonText.setText('RANDOM MAP');

    this.setButtonVisibleAndInteractive(
      this.generateMapButtonBg,
      this.generateMapButtonText,
      true,
      !view.isLobbyGeneratingMap,
    );
    if (view.isLobbyGeneratingMap) {
      this.generateMapButtonBg.setFillStyle(0x5a503e, 1);
      this.generateMapButtonText.setText('GENERATING...');
    } else {
      this.generateMapButtonBg.setFillStyle(0x66573a, 1);
      this.generateMapButtonText.setText('GENERATE MAP');
    }

    this.setButtonVisibleAndInteractive(
      this.readyButtonBg,
      this.readyButtonText,
      true,
      true,
    );

    const bluePlayers = view.lobbyPlayers.filter((player) => player.team === Team.BLUE);
    const redPlayers = view.lobbyPlayers.filter((player) => player.team === Team.RED);
    const rosterLines =
      view.lobbyPlayers.length === 0
        ? 'No players in lobby yet.'
        : view.lobbyPlayers
            .map((player, index) => {
              const label =
                player.sessionId === view.localSessionId ? 'You' : `Player ${index + 1}`;
              return `${label}: ${player.team} ${player.ready ? '[READY]' : '[NOT READY]'}`;
            })
            .join('\n');

    this.teamText.setText(`Team: ${view.localPlayerTeam}`);
    this.statusText.setText(
      `Blue: ${bluePlayers.length}   Red: ${redPlayers.length}\n${rosterLines}`,
    );

    const hasBothTeams = bluePlayers.length > 0 && redPlayers.length > 0;
    const everyoneReady =
      view.lobbyPlayers.length > 0 &&
      view.lobbyPlayers.every((player) => player.ready);
    if (view.isLobbyGeneratingMap) {
      this.actionText.setText('Generating new terrain map...');
    } else if (view.lastBattleAnnouncement) {
      this.actionText.setText(view.lastBattleAnnouncement);
    } else if (!hasBothTeams) {
      this.actionText.setText('Waiting for one player on each team.');
    } else if (!everyoneReady) {
      this.actionText.setText('Waiting for all players to ready up.');
    } else {
      this.actionText.setText('All players ready. Starting battle...');
    }

    const readyButtonColor = view.localLobbyReady ? 0x956a24 : 0x2f8f46;
    this.readyButtonBg.setFillStyle(readyButtonColor, 1);
    this.readyButtonText.setText(view.localLobbyReady ? 'UNREADY' : 'READY');
  }

  public destroy(): void {
    this.panel.destroy();
  }

  private setButtonVisibleAndInteractive(
    background: Phaser.GameObjects.Rectangle,
    label: Phaser.GameObjects.Text,
    visible: boolean,
    interactive: boolean,
  ): void {
    background.setVisible(visible);
    label.setVisible(visible);

    if (!visible || !interactive) {
      background.disableInteractive();
      label.disableInteractive();
      return;
    }

    background.setInteractive({ useHandCursor: true });
    label.setInteractive({ useHandCursor: true });
  }
}
