import Phaser from 'phaser';
import { Team } from './Team';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';
import {
  DEFAULT_UNIT_TYPE,
  type UnitType,
} from '../../shared/src/unitTypes.js';

export type TerrainType =
  | 'water'
  | 'grass'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'unknown';

export class Unit extends Phaser.GameObjects.Container {
  public selected: boolean;
  public readonly engagedUnits: Set<Unit>;
  private readonly previouslyEngagedUnits: Set<Unit>;
  public readonly team: Team;
  public readonly unitType: UnitType;

  private readonly unitBody: Phaser.GameObjects.Rectangle;
  private readonly facingArrow: Phaser.GameObjects.Triangle;
  private readonly commanderChevron: Phaser.GameObjects.Graphics | null;
  private readonly healthBoxBg: Phaser.GameObjects.Rectangle;
  private readonly healthBoxFill: Phaser.GameObjects.Rectangle;
  private readonly moraleBoxBg: Phaser.GameObjects.Rectangle;
  private readonly moraleBoxFill: Phaser.GameObjects.Rectangle;
  private readonly combatStatsText: Phaser.GameObjects.Text;
  private health: number;
  private healthMax: number;
  private moraleScore: number | null;
  private calculatedDps: number | null;
  private terrainColor: number | null;
  private terrainType: TerrainType;
  private waterTransitionFlashStartedAtMs = 0;
  private waterTransitionFlashUntilMs = 0;

  private static readonly BODY_WIDTH: number = GAMEPLAY_CONFIG.unit.bodyWidth;
  private static readonly BODY_HEIGHT: number = GAMEPLAY_CONFIG.unit.bodyHeight;
  private static readonly COMMANDER_BODY_SIZE = Math.round(Unit.BODY_HEIGHT * 1.1);
  private static readonly OUTLINE_WIDTH = 2;
  private static readonly HEALTH_BOX_WIDTH = Unit.BODY_WIDTH;
  private static readonly HEALTH_BOX_HEIGHT = Math.max(
    4,
    Math.round(Unit.BODY_HEIGHT * 0.5),
  );
  private static readonly HEALTH_BOX_TOP_INSET = Unit.HEALTH_BOX_HEIGHT * 0.5;
  private static readonly HEALTH_BOX_BASE_Y =
    -(Unit.BODY_HEIGHT * 0.5) + Unit.HEALTH_BOX_TOP_INSET;
  private static readonly MORALE_BOX_BASE_Y =
    Unit.HEALTH_BOX_BASE_Y + Unit.HEALTH_BOX_HEIGHT;
  private static readonly HEALTH_MAX: number = GAMEPLAY_CONFIG.unit.healthMax;
  private static readonly HEALTH_RED_THRESHOLD: number =
    GAMEPLAY_CONFIG.unit.healthRedThreshold;
  private static readonly HEALTH_HIGH_COLOR = 0x63d471;
  private static readonly HEALTH_LOW_COLOR = 0xe5d85c;
  private static readonly MORALE_MAX_SCORE = 100;
  private static readonly MORALE_LOW_THRESHOLD = 0.35;
  private static readonly HEALTH_BOX_INNER_WIDTH = Unit.HEALTH_BOX_WIDTH - 2;
  private static readonly HEALTH_BOX_INNER_HEIGHT = Unit.HEALTH_BOX_HEIGHT - 2;
  private static readonly HEALTH_FILL_BASE_X = -(Unit.HEALTH_BOX_WIDTH * 0.5) + 1;
  private static readonly COMBAT_STATS_TEXT_BASE_Y = Unit.BODY_HEIGHT * 0.5 - 6;
  private static readonly COMMANDER_CHEVRON_HALF_WIDTH = 7;
  private static readonly COMMANDER_CHEVRON_HEIGHT = 5;
  private static readonly COMMANDER_CHEVRON_BASE_Y =
    -(Unit.COMMANDER_BODY_SIZE * 0.5) - 2;
  private static readonly ARROW_VERTICES = [
    { x: -5, y: 3 },
    { x: 0, y: -5 },
    { x: 5, y: 3 },
  ] as const;
  private static readonly WATER_TRANSITION_FLASH_INTERVAL_MS = 120;
  private static readonly WATER_TRANSITION_FLASH_DIM_ALPHA = 0.28;
  private static readonly TEAM_FILL_COLORS: Record<Team, number> = {
    [Team.RED]: 0xa05555,
    [Team.BLUE]: 0x4e6f9e,
  };
  private static readonly TEAM_MORALE_FILL_COLORS: Record<
    Team,
    { high: number; low: number }
  > = {
    [Team.RED]: { high: 0xd44b4b, low: 0x8d2e2e },
    [Team.BLUE]: { high: 0x6f9fff, low: 0x405f99 },
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    team: Team,
    rotation = 0,
    health = Unit.HEALTH_MAX,
    unitType: UnitType = DEFAULT_UNIT_TYPE,
  ) {
    super(scene, x, y);

    this.selected = false;
    this.engagedUnits = new Set();
    this.previouslyEngagedUnits = new Set();
    this.team = team;
    this.unitType = unitType;
    this.healthMax = Unit.HEALTH_MAX;
    this.health = Phaser.Math.Clamp(health, 0, this.healthMax);
    this.moraleScore = null;
    this.calculatedDps = null;
    this.terrainColor = null;
    this.terrainType = 'unknown';
    this.rotation = rotation;

    const isCommander = this.unitType === 'COMMANDER';
    const bodyWidth = isCommander ? Unit.COMMANDER_BODY_SIZE : Unit.BODY_WIDTH;
    const bodyHeight = isCommander ? Unit.COMMANDER_BODY_SIZE : Unit.BODY_HEIGHT;
    const statusBarScaleX = bodyWidth / Unit.BODY_WIDTH;

    // Rectangle source-of-truth: centered at local (0,0).
    this.unitBody = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      bodyWidth,
      bodyHeight,
      Unit.TEAM_FILL_COLORS[this.team],
    );
    if (isCommander) {
      this.unitBody.setFillStyle(Unit.TEAM_FILL_COLORS[this.team], 0.78);
    }
    this.unitBody.setOrigin(0.5, 0.5);
    this.unitBody.setStrokeStyle(Unit.OUTLINE_WIDTH, 0x222222, 0.8);
    this.unitBody.setInteractive({ cursor: 'pointer' });
    this.unitBody.setData('unit', this);

