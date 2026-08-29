// js/parameters/gcrest.js
// グランクレスト戦記RPGのプラグイン記述子。
//
// このシステム固有の知識だけを持つ：
//   - 属性（PC/NPC/国/簡易エネミー）と、PCが持つパラメータの並び
//   - 能力判定値6種と、その下にぶら下がる技能の対応
//   - 特技・魔法・部隊特技・アイテム・因縁・誓いの形
//   - 部隊（マスコンバット）のデータと、そこから自分へ掛かる修正
// 一覧UI・使用制限・回数制限・修正値・使用処理は共通フレームワーク（js/parameters/skill/）が持つ。
//
// このファイルはNode（server/index.js → game-store.js → registry.js）からも読み込まれるため、
// トップレベルでdocument/windowに触れないこと（docs/plugin-guide.mdの8.1）。
// 画面を持つものは gcrest-ability-box.js / gcrest-unit-box.js へ分けてある。

import { buildParameters } from './paramFactory.js';
import {
  createSkillSpec, createListSpec, createItemSpec, normalizeSkillList,
  resetSkillUsageOnPhaseEnd, findSkillByName, buildSkillUseCommandPattern
} from './skill/skill-model.js';
import { runSkillUse } from './skill/skill-use.js';
import { showSkillBox } from './skill/skill-box.js';
import { showGcrestAbilityBox } from './gcrest-ability-box.js';
import { showGcrestUnitBox } from './gcrest-unit-box.js';

const SOURCE = 'GCREST';
const paramId = (key) => `${SOURCE}:${key}`;

// BCDiceのシステムID（/api/bcdice/game_systemの一覧の表記と一字一句同じにすること）。
const BCDICE_SYSTEM = 'GranCrest';

// ------------------------------------------------------------------
// 属性
// ------------------------------------------------------------------
// PC以外は「枠だけ用意して中身はこれから」の状態。ドラクルージュのNPCと同じ構えで、
// パラメータの並びを配列で持ち、属性を切り替えたらキャラクター一覧への出し入れだけを行う
// （js/parameters/dracurouge.jsのsyncTypeVisibility）。中身が決まったら、その属性の
// 配列へ足すだけで表示も切り替えも付いてくる。
const CHAR_TYPE_PC = 'PC';
export const GCREST_CHAR_TYPES = [
  { value: CHAR_TYPE_PC, label: 'PC' },
  { value: 'NPC', label: 'NPC' },
  { value: 'COUNTRY', label: '国' },
  { value: 'ENEMY', label: '簡易エネミー' }
];
const CHAR_TYPE_VALUES = new Set(GCREST_CHAR_TYPES.map(type => type.value));
const CHAR_TYPE_PARAM_ID = paramId('charType');

// ------------------------------------------------------------------
// 能力判定値と技能
// ------------------------------------------------------------------
// keyを略称にしてあるのは、将来の判定式やバフコマンドから{STR}と書けるようにするため
// （docs/plugin-guide.mdの4章。DX3のAdB、シノビガミのFと同じ狙い）。
const ABILITIES = [
  { key: 'STR', label: '筋力' },
  { key: 'REF', label: '反射' },
  { key: 'SEN', label: '感覚' },
  { key: 'INT', label: '知力' },
  { key: 'MND', label: '精神' },
  { key: 'EMP', label: '共感' }
];

// 技能の初期値。ルール上どの技能も2から始まる。
const SKILL_BASE_VALUE = 2;

// 能力判定値ごとの技能。freeを宣言した能力は、その分類の技能を後から自由記述で足せる
// （専門知識：考古学 など）。自由記述ぶんはコマごとに増えるので、パラメータ定義ではなく
// IMPORT_CHARACTER_DATAのnewParametersで1件ずつ足す（DX3の可変スロット技能と同じ）。
// prefixは固定技能のkeyとぶつからない綴りにすること（前方一致で拾うため）。
export const GCREST_SKILL_GROUPS = [
  {
    ability: 'STR',
    skills: [
      { key: 'sklMelee', label: '格闘' },
      { key: 'sklPower', label: '力技' },
      { key: 'sklHeavy', label: '重武器' },
      { key: 'sklSwim', label: '水泳' },
      { key: 'sklTough', label: '頑健' }
    ]
  },
  {
    ability: 'REF',
    skills: [
      { key: 'sklLight', label: '軽武器' },
      { key: 'sklAthletic', label: '運動' },
      { key: 'sklStealth', label: '隠密' },
      { key: 'sklDodge', label: '回避' },
      { key: 'sklRide', label: '騎乗' }
    ]
  },
  {
    ability: 'SEN',
    skills: [
      { key: 'sklShoot', label: '射撃' },
      { key: 'sklHandwork', label: '手業' },
      { key: 'sklPercept', label: '知覚' },
      { key: 'sklPsychic', label: '霊感' }
    ]
  },
  {
    ability: 'INT',
    skills: [
      { key: 'sklHeal', label: '治療' },
      { key: 'sklChaos', label: '混沌知識' },
      { key: 'sklCrest', label: '聖印知識' },
      { key: 'sklStrategy', label: '軍略知識' }
    ],
    free: { prefix: 'freeExpert', label: '専門知識' }
  },
  {
    ability: 'MND',
    skills: [
      { key: 'sklWill', label: '意志' },
      { key: 'sklSeal', label: '聖印' }
    ]
  },
  {
    ability: 'EMP',
    skills: [
      { key: 'sklTalk', label: '話術' },
      { key: 'sklSense', label: '感性' },
      { key: 'sklInfo', label: '情報収集' }
    ],
    free: { prefix: 'freeArt', label: '芸術' }
  }
];

