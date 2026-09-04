// test/game-store.test.js
// game-store の「特性テスト」。仕様を新しく定めるのではなく、**今の振る舞いをそのまま
// 書き留めて固定する**ためのもの。ImmutableStore.dispatch をアクション別のモジュールへ
// 分ける作業の安全網として書いた。
//
// 分割で壊れやすいのは値の計算そのものではなく配線なので、次の3つに重心を置いている。
//   1. 何もしない経路（早期return）が、本当に状態を作り直さないこと
//      ＝ dispatch の前後で store.state が**同一参照**であること。
//      case の `return;` が `return patch;` に化けるのが最も起きやすい事故で、
//      値を比べるテストではこれを検出できない（作り直しても中身は同じになるため）。
//   2. EventBus の追加発火が、commit の**後に**1回だけ出ること。
//   3. アクション名の引き方（fieldPatchFor のプロトタイプ汚染よけ）。
//
// game-store.js は DOM にも window にも触らないので、そのまま node --test で動く
// （server/index.js も同じものを import している）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ImmutableStore,
  createInitialGameState,
  getEffectiveParameterValue,
  MAIN_CHAT_TAB_ID,
  SYSTEM_CHAT_TAB_ID
} from '../js/game-store.js';
import { EventBus } from '../js/EventBus.js';

// --- 道具 ---

function newStore(init = {}) {
  return new ImmutableStore(createInitialGameState(init));
}

// 「このdispatchは何もしないはず」を確かめる。#commit が呼ばれなければ this.#state は
// 差し替わらないので、同一参照であることがそのまま「何もしなかった」の証拠になる。
function assertNoop(store, action, payload, message) {
  const before = store.state;
  store.dispatch(action, payload);
  assert.strictEqual(store.state, before, message || `${action} は何もしないはず`);
}

// EventBus は購読の解除を持たない（js/EventBus.js）ので、購読者の配列ごと退避して戻す。
function captureEvents(names, run) {
  const saved = new Map();
  const seen = [];

  names.forEach(name => {
    saved.set(name, EventBus.listeners[name]);
    EventBus.listeners[name] = [(payload) => seen.push({ name, payload })];
  });

  try {
    run();
  } finally {
    names.forEach(name => {
      const original = saved.get(name);
      if (original === undefined) delete EventBus.listeners[name];
      else EventBus.listeners[name] = original;
    });
  }

  return seen;
}

// withEditableParamFields / withoutParam は弾いたときに console.warn を出す。
// 弾かれること自体が期待値のテストで出力が汚れるので黙らせる。
function withoutWarnings(run) {
  const original = console.warn;
  console.warn = () => {};
  try { return run(); } finally { console.warn = original; }
}

// 時刻を固定する。チャットログへ入る経路（withChatEntry）は payload.time が無いと
// Date.now() を補うので、ログを見るテストでは必ず渡す。
const T = 1_700_000_000_000;

function addCharacter(store, id, name, extra = {}) {
  store.dispatch('ADD_CHARACTER', { id, name, ...extra });
  return store.state.tokens[id];
}

// ===========================================================================
// 初期状態
// ===========================================================================

test('createInitialGameState: 固定タブとその空ログが最初から在る', () => {
  const store = newStore();
  const { chatTabs, chatLogs } = store.state;

  assert.deepEqual(chatTabs.map(t => t.id), [MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID]);
  assert.deepEqual(chatLogs[MAIN_CHAT_TAB_ID], []);
  assert.deepEqual(chatLogs[SYSTEM_CHAT_TAB_ID], []);
  assert.equal(store.state.round.active, false);
  assert.equal(store.state.room.parameters['core:round'].value, 0);
});

test('状態は直接書き換えられない（Proxyの番）', () => {
  const store = newStore();
  assert.throws(() => { store.state.tokens = {}; }, /State Protected/);
  assert.throws(() => { delete store.state.tokens; }, /State Protected/);
});

// ===========================================================================
// アクション名の引き方（fieldPatchFor のプロトタイプ汚染よけ）
// ===========================================================================

test('未知のアクションは何もしない', () => {
  const store = newStore();
  assertNoop(store, 'NO_SUCH_ACTION', { id: 'x' });
});

test('Object.prototype 由来の名前をアクションとして引けない', () => {
  // 素の TABLE[action] で引いていた頃、action:'constructor' が Object を返し、
  // payload の全キーがコマへマージされて保存・配信まで通った（fieldPatchFor のコメント参照）。
  const store = newStore();
  addCharacter(store, 't1', 'テスト');

  ['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf'].forEach(name => {
    assertNoop(store, name, { id: 't1', x: 999, y: 999, name: '乗っ取り' });
  });

  assert.equal(store.state.tokens.t1.name, 'テスト');
});

// ===========================================================================
// コマ（characters）
// ===========================================================================

test('ADD_CHARACTER: 既定値つきで作られ、CharacterCreated が commit の後に出る', () => {
  const store = newStore();
  let stateAtEmit = null;

  const events = captureEvents(['CharacterCreated'], () => {
    EventBus.listeners.CharacterCreated.push(() => { stateAtEmit = store.state; });
    store.dispatch('ADD_CHARACTER', { id: 't1', name: 'アリス' });
  });

  const token = store.state.tokens.t1;
  assert.equal(token.name, 'アリス');
  assert.equal(token.x, 20);
  assert.equal(token.y, 20);
  assert.equal(token.size, 1);
  assert.equal(token.visible, true);
  assert.equal(token.inBackyard, false);
  assert.equal(token.ownerId, null);
  assert.deepEqual(token.buffs, []);
  assert.deepEqual(token.components, {});
  assert.equal(token.parameters['core:hp'].value, 0);
  assert.ok(Object.isFrozen(token), 'コマは凍結されている');

  assert.deepEqual(events.map(e => e.name), ['CharacterCreated']);
  assert.deepEqual(events[0].payload, { id: 't1' });
  // 発火の時点で既に新しい状態になっている（commit → emit の順）
  assert.ok(stateAtEmit.tokens.t1, 'emit時点で既にコマが在る');
});

test('ADD_CHARACTER: id・name の欠落と重複は何もしない', () => {
  const store = newStore();
  assertNoop(store, 'ADD_CHARACTER', { name: '名前だけ' });
  assertNoop(store, 'ADD_CHARACTER', { id: 'idだけ' });

  addCharacter(store, 't1', 'アリス');
  assertNoop(store, 'ADD_CHARACTER', { id: 't1', name: 'ボブ' }, '同じidの二重登録');
});

test('ADD_CHARACTER: parameterOverrides / customParameters が反映される', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス', {
    parameterOverrides: { 'core:hp': 30 },
    parameterVisibility: { 'core:hp': false },
    customParameters: [{ key: 'sanity', label: '正気度', value: 55 }]
  });

  const token = store.state.tokens.t1;
  assert.equal(token.parameters['core:hp'].value, 30);
  assert.equal(token.parameters['core:hp'].visible, false);
  assert.equal(token.parameters['user:sanity'].value, 55);
  assert.equal(token.parameters['user:sanity'].label, '正気度');
});

