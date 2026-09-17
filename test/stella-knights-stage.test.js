// test/stella-knights-stage.test.js
// 銀剣のステラナイツの「舞台」と、それを動かすCore側の仕掛け（拡張ルーム設定の
// applyRoundEvent・フェーズ内の段 steps・手番順の skipWhen）を固定するテスト。
//
// 守りたいのは、目で見ても気付きにくい5つ。
//   ・発動はすべてGMの押下で起きる。押していないものは出ない
//   ・セットルーチンは1ラウンドに1つずつ。撃ち切った後のループ設定どおりに回る
//   ・予兆（手番の前の予告）と舞台（適用）は必ず同じ中身を指す
//   ・EXへ移行したら、以降はアクションの代わりにEXだけを繰り返す
//   ・種別で押す回数が変わる（ブリンガー5回／NPC1回／シースは手番なし）
// どれも「それらしく動いてしまう」種類の間違い。
//
// 段が添字ではなくidで進むこと（一覧に無いidは1回の押下で手番が終わる）も、
// ここで固定する。手番中のコマを参加者から外した瞬間に進行が止まる事故を防ぐため。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, MAIN_CHAT_TAB_ID, listPhaseSteps } from '../js/game-store.js';
import {
  applyStageRoundEvent, createStageState, describeRoutine, MAX_ROUTINES_PER_KIND,
  nextActionRoutine, nextSetRoutine, normalizeStage, OMEN_DECLARATION, reduceStage,
  routineNumberLabel, STAGE_STEPS
} from '../js/parameters/stella-knights-stage.js';

const routine = (id, name, toEx = false) => ({ id, name, effect: `${name}の効果`, toEx });

function buildStage(overrides = {}) {
  return normalizeStage({
    set: [routine('s1', 'セ1'), routine('s2', 'セ2'), routine('s3', 'セ3')],
    action: [routine('a1', 'ア1'), routine('a2', 'ア2'), routine('a3', 'ア3', true)],
    ex: [routine('e1', 'EX1'), routine('e2', 'EX2')],
    ...overrides
  });
}

// 段を1つ押して、出た発言と次の状態を返す。
// entries は表示名つきの発言（[予兆] [舞台]）、logText は「システム」の1行に混ざるもの。
function press(stage, stepId, extra = {}) {
  const result = applyStageRoundEvent(stage, { type: 'step', stepId, isBringer: true, ...extra });
  if (!result) return { stage, entries: [], logText: '' };
  return {
    stage: result.value ? normalizeStage(result.value) : stage,
    entries: (result.entries ?? []).map(entry => `${entry.system}:${entry.resultText.split('\n')[0]}`),
    logText: result.logText ?? ''
  };
}

// ブリンガーの手番1回ぶん。出たものを「表示名:本文」の形で順に並べる
// （logText は「システム」として出るので [システム] と書く）。
function bringerTurn(stage, actor = { name: 'ブリンガー君' }) {
  const out = [];
  let next = stage;
  const start = applyStageRoundEvent(next, { type: 'turnStart', isBringer: true, actor });
  if (start?.logText) out.push(`システム:${start.logText}`);
  for (const id of [STAGE_STEPS.omen, STAGE_STEPS.actionStart, STAGE_STEPS.turnEnd,
    STAGE_STEPS.routine, STAGE_STEPS.actionEnd]) {
    const result = press(next, id, { actor });
    next = result.stage;
    if (result.logText) out.push(`システム:${result.logText}`);
    out.push(...result.entries);
  }
  return { stage: next, entries: out };
}

// --- 正規化 -------------------------------------------------------------------

test('normalize：壊れた値・idの重複・件数超過を落とし、形は必ず揃う', () => {
  assert.deepEqual(normalizeStage(undefined), createStageState());
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

  assert.deepEqual(
    normalizeStage({ set: [routine('a', 'A'), routine('b', 'B')], loop: { mode: 'repeat', from: 2, to: 1 } }).loop,
    { mode: 'repeat', from: 1, to: 2 }
  );
});

test('normalize：EXルーチンはEX移行の印を持たない', () => {
  const stage = normalizeStage({ ex: [{ id: 'e1', name: 'EX1', effect: '', toEx: true }] });
  assert.equal('toEx' in stage.ex[0], false);
});

// --- 番号の表記 ---------------------------------------------------------------

