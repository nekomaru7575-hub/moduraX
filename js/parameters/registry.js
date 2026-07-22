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