test('REMOVE_CHARACTER: 消えて CharacterDeleted が出る／居ないidは何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  assertNoop(store, 'REMOVE_CHARACTER', { id: 'いない' });

  const events = captureEvents(['CharacterDeleted'], () => {
    store.dispatch('REMOVE_CHARACTER', { id: 't1' });
  });

  assert.equal(store.state.tokens.t1, undefined);
  assert.deepEqual(events.map(e => e.payload), [{ id: 't1' }]);
});

test('SET_PARAMETER: 値が入り ParameterChanged が出る', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  const events = captureEvents(['ParameterChanged'], () => {
    store.dispatch('SET_PARAMETER', { characterId: 't1', paramId: 'core:hp', value: 12 });
  });

  assert.equal(store.state.tokens.t1.parameters['core:hp'].value, 12);
  assert.deepEqual(events[0].payload, { characterId: 't1', paramId: 'core:hp', value: 12 });
});

test('SET_PARAMETER: 居ないコマ・居ないparamIdは何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  assertNoop(store, 'SET_PARAMETER', { characterId: 'いない', paramId: 'core:hp', value: 1 });
  withoutWarnings(() => {
    assertNoop(store, 'SET_PARAMETER', { characterId: 't1', paramId: 'core:nothing', value: 1 });
  });
});

test('SET_PARAMETER_VISIBILITY: 表示だけ変わり ParameterVisibilityChanged が出る', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  const events = captureEvents(['ParameterVisibilityChanged'], () => {
    store.dispatch('SET_PARAMETER_VISIBILITY', { characterId: 't1', paramId: 'core:hp', visible: false });
  });

  assert.equal(store.state.tokens.t1.parameters['core:hp'].visible, false);
  assert.equal(store.state.tokens.t1.parameters['core:hp'].value, 0, '値は触らない');
  assert.deepEqual(events[0].payload, { characterId: 't1', paramId: 'core:hp', visible: false });
});

test('REMOVE_PARAMETER: locked のパラメータは消せない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  // core:initiative は locked:true（js/parameters/core.js）
  withoutWarnings(() => {
    assertNoop(store, 'REMOVE_PARAMETER', { characterId: 't1', paramId: 'core:initiative' });
  });
  assert.ok(store.state.tokens.t1.parameters['core:initiative']);
});

// --- コマの決まった項目だけを差し替えるアクション（CHARACTER_FIELD_PATCHES） ---

test('MOVE_TOKEN / SET_CHARACTER_SIZE: テーブル経路が効く', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  store.dispatch('MOVE_TOKEN', { id: 't1', x: 100, y: 250 });
  assert.equal(store.state.tokens.t1.x, 100);
  assert.equal(store.state.tokens.t1.y, 250);

  store.dispatch('SET_CHARACTER_SIZE', { id: 't1', size: 2.4 });
  assert.equal(store.state.tokens.t1.size, 2, '四捨五入される');

  store.dispatch('SET_CHARACTER_SIZE', { id: 't1', size: 0 });
  assert.equal(store.state.tokens.t1.size, 1, '1未満にはならない');
});

test('テーブル経路: 居ないid・差分nullは何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  assertNoop(store, 'MOVE_TOKEN', { id: 'いない', x: 1, y: 1 });
  assertNoop(store, 'RENAME_CHARACTER', { id: 't1', name: '' }, '空の名前は差分nullで何もしない');
  assertNoop(store, 'MOVE_PANEL', { id: 'いない', x: 1, y: 1 });
  assertNoop(store, 'MOVE_CARD', { id: 'いない', x: 1, y: 1 });
  assertNoop(store, 'MOVE_DECK', { id: 'いない', x: 1, y: 1 });
});

test('MOVE_TO_BACKYARD: 参加者IDがあれば ownerId、無ければブラウザ単位のID', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');
  addCharacter(store, 't2', 'ボブ');

  store.dispatch('MOVE_TO_BACKYARD', { id: 't1', participantId: 'p1' });
  assert.equal(store.state.tokens.t1.inBackyard, true);
  assert.equal(store.state.tokens.t1.ownerId, 'p1');

  store.dispatch('MOVE_TO_BACKYARD', { id: 't2', localUserId: 'local-1' });
  assert.equal(store.state.tokens.t2.inBackyard, true);
  assert.equal(store.state.tokens.t2.backyardOwnerId, 'local-1');

  // どちらのIDも無ければ差分nullで何もしない
  addCharacter(store, 't3', 'キャロル');
  assertNoop(store, 'MOVE_TO_BACKYARD', { id: 't3' });

  store.dispatch('RESTORE_FROM_BACKYARD', { id: 't1' });
  assert.equal(store.state.tokens.t1.inBackyard, false);
});

// ===========================================================================
// バフ／デバフ（buffs）
// ===========================================================================

test('ADD_BUFF / REMOVE_BUFF: 実効値に効き、消せる', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス', { parameterOverrides: { 'core:hp': 10 } });

  store.dispatch('ADD_BUFF', { tokenId: 't1', id: 'b1', name: '祝福', paramId: 'core:hp', delta: 3 });
  assert.equal(getEffectiveParameterValue(store.state.tokens.t1, 'core:hp'), 13);
  assert.equal(store.state.tokens.t1.parameters['core:hp'].value, 10, '基礎値は変えない');

  store.dispatch('REMOVE_BUFF', { tokenId: 't1', id: 'b1' });
  assert.equal(getEffectiveParameterValue(store.state.tokens.t1, 'core:hp'), 10);
});

test('ADD_BUFF: 居ないコマ・id/name欠落は何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  assertNoop(store, 'ADD_BUFF', { tokenId: 'いない', id: 'b1', name: '祝福', delta: 1 });
  assertNoop(store, 'ADD_BUFF', { tokenId: 't1', name: '祝福', delta: 1 });
  assertNoop(store, 'ADD_BUFF', { tokenId: 't1', id: 'b1', delta: 1 });
});

test('REMOVE_BUFFS_BY_TAG: 同じタグのものだけ消える', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  store.dispatch('ADD_BUFF', { tokenId: 't1', id: 'b1', name: 'A', delta: 1, tag: 'combo:1' });
  store.dispatch('ADD_BUFF', { tokenId: 't1', id: 'b2', name: 'B', delta: 1, tag: 'combo:1' });
  store.dispatch('ADD_BUFF', { tokenId: 't1', id: 'b3', name: 'C', delta: 1, tag: 'other' });

  store.dispatch('REMOVE_BUFFS_BY_TAG', { tokenId: 't1', tag: 'combo:1' });
  assert.deepEqual(store.state.tokens.t1.buffs.map(b => b.id), ['b3']);
});

