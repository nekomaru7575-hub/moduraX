// test/dice-roll-recompute.test.js
// 出目を差し替えたロールの結果文字列を組み立て直す部分（js/dice-roll-recompute.js）を固定するテスト。
//
// 期待値の文字列は、BCDice（StellarKnights）へ実際に送って返ってきた形に合わせてある。
// 見た目が崩れても困るが、それ以上に「最後の＞の後ろが最終値」を崩すと、パラメータ変更や
// オリジナル表が出目を読み違える（js/main.jsのparseFinalDiceNumber）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateArithmetic, recomputeRollText, splitRollPrefix } from '../js/dice-roll-recompute.js';

const d6 = (...values) => values.map(value => ({ sides: 6, value }));

test('加算ロール: BCDiceと同じ形で合計を出す', () => {
  assert.equal(recomputeRollText('2D6', d6(2, 3)), '(2D6) ＞ 5[2,3] ＞ 5');
  assert.equal(recomputeRollText('2d6', d6(4, 6)), '(2D6) ＞ 10[4,6] ＞ 10');
  assert.equal(recomputeRollText('D6', d6(5)), '(1D6) ＞ 5');
  assert.equal(recomputeRollText('D6+2', d6(2)), '(1D6+2) ＞ 2[2]+2 ＞ 4');
  assert.equal(recomputeRollText('2D6-1', d6(2, 3)), '(2D6-1) ＞ 5[2,3]-1 ＞ 4');
  assert.equal(recomputeRollText('10-2D6', d6(3, 4)), '(10-2D6) ＞ 10-7[3,4] ＞ 3');
  assert.equal(recomputeRollText('-1D6+10', d6(1)), '(-1D6+10) ＞ -1[1]+10 ＞ 9');
  assert.equal(recomputeRollText('1D6+1D6', d6(6, 4)), '(1D6+1D6) ＞ 6[6]+4[4] ＞ 10');
});

test('加算ロール: 掛け算・割り算（切り捨て）・括弧', () => {
  assert.equal(recomputeRollText('2D6*2', d6(2, 6)), '(2D6*2) ＞ 8[2,6]*2 ＞ 16');
  assert.equal(recomputeRollText('1D6/4', d6(6)), '(1D6/4) ＞ 6[6]/4 ＞ 1');
  assert.equal(recomputeRollText('(2D6+1)/2', d6(4, 1)), '((2D6+1)/2) ＞ (5[4,1]+1)/2 ＞ 3');
  assert.equal(recomputeRollText('(1D6)', d6(1)), '((1D6)) ＞ (1[1]) ＞ 1');
  assert.equal(recomputeRollText('2D6+(1+2)*2', d6(3, 5)), '(2D6+(1+2)*2) ＞ 8[3,5]+(1+2)*2 ＞ 14');
  // 0で割るのは解釈しない
  assert.equal(recomputeRollText('2D6/0', d6(6, 1)), null);
});

test('加算ロール: 比較は成功／失敗を付ける', () => {
  assert.equal(recomputeRollText('2D6+3>=10', d6(3, 5)), '(2D6+3>=10) ＞ 8[3,5]+3 ＞ 11 ＞ 成功');
  assert.equal(recomputeRollText('2D6>=12', d6(6, 5)), '(2D6>=12) ＞ 11[6,5] ＞ 11 ＞ 失敗');
  assert.equal(recomputeRollText('1D6>=4', d6(2)), '(1D6>=4) ＞ 2 ＞ 失敗');
  assert.equal(recomputeRollText('1D6<>3', d6(5)), '(1D6<>3) ＞ 5 ＞ 成功');
  assert.equal(recomputeRollText('2D6=7', d6(3, 1)), '(2D6=7) ＞ 4[3,1] ＞ 4 ＞ 失敗');
});

test('面の違うダイスが混ざっても、項ごとの面で読む', () => {
  const dice = [{ sides: 6, value: 1 }, { sides: 6, value: 4 }, { sides: 10, value: 6 }];
  assert.equal(recomputeRollText('2D6+1D10', dice), '(2D6+1D10) ＞ 5[1,4]+6[6] ＞ 11');
  // 面が合わなければ解釈しない
  assert.equal(recomputeRollText('3D6', dice), null);
});

test('バラ振り: 組ごとに昇順へ並べ、比較なら成功数を出す', () => {
  assert.equal(recomputeRollText('3B6', d6(6, 3, 4)), '(3B6) ＞ 3,4,6');
  assert.equal(recomputeRollText('1B6', d6(1)), '(1B6) ＞ 1');
  assert.equal(recomputeRollText('3B6>=4', d6(2, 3, 2)), '(3B6>=4) ＞ 2,2,3 ＞ 成功数0');
  assert.equal(recomputeRollText('3B6<=2', d6(2, 2, 1)), '(3B6<=2) ＞ 1,2,2 ＞ 成功数3');
  assert.equal(recomputeRollText('3B6+2B6>=4', d6(6, 5, 1, 6, 2)), '(3B6+2B6>=4) ＞ 1,5,6,2,6 ＞ 成功数3');
});

test('繰り返しは #1 #2 の見出しで区切り、出目を回ごとに配る', () => {
  assert.equal(
    recomputeRollText('x2 2D6', d6(5, 4, 1, 2)),
    '#1\n(2D6) ＞ 9[5,4] ＞ 9\n\n#2\n(2D6) ＞ 3[1,2] ＞ 3'
  );
  assert.equal(
    recomputeRollText('rep2 3B6', d6(4, 5, 6, 5, 4, 2)),
    '#1\n(3B6) ＞ 4,5,6\n\n#2\n(3B6) ＞ 2,4,5'
  );
});

test('シークレットダイスのSは外して読む', () => {
  assert.deepEqual(splitRollPrefix('S2D6'), { repeat: 1, body: '2D6' });
  assert.equal(recomputeRollText('S2D6', d6(2, 1)), '(2D6) ＞ 3[2,1] ＞ 3');
  // SKのSは削らない
  assert.deepEqual(splitRollPrefix('3SK4'), { repeat: 1, body: '3SK4' });
});

test('解釈できない書式・出目の数が合わないものはnull', () => {
  assert.equal(recomputeRollText('choice[a,b]', []), null);
  assert.equal(recomputeRollText('TT', d6(3)), null);
  assert.equal(recomputeRollText('2D6', d6(3)), null);
  assert.equal(recomputeRollText('2D6U', d6(3, 4)), null);
});

test('evaluateArithmetic: ダイスを含まない整数の式', () => {
  assert.equal(evaluateArithmetic('4+2'), 6);
  assert.equal(evaluateArithmetic('5/2'), 2);
  assert.equal(evaluateArithmetic('(5+3)/2'), 4);
  assert.equal(evaluateArithmetic('2D6'), null);
});
