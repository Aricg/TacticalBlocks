import { GAMEPLAY_CONFIG } from './gameplayConfig.js';
import {
  HILL_GRADE_NONE,
  getHillGradeFromElevationByte,
  getTerrainPaletteElevationByte,
} from './terrainSemantics.js';

export const TERRAIN_GRID_WIDTH = GAMEPLAY_CONFIG.influence.gridWidth;
export const TERRAIN_GRID_HEIGHT = GAMEPLAY_CONFIG.influence.gridHeight;

type Team = 'RED' | 'BLUE';
type GridCoordinate = { col: number; row: number };
export type TerrainType =
  | 'water'
  | 'grass'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'unknown';

const TERRAIN_CODE_GRID_BY_MAP_ID: Record<string, string> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwhhgghhhfhhhhhhhfhhhhhggggggggggggggggggggggggggggffgfgffgfffgfggfffg' +
    'gwwwwwwwwwwwwhfgghhfhhhhhhhhhhhhfgggggggggggggggggggggggggggffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwhgghhhhhhhhhhhhhhggggggggggggggggggggggggggggfgfffffffffffgffgfffg' +
    'gwwwwwwwwwwwwwhgghfhhhhhhgggggggggggggggggggggggggggggggggffffffggffffffgffgffgg' +
    'ghwwwwwwwwwwwwhghhhhhhggggggggggggggggggggggggggggggggggggfgffffgfffffggggfffffg' +
    'gghhgwwwwwwwwwhghhhhhggggggggggggggggggggggggggggggggggggggggggfgggfgggggffffffg' +
    'ggggfhhhwwwwwwhghhhhhfgggggggggggggggghhhhgggggggggggggggggggggggggfgggggfgffffg' +
    'ggggggghhwwwwwhghhhggggggggggggggggggghhhhgggggggggggggggggggggggggggggggffffgfg' +
    'ggggggggghwwwwwgghgggggggggggggggggggghffhgggggggggggggggggggggggggggggggffgfffg' +
    'ggggggggghwwwwwwhhggggggggggggggggggggggggggggggggggggggghhhhgggggggggggggfggfgg' +
    'gggggggggghwwwwwwwwhhggggggggggggggggggggggggggggggggggghhhhhgggggggggggggffgfhg' +
    'gggggggggghwwwwwwwwwhhgggggggggggggggggggggggggggggggggghhhhhhfggggggggggffggghg' +
    'gggggggggghwwwwwwwwwwhggggggggggggggggggggggggggggggghhhhhhhhhhggggggggggfffgghg' +
    'ggggggggggghwwwwwwwwwwhgggggggggggggggggggggggggggggfhhhhhhhhhhgggggggggfffffhhg' +
    'ggggggggggghhwwwwwwwwwhggggggggggggggggggggggfggggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhgggggggggggggggggggfhhwfhhhhhghhgggghhhhhhfgggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhgggggggggggggggghhhwwwwwwwwwwhggfgffghhhhhfgggggggggghhhg' +
    'gggggggggggfwwwwwwwwwwhgggggggggggggghhfwwwwwwwwwwwwwhggfffffhhhhggggggggggghfhg' +
    'gggggggggggghwwwwwwwwwwhggggggggggggfhwwwwwwwwwwwwwwwhfffffffffhhggggggggggghhhg' +
    'ghgggggggggghwwwwwwwwwwwhgggggggggghhwwwwwwwwwwwwwwwwhgffffffggggggggggggggghhhg' +
    'ghhgggggggggghfwwwwwwwwwwhhgggggghhwwwwwwwwwwwwwwwwwwhgffgggfhhggggggggggggghhhg' +
    'ghhhggggggggggfhfghfwwwwwwwhhhhhfwwwwwwwwwwwwwwwwwwwwhgfgghhhgfhhhfgggggggggghhg' +
    'ghhhgggggggggggggggfffhwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwhggghwwwwwwwwhhgggggggggghg' +
    'ghhhggggggggggghhffffffffwwwwwwwwwwwwwwwhhhhhhfwwwwwwwhhhwwwwwwwwwwfhggggggggggg' +
    'ghfhggggggggggghhhhgffffgwwwwwwwwwwwwwwhhggggghhwwwwwwwwwwwwwwwwwwwwhggggggggggg' +
    'ghhhggggggggggfhhhhhgffgffhwwwwwwwwwwwhhggggggghwwwwwwwwwwwwwwwwwwwwgfgggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfhwwwwwwwghhgggggggggfwwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhghhwwwhhfgggggggggggghwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhfffffggggggggghhhhhhhhhhfgggfhggggggggggggggghhwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghggfffgggggggggghhhfhhhhhggggggggggggggggggggggghwwwwwwwwwfhwwwwwwwwfgggggggggg' +
    'ghgggffggggggggggfhhhfhhgggggggggggggggggggggggggghwwwwwfhhhhhhhwwwwwfgggggggggg' +
    'ghfgffggggggggggggfhhhhgggggggggggggggggggggggggggfhhhfhhgggggghwwwwwhgggggggggg' +
    'ggffgfggggggggggggghhhhgggggggggggggggggggggggggggggfhgggggggggghwwwwhgggggggggg' +
    'gfffgffggggggggggggggggggggggggggggggghhhhgggggggggggggggggggggghfwwwhgggggggggg' +
    'gffffffggggggggggggggggggggggggggggggghhhhggggggggggggggggggfhhfghwwwwgggggggggg' +
    'gffffgfggggggfgggggggggggggggggggggggghhhhgggggggggggggggggghhhhghwwwwhggggggggg' +
    'gfffffffgggfffggggfgfgggggggggggggggggffffggggggggggggggggghhhhhghwwwwhfgggggggg' +
    'gfffffffffffgffgfffggffffggggggggggggggggggggggggggggggggghhhhhhghwwwwwhhggggggg' +
    'gffffffffffffgfffffffffgggggggggggggggggggggggggggggggghhhhhhfhgghwwwwwwwhgggggg' +
    'gfffgfggfffffffffffffgfggggggggggggggggggggggggggghhhhhhhhhhhhhgghwwwwwwwwhggggg' +
    'gffffffffffffffgfffffgfgggggggggggggggggggggggggghhhhhhhhhhhhhhggghwwwwwwwfhgggg' +
    'gffgfgfffffffffffffffffggggggggggggggggggggggggghhhhhfhhhhhhhhhfggfhwwwwwwwfhfgg' +
    'hgggghgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  '30cae103-cb06-4791-a21d-241f488189d3':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwwgfffffffffffffffffffggggwwwwwwwwwgfgffgggwwwwwggffgfgffgfffgfggfffg' +
    'gwwwwwwwwwwwwwgggfffffffffffffffggggfwwwwwwwwffgfffgwwwwwwwgffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwfggfffffffffffgffggggffwwwwwwwfgffffgwwwwwwwgfgfffffffffffgffgfffg' +
    'gwwwwwwwwwwwwwwggffffffffggggggggggfffggwwwwgfgffggwwwwwfgffffffggfffffffffgffgg' +
    'gwwwwwwwfgfwwwwgffffffgggggggggggggfggggwwwggffgggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwggggggwwwgfffffgggggggggggggggfffggggfgfffgwwwwwwggggggggfgggfgggggffffffg' +
    'gwwwwwgghhggwwggffffggghhggggggggggfffffgfgfffggwwwwwwwggggggggggggfgggggfgffffg' +
    'gwwwwwgghhggwwggfffgghgggggghhhggghggfffffffffggwwwwwwwggggggggggggggggggffffgfg' +
    'gwwwwwghhhhgwwwfgggghgwwwggggggggggggffffffgffgwwwwwwwfggggggggggggggggggffgfffg' +
    'gwwwwwwgggghggwwggghgwwwwwgggggggggggggfffgggggwwwwwwwggggfgggggggggggggggfggfgg' +
    'gwwwwwwwwggghhgffghggwwwwwwwgggggggghggffgggggwwwwwwwggggffffgggggggggggggffgfgg' +
    'gwwwwwwwwwwwgghhhhggwwwwwwwwwwwfggggghggggwwwwwggggggggfffffgfgggggggggggffgggfg' +
    'ggwggwwwwwwwwgggggwwwwwwwwwwwwwwgggggghggwwgggggggggggfffffffffggggggggggfffgffg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgghwwgggggggggggffffgfffffgggggggggffffgffg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwghggggggggggggffffgffffffgggggggggffgfffg' +
    'gfgggggfwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwggggggggggggggfggggggfffffggggggggffgfffg' +
    'gfggggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggghggggggggggffgfgffggffffggggggggggggffg' +
    'gffggggggggwwwwwwwwwwwwwwgggggggwwwwwggggghgggggggfffffgffffgggffggggggggggffffg' +
    'gfgggggggggggwwwwwwwwwwwggfffgggggwwwgggggghgggggfffffgfffffffgffggggggggggggffg' +
    'gffggggggggggwwwwwwwwwwfggfffffffgggwfggggghggggfffffggffffffgggggggggggggggfffg' +
    'gfffggggggggggwwwwwwwwggfgffffffffgggwggggghgggfgfffffgffgggggggggggggggggggfffg' +
    'gfffgggggggggggggggggggffgffffffffgggwwgggghgggfffffffgfggwwwwwwwwgggggggggffffg' +
    'gfffgggggggggggggggffffffggfffffgggggwwwwggggggffffffgggfwwwwwwwwwwggggggggggffg' +
    'gffgggggggggggggfgfffffffgffffffggggwwwwwghgwwggggffffgfwwwwwwwwwwwgggggggggggfg' +
    'gfffgggggggggggfffggffffggffffggggwwwwwwwghgwwwwgggggggwwwwwwwwwwwwwwggggggggffg' +
    'gffggggggggggggffffggffgfgffggggwwwwwwwwwggfwwwwwfgggggwwwwwwwwwwwwwwwgggggggffg' +
    'gffggffggggggggfffffggggggfggggwwwwwwwwwghgwwwwwwwwfgwwwwwwwwwwwwwwwwwwwfgggggfg' +
    'ggffgffgggggggggffgffgggfffggggwwwfgggggghgggwwwwwwwwwwwwwwwwffffwwwwwwwwwwggggg' +
    'gfffffffgggggggggffffffffffgggwwwggggghhghgggfwwwwwwwwwwwwwggggggggwwwwwwwwggggg' +
    'gfggfffggggggggggfffgfffffggggwwggghgggggghggggggwwwwwwwwgghhhggghgggwwwwwwggfgg' +
    'gfgggffgggggggggggfffffggggffwwwghgggggfgggghhgggggwwwwggghgfwwwfgghggwwwwwwwwwg' +
    'ggfgffggggggggggggfffffggwwwwwwgggggfffffggggghhggggwwgghggwwwwwwwwghggggwwwwwwg' +
    'ggffgfggggggggggggggfgfgfwwwwfghhgggffgfffffgggghhgggghhggwwwggfwwwgghggggwwwwwg' +
    'gfffgffgggggggggggggggggggghhhhggggffffffffffggggggghggfwwwfggggwwwfggfffgwwwwwg' +
    'gffffffggggggggggghhhhhhhgggfgggfgfffffffgffgfgggggggggwwggggffgfwwwwgfhhgwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwggffgffffggggfffgggggggggggggggfgffgwwwwgfffgfwwwwg' +
    'gfgfffffgggfffggggfgfgggggwwwggfffffggwwwwfffgggggggggggggggfffggwwwwgggggwwwwwg' +
    'gfffffffffffgffgfffggffffgwwwwgfffgggfwwwwgfggggggggggggggfffffggwwwwwwfwwwwwwwg' +
    'gffffffffffffgfffffffffggwwwwwgffffwwwwwwfggggggggggggggggfffffggwwwwwwwwwwwwwwg' +
    'gfffgfggfffffffffffffgfggwwwwgfffgwwwwwwwwggggggggffffgffffffffggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgfffwwwwwwwwwwggggggfffffgfffffffgfggwwwwwwwwwwwwwg' +
    'gffgfgfffffffffffffffffgwwwwwgffgwwwwwwwwwggggggfffgffffffffffffffgwwwwwwwwwwwwg' +
    'ghhhhhhhhhhhhhhhhghhhggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  '3498110a-b6f5-41ee-89ec-67203559ed32':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggh' +
    'gggghfffhggggggghhhfhhhhhhhfhhhhhggggggggggfgggghgggggggggffgffgfgffgfffgfggfffh' +
    'ggggghfffgggggggghhfhhhhhhhhhhhhfgggggggggghgggghhgggggggffgffffffffffffffgfgfgh' +
    'gggggghfffhgggggghhhhhhhhhhhhhhggggggggggggffggmmffgghhhgfgfgfffffffffffgffgfgfh' +
    'ggggggghfffgggggghfhhhhhhggggggggggggggggmmffffmfgggghhhgfffffffggfffffffffhffgh' +
    'gggggggghfffgggghhhhhhgggggggggggfhhggggmfmfffffmffffhhhfhfgffffgfffffggggfffffh' +
    'ggggggggghfffggghhhhhfgggggggggggfhhgggmmmmgfgffggggggggfggggggfgggfgggggffffffh' +
    'ggggggggggfffggfhhhhffgghhhgggggfffffghfmmmffffffggggggghggggggggggfgggggfgffffh' +
    'gggggggggghffggghhhggggghhhgggghhgggghhfhhmgggggggggfffhgggggggggggggggggffffgfh' +
    'gggggggggggfffgggggggggghhhgggmmmfgffmfffgfghhhgggffhggggggggggggggggggggffhfffh' +
    'gggggggggggfffhfgggggggggggggmmmfffhmmgffffghhhggfffggggghhhhggggghhhgggggfhgfgh' +
    'ggggggggggggffffhggggggggggfmmmmfgmmfgmmfffghhhggfhggggghhhhhggggghhhgggggffgfhg' +
    'ggggggggggggghffffggggggggfmmmmfgmmmgffgmgffggggffgggggghhhhhhfggghhhggggffggghg' +
    'ggggggggggggggghffhgggggggggggggmmmmffmmffgggggfhggggghhhhhhhhhggggggggggfffgghg' +
    'gggggggggggggggghfffgggggggggggggggggmmfgfggggfhggggfhhhhhhhhhhgggggggggfffffhhh' +
    'gggggggggggggggggffhgggggggggggghhffmmfmgfggghfgggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggggggggfffgggggggggggghhfgggmmmfgggfhggghmghhgggghhhhhhfgggggggffgfhhg' +
    'ggggggggggggggggghfffggggggggggghhfggggggggggffggfmggfgfgffghhhhhfgggggggggfhhhg' +
    'ggggggggggggggggggfffffggggggggggggggggggggghfgghfmffgggfffffhhhhgggggggfffghfhg' +
    'ggggggggggggggggggffffffhffgggggggggggggggghfhgmmffhgggffffffffhhggggffgfggghhhg' +
    'ghggggggggggggggggfgghfffffffggggggggggggghffgmmffmgfggffffffggggggggfggfhgghhhg' +
    'ghhggggggggggggggghgggggfhffffhfggggggggghffgggggmmfffgfffggggggggggfggghhgghhhg' +
    'ghhhgggggggggfffffggggggggfhfffffggggggghfffhfgggmmfgfgfggggggggggghhggmmffgghhh' +
    'ghhhggggggggfhgggggffgggggggfhfffhggfhffffhgffffhgggggggggggggggggffggmgmffffghg' +
    'ghhhgghhhgghfgghhffffffggggggggfffffffghggggggfhfffgggggggggffffffhggmmmffffffgg' +
    'ghfhhfggghfhggghhhhgffffgggggggggfffgggggggggggggffffggggggfffggggggggmmfhhfgffg' +
    'ghhhfgggggggggfhhhhhgffgfgggggggggffggggggggggggggghfffhggfhgggggggggggfmmffghhg' +
    'ghhggffgggggggfhhhhhhgfgghfggggggghfgggggggggggggggggfffffggggggghhgggfmfmffmmfg' +
    'ghhggffggggggggghfhhhhhhhhhggggggggffggggghhhgggggggggggffggggggghhgggghhmfmmmfg' +
    'ghhfffffggggggggghhhhhhhhhhfgggggggfhggggghhhggggggggggghfhgggggghhgggmhggfmmffg' +
    'ghggfffgggghhfggghhhfhghhhfggggggggffggggghhhgggggggggggghfggggggggggfmmmffffgfg' +
    'ghggfffgggghhfgggfhhhfhhgggggggggggfffgggggggggggggggggggghfffgggggggmmmmffffggg' +
    'ghfgffggggghhfggggfhhhhggghhhgggggffgfgggggggggggggggggggggffffhgggmmfmmfffhmfgg' +
    'ggffgfggggggggggggghhhhggghhhgggggffggffgggggggggggggggggggggfhffhgggmmffffmgfgg' +
    'gfffgffggggggggggggggggggghhhggghffggggfffgggggggggggggggggggfgghfffgggfgfmmfffg' +
    'gffffffggggggggggggggggggggggggfhggggggggffhgggggghhhgggggggfhhfgghffgggfmmmhggg' +
    'gffffgfggggggfgggggggggggggggggfggggggggggghfggggghhhggggggghhhhggggffgggggmhggg' +
    'gfffffffgggfffggggfgfgggggggffffggghhhgggggghhgggghhhgggggghhhhhgggggfggggfmfhgg' +
    'gfffffffffffgffgfffggffffggfhgggggghhhgggggggfgggggggggggghhhhhhggggghfggmmmghfg' +
    'gffffffffffffgfffffffffgggffgggggggfffgggggggghgggggggghhhhhhfhgggggggffgggfhmfg' +
    'gfffgfhgfffffffffffffgfgggfgggggggggggggggggggfggghhhhhhhhhhhhhgggggggffggfmmmfg' +
    'gffffffffffffffgfffffgfggfhgggggggggggggggggggfgghhhhhhhgghhhhhggggggggfffmmmgfg' +
    'gffgfhfffffffffffffffffggfgggggggggggggggggggghfhhhhhfhhhhhhhhhfggggggggfggmgffg' +
    'ghhhhhhhhhhhhhhhhhhhgghggggggggggggggggggggggggggghhhhhhhhhhgggggggggggggggggggg',
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf':
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmgg' +
    'mffgfffffffgfhgghhhfhhhhhhhfhhhhhgggfmmfmmmmmmmggmmfhhhhgggggffmfgffgfffgfggfffg' +
    'gffffffffffffgggghhfhhhhhhhhhhhhmgggfmmmmmmmfmmfwmmhhhhhggfgffffffffffffffgfgfgg' +
    'gfffggggfffffghgghhhhhhhhhhhhhhgggggggmmmmmmmmfmfhhhhhhggfgfmfffffffffffgffgfffg' +
    'gwffghhhgggggghgghfhhhhhhggggggggggggmfmmmmmmmmmmhhhhhggfgffffffggfffffffffgffgh' +
    'gffgghhhgggggghghhhhhhggggggggggggggmmgfgmmgmgmmhhhhgggfggfgffffgfffffggggfffffh' +
    'gffggffhggggghhghhhhhfgggghhggggghhhmmmmhhhhhfmhhhhggggggggggggfgggfgggggffffffh' +
    'gfffggggggfghhgmhhhhgfgghhhhhhhhhhhhmfhhgfmhfhhhhhgggggggggggggggggfgggggfgffffg' +
    'gfffgfgggggghhgghhhgggghhhhhhhhhhhhhhhhhffhgmmhhgggggggggggggggggggggggggffffgfh' +
    'gffffgfgwggghhggghgggghhhhhhhhhhhhhhhhhhhhhhhhhgggggggfggggggggggggggggggffgfffh' +
    'gffgggfgggggghhgggghhhhhhhhhhhhhhhhhhhhhgggghggggggggmggggggggggggggggggggfgmfgh' +
    'gwwwwwgfgggggghhhhhhhhhggggggggghhhhhhhgggggggggffggggggggggggggggggggggggffgfmg' +
    'gwwwwwwgggggggggghhhhgggggggfffggghhhggggggmfwmggggggggggggggggggggggggggffgggmh' +
    'ggfggwwfggggggggggggggggffffffgfggggggggggfggggggggghhhhgggggggggggggggggfffggfm' +
    'gggggfwwfggggggggggggggfffgfwfgfffgggggggwgghhggghhhhhhhggggggggggggggggfffffmgm' +
    'ggggggwwwwfggffggggggggfgfwwfwwffgffgggmggghhfhhhhhhhhhfgggggggggggggggggffgmmmm' +
    'gggggggwwwwwfgfggggggffgmwwwfwwwwgggggfghhhhhhhhhhhhhhgfgggggggggggggggggffgmmmm' +
    'mmgggggggfwwwwfffggfffggwwwgggwwwwwfgggghhhhhhhhhhhhhggfgffgggggggggggggggggmmmg' +
    'gmgggggggggwwwgffffffgfwwwgghhgfwwwwfgghhhfhhhhhhhhhhffgffffggggggggggggggggmmmg' +
    'gmggggggggggwwwgfggffwwwwgghhhhgggwwwgghhhhhhhhhhhhhgfgfffffffggggggggggggggmmmm' +
    'gfmggggggggggwwwffffwwwfgghhfhhhgggwwwghhhhhhhhfhhhhhffffffffgggggggggggggggfmgm' +
    'gmmmgggggggggfwwwwwwwwggfghhhhhfhhgfwwgghhhggghhfhhhhfffffgggffwffggggggggggfmgm' +
    'mmmfgggggggggggffwwwfggffghhhhhhhhggwwwgggffgfghhhhhhggfggffwwwwwwwgggggggggmmmg' +
    'ggmggggggggggggggggffffffghhhhhhhhggfwwgggfffffghhhhhffggwwwwwfffwwfgggggggggmfg' +
    'mmmmggggggggggggggfffffffghhhhhhhggggwwwwfmgffffgghhhgfgfwwffggggfwwggggggggggmm' +
    'gmmmggggggggggggggggffffgghfhhhhggwgggwwwwwwwfggfffggffgwwfgggggggwwmgggggggggmm' +
    'ggmfgggggggggggggggggffgfhhhhhgmmgffffgwwwwwwwwfggffffgfwwggggggggwwwgggggggggmg' +
    'gmmmgffggggggggggggggggghhhhhhggffgfffffggggmwwwwwfgggfwwfgggggggfgwwwgggggggggg' +
    'mmfmgwfggggggggggggghhhhhfhhhhggffffffgffffffffwwwwwwwwwfgggggggggggwwwwgggggggg' +
    'mmmfffffggggggggggghhfhhhhhfhgfgffffffffffffffgggfwwwwwfgwwwwggggggggwwwwggggggg' +
    'gfggfffggggggggggghhhhhhhhhhgggfffmffffffgfgfggwwfgmfggwfwhwwgfggggggggwwwgggggg' +
    'gmgggffgggggggggghhhhhhfhggffggfffffggffgggggghwwwwwwwwwmwwwwgggggggggggwwwfffwg' +
    'gmfmffgggggggggghhhhhhhhgfgggfggfggffgggggggggwwwwwwwwwwwwwwwfgggggggggggwwwwwwg' +
    'mgffgfggfffgggghhhhffhhgfggggfgggggggggggggggwwwhwwwwwwwwwgwggggggggggggggffwwfg' +
    'gfffgffgfhfgggghhhhhhhhgfggggggggggggggggggggwwwwwwwwwwwwwwgmgggggggggggffggggfg' +
    'mffffffgfhfggggghhhgggggfggggggggggggggggggggwhwfwwwwwfwwwmmggggggggfhfgffgfgffg' +
    'gffffgfghhhggfgggggggggggwggggggggggggggggggwhwhwwwwhwgwmwhfggggggggfhfgffffgffg' +
    'gfffffffgggfffggggfgfgggggggggggggggggggggghwwwgwwmwwwwwwwffgggggggghgfgfgfffffm' +
    'gffffffffwffgffgfffggffffgggggggggggggggggfwwwwwwwwwwwwwwwwggggggggggggffgffffgm' +
    'mffffffffffffgfffffffffggfgggggggggggggfwwwwwwwwwwwgwwwwwwwgmggggggffffffgffffgm' +
    'mfffgfggffffwffffffffgfgggggggggggggggwfwwhwwhwwwmwwwwfwwgffggggffffgfgffffffffm' +
    'gffffffffffffffgfffffgfgfgggggggggggghwwwwwwwwwwwwwwwwwwgfgggggffggfffffffffffgg' +
    'mffgfgfffffffffffffffffggggggggggggggwwwwwwwwwwwhwwwwwwhgggggggffffffgfgffgffggg' +
    'ggghghhhhhhhhhhhhggghhgggggggggggggggmgmmmgmmgmmmggggggggggggggggggggggggggggggg',
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwwggghhhfhhhhhhhfhhhhhgggfmmfggmmmggmmggfggwwwwwggffgfgffgfffgfggfffg' +
    'gwwwwwwwwwwwwwggghhfhhhhhhhhhhhhfgggfggggmggfggffgggwwwwwwwgffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwfgghhhhhhhhhhhhhhgggggggggggggggfggggwwwwwwwgfgfffffffffffgffgfffg' +
    'gwwwwwwwwwwwwwwgghfhhhhhhggggggggggggggmgggggggggggwwwwwfgffffffggfffffffffgffgg' +
    'gwwwwwwwfgfwwwwghhhhhhggggggggggggggmmmfmggmmmggggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwggggggwwwghhhhhfggggggggggggggmmgggggggfgggwwwwwwggggggggfgggfgggggffffffg' +
    'gwwwwwgfhhggwwghhhhhgfghhgggggggggggfwggggggfgggwwwwwwwggggggggggggfgggggfgffffg' +
    'gwwwwwgfhhggwwgghhhgghgggggghhhgghhgggggffgfmgggwwwwwwwggggggggggggggggggffffgfg' +
    'gwwwwwghhhhgwwwfghgghgwwwggggggggggggggggggggggwwwwwwwwggggggggggggggggggffgfffg' +
    'gwwwwwwgggghggwwggghgwwwwwgggggggggggggggggggggwwwwwwwggghhhhgggggggggggggfggfgg' +
    'gwwwwwwwwggghhgffghggwwwwwwwggggggghhgggggggggwwwwwwwggghhhhhgggggggggggggffgfgg' +
    'gwwwwwwwwwwwgghhhhggwwwwwwwwwwwfggggghggggwwwwwggggggggghhhhhhfggggggggggffggggg' +
    'ggwggwwwwwwwwgggggwwwwwwwwwwwwwwgggggghggwwggggggggggghhhhhhhhhggggggggggfffggwg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgghwwggggggggggfhhhhhhhhhhgggggggggfffffgmg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwghgggggggggggghhhhhhhhhfhgggggggggffgmgmg' +
    'gggggggfwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwgggggggggggggghhgggghhhhhhfgggggggffgmgmg' +
    'gmmgggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggghggggggggghhhgfgffghhhhhfgggggggggggmmg' +
    'gmgggggggggwwwwwwwwwwwwwwgggggggwwwwwggggghggggggghhhhfgfffffhhhhggggggggggggggg' +
    'gmgggggggggggwwwwwwwwwwwggghggggggwwwgggggghgggghhhhhhgffffffffhhggggggggggggggg' +
    'gggggggggggggwwwwwwwwwwfggfhhfhhhfggwfggggghggghhfhhhhgffffffgggggggggggggggfgmg' +
    'ggggggggggggggwwwwwwwwggfghhhhghhhgggwggggghgghhhhhhhhgffgggggggggggggggggggfgmg' +
    'gggggggggggggggggggggggffghhfhhhhhgggwwgggghgghhhghhhhgfggwwwwwwwwgggggggggggggg' +
    'gmgggggggggggggggggffffffghhhhfhhggggwwwwgggggfhhhfhhgggfwwwwwwwwwwgggggggggggfg' +
    'ggggggggggggggghhffffffffghhhhhhggggwwwwwghgwwgggggfhfgfwwwwwwwwwwwgggggggggggmg' +
    'ggggggggggggggghhhhgffffgfhhhhggggwwwwwwwghgwwwwgggggggwwwwwwwwwwwwwwgggggggggmg' +
    'gmmwggggggggggfhhhhhgffgfghhhgggwwwwwwwwwggwwwwwwfgggggwwwwwwwwwwwwwwwgggggggmmg' +
    'gmmmgffgggggggfhhhhhhgggghhggggwwwwwwwwwghgwwwwwwwwfgwwwwwwwwwwwwwwwwwwwfggggggg' +
    'gmgmgffggggggggghfhhhhhhhhhggggwwwfgggggghgggwwwwwwwwwwwwwwwwwfwfwwwwwwwwwwggggg' +
    'gmgfffffggggggggghhhhhhhhhhfggwwwggggghhghgggfwwwwwwwwwwwwfggggggggwwwwwwwwggggg' +
    'gfggfffgggggggggghhhfhhhhhfgggwwggghgggggghggggggwwwwwwwwgghhhggghgggwwwwwwggfgg' +
    'gggggffggggggggggfhhhhhhgggffwwwghgggggggggghhgggggwwwwggghgfwwwwgghggwwwwwwwwwg' +
    'ggfgffggggggggggggfhhhhggwwwwwwggggggggggggggghhggggwwgghggwwwwwwwwghggggwwwwwwg' +
    'ggffgfggggggggggggghhhhgfwwwwfghhggggggggggggggghhgggghhggwwwggfwwwgghggggwwwwwg' +
    'gfffgffgggggggggggggggggggghhhhgggggggmggggggggggggghggwwwwfggggwwwfggfffgwwwwwg' +
    'gffffffggggggggggghhhhhhhgggfgggmgwggfmmmggggggggggggggwwgggfhhffwwwwgfhhgwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwggggmgggggmmfgggggggggggggggggghhhhgwwwwgfffgwwwwwg' +
    'gfffffffgggfffggggfgfgggggwwwgggggmgggmmggfgggggggggggggggghhhhhgwwwwgggggwwwwwg' +
    'gfffffffffffgffgfffggffffgwwwwggggmfmmggggfggggggggggggggghhhhhhgwwwwwwfwwwwwwwg' +
    'gffffffffffffgfffffffffggwwwwwgggfmmmggfmgggggggggggggghhhhhhfhggwwwwwwwwwwwwwwg' +
    'gfffgfggfffffffffffffgfggwwwwgggmggmmggmfgmfgggggghhhhhhhhhhhhhggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgggmggmmgmmggggggggghhhhhhhghhhhhhgggwwwwwwwwwwwwwg' +
    'gffgfgfffffffffffffffffgwwwwwgmgmggmmfgfmggggggghhhhhfhhhhhhhhhfgggwwwwwwwwwwwwg' +
    'gggggghgghgggghghggggggggggggggggggggggggggggggggggggggghggggggggggggggggggggggg',
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'ghhhhhhhhhhhhhfffffffffffffffffffgggffggggggggmggggggfggfggggffgfgffgfffgfggfffg' +
    'ghhhhhhhhhhhhhgggfffffffffffffffgggmggwffgfggfmmgfgggfggggggffffffffffffffgfgfgg' +
    'ghhhhhhhhhhhhhhggfffffffffffgffggggfggmmffgfmmggggggfggggggfgfffffffffffgffgfffg' +
    'ghhhhhhhhhhhhhhggffffffffgggggggggggggmmmgmmfgggmmgfggfgggffffffggfffffffffgffgg' +
    'ghhhhhhhhhhhhhhgffffffgggggggfmgggffgggggmmgggwgmmgwgwggggfgffffgfffffggggfffffg' +
    'ghhhhhhhhhhhhgggfffffgggggggmmgggfffmgggfmmgwgfwmfwgfgfggggggggfgggfgggggffffffg' +
    'ghhhhhhfhhhhggggffffggghhggggggggggmmgmfmmggggmffggggggggggggggggggfgggggfgffffg' +
    'ghhhhhhghhhhggggfffgghgggggghhhggghggmmgfmgmgfgffffggffggggggggggggggggggffffgfg' +
    'ghhhhhhhhhhhgggggggghggggggggggffgggggfgggfggmmgwfffffffgggggggggggggggggffgfffg' +
    'ghhhhhhhhhhhggggggghgggggggggggmgfgggggggmffmwmgfffffgggggfgggggggggggggggfggfgg' +
    'gwfhhhhhhhhghhgggghgggggggggggmmffghhgfmmffmmfwmgfffffgggffffgggggggggggggffgfgg' +
    'gwwwhhhggggggghhhhgggggggggggggggffgghgggfmggfffgffggggfffffgfgggggggggggffggggg' +
    'gwwwfhggggggggggggggggggggggggggmgffwghgfgwggmffffggggfffffffffggggggggggfffggwg' +
    'gwwwwgggggggggggggggggggggggwgggggmwggghggggmfffgggggffffgfffffgggggggggfffffgmg' +
    'ggwwwwggggggggggggggggggwwwwwwwwggggmfgghggggggggmgggffffgffffffgggggggggffgmgmg' +
    'gggwwwwwgggggggggggggggwwwwwwwwwwwggggggggggfggfgfffgfggggggfffffggggggggffgmgmg' +
    'gmmgwwwwwwggggggggggggwwwwwwwwwwwwwfggffghgggggwggggffgfgffggffffggggggggggggmmg' +
    'gmgggwwwwwwwggggggggfwwwwggggggfwwwwggmmfghgggggggfffffgffffgggffggggggggggggggg' +
    'gmggggggwwwwwwwwwwwwwwwwggfffggggwwwwgggfgghgggggfffffgfffffffgffggggggggggggggg' +
    'gfgggggggwwwwwwwwwwwwwwgggfffffffgwwwfggggghggggfffffggffffffgggggggggggggggfgmg' +
    'gggggggggggfwwwwwwwwwgggfgffffffffgwwwggggghgggfgfffffgffgggggfgggggggggggggfgmg' +
    'gmgfggggggggggggfffggggffgffffffffgwwwwwgggggggfffffffgfgggwwwwwwfgggggggggggggg' +
    'gmgggggggggggggggggffffffggfffffgggwwwwwwwgggggffffffggggwwwwwwwwwwwggggggggggfg' +
    'ggggggggggggggggfgfffffffgffffffggwwwwwwwwhwwwggggffffggwwwwwwwwwwwwwwwwwwggggmg' +
    'gggggggggggggggfffggffffggffffgggwwwwwwwwfhwwwwggggggggwwwwwwwwwwwwwwwwwwwwgggmg' +
    'gmmfgggggggggggffffggffgfgffgggwwwwwwwwwwggwwwwwwwgggfwwwwwwwfgfwwwwwwwwwwwwgmmg' +
    'gmmmgffggggggggfffffggggggfgggfwwwwwwfggghfwwwwwwwwwwwwwwwfgggggggggfwwwwwwwwggg' +
    'gmgmgffgggggggggffffffggfffgggwwwwwgggggghgggwwwwwwwwwwwwggggggggggggggggwwwwwgg' +
    'gmgfffffgggggggggffffffffffggwwwwgggggghghggggwwwwwwwwwgggggggggggggggggghwwwwwg' +
    'gfggfffggggggggggfffgfffffggwwwwggghgggggghgggggfwwwwwggggghhhggghgghhhhhhhwwwwg' +
    'gggggffgggggggggggfffffggggwwwwwghgggggggggghhgggggggggggghgggggggghhhhhhhhhwwwg' +
    'ggfgffggggggggggggfffffggwwwwwfggggggggggggggghhgggggggghgggggggggghhhhhhhhhhwwg' +
    'ggffgfggggggggggggggfffgfwwwwfghhggggggggggggggghhgggghhggggggggghhhhhhhhhhhhhhg' +
    'gfffgffgggggggggggggggggffghhhhggggggggggggggggggggghgggggggggggghhhhhfffhhhhhhg' +
    'gffffffggggggggggghhhhhhhggfwgggmgfggfmmgggggggggggggggggggggffgghhhhhfhhhhhhhhg' +
    'gffffgfggggggfgggggggggggwwwwggggmgggggmmfggggggggggggggggggfgffghhhhhfffhhhhhhg' +
    'gfffffffgggfffggggfgfgggggwwwgggggggggggggfgggggggggggggggggfffgghhhhhhhhhhhhhhg' +
    'gfffffffffffgffgfffggffffgwwwwggggmfmmggggfgggggggggggggggfffffghhhhhhhhhhhhhhhg' +
    'gffffffffffffgfffffffffggwwwwwgggfmmmggfggggggggggggggggggfffffghhhhhhhhhhhhhhhg' +
    'gfffgfggfffffffffffffgfggwwwwgggmgggmggmfggfggggggffffgffffffffgghhhhhhhhhhhhhhg' +
    'gffffffffffffffgfffffgfgwwwwwggggggmmgmmgggggggggfffffgfffffffgfgghhhhhhhhhhhhhg' +
    'gffgfgfffffffffffffffffgwwwwwgmgmggmgfgfmgggggggfffgffffffffffffffghhhhhhhhhhhhg' +
    'ghgghhhhhghggghggggggggggggggggggggggggggggggggggggggghggggggggggggggggggggggggg',
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwhhgghhhfhhhhhhhfhhhhhggggggggggggggggggggggggggggffgfgffgfffgfggfffg' +
    'gwwwwwwwwwwwwhfgghhfhhhhhhhhhhhhfgggggggggggggggggggggggggggffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwhgghhhhhhhhhhhhhhgggggggggggggggggggggghhhgggfgfffffffffffgffgfffg' +
    'gwwwwwwwwwwwwwhgghfhhhhhhgggggggggggggggggggggggggggghhhggffffffggfffffffffgffgg' +
    'ghwwwwwwwwwwwwhghhhhhhgggggggggggfhhggggggggggggggggghhhggfgffffgfffffggggfffffg' +
    'gghhgfwwwwwwwwhghhhhhggggggggggggfhhgggggggggggggggggggggggggggfgggfgggggffffffg' +
    'ggggfhhhwwwwwwhghhhhhfgghhhggggggfffgggggggggggggggggggggggggggggggfgggggfgffffg' +
    'ggggggghhwwwwwhghhhggggghhhggggggggggggggggggggggggggggggggggggggggggggggffffgfg' +
    'ggggggggghwwwwwgghgggggghhhggggggggggggggggghhhggggggggggggggggggggggggggffgfffg' +
    'ggggggggghwwwwwwhhgggggggggggggggggggggggggghhhgggggggggghhhhggggghhhgggggfggfgg' +
    'gggggggggghwwwwwwwwhhggggggggggggggggggggggghhhggggggggghhhhhggggghhhgggggffgfhg' +
    'gggggggggghwwwwwwwwwhhgggggggggggggggggggggggggggggggggghhhhhhfggghhhggggffggghg' +
    'gggggggggghwwwwwwwwwwhfgggggggggggggggggggggggggggggghhhhhhhhhhggggggggggfffgghg' +
    'ggggggggggghwwwwwwwwwwhgggggggggggggggggggggggggggggfhhhhhhhhhhgggggggggfffffhhg' +
    'ggggggggggghhwwwwwwwwwhggggggggghhfggggggggggffgggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhggggggggghhfgggggggfhhwfhhhhhghhgggghhhhhhfgggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhggggggggghhfgggghhhwwwwwwwwwwhggfgffghhhhhfgggggggggghhhg' +
    'gggggggggggffwwwwwwwwwhgggggggggggggghhfwwwwwwwwwwwwwhggfffffhhhhggggggggggghfhg' +
    'gggggggggggghwwwwwwwwwwhggggggggggggfhwwwwwwwwwwwwwwwhfffffffffhhggggggggggghhhg' +
    'ghgggggggggghwwwwwwwwwwwhgggggggggghhwwwwwwwwwwwwwwwwhgffffffggggggggggggggghhhg' +
    'ghhgggggggggghfwwwwwwwwwwhhgggggghhfwwwwwwwwwwwwwwwwwhgffgggfhhggggggggggggghhhg' +
    'ghhhggggggggggfhffhffwwwwwwghhhhfwwwwwwwwwwwwwwwwwwwwhgfgghhhgfhhhfgggggggggghhg' +
    'ghhhgggggggggggggggfffhwwwwwwwwwwwwwwwwwwwwfwwwwwwwwwhggghfwwwwwwwhhgggggggggghg' +
    'ghhhggggggggggghhffffffffwwwwwwwwwwwwwwwhhhhhhfwwwwwwwhhhwwwwwwwwwwfhggggggggggg' +
    'ghfhggggggggggghhhhgffffgwwwwwwwwwwwwwfhhggggghhwwwwwwwwwwwwwwwwwwwwhggggggggggg' +
    'ghhhggggggggggfhhhhhgffgffhwwwwwwwwwwfhhggggggghwwwwwwwwwwwwwwwwwwwwgfgggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfhwwwwwwwghhgggggggggfwwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhghhfffhhfgggggghhhggghwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhfffffggggggggghhhhhhhhhhfgggfhfgggggggghhhggghhwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghggfffgggghhfggghhhfhhhhhfggggggggggggggghhhgggghfwwwwwwwwfhfwwwwwwwfgggggggggg' +
    'ghgggffgggghhfgggfhhhfhhgggggggggggggggggggggggggghwwwwwfhhhhhhhwwwwffgggggggggg' +
    'ghfgffggggghhfggggfhhhhggghhhgggggggggggggggggggggfhhhfhhgggggghwwwwfhgggggggggg' +
    'ggffgfggggggggggggghhhhggghhhgggggggggggggggggggggggfhfggggggggghwwwwhgggggggggg' +
    'gfffgffggggggggggggggggggghhhggggggggggggggggggggggggggggggggfgghfwwwhgggggggggg' +
    'gffffffggggggggggggggggggggggggggggggggggggggggggghhhgggggggfhhfghwwwfgggggggggg' +
    'gffffgfggggggfgggggggggggggggggggggggggggggggggggghhhggggggghhhhghwwwwhggggggggg' +
    'gfffffffgggfffggggfgfgggggggggggggghhhgggggggggggghhhgggggghhhhhghwwwwhfgggggggg' +
    'gfffffffffffgffgfffggffffgggggggggghhhgggggggggggggggggggghhhhhhghwwwwwhhggggggg' +
    'gffffffffffffgfffffffffggggggggggggfffggggggggggggggggghhhhhhfhgghwwwwwwfhgggggg' +
    'gfffgfggfffffffffffffgfggggggggggggggggggggggggggghhhhhhhhhhhhhgghfwwwwwwwhggggg' +
    'gffffffffffffffgfffffgfgggggggggggggggggggggggggghhhhhhhgghhhhhggghwwwwwwwfhgggg' +
    'gffgfgfffffffffffffffffggggggggggggggggggggggggghhhhhfhhhhhhhhhfggfhwwwwwwwfhfgg' +
    'ghhhgghhhhhghhhghgghgggggggggggggggggggggggggggggggghghggggggggggggggggggggggggh',
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gggghfffhggggggghhhfhhhhhhhfhhhhhgggggggggggggggggggggggggffgffgfgffgfffgfggfffg' +
    'ggggghfffgggggggghhfhhhhhhhhhhhhfggggggggggggggggggggggggffgffffffffffffffgfgfgh' +
    'gggggghfffhgggggghhhhhhhhhhhhhhgggggggggggggggggggggghhhgfgfgfffffffffffgffgfffg' +
    'ggggggghfffgggggghfhhhhhhgggggggggggggggggggggggggggghhhgfffffffggfffffffffgffgh' +
    'gggggggghfffgggghhhhhhgggggggggggfhhggggggggggggggggghhhfhfgffffgfffffggggfffffh' +
    'ggggggggghfffggghhhhhfgggggggggggfhhggggggggggggggggggggfggggggfgggfgggggffffffh' +
    'ggggggggggfffggfhhhhgfgghhhggggggfffggggggggggggggggggghhggggggggggfgggggfgffffg' +
    'gggggggggghffggghhhggggghhhgggggggggggggggggggggggggfffhgggggggggggggggggffffgfh' +
    'gggggggggggfffgggggggggghhhggggggggggggggggghhhgggffhggggggggggggggggggggffgfffh' +
    'gggggggggggfffhfgggggggggggggggggggggggggggghhhggfffggggghhhhggggghhhgggggfggfgg' +
    'ggggggggggggffffhggggggggggggggggggggggggggghhhggfhggggghhhhhggggghhhgggggffgfhg' +
    'ggggggggggggghffffggggggggggggggggggggggggggggggffgggggghhhhhhfggghhhggggffggghg' +
    'ggggggggggggggghffhggggggggggggggggggggggggggggfhggggghhhhhhhhhggggggggggfffgghg' +
    'gggggggggggggggghfffggggggggggggggggggggggggggfhggggfhhhhhhhhhhgggggggggfffffhhh' +
    'gggggggggggggggggffhgggggggggggghhfgggggggggghfgggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggggggggfffgggggggggggghhfggggggggggfhgggggghhgggghhhhhhfgggggggffgfhhg' +
    'ggggggggggggggggghfffggggggggggghhfggggggggggffggggggggfgffghhhhhfgggggggggfhhhg' +
    'ggggggggggggggggggfffffggggggggggggggggggggghfggggggggggfffffhhhhgggggggfffghfhg' +
    'ggggggggggggggggggffffffhffgggggggggggggggghfhgggggggggffffffffhhggggffgfggghhhg' +
    'ghggggggggggggggggfgghfffffffggggggggggggghffggggggggggffffffggggggggfgggggghhhg' +
    'ghhggggggggggggggghgggggfhffffhfggggggggghffgggggggggggfffggggggggggfggggggghhhg' +
    'ghhhgggggggggfffgfggggggggfhfffffggggggghfffhfgggggggggfggggggggggghhgggggggghhg' +
    'ghhhggggggggfhgggggffgggggggfhfffhggfhffffhgffffhgggggggggggggggggffgggggggggghg' +
    'ghhhgghhhgghfgghhffffffggggggggfffffffghggggggfhfffgggggggggffffffhggggggggggggg' +
    'ghfhgfggghfhggghhhhgffffgggggggggfffggggggggggggggfffggggggfffgggggggggggggggggg' +
    'ghhhfgggggggggfhhhhhgffgfgggggggggffggggggggggggggghfffhggfggggggggggggggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfggggggghfgggggggggggggggggfffffggggggghhggggggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhggggggggffggggghhhgggggggggggffggggggghhggggggggggggg' +
    'ghhfffffggggggggghhhhhhhhhhfgggggggfhggggghhhggggggggggghfhgggggghhggggggggggggg' +
    'ghggfffgggghhfggghhhfhghhhfggggggggffggggghhhgggggggggggghfggggggggggggggggggggg' +
    'ghgggffgggghhfgggfhhhfhhgggggggggggfffgggggggggggggggggggghfffgggggggggggggggggg' +
    'ghfgffggggghhfggggfhhhhggghhhgggggffgfgggggggggggggggggggggffffhgggggggggggggggg' +
    'ggffgfggggggggggggghhhhggghhhgggggffggffgggggggggggggggggggggfhffhgggggggggggggg' +
    'gfffgffggggggggggggggggggghhhggghffggggfffgggggggggggggggggggfgghfffgggggggggggg' +
    'gffffffggggggggggggggggggggggggfhggggggggffhgggggghhhgggggggfhhfgghffggggggggggg' +
    'gffffgfggggggfgggggggggggggggggfggggggggggghfggggghhhggggggghhhhggggffgggggggggg' +
    'gfffffffgggfffggggfgfgggggggffffggghhhgggggghhgggghhhgggggghhhhhgggggffggggggggg' +
    'gfffffffffffgffgfffggffffggfhgggggghhhgggggggfgggggggggggghhhhhhggggghfggggggggg' +
    'gffffffffffffgfffffffffggggfgggggggfffgggggggghgggggggghhhhhhfhgggggggffgggggggg' +
    'gfffgfhgfffffffffffffgfgggfgggggggggggggggggggfggghhhhhhhhhhhhhgggggggffgggggggg' +
    'gffffffffffffffgfffffgfggfhgggggggggggggggggggfgghhhhhhhgghhhhhggggggggffggggggg' +
    'gffgfhfffffffffffffffffggfgggggggggggggggggggghfhhhhhfhhhhhhhhhfggggggggfggggggg' +
    'ghhhghhhhhhhhhhhhghhgggggggggggggggggggggggggggggggghghghhgggggggggggggggggggggg',
  'b94a7e47-8778-43d3-a3fa-d26f831233f6':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwwggghhhfhhhhhhhfhhhhhgggfmmfgmggmggmmggfggwwwwwggffgfgffgfffgfggfffg' +
    'gwwwwwwwwwwwwwggghhfhhhhhhhhhhhhfgggfmggggmmfggffgggwwwwwwwgffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwwgghhhhhhhhhhhhhhgggggggggggggggfggggwwwwwwwgfgfffffffffffgffgfffg' +
    'gwwwwwwwwwwwwwwgghfhhhhhhggggggggggggggmmggggggggggwwwwwfgffffffggffffffgffgffgg' +
    'gwwwwwwwwwwwwwwghhhhhhgggggggggggggggggfggggggggggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwwwwwwwwwwghhhhhfgggggggggggggggmgggggggfgggwwwwwwggggggggfgggfgggggffffffg' +
    'gwwwwwwwwwwwwwghhhhhhfggggggggggggggfwggmgmgwgggwwwwwwwggggggggggggfgggggfgffffg' +
    'gwwwwwwwgfffffhhhhhhhhhhhhhhhhhhhhhhhhhhffhfgghhfffffffhhhhhhhhhhhhhhhhhgffffgfg' +
    'gwwwwwwwwwwwwwwfghggggwwwgggggggggggggggggggghgwwwwwwwwggggggggggggggggggffgfffg' +
    'gwwwwwwwwwwwwwwwgggwwwwwwwggggggggggggggggggggggwwwwwwggghhhhgggggggggggggfggfgg' +
    'gwwwwwwwwwwwwwwwwwwwwwwwwwwwgghgggggggggggggggwwwgwwwggghhhhhgggggggggggggffgfgg' +
    'gwwwwwwwwwwwwwwwwwwwwwwwwwwwfwwfggggggggggwwwwwggggggggghhhhhhfggggggggggffggggg' +
    'ggwggwwwwwwwwwwwwwwwwwwwwwwwwwwwgggggggggwwggggggggggghhhhhhhhhggggggggggfffggwg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggwwwggggggggggfhhhhhhhhhhgggggggggfffffggg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgggggggggggggghhhhhhhhhfhgggggggggffggggg' +
    'gggggggwwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwgggggggggggggghhgggghhhhhhfgggggggffgmmgg' +
    'gmggggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggggggggggggghhhgfgffghhhhhfggggggggggggmg' +
    'gggggggggggfwwwwwwwwwwwwwgggggggwwwwwggggggggggggghhhhfgfffffhhhhggggggggggggggg' +
    'gmgggggggggggwwwwwwwwwwwggghggggggwwwggggggggggghhhhhhgffffffffhhghggggggggggggg' +
    'ggggggghhhgggwwwwwwwwwwwggfhhfhhhfggwwggggggggghhfhhhhgffffffggggggggghhhgggfggg' +
    'ggggggghhgggggwwwwwwwwggfghhhhghhhgggwgggggggghhhhhhhhgffgggggggggggggfhhgggfggg' +
    'ggggggghhggggggggggggggffghhfhhhhhgggwwggggggghhhghhhhgfggwwwwwwwwggggfhhggggggg' +
    'gmggggghhhgggggggggffffffghhhhfhhggggwwwwfggggfhhhfhhgggwwwwwwwwwwwggghhhgggggfg' +
    'ggggggggggggggghhffffffffghhhhhhggggwwwwwwwwwwgggggfhfgfwwwwwwwwwwwggggggggggggg' +
    'ggggggggggggggghhhhgffffgfhhhhggggwwwwwwwwwwwwwwgggggggwwwwwwwwwwwwwwggggggggggg' +
    'gmgwggggggggggfhhhhhgffgfghhhgggwwwwwwwwwwwwwwwwwggggggwwwwwwwwwwwwwwwgggggggmgg' +
    'ggmmgffgggggggfhhhhhhgggghhggggwwwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwwwwwwwwwfggggggg' +
    'gmgggffggggggggghfhhhhhhhhhggggwwwfggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggg' +
    'gmgfffffggggggggghhhhhhhhhhfggwwwggggggggggggfwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggg' +
    'gfggfffgggggggggghhhfhhhhhfgggwwgggggggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwggfgg' +
    'gggggffghggggggggfhhhhhhgggffwwwgggggggggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwg' +
    'ggfgffggghggggggggfhhhhggwwwwfwgggggggggggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwg' +
    'ggffgfgggghgggggggghhhhgfwwwwwghggggggggggggggggggggggwwwwwwwggfwwwwwwwwwwwwwwwg' +
    'gfffgffgggghggggggggggggwwwwwwggghggggmggggggggggggggggwwwwfggggwwwwwwwwwwwwwwwg' +
    'gffffffghhhhhhhhhhhhhhhhggggghhhghwhhgmmmhhhhhhhhhhhhhhgghhhfhhfggggggggwwwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwgggggggghgmmfgggggggggggggggggghhhhgwwwwwwwwwwwwwwg' +
    'gfgfffffgggfffggggfgfgggggwwwgggggmgggmmggfgggggggggggggggghhhhhgwwwwwwwwwwwwwwg' +
    'gfffffffffffgffgfffggffffgwwwwggggmfmgggggfggggggggggggggghhhhhhgwwwwwwwwwwwwwwg' +
    'gffffffffffffgfffffffgfggwwwwwgggfmmmggfmgggggggggggggghhhhhhfhggwwwwwwwwwwwwwwg' +
    'gfffgfggfffffffffffffgfggwwwwgggmgmmmgggwgmfgggggghhhhhhhhhhhhhggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgggmgggggmmggggggggghhhhhhhhhhhhhhgggwwwwwwwwwwwwwg' +
    'gffgfgfffffffffffffffffgwwwwwgmggggmmfgfmggggggghhhhhfhhhhhhhhhfgggwwwwwwwwwwwwg' +
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'ggggggggggggfhgghhhfhhhhhhhfhhhhhgggfggfgggggggggggfhhhhgggggffgfgffgfffgfggfffg' +
    'ggggggggggggwgggghhfhhhhhhhhhhhhfgggfgggggggfggffgghhhhhggwgffffffffffffffgfgfgg' +
    'ggggggggggggwghgghhhhhhhhhhhhhhgggggggggggggggwgghhhhhhggwgfffffffffffffgffgfffg' +
    'gggggggggggggghgghfhhhhhhgggggggggggggggggggggggghhhhhggfgffffffggfffffffffgffgg' +
    'gggggggggggggghghhhhhhgggggggggggggggggfgggggggghhhhgggwggfgffffgfffffggggfffffg' +
    'ggggggggggggghhghhhhhfggghhhggggghhhgggghhhhhfghhhhggggggggggggfgggfgggggffffffg' +
    'ggggggggggwghhghhhhhgfgghhhhhhhhhhhhgfhhggghfhhhhhgggggggggggggggggfgggggfgffffg' +
    'gggggggggggghhgghhhgggghhhhhhhhhhhhhhhhhffhggghhgggggggggggggggggggggggggffffgfg' +
    'ggggggggfggghhggghgggghhhhhhhhhhhhhhhhhhhhhhhhhgggggggwggggggggggggggggggffgfffg' +
    'gfggggggggggghhgggghhhhhhhhhhhhhhhhhhhhhgggghgggggggggggggggggggggggggggggfggfgg' +
    'gwwwwwgfgggggghhhhhhhhhggggggggghhhhhhhgggggggggffggggggggggggggggggggggggffgfgg' +
    'gwwwwwwgggggggggghhhhgggggggfffggghhhgggggggwwgggggggggggggggggggggggggggffggggg' +
    'ggfggwwwggggggggggggggggffffffgfggggggggggwggggggggggggggggggggggggggggggfffggwg' +
    'gggggwwwfggggggggggggggfffgwwwgfffgggggggwggggggggggggggggggggggggggggggfffffggg' +
    'ggggggwwwwfggffggggggggfgwwwwwwffgffgggggggggggggggggggggggggggggggggggggffggggg' +
    'gggggggwwwwwfgfggggggffggwwwwwwwwgggggfggggggggggggggggggggggggggggggggggffggggg' +
    'gggggggggwwwwwfffggfffggwwwgggwwwwwfggffffgggggggggggggfgffggggggggggggggggggggg' +
    'gggggggggggwwwgffffffgwwwwgggggfwwwwwghhhhggggggggggggggffffgggggggggggggggggggg' +
    'ggggggggggggwwwgfggffwwwwgggggggggwwwghhhhgggggggggggggfffffffgggggggggggggggggg' +
    'gggggggggggggwwwwffwwwwwgggggggggggwwwhhhhgggggggggggggffffffgggggggggggggggfggg' +
    'gggggggggggggfwwwwwwwwggfggggggggggfwwgggggggggggggggggffggggwwwwfggggggggggfggg' +
    'gggggggggggggggwwwwwwggffgggggggggggwwwggggggggggggggggfggwwwwwwwwwggggggggggggg' +
    'gggggggggggggggggggffffffgggggggggggwwwggggggggggggggggggwwwwwwfwwwwggggggggggfg' +
    'ggggggggggggggggggfffffffggggggggggggwwwwwggggggggggggggwwwwfggggwwwgggggggggggg' +
    'ggggggggggggggggggggffffggggggggggwgggwwwwwwwwggggggggggwwfgggggggwwgggggggggggg' +
    'gggfgggggggggggggggggffgfggggggggggggggwwwwwwwwwgggggggwwwggggggggwwwggggggggggg' +
    'gggggffggggggggggggggggggggggggggggggggggggggwwwwwwgggwwwfgggggggfgwwwgggggggggg' +
    'gggggffgggggggggggggggggggggggggggggggggggggggwwwwwwwwwwwgggggggggggwwwwgggggggg' +
    'gggfffffggggggggggggggggggggggwggggggggggggggggggwwwwwwfgggggggggggggwwwwggggggg' +
    'gfggfffgggggggggggggggggggggggggggggggggggggggggggggfgggggggggwggggggggwwwgggggg' +
    'gggggffggggggggggggggggggggffgggggggggggggggggggggggggggggggggggggggggggwwwwwwwg' +
    'ggfgffgggggggggggggggggggwgggggggggggggggggggggggggggggggggggwgggggggggggwwwwwwg' +
    'ggffgfggggggggggggggggggfgggggggggggggggggggggggggggggggggggggggggggggggggfwwwwg' +
    'gfffgffgggggggggggggggggfggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gffffffgggggggggggggggggwggggggggggggghhhhgggggggggggggggggggggggggggggggggggggg' +
    'gffffgfggggggfgggggggggggwgggggggggggghhhhgggggggggggggggggfgggggggggggggggggggg' +
    'gfffffffgggfffggggfgfggggggggggggggggghgghgggggggggggggggggwgggggggggggggggggggg' +
    'gfffffffffffgffgfffggffffggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gffffffffffffgfffffffffggwgggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gfffgfggfffffffffffffgfggggggggggggggggggggggggggggggggggggwgggggggggggggggggggg' +
    'gffffffffffffffgfffffgfgwggggggggggggggggggggggggggggggggwgggggggggggggggggggggg' +
    'gffgfgfffffffffffffffffggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'ggggghhgghgggghggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'random-frontier-01':
    'gggggfhgggfggggghgggggwwwwwwfggggggwgggggggfggggggggfgggggmggggghfgggggghmhhhmmh' +
    'ggggggggggffggggffgggggwwwwwwggggggffggggggggggggggggggggggggggfgggggffghhhhhmmh' +
    'ggggggggggffhggghgggggggwwwwwwwgggggfggggffgggggggggggggggggggfffgggfffhhhhhhhhh' +
    'ggggggggggfffgggggggggggfffwwwwwggggggggfffgggggggggggggggggggffffffffggfhfhhhhh' +
    'ggggggggggfffggggggggggfhgfgwwwwwggggggffffgggggggggggggggggggffffgfffggffgghhhm' +
    'ggggggggggfffgggggggggfhhhhgwwwwwwgggggffffggggggggggggffggghfffggggfhggfhgghhmh' +
    'gggggghffhfffgggggggggghhhhhgwwwwwwgggghfffgggggggggggffffggfffgggggfhggggghmmmm' +
    'ggfhgffffghffggggfhhggggggffffwwwwwfgggggfggggggggggggffhgggfffggggghhgggghfhmmm' +
    'gghfggffhgffffggffhhggggggfffgwwwwwfggggggggggggggggggffhgggffffghffghgfffffhhmm' +
    'ggggggggfffffffffffhgggggffffgwwwwwgggggggggggggggggghffggggffffhhhffffffffffhhm' +
    'ggggggggffffffffffffgggggffhffwwwwwwgghfggggggggfgggghhggggghhhfhhhfffffffffhffh' +
    'gggggggggfffffffffffffffhgggggwwwwwwwffggffffgffffgghhhhgggghhhfhhggffffhhhgggff' +
    'gggggggggfffffffffffffhhhhhggggfwwwwwfffffffffffffggfhhhgggghhhhfffggffhhhgggggg' +
    'gggfffggggffffffggfffhhhhhhgggggfwwwwfffhffffffggffgghhggggghhhhfffffffggggggggg' +
    'hgggffgggggfffffffffffghhhhggggggwwwwwgfffgffffggfffhhmgggggghhghffffffgggffffgg' +
    'fgggfffggggfffffffffffgfhhgggggggfwwwwgfffghfffggfffhmmggggggggggfffffffffffffgg' +
    'ggggffggggfffffffffhhhgffgggggggggwwwwwffffgggggghfghmmhhggggggghffffffffffffffh' +
    'fggfffggggfffffhfffhhhfggghgggggggwwwwwfffffggggggghfhhhhgggggghhhhffffffffhghfg' +
    'ffffhgggggffffhmfffhhffggfhhggggggwwwwwfffffggggggggghhhhgggggghhhhhfffhghhmhggg' +
    'gfhggggggggffffhfffhffgggfhhhggggfwwwwwfffffgggggggggmhhgggggggghhhhhhhhhmmhhggg' +
    'gggggggggggfffffffhgggggghhhhggggfwwwwwgfffhggggggggghhhggggggggghfggghhhmmhhhgf' +
    'gggggggggggfffffffgggggffgggggggggggggggggggggggggggghhgggggggggggggggghhmmhhfff' +
    'ggggggggggggfhhfffggggffhgggggggggggggggggggggggggggghhhggggggggggghhggghhhhffgg' +
    'ggggggggggggghhffgggggffhhggggggggggggggggggggggggggghhhggggfhhhggghhgggghhggggg' +
    'ggggggggggggggggggggggffhhfgggfhgggggwwwfgggggggggggghhmmhgghmmhhggggggggggggggg' +
    'ggggggggggggggggggggggghhhhggfffgggggwwwhgggggggggggghhhmhgghmmhhhgggggggggggggg' +
    'ggggggggggggggggggggggghhhhhfggggggggwwwggggggggggggghhhhgggghhhhhhggggggggggggg' +
    'hgggggggggggggggggggggggggffgggggggggwwwfggggggggggggghhgggggggghhhgggggfggggggg' +
    'fgggggggggggggggggggggggggggggggggghhfwwwffffggggggggggggggggggghhggggghhhgggggg' +
    'gggggggggggggggggggggggggggggggggggfhgwwwgffgggggggggggggggggggghggggghhhgfhhhhf' +
    'ggggggggggggggggggggggggggggggggggggfffwwwfgggggggggggggggggggfggggghhhhggfhhhhh' +
    'gggggggggggggggggggggggggggggggggggggffhwwwggggggggggggggggggffgggghhhmmhhhmmmhh' +
    'gggggggggggggggggggggggggggggggggggggffffwwwfggggggggggggggggggggghhhmmmhhhhmmmh' +
    'gggggggggggggggggggggggggggggghhggggggffhgwwwfggggggggggggggghgggghhhmmmhhhhhmhf' +
    'ggggggggggggggggggggggggggggggggggggggggggwwwwfffghfhmhggggghmhggghhhhmhfhhhhhgg' +
    'ggggggggggghhgggggggggggggggggggggggggggggfwwwwwffhhmhfgggghmmmhggghhhhggghhhggg' +
    'hggggggggghhhhgggggggggggggggggggggfgggghfhwwwwwwhgggggggggmmmhfggghhhhhgggggggg' +
    'fgggggggggmmmhggggggggggggggggggggfffgggffgwwwwwwwwgggggggghmhfhhgghhhhhgggggggg' +
    'gggggggggghmmhggggggggggggggggggggfffgggggggwwwwwwwwgggggggghfghhhhmmhhhgggggggg' +
    'ggggggggggghhggggggggggggggggggggggffhggggggffwwwwwwggggggggggghhhmmmmhhgggggggg' +
    'ggggggggggggggggggggghhhgggggggggggghhfgggggwffwwwwwgggfgggggghhhhmmmmmhgggggggg' +
    'ggggggggggggggggghhhhhhhggggggggggggghfggggggggggwwwwgffhggggghhhhmmmmmggggggggg' +
    'gggggggggggggggghhhhhhhfgggggggggggggffggggggggggfgwwgfffgggggghhhhmmmmhgggggggg' +
    'ggfhfggggggghfggghhhmhgggggggggggggggghgggggggwggfffwwffffhggggghhmmhmhffggggggg',
};

