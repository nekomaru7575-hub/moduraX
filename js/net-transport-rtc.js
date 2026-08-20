// js/net-transport-rtc.js
// js/net-transport.jsの契約を、ホスト役（GMのタブ）とのWebRTC DataChannelで満たす実装。
// ゲスト側専用——ホスト自身はトランスポートを持たない（自分が権威なので送り先が無い）。
//
// 繋ぎ方はスター型：全員がGMのタブとだけ繋ぐ。メッシュにしないのは、順番を決める1点が
// 要るため（詳細はdocs/p2p-migration-notes.mdの案1／案2）。
//
// 【繋がらなかったら諦める】TURNを用意していないので、Symmetric NAT下の相手とは張れない。
// 一定時間で開かなければonCloseを返し、js/net-transport.jsがWebSocketへ落とす。
// 「たまに繋がらない人が出るセッションツール」にしないための併存で、ここが実験の肝。

import { createSignaling, ICE_SERVERS } from './net-signaling.js';
import { parseUntrustedJson } from './untrusted-json.js';

// これを過ぎても開かなければ諦める。ICEの収集と往復に要る時間より十分長く、
// 待たされている人が「繋がらないのか」と分かる程度には短く。
const CONNECT_TIMEOUT_MS = 8000;

// 切れた理由。プロトコル上の意味を持つ4000番台とは別で、単に「張れなかった／落ちた」。
// js/net-sync.jsはこれを知らないコードとして扱い、少し待って繋ぎ直す。
const ABNORMAL_CLOSE = 1006;

export function createRtcGuestTransport({ onOpen, onMessage, onClose }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  // 先に作ってからofferを出す（DataChannelがあることをSDPに載せるため）
  const channel = pc.createDataChannel('mojulax');

  let hostPeerId = null;
  let finished = false;
  // setRemoteDescriptionより先に届いたICE候補の置き場。順序は保証されないので、
  // 先に足そうとするとInvalidStateErrorで捨ててしまう。
  const earlyCandidates = [];

  const signaling = createSignaling({
    host: false,
    onWelcome: ({ hostPeerId: id }) => {
      if (!id || hostPeerId) return;
      hostPeerId = id;
      startOffer();
    },
    onSignal: ({ payload }) => handleSignal(payload),
    onClose: () => finish()
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
    // 繋がってしまえばシグナリングは要らない。ただしICEの張り直し（再ネゴシエーション）
    // に備えて開けたままにしておく——閉じると回線が切り替わったときに直せなくなる。
    onOpen();
  });

  channel.addEventListener('message', (event) => {
    let message;
    try {
      // ホストが中継してくるのは他の参加者の操作なので、ここも自分が書いたJSONではない
      message = parseUntrustedJson(event.data);
    } catch {
      return;
    }
    onMessage(message);
  });

  channel.addEventListener('close', () => finish());

  // 何度呼ばれても切断の通知は1回だけ（closeとconnectionstatechangeは両方来る）
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(giveUpTimer);
    signaling.close();
    try { pc.close(); } catch { /* 既に閉じている */ }
    onClose({ code: ABNORMAL_CLOSE });
  }

  return {
    send(message) {
      if (channel.readyState !== 'open') return false;
      channel.send(JSON.stringify(message));
      return true;
    },
    isOpen() {
      return channel.readyState === 'open';
    },
    close() {
      finish();
    }
  };
}
