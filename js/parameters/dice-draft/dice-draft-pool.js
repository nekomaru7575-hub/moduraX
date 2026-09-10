// js/parameters/dice-draft/dice-draft-pool.js
// ダイスドラフトのプールを、振らずに直接動かす操作。
//
//   dice.change(a>b,n) … プールにある目 a のダイスを n 個 b の目へ変える（,n 省略で1）
//   dice.add(a*b)      … 目 a のダイスを b 個プールへ足す（*b 省略で1）
//
// この2つは特定のシステムの能力ではなく、プール（＝Coreのダイスドラフトパネル）そのものへの
// 操作なので、diceDraft を宣言しているプラグインには js/parameters/registry.js が自動で生やす。
// プラグイン側に書くことは何も無い。
//
// 一方、システム固有の能力は「プールを動かす」以外の対価や条件を持つ（ステラナイツの
// プチラッキーはブーケを払う）。そういう合成コマンドのために、コマンドの書式とは切り離した
// runDiceChange / runDiceAdd を部品として公開している。プラグインはこれを呼んで、
// 自分の条件だけを足せばよい。
//
// dice-draft-roll.js / dice-draft-use.js と同じ流儀で、dispatch などの依存は全部引数で
// 受け取る（game-store.js を import すると
// game-store.js → registry.js → プラグイン → ここ → game-store.js の循環になる）。
// トップレベルで document を触らないこと（サーバーもこのファイルを読み込む）。

import { addDiceToPool, changePoolDice, createDie, POOL_SAFETY_MAX } from './dice-draft-model.js';
import { DICE_DRAFT_COMPONENT_KEY, readDraft } from './dice-draft-roll.js';

const MAIN_TAB_ID = 'main';

// 区切り記号は書く人によって揺れるので、全角も受ける
// （dice-draft-model.js の TARGET_RANGE_PATTERN と同じ扱い）。
const DICE_CHANGE_PATTERN = /^dice\.change\(\s*(\d+)\s*[>＞]\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)$/i;
const DICE_ADD_PATTERN = /^dice\.add\(\s*(\d+)\s*(?:[*×＊]\s*(\d+)\s*)?\)$/i;

// 目の上限。面数（spec.diceSides）では縛らない：能力で「振っては出ない目」を作る
// システムがありうる（d6の盤面に7の目を置く等）ためで、一致型の置き場に対応する数字が
// 無ければ置けないだけ＝プールに残るので、それ自体は壊れない。
// ただし青天井にすると保存データも見た目も破綻するので、当面の頭打ちとして99を置く。
// 1〜6以外の目はピップではなく数字で描かれる（js/check-view/dice-draft-view.jsのrenderDieFace）。
const MAX_FACE_VALUE = 99;

// 目の呼び方はパネル・チャットログで揃える（「3の目」）。
function faceLabel(value) {
  return `${value}の目`;
}

function validFace(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_FACE_VALUE;
}

// 共通の前置き検査。使えないときだけ理由の文字列を返す（使えるなら null）。
function rejectReason(spec, token, faces, count) {
  if (!token) return 'キャラクターを選択してください。';
  if (!spec) return 'このシステムはダイスドラフトを使いません。';

  const bad = faces.find(value => !validFace(value));
  if (bad !== undefined) return `目は 1〜${MAX_FACE_VALUE} の整数で指定してください（${bad}）。`;
  if (!Number.isInteger(count) || count < 1) return 'ダイスの個数には 1 以上の整数を指定してください。';

  return null;
}

function logToChat(dispatch, spec, token, chatCommand, lines) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_TAB_ID,
    entry: {
      system: spec.label,
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: chatCommand,
      resultText: lines.join('\n')
    }
  });
}

/**
 * プールにある目 from のダイスを count 個だけ to へ変える。
 *
 * count 個そろっていなければ**1個も変えず**に { ok: false } を返す（理由は notify で伝える）。
 * 対価を払う合成コマンドが、払ったのに効かない／効いたのに払っていない、という
 * 中途半端な状態にならないようにするため。
 *
 * @param {{
 *   spec: object,             createDiceDraftSpec() の戻り値
 *   token: object|null,       参照キャラクター
 *   dispatch: (action: string, payload: object) => void,
 *   from: number, to: number,
 *   count?: number,
 *   knownSkillNames?: string[]|null,
 *   chatCommand?: string,
 *   silent?: boolean,         trueならチャットログを出さない（合成コマンドが自分で1行出す用）
 *   notify?: (message: string) => void
 * }} options
 * @returns {{ ok: boolean, changed: number, available: number }}
 */
