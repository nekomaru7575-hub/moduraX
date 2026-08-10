// js/drag-gesture.js
// ドラッグと長押しの共通ヘルパー。
//
// これまで盤面（コマ・パネル・視点移動）とログ欄のリサイズは、どれも
// 「mousedownでdocumentにmousemove/mouseupを貼り、mouseupで剥がす」という同じ形を
// それぞれ書いていた。マウス専用なのでタッチでは一切動かない。
// ここに1つにまとめ、Pointer Eventsで書き直すことでタッチ・ペンでも同じ操作ができる。
//
// あわせて長押し（タッチ・ペンのみ）も見る。タッチには右クリックが無いので、
// 右クリックメニューへ到達する唯一の手段が長押しになるため。

const LONG_PRESS_MS = 500;

// 長押し判定中に指がこれ以上動いたらドラッグとみなし、長押しは取り消す。
// 指はマウスより必ずぶれるので、マウス基準より広めに取る。
const LONG_PRESS_TOLERANCE_PX = 10;

/**
 * @param {HTMLElement} element
 * @param {{
 *   onStart?: (event: PointerEvent) => any,
 *     ドラッグを始めてよければ任意の値（＝以降のコールバックへ渡す文脈）を返す。
 *     falseまたはnull/undefinedを返すとドラッグを始めない（長押しも見ない）。
 *   onMove?: (event: PointerEvent, context: any) => void,
 *   onEnd?: (event: PointerEvent, context: any) => void,
 *   onLongPress?: (event: PointerEvent, context: any) => void,
 *     タッチ・ペンのみ。マウスは右クリックがあるので対象外。
 *     発火時点でドラッグは終了扱い（onEndを呼んでから来る）。
 *   capture?: boolean,
 *     pointerdownをキャプチャ段階で受ける。子要素がstopPropagationしていても
 *     開始判定を通したい場合に使う。
 *   stopPropagation?: boolean
 * }} handlers
 * @returns {{ cancel: () => void }}
 *   cancel: 進行中のドラッグをその場で終える。onEndは呼ぶ（コマのグリッド吸着のように
 *   終了時に状態を確定させる処理があるため）。2本指のピンチへ操作を明け渡すときに使う。
 */
export function bindDragGesture(element, {
  onStart,
  onMove,
  onEnd,
  onLongPress,
  capture = false,
  stopPropagation = false
} = {}) {
  let activePointerId = null;
  let context = null;
  let longPressTimer = null;
  let downEvent = null;
  let startClientX = 0;
  let startClientY = 0;

  function clearLongPressTimer() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // ドラッグの後片付け。onEndを呼ぶかどうかは呼び出し元の事情で変わるので引数で分ける。
  function finish(event, callEnd) {
    if (activePointerId === null) return;

    clearLongPressTimer();
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    try { element.releasePointerCapture(activePointerId); } catch { /* 解放済みは無視 */ }

    const endedContext = context;
    activePointerId = null;
    context = null;
    downEvent = null;

    if (callEnd) onEnd?.(event, endedContext);
  }

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId) return;

    if (longPressTimer !== null) {
      const movedX = Math.abs(event.clientX - startClientX);
      const movedY = Math.abs(event.clientY - startClientY);
      if (movedX > LONG_PRESS_TOLERANCE_PX || movedY > LONG_PRESS_TOLERANCE_PX) {
        clearLongPressTimer();
      }
    }

    onMove?.(event, context);
  }

  function onPointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    finish(event, true);
  }

  // 長押しでメニューを出した直後、AndroidのブラウザがさらにcontextmenuをあげてくるとMenuが
  // 二重に出る。次の1回だけ握り潰す（PCの右クリックまで殺さないよう短時間で解除する）。
  function suppressNextContextMenu() {
    const handler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      remove();
    };
    const remove = () => element.removeEventListener('contextmenu', handler, true);

    element.addEventListener('contextmenu', handler, true);
    setTimeout(remove, 800);
  }

  element.addEventListener('pointerdown', (event) => {
    // 押した指が既に1本ある間は2本目を無視する。2本指のピンチは呼び出し元が
    // 別途見ており、そちらがcancel()でこのドラッグを打ち切る。
    if (activePointerId !== null) return;

    // 左ボタン相当のみ。タッチ・ペンのbuttonは0なのでマウスの右/中クリックだけが弾かれる。
    if (event.button !== 0 || !event.isPrimary) return;

    const started = onStart ? onStart(event) : true;
    if (started === false || started === null || started === undefined) return;

    event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    activePointerId = event.pointerId;
    context = started;
    downEvent = event;
    startClientX = event.clientX;
    startClientY = event.clientY;

    try { element.setPointerCapture(event.pointerId); } catch { /* 捕捉できなくても続行 */ }
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);

    if (onLongPress && event.pointerType !== 'mouse') {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        const pressEvent = downEvent;
        const pressContext = context;
        // 先にドラッグを畳んで状態を確定させてからメニューを出す
        // （コマのグリッド吸着などがonEndに入っているため）。
        finish(pressEvent, true);
        suppressNextContextMenu();
        onLongPress(pressEvent, pressContext);
      }, LONG_PRESS_MS);
    }
  }, capture);

  return {
    cancel: () => finish(null, true)
  };
}
