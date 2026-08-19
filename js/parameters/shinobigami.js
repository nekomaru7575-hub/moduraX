// js/parameters/shinobigami.js
// シノビガミのプラグイン記述子。今回は「特技表」だけを載せた最小構成で、
// 忍法・奥義・生命力・感情などは後続で足す。
//
// 特技表そのものの仕組み（データモデル・距離計算・UI・判定の実行）は
// js/parameters/saikoro-fiction/ の共通モジュールが持ち、ここは
// シノビガミ固有の値（特技データ・BCDiceのシステムID・目標値の基準5）を渡すだけ。
// インセイン等を追加する場合も、同じ形で自分の特技データを渡せばよい。

import {
  createSkillTableSpec, normalizeSkillTableState, findCellIdByName, countRemainingSlots,
  makeCellId, getCell
} from './saikoro-fiction/skill-table.js';
import {
  createSkillSpec, createListSpec, createItemSpec, normalizeSkillList, findSkillByName,
  resetSkillUsageOnPhaseEnd, buildSkillUseCommandPattern, isFieldAvailable
} from './skill/skill-model.js';
import { runSkillUse } from './skill/skill-use.js';
import { showSkillBox } from './skill/skill-box.js';
import {
  OUGI_COMPONENT_KEY, showOugiBox, listVisibleOugi, customizationSideLabel
} from './shinobigami-ougi-box.js';
import { buildParameters } from './paramFactory.js';
import { showSkillTableBox } from './saikoro-fiction/skill-table-box.js';
import { runSkillCheck, SKILL_CHECK_COMMAND_PATTERN } from './saikoro-fiction/skill-check.js';
import { SHINOBIGAMI_COLUMNS, SHINOBIGAMI_ROWS, SHINOBIGAMI_SKILL_CELLS } from './shinobigami-skills.js';

// キャラクターの components に特技表を保存するときのキー。
const SKILL_TABLE_COMPONENT_KEY = 'skillTable';

// 部屋のBCDiceシステム（room.bcdiceSystem）とは別軸。特技判定は常にこのシステムで振る。
const SHINOBIGAMI_BCDICE_SYSTEM = 'ShinobiGami';

// BCDiceのシノビガミ行為判定コマンド `nSG@s#f>=x` に渡す値。目標値(x)だけは特技表の
// 距離計算から決まるのでここには無い。
//   n: ダイス数（省略時2。1以下はBCDiceがunsupportedを返すので下限2）
//   s: スペシャル値（省略時12。13にすればスペシャルは出ない）
//   f: ファンブル値（省略時2。0にすればファンブルは出ない）
//
// これは入力欄ではない。既定値（修正が何も無いときの値）と、修正を足した後に丸める
// 上下限で、修正がどれだけ振り切れてもBCDiceが受け付けない値にならないようにする。
const SHINOBIGAMI_CHECK_OPTIONS = [
  { key: 'diceCount', label: 'ダイス数', default: 2, min: 2, max: 10 },
  { key: 'specialValue', label: 'スペシャル値', default: 12, min: 2, max: 13 },
  { key: 'fumbleValue', label: 'ファンブル値', default: 2, min: 0, max: 12 }
];

// 特技表のボックスに並べる修正値の入力欄。値はコマのパラメータそのもので、入力すると
// そこへ書き戻る（＝閉じても残り、他の参加者にも同期される）。忍法が修正を自動で
// 乗せなくなった（SHINOBIGAMI_NINPOU_SPECのallowMods:false）ぶん、卓が手で入れる場所が要る。
//
// 上下限を±12にしてあるのは、ここで細かく縛っても意味が無いため：足した後の値は
// SHINOBIGAMI_CHECK_OPTIONSの範囲へ丸められるので、判定コマンドが壊れることはない。
const SHINOBIGAMI_CHECK_MODIFIERS = [
  { key: 'AdB', label: 'ダイス数', paramId: 'SHINOBIGAMI:AdB', min: -12, max: 12 },
  { key: 'AnB', label: '判定値', paramId: 'SHINOBIGAMI:AnB', min: -12, max: 12 },
  { key: 'SB', label: 'スペシャル値', paramId: 'SHINOBIGAMI:SB', min: -12, max: 12 },
  { key: 'FB', label: 'ファンブル値', paramId: 'SHINOBIGAMI:FB', min: -12, max: 12 }
];

// 既定値と同じ項目は書かず最短形にする（`SG>=7` / `3SG@11#3>=7` など、いずれもBCDiceの
// ドキュメントにある書式）。BCDiceは結果テキスト側で `(SG@12#2>=7)` と展開して返すため、
// 省略しても卓からは実際に使われた値が見える。
function buildShinobigamiCheckCommand({ options, targetNumber }) {
  const dice = options.diceCount === 2 ? '' : String(options.diceCount);
  const special = options.specialValue === 12 ? '' : `@${options.specialValue}`;
  const fumble = options.fumbleValue === 2 ? '' : `#${options.fumbleValue}`;
  return `${dice}SG${special}${fumble}>=${targetNumber}`;
}

// スペシャル値・ファンブル値の基準と丸め幅。パラメータの初期値と判定時の丸めの両方で使う。
const SPECIAL_DEFAULT = 12;
const SPECIAL_MAX = 13;   // 13にするとスペシャルは出ない
const FUMBLE_FLOOR = 2;   // 平常時のファンブル値。戦闘中はプロットがこれを上回れば置き換わる

