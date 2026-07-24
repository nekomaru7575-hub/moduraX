// js/parameters/registry.js
// プラグイン記述子の一覧。Coreはこの中身を解釈せず、ただの対応表として扱う。

import { DX3_PLUGIN } from './dx3.js';
// import { GCREST_PLUGIN } from './gcrest.js'; // 将来追加時はこの形で増やす

const PLUGINS = {
  DX3: DX3_PLUGIN,
  // GCREST: GCREST_PLUGIN,
};

export function listPlugins() {
  return Object.values(PLUGINS); // ルーム設定UIのセレクト肢に使う
}

export function buildCharacterParametersForPlugin(pluginId) {
  const plugin = PLUGINS[pluginId];
  return plugin?.buildCharacterParameters ? plugin.buildCharacterParameters() : {};
}

export function buildRoomParameters(pluginId) {
  const plugin = PLUGINS[pluginId];
  return plugin?.buildRoomParameters ? plugin.buildRoomParameters() : {};
}

// 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか
export function pluginHasCharacterPanel(pluginId) {
  return !!PLUGINS[pluginId]?.renderCharacterPanel;
}

/**
 * キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。
 * Coreはcontainerを渡すだけで、中身の意味・デザインはプラグインに委ねる（解釈しない）。
 * @param {string} pluginId
 * @param {{ container: HTMLElement, mode: 'create'|'edit', parameters: Record<string, any> }} context
 * @returns {{ getValues: () => Record<string, number> } | null}
 *   getValues() はダイアログのsubmit時に呼ばれ、{paramId: value}を返す。
 *   プラグインが専用UIを持たない場合はnullを返す。
 */
export function renderCharacterPanel(pluginId, context) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.renderCharacterPanel) return null;
  return plugin.renderCharacterPanel(context) || null;
}

// 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか
export function pluginHasCharacterImport(pluginId) {
  return !!PLUGINS[pluginId]?.importCharacterJson;
}

/**
 * ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の
 * 知識で解釈させる。Coreはjsonをそのまま渡すだけで、フィールドの意味は解釈しない。
 * @param {string} pluginId
 * @param {any} json
 * @returns {{
 *   name?: string,
 *   valueOverrides: Record<string, number>,
 *   labelOverrides: Record<string, string>,
 *   newParameters: Record<string, {key:string,label:string,value:number,source:string,visible?:boolean}>
 * } | null}
 */
export function importCharacterJsonForPlugin(pluginId, json) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.importCharacterJson) return null;
  return plugin.importCharacterJson(json) || null;
}

/**
 * チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして
 * 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。Coreはコマンドの構文を解釈せず、
 * プラグインのhandleChatCommandにそのまま委ねる。
 * @param {string} pluginId
 * @param {string} rawInput
 * @param {object} context プラグインが実行に必要とする値一式（token/dispatch等）
 * @returns {boolean} コマンドとして処理されたか。プラグイン未適用/非対応の場合はfalse。
 */
export function handlePluginChatCommand(pluginId, rawInput, context) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.handleChatCommand) return false;
  return plugin.handleChatCommand(rawInput, context);
}

/**
 * キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す
 * @param {string} pluginId 
 * @param {Record<string, any>} parameters 
 * @returns {Record<string, any>} 計算適用後のパラメータリスト
 */
export function applyPluginDerivedParameters(pluginId, parameters) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.computeDerivedParameters) {
    return parameters; // プラグインがない、または計算ロジックがない場合はそのまま返す
  }

  // プラグイン側で計算された差分 { "DX3:corDB": 2, ... } を取得
  const updates = plugin.computeDerivedParameters(parameters);
  if (!updates || Object.keys(updates).length === 0) {
    return parameters;
  }

  // 差分をもとにイミュータブルに新しいパラメータオブジェクト群を生成
  const nextParameters = { ...parameters };
  Object.entries(updates).forEach(([paramId, newValue]) => {
    if (nextParameters[paramId] && nextParameters[paramId].value !== newValue) {
      nextParameters[paramId] = Object.freeze({
        ...nextParameters[paramId],
        value: newValue
      });
    }
  });

  return Object.freeze(nextParameters);
}