import { buildParameters } from './paramFactory.js';
import { showEffectBox } from './dx3-effect-box.js';
import { showAbilitySkillBox } from './dx3-ability-box.js';
import { showComboBox, findComboByName, runComboActivate, runComboCheck, runComboDamage, runEffectUse } from './dx3-combo-box.js';
import { LIMIT_CATEGORIES } from './dx3-effect-box.js';
import {
  showLoisBox, countActiveLois, normalizeLoisList, LOIS_COMPONENT_KEY, LOIS_MAX
} from './dx3-lois-box.js';
import { lockFormControls } from '../read-only-form.js';

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
    {key : "skillRC", label : "RC",value : 0, locked : true, editable : false,visible : false}, // 表記がシート上の略称のままか要確認
    // ロイス数：components.lois（ロイスボックスの中身）から自動計算される値。
    // 「D」「E」ではないロイスで、タイタスでないものの数（js/parameters/dx3-lois-box.jsのcountActiveLois）。
    // 手入力は不可（editable:false）だが、キャラクター一覧には出す（visible:true）。
    {key : "lois", label : "ロイス",value : 0, locked : true, editable : false, visible : true}
]

export function buildDX3Parameters(){
    return buildParameters("DX3",DX3_PARAMETERS,{locked : true});
}

// パラメータ・componentsから自動計算される値をまとめて返す。
// componentsを受け取るのは、ロイス数がボックスの中身（components.lois）から決まるため
// （js/parameters/registry.jsのapplyPluginDerivedParameters経由で渡される）。
export function computeDX3DerivedParameters(parameters, components = {}) {
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
        'DX3:corEB': eb,
        'DX3:lois': countActiveLois(components?.[LOIS_COMPONENT_KEY])
    };
}

