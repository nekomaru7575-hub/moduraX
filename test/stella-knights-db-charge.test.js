// test/stella-knights-db-charge.test.js
// 銀剣のステラナイツの「アタックダイス補正(DB)ぶんの後払い」を固定するテスト。
//
// DBは手で入れる値（0〜3）で、nSKのアタック判定を1回振るたびに「入っている数×4」の
// ブーケが自動で引かれる。手で打つ「ダイス追加(n)」は
// test/stella-knights-bouquet.test.js が受け持ち、こちらは勝手に動く後払いのほう。
// 黙って払いすぎる・振っていないのに払う・返しすぎる、はどれも後から気付けないので、
// 本物のストアに流してブーケと控えとログをまとめて見る。
//
// 【Coreの配線はここでは見られない】判定のたびに applyCheckRoll が呼ばれること自体は
// js/main.js の DICE_ROLL_REQUESTED ハンドラの配線で、あちらはDOMを触るのでNodeから
// 読めない。ここが固定するのは「呼ばれたら何をするか」まで。
// 配線（BCDiceが受理した判定の後で呼ぶこと）は手で確かめること。

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

  const addToken = (id, name, { bouquet = 0, type = 'ブリンガー', db = 3 } = {}) => {
    store.dispatch('ADD_CHARACTER', {
      id, name, parameterOverrides: { [BOUQUET]: bouquet, [TYPE]: type, [DB]: db }
    });
  };

  const context = (tokenId) => ({
    token: store.state.tokens[tokenId] ?? null,
    dispatch: store.dispatch.bind(store),
    getEffectiveParameterValue,
    generateBuffId: () => `buff-${++buffSeq}`,
    findTokenByName: (name) => Object.values(store.state.tokens).find(t => t.name === name) ?? null,
    roomParameters: store.state.room.parameters
  });

  // Coreが判定の成立を知らせてきたのと同じ材料を渡す（js/main.jsのDICE_ROLL_REQUESTED）。
  // registry越しに呼ぶのは、記述子への登録と1行の丸めも一緒に固定するため
  const roll = (command, tokenId) => applyPluginCheckRoll('STELLA_KNIGHTS', { command, ...context(tokenId) });

  const send = (input, tokenId) => STELLA_KNIGHTS_PLUGIN.handleChatCommand(input, context(tokenId));

  const token = (id) => store.state.tokens[id];
  const bouquet = (id) => token(id).parameters[BOUQUET].value;
  const refund = (id) => token(id).components?.[REFUND_KEY]?.cost ?? null;
  const mainLog = () => store.state.chatLogs.main ?? [];

  return { store, addToken, roll, send, token, bouquet, refund, mainLog };
}

// --- パラメータの宣言 ---

test('DBは locked / 手で書き換えられる / 一覧に出さない / キーはDB / 既定は0', () => {
  const db = buildStellaKnightsCharacterParameters()[DB];
  assert.ok(db, 'DBのパラメータが無い');
  assert.equal(db.label, 'アタックダイス補正(DB)');
  // ラベルに「(」を含むので、バフ()コマンドからはキー名で指定する（js/main.jsのtryHandleBuffCommand）
  assert.equal(db.key, 'DB');
  assert.equal(db.value, 0, '既定が0でないと、作った瞬間から課金される');
  // lockedでないと、既存のコマへ後から補完されない（registry.jsのwithMissingPluginParameters）
  assert.equal(db.locked, true);
  // 手入力の値になったので、editable:false だと入力欄からの保存がガードに弾かれる
  assert.equal(db.editable, true);
  assert.equal(db.visible, false);
});

// --- 後払いが走る／走らない ---

