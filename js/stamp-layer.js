// js/stamp-layer.js
// スタンプの表示レイヤー。盤面の右上に重ねて、届いたスタンプを一定時間だけ出す。
//
// スタンプはチャットに依らない素早い合図なので、状態にもログにも残さない。届くのは
// WebSocketの揮発メッセージ（server/index.jsのSEND_STAMP → SHOW_STAMP）だけで、
// このファイルはそれをEventBus経由（STAMP_RECEIVED）で受けて描くところだけを持つ。
// net-sync.jsと同じくinitStampLayer()をexportし、main.jsの初期化から1回だけ呼ぶ。
//
// 【置き方】仕様上、他人のスタンプ同士は重ねてはいけないが、同じ人の連投は重ねてよい。
// そこで「参加者ごとに決まった大きさの枠（エリア）」を1つ割り当てる。枠は右から順に確保し、
// その人のスタンプが全部消えた時点で解放して他の人が使えるようにする。同じ人の2枚目以降は
// その枠の中のランダムな位置へ置く。下へ積み上げていくと連投で盤面の縦を食い潰すため、
// 何枚出しても占める場所は枠1つぶんに収める。名前は枠に1つだけ出す。

import { EventBus } from './EventBus.js';
import { sendStamp } from './net-sync.js';
import { store } from './board-data-driven.js';
import { findStamp } from './stamp-registry.js';
import { getCurrentParticipantId } from './local-identity.js';

// 1枚が残る時間。仕様の「1分ほど」。
const STAMP_LIFETIME_MS = 60_000;

// 同時に並べられる枠の数。これを超えたら、一番古くから居座っている枠を明け渡す。
// 盤面がスタンプで埋まって使えなくなる事故を防ぐための上限。
// css/board.cssの#stampLayerの幅（この数×枠の幅）と揃えること。
const MAX_AREAS = 5;

// 1つの枠に同時に置いておく枚数の上限。超えたら古い順に消す。
// 送信の上限（js/stamp-catalog.jsのSTAMP_RATE_LIMIT）だけだと1分で数十枚まで溜まり、
// 枠が絵で塗り潰されて新しい1枚がどれか分からなくなるため。
const MAX_ITEMS_PER_AREA = 8;

// ランダムな位置の候補をいくつ引くか。その中から、既に置いてある枚から一番離れた所を選ぶ
// （完全なランダムだと直前の1枚の真上に落ちて、連投したのに増えたように見えないことがある）。
const PLACEMENT_CANDIDATES = 6;

let layerEl = null;
// participantId → { index, element, nameEl, items:Map<HTMLElement,{x,y}>, claimedAt:number }
const areas = new Map();

// 使われていない枠番号のうち一番小さいもの。番号がそのまま右からの位置になる。
function pickAreaIndex() {
  const used = new Set([...areas.values()].map(area => area.index));
  for (let i = 0; i < MAX_AREAS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

// その人の枠を確保する。空きが無ければ、一番古くから使われている枠を畳んで明け渡す。
function claimArea(participantId) {
  const existing = areas.get(participantId);
  if (existing) return existing;

  let index = pickAreaIndex();
  if (index === null) {
    const oldest = [...areas.entries()].sort((a, b) => a[1].claimedAt - b[1].claimedAt)[0];
    if (!oldest) return null;
    const [oldestId, oldestArea] = oldest;
    index = oldestArea.index;
    oldestArea.element.remove();
    areas.delete(oldestId);
  }

  const element = document.createElement('div');
  element.className = 'stamp-area';
  element.style.right = `calc(${index} * var(--stamp-area-width))`;

  const nameEl = document.createElement('div');
  nameEl.className = 'stamp-area-name';
  element.appendChild(nameEl);

  layerEl.appendChild(element);

  const area = { index, element, nameEl, items: new Map(), claimedAt: Date.now() };
  areas.set(participantId, area);
  return area;
}

// 枠の中の置き場所を決める。x・yは0〜1の割合で、CSS側で「枠の大きさ − 1枚の大きさ」に掛ける
// （枠の寸法はCSSだけが持ち、JSはpxを知らなくて済む）。
function pickPosition(area) {
  const placed = [...area.items.values()];
  let best = null;
  let bestDistance = -1;
  for (let i = 0; i < PLACEMENT_CANDIDATES; i++) {
    const candidate = { x: Math.random(), y: Math.random() };
    if (placed.length === 0) return candidate;
    const nearest = Math.min(...placed.map(p => Math.hypot(p.x - candidate.x, p.y - candidate.y)));
    if (nearest > bestDistance) {
      best = candidate;
      bestDistance = nearest;
    }
  }
  return best;
}

// 1枚を取り除き、その人のスタンプが無くなったら枠を解放する。
function removeItem(participantId, item) {
  item.remove();
  const area = areas.get(participantId);
  if (!area) return;
  area.items.delete(item);
  if (area.items.size === 0) {
    area.element.remove();
    areas.delete(participantId);
  }
}

// スタンプ1枚（画像だけ。送信者名は枠の側に1つだけ出す）。
function buildStampElement(stamp) {
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

  return item;
}

// 届いた1枚を盤面へ出す。
function showStamp({ stampId, participantId, name }) {
  if (!layerEl) return;
  // 「この部屋で使えるスタンプ」は適用中のプラグインで変わる（js/stamp-registry.js）。
  const stamp = findStamp(stampId, store.state.room);
  // 知らないIDは黙って捨てる（相手が新しいカタログを持っている場合など）
  if (!stamp) return;

  const ownerId = String(participantId || 'unknown');
  const area = claimArea(ownerId);
  if (!area) return;

  // 溢れる分は古い順に消す（Mapは入れた順を保つので、先頭が一番古い）
  while (area.items.size >= MAX_ITEMS_PER_AREA) {
    const [oldestItem] = area.items.keys();
    oldestItem.remove();
    area.items.delete(oldestItem);
  }

  const item = buildStampElement(stamp);
  const position = pickPosition(area);
  item.style.setProperty('--stamp-x', position.x.toFixed(3));
  item.style.setProperty('--stamp-y', position.y.toFixed(3));

  area.items.set(item, position);
  // 名前ラベルより手前へは出さない（あとから来た枚ほど上に重なる）
  area.element.insertBefore(item, area.nameEl);
  // 名前は他人が自由に決められる文字列なので、必ずtextContentで入れる（innerHTMLにしない）。
  // 途中で名前を変えた人は、最新の名前に揃える。
  area.nameEl.textContent = name || 'ゲスト';

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
