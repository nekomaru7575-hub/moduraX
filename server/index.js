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
import {
  ImmutableStore, createInitialGameState, DEFAULT_BCDICE_SYSTEM, listPlugins, showsEntryMessages
} from '../js/game-store.js';
import { adoptImportedState } from '../js/state-import.js';
import {
  isR2Configured, putObject, getObject, deleteObject, deleteObjectsByPrefix,
  publicUrlFor, publicBaseUrl, keyFromPublicUrl
} from './r2.js';

const PORT = Number(process.env.PORT) || 8081;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 5;
// 音源1ファイルの上限。MP3 192kbpsで20MB＝約14分。環境変数で調整できるようにしておく。
const MAX_AUDIO_BYTES = (Number(process.env.MAX_AUDIO_MB) || 20) * 1024 * 1024;
// 入室音のURL。音源はまだ無いので、環境変数が無ければ空文字のまま（クライアントは
// 空文字/未設定ならnew Audio()自体を作らない。js/audio-player.jsのplayEntrySound参照）。
const ENTRY_SOUND_URL = process.env.ENTRY_SOUND_URL || '';
// チャット送信音のURL。入室音と同じ考え方で、環境変数が無ければ空文字のまま
// （js/audio-player.jsのplayChatSendSound参照）。
const CHAT_SEND_SOUND_URL = process.env.CHAT_SEND_SOUND_URL || '';
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

// --- 参加者の名乗りの検証 ---
// ブラウザは表示名から2つの値を導出する（js/local-identity.js参照）。
//   authToken     … 状態には載らない値。名乗りとアップロードのヘッダにだけ載る
//   participantId … 状態に載る公開ID。authTokenをハッシュしたもの
// サーバーは種を知らないが、participantIdがauthTokenから作られているので、同じ計算をして
// 一致するかを見るだけで名乗りの辻褄を確かめられる（対応表も初回登録も覚えなくてよい）。
// ただし種は全員に見える表示名なので、これは「なりすまし防止」ではなく形式の検算にすぎない
// （名前を知っていれば誰でも同じ値を作れる。割り切りの経緯はjs/local-identity.jsのコメント）。
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
// 使い方：.envに DEVELOPER_PASSPHRASE=… を書いてサーバーを起動し、「参加者設定」の
// 「開発用の合言葉」（折りたたみ）にその合言葉を入れるだけ。
// 普段の名乗りの種は表示名だが、この欄に入れたときだけ種がこちらに切り替わる。表示名を
// そのまま種にすると、開発用の合言葉が参加者一覧に晒されてしまうため分けてある。
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
// 導出の種を変えるたびに、それ以前に登録された参加者IDは誰も名乗れないものになる。
// GMの印が付いたまま残ると、その部屋にはもう名乗れないGMが居座り、GMが1人もいない部屋では
// 最初に名乗った人がGMになる規則（game-store.jsのREGISTER_PARTICIPANT）が働かなくなる。
// そこで部屋ごとに一度だけ、旧方式の参加者からGMの印を外す（名前と持ち主表示は残す）。
//   version 2 … participantIdをauthTokenから導出する形に変えたとき
//   version 3 … 種を「合言葉」から「表示名」に変えたとき（入力欄の一本化）
const CURRENT_AUTH_VERSION = 3;

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

// 認証情報は部屋ごとに1つのオブジェクトなので、書き換えるときは必ず読んでから混ぜること。
// 丸ごと置き換えると、バージョンを上げただけで入室パスワードが消える。
async function updateAuthMeta(roomId, patch) {
  let meta = {};
  try {
    meta = await readAuthMeta(roomId);
  } catch (error) {
    console.warn(`[server] ${roomId} の認証情報の読み込みに失敗しました:`, error.message);
  }
  const next = { ...meta, ...patch };
  await writeAuthMeta(roomId, next);
  return next;
}

// --- 入室パスワード ---
// 部屋の中身（盤面・ログ・コマ）はWebSocket接続直後のINITでまるごと配られるので、
// パスワードはそこを通す前に確かめる（下のwss.on('connection')）。
//
// 置き場は同期される状態（store.state）ではなく、こちらの認証情報。状態に混ぜると
// 全参加者へ配られ、「部屋の全データ保存」で書き出したファイルにも載ってしまう。
// 平文は保存せず、部屋ごとのソルトを付けたSHA-256のハッシュだけを持つ。
//
// 【強度の限界】SHA-256は高速なので、ハッシュが漏れた場合の総当たり耐性はbcrypt等ほど
// 強くない。仲間内で部屋を仕切るための鍵であって、強固な秘匿の保証ではない。
// 接続あたりの試行回数と待ち時間には下のwss側で制限をかけている。
const MAX_ENTRY_PASSWORD_LENGTH = 64;
// 1接続あたりの試行回数と、JOINを待つ時間。超えたら切る（closeコード4006）。
const MAX_ENTRY_ATTEMPTS = 5;
const ENTRY_TIMEOUT_MS = 30 * 1000;

function hashEntryPassword(salt, password) {
  return createHash('sha256').update(`mojulaX:entry:${salt}:${password}`).digest('hex');
}

/**
 * 入力を保存できる形（ソルトとハッシュ）にする。
 * @returns {{salt: string, hash: string}|null} 空欄ならnull（＝パスワードなしの部屋）
 * @throws {Error} 長すぎる等で受け付けられない場合
 */
function buildEntryPasswordRecord(password) {
  const trimmed = typeof password === 'string' ? password.trim() : '';
  if (!trimmed) return null;
  if (trimmed.length > MAX_ENTRY_PASSWORD_LENGTH) {
    throw new Error(`入室パスワードは${MAX_ENTRY_PASSWORD_LENGTH}文字までにしてください。`);
  }
  const salt = randomUUID().replace(/-/g, '');
  return { salt, hash: hashEntryPassword(salt, trimmed) };
}

// パスワードが設定されていない部屋は誰でも入れる（今までどおり）。
function verifyEntryPassword(record, password) {
  if (!record?.salt || !record?.hash) return true;
  const given = typeof password === 'string' ? password.trim() : '';
  if (!given) return false;
  return equalsSecret(hashEntryPassword(record.salt, given), record.hash);
}

