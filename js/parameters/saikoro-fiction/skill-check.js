// js/parameters/saikoro-fiction/skill-check.js
// サイコロ・フィクション共通の「特技判定」の実行とチャットへの出力。
// 表UI（skill-table-box.js の判定モード）からも、チャットコマンド（プラグインの
// handleChatCommand）からも、必ずこの runSkillCheck を通す。
//
// BCDiceのシステムIDは部屋の設定（room.bcdiceSystem）とは別軸なので、プラグインが
// 自分のシステムID（'Shinobigami' 等）を渡す。DX3が rollBCDice('DoubleCross', …) と
// 指定しているのと同じ考え方（js/parameters/dx3-combo-box.js 参照）。

import { resolveSkillCheck, normalizeCheckOptions } from './skill-table.js';

// 特技判定(隠形術) / 特技判定(忍術:7) の形。分野と出目でも指定できるようにしているのは、
// 特技名を後から修正しても書き換えずに済むようにするため。
export const SKILL_CHECK_COMMAND_PATTERN = /^特技判定\((.+)\)$/;

/** チャット欄に貼れる特技判定コマンドの文字列 */
export function buildSkillCheckCommand(skillName) {
  return `特技判定(${skillName})`;
}

/**
 * 判定内容の1行説明。表UIのプレビューとチャットログの見出しで同じ文言を使う。
 * @param {ReturnType<typeof resolveSkillCheck>} resolution
 */
export function describeSkillCheck(resolution) {
  const { targetCell, usedCell, distance, targetNumber, owned } = resolution;
  if (!usedCell) return `《${targetCell.name}》判定（特技を1つも取得していません）`;
  if (owned) return `《${targetCell.name}》判定（目標値${targetNumber}）`;
  return `《${targetCell.name}》判定（《${usedCell.name}》で代用・距離${distance}・目標値${targetNumber}）`;
}

/**
 * 実際にBCDiceへ投げるコマンド文字列。組み立てはシステム固有なのでspec.checkに委ねる。
 * @param {object} spec
 * @param {number} targetNumber
 * @param {object} [checkOptions] 未指定・不正な項目はspec側の既定値へ丸められる
 */
export function buildCheckCommand(spec, targetNumber, checkOptions) {
  return spec.check.buildCommand({
    options: normalizeCheckOptions(spec, checkOptions),
    targetNumber
  });
}

// DX3の logToMain（js/parameters/dx3-combo-box.js）と同型。プラグインからチャットへ
// 結果を流す口はこれだけ（Coreの applyLog はプラグインに渡されていない）。
// chatCommand: これを起こしたチャットコマンド。特技表のマスをクリックして振った場合は
// 打ったコマンドが無いのでundefinedのままでよい。
function logToMain(dispatch, resultText, token, system, chatCommand) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: 'main',
    entry: {
      system,
      character: token?.name || '',
      characterId: token?.id || null,
      color: token?.textColor || null,
      command: chatCommand,
      resultText
    }
  });
}

/**
 * 特技判定を実行してメインチャットに結果を流す。
 * @param {{
 *   spec: object,               createSkillTableSpec() の戻り値
 *   state: {acquired:string[], filledGaps:number[]},  normalizeSkillTableState 済みのもの
 *   targetCellId: string,
 *   token: object|null,
 *   dispatch: (action:string, payload:object) => void,
 *   rollBCDice: (system:string, command:string) => Promise<{success:boolean, resultText:string}>,
 *   bcdiceSystem: string,
 *   checkOptions?: object,      判定オプション（省略時はspecの既定値）
 *   systemLabel?: string        チャットログの「システム」欄に出す名前
 *   chatCommand?: string        これを起こしたチャットコマンド（表から振った場合は無し）
 * }} options
 */
export async function runSkillCheck({
  spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem,
  checkOptions, systemLabel = '特技判定', chatCommand
}) {
  const resolution = resolveSkillCheck(spec, state, targetCellId);
  if (!resolution) {
    alert('その特技は特技表に存在しません。');
    return;
  }
  if (!resolution.usedCell) {
    alert('特技を1つも取得していません。特技表から取得する特技を選んでください。');
    return;
  }
  if (!rollBCDice) {
    alert('この画面ではダイスを振れません。部屋の中で実行してください。');
    return;
  }

  const heading = describeSkillCheck(resolution);
  // スペシャル/ファンブルの判定はBCDice側がコマンド（シノビガミならSG）の中で行い、
  // 結果テキストに含めて返してくれるので、こちらはコマンドを組み立てるだけでよい。
  const command = buildCheckCommand(spec, resolution.targetNumber, checkOptions);

  try {
    const { success, resultText } = await rollBCDice(bcdiceSystem, command);
    if (!success) {
      alert(`特技判定に失敗しました: ${resultText}`);
      return;
    }
    logToMain(dispatch, `${heading}\n${resultText}`, token, systemLabel, chatCommand);
  } catch (error) {
    alert(`特技判定でエラーが発生しました: ${error.message}`);
  }
}
