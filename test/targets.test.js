// test/targets.test.js
// ターゲット（Core機能。js/store/targets.js と SET_TARGET）。
//
// ここで守っているのは：
//   1. 1人1体：別のコマを指定すると前のターゲットから外れ、nullで外れること
//   2. 存在しないコマ・バックヤードのコマ・参加者一覧にいない人は付かず、何も変わらなければ
//      状態を作り直さないこと
//   3. バックヤードへしまうとターゲットが外れること
//   4. 右上に出す名前は、参加者一覧から引けるIDだけになること

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState } from '../js/game-store.js';
import { findTargetOf, listTargeterNames, normalizeTargetedBy } from '../js/store/targets.js';

function storeWithTokens() {
  const store = new ImmutableStore(createInitialGameState());
  store.dispatch('ADD_CHARACTER', { id: 'a', name: 'ゴブリンA' });
  store.dispatch('ADD_CHARACTER', { id: 'b', name: 'ゴブリンB' });
  for (const id of ['p1', 'p2', 'p9']) store.dispatch('REGISTER_PARTICIPANT', { id, nickname: id });
  return store;
}

test('別のコマを指定すると前のターゲットから外れ、nullで外れる', () => {
  const store = storeWithTokens();

  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'a' });
  store.dispatch('SET_TARGET', { participantId: 'p2', tokenId: 'a' });
  assert.deepEqual(store.state.tokens.a.targetedBy, ['p1', 'p2']);

  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'b' });
  assert.deepEqual(store.state.tokens.a.targetedBy, ['p2']);
  assert.deepEqual(store.state.tokens.b.targetedBy, ['p1']);
  assert.equal(findTargetOf(store.state.tokens, 'p1').id, 'b');

  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: null });
  assert.deepEqual(store.state.tokens.b.targetedBy, []);
  assert.equal(findTargetOf(store.state.tokens, 'p1'), null);
});

test('何も変わらない指定・参加者一覧にいない人の指定は状態を作り直さない', () => {
  const store = storeWithTokens();
  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'a' });

  for (const payload of [
    { participantId: 'p1', tokenId: 'a' },   // 同じ指定が2度届いた
    { participantId: 'p2', tokenId: null },  // もともと誰も狙っていない人が外す
    { participantId: '', tokenId: 'b' },
    { participantId: null, tokenId: 'b' },
    { participantId: 'stranger', tokenId: 'b' }, // 参加者一覧にいない
    { participantId: '__proto__', tokenId: 'b' }
  ]) {
    const before = store.state;
    store.dispatch('SET_TARGET', payload);
    assert.equal(store.state, before, JSON.stringify(payload));
  }
});

test('存在しないコマ・バックヤードのコマには付かない（前のターゲットからは外れる）', () => {
  const store = storeWithTokens();
  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'a' });

  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'nope' });
  assert.equal(findTargetOf(store.state.tokens, 'p1'), null);

  store.dispatch('MOVE_TO_BACKYARD', { id: 'b', participantId: 'p9' });
  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'b' });
  assert.equal(findTargetOf(store.state.tokens, 'p1'), null);
});

test('バックヤードへしまうとターゲットが外れる', () => {
  const store = storeWithTokens();
  store.dispatch('SET_TARGET', { participantId: 'p1', tokenId: 'a' });

  store.dispatch('MOVE_TO_BACKYARD', { id: 'a', participantId: 'p1' });
  assert.deepEqual(store.state.tokens.a.targetedBy, []);
  assert.equal(findTargetOf(store.state.tokens, 'p1'), null);
});

test('名前は参加者一覧から引けるIDだけ、壊れた値は読み飛ばす', () => {
  const participants = { p1: { nickname: 'ユーザ1' }, p2: { nickname: 'ユーザ2' } };
  const token = { targetedBy: ['p1', 'gone', 'p2', 'p1', 42, '__proto__'] };

  assert.deepEqual(listTargeterNames(token, participants), ['ユーザ1', 'ユーザ2']);
  assert.deepEqual(normalizeTargetedBy('p1'), []);
  assert.deepEqual(listTargeterNames({}, participants), []);
});
