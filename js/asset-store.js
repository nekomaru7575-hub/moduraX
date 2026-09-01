// js/asset-store.js
// P2P卓で使う、画像・音源の実体の置き場。**このブラウザの中だけ**にある。
//
// 【なぜ要るか】従来卓では実体をR2に置き、状態にはURLだけを載せている（server/r2.js）。
// R2の署名にはアクセスキーが要り、鍵をブラウザへ置けばそのまま流出＝課金事故なので、
// P2P化してもそこだけはサーバーに残るはずだった。実体を各自のブラウザへ移せば、
// **R2そのものを通らずに済む**——それがこのモジュール。
//
// 【内容で名前を付ける】ファイルの中身のSHA-256をそのまま名前にする。おかげで
//   ・同じ絵を何人が何度上げても1つ（コマの使い回しがそのまま効く）
//   ・名前が中身を保証する（誰かが偽の中身を配っても、名前が合わなければ弾ける）
//   ・誰が持っているかを名前だけで問い合わせられる
// 参照の形は `/asset/<hash>`。**普通のURLに見えることが肝心**で、これなら
// `img.src` にも `url()` にも `new Audio()` にもそのまま入る——表示側を1行も直さずに済む。
// 実際にそのURLへ応答するのはService Worker（sw.js）で、ここのIndexedDBを読む。
//
// 【消える条件をはっきりさせておく】これはキャッシュではなく唯一の置き場なので、
// **持っている人が誰も居なくなった絵は戻らない。** ホストは自分が権威なので必ず全部を
// 持ち、参加者は自分が見たものだけを持つ。部屋を残したいならファイルへ書き出すこと
// （js/main.jsのexportStateToFile）。
//
// DOMには触れない（Service Workerからも同じ読み方をするため）。

const DB_NAME = 'mojulaX-assets';
const DB_VERSION = 1;
const STORE = 'blobs';

// 参照の形。ハッシュは64桁の16進で、それ以外は受け付けない——ここが緩いと、
// 状態に書かれた任意の文字列をそのままIndexedDBの鍵として引くことになる。
const ASSET_REF_PATTERN = /^\/asset\/([0-9a-f]{64})$/;
export const ASSET_PATH_PREFIX = '/asset/';

// 1件あたりの上限。サーバーのMAX_IMAGE_BYTES（既定8MB）/ MAX_AUDIO_BYTES（既定20MB）に
// 合わせてある。ここを超えるものは、DataChannelで配る時間も置き場も現実的でない。
export const MAX_ASSET_BYTES = 20 * 1024 * 1024;

// この置き場全体の目安。超えたら古いものから捨てる。IndexedDBの割り当ては
// ブラウザ任せで、いっぱいになると**書き込みが例外で落ちる**——落ちる場所が
// 「絵を1枚追加したとき」なので、先に自分で片付けておく。
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'hash' });
        // 古いものから捨てるための索引（下のevictIfNeeded）
        store.createIndex('usedAt', 'usedAt');
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

/**
 * 中身から名前を作る。
 * @param {Blob} blob
 * @returns {Promise<string>} SHA-256の16進64桁
 */
