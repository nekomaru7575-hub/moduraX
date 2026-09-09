// js/image-pool.js
// 「プール」——アップロードした画像を、実際に使われるまでこのブラウザに溜めておく待機列。
// そこから取り出して置き場へ送るのは js/image-selector-dialog.js。判定は持たず
// （js/store/images.js）、DOMにも触らない。
//
// 【なぜ要るか】これまでは画像を選んだ**その瞬間**にR2へ上がっていた。ところが画像は
// 1枚も即時削除されない——即時削除があるのは音源トラックと部屋スタンプの2つだけで
// （server/index.jsのpickRemovedMediaKey）、背景を差し替えてもコマの絵を消しても
// 古いオブジェクトはR2に残る。参照カウントも意図的に持っていない（同じ画像を盤面と
// 複数のシーンが同時に指しうるので、個別に消すと「まだ使っているシーンの背景が404」
// という最悪の壊れ方をする。server/index.jsのdeleteRoomData付近）。
// つまり「試しに背景を5枚差し替える」だけで、使わなかった4枚が部屋の容量枠とR2の
// 課金を14日間食い続ける。減らす道は**上げる回数そのものを減らすこと**しかない。
//
// 【なぜ新しいDBか】js/asset-store.js のDBへストアを足すには DB_VERSION の引き上げが
// 要る。ところが sw.js が同じDBへ独立した写しでアクセスしている（classic workerは
// ESモジュールをimportできないため）。版を上げると絵の配信という無関係な機構まで
// 巻き込む。js/token-library.js が同じ理由でDBを分けている。
//
// 【なぜ中身のハッシュを鍵にするか】同じ絵を選び直しても1件で済む。そして
// 「この部屋へ上げ済みか」の記憶の鍵になる——R2のキーはUUIDで内容アドレスではない
// （server/index.js）ので、「同じ中身か」を言えるのはこのハッシュだけ。
// 計算は js/asset-store.js の hashBlob をそのまま借りる。
//
// 【追い出さない】上げ終わったものはプールから消すので、ここに居るのは常に
// 「まだどこにも保存されていない唯一の実体」。js/asset-store.js のLRUが成立するのは
// 中身が他所から取り直せるキャッシュだからで、こちらは違う。黙って捨てたら利用者は
// ファイルを探し直しになる。だから上限に当たったら捨てずに**断る**
// （js/token-library.js と同じ判断軸。docs/codemap に明文化されている）。
//
// 【例外を投げない】private modeやストレージ拒否でIndexedDBが開けない環境がある。
// そこでセレクタが真っ白になっては困る——プールが使えないことで画像が1枚も使えなく
// なるのは退行なので、どの口も失敗を戻り値で返し、呼ぶ側がプールを飛ばせるようにする
// （js/token-library.js・js/p2p-import-handoff.js と同じ構え）。

import { hashBlob } from './asset-store.js';
import { currentRoomId, imageUploadMaxBytes } from './image-upload.js';
import { poolMimeAllowed } from './store/images.js';

const DB_NAME = 'mojulaX-pool';
const DB_VERSION = 1;
const STORE = 'pending';

// プール全体の上限。上げ終わったものは消えるので、定常的にはずっと小さい。
// js/asset-store.js の300MBとは別枠（あちらはP2P卓の絵の唯一の置き場で、性質が違う）。
export const MAX_POOL_BYTES = 200 * 1024 * 1024;

// 1件あたりの上限が取れないときの控え。サーバーの MAX_IMAGE_MB の既定と同じ8MB
// （server/index.js）。imageUploadMaxBytes() は /api/image を一度も叩いていないと
// nullを返すので、その場合の受け皿。
const FALLBACK_MAX_ENTRY_BYTES = 8 * 1024 * 1024;

// 一覧に出す名前の上限。長い名前で格子が崩れるのを防ぐだけの歯止め。
const MAX_NAME_LENGTH = 80;

/** 1件あたりの上限バイト数。サーバーが受け付ける大きさに合わせる。 */
export function maxPoolEntryBytes() {
  return imageUploadMaxBytes() || FALLBACK_MAX_ENTRY_BYTES;
}

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'hash' });
        // 一覧は「新しく入れたものが手前」に並べる
        store.createIndex('addedAt', 'addedAt');
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

