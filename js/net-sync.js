// js/net-sync.js
// ブラウザ側の同期クライアント。store.dispatchをラップして、ローカル適用に加えて
// 権威（サーバー、またはホスト権威P2Pのホスト役）へアクションを送信し、
// 権威・他クライアントから届いたアクションをローカルに適用する。
//
// 【運ぶ道は知らない】メッセージを実際に運ぶのはjs/net-transport.jsが選んだ実装で、
// このファイルはプロトコル（INIT / ACTION / RESYNC / IDENTIFY / TYPING_USERS /
// ENTRY_REQUIRED …）と繋ぎ直しだけを担う。WebSocketかWebRTCかはここには現れない。
// 分けてあるのはP2P化の検討のため（docs/p2p-migration-notes.md）。

const RECONNECT_DELAY_MS = 2000;

import { store } from './game-store.js';
import { adoptImportedState } from './state-import.js';
import { EventBus } from './EventBus.js';
import { createTransport, CLOSE_CODES, isHostMode } from './net-transport.js';
import { startHost } from './net-host.js';
import { currentRoomId, getStoredEntryPassword, setStoredEntryPassword } from './room-entry.js';
import { showRoomEntryDialog, closeRoomEntryDialog } from './room-entry-dialog.js';
import { playEntrySound, playChatSendSound } from './audio-player.js';
import { getCurrentParticipantId, getLocalUserId } from './local-identity.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

// 今つながっている道（js/net-transport.jsの契約）。切れている間はnull。
// ホスト役として動いている間はずっとnull——自分が権威なので、送る先が上に無い。
let transport = null;

// ホスト役として動いている場合の中継口（js/net-host.js）。ゲスト・WebSocket時はnull。
let host = null;

// この接続で一度でもINITを受け取ったか。受け取る前に「不正／未作成の部屋」で切られた場合
// だけ、繋ぎ直さずに部屋一覧へ案内する（下のhandleClose）。接続は常に1本なので、
// 繋ぎ直しのたびにconnect()で倒し直せばよい。
let hasReceivedInit = false;

// 開発用の合言葉で名乗れているか。サーバーだけが判定できる値なので、名乗りの結果
// （IDENTITY_ACCEPTED）で受け取って持っておく。接続ごとに名乗り直すため、切れたら忘れる。
let developerIdentity = false;

// この画面が名乗る値（{participantId, authToken}）。名乗りは接続ごとにサーバーが忘れるので、
// 繋がるたびに送り直せるようここで覚えておく。ゲスト参加へ切り替えたときはnullに戻す。
let identityToSend = null;

export function isDeveloperIdentity() {
  return developerIdentity;
}

// 入室パスワードの入力を求める。入力された値は覚えておき、繋がっていればその場で
// 送り直す。切れていた場合は、再接続後のENTRY_REQUIREDで自動的に使われる。
function askEntryPassword({ error }) {
  showRoomEntryDialog({
    password: getStoredEntryPassword(currentRoomId()),
    error,
    onSubmit: (password) => {
      setStoredEntryPassword(currentRoomId(), password);
      sendJoin();
    }
  });
}

// 覚えているパスワードで入室を試みる。まだ何も覚えていなければ入力を求める
// （パスワードなしの部屋ではサーバーがENTRY_REQUIREDを送らないので、ここは通らない）。
function sendJoin() {
  const password = getStoredEntryPassword(currentRoomId());
  if (!password) {
    askEntryPassword({ error: false });
    return;
  }
  transport?.send({ type: 'JOIN', password });
}

// 覚えている名乗りをサーバーへ送る。送れなければ何もしない：接続が開いたとき（open）と
// 部屋の中身を受け取ったとき（INIT）に必ず呼ぶので、そのどちらかで送り直される。
// 入室パスワードのある部屋では、照合が済むまでサーバーが名乗りを読み捨てる
// （server/index.jsの「認証前は他のメッセージを受け付けない」）ため、INIT側の呼び出しが要る。
function flushIdentify() {
  if (!identityToSend) return;
  transport?.send({ type: 'IDENTIFY', ...identityToSend });
}

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  hasReceivedInit = false;
  transport = createTransport({
    onOpen: handleOpen,
    onMessage: handleMessage,
    onClose: handleClose
  });
}

