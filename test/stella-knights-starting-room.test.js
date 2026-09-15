// test/stella-knights-starting-room.test.js
// 銀剣のステラナイツの「始まりの部屋」と、それを載せるCoreの拡張ルーム設定を固定するテスト。
//
// 規則の要は2つ：
//   ・発動した順に1つずつ当て、変えた後の目も続けて変わる（1→6, 6→1 で 1 は 1→6→1 で1）
//   ・ラウンド終了で全部消える
// どれも「それらしく動いてしまう」種類の間違いなので、目で見る確認では気付きにくい。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, MAIN_CHAT_TAB_ID } from '../js/game-store.js';
import { applyPluginRollTransform } from '../js/parameters/registry.js';
import {
  applyStartingRoomRules, buildFaceMap, normalizeStartingRoom, reduceStartingRoom, transformStellaKnightsRoll,
  MAX_STARTING_ROOM_RULES
} from '../js/parameters/stella-knights-starting-room.js';

const d6 = (...values) => values.map(value => ({ kind: 'normal', sides: 6, value }));
const rule = (id, from, to) => ({ id, from, to });
const ok = (resultText, diceValues) => ({ success: true, resultText, diceValues, secret: false });

function newRoom(activePlugin = 'STELLA_KNIGHTS') {
  return new ImmutableStore(createInitialGameState({ activePlugin }));
}

function activate(store, id, from, to) {
  store.dispatch('UPDATE_ROOM_EXTENSION', { key: 'startingRoom', op: 'add', args: { id, from, to } });
}

const rulesOf = (store) => store.state.room.extensions?.STELLA_KNIGHTS?.startingRoom?.rules ?? [];
const lastMainLog = (store) => store.state.chatLogs[MAIN_CHAT_TAB_ID].at(-1)?.resultText ?? '';

// --- 目の対応表 ---

test('発動順に連鎖する：1→5, 5→3 で 1 は 3、5 は 3', () => {
  const map = buildFaceMap([rule('a', 1, 5), rule('b', 5, 3)]);
  assert.equal(map.get(1), 3);
  assert.equal(map.get(5), 3);

  const result = transformStellaKnightsRoll({
    command: '3B6', result: ok('(3B6) ＞ 1,5,6', d6(1, 5, 6)), rules: [rule('a', 1, 5), rule('b', 5, 3)]
  });
  assert.deepEqual(result.diceValues.map(die => die.value), [3, 3, 6]);
});

test('順番が結果を変える：1→6, 6→1 で 1 は 1 に戻り、6 は 1', () => {
  const rules = [rule('a', 1, 6), rule('b', 6, 1)];
  assert.equal(applyStartingRoomRules(1, rules), 1);
  assert.equal(applyStartingRoomRules(6, rules), 1);
  // 逆の順なら 6 が 6 に戻り、1 は 6
  const reversed = [rule('b', 6, 1), rule('a', 1, 6)];
  assert.equal(applyStartingRoomRules(6, reversed), 6);
  assert.equal(applyStartingRoomRules(1, reversed), 6);
});

test('同じaが2つあれば、先の発動で変わった目は後の発動に当たらない：1→5, 1→3 で 1 は 5', () => {
  assert.equal(applyStartingRoomRules(1, [rule('a', 1, 5), rule('b', 1, 3)]), 5);
});

test('巡って元の目に戻っただけなら、結果は同じ参照のまま（書き添えも出ない）', () => {
  const original = ok('(2D6) ＞ 3[1,2] ＞ 3', d6(1, 2));
  assert.equal(
    transformStellaKnightsRoll({ command: '2D6', result: original, rules: [rule('a', 1, 6), rule('b', 6, 1)] }),
    original
  );
  const withSix = transformStellaKnightsRoll({
    command: '2D6', result: ok('(2D6) ＞ 7[1,6] ＞ 7', d6(1, 6)), rules: [rule('a', 1, 6), rule('b', 6, 1)]
  });
  assert.equal(withSix.resultText, '［始まりの部屋 1→6, 6→1］出目 1,6 → 1,1\n(2D6) ＞ 2[1,1] ＞ 2');
});

// --- ロール結果の書き換え ---

test('加算ロールは合計と成功を数え直し、何を変えたかを先頭に添える', () => {
  const result = transformStellaKnightsRoll({
    command: '2D6+3>=10',
    result: ok('(2D6+3>=10) ＞ 5[1,4]+3 ＞ 8 ＞ 失敗', d6(1, 4)),
    rules: [rule('a', 1, 6)]
  });
  assert.equal(result.resultText, '［始まりの部屋 1→6］出目 1,4 → 6,4\n(2D6+3>=10) ＞ 10[6,4]+3 ＞ 13 ＞ 成功');
});

