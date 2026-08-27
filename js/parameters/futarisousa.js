// js/parameters/futarisousa.js
// バディサスペンスTRPG フタリソウサ のプラグイン記述子。
//
// このシステム特有の事情が2つあり、それぞれCoreをほとんど改造せずに扱っている。
//
// 1. コマが「探偵／助手／NPC」のどれかで、持てるものが変わる
//    buildCharacterParametersは引数を受け取れないので、属性ごとにパラメータ集合を
//    変えることはできない。全属性ぶんを最初から配っておき、キャラクター一覧へ出すか
//    どうか（visible）の出し分けで属性を表現する。ドラクルージュのPC/NPCと同じ作りで、
//    切り替えはSET_PARAMETER_VISIBILITY（値を変えないのでsourceもeditableも見ない）。
//    属性を切り替えても、書いた中身（components）は消さない。取り消しの効かない画面で
//    1クリックで全部消えるのを避けるためで、見えなくなるだけなので戻せば元に戻る。
//
// 2. 探偵のアクションのコストを、パートナー（助手）の「余裕」から払う
//    スキル枠組みのコスト宣言（field.onUse）は「自分の基礎値にしか書けない」「残量を
//    見ないのでマイナスへ突き抜ける」の2点で足りない。そこでonUseは宣言せず、
//    runSkillUse({ applyCosts:false }) で支払いを切って自前で払う（runFutariSousaActionUse）。
//    順序は「前で弾き、後で払う」。createListSpecのスキルは使用可否の判定を持たないため
//    runSkillUseは必ずログを出す。後で弾くと「ログが出てから足りないと言われる」ことになる。
//    払うのを後にするのは、runSkillUseが何もせず終わったときにコストだけ減らないため。
//    シノビガミの忍法コスト（js/parameters/shinobigami.js）と同じ並び。
//
// 【承知の上の割り切り】
//  ・パートナーは「コマ名」で持つ。コマを改名すると切れるし、同名のコマが2つあれば先頭が
//    採られる。IDで持てば追随するが、(a)選ばせるUIが無い (b)盤面の無いコマ作成ツールでは
//    選べない (c)別の部屋へJSONを持ち込むとIDが無効、の3点で名前のほうが実用的。
//    シノビガミの感情修正（runEmotionModifier）と同じ割り切り。
//  ・他人のコマの基礎値を減らす経路は、このプラグインが初めて（バフを撒く経路は既にある）。
//    歯止めは「パートナー欄に助手として書かれた1体だけ」「コスト分ちょうど」「ログに必ず
//    誰のいくつが動いたか残る」の3つだけで、悪意には勝てない。限定公開と同じく「うっかり
//    壊さない」までしか保証しない、という既存の姿勢の範囲（js/visibility.jsの但し書き）。
//  ・アクションはcreateListSpecなので、後から「常駐は使用不可」「1シナリオ1回」のような
//    制限は宣言できない（periodsもallowConditionsも潰される）。必要になったら
//    createSkillSpecへ格上げする。保存される形は同じなのでデータ移行は要らない。
//  ・新規作成のダイアログではsyncTypeVisibilityが走らない（tokenIdもdispatchも無い）。
//    作成時に「助手」を選んだコマは、最初だけ余裕・心労がキャラクター一覧に出ない。
//    一度更新ダイアログを開けば揃う（ドラクルージュも同じ）。

import { buildParameters } from './paramFactory.js';
import { lockFormControls } from '../read-only-form.js';
import { HIDDEN_VALUE_MASK, isRestricted } from '../visibility.js';
import {
  buildSkillUseCommand, buildSkillUseCommandPattern, createListSpec, findSkillByName,
  normalizeSkillList
} from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { runSkillUse } from './skill/skill-use.js';
import {
  SKILL_COMPONENT_KEY, countFilledSkills, normalizeFutariSousaSkills, showFutariSousaSkillBox
} from './futarisousa-skill-box.js';

const PLUGIN_ID = 'FUTARISOUSA';

