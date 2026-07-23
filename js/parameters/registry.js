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