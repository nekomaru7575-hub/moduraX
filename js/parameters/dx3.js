import { buildParameters } from './paramFactory.js';
import { showEffectBox } from './dx3-effect-box.js';
import { showAbilitySkillBox } from './dx3-ability-box.js';

export const DX3_PARAMETERS =[
    {key : "corruption", label : "侵蝕率",value : 0},
    {key : "corDB", label : "DB",value : 0 , editable : false,visible : false},
    {key : "corEB", label : "EB",value : 0, editable : false,visible : false},
    // 能力値・技能値：JSON読み込みで同期する値。手入力での編集・表示は想定しないため
    // locked:true（削除不可）,editable:false（値の直接編集不可）,visible:false（一覧非表示）
    {key : "sttTotalBody", label : "肉体",value : 0, locked : true, editable : false,visible : false},
    {key : "sttTotalSense", label : "感覚",value : 0, locked : true, editable : false,visible : false},
    {key : "sttTotalMind", label : "精神",value : 0, locked : true, editable : false,visible : false},
    {key : "sttTotalSocial", label : "社会",value : 0, locked : true, editable : false,visible : false},
    {key : "skillMelee", label : "白兵",value : 0, locked : true, editable : false,visible : false},
    {key : "skillRanged", label : "射撃",value : 0, locked : true, editable : false,visible : false},
    {key : "skillDodge", label : "回避",value : 0, locked : true, editable : false,visible : false},
    {key : "skillProcure", label : "調達",value : 0, locked : true, editable : false,visible : false},
    {key : "skillPercept", label : "知覚",value : 0, locked : true, editable : false,visible : false},
    {key : "skillWill", label : "意志",value : 0, locked : true, editable : false,visible : false},
    {key : "skillNegotiate", label : "交渉",value : 0, locked : true, editable : false,visible : false},
    {key : "skillRC", label : "RC",value : 0, locked : true, editable : false,visible : false} // 表記がシート上の略称のままか要確認
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
function renderDX3CharacterPanel({ container, mode, parameters, components, onComponentChange }) {
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

  // エフェクト一覧（ボックス）。既存キャラクターの更新時のみ開ける
  // （新規作成時はまだcomponentsを持たないため対象外）。
  if (mode === 'edit') {
    const abilityBtn = document.createElement('button');
    abilityBtn.type = 'button';
    abilityBtn.className = 'dialog-add-row-btn';
    abilityBtn.style.marginTop = '8px';
    abilityBtn.textContent = '能力・技能値を表示';
    abilityBtn.addEventListener('click', () => {
      showAbilitySkillBox({ parameters });
    });
    container.appendChild(abilityBtn);
  }

  if (mode === 'edit' && onComponentChange) {
    const effectBtn = document.createElement('button');
    effectBtn.type = 'button';
    effectBtn.className = 'dialog-add-row-btn';
    effectBtn.style.marginTop = '8px';
    effectBtn.textContent = `エフェクト一覧を開く（${(components?.effects ?? []).length}件）`;
    effectBtn.addEventListener('click', () => {
      showEffectBox({
        effects: components?.effects ?? [],
        onSave: (nextEffects) => onComponentChange('effects', nextEffects)
      });
    });
    container.appendChild(effectBtn);
  }

  return {
    getValues: () => ({
      'DX3:corruption': Number(input.value) || 0
    })
  };
}

// DX3の能力値（固定4種）。キャラシート作成ツールのJSONキー → 表示ラベル
const DX3_ABILITY_FIELD_MAP = {
  sttTotalBody: '肉体',
  sttTotalSense: '感覚',
  sttTotalMind: '精神',
  sttTotalSocial: '社会'
};

// DX3の固定技能（8種）。常に存在するためDX3_PARAMETERSにも既定パラメータとして登録済み。
const DX3_FIXED_SKILL_FIELD_MAP = {
  skillMelee: '白兵',
  skillRanged: '射撃',
  skillDodge: '回避',
  skillProcure: '調達',
  skillPercept: '知覚',
  skillWill: '意志',
  skillNegotiate: '交渉',
  skillRC: 'RC' // 表記がシート上の略称のままか要確認
};

// 知識/技芸/騎乗/情報のような可変スロット技能。キャラクターごとに名前が異なるため
// DX3_PARAMETERSには含めず、JSON読み込み時に見つかった分だけnewParametersとして追加する。
const DX3_SKILL_SLOT_CATEGORIES = ['Art', 'Know', 'Ride', 'Info'];
const DX3_MAX_SKILL_SLOTS = 10; // シート上のNum値に関わらず安全に走査するための上限

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// 見出し行（"▼オート"等の区切り）はエフェクト本体ではないため除外する
const DX3_EFFECT_HEADER_PATTERN = /^▼/;

// effectNNameを起点に、シート上の全エフェクトを読み込む。
// 回数制限（シナリオ/シーン/ラウンド×n回）はシート側に専用フィールドがないため、
// ここでは初期値なし（制限なし）とし、ボックスUI側で手入力できるようにする。
function importDX3Effects(json) {
  const effectNum = toNumber(json.effectNum);
  const effects = [];

  for (let n = 1; n <= effectNum; n++) {
    const name = json[`effect${n}Name`];
    if (!name || DX3_EFFECT_HEADER_PATTERN.test(name)) continue;

    effects.push({
      name,
      level: toNumber(json[`effect${n}Lv`]),
      encroach: json[`effect${n}Encroach`] ?? '',
      note: json[`effect${n}Note`] ?? '',
      // 回数制限（シナリオ/シーン/ラウンド）はシート側に構造化フィールドがないため、
      // 初期値は制限なし。ボックスUI側で手入力する。
      limits: {
        scenario: { current: 0, max: null, ebBonus: false },
        scene: { current: 0, max: null, ebBonus: false },
        round: { current: 0, max: null, ebBonus: false }
      }
    });
  }

  return effects;
}

// 可変スロット技能（skillArt1/skillArt1Name等）のうち、名前が設定されているものだけを
// locked:true, editable:false, visible:falseの新規パラメータとして拾い上げる。
function importDX3VariableSkillSlots(json) {
  const newParameters = {};

  DX3_SKILL_SLOT_CATEGORIES.forEach(category => {
    for (let n = 1; n <= DX3_MAX_SKILL_SLOTS; n++) {
      const nameField = `skill${category}${n}Name`;
      const valueField = `skill${category}${n}`;
      if (json[nameField] === undefined && json[valueField] === undefined) continue;

      const label = json[nameField];
      if (!label) continue; // スロットはあっても未使用（名前未設定）

      newParameters[`DX3:${valueField}`] = {
        key: valueField,
        label,
        value: toNumber(json[valueField]),
        source: 'DX3',
        locked: true,
        editable: false,
        visible: false
      };
    }
  });

  return newParameters;
}

/**
 * 既存のキャラクターシート作成ツール（ytsheet/dx3rd等）が出力するJSONを取り込む。
 * 能力値・技能値はDX3_PARAMETERSに既定パラメータとして存在するため、ここでは
 * 値の同期のみ行う（新規パラメータとしては追加しない）。
 * エフェクトはcomponents.effectsとして丸ごと読み込む（ボックスUIで表示・編集）。
 * ロイス・コンボ（複数データをまとめる拡張ボックス）は今回はまだ対象外。
 * @param {any} json
 * @returns {{
 *   name?: string,
 *   valueOverrides: Record<string, number>,
 *   labelOverrides: Record<string, string>,
 *   newParameters: Record<string, {key:string,label:string,value:number,source:string,visible:boolean}>,
 *   components: { effects: Array<{name:string,level:number,encroach:string,note:string,limits:Record<'scenario'|'scene'|'round',{current:number,max:number|null,ebBonus:boolean}>}> }
 * } | null}
 */
function importDX3CharacterJson(json) {
  if (!json || typeof json !== 'object') return null;

  const valueOverrides = {};
  if (json.maxHpTotal !== undefined) valueOverrides['core:hp'] = toNumber(json.maxHpTotal);
  if (json.initiativeTotal !== undefined) valueOverrides['core:initiative'] = toNumber(json.initiativeTotal);
  if (json.baseEncroach !== undefined) valueOverrides['DX3:corruption'] = toNumber(json.baseEncroach);

  Object.keys(DX3_ABILITY_FIELD_MAP).forEach(field => {
    if (json[field] === undefined) return;
    valueOverrides[`DX3:${field}`] = toNumber(json[field]);
  });
  Object.keys(DX3_FIXED_SKILL_FIELD_MAP).forEach(field => {
    if (json[field] === undefined) return;
    valueOverrides[`DX3:${field}`] = toNumber(json[field]);
  });

  return {
    name: typeof json.characterName === 'string' ? json.characterName : undefined,
    valueOverrides,
    labelOverrides: {
      'core:initiative': '行動値'
    },
    newParameters: importDX3VariableSkillSlots(json),
    components: {
      effects: importDX3Effects(json)
    }
  };
}

export const DX3_PLUGIN = {
  id: 'DX3',
  label: 'ダブルクロス (3rd)',
  buildCharacterParameters: buildDX3Parameters,
  // buildRoomParameters: 未定義 → registry側で自動的に空オブジェクト扱い
  computeDerivedParameters: computeDX3DerivedParameters, // 🆕 計算ロジックを登録
  renderCharacterPanel: renderDX3CharacterPanel,
  importCharacterJson: importDX3CharacterJson
};