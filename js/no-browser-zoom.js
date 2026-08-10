// js/no-browser-zoom.js
// ブラウザ標準のページズームを止める。
//
// 盤面は自前でズーム・パンを持っている（Ctrl+ホイールと2本指ピンチ、
// js/board-data-driven.js）。そこへブラウザのページズームが重なると、盤面を拡大した
// つもりでUI全体が拡大されてしまう。
//
// 塞ぎ方は環境で分かれる：
//   PC・Android … CSSのtouch-action: pan-x pan-y（combined_layout.htmlのhtml/body）と
//                 Ctrl+ホイールの抑止でほぼ足りる。
//   iOS(WebKit) … iPhoneのChromeも中身はSafariと同じWebKit。viewport metaの
//                 user-scalable=no / maximum-scale は意図的に無視される仕様で、
//                 ダブルタップ拡大もtouch-actionだけでは残る。下のtouchendで塞ぐ。
//
// 止められないもの: キーボードのCtrl + "+" / "-" / "0"。Chrome・Firefoxでは
// ページ側からキャンセルできない。

// 2回目のタップがこの時間・距離に収まっていたら「ダブルタップ」とみなす。
// iOSの判定（約300ms）より少しだけ広く取る。
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 30;

// 押せるものの上での連打は、拡大ではなく本当の連打として扱いたい
// （チャットパレットの行を続けて押す、送信ボタンを2回押す等）。
// touchendのpreventDefaultはclickの発火まで止めてしまうため、ここは避ける。
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, label, [role="button"], [contenteditable]';

// 押せるものの上か。<button>等に加えて、cursor:pointerを付けたdiv
// （チャットパレットの行・ラウンド進行の手番行など）も押せるものとして扱う。
// コマと盤面はcursor:grabなので、ここには引っかからない＝拡大を止める対象に残る。
function isInteractive(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE_SELECTOR)) return true;

  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (getComputedStyle(el).cursor === 'pointer') return true;
  }
  return false;
}

// ページが既に拡大されているか。iOSでダブルタップ以外の経路（アクセシビリティ設定など）で
// 拡大されたときに、ピンチで戻る道まで塞いでしまわないための判定。
function isPageZoomed() {
  const scale = window.visualViewport?.scale;
  return typeof scale === 'number' && scale > 1.01;
}

export function initNoBrowserZoom() {
  // Ctrl+ホイール（PCのページズーム）と、トラックパッドのピンチ。
  // 盤面自身のCtrl+ホイールズームは#board-viewportで先に処理されるので影響しない
  // （こちらはブラウザの既定動作を打ち消すだけ）。
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });

  // Safari独自のピンチ（macOSのトラックパッド／iOS）。
  // ただし既に拡大されている間は通す。ここを常に塞ぐと、何かの拍子に拡大されたとき
  // 縮小する手段が無くなり「拡大したまま戻せない」状態に閉じ込めてしまう。
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => {
      if (!isPageZoomed()) event.preventDefault();
    });
  }

  // iOS(WebKit)のダブルタップ拡大。touch-actionでは残るので、2回目のタップの
  // 既定動作を直接止める。押せるもの以外（盤面・コマ・パネル・ログの地の部分）だけが対象。
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  document.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const now = Date.now();
    const isDoubleTap = now - lastTapTime <= DOUBLE_TAP_MS
      && Math.abs(touch.clientX - lastTapX) <= DOUBLE_TAP_PX
      && Math.abs(touch.clientY - lastTapY) <= DOUBLE_TAP_PX;

    lastTapTime = now;
    lastTapX = touch.clientX;
    lastTapY = touch.clientY;

    if (!isDoubleTap) return;
    if (isInteractive(event.target)) return;

    event.preventDefault();
    // 3回目を「2回目」と数えないよう、成立した時点で連続の記録を切る
    lastTapTime = 0;
  }, { passive: false });
}
