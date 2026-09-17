import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';
import { runDiceChange } from './dice-draft/dice-draft-pool.js';
import { createAppspotSheetSource, sheetText, assignSheetNumber } from './sheet-source.js';
import { canViewOwnerOnly } from '../visibility.js';
import {
  STARTING_ROOM_EXTENSION_MODEL, STARTING_ROOM_KEY, transformStellaKnightsRoll
} from './stella-knights-starting-room.js';
import { renderStartingRoomSection } from './stella-knights-starting-room-section.js';
import {
  applyStageRoundEvent, STAGE_EXTENSION_MODEL, STAGE_SET_PHASE_ID, STAGE_STEPS
} from './stella-knights-stage.js';
import { renderStageSection } from './stella-knights-stage-section.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
// charge(n) … n個振る。charge / charge() … 個数を書かない形で、チャットに
// {チャージダイス数}+{現在のラウンド} と書いたのと同じ個数を振る（readImplicitChargeCount）。
const CHARGE_COMMAND_PATTERN = /^charge(?:\(\s*(\d+)?\s*\))?$/i;
// このシステムが適用されていない部屋での案内（looksLikeOwnChatCommand）に使う形。
// かっこ付きだけを自分のものと見なす：裸の charge はただの英単語かもしれないので、
// 他システムの部屋で発言を横取りしない。
const CHARGE_COMMAND_HINT_PATTERN = /^charge\(\s*\d*\s*\)$/i;
// プチラッキー(a>b) … プールの目aを1個bへ変え、ブーケを |a-b|×3 払う。
// 区切りは全角の＞も受ける（dice.change と揃える）。
const PETIT_LUCKY_COMMAND_PATTERN = /^プチラッキー\(\s*(\d+)\s*[>＞]\s*(\d+)\s*\)$/;
const PETIT_LUCKY_COST_PER_STEP = 3;

// ダイス追加(n) / ダイス追加(n>コマ名) … ブーケを1個につき4払い、アタックダイス補正(DB)に
// +n のバフ（判定終了で消滅）を付ける。nは3個まで。払うのはコマンドを打ったコマで、
// 「>コマ名」を書くとバフだけがそのコマへ付く（下の runDiceAdd）。区切りは全角の＞も受ける。
// 名前は後ろの空白を落として完全一致で引く（チャットの「バフ>コマ名(...)」と同じ）。
const DICE_ADD_COMMAND_PATTERN = /^ダイス追加\(\s*(\d+)\s*(?:[>＞]\s*(.+?)\s*)?\)$/;
const DICE_ADD_COST_PER_DIE = 4;
const DICE_ADD_MAX_COUNT = 3;
const DICE_ADD_BUFF_NAME = 'ダイス追加';
// リロール … ブーケを一律5払うだけ（下の runReroll）。
// プールも出目も動かさないのは、卓が実際にどう振り直すかまでは決めないため
// （振り直した目をプールへ入れたいときはCore共通の dice.add / dice.change、charge を使う）。
// リロールは引数を取らないが、他のコマンドと揃えて「リロール()」の形も受ける。
const REROLL_COMMAND_PATTERN = /^リロール(?:\(\s*\))?$/;
const REROLL_COST = 5;
const SKILL_COMPONENT_KEY = 'stellaKnightsSkills';
const MAIN_TAB_ID = 'main';

const FACE_NUMBERS = [1, 2, 3, 4, 5, 6];
const FACE_LABELS = ['１', '２', '３', '４', '５', '６'];

// 「対応する数字」に入れると、1〜6のどの目でも置けるようになる印。シートの表記に
// 合わせて「0/7」と書くが、**0か7の目しか置けないという意味ではない**（d6に0も7も出ない）。
// 数字に見えて数字ではないので、判定はdice-draft-model.jsのanyValueが拾う。
const ANY_FACE_VALUE = '0/7';

// 「なし」は置かない。対応する数字が決まっていないスキルはダイスを1個も置けず、
// 選ぶ意味のある選択肢ではないため（そう保存された古いデータは空欄として出る）。
const NUMBER_OPTIONS = [
  ...FACE_NUMBERS.map(n => ({ value: String(n), label: String(n) })),
  { value: ANY_FACE_VALUE, label: ANY_FACE_VALUE }
];

const STELLA_KNIGHTS_SKILL_SPEC = createSkillSpec({
  id: 'stella-knights-skill',
  noun: 'スキル',
  componentKey: SKILL_COMPONENT_KEY,
  fields: [
    { key: 'type', label: '種別', type: 'text', className: 'effect-box-timing' },
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'number', label: '対応する数字', type: 'select', options: NUMBER_OPTIONS, className: 'effect-box-level' }
  ],
  periods: [{ key: 'scenario', label: 'シナリオ' }],
  // 修正値はほとんど使わないので、使用ログには効果（note）を出す。
  // 「修正値バフはありません」の断り書きも出なくなる（毎回出ると読みづらいだけ）。
  // 修正の欄自体は残してある（allowMods:falseにすると保存済みの修正まで捨てられる）。
  logNote: true,
  // このシステムは出目1〜6それぞれにスキルを持つのが基本形なので、まだ1件も登録が無いコマには
  // 6つの枠を最初から配る。利用者は名前と効果を埋めるだけでよく、ドラフトのパネルにも
  // 最初から6枠が並ぶ。
  //
  // 名前を空にできないのは、ダイスドラフトがスキル名をキーに置き場を持つため
  // （名無しが6つあると、どの枠に乗せたのか区別できない）。旧「Nの目」パラメータと
  // 同じ呼び名を仮に入れてあるので、そのまま使ってもよいし書き換えてもよい。
  defaultSkills: FACE_NUMBERS.map((n, index) => ({
    name: `${FACE_LABELS[index]}の目`,
    fields: { type: '', timing: '', number: String(n) }
  }))
});

// チャージで振った目は「ダイスドラフト」のプールへ入り、パネル（js/check-view/dice-draft-view.js）で
// スキルへドラッグして使う。スキルの「対応する数字」と同じ目だけが置け、置いた個数だけ使用できる
// ＝ requirement の kind:'match'。「対応する数字」が「0/7」のスキルだけは目を問わず、
// 1〜6どれでも置ける（anyValue）。数え方は同じで、1個で1回だ。
//
// かつては出目の在庫を face1..face6 というパラメータで数えていたが、ドラフトのプールが
// その役目を引き継いだので廃止した（このシステムはコマ固有のパラメータを持たない）。
// 移行用の「プールへ移す」ボタンも役目を終えたので消してある。
const STELLA_KNIGHTS_DRAFT_SPEC = createDiceDraftSpec({
  id: 'stella-knights-draft',
  label: '出目',
  diceSides: 6,
  bcdiceSystem: STELLA_KNIGHTS_BCDICE_SYSTEM,
  skillSpec: STELLA_KNIGHTS_SKILL_SPEC,
  requirement: { kind: 'match', valueField: 'number', anyValue: ANY_FACE_VALUE },
  // シースはドラフトを使わない。振る・dice.*・発動の入口とパネルがこれを見る
  unavailableReason: (token) => stellaKnightsDraftUnavailableReason(token),
  // NPCのスキルは持ち主以外には、名前を??にしたカードとダイスだけを見せる
  canViewSkillDetails: (token, participantId) => canViewStellaKnightsSkills(token, participantId)
});