// キャラ作成/更新ダイアログのプラグイン専用スペースに描画するDX3独自のUI。
// Core側の汎用パラメータ一覧とは別に、このプラグインだけの見た目・構成で表示する。
function renderDX3CharacterPanel({
  container, mode, canEdit = true, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue
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

  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のcomponentsを読む。
  // getComponentsが無い場合のみ、開いた時点のスナップショット(components)にフォールバックする。
  const readComponents = () => (getComponents ? getComponents() : components) ?? {};

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

  // ロイス数はDB/EBと同じ読み取り専用の表示だが、値の元がcomponents側にあり、
  // ボックスを保存するとこのダイアログを開いたままでも変わる。parameters（開いた時点の
  // スナップショット）を読むと古い数字が残るため、常にcomponentsから数え直す。
  const loisField = document.createElement('div');
  loisField.className = 'dx3-compact-field';
  const loisLabel = document.createElement('label');
  loisLabel.textContent = parameters['DX3:lois']?.label ?? 'ロイス';
  const loisValue = document.createElement('span');
  loisValue.className = 'dx3-compact-value';
  loisField.appendChild(loisLabel);
  loisField.appendChild(loisValue);
  compactRow.appendChild(loisField);

  const updateLoisCount = () => {
    loisValue.textContent = countActiveLois(readComponents()[LOIS_COMPONENT_KEY]);
  };
  updateLoisCount();

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

  // ボックスを開くボタン。表示だけの人（canEdit:false）にも押させたいので、
  // 末尾の一括無効化から外せるよう参照を持っておく。
  let abilityBtn = null;
  let loisBtn = null;
  let effectBtn = null;
  let comboBtn = null;

  // エフェクト一覧（ボックス）。既存キャラクターの更新時のみ開ける
  // （新規作成時はまだcomponentsを持たないため対象外）。
  if (mode === 'edit') {
    abilityBtn = document.createElement('button');
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
    const readEffects = () => readComponents().effects ?? [];
    const readCombos = () => readComponents().combos ?? [];
    const readLois = () => readComponents()[LOIS_COMPONENT_KEY] ?? [];

    // ロイス一覧（ボックス）。パラメータ「ロイス」はここで登録した内容から自動計算される。
    loisBtn = document.createElement('button');
    loisBtn.type = 'button';
    loisBtn.className = 'dialog-add-row-btn';
    loisBtn.style.marginTop = '8px';
    const updateLoisBtnLabel = () => {
      loisBtn.textContent = `ロイスを表示する（${readLois().length}/${LOIS_MAX}件）`;
    };
    updateLoisBtnLabel();
    loisBtn.addEventListener('click', () => {
      showLoisBox({
        lois: readLois(),
        readOnly: !canEdit,
        onSave: (nextLois) => {
          onComponentChange(LOIS_COMPONENT_KEY, nextLois);
          updateLoisBtnLabel();
          updateLoisCount();
        }
      });
    });
    container.appendChild(loisBtn);

    effectBtn = document.createElement('button');
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
        // コンボ時修正の式に書ける{パラメータ名}の検証・提示に使う
        parameters,
        readOnly: !canEdit,
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
    comboBtn = document.createElement('button');
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
        readOnly: !canEdit,
        onSave: (nextCombos) => {
          onComponentChange('combos', nextCombos);
          updateComboBtnLabel();
        }
      });
    });
    container.appendChild(comboBtn);
  }

  // 表示だけの人には侵蝕率・攻撃力の入力を固め、ボックスを開くボタンだけ残す
  // （ボックスの中身はそれぞれのreadOnlyで表示専用になる）。
  if (!canEdit) {
    lockFormControls(container, { keep: [abilityBtn, loisBtn, effectBtn, comboBtn] });
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

// シート上のロイス欄の状態（lois{N}State）→ ボックス側の状態。
// 表記が違う/空欄の場合はロイス扱いにする（タイタスは明示されている時だけ）。
const DX3_SHEET_TITUS_STATE = 'タイタス';

// lois1Name〜lois7Name等を起点に、シート上のロイスを読み込む。
// 「昇華」に対応するフィールドはシート側に無いため、常に未昇華として取り込む。
function importDX3Lois(json) {
  const lois = [];

  for (let n = 1; n <= LOIS_MAX; n++) {
    const name = json[`lois${n}Name`] ?? '';
    const relation = json[`lois${n}Relation`] ?? '';
    const positive = json[`lois${n}EmoPosi`] ?? '';
    const negative = json[`lois${n}EmoNega`] ?? '';
    const note = json[`lois${n}Note`] ?? '';

    // シートは未使用スロットにもlois{N}State（'ロイス'）だけを出力するため、
    // Stateだけを見て空行を作らないよう、中身のある欄で判定する。
    if (!name && !positive && !negative && !note && !relation) continue;

    lois.push({
      // 種類はシートと同じ表記（D/S/E）。未知の値はnormalizeLois側で「（種類なし）」に丸まる。
      relation,
      name,
      emotion: {
        positive,
        negative,
        // シートはlois{N}EmoPosiCheck / lois{N}EmoNegaCheckの片方に'1'を入れて優位な側を示す。
        // どちらも無い場合はP感情を優位として扱う（ボックス側の既定と同じ）。
        dominant: json[`lois${n}EmoNegaCheck`] === '1' ? 'negative' : 'positive'
      },
      state: json[`lois${n}State`] === DX3_SHEET_TITUS_STATE ? 'titus' : 'lois',
      sublimated: false,
      note
    });
  }

  // 欠けたフィールドの補完と、種類・状態の値の検証はボックス側の正規化に任せる
  return normalizeLoisList(lois);
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
 * エフェクト・ロイスはcomponents.effects / components.loisとして丸ごと読み込む
 * （それぞれのボックスUIで表示・編集）。パラメータ「ロイス」の値はcomponents.loisから
 * 自動計算されるため、ここでvalueOverridesとして渡す必要はない。
 * コンボ（複数データをまとめる拡張ボックス）は今回はまだ対象外。
 * @param {any} json
 * @returns {{
 *   name?: string,
 *   valueOverrides: Record<string, number>,
 *   labelOverrides: Record<string, string>,
 *   newParameters: Record<string, {key:string,label:string,value:number,source:string,visible:boolean}>,
 *   components: {
 *     effects: Array<{name:string,timing:string,level:number,encroach:string,note:string,limits:Record<'scenario'|'scene'|'round',{current:number,max:number|null}>}>,
 *     lois: Array<{relation:string,name:string,emotion:{positive:string,negative:string,dominant:'positive'|'negative'},state:'lois'|'titus',sublimated:boolean,note:string}>
 *   }
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
      effects: importDX3Effects(json),
      [LOIS_COMPONENT_KEY]: importDX3Lois(json)
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

// この入力がDX3のコマンド構文に見えるか（実行できるかは問わない）。プラグインが適用されて
// いない部屋でDX3のコマンドを打った場合、Core側は構文を知らないため素通りしてただの発言に
// なってしまう。それを避けて理由を返せるようにするための判定
// （js/parameters/registry.jsのfindPluginForChatCommand経由でjs/main.jsが使う）。
function looksLikeDX3ChatCommand(rawInput) {
  return COMBO_COMMAND_PATTERN.test(rawInput) || EFFECT_USE_COMMAND_PATTERN.test(rawInput);
}

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
// フェーズの入れ子はCore側が1段ずつ呼び分けて処理する（例: シナリオ終了なら
// scenario→scene→round→…の順に呼ばれる）ので、ここは渡されたカテゴリだけを見ればよい。
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

// クリティカル値の下限を持てるのはクリティカル修正(AcB)へのバフだけ。
// クリティカル値は 10＋AcB で決まるため、下限も「AcBの下限」ではなく
// 「10＋AcBの下限」＝クリティカル値そのものの下限として扱う
// （適用はjs/parameters/dx3-combo-box.jsのlowestBuffCriticalFloor）。
const CRITICAL_FLOOR_PARAM_ID = 'DX3:AcB';
const CRITICAL_FLOOR_HINT = 'クリティカル値の下限（空欄で下限なし）';

// バフ/デバフ付与ダイアログ（js/buff-dialog.js）に出す、DX3独自の追加入力欄。
// 対象パラメータがAcBのときだけ下限欄を出す（他のパラメータでは意味を持たないため）。
function renderDX3BuffFields({ container, paramId }) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = CRITICAL_FLOOR_HINT;

  const input = document.createElement('input');
  input.type = 'number';
  input.placeholder = '下限';

  group.appendChild(label);
  group.appendChild(input);
  container.appendChild(group);

  const sync = (nextParamId) => {
    const applicable = nextParamId === CRITICAL_FLOOR_PARAM_ID;
    group.style.display = applicable ? '' : 'none';
    // 対象を切り替えたときに、前の対象で入れた値が残って付与されないようにする
    if (!applicable) input.value = '';
  };
  sync(paramId);

  return {
    sync,
    getMeta: () => {
      const raw = input.value.trim();
      if (raw === '') return null;
      const floor = Number(raw);
      return Number.isFinite(floor) ? { criticalFloor: floor } : null;
    }
  };
}

// バフ()コマンドの省略可能な追加引数（例: バフ(集中,AcB,-1,シーン,7) の「7」）。
function parseDX3BuffExtra(paramId, text) {
  if (paramId !== CRITICAL_FLOOR_PARAM_ID) return null;
  const floor = Number(String(text).trim());
  return Number.isFinite(floor) ? { criticalFloor: floor } : null;
}

function describeDX3BuffMeta(buff) {
  const floor = buff?.meta?.criticalFloor;
  return Number.isFinite(floor) ? `（クリティカル値下限 ${floor}）` : '';
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
  looksLikeOwnChatCommand: looksLikeDX3ChatCommand,
  resetComponentsOnPhaseEnd: resetDX3ComponentsOnPhaseEnd,
  // バフ/デバフに載せるDX3固有の付随データ（buff.meta）の入出力。
  // Core側（js/buff-dialog.js・js/main.js）はmetaの中身を解釈せず、ここへ委ねる。
  buffFields: {
    render: renderDX3BuffFields,
    parseExtra: parseDX3BuffExtra,
    describe: describeDX3BuffMeta
  }
};