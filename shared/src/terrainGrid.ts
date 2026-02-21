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
    'wwwwwwwggwwwwgwwwwwwgwwwwwwwwwwwwwwwwgwwwwwwwwwwwwwwwwgggwggwwwwwwwwwwwwwwwwwwww' +
    'wwwwwwwgggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggggggwwwwggwwwwwwwwwwwww' +
    'wwwwwwwggggwwwwggwwwwwwwwwwgwwwwwwwwwwwwwwwwwwwwwwwwggggggggggggggggggggwwwwwwww' +
    'wwwwwwwggggwwwggggggwwwwwwgggwwwwwwwwwwggwwwwwwwwwggggggggggggggggggggggggwwwwww' +
    'wwwwwwgggggwwggggggggwwwwwwggwwwwwggwwggggwwwwwwwggggggggggggggggggggggggggwwwww' +
    'wwwgggggggwwwggggggggfffwwwwwwwwwggggggggggggwwwwggggggggggggggggfffggggggggwwww' +
    'wwgggggggwwwwgggggggggffgggwwwwwwwgggggggggggggggggggggffggggggggfffgggggggggwww' +
    'wwggggggwwwwgfgggggggggggggggggwwwwgggggggggggggggggggffhhgggggggffffgggggggggwg' +
    'wwgggggggwwwfffggggggggggggggggfwwwwggggggggggggggggggffhhhhgggggfffffggggggggww' +
    'wgggggggggggfffggggggggggggggggffggggggggggggggggggggggfhhhhhhhgggffffggggggggww' +
    'wgggggggggggggggggggggggghggggfffgggggggggwwggggggggggghhhhhhhhgggffffgggggggggw' +
    'wwgggggggggggggggggggggghhhgggfffgggggggghwwggggggggggghhhhgggggggfffggggggggggg' +
    'wwwggggggggggggggggggggghhhggggfggggggggghhgggggggwwwggghhgggggggggggggggggggggf' +
    'wwwwgggggggggggggggggggghhhggggggggggggghhhhggfggwwwwwwwhhggggggggggggggggggggww' +
    'wwwwwggggggggggggggggggggggggggggggggggggghggffffffwwwwwwggggggggggggggggggggwww' +
    'wwwwwwgggggggggggggggggggggggggggggggggggggggggffffffggwwwwwwgggggggggggggggggww' +
    'wwwwwwgggggggggggggggggggggggggggggggggggggggggggfffgggggwwwwwghhgggggggggggggww' +
    'wggwwwgggggggggggggggggggggggggggggggghggggggggggfffggggggwwwwwwhgggggggggggggww' +
    'ggggwwwggggggggggggggggggghgggggggggghhhggggggggfffggggggggwwwwwwggggggggggggggw' +
    'ggggwwwgggggggggggggggggghhhgggggggghhhhhffgfffffffggggffhhfwwwwwwgggggggggggggg' +
    'wggggwwwgggggggggggggggggghggggggggghhhhhhhhhfffffhhggffffhhfwwwwwgggggggggggggg' +
    'wggggwwwwgggggggggggggggggggggggggfhhhhhhhhhffffffhhggfffffffwwwwwgggggggggggggw' +
    'wwggwwwwwwggghhgggggggggggggggggggfhmmhhhhhffffffffggggfffffwwwwwwghhgggggggggww' +
    'wwwwwwwwwwggghhgggggggggggggggggggfhmmmhhhfffffffffgggggggwwwwwwwwghhggggggffgww' +
    'wwwwwwwwwwggggggggggggggggggggggggghmmmhhffffffffffggggggwwwwwfwfgggggggggfffwww' +
    'wwwwwwwwwwgggggggggggggggggggggggggghmhhgffggfffffhhgggwwwgggggggggggggggggfwwww' +
    'wwwwwwwwwgggggggggggghhhhgggfffggggghhhhffggggffhhhhggwwwgggggggggggggggggwwwwww' +
    'wwwwwwwwggggggggggggghhhhhhhhhfgggggghhhffggggghhhhhhwwwgggggggggggggggggwwwwwww' +
    'wwwwwwwgggggggggggggghhhhghhhhggggggghhfffgggggwhhhhhgghhgggggggggfffffffwwwwwww' +
    'wwwwwwgggggggggggggggghhgffhhgggggggggffffgghwwwhhhhhffhhggggggggfffffffgwwwwwww' +
    'wwwwgggggggggggggggggghhggffgggggggggffhfwwwhwwhgghhfffhhggggggggfffffffwwwwwwww' +
    'wwggggggggggggggggggghhhgggggggggggggwwwwwwwghhggggfffghhgggggggggfffffgwwwwwwgg' +
    'wggggggggggggggggggghhhhgggggggggwwgggwwggggggggggggggggfffgggggggggggggwwwwwwgg' +
    'gggggggggggggggggggghhhgggggggwwwwwhggggggggggggggggggggffffgggggggggggggwwwwwgg' +
    'ggggggggggggggggggggghgggffwwwwwwgghhggggggggggggggggggggffffggggggggggggggwwwgg' +
    'wgggggggggggggggggggggggwwwwwffffgghhhhggggggggggggggggggffffffggggggggggggggggg' +
    'wgggggggggggwwggggggggwwwwwwfgffgggghhhgggggggggggggggggggffffffgggggggggggggggg' +
    'wwggggggggggwwwgggggggwwwwwfgggggggggggggggggggggggggggggggffffffgggggggggggwggg' +
    'wwwwwwwwwgggggwwwwwgggwwwwwgggggggggggggggggggggggggggggggggfffffggggggggggwwwgg' +
    'wwwwwwwwwwgggggwwwwwgffwwwwwggggggwwgggggggggggggwwwwwgggggggffffgggggggggggwwww' +
    'wwwwwwwwwwgggggwwwwwwgggwwwwwggggwwwwwwwggggggggwwwwwwwwwwwgggffgggggggggggggwww' +
    'wwwwwwwwwwwgggwwwwwwwggggwwwwwwwwwwwwwwwwggggggwwwwwwwwwwwwwwggggggggggggggggwww' +
    'wwwwwwwwwwwwwwwwwwwwwwggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgggwwwwgggggwwww' +
    'wwwwwwwwwwwwwwwwwwwwwwwggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgwwwwww',
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
    '323f525e5d595d676b635c5d62696e6a5b4f5665686365655e5853453534414b4b4b4d566268665e554c494846474f57574c3f3d485e707268656c6d63534c525b5f584a48555d5449484e514e464448' +
    '3944535c5a5457626a6863615f6367655e5a606b6d6662605c5b5b5347474e51515255585d61625f574d4746494d4f504f4a474c586a76766e6c71736b5d565960686659545e666057535557544e4f54' +
    '41475055534e53626d6f6c655d5d6163666a6e6f6b645f5e5e6066645c5a595352595d5b58595f625d5145444e54504a484b545f6b75787571707376706762626771726861656967615b5a5a5650535a' +
    '454b515350505b6b74726c665e5d61666c74756e6562636462646a6b67645d54555f625b54555d66665a4a475259544d4d55626d75797774716e7074716d6a6a70797b736a65636363625f5d57515154' +
    '464f585a595d6673756c635e5d5e6164686e6e6761646a6962616566656560575961625b55565d686f695850565b57535760676e73777a7a766e6d706f6d6d727a8282796e655e5d626665625d57534e' +
    '4452606567696a6c6a615754575d5f5e5f61615f5f676f6d625d5e5d5d605f5a5b60605e5d5d616b7473675d5d5d56545a6064666b727c83827a73706c6a6f777f837e736a645e595e656664625f5b56' +
    '4353646d6f6d66605c554e4f565e605d5b5c5d5d626c7674685f5a56575c5b5a5e605f626667676b7378746b655e5451575e6160636c7a888f8c83776d6c727a7f7d7266605d5b595d64666464636364' +
    '4a58676e6e69635e5a534d515c6465615f62656669727d7f74675e5a5c5d5b5d61605d60696e6b69717b7c73685f58585e63635f606c7d8db4b4918378767a7e7f7b70625c5d6061656a6b6967646469' +
    '59636b6c676363636158525963676766697073707076818884796f6b6a686565635d575c68706d69707e80766c66666a6f6f676064738594b4b4b498878586868581776c67696b6c6e7172726f655f5f' +
    '65696b6a65646668665e5b646d6e6969727c7d787679818b8f8c86817d777471685d575c6873736f7580827a7372797f7f786b6368788a98b4d0b4b49898988d8884817a746f6c6c7073777b76675a56' +
    '6667696a6b6d6f6e6c6768727a797370778184807f7f818790b499948c837e796f645f6069747a7c828887807a7c858c8a7e6d6469778ab4d0d0d0989898988c8683837e746a64656a71797d76685f5e' +
    '5c61676c717576757473757c82827d797c8285868786838398b4d09b90867f7a7670696669717c87919891878182898f8e8170676d798ab4d0d0d0908887888682817f796f666060646b73756f67676c' +
    '4f58626a6f747577797b7c7c7e807e7c7d8183858888868498b4b4958c85807d7d7a726d6d727d8b98d0b49189858689877d726e747e8a99d0d095867d7a7b8082817c746e6965626063686965636870' +
    '48505960666b6f757c7e7a73707377777a7d7f838685858a98b4b4908b878482827f7976777a7e8798b4b4b48c827e7e7b757172757c8692b498877e7874767f85827c756f6e6d675e5b606261606265' +
    '4e5052545a626d777d7b7369656a6f7376797c818281838d979a98948f8883828280808385838080868fb4968c827d7c7974737574767f888b857b787a787b868a857d77727170695d5a606566645f5b' +
    '5958545053606f797a756e68686c70757979797c7c7b808a9396979790847d7e7f80878f938f8681838a90918e898482807d7e7f7a767c82817771757c7f858f91897f78736f6d6965656a6e6e6b6258' +
    '5f615f59565e6c757774706d6d6f72787d7a757476777b83898e94968d7f7a7c7d808a959c9b938a8989888a8f8e898686888c8d878081847f736f777e8289989888807b756d696a6f757878756e645a' +
    '62686b655c5a64707777716b67666a7277736d707677787b808995998e807e817f7e88949ea3d0958d857f838c918d87858991969089878a887e7a808483868d98847e7c776d676a70777b7a736a625b' +
    '686a6c685e595f6c76776f66605f63686a6769747e7f7d7f828db49c9288888883828994a0d0d0d093867f838e979489848a9499948d898c908d8a8b89828083827c777575716b68696c6f6f6a656361' +
    '6a696865605b5c6670726e6b696968646060697a8586868a8f98b4b4949091918d8c929ed0d0d0d0d09490939a9e998e8c949d9d968d85858d9898928b827b7877746e6b6f73716c6764636363646869' +
    '64686968645d585b62676d767e7e74655c5f6b7c8584878f9497b4989495989998979ca8d0d0d0d0d0d0d0d0d0a49c92959fd0d095877a788390b4988c81766e6c6c69666b7375757169636061656969' +
    '5b656d6d675d5554575d6979858678665e636f7b7f7e828a8f92959491949b9f9d9ba1d0d0d0d0d0d0d0d0d0aaa69c92939bd0b48f7f71717f8c9391887c6f68676b6c6b6d71777d7d74696363656562' +
    '5860696b655d5856555965727c98986a696f767979797f858a8f93918f939a9c9a9aa1d0bec5d0d0d0d0d0a3a4a49b8f888a9294897a717682898a877f726a696a6f73989872767e817b71696665625d' +
    '585b6063605d5a575357616b71989872787e7c7572777e84899092908f92969593969dd0bcc5c1d0d0d09b989c9f9a8d81818d948b7d788089888480786e6b6d6f717298987174797e7e79726b645d59' +
    '5153565a5b5a585451555e6a727271767e837f7571778086898c8d8d8e92928e8c8e96d0b4bebbd0d0938c8e969d9b918788949b9285828a908e888279706d71726f6a67686e73777a7d7c776e615652' +
    '444a52585a585452545962717a787371747a7d7978808a8e8c8b8b8c8e91908b86888f9bd0b0d0d08e8482858d969b989191b4d0988f8c90949490887c726f72726c635e626d75767372727169594e4c' +
    '3d465057595755555a616c7a817c716a6a71797e8398b4b4989192929191908981818992b4d0d0b4847b7a7c818a9397989898b49a9491929697938a7f767475726a605c616f7874696260605a4f494a' +
    '42494d4f5053575c62686f797e7a706a6d767d828bb4d0b4b4b4b4b4b4b491878080868d91b4b4988377747579808b9898989898b491909399999289817d7d7e7a70655f64717b76665954524e49494b' +
    '4c4f4c4749525c63686a6a6d72726e70798182848cb4d0b49897d0d0b4b4908885878b8f9198b491827671757d83899098989898988d8c98b4948a807d808689867c706868717b77675852514f4e4e4d' +
    '5557524e525c646767666161686c6e76808481808896d0b4929399b498918c898c919393918e8b857c73717b988c8d8f989898989888889898887c74747d878c8a847b726c6d7472625553565a5b5854' +
    '5b5e5f62686b6a65605f5e60676f757c817f797a8595d0b4948d8a8683838287919999948e877f987772727e98908e9889869898818084989883756c707c85888887837a716d6d685a4f4e5660666662' +
    '60646a747a766b5f5a5e63666d778086847c777d8ab4b4b4948a817b7874747f8f9a9d988e8279777876767d85989885807e7f7d77767f98988b7a6f737e85868a8c877f78716b62564d4c535e686e70' +
    '656a727c8179695e5d64696a6e79858b88807f8bb4b4b49890887f79746b697484929b9c92837b7c7d7b7a78787c807d78767877706d76859292867b7a8184878f92897d76716b6359514f5157616d75' +
    '6a6f757b7d766a64676b6a676973808685848a97d0b4988a86837d787169666c778494b496898485817a76736f707678757478786f6a6f7d8c948e837f80818791958b796c6868655e585755555c6b75' +
    '6b6e73797b746c696c6c68625f67737a7d7f86929ab48c837b7777756f6a6a6d70798cb4b4918e8d847873716c686d7375767a786f6a6d77848c8a827d7c80858d928a77656062646462615d5a5f6c75' +
    '6668707a7a726b686868645c5658636f747578808a8c85796e696e72706d6f7070768598b4989891877a74736c63636c737676716a696b707a80807d7d7e82878c8e8876655e5e62696c69625f66727a' +
    '60656f78756c656364635f59525158646b6b6b707b817b6d5e5a626e7371716f6d717a859898988e867a75756f6562686f72716c666666686e75787b8185898c8c8b867768605e636c706a626069757c' +
    '5f656b6e6b645f5e60615f5d5853555c616466686f777364544e55677578726a65666a70767c83847d73727777716c6b6a6c6e6b66646363676d71767d848a8a86837f776d6360646a6b66615f667277' +
    '62626060605e5b595a5e6162615e595558606463656f7063534a4d5f737a7367605e5d5f687176746e6a707b807c746b62616565626162646668696a6f777e7f7b797a786f656265676563615e616a6f' +
    '636059575a5b5854545a616569685f55555e625e5f696e66584d4b5668726f66625e5858606666646467717c807c74685a535558595b5f646665625f636c727273767a7970656368686564645f5c6063' +
    '5f5f5b585959544f515a62686d6c6257565d615e5d656d6b5f534e535d636463625f59585f615c5c61686f7374726f675649474d53585c5f605f5e5e636b6e6b6e7578746b65666a6a696a69635b5757' +
    '5b5e5f5c57524f4f545d646869645c55535a605f5e636d726a5d585c5e5c5a5a5957565b61605a595f6567636265696554423c424d565a575555585c62676866696e6e696461666a6a6a6b6a665f5a57' +
    '5b60645c514d50555a5f62625c55514d4d545b5d5c5f687473696467675f58534c474c58605d5755585e5e57545b625c4b3a3539424d514d4a4a4c4f5356595f646664605b5a5f656869676464656260' +
    '5f6465594b4b545c5e5e5e5a50494645464d555857565e6d746f6a6a6a635b52443a41515a56504e515658524f565a503d323233343e46444143434141434b596263605b5351555d6568636063656464',
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
    1796, 1797, 1876, 1877, 1878, 1956, 1957, 1958, 2037,
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
    1080, 2439,
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
    { col: 39, row: 30 },
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