// BCDice側のシステムID。ルーム設定でこのプラグインを選ぶと、ダイスコマンドの解釈規則も
// これに合わせて切り替わる（js/main.jsのプラグイン選択。stampsと同じく宣言するだけ）。
// BCDiceのlib/bcdice/game_system/FutariSousa.rb の ID と一字一句同じにすること。
export const FUTARISOUSA_BCDICE_SYSTEM = 'FutariSousa';

const CHAR_TYPE_DETECTIVE = '探偵';
const CHAR_TYPE_ASSISTANT = '助手';
const CHAR_TYPE_NPC = 'NPC';

const paramIdOf = (definition) => `${PLUGIN_ID}:${definition.key}`;

// 属性。キャラクター一覧には出さない（visible:false）が、パネルから書き換えるので
// editable:trueが要る（editable:falseだとSET_PARAMETERがガードに弾かれる）。
const CHAR_TYPE_PARAMETER = {
  key: 'charType', label: '属性', value: CHAR_TYPE_DETECTIVE,
  locked: true, editable: true, visible: false
};

// 探偵と助手が共通で持つもの。宣言時のvisibleは「新規コマの既定＝探偵」に合わせる。
const SHARED_PARAMETERS = [
  { key: 'partner', label: 'パートナー', value: '', locked: true, editable: true, visible: true, field: 'text' }
];

// 助手だけが持つもの。宣言時のvisibleはfalseにすること：新規コマの既定は探偵なので、
// 助手用は最初は隠しておき、属性を切り替えたときにsyncTypeVisibilityが出す。
const ASSISTANT_PARAMETERS = [
  { key: 'margin', label: '余裕', value: 0, locked: true, editable: true, visible: false, field: 'number' },
  // 心労チェックの数から導かれる値（computeFutariSousaDerivedParameters）。手では直せない
  // ので editable:false。この行はパネルの入力欄にも出さない（出すとgetValues()が値を返し、
  // SET_PARAMETERのガードに弾かれてコンソールに警告が出るだけになる）。
  { key: 'stress', label: '心労', value: 0, locked: true, editable: false, visible: false, field: 'derived' }
];

const CHAR_TYPE_PARAM_ID = paramIdOf(CHAR_TYPE_PARAMETER);
const PARTNER_PARAM_ID = `${PLUGIN_ID}:partner`;
const MARGIN_PARAM_ID = `${PLUGIN_ID}:margin`;
const STRESS_PARAM_ID = `${PLUGIN_ID}:stress`;

const SHARED_PARAM_IDS = SHARED_PARAMETERS.map(paramIdOf);
const ASSISTANT_PARAM_IDS = ASSISTANT_PARAMETERS.map(paramIdOf);
// 属性によって一覧への出し入れが切り替わるパラメータ全部（属性そのものは常に非表示）
const TYPED_PARAM_IDS = [...SHARED_PARAM_IDS, ...ASSISTANT_PARAM_IDS];

// 心労のチェック。枠は3つで固定、名前を持たないので配列で持つ。
const STRESS_COMPONENT_KEY = 'stressChecks';
const STRESS_MAX = 3;

// --- アクション ---
// 名称と効果は枠組みの組み込み欄（name / note）なので宣言しない。
// コストは数値1つで、0が「なし」。sumSkillCostsも0を「払うものが無い」と読む枠組みの流儀に
// 合わせてある。ただし支払いそのものはonUseに任せず自前でやる（冒頭の2番参照）。
const ACTION_COMPONENT_KEY = 'actions';

const ACTION_SPEC = createListSpec({
  id: 'futarisousa-action',
  noun: 'アクション',
  componentKey: ACTION_COMPONENT_KEY,
  fields: [
    {
      key: 'kind', label: '種別', type: 'select', className: 'effect-box-level',
      options: [{ value: '常駐', label: '常駐' }, { value: '補助', label: '補助' }]
    },
    { key: 'cost', label: 'コスト', type: 'number', className: 'effect-box-level' }
  ],
  hasUseCommand: true,
  rowActions: [{ key: 'use', label: '使用', run: runActionUseFromBox }]
});

