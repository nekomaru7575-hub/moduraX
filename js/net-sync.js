// js/net-sync.js
// ブラウザ側のWebSocketクライアント。store.dispatchをラップして、ローカル適用に加えて
// サーバーへアクションを送信し、サーバー・他クライアントからのアクションをローカルに適用する。
//
// 本番のサーバーに向き先を変える際は、このWS_URLを書き換えるだけでよい。
const WS_URL = 'ws://localhost:8081';

const RECONNECT_DELAY_MS = 2000;

import { store } from './game-store.js';
import { EventBus } from './EventBus.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

let ws = null;

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  ws = new WebSocket(WS_URL);

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
      store.hydrate(message.state);
      return;
    }

    if (message.type === 'ACTION') {
      localDispatch(message.action, message.payload);
    }
  });

  ws.addEventListener('close', () => {
    EventBus.emit('NET_STATUS_CHANGED', 'disconnected');
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