test('番号の表記：セット／アクションは No.N、EXは EXN。名前とは全角スペースで区切る', () => {
  assert.equal(routineNumberLabel('set', 0), 'No.1');
  assert.equal(routineNumberLabel('action', 2), 'No.3');
  assert.equal(routineNumberLabel('ex', 0), 'EX1');

  assert.equal(describeRoutine('set', 0, routine('s1', 'セ1')), 'No.1　セ1\nセ1の効果');
  assert.equal(describeRoutine('ex', 1, { id: 'e2', name: 'EX2', effect: '' }), 'EX2　EX2');
  // 名前が空の行は、区切りだけが残って「No.1　」と尻切れにならないこと
  assert.equal(describeRoutine('set', 0, { id: 'x', name: '', effect: '効果だけ' }), 'No.1\n効果だけ');
  // 名前も効果も空なら流さない（番号だけの発言に意味は無い）
  assert.equal(describeRoutine('set', 0, { id: 'x', name: '', effect: '' }), null);
});

// --- セットルーチン -------------------------------------------------------------

test('セット：段に入っただけでは出ない。開示を押して初めて発動する', () => {
  const stage = buildStage();
  // 以前は段に入った時点（phaseStart）で撃っていた。もう撃たない
  assert.equal(applyStageRoundEvent(stage, { type: 'phaseStart', phase: { id: 'set' } }), null);

  const revealed = press(stage, STAGE_STEPS.revealSet);
  assert.deepEqual(revealed.entries, ['舞台:No.1　セ1']);
  assert.equal(revealed.stage.cursor.set, 1);
});

test('セット：1ラウンドに1つずつ。撃ち切ったら指定の範囲を繰り返す', () => {
  let stage = buildStage({ loop: { mode: 'repeat', from: 1, to: 2 } });
  const fired = [];
  for (let round = 1; round <= 6; round += 1) {
    const result = press(stage, STAGE_STEPS.revealSet);
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, [
    '舞台:No.1　セ1', '舞台:No.2　セ2', '舞台:No.3　セ3',
    '舞台:No.1　セ1', '舞台:No.2　セ2', '舞台:No.1　セ1'
  ]);
});

test('セット：範囲が1件だけなら、その1件を繰り返す', () => {
  let stage = buildStage({ loop: { mode: 'repeat', from: 2, to: 2 } });
  const fired = [];
  for (let round = 1; round <= 5; round += 1) {
    const result = press(stage, STAGE_STEPS.revealSet);
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, [
    '舞台:No.1　セ1', '舞台:No.2　セ2', '舞台:No.3　セ3',
    '舞台:No.2　セ2', '舞台:No.2　セ2'
  ]);
});

test('セット：繰り返さない設定なら、撃ち切った後は押しても何も出ない', () => {
  let stage = buildStage({ loop: { mode: 'stop', from: 1, to: 1 } });
  for (let round = 1; round <= 3; round += 1) stage = press(stage, STAGE_STEPS.revealSet).stage;
  assert.equal(nextSetRoutine(stage).routine, null);
  assert.equal(applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.revealSet }), null);
});

// --- アクション／EXルーチン ------------------------------------------------------

test('手番1回ぶんの発言が、手番の知らせ → 予兆 → 行動開始 → 予告 → 適用 の順に出る', () => {
  const stage = buildStage();
  const { entries, stage: after } = bringerTurn(stage);
  // 手番の知らせと「発動します」の予告は「システム」へ寄せた（表示名を増やさない）
  assert.deepEqual(entries, [
    `システム:ブリンガー君の手番。${OMEN_DECLARATION}`,
    '予兆:No.1　ア1',
    '舞台:「ブリンガー君」の行動開始',
    'システム:アクションルーチンを発動します',
    '舞台:No.1　ア1'
  ]);
  assert.equal(after.cursor.action, 1);
});

test('予兆と適用は同じ中身を指し、進めるのは「ルーチン発動」だけ', () => {
  const stage = buildStage();

  const omen = press(stage, STAGE_STEPS.omen);
  assert.deepEqual(omen.entries, ['予兆:No.1　ア1']);
  assert.deepEqual(omen.stage.cursor, stage.cursor); // 予告しただけ

  const applied = press(stage, STAGE_STEPS.routine);
  assert.deepEqual(applied.entries, ['舞台:No.1　ア1']);
  assert.equal(applied.stage.cursor.action, 1);

  // 表示名以外まったく同じ本文
  const omenText = applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.omen }).entries[0].resultText;
  const stageText = applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.routine }).entries[0].resultText;
  assert.equal(omenText, stageText);
});