const ELEVATION_HEX_GRID_BY_MAP_ID: Record<string, string> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '701010101010101010101010b4b47070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b4707070707070707070707070707070707070707070707070707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010b47c7070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c7070707070707070707070707070707070707070707070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7010101010101010101010101010b47070b4b4b4b4b4b4b4b4b4b4b4b4b4b4707070707070707070707070707070707070707070707070707070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010b47070b47cb4b4b4b4b4b47070707070707070707070707070707070707070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7c707c7c707c7c7070' +
    '70b4101010101010101010101010b470b4b4b4b4b4b47070707070707070707070707070707070707070707070707070707070707070707070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '7070b4b470101010101010101010b470b4b4b4b4b47070707070707070707070707070707070707070707070707070707070707070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707cb4b4b4101010101010b470b4b4b4b4b47c70707070707070707070707070707070b4b4b4b4707070707070707070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070b4b41010101010b470b4b4b470707070707070707070707070707070707070b4b4b4b4707070707070707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '707070707070707070b410101010107070b47070707070707070707070707070707070707070b47c7cb4707070707070707070707070707070707070707070707070707070707070707c7c707c7c7c70' +
    '707070707070707070b4101010101010b4b4707070707070707070707070707070707070707070707070707070707070707070707070707070b4b4b4b4707070707070707070707070707c70707c7070' +
    '70707070707070707070b41010101010101010b4b47070707070707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4707070707070707070707070707c7c707cb470' +
    '70707070707070707070b4101010101010101010b4b470707070707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b47c707070707070707070707c7c707070b470' +
    '70707070707070707070b410101010101010101010b470707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b4707070707070707070707c7c7c7070b470' +
    '7070707070707070707070b410101010101010101010b470707070707070707070707070707070707070707070707070707070707cb4b4b4b4b4b4b4b4b4b47070707070707070707c7c7c7c7cb4b470' +
    '7070707070707070707070b4b4101010101010101010b4707070707070707070707070707070707070707070707c70707070707070b4b4b4b4b4b4b4b4b47cb47070707070707070707c7c7070b4b470' +
    '707070707070707070707070b4101010101010101010b4707070707070707070707070707070707070707cb4b4107cb4b4b4b4b470b4b470707070b4b4b4b4b4b47c707070707070707c7c7070b4b470' +
    '707070707070707070707070b4101010101010101010b470707070707070707070707070707070b4b4b410101010101010101010b470707c707c7c70b4b4b4b4b47c70707070707070707070b4b4b470' +
    '70707070707070707070707c10101010101010101010b47070707070707070707070707070b4b47c10101010101010101010101010b470707c7c7c7c7cb4b4b4b47070707070707070707070b47cb470' +
    '707070707070707070707070b410101010101010101010b47070707070707070707070707cb4101010101010101010101010101010b47c7c7c7c7c7c7c7c7cb4b47070707070707070707070b4b4b470' +
    '70b470707070707070707070b41010101010101010101010b470707070707070707070b4b410101010101010101010101010101010b4707c7c7c7c7c7c707070707070707070707070707070b4b4b470' +
    '70b4b470707070707070707070b47c10101010101010101010b4b4707070707070b4b4101010101010101010101010101010101010b4707c7c7070707cb4b470707070707070707070707070b4b4b470' +
    '70b4b4b4707070707070707070707cb47c70b47c10101010101010b4b4b4b4b47c1010101010101010101010101010101010101010b4707c7070b4b4b4707cb4b4b47c70707070707070707070b4b470' +
    '70b4b4b47070707070707070707070707070707c7c7cb4101010101010101010101010101010101010101010101010101010101010b4707070b41010101010101010b4b470707070707070707070b470' +
    '70b4b4b47070707070707070707070b4b47c7c7c7c7c7c7c7c101010101010101010101010101010b4b4b4b4b4b47c10101010101010b4b4b4101010101010101010107cb47070707070707070707070' +
    '70b47cb47070707070707070707070b4b4b4b4707c7c7c7c701010101010101010101010101010b4b47070707070b4b41010101010101010101010101010101010101010b47070707070707070707070' +
    '70b4b4b4707070707070707070707cb4b4b4b4b4707c7c707c7cb41010101010101010101010b4b470707070707070b41010101010101010101010101010101010101010707c70707070707070707070' +
    '70b4b470707c7c707070707070707cb4b4b4b4b4b470707070b47cb41010101010101070b4b47070707070707070707c101010101010101010101010101010101010101010b470707070707070707070' +
    '70b4b470707c7c707070707070707070b47cb4b4b4b4b4b4b4b4b470b4b4101010b4b47c707070707070707070707070b41010101010101010101010101010101010101010b470707070707070707070' +
    '70b4b47c7c7c7c7c707070707070707070b4b4b4b4b4b4b4b4b4b47c7070707cb4707070707070707070707070707070b4b410101010101010101010101010101010101010b470707070707070707070' +
    '70b470707c7c7c70707070707070707070b4b4b47cb4b4b4b4b47070707070707070707070707070707070707070707070b41010101010101010107cb410101010101010107c70707070707070707070' +
    '70b47070707c7c707070707070707070707cb4b4b47cb4b47070707070707070707070707070707070707070707070707070b410101010107cb4b4b4b4b4b4b410101010107c70707070707070707070' +
    '70b47c707c7c7070707070707070707070707cb4b4b4b47070707070707070707070707070707070707070707070707070707cb4b4b47cb4b4707070707070b41010101010b470707070707070707070' +
    '70707c7c707c70707070707070707070707070b4b4b4b470707070707070707070707070707070707070707070707070707070707cb470707070707070707070b410101010b470707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070707070707070707070707070b4b4b4b470707070707070707070707070707070707070707070b47c101010b470707070707070707070' +
    '707c7c7c7c7c7c70707070707070707070707070707070707070707070707070707070707070b4b4b4b47070707070707070707070707070707070707cb4b47c70b41010101070707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707070707070707070707070707070b4b4b4b4707070707070707070707070707070707070b4b4b4b470b410101010b4707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070707070707070707070707070707c7c7c7c7070707070707070707070707070707070b4b4b4b4b470b410101010b47c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c707070707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b470b41010101010b4b470707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b47cb47070b410101010101010b4707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b4b4b4b47070b41010101010101010b47070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c7070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4707070b4101010101010107cb470707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070707070707070707070707070b4b4b4b4b47cb4b4b4b4b4b4b4b4b47c70707cb4101010101010107cb47c7070' +
    'b470707070b47070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  '30cae103-cb06-4791-a21d-241f488189d3':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70101010101010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070101010101010101010707c707c7c707070101010101070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010107070707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070707c10101010101010107c7c707c7c7c7010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70101010101010101010101010107c70707c7c7c7c7c7c7c7c7c7c7c707c7c707070707c7c101010101010107c707c7c7c7c7010101010101010707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70101010101010101010101010101070707c7c7c7c7c7c7c7c707070707070707070707c7c7c707010101010707c707c7c707010101010107c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70101010101010107c707c10101010707c7c7c7c7c7c707070707070707070707070707c7070707010101070707c7c70707010101010101070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '701010101010707070707070101010707c7c7c7c7c7070707070707070707070707070707c7c7c707070707c707c7c7c7010101010101070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '7010101010107070b4b47070101070707c7c7c7c707070b4b4707070707070707070707c7c7c7c7c707c707c7c7c7070101010101010107070707070707070707070707c70707070707c707c7c7c7c70' +
    '7010101010107070b4b47070101070707c7c7c7070b4707070707070b4b4b4707070b470707c7c7c7c7c7c7c7c7c7070101010101010107070707070707070707070707070707070707c7c7c7c707c70' +
    '70101010101070b4b4b4b4701010107c70707070b4701010107070707070707070707070707c7c7c7c7c7c707c7c70101010101010107c7070707070707070707070707070707070707c7c707c7c7c70' +
    '7010101010101070707070b470701010707070b4701010101010707070707070707070707070707c7c7c707070707010101010101010707070707c7070707070707070707070707070707c70707c7070' +
    '701010101010101010707070b4b4707c7c70b47070101010101010107070707070707070b470707c7c707070707010101010101010707070707c7c7c7c707070707070707070707070707c7c707c7070' +
    '7010101010101010101010107070b4b4b4b4707010101010101010101010107c7070707070b470707070101010101070707070707070707c7c7c7c7c707c70707070707070707070707c7c7070707c70' +
    '7070107070101010101010101070707070701010101010101010101010101010707070707070b47070101070707070707070707070707c7c7c7c7c7c7c7c7c707070707070707070707c7c7c707c7c70' +
    '707070707070101010101010101010101010101010101010101010101010101010101010107070b4101070707070707070707070707c7c7c7c707c7c7c7c7c7070707070707070707c7c7c7c707c7c70' +
    '70707070707010101010101010101010101010101010101010101010101010101010101010101070b47070707070707070707070707c7c7c7c707c7c7c7c7c7c7070707070707070707c7c707c7c7c70' +
    '707c70707070707c1010101010101010101010101010101010101070101010101010101010101070707070707070707070707070707c7070707070707c7c7c7c7c70707070707070707c7c707c7c7c70' +
    '707c707070707070707010101010101010101010101010101070707070701010101010101010707070b4707070707070707070707c7c707c707c7c70707c7c7c7c7070707070707070707070707c7c70' +
    '707c7c707070707070707010101010101010101010101010107070707070707010101010107070707070b4707070707070707c7c7c7c7c707c7c7c7c7070707c7c707070707070707070707c7c7c7c70' +
    '707c7070707070707070707070101010101010101010101070707c7c7c7070707070101010707070707070b470707070707c7c7c7c7c707c7c7c7c7c7c7c707c7c7070707070707070707070707c7c70' +
    '707c7c70707070707070707070101010101010101010107c70707c7c7c7c7c7c7c707070107c7070707070b4707070707c7c7c7c7c70707c7c7c7c7c7c7070707070707070707070707070707c7c7c70' +
    '707c7c7c70707070707070707070101010101010101070707c707c7c7c7c7c7c7c7c707070107070707070b47070707c707c7c7c7c7c707c7c707070707070707070707070707070707070707c7c7c70' +
    '707c7c7c707070707070707070707070707070707070707c7c707c7c7c7c7c7c7c7c707070101070707070b47070707c7c7c7c7c7c7c707c707010101010101010107070707070707070707c7c7c7c70' +
    '707c7c7c7070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7070707070101010107070707070707c7c7c7c7c7c7070707c10101010101010101010707070707070707070707c7c70' +
    '707c7c707070707070707070707070707c707c7c7c7c7c7c7c707c7c7c7c7c7c70707070101010101070b4701010707070707c7c7c7c707c101010101010101010101070707070707070707070707c70' +
    '707c7c7c70707070707070707070707c7c7c70707c7c7c7c70707c7c7c7c707070701010101010101070b4701010101070707070707070101010101010101010101010101070707070707070707c7c70' +
    '707c7c7070707070707070707070707c7c7c7c70707c7c707c707c7c7070707010101010101010101070707c10101010107c7070707070101010101010101010101010101010707070707070707c7c70' +
    '707c7c70707c7c70707070707070707c7c7c7c7c7070707070707c7070707010101010101010101070b47010101010101010107c70101010101010101010101010101010101010107c70707070707c70' +
    '70707c7c707c7c7070707070707070707c7c707c7c7070707c7c7c707070701010107c707070707070b4707070101010101010101010101010101010107c7c7c7c101010101010101010107070707070' +
    '707c7c7c7c7c7c7c7070707070707070707c7c7c7c7c7c7c7c7c7c7070701010107070707070b4b470b47070707c10101010101010101010101010707070707070707010101010101010107070707070' +
    '707c70707c7c7c707070707070707070707c7c7c707c7c7c7c7c707070701010707070b4707070707070b470707070707010101010101010107070b4b4b4707070b470707010101010101070707c7070' +
    '707c7070707c7c70707070707070707070707c7c7c7c7c707070707c7c10101070b470707070707c70707070b4b4707070707010101010707070b4707c1010107c7070b4707010101010101010101070' +
    '70707c707c7c7070707070707070707070707c7c7c7c7c707010101010101070707070707c7c7c7c7c7070707070b4b47070707010107070b47070101010101010101070b47070707010101010101070' +
    '70707c7c707c70707070707070707070707070707c707c707c101010107c70b4b47070707c7c707c7c7c7c7c70707070b4b470707070b4b4707010101070707c1010107070b470707070101010101070' +
    '707c7c7c707c7c7070707070707070707070707070707070707070b4b4b4b4707070707c7c7c7c7c7c7c7c7c7c70707070707070b470707c1010107c707070701010107c70707c7c7c70101010101070' +
    '707c7c7c7c7c7c7070707070707070707070b4b4b4b4b4b4b47070707c7070707c707c7c7c7c7c7c7c707c7c707c7070707070707070701010707070707c7c707c10101010707cb4b470101010101070' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707c7c707c7c7c7c707070707c7c7c7070707070707070707070707070707c707c7c7010101010707c7c7c707c1010101070' +
    '707c707c7c7c7c7c7070707c7c7c707070707c707c707070707010101070707c7c7c7c7c7070101010107c7c7c7070707070707070707070707070707c7c7c7070101010107070707070101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c7010101010707c7c7c7070707c10101010707c70707070707070707070707070707c7c7c7c7c70701010101010107c1010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c70701010101010707c7c7c7c1010101010107c707070707070707070707070707070707c7c7c7c7c7070101010101010101010101010101070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707c7c7c70101010101010101070707070707070707c7c7c7c707c7c7c7c7c7c7c7c7070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707c7c7c101010101010101010107070707070707c7c7c7c7c707c7c7c7c7c7c7c707c70701010101010101010101010101070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c701010101010707c7c701010101010101010107070707070707c7c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7010101010101010101010101070' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470b4b4b47070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  '3498110a-b6f5-41ee-89ec-67203559ed32':
    '70707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070b4' +
    '70707070b47c7c7cb470707070707070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b4707070707070707070707c70707070b47070707070707070707c7c707c7c707c707c7c707c7c7c707c70707c7c7cb4' +
    '7070707070b47c7c7c7070707070707070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c70707070707070707070b470707070b4b4707070707070707c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c70b4' +
    '707070707070b47c7c7cb4707070707070b4b4b4b4b4b4b4b4b4b4b4b4b4b47070707070707070707070707c7c7070e6e67c7c7070b4b4b4707c707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c707cb4' +
    '70707070707070b47c7c7c707070707070b47cb4b4b4b4b4b470707070707070707070707070707070e6e67c7c7c7ce67c70707070b4b4b4707c7c7c7c7c7c7c70707c7c7c7c7c7c7c7c7cb47c7c70b4' +
    '7070707070707070b47c7c7c70707070b4b4b4b4b4b470707070707070707070707cb4b470707070e67ce67c7c7c7c7ce67c7c7c7cb4b4b47cb47c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb4' +
    '707070707070707070b47c7c7c707070b4b4b4b4b47c70707070707070707070707cb4b4707070e6e6e6e6707c707c7c70707070707070707c7070707070707c7070707c70707070707c7c7c7c7c7cb4' +
    '707070707070707070707c7c7c70707cb4b4b4b47c7c7070b4b4b470707070707c7c7c7c7c70b47ce6e6e67c7c7c7c7c7c70707070707070b4707070707070707070707c70707070707c707c7c7c7cb4' +
    '70707070707070707070b47c7c707070b4b4b47070707070b4b4b470707070b4b470707070b4b47cb4b4e67070707070707070707c7c7cb470707070707070707070707070707070707c7c7c7c707cb4' +
    '70707070707070707070707c7c7c70707070707070707070b4b4b4707070e6e6e67c707c7ce67c7c7c707c70b4b4b47070707c7cb470707070707070707070707070707070707070707c7cb47c7c7cb4' +
    '70707070707070707070707c7c7cb47c70707070707070707070707070e6e6e67c7c7cb4e6e6707c7c7c7c70b4b4b470707c7c7c7070707070b4b4b4b47070707070b4b4b470707070707cb4707c70b4' +
    '7070707070707070707070707c7c7c7cb4707070707070707070707ce6e6e6e67c70e6e67c70e6e67c7c7c70b4b4b470707cb47070707070b4b4b4b4b47070707070b4b4b470707070707c7c707cb470' +
    '70707070707070707070707070b47c7c7c7c70707070707070707ce6e6e6e67c70e6e6e6707c7c70e6707c7c707070707c7c707070707070b4b4b4b4b4b47c707070b4b4b4707070707c7c707070b470' +
    '707070707070707070707070707070b47c7cb470707070707070707070707070e6e6e6e67c7ce6e67c7c70707070707cb47070707070b4b4b4b4b4b4b4b4b4707070707070707070707c7c7c7070b470' +
    '70707070707070707070707070707070b47c7c7c7070707070707070707070707070707070e6e67c707c707070707cb4707070707cb4b4b4b4b4b4b4b4b4b47070707070707070707c7c7c7c7cb4b4b4' +
    '70707070707070707070707070707070707c7cb4707070707070707070707070b4b47c7ce6e67ce6707c707070b47c707070707070b4b4b4b4b4b4b4b4b47cb47070707070707070707c7c7070b4b470' +
    '70707070707070707070707070707070707c7c7c707070707070707070707070b4b47c707070e6e6e67c7070707cb4707070b4e670b4b470707070b4b4b4b4b4b47c707070707070707c7c707cb4b470' +
    '7070707070707070707070707070707070b47c7c7c7070707070707070707070b4b47c707070707070707070707c7c70707ce670707c707c707c7c70b4b4b4b4b47c7070707070707070707cb4b4b470' +
    '7070707070707070707070707070707070707c7c7c7c7c707070707070707070707070707070707070707070b47c7070b47ce67c7c7070707c7c7c7c7cb4b4b4b4707070707070707c7c7c70b47cb470' +
    '7070707070707070707070707070707070707c7c7c7c7c7cb47c7c70707070707070707070707070707070b47cb470e6e67c7cb47070707c7c7c7c7c7c7c7cb4b4707070707c7c707c707070b4b4b470' +
    '70b4707070707070707070707070707070707c7070b47c7c7c7c7c7c7c70707070707070707070707070b47c7c70e6e67c7ce6707c70707c7c7c7c7c7c70707070707070707c70707cb47070b4b4b470' +
    '70b4b4707070707070707070707070707070b470707070707cb47c7c7c7cb47c707070707070707070b47c7c7070707070e6e67c7c7c707c7c7c707070707070707070707c707070b4b47070b4b4b470' +
    '70b4b4b47070707070707070707c7c7c7c7c70707070707070707cb47c7c7c7c7c70707070707070b47c7c7cb47c707070e6e67c707c707c7070707070707070707070b4b47070e6e67c7c7070b4b4b4' +
    '70b4b4b470707070707070707cb470707070707c7c707070707070707cb47c7c7cb470707cb47c7c7c7cb4707c7c7c7cb470707070707070707070707070707070707c7c7070e670e67c7c7c7c70b470' +
    '70b4b4b47070b4b4b47070b47c7070b4b47c7c7c7c7c7c70707070707070707c7c7c7c7c7c7c70b47070707070707cb47c7c7c7070707070707070707c7c7c7c7c7cb47070e6e6e67c7c7c7c7c7c7070' +
    '70b47cb4b47c707070b47cb4707070b4b4b4b4707c7c7c7c7070707070707070707c7c7c707070707070707070707070707c7c7c7c7070707070707c7c7c7070707070707070e6e67cb4b47c707c7c70' +
    '70b4b4b47c7070707070707070707cb4b4b4b4b4707c7c707c7070707070707070707c7c707070707070707070707070707070b47c7c7cb470707cb470707070707070707070707ce6e67c7c70b4b470' +
    '70b4b470707c7c707070707070707cb4b4b4b4b4b4707c7070b47c70707070707070b47c70707070707070707070707070707070707c7c7c7c7c70707070707070b4b47070707ce67ce67c7ce6e67c70' +
    '70b4b470707c7c707070707070707070b47cb4b4b4b4b4b4b4b4b470707070707070707c7c7070707070b4b4b470707070707070707070707c7c70707070707070b4b470707070b4b4e67ce6e6e67c70' +
    '70b4b47c7c7c7c7c707070707070707070b4b4b4b4b4b4b4b4b4b47c707070707070707cb47070707070b4b4b47070707070707070707070b47cb4707070707070b4b4707070e6b470707ce6e67c7c70' +
    '70b470707c7c7c70707070b4b47c707070b4b4b47cb470b4b4b47c70707070707070707c7c7070707070b4b4b4707070707070707070707070b47c707070707070707070707ce6e6e67c7c7c7c707c70' +
    '70b470707c7c7c70707070b4b47c7070707cb4b4b47cb4b470707070707070707070707c7c7c7070707070707070707070707070707070707070b47c7c7c70707070707070e6e6e6e67c7c7c7c707070' +
    '70b47c707c7c7070707070b4b47c707070707cb4b4b4b4707070b4b4b470707070707c7c707c7070707070707070707070707070707070707070707c7c7c7cb4707070e6e67ce6e67c7c7cb4e67c7070' +
    '70707c7c707c70707070707070707070707070b4b4b4b4707070b4b4b470707070707c7c70707c7c7070707070707070707070707070707070707070707cb47c7cb4707070e6e67c7c7c7ce6707c7070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b4b4b4707070b47c7c707070707c7c7c707070707070707070707070707070707070707c7070b47c7c7c7070707c707ce6e67c7c7c70' +
    '707c7c7c7c7c7c7070707070707070707070707070707070707070707070707cb470707070707070707c7cb4707070707070b4b4b4707070707070707cb4b47c7070b47c7c7070707ce6e6e6b4707070' +
    '707c7c7c7c707c7070707070707c70707070707070707070707070707070707c7070707070707070707070b47c7070707070b4b4b470707070707070b4b4b4b4707070707c7c7070707070e6b4707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c707070707070707c7c7c7c707070b4b4b4707070707070b4b470707070b4b4b4707070707070b4b4b4b4b470707070707c707070707ce67cb47070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707cb4707070707070b4b4b4707070707070707c707070707070707070707070b4b4b4b4b4b47070707070b47c7070e6e6e670b47c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707c7c707070707070707c7c7c7070707070707070b47070707070707070b4b4b4b4b4b47cb4707070707070707c7c7070707cb4e67c70' +
    '707c7c7c707cb4707c7c7c7c7c7c7c7c7c7c7c7c7c707c7070707c707070707070707070707070707070707070707c707070b4b4b4b4b4b4b4b4b4b4b4b4b4707070707070707c7c70707ce6e6e67c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c70707cb4707070707070707070707070707070707070707c7070b4b4b4b4b4b4b47070b4b4b4b4b470707070707070707c7c7ce6e6e6707c70' +
    '707c7c707cb47c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707c7070707070707070707070707070707070707070b47cb4b4b4b4b47cb4b4b4b4b4b4b4b4b47c70707070707070707c7070e6707c7c70' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47070b4707070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b47070707070707070707070707070707070707070',
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf':
    'e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e87070' +
    'e87c7c707c7c7c7c7c7c7c707cb47070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b47070707ce8e87ce8e8e8e8e8e8e87070e8e87cb4b4b4b470707070707c7ce87c707c7c707c7c7c707c70707c7c7c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c70707070b4b47cb4b4b4b4b4b4b4b4b4b4b4b4e87070707ce8e8e8e8e8e8e87ce8e87c10e8e8b4b4b4b4b470707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '707c7c7c707070707c7c7c7c7c70b47070b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070707070e8e8e8e8e8e8e8e87ce87cb4b4b4b4b4b470707c707ce87c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70107c7c70b4b4b4707070707070b47070b47cb4b4b4b4b4b4707070707070707070707070e87ce8e8e8e8e8e8e8e8e8e8b4b4b4b4b470707c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c70b4' +
    '707c7c7070b4b4b4707070707070b470b4b4b4b4b4b47070707070707070707070707070e8e8707c70e8e870e870e8e8b4b4b4b47070707c70707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb4' +
    '707c7c70707c7cb47070707070b4b470b4b4b4b4b47c70707070b4b47070707070b4b4b4e8e8e8e8b4b4b4b4b47ce8b4b4b4b47070707070707070707070707c7070707c70707070707c7c7c7c7c7cb4' +
    '707c7c7c7070707070707c70b4b470e8b4b4b4b4707c7070b4b4b4b4b4b4b4b4b4b4b4b4e87cb4b4707ce8b47cb4b4b4b4b470707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '707c7c7c707c707070707070b4b47070b4b4b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47c7cb470e8e8b4b4707070707070707070707070707070707070707070707070707c7c7c7c707cb4' +
    '707c7c7c7c707c7010707070b4b4707070b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4707070707070707c7070707070707070707070707070707070707c7c707c7c7cb4' +
    '707c7c7070707c707070707070b4b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070b47070707070707070e870707070707070707070707070707070707070707c70e87c70b4' +
    '701010101010707c707070707070b4b4b4b4b4b4b4b4b4707070707070707070b4b4b4b4b4b4b47070707070707070707c7c7070707070707070707070707070707070707070707070707c7c707ce870' +
    '7010101010101070707070707070707070b4b4b4b4707070707070707c7c7c707070b4b4b4707070707070e87c10e870707070707070707070707070707070707070707070707070707c7c707070e8b4' +
    '70707c707010107c707070707070707070707070707070707c7c7c7c7c7c707c707070707070707070707c707070707070707070b4b4b4b470707070707070707070707070707070707c7c7c70707ce8' +
    '70707070707c10107c70707070707070707070707070707c7c7c707c107c707c7c7c70707070707070107070b4b4707070b4b4b4b4b4b4b4707070707070707070707070707070707c7c7c7c7ce870e8' +
    '707070707070101010107c70707c7c70707070707070707c707c10107c10107c7c707c7c707070e8707070b4b47cb4b4b4b4b4b4b4b4b47c70707070707070707070707070707070707c7c70e8e8e8e8' +
    '7070707070707010101010107c707c7070707070707c7c70e81010107c1010101070707070707c70b4b4b4b4b4b4b4b4b4b4b4b4b4b4707c70707070707070707070707070707070707c7c70e8e8e8e8' +
    'e8e8707070707070707c101010107c7c7c70707c7c7c707010101070707010101010107c70707070b4b4b4b4b4b4b4b4b4b4b4b4b470707c707c7c7070707070707070707070707070707070e8e8e870' +
    '70e8707070707070707070101010707c7c7c7c7c7c707c1010107070b4b4707c101010107c7070b4b4b47cb4b4b4b4b4b4b4b4b4b47c7c707c7c7c7c70707070707070707070707070707070e8e8e870' +
    '70e870707070707070707070101010707c70707c7c101010107070b4b4b4b47070701010107070b4b4b4b4b4b4b4b4b4b4b4b4b4707c707c7c7c7c7c7c7c7070707070707070707070707070e8e8e8e8' +
    '707ce8707070707070707070701010107c7c7c7c1010107c7070b4b47cb4b4b470707010101070b4b4b4b4b4b4b4b47cb4b4b4b4b47c7c7c7c7c7c7c7c7070707070707070707070707070707ce870e8' +
    '70e8e8e87070707070707070707c101010101010101070707c70b4b4b4b4b47cb4b4707c10107070b4b4b4707070b4b47cb4b4b4b47c7c7c7c7c7070707c7c107c7c707070707070707070707ce870e8' +
    'e8e8e87c70707070707070707070707c7c1010107c70707c7c70b4b4b4b4b4b4b4b470701010107070707c7c707c70b4b4b4b4b4b470707c70707c7c10101010101010707070707070707070e8e8e870' +
    '7070e8707070707070707070707070707070707c7c7c7c7c7c70b4b4b4b4b4b4b4b470707c10107070707c7c7c7c7c70b4b4b4b4b47c7c707010101010107c7c7c10107c707070707070707070e87c70' +
    'e8e8e8e870707070707070707070707070707c7c7c7c7c7c7c70b4b4b4b4b4b4b470707070101010107ce8707c7c7c7c7070b4b4b4707c707c10107c7c707070707c101070707070707070707070e8e8' +
    '70e8e8e8707070707070707070707070707070707c7c7c7c7070b47cb4b4b4b4707010707070101010101010107c70707c7c7c70707c7c7010107c707070707070701010e8707070707070707070e8e8' +
    '7070e87c70707070707070707070707070707070707c7c707cb4b4b4b4b470e8e8707c7c7c7c7010101010101010107c70707c7c7c7c707c10107070707070707070101010707070707070707070e870' +
    '70e8e8e8707c7c7070707070707070707070707070707070b4b4b4b4b4b470707c7c707c7c7c7c7c70707070e810101010107c7070707c10107c707070707070707c7010101070707070707070707070' +
    'e8e87ce870107c70707070707070707070707070b4b4b4b4b47cb4b4b4b470707c7c7c7c7c7c707c7c7c7c7c7c7c7c1010101010101010107c7070707070707070707070101010107070707070707070' +
    'e8e8e87c7c7c7c7c7070707070707070707070b4b47cb4b4b4b4b47cb4707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7070707c10101010107c701010101070707070707070701010101070707070707070' +
    '707c70707c7c7c7070707070707070707070b4b4b4b4b4b4b4b4b4b47070707c7c7ce87c7c7c7c7c7c707c707c707010107c70e87c7070107c10b41010707c7070707070707070101010707070707070' +
    '70e87070707c7c70707070707070707070b4b4b4b4b4b47cb470707c7c70707c7c7c7c7c70707c7c707070707070b4101010101010101010e81010101070707070707070707070701010107c7c7c1070' +
    '70e87ce87c7c70707070707070707070b4b4b4b4b4b4b4b4707c7070707c70707c70707c7c7070707070707070701010101010101010101010101010107c707070707070707070707010101010101070' +
    'e8707c7c707c70707c7c7c70707070b4b4b4b47c7cb4b4707c707070707c707070707070707070707070707070101010b4101010101010101010701070707070707070707070707070707c7c10107c70' +
    '707c7c7c707c7c707cb47c70707070b4b4b4b4b4b4b4b4707c7070707070707070707070707070707070707070101010101010101010101010101070e870707070707070707070707c7c707070707c70' +
    'e87c7c7c7c7c7c707cb47c7070707070b4b4b470707070707c707070707070707070707070707070707070707010b4107c10101010107c101010e8e870707070707070707cb47c707c7c707c707c7c70' +
    '707c7c7c7c707c70b4b4b470707c70707070707070707070701070707070707070707070707070707070707010b410b410101010b4107010e810b47c70707070707070707cb47c707c7c7c7c707c7c70' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070707070707070707070707070707070707070b4101010701010e8101010101010107c7c7070707070707070b4707c707c707c7c7c7c7ce8' +
    '707c7c7c7c7c7c7c7c107c7c707c7c707c7c7c70707c7c7c7c70707070707070707070707070707070707c101010101010101010101010101010107070707070707070707070707c7c707c7c7c7c70e8' +
    'e87c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c70707c707070707070707070707070707c1010101010101010101010701010101010101070e87070707070707c7c7c7c7c7c707c7c7c7c70e8' +
    'e87c7c7c707c70707c7c7c7c107c7c7c7c7c7c7c7c707c707070707070707070707070707070107c1010b41010b4101010e8101010107c1010707c7c707070707c7c7c7c707c707c7c7c7c7c7c7c7ce8' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c707c707070707070707070707070b4101010101010101010101010101010101010707c70707070707c7c70707c7c7c7c7c7c7c7c7c7c7c7070' +
    'e87c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070701010101010101010101010b4101010101010b4707070707070707c7c7c7c7c7c707c707c7c707c7c707070' +
    '707070b470b4b4b4b4b4b4b4b4b4b4b4b4707070b4b4707070707070707070707070707070e870e8e8e870e8e870e8e8e870707070707070707070707070707070707070707070707070707070707070',
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70101010101010101010101010707070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b47070707ce5e57c7070e5e5e57070e5e570707c7070101010101070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7010101010101010101010101010707070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c7070707c70707070e570707c70707c7c70707010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70101010101010101010101010107c7070b4b4b4b4b4b4b4b4b4b4b4b4b4b47070707070707070707070707070707c7070707010101010101010707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010107070b47cb4b4b4b4b4b47070707070707070707070707070e5707070707070707070707010101010107c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70101010101010107c707c1010101070b4b4b4b4b4b47070707070707070707070707070e5e5e57ce57070e5e5e57070707010101010101070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70101010101070707070707010101070b4b4b4b4b47c7070707070707070707070707070e5e5707070707070707c70707010101010101070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '701010101010707cb4b47070101070b4b4b4b4b4707c70b4b470707070707070707070707c107070707070707c707070101010101010107070707070707070707070707c70707070707c707c7c7c7c70' +
    '701010101010707cb4b4707010107070b4b4b47070b4707070707070b4b4b47070b4b470707070707c7c707ce5707070101010101010107070707070707070707070707070707070707c7c7c7c707c70' +
    '70101010101070b4b4b4b4701010107c70b47070b4701010107070707070707070707070707070707070707070707010101010101010107070707070707070707070707070707070707c7c707c7c7c70' +
    '7010101010101070707070b470701010707070b470101010101070707070707070707070707070707070707070707010101010101010707070b4b4b4b4707070707070707070707070707c70707c7070' +
    '701010101010101010707070b4b4707c7c70b470701010101010101070707070707070b4b470707070707070707010101010101010707070b4b4b4b4b4707070707070707070707070707c7c707c7070' +
    '7010101010101010101010107070b4b4b4b4707010101010101010101010107c7070707070b4707070701010101010707070707070707070b4b4b4b4b4b47c707070707070707070707c7c7070707070' +
    '7070107070101010101010101070707070701010101010101010101010101010707070707070b4707010107070707070707070707070b4b4b4b4b4b4b4b4b4707070707070707070707c7c7c70701070' +
    '707070707070101010101010101010101010101010101010101010101010101010101010107070b41010707070707070707070707cb4b4b4b4b4b4b4b4b4b47070707070707070707c7c7c7c7c70e570' +
    '70707070707010101010101010101010101010101010101010101010101010101010101010101070b4707070707070707070707070b4b4b4b4b4b4b4b4b47cb47070707070707070707c7c70e570e570' +
    '707070707070707c101010101010101010101010101010101010107010101010101010101010107070707070707070707070707070b4b470707070b4b4b4b4b4b47c707070707070707c7c70e570e570' +
    '70e5e57070707070707010101010101010101010101010101070707070701010101010101010707070b4707070707070707070b4b4b4707c707c7c70b4b4b4b4b47c7070707070707070707070e5e570' +
    '70e570707070707070707010101010101010101010101010107070707070707010101010107070707070b470707070707070b4b4b4b47c707c7c7c7c7cb4b4b4b4707070707070707070707070707070' +
    '70e570707070707070707070701010101010101010101010707070b4707070707070101010707070707070b470707070b4b4b4b4b4b4707c7c7c7c7c7c7c7cb4b4707070707070707070707070707070' +
    '70707070707070707070707070101010101010101010107c70707cb4b47cb4b4b47c7070107c7070707070b4707070b4b47cb4b4b4b4707c7c7c7c7c7c7070707070707070707070707070707c70e570' +
    '7070707070707070707070707070101010101010101070707c70b4b4b4b470b4b4b4707070107070707070b47070b4b4b4b4b4b4b4b4707c7c707070707070707070707070707070707070707c70e570' +
    '70707070707070707070707070707070707070707070707c7c70b4b47cb4b4b4b4b4707070101070707070b47070b4b4b470b4b4b4b4707c707010101010101010107070707070707070707070707070' +
    '70e570707070707070707070707070707070707c7c7c7c7c7c70b4b4b4b47cb4b4707070701010101070707070707cb4b4b47cb4b47070707c1010101010101010101070707070707070707070707c70' +
    '707070707070707070707070707070b4b47c7c7c7c7c7c7c7c70b4b4b4b4b4b470707070101010101070b470101070707070707cb47c707c10101010101010101010107070707070707070707070e570' +
    '707070707070707070707070707070b4b4b4b4707c7c7c7c707cb4b4b4b4707070701010101010101070b47010101010707070707070701010101010101010101010101010707070707070707070e570' +
    '70e5e510707070707070707070707cb4b4b4b4b4707c7c707c70b4b4b470707010101010101010101070701010101010107c707070707010101010101010101010101010101070707070707070e5e570' +
    '70e5e5e5707c7c707070707070707cb4b4b4b4b4b470707070b4b47070707010101010101010101070b47010101010101010107c70101010101010101010101010101010101010107c70707070707070' +
    '70e570e5707c7c707070707070707070b47cb4b4b4b4b4b4b4b4b4707070701010107c707070707070b470707010101010101010101010101010101010107c107c101010101010101010107070707070' +
    '70e5707c7c7c7c7c707070707070707070b4b4b4b4b4b4b4b4b4b47c70701010107070707070b4b470b47070707c1010101010101010101010107c707070707070707010101010101010107070707070' +
    '707c70707c7c7c70707070707070707070b4b4b47cb4b4b4b4b47c7070701010707070b4707070707070b470707070707010101010101010107070b4b4b4707070b470707010101010101070707c7070' +
    '70707070707c7c707070707070707070707cb4b4b4b4b4b47070707c7c10101070b470707070707070707070b4b4707070707010101010707070b4707c101010107070b4707010101010101010101070' +
    '70707c707c7c7070707070707070707070707cb4b4b4b47070101010101010707070707070707070707070707070b4b47070707010107070b47070101010101010101070b47070707010101010101070' +
    '70707c7c707c70707070707070707070707070b4b4b4b4707c101010107c70b4b4707070707070707070707070707070b4b470707070b4b4707010101070707c1010107070b470707070101010101070' +
    '707c7c7c707c7c7070707070707070707070707070707070707070b4b4b4b470707070707070e570707070707070707070707070b47070101010107c707070701010107c70707c7c7c70101010101070' +
    '707c7c7c7c7c7c7070707070707070707070b4b4b4b4b4b4b47070707c707070e5701070707ce5e5e5707070707070707070707070707010107070707cb4b47c7c10101010707cb4b470101010101070' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707070e57070707070e5e57c707070707070707070707070707070707070b4b4b4b47010101010707c7c7c70101010101070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070701010107070707070e5707070e5e570707c70707070707070707070707070707070b4b4b4b4b470101010107070707070101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c701010101070707070e57ce5e5707070707c707070707070707070707070707070b4b4b4b4b4b4701010101010107c1010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010101010107070707ce5e5e570707ce57070707070707070707070707070b4b4b4b4b4b47cb47070101010101010101010101010101070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707070e57070e5e57070e57c70e57c707070707070b4b4b4b4b4b4b4b4b4b4b4b4b47070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707070e57070e5e570e5e5707070707070707070b4b4b4b4b4b4b470b4b4b4b4b4b47070701010101010101010101010101070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70101010101070e570e57070e5e57c707ce570707070707070b4b4b4b4b47cb4b4b4b4b4b4b4b4b47c70707010101010101010101010101070' +
    '707070707070b47070b470707070b470b4707070707070707070707070707070707070707070707070707070707070707070707070707070b47070707070707070707070707070707070707070707070',
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b47c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7070707c7c7070707070707070de7070707070707c70707c707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b47070707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070de7070107c7c707c70707cdede707c7070707c7070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b4b470707c7c7c7c7c7c7c7c7c7c7c707c7c707070707c7070dede7c7c707cdede7070707070707c7070707070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b4b470707c7c7c7c7c7c7c7c70707070707070707070707070dedede70dede7c707070dede707c70707c7070707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70b4b4b4b4b4b4b4b4b4b4b4b4b4b4707c7c7c7c7c7c707070707070707cde7070707c7c7070707070dede7070701070dede70107010707070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70b4b4b4b4b4b4b4b4b4b4b4b47070707c7c7c7c7c70707070707070dede7070707c7c7cde7070707cdede7010707c10de7c10707c707c70707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '70b4b4b4b4b4b47cb4b4b4b4707070707c7c7c7c707070b4b470707070707070707070dede70de7cdede70707070de7c7c7070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70b4b4b4b4b4b470b4b4b4b4707070707c7c7c7070b4707070707070b4b4b4707070b47070dede707cde70de707c707c7c7c7c70707c7c7070707070707070707070707070707070707c7c7c7c707c70' +
    '70b4b4b4b4b4b4b4b4b4b4b47070707070707070b4707070707070707070707c7c70707070707c7070707c7070dede70107c7c7c7c7c7c7c70707070707070707070707070707070707c7c707c7c7c70' +
    '70b4b4b4b4b4b4b4b4b4b4b470707070707070b47070707070707070707070de707c70707070707070de7c7ce310de707c7c7c7c7c70707070707c7070707070707070707070707070707c70707c7070' +
    '70107cb4b4b4b4b4b4b4b470b4b470707070b47070707070707070707070dede7c7c70b4b4707cdede7c7ce3e37c10e3707c7c7c7c7c7070707c7c7c7c707070707070707070707070707c7c707c7070' +
    '70101010b4b4b470707070707070b4b4b4b47070707070707070707070707070707c7c7070b47070707ce370707c7c7c707c7c707070707c7c7c7c7c707c70707070707070707070707c7c7070707070' +
    '701010107cb47070707070707070707070707070707070707070707070707070de707c7c1070b4707c70107070de7c7c7c7c707070707c7c7c7c7c7c7c7c7c707070707070707070707c7c7c70701070' +
    '70101010107070707070707070707070707070707070707070707070107070707070de10707070b470707070e37c7c7c70707070707c7c7c7c707c7c7c7c7c7070707070707070707c7c7c7c7c70e370' +
    '707010101010707070707070707070707070707070707070101010101010101070707070de7c7070b47070707070707070e37070707c7c7c7c707c7c7c7c7c7c7070707070707070707c7c70e370e370' +
    '70707010101010107070707070707070707070707070701010101010101010101010707070707070707070707c70707c707c7c7c707c7070707070707c7c7c7c7c70707070707070707c7c70e370e370' +
    '70e3e370101010101010707070707070707070707070101010101010101010101010107c70707c7c70b4707070707010707070707c7c707c707c7c70707c7c7c7c707070707070707070707070e3e370' +
    '70e37070701010101010101070707070707070707c101010107070707070707c101010107070dee37c70b4707070707070707c7c7c7c7c707c7c7c7c7070707c7c707070707070707070707070707070' +
    '70e37070707070701010101010101010101010101010101070707c7c7c70707070101010107070707c7070b470707070707c7c7c7c7c707c7c7c7c7c7c7c707c7c707070707070707070707070707070' +
    '707c7070707070707010101010101010101010101010107070707c7c7c7c7c7c7c701010107c7070707070b4707070707c7c7c7c7c70707c7c7c7c7c7c7070707070707070707070707070707c70de70' +
    '70707070707070707070707c1010101010101010107070707c707c7c7c7c7c7c7c7c701010107070707070b47070707c707c7c7c7c7c707c7c70707070707c707070707070707070707070707c70e370' +
    '70e3707c7070707070707070707070707c7c7c707070707c7c707c7c7c7c7c7c7c7c701010101010707070707070707c7c7c7c7c7c7c707c7070701010101010107c7070707070707070707070707070' +
    '70e370707070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7070701010101010101070707070707c7c7c7c7c7c707070701010101010101010101010707070707070707070707c70' +
    '707070707070707070707070707070707c707c7c7c7c7c7c7c707c7c7c7c7c7c70701010101010101010b4101010707070707c7c7c7c707010101010101010101010101010101010101070707070e370' +
    '7070707070707070707070707070707c7c7c70707c7c7c7c70707c7c7c7c70707010101010101010107cb41010101070707070707070701010101010101010101010101010101010101010707070e370' +
    '70e3e37c70707070707070707070707c7c7c7c70707c7c707c707c7c707070101010101010101010107070101010101010107070707c101010101010107c707c10101010101010101010101070dee370' +
    '70e3e3e3707c7c70707070707070707c7c7c7c7c7070707070707c7070707c1010101010107c707070b47c1010101010101010101010101010107c7070707070707070707c1010101010101010707070' +
    '70e370e3707c7c7070707070707070707c7c7c7c7c7c70707c7c7c7070701010101010707070707070b47070701010101010101010101010107070707070707070707070707070707010101010107070' +
    '70e3707c7c7c7c7c7070707070707070707c7c7c7c7c7c7c7c7c7c707010101010707070707070b470b470707070101010101010101010707070707070707070707070707070707070b4101010101070' +
    '707c70707c7c7c707070707070707070707c7c7c707c7c7c7c7c707010101010707070b4707070707070b470707070707c10101010107070707070b4b4b4707070b47070b4b4b4b4b4b4b41010101070' +
    '70707070707c7c70707070707070707070707c7c7c7c7c70707070101010101070b470707070707070707070b4b4707070707070707070707070b47070707070707070b4b4b4b4b4b4b4b4b410101070' +
    '70707c707c7c7070707070707070707070707c7c7c7c7c707010101010107c707070707070707070707070707070b4b47070707070707070b470707070707070707070b4b4b4b4b4b4b4b4b4b4101070' +
    '70707c7c707c70707070707070707070707070707c7c7c707c101010107c70b4b4707070707070707070707070707070b4b470707070b4b4707070707070707070b4b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c7c707c7c70707070707070707070707070707070707c7c70b4b4b4b4707070707070707070707070707070707070707070b4707070707070707070707070b4b4b4b4b47c7c7cb4b4b4b4b4b470' +
    '707c7c7c7c7c7c7070707070707070707070b4b4b4b4b4b4b470707c10707070de707c70707ce3e37070707070707070707070707070707070707070707c7c7070b4b4b4b4b47cb4b4b4b4b4b4b4b470' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707070e37070707070e3e37c7070707070707070707070707070707070707c707c7c70b4b4b4b4b47c7c7cb4b4b4b4b4b470' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070101010707070707070707070707070707c70707070707070707070707070707070707c7c7c7070b4b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c701010101070707070e37ce3e3707070707c7070707070707070707070707070707c7c7c7c7c70b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010101010107070707ce3e3e370707c7070707070707070707070707070707070707c7c7c7c7c70b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707070e3707070e37070e37c70707c7070707070707c7c7c7c707c7c7c7c7c7c7c7c7070b4b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707070707070e3de70e3e37070707070707070707c7c7c7c7c707c7c7c7c7c7c7c707c7070b4b4b4b4b4b4b4b4b4b4b4b4b470' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70101010101070e370e37070e3707c707ce3707070707070707c7c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c70b4b4b4b4b4b4b4b4b4b4b4b470' +
    '70b47070b4b4b4b4b470b4707070b4707070707070707070707070707070707070707070707070707070707070707070707070707070b470707070707070707070707070707070707070707070707070',
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '701010101010101010101010b4b47070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b4707070707070707070707070707070707070707070707070707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010b47c7070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c7070707070707070707070707070707070707070707070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7010101010101010101010101010b47070b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070707070707070707070707070707070707070b4b4b47070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010b47070b47cb4b4b4b4b4b470707070707070707070707070707070707070707070707070707070b4b4b470707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70b4101010101010101010101010b470b4b4b4b4b4b470707070707070707070707cb4b47070707070707070707070707070707070b4b4b470707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '7070b4b4707c1010101010101010b470b4b4b4b4b47070707070707070707070707cb4b47070707070707070707070707070707070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707cb4b4b4101010101010b470b4b4b4b4b47c7070b4b4b47070707070707c7c7c707070707070707070707070707070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070b4b41010101010b470b4b4b47070707070b4b4b4707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '707070707070707070b410101010107070b4707070707070b4b4b47070707070707070707070707070707070b4b4b470707070707070707070707070707070707070707070707070707c7c707c7c7c70' +
    '707070707070707070b4101010101010b4b47070707070707070707070707070707070707070707070707070b4b4b470707070707070707070b4b4b4b47070707070b4b4b470707070707c70707c7070' +
    '70707070707070707070b41010101010101010b4b47070707070707070707070707070707070707070707070b4b4b4707070707070707070b4b4b4b4b47070707070b4b4b470707070707c7c707cb470' +
    '70707070707070707070b4101010101010101010b4b470707070707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b47c707070b4b4b4707070707c7c707070b470' +
    '70707070707070707070b410101010101010101010b47c707070707070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b4707070707070707070707c7c7c7070b470' +
    '7070707070707070707070b410101010101010101010b470707070707070707070707070707070707070707070707070707070707cb4b4b4b4b4b4b4b4b4b47070707070707070707c7c7c7c7cb4b470' +
    '7070707070707070707070b4b4101010101010101010b4707070707070707070b4b47c707070707070707070707c7c707070707070b4b4b4b4b4b4b4b4b47cb47070707070707070707c7c7070b4b470' +
    '707070707070707070707070b4101010101010101010b4707070707070707070b4b47c707070707070707cb4b4107cb4b4b4b4b470b4b470707070b4b4b4b4b4b47c707070707070707c7c7070b4b470' +
    '707070707070707070707070b4101010101010101010b4707070707070707070b4b47c70707070b4b4b410101010101010101010b470707c707c7c70b4b4b4b4b47c70707070707070707070b4b4b470' +
    '70707070707070707070707c7c101010101010101010b47070707070707070707070707070b4b47c10101010101010101010101010b470707c7c7c7c7cb4b4b4b47070707070707070707070b47cb470' +
    '707070707070707070707070b410101010101010101010b47070707070707070707070707cb4101010101010101010101010101010b47c7c7c7c7c7c7c7c7cb4b47070707070707070707070b4b4b470' +
    '70b470707070707070707070b41010101010101010101010b470707070707070707070b4b410101010101010101010101010101010b4707c7c7c7c7c7c707070707070707070707070707070b4b4b470' +
    '70b4b470707070707070707070b47c10101010101010101010b4b4707070707070b4b47c1010101010101010101010101010101010b4707c7c7070707cb4b470707070707070707070707070b4b4b470' +
    '70b4b4b4707070707070707070707cb47c7cb47c7c10101010101070b4b4b4b47c1010101010101010101010101010101010101010b4707c7070b4b4b4707cb4b4b47c70707070707070707070b4b470' +
    '70b4b4b47070707070707070707070707070707c7c7cb410101010101010101010101010101010101010107c101010101010101010b4707070b47c10101010101010b4b470707070707070707070b470' +
    '70b4b4b47070707070707070707070b4b47c7c7c7c7c7c7c7c101010101010101010101010101010b4b4b4b4b4b47c10101010101010b4b4b4101010101010101010107cb47070707070707070707070' +
    '70b47cb47070707070707070707070b4b4b4b4707c7c7c7c70101010101010101010101010107cb4b47070707070b4b41010101010101010101010101010101010101010b47070707070707070707070' +
    '70b4b4b4707070707070707070707cb4b4b4b4b4707c7c707c7cb4101010101010101010107cb4b470707070707070b41010101010101010101010101010101010101010707c70707070707070707070' +
    '70b4b470707c7c707070707070707cb4b4b4b4b4b470707070b47cb41010101010101070b4b47070707070707070707c101010101010101010101010101010101010101010b470707070707070707070' +
    '70b4b470707c7c707070707070707070b47cb4b4b4b4b4b4b4b4b470b4b47c7c7cb4b47c707070707070b4b4b4707070b41010101010101010101010101010101010101010b470707070707070707070' +
    '70b4b47c7c7c7c7c707070707070707070b4b4b4b4b4b4b4b4b4b47c7070707cb47c7070707070707070b4b4b4707070b4b410101010101010101010101010101010101010b470707070707070707070' +
    '70b470707c7c7c70707070b4b47c707070b4b4b47cb4b4b4b4b47c707070707070707070707070707070b4b4b470707070b47c10101010101010107cb47c101010101010107c70707070707070707070' +
    '70b47070707c7c70707070b4b47c7070707cb4b4b47cb4b47070707070707070707070707070707070707070707070707070b410101010107cb4b4b4b4b4b4b4101010107c7c70707070707070707070' +
    '70b47c707c7c7070707070b4b47c707070707cb4b4b4b4707070b4b4b47070707070707070707070707070707070707070707cb4b4b47cb4b4707070707070b4101010107cb470707070707070707070' +
    '70707c7c707c70707070707070707070707070b4b4b4b4707070b4b4b470707070707070707070707070707070707070707070707cb47c707070707070707070b410101010b470707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b4b4b470707070707070707070707070707070707070707070707070707070707070707c7070b47c101010b470707070707070707070' +
    '707c7c7c7c7c7c70707070707070707070707070707070707070707070707070707070707070707070707070707070707070b4b4b4707070707070707cb4b47c70b41010107c70707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707070707070707070707070707070707070707070707070707070b4b4b470707070707070b4b4b4b470b410101010b4707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070707070707070707070b4b4b4707070707070707070707070b4b4b4707070707070b4b4b4b4b470b410101010b47c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707070707070707070b4b4b47070707070707070707070707070707070707070b4b4b4b4b4b470b41010101010b4b470707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707070707070707070707c7c7c7070707070707070707070707070707070b4b4b4b4b4b47cb47070b41010101010107cb4707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b4b4b4b4b4b4b47070b47c10101010101010b47070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c7070707070707070707070707070707070707070707070707070b4b4b4b4b4b4b47070b4b4b4b4b4707070b4101010101010107cb470707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070707070707070707070707070b4b4b4b4b47cb4b4b4b4b4b4b4b4b47c70707cb4101010101010107cb47c7070' +
    '70b4b4b47070b4b4b4b4b470b4b4b470b47070b47070707070707070707070707070707070707070707070707070707070707070b470b4707070707070707070707070707070707070707070707070b4',
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70707070b47c7c7cb470707070707070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b4707070707070707070707070707070707070707070707070707c7c707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7070707070b47c7c7c7070707070707070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c7070707070707070707070707070707070707070707070707c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c70b4' +
    '707070707070b47c7c7cb4707070707070b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070707070707070707070707070707070707070b4b4b4707c707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70707070707070b47c7c7c707070707070b47cb4b4b4b4b4b470707070707070707070707070707070707070707070707070707070b4b4b4707c7c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c70b4' +
    '7070707070707070b47c7c7c70707070b4b4b4b4b4b470707070707070707070707cb4b47070707070707070707070707070707070b4b4b47cb47c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb4' +
    '707070707070707070b47c7c7c707070b4b4b4b4b47c70707070707070707070707cb4b470707070707070707070707070707070707070707c7070707070707c7070707c70707070707c7c7c7c7c7cb4' +
    '707070707070707070707c7c7c70707cb4b4b4b4707c7070b4b4b47070707070707c7c7c70707070707070707070707070707070707070b4b4707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070707070b47c7c707070b4b4b47070707070b4b4b4707070707070707070707070707070707070707070707070707c7c7cb470707070707070707070707070707070707c7c7c7c707cb4' +
    '70707070707070707070707c7c7c70707070707070707070b4b4b47070707070707070707070707070707070b4b4b47070707c7cb470707070707070707070707070707070707070707c7c707c7c7cb4' +
    '70707070707070707070707c7c7cb47c70707070707070707070707070707070707070707070707070707070b4b4b470707c7c7c7070707070b4b4b4b47070707070b4b4b470707070707c70707c7070' +
    '7070707070707070707070707c7c7c7cb4707070707070707070707070707070707070707070707070707070b4b4b470707cb47070707070b4b4b4b4b47070707070b4b4b470707070707c7c707cb470' +
    '70707070707070707070707070b47c7c7c7c7070707070707070707070707070707070707070707070707070707070707c7c707070707070b4b4b4b4b4b47c707070b4b4b4707070707c7c707070b470' +
    '707070707070707070707070707070b47c7cb4707070707070707070707070707070707070707070707070707070707cb47070707070b4b4b4b4b4b4b4b4b4707070707070707070707c7c7c7070b470' +
    '70707070707070707070707070707070b47c7c7c70707070707070707070707070707070707070707070707070707cb4707070707cb4b4b4b4b4b4b4b4b4b47070707070707070707c7c7c7c7cb4b4b4' +
    '70707070707070707070707070707070707c7cb4707070707070707070707070b4b47c70707070707070707070b47c707070707070b4b4b4b4b4b4b4b4b47cb47070707070707070707c7c7070b4b470' +
    '70707070707070707070707070707070707c7c7c707070707070707070707070b4b47c707070707070707070707cb4707070707070b4b470707070b4b4b4b4b4b47c707070707070707c7c707cb4b470' +
    '7070707070707070707070707070707070b47c7c7c7070707070707070707070b4b47c707070707070707070707c7c70707070707070707c707c7c70b4b4b4b4b47c7070707070707070707cb4b4b470' +
    '7070707070707070707070707070707070707c7c7c7c7c707070707070707070707070707070707070707070b47c707070707070707070707c7c7c7c7cb4b4b4b4707070707070707c7c7c70b47cb470' +
    '7070707070707070707070707070707070707c7c7c7c7c7cb47c7c70707070707070707070707070707070b47cb47070707070707070707c7c7c7c7c7c7c7cb4b4707070707c7c707c707070b4b4b470' +
    '70b4707070707070707070707070707070707c7070b47c7c7c7c7c7c7c70707070707070707070707070b47c7c707070707070707070707c7c7c7c7c7c70707070707070707c707070707070b4b4b470' +
    '70b4b4707070707070707070707070707070b470707070707cb47c7c7c7cb47c707070707070707070b47c7c70707070707070707070707c7c7c707070707070707070707c70707070707070b4b4b470' +
    '70b4b4b47070707070707070707c7c7c707c70707070707070707cb47c7c7c7c7c70707070707070b47c7c7cb47c7070707070707070707c7070707070707070707070b4b47070707070707070b4b470' +
    '70b4b4b470707070707070707cb470707070707c7c707070707070707cb47c7c7cb470707cb47c7c7c7cb4707c7c7c7cb470707070707070707070707070707070707c7c70707070707070707070b470' +
    '70b4b4b47070b4b4b47070b47c7070b4b47c7c7c7c7c7c70707070707070707c7c7c7c7c7c7c70b47070707070707cb47c7c7c7070707070707070707c7c7c7c7c7cb470707070707070707070707070' +
    '70b47cb4707c707070b47cb4707070b4b4b4b4707c7c7c7c7070707070707070707c7c7c70707070707070707070707070707c7c7c7070707070707c7c7c707070707070707070707070707070707070' +
    '70b4b4b47c7070707070707070707cb4b4b4b4b4707c7c707c7070707070707070707c7c707070707070707070707070707070b47c7c7cb470707c707070707070707070707070707070707070707070' +
    '70b4b470707c7c707070707070707cb4b4b4b4b4b470707070b47c70707070707070b47c70707070707070707070707070707070707c7c7c7c7c70707070707070b4b470707070707070707070707070' +
    '70b4b470707c7c707070707070707070b47cb4b4b4b4b4b4b4b4b470707070707070707c7c7070707070b4b4b470707070707070707070707c7c70707070707070b4b470707070707070707070707070' +
    '70b4b47c7c7c7c7c707070707070707070b4b4b4b4b4b4b4b4b4b47c707070707070707cb47070707070b4b4b47070707070707070707070b47cb4707070707070b4b470707070707070707070707070' +
    '70b470707c7c7c70707070b4b47c707070b4b4b47cb470b4b4b47c70707070707070707c7c7070707070b4b4b4707070707070707070707070b47c707070707070707070707070707070707070707070' +
    '70b47070707c7c70707070b4b47c7070707cb4b4b47cb4b470707070707070707070707c7c7c7070707070707070707070707070707070707070b47c7c7c707070707070707070707070707070707070' +
    '70b47c707c7c7070707070b4b47c707070707cb4b4b4b4707070b4b4b470707070707c7c707c7070707070707070707070707070707070707070707c7c7c7cb470707070707070707070707070707070' +
    '70707c7c707c70707070707070707070707070b4b4b4b4707070b4b4b470707070707c7c70707c7c7070707070707070707070707070707070707070707cb47c7cb47070707070707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b4b4b4707070b47c7c707070707c7c7c707070707070707070707070707070707070707c7070b47c7c7c707070707070707070707070' +
    '707c7c7c7c7c7c7070707070707070707070707070707070707070707070707cb470707070707070707c7cb4707070707070b4b4b4707070707070707cb4b47c7070b47c7c7070707070707070707070' +
    '707c7c7c7c707c7070707070707c70707070707070707070707070707070707c7070707070707070707070b47c7070707070b4b4b470707070707070b4b4b4b4707070707c7c70707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c707070707070707c7c7c7c707070b4b4b4707070707070b4b470707070b4b4b4707070707070b4b4b4b4b470707070707c7c707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707cb4707070707070b4b4b4707070707070707c707070707070707070707070b4b4b4b4b4b47070707070b47c707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707070707c707070707070707c7c7c7070707070707070b47070707070707070b4b4b4b4b4b47cb4707070707070707c7c7070707070707070' +
    '707c7c7c707cb4707c7c7c7c7c7c7c7c7c7c7c7c7c707c7070707c707070707070707070707070707070707070707c707070b4b4b4b4b4b4b4b4b4b4b4b4b4707070707070707c7c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c70707cb4707070707070707070707070707070707070707c7070b4b4b4b4b4b4b47070b4b4b4b4b470707070707070707c7c70707070707070' +
    '707c7c707cb47c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707c7070707070707070707070707070707070707070b47cb4b4b4b4b47cb4b4b4b4b4b4b4b4b47c70707070707070707c70707070707070' +
    '70b4b4b470b4b4b4b4b4b4b4b4b4b4b4b470b4b47070707070707070707070707070707070707070707070707070707070707070b470b470b4b470707070707070707070707070707070707070707070',
  'b94a7e47-8778-43d3-a3fa-d26f831233f6':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70081c1c080808081c08080808787878b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b47878787ce1e17c70e17070e17070e1e170707c7878081c08080878707c74707c707c7c7074747c78747878747c7470' +
    '7008080808080808080808080808787878b4b47cb4b4b4b4b4b4b4b4b4b4b4b4747870787ce170707070e1e17c70707c747070781c08080808081c787c7474747c747c7c74747c747474787478747070' +
    '70080808080808080808080808081c7878b4b4b4b4b4b4b4b4b4b4b4b4b4b47878787878787870707070707070707c7070787808080808080808787470747474747c74747c7474747074747074747470' +
    '7008080808080808080808080808087870b47cb4b4b4b4b4b47078787878787878787878787070e1e170707070707070707878081c0808087c78747c7c747c747070747474747474707c74707c747870' +
    '70080808080808080808081c08080878b4b4b4b4b4b478787878787878787878787878787070707c707070707070707078781c080808080878787c7074747c74787c74747c74787078707c7474747470' +
    '70080808080808080808080808081c78b4b4b4b4b47c787878787878787878787878787870e1707078787078707c7070700808080808087078787878787078747078707478787878787474747c7c7470' +
    '700808080808081c08080808081c78b4b4b4b4b4b47c78787078787878787078787878787c1c7078e170e178087078780808080808081c707078707878787878787870747878787878747874747c7470' +
    '7008080808080808707c7c7c7c7cb4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47c74b47c7070b4b47c7c7c7c7c7c7cb4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47874747c74707c70' +
    '7008080808080808080808080808087c70b4707878700808087878787878787878787878787870787878787878b470080808080808081c7878787878787878787878787878787878787474707c747c70' +
    '700808080808080808080808080808087078781c0808080808087078787878787878787878787878707878787878707008080808081c787870b4b4b4b4787878787078787878787878707470707c7870' +
    '70080808081c080808080808080808081c081c08080808080808081c7070b4787878787078787878787878707070081c0870080808787878b4b4b4b4b4707878787878787878707878787c74707c7070' +
    '700808080808080808080808080808080808080808080808081c08087408087c78787878787878787878080808081c787878707878787870b4b4b4b4b4b474787878787878787878787c7c7078787070' +
    '707808707808081c08080808080808081c0808080808080808080808080808087878787878787878781c1c7878707878787878787870b4b4b4b4b4b4b4b4b47878787878787878787874747478701c70' +
    '7078787878700808080808080808081c080808080808080808080808080808080808081c1c78701c08087878787078787878787874b4b4b4b4b4b4b4b4b4b47878787878707878787474747c7c707070' +
    '70787878787808080808080808081c08080808080808080808080808080808080808080808081c7078787878787878787878787878b4b4b4b4b4b4b4b4b474b470787878787878787074747870707070' +
    '707878787878781c1c080808081c08080808080808080808080808701c080808080808080808087878787878787878787878787878b4b478787078b4b4b4b4b4b47c787878787878787c7c70e1e17070' +
    '70e1707878787878787008081c0808080808080808080808087878787870080808080808080878787878787878787870787878b4b4b4787470747c78b4b4b4b4b474787878787878787878707070e170' +
    '70707078787878787878707c1c080808080808080808080808787878787878701c0808080878787878787878787878707878b4b4b4b4747874747c7474b4b4b4b4707870787878787878787870707070' +
    '70e178787878787878787878700808080808080808080808707870b47078787870780808087870787878787878787878b4b4b4b4b4b478747c7c747474747cb4b478b478787878787878787870707070' +
    '70707078787870b4b4b4787878080808080808080808081c78787cb4b474b4b4b47c78781c1c787078787878787870b4b47cb4b4b4b47074747474747c787878707878787878b4b4b47078787c707070' +
    '70707070787870b4b47878787878080808080808081c78787478b4b4b4b470b4b4b4787870087878787078787878b4b4b4b4b4b4b4b4787474707878787878787078787878787cb4b47078787c707070' +
    '70707070787870b4b47878787878787070787078787870747478b4b47cb4b4b4b4b4787070081c70707878787878b4b4b470b4b4b4b4787478781c08080808080808787878787cb4b470787870707070' +
    '70e17070787870b4b4b478707878787878707874747474747470b4b4b4b47cb4b478787870080808087c707870787cb4b4b47cb4b47078781c08080808080808080808787878b4b4b470787878707c70' +
    '707070707878787878787078787878b4b47c747474747c7c7c78b4b4b4b4b4b4787078700808080808080808080878787878787cb47c7874080808080808080808080870787878787870787878787070' +
    '707070707878787878787870787870b4b4b4b470747c7474787cb4b4b4b478787878080808080808080808080808081c70787878787878080808080808080808080808081c7878787878787878707070' +
    '70e1701c787878787878787878787cb4b4b4b4b4787c74707470b4b4b4787870080808080808080808080808080808081c7070787878700808080808080808080808081c080870787878787878e17070' +
    '7070e1e1787c7c787878787878787cb4b4b4b4b4b478787870b4b4787878780808080808081c1c08080808081c0808080808081c700808080808080808080808080808080808081c7c78787878787870' +
    '70e17070707474787878787878787870b47cb4b4b4b4b4b4b4b4b4787878700808087c7070787878787878787808080808080808080808080808080808080808081c08080808081c08081c7878787870' +
    '70e1707c7c747474787878787870787878b4b4b4b4b4b4b4b4b4b47c787808081c7078787878787870787878787c0808080808080808080808080808080808081c1c08080808081c0808087878787870' +
    '707c707874747478787878707878787878b4b4b47cb4b4b4b4b47c7878700808787870787878787878787878787878787808080808080808080808080808081c0808081c0808081c0808087078747870' +
    '7070787870747c78b478787878787878787cb4b4b4b4b4b4787878747c1c080878787878787878787070787878787878787870081c08080808080808080808080808081c0808081c0808080808080870' +
    '70707c70747c787878b478787878787878787cb4b4b4b478781c0808087c087078787870787878787870787878787878787878780808080808080808081c0808080808080808081c0808080808080870' +
    '70787c7c707478787878b47878707878787878b4b4b4b4787c080808080870b4787878787878787878787878787878787878787878780808080808081c78787c080808080808081c0808081c08080870' +
    '7074747c70747478787878b4787878787878787870787878080808080808707878b478787870e178787878787878787878787878787878080808087c70707078080808080808081c0808080808080870' +
    '707c7c747c747478b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47070707070b4b4b470b41cb4b470e1e1e1b4b4b4b4b4b4b4b4b4b4b4b4b4b47070b4b4b47cb4b47c70707070707070700808080808080870' +
    '7074747c7478747878787878707c7878787878787878787878080808087870707070707878b470e1e17c787878787878787878787878787878787870b4b4b4b478080808080808080808080808080870' +
    '707470747474747c7878787c7c74707878787c787470787878700808087070707070e1787878e1e170707c78787878787878787878787878787878b4b4b4b4b470080808080808080808080808080870' +
    '707c74747c7474747c747c7470747478747c7478787c7c7c7c700808080870707070e17ce170707070707c787878787878787878787878787878b4b4b4b4b4b4701c0808080808080808080808080870' +
    '707c7474747c7474747c747474787c74747474747c7074787008080808087878707ce1e1e170707ce17070787878787878787878787878b4b4b4b4b4b47cb47070080808080808080808080808080870' +
    '707c7c747074707074747c7c7474747474747c74747074787808080808787878e170e1e1e17070700870e17c787878787878b4b4b4b4b4b4b4b4b4b4b4b4b478781c080808080808081c080808080870' +
    '70747474747474747474747c74747c707474747c747074701c08080808787870e17070707070e1e1707070707878787878b4b4b4b4b4b4b4b4b4b4b4b4b4b47878780808080808080808080808080870' +
    '70747c78747074747c74747c747c747474747c747c747470080808080870e170707070e1e17c707ce170707878787878b4b4b4b4b47cb4b4b4b4b4b4b4b4b47c78787008080808080808080808080870' +
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '7070707070707070707070707cb47070b4b4b47cb4b4b4b4b4b4b47cb4b4b4b4b47070707c70707c70707070707070707070707cb4b4b4b470707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7070707070707070707070701070707070b4b47cb4b4b4b4b4b4b4b4b4b4b4b47c7070707c707070707070707c70707c7c7070b4b4b4b4b4707010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7070707070707070707070701070b47070b4b4b4b4b4b4b4b4b4b4b4b4b4b4707070707070707070707070707070107070b4b4b4b4b4b4707010707c7c7c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7070707070707070707070707070b47070b47cb4b4b4b4b4b4707070707070707070707070707070707070707070707070b4b4b4b4b470707c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '7070707070707070707070707070b470b4b4b4b4b4b470707070707070707070707070707070707c7070707070707070b4b4b4b47070701070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70707070707070707070707070b4b470b4b4b4b4b47c707070b4b4b47070707070b4b4b470707070b4b4b4b4b47c70b4b4b4b47070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707070707070701070b4b470b4b4b4b4b4707c7070b4b4b4b4b4b4b4b4b4b4b4b4707cb4b4707070b47cb4b4b4b4b470707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '707070707070707070707070b4b47070b4b4b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b47c7cb4707070b4b4707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '70707070707070707c707070b4b4707070b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070707070107070707070707070707070707070707070707c7c707c7c7c70' +
    '707c7070707070707070707070b4b470707070b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b470707070b470707070707070707070707070707070707070707070707070707070707c70707c7070' +
    '701010101010707c707070707070b4b4b4b4b4b4b4b4b4707070707070707070b4b4b4b4b4b4b47070707070707070707c7c7070707070707070707070707070707070707070707070707c7c707c7070' +
    '7010101010101070707070707070707070b4b4b4b4707070707070707c7c7c707070b4b4b47070707070707010107070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '70707c7070101010707070707070707070707070707070707c7c7c7c7c7c707c70707070707070707070107070707070707070707070707070707070707070707070707070707070707c7c7c70701070' +
    '70707070701010107c70707070707070707070707070707c7c7c70101010707c7c7c70707070707070107070707070707070707070707070707070707070707070707070707070707c7c7c7c7c707070' +
    '707070707070101010107c70707c7c70707070707070707c701010101010107c7c707c7c707070707070707070707070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '7070707070707010101010107c707c7070707070707c7c7070101010101010101070707070707c707070707070707070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '70707070707070707010101010107c7c7c70707c7c7c707010101070707010101010107c70707c7c7c7c707070707070707070707070707c707c7c707070707070707070707070707070707070707070' +
    '7070707070707070707070101010707c7c7c7c7c7c701010101070707070707c101010101070b4b4b4b470707070707070707070707070707c7c7c7c7070707070707070707070707070707070707070' +
    '707070707070707070707070101010707c70707c7c1010101070707070707070707010101070b4b4b4b4707070707070707070707070707c7c7c7c7c7c7c707070707070707070707070707070707070' +
    '70707070707070707070707070101010107c7c10101010107070707070707070707070101010b4b4b4b4707070707070707070707070707c7c7c7c7c7c7070707070707070707070707070707c707070' +
    '707070707070707070707070707c101010101010101070707c707070707070707070707c101070707070707070707070707070707070707c7c70707070101010107c707070707070707070707c707070' +
    '70707070707070707070707070707010101010101070707c7c7070707070707070707070101010707070707070707070707070707070707c707010101010101010101070707070707070707070707070' +
    '707070707070707070707070707070707070707c7c7c7c7c7c70707070707070707070701010107070707070707070707070707070707070701010101010107c10101010707070707070707070707c70' +
    '7070707070707070707070707070707070707c7c7c7c7c7c7c70707070707070707070707010101010107070707070707070707070707070101010107c70707070101010707070707070707070707070' +
    '70707070707070707070707070707070707070707c7c7c7c707070707070707070701070707010101010101010107070707070707070707010107c707070707070701010707070707070707070707070' +
    '7070707c70707070707070707070707070707070707c7c707c70707070707070707070707070701010101010101010107070707070707010101070707070707070701010107070707070707070707070' +
    '70707070707c7c70707070707070707070707070707070707070707070707070707070707070707070707070701010101010107070701010107c707070707070707c7010101070707070707070707070' +
    '70707070707c7c70707070707070707070707070707070707070707070707070707070707070707070707070707010101010101010101010107070707070707070707070101010107070707070707070' +
    '7070707c7c7c7c7c70707070707070707070707070707070707070707070107070707070707070707070707070707070701010101010107c707070707070707070707070701010101070707070707070' +
    '707c70707c7c7c7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707c707070707070707070107070707070707070101010707070707070' +
    '70707070707c7c70707070707070707070707070707070707070707c7c707070707070707070707070707070707070707070707070707070707070707070707070707070707070701010101010101070' +
    '70707c707c7c7070707070707070707070707070707070707010707070707070707070707070707070707070707070707070707070707070707070707010707070707070707070707010101010101070' +
    '70707c7c707c7070707070707070707070707070707070707c707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707c1010101070' +
    '707c7c7c707c7c70707070707070707070707070707070707c70707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c70707070707070707070707070707070701070707070707070707070707070b4b4b4b47070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707010707070707070707070707070b4b4b4b470707070707070707070707070707070707c7070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070707070707070707070707070b47070b47070707070707070707070707070707070107070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070707070707070707070107070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701070707070707070707070707070707070707070707070707070707070707070701070707070707070707070707070707070707070707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '7070707070b4b47070b470707070b47070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  'random-frontier-01':
    '707272706f84b4707070836f6f6c6b6eb4736e6866690a0b0e110f0b79686a6b6a6a6d0b6c6e71706f71758a726c676566696a6e88787a7b7a77e76b67696b6cb48a7978736c6c70d0e7989898dee298' +
    '7474726f6e70717273718181706f6e7085846e69696c6d0c0d0f0e0b0a6a6b6a69696b80806e71717073777876706a67676a6d71747577797876726d6b6e70837477767472828373d0d0b49898e2e5b4' +
    '75736f6d6e6f6f70716f7f8098707172b4706d6b6d70706e0d0e0d0c0c0c0c6a696b6d6d806e71717185897877716c6a6a6c707373727475757473706f72888888757270838587d0d0d0d0b4b4b4b4d0' +
    '73716d6c6f6f6e6e6f6e8081826f7172706e6d6d7073726f8182810c0b0b0b0a6c70726f6c6d70718383867574706d6d6c6d707170707071737676737173898885848280828776768bd08bb4b4b4d0d0' +
    '71706d6d7070707171708283826e7071706d6d7073757485b46f806b0b0b0b0b0c7273706d6f728582808271706e6e6d6c6c6d6d6e6f6f6f727677747171868683827182838675778c8d767298b4b4e9' +
    '70706e6d7072747575728282816d6e707170717376778ad0b498986e0c0c0d0d0e0f737170727587827e7f6e6e6e6f6f6e6e6d6c6e6f6f8183737472b48585857273737284b474768ad073729898e3b4' +
    '71706f6f7173d08a88b48080806c6c6e70727375777979d0d0b4b4b4700d0f0f0f0f0f74747475d0847f7e6d6e6f70707071706f6f70848484857272868787727172727287d0767775716f98e2dee0e6' +
    '727285b47285858686709881806b6a6c7086b4b4777a79767373878785841010100f108a7675757674826d6d6f6f70707172727170718688d0727272858586706d6c6e71d0d078787671988298dddde4' +
    '7272d08772708283b4708585817b696d8486b4b4737574727170848689751211100f10877575747574716f6e6e6e6f717170717273738889d0727271828182806a987d8172d0768c8a8784849898dce0' +
    '6f7173737171706f83848788827c7c80848582986f717070708383868c78131110100e6e70737270717272706e6f71737370717575d086857070716f807f8181989898808484858787868788859898e0' +
    '6e6f706f6f7171708383858784807f808281808170727373728584b48889111111100d0b6d6f98816d7174716f6f73768a73727373b4b46d6c6e6f6d9898b483989898818482808182838687b4807e98' +
    '706f6e6c6d707070718382828483807d7e7f808386898a8ad0716e6d6e6f0f11110f0c0b0b7f816d6e868985816f86898a88706e989898986b6c6e6e98b4b48398986e6f83827e7e9898b472706e7f7e' +
    '726f6c6b6d70707071827f8082827e7c7c7f81838586b4b4b498986c6c6e71880f0d0b0c0c7e7f81858989848081848686846f6d7f98b4b46d6d6f6f98b4d0b48080806e7083819898987170706f6e6d' +
    '71706d7f8084706f706f7f8183817d7d6b6d81807f9898989898986d6f717171820c0d0e0f807f8198888783818184727081816f6fb4b472716f70709898b4d083828283858786717172716f7071716f' +
    'b4706f6d8184706e6f6f6f8586827e7f828382807c7b6c98b4b49871737474706e0d1012110e6d8284846f83838485726f808183b4b4ec73737272716d989871d086868688898772727285838486716e' +
    '836f6e6e8486836d6f70708789878281838382817e7d6e86d0d0737373757674718511110f0c6c81838370b4868586716e808284d0ebec73737373716d68686d7389888789898683848686878888716c' +
    '726f6d6e8587727071728486898a87858382819898986f8688747270707274767573110f0c0a0a8083838472717070716e988172d0ececb4b47172726d68686dd0888684858785828487888a8b888398' +
    '88706d808386727273718283868989d0858281989898806f706f986e6d6c6e73767511100d0a0a80838180816e6c6d6f6e6b6cb483d0b498986f71726e696ab4b4b4987f80838484858687d076b4826d' +
    '87838080986f7072737080808486d0ea84828198987e7f6d6d7f98986c6b6c72767713120f0c0b83837f7d7f6e6c6c6e6c69686b6fd0d0b4986d6f6f6d6b6db4b49898987f80809871b4b4ead073706e' +
    '6f80986d6d6b6d7172706e83868785b4828182b484806c6d6c7f9898986d7074778a1312100d0d8684807f81706e6d6d6b6867686cf2d0b46c6b6a6a6b6c6f70b49898989898989898e6e7d0d075736f' +
    '6a6b6c6c6a696b6e6f7070868887838181829871706e6e6f6e9898989871747575860f0e0d0d0d72848180b46f6e6d6b6a6968686bb4d0d06d6b6968696b6d6f70b4816d6d6b989898e8ebd0d0d07383' +
    '696a6a6a696b6d6d6b6d6f848685817e8083716e6e6f7185826b6a6b6f737473706d6a68696c6e71716f6d6e6f6e6c6b6b6c6d6d6a98b470706f6e6b69696a6c6e70706e6c6a689898eaeed0d0898684' +
    '6b6c6c6d6e71716d68696c6e8498987e80836f6d6d718788b46e6c6c707374716c696766686b6e71716e6d6e6f6e6d6e6e7073736d98d0d07373726f6c696a6c6e707098986b6a6a98b4d0d085857171' +
    '6e7072747678756d68676a6e72989881826f6d6c6e718788d0b47070727372706c6868686a6d70716e6c6d6e6e6d6d6e7072767672d0d0d0757574718198b4b4706f6f98986c6d6d6db4b46f6d6e6f6f' +
    '70727476797a76706a686a6e7374716f70706e6d6d6e8285b4b48571727184986c6a6a6b6c0f1110816d6e6e6e6d6c6c6e72767674d0d0f8fad07270b4e9eab4b46d6e6e6d6e71726f6d6c6c6b6c6d6d' +
    '71717174787875716d6b6c6f72726f6f7171706f6e6d6c98b498986d6d7f7f806c6c6d6d6d0e1010b472716f6e6f6f6d6c70747473d0d0d0f8d06f6d98e8e89898986e6f70737676716b696a6d6e6d6e' +
    '716f6e717575726f6e6e6e6f71716e6e71716f6e6e6c6c98989898987e6a6a6b6c6d6d6e6e0c0d0f727272707172726f6c6d707171d0d0d0d06f6c6b6b98b4b4b4b4986d70747775706c6a6b6f706f6f' +
    'b4706d6e70716f6d6e6f6e6e71716f6f72706d6c6c6b6b6e717083836e6d6c6b6b6c6c6e6f0d0d0f806e6f71727473706d6d6f6f6f6fd0d06f6c6c6c6c6e7172d0d0986c6f727371826f6d6d70726f6c' +
    '8a736e6b6c6c6c6d6f706e6b6d6f707274726d6b6b6c6c6f737474727070706e6d6c6e98b4810f0f0e7e8084867371706e6f706e6d6f71726e6d70706d6e7174d0d06e70737371d0d0d06f6d7174726d' +
    '7573706d6c6b6b6c70726e69696d72747472706e6e70707073747472717171706f6f7084986e0e0f0f6e818473716e6d6e71736f6b6c7073707073736e6d6f71d0726f727777d0d0d0707f98b4d0d080' +
    '6f717273726f6b6b6f716f6b696d727371717272727372717070707172716f6f717272718381800f100f8170726f6c6b6d72757069696e73737476746f6c7f6f70706e70d0d0d0d0716f7d98b4d0b498' +
    '6b6e727576726d6c6d6f71706f6f73736f6f717373737272706d6c6f72726f6e727473706f828298100f0f716f6c6a6b6d71736f6a696c70727577756f7f807071706db4d0d0f7f4d0b4b4ebededb4b4' +
    '6a6a6e7375726f6e6d6e717473737574706e6f7275747272706c6b6e7272706f7173726f6e81828486121210836b6a6b6c6e706f6c6b6c6c6f7377756f6c6e727473d0d0d0f7f8f3b4b4b4d0edebebd0' +
    '6b696b71747271716f6e707475757674716f6e71757571706f6d6c6e707198986f707171706e8081b47714110d816c6c6b6b6e70706f6e6d6e73787670986e727475d0d0d0f9fcf7d0b4b4d0b4eab482' +
    '6d6a6a6f72727171706e6f7375747374737170737573706e6f6f6f6e6e6f6e6e6f6f727574706c6c6f731211100f82817f6cb485d0ebb47072767876b4e8b4717273d0d0d0d0fed085b4b4d0d0b46f6f' +
    '6f6c6b6c6f7172706e6e6fb4b47070747574737473706d6e7071706f6e6e6e6f6f70737676726e6c6c6e830f1010100f8384d0d0ecb48471747777d0efeeeed0717171d0d0d0d077716db4d0d0707070' +
    'b46e6b6b6e7375726d6c98b4d0b4717374747575736e6d6f727472706f6e6e6e707072877573706c9880980c0d0e101111d0777775737170707374eef0f2d08772716fb4d0d0d0d06e6b6f7371707172' +
    '856e6b6b6e7477756e6be4ebeed0717071727475726e6d71757674716f6f6e6e6f7285858673706d7f806c0b0b0d0f11121213777674716e6c6e70b4edd08bd0d0706fb4b4d0d0d06d6d717371707273' +
    '6e6b696b6e7276746f6c98eaedb46f6d6f707374716d6e73767674706f70706e6f7287858371706e6c6d6e6e0d0c0d0f1212121172706d6b6b6e706eb48976d0b4d0b4ebebb4d0d071717474706e6f6f' +
    '6a69696b6d7072706e6d6eb4b46e6c6d6f717475716d6f7475747270707272706f7273848298706f6e6d6e70827e0b0e1213110f6e6b696a6c6f706f717575d0d0d0f0eeedeed0d074757573706e6d6b' +
    '6c6b6c6d6f706f6e6f6f70706f6b6b6d70747777739898b4737372717173737170707273b4988371716f6d6e0e7e7f0f1313110e6d6a6a806f6f70717374d0b4b4d0f2f0eff0f0d0747574727172706d' +
    '73716f7073737070717070706e6c6c6c6eb4d0d0b4b498987172727373737271717173757498837274716d6d6e6e6f737512110f0d6c8286b47070717373b498b4d0f2f0f0f2f172727373727375736f' +
    '7875727275757271706d6c6d6e6e6e6c989898b4b4b4b4837070737777747272707073767686857576726e707271727473836f0d0c6c8588867070727474719898d0d0f0f0f2f1b46d6e70717272716f' +
    '777686b48a76726f6c69686b9883706e6b989898e7b472716f70747a7b7874716f6e72767675d07677726f7275741475707f7f7f0a0c85888481b4737777726d98b4efefd0f1d0807b6a6d6e6e6d6d6f',
};

