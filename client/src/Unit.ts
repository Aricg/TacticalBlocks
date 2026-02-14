import Phaser from 'phaser';
import { Team } from './Team';
import { GAMEPLAY_CONFIG } from '../../shared/src/gameplayConfig.js';

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

  private readonly unitBody: Phaser.GameObjects.Rectangle;
  private readonly facingArrow: Phaser.GameObjects.Triangle;
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

  private static readonly BODY_WIDTH: number = GAMEPLAY_CONFIG.unit.bodyWidth;
  private static readonly BODY_HEIGHT: number = GAMEPLAY_CONFIG.unit.bodyHeight;
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
  private static readonly MORALE_MAX_SCORE = 100;
  private static readonly HEALTH_BOX_INNER_WIDTH = Unit.HEALTH_BOX_WIDTH - 2;
  private static readonly HEALTH_BOX_INNER_HEIGHT = Unit.HEALTH_BOX_HEIGHT - 2;
  private static readonly HEALTH_FILL_BASE_X = -(Unit.HEALTH_BOX_WIDTH * 0.5) + 1;
  private static readonly COMBAT_STATS_TEXT_BASE_Y = Unit.BODY_HEIGHT * 0.5 - 6;
  private static readonly ARROW_VERTICES = [
    { x: -5, y: 3 },
    { x: 0, y: -5 },
    { x: 5, y: 3 },
  ] as const;
  private static readonly TEAM_FILL_COLORS: Record<Team, number> = {
    [Team.RED]: 0xa05555,
    [Team.BLUE]: 0x4e6f9e,
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    team: Team,
    rotation = 0,
    health = Unit.HEALTH_MAX,
  ) {
    super(scene, x, y);

    this.selected = false;
    this.engagedUnits = new Set();
    this.previouslyEngagedUnits = new Set();
    this.team = team;
    this.healthMax = Unit.HEALTH_MAX;
    this.health = Phaser.Math.Clamp(health, 0, this.healthMax);
    this.moraleScore = null;
    this.calculatedDps = null;
    this.terrainColor = null;
    this.terrainType = 'unknown';
    this.rotation = rotation;

    // Rectangle source-of-truth: centered at local (0,0).
    this.unitBody = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      Unit.BODY_WIDTH,
      Unit.BODY_HEIGHT,
      Unit.TEAM_FILL_COLORS[this.team],
    );
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

    this.healthBoxFill = new Phaser.GameObjects.Rectangle(
      scene,
      Unit.HEALTH_FILL_BASE_X,
      Unit.HEALTH_BOX_BASE_Y,
      Unit.HEALTH_BOX_INNER_WIDTH,
      Unit.HEALTH_BOX_INNER_HEIGHT,
      0x63d471,
    );
    this.healthBoxFill.setOrigin(0, 0.5);

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

    this.moraleBoxFill = new Phaser.GameObjects.Rectangle(
      scene,
      Unit.HEALTH_FILL_BASE_X,
      Unit.MORALE_BOX_BASE_Y,
      Unit.HEALTH_BOX_INNER_WIDTH,
      Unit.HEALTH_BOX_INNER_HEIGHT,
      0x6f9fff,
    );
    this.moraleBoxFill.setOrigin(0, 0.5);

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

    this.add([
      this.unitBody,
      this.facingArrow,
      this.healthBoxBg,
      this.healthBoxFill,
      this.moraleBoxBg,
      this.moraleBoxFill,
      this.combatStatsText,
    ]);

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

  private refreshHealthVisuals(): void {
    const healthRatio = this.getHealthRatio();
    this.healthBoxFill.setDisplaySize(
      Unit.HEALTH_BOX_INNER_WIDTH * healthRatio,
      Unit.HEALTH_BOX_INNER_HEIGHT,
    );
    this.healthBoxFill.setFillStyle(
      healthRatio > Unit.HEALTH_RED_THRESHOLD ? 0x63d471 : 0xd44b4b,
    );
    this.healthBoxFill.setVisible(healthRatio > 0);
  }

  private getHealthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.healthMax, 0, 1);
  }

  private refreshMoraleVisuals(): void {
    const moraleRatio = this.getMoraleRatio();
    this.moraleBoxFill.setDisplaySize(
      Unit.HEALTH_BOX_INNER_WIDTH * moraleRatio,
      Unit.HEALTH_BOX_INNER_HEIGHT,
    );
    this.moraleBoxFill.setFillStyle(moraleRatio > 0.35 ? 0x6f9fff : 0xd6a64f);
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
