// js/stamp-layer.js
// スタンプの表示レイヤー。盤面の右上に重ねて、届いたスタンプを一定時間だけ出す。
//
// スタンプはチャットに依らない素早い合図なので、状態にもログにも残さない。届くのは
// WebSocketの揮発メッセージ（server/index.jsのSEND_STAMP → SHOW_STAMP）だけで、
// このファイルはそれをEventBus経由（STAMP_RECEIVED）で受けて描くところだけを持つ。
// net-sync.jsと同じくinitStampLayer()をexportし、main.jsの初期化から1回だけ呼ぶ。
//
// 【重ならせ方】仕様上、他人のスタンプ同士は重ねてはいけないが、同じ人の連投は重ねてよい。
// そこで「参加者ごとに1列」を割り当てる。列は右から順に確保し、その人のスタンプが全部
// 消えた時点で解放して他の人が使えるようにする。同じ人の2枚目以降は同じ列の中で少しずつ
// ずらして重ねる（誰が何枚出したかは見えたまま、場所は取らない）。

import { EventBus } from './EventBus.js';
import { sendStamp } from './net-sync.js';
import { store } from './board-data-driven.js';
import { findStamp } from './stamp-registry.js';

// 1枚が残る時間。仕様の「1分ほど」。
const STAMP_LIFETIME_MS = 60_000;

// 同じ人が続けて出したときに、何pxずつずらして重ねるか。
const STACK_OFFSET_PX = 14;

// 同時に並べられる列の数。これを超えたら、一番古くから居座っている列を明け渡す。
// 盤面がスタンプで埋まって使えなくなる事故を防ぐための上限。
const MAX_COLUMNS = 5;

let layerEl = null;
// participantId → { index, items:Set<HTMLElement>, claimedAt:number }
const columns = new Map();

// 使われていない列番号のうち一番小さいもの。番号がそのまま右からの位置になる。
function pickColumnIndex() {
  const used = new Set([...columns.values()].map(column => column.index));
  for (let i = 0; i < MAX_COLUMNS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

// その人の列を確保する。空きが無ければ、一番古くから使われている列を畳んで明け渡す。
function claimColumn(participantId) {
  const existing = columns.get(participantId);
  if (existing) return existing;

  let index = pickColumnIndex();
  if (index === null) {
    const oldest = [...columns.entries()].sort((a, b) => a[1].claimedAt - b[1].claimedAt)[0];
    if (!oldest) return null;
    const [oldestId, oldestColumn] = oldest;
    index = oldestColumn.index;
    oldestColumn.items.forEach(item => item.remove());
    columns.delete(oldestId);
  }

  const column = { index, items: new Set(), claimedAt: Date.now() };
  columns.set(participantId, column);
  return column;
}

// 1枚を取り除き、その人のスタンプが無くなったら列を解放する。
function removeItem(participantId, item) {
  item.remove();
  const column = columns.get(participantId);
  if (!column) return;
  column.items.delete(item);
  if (column.items.size === 0) columns.delete(participantId);
}

// スタンプ1枚。画像と、その下に送信者名。
// 名前は他人が自由に決められる文字列なので、必ずtextContentで入れる（innerHTMLにしない）。
function buildStampElement(stamp, name) {
  const item = document.createElement('div');
  item.className = 'stamp-item';

  const image = document.createElement('img');
  image.className = 'stamp-item-image';
  image.alt = stamp.label;
  image.src = stamp.url;
  // 画像がまだ置かれていない場合でも「誰が何を出したか」は伝わるようにする。
  // 画像を用意する前から動作を確かめられるようにするための逃げ道でもある。
  image.addEventListener('error', () => {
    image.remove();
    const fallback = document.createElement('div');
    fallback.className = 'stamp-item-fallback';
    fallback.textContent = stamp.label;
    item.prepend(fallback);
  });
  item.appendChild(image);

  const nameEl = document.createElement('div');
  nameEl.className = 'stamp-item-name';
  nameEl.textContent = name || 'ゲスト';
  item.appendChild(nameEl);

  return item;
}

// 届いた1枚を盤面へ出す。
function showStamp({ stampId, participantId, name }) {
  if (!layerEl) return;
  // 「この部屋で使えるスタンプ」は適用中のプラグインで変わる（js/stamp-registry.js）。
  const stamp = findStamp(stampId, store.state.room?.activePlugin ?? null);
  // 知らないIDは黙って捨てる（相手が新しいカタログを持っている場合など）
  if (!stamp) return;

  const column = claimColumn(String(participantId || 'unknown'));
  if (!column) return;

  const item = buildStampElement(stamp, name);
  item.style.right = `calc(${column.index} * var(--stamp-column-width))`;
  // 同じ列の中で、既に出ている枚数だけ下へずらして重ねる
  item.style.top = `${column.items.size * STACK_OFFSET_PX}px`;

  column.items.add(item);
  layerEl.appendChild(item);

  const ownerId = String(participantId || 'unknown');
  setTimeout(() => removeItem(ownerId, item), STAMP_LIFETIME_MS);
}

/**
 * スタンプを送る。チャットコマンドからも、将来のスタンプ送信ボタンからもここを通す。
 * 送るのはIDだけで、表示名はサーバーが埋める（js/stamp-catalog.js冒頭参照）。
 * @param {string} stampId
 */
export function requestStamp(stampId) {
  sendStamp(stampId);
}

export function initStampLayer() {
  layerEl = document.getElementById('stampLayer');
  if (!layerEl) return;

  EventBus.subscribe('STAMP_RECEIVED', showStamp);
}
