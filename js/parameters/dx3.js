import { buildParameters } from './paramFactory.js';

export const DX3_PARAMETERS =[
    {key : "corruption", label : "侵蝕率",value : 0},
    {key : "corDB", label : "侵蝕率ダイスボーナス",value : 0 , editable : false},
    {key : "corEB", label : "侵蝕率エフェクトボーナス",value : 0, editable : false}
]

export function buildDX3Parameters(){
    return buildParameters("DX3",DX3_PARAMETERS,{locked : true});
}

export const DX3_PLUGIN = {
  id: 'DX3',
  label: 'ダブルクロス (3rd)',
  buildCharacterParameters: buildDX3Parameters
  // buildRoomParameters: 未定義 → registry側で自動的に空オブジェクト扱い
};