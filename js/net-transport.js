// js/net-transport.js
// 「同期のメッセージを運ぶ道」の契約と、どの実装を使うかの選択。
//
// js/net-sync.jsはプロトコル（INIT / ACTION / RESYNC / IDENTIFY / TYPING_USERS /
// ENTRY_REQUIRED …）だけを担い、それをWebSocketで運ぶのかWebRTCのDataChannelで運ぶのかは
// 知らない。P2P化の検討（docs/p2p-migration-notes.md）で分かったのは、いまの同期が
// 「サーバー権威＋クライアントは送受信の口だけ」という形をしているおかげで、
// **プロトコルを一切変えずにトランスポートだけ差し替えられる**ということ。その差し替え口。
//
// 【契約】
//   createTransport({ onOpen, onMessage, onClose }) => {
//     send(message)  … オブジェクトを渡す。文字列化は実装側の責任。
//                      送れなかった場合はfalseを返す（例外は投げない）
//     isOpen()       … 今送れるか
//     close()        … こちらから切る
//   }
//   onOpen()             … 繋がった
//   onMessage(message)   … パース済みのオブジェクト1件。信用しないJSONとして
//                          読むところまで実装側の責任（parseUntrustedJson）
//   onClose({ code })    … 切れた。codeは下のCLOSE_CODES
//
// 実装は接続を1本だけ持ち、繋ぎ直しは行わない（再接続はjs/net-sync.jsの仕事）。
// createTransportを呼ぶたびに新しい接続が1本できる、と考えてよい。

import { createWebSocketTransport } from './net-transport-ws.js';
import { createRtcGuestTransport } from './net-transport-rtc.js';

// 切断の理由。もともとWebSocketのcloseコード（server/index.jsのws.close(4000, ...)等）
// だが、意味はプロトコル側にあってWebSocket固有ではない。WebRTC実装も同じ値を立てて
// 返すこと——js/net-sync.jsはこの値だけを見て「繋ぎ直す／部屋一覧へ戻す」を決めている。
export const CLOSE_CODES = {
  INVALID_ROOM: 4000,  // 部屋IDが不正
  ROOM_NOT_FOUND: 4004, // まだ作られていない部屋
  ROOM_DELETED: 4005,  // 部屋が削除された
  ENTRY_REJECTED: 4006 // 入室パスワードを通らなかった（試行回数超過・待ち時間切れ）
};

// WebRTCを一度も張れなかったら、この読み込みの間はもう試さない。
// TURNを用意していない以上、張れない相手（Symmetric NAT）とは何度やっても張れないので、
// 繋ぎ直しのたびに8秒待たされるのが一番たちが悪い。
let rtcGaveUp = false;

// この画面がホスト役として動くか。`?net=rtc&host=1` のときだけ。
// スパイクの間は明示指定でよい——「部屋を建てた人が自動でホスト」は部屋一覧
// （/api/rooms）の作り替えを巻き込むので、成立性が確認できてから。
export function isHostMode() {
  const params = new URLSearchParams(location.search);
  return params.get('net') === 'rtc' && params.get('host') === '1';
}

/**
 * このページで使うトランスポートを1本作る。
 *
 * 既定はWebSocket（今までどおり）。`?net=rtc` が付いているときだけWebRTCを試し、
 * 張れなければWebSocketへ落ちる（＝**併存**。P2Pが成立しない人だけ今までどおりになる）。
 * 既定を入れ替えるのは疎通が確認できてから（docs/p2p-migration-notes.md のStep B）。
 */
export function createTransport(handlers) {
  const wantsRtc = new URLSearchParams(location.search).get('net') === 'rtc';
  if (!wantsRtc || rtcGaveUp) return createWebSocketTransport(handlers);

  // 一度も開かないまま閉じた＝張れなかった。以後はWebSocketへ。
  let everOpened = false;
  return createRtcGuestTransport({
    onOpen: () => {
      everOpened = true;
      handlers.onOpen();
    },
    onMessage: handlers.onMessage,
    onClose: (info) => {
      if (!everOpened) {
        rtcGaveUp = true;
        console.warn('[net-transport] WebRTCで繋がらなかったので、以後はWebSocketで同期します');
      }
      handlers.onClose(info);
    }
  });
}