// ヘッダで受け取るパスワード。HTTPヘッダにはASCIIしか載せられないため、ブラウザ側は
// encodeURIComponentしてから送る（js/room-entry.jsのentryPasswordHeaders）。
function entryPasswordFromHeaders(req) {
  const raw = String(req.headers['x-room-password'] || '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}

// 旧方式で付いていたGMの印を外す。既に処理済みの部屋、GMがいない部屋では何もしない。
function clearLegacyGmFlags(roomId, store) {
  const participants = store.state.participants || {};
  const legacyGmIds = Object.values(participants).filter(p => p.isGm).map(p => p.id);
  if (legacyGmIds.length === 0) return false;

  legacyGmIds.forEach(id => store.dispatch('SET_PARTICIPANT_GM', { id, isGm: false }));
  console.log(`[server] ${roomId}: 旧方式の参加者${legacyGmIds.length}人からGMの印を外しました`
    + '（名前を入れて名乗り直した最初の人がGMになります）');
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
  // 音楽の停止（再生は全員が行える。game-store.jsのSET_AUDIO_PLAYBACK／STOP_AUDIO_PLAYBACK）。
  // 聴きたくない人は自分の環境だけミュートする（js/audio-player.js）。
  'STOP_AUDIO_PLAYBACK',
  // 音源の削除。再生中のものを消すとそのチャンネルも止まるので、開けておくと
  // 上のSTOP_AUDIO_PLAYBACKを止めた意味が無くなる。
  'REMOVE_AUDIO_TRACK',
  'ROUND_PROGRESSION_START',
  'ROUND_ADVANCE_PHASE',
  'ROUND_SET_PARTICIPANTS',
  'ROUND_PROGRESSION_END',
  // 行動済みの付け外し・次の手番への割り込み指定・ラウンド進行の設定も進行操作の一部
  'ROUND_SET_ACTED',
  'ROUND_SET_INTERRUPT',
  'SET_ROUND_SETTINGS',
  // 入室メッセージ表示の切り替え。イニシアチブ設定と同じ権限判定に揃える。
  'SET_SHOW_ENTRY_MESSAGES',
  // 入室メッセージ本体の追加はIDENTIFY処理からサーバーだけが直接dispatchする
  // （下のGM_ONLY_ACTIONSチェックを経由しない）。ここに入れているのは、直接WebSocketで
  // このACTIONを騙って偽の入室メッセージを流し込まれないようにする歯止め。
  'ADD_ENTRY_MESSAGE',
  // 背景と盤面サイズ（js/background-dialog.js）。部屋全体の見た目を左右するのでGM限定。
  // 画像のアップロード側（下のIMAGE_PURPOSES.background）も同じくGM限定。
  'SET_BOARD_BACKGROUND',
  // シーン（js/scene-list-dialog.js）。作成・遷移・編集・削除はすべてGM限定。
  'SAVE_SCENE',
  'UPDATE_SCENE_META',
  'APPLY_SCENE',
  'REMOVE_SCENE',
  // 全タブのログの消去（js/log-clear-dialog.js）。一度消すと戻せないのでGM限定。
  'CLEAR_ALL_CHAT_LOGS',
  // GMの付け外しと参加者の削除もGM限定。ここが空いていると、誰でも自分をGMにしてから
  // 上の操作を通せてしまい、他の制限がすべて無意味になる。
  'SET_PARTICIPANT_GM',
  'REMOVE_PARTICIPANT',
  // 読み込んだ部屋データの情報をGMが引き取る操作（js/state-import.js）。情報系で唯一の
  // GM限定アクション：ここが空いていると、誰でも「読み込んだ限定公開の情報」を丸ごと
  // 自分宛てにして読めてしまう。
  'CLAIM_RESTORED_INFO'
  // 情報（js/info-panel.js）のADD/UPDATE/REMOVE_INFO_ENTRY・SET_INFO_SECTION_AUDIENCEは、
  // GM以外も作成・開示できる機能なので入れない。「編集・削除できるのは作成者とGM」は
  // 画面側（js/info-panel.jsのcanEditEntry）だけの制限で、サーバーは強制しない。
  // これはコマの所有者チェック（board-data-driven.jsのcanOperateToken）と同じ姿勢。
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
  // 3Dダイス（vendor/dice-box-threejs）のテクスチャがwebp
  '.webp': 'image/webp',
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
// roomId -> { store, clients: Set<ws>, saveTimer, entryPassword, pendingDelete?, deletion? }
// 部屋数はMAX_ROOMSで固定（サーバー負荷を制限する）。IDは room-1 .. room-{MAX_ROOMS}。
const rooms = new Map();

// 削除中の部屋か。削除は「印を付けた瞬間に部屋を無いものとして扱い、実データの片付けは
// その後ろで進める」方式なので（startRoomDeletion参照）、片付けが終わるまでの間だけ
// entryが墓標としてこのMapに残る。この間は一覧にも出さず、新しい接続も受け付けない。
function isDeletingRoom(roomId) {
  return rooms.get(roomId)?.pendingDelete === true;
}

// 同じスロットの削除の片付けが終わるのを待つ。部屋の作り直しの前にだけ使う：
// 待たずに作ると、古い部屋のファイル一括削除（接頭辞 rooms/room-N/）が、同じ番号で
// 作られた新しい部屋のファイルまで巻き込んで消してしまう。
function waitForRoomDeletion(roomId) {
  const entry = rooms.get(roomId);
  return entry?.pendingDelete ? entry.deletion : Promise.resolve();
}

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
  const cached = rooms.get(roomId);
  // 削除中の部屋は「もう無い部屋」として返す。ここで下へ進めてしまうと、まだ消し終えて
  // いない保存先のデータを読んで部屋がメモリ上に復活し、墓標を上書きしてしまう
  // （一覧に載り続ける→入室できる→操作で書き戻されて完全に生き返る、まで繋がる）。
  if (cached) return cached.pendingDelete ? null : cached;

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
      // 入室パスワードも同じ認証情報に入っているので、混ぜて書く（丸ごと置き換えない）
      meta = { ...meta, version: CURRENT_AUTH_VERSION };
      await writeAuthMeta(roomId, meta)
        .catch((error) => console.warn(`[server] ${roomId} の認証情報の保存に失敗しました:`, error.message));
      if (changed) {
        await writeRoomState(roomId, store.state)
          .catch((error) => console.warn(`[server] ${roomId} の保存に失敗しました:`, error.message));
      }
    }

    // 入室パスワードは接続のたびに参照するので、部屋と一緒にメモリへ載せておく
    // （変更時はhandleSetEntryPasswordがこちらも書き換える）。
    // typing: 記入中の参加者一覧（participantId -> 表示名）。T-013。揮発情報なので
    // entry.store（部屋の状態＝保存・配信対象）には入れず、ここに直接持たせる。
    return { store, clients: new Set(), saveTimer: null, entryPassword: meta.entryPassword || null, typing: new Map() };
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
  // 削除中の部屋は保存しない。ここを通すと、片付けの最中に届いた（あるいは処理中だった）
  // 操作の結果がRedisへ書き戻され、消したはずの部屋が復活する。
  if (entry.pendingDelete) return;
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

// entry.typing（Map）をTYPING_USERSメッセージのpayload用配列に変換する。呼ぶたびに作り直す
// （Mapはそのままだと空オブジェクトとしてJSON化されてしまうため）。T-013。
function typingUsersList(entry) {
  return Array.from(entry.typing, ([id, name]) => ({ id, name }));
}

// このアプリがR2に実体を持っている音源だけがキーを返す。外部URL指定のものはnull。
function pickOwnedAudioKey(track) {
  return track && track.source === 'upload' && track.key ? track.key : null;
}

// その部屋が持ち物として置いたファイルの置き場所（R2上のフォルダに相当する接頭辞）。
// 末尾のスラッシュは必須。これが無いと rooms/room-1 が rooms/room-10 にも一致してしまう。
function roomObjectPrefix(roomId) {
  return `rooms/${roomId}/`;
}

// 消してよいキーか。キーは状態の中にあり、状態はWebSocket経由でクライアントが書けるので、
// 細工したキーで他の部屋のオブジェクトまで消される経路を塞いでおく。
function isOwnKeyOfRoom(roomId, key) {
  return typeof key === 'string' && key.startsWith(roomObjectPrefix(roomId));
}

// 部屋を削除する。要求を受けたその場で「削除中」の印を付け、全員を退室させ、実データの
// 片付けを始める。切断イベントは待たない。
//
// 以前は「印を付けて全員を切り、接続数が0になった時点（ws.on('close')）で消す」方式
// だったが、これだと消えるまでに待ちが入る・そもそも消えないことがあった：
//   ・端末のスリープや回線断で切断イベントが届かない接続が1つでも残ると、接続数は
//     いつまでも0にならない（OSのTCP keepaliveが働くのは数時間後）
//   ・0になっても、片付けが終わるまでの間に一覧取得や再接続がgetOrLoadRoomを呼ぶと、
//     まだ消えていない保存先のデータから部屋がメモリへ復活してしまう
// 印を付けた瞬間から、この部屋は一覧に出ず・接続を受け付けず・保存もしない
// （getOrLoadRoom / isDeletingRoom / schedulePersistForRoom）ので、片付けの完了を
// 待つ必要がなく、待たない方が「消えたのに残っている」時間を作らずに済む。
function startRoomDeletion(roomId, entry) {
  if (entry.pendingDelete) return entry.deletion;
  entry.pendingDelete = true;

  // デバウンス中の保存がこの後に発火すると、削除したはずのデータが保存先へ
  // 復活してしまうため、片付けを始める前に確実に止めておく
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
    entry.saveTimer = null;
  }

  // 削除を要求した本人を含む全員を退室させる。切断の完了は待たない（待つ必要がない）。
  // 集合を先に空にしておくのは、この後に届く操作を確実に配らないため。
  Array.from(entry.clients).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.close(4005, 'room deleted');
  });
  entry.clients.clear();

  entry.deletion = deleteRoomData(roomId)
    .then(() => console.log(`[server] ${roomId} を削除しました`))
    .finally(() => {
      // 墓標を下ろす。ここまで来て初めてこのスロットを空きとして作り直せる
      // （作り直しはwaitForRoomDeletionでここを待っている）。
      if (rooms.get(roomId) === entry) rooms.delete(roomId);
    });

  return entry.deletion;
}

