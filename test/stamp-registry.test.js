// test/stamp-registry.test.js
// 「この部屋で使えるスタンプ」の判定（js/stamp-registry.js）。
//
// ここで守っているのは、部屋のスタンプが加わったことで生まれた2つの性質：
//   1. 部屋ごとに分かれていること（サーバーは1プロセスで多数の部屋を持つので、
//      部屋Aのスタンプが部屋Bで「実在するID」になると、知らない部屋の画面へ
//      画像を出せることになる）
//   2. 並び順が Core → プラグイン → 部屋 であること（GMが登録した名前に
//      Coreやプラグインのスタンプ名を奪わせない）

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  findStamp, findStampByName, isKnownStampId, listStamps, listStampLabels
} from '../js/stamp-registry.js';
import { isAllowedRoomStampUrl, roomStampPublicId } from '../js/store/stamps.js';
import { assetRef } from '../js/asset-store.js';
import { GM_ONLY_ACTIONS } from '../js/room-authority-rules.js';

const URL_A = 'https://example.invalid/rooms/room-1/a.png';

// 状態そのものは要らない。この表が見るのは room.activePlugin と room.stamps だけ。
function room({ activePlugin = null, stamps = {} } = {}) {
  return { activePlugin, stamps };
}

function roomStamp(localId, label, url = URL_A) {
  return { id: roomStampPublicId(localId), label, url, key: null };
}

test('部屋のスタンプは、その部屋の room を渡したときだけ実在する', () => {
  const withStamp = room({ stamps: { 'room:s1': roomStamp('s1', 'なるほど') } });
  const other = room();

  assert.equal(isKnownStampId('room:s1', withStamp), true);
  assert.equal(isKnownStampId('room:s1', other), false, '別の部屋では実在しない');

  // Coreのスタンプはどちらの部屋でも実在する（静的な表なので）
  assert.equal(isKnownStampId('ok', withStamp), true);
  assert.equal(isKnownStampId('ok', other), true);
});

test('同じプラグインの2部屋で、片方のスタンプがもう片方へ漏れない', () => {
  // 静的な半分（Core＋プラグイン）はキャッシュされる。合成後の一覧までキャッシュすると
  // ここが壊れる——キャッシュのキーに room が入っていないため。
  const a = room({ activePlugin: 'STELLA_KNIGHTS', stamps: { 'room:a': roomStamp('a', 'A') } });
  const b = room({ activePlugin: 'STELLA_KNIGHTS', stamps: { 'room:b': roomStamp('b', 'B') } });

  // 先にAを引いてキャッシュを温めてから、Bを見る
  assert.equal(isKnownStampId('room:a', a), true);
  assert.equal(isKnownStampId('room:a', b), false);
  assert.equal(isKnownStampId('room:b', a), false);
  assert.equal(isKnownStampId('room:b', b), true);

  // プラグインのスタンプは両方で実在したまま
  assert.equal(isKnownStampId('STELLA_KNIGHTS:bouquet', a), true);
  assert.equal(isKnownStampId('STELLA_KNIGHTS:bouquet', b), true);
});

test('並びは Core → プラグイン → 部屋', () => {
  const target = room({
    activePlugin: 'STELLA_KNIGHTS',
    stamps: { 'room:s1': roomStamp('s1', 'なるほど') }
  });

  const ids = listStamps(target).map(stamp => stamp.id);
  const pluginAt = ids.indexOf('STELLA_KNIGHTS:bouquet');
  const roomAt = ids.indexOf('room:s1');

  assert.equal(ids[0], 'ok', 'Coreが先頭');
  assert.ok(pluginAt > 0);
  assert.ok(roomAt > pluginAt, '部屋のスタンプは最後');
});

test('名前引き: GMが登録した名前でCoreやプラグインの名前は奪えない', () => {
  const target = room({
    activePlugin: 'STELLA_KNIGHTS',
    stamps: {
      'room:fake': roomStamp('fake', 'OK'),          // Coreの'ok'と同じラベル
      'room:fake2': roomStamp('fake2', 'ブーケ'),     // プラグインのラベル
      'room:solo': roomStamp('solo', 'なるほど')
    }
  });

  assert.equal(findStampByName('OK', target).id, 'ok');
  assert.equal(findStampByName('ブーケ', target).id, 'STELLA_KNIGHTS:bouquet');
  // 衝突していない名前は、部屋のスタンプが引ける
  assert.equal(findStampByName('なるほど', target).id, 'room:solo');
  // 公開IDでも、名前空間を落とした短い形でも指せる
  assert.equal(findStampByName('room:solo', target).id, 'room:solo');
  assert.equal(findStampByName('solo', target).id, 'room:solo');
});

test('案内文には部屋のスタンプの名前も並ぶ', () => {
  const target = room({ stamps: { 'room:s1': roomStamp('s1', 'なるほど') } });
  assert.ok(listStampLabels(target).includes('なるほど'));
});

test('引数をpluginIdのままにした呼び出しは黙って劣化せず落ちる', () => {
  // 文字列を渡すと room.activePlugin が undefined になり、Coreだけの一覧で動いてしまう。
  // 直し忘れがレビューをすり抜ける唯一の道なので、うるさく落とす。
  assert.throws(() => listStamps('STELLA_KNIGHTS'), TypeError);
});

test('roomが無くてもCoreのスタンプは引ける', () => {
  // 部屋の状態がまだ無い場面（起動直後など）でも表として成立すること
  assert.equal(isKnownStampId('ok', null), true);
  assert.equal(findStamp('ok', undefined).label, 'OK');
});

test('登録・削除はGM限定の表に載っている', () => {
  // この機能の安全性は「登録できるのはGMだけ」に還元される。画面側でメニュー項目を
  // 無効にしているのは案内であって制限ではなく、効いているのはこの表
  // （server/index.jsとjs/net-host.jsが両方これを見る）。外すと、誰でも
  // 「全員のブラウザに任意のURLを読ませる」ことができるようになる。
  assert.equal(GM_ONLY_ACTIONS.has('ADD_ROOM_STAMP'), true);
  assert.equal(GM_ONLY_ACTIONS.has('REMOVE_ROOM_STAMP'), true);
});

test('/asset/<hash> の形が、実体参照の組み立てと食い違わない', () => {
  // js/store/stamps.js の許可リストは js/asset-store.js・sw.js と同じ形の3つ目の写し。
  // 写しがずれると、P2P卓で登録した瞬間に弾かれるようになる。
  assert.equal(isAllowedRoomStampUrl(assetRef('a'.repeat(64))), true);
  assert.equal(isAllowedRoomStampUrl(assetRef('A'.repeat(64))), false, '16進は小文字だけ');
  assert.equal(isAllowedRoomStampUrl(assetRef('a'.repeat(63))), false);
});