export function runDiceChange({
  spec, token, dispatch, from, to, count = 1,
  knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message)
}) {
  const none = { ok: false, changed: 0, available: 0 };

  const reason = rejectReason(spec, token, [from, to], count);
  if (reason) {
    notify(reason);
    return none;
  }

  const before = readDraft(token.components, knownSkillNames);
  const { draft, changed, available } = changePoolDice(before, from, to, count);

  if (changed === 0) {
    notify(`プールに${faceLabel(from)}が ${count}個 ありません（現在 ${available}個）。`);
    return { ...none, available };
  }

  // from === to は状態が動かないので dispatch しない（changePoolDice が元の参照を返す）。
  // 「使えた」ことは呼び出し側へ返すため、ok は true のまま
  if (draft !== before) {
    dispatch('SET_COMPONENT', {
      id: token.id, componentKey: DICE_DRAFT_COMPONENT_KEY, value: draft
    });
  }

  if (!silent) {
    logToChat(dispatch, spec, token, chatCommand, [
      `${faceLabel(from)} ×${changed} → ${faceLabel(to)}（プール ${draft.pool.length}個）`
    ]);
  }

  return { ok: true, changed, available };
}

/**
 * 目 value のダイスを count 個プールへ足す。
 *
 * プールの上限（POOL_SAFETY_MAX）に入り切らない個数は先に弾く。振って溢れる場合と違い、
 * こちらは「何個足すか」を利用者がその場で決められるので、黙って切り詰めるより
 * 個数を直してもらうほうが早い。
 *
 * @returns {{ ok: boolean, added: number, overflow: number }}
 */
export function runDiceAdd({
  spec, token, dispatch, value, count = 1,
  knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message)
}) {
  const none = { ok: false, added: 0, overflow: 0 };

  const reason = rejectReason(spec, token, [value], count);
  if (reason) {
    notify(reason);
    return none;
  }
  if (count > POOL_SAFETY_MAX) {
    notify(`一度に足せるのは ${POOL_SAFETY_MAX}個 までです。`);
    return none;
  }

  const before = readDraft(token.components, knownSkillNames);
  const dice = Array.from({ length: count }, () => createDie(spec.diceSides, value));
  const { draft, added, overflow } = addDiceToPool(before, dice);

  if (added === 0) {
    notify(`プールが上限（${POOL_SAFETY_MAX}個）に達しているため追加できません。`);
    return { ...none, overflow };
  }

  dispatch('SET_COMPONENT', {
    id: token.id, componentKey: DICE_DRAFT_COMPONENT_KEY, value: draft
  });

  if (!silent) {
    const lines = [
      `${faceLabel(value)} を ${added}個 プールへ追加（${before.pool.length} → ${draft.pool.length}個）`
    ];
    // 上限で捨てた分は黙って消さず、必ず伝える（runDiceDraftRoll と同じ作法）
    if (overflow > 0) lines.push(`⚠ プールが上限に達したため ${overflow}個は捨てました。`);
    logToChat(dispatch, spec, token, chatCommand, lines);
  }

  return { ok: true, added, overflow };
}

/**
 * 「これは dice.* の書式だ」の判定。副作用を持たせないこと。
 * ドラフトを使わない部屋で打たれたときの案内（js/main.js）にも使う。
 */
export function looksLikeDiceDraftPoolCommand(rawInput) {
  const input = String(rawInput).trim();
  return DICE_CHANGE_PATTERN.test(input) || DICE_ADD_PATTERN.test(input);
}

/**
 * dice.change / dice.add を実行する。registry.js が、diceDraft を宣言している
 * プラグインの部屋でだけ呼ぶ。
 *
 * @returns {boolean} 書式が合ったか。合った時点で必ず true（引数が不正で弾いたときも）。
 *   false を返すと Core がただのダイスコマンドとして再解釈してしまう。
 */
export function handleDiceDraftPoolCommand(rawInput, { spec, token, dispatch, knownSkillNames = null }) {
  const input = String(rawInput).trim();

  const change = input.match(DICE_CHANGE_PATTERN);
  if (change) {
    runDiceChange({
      spec, token, dispatch,
      from: Number(change[1]),
      to: Number(change[2]),
      count: change[3] ? Number(change[3]) : 1,
      knownSkillNames,
      chatCommand: input
    });
    return true;
  }

  const add = input.match(DICE_ADD_PATTERN);
  if (add) {
    runDiceAdd({
      spec, token, dispatch,
      value: Number(add[1]),
      count: add[2] ? Number(add[2]) : 1,
      knownSkillNames,
      chatCommand: input
    });
    return true;
  }

  return false;
}
