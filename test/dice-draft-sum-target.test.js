// test/dice-draft-sum-target.test.js
// ダイスドラフトの合計型（ドラクルージュの行い）で、目標値の欄の書き方ごとに
// 「何点積めば使えるか」「判定値をどう決めるか」を固定するテスト。
//
// 目標値は "7" / "3～12" / "効果参照" の3通りで、目標値修正(TB)と下限2の効き方がそれぞれ違う。
// 画面（dice-draft-view.js）とチャットコマンド（行い使用(名前,9)）は同じ evaluatePlacement を
// 通るので、規則はここで止める。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePlacement, parseSumTarget } from '../js/parameters/dice-draft/dice-draft-model.js';
import { DRACUROUGE_PLUGIN } from '../js/parameters/dracurouge.js';

const spec = DRACUROUGE_PLUGIN.diceDraft;

const deed = (target) => ({ name: '行い', fields: { target } });
const dice = (...values) => values.map((value, i) => ({ id: `d${i}`, sides: 6, value }));

test('行いは使用回数を数えない（ラウンド1回の上限を持たない）', () => {
  assert.deepEqual(spec.skillSpec.periods, []);
  assert.equal(DRACUROUGE_PLUGIN.resetComponentsOnPhaseEnd, undefined);
});

test('目標値の欄の読み方', () => {
  assert.equal(parseSumTarget(''), null);
  assert.equal(parseSumTarget('  '), null);
  assert.deepEqual(parseSumTarget('7'), { type: 'fixed', value: 7 });
  assert.deepEqual(parseSumTarget('3～12'), { type: 'range', min: 3, max: 12 });
  assert.deepEqual(parseSumTarget('３～１２'), { type: 'range', min: 3, max: 12 });
  assert.deepEqual(parseSumTarget('3〜12'), { type: 'range', min: 3, max: 12 });
  assert.deepEqual(parseSumTarget('効果参照'), { type: 'free' });
});

test('数字1つの目標値：TBを足し、入力欄は出さない', () => {
  const result = evaluatePlacement(spec, deed('7'), dice(6), { targetModifier: -1 });
  assert.equal(result.ready, true);
  assert.equal(result.targetInput, null);
  assert.equal(result.description, '合計 6 / 目標 6（TB -1）');

  const short = evaluatePlacement(spec, deed('7'), dice(5), { targetModifier: -1 });
  assert.equal(short.ready, false);
  assert.equal(short.description, '合計 5 / 目標 6（あと 1・TB -1）');
});

test('「3～12」：範囲内の好きな判定値を選べ、既定は合計で届く最大', () => {
  const byDefault = evaluatePlacement(spec, deed('3～12'), dice(4, 4));
  assert.equal(byDefault.ready, true);
  assert.equal(byDefault.targetValue, 8);
  assert.deepEqual(byDefault.targetInput, { min: 3, max: 12 });
  assert.equal(byDefault.description, '合計 8 / 判定値 8');

  const chosen = evaluatePlacement(spec, deed('3～12'), dice(4, 4), { targetValue: 7 });
  assert.equal(chosen.ready, true);
  assert.equal(chosen.targetValue, 7);

  const tooHigh = evaluatePlacement(spec, deed('3～12'), dice(4, 4), { targetValue: 12 });
  assert.equal(tooHigh.ready, false);
  assert.equal(tooHigh.description, '合計 8 / 判定値 12（あと 4）');

  // 範囲外の指定は既定へ落とす
  const outside = evaluatePlacement(spec, deed('3～12'), dice(4, 4), { targetValue: 13 });
  assert.equal(outside.targetValue, 8);

  // 合計が範囲を超えても判定値は上限まで
  const capped = evaluatePlacement(spec, deed('3～12'), dice(6, 6, 6));
  assert.equal(capped.targetValue, 12);

  // 1点も届かなければ最小値で「あと何点」を出す
  const none = evaluatePlacement(spec, deed('3～12'), []);
  assert.equal(none.ready, false);
  assert.equal(none.targetValue, 3);
});

test('「3～12」：TBは判定値ではなく届かせる合計に足す', () => {
  const result = evaluatePlacement(spec, deed('3～12'), dice(4, 4), { targetValue: 9, targetModifier: -1 });
  assert.equal(result.ready, true);
  assert.equal(result.targetValue, 9);
  assert.equal(result.description, '合計 8 / 判定値 9 → 目標 8（TB -1）');

  // 既定の判定値もTB込みで届く最大を採る
  const byDefault = evaluatePlacement(spec, deed('3～12'), dice(4, 4), { targetModifier: -1 });
  assert.equal(byDefault.targetValue, 9);
});

test('「効果参照」：判定値を入れるまで使えず、入れた値にはTBと下限2が効く', () => {
  const empty = evaluatePlacement(spec, deed('効果参照'), dice(6, 6));
  assert.equal(empty.ready, false);
  assert.equal(empty.targetValue, null);
  assert.deepEqual(empty.targetInput, { min: 1, max: null });
  assert.equal(empty.description, '目標値を入力してください');

  const entered = evaluatePlacement(spec, deed('効果参照'), dice(6, 4), { targetValue: 10 });
  assert.equal(entered.ready, true);
  assert.equal(entered.targetValue, 10);

  const withTb = evaluatePlacement(spec, deed('効果参照'), dice(6, 3), { targetValue: 10, targetModifier: -1 });
  assert.equal(withTb.ready, true);
  assert.equal(withTb.description, '合計 9 / 判定値 10 → 目標 9（TB -1）');

  const floored = evaluatePlacement(spec, deed('効果参照'), dice(1), { targetValue: 3, targetModifier: -10 });
  assert.equal(floored.ready, false);
  assert.equal(floored.description, '合計 1 / 判定値 3 → 目標 2（あと 1・TB -10）');

  const zero = evaluatePlacement(spec, deed('効果参照'), dice(6), { targetValue: 0 });
  assert.equal(zero.ready, false);
  assert.equal(zero.targetValue, null);
});

test('目標値が空欄なら使えない', () => {
  const result = evaluatePlacement(spec, deed(''), dice(6));
  assert.equal(result.ready, false);
  assert.equal(result.targetInput, null);
  assert.equal(result.description, '目標値が設定されていません');
});
