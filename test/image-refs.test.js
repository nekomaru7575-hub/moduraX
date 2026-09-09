// 画像URLの検分と列挙（js/store/images.js）のテスト。
//
// プールそのもの（js/image-pool.js）はIndexedDBが要るのでここでは撃てない。ブラウザで
// 動かして確かめる。ここで押さえるのは、間違えても画面には何も出ず、後から気づけない種類：
//   ・プールの中だけで使う参照が状態へ漏れないこと（漏れると、その人だけ絵が見える）
//   ・使い回しの記憶が、消えた画像を指さないこと（部屋を削除したあとの404）
//   ・状態の歩き方（音源を画像として拾わない／画像の置き場所を増やしても追随する）
//   ・プールへ入れてよい種類（SVGを通すとP2P卓だけXSSの口が開く）

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  collectImageUrls, imageUsableFor, normalizeImageRef, pickReusableCommit, poolMimeAllowed
} from '../js/store/images.js';

const HASH_A = 'a'.repeat(64);
const R2_A = 'https://img.example.com/rooms/room-1/aaaa.png';
const R2_B = 'https://img.example.com/rooms/room-1/bbbb.png';
const DATA_URL = 'data:image/png;base64,AAAA';

// --- 状態に載せてよい値の門 ---

test('文字列はそのまま通る（データURLを含む）', () => {
  // 既存の緩さを壊していないことの確認。R2が無い環境ではデータURLが状態に載る
  assert.equal(normalizeImageRef(R2_A), R2_A);
  assert.equal(normalizeImageRef(DATA_URL), DATA_URL);
  assert.equal(normalizeImageRef(`/asset/${HASH_A}`), `/asset/${HASH_A}`);
});

test('プールの参照は状態に載せない', () => {
  // これが本命。セレクタの中だけで使う形（js/image-selector-dialog.js）が
  // 手違いで状態へ渡っても、ここで落ちる
  assert.equal(normalizeImageRef({ kind: 'pool', hash: HASH_A }), null);
  assert.equal(normalizeImageRef({ toString: () => R2_A }), null);
  assert.equal(normalizeImageRef([R2_A]), null);
});

test('文字列でないもの・空文字はnull', () => {
  assert.equal(normalizeImageRef(null), null);
  assert.equal(normalizeImageRef(undefined), null);
  assert.equal(normalizeImageRef(''), null);
  assert.equal(normalizeImageRef(0), null);
  assert.equal(normalizeImageRef(false), null);
});

// --- プールへ入れてよい種類 ---

test('画像4種だけを受け取る', () => {
  assert.equal(poolMimeAllowed('image/png'), true);
  assert.equal(poolMimeAllowed('image/jpeg'), true);
  assert.equal(poolMimeAllowed('image/gif'), true);
  assert.equal(poolMimeAllowed('image/webp'), true);
});

test('SVGは受け取らない', () => {
  // サーバーが排除しているものを通すと「プールには入るのに必ず断られる」食い違いになり、
  // P2P卓では自オリジンから配られるのでXSSの口になる
  assert.equal(poolMimeAllowed('image/svg+xml'), false);
  assert.equal(poolMimeAllowed('image/svg+xml; charset=utf-8'), false);
  assert.equal(poolMimeAllowed('IMAGE/SVG+XML'), false);
});

test('画像でないもの・崩れた指定は受け取らない', () => {
  assert.equal(poolMimeAllowed('text/html'), false);
  assert.equal(poolMimeAllowed('audio/mpeg'), false);
  assert.equal(poolMimeAllowed(''), false);
  assert.equal(poolMimeAllowed(null), false);
  assert.equal(poolMimeAllowed(undefined), false);
  assert.equal(poolMimeAllowed('image/pngx'), false);
});

test('大文字・パラメータ付き・前後の空白は均して受け取る', () => {
  // File.typeはブラウザが決めるので、形の揺れで正しい画像を断らないようにする
  assert.equal(poolMimeAllowed('IMAGE/PNG'), true);
  assert.equal(poolMimeAllowed('image/jpeg; charset=x'), true);
  assert.equal(poolMimeAllowed('  image/webp  '), true);
});

// --- 状態の歩き方 ---

test('入れ子・配列の奥にある画像まで拾う', () => {
  const state = {
    room: {
      backgroundImage: R2_A,
      scenes: { s1: { backgroundImage: R2_B, panels: { p1: { image: R2_A } } } }
    },
    tokens: { k1: { image: DATA_URL } },
    panels: { p9: { image: `/asset/${HASH_A}` } }
  };
  assert.deepEqual(
    [...collectImageUrls(state)].sort(),
    [R2_A, R2_B, DATA_URL, `/asset/${HASH_A}`].sort()
  );
});

test('カードとデッキの画像も拾う', () => {
  // サーバーのadoptStateMediaはここを歩いていない（既存の抜け）。セレクタの一覧では
  // 拾えていること——使用中の画像が一覧に出ないと、上げ直しを省く判断も外れる
  const state = {
    cards: { c1: { image: R2_A } },
    room: { deckTemplates: { d1: { back: { image: R2_B }, cards: [{ image: R2_A }] } } }
  };
  assert.deepEqual([...collectImageUrls(state)].sort(), [R2_A, R2_B].sort());
});