    const [v1, v2, v3] = Unit.ARROW_VERTICES;
    const centroidX = (v1.x + v2.x + v3.x) / 3;
    const centroidY = (v1.y + v2.y + v3.y) / 3;
    const r1 = { x: v1.x - centroidX, y: v1.y - centroidY };
    const r2 = { x: v2.x - centroidX, y: v2.y - centroidY };
    const r3 = { x: v3.x - centroidX, y: v3.y - centroidY };

    // Rebased triangle is placed at local (0,0), matching rectangle center.
    this.facingArrow = new Phaser.GameObjects.Triangle(
      scene,
      0,
      0,
      r1.x,
      r1.y,
      r2.x,
      r2.y,
      r3.x,
      r3.y,
      0x1f1f1f,
    );
    // Vertices are centroid-rebased, so (0,0) is the triangle center of mass.
    this.facingArrow.setDisplayOrigin(0, 0);
    this.facingArrow.setStrokeStyle(1, 0x222222, 1);

    if (this.unitType === 'COMMANDER') {
      this.commanderChevron = new Phaser.GameObjects.Graphics(scene);
      this.commanderChevron.lineStyle(4, 0x111111, 0.9);
      this.commanderChevron.beginPath();
      this.commanderChevron.moveTo(
        -Unit.COMMANDER_CHEVRON_HALF_WIDTH,
        Unit.COMMANDER_CHEVRON_BASE_Y,
      );
      this.commanderChevron.lineTo(
        0,
        Unit.COMMANDER_CHEVRON_BASE_Y + Unit.COMMANDER_CHEVRON_HEIGHT,
      );
      this.commanderChevron.lineTo(
        Unit.COMMANDER_CHEVRON_HALF_WIDTH,
        Unit.COMMANDER_CHEVRON_BASE_Y,
      );
      this.commanderChevron.strokePath();
      this.commanderChevron.lineStyle(2, 0xfff6c4, 1);
      this.commanderChevron.beginPath();
      this.commanderChevron.moveTo(
        -Unit.COMMANDER_CHEVRON_HALF_WIDTH,
        Unit.COMMANDER_CHEVRON_BASE_Y,
      );
      this.commanderChevron.lineTo(
        0,
        Unit.COMMANDER_CHEVRON_BASE_Y + Unit.COMMANDER_CHEVRON_HEIGHT,
      );
      this.commanderChevron.lineTo(
        Unit.COMMANDER_CHEVRON_HALF_WIDTH,
        Unit.COMMANDER_CHEVRON_BASE_Y,
      );
      this.commanderChevron.strokePath();
    } else {
      this.commanderChevron = null;
    }