test('EXPIRE_BUFFS: phase無し・何も消えないコマ指定は何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');

  assertNoop(store, 'EXPIRE_BUFFS', { tokenId: 't1' }, 'phaseが無い');
  assertNoop(store, 'EXPIRE_BUFFS', { phase: 'round', tokenId: 'いない' });
  assertNoop(store, 'EXPIRE_BUFFS', { phase: 'round', tokenId: 't1' }, '消えるバフが無い');
});

test('EXPIRE_BUFFS: 期限の来たバフが消え、システムタブへ1行残る', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');
  store.dispatch('ADD_BUFF', {
    tokenId: 't1', id: 'b1', name: '加護', paramId: 'core:hp', delta: 2, expirePhase: 'round'
  });

  store.dispatch('EXPIRE_BUFFS', { phase: 'round', time: T });

  assert.deepEqual(store.state.tokens.t1.buffs, []);
  const systemLog = store.state.chatLogs[SYSTEM_CHAT_TAB_ID];
  assert.equal(systemLog.length, 1);
  assert.match(systemLog[0].resultText, /加護/);
  assert.equal(systemLog[0].time, T);
});

// ===========================================================================
// ラウンド進行（round）
// ===========================================================================

test('ROUND_PROGRESSION_START: 進行が始まり、ルーム変数とMainのログが追随する', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');
  addCharacter(store, 't2', 'ボブ');

  store.dispatch('ROUND_PROGRESSION_START', { participantIds: ['t1', 't2'], time: T });

  const { round, room, chatLogs } = store.state;
  assert.equal(round.active, true);
  assert.equal(round.roundNumber, 1);
  assert.equal(round.phaseIndex, 0);
  assert.equal(round.step, 'act');
  assert.equal(round.currentActorId, null, '先頭がセットアップなので手番はまだ決まらない');
  assert.deepEqual([...round.participants].sort(), ['t1', 't2']);

  assert.equal(room.parameters['core:round'].value, 1, 'ルーム変数が追随する');

  assert.equal(chatLogs[MAIN_CHAT_TAB_ID].length, 1);
  assert.match(chatLogs[MAIN_CHAT_TAB_ID][0].resultText, /ラウンド進行を開始しました/);
  assert.equal(chatLogs[MAIN_CHAT_TAB_ID][0].time, T);
});

test('ROUND_PROGRESSION_START: 進行中の二重開始は何もしない', () => {
  const store = newStore();
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: [], time: T });
  assertNoop(store, 'ROUND_PROGRESSION_START', { participantIds: [], time: T });
});

test('ROUND_PROGRESSION_END: 終わるとルーム変数が0へ戻る', () => {
  const store = newStore();
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: [], time: T });
  store.dispatch('ROUND_PROGRESSION_END', { time: T });

  assert.equal(store.state.round.active, false);
  assert.equal(store.state.room.parameters['core:round'].value, 0);
});

test('ROUND_SET_PLOT: 進行していなければ何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');
  assertNoop(store, 'ROUND_SET_PLOT', { tokenId: 't1', value: 3 });

  // 進行中でも、参加者でなければ何もしない
  store.dispatch('ROUND_PROGRESSION_START', { participantIds: [], time: T });
  assertNoop(store, 'ROUND_SET_PLOT', { tokenId: 't1', value: 3 });
});

test('ROUND_SET_ACTED: 進行していなければ何もしない', () => {
  const store = newStore();
  addCharacter(store, 't1', 'アリス');
  assertNoop(store, 'ROUND_SET_ACTED', { tokenId: 't1', acted: true });
});

// ===========================================================================
// 部屋の設定（room）
// ===========================================================================

test('SET_ROOM_NAME: 文字列だけを受ける', () => {
  const store = newStore();
  store.dispatch('SET_ROOM_NAME', { name: 'テスト卓' });
  assert.equal(store.state.room.name, 'テスト卓');

  assertNoop(store, 'SET_ROOM_NAME', { name: 123 });
  assertNoop(store, 'SET_ROOM_NAME', {});
});

test('ルーム変数: 追加・変更・削除', () => {
  const store = newStore();

  store.dispatch('ADD_ROOM_PARAMETER', { key: 'chaos', label: '混沌', value: 3 });
  assert.equal(store.state.room.parameters['user:chaos'].value, 3);

  store.dispatch('SET_ROOM_PARAMETER', { paramId: 'user:chaos', value: 7 });
  assert.equal(store.state.room.parameters['user:chaos'].value, 7);

  store.dispatch('REMOVE_ROOM_PARAMETER', { paramId: 'user:chaos' });
  assert.equal(store.state.room.parameters['user:chaos'], undefined);

  assertNoop(store, 'ADD_ROOM_PARAMETER', { label: 'キー無し', value: 1 });
});

test('SET_ROOM_PARAMETER: editable:false のルーム変数は書き換えられない', () => {
  const store = newStore();
  // core:round は editable:false / locked:true（js/parameters/core.js）
  withoutWarnings(() => {
    assertNoop(store, 'SET_ROOM_PARAMETER', { paramId: 'core:round', value: 99 });
    assertNoop(store, 'REMOVE_ROOM_PARAMETER', { paramId: 'core:round' });
  });
  assert.equal(store.state.room.parameters['core:round'].value, 0);
});

test('SET_ACTIVE_PLUGIN: ActivePluginChanged が出る', () => {
  const store = newStore();
  const events = captureEvents(['ActivePluginChanged'], () => {
    store.dispatch('SET_ACTIVE_PLUGIN', { pluginId: 'STELLA_KNIGHTS', time: T });
  });

  assert.equal(store.state.room.activePlugin, 'STELLA_KNIGHTS');
  assert.deepEqual(events[0].payload, { pluginId: 'STELLA_KNIGHTS' });
});

test('オリジナル表: 追加と削除', () => {
  const store = newStore();
  store.dispatch('ADD_ORIGINAL_TABLE', { title: '遭遇表', dice: '1D6', entries: ['a', 'b'] });
  assert.ok(store.state.room.originalTables['遭遇表']);

  assertNoop(store, 'ADD_ORIGINAL_TABLE', { title: '欠け', dice: '1D6' });
  assertNoop(store, 'REMOVE_ORIGINAL_TABLE', { title: '無い表' });

  store.dispatch('REMOVE_ORIGINAL_TABLE', { title: '遭遇表' });
  assert.equal(store.state.room.originalTables['遭遇表'], undefined);
});

// --- 部屋のスタンプ（room.stamps） ---
// 画像URLを状態に持つ唯一のスタンプなので、受け付ける形をここで固定しておく。

const STAMP_URL = 'https://example.invalid/rooms/room-1/a.png';

