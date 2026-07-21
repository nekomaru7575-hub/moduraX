// js/parameters/core.js
// Core（システム非依存）が提供するデフォルトパラメータ定義。
// ここに書いてよいのは「どんなTRPGでも共通して使われる」ものだけ。
// システム固有のもの（侵蝕率・SANなど）はここに書かない。
// このファイルは状態を持たない（呼ぶたびに新しいオブジェクトを返す）。

export const CORE_DEFAULT_PARAMETERS = [
  { key: 'hp', label: 'HP', value: 0 },
  { key: 'initiative', label: 'イニシアチブ', value: 0 },
];

export function buildDefaultParameters() {
  const params = {};
  CORE_DEFAULT_PARAMETERS.forEach(def => {
    const paramId = `core:${def.key}`;
    params[paramId] = Object.freeze({
      key: def.key,
      label: def.label,
      value: def.value,
      source: 'core'
    });
  });
  return Object.freeze(params);
}