/**
 * キャラクターの修正値を判定へ反映する（js/parameters/saikoro-fiction/skill-check.js の
 * resolveCheckAdjustments から呼ばれる）。
 *
 *   ダイス数     = 2               + ダイス数修正(AdB)
 *   ファンブル値 = {F}             + ファンブル値修正(FB)
 *   スペシャル値 = {S}             + スペシャル値修正(SB)   → ファンブル値+1〜13へ丸める
 *   目標値       = 特技表が出した値 − 判定値修正(AnB)
 *
 * 修正値（AdB/AnB/SB/FB）はどれもコマのパラメータで、特技表ボックスの入力欄から直接
 * 書き換えられる。getParamが返すのはバフ込みの実効値なので、卓が手で入れた分と
 * バフ（GMの「バフ」コマンド等）が両方ここへ乗る。
 *
 * 【AnBを目標値から引く理由】BCDiceのシノビガミ行為判定（nSG@s#f>=x）には固定値修正の
 * 書式が無い。仮に出目へ足せたとしても、スペシャル/ファンブルは出目の合計で決まるため、
 * 合計を動かすとそちらの判定までずれる。目標値を下げれば成否は同じで、
 * スペシャル/ファンブルは素の出目のまま保たれる。
 */
function resolveShinobigamiCheck({ options, targetNumber, getParam }) {
  const adb = getParam('SHINOBIGAMI:AdB');
  const anb = getParam('SHINOBIGAMI:AnB');
  const sb = getParam('SHINOBIGAMI:SB');
  const fb = getParam('SHINOBIGAMI:FB');
  const fumbleBase = getParam('SHINOBIGAMI:F') || FUMBLE_FLOOR;
  const specialBase = getParam('SHINOBIGAMI:S') || SPECIAL_DEFAULT;

  // ダイス数の素の値だけはSHINOBIGAMI_CHECK_OPTIONSの既定（2）を使う。
  // スペシャル値・ファンブル値の素の値はコマの側（{S}/{F}）が持つ。
  const diceCount = options.diceCount + adb;
  const fumbleValue = fumbleBase + fb;
  const specialValue = Math.min(
    SPECIAL_MAX,
    Math.max(fumbleValue + 1, specialBase + sb)
  );

  // 何が効いたかをログへ添える。0の修正は書かない（毎回並ぶと読みにくいだけのため）。
  const notes = [];
  const sign = value => (value > 0 ? `+${value}` : String(value));
  if (adb) notes.push(`ダイス数${sign(adb)}(AdB)`);
  if (anb) notes.push(`判定値${sign(anb)}(AnB)`);
  if (sb) notes.push(`スペシャル値${sign(sb)}(SB)`);
  if (fb) notes.push(`ファンブル値${sign(fb)}(FB)`);
  // プロットで上がったファンブル値は修正ではないが、卓が一番気にする値なので出す
  if (fumbleBase > FUMBLE_FLOOR) notes.push(`ファンブル値${fumbleBase}(プロット)`);

  return {
    options: { diceCount, specialValue, fumbleValue },
    targetNumber: targetNumber - anb,
    notes
  };
}

const SHINOBIGAMI_SKILL_TABLE = createSkillTableSpec({
  id: 'shinobigami',
  columns: SHINOBIGAMI_COLUMNS,
  rows: SHINOBIGAMI_ROWS,
  cells: SHINOBIGAMI_SKILL_CELLS,
  // 左右を繋ぐかはキャラクターごとに切り替える（表のボックスのチェックボックス）。
  // ここはその初期値で、既定どおり繋がない状態から始める。
  cyclic: false,
  gapFillable: true,  // ギャップは塗りつぶすことができる
  baseTarget: 5,      // 2D6 >= 5 + 距離
  check: {
    options: SHINOBIGAMI_CHECK_OPTIONS,
    modifiers: SHINOBIGAMI_CHECK_MODIFIERS,
    buildCommand: buildShinobigamiCheckCommand,
    resolve: resolveShinobigamiCheck
  },
  // 生命力。分野ごとに1つずつ枠があり、失うとその分野の特技が使えなくなる。
  // 追加生命力は忍法や背景で増える分で、個数はキャラクターごとに決まる。
  // 枠の仕組み自体は汎用側（saikoro-fiction/skill-table.js）が持っていて、
  // ここでは呼び名と「失うと分野が死ぬ」ことだけを宣言する。
  slots: {
    column: { label: '生命力', disablesColumn: true },
    extra: { label: '追加生命力', max: 12 }
  }
});

