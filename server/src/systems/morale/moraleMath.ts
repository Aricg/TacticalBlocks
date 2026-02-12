function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function getMoraleAdvantageNormalized(
  rawMoraleScore: number,
  moraleMaxScore: number,
): number {
  if (!Number.isFinite(rawMoraleScore) || moraleMaxScore <= 0) {
    return 0;
  }
  return clamp(rawMoraleScore / moraleMaxScore, 0, 1);
}

export function getInfluenceBuffMultiplier(
  influenceAdvantage: number,
  influenceMultiplier: number,
): number {
  return 1 + influenceAdvantage * influenceMultiplier;
}

export function getUnitContactDps(
  baseContactDps: number,
  influenceAdvantage: number,
  dpsInfluenceMultiplier: number,
): number {
  const safeBaseDps = Math.max(0, baseContactDps);
  return (
    safeBaseDps *
    getInfluenceBuffMultiplier(influenceAdvantage, dpsInfluenceMultiplier)
  );
}

export function getUnitHealthMitigationMultiplier(
  influenceAdvantage: number,
  healthInfluenceMultiplier: number,
): number {
  return getInfluenceBuffMultiplier(
    influenceAdvantage,
    healthInfluenceMultiplier,
  );
}
