// js/parameters/gcrest.js
// グランクレスト戦記RPGのプラグイン記述子。
//
// このシステム固有の知識だけを持つ：
//   - 属性（PC/NPC/国/モブ）と、属性ごとに持つパラメータ・ボックスの並び
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
import { sheetText, sheetRichText, assignSheetNumber } from './sheet-source.js';

const SOURCE = 'GCREST';
const paramId = (key) => `${SOURCE}:${key}`;

// BCDiceのシステムID（/api/bcdice/game_systemの一覧の表記と一字一句同じにすること）。
const BCDICE_SYSTEM = 'GranCrest';

// ------------------------------------------------------------------
// 属性
// ------------------------------------------------------------------
// 属性ごとに持ち物が違う。差はすべて下の対応表（TYPE_VISIBLE_PARAM_IDS /
// TYPE_INPUT_PARAM_IDS / TYPE_READONLY_PARAM_IDS / TYPE_COMBAT_PARAM_IDS / TYPE_BOXES）
// だけで表し、パネルはその表を描くだけにしてある。属性を足すときは各表へ1行ずつ足す。
//
// モブの内部表記が'ENEMY'のままなのは、「簡易エネミー」という名前で保存されたコマが
// あるため。表示名だけを改めてある（値を変えると既存のコマの属性が読めなくなる）。
const CHAR_TYPE_PC = 'PC';
const CHAR_TYPE_NPC = 'NPC';
const CHAR_TYPE_COUNTRY = 'COUNTRY';
const CHAR_TYPE_MOB = 'ENEMY';
export const GCREST_CHAR_TYPES = [
  { value: CHAR_TYPE_PC, label: 'PC' },
  { value: CHAR_TYPE_NPC, label: 'NPC' },
 // { value: CHAR_TYPE_COUNTRY, label: '国' },
  { value: CHAR_TYPE_MOB, label: 'モブ' }
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
// shortLabelは、既に「防御力」の見出しが付いている場所で使う短い名前
// （部隊の修正値。「防御力」を4回繰り返さないため）。
const DEFENSES = [
  { key: 'defWeapon', label: '防御力（武器）', shortLabel: '武器' },
  { key: 'defHeat', label: '防御力（炎熱）', shortLabel: '炎熱' },
  { key: 'defImpact', label: '防御力（衝撃）', shortLabel: '衝撃' },
  { key: 'defInner', label: '防御力（体内）', shortLabel: '体内' }
];

const DEFENCE_PARAM_IDS = DEFENSES.map(def => paramId(def.key));

const MP_PARAM_ID = paramId('MP');
const LUCK_PARAM_ID = paramId('luck');
const REACTION_PARAM_ID = paramId('reaction');
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
  ...DEFENSES.map(({ key, label }) => ({ key, label, value: 0, editable: false, visible: false })),
  // モブだけが持つ受け身の値。モブのときだけキャラクター一覧へ出す（TYPE_VISIBLE_PARAM_IDS）。
  // 宣言時のvisibleはfalseにすること：新規コマの既定はPCなので、ここをtrueにすると
  // PCの一覧にも出てしまう。モブへ切り替えたときにsyncTypeVisibilityが出す。
  { key: 'reaction', label: 'リアクション', value: 0, editable: false, visible: false },
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
// HPと行動値もここに入れない（core側の値で、属性によらず同じ扱い）。
export const GCREST_TYPE_VISIBLE_PARAM_IDS = {
  [CHAR_TYPE_PC]: [MP_PARAM_ID, LUCK_PARAM_ID],
  [CHAR_TYPE_NPC]: [MP_PARAM_ID],
  [CHAR_TYPE_COUNTRY]: [],
  [CHAR_TYPE_MOB]: [MP_PARAM_ID, REACTION_PARAM_ID]
};
const TYPE_VISIBLE_PARAM_IDS = GCREST_TYPE_VISIBLE_PARAM_IDS;
const TYPED_PARAM_IDS = [...new Set(Object.values(TYPE_VISIBLE_PARAM_IDS).flat())];

// 属性ごとに、パネルへ並べる手入力の行（editable:trueの値だけ）。
// ここの値はダイアログの「更新」でまとめて保存される（getValues → SET_PARAMETER）。
export const GCREST_TYPE_INPUT_PARAM_IDS = {
  [CHAR_TYPE_PC]: [MP_PARAM_ID, LUCK_PARAM_ID],
  [CHAR_TYPE_NPC]: [MP_PARAM_ID],
  [CHAR_TYPE_COUNTRY]: [],
  [CHAR_TYPE_MOB]: [MP_PARAM_ID]
};
const TYPE_INPUT_PARAM_IDS = GCREST_TYPE_INPUT_PARAM_IDS;

// 属性ごとに、パネルへ並べる editable:false の値。部屋の中では表示だけで、部屋の外の
// コマ作成ツールでだけ入力欄になる（書き込みはIMPORT_CHARACTER_DATA。能力ボックスと同じ経路）。
// モブは能力ボックスを持たないので、ここがモブの数値の唯一の入力口になる。
export const GCREST_TYPE_READONLY_PARAM_IDS = {
  [CHAR_TYPE_PC]: [],
  [CHAR_TYPE_NPC]: [],
  [CHAR_TYPE_COUNTRY]: [],
  [CHAR_TYPE_MOB]: [MOVE_PARAM_ID, ...DEFENCE_PARAM_IDS, REACTION_PARAM_ID]
};
const TYPE_READONLY_PARAM_IDS = GCREST_TYPE_READONLY_PARAM_IDS;

// 能力ボックスの「戦闘・移動」に出す行。nullは絞らない（＝宣言どおり全部）。
// NPCは攻撃力と重量を持たないので、移動力と防御力4種だけに絞る。
const TYPE_COMBAT_PARAM_IDS = {
  [CHAR_TYPE_PC]: null,
  [CHAR_TYPE_NPC]: [MOVE_PARAM_ID, ...DEFENCE_PARAM_IDS],
  [CHAR_TYPE_COUNTRY]: null,
  [CHAR_TYPE_MOB]: null
};

// 属性ごとに出すボックス。国はPCと同じまま（中身がこれからなので、ここでは減らさない）。
export const GCREST_TYPE_BOXES = {
  [CHAR_TYPE_PC]: { ability: true, arts: true, equipment: true, items: true, unit: true, bonds: true },
  [CHAR_TYPE_NPC]: { ability: true, arts: true, equipment: false, items: false, unit: false, bonds: false },
  [CHAR_TYPE_COUNTRY]: { ability: true, arts: true, equipment: true, items: true, unit: true, bonds: true },
  [CHAR_TYPE_MOB]: { ability: false, arts: true, equipment: false, items: false, unit: false, bonds: false }
};
const TYPE_BOXES = GCREST_TYPE_BOXES;

// パラメータの表示名の既定（コマ側のラベルが読めないときの落とし先）。
const PARAM_FALLBACK_LABELS = new Map(
  GCREST_PARAMETERS.map(def => [paramId(def.key), def.label])
);

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

// 特技と魔法は1つの一覧にまとめ、「種別」のトグルで切り替える。
// 別々の一覧にすると、同じ「使う能力」を2か所へ探しに行くことになるため。
//
// 種別で意味が変わる欄は availableWhen で出し分ける（docs/plugin-guide.md 6.1）。
//   レベル   … 魔法には無い。薄く出したまま押せなくする（＝「この種別には無い」と読める）
//   目標値   … 魔法だけが持つ
//   コスト   … 特技は種類を選ぶ（MPか天運）。魔法はMPで固定
// コスト欄を種別ごとに分けてあるのは、支払いを枠組みに任せ切るため。
// availableWhen が偽の欄は sumSkillCosts が読まないので（skill-use.js）、
// 「天運を選んだあと魔法へ切り替えたら天運が減る」という取り違えが起きない。
const KIND_ART = 'art';
const KIND_SPELL = 'spell';
const isSpell = (fields) => fields?.kind === KIND_SPELL;

export const GCREST_ART_SPEC = createSkillSpec({
  id: 'gcrest-art',
  noun: '特技',
  componentKey: 'arts',
  fields: [
    {
      key: 'kind', label: '種別', type: 'toggle',
      options: [
        { value: KIND_ART, label: '特技' },
        { value: KIND_SPELL, label: '魔法' }
      ]
    },
    {
      key: 'level', label: 'レベル', type: 'number', className: 'effect-box-level',
      formulaName: 'Lv', availableWhen: fields => !isSpell(fields)
    },
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'target', label: '対象', type: 'text' },
    { key: 'range', label: '射程', type: 'text' },
    // 何を振るか（自動成功／白兵技能／〈重武器〉）。シートの「判定」欄。
    { key: 'check', label: '判定', type: 'text' },
    // 特技では難易度（―／対決）、魔法では目標値。同じ「どこまで届けばよいか」の欄なので
    // 1つにまとめ、種別によらず出す。
    { key: 'targetValue', label: '難易度／目標値', type: 'text' },
    MC_FIELD,
    // 特技のコスト。種類を行ごとに選ぶ。支払いはSET_PARAMETERを通るので、
    // 選択肢はeditable:trueのパラメータに限ること。
    {
      key: 'costType', label: 'コスト種', type: 'select', newRow: true,
      availableWhen: fields => !isSpell(fields), hideWhenUnavailable: true,
      options: [
        { value: '', label: '（なし）' },
        { value: MP_PARAM_ID, label: 'MP' },
        { value: LUCK_PARAM_ID, label: '天運' }
      ]
    },
    {
      key: 'costValue', label: 'コスト', type: 'number',
      availableWhen: fields => !isSpell(fields) && !!fields.costType, hideWhenUnavailable: true,
      onUse: { paramIdFromField: 'costType', sign: -1 }
    },
    // 魔法のコスト。MPで固定なので種類を選ばせない。
    {
      key: 'mp', label: 'MP', type: 'number', className: 'effect-box-encroach', newRow: true,
      availableWhen: isSpell, hideWhenUnavailable: true,
      onUse: { addToParamId: MP_PARAM_ID, sign: -1 }
    }
  ],
  periods: USE_PERIODS,
  modTargets: MOD_TARGETS,
  hasUseCommand: true
});

