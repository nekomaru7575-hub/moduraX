// sw.js
// もじゅらXのService Worker。ルート直下に置いてあるのは、Service Workerが「自分の置き場所
// より下」しか制御できないため（/以下すべてを見せたいのでルートに置くしかない）。
//
// --- なぜ「最小」なのか ---
// このSWはHTML・JS・CSSを一切キャッシュしない。素通しである。
// このアプリのファイル名にはハッシュが付いていない（/js/main.js のような固定名）ので、
// app shellをキャッシュすると、デプロイした後もその人だけ古いJSで動き続け、サーバーとの
// 同期プロトコルがずれる。「一部の人だけ挙動が違う」は最も追いにくい壊れ方なので、
// 速さより確実さを取る。オフラインでは遊べない（WebSocket前提の）アプリなので、
// app shellをキャッシュしても見返りがほとんど無い、という事情もある。
//
// 引き受けているのは4つだけ:
//   1. インストール可能にする（Chromeはfetchハンドラを持つSWの登録を要求する）
//   2. /vendor/ のファイル（3Dダイスのテクスチャ・効果音。中身が変わるときは
//      ファイル名も変わる運用）を、使われた時点でキャッシュへ入れて2回目以降を軽くする
//   3. 通信が死んでいるときのページ遷移に offline.html を返す
//   4. /asset/<hash> に、このブラウザが持っている画像・音源の実体を返す（P2P卓）
//
// --- 4だけは性格が違う ---
// 1〜3はキャッシュ（無くても動く）だが、4は**サーバーに存在しないURLを成立させている**。
// P2P卓では実体がどこのサーバーにも無く、各自のブラウザ（IndexedDB。js/asset-store.js）
// にしか無いため。ここで肩代わりすることで、状態には普通のURLだけを載せられ、
// 表示側（img.src・url()・new Audio()）を1行も直さずに済んでいる。
// SWが居ない環境ではこのURLは404になる——P2P卓の絵が出ないだけで、他は今までどおり。
//
// --- 更新のしかた ---
// CACHE_VERSION を上げると、古いキャッシュはactivateで捨てられる。
// SWそのものが悪さをしたときの逃げ道は、このファイルの中身を
//   self.addEventListener('install', () => self.skipWaiting());
//   self.addEventListener('activate', (e) => e.waitUntil(
//     self.registration.unregister().then(() => caches.keys())
//       .then(keys => Promise.all(keys.map(k => caches.delete(k))))));
// だけに差し替えてデプロイすること（全員のSWが自分を消してキャッシュも捨てる）。

