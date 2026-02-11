export type TeamSign = 1 | -1;

export type UnitContributionSource = {
  unitId: string;
  x: number;
  y: number;
  teamSign: TeamSign;
  power: number;
  isStatic: boolean;
};

export type StaticInfluenceSource = {
  x: number;
  y: number;
  teamSign: TeamSign;
  power: number;
};

export type DominanceTarget = {
  index: number;
  weight: number;
};
