// server/index.js
// 盤面のHTML/JS/画像などの静的ファイル配信と、リアルタイム同期用のWebSocketを
// 同じNodeサーバー・同じポートで提供する。複数の部屋（セッション）を1つの
// サーバーで運用できるよう、部屋ごとに独立したImmutableStore・接続クライアント集合を
// 持つ。永続化はUpstash Redis（キー room:room-N）で行う。RenderのようなPaaSは
// ローカルディスクがプロセス再起動のたびに消える（永続ディスク未添付の場合）ため、
// ファイル保存だとラウンド進行等がきっかけの再起動で部屋データが消えてしまう問題があった。
// 起動時、まだRedisに無い部屋についてのみ、旧バージョンで使っていたローカルの
// server/rooms/room-N.json（あれば）から一度だけ移行する。
//
// 起動: npm start　（ポートは環境変数PORTで上書き可、既定8081）
// 部屋数上限は環境変数MAX_ROOMSで上書き可、既定5。
// 環境変数 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が必須（Upstashのダッシュボードで発行）。

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { ImmutableStore, createInitialGameState, DEFAULT_BCDICE_SYSTEM, listPlugins } from '../js/game-store.js';

const PORT = Number(process.env.PORT) || 8081;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ROOMS_DIR = path.join(__dirname, 'rooms');
const LEGACY_STATE_FILE = path.join(__dirname, 'state.json');
const SAVE_DEBOUNCE_MS = 1000;

