// js/net-host.js
// ホスト権威P2Pの「ホスト役」。GM（部屋を開いた人）のタブが、いままでサーバーが
// やっていた仕事を引き受ける。server/index.jsのwss.on('connection')の移植で、
// P2P化が成立するかどうかはここが動くかで決まる（docs/p2p-migration-notes.md）。
//
// 【スパイクの範囲】疎通が成立するかを確かめるための最小限だけを移した。
//   移した … 接続受理→INIT、名乗り（IDENTIFY）、ACTIONの権限判定・適用・中継、
//            GM限定を断ったときのRESYNC、参加者登録の本人確認
//   移して いない … 記入中（TYPING_*）、スタンプ、送信音、部屋の削除、入室パスワード、
//            メッセージ流量制限、そして**永続化**
// 永続化が無いということは、**GMがタブを閉じた時点で部屋の状態が消える**ということ。
// これはP2P化の本質的な弱点で、緩和（IndexedDB・自動書き出し）は別の段の話。
//
// 【2つ目のストアを作ってはいけない】js/game-store.jsのstoreとjs/EventBus.jsのEventBusは
// どちらもモジュール・シングルトンで、ImmutableStoreはコミットのたびにEventBus越しに
// STATE_CHANGEDを撃つ。サーバーのentry.storeに当たるものをここで新しく作ると、
// **画面が他人のストアの状態で描き直される**。サーバーは1プロセスに複数の部屋を抱えるので
// 部屋ごとのストアが要るが、ブラウザは1タブ1部屋なので要らない——GM自身のストアが権威。

import { store } from './game-store.js';
import { createSignaling, ICE_SERVERS } from './net-signaling.js';
import { deriveParticipantId } from './local-identity.js';
import { canParticipantOperateAsGm, GM_ONLY_ACTIONS } from './room-authority-rules.js';
import { parseUntrustedJson } from './untrusted-json.js';

// 名乗りの値の形。server/index.jsのPARTICIPANT_ID_PATTERN / AUTH_TOKEN_PATTERNと同じ。
// 形を先に見るのは、桁の違う文字列をハッシュに通す無駄を省くため。
const PARTICIPANT_ID_PATTERN = /^[0-9a-f]{32}$/;
const AUTH_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/**
 * ホスト役を始める。
 *
 * @param {object} options
 * @param {(action: string, payload: any) => void} options.applyRemote
 *        他の参加者の操作を自分のストアへ適用する関数。js/net-sync.jsの
 *        localDispatch（ラップ前のdispatch）を渡す。ここでstoreのdispatchを直に
 *        呼ばないのは、ラップ済みのdispatchを踏むと中継が二重になるため。
 * @param {(state: object) => void} options.onSeeded
 *        サーバーから部屋の初期値を受け取ったとき。ホストはここから権威を引き継ぐ。
 * @returns {{ broadcast: (message: object, except?: object) => void, peerCount: () => number }}
 */
