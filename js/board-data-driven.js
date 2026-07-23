// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showCharacterDialog, showCharacterEditDialog } from './character-dialog.js';
import { showBackgroundSizeDialog } from './background-dialog.js';
import { pluginHasCharacterImport, importCharacterJsonForPlugin } from './parameters/registry.js';
import { pickFileAsDataUrl, pickFileAsText } from './file-uploader.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { store, generateTokenId, listPlugins, DEFAULT_TOKEN_COLOR } from './game-store.js';
export { store, generateTokenId, listPlugins, DEFAULT_TOKEN_COLOR };

const GRID_SIZE = 50;
const TOKEN_SIZE = 40;
const OFFSET_PADDING = 5;
// #boardのCSS側で定義しているグリッド線レイヤー。背景画像を差し替える際もこの2層は維持する。
const BOARD_GRID_LAYERS = "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)";

// data URLの画像を読み込み、実際の縦横ピクセル数を取得する（背景サイズダイアログの初期値用）
function loadImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1000, height: 1000 });
    img.src = dataUrl;
  });
}

// JSONテキストをパースする。失敗時はアラートを出してnullを返す（右クリックメニュー・D&D共通）
function parseCharacterJsonText(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    alert(`JSONの解析に失敗しました: ${error.message}`);
    return null;
  }
}

// ルームにプラグインが適用されていれば、そのプラグイン独自の拡張JSON読み込みを使う。
// 未適用の場合はCore側の汎用読み込み（本アプリ自身の保存形式）にフォールバックする。
function resolveCharacterImport(json) {
  const activePluginId = store.state.room?.activePlugin ?? null;
  return (activePluginId && pluginHasCharacterImport(activePluginId))
    ? importCharacterJsonForPlugin(activePluginId, json)
    : importCharacterJsonGeneric(json);
}

function dispatchCharacterImport(id, importResult) {
  store.dispatch('IMPORT_CHARACTER_DATA', {
    id,
    name: importResult.name,
    valueOverrides: importResult.valueOverrides,
    labelOverrides: importResult.labelOverrides,
    newParameters: importResult.newParameters,
    components: importResult.components
  });
}

// カメラ（ズーム・パン）の状態。Storeの状態ではなく、あくまでローカルな見た目の変更。
// 他プレイヤーの視点には影響しない。
let scale = 1;
let panX = 0;
let panY = 0;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

let rafId = null;

function scheduleBoardTransform(board) {
  if (rafId !== null) return; // 既に予約済みなら何もしない
  rafId = requestAnimationFrame(() => {
    applyBoardTransform(board);
    rafId = null;
  });
}


// ローカル座標(コマの位置)がはみ出さない範囲にクランプする
function clampToBoard(x, y, board) {
  const maxX = board.offsetWidth - TOKEN_SIZE;
  const maxY = board.offsetHeight - TOKEN_SIZE;

  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY))
  };
}

