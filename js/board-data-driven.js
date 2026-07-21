// js/board-data-driven.js

import { EventBus } from './EventBus.js'; // 変更：EventBus.js から読み込み
import { buildDefaultParameters } from './parameters/core.js';

const GRID_SIZE = 50;
const TOKEN_SIZE = 40;
const OFFSET_PADDING = 5;
const MIN_VISIBLE_PX = 10;

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
        break;
      }
      case 'ADD_CHARACTER': {
        const { id, name, x = 0, y = 0 } = payload;
        if (nextTokensState[id]) return; // 既存IDなら何もしない

        nextTokensState[id] = Object.freeze({
          id, name, x, y,
          parameters: Object.freeze(buildDefaultParameters()),
          components: Object.freeze({}),
          actions: Object.freeze([])
        });
        EventBus.emit('CharacterCreated', { id });
        break;
      }

      case 'REMOVE_CHARACTER': {
        const { id } = payload;
        if (!nextTokensState[id]) return;
        delete nextTokensState[id];
        EventBus.emit('CharacterDeleted', { id });
        break;
      }

      case 'SET_PARAMETER': {
  // 既存パラメータの値だけ更新（source問わず）
        const { characterId, paramId, value } = payload;
        const character = nextTokensState[characterId];
        if (!character || !character.parameters[paramId]) return;

        const nextParams = { ...character.parameters };
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });

        nextTokensState[characterId] = Object.freeze({
        ...character,
        parameters: Object.freeze(nextParams)
        });
        EventBus.emit('ParameterChanged', { characterId, paramId, value });
        break;
      }

      case 'ADD_PARAMETER': {
  // ②プラグイン層・③ユーザー層はここから追加する
        const { characterId, key, label, value, source } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const paramId = `${source}:${key}`;
        if (character.parameters[paramId]) return; // 二重追加防止

        const nextParams = {
          ...character.parameters,
          [paramId]: Object.freeze({ key, label, value, source })
        };

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: Object.freeze(nextParams)
        });
        EventBus.emit('ParameterChanged', { characterId, paramId, value });
        break;
      }

      case 'REMOVE_PARAMETER': {
        const { characterId, paramId } = payload;
        const character = nextTokensState[characterId];
        if (!character || !character.parameters[paramId]) return;

  // core由来のパラメータは削除させない（プラグイン層・ユーザー層のみ削除可）
        if (character.parameters[paramId].source === 'core') {
          console.warn('[Guard] coreパラメータは削除できません:', paramId);
          return;
        }

        const nextParams = { ...character.parameters };
        delete nextParams[paramId];

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: Object.freeze(nextParams)
        });
        break;
      }
      default:
        return;
    }

    this.#state = this.#createProtectedProxy({
      ...prevState,
      tokens: Object.freeze(nextTokensState)
    });

    EventBus.emit('STATE_CHANGED', this.#state);
  }

  init() {
    EventBus.emit('STATE_CHANGED', this.#state);
  }
}

export const store = new ImmutableStore({
  tokens: {
    'token-lily': { id: 'token-lily', name: 'リリィ', x: 100, y: 150 },
    'token-ragna': { id: 'token-ragna', name: 'ラグナ', x: 300, y: 200 }
  }
});

// 状態変更を受けて描画更新
EventBus.subscribe('STATE_CHANGED', (state) => {
  Object.values(state.tokens).forEach(tokenData => {
    const element = document.getElementById(tokenData.id);
    if (element) {
      element.style.left = `${tokenData.x}px`;
      element.style.top = `${tokenData.y}px`;
    }
  });
});

// D&D イベント制御
window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('board');
  if (!board) return;

  const tokens = document.querySelectorAll('.token');

  tokens.forEach(token => {
    token.addEventListener('mousedown', (event) => {
      event.preventDefault();

      const tokenId = token.id;
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
        const snappedX = Math.round(latestState.x / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;
        const snappedY = Math.round(latestState.y / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;

        const finalX = Math.max(minX, Math.min(snappedX, maxX));
        const finalY = Math.max(minY, Math.min(snappedY, maxY));

        store.dispatch('MOVE_TOKEN', { id: tokenId, x: finalX, y: finalY });
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
});

window.moveToken = (id, x, y) => {
  store.dispatch('MOVE_TOKEN', { id, x, y });
};