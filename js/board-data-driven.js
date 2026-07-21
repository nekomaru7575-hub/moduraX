// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';

const GRID_SIZE = 50;
const TOKEN_SIZE = 40;
const OFFSET_PADDING = 5;
const MIN_VISIBLE_PX = 10;
const DEFAULT_TOKEN_COLOR = '#ff4757';

let tokenIdCounter = 0;

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
        if (nextTokensState[id]) return; // 既存IDなら何もしない

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

// キャラクター登録UI用のID発行
export function generateTokenId() {
  tokenIdCounter += 1;
  return `token-user-${Date.now()}-${tokenIdCounter}`;
}

// --- 描画: STATE_CHANGEDを受けてDOMをStateに同期する ---

function bindTokenDrag(element, board) {
  element.addEventListener('mousedown', (event) => {
    event.preventDefault();

    const tokenId = element.id;
    const currentTokenState = store.state.tokens[tokenId];
    if (!currentTokenState) return;

    const boardRect = board.getBoundingClientRect();

    const minX = -TOKEN_SIZE + MIN_VISIBLE_PX;
    const maxX = boardRect.width - MIN_VISIBLE_PX;
    const minY = -TOKEN_SIZE + MIN_VISIBLE_PX;
    const maxY = boardRect.height - MIN_VISIBLE_PX;

    const offsetX = event.clientX - currentTokenState.x;
    const offsetY = event.clientY - currentTokenState.y;

    function onMouseMove(e) {
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;

      const clampedX = Math.max(minX, Math.min(newX, maxX));
      const clampedY = Math.max(minY, Math.min(newY, maxY));

      store.dispatch('MOVE_TOKEN', { id: tokenId, x: clampedX, y: clampedY });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const latestState = store.state.tokens[tokenId];
      if (!latestState) return; // ドラッグ中に削除された場合

      const snappedX = Math.round(latestState.x / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;
      const snappedY = Math.round(latestState.y / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;

      const finalX = Math.max(minX, Math.min(snappedX, maxX));
      const finalY = Math.max(minY, Math.min(snappedY, maxY));

      store.dispatch('MOVE_TOKEN', { id: tokenId, x: finalX, y: finalY });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
  const board = document.getElementById('board');
  if (!board) return;

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const existingIds = new Set(
      Array.from(board.querySelectorAll('.token')).map(el => el.id)
    );
    const stateIds = new Set(Object.keys(state.tokens));

    // Stateから消えたトークンのDOMを削除
    existingIds.forEach(id => {
      if (!stateIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    // Stateにあるトークンを生成 or 更新
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
