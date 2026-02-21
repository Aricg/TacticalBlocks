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
    'gggggggggggggggggggggggggwwffwwggfwfghgggwgggggggggggggggfhhhfhgggggggfggghmhmhh' +
    'ggggggggggggggggggggggggggwggfwwwwwfffggggggggggggggggggggfhhhgggggggggggfhhmmmh' +
    'hffhggggggggggggggggggggggggggfwwwwfffggggggggggggggggggggggffffgggggggggffhmmmm' +
    'gghfgggggggggggggggggggggggggggfwwwwffggggggggggggggggggggggffffggggggggggfhmmmh' +
    'gggggggggggggggggggggggggggggggfwwwwfwgggfffggggggggggggggggfffffggggggggghmmmmm' +
    'ggggggggggggggggggggggggggggggfwwwwwggggffffhggggggggggggggggfffffggggggggghmmmh' +
    'ggggggggggggggggggggggggggggggfwwwwwggggffhhmhgggggggggggggggffffffggggggggghhhg' +
    'gggggggggggggggggggggggggggggfgwwwwwgggggfhmmmhgggggggggggggffffffhggggggggggggg' +
    'ggggggggggggggggggggggggggggfffwwwwwfgggghhhmmmhgggggggggggfffffghgggggggggggggg' +
    'ggggggggggggggggggggggggggggffgwwwwwffggghhhmmhggggggggggggfffgggggggggggggggggg' +
    'gggggggggggggggggggggggggggghfwwwwwgffhggghhhhhhgggggggggggfffgggggggggggggggggg' +
    'ggggggggggggggggggggggggggggfwwwwwwfghfggghhhhhhggggggggggfffffffggggggggggggggg' +
    'ggggggggggggggggggggggggggggfwwwwwwfhmhggfhhhhmhgggggggggffffffffggggggggggggggg' +
    'fggggggggggggggggggggggggggggwwwwwfffhgfhhhhgggggggggggggfffffffgggggggggggggggg' +
    'hggggggggggggggggggggggggggggwwwwwgggffffgggggggggggggggfffffffggggggggggggggggg' +
    'gggggggggggggggggggggggggggggwwwwwghfffffggggggggggggggffffffffggggggggggggggggg' +
    'ggggggggggggggggggggggggggggggwwwwfffffffggggggggggggggfffggfffggggggggggggggggg' +
    'ggggggggggggggggggggggggggggggwwwwgfffgggggggggggggggghggggggffggggggggggggggggg' +
    'gggggggggggggggggggggggggggggggwwwwfgggggggggggggggggghfggggffhggggggggggggggggg' +
    'ggggggggggggggggggggggggggggggggwwwwwgfggggggggggggggghhgggfffhggghggggggggggggg' +
    'ggggggggggggghgggggggggggggggggggggwwwwwgggggggggggggghhgffffhfgfhhhgggggggggggg' +
    'hggggggggggggffggggggggggggggggggghgghghgggggggggggggffffhfffgghhhhhhhgggggggggg' +
    'fgggggggggggghhggggggggggggggggggggggggggggggggggggfffffhhffffhhhhhhhhhggggggggg' +
    'hgggghhhhgggfhhggggggggggggggggggggggggggggggggggffffffhhhfffhggghhhhhhggggggggg' +
    'fggffhhhfhhhfgggggggggggggggggggggggggggwwwggggggffggfhmhhhffggghffgghfggggggggg' +
    'gghfffhgghhhfggggggggggghhggggggggggggggwwwwwgggggggghmhhggffggggfggfffggggggggg' +
    'gggffffhhhhhggghhgggggghhhhggggggggggggggggwwwgggggggghhhggffggggggggfgggggggfhg' +
    'gggfffffhhhggghhhhhmhfhhhhggggggggggggggggggwwwwwggggghhhhhfggggggggggggggggghhf' +
    'ggggfffghhhgggghhhhhhhhhhgggggggggggggggggggfwwwwwgggghhhhhhfggggggggggggggggghf' +
    'ggggggggfhhhgggghhhhhhhfgggggggggggggggggghhhfgwwwwfggfhhhhhhhggggggggggggggggfh' +
    'gggggggghhhhggggghhhhhhggggggggghgggggggghhhhhggwwwwwwfhhhhhhfhgggggggggggggggff' +
    'gggggggghhhhhhhhfhhhhhhghffghhghhhgggggghhhhhggggwwwwwwghfhffffgggggggggggggggfh' +
    'gggggggghhhhhhhhhfhhhhhhmhhhhhffhhhgggggghhhhhggggwwwwwgffgfffffgggggggggggggggg' +
    'ggggggggfhhhhhgggghhhhhmmhhhmmhgfhhhggggghhhhhggggwwwwwghggggghffggggggggggggggg' +
    'ggfhhgggghhhhggggggghhmmmmmmmmhhfghhhghfhghhhhhggggwwwwfhgggghhhffgggggggggggggg' +
    'ggfhhhghfhhhhhgggggggghmmmmmmmhhhgfhfhfhmggghhhggggwwwwffggghmhhffgggggggggggggf' +
    'gghhhmmmhhhhhfggggggggghhmmmmhhhhhhfggffgggggggggggwwwwwfffhmmmhfhgggggggggggggh' +
    'gghhhmmmmhhhfggggggggggghhmmmhhhhhhhgggggggggggfhggwwwwwffghmmmmhggggggggggggggh' +
    'gghhhhhmmhhhgggggggggggggfhmmhhhgggggggggggggggffgggwwwwfgghhmmhgggggggggggggggh' +
    'ggffhhhhhmhggggggggggggggghmhhhgggggggggggggggggggggwwwfggghhhhhhgggggggggggggfh' +
    'gggffhgffhgggggggggggggggghhhhgggggggggggggggggggggwwwgggggghhhhhgggggggggggggfh' +
    'ggggggggfghhgggggggggggghhhhhgggggggggggggggggggggwwwggggggghhhhgggggggggggggggf' +
    'ggggggggghmhfgggggggggghhhhhhggggggggggggggggggggwwwwggggggggfhggggggggggggggggg' +
    'gggggggghmmmhfggggggggghhmhhffggggfhgggfggggggggfwwwwwfgggggggfggggggggggggggggg',
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
    '70706e6b6c6f6e6b6b6c6c6c6d6e6d6f7373706d6c6d6f727414168d8b1314777585107f6b986f737714737272737475767879797876767674849898d08a986e6e6d69686d72876e6b6c98e7b4e69898' +
    '7273706f7172706d6d6d6e7071727172737473706d6b6d707274137472851111100f0e7f7f806e71757774706e6f71727376777673706f7173718298b4b46e6b6d6e6c6c6f74736f6c8198b4eaeae998' +
    'b48785b473726f6e6e6e6f7375767676757575736f6c6c6e6f706f6e6e6f84110f0e0e8080816f71757674706d6d6f6f6f727474726e6c6f72716e6e84827d7d6d6f6f6d6f7373706e8387b4ecedeeec' +
    '7674b485716e6b6c6e6f6f72757676767573727271706f706f6e6c6c6e7072850f0e0f0f7f817174757372716f6e6f6e6d6e717474716e7072716f6e82807e806f71706e6e7172706e7088d0ebedefd0' +
    '7874706f6e6b696a6d6e6e6f71737373716f6f707274757573706d6d6f7171840d0c0c0d7f0f727575858686706f6f6f6d6c6f73767572727270717285818184857272706f7171706f71b4eae9eaeceb' +
    '77736e6b6c6c6b6b6d6d6b6c6e717372706f6f707275787876716e6c6d6f830d0b0a0b0c6d6f717487868788d06e6f716f6d6d70747473747371707372838284848472727373737271707198e5e5e698' +
    '7674706c6c6f6e6d6d6c6b6c6f747776747474737274767875706c6a6b6e830d0c0c0c0c6c6d6f718483d0d0f0986e70706e6d6e6f6f707374706e6f6f8383828181847374747474716d6d6d9898986d' +
    '7676736f6e70706f6f6d6d6e717578777777767676777776726e6c6c6e84720f0f10100d6a6a6c6f6f80b4f0eeec986d6e6f6e6d6c6c6d7173716f6d818284848281b47474727374726d6c6d6b6a6968' +
    '7574726f6f71706f6e6e7071717274747476777879797874706e6f71858888121213120f7f6a6b6c6db4b4b4efeceb986d6f706e6d6d6d6e717372838183888a74b4737573707073727070716f6b6764' +
    '716f6f6f70716e6b6a6c70716f6e6f71727577767575757370717374868977151414121082816d6b6dd0d0d0f3ef986c6e7071706f706f6c6d727485848677787774737473706e7071727576736d6764' +
    '6d6f717171706d68686c6f6f6c6c6e7072737473706e70707072747298851415141313738685b46d6e73d0d0d0d0b4b46f71716f6f71716d6c7073868689787774717070706e6d6e7072767875706a65' +
    '6e7273716e6d6b696b6f716f6d6c6d6f717171716e6c6e6f707173707f0d10111111138875d0856f6f72d0d0d0d0d0b46f706f6c6c7071707072868586898b8a856e6d6d6d6c6b6d7071737675726c67' +
    '7172716e6b6a6a6a6e727472706e6c6d707070737270717170707372800c0c0d0d0e1087d0f1d0726f81b4d0d0d0f2b46d6f6e6b6b6e70727387878584868988846f6f6f6e6c6c6f6f6f71757775706a' +
    '86716e6c6b69696b6e727473726f6c6c6f717274767676736f6f72736f0d0d0d0b0b7e8283b47387b498b4b47374726f6e6e6e6e6e6f7072738687858383858672737373716e6f706e6e71767878746f' +
    '986e6c6c6b69686a6c6e70706e6d6c6c6f717171747777726c6b6e71700e0e0e0d0d6d6d6c7e8284826e6f6f707272716e6c6e7073737272848687848283867475767674727071717071737475767471' +
    '73706d6d6d6a67696b6c6c6c6c6c6d6d6e6f6f6d6f73746f6a696c6f700f0e0e0e0e6f987e7d7f81826f6f6d6e7072706e6c6d70747675878587888583858a787877767573716f6f7173737170706f6d' +
    '77736f6f716f6b6b6d6e6d6c6d6e706e6c6b6c6c6d70706d6b6b6d6f72710e0d0e0e8281818283838471706d6e7172716f6d6d6f7374748684867675888a8b787777787674716d6d7074736f6d6e6c68' +
    '78746f6f72726f6e717272706f70716f6b6a6a6b6c6e7070706f6e6f72710f0e0e0d6d80828775747473716f71727373716e6b6d7172986d6d707477788d8a747476787774726f6e7174726e6d6e6c68' +
    '73706c6c71726f7073757674706e6e6e6d6b6a6a6b6d6f7172716e6e717170100f0d0c81707377777573717173747574716d6a6d717298806e7173758c8ed07372747675747574727374726d6d6e6e6d' +
    '6e6c6a6a6f706e6e73757674716e6c6c6e6e6d6d6c6c6c6d6f706e6f717271700f0d0d0f107289777673707072737373716e6d707372989872747184888bd0737273d075767879777574716f6e6f7071' +
    '6a6c6c6c6e706e6e7072747473986e6d6f71706f6e6c6967696c6e717373716e6d6c6d0e0f0f11147774706f6f6f707171707173736f98987388838083d0887487d0d0d075777a797572717272707071' +
    '986e6f6e6f706f6e6e6f71737386826e70706f6f6f6e6b67686c6f7172726f6c6a6a986f70b475d07673706e6d6e717475737474707c7a7e84b48281837476d0d0d0d0b4b4d07878736f6f72716e6e6f' +
    '8471707071706f6e6d6e6f707298987071706e6d6f706e6c6d6f7071706e6d6c6b6c6f72737576767573706e6d6e7377777675857f7a797b98b484848688d0d0d0d0b4b4b4b4d076716d6c6d6d6c6c6e' +
    'b471717272989898986d6e6e8498987071706e6e7071707272717173726e6d6e6e6f7173747574737373716f6d6e7275758988847e7e7f9898b4858686d0737272d0b498b4b4b4726f6d6b6b6c6d6c6d' +
    '88717186859898987d989898846e6d6f706e6e71737270727471717574706d6e6f70717272716f6e0f1111716f6f7071718585706f84d0efb4d0b48588747272d086846f6e98816c6b6b6a6b6e6f6e6e' +
    '727098818081986f6c989898856f7072706d6f7476726e70b4b46f71716f6d6d6e7072716f6e6c6c0f1113131170707070706f6f71d0f2d0d07271878b77757472836d6c81817f6968696b6d70727274' +
    '6e6d6b7d7d81859898989898717273b4b46f727777726eb4b498986d6c6b6b6b6d707374726f6e6e7175771312117171706f6e6f7273d0b4d07170878b7876736f6d6b6c6f856f6c6a6b6e707389d07a' +
    '6d6c6b7d7f8386869898986d7071989898b4d0f5d084b4b4b498696a6b6a6a6a6b6e737675706e707375757412121111116f6f727371b4b4b4d0b485757572706f6f6d6e707272706d6c6f7172d0d090' +
    '71706d6d83848572b498986d6d6c6c98b4b4d0d0d0b4b4d0d06c68696d6e6d6b6a6d7175746f6c6e7174737286111213131171737270b4d0d0d0d0d087716d6d70716f6e6f7172716c6a6c6e6f72d08c' +
    '7574706e6f6f6f7188d0b4b46f6d6d71b4d0d0d0b4b4b483706c68696e71706d6c6d6f72726f6d6d6e71d0d0d085731313131183707082d0d0d0d0d0d0b46c6d6f716f6c6d7073706b686a6e70718598' +
    '7674706d6d6d6e71b4b4d0d07472727475d0d0d0b4b4986c6c6a68696d70706f986e6e70717273706ed0d0d0d0d073731112100e0e1083b4d0d0d0d0d083b46f7172706d6d70716e6a696a6d7171817d' +
    '72726f6d6e7072729898b4d0d0d0d0d08ad0d0d0b4b4986a987d7e6cb4b470b4b4b4706f7175767398d0d0b4b4727373721111101011106fb484d08787848373747373716f6f6d6a696a6a6b6f6f8098' +
    '6c6f707072757573989898b4d0d0d0d0d087d0d0b4b49898edb4b4b4b4b48381b4d0d071717577746fb4989898b473767775141311100f6e818373878787868876747474726e6b696a6c6a6a6c6d6d6e' +
    '696e71737474737284b4b4b4b4b472747471b4d0d0b4b4f1f3d0d0b4eeefb46f85d0d0d0737575726e989898989871777b7a1513100e0e6eb47275757576d08988727172716e6b6b6e6f6c696a6b6c6e' +
    '6a6d8398b4706f7072b4d0d0b470707273707072d0d0f4f5f8faf8f2edeb98988576d0d0d074d084b46d98989898b4757a7b77120f0e0f84d074767675d0d0d085816e6f6f6f6d6d70706c69686a6b6d' +
    '6c6c7f9898986d9885b4d0b4b4986e6f707070727272d0f4f6fbfcf6efea9898b47389d086d084b4ed6f6d6d98989872767775131110118788747576d0f2d0d0817e6e7070707070716f6c69696b6e82' +
    '6d6b989898e5e3e398b4b4b498826e6d6d6d6e70717272d0d0f7f9f6f09898989898b488727283816e707171706f70717172751613111112868788d0eeeceb987e986f717070717271706e6d6c6e72d0' +
    '6c6c9898b4e8e6e5e8b4b498816f6f6d6c6b6c6e72727271d0d0f1efec9898989898b4d07474726f6f71727171717183b471751715131212868572b4ece9e7e6986e717270707070707171706f6f74d0' +
    '6d6fb4b4d0b498e3e6b4b4986f7071706e6d6c6f727270707082b4eae89898b470707274767776737272706e6f716f818373757716161514887271b4b4ece8986f70717271706e6d6f717272707173b4' +
    '6e70878ad0b4989898e6987170727472706f6e70727270707171b4e998989871727374767878767474726f6d6f706d6e737676761516158a757371b4d0d0b498b471707172726f6e6f72737371728698' +
    '6d6e708789b472848298717172757673706f7071737473727270989898986e70717275777776747272716e6e706f6d70757776121111737273747475d0b49898b4716f6f717373727173747371738598' +
    '6f6f7071737474738571b4b4737675716e6f717275767472b4989898986e6d6d6e707274737272717070706f6e6d6c70757713110f70706f71757776d0b4b4986f6f6e6c6d7175757271727171737280' +
    '6e6e70707071747573b4e8b4867575716e6f7172737473b4b4b4b4b4986d6c6c6d6e707272737473707172706d6b6c70751413100e6f7071747878767488b4706e6f6e6a6a717777736f70727374716c' +
    '696a6d6f6d6f7475b4e7e3e398897774706f6f7071727198b4f2d0d0827e6b6d6e6e83b47477788a717073726d6a6d728a15130f0d0d8374787a79757374866e6e716f6a6a707778736f71747676706a',
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
    75, 77, 156, 157, 158, 236, 237, 238, 239, 316, 317, 318, 395, 396, 397, 398,
    399, 476, 477, 478, 524, 603, 604, 605, 684, 685, 686, 764, 765, 1975, 2054, 2584,
    2663, 2664, 2668, 2669, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2823, 2824, 2825, 2826,
    2827, 2828, 2829, 2861, 2885, 2886, 2887, 2905, 2906, 2907, 2908, 2940, 2941, 2942, 2965, 2966,
    2967, 2968, 2986, 2987, 2988, 3020, 3021, 3022, 3023, 3047, 3048, 3067, 3068, 3101, 3102, 3129,
    3147, 3370, 3449, 3450, 3451,
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
    1080, 2520,
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
    { col: 40, row: 13 },
    { col: 40, row: 31 },
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