test('アクション：末尾まで行くとNo.1へ戻る', () => {
  let stage = buildStage({ action: [routine('a1', 'ア1'), routine('a2', 'ア2')] });
  const fired = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const result = press(stage, STAGE_STEPS.routine);
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, [
    '舞台:No.1　ア1', '舞台:No.2　ア2',
    '舞台:No.1　ア1', '舞台:No.2　ア2', '舞台:No.1　ア1'
  ]);
});

test('EX移行：アクション由来。以降はアクションの代わりにEXだけを繰り返す', () => {
  let stage = buildStage(); // ア3 に「この後EXへ移行」が付いている
  const fired = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const result = press(stage, STAGE_STEPS.routine);
    stage = result.stage;
    fired.push(...result.entries);
  }
  assert.deepEqual(fired, [
    '舞台:No.1　ア1', '舞台:No.2　ア2', '舞台:No.3　ア3',
    '舞台:EX1　EX1', '舞台:EX2　EX2', '舞台:EX1　EX1'
  ]);
  assert.equal(stage.cursor.inEx, true);
  assert.equal(nextActionRoutine(stage).kind, 'ex');
});

test('EX移行：セット由来でも同じように移り、予告も「EXルーチン」になる', () => {
  const stage = buildStage({ set: [routine('s1', 'セ1', true)], action: [routine('a1', 'ア1')] });
  const afterSet = press(stage, STAGE_STEPS.revealSet).stage;
  assert.equal(afterSet.cursor.inEx, true);
  assert.deepEqual(press(afterSet, STAGE_STEPS.omen).entries, ['予兆:EX1　EX1']);
  assert.equal(press(afterSet, STAGE_STEPS.turnEnd).logText, 'EXルーチンを発動します');
});

test('EXが1件も無い舞台では、移行しても何も出ない（落ちない）', () => {
  const stage = buildStage({ set: [routine('s1', 'セ1', true)], ex: [] });
  const afterSet = press(stage, STAGE_STEPS.revealSet).stage;
  assert.equal(afterSet.cursor.inEx, true);
  assert.equal(applyStageRoundEvent(afterSet, { type: 'step', stepId: STAGE_STEPS.omen }), null);
  assert.equal(applyStageRoundEvent(afterSet, { type: 'step', stepId: STAGE_STEPS.routine }), null);
});

test('ブリンガー以外では、手番は知らせるが「発動します」の予告は出ない', () => {
  const stage = buildStage();
  // 手番の知らせはCoreの代わりに出すので、NPCのぶんも出す（出さないと誰の手番か分からない）
  const npcTurn = applyStageRoundEvent(stage, {
    type: 'turnStart', isBringer: false, actor: { name: '敵NPC' }
  });
  assert.equal(npcTurn.logText, '敵NPCの手番。');
  assert.equal(
    applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.turnEnd, isBringer: false }),
    null
  );
});

test('段を抜けるだけの押下（アクション終了・次へ進む）では何も起きない', () => {
  const stage = buildStage();
  assert.equal(applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.actionEnd }), null);
  assert.equal(applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.setDone }), null);
  assert.equal(applyStageRoundEvent(stage, { type: 'step', stepId: '知らない段' }), null);
});

test('名前も効果も空の1件は流さないが、進行は進む', () => {
  const stage = normalizeStage({ action: [{ id: 'a1', name: '', effect: '' }, routine('a2', 'ア2')] });
  const result = applyStageRoundEvent(stage, { type: 'step', stepId: STAGE_STEPS.routine });
  assert.deepEqual(result.entries, []);
  assert.equal(normalizeStage(result.value).cursor.action, 1);
});

// --- GMの操作（誤爆の手当て） ----------------------------------------------------

test('巻き戻し：1つ戻すと、次に発動するものが戻る', () => {
  let stage = buildStage();
  stage = press(stage, STAGE_STEPS.routine).stage; // ア1 → 次はア2
  stage = press(stage, STAGE_STEPS.routine).stage; // ア2 → 次はア3
  assert.equal(stage.cursor.action, 2);

  const back = reduceStage(stage, 'stepBack', { kind: 'action' });
  assert.equal(normalizeStage(back.value).cursor.action, 1);
  assert.match(back.logText, /次はNo\.2/);
});

