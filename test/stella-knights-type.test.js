// test/stella-knights-type.test.js
// 銀剣のステラナイツの「種別（ブリンガー／シース／NPC）ごとに何を持つか」を固定するテスト。
//
// 違いは1つの表（STELLA_KNIGHTS_TYPE_RULES）にまとめてあるが、その表を読む先は
// 更新画面・キャラクター一覧・チャットコマンド・ダイスドラフトのパネルに散っている。
// どれか1つの読み方だけずれても画面はそれらしく動いてしまうので、宣言と判定の関数をここで止める。
//
// stella-knights.js はトップレベルで DOM に触らないので node --test でそのまま読める。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STELLA_KNIGHTS_CHAR_TYPES,
  STELLA_KNIGHTS_PLUGIN,
  STELLA_KNIGHTS_TYPE_RULES,
  buildStellaKnightsCharacterParameters,
  buildStellaKnightsTypeOverrides,
  canViewStellaKnightsSkills,
  readStellaKnightsCharType,
  stellaKnightsDraftUnavailableReason
} from '../js/parameters/stella-knights.js';
import {
  canViewDiceDraftSkillDetails, diceDraftUnavailableReason
} from '../js/parameters/dice-draft/dice-draft-model.js';
import { handleDiceDraftPoolCommand } from '../js/parameters/dice-draft/dice-draft-pool.js';
import { canViewOwnerOnly } from '../js/visibility.js';

const TYPE = 'STELLA_KNIGHTS:charType';
const DEFENSE = 'STELLA_KNIGHTS:defense';
const CHARGE = 'STELLA_KNIGHTS:charge';
const BOUQUET = 'STELLA_KNIGHTS:bouquet';
const HP = 'core:hp';