const TERRAIN_TYPE_BY_CODE: Record<string, TerrainType> = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

function decodeElevationHexGrid(elevationHexGrid: string): Uint8Array {
  const expectedLength = TERRAIN_GRID_WIDTH * TERRAIN_GRID_HEIGHT;
  if (elevationHexGrid.length !== expectedLength * 2) {
    return new Uint8Array(expectedLength);
  }

  const bytes = new Uint8Array(expectedLength);
  for (let index = 0; index < expectedLength; index += 1) {
    const byteValue = Number.parseInt(
      elevationHexGrid.slice(index * 2, index * 2 + 2),
      16,
    );
    bytes[index] = Number.isFinite(byteValue) ? byteValue : 0;
  }
  return bytes;
}

const ELEVATION_GRID_BY_MAP_ID = new Map<string, Uint8Array>(
  Object.entries(ELEVATION_HEX_GRID_BY_MAP_ID).map(([mapId, elevationHexGrid]) => [
    mapId,
    decodeElevationHexGrid(elevationHexGrid),
  ]),
);

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': [
    
  ],
  '30cae103-cb06-4791-a21d-241f488189d3': [
    
  ],
  '3498110a-b6f5-41ee-89ec-67203559ed32': [
    287, 288, 361, 362, 367, 440, 442, 448, 519, 520, 521, 522, 600, 601, 602, 682,
    750, 751, 752, 757, 829, 830, 831, 836, 837, 908, 909, 910, 911, 914, 915, 918,
    919, 987, 988, 989, 990, 993, 994, 995, 1000, 1072, 1073, 1074, 1075, 1078, 1079, 1157,
    1158, 1236, 1237, 1239, 1318, 1319, 1320, 1331, 1410, 1490, 1567, 1568, 1646, 1647, 1650, 1729,
    1730, 1809, 1810, 1831, 1832, 1910, 1912, 1989, 1990, 1991, 2070, 2071, 2152, 2153, 2231, 2233,
    2236, 2237, 2313, 2315, 2316, 2317, 2390, 2395, 2396, 2470, 2471, 2472, 2549, 2550, 2551, 2552,
    2627, 2628, 2630, 2631, 2636, 2709, 2710, 2715, 2794, 2795, 2873, 2874, 2875, 2955, 3035, 3113,
    3114, 3115, 3197, 3275, 3276, 3277, 3354, 3355, 3356, 3435,
  ],
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
    64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 80, 117,
    118, 120, 121, 122, 123, 124, 125, 126, 129, 130, 143, 197, 198, 199, 200, 201,
    202, 203, 205, 206, 209, 210, 278, 279, 280, 281, 282, 283, 284, 285, 287, 357,
    359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 436, 437, 441, 442, 444, 446,
    447, 516, 517, 518, 519, 526, 596, 684, 685, 958, 1038, 1119, 1197, 1199, 1276, 1277,
    1278, 1279, 1356, 1357, 1358, 1359, 1360, 1361, 1436, 1437, 1438, 1441, 1516, 1517, 1518, 1521,
    1596, 1597, 1598, 1599, 1602, 1677, 1679, 1681, 1682, 1683, 1757, 1759, 1760, 1761, 1762, 1836,
    1837, 1838, 1842, 1917, 1920, 1921, 1922, 1923, 1998, 1999, 2001, 2002, 2003, 2078, 2079, 2082,
    2111, 2112, 2158, 2161, 2162, 2163, 2240, 2241, 2243, 2320, 2321, 2322, 2481, 2561, 2640, 2780,
    2858, 2859, 3039, 3119, 3120, 3199, 3200, 3279, 3479, 3480, 3481, 3483, 3484, 3486, 3487, 3488,
  ],
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': [
    117, 118, 122, 123, 124, 127, 128, 201, 359, 436, 437, 438, 440, 443, 444, 445,
    516, 517, 1198, 1276, 1278, 1356, 1358, 1361, 1362, 1437, 1438, 1441, 1521, 1678, 1758, 1998,
    2078, 2081, 2082, 2157, 2158, 2161, 2162, 2163, 2241, 2243, 2321, 2758, 2832, 2838, 2839, 2840,
    2913, 2919, 2920, 2994, 2998, 2999, 3074, 3076, 3077, 3154, 3155, 3156, 3160, 3232, 3235, 3236,
    3239, 3312, 3315, 3316, 3318, 3319, 3392, 3395, 3396, 3400,
  ],
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': [
    126, 206, 207, 278, 279, 284, 285, 358, 359, 360, 362, 363, 368, 369, 430, 441,
    442, 448, 449, 508, 509, 516, 521, 522, 528, 595, 596, 598, 600, 601, 677, 678,
    681, 765, 766, 831, 841, 844, 846, 910, 911, 919, 920, 923, 924, 927, 1002, 1085,
    1164, 1198, 1276, 1278, 1356, 1358, 1361, 1362, 1437, 1438, 1441, 1478, 1479, 1521, 1678, 1758,
    1761, 1841, 1998, 2078, 2081, 2082, 2157, 2158, 2161, 2162, 2163, 2241, 2243, 2321, 2832, 2838,
    2839, 2913, 2919, 2920, 3074, 3076, 3077, 3154, 3155, 3156, 3236, 3239, 3315, 3316, 3318, 3319,
    3395, 3400,
  ],
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': [
    
  ],
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': [
    
  ],
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': [
    117, 118, 121, 124, 127, 128, 197, 202, 203, 359, 360, 1356, 1357, 1438, 2081, 2162,
    2163, 2241, 2321, 2758, 2838, 2839, 2840, 2919, 2920, 2994, 2998, 2999, 3074, 3076, 3154, 3155,
    3156, 3232, 3234, 3235, 3236, 3312, 3318, 3319, 3395, 3396, 3400,
  ],
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': [
    
  ],
  'random-frontier-01': [
    77, 78, 157, 158, 399, 478, 556, 557, 558, 559, 637, 638, 639, 718, 719, 799,
    1174, 1253, 1254, 1333, 1334, 1515, 1593, 1594, 1673, 1674, 1753, 1754, 1975, 1976, 1981, 1982,
    2056, 2061, 2062, 2550, 2551, 2555, 2556, 2557, 2629, 2630, 2631, 2636, 2637, 2638, 2709, 2710,
    2711, 2717, 2773, 2781, 2790, 2852, 2860, 2861, 2862, 2939, 2940, 2941, 2970, 2971, 2972, 3020,
    3051, 3052, 3107, 3108, 3186, 3187, 3188, 3189, 3266, 3267, 3268, 3269, 3270, 3346, 3347, 3348,
    3349, 3350, 3427, 3428, 3429, 3430, 3506, 3507, 3509,
  ],
};