// --- コマのパラメータ ---
// DB以外は手で増減させる値なので editable:true。locked:true は削除させないためと、
// 既にこのシステムで動いている部屋のコマにも後から補完させるため
// （js/parameters/registry.jsのwithMissingPluginParameters）。
//
// 防御力とチャージダイス数はシートに載っている値で、URLからの取り込みでも埋まる。
// チャージダイス数を visible:false にしてあるのは、卓の全員が常時見たい値ではなく
// 「charge(n) の n をいくつにするか」の控えだから。一覧には出ないが、更新画面では
// 直せるし、スキルの式からは {チャージダイス数} で読める。
//
// ブーケはプチラッキーのような能力の対価に払う持ち点。部屋が持つ「ブーケ合計」
// （下のルーム変数）とは別物で、あちらはブーケのスタンプが押された回数の集計、
// こちらは各コマの持ち点。paramIdもラベルも違うので、チャットの
// {ブーケ} / {ブーケ合計} も取り違えない。
//
// アタックダイス補正(DB)はバフ/デバフの受け取り口。手では動かさない（editable:false）し、
// 常に0の行が一覧に増えても邪魔なだけなので出さない（visible:false）。
// ダブルクロスの判定のように自動でダイス数へ足す仕組みは無く、卓がこの値を読んで振る
// （charge の個数にも足さない）。値は更新画面に読むだけの行で出す。
// キーが短いのはバフ()コマンドの都合。ラベルに「(」を含むパラメータはキー名で指定する仕様
// （js/main.jsのtryHandleBuffCommand）なので、「バフ(名前,DB,+1,判定)」と書ける
// （js/parameters/dracurouge.jsの目標値修正(TB)と同じ）。
const DEFENSE_PARAM_ID = 'STELLA_KNIGHTS:defense';
const CHARGE_PARAM_ID = 'STELLA_KNIGHTS:charge';
const BOUQUET_PARAM_ID = 'STELLA_KNIGHTS:bouquet';
const ATTACK_DICE_BONUS_PARAM_ID = 'STELLA_KNIGHTS:DB';

// 耐久力はCoreの既定パラメータ（HP）を流用し、ラベルだけ「耐久力」へ差し替える
// （renameHpToEndurance。js/parameters/dracurouge.jsの「存在点」と同じやり方）。
const HP_PARAM_ID = 'core:hp';
const HP_DEFAULT_LABEL = 'HP';
const ENDURANCE_LABEL = '耐久力';

// 個数を書かない charge の個数に足す、Coreのルーム変数「現在のラウンド」
// （js/parameters/core.jsのCORE_DEFAULT_ROOM_PARAMETERS）。値はCoreが維持する。
const ROUND_ROOM_PARAM_ID = 'core:round';

// --- 種別（ブリンガー / シース / NPC） ---
// 値は画面に出すのと同じ文字列で持つ（JSONに書き出したときにそのまま読める）。
// 知らない値・未設定はブリンガー＝種別が入る前の既存のコマと同じ扱い。
const CHAR_TYPE_BRINGER = 'ブリンガー';
const CHAR_TYPE_SHEATH = 'シース';
const CHAR_TYPE_NPC = 'NPC';
export const STELLA_KNIGHTS_CHAR_TYPES = [
  { value: CHAR_TYPE_BRINGER, label: 'ブリンガー' },
  { value: CHAR_TYPE_SHEATH, label: 'シース' },
  { value: CHAR_TYPE_NPC, label: 'NPC' }
];
const CHAR_TYPE_VALUES = new Set(STELLA_KNIGHTS_CHAR_TYPES.map(type => type.value));
const CHAR_TYPE_PARAM_ID = 'STELLA_KNIGHTS:charType';

// 種別はキャラクター一覧には出さない（visible:false）が、パネルのプルダウンから書き換えるので
// editable:trueが要る（editable:falseだとSET_PARAMETERがガードに弾かれる）。
const CHARACTER_PARAMETERS = [
  { key: 'charType', label: '種別', value: CHAR_TYPE_BRINGER, visible: false, locked: true, editable: true },
  { key: 'defense', label: '防御力', value: 0, visible: true, locked: true, editable: true },
  { key: 'charge', label: 'チャージダイス数', value: 0, visible: false, locked: true, editable: true },
  { key: 'bouquet', label: 'ブーケ', value: 0, visible: true, locked: true, editable: true },
  { key: 'DB', label: 'アタックダイス補正(DB)', value: 0, visible: false, locked: true, editable: false },
  // 手番順（buildRoundPhaseTemplateのturnOrderとskipWhenが読む受け皿）。種別から自動で決まるので
  // 手入力させない。Coreは数値の意味を知らず、小さい順に並べて0のコマを飛ばすだけ
  // （TURN_ORDER_BY_CHAR_TYPE参照）。自動計算の受け皿なのでlocked:trueが要る
  { key: 'turnOrder', label: '手番順', value: 2, visible: false, locked: true, editable: false }
];

export function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', CHARACTER_PARAMETERS);
}

/** @returns {'ブリンガー'|'シース'|'NPC'} */
export function readStellaKnightsCharType(parameters) {
  const value = parameters?.[CHAR_TYPE_PARAM_ID]?.value;
  return CHAR_TYPE_VALUES.has(value) ? value : CHAR_TYPE_BRINGER;
}

// パラメータの表示名の既定（コマ側にパラメータがまだ無いとき用の控え）
const PARAM_FALLBACK_LABELS = new Map(
  CHARACTER_PARAMETERS.map(def => [`STELLA_KNIGHTS:${def.key}`, def.label])
);