test('ADD_ROOM_STAMP: 公開IDは受け取った側が付ける', () => {
  const store = newStore();
  store.dispatch('ADD_ROOM_STAMP', { id: 's1', label: 'なるほど', url: STAMP_URL, key: 'rooms/room-1/a.png' });

  const stamp = store.state.room.stamps['room:s1'];
  assert.ok(stamp, 'キーは名前空間付きの公開ID');
  assert.equal(stamp.id, 'room:s1');
  assert.equal(store.state.room.stamps.s1, undefined, '素のローカルidはキーにならない');

  // Coreの名前をpayloadで名乗っても、名前空間が付くので奪えない
  store.dispatch('ADD_ROOM_STAMP', { id: 'ok', label: 'OKっぽいやつ', url: STAMP_URL });
  assert.ok(store.state.room.stamps['room:ok']);
  assert.equal(store.state.room.stamps.ok, undefined);
});

test('ADD_ROOM_STAMP: 受け付けないpayload', () => {
  const store = newStore();

  assertNoop(store, 'ADD_ROOM_STAMP', { label: 'a', url: STAMP_URL }, 'idが要る');
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', url: STAMP_URL }, 'labelが要る');
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: '   ', url: STAMP_URL }, '空白だけのlabel');
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a' }, 'urlが要る');

  // idに名前空間の区切りやパスを混ぜられない
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 'a:b', label: 'a', url: STAMP_URL });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: '../x', label: 'a', url: STAMP_URL });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: '__proto__', label: 'a', url: STAMP_URL });

  // URLは許可リスト方式。データURLを通すと状態が肥大し、P2Pのスナップショットも壊れる
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: 'data:image/png;base64,AAAA' });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: 'http://example.invalid/a.png' });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: 'image/stamps/ok.png' });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: 'javascript:alert(1)' });
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: `https://example.invalid/${'a'.repeat(500)}` });
  // ハッシュの桁が足りない参照は受けない（js/asset-store.jsと同じ厳しさ）
  assertNoop(store, 'ADD_ROOM_STAMP', { id: 's1', label: 'a', url: '/asset/abc' });

  // P2P卓の実体参照は通る
  store.dispatch('ADD_ROOM_STAMP', { id: 's2', label: 'ぴあ', url: `/asset/${'a'.repeat(64)}` });
  assert.ok(store.state.room.stamps['room:s2']);
});

test('ADD_ROOM_STAMP: 長い名前は切り詰めて通す', () => {
  const store = newStore();
  store.dispatch('ADD_ROOM_STAMP', { id: 's1', label: 'あ'.repeat(50), url: STAMP_URL });
  assert.equal(store.state.room.stamps['room:s1'].label.length, 20);
});

test('ADD_ROOM_STAMP: 上限は新規のときだけ見る', () => {
  const store = newStore();
  for (let i = 0; i < 24; i += 1) {
    store.dispatch('ADD_ROOM_STAMP', { id: `s${i}`, label: `n${i}`, url: STAMP_URL });
  }
  assert.equal(Object.keys(store.state.room.stamps).length, 24);

  assertNoop(store, 'ADD_ROOM_STAMP', { id: 'over', label: 'あふれ', url: STAMP_URL });

  // 既存idの上書き（＝編集）は数が増えないので、上限に達していても通す
  store.dispatch('ADD_ROOM_STAMP', { id: 's0', label: '書き換え', url: STAMP_URL });
  assert.equal(store.state.room.stamps['room:s0'].label, '書き換え');
  assert.equal(Object.keys(store.state.room.stamps).length, 24);
});

test('REMOVE_ROOM_STAMP: ローカルidで消す', () => {
  const store = newStore();
  store.dispatch('ADD_ROOM_STAMP', { id: 's1', label: 'a', url: STAMP_URL });

  assertNoop(store, 'REMOVE_ROOM_STAMP', { id: '無いid' });
  assertNoop(store, 'REMOVE_ROOM_STAMP', { id: '__proto__' });

  store.dispatch('REMOVE_ROOM_STAMP', { id: 's1' });
  assert.equal(store.state.room.stamps['room:s1'], undefined);
});

test('COUNT_STAMP: 部屋のスタンプは「集計する」を選んだものだけ数える', () => {
  const store = newStore();
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('ADD_ROOM_STAMP', { id: 'plain', label: 'なるほど', url: STAMP_URL });
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: '拍手', url: STAMP_URL, counted: true });

  // 既定は数えない（Coreの相槌と同じ扱い）
  assertNoop(store, 'COUNT_STAMP', { stampId: 'room:plain', participantId: 'p1', count: 1 });

  store.dispatch('COUNT_STAMP', { stampId: 'room:tally', participantId: 'p1', count: 3 });
  assert.equal(store.state.stampCounts['room:tally'].p1, 3);
});

test('集計するスタンプにはルーム変数「（スタンプ名）合計」が付く', () => {
  const store = newStore();
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p2', nickname: 'ボブ' });

  // 集計しないスタンプでは作られない
  store.dispatch('ADD_ROOM_STAMP', { id: 'plain', label: 'なるほど', url: STAMP_URL });
  assert.equal(store.state.room.parameters['roomStampTotal:plain'], undefined);

  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: '拍手', url: STAMP_URL, counted: true });
  const param = store.state.room.parameters['roomStampTotal:tally'];
  assert.ok(param, '登録した時点で変数ができる');
  assert.equal(param.label, '拍手合計');
  assert.equal(param.value, 0);
  assert.equal(param.editable, false, '自動計算なので手では変えられない');
  assert.equal(param.locked, true, '消せない');

  // 全参加者ぶんの総和になる（ブーケ合計と同じ数え方）
  store.dispatch('COUNT_STAMP', { stampId: 'room:tally', participantId: 'p1', count: 3 });
  store.dispatch('COUNT_STAMP', { stampId: 'room:tally', participantId: 'p2', count: 2 });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].value, 5);

  // 名前を変えると変数の名前も追随する
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: 'いいね', url: STAMP_URL, counted: true });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].label, 'いいね合計');
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].value, 5, '数はそのまま');

  // 集計をやめると変数は消える（集計そのものは残す）
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: 'いいね', url: STAMP_URL, counted: false });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'], undefined);
  assert.equal(store.state.stampCounts['room:tally'].p1, 3, '集計は残る');

  // 集計し直すと、残っていた数がそのまま戻る
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: 'いいね', url: STAMP_URL, counted: true });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].value, 5);
});

test('スタンプを消すと、変数も集計も残らない', () => {
  const store = newStore();
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: '拍手', url: STAMP_URL, counted: true });
  store.dispatch('COUNT_STAMP', { stampId: 'room:tally', participantId: 'p1', count: 4 });

  store.dispatch('REMOVE_ROOM_STAMP', { id: 'tally' });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'], undefined);
  // 残すと、もう誰も名前を引けない数が部屋データに居座り続ける（孤児）
  assert.equal(store.state.stampCounts['room:tally'], undefined);
});