const tokenOf = (charType, ownerId = null) => ({
  id: 't1', name: 'テスト', ownerId, components: {},
  parameters: charType === undefined ? {} : { [TYPE]: { value: charType } }
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

// --- 種別そのもの ---

test('選べる種別は3つで、値は画面の文字と同じ', () => {
  assert.deepEqual(STELLA_KNIGHTS_CHAR_TYPES.map(type => type.value), ['ブリンガー', 'シース', 'NPC']);
  assert.deepEqual(Object.keys(STELLA_KNIGHTS_TYPE_RULES).sort(),
    STELLA_KNIGHTS_CHAR_TYPES.map(type => type.value).sort());
});

test('知らない種別・未設定はブリンガーへ落ちる（種別が入る前のコマ）', () => {
  assert.equal(readStellaKnightsCharType({ [TYPE]: { value: 'NPC' } }), 'NPC');
  assert.equal(readStellaKnightsCharType({ [TYPE]: { value: 'エネミー' } }), 'ブリンガー');
  assert.equal(readStellaKnightsCharType({ [TYPE]: { value: '__proto__' } }), 'ブリンガー');
  assert.equal(readStellaKnightsCharType({}), 'ブリンガー');
  assert.equal(readStellaKnightsCharType(null), 'ブリンガー');
});

test('種別のパラメータは locked / 手入力できる / 一覧に出さない / 既定ブリンガー', () => {
  const type = buildStellaKnightsCharacterParameters()[TYPE];
  assert.ok(type, '種別のパラメータが無い');
  // lockedでないと、既存のコマへ後から補完されない（registry.jsのwithMissingPluginParameters）
  assert.equal(type.locked, true);
  // editable:falseだと、プルダウンで選び直してもSET_PARAMETERに弾かれて保存されない
  assert.notEqual(type.editable, false);
  assert.equal(type.visible, false);
  assert.equal(type.value, 'ブリンガー');
});

// --- 表どうしの食い違い ---

test('ブリンガーは種別が入る前の宣言どおり（既存のコマの見え方が変わらない）', () => {
  const parameters = buildStellaKnightsCharacterParameters();
  const bringer = STELLA_KNIGHTS_TYPE_RULES['ブリンガー'];

  // 一覧に出すものは、パラメータの宣言時のvisibleと一致していること
  const declaredVisible = [DEFENSE, CHARGE, BOUQUET].filter(id => parameters[id].visible !== false);
  assert.deepEqual([...bringer.visibleParamIds].sort(), declaredVisible.sort());
  assert.deepEqual(bringer.inputParamIds, [DEFENSE, CHARGE, BOUQUET]);
  assert.equal(bringer.skills, true);
  assert.equal(bringer.dice, true);
  assert.equal(bringer.characterVisible, true);
  assert.equal(bringer.hidesEndurance, false);
  assert.equal(bringer.hidesSkills, false);
});

test('どの種別でも「一覧に出るのに入力欄が無い」パラメータは無い', () => {
  for (const [type, rule] of Object.entries(STELLA_KNIGHTS_TYPE_RULES)) {
    const orphans = rule.visibleParamIds.filter(id => !rule.inputParamIds.includes(id));
    assert.deepEqual(orphans, [], `${type}: 入力欄の無いパラメータが一覧に出る`);
  }
});

test('ダイスを使えない種別はスキルも持たず、スキルを伏せる種別はスキルを持つ', () => {
  for (const [type, rule] of Object.entries(STELLA_KNIGHTS_TYPE_RULES)) {
    if (!rule.dice) assert.equal(rule.skills, false, `${type}: ダイスが無いのにスキルがある`);
    if (rule.hidesSkills) assert.equal(rule.skills, true, `${type}: 無いスキルを伏せている`);
  }
});

test('シースは独自の能力を持たず、キャラクター一覧にも既定で出ない', () => {
  const sheath = STELLA_KNIGHTS_TYPE_RULES['シース'];
  assert.deepEqual(sheath.visibleParamIds, []);
  assert.deepEqual(sheath.inputParamIds, []);
  assert.equal(sheath.skills, false);
  assert.equal(sheath.dice, false);
  assert.equal(sheath.characterVisible, false);
});

test('NPCはブリンガーと同じ機能で、ブーケを一覧に出さず、耐久力とスキルを伏せる', () => {
  const npc = STELLA_KNIGHTS_TYPE_RULES.NPC;
  const bringer = STELLA_KNIGHTS_TYPE_RULES['ブリンガー'];
  assert.deepEqual(npc.inputParamIds, bringer.inputParamIds);
  assert.equal(npc.skills, true);
  assert.equal(npc.dice, true);
  assert.equal(npc.visibleParamIds.includes(BOUQUET), false);
  assert.equal(npc.visibleParamIds.includes(DEFENSE), true);
  assert.equal(npc.hidesEndurance, true);
  assert.equal(npc.hidesSkills, true);
});

// --- 切り替えたときの見え方 ---

test('種別を切り替えたときの見え方：NPCは耐久力を持ち主だけに、ブリンガーへ戻すと全員に', () => {
  assert.deepEqual(buildStellaKnightsTypeOverrides('NPC', 'gm'), {
    visible: true,
    parameterVisibility: { [DEFENSE]: true, [BOUQUET]: false },
    parameterAudience: { [HP]: ['gm'] }
  });
  // 持ち主のいないコマは誰でも触れる規則なので、伏せても全員に見える（＝伏せない）
  assert.deepEqual(buildStellaKnightsTypeOverrides('NPC', null).parameterAudience, { [HP]: null });

  assert.deepEqual(buildStellaKnightsTypeOverrides('シース', 'pl'), {
    visible: false,
    parameterVisibility: { [DEFENSE]: false, [BOUQUET]: false },
    parameterAudience: { [HP]: null }
  });
  assert.deepEqual(buildStellaKnightsTypeOverrides('ブリンガー', 'pl'), {
    visible: true,
    parameterVisibility: { [DEFENSE]: true, [BOUQUET]: true },
    parameterAudience: { [HP]: null }
  });
});

// --- 持ち主だけに見せる判定 ---

test('canViewOwnerOnly：持ち主なしは全員、持ち主ありは本人だけ（ゲストは見えない）', () => {
  assert.equal(canViewOwnerOnly({ ownerId: null }, 'pl'), true);
  assert.equal(canViewOwnerOnly({ ownerId: null }, null), true);
  assert.equal(canViewOwnerOnly({ ownerId: 'gm' }, 'gm'), true);
  assert.equal(canViewOwnerOnly({ ownerId: 'gm' }, 'pl'), false);
  assert.equal(canViewOwnerOnly({ ownerId: 'gm' }, null), false);
});

test('スキルの中身：NPCは持ち主だけ、ブリンガーは誰でも', () => {
  assert.equal(canViewStellaKnightsSkills(tokenOf('NPC', 'gm'), 'gm'), true);
  assert.equal(canViewStellaKnightsSkills(tokenOf('NPC', 'gm'), 'pl'), false);
  assert.equal(canViewStellaKnightsSkills(tokenOf('NPC', null), 'pl'), true);
  assert.equal(canViewStellaKnightsSkills(tokenOf('ブリンガー', 'gm'), 'pl'), true);
  assert.equal(canViewStellaKnightsSkills(tokenOf(undefined, 'gm'), 'pl'), true, '種別が入る前のコマ');

  // パネルが見るのはダイスドラフトの宣言経由。宣言が繋がっていること
  const spec = STELLA_KNIGHTS_PLUGIN.diceDraft;
  assert.equal(canViewDiceDraftSkillDetails(spec, tokenOf('NPC', 'gm'), 'pl'), false);
  assert.equal(canViewDiceDraftSkillDetails(spec, tokenOf('NPC', 'gm'), 'gm'), true);
});

// --- シースは能力を使えない ---

test('ダイスドラフトを使えないのはシースだけ', () => {
  assert.equal(typeof stellaKnightsDraftUnavailableReason(tokenOf('シース')), 'string');
  assert.equal(stellaKnightsDraftUnavailableReason(tokenOf('ブリンガー')), null);
  assert.equal(stellaKnightsDraftUnavailableReason(tokenOf('NPC')), null);

  const spec = STELLA_KNIGHTS_PLUGIN.diceDraft;
  assert.equal(typeof diceDraftUnavailableReason(spec, tokenOf('シース')), 'string');
  assert.equal(diceDraftUnavailableReason(spec, tokenOf('ブリンガー')), null);
  // 宣言を持たない仕様（ドラクルージュ等）は誰でも使える
  assert.equal(diceDraftUnavailableReason({}, tokenOf('シース')), null);
});

test('シースのコマでこのシステムのコマンドを打つと、書式が合えば断って何も動かさない', () => {
  const dispatched = [];
  const context = {
    token: tokenOf('シース'),
    dispatch: (action, payload) => dispatched.push({ action, payload }),
    rollBCDice: () => { throw new Error('振ってはいけない'); },
    getEffectiveParameterValue: () => 0,
    roomParameters: {}
  };

  for (const input of ['charge(3)', 'charge', 'プチラッキー(1>2)', 'ダイス追加(2)', 'リロール']) {
    let handled;
    const alerts = captureAlerts(() => {
      handled = STELLA_KNIGHTS_PLUGIN.handleChatCommand(input, context);
    });
    assert.equal(handled, true, `${input}: 書式が合ったのに素通しした`);
    assert.equal(alerts.length, 1, `${input}: 断りが出ていない`);
  }
  assert.deepEqual(dispatched, []);

  // 書式が合わない発言は横取りしない
  assert.equal(STELLA_KNIGHTS_PLUGIN.handleChatCommand('こんにちは', context), false);
});

test('シースのコマは dice.add / dice.change も断る（Core共通のコマンド）', () => {
  const dispatched = [];
  const context = {
    spec: STELLA_KNIGHTS_PLUGIN.diceDraft,
    token: tokenOf('シース'),
    dispatch: (action, payload) => dispatched.push({ action, payload })
  };

  for (const input of ['dice.add(3)', 'dice.change(1>2)']) {
    let handled;
    const alerts = captureAlerts(() => { handled = handleDiceDraftPoolCommand(input, context); });
    assert.equal(handled, true, `${input}: 書式が合ったのに素通しした`);
    assert.equal(alerts.length, 1, `${input}: 断りが出ていない`);
  }
  assert.deepEqual(dispatched, []);
});
