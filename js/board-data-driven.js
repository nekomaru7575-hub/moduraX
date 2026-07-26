// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showCharacterDialog, showCharacterEditDialog, applyImageCropStyle, defaultImageCrop } from './character-dialog.js';
import { showBackgroundSizeDialog } from './background-dialog.js';
import { showPanelDialog } from './panel-dialog.js';
import { showAddBuffDialog, showBuffListDialog } from './buff-dialog.js';
import { pluginHasCharacterImport, importCharacterJsonForPlugin } from './parameters/registry.js';
import { pickFileAsDataUrl, pickFileAsText } from './file-uploader.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { getLocalUserId } from './local-identity.js';
import { rollBCDice } from './BCdice.js';
import {
  store, generateTokenId, generatePanelId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS
} from './game-store.js';
export {
  store, generateTokenId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS
};

const GRID_SIZE = 25;
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


// コマを置ける領域の外接矩形（盤面ローカル座標）を返す。
// 盤面本体に加え、盤面外に連結されたパネルの範囲も含める（コマをパネル上に乗せられるように）。
function getPlacementBounds(board) {
  let minX = 0;
  let minY = 0;
  let maxX = board.offsetWidth;
  let maxY = board.offsetHeight;

  Object.values(store.state.panels || {}).forEach(panel => {
    const px2 = panel.x + panel.cols * GRID_SIZE;
    const py2 = panel.y + panel.rows * GRID_SIZE;
    if (panel.x < minX) minX = panel.x;
    if (panel.y < minY) minY = panel.y;
    if (px2 > maxX) maxX = px2;
    if (py2 > maxY) maxY = py2;
  });

  return { minX, minY, maxX, maxY };
}

// ローカル座標(コマの位置)が配置可能領域からはみ出さない範囲にクランプする。tokenPixelSizeは
// そのコマの実際の一辺の長さ（size×GRID_SIZE）で、コマごとに大きさが異なるため呼び出し側で渡す。
function clampToBoard(x, y, board, tokenPixelSize = GRID_SIZE) {
  const bounds = getPlacementBounds(board);
  const maxX = bounds.maxX - tokenPixelSize;
  const maxY = bounds.maxY - tokenPixelSize;

  return {
    x: Math.max(bounds.minX, Math.min(x, maxX)),
    y: Math.max(bounds.minY, Math.min(y, maxY))
  };
}

// 2つの矩形が「連結している」（重なる、または辺で接している）かを判定する。
// 角だけが触れている場合（斜めの隙間）は連結とみなさない。
function rectsConnected(a, b) {
  const hOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const vOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return hOverlap >= 0 && vOverlap >= 0 && (hOverlap > 0 || vOverlap > 0);
}

// パネルの配置(candidateRect)が妥当か（盤面または他のいずれかのパネルに連結しているか）を判定する。
// selfIdは移動・リサイズ中の自分自身のパネルIDで、連結相手から除外する。
function isPanelPlacementValid(candidateRect, board, selfId) {
  const boardRect = { x: 0, y: 0, w: board.offsetWidth, h: board.offsetHeight };
  if (rectsConnected(candidateRect, boardRect)) return true;

  return Object.values(store.state.panels || {}).some(panel => {
    if (panel.id === selfId) return false;
    const rect = { x: panel.x, y: panel.y, w: panel.cols * GRID_SIZE, h: panel.rows * GRID_SIZE };
    return rectsConnected(candidateRect, rect);
  });
}

