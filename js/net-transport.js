// js/net-transport.js
// 「同期のメッセージを運ぶ道」の契約と、切断の理由。
//
// js/net-sync.jsはプロトコル（INIT / ACTION / RESYNC / IDENTIFY / TYPING_USERS /
// ENTRY_REQUIRED …）だけを担い、それをWebSocketで運ぶのかWebRTCのDataChannelで運ぶのかは
// 知らない。P2P化の検討（docs/p2p-migration-notes.md）で分かったのは、いまの同期が
// 「権威＋クライアントは送受信の口だけ」という形をしているおかげで、**プロトコルを一切
// 変えずにトランスポートだけ差し替えられる**ということ。その差し替え口。
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
//
// 【どちらを使うかはここでは決めない】P2P卓（?net=rtc）はシグナリングで役割が決まって
// からでないとホストかゲストかが分からないので、組み立てはjs/net-sync.jsが行う。
// ここが両方をimportすると、CLOSE_CODESを読みたいだけのjs/net-host.jsと循環する。

import { createWebSocketTransport } from './net-transport-ws.js';

// 切断の理由。もともとWebSocketのcloseコード（server/index.jsのws.close(4000, ...)等）
// だが、意味はプロトコル側にあってWebSocket固有ではない。WebRTC実装も同じ値を立てて
// 返すこと——js/net-sync.jsはこの値だけを見て「繋ぎ直す／部屋一覧へ戻す」を決めている。
export const CLOSE_CODES = {
  INVALID_ROOM: 4000,  // 部屋IDが不正
  ROOM_NOT_FOUND: 4004, // まだ作られていない部屋
  ROOM_DELETED: 4005,  // 部屋が削除された
  ENTRY_REJECTED: 4006, // 入室パスワードを通らなかった（試行回数超過・待ち時間切れ）
  TOO_MANY_CONNECTIONS: 4008, // サーバー全体の同時接続数が上限
  TOO_MANY_ACTIVE_ROOMS: 4009, // 同時に動いている卓が上限。この卓は今から始められない
  // P2Pで開かれている卓へ、従来のWebSocketで入ろうとした。サーバーは中身を渡さない。
  // 断るのは、渡してしまうと**ホストと参加者が黙って2つのセッションに割れる**ため
  // （docs/p2p-migration-notes.mdの4-④）。js/net-sync.jsが?net=rtcを足して入り直す。
  ROOM_IS_P2P: 4010
};

/** この画面がP2P卓として振る舞うか。部屋一覧が付ける `?net=rtc` で決まる。 */
export function isP2pMode() {
  return new URLSearchParams(location.search).get('net') === 'rtc';
}

/**
 * 従来どおりのWebSocketの道を1本作る。
 * P2P卓の組み立て（シグナリング→役割→ホスト役かRTCトランスポート）はjs/net-sync.jsにある。
 */
export function createTransport(handlers) {
  return createWebSocketTransport(handlers);
}
