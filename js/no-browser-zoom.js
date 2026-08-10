// js/no-browser-zoom.js
// ブラウザ標準のズームを止める。
//
// 盤面は自前でズーム・パンを持っている（Ctrl+ホイールと2本指ピンチ、
// js/board-data-driven.js）。そこへブラウザのページズームが重なると、盤面を拡大した
// つもりでUI全体が拡大され、元に戻す手段も分かりにくい。盤面の外で誤爆したときも同じ。
//
// CSS側（combined_layout.htmlのhtml/bodyのtouch-action: pan-x pan-y）と
// viewport metaのmaximum-scale=1.0で大半は塞がるが、この2つだけはJSでしか止まらない。
//
// 止められないもの: キーボードのCtrl + "+" / "-" / "0"。Chrome・Firefoxでは
// ページ側からキャンセルできない。

export function initNoBrowserZoom() {
  // Ctrl+ホイール（PCのページズーム）と、トラックパッドのピンチ。
  // 盤面自身のCtrl+ホイールズームは#board-viewportで先に処理されるので影響しない
  // （こちらはブラウザの既定動作を打ち消すだけ）。
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });

  // Safari独自のピンチ（macOSのトラックパッド／iOS）。
  // iOS Safariはviewport metaのuser-scalable=noを無視するので、実質ここが歯止めになる。
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault());
  }
}