// キャラクターのパラメータ。自動算出される値は手入力させない（editable:false）。
// locked:trueにしているのは削除させないためと、プラグイン導入前に作られたコマにも
// 後から補完させるため（js/parameters/registry.jsのwithMissingPluginParameters）。
//
// keyを略称そのものにしているのは、忍法の式に {AdB} や {F} と書けるようにするため
// （js/parameters/skill/skill-formula.js がラベルまたはkeyで引く。DX3と同じ手）。
// バフ/パラメータ変更コマンド（js/main.js）もkey一致で対象を特定できる。
const SHINOBIGAMI_CHARACTER_PARAMETERS = [
  {
    key: 'life', label: '生命力',
    value: SHINOBIGAMI_COLUMNS.length, // 満タン＝分野の数（追加生命力は初期0）
    locked: true, editable: false, visible: true
  },

  // 判定へ効く修正を受け取る4つのレジスタ。忍法からは自動で乗らない
  // （下のSHINOBIGAMI_NINPOU_SPECのallowMods:false）ので、値を入れるのは特技表ボックスの
  // 修正値欄（SHINOBIGAMI_CHECK_MODIFIERS）と、GMが打つバフコマンド。
  //
  // editable:trueなのは、その入力欄がSET_PARAMETERで書き戻すため
  // （js/game-store.jsのwithEditableParamFieldsがeditable:falseを弾く）。
  // visible:falseなのは変えない：一覧に並べる値ではなく、判定するときに見れば足りる。
  { key: 'AdB', label: 'ダイス数修正(AdB)', value: 0, locked: true, editable: true, visible: false },
  { key: 'AnB', label: '判定値修正(AnB)', value: 0, locked: true, editable: true, visible: false },
  { key: 'SB', label: 'スペシャル値修正(SB)', value: 0, locked: true, editable: true, visible: false },
  { key: 'FB', label: 'ファンブル値修正(FB)', value: 0, locked: true, editable: true, visible: false },

  // 自動計算される判定の基準値。修正（SB/FB）を足して丸めるのは判定を組み立てるとき
  // （buildShinobigamiCheckCommand）で、ここは素の基準値だけを持つ。
  { key: 'F', label: 'ファンブル値({F})', value: FUMBLE_FLOOR, locked: true, editable: false, visible: false },
  { key: 'S', label: 'スペシャル値({S})', value: SPECIAL_DEFAULT, locked: true, editable: false, visible: false },

  // ラウンド進行の事実をパラメータへ写したもの。Coreはこれを自動計算のcontextとしてしか
  // 渡してこない（js/game-store.jsのbuildDerivedContext）ので、チャットコマンドの処理から
  // 見るにはパラメータを経由するしかない。忍法の式・使用条件からも {プロット} {ラウンド}
  // として参照できる。どちらも戦闘中でなければ0。
  { key: 'plot', label: 'プロット', value: 0, locked: true, editable: false, visible: false },
  { key: 'round', label: 'ラウンド', value: 0, locked: true, editable: false, visible: false },

  // このラウンドに使った忍法のコストの合計。プロット値を超える使い方はできない
  // （handleNinpouUseCommand）。値そのものはcomponents側が持ち、これはその写し。
  // 残り枠を数えるのは卓の仕事なので、これだけは表示する。
  // ラベルが4文字なのは、キャラクター一覧のラベル欄（character-param-label）が56pxで、
  // 5文字だと「使用コス…」と切れるため。忍法の「コスト」欄と同じ名前にしないのは、
  // 式の中の {コスト} が忍法自身の欄を指す（js/parameters/skill/skill-formula.js）ため。
  // roundOnly: 戦闘中でなければ常に0の値なので、平常時は一覧に出さない。
  {
    key: 'usedCost', label: 'コスト計', value: 0,
    locked: true, editable: false, visible: true, roundOnly: true
  }
];

function buildShinobigamiCharacterParameters() {
  return buildParameters('SHINOBIGAMI', SHINOBIGAMI_CHARACTER_PARAMETERS);
}

/**
 * このコマのプロット値。戦闘中（ラウンド進行中）で、公開済みの提出がある場合だけ1〜6。
 * それ以外（平常時・未提出・公開前）は0。
 *
 * contextはCoreが渡すラウンドの事実（js/game-store.jsのbuildDerivedContext）。
 * 公開前のプロットはCore側でnullに落とされて届かないので、ここでは
 * 「値が来ていれば公開済み」と考えてよい（伏せたプロットがパラメータ経由で漏れない）。
 */
function computePlotValue(context) {
  if (!context?.roundActive) return 0;
  return Number.isFinite(context.plotValue) ? context.plotValue : 0;
}

// ファンブル値の基準値。戦闘中は自分が出したプロットと2の大きい方、それ以外は2。
function computeFumbleBase(context) {
  return Math.max(FUMBLE_FLOOR, computePlotValue(context));
}

// 何ラウンド目か（戦闘中でなければ0）。
function computeRoundNumber(context) {
  return Number.isFinite(context?.roundNumber) ? context.roundNumber : 0;
}

/**
 * 自動計算されるパラメータ。
 *   生命力 ＝ 失っていない分野の枠 ＋ 失っていない追加生命力の枠
 *   ファンブル値 ＝ 上のcomputeFumbleBase
 *   スペシャル値 ＝ 常に既定12（上限13・下限ファンブル値+1の丸めは判定を組むときに掛ける）
 *   プロット・ラウンド ＝ ラウンド進行の事実をそのまま写したもの
 *   使用コスト ＝ このラウンドに使った忍法コストの合計（readNinpouCost）
 *
 * 特技表を編集すると SET_COMPONENT → applyPluginDerivedParameters が走り、
 * プロットの公開・ラウンドの終了では recomputeDerivedForRound が走る（js/game-store.js）。
 */
function computeShinobigamiDerivedParameters(_parameters, components = {}, context = {}) {
  const state = readSkillTableState(components);
  return {
    'SHINOBIGAMI:life': countRemainingSlots(SHINOBIGAMI_SKILL_TABLE, state).total,
    'SHINOBIGAMI:F': computeFumbleBase(context),
    'SHINOBIGAMI:S': SPECIAL_DEFAULT,
    'SHINOBIGAMI:plot': computePlotValue(context),
    'SHINOBIGAMI:round': computeRoundNumber(context),
    'SHINOBIGAMI:usedCost': readNinpouCost(components, computeRoundNumber(context))
  };
}

// components から特技表の状態を取り出す。古いコマは components 自体を持たないので必ずこれを通す。
function readSkillTableState(components) {
  return normalizeSkillTableState(SHINOBIGAMI_SKILL_TABLE, components?.[SKILL_TABLE_COMPONENT_KEY]);
}

// ---------------------------------------------------------------------------
// 忍法
// ---------------------------------------------------------------------------

// 忍法の種類。keyは保存値なので、表示名を変えても壊れないよう英字にしておく。
const NINPOU_TYPES = [
  { value: 'attack', label: '攻撃忍法' },
  { value: 'support', label: 'サポート忍法' },
  { value: 'equip', label: '装備忍法' }
];

// 指定特技の選択肢。特技表の全セルを分野ごとにまとめ、値はセルID（'ninjutsu:7'）で持つ。
// 特技名ではなくセルIDにするのは、あとから特技名を直しても対応が切れないため
// （js/parameters/saikoro-fiction/skill-table.js の cellIndex と同じ方針）。
function buildSkillChoices() {
  const choices = [{ value: '', label: '自由／なし' }];
  SHINOBIGAMI_SKILL_TABLE.columns.forEach((column, colIndex) => {
    SHINOBIGAMI_SKILL_TABLE.rows.forEach((roll, rowIndex) => {
      const name = SHINOBIGAMI_SKILL_TABLE.cells[colIndex][rowIndex];
      if (!name) return;
      choices.push({
        value: makeCellId(SHINOBIGAMI_SKILL_TABLE, colIndex, rowIndex),
        label: `${name}（${roll}）`,
        group: column.label
      });
    });
  });
  return choices;
}

