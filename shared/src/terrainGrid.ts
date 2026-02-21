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
    'ggggfhgfwgghfhgghfgggffwfhfgwwwwwwwwwggggggggwfhmmmhhhhggggggggggggggggwgggggfhg' +
    'ggggggggggggggggfggggggfhgwwwwwwwwwwwwggggggffhhmmmmmhhhggggggggggggggggggggggfg' +
    'wgggggggggggggggggggggggggwwwwwwwwwwwwwfgggffhhhmmmmmmhhhhhggggggggggggggggggggh' +
    'wgggggwgggggggggggggggggggwwwwwwwwwwwwwwggggghhhmmmmmmmhhhhhhgggggggggggggggggff' +
    'ggggggggggggggggggggggggggwwwwwwwwwwwwwwwggggghmmmhhmmmhhhhhgggfggggghhggggggggf' +
    'ggggggggggggggggggggwgggggwwwwwwwwwwwwwwwwffggfhmmhhhmhhhhhhfggfgggggmhhgggggggh' +
    'gggggggggggggggggggggggggfwwwwwwwwwwwwwwwwggggfghhhhfhghghggggggggggggmmgggggggg' +
    'ggggggggggggggggggggggggffwwwwwwwwwwwwwwwwfggggfhhhhgfgggghggggggggggggggggggggw' +
    'gggmhgggggggggggggggggggfgwwwwwwwwwwwwwwwwwgggfhhhhmhhggfhhhggfwgggggggggggggggf' +
    'ggghfggggggggggggggggggggfwwwwwwwwwwwwwwwwwhgghmhhmmmmhghhhhhhfggggggggggggggggg' +
    'wgggffgggggggggggggggggggwwwwwwwwwwwwwwwwwwwghmmhmmmmmhhfhhhhhhggggggggggggggggh' +
    'ggggffggggggggfffffgggggggwwwwwwwwwwwwwwwwwwffhhghmmmmhhggfhmmhfgggggggggggggggf' +
    'gggghhhggghhfffffhfwgggggggwwwwwwwwwwwwwwwwwghhhgghmmmhhgghhmmhfgggggggggggggggg' +
    'ggghhhhhhhhgffhfwgwwwggggggwwwwwwwwwwwwwwwwwghhmgghhhhhhhgghhmmhggggggggggmggggg' +
    'fgghhghhhffhhghgggggggggggffwwwwwwwwwwwwwwwwwghhgggghhhhhhggghhggggggggggggggggg' +
    'hfggggghffffggggwggggggggggffwwwwwwwwwwwwwwwwwggggggfggghggggggggggggggggggggggg' +
    'ffgggggghfgggggfwgggwggfwgggggwwwwwwwwwwwwwwwfgggwgggggghggggggggggggggggggfhggg' +
    'hhgggghhhggggggfgggwgggffffffffwwwwwwwwwwwwwggggggggggghhhgggggfgfggggghhggwffgg' +
    'ggggggfhhhgggggggggghggfggffffggwwwwwwwwwwwwggggggggggghhhgggfffffggghfhhffghhgg' +
    'ggggggfhhggggggggggghfggggffffggwwwwwwwwwwwwgggggggggggfhmhfffffffhghffgfhhhmmhf' +
    'ggggggghhfwggggggggwffggggggffgggwwwwwwwwwwgggggggggggfhhhhhfffffffffffwghhhmmmh' +
    'gwgggggghhfhhhgggggwfhggggghhfgggwwwwwwwwwggggggggggggfhhhhfgffffffffhfghhhhhmmm' +
    'ggggggggggghhhhgggggghhgggghhggfffgfwwgggggggggggggggggghhgggffffgghhhhffffhhhhm' +
    'gggggggggffhhhhhhhhfwghfggghhfhfffggggggggggggggggggggggggggghffhgghhfggffgfhfgh' +
    'ggggggggffhhhhhhhhhffffffhfhhgffffgggggggggggggggggggggggggggggghgffffgghgggffgg' +
    'ghhggggghhhhfhhhhhhfffffffgfgffggfhgggggggggfgggfffggggggghffgggffgfffhhfggggwgw' +
    'hhhhggggghhgwfhfhhhffffffwwwffhggffgggwgggggfggwgwfgggggghhhgfggfffhhffhgggggggg' +
    'hhhhhhfgghfgghghghfffffwwwwwwwfgggwgggwggggggggfhgggggggghhhhfhfgfhhhghmhggggggf' +
    'mmmmmmhfhgggghffhhhfwfwwwwwwwwfffwgggwggwfgggffwfhggggggghhhhhfhfgghfgghfggggggh' +
    'hmmmmhmhhgggggfffhfffwwwwwwwwwwfgggggffffffgggwfhhgggggghfhhffghhggfgghhfggggggg' +
    'fhhmhghfgggggggffffffwwwwwwwwwwfggggffffffhgggghggggggghmhhhgfhhhggffhhhfggggghh' +
    'ggghgggggggggfhhfhfffwwwwwwwwwwgggggwfwwhghggghffwfggghhmmhhhghhhhhhfffgggggghmm' +
    'fghfgggggggggwggwfgfffwwwwwwwwgggggggggghhgggghfhfgggghhmmhhhhmmmmhhhfffgfhhfhmm' +
    'fhmhhggggggggggffwgffffwwwwwwwgggggggggghffhggggggghfhfhhhhghmmmmmhhhffggfffhmmm' +
    'fhmmmggggggggggghgfffffwwwwwwffgggggggwggwffgggggggfffhfhhgghmmmmhggffggggghghmm' +
    'wghmggggggggggggffwggggggwwwffggwffgggffggghfggfggghfffffhgghmmmhgggggggfghhhfhm' +
    'ggghgggggggggggfhgggggggggggwwggwwfhgwfhfhhhhhffgggggffffggghhmhmhggggggfhhhhffh' +
    'gggfhggggggggggwfwfwfgggggggffgfffgfgghhghhhhfffhgggghfgggggghhghfgggggghmmhgghm' +
    'gggfhgfgggggggggggwwfggffhggwwfffffhgwgggfggfffhffggggffgggggggggfggggghmmmhhffh' +
    'ggghmhfggggggggggfwwggghffffgwffhggggfhggfggffhhhggggffffgggggggggggggghmmhhmhfg' +
    'wggfhgggggggggggwfggggggfwfwggfhmgggghfgffgghhhhhhghfggfffgggggggggggghmmhhghfff' +
    'gfffffggghfgggggfwwggggggwggwfhmggggggffffgggfhhhhhffgggffgggggggggggfhhmhhgggfg' +
    'hhfffffgghhgggwfgwggggggggggwfgggggggffffffgfffhhhhffhhfffggggggggggghhhmmhhgggg' +
    'gfhggfgggfgfwgghfgggwgggggggggggggghfhfhghgfhfghhhhgffghffggggggggggggfghmmhfgwf',
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
    '6f6e6f7184b4778a157775b483986a6c987f6b6e718584108dd08c7314171814100f1011117271727476797874108198e7e8e9b4b498b47375747374777977747374757573726f0d6c6f717372849870' +
    '6f7173716e6e7071727473706d6a6a6c806d6e7173716f82d07a1714131516141110101212127272747779798a87d0b4e9eaecebebb4d0d0767573727475726e6f7274747472706e6e707272706f816d' +
    '117475706b6a6a6b6d7071716e6a6a6e6f6e6f7172706d6b707718151313131211101113131211857274788e8bd0d0d0ececededeef0d0d0d0d0b47172716e6b6d71737374737170717273726f6e6e98' +
    '1274736f6d6c0c6a6a6c7072706b6c7072706f6f706f6d6b6e741615111010100f101213131210106f71757775d0d0d0efedecedeff0f0d0b4b4b4b4b46f6e6e7071717172727070727373716e6d8386' +
    '70717070706f6d6a696b6f72706d6e71727170717171716f6f7213120e0d0e0d0c0e111211100f11117172737373d0f0efedb4b4edeeeeb4b49898b46f6f6f8472726f6e7098986f7172716e6c6c6e85' +
    '6e6f707171706d6a6a6c70737270707171717374117271706f6f0f0d0b0c0d0c0b0c0e0e0f0f0f1213128484727589d0ececb4b498e9b4d0d09898988070718673726e6c6ee498987172716e6b6a6c98' +
    '6d707271706f6d6c6c6e73767572707070707273716f6d6e6f810c0a090a0c0b0b0b0c0c0e0f1012131372717174897098b4b4987d986cb471b46b6b6e72737373726f6d6e6ee1e16f7274716d6b6c6c' +
    '6f7273716f70706e6d6e727474726f6e6d6e6f6f6e6c6a6b82830b09090b0c0b0b0d0d0c0e0f0f0f111185706e71717f98b4b4986a7e6d707170986d71737270717171706f6e6c6c6c707575716e6e0c' +
    '6f7274e69871726f6c6c6e7071706e6d6c6b6c6d6e6e6c6c816f0d0b0b0e0f0e0e0f0e0d0e0f0f0e0e0f106f6d6e81b4b4d0b4ed98b4717184d0b4b47372830d6e6e6f6f6e6d6d6b696b717574706d7f' +
    '6b6f71988272726e6a6a6c6f71706e6d6c6c6e707374726f6e820e0d0e10111111100e0d0d0e0e0d0c0e11987170b4eed0d0f3f2f1f3d071b4b4b4b4d0b4826e6c6b6c6d6c6c6b6a67676c71726f6b69' +
    '0b6d6e6d8185716d6a6b6c6f7272706f6e707274767777736f0d0e0f1012111010100f0e0d0d0e0d0b0d111474d0eff1d0f8f8f7f5f6d0d081b4b4b4b498986d6b6a6b6c6c6b6b6a69686a6d6e6d6b98' +
    '6b6d6e6d8184716f6e6f6e6f727487858283867476777876716f0e0f1011100e0d0e10100e0e0f0e0c0c10138784b4d073d0f9f8f5f4d0b46e6f83b4e8e5987e6a6b6e6f6e6e6f6f6d6b6b6c6d6f6f81' +
    '716f6e6e9898b4727373b4b48585848280988411757575747270700e0e0f0e0c0b0e11110f1012100c0c0e0f71b4d0d07273d0f5f3f2d0d0706fb4b4e7e698816d6d6f70717374736f6d6c6e71747471' +
    '76726f989898b4d0d0d0d0748683987e0a6e1012127271717272720e0d0d0e0c0c0e100e0e101211100e0c0c6fd0d0f37473d0d0d0d0d0d0d072709898e5e9b46f6d6c6e707273716e6ce37377787775' +
    '887373b49870b4b4d08887b4b46f986b6b6f7475726f6e70727388870d0d0e0f10100f0c0b0d1012120f0a090c71d0d07776726fb4b4b4d0d0d0746f6b9898716f6b6b6d6f706f6d6b6b707679797879' +
    '98857574706f70b4868784826f6e6e6e0d6e70716f6d6e7173737387860e101314120e0a090b0d10110f0a070a0d717275757370846f6e6cb47476726d6c6f71706d6f72726f6d6b6a6a6e757776787b' +
    '8183747572707071b486706e6e6f70840f6d6d6d0c6c6d83117271717172121415120d0a0a0b0c0d0f0e0b08087e6d6e6f0f727271716f6b987074726e6c6f71706f727575726e6c6b6a6c85d074767a' +
    '9898737473709898b472716f6f7070826e6c6a0b6c6c6b808385848385878912110f0d0b0c0c0d0e0f0f0e0c6a6a6c6d6e7071727273709898986f6e6d6d6e816e81707375747198986b6c0e84857578' +
    '6c707474726f809898b4737271716f6d6c6a696b986c6c8070718383868772710f0f0e0e0d0d0e0e0f1010106f6e6f70717170707273709898986d6c6d81807e8082707072d085989881816d98987477' +
    '70747675726e80989871747574726f6e6e6c6b6d98806d707271838487887270101011100e0c0d0e0f1012127270717373726f707374708098e9b482828482808286b4709884836f83b4b498e2e4d08c' +
    '75777876726f6fb4b48711747573707072706d0e82806c6e717171728786706f711111100d0c0d0e0f1112747371707274716f707272829898d0d0d086858383858684828282810c70d0d0d0e5e5ead0' +
    '7815767472707175d0d083b4b4b4707175736e0c81986b6b6f7171b4b4846e6d6d0f100f0d0e0f0f0f11747473706e7072706e6e6f6f809898d0d088728382838482828384b4816c98d0d0d0b4e6e9ef' +
    '767573716f70717576726f98b4b4b47377746d696b98986b6e706f98b472707f7d7f70830f10747472727170706e6c6f716f6d6d6d6e6e6e98b472716f818182816d6e9898b4b48182878bd0d098b4ec' +
    '7474716e6e6e6e6f718383b4b4b4b4d0d0d0987c0a69987c6d6e6e98b487b4837e7e6f717173767675716d6b6b6b6d707271706f6e6f72727070717171b48384b46e6e98988472728487768ab48371d0' +
    '7373716f70716e6c7f83d0d0d0b4b4b4d0d0b481807d7a7a7c98829898728886817e6e717374757675706c696a6c6e717373727170707374716f707172717172d072828081847474d075767587857374' +
    '71b4b4717375726e98b4d0d088989898b4d0d08886817c79797f72856f8386726f7f986f74767675736f6c6a7f6f71718585836f6f6f7172706e988284706f71878771828386d0d08774757575117311' +
    '9898b4b47376767372d0d074107e9880b4d0d0898885817d7c0e1212828098706e7e7d6e74771374726f6d6c817374116e0c7f6c6e6e6f6f6f98989870826d6f868786d0b48486d0747271727272716f' +
    '9898b4b4b4d08a75729882706f986998709883868887860f0d0e100f0e0d806e6d6c0c6f7373107171706f6d6e73748198696a6c6d6f6f6f70b4b4b4d083b4837489d0d0b46fd0f2d0726e6c6c6e6e7f' +
    'e4e6e9ebeaecd087986b6c6f71987f8198989884108712110f0e0d0c0c0e8282810e6f70710f6e7010836f6f7186850e7a986b6d6e7171706fb4b4d0d0d084d08c7978d0836f73d08a716c68686a6d98' +
    '98e5eaeeefd0efb4986a6b707371838384988486881110100e0d0c0a0b0e10836f7071706e808185868280717474128198986b6e71737270b482b4d0858573d0d07876856f6fd0d088716d69686a6f71' +
    '8298b4eed079d0846e6d6f71727171878787888a8a11100e0d0d0c0a0a0d10816e70716f8181858988829870737473b46e6a6b70737372b4e9b4d0d07184d0d0d074728383b4b4d087726f6c6b6db4b4' +
    '6e6f72d07675716e707273747387d0d08ad08a8a8a12110f0e0e0e0d0c0d0d6c6c6e6e6f0f8211149871986e7172b486840f7f6f7171b4b4e9edd0d0d071d0d0d0d0d0d086848473747271706e98e8e8' +
    '7f6d9884706f6c6b6f73757675127677138975878687110f0f10111110106d6b6b6b6b6e6f6f7176d0d070717372b485b4846e6d6f71b4b4eceed0d0d0d0fafcf9f4d0d0d08585887588d0d083b4e7e6' +
    '7c98e098986a696a6e727374747576898612738483858610101111111111706d6c6a696d70717274d08988d07774717070706e9882d085b4b4b4986dd0f5fcfffbf4d0d0d084857475898887d0eae7e3' +
    '7998dddcdb68696a6d706f6d6e727472987082828283861212100f0e0e8385726f6a686b717512737210898b7774706e6e7171818184d08298986a6bb4f3fafffbd06e6e82847172737375d075d0e5df' +
    '096998de696a6b6c6e6f6d6a6b70727183810f6e6e6f727474110e0d7e8071730e7d7a6b71748684707273d0877270806e7172987e8083817d986a6cb4f2f6fad0716f6e6e6f71708370d0d0b48198dd' +
    '6a6d6e986c6e6e6e6f6e6c6b6d707082b471706f6e6f71727171706e0d0d6f700c097b987111819882b4b4b4b4b482806f71716c687b7f7f7d6a6c6fd0d0f4d0f5d072706e6f71718298b4b4987d7d98' +
    '71717082987070706f6d6d6e6f6f6e0e82118610826f71706f6f6f6f807f6d7e7d7c6b80706f989870b4b49898848382b4716f6a66987d6b6b6d707071d0d071d086727170717271b4e8e9b46e6c98e0' +
    '77757386b4728571706e6f6f6f6e6c6b6d6f111084717284839870711212827f7e7f80986d0c6c6f748a7370828383b483836d69676a7e7f6c6e706f6e7071706e827070717272b4e9e8eab4b4828098' +
    '787676d0ecb48371706f70706f6d6a68697e0e0f717273b48485878877158581986e6e6c6a7c9871778e76728382b4b4b46f6c6b6c8183827f6d6e6e6d6f706e6c6c6e6e6f7071b4eae8b4d0ebb48371' +
    '13747388b46e6d6e6d6d71716e6c69670b7c6b6c6f7272708310881477768598e5706e6c6b987f718c8e77739898b4b4b4986e9883737484807e6c6e6f6f6e6c6c6e6f707070d0efedb4b47198828486' +
    '74848282817e6b6c6b9886736e6b69687a0d0c6b6e71716f6f107373128598e572726e6c6d6f83878b8c75716e8198989898988486747371817d6a6c6f6f6d6c6e7072727285d0d0edb4986d6c6d8473' +
    'd0b48181807f7f6c6eb4d0746f6c0b7c6a0d6b6d707271707071706f0f83717274726d6c7087898b8d8d8a72848483989898b48685b4b48483806c6c6e6f6f6d6e71727171b4b4b4e6e398986a6b7074' +
    '7a89b46f70836e6e718774870e6e6d987c6a6c701274737272726f6c6c6f727574706d9885d08dd07cd0788bd08971b4b4d0d074817e6c9883826f6d6e71716d6c6f716f6e6e806a98dde0987b690e87',
};

