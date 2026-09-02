// js/net-transport-rtc.js
// js/net-transport.jsの契約を、ホスト役（GMのタブ）とのWebRTC DataChannelで満たす実装。
// ゲスト側専用——ホスト自身はトランスポートを持たない（自分が権威なので送り先が無い）。
//
// 繋ぎ方はスター型：全員がGMのタブとだけ繋ぐ。メッシュにしないのは、順番を決める1点が
// 要るため（詳細はdocs/p2p-migration-notes.mdの案1／案2）。
//
// 【シグナリングは受け取る】相手を見つける口（js/net-signaling.js）は、役割を決める
// ためにこれより前に開いている。ここで開き直すと2本目のWebSocketになるので、開いた
// ものを渡してもらう。
//
// 【繋がらなかったら】TURNを用意していないので、Symmetric NAT下の相手とは張れない。
// 一定時間で開かなければonCloseを返す。P2P卓ではWebSocketへ落ちる道が無い
// （落ちると同期経路が2つに割れるため。docs/p2p-migration-notes.mdの4-④）ので、
// js/net-sync.jsが理由を明示して部屋一覧へ戻す。

import { ICE_SERVERS } from './net-signaling.js';
import { chunkBudgetBytes, createChunkReassembler, createChunkSender } from './net-chunk.js';

// これを過ぎても開かなければ諦める。ICEの収集と往復に要る時間より十分長く、
// 待たされている人が「繋がらないのか」と分かる程度には短く。
const CONNECT_TIMEOUT_MS = 8000;

// 切れた理由。プロトコル上の意味を持つ4000番台とは別で、単に「張れなかった／落ちた」。
const ABNORMAL_CLOSE = 1006;

/**
 * ホストとのDataChannelを1本張る。
 *
 * @param {object} options
 * @param {object} options.signaling js/net-signaling.jsのopenSignalingが返したもの
 * @param {() => void} options.onOpen
 * @param {(message: object) => void} options.onMessage
 * @param {(info: {code: number}) => void} options.onClose
 */
export function createRtcGuestTransport({ signaling, onOpen, onMessage, onClose }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  // 先に作ってからofferを出す（DataChannelがあることをSDPに載せるため）
  const channel = pc.createDataChannel('mojulax');

  let hostPeerId = signaling.hostPeerId || null;
  let finished = false;
  // ホストが「この理由で閉じる」と言ってきた場合の控え（部屋の削除など）。
  // 何も言われずに切れたときはABNORMAL_CLOSE。
  let closeCode = ABNORMAL_CLOSE;
  // setRemoteDescriptionより先に届いたICE候補の置き場。順序は保証されないので、
  // 先に足そうとするとInvalidStateErrorで捨ててしまう。
  const earlyCandidates = [];

  const sender = createChunkSender(channel, () => chunkBudgetBytes(pc));
  const reassembler = createChunkReassembler({
    onMessage: (message) => {
      // ホストからの「この理由で閉じる」。部屋の削除をホスト経由で伝えるための制御で、
      // js/net-sync.jsはCLOSE_CODESだけを見て身の振り方を決める（契約を増やさない）。
      if (message?.type === 'CLOSE') {
        closeCode = Number(message.code) || ABNORMAL_CLOSE;
        finish();
        return;
      }
      onMessage(message);
    },
    onDrop: (reason) => console.warn(`[net-transport-rtc] ホストからのメッセージを捨てました: ${reason}`)
  });

  const giveUpTimer = setTimeout(() => {
    if (channel.readyState !== 'open') {
      console.warn('[net-transport-rtc] ホストと繋がりませんでした（時間切れ）');
      finish();
    }
  }, CONNECT_TIMEOUT_MS);

  async function startOffer() {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signaling.sendSignal(hostPeerId, { sdp: pc.localDescription });
    } catch (error) {
      console.warn('[net-transport-rtc] 呼び出しに失敗しました:', error.message);
      finish();
    }
  }

  /** ホストが自分より後に現れた場合に、js/net-sync.jsから呼ばれる。 */
  function setHost(id) {
    if (!id || hostPeerId) return;
    hostPeerId = id;
    startOffer();
  }

  async function handleSignal(payload) {
    try {
      if (payload?.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        // 相手の素性が決まったので、待たせていた候補をまとめて足す
        earlyCandidates.splice(0).forEach((candidate) => {
          pc.addIceCandidate(candidate).catch(() => {});
        });
        return;
      }
      if (payload?.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate).catch(() => {});
        else earlyCandidates.push(payload.candidate);
      }
    } catch (error) {
      console.warn('[net-transport-rtc] シグナリングの処理に失敗しました:', error.message);
    }
  }

  pc.addEventListener('icecandidate', (event) => {
    if (event.candidate && hostPeerId) signaling.sendSignal(hostPeerId, { candidate: event.candidate });
  });

  pc.addEventListener('connectionstatechange', () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) finish();
  });

  channel.addEventListener('open', () => {
    clearTimeout(giveUpTimer);
    console.info('[net-transport-rtc] ホストと繋がりました（同期はP2Pで流れます）');
    // 繋がってしまえばシグナリングは同期には要らない。ただしICEの張り直し（再ネゴシエーション）
    // と、サーバーにしか頼めない用事（入室パスワード・部屋の削除）に備えて開けたままにする。
    onOpen();
  });

  channel.addEventListener('message', (event) => reassembler.receive(event.data));
  channel.addEventListener('close', () => finish());

  /**
   * 呼びかけを始める。作った直後ではなく呼び出し側が明示的に始めるのは、シグナリングの
   * 合図をこのトランスポートへ回す配線が済んでから動き出させるため（js/net-sync.js）。
   * 相手がまだ居なければ何もしない——SIGNAL_HOST_READYでsetHostが呼ばれる。
   */
  function start() {
    if (hostPeerId) startOffer();
  }

  // 何度呼ばれても切断の通知は1回だけ（closeとconnectionstatechangeは両方来る）
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(giveUpTimer);
    sender.close();
    try { pc.close(); } catch { /* 既に閉じている */ }
    onClose({ code: closeCode });
  }

  return {
    send(message) {
      if (channel.readyState !== 'open') return false;
      return sender.send(message);
    },
    isOpen() {
      return channel.readyState === 'open';
    },
    close() {
      finish();
    },
    start,
    setHost,
    handleSignal
  };
}
