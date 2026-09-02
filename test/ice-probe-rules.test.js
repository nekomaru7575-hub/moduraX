// 「この回線からP2Pが張れるか」の判定（js/ice-probe-rules.js）のテスト。
//
// ここを読み違えると**結論が逆になる**：TURNが要るのに「要らない」と言えば、当日に
// 繋がらない人が出る。逆に全員へ「要る」と言えば、要らないTURNの費用と帯域を払うことになる。
// 実際の候補は環境ごとに違って再現できないので、判定だけを固定して押さえる。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyNatMapping, countCandidateTypes, verdictSummary, shareableLine, browserHint
} from '../js/ice-probe-rules.js';

const GOOGLE = 'stun:stun.l.google.com:19302';
const CLOUDFLARE = 'stun:stun.cloudflare.com:3478';

// --- 種類を数える ---

test('種類ごとに数える', () => {
  const counts = countCandidateTypes([
    { type: 'host' }, { type: 'host' }, { type: 'srflx' }, { type: 'relay' }, { type: '謎' }
  ]);
  assert.deepEqual(counts, { host: 2, srflx: 1, prflx: 0, relay: 1, other: 1 });
});

test('空でも落ちない', () => {
  assert.deepEqual(countCandidateTypes(null), { host: 0, srflx: 0, prflx: 0, relay: 0, other: 0 });
});

// --- NATの穴の開け方 ---

test('宛先が変わっても同じ住所なら、直接つながる見込み', () => {
  // 2つのSTUNが同じ答えを返し、ブラウザが重複として1件に畳んだ形
  const result = classifyNatMapping([
    { type: 'host', address: '192.168.0.5', port: 50000 },
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: CLOUDFLARE }
  ], { reachableServers: 2 });
  assert.equal(result.verdict, 'endpoint-independent');
});

test('同じ足元なのに宛先ごとにポートが違えば、TURNが要る', () => {
  const result = classifyNatMapping([
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 40002, relatedPort: 50000, url: CLOUDFLARE }
  ], { reachableServers: 2 });
  assert.equal(result.verdict, 'address-or-port-dependent');
});

test('外側の住所が1つも取れなければ、STUNに届いていない', () => {
  const result = classifyNatMapping([{ type: 'host', address: '192.168.0.5', port: 50000 }],
    { reachableServers: 2 });
  assert.equal(result.verdict, 'no-srflx');
});

test('片方のSTUNしか答えていなければ、同じに見えても判断しない', () => {
  // これを endpoint-independent と読むと、**Symmetricの回線を「大丈夫」と誤診する**
  const result = classifyNatMapping([
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE }
  ], { reachableServers: 1 });
  assert.equal(result.verdict, 'inconclusive');
});

test('両方のSTUNが届くのに答えが1つなら、畳まれたと読む', () => {
  // ブラウザは同じ住所の候補を重複として捨てる。**「1件しか出てこなかった」が
  // 正常な合格の見え方**で、ここを判断保留にすると誰も判定できない
  const result = classifyNatMapping([
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE }
  ], { reachableServers: 2 });
  assert.equal(result.verdict, 'endpoint-independent');
});

test('足元が違うポートどうしは比べない', () => {
  // ローカルの穴が別なら外側のポートが違って当たり前。これをSymmetricと読むと
  // **どんな回線でもTURN必須という誤診**になる
  const result = classifyNatMapping([
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: CLOUDFLARE },
    { type: 'srflx', address: '203.0.113.9', port: 47777, relatedPort: 50001, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 47777, relatedPort: 50001, url: CLOUDFLARE }
  ], { reachableServers: 2 });
  assert.equal(result.verdict, 'endpoint-independent');
});

test('IPv4とIPv6が両方あっても、片方がSymmetricなら要TURN側に倒す', () => {
  const result = classifyNatMapping([
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 40001, relatedPort: 50000, url: CLOUDFLARE },
    { type: 'srflx', address: '203.0.113.9', port: 41000, relatedPort: 50002, url: GOOGLE },
    { type: 'srflx', address: '203.0.113.9', port: 41001, relatedPort: 50002, url: CLOUDFLARE }
  ], { reachableServers: 2 });
  assert.equal(result.verdict, 'address-or-port-dependent');
});

// --- 人に見せる文 ---

test('TURNが無い状態でSymmetricなら、はっきり「入れない」と言う', () => {
  const s = verdictSummary('address-or-port-dependent', false);
  assert.equal(s.level, 'ng');
  assert.match(s.headline, /つながりません/);
});

test('TURNがあればSymmetricでも警告どまり', () => {
  const s = verdictSummary('address-or-port-dependent', true);
  assert.equal(s.level, 'warn');
});

test('直接つながる見込みならok', () => {
  assert.equal(verdictSummary('endpoint-independent', false).level, 'ok');
});

// --- 貼って返す一行 ---

test('貼って返す一行にグローバルIPを載せない', () => {
  const line = shareableLine({
    verdict: 'address-or-port-dependent',
    counts: { host: 2, srflx: 2, relay: 0 },
    gatherMs: 320,
    relayWorked: null,
    userAgentHint: 'Chrome'
  });
  assert.match(line, /判定=address-or-port-dependent/);
  assert.match(line, /中継のみ=未実施/);
  // 判定に住所そのものは使っていないので、載せる理由が無い
  assert.equal(/\d+\.\d+\.\d+\.\d+/.test(line), false);
});

test('ブラウザはおおまかに丸める', () => {
  assert.equal(browserHint('Mozilla/5.0 ... Chrome/141 Safari/537.36'), 'Chrome');
  assert.equal(browserHint('Mozilla/5.0 ... Chrome/141 Safari/537.36 Edg/141'), 'Edge');
  assert.equal(browserHint('Mozilla/5.0 (iPhone) ... Version/17 Safari/605'), 'Safari(iOS)');
  assert.equal(browserHint('Mozilla/5.0 ... Firefox/130'), 'Firefox');
  assert.equal(browserHint(''), 'その他');
});
