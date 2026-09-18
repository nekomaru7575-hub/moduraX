// test/stella-knights-auto-dice-add.test.js
// 銀剣のステラナイツの「常にダイス追加+3」（コマごとのチェックボックス）を固定するテスト。
//
// 手で打つ「ダイス追加(n)」は test/stella-knights-bouquet.test.js が受け持つ。こちらは
// 「判定を1回振った」ことに反応して勝手に動く経路で、間違えたときの壊れ方が違う——
// 黙って払いすぎる・振っていないのに払う・返しすぎる、はどれも後から気付けない。
// だから本物のストアに流して、ブーケとバフとログをまとめて見る。
//
// 【Coreの配線はここでは見られない】チャット欄から判定を振ったときに
// applyCheckRoll が呼ばれること自体は js/main.js の DICE_ROLL_REQUESTED ハンドラの配線で、
// あちらはDOMを触るのでNodeから読めない。ここが固定するのは「呼ばれたら何をするか」まで。
// 配線（呼ぶ位置がEXPIRE_BUFFSより前で、BCDiceが受理した判定だけ）は手で確かめること。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, getEffectiveParameterValue } from '../js/game-store.js';
import { applyPluginCheckRoll } from '../js/parameters/registry.js';
import {
  STELLA_KNIGHTS_PLUGIN, buildStellaKnightsCharacterParameters
} from '../js/parameters/stella-knights.js';

const DB = 'STELLA_KNIGHTS:DB';
const BOUQUET = 'STELLA_KNIGHTS:bouquet';
const TYPE = 'STELLA_KNIGHTS:charType';
const AUTO = 'STELLA_KNIGHTS:autoDiceAdd';
const REFUND_KEY = 'stellaKnightsAutoDiceAdd';

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

function newRoom() {
  const store = new ImmutableStore(createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }));
  let buffSeq = 0;

  const addToken = (id, name, { bouquet = 0, type = 'ブリンガー', auto = 1 } = {}) => {
    store.dispatch('ADD_CHARACTER', {
      id, name, parameterOverrides: { [BOUQUET]: bouquet, [TYPE]: type, [AUTO]: auto }
    });
  };

  // Coreが判定の成立を知らせてきたのと同じ材料を渡す（js/main.jsのDICE_ROLL_REQUESTED）。
  // registry越しに呼ぶのは、記述子への登録と1行の丸めも一緒に固定するため
  const roll = (command, tokenId) => applyPluginCheckRoll('STELLA_KNIGHTS', {
    command,
    token: store.state.tokens[tokenId] ?? null,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue,
    generateBuffId: () => `buff-${++buffSeq}`,
    findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null,
    roomParameters: store.state.room.parameters
  });

  const send = (input, tokenId) => STELLA_KNIGHTS_PLUGIN.handleChatCommand(input, {
    token: store.state.tokens[tokenId] ?? null,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue,
    generateBuffId: () => `buff-${++buffSeq}`,
    findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null,
    roomParameters: store.state.room.parameters
  });

  // 判定の後にCoreが撃つ「判定終了で消滅」バフの剥がし（js/main.jsのEXPIRE_BUFFS）。
  // 実際の流れでは毎回これが走るので、判定を続けて2回試すときは間に挟む
  const expire = (tokenId) => store.dispatch('EXPIRE_BUFFS', { phase: 'check', tokenId });

  const token = (id) => store.state.tokens[id];
  const bouquet = (id) => token(id).parameters[BOUQUET].value;
  const refund = (id) => token(id).components?.[REFUND_KEY]?.cost ?? null;
  const mainLog = () => store.state.chatLogs.main ?? [];

  return { store, addToken, roll, send, expire, token, bouquet, refund, mainLog };
}

// --- パラメータの宣言 ---

test('常にダイス追加+3 は locked / 手で書き換えられる / 一覧に出さない / 既定は0', () => {
  const auto = buildStellaKnightsCharacterParameters()[AUTO];
  assert.ok(auto, 'autoDiceAddのパラメータが無い');
  assert.equal(auto.label, '常にダイス追加+3');
  // 既定0＝今までのコマの動きが変わらない
  assert.equal(auto.value, 0);
  // lockedでないと既存のコマへ補完されない。editable:falseだとSET_PARAMETERに弾かれて
  // チェックボックスから書けない（js/store/params.jsのwithEditableParamFields）
  assert.equal(auto.locked, true);
  assert.equal(auto.editable, true);
  assert.equal(auto.visible, false);
});

// --- 発動する／しない ---

