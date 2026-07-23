// server/index.js
// 盤面・チャットの状態をリアルタイムに同期するためのWebSocketサーバー。
// クライアントと同じreducer（js/game-store.js）を使い、サーバー自身が
// 「今のセッションの正しい状態」を常に保持する（サーバー権威型リレー）。
//
// 起動: node server/index.js　（ポートは環境変数PORTで上書き可、既定8081）

import { WebSocketServer, WebSocket } from 'ws';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { store } from '../js/game-store.js';
import { EventBus } from '../js/EventBus.js';

const PORT = Number(process.env.PORT) || 8081;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'state.json');
const SAVE_DEBOUNCE_MS = 1000;

async function loadPersistedState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    const state = JSON.parse(raw);
    store.hydrate(state);
    console.log(`[server] 保存済み状態を復元しました: ${STATE_FILE}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[server] 保存済み状態の読み込みに失敗しました:', error.message);
    }
  }
}

let saveTimer = null;
function schedulePersist() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await writeFile(STATE_FILE, JSON.stringify(store.state));
    } catch (error) {
      console.warn('[server] 状態の保存に失敗しました:', error.message);
    }
  }, SAVE_DEBOUNCE_MS);
}

EventBus.subscribe('STATE_CHANGED', schedulePersist);

await loadPersistedState();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log(`[server] クライアント接続（現在${wss.clients.size}件）`);

  ws.send(JSON.stringify({ type: 'INIT', state: store.state }));

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      store.hydrate(message.state);

      const outgoing = JSON.stringify({ type: 'INIT', state: store.state });
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(outgoing);
        }
      });
      return;
    }

    if (message.type !== 'ACTION') return;

    store.dispatch(message.action, message.payload);

    const outgoing = JSON.stringify({ type: 'ACTION', action: message.action, payload: message.payload });
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(outgoing);
      }
    });
  });

  ws.on('close', () => {
    console.log(`[server] クライアント切断（残り${wss.clients.size - 1}件）`);
  });
});

console.log(`[server] WebSocketサーバーを起動しました: ws://localhost:${PORT}`);
