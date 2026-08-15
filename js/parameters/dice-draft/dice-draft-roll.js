// js/parameters/dice-draft/dice-draft-roll.js
// 「ダイスを振ってドラフトのプールへ入れる」共通処理。
// ステラナイツの charge(n) も、ドラクルージュの treat(n) も、書式が違うだけで中身は同じなので
// ここへ寄せてある。各プラグインのコマンドハンドラは書式の判定だけをすればよい。
//
// js/parameters/saikoro-fiction/skill-check.js の runSkillCheck と同じ流儀で、
// dispatch / rollBCDice といった依存は全部引数で受け取る（game-store.js を import すると
// game-store.js → registry.js → プラグイン → ここ → game-store.js の循環になる）。

import { MAX_ANIMATED_DICE } from '../../dice-notation.js';
import { addDiceToPool, createDie, normalizeDraft } from './dice-draft-model.js';

export const DICE_DRAFT_COMPONENT_KEY = 'diceDraft';
const MAIN_TAB_ID = 'main';

/** コマの components から正規形のドラフトを取り出す。読み出しは必ずここを通す。 */
export function readDraft(components, knownSkillNames = null) {
  return normalizeDraft(components?.[DICE_DRAFT_COMPONENT_KEY], knownSkillNames);
}

/**
 * ダイスを振ってプールへ入れ、演出とチャットログを出す。
 *
 * 非同期（BCDiceへのfetch）なので何も返さない。チャットコマンドのハンドラは、書式が合った
 * 時点で即 true を返すこと（false を返すと Core がただのダイスロールとして再解釈してしまう）。
 *
 * @param {{
 *   spec: object,            createDiceDraftSpec() の戻り値
 *   token: object|null,      参照キャラクター
 *   dispatch: (action: string, payload: object) => void,
 *   rollBCDice: ((system: string, command: string) => Promise<object>)|null,
 *   count: number,           振る個数
 *   knownSkillNames?: string[]|null,
 *   chatCommand?: string     これを起こしたチャットコマンド（ログに残す）
 * }} options
 */
export function runDiceDraftRoll({
  spec, token, dispatch, rollBCDice, count, knownSkillNames = null, chatCommand = ''
}) {
  if (!token) {
    alert('ダイスを振るキャラクターを選択してください。');
    return;
  }
  if (!rollBCDice) {
    alert('この画面ではダイスを振れません。部屋の中で実行してください。');
    return;
  }
  if (!Number.isInteger(count) || count < 1) {
    alert('ダイスの個数には 1 以上の整数を指定してください。');
    return;
  }

  // B はバラ振り＝合計せず個々の目を返す記法。ドラフトは1個ずつ扱うのでこれでなければならない。
  const command = `${count}B${spec.diceSides}`;

  rollBCDice(spec.bcdiceSystem, command).then(({ success, resultText, diceValues }) => {
    if (!success) {
      alert(`ダイスロールに失敗しました: ${resultText}`);
      return;
    }

    // プールへは切り詰めずに全件入れる。MAX_ANIMATED_DICE は演出だけの上限で、
    // ゲーム上の個数を削ってはいけない（js/parameters/stella-knights.js の charge と同じ扱い）。
    const rolled = (diceValues ?? [])
      .filter(rand => Number.isInteger(rand?.value))
      .map(rand => createDie(rand.sides, rand.value));

    const before = readDraft(token.components, knownSkillNames);
    const { draft, added, overflow } = addDiceToPool(before, rolled);

    if (added > 0) {
      dispatch('SET_COMPONENT', {
        id: token.id, componentKey: DICE_DRAFT_COMPONENT_KEY, value: draft
      });
    }

    if (diceValues?.length) {
      dispatch('ROLL_DICE_ANIMATION', {
        tabId: MAIN_TAB_ID,
        dice: diceValues.slice(0, MAX_ANIMATED_DICE)
      });
    }

    const diceDetail = rolled.length > 0 ? rolled.map(die => die.value).join(', ') : '';
    const lines = [
      `${spec.label}を振る: ${command}`,
      resultText,
      added > 0
        ? `プールへ ${added}個 追加（${before.pool.length} → ${draft.pool.length}個）`
        : 'プールへ追加された目はありませんでした。'
    ];
    // 上限で捨てた分は黙って消さず、必ず伝える（「振ったのに増えない」を無言にしない）
    if (overflow > 0) lines.push(`⚠ プールが上限に達したため ${overflow}個は捨てました。`);

    dispatch('ADD_CHAT_MESSAGE', {
      tabId: MAIN_TAB_ID,
      entry: {
        system: spec.label,
        character: token.name || '',
        characterId: token.id || null,
        color: token.textColor || null,
        command: chatCommand || command,
        diceDetail,
        resultText: lines.join('\n')
      }
    });
  }).catch(error => {
    alert(`ダイスロールでエラーが発生しました: ${error.message}`);
  });
}
