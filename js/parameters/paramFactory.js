// js/parameters/paramFactory.js
// パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。
// Core・プラグインどちらの定義もこの関数を通す。

/**
 * @param {string} source パラメータの出自（'core' / 'user' / 'plugin:DX3' など）
 * @param {{key:string,label:string,value:number,locked?:boolean,editable?:boolean,visible?:boolean}[]} definitions
 * @param {{locked?:boolean, editable?:boolean, visible?:boolean}} defaults
 *   このsource全体に適用するデフォルト値。個別のdefinitionで指定があればそちらが優先される。
 *   省略時は locked:false / editable:true / visible:true（＝全部自由に編集・削除・表示できる）。
 */
export function buildParameters(source, definitions, defaults = {}) {
  const defaultLocked = defaults.locked ?? false;
  const defaultEditable = defaults.editable ?? true;
  const defaultVisible = defaults.visible ?? true;

  const params = {};
  definitions.forEach(def => {
    const paramId = `${source}:${def.key}`;
    params[paramId] = Object.freeze({
      key: def.key,
      label: def.label,
      value: def.value,
      source,
      locked: def.locked ?? defaultLocked,
      editable: def.editable ?? defaultEditable,
      visible: def.visible ?? defaultVisible
    });
  });
  return Object.freeze(params);
}