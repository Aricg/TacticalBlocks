export type MoraleBreakdownOverlayData = {
  unitId: string;
  team: "RED" | "BLUE";
  serverMoraleScore: number | null;
  estimatedMoraleScore: number;
  serverEstimateDelta: number | null;
  mapGridSource: "runtime-sidecar" | "fallback";
  hasPendingServerStep: boolean;
  moraleStepIntervalSeconds: number;
  influenceBaseScore: number;
  terrainType: string;
  terrainBonus: number;
  influenceWithTerrainScore: number;
  commanderAuraBonus: number;
  slopeDelta: number;
  slopeCurrentTerrainType: string;
  slopeForwardTerrainType: string;
  slopeCurrentHillGrade: number | null;
  slopeForwardHillGrade: number | null;
  supplyBlocked: boolean;
  curveExponent: number;
};

function formatSigned(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const rounded = value.toFixed(decimals);
  return value >= 0 ? `+${rounded}` : rounded;
}

function formatValue(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return value.toFixed(decimals);
}

export class MoraleBreakdownOverlay {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLPreElement;

  constructor(initialVisible: boolean) {
    this.root = document.createElement("div");
    this.root.id = "morale-breakdown-overlay";
    this.root.style.position = "fixed";
    this.root.style.top = "12px";
    this.root.style.right = "12px";
    this.root.style.width = "340px";
    this.root.style.padding = "10px 12px";
    this.root.style.border = "1px solid rgba(255,255,255,0.18)";
    this.root.style.borderRadius = "8px";
    this.root.style.background = "rgba(10, 14, 18, 0.84)";
    this.root.style.color = "#ecf3ff";
    this.root.style.fontFamily = "monospace";
    this.root.style.fontSize = "12px";
    this.root.style.lineHeight = "1.35";
    this.root.style.whiteSpace = "pre-wrap";
    this.root.style.zIndex = "9998";
    this.root.style.backdropFilter = "blur(2px)";

    const title = document.createElement("div");
    title.textContent = "Morale Breakdown";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    this.root.appendChild(title);

    this.content = document.createElement("pre");
    this.content.style.margin = "0";
    this.content.style.whiteSpace = "pre-wrap";
    this.content.style.wordBreak = "break-word";
    this.content.style.color = "#d9e6ff";
    this.root.appendChild(this.content);

    document.body.appendChild(this.root);
    this.setVisible(initialVisible);
  }

  public setVisible(visible: boolean): void {
    this.root.style.display = visible ? "block" : "none";
  }

  public render(data: MoraleBreakdownOverlayData | null): void {
    if (!data) {
      this.content.textContent = "Select one friendly unit to inspect morale.";
      return;
    }

    const supplyLabel = data.supplyBlocked ? "blocked (forced to 0)" : "connected";
    const mapGridSourceLabel =
      data.mapGridSource === "runtime-sidecar"
        ? "runtime sidecar (server parity)"
        : "fallback (may differ from server)";
    const pendingStepLabel =
      data.mapGridSource === "runtime-sidecar"
        ? (data.hasPendingServerStep ? "yes" : "no")
        : "unknown";
    this.content.textContent =
      `Unit: ${data.unitId} (${data.team})\n` +
      `Morale (server): ${
        data.serverMoraleScore === null ? "--" : formatValue(data.serverMoraleScore, 2)
      }\n` +
      `Morale (estimate): ${formatValue(data.estimatedMoraleScore, 2)}\n` +
      `Server - estimate: ${
        data.serverEstimateDelta === null ? "--" : formatSigned(data.serverEstimateDelta, 2)
      }\n` +
      `\n` +
      `Influence base: ${formatValue(data.influenceBaseScore, 2)}\n` +
      `Terrain (${data.terrainType}): ${formatSigned(data.terrainBonus, 2)}\n` +
      `After terrain clamp: ${formatValue(data.influenceWithTerrainScore, 2)}\n` +
      `Commander aura: ${formatSigned(data.commanderAuraBonus, 2)}\n` +
      `Slope delta: ${formatSigned(data.slopeDelta, 2)}\n` +
      `Slope sample: ${data.slopeCurrentTerrainType}` +
      `${
        data.slopeCurrentHillGrade === null
          ? ''
          : `(${data.slopeCurrentHillGrade})`
      } -> ${data.slopeForwardTerrainType}` +
      `${
        data.slopeForwardHillGrade === null
          ? ''
          : `(${data.slopeForwardHillGrade})`
      }\n` +
      `Slope rule: forward higher = -, forward lower = + (mountains ignored)\n` +
      `Supply line: ${supplyLabel}\n` +
      `Map grid source: ${mapGridSourceLabel}\n` +
      `Pending server step: ${pendingStepLabel}\n` +
      `Server step cadence: ${formatValue(data.moraleStepIntervalSeconds, 1)}s\n` +
      `Influence curve exponent: ${formatValue(data.curveExponent, 2)}`;
  }

  public destroy(): void {
    this.root.remove();
  }
}