export async function hashBlob(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 状態に書ける参照の形にする。
 * @param {string} hash
 * @returns {string} `/asset/<hash>`
 */
export function assetRef(hash) {
  return ASSET_PATH_PREFIX + hash;
}

/**
 * 参照からハッシュを取り出す。参照でなければnull（外部URL・データURLはここで落ちる）。
 * @param {unknown} value
 * @returns {string|null}
 */
export function assetRefHash(value) {
  if (typeof value !== 'string') return null;
  const match = ASSET_REF_PATTERN.exec(value);
  return match ? match[1] : null;
}

/**
 * 実体をしまう。既に同じ中身があれば何もしない（内容で名前を付けている恩恵）。
 * @param {Blob} blob
 * @param {string} [knownHash] 計算済みのハッシュ。渡すと計算し直さない
 * @returns {Promise<string>} ハッシュ
 */
export async function putAsset(blob, knownHash) {
  if (blob.size > MAX_ASSET_BYTES) {
    throw new Error(`ファイルが大きすぎます（上限 ${Math.floor(MAX_ASSET_BYTES / 1024 / 1024)}MB）`);
  }
  const hash = knownHash || await hashBlob(blob);
  const db = await openDb();

  const existing = await wrap(tx(db, 'readonly').get(hash));
  if (existing) {
    await touchAsset(hash);
    return hash;
  }

  await wrap(tx(db, 'readwrite').put({
    hash,
    blob,
    type: blob.type || 'application/octet-stream',
    size: blob.size,
    usedAt: Date.now()
  }));
  await evictIfNeeded();
  return hash;
}

/**
 * 実体を取り出す。持っていなければnull。
 * @param {string} hash
 * @returns {Promise<{blob: Blob, type: string}|null>}
 */
export async function getAsset(hash) {
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  const db = await openDb();
  const record = await wrap(tx(db, 'readonly').get(hash));
  if (!record) return null;
  // 読まれたものは新しいものとして扱う（下のevictIfNeededが古い順に捨てるため）。
  // 待たない：取り出しを遅らせてまで順番を正確にする価値は無い。
  touchAsset(hash).catch(() => {});
  return { blob: record.blob, type: record.type };
}

/** 持っているか。中身は読まない。 */
export async function hasAsset(hash) {
  if (!/^[0-9a-f]{64}$/.test(hash)) return false;
  const db = await openDb();
  const key = await wrap(tx(db, 'readonly').getKey(hash));
  return key !== undefined;
}

async function touchAsset(hash) {
  const db = await openDb();
  const store = tx(db, 'readwrite');
  const record = await wrap(store.get(hash));
  if (!record) return;
  record.usedAt = Date.now();
  await wrap(store.put(record));
}

// 全体が目安を超えていたら、使われていない順に捨てる。
// **ホストのタブでこれが効くと部屋の絵が消える**ので、目安は十分大きく取ってある。
async function evictIfNeeded() {
  const db = await openDb();
  const all = await wrap(tx(db, 'readonly').getAll());
  let total = all.reduce((sum, record) => sum + (record.size || 0), 0);
  if (total <= MAX_TOTAL_BYTES) return;

  all.sort((a, b) => (a.usedAt || 0) - (b.usedAt || 0));
  const store = tx(db, 'readwrite');
  for (const record of all) {
    if (total <= MAX_TOTAL_BYTES) break;
    await wrap(store.delete(record.hash));
    total -= record.size || 0;
    console.warn(`[asset-store] 置き場がいっぱいなので古い実体を捨てました (${record.hash.slice(0, 8)}…)`);
  }
}

/**
 * 状態の中に出てくる参照を全部集める。
 *
 * 状態の形を知らずに全体を歩く。画像の置き場所はコマ・パネル・背景・シーン・カード・
 * デッキ定義・音源…と増え続けていて、場所を数え上げる作りにすると**足した人が
 * ここを直し忘れる**（そのときだけ絵が配られない、という気づきにくい壊れ方になる）。
 *
 * @param {object} state
 * @returns {Set<string>} ハッシュの集合
 */
export function collectAssetHashes(state) {
  const found = new Set();
  const seen = new WeakSet();

  const walk = (value) => {
    if (typeof value === 'string') {
      const hash = assetRefHash(value);
      if (hash) found.add(hash);
      return;
    }
    if (!value || typeof value !== 'object') return;
    // 循環参照で止まらないように（状態は木のはずだが、そこに寄りかからない）
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.values(value).forEach(walk);
  };

  walk(state);
  return found;
}

/**
 * 状態が使っている参照のうち、まだ持っていないものを返す。
 * @param {object} state
 * @returns {Promise<string[]>}
 */
export async function listMissingAssetHashes(state) {
  const hashes = [...collectAssetHashes(state)];
  const missing = [];
  for (const hash of hashes) {
    if (!await hasAsset(hash)) missing.push(hash);
  }
  return missing;
}

/**
 * 状態に出てくる参照を、持っている実体のデータURLへ置き換えて自己完結にする。
 *
 * ファイルへの書き出しで使う（js/main.jsのexportStateToFile）。従来卓ではサーバーが
 * R2から読んで埋め込むが（server/index.jsのembedStateImages）、P2P卓では実体が
 * このブラウザにしか無いので、こちらで同じことをする。**これが無いと、書き出した
 * ファイルから絵が二度と戻らない**——「部屋を保存し削除」がまさにその場面。
 *
 * 合計の上限を超えたぶんは参照のまま残す（巨大なファイルを書き出せなくするより、
 * 戻せるものだけでも戻せる方がよい。サーバー側と同じ判断）。
 *
 * @param {object} state
 * @param {number} limitBytes 埋め込んでよい合計の目安
 * @returns {Promise<{state: object, embedded: number, skipped: number}>}
 */
export async function embedAssetsInState(state, limitBytes) {
  const hashes = [...collectAssetHashes(state)];
  const dataUrls = new Map();
  let used = 0;
  let skipped = 0;

  for (const hash of hashes) {
    const asset = await getAsset(hash);
    if (!asset) { skipped += 1; continue; }
    // データURLはbase64で約4/3になる。読む前に見積もって、超えるものは読まない
    const estimated = Math.ceil(asset.blob.size * 4 / 3);
    if (used + estimated > limitBytes) { skipped += 1; continue; }
    const dataUrl = await assetAsDataUrl(hash);
    if (!dataUrl) { skipped += 1; continue; }
    dataUrls.set(hash, dataUrl);
    used += dataUrl.length;
  }

  return {
    state: replaceAssetRefs(state, (hash, ref) => dataUrls.get(hash) ?? ref),
    embedded: dataUrls.size,
    skipped
  };
}

/**
 * 状態の中の参照を差し替えた、新しい状態を作る。元の状態は書き換えない
 * （storeの状態は凍結されているので、そもそも書き換えられない）。
 *
 * @param {*} value
 * @param {(hash: string, ref: string) => string} map
 * @returns {*}
 */
export function replaceAssetRefs(value, map) {
  if (typeof value === 'string') {
    const hash = assetRefHash(value);
    return hash ? map(hash, value) : value;
  }
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => replaceAssetRefs(item, map));

  const next = {};
  for (const [key, item] of Object.entries(value)) next[key] = replaceAssetRefs(item, map);
  return next;
}

