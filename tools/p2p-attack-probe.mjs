// tools/p2p-attack-probe.mjs — P2P卓の口だけを狙う攻撃テスト
//
// 共通の攻撃一式（.claude/skills/security-attack-test/scripts/run-attacks.mjs）は
// 従来卓を前提にできていて、P2P卓では撃てない——P2P卓は普通のWebSocketを4010で断るので、
// 名乗りもチャットも「0回応答」になり、守れているのか入れていないだけなのか見分けが付かない。
// この2つは補い合う関係なので、両方を撃つこと。
//
//   node tools/p2p-attack-probe.mjs http://localhost:8085
//
// **必ずサーバーを起動し直してから撃つ。** 部屋作成の回数制限は10分残るので、共通の一式を
// 撃った後にそのまま続けると部屋を作れず、全部が「NG」に見える（実際に踏んだ）。
// 残骸には __probe__ の目印を付けてあるので、clean-test-data.mjs で片付けられる。
//
// 確かめていること:
//   1. P2P卓へ従来のWebSocketで入っても部屋の中身を渡さない（4010）
//      渡すと、その人はサーバー権威・ホストは自分が権威で**黙って2つに割れる**
//   2. シグナリング接続から状態を動かせない
//      動かせると、サーバー側に第2の権威ができて2つの部屋データが静かに食い違う。
//      同時に「P2P卓ではRedisへ書かない」ことの担保でもある
//   3. ホスト役を横取りできない（誰が務めているかを覚えているのはサーバーだけ）
//      横取りできると、GMのタブにしか無い部屋の中身が空の種で上書きされて消える
//   4. 従来卓では中継そのものを開かない
//      開けておくと「同じ部屋の他人へ任意のJSONを転送させる口」だけが残る
//   5. SIGNALが部屋の外へ出ない
//
// 撃つ相手は検証用サーバーだけ。本番URLへは撃たない。
import { WebSocket } from 'ws';
import { gzipSync } from 'node:zlib';

const BASE = process.argv[2] || 'http://localhost:8085';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(BASE)) {
  console.error('検証用サーバーにだけ撃つこと');
  process.exit(2);
}
const WS_BASE = BASE.replace(/^http/, 'ws');

let pass = 0;
let fail = 0;
function check(ok, label, note = '') {
  if (ok) { pass += 1; console.log(`  OK  ${label}${note ? '  ' + note : ''}`); }
  else { fail += 1; console.log(`  NG  ${label}${note ? '  ' + note : ''}`); }
}

async function createRoom(name, p2p, entryPassword) {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, p2p, entryPassword })
  });
  return res.json();
}