function handleOpen() {
  EventBus.emit('NET_STATUS_CHANGED', 'connected');
  // 繋ぎ直したときの名乗り直し。名乗りは接続ごとなので、ここで送らないと
  // 名乗り直すまでの間、GM限定の操作が権威側に黙って断られ続ける。
  flushIdentify();
}

// 届いたメッセージ1件。信用しないJSONとして読むところまではトランスポート側が済ませている
// （js/net-transport.jsの契約）。
function handleMessage(message) {
  // 入室パスワードのある部屋。これを通すまでINITは届かない（server/index.js参照）。
  if (message.type === 'ENTRY_REQUIRED') {
    sendJoin();
    return;
  }

  if (message.type === 'ENTRY_REJECTED') {
    askEntryPassword({ error: true });
    return;
  }

  if (message.type === 'INIT') {
    hasReceivedInit = true;
    // 入室できたので、パスワードを聞いたままの画面が残っていれば閉じる
    closeRoomEntryDialog();
    store.hydrate(message.state);
    // 覚えている名乗りをここでも送り直す。下のNET_INITIALIZEDでもjs/main.jsが名乗り直すが、
    // そちらは表示名からIDを導出し直す非同期の処理なので、届くまでのわずかな間だけ
    // 「画面は操作できるのにサーバーからは誰でもない」状態になってしまう。
    flushIdentify();
    // サーバーの最新状態を受け取った直後にだけ行いたい処理（参加者としての名乗り等）の
    // きっかけ。INITより前にdispatchしても、このhydrateで上書きされてしまうため。
    EventBus.emit('NET_INITIALIZED', message.state);
    return;
  }

  // GM限定の操作をサーバーに断られたときの差し戻し。送信前に自分の画面へ先に反映して
  // いるため、これを受けて正しい状態へ戻す。INITと違い、名乗り直し等の初期化
  // （NET_INITIALIZED）は起こさない。
  if (message.type === 'RESYNC') {
    store.hydrate(message.state);
    return;
  }

  // 名乗りが通った。developerが立っていれば開発用の合言葉での名乗りで、GMでなくても
  // GMと同じ操作ができる（server/index.jsのisDeveloperToken）。画面の「押せる／押せない」に
  // 反映させるため、IDENTITY_CHANGEDで各所に描き直してもらう。
  if (message.type === 'IDENTITY_ACCEPTED') {
    developerIdentity = !!message.developer;
    if (developerIdentity) console.info('[net-sync] 開発用の合言葉で名乗りました');
    // 購読側は誰が名乗っているかを自分で取り直すため、ここでは値を渡さない
    EventBus.emit('IDENTITY_CHANGED');
    return;
  }

  // 名乗りのトークンと参加者IDが対応していなかった場合。
  // 閲覧はできるが、GM限定の操作はゲスト同様に断られる。
  if (message.type === 'IDENTITY_REJECTED') {
    developerIdentity = false;
    console.warn('[net-sync] 参加者の名乗りが通りませんでした');
    EventBus.emit('IDENTITY_REJECTED');
    return;
  }

  // 記入中の参加者一覧。部屋の状態（ACTIONによる同期）とは別の揮発情報で、サーバーが
  // 権威を持って配ってくる（{id, name}の配列）。ここではそのまま上へ流すだけで、
  // 自分自身を除く等の描画判断はEventBus購読側（js/main.js）に委ねる。
  if (message.type === 'TYPING_USERS') {
    EventBus.emit('TYPING_USERS_CHANGED', message.users || []);
    return;
  }

  if (message.type === 'ACTION') {
    // チャット送信音。状態を変えない一回きりの通知なので、他のACTIONと違いlocalDispatchは
    // 通さない（game-store.jsのdispatchは未知のactionを黙って無視するだけだが、通す意味がない）。
    // URLはサーバーの環境変数CHAT_SEND_SOUND_URL由来で、このACTIONメッセージのpayloadだけで
    // 運ぶ（js/audio-player.js参照。入室音と同じ作り）。
    if (message.action === 'CHAT_SEND_SOUND') {
      if (message.payload?.chatSendSoundUrl) {
        playChatSendSound(message.payload.chatSendSoundUrl);
      }
      return;
    }

    // スタンプ。盤面に一定時間だけ出して消える合図で、状態にもログにも残さないので
    // CHAT_SEND_SOUNDと同じくlocalDispatchは通さない（js/stamp-layer.jsが描く）。
    if (message.action === 'SHOW_STAMP') {
      EventBus.emit('STAMP_RECEIVED', message.payload || {});
      return;
    }

    localDispatch(message.action, message.payload);
    // 入室メッセージに合わせた入室音。URLはサーバーの環境変数ENTRY_SOUND_URL由来で、
    // 状態には載せずこのACTIONメッセージのpayloadだけで運ぶ（js/audio-player.js参照）。
    if (message.action === 'ADD_ENTRY_MESSAGE' && message.payload?.entrySoundUrl) {
      playEntrySound(message.payload.entrySoundUrl);
    }
  }
}