const FIXED_SKILLS = GCREST_SKILL_GROUPS.flatMap(group => group.skills);

// 防御力4種。攻撃力と並んでダメージ計算の受け皿になる。
const DEFENSES = [
  { key: 'defWeapon', label: '防御力（武器）' },
  { key: 'defHeat', label: '防御力（炎熱）' },
  { key: 'defImpact', label: '防御力（衝撃）' },
  { key: 'defInner', label: '防御力（体内）' }
];

const MP_PARAM_ID = paramId('MP');
const LUCK_PARAM_ID = paramId('luck');
const MORALE_PARAM_ID = paramId('morale');
const ATTACK_PARAM_ID = paramId('atk');
const MOVE_PARAM_ID = paramId('move');
const LOAD_PARAM_ID = paramId('load');
const LOAD_MAX_PARAM_ID = paramId('loadMax');
const HP_PARAM_ID = 'core:hp';
const INITIATIVE_PARAM_ID = 'core:initiative';
const INITIATIVE_DEFAULT_LABEL = 'イニシアチブ';
const INITIATIVE_LABEL = '行動値';

// 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。
// 自動計算やコマンドの受け皿になる値がコマごとに欠けると直しようがないため
// （docs/plugin-guide.mdの4章）。自由記述の技能だけは後から足す・消すものなのでlocked:false。
export const GCREST_PARAMETERS = [
  // 属性。キャラクター一覧には出さない（値は'PC'等の内部表記で、読ませても意味が無い）。
  // パネルのプルダウンから書き換えるのでeditable:trueが要る
  // （editable:falseだとSET_PARAMETERがガードに弾かれ、選び直しても保存されない）。
  { key: 'charType', label: '属性', value: CHAR_TYPE_PC, editable: true, visible: false },

  // 1. 常に見せて、手でも動かす値
  { key: 'MP', label: 'MP', value: 0 },
  { key: 'luck', label: '天運', value: 0 },

  // 2. 他から決まる値・判定やダメージの受け皿。一覧には出さず、手入力もさせない
  //    （バフは効く。docs/plugin-guide.mdの4章「バフはeditableを見ない」）。
  { key: 'atk', label: '攻撃力', value: 0, editable: false, visible: false },
  ...DEFENSES.map(def => ({ ...def, value: 0, editable: false, visible: false })),
  ...ABILITIES.map(ability => ({ ...ability, value: 0, editable: false, visible: false })),
  ...FIXED_SKILLS.map(skill => ({
    ...skill, value: SKILL_BASE_VALUE, editable: false, visible: false
  })),
  { key: 'loadMax', label: '所持可能重量', value: 0, editable: false, visible: false },
  { key: 'load', label: '所持重量', value: 0, editable: false, visible: false },
  { key: 'move', label: '移動力', value: 0, editable: false, visible: false },

  // 3. 部隊のMCがオンのときだけ意味を持つ値。オンにすると一覧へ出る（syncMoraleVisibility）。
  //    部隊特技のコストの支払い先なので、editable:trueにしておくこと
  //    （SET_PARAMETERはeditable:falseを弾く。docs/plugin-guide.mdの6.1）。
  { key: 'morale', label: '士気', value: 0, visible: false }
];

export function buildGcrestCharacterParameters() {
  return buildParameters(SOURCE, GCREST_PARAMETERS, { locked: true });
}

export const GCREST_ROOM_PARAMETERS = [
  { key: 'chaosLevel', label: '混沌レベル', value: 0, locked: true }
];

export function buildGcrestRoomParameters() {
  return buildParameters(SOURCE, GCREST_ROOM_PARAMETERS);
}

// 属性ごとに、キャラクター一覧へ出すパラメータ。
// 士気はここに入れない：出す・出さないを決めるのは属性ではなく部隊のMCで、両方が同じ
// パラメータの見え方を触ると、片方の都合でもう片方が上書きされてしまう。
const TYPE_VISIBLE_PARAM_IDS = {
  PC: [MP_PARAM_ID, LUCK_PARAM_ID],
  NPC: [],
  COUNTRY: [],
  ENEMY: []
};
const TYPED_PARAM_IDS = [...new Set(Object.values(TYPE_VISIBLE_PARAM_IDS).flat())];

export function readGcrestCharType(parameters) {
  const value = parameters?.[CHAR_TYPE_PARAM_ID]?.value;
  return CHAR_TYPE_VALUES.has(value) ? value : CHAR_TYPE_PC;
}

// ------------------------------------------------------------------
// 特技・魔法・部隊特技
// ------------------------------------------------------------------
// MCの欄。マスコンバット中に使えるか（○）、使えないか（×）、前衛（FW）でだけ使えるかを
// 1つのトグルで持つ。制限そのものは部隊の状態と突き合わせて判断する（describeMcBlock）。
const MC_OK = '○';
const MC_NG = '×';
const MC_FW = 'FW';
const MC_FIELD = {
  key: 'mc', label: 'MC', type: 'toggle',
  options: [
    { value: MC_OK, label: MC_OK },
    { value: MC_NG, label: MC_NG },
    { value: MC_FW, label: MC_FW }
  ]
};

// 修正値の対象。ここに宣言したものがボックスの「使用時の修正」の先頭に並ぶ
// （宣言外のパラメータも「その他のパラメータ」から選べる）。
const MOD_TARGETS = [
  ...ABILITIES.map(ability => ({ paramId: paramId(ability.key), label: ability.label })),
  { paramId: ATTACK_PARAM_ID, label: '攻撃力' },
  ...DEFENSES.map(def => ({ paramId: paramId(def.key), label: def.label })),
  { paramId: MOVE_PARAM_ID, label: '移動力' },
  { paramId: INITIATIVE_PARAM_ID, label: INITIATIVE_LABEL },
  { paramId: HP_PARAM_ID, label: 'HP' }
];

