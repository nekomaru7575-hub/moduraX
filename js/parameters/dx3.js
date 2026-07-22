import { buildParameters } from './paramFactory.js';

export const DX3_PARAMETERS =[
    {key : "corruption", label : "侵蝕率",value : 0},
    {key : "corDB", label : "侵蝕率ダイスボーナス",value : 0 , editable : false},
    {key : "corEB", label : "侵蝕率エフェクトボーナス",value : 0, editable : false}
]

export function buildDX3Parameters(){
    return buildParameters("DX3",DX3_PARAMETERS,{locked : true});
}

export function computeDX3DerivedParameters(parameters) {
    const corruptionVal = parameters['DX3:corruption']?.value ?? 0;
    
    // 侵蝕率テーブルに基づく計算例
    const db = 
        Math.min(Math.floor((corruptionVal+70)/130),2) 
        + Math.min(Math.floor((corruptionVal+100)/180),2) 
        + Math.min(Math.floor((corruptionVal + 100)/200),2) 
        + Math.min(Math.floor((corruptionVal + 1000)/ 1130),1);
    
    const eb = Math.min(Math.floor((corruptionVal+20)/120),2) 
        + Math.min(Math.floor(corruptionVal / 130),1)

    return {
        'DX3:corDB': db,
        'DX3:corEB': eb
    };
}

export const DX3_PLUGIN = {
  id: 'DX3',
  label: 'ダブルクロス (3rd)',
  buildCharacterParameters: buildDX3Parameters,
  // buildRoomParameters: 未定義 → registry側で自動的に空オブジェクト扱い
  computeDerivedParameters: computeDX3DerivedParameters // 🆕 計算ロジックを登録
};