const CITY_CELL_INDEXES_BY_MAP_ID: Record<
  string,
  Record<Team, number[]>
> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': {
    RED: [
      679, 680,
    ],
    BLUE: [
      2759, 2760, 2839, 2840, 2919, 2920,
    ],
  },
  '30cae103-cb06-4791-a21d-241f488189d3': {
    RED: [
      568, 648,
    ],
    BLUE: [
      2871, 2872,
    ],
  },
  '3498110a-b6f5-41ee-89ec-67203559ed32': {
    RED: [
      2411, 2412, 2491, 2492, 2571, 2572,
    ],
    BLUE: [
      946, 947, 948, 1026, 1027, 1028,
    ],
  },
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': {
    RED: [
      405, 406,
    ],
    BLUE: [
      2869, 2949,
    ],
  },
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': {
    RED: [
      727,
    ],
    BLUE: [
      2871, 2872,
    ],
  },
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': {
    RED: [
      568, 648,
    ],
    BLUE: [
      2871,
    ],
  },
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': {
    RED: [
      2411, 2412, 2491, 2492, 2571, 2572,
    ],
    BLUE: [
      866, 867, 946, 947, 948, 1026, 1027, 1028,
    ],
  },
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': {
    RED: [
      2411, 2412, 2491, 2492, 2572,
    ],
    BLUE: [
      867, 946, 947, 948, 1026, 1027, 1028,
    ],
  },
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': {
    RED: [
      1607, 1608, 1609, 1687, 1688, 1767, 1768, 1847, 1848, 1849,
    ],
    BLUE: [
      1670, 1671, 1672, 1751, 1752, 1831, 1832, 1910, 1911, 1912,
    ],
  },
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': {
    RED: [
      1479, 1480, 1559, 1560, 1639, 1640,
    ],
    BLUE: [
      2839, 2840, 2919, 2920,
    ],
  },
  'random-frontier-01': {
    RED: [
      1773, 1774, 1853, 1854,
    ],
    BLUE: [
      1827, 1828, 1907, 1908,
    ],
  },
};