test('ONのコマがnSKを振ると、ブーケ-12とDB+3のバフが1つ付き、1行が返る', () => {
  const { addToken, roll, token, bouquet, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });
  const logBefore = mainLog().length;

  const note = roll('8SK4', 'b1');

  assert.equal(bouquet('b1'), 18);
  // ダイス追加(1)を3回ではなく1回（バフが1本であることで固定する）
  assert.equal(token('b1').buffs.length, 1);
  assert.deepEqual(
    {
      name: token('b1').buffs[0].name, paramId: token('b1').buffs[0].paramId,
      delta: token('b1').buffs[0].delta, expirePhase: token('b1').buffs[0].expirePhase
    },
    { name: 'ダイス追加', paramId: DB, delta: 3, expirePhase: 'check' }
  );
  assert.equal(getEffectiveParameterValue(token('b1'), DB), 3);

  // 知らせは判定のログ本文へ添える1行。Mainの件数は増やさない
  assert.equal(mainLog().length, logBefore, '独立したシステム発言を増やしている');
  assert.match(note, /常にダイス追加\+3/);
  assert.match(note, /ブーケ -12（30 → 18）/);
  // 「＞」を含めない（最後の＞の後ろを最終値として読む処理がある。js/main.jsのparseFinalDiceNumber）
  assert.ok(!note.includes('＞'), '添える1行に全角の＞が入っている');
});

test('OFFのコマは何も起きない', () => {
  const { addToken, roll, token, bouquet, refund } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, auto: 0 });

  assert.equal(roll('8SK4', 'b1'), '');
  assert.equal(bouquet('b1'), 30);
  assert.equal(token('b1').buffs.length, 0);
  assert.equal(refund('b1'), null);
});

test('発動するのはnSKの形だけ（他の式・秘匿ダイスでは動かない）', () => {
  const { addToken, roll, expire, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 100 });

  // 個数は式でもよい（始まりの部屋と同じ解釈）。判定のたびにバフは剥がれるので、
  // 続けて振るときはCoreと同じ順で間に挟む
  assert.match(roll('(5+3)/2SK4', 'b1'), /ブーケ -12/);
  expire('b1');
  assert.equal(bouquet('b1'), 88);

  // 防御力を書かない形、目の変換を添えた形も判定
  assert.match(roll('8SK', 'b1'), /ブーケ -12/);
  expire('b1');
  assert.match(roll('8SK4,1>6', 'b1'), /ブーケ -12/);
  expire('b1');
  assert.equal(bouquet('b1'), 88 - 12 - 12);

  const before = bouquet('b1');
  // 判定ではない式・頭にSを付けた秘匿ダイスでは動かない
  // （秘匿は始まりの部屋も乗らないので、そちらと挙動を揃えている）
  for (const command of ['2D6', 'charge', '8SK44', 'S8SK4', 'こんにちは']) {
    assert.equal(roll(command, 'b1'), '', `${command}: 判定と見なしている`);
  }
  assert.equal(bouquet('b1'), before);
});

test('シースのコマでは動かない', () => {
  const { addToken, roll, bouquet } = newRoom();
  addToken('s1', 'シースちゃん', { bouquet: 30, type: 'シース' });

  assert.equal(roll('8SK4', 's1'), '');
  assert.equal(bouquet('s1'), 30);
});

// --- 手のダイス追加との関係 ---

test('チェックが入っているコマへは、ダイス追加のコマンドが通らない', () => {
  const { addToken, send, token, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });

  let handled;
  const alerts = captureAlerts(() => { handled = send('ダイス追加(2)', 'b1'); });

  // 書式は合っているので true（falseを返すとCoreがただのダイス式として再解釈してしまう）
  assert.equal(handled, true);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /常にダイス追加\+3/);
  // 状態は1つも動かさない
  assert.equal(bouquet('b1'), 30);
  assert.equal(token('b1').buffs.length, 0);
});

test('断るのは受け取る側で見る（自分がONでも、OFFの相手へは払ってやれる）', () => {
  const { addToken, send, token, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });          // ON（払う側）
  addToken('b2', '味方', { bouquet: 0, auto: 0 });          // OFF（受け取る側）
  addToken('b3', '仲間', { bouquet: 0 });                   // ON（受け取る側）

  // OFFの相手へは通る。払うのは打ったコマ
  assert.equal(send('ダイス追加(2>味方)', 'b1'), true);
  assert.equal(bouquet('b1'), 22);
  assert.equal(getEffectiveParameterValue(token('b2'), DB), 2);

  // ONの相手へは断る（その相手は判定のたびに3個入るので、上から足すと上限を超える）
  const alerts = captureAlerts(() => { send('ダイス追加(2>仲間)', 'b1'); });
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /仲間/);
  assert.equal(bouquet('b1'), 22, '断ったのにブーケが減っている');
  assert.equal(token('b3').buffs.length, 0);
});