// 種別ごとに何を持つか。どれか1つだけ直すと画面はそれらしく動いてしまうので、
// 表どうしの食い違いは test/stella-knights-type.test.js で止める。
//   visibleParamIds  … キャラクター一覧へ出すこのプラグインのパラメータ（チャージは常に出さない）
//   inputParamIds    … 更新画面に並べる入力欄。並び順はシートの見出し（防御力・チャージダイス数）に合わせる
//   skills           … スキル一覧を持つか
//   dice             … ダイスドラフト（charge・プチラッキー・ダイス追加・リロール・dice.*）を使えるか
//   characterVisible … コマ自体をキャラクター一覧に出すか
//   hidesEndurance   … 耐久力（core:hp）の公開先を持ち主だけにするか
//   hidesSkills      … スキルの中身を持ち主以外に伏せるか
export const STELLA_KNIGHTS_TYPE_RULES = Object.freeze({
  [CHAR_TYPE_BRINGER]: Object.freeze({
    visibleParamIds: [DEFENSE_PARAM_ID, BOUQUET_PARAM_ID],
    inputParamIds: [DEFENSE_PARAM_ID, CHARGE_PARAM_ID, BOUQUET_PARAM_ID],
    skills: true, dice: true, characterVisible: true, hidesEndurance: false, hidesSkills: false
  }),
  // シースはこのシステム独自の能力を持たない（耐久力などCoreの値はそのまま）
  [CHAR_TYPE_SHEATH]: Object.freeze({
    visibleParamIds: [],
    inputParamIds: [],
    skills: false, dice: false, characterVisible: false, hidesEndurance: false, hidesSkills: false
  }),
  // 機能はブリンガーと同じ。卓の全員に見せないものだけが違う
  // （スキル使用のチャットログは伏せない。使った時点で卓に公開される扱い）
  [CHAR_TYPE_NPC]: Object.freeze({
    visibleParamIds: [DEFENSE_PARAM_ID],
    inputParamIds: [DEFENSE_PARAM_ID, CHARGE_PARAM_ID, BOUQUET_PARAM_ID],
    skills: true, dice: true, characterVisible: true, hidesEndurance: true, hidesSkills: true
  })
});

// 種別で一覧への出し入れが変わるパラメータ全部
const TYPED_VISIBLE_PARAM_IDS = [
  ...new Set(Object.values(STELLA_KNIGHTS_TYPE_RULES).flatMap(rule => rule.visibleParamIds))
];

function rulesOf(token) {
  return STELLA_KNIGHTS_TYPE_RULES[readStellaKnightsCharType(token?.parameters)];
}

// --- 手番順（ラウンド進行） ---
//
// ルールの並びは「エネミー（NPC）のアクション → ブリンガーのアクション」。段を2つに割らず、
// 1つの段のままこの数値の小さい順で並べる（ドラクルージュの「道」と同じ手口。
// docs/plugin-guide.md の 3.6）。同値はイニシアチブ降順で解けるので、ブリンガーどうしの
// 並びは行動値のまま。
//
// シースは手番を持たないので0を割り当て、テンプレートの skipWhen で手番の列から外す。
// Coreはこの数値が何を表すかを知らず、並べることと0を飛ばすことだけをする。
const TURN_ORDER_PARAM_ID = 'STELLA_KNIGHTS:turnOrder';
const TURN_ORDER_NONE = 0;
const TURN_ORDER_NPC = 1;
const TURN_ORDER_BRINGER = 2;
const TURN_ORDER_BY_CHAR_TYPE = Object.freeze({
  [CHAR_TYPE_NPC]: TURN_ORDER_NPC,
  [CHAR_TYPE_BRINGER]: TURN_ORDER_BRINGER,
  [CHAR_TYPE_SHEATH]: TURN_ORDER_NONE
});

// 「この段はブリンガーの手番にだけ出す」の宣言（Coreの steps の onlyWhen）。
// Coreはこの値が何を表すかを知らず、手番のコマの実効値と等しいかだけを見る。
const BRINGER_ONLY = Object.freeze({ paramId: TURN_ORDER_PARAM_ID, value: TURN_ORDER_BRINGER });

/**
 * 種別から手番順を導く。返すのは変えたいものだけ（Coreが差分として当てる）。
 * @param {object} parameters そのコマの全パラメータ（基礎値）
 */
function computeStellaKnightsDerivedParameters(parameters) {
  return {
    [TURN_ORDER_PARAM_ID]: TURN_ORDER_BY_CHAR_TYPE[readStellaKnightsCharType(parameters)]
  };
}

/**
 * ラウンド進行の段。ルールブックの「セット → チャージ判定 → アクション → カット」に合わせる。
 *
 * ・セット   … セットルーチンの発動（js/parameters/stella-knights-stage.js）。
 *              1ターンめのコマ配置もここで行う（卓の手順なので実装は持たない）
 * ・チャージ判定 … エネミーとブリンガーが charge を行う
 * ・アクション  … エネミー（NPC）→ ブリンガーの順に手番。ブリンガーの手番だけが
 *              予兆とアクション/EXルーチンを伴う（舞台側が種別を見て決める）
 * ・カット   … ラウンド終了。「ラウンド終了まで」のバフと始まりの部屋がここで切れる
 */
function buildStellaKnightsRoundPhaseTemplate() {
  return [
    {
      id: STAGE_SET_PHASE_ID, label: 'セット', kind: 'once',
      // 開示を押すまでセットルーチンは出ない（GMが読み上げる用意をしてから撃つため）
      steps: [
        { id: STAGE_STEPS.revealSet, label: 'セットルーチンを開示' },
        { id: STAGE_STEPS.setDone, label: '次へ進む' }
      ]
    },
    { id: 'charge', label: 'チャージ判定', kind: 'once' },
    {
      id: 'action', label: 'アクション', kind: 'perCharacter',
      turnOrder: { paramId: TURN_ORDER_PARAM_ID, direction: 'asc' },
      skipWhen: { paramId: TURN_ORDER_PARAM_ID, value: TURN_ORDER_NONE },
      // 【NPCは turnEnd の1段だけ】onlyWhen が付いていない段はその1つなので、
      // NPCの手番は「手番終了」を1回押して終わる（ブリンガーは5回）。
      // 「最後の当てはまる段が手番を終わらせる」という1つの規則で両方が出る。
      steps: [
        { id: STAGE_STEPS.omen, label: '予兆を開示', onlyWhen: BRINGER_ONLY },
        { id: STAGE_STEPS.actionStart, label: 'アクション開始', onlyWhen: BRINGER_ONLY },
        { id: STAGE_STEPS.turnEnd, label: '手番終了' },
        { id: STAGE_STEPS.routine, label: 'ルーチン発動', onlyWhen: BRINGER_ONLY },
        { id: STAGE_STEPS.actionEnd, label: 'アクション終了', onlyWhen: BRINGER_ONLY }
      ]
    },
    { id: 'cut', label: 'カット', kind: 'once', expirePhaseOnComplete: 'round' }
  ];
}

/**
 * 舞台へラウンド進行の節目を渡す。種別の判定はここで解いてから渡す
 * （stella-knights-stage.js が このファイルを読むと循環importになるため）。
 */