const USE_PERIODS = [
  { key: 'scenario', label: 'シナリオ' },
  { key: 'scene', label: 'シーン' },
  { key: 'round', label: 'ラウンド' }
];

// 特技。コストの種類は行ごとに選ぶ（MPか天運）。sign:-1で「入力した正の数を減らす」形。
// 支払いはSET_PARAMETERを通るので、選択肢はeditable:trueのパラメータに限ること。
export const GCREST_ART_SPEC = createSkillSpec({
  id: 'gcrest-art',
  noun: '特技',
  componentKey: 'arts',
  fields: [
    { key: 'level', label: 'レベル', type: 'number', className: 'effect-box-level', formulaName: 'Lv' },
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'target', label: '対象', type: 'text' },
    { key: 'range', label: '射程', type: 'text' },
    MC_FIELD,
    {
      key: 'costType', label: 'コスト種', type: 'select', newRow: true,
      options: [
        { value: '', label: '（なし）' },
        { value: MP_PARAM_ID, label: 'MP' },
        { value: LUCK_PARAM_ID, label: '天運' }
      ]
    },
    {
      key: 'costValue', label: 'コスト', type: 'number',
      availableWhen: fields => !!fields.costType,
      onUse: { paramIdFromField: 'costType', sign: -1 }
    }
  ],
  periods: USE_PERIODS,
  modTargets: MOD_TARGETS,
  hasUseCommand: true
});

// 魔法。特技と同じ形で、レベルの代わりに目標値を持ち、コストはMPで固定。
export const GCREST_SPELL_SPEC = createSkillSpec({
  id: 'gcrest-spell',
  noun: '魔法',
  componentKey: 'spells',
  fields: [
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'target', label: '対象', type: 'text' },
    { key: 'range', label: '射程', type: 'text' },
    { key: 'targetValue', label: '目標値', type: 'text' },
    MC_FIELD,
    {
      key: 'cost', label: 'MP', type: 'number', className: 'effect-box-encroach', newRow: true,
      onUse: { addToParamId: MP_PARAM_ID, sign: -1 }
    }
  ],
  periods: USE_PERIODS,
  modTargets: MOD_TARGETS,
  hasUseCommand: true
});

// 部隊特技。特技と同じ形だが、コストは士気で固定で、MCの欄を持たない
// （マスコンバット中しか使えないものなので、1件ごとに可否を持たせる意味が無い）。
export const GCREST_UNIT_ART_SPEC = createSkillSpec({
  id: 'gcrest-unit-art',
  noun: '部隊特技',
  componentKey: 'unitArts',
  fields: [
    { key: 'level', label: 'レベル', type: 'number', className: 'effect-box-level', formulaName: 'Lv' },
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'target', label: '対象', type: 'text' },
    { key: 'range', label: '射程', type: 'text' },
    {
      key: 'cost', label: '士気', type: 'number', className: 'effect-box-encroach',
      onUse: { addToParamId: MORALE_PARAM_ID, sign: -1 }
    }
  ],
  periods: USE_PERIODS,
  modTargets: MOD_TARGETS,
  hasUseCommand: true
});

// アイテム。個数を持つ持ち物の枠組みそのままで、item.use / item.gain と「使用」ボタンは
// 共通実装が配る（js/parameters/registry.jsのhandlePluginChatCommand）。
export const GCREST_ITEM_SPEC = createItemSpec({
  id: 'gcrest-item',
  noun: 'アイテム',
  componentKey: 'items',
  quantity: { label: '数' },
  fields: [
    { key: 'weight', label: '重量', type: 'number', className: 'effect-box-level' }
  ],
  // 所持重量／所持可能重量。画面の今の値で毎回引かれるので、重量や数を直した瞬間に動く。
  // 上限を超えたら赤字になる（skill-box.jsの.effect-box-footer.is-over）。
  footerNote: ({ skills, parameters }) => {
    const load = sumGcrestItemWeight(skills);
    const limit = Number(parameters?.[LOAD_MAX_PARAM_ID]?.value) || 0;
    return {
      text: `所持重量 ${load} ／ 所持可能重量 ${limit}`,
      warning: load > limit
    };
  }
});

// 因縁。名前・関係・感情だけを並べる一覧で、使用という概念を持たない（createListSpec）。
// ダブルクロスのロイスと違い、昇華のような特殊な処理は持たせない。
export const GCREST_BOND_SPEC = createListSpec({
  id: 'gcrest-bond',
  noun: '因縁',
  componentKey: 'bonds',
  fields: [
    { key: 'relation', label: '関係', type: 'text' },
    { key: 'emotionMain', label: '感情（メイン）', type: 'text' },
    { key: 'emotionSub', label: '感情（サブ）', type: 'text' }
  ],
  allowNote: false
});

// 誓い。枠は3つで固定（fixedRows）。名前は枠の見出しで、書くのは内容・共有対象・状態。
// 共有対象は複数書けるよう、カンマ区切りの1欄にしてある。
export const GCREST_OATH_SPEC = createListSpec({
  id: 'gcrest-oath',
  noun: '誓い',
  componentKey: 'oaths',
  fields: [
    { key: 'content', label: '内容', type: 'text' },
    { key: 'share', label: '共有対象（カンマ区切り）', type: 'text' },
    {
      key: 'used', label: '状態', type: 'toggle',
      options: [
        { value: 'unused', label: '使用' },
        { value: 'used', label: '使用済' }
      ]
    }
  ],
  allowNote: false,
  fixedRows: true,
  defaultSkills: [{ name: '誓い①' }, { name: '誓い②' }, { name: '誓い③' }]
});

