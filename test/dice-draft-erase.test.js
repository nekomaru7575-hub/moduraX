// test/dice-draft-erase.test.js
// ダイスの廃棄。コマンド（dice.erase）とパネルのゴミ箱で消し方が食い違わないことを守る。
//
// ここで守っているのは：
//   1. dice.erase(3) で1個、dice.erase(3*2) で2個、プールから消えること
//   2. 個数が足りなければ1個も消えず、理由が出ること
//   3. コマンドはプールだけを見る（スキルに乗っているダイスは巻き込まない）こと
//   4. ゴミ箱の経路（removeDice / runDiceDiscard）はスキルの下からも消せること
//   5. 消したことがチャットへ1行出ること（黙って減らさない）
//   6. 書式に合わないものは横取りしないこと

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { poolDiceIdsByFace, removeDice } from '../js/parameters/dice-draft/dice-draft-model.js';
import {
  handleDiceDraftPoolCommand, looksLikeDiceDraftPoolCommand, runDiceDiscard
} from '../js/parameters/dice-draft/dice-draft-pool.js';
import { STELLA_KNIGHTS_PLUGIN } from '../js/parameters/stella-knights.js';

const spec = STELLA_KNIGHTS_PLUGIN.diceDraft;
const COMPONENT_KEY = 'diceDraft';

let seq = 0;
const die = (value) => ({ id: `d${seq++}`, sides: 6, value });
const values = (list) => list.map(d => d.value);

// components に直にドラフトを持たせたコマ。種別はブリンガー（ドラフトを使える側）。
const tokenWith = (draft) => ({
  id: 't1', name: 'テスト', ownerId: null,
  components: { [COMPONENT_KEY]: draft },
  parameters: { 'STELLA_KNIGHTS:type': { value: 'ブリンガー' } }
});

// alert は Node に無いので、呼ばれた文言を拾えるように差し替える
function captureAlerts(run) {
  const messages = [];
  const original = globalThis.alert;
  globalThis.alert = (message) => messages.push(message);
  try { run(); } finally {
    if (original === undefined) delete globalThis.alert;
    else globalThis.alert = original;
  }
  return messages;
}

// コマンドを1回流して、送られたアクションと断りの文言を返す。
function run(input, draft) {
  const dispatched = [];
  const token = tokenWith(draft);
  const context = { spec, token, dispatch: (action, payload) => dispatched.push({ action, payload }) };

  let handled;
  const alerts = captureAlerts(() => { handled = handleDiceDraftPoolCommand(input, context); });

  const saved = dispatched.find(entry => entry.action === 'SET_COMPONENT');
  const chat = dispatched.find(entry => entry.action === 'ADD_CHAT_MESSAGE');
  return { handled, alerts, dispatched, draft: saved?.payload.value ?? null, chat };
}

// --- コマンド（プールだけを見る） ---

test('dice.erase(3) で1個、dice.erase(3*2) で2個プールから消える', () => {
  const one = run('dice.erase(3)', { pool: [die(3), die(3), die(5)], placements: {} });
  assert.equal(one.handled, true);
  assert.deepEqual(one.alerts, []);
  assert.deepEqual(values(one.draft.pool), [3, 5]);

  const two = run('dice.erase(3*2)', { pool: [die(3), die(3), die(5)], placements: {} });
  assert.deepEqual(values(two.draft.pool), [5]);

  // 全角の×も受ける（dice.add と同じ扱い）
  const fullwidth = run('dice.erase(3×2)', { pool: [die(3), die(3), die(5)], placements: {} });
  assert.deepEqual(values(fullwidth.draft.pool), [5]);
});

test('個数が足りなければ1個も消えず、理由が出る', () => {
  const { handled, alerts, dispatched } = run('dice.erase(3*3)', {
    pool: [die(3), die(3), die(5)], placements: {}
  });

  assert.equal(handled, true, '書式が合ったのに素通しした');
  assert.deepEqual(dispatched, [], '足りないのに状態を動かした');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /3の目.*3個.*現在 2個/);
});

