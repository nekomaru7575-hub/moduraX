// server/memory-budget.js
// 重い操作（部屋の取り込み・書き出し・ファイルのアップロード）が使うメモリを、実際に
// 読み込む前に見積もって予約する。予算が足りなければ「読まずに断る」。あわせて、重い操作が
// 同時に何本も走らないよう順番待ちにする。
//
// なぜ要るか：Renderのようなコンテナはメモリ上限を超えるとOOM killerがプロセスごと殺す。
// 落ちれば同居している全部屋の参加者がまとめて切断され、デバウンス待ちの保存も失われる
// （flushAllPendingSavesはSIGTERMでしか動かない。server/index.js参照）。1人の重い操作で
// 全員を巻き添えにするより、その1人に「今は混んでいます」と返すほうが安い。
//
// 見積もりの根拠（server/index.jsのreadJsonBodyと同じ手順＝chunks→concat→toString→parse
// を実測した値）：
//   ボディ10MB → ピークRSS 98MB ／ 20MB → 148MB ／ 40MB → 248MB ／ 93MB（現行の上限）→ 513MB
// ボディ1バイトにつきピークは約4〜5バイト。この係数で先に押さえる。
//
// 設定（すべて環境変数。既定値のままでも動く）：
//   MEMORY_LIMIT_MB        … コンテナのメモリ上限。未指定ならcgroupから読む
//   MEMORY_SAFE_FRACTION   … 上限のうち使ってよい割合（既定0.75）
//   MEMORY_NON_HEAP_MB     … heapUsed/externalに現れない常駐分（既定48MB）
//   MAX_HEAVY_OPERATIONS   … 重い操作の同時実行数（既定1）
//   HEAVY_QUEUE_MAX        … 順番待ちの列の長さ（既定8）。溢れたら待たせずに断る
//   HEAVY_WAIT_TIMEOUT_MS  … 順番待ちの上限（既定15000）

import { readFileSync } from 'node:fs';

// cgroupが読めず環境変数も無いときの既定。安全側（小さいほう）に倒す。大きく見積もって
// 断り損ねるとプロセスが死ぬが、小さく見積もりすぎても断られた側がやり直せるだけで済む。
const DEFAULT_LIMIT_BYTES = 256 * 1024 * 1024;

// コンテナのメモリ上限。os.totalmem()はホスト全体を返すので使えない
// （Renderでは数十GBに見え、上限判定の役に立たない）。cgroupの値を直接読む。
function detectLimitBytes() {
  const configured = Number(process.env.MEMORY_LIMIT_MB);
  if (Number.isFinite(configured) && configured > 0) return configured * 1024 * 1024;

  const paths = [
    '/sys/fs/cgroup/memory.max',                  // cgroup v2
    '/sys/fs/cgroup/memory/memory.limit_in_bytes' // cgroup v1
  ];
  for (const filePath of paths) {
    try {
      const raw = readFileSync(filePath, 'utf-8').trim();
      const value = Number(raw); // 'max'（制限なし）はNaNになるので下の判定で落ちる
      // 制限なしのときv1は途方もない値（2^63近辺）を返す。桁で弾く。
      if (Number.isFinite(value) && value > 0 && value < 64 * 1024 * 1024 * 1024) return value;
    } catch {
      // 次の候補へ（Windows・macOSではどちらも存在しない）
    }
  }
  return DEFAULT_LIMIT_BYTES;
}

export const MEMORY_LIMIT_BYTES = detectLimitBytes();

// 上限のうち、重い操作に使ってよい割合。残りはGCが追いつく前の一時的な膨らみと、
// 見積もりが外れたぶんの逃げ場として空けておく。
const SAFE_FRACTION = Number(process.env.MEMORY_SAFE_FRACTION) || 0.75;

// heapUsed+externalに現れない常駐分（V8のコード領域・スタック・各種メタデータ）。
// 起動直後の実測はRSS 58MBに対しheapUsed 5MBで、その差がここ。
const NON_HEAP_OVERHEAD_BYTES = (Number(process.env.MEMORY_NON_HEAP_MB) || 48) * 1024 * 1024;

// ボディ1バイトあたりのピーク倍率。
//   import … chunks→concat→string→parse の4系統が同時に生きる
//   upload … chunks→concat の2系統（+署名時の読み取り）
//   copy   … R2からの取得（arrayBuffer→Buffer）とR2への送信
//   export … base64で4/3に膨らんだものが、状態・JSON文字列・応答バッファに載る
const PEAK_FACTOR = { import: 4, upload: 3, copy: 3, export: 4 };

const MAX_CONCURRENT = Number(process.env.MAX_HEAVY_OPERATIONS) || 1;
const QUEUE_MAX = Number(process.env.HEAVY_QUEUE_MAX) || 8;
const WAIT_TIMEOUT_MS = Number(process.env.HEAVY_WAIT_TIMEOUT_MS) || 15000;

let running = 0;
const waiting = [];

