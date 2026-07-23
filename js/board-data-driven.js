// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';
import { showContextMenu } from './context-menu.js';
import { showCharacterDialog, showCharacterEditDialog } from './character-dialog.js';
import {
  buildCharacterParametersForPlugin, buildRoomParameters, listPlugins, applyPluginDerivedParameters,
  pluginHasCharacterImport, importCharacterJsonForPlugin
} from './parameters/registry.js';
import { pickFileAsDataUrl, pickFileAsText } from './file-uploader.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
export { listPlugins };

const GRID_SIZE = 50;
const TOKEN_SIZE = 40;
const OFFSET_PADDING = 5;
export const DEFAULT_TOKEN_COLOR = 'transparent';
// #boardのCSS側で定義しているグリッド線レイヤー。背景画像を差し替える際もこの2層は維持する。
const BOARD_GRID_LAYERS = "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)";

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
    newParameters: importResult.newParameters
  });
}

let tokenIdCounter = 0;

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
    const activePlugin = prevState.room?.activePlugin;

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
        const {
          id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR, image = null,
          parameterOverrides = {}, customParameters = []
        } = payload;
        if (!id || !name) return;
        if (nextTokensState[id]) return;
        
        const parameters = {
          ...buildDefaultParameters(),
          ...buildCharacterParametersForPlugin(activePlugin)
        };

        Object.entries(parameterOverrides).forEach(([paramId, value]) => {
          if (parameters[paramId]) {
            parameters[paramId] = Object.freeze({ ...parameters[paramId], value });
          }
        });

        customParameters.forEach(({ key, label, value, visible = true }) => {
          const paramId = `user:${key}`;
          parameters[paramId] = Object.freeze({ key, label, value, source: 'user', visible });
        });

        // プラグインの自動計算を適用（activePlugin と parameters を正しく渡す）
        const finalParameters = applyPluginDerivedParameters(activePlugin, parameters);

        nextTokensState[id] = Object.freeze({
          id, name, x, y, color, image,
          parameters: finalParameters, // ← 適用後のパラメータをセット
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

      case 'SET_CHARACTER_IMAGE': {
        const { id, image } = payload;
        if (!nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          image: image || null
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // 外部JSON（汎用/プラグイン拡張どちらも）の取り込み結果をまとめて適用する。
      // Core側はvalueOverrides/labelOverrides/newParametersの意味を解釈せず、
      // 既存paramIdへの反映・新規paramIdの追加という機械的な処理のみ行う。
      case 'IMPORT_CHARACTER_DATA': {
        const { id, name, valueOverrides = {}, labelOverrides = {}, newParameters = {} } = payload;
        const character = nextTokensState[id];
        if (!character) return;

        let nextParams = { ...character.parameters };

        Object.entries(valueOverrides).forEach(([paramId, value]) => {
          if (nextParams[paramId] && typeof value === 'number') {
            nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });
          }
        });

        Object.entries(labelOverrides).forEach(([paramId, label]) => {
          if (nextParams[paramId] && typeof label === 'string') {
            nextParams[paramId] = Object.freeze({ ...nextParams[paramId], label });
          }
        });

        Object.entries(newParameters).forEach(([paramId, paramDef]) => {
          nextParams[paramId] = Object.freeze({ ...paramDef });
        });

        nextParams = applyPluginDerivedParameters(activePlugin, nextParams);

        nextTokensState[id] = Object.freeze({
          ...character,
          name: name || character.name,
          parameters: nextParams
        });

        this.#commit(prevState, nextTokensState);
        EventBus.emit('CharacterImported', { id });
        return;
      }

      case 'SET_PARAMETER': {
        const { characterId, paramId, value } = payload;
        const character = nextTokensState[characterId];
        if (!character || !character.parameters[paramId]) return;

        if (character.parameters[paramId].editable === false) {
          console.warn('[Guard] このパラメータは直接編集できません:', paramId);
          return;
        }

        const nextParams = { ...character.parameters };
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });

        // プラグインの自動計算を通して新パラメータを取得
        const calculatedParams = applyPluginDerivedParameters(activePlugin, nextParams);

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: calculatedParams
        });

        this.#commit(prevState, nextTokensState);
        EventBus.emit('ParameterChanged', { characterId, paramId, value });
        return;
      }

      case 'SET_PARAMETER_VISIBILITY': {
        const { characterId, paramId, visible } = payload;
        const character = nextTokensState[characterId];
        if (!character || !character.parameters[paramId]) return;

        const nextParams = { ...character.parameters };
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], visible });

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: Object.freeze(nextParams)
        });

        this.#commit(prevState, nextTokensState);
        EventBus.emit('ParameterVisibilityChanged', { characterId, paramId, visible });
        return;
      }

      case 'REMOVE_PARAMETER': {
        const { characterId, paramId } = payload;
        const character = nextTokensState[characterId];
        if (!character || !character.parameters[paramId]) return;

        if (character.parameters[paramId].locked) {
          console.warn('[Guard] このパラメータは削除できません:', paramId);
          return;
        }

        const nextParams = { ...character.parameters };
        delete nextParams[paramId];

        // 自動計算の再評価
        const calculatedParams = applyPluginDerivedParameters(activePlugin, nextParams);

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: calculatedParams
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      case 'ADD_PARAMETER': {
        const { characterId, key, label, value, visible = true } = payload;
        if (!key) return;
        const character = nextTokensState[characterId];
        if (!character) return;

        const paramId = `user:${key}`;
        if (character.parameters[paramId]) return;

        const nextParams = {
          ...character.parameters,
          [paramId]: Object.freeze({ key, label, value, source: 'user', locked: false, editable: true, visible })
        };

        // 自動計算の適用
        const calculatedParams = applyPluginDerivedParameters(activePlugin, nextParams);

        nextTokensState[characterId] = Object.freeze({
          ...character,
          parameters: calculatedParams
        });
        this.#commit(prevState, nextTokensState);
        return;
      }

      case 'SET_ACTIVE_PLUGIN': {
        const { pluginId } = payload;
        const prevRoom = prevState.room;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({
            ...prevRoom,
            activePlugin: pluginId,
            parameters: buildRoomParameters(pluginId) // プラグイン切替時、ルーム変数を作り直す
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        EventBus.emit('ActivePluginChanged', { pluginId });
        return;
      }

      case 'SET_BACKGROUND_IMAGE': {
        const { imageUrl } = payload;
        const room = prevState.room;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({ ...room, backgroundImage: imageUrl || null })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        EventBus.emit('BackgroundImageChanged', { imageUrl });
        return;
      }

      case 'SET_ROOM_PARAMETER': {
        const { paramId, value } = payload;
        const room = prevState.room;
        if (!room.parameters[paramId]) return;

        if (room.parameters[paramId].editable === false) {
          console.warn('[Guard] このルーム変数は直接編集できません:', paramId);
          return;
        }

        const nextParams = { ...room.parameters };
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({ ...room, parameters: Object.freeze(nextParams) })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        EventBus.emit('RoomParameterChanged', { paramId, value });
        return;
      }

      case 'ADD_ROOM_PARAMETER': {
        const { key, label, value } = payload;
        if (!key) return;
        const room = prevState.room;
        const paramId = `user:${key}`;
        if (room.parameters[paramId]) return;

        const nextParams = {
          ...room.parameters,
          [paramId]: Object.freeze({ key, label, value, source: 'user', locked: false, editable: true })
        };

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          room: Object.freeze({ ...room, parameters: Object.freeze(nextParams) })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'REMOVE_ROOM_PARAMETER': {
        const { paramId } = payload;
        const room = prevState.room;
        if (!room.parameters[paramId]) return;

        if (room.parameters[paramId].locked) {
          console.warn('[Guard] このルーム変数は削除できません:', paramId);
          return;
        }

        const nextParams = { ...room.parameters };
        delete nextParams[paramId];

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          room: Object.freeze({ ...room, parameters: Object.freeze(nextParams) })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }
      case 'SET_ACTIVE_PLUGIN': {
        const { pluginId } = payload;
        const prevRoom = prevState.room;

        // システムプラグインが切り替わった際、全キャラクターの自動計算値も再計算
        Object.keys(nextTokensState).forEach(id => {
          const char = nextTokensState[id];
          const updatedParams = applyPluginDerivedParameters(pluginId, char.parameters);
          nextTokensState[id] = Object.freeze({
            ...char,
            parameters: updatedParams
          });
        });

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({
            ...prevRoom,
            activePlugin: pluginId,
            parameters: buildRoomParameters(pluginId)
          }),
          tokens: Object.freeze(nextTokensState)
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        EventBus.emit('ActivePluginChanged', { pluginId });
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
room: {
    activePlugin: null,   // 例: 'DX3'。null = プラグイン未選択（Coreパラメータのみ）
    parameters: {},        // ルーム変数（後述）
    backgroundImage: null  // null = CSS側のデフォルト背景をそのまま使う
  },

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

// 背景画像を盤面に反映する。imageUrlが無い場合はCSS側のデフォルト背景に戻す。
function applyBoardBackground(board, imageUrl) {
  if (!imageUrl) {
    board.style.backgroundImage = '';
    board.style.backgroundSize = '';
    board.style.backgroundPosition = '';
    board.style.backgroundRepeat = '';
    return;
  }

  board.style.backgroundImage = `${BOARD_GRID_LAYERS}, url('${imageUrl}')`;
  board.style.backgroundSize = '50px 50px, 50px 50px, cover';
  board.style.backgroundPosition = '0 0, 0 0, center';
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
          store.dispatch('SET_BACKGROUND_IMAGE', { imageUrl: picked.dataUrl });
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
    applyBoardBackground(board, state.room?.backgroundImage);

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