test('SK：成功数を数え直す。コマンド自身の ,k>l は始まりの部屋の後に順に当てる', () => {
  const plain = transformStellaKnightsRoll({
    command: '5SK3', result: ok('(5SK3) ＞ 1,2,4,5,6 ＞ 成功数: 3', d6(1, 4, 2, 6, 5)), rules: [rule('a', 1, 5)]
  });
  assert.equal(plain.resultText.split('\n')[1], '(5SK3) ＞ 2,4,5,5,6 ＞ 成功数: 4');

  // 始まりの部屋 2→1 の後に、コマンドの 1>6 が当たる（2 → 1 → 6）
  const withChanges = transformStellaKnightsRoll({
    command: '3SK4,1>6', result: ok('(3SK4,1>6) ＞ 2,4,4 ＞ [4,4] ＞ 成功数: 2', d6(2, 4, 4)), rules: [rule('a', 2, 1)]
  });
  assert.equal(withChanges.resultText.split('\n')[1], '(3SK4,1>6) ＞ 1,4,4 ＞ [4,4,6] ＞ 成功数: 3');

  const noDefense = transformStellaKnightsRoll({
    command: '(5+3)/2SK', result: ok('(4SK) ＞ 1,3,5,5', d6(5, 3, 5, 1)), rules: [rule('a', 3, 6)]
  });
  assert.equal(noDefense.resultText.split('\n')[1], '(4SK) ＞ 1,5,5,6');
});

test('d6以外の目は変えない', () => {
  const dice = [...d6(1, 4), { kind: 'normal', sides: 10, value: 1 }];
  const result = transformStellaKnightsRoll({
    command: '2D6+1D10', result: ok('(2D6+1D10) ＞ 5[1,4]+1[1] ＞ 6', dice), rules: [rule('a', 1, 6)]
  });
  assert.deepEqual(result.diceValues.map(die => die.value), [6, 4, 1]);
  assert.equal(result.resultText.split('\n')[1], '(2D6+1D10) ＞ 10[6,4]+1[1] ＞ 11');
});

test('数え直せない書式は結果をそのまま残し、反映できなかったと添える（出目も変えない）', () => {
  const original = ok('(TT) ＞ テーマ表(1) ＞ 何か', d6(1));
  const result = transformStellaKnightsRoll({ command: 'TT', result: original, rules: [rule('a', 1, 6)] });
  assert.equal(result.diceValues, original.diceValues);
  assert.match(result.resultText, /^⚠ 始まりの部屋（1→6）を反映できない書式です（変換後の出目: 6）\n\(TT\)/);
});

test('規則が無い・目が変わらない・失敗したロールは同じ参照を返す', () => {
  const original = ok('(2D6) ＞ 5[2,3] ＞ 5', d6(2, 3));
  assert.equal(transformStellaKnightsRoll({ command: '2D6', result: original, rules: [] }), original);
  assert.equal(transformStellaKnightsRoll({ command: '2D6', result: original, rules: [rule('a', 1, 6)] }), original);
  const failed = { success: false, resultText: '⚠️ 通信に失敗しました' };
  assert.equal(transformStellaKnightsRoll({ command: '2D6', result: failed, rules: [rule('a', 1, 6)] }), failed);
});

test('添えた行があっても、最後の＞の後ろの最終値は変わらない', () => {
  const result = transformStellaKnightsRoll({
    command: '2D6', result: ok('(2D6) ＞ 3[1,2] ＞ 3', d6(1, 2)), rules: [rule('a', 1, 5)]
  });
  const parts = result.resultText.split('＞').map(part => part.trim());
  assert.equal(parts.at(-1), '7');
});

test('registry経由：他のシステムの部屋では書き換えない', () => {
  const original = ok('(2D6) ＞ 3[1,2] ＞ 3', d6(1, 2));
  const extensions = { STELLA_KNIGHTS: { startingRoom: { rules: [rule('a', 1, 5)] } } };
  assert.equal(applyPluginRollTransform('DX3', { command: '2D6', result: original, extensions }), original);
  assert.equal(applyPluginRollTransform(null, { command: '2D6', result: original, extensions }), original);
  assert.notEqual(applyPluginRollTransform('STELLA_KNIGHTS', { command: '2D6', result: original, extensions }), original);
});

// --- 状態の整え ---