// ------------------------------------------------------------------
// 部隊
// ------------------------------------------------------------------
export const UNIT_COMPONENT_KEY = 'unit';
// 部隊の修正値から生えるバフの目印。付け直しのたびにこのタグでまとめて剥がす。
const UNIT_BUFF_TAG = 'GCREST:unit';
const POSITION_FW = 'FW';
const POSITION_CT = 'CT';

// 修正値の入力欄。大きい括りごとにまとめて表示する（部隊ボックスはこの宣言を描くだけ）。
export const GCREST_UNIT_MOD_GROUPS = [
  {
    label: '能力修正',
    rows: ABILITIES.map(ability => ({
      key: ability.key, label: ability.label, paramId: paramId(ability.key)
    }))
  },
  {
    label: '副能力修正',
    rows: [
      { key: 'hp', label: 'HP', paramId: HP_PARAM_ID },
      { key: 'initiative', label: INITIATIVE_LABEL, paramId: INITIATIVE_PARAM_ID },
      { key: 'move', label: '移動力', paramId: MOVE_PARAM_ID }
    ]
  },
  {
    label: '攻撃力',
    rows: [{ key: 'atk', label: '攻撃力', paramId: ATTACK_PARAM_ID }]
  },
  {
    label: '防御力',
    rows: DEFENSES.map(def => ({ key: def.key, label: def.label, paramId: paramId(def.key) }))
  }
];

const UNIT_MOD_ROWS = GCREST_UNIT_MOD_GROUPS.flatMap(group => group.rows);

/** 保存済みの部隊データを正規形へ揃える（欠けたキー・不正な値は既定へ落とす）。 */
export function normalizeGcrestUnit(raw) {
  const mods = {};
  UNIT_MOD_ROWS.forEach(row => {
    const value = Math.trunc(Number(raw?.mods?.[row.key]));
    mods[row.key] = Number.isFinite(value) ? value : 0;
  });

  return {
    mc: raw?.mc === true,
    position: raw?.position === POSITION_CT ? POSITION_CT : POSITION_FW,
    name: typeof raw?.name === 'string' ? raw.name : '',
    mods
  };
}

export function readGcrestUnit(components) {
  return normalizeGcrestUnit(components?.[UNIT_COMPONENT_KEY]);
}

/**
 * 部隊の修正値を、自分へのバフとして貼り直す。
 * MCがオフのときは1つも貼らない（＝剥がすだけ）。値そのものはパラメータへ書かず
 * バフで持つので、MCを切ればいつでも元の値へ戻る。
 */
export function syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId }) {
  dispatch('REMOVE_BUFFS_BY_TAG', { tokenId, tag: UNIT_BUFF_TAG });
  if (!unit.mc) return;

  UNIT_MOD_ROWS.forEach(row => {
    const delta = Number(unit.mods?.[row.key]) || 0;
    if (delta === 0) return;
    dispatch('ADD_BUFF', {
      tokenId,
      id: generateBuffId(),
      name: `部隊修正（${row.label}）`,
      paramId: row.paramId,
      delta,
      expirePhase: null, // 手動で外すまで＝MCを切るまで
      tag: UNIT_BUFF_TAG
    });
  });
}

/** 士気をキャラクター一覧へ出すかどうかを、MCに合わせる。実際に変わるときだけdispatchする。 */
function syncMoraleVisibility({ parameters, unit, tokenId, dispatch }) {
  const param = parameters?.[MORALE_PARAM_ID];
  if (!param) return; // このプラグインより前に作られたコマ。補完されるまでは触らない
  if ((param.visible !== false) === unit.mc) return;
  dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId: MORALE_PARAM_ID, visible: unit.mc });
}

/**
 * マスコンバット中に、その特技/魔法が使えない理由。使えるならnull。
 * MCがオフの部隊（＝マスコンバットをしていない）は、この制限を一切受けない。
 */
function describeMcBlock(unit, skill) {
  if (!unit.mc) return null;
  const mc = skill?.fields?.mc;
  if (mc === MC_NG) return 'マスコンバット中は使用できません（MC：×）。';
  if (mc === MC_FW && unit.position === POSITION_CT) {
    return '部隊のポジションがCTのため使用できません（MC：FW）。';
  }
  return null;
}

// ------------------------------------------------------------------
// componentsの読み出し
// ------------------------------------------------------------------
export function readGcrestArts(components) {
  return normalizeSkillList(GCREST_ART_SPEC, components?.[GCREST_ART_SPEC.componentKey] ?? []);
}

export function readGcrestSpells(components) {
  return normalizeSkillList(GCREST_SPELL_SPEC, components?.[GCREST_SPELL_SPEC.componentKey] ?? []);
}

export function readGcrestUnitArts(components) {
  return normalizeSkillList(GCREST_UNIT_ART_SPEC, components?.[GCREST_UNIT_ART_SPEC.componentKey] ?? []);
}

export function readGcrestItems(components) {
  return normalizeSkillList(GCREST_ITEM_SPEC, components?.[GCREST_ITEM_SPEC.componentKey] ?? []);
}

export function readGcrestBonds(components) {
  return normalizeSkillList(GCREST_BOND_SPEC, components?.[GCREST_BOND_SPEC.componentKey] ?? []);
}

export function readGcrestOaths(components) {
  return normalizeSkillList(GCREST_OATH_SPEC, components?.[GCREST_OATH_SPEC.componentKey] ?? []);
}

