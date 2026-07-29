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

import 'dotenv/config';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';
import { ImmutableStore, createInitialGameState, DEFAULT_BCDICE_SYSTEM, listPlugins } from '../js/game-store.js';
import { isR2Configured, putAudioObject, deleteAudioObject, publicUrlFor } from './r2.js';

const PORT = Number(process.env.PORT) || 8081;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 5;
// 音源1ファイルの上限。MP3 192kbpsで20MB＝約14分。環境変数で調整できるようにしておく。
const MAX_AUDIO_BYTES = (Number(process.env.MAX_AUDIO_MB) || 20) * 1024 * 1024;
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
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4'
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

// リクエストボディをバイナリのまま読む（音源のアップロード用）。readJsonBodyは文字列連結の
// ためバイナリが壊れるので別に用意している。上限を超えた時点で接続を切り、巨大なボディを
// 最後まで受け取らないようにする。
function readBinaryBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        // ここでreq.destroy()すると応答を書く前に接続が切れ、クライアントには理由が伝わらない。
        // 受信だけ止めて呼び出し元に返し、413を返してから切ってもらう。
        req.pause();
        const error = new Error('payload too large');
        error.code = 'TOO_LARGE';
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
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
    // Redis自体に到達できない場合も、ここで即nullを返すと部屋が一時的に消えたように
    // 見えてしまう。ローカルにキャッシュが残っていればそちらへフォールバックする。
    console.warn(`[server] ${roomId} のRedis読み込みに失敗しました:`, error.message);
  }

  // Redisに無い（またはRedis自体に到達できない）場合のみ、移行前の環境で使っていた
  // ローカルファイルを試す
  try {
    const raw = await readFile(roomFilePath(roomId), 'utf-8');
    const savedState = JSON.parse(raw);
    const entry = buildEntry(savedState);
    rooms.set(roomId, entry);

    // Redisへの移行はあくまで「ついで」の処理。ここが失敗しても、ディスクからの
    // 読み込み自体は成功しているので、awaitで待って巻き込み失敗にはしない
    // （待ってしまうと、Redisが一時的に落ちているだけで部屋が見つからない扱いになる）。
    redis.set(roomKey(roomId), entry.store.state)
      .then(() => console.log(`[server] ${roomId} をローカルファイルからRedisへ移行しました`))
      .catch((error) => console.warn(`[server] ${roomId} のRedisへの移行に失敗しました:`, error.message));

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

// このアプリがR2に実体を持っている音源だけがキーを返す。外部URL指定のものはnull。
function pickOwnedAudioKey(track) {
  return track && track.source === 'upload' && track.key ? track.key : null;
}

// 部屋の実データ（Redis・移行元のローカルファイルが残っていればそれも）を消す。
// 呼び出し元（ws.on('close')）で、削除待ち状態の部屋の接続者が0人になったことを
// 確認してから呼ぶこと。
// audioTracksは削除前の状態から受け取る（Redisを消した後では辿れなくなるため）。
async function deleteRoomData(roomId, audioTracks = {}) {
  // R2のList APIを実装せずに済むよう、状態に残っているキーだけを対象にする。
  // ここで漏れたものは孤児として残るが、部屋データの削除自体は止めない。
  const keys = Object.values(audioTracks).map(pickOwnedAudioKey).filter(Boolean);
  await Promise.all(keys.map(key => deleteAudioObject(key)
    .catch((error) => console.warn(`[server] ${roomId} の音源削除に失敗しました (${key}):`, error.message))));

  try {
    await redis.del(roomKey(roomId));
  } catch (error) {
    console.warn(`[server] ${roomId} のRedis削除に失敗しました:`, error.message);
  }
  await unlink(roomFilePath(roomId)).catch(() => {});
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

// Content-Typeから拡張子を決める。R2上のキーを見たときに何のファイルか分かるようにするだけで、
// 再生時はブラウザが中身を見て判断するため厳密でなくてよい。
const AUDIO_EXTENSIONS = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/flac': 'flac'
};

// POST /api/audio?room=room-N：音源をR2へ置き、再生用の公開URLを返す。
//
// 【注意】このアプリには認証機構が無いため、このエンドポイントも誰でも叩ける。
// URLを知る第三者にバケットを埋められる余地があるので、歯止めとして
// 「実在する部屋ID」「audio/*のみ」「サイズ上限」の3点は必ず通すこと。
async function handleAudioUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room');

  if (!isValidRoomId(roomId)) {
    sendJson(res, 400, { error: '部屋IDが不正です' });
    return;
  }

  if (!isR2Configured()) {
    sendJson(res, 503, { error: 'このサーバーでは音源のアップロードが設定されていません。URLでの追加をご利用ください。' });
    return;
  }

  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (!contentType.startsWith('audio/')) {
    sendJson(res, 415, { error: '音声ファイルを指定してください' });
    return;
  }

  const tooLargeMessage = `ファイルが大きすぎます（上限 ${Math.floor(MAX_AUDIO_BYTES / 1024 / 1024)}MB）`;

  // 送信途中のクライアントに対して応答を返しつつ接続を切るため、ブラウザ側では
  // 413の本文ではなく通信エラーとして見えることがある（これは避けられない）。
  // そのためUI側はGET /api/audioで上限を取得し、アップロード前に自分で弾いている
  // （js/audio-dialog.jsのcurrentMaxBytes）。こちらは直接APIを叩かれた場合の歯止め。
  function rejectTooLarge() {
    res.on('finish', () => req.destroy());
    sendJson(res, 413, { error: tooLargeMessage });
  }

  // Content-Lengthで分かる場合はボディを一切読まずに断る（これが通常の経路）
  const declaredLength = Number(req.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_BYTES) {
    rejectTooLarge();
    return;
  }

  let body;
  try {
    body = await readBinaryBody(req, MAX_AUDIO_BYTES);
  } catch (error) {
    if (error.code === 'TOO_LARGE') {
      // Content-Lengthが無い（チャンク送信等）場合の保険
      rejectTooLarge();
      return;
    }
    sendJson(res, 400, { error: 'ファイルの読み込みに失敗しました' });
    return;
  }

  const ext = AUDIO_EXTENSIONS[contentType] || 'bin';
  const key = `rooms/${roomId}/${randomUUID()}.${ext}`;

  try {
    await putAudioObject(key, body, contentType);
  } catch (error) {
    console.warn(`[server] ${roomId} の音源アップロードに失敗しました:`, error.message);
    sendJson(res, 502, { error: 'アップロードに失敗しました' });
    return;
  }

  sendJson(res, 200, { key, url: publicUrlFor(key) });
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

  if (url.pathname === '/api/audio' && req.method === 'POST') {
    await handleAudioUpload(req, res);
    return;
  }

  // アップロードが使えるかをUI側が事前に知るための問い合わせ（ボタンの有効・無効に使う）
  if (url.pathname === '/api/audio' && req.method === 'GET') {
    sendJson(res, 200, { uploadEnabled: isR2Configured(), maxBytes: MAX_AUDIO_BYTES });
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

  // 削除待ち（全員の退室を待っている）部屋には新規接続させない
  if (entry.pendingDelete) {
    ws.close(4005, 'room deleted');
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

    if (message.type === 'DELETE_ROOM') {
      // 即座には消さない。全クライアント（自分含む）を退室させ、退室が完了して
      // （clients.size===0）から実データを消す（ws.on('close')側で行う）。
      entry.pendingDelete = true;
      Array.from(entry.clients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.close(4005, 'room deleted');
      });
      return;
    }

    if (message.type !== 'ACTION') return;

    // reducer側の想定外の状態（例: 古いエクスポートデータに無いキーへのアクセス等）で
    // 例外が投げられても、この1メッセージだけを無視する。ここで捕まえないと、wsのmessage
    // イベント内の未捕捉例外でNodeプロセスごと落ち、同居する他の全部屋も巻き添えで切断される。
    // 音源トラックの削除は、状態から消える前にR2上のキーを控えておかないと実体が残ってしまう。
    // 外部URL（source:'external'）はこちらの持ち物ではないので触らない。
    const removedAudioKey = message.action === 'REMOVE_AUDIO_TRACK'
      ? pickOwnedAudioKey(entry.store.state.room?.audioTracks?.[message.payload?.id])
      : null;

    try {
      entry.store.dispatch(message.action, message.payload);
    } catch (error) {
      console.warn(`[server] ${roomId} でのアクション処理に失敗しました（無視します）:`, message.action, error.message);
      return;
    }

    // 実体の削除は状態の更新を待たせる必要がないため、awaitせず投げっぱなしにする
    // （失敗しても再生には影響せず、残るのは孤児オブジェクトだけ）。
    if (removedAudioKey) {
      deleteAudioObject(removedAudioKey)
        .catch((error) => console.warn(`[server] 音源の削除に失敗しました (${removedAudioKey}):`, error.message));
    }
    schedulePersistForRoom(roomId, entry);
    broadcastToRoom(entry, ws, { type: 'ACTION', action: message.action, payload: message.payload });
  });

  ws.on('close', () => {
    entry.clients.delete(ws);
    console.log(`[server] ${roomId} クライアント切断（残り${entry.clients.size}件）`);

    if (entry.pendingDelete && entry.clients.size === 0) {
      // デバウンス中の保存がこの後に発火すると、削除したはずのデータがRedisへ
      // 復活してしまうため、削除前に確実に止めておく
      if (entry.saveTimer) {
        clearTimeout(entry.saveTimer);
        entry.saveTimer = null;
      }
      // 音源の実体を消すためのキーは、状態を捨てる前に読んでおく
      const audioTracks = entry.store.state.room?.audioTracks || {};
      rooms.delete(roomId);
      deleteRoomData(roomId, audioTracks).then(() => {
        console.log(`[server] ${roomId} を削除しました`);
      });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] サーバーを起動しました: http://localhost:${PORT}　（部屋数上限: ${MAX_ROOMS}）`);
});
