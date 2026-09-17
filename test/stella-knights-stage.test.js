// test/stella-knights-stage.test.js
// 銀剣のステラナイツの「舞台」と、それを動かすCore側の仕掛け（拡張ルーム設定の
// applyRoundEvent・手番順の skipWhen）を固定するテスト。
//
// 守りたいのは、目で見ても気付きにくい4つ。
//   ・セットルーチンは1ラウンドに1つずつ。撃ち切った後のループ設定どおりに回る
//   ・予兆（手番の前の予告）と舞台（手番の終了時の適用）は必ず同じ中身を指す
//   ・EXへ移行したら、以降はアクションの代わりにEXだけを繰り返す
//   ・予兆と舞台が出るのは種別「ブリンガー」の手番だけ。NPCとシースでは動かない
// どれも「それらしく動いてしまう」種類の間違い。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, MAIN_CHAT_TAB_ID } from '../js/game-store.js';
import {
  applyStageRoundEvent, createStageState, MAX_ROUTINES_PER_KIND, nextActionRoutine, nextSetRoutine,
  normalizeStage, reduceStage, STAGE_SET_PHASE_ID
} from '../js/parameters/stella-knights-stage.js';

const SET_PHASE = { id: STAGE_SET_PHASE_ID };
const routine = (id, name, toEx = false) => ({ id, name, effect: `${name}の効果`, toEx });

function buildStage(overrides = {}) {
  return normalizeStage({
    set: [routine('s1', 'セ1'), routine('s2', 'セ2'), routine('s3', 'セ3')],
    action: [routine('a1', 'ア1'), routine('a2', 'ア2'), routine('a3', 'ア3', true)],
    ex: [routine('e1', 'EX1'), routine('e2', 'EX2')],
    ...overrides
  });
}

// 舞台を1つ動かして、出た発言（表示名:名前）と次の状態を返す
function fire(stage, event) {
  const result = applyStageRoundEvent(stage, event);
  if (!result) return { stage, entries: [] };
  return {
    stage: normalizeStage(result.value),
    entries: result.entries.map(entry => `${entry.system}:${entry.resultText.split('\n')[0]}`)
  };
}

const bringerTurn = { isBringer: true };
const npcTurn = { isBringer: false };

// --- 正規化 -------------------------------------------------------------------

test('normalize：壊れた値・idの重複・件数超過を落とし、形は必ず揃う', () => {
  const empty = normalizeStage(undefined);
  assert.deepEqual(empty, createStageState());
  assert.deepEqual(normalizeStage('<img src=x>'), createStageState());

  const stage = normalizeStage({
    name: 123,
    set: [{ id: 'a', name: 'A' }, { id: 'a', name: '同じid' }, { name: 'idなし' }, 'ごみ'],
    action: 'ごみ',
    ex: null
  });
  assert.equal(stage.name, '');
  assert.deepEqual(stage.set.map(item => item.id), ['a']);
  assert.equal(stage.set[0].effect, '');
  assert.deepEqual(stage.action, []);
  assert.deepEqual(stage.ex, []);

  const many = Array.from({ length: MAX_ROUTINES_PER_KIND + 5 }, (_, i) => routine(`r${i}`, `名${i}`));
  assert.equal(normalizeStage({ set: many }).set.length, MAX_ROUTINES_PER_KIND);
});

test('normalize：進行の位置とループ範囲は、必ず今の件数の中へ丸まる', () => {
  // 登録を消した後に範囲外を指したままにしない
  const stage = normalizeStage({
    set: [routine('s1', 'セ1')],
    action: [routine('a1', 'ア1')],
    cursor: { set: 99, action: 99, ex: 99, inEx: 'はい' },
    loop: { mode: 'ごみ', from: 9, to: -3 }
  });
  assert.equal(stage.cursor.set, 1); // セットだけは「件数と同じ＝撃ち切り」を許す
  assert.equal(stage.cursor.action, 0);
  assert.equal(stage.cursor.ex, 0);
  assert.equal(stage.cursor.inEx, false); // trueそのものでなければ立てない
  assert.deepEqual(stage.loop, { mode: 'stop', from: 1, to: 1 });

  // from > to は入れ替えて揃える
  assert.deepEqual(
    normalizeStage({ set: [routine('a', 'A'), routine('b', 'B')], loop: { mode: 'repeat', from: 2, to: 1 } }).loop,
    { mode: 'repeat', from: 1, to: 2 }
  );
});