// 部屋の実データ（保存先の状態・認証情報、R2上のファイル、移行元のローカルファイルが
// 残っていればそれも）を消す。呼ぶのはstartRoomDeletionからだけ。
//
// 消す順番は「部屋そのものの記録（状態・認証情報）が先、R2のファイルが後」。記録さえ
// 消えれば部屋は誰からも辿れなくなるので、そこを最短で終わらせる。逆順にすると、
// ファイルの一覧取得と削除（画像や音源の数だけ往復する）が終わるまでの数秒〜数十秒の間、
// 「消したはずの部屋のデータが保存先に残っている」状態が続いてしまう。
//
// R2上のファイルは、状態から辿れるキーではなく接頭辞（rooms/room-N/）でまとめて消す。
// 状態から集める方式だと、差し替えられて参照されなくなった古い背景のように「もう状態に
// 載っていないが実体は残っている」ものを回収できず、孤児として残り続けていた。
//
// なお、シーンの削除や上書き保存では個々のファイルを消さない。同じ画像を現在の盤面と
// 複数のシーンが同時に参照しうるため、個別に消すと「まだ使っているシーンの背景が404に
// なる」という最悪の壊れ方をする。掃除はこの部屋の削除時にまとめて行う。
async function deleteRoomData(roomId) {
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

  if (isR2Configured()) {
    try {
      const { deleted, failed } = await deleteObjectsByPrefix(roomObjectPrefix(roomId));
      console.log(`[server] ${roomId} のファイルを${deleted}件削除しました`
        + (failed > 0 ? `（${failed}件は失敗）` : ''));
    } catch (error) {
      // 一覧が取れなくても部屋データの削除自体は止めない（残るのは孤児だけ）
      console.warn(`[server] ${roomId} のファイル削除に失敗しました:`, error.message);
    }
  }
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

// 画像（シーンの背景・盤面の背景）の受け入れ形式。
// SVGは入れないこと。R2の公開ドメインからそのまま配信されるため、SVGを許すと
// そのオリジン上で任意のスクリプトを置けてしまう（保存型XSS）。
const IMAGE_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

// 画像1枚の上限。背景画像は盤面いっぱいに引き伸ばす用途なので音源ほど大きくない。
const MAX_IMAGE_BYTES = (Number(process.env.MAX_IMAGE_MB) || 8) * 1024 * 1024;

// POST /api/audio・POST /api/image の共通処理。ファイルをR2へ置き、公開URLを返す。
//
// 誰でも叩けるエンドポイントなので、「実在する部屋ID」「許可した形式のみ」「サイズ上限」は
// 必ず通すこと。名乗りはWebSocketと同じ値をヘッダで受け取る（名乗り用のトークンなので、
// ログに残りうるクエリ文字列には載せない）。
//
// requireGm: GMだけに許すか。部屋全体を左右する操作（音源の追加・盤面の背景）はtrue。
// コマやパネルの画像はfalse——ADD_CHARACTER・ADD_PANEL自体がGM限定でないので、ここだけ
// GMを要求するとPLが自分のコマに立ち絵を付けられなくなる（状態への書き込み権限と揃える）。
//
// 音源と画像で別々に書くと、片方だけ認証やサイズ判定が緩む事故が起きやすいので1本にまとめる。
// fallbackExtension: 表に無い種類も受け入れて、この拡張子で保存する（音源はこちら。
// audio/x-m4aのようにブラウザ次第で名前が揺れるため、prefixが合っていれば通す）。
// nullなら表に載っている種類だけを受け入れる（画像はこちら。image/svg+xmlのような
// 危険な形式を確実に閉め出すため、prefix判定だけで通してはいけない）。
async function handleMediaUpload(req, res, {
  typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true,
  forbiddenMessage, unavailableMessage, wrongTypeMessage, label
}) {
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

  // 入室パスワードのある部屋では、入室していない人からのアップロードは受け付けない。
  // GM判定だけに任せると、GMが1人もいない部屋（canOperateAsGmが全員trueを返す）では
  // 外から素通りしてしまう。
  if (!verifyEntryPassword(entry.entryPassword, entryPasswordFromHeaders(req))) {
    sendJson(res, 403, { error: 'この部屋の入室パスワードが必要です' });
    return;
  }

  if (requireGm) {
    const participantId = String(req.headers['x-participant-id'] || '');
    const authToken = String(req.headers['x-auth-token'] || '');
    const identified = verifyIdentity(participantId, authToken);
    const developer = identified && isDeveloperToken(roomId, authToken);

    if (!developer && !canOperateAsGm(entry.store.state, identified ? participantId : null)) {
      sendJson(res, 403, { error: forbiddenMessage });
      return;
    }
  }

  // 形式の判定はR2の設定有無より先に行う。おかしなリクエストはサーバーの都合に関わらず
  // おかしいので、そちらを先に返したほうが理由が分かりやすく、R2の無い検証環境でも
  // この判定（SVGを弾けているか等）を確かめられる。
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim();
  const ext = extensions[contentType] || fallbackExtension;
  if (!contentType.startsWith(typePrefix) || !ext) {
    sendJson(res, 415, { error: wrongTypeMessage });
    return;
  }

  if (!isR2Configured()) {
    sendJson(res, 503, { error: unavailableMessage });
    return;
  }

  const tooLargeMessage = `ファイルが大きすぎます（上限 ${Math.floor(maxBytes / 1024 / 1024)}MB）`;

  // 送信途中のクライアントに対して応答を返しつつ接続を切るため、ブラウザ側では
  // 413の本文ではなく通信エラーとして見えることがある（これは避けられない）。
  // そのためUI側はGETで上限を取得し、アップロード前に自分で弾いている
  // （js/audio-dialog.jsのcurrentMaxBytes）。こちらは直接APIを叩かれた場合の歯止め。
  function rejectTooLarge() {
    res.on('finish', () => req.destroy());
    sendJson(res, 413, { error: tooLargeMessage });
  }

  // Content-Lengthで分かる場合はボディを一切読まずに断る（これが通常の経路）
  const declaredLength = Number(req.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    rejectTooLarge();
    return;
  }

  let body;
  try {
    body = await readBinaryBody(req, maxBytes);
  } catch (error) {
    if (error.code === 'TOO_LARGE') {
      // Content-Lengthが無い（チャンク送信等）場合の保険
      rejectTooLarge();
      return;
    }
    sendJson(res, 400, { error: 'ファイルの読み込みに失敗しました' });
    return;
  }

  // 部屋の削除時に接頭辞でまとめて消せるよう、必ず部屋のフォルダの下に置く
  const key = `${roomObjectPrefix(roomId)}${randomUUID()}.${ext}`;

  try {
    await putObject(key, body, contentType);
  } catch (error) {
    console.warn(`[server] ${roomId} の${label}アップロードに失敗しました:`, error.message);
    sendJson(res, 502, { error: 'アップロードに失敗しました' });
    return;
  }

  sendJson(res, 200, { key, url: publicUrlFor(key) });
}

// POST /api/audio?room=room-N：音源をR2へ置き、再生用の公開URLを返す。
function handleAudioUpload(req, res) {
  return handleMediaUpload(req, res, {
    typePrefix: 'audio/',
    extensions: AUDIO_EXTENSIONS,
    // 表に無い音声形式も従来どおり受け入れる（拡張子は分からないのでbin。再生時は
    // ブラウザが中身を見て判断するため、キーの見た目が変わるだけで支障はない）
    fallbackExtension: 'bin',
    maxBytes: MAX_AUDIO_BYTES,
    label: '音源',
    forbiddenMessage: '音源の追加はGMだけが行えます',
    unavailableMessage: 'このサーバーでは音源のアップロードが設定されていません。URLでの追加をご利用ください。',
    wrongTypeMessage: '音声ファイルを指定してください'
  });
}

// --- 取り込んだ画像を、その部屋の持ち物にする ---
// JSONから読み込んだ状態やコマには、他所で作られた画像が混ざっている。
//   ・データURL … この機能より前のエクスポート、コマ作成ツールの出力
//   ・別の部屋のR2 URL … 部屋をまたいでコマや部屋データを持ち込んだ場合
// どちらもそのまま置くと具合が悪い。データURLは状態に居座って重く、別の部屋のURLは
// 元の部屋を削除したときフォルダごと消えて画像が404になる（deleteRoomDataは参照元を
// 調べずに消す）。取り込みの時点でこの部屋のフォルダへ複製し直して自己完結させる。
//
// 自分のR2でない外部URLは触らない（他所の持ち物を勝手に複製しない。取り込む先が
// 消えても影響しない）。

const DATA_URL_PATTERN = /^data:([^;,]+)[^,]*,/;

// データURL（base64のみ。base64でないものはこのアプリが作らない）を実体に戻す。
function decodeDataUrl(dataUrl) {
  const match = String(dataUrl).match(DATA_URL_PATTERN);
  if (!match) return null;
  const contentType = match[1];
  if (!IMAGE_EXTENSIONS[contentType]) return null; // 想定外の形式は触らない
  const base64 = String(dataUrl).slice(match[0].length);
  try {
    return { body: Buffer.from(base64, 'base64'), contentType };
  } catch {
    return null;
  }
}

/**
 * 画像1つをこの部屋の持ち物にする。変換が要らなければ元の値をそのまま返す。
 * @returns {Promise<string>} 置き換え後の画像文字列
 */
async function adoptImage(roomId, image) {
  if (!image || typeof image !== 'string' || !isR2Configured()) return image;

  const prefix = roomObjectPrefix(roomId);
  let source = null;

  if (image.startsWith('data:')) {
    source = decodeDataUrl(image);
  } else {
    const key = keyFromPublicUrl(image);
    if (!key) return image;              // 自分のR2ではない外部URL → 触らない
    if (key.startsWith(prefix)) return image; // 既にこの部屋の持ち物
    try {
      source = await getObject(key);
    } catch (error) {
      // 元が消えている等。取り込み自体は続ける（画像はURLのまま残り、表示だけ壊れる）
      console.warn(`[server] ${roomId}: 取り込んだ画像を複製できませんでした (${key}):`, error.message);
      return image;
    }
  }

  if (!source || source.body.length > MAX_IMAGE_BYTES) return image;

  const ext = IMAGE_EXTENSIONS[source.contentType] || 'bin';
  const newKey = `${prefix}${randomUUID()}.${ext}`;
  try {
    await putObject(newKey, source.body, source.contentType);
  } catch (error) {
    console.warn(`[server] ${roomId}: 取り込んだ画像を保存できませんでした:`, error.message);
    return image;
  }
  return publicUrlFor(newKey);
}

/**
 * 状態に含まれる画像をまとめてこの部屋の持ち物にする（部屋の作成時・全データ読み込み時）。
 * 同じ画像が何度も出てくる場合は1回だけ複製して使い回す。
 */
async function adoptStateImages(roomId, state) {
  if (!isR2Configured() || !state || typeof state !== 'object') return state;

  const cache = new Map();
  const adopt = async (image) => {
    if (!image || typeof image !== 'string') return image;
    if (!cache.has(image)) cache.set(image, await adoptImage(roomId, image));
    return cache.get(image);
  };

  const adoptPanels = async (panels) => {
    const next = {};
    for (const [id, panel] of Object.entries(panels || {})) {
      next[id] = { ...panel, image: await adopt(panel?.image) };
    }
    return next;
  };

  const tokens = {};
  for (const [id, token] of Object.entries(state.tokens || {})) {
    tokens[id] = { ...token, image: await adopt(token?.image) };
  }

  const scenes = {};
  for (const [id, scene] of Object.entries(state.room?.scenes || {})) {
    scenes[id] = {
      ...scene,
      backgroundImage: await adopt(scene?.backgroundImage),
      panels: await adoptPanels(scene?.panels)
    };
  }

  return {
    ...state,
    tokens,
    panels: await adoptPanels(state.panels),
    room: {
      ...(state.room || {}),
      backgroundImage: await adopt(state.room?.backgroundImage),
      scenes
    }
  };
}

// 画像の用途ごとに要求する権限。盤面の背景は部屋全体を左右するのでGM限定だが、
// コマ・パネルの画像は誰でも置ける（ADD_CHARACTER・ADD_PANELがGM限定でないのと揃える）。
// 知らない用途は塞ぐ側に倒す（増やすときはここに明示的に足す）。
const IMAGE_PURPOSES = {
  background: { requireGm: true, forbiddenMessage: '背景画像の変更はGMだけが行えます' },
  token: { requireGm: false },
  panel: { requireGm: false }
};

// POST /api/image?room=room-N&purpose=background|token|panel
// 画像をR2へ置き、表示用の公開URLを返す。状態にはこのURLだけを載せる
// （データURLのまま持つと、コマ・パネル・シーンの数だけ画像が部屋データに積み上がり、
// アクションのたびに状態ごとRedisへ書き直されるため）。
function handleImageUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const purpose = IMAGE_PURPOSES[url.searchParams.get('purpose')];

  if (!purpose) {
    sendJson(res, 400, { error: '画像の用途(purpose)が不正です' });
    return;
  }

  return handleMediaUpload(req, res, {
    typePrefix: 'image/',
    extensions: IMAGE_EXTENSIONS,
    maxBytes: MAX_IMAGE_BYTES,
    requireGm: purpose.requireGm,
    label: '画像',
    forbiddenMessage: purpose.forbiddenMessage,
    unavailableMessage: 'このサーバーでは画像のアップロードが設定されていません。',
    wrongTypeMessage: '画像ファイル（PNG・JPEG・GIF・WebP）を指定してください'
  });
}

