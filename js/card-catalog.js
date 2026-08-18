// js/card-catalog.js
// 「盤面に置けるカードの束（デッキ）」の既定の中身を持つ表。js/stamp-catalog.jsと同じ構えで、
// DOM/windowには一切触れない純データ（サーバーでも読み込めるようにしておく）。
//
// 【カードの表面・裏面】
// カード1枚の見た目は { image, text, color } の3つで持つ。imageがあれば画像で描き、
// 画像が無い／読めないときはtextをcolorで描く（js/board-data-driven.jsのapplyCardAppearance）。
// スタンプが「ファイルが無い間は枠とラベルだけで表示する」（image/stamps/README.txt）のと
// 同じ姿勢で、画像を1枚も置いていなくても機能としては成立する。
//
// 【画像URLはここで組み立てる】
// 画像のパスは cardImageUrl() が「フォルダ名＋規則」から組み立てる。表の側にパス文字列を
// 直書きさせないのは、js/stamp-registry.jsの「URLは受け取った側が組み立てる」と同じ約束。
// 差し替えたいときは image/trump/ の中身を置き換えるだけでよい（image/trump/README.txt）。
//
// 【デッキを増やすとき】
// DECK_TEMPLATESへ1件足す。将来「デッキを新規作成するUI」を入れるときも、
// build()が返すのと同じ形（{ face } の配列）を作って渡せばそのまま載る。

// トランプ画像の置き場。フォルダ名は本番（Linux）で大文字小文字が区別される。
export const CARD_IMAGE_DIR = 'image/trump';

// スート。idはそのまま画像ファイル名の一部になるので、平易な語だけにする。
const SUITS = [
  { id: 'spade', symbol: '♠', color: '#1b1b1b' },
  { id: 'heart', symbol: '♥', color: '#c0392b' },
  { id: 'diamond', symbol: '♦', color: '#c0392b' },
  { id: 'club', symbol: '♣', color: '#1b1b1b' }
];

// 1〜13のうち、数字ではなく文字で出すもの（画像が無いときのテキスト表示用）。
const RANK_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

const JOKER_COLOR = '#7b4ea8';

// 画像ファイル名の規則： card_<スート>_<2桁の数字>.png / card_joker.png / card_back.png
function cardImageUrl(fileName) {
  return `${CARD_IMAGE_DIR}/${fileName}`;
}

// デッキの既定の裏面（差し替えはデッキ配置ダイアログから）。
export const TRUMP_BACK = Object.freeze({ image: cardImageUrl('card_back.png'), color: null });

function trumpFace(suit, rank) {
  const label = RANK_LABELS[rank] || String(rank);
  return {
    image: cardImageUrl(`card_${suit.id}_${String(rank).padStart(2, '0')}.png`),
    text: `${suit.symbol}${label}`,
    color: suit.color
  };
}

function jokerFace() {
  return { image: cardImageUrl('card_joker.png'), text: 'JOKER', color: JOKER_COLOR };
}

/**
 * 簡易トランプ1組。4スート×13枚を、スート順・A→K順で返す（並べ替えはシャッフルの役目）。
 * @param {{jokers?: number}} options jokers＝加えるジョーカーの枚数（既定0）
 * @returns {{face: {image: string, text: string, color: string}}[]}
 */
export function buildSimpleTrumpDeck({ jokers = 0 } = {}) {
  const cards = [];

  SUITS.forEach(suit => {
    for (let rank = 1; rank <= 13; rank += 1) {
      cards.push({ face: trumpFace(suit, rank) });
    }
  });

  for (let i = 0; i < Math.max(0, Math.min(4, Math.round(jokers))); i += 1) {
    cards.push({ face: jokerFace() });
  }

  return cards;
}

/**
 * 配置できるデッキの種類。デッキ配置ダイアログ（js/deck-dialog.js）が選択肢として並べる。
 * jokerOption＝「ジョーカーを入れる」チェックを出すか。
 */
export const DECK_TEMPLATES = [
  {
    id: 'trump',
    label: '簡易トランプ',
    defaultName: 'トランプ',
    jokerOption: true,
    back: TRUMP_BACK,
    build: buildSimpleTrumpDeck
  }
];

export function findDeckTemplate(id) {
  return DECK_TEMPLATES.find(template => template.id === id) || null;
}
