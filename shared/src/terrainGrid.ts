import { GAMEPLAY_CONFIG } from './gameplayConfig.js';

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
    'gwwwwwwwwwwwhhgghhhfhhhhhhhfhhhhhggggggggggggggggggggggggggggffffgffggffgfggfffg' +
    'gwwwwwwwwwwwwhfgghhfhhhhhhhhhhhhfgggggggggggggggggggggggggggffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwhgghhhhhhhhhhhhhhggggggggggggggggggggggggggggfffffffffffffgffgfgfg' +
    'gwwwwwwwwwwwwwhgghfhhhhhhgggggggggggggggggggggggggggggggggffffffgfffffffgffgffgg' +
    'ghwwwwwwwwwwwwhghhhhhhggggggggggggggggggggggggggggggggggggfgffffgfffffggggfffffg' +
    'gghhgwwwwwwwwwhghhhhhggggggggggggggggggggggggggggggggggggggggggfgggfgggggffffffg' +
    'ggggfhhhwwwwwwhfhhhhhfgggggggggggggggghffhgggggggggggggggggggggggggfgggggfgffffg' +
    'ggggggghhwwwwwhghhhggggggggggggggggggghhhhgggggggggggggggggggggggggggggggffffgfg' +
    'ggggggggghwwwwwgfhfggggggggggggggggggghffhgggggggggggggggggggggggggggggggffgfffg' +
    'ggggggggghwwwwwwhhggggggggggggggggggggggggggggggggggggggghhhhgggggggggggggfggfgg' +
    'gggggggggghwwwwwwwwhhggggggggggggggggggggggggggggggggggghhhhhgggggggggggggffgfhg' +
    'gggggggggghwwwwwwwwwfhgggggggggggggggggggggggggggggggggghhhhhhfggggggggggfffgghg' +
    'gggggggggghwwwwwwwwwwhgggggggggggggggggggggggggggggggfhhhhhhhhhggggggggggfffgghg' +
    'ggggggggggghwwwwwwwwwwhgggggggggggggggggggggggggggggfhhhhhhhhhhgggggggggfffffhhg' +
    'ggggggggggghhwwwwwwwwwhggggggggggggggggggggggfggggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhgggggggggggggggggggfhhwfhhhhhghhgggghhhhhhfgggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhgggggggggggggggghhhwwwwwwwwwwhggfgffghhhhhfgggggggggghhhg' +
    'gggggggggggfwwwwwwwwwwhgggggggggggggghhfwwwwwwwwwwwwwhggfffffhhhhggggggggggghfhg' +
    'gggggggggggghwwwwwwwwwwhggggggggggggfhwwwwwwwwwwwwwwwhfffffffffhhggggggggggghhhg' +
    'ghgggggggggghwwwwwwwwwwwhggggggggggfhwwwwwwwwwwwwwwwwhgffffffggggggggggggggghhhg' +
    'ghhgggggggggghfwwwwwwwwwwhhgggggghhwwwwwwwwwwwwwwwwwwhgffgggfhhfgggggggggggghhhg' +
    'ghhhggggggggggfhfghfwwwwwwwhhhhhfwwwwwwwwwwwwwwwwwwwwhgfgghhhgfhhhfgggggggggghhg' +
    'ghhhgggggggggggggggfffhwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwhggfhwwwwwwwwhhgggggggggghg' +
    'ghhhggggggggggghhffffffgwwwwwwwwwwwwwwwwhhhhhhfwwwwwwwhhhwwwwwwwwwwfhggggggggggg' +
    'ghfhggggggggggghhhhfffffgwwwwwwwwwwwwwwhhggggghhwwwwwwwwwwwwwwwwwwwwhggggggggggg' +
    'ghhhggggggggggfhhhhhgffgffhwwwwwwwwwwwhhggggggghwwwwwwwwwwwwwwwwwwwwffgggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfhwwwwwwwfhhgggggggggfwwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhghhwwwhhfgggggggggggghwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhhffffggggggggghhhhhhhhhhfgggfhfgggggggggggggghhwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghggfffgggggggggghhhfhhhhhggggggggggggggggggggggghfwwwwwwwwfhwwwwwwwwfgggggggggg' +
    'ghggfffggggggggggfhhhfhhgggggggggggggggggggggggggghwwwwwfhhhhhhhwwwwwfgggggggggg' +
    'ghfgffggggggggggggfhhhhgggggggggggggggggggggggggggghhhfhhggggggfwwwwwhgggggggggg' +
    'ggffgfggggggggggggghhhhgggggggggggggggggggggggggggggfhgggggggggghwwwwhgggggggggg' +
    'gfffgffggggggggggggggggggggggggggggggghhhhggggggggggggggggggghgghhwwwhgggggggggg' +
    'gffffffggggggggggggggggggggggggggggggghhhhggggggggggggggggggghhfghwwwwgggggggggg' +
    'gffffgfggggggfgggggggggggggggggggggggghhhhgggggggggggggggggghhhhghwwwwhggggggggg' +
    'gfffffffgggfffggggfgfgggggggggggggggggffffggggggggggggggggghhhhhghwwwwhfgggggggg' +
    'gfffffffffgfgffgfffggffffggggggggggggggggggggggggggggggggghhhhhhghwwwwwhhggggggg' +
    'gffffffffffffgfffffffffgggggggggggggggggggggggggggggggghhhhhhfhgghwwwwwwwhgggggg' +
    'gfffgfgffffffffffffffgfggggggggggggggggggggggggggghhhhhhhhhhhhhgghwwwwwwwwhggggg' +
    'gffffffffffffffgfffffgfgggggggggggggggggggggggggghhhhhhhhhhhhhhggghwwwwwwwfhgggg' +
    'gffgfgffffffffffffgffffggggggggggggggggggggggggghhhhhfhhhhhhhhhfggfhwwwwwwwfhggg' +
    'ggggghgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  '30cae103-cb06-4791-a21d-241f488189d3':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwwgfffffffffffffffffffggggwwwwwwwwwgfgffgggwwwwwggffffgffggffgfggfffg' +
    'gwwwwwwwwwwwwwgggfffffffffffffffggggfwwwwwwwwffggffgwwwwwwwgffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwwggffffffffffggffggggffwwwwwwwfgffffgwwwwwwwgfffffffffffffgffgfgfg' +
    'gwwwwwwwwwwwwwwggffffffgfggggggggggfffggwwwwgfgffggwwwwwfgffffffgffffffffffgffgg' +
    'gwwwwwwwfggwwwwgffffffgggggggggggggfggggwwwfgffgggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwggggggwwwgfffffgggggggggggggggfffggggfgfffgwwwwwwggggggggfgggfgggggffffffg' +
    'gwwwwwgghhggwwggffffgggggggggggggggfffffgfgfffggwwwwwwwggggggggggggfgggggfgffffg' +
    'gwwwwwgghhggwwggfffgghgggggghhhggghggfffffffffggwwwwwwwggggggggggggggggggffffgfg' +
    'gwwwwwghhhhgwwwfgggghgwwwggggggggggggffffffgffgwwwwwwwwggggggggggggggggggffgfffg' +
    'gwwwwwwgggghggwwggghgwwwwwgggggggggggggfffgggggwwwwwwfggggfgggggggggggggggfggfgg' +
    'gwwwwwwwwggghhgffghggwwwwwwwgggggggghggffgggggwwwwwwwggggfgffgggggggggggggffgfgg' +
    'gwwwwwwwwwwwggghhhggwwwwwwwwwwwfggggggggggwwwwwggggggggfffffgfgggggggggggfffggfg' +
    'ggwggwwwwwwwwgggggwwwwwwwwwwwwwwgggggghggwwgggggggggggfffffffffggggggggggfffgffg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgghfwgggggggggggffffgfffffgggggggggffffgffg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwghggggggggggggffffgffffffgggggggggffgfffg' +
    'gfgggggfwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwggggggggggggggfggggggfffffggggggggffgfffg' +
    'gfggggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggghggggggggggffgfgffggffffggggggggggggffg' +
    'gffggggggggwwwwwwwwwwwwwwggggggfwwwwwggggghgggggggfffffgffffggfffggggggggggffffg' +
    'gfgggggggggggwwwwwwwwwwwggfffgggggwwwgggggghgggggfffffgfffffffgffggggggggggggffg' +
    'gffggggggggggwwwwwwwwwwfggffffffggggwfggggghggggfffffggffffffgggggggggggggggfffg' +
    'gfffggggggggggwwwwwwwwggfgffffffffgggwggggghgggfgfffffgffgggggggggggggggggggfffg' +
    'gfffgggggggggggggggggggffgffffffffgggwwgggghgggfffffffgfggwwwwwwwwgggggggggffffg' +
    'gfffgggggggggggggggffffffggfffffgggggwwwwfgggggfgffffgggwwwwwwwwwwwggggggggggffg' +
    'gffgggggggggggggfgfffffffgffffffggggwwwwwghgwwggggffffggwwwwwwwwwwwgggggggggggfg' +
    'gfffgggggggggggfffggffffggffffggggwwwwwwwghgwwwwgggggggwwwwwwwwwwwwwwggggggggffg' +
    'gffggggggggggggffffggffgfgffggggwwwwwwwwwggfwwwwwfgggggwwwwwwwwwwwwwwwgggggggffg' +
    'gffggffggggggggfffffggggggfggggwwwwwwwwwghgwwwwwwwwfgwwwwwwwwwwwwwwwwwwwfgggggfg' +
    'ggffgffgggggggggffgffgggfffggggwwwffggggghgggwwwwwwwwwwwwwwwwffffwwwwwwwwwwggggg' +
    'gfffffffgggggggggffffffffgfgggwwwgggggghghggggwwwwwwwwwwwwwggggggggwwwwwwwwggggg' +
    'gfggfffggggggggggfffgfffffggggwwggghgggggghggggggwwwwwwwwgghhhggghgggwwwwwwfgfgg' +
    'gfggfffgggggggggggffffffgggffwwwgggggggfgggghggggggwwwwggghgffwwfgghggwwwwwwwwwg' +
    'ggfgffggggggggggggfffffggwwwwwwgggggfffffggggghhggggwwgghggwwwwwwwwghggggwwwwwwg' +
    'ggffgfggggggggggggggfgfgfwwwwfghhgggffffffffgggghhgggghhggwwwgggwwwgghggggwwwwwg' +
    'gfffgffgggggggggggggggggggghhhgggggffffffffffggggggggggfwwwfggggwwwwgghffgwwwwwg' +
    'gffffffgggggggggggghhhhhhgggfgggfgfffffffgffgfgggggggggwwggggffgfwwwwghhhgwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwggfffffffggggfffgggggggggggggggffffgwwwwghffgfwwwwg' +
    'gfgfffffgggfffggggfgfgggggwwwggfffffggfwwwfffgggggggggggggggfffggwwwwgggggwwwwwg' +
    'gfffffffffgfgffgfffggffffgwwwwgfffgggfwwwwggggggggggggggggfffffggwwwwwwfwwwwwwwg' +
    'gffffffffffffgfffffffffggwwwwwgffffwwwwwwfggggggggggggggggfffffggwwwwwwwwwwwwwwg' +
    'gfffgfgffffffffffffffgfggwwwwgfffgwwwwwwwwggggggggffffgffffffffggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgfffwwwwwwwwwwggggggfffffgfffffffgfggwwwwwwwwwwwwwg' +
    'gffgfgffffffffffffgffffgwwwwwgffgwwwwwwwwwfgggggffffffffffffffffffgwwwwwwwwwwwwg' +
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf':
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmg' +
    'mffgfffffffgfhgghhhfhhhhhhhfhhhhhgggfmmmmmmmmmmmgmmfhhhhgggggffffgffggffgfggfffg' +
    'mffffgfffffffgggghhfhhhhhhhhhhhhfgggfmmmmmmmfmmffmmhhhhhggfgffffffffffffffgfgffg' +
    'gfffggggfffffghgghhhhghhhhhhhhhgggggggmmmmmmmmwmfhhhhhhggfgfffffffffffffgffgfgfh' +
    'mwffghhhgggggghgghfhhhhhhggggggggggggmmmmmmmmmmmmhhhhhggfgffffffgffffffffffgffgh' +
    'gffgghhhgggggghghhhhhhggggggggggggggmmgfmmmgmmmmhhhhgggfggfgffffgfffffggggfffffh' +
    'gffggffhggggghhghhhhhfgggghhggggghhhgmmmhhhhhfmhhhhggggmgggggggfgggfgggggffffffh' +
    'gfffggggggfghhgfhhhhhfgghhhhhhhhhhhhmmhhffmhfhhhhhgggggggggggggggggfgggggfgffffg' +
    'gfffgfgggggghhgghhhgggghhhhhhhhhhhhhhhhhffhmmmhhgggggggggggggggggggggggggffffgfh' +
    'gffffgfgfggghhggfhfggghhhhhhhhhhhhhhhhhhhhhhhhhgggggggfggggggggggggggggggffgfffh' +
    'gffgggfgggggghhgggghhhhhhhhhhhhhhhhhhhhhgggghggggggggfggggggggggggggggggggfgmfgh' +
    'gwwwwwgfgggggghhhhhhhhhggggggggghhhhhhhgggggggggffggggggggggggggggggggggggffgffg' +
    'gwwwwwwgggggggggghhhhggggggffffggghhhggggggfffmggggggggggggggggggggggggggffmggmh' +
    'ggfggwwfggggggggggggggggffffffgfggggggggggfggggggggghhhhgggggggggggggggggfffggfm' +
    'mggggfwwfggggggggggggggfffgfwwgfffgggggggwgghhhghhhhhhhhggggggggggggggggfffffmgm' +
    'ggggggwwwwfggffggggggggfgfwwwwwffgffggggggghhfhhhhhhhhhfgggggggggggggggggffgmmmm' +
    'gggggggwwwwwfgfggggggfffmwwwfwwwwgggggfgghhhhhhhhhhhhhgfgggggggggggggggggffgmmmm' +
    'gmgggggggfwwwffffggfffggwwwgggwwwwwfgggghhhhhhhhhhhhhggfgffgggggggggggggggggmmgg' +
    'gmgggggggggwwwgffffffgfwwwgghhgfwwwwwgghhhfhhhhhhhhhhffgffffggggggggggggggggmmmg' +
    'gmggggggggggwwwgfggffwwwwgghhhhgggwwwgghhhhhhhhhhhhhgfgfffffffggggggggggggggmmmm' +
    'gfmggggggggggwwwffffwwwfgghhhhhhgggwwwghhhhhhhhfhhhhhffffffffgggggggggggggggfmmm' +
    'gmmmgggggggggmwwwwwwwwggfghhhhhfhhgfwwgghhhggghhfhhhhfffffgggffwffggggggggggfmgm' +
    'gmmfgggggggggggffwwwfggffghhhhhhhhggwwwgggffgfghhhhhhggfggffwwwwwwwgggggggggmmmg' +
    'mgmfgggggggggggggggffffffghhhhhhhhggfwwgggfffffghhhhhgfggwwwwwfffwwwgggggggggmfg' +
    'mmmmggggggggggggggfffffffghhhhhhhggggwwwwfmgfgffgghhhgfgfwwffggggfwwggggggggggmm' +
    'gmmmggggggggggggggggffffgghfhhhhggfgggwwwwwwwwggfffggffgwwfgggggggwwfgggggggggmm' +
    'mmmmgggggggggggggggggffgfghhhhgmmgffffgwwwwwwwwfggffffgfwwggggggggwwwgggggggggmg' +
    'gmmmgffggggggggggggggggghhhhhhggffgfffffggggmwwwwwfgggfwwfgggggggfgwwwgggggggggg' +
    'gmmmgffggggggggggggghhhhhfhhhhggffffffgffffffffwwwwwwwwwwgggggggggggwwwwgggggggg' +
    'mmmfffffggggggggggghhfhhhhhhhgfgffffffffffffffgggfwwwwwfgwwwwggggggggwwwwggggggg' +
    'mfggfffggggggggggghhhhhhhhhhgggffffffffffgfffggwwfggfggmwwgwwgfggggggggwwwgggggg' +
    'gmggfffgggggggggghhhhhhhhhgffggfffffgfffggggggmwwwwwwwwwgwwwwgggggggggggwwwfffwg' +
    'gmfgffgggggggggghhhhhhhhgfgggfggfggffgggggggggwwwwwwwwwwwwwwwfgggggggggggwwwwwwg' +
    'ggffgfggfffggggghhhffhhgfggggfgggggggggggggggwwwmwwwwwwwwwgwggggggggggggggffwwfg' +
    'gffffffgfhfggggghhhhhhhgfggggggggggggggggggggwwwwwwwwwwwwwwgmgggggggggggffggggfg' +
    'gffffffgfhfggggghhhgggggfggggggggggggggggggggwmwwwfwwwfwwwgmggggggggfhfgffgfgffg' +
    'gffffgfghhhggfgggggggggggfggggggggggggggggggwfwmwwwwmwwwmwmfggggggggfhfgffffgffm' +
    'gfffffffgggfffggggfgfggggggggggggggggggggggmwwwgwwmwwwwwwwffgggggggghgfgfffffffg' +
    'gffffffffwgfgffgfffggmfffgggggggggggggggggfwwwwwwwwwwwwwwwwggggggggggggffgffffgg' +
    'gffffwfffffffgfffffffffggfgggggggggggggmwwwwwwwwwwwgwwwwwwwgfggggfgffffffgffffgm' +
    'gfffgfgffffffffffffffgfgggggggggggggggwwwwmwwmwwwmwwwwwwwggfggggffffgfgffffffgfm' +
    'gffffffffffffffgfffffgfgfggggggggggggmwwwwwwwwwwwwwwwwwwgfgggggffggffffffffffffg' +
    'mffgfgfffffffffffffffffggggggggggggggwwwmwwwwwwwgwwwwwwmgggggggffffffgfgffgffggg' +
    'gggmgmmmmmgmmmmmmgggghgggggggggggggggmgmgmggmmmmmgmggggmgggggggggggggggggggggggg',
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwwggghhhfhhhhhhhfhhhhhgggfmmmmmmmmmmmmmmfggwwwwwggffffgffggffgfggfffg' +
    'gwwwwwwwwwwwwwggghhfhhhhhhhhhhhhfgggfmmmmmmmfmmffmmgwwwwwwwgffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwwgghhhhghhhhhhhhhgggggggmmmfmmmfwmmggwwwwwwwgfffffffffffffgffgfgfg' +
    'gwwwwwwwwwwwwwwgghfhhhhhhgggggggggggggfmmmmmmmmmmggwwwwwfgffffffgffffffffffgffgg' +
    'gwwwwwwwfggwwwwghhhhhhggggggggggggggmmmfmmmmmmmmggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwggggggwwwghhhhhfggggggggggggggmmmmgggggfmggwwwwwwggggggggfgggfgggggffffffg' +
    'gwwwwwgfhhggwwgfhhhhhfggggggggggggggmmggffmgfgggwwwwwwwggggggggggggfgggggfgffffg' +
    'gwwwwwgfhhggwwgghhhgghgggggghhhgghhgggggffggmmggwwwwwwwggggggggggggggggggffffgfg' +
    'gwwwwwghhhhgwwwffhgghgwwwggggggggghggggggggggggwwwwwwwwggggggggggggggggggffgfffg' +
    'gwwwwwwgggghggwwggghgwwwwwgggggggggggggggggggggwwwwwwfggghhhhgggggggggggggfggfgg' +
    'gwwwwwwwwggghhgffghggwwwwwwwgggggggghgggggggggwwwwwwwggghhhhhgggggggggggggffgfmg' +
    'gwwwwwwwwwwwgghhhhggwwwwwwwwwwwfggggghggggwwwwwggggggggghhhhhhfggggggggggfffggmg' +
    'ggwggwwwwwwwwgggggwwwwwwwwwwwwwwgggggghggwwggggggggggfhhhhhhhhhggggggggggfffggfg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgghfwggggggggggfhhhhhhhhhhgggggggggffffwmmg' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwghgggggggggggghhhhhhhhhfhgggggggggffgmmmg' +
    'gggggggfwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwgggggggggggggghhgggghhhhhhfgggggggffgmmmg' +
    'gmmgggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggghggggggggghhhgfgffghhhhhfggggggggggmmmg' +
    'gmgggggggggwwwwwwwwwwwwwwggggggfwwwwwggggghggggggghhhhfgfffffhhhhgggggggggggmmmg' +
    'gmgggggggggggwwwwwwwwwwwggghfgggggwwwgggggghgggghhhhhhgffffffffhhgggggggggggmmmg' +
    'gfmggggggggggwwwwwwwwwwfggghhfhhhfggwfggggghggghhhhhhhgffffffgggggggggggggggfmmg' +
    'gmmmggggggggggwwwwwwwwggfghhhhghhhgggwggggghgghhhhhhhhgffgggggggggggggggggggfmmg' +
    'gmmfgggggggggggggggggggffghhhhhhhhgggwwgggghgghhhghhhhgfggwwwwwwwwggggggggggmmmg' +
    'gmmfgggggggggggggggffffffghhhhhhhggggwwwwwggggfhhhfhhfggwwwwwwwwwwwggggggggggmfg' +
    'gmmmggggggggggghhffffffffghhhhhhggggwwwwwghgwwgggggfhmggwwwwwwwwwwwgggggggggggmg' +
    'gmmmggggggggggghhhhfffffgfhhhhggggwwwwwwwghgwwwwgggggggwwwwwwwwwwwwwwgggggggggmg' +
    'gmmmggggggggggfhhhhhgffgfghhhgggwwwwwwwwwggfwwwwwfgggggwwwwwwwwwwwwwwwgggggggmmg' +
    'gmmmgffgggggggfhhhhhhgggghhggggwwwwwwwwwghgwwwwwwwwfgwwwwwwwwwwwwwwwwwwwfggggggg' +
    'gmmmgffggggggggghfhhhhhhhhhggggwwwfmggggghgggwwwwwwwwwwwwwwwwwfwfwwwwwwwwwwggggg' +
    'gmmfffffggggggggghhhhhhhhhhfggwwwgggggghghggggwwwwwwwwwwwwwggggggggwwwwwwwwggggg' +
    'gfggfffgggggggggghhhfhhhhhfgggwwggghgggggghggggggwwwwwwwwgghhhggghgggwwwwwwfgfgg' +
    'gmggfffggggggggggfhhhhhhgggffwwwghgggggggggghhgggggwwwwggghgfwwwwgghggwwwwwwwwwg' +
    'gmfgffggggggggggggfhhhhggwwwwwwgghgggggggggggghhggggwwgghggwwwwwwwwghggggwwwwwwg' +
    'ggffgfggggggggggggghhhhgfwwwwfghhggggggggggggggghhgggghhggwwwggfwwwgghggggwwwwwg' +
    'gfffgffggggggggggggggggggghhhhhggggggmmggggggggggggggggwwwwfghggwwwwgghffgwwwwwg' +
    'gffffffggggggggggghhhhhhhgggfgggmhwggfmmmggggggggggggggwwgggghhffwwwwghhhgwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwggmmmmgggmmmfgggggggggggggggggghhhhgwwwwghffgfwwwwg' +
    'gfffffffgggfffggggfgfgggggwwwmmmmmmgggmmmmfgggggggggggggggghhhhhgwwwwgggggwwwwwg' +
    'gfffffffffgfgffgfffggffffgwwwwgmmmmfmmmmmmfggggggggggggggghhhhhhmwwwwwwfwwwwwwwg' +
    'gffffffffffffgfffffffffggwwwwwggmmmmmmmfmmmgggggggggggghhhhhhfhggwwwwwwwwwwwwwwg' +
    'gfffgfgffffffffffffffgfggwwwwgggmmmmmmmmfmmfgggggghhhhhhhhhhhhhggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgggmmmmmmmmmmmmggggghhhhhhhghhhhhhgggwwwwwwwwwwwwwg' +
    'gffgfgfffffffffffffffffgwwwwwgmmmmmmmmmfmmmggggghhhhhfhhhhhhhhhfgggwwwwwwwwwwwwg' +
    'ggggghghghgggghggggggggggggggggggggggggggggggggggggggggghggggggggggggggggggggggg',
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1':
    'ggmggggggmggmmgmgggggggggggggggggggggggggggggggmmgggmmgggggggmgggggggggggggggggg' +
    'ghhhhhhhhhhhhhgffffffffffffffffffgggmfggggggggmmgggmmmmmfggggffffgffggffgfggfffg' +
    'ghhhhhhhhhhhhhgggffffmffffffffffgggmmmfffgfmmfmmmmmmmmmmmmggffffffffffffffgfgfgg' +
    'ghhhhhhhhhhhhhhggffffffffffggffggggmmmmmmmwmmmmmmmmmmmmmmggfffffffffffffgffgfgfg' +
    'ghhhhhhhhhhhhhhggffffffgfgggggggggggggmmmmmmmmmmmmmmggfgggffffffgfffffffmffgffgg' +
    'ghhhhhhhhhhhhhhgffffffgggggggfmmmmmfgggggmmmmmwmmmmwmmggggfgffffgfffffggggfffffg' +
    'ghhhhhhhhhhhhgggfffffgggggggmmmmmmmmmmggwmmmwmmwmmfmfmfggggggggfgggfgggggffffffg' +
    'ghhhhhhmhhhhggggffffgggggggggggggggmmmmmmmwmmmmmmggggggggggggggggggfgggggfgffffg' +
    'ghhhhhhghhhhggggfffgghgggggghhhggghggmmmmmmmmwmfmmmggmmggggggggggggggggggffffgfg' +
    'ghhhhhhhhhhhgggggggghggggggggggmfgggggmmggmggmmmwmmmmmmmgggggggggggggggggffgfffg' +
    'ghhhhhhhhhhhggggggghggggggggggmmmmggggggmmmfmmmmmmmmmgggggfgggggggggggggggfggfgg' +
    'gwfhhhhhhhhghhgggghgggggggggggmmfmgghggmmfmmmmwmmmmmmfgggfmffgggggggggggggffgfmg' +
    'gwwwhhhgggggggghhhgggggggggggggggffmghgggfmmmmmmwffggggfffffgfgggggggggggffmggmg' +
    'gwwwfhggggggggggggggggggggggggggmmmmwghgfmwmmmmmmfggggfffffffffggggggggggfffggfg' +
    'gwwwwggggggggggggggggggggggfwfggggmfmmghgggmmmmmmmmggffffgfmfffgggggggggffffwmmg' +
    'ggwwwwggggggggggggggggggwwwwwwwwggggmmgghgmmmmgggmgggffffgffffffgggggggggffgmmmg' +
    'gggfwwwwgggggggggggggggwwwwwwwwwwwggggggggggfmmfmmmmgfggggggfffffggggggggffgmmmg' +
    'gmmgwwwwwwggggggggggggwwwwwwwwwwwwwwggfmghgmmmmwggggffgfgffggffffgggggggggggmmmg' +
    'gmgggwwwwwwwggggggggfwwwwggggggfwwwwggmmmghggmmmggfffffgffffgggffgggggggggggmmmg' +
    'gmggggggwwwwwwwwwwwwwwwwggfffggggwwwwggmmgghgggggfffffgfffffffgffgggggggggggmmmg' +
    'gfmggggggwwwwwwwwwwwwwwgggffffffggwwwgggggghggggfffffggffffffgggggggggggggggfmmg' +
    'gmmmgggggggfwwwwwwwwwgggfgffffffffgwwwggggghgggfgfffffgffmgggmmgggggggggggggfmmg' +
    'gmmfggggggggggggfffggggffgffffffffgwwwwwggghgggfffffffgfgggwwwwwwfggggggggggmmmg' +
    'gmmfgggggggggggggggfffmffggfffffgggwwwwwwwgggggfhffffggggwwwwwwwwwwwmggggggggmfg' +
    'gmmmggggggggggggfgfffffffgffffffggwwwwwwwwhwwwggggffffggwwwwwwwwwwwwwwwwwwggggmg' +
    'gmmmgggggggggggfffggffffggffffgggwwwwwwwwfhwwwwggggggggwwwwwwwwwwwwwwwwwwwwgggmg' +
    'gmmmgggggggggggffffggffgfgffgggwwwwwwwwwwggwwwwwwwgggfwwwwwwwfgfwwwwwwwwwwwwgmmg' +
    'gmmmgffggggggggfffffggggggfggggwwwwwwmggghfwwwwwwwwwwwwwwwfgggggggggmwwwwwwwwggg' +
    'gmmmgffgggggggggffmffmggfffgggwwwwwgggggghgggwwwwwwwwwwwwggggggggggggggggwwwwwgg' +
    'gmmfffffgggggggggffffffffgfggwwwwgggggghghggggwwwwwwwwwfggggggggggggggggghwwwwwg' +
    'gfggfffggggggggggfffgfffffggwwwwggghgggggghgggggfwwwwwggggghhhggghgghhhhhhhfwwwg' +
    'gmggfffgggggggggggffffffgggwwwwwgggggggggggghhgggggggggggghgggggggghhhhhhhhhwwwm' +
    'gmfgffggggggggggggfffffggwwwwwwgghgggggggggggghhgggggggghgggggggggghhhhhhhhhhwwg' +
    'ggffgfggggggggggggggfffgfwwwwmghhggggggggggggggghhgggghhggggggggghhhhhhhhhhhhhhg' +
    'gfffgffgggggggggghggggggfgghhhhggggggmmgggggggggggggggggggggggggghhhhhhffhhhhhhg' +
    'gffffffgggggggggggghhhhhhggfwgggmhfggmmmmggggggggggggggggggggmfgghhhhhhhhhhhhhhg' +
    'gffffgfggggggfgggggggggggwwwwggmmmmgggmmmfggggggggggggggggggffffghhhhhhffhhhhhhg' +
    'gfmfffffgggfffggggfgfgggggwwwgmmmmmgggmmmmfgggggggggggggggggfffgghhhhhhhhhhhhhhg' +
    'gfffffffffgfgffgfffggffffgwwwwgmmmmfmmmmmmfgggggggggggggggfffffghhhhhhhhhhhhhhhg' +
    'gffffffffffffgfffffffffggwwwwwggmmmmmmmfmmmgggggggggggggggfffffghhhhhhhhhhhhhhhg' +
    'gfffgfgffffffffffffffgfggwwwwgggmmmmmmmmfmmfggggggffffgffffffffghhhhhhhhhhhhhhhg' +
    'gffffffffffffffgfffffgfgwwwwwgggmmmmmmmmmmmmgggggfffffgmffffffgfgghhhhhhhhhhhhhg' +
    'gffgfgffffffffffffgffffgwwwwwgmmmmmmmmmfmmmgggggffffffffffffffffffghhhhhhhhhhhhg' +
    'ghgghghhhghggghggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gwwwwwwwwwwwhhgghhhfhhhhhhhfhhhhhggggggggggggggggggggggggggggffffgffggffgfggfffg' +
    'gwwwwwwwwwwwwhfgghhfhhhhhhhhhhhhfgggggggggggggggggggggggggggffffffffffffffgfgfgg' +
    'gwwwwwwwwwwwwwhgghhhhghhhhhhhhhgggggggggggggggggggggghhhgggfffffffffffffgffgfgfg' +
    'gwwwwwwwwwwwwwhgghfhhhhhhgggggggggggggggggggggggggggghhhggffffffgffffffffffgffgg' +
    'ghwwwwwwwwwwwwhghhhhhhgggggggggggghhggggggggggggggggghhhggfgffffgfffffggggfffffg' +
    'gghhgwwwwwwwwwhghhhhhggggggggggggghhgggggggggggggggggggggggggggfgggfgggggffffffg' +
    'ggggfhhhwwwwwwhfhhhhhfgghhhgggggggffgggggggggggggggggggggggggggggggfgggggfgffffg' +
    'ggggggghhwwwwwhghhhggggghhhggggggggggggggggggggggggggggggggggggggggggggggffffgfg' +
    'ggggggggghwwwwwgfhfggggghhhggggggggggggggggghhhggggggggggggggggggggggggggffgfffh' +
    'ggggggggghwwwwwwhhgggggggggggggggggggggggggghhhgggggggggghhhhggggghhhgggggfggfgg' +
    'gggggggggghwwwwwwwwhhggggggggggggggggggggggghhhggggggggghhhhhggggghhhgggggffgfhg' +
    'gggggggggghwwwwwwwwwfhgggggggggggggggggggggggggggggggggghhhhhhfggghhhggggfffgghg' +
    'gggggggggghwwwwwwwwwwhfggggggggggggggggggggggggggggggfhhhhhhhhhggggggggggfffgghg' +
    'ggggggggggghwwwwwwwwwwhgggggggggggggggggggggggggggggfhhhhhhhhhhgggggggggfffffhhg' +
    'ggggggggggghhwwwwwwwwwhggggggggghhfggggggggggfggggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhggggggggghhfgggggggfhhwfhhhhhghhgggghhhhhhfgggggggffgghhg' +
    'gggggggggggghwwwwwwwwwhggggggggghhfgggghhhwwwwwwwwwwhggfgffghhhhhfgggggggggghhhg' +
    'gggggggggggffwwwwwwwwwhgggggggggggggghhfwwwwwwwwwwwwfhggfffffhhhhggggggggggghfhg' +
    'gggggggggggghwwwwwwwwwwhggggggggggggfhwwwwwwwwwwwwwwwhfffffffffhhggggggggggghhhg' +
    'ghgggggggggghwwwwwwwwwwwhggggggggggfhwwwwwwwwwwwwwwwwhgffffffggggggggggggggghhhg' +
    'ghhgggggggggghfwwwwwwwwwwhhgggggghhwwwwwwwwwwwwwwwwwwhgffgggfhhfgggggggggggghhhg' +
    'ghhhggggggggggfhfghffwwwwwwghhhhfwwwwwwwwwwwwwwwwwwwwhgfgghhhgfhhhfgggggggggghhg' +
    'ghhhgggggggggggggggfffhwwwwwwwwwwwwwwwwwwwwffwwwwwwwwhggfhwwwwwwwwhhgggggggggghg' +
    'ghhhggggggggggghhffffffgfwwwwwwwwwwwwwwwhhhhhhfwwwwwwwhhhwwwwwwwwwwfhggggggggggg' +
    'ghfhggggggggggghhhhfffffgwwwwwwwwwwwwwfhhggggghhwwwwwwwwwwwwwwwwwwwwhggggggggggg' +
    'ghhhggggggggggfhhhhhgffgffhwwwwwwwwwwfhhggggggghwwwwwwwwwwwwwwwwwwwwffgggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfhwwwwwwwfhhgggggggggfwwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhghhfffhhfgggggghhhggghwwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghhgffffggggggggghhhhhhhhhhfgggfhfgggggggghhhggghhwwwwwwwwwwwwwwwwwwwhgggggggggg' +
    'ghggfffgggghhfggghhhfhhhhhfggggggggggggggghhhgggghfwwwwwwwwfhfwwwwwwwfgggggggggg' +
    'ghggfffgggghhfgggfhhhfhhgggggggggggggggggggggggggghwwwwwfhhhhhhhwwwwwfgggggggggg' +
    'ghfgffggggghhfggggfhhhhggghhhgggggggggggggggggggggfhhhfhhggggggfwwwwwhgggggggggg' +
    'ggffgfggggggggggggghhhhggghhhgggggggggggggggggggggggfhfggggggggghwwwwhgggggggggg' +
    'gfffgffggggggggggggggggggghhhgggggggggggggggggggggggggggggggghgghhwwwhgggggggggg' +
    'gffffffggggggggggggggggggggggggggggggggggggggggggghhhgggggggghhfghwwwfgggggggggg' +
    'gffffgfggggggfgggggggggggggggggggggggggggggggggggghhhggggggghhhhghwwwwhggggggggg' +
    'gfffffffgggfffggggfgfgggggggggggggghhhgggggggggggghhhgggggghhhhhghwwwwhfgggggggg' +
    'gfffffffffgfgffgfffggffffgggggggggghhhgggggggggggggggggggghhhhhhghwwwwwhhggggggg' +
    'gffffffffffffgfffffffffggggggggggggfffggggggggggggggggghhhhhhfhgghwwwwwwfhgggggg' +
    'gfffgfgffffffffffffffgfggggggggggggggggggggggggggghhhhhhhhhhhhhgghfwwwwwwwhggggg' +
    'gffffffffffffffgfffffgfgggggggggggggggggggggggggghhhhhhhgghhhhhggghwwwwwwwfhgggg' +
    'gffgfgffffffffffffgffffggggggggggggggggggggggggghhhhhfhhhhhhhhhfggfhwwwwwwwfhggg' +
    'ghhhggghhhgghhhghgghgggggggggggggggggggggggggggggggghghggggggggggggggggggggggggh',
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3':
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gggghfffhggggggghhhfhhhhhhhfhhhhhgggggggggggggggggggggggggffgffffgffggffgfggfffg' +
    'ggggghfffgggggggghhfhhhhhhhhhhhhfggggggggggggggggggggggggffgffffffffffffffgfgfgh' +
    'gggggghfffhgggggghhhhghhhhhhhhhgggggggggggggggggggggghhhgfgfffffffffffffgffgfgfh' +
    'ggggggghfffgggggghfhhhhhhgggggggggggggggggggggggggggghhhgfffffffgffffffffffgffgh' +
    'gggggggggfffgggghhhhhhgggggggggggghhggggggggggggggggghhhfhfgffffgfffffggggfffffh' +
    'ggggggggghfffggghhhhhfgggggggggggghhggggggggggggggggggggfggggggfgggfgggggffffffh' +
    'ggggggggggfffggfhhhhhfgghhhgggggggffggggggggggggggggggghhggggggggggfgggggfgffffg' +
    'gggggggggghffggghhhggggghhhgggggggggggggggggggggggggfffhgggggggggggggggggffffgfh' +
    'gggggggggggfffggfhfggggghhhggggggggggggggggghhhggggfhfgggggggggggggggggggffgfffh' +
    'gggggggggggfffhfgggggggggggggggggggggggggggghhhggfffggggghhhhggggghhhgggggfggfgh' +
    'ggggggggggggffffhggggggggggggggggggggggggggghhhggfhggggghhhhhggggghhhgggggffgfhg' +
    'ggggggggggggghffffggggggggggggggggggggggggggggggffgggggghhhhhhfggghhhggggfffgghg' +
    'ggggggggggggggghffhggggggggggggggggggggggggggggfhggggfhhhhhhhhhggggggggggfffgghg' +
    'gggggggggggggggghfffggggggggggggggggggggggggggfhggggfhhhhhhhhhhgggggggggfffffhhh' +
    'gggggggggggggggggffhgggggggggggghhfggggggggggffgggggghhhhhhhhhfhgggggggggffgghhg' +
    'gggggggggggggggggfffgggggggggggghhfggggggggggfhgggggghhgggghhhhhhfgggggggffgfhhg' +
    'ggggggggggggggggghfffggggggggggghhfggggggggggffggggggggfgffghhhhhfgggggggggfhhhg' +
    'ggggggggggggggggggfffhgggggggggggggggggggggghfggggggggggfffffhhhhgggggggfgfghfhg' +
    'ggggggggggggggggggffffffhffgggggggggggggggghfhgggggggggffffffffhhggggffgfggghhhg' +
    'ghggggggggggggggggfghgffffffgggggggggggggghfhggggggggggffffffggggggggfgggggghhhg' +
    'ghhgggggggggggggggfgggggfhffffhfggggggggghffgggggggggggffgggggggggggfggggggghhhg' +
    'ghhhgggggggggfffgfggggggggfhfffffggggggghfffhfgggggggggfggggggggggghfgggggggghhg' +
    'ghhhggggggggfggggggffgggggggghfffhggfhffffhhffffhggggggggggggggggghfgggggggggghg' +
    'ghhhgghhhgghfgghhffffffggggggggfffffffghggggggfhfffgggggggggffffffhggggggggggggg' +
    'ghfhgfgggffhggghhhhfffffgggggggggfffggggggggggggghffgggggggfffgggggggggggggggggg' +
    'ghhhfgggggggggfhhhhhgffgfgggggggggffggggggggggggggghfffhggfggggggggggggggggggggg' +
    'ghhggffgggggggfhhhhhhgggghfggggggghfgggggggggggggggggfffffggggggghhggggggggggggg' +
    'ghhggffggggggggghfhhhhhhhhhggggggggffggggghhhgggggggggghffggggggghhggggggggggggg' +
    'ghhgffffggggggggghhhhhhhhhhfgggggggfhggggghhhggggggggggghfhgggggghhggggggggggggg' +
    'ghggfffgggghhfggghhhfhghhhfggggggggffggggghhhgggggggggggghfggggggggggggggggggggg' +
    'ghggfffgggghhfgggfhhhfhhgggggggggggffggggggggggggggggggggghfffgggggggggggggggggg' +
    'ghfgffggggghhfggggfhhhhggghhhgggggffgfhggggggggggggggggggggffffhgggggggggggggggg' +
    'ggffgfggggggggggggghhhhggghhhgggggfgggffgggggggggggggggggggggfhffhgggggggggggggg' +
    'gffffffggggggggggggggggggghhhggghffgggggfhggggggggggggggggggghggffffgggggggggggg' +
    'gffffffggggggggggggggggggggggggfhggggggggffhgggggghhhgggggggghhfgghffggggggggggg' +
    'gffffgfggggggfgggggggggggggggggfggggggggggghfggggghhhggggggghhhhgggghfgggggggggg' +
    'gfffffffgggfffggggfgfgggggggffffggghhhgggggghfgggghhhgggggghhhhhgggggfhggggggggg' +
    'gfffffffffgfgffgfffggffffggfhgggggghhhgggggggfgggggggggggghhhhhhggggghfggggggggg' +
    'gffffffffffffgfffffffffggggfgggggggfffgggggggfhgggggggghhhhhhfhggggggggfgggggggg' +
    'gfffgfhffffffffffffffgfgggfggggggggggggggggggggggghhhhhhhhhhhhhgggggggffgggggggg' +
    'gffffffffffffffgfffffgfggfhgggggggggggggggggggfgghhhhhhhgghhhhhggggggggffggggggg' +
    'gffgfgffffffffffffgffffggfgggggggggggggggggggggfhhhhhfhhhhhhhhhfggggggghfggggggg' +
    'ghhgghhhhhhhhghhhghhgggggggggggggggggggggggggggggggghghgghgggggggggggggggggggggg',
  'b94a7e47-8778-43d3-a3fa-d26f831233f6':
    'mmmmmmmmmmmmmmmgmgggggggmgmmmmmmgmmmmmmmgmmmmmmmmmmmmmmmmmmmmmgmmmmmmmmmmmmmmmmg' +
    'mwwwwwwwwwwwwggghhhfhhhhhhhfhhhhhgggfmmmmmmmmmmmmmmwggwwwwwgmfffmgffggffgfggfffm' +
    'gwwwwwwwwwwwwwggghhfhhhhhhhhhhhhfgggfmmmmmmmfmmffmmgwwwwwwwgffffffffffffffgfgfmg' +
    'gwwwwwwwwwwwwwwgghhhhghhhhhhhhhgggggggmmmmmmmmmmmggwwwwwwwgfffffffffffffgffgfmfg' +
    'gwwwwwwwwwwwwwwgghmhhhhhhggggggggggggmmmmmmmmmmmmggwwwwwfgffffffgfffffffmffmffgg' +
    'gwwwwwwwwwwwwwwghhhhhhggggggggggggggmmmfmmmmmmmmggwwwwwwggfgffffgfffffggggfffffg' +
    'gwwwwwwwwwwwwwwghhhhhmggggggggggggggmmmmgggggfmgmwwwwwwggggggggfgggfgggggffffmfg' +
    'mwwwwwwwwwwwwwgfhhhhhfggggggggggggggmmggmfmgfmggwwwwwwwggggggggggggfgggggfgffffm' +
    'gwwwwwwwmmmmmmhhhhhhhhhhhhhhhhhhhhhhhhhhffhhmmhhmmmmmmmhhhhhhhhhhhhhhhhhgffffmfg' +
    'gwwwwwwwwwwwwwwffhmgggwwwgggggggggggggggggggghgwwwwwwwwggggggggggggggggggffmmffg' +
    'gwwwwwwwwwwwwwwwgggwwwwwwwggggggmggggggggggggggmwwwwwwggghhhhgggggggggggggfmmfgg' +
    'mwwwwwwwwwwwwwwwwwwwwwwwwwwwmghgggggggggggggggwwwmwwwggghhhhhgggggggggggggffgfmm' +
    'gwwwwwwwwwwwwwwwwwwwwwwwwwwwmwwfggggggggggwwwwwggggggggghhhhhhfggggggggggffmggmm' +
    'ggwggwwwwwwwwwwwwwwwwwwwwwwwwwwwgggggggggwwggggggggggfhhhhhhhhhggggggggggfffggfm' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggwwwggggggggggfhhhhhhhhhhgggggggggffffwmmm' +
    'ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgggggggggggggghhhhhhhhhfhgggggggggmfmmmmm' +
    'gggggggfwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwgggggggggggggghhgggghhhhhhfgggggggffgmmmm' +
    'gmmgggggggwwwwwwwwwwwwwwwgggggwwwwwwwwggggggggggggghhhgfgffghhhhhfggggggggggmmmm' +
    'gmgggggggggwwwwwwwwwwwwwwggggggmwwwwwggggggggggggghhhhmgffffmhhhhgggggggggggmmmm' +
    'gmgggggggggggwwwwwwwwwwwmgmhfgggggwwwggggggggggghhhhhhgffffffffhhghgggggggggmmmm' +
    'gfmgggghhhgggwwwwwwwwwwwggmhhfhhhfggwfggggggggghhhhhhhgffffffggggggghghhhgggfmmm' +
    'gmmmggghhgggggwwwwwwwwggfghhhhmhhhgggwgggggggghhhhhhhhgffggggggggggggghhhgggfmmm' +
    'gmmfggghhggggggggggggggffghhhhhhhhgggwwggggggghhhmhhhhgfggwwwwwwwwgggghhhgggmmmg' +
    'gmmfggghhhghgggggggffffffmhhhhhhhggggwwwwfggggfhhhfhhmggwwwwwwwwwwwggghhhggggmwg' +
    'gmmmggggggggghghhffffffffghhhhhhggggwwwwwwwwwwgggggfhmggwwwwwwwwwwwgggggggggggmg' +
    'gmmmggggggggggghhhhmffffgmhhhhggggwwwwwwwwwwwwwwmggggggwwwwwwwwwwwwwwgggggggggmg' +
    'gmmmggggggggggfhhhhhgffgfghhhgggwwwwwwwwwwwwwwwwwmgggggwwwwwwwwwwwwwwwgggggggmmg' +
    'gmmmgffgggggggfhhhhhhgggmhhggggwwwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwwwwwwwwwfggggggm' +
    'gmmmmffggggggggghfhhhhhhhhhggggwwwfmgggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggm' +
    'gmmmffffggggggggghhhhhhhhhhfggwwwgggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggg' +
    'gfggfffgggggggggghhhfhhhhhfgggwwgggggggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwfgfgg' +
    'gmggfffghggggggggmhhhhhhggggfwwwggggggggggggggggggmwwwwwwwwwwwwwwwwwwwwwwwwwwwwm' +
    'gmfgffggghggggggggfhhhhggwwwwmwgggggggggggggggggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwm' +
    'ggffmfgggghgggggggghhhhgfwwwwwghggggggggggggggggggggggwwwwwwwggmwwwwwwwwwwwwwwwg' +
    'gfffmffgggghggggggggggggwwwwwwgggggggmmggggggggggggggggwwwwfghmgwwwwwwwwwwwwwwwg' +
    'gfmffffghhhhhhhhhhhhhhhhmmmmmhhhmhwhhmmmmhhhhhhhhhhhhhhmmhhhhhhfmmmmmmmmwwwwwwwg' +
    'mffffgfgggggmfgggggggggggwwwwggmmmmgggmmmfgggggggggggggggggghhhhgwwwwwwwwwwwwwwg' +
    'mfmfffffgggfffggggfgfgggggwwwmmmmmmgggmmmmfgggggggggggggggghhhhhgwwwwwwwwwwwwwwg' +
    'gfffffffffmfmffgfffggmffmgwwwwgmmmmfmmmmmmfggggggggggggggghhhhhhmwwwwwwwwwwwwwwg' +
    'mffffffffffffgfffffffmfggwwwwwggmmmmmmmfmmmgggggggggggghhhhhhmhggwwwwwwwwwwwwwwg' +
    'gfffmfgffffffffffffffmfggwwwwgggmmmmmmmmfmmfgggggghhhhhhhhhhhhhggwwwwwwwwwwwwwwg' +
    'gffffffffffffffmfffffgfgwwwwwggmmmmmmmmmmmmmggggghhhhhhhhhhhhhhgggwwwwwwwwwwwwwg' +
    'gffmfgffffffffffffmffffgwwwwwgmmmmmmmmmfmmmggggghhhhhfhhhhhhhhhmgggwwwwwwwwwwwwg' +
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d':
    'gggggggggggggmggggggggggggggggggggggggmggggmmmmmmggggggggggggggggggggggggggggggg' +
    'ggggggggggggfhgghhhfhhgghhhfhhhhhgggfggmmmgggmmggmmfghhhgggggffffgffggffgfggfffg' +
    'ggggggggggggwgggghhfhghhhhhhhhhhfgggfgmmmgmgfmmffmmghhhhggwgffffffffffffffgfgfmg' +
    'ggggggggggggwghgghhggghhhhhhhhhgggggggmmmfmmmffmmgghhhhggwgfffffffffffffgffgfgfg' +
    'gggggggggggggghgghfgghhhhgggggggggggggfmgmmmmmmmmhghhhggfgffffffgffffffffffgffgg' +
    'gggggggggggggghghhhhhhgggggggggggggggggfgmmgggmmgghhgggwggfgffffgfffffggggfffffg' +
    'ggggggggggggghhghhhhhfgggghhhgggghhhggmmhhhhhfmhghhggggggggggggfgggfgggggffffffg' +
    'ggggggggggwghhgfhhhhhfgghhhhhhhhhhhhgmhhffmhfhhhhhgggggggggggggggggfgggggfgffffg' +
    'gggggggggggghhgghhhgggghhhhhhhhhhhhhhhhhffhhgmhhgggggggggggggggggggggggggffffgfg' +
    'ggggggggwggghhggfhfggghhhhhhhhhhhhhhhhhhhhhhhhhgggggggwggggggggggggggggggffgfffg' +
    'gfggggggggggghhgggghhhhhhhhhhhhhhhhhhhhhgggghggggggggfggggggggggggggggggggfggfgg' +
    'gwwwwwgwgggggghhhhhhhhhggggggggghhhhhhhgggggggggffggggggggggggggggggggggggffgfmg' +
    'gwwwwwwgggggggggghhhhggggggffffggghhhggggggfwwwggggggggggggggggggggggggggfffggmg' +
    'ggfggwwwggggggggggggggggffffffgfggggggggggwggggggggggggggggggggggggggggggfffggfg' +
    'gggggwwwfggggggggggggggfffgwwwgfffgggggggwggggggggggggggggggggggggggggggffffwmgg' +
    'ggggggwwwwwggffggggggggfgwwwwwwffgffgggggggggggggggggggggggggggggggggggggffggmgg' +
    'gggggggwwwwwfgfggggggfffgwwwwwwwwgggggwggggggggggggggggggggggggggggggggggffggggg' +
    'gggggggggwwwwwfffggfffggwwwgggwwwwwfggffffgggggggggggggfgffgggggggggggggggggmggg' +
    'gggggggggggwwwgffffffgfwwwgggggfwwwwwghhhhggggggggggggggffffggggggggggggggggmmmg' +
    'ggggggggggggwwwgfggffwwwwgggggggggwwwghhhhgggggggggggggfffffffggggggggggggggmmmg' +
    'gfmggggggggggwwwwmmwwwwwgggggggggggwwwhhhhgggggggggggggffffffgggggggggggggggfmgg' +
    'gmmmggggggggggwwwwwwwwggfggggggggggfwwgggggggggggggggggffggggwwwwwggggggggggfmgg' +
    'gmmfgggggggggggfwwwwwggffgggggggggggwwwggggggggggggggggfggwwwwwwwwwgggggggggmmmg' +
    'ggmfgggggggggggggggffffffgggggggggggwwwggggggggggggggggggwwwwwwfwwwwgggggggggmfg' +
    'gmmmggggggggggggggfffffffggggggggggggwwwwwggggggggggggggwwwwfggggwwwgggggggggggg' +
    'gmmmggggggggggggggggffffggggggggggfgggwwwwwwwwggggggggggwwfgggggggwwfggggggggggg' +
    'gggmgggggggggggggggggffgfgggggggmggggggwwwwwwwwwgggggggwwwggggggggwwwggggggggggg' +
    'gggggffggggggggggggggggggggggggggggggggggggggwwwwwwgggwwwfgggggggfgwwwgggggggggg' +
    'ggmggffgggggggggggggggggggggggggggggggggggggggwwwwwwwwwwwgggggggggggwwwwgggggggg' +
    'ggmfffffggggggggggggggggggggggwggggggggggggggggggwwwwwwwgggggggggggggwwwwggggggg' +
    'gfggfffgggggggggggggggggggggggggggggggggggggggggggggfgggggggggwggggggggwwwgggggg' +
    'gmggfffggggggggggggggggggggffgggggggggggggggggggggggggggggggggggggggggggwwwwfwwg' +
    'gmfgffgggggggggggggggggggwgggggggggggggggggggggggggggggggggggwgggggggggggwwwwwwg' +
    'ggffgfggggggggggggggggggfgggggggggggggggggggggggggggggggggggggggggggggggggwwwwwg' +
    'gfffmffgggggggggggggggggfggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gffffffgggggggggggggggggwggggggggggggghhhhgggggggggggggggggggggggggggggggggggggg' +
    'gffffgfggggggfgggggggggggwgggggggggggghhhhgggggggggggggggggfgggggggggggggggggggg' +
    'gfffffffgggfffggggfgfggggggggggggggggghgghgggggggggggggggggwgggggggggggggggggggg' +
    'gfffffffffgfgffgfffggffffggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'gffffffffffffgfffffffffggfggggggggggggggggggggggggggggggggggfggggggggggggggggggg' +
    'gfffgfgffffffffffffffgfggggggggggggggggggggggggggggggggggggwgggggggggggggggggggg' +
    'gffffffffffffffgfffffgfgwggggggggggggggggggggggggggggggggwgggggggggggggggggggggg' +
    'gffgfgffffffffffffgffffggggggggggggggggggggggggggggggggggggggggggggggggggggggggg' +
    'ggggghgggggggghggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
};