function applyBoardTransform(board) {
  board.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// 背景画像とボードサイズを盤面に反映する。imageUrlが無い場合はCSS側のデフォルト
// （ビューポート幅いっぱい・背景グレー）に戻す。
function applyBoardBackground(board, room) {
  const imageUrl = room?.backgroundImage;

  if (!imageUrl) {
    board.style.backgroundImage = '';
    board.style.backgroundSize = '';
    board.style.backgroundPosition = '';
    board.style.backgroundRepeat = '';
    board.style.width = '';
    board.style.height = '';
    return;
  }

  const { boardWidth, boardHeight } = room;
  const hasCustomSize = boardWidth && boardHeight;

  board.style.backgroundImage = `${BOARD_GRID_LAYERS}, url('${imageUrl}')`;
  board.style.backgroundSize = hasCustomSize
    ? `50px 50px, 50px 50px, ${boardWidth}px ${boardHeight}px`
    : '50px 50px, 50px 50px, cover';
  board.style.backgroundPosition = '0 0, 0 0, center';
  board.style.backgroundRepeat = 'repeat, repeat, no-repeat';
  board.style.width = hasCustomSize ? `${boardWidth}px` : '';
  board.style.height = hasCustomSize ? `${boardHeight}px` : '';
}

// --- 描画: STATE_CHANGEDを受けてDOMをStateに同期する ---

function bindTokenDrag(element, board) {
  element.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation(); // 盤面パン用のmousedownに伝播させない

    const tokenId = element.id;
    const currentTokenState = store.state.tokens[tokenId];
    if (!currentTokenState) return;

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startX = currentTokenState.x;
    const startY = currentTokenState.y;

    function onMouseMove(e) {
      // マウスの移動量はスケールの影響を受けるので、盤面のローカル座標に変換する
      const deltaX = (e.clientX - startClientX) / scale;
      const deltaY = (e.clientY - startClientY) / scale;

      const { x: clampedX, y: clampedY } = clampToBoard(startX + deltaX, startY + deltaY, board);
      store.dispatch('MOVE_TOKEN', { id: tokenId, x: clampedX, y: clampedY });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const latestState = store.state.tokens[tokenId];
      if (!latestState) return;

      const snappedX = Math.round(latestState.x / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;
      const snappedY = Math.round(latestState.y / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;

      const { x: finalX, y: finalY } = clampToBoard(snappedX, snappedY, board);
      store.dispatch('MOVE_TOKEN', { id: tokenId, x: finalX, y: finalY });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const tokenId = element.id;

    showContextMenu(event.clientX, event.clientY, [
      {
        label: 'キャラクター更新',
        onSelect: () => {
          const current = store.state.tokens[tokenId];
          if (!current) return;

          showCharacterEditDialog({
            character: current,
            activePluginId: store.state.room?.activePlugin ?? null,
            onComponentChange: (componentKey, value) => {
              store.dispatch('SET_COMPONENT', { id: tokenId, componentKey, value });
            },
            onConfirm: ({ name, image, parameterValues, removedParamIds, newCustomParameters, visibilityUpdates }) => {
              const latest = store.state.tokens[tokenId];
              if (!latest) return;

              if (name !== latest.name) {
                store.dispatch('RENAME_CHARACTER', { id: tokenId, name });
              }

              if (image !== (latest.image || null)) {
                store.dispatch('SET_CHARACTER_IMAGE', { id: tokenId, image });
              }

              Object.entries(parameterValues).forEach(([paramId, value]) => {
                const existingParam = latest.parameters[paramId];
                if (existingParam && existingParam.value !== value) {
                  store.dispatch('SET_PARAMETER', { characterId: tokenId, paramId, value });
                }
              });

              Object.entries(visibilityUpdates || {}).forEach(([paramId, visible]) => {
                store.dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId, visible });
              });

              removedParamIds.forEach(paramId => {
                store.dispatch('REMOVE_PARAMETER', { characterId: tokenId, paramId });
              });

              newCustomParameters.forEach(({ key, label, value, visible }) => {
                store.dispatch('ADD_PARAMETER', { characterId: tokenId, key, label, value, visible });
              });
            }
          });
        }
      },
      {
        label: 'JSONを読み込む',
        onSelect: async () => {
          const picked = await pickFileAsText({ accept: 'application/json' });
          if (!picked) return;

          const json = parseCharacterJsonText(picked.text);
          if (!json) return;

          const importResult = resolveCharacterImport(json);
          if (!importResult) {
            alert('このJSONを読み込めませんでした。');
            return;
          }

          dispatchCharacterImport(tokenId, importResult);
        }
      },
      {
        label: '名前を変更',
        onSelect: () => {
          const current = store.state.tokens[tokenId];
          if (!current) return;
          const newName = prompt('新しい名前を入力してください', current.name);
          if (newName && newName.trim() !== '') {
            store.dispatch('RENAME_CHARACTER', { id: tokenId, name: newName.trim() });
          }
        }
      },
      {
        label: '削除',
        danger: true,
        onSelect: () => {
          store.dispatch('REMOVE_CHARACTER', { id: tokenId });
        }
      }
    ]);
  });
}

