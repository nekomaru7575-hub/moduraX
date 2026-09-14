// test/dice-draft-auto-place.test.js
// ダイスドラフトの「自動で置く」（js/parameters/dice-draft/dice-draft-model.js の autoPlaceDice）。
//
// ここで守っているのは：
//   1. プールの目が、対応する数字のスキルへ置かれ、置き先の無い目はプールに残ること
//   2. 「0/7」（どの目でも置ける）のスキルには自動で置かないこと
//   3. 同じ数字のスキルが複数あれば一覧の上へ全部、上限で入らなければ次の候補へ回ること
//   4. 既に乗っているダイスは動かさず、置けるものが無ければ同じ参照を返すこと
//   5. 合計型（ドラクルージュ）では使えないこと

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { autoPlaceDice, supportsAutoPlace } from '../js/parameters/dice-draft/dice-draft-model.js';
import { STELLA_KNIGHTS_PLUGIN } from '../js/parameters/stella-knights.js';
import { DRACUROUGE_PLUGIN } from '../js/parameters/dracurouge.js';

const spec = STELLA_KNIGHTS_PLUGIN.diceDraft;

const skill = (name, number) => ({ name, fields: { type: '', timing: '', number } });
let seq = 0;
const die = (value) => ({ id: `d${seq++}`, sides: 6, value });
const values = (list) => list.map(d => d.value);

test('目は対応する数字のスキルへ置かれ、置き先の無い目はプールに残る', () => {
  const skills = [skill('一', '1'), skill('三', '3')];
  const draft = { pool: [die(3), die(2), die(1), die(3)], placements: {} };

  const { draft: next, placed } = autoPlaceDice(spec, skills, draft);
  assert.equal(placed, 3);
  assert.deepEqual(values(next.placements['三']), [3, 3]);
  assert.deepEqual(values(next.placements['一']), [1]);
  assert.deepEqual(values(next.pool), [2]);
});

test('0/7のスキルには自動で置かない', () => {
  const skills = [skill('なんでも', '0/7'), skill('四', '4')];
  const draft = { pool: [die(4), die(5)], placements: {} };

  const { draft: next } = autoPlaceDice(spec, skills, draft);
  assert.equal(next.placements['なんでも'], undefined);
  assert.deepEqual(values(next.placements['四']), [4]);
  assert.deepEqual(values(next.pool), [5]);
});

test('同じ数字のスキルが複数あれば上のスキルへ全部、入らなければ次へ回る', () => {
  const skills = [skill('上', '6'), skill('下', '6')];
  const { draft: next } = autoPlaceDice(spec, skills, { pool: [die(6), die(6)], placements: {} });
  assert.equal(next.placements['上'].length, 2);
  assert.equal(next.placements['下'], undefined);

  // 上のスキルが上限（20個）で埋まっていれば、下のスキルへ置く
  const full = Array.from({ length: 20 }, () => die(6));
  const { draft: overflow, placed } = autoPlaceDice(spec, skills, { pool: [die(6)], placements: { 上: full } });
  assert.equal(placed, 1);
  assert.equal(overflow.placements['上'].length, 20);
  assert.equal(overflow.placements['下'].length, 1);
});

test('乗っているダイスは動かさず、置けるものが無ければ同じ参照を返す', () => {
  const skills = [skill('二', '2'), skill('なんでも', '0/7')];
  const onAny = die(5);
  const draft = { pool: [die(2)], placements: { なんでも: [onAny] } };

  const { draft: next } = autoPlaceDice(spec, skills, draft);
  assert.deepEqual(next.placements['なんでも'], [onAny]);
  assert.deepEqual(values(next.placements['二']), [2]);

  const nothing = { pool: [die(5)], placements: {} };
  const result = autoPlaceDice(spec, skills, nothing);
  assert.equal(result.placed, 0);
  assert.equal(result.draft, nothing);
});

test('合計型（ドラクルージュ）では使えない', () => {
  assert.equal(supportsAutoPlace(spec), true);
  assert.equal(supportsAutoPlace(DRACUROUGE_PLUGIN.diceDraft), false);

  const draft = { pool: [die(3)], placements: {} };
  const result = autoPlaceDice(DRACUROUGE_PLUGIN.diceDraft, [{ name: '行い', fields: { target: '3' } }], draft);
  assert.equal(result.placed, 0);
  assert.equal(result.draft, draft);
});
