// js/store/room.js
// 部屋そのものの既定値と、部屋の設定を読むための小さな述語。
//
// ここに置いてあるのは「ルーム変数（room.parameters）をラウンド進行から導く処理」と、
// 「この機能より前に保存された部屋にはキーが無いので、必ずこれを通して読む」種類の
// 設定の読み取り。どちらも、状態のどこを見るかを1か所に閉じ込めるためのもの。

import { buildDefaultRoomParameters } from '../parameters/core.js';
import { applyPluginDerivedRoomParameters } from '../parameters/registry.js';
import {
  ROOM_STAMP_TOTAL_SOURCE, roomStampTotalLabel, roomStampTotalParamId
} from './stamps.js';

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
 * 「集計する」を選んだ部屋のスタンプ（room.stamps）の合計を、ルーム変数へ反映する。
 *
 * 変数はスタンプ1件につき1つで、名前は「（スタンプ名）合計」、値は全参加者ぶんの総和
 * （ステラナイツのブーケ合計と同じ数え方）。**この関数が唯一の作り手であり消し手**で、
 * 「集計するスタンプが在る」ことだけが変数が在ってよい理由になる。だから：
 *   ・集計をやめた／スタンプを消した → 変数も消える（残しても更新されない値になるだけ）
 *   ・スタンプの名前を変えた → 変数の名前も追随する
 *   ・取り込んだ部屋データに知らない合計が入っていた → 裏付けが無いので落ちる
 * 手で書き換えられないよう editable:false、消せないよう locked:true にしてあるのは
 * 「現在のラウンド」（withCoreRoomParameters）と同じ理由。
 *
 * 【名前がぶつかりうる】スタンプ名は利用者が決める文字列なので、「ブーケ合計」のように
 * 他のルーム変数と同じ名前になることがある。IDは別なので状態は壊れないが、チャットの
 * {ブーケ合計} は先に見つかったほうを拾う。名前を分けてもらうしかない。
 *
 * 変化が無ければ同じ参照を返す（呼び出し側が差分検知に使う）。
 */
function withRoomStampTotals(parameters, stamps, stampCounts) {
  const wanted = new Map();
  Object.values(stamps || {}).forEach(stamp => {
    if (!stamp?.counted) return;
    const perParticipant = stampCounts?.[stamp.id] || {};
    // 壊れた値（保存データを手で書き換えられた等）が混ざっていても合計を壊さない
    const total = Object.values(perParticipant)
      .reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0);
    wanted.set(roomStampTotalParamId(stamp.id), {
      label: roomStampTotalLabel(stamp.label), value: total
    });
  });

  const existing = Object.keys(parameters)
    .filter(paramId => parameters[paramId]?.source === ROOM_STAMP_TOTAL_SOURCE);

  const stale = existing.filter(paramId => !wanted.has(paramId));
  const changed = [...wanted].filter(([paramId, next]) => {
    const current = parameters[paramId];
    return !current || current.value !== next.value || current.label !== next.label;
  });
  if (stale.length === 0 && changed.length === 0) return parameters;

  const nextParameters = { ...parameters };
  stale.forEach(paramId => { delete nextParameters[paramId]; });
  changed.forEach(([paramId, next]) => {
    nextParameters[paramId] = Object.freeze({
      key: paramId.slice(paramId.indexOf(':') + 1),
      label: next.label,
      value: next.value,
      source: ROOM_STAMP_TOTAL_SOURCE,
      locked: true,
      editable: false,
      visible: true,
      roundOnly: false
    });
  });
  return nextParameters;
}

/**
 * 「部屋全体から決まるルーム変数」を計算し直したroomを返す（Coreの現在のラウンド、
 * 集計するスタンプの合計、ステラナイツのブーケ合計）。プラグイン側の分は何を計算するかを
 * プラグイン（computeDerivedRoomParameters）が決め、Coreは材料を渡すだけで中身を解釈しない。
 * 変化が無ければ同じroomの参照を返す。
 *
 * 呼ぶのは「材料が変わりうるところ」すべて：ラウンド進行（ROUND_PROGRESSION_START・
 * ROUND_ADVANCE_PHASE・ROUND_PROGRESSION_END）、スタンプの集計（COUNT_STAMP・
 * RESET_STAMP_COUNTS）、部屋のスタンプの増減と編集（ADD_ROOM_STAMP・REMOVE_ROOM_STAMP）、
 * システムの切り替え（SET_ACTIVE_PLUGIN）、そして状態の丸ごと差し替え（hydrate）。
 * hydrateでも通すのが肝で、こうしておくとルーム変数は常に材料から導かれた値になり、
 * 単独でズレたまま残ることがない。
 *
 * 【roomは「これから入る値」を渡すこと】スタンプを足したり消したりする側は、
 * 更新後のroom（新しいstamps）を渡す。prevStateのroomを渡すと、変数だけが1手遅れる。
 */
export function withDerivedRoomParameters(room, stampCounts, round) {
  const counts = stampCounts || {};
  const parameters = applyPluginDerivedRoomParameters(
    room?.activePlugin ?? null,
    withRoomStampTotals(
      withCoreRoomParameters(room?.parameters || {}, round), room?.stamps, counts
    ),
    { stampCounts: counts }
  );
  // プラグイン未適用のときはapplyPluginDerivedRoomParametersが素通しで返すので、
  // 手前で作った新しいオブジェクトはここで凍らせる。
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