function applyBoardTransform(board) {
  board.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// 盤面のピクセルサイズをマスの整数倍に決める。
// 背景アップロード時に指定されたカスタムサイズ(boardWidth/boardHeight, 既にマスの整数倍)が
// あればそれを、無ければビューポートをマス単位に切り上げたサイズを使う（端のマスが
// 中途半端に切れないようにする）。
function resolveBoardPixelSize(board, room) {
  if (room?.boardWidth && room?.boardHeight) {
    return { width: room.boardWidth, height: room.boardHeight };
  }
  const viewport = board.parentElement;
  const vw = viewport ? viewport.clientWidth : board.offsetWidth;
  const vh = viewport ? viewport.clientHeight : board.offsetHeight;
  return {
    width: Math.max(GRID_SIZE, Math.ceil(vw / GRID_SIZE) * GRID_SIZE),
    height: Math.max(GRID_SIZE, Math.ceil(vh / GRID_SIZE) * GRID_SIZE)
  };
}

// 背景画像とボードサイズを盤面に反映する。盤面サイズは常にマスの整数倍にし、
// 背景画像はその盤面全体へ拡縮して敷く（マス目からはみ出さない）。imageUrlが無い場合は
// CSS側のデフォルト背景（グリッド＋グレー）に戻す。
function applyBoardBackground(board, room) {
  const imageUrl = room?.backgroundImage;
  const { width: bw, height: bh } = resolveBoardPixelSize(board, room);

  board.style.width = `${bw}px`;
  board.style.height = `${bh}px`;

  if (!imageUrl) {
    board.style.backgroundImage = '';
    board.style.backgroundSize = '';
    board.style.backgroundPosition = '';
    board.style.backgroundRepeat = '';
    return;
  }

  board.style.backgroundImage = `${BOARD_GRID_LAYERS}, url('${imageUrl}')`;
  board.style.backgroundSize = `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${bw}px ${bh}px`;
  board.style.backgroundPosition = '0 0, 0 0, 0 0';
  board.style.backgroundRepeat = 'repeat, repeat, no-repeat';
}

// --- 描画: STATE_CHANGEDを受けてDOMをStateに同期する ---

function bindTokenDrag(element, board) {
  element.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation(); // 盤面パン用のmousedownに伝播させない

    const tokenId = element.id;
    const currentTokenState = store.state.tokens[tokenId];
    if (!currentTokenState) return;

    const tokenPixelSize = (currentTokenState.size || 1) * GRID_SIZE;
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startX = currentTokenState.x;
    const startY = currentTokenState.y;

    function onMouseMove(e) {
      // マウスの移動量はスケールの影響を受けるので、盤面のローカル座標に変換する
      const deltaX = (e.clientX - startClientX) / scale;
      const deltaY = (e.clientY - startClientY) / scale;

      const { x: clampedX, y: clampedY } = clampToBoard(startX + deltaX, startY + deltaY, board, tokenPixelSize);
      store.dispatch('MOVE_TOKEN', { id: tokenId, x: clampedX, y: clampedY });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const latestState = store.state.tokens[tokenId];
      if (!latestState) return;

      const snappedX = Math.round(latestState.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(latestState.y / GRID_SIZE) * GRID_SIZE;

      const { x: finalX, y: finalY } = clampToBoard(snappedX, snappedY, board, tokenPixelSize);
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
            // ダイアログを開いたまま複数回エフェクト等を編集しても、常に最新の
            // components（他クライアントの同期・直前の保存を含む）を読めるようにする。
            // 開いた時点のスナップショットを握り続けると、再編集で古い内容に巻き戻る。
            getComponents: () => store.state.tokens[tokenId]?.components ?? {},
            // DX3のコンボ機能（発動/判定/ダメージ）が必要とするstore操作・ダイスロール一式。
            // getTokenも同様に、開いた時点のスナップショットではなく都度最新を返す。
            tokenId,
            dispatch: store.dispatch.bind(store),
            getToken: () => store.state.tokens[tokenId],
            getEffectiveParameterValue,
            generateBuffId,
            rollBCDice,
            onConfirm: ({ name, image, imageCrop, size, textColor, visible, parameterValues, removedParamIds, newCustomParameters }) => {
              const latest = store.state.tokens[tokenId];
              if (!latest) return;

              if (name !== latest.name) {
                store.dispatch('RENAME_CHARACTER', { id: tokenId, name });
              }

              if (image !== (latest.image || null)) {
                store.dispatch('SET_CHARACTER_IMAGE', { id: tokenId, image });
              }

              // トリミング設定の変更を反映（値が実際に変わったときだけ同期する）
              const nextCrop = image ? (imageCrop || defaultImageCrop()) : null;
              if (JSON.stringify(nextCrop) !== JSON.stringify(latest.imageCrop ?? null)) {
                store.dispatch('SET_CHARACTER_IMAGE_CROP', { id: tokenId, crop: nextCrop });
              }

              if (size !== (latest.size || 1)) {
                store.dispatch('SET_CHARACTER_SIZE', { id: tokenId, size });
              }

              if (textColor !== (latest.textColor || null)) {
                store.dispatch('SET_CHARACTER_TEXT_COLOR', { id: tokenId, textColor });
              }

              if (visible !== (latest.visible !== false)) {
                store.dispatch('SET_CHARACTER_VISIBLE', { id: tokenId, visible });
              }

              Object.entries(parameterValues).forEach(([paramId, value]) => {
                const existingParam = latest.parameters[paramId];
                if (existingParam && existingParam.value !== value) {
                  store.dispatch('SET_PARAMETER', { characterId: tokenId, paramId, value });
                }
              });

              removedParamIds.forEach(paramId => {
                store.dispatch('REMOVE_PARAMETER', { characterId: tokenId, paramId });
              });

              newCustomParameters.forEach(({ key, label, value }) => {
                store.dispatch('ADD_PARAMETER', { characterId: tokenId, key, label, value });
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
        label: 'バフ/デバフを付与',
        onSelect: () => {
          const current = store.state.tokens[tokenId];
          if (!current) return;

          showAddBuffDialog({
            parameters: current.parameters,
            onConfirm: ({ name, paramId, delta, expirePhase }) => {
              store.dispatch('ADD_BUFF', {
                tokenId, id: generateBuffId(), name, paramId, delta, expirePhase
              });
            }
          });
        }
      },
      {
        label: 'バフ/デバフ一覧',
        onSelect: () => {
          if (!store.state.tokens[tokenId]) return;

          showBuffListDialog({
            // 一覧を開いたまま削除操作をしても常に最新を読めるよう、スナップショットではなく
            // ゲッターを渡す（エフェクトボックスで一度踏んだ「開いた時点の値を握り続けて
            // 巻き戻る」問題と同じ轍を踏まないため）。
            getBuffs: () => store.state.tokens[tokenId]?.buffs ?? [],
            getParameters: () => store.state.tokens[tokenId]?.parameters ?? {},
            onRemove: (buffId) => {
              store.dispatch('REMOVE_BUFF', { tokenId, id: buffId });
            }
          });
        }
      },
      {
        label: 'バックヤードにしまう',
        onSelect: () => {
          store.dispatch('MOVE_TO_BACKYARD', { id: tokenId, ownerId: getLocalUserId() });
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

// コマの見た目（色・画像・トリミング・大きさ）をStateに合わせて反映する。
// 大きさはマス数(size、N×N)×GRID_SIZEのピクセル値にする。
// 画像は内側の<img class="token-img">で表示し、トリミング設定(imageCrop)を
// applyImageCropStyleで反映する（ダイアログのプレビューと同じ見た目になる）。
function applyTokenAppearance(el, tokenData) {
  const pixelSize = (tokenData.size || 1) * GRID_SIZE;
  el.style.width = `${pixelSize}px`;
  el.style.height = `${pixelSize}px`;

  el.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;

  let img = el.querySelector('.token-img');
  if (!img) {
    img = document.createElement('img');
    img.className = 'token-img';
    img.alt = '';
    el.insertBefore(img, el.firstChild);
  }

  if (tokenData.image) {
    if (img.getAttribute('src') !== tokenData.image) img.src = tokenData.image;
    img.style.display = '';
    applyImageCropStyle(img, tokenData.imageCrop);
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
}

function createTokenElement(tokenData, board) {
  const el = document.createElement('div');
  el.className = 'token';
  el.id = tokenData.id;

  const img = document.createElement('img');
  img.className = 'token-img';
  img.alt = '';
  el.appendChild(img);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'token-name';
  nameSpan.textContent = tokenData.name;
  el.appendChild(nameSpan);

  applyTokenAppearance(el, tokenData);
  bindTokenDrag(el, board);
  board.appendChild(el);
  return el;
}

// パネルの見た目（画像・大きさ）をStateに合わせて反映する。
// 大きさは cols×rows マス × GRID_SIZE のピクセル値にする。
function applyPanelAppearance(el, panelData) {
  el.style.width = `${panelData.cols * GRID_SIZE}px`;
  el.style.height = `${panelData.rows * GRID_SIZE}px`;

  if (panelData.image) {
    el.style.backgroundImage = `url('${panelData.image}')`;
  } else {
    el.style.backgroundImage = '';
  }

  // マウスオーバー時にブラウザ標準のツールチップとして表示する（画像とは独立）
  if (panelData.text) {
    el.title = panelData.text;
  } else {
    el.removeAttribute('title');
  }

  // 固定中はカーソル・枠線で見分けられるようにする（CSSは.panel-object.lockedで定義）
  el.classList.toggle('locked', !!panelData.locked);
}

// パネルのドラッグ移動。グリッド吸着し、ドロップ時に隣接判定に通らなければ元の位置へ戻す。
function bindPanelDrag(element, board) {
  element.addEventListener('mousedown', (event) => {
    const panelId = element.id;
    const currentPanelState = store.state.panels[panelId];
    if (!currentPanelState) return;

    // 固定中は移動しない。preventDefault/stopPropagationもせず、mousedownを
    // 盤面(viewport)へ伝播させて、その上のドラッグを盤面パンに委ねる。
    if (currentPanelState.locked) return;

    event.preventDefault();
    event.stopPropagation(); // 盤面パン用のmousedownに伝播させない

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startX = currentPanelState.x;
    const startY = currentPanelState.y;

    function onMouseMove(e) {
      const deltaX = (e.clientX - startClientX) / scale;
      const deltaY = (e.clientY - startClientY) / scale;
      store.dispatch('MOVE_PANEL', { id: panelId, x: startX + deltaX, y: startY + deltaY });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const latest = store.state.panels[panelId];
      if (!latest) return;

      const snappedX = Math.round(latest.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(latest.y / GRID_SIZE) * GRID_SIZE;
      const rect = { x: snappedX, y: snappedY, w: latest.cols * GRID_SIZE, h: latest.rows * GRID_SIZE };

      if (isPanelPlacementValid(rect, board, panelId)) {
        store.dispatch('MOVE_PANEL', { id: panelId, x: snappedX, y: snappedY });
      } else {
        // 連結が切れる位置には置けないので、ドラッグ開始位置へ戻す
        store.dispatch('MOVE_PANEL', { id: panelId, x: startX, y: startY });
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const panelId = element.id;
    const isLocked = !!store.state.panels[panelId]?.locked;

    showContextMenu(event.clientX, event.clientY, [
      {
        label: 'パネルを編集',
        onSelect: () => {
          const current = store.state.panels[panelId];
          if (!current) return;
          showPanelDialog({
            title: 'パネルを編集',
            initialImage: current.image,
            initialText: current.text,
            initialCols: current.cols,
            initialRows: current.rows,
            gridSize: GRID_SIZE,
            onConfirm: ({ image, text, cols, rows }) => {
              const latest = store.state.panels[panelId];
              if (!latest) return;
              if (image !== (latest.image || null)) {
                store.dispatch('SET_PANEL_IMAGE', { id: panelId, image });
              }
              if (text !== (latest.text || '')) {
                store.dispatch('SET_PANEL_TEXT', { id: panelId, text });
              }
              if (cols !== latest.cols || rows !== latest.rows) {
                store.dispatch('SET_PANEL_SIZE', { id: panelId, cols, rows });
              }
            }
          });
        }
      },
      {
        label: isLocked ? '固定を解除' : '固定',
        onSelect: () => {
          store.dispatch('SET_PANEL_LOCKED', { id: panelId, locked: !isLocked });
        }
      },
      {
        label: '削除',
        danger: true,
        onSelect: () => {
          store.dispatch('REMOVE_PANEL', { id: panelId });
        }
      }
    ]);
  });
}

function createPanelElement(panelData, board) {
  const el = document.createElement('div');
  el.className = 'panel-object';
  el.id = panelData.id;
  applyPanelAppearance(el, panelData);

  bindPanelDrag(el, board);
  board.appendChild(el);
  return el;
}

function clampPan(viewport, board) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  // パネルが盤面外に連結されている場合も見渡せるよう、配置可能領域の外接矩形を基準にする
  // （盤面外パネルはローカル座標が負にもなり得るので minX/minY も考慮する）
  const bounds = getPlacementBounds(board);

  // 画面中央より奥へ盤面の端が行かないようにする「のりしろ」
  const marginX = vw / 2;
  const marginY = vh / 2;

  const maxPanX = marginX - bounds.minX * scale;
  const minPanX = vw - marginX - bounds.maxX * scale;
  const maxPanY = marginY - bounds.minY * scale;
  const minPanY = vh - marginY - bounds.maxY * scale;

  panX = Math.min(maxPanX, Math.max(minPanX, panX));
  panY = Math.min(maxPanY, Math.max(minPanY, panY));
}

window.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('board-viewport');
  const board = document.getElementById('board');
  if (!viewport || !board) return;

  // ウィンドウサイズ変更時：カスタムサイズ未設定のデフォルト盤面は、マス整数倍サイズを
  // ビューポートに合わせて再計算する（端のマスが切れないよう保つ）。
  window.addEventListener('resize', () => {
    applyBoardBackground(board, store.state.room);
    clampPan(viewport, board);
    scheduleBoardTransform(board);
  });

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

  // 左ドラッグ：視点移動（パン）。コマ／パネルの上から始めた場合は無視して各自の移動に任せる。
  viewport.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.token')) return;
    // 未固定のパネル上から始めた場合はパネル移動に任せる。固定パネルは背景扱いなので
    // その上のドラッグは通常どおり盤面パンとして処理する。
    const panelEl = event.target.closest('.panel-object');
    if (panelEl && !store.state.panels[panelEl.id]?.locked) return;

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
      dropX - GRID_SIZE / 2,
      dropY - GRID_SIZE / 2,
      board
    );

    showContextMenu(event.clientX, event.clientY, [
      {
        label: 'キャラクターを追加',
        onSelect: () => {
          showCharacterDialog({
            activePluginId: store.state.room?.activePlugin ?? null,
            onConfirm: ({ name, image, imageCrop, size, textColor, visible, parameterOverrides, customParameters }) => {
              store.dispatch('ADD_CHARACTER', {
                id: generateTokenId(),
                name,
                image,
                imageCrop,
                size,
                textColor,
                visible,
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
        label: 'パネルを追加',
        onSelect: () => {
          // パネルの左上をクリック位置のマスに吸着させる
          const snapX = Math.round(dropX / GRID_SIZE) * GRID_SIZE;
          const snapY = Math.round(dropY / GRID_SIZE) * GRID_SIZE;

          showPanelDialog({
            title: 'パネルを追加',
            gridSize: GRID_SIZE,
            onConfirm: ({ image, text, cols, rows }) => {
              const rect = { x: snapX, y: snapY, w: cols * GRID_SIZE, h: rows * GRID_SIZE };
              if (!isPanelPlacementValid(rect, board, null)) {
                alert('パネルは盤面または他のパネルに隣接する位置に配置してください。');
                return;
              }
              store.dispatch('ADD_PANEL', {
                id: generatePanelId(),
                image,
                text,
                x: snapX,
                y: snapY,
                cols,
                rows
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
            gridSize: GRID_SIZE,
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
      dropX - GRID_SIZE / 2,
      dropY - GRID_SIZE / 2,
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

    // --- パネルの同期（コマより下に敷く背景層） ---
    const panels = state.panels || {};
    const existingPanelIds = new Set(
      Array.from(board.querySelectorAll('.panel-object')).map(el => el.id)
    );
    const panelIds = new Set(Object.keys(panels));

    existingPanelIds.forEach(id => {
      if (!panelIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    Object.values(panels).forEach(panelData => {
      let el = document.getElementById(panelData.id);
      if (!el) {
        el = createPanelElement(panelData, board);
      }
      el.style.left = `${panelData.x}px`;
      el.style.top = `${panelData.y}px`;
      applyPanelAppearance(el, panelData);
    });

    // --- コマの同期 ---
    // バックヤードにしまわれたコマは盤面には描画しない（DOM上は削除して、しまう前の状態に
    // 戻ってきても再生成できるようにする）。
    const existingIds = new Set(
      Array.from(board.querySelectorAll('.token')).map(el => el.id)
    );
    const boardTokens = Object.values(state.tokens).filter(t => !t.inBackyard);
    const stateIds = new Set(boardTokens.map(t => t.id));

    existingIds.forEach(id => {
      if (!stateIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    boardTokens.forEach(tokenData => {
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