// POST /api/image/copy?room=room-N&purpose=token|panel
// body: { sourceUrl }
// 既にR2にある画像を、この部屋のフォルダへ複製する。コマのJSONを別の部屋から持ち込んだ
// ときに使う（そのままだと元の部屋を消した拍子に画像が404になる。adoptImage参照）。
//
// ブラウザから直接R2を読むにはR2側のCORS設定が要るため、サーバーが代わりに読む。
// 取りに行くURLは自分のR2の公開URLだけに限る（任意のURLを取りに行けると、サーバーを
// 踏み台にして本来触れない場所へリクエストを飛ばせてしまう）。
async function handleImageCopy(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room');
  const purpose = IMAGE_PURPOSES[url.searchParams.get('purpose')];

  if (!isValidRoomId(roomId)) {
    sendJson(res, 400, { error: '部屋IDが不正です' });
    return;
  }
  if (!purpose) {
    sendJson(res, 400, { error: '画像の用途(purpose)が不正です' });
    return;
  }

  const entry = await getOrLoadRoom(roomId);
  if (!entry) {
    sendJson(res, 404, { error: 'その部屋はまだ作成されていません' });
    return;
  }

  // アップロードと同じく、入室していない人からの複製は受け付けない（handleMediaUpload参照）
  if (!verifyEntryPassword(entry.entryPassword, entryPasswordFromHeaders(req))) {
    sendJson(res, 403, { error: 'この部屋の入室パスワードが必要です' });
    return;
  }

  if (purpose.requireGm) {
    const participantId = String(req.headers['x-participant-id'] || '');
    const authToken = String(req.headers['x-auth-token'] || '');
    const identified = verifyIdentity(participantId, authToken);
    const developer = identified && isDeveloperToken(roomId, authToken);
    if (!developer && !canOperateAsGm(entry.store.state, identified ? participantId : null)) {
      sendJson(res, 403, { error: purpose.forbiddenMessage });
      return;
    }
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'リクエストの形式が不正です。' });
    return;
  }

  // 複製元の検証はR2の設定有無より先に行う。おかしなリクエストはサーバーの都合に
  // 関わらずおかしいので、R2の無い検証環境でもこの判定を確かめられるようにしておく。
  const sourceUrl = String(body.sourceUrl || '');
  if (!keyFromPublicUrl(sourceUrl)) {
    sendJson(res, 400, { error: 'この画像は複製できません（このサーバーの画像ではありません）' });
    return;
  }

  if (!isR2Configured()) {
    sendJson(res, 503, { error: 'このサーバーでは画像のアップロードが設定されていません。' });
    return;
  }

  const adopted = await adoptImage(roomId, sourceUrl);
  if (adopted === sourceUrl) {
    // 元が消えている等で複製できなかった。呼び出し側は元のURLのまま続行する。
    sendJson(res, 502, { error: '画像の複製に失敗しました' });
    return;
  }

  sendJson(res, 200, { url: adopted });
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
    // lockedは鍵マークの表示に使うだけ。ハッシュやソルトは返さない。
    list.push({ id, occupied: true, name, activePlugin, bcdiceSystem, locked: !!entry.entryPassword });
  }
  sendJson(res, 200, { maxRooms: MAX_ROOMS, rooms: list });
}

