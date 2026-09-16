// test/legacy-format-drop.test.js
// 後方互換を外したときに「何を読まなくなったか」「何を新しい形で書き戻すようになったか」を
// 固定するテスト。読めなくなったこと自体が意図なので、うっかり互換を足し直すと失敗する。
//
// 外した理由と、外してよいと判断した根拠（本番の部屋を読んで確かめた結果）は
// コミット「互換切り(1/3)〜(3/3)」に書いてある。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resetSkillUsageOnPhaseEnd } from '../js/parameters/skill/skill-model.js';
import { normalizeFormula } from '../js/parameters/skill/skill-formula.js';
import { normalizeRoundState } from '../js/store/round-state.js';

// resetSkillUsageOnPhaseEndが宣言から見るのはperiodsだけなので、そこだけ持たせる
const spec = { periods: [{ key: 'scene' }, { key: 'session' }] };

test('使用回数のリセット: 新しい形（limits.counts）はそのままの置き場で0へ戻る', () => {
  const list = [{ name: '実験', limits: { counts: { scene: { current: 2, max: 3 } } } }];
  const [next] = resetSkillUsageOnPhaseEnd(spec, list, 'scene');
  assert.deepEqual(next.limits.counts.scene, { current: 0, max: 3 });
});

test('使用回数のリセット: 旧い形（limits直下に期間キー）も読むが、書き戻しは新しい形にする', () => {
  // 以前はここだけ旧形式のまま書き戻していたので、古いコマは触られ続ける限り古いままだった。
  // 新しい形へ寄せてあれば、残してあるDX3の読み替えもいずれ出番が無くなる。
  const list = [{ name: '実験', limits: { scene: { current: 1, max: 1 } } }];
  const [next] = resetSkillUsageOnPhaseEnd(spec, list, 'scene');
  assert.deepEqual(next.limits.counts.scene, { current: 0, max: 1 });
  assert.equal(next.limits.scene, undefined, '旧い置き場は残さない');
});

test('使用回数のリセット: 使用条件は書き戻しでも失わない', () => {
  const conditions = [{ left: '{HP}', op: '>=', right: '1' }];
  const list = [{ name: '実験', limits: { counts: { scene: { current: 1, max: 1 } }, conditions } }];
  const [next] = resetSkillUsageOnPhaseEnd(spec, list, 'scene');
  assert.deepEqual(next.limits.conditions, conditions);
});

test('使用回数のリセット: 減っていなければ同じ参照を返す（game-store.jsの差分検知に合わせる）', () => {
  const list = [{ name: '実験', limits: { counts: { scene: { current: 0, max: 1 } } } }];
  assert.equal(resetSkillUsageOnPhaseEnd(spec, list, 'scene'), list);
});

test('修正値の式: 最初期のDX3データ（素の数値）はもう読まない', () => {
  // combo:{checkDice: 2} の形。2026-07-25までの1日分しか無かったので拾うのをやめた
  assert.equal(normalizeFormula(2), '');
});

test('修正値の式: {mode,value}形式（2026-08-11より前）はまだ読む', () => {
  assert.equal(normalizeFormula({ mode: 'coefficient', value: 3 }), '3*({Lv}+{EB})');
  assert.equal(normalizeFormula({ mode: 'fixed', value: 2 }), '2');
  assert.equal(normalizeFormula({ formula: '{Lv}+1' }), '{Lv}+1');
  assert.equal(normalizeFormula('2*{Lv}'), '2*{Lv}');
});

test('ラウンド進行: turnIndex方式（2026-08-04より前）は読み替えない', () => {
  // 読み替えをやめたので、誰も行動していない状態として始まる。
  // 対象は「進行の途中で書き出したファイル」だけで、読み込めなくなるわけではない。
  const next = normalizeRoundState({ participants: ['a', 'b', 'c'], turnIndex: 2 });
  assert.deepEqual(next.acted, []);
  assert.equal(next.currentActorId, null);
});

test('ラウンド進行: actedを持つ状態はそのまま通る', () => {
  const next = normalizeRoundState({
    participants: ['a', 'b'], acted: ['a'], currentActorId: 'b', step: 'act'
  });
  assert.deepEqual(next.acted, ['a']);
  assert.equal(next.currentActorId, 'b');
  assert.equal(next.step, 'act');
});

test('ラウンド進行: ラウンド進行より前の状態（roundそのものが無い）も既定値で通る', () => {
  const next = normalizeRoundState(undefined);
  assert.equal(next.active, false);
  assert.deepEqual(next.acted, []);
  assert.deepEqual(next.participants, []);
});
