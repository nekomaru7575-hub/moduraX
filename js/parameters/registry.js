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