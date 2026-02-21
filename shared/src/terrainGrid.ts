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
    'gwwwwwgghhggwwggffffgggggggggggggggfffffgfgfffggwwwwwwwggggggggggggfgggggfgffffg' +
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
    'gfffgggggggggggggggggggffgffffffffgggwwggggggggfffffffgfggwwwwwwwwgggggggggffffg' +
    'gfffgggggggggggggggffffffggfffffgggggwwwwggggggffffffgggfwwwwwwwwwwggggggggggffg' +
    'gffgggggggggggggfgfffffffgffffffggggwwwwwghgwwggggffffgfwwwwwwwwwwwgggggggggggfg' +
    'gfffgggggggggggfffggffffggffffggggwwwwwwwghgwwwwgggggggwwwwwwwwwwwwwwggggggggffg' +
    'gffggggggggggggffffggffgfgffggggwwwwwwwwwggfwwwwwfgggggwwwwwwwwwwwwwwwgggggggffg' +
    'gffggffggggggggfffffggggggfggggwwwwwwwwwghgwwwwwwwwfgwwwwwwwwwwwwwwwwwwwfgggggfg' +
    'ggffgffgggggggggffgffgggfffggggwwwfgggggghgggwwwwwwwwwwwwwwwwffffwwwwwwwwwwggggg' +
    'gfffffffgggggggggffffffffffgggwwwgggggghghgggfwwwwwwwwwwwwwggggggggwwwwwwwwggggg' +
    'gfggfffggggggggggfffgfffffggggwwggghgggggghggggggwwwwwwwwgghhhggghgggwwwwwwggfgg' +
    'gfgggffgggggggggggfffffggggffwwwghgggggfgggghhgggggwwwwggghgfwwwfgghggwwwwwwwwwg' +
    'ggfgffggggggggggggfffffggwwwwwwgggggfffffggggghhggggwwgghggwwwwwwwwghggggwwwwwwg' +
    'ggffgfggggggggggggggfgfgfwwwwfghhgggffgfffffgggghhgggghhggwwwggfwwwgghggggwwwwwg' +
    'gfffgffgggggggggggggggggggghhhhggggffffffffffggggggghggfwwwfggggwwwfggfffgwwwwwg' +
    'gffffffgggggggggggghhhhhhgggfgggfgfffffffgffgfgggggggggwwggggffgfwwwwgfhhgwwwwwg' +
    'gffffgfggggggfgggggggggggwwwwggffgffffggggfffgggggggggggggggfgffgwwwwgfffgfwwwwg' +
    'gfgfffffgggfffggggfgfgggggwwwggfffffggwwwwfffgggggggggggggggfffggwwwwgggggwwwwwg' +
    'gfffffffffffgffgfffggffffgwwwwgfffgggfwwwwgfggggggggggggggfffffggwwwwwwfwwwwwwwg' +
    'gffffffffffffgfffffffffggwwwwwgffffwwwwwwfggggggggggggggggfffffggwwwwwwwwwwwwwwg' +
    'gfffgfggfffffffffffffgfggwwwwgfffgwwwwwwwwggggggggffffgffffffffggwwwwwwwwwwwwwwg' +
    'gffffffffffffffgfffffgfgwwwwwgfffwwwwwwwwwwggggggfffffgfffffffgfggwwwwwwwwwwwwwg' +
    'gffgfgfffffffffffffffffgwwwwwgffgwwwwwwwwwggggggfffgffffffffffffffgwwwwwwwwwwwwg' +
    'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
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
    'ggggggggggggfhgghhhfhhhgghhfhhhhhgggfggfgggggggggggfhhhhgggggffgfgffgfffgfggfffg' +
    'ggggggggggggwgggghhfhghhhhhhhhhhfgggfgggggggfggffggghhhhggwgffffffffffffffgfgfgg' +
    'ggggggggggggwghgghhhghhhhhhhhhhgggggggggggggggwgggghhhhggwgfffffffffffffgffgfffg' +
    'gggggggggggggghgghfghhhhhgggggggggggggggggggggggghghhhggfgffffffggfffffffffgffgg' +
    'gggggggggggggghghhhhhhgggggggggggggggggfgggggggggghhgggwggfgffffgfffffggggfffffg' +
    'ggggggggggggghhghhhhhfggghhhggggghhhgggghhhhhfghghhggggggggggggfgggfgggggffffffg' +
    'ggggggggggwghhgghhhhgfgghhhhhhhhhhhhgfhhggghfhhhhhgggggggggggggggggfgggggfgffffg' +
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
    'wwwggggwwwwwwwwwwwwwwwfhhggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww' +
    'wwwggggwwwwwwggwwwwwwwghgggggwwwwwwwwwwwwwwwggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwww' +
    'wwwwggggwwwwggggwwwwwwggggggwwwwwwggggwwgggggggggggwwwwwwwwwwwwwwwwggggwwwwwwwww' +
    'wwwwwggggwwgggggwwwwwggggggwwwwwwgggggggggggggffgggggwwwwgffgwwwwwggggggwwwwwwww' +
    'wwwwwwggggggggggwwwgggggggwwwwwwwggggggggggggffffgggggggggggggwwggggggggwwwwwwww' +
    'wwwwwwgggggggggggwgggggggfwwwwwwgggggggggggggfffhhggggggggggggfffggggggggwwwwwww' +
    'wwwwwwgggggfggggggggggggwwwfwgggggggggggggggggfffhgggggggggggggffggggggggggwwwww' +
    'wwwwwwggggggggggggggggggwwffffgggggggggggggggggfffggggggggggggggggggggggggggwwww' +
    'wwwwwwggggggggggggggggggfffffffgggggggggggggggghffggggggggggggggggggggggggggwwww' +
    'wwwwwwggggggggggggggwwwffffffffgggggggggggggggggfgggggggggggggggggggggggggffwwww' +
    'gwwwwwgggggggggggwwwwwffffffffgggggggggggffffggggggggggggggggghhgggggggggfffgwww' +
    'ggwwwwggggggggggwwwwwffffgggggggggggggggffffffgggggggggggggggghhhggggggggggggwww' +
    'ggwwwwggggggggggwwwwwfffggggggggggggggggfffffffffffggggggggggghhhgggggggggggwwww' +
    'gwwwwwgggggggggwwwwwwffggggggggggggggggghffhhhhfffffgggggggggghhhggggggggggwwwww' +
    'wwwwwwgggggggggwwwwwwffggggggggggggggggggghhhhhhfffffggggggggghhhgggggggggggwwww' +
    'wwwwwggggggggggwwwwwwwghhhgggggggggghhhgghhhhhhhfffffggggggggghhgggggfgggggggggw' +
    'wgggggggggggggggffwwwwwhhhhggggggggghhhhhhhhhhhhffffggggggggggggggffffgggggggggg' +
    'gggggggggggggggghhggwwwwhhggggggggggghhhhhhhhhhhffgggggggffggggggfffffgggggggggw' +
    'fgggggggggggggggfhhggwwwwwwggggghhgggfhhhhggghhhfgggggggffffggggffffffggggggggww' +
    'fgggggggggggggggffhhgggggwwwwwgghhgggfffhgggghhhhgggggggfffffgggffffffgggggggwww' +
    'fggggwwwwwggggggfffffgggggggwwwwwggggfffggggghhhhhgggggggffffggggffffgggggggggww' +
    'fgggwwwwwwwggggggffffggggggggwwwgggghffgggggggffhhhgggggggfffggggggggggggggggggw' +
    'fgggwwwwwwwgghhhhgffgggggggggggggggwwwwgghgggggffhhhggggggfffgggggghhggggggggggg' +
    'ggggwwwwwwggghhhhhggggggggggggggggggwhggwwwggggggghhhggggggffgggggghhggggggggggg' +
    'gggggffgggggggggggggggggggggggggggggggggwwwwwggggghhhggggggffggggggggggggggggggg' +
    'ggggfffgggggggggggggggggggggggggggggggggghmwwwgwwhhhhgggggfffgggggggggggggggwwgg' +
    'wgggfffgggggggggggggggggggggggggggggggggghhhhggwhhhhwgggfffffgggggggggggggwwwwww' +
    'wwggffggggggggggggggggggggggggggggggggggghhhhggghhhwwwwwfffffgggggggggggggwwwwww' +
    'wwgggggggggggggggggggggggggggggghhggggggggghhgggghhhwwwwwffffgggggggggggggwwwwww' +
    'wwggggggggggggggggggggggggggggghhhhggggggggghhgggghhhggwwwwgwgggggggggggggwwwwww' +
    'wgggggggggggggffggggggggggggggghhhhgggggggggghgggghhhgggwghwghggggggggggggwwwwww' +
    'wggggggggggggggggggggggggggggggghhhggggghgggggggggghggggghhhwwwwgggggggggggwwwww' +
    'wggggggggggggggggggggggggggggggghhhggggggggggggggggggggggghhhwwwwwggggggggggwwww' +
    'wwggggggggggggggggggggggggggggggggggggggggggggggggggggggggghhwwwwwwggggggggggwww' +
    'wwggggggggggggggggggfffggggggggggggggggggggggggggffffgggggggwwwwwwwggfffgggggwww' +
    'wwwggggggggggggggggfffffggggggggggggggggggggggggffffffggggggwwwwwwgggfffffgggwww' +
    'wwwgggggggggggggggfffffffggggggggggggggggggggggffffffggggffwwwwwwwggffffffggwwww' +
    'wwwwgggggggggggggffffffffffffggggggggggggggggggffggggggggfwwwwwwwffffffggggwwwww' +
    'gwwwggggggggggggffffffffffffffggggggggggggggggggwwgggggggwwwwwggffffffggggggwggw' +
    'ggwwwgggggggggggwwgffffffffffgggggggwwwwgggggggwwwgggggggwwwwgggggwwgggggggggggg' +
    'ggwwwwgggwwwgggwwwwgffffffwwggggggwwwwwwwwggggwwwwwggwwwwwwfgggggwwwwwwwwwgggggg' +
    'gwwwwwwwwwwwwwwwwwwwfffffgwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwggggggwwwwwwwwwwggggg' +
    'wwwwwwwwwwwwwwwwwwwwwgfffgwwwwwwwwwwwwwwwwwwwwwwwwwwwwfwwwwgggggggwwwwwwwwwwgggg' +
    'gwwwwwwwwwwwwwwwwwwwwwwwgwwwwwwwwwwwwwwwwwwwwwwwwwwwwgfgwwwwggggggwwwwwwwwwwwggg',
};

