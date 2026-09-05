// 棚（js/token-library.js）のうち、ブラウザに依存しない部分のテスト。
//
// IndexedDBが要る出し入れはここでは撃てない（Nodeに無い）ので、ブラウザで動かして
// 確かめる（test/asset-store.test.js と同じ姿勢。偽物のIndexedDBを立てても、
// 確かめられるのは偽物の挙動でしかない）。ここで押さえるのは、間違えても画面には
// 出ず、後から気づけない種類のもの：
//   ・保存された形の検分（緩いと、壊れた1行で棚の描画ごと落ちる）
//   ・一覧用の控え（name / pluginId）が中身とズレないこと
//   ・上限に当たったときに**捨てずに断る**こと。捨てると利用者の作ったものが消える

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_LIBRARY_ENTRY_BYTES, buildLibraryEntry, canBringIntoRoom, estimateEntryBytes, normalizeLibraryEntry
} from '../js/token-library.js';
import { TOKEN_SNAPSHOT_FORMAT, buildTokenSnapshot } from '../js/character-snapshot.js';

function snapshotOf(name = 'アリス') {
  return { __format: TOKEN_SNAPSHOT_FORMAT, name, color: '#fff', parameters: {}, components: {} };
}

function entryOf(overrides = {}) {
  return {
    id: 'libtoken-1', name: 'アリス', pluginId: 'DX3',
    savedAt: 1000, updatedAt: 2000, snapshot: snapshotOf(), ...overrides
  };
}

// --- 保存された形の検分 ---

test('揃っている行はそのまま通る', () => {
  const entry = normalizeLibraryEntry(entryOf());
  assert.equal(entry.id, 'libtoken-1');
  assert.equal(entry.name, 'アリス');
  assert.equal(entry.pluginId, 'DX3');
  assert.equal(entry.updatedAt, 2000);
});

test('復元できない行は落とす', () => {
  // スナップショットのマーカーが無い＝復元しても何も作れない
  assert.equal(normalizeLibraryEntry(entryOf({ snapshot: { name: 'マーカー無し' } })), null);
  assert.equal(normalizeLibraryEntry(entryOf({ snapshot: null })), null);
  // idが無い・文字列でない行は、消すことも編集することもできない
  assert.equal(normalizeLibraryEntry(entryOf({ id: '' })), null);
  assert.equal(normalizeLibraryEntry(entryOf({ id: 42 })), null);
  // そもそもオブジェクトでない
  assert.equal(normalizeLibraryEntry(null), null);
  assert.equal(normalizeLibraryEntry('libtoken-1'), null);
});

test('控えが欠けていても中身から拾い直す', () => {
  // 一覧用の name はあくまで控え。無ければスナップショット側が正
  const entry = normalizeLibraryEntry(entryOf({ name: undefined }));
  assert.equal(entry.name, 'アリス');

  // どちらも空なら、名前の無い行として並べる（落とさない：中身は復元できる）
  const noName = normalizeLibraryEntry(entryOf({ name: '  ', snapshot: snapshotOf('') }));
  assert.equal(noName.name, '名称未設定');
});

test('壊れた時刻は0として扱い、行は残す', () => {
  const entry = normalizeLibraryEntry(entryOf({ savedAt: 'きのう', updatedAt: undefined }));
  assert.equal(entry.savedAt, 0);
  assert.equal(entry.updatedAt, 0, '更新時刻が無ければ保存時刻へ落ちる');
});

test('プラグインなしはnullに揃える', () => {
  assert.equal(normalizeLibraryEntry(entryOf({ pluginId: '' })).pluginId, null);
  assert.equal(normalizeLibraryEntry(entryOf({ pluginId: 42 })).pluginId, null);
});

test('長すぎる名前は切り詰めて通す', () => {
  const entry = normalizeLibraryEntry(entryOf({ name: 'あ'.repeat(200) }));
  assert.equal(entry.name.length, 60);
});

// --- 一覧用の控えを作る ---

test('コマから1件を組み立てると、名前とシステムが外へ出る', () => {
  const token = { name: 'ボブ', color: '#0f0', parameters: {}, components: {}, buffs: [] };
  const entry = buildLibraryEntry(token, 'SHINOBIGAMI');

  assert.equal(entry.name, 'ボブ');
  assert.equal(entry.pluginId, 'SHINOBIGAMI');
  assert.equal(entry.snapshot.__format, TOKEN_SNAPSHOT_FORMAT);
  assert.equal(entry.snapshot.name, 'ボブ', '中身は buildTokenSnapshot がそのまま作る');
  assert.deepEqual(entry.snapshot, buildTokenSnapshot(token));
  assert.ok(entry.id.startsWith('libtoken-'));
  assert.equal(entry.savedAt, entry.updatedAt, '新規は保存＝更新');
});

test('idを渡すと上書き。最初に保存した時刻は保つ', () => {
  const token = { name: 'ボブ', parameters: {}, components: {} };
  const entry = buildLibraryEntry(token, null, { id: 'libtoken-9', savedAt: 111 });

  assert.equal(entry.id, 'libtoken-9');
  assert.equal(entry.savedAt, 111, '「いつ作ったか」は編集で変えない');
  assert.ok(entry.updatedAt > 111, '「いつ更新したか」は今');
});

test('組み立てた1件はそのまま検分を通る', () => {
  // buildLibraryEntry と normalizeLibraryEntry の形が食い違うと、
  // 保存した直後の1件が一覧から消える——気づきにくいので固定する
  const entry = buildLibraryEntry({ name: 'アリス', parameters: {}, components: {} }, 'DX3');
  assert.deepEqual(normalizeLibraryEntry(entry), entry);
});

// --- 大きさ ---

test('大きさの見積もりは測れないものを通さない側に倒す', () => {
  assert.ok(estimateEntryBytes(entryOf()) > 0);

  const circular = entryOf();
  circular.self = circular;
  assert.equal(estimateEntryBytes(circular), Number.POSITIVE_INFINITY,
    '測れないものを0とすると、上限をすり抜ける');
});

test('1件の上限はサーバーの画像の上限と揃っている', () => {
  // ここが緩いと「棚には入るのに部屋へ持ち込めない」コマができる
  assert.equal(MAX_LIBRARY_ENTRY_BYTES, 8 * 1024 * 1024);
});

// --- 部屋との相性（バックヤードへ引き込む候補の絞り込み） ---
// ここを間違えても画面はエラーを出さない。出るはずのコマが出ない／出てはいけない
// コマが出る、という形でしか現れないので、境目を固定しておく。

test('同じシステムのコマは持ち込める', () => {
  assert.equal(canBringIntoRoom(entryOf({ pluginId: 'DX3' }), 'DX3'), true);
});

test('違うシステムのコマは候補に出さない', () => {
  assert.equal(canBringIntoRoom(entryOf({ pluginId: 'DX3' }), 'SHINOBIGAMI'), false);
  assert.equal(canBringIntoRoom(entryOf({ pluginId: 'DX3' }), null), false,
    'プラグインなしの部屋も「違うシステム」に含める');
});

test('プラグインなしのコマはどの部屋でも持ち込める', () => {
  // 本体機能のパラメータしか持たないので、どのシステムでも同じに扱える
  assert.equal(canBringIntoRoom(entryOf({ pluginId: null }), 'DX3'), true);
  assert.equal(canBringIntoRoom(entryOf({ pluginId: null }), null), true);
});

test('壊れた行を渡してもプラグインなし扱いで落ちない', () => {
  assert.equal(canBringIntoRoom(null, 'DX3'), true);
  assert.equal(canBringIntoRoom({}, 'DX3'), true);
});
