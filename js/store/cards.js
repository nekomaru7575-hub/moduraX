// js/store/cards.js
// カード・デッキ・カードストッカーの形を整える処理と、その上限。
//
// クライアントが自由に作れる payload（ADD_DECK・取り込んだ部屋データ）が通る場所なので、
// 長さも枚数もここで切る。状態は全員へ配られ Redis へも書き戻るため、payload は信用しない。

import { normalizeStackOrder, withMapEntry } from './patch.js';

// --- カード／デッキ（js/card-catalog.js・js/deck-dialog.js・js/board-data-driven.js） ---
// カードはパネルと同じ座標系（盤面ローカルのピクセル座標）・同じ重なり順の規則で盤面に
// 載るが、「裏のあいだは表面を出さない」「デッキから引く」という別の語彙を持つので
// スライスを分けてある（パネルはシーンに保存されるが、カード・デッキは保存されない、
// という扱いの違いもある。APPLY_SCENE参照）。
//
// 【秘匿の水準】裏向きのカードの表面(face)も、状態として全クライアントへ配られる。
// 隠しているのは描画だけで、開発者ツールを開けば読める（js/visibility.js冒頭・
// docs/plugin-guide.md 8.5と同じ「うっかり見えない」まで）。公開も閲覧も誰にでも
// 許す仕様なので、その前提で使うこと。

// カードの大きさ（マス数）。縦6×横4で固定する（トランプの縦横比3:2）。
export const CARD_COLS = 4;
export const CARD_ROWS = 6;

// カード・デッキの既定の重なり順。パネルの既定(0)より上＝パネルの上に乗る。
// コマ(z-index:10の.token)より手前に出ないことは、描画側の層(#panel-layer)が保証する。
export const DEFAULT_CARD_STACK_ORDER = 10;

// 一度に引ける枚数の上限。押し間違いで盤面がカードで埋まるのを防ぐだけの歯止め。
export const MAX_DRAW_COUNT = 20;

// クライアントが自由に作れるpayload（ADD_DECK・取り込んだ部屋データ）に対する上限。
// 状態は全員へ配られ、Redisへも書き戻るので、ここが無いと1回のアクションで部屋を
// 太らせられる（MAX_STAMP_COUNTと同じ趣旨の歯止め）。
export const MAX_DECK_CARDS = 200;
// カード名（画像が無いときにカードの中央へ出る文字）。トランプの「♠A」から
// タロットの「ワンドのナイト」までが収まる長さ。
export const MAX_CARD_TEXT_LENGTH = 24;
// カード情報（パネルのテキストと同じ役目。表向きのときだけ読める）。
// 200枚×この長さが状態に載るので、パネルと違って上限を持たせてある。
export const MAX_CARD_INFO_LENGTH = 300;
export const MAX_CARD_IMAGE_LENGTH = 1000;
export const MAX_CARD_COLOR_LENGTH = 32;
// 「見た人」(seenBy)の上限。参加者の数を超えることはないが、payloadは信用しない。
export const MAX_CARD_SEEN_BY = 100;

// デッキの定義（room.deckTemplates）の上限。1行＝1種類のカードで、行ごとに枚数を持つ。
// 展開後の合計はMAX_DECK_CARDSで別に切る（expandDeckTemplate・ADD_DECK）。
export const MAX_DECK_TEMPLATE_ROWS = 100;
export const MAX_DECK_TEMPLATE_ROW_COUNT = 99;
export const MAX_DECK_NAME_LENGTH = 40;

// 1部屋あたりの総数の上限。上の上限が「1つあたり何枚・何文字か」なのに対し、こちらは
// 「いくつ置けるか」。これが無いと、idを変えたADD_DECKを連打するだけで部屋を太らせられる
// （状態は全員へ配られ、Redisへも書き戻るので、流量制限の範囲でも効いてしまう）。
// 取り込んだ部屋データはreducerを通らずhydrate()へ直接入るため、そちらでも同じ数で切る。
//
// 最悪ケースの状態量は、デッキ20×200枚×約1.4KB≒5.6MBと札600枚×約1.4KB≒0.85MB。
// MAX_IMPORT_BYTES（書き出し64MBから導く）と同じ桁に収まる。実際の卓は「52枚の山を
// 5人分」でも山5つ・札260枚なので、普通の使い方は削らない。
//
// **下げるときは注意。** hydrate側は超過分を捨てるので、既にこの数を超えている部屋を
// 開くと差分が消える。上げる方向は安全。
export const MAX_ROOM_DECKS = 20;
export const MAX_ROOM_CARDS = 600;
export const MAX_DECK_TEMPLATES = 50;

