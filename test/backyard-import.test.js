// test/backyard-import.test.js
// 「部屋の全データ保存／読み込み」で、バックヤードのコマがGMの棚へ戻ることのテスト
// （js/state-import.js と CLAIM_RESTORED_BACKYARD の突き合わせ）。
//
// 棚の分け方（ownerId／backyardOwnerId）は元の部屋限りのIDなので、読み込んだ先では誰とも
// 一致しない。ここが抜けると、しまってあったコマは状態には残るのに誰の画面にも出ない——
// 黙って消えたのと同じに見えるので、境界を押さえておく。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { adoptImportedState } from '../js/state-import.js';
import { ImmutableStore, createInitialGameState } from '../js/game-store.js';

// 保存されたファイルの体裁。持ち主は「元の部屋の参加者ID」なので、この部屋の誰とも一致しない。
function savedFile({ backyardTokenIds, myBackyardTokenIds } = {}) {
  const state = {
    tokens: {
      onBoard: { id: 'onBoard', name: '盤面のコマ', x: 3, y: 4, ownerId: 'old-pl', inBackyard: false },
      gmShelf: { id: 'gmShelf', name: 'GMがしまったコマ', ownerId: 'old-gm', inBackyard: true },
      plShelf: { id: 'plShelf', name: 'PLがしまったコマ', ownerId: 'old-pl', inBackyard: true },
      guestShelf: {
        id: 'guestShelf', name: 'ゲストがしまったコマ', ownerId: null,
        backyardOwnerId: 'old-browser', inBackyard: true
      }
    },
    infoEntries: []
  };
  if (backyardTokenIds) state.backyardTokenIds = backyardTokenIds;
  if (myBackyardTokenIds) state.myBackyardTokenIds = myBackyardTokenIds;
  return state;
}

const ALL_SHELVED = ['gmShelf', 'plShelf', 'guestShelf'];

test('部屋の中から読み込むと、誰の棚にあったコマも読み込んだGMの棚へ入る', () => {
  const adopted = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), {
    participants: { gm: { id: 'gm', isGm: true } },
    myBackyardOwnerId: 'gm',
    myBackyardOwnerLocalId: 'browser-1'
  });

  ALL_SHELVED.forEach(id => {
    assert.equal(adopted.tokens[id].ownerId, 'gm', `${id} がGMの棚に入っていない`);
    assert.equal(adopted.tokens[id].inBackyard, true);
  });
});

test('盤面のコマは持ち主も座標も変わらない', () => {
  const adopted = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), {
    myBackyardOwnerId: 'gm'
  });

  assert.deepEqual(adopted.tokens.onBoard, savedFile().tokens.onBoard);
});

test('表示名が無い場合は、ブラウザ単位のIDの棚へ入る（元の持ち主は消す）', () => {
  const adopted = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), {
    myBackyardOwnerLocalId: 'browser-1'
  });

  ALL_SHELVED.forEach(id => {
    assert.equal(adopted.tokens[id].ownerId, null);
    assert.equal(adopted.tokens[id].backyardOwnerId, 'browser-1');
  });
});

test('旧フィールド名(myBackyardTokenIds)のファイルもそのまま戻せる', () => {
  const adopted = adoptImportedState(savedFile({ myBackyardTokenIds: ['gmShelf'] }), {
    myBackyardOwnerId: 'gm'
  });

  assert.equal(adopted.tokens.gmShelf.ownerId, 'gm');
  // 記録に無いコマは、記録がある以上そのまま（拾い直しは記録が無いときだけ）
  assert.equal(adopted.tokens.plShelf.ownerId, 'old-pl');
});

test('記録を持たない古いファイルは、inBackyardから拾い直してGMの棚へ入れる', () => {
  const adopted = adoptImportedState(savedFile(), { myBackyardOwnerId: 'gm' });

  ALL_SHELVED.forEach(id => assert.equal(adopted.tokens[id].ownerId, 'gm'));
  assert.equal(adopted.tokens.onBoard.ownerId, 'old-pl');
});