// 1本つないで、受け取ったメッセージと切断コードを集める
function connect(roomId, { net } = {}) {
  const query = `?room=${encodeURIComponent(roomId)}${net ? `&net=${net}` : ''}`;
  const ws = new WebSocket(WS_BASE + '/' + query);
  const got = [];
  const state = { closeCode: null, ws, got };
  state.ready = new Promise((resolve) => {
    ws.on('message', (data) => {
      try { got.push(JSON.parse(data.toString())); } catch { /* 読めないものは無視 */ }
    });
    ws.on('close', (code) => { state.closeCode = code; resolve('closed'); });
    ws.on('error', () => { /* closeで拾う */ });
    ws.on('open', () => resolve('open'));
  });
  state.send = (message) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  return state;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- ここから ---

console.log(`撃つ相手: ${BASE}\n`);

const p2pRoom = await createRoom('__probe__P2P攻撃', true);
const normalRoom = await createRoom('__probe__従来攻撃', false);
console.log(`P2P卓: ${p2pRoom.id} / 従来卓: ${normalRoom.id}\n`);

console.log('[1] P2P卓へ従来のWebSocketで入る（中身を渡してはいけない）');
{
  const c = connect(p2pRoom.id);
  await c.ready;
  await wait(400);
  check(c.closeCode === 4010, '4010で断られる', `(closeコード ${c.closeCode})`);
  check(!c.got.some((m) => m.type === 'INIT'), 'INIT（部屋の中身）を渡していない');
  c.ws.close();
}

console.log('\n[2] シグナリング接続から部屋の状態を動かす（サーバーに第2の権威を作らせない）');
{
  const c = connect(p2pRoom.id, { net: 'rtc' });
  await c.ready;
  await wait(300);
  check(c.got.some((m) => m.type === 'INIT'), 'シグナリングとしては入れる（種を受け取る）');

  // 状態を変える種類のメッセージを片端から投げる
  c.send({ type: 'ACTION', action: 'ADD_CHAT_MESSAGE', payload: { tabId: 'main', entry: { name: '__probe__', text: '__probe__侵入' } } });
  c.send({ type: 'ACTION', action: 'SET_ROOM_NAME', payload: { name: '__probe__書き換え' } });
  c.send({ type: 'REPLACE_STATE', state: { room: { name: '__probe__置き換え' }, tokens: {}, participants: {} } });
  c.send({ type: 'SEND_STAMP', stampId: 'ok' });
  c.send({ type: 'TYPING_START' });
  c.send({ type: 'REQUEST_CHAT_SEND_SOUND' });
  await wait(700);

  // サーバー側の部屋がどうなったかは、入り直して種を見れば分かる
  const probe = connect(p2pRoom.id, { net: 'rtc' });
  await probe.ready;
  await wait(400);
  const seed = probe.got.find((m) => m.type === 'INIT')?.state;
  check((seed?.chatLogs?.main || []).length === 0, 'サーバー側の部屋に発言が入っていない');
  check(seed?.room?.name === '__probe__P2P攻撃', '部屋名が書き換えられていない', `(${seed?.room?.name})`);
  check(!probe.got.some((m) => m.type === 'ACTION'), '他のシグナリング接続へACTIONが漏れていない');
  probe.ws.close();
  c.ws.close();
}

console.log('\n[3] ホスト役の横取り（名乗りを検算できるのはサーバーだけ）');
{
  const host = connect(p2pRoom.id, { net: 'rtc' });
  await host.ready;
  await wait(300);
  host.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  const hostWelcome = host.got.find((m) => m.type === 'SIGNAL_WELCOME');
  check(hostWelcome?.role === 'host', '先に来た資格者はホストになれる', `(role: ${hostWelcome?.role})`);

  const thief = connect(p2pRoom.id, { net: 'rtc' });
  await thief.ready;
  await wait(300);
  thief.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  const thiefWelcome = thief.got.find((m) => m.type === 'SIGNAL_WELCOME');
  check(thiefWelcome?.role === 'guest', '2人目はホストになれない', `(role: ${thiefWelcome?.role})`);
  check(thiefWelcome?.hostPeerId === hostWelcome?.peerId, '2人目には本物のホストが案内される');

  // 名乗りを繰り返してもホストにはなれない
  thief.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(200);
  const welcomes = thief.got.filter((m) => m.type === 'SIGNAL_WELCOME');
  check(welcomes.length === 1, 'SIGNAL_HELLOは1接続1回だけ', `(${welcomes.length}回)`);

  thief.ws.close();
  host.ws.close();
  await wait(200);
}

console.log('\n[4] 従来卓でシグナリングを使おうとする（中継を開かない）');
{
  const c = connect(normalRoom.id, { net: 'rtc' });
  await c.ready;
  await wait(400);
  check(c.got.some((m) => m.type === 'SIGNAL_UNAVAILABLE'), '使えないと即座に返す（8秒待たせない）');
  c.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  check(!c.got.some((m) => m.type === 'SIGNAL_WELCOME'), '従来卓ではホスト役を配らない');
  // 従来卓としては普通に動くこと（?net=rtc を付けただけで壊れない）
  check(c.got.some((m) => m.type === 'INIT'), '従来卓としては今までどおり入れる');
  c.ws.close();
}

console.log('\n[5] SIGNALの中継が部屋の外へ出ない');
{
  const a = connect(p2pRoom.id, { net: 'rtc' });
  const b = connect(normalRoom.id, { net: 'rtc' });
  await Promise.all([a.ready, b.ready]);
  await wait(300);
  a.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  const aId = a.got.find((m) => m.type === 'SIGNAL_WELCOME')?.peerId;
  b.send({ type: 'SIGNAL', to: aId, payload: { sdp: '__probe__別の部屋から' } });
  await wait(400);
  check(!a.got.some((m) => m.type === 'SIGNAL'), '別の部屋からは届かない');
  a.ws.close();
  b.ws.close();
}

console.log('\n[6] 控え（HOST_SNAPSHOT）を書けるのはホストだけ');
{
  // P2P卓の永続化は「ホストが部屋の中身を丸ごと送り、サーバーが保存する」形
  // （js/host-persistence.js）。ここが空いていると、同じ部屋の誰でも保存先を好きな内容へ
  // 上書きできる——ACTIONの権限判定を全部迂回する口になる。
  const room = await createRoom('__probe__控え攻撃', true);

  const host = connect(room.id, { net: 'rtc' });
  await host.ready;
  await wait(300);
  host.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  check(host.got.find((m) => m.type === 'SIGNAL_WELCOME')?.role === 'host', '先にホストを取る');

  // ホストが正しい控えを預ける
  host.send({ type: 'HOST_SNAPSHOT', state: { room: { name: '__probe__控え攻撃', bcdiceSystem: 'DiceBot' }, chatLogs: { main: [{ text: '__probe__ホストの控え' }] } } });
  await wait(1500);

  // 参加者が偽の控えを送る
  const thief = connect(room.id, { net: 'rtc' });
  await thief.ready;
  await wait(300);
  thief.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  check(thief.got.find((m) => m.type === 'SIGNAL_WELCOME')?.role === 'guest', '2人目は参加者');
  thief.send({ type: 'HOST_SNAPSHOT', state: { room: { name: '__probe__乗っ取り' }, chatLogs: { main: [{ text: '__probe__偽の控え' }] } } });

  // SIGNAL_HELLOすら送っていない接続からも試す
  const stranger = connect(room.id, { net: 'rtc' });
  await stranger.ready;
  await wait(300);
  stranger.send({ type: 'HOST_SNAPSHOT', state: { room: { name: '__probe__名乗らず' } } });
  await wait(1500);

  host.ws.close();
  thief.ws.close();
  stranger.ws.close();
  await wait(300);

  // 入り直して種を見れば、保存先が書き換わったかが分かる
  const after = connect(room.id, { net: 'rtc' });
  await after.ready;
  await wait(500);
  const seed = after.got.find((m) => m.type === 'INIT')?.state;
  check(seed?.room?.name === '__probe__控え攻撃', '参加者の控えで部屋が書き換わらない', `(${seed?.room?.name})`);
  check((seed?.chatLogs?.main || []).every((e) => e.text !== '__probe__偽の控え'), '偽の控えの中身が残らない');
  check((seed?.chatLogs?.main || []).some((e) => e.text === '__probe__ホストの控え'), 'ホストの控えはちゃんと保存されている');
  after.ws.close();
}

console.log('\n[7] 圧縮した控えで膨らませない（zip爆弾）');
{
  // 控えはgzipで送られてくる（js/host-persistence.js）。展開後の大きさを縛っていないと、
  // **数KBの本文でこのプロセスを落とせる**——同居している全部屋が巻き添えで切断される。
  const room = await createRoom('__probe__zip爆弾', true);
  const host = connect(room.id, { net: 'rtc' });
  await host.ready;
  await wait(300);
  host.send({ type: 'SIGNAL_HELLO', wantsHost: true });
  await wait(300);
  check(host.got.find((m) => m.type === 'SIGNAL_WELCOME')?.role === 'host', 'ホストになる');

  // 500MBのゼロ列をgzipすると数百KB。展開させれば一発でメモリを食い潰せる
  const bomb = gzipSync(Buffer.alloc(500 * 1024 * 1024), { level: 9 });
  check(bomb.length < 1024 * 1024, '本文自体は小さい', `(${Math.round(bomb.length / 1024)}KB)`);
  host.send({ type: 'HOST_SNAPSHOT', encoding: 'gzip', body: bomb.toString('base64') });
  await wait(3000);

  const alive = await fetch(`${BASE}/api/rooms`).then((r) => r.ok).catch(() => false);
  check(alive, 'サーバーが生きている  ←ここが落ちると全部屋が巻き添え');

  // 壊れたgzipでも落ちない
  host.send({ type: 'HOST_SNAPSHOT', encoding: 'gzip', body: 'これはgzipではない' });
  await wait(1000);
  check(await fetch(`${BASE}/api/rooms`).then((r) => r.ok).catch(() => false), '壊れた本文でも落ちない');
  host.ws.close();
}

console.log('\n[8] /asset/ はサーバーには無い（肩代わりするのはService Worker）');
{
  // SWが居ない環境では、このURLはそのままサーバーへ届く。静的配信の外へ出られないことを
  // 確かめる——ここが緩いと、**状態に書いただけの文字列でソースや.envを読み出す口**になる。
  // 参照は部屋の状態に載り、部屋の状態は参加者が書ける。
  const cases = [
    [`/asset/${'a'.repeat(64)}`, '知らない実体は404'],
    ['/asset/../../server/index.js', '相対パスで外へ出られない'],
    ['/asset/..%2f..%2fserver%2findex.js', 'エンコードしても出られない'],
    ['/asset/../.env', '.envへ届かない']
  ];
  for (const [path, label] of cases) {
    const res = await fetch(BASE + path, { redirect: 'manual' });
    const body = res.ok ? await res.text() : '';
    const leaked = /UPSTASH|R2_SECRET|process\.env|^import /m.test(body);
    check(!res.ok && !leaked, label, `(${res.status})`);
  }
}

console.log('\n[9] サーバーの生存');
{
  const res = await fetch(`${BASE}/api/rooms`).catch(() => null);
  check(res?.ok === true, 'サーバーが生きている  ←ここが落ちると全部屋が巻き添え');
}

console.log(`\n============================================================`);
console.log(`結果: ${pass} / ${pass + fail} 件が期待どおり`);
if (fail > 0) process.exitCode = 1;
