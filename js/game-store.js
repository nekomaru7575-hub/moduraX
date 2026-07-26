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

let panelIdCounter = 0;

export function generatePanelId() {
  panelIdCounter += 1;
  return `panel-user-${Date.now()}-${panelIdCounter}`;
}

let buffIdCounter = 0;

export function generateBuffId() {
  buffIdCounter += 1;
  return `buff-user-${Date.now()}-${buffIdCounter}`;
}

// バフ/デバフの終了条件（フェーズ）のラベル。ログ表示・チャットコマンド解釈の両方で使う。
export const BUFF_PHASE_LABELS = { scene: 'シーン', round: 'ラウンド', scenario: 'シナリオ', check: '判定', process: 'プロセス' };

// 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。
// パラメータが存在しないtokenId/paramIdの組み合わせではundefinedを返す（＝呼び出し側は無視すればよい）。
// baseとなるparameters[paramId].value自体は書き換えない。SET_PARAMETERや「+パラメータ(n)」
// コマンドのような直接編集は常に基礎値を対象にする（実効値を対象にすると編集の度にバフ分が
// 基礎値へ混入し、加算が二重になってしまうため）。
export function getEffectiveParameterValue(token, paramId) {
  const param = token?.parameters?.[paramId];
  if (!param) return undefined;

  // 文字列値のカスタム変数にはバフ加算の意味がない（"abc" + 0 が文字列連結になり
  // 値が壊れる）ため、数値でない場合は基礎値をそのまま返す。
  if (typeof param.value !== 'number') return param.value;

  const buffTotal = (token.buffs || [])
    .filter(b => b.paramId === paramId)
    .reduce((sum, b) => sum + b.delta, 0);

  return param.value + buffTotal;
}

const MAIN_CHAT_TAB_ID = 'main';

