// js/net-signaling.js
// P2P卓でサーバーとの間に1本だけ張る細い口。ホスト役（js/net-host.js）とゲスト側
// トランスポート（js/net-transport-rtc.js）の両方が、この1本を共有して使う。
//
// 【なぜサーバーが要るのか】WebRTCは「最初の一言」を自力で相手に届けられない。SDPと
// ICE候補を交換する仲介が必ず要る。つまりP2P化しても**サーバーは消えない**——消えるのは
// 「常時全員の同期を捌く役」の方で、残るのは「繋ぐ瞬間の郵便受け」になる。
// 中継の実装はserver/index.jsのSIGNAL_HELLO / SIGNALで、中身は解釈していない。
//
// 【この口が運ぶもの】SDPとICE候補のほか、サーバーにしか決められない3つ：
//   ・入室パスワードの照合（JOIN）        … 合言葉を持っているのはサーバーだけ
//   ・ホスト役の資格の判定（SIGNAL_HELLO）… 誰がGMかを名乗りから検算できるのはサーバーだけ
//   ・部屋の削除（DELETE_ROOM）           … RedisとR2を消せるのはサーバーだけ
// 同期データはここを流れない。部屋の状態はDataChannelの側だけを通る。
//
// 【役割はサーバーが決める】ホストになるかゲストになるかを画面が自分で決めると、2人が
// 同時にホストを名乗って同期経路が2つに割れる。名乗りを検算できるのはサーバーだけなので、
// 資格（GM）と先着の判定はあちらに任せ、こちらは言われた役を務める。
// 疎通スパイクの `?host=1` はこれに置き換わって不要になった。

import { parseUntrustedJson } from './untrusted-json.js';
import { WS_URL } from './net-transport-ws.js';

// 名乗りと役割の返事をどれだけ待つか。中継はサーバー側で既定オフなので
// （server/index.jsのENABLE_P2P_SIGNALING）、無効な相手に黙って繋ぎ続けないための見切り。
// これが無いと、WebRTCの時間切れ（8秒）まで理由の分からない待ちになる。
const WELCOME_TIMEOUT_MS = 3000;

// 公開STUN。TURNは用意していないので、Symmetric NAT下の相手とは張れない——
// そこがP2P化の一番の弱点で、繋がらなかった場合の扱いはP2P卓かどうかで変わる
// （js/net-transport.jsのCLOSE_CODES.ROOM_IS_P2P）。
export const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * シグナリングの口を開き、サーバーに役割を決めてもらうまでを済ませる。
 *
 * @param {object} options
 * @param {() => ({participantId: string, authToken: string, name: string}|null)} options.identity
 *        この画面の名乗り。ゲスト参加（表示名なし）ならnullを返すこと
 * @param {(info: {error: boolean, sendJoin: (password: string) => boolean}) => void}
 *        [options.onEntryPasswordRequired]
 *        入室パスワードが要る部屋だった。呼び出し側が入力を求め、渡されたsendJoinを呼ぶ。
 *        照合が済むまでこのPromiseは解決しないので、送る口を引数で渡している
 * @param {(msg: {from: string, payload: any}) => void} [options.onSignal] 相手からの一言
 * @param {(state: object) => void} [options.onSeed] サーバーが送ってきた部屋の中身（ホストの種）
 * @param {(hostPeerId: string) => void} [options.onHostReady] 自分より後にホストが現れた
 * @param {() => void} [options.onClose] 切れた
 * @returns {Promise<{
 *   role: 'host'|'guest', peerId: string, hostPeerId: string|null,
 *   sendSignal: (to: string, payload: any) => boolean,
 *   sendToServer: (message: object) => boolean,
 *   sendJoin: (password: string) => boolean,
 *   close: () => void
 * }>} 役割が決まったら解決する。中継が無効・時間切れなら reject
 */
