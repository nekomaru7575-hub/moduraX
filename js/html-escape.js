// js/html-escape.js
// 文字列をHTMLへ埋め込む前の始末。チャットの発言・キャラ名・パラメータ名など、
// 中身を他人が決められる値をinnerHTMLの組み立てに使うときは必ずここを通す。
//
// 以前は main.js・log-export.js・game-store.js がそれぞれ自前のエスケープを持っていて、
// 対象の文字も配置も少しずつ違っていた。取りこぼす場所が生まれるので1か所にまとめてある。

/**
 * HTMLの本文にも属性値にも安全に置ける形へ直す。
 * 引用符まで含めて直すのは、style="color: …" のような属性の中へ入れる用途があるため
 * （引用符を残すと、そこで属性を閉じて別の属性を足せてしまう）。
 * @param {*} text 埋め込みたい値
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// CSSの色として認めるもの。カラーピッカーが出す #rrggbb と、コード側が書く色名・
// rgb()・rgba() を通す。エスケープだけではCSSの文脈を守れない
// （引用符を使わずに url(...) や式を書けてしまう）ため、形そのもので絞る。
const SAFE_CSS_COLOR = /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i;

/**
 * style属性へ入れてよい色だけを通す。認められない値は代わりの色を返す。
 * @param {*} color 利用者が決めた色
 * @param {string} fallback 認められなかったときに使う色
 * @returns {string}
 */
export function safeCssColor(color, fallback) {
  return (typeof color === 'string' && SAFE_CSS_COLOR.test(color.trim())) ? color.trim() : fallback;
}
