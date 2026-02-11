import Phaser from 'phaser';
import { Team } from './Team';

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
  isLobbyGeneratingMap: boolean;
  localLobbyReady: boolean;
  lastBattleAnnouncement: string | null;
};

type LobbyOverlayCallbacks = {
  onCycleMap: (step: number) => void;
  onRandomMap: () => void;
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

    const panelBackground = scene.add.rectangle(0, 0, 680, 360, 0x121212, 0.9);
    panelBackground.setStrokeStyle(2, 0xffffff, 0.35);

    const titleText = scene.add.text(0, -145, 'Battle Lobby', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#f1f1f1',
    });
    titleText.setOrigin(0.5, 0.5);

    this.teamText = scene.add.text(0, -95, 'Team: BLUE', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#d7d7d7',
    });
    this.teamText.setOrigin(0.5, 0.5);

    this.statusText = scene.add.text(0, -15, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e0e0e0',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.statusText.setOrigin(0.5, 0.5);

    this.mapText = scene.add.text(0, 55, '', {
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

    this.actionText = scene.add.text(0, 92, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f4e7b2',
      align: 'center',
      wordWrap: { width: 620, useAdvancedWrap: true },
    });
    this.actionText.setOrigin(0.5, 0.5);

    this.randomMapButtonBg = scene.add.rectangle(-220, 140, 180, 46, 0x47627a, 1);
    this.randomMapButtonBg.setStrokeStyle(2, 0xeaf6ff, 0.45);
    this.randomMapButtonBg.setInteractive({ useHandCursor: true });
    this.randomMapButtonBg.on('pointerdown', () => {
      this.callbacks.onRandomMap();
    });

    this.randomMapButtonText = scene.add.text(-220, 140, 'RANDOM MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.randomMapButtonText.setOrigin(0.5, 0.5);
    this.randomMapButtonText.setInteractive({ useHandCursor: true });
    this.randomMapButtonText.on('pointerdown', () => {
      this.callbacks.onRandomMap();
    });

    this.generateMapButtonBg = scene.add.rectangle(0, 140, 180, 46, 0x66573a, 1);
    this.generateMapButtonBg.setStrokeStyle(2, 0xffe7bd, 0.45);
    this.generateMapButtonBg.setInteractive({ useHandCursor: true });
    this.generateMapButtonBg.on('pointerdown', () => {
      this.callbacks.onGenerateMap();
    });

    this.generateMapButtonText = scene.add.text(0, 140, 'GENERATE MAP', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.generateMapButtonText.setOrigin(0.5, 0.5);
    this.generateMapButtonText.setInteractive({ useHandCursor: true });
    this.generateMapButtonText.on('pointerdown', () => {
      this.callbacks.onGenerateMap();
    });

    this.readyButtonBg = scene.add.rectangle(220, 140, 180, 46, 0x2f8f46, 1);
    this.readyButtonBg.setStrokeStyle(2, 0xefffef, 0.55);
    this.readyButtonBg.setInteractive({ useHandCursor: true });
    this.readyButtonBg.on('pointerdown', () => {
      this.callbacks.onToggleReady();
    });

    this.readyButtonText = scene.add.text(220, 140, 'READY', {
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