function applyStellaKnightsStageRoundEvent(value, event) {
  return applyStageRoundEvent(value, {
    ...event,
    isBringer: event?.actor
      ? readStellaKnightsCharType(event.actor.parameters) === CHAR_TYPE_BRINGER
      : false
  });
}

/**
 * 種別を切り替えたときに揃える、コマの見え方（js/character-dialog.jsのgetCharacterOverridesの形）。
 * 耐久力の公開先は、この時点の持ち主に固定する（持ち主が変わっても追従しない）。
 * 持ち主がいなければ全員に見せる（持ち主のいないコマは誰でも触れる規則に合わせる）。
 *
 * @param {string} charType
 * @param {string|null} ownerId 作成時は作成者、更新時はコマの持ち主
 */
export function buildStellaKnightsTypeOverrides(charType, ownerId) {
  const rule = STELLA_KNIGHTS_TYPE_RULES[charType] ?? STELLA_KNIGHTS_TYPE_RULES[CHAR_TYPE_BRINGER];
  return {
    visible: rule.characterVisible,
    parameterVisibility: Object.fromEntries(
      TYPED_VISIBLE_PARAM_IDS.map(id => [id, rule.visibleParamIds.includes(id)])
    ),
    parameterAudience: {
      [HP_PARAM_ID]: rule.hidesEndurance && ownerId ? [ownerId] : null
    }
  };
}

/** そのコマでダイスドラフト（とこのシステムのコマンド）を使えない理由。使えるならnull */
export function stellaKnightsDraftUnavailableReason(token) {
  return rulesOf(token).dice ? null : 'シースはチャージやスキルなどの能力を使えません。';
}

/** そのコマのスキルの中身を見てよいか（NPCは持ち主だけ。js/visibility.jsのcanViewOwnerOnly） */
export function canViewStellaKnightsSkills(token, participantId) {
  return !rulesOf(token).hidesSkills || canViewOwnerOnly(token, participantId);
}

// --- ブーケ合計（ルーム変数） ---
// この部屋でブーケのスタンプが押された回数の、参加者全員ぶんの合計。
// 数え札そのものはCoreが持っている（js/game-store.jsのstampCounts）ので、ここは
// 「どれを足すか」だけを決める。手入力させない（editable:false）のは自動計算値だから、
// 消させない（locked:true）のは、既にこのシステムで動いている部屋にも後から補完させるため
// （js/parameters/registry.jsのwithMissingPluginRoomParameters）。
const BOUQUET_STAMP_ID = 'STELLA_KNIGHTS:bouquet';
const BOUQUET_TOTAL_PARAM_ID = 'STELLA_KNIGHTS:bouquetTotal';

const ROOM_PARAMETERS = [
  { key: 'bouquetTotal', label: 'ブーケ合計', value: 0, locked: true, editable: false }
];

function buildStellaKnightsRoomParameters() {
  return buildParameters('STELLA_KNIGHTS', ROOM_PARAMETERS);
}

function computeStellaKnightsDerivedRoomParameters(parameters, context = {}) {
  const perParticipant = context.stampCounts?.[BOUQUET_STAMP_ID] ?? {};
  // 壊れた値（保存データを手で書き換えられた等）が混ざっていても合計を壊さない
  const total = Object.values(perParticipant)
    .reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0);

  return { [BOUQUET_TOTAL_PARAM_ID]: total };
}

function looksLikeStellaKnightsChatCommand(rawInput) {
  const input = String(rawInput).trim();
  // リロールは裸のchargeと同じ扱いで、かっこ付きの形だけを自分のものと見なす
  // （「リロール」の一言は他システムの部屋ではただの発言かもしれない）。
  return CHARGE_COMMAND_HINT_PATTERN.test(input)
    || PETIT_LUCKY_COMMAND_PATTERN.test(input)
    || DICE_ADD_COMMAND_PATTERN.test(input)
    || /^リロール\(\s*\)$/.test(input);
}

// componentsから正規形のスキル一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。
function readStellaKnightsSkills(components) {
  return normalizeSkillList(STELLA_KNIGHTS_SKILL_SPEC, components?.[SKILL_COMPONENT_KEY] ?? []);
}

// このシステムはHPを「耐久力」と呼ぶ。core:hpは配布を止められないので、ラベルだけ差し替えて流用する。
// ラベルがまだ既定の「HP」のときだけ動くのが冪等性の要（更新画面を開くたびにdispatchが飛ばない。
// 利用者が自分で別の名前に変えた場合も、その名前を尊重して触らない）。
// 改称した瞬間に開いているダイアログの左カラムは「HP」のまま残るが、閉じて開き直せば揃う
// （js/parameters/dracurouge.jsのrenameHpToExistenceと同じ割り切り）。
function renameHpToEndurance({ readParameters, dispatch, tokenId }) {
  const hp = readParameters()[HP_PARAM_ID];
  if (!hp || hp.label !== HP_DEFAULT_LABEL) return;

  // ラベルの差し替え口はIMPORT_CHARACTER_DATAのlabelOverridesしかない（SET_PARAMETERは値専用）
  dispatch('IMPORT_CHARACTER_DATA', {
    id: tokenId,
    labelOverrides: { [HP_PARAM_ID]: ENDURANCE_LABEL }
  });
}

function renderStellaKnightsCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents,
  dispatch, getToken, getEffectiveParameterValue, tokenId, myParticipantId = null
}) {
  container.innerHTML = '';

  const isEditing = mode === 'edit';
  const canWrite = isEditing && canEdit && typeof dispatch === 'function' && !!tokenId;
  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、都度最新を読む
  const readParameters = () => getToken?.()?.parameters ?? parameters;

  const title = document.createElement('h4');
  title.textContent = '銀剣のステラナイツ';
  title.style.margin = '0 0 8px 0';
  title.style.color = 'var(--text-emphasis)';
  container.appendChild(title);

  if (canWrite) {
    renameHpToEndurance({ readParameters, dispatch, tokenId });
    // 種別が入る前に作られたコマは、状態にまだ種別の値が無い。無いまま「更新」すると
    // applyCharacterEditResultが「持っていないパラメータ」として種別の保存を飛ばすので、
    // 開いた時点で既定（ブリンガー＝今の見え方）を書いて補っておく（SET_PARAMETERが宣言を補完する）。
    if (!readParameters()[CHAR_TYPE_PARAM_ID]) {
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: CHAR_TYPE_PARAM_ID, value: CHAR_TYPE_BRINGER });
    }
  }

  const makeRow = (parent, labelText) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';
    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    label.textContent = labelText;
    label.style.alignSelf = 'center';
    label.style.color = 'var(--text-body)';
    label.style.fontSize = '0.85rem';
    row.appendChild(label);
    parent.appendChild(row);
    return row;
  };

  // --- 種別 ---
  // 保存は「登録／更新」でまとめて行う（getValues）。見え方の切り替え（一覧への表示・耐久力の
  // 公開先）もgetCharacterOverridesで同じ時に渡すので、キャンセルすれば何も変わらない。
  const initialType = readStellaKnightsCharType(readParameters());
  let charType = initialType;

  const typeList = document.createElement('div');
  typeList.className = 'dialog-custom-list';
  container.appendChild(typeList);
  const typeSelect = document.createElement('select');
  STELLA_KNIGHTS_CHAR_TYPES.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    typeSelect.appendChild(option);
  });
  typeSelect.value = charType;
  typeSelect.disabled = !canEdit;
  makeRow(typeList, '種別').appendChild(typeSelect);

  // 種別で中身が変わるところ
  const typedArea = document.createElement('div');
  container.appendChild(typedArea);

  // getValues()が読む入力欄。描き直すたびに作り替える
  let rows = [];
  // まだ保存していない手入力を、種別を切り替えて行を作り直しても持ち越すための控え
  // （js/parameters/gcrest.jsのpendingValuesと同じ）
  const pendingValues = new Map();

  function renderTypedArea() {
    rows.forEach(({ paramId, input }) => pendingValues.set(paramId, input.value));
    typedArea.innerHTML = '';

    const rule = STELLA_KNIGHTS_TYPE_RULES[charType];
    const current = readParameters();

    if (rule.inputParamIds.length === 0 && !rule.skills) {
      const note = document.createElement('p');
      note.className = 'dialog-plugin-placeholder';
      note.textContent = 'シースは、このシステム独自の能力（防御力・チャージ・ブーケ・スキル）を持ちません。';
      typedArea.appendChild(note);
    }

    // 出目の在庫はダイスドラフトのプール（js/check-view/dice-draft-view.js）が持つので、
    // 並べるのはシートに載っている値と持ち点だけ。
    //
    // 【この欄が要る理由】プラグインが専用スペースを持つと、そのプラグイン由来のパラメータは
    // 更新画面の汎用一覧から外される（js/character-dialog.jsのpluginOwnsDisplay）。
    // ここに入力欄を出さないと、手で直せる場所がどこにも無くなる。
    const list = document.createElement('div');
    list.className = 'dialog-custom-list';
    typedArea.appendChild(list);

    rows = rule.inputParamIds.map(paramId => {
      // 一覧の見出しと食い違わないよう、コマが実際に持っているラベルを優先して読む
      const row = makeRow(list, current[paramId]?.label ?? PARAM_FALLBACK_LABELS.get(paramId) ?? paramId);

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.value = pendingValues.has(paramId)
        ? pendingValues.get(paramId)
        : (Number(current[paramId]?.value) || 0);
      input.disabled = !canEdit;
      row.appendChild(input);

      return { paramId, input };
    });

    // --- アタックダイス補正(DB)（読むだけ）---
    // 動かすのはバフ/デバフだけなので入力欄は出さない（getValuesにも入れない＝基礎値を潰さない）。
    // それでも今いくつ乗っているかは見えないと困るので、実効値を文字で出す
    // （js/parameters/dracurouge.jsの目標値修正(TB)と同じ見せ方）。能力を持たない種別には出さない。
    if (rule.dice) {
      const bonusRow = makeRow(list, current[ATTACK_DICE_BONUS_PARAM_ID]?.label
        ?? PARAM_FALLBACK_LABELS.get(ATTACK_DICE_BONUS_PARAM_ID));
      const bonusValue = document.createElement('span');
      bonusValue.style.alignSelf = 'center';
      bonusValue.style.color = 'var(--text-body-strong)';
      bonusValue.style.fontSize = '0.85rem';
      bonusValue.title = 'バフ/デバフで増減します。「ダイス追加(n)」でも付きます';
      const token = getToken?.() ?? null;
      const bonus = Number(token && getEffectiveParameterValue
        ? getEffectiveParameterValue(token, ATTACK_DICE_BONUS_PARAM_ID)
        : current[ATTACK_DICE_BONUS_PARAM_ID]?.value) || 0;
      bonusValue.textContent = `${bonus > 0 ? '+' : ''}${bonus}（バフ/デバフで増減）`;
      bonusRow.appendChild(bonusValue);
    }

    // NPCのスキルは持ち主以外にはボタンごと出さない（シノビガミの忍具と同じ。件数も伏せる）。
    // 判定はプルダウンで選んでいる種別で行う（保存前でも見え方を確かめられるように）
    const canSeeSkills = canViewStellaKnightsSkills({
      ownerId: getToken?.()?.ownerId ?? null,
      parameters: { [CHAR_TYPE_PARAM_ID]: { value: charType } }
    }, myParticipantId);
    if (rule.skills && canSeeSkills) renderSkillButton();
  }

  // スキル一覧（ボックス）。既存キャラクターの更新時のみ開ける
  // （新規作成時はまだcomponentsを持たないため対象外。js/parameters/dx3.jsのエフェクト欄と同じ扱い）。
  function renderSkillButton() {
    if (!isEditing || !onComponentChange) return;
    // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のcomponentsを読む
    // （getComponentsが無い場合のみ、開いた時点のスナップショットにフォールバック）。
    const readComponents = () => (getComponents ? getComponents() : components);
    const readSkills = () => readStellaKnightsSkills(readComponents());

    const skillBtn = document.createElement('button');
    skillBtn.type = 'button';
    skillBtn.className = 'dialog-add-row-btn';
    skillBtn.style.marginTop = '8px';

    const updateSkillBtnLabel = () => {
      skillBtn.textContent = `${STELLA_KNIGHTS_SKILL_SPEC.noun}一覧を開く（${readSkills().length}件）`;
    };
    updateSkillBtnLabel();

    skillBtn.addEventListener('click', () => {
      showSkillBox({
        spec: STELLA_KNIGHTS_SKILL_SPEC,
        skills: readSkills(),
        // 修正の対象に選べるパラメータと、式に書ける{パラメータ名}の検証・提示に使う
        parameters,
        readOnly: !canEdit,
        onSave: (nextSkills) => {
          onComponentChange(SKILL_COMPONENT_KEY, nextSkills);
          updateSkillBtnLabel();
        }
      });
    });
    typedArea.appendChild(skillBtn);
  }

  renderTypedArea();

  typeSelect.addEventListener('change', () => {
    charType = CHAR_TYPE_VALUES.has(typeSelect.value) ? typeSelect.value : CHAR_TYPE_BRINGER;
    renderTypedArea();
  });

  return {
    // 描いた行だけを返す（シースに切り替えても、持っている防御力などを0で潰さない）。
    // どれも0未満にはならない値なので、ここで下限を切っておく
    // （ブーケが負のままだとプチラッキーの残高の判定が意味を失う）。
    getValues: () => ({
      [CHAR_TYPE_PARAM_ID]: charType,
      ...Object.fromEntries(rows.map(({ paramId, input }) => [
        paramId, Math.max(0, Math.trunc(Number(input.value) || 0))
      ]))
    }),
    // 見え方を揃えるのは、このダイアログで種別を切り替えたときだけ。切り替えていなければ
    // 左側（Core）で利用者が決めた一覧への表示・公開先をそのまま通す。
    // 耐久力を「持ち主だけ」にするときの持ち主は、作成なら作成者、更新ならそのコマの持ち主。
    getCharacterOverrides: () => (charType === initialType ? {} : buildStellaKnightsTypeOverrides(
      charType, isEditing ? (getToken?.()?.ownerId ?? null) : myParticipantId
    ))
  };
}

