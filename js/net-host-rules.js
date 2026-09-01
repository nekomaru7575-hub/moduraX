// js/net-host-rules.js
// ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。状態を引数で受け取る
// 純粋関数と定数だけを置く。
//
// 【なぜ分けたか】js/net-host.jsはstoreとRTCPeerConnectionに触るのでNodeから読めず、
// そのままでは1行もテストできない。連打よけ・記入中の集計・入室メッセージの重複判定は
// どれも「境界で1つずれる」種類の間違いをする場所なので、テストの効く形にしておきたい。
// 分け方はjs/room-authority-rules.jsと同じ流儀。
//
// もう一つの理由は写しを増やさないこと。メッセージ流量の上限はもともとserver/index.jsに
// しか無かったが、ホスト役も同じものが要る。両方に数字を書くと必ずどちらかがずれるので、
// スタンプの上限（js/stamp-catalog.jsのSTAMP_RATE_LIMIT）と同じくここを唯一の出どころにして、
// サーバーもここから読む。
//
// このファイルはDOM・window・storeに一切触れないこと（Nodeから読めなくなる）。

/**
 * 1つの接続（ホストから見ればピア1人）が窓の中で送ってよいメッセージ数。
 *
 * サーバー側では「1操作ごとにRedisへの書き込みが走るので、連打が課金と帯域に直結する」
 * のが理由だった。ホスト役にはRedisが無いが、代わりに**部屋全員への中継**が走る。
 * 1人の連打がN人ぶんの送信に増幅されるので、守る理由はむしろ強い。
 * 溢れた分は黙って捨てる（切断はしない。取りこぼしはRESYNCで直せる方が親切なため）。
 */
export const MESSAGE_RATE_LIMIT = Object.freeze({ windowMs: 10 * 1000, max: 300 });

/**
 * ホストが控えをサーバーへ預ける間隔（js/host-persistence.js）。
 *
 * **サーバー側の保存間隔（server/index.jsのSAVE_DEBOUNCE_MS）とは別物。** あちらは
 * 「既に手元にある状態をいつ書くか」で、状態はもうメモリに在るのだから短くてよい。
 * こちらは「状態を丸ごと回線で送る」ので、頻度がそのまま通信量になる。
 *
 * 控えはバックアップであって同期ではない。1操作ごとに追いつく必要はなく、
 * **失って困る幅**（クラッシュしたときに巻き戻る時間）だけで決めればよい。
 * 普通にタブを閉じる・別のページへ移る場合は、その瞬間に吐き出すので1件も失われない
 * （host-persistence.jsのpagehide / visibilitychange）。ここに引っかかるのは
 * ブラウザごと落ちた・電源が切れた・回線が死んだ場合だけ。
 *
 * 短くすると通信量とRedisへの書き込みが直接効いてくる：状態221KBの卓で5秒間隔なら
 * 1時間あたり約180MB、5分間隔なら約2.6MB。
 */
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * 次に控えを送るまでの待ち時間を決める。
 *
 * 先送り（デバウンス）ではなく間引き（スロットル）。デバウンスだと「操作が続いている間は
 * 送らない」ことになり、**遊び続けている卓ほど控えが古くなる**——一番失いたくない状況で
 * 一番守られない。一定間隔なら、活動の多寡に関わらず巻き戻る幅が上限で抑えられる。
 *
 * @param {object} options
 * @param {number} options.now いま
 * @param {number|null} options.lastSentAt 最後に送った時刻（まだ送っていなければnull）
 * @param {number} [options.intervalMs]
 * @returns {number} 待つミリ秒。0ならすぐ送ってよい
 */
export function nextSnapshotDelay({ now, lastSentAt, intervalMs = SNAPSHOT_INTERVAL_MS }) {
  // まだ一度も送っていない＝サーバーには部屋を開いた時点の姿しかない。最初の変更は
  // 待たずに預ける（ここで待つと、開いた直後に落ちた卓が丸ごと失われる）。
  if (lastSentAt === null) return 0;
  return Math.max(0, lastSentAt + intervalMs - now);
}