test('RESET_STAMP_COUNTS: 部屋のスタンプの合計も0に戻る', () => {
  const store = newStore();
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('ADD_ROOM_STAMP', { id: 'tally', label: '拍手', url: STAMP_URL, counted: true });
  store.dispatch('COUNT_STAMP', { stampId: 'room:tally', participantId: 'p1', count: 4 });
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].value, 4);

  store.dispatch('RESET_STAMP_COUNTS', {});
  assert.equal(store.state.room.parameters['roomStampTotal:tally'].value, 0);
});

test('ADD_ROOM_STAMP: countedは真偽値だけを受ける', () => {
  const store = newStore();
  store.dispatch('ADD_ROOM_STAMP', { id: 's1', label: 'a', url: STAMP_URL, counted: 'yes' });
  assert.equal(store.state.room.stamps['room:s1'].counted, false, '文字列で集計は始まらない');
  assert.equal(store.state.room.parameters['roomStampTotal:s1'], undefined);
});

// ===========================================================================
// 参加者・スタンプ（participants）
// ===========================================================================

test('REGISTER_PARTICIPANT: 最初に名乗った人だけがGMになる', () => {
  const store = newStore();

  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p2', nickname: 'ボブ' });

  assert.equal(store.state.participants.p1.isGm, true);
  assert.equal(store.state.participants.p2.isGm, false);

  // 名乗り直してもGMかどうかは引き継ぐ
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス改' });
  assert.equal(store.state.participants.p1.isGm, true);
  assert.equal(store.state.participants.p1.nickname, 'アリス改');

  assertNoop(store, 'REGISTER_PARTICIPANT', { nickname: 'id無し' });
});

test('SET_PARTICIPANT_GM / REMOVE_PARTICIPANT: 居ないIDは何もしない', () => {
  const store = newStore();
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });

  assertNoop(store, 'SET_PARTICIPANT_GM', { id: 'いない', isGm: true });
  assertNoop(store, 'REMOVE_PARTICIPANT', { id: 'いない' });

  store.dispatch('SET_PARTICIPANT_GM', { id: 'p1', isGm: false });
  assert.equal(store.state.participants.p1.isGm, false);
});

test('COUNT_STAMP: 実在する参加者・プラグインのスタンプだけを数える', () => {
  const store = newStore({ activePlugin: 'STELLA_KNIGHTS' });
  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });

  // 名乗っていない人は数える先が無い
  assertNoop(store, 'COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p9', count: 1 });
  // __proto__ が Object.prototype に当たって「実在する参加者」を通らないこと
  assertNoop(store, 'COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: '__proto__', count: 1 });
  // Coreのスタンプは数えない
  assertNoop(store, 'COUNT_STAMP', { stampId: 'ok', participantId: 'p1', count: 1 });
  // 整数でない・負は弾く
  assertNoop(store, 'COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p1', count: 1.5 });
  assertNoop(store, 'COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p1', count: -1 });

  store.dispatch('COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p1', count: 4 });
  assert.equal(store.state.stampCounts['STELLA_KNIGHTS:bouquet'].p1, 4);

  // 同じ値の書き直しは何も変えない
  assertNoop(store, 'COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p1', count: 4 });
});

test('RESET_STAMP_COUNTS: 既に空なら何もしない', () => {
  const store = newStore({ activePlugin: 'STELLA_KNIGHTS' });
  assertNoop(store, 'RESET_STAMP_COUNTS', {});

  store.dispatch('REGISTER_PARTICIPANT', { id: 'p1', nickname: 'アリス' });
  store.dispatch('COUNT_STAMP', { stampId: 'STELLA_KNIGHTS:bouquet', participantId: 'p1', count: 2 });

  store.dispatch('RESET_STAMP_COUNTS', {});
  assert.deepEqual(store.state.stampCounts, {});
});

// ===========================================================================
// チャット（chat）
// ===========================================================================

test('ADD_CHAT_TAB: タブと空ログが対で増える／重複と欠落は何もしない', () => {
  const store = newStore();

  store.dispatch('ADD_CHAT_TAB', { id: 'tab1', name: '密談' });
  assert.deepEqual(store.state.chatLogs.tab1, []);
  assert.equal(store.state.chatTabs.at(-1).name, '密談');
  assert.equal(store.state.chatTabs.at(-1).audience, null);

  assertNoop(store, 'ADD_CHAT_TAB', { id: 'tab1', name: '重複' });
  assertNoop(store, 'ADD_CHAT_TAB', { name: 'id無し' });
});

test('固定タブ（Main・システム）は名前も公開先も削除も受け付けない', () => {
  const store = newStore();

  assertNoop(store, 'SET_CHAT_TAB_AUDIENCE', { id: MAIN_CHAT_TAB_ID, audience: ['p1'] });
  assertNoop(store, 'SET_CHAT_TAB_AUDIENCE', { id: SYSTEM_CHAT_TAB_ID, audience: ['p1'] });
  assertNoop(store, 'RENAME_CHAT_TAB', { id: SYSTEM_CHAT_TAB_ID, name: '改名' });
  assertNoop(store, 'REMOVE_CHAT_TAB', { id: MAIN_CHAT_TAB_ID });
  assertNoop(store, 'REMOVE_CHAT_TAB', { id: SYSTEM_CHAT_TAB_ID });
});

test('REMOVE_CHAT_TAB: タブとログが一緒に消える', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_TAB', { id: 'tab1', name: '密談' });
  store.dispatch('REMOVE_CHAT_TAB', { id: 'tab1' });

  assert.equal(store.state.chatLogs.tab1, undefined);
  assert.equal(store.state.chatTabs.some(t => t.id === 'tab1'), false);
});

test('ADD_CHAT_MESSAGE: payload.time がそのまま入る／居ないタブは何もしない', () => {
  const store = newStore();

  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entry: { id: 'e1', resultText: 'こんばんは' }, time: T
  });

  const [entry] = store.state.chatLogs[MAIN_CHAT_TAB_ID];
  assert.equal(entry.resultText, 'こんばんは');
  assert.equal(entry.time, T);

  assertNoop(store, 'ADD_CHAT_MESSAGE', { tabId: '無いタブ', entry: { resultText: 'x' }, time: T });
  assertNoop(store, 'ADD_CHAT_MESSAGE', { tabId: MAIN_CHAT_TAB_ID, time: T });
});

test('EDIT_CHAT_MESSAGE: 本文だけが変わり editedAt が付く', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entry: { id: 'e1', character: 'アリス', resultText: 'こんばんわ' }, time: T
  });

  store.dispatch('EDIT_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', resultText: 'こんばんは', time: T + 5
  });

  const [entry] = store.state.chatLogs[MAIN_CHAT_TAB_ID];
  assert.equal(entry.resultText, 'こんばんは');
  assert.equal(entry.character, 'アリス', 'キャラ名は残る');
  assert.equal(entry.time, T, '発言時刻は変わらない');
  assert.equal(entry.editedAt, T + 5);
});

