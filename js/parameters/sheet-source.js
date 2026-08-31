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

/**
 * シートの「効果」のような、書式の入った文字列欄を読む。
 *
 * ゆとシートはHTMLへ埋める形で保存するので、本文に実体参照とタグが混じる
 * （グランクレストの天恵に `武器のダメージ属性に&lt;炎熱&gt;を追加` が入っていた）。
 * そのまま入れると画面に `&lt;炎熱&gt;` と出るため、ここで元の文字へ戻す。
 *
 * 【&amp; を最後に戻すこと】先に戻すと、`&amp;lt;` が `&lt;` になった後もう一度
 * 解釈されて `<` まで進んでしまう（二重復号）。
 *
 * 【戻して安全な理由】この値の行き先は、一覧ボックスの input.value と textContent だけで、
 * innerHTML へは渡らない（js/parameters/skill/skill-box.js）。将来この一覧を innerHTML で
 * 描く実装を足すなら、そちら側で js/html-escape.js の escapeHtml を通すこと。
 */
export function sheetRichText(value) {
  return sheetText(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