const ACTION_USE_COMMAND_PATTERN = buildSkillUseCommandPattern(ACTION_SPEC);

// --- 感情 ---
// 内容は名前列で持つ。skill-boxは名前列の見出しとplaceholderを `${noun}名` に固定していて
// 差し替えられないので、見出しは「感情名」と出る。承知の上でそう使っている。
const EMOTION_COMPONENT_KEY = 'emotions';

const EMOTION_SPEC = createListSpec({
  id: 'futarisousa-emotion',
  noun: '感情',
  componentKey: EMOTION_COMPONENT_KEY,
  // 内容を名前列で持つので、もう1つ自由記述（note）は出さない
  allowNote: false,
  fields: [
    {
      key: 'polarity', label: '気に入った／気に入らない', type: 'toggle',
      // トグルの幅は枠のclassNameが決める（.effect-box-field > button が .effect-box-toggle の
      // flex:0 0 84px を打ち消す）。既定の幅ではこの長さのラベルが切れる。
      className: 'effect-box-name',
      options: [
        { value: 'like', label: '気に入ったところ' },
        { value: 'dislike', label: '気に入らないところ' }
      ]
    },
    { key: 'strong', label: '強い感情', type: 'checkbox' }
  ]
});

// --- ゲスト（助手だけが持つ） ---
// メモを組み込みのnote欄にしないのは、noteのplaceholderが'効果'固定で見出しも付かず、
// 「効果」と書いてある欄にメモを書かせることになるため。欄にすれば見出しが「メモ」と出る
// （アリアンロッドのコネクションが同じ理由でallowNote:falseにしている）。
const GUEST_COMPONENT_KEY = 'guests';

const GUEST_SPEC = createListSpec({
  id: 'futarisousa-guest',
  noun: 'ゲスト',
  componentKey: GUEST_COMPONENT_KEY,
  allowNote: false,
  fields: [
    { key: 'skill', label: '技能', type: 'text', className: 'effect-box-timing' },
    { key: 'relation', label: '関係', type: 'text', className: 'effect-box-timing' },
    { key: 'memo', label: 'メモ', type: 'text', className: 'effect-box-name' }
  ]
});

function buildFutariSousaCharacterParameters() {
  return buildParameters(PLUGIN_ID, [
    CHAR_TYPE_PARAMETER, ...SHARED_PARAMETERS, ...ASSISTANT_PARAMETERS
  ]);
}

function normalizeCharType(value) {
  if (value === CHAR_TYPE_ASSISTANT) return CHAR_TYPE_ASSISTANT;
  if (value === CHAR_TYPE_NPC) return CHAR_TYPE_NPC;
  return CHAR_TYPE_DETECTIVE;
}

function readCharType(parameters) {
  return normalizeCharType(parameters?.[CHAR_TYPE_PARAM_ID]?.value);
}

// その属性が持つパラメータの定義（パネルの入力欄の出し分け）。
// 心労は導出値なので、助手であっても入力欄は作らない（field:'derived'で外す）。
function definitionsFor(charType) {
  if (charType === CHAR_TYPE_NPC) return [];
  const definitions = charType === CHAR_TYPE_ASSISTANT
    ? [...SHARED_PARAMETERS, ...ASSISTANT_PARAMETERS]
    : SHARED_PARAMETERS;
  return definitions.filter(definition => definition.field !== 'derived');
}

// その属性でキャラクター一覧へ出すパラメータのID（心労も含む。一覧には出す）。
function visibleParamIdsFor(charType) {
  if (charType === CHAR_TYPE_NPC) return [];
  return charType === CHAR_TYPE_ASSISTANT
    ? [...SHARED_PARAM_IDS, ...ASSISTANT_PARAM_IDS]
    : SHARED_PARAM_IDS;
}

/** 保存済み・取り込んだJSONを [bool, bool, bool] へ揃える。長さも真偽の揺れもここで吸収する。 */
function normalizeStressChecks(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: STRESS_MAX }, (unused, index) => {
    const value = list[index];
    // skill-modelのcheckbox欄と同じ寛容さ（手書きJSONの'on'や1も真とする）
    return value === true || value === 1 || value === 'on' || value === 'true';
  });
}