const NEUTRAL_CITY_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': [
    
  ],
  '30cae103-cb06-4791-a21d-241f488189d3': [
    
  ],
  '3498110a-b6f5-41ee-89ec-67203559ed32': [
    293, 294, 295, 373, 374, 375, 434, 435, 453, 454, 455, 514, 515, 584, 585, 664,
    665, 744, 745, 764, 765, 766, 844, 845, 846, 925, 1232, 1233, 1312, 1313, 1392, 1393,
    2225, 2226, 2305, 2306, 2362, 2363, 2364, 2442, 2443, 2444, 2586, 2587, 2588, 2666, 2667, 2668,
    2746, 2747, 2748, 2850, 2851, 2852, 2930, 2931, 2932, 2995, 2996, 2997, 3010, 3011, 3012, 3075,
    3076, 3077,
  ],
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': [
    2729, 2809, 2888,
  ],
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': [
    568, 648,
  ],
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': [
    
  ],
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': [
    293, 294, 295, 373, 374, 375, 434, 435, 453, 454, 455, 514, 515, 584, 585, 586,
    664, 665, 666, 744, 745, 746, 764, 765, 766, 844, 845, 846, 1232, 1233, 1312, 1313,
    1392, 1393, 2362, 2363, 2364, 2442, 2443, 2444, 2586, 2587, 2588, 2666, 2667, 2668, 2746, 2747,
    2748, 2850, 2851, 2852, 2930, 2931, 2932, 2995, 2996, 2997, 3010, 3011, 3012, 3075, 3076, 3077,
  ],
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': [
    293, 294, 295, 373, 374, 375, 434, 435, 453, 454, 455, 514, 515, 584, 585, 586,
    664, 665, 666, 744, 745, 746, 764, 765, 766, 844, 845, 846, 1232, 1233, 1312, 1313,
    1392, 1393, 2225, 2226, 2305, 2306, 2362, 2363, 2364, 2385, 2386, 2442, 2443, 2444, 2586, 2587,
    2588, 2666, 2667, 2668, 2746, 2747, 2748, 2850, 2851, 2852, 2930, 2931, 2932, 2995, 2996, 2997,
    3010, 3011, 3012, 3075, 3076, 3077,
  ],
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': [
    
  ],
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': [
    
  ],
  'random-frontier-01': [
    1080, 2519,
  ],
};