test('ダイス追加以外でDBに修正が乗っていても、自動は普通に発動する', () => {
  const { store, addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });
  // DBはダイス追加以外でも動く（バフ()コマンド、卓の裁定）。それで自動が止まっては困る
  store.dispatch('ADD_BUFF', {
    tokenId: 'b1', id: 'manual-1', name: '加護', paramId: DB, delta: 1, expirePhase: 'check'
  });
  store.dispatch('ADD_BUFF', {
    tokenId: 'b1', id: 'debuff-1', name: '呪い', paramId: DB, delta: -2, expirePhase: 'round'
  });

  assert.match(roll('8SK4', 'b1'), /ブーケ -12/);
  assert.equal(bouquet('b1'), 18);
  assert.equal(getEffectiveParameterValue(store.state.tokens.b1, DB), 1 - 2 + 3);
});

// --- ブーケが足りないとき ---

test('ブーケ11で判定：alertを出さず、払わず、足りない旨を1行で返す', () => {
  const { addToken, roll, token, bouquet, refund } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 11 });

  let note = '';
  const alerts = captureAlerts(() => { note = roll('8SK4', 'b1'); });

  // 判定はもう振れているので、ダイアログで止めてはいけない
  assert.deepEqual(alerts, []);
  assert.equal(bouquet('b1'), 11);
  assert.equal(token('b1').buffs.length, 0);
  assert.equal(refund('b1'), null, '払っていないのに返す控えを残している');
  assert.match(note, /ブーケが足りません（必要 12 \/ 現在 11）/);
});

// --- リロールの払い戻し ---

test('リロール：直前の自動発動ぶんを返し、控えを消す（二度は返さない）', () => {
  const { addToken, roll, send, bouquet, refund, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });

  roll('8SK4', 'b1');
  assert.equal(bouquet('b1'), 18);
  assert.equal(refund('b1'), 12);

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 18 - 5 + 12);
  assert.equal(refund('b1'), null, '控えが残っている');
  assert.match(mainLog().at(-1).resultText, /自動のダイス追加を取り消し: ブーケ \+12/);

  // 続けてもう一度打っても、返るのは無い
  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 25 - 5);
});

test('自動発動していなければ、リロールは今までどおり5を払うだけ', () => {
  const { addToken, send, bouquet, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, auto: 0 });

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 25);
  assert.equal(mainLog().at(-1).resultText, 'リロール\nブーケ -5（30 → 25）');
});

test('控えがあれば、残高が5未満でもリロールできる', () => {
  const { addToken, roll, send, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 14 });

  roll('8SK4', 'b1');
  assert.equal(bouquet('b1'), 2);

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 2 - 5 + 12);
});

test('返すのは「直前の判定」だけ（発動しなかった判定を挟めば控えは消える）', () => {
  const { addToken, roll, send, expire, bouquet, refund } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 20 });

  roll('8SK4', 'b1');           // 12払い、控えが残る
  expire('b1');                 // Coreが判定の後に撃つバフの剥がし
  assert.equal(bouquet('b1'), 8);
  assert.equal(refund('b1'), 12);

  // 残り8では払えない判定をもう1回。ここで前の控えを持ち越さない
  assert.match(roll('8SK4', 'b1'), /ブーケが足りません/);
  assert.equal(refund('b1'), null, '払えなかったのに控えが残っている');

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 3, 'ずっと前の判定のぶんを返している');
});

test('壊れた控え（取り込んだJSON）でも、返すのは正の整数だけ', () => {
  const { store, addToken, send, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30 });

  for (const value of [{ cost: -100 }, { cost: 'たくさん' }, { cost: 1.5 }, {}, 'こわれ']) {
    store.dispatch('SET_COMPONENT', { id: 'b1', componentKey: REFUND_KEY, value });
    const before = bouquet('b1');
    assert.equal(send('リロール', 'b1'), true);
    // 1.5 は切り捨てて1。それ以外は0扱い
    const expected = value?.cost === 1.5 ? before - 5 + 1 : before - 5;
    assert.equal(bouquet('b1'), expected, `${JSON.stringify(value)}: 返す額がおかしい`);
  }
});

// --- Coreの口そのもの ---

test('applyPluginCheckRoll：宣言していないプラグイン・知らないIDでは空文字', () => {
  assert.equal(applyPluginCheckRoll('DX3', { command: '8SK4', token: null }), '');
  assert.equal(applyPluginCheckRoll('KNOWN_NOTHING', { command: '8SK4', token: null }), '');
  assert.equal(applyPluginCheckRoll(null, { command: '8SK4', token: null }), '');
});