export function clampCardText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// 画像URL。長すぎるもの・文字列でないものはnull（＝画像なし＝テキスト表示へ落ちる）。
export function normalizeCardImage(image) {
  if (typeof image !== 'string' || image === '' || image.length > MAX_CARD_IMAGE_LENGTH) return null;
  return image;
}

// カードの表面。imageがあれば画像で描き、無い／読めないときはtext（カード名）をcolorで描く
// （js/board-data-driven.jsのapplyCardAppearance）。
// infoはカード情報で、パネルのテキストと同じくマウスオーバー・右クリックメニューで読ませる。
// 表面の一部なので、裏向きの間は描画側が一切出さない（この機能より前のカードには
// キーが無いので、ここで空文字を補う）。
export function normalizeCardFace(face) {
  const source = (face && typeof face === 'object') ? face : {};
  return Object.freeze({
    image: normalizeCardImage(source.image),
    text: clampCardText(source.text, MAX_CARD_TEXT_LENGTH),
    info: clampCardText(source.info, MAX_CARD_INFO_LENGTH),
    color: clampCardText(source.color, MAX_CARD_COLOR_LENGTH) || null
  });
}

// カードの裏面。表面と違って文字は持たない（伏せた札は無地でよい）。
export function normalizeCardBack(back) {
  const source = (back && typeof back === 'object') ? back : {};
  return Object.freeze({
    image: normalizeCardImage(source.image),
    color: clampCardText(source.color, MAX_CARD_COLOR_LENGTH) || null
  });
}

export function normalizeSeenBy(seenBy) {
  if (!Array.isArray(seenBy)) return Object.freeze([]);
  const ids = [...new Set(seenBy.filter(id => typeof id === 'string' && id !== ''))];
  return Object.freeze(ids.slice(0, MAX_CARD_SEEN_BY));
}

// カード1枚を組み立てる。ADD_CARD・DRAW_CARDS・hydrateの3経路が必ずここを通るので、
// どこから入っても同じ形・同じ上限になる。
export function buildCard({
  id, face, back, x = 0, y = 0, faceUp = false,
  stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [],
  stockerId = null, stockerSeq = 0
}) {
  return Object.freeze({
    id,
    x: Number(x) || 0,
    y: Number(y) || 0,
    cols: CARD_COLS,
    rows: CARD_ROWS,
    stackOrder: normalizeStackOrder(stackOrder),
    locked: !!locked,
    faceUp: !!faceUp,          // 表向きか。裏のあいだは描画側がfaceを出さない
    face: normalizeCardFace(face),
    back: normalizeCardBack(back),
    seenBy: normalizeSeenBy(seenBy), // 「カードを見る」で表面を確認した人（MARK_CARD_SEEN）
    deckId: typeof deckId === 'string' && deckId ? deckId : null, // 出自のデッキ
    // カードストッカー（isStockerのパネル）へ収納されているか。入っている間は盤面に
    // 描かれない（コマのinBackyardと同じ扱い）。実体はここに残るのでfaceやseenByは保たれる。
    stockerId: typeof stockerId === 'string' && stockerId ? stockerId : null,
    // 収納した順。ストッカーの中身を並べる唯一の根拠（パネル側にID配列を持たせると
    // カードやパネルの削除で2か所がずれるため、順番もカード側に持たせる）。
    stockerSeq: Math.max(0, Math.round(Number(stockerSeq) || 0))
  });
}

// デッキが持つ札の並び。先頭が一番上（引くのは先頭から）。IDの重複は落とす。
export function normalizeDeckCards(cards) {
  if (!Array.isArray(cards)) return Object.freeze([]);

  const seen = new Set();
  const normalized = [];

  cards.forEach(card => {
    if (normalized.length >= MAX_DECK_CARDS) return;
    const id = card?.id;
    if (typeof id !== 'string' || id === '' || seen.has(id)) return;
    seen.add(id);
    normalized.push(Object.freeze({ id, face: normalizeCardFace(card.face) }));
  });

  return Object.freeze(normalized);
}

