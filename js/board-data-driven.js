// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showCharacterDialog, showCharacterEditDialog, applyImageCropStyle, applyCharacterEditResult } from './character-dialog.js';
import { showBackgroundDialog } from './background-dialog.js';
import { showPanelDialog } from './panel-dialog.js';
import { showAddBuffDialog, showBuffListDialog } from './buff-dialog.js';
import { pluginHasCharacterImport, importCharacterJsonForPlugin } from './parameters/registry.js';
import { pickFileAsText } from './file-uploader.js';
import { adoptImageIntoRoom } from './image-upload.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { getLocalUserId, getCurrentParticipantId } from './local-identity.js';
import { showAudienceDialog } from './audience-picker.js';
import { canView, isGm } from './visibility.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';
import { rollBCDice } from './BCdice.js';
import { isTokenSnapshot, buildTokenSnapshot, downloadJSON, parseJsonText } from './character-snapshot.js';
import {
  store, generateTokenId, generatePanelId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS
} from './game-store.js';
export {
  store, generateTokenId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS
};

// 浮動パネル（チャットパレット・情報・キャラクター一覧）。盤外の右クリックメニューから
// 表示/非表示を切り替えるためだけに参照する。importは 生成側 → board-data-driven.js の向きに
// 張られている（逆向きは循環importになる）ので、実体は起動時に注入してもらう。
// 生成側はパネルごとに違う：チャットパレットはjs/main.js、情報はjs/info-panel.js、
// キャラクター一覧はjs/character-panel.js。
let chatPaletteController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setChatPaletteController(controller) {
  chatPaletteController = controller;
}

let infoPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setInfoPanelController(controller) {
  infoPanelController = controller;
}

let characterPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setCharacterPanelController(controller) {
  characterPanelController = controller;
}

const GRID_SIZE = 25;
// #boardのCSS側で定義しているグリッド線レイヤー。背景画像を差し替える際もこの2層は維持する。
const BOARD_GRID_LAYERS = "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)";

// ルームにプラグインが適用されていれば、そのプラグイン独自の拡張JSON読み込みを使う。
// 未適用の場合はCore側の汎用読み込み（本アプリ自身の保存形式）にフォールバックする。
function resolveCharacterImport(json) {
  const activePluginId = store.state.room?.activePlugin ?? null;
  return (activePluginId && pluginHasCharacterImport(activePluginId))
    ? importCharacterJsonForPlugin(activePluginId, json)
    : importCharacterJsonGeneric(json);
}

