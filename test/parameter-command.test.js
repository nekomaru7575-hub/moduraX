// test/parameter-command.test.js
// 「+HP(10)」形式のパラメータ変更コマンドの解釈（js/parameter-command.js）。
//
// ここで守っているのは：
//   1. 参照キャラクターに無い名前はルーム変数へ落ちること（キャラ優先。対象ごとに判定）
//   2. 文字列の変数に +/- はエラー、全角数字の文字列は数値として加減できること
//   3. かっこの中が文字列で対象が見つからない入力（顔文字など）は、エラーにせず発言へ流すこと

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveParameterCommand, computeNextValue, toNumericValue, classifyAmount
} from '../js/parameter-command.js';

const character = {
  id: 't1',
  parameters: {
    'core:hp': { key: 'HP', label: 'HP', value: 10, source: 'core' },
    'user:状態': { key: '状態', label: '状態', value: '通常', source: 'user' }
  }
};

const roomParameters = {
  'core:round': { key: 'round', label: '現在のラウンド', value: 0, source: 'core', locked: true, editable: false },
  'gcrest:chaos': { key: 'chaos', label: '混沌レベル', value: 2, source: 'GCREST' },
  'user:メモ': { key: 'メモ', label: 'メモ', value: '集合', source: 'user' },
  'user:残り': { key: '残り', label: '残り', value: '１２', source: 'user' },
  'user:HP': { key: 'HP', label: 'HP', value: 99, source: 'user' }
};

const resolve = (rawInput, ch = character) => resolveParameterCommand({ rawInput, character: ch, roomParameters });

test('キャラに同名パラメータがあればキャラ、無ければルーム変数が対象になる', () => {
  const own = resolve('+HP(1)');
  assert.equal(own.targets[0].scope, 'token');
  assert.equal(own.targets[0].paramId, 'core:hp');

  const room = resolve('+混沌レベル(1)');
  assert.equal(room.targets[0].scope, 'room');
  assert.equal(room.targets[0].paramId, 'gcrest:chaos');
});

test('キャラ未選択ならルーム変数が対象になる（同名でも部屋のもの）', () => {
  const r = resolve('-HP(3)', null);
  assert.equal(r.targets[0].scope, 'room');
  assert.equal(r.targets[0].paramId, 'user:HP');
});

test('カンマ区切りの対象ごとに解決する', () => {
  const r = resolve('-HP,+混沌レベル(1D6)');
  assert.deepEqual(r.targets.map(t => t.scope), ['token', 'room']);
  assert.deepEqual(r.amount, { kind: 'dice', expr: '1D6' });
});

test('文字列のルーム変数に +/- はエラー', () => {
  assert.ok(resolve('+メモ(1)').error);
  assert.ok(resolve('-状態(1)').error);
});

test('全角数字の文字列は数値として加減し、結果は半角の数値', () => {
  const r = resolve('+残り(3)');
  assert.equal(r.error, undefined);
  const [t] = r.targets;
  assert.equal(computeNextValue(t.operator, t.before, r.amount.value), 15);
});

test('=で文字列を代入できるのは利用者が追加した変数だけ', () => {
  const room = resolve('=メモ(解散)');
  assert.deepEqual(room.amount, { kind: 'string', value: '解散' });
  assert.equal(computeNextValue('=', room.targets[0].before, room.amount.value), '解散');

  assert.equal(resolve('=状態(毒)').targets[0].scope, 'token');
  assert.ok(resolve('=混沌レベル(高い)').error);
  assert.ok(resolve('=HP(満タン)').error);
});

test('+/- の値が文字列ならエラー', () => {
  assert.ok(resolve('+HP(たくさん)').error);
});

test('editable:false のルーム変数は変更できない', () => {
  assert.ok(resolve('=現在のラウンド(3)').error);
});

test('文字列の値で対象が見つからない・書式が合わないなら発言扱い（null）', () => {
  assert.equal(resolve('+_+(汗)'), null);
  assert.equal(resolve('=w=(笑)'), null);
  assert.equal(resolve('+HP,w(笑)'), null);
});

test('数値・ダイスの値で対象が見つからなければエラー', () => {
  assert.ok(resolve('+ない(10)').error);
  assert.ok(resolve('=ない(1D6)', null).error);
});

test('コマンドの形でなければnull', () => {
  assert.equal(resolve('こんにちは'), null);
  assert.equal(resolve('2D6+3'), null);
});

test('toNumericValue / classifyAmount', () => {
  assert.equal(toNumericValue('１２'), 12);
  assert.equal(toNumericValue(' -3.5 '), -3.5);
  assert.equal(toNumericValue('12a'), null);
  assert.equal(toNumericValue(''), null);
  assert.deepEqual(classifyAmount('-4'), { kind: 'number', value: -4 });
  assert.deepEqual(classifyAmount('２'), { kind: 'number', value: 2 });
});