const SHINOBIGAMI_NINPOU_SPEC = createSkillSpec({
  id: 'shinobigami-ninpou',
  noun: '忍法',
  componentKey: 'ninpou',
  fields: [
    { key: 'type', label: 'タイプ', type: 'select', options: NINPOU_TYPES, className: 'ninpou-box-type' },
    // 間合は攻撃忍法だけが持つ。他のタイプでは入力させず、式・コストからも無視される
    // （js/parameters/skill/skill-formula.js の isFieldAvailable）。
    {
      key: 'range', label: '間合', type: 'number', className: 'ninpou-box-range',
      formulaName: '間合',
      availableWhen: fields => fields.type === 'attack'
    },
    // 装備忍法はコストを払わない
    {
      key: 'cost', label: 'コスト', type: 'number', className: 'ninpou-box-cost',
      formulaName: 'コスト',
      availableWhen: fields => fields.type !== 'equip'
    },
    // 装備忍法は判定を伴わないので指定特技も持たない
    {
      key: 'skill', label: '指定特技', type: 'select', options: buildSkillChoices(),
      className: 'ninpou-box-skill',
      availableWhen: fields => fields.type !== 'equip'
    }
  ],
  // フェーズ終了で使用回数が戻る（Core側の applyPhaseEnd → resetComponentsOnPhaseEnd 経由）
  periods: [
    { key: 'scenario', label: 'シナリオ' },
    { key: 'scene', label: 'シーン' },
    { key: 'round', label: 'ラウンド' }
  ],
  // 忍法は「使用時の修正」も「効果時間」も持たない。忍法の効果は文章で書かれていて、
  // 判定への影響を式へ写せるものはごく一部なうえ、写せた分だけ自動で乗るとかえって
  // 何が効いているのか読めなくなる。判定値をいじるときは、卓がその場でバフコマンドを
  // 打つ（AdB/AnB/SB/FB のレジスタは残してある）。
  // allowMods:false は modTargets を空にするのとは別物で、ボックスの「その他のパラメータ」
  // から全パラメータを選ぶ道ごと塞ぐ（js/parameters/skill/skill-model.js）。
  allowMods: false,
  allowExpirePhase: false,
  // 代わりに、使用時のログへ効果（note）を載せる。修正が付かないシステムでは
  // 「その忍法が何をするか」こそ卓が読みたいもので、断り書きは要らない。
  logNote: true
});

// 背景。「長所」か「短所」かと、その内容だけを持つ一覧（名前・内容は枠組みの組み込み欄）。
// 使用も判定も伴わないのでcreateListSpec側で、忍法のような回数制限・修正・使用条件は無い。
//
// 長所／短所をselectではなくtoggleにしてあるのは、2択しか無く、一覧を眺めながら
// 切り替えたい欄のため。値（merit/demerit）は表示ラベルと分けてある：後から
// 「利点／欠点」のような言い換えをしても保存済みのデータが落ちないようにするため
// （選択肢に無い値はnormalizeSkillが既定へ落とす）。
const SHINOBIGAMI_BACKGROUND_SPEC = createListSpec({
  id: 'shinobigami-background',
  noun: '背景',
  componentKey: 'background',
  fields: [
    {
      key: 'side', label: '長所／短所', type: 'toggle',
      options: [{ value: 'merit', label: '長所' }, { value: 'demerit', label: '短所' }]
    }
  ]
});

// components から正規形の背景一覧を取り出す。
function readBackgroundList(components) {
  return normalizeSkillList(
    SHINOBIGAMI_BACKGROUND_SPEC, components?.[SHINOBIGAMI_BACKGROUND_SPEC.componentKey] ?? []
  );
}

// 忍具。名前・効果と個数だけを持つアイテム（拡張属性は無し）。
//
// 兵糧丸・神通丸・遁甲符の3種はシノビガミ側で決まっているので、まだ1件も登録が無いコマには
// この枠を最初から並べる（defaultSkills）。効果の文章は入れない：版やハウスルールで変わるし、
// 卓が自分の言葉で書いたほうが使用ログとして役に立つため。
//
// createItemSpecを宣言すると item.use / item.gain がこのプラグインに自動で生える
// （js/parameters/registry.jsのhandlePluginChatCommand）。下のSHINOBIGAMI_PLUGINの
// item: がその宣言で、コマンドの処理はこのファイルには一切書かない。
const SHINOBIGAMI_TOOL_SPEC = createItemSpec({
  id: 'shinobigami-tool',
  noun: '忍具',
  componentKey: 'tools',
  defaultSkills: [{ name: '兵糧丸' }, { name: '神通丸' }, { name: '遁甲符' }]
});

// components から正規形の忍具一覧を取り出す。
function readToolList(components) {
  return normalizeSkillList(
    SHINOBIGAMI_TOOL_SPEC, components?.[SHINOBIGAMI_TOOL_SPEC.componentKey] ?? []
  );
}

// components から正規形の忍法一覧を取り出す。
function readNinpouList(components) {
  return normalizeSkillList(SHINOBIGAMI_NINPOU_SPEC, components?.[SHINOBIGAMI_NINPOU_SPEC.componentKey] ?? []);
}