/**
 * 1つの接続が名乗ってよい回数。
 *
 * サーバー側の理由（開発用の合言葉の総当たり）はホストには無い——合言葉はサーバーの
 * 環境変数で、ホストには判定材料が無いため（P2P卓では合言葉そのものが効かない）。
 * それでも上限を置くのは、名乗り1回ごとにcrypto.subtleのハッシュが1回走るためで、
 * ここが無いと参加者1人がGMのタブのCPUを好きなだけ使える。
 *
 * ブラウザは1接続につきopen時・INIT受信時・NET_INITIALIZED経由と複数回送り、表示名を
 * 変えるたびにも送り直す。普通に使う分には二桁に届かない。
 */
export const MAX_IDENTIFY_PER_PEER = 50;

/**
 * 窓を区切って数える流量制限（server/index.jsのexceedsMessageRateの移植）。
 * 窓をまたいだら数え直す。境界で最大2倍通るが、連打を止めるには十分。
 *
 * @param {{ windowMs: number, max: number }} limit
 * @returns {{ exceeds: (now?: number) => boolean }}
 */
export function createFixedWindowLimiter({ windowMs, max }) {
  let windowStart = 0;
  let count = 0;
  let started = false;

  return {
    /** 1件受け取ったものとして数え、上限を超えていればtrue。 */
    exceeds(now = Date.now()) {
      if (!started || now - windowStart >= windowMs) {
        started = true;
        windowStart = now;
        count = 0;
      }
      count += 1;
      return count > max;
    }
  };
}

/**
 * 直近の窓を滑らせて数える流量制限（server/index.jsのallowStampの移植）。
 * 通した時刻だけを覚えるので、断られた分は次の判定に影響しない。
 *
 * @param {{ windowMs: number, max: number }} limit
 * @returns {{ allow: (now?: number) => boolean }}
 */
export function createSlidingWindowLimiter({ windowMs, max }) {
  let times = [];

  return {
    /** 通してよければtrue（通した場合だけ時刻を記録する）。 */
    allow(now = Date.now()) {
      times = times.filter((time) => now - time < windowMs);
      if (times.length >= max) return false;
      times.push(now);
      return true;
    }
  };
}

/**
 * 「記入中」の一覧を、いま繋がっている面々から組み立てる。
 *
 * サーバーはMap（entry.typing）を保守し、切断やタブの開き直しのたびに「同じ人の別の接続が
 * まだ記入中か」を調べて消していた。ホスト役では**保守せずに毎回導出する**。同じ人が
 * 2タブ開いている場合の扱いは自然に揃い、消し忘れも起きない。
 *
 * 名乗っていない人（participantIdがnull）は対象外。名前も参加者IDも安定しないためで、
 * これはサーバー側の扱い（verifiedParticipantIdが無ければ無視）と同じ。
 *
 * @param {Iterable<{ participantId: string|null, name: string, isTyping: boolean }>} members
 *        ホスト自身も含めて渡すこと（サーバーは自分では書かないので、ここだけ移植元に無い）
 * @returns {{ id: string, name: string }[]}
 */
export function typingUsersFrom(members) {
  const seen = new Map();
  for (const member of members) {
    if (!member?.isTyping || !member.participantId) continue;
    if (seen.has(member.participantId)) continue;
    seen.set(member.participantId, member.name || 'ゲスト');
  }
  return Array.from(seen, ([id, name]) => ({ id, name }));
}

/**
 * 名乗りを受けて入室メッセージを出すか（server/index.jsのIDENTIFY内の判定の移植）。
 *
 * 出さない場合が2つある：
 *   ・この接続では既に一度判断済み（ブラウザは1接続で何度もIDENTIFYを送ってくる）
 *   ・同じ人が既に別の接続で入っている（再接続・タブの複数開きで増やさない）
 * 2つ目に当たったときも「この接続では判断済み」にする点に注意（移植元と同じ）。
 * ここを変えると、後から別のタブが閉じた拍子に入室メッセージが増える。
 *
 * @param {object} options
 * @param {boolean} options.enabled 部屋の設定（js/store/room.jsのshowsEntryMessages）
 * @param {boolean} options.alreadyDecided この接続で既に判断したか
 * @param {string|null} options.participantId 名乗った人
 * @param {Iterable<string|null>} options.otherParticipantIds 他の接続が名乗っているID
 * @returns {{ announce: boolean, markDecided: boolean }}
 */
export function entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds }) {
  if (!enabled || alreadyDecided || !participantId) {
    return { announce: false, markDecided: false };
  }
  for (const other of otherParticipantIds) {
    if (other === participantId) return { announce: false, markDecided: true };
  }
  return { announce: true, markDecided: true };
}