// POST /api/rooms：空きスロットに新しい部屋を作成する。
// body: { id, name, activePlugin, bcdiceSystem, entryPassword?, importedState? }
async function handleCreateRoom(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'リクエストの形式が不正です。' });
    return;
  }

  const {
    id, name, activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM, entryPassword, importedState
  } = body;

  if (!isValidRoomId(id)) {
    sendJson(res, 400, { error: '無効な部屋IDです。' });
    return;
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    sendJson(res, 400, { error: '部屋名を入力してください。' });
    return;
  }

  // 入室パスワード（任意）。長さの検証はここで行い、駄目なら部屋を作らずに返す。
  let entryPasswordRecord;
  try {
    entryPasswordRecord = buildEntryPasswordRecord(entryPassword);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  // 同じ番号の部屋を削除した直後なら、ファイルの片付けが終わるまでここで待つ。
  // 待たずに作ると、古い部屋の一括削除が新しい部屋のファイルまで消してしまう。
  await waitForRoomDeletion(id);

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

    // 取り込みは必ずadoptImportedStateを通す（js/state-import.js）。この部屋にはまだ誰も
    // 入っていないので参加者一覧は空で渡す＝ファイル側の参加者（GMの印を含む）を捨て、
    // 「最初に名乗った人がGMになる」規則に戻す。
    initialState = adoptImportedState({
      ...importedState,
      room: {
        ...importedRoom,
        name: trimmedName,
        activePlugin: resolvedActivePlugin,
        bcdiceSystem: resolvedBcdiceSystem
      }
    }, { participants: {} });
  } else {
    initialState = createInitialGameState({ name: trimmedName, activePlugin: safeActivePlugin, bcdiceSystem: safeBcdiceSystem });
  }

  // importedStateがラウンド進行機能より前にエクスポートされたデータだと、roundキーが
  // 無いままstateを直接コンストラクタへ渡すことになり、後でROUND_*アクションのreducerが
  // prevState.round.activeへのアクセスで例外を投げてサーバーごと落ちる（getOrLoadRoomで
  // 修正済みなのと同じ原因）。hydrate()を通して欠けているキーを補ってから使う。
  const store = new ImmutableStore(createInitialGameState());
  // 取り込んだデータに混ざっている画像（データURL・他の部屋のURL）を、この部屋の
  // 持ち物へ複製し直す（adoptStateImages参照）。部屋はまだ誰にも配っていないので、
  // ここで直しておけば以後は普通の画像として扱える。
  store.hydrate(await adoptStateImages(id, initialState));

  try {
    await writeRoomState(id, store.state);
  } catch (error) {
    console.warn(`[server] ${id} の作成に失敗しました:`, error.message);
    sendJson(res, 500, { error: '部屋の作成に失敗しました。' });
    return;
  }

  // 認証情報はここで書いておく。書かずにおくと、次にサーバーが読み直したときに
  // getOrLoadRoomの移行処理が走り、入室パスワードごと初期化されてしまう。
  try {
    await updateAuthMeta(id, { version: CURRENT_AUTH_VERSION, entryPassword: entryPasswordRecord });
  } catch (error) {
    console.warn(`[server] ${id} の認証情報の保存に失敗しました:`, error.message);
    sendJson(res, 500, { error: '部屋の作成に失敗しました。' });
    return;
  }

  rooms.set(id, { store, clients: new Set(), saveTimer: null, entryPassword: entryPasswordRecord });
  sendJson(res, 201, { id });
}