const TERRAIN_TYPE_BY_CODE: Record<string, TerrainType> = {
  w: 'water',
  g: 'grass',
  f: 'forest',
  h: 'hills',
  m: 'mountains',
  u: 'unknown',
};

type TerrainElevationQuantizationConfig = {
  min: number;
  max: number;
  swatchCount: number;
};

const ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE: Record<
  TerrainType,
  TerrainElevationQuantizationConfig
> = {
  water: { min: 8, max: 28, swatchCount: 2 },
  grass: { min: 104, max: 120, swatchCount: 1 },
  forest: { min: 116, max: 138, swatchCount: 2 },
  hills: { min: 152, max: 208, swatchCount: 5 },
  mountains: { min: 218, max: 248, swatchCount: 18 },
  unknown: { min: 112, max: 112, swatchCount: 1 },
};

function buildTerrainElevationLevels({
  min,
  max,
  swatchCount,
}: TerrainElevationQuantizationConfig): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || swatchCount <= 0) {
    return [112];
  }

  const levels: number[] = [];
  for (let index = 0; index < swatchCount; index += 1) {
    const ratio = swatchCount <= 1 ? 1 : 1 - index / (swatchCount - 1);
    const byteValue = Math.round(min + (max - min) * ratio);
    levels.push(Math.max(0, Math.min(255, byteValue)));
  }

  return Array.from(new Set(levels)).sort((a, b) => a - b);
}

