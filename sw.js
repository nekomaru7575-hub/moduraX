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
// 引き受けているのは3つだけ:
//   1. インストール可能にする（Chromeはfetchハンドラを持つSWの登録を要求する）
//   2. /vendor/ のファイル（3Dダイスのテクスチャ・効果音。中身が変わるときは
//      ファイル名も変わる運用）を、使われた時点でキャッシュへ入れて2回目以降を軽くする
//   3. 通信が死んでいるときのページ遷移に offline.html を返す
//
// --- 更新のしかた ---
// CACHE_VERSION を上げると、古いキャッシュはactivateで捨てられる。
// SWそのものが悪さをしたときの逃げ道は、このファイルの中身を
//   self.addEventListener('install', () => self.skipWaiting());
//   self.addEventListener('activate', (e) => e.waitUntil(
//     self.registration.unregister().then(() => caches.keys())
//       .then(keys => Promise.all(keys.map(k => caches.delete(k))))));
// だけに差し替えてデプロイすること（全員のSWが自分を消してキャッシュも捨てる）。

const CACHE_VERSION = 'v1';
const PRECACHE = `mojura-precache-${CACHE_VERSION}`;
const VENDOR_CACHE = `mojura-vendor-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([PRECACHE, VENDOR_CACHE]);

// installで確実に取れるだけの小さなものに限る。cache.addAllは1つでも失敗すると
// install全体が失敗するので、ここに重いもの・数の多いものを並べてはいけない。
const PRECACHE_URLS = [
  '/offline.html',
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
