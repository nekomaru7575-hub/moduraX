// 実体の置き場（js/asset-store.js）のうち、ブラウザに依存しない部分のテスト。
//
// IndexedDBが要る出し入れはここでは撃てない（Nodeに無い）ので、ブラウザで動かして
// 確かめる。ここで押さえるのは、間違えても画面には出ず、後から気づけない種類のもの：
//   ・参照の見分け（緩いと、状態に書かれた任意の文字列を鍵として引くことになる）
//   ・状態の歩き方（取りこぼすと、その絵だけ他の人に配られない）
//   ・差し替え（元の状態を書き換えると、書き出しただけで部屋が変わる）
//   ・base64の往復（崩れると、届いた実体がハッシュ検算で全部弾かれる）

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assetRef, assetRefHash, base64ToBlob, blobToBase64, collectAssetHashes, dataUrlToBlob,
  replaceAssetRefs
} from '../js/asset-store.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

// --- 参照の見分け ---

test('正しい形の参照だけを受け取る', () => {
  assert.equal(assetRefHash(assetRef(HASH_A)), HASH_A);
  assert.equal(assetRef(HASH_A), `/asset/${HASH_A}`);
});

test('参照でないものは全部null', () => {
  // 外部URL・データURL・R2のURLは触ってはいけない側
  assert.equal(assetRefHash('https://assets.example.com/trump/back.png'), null);
  assert.equal(assetRefHash('data:image/png;base64,AAAA'), null);
  assert.equal(assetRefHash(null), null);
  assert.equal(assetRefHash(undefined), null);
  assert.equal(assetRefHash(42), null);
  assert.equal(assetRefHash(''), null);
});

test('形が少しでも違えば受け取らない', () => {
  // 桁不足・桁超過・16進でない・大文字・前後に何か付く
  assert.equal(assetRefHash('/asset/' + 'a'.repeat(63)), null);
  assert.equal(assetRefHash('/asset/' + 'a'.repeat(65)), null);
  assert.equal(assetRefHash('/asset/' + 'g'.repeat(64)), null);
  assert.equal(assetRefHash('/asset/' + 'A'.repeat(64)), null);
  assert.equal(assetRefHash(`/asset/${HASH_A}?x=1`), null);
  assert.equal(assetRefHash(`/asset/${HASH_A}/../x`), null);
  assert.equal(assetRefHash(`http://evil.example/asset/${HASH_A}`), null);
  // 別の場所へ潜り込ませようとするもの
  assert.equal(assetRefHash('/asset/../../etc/passwd'), null);
});

// --- 状態の歩き方 ---

test('入れ子・配列の奥にある参照まで拾う', () => {
  const state = {
    room: { backgroundImage: assetRef(HASH_A), audioTracks: { t1: { url: assetRef(HASH_B) } } },
    tokens: { k1: { image: assetRef(HASH_A) } },
    decks: [{ cards: [{ image: assetRef(HASH_B) }, { image: 'https://ext/x.png' }] }]
  };
  const found = collectAssetHashes(state);
  assert.deepEqual([...found].sort(), [HASH_A, HASH_B].sort());
});

test('同じ絵が何度出てきても1つ', () => {
  const state = { a: assetRef(HASH_A), b: assetRef(HASH_A), c: { d: assetRef(HASH_A) } };
  assert.equal(collectAssetHashes(state).size, 1);
});

test('参照が1つも無ければ空', () => {
  const state = { room: { name: '部屋' }, tokens: { k1: { image: null } } };
  assert.equal(collectAssetHashes(state).size, 0);
});

test('循環参照があっても止まらない', () => {
  // 状態は木のはずだが、そこに寄りかからない（読み込んだファイル由来のこともある）
  const state = { image: assetRef(HASH_A), self: null };
  state.self = state;
  assert.deepEqual([...collectAssetHashes(state)], [HASH_A]);
});

// --- 差し替え ---