// いま使っているメモリ。RSSではなくheapUsed+externalに固定の常駐分を足して見る。
// RSSはGCが解放を先送りするぶん実態より高く出るため、そのまま使うと「一度大きな取り込みを
// したあとは以後ずっと断り続ける」ことになる（同時実行を1本に絞っているので、予約済みの
// 分を二重に数える心配もない）。
function usedBytes() {
  const usage = process.memoryUsage();
  // externalはarrayBuffersを含むので、足すのはこの2つだけでよい
  return usage.heapUsed + usage.external + NON_HEAP_OVERHEAD_BYTES;
}

/** いま重い操作に回せるバイト数（ピーク換算）。 */
export function availableBytes() {
  return Math.max(0, Math.floor(MEMORY_LIMIT_BYTES * SAFE_FRACTION - usedBytes()));
}

/**
 * いま受け付けられるボディの最大バイト数。書き出しのように「どこまで詰め込むか」を
 * こちら側で決められる処理が、予算に合わせて量を減らすために使う。
 */
export function maxBodyBytesFor(kind) {
  return Math.floor(availableBytes() / (PEAK_FACTOR[kind] || 4));
}

/** このサイズのボディを扱うだけの余裕があるか（順番待ちには入らない）。 */
export function hasRoomFor(kind, bodyBytes) {
  return bodyBytes * (PEAK_FACTOR[kind] || 4) <= availableBytes();
}

function takeSlot() {
  if (running < MAX_CONCURRENT) {
    running += 1;
    return Promise.resolve(true);
  }
  // 列が長くなりすぎたら待たせない。待たせている間はリクエストのボディを読まずに
  // 接続を抱えたままになるので、順番が回ってくる見込みの無い分は早く帰すほうがよい。
  if (waiting.length >= QUEUE_MAX) return Promise.resolve(false);

  return new Promise((resolve) => {
    const waiter = { settle: null, timer: null };
    waiter.settle = (ok) => {
      if (waiter.timer === null) return; // 既に決着済み
      clearTimeout(waiter.timer);
      waiter.timer = null;
      resolve(ok);
    };
    waiter.timer = setTimeout(() => {
      const index = waiting.indexOf(waiter);
      if (index >= 0) waiting.splice(index, 1);
      waiter.settle(false);
    }, WAIT_TIMEOUT_MS);
    waiting.push(waiter);
  });
}

// 使い終わった枠は、待っている人がいればそのまま渡す（runningは減らさない＝枠の引き継ぎ）。
function releaseSlot() {
  const next = waiting.shift();
  if (next) {
    next.settle(true);
    return;
  }
  running = Math.max(0, running - 1);
}

/**
 * 重い操作の枠を取る。取れたら { ok: true, release }、取れなければ理由付きで { ok: false }。
 * 呼ぶ側は必ず finally で release() すること（漏らすと枠が二度と戻らない）。
 *
 * @param {'import'|'upload'|'copy'|'export'} kind
 * @param {number} bodyBytes 読み込む（または作る）データのバイト数。分からないときは上限を渡す
 */
export async function acquireHeavySlot(kind, bodyBytes) {
  const got = await takeSlot();
  if (!got) {
    return { ok: false, reason: 'busy', retryAfterSec: 20 };
  }

  const need = bodyBytes * (PEAK_FACTOR[kind] || 4);
  const room = availableBytes();
  if (need > room) {
    releaseSlot();
    return { ok: false, reason: 'memory', need, room, retryAfterSec: 30 };
  }

  let released = false;
  return {
    ok: true,
    release() {
      if (released) return;
      released = true;
      releaseSlot();
    }
  };
}

/** 起動時のログ用。効いている値を本番のログで確かめられるようにする。 */
export function describeBudget() {
  const mb = (bytes) => Math.floor(bytes / 1024 / 1024);
  return `メモリ上限 ${mb(MEMORY_LIMIT_BYTES)}MB / 重い操作に回せる分 ${mb(availableBytes())}MB`
    + ` / 同時実行 ${MAX_CONCURRENT}本`
    + ` / いま受け付けられる取り込みの最大 ${mb(maxBodyBytesFor('import'))}MB`;
}

/**
 * いまの混み具合の生の数値。部屋一覧（GET /api/rooms）が「混雑状況」を出すために使う。
 * describeBudgetが人間向けの1行なのに対し、こちらは判断に使える数のまま返す。
 * 予約の内訳（誰が何を送っているか）は返さない。外に出すのは「どれだけ埋まっているか」だけ。
 */
export function loadSnapshot() {
  return {
    limitBytes: MEMORY_LIMIT_BYTES,
    // 重い操作に回してよい上限。availableBytesはこの値から現在の使用量を引いたもの
    budgetBytes: Math.floor(MEMORY_LIMIT_BYTES * SAFE_FRACTION),
    availableBytes: availableBytes(),
    running,
    waiting: waiting.length,
    maxConcurrent: MAX_CONCURRENT,
    queueMax: QUEUE_MAX
  };
}
