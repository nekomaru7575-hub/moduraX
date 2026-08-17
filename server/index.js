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
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { Redis } from '@upstash/redis';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
// スタンプの一覧。送られてきたIDが実在するかの確認だけに使う（画像には触らない）。
import { isKnownStampId } from '../js/stamp-registry.js';
import { STAMP_RATE_LIMIT } from '../js/stamp-catalog.js';
import {
  ImmutableStore, createInitialGameState, DEFAULT_BCDICE_SYSTEM, listPlugins, showsEntryMessages,
  MAIN_CHAT_TAB_ID, SCENE_BGM_STOP
} from '../js/game-store.js';
// キャラクターシートの取り込み先の宣言。どのURLを取りに行ってよいかはプラグインだけが知る。
import { getPluginSheetSource } from '../js/parameters/registry.js';
import { adoptImportedState } from '../js/state-import.js';
import { parseUntrustedJson } from '../js/untrusted-json.js';
import {
  isR2Configured, putObject, getObject, deleteObject, deleteObjectsByPrefix,
  publicUrlFor, publicBaseUrl, keyFromPublicUrl, totalBytesByPrefix
} from './r2.js';
// 重い操作（取り込み・書き出し・アップロード）を、メモリの残りを見てから通す。
import {
  acquireHeavySlot, hasRoomFor, maxBodyBytesFor, describeBudget
} from './memory-budget.js';

const PORT = Number(process.env.PORT) || 8081;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 5;
// 音源1ファイルの上限。MP3 192kbpsで20MB＝約14分。環境変数で調整できるようにしておく。
const MAX_AUDIO_BYTES = (Number(process.env.MAX_AUDIO_MB) || 20) * 1024 * 1024;
// 部屋データの取り込み以外のJSONボディの上限。パスワード・URL・IDの配列しか来ないので
// 1MBあれば足りる。取り込みだけは桁が違うので別枠（MAX_IMPORT_BYTES参照）。
const MAX_SMALL_JSON_BYTES = 1024 * 1024;
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
// 操作が途切れてから保存するまでの待ち時間と、操作が続いている場合でも必ず保存する上限。
// 上限を延ばすほどRedisへの書き込み回数は減るが、プロセスが異常終了したときに失われる
// 操作の幅も広がる（通常の停止では終了時に書き出すので失われない。flushAllPendingSaves参照）。
const SAVE_DEBOUNCE_MS = 1000;
const SAVE_MAX_WAIT_MS = 5000;
// 1タブあたり、保存先に残すチャットログの件数（stateForPersist参照）。
// 実測で1件あたり約150バイトなので、1000件で約150KB分。
const PERSISTED_CHAT_ENTRIES = 1000;

// 部屋データの保存先。Upstashの接続情報があればRedis、無ければローカルファイル
// （server/rooms/room-N.json）だけで動く「ローカルモード」になる。検証用の起動
// （server/dev-local.js）は接続情報を渡さないことでこのモードに入り、本番のデータへ
// 一切触れずに動作確認できる。
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
// responseEncoding: クライアントの既定はbase64で、GETのレスポンスが1.33倍に膨らむ。
// これは値に不正なUTF-8が混じっていても壊れないようにするための保険で、このアプリが
// 入れるのはJSONに載る値だけなので要らない。実データ（日本語・絵文字・サロゲートペア・
// 制御文字）で往復を確かめたうえで切っている。読み込みが12〜24%減る。
// enableTelemetry: 毎リクエストに付く計測用ヘッダを止める。
const redis = USE_REDIS
  ? Redis.fromEnv({ responseEncoding: false, enableTelemetry: false })
  : null;

// Redis運用へ移る前のローカルファイルを、Redisに無い部屋の代わりとして読むかどうか。
// 既定はオフ。オンにすると「Redis側で削除した部屋が、古いローカルファイルから勝手に
// 復活する」ことが起きるため（実際に起きた）、移行が必要なときだけ明示的に有効化する。
const MIGRATE_LEGACY_ROOM_FILES = process.env.MIGRATE_LEGACY_ROOM_FILES === '1';

function roomKey(roomId) {
  return `room:${roomId}`;
}

// --- Redisに載せる部屋データの符号化 ---
// Upstashの課金は帯域幅で効いてくる。部屋データは操作のたびに丸ごと書き直されるため
// （schedulePersistForRoom参照）、ここを縮めるのが一番効く。実測では17KBの部屋が
// brotli+base64で3.5KB（-80%）まで落ち、圧縮にかかる時間は1回0.6ms程度。
// base64は英数字と + / = しか使わないので、Upstashクライアントが値をJSON文字列へ
// 入れ直すときのエスケープ増加（平文JSONだと1.12倍になる）も同時に消える。
//
// 接頭辞は「この値は圧縮済みである」という目印。圧縮前の平文（＝この変更より前に
// 保存された部屋）は素通しで読めるので、移行作業は要らない。次の保存で自動的に
// 圧縮形式へ移る。逆に、この変更を巻き戻すときはdecodeRoomStateを残すこと
// （旧コードは 'B1:...' という文字列をそのまま状態として読み込んでしまう）。
const COMPRESSED_PREFIX = 'B1:';
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);
// 品質5は圧縮率と速度の釣り合いが良い（q4より10%小さく、q11より桁違いに速い）。
const BROTLI_OPTIONS = { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } };

async function encodeRoomState(json) {
  const compressed = await brotliCompress(Buffer.from(json, 'utf-8'), BROTLI_OPTIONS);
  return COMPRESSED_PREFIX + compressed.toString('base64');
}

async function decodeRoomState(value) {
  if (typeof value !== 'string' || !value.startsWith(COMPRESSED_PREFIX)) return value;
  const compressed = Buffer.from(value.slice(COMPRESSED_PREFIX.length), 'base64');
  return JSON.parse((await brotliDecompress(compressed)).toString('utf-8'));
}

