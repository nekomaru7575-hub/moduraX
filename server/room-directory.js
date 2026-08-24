// server/room-directory.js
// 全部屋の要約（名前・プラグイン・BCDiceシステム・鍵の有無・最終更新）を1か所に集めた
// 「部屋の名簿」。一覧の表示・名前での検索と、期限切れ部屋の掃除がここだけを見る。
//
// なぜ要るか：部屋は以前 room-1..room-5 の固定スロットだったので、一覧は 1..5 を総当たり
// すれば作れた（要約も1部屋1キーで持てた）。部屋数の上限を外した今その手は使えない——
// IDがランダムになったので、そもそも総当たりできる範囲が無い。全部屋の要約を1つの
// ハッシュに集めて、一覧はそれだけを読む。
//
// 保存先はUpstash Redisのハッシュ roomDirectory（field=部屋ID、value=要約）。接続情報が
// 無ければローカルファイル server/rooms/directory.json（server/index.jsと同じ
// 「ローカルモード」の約束）。
//
// 読みはプロセス内のMapを正とする。起動後の初回だけ保存先を読み、以後は書くときに両方へ
// 反映する。Upstashの課金は帯域幅で効くので、一覧を開くたびに全部屋分を読み直すのは避けたい
// （部屋が増えるほどそのまま効いてくる）。単一プロセス前提でよい——server/index.jsの
// rooms と roomStorageUsage が既に同じ前提に立っている。複数プロセスで動かすなら、
// このキャッシュではなくそちらから作り直す必要がある。

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const REDIS_KEY = 'roomDirectory';

let redis = null;
let filePath = null;
let dirPath = null;

// 部屋ID -> 要約。loadRoomDirectory()が済むまでは空。
const summaries = new Map();
let loaded = false;
// 保存先の読み込みは一度だけ。並行して呼ばれても同じPromiseを待たせる。
let loading = null;

/**
 * 使う前に一度だけ呼ぶ。redisがnullならローカルファイルだけで動く。
 * @param {object|null} redisClient @upstash/redis のクライアント
 * @param {string} directoryFilePath ローカルモードで使うJSONのパス
 */
export function configureRoomDirectory(redisClient, directoryFilePath) {
  redis = redisClient;
  filePath = directoryFilePath;
  dirPath = path.dirname(directoryFilePath);
}

// Upstashのクライアントは値がJSONなら勝手にパースして返すが、平文の文字列で
// 書かれていた場合はそのまま返ってくる。どちらで来ても読めるようにしておく。
function parseSummary(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 保存先から名簿を読み込む（初回だけ実際に読む）。失敗したら空のまま先へ進む：
 * 名簿が読めないことを理由に起動を止めると、部屋そのものは無事なのにサービス全体が
 * 立たなくなる。次の書き込みで作り直される。
 */
export function loadRoomDirectory() {
  if (loaded) return Promise.resolve();
  if (loading) return loading;

  loading = (async () => {
    try {
      if (redis) {
        const all = (await redis.hgetall(REDIS_KEY)) || {};
        Object.entries(all).forEach(([roomId, value]) => {
          const summary = parseSummary(value);
          if (summary) summaries.set(roomId, summary);
        });
      } else {
        const raw = JSON.parse(await readFile(filePath, 'utf-8'));
        Object.entries(raw || {}).forEach(([roomId, value]) => {
          const summary = parseSummary(value);
          if (summary) summaries.set(roomId, summary);
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('[room-directory] 部屋の名簿を読み込めませんでした（空として続行します）:', error.message);
      }
    } finally {
      loaded = true;
      loading = null;
    }
  })();

  return loading;
}

// ローカルモードの保存はファイル丸ごとの書き直し。部屋の要約は1件数十バイトなので、
// 数千部屋あっても数百KBで収まる（Redis運用ではこちらは使わない）。
async function writeLocalFile() {
  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, JSON.stringify(Object.fromEntries(summaries)));
}

/** 名簿に1件書く（既にあれば上書き）。 */
export async function upsertRoomSummary(roomId, summary) {
  summaries.set(roomId, summary);
  if (redis) await redis.hset(REDIS_KEY, { [roomId]: summary });
  else await writeLocalFile();
}

/** 名簿から1件外す。部屋を削除したときに呼ぶ。 */
export async function removeRoomSummary(roomId) {
  summaries.delete(roomId);
  if (redis) await redis.hdel(REDIS_KEY, roomId);
  else await writeLocalFile();
}

/** 1件だけ引く。無ければnull。 */
export function getRoomSummary(roomId) {
  return summaries.get(roomId) || null;
}

/** 名簿にある部屋の数。 */
export function roomCount() {
  return summaries.size;
}

/** 掃除（期限切れ部屋の自動削除）が全件を回るため。IDだけの配列を返す。 */
export function allRoomIds() {
  return Array.from(summaries.keys());
}

// 検索の突き合わせ。大文字小文字を無視するだけで、日本語には効かない正規化はしない
// （NFKCまで踏み込むと「ｱ」と「ア」の扱いで悩むことになる。部屋名の部分一致で足りる）。
function matchesQuery(summary, needle) {
  return String(summary.name || '').toLowerCase().includes(needle);
}

/**
 * 一覧用。最終更新の新しい順に並べ、limit件で切る。
 * @param {string} query 部屋名の部分一致（空なら絞り込まない）
 * @param {number} limit 返す最大件数
 * @returns {{rooms: object[], total: number, truncated: boolean}}
 *   rooms は {id, ...要約}。total は絞り込み後の全件数（切る前）。
 */
export function listRoomSummaries({ query = '', limit = 200 } = {}) {
  const needle = String(query || '').trim().toLowerCase();

  const matched = [];
  summaries.forEach((summary, roomId) => {
    if (needle && !matchesQuery(summary, needle)) return;
    matched.push({ id: roomId, ...summary });
  });

  // updatedAtを持たない古い部屋は末尾へ回す（0扱い）。並びが不定にならないよう、
  // 同じ時刻のときはIDで決める（updatedAtは1時間単位に丸めてあるので実際よく並ぶ）。
  matched.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || a.id.localeCompare(b.id));

  return {
    rooms: matched.slice(0, limit),
    total: matched.length,
    truncated: matched.length > limit
  };
}