test('EDIT_CHAT_MESSAGE: 居ないタブ・居ないid・文字列でない本文は何もしない', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entry: { id: 'e1', resultText: 'もと' }, time: T
  });

  assertNoop(store, 'EDIT_CHAT_MESSAGE', { tabId: '無いタブ', entryId: 'e1', resultText: 'x' });
  assertNoop(store, 'EDIT_CHAT_MESSAGE', { tabId: MAIN_CHAT_TAB_ID, entryId: '無いid', resultText: 'x' });
  assertNoop(store, 'EDIT_CHAT_MESSAGE', { tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', resultText: 123 });
});

test('SET_CHAT_SECRET_REVEALED: revealed だけが動き、出目も secret も残る', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID,
    entry: { id: 'e1', character: 'アリス', resultText: '(1D100) ＞ 73', diceDetail: '73', secret: true },
    time: T
  });

  store.dispatch('SET_CHAT_SECRET_REVEALED', {
    tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', revealed: true, time: T + 5
  });

  const [entry] = store.state.chatLogs[MAIN_CHAT_TAB_ID];
  assert.equal(entry.revealed, true);
  assert.equal(entry.secret, true, 'シークレットダイスだった印は公開後も残る');
  assert.equal(entry.resultText, '(1D100) ＞ 73', '出目は最初から状態にある（伏せるのは表示側）');
  assert.equal(entry.diceDetail, '73');
  assert.equal(entry.time, T, '発言時刻は変わらない');
  assert.equal(entry.editedAt, undefined, '公開は編集ではないので(編集済み)は付かない');

  // 伏せ直せる（誤操作の取り消し）
  store.dispatch('SET_CHAT_SECRET_REVEALED', { tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', revealed: false });
  assert.equal(store.state.chatLogs[MAIN_CHAT_TAB_ID][0].revealed, false);
});

test('SET_CHAT_SECRET_REVEALED: 居ないタブ・居ないid・secretでない発言・同じ値は何もしない', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entry: { id: 'e1', resultText: 'ひみつ', secret: true }, time: T
  });
  store.dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_CHAT_TAB_ID, entry: { id: 'e2', resultText: 'ふつうの発言' }, time: T
  });

  assertNoop(store, 'SET_CHAT_SECRET_REVEALED', { tabId: '無いタブ', entryId: 'e1', revealed: true });
  assertNoop(store, 'SET_CHAT_SECRET_REVEALED', { tabId: MAIN_CHAT_TAB_ID, entryId: '無いid', revealed: true });
  assertNoop(store, 'SET_CHAT_SECRET_REVEALED', { tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', revealed: 'はい' },
    'revealedが真偽値でなければ何もしない');
  assertNoop(store, 'SET_CHAT_SECRET_REVEALED', { tabId: MAIN_CHAT_TAB_ID, entryId: 'e2', revealed: true },
    'シークレットダイスでない発言は対象外');
  assertNoop(store, 'SET_CHAT_SECRET_REVEALED', { tabId: MAIN_CHAT_TAB_ID, entryId: 'e1', revealed: false },
    '既にその値なら作り直さない');
});

test('ROLL_DICE_ANIMATION: 状態は変えず DICE_ROLLED だけを出す', () => {
  const store = newStore();
  const before = store.state;

  const events = captureEvents(['DICE_ROLLED'], () => {
    store.dispatch('ROLL_DICE_ANIMATION', { rands: [[3, 6]] });
  });

  assert.strictEqual(store.state, before, '状態は作り直さない');
  assert.deepEqual(events[0].payload, { rands: [[3, 6]] });
});

test('CLEAR_ALL_CHAT_LOGS: 中身だけ空にして、Mainに理由が1行残る', () => {
  const store = newStore();
  store.dispatch('ADD_CHAT_TAB', { id: 'tab1', name: '密談' });
  store.dispatch('ADD_CHAT_MESSAGE', { tabId: MAIN_CHAT_TAB_ID, entry: { resultText: 'あ' }, time: T });
  store.dispatch('ADD_CHAT_MESSAGE', { tabId: 'tab1', entry: { resultText: 'い' }, time: T });

  store.dispatch('CLEAR_ALL_CHAT_LOGS', { time: T });

  assert.deepEqual(store.state.chatLogs.tab1, []);
  assert.equal(store.state.chatLogs[MAIN_CHAT_TAB_ID].length, 1);
  assert.equal(store.state.chatLogs[MAIN_CHAT_TAB_ID][0].resultText, 'ログを消去しました。');
  assert.equal(store.state.chatTabs.length, 3, 'タブそのものは残る');
});

// ===========================================================================
// 盤面（panels / cards / decks）
// ===========================================================================

test('ADD_PANEL / REMOVE_PANEL', () => {
  const store = newStore();

  store.dispatch('ADD_PANEL', { id: 'pn1', text: 'メモ' });
  assert.equal(store.state.panels.pn1.text, 'メモ');

  store.dispatch('SET_PANEL_TEXT', { id: 'pn1', text: '書き直し' });
  assert.equal(store.state.panels.pn1.text, '書き直し');

  store.dispatch('SET_PANEL_SIZE', { id: 'pn1', cols: 3.4, rows: 0 });
  assert.equal(store.state.panels.pn1.cols, 3);
  assert.equal(store.state.panels.pn1.rows, 1, '1未満にはならない');

  store.dispatch('REMOVE_PANEL', { id: 'pn1' });
  assert.equal(store.state.panels.pn1, undefined);
  assertNoop(store, 'REMOVE_PANEL', { id: 'pn1' });
});

test('ADD_CARD / ADD_DECK: 重複とid欠落は何もしない', () => {
  const store = newStore();

  store.dispatch('ADD_CARD', { id: 'c1', face: { name: 'スペードのA' } });
  assert.ok(store.state.cards.c1);
  assertNoop(store, 'ADD_CARD', { id: 'c1' });
  assertNoop(store, 'ADD_CARD', {});

  store.dispatch('ADD_DECK', { id: 'd1', name: 'トランプ' });
  assert.ok(store.state.decks.d1);
  assertNoop(store, 'ADD_DECK', { id: 'd1' });
  assertNoop(store, 'ADD_DECK', {});

  store.dispatch('SET_CARD_FACE_UP', { id: 'c1', faceUp: true });
  assert.equal(store.state.cards.c1.faceUp, true);

  store.dispatch('REMOVE_CARD', { id: 'c1' });
  assert.equal(store.state.cards.c1, undefined);
  assertNoop(store, 'REMOVE_CARD', { id: 'c1' });

  store.dispatch('REMOVE_DECK', { id: 'd1' });
  assert.equal(store.state.decks.d1, undefined);
  assertNoop(store, 'REMOVE_DECK', { id: 'd1' });
});