test('今すぐ発動：ログは出るが、次に発動する位置は動かない', () => {
  // 利用者の例：No.3を撃った後に巻き戻し、代わりにNo.2を手で撃つ。次回はNo.3
  let stage = buildStage();
  for (let i = 0; i < 3; i += 1) stage = press(stage, STAGE_STEPS.routine).stage;
  const rewound = normalizeStage(reduceStage(stage, 'stepBack', { kind: 'action' }).value);

  const fired = reduceStage(rewound, 'fireNow', { kind: 'action', id: 'a2' });
  assert.deepEqual(fired.entries.map(entry => entry.system), ['舞台']);
  assert.match(fired.entries[0].resultText, /^No\.2　ア2/);
  assert.deepEqual(normalizeStage(fired.value).cursor, rewound.cursor);
});

test('セットの巻き戻し：撃ち切った位置から1つ戻すと、最後の1件をもう一度撃つ', () => {
  let stage = buildStage({ loop: { mode: 'stop', from: 1, to: 1 } });
  for (let i = 0; i < 3; i += 1) stage = press(stage, STAGE_STEPS.revealSet).stage;
  assert.equal(nextSetRoutine(stage).routine, null);

  const back = normalizeStage(reduceStage(stage, 'stepBack', { kind: 'set' }).value);
  assert.equal(nextSetRoutine(back).routine.name, 'セ3');
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
  stage = press(stage, STAGE_STEPS.revealSet).stage;
  for (let i = 0; i < 3; i += 1) stage = press(stage, STAGE_STEPS.routine).stage;

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
  stage = press(stage, STAGE_STEPS.revealSet).stage;
  stage = press(stage, STAGE_STEPS.revealSet).stage; // 次はセ3（index 2）
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

// --- Core：フェーズ内の段（steps） -------------------------------------------------

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
const stageEntries = (store) => mainLog(store)
  .filter(entry => entry.system === '予兆' || entry.system === '舞台')
  .map(entry => `${entry.system}:${entry.resultText.split('\n')[0]}`);
const phaseIdOf = (store) => store.state.round.template[store.state.round.phaseIndex].id;
const stepLabels = (store) => listPhaseSteps(store.state.tokens, store.state.round).map(s => s.label);

test('段の一覧：宣言が無ければ空。ブリンガーは5段、NPCは1段', () => {
  const store = newRoom();
  addToken(store, 'npc', 'エネミー', 'NPC');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['npc', 'br'] });

  // セットの段は2つ
  assert.deepEqual(stepLabels(store), ['セットルーチンを開示', '次へ進む']);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 開示
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定（段の宣言が無い）
  assert.equal(phaseIdOf(store), 'charge');
  assert.deepEqual(stepLabels(store), []);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション（NPCの手番）
  assert.equal(store.state.round.currentActorId, 'npc');
  assert.deepEqual(stepLabels(store), ['手番終了']);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // NPCの手番終了 → ブリンガーの手番
  assert.equal(store.state.round.currentActorId, 'br');
  assert.deepEqual(stepLabels(store), [
    '予兆を開示', 'アクション開始', '手番終了', 'ルーチン発動', 'アクション終了'
  ]);
});

test('ラウンド進行：開始しただけではセットルーチンが出ない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  assert.deepEqual(stageEntries(store), []);
  assert.equal(store.state.round.step, STAGE_STEPS.revealSet);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 開示
  assert.deepEqual(stageEntries(store), ['舞台:No.1　セ1']);
  // 段を進めただけなのでフェーズは動かない
  assert.equal(phaseIdOf(store), 'set');
  assert.equal(store.state.round.step, STAGE_STEPS.setDone);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 次へ進む
  assert.equal(phaseIdOf(store), 'charge');
});

test('ラウンド進行：ブリンガーの手番は5回押し、押すたびに1つずつ出る', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー君', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セット開示
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション（手番の知らせが出る）
  // 手番の知らせはシステム発言へ統合した。Coreの「アクション: ○○の手番です。」は出ない
  assert.match(mainLog(store).at(-1).resultText, /ブリンガー君の手番。予兆を公開します/);
  assert.equal(mainLog(store).at(-1).system, 'システム');
  assert.deepEqual(stageEntries(store).slice(1), []);

  const pressed = [];
  for (let i = 0; i < 5; i += 1) {
    store.dispatch('ROUND_ADVANCE_PHASE', {});
    const last = mainLog(store).at(-1);
    pressed.push(`${last.system}:${last.resultText.split('\n')[0]}`);
  }
  assert.deepEqual(pressed, [
    '予兆:No.1　ア1',
    '舞台:「ブリンガー君」の行動開始',
    'システム:アクションルーチンを発動します',
    '舞台:No.1　ア1',
    'システム:ラウンド1 - カット開始。' // 5回目は何も出さず、手番が終わって次の段へ
  ]);
  // 5回目の押下で手番が終わり、次の段（カット）へ移っている
  assert.equal(phaseIdOf(store), 'cut');
  assert.equal(stageOf(store).cursor.action, 1);
});

