// ホスト権威P2Pのホスト役が使う判定（js/net-host-rules.js）のテスト。
//
// どれも境界で1つずれる種類の間違いをする場所で、しかも壊れ方が地味（記入中が消えない、
// 入室メッセージが2回出る、連打よけが1回多く通る）なので、目で見て気づきにくい。
// js/net-host.js本体はstoreとRTCPeerConnectionに触ってNodeから読めないため、
// 判定だけを純粋モジュールへ分けてここで押さえている。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MESSAGE_RATE_LIMIT, SNAPSHOT_INTERVAL_MS, createFixedWindowLimiter, createSlidingWindowLimiter,
  entryMessageDecision, nextSnapshotDelay, typingUsersFrom
} from '../js/net-host-rules.js';

// --- 窓を区切って数える方（メッセージ流量。server/index.jsのexceedsMessageRateの移植） ---

test('上限ちょうどまでは通り、次の1件から溢れる', () => {
  const limiter = createFixedWindowLimiter({ windowMs: 1000, max: 3 });
  assert.equal(limiter.exceeds(0), false);
  assert.equal(limiter.exceeds(1), false);
  assert.equal(limiter.exceeds(2), false);
  assert.equal(limiter.exceeds(3), true);
  assert.equal(limiter.exceeds(4), true);
});

test('窓をまたぐと数え直す', () => {
  const limiter = createFixedWindowLimiter({ windowMs: 1000, max: 2 });
  limiter.exceeds(0);
  limiter.exceeds(1);
  assert.equal(limiter.exceeds(2), true);
  // ちょうど窓の長さで新しい窓に入る（>= で判定しているので1000は次の窓）
  assert.equal(limiter.exceeds(1000), false);
});

test('メッセージ流量の上限はサーバーと同じ値を1か所から配る', () => {
  // server/index.jsのWS_MESSAGE_WINDOW_MS / WS_MAX_MESSAGES_PER_WINDOWがこれを読む。
  // 数字そのものを固定したいのではなく、両方に書かれていないことを守りたい。
  assert.equal(typeof MESSAGE_RATE_LIMIT.windowMs, 'number');
  assert.equal(typeof MESSAGE_RATE_LIMIT.max, 'number');
  assert.ok(Object.isFrozen(MESSAGE_RATE_LIMIT));
});

// --- 窓を滑らせて数える方（スタンプ。server/index.jsのallowStampの移植） ---

test('断った分は記録しないので、窓が抜ければすぐ押せる', () => {
  const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 2 });
  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(100), true);
  // 上限に達している。ここで断った回数を覚えてしまうと、待っても押せなくなる
  assert.equal(limiter.allow(200), false);
  assert.equal(limiter.allow(300), false);
  // 1件目が窓から出た時点で1枠空く
  assert.equal(limiter.allow(1000), true);
  // 2件目（100）はまだ窓の中なので、続けては押せない
  assert.equal(limiter.allow(1001), false);
});

// --- 記入中の一覧 ---

test('記入中の人だけを、名乗った順に並べる', () => {
  const users = typingUsersFrom([
    { participantId: 'a', name: 'あかり', isTyping: true },
    { participantId: 'b', name: 'ばん', isTyping: false },
    { participantId: 'c', name: 'ちひろ', isTyping: true }
  ]);
  assert.deepEqual(users, [{ id: 'a', name: 'あかり' }, { id: 'c', name: 'ちひろ' }]);
});

test('名乗っていない人は入らない', () => {
  const users = typingUsersFrom([
    { participantId: null, name: 'ゲスト', isTyping: true },
    { participantId: 'a', name: 'あかり', isTyping: true }
  ]);
  assert.deepEqual(users, [{ id: 'a', name: 'あかり' }]);
});

test('同じ人が2タブ開いていても1件だけ', () => {
  const users = typingUsersFrom([
    { participantId: 'a', name: 'あかり', isTyping: true },
    { participantId: 'a', name: 'あかり', isTyping: true }
  ]);
  assert.deepEqual(users, [{ id: 'a', name: 'あかり' }]);
});

test('片方のタブだけ記入をやめても、もう片方が記入中なら残る', () => {
  // サーバー側では「他の接続がまだ記入中か」を調べて消していた場所。
  // 導出にしたことで、順番に関わらず正しくなる。
  const stopFirst = typingUsersFrom([
    { participantId: 'a', name: 'あかり', isTyping: false },
    { participantId: 'a', name: 'あかり', isTyping: true }
  ]);
  assert.deepEqual(stopFirst, [{ id: 'a', name: 'あかり' }]);

  const stopSecond = typingUsersFrom([
    { participantId: 'a', name: 'あかり', isTyping: true },
    { participantId: 'a', name: 'あかり', isTyping: false }
  ]);
  assert.deepEqual(stopSecond, [{ id: 'a', name: 'あかり' }]);
});

