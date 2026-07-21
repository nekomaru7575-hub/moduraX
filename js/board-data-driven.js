// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';
import { showContextMenu } from './context-menu.js';

const GRID_SIZE = 50;
const TOKEN_SIZE = 40;
const OFFSET_PADDING = 5;
const DEFAULT_TOKEN_COLOR = '#ff4757';

let tokenIdCounter = 0;

// カメラ（ズーム・パン）の状態。Storeの状態ではなく、あくまでローカルな見た目の変更。
// 他プレイヤーの視点には影響しない。
let scale = 1;
let panX = 0;
let panY = 0;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.1;

class ImmutableStore {
  #state;

  constructor(initialState) {
    this.#state = this.#createProtectedProxy(initialState);
  }

  get state() {
    return this.#state;
  }

  #createProtectedProxy(data) {
    const frozenData = Object.freeze({ ...data });
    return new Proxy(frozenData, {
      set() {
        throw new Error("[State Protected] 状態の直接書き換えは禁止されています。dispatch()を使用してください。");
      },
      deleteProperty() {
        throw new Error("[State Protected] 状態の直接削除は禁止されています。dispatch()を使用してください。");
      }
    });
  }

  #commit(prevState, nextTokensState) {
    this.#state = this.#createProtectedProxy({
      ...prevState,
      tokens: Object.freeze(nextTokensState)
    });
    EventBus.emit('STATE_CHANGED', this.#state);
  }

  dispatch(action, payload) {
    const prevState = this.#state;
    let nextTokensState = { ...prevState.tokens };

    switch (action) {
      case 'MOVE_TOKEN': {
        const { id, x, y } = payload;
        if (!nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          x,
          y
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      case 'ADD_CHARACTER': {
        const { id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR } = payload;
        if (!id || !name) return;
        if (nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          id,
          name,
          x,
          y,
          color,
          parameters: buildDefaultParameters(),
          components: Object.freeze({}),
          actions: Object.freeze([])
        });

        this.#commit(prevState, nextTokensState);
        EventBus.emit('CharacterCreated', { id });
        return;
      }

      case 'REMOVE_CHARACTER': {
        const { id } = payload;
        if (!nextTokensState[id]) return;
        delete nextTokensState[id];

        this.#commit(prevState, nextTokensState);
        EventBus.emit('CharacterDeleted', { id });
        return;
      }

      case 'RENAME_CHARACTER': {
        const { id, name } = payload;
        if (!nextTokensState[id] || !name) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          name
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      default:
        return;
    }
  }

  init() {
    EventBus.emit('STATE_CHANGED', this.#state);
  }
}

export const store = new ImmutableStore({
  tokens: {
    'token-lily': {
      id: 'token-lily', name: 'リリィ', x: 100, y: 150, color: '#ff4757',
      parameters: buildDefaultParameters(),
      components: Object.freeze({}),
      actions: Object.freeze([])
    },
    'token-ragna': {
      id: 'token-ragna', name: 'ラグナ', x: 300, y: 200, color: '#2ed573',
      parameters: buildDefaultParameters(),
      components: Object.freeze({}),
      actions: Object.freeze([])
    }
  }
});

export function generateTokenId() {
  tokenIdCounter += 1;
  return `token-user-${Date.now()}-${tokenIdCounter}`;
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

function createTokenElement(tokenData, board) {
  const el = document.createElement('div');
  el.className = 'token';
  el.id = tokenData.id;
  el.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'token-name';
  nameSpan.textContent = tokenData.name;
  el.appendChild(nameSpan);

  bindTokenDrag(el, board);
  board.appendChild(el);
  return el;
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
    const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

    // マウスの下にある盤面上の点が、ズーム後も同じ画面位置に来るようパンを再計算
    panX = cx - (cx - panX) * (scale / oldScale);
    panY = cy - (cy - panY) * (scale / oldScale);

    applyBoardTransform(board);
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
          const name = prompt('新しいキャラクター名を入力してください');
          if (name && name.trim() !== '') {
            store.dispatch('ADD_CHARACTER', {
              id: generateTokenId(),
              name: name.trim(),
              x: Math.round(clampedX),
              y: Math.round(clampedY)
            });
          }
        }
      }
    ]);
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
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