test('DBに3が入っているコマがnSKを振ると、ブーケ-12と1行が返る（状態は他に動かない）', () => {
  const { addToken, roll, token, bouquet, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 3 });
  const logBefore = mainLog().length;

  const note = roll('8SK4', 'b1');

  assert.equal(bouquet('b1'), 18);
  // 振る値には触らない（DBは手入力のまま。バフも足さない）
  assert.equal(token('b1').parameters[DB].value, 3);
  assert.equal(token('b1').buffs.length, 0, 'バフを足している');

  // 知らせは判定のログ本文へ添える1行。Mainの件数は増やさない
  assert.equal(mainLog().length, logBefore, '独立したシステム発言を増やしている');
  assert.match(note, /3個/);
  assert.match(note, /ブーケ -12（30 → 18）/);
  // 「＞」を含めない（最後の＞の後ろを最終値として読む処理がある。js/main.jsのparseFinalDiceNumber）
  assert.ok(!note.includes('＞'), '添える1行に全角の＞が入っている');
});

test('DBの数だけ払う（1なら4、2なら8）', () => {
  const { addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ひとつ', { bouquet: 30, db: 1 });
  addToken('b2', 'ふたつ', { bouquet: 30, db: 2 });

  roll('8SK4', 'b1');
  roll('8SK4', 'b2');
  assert.equal(bouquet('b1'), 26);
  assert.equal(bouquet('b2'), 22);
});

test('DBが0なら何も起きない', () => {
  const { addToken, roll, bouquet, refund } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 0 });

  assert.equal(roll('8SK4', 'b1'), '');
  assert.equal(bouquet('b1'), 30);
  assert.equal(refund('b1'), null);
});

test('払うのはnSKの形だけ（他の式・秘匿ダイスでは動かない）', () => {
  const { addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 100, db: 3 });

  // 個数は式でもよい（始まりの部屋と同じ解釈）。振る値には触らないので、続けて呼んでよい
  assert.match(roll('(5+3)/2SK4', 'b1'), /ブーケ -12/);
  assert.match(roll('8SK', 'b1'), /ブーケ -12/);
  assert.match(roll('8SK4,1>6', 'b1'), /ブーケ -12/);
  assert.equal(bouquet('b1'), 100 - 36);

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
  addToken('s1', 'シースちゃん', { bouquet: 30, type: 'シース', db: 3 });

  assert.equal(roll('8SK4', 's1'), '');
  assert.equal(bouquet('s1'), 30);
});

test('払うのは基礎値だけ（バフ/デバフで動いたDBには課金しない）', () => {
  const { store, addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 1 });
  // DBはダイス追加以外でも動く（バフ()コマンド、卓の裁定）。そこまで取ってはいけない
  store.dispatch('ADD_BUFF', {
    tokenId: 'b1', id: 'manual-1', name: '加護', paramId: DB, delta: 2, expirePhase: 'check'
  });

  assert.match(roll('8SK4', 'b1'), /ブーケ -4/, '実効値ぶんを取っている');
  assert.equal(bouquet('b1'), 26);
  assert.equal(getEffectiveParameterValue(store.state.tokens.b1, DB), 3);
});

test('壊れた値（取り込んだJSON）でも、1回に払うのは上限まで', () => {
  const { store, addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 100, db: 0 });

  for (const [value, expected] of [[99, 12], [-5, 0], [2.7, 8]]) {
    store.dispatch('SET_PARAMETER', { characterId: 'b1', paramId: DB, value });
    const before = bouquet('b1');
    roll('8SK4', 'b1');
    assert.equal(before - bouquet('b1'), expected, `DB=${value} の払いすぎ`);
  }
});

// --- ブーケが足りないとき ---

test('残高より高くてもalertで止めず、マイナスまで引いて警告を添える', () => {
  const { addToken, roll, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 5, db: 3 });

  let note = '';
  const alerts = captureAlerts(() => { note = roll('8SK4', 'b1'); });

  // 払うと決まるのは振り終わった後なので、ダイアログで止めても引き返せない
  assert.deepEqual(alerts, []);
  assert.equal(bouquet('b1'), -7);
  assert.match(note, /ブーケ -12（5 → -7）/);
  assert.match(note, /足りていません/);
});

