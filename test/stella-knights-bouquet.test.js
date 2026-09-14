// test/stella-knights-bouquet.test.js
// 銀剣のステラナイツの「アタックダイス補正(DB)」と「ダイス追加(n)」を固定するテスト。
//
// ダイス追加は「打ったコマがブーケを払い、DBのバフは（名前を書けば）別のコマへ付く」という
// 2体にまたがる操作なので、払う側と受け取る側を取り違えても、どちらかの値だけ見る確認では
// 気付けない。本物のストアに流して、両方のコマとログをまとめて見る。
//
// 断る経路は「状態を1つも変えない」ことが要（ブーケだけ減ってバフが付かない、を起こさない）。
// そちらは dispatch の呼び出しそのものを数える。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState, getEffectiveParameterValue } from '../js/game-store.js';
import {
  STELLA_KNIGHTS_PLUGIN, buildStellaKnightsCharacterParameters
} from '../js/parameters/stella-knights.js';

const DB = 'STELLA_KNIGHTS:DB';
const BOUQUET = 'STELLA_KNIGHTS:bouquet';
const TYPE = 'STELLA_KNIGHTS:charType';

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

  const addToken = (id, name, { bouquet = 0, type = 'ブリンガー' } = {}) => {
    store.dispatch('ADD_CHARACTER', { id, name, parameterOverrides: { [BOUQUET]: bouquet, [TYPE]: type } });
  };

  // チャット欄から打ったのと同じ材料を渡す（js/main.jsのtryHandlePluginChatCommand）
  const send = (input, tokenId) => STELLA_KNIGHTS_PLUGIN.handleChatCommand(input, {
    token: store.state.tokens[tokenId] ?? null,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue,
    generateBuffId: () => `buff-${++buffSeq}`,
    findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null,
    roomParameters: store.state.room.parameters
  });

  const mainLog = () => store.state.chatLogs.main ?? [];

  return { store, addToken, send, mainLog };
}

// --- パラメータの宣言 ---

test('アタックダイス補正(DB)は locked / 手入力できない / 一覧に出さない / キーはDB', () => {
  const db = buildStellaKnightsCharacterParameters()[DB];
  assert.ok(db, 'DBのパラメータが無い');
  assert.equal(db.label, 'アタックダイス補正(DB)');
  // ラベルに「(」を含むので、バフ()コマンドからはキー名で指定する（js/main.jsのtryHandleBuffCommand）
  assert.equal(db.key, 'DB');
  assert.equal(db.value, 0);
  // lockedでないと、既存のコマへ後から補完されない（registry.jsのwithMissingPluginParameters）
  assert.equal(db.locked, true);
  assert.equal(db.editable, false);
  assert.equal(db.visible, false);
});

// --- ダイス追加 ---

test('ダイス追加(2)：打ったコマのブーケを8払い、自分のDBへ +2（判定終了で消滅）', () => {
  const { store, addToken, send, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 10 });
  const logBefore = mainLog().length;

  assert.equal(send('ダイス追加(2)', 'b1'), true);

  const token = store.state.tokens.b1;
  assert.equal(token.parameters[BOUQUET].value, 2);
  assert.equal(token.buffs.length, 1);
  assert.deepEqual(
    { name: token.buffs[0].name, paramId: token.buffs[0].paramId, delta: token.buffs[0].delta, expirePhase: token.buffs[0].expirePhase },
    { name: 'ダイス追加', paramId: DB, delta: 2, expirePhase: 'check' }
  );
  assert.equal(getEffectiveParameterValue(token, DB), 2);
  // ログは1行だけ（2行進むと直前の結果が流れる）
  assert.equal(mainLog().length, logBefore + 1);
  assert.match(mainLog().at(-1).resultText, /ブリンガー君のアタックダイス補正\(DB\) \+2/);
  assert.match(mainLog().at(-1).resultText, /ブーケ -8（10 → 2）/);
});

test('ダイス追加(1>コマ名)：払うのは打ったコマ、バフは名前のコマへ（全角の＞も受ける）', () => {
  const { store, addToken, send } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 20 });
  addToken('n1', '敵NPC', { bouquet: 0, type: 'NPC' });

  assert.equal(send('ダイス追加(1>敵NPC)', 'b1'), true);
  assert.equal(send('ダイス追加( 2 ＞ 敵NPC )', 'b1'), true);

  assert.equal(store.state.tokens.b1.parameters[BOUQUET].value, 20 - 4 - 8, '払うのは打ったコマ');
  assert.equal(store.state.tokens.b1.buffs.length, 0, '打ったコマにはバフが付かない');
  assert.equal(store.state.tokens.n1.parameters[BOUQUET].value, 0, '受け取る側は払わない');
  assert.equal(getEffectiveParameterValue(store.state.tokens.n1, DB), 3);
});

test('断る経路は状態を1つも変えない（名前違い・シース宛て・ブーケ不足・個数外）', () => {
  const { store, addToken } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 5 });
  addToken('s1', 'シースちゃん', { type: 'シース' });

  const cases = [
    ['ダイス追加(1>いないコマ)', /見つかりません/],
    ['ダイス追加(1>シースちゃん)', /シース/],
    ['ダイス追加(2)', /ブーケが足りません/], // 必要8 / 現在5
    ['ダイス追加(0)', /1〜3/],
    ['ダイス追加(4)', /1〜3/]
  ];

  for (const [input, expected] of cases) {
    const dispatched = [];
    let handled;
    const alerts = captureAlerts(() => {
      handled = STELLA_KNIGHTS_PLUGIN.handleChatCommand(input, {
        token: store.state.tokens.b1,
        dispatch: (action, payload) => dispatched.push({ action, payload }),
        generateBuffId: () => 'x',
        findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null
      });
    });
    assert.equal(handled, true, `${input}: 書式が合ったのに素通しした`);
    assert.equal(alerts.length, 1, `${input}: 断りが出ていない`);
    assert.match(alerts[0], expected, `${input}: 断りの理由が違う（${alerts[0]}）`);
    assert.deepEqual(dispatched, [], `${input}: 断ったのに状態を動かした`);
  }
});

test('DBが入る前に作られたコマへも、補完してからバフを付ける', () => {
  const { store, addToken, send } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 20 });
  addToken('old', '古いコマ');

  // DBを持たない古いコマを作る（保存済みの部屋を読み込んだ状態を真似る）
  const { [DB]: _removed, ...withoutDb } = store.state.tokens.old.parameters;
  store.hydrate({
    ...store.state,
    tokens: { ...store.state.tokens, old: { ...store.state.tokens.old, parameters: withoutDb } }
  });
  assert.equal(store.state.tokens.old.parameters[DB], undefined);

  send('ダイス追加(3>古いコマ)', 'b1');

  assert.ok(store.state.tokens.old.parameters[DB], 'DBが補完されていない');
  assert.equal(getEffectiveParameterValue(store.state.tokens.old, DB), 3);
});

test('リロールは今までどおりブーケを5払うだけ', () => {
  const { store, addToken, send } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 7 });

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(store.state.tokens.b1.parameters[BOUQUET].value, 2);
  assert.equal(store.state.tokens.b1.buffs.length, 0);
});

test('他システムの部屋での案内にも、名前付きの形を自分のコマンドと見なす', () => {
  assert.equal(STELLA_KNIGHTS_PLUGIN.looksLikeOwnChatCommand('ダイス追加(2>ブリンガー君)'), true);
  assert.equal(STELLA_KNIGHTS_PLUGIN.looksLikeOwnChatCommand('ダイス追加(2)'), true);
});