const CACHE_VERSION = 'v2';
const PRECACHE = `mojura-precache-${CACHE_VERSION}`;
const VENDOR_CACHE = `mojura-vendor-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([PRECACHE, VENDOR_CACHE]);

// installで確実に取れるだけの小さなものに限る。cache.addAllは1つでも失敗すると
// install全体が失敗するので、ここに重いもの・数の多いものを並べてはいけない。
const PRECACHE_URLS = [
  '/offline.html',
  // offline.html の見た目。オフラインで出すページなので、本体と一緒に先読みしておく
  // （中身を変えたら上の CACHE_VERSION を上げること。上げないと、オフラインのときだけ
  //   古いスタイルが出続ける）。
  '/css/offline.css',
  '/image/icon-192.png',
  '/image/icon-512.png',
  '/image/icon-maskable-512.png',
  '/image/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // 待機せずすぐ次の版へ交代する。コードをキャッシュしていないので、
      // 途中で交代しても「古いJSと新しいSW」の食い違いは起きない。
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('mojura-') && !CURRENT_CACHES.has(key))
          .map((key) => caches.delete(key))
      ))
      // 開いているタブを、リロードを待たずにこのSWの管理下へ入れる
      .then(() => self.clients.claim())
  );
});

// --- P2P卓の実体置き場（js/asset-store.js と同じIndexedDBを読む） ---
//
// 【なぜ写しになっているか】asset-store.js はESモジュールで、このSWはクラシック
// ワーカーとして登録している（js/pwa.js）。importできないので、**読み出しに要る最小限
// だけ**をこちらにも書いてある。写しなのはこの3つの名前と、レコードの形（blob/type）だけ。
// 変えるときは必ず両方を直すこと——片方だけ直すと、P2P卓の絵が黙って出なくなる。
const ASSET_DB_NAME = 'mojulaX-assets';
const ASSET_DB_VERSION = 1;
const ASSET_STORE = 'blobs';

const ASSET_PATH_PATTERN = /^\/asset\/([0-9a-f]{64})$/;

// まだ届いていない実体をどれだけ待つか。ページ側は状態を受け取った時点で足りないものを
// ホストへ取りに行っている（js/net-sync.js）ので、ここでの待ちは「その到着待ち」。
// 待たずに404を返すと、割れた画像が出てから直るまで再描画を待つことになる。
const ASSET_WAIT_MS = 15000;
const ASSET_POLL_MS = 150;

function openAssetDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB_NAME, ASSET_DB_VERSION);
    // ページ側がまだ一度も作っていない場合に備える。作りだけ揃えておけば、
    // 後からページが同じ版で開いてもupgradeが走らない。
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const store = db.createObjectStore(ASSET_STORE, { keyPath: 'hash' });
        store.createIndex('usedAt', 'usedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAssetOnce(db, hash) {
  return new Promise((resolve) => {
    let request;
    try {
      request = db.transaction(ASSET_STORE, 'readonly').objectStore(ASSET_STORE).get(hash);
    } catch {
      resolve(null);
      return;
    }
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function readAsset(hash) {
  let db;
  try {
    db = await openAssetDb();
  } catch {
    return null;
  }

  const deadline = Date.now() + ASSET_WAIT_MS;
  for (;;) {
    const record = await readAssetOnce(db, hash);
    if (record) return record;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, ASSET_POLL_MS));
  }
}

// 音源のシーク（<audio>）はRangeで飛んでくる。全部返しても再生はできるが、
// シークがずれる実装があるので、頼まれた範囲だけを切って206で返す。
function rangeResponse(record, rangeHeader) {
  const size = record.blob.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const hasStart = match[1] !== '';
  const hasEnd = match[2] !== '';
  if (!hasStart && !hasEnd) return null;

  // `bytes=-500` は「末尾500バイト」の意味
  let start = hasStart ? Number(match[1]) : size - Number(match[2]);
  let end = hasStart ? (hasEnd ? Number(match[2]) : size - 1) : size - 1;
  start = Math.max(0, Math.min(start, size));
  end = Math.max(start, Math.min(end, size - 1));

  return new Response(record.blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': record.type || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    }
  });
}

async function respondWithAsset(request, hash) {
  const record = await readAsset(hash);
  if (!record) {
    // 届かなかった。持っている人が誰も居ないか、ホストと繋がっていない。
    return new Response('asset not available', { status: 404 });
  }

  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    const partial = rangeResponse(record, rangeHeader);
    if (partial) return partial;
  }

  return new Response(record.blob, {
    status: 200,
    headers: {
      'Content-Type': record.type || 'application/octet-stream',
      'Content-Length': String(record.blob.size),
      'Accept-Ranges': 'bytes',
      // 中身で名前が決まっているので内容は変わらないが、HTTPキャッシュへ載せる意味も無い
      // （実体はIndexedDBに在る）。二重に持たない。
      'Cache-Control': 'no-store'
    }
  });
}

// このリクエストにSWが口を出すか。出さないものはrespondWithを呼ばず、
// ブラウザの通常の経路（＝HTTPキャッシュとサーバー）にそのまま流す。
function shouldIgnore(request, url) {
  // 書き込み系（POST/PUT）は絶対に触らない
  if (request.method !== 'GET') return true;
  // 外部オリジン（R2の画像・音源、BCDiceのAPI）はキャッシュも肩代わりもしない
  if (url.origin !== self.location.origin) return true;
  // 部屋の状態を返すAPIは、古い応答を返したら壊れる
  if (url.pathname.startsWith('/api/')) return true;
  // 部分取得（<audio>のシーク等）。206をcache.putに渡すと例外になるので手を出さない
  if (request.headers.has('range')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // --- P2P卓の実体: このブラウザのIndexedDBから返す ---
  // shouldIgnoreより前に見る。あちらはRangeが付いた要求を素通しにするが、
  // このURLはサーバーに存在しないので素通しにすると404になる（音源のシークが死ぬ）。
  if (request.method === 'GET' && url.origin === self.location.origin) {
    const assetMatch = ASSET_PATH_PATTERN.exec(url.pathname);
    if (assetMatch) {
      event.respondWith(respondWithAsset(request, assetMatch[1]));
      return;
    }
  }

  if (shouldIgnore(request, url)) return;

  // --- ページ遷移: ネットワーク優先。落ちているときだけ offline.html ---
  if (request.mode === 'navigate') {
    event.respondWith(
      // 404や500はそのまま見せる（サーバーは生きているのだから、オフライン画面は嘘になる）。
      // catchに入るのは本当に通信が成立しなかったときだけ。
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // --- /vendor/ : キャッシュ優先 ---
  // 中身が変わるときはファイル名も変わる前提なので、一度取れたものを疑う必要が無い。
  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          // 200以外（206・404・opaque）は入れない
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(VENDOR_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- precacheしたアイコン: あればそれを使う ---
  // 無ければ素通し（respondWithの中でfetchへ戻す）。
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request))
    );
    return;
  }

  // それ以外（HTML・JS・CSS・background/・APIでない画像）は何もしない＝常にサーバーへ
});