test('SHUFFLE_DECK: 今ある札の並べ替えでなければ受け付けない', () => {
  const store = newStore();
  store.dispatch('ADD_DECK', {
    id: 'd1', name: 'トランプ',
    cards: [{ id: 'x1', name: 'A' }, { id: 'x2', name: 'B' }]
  });

  const ids = store.state.decks.d1.cards.map(c => c.id);
  assert.equal(ids.length, 2);

  assertNoop(store, 'SHUFFLE_DECK', { id: 'd1', order: [ids[0]] }, '枚数が合わない');
  assertNoop(store, 'SHUFFLE_DECK', { id: 'd1', order: [ids[0], '偽物'] }, '知らないidが混ざる');
  assertNoop(store, 'SHUFFLE_DECK', { id: '無いデッキ', order: ids });

  store.dispatch('SHUFFLE_DECK', { id: 'd1', order: [ids[1], ids[0]] });
  assert.deepEqual(store.state.decks.d1.cards.map(c => c.id), [ids[1], ids[0]]);
});

// ===========================================================================
// 情報（info）
// ===========================================================================

test('ADD_INFO_ENTRY: sectionが1つも無ければ作らない', () => {
  const store = newStore();

  assertNoop(store, 'ADD_INFO_ENTRY', { id: 'i1', title: '使命' }, 'sections無し');
  assertNoop(store, 'ADD_INFO_ENTRY', { id: 'i1', title: '使命', sections: [] });
  assertNoop(store, 'ADD_INFO_ENTRY', { id: 'i1', title: '使命', sections: [{ label: 'id無し' }] });
  assertNoop(store, 'ADD_INFO_ENTRY', { title: 'id無し', sections: [{ id: 's1' }] });
});

test('ADD_INFO_ENTRY: 作られ、同じidの二重登録と同じsection idは弾かれる', () => {
  const store = newStore();

  store.dispatch('ADD_INFO_ENTRY', {
    id: 'i1', title: '使命', ownerId: 'p1',
    sections: [
      { id: 's1', label: '表', body: '町を守れ' },
      { id: 's1', label: '重複', body: '後勝ちしない' },
      { id: 's2', label: '裏', body: '秘密', audience: ['p1'] }
    ]
  });

  const [entry] = store.state.infoEntries;
  assert.equal(entry.title, '使命');
  assert.equal(entry.ownerId, 'p1');
  assert.deepEqual(entry.sections.map(s => s.id), ['s1', 's2'], '同じidは先勝ち');
  assert.equal(entry.sections[0].body, '町を守れ');
  assert.deepEqual(entry.sections[1].audience, ['p1']);

  assertNoop(store, 'ADD_INFO_ENTRY', { id: 'i1', title: '重複', sections: [{ id: 's9' }] });
});

test('UPDATE_INFO_ENTRY / REMOVE_INFO_ENTRY: 居ないidは何もしない', () => {
  const store = newStore();
  store.dispatch('ADD_INFO_ENTRY', { id: 'i1', title: '使命', sections: [{ id: 's1', body: 'もと' }] });

  assertNoop(store, 'UPDATE_INFO_ENTRY', { id: '無い', title: 'x' });
  assertNoop(store, 'REMOVE_INFO_ENTRY', { id: '無い' });

  store.dispatch('UPDATE_INFO_ENTRY', { id: 'i1', title: '書き直し' });
  assert.equal(store.state.infoEntries[0].title, '書き直し');

  store.dispatch('REMOVE_INFO_ENTRY', { id: 'i1' });
  assert.deepEqual(store.state.infoEntries, []);
});

// ===========================================================================
// 音楽（audio）
// ===========================================================================

test('ADD_AUDIO_TRACK: 種別・出自・フレーズが正規化される', () => {
  const store = newStore();

  store.dispatch('ADD_AUDIO_TRACK', {
    id: 'a1', name: '戦闘曲', url: 'https://example.com/a.mp3',
    source: 'なにか', channel: 'なにか', loop: 1, phrase: '  ', key: 'k1'
  });

  const track = store.state.room.audioTracks.a1;
  assert.equal(track.source, 'external', '既知でない出自は external へ倒す');
  assert.equal(track.key, null, 'external なら key は持たない');
  assert.equal(track.channel, 'bgm', '既知でない種別は bgm へ倒す');
  assert.equal(track.loop, true);
  assert.equal(track.phrase, null, '空白だけのフレーズは null');

  assertNoop(store, 'ADD_AUDIO_TRACK', { id: 'a2', name: 'URL無し' });
  assertNoop(store, 'SET_AUDIO_TRACK_PHRASE', { id: '無い', phrase: 'x' });
});

test('SET_AUDIO_PLAYBACK / STOP_AUDIO_PLAYBACK: BGMの切り替えだけがログに残る', () => {
  const store = newStore();
  store.dispatch('ADD_AUDIO_TRACK', {
    id: 'a1', name: '戦闘曲', url: 'https://example.com/a.mp3', source: 'upload', key: 'k1', channel: 'bgm'
  });

  assertNoop(store, 'SET_AUDIO_PLAYBACK', { channel: '無い', trackId: 'a1', playId: 1 });
  assertNoop(store, 'SET_AUDIO_PLAYBACK', { channel: 'bgm', trackId: '無い', playId: 1 });
  assertNoop(store, 'STOP_AUDIO_PLAYBACK', { channel: 'bgm' }, '鳴っていなければ止めるものが無い');

  store.dispatch('SET_AUDIO_PLAYBACK', { channel: 'bgm', trackId: 'a1', playId: 1, time: T });
  assert.deepEqual(store.state.room.audioPlayback.bgm, { trackId: 'a1', playId: 1 });
  assert.equal(store.state.chatLogs[SYSTEM_CHAT_TAB_ID].length, 1);

  // 同じ曲の鳴らし直し（playIdだけの更新）ではログを増やさない
  store.dispatch('SET_AUDIO_PLAYBACK', { channel: 'bgm', trackId: 'a1', playId: 2, time: T });
  assert.equal(store.state.chatLogs[SYSTEM_CHAT_TAB_ID].length, 1);

  store.dispatch('STOP_AUDIO_PLAYBACK', { channel: 'bgm', time: T });
  assert.equal(store.state.room.audioPlayback.bgm, null);
  assert.equal(store.state.chatLogs[SYSTEM_CHAT_TAB_ID].length, 2);
});

// ===========================================================================
// シーン（scenes）
// ===========================================================================