test('normalize：壊れた行・重複・同じ目への変換を落とし、件数に上限を掛ける', () => {
  const normalized = normalizeStartingRoom({
    rules: [
      rule('a', 1, 5), rule('a', 2, 3), rule('b', 0, 3), rule('c', 1, 7), rule('d', 4, 4),
      { id: 5, from: 1, to: 2 }, { id: 'e', from: '1', to: 2 }, null, rule('f', 6, 1)
    ]
  });
  assert.deepEqual(normalized.rules, [rule('a', 1, 5), rule('f', 6, 1)]);

  const many = Array.from({ length: MAX_STARTING_ROOM_RULES + 5 }, (_, i) => rule(`r${i}`, 1, 2));
  assert.equal(normalizeStartingRoom({ rules: many }).rules.length, MAX_STARTING_ROOM_RULES);
  assert.deepEqual(normalizeStartingRoom('<img src=x>'), { rules: [] });
});

test('reduce：同じ目への変換・知らない操作・無いidの解除は何もしない', () => {
  assert.equal(reduceStartingRoom({ rules: [] }, 'add', { id: 'a', from: 2, to: 2 }), null);
  assert.equal(reduceStartingRoom({ rules: [] }, 'add', { id: '', from: 1, to: 2 }), null);
  assert.equal(reduceStartingRoom({ rules: [] }, 'clear', {}), null);
  assert.equal(reduceStartingRoom({ rules: [] }, 'remove', { id: 'nope' }), null);
});

// --- ストア（UPDATE_ROOM_EXTENSION・ラウンド終了・取り込み） ---

test('UPDATE_ROOM_EXTENSION：発動と解除がログに残り、続けて2件発動しても両方残る', () => {
  const store = newRoom();
  activate(store, 'a', 1, 5);
  activate(store, 'b', 5, 3);
  assert.deepEqual(rulesOf(store), [rule('a', 1, 5), rule('b', 5, 3)]);
  assert.match(lastMainLog(store), /始まりの部屋を発動しました：5の目 → 3の目/);

  store.dispatch('UPDATE_ROOM_EXTENSION', { key: 'startingRoom', op: 'remove', args: { id: 'a' } });
  assert.deepEqual(rulesOf(store), [rule('b', 5, 3)]);
  assert.match(lastMainLog(store), /始まりの部屋を解除しました：1の目 → 5の目/);
});

test('UPDATE_ROOM_EXTENSION：宣言の無いシステム・知らないキーでは何もしない', () => {
  const other = newRoom('DX3');
  const before = other.state;
  activate(other, 'a', 1, 5);
  assert.equal(other.state, before);

  const store = newRoom();
  const beforeStella = store.state;
  store.dispatch('UPDATE_ROOM_EXTENSION', { key: '__proto__', op: 'add', args: { id: 'a', from: 1, to: 5 } });
  store.dispatch('UPDATE_ROOM_EXTENSION', { key: 'startingRoom', op: 'add', args: { id: 'a', from: 3, to: 3 } });
  assert.equal(store.state, beforeStella);
});

test('ラウンド進行：クリンナップを終えると全部消え、Mainに知らせる', () => {
  const store = newRoom();
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: [] });
  activate(store, 'a', 1, 5);

  const startRound = store.state.round.roundNumber;
  for (let i = 0; i < 5 && store.state.round.roundNumber === startRound; i += 1) {
    store.dispatch('ROUND_ADVANCE_PHASE', {});
  }
  assert.equal(store.state.round.roundNumber, startRound + 1);
  assert.deepEqual(rulesOf(store), []);
  assert.match(lastMainLog(store), /ラウンド終了により、始まりの部屋の効果（1→5）が終了しました。/);
});

test('ラウンド進行の終了・シーンの遷移でも消える', () => {
  const store = newRoom();
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: [] });
  activate(store, 'a', 1, 5);
  store.dispatch('ROUND_PROGRESSION_END', {});
  assert.deepEqual(rulesOf(store), []);
  assert.match(lastMainLog(store), /始まりの部屋の効果（1→5）が終了しました/);

  activate(store, 'b', 2, 6);
  store.dispatch('SAVE_SCENE', { id: 'sc1', name: '次のシーン', panels: {} });
  store.dispatch('APPLY_SCENE', { id: 'sc1', playId: '1' });
  assert.deepEqual(rulesOf(store), []);
});

test('hydrate：取り込んだ部屋データの壊れた値・知らないシステムを落とす', () => {
  const store = newRoom();
  store.hydrate({
    ...createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }),
    room: {
      ...createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }).room,
      extensions: {
        STELLA_KNIGHTS: { startingRoom: { rules: [rule('a', 1, 5), rule('<b>', 9, 1)] }, unknown: 1 },
        NOT_A_PLUGIN: { startingRoom: { rules: [rule('x', 1, 2)] } }
      }
    }
  });
  assert.deepEqual(store.state.room.extensions, { STELLA_KNIGHTS: { startingRoom: { rules: [rule('a', 1, 5)] } } });

  store.hydrate({ ...createInitialGameState(), room: { ...createInitialGameState().room, extensions: 'junk' } });
  assert.deepEqual(store.state.room.extensions, {});
});
