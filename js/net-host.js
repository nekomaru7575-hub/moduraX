// js/net-host.js
// ホスト権威P2Pの「ホスト役」。GM（部屋を開いた人）のタブが、いままでサーバーが
// やっていた仕事を引き受ける。server/index.jsのwss.on('connection')の移植で、
// P2P化が成立するかどうかはここが動くかで決まる（docs/p2p-migration-notes.md）。
//
// 【移した範囲】接続受理→INIT、名乗り（IDENTIFY）、ACTIONの権限判定・適用・中継、
//   GM限定を断ったときのRESYNC、参加者登録の本人確認、記入中（TYPING_*）、スタンプ、
//   入室メッセージと入室音、チャット送信音、メッセージ流量制限、参加者からの全データ
//   読み込み（REPLACE_STATE）、部屋の削除（サーバーへ中継）。
//
// 【移していない・移せないもの】
//   ・**永続化** … 状態はこのタブの中にしかない。**閉じた時点で消える**。
//     Redisへの定期バックアップは次の段（docs/p2p-migration-notes.md）
//   ・入室パスワードの照合 … 合言葉を持っているのはサーバーだけ。P2P卓では
//     シグナリング接続がサーバーの入室門を通るので、ここへ来る時点で照合は済んでいる
//   ・開発用の合言葉 … サーバーの環境変数で、ブラウザに突き合わせる材料が無い。
//     P2P卓では**この抜け道そのものが使えない**
//   ・取り込んだ画像の引き取り（サーバーのadoptStateMedia）… メディアをブラウザへ移す
//     段で作る。それまでは読み込んだ形（データURL等）のまま全員へ渡る
//
// 【2つ目のストアを作ってはいけない】js/game-store.jsのstoreとjs/EventBus.jsのEventBusは
// どちらもモジュール・シングルトンで、ImmutableStoreはコミットのたびにEventBus越しに
// STATE_CHANGEDを撃つ。サーバーのentry.storeに当たるものをここで新しく作ると、
// **画面が他人のストアの状態で描き直される**。サーバーは1プロセスに複数の部屋を抱えるので
// 部屋ごとのストアが要るが、ブラウザは1タブ1部屋なので要らない——GM自身のストアが権威。
//
// 【1メッセージで送らない】DataChannelには1メッセージの上限があり、超えると**チャネルごと
// 落ちる**。状態まるごとを運ぶINIT・RESYNCは実運用で必ず超えるので、送受信とも
// js/net-chunk.jsを通す。

import { store } from './game-store.js';
import { ICE_SERVERS } from './net-signaling.js';
import { chunkBudgetBytes, createChunkReassembler, createChunkSender } from './net-chunk.js';
import { deriveParticipantId } from './local-identity.js';
import { canParticipantOperateAsGm, GM_ONLY_ACTIONS } from './room-authority-rules.js';
import {
  MAX_IDENTIFY_PER_PEER, MESSAGE_RATE_LIMIT, createFixedWindowLimiter,
  createSlidingWindowLimiter, entryMessageDecision, typingUsersFrom
} from './net-host-rules.js';
import { STAMP_RATE_LIMIT } from './stamp-catalog.js';
import { isKnownStampId } from './stamp-registry.js';
import { showsEntryMessages } from './store/room.js';
import { adoptImportedState } from './state-import.js';
import { handleAssetMessageAsHost } from './asset-sync.js';
import { adoptDataUrlsInState } from './asset-store.js';
import { getChatSendSoundUrl, getEntrySoundUrl } from './sound-config.js';
import { CLOSE_CODES } from './net-transport.js';

// 名乗りの値の形。server/index.jsのPARTICIPANT_ID_PATTERN / AUTH_TOKEN_PATTERNと同じ。
// 形を先に見るのは、桁の違う文字列をハッシュに通す無駄を省くため。
const PARTICIPANT_ID_PATTERN = /^[0-9a-f]{32}$/;
const AUTH_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/**
 * ホスト役を始める。
 *
 * @param {object} options
 * @param {object} options.signaling js/net-signaling.jsのopenSignalingが返したもの（role==='host'）
 * @param {(action: string, payload: any) => void} options.applyRemote
 *        他の参加者の操作を自分のストアへ適用する関数。js/net-sync.jsの
 *        localDispatch（ラップ前のdispatch）を渡す。ここでstoreのdispatchを直に
 *        呼ばないのは、ラップ済みのdispatchを踏むと中継が二重になるため。
 * @param {(message: object) => void} options.onLocal
 *        「送り主を含む全員へ配る」ものを、ホスト自身の画面へも届ける口。
 *        js/net-sync.jsのhandleMessageを渡す——サーバーがbroadcastToRoom(entry, null, …)
 *        としていた場面がこれに当たる（入室メッセージ・記入中・スタンプ・送信音）。
 * @param {() => ({participantId: string|null, name: string})} options.self
 *        ホスト自身の名乗り。記入中の一覧に自分を入れるのに要る（サーバーは自分では
 *        書かないので、ここだけ移植元に無い）
 * @returns {object} ホスト役の口
 */