/**
 * 実体をデータURLにする。ファイルへの書き出し（自己完結にする）で使う。
 * @param {string} hash
 * @returns {Promise<string|null>}
 */
export async function assetAsDataUrl(hash) {
  const asset = await getAsset(hash);
  if (!asset) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(asset.blob);
  });
}

// --- DataChannelで運ぶための詰め替え ---
// 運ぶ道（js/net-chunk.js）はJSONの文字列しか扱わない。バイナリのまま流す口を別に開くと
// 分割・詰まり待ち・組み直しをもう一組作ることになるので、base64にして同じ道へ乗せる。
// 3割ふくらむが、絵や音は一度運べば各自のブラウザに残る（毎回は流れない）。

/**
 * 実体をbase64にする。
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // 一度に渡すとスタックを使い切る（引数の数に上限がある）ので、小分けにして繋ぐ
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

/**
 * base64を実体に戻す。壊れていればnull。
 * @param {string} base64
 * @param {string} type
 * @returns {Blob|null}
 */
export function base64ToBlob(base64, type) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: type || 'application/octet-stream' });
  } catch {
    return null;
  }
}

/**
 * 受け取った実体を、名乗られたハッシュと突き合わせてからしまう。
 *
 * **中身を検算してからしまうこと。** 名前が中身のハッシュであることがこの仕組みの土台で、
 * 検算しないと「この絵は<hash>です」と言い張るだけで他人の画面に好きな画像を出せる
 * ——スタンプでURLではなくIDだけを受け取っているのと同じ理由（js/stamp-catalog.js冒頭）。
 *
 * @param {string} hash 名乗られたハッシュ
 * @param {Blob} blob
 * @returns {Promise<boolean>} しまえたか
 */
