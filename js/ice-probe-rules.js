// js/ice-probe-rules.js
// 「この回線からP2Pが張れるか」の判定そのもの。集めたICE候補を受け取って読み解く純粋関数だけを置く。
//
// 【なぜ分けたか】js/ice-probe.jsはRTCPeerConnectionとDOMに触るのでNodeから読めない。
// 判定のほうは「候補の並びをどう読むか」でしかなく、しかも読み違えると**結論が逆になる**
// （TURNが要るのに要らないと言う／その逆）ので、テストの効く形にしておく。
// 分け方はjs/net-host-rules.js・js/room-authority-rules.jsと同じ流儀。
//
// このファイルはDOM・window・RTCPeerConnectionに一切触れないこと。

// --- 何を見て何が分かるか ---
//
// WebRTCは接続の前に「自分に繋がりうる住所」（ICE候補）を集める。種類は3つ。
//
//   host  … LAN内の住所。同じ家の中でしか使えない
//   srflx … STUNサーバーに「私はどう見える？」と聞いて教わった、NATの外側から見た住所
//   relay … TURNサーバーが「ここへ送れば取り次ぐ」と貸してくれた住所
//
// 直接繋ぐにはsrflxが要る。**srflxがあっても繋がるとは限らない**のがNATの厄介なところで、
// 分かれ目はNATが「宛先ごとに別の穴を開ける」かどうか。
//
//   宛先が変わっても同じ穴（endpoint-independent／いわゆるコーン）
//     … STUNで教わった住所が相手にもそのまま通じる。直接繋がる
//   宛先ごとに別の穴（address/port-dependent／いわゆるSymmetric）
//     … STUNで教わった住所は「STUNサーバー向けの穴」でしかなく、相手には通じない。
//       **TURNが無ければ繋がらない**
//
// これは1台のブラウザだけで見分けられる。**STUNサーバーを2つ指定して、同じ足元
// （relatedPort＝ローカルの穴）から2つの宛先へ聞いたときに、教わった外側のポートが
// 同じか違うか**を見ればよい。相手を用意する必要が無いのがこの測り方の要点。

/** 候補の種類ごとの数を数える。 */
export function countCandidateTypes(candidates) {
  const counts = { host: 0, srflx: 0, prflx: 0, relay: 0, other: 0 };
  for (const c of candidates || []) {
    const type = c?.type;
    if (type in counts) counts[type] += 1;
    else counts.other += 1;
  }
  return counts;
}

/**
 * NATの穴の開け方を見分ける。
 *
 * 【ブラウザは同じ候補を1つに畳む】2つのSTUNが同じ答えを返すと、候補は**1件しか出てこない**。
 * つまり「1件だった」だけでは、どちらも同じ答えだったのか片方が黙っていたのか区別できない。
 * そこで、STUNごとに単独で聞いて届くことを先に確かめ、その数を `reachableServers` として
 * 渡してもらう。「2つとも届く／なのに答えは1つ」＝**畳まれた＝同じ答えだった**と読める。
 *
 * @param {Array<{type: string, address?: string, port?: number, relatedPort?: number, url?: string}>} candidates
 *   1つのRTCPeerConnectionで、**STUNサーバーを2つ以上指定して**集めた候補
 * @param {{reachableServers?: number}} [options]
 *   reachableServers … 単独で聞いて外側の住所を教えてくれたSTUNの数。2未満だと判定しない
 * @returns {{verdict: string, bases: Array, reason: string}}
 *   verdict … 'endpoint-independent' 直接繋がる見込みが高い
 *             'address-or-port-dependent' TURNが要る
 *             'no-srflx' STUNに届いていない（UDPが塞がれている等）。これもTURNが要る側
 *             'inconclusive' 材料が足りない（STUNの片方が答えなかった等）
 */
