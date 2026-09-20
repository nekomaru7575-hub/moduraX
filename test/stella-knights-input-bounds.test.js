// test/stella-knights-input-bounds.test.js
// 銀剣のステラナイツの「キャラクター更新画面の入力欄の上下限」を固定するテスト。
//
// 【何を落としたか】入力欄すべてに下限0を付けていたせいで、判定でブーケがマイナスまで
// 引かれたコマは、更新画面を開いて何も変えずに「更新」を押しただけでブラウザの
// バリデーションに弾かれ、名前も画像も保存できなくなっていた。判定は残高が足りなくても
// 引く（applyStellaKnightsCheckRollの「マイナスを許す」）ので、負の残高は普通に在りうる。
//
// 上下限は入力欄のmin/max属性と、保存時の丸め（getValues）の2か所が読む。片方だけ直すと
// 「入れられるのに保存で0へ潰される」が起きるので、両方が読む表を関数越しに固定する。
//
// renderStellaKnightsCharacterPanel自体はDOMを作るのでNodeから読めない。ここが固定するのは
// パネルが読む上下限の表まで。入力欄がこの表を読んでいること自体は手で確かめること。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, getEffectiveParameterValue } from '../js/game-store.js';
import { applyPluginCheckRoll } from '../js/parameters/registry.js';
import {
  STELLA_KNIGHTS_TYPE_RULES,
  clampStellaKnightsInputValue,
  stellaKnightsInputBounds
} from '../js/parameters/stella-knights.js';

const DEFENSE = 'STELLA_KNIGHTS:defense';
const CHARGE = 'STELLA_KNIGHTS:charge';
const BOUQUET = 'STELLA_KNIGHTS:bouquet';
const DISTORTION = 'STELLA_KNIGHTS:distortion';
const DB = 'STELLA_KNIGHTS:DB';
const TYPE = 'STELLA_KNIGHTS:charType';

// --- 上下限の表 ---

test('ブーケだけ下限が無い（判定でマイナスまで引かれるため）', () => {
  assert.deepEqual(stellaKnightsInputBounds(BOUQUET), { min: null, max: null });
});

test('防御力・チャージダイス数・歪みは0以上・上限なしのまま', () => {
  for (const paramId of [DEFENSE, CHARGE, DISTORTION]) {
    assert.deepEqual(stellaKnightsInputBounds(paramId), { min: 0, max: null }, paramId);
  }
});

test('DBは0〜3（規則上ダイス追加は1回の判定で3個まで）', () => {
  assert.deepEqual(stellaKnightsInputBounds(DB), { min: 0, max: 3 });
});

test('表に書いていないパラメータは0以上・上限なし', () => {
  assert.deepEqual(stellaKnightsInputBounds('STELLA_KNIGHTS:unknown'), { min: 0, max: null });
});

// --- 保存時の丸め ---

test('ブーケは負のまま保存する（開いて閉じただけで0へ戻さない）', () => {
  assert.equal(clampStellaKnightsInputValue(BOUQUET, -7), -7);
  assert.equal(clampStellaKnightsInputValue(BOUQUET, '-7'), -7);
});

test('下限を持つ欄は0で止める / DBは上限で止める', () => {
  assert.equal(clampStellaKnightsInputValue(DEFENSE, -3), 0);
  assert.equal(clampStellaKnightsInputValue(DISTORTION, -1), 0);
  assert.equal(clampStellaKnightsInputValue(DB, 9), 3);
  assert.equal(clampStellaKnightsInputValue(DB, -2), 0);
});

test('空欄・数字でないもの・小数は整数へ落とす', () => {
  assert.equal(clampStellaKnightsInputValue(BOUQUET, ''), 0);
  assert.equal(clampStellaKnightsInputValue(BOUQUET, 'あ'), 0);
  assert.equal(clampStellaKnightsInputValue(BOUQUET, null), 0);
  assert.equal(clampStellaKnightsInputValue(BOUQUET, 2.9), 2);
  assert.equal(clampStellaKnightsInputValue(BOUQUET, -2.9), -2);
});

// 更新画面に並ぶ欄は、どれを通しても数値になる（NaNを書き込まない）
test('どの種別の入力欄も、丸めた結果は必ず有限の整数', () => {
  const paramIds = [...new Set(Object.values(STELLA_KNIGHTS_TYPE_RULES).flatMap(rule => rule.inputParamIds))];
  assert.ok(paramIds.includes(BOUQUET), '前提が崩れている（ブーケの欄が無い）');

  for (const paramId of [...paramIds, DB]) {
    for (const raw of ['', 'あ', null, undefined, NaN, Infinity, -Infinity, '1e999', 1.5, -1.5]) {
      const value = clampStellaKnightsInputValue(paramId, raw);
      assert.ok(Number.isInteger(value), `${paramId} / ${String(raw)} → ${value}`);
    }
  }
});

// --- 判定でマイナスになった残高が、保存を通って生き残るか ---

test('判定でマイナスになったブーケは、そのまま更新しても値が変わらない', () => {
  const store = new ImmutableStore(createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }));
  store.dispatch('ADD_CHARACTER', {
    id: 'b1', name: 'ブリンガー君',
    parameterOverrides: { [BOUQUET]: 5, [TYPE]: 'ブリンガー', [DB]: 3 }
  });

  // DBに3が入った状態でアタック判定 → 12払えず、残高は 5 - 12 = -7 になる
  applyPluginCheckRoll('STELLA_KNIGHTS', {
    command: '8SK4',
    token: store.state.tokens.b1,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue
  });
  const after = store.state.tokens.b1.parameters[BOUQUET].value;
  assert.equal(after, -7, '判定がマイナスまで引いていない（前提が崩れている）');

  // 更新画面を開いて何も変えずに「更新」＝入力欄に出ている値をそのまま丸める
  assert.equal(clampStellaKnightsInputValue(BOUQUET, String(after)), after);
});
