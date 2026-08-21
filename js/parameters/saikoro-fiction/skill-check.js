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

/**
 * 判定内容の1行説明。表UIのプレビューとチャットログの見出しで同じ文言を使う。
 * @param {ReturnType<typeof resolveSkillCheck>} resolution
 */
export function describeSkillCheck(resolution) {
  const { targetCell, usedCell, distance, targetNumber, owned } = resolution;
  if (!usedCell) return `《${targetCell.name}》判定（代用できる特技がありません）`;
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

/**
 * 判定コマンドに渡す値と目標値に、そのキャラクター固有の修正を反映する。
 * 何をどう足すかはシステム固有なので spec.check.resolve に委ね、宣言が無ければ素通し。
 * （シノビガミはダイス数修正・判定値修正・スペシャル値修正・ファンブル値修正を持つ）
 *
 * @param {object} spec
 * @param {{
 *   options?: object,  判定コマンドに渡す値。省略時はspecの既定値
 *   targetNumber: number,
 *   token?: object|null, getEffectiveParameterValue?: Function
 * }} context
 * @returns {{options: object, targetNumber: number, notes: string[]}}
 *   notesは「何がどう効いたか」の説明。判定のログへ添えて、修正が乗ったことを卓に見せる。
 */
export function resolveCheckAdjustments(spec, { options, targetNumber, token, getEffectiveParameterValue }) {
  const normalized = normalizeCheckOptions(spec, options);
  if (typeof spec.check.resolve !== 'function') {
    return { options: normalized, targetNumber, notes: [] };
  }

  // パラメータの実効値（基礎値＋バフ）を引く口。コマが無い場面（コマ作成ツール等）では0。
  const getParam = (paramId) => {
    if (!token) return 0;
    if (getEffectiveParameterValue) return getEffectiveParameterValue(token, paramId) ?? 0;
    return token.parameters?.[paramId]?.value ?? 0;
  };

  const result = spec.check.resolve({
    options: normalized,
    targetNumber,
    getParam
  }) || {};

  return {
    options: normalizeCheckOptions(spec, result.options ?? normalized),
    targetNumber: Number.isFinite(result.targetNumber) ? result.targetNumber : targetNumber,
    notes: Array.isArray(result.notes) ? result.notes : []
  };
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
 *   getEffectiveParameterValue?: Function
 *     キャラクター固有の修正（シノビガミのAdB等）を実効値で引くために使う。
 *     渡されない場合は基礎値、tokenが無ければ0として扱う（resolveCheckAdjustments）。
 *   systemLabel?: string        チャットログの「システム」欄に出す名前
 *   chatCommand?: string        これを起こしたチャットコマンド（表から振った場合は無し）
 * }} options
 */
export async function runSkillCheck({
  spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem,
  getEffectiveParameterValue, systemLabel = '特技判定', chatCommand
}) {
  const resolution = resolveSkillCheck(spec, state, targetCellId);
  if (!resolution) {
    alert('その特技は特技表に存在しません。');
    return;
  }
  if (!resolution.usedCell) {
    alert('代用できる特技がありません。特技表から取得する特技を選んでください（枠を失った分野の特技は代用にも使えません）。');
    return;
  }
  if (!rollBCDice) {
    alert('この画面ではダイスを振れません。部屋の中で実行してください。');
    return;
  }

  // キャラクター固有の修正（シノビガミの忍法が付けたバフ等）を先に反映してから、
  // 見出しもコマンドも「実際に振る値」で組む。反映前の目標値で見出しを作ると、
  // ログの目標値とコマンドの>=の値が食い違って読めなくなる。
  const adjusted = resolveCheckAdjustments(spec, {
    targetNumber: resolution.targetNumber,
    token,
    getEffectiveParameterValue
  });

  const noteText = adjusted.notes.length > 0 ? `\n${adjusted.notes.join('、')}` : '';
  const heading = describeSkillCheck({ ...resolution, targetNumber: adjusted.targetNumber }) + noteText;
  // スペシャル/ファンブルの判定はBCDice側がコマンド（シノビガミならSG）の中で行い、
  // 結果テキストに含めて返してくれるので、こちらはコマンドを組み立てるだけでよい。
  const command = buildCheckCommand(spec, adjusted.targetNumber, adjusted.options);

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
