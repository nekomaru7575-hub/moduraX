// js/parameters/shinobigami.js
// シノビガミのプラグイン記述子。今回は「特技表」だけを載せた最小構成で、
// 忍法・奥義・生命力・感情などは後続で足す。
//
// 特技表そのものの仕組み（データモデル・距離計算・UI・判定の実行）は
// js/parameters/saikoro-fiction/ の共通モジュールが持ち、ここは
// シノビガミ固有の値（特技データ・BCDiceのシステムID・目標値の基準5）を渡すだけ。
// インセイン等を追加する場合も、同じ形で自分の特技データを渡せばよい。

import {
  createSkillTableSpec, normalizeSkillTableState, findCellIdByName, countRemainingSlots
} from './saikoro-fiction/skill-table.js';
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

const SHINOBIGAMI_SKILL_TABLE = createSkillTableSpec({
  id: 'shinobigami',
  columns: SHINOBIGAMI_COLUMNS,
  rows: SHINOBIGAMI_ROWS,
  cells: SHINOBIGAMI_SKILL_CELLS,
  cyclic: true,       // 妖術の右隣は器術（表の左右は繋がっている）
  gapFillable: true,  // ギャップは塗りつぶすことができる
  baseTarget: 5,      // 2D6 >= 5 + 距離
  check: {
    options: SHINOBIGAMI_CHECK_OPTIONS,
    buildCommand: buildShinobigamiCheckCommand
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

// キャラクターの生命力パラメータ。値は特技表の枠から自動算出するので、手入力はさせない
// （editable:false）。locked:trueにしているのは削除させないためと、プラグイン導入前に
// 作られたコマにも後から補完させるため（js/parameters/registry.jsのwithMissingPluginParameters）。
const SHINOBIGAMI_CHARACTER_PARAMETERS = [
  {
    key: 'life', label: '生命力',
    value: SHINOBIGAMI_COLUMNS.length, // 満タン＝分野の数（追加生命力は初期0）
    locked: true, editable: false, visible: true
  }
];

function buildShinobigamiCharacterParameters() {
  return buildParameters('SHINOBIGAMI', SHINOBIGAMI_CHARACTER_PARAMETERS);
}

/**
 * 生命力 ＝ 失っていない分野の枠 ＋ 失っていない追加生命力の枠。
 * 特技表を編集すると SET_COMPONENT → applyPluginDerivedParameters が走るので
 * （js/game-store.js）、チェックを入れた時点で全員の画面の値が変わる。
 */
function computeShinobigamiDerivedParameters(_parameters, components = {}) {
  const state = readSkillTableState(components);
  return {
    'SHINOBIGAMI:life': countRemainingSlots(SHINOBIGAMI_SKILL_TABLE, state).total
  };
}

// components から特技表の状態を取り出す。古いコマは components 自体を持たないので必ずこれを通す。
function readSkillTableState(components) {
  return normalizeSkillTableState(SHINOBIGAMI_SKILL_TABLE, components?.[SKILL_TABLE_COMPONENT_KEY]);
}

/**
 * キャラ作成/更新ダイアログのプラグイン専用スペース。
 * 特技表の編集も判定も1つのボックスの中で完結させるため、ここはボタン1つだけ置く。
 */
function renderShinobigamiCharacterPanel({
  container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, dispatch, rollBCDice
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
          dispatch,
          rollBCDice,
          bcdiceSystem: SHINOBIGAMI_BCDICE_SYSTEM,
          checkOptions
        });
      } : undefined
    });
  });
  container.appendChild(skillTableBtn);

  // Core側の汎用パラメータ一覧に流し込む値は無い（特技表はcomponents側で即時保存される）。
  return { getValues: () => ({}) };
}

// この入力がシノビガミのコマンド構文に見えるか。プラグインが適用されていない部屋で
// 打たれた場合に理由を出すために使う（js/parameters/registry.js の findPluginForChatCommand）。
function looksLikeShinobigamiChatCommand(rawInput) {
  return SKILL_CHECK_COMMAND_PATTERN.test(rawInput);
}

/**
 * 特技判定(隠形術) / 特技判定(忍術:7) を実行する。
 * 表UIの判定モードと同じ runSkillCheck に集約している。
 * 判定オプションは表ボックスの中だけの指定なので、コマンド経由の判定は常に既定値
 * （2ダイス・スペシャル値12・ファンブル値2＝`SG>=目標値`）で振られる。
 */
function handleShinobigamiChatCommand(rawInput, { token, dispatch, rollBCDice }) {
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
    dispatch,
    rollBCDice,
    bcdiceSystem: SHINOBIGAMI_BCDICE_SYSTEM,
    chatCommand: rawInput
  });
  return true;
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
  looksLikeOwnChatCommand: looksLikeShinobigamiChatCommand
};

// 他プラグイン（インセイン等）や動作確認から参照できるように公開しておく。
export { SHINOBIGAMI_SKILL_TABLE, SKILL_TABLE_COMPONENT_KEY };