test('normalize：EXルーチンはEX移行の印を持たない', () => {
  const stage = normalizeStage({ ex: [{ id: 'e1', name: 'EX1', effect: '', toEx: true }] });
  assert.equal('toEx' in stage.ex[0], false);
});

// --- セットルーチン -------------------------------------------------------------

test('セット：ラウンドの頭に1つずつ。撃ち切ったら指定の範囲を繰り返す', () => {
  let stage = buildStage({ loop: { mode: 'repeat', from: 1, to: 2 } });
  const fired = [];
  for (let round = 1; round <= 6; round += 1) {
    const result = fire(stage, { type: 'phaseStart', phase: SET_PHASE });
    stage = result.stage;
    fired.push(...result.entries);
  }
  // 1周目はNo.1〜3、その後はNo.1〜2の繰り返し
  assert.deepEqual(fired, [
    '舞台:セ1', '舞台:セ2', '舞台:セ3', '舞台:セ1', '舞台:セ2', '舞台:セ1'
  ]);
});

test('セット：範囲が1件だけなら、その1件を繰り返す', () => {
  let stage = buildStage({ loop: { mode: 'repeat', from: 2, to: 2 } });
  const fired = [];
  for (let round = 1; round <= 5; round += 1) {
    const result = fire(stage, { type: 'phaseStart', phase: SET_PHASE });
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, ['舞台:セ1', '舞台:セ2', '舞台:セ3', '舞台:セ2', '舞台:セ2']);
});

test('セット：繰り返さない設定なら、撃ち切った後は何も起きない', () => {
  let stage = buildStage({ loop: { mode: 'stop', from: 1, to: 1 } });
  for (let round = 1; round <= 3; round += 1) {
    stage = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  }
  assert.equal(nextSetRoutine(stage), null);
  assert.equal(applyStageRoundEvent(stage, { type: 'phaseStart', phase: SET_PHASE }), null);
});

test('セット：他の段では発動しない', () => {
  const stage = buildStage();
  assert.equal(applyStageRoundEvent(stage, { type: 'phaseStart', phase: { id: 'charge' } }), null);
  assert.equal(applyStageRoundEvent(stage, { type: 'phaseStart', phase: { id: 'cut' } }), null);
});

// --- アクション／EXルーチン ------------------------------------------------------

test('予兆と舞台は同じ中身を指し、進めるのは手番の終了だけ', () => {
  const stage = buildStage();

  const omen = fire(stage, { type: 'turnStart', ...bringerTurn });
  assert.deepEqual(omen.entries, ['予兆:ア1']);
  // 予告しただけなので進行は動かない
  assert.deepEqual(normalizeStage(omen.stage).cursor, stage.cursor);

  const applied = fire(stage, { type: 'turnEnd', ...bringerTurn });
  assert.deepEqual(applied.entries, ['舞台:ア1']);
  assert.equal(applied.stage.cursor.action, 1);

  // 予兆の本文と舞台の本文は、表示名以外まったく同じ
  const omenText = applyStageRoundEvent(stage, { type: 'turnStart', ...bringerTurn }).entries[0].resultText;
  const stageText = applyStageRoundEvent(stage, { type: 'turnEnd', ...bringerTurn }).entries[0].resultText;
  assert.equal(omenText, stageText);
});

test('アクション：末尾まで行くとNo.1へ戻る', () => {
  let stage = buildStage({ action: [routine('a1', 'ア1'), routine('a2', 'ア2')] });
  const fired = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const result = fire(stage, { type: 'turnEnd', ...bringerTurn });
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, ['舞台:ア1', '舞台:ア2', '舞台:ア1', '舞台:ア2', '舞台:ア1']);
});

test('EX移行：アクション由来。以降はアクションの代わりにEXだけを繰り返す', () => {
  let stage = buildStage(); // ア3 に「この後EXへ移行」が付いている
  const fired = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const result = fire(stage, { type: 'turnEnd', ...bringerTurn });
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, ['舞台:ア1', '舞台:ア2', '舞台:ア3', '舞台:EX1', '舞台:EX2', '舞台:EX1']);
  assert.equal(stage.cursor.inEx, true);
  assert.equal(nextActionRoutine(stage).kind, 'ex');
});

