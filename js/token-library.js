// js/token-library.js
// 「棚」——コマ作成ツール（character-builder.html）で作ったコマを、このブラウザに
// 取っておく置き場。作ったものが部屋を作らないと残せない、という状態を解消するためにある。
// 部屋の中からは js/token-library-dialog.js が引き出して、バックヤードへ入れる。
//
// 【なぜIndexedDBか】部屋の外では画像のアップロード先が決まらないので、
// pickAndUploadImage はデータURLをそのまま返す（js/image-upload.js）。写真1枚で数MBに
// なるため、localStorage（オリジン全体で約5MB・パレットや合言葉と共用）には置けない。
//
// 【なぜ js/asset-store.js と同じDBに入れないか】
// あちらのDBへストアを1つ足すには DB_VERSION の引き上げが要る。ところが sw.js が
// 同じDBへ**独立した写し**でアクセスしている（classic workerはESモジュールをimportできない
// ため。sw.js冒頭）。版を上げると、絵の配信という無関係な機構まで巻き込む。DBを分ければ
// 壊しようがない。
//
// 【追い出さない】js/asset-store.js は古いものから捨てる（LRU）。あれは中身が他所から
// 取り直せる**キャッシュ**だから成立する。ここに入るのは利用者が自分で作った、
// **どこにも他に無いデータ**で、黙って捨てたら作業が消える。だから上限に当たったら
// 捨てずに**断る**。断り方は例外ではなく戻り値（下のsaveLibraryToken）で、
// 画面が理由を出せるようにしてある。
//
// 【例外を投げない】private modeやストレージ拒否でIndexedDBが開けない環境がある。
// そこで作成ツールが真っ白になっては困るので、どの口も失敗を戻り値で返す
// （js/p2p-import-handoff.js と同じ構え）。

import { buildTokenSnapshot, isTokenSnapshot } from './character-snapshot.js';

const DB_NAME = 'mojulaX-tokens';
const DB_VERSION = 1;
const STORE = 'tokens';

// 棚に置ける数。追い出しをしない以上、際限なく増やさせるわけにはいかない。
// 卓ごとにPCを1体ずつ＋NPCを何体か、を何卓ぶんか持つ想定で30。
export const MAX_LIBRARY_TOKENS = 30;

// 1件あたりの上限。ほぼ画像（データURL）の大きさで決まるので、サーバーが受け付ける
// 画像の上限（server/index.jsのMAX_IMAGE_MB・既定8MB）に合わせてある。ここを通っても
// 部屋へ持ち込むときに弾かれる、という食い違いを作らないため。
export const MAX_LIBRARY_ENTRY_BYTES = 8 * 1024 * 1024;

// 棚に並べる名前の上限。長い名前で一覧が崩れるのを防ぐだけの歯止め。
const MAX_NAME_LENGTH = 60;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        // 一覧は「最近さわった順」に並べる
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let idCounter = 0;

/** 棚の1件のid。部屋のコマのid（js/store/ids.js）とは別物で、部屋へは持ち込まない。 */
export function generateLibraryTokenId() {
  idCounter += 1;
  return `libtoken-${Date.now()}-${idCounter}`;
}

/**
 * 保存済みの1件を、画面へ出してよい形へ均す。**読み出しは必ずここを通すこと。**
 *
 * 保存した形をそのまま信じないのは、この置き場の中身が「利用者が拾ってきたJSON」から
 * 来ているため（外部シートのファイルを読み込んで作れる）。壊れた行・古い版の行が
 * 混ざっていても、一覧の描画が落ちないほうが大事なので、読めない行は捨てる。
 * js/chat-palette.js の normalizeState と同じ立て付け。
 *
 * @returns {{id, name, pluginId, savedAt, updatedAt, snapshot}|null} 読めなければnull
 */
export function normalizeLibraryEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (id === '') return null;

  // スナップショットがマーカーごと揃っていない行は、復元しても何も作れない
  if (!isTokenSnapshot(raw.snapshot)) return null;

  // 表示名は棚の一覧用の控え。中身（snapshot.name）が正で、こちらが空なら拾い直す。
  const name = String(raw.name ?? raw.snapshot.name ?? '').trim().slice(0, MAX_NAME_LENGTH)
    || '名称未設定';

  const savedAt = Number.isFinite(raw.savedAt) ? raw.savedAt : 0;
  const updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : savedAt;

  return {
    id,
    name,
    pluginId: typeof raw.pluginId === 'string' && raw.pluginId !== '' ? raw.pluginId : null,
    savedAt,
    updatedAt,
    snapshot: raw.snapshot
  };
}