/** その1件が魔法か。ログの呼び名と、使用時の案内に使う。 */
export function isGcrestSpell(skill) {
  return isSpell(skill?.fields);
}

/** 画面とログに出す呼び名。一覧はどちらも「特技」だが、1件ごとには種別で呼び分ける。 */
function nounOf(skill) {
  return isGcrestSpell(skill) ? '魔法' : '特技';
}

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
  // 画面の今の値で毎回引かれるので、重量や数を直した瞬間に動く。
  // 上限を超えたら赤字になる（skill-box.jsの.effect-box-footer.is-over）。
  //
  // ここに出すのは**アイテムだけ**の重量。装備を含めた合計は所持重量のパラメータが持ち、
  // 能力・技能ボックスの「戦闘・移動」に出る（この一覧からは装備の中身が見えないため、
  // 同じ「所持重量」という語を別の意味で使わない）。
  footerNote: ({ skills, parameters }) => {
    const weight = sumGcrestItemWeight(skills);
    const limit = Number(parameters?.[LOAD_MAX_PARAM_ID]?.value) || 0;
    return {
      text: `アイテムの重量 ${weight} ／ 所持可能重量 ${limit}`,
      warning: weight > limit
    };
  }
});

// 装備（武器・防具・乗騎）。
//
// 3種類を1つの一覧にまとめ、行ごとの「種別」トグルで切り替える（特技と魔法と同じ形）。
// 3つの一覧に割ると、同じ「身に着けているもの」を3か所へ探しに行くことになるため。
// 種別で意味が変わる欄は availableWhen で出し分ける。
//
// 使う・回数を数える・修正が乗るという概念を持たないので createListSpec。
// **装備は値を持つだけで、防御力や移動力のパラメータを動かさない。** シートは装備込みの
// 合計値を別に持っており（armorTotalDef*・sttMoveTotal は装備の -7 を含む）、
// 取り込みではそちらをパラメータへ入れる。ここで二重に計算すると、どちらが正かが決まらない。
// 例外は重量で、所持重量はアイテムと装備の合計から自動で決まる（computeGcrestDerivedParameters）。
const EQUIP_WEAPON = 'weapon';
const EQUIP_ARMOR = 'armor';
const EQUIP_VEHICLE = 'vehicle';
const isWeapon = (fields) => fields?.kind === EQUIP_WEAPON;
const isArmor = (fields) => fields?.kind === EQUIP_ARMOR;
const isVehicle = (fields) => fields?.kind === EQUIP_VEHICLE;
// 防御力と回避は防具と乗騎が共通で持つ。
const hasDefence = (fields) => isArmor(fields) || isVehicle(fields);
// 命中と攻撃力は武器と乗騎。
const hasAttack = (fields) => isWeapon(fields) || isVehicle(fields);

