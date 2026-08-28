// js/parameters/sheet-source.js
// 「キャラクターシートのURLから取り込む」ときの受け付け先の宣言と、シートの値を読む小道具。
//
// 対応システムのうち4つ（シノビガミ・ドラクルージュ・フタリソウサ・銀剣のステラナイツ）は、
// どれも character-sheets.appspot.com に置かれたシートを読む。宣言はパスの1語しか違わなかった
// ので、その1語だけを受け取る作り方をここに置く。
//
// 【なぜ「データだけ」を宣言するのか】
// 画面（js/character-sheet-import.js）はこの宣言でURLを検査してキーだけを取り出し、
// サーバー（server/index.js の handleCharacterSheet）が同じ宣言から取得先を組み立てる。
// 宣言に無いURLはどちらの側でも通らないので、この経路を踏み台にして
// 「サーバーに任意の宛先を取りに行かせる」ことができない。
//
// 【DOM に触らないこと】
// プラグインの記述子は server/index.js が js/parameters/registry.js 経由で import している。
// ここで document を触ると、サーバーが起動できなくなる。

/**
 * character-sheets.appspot.com のシートを受け付ける宣言を作る。
 *
 * edit.html / display.html はどちらも人が見るページなので、キーだけを取り出して
 * JSONを返す口（display?ajax=1）へ付け替える。利用者はブラウザのURLをそのまま貼れる。
 *
 * @param {{ label: string, pathSegment: string }} options
 *   label       … 画面に出すシステム名（「Webキャラクターシート（〜）」の〜の部分）
 *   pathSegment … そのシステムのパス。シノビガミなら 'shinobigami'、フタリソウサなら '2s'。
 *                 同じサービスの他システムのシートを掴まないための絞り込みでもある
 */
export function createAppspotSheetSource({ label, pathSegment }) {
  const pathPrefix = `/${pathSegment}/`;
  return {
    label: `Webキャラクターシート（${label}）`,
    origin: 'https://character-sheets.appspot.com',
    pathPrefix,
    keyParam: 'key',
    keyPattern: /^[A-Za-z0-9_-]{8,200}$/,
    fetchPath: (key) => `${pathPrefix}display?ajax=1&key=${encodeURIComponent(key)}`,
    hint: `character-sheets.appspot.com${pathPrefix}edit.html?key=... の形のURL`
  };
}

/**
 * シートの文字列欄を読む。未記入は空文字にそろえる。
 */
export function sheetText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * シートの数値欄を、取り込み先のパラメータへ入れる。読めない値・空欄は入れない
 * （呼び出し側で既定値のまま残る）。
 */
export function assignSheetNumber(target, paramId, raw) {
  if (raw === null || raw === undefined || raw === '') return;
  const value = Number(raw);
  if (Number.isFinite(value)) target[paramId] = Math.trunc(value);
}
