// js/floating-panel.js
// ドラッグで移動・つまみで拡縮できる浮動パネルの汎用ユーティリティ。
// 位置/サイズ/表示状態はブラウザ単位（localStorage）で保存し、次回起動時も復元する
// （js/resizable-stack.jsと同じ方針。localStorageが使えない環境では保存を諦める）。
//
// position:fixedでbody直下に置くので、盤面の外（ログ欄やチャット欄の上）へも動かせる。
// 中身の描画は呼び出し元に委ね、このモジュールは枠と操作だけを担当する。

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
    panel.style.left = `${rect.x}px`;
    panel.style.top = `${rect.y}px`;
    panel.style.width = `${rect.w}px`;
    panel.style.height = `${rect.h}px`;
  }

  function applyVisibility() {
    panel.style.display = visible ? '' : 'none';
  }

  function persist() {
    saveRect(storageKey, { ...rect, visible });
  }

  // ヘッダーのドラッグで移動。ボタンの上から始まったドラッグは無視する（閉じるボタンを
  // 押したつもりでパネルが動かないように）。
  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = rect.x;
    const originY = rect.y;
    header.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      rect = clampRect({
        ...rect,
        x: originX + (moveEvent.clientX - startX),
        y: originY + (moveEvent.clientY - startY)
      });
      applyRect();
    };

    const onUp = (upEvent) => {
      header.removeEventListener('pointermove', onMove);
      header.removeEventListener('pointerup', onUp);
      header.removeEventListener('pointercancel', onUp);
      try { header.releasePointerCapture(upEvent.pointerId); } catch { /* 解放済みは無視 */ }
      persist();
    };

    header.addEventListener('pointermove', onMove);
    header.addEventListener('pointerup', onUp);
    header.addEventListener('pointercancel', onUp);
  });

  // 右下のつまみで拡縮
  resizeHandle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const originW = rect.w;
    const originH = rect.h;
    resizeHandle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      rect = clampRect({
        ...rect,
        w: originW + (moveEvent.clientX - startX),
        h: originH + (moveEvent.clientY - startY)
      });
      applyRect();
    };

    const onUp = (upEvent) => {
      resizeHandle.removeEventListener('pointermove', onMove);
      resizeHandle.removeEventListener('pointerup', onUp);
      resizeHandle.removeEventListener('pointercancel', onUp);
      try { resizeHandle.releasePointerCapture(upEvent.pointerId); } catch { /* 解放済みは無視 */ }
      persist();
    };

    resizeHandle.addEventListener('pointermove', onMove);
    resizeHandle.addEventListener('pointerup', onUp);
    resizeHandle.addEventListener('pointercancel', onUp);
  });

  function setVisible(next) {
    if (visible === next) return;
    visible = next;
    applyVisibility();
    persist();
    onVisibilityChange?.(visible);
  }

  closeBtn.addEventListener('click', () => setVisible(false));

  // ウィンドウを縮めた結果パネルが画面外へ取り残されるのを防ぐ
  window.addEventListener('resize', () => {
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
    isVisible: () => visible
  };
}