const CITY_ANCHOR_BY_MAP_ID: Partial<Record<string, Record<Team, GridCoordinate>>> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': { RED: { col: 40, row: 8 }, BLUE: { col: 40, row: 35 } },
  '30cae103-cb06-4791-a21d-241f488189d3': { RED: { col: 8, row: 8 }, BLUE: { col: 72, row: 35 } },
  '3498110a-b6f5-41ee-89ec-67203559ed32': { RED: { col: 12, row: 31 }, BLUE: { col: 67, row: 12 } },
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': { RED: { col: 6, row: 5 }, BLUE: { col: 69, row: 36 } },
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': { RED: { col: 7, row: 9 }, BLUE: { col: 72, row: 35 } },
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': { RED: { col: 8, row: 8 }, BLUE: { col: 71, row: 35 } },
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': { RED: { col: 12, row: 31 }, BLUE: { col: 67, row: 11 } },
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': { RED: { col: 12, row: 31 }, BLUE: { col: 67, row: 11 } },
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': { RED: { col: 8, row: 22 }, BLUE: { col: 71, row: 22 } },
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': { RED: { col: 40, row: 19 }, BLUE: { col: 40, row: 36 } },
  'random-frontier-01': { RED: { col: 14, row: 23 }, BLUE: { col: 68, row: 23 } },
};