const redis = Redis.fromEnv();
function roomKey(roomId) {
  return `room:${roomId}`;
}

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
// ルート（/）は部屋一覧のindex.htmlを返す。盤面自体はcombined_layout.html?room=room-Nで開く。
async function serveStaticFile(req, res) {
  const requestedPath = decodeURIComponent(req.url.split('?')[0]);
  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath;
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

function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(json);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// --- 部屋管理 ---
// roomId -> { store, clients: Set<ws>, saveTimer }
// 部屋数はMAX_ROOMSで固定（サーバー負荷を制限する）。IDは room-1 .. room-{MAX_ROOMS}。
const rooms = new Map();

function isValidRoomId(id) {
  if (typeof id !== 'string') return false;
  const match = id.match(/^room-([1-9]\d*)$/);
  if (!match) return false;
  const n = Number(match[1]);
  return n >= 1 && n <= MAX_ROOMS;
}

function roomFilePath(roomId) {
  return path.join(ROOMS_DIR, `${roomId}.json`);
}

// 部屋のstoreを取得する。メモリ上にキャッシュがあればそれを返し、無ければRedisから
// 読み込む。Redisにも無ければ、旧バージョンのローカルファイル（server/rooms/room-N.json）
// が残っていないか確認し、あれば一度だけそれを読み込んでRedisへ移行する。
// どちらにも無ければ「まだ作られていない空き部屋」としてnullを返す。
async function getOrLoadRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);

  // savedStateを直接コンストラクタへ渡すと、この機能より前に保存された部屋データに
  // 無い新しいトップレベルキー（round等）がundefinedのまま残り、そのキーを前提とする
  // reducerがサーバー側で例外を投げてプロセスごと落ちる（クライアント側は必ずhydrate()
  // 経由で同じ補完を受けるが、ここだけそれを素通りしていた）。hydrate()を通して
  // クライアントの再接続時と同じ後方互換の穴埋めを適用してから使う。
  function buildEntry(savedState) {
    const store = new ImmutableStore(createInitialGameState());
    store.hydrate(savedState);
    return { store, clients: new Set(), saveTimer: null };
  }

  try {
    const savedState = await redis.get(roomKey(roomId));
    if (savedState) {
      const entry = buildEntry(savedState);
      rooms.set(roomId, entry);
      return entry;
    }
  } catch (error) {
    console.warn(`[server] ${roomId} のRedis読み込みに失敗しました:`, error.message);
    return null;
  }

  // Redisに無い場合のみ、移行前の環境で使っていたローカルファイルを試す
  try {
    const raw = await readFile(roomFilePath(roomId), 'utf-8');
    const savedState = JSON.parse(raw);
    const entry = buildEntry(savedState);
    rooms.set(roomId, entry);
    await redis.set(roomKey(roomId), entry.store.state);
    console.log(`[server] ${roomId} をローカルファイルからRedisへ移行しました`);
    return entry;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[server] ${roomId} のローカルファイル読み込みに失敗しました:`, error.message);
    }
    return null;
  }
}

function schedulePersistForRoom(roomId, entry) {
  if (entry.saveTimer) return;
  entry.saveTimer = setTimeout(async () => {
    entry.saveTimer = null;
    try {
      await redis.set(roomKey(roomId), entry.store.state);
    } catch (error) {
      console.warn(`[server] ${roomId} の保存に失敗しました:`, error.message);
    }
  }, SAVE_DEBOUNCE_MS);
}

function broadcastToRoom(entry, sender, message) {
  const outgoing = JSON.stringify(message);
  entry.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(outgoing);
    }
  });
}

// 起動時、まだserver/rooms/が無ければ作成する。既存のserver/state.json（本機能より前の
// 単一部屋運用のデータ）があれば、それを「部屋1」としてrooms/room-1.jsonへ複製する
// （元のstate.jsonは安全のため残したまま削除しない）。
async function migrateLegacyStateIfNeeded() {
  try {
    await access(ROOMS_DIR);
    return; // 既にrooms/があるので移行済み
  } catch {
    // rooms/がまだ無い→続行
  }

  await mkdir(ROOMS_DIR, { recursive: true });

  try {
    const raw = await readFile(LEGACY_STATE_FILE, 'utf-8');
    const legacyState = JSON.parse(raw);
    const migrated = {
      ...legacyState,
      room: { ...legacyState.room, name: legacyState.room?.name || '部屋1' }
    };
    await writeFile(roomFilePath('room-1'), JSON.stringify(migrated));
    console.log('[server] 既存のstate.jsonを部屋1(rooms/room-1.json)へ移行しました（元ファイルはそのまま残します）');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[server] 旧state.jsonの移行に失敗しました:', error.message);
    }
    // state.jsonが無ければ何もしない（新規デプロイ等）
  }
}

// GET /api/rooms：全スロットの一覧（インデックスページ用）。空きスロットは最小限の情報のみ返す。
async function handleListRooms(req, res) {
  const list = [];
  for (let n = 1; n <= MAX_ROOMS; n++) {
    const id = `room-${n}`;
    const entry = await getOrLoadRoom(id);
    if (!entry) {
      list.push({ id, occupied: false });
      continue;
    }
    const { name, activePlugin, bcdiceSystem } = entry.store.state.room;
    list.push({ id, occupied: true, name, activePlugin, bcdiceSystem });
  }
  sendJson(res, 200, { maxRooms: MAX_ROOMS, rooms: list });
}

// POST /api/rooms：空きスロットに新しい部屋を作成する。
// body: { id, name, activePlugin, bcdiceSystem, importedState? }
async function handleCreateRoom(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'リクエストの形式が不正です。' });
    return;
  }

  const { id, name, activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM, importedState } = body;

  if (!isValidRoomId(id)) {
    sendJson(res, 400, { error: '無効な部屋IDです。' });
    return;
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    sendJson(res, 400, { error: '部屋名を入力してください。' });
    return;
  }

  const existing = await getOrLoadRoom(id);
  if (existing) {
    sendJson(res, 409, { error: 'その部屋は既に使われています。' });
    return;
  }

  const validPluginIds = new Set(listPlugins().map((p) => p.id));
  const safeActivePlugin = activePlugin && validPluginIds.has(activePlugin) ? activePlugin : null;
  const safeBcdiceSystem = typeof bcdiceSystem === 'string' && bcdiceSystem ? bcdiceSystem : DEFAULT_BCDICE_SYSTEM;

  let initialState;
  if (importedState && typeof importedState === 'object') {
    // 全データ読み込み：既存の状態をベースに、部屋名はフォーム入力で上書きするが、
    // プラグイン・システムはインポートしたファイル側に値があればそちらを優先する
    // （読み込んだ部屋データが前提にしていた構成を、その場のフォーム選択で誤って
    // 上書きしないようにするため）。ファイル側に値が無い場合のみフォーム入力を使う。
    const importedRoom = importedState.room || {};
    const importedActivePlugin = importedRoom.activePlugin;
    const resolvedActivePlugin = importedActivePlugin && validPluginIds.has(importedActivePlugin)
      ? importedActivePlugin
      : safeActivePlugin;
    const resolvedBcdiceSystem = typeof importedRoom.bcdiceSystem === 'string' && importedRoom.bcdiceSystem
      ? importedRoom.bcdiceSystem
      : safeBcdiceSystem;

    initialState = {
      ...importedState,
      room: {
        ...importedRoom,
        name: trimmedName,
        activePlugin: resolvedActivePlugin,
        bcdiceSystem: resolvedBcdiceSystem
      }
    };
  } else {
    initialState = createInitialGameState({ name: trimmedName, activePlugin: safeActivePlugin, bcdiceSystem: safeBcdiceSystem });
  }

  // importedStateがラウンド進行機能より前にエクスポートされたデータだと、roundキーが
  // 無いままstateを直接コンストラクタへ渡すことになり、後でROUND_*アクションのreducerが
  // prevState.round.activeへのアクセスで例外を投げてサーバーごと落ちる（getOrLoadRoomで
  // 修正済みなのと同じ原因）。hydrate()を通して欠けているキーを補ってから使う。
  const store = new ImmutableStore(createInitialGameState());
  store.hydrate(initialState);

  try {
    await redis.set(roomKey(id), store.state);
  } catch (error) {
    console.warn(`[server] ${id} の作成に失敗しました:`, error.message);
    sendJson(res, 500, { error: '部屋の作成に失敗しました。' });
    return;
  }

  rooms.set(id, { store, clients: new Set(), saveTimer: null });
  sendJson(res, 201, { id });
}

await migrateLegacyStateIfNeeded();

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/rooms' && req.method === 'GET') {
    await handleListRooms(req, res);
    return;
  }

  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    await handleCreateRoom(req, res);
    return;
  }

  await serveStaticFile(req, res);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room');

  if (!isValidRoomId(roomId)) {
    ws.close(4000, 'invalid room');
    return;
  }

  const entry = await getOrLoadRoom(roomId);
  if (!entry) {
    ws.close(4004, 'room not found');
    return;
  }

  entry.clients.add(ws);
  console.log(`[server] ${roomId} クライアント接続（現在${entry.clients.size}件）`);

  ws.send(JSON.stringify({ type: 'INIT', state: entry.store.state }));

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      entry.store.hydrate(message.state);
      schedulePersistForRoom(roomId, entry);
      broadcastToRoom(entry, ws, { type: 'INIT', state: entry.store.state });
      return;
    }

    if (message.type !== 'ACTION') return;

    // reducer側の想定外の状態（例: 古いエクスポートデータに無いキーへのアクセス等）で
    // 例外が投げられても、この1メッセージだけを無視する。ここで捕まえないと、wsのmessage
    // イベント内の未捕捉例外でNodeプロセスごと落ち、同居する他の全部屋も巻き添えで切断される。
    try {
      entry.store.dispatch(message.action, message.payload);
    } catch (error) {
      console.warn(`[server] ${roomId} でのアクション処理に失敗しました（無視します）:`, message.action, error.message);
      return;
    }
    schedulePersistForRoom(roomId, entry);
    broadcastToRoom(entry, ws, { type: 'ACTION', action: message.action, payload: message.payload });
  });

  ws.on('close', () => {
    entry.clients.delete(ws);
    console.log(`[server] ${roomId} クライアント切断（残り${entry.clients.size}件）`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] サーバーを起動しました: http://localhost:${PORT}　（部屋数上限: ${MAX_ROOMS}）`);
});
