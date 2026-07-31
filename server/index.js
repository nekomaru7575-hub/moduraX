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
// 任意の環境変数 DEVELOPER_PASSPHRASE を設定すると、その合言葉で名乗った人がどの部屋でも
// GMと同じ操作をできる（開発・後始末用。詳細はisDeveloperTokenの説明を参照）。

import 'dotenv/config';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
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

// 部屋データの保存先。Upstashの接続情報があればRedis、無ければローカルファイル
// （server/rooms/room-N.json）だけで動く「ローカルモード」になる。検証用の起動
// （server/dev-local.js）は接続情報を渡さないことでこのモードに入り、本番のデータへ
// 一切触れずに動作確認できる。
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = USE_REDIS ? Redis.fromEnv() : null;

// Redis運用へ移る前のローカルファイルを、Redisに無い部屋の代わりとして読むかどうか。
// 既定はオフ。オンにすると「Redis側で削除した部屋が、古いローカルファイルから勝手に
// 復活する」ことが起きるため（実際に起きた）、移行が必要なときだけ明示的に有効化する。
const MIGRATE_LEGACY_ROOM_FILES = process.env.MIGRATE_LEGACY_ROOM_FILES === '1';

function roomKey(roomId) {
  return `room:${roomId}`;
}

// --- 部屋データの読み書き（保存先の違いをここだけに閉じ込める） ---
async function readRoomState(roomId) {
  if (USE_REDIS) return redis.get(roomKey(roomId));

  try {
    return JSON.parse(await readFile(roomFilePath(roomId), 'utf-8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

async function writeRoomState(roomId, state) {
  if (USE_REDIS) {
    await redis.set(roomKey(roomId), state);
    return;
  }
  await mkdir(ROOMS_DIR, { recursive: true });
  await writeFile(roomFilePath(roomId), JSON.stringify(state));
}

async function deleteRoomState(roomId) {
  if (USE_REDIS) {
    await redis.del(roomKey(roomId));
    return;
  }
  await unlink(roomFilePath(roomId)).catch(() => {});
}

// --- 参加者の本人確認 ---
// ブラウザは合言葉から2つの値を導出する（js/local-identity.js参照）。
//   authToken     … 状態には決して載らない、合言葉を知っている人だけが作れる値
//   participantId … 状態に載る公開ID。authTokenをハッシュしたもの
// サーバーは合言葉を知らないが、participantIdがauthTokenから作られているので、
// 同じ計算をして一致するかを見るだけで名乗りが本物かを確かめられる。覚えておくものは
// 何も無く（対応表も初回登録も不要）、状態から公開IDを読めても、そこからauthTokenは
// 逆算できないため他人になりすませない。
const PARTICIPANT_ID_PATTERN = /^[0-9a-f]{32}$/;
const AUTH_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const PARTICIPANT_ID_LENGTH = 32;

// js/local-identity.jsのderiveParticipantIdと同じ規則。片方だけ変えると全員の名乗りが
// 通らなくなるので、変えるときは必ず両方を揃えること。
function deriveParticipantId(authToken) {
  return createHash('sha256').update(`mojulaX:pid:${authToken}`).digest('hex').slice(0, PARTICIPANT_ID_LENGTH);
}

// 突き合わせは長さが同じ16進文字列同士なので、比較時間から中身が漏れないようにする
function equalsSecret(a, b) {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * そのparticipantIdを名乗ってよいか（authTokenと対応しているか）を判定する。
 * @returns {boolean} 名乗ってよければtrue
 */
function verifyIdentity(participantId, authToken) {
  if (!PARTICIPANT_ID_PATTERN.test(participantId) || !AUTH_TOKEN_PATTERN.test(authToken)) return false;
  return equalsSecret(deriveParticipantId(authToken), participantId);
}

// --- 開発用の合言葉 ---
// 環境変数DEVELOPER_PASSPHRASEに合言葉を入れておくと、その合言葉で名乗った人は
// どの部屋でも（GMでなくても、参加者一覧に載っていなくても）GMと同じ操作ができる。
// 動作確認や、GMがいなくなった部屋・公開先の直し忘れの後始末に使う。
//
// 使い方：.envに DEVELOPER_PASSPHRASE=… を書いてサーバーを起動し、あとは普通に
// 「参加者設定」でその合言葉を入れるだけ。ブラウザ側に特別な操作は要らない。
//
// 【扱いの注意】これを知っている人はこのサーバーの全部屋でGMになれる。長く推測しにくい
// 文字列にして、.env（gitignore対象）の外へ出さないこと。未設定なら機能ごと無効で、
// 既定値は用意していない（うっかり全サーバー共通の合言葉が通ることを避けるため）。
const DEVELOPER_PASSPHRASE = (process.env.DEVELOPER_PASSPHRASE || '').trim();

// 名乗りに使われたトークンが開発用の合言葉から作られたものか。
// ブラウザは部屋ごとに合言葉をハッシュするので（js/local-identity.js）、こちらも
// 同じ部屋IDで同じ計算をして突き合わせる。
function isDeveloperToken(roomId, authToken) {
  if (!DEVELOPER_PASSPHRASE || !AUTH_TOKEN_PATTERN.test(authToken)) return false;
  const expected = createHash('sha256')
    .update(`mojulaX:auth:${roomId}:${DEVELOPER_PASSPHRASE}`)
    .digest('hex');
  return equalsSecret(expected, authToken);
}

// --- 旧方式の参加者の後始末 ---
// 以前はparticipantIdとauthTokenを合言葉から別々に導出しており、両者の対応をサーバーが
// 検算できなかった。そのため旧方式で登録された参加者IDは「本人が名乗った」ことを確かめる
// 手立てが無く、GMのまま残すと誰でもそのIDを騙ってGM権限を得られてしまう。
// 部屋ごとに一度だけ、旧方式の参加者からGMの印を外す（名前と持ち主表示は残す）。
// GMが1人もいない部屋では最初に名乗った人がGMになる規則（game-store.jsの
// REGISTER_PARTICIPANT）が働くので、新方式で名乗り直した人がGMを引き継げる。
const CURRENT_AUTH_VERSION = 2;

function authMetaKey(roomId) {
  return `roomAuth:${roomId}`;
}

function authMetaFilePath(roomId) {
  return path.join(ROOMS_DIR, `${roomId}.auth.json`);
}

async function readAuthMeta(roomId) {
  if (USE_REDIS) return (await redis.get(authMetaKey(roomId))) || {};

  try {
    return JSON.parse(await readFile(authMetaFilePath(roomId), 'utf-8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {};
  }
}

async function writeAuthMeta(roomId, meta) {
  if (USE_REDIS) {
    await redis.set(authMetaKey(roomId), meta);
    return;
  }
  await mkdir(ROOMS_DIR, { recursive: true });
  await writeFile(authMetaFilePath(roomId), JSON.stringify(meta));
}

async function deleteAuthMeta(roomId) {
  if (USE_REDIS) {
    await redis.del(authMetaKey(roomId));
  }
  await unlink(authMetaFilePath(roomId)).catch(() => {});
}

// 旧方式で付いていたGMの印を外す。既に処理済みの部屋、GMがいない部屋では何もしない。
function clearLegacyGmFlags(roomId, store) {
  const participants = store.state.participants || {};
  const legacyGmIds = Object.values(participants).filter(p => p.isGm).map(p => p.id);
  if (legacyGmIds.length === 0) return false;

  legacyGmIds.forEach(id => store.dispatch('SET_PARTICIPANT_GM', { id, isGm: false }));
  console.log(`[server] ${roomId}: 旧方式の参加者${legacyGmIds.length}人からGMの印を外しました`
    + '（合言葉を入れて名乗り直した最初の人がGMになります）');
  return true;
}

// 部屋そのものを左右する操作をしてよいか。判定の規則はブラウザ側のjs/room-authority.jsと
// 同じにしてある（GMが1人も決まっていない部屋では全員可）。片方だけ変えると、画面では
// 押せるのにサーバーに弾かれる（またはその逆）状態になるので、必ず両方を揃えること。
function canOperateAsGm(state, participantId) {
  const participants = state.participants || {};
  const hasGm = Object.values(participants).some(p => p.isGm);
  if (!hasGm) return true;
  return !!(participantId && participants[participantId]?.isGm);
}

// GMだけが行えるアクション。js/main.js・js/round-panel.js・js/audio-dialog.jsで
// 画面上も止めているが、こちらは直接WebSocketを叩かれた場合の歯止め。
// ROUND_SET_READY（割り込みなしの宣言）はPL各自の意思表示なので含めない。
const GM_ONLY_ACTIONS = new Set([
  'SET_BCDICE_SYSTEM',
  'SET_ACTIVE_PLUGIN',
  'ADD_AUDIO_TRACK',
  'ROUND_PROGRESSION_START',
  'ROUND_ADVANCE_PHASE',
  'ROUND_SET_PARTICIPANTS',
  'ROUND_PROGRESSION_END',
  // GMの付け外しと参加者の削除もGM限定。ここが空いていると、誰でも自分をGMにしてから
  // 上の操作を通せてしまい、他の制限がすべて無意味になる。
  'SET_PARTICIPANT_GM',
  'REMOVE_PARTICIPANT'
]);

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

// 部屋のstoreを取得する。メモリ上にキャッシュがあればそれを返し、無ければ保存先
// （Redis、またはローカルモードならファイル）から読み込む。見つからなければ
// 「まだ作られていない空き部屋」としてnullを返す。
// MIGRATE_LEGACY_ROOM_FILES=1 のときだけ、Redisに無い部屋を旧ローカルファイルから
// 読み込んでRedisへ移行する（既定では行わない。理由は宣言箇所のコメント参照）。
async function getOrLoadRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);

  // savedStateを直接コンストラクタへ渡すと、この機能より前に保存された部屋データに
  // 無い新しいトップレベルキー（round等）がundefinedのまま残り、そのキーを前提とする
  // reducerがサーバー側で例外を投げてプロセスごと落ちる（クライアント側は必ずhydrate()
  // 経由で同じ補完を受けるが、ここだけそれを素通りしていた）。hydrate()を通して
  // クライアントの再接続時と同じ後方互換の穴埋めを適用してから使う。
  // 旧方式の参加者の後始末（clearLegacyGmFlags参照）は部屋ごとに一度だけ行う。
  // 済んだかどうかは同期される状態とは別のところに控える（状態に混ぜると、ユーザーが
  // 書き出した古いファイルを読み込み直したときに一緒に巻き戻ってしまうため）。
  async function buildEntry(savedState) {
    const store = new ImmutableStore(createInitialGameState());
    store.hydrate(savedState);

    let meta = {};
    try {
      meta = await readAuthMeta(roomId);
    } catch (error) {
      console.warn(`[server] ${roomId} の認証情報の読み込みに失敗しました:`, error.message);
    }

    if (meta.version !== CURRENT_AUTH_VERSION) {
      const changed = clearLegacyGmFlags(roomId, store);
      await writeAuthMeta(roomId, { version: CURRENT_AUTH_VERSION })
        .catch((error) => console.warn(`[server] ${roomId} の認証情報の保存に失敗しました:`, error.message));
      if (changed) {
        await writeRoomState(roomId, store.state)
          .catch((error) => console.warn(`[server] ${roomId} の保存に失敗しました:`, error.message));
      }
    }

    return { store, clients: new Set(), saveTimer: null };
  }

  try {
    const savedState = await readRoomState(roomId);
    if (savedState) {
      const entry = await buildEntry(savedState);
      rooms.set(roomId, entry);
      return entry;
    }
  } catch (error) {
    console.warn(`[server] ${roomId} の読み込みに失敗しました:`, error.message);
  }

  // ここから下は旧ローカルファイルからの移行。既定では行わない（Redis側で消した部屋が
  // 復活してしまうため）。ローカルモードでは上のreadRoomStateが既にファイルを読んでいる。
  if (!USE_REDIS || !MIGRATE_LEGACY_ROOM_FILES) return null;

  try {
    const raw = await readFile(roomFilePath(roomId), 'utf-8');
    const savedState = JSON.parse(raw);
    const entry = await buildEntry(savedState);
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
      await writeRoomState(roomId, entry.store.state);
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
    await deleteRoomState(roomId);
  } catch (error) {
    console.warn(`[server] ${roomId} の削除に失敗しました:`, error.message);
  }

  // 認証まわりの控えも一緒に消す（部屋が空けば、次に同じ番号で作られる部屋には
  // 旧方式の参加者はいないため、処理済みの印を残す意味が無い）
  try {
    await deleteAuthMeta(roomId);
  } catch (error) {
    console.warn(`[server] ${roomId} の認証情報の削除に失敗しました:`, error.message);
  }
  // Redis運用でも、移行前のローカルファイルが残っていれば一緒に消す
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
// 誰でも叩けるエンドポイントなので、「実在する部屋ID」「audio/*のみ」「サイズ上限」に加えて
// 「その部屋のGMであること」を必ず通すこと。名乗りはWebSocketと同じ値をヘッダで受け取る
// （合言葉由来のトークンなので、ログに残りうるクエリ文字列には載せない）。
async function handleAudioUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room');

  if (!isValidRoomId(roomId)) {
    sendJson(res, 400, { error: '部屋IDが不正です' });
    return;
  }

  const entry = await getOrLoadRoom(roomId);
  if (!entry) {
    sendJson(res, 404, { error: 'その部屋はまだ作成されていません' });
    return;
  }

  const participantId = String(req.headers['x-participant-id'] || '');
  const authToken = String(req.headers['x-auth-token'] || '');
  const identified = verifyIdentity(participantId, authToken);
  const developer = identified && isDeveloperToken(roomId, authToken);

  if (!developer && !canOperateAsGm(entry.store.state, identified ? participantId : null)) {
    sendJson(res, 403, { error: '音源の追加はGMだけが行えます' });
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
    await writeRoomState(id, store.state);
  } catch (error) {
    console.warn(`[server] ${id} の作成に失敗しました:`, error.message);
    sendJson(res, 500, { error: '部屋の作成に失敗しました。' });
    return;
  }

  rooms.set(id, { store, clients: new Set(), saveTimer: null });
  sendJson(res, 201, { id });
}

// --- BCDiceのシステム一覧・システム情報の中継（キャッシュ付き） ---
// 一覧（約29KB）とシステム情報（command_pattern / help_message）はBCDice側が更新される
// ことがあるので手書きせずAPIから取るが、部屋・端末ごとに毎回上流へ取りに行くと無駄な
// 負荷になる。サーバーで一度取ってRedisへ置き、既定30日を過ぎた後の最初のリクエストの
// ときだけ取り直す（定期ジョブは持たず、アクセス契機の遅延更新にする）。
const BCDICE_BASE_URL = 'https://bcdice.onlinesession.app';
const BCDICE_CACHE_MS = (Number(process.env.BCDICE_CACHE_DAYS) || 30) * 24 * 60 * 60 * 1000;
// cacheKey -> { fetchedAt, payload }。Redisへの往復すら省くためのプロセス内キャッシュ。
const bcdiceMemoryCache = new Map();

// キャッシュ（メモリ→Redis）を読み、無いか期限切れなら上流から取り直して両方へ書き戻す。
// 期限切れでも上流が落ちている場合は古いままのキャッシュを返し、ダイス判定やヘルプ表示が
// 上流の一時障害で丸ごと使えなくなることを避ける。
async function loadBcdiceCached(cacheKey, upstreamPath, transform) {
  const now = Date.now();
  let cached = bcdiceMemoryCache.get(cacheKey) || null;

  // ローカルモード（Redis無し）ではプロセス内キャッシュだけで動く
  if (!cached && USE_REDIS) {
    try {
      cached = await redis.get(`bcdice:${cacheKey}`);
      if (cached) bcdiceMemoryCache.set(cacheKey, cached);
    } catch (error) {
      console.warn(`[server] BCDiceキャッシュの読み込みに失敗しました (${cacheKey}):`, error.message);
    }
  }

  if (cached && now - cached.fetchedAt < BCDICE_CACHE_MS) {
    return { ...cached.payload, fetchedAt: cached.fetchedAt };
  }

  try {
    const response = await fetch(`${BCDICE_BASE_URL}${upstreamPath}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = transform(await response.json());
    const entry = { fetchedAt: now, payload };
    bcdiceMemoryCache.set(cacheKey, entry);
    // 保存の成否は応答に影響させない（次回また取りに行くだけで済む）
    if (USE_REDIS) {
      redis.set(`bcdice:${cacheKey}`, entry)
        .catch((error) => console.warn(`[server] BCDiceキャッシュの保存に失敗しました (${cacheKey}):`, error.message));
    }
    return { ...payload, fetchedAt: now };
  } catch (error) {
    if (cached) {
      console.warn(`[server] BCDiceの取得に失敗したため期限切れキャッシュを返します (${cacheKey}):`, error.message);
      return { ...cached.payload, fetchedAt: cached.fetchedAt, stale: true };
    }
    throw error;
  }
}

// GET /api/bcdice/game_system：システム一覧（部屋作成フォーム・ルーム設定のselect用）
async function handleBcdiceSystems(req, res) {
  try {
    const data = await loadBcdiceCached('systems', '/v2/game_system', (raw) => ({
      systems: (raw.game_system || []).map(({ id, name, sort_key }) => ({ id, name, sortKey: sort_key }))
    }));
    sendJson(res, 200, data);
  } catch (error) {
    console.warn('[server] BCDiceのシステム一覧を取得できませんでした:', error.message);
    sendJson(res, 502, { error: 'BCDiceのシステム一覧を取得できませんでした。' });
  }
}

// システムIDはそのまま上流のURLパスへ埋めるため、BCDiceのIDに実際に使われる文字だけを許可する
const BCDICE_SYSTEM_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;

// GET /api/bcdice/game_system/{id}：コマンド判定用のcommand_patternとヘルプ本文
async function handleBcdiceSystemInfo(req, res, systemId) {
  if (!BCDICE_SYSTEM_ID_PATTERN.test(systemId)) {
    sendJson(res, 400, { error: '無効なシステムIDです。' });
    return;
  }

  try {
    const data = await loadBcdiceCached(`info:${systemId}`, `/v2/game_system/${systemId}`, (raw) => ({
      id: raw.id,
      name: raw.name,
      commandPattern: raw.command_pattern,
      helpMessage: raw.help_message
    }));
    sendJson(res, 200, data);
  } catch (error) {
    console.warn(`[server] BCDiceのシステム情報を取得できませんでした (${systemId}):`, error.message);
    sendJson(res, 502, { error: 'BCDiceのシステム情報を取得できませんでした。' });
  }
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

  if (url.pathname === '/api/bcdice/game_system' && req.method === 'GET') {
    await handleBcdiceSystems(req, res);
    return;
  }

  if (url.pathname.startsWith('/api/bcdice/game_system/') && req.method === 'GET') {
    const systemId = decodeURIComponent(url.pathname.slice('/api/bcdice/game_system/'.length));
    await handleBcdiceSystemInfo(req, res, systemId);
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

  // この接続が名乗り、本人確認まで通った参加者ID。合言葉なし（ゲスト）ならnullのまま。
  // IDENTIFYメッセージを受け取るまでは誰でもないものとして扱う。
  let verifiedParticipantId = null;
  // 開発用の合言葉での名乗りか（isDeveloperToken参照）。GMでなくてもGMと同じ操作ができる。
  let isDeveloper = false;

  ws.send(JSON.stringify({ type: 'INIT', state: entry.store.state }));

  // 部屋を左右する操作をしてよいか。開発用の合言葉はGMの有無に関わらず通す。
  function mayOperateAsGm() {
    return isDeveloper || canOperateAsGm(entry.store.state, verifiedParticipantId);
  }

  // GM限定の操作を断ったとき、その接続の表示だけを正しい状態へ戻す。ブラウザ側は
  // 送信前に自分の画面へ先に反映しているため、断っただけでは送り手の画面がずれたまま
  // になる。INITではなく専用の型にしているのは、INITだと再接続時と同じ初期化処理
  // （名乗り直し等）まで走ってしまうため。
  function rejectAndResync(what) {
    console.warn(`[server] ${roomId}: GM限定の操作を拒否しました (${what})`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'RESYNC', state: entry.store.state }));
    }
  }

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    // 名乗り。合言葉から導出した公開IDと本人確認用トークンを突き合わせる（verifyIdentity参照）。
    // 通らなかった場合はゲスト扱いのままにする（切断はしない。閲覧はできてよいため）。
    if (message.type === 'IDENTIFY') {
      const participantId = String(message.participantId || '');
      const authToken = String(message.authToken || '');

      if (verifyIdentity(participantId, authToken)) {
        verifiedParticipantId = participantId;
        isDeveloper = isDeveloperToken(roomId, authToken);
        if (isDeveloper) {
          console.log(`[server] ${roomId}: 開発用の合言葉で名乗りました（GMと同じ操作を許可します）`);
        }
        // 開発用かどうかはブラウザ側の画面（押せる／押せない）にも反映させる。
        // これを伝えないと、サーバーは通すのに画面では止まったままになる。
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'IDENTITY_ACCEPTED', developer: isDeveloper }));
        }
      } else {
        verifiedParticipantId = null;
        isDeveloper = false;
        console.warn(`[server] ${roomId}: 参加者の本人確認に失敗しました (${participantId.slice(0, 8)}…)`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'IDENTITY_REJECTED' }));
        }
      }
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      // 接続中の全員の状態を丸ごと置き換えるため、部屋の削除と同じくGM限定にする
      if (!mayOperateAsGm()) {
        rejectAndResync('REPLACE_STATE');
        return;
      }
      entry.store.hydrate(message.state);
      schedulePersistForRoom(roomId, entry);
      broadcastToRoom(entry, ws, { type: 'INIT', state: entry.store.state });
      return;
    }

    if (message.type === 'DELETE_ROOM') {
      if (!mayOperateAsGm()) {
        // 送り手の画面では何も起きていないので、状態を戻す必要はない
        console.warn(`[server] ${roomId}: GM以外からの部屋削除の要求を拒否しました`);
        return;
      }
      // 即座には消さない。全クライアント（自分含む）を退室させ、退室が完了して
      // （clients.size===0）から実データを消す（ws.on('close')側で行う）。
      entry.pendingDelete = true;
      Array.from(entry.clients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.close(4005, 'room deleted');
      });
      return;
    }

    if (message.type !== 'ACTION') return;

    // 参加者としての登録は、本人確認が通ったID本人からのものだけ受け付ける。ここが空いて
    // いると、他人の名前を書き換えられるほか、まだ誰もGMでない部屋で他人のIDを先に登録して
    // 「最初に名乗った人がGM」の規則を横取りできてしまう（game-store.jsのREGISTER_PARTICIPANT）。
    // 断っても状態は戻さない（戻すとRESYNC→再登録→再び拒否、と往復し続けるため）。
    if (message.action === 'REGISTER_PARTICIPANT') {
      if (!verifiedParticipantId || message.payload?.id !== verifiedParticipantId) {
        console.warn(`[server] ${roomId}: 本人確認できていない参加者登録を拒否しました`);
        return;
      }
    }

    if (GM_ONLY_ACTIONS.has(message.action) && !mayOperateAsGm()) {
      rejectAndResync(message.action);
      return;
    }

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