export function startHost({ applyRemote, onSeeded }) {
  // peerId -> { id, pc, channel, participantId, name, identifying, queue }
  const peers = new Map();
  let seeded = false;

  const signaling = createSignaling({
    host: true,
    onSignal: ({ from, payload }) => handleSignal(from, payload),
    // 部屋の初期値はサーバーから1回だけ貰う。ホストのタブも普通のクライアントとして
    // 繋がっているのでINITが届く——それを種にして、以後は自分が権威になる。
    // 【承知の上での割り切り】以後ホストの操作はサーバーへ送らないので、サーバー側の
    // 部屋データはこの時点で止まる。スパイクでは永続化を扱わないので問題にしない。
    onServerInit: (state) => {
      if (seeded) return;
      seeded = true;
      onSeeded(state);
    }
  });

  // --- 繋ぐところ ---

  async function handleSignal(from, payload) {
    const peer = peers.get(from) || createPeer(from);
    try {
      if (payload?.sdp) {
        await peer.pc.setRemoteDescription(payload.sdp);
        if (payload.sdp.type === 'offer') {
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          signaling.sendSignal(from, { sdp: peer.pc.localDescription });
        }
        return;
      }
      if (payload?.candidate) await peer.pc.addIceCandidate(payload.candidate).catch(() => {});
    } catch (error) {
      console.warn(`[net-host] ${from} とのやり取りに失敗しました:`, error.message);
    }
  }

  function createPeer(id) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = {
      id,
      pc,
      channel: null,
      // 名乗って検算まで通った参加者ID。名乗っていない（ゲスト）ならnullのまま。
      participantId: null,
      name: 'ゲスト',
      // 名乗りの検算中か（下のreceiveを参照）
      identifying: false,
      queue: []
    };
    peers.set(id, peer);

    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) signaling.sendSignal(id, { candidate: event.candidate });
    });
    // DataChannelを作るのはゲスト側。こちらは受け取る側。
    pc.addEventListener('datachannel', (event) => attachChannel(peer, event.channel));
    pc.addEventListener('connectionstatechange', () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) dropPeer(peer);
    });

    return peer;
  }

  function attachChannel(peer, channel) {
    peer.channel = channel;

    channel.addEventListener('open', () => {
      console.info(`[net-host] 参加者が繋がりました（現在${peerCount()}人）`);
      // server/index.jsのadmit()に当たる。記入中の一覧（TYPING_USERS）は
      // スパイクでは扱わないので送らない。
      sendTo(peer, { type: 'INIT', state: store.state });
    });

    channel.addEventListener('message', (event) => {
      let message;
      try {
        message = parseUntrustedJson(event.data);
      } catch {
        return;
      }
      receive(peer, message);
    });

    channel.addEventListener('close', () => dropPeer(peer));
  }

  function dropPeer(peer) {
    if (!peers.has(peer.id)) return;
    peers.delete(peer.id);
    try { peer.pc.close(); } catch { /* 既に閉じている */ }
    console.info(`[net-host] 参加者が切れました（残り${peerCount()}人）`);
  }

  // --- 受け取ったメッセージの処理（server/index.jsのws.on('message')の移植） ---

  function receive(peer, message) {
    // 名乗りの検算が終わるまで、後から来たものは順番を保って待たせる。
    //
    // サーバーのverifyIdentityはnode:cryptoで同期に済むが、ブラウザのcrypto.subtleは
    // 非同期（js/local-identity.js）。awaitの間に届いたACTIONを先に処理すると、
    // **名乗り済みのはずの人がゲスト扱いでGM限定の操作を断られる**。しかもたまにしか
    // 起きないので、後から追うのが難しい種類の壊れ方をする。
    if (peer.identifying) {
      peer.queue.push(message);
      return;
    }

    if (message.type === 'IDENTIFY') {
      handleIdentify(peer, message);
      return;
    }

    if (message.type === 'ACTION') {
      handleAction(peer, message);
      return;
    }

    // スパイクで移していない型（TYPING_* / SEND_STAMP / REQUEST_CHAT_SEND_SOUND /
    // REPLACE_STATE / DELETE_ROOM / JOIN）は黙って捨てる。
  }

  async function handleIdentify(peer, message) {
    peer.identifying = true;
    try {
      const participantId = String(message.participantId || '');
      const authToken = String(message.authToken || '');

      const wellFormed = PARTICIPANT_ID_PATTERN.test(participantId)
        && AUTH_TOKEN_PATTERN.test(authToken);
      const derived = wellFormed ? await deriveParticipantId(authToken) : null;

      if (derived && derived === participantId) {
        peer.participantId = participantId;
        // クライアントの丸めを信用せず、空文字・空白のみはここで「ゲスト」に丸める
        const rawName = typeof message.name === 'string' ? message.name.trim() : '';
        peer.name = rawName || 'ゲスト';
        // developerは必ずfalse。開発用の合言葉はサーバーの環境変数（DEVELOPER_PASSPHRASE）で、
        // ブラウザには突き合わせる材料が無い。ホスト権威で動かしている間はこの抜け道が
        // 使えない、ということでもある。
        sendTo(peer, { type: 'IDENTITY_ACCEPTED', developer: false });
      } else {
        peer.participantId = null;
        console.warn(`[net-host] 参加者の本人確認に失敗しました (${participantId.slice(0, 8)}…)`);
        sendTo(peer, { type: 'IDENTITY_REJECTED' });
      }
    } finally {
      peer.identifying = false;
      // 待たせていた分を順番どおりに流す。途中でまた名乗りが来たらそこで止まり、
      // その名乗りの検算が終わってから続きが流れる（identifyingが立つため）。
      while (!peer.identifying && peer.queue.length > 0) {
        receive(peer, peer.queue.shift());
      }
    }
  }

  function handleAction(peer, message) {
    // 参加者としての登録は、本人確認が通ったID本人からのものだけ受け付ける。ここが空いて
    // いると、他人の名前を書き換えられるほか、まだ誰もGMでない部屋で他人のIDを先に登録して
    // 「最初に名乗った人がGM」の規則を横取りできてしまう。
    // 断っても状態は戻さない（戻すとRESYNC→再登録→再び拒否、と往復し続けるため）。
    if (message.action === 'REGISTER_PARTICIPANT') {
      if (!peer.participantId || message.payload?.id !== peer.participantId) {
        console.warn('[net-host] 本人確認できていない参加者登録を拒否しました');
        return;
      }
    }

    if (GM_ONLY_ACTIONS.has(message.action)
        && !canParticipantOperateAsGm(store.state.participants, peer.participantId)) {
      // 送り手は自分の画面へ先に反映しているので、断っただけでは画面がずれたまま残る。
      console.warn(`[net-host] GM限定の操作を拒否しました (${message.action})`);
      sendTo(peer, { type: 'RESYNC', state: store.state });
      return;
    }

    // reducerが想定外の状態で例外を投げても、この1メッセージだけを捨てる。サーバー側と
    // 違ってプロセスごと落ちはしないが、捕まえないとホストのタブが以後の中継をやめてしまう
    // ＝部屋全体が止まる。権威が1タブしかないぶん、ここはサーバーより痛い。
    try {
      applyRemote(message.action, message.payload);
    } catch (error) {
      console.warn('[net-host] アクションの処理に失敗しました（無視します）:', message.action, error.message);
      return;
    }

    broadcast({ type: 'ACTION', action: message.action, payload: message.payload }, peer);
  }

  // --- 送るところ ---

  function sendTo(peer, message) {
    if (peer.channel?.readyState !== 'open') return false;
    peer.channel.send(JSON.stringify(message));
    return true;
  }

  /**
   * 繋がっている全員へ配る。exceptに渡した相手だけ外す（送り主へ送り返さないため）。
   * server/index.jsのbroadcastToRoomに当たる。
   */
  function broadcast(message, except = null) {
    const outgoing = JSON.stringify(message);
    peers.forEach((peer) => {
      if (peer === except || peer.channel?.readyState !== 'open') return;
      peer.channel.send(outgoing);
    });
  }

  function peerCount() {
    return peers.size;
  }

  return { broadcast, peerCount };
}
