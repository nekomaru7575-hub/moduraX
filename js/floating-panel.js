// js/floating-panel.js
// ドラッグで移動・つまみで拡縮できる浮動パネルの汎用ユーティリティ。
// 位置/サイズ/表示状態はブラウザ単位（localStorage）で保存し、次回起動時も復元する
// （localStorageが使えない環境では保存を諦める）。
//
// position:fixedでbody直下に置くので、盤面の外（ログ欄やチャット欄の上）へも動かせる。
// 中身の描画は呼び出し元に委ね、このモジュールは枠と操作だけを担当する。
//
// 狭幅（スマホ）では浮かせる場所が無いので、js/mobile-layout.jsがdock()を呼んで
// 中央スペースへはめ込む。dock中は移動・拡縮・位置の保存を止め、大きさはCSSに任せる。

import { bindDragGesture } from './drag-gesture.js';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

// ヘッダーが画面外へ完全に出てしまうと掴めなくなるため、必ずこの幅/高さだけは画面内に残す
const KEEP_VISIBLE_X = 80;
const KEEP_VISIBLE_Y = 32;

function loadRect(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const value = raw ? JSON.parse(raw) : null;
    return (value && typeof value === 'object') ? value : null;
  } catch {
    return null;
  }
}

function saveRect(storageKey, rect) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rect));
  } catch {
    // localStorageが使えない環境（プライベートモード等）では保存を諦める
  }
}

// 画面内に収まるよう位置と大きさを丸める。ウィンドウを縮めた後にもう一度通せば、
// 画面外へ取り残されたパネルが戻ってくる。
function clampRect(rect) {
  const maxW = Math.max(MIN_WIDTH, window.innerWidth);
  const maxH = Math.max(MIN_HEIGHT, window.innerHeight);

  const w = Math.min(Math.max(MIN_WIDTH, rect.w), maxW);
  const h = Math.min(Math.max(MIN_HEIGHT, rect.h), maxH);
  const x = Math.min(Math.max(-(w - KEEP_VISIBLE_X), rect.x), window.innerWidth - KEEP_VISIBLE_X);
  const y = Math.min(Math.max(0, rect.y), window.innerHeight - KEEP_VISIBLE_Y);

  return { w, h, x, y };
}

/**
 * @param {{
 *   title: string,
 *   storageKey: string,
 *   defaultRect?: {x:number, y:number, w:number, h:number},
 *   defaultVisible?: boolean,
 *   onVisibilityChange?: (visible: boolean) => void
 * }} options
 * @returns {{
 *   element: HTMLElement, body: HTMLElement,
 *   show: () => void, hide: () => void, toggle: () => void, isVisible: () => boolean
 * }}
 *   bodyへ中身を描画する。要素は生成時点でbodyに追加済み。
 */
export function createFloatingPanel({
  title,
  storageKey,
  defaultRect = { x: 80, y: 80, w: 320, h: 420 },
  defaultVisible = true,
  onVisibilityChange
}) {
  const saved = loadRect(storageKey);
  let rect = clampRect({ ...defaultRect, ...(saved || {}) });
  let visible = saved?.visible ?? defaultVisible;
  let docked = false;

  const panel = document.createElement('div');
  panel.className = 'floating-panel';

  const header = document.createElement('div');
  header.className = 'floating-panel-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'floating-panel-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'floating-panel-close';
  closeBtn.textContent = '×';
  closeBtn.title = '閉じる';

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'floating-panel-body';
  panel.appendChild(body);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'floating-panel-resize';
  panel.appendChild(resizeHandle);

  function applyRect() {
    // dock中は中央スペースいっぱいに広げるのがCSSの役目。ここでインラインの
    // 位置・大きさを書くと、PCへ戻したときの元の矩形まで巻き添えで壊れる。
    if (docked) return;

    panel.style.left = `${rect.x}px`;
    panel.style.top = `${rect.y}px`;
    panel.style.width = `${rect.w}px`;
    panel.style.height = `${rect.h}px`;
  }

  function applyVisibility() {
    // dock中の表示切り替えはタブ（js/mobile-layout.js）が持つ
    if (docked) return;

    panel.style.display = visible ? '' : 'none';
  }

  function persist() {
    saveRect(storageKey, { ...rect, visible });
  }

  // ヘッダーのドラッグで移動。ボタンの上から始まったドラッグは無視する（閉じるボタンを
  // 押したつもりでパネルが動かないように）。
  bindDragGesture(header, {
    onStart: (event) => {
      if (docked) return false;
      if (event.target.closest('button')) return false;

      return {
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.x,
        originY: rect.y
      };
    },

    onMove: (event, { startX, startY, originX, originY }) => {
      rect = clampRect({
        ...rect,
        x: originX + (event.clientX - startX),
        y: originY + (event.clientY - startY)
      });
      applyRect();
    },

    onEnd: () => persist()
  });

  // 右下のつまみで拡縮
  bindDragGesture(resizeHandle, {
    stopPropagation: true,

    onStart: (event) => {
      if (docked) return false;

      return {
        startX: event.clientX,
        startY: event.clientY,
        originW: rect.w,
        originH: rect.h
      };
    },

    onMove: (event, { startX, startY, originW, originH }) => {
      rect = clampRect({
        ...rect,
        w: originW + (event.clientX - startX),
        h: originH + (event.clientY - startY)
      });
      applyRect();
    },

    onEnd: () => persist()
  });

  function setVisible(next) {
    if (visible === next) return;
    visible = next;
    applyVisibility();
    persist();
    onVisibilityChange?.(visible);
  }

  closeBtn.addEventListener('click', () => setVisible(false));

  // 狭幅レイアウトで中央スペースへはめ込む。大きさはCSS（#mobileStage側）に委ねるので、
  // 移動用に書いてあったインラインの位置・大きさを消しておく。
  function dock(container) {
    if (docked) return;
    docked = true;

    panel.classList.add('is-docked');
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.display = '';
    // タブで切り替えるので、はめ込み中は閉じる導線を出さない
    closeBtn.style.display = 'none';

    container.appendChild(panel);
  }

  // PC幅へ戻す。
  function undock() {
    if (!docked) return;
    docked = false;

    panel.classList.remove('is-docked');
    closeBtn.style.display = '';
    document.body.appendChild(panel);

    // 保存値から位置・大きさを取り直す。スマホ幅でページを開くと、生成時のclampRectが
    // 狭い画面に合わせて位置を丸めてしまっている。dock中は保存側を一切書き換えないので、
    // ここで読み直せばPC幅での本来の置き場所に戻る。
    rect = clampRect({ ...defaultRect, ...(loadRect(storageKey) || {}) });

    applyRect();
    applyVisibility();
  }

  // ウィンドウを縮めた結果パネルが画面外へ取り残されるのを防ぐ
  window.addEventListener('resize', () => {
    // dock中に丸めると、スマホ幅を基準にした矩形がPCへ戻ったあとも残ってしまう
    if (docked) return;

    rect = clampRect(rect);
    applyRect();
  });

  applyRect();
  applyVisibility();
  document.body.appendChild(panel);

  return {
    element: panel,
    body,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    toggle: () => setVisible(!visible),
    isVisible: () => visible,
    isDocked: () => docked,
    dock,
    undock
  };
}