test('コマンドはプールだけを見る（スキルに乗っているダイスは巻き込まない）', () => {
  const placed = die(3);
  const { alerts, dispatched } = run('dice.erase(3)', {
    pool: [die(5)], placements: { 一閃: [placed] }
  });

  assert.deepEqual(dispatched, [], '乗っているダイスを消してしまった');
  assert.match(alerts[0], /現在 0個/);
});

test('消したことはチャットへ1行出る', () => {
  const { chat } = run('dice.erase(3*2)', { pool: [die(3), die(3), die(5)], placements: {} });

  assert.ok(chat, 'ログが出ていない');
  assert.equal(chat.payload.entry.command, 'dice.erase(3*2)');
  assert.equal(chat.payload.entry.resultText, '3の目 ×2 を廃棄（残り 1個）');
});

test('書式に合わないものは横取りしない', () => {
  // 目は1以上。0は書式に合うが値が不正なので、断って true（ただのダイス式として再解釈させない）
  const zero = run('dice.erase(0)', { pool: [die(3)], placements: {} });
  assert.equal(zero.handled, true);
  assert.deepEqual(zero.dispatched, []);
  assert.equal(zero.alerts.length, 1);

  // 個数が0も同じ
  const none = run('dice.erase(3*0)', { pool: [die(3)], placements: {} });
  assert.equal(none.handled, true);
  assert.deepEqual(none.dispatched, []);
  assert.equal(none.alerts.length, 1);

  // そもそも別物は触らない（綴り違いの erace も含む）
  for (const input of ['dice.erase()', 'dice.erace(3)', 'こんにちは']) {
    assert.equal(looksLikeDiceDraftPoolCommand(input), false, `${input}: dice.* に見えている`);
    assert.equal(
      run(input, { pool: [die(3)], placements: {} }).handled, false,
      `${input}: 横取りした`
    );
  }
});

// --- ゴミ箱の経路（id指定） ---

test('removeDice はスキルの下からも消し、最後の1個でキーごと消える', () => {
  const onSkill = die(4);
  const inPool = die(2);
  const draft = { pool: [inPool, die(6)], placements: { 一閃: [onSkill] } };

  const { draft: next, removed } = removeDice(draft, [onSkill.id, inPool.id]);
  assert.equal(removed, 2);
  assert.deepEqual(values(next.pool), [6]);
  assert.equal(next.placements['一閃'], undefined, '空になった置き場が残っている');

  // 知らないidは飛ばす。1個も消えなければ元の参照をそのまま返す
  const nothing = removeDice(draft, ['いない']);
  assert.equal(nothing.removed, 0);
  assert.equal(nothing.draft, draft);
});

test('runDiceDiscard はスキルの下のダイスも消し、ログを1行出す', () => {
  const onSkill = die(4);
  const dispatched = [];
  const token = tokenWith({ pool: [die(2)], placements: { 一閃: [onSkill] } });

  const result = runDiceDiscard({
    spec, token, dieIds: [onSkill.id],
    dispatch: (action, payload) => dispatched.push({ action, payload })
  });

  assert.deepEqual(result, { ok: true, removed: 1 });
  const saved = dispatched.find(entry => entry.action === 'SET_COMPONENT');
  assert.equal(saved.payload.value.placements['一閃'], undefined);
  assert.deepEqual(values(saved.payload.value.pool), [2]);

  const chat = dispatched.find(entry => entry.action === 'ADD_CHAT_MESSAGE');
  // 残りはプールだけでなく全部の数（スキルの上から消してもちゃんと減って見える）
  assert.equal(chat.payload.entry.resultText, '4の目 ×1 を廃棄（残り 1個）');
});

test('poolDiceIdsByFace は先頭から取り、そろわなければ1つも返さない', () => {
  const first = die(3);
  const second = die(3);
  const draft = { pool: [first, die(5), second], placements: {} };

  assert.deepEqual(poolDiceIdsByFace(draft, 3, 2), { ids: [first.id, second.id], available: 2 });
  assert.deepEqual(poolDiceIdsByFace(draft, 3, 1), { ids: [first.id], available: 2 });
  assert.deepEqual(poolDiceIdsByFace(draft, 3, 3), { ids: null, available: 2 });
  assert.deepEqual(poolDiceIdsByFace(draft, 4, 1), { ids: null, available: 0 });
});