/** プールが使える環境か。使えなければ呼ぶ側はプールを飛ばして直に上げる。 */
export async function isImagePoolAvailable() {
  if (typeof indexedDB === 'undefined') return false;
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

/**
 * 保存済みの1件を、画面へ出してよい形へ均す。**読み出しは必ずここを通すこと。**
 * 壊れた行・古い版の行が混ざっていても一覧の描画が落ちないほうが大事なので、
 * 読めない行は捨てる（js/token-library.js の normalizeLibraryEntry と同じ立て付け）。
 *
 * @returns {{hash, blob, type, size, name, width, height, addedAt}|null}
 */
export function normalizePoolEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.hash !== 'string' || !/^[0-9a-f]{64}$/.test(raw.hash)) return null;
  if (!(raw.blob instanceof Blob)) return null;

  // 種類は入れるときに検分してあるが、読み出しでも見る。塞いだ後に入った古い行
  // （SVGなど）を、そのまま画面へ出さないため。
  const type = typeof raw.type === 'string' ? raw.type : raw.blob.type;
  if (!poolMimeAllowed(type)) return null;

  return {
    hash: raw.hash,
    blob: raw.blob,
    type,
    size: Number.isFinite(raw.size) ? raw.size : raw.blob.size,
    name: String(raw.name ?? '').slice(0, MAX_NAME_LENGTH) || '画像',
    width: Number.isFinite(raw.width) ? raw.width : 0,
    height: Number.isFinite(raw.height) ? raw.height : 0,
    addedAt: Number.isFinite(raw.addedAt) ? raw.addedAt : 0
  };
}

/**
 * プールの中身を、新しいものから順に返す。失敗しても投げず空配列を返す。
 * @returns {Promise<Array<{hash, blob, type, size, name, width, height, addedAt}>>}
 */
export async function listPool() {
  try {
    const db = await openDb();
    const rows = await wrap(tx(db, 'readonly').getAll());
    return rows.map(normalizePoolEntry).filter(Boolean)
      .sort((a, b) => b.addedAt - a.addedAt);
  } catch (error) {
    console.warn('[image-pool] 溜めてある画像を読めませんでした:', error?.message);
    return [];
  }
}

/** プールに溜まっている合計バイト数。 */
export async function poolTotalBytes() {
  const entries = await listPool();
  return entries.reduce((sum, entry) => sum + entry.size, 0);
}

/**
 * 画像を1枚プールへ入れる。
 *
 * 種類と大きさはここで断る。**プールに入れてから使うときに断られる**という食い違いを
 * 作らないため、判定はサーバーと同じ範囲に揃えてある（js/store/images.jsのpoolMimeAllowed、
 * server/index.jsのIMAGE_EXTENSIONSとMAX_IMAGE_BYTES）。今までクライアント側に大きさの
 * 事前検査が無く、8MB超は「理由の分からない通信エラー」として見えていた
 * （サーバーが応答後に接続を切るため。server/index.jsのrejectTooLarge）。
 *
 * @param {File|Blob} file
 * @param {{name?: string, width?: number, height?: number}} [meta]
 * @returns {Promise<{ok: true, entry: object} | {ok: false, reason: string}>}
 */
export async function addToPool(file, meta = {}) {
  if (!(file instanceof Blob)) return { ok: false, reason: '画像を読み取れませんでした' };

  const type = file.type;
  if (!poolMimeAllowed(type)) {
    return { ok: false, reason: 'PNG・JPEG・GIF・WebPの画像だけ使えます' };
  }

  const limit = maxPoolEntryBytes();
  if (file.size > limit) {
    return {
      ok: false,
      reason: `1枚あたり${Math.floor(limit / (1024 * 1024))}MBまでです（この画像は${(file.size / (1024 * 1024)).toFixed(1)}MB）`
    };
  }

  try {
    const hash = await hashBlob(file);
    const db = await openDb();

    // 既に同じ中身があるなら入れ直さない。名前と寸法だけ新しい方へ寄せる
    // （同じ絵を選び直したときに、一覧の表示が古い名前のままにならないように）。
    const existing = normalizePoolEntry(await wrap(tx(db, 'readonly').get(hash)));
    if (existing) {
      const entry = {
        ...existing,
        name: String(meta.name ?? existing.name).slice(0, MAX_NAME_LENGTH) || existing.name,
        addedAt: Date.now()
      };
      await wrap(tx(db, 'readwrite').put(entry));
      return { ok: true, entry };
    }

    // 合計の上限。追い出さないので、超えるなら断る
    const total = await poolTotalBytes();
    if (total + file.size > MAX_POOL_BYTES) {
      return {
        ok: false,
        reason: 'このブラウザに溜めておける合計を超えました。使わない画像を消してください'
      };
    }

    const entry = {
      hash,
      // Blobのまま入れる（データURLにすると4/3に膨らみ、読み書きの度に文字列を作る）
      blob: file,
      type,
      size: file.size,
      name: String(meta.name ?? file.name ?? '').slice(0, MAX_NAME_LENGTH) || '画像',
      // 寸法は入れるときに1回だけ測る。パネルと背景がサイズ自動反映に使うので、
      // ここで控えておくと使うときに画像を取り直さずに済む。
      width: Number.isFinite(meta.width) ? meta.width : 0,
      height: Number.isFinite(meta.height) ? meta.height : 0,
      addedAt: Date.now()
    };
    await wrap(tx(db, 'readwrite').put(entry));
    return { ok: true, entry };
  } catch (error) {
    // QuotaExceededError も private mode も同じ文言でまとめる。利用者にとっては
    // どちらも「このブラウザには置けない」で、次にできることが同じため。
    console.warn('[image-pool] 画像を溜められませんでした:', error?.message);
    return { ok: false, reason: 'このブラウザには画像を溜めておけませんでした' };
  }
}