export function openSignaling({
  identity, onEntryPasswordRequired, onSignal, onSeed, onHostReady, onClose
}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let settled = false;
    let admitted = false;
    let welcomeTimer = null;

    function fail(reason, code = null) {
      clearTimeout(welcomeTimer);
      if (settled) { onClose?.(); return; }
      settled = true;
      try { ws.close(); } catch { /* まだ開いていない */ }
      reject(Object.assign(new Error(reason), { code }));
    }

    function send(message) {
      if (ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(message));
      return true;
    }

    function sendJoin(password) {
      return send({ type: 'JOIN', password });
    }

    // 名乗りと役割の要求は、サーバーに入室を認められてから送る。
    // 入室パスワードのある部屋では、照合が済むまでサーバーが他のメッセージを全部
    // 読み捨てるため（server/index.jsの「認証前は他のメッセージを受け付けない」）、
    // 開いた直後に送ると黙って消える。認められた合図はINITが届くこと。
    function claimRole() {
      if (admitted) return;
      admitted = true;

      const me = identity?.();
      if (me) send({ type: 'IDENTIFY', ...me });
      // 全員が「務まるなら引き受ける」と言い、サーバーが資格と先着で1人だけを選ぶ。
      send({ type: 'SIGNAL_HELLO', wantsHost: true });

      welcomeTimer = setTimeout(() => {
        fail('シグナリング中継から返事がありません'
          + '（サーバー側で無効になっている可能性があります。環境変数 ENABLE_P2P_SIGNALING=1）');
      }, WELCOME_TIMEOUT_MS);
    }

    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = parseUntrustedJson(event.data);
      } catch {
        return;
      }

      // 入室パスワードのある部屋。通すまでINITは届かない。
      if (message.type === 'ENTRY_REQUIRED') {
        onEntryPasswordRequired?.({ error: false, sendJoin });
        return;
      }
      if (message.type === 'ENTRY_REJECTED') {
        onEntryPasswordRequired?.({ error: true, sendJoin });
        return;
      }

      // 入室が認められた。ホストにとってはこれが権威を引き継ぐ種になる。
      if (message.type === 'INIT') {
        claimRole();
        onSeed?.(message.state);
        return;
      }

      // この部屋はP2P卓ではない（手で ?net=rtc を書き足したURLなど）。
      // 8秒の時間切れを待たせず、すぐ諦めさせる。呼び出し側はフラグを外して入り直す。
      if (message.type === 'SIGNAL_UNAVAILABLE') {
        fail('この部屋はP2Pで開かれていません', 'NOT_P2P');
        return;
      }

      if (message.type === 'SIGNAL_WELCOME') {
        if (settled) return;
        settled = true;
        clearTimeout(welcomeTimer);
        resolve({
          role: message.role === 'host' ? 'host' : 'guest',
          peerId: String(message.peerId || ''),
          hostPeerId: message.hostPeerId ?? null,
          sendSignal(to, payload) {
            if (!to) return false;
            return send({ type: 'SIGNAL', to, payload });
          },
          sendToServer: send,
          sendJoin,
          close() {
            try { ws.close(); } catch { /* 既に閉じている */ }
          }
        });
        return;
      }

      // 自分より後にホストが現れた場合。SIGNAL_WELCOMEのhostPeerIdはnullだったので、
      // ここで初めて繋ぎ先が分かる。
      if (message.type === 'SIGNAL_HOST_READY') {
        onHostReady?.(String(message.hostPeerId || ''));
        return;
      }

      if (message.type === 'SIGNAL') {
        onSignal?.({ from: message.from, payload: message.payload });
        return;
      }

      // 名乗りの結果（IDENTITY_ACCEPTED / IDENTITY_REJECTED）は読み捨てる。P2P卓での
      // 権限判定はホスト役が自分で行う（js/net-host.js）ので、サーバーの返事は使わない。
      // 開発用の合言葉がP2P卓で効かないのもここに現れている——サーバーだけが知っている
      // 判定を、ホストへ伝える信用できる道が無い。
      // それ以外の型（他の参加者のACTION等）も同期データなので読み捨てる。
    });

    ws.addEventListener('close', () => {
      if (!settled) {
        fail('シグナリングの接続が切れました');
        return;
      }
      clearTimeout(welcomeTimer);
      onClose?.();
    });

    ws.addEventListener('error', () => {
      try { ws.close(); } catch { /* 既に閉じている */ }
    });
  });
}