// --- 手のダイス追加との関係 ---

test('DBに数が入っているコマへは、ダイス追加のコマンドが通らない', () => {
  const { addToken, send, token, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 3 });

  let handled;
  const alerts = captureAlerts(() => { handled = send('ダイス追加(2)', 'b1'); });

  // 書式は合っているので true（falseを返すとCoreがただのダイス式として再解釈してしまう）
  assert.equal(handled, true);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /アタックダイス補正\(DB\)/);
  // 状態は1つも動かさない
  assert.equal(bouquet('b1'), 30);
  assert.equal(token('b1').buffs.length, 0);
});

test('断るのは受け取る側で見る（自分のDBが埋まっていても、0の相手へは払ってやれる）', () => {
  const { addToken, send, token, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 3 });   // 払う側（埋まっている）
  addToken('b2', '味方', { bouquet: 0, db: 0 });            // 受け取る側（0）
  addToken('b3', '仲間', { bouquet: 0, db: 2 });            // 受け取る側（埋まっている）

  // DBが0の相手へは通る。払うのは打ったコマ
  assert.equal(send('ダイス追加(2>味方)', 'b1'), true);
  assert.equal(bouquet('b1'), 22);
  assert.equal(getEffectiveParameterValue(token('b2'), DB), 2);

  // 埋まっている相手へは断る（その相手は判定のたびにその数ぶん引かれる）
  const alerts = captureAlerts(() => { send('ダイス追加(2>仲間)', 'b1'); });
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /仲間/);
  assert.equal(bouquet('b1'), 22, '断ったのにブーケが減っている');
  assert.equal(token('b3').buffs.length, 0);
});

// --- リロールの払い戻し ---

test('リロール：直前の判定で払ったぶんを返し、控えを消す（二度は返さない）', () => {
  const { addToken, roll, send, bouquet, refund, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 3 });

  roll('8SK4', 'b1');
  assert.equal(bouquet('b1'), 18);
  assert.equal(refund('b1'), 12);

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 18 - 5 + 12);
  assert.equal(refund('b1'), null, '控えが残っている');
  assert.match(mainLog().at(-1).resultText, /取り消し: ブーケ \+12/);

  // 続けてもう一度打っても、返るのは無い
  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 25 - 5);
});

test('DBが0なら、リロールは今までどおり5を払うだけ', () => {
  const { addToken, send, bouquet, mainLog } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 0 });

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 25);
  assert.equal(mainLog().at(-1).resultText, 'リロール\nブーケ -5（30 → 25）');
});

test('控えがあれば、残高が5未満でもリロールできる', () => {
  const { addToken, roll, send, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 14, db: 3 });

  roll('8SK4', 'b1');
  assert.equal(bouquet('b1'), 2);

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 2 - 5 + 12);
});

test('返すのは「直前の判定」だけ（払わなかった判定を挟めば控えは消える）', () => {
  const { store, addToken, roll, send, bouquet, refund } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 3 });

  roll('8SK4', 'b1');            // 12払い、控えが残る
  assert.equal(bouquet('b1'), 18);
  assert.equal(refund('b1'), 12);

  // DBを0に戻してもう1回判定。ここで前の控えを持ち越さない
  store.dispatch('SET_PARAMETER', { characterId: 'b1', paramId: DB, value: 0 });
  assert.equal(roll('8SK4', 'b1'), '');
  assert.equal(refund('b1'), null, '払わなかったのに控えが残っている');

  assert.equal(send('リロール', 'b1'), true);
  assert.equal(bouquet('b1'), 13, 'ずっと前の判定のぶんを返している');
});

test('壊れた控え（取り込んだJSON）でも、返すのは正の整数だけ', () => {
  const { store, addToken, send, bouquet } = newRoom();
  addToken('b1', 'ブリンガー君', { bouquet: 30, db: 0 });

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