const ELEVATION_LEVELS_BY_TERRAIN_TYPE: Record<TerrainType, number[]> = {
  water: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.water,
  ),
  grass: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.grass,
  ),
  forest: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.forest,
  ),
  hills: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.hills,
  ),
  mountains: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.mountains,
  ),
  unknown: buildTerrainElevationLevels(
    ELEVATION_QUANTIZATION_BY_TERRAIN_TYPE.unknown,
  ),
};

function quantizeElevationByteToPaletteLevel(
  elevationByte: number,
  levels: readonly number[],
): number {
  if (levels.length === 0) {
    return 0;
  }

  const clampedElevationByte = Math.max(0, Math.min(255, Math.round(elevationByte)));
  let closestLevel = levels[0];
  let closestDistance = Math.abs(clampedElevationByte - closestLevel);
  for (let index = 1; index < levels.length; index += 1) {
    const level = levels[index];
    const distance = Math.abs(clampedElevationByte - level);
    if (distance < closestDistance) {
      closestLevel = level;
      closestDistance = distance;
    }
  }

  return closestLevel;
}

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
    48, 49, 50, 128, 129, 130, 131, 132, 208, 209, 210, 211, 212, 213, 288, 289,
    290, 291, 292, 293, 294, 367, 368, 369, 372, 373, 374, 448, 449, 453, 469, 550,
    551, 691, 767, 770, 771, 772, 773, 846, 847, 849, 850, 851, 852, 853, 930, 931,
    932, 933, 940, 941, 1011, 1012, 1013, 1020, 1021, 1101, 1102, 1596, 1597, 1676, 1677, 1678,
    1757, 1758, 1759, 1839, 2240, 2241, 2242, 2243, 2244, 2245, 2321, 2322, 2323, 2324, 2326, 2403,
    2456, 2536, 2537, 2558, 2559, 2616, 2617, 2622, 2623, 2624, 2625, 2638, 2639, 2642, 2701, 2702,
    2703, 2704, 2705, 2717, 2718, 2719, 2722, 2723, 2724, 2781, 2782, 2783, 2784, 2798, 2799, 2803,
    2861, 2862, 2863, 2879, 2942, 2944, 3033, 3034, 3112, 3113, 3114, 3192, 3193, 3232, 3271, 3272,
    3311, 3352, 3432, 3433, 3513, 3514,
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
    763, 2520,
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
    { col: 40, row: 31 },
    { col: 43, row: 9 },
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
  const elevationByte = getActiveElevationGrid()[getGridCellIndex(col, row)] ?? 0;
  const elevationLevels =
    ELEVATION_LEVELS_BY_TERRAIN_TYPE[terrainType] ??
    ELEVATION_LEVELS_BY_TERRAIN_TYPE.unknown;
  return quantizeElevationByteToPaletteLevel(elevationByte, elevationLevels);
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