function readActions(components) {
  return normalizeSkillList(ACTION_SPEC, components?.[ACTION_COMPONENT_KEY] ?? []);
}

function readEmotions(components) {
  return normalizeSkillList(EMOTION_SPEC, components?.[EMOTION_COMPONENT_KEY] ?? []);
}

function readGuests(components) {
  return normalizeSkillList(GUEST_SPEC, components?.[GUEST_COMPONENT_KEY] ?? []);
}

// 心労＝チェックが入っている数。助手以外は常に0にする（助手から探偵へ変えたコマの
// 書き出しJSONに「探偵なのに心労2」という不整合が残らないようにするため）。
function computeFutariSousaDerivedParameters(parameters, components = {}) {
  if (readCharType(parameters) !== CHAR_TYPE_ASSISTANT) return { [STRESS_PARAM_ID]: 0 };
  return {
    [STRESS_PARAM_ID]: normalizeStressChecks(components[STRESS_COMPONENT_KEY]).filter(Boolean).length
  };
}

// --- アクションの使用 ---

/**
 * コストの支払い元を決める。助手は自分、探偵はパートナー欄のコマ名で引いた助手。
 * 断るときは理由の文だけを返し、呼び出し側がalertして中断する。
 * @returns {{payer: object}|{error: string}}
 */
function resolveMarginPayer({ token, findTokenByName }) {
  const charType = readCharType(token.parameters);

  if (charType === CHAR_TYPE_ASSISTANT) return { payer: token };

  if (charType !== CHAR_TYPE_DETECTIVE) {
    return { error: 'コストのあるアクションを使えるのは、探偵と助手だけです。' };
  }

  const name = String(token.parameters?.[PARTNER_PARAM_ID]?.value ?? '').trim();
  if (name === '') {
    return { error: 'パートナー（助手）のコマ名を、探偵のキャラクター更新画面で入力してください。' };
  }
  // 盤面が無い場所（コマ作成ツール）では他のコマを探しようがない
  if (typeof findTokenByName !== 'function') {
    return { error: 'パートナーの余裕を減らす操作は、部屋の中で行ってください。' };
  }
  const partner = findTokenByName(name);
  if (!partner) {
    return { error: `コマ「${name}」が見つかりません。\n\nパートナー欄を、盤面のコマの名前と同じにしてください。` };
  }
  if (readCharType(partner.parameters) !== CHAR_TYPE_ASSISTANT) {
    return { error: `「${name}」の属性が助手ではありません。\n\n助手のコマを指してください。` };
  }
  // このプラグインより前に作られたコマ。パラメータが補完されるまでは触らない
  if (!partner.parameters?.[MARGIN_PARAM_ID]) {
    return { error: `「${name}」が「余裕」を持っていません。\n\nルーム設定でシステムを選び直すと補完されます。` };
  }
  return { payer: partner };
}

// ログに出す余裕の増減。伏せてある値（一覧に出していない・公開先を絞っている）は
// 数字を出さない。ログは1本の文字列を全員へ配るので、ここで伏せないと卓全員に漏れる
// （パラメータ変更コマンドのログ・js/main.jsのshouldMaskParameterValueと同じ扱い）。
function describeMarginChange(payer, before, after) {
  const param = payer.parameters?.[MARGIN_PARAM_ID];
  const masked = param?.visible === false || isRestricted(param?.audience);
  const amount = masked
    ? `${HIDDEN_VALUE_MASK} → ${HIDDEN_VALUE_MASK}`
    : `${before} → ${after}`;
  return `${payer.name || 'パートナー'}の余裕 ${amount}`;
}

/**
 * アクション1件の使用。ボックスの行ボタンとチャットコマンドの両方がここへ合流する。
 * コストが払えないときは何も起こさずに終わる（ログも使用回数も出さない）。
 */