// コマのスナップショットに入っている画像を、この部屋の持ち物にしてから返す。
// JSONにはデータURLや別の部屋のURLが入っていることがあるため（js/image-upload.js参照）。
async function adoptSnapshotImage(snapshot) {
  if (!snapshot?.image) return snapshot;
  return { ...snapshot, image: await adoptImageIntoRoom(snapshot.image, 'token') };
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
    const token = store.state.tokens[tokenId];
    if (!token) return;

    const myParticipantId = getCurrentParticipantId();
    const amGm = isGm(store.state.participants, myParticipantId);
    const canOperate = canOperateToken(token, myParticipantId, amGm);
    // 権限が無い項目は消さずに押せない状態で出し、理由をツールチップで示す
    // （「キャラクター更新」だけは開けて、同じ理由をダイアログの見出し下に出す）
    const denyReason = canOperate ? undefined : `${ownerNameOf(token)}のコマです（表示のみ。編集できるのは持ち主とGMです）`;

    showContextMenu(event.clientX, event.clientY, [
      {
        label: `所有者: ${ownerNameOf(token)}`,
        disabled: true,
        onSelect: () => {}
      },
      {
        // 見るだけなら誰でもできる。編集できるかはcanEditとしてダイアログへ渡し、
        // 中身は同じまま入力だけを封じる（js/character-dialog.js参照）
        label: canOperate ? 'キャラクター更新' : 'キャラクターを表示',
        onSelect: () => {
          const current = store.state.tokens[tokenId];
          if (!current) return;

          showCharacterEditDialog({
            character: current,
            canEdit: canOperate,
            readOnlyReason: denyReason,
            activePluginId: store.state.room?.activePlugin ?? null,
            participants: store.state.participants ?? {},
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
            onConfirm: (result) => applyCharacterEditResult(store, tokenId, result)
          });
        }
      },
      {
        label: 'コマをJSONで保存',
        onSelect: () => {
          const current = store.state.tokens[tokenId];
          if (!current) return;

          downloadJSON(`${current.name || 'character'}.json`, buildTokenSnapshot(current));
        }
      },
      {
        label: 'JSONを読み込む',
        disabled: !canOperate,
        title: denyReason,
        onSelect: async () => {
          const picked = await pickFileAsText({ accept: 'application/json' });
          if (!picked) return;

          const json = parseJsonText(picked.text);
          if (!json) return;

          if (isTokenSnapshot(json)) {
            store.dispatch('RESTORE_CHARACTER_SNAPSHOT', {
              id: tokenId, snapshot: await adoptSnapshotImage(json)
            });
            return;
          }

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
            // プラグイン独自の追加入力欄（DX3ならクリティカル値の下限）を出すために渡す
            activePluginId: store.state.room?.activePlugin ?? null,
            onConfirm: ({ name, paramId, delta, expirePhase, meta }) => {
              store.dispatch('ADD_BUFF', {
                tokenId, id: generateBuffId(), name, paramId, delta, expirePhase, meta
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
            activePluginId: store.state.room?.activePlugin ?? null,
            onRemove: (buffId) => {
              store.dispatch('REMOVE_BUFF', { tokenId, id: buffId });
            }
          });
        }
      },
      // 所有権の獲得・放棄。所有者がいないコマは誰でも自分のものにでき、
      // 自分のコマ（GMなら他人のコマも）は手放して所有者なしに戻せる。
      ...(!token.ownerId && myParticipantId ? [{
        label: '自分のコマにする',
        onSelect: () => {
          store.dispatch('SET_CHARACTER_OWNER', { id: tokenId, ownerId: myParticipantId });
        }
      }] : []),
      ...(token.ownerId && (token.ownerId === myParticipantId || amGm) ? [{
        label: token.ownerId === myParticipantId ? 'コマを手放す' : `${ownerNameOf(token)}から取り上げる`,
        onSelect: () => {
          store.dispatch('SET_CHARACTER_OWNER', { id: tokenId, ownerId: null });
        }
      }] : []),
      {
        label: 'バックヤードにしまう',
        disabled: !canOperate,
        title: denyReason,
        onSelect: () => {
          // しまうと同時に自分のコマになる（表示名未設定のゲストは所有者なしのまま、
          // 従来どおりブラウザ単位の棚に入る）
          store.dispatch('MOVE_TO_BACKYARD', {
            id: tokenId, participantId: myParticipantId, localUserId: getLocalUserId()
          });
        }
      },
      {
        label: '削除',
        danger: true,
        disabled: !canOperate,
        title: denyReason,
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

  // マウスオーバー時にブラウザ標準のツールチップとして表示する（画像とは独立）。
  // テキストに公開先の指定がある場合、宛先に入っていない人には出さない
  // （絵は見えるがメモはGMだけが読める、といった使い方のため）。
  if (panelData.text && canView(panelData.textAudience, getCurrentParticipantId())) {
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
            initialKeepOnSceneChange: !!current.keepOnSceneChange,
            gridSize: GRID_SIZE,
            onConfirm: ({ image, text, cols, rows, keepOnSceneChange }) => {
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
              if (keepOnSceneChange !== !!latest.keepOnSceneChange) {
                store.dispatch('SET_PANEL_KEEP_ON_SCENE_CHANGE', { id: panelId, keepOnSceneChange });
              }
            }
          });
        }
      },
      {
        label: 'テキストの公開先',
        onSelect: () => {
          const current = store.state.panels[panelId];
          if (!current) return;
          showAudienceDialog({
            title: 'パネルのテキストの公開先',
            description: 'マウスオーバーで出るテキストを誰に見せるかを選びます（画像は常に全員に見えます）。',
            audience: current.textAudience ?? null,
            participants: store.state.participants ?? {},
            myParticipantId: getCurrentParticipantId(),
            onConfirm: (textAudience) => {
              store.dispatch('SET_PANEL_TEXT_AUDIENCE', { id: panelId, textAudience });
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

// コマの更新・JSON読み込み・削除・バックヤードへの回収ができるか。
// 所有者がいないコマは誰でも触れる。盤面上の移動だけはこの判定を通さない（誰でも動かせる）。
function canOperateToken(token, myParticipantId, amGm) {
  if (!token) return false;
  if (!token.ownerId) return true;
  if (amGm) return true;
  return token.ownerId === myParticipantId;
}

// 表示用の持ち主の名前。参加者一覧から引けなければ（表示名を変えた・削除された等）
// IDのままでは意味が伝わらないので「不明な参加者」と出す。
function ownerNameOf(token) {
  if (!token?.ownerId) return 'なし';
  return store.state.participants?.[token.ownerId]?.nickname || '不明な参加者';
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

    // 背景と盤面サイズは部屋全体の見た目を左右するのでGM限定（サーバー側も
    // server/index.jsのGM_ONLY_ACTIONSでSET_BOARD_BACKGROUNDを弾く）。
    // 項目自体は残して、押せない理由をツールチップで示す。
    const canSetBackground = canOperateAsGm();

    showContextMenu(event.clientX, event.clientY, [
      {
        label: 'キャラクターを追加',
        onSelect: () => {
          showCharacterDialog({
            activePluginId: store.state.room?.activePlugin ?? null,
            participants: store.state.participants ?? {},
            onConfirm: ({ name, image, imageCrop, size, textColor, visible, parameterOverrides, parameterVisibility, parameterAudience, customParameters }) => {
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
                // 登録した人のコマにする（表示名未設定なら所有者なし＝誰でも触れる）。
                // NPC等をみんなで触りたい場合は「コマを手放す」で外す。
                ownerId: getCurrentParticipantId(),
                parameterOverrides,
                parameterVisibility,
                parameterAudience,
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
            onConfirm: ({ image, text, cols, rows, keepOnSceneChange }) => {
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
                rows,
                keepOnSceneChange
              });
            }
          });
        }
      },
      {
        label: '背景設定',
        disabled: !canSetBackground,
        title: canSetBackground ? undefined : GM_ONLY_REASON,
        onSelect: () => {
          const room = store.state.room;
          // boardWidth/boardHeightがnull＝自動（ビューポートに合わせる）。
          // 自動のときは、今画面に出ている実サイズを数値欄の初期値として渡す。
          const auto = !room.boardWidth || !room.boardHeight;

          showBackgroundDialog({
            initialImage: room.backgroundImage,
            initialImageKey: room.backgroundImageKey,
            initialCols: auto ? null : Math.round(room.boardWidth / GRID_SIZE),
            initialRows: auto ? null : Math.round(room.boardHeight / GRID_SIZE),
            fallbackCols: Math.max(1, Math.round(board.offsetWidth / GRID_SIZE)),
            fallbackRows: Math.max(1, Math.round(board.offsetHeight / GRID_SIZE)),
            initialKeepOnSceneChange: !!room.keepBackgroundOnSceneChange,
            gridSize: GRID_SIZE,
            onConfirm: (result) => store.dispatch('SET_BOARD_BACKGROUND', result)
          });
        }
      },
      // チャットパレットは浮動パネルなので、閉じたあと戻す手段がここだけになる。
      // パネルの生成はjs/main.js側なので、実体はsetChatPaletteControllerで受け取る。
      ...(chatPaletteController ? [{
        label: chatPaletteController.isVisible() ? 'チャットパレットを隠す' : 'チャットパレットを表示',
        onSelect: () => chatPaletteController.toggle()
      }] : []),
      // 情報パネルは既定で非表示なので、ここが唯一の出しどころになる（生成はjs/info-panel.js）。
      ...(infoPanelController ? [{
        label: infoPanelController.isVisible() ? '情報を隠す' : '情報を表示',
        onSelect: () => infoPanelController.toggle()
      }] : []),
      // キャラクター一覧も浮動パネル（生成はjs/character-panel.js）。バックヤードは
      // このパネルのタブに統合したので、しまったコマを取り出す導線もここから辿る。
      ...(characterPanelController ? [{
        label: characterPanelController.isVisible() ? 'キャラクター一覧を隠す' : 'キャラクター一覧を表示',
        onSelect: () => characterPanelController.toggle()
      }] : [])
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
    const json = parseJsonText(text);
    if (!json) return;

    // コマ丸ごとのスナップショット（本アプリの「コマをJSONで保存」で出力したもの）は
    // 通常のインポート（値の上書きのみ）とは別に、見た目・構成要素を含めて丸ごと復元する。
    const isSnapshot = isTokenSnapshot(json);
    const importResult = isSnapshot ? null : resolveCharacterImport(json);
    if (!isSnapshot && !importResult) {
      alert('このJSONを読み込めませんでした。');
      return;
    }

    // スナップショットの画像はこの部屋の持ち物にしてから使う（adoptSnapshotImage参照）
    const snapshot = isSnapshot ? await adoptSnapshotImage(json) : null;

    const droppedTokenEl = event.target.closest('.token');
    if (droppedTokenEl) {
      if (isSnapshot) {
        store.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: droppedTokenEl.id, snapshot });
      } else {
        dispatchCharacterImport(droppedTokenEl.id, importResult);
      }
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
      name: (isSnapshot ? json.name : importResult.name) || '新規キャラクター',
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      ownerId: getCurrentParticipantId() // 読み込んだ人のコマにする（作成時と同じ扱い）
    });

    if (isSnapshot) {
      store.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: newId, snapshot });
    } else {
      dispatchCharacterImport(newId, importResult);
    }
  });

  // 名乗る人が変わると「テキストが読めるパネル」も変わるので、見た目を作り直す
  // （状態自体は変わらないためSTATE_CHANGEDでは拾えない）。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    Object.values(store.state.panels || {}).forEach(panelData => {
      const el = document.getElementById(panelData.id);
      if (el) applyPanelAppearance(el, panelData);
    });
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