    this.healthBoxBg = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      Unit.HEALTH_BOX_BASE_Y,
      Unit.HEALTH_BOX_WIDTH,
      Unit.HEALTH_BOX_HEIGHT,
      0x1a1a1a,
    );
    this.healthBoxBg.setOrigin(0.5, 0.5);
    this.healthBoxBg.setStrokeStyle(1, 0xffffff, 0.7);
    this.healthBoxBg.setScale(statusBarScaleX, 1);

    this.healthBoxFill = new Phaser.GameObjects.Rectangle(
      scene,
      Unit.HEALTH_FILL_BASE_X,
      Unit.HEALTH_BOX_BASE_Y,
      Unit.HEALTH_BOX_INNER_WIDTH,
      Unit.HEALTH_BOX_INNER_HEIGHT,
      0x63d471,
    );
    this.healthBoxFill.setOrigin(0, 0.5);
    this.healthBoxFill.setScale(statusBarScaleX, 1);

    this.moraleBoxBg = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      Unit.MORALE_BOX_BASE_Y,
      Unit.HEALTH_BOX_WIDTH,
      Unit.HEALTH_BOX_HEIGHT,
      0x1a1a1a,
    );
    this.moraleBoxBg.setOrigin(0.5, 0.5);
    this.moraleBoxBg.setStrokeStyle(1, 0xffffff, 0.7);
    this.moraleBoxBg.setScale(statusBarScaleX, 1);

    this.moraleBoxFill = new Phaser.GameObjects.Rectangle(
      scene,
      Unit.HEALTH_FILL_BASE_X,
      Unit.MORALE_BOX_BASE_Y,
      Unit.HEALTH_BOX_INNER_WIDTH,
      Unit.HEALTH_BOX_INNER_HEIGHT,
      Unit.TEAM_MORALE_FILL_COLORS[this.team].high,
    );
    this.moraleBoxFill.setOrigin(0, 0.5);
    this.moraleBoxFill.setScale(statusBarScaleX, 1);

    this.combatStatsText = new Phaser.GameObjects.Text(
      scene,
      0,
      Unit.COMBAT_STATS_TEXT_BASE_Y,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000',
        align: 'center',
        padding: { x: 3, y: 2 },
      },
    );
    this.combatStatsText.setOrigin(0.5, 0.5);
    this.combatStatsText.setVisible(false);

    const containerChildren: Phaser.GameObjects.GameObject[] = [
      this.unitBody,
      this.facingArrow,
    ];
    containerChildren.push(
      this.healthBoxBg,
      this.healthBoxFill,
      this.moraleBoxBg,
      this.moraleBoxFill,
      this.combatStatsText,
    );
    if (this.commanderChevron) {
      containerChildren.push(this.commanderChevron);
    }

    this.add(containerChildren);

    scene.add.existing(this);
    this.refreshHealthVisuals();
    this.refreshMoraleVisuals();
    this.refreshCombatStatsVisual();
  }

  public static fromGameObject(
    gameObject: Phaser.GameObjects.GameObject,
  ): Unit | null {
    if (gameObject instanceof Unit) {
      return gameObject;
    }

    const withData = gameObject as Phaser.GameObjects.GameObject & {
      getData?: (key: string) => unknown;
    };
    if (!withData.getData) {
      return null;
    }

    const owner = withData.getData('unit');
    return owner instanceof Unit ? owner : null;
  }

  public setSelected(isSelected: boolean): void {
    this.selected = isSelected;
    this.unitBody.setStrokeStyle(
      Unit.OUTLINE_WIDTH,
      isSelected ? 0xffffff : 0x222222,
      1,
    );
  }

  public resetCurrentDpsOutput(): void {
    this.previouslyEngagedUnits.clear();
    for (const engagedUnit of this.engagedUnits) {
      this.previouslyEngagedUnits.add(engagedUnit);
    }
    this.engagedUnits.clear();
  }

  public wasEngagedWith(unit: Unit): boolean {
    return this.previouslyEngagedUnits.has(unit);
  }

  public applyContactDamage(damagePerSecond: number, deltaSeconds: number): void {
    if (damagePerSecond <= 0 || deltaSeconds <= 0 || this.health <= 0) {
      return;
    }

    this.health = Math.max(0, this.health - damagePerSecond * deltaSeconds);
    this.refreshHealthVisuals();
  }

  public isAlive(): boolean {
    return this.health > 0;
  }

  public isHealthInRedZone(): boolean {
    return this.getHealthRatio() <= Unit.HEALTH_RED_THRESHOLD;
  }

  public setHealthMax(healthMax: number): void {
    this.healthMax = Math.max(1, healthMax);
    this.health = Phaser.Math.Clamp(this.health, 0, this.healthMax);
    this.refreshHealthVisuals();
  }

  public setHealth(health: number): void {
    this.health = Phaser.Math.Clamp(health, 0, this.healthMax);
    this.refreshHealthVisuals();
  }

  public setCombatStats(moraleScore: number | null, calculatedDps: number | null): void {
    this.moraleScore = Number.isFinite(moraleScore) ? moraleScore : null;
    this.calculatedDps = Number.isFinite(calculatedDps) ? calculatedDps : null;
    this.refreshMoraleVisuals();
    this.refreshCombatStatsVisual();
  }

  public setCombatStatsVisible(visible: boolean): void {
    this.combatStatsText.setVisible(visible);
  }

  public setCombatVisualOffset(offsetX: number, offsetY: number): void {
    this.unitBody.setPosition(offsetX, offsetY);
    this.facingArrow.setPosition(offsetX, offsetY);
    this.commanderChevron?.setPosition(offsetX, offsetY);
    this.healthBoxBg.setPosition(offsetX, Unit.HEALTH_BOX_BASE_Y + offsetY);
    this.healthBoxFill.setPosition(
      Unit.HEALTH_FILL_BASE_X + offsetX,
      Unit.HEALTH_BOX_BASE_Y + offsetY,
    );
    this.moraleBoxBg.setPosition(offsetX, Unit.MORALE_BOX_BASE_Y + offsetY);
    this.moraleBoxFill.setPosition(
      Unit.HEALTH_FILL_BASE_X + offsetX,
      Unit.MORALE_BOX_BASE_Y + offsetY,
    );
    this.combatStatsText.setPosition(
      offsetX,
      Unit.COMBAT_STATS_TEXT_BASE_Y + offsetY,
    );
  }

  public clearCombatVisualOffset(): void {
    this.setCombatVisualOffset(0, 0);
  }

  public setTerrainColor(color: number | null): void {
    this.terrainColor = Number.isFinite(color) ? color : null;
  }

  public getTerrainColor(): number | null {
    return this.terrainColor;
  }

  public getTerrainColorHex(): string | null {
    if (this.terrainColor === null) {
      return null;
    }
    return `#${this.terrainColor.toString(16).padStart(6, '0')}`;
  }

  public setTerrainType(type: TerrainType): void {
    this.terrainType = type;
  }

  public getTerrainType(): TerrainType {
    return this.terrainType;
  }

  public triggerWaterTransitionFlash(nowMs: number, durationMs: number): void {
    if (!Number.isFinite(nowMs) || !Number.isFinite(durationMs) || durationMs <= 0) {
      this.clearWaterTransitionFlash();
      return;
    }

    this.waterTransitionFlashStartedAtMs = nowMs;
    this.waterTransitionFlashUntilMs = nowMs + durationMs;
    this.setAlpha(1);
  }

  public updateWaterTransitionFlash(nowMs: number): void {
    if (nowMs >= this.waterTransitionFlashUntilMs || this.waterTransitionFlashUntilMs <= 0) {
      this.clearWaterTransitionFlash();
      return;
    }

    const elapsedMs = Math.max(0, nowMs - this.waterTransitionFlashStartedAtMs);
    const flashPhase = Math.floor(
      elapsedMs / Unit.WATER_TRANSITION_FLASH_INTERVAL_MS,
    );
    this.setAlpha(
      flashPhase % 2 === 0 ? 1 : Unit.WATER_TRANSITION_FLASH_DIM_ALPHA,
    );
  }

  public clearWaterTransitionFlash(): void {
    this.waterTransitionFlashStartedAtMs = 0;
    this.waterTransitionFlashUntilMs = 0;
    if (this.alpha !== 1) {
      this.setAlpha(1);
    }
  }

  private refreshHealthVisuals(): void {
    const healthRatio = this.getHealthRatio();
    this.healthBoxFill.setDisplaySize(
      Unit.HEALTH_BOX_INNER_WIDTH * healthRatio,
      Unit.HEALTH_BOX_INNER_HEIGHT,
    );
    this.healthBoxFill.setFillStyle(
      Unit.blendColor(Unit.HEALTH_LOW_COLOR, Unit.HEALTH_HIGH_COLOR, healthRatio),
    );
    this.healthBoxFill.setVisible(healthRatio > 0);
  }

  private static blendColor(startColor: number, endColor: number, t: number): number {
    const clampedT = Phaser.Math.Clamp(t, 0, 1);
    const startR = (startColor >> 16) & 0xff;
    const startG = (startColor >> 8) & 0xff;
    const startB = startColor & 0xff;
    const endR = (endColor >> 16) & 0xff;
    const endG = (endColor >> 8) & 0xff;
    const endB = endColor & 0xff;

    const red = Math.round(startR + (endR - startR) * clampedT);
    const green = Math.round(startG + (endG - startG) * clampedT);
    const blue = Math.round(startB + (endB - startB) * clampedT);
    return (red << 16) | (green << 8) | blue;
  }

  private getHealthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.healthMax, 0, 1);
  }

  private refreshMoraleVisuals(): void {
    const moraleRatio = this.getMoraleRatio();
    const moraleColors = Unit.TEAM_MORALE_FILL_COLORS[this.team];
    this.moraleBoxFill.setDisplaySize(
      Unit.HEALTH_BOX_INNER_WIDTH * moraleRatio,
      Unit.HEALTH_BOX_INNER_HEIGHT,
    );
    this.moraleBoxFill.setFillStyle(
      moraleRatio > Unit.MORALE_LOW_THRESHOLD ? moraleColors.high : moraleColors.low,
    );
    this.moraleBoxFill.setVisible(this.moraleScore !== null && moraleRatio > 0);
  }

  private getMoraleRatio(): number {
    if (this.moraleScore === null) {
      return 0;
    }
    return Phaser.Math.Clamp(this.moraleScore / Unit.MORALE_MAX_SCORE, 0, 1);
  }

  private refreshCombatStatsVisual(): void {
    const moraleLabel =
      this.moraleScore === null ? '--' : Math.round(this.moraleScore).toString();
    const dpsLabel =
      this.calculatedDps === null
        ? '--'
        : this.calculatedDps.toFixed(1).replace(/\.0$/, '');
    this.combatStatsText.setText(`M ${moraleLabel}\nD ${dpsLabel}`);
  }
}
