// js/game-store.js
// 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない
// 純粋なモジュール。ブラウザ（board-data-driven.js経由）とNode（server/index.js）の
// 両方からimportして、同じreducerを共有するために切り出している。

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';
import {
  buildCharacterParametersForPlugin, buildRoomParameters, listPlugins, applyPluginDerivedParameters
} from './parameters/registry.js';

export { listPlugins };

export const DEFAULT_TOKEN_COLOR = 'transparent';

let tokenIdCounter = 0;

export function generateTokenId() {
  tokenIdCounter += 1;
  return `token-user-${Date.now()}-${tokenIdCounter}`;
}

const MAIN_CHAT_TAB_ID = 'main';

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

  // サーバーから受け取った最新状態で、ローカルの状態をまるごと置き換える
  // （ネットワーク同期の初期化・再接続時にのみ使う）
  hydrate(newState) {
    this.#state = this.#createProtectedProxy(newState);
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
        const { id, name, valueOverrides = {}, labelOverrides = {}, newParameters = {}, components = {} } = payload;
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

        // componentsの中身（ロイス・エフェクト・コンボ等の複雑なデータ）はCoreは解釈せず、
        // componentKey単位でそのまま置き換えるだけ
        const nextComponents = Object.freeze({ ...character.components, ...components });

        nextTokensState[id] = Object.freeze({
          ...character,
          name: name || character.name,
          parameters: nextParams,
          components: nextComponents
        });

        this.#commit(prevState, nextTokensState);
        EventBus.emit('CharacterImported', { id });
        return;
      }

      // ロイス・エフェクト・コンボのような「ボックス」データを丸ごと更新する。
      // Coreはvalueの中身を解釈せず、componentKeyに紐づく値をそのまま置き換える。
      case 'SET_COMPONENT': {
        const { id, componentKey, value } = payload;
        const character = nextTokensState[id];
        if (!character || !componentKey) return;

        nextTokensState[id] = Object.freeze({
          ...character,
          components: Object.freeze({ ...character.components, [componentKey]: value })
        });

        this.#commit(prevState, nextTokensState);
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

      // システムプラグインの切り替え。既存キャラ全員の自動計算値も再計算した上で
      // ルーム変数を作り直す。
      case 'SET_ACTIVE_PLUGIN': {
        const { pluginId } = payload;
        const prevRoom = prevState.room;

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

      // チャットタブを1つ追加する。idは呼び出し側（main.js）がタイムスタンプ等で生成する。
      case 'ADD_CHAT_TAB': {
        const { id, name } = payload;
        if (!id || !name) return;
        if (prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          chatTabs: Object.freeze([...prevState.chatTabs, Object.freeze({ id, name })]),
          chatLogs: Object.freeze({ ...prevState.chatLogs, [id]: Object.freeze([]) })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      // 指定タブのログにメッセージを1件追加する。存在しないタブIDは無視する。
      case 'ADD_CHAT_MESSAGE': {
        const { tabId, entry } = payload;
        if (!tabId || !entry || !prevState.chatLogs[tabId]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          chatLogs: Object.freeze({
            ...prevState.chatLogs,
            [tabId]: Object.freeze([...prevState.chatLogs[tabId], Object.freeze({ ...entry })])
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
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

  tokens: {},

  // チャットタブ（Mainタブは常に存在する既定タブ）とタブごとのログ履歴
  chatTabs: [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
  chatLogs: { [MAIN_CHAT_TAB_ID]: [] }
});