// ---------------------------------------------------------------------------
// 忍法のコスト
//
// 戦闘中の1ラウンドに使える忍法のコストの合計は、そのラウンドに出したプロット値まで。
// 合計の置き場をcomponentsにしているのは、ラウンド終了で戻せる場所がここしか無いため
// （パラメータをリセットする口はCoreに無い。js/parameters/registry.jsの
// resetPluginComponentsOnPhaseEnd）。
//
// 保存する形は { round, used } で、何ラウンド目の記録かを一緒に持つ。番号が変われば
// 0から数え直すので、リセットの経路をどこかで通し損ねても前のラウンドの合計を引きずらない。
// ---------------------------------------------------------------------------

const NINPOU_COST_COMPONENT_KEY = 'ninpouCost';

// このラウンドに使った合計。記録が別のラウンドのものなら0。
function readNinpouCost(components, roundNumber) {
  const stored = components?.[NINPOU_COST_COMPONENT_KEY];
  if (!stored || stored.round !== roundNumber || roundNumber <= 0) return 0;
  const used = Number(stored.used);
  return Number.isFinite(used) && used > 0 ? used : 0;
}

// 忍法1件のコスト。その種別で意味を持たない欄（装備忍法のコスト）や、数値でない入力・
// 負の値は0として扱う（js/parameters/skill/skill-use.jsのsumSkillCostsと同じ数え方）。
const NINPOU_COST_FIELD = SHINOBIGAMI_NINPOU_SPEC.fields.find(field => field.key === 'cost');

