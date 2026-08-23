// js/room-authority-rules.js
// 「部屋そのものを左右する操作をしてよいのは誰か」の規則そのもの。状態を引数で受け取る
// 純粋関数と定数だけを置く（js/visibility.jsと同じ流儀）。
//
// 【なぜ分けたか】この規則は3か所から要る：
//   1. 画面の見せ方（押せる／押せない）      … js/room-authority.js
//   2. 権威側の歯止め（直接叩かれた場合）    … server/index.js
//   3. ホスト権威P2Pのホスト役              … js/net-host.js（P2P化の検討。docs/p2p-migration-notes.md）
// 以前は1と2がそれぞれ写しを持っていて、コード中のコメント自身が「片方だけ変えるとずれる」と
// 何度も警告していた。3が加われば写しは3つになり、ずれるのは時間の問題だったのでここへ寄せた。
//
// このファイルはブラウザ・Nodeの両方から読まれるので、location・localStorage・store等の
// 環境依存物に一切触れないこと。js/room-authority.jsの方はstoreを読むため、Nodeからは
// 読めない（net-sync.js経由でlocationに触れる）。分離しているのはそのためでもある。

/**
 * 部屋レベルの操作をしてよいか。
 * GMがまだ1人も決まっていない部屋では、全員が操作できる（所有者のいないコマは誰でも
 * 触れる、というjs/board-data-driven.jsの規則と揃えている）。全員がゲスト（表示名なし）の
 * 部屋ではGMが存在しないため、この逃げ道が無いと「誰も部屋を消せない・ラウンドを
 * 始められない」状態になる。
 *
 * @param {object} participants state.participants
 * @param {string|null} participantId 判定したい参加者。ゲストならnull
 * @returns {boolean}
 */
export function canParticipantOperateAsGm(participants, participantId) {
  const table = participants || {};
  const hasGm = Object.values(table).some(p => p.isGm);
  if (!hasGm) return true;
  return !!(participantId && table[participantId]?.isGm);
}

// GMだけが行えるアクション。js/main.js・js/round-panel.js・js/audio-dialog.jsで
// 画面上も止めているが、こちらは権威側（サーバー／ホスト役）を直接叩かれた場合の歯止め。
// ROUND_SET_READY（割り込みなしの宣言）はPL各自の意思表示なので含めない。
// ROUND_SET_PLOT（プロットの提出）も同じ理由で含めない。出すのはコマの持ち主なので、
// GM限定にすると本人が出せなくなる。プロットの一斉公開はROUND_ADVANCE_PHASE（下にある）
// が兼ねているので、進行操作の側はこの表で守られている。
export const GM_ONLY_ACTIONS = new Set([
  'SET_BCDICE_SYSTEM',
  'SET_ACTIVE_PLUGIN',
  'ADD_AUDIO_TRACK',
  // 音楽の停止（再生は全員が行える。game-store.jsのSET_AUDIO_PLAYBACK／STOP_AUDIO_PLAYBACK）。
  // 聴きたくない人は自分の環境だけミュートする（js/audio-player.js）。
  'STOP_AUDIO_PLAYBACK',
  // 音源の削除。再生中のものを消すとそのチャンネルも止まるので、開けておくと
  // 上のSTOP_AUDIO_PLAYBACKを止めた意味が無くなる。
  'REMOVE_AUDIO_TRACK',
  'ROUND_PROGRESSION_START',
  'ROUND_ADVANCE_PHASE',
  'ROUND_SET_PARTICIPANTS',
  'ROUND_PROGRESSION_END',
  // 行動済みの付け外し・次の手番への割り込み指定・ラウンド進行の設定も進行操作の一部
  'ROUND_SET_ACTED',
  'ROUND_SET_INTERRUPT',
  // 戦闘離脱の付け外しも進行操作の一部（上と同じ理由）
  'ROUND_SET_WITHDRAWN',
  'SET_ROUND_SETTINGS',
  // 入室メッセージ表示の切り替え。イニシアチブ設定と同じ権限判定に揃える。
  'SET_SHOW_ENTRY_MESSAGES',
  // マス目への吸着の切り替え。盤面の見た目（マス目の線）と全員の操作感を左右するので、
  // 背景設定と同じくGM限定。
  'SET_GRID_SNAP',
  // 入室メッセージ本体の追加は、名乗り（IDENTIFY）の処理から権威側だけが直接dispatchする
  // （このGM_ONLY_ACTIONSチェックを経由しない）。ここに入れているのは、直接WebSocketで
  // このACTIONを騙って偽の入室メッセージを流し込まれないようにする歯止め。
  'ADD_ENTRY_MESSAGE',
  // 背景と盤面サイズ（js/background-dialog.js）。部屋全体の見た目を左右するのでGM限定。
  // 画像のアップロード側（server/index.jsのIMAGE_PURPOSES.background）も同じくGM限定。
  'SET_BOARD_BACKGROUND',
  // シーン（js/scene-list-dialog.js）。作成・遷移・編集・削除はすべてGM限定。
  'SAVE_SCENE',
  'UPDATE_SCENE_META',
  'APPLY_SCENE',
  'REMOVE_SCENE',
  // 全タブのログの消去（js/log-clear-dialog.js）。一度消すと戻せないのでGM限定。
  'CLEAR_ALL_CHAT_LOGS',
  // スタンプの集計の全消し（js/stamp-panel.js）。同じく一度消すと戻せないのでGM限定。
  // 加算（COUNT_STAMP）の方は誰でもできる（自分が押した枚数が増えるだけ）。
  'RESET_STAMP_COUNTS',
  // GMの付け外しと参加者の削除もGM限定。ここが空いていると、誰でも自分をGMにしてから
  // 上の操作を通せてしまい、他の制限がすべて無意味になる。
  'SET_PARTICIPANT_GM',
  'REMOVE_PARTICIPANT',
  // 読み込んだ部屋データの情報をGMが引き取る操作（js/state-import.js）。情報系で唯一の
  // GM限定アクション：ここが空いていると、誰でも「読み込んだ限定公開の情報」を丸ごと
  // 自分宛てにして読めてしまう。
  'CLAIM_RESTORED_INFO'
  // 情報（js/info-panel.js）のADD/UPDATE/REMOVE_INFO_ENTRY・SET_INFO_SECTION_AUDIENCEは、
  // GM以外も作成・開示できる機能なので入れない。「編集・削除できるのは作成者とGM」は
  // 画面側（js/info-panel.jsのcanEditEntry）だけの制限で、権威側は強制しない。
  // これはコマの所有者チェック（board-data-driven.jsのcanOperateToken）と同じ姿勢。
  // 発言の編集（EDIT_CHAT_MESSAGE）も同じ扱い：「直せるのは発言者本人とGMだけ」は画面側
  // （js/room-authority.jsのcanEditChatEntry）だけの制限。全消しのCLEAR_ALL_CHAT_LOGSと違い、
  // 1件の本文が書き換わるだけで元の発言者・時刻は残るため、GM限定の表には入れない。
]);
