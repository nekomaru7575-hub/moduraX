// js/marker-style.js
// 簡易マーカー（色と形だけで描くパネル。js/store/panels.jsのnormalizeMarker）の見た目を、
// 1つの要素へ当てる。盤面（js/board-data-driven.js）とダイアログのプレビュー
// （js/panel-dialog.js）で同じものを使い、置く前と置いた後の見た目がずれないようにする。
//
// 値はCSSOM（el.style.xxx =）でしか入れない。style属性を文字列で組むと、CSPに弾かれるうえ
// 色の文字列に細工があったときの逃げ道になる。渡すmarkerは正規化済みであること。
//
// 【フィルターが効く範囲】backdrop-filterは「その要素より先に描かれたもの」に掛かる。
// マーカーは#panel-layerの中にいるので、背景・マス目・重なり順の低いパネル／カード／デッキに
// 効き、層の外にいるコマ（css/board.cssの.token）には効かない。

const SVG_NS = 'http://www.w3.org/2000/svg';

// 形状ごとの切り抜き。四角・角丸・円はborder-radiusで、残りはclip-pathで作る
// （どちらもbackdrop-filterの効く範囲まで一緒に切り抜かれる）。
const SHAPE_STYLES = new Map([
  ['rect', { borderRadius: '', clipPath: '' }],
  ['rounded', { borderRadius: '20%', clipPath: '' }],
  ['ellipse', { borderRadius: '50%', clipPath: '' }],
  ['diamond', { borderRadius: '', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }],
  ['triangle', { borderRadius: '', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }],
  ['hexagon', { borderRadius: '', clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }]
]);

// モザイクの升目の大きさ（盤面ローカルのpx）。強さ1〜100をこの段数へ丸める：
// 升目ごとにSVGのフィルターを1つ作るので、段を細かくすると要素が増えるだけで見分けがつかない。
const MOSAIC_BLOCK_SIZES = [4, 8, 12, 16, 24, 32];

// 強さ(1〜100)からCSSのフィルター文字列を作る。種類はnormalizeMarkerで絞ってあるが、
// ここもMapで引いて、知らない種類は何も掛けない。
const FILTER_BUILDERS = new Map([
  ['blur', (s) => `blur(${(s * 0.2).toFixed(1)}px)`],
  ['mosaic', (s) => `url("#${ensureMosaicFilter(mosaicBlockSize(s))}")`],
  ['grayscale', (s) => `grayscale(${s}%)`],
  ['sepia', (s) => `sepia(${s}%)`],
  ['darken', (s) => `brightness(${Math.round(100 - s * 0.9)}%)`],
  ['brighten', (s) => `brightness(${Math.round(100 + s * 2)}%)`],
  ['invert', (s) => `invert(${s}%)`],
  ['saturate', (s) => `saturate(${Math.round(100 + s * 3)}%)`]
]);

/** 形状の表示名（ダイアログの選択肢） */
export const MARKER_SHAPE_LABELS = [
  ['rect', '四角（マスいっぱい）'],
  ['rounded', '角丸四角'],
  ['ellipse', '円（楕円）'],
  ['diamond', 'ひし形'],
  ['triangle', '三角'],
  ['hexagon', '六角形']
];

/** フィルターの表示名（ダイアログの選択肢）。先頭の''は「なし」 */
export const MARKER_FILTER_LABELS = [
  ['', 'なし'],
  ['blur', 'ぼかし'],
  ['mosaic', 'モザイク'],
  ['grayscale', '白黒'],
  ['sepia', 'セピア'],
  ['darken', '暗くする'],
  ['brighten', '明るくする'],
  ['invert', '色反転'],
  ['saturate', '彩度を上げる']
];

function mosaicBlockSize(strength) {
  const index = Math.min(MOSAIC_BLOCK_SIZES.length - 1,
    Math.floor((strength - 1) / 100 * MOSAIC_BLOCK_SIZES.length));
  return MOSAIC_BLOCK_SIZES[Math.max(0, index)];
}

let mosaicSvg = null;

// 升目の大きさごとの画素化フィルターを、ページに1度だけ作ってidを返す。
// 升目の真ん中の1点だけを残し（feFlood＋feTile＋feComposite）、それを升目いっぱいまで
// 太らせる（feMorphology）という定番の作り。
function ensureMosaicFilter(size) {
  const id = `marker-mosaic-${size}`;
  if (document.getElementById(id)) return id;

  if (!mosaicSvg) {
    mosaicSvg = document.createElementNS(SVG_NS, 'svg');
    mosaicSvg.setAttribute('width', '0');
    mosaicSvg.setAttribute('height', '0');
    mosaicSvg.setAttribute('aria-hidden', 'true');
    mosaicSvg.style.position = 'absolute';
    mosaicSvg.style.pointerEvents = 'none';
    document.body.appendChild(mosaicSvg);
  }

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = id;
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%');
  filter.setAttribute('height', '100%');
  const half = Math.floor(size / 2);
  const primitives = [
    ['feFlood', { x: half, y: half, width: 1, height: 1 }],
    ['feComposite', { width: size, height: size }],
    ['feTile', { result: 'grid' }],
    ['feComposite', { in: 'SourceGraphic', in2: 'grid', operator: 'in' }],
    ['feMorphology', { operator: 'dilate', radius: half }]
  ];
  for (const [tag, attrs] of primitives) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    filter.appendChild(node);
  }
  mosaicSvg.appendChild(filter);
  return id;
}

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/**
 * 要素へマーカーの見た目を当てる。markerがnullなら、当てたものを全部外す。
 * @param {HTMLElement} el
 * @param {Readonly<{shape: string, color: string, opacity: number,
 *   filter: {type: string, strength: number} | null}> | null} marker 正規化済みの値
 */
export function applyMarkerStyle(el, marker) {
  const shape = marker ? SHAPE_STYLES.get(marker.shape) : null;
  if (!marker || !shape) {
    el.style.backgroundColor = '';
    el.style.borderRadius = '';
    el.style.clipPath = '';
    el.style.backdropFilter = '';
    el.style.webkitBackdropFilter = '';
    return;
  }

  el.style.backgroundColor = hexToRgba(marker.color, marker.opacity);
  el.style.borderRadius = shape.borderRadius;
  el.style.clipPath = shape.clipPath;

  const build = marker.filter ? FILTER_BUILDERS.get(marker.filter.type) : null;
  const filter = build ? build(marker.filter.strength) : '';
  el.style.backdropFilter = filter;
  el.style.webkitBackdropFilter = filter;
}