export async function putVerifiedAsset(hash, blob) {
  if (!/^[0-9a-f]{64}$/.test(hash)) return false;
  if (blob.size > MAX_ASSET_BYTES) return false;
  const actual = await hashBlob(blob);
  if (actual !== hash) {
    console.warn(`[asset-store] 中身が名前と合わないので捨てました (${hash.slice(0, 8)}…)`);
    return false;
  }
  await putAsset(blob, hash);
  return true;
}

/**
 * データURLを実体（Blob）にする。データURLでなければnull。
 *
 * **fetch()を使ってはいけない。** 手軽だが、このアプリのCSPは
 * `connect-src 'self' https://bcdice.onlinesession.app` なので data: への接続は拒否される
 * （img-srcには data: が入っているので「表示はできるのに読み取れない」）。しかも例外は
 * 呼び出し側のcatchに吸われて元の値が返るだけなので、**黙って何も起きない**形で失敗する。
 * ここで自前で解くのは、CSPを広げずに済ませるため。
 *
 * @param {string} dataUrl
 * @returns {Blob|null}
 */
export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;

  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  const isBase64 = /;base64$/i.test(meta);
  const type = (isBase64 ? meta.slice(0, -7) : meta).split(';')[0] || 'application/octet-stream';

  if (isBase64) return base64ToBlob(payload, type);
  try {
    // base64でないデータURL（SVGなど）はパーセントエンコード
    return new Blob([decodeURIComponent(payload)], { type });
  } catch {
    return null;
  }
}

/**
 * 状態に埋まっているデータURLを、この置き場の実体へ移し替える。
 *
 * サーバーの `adoptStateMedia`（取り込んだ画像をR2へ移す）に当たるもののP2P卓版。
 * 取り込んだファイルには、この機能より前に書き出されたデータURLの画像が混ざっている。
 * 放っておくと**部屋の状態そのものが数MBになる**——それは全参加者へ配られ、控えとして
 * Redisへも送られる（js/host-persistence.js）ので、P2P化で減らしたかったものが
 * そっくり戻ってくる。参照へ移せば状態は数十バイトに戻り、実体は各自のブラウザに残る。
 *
 * **引き換え**：移した実体は、持っている人が誰も居なくなれば戻らない（データURLのままなら
 * 部屋データと一緒に残っていた）。これはこの置き場の設計そのもので、ここだけの例外は作らない。
 *
 * 外部URLと既に参照のものは触らない。移せなかったものは元のまま残す。
 *
 * @param {object} state
 * @returns {Promise<{state: object, adopted: number}>}
 */
export async function adoptDataUrlsInState(state) {
  // 同じデータURLが何度も出てくる（コマを複製した場合など）。1回だけ読む。
  const seen = new Map();
  const collect = (value) => {
    if (typeof value === 'string') {
      if (value.startsWith('data:') && !seen.has(value)) seen.set(value, null);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(collect); return; }
    Object.values(value).forEach(collect);
  };
  collect(state);
  if (seen.size === 0) return { state, adopted: 0 };

  let adopted = 0;
  for (const dataUrl of [...seen.keys()]) {
    const ref = await adoptDataUrl(dataUrl);
    if (typeof ref === 'string' && ref !== dataUrl) {
      seen.set(dataUrl, ref);
      adopted += 1;
    }
  }
  if (adopted === 0) return { state, adopted: 0 };

  const swap = (value) => {
    if (typeof value === 'string') return seen.get(value) || value;
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(swap);
    const next = {};
    for (const [key, item] of Object.entries(value)) next[key] = swap(item);
    return next;
  };

  return { state: swap(state), adopted };
}

/**
 * データURLを実体としてしまい、参照を返す。取り込んだファイルの引き取りで使う。
 * データURLでなければ、その値をそのまま返す（外部URL・既に参照のものは触らない）。
 * @param {unknown} value
 * @returns {Promise<unknown>}
 */
export async function adoptDataUrl(value) {
  const blob = dataUrlToBlob(value);
  if (!blob) return value;
  if (blob.size > MAX_ASSET_BYTES) return value;
  try {
    return assetRef(await putAsset(blob));
  } catch (error) {
    console.warn('[asset-store] データURLを引き取れませんでした:', error.message);
    return value;
  }
}
