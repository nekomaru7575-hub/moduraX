// js/store/room.js
// 部屋そのものの既定値と、部屋の設定を読むための小さな述語。
//
// ここに置いてあるのは「ルーム変数（room.parameters）をラウンド進行から導く処理」と、
// 「この機能より前に保存された部屋にはキーが無いので、必ずこれを通して読む」種類の
// 設定の読み取り。どちらも、状態のどこを見るかを1か所に閉じ込めるためのもの。

import { buildDefaultRoomParameters } from '../parameters/core.js';
import { applyPluginDerivedRoomParameters } from '../parameters/registry.js';

// Core自身のルーム変数「現在のラウンド」（js/parameters/core.js）のID。
export const ROUND_ROOM_PARAM_ID = 'core:round';

/**
 * Coreのルーム変数を、今のラウンド進行の状態に合わせる。
 * プラグインの自動計算（computeDerivedRoomParameters）と同じ「材料から導く値」で、
 * 進行していない間は0。この機能より前に作られた部屋にはそもそも変数が無いので、
 * 無ければここで作る（registry.jsのwithMissingPluginRoomParametersと同じ狙い）。
 * 変化が無ければ同じ参照を返す。
 */
export function withCoreRoomParameters(parameters, round) {
  const roundNumber = round?.active ? (round.roundNumber || 0) : 0;

  const current = parameters[ROUND_ROOM_PARAM_ID];
  if (current && current.value === roundNumber) return parameters;

  const base = current || buildDefaultRoomParameters()[ROUND_ROOM_PARAM_ID];
  return { ...parameters, [ROUND_ROOM_PARAM_ID]: Object.freeze({ ...base, value: roundNumber }) };
}

/**
 * 「部屋全体から決まるルーム変数」を計算し直したroomを返す（Coreの現在のラウンド、
 * ステラナイツのブーケ合計）。プラグイン側の分は何を計算するかをプラグイン
 * （computeDerivedRoomParameters）が決め、Coreは材料を渡すだけで中身を解釈しない。
 * 変化が無ければ同じroomの参照を返す。
 *
 * 呼ぶのは「材料が変わりうるところ」すべて：ラウンド進行（ROUND_PROGRESSION_START・
 * ROUND_ADVANCE_PHASE・ROUND_PROGRESSION_END）、スタンプの集計（COUNT_STAMP・
 * RESET_STAMP_COUNTS）、システムの切り替え（SET_ACTIVE_PLUGIN）、そして状態の丸ごと
 * 差し替え（hydrate）。hydrateでも通すのが肝で、こうしておくとルーム変数は常に
 * 材料から導かれた値になり、単独でズレたまま残ることがない。
 */
export function withDerivedRoomParameters(room, stampCounts, round) {
  const parameters = applyPluginDerivedRoomParameters(
    room?.activePlugin ?? null,
    withCoreRoomParameters(room?.parameters || {}, round),
    { stampCounts: stampCounts || {} }
  );
  // プラグイン未適用のときはapplyPluginDerivedRoomParametersが素通しで返すので、
  // withCoreRoomParametersが作った新しいオブジェクトはここで凍らせる。
  return parameters === room.parameters ? room : { ...room, parameters: Object.freeze(parameters) };
}

export const DEFAULT_TOKEN_COLOR = 'transparent';

// 新しい部屋の盤面サイズ（マス数）。背景設定ダイアログ（js/background-dialog.js）の
// 「盤面サイズを自動にする」は boardWidth/boardHeight が null かどうかで決まるので、
// ここへ値を入れることが「既定では自動にしない」と同じ意味になる。
// 既に保存されている部屋はhydrateで触らないため、nullのまま＝自動のままになる。
export const DEFAULT_BOARD_COLS = 40;
export const DEFAULT_BOARD_ROWS = 30;
// マス1つのピクセル数。描画側の定数（js/board-data-driven.jsのGRID_SIZE）と同じ値で、
// 状態はマス数ではなくピクセルで持つ約束のためここでも要る。片方だけ変えないこと。
export const BOARD_GRID_SIZE = 25;

// 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。
// この機能より前の状態にはキーが無いので、必ずこのヘルパ経由で読む。
export function usesInitiativeProcess(state) {
  return state?.room?.roundSettings?.useInitiativeProcess === true;
}

// 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。
// 既定は有効。この機能より前の状態にはキーが無いが、その場合も有効として扱いたいので
// usesInitiativeProcessとは逆に「falseの場合だけ無効」の形で読む。
export function showsEntryMessages(state) {
  return state?.room?.showEntryMessages !== false;
}

// 盤面のオブジェクト（コマ・パネル・カード・デッキ）を、離した位置からマス目へ吸着させるか
// （ルーム単位・全員共通）。既定は吸着あり。この機能より前の部屋にはキーが無いので、
// showEntryMessagesと同じく「falseの場合だけ無効」の形で読む。
// 吸着しない部屋ではマス目の線も描かない（js/board-data-driven.jsのapplyBoardBackground）。
// 大きさの指定（コマのsize、パネル/カード/デッキのcols/rows、盤面のピクセルサイズ）は
// この設定と関係なく常にマス単位のまま。
export function snapsToGrid(state) {
  return state?.room?.snapToGrid !== false;
}
