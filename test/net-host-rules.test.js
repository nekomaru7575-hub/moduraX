// ホスト権威P2Pのホスト役が使う判定（js/net-host-rules.js）のテスト。
//
// どれも境界で1つずれる種類の間違いをする場所で、しかも壊れ方が地味（記入中が消えない、
// 入室メッセージが2回出る、連打よけが1回多く通る）なので、目で見て気づきにくい。
// js/net-host.js本体はstoreとRTCPeerConnectionに触ってNodeから読めないため、
// 判定だけを純粋モジュールへ分けてここで押さえている。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MESSAGE_RATE_LIMIT, SAVE_POLICY, createFixedWindowLimiter, createSlidingWindowLimiter,
  entryMessageDecision, nextSaveDelay, typingUsersFrom
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

// --- 保存の先送り（末尾デバウンス） ---
// サーバーとP2P卓のホストが同じ policy を使う。間違えると「操作のたびに書く」（Redisを
// 叩き続ける）か「いつまでも書かない」（落ちたときに失う幅が広がる）のどちらかになる。

test('初回は debounce ぶんだけ待ち、期限が決まる', () => {
  const { delayMs, deadline } = nextSaveDelay({
    now: 1000, deadline: null, policy: { debounceMs: 100, maxWaitMs: 500 }
  });
  assert.equal(delayMs, 100);
  assert.equal(deadline, 1500);
});

test('操作が続く間は先送りされるが、期限は動かない', () => {
  const policy = { debounceMs: 100, maxWaitMs: 500 };
  let { deadline } = nextSaveDelay({ now: 1000, deadline: null, policy });
  // 50msごとに操作が続く
  for (const now of [1050, 1100, 1150]) {
    const next = nextSaveDelay({ now, deadline, policy });
    assert.equal(next.deadline, 1500, '期限は最初の未保存の変更から動かない');
    assert.equal(next.delayMs, 100, '毎回 debounce ぶん先送りされる');
    deadline = next.deadline;
  }
});

test('期限に近づいたら debounce より短く待つ', () => {
  const policy = { debounceMs: 100, maxWaitMs: 500 };
  // 期限は1500。1450での操作は、100待つと期限を50超えてしまう
  const { delayMs } = nextSaveDelay({ now: 1450, deadline: 1500, policy });
  assert.equal(delayMs, 50);
});

test('期限を過ぎていたら待たない', () => {
  const policy = { debounceMs: 100, maxWaitMs: 500 };
  const { delayMs } = nextSaveDelay({ now: 1600, deadline: 1500, policy });
  assert.equal(delayMs, 0);
});

test('保存の間隔はサーバーとホストで1か所から配る', () => {
  assert.equal(typeof SAVE_POLICY.debounceMs, 'number');
  assert.equal(typeof SAVE_POLICY.maxWaitMs, 'number');
  assert.ok(SAVE_POLICY.debounceMs < SAVE_POLICY.maxWaitMs, '上限は先送りより長いこと');
  assert.ok(Object.isFrozen(SAVE_POLICY));
});