test('表示名が空ならゲストに丸める', () => {
  const users = typingUsersFrom([{ participantId: 'a', name: '', isTyping: true }]);
  assert.deepEqual(users, [{ id: 'a', name: 'ゲスト' }]);
});

// --- 入室メッセージ ---

test('初めて名乗った人には出す', () => {
  const decision = entryMessageDecision({
    enabled: true, alreadyDecided: false, participantId: 'a', otherParticipantIds: ['b', null]
  });
  assert.deepEqual(decision, { announce: true, markDecided: true });
});

test('同じ人が既に別の接続で入っていれば出さないが、判断済みにはする', () => {
  // 判断済みにしないと、後から別のタブが閉じた拍子にもう一度出る
  const decision = entryMessageDecision({
    enabled: true, alreadyDecided: false, participantId: 'a', otherParticipantIds: ['a']
  });
  assert.deepEqual(decision, { announce: false, markDecided: true });
});

test('同じ接続で二度目以降の名乗りでは出さない', () => {
  // ブラウザは1接続でopen時・INIT受信時・NET_INITIALIZED経由と複数回IDENTIFYを送る
  const decision = entryMessageDecision({
    enabled: true, alreadyDecided: true, participantId: 'a', otherParticipantIds: []
  });
  assert.deepEqual(decision, { announce: false, markDecided: false });
});

test('部屋の設定で切ってあれば出さず、判断済みにもしない', () => {
  // 途中で設定を入れ直したときに、この接続のぶんが出せるようにしておく
  const decision = entryMessageDecision({
    enabled: false, alreadyDecided: false, participantId: 'a', otherParticipantIds: []
  });
  assert.deepEqual(decision, { announce: false, markDecided: false });
});

test('名乗っていない人には出さない', () => {
  const decision = entryMessageDecision({
    enabled: true, alreadyDecided: false, participantId: null, otherParticipantIds: []
  });
  assert.deepEqual(decision, { announce: false, markDecided: false });
});

// --- 控えを送る間引き（スロットル） ---
// サーバー側の保存デバウンスとは別物。あちらは既に手元にある状態を書くだけだが、
// こちらは状態を丸ごと回線で送るので、頻度がそのまま通信量になる。

test('まだ一度も送っていなければ待たない', () => {
  // 開いた直後に落ちた卓が丸ごと失われないように
  assert.equal(nextSnapshotDelay({ now: 1000, lastSentAt: null, intervalMs: 1000 }), 0);
});

test('前回から間隔が空くまで待つ', () => {
  assert.equal(nextSnapshotDelay({ now: 1000, lastSentAt: 1000, intervalMs: 5000 }), 5000);
  assert.equal(nextSnapshotDelay({ now: 3000, lastSentAt: 1000, intervalMs: 5000 }), 3000);
});

test('間隔が空いていればすぐ送ってよい', () => {
  assert.equal(nextSnapshotDelay({ now: 6000, lastSentAt: 1000, intervalMs: 5000 }), 0);
  assert.equal(nextSnapshotDelay({ now: 99999, lastSentAt: 1000, intervalMs: 5000 }), 0);
});

test('操作が続いても控えは遅れない（デバウンスとの違い）', () => {
  // デバウンスなら「操作が途切れるまで送らない」ので、遊び続けている卓ほど控えが古くなる。
  // 間引きは前回からの経過だけを見るので、活動の多寡に関わらず上限が守られる。
  const intervalMs = 5000;
  const lastSentAt = 1000;
  const delays = [1100, 1200, 1300, 1400].map(
    (now) => nextSnapshotDelay({ now, lastSentAt, intervalMs })
  );
  assert.deepEqual(delays, [4900, 4800, 4700, 4600], '待ち時間は縮んでいく（延びない）');
});

test('控えの間隔は、失って困る幅として決めてある', () => {
  // 数字そのものを固定したいのではなく、サーバー側の保存デバウンス（1秒）と桁が
  // 違うこと＝別の理由で決まっていることを守りたい。
  assert.ok(SNAPSHOT_INTERVAL_MS >= 60 * 1000, '分の単位であること');
});