// 切れた。codeの意味はjs/net-transport.jsのCLOSE_CODES（WebRTC実装も同じ値を立てて返す）。
function handleClose({ code }) {
  transport = null;
  EventBus.emit('NET_STATUS_CHANGED', 'disconnected');
  // 名乗りは接続ごと。切れた時点で開発用の権限も一旦落とす（再接続時に名乗り直す）
  developerIdentity = false;

  // 部屋が削除された場合は、途中まで参加していたかに関わらず再接続を試みても
  // 無駄なので部屋一覧へ案内する。
  if (code === CLOSE_CODES.ROOM_DELETED) {
    alert('この部屋は削除されました。部屋一覧へ戻ります。');
    window.location.href = '/';
    return;
  }

  // 入室パスワードを通らないまま切られた場合は、繋ぎ直して聞き直す（部屋は在る）。
  // ダイアログを開いたままにしておくと、再接続後のENTRY_REQUIREDで送信し直される。
  if (code === CLOSE_CODES.ENTRY_REJECTED) {
    setTimeout(connect, RECONNECT_DELAY_MS);
    return;
  }

  // 一度もINITを受け取れないまま、不正/未作成の部屋を理由に切断された場合は、
  // 再接続を試みても無駄なので部屋一覧へ案内する。
  if (!hasReceivedInit && (code === CLOSE_CODES.INVALID_ROOM || code === CLOSE_CODES.ROOM_NOT_FOUND)) {
    alert('この部屋には接続できませんでした（存在しないか、まだ作成されていません）。部屋一覧へ戻ります。');
    window.location.href = '/';
    return;
  }

  setTimeout(connect, RECONNECT_DELAY_MS);
}

// 発言1件を後から指すための鍵。部屋の中で重複しなければよいので、参加者IDのような
// 導出はせず単なるランダム値でよい（crypto.randomUUIDが無い環境用の控えも用意する）。
function generateChatEntryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// チャットの発言に、その1件を指す鍵（id）と発言者（ownerId）を刻む。
//
// 下のtimeと同じくaction発生源で1回だけ確定させる。ここでなくgame-store.js側で作ると、
// 各クライアントとサーバーがそれぞれ別のidを振ってしまい、編集の指し先が食い違う。
// 発言の入口はjs/main.jsのapplyLogだけでなくプラグインからの直接dispatchにもあるので
// （js/parameters/以下）、全部が通るこのラッパに置いて取りこぼしを無くす。
//
// idが必要なのは、配列の位置では発言を指せないため。楽観適用のせいで同時発言の並びは
// クライアント間でずれ得るので、位置で指すと他人の画面では別の発言を書き換えてしまう。
// ownerIdは「編集してよいのは本人とGMだけ」の判定に使う（js/room-authority.jsの
// canEditChatEntry）。表示名未設定（ゲスト）の場合はnullのままで、本人にも直せない。
function withStampedChatEntry(action, payload) {
  if (action !== 'ADD_CHAT_MESSAGE' || !payload?.entry) return payload;

  return {
    ...payload,
    entry: {
      ...payload.entry,
      id: payload.entry.id || generateChatEntryId(),
      ownerId: payload.entry.ownerId ?? getCurrentParticipantId()
    }
  };
}

