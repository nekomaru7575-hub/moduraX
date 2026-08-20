// js/net-signaling.js
// WebRTCで相手を見つけるための、サーバーを経由した細い口。ホスト役（js/net-host.js）と
// ゲスト側トランスポート（js/net-transport-rtc.js）の両方がこれを使う。
//
// 【なぜサーバーが要るのか】WebRTCは「最初の一言」を自力で相手に届けられない。SDPと
// ICE候補を交換する仲介が必ず要る。つまりP2P化しても**サーバーは消えない**——消えるのは
// 「常時全員の同期を捌く役」の方で、残るのは「繋ぐ瞬間だけの郵便受け」になる。
// 中継の実装はserver/index.jsのSIGNAL_HELLO / SIGNALで、中身は解釈していない。
//
// このソケットは同期データを運ばない。運ぶのはSDPとICE候補だけで、部屋の状態は
// DataChannelの側だけを流れる。サーバーはこの接続を普通のクライアントとして扱うため
// INIT等も送ってくるが、ここで使うのはホストが自分のストアの初期値を貰う1回だけ
// （onServerInit）。

import { parseUntrustedJson } from './untrusted-json.js';
import { WS_URL } from './net-transport-ws.js';

/**
 * @param {object} options
 * @param {boolean} options.host この画面がホスト役か
 * @param {(info: {peerId: string, hostPeerId: string|null}) => void} [options.onWelcome]
 *        自分のpeerIdが決まったとき、およびホストが後から現れたとき
 * @param {(msg: {from: string, payload: any}) => void} [options.onSignal] 相手からの一言
 * @param {(state: object) => void} [options.onServerInit] サーバーが送ってきた部屋の中身
 * @param {() => void} [options.onClose] シグナリングが切れた
 */
// SIGNAL_HELLOへの返事をどれだけ待つか。中継はサーバー側で既定オフなので
// （server/index.jsのENABLE_P2P_SIGNALING）、無効な相手に黙って繋ぎ続けないための見切り。
// これが無いと、WebRTCの時間切れ（8秒）まで理由の分からない待ちになる。
const WELCOME_TIMEOUT_MS = 3000;

export function createSignaling({ host, onWelcome, onSignal, onServerInit, onClose }) {
  const ws = new WebSocket(WS_URL);
  let myPeerId = null;
  let welcomed = false;

  const welcomeTimer = setTimeout(() => {
    if (welcomed) return;
    console.warn('[net-signaling] シグナリング中継から返事がありません。'
      + 'サーバー側で無効になっている可能性があります（環境変数 ENABLE_P2P_SIGNALING=1 で有効化）');
    ws.close();
    onClose?.();
  }, WELCOME_TIMEOUT_MS);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'SIGNAL_HELLO', host: !!host }));
  });

  ws.addEventListener('message', (event) => {
    let message;
    try {
      message = parseUntrustedJson(event.data);
    } catch {
      return;
    }

    if (message.type === 'SIGNAL_WELCOME') {
      welcomed = true;
      clearTimeout(welcomeTimer);
      myPeerId = message.peerId;
      onWelcome?.({ peerId: myPeerId, hostPeerId: message.hostPeerId ?? null });
      return;
    }

    // 自分より後にホストが現れた場合。SIGNAL_WELCOMEのhostPeerIdはnullだったので、
    // ここで初めて繋ぎ先が分かる。
    if (message.type === 'SIGNAL_HOST_READY') {
      onWelcome?.({ peerId: myPeerId, hostPeerId: message.hostPeerId ?? null });
      return;
    }

    if (message.type === 'SIGNAL') {
      onSignal?.({ from: message.from, payload: message.payload });
      return;
    }

    if (message.type === 'INIT') {
      onServerInit?.(message.state);
      return;
    }

    // 入室パスワードのある部屋ではENTRY_REQUIREDが来るが、スパイクでは扱わない
    // （パスワードなしの部屋で試すこと）。それ以外の型は同期データなので読み捨てる。
  });

  ws.addEventListener('close', () => {
    clearTimeout(welcomeTimer);
    onClose?.();
  });
  ws.addEventListener('error', () => ws.close());

  return {
    sendSignal(to, payload) {
      if (ws.readyState !== WebSocket.OPEN || !to) return false;
      ws.send(JSON.stringify({ type: 'SIGNAL', to, payload }));
      return true;
    },
    close() {
      ws.close();
    }
  };
}

// 公開STUN。TURNは用意していないので、Symmetric NAT下の相手とは張れない——
// そこがP2P化の一番の弱点で、繋がらなかった場合はWebSocketへ落とす（js/net-transport.js）。
export const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