const TERRAIN_TYPE_BY_CODE: Record<string, TerrainType> = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

const MOUNTAIN_CELL_INDEXES_BY_MAP_ID: Record<string, number[]> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': [
    
  ],
  '30cae103-cb06-4791-a21d-241f488189d3': [
    
  ],
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
    64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80,
    117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 129, 130, 160, 197, 198,
    199, 200, 201, 202, 203, 205, 206, 209, 210, 278, 279, 280, 281, 282, 283, 284,
    285, 287, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 436, 437,
    440, 441, 442, 444, 445, 446, 447, 517, 518, 519, 526, 596, 597, 602, 683, 684,
    685, 1038, 1119, 1197, 1199, 1276, 1277, 1278, 1279, 1356, 1357, 1358, 1359, 1361, 1436, 1437,
    1441, 1516, 1517, 1518, 1521, 1596, 1597, 1598, 1599, 1602, 1677, 1678, 1679, 1681, 1682, 1683,
    1757, 1759, 1761, 1762, 1836, 1837, 1838, 1840, 1842, 1917, 1920, 1921, 1922, 1923, 1998, 1999,
    2001, 2002, 2003, 2078, 2079, 2080, 2081, 2082, 2083, 2111, 2112, 2158, 2161, 2162, 2163, 2241,
    2242, 2243, 2320, 2321, 2322, 2400, 2481, 2561, 2780, 2846, 2859, 2927, 2938, 3199, 3279, 3400,
    3415, 3445, 3446, 3447, 3448, 3449, 3451, 3452, 3453, 3454, 3455, 3456, 3479, 3481, 3484, 3485,
    3486, 3487, 3488, 3495,
  ],
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': [
    117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 197, 198,
    199, 200, 201, 202, 203, 205, 206, 209, 210, 278, 279, 280, 282, 283, 284, 287,
    288, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 436, 437, 438, 440, 441,
    442, 443, 444, 445, 446, 447, 516, 517, 518, 519, 526, 596, 597, 684, 685, 958,
    1038, 1197, 1198, 1276, 1277, 1278, 1356, 1357, 1358, 1361, 1362, 1436, 1437, 1438, 1441, 1516,
    1517, 1518, 1521, 1596, 1597, 1598, 1602, 1677, 1678, 1681, 1682, 1683, 1757, 1758, 1761, 1762,
    1836, 1837, 1838, 1841, 1842, 1917, 1921, 1922, 1923, 1998, 2001, 2002, 2003, 2078, 2081, 2082,
    2083, 2157, 2158, 2161, 2162, 2163, 2241, 2242, 2243, 2321, 2322, 2481, 2561, 2757, 2758, 2832,
    2838, 2839, 2840, 2911, 2912, 2913, 2914, 2918, 2919, 2920, 2989, 2990, 2991, 2992, 2993, 2994,
    2998, 2999, 3000, 3001, 3071, 3072, 3073, 3074, 3076, 3077, 3078, 3079, 3080, 3081, 3152, 3153,
    3154, 3155, 3156, 3157, 3158, 3160, 3161, 3162, 3232, 3233, 3234, 3235, 3236, 3237, 3238, 3239,
    3241, 3242, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, 3320, 3321, 3322, 3323, 3390, 3391,
    3392, 3393, 3394, 3395, 3396, 3397, 3398, 3400, 3401, 3402,
  ],
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': [
    12, 13, 47, 48, 52, 53, 116, 126, 127, 131, 132, 133, 134, 135, 195, 196,
    197, 203, 204, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 275,
    276, 277, 278, 279, 280, 281, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292,
    293, 294, 295, 296, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369,
    370, 371, 430, 431, 432, 433, 434, 441, 442, 443, 444, 445, 447, 448, 449, 450,
    452, 453, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 521, 522, 523, 525,
    526, 528, 529, 531, 533, 595, 596, 597, 598, 599, 600, 601, 603, 604, 605, 606,
    607, 608, 677, 678, 679, 680, 681, 682, 683, 684, 686, 688, 689, 690, 693, 694,
    751, 758, 759, 762, 765, 766, 767, 769, 770, 771, 772, 773, 774, 775, 830, 831,
    832, 833, 840, 841, 842, 844, 845, 846, 847, 848, 849, 850, 851, 852, 910, 911,
    913, 919, 920, 922, 923, 924, 925, 927, 928, 929, 930, 931, 932, 958, 995, 1002,
    1003, 1004, 1005, 1006, 1007, 1038, 1072, 1073, 1074, 1075, 1081, 1083, 1084, 1085, 1086, 1087,
    1088, 1154, 1156, 1157, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1197, 1198, 1236, 1237,
    1242, 1243, 1244, 1245, 1249, 1276, 1277, 1278, 1325, 1326, 1328, 1329, 1330, 1331, 1356, 1357,
    1358, 1361, 1362, 1399, 1403, 1404, 1405, 1406, 1436, 1437, 1438, 1441, 1478, 1479, 1480, 1485,
    1486, 1487, 1516, 1517, 1518, 1521, 1559, 1560, 1596, 1597, 1598, 1602, 1677, 1678, 1681, 1682,
    1683, 1741, 1742, 1757, 1758, 1761, 1762, 1836, 1837, 1838, 1841, 1842, 1917, 1921, 1922, 1923,
    1998, 2001, 2002, 2003, 2078, 2081, 2082, 2083, 2157, 2158, 2161, 2162, 2163, 2241, 2242, 2243,
    2321, 2322, 2481, 2561, 2757, 2758, 2832, 2837, 2838, 2839, 2840, 2911, 2912, 2913, 2914, 2918,
    2919, 2920, 2990, 2991, 2992, 2993, 2994, 2998, 2999, 3000, 3001, 3071, 3072, 3073, 3074, 3076,
    3077, 3078, 3079, 3080, 3081, 3152, 3153, 3154, 3155, 3156, 3157, 3158, 3160, 3161, 3162, 3232,
    3233, 3234, 3235, 3236, 3237, 3238, 3239, 3241, 3242, 3312, 3313, 3314, 3315, 3316, 3317, 3318,
    3319, 3320, 3321, 3322, 3323, 3390, 3391, 3392, 3393, 3394, 3395, 3396, 3397, 3398, 3400, 3401,
    3402,
  ],
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': [
    
  ],
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': [
    
  ],
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 26,
    27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
    61, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
    78, 80, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
    140, 144, 159, 197, 198, 199, 200, 201, 202, 203, 205, 206, 209, 210, 238, 278,
    279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 317, 357, 358, 359, 360, 361,
    362, 363, 364, 365, 366, 367, 368, 436, 437, 438, 440, 441, 442, 443, 444, 445,
    446, 447, 516, 517, 518, 519, 526, 528, 596, 597, 600, 605, 648, 649, 650, 651,
    652, 653, 684, 685, 688, 689, 690, 691, 692, 693, 694, 717, 795, 796, 875, 876,
    908, 958, 959, 988, 1038, 1039, 1119, 1197, 1198, 1199, 1275, 1276, 1277, 1278, 1279, 1356,
    1357, 1358, 1359, 1361, 1362, 1436, 1437, 1438, 1439, 1441, 1516, 1517, 1518, 1519, 1521, 1546,
    1596, 1597, 1598, 1599, 1602, 1626, 1677, 1678, 1679, 1681, 1682, 1683, 1757, 1758, 1759, 1761,
    1762, 1836, 1837, 1838, 1841, 1842, 1893, 1917, 1921, 1922, 1923, 1973, 1998, 2001, 2002, 2003,
    2048, 2078, 2081, 2082, 2083, 2129, 2157, 2158, 2161, 2162, 2163, 2239, 2241, 2242, 2243, 2244,
    2319, 2321, 2322, 2323, 2481, 2559, 2561, 2639, 2644, 2703, 2724, 2757, 2758, 2782, 2824, 2825,
    2826, 2827, 2828, 2832, 2837, 2838, 2839, 2840, 2855, 2856, 2864, 2865, 2866, 2867, 2868, 2869,
    2870, 2871, 2880, 2911, 2912, 2913, 2914, 2918, 2919, 2920, 2960, 2989, 2990, 2991, 2992, 2993,
    2994, 2998, 2999, 3000, 3001, 3061, 3071, 3072, 3073, 3074, 3076, 3077, 3078, 3079, 3080, 3081,
    3141, 3152, 3153, 3154, 3155, 3156, 3157, 3158, 3160, 3161, 3162, 3221, 3232, 3233, 3234, 3235,
    3236, 3237, 3238, 3239, 3241, 3242, 3311, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, 3320,
    3321, 3322, 3323, 3390, 3391, 3392, 3393, 3394, 3395, 3396, 3397, 3398, 3400, 3401, 3402,
  ],
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': [
    38, 43, 44, 45, 46, 47, 48, 119, 120, 121, 125, 126, 129, 130, 198, 199,
    200, 202, 205, 206, 209, 210, 278, 279, 280, 282, 283, 284, 287, 288, 359, 361,
    362, 363, 364, 365, 366, 367, 368, 441, 442, 446, 447, 518, 519, 526, 597, 958,
    1038, 1197, 1277, 1436, 1516, 1517, 1518, 1596, 1597, 1598, 1602, 1617, 1618, 1677, 1681, 1682,
    1683, 1757, 1761, 1762, 1836, 1837, 1838, 1842, 1917, 1921, 1922, 1923, 2001, 2002, 2003, 2083,
    2242, 2322, 2481, 2561,
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
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': {
    RED: [
      405, 406,
    ],
    BLUE: [
      2949,
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
      2871, 2872,
    ],
  },
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': {
    RED: [
      2411, 2412, 2491, 2492,
    ],
    BLUE: [
      866, 867, 868, 946, 947, 948, 1026, 1027, 1028,
    ],
  },
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': {
    RED: [
      2411, 2412, 2491, 2492,
    ],
    BLUE: [
      866, 867, 946, 947, 948, 1026, 1027, 1028,
    ],
  },
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': {
    RED: [
      1687, 1688, 1767, 1768,
    ],
    BLUE: [
      1751, 1752, 1831, 1832,
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
};

const CITY_ANCHOR_BY_MAP_ID: Partial<Record<string, Record<Team, GridCoordinate>>> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87': { RED: { col: 40, row: 8 }, BLUE: { col: 40, row: 35 } },
  '30cae103-cb06-4791-a21d-241f488189d3': { RED: { col: 8, row: 8 }, BLUE: { col: 72, row: 35 } },
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf': { RED: { col: 6, row: 5 }, BLUE: { col: 69, row: 36 } },
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935': { RED: { col: 7, row: 9 }, BLUE: { col: 72, row: 35 } },
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1': { RED: { col: 8, row: 8 }, BLUE: { col: 72, row: 35 } },
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a': { RED: { col: 12, row: 31 }, BLUE: { col: 67, row: 11 } },
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3': { RED: { col: 12, row: 31 }, BLUE: { col: 67, row: 11 } },
  'b94a7e47-8778-43d3-a3fa-d26f831233f6': { RED: { col: 8, row: 22 }, BLUE: { col: 72, row: 22 } },
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d': { RED: { col: 40, row: 19 }, BLUE: { col: 40, row: 36 } },
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
