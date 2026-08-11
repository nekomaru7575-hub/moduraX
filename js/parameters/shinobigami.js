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
  createSkillSpec, normalizeSkillList, findSkillByName, resetSkillUsageOnPhaseEnd,
  buildSkillUseCommandPattern
} from './skill/skill-model.js';
import { runSkillUse } from './skill/skill-use.js';
import { showSkillBox } from './skill/skill-box.js';
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
const SHINOBIGAMI_CHECK_OPTIONS = [
  { key: 'diceCount', label: 'ダイス数', default: 2, min: 2, max: 10 },
  { key: 'specialValue', label: 'スペシャル値', default: 12, min: 2, max: 13 },
  { key: 'fumbleValue', label: 'ファンブル値', default: 2, min: 0, max: 12 }
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

const OPTION_DEFAULTS = Object.fromEntries(SHINOBIGAMI_CHECK_OPTIONS.map(o => [o.key, o.default]));

// スペシャル値・ファンブル値の基準と丸め幅。パラメータの初期値と判定時の丸めの両方で使う。
const SPECIAL_DEFAULT = 12;
const SPECIAL_MAX = 13;   // 13にするとスペシャルは出ない
const FUMBLE_FLOOR = 2;   // 平常時のファンブル値。戦闘中はプロットがこれを上回れば置き換わる

/**
 * 判定オプション欄の指定を読む。空欄・既定値のままなら「指定なし」とみなして自動値を使う。
 * 欄はダイアログを開くたび既定値に戻るので、既定のまま＝手を触れていない、と扱ってよい。
 * 逆に手で入れた値は、キャラクターの自動値より優先する（GMが上書きしたい場面を潰さない）。
 */
function pickCheckOption(rawOptions, key, autoValue) {
  const raw = rawOptions?.[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') return autoValue;
  const value = Math.trunc(Number(raw));
  if (!Number.isFinite(value)) return autoValue;
  return value === OPTION_DEFAULTS[key] ? autoValue : value;
}

/**
 * キャラクターの修正値を判定へ反映する（js/parameters/saikoro-fiction/skill-check.js の
 * resolveCheckAdjustments から呼ばれる）。
 *
 *   ダイス数     = 指定 or 2        + ダイス数修正(AdB)
 *   ファンブル値 = 指定 or {F}      + ファンブル値修正(FB)
 *   スペシャル値 = 指定 or {S}      + スペシャル値修正(SB)   → ファンブル値+1〜13へ丸める
 *   目標値       = 特技表が出した値 − 判定値修正(AnB)
 *
 * 【AnBを目標値から引く理由】BCDiceのシノビガミ行為判定（nSG@s#f>=x）には固定値修正の
 * 書式が無い。仮に出目へ足せたとしても、スペシャル/ファンブルは出目の合計で決まるため、
 * 合計を動かすとそちらの判定までずれる。目標値を下げれば成否は同じで、
 * スペシャル/ファンブルは素の出目のまま保たれる。
 */
function resolveShinobigamiCheck({ rawOptions, targetNumber, getParam }) {
  const adb = getParam('SHINOBIGAMI:AdB');
  const anb = getParam('SHINOBIGAMI:AnB');
  const sb = getParam('SHINOBIGAMI:SB');
  const fb = getParam('SHINOBIGAMI:FB');
  const fumbleBase = getParam('SHINOBIGAMI:F') || FUMBLE_FLOOR;
  const specialBase = getParam('SHINOBIGAMI:S') || SPECIAL_DEFAULT;

  const diceCount = pickCheckOption(rawOptions, 'diceCount', 2) + adb;
  const fumbleValue = pickCheckOption(rawOptions, 'fumbleValue', fumbleBase) + fb;
  const specialValue = Math.min(
    SPECIAL_MAX,
    Math.max(fumbleValue + 1, pickCheckOption(rawOptions, 'specialValue', specialBase) + sb)
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

  // 忍法の「使用時の修正」を受け取る4つのレジスタ（下のSHINOBIGAMI_NINPOU_SPECのmodTargets）。
  // 手入力・一覧表示は想定しないが、バフ（ADD_BUFF）はeditableを見ずに加算できる。
  { key: 'AdB', label: 'ダイス数修正(AdB)', value: 0, locked: true, editable: false, visible: false },
  { key: 'AnB', label: '判定値修正(AnB)', value: 0, locked: true, editable: false, visible: false },
  { key: 'SB', label: 'スペシャル値修正(SB)', value: 0, locked: true, editable: false, visible: false },
  { key: 'FB', label: 'ファンブル値修正(FB)', value: 0, locked: true, editable: false, visible: false },

  // 自動計算される判定の基準値。修正（SB/FB）を足して丸めるのは判定を組み立てるとき
  // （buildShinobigamiCheckCommand）で、ここは素の基準値だけを持つ。
  { key: 'F', label: 'ファンブル値({F})', value: FUMBLE_FLOOR, locked: true, editable: false, visible: false },
  { key: 'S', label: 'スペシャル値({S})', value: SPECIAL_DEFAULT, locked: true, editable: false, visible: false }
];

function buildShinobigamiCharacterParameters() {
  return buildParameters('SHINOBIGAMI', SHINOBIGAMI_CHARACTER_PARAMETERS);
}

/**
 * ファンブル値の基準値。戦闘中（ラウンド進行中）は、自分が出したプロットと2の大きい方。
 * それ以外は2。
 *
 * contextはCoreが渡すラウンドの事実（js/game-store.jsのbuildDerivedContext）。
 * 公開前のプロットはCore側でnullに落とされて届かないので、ここでは
 * 「値が来ていれば公開済み」と考えてよい（伏せたプロットがパラメータ経由で漏れない）。
 */
function computeFumbleBase(context) {
  if (!context?.roundActive) return FUMBLE_FLOOR;
  const plot = context.plotValue;
  return Number.isFinite(plot) ? Math.max(FUMBLE_FLOOR, plot) : FUMBLE_FLOOR;
}

/**
 * 自動計算されるパラメータ。
 *   生命力 ＝ 失っていない分野の枠 ＋ 失っていない追加生命力の枠
 *   ファンブル値 ＝ 上のcomputeFumbleBase
 *   スペシャル値 ＝ 常に既定12（上限13・下限ファンブル値+1の丸めは判定を組むときに掛ける）
 *
 * 特技表を編集すると SET_COMPONENT → applyPluginDerivedParameters が走り、
 * プロットの公開・ラウンドの終了では recomputeDerivedForRound が走る（js/game-store.js）。
 */
function computeShinobigamiDerivedParameters(_parameters, components = {}, context = {}) {
  const state = readSkillTableState(components);
  return {
    'SHINOBIGAMI:life': countRemainingSlots(SHINOBIGAMI_SKILL_TABLE, state).total,
    'SHINOBIGAMI:F': computeFumbleBase(context),
    'SHINOBIGAMI:S': SPECIAL_DEFAULT
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
  // 「使用時の修正」の受け皿。ここに挙げたものが対象プルダウンの先頭に並ぶ
  // （コマが持つ他のパラメータも選べる）。
  modTargets: [
    { paramId: 'SHINOBIGAMI:AdB', label: 'ダイス数' },
    { paramId: 'SHINOBIGAMI:AnB', label: '判定値' },
    { paramId: 'SHINOBIGAMI:SB', label: 'スペシャル値' },
    { paramId: 'SHINOBIGAMI:FB', label: 'ファンブル値' }
  ]
});

// components から正規形の忍法一覧を取り出す。
function readNinpouList(components) {
  return normalizeSkillList(SHINOBIGAMI_NINPOU_SPEC, components?.[SHINOBIGAMI_NINPOU_SPEC.componentKey] ?? []);
}

// 指定特技の表示名。表から消えたセルIDでも落ちないようにする。
function describeNinpouSkill(cellId) {
  if (!cellId) return '自由';
  return getCell(SHINOBIGAMI_SKILL_TABLE, cellId)?.name ?? '（不明な特技）';
}

// シーン終了・ラウンド終了などで忍法の使用回数を戻す（DX3のresetDX3ComponentsOnPhaseEndと同型）。
function resetShinobigamiComponentsOnPhaseEnd(components, phase) {
  const key = SHINOBIGAMI_NINPOU_SPEC.componentKey;
  const ninpou = components?.[key];
  const nextNinpou = resetSkillUsageOnPhaseEnd(SHINOBIGAMI_NINPOU_SPEC, ninpou, phase);

  return nextNinpou === ninpou ? components : { ...components, [key]: nextNinpou };
}

/**
 * キャラ作成/更新ダイアログのプラグイン専用スペース。
 * 特技表の編集も判定も1つのボックスの中で完結させるため、ここはボタン1つだけ置く。
 */
function renderShinobigamiCharacterPanel({
  container, mode, canEdit = true, components, onComponentChange, getComponents, getToken,
  getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice
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
      // バフも付けるので「変更」側として扱う。onCheckを渡さなければモード切替も判定オプション
      // 欄も出ず、表を眺めてコマンドをコピーするだけのボックスになる。
      editable: canEdit,
      onSave: (nextState) => {
        onComponentChange(SKILL_TABLE_COMPONENT_KEY, nextState);
        updateLabel();
      },
      // checkOptionsは表ボックスの「判定オプション」欄で指定された値。保存はされないので、
      // 次にボックスを開くと既定値に戻る。
      onCheck: canEdit ? (cellId, checkOptions) => {
        runSkillCheck({
          spec: SHINOBIGAMI_SKILL_TABLE,
          state: readSkillTableState(readComponents()),
          targetCellId: cellId,
          token: getToken ? getToken() : null,
          getEffectiveParameterValue,
          dispatch,
          rollBCDice,
          bcdiceSystem: SHINOBIGAMI_BCDICE_SYSTEM,
          checkOptions
        });
      } : undefined,
      // 表の上でカーソルを乗せた時のプレビューも、実際に振る値（修正込み）で出すために渡す
      token: getToken ? getToken() : null,
      getEffectiveParameterValue
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

  // Core側の汎用パラメータ一覧に流し込む値は無い（特技表も忍法もcomponents側で即時保存される）。
  return { getValues: () => ({}) };
}

// 忍法使用(name) の書式。呼び名（noun）からspecが組み立てる。
const NINPOU_USE_COMMAND_PATTERN = buildSkillUseCommandPattern(SHINOBIGAMI_NINPOU_SPEC);

// この入力がシノビガミのコマンド構文に見えるか。プラグインが適用されていない部屋で
// 打たれた場合に理由を出すために使う（js/parameters/registry.js の findPluginForChatCommand）。
function looksLikeShinobigamiChatCommand(rawInput) {
  return SKILL_CHECK_COMMAND_PATTERN.test(rawInput) || NINPOU_USE_COMMAND_PATTERN.test(rawInput);
}

/**
 * 特技判定(隠形術) / 特技判定(忍術:7) を実行する。
 * 表UIの判定モードと同じ runSkillCheck に集約している。
 * 判定オプションは表ボックスの中だけの指定なので、コマンド経由の判定は常に既定値
 * （＝キャラクターの修正値だけを見た値）で振られる。
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

  const detail = [
    NINPOU_TYPES.find(type => type.value === ninpou.fields.type)?.label,
    ninpou.fields.type === 'attack' ? `間合${ninpou.fields.range}` : null,
    ninpou.fields.type !== 'equip' ? `コスト${ninpou.fields.cost}` : null,
    ninpou.fields.type !== 'equip' ? `指定特技: ${describeNinpouSkill(ninpou.fields.skill)}` : null
  ].filter(Boolean).join('／');

  runSkillUse({
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
  return true;
}

// シノビガミのチャットコマンドの入口。順に試して、扱えたものがあればそこで止める。
function handleShinobigamiChatCommand(rawInput, context) {
  return handleSkillCheckCommand(rawInput, context) || handleNinpouUseCommand(rawInput, context);
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
  // シーン終了・ラウンド終了で忍法の使用回数を戻す
  resetComponentsOnPhaseEnd: resetShinobigamiComponentsOnPhaseEnd
};

// 他プラグイン（インセイン等）や動作確認から参照できるように公開しておく。
export { SHINOBIGAMI_SKILL_TABLE, SKILL_TABLE_COMPONENT_KEY, SHINOBIGAMI_NINPOU_SPEC };
