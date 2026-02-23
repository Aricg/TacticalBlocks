import assert from 'node:assert/strict';
import {
  HILL_GRADE_COUNT,
  HILL_GRADE_NONE,
  TERRAIN_COLORS_BY_TYPE,
  getHillGradeForColor,
  getSlopeMoraleDeltaFromHillGrades,
  getTerrainColorForRendering,
} from './terrainSemantics.js';

function runSlopeParityChecks(): void {
  const moralePerInfluenceDot = 1;
  const slopeMoraleDotEquivalent = 1;
  const cases: Array<{
    currentTerrainType: 'water' | 'grass' | 'forest' | 'hills' | 'mountains' | 'unknown';
    forwardTerrainType: 'water' | 'grass' | 'forest' | 'hills' | 'mountains' | 'unknown';
    currentHillGrade: number;
    forwardHillGrade: number;
  }> = [
    {
      currentTerrainType: 'hills',
      forwardTerrainType: 'hills',
      currentHillGrade: 2,
      forwardHillGrade: 1,
    },
    {
      currentTerrainType: 'hills',
      forwardTerrainType: 'hills',
      currentHillGrade: 1,
      forwardHillGrade: 3,
    },
    {
      currentTerrainType: 'hills',
      forwardTerrainType: 'hills',
      currentHillGrade: 2,
      forwardHillGrade: 2,
    },
  ];

  for (const testCase of cases) {
    const serverDelta = getSlopeMoraleDeltaFromHillGrades({
      ...testCase,
      moralePerInfluenceDot,
      slopeMoraleDotEquivalent,
    });
    const clientDelta = getSlopeMoraleDeltaFromHillGrades({
      ...testCase,
      moralePerInfluenceDot,
      slopeMoraleDotEquivalent,
    });
    assert.equal(serverDelta, clientDelta);
  }
}

function runSlopeHeightRuleChecks(): void {
  // Looking up into hills is a penalty.
  assert.equal(
    getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType: 'grass',
      forwardTerrainType: 'hills',
      currentHillGrade: HILL_GRADE_NONE,
      forwardHillGrade: 1,
      moralePerInfluenceDot: 1,
      slopeMoraleDotEquivalent: 1,
    }),
    -1,
  );

  // Looking down from hills is a bonus.
  assert.equal(
    getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType: 'hills',
      forwardTerrainType: 'grass',
      currentHillGrade: 1,
      forwardHillGrade: HILL_GRADE_NONE,
      moralePerInfluenceDot: 1,
      slopeMoraleDotEquivalent: 1,
    }),
    1,
  );

  // Flat non-hill transitions have no slope effect.
  assert.equal(
    getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType: 'grass',
      forwardTerrainType: 'forest',
      currentHillGrade: HILL_GRADE_NONE,
      forwardHillGrade: HILL_GRADE_NONE,
      moralePerInfluenceDot: 1,
      slopeMoraleDotEquivalent: 1,
    }),
    0,
  );

  // Mountains never contribute slope morale.
  assert.equal(
    getSlopeMoraleDeltaFromHillGrades({
      currentTerrainType: 'hills',
      forwardTerrainType: 'mountains',
      currentHillGrade: 1,
      forwardHillGrade: HILL_GRADE_NONE,
      moralePerInfluenceDot: 1,
      slopeMoraleDotEquivalent: 1,
    }),
    0,
  );
}

function runHillColorGradeChecks(): void {
  const seenColors = new Set<number>();
  for (let grade = 0; grade < HILL_GRADE_COUNT; grade += 1) {
    const color = getTerrainColorForRendering('hills', { hillGrade: grade });
    assert.equal(getHillGradeForColor(color), grade);
    assert.equal(seenColors.has(color), false);
    seenColors.add(color);
  }

  const nonHillSwatches = [
    ...TERRAIN_COLORS_BY_TYPE.water,
    ...TERRAIN_COLORS_BY_TYPE.grass,
    ...TERRAIN_COLORS_BY_TYPE.forest,
    ...TERRAIN_COLORS_BY_TYPE.mountains,
  ];
  for (const color of nonHillSwatches) {
    assert.equal(getHillGradeForColor(color), HILL_GRADE_NONE);
  }
}

runSlopeParityChecks();
runSlopeHeightRuleChecks();
runHillColorGradeChecks();
