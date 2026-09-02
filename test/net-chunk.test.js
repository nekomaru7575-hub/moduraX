// DataChannelの分割と組み直し（js/net-chunk.js）のテスト。
//
// ここが外れると**チャネルごと落ちる**＝部屋の同期が丸ごと死ぬ。しかも壊れ方が
// 「大きい部屋だけ」「絵文字の入った部屋だけ」と条件付きで出るので、手で試して
// 気づくのが難しい。分割の境界とサロゲートペアの扱いをここで押さえる。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_REASSEMBLED_BYTES, chunkBudgetBytes, chunkMessage, createChunkReassembler
} from '../js/net-chunk.js';

// 分割されたものを組み直して、届いたメッセージを配列で返す。
function roundTrip(message, budget) {
  const parts = chunkMessage(JSON.stringify(message), budget, 'm1');
  const received = [];
  const dropped = [];
  const reassembler = createChunkReassembler({
    onMessage: (value) => received.push(value),
    onDrop: (reason) => dropped.push(reason)
  });
  parts.forEach((part) => reassembler.receive(part));
  return { parts, received, dropped };
}

test('上限に収まるものは封筒に入れず、そのまま1通で送る', () => {
  const message = { type: 'ACTION', action: 'MOVE_TOKEN', payload: { id: 't1', x: 1, y: 2 } };
  const { parts, received } = roundTrip(message, 4096);
  assert.equal(parts.length, 1);
  assert.equal(parts[0], JSON.stringify(message));
  assert.deepEqual(received, [message]);
});

test('大きいものは分割され、組み直すと元に戻る', () => {
  const message = { type: 'INIT', state: { blob: 'あ'.repeat(5000) } };
  const { parts, received, dropped } = roundTrip(message, 512);
  assert.ok(parts.length > 1, '分割されていること');
  assert.deepEqual(dropped, []);
  assert.deepEqual(received, [message]);
});

test('分割の1通は、渡した予算のバイト数を超えない', () => {
  // 超えるとチャネルが落ちる。ここが守れているかがこのモジュールの存在理由。
  const budget = 300;
  const parts = chunkMessage(JSON.stringify({ blob: 'あ'.repeat(3000) }), budget, 'm1');
  parts.forEach((part) => {
    assert.ok(Buffer.byteLength(part, 'utf8') <= budget + 256,
      `1通が予算+封筒の余白に収まること（実際は${Buffer.byteLength(part, 'utf8')}バイト）`);
  });
});

test('サロゲートペアの途中では切らない', () => {
  // 片割れだけを送るとU+FFFDに置き換わり、組み直したJSONが壊れる。
  // 「絵文字の入った部屋だけ繋がらない」という形で出るので、境界を明示的に確かめる。
  const message = { text: '🎲'.repeat(400) };
  const { received } = roundTrip(message, 64);
  assert.deepEqual(received, [message]);

  const parts = chunkMessage(JSON.stringify(message), 64, 'm1');
  parts.forEach((part) => {
    const body = JSON.parse(part).b;
    const last = body.charCodeAt(body.length - 1);
    assert.ok(!(last >= 0xd800 && last <= 0xdbff), '片割れで終わっていないこと');
  });
});

test('順番が入れ替わって届いても組み直せる', () => {
  // DataChannelは順序保証ありで使っているが、組み直し側がそれに寄りかかる理由は無い。
  const message = { type: 'INIT', state: { blob: 'x'.repeat(3000) } };
  const parts = chunkMessage(JSON.stringify(message), 256, 'm1');
  const received = [];
  const reassembler = createChunkReassembler({ onMessage: (value) => received.push(value) });
  [...parts].reverse().forEach((part) => reassembler.receive(part));
  assert.deepEqual(received, [message]);
});

test('同じ番号が二度来ても、先に来たものを正とする', () => {
  const message = { blob: 'y'.repeat(2000) };
  const parts = chunkMessage(JSON.stringify(message), 256, 'm1');
  const received = [];
  const reassembler = createChunkReassembler({ onMessage: (value) => received.push(value) });
  reassembler.receive(parts[0]);
  reassembler.receive(parts[0]);
  parts.slice(1).forEach((part) => reassembler.receive(part));
  assert.deepEqual(received, [message]);
});

test('壊れたJSONは捨てるだけで、以後のメッセージは通る', () => {
  const received = [];
  const dropped = [];
  const reassembler = createChunkReassembler({
    onMessage: (value) => received.push(value),
    onDrop: (reason) => dropped.push(reason)
  });
  reassembler.receive('{壊れている');
  reassembler.receive(JSON.stringify({ type: 'PING' }));
  assert.equal(dropped.length, 1);
  assert.deepEqual(received, [{ type: 'PING' }]);
});

test('封筒の形が不正なものは捨てる', () => {
  const dropped = [];
  const received = [];
  const reassembler = createChunkReassembler({
    onMessage: (value) => received.push(value),
    onDrop: (reason) => dropped.push(reason)
  });
  // 総数より大きい番号
  reassembler.receive(JSON.stringify({ t: 'chunk', id: 'm1', i: 5, n: 2, b: 'x' }));
  // 総数が0
  reassembler.receive(JSON.stringify({ t: 'chunk', id: 'm1', i: 0, n: 0, b: 'x' }));
  // 本文が文字列でない
  reassembler.receive(JSON.stringify({ t: 'chunk', id: 'm1', i: 0, n: 1, b: 42 }));
  assert.equal(dropped.length, 3);
  assert.deepEqual(received, []);
});

test('__proto__ は組み直したあとにも残らない', () => {
  // 信用しないJSONとして読むのは組み直しの後。分割されると素通りする、という
  // 抜け道を作っていないことを確かめる（js/untrusted-json.js）。
  const evil = `{"type":"ACTION","__proto__":{"polluted":true},"pad":"${'z'.repeat(2000)}"}`;
  const parts = chunkMessage(evil, 256, 'm1');
  assert.ok(parts.length > 1);
  const received = [];
  const reassembler = createChunkReassembler({ onMessage: (value) => received.push(value) });
  parts.forEach((part) => reassembler.receive(part));
  assert.equal(received.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(received[0], '__proto__'), false);
});

test('組み直しの上限を超えたら捨てる', () => {
  // 相手が「全体でN個ある」と言い張るだけでホストのタブのメモリを食えないようにする歯止め。
  const dropped = [];
  const received = [];
  const reassembler = createChunkReassembler({
    onMessage: (value) => received.push(value),
    onDrop: (reason) => dropped.push(reason)
  });

  const bodySize = 1024 * 1024;
  const body = 'x'.repeat(bodySize);
  const total = Math.ceil(MAX_REASSEMBLED_BYTES / bodySize) + 1;
  for (let i = 0; i < total; i += 1) {
    reassembler.receive(JSON.stringify({ t: 'chunk', id: 'big', i, n: total, b: body }));
  }
  assert.deepEqual(received, []);
  assert.ok(dropped.includes('組み直しの上限を超えた'));
});

test('相手が上限を言ってこなければ、控えめな既定に落とす', () => {
  assert.ok(chunkBudgetBytes(null) > 1024);
  assert.ok(chunkBudgetBytes({ sctp: { maxMessageSize: 0 } }) > 1024);
  assert.ok(chunkBudgetBytes({ sctp: { maxMessageSize: Infinity } }) > 1024);
  // 相手が小さいと言ってきたら、そちらに従う
  assert.ok(chunkBudgetBytes({ sctp: { maxMessageSize: 4096 } }) < 4096);
});
