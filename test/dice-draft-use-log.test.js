// test/dice-draft-use-log.test.js
// ダイスドラフトの発動（js/parameters/dice-draft/dice-draft-use.js の runDiceDraftUse）が出す
// チャットログの2行目が、「実際に使った分」を書いていること。
//
// 以前は乗っているダイス全部の説明（evaluatePlacement の description）をそのまま出していたため、
// 3の目を3個乗せて「1回」を押すと、ダイスは1個しか減らないのに「×3 → 3回使用」と書いていた。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runDiceDraftUse } from '../js/parameters/dice-draft/dice-draft-use.js';
import { DICE_DRAFT_COMPONENT_KEY } from '../js/parameters/dice-draft/dice-draft-roll.js';
import { STELLA_KNIGHTS_PLUGIN } from '../js/parameters/stella-knights.js';

const spec = STELLA_KNIGHTS_PLUGIN.diceDraft;
const SKILL_KEY = spec.skillSpec.componentKey;
const SKILL_NAME = '３の目';

const die = (value, i) => ({ id: `d${i}`, sides: 6, value });

// dispatch を受けてコマを書き換え、チャットの発言を控えるだけの小さな置き場
function setup({ diceCount = 3, scenarioMax = null } = {}) {
  let token = {
    id: 't1',
    name: 'ブリンガー',
    components: {
      [SKILL_KEY]: [{
        name: SKILL_NAME,
        fields: { type: '', timing: '', number: '3' },
        limits: { counts: { scenario: { current: 0, max: scenarioMax } } }
      }],
      [DICE_DRAFT_COMPONENT_KEY]: {
        pool: [],
        placements: { [SKILL_NAME]: Array.from({ length: diceCount }, (_, i) => die(3, i)) }
      }
    },
    buffs: []
  };
  const chats = [];
  const dispatch = (action, payload) => {
    if (action === 'ADD_CHAT_MESSAGE') chats.push(payload.entry.resultText);
    if (action === 'SET_COMPONENT') {
      token = { ...token, components: { ...token.components, [payload.componentKey]: payload.value } };
    }
  };
  const use = (mode) => runDiceDraftUse({
    spec, skillName: SKILL_NAME, mode, token, dispatch,
    getToken: () => token,
    generateBuffId: () => 'b1',
    notify: (message) => assert.fail(`使えないはずがない: ${message}`)
  });
  const remaining = () => token.components[DICE_DRAFT_COMPONENT_KEY].placements[SKILL_NAME]?.length ?? 0;
  return { use, chats, remaining };
}

test('「1回」は1回ぶんのダイスだけを書く', () => {
  const { use, chats, remaining } = setup({ diceCount: 3 });
  assert.deepEqual(use('one'), { used: 1, diceSpent: 1 });
  assert.equal(remaining(), 2);
  assert.equal(chats.length, 1);
  assert.equal(chats[0], `スキル使用: ${SKILL_NAME}\n3の目 ×1 → 1回使用`);
});

test('「全部」は乗っているダイス全部を書く', () => {
  const { use, chats, remaining } = setup({ diceCount: 3 });
  assert.deepEqual(use('all'), { used: 3, diceSpent: 3 });
  assert.equal(remaining(), 0);
  assert.equal(chats[0], `スキル使用: ${SKILL_NAME}×3\n3の目 ×3 → 3回使用`);
});

test('使用上限で途中までしか通らなければ、通った回数だけを書く', () => {
  const originalAlert = globalThis.alert;
  globalThis.alert = () => {};
  try {
    const { use, chats, remaining } = setup({ diceCount: 3, scenarioMax: '2' });
    assert.deepEqual(use('all'), { used: 2, diceSpent: 2 });
    assert.equal(remaining(), 1);
    assert.equal(chats[0], `スキル使用: ${SKILL_NAME}×2\n3の目 ×2 → 2回使用`);
  } finally {
    globalThis.alert = originalAlert;
  }
});