export function buildDeck({
  id, name = '', x = 0, y = 0, back = null, cards = [],
  stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false
}) {
  return Object.freeze({
    id,
    name: clampCardText(name, MAX_DECK_NAME_LENGTH),
    x: Number(x) || 0,
    y: Number(y) || 0,
    cols: CARD_COLS,
    rows: CARD_ROWS,
    stackOrder: normalizeStackOrder(stackOrder),
    locked: !!locked,
    back: normalizeCardBack(back),
    cards: normalizeDeckCards(cards)
  });
}

// 保存済み・同期されてきたカード／デッキを、状態へ入れられる形へ均す（hydrate専用）。
// 取り込んだ部屋データ（信用しないJSON）もここを通るので、上限もまとめて掛かる。
// 1つあたりの上限（buildCard・buildDeck）に加えて、要素の数そのものもここで切る
// （MAX_ROOM_CARDS・MAX_ROOM_DECKS・MAX_DECK_TEMPLATES）。取り込みはreducerを
// 通らないので、reducer側の歯止めだけでは1リクエストで好きなだけ積めてしまう。
export function isNamedObjectEntry([id, value]) {
  return typeof id === 'string' && id !== '' && !!value && typeof value === 'object';
}

export function normalizeCardMap(cards) {
  return Object.freeze(Object.fromEntries(
    Object.entries(cards || {})
      .filter(isNamedObjectEntry)
      .slice(0, MAX_ROOM_CARDS)
      .map(([id, card]) => [id, buildCard({ ...card, id })])
  ));
}

// 実在しないパネル（もう箱ではないパネルも含む）を指すstockerIdを外す。hydrate専用の安全網で、
// 位置は保存されていた(x,y)をそのまま使う（箱に入る前の場所なので、盤面のどこかには出る）。
export function withoutLostStockerCards(cards, panels) {
  const entries = Object.entries(cards);
  const lost = entries.filter(([, card]) => card.stockerId && !panels?.[card.stockerId]?.isStocker);
  if (lost.length === 0) return cards;

  const next = { ...cards };
  lost.forEach(([id, card]) => {
    next[id] = Object.freeze({ ...card, stockerId: null, stockerSeq: 0 });
  });
  return Object.freeze(next);
}

export function normalizeDeckMap(decks) {
  return Object.freeze(Object.fromEntries(
    Object.entries(decks || {})
      .filter(isNamedObjectEntry)
      .slice(0, MAX_ROOM_DECKS)
      .map(([id, deck]) => [id, buildDeck({ ...deck, id })])
  ));
}

// --- デッキの定義（room.deckTemplates） ---
// 「作り置きの設計図」。盤面に置かれた山札（state.decks）とは別物で、こちらは
// 1行＝1種類のカード＋枚数で持つ（同じ札が10枚あっても行は1つ）。
// デッキ作成UI（js/deck-editor-dialog.js）が書き、配置のときに1枚ずつへ展開する
// （js/card-catalog.jsのexpandDeckTemplate）。オリジナル表（room.originalTables）と
// 同じ「部屋のみんなで共有する作り置き」の置き場所。
export function buildDeckTemplateCard(card, index) {
  const source = (card && typeof card === 'object') ? card : {};
  return Object.freeze({
    // 行のid。編集画面が行を識別するためのもので、盤面のカードのidとは別
    id: typeof source.id === 'string' && source.id ? source.id.slice(0, 64) : `row-${index}`,
    name: clampCardText(source.name, MAX_CARD_TEXT_LENGTH),
    count: Math.max(1, Math.min(MAX_DECK_TEMPLATE_ROW_COUNT, Math.round(Number(source.count) || 1))),
    text: clampCardText(source.text, MAX_CARD_INFO_LENGTH), // カード情報
    image: normalizeCardImage(source.image)
  });
}

export function buildDeckTemplate({ id, name = '', back = null, cards = [] }) {
  const rows = Array.isArray(cards) ? cards.slice(0, MAX_DECK_TEMPLATE_ROWS) : [];
  return Object.freeze({
    id,
    name: clampCardText(name, MAX_DECK_NAME_LENGTH),
    back: normalizeCardBack(back),
    cards: Object.freeze(rows.map(buildDeckTemplateCard))
  });
}