function ninpouCostOf(ninpou) {
  if (!NINPOU_COST_FIELD || !isFieldAvailable(NINPOU_COST_FIELD, ninpou.fields)) return 0;
  const value = Number(ninpou.fields?.cost);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// 指定特技の表示名。表から消えたセルIDでも落ちないようにする。
function describeNinpouSkill(cellId) {
  if (!cellId) return '自由';
  return getCell(SHINOBIGAMI_SKILL_TABLE, cellId)?.name ?? '（不明な特技）';
}

// シーン終了・ラウンド終了などで忍法の使用回数を戻す（DX3のresetDX3ComponentsOnPhaseEndと同型）。
// ラウンド終了では、そのラウンドに使った忍法コストの合計（NINPOU_COST_COMPONENT_KEY）も捨てる。
// 記録はラウンド番号で見分けているので消さなくても次のラウンドには効かないが、古い記録を
// 部屋のデータに残さないためと、「戦闘終了→次の戦闘のラウンド1」で番号が1に戻ったときに
// 前の戦闘の合計を拾わないようにするため（js/game-store.jsのROUND_PROGRESSION_ENDも
// このリセットを通す）。
function resetShinobigamiComponentsOnPhaseEnd(components, phase) {
  const key = SHINOBIGAMI_NINPOU_SPEC.componentKey;
  const ninpou = components?.[key];
  const nextNinpou = resetSkillUsageOnPhaseEnd(SHINOBIGAMI_NINPOU_SPEC, ninpou, phase);

  let next = components;
  if (nextNinpou !== ninpou) next = { ...next, [key]: nextNinpou };
  if (phase === 'round' && components?.[NINPOU_COST_COMPONENT_KEY]) {
    next = { ...next, [NINPOU_COST_COMPONENT_KEY]: null };
  }
  return next;
}

/**
 * キャラ作成/更新ダイアログのプラグイン専用スペース。
 * 特技表の編集も判定も1つのボックスの中で完結させるため、ここはボタン1つだけ置く。
 */
function renderShinobigamiCharacterPanel({
  container, mode, canEdit = true, components, onComponentChange, getComponents, getToken,
  getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice,
  participants = {}, myParticipantId = null
}) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = 'シノビガミ';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  // 新規作成時はまだcomponentsを持たない（コマが存在しない）ため、特技表は開けない。
  // DX3のエフェクト/コンボ一覧と同じ扱い。
  if (mode !== 'edit' || !onComponentChange) {
    const note = document.createElement('div');
    note.className = 'sf-skill-table-note';
    note.textContent = 'コマを作成したあと、更新ダイアログから特技表を編集できます。';
    container.appendChild(note);
    return { getValues: () => ({}) };
  }

  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のcomponentsを読む。
  const readComponents = () => (getComponents ? getComponents() : components);

  const skillTableBtn = document.createElement('button');
  skillTableBtn.type = 'button';
  skillTableBtn.className = 'dialog-add-row-btn';
  skillTableBtn.style.marginTop = '8px';

  const updateLabel = () => {
    const state = readSkillTableState(readComponents());
    const life = countRemainingSlots(SHINOBIGAMI_SKILL_TABLE, state).total;
    skillTableBtn.textContent = `特技表を開く（取得${state.acquired.length}件・生命力${life}）`;
  };
  updateLabel();

  skillTableBtn.addEventListener('click', () => {
    showSkillTableBox({
      spec: SHINOBIGAMI_SKILL_TABLE,
      state: readSkillTableState(readComponents()),
      title: '特技表',
      // 他人のコマを表示だけしている時は取得の編集も判定も外す。判定はチャットへログを流し
      // バフも付けるので「変更」側として扱う。onCheckを渡さなければモード切替も修正値の欄も
      // 出ず、表を眺めてコマンドをコピーするだけのボックスになる。
      editable: canEdit,
      onSave: (nextState) => {
        onComponentChange(SKILL_TABLE_COMPONENT_KEY, nextState);
        updateLabel();
      },
      onCheck: canEdit ? (cellId) => {
        runSkillCheck({
          spec: SHINOBIGAMI_SKILL_TABLE,
          state: readSkillTableState(readComponents()),
          targetCellId: cellId,
          token: getToken ? getToken() : null,
          getEffectiveParameterValue,
          dispatch,
          rollBCDice,
          bcdiceSystem: SHINOBIGAMI_BCDICE_SYSTEM
        });
      } : undefined,
      // 修正値の欄もプレビューの目標値も、開いた時点のコマではなく今のコマを見る
      // （欄から書き換えた値が同じダイアログの中で反映される必要があるため）。
      getToken,
      getEffectiveParameterValue,
      // 修正値の入力欄はコマのパラメータを直接書き換える。他人のコマを見ているだけの時は
      // 渡さない＝欄は出るが触れない（バフが乗っているかは読めるようにしておく）。
      onParameterChange: canEdit ? (paramId, value) => {
        dispatch('SET_PARAMETER', { characterId: getToken?.()?.id, paramId, value });
      } : null
    });
  });
  container.appendChild(skillTableBtn);

  // --- 忍法 ---
  const ninpouBtn = document.createElement('button');
  ninpouBtn.type = 'button';
  ninpouBtn.className = 'dialog-add-row-btn';
  ninpouBtn.style.marginTop = '8px';

  const updateNinpouLabel = () => {
    ninpouBtn.textContent = `忍法を開く（${readNinpouList(readComponents()).length}件）`;
  };
  updateNinpouLabel();

  ninpouBtn.addEventListener('click', () => {
    showSkillBox({
      spec: SHINOBIGAMI_NINPOU_SPEC,
      skills: readComponents()?.[SHINOBIGAMI_NINPOU_SPEC.componentKey] ?? [],
      parameters: getToken ? (getToken()?.parameters ?? {}) : {},
      readOnly: !canEdit,
      onSave: (nextList) => {
        onComponentChange(SHINOBIGAMI_NINPOU_SPEC.componentKey, nextList);
        updateNinpouLabel();
      }
    });
  });
  container.appendChild(ninpouBtn);

  // --- 奥義 ---
  const ougiBtn = document.createElement('button');
  ougiBtn.type = 'button';
  ougiBtn.className = 'dialog-add-row-btn';
  ougiBtn.style.marginTop = '8px';

  // 件数は「自分が見られる件数」。全件を出すと、隠したはずの奥義があることが漏れる。
  const updateOugiLabel = () => {
    const visible = listVisibleOugi(readComponents()?.[OUGI_COMPONENT_KEY], myParticipantId);
    ougiBtn.textContent = `奥義を開く（${visible.length}件）`;
  };
  updateOugiLabel();

  ougiBtn.addEventListener('click', () => {
    showOugiBox({
      // 全件を渡す（見えない行はボックスが取り置いて、保存時に元の位置へ戻す）
      ougiList: readComponents()?.[OUGI_COMPONENT_KEY] ?? [],
      skillChoices: buildSkillChoices(),
      participants,
      myParticipantId,
      readOnly: !canEdit,
      onSave: (nextList) => {
        onComponentChange(OUGI_COMPONENT_KEY, nextList);
        updateOugiLabel();
      }
    });
  });
  container.appendChild(ougiBtn);

  // --- 背景 ---
  const backgroundBtn = document.createElement('button');
  backgroundBtn.type = 'button';
  backgroundBtn.className = 'dialog-add-row-btn';
  backgroundBtn.style.marginTop = '8px';

  const updateBackgroundLabel = () => {
    backgroundBtn.textContent = `背景を開く（${readBackgroundList(readComponents()).length}件）`;
  };
  updateBackgroundLabel();

  backgroundBtn.addEventListener('click', () => {
    showSkillBox({
      spec: SHINOBIGAMI_BACKGROUND_SPEC,
      skills: readComponents()?.[SHINOBIGAMI_BACKGROUND_SPEC.componentKey] ?? [],
      readOnly: !canEdit,
      onSave: (nextList) => {
        onComponentChange(SHINOBIGAMI_BACKGROUND_SPEC.componentKey, nextList);
        updateBackgroundLabel();
      }
    });
  });
  container.appendChild(backgroundBtn);

  // --- 忍具 ---
  const toolBtn = document.createElement('button');
  toolBtn.type = 'button';
  toolBtn.className = 'dialog-add-row-btn';
  toolBtn.style.marginTop = '8px';

  const updateToolLabel = () => {
    const total = readToolList(readComponents()).reduce((sum, tool) => sum + tool.quantity, 0);
    toolBtn.textContent = `忍具を開く（計${total}個）`;
  };
  updateToolLabel();

  toolBtn.addEventListener('click', () => {
    showSkillBox({
      spec: SHINOBIGAMI_TOOL_SPEC,
      skills: readComponents()?.[SHINOBIGAMI_TOOL_SPEC.componentKey] ?? [],
      readOnly: !canEdit,
      onSave: (nextList) => {
        onComponentChange(SHINOBIGAMI_TOOL_SPEC.componentKey, nextList);
        updateToolLabel();
      },
      // 使用ボタンはチャットへログを流し、コマの個数も減らす。他人のコマを見ているだけの
      // 時はreadOnlyがボタンごと封じるので、ここは渡したままでよい。
      getToken,
      dispatch
    });
  });
  container.appendChild(toolBtn);

  // Core側の汎用パラメータ一覧に流し込む値は無い
  // （特技表・忍法・奥義・背景・忍具はcomponents側で即時保存される）。
  return { getValues: () => ({}) };
}

// 忍法使用(name) の書式。呼び名（noun）からspecが組み立てる。
const NINPOU_USE_COMMAND_PATTERN = buildSkillUseCommandPattern(SHINOBIGAMI_NINPOU_SPEC);

// 奥義使用(奥義名) の書式。忍法（スキル枠組み）と違って奥義は専用ボックスが持つので、
// パターンもここで組み立てる。
const OUGI_USE_COMMAND_PATTERN = /^奥義使用\((.+)\)$/;

// この入力がシノビガミのコマンド構文に見えるか。プラグインが適用されていない部屋で
// 打たれた場合に理由を出すために使う（js/parameters/registry.js の findPluginForChatCommand）。
function looksLikeShinobigamiChatCommand(rawInput) {
  return SKILL_CHECK_COMMAND_PATTERN.test(rawInput)
    || NINPOU_USE_COMMAND_PATTERN.test(rawInput)
    || OUGI_USE_COMMAND_PATTERN.test(rawInput);
}