const ELEVATION_HEX_GRID_BY_MAP_ID: Record<string, string> = {
  '280acd50-3c01-4784-8dc1-bb7beafdfb87':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '701010101010101010101010b0b07070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b0707070707070707070707070707070707070707070707070707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010b07c7070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c7070707070707070707070707070707070707070707070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7010101010101010101010101010b07070b0b0b0b0b0b0b0b0b0b0b0b0b0b0707070707070707070707070707070707070707070707070707070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010b07070b07cb0b0b0b0b0b07070707070707070707070707070707070707070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7c707c7c707c7c7070' +
    '70b0101010101010101010101010b070b0b0b0b0b0b07070707070707070707070707070707070707070707070707070707070707070707070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '7070b0b070101010101010101010b070b0b0b0b0b07070707070707070707070707070707070707070707070707070707070707070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707cb0b0b0101010101010b070b0b0b0b0b07c70707070707070707070707070707070b0b0b0b0707070707070707070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070b0b01010101010b070b0b0b070707070707070707070707070707070707070b0b0b0b0707070707070707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '707070707070707070b010101010107070b07070707070707070707070707070707070707070b07c7cb0707070707070707070707070707070707070707070707070707070707070707c7c707c7c7c70' +
    '707070707070707070b0101010101010b0b0707070707070707070707070707070707070707070707070707070707070707070707070707070b0b0b0b0707070707070707070707070707c70707c7070' +
    '70707070707070707070b01010101010101010b0b07070707070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0707070707070707070707070707c7c707cb070' +
    '70707070707070707070b0101010101010101010b0b070707070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b07c707070707070707070707c7c707070b070' +
    '70707070707070707070b010101010101010101010b070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c7070b070' +
    '7070707070707070707070b010101010101010101010b070707070707070707070707070707070707070707070707070707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7cb0b070' +
    '7070707070707070707070b0b0101010101010101010b0707070707070707070707070707070707070707070707c70707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c7070b0b070' +
    '707070707070707070707070b0101010101010101010b0707070707070707070707070707070707070707cb0b0107cb0b0b0b0b070b0b070707070b0b0b0b0b0b07c707070707070707c7c7070b0b070' +
    '707070707070707070707070b0101010101010101010b070707070707070707070707070707070b0b0b010101010101010101010b070707c707c7c70b0b0b0b0b07c70707070707070707070b0b0b070' +
    '70707070707070707070707c10101010101010101010b07070707070707070707070707070b0b07c10101010101010101010101010b070707c7c7c7c7cb0b0b0b07070707070707070707070b07cb070' +
    '707070707070707070707070b010101010101010101010b07070707070707070707070707cb0101010101010101010101010101010b07c7c7c7c7c7c7c7c7cb0b07070707070707070707070b0b0b070' +
    '70b070707070707070707070b01010101010101010101010b070707070707070707070b0b010101010101010101010101010101010b0707c7c7c7c7c7c707070707070707070707070707070b0b0b070' +
    '70b0b070707070707070707070b07c10101010101010101010b0b0707070707070b0b0101010101010101010101010101010101010b0707c7c7070707cb0b070707070707070707070707070b0b0b070' +
    '70b0b0b0707070707070707070707cb07c70b07c10101010101010b0b0b0b0b07c1010101010101010101010101010101010101010b0707c7070b0b0b0707cb0b0b07c70707070707070707070b0b070' +
    '70b0b0b07070707070707070707070707070707c7c7cb0101010101010101010101010101010101010101010101010101010101010b0707070b01010101010101010b0b070707070707070707070b070' +
    '70b0b0b07070707070707070707070b0b07c7c7c7c7c7c7c7c101010101010101010101010101010b0b0b0b0b0b07c10101010101010b0b0b0101010101010101010107cb07070707070707070707070' +
    '70b07cb07070707070707070707070b0b0b0b0707c7c7c7c701010101010101010101010101010b0b07070707070b0b01010101010101010101010101010101010101010b07070707070707070707070' +
    '70b0b0b0707070707070707070707cb0b0b0b0b0707c7c707c7cb01010101010101010101010b0b070707070707070b01010101010101010101010101010101010101010707c70707070707070707070' +
    '70b0b070707c7c707070707070707cb0b0b0b0b0b070707070b07cb01010101010101070b0b07070707070707070707c101010101010101010101010101010101010101010b070707070707070707070' +
    '70b0b070707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b070b0b0101010b0b07c707070707070707070707070b01010101010101010101010101010101010101010b070707070707070707070' +
    '70b0b07c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c7070707cb0707070707070707070707070707070b0b010101010101010101010101010101010101010b070707070707070707070' +
    '70b070707c7c7c70707070707070707070b0b0b07cb0b0b0b0b07070707070707070707070707070707070707070707070b01010101010101010107cb010101010101010107c70707070707070707070' +
    '70b07070707c7c707070707070707070707cb0b0b07cb0b07070707070707070707070707070707070707070707070707070b010101010107cb0b0b0b0b0b0b010101010107c70707070707070707070' +
    '70b07c707c7c7070707070707070707070707cb0b0b0b07070707070707070707070707070707070707070707070707070707cb0b0b07cb0b0707070707070b01010101010b070707070707070707070' +
    '70707c7c707c70707070707070707070707070b0b0b0b070707070707070707070707070707070707070707070707070707070707cb070707070707070707070b010101010b070707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070707070707070707070707070b0b0b0b070707070707070707070707070707070707070707070b07c101010b070707070707070707070' +
    '707c7c7c7c7c7c70707070707070707070707070707070707070707070707070707070707070b0b0b0b07070707070707070707070707070707070707cb0b07c70b01010101070707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707070707070707070707070707070b0b0b0b0707070707070707070707070707070707070b0b0b0b070b010101010b0707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070707070707070707070707070707c7c7c7c7070707070707070707070707070707070b0b0b0b0b070b010101010b07c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c707070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b070b01010101010b0b070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b07cb07070b010101010101010b0707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b0b0b0b07070b01010101010101010b07070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c7070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0707070b0101010101010107cb070707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070707070707070707070707070b0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707cb0101010101010107cb07c7070' +
    'b070707070b07070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  '30cae103-cb06-4791-a21d-241f488189d3':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70101010101010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070101010101010101010707c707c7c707070101010101070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010107070707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070707c10101010101010107c7c707c7c7c7010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70101010101010101010101010107c70707c7c7c7c7c7c7c7c7c7c7c707c7c707070707c7c101010101010107c707c7c7c7c7010101010101010707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70101010101010101010101010101070707c7c7c7c7c7c7c7c707070707070707070707c7c7c707010101010707c707c7c707010101010107c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70101010101010107c707c10101010707c7c7c7c7c7c707070707070707070707070707c7070707010101070707c7c70707010101010101070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '701010101010707070707070101010707c7c7c7c7c7070707070707070707070707070707c7c7c707070707c707c7c7c7010101010101070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '7010101010107070b0b07070101070707c7c7c7c7070707070707070707070707070707c7c7c7c7c707c707c7c7c7070101010101010107070707070707070707070707c70707070707c707c7c7c7c70' +
    '7010101010107070b0b07070101070707c7c7c7070b0707070707070b0b0b0707070b070707c7c7c7c7c7c7c7c7c7070101010101010107070707070707070707070707070707070707c7c7c7c707c70' +
    '70101010101070b0b0b0b0701010107c70707070b0701010107070707070707070707070707c7c7c7c7c7c707c7c70101010101010107c7070707070707070707070707070707070707c7c707c7c7c70' +
    '7010101010101070707070b070701010707070b0701010101010707070707070707070707070707c7c7c707070707010101010101010707070707c7070707070707070707070707070707c70707c7070' +
    '701010101010101010707070b0b0707c7c70b07070101010101010107070707070707070b070707c7c707070707010101010101010707070707c7c7c7c707070707070707070707070707c7c707c7070' +
    '7010101010101010101010107070b0b0b0b0707010101010101010101010107c7070707070b070707070101010101070707070707070707c7c7c7c7c707c70707070707070707070707c7c7070707c70' +
    '7070107070101010101010101070707070701010101010101010101010101010707070707070b07070101070707070707070707070707c7c7c7c7c7c7c7c7c707070707070707070707c7c7c707c7c70' +
    '707070707070101010101010101010101010101010101010101010101010101010101010107070b0101070707070707070707070707c7c7c7c707c7c7c7c7c7070707070707070707c7c7c7c707c7c70' +
    '70707070707010101010101010101010101010101010101010101010101010101010101010101070b07070707070707070707070707c7c7c7c707c7c7c7c7c7c7070707070707070707c7c707c7c7c70' +
    '707c70707070707c1010101010101010101010101010101010101070101010101010101010101070707070707070707070707070707c7070707070707c7c7c7c7c70707070707070707c7c707c7c7c70' +
    '707c707070707070707010101010101010101010101010101070707070701010101010101010707070b0707070707070707070707c7c707c707c7c70707c7c7c7c7070707070707070707070707c7c70' +
    '707c7c707070707070707010101010101010101010101010107070707070707010101010107070707070b0707070707070707c7c7c7c7c707c7c7c7c7070707c7c707070707070707070707c7c7c7c70' +
    '707c7070707070707070707070101010101010101010101070707c7c7c7070707070101010707070707070b070707070707c7c7c7c7c707c7c7c7c7c7c7c707c7c7070707070707070707070707c7c70' +
    '707c7c70707070707070707070101010101010101010107c70707c7c7c7c7c7c7c707070107c7070707070b0707070707c7c7c7c7c70707c7c7c7c7c7c7070707070707070707070707070707c7c7c70' +
    '707c7c7c70707070707070707070101010101010101070707c707c7c7c7c7c7c7c7c707070107070707070b07070707c707c7c7c7c7c707c7c707070707070707070707070707070707070707c7c7c70' +
    '707c7c7c707070707070707070707070707070707070707c7c707c7c7c7c7c7c7c7c707070101070707070707070707c7c7c7c7c7c7c707c707010101010101010107070707070707070707c7c7c7c70' +
    '707c7c7c7070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7070707070101010107070707070707c7c7c7c7c7c7070707c10101010101010101010707070707070707070707c7c70' +
    '707c7c707070707070707070707070707c707c7c7c7c7c7c7c707c7c7c7c7c7c70707070101010101070b0701010707070707c7c7c7c707c101010101010101010101070707070707070707070707c70' +
    '707c7c7c70707070707070707070707c7c7c70707c7c7c7c70707c7c7c7c707070701010101010101070b0701010101070707070707070101010101010101010101010101070707070707070707c7c70' +
    '707c7c7070707070707070707070707c7c7c7c70707c7c707c707c7c7070707010101010101010101070707c10101010107c7070707070101010101010101010101010101010707070707070707c7c70' +
    '707c7c70707c7c70707070707070707c7c7c7c7c7070707070707c7070707010101010101010101070b07010101010101010107c70101010101010101010101010101010101010107c70707070707c70' +
    '70707c7c707c7c7070707070707070707c7c707c7c7070707c7c7c707070701010107c707070707070b0707070101010101010101010101010101010107c7c7c7c101010101010101010107070707070' +
    '707c7c7c7c7c7c7c7070707070707070707c7c7c7c7c7c7c7c7c7c707070101010707070707070b070b07070707c10101010101010101010101010707070707070707010101010101010107070707070' +
    '707c70707c7c7c707070707070707070707c7c7c707c7c7c7c7c707070701010707070b0707070707070b070707070707010101010101010107070b0b0b0707070b070707010101010101070707c7070' +
    '707c7070707c7c70707070707070707070707c7c7c7c7c707070707c7c10101070b070707070707c70707070b0b0707070707010101010707070b0707c1010107c7070b0707010101010101010101070' +
    '70707c707c7c7070707070707070707070707c7c7c7c7c707010101010101070707070707c7c7c7c7c7070707070b0b07070707010107070b07070101010101010101070b07070707010101010101070' +
    '70707c7c707c70707070707070707070707070707c707c707c101010107c70b0b07070707c7c707c7c7c7c7c70707070b0b070707070b0b0707010101070707c1010107070b070707070101010101070' +
    '707c7c7c707c7c7070707070707070707070707070707070707070b0b0b0b0707070707c7c7c7c7c7c7c7c7c7c70707070707070b070707c1010107c707070701010107c70707c7c7c70101010101070' +
    '707c7c7c7c7c7c707070707070707070707070b0b0b0b0b0b07070707c7070707c707c7c7c7c7c7c7c707c7c707c7070707070707070701010707070707c7c707c10101010707cb0b070101010101070' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707c7c707c7c7c7c707070707c7c7c7070707070707070707070707070707c707c7c7010101010707c7c7c707c1010101070' +
    '707c707c7c7c7c7c7070707c7c7c707070707c707c707070707010101070707c7c7c7c7c7070101010107c7c7c7070707070707070707070707070707c7c7c7070101010107070707070101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c7010101010707c7c7c7070707c10101010707c70707070707070707070707070707c7c7c7c7c70701010101010107c1010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c70701010101010707c7c7c7c1010101010107c707070707070707070707070707070707c7c7c7c7c7070101010101010101010101010101070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707c7c7c70101010101010101070707070707070707c7c7c7c707c7c7c7c7c7c7c7c7070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707c7c7c101010101010101010107070707070707c7c7c7c7c707c7c7c7c7c7c7c707c70701010101010101010101010101070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c701010101010707c7c701010101010101010107070707070707c7c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7010101010101010101010101070' +
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  '3498110a-b6f5-41ee-89ec-67203559ed32':
    '70707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070b0' +
    '70707070b07c7c7cb070707070707070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b0707070707070707070707c70707070b07070707070707070707c7c707c7c707c707c7c707c7c7c707c70707c7c7cb0' +
    '7070707070b07c7c7c7070707070707070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c70707070707070707070b070707070b0b0707070707070707c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c70b0' +
    '707070707070b07c7c7cb0707070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b07070707070707070707070707c7c7070e6e67c7c7070b0b0b0707c707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c707cb0' +
    '70707070707070b07c7c7c707070707070b07cb0b0b0b0b0b070707070707070707070707070707070e6e67c7c7c7ce67c70707070b0b0b0707c7c7c7c7c7c7c70707c7c7c7c7c7c7c7c7cb07c7c70b0' +
    '7070707070707070b07c7c7c70707070b0b0b0b0b0b070707070707070707070707cb0b070707070e67ce67c7c7c7c7ce67c7c7c7cb0b0b07cb07c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb0' +
    '707070707070707070b07c7c7c707070b0b0b0b0b07c70707070707070707070707cb0b0707070e6e6e6e6707c707c7c70707070707070707c7070707070707c7070707c70707070707c7c7c7c7c7cb0' +
    '707070707070707070707c7c7c70707cb0b0b0b07c7c7070b0b0b070707070707c7c7c7c7c70b07ce6e6e67c7c7c7c7c7c70707070707070b0707070707070707070707c70707070707c707c7c7c7cb0' +
    '70707070707070707070b07c7c707070b0b0b07070707070b0b0b070707070b0b070707070b0b07cb0b0e67070707070707070707c7c7cb070707070707070707070707070707070707c7c7c7c707cb0' +
    '70707070707070707070707c7c7c70707070707070707070b0b0b0707070e6e6e67c707c7ce67c7c7c707c70b0b0b07070707c7cb070707070707070707070707070707070707070707c7cb07c7c7cb0' +
    '70707070707070707070707c7c7cb07c70707070707070707070707070e6e6e67c7c7cb0e6e6707c7c7c7c70b0b0b070707c7c7c7070707070b0b0b0b07070707070b0b0b070707070707cb0707c70b0' +
    '7070707070707070707070707c7c7c7cb0707070707070707070707ce6e6e6e67c70e6e67c70e6e67c7c7c70b0b0b070707cb07070707070b0b0b0b0b07070707070b0b0b070707070707c7c707cb070' +
    '70707070707070707070707070b07c7c7c7c70707070707070707ce6e6e6e67c70e6e6e6707c7c70e6707c7c707070707c7c707070707070b0b0b0b0b0b07c707070b0b0b0707070707c7c707070b070' +
    '707070707070707070707070707070b07c7cb070707070707070707070707070e6e6e6e67c7ce6e67c7c70707070707cb07070707070b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c7070b070' +
    '70707070707070707070707070707070b07c7c7c7070707070707070707070707070707070e6e67c707c707070707cb0707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7cb0b0b0' +
    '70707070707070707070707070707070707c7cb0707070707070707070707070b0b07c7ce6e67ce6707c707070b07c707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c7070b0b070' +
    '70707070707070707070707070707070707c7c7c707070707070707070707070b0b07c707070e6e6e67c7070707cb0707070b0e670b0b070707070b0b0b0b0b0b07c707070707070707c7c707cb0b070' +
    '7070707070707070707070707070707070b07c7c7c7070707070707070707070b0b07c707070707070707070707c7c70707ce670707c707c707c7c70b0b0b0b0b07c7070707070707070707cb0b0b070' +
    '7070707070707070707070707070707070707c7c7c7c7c707070707070707070707070707070707070707070b07c7070b07ce67c7c7070707c7c7c7c7cb0b0b0b0707070707070707c7c7c70b07cb070' +
    '7070707070707070707070707070707070707c7c7c7c7c7cb07c7c70707070707070707070707070707070b07cb070e6e67c7cb07070707c7c7c7c7c7c7c7cb0b0707070707c7c707c707070b0b0b070' +
    '70b0707070707070707070707070707070707c7070b07c7c7c7c7c7c7c70707070707070707070707070b07c7c70e6e67c7ce6707c70707c7c7c7c7c7c70707070707070707c70707cb07070b0b0b070' +
    '70b0b0707070707070707070707070707070b070707070707cb07c7c7c7cb07c707070707070707070b07c7c7070707070e6e67c7c7c707c7c7c707070707070707070707c707070b0b07070b0b0b070' +
    '70b0b0b07070707070707070707c7c7c7c7c70707070707070707cb07c7c7c7c7c70707070707070b07c7c7cb07c707070e6e67c707c707c7070707070707070707070b0b07070e6e67c7c7070b0b0b0' +
    '70b0b0b070707070707070707cb070707070707c7c707070707070707cb07c7c7cb070707cb07c7c7c7cb0707c7c7c7cb070707070707070707070707070707070707c7c7070e670e67c7c7c7c70b070' +
    '70b0b0b07070b0b0b07070b07c7070b0b07c7c7c7c7c7c70707070707070707c7c7c7c7c7c7c70b07070707070707cb07c7c7c7070707070707070707c7c7c7c7c7cb07070e6e6e67c7c7c7c7c7c7070' +
    '70b07cb0b07c707070b07cb0707070b0b0b0b0707c7c7c7c7070707070707070707c7c7c707070707070707070707070707c7c7c7c7070707070707c7c7c7070707070707070e6e67cb0b07c707c7c70' +
    '70b0b0b07c7070707070707070707cb0b0b0b0b0707c7c707c7070707070707070707c7c707070707070707070707070707070b07c7c7cb070707cb070707070707070707070707ce6e67c7c70b0b070' +
    '70b0b070707c7c707070707070707cb0b0b0b0b0b0707c7070b07c70707070707070b07c70707070707070707070707070707070707c7c7c7c7c70707070707070b0b07070707ce67ce67c7ce6e67c70' +
    '70b0b070707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b070707070707070707c7c7070707070b0b0b070707070707070707070707c7c70707070707070b0b070707070b0b0e67ce6e6e67c70' +
    '70b0b07c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c707070707070707cb07070707070b0b0b07070707070707070707070b07cb0707070707070b0b0707070e6b070707ce6e67c7c70' +
    '70b070707c7c7c70707070b0b07c707070b0b0b07cb070b0b0b07c70707070707070707c7c7070707070b0b0b0707070707070707070707070b07c707070707070707070707ce6e6e67c7c7c7c707c70' +
    '70b070707c7c7c70707070b0b07c7070707cb0b0b07cb0b070707070707070707070707c7c7c7070707070707070707070707070707070707070b07c7c7c70707070707070e6e6e6e67c7c7c7c707070' +
    '70b07c707c7c7070707070b0b07c707070707cb0b0b0b0707070b0b0b070707070707c7c707c7070707070707070707070707070707070707070707c7c7c7cb0707070e6e67ce6e67c7c7cb0e67c7070' +
    '70707c7c707c70707070707070707070707070b0b0b0b0707070b0b0b070707070707c7c70707c7c7070707070707070707070707070707070707070707cb07c7cb0707070e6e67c7c7c7ce6707c7070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b0b0b0707070b07c7c707070707c7c7c707070707070707070707070707070707070707c7070b07c7c7c7070707c707ce6e67c7c7c70' +
    '707c7c7c7c7c7c7070707070707070707070707070707070707070707070707cb070707070707070707c7cb0707070707070b0b0b0707070707070707cb0b07c7070b07c7c7070707ce6e6e6b0707070' +
    '707c7c7c7c707c7070707070707c70707070707070707070707070707070707c7070707070707070707070b07c7070707070b0b0b070707070707070b0b0b0b0707070707c7c7070707070e6b0707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c707070707070707c7c7c7c707070b0b0b0707070707070b0b070707070b0b0b0707070707070b0b0b0b0b070707070707c707070707ce67cb07070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707cb0707070707070b0b0b0707070707070707c707070707070707070707070b0b0b0b0b0b07070707070b07c7070e6e6e670b07c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707c7c707070707070707c7c7c7070707070707070b07070707070707070b0b0b0b0b0b07cb0707070707070707c7c7070707cb0e67c70' +
    '707c7c7c707cb0707c7c7c7c7c7c7c7c7c7c7c7c7c707c7070707c707070707070707070707070707070707070707c707070b0b0b0b0b0b0b0b0b0b0b0b0b0707070707070707c7c70707ce6e6e67c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c70707cb0707070707070707070707070707070707070707c7070b0b0b0b0b0b0b07070b0b0b0b0b070707070707070707c7c7ce6e6e6707c70' +
    '707c7c707cb07c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707c7070707070707070707070707070707070707070b07cb0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707070707070707c7070e6707c7c70' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b07070b0707070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b07070707070707070707070707070707070707070',
  '7391c2fe-3bbb-4805-b2e8-56b10dc042cf':
    'e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e67070' +
    'e67c7c707c7c7c7c7c7c7c707cb07070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b07070707ce6e67ce6e6e6e6e6e6e67070e6e67cb0b0b0b070707070707c7ce67c707c7c707c7c7c707c70707c7c7c70' +
    '707c7c7c7c7c7c7c7c7c7c7c7c70707070b0b07cb0b0b0b0b0b0b0b0b0b0b0b0e67070707ce6e6e6e6e6e6e67ce6e67c10e6e6b0b0b0b0b070707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '707c7c7c707070707c7c7c7c7c70b07070b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070707070e6e6e6e6e6e6e6e67ce67cb0b0b0b0b0b070707c707ce67c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70107c7c70b0b0b0707070707070b07070b07cb0b0b0b0b0b0707070707070707070707070e67ce6e6e6e6e6e6e6e6e6e6b0b0b0b0b070707c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c70b0' +
    '707c7c7070b0b0b0707070707070b070b0b0b0b0b0b07070707070707070707070707070e6e6707c70e6e670e670e6e6b0b0b0b07070707c70707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb0' +
    '707c7c70707c7cb07070707070b0b070b0b0b0b0b07c70707070b0b07070707070b0b0b0e6e6e6e6b0b0b0b0b07ce6b0b0b0b07070707070707070707070707c7070707c70707070707c7c7c7c7c7cb0' +
    '707c7c7c7070707070707c70b0b070e6b0b0b0b0707c7070b0b0b0b0b0b0b0b0b0b0b0b0e67cb0b0707ce6b07cb0b0b0b0b070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '707c7c7c707c707070707070b0b07070b0b0b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b07c7cb070e6e6b0b0707070707070707070707070707070707070707070707070707c7c7c7c707cb0' +
    '707c7c7c7c707c7010707070b0b0707070b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0707070707070707c7070707070707070707070707070707070707c7c707c7c7cb0' +
    '707c7c7070707c707070707070b0b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070b07070707070707070e670707070707070707070707070707070707070707c70e67c70b0' +
    '701010101010707c707070707070b0b0b0b0b0b0b0b0b0707070707070707070b0b0b0b0b0b0b07070707070707070707c7c7070707070707070707070707070707070707070707070707c7c707ce670' +
    '7010101010101070707070707070707070b0b0b0b0707070707070707c7c7c707070b0b0b0707070707070e67c10e670707070707070707070707070707070707070707070707070707c7c707070e6b0' +
    '70707c707010107c707070707070707070707070707070707c7c7c7c7c7c707c707070707070707070707c707070707070707070b0b0b0b070707070707070707070707070707070707c7c7c70707ce6' +
    '70707070707c10107c70707070707070707070707070707c7c7c707c107c707c7c7c70707070707070107070b0b0707070b0b0b0b0b0b0b0707070707070707070707070707070707c7c7c7c7ce670e6' +
    '707070707070101010107c70707c7c70707070707070707c707c10107c10107c7c707c7c707070e6707070b0b07cb0b0b0b0b0b0b0b0b07c70707070707070707070707070707070707c7c70e6e6e6e6' +
    '7070707070707010101010107c707c7070707070707c7c70e61010107c1010101070707070707c70b0b0b0b0b0b0b0b0b0b0b0b0b0b0707c70707070707070707070707070707070707c7c70e6e6e6e6' +
    'e6e6707070707070707c101010107c7c7c70707c7c7c707010101070707010101010107c70707070b0b0b0b0b0b0b0b0b0b0b0b0b070707c707c7c7070707070707070707070707070707070e6e6e670' +
    '70e6707070707070707070101010707c7c7c7c7c7c707c1010107070b0b0707c101010107c7070b0b0b07cb0b0b0b0b0b0b0b0b0b07c7c707c7c7c7c70707070707070707070707070707070e6e6e670' +
    '70e670707070707070707070101010707c70707c7c101010107070b0b0b0b07070701010107070b0b0b0b0b0b0b0b0b0b0b0b0b0707c707c7c7c7c7c7c7c7070707070707070707070707070e6e6e6e6' +
    '707ce6707070707070707070701010107c7c7c7c1010107c7070b0b07cb0b0b070707010101070b0b0b0b0b0b0b0b07cb0b0b0b0b07c7c7c7c7c7c7c7c7070707070707070707070707070707ce670e6' +
    '70e6e6e67070707070707070707c101010101010101070707c70b0b0b0b0b07cb0b0707c10107070b0b0b0707070b0b07cb0b0b0b07c7c7c7c7c7070707c7c107c7c707070707070707070707ce670e6' +
    'e6e6e67c70707070707070707070707c7c1010107c70707c7c70b0b0b0b0b0b0b0b070701010107070707c7c707c70b0b0b0b0b0b070707c70707c7c10101010101010707070707070707070e6e6e670' +
    '7070e6707070707070707070707070707070707c7c7c7c7c7c70b0b0b0b0b0b0b0b070707c10107070707c7c7c7c7c70b0b0b0b0b07c7c707010101010107c7c7c10107c707070707070707070e67c70' +
    'e6e6e6e670707070707070707070707070707c7c7c7c7c7c7c70b0b0b0b0b0b0b070707070101010107ce6707c7c7c7c7070b0b0b0707c707c10107c7c707070707c101070707070707070707070e6e6' +
    '70e6e6e6707070707070707070707070707070707c7c7c7c7070b07cb0b0b0b0707010707070101010101010107c70707c7c7c70707c7c7010107c707070707070701010e6707070707070707070e6e6' +
    '7070e67c70707070707070707070707070707070707c7c707cb0b0b0b0b070e6e6707c7c7c7c7010101010101010107c70707c7c7c7c707c10107070707070707070101010707070707070707070e670' +
    '70e6e6e6707c7c7070707070707070707070707070707070b0b0b0b0b0b070707c7c707c7c7c7c7c70707070e610101010107c7070707c10107c707070707070707c7010101070707070707070707070' +
    'e6e67ce670107c70707070707070707070707070b0b0b0b0b07cb0b0b0b070707c7c7c7c7c7c707c7c7c7c7c7c7c7c1010101010101010107c7070707070707070707070101010107070707070707070' +
    'e6e6e67c7c7c7c7c7070707070707070707070b0b07cb0b0b0b0b07cb0707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7070707c10101010107c701010101070707070707070701010101070707070707070' +
    '707c70707c7c7c7070707070707070707070b0b0b0b0b0b0b0b0b0b07070707c7c7ce67c7c7c7c7c7c707c707c707010107c70e67c7070107c10b01010707c7070707070707070101010707070707070' +
    '70e67070707c7c70707070707070707070b0b0b0b0b0b07cb070707c7c70707c7c7c7c7c70707c7c707070707070b0101010101010101010e61010101070707070707070707070701010107c7c7c1070' +
    '70e67ce67c7c70707070707070707070b0b0b0b0b0b0b0b0707c7070707c70707c70707c7c7070707070707070701010101010101010101010101010107c707070707070707070707010101010101070' +
    'e6707c7c707c70707c7c7c70707070b0b0b0b07c7cb0b0707c707070707c707070707070707070707070707070101010b0101010101010101010701070707070707070707070707070707c7c10107c70' +
    '707c7c7c707c7c707cb07c70707070b0b0b0b0b0b0b0b0707c7070707070707070707070707070707070707070101010101010101010101010101070e670707070707070707070707c7c707070707c70' +
    'e67c7c7c7c7c7c707cb07c7070707070b0b0b070707070707c707070707070707070707070707070707070707010b0107c10101010107c101010e6e670707070707070707cb07c707c7c707c707c7c70' +
    '707c7c7c7c707c70b0b0b070707c70707070707070707070701070707070707070707070707070707070707010b010b010101010b0107010e610b07c70707070707070707cb07c707c7c7c7c707c7c70' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070707070707070707070707070707070707070b0101010701010e6101010101010107c7c7070707070707070b0707c707c707c7c7c7c7ce6' +
    '707c7c7c7c7c7c7c7c107c7c707c7c707c7c7c70707c7c7c7c70707070707070707070707070707070707c101010101010101010101010101010107070707070707070707070707c7c707c7c7c7c70e6' +
    'e67c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c70707c707070707070707070707070707c1010101010101010101010701010101010101070e67070707070707c7c7c7c7c7c707c7c7c7c70e6' +
    'e67c7c7c707c70707c7c7c7c107c7c7c7c7c7c7c7c707c707070707070707070707070707070107c1010b01010b0101010e6101010107c1010707c7c707070707c7c7c7c707c707c7c7c7c7c7c7c7ce6' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c707c707070707070707070707070b0101010101010101010101010101010101010707c70707070707c7c70707c7c7c7c7c7c7c7c7c7c7c7070' +
    'e67c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070701010101010101010101010b0101010101010b0707070707070707c7c7c7c7c7c707c707c7c707c7c707070' +
    '707070b070b0b0b0b0b0b0b0b0b0b0b0b0707070b0b0707070707070707070707070707070e670e6e6e670e6e670e6e6e670707070707070707070707070707070707070707070707070707070707070',
  '8183775d-55ac-4f6b-a2e1-1407cdbc9935':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70101010101010101010101010707070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b07070707ce6e67c7070e6e6e67070e6e670707c7070101010101070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7010101010101010101010101010707070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c7070707c70707070e670707c70707c7c70707010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70101010101010101010101010107c7070b0b0b0b0b0b0b0b0b0b0b0b0b0b07070707070707070707070707070707c7070707010101010101010707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010107070b07cb0b0b0b0b0b07070707070707070707070707070e6707070707070707070707010101010107c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70101010101010107c707c1010101070b0b0b0b0b0b07070707070707070707070707070e6e6e67ce67070e6e6e67070707010101010101070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70101010101070707070707010101070b0b0b0b0b07c7070707070707070707070707070e6e6707070707070707c70707010101010101070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '701010101010707cb0b07070101070b0b0b0b0b0707c70b0b070707070707070707070707c107070707070707c707070101010101010107070707070707070707070707c70707070707c707c7c7c7c70' +
    '701010101010707cb0b0707010107070b0b0b07070b0707070707070b0b0b07070b0b070707070707c7c707ce6707070101010101010107070707070707070707070707070707070707c7c7c7c707c70' +
    '70101010101070b0b0b0b0701010107c70b07070b0701010107070707070707070707070707070707070707070707010101010101010107070707070707070707070707070707070707c7c707c7c7c70' +
    '7010101010101070707070b070701010707070b070101010101070707070707070707070707070707070707070707010101010101010707070b0b0b0b0707070707070707070707070707c70707c7070' +
    '701010101010101010707070b0b0707c7c70b070701010101010101070707070707070b0b070707070707070707010101010101010707070b0b0b0b0b0707070707070707070707070707c7c707c7070' +
    '7010101010101010101010107070b0b0b0b0707010101010101010101010107c7070707070b0707070701010101010707070707070707070b0b0b0b0b0b07c707070707070707070707c7c7070707070' +
    '7070107070101010101010101070707070701010101010101010101010101010707070707070b0707010107070707070707070707070b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c70701070' +
    '707070707070101010101010101010101010101010101010101010101010101010101010107070b01010707070707070707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7c70e670' +
    '70707070707010101010101010101010101010101010101010101010101010101010101010101070b0707070707070707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c70e670e670' +
    '707070707070707c101010101010101010101010101010101010107010101010101010101010107070707070707070707070707070b0b070707070b0b0b0b0b0b07c707070707070707c7c70e670e670' +
    '70e6e67070707070707010101010101010101010101010101070707070701010101010101010707070b0707070707070707070b0b0b0707c707c7c70b0b0b0b0b07c7070707070707070707070e6e670' +
    '70e670707070707070707010101010101010101010101010107070707070707010101010107070707070b070707070707070b0b0b0b07c707c7c7c7c7cb0b0b0b0707070707070707070707070707070' +
    '70e670707070707070707070701010101010101010101010707070b0707070707070101010707070707070b070707070b0b0b0b0b0b0707c7c7c7c7c7c7c7cb0b0707070707070707070707070707070' +
    '70707070707070707070707070101010101010101010107c70707cb0b07cb0b0b07c7070107c7070707070b0707070b0b07cb0b0b0b0707c7c7c7c7c7c7070707070707070707070707070707c70e670' +
    '7070707070707070707070707070101010101010101070707c70b0b0b0b070b0b0b0707070107070707070b07070b0b0b0b0b0b0b0b0707c7c707070707070707070707070707070707070707c70e670' +
    '70707070707070707070707070707070707070707070707c7c70b0b07cb0b0b0b0b0707070101070707070b07070b0b0b070b0b0b0b0707c707010101010101010107070707070707070707070707070' +
    '70e670707070707070707070707070707070707c7c7c7c7c7c70b0b0b0b07cb0b0707070701010101070707070707cb0b0b07cb0b07070707c1010101010101010101070707070707070707070707c70' +
    '707070707070707070707070707070b0b07c7c7c7c7c7c7c7c70b0b0b0b0b0b070707070101010101070b070101070707070707cb07c707c10101010101010101010107070707070707070707070e670' +
    '707070707070707070707070707070b0b0b0b0707c7c7c7c707cb0b0b0b0707070701010101010101070b07010101010707070707070701010101010101010101010101010707070707070707070e670' +
    '70e6e610707070707070707070707cb0b0b0b0b0707c7c707c70b0b0b070707010101010101010101070701010101010107c707070707010101010101010101010101010101070707070707070e6e670' +
    '70e6e6e6707c7c707070707070707cb0b0b0b0b0b070707070b0b07070707010101010101010101070b07010101010101010107c70101010101010101010101010101010101010107c70707070707070' +
    '70e670e6707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b0707070701010107c707070707070b070707010101010101010101010101010101010107c107c101010101010101010107070707070' +
    '70e6707c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c70701010107070707070b0b070b07070707c1010101010101010101010107c707070707070707010101010101010107070707070' +
    '707c70707c7c7c70707070707070707070b0b0b07cb0b0b0b0b07c7070701010707070b0707070707070b070707070707010101010101010107070b0b0b0707070b070707010101010101070707c7070' +
    '70707070707c7c707070707070707070707cb0b0b0b0b0b07070707c7c10101070b070707070707070707070b0b0707070707010101010707070b0707c101010107070b0707010101010101010101070' +
    '70707c707c7c7070707070707070707070707cb0b0b0b07070101010101010707070707070707070707070707070b0b07070707010107070b07070101010101010101070b07070707010101010101070' +
    '70707c7c707c70707070707070707070707070b0b0b0b0707c101010107c70b0b0707070707070707070707070707070b0b070707070b0b0707010101070707c1010107070b070707070101010101070' +
    '707c7c7c707c7c7070707070707070707070707070707070707070b0b0b0b070707070707070e670707070707070707070707070b07070101010107c707070701010107c70707c7c7c70101010101070' +
    '707c7c7c7c7c7c7070707070707070707070b0b0b0b0b0b0b07070707c707070e6701070707ce6e6e6707070707070707070707070707010107070707cb0b07c7c10101010707cb0b070101010101070' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707070e67070707070e6e67c707070707070707070707070707070707070b0b0b0b07010101010707c7c7c70101010101070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c70707070701010107070707070e6707070e6e670707c70707070707070707070707070707070b0b0b0b0b070101010107070707070101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c701010101070707070e67ce6e6707070707c707070707070707070707070707070b0b0b0b0b0b0701010101010107c1010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010101010107070707ce6e6e670707ce67070707070707070707070707070b0b0b0b0b0b07cb07070101010101010101010101010101070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707070e67070e6e67070e67c70e67c707070707070b0b0b0b0b0b0b0b0b0b0b0b0b07070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707070e67070e6e670e6e6707070707070707070b0b0b0b0b0b0b070b0b0b0b0b0b07070701010101010101010101010101070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70101010101070e670e67070e6e67c707ce670707070707070b0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707010101010101010101010101070' +
    '707070707070b07070b070707070b070b0707070707070707070707070707070707070707070707070707070707070707070707070707070b07070707070707070707070707070707070707070707070',
  '8b3c0e4a-7a4a-41db-b036-cdee835944b1':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b07c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7070707c7c7070707070707070e67070707070707c70707c707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b07070707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070e67070107c7c707c70707ce6e6707c7070707c7070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b0b070707c7c7c7c7c7c7c7c7c7c7c707c7c707070707c7070e6e67c7c707ce6e67070707070707c7070707070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b0b070707c7c7c7c7c7c7c7c70707070707070707070707070e6e6e670e6e67c707070e6e6707c70707c7070707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70b0b0b0b0b0b0b0b0b0b0b0b0b0b0707c7c7c7c7c7c707070707070707ce67070707c7c7070707070e6e67070701070e6e670107010707070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70b0b0b0b0b0b0b0b0b0b0b0b07070707c7c7c7c7c70707070707070e6e67070707c7c7ce67070707ce6e67010707c10e67c10707c707c70707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '70b0b0b0b0b0b07cb0b0b0b0707070707c7c7c7c707070b0b070707070707070707070e6e670e67ce6e670707070e67c7c7070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70b0b0b0b0b0b070b0b0b0b0707070707c7c7c7070b0707070707070b0b0b0707070b07070e6e6707ce670e6707c707c7c7c7c70707c7c7070707070707070707070707070707070707c7c7c7c707c70' +
    '70b0b0b0b0b0b0b0b0b0b0b07070707070707070b0707070707070707070707c7c70707070707c7070707c7070e6e670107c7c7c7c7c7c7c70707070707070707070707070707070707c7c707c7c7c70' +
    '70b0b0b0b0b0b0b0b0b0b0b070707070707070b07070707070707070707070e6707c70707070707070e67c7ce610e6707c7c7c7c7c70707070707c7070707070707070707070707070707c70707c7070' +
    '70107cb0b0b0b0b0b0b0b070b0b070707070b07070707070707070707070e6e67c7c70b0b0707ce6e67c7ce6e67c10e6707c7c7c7c7c7070707c7c7c7c707070707070707070707070707c7c707c7070' +
    '70101010b0b0b070707070707070b0b0b0b07070707070707070707070707070707c7c7070b07070707ce670707c7c7c707c7c707070707c7c7c7c7c707c70707070707070707070707c7c7070707070' +
    '701010107cb07070707070707070707070707070707070707070707070707070e6707c7c1070b0707c70107070e67c7c7c7c707070707c7c7c7c7c7c7c7c7c707070707070707070707c7c7c70701070' +
    '70101010107070707070707070707070707070707070707070707070107070707070e610707070b070707070e67c7c7c70707070707c7c7c7c707c7c7c7c7c7070707070707070707c7c7c7c7c70e670' +
    '707010101010707070707070707070707070707070707070101010101010101070707070e67c7070b07070707070707070e67070707c7c7c7c707c7c7c7c7c7c7070707070707070707c7c70e670e670' +
    '70707010101010107070707070707070707070707070701010101010101010101010707070707070707070707c70707c707c7c7c707c7070707070707c7c7c7c7c70707070707070707c7c70e670e670' +
    '70e6e670101010101010707070707070707070707070101010101010101010101010107c70707c7c70b0707070707010707070707c7c707c707c7c70707c7c7c7c707070707070707070707070e6e670' +
    '70e67070701010101010101070707070707070707c101010107070707070707c101010107070e6e67c70b0707070707070707c7c7c7c7c707c7c7c7c7070707c7c707070707070707070707070707070' +
    '70e67070707070701010101010101010101010101010101070707c7c7c70707070101010107070707c7070b070707070707c7c7c7c7c707c7c7c7c7c7c7c707c7c707070707070707070707070707070' +
    '707c7070707070707010101010101010101010101010107070707c7c7c7c7c7c7c701010107c7070707070b0707070707c7c7c7c7c70707c7c7c7c7c7c7070707070707070707070707070707c70e670' +
    '70707070707070707070707c1010101010101010107070707c707c7c7c7c7c7c7c7c701010107070707070b07070707c707c7c7c7c7c707c7c70707070707c707070707070707070707070707c70e670' +
    '70e6707c7070707070707070707070707c7c7c707070707c7c707c7c7c7c7c7c7c7c701010101010707070707070707c7c7c7c7c7c7c707c7070701010101010107c7070707070707070707070707070' +
    '70e670707070707070707070707070707070707c7c7c7c7c7c70707c7c7c7c7c7070701010101010101070707070707c7c7c7c7c7c707070701010101010101010101010707070707070707070707c70' +
    '707070707070707070707070707070707c707c7c7c7c7c7c7c707c7c7c7c7c7c70701010101010101010b0101010707070707c7c7c7c707010101010101010101010101010101010101070707070e670' +
    '7070707070707070707070707070707c7c7c70707c7c7c7c70707c7c7c7c70707010101010101010107cb01010101070707070707070701010101010101010101010101010101010101010707070e670' +
    '70e6e67c70707070707070707070707c7c7c7c70707c7c707c707c7c707070101010101010101010107070101010101010107070707c101010101010107c707c10101010101010101010101070e6e670' +
    '70e6e6e6707c7c70707070707070707c7c7c7c7c7070707070707c7070707c1010101010107c707070b07c1010101010101010101010101010107c7070707070707070707c1010101010101010707070' +
    '70e670e6707c7c7070707070707070707c7c7c7c7c7c70707c7c7c7070701010101010707070707070b07070701010101010101010101010107070707070707070707070707070707010101010107070' +
    '70e6707c7c7c7c7c7070707070707070707c7c7c7c7c7c7c7c7c7c707010101010707070707070b070b070707070101010101010101010707070707070707070707070707070707070b0101010101070' +
    '707c70707c7c7c707070707070707070707c7c7c707c7c7c7c7c707010101010707070b0707070707070b070707070707c10101010107070707070b0b0b0707070b07070b0b0b0b0b0b0b01010101070' +
    '70707070707c7c70707070707070707070707c7c7c7c7c70707070101010101070b070707070707070707070b0b0707070707070707070707070b07070707070707070b0b0b0b0b0b0b0b0b010101070' +
    '70707c707c7c7070707070707070707070707c7c7c7c7c707010101010107c707070707070707070707070707070b0b07070707070707070b070707070707070707070b0b0b0b0b0b0b0b0b0b0101070' +
    '70707c7c707c70707070707070707070707070707c7c7c707c101010107c70b0b0707070707070707070707070707070b0b070707070b0b0707070707070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c7c707c7c70707070707070707070707070707070707c7c70b0b0b0b0707070707070707070707070707070707070707070b0707070707070707070707070b0b0b0b0b07c7c7cb0b0b0b0b0b070' +
    '707c7c7c7c7c7c7070707070707070707070b0b0b0b0b0b0b070707c10707070e6707c70707ce6e67070707070707070707070707070707070707070707c7c7070b0b0b0b0b07cb0b0b0b0b0b0b0b070' +
    '707c7c7c7c707c7070707070707c70707070707070707070701010101070707070e67070707070e6e67c7070707070707070707070707070707070707c707c7c70b0b0b0b0b07c7c7cb0b0b0b0b0b070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070101010707070707070707070707070707c70707070707070707070707070707070707c7c7c7070b0b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c701010101070707070e67ce6e6707070707c7070707070707070707070707070707c7c7c7c7c70b0b0b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010101010107070707ce6e6e670707c7070707070707070707070707070707070707c7c7c7c7c70b0b0b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707070e6707070e67070e67c70707c7070707070707c7c7c7c707c7c7c7c7c7c7c7c7070b0b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707070707070e6e670e6e67070707070707070707c7c7c7c7c707c7c7c7c7c7c7c707c7070b0b0b0b0b0b0b0b0b0b0b0b0b070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70101010101070e670e67070e6707c707ce6707070707070707c7c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c70b0b0b0b0b0b0b0b0b0b0b0b070' +
    '70b07070b0b0b0b0b070b0707070b0707070707070707070707070707070707070707070707070707070707070707070707070707070b070707070707070707070707070707070707070707070707070',
  '92bc1e4e-fb8b-4621-ac4f-f92584224a0a':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '701010101010101010101010b0b07070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b0707070707070707070707070707070707070707070707070707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '70101010101010101010101010b07c7070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c7070707070707070707070707070707070707070707070707070707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7010101010101010101010101010b07070b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070707070707070707070707070707070707070b0b0b07070707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010b07070b07cb0b0b0b0b0b070707070707070707070707070707070707070707070707070707070b0b0b070707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '70b0101010101010101010101010b070b0b0b0b0b0b070707070707070707070707cb0b07070707070707070707070707070707070b0b0b070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '7070b0b0707c1010101010101010b070b0b0b0b0b07070707070707070707070707cb0b07070707070707070707070707070707070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707cb0b0b0101010101010b070b0b0b0b0b07c7070b0b0b07070707070707c7c7c707070707070707070707070707070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070b0b01010101010b070b0b0b07070707070b0b0b0707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '707070707070707070b010101010107070b0707070707070b0b0b07070707070707070707070707070707070b0b0b070707070707070707070707070707070707070707070707070707c7c707c7c7c70' +
    '707070707070707070b0101010101010b0b07070707070707070707070707070707070707070707070707070b0b0b070707070707070707070b0b0b0b07070707070b0b0b070707070707c70707c7070' +
    '70707070707070707070b01010101010101010b0b07070707070707070707070707070707070707070707070b0b0b0707070707070707070b0b0b0b0b07070707070b0b0b070707070707c7c707cb070' +
    '70707070707070707070b0101010101010101010b0b070707070707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b07c707070b0b0b0707070707c7c707070b070' +
    '70707070707070707070b010101010101010101010b07c707070707070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c7070b070' +
    '7070707070707070707070b010101010101010101010b070707070707070707070707070707070707070707070707070707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7cb0b070' +
    '7070707070707070707070b0b0101010101010101010b0707070707070707070b0b07c707070707070707070707c7c707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c7070b0b070' +
    '707070707070707070707070b0101010101010101010b0707070707070707070b0b07c707070707070707cb0b0107cb0b0b0b0b070b0b070707070b0b0b0b0b0b07c707070707070707c7c7070b0b070' +
    '707070707070707070707070b0101010101010101010b0707070707070707070b0b07c70707070b0b0b010101010101010101010b070707c707c7c70b0b0b0b0b07c70707070707070707070b0b0b070' +
    '70707070707070707070707c7c101010101010101010b07070707070707070707070707070b0b07c10101010101010101010101010b070707c7c7c7c7cb0b0b0b07070707070707070707070b07cb070' +
    '707070707070707070707070b010101010101010101010b07070707070707070707070707cb0101010101010101010101010101010b07c7c7c7c7c7c7c7c7cb0b07070707070707070707070b0b0b070' +
    '70b070707070707070707070b01010101010101010101010b070707070707070707070b0b010101010101010101010101010101010b0707c7c7c7c7c7c707070707070707070707070707070b0b0b070' +
    '70b0b070707070707070707070b07c10101010101010101010b0b0707070707070b0b07c1010101010101010101010101010101010b0707c7c7070707cb0b070707070707070707070707070b0b0b070' +
    '70b0b0b0707070707070707070707cb07c7cb07c7c10101010101070b0b0b0b07c1010101010101010101010101010101010101010b0707c7070b0b0b0707cb0b0b07c70707070707070707070b0b070' +
    '70b0b0b07070707070707070707070707070707c7c7cb010101010101010101010101010101010101010107c101010101010101010b0707070b07c10101010101010b0b070707070707070707070b070' +
    '70b0b0b07070707070707070707070b0b07c7c7c7c7c7c7c7c101010101010101010101010101010b0b0b0b0b0b07c10101010101010b0b0b0101010101010101010107cb07070707070707070707070' +
    '70b07cb07070707070707070707070b0b0b0b0707c7c7c7c70101010101010101010101010107cb0b07070707070b0b01010101010101010101010101010101010101010b07070707070707070707070' +
    '70b0b0b0707070707070707070707cb0b0b0b0b0707c7c707c7cb0101010101010101010107cb0b070707070707070b01010101010101010101010101010101010101010707c70707070707070707070' +
    '70b0b070707c7c707070707070707cb0b0b0b0b0b070707070b07cb01010101010101070b0b07070707070707070707c101010101010101010101010101010101010101010b070707070707070707070' +
    '70b0b070707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b070b0b07c7c7cb0b07c707070707070b0b0b0707070b01010101010101010101010101010101010101010b070707070707070707070' +
    '70b0b07c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c7070707cb07c7070707070707070b0b0b0707070b0b010101010101010101010101010101010101010b070707070707070707070' +
    '70b070707c7c7c70707070b0b07c707070b0b0b07cb0b0b0b0b07c707070707070707070707070707070b0b0b070707070b07c10101010101010107cb07c101010101010107c70707070707070707070' +
    '70b07070707c7c70707070b0b07c7070707cb0b0b07cb0b07070707070707070707070707070707070707070707070707070b010101010107cb0b0b0b0b0b0b0101010107c7c70707070707070707070' +
    '70b07c707c7c7070707070b0b07c707070707cb0b0b0b0707070b0b0b07070707070707070707070707070707070707070707cb0b0b07cb0b0707070707070b0101010107cb070707070707070707070' +
    '70707c7c707c70707070707070707070707070b0b0b0b0707070b0b0b070707070707070707070707070707070707070707070707cb07c707070707070707070b010101010b070707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b0b0b070707070707070707070707070707070707070707070707070707070707070707c7070b07c101010b070707070707070707070' +
    '707c7c7c7c7c7c70707070707070707070707070707070707070707070707070707070707070707070707070707070707070b0b0b0707070707070707cb0b07c70b01010107c70707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707070707070707070707070707070707070707070707070707070b0b0b070707070707070b0b0b0b070b010101010b0707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070707070707070707070b0b0b0707070707070707070707070b0b0b0707070707070b0b0b0b0b070b010101010b07c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707070707070707070b0b0b07070707070707070707070707070707070707070b0b0b0b0b0b070b01010101010b0b070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c7070707070707070707070707c7c7c7070707070707070707070707070707070b0b0b0b0b0b07cb07070b01010101010107cb0707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b0b0b0b0b0b0b07070b07c10101010101010b07070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c7070707070707070707070707070707070707070707070707070b0b0b0b0b0b0b07070b0b0b0b0b0707070b0101010101010107cb070707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707070707070707070707070707070707070707070707070b0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707cb0101010101010107cb07c7070' +
    '70b0b0b07070b0b0b0b0b070b0b0b070b07070b07070707070707070707070707070707070707070707070707070707070707070b070b0707070707070707070707070707070707070707070707070b0',
  '9b90e0c7-a291-4aaa-8009-89e2b786e2c3':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70707070b07c7c7cb070707070707070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b0707070707070707070707070707070707070707070707070707c7c707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7070707070b07c7c7c7070707070707070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c7070707070707070707070707070707070707070707070707c7c707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c70b0' +
    '707070707070b07c7c7cb0707070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070707070707070707070707070707070707070b0b0b0707c707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '70707070707070b07c7c7c707070707070b07cb0b0b0b0b0b070707070707070707070707070707070707070707070707070707070b0b0b0707c7c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c70b0' +
    '7070707070707070b07c7c7c70707070b0b0b0b0b0b070707070707070707070707cb0b07070707070707070707070707070707070b0b0b07cb07c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7cb0' +
    '707070707070707070b07c7c7c707070b0b0b0b0b07c70707070707070707070707cb0b070707070707070707070707070707070707070707c7070707070707c7070707c70707070707c7c7c7c7c7cb0' +
    '707070707070707070707c7c7c70707cb0b0b0b0707c7070b0b0b07070707070707c7c7c70707070707070707070707070707070707070b0b0707070707070707070707c70707070707c707c7c7c7c70' +
    '70707070707070707070b07c7c707070b0b0b07070707070b0b0b0707070707070707070707070707070707070707070707070707c7c7cb070707070707070707070707070707070707c7c7c7c707cb0' +
    '70707070707070707070707c7c7c70707070707070707070b0b0b07070707070707070707070707070707070b0b0b07070707c7cb070707070707070707070707070707070707070707c7c707c7c7cb0' +
    '70707070707070707070707c7c7cb07c70707070707070707070707070707070707070707070707070707070b0b0b070707c7c7c7070707070b0b0b0b07070707070b0b0b070707070707c70707c7070' +
    '7070707070707070707070707c7c7c7cb0707070707070707070707070707070707070707070707070707070b0b0b070707cb07070707070b0b0b0b0b07070707070b0b0b070707070707c7c707cb070' +
    '70707070707070707070707070b07c7c7c7c7070707070707070707070707070707070707070707070707070707070707c7c707070707070b0b0b0b0b0b07c707070b0b0b0707070707c7c707070b070' +
    '707070707070707070707070707070b07c7cb0707070707070707070707070707070707070707070707070707070707cb07070707070b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c7070b070' +
    '70707070707070707070707070707070b07c7c7c70707070707070707070707070707070707070707070707070707cb0707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7cb0b0b0' +
    '70707070707070707070707070707070707c7cb0707070707070707070707070b0b07c70707070707070707070b07c707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c7070b0b070' +
    '70707070707070707070707070707070707c7c7c707070707070707070707070b0b07c707070707070707070707cb0707070707070b0b070707070b0b0b0b0b0b07c707070707070707c7c707cb0b070' +
    '7070707070707070707070707070707070b07c7c7c7070707070707070707070b0b07c707070707070707070707c7c70707070707070707c707c7c70b0b0b0b0b07c7070707070707070707cb0b0b070' +
    '7070707070707070707070707070707070707c7c7c7c7c707070707070707070707070707070707070707070b07c707070707070707070707c7c7c7c7cb0b0b0b0707070707070707c7c7c70b07cb070' +
    '7070707070707070707070707070707070707c7c7c7c7c7cb07c7c70707070707070707070707070707070b07cb07070707070707070707c7c7c7c7c7c7c7cb0b0707070707c7c707c707070b0b0b070' +
    '70b0707070707070707070707070707070707c7070b07c7c7c7c7c7c7c70707070707070707070707070b07c7c707070707070707070707c7c7c7c7c7c70707070707070707c707070707070b0b0b070' +
    '70b0b0707070707070707070707070707070b070707070707cb07c7c7c7cb07c707070707070707070b07c7c70707070707070707070707c7c7c707070707070707070707c70707070707070b0b0b070' +
    '70b0b0b07070707070707070707c7c7c707c70707070707070707cb07c7c7c7c7c70707070707070b07c7c7cb07c7070707070707070707c7070707070707070707070b0b07070707070707070b0b070' +
    '70b0b0b070707070707070707cb070707070707c7c707070707070707cb07c7c7cb070707cb07c7c7c7cb0707c7c7c7cb070707070707070707070707070707070707c7c70707070707070707070b070' +
    '70b0b0b07070b0b0b07070b07c7070b0b07c7c7c7c7c7c70707070707070707c7c7c7c7c7c7c70b07070707070707cb07c7c7c7070707070707070707c7c7c7c7c7cb070707070707070707070707070' +
    '70b07cb0707c707070b07cb0707070b0b0b0b0707c7c7c7c7070707070707070707c7c7c70707070707070707070707070707c7c7c7070707070707c7c7c707070707070707070707070707070707070' +
    '70b0b0b07c7070707070707070707cb0b0b0b0b0707c7c707c7070707070707070707c7c707070707070707070707070707070b07c7c7cb070707c707070707070707070707070707070707070707070' +
    '70b0b070707c7c707070707070707cb0b0b0b0b0b070707070b07c70707070707070b07c70707070707070707070707070707070707c7c7c7c7c70707070707070b0b070707070707070707070707070' +
    '70b0b070707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b070707070707070707c7c7070707070b0b0b070707070707070707070707c7c70707070707070b0b070707070707070707070707070' +
    '70b0b07c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c707070707070707cb07070707070b0b0b07070707070707070707070b07cb0707070707070b0b070707070707070707070707070' +
    '70b070707c7c7c70707070b0b07c707070b0b0b07cb070b0b0b07c70707070707070707c7c7070707070b0b0b0707070707070707070707070b07c707070707070707070707070707070707070707070' +
    '70b07070707c7c70707070b0b07c7070707cb0b0b07cb0b070707070707070707070707c7c7c7070707070707070707070707070707070707070b07c7c7c707070707070707070707070707070707070' +
    '70b07c707c7c7070707070b0b07c707070707cb0b0b0b0707070b0b0b070707070707c7c707c7070707070707070707070707070707070707070707c7c7c7cb070707070707070707070707070707070' +
    '70707c7c707c70707070707070707070707070b0b0b0b0707070b0b0b070707070707c7c70707c7c7070707070707070707070707070707070707070707cb07c7cb07070707070707070707070707070' +
    '707c7c7c707c7c70707070707070707070707070707070707070b0b0b0707070b07c7c707070707c7c7c707070707070707070707070707070707070707c7070b07c7c7c707070707070707070707070' +
    '707c7c7c7c7c7c7070707070707070707070707070707070707070707070707cb070707070707070707c7cb0707070707070b0b0b0707070707070707cb0b07c7070b07c7c7070707070707070707070' +
    '707c7c7c7c707c7070707070707c70707070707070707070707070707070707c7070707070707070707070b07c7070707070b0b0b070707070707070b0b0b0b0707070707c7c70707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c707070707070707c7c7c7c707070b0b0b0707070707070b0b070707070b0b0b0707070707070b0b0b0b0b070707070707c7c707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707cb0707070707070b0b0b0707070707070707c707070707070707070707070b0b0b0b0b0b07070707070b07c707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707070707c707070707070707c7c7c7070707070707070b07070707070707070b0b0b0b0b0b07cb0707070707070707c7c7070707070707070' +
    '707c7c7c707cb0707c7c7c7c7c7c7c7c7c7c7c7c7c707c7070707c707070707070707070707070707070707070707c707070b0b0b0b0b0b0b0b0b0b0b0b0b0707070707070707c7c7070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c70707cb0707070707070707070707070707070707070707c7070b0b0b0b0b0b0b07070b0b0b0b0b070707070707070707c7c70707070707070' +
    '707c7c707cb07c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70707c7070707070707070707070707070707070707070b07cb0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707070707070707c70707070707070' +
    '70b0b0b070b0b0b0b0b0b0b0b0b0b0b0b070b0b07070707070707070707070707070707070707070707070707070707070707070b070b070b0b070707070707070707070707070707070707070707070',
  'b94a7e47-8778-43d3-a3fa-d26f831233f6':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '70101010101010101010101010707070b0b0b07cb0b0b0b0b0b0b07cb0b0b0b0b07070707ce6e67c70e67070e67070e6e670707c7070101010101070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7010101010101010101010101010707070b0b07cb0b0b0b0b0b0b0b0b0b0b0b07c7070707ce670707070e6e67c70707c7c70707010101010101010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7010101010101010101010101010107070b0b0b0b0b0b0b0b0b0b0b0b0b0b07070707070707070707070707070707c7070707010101010101010707c707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7010101010101010101010101010107070b07cb0b0b0b0b0b07070707070707070707070707070e6e67070707070707070707010101010107c707c7c7c7c7c7c70707c7c7c7c7c7c707c7c707c7c7070' +
    '70101010101010101010101010101070b0b0b0b0b0b070707070707070707070707070707070707c7070707070707070707010101010101070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70101010101010101010101010101070b0b0b0b0b07c707070707070707070707070707070e6707070707070707c70707010101010101070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '701010101010101010101010101070b0b0b0b0b0b07c70707070707070707070707070707c107070e670e67010707070101010101010107070707070707070707070707c70707070707c707c7c7c7c70' +
    '7010101010101010707c7c7c7c7cb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b07c7cb07c7070b0b07c7c7c7c7c7c7cb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0707c7c7c7c707c70' +
    '7010101010101010101010101010107c70b0707070701010107070707070707070707070707070707070707070b07010101010101010107070707070707070707070707070707070707c7c707c7c7c70' +
    '701010101010101010101010101010107070701010101010101070707070707070707070707070707070707070707070101010101010707070b0b0b0b0707070707070707070707070707c70707c7070' +
    '701010101010101010101010101010101010101010101010101010107070b070707070707070707070707070707010101070101010707070b0b0b0b0b0707070707070707070707070707c7c707c7070' +
    '701010101010101010101010101010101010101010101010101010107c10107c707070707070707070701010101010707070707070707070b0b0b0b0b0b07c707070707070707070707c7c7070707070' +
    '707010707010101010101010101010101010101010101010101010101010101070707070707070707010107070707070707070707070b0b0b0b0b0b0b0b0b0707070707070707070707c7c7c70701070' +
    '707070707070101010101010101010101010101010101010101010101010101010101010107070101010707070707070707070707cb0b0b0b0b0b0b0b0b0b07070707070707070707c7c7c7c7c707070' +
    '7070707070701010101010101010101010101010101010101010101010101010101010101010107070707070707070707070707070b0b0b0b0b0b0b0b0b07cb07070707070707070707c7c7070707070' +
    '7070707070707010101010101010101010101010101010101010107010101010101010101010107070707070707070707070707070b0b070707070b0b0b0b0b0b07c707070707070707c7c70e6e67070' +
    '70e670707070707070701010101010101010101010101010107070707070101010101010101070707070707070707070707070b0b0b0707c707c7c70b0b0b0b0b07c707070707070707070707070e670' +
    '70707070707070707070707c1010101010101010101010101070707070707070101010101070707070707070707070707070b0b0b0b07c707c7c7c7c7cb0b0b0b0707070707070707070707070707070' +
    '70e670707070707070707070701010101010101010101010707070b07070707070701010107070707070707070707070b0b0b0b0b0b0707c7c7c7c7c7c7c7cb0b070b070707070707070707070707070' +
    '70707070707070b0b0b0707070101010101010101010101070707cb0b07cb0b0b07c70701010707070707070707070b0b07cb0b0b0b0707c7c7c7c7c7c707070707070707070b0b0b07070707c707070' +
    '70707070707070b0b07070707070101010101010101070707c70b0b0b0b070b0b0b0707070107070707070707070b0b0b0b0b0b0b0b0707c7c707070707070707070707070707cb0b07070707c707070' +
    '70707070707070b0b070707070707070707070707070707c7c70b0b07cb0b0b0b0b0707070101070707070707070b0b0b070b0b0b0b0707c70701010101010101010707070707cb0b070707070707070' +
    '70e67070707070b0b0b07070707070707070707c7c7c7c7c7c70b0b0b0b07cb0b070707070101010107c707070707cb0b0b07cb0b07070701010101010101010101010707070b0b0b070707070707c70' +
    '707070707070707070707070707070b0b07c7c7c7c7c7c7c7c70b0b0b0b0b0b0707070701010101010101010101070707070707cb07c707c101010101010101010101070707070707070707070707070' +
    '707070707070707070707070707070b0b0b0b0707c7c7c7c707cb0b0b0b07070707010101010101010101010101010107070707070707010101010101010101010101010107070707070707070707070' +
    '70e67010707070707070707070707cb0b0b0b0b0707c7c707c70b0b0b0707070101010101010101010101010101010101070707070707010101010101010101010101010101070707070707070e67070' +
    '7070e6e6707c7c707070707070707cb0b0b0b0b0b070707070b0b07070707010101010101010101010101010101010101010101070101010101010101010101010101010101010107c70707070707070' +
    '70e67070707c7c707070707070707070b07cb0b0b0b0b0b0b0b0b0707070701010107c707070707070707070701010101010101010101010101010101010101010101010101010101010107070707070' +
    '70e6707c7c7c7c7c707070707070707070b0b0b0b0b0b0b0b0b0b07c70701010107070707070707070707070707c10101010101010101010101010101010101010101010101010101010107070707070' +
    '707c70707c7c7c70707070707070707070b0b0b07cb0b0b0b0b07c70707010107070707070707070707070707070707070101010101010101010101010101010101010101010101010101070707c7070' +
    '70707070707c7c70b070707070707070707cb0b0b0b0b0b07070707c7c101010707070707070707070707070707070707070701010101010101010101010101010101010101010101010101010101070' +
    '70707c707c7c707070b070707070707070707cb0b0b0b07070101010107c1070707070707070707070707070707070707070707010101010101010101010101010101010101010101010101010101070' +
    '70707c7c707c70707070b07070707070707070b0b0b0b0707c101010101070b0707070707070707070707070707070707070707070701010101010101070707c10101010101010101010101010101070' +
    '707c7c7c707c7c70707070b0707070707070707070707070101010101010707070b070707070e670707070707070707070707070707070101010107c7070707010101010101010101010101010101070' +
    '707c7c7c7c7c7c70b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b07070707070b0b0b070b010b0b070e6e6e6b0b0b0b0b0b0b0b0b0b0b0b0b0b07070b0b0b07cb0b07c70707070707070701010101010101070' +
    '707c7c7c7c707c7070707070707c7070707070707070707070101010107070707070707070b070e6e67c707070707070707070707070707070707070b0b0b0b070101010101010101010101010101070' +
    '707c707c7c7c7c7c7070707c7c7c707070707c707c70707070701010107070707070e6707070e6e670707c70707070707070707070707070707070b0b0b0b0b070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c701010101070707070e67ce670707070707c707070707070707070707070707070b0b0b0b0b0b070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c707c707010101010107070707ce6e6e670707ce67070707070707070707070707070b0b0b0b0b0b07cb07070101010101010101010101010101070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707010101010707070e670e6e6e67070701070e67c707070707070b0b0b0b0b0b0b0b0b0b0b0b0b07070101010101010101010101010101070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701010101010707070e67070707070e6e6707070707070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b07070701010101010101010101010101070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c70101010101070e670707070e6e67c707ce670707070707070b0b0b0b0b07cb0b0b0b0b0b0b0b0b07c70707010101010101010101010101070' +
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  'c927a143-9ad1-49d6-9e6f-35b2b7927b6d':
    '7070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '7070707070707070707070707cb07070b0b0b07cb0b0b07070b0b07cb0b0b0b0b07070707c70707c70707070707070707070707cb0b0b0b070707070707c7c707c707c7c707c7c7c707c70707c7c7c70' +
    '7070707070707070707070701070707070b0b07cb070b0b0b0b0b0b0b0b0b0b07c7070707c707070707070707c70707c7c707070b0b0b0b0707010707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c707c7070' +
    '7070707070707070707070701070b07070b0b0b070b0b0b0b0b0b0b0b0b0b07070707070707070707070707070701070707070b0b0b0b0707010707c7c7c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70' +
    '7070707070707070707070707070b07070b07c70b0b0b0b0b0707070707070707070707070707070707070707070707070b070b0b0b070707c707c7c7c7c7c7c70707c7c7c7c7c7c7c7c7c707c7c7070' +
    '7070707070707070707070707070b070b0b0b0b0b0b070707070707070707070707070707070707c70707070707070707070b0b07070701070707c707c7c7c7c707c7c7c7c7c707070707c7c7c7c7c70' +
    '70707070707070707070707070b0b070b0b0b0b0b07c707070b0b0b07070707070b0b0b070707070b0b0b0b0b07c70b070b0b07070707070707070707070707c7070707c70707070707c7c7c7c7c7c70' +
    '707070707070707070701070b0b07070b0b0b0b0707c7070b0b0b0b0b0b0b0b0b0b0b0b0707cb0b0707070b07cb0b0b0b0b070707070707070707070707070707070707c70707070707c707c7c7c7c70' +
    '707070707070707070707070b0b07070b0b0b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b07c7cb0707070b0b0707070707070707070707070707070707070707070707070707c7c7c7c707c70' +
    '70707070707070707c707070b0b0707070b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070707070107070707070707070707070707070707070707c7c707c7c7c70' +
    '707c7070707070707070707070b0b070707070b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b070707070b070707070707070707070707070707070707070707070707070707070707c70707c7070' +
    '701010101010707c707070707070b0b0b0b0b0b0b0b0b0707070707070707070b0b0b0b0b0b0b07070707070707070707c7c7070707070707070707070707070707070707070707070707c7c707c7070' +
    '7010101010101070707070707070707070b0b0b0b0707070707070707c7c7c707070b0b0b07070707070707010107070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '70707c7070101010707070707070707070707070707070707c7c7c7c7c7c707c70707070707070707070107070707070707070707070707070707070707070707070707070707070707c7c7c70701070' +
    '70707070701010107c70707070707070707070707070707c7c7c70101010707c7c7c70707070707070107070707070707070707070707070707070707070707070707070707070707c7c7c7c7c707070' +
    '707070707070101010107c70707c7c70707070707070707c701010101010107c7c707c7c707070707070707070707070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '7070707070707010101010107c707c7070707070707c7c7070101010101010101070707070707c707070707070707070707070707070707070707070707070707070707070707070707c7c7070707070' +
    '70707070707070707010101010107c7c7c70707c7c7c707010101070707010101010107c70707c7c7c7c707070707070707070707070707c707c7c707070707070707070707070707070707070707070' +
    '7070707070707070707070101010707c7c7c7c7c7c701010101070707070707c101010101070b0b0b0b070707070707070707070707070707c7c7c7c7070707070707070707070707070707070707070' +
    '707070707070707070707070101010707c70707c7c1010101070707070707070707010101070b0b0b0b0707070707070707070707070707c7c7c7c7c7c7c707070707070707070707070707070707070' +
    '70707070707070707070707070101010107c7c10101010107070707070707070707070101010b0b0b0b0707070707070707070707070707c7c7c7c7c7c7070707070707070707070707070707c707070' +
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
    '707c7c7c7c7c7c70707070707070707070707070707070701070707070707070707070707070b0b0b0b07070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c7c707c7070707070707c707070707070707070707010707070707070707070707070b0b0b0b070707070707070707070707070707070707c7070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7070707c7c7c707070707c707c7070707070707070707070707070707070b07070b07070707070707070707070707070707070107070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c707c7c707c7c7c70707c7c7c7c70707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c7c7c7c7c707010707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '707c7c7c707c70707c7c7c7c7c7c7c7c7c7c7c7c7c707c707070707070707070707070707070707070707070707070707070707070707070707070107070707070707070707070707070707070707070' +
    '707c7c7c7c7c7c7c7c7c7c7c7c7c7c707c7c7c7c7c707c701070707070707070707070707070707070707070707070707070707070707070701070707070707070707070707070707070707070707070' +
    '707c7c707c707c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c7c707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070' +
    '7070707070b0b07070b070707070b07070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070',
  'random-frontier-01':
    '3947596771766f5e535252545a5f616260584e4b52607585857a73726f634f4347525b62656261615d52494f5b5e5b5d5c544f4f50525352534f463c393e464f5a626463605c564f453f424d5a605c54' +
    '404b5b676f716c5f545254596267686660544a4a515f72808077716e696158545960636566636060605c5b61696b6c6f6e6459524d4b4b4e5356524b44464c52565a5f6565605c574e444249565e5d58' +
    '484e5963696a696258535760696d6b675e504a4d535e6c76756e6865605e6063686d6b666566656364686d7174777d8380726358514d4b4f565d605d555153524f515c676b68635e5347424851575a5d' +
    '4d50565d6063686a62595b646c6f6c665c524f565b60686d6a635e5b5a5b62696f747067656b6e6c6b707575767a828a8778686262605a595d646968615a56525158646e73726d63554944484e4f535c' +
    '4f51575c5b5e676f6a605e656d6f6b645b55576065656a6c68605c5c5c5c626b757a766e6d7376726f72747273777f89897d6f6c72726c6766696c68625e5b595f6c76787a7a7466574d494a4a484d5a' +
    '54535557575b656d6b64616871736c625a575c676c6d7073706864646461656f7b807d7a7b7f7e766f6f6f6f72767e888c8378757b7c777371706c6360646667707d827d787772665b5755514a444b5a' +
    '5753504f4f54606b6c66636d76766d6259575d687174757675716d6d6c6969717a7e7f818586837c736c6b6f757a81898d877d7b7f81817f7c797063636f77777a8080766d6c6e6b6664645d4f444a58' +
    '59554f4c4c515e6c716b666c74746d655f5c5f677074747271706f70706d6a6e74797b7f818182827b716e747a7f838789857f7d818587848380776e707b817f7b79746a63656d716f6e6c6455484950' +
    '5d5953505258626e74726c6c70727171716d6a6a6e7070706f6d6d7073716e6e7276797a7a7c8186837a767a7c7e81838485827d7f83848181807c7c8186847e79736a6463666b6e6f706f675a4f4a48' +
    '645e5754575c626a7275726f72777a8086837b7776747577767170737678777677797a7a7c81888a857d797a7a7b7d7f8287877f797979787b7c7d838c8e89827a736c6968686867696f736e61554d46' +
    '6a655e5a5a5c606972757472747a81888e8d8989888481817e787678797b7d7d7c7a797b80868a867d767376787c81828589887f75706d6f767b7d848d918f8a8178736f6a676664656b7474695a504a' +
    '706b635d5d60666e7476747273777d83888b8f9598938d8a847c797b79797c7d7a7573777e84857f756f70777f868b8c8a8987837c736c6b737d818386898e908a8078716864656462656c726d605652' +
    '726b615b5d646c7275787774717173787e848b949a979490887f7d7f7c767779736a6b737c8387837a7375828f959794908c8b8b8880736b6f7a7f8080828a918f857b7267606062605f636868625954' +
    '6d665c56575d6871767a79746f6b696d757b818a939594908b86878b857c79786f666a77838b908e857f83919ea3a09b95908e8f8d87796c6971798081838b928e847c766a605e5f5e5d5e6061615b53' +
    '605f5b5653586470777975706f6c676b74797c828b9193918e8e9397938a847f756f7685919798958e8c939ea7aaa7a09a948e8b89857a6e6b727b8182868e91897f7c796e6767676462615f60625f58' +
    '5b5e5f5c595d677176756f6d71716e737d817f7e828b93969696979b9b96908a838086939ea3a09b97979fa7ababa9a49e958e8a86807974777e82817e818a8e867e7b7771717779766e676364676762' +
    '62676a6865696f73767671717676757e898b837b7a82909b9d989595969696969491929aa5acaaa39d9c9fa5a8a8a8a49b918c8c88807a7a7f85857d74747d85847e7772737b848783776a65676a6b69' +
    '6a70757471707275787b7b7b7c7879838d8e857b757988979c968f8d8c8f98a3a49e999ba5afaea69e99989ca0a5a8a3988b898f8f857d7c7f8483786c686e777c78716f77848c8b81746b6867676666' +
    '6e757a7974706f7275787d82817a79828a8a867d74727c8a93918c8b8c919ba5a8a59f9ea4aaaaa49b9491949aa4aba69b918e94958c837f80827e756a65676f74726f737e898e87796e6b6b67605b5a' +
    '757877746f6a66656669717b7e7b7c838685857f736c717b8488898c91969a9ea1a19fa0a3a4a19c97918f9198a3acaaa59d969699958d8888847d77726d6c707372737a8286847d726b6c6d685d544f' +
    '7776706b676058545459616b7379828a87817f7b70676870787f84898e8f8e8f92959a9fa29f97949494949399a3a8a6a5a29895989893908f8a827d7b7571737676787e817d756d6a6b6e716f665c55' +
    '726d686560564d494c5359606976858e89807b766e66646c787f828587848182858b959ea09a9292979c9b989aa1a29e9fa19c9694929090918e87817d757173797b7b7c7c7569605f67707779746a61' +
    '6f6a65625c524b4a4e54585d6774848e8c847b75716e6d737f87878887828286878a929a9d9b96959ba1a19b999d9e9a9ca2a29e99918c8e908f88817c7571757c7e7b78766d605757626f7779766e66' +
    '726d67625d595756565657606c77848c8d877f7a7b7c7c7c838a8e908f8a8d9596918f92989d9a999da3a49d999b9b999ba1a6a9a79b918f8f8a8380807d787a7e7e787370695e5657626e72706f6d69' +
    '706f696565696967635e5c66757e8284868683838688857f7e869197949196a0a0968c898f9799999fa7a9a39e9a97979a9ea4acafa4958d88817e8086878381817d77726f6c665e5c626b6c69696d6d' +
    '676b6c6b6e747673706c68717f847e78798085898d8d877b76808f969390979f9f978c84878f9498a1acb0aca39c97969a9ea3aaaa9e8f857e7a7a7d858c8d89847e797574747169615f636462626768' +
    '56626c6f717474727475757d8a8a7e72707781898d8a8277747f8e938f8d929a9b968e8785898f98a5aeb3b0a79c929199a0a3a5a194887f7a787677808b908c847e7b7a7977746e655c5a5b5b5c5c58' +
    '4858686e6d6d6b6a6c7078848e8a7e736c6c758187847d787a848f928f8b8c939999938c88868a97a4a9abaca5978785919ca0a09c9288807c7973727b898d867e7a7a7a78736f6d685d56565c605b4e' +
    '4a57666a666463626166738287827a71676066737b7b797b80878d92918a89919a9d98918880828e98999aa0a091807d87939ba0a1988b82807d75707785867c7473767876706d6c685f585962686254' +
    '56616a67605d60605c5f6e7b7c78756e61585c676f75797e8184878d8f8b89909a9e9a928579777e838589959a8f827e848d99a3a69e8f8687877e7577817f736c6c7073716e6c6b67605c5c6266635c' +
    '5f6a6f67606166655c5d6b7472737673675d5d646d788185858384898a8784899499958d81777274777b838f91898486888c959fa29a8f8c8e908b827f817d736d6a69696766686a68645f5d5e5b5756' +
    '626c716d6b6e716b5f5d676c6c717a7d766c696c75838e8e88838487857d787d8a929089837e7b797b81888c867d808a8c8a8e95958d86878d9496928c88817a746b63616060656a6b67615f5d544843' +
    '606971737578766d636166696a6f7a81817c777880898e8c837c7e837e736d74848f908b88888783848c928f807579848785888b867d787c86929c9d968e86817a6e6564656466696a68656562544237' +
    '5c646e737578766e67656768696d747d858784818286898478707277746b68707f8b8e8d8d8f8d8786909a958576757b7e7f82817a726f748291999a96908b8882766f7173706b6867696c6f6a5b483a' +
    '575d676c6e7072706d6b6a6766696e78868c87807f83857f736a686a68646468707b82868a8e8c86848d9795877a75797d7e7b7772706f73818e908e8c8d90918a80797a7c776d66666c727571645243' +
    '51555f6667676b707475726c69696b748187837d7d82847c726c686563646461616870777c81838282878c877d77777b7f7b746e6e707277828a898483888d8e89817b7979766d66686d717571665649' +
    '50525a6365636770797e7c74706e6c6f777b7c7b7c7f817b75716e6a6a6d6d696464686c6e7074787c7e7c747073797a776f6866696e7279838a8a85818182817d79767374746f6a6a6b6b6d6a60544d' +
    '5a58596067696a7078807d746e6e6f6f6d6c7176787a7c7c7a76727072757575726e6c6b6764676b6e6f6d696b737670675f5d61686e7179848b8c88807a757273726d6b7075716967666261615c5856' +
    '6b655d5f686f717175787268666e726e6562666e7375787b7b76706f7273737678756f68626061616266696a6d706c6158565c656f717077828989847a7068676b6c656167706e6561615e5c60646665' +
    '756d635f646d71716f6b645e656f70655a585e666f747678766f68666a6e6e6f7270675f5b5c5d5a5c656b6d6b68605855575f69727370747e83817a6f66606064645d595e65645f5d6162636a73746e' +
    '706b635b59606665615d5a5c656c67574c4e56616e77787671675d5c6368676769655d56555b5c595c63666765605c59595a5f656c7071727475746f68646261615f575255595957585f666a747e7a6f' +
    '67655d51494c51514f50535a61635a4c464c575f6b7679756f655a55585d5d6063605a55575d5f5b5d5f5c5b5e5e5b585755585e656e7370686264686a6b6b696761564e4e4f4f4f50555b66757f7a6e' +
    '6562594a4345474746484e555a59524c4c545f62636a6e6e6d675d524e4f52595f605d5b5d605f5a5b595352585a554f4a474d58616b726f615659626b7173716e665a52504c464547484b586d7b7b73' +
    '6862574b484c4b474647494f54535050535c65635b5a5f6466665f5348464b545b5f5f5f61605b5655524b4b53554e443e3d44525e676e6c5e51535d6871767571675c58574d403c3f3e3e4d64747b7b',
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