test('EX移行：セット由来でも同じように移る', () => {
  const stage = buildStage({
    set: [routine('s1', 'セ1', true)],
    action: [routine('a1', 'ア1')]
  });
  const afterSet = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  assert.equal(afterSet.cursor.inEx, true);
  assert.deepEqual(fire(afterSet, { type: 'turnStart', ...bringerTurn }).entries, ['予兆:EX1']);
});

test('EXが1件も無い舞台では、移行しても何も出ない（落ちない）', () => {
  const stage = buildStage({ set: [routine('s1', 'セ1', true)], ex: [] });
  const afterSet = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  assert.equal(afterSet.cursor.inEx, true);
  assert.equal(applyStageRoundEvent(afterSet, { type: 'turnStart', ...bringerTurn }), null);
  assert.equal(applyStageRoundEvent(afterSet, { type: 'turnEnd', ...bringerTurn }), null);
});

test('ブリンガー以外の手番では、予兆も舞台も動かない', () => {
  const stage = buildStage();
  assert.equal(applyStageRoundEvent(stage, { type: 'turnStart', ...npcTurn }), null);
  assert.equal(applyStageRoundEvent(stage, { type: 'turnEnd', ...npcTurn }), null);
});

test('名前も効果も空の1件は流さないが、進行は進む', () => {
  const stage = normalizeStage({ action: [{ id: 'a1', name: '', effect: '' }, routine('a2', 'ア2')] });
  const result = applyStageRoundEvent(stage, { type: 'turnEnd', ...bringerTurn });
  assert.deepEqual(result.entries, []);
  assert.equal(normalizeStage(result.value).cursor.action, 1);
});

// --- GMの操作（誤爆の手当て） ----------------------------------------------------

test('巻き戻し：1つ戻すと、次に発動するものが戻る', () => {
  let stage = buildStage();
  stage = fire(stage, { type: 'turnEnd', ...bringerTurn }).stage; // ア1 を撃った → 次はア2
  stage = fire(stage, { type: 'turnEnd', ...bringerTurn }).stage; // ア2 を撃った → 次はア3
  assert.equal(stage.cursor.action, 2);

  const back = reduceStage(stage, 'stepBack', { kind: 'action' });
  assert.equal(normalizeStage(back.value).cursor.action, 1);
  assert.match(back.logText, /次はアクションNo\.2/);
});

test('今すぐ発動：ログは出るが、次に発動する位置は動かない', () => {
  // 利用者の例：No.3を撃った後に巻き戻し、代わりにNo.2を手で撃つ。次回はNo.3
  let stage = buildStage();
  for (let i = 0; i < 3; i += 1) stage = fire(stage, { type: 'turnEnd', ...bringerTurn }).stage;
  const rewound = normalizeStage(reduceStage(stage, 'stepBack', { kind: 'action' }).value);

  const fired = reduceStage(rewound, 'fireNow', { kind: 'action', id: 'a2' });
  assert.deepEqual(fired.entries.map(entry => entry.system), ['舞台']);
  assert.match(fired.entries[0].resultText, /^ア2/);
  assert.deepEqual(normalizeStage(fired.value).cursor, rewound.cursor);
});

test('セットの巻き戻し：撃ち切った位置から1つ戻すと、最後の1件をもう一度撃つ', () => {
  let stage = buildStage({ loop: { mode: 'stop', from: 1, to: 1 } });
  for (let i = 0; i < 3; i += 1) stage = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  assert.equal(nextSetRoutine(stage), null);

  const back = normalizeStage(reduceStage(stage, 'stepBack', { kind: 'set' }).value);
  assert.equal(nextSetRoutine(back).name, 'セ3');
  // セットは輪ではないので、先頭より前へは戻らない
  const top = normalizeStage(reduceStage(normalizeStage({ ...back, cursor: { ...back.cursor, set: 0 } }), 'stepBack', { kind: 'set' }) ?? { value: back }).cursor;
  assert.ok(top.set >= 0);
});

test('アクションの巻き戻しは輪：先頭から1つ戻すと末尾へ回る', () => {
  const stage = buildStage();
  const back = normalizeStage(reduceStage(stage, 'stepBack', { kind: 'action' }).value);
  assert.equal(back.cursor.action, 2);
});

test('EX移行はGMが直接切り替えられる（誤って移行したときのため）', () => {
  const stage = buildStage();
  const on = normalizeStage(reduceStage(stage, 'setExMode', { on: true }).value);
  assert.equal(on.cursor.inEx, true);
  const off = normalizeStage(reduceStage(on, 'setExMode', { on: false }).value);
  assert.equal(off.cursor.inEx, false);
  assert.equal(reduceStage(off, 'setExMode', { on: false }), null); // 変化なし
});

