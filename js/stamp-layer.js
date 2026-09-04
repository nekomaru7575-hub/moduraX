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
import { getCurrentParticipantId } from './local-identity.js';

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

// その列で名前を出すのは一番新しい1枚だけにする。連投すると同じ名前が縦に並んで
// 読みづらいため（列は参加者ごとなので、並んでいる名前はどれも同じ人のもの）。
// 足したときと減ったときの両方で呼ぶ：古い1枚が消えたら、残っている中の最新へ名前が戻る。
function refreshColumnNames(column) {
  const items = [...column.items];
  items.forEach((item, index) => {
    item.classList.toggle('is-name-hidden', index !== items.length - 1);
  });
}

// 1枚を取り除き、その人のスタンプが無くなったら列を解放する。
function removeItem(participantId, item) {
  item.remove();
  const column = columns.get(participantId);
  if (!column) return;
  column.items.delete(item);
  if (column.items.size === 0) {
    columns.delete(participantId);
    return;
  }
  refreshColumnNames(column);
}

// スタンプ1枚。画像と、その下に送信者名。
// 名前は他人が自由に決められる文字列なので、必ずtextContentで入れる（innerHTMLにしない）。
function buildStampElement(stamp, name) {
  const item = document.createElement('div');
  item.className = 'stamp-item';

  // 画像がまだ置かれていない場合でも「誰が何を出したか」は伝わるようにする。
  // 画像を用意する前から動作を確かめられるようにするための逃げ道でもある。
  // 絵の置き場が無い環境では url が最初から null になる（js/asset-base.js）。
  // その場合はimgを作らずに名前だけ出す。src=nullは "null" という宛先を取りに行って
  // 404を出すので、分かっているなら投げない。
  const nameOnly = () => {
    const fallback = document.createElement('div');
    fallback.className = 'stamp-item-fallback';
    fallback.textContent = stamp.label;
    item.prepend(fallback);
  };

  if (stamp.url) {
    const image = document.createElement('img');
    image.className = 'stamp-item-image';
    image.alt = stamp.label;
    image.src = stamp.url;
    image.addEventListener('error', () => {
      image.remove();
      nameOnly();
    });
    item.appendChild(image);
  } else {
    nameOnly();
  }

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
  const stamp = findStamp(stampId, store.state.room);
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
  refreshColumnNames(column);

  const ownerId = String(participantId || 'unknown');
  setTimeout(() => removeItem(ownerId, item), STAMP_LIFETIME_MS);
}

/**
 * スタンプを送る。チャットコマンドからも送信パネル（js/stamp-panel.js）からもここを通す。
 * 送るのはIDだけで、表示名はサーバーが埋める（js/stamp-catalog.js冒頭参照）。
 *
 * 集計もここで行う。数える場所を送信の入口1か所にまとめておくと、パネルから押しても
 * チャットコマンドで打っても同じように数えられる。
 *
 * 送信（揮発。連打よけの上限で間引かれる）と集計（状態。上限なし）は別の経路なので、
 * 上限に当たった枚は「盤面には出ないが数は増える」ことになる。これは意図した挙動で、
 * 数えたいのは押した回数だから。
 * @param {string} stampId
 */
export function requestStamp(stampId) {
  sendStamp(stampId);
  countStamp(stampId);
}

// 集計へ「自分がこれまでに出した枚数」を書き込む。送るのは増分ではなく枚数そのもの
// （理由はjs/game-store.jsのCOUNT_STAMP参照。1回届かなくても次に押した時点で全員が
// 正しい数に揃う）。
//
// 何を数えるか（プラグインのスタンプだけ）と、数えてよいか（実在する参加者か）の
// 判定はreducer側にある。サーバーでも同じ判定が走るので、ここでは投げるだけでよい。
function countStamp(stampId) {
  const participantId = getCurrentParticipantId();
  // 名乗っていない人は数える先が無い（スタンプ自体もサーバーが捨てる）
  if (!participantId) return;

  const current = store.state.stampCounts?.[stampId]?.[participantId];
  const count = (Number.isInteger(current) ? current : 0) + 1;

  store.dispatch('COUNT_STAMP', { stampId, participantId, count });
}

export function initStampLayer() {
  layerEl = document.getElementById('stampLayer');
  if (!layerEl) return;

  EventBus.subscribe('STAMP_RECEIVED', showStamp);
}