export class ImmutableStore {
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
  // （ネットワーク同期の初期化・再接続時にのみ使う）。
  // この機能より前に保存された状態にはpanels等が無いため、欠けているキーを補う。
  hydrate(newState) {
    const normalized = {
      ...newState,
      tokens: newState.tokens || {},
      panels: newState.panels || {},
      chatTabs: newState.chatTabs || [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
      chatLogs: newState.chatLogs || { [MAIN_CHAT_TAB_ID]: [] },
      // この機能より前に保存された状態にはroom.bcdiceSystem/nameが無いため、既定値を補う
      room: {
        ...newState.room,
        name: newState.room?.name || '',
        bcdiceSystem: newState.room?.bcdiceSystem || DEFAULT_BCDICE_SYSTEM
      }
    };
    this.#state = this.#createProtectedProxy(normalized);
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
          id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR, image = null, size = 1,
          imageCrop = null, parameterOverrides = {}, customParameters = []
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
          id, name, x, y, color, image, size: Math.max(1, Math.round(size)),
          imageCrop: imageCrop ? Object.freeze({ ...imageCrop }) : null, // コマ画像のトリミング（非破壊）
          parameters: finalParameters, // ← 適用後のパラメータをセット
          components: Object.freeze({}),
          buffs: Object.freeze([]), // バフ/デバフ一覧（{id,name,paramId,delta,expirePhase}）
          actions: Object.freeze([]),
          inBackyard: false, // バックヤード（盤面外の個人保管場所）にしまわれているか
          backyardOwnerId: null // しまった人のローカルID（バックヤード一覧の絞り込みに使う）
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

      // コマ画像のトリミング（ズーム・表示位置）を更新する。中身は{zoom,posX,posY}だが
      // Coreは解釈せず、そのまま保持・同期する（描画側が解釈する）。
      case 'SET_CHARACTER_IMAGE_CROP': {
        const { id, crop } = payload;
        if (!nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          imageCrop: crop ? Object.freeze({ ...crop }) : null
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // コマの大きさ（マス数、N×Nとして扱う）を変更する
      case 'SET_CHARACTER_SIZE': {
        const { id, size } = payload;
        if (!nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          size: Math.max(1, Math.round(size))
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // コマを盤面からバックヤード（個人保管場所）へしまう。しまった人のローカルID
      // (ownerId)を記録し、参照キャラクター欄・キャラ一覧・盤面描画から除外する
      // （board-data-driven.js/main.js側がinBackyardを見て判断する）。位置(x,y)は
      // そのまま保持し、盤面に戻したときに元の位置へ復元できるようにする。
      case 'MOVE_TO_BACKYARD': {
        const { id, ownerId } = payload;
        if (!nextTokensState[id] || !ownerId) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          inBackyard: true,
          backyardOwnerId: ownerId
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // バックヤードから盤面へ戻す。位置は保管前の(x,y)をそのまま使う。
      case 'RESTORE_FROM_BACKYARD': {
        const { id } = payload;
        if (!nextTokensState[id]) return;

        nextTokensState[id] = Object.freeze({
          ...nextTokensState[id],
          inBackyard: false
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

      // バフ/デバフを1件付与する。paramIdが解決できない（=対象のパラメータをこのコマが
      // 持っていない）場合もnullのまま保持し、実効値計算（getEffectiveParameterValue）側で
      // 単に無視される＝効果を持たないバフとして扱う。
      case 'ADD_BUFF': {
        const { tokenId, id, name, paramId = null, delta, expirePhase = null, tag = null } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !id || !name) return;

        const buff = Object.freeze({
          id,
          name,
          paramId,
          delta: Number(delta) || 0,
          expirePhase: expirePhase || null, // 'scene' | 'round' | 'scenario' | null(手動のみ)
          tag: tag || null // 発行元をまとめて識別するための任意タグ（例: コンボ発動時のcombo.id）
        });

        nextTokensState[tokenId] = Object.freeze({
          ...character,
          buffs: Object.freeze([...(character.buffs || []), buff])
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      case 'REMOVE_BUFF': {
        const { tokenId, id } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs) return;

        nextTokensState[tokenId] = Object.freeze({
          ...character,
          buffs: Object.freeze(character.buffs.filter(b => b.id !== id))
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // 指定tagを持つバフ/デバフを1コマから一括削除する（例: コンボダメージ実行後、
      // そのコンボ発動由来のバフをまとめて消す）。EXPIRE_BUFFSと違い通常の行動完了に
      // 伴う片付けなのでログへの記録はしない。
      case 'REMOVE_BUFFS_BY_TAG': {
        const { tokenId, tag } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs || !tag) return;

        nextTokensState[tokenId] = Object.freeze({
          ...character,
          buffs: Object.freeze(character.buffs.filter(b => b.tag !== tag))
        });

        this.#commit(prevState, nextTokensState);
        return;
      }

      // シーン/ラウンド/シナリオ終了を検知し、該当する終了条件を持つバフ/デバフを全コマから
      // 一括で消す。将来実装予定の「シーン進行」機能から呼ばれる想定で、現状はチャットコマンド
      // （「シーン終了」等）がエスケープハッチとして直接dispatchする。
      // 結果はMainタブのチャットログへ直接追記する（EventBus経由の副作用にすると、この
      // アクションが同期される全クライアントでそれぞれ「受信→追記dispatch→再送信」が走り、
      // クライアント数だけログが重複してしまうため、1回のdispatchで完結させている）。
      case 'EXPIRE_BUFFS': {
        const { phase } = payload;
        if (!phase) return;

        const removedNames = [];
        Object.keys(nextTokensState).forEach(tokenId => {
          const character = nextTokensState[tokenId];
          const buffs = character.buffs || [];
          const remaining = buffs.filter(b => {
            if (b.expirePhase === phase) {
              removedNames.push(`${character.name}:${b.name}`);
              return false;
            }
            return true;
          });
          if (remaining.length !== buffs.length) {
            nextTokensState[tokenId] = Object.freeze({ ...character, buffs: Object.freeze(remaining) });
          }
        });

        const phaseLabel = BUFF_PHASE_LABELS[phase] || phase;
        const logText = removedNames.length > 0
          ? `${phaseLabel}終了。消滅したバフ/デバフ: ${removedNames.join('、')}`
          : `${phaseLabel}終了。`;

        const nextChatLogs = {
          ...prevState.chatLogs,
          [MAIN_CHAT_TAB_ID]: Object.freeze([
            ...(prevState.chatLogs[MAIN_CHAT_TAB_ID] || []),
            Object.freeze({ system: 'システム', resultText: logText })
          ])
        };

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          chatLogs: Object.freeze(nextChatLogs)
        });

        EventBus.emit('STATE_CHANGED', this.#state);
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

      // BCDiceのシステム（ダイスロールの解釈規則）を切り替える。キャラクターパラメータ用の
      // プラグイン（activePlugin）とは別軸の設定で、ルーム単位・全員共通にするためroomに置く。
      case 'SET_BCDICE_SYSTEM': {
        const { system } = payload;
        if (!system) return;
        const room = prevState.room;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({ ...room, bcdiceSystem: system })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      // 部屋名（複数部屋運用時のインデックスページ表示・見出し表示に使う）を変更する。
      case 'SET_ROOM_NAME': {
        const { name } = payload;
        if (typeof name !== 'string') return;
        const room = prevState.room;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({ ...room, name })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'SET_BACKGROUND_IMAGE': {
        const { imageUrl, boardWidth, boardHeight } = payload;
        const room = prevState.room;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          room: Object.freeze({
            ...room,
            backgroundImage: imageUrl || null,
            boardWidth: imageUrl ? (boardWidth || null) : null,
            boardHeight: imageUrl ? (boardHeight || null) : null
          })
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

      // --- パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト） ---
      // 位置(x,y)は盤面ローカルのピクセル座標（グリッド吸着済み、盤面外は負値もあり得る）、
      // 大きさ(cols,rows)はマス数。隣接判定などの配置妥当性チェックはUI層(board-data-driven.js)が行う。
      case 'ADD_PANEL': {
        const { id, image = null, text = '', x = 0, y = 0, cols = 2, rows = 2, locked = false } = payload;
        if (!id) return;
        if (prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({
              id, image: image || null, text: text || '', x, y,
              cols: Math.max(1, Math.round(cols)),
              rows: Math.max(1, Math.round(rows)),
              locked: !!locked // 固定中は盤面上でドラッグ移動できない（背景タイルのように振る舞う）
            })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      // パネルの固定(locked)を切り替える。固定中はドラッグ移動を受け付けず、
      // その上のドラッグは盤面パンに委ねる（描画・当たり判定はboard側が解釈する）。
      case 'SET_PANEL_LOCKED': {
        const { id, locked } = payload;
        if (!prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({ ...prevState.panels[id], locked: !!locked })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'MOVE_PANEL': {
        const { id, x, y } = payload;
        if (!prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({ ...prevState.panels[id], x, y })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'SET_PANEL_SIZE': {
        const { id, cols, rows } = payload;
        if (!prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({
              ...prevState.panels[id],
              cols: Math.max(1, Math.round(cols)),
              rows: Math.max(1, Math.round(rows))
            })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'SET_PANEL_IMAGE': {
        const { id, image } = payload;
        if (!prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({ ...prevState.panels[id], image: image || null })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'SET_PANEL_TEXT': {
        const { id, text } = payload;
        if (!prevState.panels[id]) return;

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze({
            ...prevState.panels,
            [id]: Object.freeze({ ...prevState.panels[id], text: text || '' })
          })
        });

        EventBus.emit('STATE_CHANGED', this.#state);
        return;
      }

      case 'REMOVE_PANEL': {
        const { id } = payload;
        if (!prevState.panels[id]) return;

        const nextPanels = { ...prevState.panels };
        delete nextPanels[id];

        this.#state = this.#createProtectedProxy({
          ...prevState,
          tokens: Object.freeze(nextTokensState),
          panels: Object.freeze(nextPanels)
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

export const DEFAULT_BCDICE_SYSTEM = 'Cthulhu7th';

// 新規部屋の初期状態を組み立てる。クライアント側の単一store（ブラウザ1タブ＝1部屋）と、
// サーバー側が複数部屋分（server/index.js）作る際の両方から使う共通のひな形。
export function createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {}) {
  return {
    room: {
      name,                // 部屋名（複数部屋運用時のインデックスページ・見出し表示に使う）
      activePlugin,        // 例: 'DX3'。null = プラグイン未選択（Coreパラメータのみ）
      parameters: {},        // ルーム変数（後述）
      backgroundImage: null, // null = CSS側のデフォルト背景をそのまま使う
      boardWidth: null,      // null = ビューポート幅いっぱい（CSSの100%）
      boardHeight: null,     // null = ビューポート高さいっぱい（CSSの100%）
      bcdiceSystem // BCDiceのシステムID（例: 'Cthulhu7th'）。ルーム単位で全員共通
    },

    tokens: {},

    // パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト）
    panels: {},

    // チャットタブ（Mainタブは常に存在する既定タブ）とタブごとのログ履歴
    chatTabs: [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
    chatLogs: { [MAIN_CHAT_TAB_ID]: [] }
  };
}

export const store = new ImmutableStore(createInitialGameState());
