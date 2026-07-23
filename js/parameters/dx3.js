import { buildParameters } from './paramFactory.js';

export const DX3_PARAMETERS =[
    {key : "corruption", label : "侵蝕率",value : 0},
    {key : "corDB", label : "侵蝕率ダイスボーナス",value : 0 , editable : false,visible : false},
    {key : "corEB", label : "侵蝕率エフェクトボーナス",value : 0, editable : false,visible : false}
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

// キャラ作成/更新ダイアログのプラグイン専用スペースに描画するDX3独自のUI。
// Core側の汎用パラメータ一覧とは別に、このプラグインだけの見た目・構成で表示する。
function renderDX3CharacterPanel({ container, parameters }) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = 'ダブルクロス (3rd)';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  const corruptionParam = parameters['DX3:corruption'];
  const corDBParam = parameters['DX3:corDB'];
  const corEBParam = parameters['DX3:corEB'];

  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.textContent = corruptionParam?.label ?? '侵蝕率';
  const input = document.createElement('input');
  input.type = 'number';
  input.value = corruptionParam?.value ?? 0;
  group.appendChild(label);
  group.appendChild(input);
  container.appendChild(group);

  const derivedList = document.createElement('div');
  derivedList.className = 'character-param-list';
  [corDBParam, corEBParam].forEach(param => {
    if (!param) return;
    const row = document.createElement('div');
    row.className = 'character-param-row';
    row.innerHTML = `<span>${param.label}</span><span>${param.value}</span>`;
    derivedList.appendChild(row);
  });
  container.appendChild(derivedList);

  return {
    getValues: () => ({
      'DX3:corruption': Number(input.value) || 0
    })
  };
}

export const DX3_PLUGIN = {
  id: 'DX3',
  label: 'ダブルクロス (3rd)',
  buildCharacterParameters: buildDX3Parameters,
  // buildRoomParameters: 未定義 → registry側で自動的に空オブジェクト扱い
  computeDerivedParameters: computeDX3DerivedParameters, // 🆕 計算ロジックを登録
  renderCharacterPanel: renderDX3CharacterPanel
};