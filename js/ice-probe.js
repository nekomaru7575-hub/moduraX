// js/ice-probe.js
// 「この回線からP2Pの部屋に入れるか」を、相手を用意せずに1台だけで測る道具（/ice-probe.html）。
//
// 【なぜ要るか】P2P化の一番の弱点は「NATを越えられない人が何割いるか」で、これは
// docs/p2p-migration-notes.md の5-2に「未検証・最大のリスク」と書いたまま残っている。
// 普通に測ろうとすると別々の回線から2人以上に繋いでもらう必要があり、手元では測れない。
//
// 【1台で測れる理由】繋がるかどうかを決めているのは相手ではなく**自分側のNATの癖**で、
// そこは1台でも見分けられる。STUNサーバーを2つ指定して、同じ足元（ローカルの穴）から
// 2つの宛先へ「私はどう見える？」と聞き、返ってきた外側のポートが同じか違うかを見る。
//   同じ  … 宛先が変わっても穴は同じ＝相手にもその住所が通じる（直接繋がる）
//   違う  … 宛先ごとに別の穴＝STUNで教わった住所は相手に通じない（TURNが要る）
// 判定そのものはjs/ice-probe-rules.jsにある（Nodeから読めるように分けてある）。
//
// 【何は測れないか】「相手と実際に張れたか」は測れない。同じ回線・同じ機械の2つの
// RTCPeerConnectionを繋ぐのは、どんなNATでも成功するので何の証拠にもならない。
// このページで出るのは**自分の側の見込み**で、最終的な数字は人に配って集めるしかない。
//
// 【外へ出るもの】STUNサーバーへ問い合わせるので、そのサーバーには自分のグローバルIPが
// 見える。これはWebRTCを使う限り避けられず、盤面（js/net-signaling.js）でも同じことを
// している。**このページはどこへも結果を送らない**——貼って返すのは利用者の手で行う。

import {
  classifyNatMapping, countCandidateTypes, verdictSummary, shareableLine, browserHint
} from './ice-probe-rules.js';
import { ICE_SERVERS } from './net-signaling.js';

// 突き合わせに使う2つ目のSTUN。**運営者が違うこと**が要点で、同じ事業者の別ホスト名だと
// 同じ入口へ解決されて「宛先が変わった」ことにならず、Symmetricを見逃す。
const STUN_A = 'stun:stun.l.google.com:19302';
const STUN_B = 'stun:stun.cloudflare.com:3478';

// 候補集めを打ち切るまで。gatheringstatechangeがcompleteにならない環境（TURNが無いのに
// relayを待つ場合など）があるので、必ず時間で切る。
const GATHER_TIMEOUT_MS = 8000;

const out = document.getElementById('result');
const runBtn = document.getElementById('run');
const detailEl = document.getElementById('detail');
const shareEl = document.getElementById('share');

/**
 * 1回ぶん候補を集める。接続はしない——集めるだけで判定に足りる。
 * @param {object} config RTCPeerConnectionへ渡す設定
 * @returns {Promise<{candidates: Array, ms: number, error: string|null}>}
 */
function gather(config) {
  return new Promise((resolve) => {
    const started = performance.now();
    const candidates = [];
    let pc;
    try {
      pc = new RTCPeerConnection(config);
    } catch (error) {
      resolve({ candidates, ms: 0, error: error.message });
      return;
    }

    let done = false;
    const finish = (error = null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { pc.close(); } catch { /* 閉じ損ねても実害は無い */ }
      resolve({ candidates, ms: Math.round(performance.now() - started), error });
    };
    const timer = setTimeout(() => finish(null), GATHER_TIMEOUT_MS);

    pc.addEventListener('icecandidate', (event) => {
      if (!event.candidate) { finish(null); return; }
      const c = event.candidate;
      candidates.push({
        type: c.type,
        address: c.address,
        port: c.port,
        protocol: c.protocol,
        relatedPort: c.relatedPort,
        // どのSTUN/TURNが答えたか。**これが無いと突き合わせができない**
        // （同じ足元から2つの宛先へ聞いた、という前提が確かめられない）
        url: event.url || null
      });
    });

    // DataChannelを1本開けないと候補集めが始まらない（送るものが無いとみなされる）
    try {
      pc.createDataChannel('probe');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((error) => finish(error.message));
    } catch (error) {
      finish(error.message);
    }
  });
}