// シナリオ終了時、スキルの使用回数（periods: scenario）を戻す
// （js/parameters/dx3.jsのresetDX3ComponentsOnPhaseEndと同型）。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetStellaKnightsComponentsOnPhaseEnd(components, phase) {
  const key = STELLA_KNIGHTS_SKILL_SPEC.componentKey;
  const skills = components?.[key];
  const nextSkills = resetSkillUsageOnPhaseEnd(STELLA_KNIGHTS_SKILL_SPEC, skills, phase);

  return nextSkills === skills ? components : { ...components, [key]: nextSkills };
}

// プチラッキー(a>b) … プールの目aを1個bへ変え、ブーケを |a-b|×3 払う。払えないなら使えない。
//
// 中身は共通の dice.change（runDiceChange）そのもので、足しているのは対価だけ。
// 【順番が要】状態を1つも変えないうちに「使えるかどうか」を決め切る。ブーケの残りを先に見て、
// 次に runDiceChange（目が足りなければ1個も変えずに失敗する）を通す。こうしておけば
// 「ブーケだけ減って目が変わらない」「目が変わったのに払っていない」が起きない。
function runPetitLucky(input, { token, dispatch }) {
  const match = input.match(PETIT_LUCKY_COMMAND_PATTERN);
  if (!match) return false;

  if (!token) {
    alert('キャラクターを選択してください。');
    return true;
  }

  const from = Number(match[1]);
  const to = Number(match[2]);
  const cost = Math.abs(from - to) * PETIT_LUCKY_COST_PER_STEP;

  // 読むのも書くのも基礎値。getEffectiveParameterValueの結果をSET_PARAMETERで書き戻すと
  // バフの分が基礎値へ混入して二重に効く（docs/plugin-guide.mdの7章）。
  const current = Number(token.parameters?.[BOUQUET_PARAM_ID]?.value) || 0;
  if (current - cost < 0) {
    alert(`ブーケが足りません（必要 ${cost} / 現在 ${current}）。`);
    return true;
  }

  // ログは下で1行だけ出すのでsilent。1回の操作でログが2行進むと、直前の結果が流れてしまう
  // （js/parameters/dice-draft/dice-draft-use.jsが消滅の知らせを畳んでいるのと同じ理由）。
  const changed = runDiceChange({
    spec: STELLA_KNIGHTS_DRAFT_SPEC,
    token,
    dispatch,
    from,
    to,
    count: 1,
    knownSkillNames: readStellaKnightsSkills(token.components).map(skill => skill.name),
    silent: true
  });
  // 目が足りなかった。理由はrunDiceChangeが伝えているので、ブーケは減らさずに終わる
  if (!changed.ok) return true;

  dispatch('SET_PARAMETER', {
    characterId: token.id, paramId: BOUQUET_PARAM_ID, value: current - cost
  });

  dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_TAB_ID,
    entry: {
      system: STELLA_KNIGHTS_DRAFT_SPEC.label,
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: input,
      resultText: `プチラッキー: ${from}の目 → ${to}の目\nブーケ -${cost}（${current} → ${current - cost}）`
    }
  });

  return true;
}

// ブーケの残高を確かめる。足りなければ理由を出してnull、足りれば今の残高を返す。
// 読むのも書くのも基礎値（runPetitLuckyと同じ理由。docs/plugin-guide.mdの7章）。
function readPayableBouquet(token, cost) {
  const current = Number(token.parameters?.[BOUQUET_PARAM_ID]?.value) || 0;
  if (current - cost < 0) {
    alert(`ブーケが足りません（必要 ${cost} / 現在 ${current}）。`);
    return null;
  }
  return current;
}

function logBouquetSpend(dispatch, token, input, lines) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_TAB_ID,
    entry: {
      system: STELLA_KNIGHTS_DRAFT_SPEC.label,
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: input,
      resultText: lines.join('\n')
    }
  });
}

/**
 * ダイス追加(n) / ダイス追加(n>コマ名)。ブーケを1個につき4払い、アタックダイス補正(DB)へ
 * +n のバフ（判定終了で消滅）を付ける。払うのは打ったコマ、バフが付くのは名前を書けばそのコマ。
 *
 * DBは自動でダイス数へ足されない。卓がこの値を読んでアタック判定を振り、そのロールで
 * このバフは剥がれる（js/main.jsの「判定終了で消滅」バフの剥がし）。
 *
 * 【順番が要】状態を1つも変えないうちに断る理由を全部見る（個数・対象・シース・残高）。
 * 途中で断ると「ブーケだけ減ってバフが付かない」が起きる。
 *
 * @returns {boolean} このコマンドとして処理したか（書式が違えばfalse）
 */
