// js/net-sync.js
// ブラウザ側のWebSocketクライアント。store.dispatchをラップして、ローカル適用に加えて
// サーバーへアクションを送信し、サーバー・他クライアントからのアクションをローカルに適用する。
//
// server/index.jsが静的ファイル配信とWebSocketを同じポートで行っているため、
// 接続先は「今このページを配信しているホスト」から自動で求める（手動での書き換え不要）。
// location.search（?room=room-3）を引き継ぎ、サーバー側でどの部屋の接続かを判別できるようにする。
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.search;

const RECONNECT_DELAY_MS = 2000;

// サーバーが「不正な部屋ID」「未作成（空き）の部屋」を理由に切断する際のcloseコード
// （server/index.jsのws.close(4000/4004, ...)と対応させている）。
const INVALID_ROOM_CLOSE_CODES = new Set([4000, 4004]);

import { store } from './game-store.js';
import { EventBus } from './EventBus.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

let ws = null;

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  ws = new WebSocket(WS_URL);
  let hasReceivedInit = false;

  ws.addEventListener('open', () => {
    EventBus.emit('NET_STATUS_CHANGED', 'connected');
  });

  ws.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (message.type === 'INIT') {
      hasReceivedInit = true;
      store.hydrate(message.state);
      return;
    }

    if (message.type === 'ACTION') {
      localDispatch(message.action, message.payload);
    }
  });

  ws.addEventListener('close', (event) => {
    EventBus.emit('NET_STATUS_CHANGED', 'disconnected');

    // 一度もINITを受け取れないまま、不正/未作成の部屋を理由に切断された場合は、
    // 再接続を試みても無駄なので部屋一覧へ案内する。
    if (!hasReceivedInit && INVALID_ROOM_CLOSE_CODES.has(event.code)) {
      alert('この部屋には接続できませんでした（存在しないか、まだ作成されていません）。部屋一覧へ戻ります。');
      window.location.href = '/';
      return;
    }

    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

export function initNetSync() {
  // ローカルでの操作をサーバーへ転送する。サーバー由来のアクション適用はlocalDispatchを
  // 直接呼ぶため、ここは通らない（再送信ループにならない）。
  store.dispatch = (action, payload) => {
    localDispatch(action, payload);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ACTION', action, payload }));
    }
  };

  connect();
}

// ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと
// 置き換える。ローカルには即座に反映し、サーバーには別途通知して他クライアントにも
// ブロードキャストしてもらう（ADD_CHAT_MESSAGE等の通常アクションとは別経路）。
export function replaceState(newState) {
  store.hydrate(newState);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'REPLACE_STATE', state: newState }));
  }
}
