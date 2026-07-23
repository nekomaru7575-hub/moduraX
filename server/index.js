// server/index.js
// 盤面のHTML/JS/画像などの静的ファイル配信と、リアルタイム同期用のWebSocketを
// 同じNodeサーバー・同じポートで提供する。クライアントと同じreducer
// （js/game-store.js）を使い、サーバー自身が「今のセッションの正しい状態」を
// 常に保持する（サーバー権威型リレー）。1つのサービスとしてRender等にそのまま
// デプロイできる。
//
// 起動: npm start　（ポートは環境変数PORTで上書き可、既定8081）

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { store } from '../js/game-store.js';
import { EventBus } from '../js/EventBus.js';

const PORT = Number(process.env.PORT) || 8081;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const STATE_FILE = path.join(__dirname, 'state.json');
const SAVE_DEBOUNCE_MS = 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// 盤面のHTML/JS/画像などをそのままファイルシステムから配信する。
// ルート（/）はcombined_layout.htmlを返す。
async function serveStaticFile(req, res) {
  const requestedPath = decodeURIComponent(req.url.split('?')[0]);
  const relativePath = requestedPath === '/' ? '/combined_layout.html' : requestedPath;
  const filePath = path.join(ROOT_DIR, relativePath);

  // パストラバーサル対策：ROOT_DIRの外を指すリクエストは拒否する
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

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

const httpServer = http.createServer((req, res) => {
  serveStaticFile(req, res);
});

const wss = new WebSocketServer({ server: httpServer });

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

httpServer.listen(PORT, () => {
  console.log(`[server] サーバーを起動しました: http://localhost:${PORT}`);
});
