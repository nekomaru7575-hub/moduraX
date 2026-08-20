// js/net-transport-ws.js
// js/net-transport.jsの契約を、今までどおりのWebSocketで満たす実装。
// 中身はもともとjs/net-sync.jsのconnect()にあったものをそのまま移しただけで、
// 挙動は一切変えていない（変えると「差し替えられること」の確認にならないため）。
//
// server/index.jsが静的ファイル配信とWebSocketを同じポートで行っているため、
// 接続先は「今このページを配信しているホスト」から自動で求める（手動での書き換え不要）。
// location.search（?room=room-3）を引き継ぎ、サーバー側でどの部屋の接続かを判別できるようにする。

import { parseUntrustedJson } from './untrusted-json.js';

const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.search;

export function createWebSocketTransport({ onOpen, onMessage, onClose }) {
  const ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => onOpen());

  ws.addEventListener('message', (event) => {
    let message;
    try {
      // サーバーは他の参加者の操作をそのまま中継するため、ここも自分が書いたJSONではない
      message = parseUntrustedJson(event.data);
    } catch {
      return;
    }
    onMessage(message);
  });

  ws.addEventListener('close', (event) => onClose({ code: event.code }));

  // 失敗の通知はcloseへ一本化する（errorの後には必ずcloseが来る）
  ws.addEventListener('error', () => ws.close());

  return {
    send(message) {
      if (ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(message));
      return true;
    },
    isOpen() {
      return ws.readyState === WebSocket.OPEN;
    },
    close() {
      ws.close();
    }
  };
}