test('進行のリセット：登録は残り、位置だけ最初へ戻る', () => {
  let stage = buildStage();
  stage = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  for (let i = 0; i < 3; i += 1) stage = fire(stage, { type: 'turnEnd', ...bringerTurn }).stage;

  const reset = normalizeStage(reduceStage(stage, 'resetProgress', {}).value);
  assert.deepEqual(reset.cursor, createStageState().cursor);
  assert.equal(reset.set.length, 3);
  assert.equal(reset.action.length, 3);
  assert.equal(reduceStage(reset, 'resetProgress', {}), null); // 変化なし
});

test('編集：追加・並べ替え・削除。削除すると進行の位置も丸まる', () => {
  const added = normalizeStage(reduceStage(createStageState(), 'addRoutine', { kind: 'set', id: 'x1' }).value);
  assert.deepEqual(added.set, [{ id: 'x1', name: '', effect: '', toEx: false }]);
  assert.equal(reduceStage(added, 'addRoutine', { kind: 'set', id: 'x1' }), null); // 二重に届いた

  const named = normalizeStage(
    reduceStage(added, 'editRoutine', { kind: 'set', id: 'x1', field: 'name', value: '幕開け' }).value
  );
  assert.equal(named.set[0].name, '幕開け');
  assert.equal(reduceStage(named, 'editRoutine', { kind: 'set', id: 'x1', field: 'name', value: '幕開け' }), null);

  const two = buildStage();
  const moved = normalizeStage(reduceStage(two, 'moveRoutine', { kind: 'set', id: 's2', direction: 'up' }).value);
  assert.deepEqual(moved.set.map(item => item.name), ['セ2', 'セ1', 'セ3']);
  assert.equal(reduceStage(two, 'moveRoutine', { kind: 'set', id: 's1', direction: 'up' }), null); // 端

  let stage = buildStage({ loop: { mode: 'repeat', from: 1, to: 3 } });
  stage = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage;
  stage = fire(stage, { type: 'phaseStart', phase: SET_PHASE }).stage; // 次はセ3（index 2）
  const removed = normalizeStage(reduceStage(stage, 'removeRoutine', { kind: 'set', id: 's3' }).value);
  assert.equal(removed.set.length, 2);
  assert.equal(removed.cursor.set, 2); // 件数と同じ＝撃ち切り。範囲外にはならない
  assert.deepEqual(removed.loop, { mode: 'repeat', from: 1, to: 2 });
});

test('編集：知らない操作・知らない列・EXへのtoExは何もしない', () => {
  const stage = buildStage();
  assert.equal(reduceStage(stage, 'なにか', {}), null);
  assert.equal(reduceStage(stage, 'addRoutine', { kind: '__proto__', id: 'x' }), null);
  assert.equal(reduceStage(stage, 'editRoutine', { kind: 'ex', id: 'e1', field: 'toEx', value: true }), null);
  assert.equal(reduceStage(stage, 'editRoutine', { kind: 'action', id: 'ない', field: 'name', value: 'x' }), null);
  assert.equal(reduceStage(stage, 'fireNow', { kind: 'action', id: 'ない' }), null);
});

// --- ストア（ラウンド進行に載せて通しで動かす） -------------------------------------

const CHAR_TYPE = 'STELLA_KNIGHTS:charType';

function newRoom() {
  return new ImmutableStore(createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }));
}

function addToken(store, id, name, charType) {
  store.dispatch('ADD_CHARACTER', { id, name, parameterOverrides: { [CHAR_TYPE]: charType } });
}

function seedStage(store) {
  const dispatchOp = (op, args) => store.dispatch('UPDATE_ROOM_EXTENSION', { key: 'stage', op, args });
  [['set', 'セ'], ['action', 'ア'], ['ex', 'EX']].forEach(([kind, prefix]) => {
    for (let i = 1; i <= 2; i += 1) {
      const id = `${kind}${i}`;
      dispatchOp('addRoutine', { kind, id });
      dispatchOp('editRoutine', { kind, id, field: 'name', value: `${prefix}${i}` });
      dispatchOp('editRoutine', { kind, id, field: 'effect', value: `${prefix}${i}の効果` });
    }
  });
}