test('参照だけを差し替え、他はそのまま', () => {
  const state = {
    tokens: { k1: { image: assetRef(HASH_A), name: 'コマ' } },
    bg: 'https://ext/x.png',
    count: 3,
    flag: true,
    empty: null
  };
  const next = replaceAssetRefs(state, () => 'data:image/png;base64,XXXX');
  assert.equal(next.tokens.k1.image, 'data:image/png;base64,XXXX');
  assert.equal(next.tokens.k1.name, 'コマ');
  assert.equal(next.bg, 'https://ext/x.png');
  assert.equal(next.count, 3);
  assert.equal(next.flag, true);
  assert.equal(next.empty, null);
});

test('元の状態を書き換えない', () => {
  // storeの状態は凍結されているので、書き換えようとすれば例外になる。
  // 凍結されていない経路（読み込んだファイル）でも壊さないことを確かめる。
  const state = Object.freeze({ tokens: Object.freeze({ k1: Object.freeze({ image: assetRef(HASH_A) }) }) });
  const next = replaceAssetRefs(state, () => 'data:x');
  assert.equal(state.tokens.k1.image, assetRef(HASH_A));
  assert.equal(next.tokens.k1.image, 'data:x');
});

test('差し替えの関数にはハッシュと元の参照が渡る', () => {
  const seen = [];
  replaceAssetRefs({ a: assetRef(HASH_A) }, (hash, ref) => { seen.push([hash, ref]); return ref; });
  assert.deepEqual(seen, [[HASH_A, assetRef(HASH_A)]]);
});

test('配列の並びが保たれる', () => {
  const state = { list: [assetRef(HASH_A), 'x', assetRef(HASH_B)] };
  const next = replaceAssetRefs(state, (hash) => `<${hash.slice(0, 2)}>`);
  assert.deepEqual(next.list, ['<aa>', 'x', '<bb>']);
});

// --- base64の往復 ---

test('往復して中身が変わらない', async () => {
  const bytes = new Uint8Array(1000);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256;
  const blob = new Blob([bytes], { type: 'image/png' });

  const restored = base64ToBlob(await blobToBase64(blob), 'image/png');
  assert.equal(restored.size, blob.size);
  assert.equal(restored.type, 'image/png');
  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()), bytes);
});

test('小分けの境界をまたいでも崩れない', async () => {
  // 一度に渡すと引数の数の上限でスタックを使い切るので0x8000ずつ繋いでいる。
  // その境界で1バイトずれると、ハッシュ検算で全部弾かれる形で壊れる。
  const size = 0x8000 * 2 + 123;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = (i * 7) % 256;
  const blob = new Blob([bytes]);

  const restored = base64ToBlob(await blobToBase64(blob), '');
  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()), bytes);
});

test('壊れたbase64はnullを返す（例外にしない）', () => {
  assert.equal(base64ToBlob('これはbase64ではない###', 'image/png'), null);
});

// --- データURLの解き方 ---
// fetch()で解こうとすると、このアプリのCSP（connect-srcに data: が無い）に阻まれる。
// 阻まれた例外は呼び出し側のcatchに吸われて元の値が返るだけなので、**黙って何も起きない**
// 形で失敗する。実際にこの形で、取り込んだ画像がデータURLのまま部屋に残り続けていた。

test('base64のデータURLを解ける', () => {
  // 1x1の透明PNG
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const blob = dataUrlToBlob(dataUrl);
  assert.ok(blob, '解けること');
  assert.equal(blob.type, 'image/png');
  assert.ok(blob.size > 0);
});

test('base64でないデータURLも解ける', () => {
  const blob = dataUrlToBlob('data:image/svg+xml,%3Csvg%2F%3E');
  assert.ok(blob);
  assert.equal(blob.type, 'image/svg+xml');
});

test('charsetなどが付いていても型を取り違えない', () => {
  const blob = dataUrlToBlob('data:text/plain;charset=utf-8;base64,YWJj');
  assert.ok(blob);
  assert.equal(blob.type, 'text/plain');
});

test('データURLでないものはnull', () => {
  assert.equal(dataUrlToBlob('https://example.com/a.png'), null);
  assert.equal(dataUrlToBlob('/asset/' + 'a'.repeat(64)), null);
  assert.equal(dataUrlToBlob('data:壊れている'), null);
  assert.equal(dataUrlToBlob(null), null);
});
