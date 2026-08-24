// js/icons.js
// 画面の操作部品に置くアイコンを、ここでだけ定義する。
//
// 【なぜ集めたか】以前はボタンの絵文字（🔒 🔊 ▶ 📲 …）がそのままアイコン代わりだった。
// 絵文字の字面はOSとブラウザが決めるので、線の太さ・角の丸み・色（絵文字は多くの環境で
// カラー固定）が環境ごとに変わり、隣り合うボタン同士ですら揃わない。ヘッダーのように
// ♪ ▤ + ⋮ と絵文字が並ぶ場所では、これが特に目立っていた。
//
// 【揃えている条件】24×24の座標系・線幅2・端と角は丸・塗りなし・色はcurrentColor。
// currentColorなので、ボタンの文字色（選択中は白、通常は灰）にそのまま追従する。
// 大きさは css/tokens.css の .icon で 1em に固定しているため、置いた場所の文字サイズに
// 合う。個々の呼び出し側で寸法を指定しないこと。
//
// 【絵文字を残した場所】
// - チャットログに流れる文章の中（「⚠ 通信に失敗しました」など）。あれは他の人にも
//   同期される「文字列」であって、DOMの部品ではない。SVGは入れられない。
// - トランプのスート（♠♥♦♣）とスタンプのラベル。アイコンではなく、それ自体が中身。
// - 部屋一覧の<option>（js/room-index.js）。HTMLの仕様上、<option>の中に要素を置けない。

const SVG_NS = 'http://www.w3.org/2000/svg';

// 図形の中身だけを持つ。svg要素の属性（viewBox・線幅など）は下のparseIconが一括で付ける。
const ICON_SHAPES = {
  // 限定公開の目印。閉じた錠と開いた錠は、掛け金の向きだけで見分けが付くようにしている。
  lock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.6-1.4"/>',

  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  // 保存できた、のような完了の合図。素のチェックより強く見せたいときに使う。
  'check-circle': '<path d="M21.8 10.6A10 10 0 1 1 16 3"/><path d="m8.5 11.5 3.5 3.5L22 5"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',

  play: '<path d="M6 4.2 19 12 6 19.8Z"/>',
  // 割り込み予約（次に動く人）の目印。
  'skip-next': '<path d="M5 4.5 15 12 5 19.5Z"/><path d="M19 5v14"/>',
  'volume-on': '<path d="M11 5 6.5 9H3v6h3.5L11 19Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  'volume-off': '<path d="M11 5 6.5 9H3v6h3.5L11 19Z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',

  // ヘッダーの並び。▤（パネル表示）と⋮（ルームメニュー）を置き換えている。
  panels: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  more: '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/>'
    + '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>'
    + '<circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',

  // ホーム画面への追加（PWA）。端末に入れる、という向きを矢印で示す。
  install: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/>',
  'wifi-off': '<path d="m2 2 20 20"/><path d="M8.6 16.1a5 5 0 0 1 6.8 0"/>'
    + '<path d="M5 12.6a10 10 0 0 1 5.2-2.4"/><path d="M16.7 11.1A10 10 0 0 1 19 12.6"/>'
    + '<path d="M1.5 9.1A16 16 0 0 1 6 6.2"/><path d="M10.7 5.1A16 16 0 0 1 22.5 9.1"/>'
    + '<path d="M12 20h.01"/>',

  // 何も描かない場所取り。一覧の一部の行にだけアイコンが付くとき、付かない行の文字が
  // 左へずれて段が崩れるのを防ぐ（例：js/mobile-layout.jsの選択中チェック）。
  blank: ''
};

// パースは1種類につき1回だけ。以降はcloneNodeで複製する（1つのDOMノードは
// 1箇所にしか置けないので、使い回しではなく複製が必要）。
const templates = new Map();

function parseIcon(name) {
  const shapes = ICON_SHAPES[name];
  if (shapes === undefined) {
    // 名前の打ち間違いで画面ごと落とすより、その場所だけ空にして気づけるようにする。
    console.warn(`[icons] 未定義のアイコン: ${name}`);
    return null;
  }
  // innerHTMLを使わずDOMParserで組む（このファイルの中身は固定文字列だが、
  // このコードベースではDOMへの文字列流し込みを避ける方針で通している）。
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" class="icon" fill="none"`
    + ` stroke="currentColor" stroke-width="2" stroke-linecap="round"`
    + ` stroke-linejoin="round">${shapes}</svg>`,
    'image/svg+xml'
  );
  return doc.documentElement;
}

/**
 * アイコン1つを作って返す。
 * @param {string} name ICON_SHAPESのキー
 * @param {string} [label] 読み上げに乗せたい語。文字を伴わないアイコン（鍵の目印など）で
 *   意味が絵にしか無いときに渡す。渡さない場合はaria-hidden＝装飾扱いになる。
 */
export function createIcon(name, label = '') {
  if (!templates.has(name)) templates.set(name, parseIcon(name));
  const template = templates.get(name);
  if (!template) return document.createElementNS(SVG_NS, 'svg');

  const svg = template.cloneNode(true);
  if (label) {
    svg.setAttribute('role', 'img');
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = label;
    svg.insertBefore(title, svg.firstChild);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return svg;
}

/**
 * 要素の中身を「アイコンだけ」に差し替える。ボタンの中身を作り直す用途を想定していて、
 * 既にあった子（前回のアイコン）は捨てる。
 */
export function setIcon(el, name, label = '') {
  el.replaceChildren(createIcon(name, label));
}

/**
 * 要素の中身を「アイコン＋文字」に差し替える。
 * 鍵の目印のように、文字の側に書かれていない意味をアイコンが持つ場合はlabelを渡すこと
 * （「限定公開 タブ名」と読み上げられる）。絵文字の🔒は読み上げ機が「錠」と読んでいたので、
 * labelを省くとそこだけ情報が減る。
 */
export function setIconText(el, name, text, label = '') {
  const icon = createIcon(name, label);
  if (text) icon.classList.add('icon-lead');
  el.replaceChildren(icon, document.createTextNode(text));
}

/**
 * HTMLに直接書いてあるアイコン置き場を埋める。
 *   <button data-icon="music">…</button>   … その要素の中身をアイコンにする
 *   <span class="icon-lead" data-icon="music"></span> … spanごとアイコンに差し替える
 * ページの入口（今は js/main.js だけ）から1回呼ぶ。
 * HTMLの中に線データを書き写さずに済ませるための仕組みで、こうしておくと形を直すのが
 * このファイル1箇所で済む。
 *
 * spanを残さず差し替えるのは、置き場所のためだけのspanが既存のCSSに拾われるため。
 * 実際 index.html には .app-header span（文字色#888・0.9rem）があり、見出しの中に
 * spanを置いた時点でアイコンがその色と大きさになってしまった。
 */
export function applyStaticIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const icon = createIcon(el.dataset.icon, el.dataset.iconLabel || '');
    if (el.tagName === 'SPAN') {
      // 置き場所のspanは消える。spanに付けていたclass（icon-leadなど）はアイコンへ引き継ぐ。
      el.classList.forEach(name => icon.classList.add(name));
      el.replaceWith(icon);
    } else {
      // ボタンなどはそのまま残し、中身だけアイコンにする。ここでclassを引き継ぐと
      // ボタンの見た目の指定（幅36pxなど）がアイコンにも掛かって膨らむ。
      el.replaceChildren(icon);
    }
  });
}