const stageOf = (store) => store.state.room.extensions?.STELLA_KNIGHTS?.stage;
const mainLog = (store) => store.state.chatLogs[MAIN_CHAT_TAB_ID];
// 舞台が出した発言だけを「表示名:1行目」で拾う（システム発言は system:'システム'）
const stageEntries = (store) => mainLog(store)
  .filter(entry => entry.system === '予兆' || entry.system === '舞台')
  .map(entry => `${entry.system}:${entry.resultText.split('\n')[0]}`);

test('ラウンド進行：セットで舞台、ブリンガーの手番の前後で予兆と舞台が出る', () => {
  const store = newRoom();
  addToken(store, 'npc', 'エネミー', 'NPC');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['npc', 'br'] });
  // 先頭はセットの段。開始した時点でセットルーチンNo.1が撃たれている
  assert.deepEqual(stageEntries(store), ['舞台:セ1']);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セット → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // チャージ判定 → アクション（NPCの手番）
  assert.equal(store.state.round.currentActorId, 'npc'); // 手番順1のNPCが先
  assert.deepEqual(stageEntries(store), ['舞台:セ1']); // NPCの手番では予兆は出ない

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // NPCの手番終了 → ブリンガーの手番
  assert.equal(store.state.round.currentActorId, 'br');
  assert.deepEqual(stageEntries(store), ['舞台:セ1', '予兆:ア1']);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // ブリンガーの手番終了
  assert.deepEqual(stageEntries(store), ['舞台:セ1', '予兆:ア1', '舞台:ア1']);
  assert.equal(stageOf(store).cursor.action, 1);
});

test('ラウンド進行：手番を終えた効果は、次の手番の予告より前に並ぶ', () => {
  const store = newRoom();
  addToken(store, 'b1', 'ブリンガー1', 'ブリンガー');
  addToken(store, 'b2', 'ブリンガー2', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['b1', 'b2'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション（1人目）
  const before = mainLog(store).length;

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 1人目の手番終了 → 2人目の手番
  const added = mainLog(store).slice(before).map(entry => entry.system);
  // 舞台（終えた手番の適用）→ システム（次は誰の手番か）→ 予兆（次の手番の予告）
  assert.deepEqual(added, ['舞台', 'システム', '予兆']);
});

test('ラウンド進行：シースは手番の列に出ない（skipWhen）', () => {
  const store = newRoom();
  addToken(store, 'sh', 'シース', 'シース');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['sh', 'br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション
  assert.equal(store.state.round.currentActorId, 'br');

  // ブリンガーの手番を終えると、シースには回らずカットへ抜ける
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(store.state.round.template[store.state.round.phaseIndex].id, 'cut');
});

test('ラウンド進行：参加者がシースだけの段は、手番の主がいないので素通りする', () => {
  const store = newRoom();
  addToken(store, 'sh', 'シース', 'シース');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['sh'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクションは飛ばしてカットへ
  assert.equal(store.state.round.template[store.state.round.phaseIndex].id, 'cut');
});

test('ラウンド進行：2周してもセットは1ラウンドに1つずつ、舞台はラウンド終了で消えない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  // セット → チャージ → アクション → カット の4段で1ラウンド
  for (let i = 0; i < 4; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(store.state.round.roundNumber, 2);

  // ラウンドが変わっても登録は残っている（始まりの部屋と違い、resetOnPhaseEndを持たない）
  assert.equal(stageOf(store).set.length, 2);
  assert.deepEqual(stageEntries(store), ['舞台:セ1', '予兆:ア1', '舞台:ア1', '舞台:セ2']);
});

test('ラウンド進行：舞台を登録していない部屋では、発言も状態も増えない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  for (let i = 0; i < 4; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.deepEqual(stageEntries(store), []);
  assert.equal(stageOf(store), undefined);
});

test('hydrate：壊れた舞台・知らないシステムの値は落ちる', () => {
  const store = newRoom();
  store.hydrate({
    ...createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }),
    room: {
      ...createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }).room,
      extensions: {
        STELLA_KNIGHTS: { stage: { set: 'ごみ', cursor: { set: 99 } }, 知らないキー: { x: 1 } },
        DX3: { stage: { set: [routine('s1', 'セ1')] } }
      }
    }
  });
  assert.deepEqual(stageOf(store), createStageState());
  assert.equal(store.state.room.extensions.STELLA_KNIGHTS.知らないキー, undefined);
  assert.equal(store.state.room.extensions.DX3, undefined);
});
