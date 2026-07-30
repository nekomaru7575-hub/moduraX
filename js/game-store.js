// js/game-store.js
// 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない
// 純粋なモジュール。ブラウザ（board-data-driven.js経由）とNode（server/index.js）の
// 両方からimportして、同じreducerを共有するために切り出している。

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';
import {
  buildCharacterParametersForPlugin, buildRoomParameters, listPlugins, applyPluginDerivedParameters,
  getRoundPhaseTemplate, resetPluginComponentsOnPhaseEnd
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

// ラウンド進行（Core機能）の初期状態。未開始（active:false）がデフォルト。
function createInitialRoundState() {
  return {
    active: false,
    template: null,   // 開始時にスナップショットするフェーズ配列（parameters/registry.jsのgetRoundPhaseTemplate参照）
    roundNumber: 0,
    phaseIndex: 0,
    turnIndex: 0,      // participants内の現在の手番（kind:'perCharacter'のフェーズのみ意味を持つ）
    participants: [],  // イニシアチブ降順のtokenId配列
    confirmation: { readyEntries: [] } // 点呼/割り込み確認の「準備OK」一覧。[{userId, nickname}]
  };
}

// 指定フェーズ(phase: 'scene'|'round'|'scenario'|'check'|'process')の終了条件を持つバフ/デバフを
// 全トークンから取り除く。EXPIRE_BUFFSと、ラウンド進行のROUND_ADVANCE_PHASE（フェーズ完了時の
// 自動清掃）の両方から使う共通ロジック。
function removeExpiredBuffs(tokensState, phase) {
  const nextTokens = { ...tokensState };
  const removedNames = [];
  Object.keys(nextTokens).forEach(tokenId => {
    const character = nextTokens[tokenId];
    const buffs = character.buffs || [];
    const remaining = buffs.filter(b => {
      if (b.expirePhase === phase) {
        removedNames.push(`${character.name}:${b.name}`);
        return false;
      }
      return true;
    });
    if (remaining.length !== buffs.length) {
      nextTokens[tokenId] = Object.freeze({ ...character, buffs: Object.freeze(remaining) });
    }
  });
  return { nextTokens, removedNames };
}

// removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents
// （DX3ならエフェクトの使用回数）もリセットする。バフの期限切れとは別関心事のため、
// Core側はactivePluginへの委譲だけを担い、中身の意味はプラグイン側に委ねる
// （resetPluginComponentsOnPhaseEnd、js/parameters/registry.js参照）。
function resetPluginComponentsForPhase(tokensState, activePlugin, phase) {
  const nextTokens = { ...tokensState };
  Object.entries(nextTokens).forEach(([id, character]) => {
    const nextComponents = resetPluginComponentsOnPhaseEnd(activePlugin, character.components, phase);
    if (nextComponents !== character.components) {
      nextTokens[id] = Object.freeze({ ...character, components: nextComponents });
    }
  });
  return nextTokens;
}

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

// 音楽のチャンネル。BGMを流したまま効果音を重ねられるよう2枠に分けてある
// （js/audio-player.jsが枠ごとに1つずつAudio要素を持つ）。
export const AUDIO_CHANNELS = ['bgm', 'se'];

// チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。
export const AUDIO_CHANNEL_LABELS = { bgm: 'BGM', se: '効果音' };

// --- dispatch内で繰り返し現れる更新パターンの共通処理 ---
// case側が「どのスライスをどう変えるか」だけを書けるようにするための道具立て。
// 凍結（Object.freeze）はここで面倒を見るので、case側は原則freezeを書かない。

// 作業用トークンマップ（dispatch冒頭のnextTokensState）の1コマだけを差し替える。
// このマップはdispatch内のローカルコピーなので、ここだけは直接書き換える。
function patchCharacter(tokensState, id, fields) {
  tokensState[id] = Object.freeze({ ...tokensState[id], ...fields });
}

// キー付きマップ（panels / room.originalTables / room.audioTracks / parameters等）の1件追加・更新。
function withMapEntry(map, key, value) {
  return Object.freeze({ ...map, [key]: value });
}

// 同じマップからの1件削除。
function withoutMapEntry(map, key) {
  const next = { ...map };
  delete next[key];
  return Object.freeze(next);
}

// 指定タブのログへ1件追記した新しいchatLogsを返す。
function withChatEntry(chatLogs, tabId, entry) {
  const nextEntries = Object.freeze([...(chatLogs[tabId] || []), Object.freeze({ ...entry })]);
  return withMapEntry(chatLogs, tabId, nextEntries);
}

// Mainタブへシステム発言を1件追記する。ラウンド進行・バフ期限切れの通知に使う
// （EventBus経由の副作用にすると、同期される全クライアントでそれぞれ「受信→追記dispatch→
// 再送信」が走ってクライアント数だけログが重複するため、1回のdispatchで完結させている）。
function withSystemLog(chatLogs, text) {
  return withChatEntry(chatLogs, MAIN_CHAT_TAB_ID, { system: 'システム', resultText: text });
}

// パラメータマップ（コマのparameters / room.parameters）の1件を差し替える。
// 存在しないparamIdならnull（＝呼び出し側は何もしない）。
function withParamFields(params, paramId, fields) {
  const param = params[paramId];
  if (!param) return null;
  return withMapEntry(params, paramId, Object.freeze({ ...param, ...fields }));
}

// 上記の「手入力による直接編集」版。editable:falseのパラメータは弾く。
// labelは警告文の主語（'このパラメータ' / 'このルーム変数'）。
function withEditableParamFields(params, paramId, fields, label) {
  if (params[paramId]?.editable === false) {
    console.warn(`[Guard] ${label}は直接編集できません:`, paramId);
    return null;
  }
  return withParamFields(params, paramId, fields);
}

// パラメータ1件を削除する。locked（削除不可）は弾く。
function withoutParam(params, paramId, label) {
  const param = params[paramId];
  if (!param) return null;
  if (param.locked) {
    console.warn(`[Guard] ${label}は削除できません:`, paramId);
    return null;
  }
  return withoutMapEntry(params, paramId);
}

// ユーザー定義パラメータ（source:'user'）1件の定義を作る。コマのパラメータとルーム変数で共通。
// visibleは「一覧に表示するか」の指定があるコマのパラメータ側だけが持つ（ルーム変数は常に表示）。
function buildUserParam({ key, label, value, visible }) {
  const param = { key, label, value, source: 'user', locked: false, editable: true };
  if (visible !== undefined) param.visible = visible;
  return Object.freeze(param);
}

// ユーザー定義パラメータを1件追加する。同じキーが既にあればnull（＝追加しない）。
function withNewUserParam(params, def) {
  const paramId = `user:${def.key}`;
  if (params[paramId]) return null;
  return withMapEntry(params, paramId, buildUserParam(def));
}

// フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。
// 期限切れバフの除去とプラグインcomponentsのリセットは必ずセットで行い、通知文もここで組み立てる。
// EXPIRE_BUFFSと、ラウンド進行のROUND_ADVANCE_PHASE（フェーズ完了時の自動清掃）が使う。
function applyPhaseEnd(tokensState, activePlugin, phase) {
  const { nextTokens, removedNames } = removeExpiredBuffs(tokensState, phase);
  const phaseLabel = BUFF_PHASE_LABELS[phase] || phase;
  return {
    tokens: resetPluginComponentsForPhase(nextTokens, activePlugin, phase),
    logText: removedNames.length > 0
      ? `${phaseLabel}終了。消滅したバフ/デバフ: ${removedNames.join('、')}`
      : `${phaseLabel}終了。`
  };
}

// ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。
function sortByInitiative(tokensState, participantIds) {
  return [...participantIds].sort((a, b) => {
    const tokenA = tokensState[a];
    const tokenB = tokensState[b];
    const initA = tokenA ? (getEffectiveParameterValue(tokenA, 'core:initiative') ?? 0) : 0;
    const initB = tokenB ? (getEffectiveParameterValue(tokenB, 'core:initiative') ?? 0) : 0;
    return initB - initA;
  });
}

// ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。
function joinTokenNames(tokensState, ids) {
  return ids.map(id => tokensState[id]?.name || id).join('、');
}

// コマの「決まった項目だけを差し替える」アクション。payloadから差分オブジェクトを作る規則だけを
// 持ち、対象の存在確認・凍結・コミットはdispatch側の共通処理に任せる（nullを返すと何もしない）。
// アクション名はネットワーク同期の識別子（js/net-sync.js・server/index.js）なので、
// 1アクション=1エントリの対応は保ったまま重複した手続きだけを畳んでいる。
const CHARACTER_FIELD_PATCHES = {
  MOVE_TOKEN: ({ x, y }) => ({ x, y }),
  RENAME_CHARACTER: ({ name }) => (name ? { name } : null),
  // チャット欄でのキャラ名・発言テキストの色。nullで既定色に戻す。
  SET_CHARACTER_TEXT_COLOR: ({ textColor }) => ({ textColor: textColor || null }),
  // キャラクター一覧への表示/非表示（コマ自体は盤面に表示されたまま）
  SET_CHARACTER_VISIBLE: ({ visible }) => ({ visible: !!visible }),
  SET_CHARACTER_IMAGE: ({ image }) => ({ image: image || null }),
  // コマ画像のトリミング（ズーム・表示位置）。中身は{zoom,posX,posY}だがCoreは解釈せず、
  // そのまま保持・同期する（描画側が解釈する）。
  SET_CHARACTER_IMAGE_CROP: ({ crop }) => ({ imageCrop: crop ? Object.freeze({ ...crop }) : null }),
  // コマの大きさ（マス数、N×Nとして扱う）
  SET_CHARACTER_SIZE: ({ size }) => ({ size: Math.max(1, Math.round(size)) }),
  // コマを盤面からバックヤード（個人保管場所）へしまう。しまった人のローカルID(ownerId)を
  // 記録し、参照キャラクター欄・キャラ一覧・盤面描画から除外する（board-data-driven.js／
  // main.js側がinBackyardを見て判断する）。位置(x,y)はそのまま保持し、盤面に戻したときに
  // 元の位置へ復元できるようにする。
  MOVE_TO_BACKYARD: ({ ownerId }) => (ownerId ? { inBackyard: true, backyardOwnerId: ownerId } : null),
  // バックヤードから盤面へ戻す。位置は保管前の(x,y)をそのまま使う。
  RESTORE_FROM_BACKYARD: () => ({ inBackyard: false })
};

// パネルの「決まった項目だけを差し替える」アクション。CHARACTER_FIELD_PATCHESと同じ扱い。
const PANEL_FIELD_PATCHES = {
  // 固定中は盤面上でドラッグ移動を受け付けず、その上のドラッグは盤面パンに委ねる
  // （描画・当たり判定はboard側が解釈する）。
  SET_PANEL_LOCKED: ({ locked }) => ({ locked: !!locked }),
  MOVE_PANEL: ({ x, y }) => ({ x, y }),
  SET_PANEL_SIZE: ({ cols, rows }) => ({ cols: Math.max(1, Math.round(cols)), rows: Math.max(1, Math.round(rows)) }),
  SET_PANEL_IMAGE: ({ image }) => ({ image: image || null }),
  SET_PANEL_TEXT: ({ text }) => ({ text: text || '' })
};

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

  // 変更したスライス（tokens/room/panels/chatTabs/chatLogs/round）だけを差し替えて次の状態を
  // 確定し、購読側へ通知する。各スライスの凍結はここで行うので、case側は「どのスライスを
  // どう変えたか」だけを書けばよい。patchに含めなかったスライスは前の状態のまま引き継がれる。
  #commit(prevState, patch) {
    const nextSlices = {};
    Object.entries(patch).forEach(([slice, value]) => {
      nextSlices[slice] = Object.freeze(value);
    });

    this.#state = this.#createProtectedProxy({ ...prevState, ...nextSlices });
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
      // この機能より前に保存された状態には参加者一覧が無いため、既定値を補う
      participants: newState.participants || {},
      // この機能より前に保存された状態にはround（ラウンド進行）が無いため、既定値を補う
      round: newState.round || createInitialRoundState(),
      // この機能より前に保存された状態にはroom.bcdiceSystem/nameが無いため、既定値を補う
      room: {
        ...newState.room,
        name: newState.room?.name || '',
        bcdiceSystem: newState.room?.bcdiceSystem || DEFAULT_BCDICE_SYSTEM,
        // この機能より前に保存された状態にはroom.originalTablesが無いため、既定値を補う
        originalTables: newState.room?.originalTables || {},
        // 同上、音楽機能より前に保存された状態には無いため既定値を補う
        audioTracks: newState.room?.audioTracks || {},
        audioPlayback: newState.room?.audioPlayback || { bgm: null, se: null }
      }
    };
    this.#state = this.#createProtectedProxy(normalized);
    EventBus.emit('STATE_CHANGED', this.#state);
  }

  dispatch(action, payload) {
    const prevState = this.#state;
    const activePlugin = prevState.room?.activePlugin;

    // コマを触るcaseの作業用コピー。patchCharacterで書き換えてからコミットする。
    const nextTokensState = { ...prevState.tokens };

    // コマ／パネルの決まった項目を差し替えるだけのアクションは、対象の存在確認・凍結・コミットが
    // 完全に共通なので、switchの手前でまとめて処理する（差分の作り方だけがテーブル側にある）。
    const characterFieldPatch = CHARACTER_FIELD_PATCHES[action];
    if (characterFieldPatch) {
      const { id } = payload;
      const fields = nextTokensState[id] ? characterFieldPatch(payload) : null;
      if (!fields) return;

      patchCharacter(nextTokensState, id, fields);
      this.#commit(prevState, { tokens: nextTokensState });
      return;
    }

    const panelFieldPatch = PANEL_FIELD_PATCHES[action];
    if (panelFieldPatch) {
      const { id } = payload;
      const panel = prevState.panels[id];
      const fields = panel ? panelFieldPatch(payload) : null;
      if (!fields) return;

      this.#commit(prevState, {
        panels: withMapEntry(prevState.panels, id, Object.freeze({ ...panel, ...fields }))
      });
      return;
    }

    switch (action) {
      case 'ADD_CHARACTER': {
        const {
          id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR, image = null, size = 1,
          imageCrop = null, parameterOverrides = {}, parameterVisibility = {},
          customParameters = [], textColor = null, visible = true
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

        // 値とは別に、キャラクター一覧へ出すかどうかだけを作成時に指定する（HP等）。
        // 未指定なら各パラメータ定義の既定（buildParameters）のまま。
        Object.entries(parameterVisibility).forEach(([paramId, paramVisible]) => {
          if (parameters[paramId]) {
            parameters[paramId] = Object.freeze({ ...parameters[paramId], visible: !!paramVisible });
          }
        });

        customParameters.forEach(({ key, label, value, visible: paramVisible = true }) => {
          parameters[`user:${key}`] = buildUserParam({ key, label, value, visible: paramVisible });
        });

        // プラグインの自動計算を適用（activePlugin と parameters を正しく渡す）
        const finalParameters = applyPluginDerivedParameters(activePlugin, parameters);

        nextTokensState[id] = Object.freeze({
          id, name, x, y, color, image, size: Math.max(1, Math.round(size)),
          imageCrop: imageCrop ? Object.freeze({ ...imageCrop }) : null, // コマ画像のトリミング（非破壊）
          textColor, // チャット欄でのキャラ名・発言テキストの色（未設定nullなら既定色）
          visible: !!visible, // false ならキャラクター一覧に表示しない（盤面上のコマ自体は表示されたまま）
          parameters: finalParameters, // ← 適用後のパラメータをセット
          components: Object.freeze({}),
          buffs: Object.freeze([]), // バフ/デバフ一覧（{id,name,paramId,delta,expirePhase}）
          actions: Object.freeze([]),
          inBackyard: false, // バックヤード（盤面外の個人保管場所）にしまわれているか
          backyardOwnerId: null // しまった人のローカルID（バックヤード一覧の絞り込みに使う）
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterCreated', { id });
        return;
      }

      case 'REMOVE_CHARACTER': {
        const { id } = payload;
        if (!nextTokensState[id]) return;
        delete nextTokensState[id];

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterDeleted', { id });
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

        patchCharacter(nextTokensState, id, {
          name: name || character.name,
          parameters: nextParams,
          components: nextComponents
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterImported', { id });
        return;
      }

      // 「コマをJSONで保存」で出力した完全なスナップショットから、コマを丸ごと復元する。
      // IMPORT_CHARACTER_DATAが値の上書きのみなのに対し、こちらは見た目（画像・色・サイズ等）や
      // components・buffsも含めて丸ごと置き換える。位置(x,y)・id・バックヤード状態は
      // 呼び出し側（既存コマへの上書き、またはドロップ位置での新規作成）の管轄なので触らない。
      case 'RESTORE_CHARACTER_SNAPSHOT': {
        const { id, snapshot } = payload;
        const character = nextTokensState[id];
        if (!character || !snapshot) return;

        const nextParams = { ...character.parameters };
        Object.entries(snapshot.parameters || {}).forEach(([paramId, paramDef]) => {
          nextParams[paramId] = Object.freeze({ ...paramDef });
        });
        const calculatedParams = applyPluginDerivedParameters(activePlugin, nextParams);

        patchCharacter(nextTokensState, id, {
          name: snapshot.name || character.name,
          color: snapshot.color || character.color,
          image: snapshot.image ?? null,
          imageCrop: snapshot.imageCrop ? Object.freeze({ ...snapshot.imageCrop }) : null,
          size: Math.max(1, Math.round(snapshot.size || character.size || 1)),
          textColor: snapshot.textColor ?? null,
          visible: snapshot.visible !== false,
          parameters: calculatedParams,
          components: Object.freeze({ ...(snapshot.components || {}) }),
          buffs: Object.freeze((snapshot.buffs || []).map(buff => Object.freeze({ ...buff })))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterImported', { id });
        return;
      }

      // ロイス・エフェクト・コンボのような「ボックス」データを丸ごと更新する。
      // Coreはvalueの中身を解釈せず、componentKeyに紐づく値をそのまま置き換える。
      case 'SET_COMPONENT': {
        const { id, componentKey, value } = payload;
        const character = nextTokensState[id];
        if (!character || !componentKey) return;

        patchCharacter(nextTokensState, id, {
          components: withMapEntry(character.components, componentKey, value)
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'SET_PARAMETER': {
        const { characterId, paramId, value } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withEditableParamFields(character.parameters, paramId, { value }, 'このパラメータ');
        if (!nextParams) return;

        // プラグインの自動計算を通して新パラメータを取得
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(activePlugin, nextParams)
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('ParameterChanged', { characterId, paramId, value });
        return;
      }

      // 一覧での表示/非表示だけを切り替える。値を変えないため自動計算は通さず、
      // 編集不可（editable:false）のパラメータも対象にできる。
      case 'SET_PARAMETER_VISIBILITY': {
        const { characterId, paramId, visible } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withParamFields(character.parameters, paramId, { visible });
        if (!nextParams) return;

        patchCharacter(nextTokensState, characterId, { parameters: nextParams });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('ParameterVisibilityChanged', { characterId, paramId, visible });
        return;
      }

      case 'REMOVE_PARAMETER': {
        const { characterId, paramId } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withoutParam(character.parameters, paramId, 'このパラメータ');
        if (!nextParams) return;

        // 自動計算の再評価
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(activePlugin, nextParams)
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'ADD_PARAMETER': {
        const { characterId, key, label, value, visible = true } = payload;
        const character = nextTokensState[characterId];
        if (!key || !character) return;

        const nextParams = withNewUserParam(character.parameters, { key, label, value, visible });
        if (!nextParams) return;

        // 自動計算の適用
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(activePlugin, nextParams)
        });

        this.#commit(prevState, { tokens: nextTokensState });
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

        patchCharacter(nextTokensState, tokenId, {
          buffs: Object.freeze([...(character.buffs || []), buff])
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'REMOVE_BUFF': {
        const { tokenId, id } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs) return;

        patchCharacter(nextTokensState, tokenId, {
          buffs: Object.freeze(character.buffs.filter(b => b.id !== id))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      // 指定tagを持つバフ/デバフを1コマから一括削除する（例: コンボダメージ実行後、
      // そのコンボ発動由来のバフをまとめて消す）。EXPIRE_BUFFSと違い通常の行動完了に
      // 伴う片付けなのでログへの記録はしない。
      case 'REMOVE_BUFFS_BY_TAG': {
        const { tokenId, tag } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs || !tag) return;

        patchCharacter(nextTokensState, tokenId, {
          buffs: Object.freeze(character.buffs.filter(b => b.tag !== tag))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      // シーン/ラウンド/シナリオ終了を検知し、該当する終了条件を持つバフ/デバフを全コマから
      // 一括で消す。将来実装予定の「シーン進行」機能から呼ばれる想定で、現状はチャットコマンド
      // （「シーン終了」等）がエスケープハッチとして直接dispatchする。
      // 結果はMainタブのチャットログへ直接追記する（理由はwithSystemLogのコメント参照）。
      case 'EXPIRE_BUFFS': {
        const { phase } = payload;
        if (!phase) return;

        const { tokens, logText } = applyPhaseEnd(nextTokensState, activePlugin, phase);

        this.#commit(prevState, {
          tokens,
          chatLogs: withSystemLog(prevState.chatLogs, logText)
        });
        return;
      }

      // --- ラウンド進行（Core機能）。詳細はcreateInitialRoundState()のコメント・
      // 実装プラン（C:\Users\necom\.claude\plans\swirling-foraging-lemon.md）参照。
      // 認証/ロールが無いアプリの方針上、進行操作（開始/進行/終了/参加者変更）は
      // 接続中の誰でも行える前提でガードしていない。点呼(confirmation)もソフトな
      // 可視化のみで、進行操作自体をブロックしない。 ---

      case 'ROUND_PROGRESSION_START': {
        const { participantIds = [] } = payload;
        if (prevState.round.active) return;

        const template = getRoundPhaseTemplate(activePlugin);
        const participants = sortByInitiative(nextTokensState, participantIds);

        const firstPhase = template[0];
        const participantNames = joinTokenNames(nextTokensState, participants);
        const logText = participants.length > 0
          ? `ラウンド進行を開始しました（参加者: ${participantNames}）。ラウンド1 - ${firstPhase.label}開始。`
          : `ラウンド進行を開始しました。ラウンド1 - ${firstPhase.label}開始。`;

        this.#commit(prevState, {
          round: {
            active: true,
            template,
            roundNumber: 1,
            phaseIndex: 0,
            turnIndex: 0,
            participants,
            confirmation: { readyEntries: [] }
          },
          chatLogs: withSystemLog(prevState.chatLogs, logText)
        });
        return;
      }

      case 'ROUND_SET_PARTICIPANTS': {
        const { participantIds = [] } = payload;
        const round = prevState.round;

        const participants = sortByInitiative(nextTokensState, participantIds);

        // 手番中のキャラが除外された場合に備え、turnIndexを新しい参加者数の範囲へ収める
        const nextTurnIndex = participants.length > 0
          ? Math.min(round.turnIndex, participants.length - 1)
          : 0;

        const participantNames = joinTokenNames(nextTokensState, participants) || '（なし）';

        this.#commit(prevState, {
          round: { ...round, participants, turnIndex: nextTurnIndex },
          chatLogs: withSystemLog(prevState.chatLogs, `参加者を更新しました（現在: ${participantNames}）。`)
        });
        return;
      }

      case 'ROUND_ADVANCE_PHASE': {
        const round = prevState.round;
        if (!round.active) return;

        let tokensForRound = nextTokensState;
        let phaseIndex = round.phaseIndex;
        let turnIndex = round.turnIndex;
        let roundNumber = round.roundNumber;
        const logParts = [];

        const currentPhase = round.template[phaseIndex];
        const isLastParticipant = turnIndex >= round.participants.length - 1;

        if (currentPhase.kind === 'perCharacter' && !isLastParticipant) {
          // 同じフェーズ内で次の参加者へ手番を送る
          turnIndex += 1;
          const nextName = nextTokensState[round.participants[turnIndex]]?.name || '？';
          logParts.push(`${currentPhase.label}: ${nextName}の手番です。`);
        } else {
          // 現在のフェーズを完了させ、次のフェーズへ（テンプレート末尾ならラウンドを繰り上げる）
          if (currentPhase.expirePhaseOnComplete) {
            const { tokens, logText } = applyPhaseEnd(tokensForRound, activePlugin, currentPhase.expirePhaseOnComplete);
            tokensForRound = tokens;
            logParts.push(logText);
          }

          let nextPhaseIndex = phaseIndex + 1;
          if (nextPhaseIndex >= round.template.length) {
            nextPhaseIndex = 0;
            roundNumber += 1;
          }
          phaseIndex = nextPhaseIndex;
          turnIndex = 0;

          // 参加者0人でperCharacterフェーズに入ってしまう場合は手番の主がいないので、
          // もう一段先（同じ規則で完了扱い）へ進める防御処理
          if (round.template[phaseIndex].kind === 'perCharacter' && round.participants.length === 0) {
            nextPhaseIndex = phaseIndex + 1;
            if (nextPhaseIndex >= round.template.length) {
              nextPhaseIndex = 0;
              roundNumber += 1;
            }
            phaseIndex = nextPhaseIndex;
          }

          const newPhase = round.template[phaseIndex];
          const turnLabel = newPhase.kind === 'perCharacter' && round.participants.length > 0
            ? `（手番: ${nextTokensState[round.participants[0]]?.name || '？'}）`
            : '';
          logParts.push(`ラウンド${roundNumber} - ${newPhase.label}開始${turnLabel}。`);
        }

        this.#commit(prevState, {
          tokens: tokensForRound,
          round: {
            ...round,
            phaseIndex,
            turnIndex,
            roundNumber
            // confirmationは手番/フェーズが進んでも維持する（「割り込みなし」の宣言は
            // 各自が明示的にトグルするまで持続する。手番ごとの自動リセットはしない）
          },
          chatLogs: withSystemLog(prevState.chatLogs, logParts.join('\n'))
        });
        return;
      }

      case 'ROUND_PROGRESSION_END': {
        const round = prevState.round;
        if (!round.active) return;

        this.#commit(prevState, {
          round: createInitialRoundState(),
          chatLogs: withSystemLog(prevState.chatLogs, `ラウンド進行を終了しました（合計${round.roundNumber}ラウンド）。`)
        });
        return;
      }

      // 点呼/割り込み確認の「準備OK」一覧を更新する。ソフトな可視化のみで、これ自体は
      // 進行操作をブロックしない。頻繁に発火しうるためチャットログには残さない。
      case 'ROUND_SET_READY': {
        const { userId, nickname, ready } = payload;
        if (!userId) return;
        const round = prevState.round;

        const withoutUser = round.confirmation.readyEntries.filter(e => e.userId !== userId);
        const nextEntries = ready ? [...withoutUser, { userId, nickname: nickname || '' }] : withoutUser;

        this.#commit(prevState, {
          round: { ...round, confirmation: { readyEntries: nextEntries } }
        });
        return;
      }

      // システムプラグインの切り替え。既存キャラ全員の自動計算値も再計算した上で
      // ルーム変数を作り直す。
      case 'SET_ACTIVE_PLUGIN': {
        const { pluginId } = payload;
        const prevRoom = prevState.room;

        Object.keys(nextTokensState).forEach(id => {
          patchCharacter(nextTokensState, id, {
            parameters: applyPluginDerivedParameters(pluginId, nextTokensState[id].parameters)
          });
        });

        this.#commit(prevState, {
          room: {
            ...prevRoom,
            activePlugin: pluginId,
            parameters: buildRoomParameters(pluginId)
          },
          tokens: nextTokensState
        });

        EventBus.emit('ActivePluginChanged', { pluginId });
        return;
      }

      // BCDiceのシステム（ダイスロールの解釈規則）を切り替える。キャラクターパラメータ用の
      // プラグイン（activePlugin）とは別軸の設定で、ルーム単位・全員共通にするためroomに置く。
      case 'SET_BCDICE_SYSTEM': {
        const { system } = payload;
        if (!system) return;

        this.#commit(prevState, { room: { ...prevState.room, bcdiceSystem: system } });
        return;
      }

      // 部屋名（複数部屋運用時のインデックスページ表示・見出し表示に使う）を変更する。
      case 'SET_ROOM_NAME': {
        const { name } = payload;
        if (typeof name !== 'string') return;

        this.#commit(prevState, { room: { ...prevState.room, name } });
        return;
      }

      // --- 参加者（js/local-identity.jsの「合言葉」から導出した公開IDで識別する） ---
      // 状態に載るのは公開ID・表示名・GMかどうかだけで、合言葉そのものは決して載せない。
      // 同じ合言葉なら別の端末・ブラウザからでも同じIDになるので、入り直しても同じ参加者になる。
      case 'REGISTER_PARTICIPANT': {
        const { id, nickname } = payload;
        if (!id) return;

        const participants = prevState.participants || {};
        const existing = participants[id];
        // まだGMが1人もいなければ、最初に名乗った人をGMにする（部屋を作った本人が
        // そのまま入室する想定）。以後の付け外しはSET_PARTICIPANT_GMで行う。
        const hasGm = Object.values(participants).some(p => p.isGm);

        this.#commit(prevState, {
          participants: withMapEntry(participants, id, Object.freeze({
            id,
            nickname: typeof nickname === 'string' ? nickname : (existing?.nickname || ''),
            isGm: existing ? existing.isGm : !hasGm
          }))
        });
        return;
      }

      case 'SET_PARTICIPANT_GM': {
        const { id, isGm } = payload;
        const participants = prevState.participants || {};
        const participant = participants[id];
        if (!participant) return;

        this.#commit(prevState, {
          participants: withMapEntry(participants, id, Object.freeze({ ...participant, isGm: !!isGm }))
        });
        return;
      }

      // 合言葉の打ち間違いで増えてしまった参加者などを消すための後始末用。
      case 'REMOVE_PARTICIPANT': {
        const { id } = payload;
        const participants = prevState.participants || {};
        if (!participants[id]) return;

        this.#commit(prevState, { participants: withoutMapEntry(participants, id) });
        return;
      }

      // オリジナル表（ユーザー定義のダイス表）を登録する。キーはタイトルなので、既存と
      // 同じタイトルで登録し直すと上書きになる（誤登録の修正に使える）。
      case 'ADD_ORIGINAL_TABLE': {
        const { title, dice, entries } = payload;
        if (!title || !dice || !entries) return;
        const room = prevState.room;

        const table = Object.freeze({ title, dice, entries: Object.freeze({ ...entries }) });

        this.#commit(prevState, {
          room: { ...room, originalTables: withMapEntry(room.originalTables, title, table) }
        });
        return;
      }

      // オリジナル表をタイトル指定で削除する（オリジナル表一覧の×ボタンから）。
      case 'REMOVE_ORIGINAL_TABLE': {
        const { title } = payload;
        const room = prevState.room;
        if (!room.originalTables?.[title]) return;

        this.#commit(prevState, {
          room: { ...room, originalTables: withoutMapEntry(room.originalTables, title) }
        });
        return;
      }

      // --- 音楽（BGM／効果音） ---
      // 状態に入るのはURLとメタデータだけ。音の実体はR2側にあり、ここには乗らない。
      case 'ADD_AUDIO_TRACK': {
        const { id, name, url, source, key = null, channel, loop, phrase = null } = payload;
        if (!id || !name || !url) return;
        const room = prevState.room;

        const track = Object.freeze({
          id,
          name,
          url,
          source: source === 'upload' ? 'upload' : 'external',
          key: source === 'upload' ? key : null,
          channel: channel === 'se' ? 'se' : 'bgm',
          loop: Boolean(loop),
          // 発言の末尾がこのフレーズと一致したら鳴らす（js/audio-phrase.js）。空/未設定は鳴らさない。
          phrase: typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null
        });

        this.#commit(prevState, {
          room: { ...room, audioTracks: withMapEntry(room.audioTracks, id, track) }
        });
        return;
      }

      // 登録済みの音源の再生フレーズだけを変更する（音楽ダイアログの入力欄から）。
      case 'SET_AUDIO_TRACK_PHRASE': {
        const { id, phrase } = payload;
        const room = prevState.room;
        const track = room.audioTracks?.[id];
        if (!track) return;

        const nextPhrase = typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null;

        this.#commit(prevState, {
          room: {
            ...room,
            audioTracks: withMapEntry(room.audioTracks, id, Object.freeze({ ...track, phrase: nextPhrase }))
          }
        });
        return;
      }

      // 音源を削除する。再生中のものを消した場合は、そのチャンネルも止めておかないと
      // 存在しないtrackIdを指したまま残ってしまう。
      case 'REMOVE_AUDIO_TRACK': {
        const { id } = payload;
        const room = prevState.room;
        if (!room.audioTracks?.[id]) return;

        const playback = room.audioPlayback || { bgm: null, se: null };
        const nextPlayback = {};
        AUDIO_CHANNELS.forEach(channel => {
          nextPlayback[channel] = playback[channel]?.trackId === id
            ? null
            : (playback[channel] ? Object.freeze({ ...playback[channel] }) : null);
        });

        this.#commit(prevState, {
          room: {
            ...room,
            audioTracks: withoutMapEntry(room.audioTracks, id),
            audioPlayback: Object.freeze(nextPlayback)
          }
        });
        return;
      }

      // 指定チャンネルの再生状態を差し替える（trackId: null で停止）。
      case 'SET_AUDIO_PLAYBACK': {
        const { channel, trackId, playId } = payload;
        if (!AUDIO_CHANNELS.includes(channel)) return;
        const room = prevState.room;
        if (trackId && !room.audioTracks?.[trackId]) return;

        const playback = room.audioPlayback || { bgm: null, se: null };
        const nextEntry = trackId ? Object.freeze({ trackId, playId }) : null;

        this.#commit(prevState, {
          room: { ...room, audioPlayback: withMapEntry(playback, channel, nextEntry) }
        });
        return;
      }

      case 'SET_BACKGROUND_IMAGE': {
        const { imageUrl, boardWidth, boardHeight } = payload;

        this.#commit(prevState, {
          room: {
            ...prevState.room,
            backgroundImage: imageUrl || null,
            boardWidth: imageUrl ? (boardWidth || null) : null,
            boardHeight: imageUrl ? (boardHeight || null) : null
          }
        });

        EventBus.emit('BackgroundImageChanged', { imageUrl });
        return;
      }

      // --- ルーム変数。コマのパラメータと同じ編集規則（editable/locked）を共通ヘルパーで共有する ---
      case 'SET_ROOM_PARAMETER': {
        const { paramId, value } = payload;
        const room = prevState.room;

        const nextParams = withEditableParamFields(room.parameters, paramId, { value }, 'このルーム変数');
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        EventBus.emit('RoomParameterChanged', { paramId, value });
        return;
      }

      case 'ADD_ROOM_PARAMETER': {
        const { key, label, value } = payload;
        if (!key) return;
        const room = prevState.room;

        const nextParams = withNewUserParam(room.parameters, { key, label, value });
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        return;
      }

      case 'REMOVE_ROOM_PARAMETER': {
        const { paramId } = payload;
        const room = prevState.room;

        const nextParams = withoutParam(room.parameters, paramId, 'このルーム変数');
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        return;
      }

      // チャットタブを1つ追加する。idは呼び出し側（main.js）がタイムスタンプ等で生成する。
      case 'ADD_CHAT_TAB': {
        const { id, name } = payload;
        if (!id || !name) return;
        if (prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: [...prevState.chatTabs, Object.freeze({ id, name })],
          chatLogs: withMapEntry(prevState.chatLogs, id, Object.freeze([]))
        });
        return;
      }

      // 指定タブのログにメッセージを1件追加する。存在しないタブIDは無視する。
      case 'ADD_CHAT_MESSAGE': {
        const { tabId, entry } = payload;
        if (!tabId || !entry || !prevState.chatLogs[tabId]) return;

        this.#commit(prevState, { chatLogs: withChatEntry(prevState.chatLogs, tabId, entry) });
        return;
      }

      // --- パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト） ---
      // 位置(x,y)は盤面ローカルのピクセル座標（グリッド吸着済み、盤面外は負値もあり得る）、
      // 大きさ(cols,rows)はマス数。隣接判定などの配置妥当性チェックはUI層(board-data-driven.js)が行う。
      case 'ADD_PANEL': {
        const { id, image = null, text = '', x = 0, y = 0, cols = 2, rows = 2, locked = false } = payload;
        if (!id) return;
        if (prevState.panels[id]) return;

        const panel = Object.freeze({
          id, image: image || null, text: text || '', x, y,
          cols: Math.max(1, Math.round(cols)),
          rows: Math.max(1, Math.round(rows)),
          locked: !!locked // 固定中は盤面上でドラッグ移動できない（背景タイルのように振る舞う）
        });

        this.#commit(prevState, { panels: withMapEntry(prevState.panels, id, panel) });
        return;
      }

      // パネルの項目変更（固定/移動/サイズ/画像/テキスト）はPANEL_FIELD_PATCHESで共通処理する。

      case 'REMOVE_PANEL': {
        const { id } = payload;
        if (!prevState.panels[id]) return;

        this.#commit(prevState, { panels: withoutMapEntry(prevState.panels, id) });
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
      bcdiceSystem, // BCDiceのシステムID（例: 'Cthulhu7th'）。ルーム単位で全員共通
      originalTables: {}, // ユーザー定義のダイス表。キーはタイトル（後述、original-table-dialog.js参照）

      // 音楽（js/audio-player.js／js/audio-dialog.js）。音の実体は状態に入れずURLだけを持つ
      // （実体を入れると、アクションのたびに状態ごとRedisへ書き直されて帯域を食い潰すため。
      // 実体はCloudflare R2にあり、アップロードはserver/r2.js経由）。
      // 将来チャットコマンドから名前で呼べるよう「名前付きで複数登録するライブラリ」の形。
      // { [id]: { id, name, url, source: 'upload'|'external', key: string|null, channel: 'bgm'|'se',
      //           loop: boolean, phrase: string|null } }
      // phraseは「発言の末尾がこの文字列と一致したら鳴らす」再生フレーズ（js/audio-phrase.js）。
      // source:'upload' はサーバーがR2に実体を持つ（削除時にkeyで消す）。'external' は外部URL参照。
      audioTracks: {},
      // チャンネルごとの再生状態。BGMを流したまま効果音を重ねられるよう2枠に分けてある。
      // playIdは再生のたびに変わる値で、同じ曲を鳴らし直したことの検知に使う（再生位置は同期しない）。
      audioPlayback: { bgm: null, se: null } // 各要素 { trackId, playId } | null
    },

    tokens: {},

    // パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト）
    panels: {},

    // チャットタブ（Mainタブは常に存在する既定タブ）とタブごとのログ履歴
    chatTabs: [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
    chatLogs: { [MAIN_CHAT_TAB_ID]: [] },

    // 参加者一覧（js/local-identity.jsの合言葉から導出した公開IDがキー）。
    // { [id]: { id, nickname, isGm } }。合言葉そのものは状態に持たない。
    participants: {},

    // ラウンド進行（Core機能）。詳細はcreateInitialRoundState()参照
    round: createInitialRoundState()
  };
}

export const store = new ImmutableStore(createInitialGameState());
