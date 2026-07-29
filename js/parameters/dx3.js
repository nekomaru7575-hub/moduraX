import { buildParameters } from './paramFactory.js';
import { showEffectBox } from './dx3-effect-box.js';
import { showAbilitySkillBox } from './dx3-ability-box.js';
import { showComboBox, findComboByName, runComboActivate, runComboCheck, runComboDamage, runEffectUse } from './dx3-combo-box.js';
import { LIMIT_CATEGORIES } from './dx3-effect-box.js';

export const DX3_PARAMETERS =[
    {key : "corruption", label : "侵蝕率",value : 0},
    {key : "corDB", label : "DB",value : 0 , editable : false,visible : false},
    {key : "corEB", label : "EB",value : 0, editable : false,visible : false},
    {key : "attackPower", label : "攻撃力",value : 0,editable:true,visible:false},
    // エフェクトによるバフを受け取る汎用レジスタ（コンボに限らず判定/ダメージ全般で使う想定）。
    // コンボ発動時は、選択したエフェクトの「コンボ時修正」（dx3-effect-box.jsのCOMBO_MOD_FIELDS）を
    // ここへバフとして加算する（js/parameters/dx3-combo-box.jsのCOMBO_PARAM_MAP参照）。
    // 手入力での編集・一覧表示は想定しないためeditable:false・visible:falseだが、
    // バフ（ADD_BUFF）はeditableを見ずに加算できる。keyをDX3公式の略称（AdB等）にしているのは、
    // バフ/パラメータ変更コマンド（js/main.js）がlabel一致に加えてkey一致でも対象を特定できるため、
    // ラベル内の（）で示した略称をそのままチャットから参照できるようにするため。
    {key : "AdB", label : "判定ダイス修正(AdB)",value : 0, editable : false,visible : false},
    {key : "AnB", label : "判定固定値修正(AnB)",value : 0, editable : false,visible : false},
    {key : "AcB", label : "クリティカル修正(AcB)",value : 0, editable : false,visible : false},
    {key : "DdB", label : "ダメージダイス修正(DdB)",value : 0, editable : false,visible : false},
    {key : "DaB", label : "攻撃力修正(DaB)",value : 0, editable : false,visible : false},
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
function renderDX3CharacterPanel({
  container, mode, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue
}) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = 'ダブルクロス (3rd)';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  const corruptionParam = parameters['DX3:corruption'];
  const attackParam = parameters['DX3:attackPower']
  const corDBParam = parameters['DX3:corDB'];
  const corEBParam = parameters['DX3:corEB'];

  // 侵蝕率・DB・EBを横並びのコンパクトな枠で表示（縦スペースを節約する）
  const compactRow = document.createElement('div');
  compactRow.className = 'dx3-compact-row';

  const corruptionField = document.createElement('div');
  corruptionField.className = 'dx3-compact-field';
  const label = document.createElement('label');
  label.textContent = corruptionParam?.label ?? '侵蝕率';
  const input = document.createElement('input');
  input.type = 'number';
  input.value = corruptionParam?.value ?? 0;
  corruptionField.appendChild(label);
  corruptionField.appendChild(input);
  compactRow.appendChild(corruptionField);

  const attackField = document.createElement(`div`);
  attackField.className = "dx3-compact-field";
  const attackLabel = document.createElement(`label`);
  attackLabel.textContent = attackParam?.label ?? `攻撃力`;
  const attackInput = document.createElement(`input`);
  attackInput.type = `number`;
  attackInput.value = attackParam?.value ?? 0;
  attackField.appendChild(attackLabel);
  attackField.appendChild(attackInput);
  compactRow.appendChild(attackField);

  [corDBParam, corEBParam].forEach(param => {
    if (!param) return;
    const field = document.createElement('div');
    field.className = 'dx3-compact-field';
    field.innerHTML = `<label>${param.label}</label><span class="dx3-compact-value">${param.value}</span>`;
    compactRow.appendChild(field);
  });
  container.appendChild(compactRow);

  // エフェクトによるバフを受け取る汎用レジスタ（AdB/AnB/AcB/DdB/DaB）を表示。
  // コンボ発動等でバフが加算された際の現在値を確認できるようにする（手入力不可）。
  const BUFF_REGISTER_KEYS = ['AdB', 'AnB', 'AcB', 'DdB', 'DaB'];
  const buffRegisterParams = BUFF_REGISTER_KEYS
    .map(key => parameters[`DX3:${key}`])
    .filter(Boolean);

  if (buffRegisterParams.length > 0) {
    const buffSection = document.createElement('div');
    buffSection.className = 'dx3-buff-registers';

    const buffTitle = document.createElement('div');
    buffTitle.className = 'dx3-buff-registers-title';
    buffTitle.textContent = 'エフェクトによる修正値';
    buffSection.appendChild(buffTitle);

    // バフは基礎値(param.value)ではなく token.buffs 側に積まれるため、常に実効値
    // （基礎値＋アクティブなバフ合計）を読んで表示する。取得手段がない場合のみ基礎値で代用する。
    const token = getToken ? getToken() : null;
    const buffGrid = document.createElement('div');
    buffGrid.className = 'dx3-buff-register-grid';
    buffRegisterParams.forEach(param => {
      const paramId = `DX3:${param.key}`;
      const effectiveValue = (getEffectiveParameterValue && token)
        ? getEffectiveParameterValue(token, paramId)
        : param.value;
      const cell = document.createElement('div');
      cell.className = 'dx3-buff-register-cell';
      cell.title = param.label;
      cell.innerHTML = `<span class="dx3-buff-register-label">${param.key}</span><span class="dx3-buff-register-value">${effectiveValue ?? param.value}</span>`;
      buffGrid.appendChild(cell);
    });
    buffSection.appendChild(buffGrid);
    container.appendChild(buffSection);
  }

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
    // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のeffects/combosを読む。
    // getComponentsが無い場合のみ、開いた時点のスナップショット(components)にフォールバックする。
    const readEffects = () => (getComponents ? getComponents() : components)?.effects ?? [];
    const readCombos = () => (getComponents ? getComponents() : components)?.combos ?? [];

    const effectBtn = document.createElement('button');
    effectBtn.type = 'button';
    effectBtn.className = 'dialog-add-row-btn';
    effectBtn.style.marginTop = '8px';
    const updateEffectBtnLabel = () => {
      effectBtn.textContent = `エフェクト一覧を開く（${readEffects().length}件）`;
    };
    updateEffectBtnLabel();
    effectBtn.addEventListener('click', () => {
      showEffectBox({
        effects: readEffects(),
        onSave: (nextEffects) => {
          onComponentChange('effects', nextEffects);
          updateEffectBtnLabel();
        }
      });
    });
    container.appendChild(effectBtn);

    // コンボ一覧（ボックス）。発動/判定/ダメージの実行はチャットコマンド
    // （combo.awk/combo.chk/combo.dmg、js/main.js）から行うため、このボックス自体は
    // コンボの登録・編集とコマンドのコピーのみを担当する。
    const comboBtn = document.createElement('button');
    comboBtn.type = 'button';
    comboBtn.className = 'dialog-add-row-btn';
    comboBtn.style.marginTop = '8px';
    const updateComboBtnLabel = () => {
      comboBtn.textContent = `コンボ一覧を開く（${readCombos().length}件）`;
    };
    updateComboBtnLabel();
    comboBtn.addEventListener('click', () => {
      showComboBox({
        combos: readCombos(),
        effects: readEffects(),
        parameters,
        onSave: (nextCombos) => {
          onComponentChange('combos', nextCombos);
          updateComboBtnLabel();
        }
      });
    });
    container.appendChild(comboBtn);
  }

  return {
    getValues: () => ({
      'DX3:corruption': Number(input.value) || 0,
      'DX3:attackPower': Number(attackInput.value) || 0
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
  skillRC: 'RC'
};

// 知識/芸術/運転/情報のような可変スロット技能。キャラクターごとに名前が異なるため
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
      timing: json[`effect${n}Timing`] ?? '',
      level: toNumber(json[`effect${n}Lv`]),
      encroach: json[`effect${n}Encroach`] ?? '',
      note: json[`effect${n}Note`] ?? '',
      // 回数制限（シナリオ/シーン/ラウンド）はシート側に構造化フィールドがないため、
      // 初期値は制限なし。ボックスUI側で手入力する。
      limits: {
        scenario: { current: 0, max: null },
        scene: { current: 0, max: null },
        round: { current: 0, max: null }
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
 *   components: { effects: Array<{name:string,timing:string,level:number,encroach:string,note:string,limits:Record<'scenario'|'scene'|'round',{current:number,max:number|null}>}> }
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

// コンボのチャットコマンド。combo.awk(コンボ名)で発動、combo.chk(コンボ名)で判定、
// combo.dmg(コンボ名)でダメージロールする（実処理はdx3-combo-box.jsのrunComboActivate等）。
// コンボ名は参照キャラクターのcomponents.combosから完全一致で探す。
const COMBO_COMMAND_PATTERN = /^combo\.(awk|chk|dmg)\((.+)\)$/;

// エフェクト単体を自身へ適用するチャットコマンド。コンボを介さず、修正値バフの付与・
// 使用数+1・上昇侵蝕率の即時反映をまとめて行う（実処理はdx3-combo-box.jsのrunEffectUse）。
const EFFECT_USE_COMMAND_PATTERN = /^エフェクト使用\((.+)\)$/;

/**
 * DX3プラグイン固有のチャットコマンドを解釈・実行する。
 * @param {string} rawInput
 * @param {{
 *   token: object|null,
 *   dispatch: (action:string, payload:object) => void,
 *   getEffectiveParameterValue: (token:object, paramId:string) => number|undefined,
 *   generateBuffId: () => string,
 *   rollBCDice: (system:string, command:string) => Promise<{success:boolean, resultText:string}>
 * }} context
 * @returns {boolean} コマンドとして処理したか。falseの場合、呼び出し元は通常の
 *   ダイスロール等にフォールバックする。
 */
function handleDX3ChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice }) {
  const effectUseMatch = rawInput.match(EFFECT_USE_COMMAND_PATTERN);
  if (effectUseMatch) {
    const name = effectUseMatch[1].trim();

    if (!token) {
      alert('エフェクトを使用する参照キャラクターを選択してください。');
      return true;
    }

    const effects = token.components?.effects ?? [];
    const effect = effects.find(e => e.name === name);
    if (!effect) {
      alert(`エフェクト「${name}」が見つかりません。`);
      return true;
    }

    const tokenId = token.id;
    runEffectUse({
      effect, effects, tokenId, dispatch, getToken: () => token, getEffectiveParameterValue, generateBuffId,
      onSaveEffects: (nextEffects) => dispatch('SET_COMPONENT', { id: tokenId, componentKey: 'effects', value: nextEffects })
    });
    return true;
  }

  const match = rawInput.match(COMBO_COMMAND_PATTERN);
  if (!match) return false;

  const [, action, rawName] = match;
  const name = rawName.trim();

  if (!token) {
    alert('コンボを実行する参照キャラクターを選択してください。');
    return true;
  }

  const combos = token.components?.combos ?? [];
  const combo = findComboByName(combos, name);
  if (!combo) {
    alert(`コンボ「${name}」が見つかりません。`);
    return true;
  }

  const tokenId = token.id;
  const getToken = () => token;
  const effects = token.components?.effects ?? [];

  if (action === 'awk') {
    runComboActivate({
      combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId,
      onSaveEffects: (nextEffects) => dispatch('SET_COMPONENT', { id: tokenId, componentKey: 'effects', value: nextEffects })
    });
  } else if (action === 'chk') {
    runComboCheck({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice });
  } else if (action === 'dmg') {
    runComboDamage({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice });
  }

  return true;
}

// シーン/ラウンド/シナリオ終了時、該当カテゴリのエフェクト使用数(current)を0へ戻す。
// 判定終了/プロセス終了はエフェクトの使用制限カテゴリに存在しないため無変更で返す。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetDX3ComponentsOnPhaseEnd(components, phase) {
  if (!LIMIT_CATEGORIES.includes(phase)) return components;

  const effects = components?.effects;
  if (!effects || effects.length === 0) return components;

  let changed = false;
  const nextEffects = effects.map(effect => {
    const limit = effect.limits?.[phase];
    if (!limit || (limit.current || 0) === 0) return effect;
    changed = true;
    return { ...effect, limits: { ...effect.limits, [phase]: { ...limit, current: 0 } } };
  });

  return changed ? { ...components, effects: nextEffects } : components;
}

export const DX3_PLUGIN = {
  id: 'DX3',
  label: 'ダブルクロス (3rd)',
  buildCharacterParameters: buildDX3Parameters,
  // buildRoomParameters: 未定義 → registry側で自動的に空オブジェクト扱い
  computeDerivedParameters: computeDX3DerivedParameters, // 🆕 計算ロジックを登録
  renderCharacterPanel: renderDX3CharacterPanel,
  importCharacterJson: importDX3CharacterJson,
  handleChatCommand: handleDX3ChatCommand,
  resetComponentsOnPhaseEnd: resetDX3ComponentsOnPhaseEnd
};