export const GCREST_EQUIPMENT_SPEC = createListSpec({
  id: 'gcrest-equipment',
  noun: '装備',
  componentKey: 'equipment',
  fields: [
    {
      key: 'kind', label: '種別', type: 'toggle',
      options: [
        { value: EQUIP_WEAPON, label: '武器' },
        { value: EQUIP_ARMOR, label: '防具' },
        { value: EQUIP_VEHICLE, label: '乗騎' }
      ]
    },
    // 「重武器（大剣）」「鎧／金属」のような分類。乗騎は持たない。
    {
      key: 'type', label: '種別（分類）', type: 'text',
      availableWhen: fields => isWeapon(fields) || isArmor(fields), hideWhenUnavailable: true
    },
    {
      key: 'skill', label: '技能', type: 'text',
      availableWhen: isWeapon, hideWhenUnavailable: true
    },
    {
      key: 'acc', label: '命中', type: 'number', className: 'effect-box-level',
      availableWhen: hasAttack, hideWhenUnavailable: true
    },
    // 攻撃力は「12+3D」のようなダイス式で来るので text。number にすると
    // normalizeSkill の toNumber が 0 へ潰す（js/parameters/skill/skill-model.js）。
    {
      key: 'atk', label: '攻撃力', type: 'text',
      availableWhen: hasAttack, hideWhenUnavailable: true
    },
    {
      key: 'guard', label: 'ガード', type: 'number', className: 'effect-box-level',
      availableWhen: isWeapon, hideWhenUnavailable: true
    },
    // 「0Sq」のような単位付きで来るので text。
    {
      key: 'range', label: '射程', type: 'text',
      availableWhen: isWeapon, hideWhenUnavailable: true
    },
    // 防御力4種。次の段へ送って、上の段（何であるか）と読み分ける。
    ...DEFENSES.map((def, index) => ({
      key: def.key, label: def.shortLabel, type: 'number', className: 'effect-box-level',
      newRow: index === 0, availableWhen: hasDefence, hideWhenUnavailable: true
    })),
    {
      key: 'eva', label: '回避', type: 'number', className: 'effect-box-level',
      availableWhen: hasDefence, hideWhenUnavailable: true
    },
    // 行動値・移動力は3種別すべてが持つ。重量は乗騎だけ持たない（乗るものなので担がない）。
    { key: 'init', label: '行動値', type: 'number', className: 'effect-box-level', newRow: true },
    { key: 'move', label: '移動力', type: 'number', className: 'effect-box-level' },
    {
      key: 'weight', label: '重量', type: 'number', className: 'effect-box-level',
      availableWhen: fields => !isVehicle(fields), hideWhenUnavailable: true
    }
  ],
  // 装備の合計。シートの armorTotal* / weaponTotal* と同じものを画面側で出し直す
  // （取り込みでは合計欄を読まず、1件ずつを持つため）。
  footerNote: ({ skills }) => {
    const defence = DEFENSES.map(def => {
      const total = skills.reduce((sum, item) => sum + (Number(item.fields?.[def.key]) || 0), 0);
      return `${def.shortLabel}${total}`;
    }).join('／');
    return { text: `防御力 ${defence} ・ 重量 ${sumGcrestItemWeight(skills)}` };
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
    // 見出しが行の名前を兼ねる（「攻撃力」を縦に2回並べない）。
    label: '攻撃力',
    rows: [{ key: 'atk', label: '攻撃力', paramId: ATTACK_PARAM_ID, hideLabel: true }]
  },
  {
    // 4つで1組なので格子に散らさず横一列に流す。「防御力」を4回前置する代わりに、
    // 見出し1つ＋短い名前（武器/炎熱/衝撃/体内）で読ませる。
    // labelはバフ名（部隊修正（防御力（武器）））に使うので、短い名前とは別に残す。
    label: '防御力',
    layout: 'flow',
    rows: DEFENSES.map(def => ({
      key: def.key, label: def.label, short: def.shortLabel, paramId: paramId(def.key)
    }))
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
// 特技と魔法が別々の一覧だった頃のキー。統合前に保存されたコマから拾い上げるためだけに
// 残してある。読むたびに特技の一覧へ混ぜ、次の保存でarts側へ書かれる（このキーは消えるが、
// 読み出しは常にこの関数を通るので、書き戻される前でも画面には出る）。
const LEGACY_SPELL_COMPONENT_KEY = 'spells';

function readLegacySpells(components) {
  const raw = components?.[LEGACY_SPELL_COMPONENT_KEY];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // 旧・魔法の欄（cost）を、統合後の魔法のコスト欄（mp）へ移す。
  return raw.map(skill => ({
    ...skill,
    fields: { ...skill?.fields, kind: KIND_SPELL, mp: skill?.fields?.cost ?? skill?.cost ?? 0 }
  }));
}

export function readGcrestArts(components) {
  const stored = components?.[GCREST_ART_SPEC.componentKey] ?? [];
  const list = Array.isArray(stored) ? stored : [];
  return normalizeSkillList(GCREST_ART_SPEC, [...list, ...readLegacySpells(components)]);
}

export function readGcrestUnitArts(components) {
  return normalizeSkillList(GCREST_UNIT_ART_SPEC, components?.[GCREST_UNIT_ART_SPEC.componentKey] ?? []);
}

export function readGcrestEquipment(components) {
  return normalizeSkillList(
    GCREST_EQUIPMENT_SPEC, components?.[GCREST_EQUIPMENT_SPEC.componentKey] ?? []
  );
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
//
// アイテムと装備の両方を数える。シートの totalWeight もその合計で
// （この例では アイテム8＋防具8＋武器10＝26 で sttMaxWeight と並ぶ）、装備を外すと
// 取り込んだ直後に所持重量だけがシートと食い違う。
// sumGcrestItemWeight は個数を持たない行を1個として数えるので、装備にもそのまま使える。
function computeGcrestDerivedParameters(parameters, components = {}) {
  const items = sumGcrestItemWeight(readGcrestItems(components));
  const equipment = sumGcrestItemWeight(readGcrestEquipment(components));
  return {
    [LOAD_PARAM_ID]: items + equipment
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
// 並べ方は部隊の修正値と同じ考え方。単発の値は格子に、4つで1組の防御力は
// 見出し1つ＋短い名前の横一列にする（「防御力」を4回前置しない）。
// ここでのlabelは表示だけに使うので、防御力は短い名前をそのまま渡してよい
// （部隊の修正値と違い、バフ名の材料にはならない）。
function buildCombatGroups(parameters, charType = CHAR_TYPE_PC) {
  const valueOf = (id) => Number(parameters[id]?.value) || 0;
  const labelOf = (id, fallback) => parameters[id]?.label ?? fallback;
  // その属性が持たない行をここで落とす（NPCの攻撃力・所持重量）。nullなら絞らない。
  const allowed = TYPE_COMBAT_PARAM_IDS[charType] ?? null;

  return [
    {
      rows: [
        { paramId: ATTACK_PARAM_ID, label: labelOf(ATTACK_PARAM_ID, '攻撃力') },
        { paramId: MOVE_PARAM_ID, label: labelOf(MOVE_PARAM_ID, '移動力') },
        { paramId: LOAD_MAX_PARAM_ID, label: labelOf(LOAD_MAX_PARAM_ID, '所持可能重量') },
        // 所持重量は持ち物から自動で決まるので、編集できる画面でも入力欄を出さない。
        { paramId: LOAD_PARAM_ID, label: labelOf(LOAD_PARAM_ID, '所持重量'), readOnly: true }
      ]
    },
    {
      label: '防御力',
      layout: 'flow',
      rows: DEFENSES.map(def => ({ paramId: paramId(def.key), label: def.shortLabel }))
    }
  ].map(group => ({
    ...group,
    rows: group.rows
      .filter(row => !allowed || allowed.includes(row.paramId))
      .map(row => ({ ...row, value: valueOf(row.paramId) }))
  })).filter(group => group.rows.length > 0);
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

  // editable:falseの値（能力・技能・攻撃力・防御力・移動力・リアクション）は、部屋の外の
  // コマ作成ツール（allowParameterEdit:true）でだけ書き換えられる。書き込みは
  // IMPORT_CHARACTER_DATAのvalueOverrides（js/parameters/arianrhod-ability-box.jsと同じ経路）。
  const canEditAbilityValues = allowParameterEdit && canWrite;

  if (canWrite) renameInitiativeToAction({ readParameters, dispatch, tokenId });

  const title = document.createElement('h4');
  title.className = 'gcrest-panel-title';
  title.textContent = 'グランクレスト戦記RPG';
  container.appendChild(title);

  const typeList = document.createElement('div');
  typeList.className = 'dialog-custom-list';
  container.appendChild(typeList);

  const addRow = (parent, labelText) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';
    const label = document.createElement('label');
    label.className = 'dialog-param-label gcrest-row-label';
    label.textContent = labelText;
    row.appendChild(label);
    parent.appendChild(row);
    return row;
  };

  // 表示名はコマが実際に持っているものを優先する（利用者が付け替えていたら、それを尊重する）
  const labelOf = (current, rowParamId) =>
    current[rowParamId]?.label ?? PARAM_FALLBACK_LABELS.get(rowParamId) ?? rowParamId;

  // --- 属性 ---
  let charType = readGcrestCharType(readParameters());
  const typeRow = addRow(typeList, '属性');
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

  // 属性で中身が変わるところ。ここだけ描き直せば、属性の切り替えに値もボックスも追従する。
  const typedArea = document.createElement('div');
  container.appendChild(typedArea);

  // getValues()が読む入力欄。描き直すたびに作り替える。
  let valueRows = [];

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

  function renderTypedArea() {
    typedArea.innerHTML = '';
    valueRows = [];

    const current = readParameters();
    const boxes = TYPE_BOXES[charType] ?? TYPE_BOXES[CHAR_TYPE_PC];

    const valueList = document.createElement('div');
    valueList.className = 'dialog-custom-list';
    typedArea.appendChild(valueList);

    // --- 手で動かす値 ---
    (TYPE_INPUT_PARAM_IDS[charType] ?? []).forEach(rowParamId => {
      const row = addRow(valueList, labelOf(current, rowParamId));
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '1';
      input.value = Number(current[rowParamId]?.value) || 0;
      input.disabled = !canEdit;
      row.appendChild(input);
      valueRows.push({ paramId: rowParamId, input });
    });

    // --- 能力ボックス側の値を、パネルへ直接出す属性（モブ）---
    // モブは能力ボックスを持たないので、移動力・防御力・リアクションの入力口がここにしかない。
    // SET_PARAMETERはeditable:falseを弾くため、ダイアログの「更新」を待たずその場で書く
    // （他のボックスと同じ「開いている画面の中で保存が完結する」振る舞い）。
    const readOnlyParamIds = TYPE_READONLY_PARAM_IDS[charType] ?? [];
    readOnlyParamIds.forEach(rowParamId => {
      const row = addRow(valueList, labelOf(current, rowParamId));
      const value = Number(current[rowParamId]?.value) || 0;

      if (!canEditAbilityValues) {
        const view = document.createElement('span');
        view.className = 'gcrest-row-value';
        view.textContent = String(value);
        row.appendChild(view);
        return;
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '1';
      input.value = value;
      input.addEventListener('change', () => {
        dispatch('IMPORT_CHARACTER_DATA', {
          id: tokenId,
          valueOverrides: { [rowParamId]: Math.trunc(Number(input.value) || 0) }
        });
      });
      row.appendChild(input);
    });

    // 部屋の中では手入力できないことを断っておく（能力ボックスの同じ注記と同じ理由。
    // こちらは開く先が無いので、行のすぐ下に置く）。
    if (readOnlyParamIds.length > 0 && !canEditAbilityValues) {
      const note = document.createElement('p');
      note.className = 'gcrest-note';
      note.textContent = 'これらの値は部屋の中では編集できません。'
        + 'コマ作成ツール（キャラクター作成）で入力してから部屋へ持ち込んでください。';
      typedArea.appendChild(note);
    }

    // --- 能力・技能ボックス ---
    // 能力・技能はキャラクターの数値そのものなので、脇の一覧より重い見た目にする（is-primary）。
    if (boxes.ability) {
      const abilityGroup = document.createElement('div');
      abilityGroup.className = 'gcrest-group';

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
            const latest = readParameters();
            return {
              groups: buildAbilityGroups(latest),
              combatGroups: buildCombatGroups(latest, charType)
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
      typedArea.appendChild(abilityGroup);
    }

    // --- 各種一覧 ---
    // 既存のコマの更新時のみ開ける（新規作成時はまだcomponentsを持たないため対象外）。
    if (mode !== 'edit' || !onComponentChange) return;

    // ボタンのまとまり。同じ見た目で縦に並べ切ると「どれが本体でどれが脇か」が
    // 読めないので、意味ごとに空きで区切る（見出しは置かない）。
    const addGroup = () => {
      const group = document.createElement('div');
      group.className = 'gcrest-group';
      typedArea.appendChild(group);
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
      (parent ?? typedArea).appendChild(btn);
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

    const learnedGroup = addGroup();
    if (boxes.arts) {
      addListButton(learnedGroup, GCREST_ART_SPEC, () => readGcrestArts(readComponents()));
    }
    if (boxes.equipment) {
      addListButton(learnedGroup, GCREST_EQUIPMENT_SPEC, () => readGcrestEquipment(readComponents()));
    }
    if (boxes.items) {
      addListButton(learnedGroup, GCREST_ITEM_SPEC, () => readGcrestItems(readComponents()));
    }
    if (!learnedGroup.firstChild) learnedGroup.remove();

    // --- 部隊 ---
    // MCの状態はバッジで出す。件数と違って「今どちらか」で使える特技が変わるので、
    // ONのときだけ浮かせて、ボックスを開かなくても読めるようにしてある。
    if (boxes.unit) {
      const unitGroup = addGroup();
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
          const latest = readParameters();
          showGcrestUnitBox({
            unit: readGcrestUnit(readComponents()),
            modGroups: GCREST_UNIT_MOD_GROUPS,
            morale: {
              label: latest[MORALE_PARAM_ID]?.label ?? '士気',
              value: Number(latest[MORALE_PARAM_ID]?.value) || 0
            },
            readOnly: !canWrite,
            // 部隊特技は部隊の持ち物なので、部隊ボックスの中から開く。
            // 一覧そのものは共通の枠組み（showSkillBox）のままで、部隊ボックスは
            // 「開く口」だけを持つ（あちらはstoreを触らない）。
            unitArts: {
              noun: GCREST_UNIT_ART_SPEC.noun,
              count: () => readGcrestUnitArts(readComponents()).length,
              open: (onSaved) => openSkillBox(
                GCREST_UNIT_ART_SPEC,
                () => readGcrestUnitArts(readComponents()),
                onSaved
              )
            },
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
    }

    if (boxes.bonds) {
      const bondGroup = addGroup();
      addListButton(bondGroup, GCREST_BOND_SPEC, () => readGcrestBonds(readComponents()));

      // 誓いは枠が3つで固定なので件数は数えない（常に3）。
      addBoxButton({
        parent: bondGroup,
        label: () => GCREST_OATH_SPEC.noun,
        badge: () => ({ text: `${GCREST_OATH_SPEC.defaultSkills.length}枠` }),
        onClick: () => openSkillBox(GCREST_OATH_SPEC, () => readGcrestOaths(readComponents()))
      });
    }
  }

  // 開いた時にも見え方を揃える。ここで揃えないと、後から足したパラメータ（リアクション）が
  // 既存のコマでは属性を選び直すまで一覧に出てこない（js/parameters/dracurouge.jsと同じ）。
  if (canWrite) syncTypeVisibility();
  renderTypedArea();

  typeSelect.addEventListener('change', () => {
    charType = CHAR_TYPE_VALUES.has(typeSelect.value) ? typeSelect.value : CHAR_TYPE_PC;
    // 属性の保存と見え方の切り替えは、ダイアログの「更新」を待たずここで済ませる。
    // 待つと、キャンセルしたときに見え方だけが変わって残ってしまう。
    if (canWrite) {
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: CHAR_TYPE_PARAM_ID, value: charType });
      syncTypeVisibility();
    }
    renderTypedArea();
  });

  return {
    getValues: () => Object.fromEntries(valueRows.map(({ paramId: rowParamId, input }) => [
      rowParamId, Math.trunc(Number(input.value) || 0)
    ]))
  };
}

// ------------------------------------------------------------------
// チャットコマンド
// ------------------------------------------------------------------
// 魔法は特技の一覧に統合したので、コマンドも「特技使用(名前)」に一本化してある
// （種別が魔法の行もこれで使う。ログの呼び名だけ「魔法使用」になる）。
const ART_USE_PATTERN = buildSkillUseCommandPattern(GCREST_ART_SPEC);
const UNIT_ART_USE_PATTERN = buildSkillUseCommandPattern(GCREST_UNIT_ART_SPEC);

// この入力がグランクレストのコマンド構文に見えるか（実行できるかは問わない）。
// プラグインが適用されていない部屋で打たれたときに理由を返すためだけに使う（副作用を持たせない）。
function looksLikeGcrestChatCommand(rawInput) {
  const input = String(rawInput).trim();
  return UNIT_ART_USE_PATTERN.test(input) || ART_USE_PATTERN.test(input);
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
    { spec: GCREST_ART_SPEC, read: readGcrestArts, match: input.match(ART_USE_PATTERN) }
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
      alert(`${nounOf(skill)}「${skill.name}」は${blocked}`);
      return true;
    }
  }

  // ログの呼び名は1件ごとの種別で決める（一覧はどちらも「特技」だが、
  // 使ったのが魔法なら卓には「魔法使用」と出したい）。
  const logNoun = spec === GCREST_ART_SPEC ? nounOf(skill) : spec.noun;

  const tokenId = token.id;
  runSkillUse({
    spec,
    targetSkills: [skill],
    allSkills: skills,
    tokenId, dispatch, getToken: () => token, getEffectiveParameterValue, generateBuffId,
    chatCommand: input,
    // 発言種別も1件ごとの呼び名に合わせる（本文が「魔法使用」なのに種別が「特技」だと食い違う）
    logSystem: logNoun,
    logTitle: `${logNoun}使用: ${skill.name}`,
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
  [GCREST_ART_SPEC, GCREST_UNIT_ART_SPEC].forEach(spec => {
    const key = spec.componentKey;
    const list = next?.[key];
    const nextList = resetSkillUsageOnPhaseEnd(spec, list, phase);
    if (nextList !== list) next = { ...next, [key]: nextList };
  });
  return next;
}

// ------------------------------------------------------------------
// キャラクターシートの取り込み
// ------------------------------------------------------------------
// 対象はゆとシート（yutorize.work の ytsheet/gc）が書き出すJSON。
// ファイルから読ませる道（盤面の「JSONを読み込む」／コマ作成ツール）だけを受ける。
// URLから取る道（characterSheetSource）は宣言していない：あちらはサーバーが外部へ
// 取りに行く経路なので、生JSONを返す口を確かめてから足すこと。
//
// シートにあってこのアプリが持っていない項目（クラス・スタイル・ワークス・レベル・
// 経験点・能力値そのもの）は取り込まない。プラグインが持つのは能力「判定値」だけで、
// パラメータ化していないものを隠しパラメータとして持たせても画面のどこにも出ないため。

// シートの能力の綴り → このプラグインの能力キー。感覚だけ綴りが違う（Per）。
const SHEET_ABILITIES = [
  { sheet: 'Str', key: 'STR' },
  { sheet: 'Ref', key: 'REF' },
  { sheet: 'Per', key: 'SEN' },
  { sheet: 'Int', key: 'INT' },
  { sheet: 'Mnd', key: 'MND' },
  { sheet: 'Emp', key: 'EMP' }
];

// 防御力。シートの綴りはこちらと違う（炎熱=Fire・衝撃=Shock・体内=Internal）。
const SHEET_DEFENCES = [
  { sheet: 'DefWeapon', key: 'defWeapon' },
  { sheet: 'DefFire', key: 'defHeat' },
  { sheet: 'DefShock', key: 'defImpact' },
  { sheet: 'DefInternal', key: 'defInner' }
];

// 部隊。シートの force1* は、このプラグインの修正値と項目がそのまま揃っている。
const SHEET_UNIT_MODS = [
  ...SHEET_ABILITIES.map(ability => ({ sheet: ability.sheet, key: ability.key })),
  { sheet: 'Hp', key: 'hp' },
  { sheet: 'Init', key: 'initiative' },
  { sheet: 'Move', key: 'move' },
  { sheet: 'Atk', key: 'atk' },
  ...SHEET_DEFENCES
];

// 技能はラベルで引く（シートは skillStr1Label:'格闘' の形で名前を持ち、キーを持たない）。
const SHEET_SKILL_BY_LABEL = new Map(FIXED_SKILLS.map(skill => [skill.label, paramId(skill.key)]));
// 自由記述の枠の見出し（「専門知識」「芸術」）→ その分類の宣言。
const SHEET_FREE_BY_LABEL = new Map(
  GCREST_SKILL_GROUPS.filter(group => group.free).map(group => [group.free.label, group.free])
);
const SHEET_SKILL_GROUPS = SHEET_ABILITIES.map(ability => ability.sheet);

// シートの「件数」欄（classAbilityNum 等）は枠の数で、埋まっている数とは限らない
// （この例では worksAbilityNum:'3' に対して中身は2件）。件数を信じず、上限まで走査して
// 名前のある行だけを拾う（js/parameters/dx3.js の可変スロット技能と同じ構え）。
const SHEET_MAX_ROWS = 30;
const SHEET_MAX_SKILL_SLOTS = 12;
// 武器と防具は「主」「副」の2枠。Total は合計欄なので読まない（合計は画面側で出し直す）。
const SHEET_EQUIP_SLOTS = ['Main', 'Sub'];

/**
 * このJSONがグランクレストのシートに見えるか。
 * 他システムのシートを読ませたときに、黙って空のコマを作らないための入口
 * （js/parameters/stella-knights.js の looksLikeSheet と同じ役割）。
 * 天運はこのシステムだけが持つ。念のためもう1組を or で見る。
 */
function looksLikeGcrestSheet(json) {
  if (!json || typeof json !== 'object') return false;
  return json.sttFateTotal !== undefined
    || (json.classAbilityNum !== undefined && json.sttMaxWeight !== undefined);
}

/** シートの「―」「-」「なし」は未記入と同じ扱いにする。 */
function isSheetBlank(text) {
  return text === '' || text === '―' || text === '-' || text === 'なし';
}

/**
 * 天恵・ワークス特技のコスト欄を、コスト種とコスト値へ割る。
 * 数値ならMP、「天運」と書いてあれば天運。天運は「消費天運（最大5）」のように
 * 使うたびに決める書き方なので、値は0のままにして卓で入れてもらう。
 */
function readSheetArtCost(raw) {
  const text = sheetText(raw);
  if (isSheetBlank(text)) return { costType: '', costValue: 0 };
  if (text.includes('天運')) return { costType: LUCK_PARAM_ID, costValue: 0 };
  const value = Number(text);
  return Number.isFinite(value)
    ? { costType: MP_PARAM_ID, costValue: Math.trunc(value) }
    : { costType: '', costValue: 0 };
}

/** MC欄。シートの表記（○ / × / FW）はトグルの選択肢とそのまま一致する。 */
function readSheetMc(raw) {
  const text = sheetText(raw);
  return [MC_OK, MC_NG, MC_FW].includes(text) ? text : MC_OK;
}

/**
 * 天恵（classAbility）とワークス特技（worksAbility）の1件。
 * 種別（天恵（強化／BS）・戦闘）は専用の欄を持たないので、効果の先頭へ置く。
 */
function readSheetArt(json, prefix, index) {
  const at = (field) => json[`${prefix}${index}${field}`];
  const name = sheetText(at('Name'));
  if (!name) return null;

  const type = sheetText(at('Type'));
  const note = sheetRichText(at('Note'));

  return {
    name,
    note: type && note ? `${type}／${note}` : (type || note),
    fields: {
      kind: KIND_ART,
      level: at('Lv'),
      timing: sheetText(at('Timing')),
      target: sheetText(at('Target')),
      range: sheetText(at('Range')),
      check: sheetText(at('Check')),
      targetValue: sheetText(at('Dfclty')),
      mc: readSheetMc(at('MC')),
      ...readSheetArtCost(at('Cost')),
      mp: 0
    }
  };
}

function readSheetArts(json) {
  const arts = [];
  ['classAbility', 'worksAbility'].forEach(prefix => {
    for (let index = 1; index <= SHEET_MAX_ROWS; index += 1) {
      const art = readSheetArt(json, prefix, index);
      if (art) arts.push(art);
    }
  });
  return normalizeSkillList(GCREST_ART_SPEC, arts);
}

function readSheetItems(json) {
  const items = [];
  for (let index = 1; index <= SHEET_MAX_ROWS; index += 1) {
    const name = sheetText(json[`item${index}Name`]);
    if (!name) continue;
    items.push({
      name,
      note: sheetRichText(json[`item${index}Note`]),
      fields: { weight: json[`item${index}Weight`] },
      quantity: json[`item${index}Quantity`]
    });
  }
  return normalizeSkillList(GCREST_ITEM_SPEC, items);
}

/** 武器・防具・乗騎を1つの装備一覧へ。 */
function readSheetEquipment(json) {
  const equipment = [];

  SHEET_EQUIP_SLOTS.forEach(slot => {
    const at = (field) => json[`weapon${slot}${field}`];
    const name = sheetText(at('Name'));
    if (!name) return;
    equipment.push({
      name,
      note: '',
      fields: {
        kind: EQUIP_WEAPON,
        type: sheetText(at('Type')),
        skill: sheetText(at('Skill')),
        acc: at('Acc'),
        // ダイス式（12+3D）で来るので文字列のまま
        atk: sheetText(at('Atk')),
        guard: at('Guard'),
        range: sheetText(at('Range')),
        init: at('Init'),
        move: at('Move'),
        weight: at('Weight')
      }
    });
  });

  SHEET_EQUIP_SLOTS.forEach(slot => {
    const at = (field) => json[`armor${slot}${field}`];
    const name = sheetText(at('Name'));
    if (!name) return;
    const fields = {
      kind: EQUIP_ARMOR,
      type: sheetText(at('Type')),
      eva: at('Eva'),
      init: at('Init'),
      move: at('Move'),
      weight: at('Weight')
    };
    SHEET_DEFENCES.forEach(def => { fields[def.key] = at(def.sheet); });
    equipment.push({ name, note: '', fields });
  });

  for (let index = 1; index <= SHEET_MAX_ROWS; index += 1) {
    const at = (field) => json[`vehicle${index}${field}`];
    const name = sheetText(at('Name'));
    if (!name) continue;
    const fields = {
      kind: EQUIP_VEHICLE,
      acc: at('Acc'),
      atk: sheetText(at('Atk')),
      eva: at('Eva'),
      init: at('Init'),
      move: at('Move')
    };
    SHEET_DEFENCES.forEach(def => { fields[def.key] = at(def.sheet); });
    equipment.push({ name, note: sheetRichText(at('Note')), fields });
  }

  return normalizeSkillList(GCREST_EQUIPMENT_SPEC, equipment);
}

/**
 * 部隊。シートに部隊名の欄が無いので、種別（歩兵）を名前に置く。
 * MCはオフ・ポジションはFWで取り込む（マスコンバットが始まったら卓で決めるもの）。
 * 落ちるのは force1Lv（置き場が無い）。
 */
function readSheetUnit(json) {
  const type = sheetText(json.force1Type);
  const hasMods = SHEET_UNIT_MODS.some(mod => json[`force1${mod.sheet}`] !== undefined);
  if (!type && !hasMods) return null;

  const mods = {};
  SHEET_UNIT_MODS.forEach(mod => { mods[mod.key] = json[`force1${mod.sheet}`]; });
  return normalizeGcrestUnit({ mc: false, position: POSITION_FW, name: type, mods });
}

/**
 * 技能。固定23種はラベル一致でパラメータへ、「専門知識:考古学」のような自由記述は
 * 新しいパラメータとして足す。コロンの後ろが空の枠は未使用なので拾わない。
 */
function readSheetSkills(json) {
  const valueOverrides = {};
  const freeDefinitions = [];
  const freeCount = new Map();

  SHEET_SKILL_GROUPS.forEach(group => {
    for (let index = 1; index <= SHEET_MAX_SKILL_SLOTS; index += 1) {
      const label = sheetText(json[`skill${group}${index}Label`]);
      if (!label) continue;
      const level = json[`skill${group}${index}Lv`];

      const fixed = SHEET_SKILL_BY_LABEL.get(label);
      if (fixed) {
        assignSheetNumber(valueOverrides, fixed, level);
        continue;
      }

      // 「専門知識:考古学」。区切りは半角/全角のどちらでも来うる。
      const separator = label.search(/[:：]/);
      if (separator === -1) continue;
      const free = SHEET_FREE_BY_LABEL.get(label.slice(0, separator).trim());
      const name = label.slice(separator + 1).trim();
      if (!free || !name) continue;

      const next = (freeCount.get(free.prefix) ?? 0) + 1;
      freeCount.set(free.prefix, next);
      const value = Number(level);
      freeDefinitions.push({
        key: `${free.prefix}${next}`,
        label: `${free.label}：${name}`,
        value: Number.isFinite(value) ? Math.trunc(value) : SKILL_BASE_VALUE,
        editable: false,
        visible: false
      });
    }
  });

  // locked:false のまま作る（後から消せるように。buildFreeSkillParameter と同じ扱い）。
  return { valueOverrides, newParameters: buildParameters(SOURCE, freeDefinitions) };
}

/**
 * ゆとシートのJSONを取り込む。
 * @returns {{name?:string, valueOverrides:object, labelOverrides:object,
 *            newParameters:object, components:object} | null}
 */
export function importGcrestCharacterJson(json) {
  if (!looksLikeGcrestSheet(json)) return null;

  const skills = readSheetSkills(json);
  const valueOverrides = { ...skills.valueOverrides };

  assignSheetNumber(valueOverrides, HP_PARAM_ID, json.sttHpTotal);
  assignSheetNumber(valueOverrides, INITIATIVE_PARAM_ID, json.sttInitTotal);
  assignSheetNumber(valueOverrides, MP_PARAM_ID, json.sttMpTotal);
  assignSheetNumber(valueOverrides, LUCK_PARAM_ID, json.sttFateTotal);
  assignSheetNumber(valueOverrides, MOVE_PARAM_ID, json.sttMoveTotal);
  assignSheetNumber(valueOverrides, LOAD_MAX_PARAM_ID, json.sttMaxWeight);
  assignSheetNumber(valueOverrides, MORALE_PARAM_ID, json.force1Morale);

  SHEET_ABILITIES.forEach(ability => {
    assignSheetNumber(valueOverrides, paramId(ability.key), json[`stt${ability.sheet}CheckTotal`]);
  });

  // 防御力は装備込みの合計を持つ（armorTotal*）。装備一覧は内訳の記録で、
  // ここを計算し直さない（二重計上になるため）。
  SHEET_DEFENCES.forEach(def => {
    assignSheetNumber(valueOverrides, paramId(def.key), json[`armorTotal${def.sheet}`]);
  });

  // 攻撃力（GCREST:atk）は入れない。シートの weaponTotalAtk は「12+3D」という
  // ダイス式で、数値のパラメータには収まらない。武器側に文字列として持つ。

  const components = {
    [GCREST_ART_SPEC.componentKey]: readSheetArts(json),
    [GCREST_EQUIPMENT_SPEC.componentKey]: readSheetEquipment(json),
    [GCREST_ITEM_SPEC.componentKey]: readSheetItems(json)
  };

  const unit = readSheetUnit(json);
  if (unit) components[UNIT_COMPONENT_KEY] = unit;

  return {
    name: sheetText(json.characterName) || undefined,
    valueOverrides,
    labelOverrides: { [INITIATIVE_PARAM_ID]: INITIATIVE_LABEL },
    newParameters: skills.newParameters,
    components
  };
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
  importCharacterJson: importGcrestCharacterJson,

  // このシステム用のスタンプ（docs/plugin-guide.md 3.9）。宣言するのはデータだけで、
  // 画像URLはCoreが image/stamps/GCREST/<file> として組み立てる（フォルダ名はidそのまま）。
  stamps: [
    { id: 'chaos', label: '混沌', file: 'chaos.png' }
  ],

  bcdiceSystem: BCDICE_SYSTEM
};