test('ラウンド進行：NPCの手番は1回押すだけで、予兆もルーチンも出ない', () => {
  const store = newRoom();
  addToken(store, 'npc', 'エネミー', 'NPC');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['npc', 'br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション（NPCの手番）
  // NPCの手番も舞台が知らせる（Coreの代わりに出すので、出さないと誰の手番か分からない）
  assert.match(mainLog(store).at(-1).resultText, /エネミーの手番。$/);
  const before = stageEntries(store).length;

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // NPCの手番終了
  assert.equal(store.state.round.currentActorId, 'br');
  // NPCの手番では予兆もルーチンも出ず、ブリンガーの手番の知らせだけが出る
  assert.deepEqual(stageEntries(store).slice(before), []);
  assert.match(mainLog(store).at(-1).resultText, /ブリンガーの手番。予兆を公開します/);
});

test('段の途中の押下では、空のシステム発言が増えない', () => {
  // 盤面下のカレントチャット欄はMainの最新1件だけを映すので、
  // 空の発言が積まれると直前の台詞が読めなくなる
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  for (let i = 0; i < 6; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});

  const empties = mainLog(store).filter(entry => (entry.resultText ?? '') === '');
  assert.deepEqual(empties, []);
});

test('段はidで進む：一覧に無いidなら1回の押下で手番が終わる', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション
  assert.equal(phaseIdOf(store), 'action');

  // 段の途中で種別を変えると、当てはまる段が5→1に縮む。添字なら範囲外になる場面
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 予兆を開示 → 次はアクション開始
  store.dispatch('SET_PARAMETER', { characterId: 'br', paramId: CHAR_TYPE, value: 'NPC' });
  assert.deepEqual(stepLabels(store), ['手番終了']);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 落ちずに手番が終わる
  assert.equal(phaseIdOf(store), 'cut');
});

test('手番中のコマを参加者から外しても、進行が止まらない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  addToken(store, 'br2', 'ブリンガー2', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br', 'br2'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 予兆を開示

  // 手番中のコマを外すと currentActorId が null になる
  store.dispatch('ROUND_SET_PARTICIPANTS', { participantIds: ['br2'] });
  assert.equal(store.state.round.currentActorId, null);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // 落ちずに次の手番へ
  assert.equal(store.state.round.currentActorId, 'br2');
});

test('ROUND_STEP_BACK：段を1つ戻す。先頭では何もしない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  const atStart = store.state;
  store.dispatch('ROUND_STEP_BACK', {}); // 先頭の段なので変化なし
  assert.equal(store.state, atStart);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セット開示 → 次は「次へ進む」
  assert.equal(store.state.round.step, STAGE_STEPS.setDone);

  store.dispatch('ROUND_STEP_BACK', {});
  assert.equal(store.state.round.step, STAGE_STEPS.revealSet);
  assert.match(mainLog(store).at(-1).resultText, /段を1つ戻しました/);
});

