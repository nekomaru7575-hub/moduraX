// 「ファイルから作るP2P卓」で、読み込んだ状態を部屋一覧ページから盤面ページへ渡す仕組みの
// テスト（js/p2p-import-handoff.js と js/state-import.js の突き合わせ）。
//
// ここが壊れると、読み込んだはずの部屋が空で始まる（渡らない）か、逆に別の部屋に前の
// ファイルが流れ込む（消えない）。どちらも黙って起きるので、境界だけは押さえておく。

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { buildRoomStateFromImport } from '../js/state-import.js';

// sessionStorageはNodeに無い。中身より「入らなかったときに諦められるか」を見たいので、
// 容量の上限を持たせられる最小限のものを自前で置く。
function installSessionStorage({ limitBytes = Infinity } = {}) {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      const text = String(value);
      if (text.length > limitBytes) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      map.set(key, text);
    },
    removeItem: (key) => { map.delete(key); },
    get size() { return map.size; }
  };
  return globalThis.sessionStorage;
}

// モジュールは読み込み時ではなく呼び出し時にsessionStorageを見るので、各テストで
// 差し替えてから読み込めばよい（importは1回で済む）。
const { stashPendingImport, commitPendingImport, takePendingImport, clearPendingImport } =
  await import('../js/p2p-import-handoff.js');

beforeEach(() => { installSessionStorage(); });

test('控えて宛先を決めれば、その部屋で取り出せる', () => {
  assert.equal(stashPendingImport({ room: { name: '卓' }, tokens: [] }), true);
  commitPendingImport('room-abc');
  const taken = takePendingImport('room-abc');
  assert.deepEqual(taken.room, { name: '卓' });
});

test('宛先を決める前は取り出せない（作成に失敗した場合）', () => {
  stashPendingImport({ room: { name: '卓' } });
  assert.equal(takePendingImport('room-abc'), null);
});

test('別の部屋では取り出せない', () => {
  stashPendingImport({ room: { name: '卓' } });
  commitPendingImport('room-abc');
  assert.equal(takePendingImport('room-zzz'), null);
});

test('一度取り出したら消える（同じ部屋を開き直しても繰り返さない）', () => {
  stashPendingImport({ room: { name: '卓' } });
  commitPendingImport('room-abc');
  assert.notEqual(takePendingImport('room-abc'), null);
  assert.equal(takePendingImport('room-abc'), null);
});

test('容量に入らなければ諦める（呼び出し側がサーバーへ送り直せるように）', () => {
  installSessionStorage({ limitBytes: 32 });
  assert.equal(stashPendingImport({ room: { name: 'あ'.repeat(200) } }), false);
  commitPendingImport('room-abc');
  assert.equal(takePendingImport('room-abc'), null);
});

test('sessionStorageが使えない環境でも投げない', () => {
  globalThis.sessionStorage = {
    getItem() { throw new Error('無効'); },
    setItem() { throw new Error('無効'); },
    removeItem() { throw new Error('無効'); }
  };
  assert.equal(stashPendingImport({ a: 1 }), false);
  assert.equal(takePendingImport('room-abc'), null);
  assert.doesNotThrow(() => clearPendingImport());
});

test('壊れた控えは無かったことにする', () => {
  const storage = installSessionStorage();
  storage.setItem('mojulaX:p2pImport:state', '{壊れている');
  storage.setItem('mojulaX:p2pImport:room', 'room-abc');
  assert.equal(takePendingImport('room-abc'), null);
});

test('__proto__は読み直しでも落とす', () => {
  const storage = installSessionStorage();
  storage.setItem('mojulaX:p2pImport:state', '{"room":{"name":"卓"},"__proto__":{"polluted":1}}');
  storage.setItem('mojulaX:p2pImport:room', 'room-abc');
  const taken = takePendingImport('room-abc');
  assert.equal(Object.prototype.hasOwnProperty.call(taken, '__proto__'), false);
  assert.equal({}.polluted, undefined);
});

// --- フォームの入力とファイルの中身の突き合わせ ---
// サーバー（部屋作成）とブラウザ（P2P卓）が同じ関数を通す。ずれると「通常卓では読み込めた
// のにP2P卓では設定が違う」という形で出る。

const validPluginIds = new Set(['sw25', 'coc7']);

test('部屋名はフォームの入力で上書きする', () => {
  const state = buildRoomStateFromImport(
    { room: { name: 'ファイル側の名前' } },
    { name: '入力した名前', activePlugin: null, bcdiceSystem: 'DiceBot', validPluginIds }
  );
  assert.equal(state.room.name, '入力した名前');
});

test('プラグインとシステムはファイル側を優先する', () => {
  const state = buildRoomStateFromImport(
    { room: { activePlugin: 'sw25', bcdiceSystem: 'SwordWorld2.5' } },
    { name: '卓', activePlugin: 'coc7', bcdiceSystem: 'DiceBot', validPluginIds }
  );
  assert.equal(state.room.activePlugin, 'sw25');
  assert.equal(state.room.bcdiceSystem, 'SwordWorld2.5');
});

test('ファイル側に無ければフォームの選択を使う', () => {
  const state = buildRoomStateFromImport(
    { room: {} },
    { name: '卓', activePlugin: 'coc7', bcdiceSystem: 'DiceBot', validPluginIds }
  );
  assert.equal(state.room.activePlugin, 'coc7');
  assert.equal(state.room.bcdiceSystem, 'DiceBot');
});

test('このサーバーに無いプラグインがファイルに書いてあれば採らない', () => {
  const state = buildRoomStateFromImport(
    { room: { activePlugin: '知らないプラグイン' } },
    { name: '卓', activePlugin: 'coc7', bcdiceSystem: 'DiceBot', validPluginIds }
  );
  assert.equal(state.room.activePlugin, 'coc7');
});

test('ファイル側の参加者は捨てる（GMの印ごと）', () => {
  const state = buildRoomStateFromImport(
    { room: {}, participants: { abc: { name: '前のGM', isGm: true } } },
    { name: '卓', activePlugin: null, bcdiceSystem: 'DiceBot', validPluginIds }
  );
  assert.deepEqual(state.participants, {});
});