const NEUTRAL_CITY_ANCHORS_BY_MAP_ID: Record<string, GridCoordinate[]> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': [
    
  ],
  '30cae103-cb06-4791-a21d-241f488189d3': [
    
  ],
  '3498110a-b6f5-41ee-89ec-67203559ed32': [
    { col: 25, row: 8 },
    { col: 27, row: 33 },
    { col: 33, row: 16 },
    { col: 35, row: 6 },
    { col: 36, row: 38 },
    { col: 43, row: 30 },
    { col: 45, row: 10 },
    { col: 51, row: 36 },
    { col: 54, row: 4 },
    { col: 66, row: 28 },
  ],
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': [
    { col: 8, row: 36 },
    { col: 9, row: 35 },
  ],
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': [
    { col: 8, row: 8 },
  ],
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': [
    
  ],
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': [
    { col: 25, row: 8 },
    { col: 27, row: 33 },
    { col: 33, row: 16 },
    { col: 35, row: 6 },
    { col: 36, row: 38 },
    { col: 43, row: 30 },
    { col: 45, row: 10 },
    { col: 51, row: 36 },
    { col: 54, row: 4 },
  ],
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': [
    { col: 25, row: 8 },
    { col: 27, row: 33 },
    { col: 33, row: 16 },
    { col: 35, row: 6 },
    { col: 36, row: 38 },
    { col: 43, row: 30 },
    { col: 45, row: 10 },
    { col: 51, row: 36 },
    { col: 54, row: 4 },
    { col: 66, row: 28 },
  ],
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': [
    
  ],
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': [
    
  ],
  'random-frontier-01': [
    { col: 39, row: 31 },
    { col: 40, row: 13 },
  ],
};

const MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(MOUNTAIN_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

const CITY_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Record<Team, Set<number>>>(
  Object.entries(CITY_CELL_INDEXES_BY_MAP_ID).map(([mapId, byTeam]) => [
    mapId,
    {
      RED: new Set<number>(byTeam.RED),
      BLUE: new Set<number>(byTeam.BLUE),
    },
  ]),
);

const NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID = new Map<string, Set<number>>(
  Object.entries(NEUTRAL_CITY_CELL_INDEXES_BY_MAP_ID).map(([mapId, indexes]) => [
    mapId,
    new Set<number>(indexes),
  ]),
);

function getActiveMapId(): string {
  return GAMEPLAY_CONFIG.map.activeMapId;
}

function getFallbackMapId(): string {
  return GAMEPLAY_CONFIG.map.availableMapIds[0];
}

function getGridCellFromWorld(x: number, y: number): GridCoordinate {
  const cellWidth = GAMEPLAY_CONFIG.map.width / TERRAIN_GRID_WIDTH;
  const cellHeight = GAMEPLAY_CONFIG.map.height / TERRAIN_GRID_HEIGHT;
  const colBasis = x / cellWidth - 0.5;
  const rowBasis = y / cellHeight - 0.5;
  return {
    col: Math.max(0, Math.min(TERRAIN_GRID_WIDTH - 1, Math.round(colBasis))),
    row: Math.max(0, Math.min(TERRAIN_GRID_HEIGHT - 1, Math.round(rowBasis))),
  };
}

function getDefaultTeamCityGridCoordinate(team: Team): GridCoordinate {
  const spawn = team === 'RED' ? GAMEPLAY_CONFIG.spawn.red : GAMEPLAY_CONFIG.spawn.blue;
  const rawX =
    team === 'RED'
      ? spawn.x - GAMEPLAY_CONFIG.cities.backlineOffset
      : spawn.x + GAMEPLAY_CONFIG.cities.backlineOffset;
  return getGridCellFromWorld(rawX, spawn.y);
}

function getActiveMountainCellIndexSet(): Set<number> {
  const activeSet = MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }

  return MOUNTAIN_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ?? new Set<number>();
}

function getActiveTerrainCodeGrid(): string {
  const activeGrid = TERRAIN_CODE_GRID_BY_MAP_ID[getActiveMapId()];
  if (activeGrid) {
    return activeGrid;
  }

  return TERRAIN_CODE_GRID_BY_MAP_ID[getFallbackMapId()] ?? '';
}

function getActiveElevationGrid(): Uint8Array {
  const expectedLength = TERRAIN_GRID_WIDTH * TERRAIN_GRID_HEIGHT;
  const activeGrid = ELEVATION_GRID_BY_MAP_ID.get(getActiveMapId());
  if (activeGrid && activeGrid.length === expectedLength) {
    return activeGrid;
  }

  const fallbackGrid = ELEVATION_GRID_BY_MAP_ID.get(getFallbackMapId());
  if (fallbackGrid && fallbackGrid.length === expectedLength) {
    return fallbackGrid;
  }

  return new Uint8Array(expectedLength);
}

function getActiveCityIndexSetByTeam(): Record<Team, Set<number>> {
  const activeSet = CITY_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }
  return (
    CITY_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ?? {
      RED: new Set<number>(),
      BLUE: new Set<number>(),
    }
  );
}

function getActiveNeutralCityIndexSet(): Set<number> {
  const activeSet = NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID.get(getActiveMapId());
  if (activeSet) {
    return activeSet;
  }

  return (
    NEUTRAL_CITY_CELL_INDEX_SET_BY_MAP_ID.get(getFallbackMapId()) ??
    new Set<number>()
  );
}

export function getGridCellIndex(col: number, row: number): number {
  return row * TERRAIN_GRID_WIDTH + col;
}

export function getGridCellTerrainType(col: number, row: number): TerrainType {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return 'unknown';
  }

  const terrainCode = getActiveTerrainCodeGrid().charAt(getGridCellIndex(col, row));
  return TERRAIN_TYPE_BY_CODE[terrainCode] ?? 'unknown';
}

export function getGridCellElevation(col: number, row: number): number {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return 0;
  }

  const elevationByte = getActiveElevationGrid()[getGridCellIndex(col, row)] ?? 0;
  return elevationByte / 255;
}

export function getGridCellHillGrade(col: number, row: number): number {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return HILL_GRADE_NONE;
  }

  if (getGridCellTerrainType(col, row) !== 'hills') {
    return HILL_GRADE_NONE;
  }

  const elevationByte = getActiveElevationGrid()[getGridCellIndex(col, row)] ?? 0;
  return getHillGradeFromElevationByte(elevationByte);
}

export function getGridCellPaletteElevationByte(col: number, row: number): number {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return 0;
  }

  const terrainType = getGridCellTerrainType(col, row);
  const hillGrade = getGridCellHillGrade(col, row);
  return getTerrainPaletteElevationByte(terrainType, hillGrade);
}

export function getWorldTerrainType(x: number, y: number): TerrainType {
  const cell = getGridCellFromWorld(x, y);
  return getGridCellTerrainType(cell.col, cell.row);
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

export function isGridCellTeamCity(col: number, row: number, team: Team): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveCityIndexSetByTeam()[team].has(getGridCellIndex(col, row));
}

export function isGridCellNeutralCity(col: number, row: number): boolean {
  if (
    col < 0 ||
    row < 0 ||
    col >= TERRAIN_GRID_WIDTH ||
    row >= TERRAIN_GRID_HEIGHT
  ) {
    return false;
  }

  return getActiveNeutralCityIndexSet().has(getGridCellIndex(col, row));
}

export function getTeamCityGridCoordinate(team: Team): GridCoordinate {
  const activeAnchors = CITY_ANCHOR_BY_MAP_ID[getActiveMapId()];
  if (activeAnchors) {
    return activeAnchors[team];
  }

  const fallbackAnchors = CITY_ANCHOR_BY_MAP_ID[getFallbackMapId()];
  if (fallbackAnchors) {
    return fallbackAnchors[team];
  }

  return getDefaultTeamCityGridCoordinate(team);
}

export function getNeutralCityGridCoordinates(): GridCoordinate[] {
  const activeAnchors = NEUTRAL_CITY_ANCHORS_BY_MAP_ID[getActiveMapId()];
  if (activeAnchors) {
    return activeAnchors.map((anchor) => ({ ...anchor }));
  }

  const fallbackAnchors = NEUTRAL_CITY_ANCHORS_BY_MAP_ID[getFallbackMapId()];
  if (fallbackAnchors) {
    return fallbackAnchors.map((anchor) => ({ ...anchor }));
  }

  return [];
}