// 画面の出し分けだけを持つ小さな設定。魔法を使わないキャラクターのほうが多いので、
// 既定はオフ（チェックを入れた人にだけ魔法一覧のボタンが出る）。
const UI_COMPONENT_KEY = 'ui';
export function readGcrestUi(components) {
  return { showSpells: components?.[UI_COMPONENT_KEY]?.showSpells === true };
}

/**
 * 持ち物の重量の合計。1件の重さは「重量 × 数」で、数を持たない古いデータは1個として数える。
 * 一覧の下の表示（footerNote）と所持重量の自動計算の両方がこれを使うので、
 * 画面の数字と保存された値が食い違わない。
 */
export function sumGcrestItemWeight(items) {
  return items.reduce((total, item) => {
    const weight = Number(item.fields?.weight);
    const count = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;
    return total + (Number.isFinite(weight) ? weight * count : 0);
  }, 0);
}

// 持ち物から決まる値（所持重量）。SET_COMPONENTのたびに呼び直される
// （js/parameters/registry.jsのapplyPluginDerivedParameters）。
function computeGcrestDerivedParameters(parameters, components = {}) {
  return {
    [LOAD_PARAM_ID]: sumGcrestItemWeight(readGcrestItems(components))
  };
}

// ------------------------------------------------------------------
// 能力値ボックスへ渡す材料
// ------------------------------------------------------------------
// 自由記述の技能（専門知識：〜／芸術：〜）は、そのコマのパラメータから前方一致で拾う。
function readFreeSkills(parameters, free) {
  if (!free) return [];
  return Object.entries(parameters)
    .filter(([, param]) => param.source === SOURCE && typeof param.key === 'string'
      && param.key.startsWith(free.prefix))
    .map(([id, param]) => ({ paramId: id, label: param.label, value: Number(param.value) || 0 }));
}

// 能力判定値と技能の並び。ラベルはコマが実際に持っているものを優先して読む
// （利用者が一覧側で付け替えていた場合に、ボックスの見出しと食い違わないように）。
function buildAbilityGroups(parameters) {
  return GCREST_SKILL_GROUPS.map(group => {
    const abilityParamId = paramId(group.ability);
    const abilityDef = ABILITIES.find(ability => ability.key === group.ability);
    return {
      abilityParamId,
      abilityLabel: parameters[abilityParamId]?.label ?? abilityDef?.label ?? group.ability,
      abilityValue: Number(parameters[abilityParamId]?.value) || 0,
      skills: group.skills.map(skill => ({
        paramId: paramId(skill.key),
        label: parameters[paramId(skill.key)]?.label ?? skill.label,
        value: Number(parameters[paramId(skill.key)]?.value) || 0
      })),
      free: group.free ? { ...group.free } : null,
      freeSkills: readFreeSkills(parameters, group.free)
    };
  });
}

// 攻撃力・防御力・移動力・所持可能重量。どれもeditable:falseで更新ダイアログから手入力
// できないため、能力値ボックス（＝コマ作成ツールでのみ編集可）に入口を持つ。
function buildCombatRows(parameters) {
  return [
    { paramId: ATTACK_PARAM_ID, label: '攻撃力' },
    ...DEFENSES.map(def => ({ paramId: paramId(def.key), label: def.label })),
    { paramId: MOVE_PARAM_ID, label: '移動力' },
    { paramId: LOAD_MAX_PARAM_ID, label: '所持可能重量' }
  ].map(row => ({ ...row, label: parameters[row.paramId]?.label ?? row.label }));
}

/**
 * 自由記述の技能を1件足すための新規パラメータ定義。
 * 既にあるスロットと番号がぶつからないよう、そのコマの中で空いている番号を探す。
 * locked:false にしてあるのは、後から消せるようにするため（REMOVE_PARAMETERはlockedを弾く）。
 */
function buildFreeSkillParameter(parameters, free, rawLabel) {
  const label = String(rawLabel).trim();
  if (!label) return null;

  let index = 1;
  while (parameters[paramId(`${free.prefix}${index}`)]) index += 1;

  const key = `${free.prefix}${index}`;
  return {
    [paramId(key)]: {
      key,
      label: `${free.label}：${label}`,
      value: SKILL_BASE_VALUE,
      source: SOURCE,
      locked: false,
      editable: false,
      visible: false
    }
  };
}

// ------------------------------------------------------------------
// キャラクター作成/更新ダイアログのプラグイン専用スペース
// ------------------------------------------------------------------
// core:initiativeのラベルを「行動値」へ差し替える。ラベルがまだ既定のときだけ動くのが
// 冪等性の要（利用者が自分で別の名前に変えた場合も、その名前を尊重して触らない）。
// 差し替え口はIMPORT_CHARACTER_DATAのlabelOverridesしかない（SET_PARAMETERは値専用）。
// 改称した瞬間は左カラムの表示が「イニシアチブ」のまま残るが、閉じて開き直せば揃う
// （js/parameters/dracurouge.jsのrenameHpToExistenceと同じ割り切り）。
function renameInitiativeToAction({ readParameters, dispatch, tokenId }) {
  const initiative = readParameters()[INITIATIVE_PARAM_ID];
  if (!initiative || initiative.label !== INITIATIVE_DEFAULT_LABEL) return;
  dispatch('IMPORT_CHARACTER_DATA', {
    id: tokenId,
    labelOverrides: { [INITIATIVE_PARAM_ID]: INITIATIVE_LABEL }
  });
}

function renderGcrestCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents,
  getToken, generateBuffId, dispatch, tokenId, allowParameterEdit = false
}) {
  container.innerHTML = '';

  const canWrite = canEdit && typeof dispatch === 'function' && !!tokenId;
  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新の状態を読む
  const readComponents = () => (getComponents ? getComponents() : components) ?? {};
  const readParameters = () => (getToken ? getToken()?.parameters : null) ?? parameters;

  if (canWrite) renameInitiativeToAction({ readParameters, dispatch, tokenId });

  const title = document.createElement('h4');
  title.className = 'gcrest-panel-title';
  title.textContent = 'グランクレスト戦記RPG';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  const addRow = (labelText) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';
    const label = document.createElement('label');
    label.className = 'dialog-param-label gcrest-row-label';
    label.textContent = labelText;
    row.appendChild(label);
    list.appendChild(row);
    return row;
  };

  // --- 属性 ---
  let charType = readGcrestCharType(readParameters());
  const typeRow = addRow('属性');
  const typeSelect = document.createElement('select');
  GCREST_CHAR_TYPES.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    typeSelect.appendChild(option);
  });
  typeSelect.value = charType;
  typeSelect.disabled = !canWrite;
  typeRow.appendChild(typeSelect);

  // 現在の属性に合わせて、キャラクター一覧へ出すかどうかを揃える。
  // 実際に変わるものだけdispatchする（js/character-dialog.jsのapplyCharacterEditResultと同じ規約）。
  function syncTypeVisibility() {
    const current = readParameters();
    const shown = TYPE_VISIBLE_PARAM_IDS[charType] ?? [];
    TYPED_PARAM_IDS.forEach(id => {
      const param = current[id];
      if (!param) return; // このプラグインより前に作られたコマ。補完されるまでは触らない
      const shouldShow = shown.includes(id);
      if ((param.visible !== false) === shouldShow) return;
      dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId: id, visible: shouldShow });
    });
  }

  typeSelect.addEventListener('change', () => {
    charType = CHAR_TYPE_VALUES.has(typeSelect.value) ? typeSelect.value : CHAR_TYPE_PC;
    // 属性の保存と見え方の切り替えは、ダイアログの「更新」を待たずここで済ませる。
    // 待つと、キャンセルしたときに見え方だけが変わって残ってしまう。
    if (canWrite) {
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: CHAR_TYPE_PARAM_ID, value: charType });
      syncTypeVisibility();
    }
  });

  // --- 手で動かす値 ---
  const valueRows = [
    { paramId: MP_PARAM_ID, label: 'MP' },
    { paramId: LUCK_PARAM_ID, label: '天運' }
  ].map(({ paramId: rowParamId, label: fallbackLabel }) => {
    const row = addRow(parameters[rowParamId]?.label ?? fallbackLabel);
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.value = Number(parameters[rowParamId]?.value) || 0;
    input.disabled = !canEdit;
    row.appendChild(input);
    return { paramId: rowParamId, input };
  });

  // --- 能力・技能ボックス ---
  // 値はeditable:falseなので、部屋の外のコマ作成ツール（allowParameterEdit:true）でだけ
  // 入力欄になる。書き込みはIMPORT_CHARACTER_DATAのvalueOverrides
  // （js/parameters/arianrhod-ability-box.jsと同じ経路）。
  // 能力・技能はキャラクターの数値そのものなので、脇の一覧より重い見た目にする（is-primary）。
  const canEditAbilityValues = allowParameterEdit && canWrite;
  const abilityGroup = document.createElement('div');
  abilityGroup.className = 'gcrest-group';
  const abilityGroupTitle = document.createElement('div');
  abilityGroupTitle.className = 'gcrest-group-title';
  abilityGroupTitle.textContent = '能力値';
  abilityGroup.appendChild(abilityGroupTitle);

  const abilityBtn = document.createElement('button');
  abilityBtn.type = 'button';
  abilityBtn.className = 'dialog-add-row-btn gcrest-open-btn is-primary';
  const abilityBtnLabel = document.createElement('span');
  abilityBtnLabel.textContent = canEditAbilityValues ? '能力・技能を編集' : '能力・技能';
  abilityBtn.appendChild(abilityBtnLabel);
  abilityBtn.addEventListener('click', () => {
    showGcrestAbilityBox({
      // 開いた後に枠を足しても巻き戻らないよう、ボックスから都度最新のparametersを読ませる
      readData: () => {
        const current = readParameters();
        return {
          groups: buildAbilityGroups(current),
          combatRows: buildCombatRows(current).map(row => ({
            ...row, value: Number(current[row.paramId]?.value) || 0
          })),
          loadRow: {
            label: current[LOAD_PARAM_ID]?.label ?? '所持重量',
            value: Number(current[LOAD_PARAM_ID]?.value) || 0
          }
        };
      },
      editable: canEditAbilityValues,
      onSave: canEditAbilityValues
        ? (valueOverrides) => dispatch('IMPORT_CHARACTER_DATA', { id: tokenId, valueOverrides })
        : undefined,
      onAddFreeSkill: canEditAbilityValues
        ? (free, label) => {
          const newParameters = buildFreeSkillParameter(readParameters(), free, label);
          if (!newParameters) return false;
          dispatch('IMPORT_CHARACTER_DATA', { id: tokenId, newParameters });
          return true;
        }
        : undefined,
      onRemoveFreeSkill: canEditAbilityValues
        ? (freeParamId) => dispatch('REMOVE_PARAMETER', { characterId: tokenId, paramId: freeParamId })
        : undefined
    });
  });
  abilityGroup.appendChild(abilityBtn);
  container.appendChild(abilityGroup);

  // --- 各種一覧 ---
  // 既存のコマの更新時のみ開ける（新規作成時はまだcomponentsを持たないため対象外）。
  if (mode === 'edit' && onComponentChange) {
    // ボタンの群。見出し1つとボタン数個で1まとまり。
    // 8個を同じ見た目で縦に並べると「どれが本体でどれが脇か」が読めないので、
    // 意味ごとに区切る（css/character-dialog.css の .gcrest-group）。
    const addGroup = (title) => {
      const group = document.createElement('div');
      group.className = 'gcrest-group';
      const heading = document.createElement('div');
      heading.className = 'gcrest-group-title';
      heading.textContent = title;
      group.appendChild(heading);
      container.appendChild(group);
      return group;
    };

    // ボックスを開くボタン。ラベルは短く左、件数や状態は右のバッジへ分ける。
    // 「一覧を開く」を全ボタンに付けると、8個中7個が同じ語尾になって区別に効かない。
    // 件数は保存されたら引き直す（showSkillBoxは開いたまま戻ってくるので、
    // 押した直後ではなく保存の後で数える）。
    const addBoxButton = ({ parent, label, badge, primary = false, onClick }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dialog-add-row-btn gcrest-open-btn${primary ? ' is-primary' : ''}`;

      const labelEl = document.createElement('span');
      labelEl.textContent = label();
      btn.appendChild(labelEl);

      let badgeEl = null;
      if (badge) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'gcrest-badge';
        btn.appendChild(badgeEl);
      }

      const sync = () => {
        labelEl.textContent = label();
        if (!badgeEl) return;
        const next = badge();
        badgeEl.textContent = next.text;
        // 意味を持つ状態（部隊のMCがON）のときだけ浮かせる。件数は沈めたまま。
        badgeEl.classList.toggle('is-on', next.on === true);
      };
      sync();

      btn.addEventListener('click', () => onClick(sync));
      (parent ?? container).appendChild(btn);
      return btn;
    };

    const openSkillBox = (spec, readList, onSaved) => {
      showSkillBox({
        spec,
        skills: readList(),
        parameters: readParameters(),
        readOnly: !canEdit,
        getToken,
        dispatch,
        onSave: (next) => {
          onComponentChange(spec.componentKey, next);
          onSaved?.();
        }
      });
    };

    // 一覧のボックスはどれも同じ形（開く → 保存したら件数を引き直す）。
    const addListButton = (parent, spec, readList) => addBoxButton({
      parent,
      label: () => spec.noun,
      badge: () => ({ text: `${readList().length}件` }),
      onClick: (sync) => openSkillBox(spec, readList, sync)
    });

    const learnedGroup = addGroup('習得');
    addListButton(learnedGroup, GCREST_ART_SPEC, () => readGcrestArts(readComponents()));

    // 魔法。使うキャラクターだけがチェックを入れる（componentsのui.showSpells）。
    // チェックと、それが出し入れするボタンは同じ群の中で隣り合わせに置く。
    const spellRow = document.createElement('label');
    spellRow.className = 'gcrest-check-row';
    const spellCheck = document.createElement('input');
    spellCheck.type = 'checkbox';
    spellCheck.checked = readGcrestUi(readComponents()).showSpells;
    spellCheck.disabled = !canEdit;
    spellRow.appendChild(spellCheck);
    spellRow.appendChild(document.createTextNode('魔法を使う'));
    learnedGroup.appendChild(spellRow);

    const spellBtn = addListButton(learnedGroup, GCREST_SPELL_SPEC, () => readGcrestSpells(readComponents()));
    const syncSpellBtn = () => { spellBtn.style.display = spellCheck.checked ? '' : 'none'; };
    syncSpellBtn();
    spellCheck.addEventListener('change', () => {
      syncSpellBtn();
      onComponentChange(UI_COMPONENT_KEY, {
        ...readComponents()[UI_COMPONENT_KEY], showSpells: spellCheck.checked
      });
    });

    addListButton(learnedGroup, GCREST_ITEM_SPEC, () => readGcrestItems(readComponents()));

    // --- 部隊 ---
    // MCの状態はバッジで出す。件数と違って「今どちらか」で使える特技が変わるので、
    // ONのときだけ浮かせて、ボックスを開かなくても読めるようにしてある。
    const unitGroup = addGroup('マスコンバット');
    addBoxButton({
      parent: unitGroup,
      label: () => {
        const unit = readGcrestUnit(readComponents());
        return unit.name ? `部隊 ${unit.name}` : '部隊';
      },
      badge: () => {
        const unit = readGcrestUnit(readComponents());
        return unit.mc ? { text: `MC ${unit.position}`, on: true } : { text: 'MC オフ' };
      },
      onClick: (sync) => {
        const current = readParameters();
        showGcrestUnitBox({
          unit: readGcrestUnit(readComponents()),
          modGroups: GCREST_UNIT_MOD_GROUPS,
          morale: {
            label: current[MORALE_PARAM_ID]?.label ?? '士気',
            value: Number(current[MORALE_PARAM_ID]?.value) || 0
          },
          readOnly: !canWrite,
          onSave: ({ unit, morale }) => {
            onComponentChange(UNIT_COMPONENT_KEY, unit);
            dispatch('SET_PARAMETER', { characterId: tokenId, paramId: MORALE_PARAM_ID, value: morale });
            syncGcrestUnitBuffs({ unit, tokenId, dispatch, generateBuffId });
            syncMoraleVisibility({ parameters: readParameters(), unit, tokenId, dispatch });
            sync();
          }
        });
      }
    });

    addListButton(unitGroup, GCREST_UNIT_ART_SPEC, () => readGcrestUnitArts(readComponents()));

    const bondGroup = addGroup('関係');
    addListButton(bondGroup, GCREST_BOND_SPEC, () => readGcrestBonds(readComponents()));

    // 誓いは枠が3つで固定なので件数は数えない（常に3）。
    addBoxButton({
      parent: bondGroup,
      label: () => GCREST_OATH_SPEC.noun,
      badge: () => ({ text: `${GCREST_OATH_SPEC.defaultSkills.length}枠` }),
      onClick: () => openSkillBox(GCREST_OATH_SPEC, () => readGcrestOaths(readComponents()))
    });
  }

  return {
    getValues: () => Object.fromEntries(valueRows.map(({ paramId: rowParamId, input }) => [
      rowParamId, Math.trunc(Number(input.value) || 0)
    ]))
  };
}

// ------------------------------------------------------------------
// チャットコマンド
// ------------------------------------------------------------------
const ART_USE_PATTERN = buildSkillUseCommandPattern(GCREST_ART_SPEC);
const SPELL_USE_PATTERN = buildSkillUseCommandPattern(GCREST_SPELL_SPEC);
const UNIT_ART_USE_PATTERN = buildSkillUseCommandPattern(GCREST_UNIT_ART_SPEC);

// この入力がグランクレストのコマンド構文に見えるか（実行できるかは問わない）。
// プラグインが適用されていない部屋で打たれたときに理由を返すためだけに使う（副作用を持たせない）。
function looksLikeGcrestChatCommand(rawInput) {
  const input = String(rawInput).trim();
  return UNIT_ART_USE_PATTERN.test(input)
    || ART_USE_PATTERN.test(input)
    || SPELL_USE_PATTERN.test(input);
}

/**
 * グランクレスト固有のチャットコマンドを解釈・実行する。
 * 書式が合った時点で必ずtrueを返すこと（falseを返すとCoreがただのダイスコマンドとして
 * 解釈し直してしまう。docs/plugin-guide.mdの3.4）。
 */
function handleGcrestChatCommand(rawInput, {
  token, dispatch, getEffectiveParameterValue, generateBuffId
}) {
  const input = String(rawInput).trim();

  // 「部隊特技使用(...)」を先に見る。「特技使用(...)」のパターンは行頭一致なので
  // 取り違えは起きないが、読む順番を書式の具体的なほうからにしておく。
  const matched = [
    { spec: GCREST_UNIT_ART_SPEC, read: readGcrestUnitArts, match: input.match(UNIT_ART_USE_PATTERN) },
    { spec: GCREST_ART_SPEC, read: readGcrestArts, match: input.match(ART_USE_PATTERN) },
    { spec: GCREST_SPELL_SPEC, read: readGcrestSpells, match: input.match(SPELL_USE_PATTERN) }
  ].find(entry => entry.match);

  if (!matched) return false;

  const { spec, read, match } = matched;
  const name = match[1].trim();

  if (!token) {
    alert(`${spec.noun}を使用する参照キャラクターを選択してください。`);
    return true;
  }

  const skills = read(token.components);
  const skill = findSkillByName(skills, name);
  if (!skill) {
    alert(`${spec.noun}「${name}」が見つかりません。`);
    return true;
  }

  // マスコンバットの制限。状態を1つも変えないうちに使えるかどうかを決め切る。
  const unit = readGcrestUnit(token.components);
  if (spec === GCREST_UNIT_ART_SPEC) {
    if (!unit.mc) {
      alert('部隊特技は、部隊のMCがオンのときだけ使用できます。');
      return true;
    }
  } else {
    const blocked = describeMcBlock(unit, skill);
    if (blocked) {
      alert(`${spec.noun}「${skill.name}」は${blocked}`);
      return true;
    }
  }

  const tokenId = token.id;
  runSkillUse({
    spec,
    targetSkills: [skill],
    allSkills: skills,
    tokenId, dispatch, getToken: () => token, getEffectiveParameterValue, generateBuffId,
    chatCommand: input,
    logTitle: `${spec.noun}使用: ${skill.name}`,
    onSaveSkills: (nextSkills) => dispatch('SET_COMPONENT', {
      id: tokenId, componentKey: spec.componentKey, value: nextSkills
    })
  });
  return true;
}

// シナリオ/シーン/ラウンド終了時、該当する期間の使用数を0へ戻す。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetGcrestComponentsOnPhaseEnd(components, phase) {
  let next = components;
  [GCREST_ART_SPEC, GCREST_SPELL_SPEC, GCREST_UNIT_ART_SPEC].forEach(spec => {
    const key = spec.componentKey;
    const list = next?.[key];
    const nextList = resetSkillUsageOnPhaseEnd(spec, list, phase);
    if (nextList !== list) next = { ...next, [key]: nextList };
  });
  return next;
}

export const GCREST_PLUGIN = {
  id: SOURCE,
  label: 'グランクレスト戦記RPG',
  buildCharacterParameters: buildGcrestCharacterParameters,
  buildRoomParameters: buildGcrestRoomParameters,
  computeDerivedParameters: computeGcrestDerivedParameters,
  // item.use(名前) / item.gain(名前,n) はこの宣言だけで生える（registry.jsが配る）
  item: GCREST_ITEM_SPEC,
  renderCharacterPanel: renderGcrestCharacterPanel,
  handleChatCommand: handleGcrestChatCommand,
  looksLikeOwnChatCommand: looksLikeGcrestChatCommand,
  resetComponentsOnPhaseEnd: resetGcrestComponentsOnPhaseEnd,

  // このシステム用のスタンプ（docs/plugin-guide.md 3.9）。宣言するのはデータだけで、
  // 画像URLはCoreが image/stamps/GCREST/<file> として組み立てる（フォルダ名はidそのまま）。
  stamps: [
    { id: 'chaos', label: '混沌', file: 'chaos.png' }
  ],

  bcdiceSystem: BCDICE_SYSTEM
};
