// js/character-json-import.js
// 汎用（プラグイン未適用時）のキャラクターJSON読み込み。
// Coreは自身の語彙（name / パラメータのparamId）しか知らないため、
// 外部ツール固有のフォーマットは解釈しない。対象は本アプリ自身の保存形式
// （{ name, parameters: { [paramId]: value } }）のみ。
// ゲームシステム固有のフォーマットを読みたい場合は、プラグイン側の
// 拡張JSON読み込み（registry.jsのimportCharacterJsonForPlugin）を使う。

/**
 * @param {any} json
 * @returns {{
 *   name?: string,
 *   valueOverrides: Record<string, number>,
 *   labelOverrides: Record<string, string>,
 *   newParameters: Record<string, {key:string,label:string,value:number,source:string,visible?:boolean,editable?:boolean,locked?:boolean}>
 * } | null}
 */
export function importCharacterJsonGeneric(json) {
  if (!json || typeof json !== 'object') return null;

  const valueOverrides = {};
  if (json.parameters && typeof json.parameters === 'object') {
    Object.entries(json.parameters).forEach(([paramId, value]) => {
      if (typeof value === 'number') {
        valueOverrides[paramId] = value;
      }
    });
  }

  return {
    name: typeof json.name === 'string' ? json.name : undefined,
    valueOverrides,
    labelOverrides: {},
    newParameters: {}
  };
}
