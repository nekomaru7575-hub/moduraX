// test/plugin-parameter-backfill.test.js
// 「プラグインへ後から足したパラメータが、既に部屋にあるコマへ届くか」を固定するテスト。
//
// 銀剣のステラナイツへ「歪み」を足したとき、既存のコマでだけ
// 「更新画面に入力欄は出るのに、数を入れて『更新』を押しても何も起きない
// （保存もされず、キャラクター一覧にも出てこない）」という状態になった。
//
// 原因は2つの層にまたがっていた。
//   1. ダイアログ側（js/character-dialog.jsのapplyCharacterEditResult）が
//      「コマがまだ持っていないパラメータは送らない」としていた
//   2. 送られてさえくれば、Store側は宣言で補ってから書き込める
//      （SET_PARAMETERのwithPluginParameterDeclarations）
//
// ダイアログはDOMに触るのでNodeから読めない。ここで固定するのは2のほう＝
// 「送れば入る」というStore側の約束で、ダイアログはこれに依存している。
// これが崩れるとダイアログ側の条件を戻しても直らないので、先にここで気付けるようにする。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ImmutableStore, createInitialGameState } from '../js/game-store.js';

const DISTORTION = 'STELLA_KNIGHTS:distortion';
const BOUQUET = 'STELLA_KNIGHTS:bouquet';

// 「歪みが足される前に作られたコマ」を組み立てる。ADD_CHARACTERは今の宣言で作るので
// 歪みが入ってしまう。サーバーから届いた当時の部屋と同じように、歪みを抜いた
// パラメータを持つコマを初期状態へ直に置く。
function storeWithLegacyToken() {
  const base = new ImmutableStore(createInitialGameState({ activePlugin: 'STELLA_KNIGHTS' }));
  base.dispatch('ADD_CHARACTER', { id: 't1', name: 'ブリンガー君' });

  const token = base.state.tokens.t1;
  const { [DISTORTION]: _removed, ...withoutDistortion } = token.parameters;

  return new ImmutableStore({
    ...base.state,
    tokens: { t1: { ...token, parameters: withoutDistortion } }
  });
}

test('足す前に作られたコマは、確かにそのパラメータを持っていない', () => {
  const store = storeWithLegacyToken();

  // ここが false になると、以降のテストが何も確かめなくなる
  assert.equal(DISTORTION in store.state.tokens.t1.parameters, false);
});

test('持っていないパラメータへのSET_PARAMETERは、宣言で補ってから値を入れる', () => {
  const store = storeWithLegacyToken();

  store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: DISTORTION, value: 5 });

  const param = store.state.tokens.t1.parameters[DISTORTION];
  assert.ok(param, '補完されずに握り潰された');
  assert.equal(param.value, 5);
  assert.equal(param.label, '歪み');
  // visible が宣言どおりでないと、値は入ってもキャラクター一覧に出てこない
  assert.notEqual(param.visible, false);
  // locked:false だと、次に同じことが起きたとき補完されない
  assert.equal(param.locked, true);
});

test('値が0でも補完される（何も変えずに「更新」を押しただけのとき）', () => {
  const store = storeWithLegacyToken();

  store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: DISTORTION, value: 0 });

  assert.equal(store.state.tokens.t1.parameters[DISTORTION]?.value, 0);
});

test('宣言にも無いparamIdは、補完もされず何も起きない', () => {
  const store = storeWithLegacyToken();
  const before = store.state;

  store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: 'STELLA_KNIGHTS:nope', value: 1 });

  assert.equal(store.state, before, '状態が作り直された');
});

test('既に持っているパラメータは、宣言の既定値で潰されない', () => {
  const store = storeWithLegacyToken();

  store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: BOUQUET, value: 12 });
  store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: DISTORTION, value: 3 });

  assert.equal(store.state.tokens.t1.parameters[BOUQUET].value, 12);
  assert.equal(store.state.tokens.t1.parameters[DISTORTION].value, 3);
});