function runFutariSousaActionUse({
  action, allActions, token, dispatch, findTokenByName,
  getEffectiveParameterValue, generateBuffId, chatCommand
}) {
  const cost = Math.max(0, Math.trunc(Number(action.fields?.cost) || 0));

  // --- 1. 門番。runSkillUseより前に置く（後で弾くと使用ログだけが先に出てしまう） ---
  let payer = null;
  let before = 0;
  if (cost > 0) {
    const resolved = resolveMarginPayer({ token, findTokenByName });
    if (resolved.error) {
      alert(`アクション「${action.name}」は使用できません。\n\n${resolved.error}`);
      return;
    }
    payer = resolved.payer;
    // 基礎値を読んで基礎値へ書く。実効値で判定すると、バフの分だけ基礎値がマイナスへ
    // 落ちる（applySkillCostsが基礎値を読み書きしているのと同じ理由）。
    before = Number(payer.parameters?.[MARGIN_PARAM_ID]?.value) || 0;
    if (before < cost) {
      alert(`アクション「${action.name}」は使用できません。\n\n`
        + `${payer.name || 'パートナー'}の余裕が足りません（残り ${before} ／ 必要 ${cost}）。`);
      return;
    }
  }

  const detail = [
    action.fields?.kind || null,
    cost > 0 ? `コスト${cost}（${describeMarginChange(payer, before, before - cost)}）` : 'コストなし'
  ].filter(Boolean).join('／');

  // --- 2. 使用（このspecはバフも使用回数も持たないので、実質ログを1本出すだけ） ---
  const used = runSkillUse({
    spec: ACTION_SPEC,
    targetSkills: [action],
    allSkills: allActions,
    tokenId: token.id,
    dispatch,
    getToken: () => token,
    // createListSpecでは修正も使用条件も無いので実際には呼ばれないが、ボックスの
    // rowActionsのcontextには入っていないので、落ちないよう基礎値を返す代替を必ず渡す。
    getEffectiveParameterValue: getEffectiveParameterValue
      ?? ((target, paramId) => Number(target?.parameters?.[paramId]?.value) || 0),
    generateBuffId,
    // 支払いは自前でやる（field.onUseを宣言していないので実質no-opだが、意図を残す）
    applyCosts: false,
    logTitle: `アクション使用: ${action.name}`,
    logDetail: detail,
    chatCommand,
    onSaveSkills: (nextActions) => dispatch('SET_COMPONENT', {
      id: token.id, componentKey: ACTION_COMPONENT_KEY, value: nextActions
    })
  });

  // --- 3. 実際に使えた分だけ払う（使えなかったときにコストだけ減らないように後で） ---
  if (used && cost > 0) {
    dispatch('SET_PARAMETER', {
      characterId: payer.id, paramId: MARGIN_PARAM_ID, value: before - cost
    });
  }
}

// アクション一覧の行の「使用」ボタン。ACTION_SPECのrowActionsから呼ばれる。
function runActionUseFromBox({ skill, context }) {
  const { getToken, dispatch, findTokenByName, generateBuffId } = context;
  const token = getToken?.();
  if (!token || typeof dispatch !== 'function') {
    alert('アクションの使用は、部屋の中かコマ作成ツールで行ってください。');
    return;
  }
  runFutariSousaActionUse({
    // 画面の行をそのまま使う。保存済みの一覧から引き直すと、いま書いたばかりの
    // アクションが「見つかりません」になる。
    action: skill,
    allActions: readActions(token.components),
    token,
    dispatch,
    findTokenByName,
    generateBuffId,
    chatCommand: buildSkillUseCommand(ACTION_SPEC, skill.name)
  });
}

function looksLikeFutariSousaChatCommand(rawInput) {
  return ACTION_USE_COMMAND_PATTERN.test(String(rawInput).trim());
}