function line(text, cls = '') {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = text;
  detailEl.appendChild(p);
}

function table(rows) {
  const t = document.createElement('table');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement(row === rows[0] ? 'th' : 'td');
      td.textContent = String(cell);
      tr.appendChild(td);
    }
    t.appendChild(tr);
  }
  detailEl.appendChild(t);
}

async function run() {
  runBtn.disabled = true;
  runBtn.textContent = '測っています…';
  out.className = 'verdict';
  out.textContent = '';
  detailEl.replaceChildren();
  shareEl.value = '';

  // ① 片方ずつ聞いて、それぞれ届くことを先に確かめる。**この順でないと②が読めない**——
  //    ②で候補が1つしか出なかったとき、「どちらも同じ答えだったので畳まれた」のか
  //    「片方が答えなかった」のかは、単独で届くかどうかを知らないと区別できない。
  const onlyA = await gather({ iceServers: [{ urls: STUN_A }] });
  const onlyB = await gather({ iceServers: [{ urls: STUN_B }] });
  const reachA = onlyA.candidates.some((c) => c.type === 'srflx');
  const reachB = onlyB.candidates.some((c) => c.type === 'srflx');
  const reachableServers = (reachA ? 1 : 0) + (reachB ? 1 : 0);

  // ② 2つのSTUNへ同時に聞く。判定の本体はこれ。
  const both = await gather({ iceServers: [{ urls: STUN_A }, { urls: STUN_B }] });
  const counts = countCandidateTypes(both.candidates);
  let mapping = classifyNatMapping(both.candidates, { reachableServers });

  // ②-2 「1つに畳まれた」と読んだときだけ、もう一度だけ測り直す。**片方のSTUNが
  //     たまたま黙った回**を「同じ答えだった」と読み違えると、TURNが要る回線を
  //     「大丈夫」と誤診する——一番やってはいけない向きの間違い。
  if (mapping.verdict === 'endpoint-independent') {
    const again = await gather({ iceServers: [{ urls: STUN_A }, { urls: STUN_B }] });
    const confirm = classifyNatMapping(again.candidates, { reachableServers });
    if (confirm.verdict !== 'endpoint-independent') mapping = confirm;
  }

  // ③ 中継だけで張れるか。**盤面と同じ設定**で試すので、TURNを入れるまでは必ず失敗する。
  //    ここが「通った」に変わることが、TURNを入れた証拠になる。
  const relay = await gather({ iceServers: ICE_SERVERS, iceTransportPolicy: 'relay' });
  const relayWorked = relay.candidates.some((c) => c.type === 'relay');

  const verdict = mapping.verdict;

  const hasTurn = ICE_SERVERS.some((s) => String(s.urls || '').startsWith('turn'));
  const summary = verdictSummary(verdict, hasTurn);

  out.className = `verdict ${summary.level}`;
  out.textContent = summary.headline;
  line(summary.detail);
  line(mapping.reason, 'reason');

  table([
    ['調べたこと', '結果'],
    ['LAN内の住所（host）', `${counts.host}件`],
    ['外側から見た住所（srflx）', `${counts.srflx}件`],
    ['中継の住所（relay）', `${counts.relay}件`],
    ['Google STUNが答えたか', reachA ? 'はい' : 'いいえ'],
    ['Cloudflare STUNが答えたか', reachB ? 'はい' : 'いいえ'],
    ['同じ足元から見えた外側の住所', mapping.bases.map((b) => `${b.mappedCount}種`).join(' / ') || '—'],
    ['中継だけで張れるか', hasTurn ? (relayWorked ? '通った' : '通らない') : 'TURN未設定のため不可'],
    ['候補集めにかかった時間', `${both.ms}ms`]
  ]);

  if (!hasTurn) {
    line('※ このサーバーにはTURNが設定されていません（STUNのみ）。'
      + '上の「中継だけで張れるか」は、TURNを入れてから意味を持ちます。', 'note');
  }

  shareEl.value = shareableLine({
    verdict, counts, gatherMs: both.ms,
    relayWorked: hasTurn ? relayWorked : null,
    userAgentHint: browserHint(navigator.userAgent)
  });

  runBtn.disabled = false;
  runBtn.textContent = 'もう一度測る';
}

runBtn.addEventListener('click', run);
document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareEl.value);
    document.getElementById('copy').textContent = 'コピーしました';
  } catch {
    shareEl.select();
  }
});

run();