// コマの見た目（色 or 画像）をStateに合わせて反映する
function applyTokenAppearance(el, tokenData) {
  el.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
  if (tokenData.image) {
    el.style.backgroundImage = `url('${tokenData.image}')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  } else {
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
  }
}

function createTokenElement(tokenData, board) {
  const el = document.createElement('div');
  el.className = 'token';
  el.id = tokenData.id;
  applyTokenAppearance(el, tokenData);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'token-name';
  nameSpan.textContent = tokenData.name;
  el.appendChild(nameSpan);

  bindTokenDrag(el, board);
  board.appendChild(el);
  return el;
}

function clampPan(viewport, board) {
  const boardW = board.offsetWidth * scale;
  const boardH = board.offsetHeight * scale;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  // 画面中央より奥へ盤面の端が行かないようにする「のりしろ」
  const marginX = vw / 2;
  const marginY = vh / 2;

  const minPanX = vw - boardW - marginX;
  const maxPanX = marginX;
  const minPanY = vh - boardH - marginY;
  const maxPanY = marginY;

  panX = Math.min(maxPanX, Math.max(minPanX, panX));
  panY = Math.min(maxPanY, Math.max(minPanY, panY));
}

window.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('board-viewport');
  const board = document.getElementById('board');
  if (!viewport || !board) return;

  // Ctrl+ホイール：マウス位置を中心にズーム
  viewport.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();

    const viewportRect = viewport.getBoundingClientRect();
    const cx = event.clientX - viewportRect.left;
    const cy = event.clientY - viewportRect.top;

    const oldScale = scale;
    const ZOOM_SENSITIVITY = 0.0015;
    const zoomFactor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));

    // マウスの下にある盤面上の点が、ズーム後も同じ画面位置に来るようパンを再計算
    panX = cx - (cx - panX) * (scale / oldScale);
    panY = cy - (cy - panY) * (scale / oldScale);

    clampPan(viewport, board);
    scheduleBoardTransform(board);
  }, { passive: false });

  // 左ドラッグ：視点移動（パン）。コマの上から始めた場合は無視してコマ移動に任せる。
  viewport.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.token')) return;

    const panStartClientX = event.clientX;
    const panStartClientY = event.clientY;
    const panStartX = panX;
    const panStartY = panY;

    viewport.style.cursor = 'grabbing';

    function onMouseMove(e) {
      panX = panStartX + (e.clientX - panStartClientX);
      panY = panStartY + (e.clientY - panStartClientY);
      clampPan(viewport, board);
      applyBoardTransform(board);
    }

    function onMouseUp() {
      viewport.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // 盤面の何もない場所を右クリック → キャラクター追加メニュー
  viewport.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    const viewportRect = viewport.getBoundingClientRect();
    const cx = event.clientX - viewportRect.left;
    const cy = event.clientY - viewportRect.top;

    // 画面座標 → ズーム・パンを考慮した盤面ローカル座標へ逆変換
    const dropX = (cx - panX) / scale;
    const dropY = (cy - panY) / scale;

    const { x: clampedX, y: clampedY } = clampToBoard(
      dropX - TOKEN_SIZE / 2,
      dropY - TOKEN_SIZE / 2,
      board
    );

    showContextMenu(event.clientX, event.clientY, [
      {
        label: 'キャラクターを追加',
        onSelect: () => {
          showCharacterDialog({
            activePluginId: store.state.room?.activePlugin ?? null,
            onConfirm: ({ name, image, parameterOverrides, customParameters }) => {
              store.dispatch('ADD_CHARACTER', {
                id: generateTokenId(),
                name,
                image,
                x: Math.round(clampedX),
                y: Math.round(clampedY),
                parameterOverrides,
                customParameters
              });
            }
          });
        }
      },
      {
        label: '背景画像を変更',
        onSelect: async () => {
          const picked = await pickFileAsDataUrl({ accept: 'image/*' });
          if (!picked) return;

          const { width, height } = await loadImageDimensions(picked.dataUrl);

          showBackgroundSizeDialog({
            naturalWidth: width,
            naturalHeight: height,
            onConfirm: ({ width: boardWidth, height: boardHeight }) => {
              store.dispatch('SET_BACKGROUND_IMAGE', { imageUrl: picked.dataUrl, boardWidth, boardHeight });
            }
          });
        }
      }
    ]);
  });

  // JSONファイルをD&D：コマの上にドロップした場合はそのキャラクターへ読み込み、
  // 盤面の何もない場所にドロップした場合はその位置に新規キャラクターとして読み込む。
  viewport.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  viewport.addEventListener('drop', async (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      alert('JSONファイルをドロップしてください。');
      return;
    }

    const text = await file.text();
    const json = parseCharacterJsonText(text);
    if (!json) return;

    const importResult = resolveCharacterImport(json);
    if (!importResult) {
      alert('このJSONを読み込めませんでした。');
      return;
    }

    const droppedTokenEl = event.target.closest('.token');
    if (droppedTokenEl) {
      dispatchCharacterImport(droppedTokenEl.id, importResult);
      return;
    }

    // 盤面の何もない場所へのドロップ → その位置に新規キャラクターを作成して読み込む
    const viewportRect = viewport.getBoundingClientRect();
    const cx = event.clientX - viewportRect.left;
    const cy = event.clientY - viewportRect.top;
    const dropX = (cx - panX) / scale;
    const dropY = (cy - panY) / scale;
    const { x: clampedX, y: clampedY } = clampToBoard(
      dropX - TOKEN_SIZE / 2,
      dropY - TOKEN_SIZE / 2,
      board
    );

    const newId = generateTokenId();
    store.dispatch('ADD_CHARACTER', {
      id: newId,
      name: importResult.name || '新規キャラクター',
      x: Math.round(clampedX),
      y: Math.round(clampedY)
    });
    dispatchCharacterImport(newId, importResult);
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    applyBoardBackground(board, state.room);

    const existingIds = new Set(
      Array.from(board.querySelectorAll('.token')).map(el => el.id)
    );
    const stateIds = new Set(Object.keys(state.tokens));

    existingIds.forEach(id => {
      if (!stateIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    Object.values(state.tokens).forEach(tokenData => {
      let el = document.getElementById(tokenData.id);
      if (!el) {
        el = createTokenElement(tokenData, board);
      }
      el.style.left = `${tokenData.x}px`;
      el.style.top = `${tokenData.y}px`;
      applyTokenAppearance(el, tokenData);

      const nameSpan = el.querySelector('.token-name');
      if (nameSpan && nameSpan.textContent !== tokenData.name) {
        nameSpan.textContent = tokenData.name;
      }
    });
  });
});

window.moveToken = (id, x, y) => {
  store.dispatch('MOVE_TOKEN', { id, x, y });
};