function runDiceAdd(input, { token, dispatch, findTokenByName, generateBuffId }) {
  const match = input.match(DICE_ADD_COMMAND_PATTERN);
  if (!match) return false;

  if (!token) {
    alert('キャラクターを選択してください。');
    return true;
  }

  const count = Number(match[1]);
  if (count < 1 || count > DICE_ADD_MAX_COUNT) {
    alert(`ダイス追加の個数は 1〜${DICE_ADD_MAX_COUNT} で指定してください。`);
    return true;
  }

  const targetName = match[2];
  let target = token;
  if (targetName !== undefined) {
    if (typeof findTokenByName !== 'function') {
      alert('この画面では他のコマを指定できません。部屋の中で実行してください。');
      return true;
    }
    target = findTokenByName(targetName);
    if (!target) {
      alert(`コマ「${targetName}」が見つかりません。`);
      return true;
    }
  }

  // シースは能力を持たないので、DBのバフも受け取れない（打ったコマのシースはハンドラの頭で断っている）
  if (!rulesOf(target).dice) {
    alert(`${target.name}はシースなので、ダイス追加のバフを付けられません。`);
    return true;
  }
  if (typeof generateBuffId !== 'function') {
    alert('この画面ではバフを付けられません。部屋の中で実行してください。');
    return true;
  }

  const cost = count * DICE_ADD_COST_PER_DIE;
  const current = readPayableBouquet(token, cost);
  if (current === null) return true;

  dispatch('SET_PARAMETER', {
    characterId: token.id, paramId: BOUQUET_PARAM_ID, value: current - cost
  });

  // DBが入る前に作られたコマは、状態にまだDBの値を持たない（宣言からの補完は、パラメータが
  // 何か動いたときに初めて走る）。持たないままバフを付けても実効値が読めないので、先に補わせる。
  // IMPORT_CHARACTER_DATAは中身を渡さなければ、宣言の補完と自動計算だけを通す。
  if (!target.parameters?.[ATTACK_DICE_BONUS_PARAM_ID]) {
    dispatch('IMPORT_CHARACTER_DATA', { id: target.id });
  }

  dispatch('ADD_BUFF', {
    tokenId: target.id,
    id: generateBuffId(),
    name: DICE_ADD_BUFF_NAME,
    paramId: ATTACK_DICE_BONUS_PARAM_ID,
    delta: count,
    expirePhase: 'check'
  });

  // 誰に付いたかは、自分に付けたときも書く（「>コマ名」を書き忘れたのに気づけるように）
  logBouquetSpend(dispatch, token, input, [
    `ダイス追加: ${count}個 → ${target.name}のアタックダイス補正(DB) +${count}（判定終了で消滅）`,
    `ブーケ -${cost}（${current} → ${current - cost}）`
  ]);

  return true;
}

/**
 * リロール。ブーケを払うだけで、プールにも出目にも触れない
 * （実際に振り直すのは卓の運用に任せる。必要なら charge / dice.add / dice.change）。
 *
 * @returns {boolean} このコマンドとして処理したか（書式が違えばfalse）
 */
function runReroll(input, { token, dispatch }) {
  if (!REROLL_COMMAND_PATTERN.test(input)) return false;

  if (!token) {
    alert('キャラクターを選択してください。');
    return true;
  }

  const current = readPayableBouquet(token, REROLL_COST);
  if (current === null) return true;

  dispatch('SET_PARAMETER', {
    characterId: token.id, paramId: BOUQUET_PARAM_ID, value: current - REROLL_COST
  });
  logBouquetSpend(dispatch, token, input, [
    'リロール',
    `ブーケ -${REROLL_COST}（${current} → ${current - REROLL_COST}）`
  ]);

  return true;
}

// 個数を書かない charge / charge() の個数。チャットへ {チャージダイス数}+{現在のラウンド} と
// 書いたのと同じ値にする。チャージダイス数はバフ込みの実効値（{}参照と揃えるため）、
// 現在のラウンドはCoreのルーム変数で、ラウンド進行中でなければ0＝シートの値そのままになる。
function readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue) {
  if (!token) return 0;

  const charge = getEffectiveParameterValue
    ? Number(getEffectiveParameterValue(token, CHARGE_PARAM_ID))
    : Number(token.parameters?.[CHARGE_PARAM_ID]?.value);
  const round = Number(roomParameters?.[ROUND_ROOM_PARAM_ID]?.value);

  return (Number.isFinite(charge) ? charge : 0) + (Number.isFinite(round) ? round : 0);
}

// チャージ。振った目はダイスドラフトのプールへ入る。
// 個数の検証・コマ未選択・ダイスを振れない画面の案内は runDiceDraftRoll がまとめて行うので、
// ここは書式の判定と、個数を書かない形の個数を決めることだけをする。
function handleStellaKnightsChatCommand(
  rawInput, {
    token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters, findTokenByName, generateBuffId
  }
) {
  const input = String(rawInput).trim();

  // シースはこのシステムの能力を持たない。書式が合ったものだけ断る（合わなければ素通しして、
  // Coreにただの発言・ダイスとして扱わせる）
  const isOwnCommand = CHARGE_COMMAND_PATTERN.test(input) || PETIT_LUCKY_COMMAND_PATTERN.test(input)
    || DICE_ADD_COMMAND_PATTERN.test(input) || REROLL_COMMAND_PATTERN.test(input);
  const unavailable = isOwnCommand && token ? stellaKnightsDraftUnavailableReason(token) : null;
  if (unavailable) {
    alert(unavailable);
    return true;
  }

  if (runPetitLucky(input, { token, dispatch })) return true;
  if (runDiceAdd(input, { token, dispatch, findTokenByName, generateBuffId })) return true;
  if (runReroll(input, { token, dispatch })) return true;

  const match = input.match(CHARGE_COMMAND_PATTERN);
  if (!match) return false;

  runDiceDraftRoll({
    spec: STELLA_KNIGHTS_DRAFT_SPEC,
    token,
    dispatch,
    rollBCDice,
    count: match[1] !== undefined
      ? Number(match[1])
      : readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue),
    knownSkillNames: readStellaKnightsSkills(token?.components).map(skill => skill.name),
    chatCommand: input
  });

  // 書式が合った時点で必ずtrueを返す（falseだとCoreがただのダイスコマンドとして再解釈する）
  return true;
}

// ------------------------------------------------------------------
// キャラクターシートの取り込み
// ------------------------------------------------------------------
// 対象はWebキャラクターシート（character-sheets.appspot.com）の銀剣のステラナイツ用シートが
// 返すJSON。ファイルから読ませる道（盤面の「JSONを読み込む」）と、URLから取る道
// （js/character-sheet-import.js）の両方がこの関数に合流する。
//
// シートにあってこのアプリが持っていない項目（花章・願い・あなたの物語などの設定欄、
// パートナー、歪みの共鳴、勲章）は取り込まない。パラメータ化していないものを隠しパラメータ
// として持たせても、画面のどこにも出ず、書き出したJSONだけが太るため。

// URLから取り込むときの受け付け先（受け付ける形と取得先の組み立ては js/parameters/sheet-source.js）。
//
// 【秘匿欄】シートは騎士の種別がエンブレイス/エクリプスだと、ステータス（耐久力・防御力・
// チャージダイス数）と隠したスキルを公開JSONから外し、閲覧パスワードの奥へ移して保存する。
// 公開JSONに status が無ければ、サーバーが空のパスワードで取りに行き json.secret に付けてくる
// （server/index.jsのfetchSheetSecret）。パスワードが設定されていれば取れない。
export const STELLA_KNIGHTS_SHEET_SOURCE = createAppspotSheetSource({
  label: '銀剣のステラナイツ',
  pathSegment: 'stellar',
  secret: {
    isNeeded: (publicData) => publicData?.status === undefined,
    missingNotice: 'このシートは閲覧パスワードが設定されているため、耐久力・防御力・チャージダイス数と'
      + '隠したスキルは取り込めませんでした。\n取り込んだ後、更新画面で入力してください。'
  }
});

