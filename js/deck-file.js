// js/deck-file.js
// デッキの定義（room.deckTemplates の1件）をJSONファイルへ書き出す／読み込む。
// js/character-snapshot.js と同じ流儀で、マーカー・組み立て・読み取りを1ファイルにまとめる
// （書き出し側と読み込み側の形がズレて読めなくなる事故を防ぐため）。
//
// なぜ要るか：デッキの定義は部屋ごとに保存される。作ったタロットを別の部屋や次回の卓でも
// 使えるようにする持ち出し口がこれ。
//
// 【画像の引き取り】
// ファイルに載っている画像URLは、書き出した部屋のR2を指している。その部屋を削除すると
// フォルダごと消えて404になるので、取り込むときにこの部屋へ複製し直す
// （adoptImageIntoRoom。js/image-upload.js 冒頭に同じ理由が書いてある）。

import { parseUntrustedJson } from './untrusted-json.js';
import { adoptImageIntoRoom } from './image-upload.js';

// 他のJSON（コマのスナップショット・部屋の全データ・外部シート）と取り違えないための印。
export const DECK_FILE_FORMAT = 'mojuraX-deck-v1';

export function isDeckFile(json) {
  return !!json && json.__format === DECK_FILE_FORMAT;
}

/**
 * 書き出す中身。idは持たせない（取り込んだ先で新しく採番する。同じファイルを2回読んで
 * 片方が消えるより、2つのデッキとして並ぶほうが分かりやすい）。
 * @param {{name: string, back: object, cards: object[]}} template
 */
export function buildDeckFile(template) {
  return {
    __format: DECK_FILE_FORMAT,
    name: template.name,
    back: { image: template.back?.image ?? null, color: template.back?.color ?? null },
    cards: (template.cards || []).map(card => ({
      name: card.name,
      count: card.count,
      text: card.text,
      image: card.image ?? null
    }))
  };
}

// ファイル名に使えない文字を落とす。デッキ名をそのまま使えるようにするためだけの処理。
export function deckFileName(name) {
  const safe = String(name || 'deck').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  return `${safe || 'deck'}.json`;
}

/**
 * 読み込んだテキストをデッキの定義（SAVE_DECK_TEMPLATE のpayloadに渡せる形）へ均す。
 * 危険なキーはparseUntrustedJsonが落とす。値の上限はreducer側（buildDeckTemplate）が
 * 掛けるので、ここでは形だけを整える。
 *
 * 画像は「この部屋のもの」へ引き取り直す。R2が使えない環境では元の値がそのまま返るので、
 * 取り込み自体は成立する（画像が出ないだけ）。
 *
 * @param {string} text ファイルの中身
 * @param {(index: number) => string} generateRowId 行のidを作る関数
 * @returns {Promise<{name: string, back: object, cards: object[]} | null>} 形式が違えばnull
 */
export async function readDeckFile(text, generateRowId) {
  const json = parseUntrustedJson(text);
  if (!isDeckFile(json)) return null;

  const rows = Array.isArray(json.cards) ? json.cards : [];

  const cards = await Promise.all(rows.map(async (row, index) => ({
    id: generateRowId(index),
    name: typeof row?.name === 'string' ? row.name : '',
    count: Number(row?.count) || 1,
    text: typeof row?.text === 'string' ? row.text : '',
    image: await adoptImageIntoRoom(row?.image ?? null, 'card')
  })));

  return {
    name: typeof json.name === 'string' ? json.name : '',
    back: {
      image: await adoptImageIntoRoom(json.back?.image ?? null, 'card'),
      color: json.back?.color ?? null
    },
    cards
  };
}
