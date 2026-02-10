import { GAMEPLAY_CONFIG } from './gameplayConfig.js';

export const TERRAIN_GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
export const TERRAIN_GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
  '30cae103-cb06-4791-a21d-241f488189d3': [
    
  ],
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': [
    
  ],
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': [
    
  ],
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16,
    24, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 41, 42,
    43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    59, 60, 61, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
    76, 77, 78, 80, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128,
    129, 130, 140, 144, 159, 197, 198, 199, 200, 201, 202, 203, 205, 206, 209, 210,
    238, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 317, 338, 357, 358,
    359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 392, 395, 436, 437, 438, 440,
    441, 442, 443, 444, 445, 446, 447, 501, 516, 517, 518, 519, 526, 528, 557, 560,
    596, 597, 600, 602, 605, 639, 648, 649, 650, 651, 652, 653, 684, 685, 688, 689,
    690, 691, 692, 693, 694, 717, 738, 795, 796, 832, 847, 875, 876, 880, 908, 929,
    958, 959, 988, 1035, 1038, 1039, 1119, 1197, 1198, 1199, 1273, 1275, 1276, 1277, 1278, 1279,
    1356, 1357, 1358, 1359, 1361, 1362, 1436, 1437, 1438, 1439, 1441, 1471, 1494, 1500, 1516, 1517,
    1518, 1519, 1521, 1544, 1546, 1596, 1597, 1598, 1599, 1602, 1626, 1677, 1678, 1679, 1681, 1682,
    1683, 1710, 1757, 1758, 1759, 1761, 1762, 1809, 1836, 1837, 1838, 1841, 1842, 1865, 1893, 1917,
    1921, 1922, 1923, 1973, 1998, 2001, 2002, 2003, 2019, 2025, 2048, 2078, 2081, 2082, 2083, 2129,
    2157, 2158, 2161, 2162, 2163, 2184, 2239, 2241, 2242, 2243, 2244, 2275, 2319, 2321, 2322, 2323,
    2481, 2497, 2530, 2559, 2561, 2589, 2639, 2644, 2703, 2724, 2757, 2758, 2782, 2802, 2824, 2825,
    2826, 2827, 2828, 2832, 2837, 2838, 2839, 2840, 2855, 2856, 2864, 2865, 2866, 2867, 2868, 2869,
    2870, 2871, 2880, 2892, 2911, 2912, 2913, 2914, 2918, 2919, 2920, 2960, 2962, 2989, 2990, 2991,
    2992, 2993, 2994, 2998, 2999, 3000, 3001, 3050, 3052, 3061, 3064, 3071, 3072, 3073, 3074, 3076,
    3077, 3078, 3079, 3080, 3081, 3104, 3120, 3141, 3152, 3153, 3154, 3155, 3156, 3157, 3158, 3160,
    3161, 3162, 3181, 3204, 3221, 3232, 3233, 3234, 3235, 3236, 3237, 3238, 3239, 3241, 3242, 3295,
    3311, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, 3320, 3321, 3322, 3323, 3363, 3378, 3390,
    3391, 3392, 3393, 3394, 3395, 3396, 3397, 3398, 3400, 3401, 3402, 3423,
  ],
};

const MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(MOUNTAIN_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

function getActiveMountainCellIndexSet(): Set<number> {
  const activeMapId = GAMEPLAY_CONFIG.map.activeMapId;
  const activeSet = MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(activeMapId);
  if (activeSet) {
    return activeSet;
  }

  const fallbackMapId = GAMEPLAY_CONFIG.map.availableMapIds[0];
  return MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(fallbackMapId) ?? new Set<number>();
}

export function getGridCellIndex(col: number, row: number): number {
  return row * TERRAIN_GRID_WIDTH + col;
}

export function isGridCellMountain(col: number, row: number): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveMountainCellIndexSet().has(getGridCellIndex(col, row));
}

export function isGridCellImpassable(col: number, row: number): boolean {
  return isGridCellMountain(col, row);
}