export function startHost({ signaling, applyRemote, onLocal, self }) {
  // 口は後から差し替わる（サーバー再起動でシグナリングが切れ、繋ぎ直したとき。
  // js/net-sync.jsのreconnectHostSignaling）。**ホスト役そのものは作り直さない**——
  // 作り直すと繋がっている参加者とのDataChannelが全部切れる。
  let link = signaling;
  // peerId -> peer
  const peers = new Map();
  // ホスト自身が記入中か。記入中の一覧はpeersとこれから毎回導出する。
  let ownTyping = false;
  // ホスト自身の連打よけ。ピアと同じ上限を自分にも掛ける（GMだけ無制限に押せると、
  // 連打よけが「荒らし対策ではなく事故防止」であることと食い違う）。
  const ownStampLimiter = createSlidingWindowLimiter(STAMP_RATE_LIMIT);
  // ホスト自身の入室メッセージを判断済みか（下のannounceSelf）。
  let selfEntryDecided = false;

  // --- 繋ぐところ ---

  async function handleSignal(from, payload) {
    const peer = peers.get(from) || createPeer(from);
    try {
      if (payload?.sdp) {
        await peer.pc.setRemoteDescription(payload.sdp);
        if (payload.sdp.type === 'offer') {
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          link.sendSignal(from, { sdp: peer.pc.localDescription });
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
      sender: null,
      reassembler: null,
      // 名乗って検算まで通った参加者ID。名乗っていない（ゲスト）ならnullのまま。
      participantId: null,
      name: 'ゲスト',
      // 名乗りの検算中か（下のreceiveを参照）
      identifying: false,
      queue: [],
      // 記入中か。一覧は保守せず、この旗から毎回導出する（js/net-host-rules.js）。
      isTyping: false,
      // この接続で入室メッセージを判断済みか。ブラウザは1接続で何度もIDENTIFYを送るため。
      entryDecided: false,
      identifyCount: 0,
      // 流量の窓。ピアごとに持つので、切れれば一緒に捨てられる（サーバーがwsに
      // 生やしているのと同じ理由）。
      messageLimiter: createFixedWindowLimiter(MESSAGE_RATE_LIMIT),
      stampLimiter: createSlidingWindowLimiter(STAMP_RATE_LIMIT)
    };
    peers.set(id, peer);

    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) link.sendSignal(id, { candidate: event.candidate });
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
    peer.sender = createChunkSender(channel, () => chunkBudgetBytes(peer.pc));
    peer.reassembler = createChunkReassembler({
      onMessage: (message) => receive(peer, message),
      onDrop: (reason) => console.warn(`[net-host] ${peer.id} からのメッセージを捨てました: ${reason}`)
    });

    channel.addEventListener('open', () => {
      console.info(`[net-host] 参加者が繋がりました（現在${peerCount()}人）`);
      // server/index.jsのadmit()に当たる。記入中の一覧は状態（INIT）に乗らない揮発情報
      // なので別送りする。誰も記入中でなくても送る：省くと、繋ぎ直した本人の画面に
      // 切断前の古い一覧が残る。
      sendTo(peer, { type: 'INIT', state: store.state });
      sendTo(peer, { type: 'TYPING_USERS', users: typingUsers() });
    });

    channel.addEventListener('message', (event) => peer.reassembler.receive(event.data));
    channel.addEventListener('close', () => dropPeer(peer));
  }

  function dropPeer(peer) {
    if (!peers.has(peer.id)) return;
    peers.delete(peer.id);
    peer.sender?.close();
    try { peer.pc.close(); } catch { /* 既に閉じている */ }
    console.info(`[net-host] 参加者が切れました（残り${peerCount()}人）`);
    // 記入中のまま切れた人を一覧に残さない。一覧は導出なので、配り直すだけでよい。
    if (peer.isTyping) broadcastTyping();
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

    // 流量制限は組み直したあと＝「1つの操作」ごとに数える。分割された1件を何十回とも
    // 数えると、大きな取り込み（REPLACE_STATE）が自分で自分を弾く。分割そのものの
    // 溢れはjs/net-chunk.jsの組み直し上限が受け持つ。
    if (peer.messageLimiter.exceeds()) return;

    // 画像・音源の実体のやり取り（js/asset-sync.js）。名乗りは要らない——欲しいのは
    // 「この部屋に居る人が見ている絵」で、それは既に状態に載っている。名乗りを条件に
    // すると、ゲスト参加の人だけ絵が出ない部屋になる。
    if (handleAssetMessageAsHost(message, (reply) => sendTo(peer, reply))) return;

    if (message.type === 'IDENTIFY') {
      handleIdentify(peer, message);
      return;
    }

    if (message.type === 'ACTION') {
      handleAction(peer, message);
      return;
    }

    if (message.type === 'TYPING_START' || message.type === 'TYPING_STOP') {
      // 名乗っていない人は対象外。名前も参加者IDも安定しないため（サーバーと同じ扱い）。
      if (!peer.participantId) return;
      peer.isTyping = message.type === 'TYPING_START';
      broadcastTyping();
      return;
    }

    if (message.type === 'SEND_STAMP') {
      handleStamp(peer, message);
      return;
    }

    if (message.type === 'REQUEST_CHAT_SEND_SOUND') {
      broadcastToAll({
        type: 'ACTION',
        action: 'CHAT_SEND_SOUND',
        payload: { chatSendSoundUrl: getChatSendSoundUrl() }
      });
      return;
    }

    if (message.type === 'REPLACE_STATE') {
      handleReplaceState(peer, message);
      return;
    }

    if (message.type === 'DELETE_ROOM') {
      // 送り手の画面では何も起きていないので、状態を戻す必要はない
      if (!mayOperateAsGm(peer.participantId)) {
        console.warn('[net-host] GM以外からの部屋削除の要求を拒否しました');
        return;
      }
      deleteRoom();
      return;
    }

    // JOIN（入室パスワード）はここへ来ない。照合はサーバーのシグナリング接続で
    // 済んでいて、通らなかった人はDataChannelを張る前に切られている。
  }

  async function handleIdentify(peer, message) {
    peer.identifyCount += 1;
    // 名乗り1回ごとにcrypto.subtleのハッシュが1回走る。上限が無いと、参加者1人で
    // GMのタブのCPUを好きなだけ使える。超えた分は黙って捨てる（切断すると、名前を
    // 何度も変えただけの人が部屋から落ちる）。
    if (peer.identifyCount > MAX_IDENTIFY_PER_PEER) {
      if (peer.identifyCount === MAX_IDENTIFY_PER_PEER + 1) {
        console.warn('[net-host] 名乗りが多すぎるため以後このピアの分を捨てます');
      }
      return;
    }

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
        // ブラウザには突き合わせる材料が無い。
        sendTo(peer, { type: 'IDENTITY_ACCEPTED', developer: false });
        announceEntry(peer);
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

  // 入室メッセージ（server/index.jsのIDENTIFY内の移植）。同じ人が再接続・タブの複数開きを
  // しても増やさない。判断そのものはjs/net-host-rules.jsにあり、テストで押さえてある。
  function announceEntry(peer) {
    const others = [];
    // ホスト自身も「既に入っている人」に数える。数えないと、GMが自分の名前を入れ直した
    // 拍子に自分の入室メッセージがもう一度出る。
    others.push(self().participantId);
    peers.forEach((other) => {
      if (other !== peer) others.push(other.participantId);
    });

    const { announce, markDecided } = entryMessageDecision({
      enabled: showsEntryMessages(store.state),
      alreadyDecided: peer.entryDecided,
      participantId: peer.participantId,
      otherParticipantIds: others
    });
    if (markDecided) peer.entryDecided = true;
    if (!announce) return;

    // 状態を変えるので、ホスト自身の分もonLocal経由のlocalDispatchで1回だけ適用する
    // （ここでapplyRemoteも呼ぶと二重に入る）。入室音もその先で鳴る。
    announceEntryMessage(peer.name);
  }

  // 入室メッセージ1件を、送り主を含む全員へ配る。
  // timeをここで確定させるのは、載せずに配ると受け取った各自がDate.now()を呼び直し、
  // 同じ入室が人によって別の時刻で並ぶため（js/net-sync.jsのstampPayloadと同じ理屈）。
  // ホストが中継する分だけサーバー権威のときよりずれ幅が大きいので、ここで揃えておく。
  function announceEntryMessage(name) {
    broadcastToAll({
      type: 'ACTION',
      action: 'ADD_ENTRY_MESSAGE',
      payload: { name, entrySoundUrl: getEntrySoundUrl(), time: Date.now() }
    });
  }

  function handleStamp(peer, message) {
    // スタンプには送り主の名前が出る。名前の無いゲストはそもそも描けないので対象外。
    if (!peer.participantId) return;
    // 使えるスタンプはその部屋に適用中のプラグインで変わる。別のシステムのスタンプを
    // 名指しで送られても、ここで落ちる。URLではなくIDだけを受けるのも同じ理由
    // （js/stamp-catalog.js冒頭）。
    if (!isKnownStampId(message.stampId, store.state.room)) return;
    if (!peer.stampLimiter.allow()) return;

    broadcastToAll({
      type: 'ACTION',
      action: 'SHOW_STAMP',
      payload: {
        stampId: String(message.stampId),
        participantId: peer.participantId,
        // 表示名は申告ではなく、名乗りのときにこちらが決めた値を使う
        name: peer.name
      }
    });
  }

  function handleReplaceState(peer, message) {
    // 全員の状態を丸ごと置き換えるため、部屋の削除と同じくGM限定にする
    if (!mayOperateAsGm(peer.participantId)) {
      console.warn('[net-host] GM限定の操作を拒否しました (REPLACE_STATE)');
      sendTo(peer, { type: 'RESYNC', state: store.state });
      return;
    }

    // 今この部屋にいる参加者一覧を引き継ぐ。引き継がないと、読み込んだGMがその場で
    // GM権限を失う（js/state-import.js）。送り手側でも通しているが、権威側でも必ず通す。
    let adopted;
    try {
      adopted = adoptImportedState(message.state, { participants: store.state.participants });
    } catch (error) {
      console.warn('[net-host] 読み込んだ状態の取り込みに失敗しました:', error.message);
      sendTo(peer, { type: 'RESYNC', state: store.state });
      return;
    }

    store.hydrate(adopted);
    // 送り手にも配る。送り手のタブは既にローカルで置き換えているが、権威が均した形
    // （参加者一覧の引き継ぎ）で揃え直す。
    peers.forEach((other) => sendTo(other, { type: 'INIT', state: store.state }));
    // 読み込んだファイルに混ざっている画像・音源をこのブラウザの実体へ移す
    // （サーバーのadoptStateMediaに当たる）。**先に配ってから**行う——数MBの読み替えで
    // 読み込みが待たされるより、絵が後から差し替わる方がよい。
    adoptReplacedMedia();
  }

  // 置き換えた状態に残っているデータURLを実体へ移し替える。
  //
  // 【やらないと保存が止まる】状態に実体が残ったままだと、控えが上限
  // （MAX_SNAPSHOT_BYTES）を超えてサーバーに捨てられる＝**その卓だけ保存されなくなる**。
  // 実体を状態から追い出すのは、通信量の話であると同時に永続化の前提でもある。
  async function adoptReplacedMedia() {
    try {
      const { state, adopted } = await adoptDataUrlsInState(store.state);
      if (adopted === 0) return;
      console.info(`[net-host] 読み込んだ画像${adopted}件をこのブラウザの持ち物にしました`);
      store.hydrate(state);
      peers.forEach((other) => sendTo(other, { type: 'INIT', state: store.state }));
    } catch (error) {
      console.warn('[net-host] 読み込んだ画像を引き取れませんでした:', error.message);
    }
  }

  // 部屋の削除。RedisとR2を消せるのはサーバーだけなので、シグナリング接続で頼む。
  // ホストは参加者に理由を伝えてから自分も畳む——伝えないと、参加者は「ホストが落ちた」
  // として繋ぎ直しに回り、消えた部屋を叩き続ける。
  function deleteRoom() {
    link.sendToServer({ type: 'DELETE_ROOM' });
    peers.forEach((peer) => sendTo(peer, { type: 'CLOSE', code: CLOSE_CODES.ROOM_DELETED }));
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

    if (GM_ONLY_ACTIONS.has(message.action) && !mayOperateAsGm(peer.participantId)) {
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

  // 開発用の合言葉はP2P卓では効かない（サーバーの環境変数で、ここに材料が無い）。
  // そのぶんserver/index.jsのmayOperateAsGmより短い。
  function mayOperateAsGm(participantId) {
    return canParticipantOperateAsGm(store.state.participants, participantId);
  }

  // --- 送るところ ---

  function sendTo(peer, message) {
    if (peer.channel?.readyState !== 'open') return false;
    return peer.sender.send(message);
  }

  /**
   * 繋がっている全員へ配る。exceptに渡した相手だけ外す（送り主へ送り返さないため）。
   * server/index.jsのbroadcastToRoomに当たる。
   */
  function broadcast(message, except = null) {
    peers.forEach((peer) => {
      if (peer === except) return;
      sendTo(peer, message);
    });
  }

  // 送り主を含む全員へ配る（サーバーのbroadcastToRoom(entry, null, …)に当たる）。
  // ホスト自身は繋がっている相手ではないので、onLocalで自分の画面へ届ける。
  function broadcastToAll(message) {
    broadcast(message);
    onLocal(message);
  }

  function typingUsers() {
    const me = self();
    return typingUsersFrom([
      { participantId: me.participantId, name: me.name, isTyping: ownTyping },
      ...peers.values()
    ]);
  }

  function broadcastTyping() {
    broadcastToAll({ type: 'TYPING_USERS', users: typingUsers() });
  }

  function peerCount() {
    return peers.size;
  }

  return {
    broadcast,
    peerCount,
    handleSignal,

    /**
     * シグナリングの口を差し替える。切れて繋ぎ直したときに呼ぶ
     * （js/net-sync.jsのreconnectHostSignaling）。
     *
     * **繋がっている参加者には何も起きない。** 差し替えるのは「サーバーとの口」だけで、
     * 参加者とのDataChannelはこの口を通っていないため。サーバーが再起動しただけで
     * 卓が中断しては本末転倒なので、ここは必ず無傷で残す。
     */
    setSignaling(next) { link = next; },

    /**
     * ホスト自身の入室メッセージ。
     *
     * サーバー権威の部屋では、名乗った本人にも入室メッセージが出る（サーバーが送り主を
     * 含めて配るため）。ホスト権威でもそこは揃える——揃えないと、GMだけ自分の入室が
     * 出ないという分かりにくい差になる。P2P卓ではサーバー側が入室メッセージを出さない
     * ので（server/index.jsのIDENTIFY）、出すならここしかない。
     *
     * 名乗るたびに呼ばれるが、参加者と同じ規則で1回だけ出す。
     */
    announceSelf() {
      const me = self();
      const { announce, markDecided } = entryMessageDecision({
        enabled: showsEntryMessages(store.state),
        alreadyDecided: selfEntryDecided,
        participantId: me.participantId,
        otherParticipantIds: Array.from(peers.values(), (peer) => peer.participantId)
      });
      if (markDecided) selfEntryDecided = true;
      if (announce) announceEntryMessage(me.name);
    },

    /** ホスト自身の記入中。js/net-sync.jsのsendTypingStart/Stopから呼ばれる。 */
    setOwnTyping(isTyping) {
      if (ownTyping === isTyping) return;
      ownTyping = isTyping;
      broadcastTyping();
    },

    /** ホスト自身のスタンプ。参加者から来たときと同じ検査を通す。 */
    sendStamp(stampId) {
      const me = self();
      if (!me.participantId) return;
      if (!isKnownStampId(stampId, store.state.room)) return;
      if (!ownStampLimiter.allow()) return;
      broadcastToAll({
        type: 'ACTION',
        action: 'SHOW_STAMP',
        payload: { stampId: String(stampId), participantId: me.participantId, name: me.name }
      });
    },

    /** ホスト自身のチャット送信音。 */
    requestChatSendSound() {
      broadcastToAll({
        type: 'ACTION',
        action: 'CHAT_SEND_SOUND',
        payload: { chatSendSoundUrl: getChatSendSoundUrl() }
      });
    },

    /** ホスト自身からの部屋削除。画面側で既にGM限定にしてあるが、ここでも確かめる。 */
    requestRoomDeletion() {
      if (!mayOperateAsGm(self().participantId)) return;
      deleteRoom();
    }
  };
}