export function normalizeDeckTemplateMap(templates) {
  return Object.freeze(Object.fromEntries(
    Object.entries(templates || {})
      .filter(isNamedObjectEntry)
      .slice(0, MAX_DECK_TEMPLATES)
      .map(([id, template]) => [id, buildDeckTemplate({ ...template, id })])
  ));
}

// 引いたカードの置き場所。デッキの右へ1マス空けて並べ、既に同じ場所にカードがあれば
// 1段ずつ下へ逃がす（引いたカードが見えない位置に積み上がるのを防ぐ）。reducerが計算する
// ので、全員の画面で必ず同じ位置に出る。gridSizeは描画側の定数なのでpayloadで受け取る。
export function findFreeCardSpot(cards, x, y, gridSize) {
  const step = (CARD_ROWS + 1) * gridSize;
  let spotY = y;

  for (let i = 0; i < 8; i += 1) {
    const taken = Object.values(cards).some(card => card.x === x && card.y === spotY);
    if (!taken) break;
    spotY += step;
  }

  return { x, y: spotY };
}

// --- カードストッカー（isStockerのパネル） ---
// カードをドラッグして収納できる箱。所有者を設定した箱は、入れる・見る・取り出すの
// すべてが所有者だけに限られる（設定しない箱は誰でも自由に使える）。
// 所有者の持ち方はコマのバックヤードと同じで、表示名を設定していれば参加者ID、
// ゲストならブラウザ単位のIDで持つ（MOVE_TO_BACKYARD参照）。
//
// 【秘匿の水準】所有者の箱でも、中のカードは状態として全員へ配られている。隠しているのは
// 画面の側だけで、開発者ツールを開けば読める（js/visibility.js冒頭と同じ「うっかり見えない」）。

/**
 * その人がこの箱を使ってよいか。所有者の設定が無い箱は誰でも使える。
 * 判定材料はすべてpayloadに載って配られるので、どのクライアントで再実行しても同じ答えになる。
 */
export function stockerAllowsUser(panel, participantId, localUserId) {
  if (!panel?.isStocker) return false;
  if (!panel.stockerOwnerId && !panel.stockerOwnerLocalId) return true; // 所有者なし＝誰でも
  if (panel.stockerOwnerId) return !!participantId && panel.stockerOwnerId === participantId;
  return !!localUserId && panel.stockerOwnerLocalId === localUserId;
}

// 収納の順番。今ある最大＋1で、状態だけから決まる（reducerで時刻や乱数を使わない）。
export function nextStockerSeq(cards) {
  return Object.values(cards).reduce((max, card) => Math.max(max, card.stockerSeq || 0), 0) + 1;
}

// ストッカーの中身を、入れた順に取り出す。
export function listStockerCards(cards, panelId) {
  return Object.values(cards)
    .filter(card => card.stockerId === panelId)
    .sort((a, b) => a.stockerSeq - b.stockerSeq);
}

/**
 * 箱の中のカードを盤面へ出す。箱が消える・箱でなくなるすべての経路（REMOVE_PANEL、
 * ストッカー解除、シーンでのパネル総入れ替え）から通す。ここを通さないと、
 * 消えたパネルを指したままのカードがどこにも描かれない迷子になる。
 *
 * @param {object} cards state.cards
 * @param {object} panel 消える（箱でなくなる）パネル。位置の基準に使う
 * @param {number} gridSize 描画側のマスの大きさ（payloadで受け取る。DRAW_CARDS参照）
 */
export function releaseStockerCards(cards, panel, gridSize) {
  const stored = listStockerCards(cards, panel?.id);
  if (stored.length === 0) return cards;

  const grid = Math.max(1, Math.round(Number(gridSize) || 25));
  let next = cards;

  stored.forEach((card, index) => {
    // 箱の右へ1枚ずつ。既に埋まっていれば1段下へ逃がす（DRAW_CARDSと同じ並べ方）
    const baseX = (panel.x || 0) + (CARD_COLS + 1) * grid * (index + 1);
    const spot = findFreeCardSpot(next, baseX, panel.y || 0, grid);
    next = withMapEntry(next, card.id, Object.freeze({
      ...card, stockerId: null, stockerSeq: 0, x: spot.x, y: spot.y
    }));
  });

  return next;
}
