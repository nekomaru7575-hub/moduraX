// js/asset-base.js
// 「このアプリが画面に出す絵のうち、リポジトリに置いていないもの」の置き場所を1か所で持つ。
//
// 【なぜ要るか】
// スタンプやトランプの絵には、フリー素材やファンキットのように「自分のサイトで使うのは
// よいが、素材として再配布するのは駄目」というものがある。リポジトリに入れてしまうと、
// git clone した人全員へ配ることになり、それは使用ではなく再配布にあたる。
// そこでリポジトリからは外し、配信だけ外部の置き場（R2など）から行う。
//
// 【未設定なら「無い」ものとして扱う】
// 置き場が設定されていない環境——手元の検証、フォークした人——では、これらの絵は
// 最初から存在しないものとして扱う。壊れた画像を出すのではなく、
//   スタンプ … 一覧に出さない（js/stamp-registry.js）
//   カード   … 文字で描く（js/board-data-driven.js の applyCardAppearance）
// どちらも既にその道がある。**素材の利用許諾を持たない人の環境に出ないのは、
// 不具合ではなく正しい挙動。**
//
// 【URLは受け取った側が組み立てる】
// js/stamp-registry.js・js/card-catalog.js と同じ約束で、呼ぶ側にURL文字列を書かせない。
// ここが受け取るのはベースURLだけで、その先の階層は各所が組み立てる。
//
// 【設定の届き方】
// サーバーが環境変数 ASSET_BASE_URL を GET /api/config で返し、盤面の起動時（js/main.js）に
// setAssetBaseUrl() で入れる。サーバー側はこのモジュールを使わない
// （スタンプの検算はIDだけで、URLを組み立てないため）。

let baseUrl = null;

// 置き場所が変わった回数。組み立てた結果を溜め込んでいる側（js/stamp-registry.js）が、
// 溜めた中身を捨てる判断に使う。ここがスタンプやカードの存在を知らずに済むよう、
// 「変わった」という事実だけを版として渡す。
let version = 0;

/**
 * 置き場所を設定する。盤面の起動時に一度だけ呼ぶ。
 * 末尾のスラッシュは付いていても付いていなくてもよい（ここで均す）。
 * @param {string|null|undefined} url
 */
export function setAssetBaseUrl(url) {
  const text = String(url ?? '').trim();
  const next = text ? text.replace(/\/+$/, '') : null;
  if (next === baseUrl) return;
  baseUrl = next;
  version += 1;
}

/**
 * 置き場所が今までに何回変わったか。
 * 組み立てた結果をキャッシュする側は、この値をキーに混ぜておけば
 * 設定が届く前に作った古い結果を掴み続けずに済む。
 * @returns {number}
 */
export function assetBaseVersion() {
  return version;
}

/** 置き場所が設定されているか。 */
export function hasAssetBaseUrl() {
  return baseUrl !== null;
}

/**
 * 外部に置いた絵のURLを組み立てる。
 * 置き場所が未設定なら null を返す。呼ぶ側は「その絵は無い」として扱うこと
 * （空文字やダミーのURLを返さないのは、img src に入って404を出すのを避けるため）。
 * @param {string} relativePath 例 'trump/card_back.png'、'stamps/STELLA_KNIGHTS/bouquet.png'
 * @returns {string|null}
 */
export function assetUrl(relativePath) {
  if (baseUrl === null) return null;
  const path = String(relativePath ?? '').replace(/^\/+/, '');
  if (!path || path.includes('..')) return null;
  return `${baseUrl}/${path}`;
}