/**
 * コマ（token）と適用プラグインから、棚へ入れる1件を組み立てる。
 * idを渡すと上書き（＝編集の保存）、省くと新規。
 */
export function buildLibraryEntry(token, pluginId, { id = null, savedAt = null } = {}) {
  const now = Date.now();
  return {
    id: id || generateLibraryTokenId(),
    // 一覧のたびにスナップショットを開いて中を見なくて済むよう、名前とシステムは外へ出す
    name: String(token.name ?? '').trim().slice(0, MAX_NAME_LENGTH) || '名称未設定',
    pluginId: pluginId || null,
    savedAt: savedAt ?? now,
    updatedAt: now,
    snapshot: buildTokenSnapshot(token)
  };
}

/**
 * 棚の中身。新しくさわった順。読めない行は落とす。
 * 置き場が使えない環境では空配列（画面は「まだ無い」と同じ見た目になる）。
 */
export async function listTokenLibrary() {
  try {
    const db = await openDb();
    const rows = await wrap(tx(db, 'readonly').getAll());
    return rows
      .map(normalizeLibraryEntry)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** 1件取り出す。無い・読めない・置き場が使えないときはnull。 */
export async function getLibraryToken(id) {
  if (typeof id !== 'string' || id === '') return null;
  try {
    const db = await openDb();
    return normalizeLibraryEntry(await wrap(tx(db, 'readonly').get(id)));
  } catch {
    return null;
  }
}

/**
 * 1件しまう。既に同じidがあれば上書き（＝編集の保存）。
 *
 * **上限は捨てずに断る。** 追い出すと、利用者が作ったものが黙って消える。
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function saveLibraryToken(entry) {
  const normalized = normalizeLibraryEntry(entry);
  if (!normalized) return { ok: false, reason: 'このコマは保存できる形になっていません。' };

  // 大きさはほぼ画像で決まる。JSONの文字列長でおおよそを見る（データURLはbase64なので
  // 実バイトの4/3。厳密さより「明らかに大きいものを止める」ことが目的）。
  const size = estimateEntryBytes(normalized);
  if (size > MAX_LIBRARY_ENTRY_BYTES) {
    return {
      ok: false,
      reason: `画像が大きすぎます（1体あたり ${Math.floor(MAX_LIBRARY_ENTRY_BYTES / 1024 / 1024)}MBまで）。`
        + '小さい画像に差し替えてから保存してください。'
    };
  }

  try {
    const db = await openDb();
    const existing = await wrap(tx(db, 'readonly').get(normalized.id));
    if (!existing) {
      const count = await wrap(tx(db, 'readonly').count());
      if (count >= MAX_LIBRARY_TOKENS) {
        return {
          ok: false,
          reason: `保存できるのは${MAX_LIBRARY_TOKENS}体までです。`
            + '要らないコマを消してから保存してください。'
        };
      }
    }
    await wrap(tx(db, 'readwrite').put(normalized));
    return { ok: true };
  } catch (error) {
    // 容量超過（QuotaExceededError）も、private modeでDBを開けない場合もここへ来る。
    // どちらも利用者にできることは同じ（減らす・別のブラウザで開く）なので、まとめて伝える。
    return {
      ok: false,
      reason: `このブラウザに保存できませんでした（${error?.name || '原因不明'}）。`
        + 'プライベートウィンドウでは保存できないことがあります。'
    };
  }
}

/** 1件消す。消えた（もともと無かった場合も含む）ならtrue。 */
export async function removeLibraryToken(id) {
  if (typeof id !== 'string' || id === '') return false;
  try {
    const db = await openDb();
    await wrap(tx(db, 'readwrite').delete(id));
    return true;
  } catch {
    return false;
  }
}

/**
 * 1件のおおよそのバイト数。上限の判定にだけ使う。
 * 実測ではなく見積もりなのは、IndexedDBが実際に何バイト使うかは実装依存で、
 * 正確に測る手段が無いため。目的は「明らかに大きいものを手前で止める」こと。
 */
export function estimateEntryBytes(entry) {
  try {
    return JSON.stringify(entry).length;
  } catch {
    // 循環参照など。測れないものは通さない側に倒す
    return Number.POSITIVE_INFINITY;
  }
}