export function classifyNatMapping(candidates, { reachableServers = 0 } = {}) {
  const srflx = (candidates || []).filter((c) => c?.type === 'srflx');
  if (srflx.length === 0) {
    return {
      verdict: 'no-srflx',
      bases: [],
      reason: 'STUNから外側の住所を教われなかった。UDPが塞がれている可能性が高い。'
    };
  }

  // ローカルの穴（relatedPort）ごとにまとめる。**同じ穴から見た結果どうしでないと
  // 比較にならない**——別の穴なら外側のポートが違って当たり前で、それをSymmetricと
  // 読むと全員がTURN必須という誤診になる。
  const byBase = new Map();
  for (const c of srflx) {
    const base = c.relatedPort ?? 'unknown';
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(c);
  }

  const bases = [];
  let dependent = false;

  for (const [base, list] of byBase) {
    // 同じ穴から、いくつの外側の住所が見えたか。**2つ以上見えたら、それだけで確定**——
    // 畳まれなかった＝答えが違った、ということだから。
    const mapped = new Set(list.map((c) => `${c.address}:${c.port}`));
    const servers = new Set(list.map((c) => c.url).filter(Boolean));
    bases.push({ base, mappedCount: mapped.size, serverCount: servers.size });
    if (mapped.size >= 2) dependent = true;
  }

  if (dependent) {
    return {
      verdict: 'address-or-port-dependent',
      bases,
      reason: '同じ足元から聞いたのに、宛先ごとに違う外側のポートを教わった。'
        + 'STUNで分かる住所は相手には通じない＝TURNが無いと繋がらない。'
    };
  }
  if (reachableServers < 2) {
    return {
      verdict: 'inconclusive',
      bases,
      reason: '外側の住所は分かったが、単独で答えたSTUNが1つしか無く、'
        + '突き合わせる相手がいない。判断には足りない。'
    };
  }
  return {
    verdict: 'endpoint-independent',
    bases,
    reason: '2つのSTUNがどちらも答えるのに、教わった外側の住所は1つだけだった'
      + '（＝同じ答えだったのでブラウザが畳んだ）。宛先が変わっても穴が同じ＝直接繋がる見込み。'
  };
}

/**
 * 判定を、そのまま人に見せる文にする。
 * @param {string} verdict classifyNatMappingのverdict
 * @param {boolean} hasTurn TURNサーバーが設定されているか
 */
export function verdictSummary(verdict, hasTurn) {
  switch (verdict) {
    case 'endpoint-independent':
      return {
        level: 'ok',
        headline: 'この回線からは直接つながる見込みです',
        detail: 'NATが宛先ごとに穴を変えていないため、相手にも同じ住所が通じます。'
      };
    case 'address-or-port-dependent':
      return {
        level: hasTurn ? 'warn' : 'ng',
        headline: hasTurn
          ? 'この回線は中継（TURN）が要ります'
          : 'この回線からは直接つながりません（そしてTURNがありません）',
        detail: hasTurn
          ? 'NATが宛先ごとに穴を変えるため、直接は届きません。TURN経由になります。'
          : 'NATが宛先ごとに穴を変えるため、直接は届きません。いまTURNを用意していないので、'
            + 'この回線からはP2Pの部屋に参加できません。'
      };
    case 'no-srflx':
      return {
        level: 'ng',
        headline: 'STUNに届いていません',
        detail: 'UDPが塞がれている回線（職場や学校に多い）の可能性があります。'
          + 'この場合、TURNもUDPだけでは足りず、TCP/TLSで待ち受ける必要があります。'
      };
    default:
      return {
        level: 'unknown',
        headline: '判定できませんでした',
        detail: 'STUNからの答えが足りません。時間を置いてもう一度お試しください。'
      };
  }
}

/**
 * 人に貼って返してもらうための一行。**外側のIPアドレスは載せない**——
 * 測るのに要るのはポートが一致したかどうかだけで、住所そのものは判定に使っていない。
 * 貼り先（チャット等）に自分のグローバルIPを晒させる理由が無い。
 */
export function shareableLine({ verdict, counts, gatherMs, relayWorked, userAgentHint }) {
  const parts = [
    `判定=${verdict}`,
    `host=${counts.host}`,
    `srflx=${counts.srflx}`,
    `relay=${counts.relay}`,
    `収集=${gatherMs}ms`,
    `中継のみ=${relayWorked === null ? '未実施' : (relayWorked ? '通った' : '通らない')}`
  ];
  if (userAgentHint) parts.push(`環境=${userAgentHint}`);
  return parts.join(' / ');
}

/**
 * ブラウザ名をおおまかに拾う。詳しい指紋は要らない（集めたいのは「Safariだけ結果が違う」
 * 程度の粒度）ので、当てはまらなければ 'その他' に丸める。
 */
export function browserHint(userAgent) {
  const ua = String(userAgent || '');
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return /Android/.test(ua) ? 'Chrome(Android)' : 'Chrome';
  if (/Safari\//.test(ua)) return /iPhone|iPad/.test(ua) ? 'Safari(iOS)' : 'Safari';
  return 'その他';
}