test('ラウンド進行：シースは手番の列に出ない（skipWhen）', () => {
  const store = newRoom();
  addToken(store, 'sh', 'シース', 'シース');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['sh', 'br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション
  assert.equal(store.state.round.currentActorId, 'br');

  for (let i = 0; i < 5; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(phaseIdOf(store), 'cut'); // シースには回らない
});

test('ラウンド進行：参加者がシースだけの段は、手番の主がいないので素通りする', () => {
  const store = newRoom();
  addToken(store, 'sh', 'シース', 'シース');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['sh'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セット開示
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // アクションは飛ばしてカットへ
  assert.equal(phaseIdOf(store), 'cut');
});

test('ラウンド進行：2周してもセットは1ラウンドに1つずつ、舞台はラウンド終了で消えない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  // セット2回 → チャージ1回 → 手番5回 → カット1回 で1ラウンド
  for (let i = 0; i < 9; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(store.state.round.roundNumber, 2);
  assert.equal(phaseIdOf(store), 'set');

  // ラウンドが変わっても登録は残っている（resetOnPhaseEndを持たない）
  assert.equal(stageOf(store).set.length, 2);
  store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(stageEntries(store).at(-1), '舞台:No.2　セ2');
});

test('ラウンド進行：舞台を登録していない部屋では、発言も状態も増えない', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  for (let i = 0; i < 9; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.deepEqual(stageEntries(store), []);
  assert.equal(stageOf(store), undefined);
});

// --- 進行の終了で舞台を戻す ---------------------------------------------------

test('progressionEnd：進行だけが最初へ戻り、登録した内容は残る', () => {
  let stage = buildStage();
  stage = press(stage, STAGE_STEPS.revealSet).stage;
  for (let i = 0; i < 3; i += 1) stage = press(stage, STAGE_STEPS.routine).stage; // EXへ移行する
  assert.equal(stage.cursor.inEx, true);

  const ended = applyStageRoundEvent(stage, { type: 'progressionEnd' });
  const after = normalizeStage(ended.value);
  assert.deepEqual(after.cursor, createStageState().cursor);
  assert.equal(after.set.length, 3);
  assert.equal(after.action.length, 3);
  assert.deepEqual(ended.entries, []); // 黙って戻す
  assert.equal(ended.logText, undefined);

  // もう一度撃っても変化しない（同じ参照を返さず null）
  assert.equal(applyStageRoundEvent(after, { type: 'progressionEnd' }), null);
});

test('ラウンド進行：終了すると舞台が最初へ戻り、次の戦闘はNo.1から始まる', () => {
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  // セット2回 → チャージ1回 → 手番5回 → カット1回 で1ラウンド
  for (let i = 0; i < 9; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.equal(stageOf(store).cursor.set, 1); // 次はセ2
  assert.equal(stageOf(store).cursor.action, 1);

  const before = mainLog(store).length;
  store.dispatch('ROUND_PROGRESSION_END', {});
  assert.deepEqual(stageOf(store).cursor, createStageState().cursor);
  assert.equal(stageOf(store).set.length, 2); // 登録は残る
  // 黙って戻す（増えるのは「ラウンド進行を終了しました」の1件だけ）
  assert.equal(mainLog(store).length - before, 1);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セットルーチンを開示
  assert.equal(stageEntries(store).at(-1), '舞台:No.1　セ1');
});

test('ラウンド進行：毎ラウンドのカットでは舞台が戻らない', () => {
  // resetOnPhaseEnd で書くとここが壊れる（カットも進行の終了も同じ round で呼ばれるため）
  const store = newRoom();
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['br'] });
  for (let i = 0; i < 9; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {}); // ラウンド2へ
  assert.equal(store.state.round.roundNumber, 2);
  assert.equal(stageOf(store).cursor.set, 1); // 戻っていない

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // ラウンド2のセットを開示
  assert.equal(stageEntries(store).at(-1), '舞台:No.2　セ2');
});

// --- 手番の知らせの統合 ---------------------------------------------------------

test('ラウンド進行：段に入った直後は「開始。」と手番の知らせが1件にまとまる', () => {
  const store = newRoom();
  addToken(store, 'npc', 'エネミー', 'NPC');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  seedStage(store);

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['npc', 'br'] });
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // セット開示
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → チャージ判定
  store.dispatch('ROUND_ADVANCE_PHASE', {}); // → アクション（NPCの手番）

  const last = mainLog(store).at(-1);
  assert.equal(last.system, 'システム');
  assert.deepEqual(last.resultText.split('|SPLIT|'.replace('|SPLIT|', String.fromCharCode(10))), [
    'ラウンド1 - アクション開始。',
    'エネミーの手番。'
  ]);
  // Coreの「（手番: ○○）」は出ない（同じことを2回言わない）
  assert.equal(last.resultText.includes('（手番:'), false);
});

test('舞台を登録していない部屋では、手番の知らせは今までどおりCoreの文言', () => {
  const store = newRoom();
  addToken(store, 'npc', 'エネミー', 'NPC');
  addToken(store, 'br', 'ブリンガー', 'ブリンガー');
  // seedStage を呼ばない＝拡張の値が無いので applyRoundEvent 自体が届かない

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['npc', 'br'] });
  for (let i = 0; i < 3; i += 1) store.dispatch('ROUND_ADVANCE_PHASE', {});
  assert.match(mainLog(store).at(-1).resultText, /（手番: エネミー）/);

  store.dispatch('ROUND_ADVANCE_PHASE', {}); // NPCの手番終了
  assert.match(mainLog(store).at(-1).resultText, /アクション: ブリンガーの手番です。/);
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
