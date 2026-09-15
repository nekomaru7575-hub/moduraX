// js/room-roll.js
// 部屋の中で振るダイスの入口。BCDiceで振ったあと、その部屋のシステムが部屋に掛けている効果で
// 結果を書き換えさせる（銀剣のステラナイツの「始まりの部屋」で出目を変える）。
//
// 部屋の中でダイスを振る経路（チャットのロール・パラメータ変更やバフの値・オリジナル表・
// プラグインのコマンドと拡張判定UI）は、js/BCdice.js を直接呼ばずにここを通す。
// 1か所で書き換えるので、3Dダイス・ログ・プールへ入る目がどの経路でも揃う。
//
// 部屋の外（コマ作成ツールなど）は部屋の効果が無いので、今までどおり js/BCdice.js を使えばよい。

import { rollBCDice } from './BCdice.js';
import { applyPluginRollTransform } from './parameters/registry.js';

/**
 * @param {object} state 振った時点の部屋の状態（store.state）。効果は振った時点のものを当てる
 * @param {string} system BCDiceのシステムID
 * @param {string} command BCDiceへ送る文字列
 * @returns {Promise<object>} js/BCdice.js の rollBCDice と同じ形
 */
export async function rollRoomDice(state, system, command) {
  const pluginId = state?.room?.activePlugin ?? null;
  const extensions = state?.room?.extensions ?? {};
  const result = await rollBCDice(system, command);
  return applyPluginRollTransform(pluginId, { command, result, extensions });
}

/** store を受け取り、rollBCDice と同じ呼び方ができる関数を返す（プラグインへ渡す口） */
export function createRoomRoller(store) {
  return (system, command) => rollRoomDice(store.state, system, command);
}