// action発生源（＝dispatchのラッパ）で時刻を1回だけ確定させ、payload.timeとして乗せる。
// ローカル楽観適用（localDispatch）と送信の両方より前に確定させるので、送信者のローカル・
// 権威側の適用・他クライアントへの中継適用は全員この確定済みの値を見ることになり、
// 誰も自分の時計でDate.now()を呼び直さない（js/game-store.jsのwithChatEntry/withSystemLogが
// payload.timeを尊重する）。呼び出し側が渡したpayload自体は書き換えず、新しいオブジェクトを
// 作って使う（js/game-store.jsと同じく、渡された引数を破壊的に書き換えない流儀に揃える）。
// チャットの発言に刻むid・ownerIdも同じ理由でここで確定させる（withStampedChatEntry）。
function stampPayload(action, payload) {
  const time = Number.isFinite(payload?.time) ? payload.time : Date.now();
  return withStampedChatEntry(action, { ...(payload || {}), time });
}

export function initNetSync() {
  if (isHostMode()) {
    initAsHost();
    return;
  }

  // ローカルでの操作を権威へ転送する。権威由来のアクション適用はlocalDispatchを
  // 直接呼ぶため、ここは通らない（再送信ループにならない）。
  store.dispatch = (action, payload) => {
    const stampedPayload = stampPayload(action, payload);
    localDispatch(action, stampedPayload);
    transport?.send({ type: 'ACTION', action, payload: stampedPayload });
  };

  connect();
}

// ホスト役として動く（`?net=rtc&host=1`）。この画面のstoreがそのまま部屋の権威になり、
// 送り先は「繋がっている参加者たち」になる。トランスポート（transport）は持たない——
// 自分より上の権威が無いので、送る相手が居ない。
//
// 【スパイクの範囲】js/net-host.jsの冒頭を参照。永続化が無いので、このタブを閉じると
// 部屋の状態は消える。
function initAsHost() {
  console.info('[net-sync] ホスト役として動きます（この画面が部屋の権威になります）');

  host = startHost({
    applyRemote: localDispatch,
    // サーバーから貰う部屋の初期値。ここから先は自分が権威なので、以後サーバーの
    // 言うことは聞かない（js/net-signaling.jsのonServerInitは1回だけ呼ばれる）。
    onSeeded: (state) => {
      store.hydrate(state);
      EventBus.emit('NET_STATUS_CHANGED', 'connected');
      // 参加者としての名乗り等のきっかけ。ゲストのINIT受信時と同じ役割
      // （js/main.jsがこれを待っている）。
      EventBus.emit('NET_INITIALIZED', state);
    }
  });

  store.dispatch = (action, payload) => {
    const stampedPayload = stampPayload(action, payload);
    localDispatch(action, stampedPayload);
    host.broadcast({ type: 'ACTION', action, payload: stampedPayload });
  };

  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
}

// この接続での名乗りをサーバーへ伝える。表示名から導出した公開ID（participantId）と、
// 状態には載せない名乗り用の値（authToken）を送る。サーバーはこの2つを突き合わせて
// 「そのIDを名乗ってよいか」を判断し、GM限定の操作の可否に使う（server/index.jsのverifyIdentity）。
// 接続が切れるとサーバーは忘れるので、値はidentityToSendに覚えておき、繋がるたび
// （open・INIT）にflushIdentifyで送り直す。まだ繋がっていない間に呼ばれても取りこぼさない。
// nameは入室メッセージ用のニックネーム（サーバーは状態を持たないため、名乗りのたびに渡す）。
//
// ホスト役のときは送り先が無いので、flushIdentifyは空振りする（transportがnull）。
// それでよい：自分の名乗りを自分で検算しても意味が無く、画面の描き直しに要る
// IDENTITY_CHANGEDはjs/main.js側が既に撃っている。developerIdentityがfalseのままなのも
// 正しい——開発用の合言葉はサーバーの環境変数で、ホストには判定材料が無い。
export function sendIdentify(participantId, authToken, name) {
  // 名乗り直しの結果が返るまでは、前の名乗りで得た権限を持ち越さない
  developerIdentity = false;
  // 名前なし（ゲスト参加）への切り替え。覚えていた名乗りも捨てる：残しておくと、
  // 次に繋ぎ直したときに前の人として名乗り直してしまう。
  identityToSend = (participantId && authToken) ? { participantId, authToken, name } : null;
  flushIdentify();
}