test('SAVE_SCENE / REMOVE_SCENE: id・nameの欠落と居ないidは何もしない', () => {
  const store = newStore();

  assertNoop(store, 'SAVE_SCENE', { name: 'id無し' });
  assertNoop(store, 'SAVE_SCENE', { id: 's1' });
  assertNoop(store, 'REMOVE_SCENE', { id: '無い' });

  store.dispatch('SAVE_SCENE', {
    id: 's1', name: '酒場', text: '賑わっている',
    background: { imageUrl: 'https://example.com/bar.png', boardWidth: 800, boardHeight: 600 }
  });

  const scene = store.state.room.scenes.s1;
  assert.equal(scene.name, '酒場');
  assert.equal(scene.backgroundImage, 'https://example.com/bar.png');
  assert.equal(scene.showGrid, true, '指定が無ければマス目あり');
  assert.deepEqual(scene.panels, {});

  store.dispatch('REMOVE_SCENE', { id: 's1' });
  assert.equal(store.state.room.scenes.s1, undefined);
});

// ===========================================================================
// hydrate（サーバーから来た状態での置き換え）
// ===========================================================================

test('hydrate: 古い形の状態に既定値が補われる', () => {
  const store = newStore();

  store.hydrate({
    room: { name: '昔の部屋' },
    tokens: { t1: { id: 't1', name: 'アリス' } }
    // panels / cards / decks / chatTabs / chatLogs / infoEntries /
    // participants / round はどれも無い
  });

  const state = store.state;
  assert.deepEqual(state.panels, {});
  assert.deepEqual(state.cards, {});
  assert.deepEqual(state.decks, {});
  assert.deepEqual(state.infoEntries, []);
  assert.deepEqual(state.participants, {});
  assert.equal(state.round.active, false);

  // 固定タブとその空ログが補われる
  assert.deepEqual(state.chatTabs.map(t => t.id), [MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID]);
  assert.deepEqual(state.chatLogs[MAIN_CHAT_TAB_ID], []);
  assert.deepEqual(state.chatLogs[SYSTEM_CHAT_TAB_ID], []);

  // room 側の既定
  assert.equal(state.room.name, '昔の部屋');
  assert.ok(state.room.bcdiceSystem, 'BCDiceのシステムが補われる');
  assert.deepEqual(state.room.originalTables, {});
  assert.deepEqual(state.room.stamps, {});
  assert.deepEqual(state.room.deckTemplates, {});
  assert.deepEqual(state.room.audioTracks, {});
  assert.deepEqual(state.room.audioPlayback, { bgm: null, se: null });
  assert.deepEqual(state.room.scenes, {});
  assert.deepEqual(state.room.roundSettings, { useInitiativeProcess: false });
  // ルーム変数（現在のラウンド）は読み込んだ材料から計算し直される
  assert.equal(state.room.parameters['core:round'].value, 0);
});

test('hydrate: 取り込んだ部屋のスタンプに上限と形の整えが掛かる', () => {
  // 取り込んだ部屋データはreducerを通らずここへ直接入るので、上限もURLの許可リストも
  // hydrate側でもう一度掛かることを固定する（|| {} で済ませると素通しになる）。
  const store = newStore();

  const stamps = {};
  for (let i = 0; i < 40; i += 1) {
    stamps[`room:s${i}`] = { id: `room:s${i}`, label: `n${i}`, url: STAMP_URL, key: null };
  }
  // データURL・キーと中身の食い違い・名前空間の無いキーは、どれも通してはいけない
  stamps['room:bad'] = { id: 'room:bad', label: 'データURL', url: 'data:image/png;base64,AAAA' };
  stamps['room:mismatch'] = { id: 'room:other', label: 'ずれ', url: STAMP_URL };
  stamps.naked = { id: 'naked', label: '名前空間なし', url: STAMP_URL };

  store.hydrate({ room: { name: '取り込んだ部屋', stamps } });

  const kept = store.state.room.stamps;
  assert.equal(Object.keys(kept).length, 24, '上限で切られる');
  assert.equal(kept['room:bad'], undefined);
  assert.equal(kept['room:mismatch'], undefined);
  assert.equal(kept.naked, undefined);
  Object.entries(kept).forEach(([key, stamp]) => {
    assert.equal(stamp.id, key, 'キーと中身の公開IDは必ず一致する');
    assert.ok(key.startsWith('room:'));
  });
});

test('hydrate: 裏付けの無い「（スタンプ名）合計」は落ちる', () => {
  // 合計の変数は「集計するスタンプが在る」ことだけを裏付けに作られる。取り込んだ
  // 部屋データが変数だけを持っていても、更新されない数として残してはいけない。
  const store = newStore();

  store.hydrate({
    room: {
      name: '取り込んだ部屋',
      stamps: {
        'room:live': { id: 'room:live', label: '拍手', url: STAMP_URL, counted: true }
      },
      parameters: {
        'roomStampTotal:live': {
          key: 'live', label: '古い名前合計', value: 99, source: 'roomStampTotal',
          locked: true, editable: false, visible: true, roundOnly: false
        },
        'roomStampTotal:ghost': {
          key: 'ghost', label: '居ないスタンプ合計', value: 42, source: 'roomStampTotal',
          locked: true, editable: false, visible: true, roundOnly: false
        }
      }
    },
    participants: { p1: { id: 'p1', nickname: 'アリス' } },
    stampCounts: { 'room:live': { p1: 7 } }
  });

  const params = store.state.room.parameters;
  assert.equal(params['roomStampTotal:ghost'], undefined, '裏付けの無い変数は消える');
  assert.equal(params['roomStampTotal:live'].label, '拍手合計', '名前は今のスタンプ名から');
  assert.equal(params['roomStampTotal:live'].value, 7, '値は集計から計算し直される');
});

test('hydrate: 実在しないストッカーを指したカードは、盤面へ戻る（消さない）', () => {
  const store = newStore();

  store.hydrate({
    room: {},
    tokens: {},
    panels: {},
    cards: {
      // 箱だったパネルがもう無い。放っておくと、どこにも描かれず取り出す口も無いカードになる
      c1: { id: 'c1', x: 75, y: 50, stockerId: '消えたパネル', stockerSeq: 3 },
      c2: { id: 'c2' }
    }
  });

  const c1 = store.state.cards.c1;
  assert.ok(c1, 'カード自体は消さない');
  assert.equal(c1.stockerId, null, '行き場の無い収納先は外す');
  assert.equal(c1.stockerSeq, 0);
  assert.equal(c1.x, 75, '位置は保存されていたものをそのまま使う');
  assert.equal(c1.y, 50);
  assert.ok(store.state.cards.c2);
});

test('hydrate: STATE_CHANGED が出る', () => {
  const store = newStore();
  const seen = [];
  const saved = EventBus.listeners.STATE_CHANGED;
  EventBus.listeners.STATE_CHANGED = [(state) => seen.push(state)];

  try {
    store.hydrate({ room: {}, tokens: {} });
  } finally {
    if (saved === undefined) delete EventBus.listeners.STATE_CHANGED;
    else EventBus.listeners.STATE_CHANGED = saved;
  }

  assert.equal(seen.length, 1);
  assert.strictEqual(seen[0], store.state);
});