function handleFutariSousaChatCommand(rawInput, context) {
  const input = String(rawInput).trim();
  const match = input.match(ACTION_USE_COMMAND_PATTERN);
  if (!match) return false;

  const { token, dispatch, findTokenByName, getEffectiveParameterValue, generateBuffId } = context;
  // 書式が合った時点で必ずtrueを返す。falseだとCoreがBCDiceへ回してしまう
  if (!token) {
    alert('アクションを使用する参照キャラクターを選択してください。');
    return true;
  }

  const name = match[1].trim();
  const actions = readActions(token.components);
  const action = findSkillByName(actions, name);
  if (!action) {
    alert(`アクション「${name}」が見つかりません。`);
    return true;
  }

  runFutariSousaActionUse({
    action, allActions: actions, token, dispatch, findTokenByName,
    getEffectiveParameterValue, generateBuffId, chatCommand: input
  });
  return true;
}

function buildTypeSelect(charType) {
  const select = document.createElement('select');
  [CHAR_TYPE_DETECTIVE, CHAR_TYPE_ASSISTANT, CHAR_TYPE_NPC].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = charType;
  return select;
}

function renderFutariSousaCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components,
  onComponentChange, getComponents, dispatch, getToken, generateBuffId, findTokenByName, tokenId
}) {
  container.innerHTML = '';

  const isEditing = mode === 'edit';
  // 既存のコマに対して、この人が状態を変えてよいか。ここがtrueのときだけdispatchする。
  const canWrite = isEditing && canEdit && typeof dispatch === 'function' && !!tokenId;
  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、都度最新を読む
  const readParameters = () => getToken?.()?.parameters ?? parameters;
  const readComponents = () => (getComponents ? getComponents() : components) ?? {};

  const title = document.createElement('h4');
  title.textContent = 'フタリソウサ';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  // --- 属性（探偵 / 助手 / NPC）---
  let charType = readCharType(readParameters());

  const typeRow = document.createElement('div');
  typeRow.className = 'dialog-custom-row';
  const typeLabel = document.createElement('label');
  typeLabel.className = 'dialog-param-label';
  typeLabel.textContent = '属性';
  typeLabel.style.alignSelf = 'center';
  typeLabel.style.color = '#ccc';
  typeLabel.style.fontSize = '0.85rem';
  const typeSelect = buildTypeSelect(charType);
  // 表示だけの人にはここで先に固める。これが効いているおかげで、下のchangeハンドラが
  // 走らず、後から作られる入力欄がlockFormControlsをすり抜けることも起きない。
  typeSelect.disabled = !canEdit;
  typeRow.appendChild(typeLabel);
  typeRow.appendChild(typeSelect);
  container.appendChild(typeRow);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  // 属性に合う行だけを描く。getValues()も描かれている行しか返さないので、
  // 使っていない側のパラメータを0や空文字で潰してしまうことがない。
  let rows = [];
  function renderParamRows() {
    list.innerHTML = '';
    const current = readParameters();

    rows = definitionsFor(charType).map(definition => {
      const paramId = paramIdOf(definition);
      const value = current[paramId]?.value;

      const row = document.createElement('div');
      row.className = 'dialog-custom-row';

      const label = document.createElement('label');
      label.className = 'dialog-param-label';
      label.textContent = definition.label;
      label.style.alignSelf = 'center';
      label.style.color = '#ccc';
      label.style.fontSize = '0.85rem';

      const input = document.createElement('input');
      if (definition.field === 'text') {
        input.type = 'text';
        input.value = typeof value === 'string' ? value : '';
        input.placeholder = charType === CHAR_TYPE_DETECTIVE ? '助手のコマ名' : '探偵のコマ名';
      } else {
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.value = Number(value) || 0;
      }
      input.disabled = !canEdit;

      row.appendChild(label);
      row.appendChild(input);
      list.appendChild(row);

      return { paramId, field: definition.field, input };
    });
  }
  renderParamRows();

  // --- 心労（チェック3つ）---
  // ボックスにしないのは、3つのチェックのためにモーダルを1枚増やす価値が無く、
  // 「心労が今いくつか」は卓の最中に常に見えているべき値だから。
  const stressRow = document.createElement('div');
  stressRow.className = 'dialog-custom-row';
  container.appendChild(stressRow);

  let stressBoxes = [];
  function renderStressRow() {
    stressRow.innerHTML = '';
    stressBoxes = [];
    // 助手だけが持つ。componentsを触れない場面（新規作成）でも出さない
    stressRow.style.display = (charType === CHAR_TYPE_ASSISTANT && isEditing && onComponentChange)
      ? '' : 'none';
    if (stressRow.style.display === 'none') return;

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    label.textContent = '心労';
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';
    stressRow.appendChild(label);

    normalizeStressChecks(readComponents()[STRESS_COMPONENT_KEY]).forEach((checked, index) => {
      // .dialog-custom-row input の flex:1 がチェックボックスを引き伸ばすので、その打ち消しを
      // 既に持っている .dialog-visible-toggle で包む。本来は「一覧に出すか」のトグル用の
      // クラスで、ここは見た目を借りているだけ（css/character-dialog.css側にも註がある）。
      const wrap = document.createElement('label');
      wrap.className = 'dialog-visible-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.disabled = !canEdit;
      input.addEventListener('change', () => {
        // ダイアログの「更新」を待たず即時保存（他のボックスと同じ振る舞い）。
        // SET_COMPONENTの後でcomputeDerivedParametersが走り、「心労」がチェックの数になる。
        onComponentChange(STRESS_COMPONENT_KEY, stressBoxes.map(box => box.checked));
      });
      wrap.appendChild(input);
      wrap.appendChild(document.createTextNode(String(index + 1)));
      stressRow.appendChild(wrap);
      stressBoxes.push(input);
    });
  }
  renderStressRow();

  // --- ボックス（技能・アクション・感情・ゲスト）---
  // 既存キャラクターの更新時のみ開ける（新規作成時はまだcomponentsを持たないため対象外。
  // 既存プラグインのボックス系ボタンと同じ扱い）。
  const boxButtons = [];

  function addBoxButton(updateLabel, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dialog-add-row-btn';
    btn.style.marginTop = '8px';
    updateLabel(btn);
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
    boxButtons.push(btn);
    return btn;
  }

  let skillBtn = null;
  let actionBtn = null;
  let emotionBtn = null;
  let guestBtn = null;

  if (isEditing && onComponentChange) {
    const readSkills = () => normalizeFutariSousaSkills(readComponents()[SKILL_COMPONENT_KEY]);

    const updateSkillLabel = (btn) => {
      btn.textContent = `技能を開く（${countFilledSkills(readComponents()[SKILL_COMPONENT_KEY])}/4分野）`;
    };
    skillBtn = addBoxButton(updateSkillLabel, () => {
      showFutariSousaSkillBox({
        skills: readSkills(),
        readOnly: !canEdit,
        onSave: (nextSkills) => {
          onComponentChange(SKILL_COMPONENT_KEY, nextSkills);
          updateSkillLabel(skillBtn);
        }
      });
    });

    const updateActionLabel = (btn) => {
      btn.textContent = `${ACTION_SPEC.noun}一覧を開く（${readActions(readComponents()).length}件）`;
    };
    actionBtn = addBoxButton(updateActionLabel, () => {
      showSkillBox({
        spec: ACTION_SPEC,
        skills: readActions(readComponents()),
        parameters,
        readOnly: !canEdit,
        onSave: (nextActions) => {
          onComponentChange(ACTION_COMPONENT_KEY, nextActions);
          updateActionLabel(actionBtn);
        },
        // 行の「使用」（rowActions）が使う一式。渡さないとボタンが押しても何も起きない。
        // findTokenByNameは部屋の中でだけ渡ってくる（コマ作成ツールではundefined）。
        getToken,
        dispatch,
        generateBuffId,
        findTokenByName
      });
    });

    const updateEmotionLabel = (btn) => {
      btn.textContent = `${EMOTION_SPEC.noun}一覧を開く（${readEmotions(readComponents()).length}件）`;
    };
    emotionBtn = addBoxButton(updateEmotionLabel, () => {
      showSkillBox({
        spec: EMOTION_SPEC,
        skills: readEmotions(readComponents()),
        parameters,
        readOnly: !canEdit,
        onSave: (nextEmotions) => {
          onComponentChange(EMOTION_COMPONENT_KEY, nextEmotions);
          updateEmotionLabel(emotionBtn);
        }
      });
    });

    const updateGuestLabel = (btn) => {
      btn.textContent = `${GUEST_SPEC.noun}一覧を開く（${readGuests(readComponents()).length}件）`;
    };
    guestBtn = addBoxButton(updateGuestLabel, () => {
      showSkillBox({
        spec: GUEST_SPEC,
        skills: readGuests(readComponents()),
        parameters,
        readOnly: !canEdit,
        onSave: (nextGuests) => {
          onComponentChange(GUEST_COMPONENT_KEY, nextGuests);
          updateGuestLabel(guestBtn);
        }
      });
    });
  }

  // 属性に合わないボックスのボタンは出さない（NPCは1つも持たない）。
  // 中身は消さないので、属性を戻せばそのまま出てくる。
  function renderBoxButtons() {
    const shown = charType === CHAR_TYPE_NPC
      ? []
      : (charType === CHAR_TYPE_ASSISTANT
        ? [skillBtn, actionBtn, emotionBtn, guestBtn]
        : [skillBtn, actionBtn, emotionBtn]);
    boxButtons.forEach(btn => { btn.style.display = shown.includes(btn) ? '' : 'none'; });
  }
  renderBoxButtons();

  // 現在の属性に合わせて、キャラクター一覧へ出すかどうかを揃える。
  // 実際に変わるものだけdispatchする（js/character-dialog.jsのapplyCharacterEditResultと同じ規約）。
  function syncTypeVisibility() {
    const current = readParameters();
    const shown = visibleParamIdsFor(charType);

    TYPED_PARAM_IDS.forEach(paramId => {
      const param = current[paramId];
      if (!param) return; // このプラグインより前に作られたコマ。補完されるまでは触らない
      const shouldShow = shown.includes(paramId);
      if ((param.visible !== false) === shouldShow) return;
      dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId, visible: shouldShow });
    });
  }

  // 描いた直後に一度揃える。作成時に属性だけ選んだコマ（visibleはまだ探偵の形）を、
  // 最初に更新画面を開いた時点で正しい見え方にするため。
  if (canWrite) syncTypeVisibility();

  typeSelect.addEventListener('change', () => {
    charType = normalizeCharType(typeSelect.value);
    renderParamRows();
    renderStressRow();
    renderBoxButtons();
    // 属性の保存と見え方の切り替えは、ダイアログの「更新」を待たずここで済ませる。
    // 待つと、キャンセルしたときに見え方だけが変わって残ってしまう。
    if (canWrite) {
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: CHAR_TYPE_PARAM_ID, value: charType });
      syncTypeVisibility();
    }
  });

  // 表示だけの人には入力を固め、ボックスを開くボタンだけ残す
  // （ボックスの中身はreadOnlyで表示専用になる）。
  if (!canEdit) {
    lockFormControls(container, { keep: boxButtons });
  }

  return {
    getValues: () => {
      const values = { [CHAR_TYPE_PARAM_ID]: charType };
      rows.forEach(({ paramId, field, input }) => {
        values[paramId] = field === 'text'
          ? input.value.trim()
          : Math.max(0, Math.trunc(Number(input.value) || 0));
      });
      return values;
    }
  };
}

export const FUTARISOUSA_PLUGIN = {
  id: PLUGIN_ID,
  label: 'フタリソウサ',
  buildCharacterParameters: buildFutariSousaCharacterParameters,
  computeDerivedParameters: computeFutariSousaDerivedParameters,
  renderCharacterPanel: renderFutariSousaCharacterPanel,
  handleChatCommand: handleFutariSousaChatCommand,
  looksLikeOwnChatCommand: looksLikeFutariSousaChatCommand,
  bcdiceSystem: FUTARISOUSA_BCDICE_SYSTEM
};