// スキル行の位置（0始まり）から「対応する数字」を決める。シートのNo列（No.1〜）は行番号だが、
// このシステムでは行番号がそのまま出目になる。7行目以降は出目に対応しないので、
// どの目でも置ける「0/7」にする。
function skillNumberForRow(index) {
  return index < FACE_NUMBERS.length ? String(FACE_NUMBERS[index]) : ANY_FACE_VALUE;
}

// スキル一覧。シートの列（名前・種別・タイミング・効果）はこのプラグインのスキルと
// 素直に1対1で対応し、「対応する数字」は行の位置から決める（skillNumberForRow）。
//
// 秘匿欄（json.secret.skills）が取れていればそちらを読む。公開側では隠したスキルが
// 空の行 {} に置き換わっているため。
//
// 【番号は空行を除く前に振る】隠したスキルや空の行を先に除くと、後ろの行の番号が繰り上がり、
// 出目がずれる。
//
// シートのスキルが0件なら、normalizeSkillListが既定の6枠（１の目〜６の目）を配る。
// 空のシートを取り込んで枠まで消える、ということにはならない。
function importStellaKnightsSkillsFromSheet(json) {
  const secretList = json?.secret?.skills;
  const rawList = Array.isArray(secretList) ? secretList
    : Array.isArray(json?.skills) ? json.skills : [];

  return normalizeSkillList(STELLA_KNIGHTS_SKILL_SPEC, rawList
    .map((raw, index) => ({
      name: sheetText(raw?.name),
      note: sheetText(raw?.effect),
      fields: {
        type: sheetText(raw?.type),
        timing: sheetText(raw?.timing),
        number: skillNumberForRow(index)
      }
    }))
    // シートは空の行を1つ持って返してくる。名前の無い行は取り込まない
    .filter(skill => skill.name !== ''));
}

/**
 * Webキャラクターシート（銀剣のステラナイツ）のJSONを取り込む。
 * @param {any} json
 * @returns {{name?:string, valueOverrides:object, labelOverrides:object,
 *            newParameters:object, components:object} | null}
 */
export function importStellaKnightsCharacterJson(json) {
  if (!json || typeof json !== 'object') return null;

  // ステラナイツのシートらしさの確認。他システムのシートを黙って空のコマとして
  // 取り込んでしまわないよう、このシステム特有のキーが1つも無ければ断る。
  // baseやpartnerは他システムのシートも持つので数えない。
  const looksLikeSheet = ['status', 'skills', 'skillshead', 'sheath']
    .some(key => json[key] !== undefined);
  if (!looksLikeSheet) return null;

  // 耐久力はCoreのHPへ入れる。防御力とチャージダイス数はこのプラグインのパラメータ。
  // エンブレイス/エクリプスのステータスは秘匿欄にしか無い（STELLA_KNIGHTS_SHEET_SOURCEの説明）。
  const status = json?.secret?.status ?? json?.status;
  const valueOverrides = {};
  assignSheetNumber(valueOverrides, HP_PARAM_ID, status?.hp);
  assignSheetNumber(valueOverrides, DEFENSE_PARAM_ID, status?.defense);
  assignSheetNumber(valueOverrides, CHARGE_PARAM_ID, status?.charge);

  const name = sheetText(json?.base?.name);

  return {
    name: name === '' ? undefined : name,
    valueOverrides,
    // シートの見出しに合わせてHPを耐久力と呼ぶ（js/parameters/gcrest.jsが行動値を入れているのと同じ）
    labelOverrides: { [HP_PARAM_ID]: ENDURANCE_LABEL },
    newParameters: {},
    components: {
      [SKILL_COMPONENT_KEY]: importStellaKnightsSkillsFromSheet(json)
    }
  };
}

export const STELLA_KNIGHTS_PLUGIN = {
  id: 'STELLA_KNIGHTS',
  label: '銀剣のステラナイツ',
  // 出目の在庫はダイスドラフトのプールが持つので、コマ固有のパラメータは
  // 種別・防御力・チャージダイス数・ブーケ（持ち点）と、自動計算の2つ（DB・手番順）
  buildCharacterParameters: buildStellaKnightsCharacterParameters,
  buildRoomParameters: buildStellaKnightsRoomParameters,
  computeDerivedParameters: computeStellaKnightsDerivedParameters,
  computeDerivedRoomParameters: computeStellaKnightsDerivedRoomParameters,
  // ラウンド進行（セット → チャージ判定 → アクション → カット）
  buildRoundPhaseTemplate: buildStellaKnightsRoundPhaseTemplate,
  renderCharacterPanel: renderStellaKnightsCharacterPanel,
  importCharacterJson: importStellaKnightsCharacterJson,
  characterSheetSource: STELLA_KNIGHTS_SHEET_SOURCE,
  handleChatCommand: handleStellaKnightsChatCommand,
  looksLikeOwnChatCommand: looksLikeStellaKnightsChatCommand,
  resetComponentsOnPhaseEnd: resetStellaKnightsComponentsOnPhaseEnd,
  diceDraft: STELLA_KNIGHTS_DRAFT_SPEC,
  // 「⋯」→「拡張ルーム設定」に出す、部屋全体に掛かる効果。
  // 始まりの部屋：振ったd6の目aをbとして扱う（ラウンド終了まで。js/parameters/stella-knights-starting-room.js）
  roomExtensions: [
    { ...STARTING_ROOM_EXTENSION_MODEL, renderSection: renderStartingRoomSection },
    // 舞台：シナリオ側の仕掛けをラウンド進行に合わせて流す（GMだけに出る）。
    // js/parameters/stella-knights-stage.js
    {
      ...STAGE_EXTENSION_MODEL,
      renderSection: renderStageSection,
      applyRoundEvent: applyStellaKnightsStageRoundEvent
    }
  ],
  // 部屋の中で振ったダイスの結果に、始まりの部屋を当てる（js/room-roll.js から呼ばれる）
  transformRollResult: ({ command, result, extensions }) => transformStellaKnightsRoll({
    command, result, rules: extensions[STARTING_ROOM_KEY]?.rules ?? []
  }),
  stamps: [
    {id:`bouquet`, label : `ブーケ`,file:`bouquet.png`}
  ],
  bcdiceSystem:STELLA_KNIGHTS_BCDICE_SYSTEM
};