// PUT /api/rooms/<id>/entry-password：入室パスワードの変更・解除（GM限定）。
// body: { password }　空欄なら解除。現在のパスワードは要求しない（既に入室しているGMが行う操作のため）。
// 変更しても入室中の接続は切らない。次に繋ぐときから新しいパスワードが要る。
async function handleSetEntryPassword(req, res, roomId) {
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
    sendJson(res, 403, { error: '入室パスワードの変更はGMだけが行えます' });
    return;
  }

  // 今のパスワードを知らない人が変えられないよう、ここも入室済みであることを求める
  // （GM判定だけだと、GMが1人もいない部屋では外から通ってしまう）。
  if (!verifyEntryPassword(entry.entryPassword, entryPasswordFromHeaders(req))) {
    sendJson(res, 403, { error: 'この部屋の入室パスワードが必要です' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'リクエストの形式が不正です。' });
    return;
  }

  let record;
  try {
    record = buildEntryPasswordRecord(body?.password);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  try {
    await updateAuthMeta(roomId, { entryPassword: record });
  } catch (error) {
    console.warn(`[server] ${roomId} の入室パスワードの保存に失敗しました:`, error.message);
    sendJson(res, 500, { error: '入室パスワードの保存に失敗しました。' });
    return;
  }

  entry.entryPassword = record;
  console.log(`[server] ${roomId}: 入室パスワードを${record ? '設定' : '解除'}しました`);
  sendJson(res, 200, { locked: !!record });
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

  if (url.pathname.startsWith('/api/rooms/') && url.pathname.endsWith('/entry-password') && req.method === 'PUT') {
    const roomId = url.pathname.slice('/api/rooms/'.length, -'/entry-password'.length);
    await handleSetEntryPassword(req, res, decodeURIComponent(roomId));
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

  if (url.pathname === '/api/image' && req.method === 'POST') {
    await handleImageUpload(req, res);
    return;
  }

  if (url.pathname === '/api/image/copy' && req.method === 'POST') {
    await handleImageCopy(req, res);
    return;
  }

  // 画像アップロードが使えるか（使えない環境ではブラウザ側がデータURLへ退避する）。
  // publicBaseUrlは「この画像は自分の部屋の持ち物か」をブラウザ側が判定するのに使う。
  if (url.pathname === '/api/image' && req.method === 'GET') {
    sendJson(res, 200, {
      uploadEnabled: isR2Configured(),
      maxBytes: MAX_IMAGE_BYTES,
      publicBaseUrl: isR2Configured() ? publicBaseUrl() : null
    });
    return;
  }

  await serveStaticFile(req, res);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room');

  // 生存確認の初期値。以後はpongが返るたびに立て直す（下のheartbeatTimer参照）。
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  if (!isValidRoomId(roomId)) {
    ws.close(4000, 'invalid room');
    return;
  }

  // 削除中の部屋。getOrLoadRoomはこれを「無い部屋」としてnullで返すので、
  // 「まだ作られていない部屋」と区別してここで先に見る（案内の文言が変わる）。
  if (isDeletingRoom(roomId)) {
    ws.close(4005, 'room deleted');
    return;
  }

  const entry = await getOrLoadRoom(roomId);
  if (!entry) {
    ws.close(4004, 'room not found');
    return;
  }

  // 読み込みを待っている間に削除された場合
  if (entry.pendingDelete) {
    ws.close(4005, 'room deleted');
    return;
  }

  // 入室パスワードが設定されている部屋では、正しいパスワードをJOINで受け取るまで
  // INIT（＝部屋の中身）を送らず、他のメッセージも一切受け付けない。
  // clientsへ加えるのも認証が通ってからにすること。ここに入れた時点で、他の人の操作が
  // ブロードキャストで流れ込む（＝中身が漏れる）ため。
  let entryAuthorized = !entry.entryPassword;
  let entryAttempts = 0;
  let entryTimer = null;

  function admit() {
    // 入室パスワードの入力待ちのまま部屋が削除されることがある。この接続はclientsに
    // 入っていないので削除時の一斉切断でも切られておらず、ここを素通しにすると、
    // 消えた部屋の中身を配ってしまう（以後の操作で部屋ごと復活もする）。
    if (entry.pendingDelete) {
      ws.close(4005, 'room deleted');
      return;
    }
    entry.clients.add(ws);
    console.log(`[server] ${roomId} クライアント接続（現在${entry.clients.size}件）`);
    ws.send(JSON.stringify({ type: 'INIT', state: entry.store.state }));
    // 記入中はentry.store（INITの中身）に乗らない揮発情報なので別送りする。T-013。
    // 誰も記入中でなくても送る：省くと、再接続した本人の画面に切断前の古い一覧が
    // 残ったままになってしまう（空の一覧で必ず上書きする）。
    ws.send(JSON.stringify({ type: 'TYPING_USERS', users: typingUsersList(entry) }));
  }

  if (entryAuthorized) {
    admit();
  } else {
    ws.send(JSON.stringify({ type: 'ENTRY_REQUIRED' }));
    // 名乗らないまま繋ぎっぱなしにされるのを防ぐ（総当たりの足止ても兼ねる）
    entryTimer = setTimeout(() => {
      if (!entryAuthorized && ws.readyState === WebSocket.OPEN) ws.close(4006, 'entry timeout');
    }, ENTRY_TIMEOUT_MS);
  }

  // この接続が名乗り、検証まで通った参加者ID。名乗っていない（ゲスト）ならnullのまま。
  // IDENTIFYメッセージを受け取るまでは誰でもないものとして扱う。
  let verifiedParticipantId = null;
  // 開発用の合言葉での名乗りか（isDeveloperToken参照）。GMでなくてもGMと同じ操作ができる。
  let isDeveloper = false;
  // この接続で入室メッセージを既に追加したか。ブラウザ側は同じWebSocket接続に対して
  // open時・INIT受信時・NET_INITIALIZED経由と複数回IDENTIFYを送ってくる（既存の挙動）ため、
  // 「他の接続に同じparticipantIdが無いか」だけでは自分自身の再送を弾けない。
  // 接続ごとに一度追加したら二度と追加しないようにする。
  let entryMessageSent = false;

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

    // 削除中の部屋への操作は全て捨てる。切断は要求したがブラウザ側にまだ届いておらず、
    // 行き違いで届いた操作を処理すると、片付けたそばから状態が書き戻される。
    if (entry.pendingDelete) return;

    // 入室パスワードの照合。通るまでは部屋の中身を一切渡さない（verifyEntryPassword参照）。
    if (message.type === 'JOIN') {
      if (entryAuthorized) return;

      entryAttempts += 1;
      if (!verifyEntryPassword(entry.entryPassword, message.password)) {
        console.warn(`[server] ${roomId}: 入室パスワードが違います（${entryAttempts}回目）`);
        if (entryAttempts >= MAX_ENTRY_ATTEMPTS) {
          // 総当たり対策。繋ぎ直せば再挑戦できるが、そのたびに接続からやり直しになる。
          ws.close(4006, 'entry rejected');
          return;
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ENTRY_REJECTED' }));
        return;
      }

      entryAuthorized = true;
      clearTimeout(entryTimer);
      admit();
      return;
    }

    // 認証前は他のメッセージを受け付けない（名乗りも操作も削除も）
    if (!entryAuthorized) return;

    // 名乗り。表示名から導出した公開IDとトークンを突き合わせる（verifyIdentity参照）。
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

        // クライアントの丸めを信用せず、空文字・空白のみはサーバー側で「ゲスト」に丸める。
        // 入室メッセージと記入中一覧（T-013）の両方でこの表記に揃えるため、この接続の
        // 表示名としてここで一度だけ決める。
        const rawName = typeof message.name === 'string' ? message.name.trim() : '';
        ws.participantName = rawName || 'ゲスト';

        // 入室メッセージ。同じparticipantIdの接続がこの部屋にまだ1つも無い場合だけ、既定の
        // チャットタブへ1件追加する（再接続・タブの複数開きでは増やさない）。この接続自身は
        // admit()で既にentry.clientsへ入っているため、自分を除いて数える
        // （client.participantIdは下でこの後に立てる。先に立てると常に1件ヒットしてしまう）。
        if (showsEntryMessages(entry.store.state) && !entryMessageSent) {
          const alreadyConnected = Array.from(entry.clients).some(
            (client) => client !== ws && client.participantId === participantId
          );
          if (!alreadyConnected) {
            const entryPayload = { name: ws.participantName, entrySoundUrl: ENTRY_SOUND_URL || null };
            entry.store.dispatch('ADD_ENTRY_MESSAGE', entryPayload);
            schedulePersistForRoom(roomId, entry);
            // senderをnullにして、名乗った本人（この接続）にも配る
            broadcastToRoom(entry, null, { type: 'ACTION', action: 'ADD_ENTRY_MESSAGE', payload: entryPayload });
          }
          // この接続では以後IDENTIFYが何度来ても追加しない（alreadyConnected判定の結果に関わらず、
          // 「この接続で1回試みた」時点で処理済み扱いにする）。
          entryMessageSent = true;
        }
        ws.participantId = participantId;
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

    // 記入中の通知（T-013）。メイン入力欄が空⇔非空に変わった瞬間だけクライアントから届く
    // （打鍵毎ではない）。部屋の状態（entry.store）には乗せない揮発情報なので、entry直下の
    // typing（Map）で直接持つ。ADD_ENTRY_MESSAGEと同じく本人確認が済んだ参加者だけを対象にする
    // （ゲストは名前も参加者IDも安定しないため対象外）。
    if (message.type === 'TYPING_START' || message.type === 'TYPING_STOP') {
      if (!verifiedParticipantId) return;
      ws.isTyping = message.type === 'TYPING_START';
      if (ws.isTyping) {
        entry.typing.set(verifiedParticipantId, ws.participantName || 'ゲスト');
      } else {
        // 同じ参加者が複数タブを開いていて、片方だけ記入をやめた場合に一覧から
        // 消してしまわないよう、他の接続がまだ記入中でないかを確かめてから消す。
        const stillTypingElsewhere = Array.from(entry.clients).some(
          (client) => client !== ws && client.participantId === verifiedParticipantId && client.isTyping
        );
        if (!stillTypingElsewhere) entry.typing.delete(verifiedParticipantId);
      }
      broadcastToRoom(entry, null, { type: 'TYPING_USERS', users: typingUsersList(entry) });
      return;
    }

    // チャット送信音。素の発言か（コマンドやBCDiceへの判定でないか）はクライアント側
    // （js/main.jsのsubmitChatText）が判断し、素の発言だったときだけこのメッセージを送ってくる。
    // URLは入室音と同じ形で、サーバーの環境変数CHAT_SEND_SOUND_URLから読む（ハードコードしない）。
    // 送信者を含む部屋の全員に配るため、入室音（ADD_ENTRY_MESSAGE）と同じくbroadcastToRoomの
    // senderをnullにする。状態には何も乗せない一回きりの通知なので、store.dispatchは通さない
    // （persistも不要）。
    if (message.type === 'REQUEST_CHAT_SEND_SOUND') {
      broadcastToRoom(entry, null, {
        type: 'ACTION',
        action: 'CHAT_SEND_SOUND',
        payload: { chatSendSoundUrl: CHAT_SEND_SOUND_URL || null }
      });
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      // 接続中の全員の状態を丸ごと置き換えるため、部屋の削除と同じくGM限定にする
      if (!mayOperateAsGm()) {
        rejectAndResync('REPLACE_STATE');
        return;
      }
      // 読み込んだファイルに混ざっている画像（データURL・他の部屋のURL）をこの部屋の
      // 持ち物へ複製し直す（adoptStateImages参照）。複製には時間がかかるので、
      // その間に届いた他の操作は先に適用され、この置き換えで上書きされる——が、
      // 全データの読み込みは元々そういう操作なので問題にしない。
      // 送り手側でも通しているが、ここでも必ず通す（js/state-import.js）。今この部屋にいる
      // 参加者一覧を引き継ぐことで、読み込んだGMがGMのままでいられる。
      const importedState = adoptImportedState(message.state, {
        participants: entry.store.state.participants
      });
      adoptStateImages(roomId, importedState).then((adopted) => {
        entry.store.hydrate(adopted);
        schedulePersistForRoom(roomId, entry);
        // 送り手にも配る。送り手の画面には複製前（データURL等）が入っているため、
        // ここで配り直さないと画面とサーバーで画像の持ち方が食い違ったままになる。
        broadcastToRoom(entry, null, { type: 'INIT', state: entry.store.state });
      }).catch((error) => {
        console.warn(`[server] ${roomId}: 読み込んだ状態の取り込みに失敗しました:`, error.message);
      });
      return;
    }

    if (message.type === 'DELETE_ROOM') {
      if (!mayOperateAsGm()) {
        // 送り手の画面では何も起きていないので、状態を戻す必要はない
        console.warn(`[server] ${roomId}: GM以外からの部屋削除の要求を拒否しました`);
        return;
      }
      // 全員（自分含む）を退室させ、その場で片付けを始める（startRoomDeletion参照）。
      // この呼び出しが返った時点で、部屋は一覧からも入室先からも消えている。
      startRoomDeletion(roomId, entry);
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
    // キーは状態経由でクライアントが書ける値なので、自分の部屋のものだけを消す
    if (removedAudioKey && isOwnKeyOfRoom(roomId, removedAudioKey)) {
      deleteObject(removedAudioKey)
        .catch((error) => console.warn(`[server] 音源の削除に失敗しました (${removedAudioKey}):`, error.message));
    }
    schedulePersistForRoom(roomId, entry);
    broadcastToRoom(entry, ws, { type: 'ACTION', action: message.action, payload: message.payload });
  });

  ws.on('close', () => {
    clearTimeout(entryTimer);
    // 入室パスワードを通らないまま切れた接続はclientsに入っていない（deleteは空振りでよい）
    entry.clients.delete(ws);
    // 記入中のまま切断された場合、一覧に残り続けないようここで落とす（T-013）。
    // 同じ参加者の別タブがまだ記入中なら（TYPING_STOP同様）消さない。
    if (verifiedParticipantId && entry.typing.has(verifiedParticipantId)) {
      const stillTypingElsewhere = Array.from(entry.clients).some(
        (client) => client.participantId === verifiedParticipantId && client.isTyping
      );
      if (!stillTypingElsewhere) {
        entry.typing.delete(verifiedParticipantId);
        broadcastToRoom(entry, null, { type: 'TYPING_USERS', users: typingUsersList(entry) });
      }
    }
    console.log(`[server] ${roomId} クライアント切断（残り${entry.clients.size}件）`);
  });
});

// --- 落ちた接続の掃除 ---
// 端末のスリープ、回線断、タブの凍結（スマホのバックグラウンド）では、ブラウザからの
// closeフレームが届かないままTCP接続だけが残る。OSのkeepaliveが気づくのは数時間後なので、
// 放っておくとサーバーから見た部屋の人数がいつまでも減らない（実際には誰も居ないのに
// 「まだ1人いる」ように見える）。一定間隔でpingを送り、次の間隔までにpongが返らない
// 接続は落ちたものとして切る。terminate()でもcloseイベントは発火するので、
// 人数の減算（上のws.on('close')）は通常の切断と同じ経路で行われる。
// 落ちた接続に気づくまでの最長時間はこの2倍（pingを送った次の回で判定するため）。
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      client.terminate();
      return;
    }
    client.isAlive = false;
    client.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeatTimer));

httpServer.listen(PORT, () => {
  console.log(`[server] サーバーを起動しました: http://localhost:${PORT}　（部屋数上限: ${MAX_ROOMS}）`);
});
