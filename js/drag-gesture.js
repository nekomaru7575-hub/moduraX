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
 * onStartがこれを返すと、ドラッグは始めずに長押しだけを見る。
 *
 * 固定した（locked）パネル・カード・デッキのように「動かせないが、メニューは出したい」
 * ものに使う。falseを返すと長押しまで一緒に切れてしまい、タッチからはメニューへ到達する
 * 手段が無くなる（右クリックが無いため）。
 *
 * このモードではpreventDefault・stopPropagation・setPointerCaptureのいずれも行わない。
 * pointerdownはそのまま親へ流れるので、固定パネルの上のドラッグが盤面パンになる従来の
 * 挙動はそのまま保たれる。
 */
export const LONG_PRESS_ONLY = Symbol('longPressOnly');

/**
 * @param {HTMLElement} element
 * @param {{
 *   onStart?: (event: PointerEvent) => any,
 *     ドラッグを始めてよければ任意の値（＝以降のコールバックへ渡す文脈）を返す。
 *     falseまたはnull/undefinedを返すとドラッグを始めない（長押しも見ない）。
 *     LONG_PRESS_ONLYを返すと、ドラッグは始めずに長押しだけを見る（上の定義を参照）。
 *   onMove?: (event: PointerEvent, context: any) => void,
 *   onEnd?: (event: PointerEvent, context: any) => void,
 *   onLongPress?: (event: PointerEvent, context: any) => void,
 *     タッチ・ペンのみ。マウスは右クリックがあるので対象外。
 *     発火時点でドラッグは終了扱い（onEndを呼んでから来る）。
 *   onClick?: (event: PointerEvent, context: any) => void,
 *     押してから、LONG_PRESS_TOLERANCE_PX以内しか動かずに離したとき。
 *     長押しが発火した場合は呼ばない（メニューを出しつつクリックもする、を防ぐ）。
 *     LONG_PRESS_ONLY（固定したパネル等）でも呼ぶ——「動かせないが押せる」ものが要るため。
 *     このときcontextはnull（ドラッグを始めていないので文脈が無い）。
 *     通常モードではonEndの後に呼ぶ（onEndでの位置確定を先に済ませるため）。
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
  onClick,
  capture = false,
  stopPropagation = false
} = {}) {
  let activePointerId = null;
  let context = null;
  let longPressTimer = null;
  let longPressOnlyStop = null; // LONG_PRESS_ONLYで見張っている最中の取り消し口
  let downEvent = null;
  let startClientX = 0;
  let startClientY = 0;
  // 長押しが発火したか。クリックと二重に鳴らさないための印
  let longPressFired = false;

  // 押した場所からの距離が、クリックとみなせる範囲に収まっているか。
  // しきい値は長押しの取り消しと同じものを使う（同じ「指がぶれた」の判定なので、
  // 別の値にすると「長押しは取り消されたのにクリックにはなる」隙間ができる）。
  function withinClickTolerance(event) {
    return Math.abs(event.clientX - startClientX) <= LONG_PRESS_TOLERANCE_PX
      && Math.abs(event.clientY - startClientY) <= LONG_PRESS_TOLERANCE_PX;
  }

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
    // finishがcontextを捨てるので、クリックの判定材料を先に取っておく
    const clicked = onClick && !longPressFired
      && event.type === 'pointerup' && withinClickTolerance(event);
    const clickContext = context;
    finish(event, true);
    // onEndの後に呼ぶ：先に位置の確定（グリッド吸着など）を済ませてから振る舞いを起こす
    if (clicked) onClick(event, clickContext);
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

  // ドラッグを始めずに長押しだけを見る（LONG_PRESS_ONLY）。
  //
  // 【listenerはdocumentに貼る】ここではsetPointerCaptureをしないので、pointermove/
  // pointerupがこの要素に来るとは限らない。pointerdownを流した先の親（盤面のパン）が
  // ポインタを捕捉すると、以降のイベントはそちらへ付け替えられてしまう。
  // 捕捉されたイベントもdocumentまでは上がってくるので、こちらで拾えば取りこぼさない。
  function watchLongPressOnly(pressEvent) {
    const pointerId = pressEvent.pointerId;
    const fromX = pressEvent.clientX;
    const fromY = pressEvent.clientY;
    let timer = null;
    let firedLongPress = false;
    // 長押しを見るのはタッチ・ペンだけ（マウスには右クリックがある）。onClickのために
    // マウスもここへ通すようになったので、この線引きを明示的に引き直す——引かないと、
    // 固定パネルを左ボタンで押したまま500ms待っただけでメニューが開いてしまう。
    const watchesLongPress = !!onLongPress && pressEvent.pointerType !== 'mouse';

    const stop = () => {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      longPressOnlyStop = null;
      document.removeEventListener('pointermove', onDocMove, true);
      document.removeEventListener('pointerup', onDocEnd, true);
      document.removeEventListener('pointercancel', onDocEnd, true);
      document.removeEventListener('pointerdown', onOtherPointerDown, true);
    };

    const onDocMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const movedX = Math.abs(moveEvent.clientX - fromX);
      const movedY = Math.abs(moveEvent.clientY - fromY);
      if (movedX > LONG_PRESS_TOLERANCE_PX || movedY > LONG_PRESS_TOLERANCE_PX) stop();
    };

    const onDocEnd = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      // 長押しでメニューを出したあとはクリックにしない。
      // 動いた場合はonDocMoveがstop()して購読を外しているので、ここへは来ない。
      // それでも距離を見るのは、pointermoveを1度も挟まずに離れる端末があるため。
      const clicked = onClick && !firedLongPress && endEvent.type === 'pointerup'
        && Math.abs(endEvent.clientX - fromX) <= LONG_PRESS_TOLERANCE_PX
        && Math.abs(endEvent.clientY - fromY) <= LONG_PRESS_TOLERANCE_PX;
      stop();
      // 文脈は無い（ドラッグを始めていない）のでnullを渡す
      if (clicked) onClick(endEvent, null);
    };

    // 2本目の指が触れたらピンチへ操作を明け渡す。触れたまま止まっているとメニューが
    // 開いてしまうので、こちらから降りる（1本指の側はactiveBoardDrag.cancel()で畳まれる）。
    const onOtherPointerDown = (downEvent) => {
      if (downEvent.pointerId !== pointerId) stop();
    };

    longPressOnlyStop = stop;
    document.addEventListener('pointermove', onDocMove, true);
    document.addEventListener('pointerup', onDocEnd, true);
    document.addEventListener('pointercancel', onDocEnd, true);
    document.addEventListener('pointerdown', onOtherPointerDown, true);

    // マウスのときはタイマーを張らない。張ってしまうと、ゆっくり押しただけの
    // クリック（500ms以上）が「長押し」に化けてクリックが鳴らなくなる。
    if (!watchesLongPress) return;

    timer = setTimeout(() => {
      timer = null;
      firedLongPress = true;
      stop();
      suppressNextContextMenu();
      onLongPress(pressEvent, null);
    }, LONG_PRESS_MS);
  }

  element.addEventListener('pointerdown', (event) => {
    // 押した指が既に1本ある間は2本目を無視する。2本指のピンチは呼び出し元が
    // 別途見ており、そちらがcancel()でこのドラッグを打ち切る。
    if (activePointerId !== null) return;

    // 左ボタン相当のみ。タッチ・ペンのbuttonは0なのでマウスの右/中クリックだけが弾かれる。
    if (event.button !== 0 || !event.isPrimary) return;

    const started = onStart ? onStart(event) : true;
    if (started === false || started === null || started === undefined) return;

    longPressFired = false;

    // 動かせないが長押しには応じるもの。イベントは握らずに親へ流したままにする。
    //
    // onClickがあるときはマウスでも見張る。固定したパネルはこの枝しか通らないので、
    // ここをタッチ・ペンだけにしておくと「固定したボタンをマウスで押しても何も起きない」
    // になる（クリックオプションの本命は固定パネルなので、それでは意味がない）。
    if (started === LONG_PRESS_ONLY) {
      if (onClick || (onLongPress && event.pointerType !== 'mouse')) watchLongPressOnly(event);
      return;
    }

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
        longPressFired = true; // このあとのpointerupをクリックとして鳴らさない
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
    cancel: () => {
      longPressOnlyStop?.();
      finish(null, true);
    }
  };
}
