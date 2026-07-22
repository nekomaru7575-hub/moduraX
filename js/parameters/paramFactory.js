// js/parameters/paramFactory.js
// パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。
// Core・プラグインどちらの定義もこの関数を通す。

export function buildParameters(source, definitions) {
  const params = {};
  definitions.forEach(def => {
    const paramId = `${source}:${def.key}`;
    params[paramId] = Object.freeze({
      key: def.key,
      label: def.label,
      value: def.value,
      source,
      locked: def.locked ?? false,
      editable: def.editable ?? true
    });
  });
  return Object.freeze(params);
}