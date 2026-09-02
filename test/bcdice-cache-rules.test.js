// BCDiceの中継キャッシュの判断（server/bcdice-cache-rules.js）のテスト。
//
// ここは一度間違えている。上流の4xxをまとめて「そのシステムは存在しない」として1時間
// 覚えていたため、403（弾かれた）や429（叩きすぎ）で**特定のシステムのダイス判定だけが
// 1時間効かなくなる**状態になっていた。しばらくすると直るので、見ていても原因に辿り着けない。
// 同じ間違いをもう一度しないよう、ステータスごとの意味を固定しておく。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  meansMissing, decideCacheRead, buildUnavailableEntry,
  MISS_CACHE_MS, UNAVAILABLE_COOLDOWN_MS
} from '../server/bcdice-cache-rules.js';

const CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000;

// --- どの答えが「無い」を意味するか ---

test('400・404・410が「そのシステムは無い」', () => {
  // 400が入るのは実測による：BCDiceは実在しないIDに404ではなく400を返す。
  // ここを外すと、打ち間違えたIDのたびに毎回上流を叩きに行くことになる
  assert.equal(meansMissing(400), true);
  assert.equal(meansMissing(404), true);
  assert.equal(meansMissing(410), true);
});

test('弾かれた・叩きすぎは「無い」ではない ← ここが不具合だった', () => {
  // 4xxをまとめて掬っていたため、403や429で**そのシステムだけ1時間ダイスが効かない**
  // 状態になっていた。しかも時間で直るので、見ていても原因に辿り着けない
  for (const status of [401, 403, 408, 429]) {
    assert.equal(meansMissing(status), false, `${status} を「無い」にしてはいけない`);
  }
});

test('上流の不調も「無い」ではない', () => {
  for (const status of [500, 502, 503, 520]) {
    assert.equal(meansMissing(status), false, `${status} を「無い」にしてはいけない`);
  }
});

// --- 覚えている記録の読み方 ---

test('記録が無ければ取りに行く', () => {
  assert.equal(decideCacheRead({ cached: null, now: NOW, cacheMs: CACHE_MS }).action, 'fetch');
});

test('期限内の中身はそのまま返す', () => {
  const cached = { payload: { id: 'DiceBot' }, fetchedAt: NOW - 1000 };
  assert.equal(decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS }).action, 'fresh');
});

test('「無い」は覚えている間だけ有効で、過ぎたら取り直す', () => {
  const cached = { missing: true, fetchedAt: NOW - MISS_CACHE_MS + 1 };
  assert.equal(decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS }).action, 'missing');

  const expired = { missing: true, fetchedAt: NOW - MISS_CACHE_MS - 1 };
  assert.equal(decideCacheRead({ cached: expired, now: NOW, cacheMs: CACHE_MS }).action, 'fetch');
});

test('休み中でも、中身を持っていれば古いものとして返す', () => {
  // 上流が落ちている間、そのシステムのヘルプもコマンド判定も失われる方が困る
  const cached = {
    payload: { id: 'DiceBot' },
    fetchedAt: NOW - CACHE_MS - 1,          // 本来の期限は過ぎている
    unavailableUntil: NOW + 1000
  };
  assert.equal(decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS }).action, 'stale');
});

test('休み中で中身も無ければ断る（上流は叩かない）', () => {
  const cached = { fetchedAt: NOW, unavailableUntil: NOW + 1000, unavailableReason: 'HTTP 403' };
  const decision = decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS });
  assert.equal(decision.action, 'unavailable');
  assert.equal(decision.reason, 'HTTP 403');
});

test('休みが明けたら取りに行く', () => {
  const cached = { fetchedAt: NOW - 5000, unavailableUntil: NOW - 1 };
  assert.equal(decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS }).action, 'fetch');
});

test('「無い」の記録は休みより強い', () => {
  const cached = { missing: true, fetchedAt: NOW, unavailableUntil: NOW + 1000 };
  assert.equal(decideCacheRead({ cached, now: NOW, cacheMs: CACHE_MS }).action, 'missing');
});

// --- 取れなかったときに何を覚えるか ---

test('休みを立てても、持っている中身は捨てない', () => {
  const cached = { payload: { id: 'DiceBot' }, fetchedAt: NOW - 5000 };
  const entry = buildUnavailableEntry({ cached, now: NOW, reason: 'HTTP 403' });
  assert.deepEqual(entry.payload, { id: 'DiceBot' });
  assert.equal(entry.fetchedAt, NOW - 5000, '中身の取得時刻も引き継ぐこと');
  assert.equal(entry.unavailableUntil, NOW + UNAVAILABLE_COOLDOWN_MS);
});

test('中身が無ければ休みだけを覚える', () => {
  const entry = buildUnavailableEntry({ cached: null, now: NOW, reason: 'fetch failed' });
  assert.equal(entry.payload, undefined);
  assert.equal(entry.unavailableReason, 'fetch failed');
});

test('「無い」の記録は休みで上書きしない', () => {
  const cached = { missing: true, fetchedAt: NOW };
  assert.equal(buildUnavailableEntry({ cached, now: NOW, reason: 'HTTP 500' }), null);
});

// --- 直した不具合そのもの ---

test('403を受けても、次の1分が過ぎれば取り直せる（1時間ではない）', () => {
  // 以前は403を missing として覚え、1時間「そんなシステムは無い」と答え続けていた。
  // 本番でRenderからBCDiceへ届かなくなったとき、これが症状を長引かせていた
  assert.equal(meansMissing(403), false);
  const remembered = buildUnavailableEntry({ cached: null, now: NOW, reason: 'HTTP 403' });
  const justAfter = NOW + UNAVAILABLE_COOLDOWN_MS + 1;
  assert.equal(
    decideCacheRead({ cached: remembered, now: justAfter, cacheMs: CACHE_MS }).action,
    'fetch'
  );
  assert.ok(UNAVAILABLE_COOLDOWN_MS < MISS_CACHE_MS / 10, '休みは「無い」より桁で短いこと');
});