test('部屋の作成と同時の読み込みは、宛先が無いので印だけ付く', () => {
  const adopted = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), { participants: {} });

  ALL_SHELVED.forEach(id => {
    assert.equal(adopted.tokens[id].restoredFromImport, true);
    assert.equal(adopted.tokens[id].ownerId, null);
    assert.equal(adopted.tokens[id].backyardOwnerId, null);
    assert.equal(adopted.tokens[id].inBackyard, true);
  });
  assert.equal(adopted.tokens.onBoard.restoredFromImport, undefined);
});

test('印の付いたコマは、GMの引き取りで棚へ入る', () => {
  const adopted = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), { participants: {} });
  const store = new ImmutableStore(createInitialGameState());
  store.hydrate({ ...store.state, tokens: adopted.tokens, participants: { gm: { id: 'gm', isGm: true } } });

  store.dispatch('CLAIM_RESTORED_BACKYARD', { participantId: 'gm' });

  ALL_SHELVED.forEach(id => {
    assert.equal(store.state.tokens[id].ownerId, 'gm');
    assert.equal(store.state.tokens[id].inBackyard, true);
    assert.equal(store.state.tokens[id].restoredFromImport, undefined);
  });
  // 引き取り済みなら二度目は何もしない（印が無い＝撃ち直しても状態を作り直さない）
  const before = store.state;
  store.dispatch('CLAIM_RESTORED_BACKYARD', { participantId: 'gm' });
  assert.strictEqual(store.state, before);
});

test('印が付いていても盤面のコマは引き取らない（細工したファイル対策）', () => {
  const store = new ImmutableStore(createInitialGameState());
  store.hydrate({
    ...store.state,
    tokens: {
      fake: { id: 'fake', name: '盤面のコマ', inBackyard: false, ownerId: 'pl', restoredFromImport: true }
    }
  });

  store.dispatch('CLAIM_RESTORED_BACKYARD', { participantId: 'gm' });

  assert.equal(store.state.tokens.fake.ownerId, 'pl');
  assert.equal(store.state.tokens.fake.inBackyard, false);
});

test('ブラウザが均した状態をサーバーが均し直しても、GMの棚から出ない', () => {
  // 部屋の中からの読み込み。ブラウザ→サーバーへ渡るのは、記録(backyardTokenIds)を
  // 外した後の状態（js/net-sync.jsのreplaceState）。
  const browserPass = adoptImportedState(savedFile({ backyardTokenIds: ALL_SHELVED }), {
    participants: { gm: { id: 'gm', isGm: true } },
    myBackyardOwnerId: 'gm',
    myBackyardOwnerLocalId: 'browser-1'
  });
  assert.equal(browserPass.backyardTokenIds, undefined);

  const serverPass = adoptImportedState(browserPass, {
    participants: { gm: { id: 'gm', isGm: true } }
  });

  ALL_SHELVED.forEach(id => {
    assert.equal(serverPass.tokens[id].ownerId, 'gm', `${id} がGMの棚から出た`);
    assert.equal(serverPass.tokens[id].restoredFromImport, undefined);
  });
});

test('壊れた記録（存在しないID・__proto__・配列でない）でも落ちない', () => {
  const adopted = adoptImportedState(
    savedFile({ backyardTokenIds: ['gmShelf', 'nope', '__proto__', 'constructor'] }),
    { myBackyardOwnerId: 'gm' }
  );

  assert.equal(adopted.tokens.gmShelf.ownerId, 'gm');
  assert.equal(adopted.tokens.nope, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(adopted.tokens, '__proto__'), false);

  const broken = adoptImportedState({ ...savedFile(), backyardTokenIds: 'いろいろ' }, {
    myBackyardOwnerId: 'gm'
  });
  // 配列でない記録は「記録が無い」と同じ扱い＝inBackyardから拾い直す
  ALL_SHELVED.forEach(id => assert.equal(broken.tokens[id].ownerId, 'gm'));
});