// --- 部屋データの読み書き（保存先の違いをここだけに閉じ込める） ---
// ローカルモード（server/rooms/*.json）は平文のまま。npm run devで中身を目で読めることに
// 価値があり、ファイルには帯域幅の制約が無いため。
async function readRoomState(roomId) {
  if (USE_REDIS) return decodeRoomState(await redis.get(roomKey(roomId)));

  try {
    return JSON.parse(await readFile(roomFilePath(roomId), 'utf-8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

// 直列化済みのJSON文字列を保存する。呼び出し側が「前回と同じ内容か」を判定するために
// 既に文字列を作っているので、それを受け取って二度手間を避ける（schedulePersistForRoom参照）。
async function writeRoomStateJson(roomId, json) {
  if (USE_REDIS) {
    await redis.set(roomKey(roomId), await encodeRoomState(json));
    return;
  }
  await mkdir(ROOMS_DIR, { recursive: true });
  await writeFile(roomFilePath(roomId), json);
}

async function writeRoomState(roomId, state) {
  await writeRoomStateJson(roomId, JSON.stringify(stateForPersist(state)));
}

async function deleteRoomState(roomId) {
  if (USE_REDIS) {
    await redis.del(roomKey(roomId));
    return;
  }
  await unlink(roomFilePath(roomId)).catch(() => {});
}

// --- 部屋一覧用の要約 ---
// 一覧（GET /api/rooms）が要るのは名前とプラグイン名など数項目だけなのに、以前は
// そのためだけに全部屋の状態を丸ごと読んでいた。無料枠のPaaSはアイドルでスピンダウン
// するので、インデックスページを開くたびにこの全読みが起きる。要約だけを別のキーに
// 持たせて、一覧はそちらを見るようにする（1部屋あたり数十バイト）。
function roomSummaryKey(roomId) {
  return `roomMeta:${roomId}`;
}

function roomSummaryFilePath(roomId) {
  return path.join(ROOMS_DIR, `${roomId}.meta.json`);
}

function roomSummaryOf(entry) {
  const { name, activePlugin, bcdiceSystem } = entry.store.state.room;
  // lockedは鍵マークの表示に使うだけ。ハッシュやソルトは載せない。
  return { name, activePlugin, bcdiceSystem, locked: !!entry.entryPassword };
}

async function readRoomSummary(roomId) {
  if (USE_REDIS) return (await redis.get(roomSummaryKey(roomId))) || null;

  try {
    return JSON.parse(await readFile(roomSummaryFilePath(roomId), 'utf-8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

async function writeRoomSummary(roomId, summary) {
  if (USE_REDIS) {
    await redis.set(roomSummaryKey(roomId), summary);
    return;
  }
  await mkdir(ROOMS_DIR, { recursive: true });
  await writeFile(roomSummaryFilePath(roomId), JSON.stringify(summary));
}

async function deleteRoomSummary(roomId) {
  if (USE_REDIS) {
    await redis.del(roomSummaryKey(roomId));
  }
  await unlink(roomSummaryFilePath(roomId)).catch(() => {});
}

// 要約が前回書いたものと変わっていれば書き直す。名前やプラグインの変更はめったに
// 起きないので、ここでの書き込みは実質ゼロに近い。
async function syncRoomSummary(roomId, entry) {
  // 要約の組み立て（roomSummaryOf）もtryの内側に置く。ここから例外が漏れると、
  // 呼び出し元をたどってタイマーの中の未処理のPromise拒否になり、プロセスごと落ちる。
  try {
    if (entry.pendingDelete) return;
    const summary = roomSummaryOf(entry);
    const json = JSON.stringify(summary);
    if (json === entry.lastSummaryJson) return;
    await writeRoomSummary(roomId, summary);
    entry.lastSummaryJson = json;
  } catch (error) {
    console.warn(`[server] ${roomId} の一覧用の要約の保存に失敗しました:`, error.message);
  }
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
// ROUND_SET_PLOT（プロットの提出）も同じ理由で含めない。出すのはコマの持ち主なので、
// GM限定にすると本人が出せなくなる。プロットの一斉公開はROUND_ADVANCE_PHASE（下にある）
// が兼ねているので、進行操作の側はこの表で守られている。
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
  // スタンプの集計の全消し（js/stamp-panel.js）。同じく一度消すと戻せないのでGM限定。
  // 加算（COUNT_STAMP）の方は誰でもできる（自分が押した枚数が増えるだけ）。
  'RESET_STAMP_COUNTS',
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
  // 発言の編集（EDIT_CHAT_MESSAGE）も同じ扱い：「直せるのは発言者本人とGMだけ」は画面側
  // （js/room-authority.jsのcanEditChatEntry）だけの制限。全消しのCLEAR_ALL_CHAT_LOGSと違い、
  // 1件の本文が書き換わるだけで元の発言者・時刻は残るため、GM限定の表には入れない。
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  // PWAのウェブアプリマニフェスト（manifest.webmanifest）。application/jsonでも大半の
  // ブラウザは読むが、仕様どおりの型で返さないと警告が出る。
  '.webmanifest': 'application/manifest+json; charset=utf-8',
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

// --- 公開してよいファイルの範囲 ---
// リポジトリのルートには、配ってはいけないものがブラウザ向けのファイルと同居している
// （.env・server/・.git/・.loop/・.claude/・txt/・旧ファイル/）。「ROOT_DIRの中なら
// 何でも配る」ままだと、GET /.env だけでR2の鍵・Upstashのトークン・DEVELOPER_PASSPHRASEが
// まとめて抜ける。そこで「配ってよいものだけを挙げる」方式にし、既定を塞ぐ側へ倒す。
// 増やすときは必ずここに明示的に足すこと。
// PWA（ホーム画面/デスクトップへのインストール）の3点も、ここに挙げないと404になる。
// sw.jsがルート直下にあるのは、Service Workerが既定でおける自分の場所より下しか
// 制御できないため。/以下すべてを見せたいので、ルートに置くしかない。
const PUBLIC_FILES = new Set([
  'index.html', 'combined_layout.html', 'character-builder.html',
  'manifest.webmanifest', 'sw.js', 'offline.html'
]);
const PUBLIC_DIRS = new Set(['js', 'css', 'vendor', 'image', 'background']);
// 拡張子もMIME_TYPESに載っているものだけに限る（載っていない＝ブラウザから使う予定の
// 無いファイル）。以前のapplication/octet-streamへの取りこぼしはもう作らない。
const PUBLIC_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

// このパスを配ってよいか。ROOT_DIRの外・許可リスト外はすべてfalse。
function isPublicPath(filePath) {
  // ROOT_DIRの外を指していないか。以前のstartsWithによる前方一致では、ROOT_DIRの「兄弟」
  // （…/trpg-app-backup のような名前）まで通ってしまうため、path.relativeで判定する。
  const relative = path.relative(ROOT_DIR, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;

  if (!PUBLIC_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return false;

  const segments = relative.split(path.sep);
  // ルート直下はPUBLIC_FILESに挙げたものだけ。それ以外は許可したディレクトリの中だけ。
  return segments.length === 1 ? PUBLIC_FILES.has(segments[0]) : PUBLIC_DIRS.has(segments[0]);
}

// --- 応答に付ける防御 ---
// script-srcを'self'に絞るのが要点。万一、表示名やチャット本文からタグを差し込まれても、
// そこに書かれたスクリプトもインラインのonclick等も動かない（画面側のtextContent化と
// 二重に守る）。この方針が成り立つのは、HTMLがどれも外部ファイルの<script>しか持たず、
// vendorのdice-boxもeval・WebAssemblyを使っていないため。
// - style-srcに'unsafe-inline'が要るのは、3つのHTMLがインラインの<style>を持つため。
// - img-src/media-srcでhttps:を広く許すのは、外部URLの画像・音源を貼れる機能があるため
//   （R2の公開ドメインもここに含まれる）。data:は、R2未設定時にデータURLへ退避する経路用。
// - connect-srcの'self'には、同じホスト・同じポートへのWebSocketも含まれる。
//   BCDiceを併記しているのは、ダイスを振る経路（js/BCdice.js）と、サーバー側の
//   キャッシュが使えないときの取得（js/bcdice-catalog.js）だけはブラウザから
//   BCDiceのAPIを直接叩くため。ここを'self'だけにするとダイスが一切振れなくなる。
// - worker-src/manifest-srcは、PWA（/sw.js と /manifest.webmanifest）のためのもの。
//   どちらもdefault-srcの'self'で既に通るので、機能上は無くても同じ。「Service Workerを
//   自分のファイルからだけ動かす」という意図を、後から読む人に残すために明示している。
const BCDICE_ORIGIN = 'https://bcdice.onlinesession.app';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  `connect-src 'self' ${BCDICE_ORIGIN}`,
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  // Content-Typeを無視した推測を止める（画像として上げたものがHTMLとして解釈されるのを防ぐ）
  'X-Content-Type-Options': 'nosniff',
  // 部屋のURLにはroomクエリが入る。外部へ送らない。
  'Referrer-Policy': 'no-referrer',
  // frame-ancestorsを解さない古いブラウザ向けの重ね掛け
  'X-Frame-Options': 'DENY'
};

// --- どれをどれだけキャッシュさせるか ---
// このアプリのファイル名にはハッシュが付いていない（/js/main.js のような固定名）。
// つまりブラウザが1つでも古い版を掴むと、デプロイしてもその人だけ古いコードで動き、
// サーバーと同期プロトコルがずれる。なので既定は「毎回サーバーへ確かめる」側に倒す。
// - no-cache は「使うな」ではなく「使う前に必ず確かめろ」。304が返れば転送は起きない。
// - vendor/ だけは1年の immutable にする。中身は vendor 配下のライブラリのバージョンそのもの
//   なので、差し替えるときはディレクトリごと入れ替わる。3Dダイスのテクスチャ・効果音が
//   115ファイル・3MBあり、再検証を省ける効果が一番大きい場所でもある。
// - image/ を immutable にはしない。スタンプやアイコンは「同じ名前のまま中身を差し替える」
//   ことがあり、immutableだと1年間古い絵が出続ける。1日だけ持たせて折り合いをつける。
// - sw.js を長期キャッシュにするのは事故のもと（更新が届かなくなる）。必ず no-cache。
const IMMUTABLE_DIRS = new Set(['vendor']);
const SHORT_CACHE_DIRS = new Set(['image', 'background']);
const SHORT_CACHE_SECONDS = 60 * 60 * 24;

function cacheControlFor(relativePath) {
  const segments = relativePath.split(path.sep);
  if (segments.length > 1) {
    if (IMMUTABLE_DIRS.has(segments[0])) return 'public, max-age=31536000, immutable';
    if (SHORT_CACHE_DIRS.has(segments[0])) return `public, max-age=${SHORT_CACHE_SECONDS}`;
  }
  return 'no-cache';
}

// 盤面のHTML/JS/画像などをファイルシステムから配信する。配れるのは上の許可リストの範囲だけ。
// ルート（/）は部屋一覧のindex.htmlを返す。盤面自体はcombined_layout.html?room=room-Nで開く。
async function serveStaticFile(req, res) {
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    // 壊れたパーセントエンコーディング（%zz等）でdecodeURIComponentは例外を投げる
    res.writeHead(400, SECURITY_HEADERS);
    res.end('Bad Request');
    return;
  }

  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath;
  const filePath = path.join(ROOT_DIR, relativePath);

  // 許可リスト外は、存在の有無を明かさないよう404で揃える（403だと「そこに何かある」と分かる）
  if (!isPublicPath(filePath)) {
    res.writeHead(404, SECURITY_HEADERS);
    res.end('Not Found');
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME_TYPES[ext],
      'Cache-Control': cacheControlFor(path.relative(ROOT_DIR, filePath))
    });
    res.end(data);
  } catch {
    res.writeHead(404, SECURITY_HEADERS);
    res.end('Not Found');
  }
}

function sendJson(res, statusCode, body, extraHeaders = null) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  res.end(json);
}

// JSONのボディにも必ず上限を渡す。上限が無いと、認証の要らないPOST /api/rooms へ
// 巨大なボディを流し込むだけでサーバーのメモリを食い潰せる（そこで落ちると、
// 同居している他の部屋も全部巻き添えで切断される）。
// 読み方をreadBinaryBodyと揃えてBufferで溜めるのは、チャンクごとにtoString()すると
// 日本語のようなマルチバイト文字がチャンクの境目で壊れるため。
function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    // Content-Lengthで分かる場合はボディを一切読まずに断る（これが通常の経路）
    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      const error = new Error('payload too large');
      error.code = 'TOO_LARGE';
      reject(error);
      return;
    }

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        // readBinaryBodyと同じ理由でdestroyせず、受信だけ止めて呼び出し元に返す
        req.pause();
        const error = new Error('payload too large');
        error.code = 'TOO_LARGE';
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? parseUntrustedJson(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// readJsonBodyが失敗したときの返し方。大きすぎたときだけ413にし、応答を書き終えてから
// 接続を切る（受信を止めたまま放っておくと、送り手は最後まで送り続けてしまう）。
function sendJsonBodyError(req, res, error) {
  if (error?.code === 'TOO_LARGE') {
    res.on('finish', () => req.destroy());
    sendJson(res, 413, { error: 'データが大きすぎます。' });
    return;
  }
  sendJson(res, 400, { error: 'リクエストの形式が不正です。' });
}

// リクエストボディをバイナリのまま読む（音源のアップロード用）。JSONとして解釈せず
// そのまま扱いたいので別に用意している。上限を超えた時点で接続を切り、巨大なボディを
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
// roomId -> { store, clients: Set<ws>, saveTimer, saveDeadline, lastPersistedJson,
//             lastSummaryJson, entryPassword, pendingDelete?, deletion? }
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

    // lastPersistedJsonはnullで始める。hydrate()が古い保存データに欠けたキーを補うため、
    // 読み込んだJSONとstore.stateの直列化結果は一致しない。nullなら初回の保存だけは必ず
    // 走るので、補完後の形が確実に保存先へ載る。
    // typing: 記入中の参加者一覧（participantId -> 表示名）。T-013。揮発情報なので
    // 保存はせず、部屋がメモリに載っている間だけ持つ。
    // ※entryを組み立てる場所はここと handleCreateRoom の2か所しかない。
    //   片方に足し忘れると、その経路で作られた部屋は接続のたびに例外を投げる
    //   （typingUsersListがArray.from(undefined)になる）ので、必ず両方に入れること。
    return {
      store, clients: new Set(), saveTimer: null, saveDeadline: null,
      lastPersistedJson: null, lastSummaryJson: null,
      entryPassword: meta.entryPassword || null, typing: new Map()
    };

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
    writeRoomState(roomId, entry.store.state)
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

// 保存する形へ整える。チャットログは上限なしに伸び続けるので（game-store.jsのwithChatEntry
// は追記しかしない）、放っておくと「毎回の書き込みサイズ」がセッションの間ずっと増え続ける。
// 保存するぶんだけを直近PERSISTED_CHAT_ENTRIES件に切り詰める。
//
// メモリ上の状態には手を付けない。したがってセッション中の表示・ブロードキャスト・
// 途中入室者へ配る初期状態は今までどおり全件のまま。切り詰めが影響するのは
// 「サーバーの再起動やコールドスタートを跨いだあとの、上限より古いログ」だけ。
function stateForPersist(state) {
  const chatLogs = state.chatLogs || {};
  const tabIds = Object.keys(chatLogs);
  if (!tabIds.some((id) => (chatLogs[id]?.length || 0) > PERSISTED_CHAT_ENTRIES)) return state;

  // store.stateは凍結されたプロキシなので、必ず新しい素のオブジェクトを組み立てる
  const trimmed = {};
  tabIds.forEach((id) => {
    const entries = chatLogs[id] || [];
    trimmed[id] = entries.length > PERSISTED_CHAT_ENTRIES
      ? entries.slice(-PERSISTED_CHAT_ENTRIES)
      : entries;
  });
  return { ...state, chatLogs: trimmed };
}

// 実際に1回保存する。デバウンスの待ちは見ないので、呼ぶ側が頃合いを決めること。
async function persistRoomNow(roomId, entry) {
  try {
    const json = JSON.stringify(stateForPersist(entry.store.state));
    // 内容が前回の保存と同じなら、保存先への往復ごと省く。同じ座標へのMOVE_TOKENや
    // 再入室時のREGISTER_PARTICIPANTなど、状態を変えない操作が無料になる。
    // 直列化は圧縮のためにどのみち1回必要なので、比較の追加コストは実質ない。
    if (json === entry.lastPersistedJson) return;
    await writeRoomStateJson(roomId, json);
    entry.lastPersistedJson = json;
  } catch (error) {
    console.warn(`[server] ${roomId} の保存に失敗しました:`, error.message);
  }
  // 一覧用の要約も追随させる。中身が変わっていなければ何も書かない（syncRoomSummary参照）。
  await syncRoomSummary(roomId, entry);
}

// 操作が続いている間は保存を先送りし、途切れてから書く（末尾デバウンス）。
// 以前は「最初の操作から1秒ごとに書く」方式だったため、トークンをドラッグしている間は
// mousemoveのたびに届く操作に対して毎秒フルサイズの書き込みが飛んでいた。5秒のドラッグ＝
// 5回の書き込みで、実際に変わるのは座標2つだけ。先送りにすればこれが1〜2回で済む。
//
// ただし操作が途切れないまま延々と続く場合に一度も書かないのは困るので、最初の未保存の
// 変更からSAVE_MAX_WAIT_MSが経ったら、途切れていなくてもそこで一度書く。
// 単発の操作（チャット1行など）は以前と同じく約1秒後に1回だけ保存される。
function schedulePersistForRoom(roomId, entry) {
  // 削除中の部屋は保存しない。ここを通すと、片付けの最中に届いた（あるいは処理中だった）
  // 操作の結果がRedisへ書き戻され、消したはずの部屋が復活する。
  if (entry.pendingDelete) return;

  const now = Date.now();
  if (!entry.saveDeadline) entry.saveDeadline = now + SAVE_MAX_WAIT_MS;
  if (entry.saveTimer) clearTimeout(entry.saveTimer);

  const delay = Math.max(0, Math.min(now + SAVE_DEBOUNCE_MS, entry.saveDeadline) - now);
  entry.saveTimer = setTimeout(() => {
    entry.saveTimer = null;
    entry.saveDeadline = null;
    // タイマーの中なので、ここで拾わないと未処理のPromise拒否になりプロセスごと落ちる
    // （＝同居する他の全部屋も巻き添えで切断される）。保存の失敗は次の操作で書き直せる
    // ので、この1回を諦めるだけでよい。
    persistRoomNow(roomId, entry)
      .catch((error) => console.warn(`[server] ${roomId} の保存に失敗しました:`, error.message));
  }, delay);
}

// 待機中の保存を今すぐ実行する。終了時（flushAllPendingSaves）に使う。
function flushPendingSave(roomId, entry) {
  if (!entry.saveTimer) return null;
  clearTimeout(entry.saveTimer);
  entry.saveTimer = null;
  entry.saveDeadline = null;
  if (entry.pendingDelete) return null;
  return persistRoomNow(roomId, entry);
}

// 終了シグナルを受けたときに、待機中の保存をすべて書き出してから落ちる。
// これが無いと、デバウンスの待ち時間ぶんの操作がプロセスの停止のたびに失われる
// （Renderはデプロイやスピンダウンのたびにここを通る）。
function flushAllPendingSaves() {
  const pending = [];
  rooms.forEach((entry, roomId) => {
    const saving = flushPendingSave(roomId, entry);
    if (saving) pending.push(saving);
  });
  return Promise.all(pending);
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

// --- スタンプの連打よけ ---
// 1接続あたり STAMP_WINDOW_MS の間に STAMP_MAX_PER_WINDOW 枚まで。
// 数える場所を接続（ws）にしているのは、接続が切れた時点で一緒に捨てられて
// 後片付けが要らないため。entryに持たせると、部屋の組み立てが2か所ある都合で
// 片方に足し忘れる事故が起きる（getOrLoadRoomのコメント参照）。
// 同じ人が2タブ開くと2倍出せるが、これは荒らし対策ではなく事故防止なので許容する。
// 数字はjs/stamp-catalog.jsに置いてある（送信パネルが「あと何秒で押せるか」を出すのに
// 同じ値を要るため。両方に書くと必ずどちらかがずれる）。判定の権威はここ。
const STAMP_WINDOW_MS = STAMP_RATE_LIMIT.windowMs;
const STAMP_MAX_PER_WINDOW = STAMP_RATE_LIMIT.max;

function allowStamp(ws) {
  const now = Date.now();
  const recent = (ws.stampTimes || []).filter(time => now - time < STAMP_WINDOW_MS);
  if (recent.length >= STAMP_MAX_PER_WINDOW) {
    ws.stampTimes = recent;
    return false;
  }
  recent.push(now);
  ws.stampTimes = recent;
  return true;
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

// --- 部屋ごとの置き場の上限 ---
// 呼び出し回数の制限（exceedsRateLimit）はIPごとに数えるので、回線を変えられると
// すり抜ける。R2は保存量がそのまま課金なので、IPを何個使われようと超えられない天井を
// 別に置く。回数ではなく「その部屋が今いくら使っているか」で見るのが要点。
//
// 8MBの画像なら約60枚、20MBの音源なら約25曲ぶん。1セッションには十分な余裕がある。
const MAX_ROOM_STORAGE_BYTES = (Number(process.env.MAX_ROOM_STORAGE_MB) || 500) * 1024 * 1024;

// roomId -> { bytes, checkedAt }
// アップロードのたびにR2へ一覧を取りに行くと往復が増えるので、一度数えたら手元で
// 足し引きし、しばらく経ったら数え直す。数え直しを入れているのは、手元の足し引きだけだと
// 別経路（部屋の削除・複数プロセス）で減った分を取り込めず、実際より多く見積もったまま
// アップロードを断り続けてしまうため。
const ROOM_STORAGE_RECHECK_MS = 10 * 60 * 1000;
const roomStorageUsage = new Map();

async function roomStorageBytes(roomId) {
  const cached = roomStorageUsage.get(roomId);
  if (cached && Date.now() - cached.checkedAt < ROOM_STORAGE_RECHECK_MS) return cached.bytes;

  const bytes = await totalBytesByPrefix(roomObjectPrefix(roomId));
  roomStorageUsage.set(roomId, { bytes, checkedAt: Date.now() });
  return bytes;
}

// 置いた分・消した分を手元の集計へ反映する（次の数え直しまでの間に効かせるため）。
function addRoomStorageBytes(roomId, delta) {
  const cached = roomStorageUsage.get(roomId);
  if (cached) cached.bytes = Math.max(0, cached.bytes + delta);
}

function forgetRoomStorage(roomId) {
  roomStorageUsage.delete(roomId);
}

/**
 * この部屋にあと`bytes`だけ置いてよいか。置けないなら断り文句を返す。
 * R2への問い合わせに失敗した場合は通す：使用量が読めないことを理由に、正規の利用者の
 * アップロードまで止めてしまうほうが困る（回数制限のほうは効いたままになる）。
 */
async function refuseIfRoomStorageFull(roomId, bytes) {
  let used;
  try {
    used = await roomStorageBytes(roomId);
  } catch (error) {
    console.warn(`[server] ${roomId} の使用量を確認できませんでした（通します）:`, error.message);
    return null;
  }

  if (used + bytes <= MAX_ROOM_STORAGE_BYTES) return null;

  const limitMb = Math.floor(MAX_ROOM_STORAGE_BYTES / 1024 / 1024);
  console.warn(`[server] ${roomId}: 置き場の上限に達しました（${used}バイト使用中 / 上限${MAX_ROOM_STORAGE_BYTES}バイト）`);
  return `この部屋に置けるファイルの合計が上限（${limitMb}MB）に達しました。`
    + '使わない画像・音源を消してからお試しください。';
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
  entry.saveDeadline = null;

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

  // 一覧用の要約も消す。残すと、消したはずの部屋が一覧に出続ける
  try {
    await deleteRoomSummary(roomId);
  } catch (error) {
    console.warn(`[server] ${roomId} の一覧用の要約の削除に失敗しました:`, error.message);
  }

  // Redis運用でも、移行前のローカルファイルが残っていれば一緒に消す
  await unlink(roomFilePath(roomId)).catch(() => {});

  if (isR2Configured()) {
    try {
      const { deleted, failed } = await deleteObjectsByPrefix(roomObjectPrefix(roomId));
      console.log(`[server] ${roomId} のファイルを${deleted}件削除しました`
        + (failed > 0 ? `（${failed}件は失敗）` : ''));
      // 空になったので集計も捨てる（次に使うときはR2から数え直す）
      forgetRoomStorage(roomId);
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

  // 1ファイルの大きさが上限内でも、積み上がった合計で断ることがある
  const full = await refuseIfRoomStorageFull(roomId, body.length);
  if (full) {
    sendJson(res, 507, { error: full });
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

  addRoomStorageBytes(roomId, body.length);
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
// 受け入れる形式はextensionsで渡す（画像なら IMAGE_EXTENSIONS）。
function decodeDataUrl(dataUrl, extensions) {
  const match = String(dataUrl).match(DATA_URL_PATTERN);
  if (!match) return null;
  const contentType = match[1];
  if (!extensions[contentType]) return null; // 想定外の形式は受け取らない
  const base64 = String(dataUrl).slice(match[0].length);
  try {
    return { body: Buffer.from(base64, 'base64'), contentType };
  } catch {
    return null;
  }
}

/**
 * ファイル1つ（画像・音源）をこの部屋の持ち物にする。
 *
 * 「復元できるものは復元し、復元できないものは取り込まない」という方針に従う。
 * 実体が見つからないURLをそのまま残すと、読み込んだ本人のブラウザだけがHTTPキャッシュで
 * 表示できてしまい、他の人には壊れて見える——という分かりにくい壊れ方をするため、
 * 復元できないものは null を返して呼び出し側に落としてもらう。
 *
 * @returns {Promise<{ url: string|null, changed: boolean, dropped: boolean }>}
 *   url … 置き換え後の値（dropped時はnull） / changed … 値が変わったか
 */
async function adoptMediaUrl(roomId, url, { extensions, maxBytes, label }) {
  const keep = { url, changed: false, dropped: false };
  if (!url || typeof url !== 'string' || !isR2Configured()) return keep;

  const prefix = roomObjectPrefix(roomId);
  const drop = (reason) => {
    console.warn(`[server] ${roomId}: 取り込んだ${label}を復元できませんでした（取り込みません）: ${reason}`);
    return { url: null, changed: true, dropped: true };
  };

  let source = null;
  if (url.startsWith('data:')) {
    source = decodeDataUrl(url, extensions);
    if (!source) return drop('データURLの形式を扱えません');
  } else {
    const key = keyFromPublicUrl(url);
    if (!key) return keep;                  // 自分のR2ではない外部URL → そのまま使える
    if (key.startsWith(prefix)) return keep; // 既にこの部屋の持ち物
    try {
      source = await getObject(key);
    } catch (error) {
      return drop(`${key} … ${error.message}`);
    }
  }

  if (source.body.length > maxBytes) return drop(`大きすぎます (${source.body.length}バイト)`);

  // 1件ずつは上限内でも、部屋の合計では超えることがある。取り込みは何十件も続けて
  // 通るので、ここを見ないと「1件8MBまで」の制限をいくらでも積み上げられてしまう。
  const full = await refuseIfRoomStorageFull(roomId, source.body.length);
  if (full) return drop('この部屋の置き場が上限に達しています');

  const ext = extensions[source.contentType] || 'bin';
  const newKey = `${prefix}${randomUUID()}.${ext}`;
  try {
    await putObject(newKey, source.body, source.contentType);
  } catch (error) {
    return drop(`保存に失敗しました … ${error.message}`);
  }
  addRoomStorageBytes(roomId, source.body.length);
  return { url: publicUrlFor(newKey), key: newKey, changed: true, dropped: false };
}

/**
 * 状態に含まれる画像と音源をまとめてこの部屋の持ち物にする
 * （部屋の作成時・全データ読み込み時）。同じファイルが何度も出てくる場合は1回だけ複製して使い回す。
 *
 * 復元できなかったものは状態から取り除く（画像は外し、音源はトラックごと落とす）。
 * 落としたトラックを指したままの参照（audioPlayback・シーンのbgmTrackId）もここで片付ける。
 *
 * @returns {Promise<{ state: object, dropped: { images: number, audio: number } }>}
 */
async function adoptStateMedia(roomId, state) {
  const dropped = { images: 0, audio: 0 };
  if (!isR2Configured() || !state || typeof state !== 'object') return { state, dropped };

  // 画像は「落ちたら null」。同じURLは1回だけ複製する。
  const imageCache = new Map();
  const adoptImage = async (image) => {
    if (!image || typeof image !== 'string') return image;
    if (!imageCache.has(image)) {
      const result = await adoptMediaUrl(roomId, image, {
        extensions: IMAGE_EXTENSIONS, maxBytes: MAX_IMAGE_BYTES, label: '画像'
      });
      if (result.dropped) dropped.images += 1;
      imageCache.set(image, result.url);
    }
    return imageCache.get(image);
  };

  // 背景は画像URLと、その実体のキー（backgroundImageKey）が対になっている。
  // 片方だけ書き換えると、部屋の削除時にキーだけが旧部屋のものとして残ってしまう。
  const adoptBackground = async (holder) => {
    const image = await adoptImage(holder?.backgroundImage);
    return {
      backgroundImage: image,
      backgroundImageKey: image ? (keyFromPublicUrl(image) || null) : null
    };
  };

  const adoptPanels = async (panels) => {
    const next = {};
    for (const [id, panel] of Object.entries(panels || {})) {
      next[id] = { ...panel, image: await adoptImage(panel?.image) };
    }
    return next;
  };

  const tokens = {};
  for (const [id, token] of Object.entries(state.tokens || {})) {
    tokens[id] = { ...token, image: await adoptImage(token?.image) };
  }

  // 音源。外部URL指定のものは持ち物ではないので触らない（adoptMediaUrlが素通しする）。
  // 復元できなかったトラックは丸ごと落とす（音の出ないトラックだけ残っても仕方がない）。
  const audioTracks = {};
  for (const [id, track] of Object.entries(state.room?.audioTracks || {})) {
    if (!track || typeof track !== 'object') continue;
    const result = await adoptMediaUrl(roomId, track.url, {
      extensions: AUDIO_EXTENSIONS, maxBytes: MAX_AUDIO_BYTES, label: `音源「${track.name || id}」`
    });
    if (result.dropped) {
      dropped.audio += 1;
      continue;
    }
    // keyはこのアプリがR2に持っている実体を指すときだけ意味を持つ（pickOwnedAudioKey参照）
    audioTracks[id] = result.changed
      ? { ...track, url: result.url, key: result.key || null }
      : track;
  }

  const scenes = {};
  for (const [id, scene] of Object.entries(state.room?.scenes || {})) {
    // 落とした音源を指したままだと、シーン遷移時に鳴らない曲を指し続ける。
    // SCENE_BGM_STOPは「BGMを止める」という特別な値なので残す（js/game-store.js参照）。
    const bgmTrackId = scene?.bgmTrackId;
    const keepBgm = !bgmTrackId || bgmTrackId === SCENE_BGM_STOP || audioTracks[bgmTrackId];
    scenes[id] = {
      ...scene,
      ...(await adoptBackground(scene)),
      bgmTrackId: keepBgm ? (bgmTrackId || null) : null,
      panels: await adoptPanels(scene?.panels)
    };
  }

  // 再生中の指定も同じく、落とした音源を指していたら止める
  const playback = state.room?.audioPlayback || { bgm: null, se: null };
  const audioPlayback = {};
  for (const [channel, current] of Object.entries(playback)) {
    audioPlayback[channel] = current?.trackId && !audioTracks[current.trackId] ? null : current;
  }

  return {
    dropped,
    state: {
      ...state,
      tokens,
      panels: await adoptPanels(state.panels),
      room: {
        ...(state.room || {}),
        ...(await adoptBackground(state.room)),
        audioTracks,
        audioPlayback,
        scenes
      }
    }
  };
}

// 取り込みで落としたものの報告文。何も落ちていなければnull。
function droppedMediaMessage(dropped) {
  const parts = [];
  if (dropped.images > 0) parts.push(`画像${dropped.images}件`);
  if (dropped.audio > 0) parts.push(`音源${dropped.audio}件`);
  if (parts.length === 0) return null;
  return `読み込んだデータのうち、実体が見つからなかった${parts.join('・')}は取り込みませんでした。`
    + '（部屋を削除するとR2上のファイルも消えるため、削除前に書き出したデータからは復元できません）';
}

// 取り込みの報告を、状態のMainタブへシステム発言として直接足す。
// hydrate前の素のオブジェクトに対して使う（storeのdispatchはまだ通せないため）。
function withImportNotice(state, text) {
  if (!text) return state;
  const chatLogs = state.chatLogs || {};
  const entries = chatLogs[MAIN_CHAT_TAB_ID] || [];
  return {
    ...state,
    chatLogs: { ...chatLogs, [MAIN_CHAT_TAB_ID]: [...entries, { system: 'システム', resultText: text }] }
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
    body = await readJsonBody(req, MAX_SMALL_JSON_BYTES);
  } catch (error) {
    sendJsonBodyError(req, res, error);
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

  const adopted = await adoptMediaUrl(roomId, sourceUrl, {
    extensions: IMAGE_EXTENSIONS, maxBytes: MAX_IMAGE_BYTES, label: '画像'
  });
  if (adopted.dropped) {
    // 元が消えている等で複製できなかった。呼び出し側は元のURLのまま続行する。
    sendJson(res, 502, { error: '画像の複製に失敗しました' });
    return;
  }

  // 既にこの部屋の画像だった場合は複製せず、そのURLをそのまま返す（changedがfalse）。
  sendJson(res, 200, { url: adopted.url });
}

// GET /api/rooms：全スロットの一覧（インデックスページ用）。空きスロットは最小限の情報のみ返す。
async function handleListRooms(req, res) {
  const list = [];
  for (let n = 1; n <= MAX_ROOMS; n++) {
    list.push(await summarizeRoomSlot(`room-${n}`));
  }
  sendJson(res, 200, { maxRooms: MAX_ROOMS, rooms: list });
}

// 一覧1スロット分。安い順に3段構え：
//   1. メモリに載っている部屋はそこから（保存先を見ない）
//   2. 要約のキーがあればそれだけを読む（数十バイト）
//   3. どちらも無ければ従来どおり状態を丸ごと読み、ついでに要約を作っておく
// 3に落ちるのは、この機能より前に作られた部屋の初回だけ。以後は2で済む。
async function summarizeRoomSlot(id) {
  const cached = rooms.get(id);
  if (cached && !cached.pendingDelete) return { id, occupied: true, ...roomSummaryOf(cached) };
  // 削除中の部屋は「もう無い部屋」として扱う（getOrLoadRoomと同じ約束）
  if (cached) return { id, occupied: false };

  try {
    const summary = await readRoomSummary(id);
    if (summary) return { id, occupied: true, ...summary };
  } catch (error) {
    console.warn(`[server] ${id} の一覧用の要約の読み込みに失敗しました:`, error.message);
  }

  const entry = await getOrLoadRoom(id);
  if (!entry) return { id, occupied: false };
  await syncRoomSummary(id, entry);
  return { id, occupied: true, ...roomSummaryOf(entry) };
}

// POST /api/rooms：空きスロットに新しい部屋を作成する。
// body: { id, name, activePlugin, bcdiceSystem, entryPassword?, importedState? }
async function handleCreateRoom(req, res) {
  let body;
  try {
    // importedStateを載せて部屋を作れるため、ここだけは取り込みの枠で受け取る
    body = await readJsonBody(req, MAX_IMPORT_BYTES);
  } catch (error) {
    sendJsonBodyError(req, res, error);
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
  // 取り込んだデータに混ざっている画像・音源（データURL・他の部屋のURL）を、この部屋の
  // 持ち物へ複製し直す（adoptStateMedia参照）。部屋はまだ誰にも配っていないので、
  // ここで直しておけば以後は普通の画像・音源として扱える。
  // 実体が見つからず復元できなかったものは取り込まず、その旨をMainタブへ残す。
  const adoptedMedia = await adoptStateMedia(id, initialState);
  store.hydrate(withImportNotice(adoptedMedia.state, droppedMediaMessage(adoptedMedia.dropped)));

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

  // typingを忘れないこと（理由はgetOrLoadRoom側の同じ組み立てのコメント参照）
  const entry = {
    store, clients: new Set(), saveTimer: null, saveDeadline: null,
    lastPersistedJson: null, lastSummaryJson: null,
    entryPassword: entryPasswordRecord, typing: new Map()
  };
  rooms.set(id, entry);
  // 一覧用の要約もここで作っておく。作らずにいても一覧側が作り直すが（summarizeRoomSlot）、
  // そのときは状態を丸ごと読み直すことになるので、分かっているここで書いておく。
  await syncRoomSummary(id, entry);
  sendJson(res, 201, { id });
}

// POST /api/rooms/<id>/export：書き出し用に、画像を埋め込んだ自己完結の状態を返す。
// body: { myBackyardTokenIds }　… どのコマが自分のバックヤードかはブラウザしか知らない
//
// 画像の埋め込みをサーバーで行う理由：R2の公開ドメインはAccess-Control-Allow-Originを
// 返さないため、ブラウザからfetchして実体を読むことができない（server/r2.jsの方針どおり、
// R2側にCORS設定を持たせていない）。サーバーは署名付きで直接取りに行けるので、ここで行う。
//
// これが無いと「部屋を保存し削除」で書き出したデータからは画像が二度と戻らない。
// 削除はその部屋のR2オブジェクトをフォルダごと消すので、URLだけを書き出しても
// 指す先が空になるため（deleteRoomData参照）。
//
// 音源は埋め込まない。1曲20MBまで許しているので、数曲あるだけでファイルが桁違いに
// 大きくなり、読み込み時のWebSocket送信も重くなる。
//
// 権限は複製（/api/image/copy）と同じく入室パスワードのみ。GM限定にはしない
// （書き出しボタンは元から誰でも押せる）。返すのは全員がINITで既に持っている状態と、
// 公開URLで誰でも取得できる画像なので、ここで見える範囲は増えない。
const MAX_EXPORT_EMBED_BYTES = (Number(process.env.MAX_EXPORT_EMBED_MB) || 64) * 1024 * 1024;

// 画像を除いた状態そのもの（チャットログ・コマ・情報）の書き出しに要る見込み。
// 実測では5時間のセッションで状態JSONが156KB、長丁場でも1MBに届かないので、
// 4MBあれば「画像を1枚も埋め込まない書き出し」は必ず通る。埋め込むぶんは
// これとは別に、そのときの残り予算から決める（embedStateImagesのlimitBytes）。
const EXPORT_BASE_BYTES = 4 * 1024 * 1024;

// 取り込み（POST /api/roomsのimportedStateと、WebSocketのREPLACE_STATE）で受け取ってよい
// 大きさ。上の書き出しと必ず対で決める：埋め込んだ画像はデータURL（base64）になって元の
// バイト数の約4/3に膨らむので、その分の余裕を見ないと「自分が書き出したものを取り込めない」
// ことになる。残りは画像以外の状態（チャットログ・コマ・情報）の取り分。
const MAX_IMPORT_BYTES = Math.ceil(MAX_EXPORT_EMBED_BYTES * 4 / 3) + 8 * 1024 * 1024;

async function handleExportRoom(req, res, roomId) {
  if (!isValidRoomId(roomId)) {
    sendJson(res, 400, { error: '部屋IDが不正です' });
    return;
  }

  const entry = await getOrLoadRoom(roomId);
  if (!entry) {
    sendJson(res, 404, { error: 'その部屋はまだ作成されていません' });
    return;
  }

  // アップロードや複製と同じく、入室していない人からの要求は受け付けない
  if (!verifyEntryPassword(entry.entryPassword, entryPasswordFromHeaders(req))) {
    sendJson(res, 403, { error: 'この部屋の入室パスワードが必要です' });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(req, MAX_SMALL_JSON_BYTES);
  } catch {
    // バックヤードの情報が無くても書き出し自体はできる（付け替えができなくなるだけ）
  }
  const myBackyardTokenIds = Array.isArray(body?.myBackyardTokenIds) ? body.myBackyardTokenIds : [];

  // 埋め込んでよい量は、設定した上限と「今の残りメモリ」の小さいほう。混んでいるときは
  // 埋め込みを減らして書き出し自体は通す（超えたぶんはURLのまま残る＝skippedに数えられ、
  // 呼び出し側が「一部の画像は入っていない」と伝えられる）。
  const embedLimit = Math.min(MAX_EXPORT_EMBED_BYTES, maxBodyBytesFor('export'));
  const { state, embedded, skipped } = await embedStateImages(roomId, entry.store.state, embedLimit);
  sendJson(res, 200, { state: { ...state, myBackyardTokenIds }, embedded, skipped });
}

/**
 * 状態に含まれる「自分のR2の画像」をデータURLとして埋め込み、自己完結にする。
 * 外部URLは他所の持ち物なので触らない（埋め込んでも復元先が変わるだけで意味がない）。
 * 同じ画像が何度も出てくる場合は1回だけ読む。
 *
 * 合計の上限を超えたぶんはURLのまま残す（巨大なファイルを書き出せなくするより、
 * 戻せるものだけでも戻せる方がよい）。
 *
 * @param {number} limitBytes 埋め込んでよい合計バイト数。呼び出し側が、設定した上限と
 *   そのときのメモリの残りから決める（handleExportRoom参照）。
 * @returns {Promise<{ state: object, embedded: number, skipped: number }>}
 */
async function embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES) {
  let embedded = 0;
  let skipped = 0;
  if (!isR2Configured() || !state || typeof state !== 'object') return { state, embedded, skipped };

  const cache = new Map();
  let totalBytes = 0;

  const embed = async (image) => {
    if (!image || typeof image !== 'string' || image.startsWith('data:')) return image;
    const key = keyFromPublicUrl(image);
    if (!key) return image;   // 自分のR2ではない外部URL → そのまま
    if (!cache.has(image)) {
      let value = image;
      try {
        const object = await getObject(key);
        if (totalBytes + object.body.length > limitBytes) {
          skipped += 1;
        } else {
          totalBytes += object.body.length;
          embedded += 1;
          value = `data:${object.contentType};base64,${object.body.toString('base64')}`;
        }
      } catch (error) {
        // 実体が無い（既に消えている等）。URLのまま残す＝読み込み側が落とす
        console.warn(`[server] ${roomId}: 書き出しに画像を埋め込めませんでした (${key}):`, error.message);
        skipped += 1;
      }
      cache.set(image, value);
    }
    return cache.get(image);
  };

  const embedPanels = async (panels) => {
    const next = {};
    for (const [id, panel] of Object.entries(panels || {})) {
      next[id] = { ...panel, image: await embed(panel?.image) };
    }
    return next;
  };

  const tokens = {};
  for (const [id, token] of Object.entries(state.tokens || {})) {
    tokens[id] = { ...token, image: await embed(token?.image) };
  }

  const scenes = {};
  for (const [id, scene] of Object.entries(state.room?.scenes || {})) {
    scenes[id] = {
      ...scene,
      backgroundImage: await embed(scene?.backgroundImage),
      panels: await embedPanels(scene?.panels)
    };
  }

  return {
    embedded,
    skipped,
    state: {
      ...state,
      tokens,
      panels: await embedPanels(state.panels),
      room: {
        ...(state.room || {}),
        backgroundImage: await embed(state.room?.backgroundImage),
        scenes
      }
    }
  };
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
    body = await readJsonBody(req, MAX_SMALL_JSON_BYTES);
  } catch (error) {
    sendJsonBodyError(req, res, error);
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
  // 鍵マークは一覧用の要約にも載っているので、そちらも追随させる
  await syncRoomSummary(roomId, entry);
  console.log(`[server] ${roomId}: 入室パスワードを${record ? '設定' : '解除'}しました`);
  sendJson(res, 200, { locked: !!record });
}

// --- BCDiceのシステム一覧・システム情報の中継（キャッシュ付き） ---
// 一覧（約29KB）とシステム情報（command_pattern / help_message）はBCDice側が更新される
// ことがあるので手書きせずAPIから取るが、部屋・端末ごとに毎回上流へ取りに行くと無駄な
// 負荷になる。サーバーで一度取ってRedisへ置き、既定30日を過ぎた後の最初のリクエストの
// ときだけ取り直す（定期ジョブは持たず、アクセス契機の遅延更新にする）。
// 上のCSPで許可しているのと同じ相手（BCDICE_ORIGIN）。片方だけ変えるとダイスが
// 振れなくなるので、住所は1つだけ持つ。
const BCDICE_BASE_URL = BCDICE_ORIGIN;
const BCDICE_CACHE_MS = (Number(process.env.BCDICE_CACHE_DAYS) || 30) * 24 * 60 * 60 * 1000;
// 「そのシステムは無い」と分かった答えを覚えておく時間。本来のキャッシュよりずっと
// 短くしているのは、上流にシステムが増えたときに「無い」と言い続ける時間を短くするため。
const BCDICE_MISS_CACHE_MS = 60 * 60 * 1000;
// cacheKey -> { fetchedAt, payload }。Redisへの往復すら省くためのプロセス内キャッシュ。
// 件数に上限を設けているのは、キーがリクエストのパス（システムID）由来で、実在しない
// IDを次々に投げられると際限なく育つため。溢れたら一番古い登録から落とす（Mapは
// 登録順を保つので、先頭が一番古い）。実際に使うシステムは多くても数十なので、
// 普段の利用でここに触れることはない。
const BCDICE_MEMORY_CACHE_MAX = 500;
const bcdiceMemoryCache = new Map();

function rememberBcdice(cacheKey, entry) {
  bcdiceMemoryCache.set(cacheKey, entry);
  while (bcdiceMemoryCache.size > BCDICE_MEMORY_CACHE_MAX) {
    bcdiceMemoryCache.delete(bcdiceMemoryCache.keys().next().value);
  }
}

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
      if (cached) rememberBcdice(cacheKey, cached);
    } catch (error) {
      console.warn(`[server] BCDiceキャッシュの読み込みに失敗しました (${cacheKey}):`, error.message);
    }
  }

  // 「そんなシステムは無い」の記録（下で覚える）。覚えている間は上流へ行かずに断る。
  // 有効期限を本来のキャッシュよりずっと短くしているのは、上流にシステムが増えたときに
  // 「無い」と言い続ける時間を短くするため。
  if (cached?.missing) {
    if (now - cached.fetchedAt < BCDICE_MISS_CACHE_MS) throw new Error('HTTP 404');
  } else if (cached && now - cached.fetchedAt < BCDICE_CACHE_MS) {
    return { ...cached.payload, fetchedAt: cached.fetchedAt };
  }

  try {
    const response = await fetch(`${BCDICE_BASE_URL}${upstreamPath}`);
    if (!response.ok) {
      // 「無い」と分かった答えも覚えておく。覚えないと、存在しないIDを次々に投げるだけで
      // このサーバーが上流への中継器になってしまう（回数制限と合わせて二重に止める）。
      // 覚えるのは4xx（＝上流がはっきり「無い」と答えた場合）だけ。5xxや通信の失敗まで
      // 覚えると、上流の一時的な不調をこちらで長引かせることになる。
      // Redisには書かない（間違って覚えた場合に再起動で消えるようにするため）。
      if (response.status >= 400 && response.status < 500) {
        rememberBcdice(cacheKey, { fetchedAt: now, missing: true });
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = transform(await response.json());
    const entry = { fetchedAt: now, payload };
    rememberBcdice(cacheKey, entry);
    // 保存の成否は応答に影響させない（次回また取りに行くだけで済む）
    if (USE_REDIS) {
      redis.set(`bcdice:${cacheKey}`, entry)
        .catch((error) => console.warn(`[server] BCDiceキャッシュの保存に失敗しました (${cacheKey}):`, error.message));
    }
    return { ...payload, fetchedAt: now };
  } catch (error) {
    // 「無い」の記録には返せる中身が無いので、古いままの答えとしては使えない
    if (cached && !cached.missing) {
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

// --- キャラクターシートの取り込み中継 ---
// 外部のキャラクターシート置き場（ドラクルージュならcharacter-sheets.appspot.com）は
// CORSを許していないので、ブラウザから直接は取れない。ここが代わりに取りに行く。
//
// 【この中継の安全性はどこから来るか】受け取るのは「プラグインID」と「シートのキー」だけで、
// URLは受け取らない。取得先はプラグインの宣言（characterSheetSource）から**サーバーが**
// 組み立てる。宛先はプラグインが宣言した1か所しか表現できないので、このAPIを踏み台にして
// 任意のホスト（社内アドレス・クラウドのメタデータ等）を叩かせることができない。
// キーの形も宣言のkeyPatternで確かめてから埋める。
const SHEET_FETCH_TIMEOUT_MS = 10 * 1000;
// シート1件は数十KB。1MBは「壊れた応答や巨大な何かを掴まされたら降りる」ための線。
const MAX_SHEET_BYTES = 1024 * 1024;

// 上限を超えたら読むのをやめる。Content-Lengthは自己申告なので、実際に読んだ量でも数える。
async function readCappedText(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('応答が大きすぎます');

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('応答が大きすぎます');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}

// GET /api/character-sheet?plugin={プラグインID}&key={シートのキー}
async function handleCharacterSheet(req, res, url) {
  const pluginId = url.searchParams.get('plugin') ?? '';
  const key = url.searchParams.get('key') ?? '';

  const source = getPluginSheetSource(pluginId);
  if (!source) {
    sendJson(res, 400, { error: 'このシステムはURLからの取り込みに対応していません。' });
    return;
  }
  if (!source.keyPattern.test(key)) {
    sendJson(res, 400, { error: 'シートのキーの形が正しくありません。' });
    return;
  }

  // 取得先はここで組み立てる。呼び出し側から来た文字列はkeyだけで、それも上で形を確かめてある。
  const target = `${source.origin}${source.fetchPath(key)}`;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), SHEET_FETCH_TIMEOUT_MS);

  try {
    // リダイレクトは追わない。追うと、宣言した相手の一存で別のホストへ行かされる
    const response = await fetch(target, { signal: abort.signal, redirect: 'manual' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await readCappedText(response, MAX_SHEET_BYTES);
    // 中身は外から来たJSON。危険なキーを落として読み、読めたものを組み立て直して返す
    // （上流のバイト列をそのまま流さない）
    const data = parseUntrustedJson(text);
    if (!data || typeof data !== 'object') throw new Error('シートの形式が想定と違います');

    // 上流は「そのシートは無い」もHTTP 200 + {error:"..."} で返してくる。そのまま通すと
    // 画面には「読み込めませんでした」としか出ないので、ここで見分けて理由を返す。
    if (typeof data.error === 'string' && Object.keys(data).length === 1) {
      sendJson(res, 404, { error: `シートが見つかりませんでした（${data.error}）。URLを確かめてください。` });
      return;
    }

    sendJson(res, 200, data, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.warn(`[server] キャラクターシートを取得できませんでした (${pluginId}):`, error.message);
    sendJson(res, 502, { error: 'シートを取得できませんでした。URLと公開設定を確かめてください。' });
  } finally {
    clearTimeout(timer);
  }
}

// --- 呼び出し回数の制限 ---
// 誰でもURLを踏める前提だと、認証の要らない・あるいは入室できれば通るAPIは、そのまま
// 連打の的になる。困るのは落ちることより、こちらの財布と居場所が削られること：
//   部屋作成      … 部屋は5つしかない。連打で埋められると正規の利用者が入れない
//   アップロード  … R2の保存容量と転送量がそのまま課金になる
//   書き出し      … 1回で最大64MBぶんの画像をR2から読み直す（MAX_EXPORT_EMBED_BYTES）
//   BCDice        … キャッシュに無いIDは上流へ転送される。踏み台にされると相手に迷惑がかかる
//   シート取り込み … 1回ごとに外のサービスへ取りに行く。BCDiceと同じく踏み台にさせない
//
// 窓を区切って数えるだけの素朴な方式にする。人間の操作としてはどれも十分な余裕があり、
// 厳密さより「壊れないこと・依存を増やさないこと」を優先する。
const RATE_LIMITS = {
  createRoom: { windowMs: 10 * 60 * 1000, max: 10 },
  upload: { windowMs: 10 * 60 * 1000, max: 60 },
  export: { windowMs: 10 * 60 * 1000, max: 20 },
  bcdice: { windowMs: 10 * 60 * 1000, max: 120 },
  sheet: { windowMs: 10 * 60 * 1000, max: 30 }
};

// `種別:IP` -> { windowStart, count }
const rateCounters = new Map();

// 呼び出し元のIP。Renderのようにプロキシの後ろに置くと、実際の接続元は常にプロキシに
// なるためX-Forwarded-Forを見る必要がある。ただしこのヘッダは送り手が偽装できるので、
// 一番右（信用できるプロキシが最後に足した値）を取る。ヘッダが無ければ素の接続元。
function clientIpOf(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const parts = forwarded.split(',');
    return parts[parts.length - 1].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// IPv6アドレスを8つの組に開く。`::` は省略された0の並びなので、その分を埋め直す。
function expandIpv6Groups(address) {
  if (!address.includes('::')) return address.split(':');

  const [head, tail = ''] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const zeros = Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill('0');
  return [...headGroups, ...zeros, ...tailGroups];
}

// 数える単位。IPv4はアドレスそのものだが、IPv6は前半64ビット（/64）でまとめる。
//
// IPv6では利用者1人にまるごと/64の範囲が割り当たるのが普通で、その中のアドレスは
// 好きなだけ作れる。アドレス完全一致で数えると、1人が何個でも別人として数えられて
// 回数制限が意味を失う。プロバイダが配る単位で数えれば、そこは1人分になる。
//
// 表記ゆれ（先頭の0の有無・大文字小文字・`::` の省略）で別人にならないよう、
// 開いて揃えてから組み立てる。
function rateLimitScopeOf(rawIp) {
  // [2001:db8::1]:443 のような括弧付きの表記を素のアドレスに戻す
  const bracketed = rawIp.match(/^\[(.+)\](?::\d+)?$/);
  const address = (bracketed ? bracketed[1] : rawIp).split('%')[0].trim();

  // IPv4射影アドレス（::ffff:192.0.2.1）は中身のIPv4として扱う
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];

  if (!address.includes(':')) return address; // IPv4、または解釈できない値はそのまま

  const groups = expandIpv6Groups(address.toLowerCase());
  const prefix = groups.slice(0, 4).map(group => (group || '0').replace(/^0+(?=.)/, ''));
  return `${prefix.join(':')}::/64`;
}

// 上限を超えていたらtrue。超えた場合は呼び出し側が429を返す。
function exceedsRateLimit(req, kind) {
  const limit = RATE_LIMITS[kind];
  const key = `${kind}:${rateLimitScopeOf(clientIpOf(req))}`;
  const now = Date.now();
  const counter = rateCounters.get(key);

  if (!counter || now - counter.windowStart >= limit.windowMs) {
    rateCounters.set(key, { windowStart: now, count: 1 });
    return false;
  }

  counter.count += 1;
  return counter.count > limit.max;
}

// 使われなくなった数え札を片付ける。放っておくと、IPを変えながら叩かれた分だけ
// このMapが育ち続ける（それ自体がメモリを食う攻撃になる）。
const RATE_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const rateSweepTimer = setInterval(() => {
  const now = Date.now();
  const longestWindow = Math.max(...Object.values(RATE_LIMITS).map(l => l.windowMs));
  for (const [key, counter] of rateCounters) {
    if (now - counter.windowStart >= longestWindow) rateCounters.delete(key);
  }
}, RATE_SWEEP_INTERVAL_MS);
// 掃除のためだけにプロセスを生かし続けない
rateSweepTimer.unref();

function rejectTooManyRequests(res) {
  sendJson(res, 429, { error: '短い時間に何度も呼び出されています。しばらく待ってからお試しください。' });
}

// --- 重い操作の入口 ---
// 取り込み・書き出し・アップロードは、ボディや応答の大きさに比例して数百MBのピークを作る。
// 上限（MAX_IMPORT_BYTES等）は「1回あたり」の歯止めでしかなく、同時に2本走れば足し算に
// なってプロセスごと落ちる。ここで「今の残りメモリで足りるか」「順番待ちに入れるか」を
// 見てから通す（memory-budget.js参照）。
//
// 断るときは503にする。429（回数制限）と違って利用者の側に非は無く、時間を置けば必ず
// 通るためで、Retry-Afterで待つ目安も返す。

// 読み込む量。Content-Lengthが分かるならそれ、分からない（チャンク送信）なら上限を
// 悲観的に見積もる。通常のブラウザからの送信は必ず前者を通る。
function declaredBodyBytes(req, fallbackBytes) {
  const declared = Number(req.headers['content-length']);
  return Number.isFinite(declared) && declared >= 0 ? declared : fallbackBytes;
}

// @param {number} hardMaxBytes この経路がそもそも受け取れる上限（MAX_IMPORT_BYTES等）。
//   これを超える申告は、待っても小さくならない＝時間で解けないので、混雑扱い（503）にせず
//   ハンドラへ通してそちらの413（大きすぎます）を返させる。retryable付きの503を返すと、
//   ブラウザ側が「混んでいるだけ」と受け取って送り直してしまう（js/image-upload.jsのfetchUpload）。
async function withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity) {
  if (bodyBytes > hardMaxBytes) {
    await handler();
    return;
  }

  const slot = await acquireHeavySlot(kind, bodyBytes);

  if (!slot.ok) {
    const message = slot.reason === 'memory'
      ? 'サーバーのメモリに余裕がないため、この大きさのデータは今は受け取れません。'
        + '時間を置くか、データを小さくしてからお試しください。'
      : '今ほかの読み込み・書き出しが混み合っています。少し待ってからもう一度お試しください。';
    console.warn(`[server] 重い操作(${kind})を断りました: ${slot.reason}`
      + (slot.reason === 'memory' ? `（必要 ${Math.floor(slot.need / 1024 / 1024)}MB / 残り ${Math.floor(slot.room / 1024 / 1024)}MB）` : ''));
    sendJson(res, 503, { error: message, retryable: true }, { 'Retry-After': String(slot.retryAfterSec) });
    return;
  }

  try {
    await handler();
  } finally {
    slot.release();
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
    if (exceedsRateLimit(req, 'createRoom')) { rejectTooManyRequests(res); return; }
    // importedStateを載せられるため、ここが一番大きなボディを読む経路になる
    await withHeavySlot(req, res, 'import', declaredBodyBytes(req, MAX_IMPORT_BYTES),
      () => handleCreateRoom(req, res), MAX_IMPORT_BYTES);
    return;
  }

  if (url.pathname.startsWith('/api/rooms/') && url.pathname.endsWith('/entry-password') && req.method === 'PUT') {
    const roomId = url.pathname.slice('/api/rooms/'.length, -'/entry-password'.length);
    await handleSetEntryPassword(req, res, decodeURIComponent(roomId));
    return;
  }

  if (url.pathname.startsWith('/api/rooms/') && url.pathname.endsWith('/export') && req.method === 'POST') {
    if (exceedsRateLimit(req, 'export')) { rejectTooManyRequests(res); return; }
    const roomId = url.pathname.slice('/api/rooms/'.length, -'/export'.length);
    // 書き出しはボディではなく応答が大きい。どれだけ埋め込むかは残りの予算を見て
    // handleExportRoom側が決めるので（embedStateImagesのlimitBytes）、ここで押さえるのは
    // 画像を除いた状態そのもののぶん。
    await withHeavySlot(req, res, 'export', EXPORT_BASE_BYTES,
      () => handleExportRoom(req, res, decodeURIComponent(roomId)));
    return;
  }

  if (url.pathname === '/api/bcdice/game_system' && req.method === 'GET') {
    await handleBcdiceSystems(req, res);
    return;
  }

  if (url.pathname.startsWith('/api/bcdice/game_system/') && req.method === 'GET') {
    if (exceedsRateLimit(req, 'bcdice')) { rejectTooManyRequests(res); return; }
    const systemId = decodeURIComponent(url.pathname.slice('/api/bcdice/game_system/'.length));
    await handleBcdiceSystemInfo(req, res, systemId);
    return;
  }

  if (url.pathname === '/api/character-sheet' && req.method === 'GET') {
    if (exceedsRateLimit(req, 'sheet')) { rejectTooManyRequests(res); return; }
    await handleCharacterSheet(req, res, url);
    return;
  }

  if (url.pathname === '/api/audio' && req.method === 'POST') {
    if (exceedsRateLimit(req, 'upload')) { rejectTooManyRequests(res); return; }
    await withHeavySlot(req, res, 'upload', declaredBodyBytes(req, MAX_AUDIO_BYTES),
      () => handleAudioUpload(req, res), MAX_AUDIO_BYTES);
    return;
  }

  // アップロードが使えるかをUI側が事前に知るための問い合わせ（ボタンの有効・無効に使う）
  if (url.pathname === '/api/audio' && req.method === 'GET') {
    sendJson(res, 200, { uploadEnabled: isR2Configured(), maxBytes: MAX_AUDIO_BYTES });
    return;
  }

  if (url.pathname === '/api/image' && req.method === 'POST') {
    if (exceedsRateLimit(req, 'upload')) { rejectTooManyRequests(res); return; }
    await withHeavySlot(req, res, 'upload', declaredBodyBytes(req, MAX_IMAGE_BYTES),
      () => handleImageUpload(req, res), MAX_IMAGE_BYTES);
    return;
  }

  if (url.pathname === '/api/image/copy' && req.method === 'POST') {
    if (exceedsRateLimit(req, 'upload')) { rejectTooManyRequests(res); return; }
    // ボディは複製元のURLだけで小さいが、R2から実体を読むぶんメモリを使う
    await withHeavySlot(req, res, 'copy', MAX_IMAGE_BYTES,
      () => handleImageCopy(req, res));
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

// 1フレームの上限。wsの既定は100MiBで、Renderの小さいインスタンスでは数接続分を
// 同時に受け取るだけでメモリを使い切る。取り込み（REPLACE_STATE）が最大のメッセージ
// なので、その枠に少しの余裕を足した値にする。超えたフレームはws側が接続を閉じる。
const WS_MAX_PAYLOAD_BYTES = MAX_IMPORT_BYTES + 1024 * 1024;

// これを超えるフレームは、処理する前にメモリの残りを確かめる（ws.on('message')参照）。
// 通常の操作（コマの移動・チャット1行）は数百バイトなので、ここに引っかかるのは
// 取り込みだけ。小さいメッセージまで毎回memoryUsage()を呼ぶと、そちらが無駄になる。
const WS_HEAVY_FRAME_BYTES = 512 * 1024;

// 1接続あたりのメッセージ流量。1操作ごとに状態の保存（Redisへの書き込み）が走るため、
// 連打されると課金と帯域がそのまま伸びる。人間の操作としてはこれで十分足りる。
// 溢れた分は黙って捨てる（切断はしない。取りこぼしはRESYNCで直せるほうが親切なため）。
const WS_MESSAGE_WINDOW_MS = 10 * 1000;
const WS_MAX_MESSAGES_PER_WINDOW = 300;

// 同時接続数の上限。1人が何本も張ってメモリと部屋の人数表示を潰すのを防ぐ。
const WS_MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS) || 200;

const wss = new WebSocketServer({ server: httpServer, maxPayload: WS_MAX_PAYLOAD_BYTES });

// EventEmitterの'error'は聞き手がいないと同期的に例外を投げ、そのままプロセスが終了する。
// WebSocketは「上限を超えたフレーム」「壊れたフレーム」「相手が急に切った」だけでも
// errorを出すので、聞いていないと誰でもこのサーバーを落とせる（＝全部屋が巻き添えで
// 一斉に切断される）。接続ごとと、ハンドシェイク中の分の両方で受け止める。
// 受け止めた後の後始末（人数の減算など）は、続いて出るcloseイベントが面倒を見る。
wss.on('error', (error) => {
  console.warn('[server] WebSocketサーバーでエラーが発生しました（続行します）:', error.message);
});

wss.on('connection', async (ws, req) => {
  ws.on('error', (error) => {
    console.warn('[server] WebSocket接続でエラーが発生しました（この接続だけ切ります）:', error.message);
  });

  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room');

  // 生存確認の初期値。以後はpongが返るたびに立て直す（下のheartbeatTimer参照）。
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // 自分自身もwss.clientsに含まれた状態でここへ来る
  if (wss.clients.size > WS_MAX_CONNECTIONS) {
    console.warn(`[server] 同時接続数の上限（${WS_MAX_CONNECTIONS}）に達したため接続を断りました`);
    ws.close(4008, 'too many connections');
    return;
  }

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

  // 名乗った回数。開発用の合言葉（isDeveloperToken）を当てた人はこの部屋どころか全部屋で
  // GMと同じ操作を通せるため、1本の接続で延々と試せる状態にしておかない。
  //
  // 数えるのは失敗回数ではなく回数そのもの。合言葉の総当たりはブラウザ側と同じ計算を
  // 手元でやるだけなので、verifyIdentity（公開IDとトークンの辻褄）は必ず通ってしまい、
  // 「失敗」として現れない。合言葉かどうかの判定だけがサーバー側にある。
  //
  // ブラウザは1接続につきopen時・INIT受信時・NET_INITIALIZED経由と複数回送り、
  // 表示名を変えるたびにも送り直す。普通に使う分には二桁に届かない。
  // 超えた分は黙って捨てる（切断すると、名前を何度も変えただけの人が部屋から落ちる）。
  const MAX_IDENTIFY_PER_CONNECTION = 50;
  let identifyCount = 0;

  // メッセージ流量の窓（WS_MAX_MESSAGES_PER_WINDOW参照）
  let messageWindowStart = Date.now();
  let messagesInWindow = 0;

  // 溢れていたらtrue。窓をまたいだら数え直す。
  function exceedsMessageRate() {
    const now = Date.now();
    if (now - messageWindowStart >= WS_MESSAGE_WINDOW_MS) {
      messageWindowStart = now;
      messagesInWindow = 0;
    }
    messagesInWindow += 1;
    // 窓の中で最初に超えた1回だけ記録する（溢れ続けているとログ自体が負荷になるため）
    if (messagesInWindow === WS_MAX_MESSAGES_PER_WINDOW + 1) {
      console.warn(`[server] ${roomId}: メッセージが多すぎるため以後この窓の分を捨てます`);
    }
    return messagesInWindow > WS_MAX_MESSAGES_PER_WINDOW;
  }

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
    if (exceedsMessageRate()) return;

    // 大きなフレーム（＝取り込み。REPLACE_STATE）は、この先のtoString()とJSON.parse()で
    // フレーム自体の3〜4倍のメモリを追加で使う。フレームはws側が既に受け取り終えているので
    // ここで節約できるのはその複製分だけだが、落ちるかどうかを分けるのはまさにそこ。
    //
    // HTTP側（withHeavySlot）と違って順番待ちにはしない。待つ間もフレームを抱えたままで、
    // 待つこと自体がメモリを空けないため。送り手には現在の状態を配り直して整合を戻す
    // （送り手のタブはローカルで置き換え済み。js/net-sync.jsのreplaceState参照）。
    if (data.length > WS_HEAVY_FRAME_BYTES && !hasRoomFor('import', data.length)) {
      console.warn(`[server] ${roomId}: メモリに余裕がないため大きなメッセージ`
        + `（${Math.floor(data.length / 1024 / 1024)}MB）を処理せず捨てました`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'RESYNC', state: entry.store.state }));
      }
      return;
    }

    let message;
    try {
      message = parseUntrustedJson(data.toString());
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
      identifyCount += 1;
      if (identifyCount > MAX_IDENTIFY_PER_CONNECTION) {
        if (identifyCount === MAX_IDENTIFY_PER_CONNECTION + 1) {
          console.warn(`[server] ${roomId}: 名乗りが多すぎるため以後この接続の分を捨てます`);
        }
        return;
      }

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

    // スタンプ。盤面に数十秒だけ出して消える合図で、チャットログにも状態にも残さない。
    // 記入中一覧（TYPING_*）・送信音（上のREQUEST_CHAT_SEND_SOUND）と同じ揮発メッセージで、
    // store.dispatchを通さないのでpersistも走らない＝出すたびの保存が発生しない。
    //
    // 受け取るのはスタンプのIDだけにしてある。URLや任意の文字列を受けると、そのまま
    // 「他人の画面に好きな画像を出す口」になるため（js/stamp-catalog.js冒頭参照）。
    // 表示名もクライアントの申告ではなく、名乗りのときにサーバーが決めたws.participantNameを使う。
    if (message.type === 'SEND_STAMP') {
      // スタンプには送り主の名前が出る。名前の無いゲストはそもそも描けないので対象外にする
      // （記入中一覧と同じ扱い）。
      if (!verifiedParticipantId) return;
      // 使えるスタンプはその部屋に適用中のプラグインで変わる（js/stamp-registry.js）。
      // 別のシステムのスタンプを名指しで送られても、ここで落ちる。
      if (!isKnownStampId(message.stampId, entry.store.state.room?.activePlugin ?? null)) return;
      if (!allowStamp(ws)) return;

      broadcastToRoom(entry, null, {
        type: 'ACTION',
        action: 'SHOW_STAMP',
        payload: {
          stampId: String(message.stampId),
          participantId: verifiedParticipantId,
          name: ws.participantName || 'ゲスト'
        }
      });
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      // 接続中の全員の状態を丸ごと置き換えるため、部屋の削除と同じくGM限定にする
      if (!mayOperateAsGm()) {
        rejectAndResync('REPLACE_STATE');
        return;
      }
      // 読み込んだファイルに混ざっている画像・音源（データURL・他の部屋のURL）をこの部屋の
      // 持ち物へ複製し直す（adoptStateMedia参照）。複製には時間がかかるので、
      // その間に届いた他の操作は先に適用され、この置き換えで上書きされる——が、
      // 全データの読み込みは元々そういう操作なので問題にしない。
      // 送り手側でも通しているが、ここでも必ず通す（js/state-import.js）。今この部屋にいる
      // 参加者一覧を引き継ぐことで、読み込んだGMがGMのままでいられる。
      const importedState = adoptImportedState(message.state, {
        participants: entry.store.state.participants
      });
      adoptStateMedia(roomId, importedState).then(({ state: adopted, dropped }) => {
        entry.store.hydrate(withImportNotice(adopted, droppedMediaMessage(dropped)));
        schedulePersistForRoom(roomId, entry);
        // 送り手にも配る。送り手の画面には複製前（データURL等）が入っているため、
        // ここで配り直さないと画面とサーバーで画像の持ち方が食い違ったままになる。
        broadcastToRoom(entry, null, { type: 'INIT', state: entry.store.state });
      }).catch((error) => {
        console.warn(`[server] ${roomId}: 読み込んだ状態の取り込みに失敗しました:`, error.message);
        // 送り手のタブは既にローカルで置き換え済み（js/net-sync.jsのreplaceState）。
        // ここで戻さないと、送り手だけが取り込んだ内容・他は元のまま、という食い違いが残る。
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'RESYNC', state: entry.store.state }));
        }
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
        // 音源トラックは大きさを持たないので、何バイト減ったかはここでは分からない。
        // 集計を捨てて、次のアップロードでR2から数え直させる（消したのに「上限に達して
        // います」と言われ続けるのを防ぐ）。
        .then(() => forgetRoomStorage(roomId))
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

// --- 最後の受け皿 ---
// このサーバーは全部屋を1プロセスで受け持っているので、どこか1か所の取りこぼしで
// プロセスが落ちると、無関係な部屋のセッションまで一斉に切断される（wsのmessageイベントで
// 同じ心配をしているのと同じ理由。ACTION処理のtryのコメントを参照）。
// 非同期の取りこぼしはNodeの既定ではプロセス終了になるため、ここで受け止めて記録だけ残す。
// 握りつぶすのが目的ではないので、内容ごと出して気づけるようにしておく。
process.on('unhandledRejection', (reason) => {
  console.error('[server] 取りこぼした非同期エラー（プロセスは継続します）:', reason);
});

// --- 終了時の後始末 ---
// 保存はデバウンスしているので、待機中の変更を書き出さずに落ちるとその分が失われる。
// Renderはデプロイやスピンダウンのたびにここ（SIGTERM）を通るため、放っておくと
// 「最後の操作だけ戻っている」が日常的に起きる。
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} を受け取りました。保存待ちの部屋を書き出します…`);

  // 書き出しが何らかの理由で終わらないときに、いつまでも落ちないのは困る
  // （PaaSは待たされた末に強制終了させるので、かえって失われる幅が広がる）。
  const timeout = setTimeout(() => {
    console.warn('[server] 保存の完了を待てませんでした。そのまま終了します');
    process.exit(1);
  }, 8000);
  timeout.unref();

  flushAllPendingSaves()
    .catch((error) => console.warn('[server] 終了時の保存に失敗しました:', error.message))
    .finally(() => {
      clearInterval(heartbeatTimer);
      wss.close();
      httpServer.close(() => process.exit(0));
      // 接続中のWebSocketが残っているとhttpServer.closeは返らないので、明示的に切る
      wss.clients.forEach((client) => client.close(1001, 'server shutting down'));
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(PORT, () => {
  console.log(`[server] サーバーを起動しました: http://localhost:${PORT}　（部屋数上限: ${MAX_ROOMS}）`);
  // 置き場の上限は環境変数で変えられるので、実際に効いている値を起動時に出しておく
  // （課金に直結する設定なので、本番のログで確かめられるようにする）。
  if (isR2Configured()) {
    console.log(`[server] 1部屋あたりのファイル合計の上限: ${Math.floor(MAX_ROOM_STORAGE_BYTES / 1024 / 1024)}MB`);
  }
  // メモリ上限の検出を誤ると、断りすぎ（機能が使えない）か断らなすぎ（OOMで全部屋切断）の
  // どちらかになる。実際に効いている値を必ずログに出す（memory-budget.js参照）。
  console.log(`[server] ${describeBudget()}`);
});