/** 1件をプールから消す。上げ終わったとき、または利用者が消したとき。 */
export async function removeFromPool(hash) {
  try {
    const db = await openDb();
    await wrap(tx(db, 'readwrite').delete(hash));
    return true;
  } catch (error) {
    console.warn('[image-pool] 溜めてある画像を消せませんでした:', error?.message);
    return false;
  }
}

// --- この部屋へ上げ済みの記憶 ---
//
// 同じ中身の画像を2回上げるとR2に2つできる（キーがUUIDなので中身では突き合わせられない）。
// しかも消えない。なので「上げたことがある」を覚えて上げ直しを省く。
// 判定そのものは js/store/images.js の pickReusableCommit が持つ——記憶をそのまま
// 信じると、部屋を削除したあとに消えたオブジェクトを指して404になるため、
// 「今その部屋の状態に写っているURLだけを生きているとみなす」形にしてある。
//
// localStorageに置くのは、数十件×数百バイトで小さく、上げる直前に同期で読めるため。
// ただしオリジン全体で約5MBをパレットや合言葉と共用しているので件数で上限を持つ。
const COMMIT_MEMORY_PREFIX = 'mojulaX:imageCommits:';
const MAX_COMMIT_MEMORY = 200;

function commitMemoryKey(roomId) {
  return `${COMMIT_MEMORY_PREFIX}${roomId}`;
}

/**
 * この部屋で上げ済みの記憶を読む。{hash: {url, key}}。
 * @returns {Record<string, {url: string, key: string|null}>}
 */
export function readCommitMemory(roomId = currentRoomId()) {
  if (!roomId) return {};
  try {
    const raw = localStorage.getItem(commitMemoryKey(roomId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // 配列や文字列が入っていても素通しさせない（外から書ける値なので形を確かめる）
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // プロトタイプを持たない器へ移す。'__proto__'を鍵にした行で汚されないように
    return Object.assign(Object.create(null), parsed);
  } catch {
    return {};
  }
}

/**
 * この部屋で上げたことを覚える。古い行から捨てて件数を抑える。
 * keyも一緒に持つ（背景がURLとキーを対で扱うため。js/store/handlers/room.js）。
 */
export function rememberCommit(hash, { url, key = null }, roomId = currentRoomId()) {
  if (!roomId || typeof hash !== 'string' || typeof url !== 'string') return;

  // データURLへ退避した回は覚えない。覚える意味が無い（送っていないので省くものが無い）
  // うえに、実体そのものを文字列で抱えることになる——8MBの画像1枚で、オリジン全体で
  // 約5MBしかないlocalStorageを一撃で溢れさせ、チャットパレットや合言葉まで巻き込む。
  if (url.startsWith('data:')) return;

  try {
    const memory = readCommitMemory(roomId);
    // 挿入順が「古い順」になるよう、既にある鍵はいったん外して入れ直す
    delete memory[hash];
    memory[hash] = { url, key: typeof key === 'string' ? key : null };
    const entries = Object.entries(memory);
    const kept = entries.length > MAX_COMMIT_MEMORY
      ? entries.slice(entries.length - MAX_COMMIT_MEMORY)
      : entries;
    localStorage.setItem(commitMemoryKey(roomId), JSON.stringify(Object.fromEntries(kept)));
  } catch (error) {
    // 覚えられなくても上げ直せば動く。止める理由にはしない
    console.warn('[image-pool] 上げ済みの記憶を残せませんでした:', error?.message);
  }
}