/**
 * 特技判定(隠形術) / 特技判定(忍術:7) を実行する。
 * 表UIの判定モードと同じ runSkillCheck に集約している。修正値（AdB/AnB/SB/FB）は
 * コマのパラメータなので、コマンドから振っても表から振っても同じ値が乗る。
 */
function handleSkillCheckCommand(rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue }) {
  const match = rawInput.match(SKILL_CHECK_COMMAND_PATTERN);
  if (!match) return false;

  // 構文が合った時点で必ずtrueを返す（Coreが通常のダイスロールへフォールバックしないように）。
  if (!token) {
    alert('特技判定を行う参照キャラクターを選択してください。');
    return true;
  }

  const argument = match[1].trim();
  const cellId = findCellIdByName(SHINOBIGAMI_SKILL_TABLE, argument);
  if (!cellId) {
    alert(`特技「${argument}」が特技表に見つかりません。特技名か「分野:出目」（例: 忍術:7）で指定してください。`);
    return true;
  }

  runSkillCheck({
    spec: SHINOBIGAMI_SKILL_TABLE,
    state: readSkillTableState(token.components),
    targetCellId: cellId,
    token,
    getEffectiveParameterValue,
    dispatch,
    rollBCDice,
    bcdiceSystem: SHINOBIGAMI_BCDICE_SYSTEM,
    chatCommand: rawInput
  });
  return true;
}

/**
 * 忍法使用(名前) を実行する。使用制限の判定・修正値のバフ付与・使用回数の記録・ログは
 * すべて共通の runSkillUse が持つ（DX3のエフェクト使用と同じ経路）。
 * シノビガミ固有の「1ラウンドのコスト合計はプロットまで」だけをここで見る。
 */
function handleNinpouUseCommand(rawInput, context) {
  const match = rawInput.match(NINPOU_USE_COMMAND_PATTERN);
  if (!match) return false;

  const { token, dispatch, getEffectiveParameterValue, generateBuffId } = context;
  if (!token) {
    alert('忍法を使用する参照キャラクターを選択してください。');
    return true;
  }

  const ninpouList = readNinpouList(token.components);
  const name = match[1].trim();
  const ninpou = findSkillByName(ninpouList, name);
  if (!ninpou) {
    alert(`忍法「${name}」が見つかりません。コマの更新ダイアログから忍法を登録してください。`);
    return true;
  }

  // ラウンドの事実はパラメータ経由で受け取る（自動計算のcontextはここへ届かない）。
  const readParam = (key) => Number(getEffectiveParameterValue(token, `SHINOBIGAMI:${key}`)) || 0;
  const plot = readParam('plot');
  const roundNumber = readParam('round');
  const cost = ninpouCostOf(ninpou);
  // 判定に使うのは実効値（バフ込み）。GMが「バフ(使用コスト, -1)」でその場だけ枠を
  // 緩められるようにしてある。書き戻す元にするのはcomponents側の生の値（下）なので、
  // バフの分が合計へ焼き付くことはない。
  const usedCost = readParam('usedCost');

  // プロットが0なのは、平常時・未提出・公開前のいずれか。上限を決める材料が無いので
  // 制限しない（公開前のプロットはCoreがプラグインへ渡さない。computePlotValue参照）。
  // ただし戦闘中であれば、公開前に使った分も下で数えておく。そのラウンドに使ったことは
  // 変わらないので、公開された時点で残り枠から引かれる。
  if (plot > 0 && cost > 0 && usedCost + cost > plot) {
    alert(`忍法「${ninpou.name}」は使用できません。\n\n`
      + `このラウンドに使えるコストの合計はプロット（${plot}）までです。\n`
      + `使用済み${usedCost} ＋ 今回${cost} ＝ ${usedCost + cost}`);
    return true;
  }

  // コストは、戦闘中なら「今回を足した合計／プロット」まで添える（残り枠が読めるように）
  const costText = ninpou.fields.type === 'equip'
    ? null
    : `コスト${ninpou.fields.cost}`
      + (plot > 0 && cost > 0 ? `（このラウンド計${usedCost + cost}／プロット${plot}）` : '');

  const detail = [
    NINPOU_TYPES.find(type => type.value === ninpou.fields.type)?.label,
    ninpou.fields.type === 'attack' ? `間合${ninpou.fields.range}` : null,
    costText,
    ninpou.fields.type !== 'equip' ? `指定特技: ${describeNinpouSkill(ninpou.fields.skill)}` : null
  ].filter(Boolean).join('／');

  const used = runSkillUse({
    spec: SHINOBIGAMI_NINPOU_SPEC,
    targetSkills: [ninpou],
    allSkills: ninpouList,
    tokenId: token.id,
    dispatch,
    getToken: () => token,
    getEffectiveParameterValue,
    generateBuffId,
    onSaveSkills: (nextList) => {
      dispatch('SET_COMPONENT', {
        id: token.id,
        componentKey: SHINOBIGAMI_NINPOU_SPEC.componentKey,
        value: nextList
      });
    },
    logTitle: `忍法使用: ${ninpou.name}`,
    logDetail: detail,
    chatCommand: rawInput
  });

  // 実際に使えた分だけ積む（使用回数の上限や使用条件で弾かれた場合、runSkillUseは何も
  // 起こさずfalseを返すので、コストだけ減ることはない）。記録するのは戦闘中だけ。
  // 足す先はtoken.components側の生の値で、上で読んだ実効値（バフ込み）ではない。
  if (used && roundNumber > 0 && cost > 0) {
    dispatch('SET_COMPONENT', {
      id: token.id,
      componentKey: NINPOU_COST_COMPONENT_KEY,
      value: { round: roundNumber, used: readNinpouCost(token.components, roundNumber) + cost }
    });
  }
  return true;
}