test('部屋スタンプのurlは拾い、音源のurlは拾わない', () => {
  // スタンプだけは項目名が'url'（js/store/stamps.js）。ただの'url'を通すと音源トラックの
  // urlまで拾い、セレクタに音源が「壊れた画像」として並ぶ
  const state = {
    room: {
      stamps: { st1: { url: R2_A, key: 'rooms/room-1/aaaa.png' } },
      audioTracks: { t1: { url: 'https://img.example.com/rooms/room-1/bgm.mp3' } }
    }
  };
  assert.deepEqual([...collectImageUrls(state)], [R2_A]);
});

test('画像を持たない項目は拾わない', () => {
  const state = {
    room: { name: 'テスト部屋', backgroundImageKey: 'rooms/room-1/aaaa.png' },
    tokens: { k1: { name: 'コマ', color: '#fff', image: null } }
  };
  // backgroundImageKeyは'image'で終わらないので拾わない（キーはURLではない）
  assert.deepEqual([...collectImageUrls(state)], []);
});

test('循環参照で止まらない', () => {
  const state = { room: { backgroundImage: R2_A } };
  state.room.self = state;
  assert.deepEqual([...collectImageUrls(state)], [R2_A]);
});

test('空の状態でも落ちない', () => {
  assert.deepEqual([...collectImageUrls({})], []);
  assert.deepEqual([...collectImageUrls(null)], []);
});

// --- 用途ごとの受け入れ ---

test('スタンプはアップロード済みの画像だけ', () => {
  assert.equal(imageUsableFor(R2_A, 'stamp').ok, true);
  assert.equal(imageUsableFor(`/asset/${HASH_A}`, 'stamp').ok, true);
  // データURLは状態側（isAllowedRoomStampUrl）で落ちるので、選ばせてはいけない
  assert.equal(imageUsableFor(DATA_URL, 'stamp').ok, false);
  assert.equal(imageUsableFor('http://img.example.com/x.png', 'stamp').ok, false);
  assert.equal(imageUsableFor('image/stamps/x.png', 'stamp').ok, false);
});

test('カードは長さで落ちる', () => {
  const longDataUrl = `data:image/png;base64,${'A'.repeat(1000)}`;
  assert.equal(imageUsableFor(longDataUrl, 'card').ok, false);
  assert.equal(imageUsableFor(R2_A, 'card').ok, true);
});

test('背景・パネル・コマはデータURLも通る', () => {
  // R2が使えない環境でも画像が使えること（データURL退避）を壊さない
  const longDataUrl = `data:image/png;base64,${'A'.repeat(5000)}`;
  assert.equal(imageUsableFor(longDataUrl, 'background').ok, true);
  assert.equal(imageUsableFor(longDataUrl, 'panel').ok, true);
  assert.equal(imageUsableFor(longDataUrl, 'token').ok, true);
});

test('空の指定はどの用途でも通らない', () => {
  for (const purpose of ['background', 'panel', 'token', 'card', 'stamp']) {
    assert.equal(imageUsableFor('', purpose).ok, false);
    assert.equal(imageUsableFor(null, purpose).ok, false);
    assert.equal(imageUsableFor({ kind: 'pool' }, purpose).ok, false);
  }
});

// --- 上げ直しを省く判断 ---

test('状態に写っているURLだけ使い回す', () => {
  const memory = { [HASH_A]: R2_A };
  assert.equal(pickReusableCommit(memory, new Set([R2_A]), HASH_A), R2_A);
});

test('状態に無いURLは使い回さない', () => {
  // これが本命。部屋を削除して同じ番号の部屋ができても、消えたオブジェクトを指さない
  const memory = { [HASH_A]: R2_A };
  assert.equal(pickReusableCommit(memory, new Set(), HASH_A), null);
  assert.equal(pickReusableCommit(memory, new Set([R2_B]), HASH_A), null);
});

test('記憶が無い・崩れているときは使い回さない', () => {
  assert.equal(pickReusableCommit(null, new Set([R2_A]), HASH_A), null);
  assert.equal(pickReusableCommit({}, new Set([R2_A]), HASH_A), null);
  assert.equal(pickReusableCommit({ [HASH_A]: null }, new Set([R2_A]), HASH_A), null);
  assert.equal(pickReusableCommit({ [HASH_A]: R2_A }, new Set([R2_A]), ''), null);
  assert.equal(pickReusableCommit({ [HASH_A]: R2_A }, null, HASH_A), null);
});

test('プロトタイプ経由の値を引かない', () => {
  // 記憶はlocalStorage由来＝外から書き換えられる値。'__proto__'や'toString'を鍵に
  // されても、持っていないものは持っていないと答える
  const memory = { [HASH_A]: R2_A };
  assert.equal(pickReusableCommit(memory, new Set([R2_A]), '__proto__'), null);
  assert.equal(pickReusableCommit(memory, new Set([R2_A]), 'toString'), null);
  assert.equal(pickReusableCommit(memory, new Set([R2_A]), 'constructor'), null);
});