// 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。URLの決定は
// サーバー任せ（環境変数CHAT_SEND_SOUND_URL）で、ここでは要求を送るだけ。どの発言が「素」かの
// 判断はjs/main.jsのsubmitChatText側が持つ。サーバーは送信者を含む部屋の全員にACTION
// （action: 'CHAT_SEND_SOUND'）で配り直す（上のACTIONハンドラ参照）。
export function requestChatSendSound() {
  transport?.send({ type: 'REQUEST_CHAT_SEND_SOUND' });
}

// スタンプを送る。requestChatSendSoundと同じ揮発メッセージで、状態もログも変えない。
// 送るのはIDだけ（画像URLも表示名もサーバー／受け手側が決める。js/stamp-catalog.js冒頭参照）。
// 名乗っていない場合はサーバーが黙って捨てるので、押せないようにするのは画面側の仕事。
export function sendStamp(stampId) {
  transport?.send({ type: 'SEND_STAMP', stampId });
}

// 部屋の削除をサーバーへ要求する。サーバー側は自分を含む全クライアントを退室させ、
// その場で実データを消す（切断の完了は待たない。server/index.jsのstartRoomDeletion）。
// 結果は各クライアントの切断（CLOSE_CODES.ROOM_DELETED）で通知される。
export function requestRoomDeletion() {
  transport?.send({ type: 'DELETE_ROOM' });
}

// メイン入力欄が空→非空になった瞬間に呼ぶ。「記入中」を要求を送るだけの揮発的な通知で、
// requestChatSendSoundと同じ流儀（状態は変えず、サーバーへ要求を送るのみ）。
export function sendTypingStart() {
  transport?.send({ type: 'TYPING_START' });
}

// メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。
export function sendTypingStop() {
  transport?.send({ type: 'TYPING_STOP' });
}

// ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと
// 置き換える。ローカルには即座に反映し、サーバーには別途通知して他クライアントにも
// ブロードキャストしてもらう（ADD_CHAT_MESSAGE等の通常アクションとは別経路）。
export function replaceState(newState) {
  // 取り込みは必ずadoptImportedStateを通す（js/state-import.js）。今の部屋の参加者一覧を
  // 引き継がないと、読み込んだ本人がその場でGM権限を失う。サーバー側も同じ関数を通すが、
  // ここで通しておかないと、送り返されるINITが届くまでの間だけ画面が食い違う。
  // myBackyardOwnerId：ファイルに記録された「保存した利用者のバックヤードのコマ」を、
  // 読み込んだこの利用者の棚へ付け替えるための宛先。表示名未設定などで参加者IDが
  // 取れない場合は、listMyBackyardTokens（js/character-panel.js）のownerId不在時と同じ
  // 判定基準に合わせるため、ブラウザ単位のIDをmyBackyardOwnerLocalIdとして渡す。
  const adopted = adoptImportedState(newState, {
    participants: store.state.participants,
    myBackyardOwnerId: getCurrentParticipantId(),
    myBackyardOwnerLocalId: getLocalUserId()
  });
  store.hydrate(adopted);

  // ホスト役のときは自分が権威なので、送るのではなく配る。データURLの複製し直し
  // （サーバー側のadoptStateMedia）に当たるものは無いので、画像は読み込んだ形のまま
  // 全員へ渡ることになる——スパイクの割り切り（js/net-host.js冒頭）。
  if (host) {
    host.broadcast({ type: 'INIT', state: store.state });
    return;
  }

  transport?.send({ type: 'REPLACE_STATE', state: adopted });
}