// シノビガミのチャットコマンドの入口。順に試して、扱えたものがあればそこで止める。
/**
 * 奥義使用(奥義名) を実行する。使用回数・コストは持たず、その奥義の内容をログへ流すだけ。
 *
 * ログはMainタブへ流れる（プラグインのコマンドには「今どのタブを見ているか」が渡ってこない。
 * docs/plugin-guide.md 3.4。特技判定・忍法使用も同じ）。
 * 使用しても公開先は変えない：シート上は伏せたまま1回だけ卓に見せる、という使い方のため。
 *
 * 自分が見られない奥義は名指しでも使えない。名前を知らないはずの人が打ち間違いで
 * 他人の奥義を卓へ晒す事故を防ぐための歯止め（画面側の歯止めで、なりすましは防げない）。
 */
function handleOugiUseCommand(rawInput, { token, dispatch, myParticipantId = null }) {
  const match = rawInput.match(OUGI_USE_COMMAND_PATTERN);
  if (!match) return false;

  // 構文が合った時点で必ずtrueを返す（Coreが通常のダイスロールへフォールバックしないように）。
  if (!token) {
    alert('奥義を使う参照キャラクターを選択してください。');
    return true;
  }

  const name = match[1].trim();
  const visible = listVisibleOugi(token.components?.[OUGI_COMPONENT_KEY], myParticipantId);
  const ougi = visible.find(entry => entry.name === name);

  if (!ougi) {
    alert(`奥義「${name}」が見つかりません。`);
    return true;
  }

  // 「奥義名」:種類 ／ 効果 ／ 指定特技 ／（あれば）奥義改造。空欄の行は出さない。
  const skillName = ougi.skill ? (getCell(SHINOBIGAMI_SKILL_TABLE, ougi.skill)?.name ?? '') : '';
  const lines = [`「${ougi.name}」${ougi.kind ? `:${ougi.kind}` : ''}`];
  if (ougi.effect) lines.push(ougi.effect);
  if (skillName) lines.push(`指定特技:${skillName}`);

  if (ougi.customizations.length > 0) {
    lines.push('(奥義改造)');
    ougi.customizations.forEach(mod => {
      const detail = [mod.name, mod.effect].filter(Boolean).join(' ');
      lines.push(`${customizationSideLabel(mod.side)}:${detail}`);
    });
  }

  dispatch('ADD_CHAT_MESSAGE', {
    tabId: 'main',
    entry: {
      system: '奥義',
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: rawInput,
      resultText: lines.join('\n')
    }
  });
  return true;
}

function handleShinobigamiChatCommand(rawInput, context) {
  return handleSkillCheckCommand(rawInput, context)
    || handleNinpouUseCommand(rawInput, context)
    || handleOugiUseCommand(rawInput, context);
}

/**
 * ラウンド進行のフェーズ構成。
 *   1. プロット … 登場しているコマが1〜6を伏せて出し、GMの合図で一斉公開する
 *   2. 手番     … プロット値の高い順（turnOrder:'plot'）に1人ずつ
 *   3. ラウンド終了 … 次のラウンドへ。ここでラウンドのバフを剥がす
 * 「ラウンド開始」に当たる段は置いていない。プロットの段に入ること自体がそれで、
 * ログにも「ラウンド2 - プロット開始」と出る。
 *
 * 同値（同じ数字を出した者同士）はルール上は同時処理だが、卓の運用では順番が要るので
 * Core側が便宜上の順番を決める（js/game-store.jsのsortForTurnOrder）。同値であることは
 * パネルとログに印が出るので、実際にどう捌くかは卓の判断に委ねる。
 *
 * preTurnStepは置かない＝シノビガミではルーム設定の「イニシアチブプロセスを挟む」は
 * 効かない（js/game-store.jsのinitialStepForPhase）。手番順の根拠がプロットであり、
 * 手番の直前に順番を計算し直す段がそもそも無いため。
 */
function buildShinobigamiRoundPhaseTemplate() {
  return [
    {
      id: 'plot', label: 'プロット', kind: 'plot',
      plot: { min: 1, max: 6 },
      expirePhaseOnComplete: null, preTurnStep: null
    },
    {
      id: 'action', label: '手番', kind: 'perCharacter',
      turnOrder: 'plot',
      expirePhaseOnComplete: null, preTurnStep: null
    },
    {
      id: 'roundEnd', label: 'ラウンド終了', kind: 'once',
      expirePhaseOnComplete: 'round', preTurnStep: null
    }
  ];
}

export const SHINOBIGAMI_PLUGIN = {
  id: 'SHINOBIGAMI',
  label: 'シノビガミ',
  buildCharacterParameters: buildShinobigamiCharacterParameters,
  computeDerivedParameters: computeShinobigamiDerivedParameters,
  buildRoundPhaseTemplate: buildShinobigamiRoundPhaseTemplate,
  renderCharacterPanel: renderShinobigamiCharacterPanel,
  handleChatCommand: handleShinobigamiChatCommand,
  looksLikeOwnChatCommand: looksLikeShinobigamiChatCommand,
  // これだけで item.use / item.gain が生える（js/parameters/registry.js）。
  // looksLikeOwnChatCommandには足さない：item.* はシノビガミのものではなく、
  // アイテムを持つシステム共通の操作のため（dice.* と同じ扱い。js/main.js）。
  item: SHINOBIGAMI_TOOL_SPEC,
  // シーン終了・ラウンド終了で忍法の使用回数を戻す
  resetComponentsOnPhaseEnd: resetShinobigamiComponentsOnPhaseEnd
};

// 他プラグイン（インセイン等）や動作確認から参照できるように公開しておく。
export {
  SHINOBIGAMI_SKILL_TABLE, SKILL_TABLE_COMPONENT_KEY,
  SHINOBIGAMI_NINPOU_SPEC, SHINOBIGAMI_BACKGROUND_SPEC, SHINOBIGAMI_TOOL_SPEC
};
