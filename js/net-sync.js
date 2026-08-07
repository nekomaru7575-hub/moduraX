// js/net-sync.js
// ブラウザ側のWebSocketクライアント。store.dispatchをラップして、ローカル適用に加えて
// サーバーへアクションを送信し、サーバー・他クライアントからのアクションをローカルに適用する。
//
// server/index.jsが静的ファイル配信とWebSocketを同じポートで行っているため、
// 接続先は「今このページを配信しているホスト」から自動で求める（手動での書き換え不要）。
// location.search（?room=room-3）を引き継ぎ、サーバー側でどの部屋の接続かを判別できるようにする。
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.search;

const RECONNECT_DELAY_MS = 2000;

// サーバーが「不正な部屋ID」「未作成（空き）の部屋」を理由に切断する際のcloseコード
// （server/index.jsのws.close(4000/4004, ...)と対応させている）。
const INVALID_ROOM_CLOSE_CODES = new Set([4000, 4004]);

// 部屋が削除されたことを理由に切断された際のcloseコード（server/index.jsと対応）。
// 削除操作をした本人・他の参加者を問わず、全員がこのコードで切断される。
const ROOM_DELETED_CLOSE_CODE = 4005;

// 入室パスワードを通らないまま切られた際のcloseコード（試行回数超過・待ち時間切れ）。
// 部屋自体は存在するので、少し待って繋ぎ直し、もう一度パスワードから聞き直す。
const ENTRY_CLOSE_CODE = 4006;

import { store } from './game-store.js';
import { adoptImportedState } from './state-import.js';
import { EventBus } from './EventBus.js';
import { currentRoomId, getStoredEntryPassword, setStoredEntryPassword } from './room-entry.js';
import { showRoomEntryDialog, closeRoomEntryDialog } from './room-entry-dialog.js';
import { playEntrySound, playChatSendSound } from './audio-player.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

let ws = null;

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
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'JOIN', password }));
  }
}

// 覚えている名乗りをサーバーへ送る。送れなければ何もしない：接続が開いたとき（open）と
// 部屋の中身を受け取ったとき（INIT）に必ず呼ぶので、そのどちらかで送り直される。
// 入室パスワードのある部屋では、照合が済むまでサーバーが名乗りを読み捨てる
// （server/index.jsの「認証前は他のメッセージを受け付けない」）ため、INIT側の呼び出しが要る。
function flushIdentify() {
  if (!identityToSend) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'IDENTIFY', ...identityToSend }));
}

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  ws = new WebSocket(WS_URL);
  let hasReceivedInit = false;

  ws.addEventListener('open', () => {
    EventBus.emit('NET_STATUS_CHANGED', 'connected');
    // 繋ぎ直したときの名乗り直し。名乗りは接続ごとなので、ここで送らないと
    // 名乗り直すまでの間、GM限定の操作がサーバーに黙って断られ続ける。
    flushIdentify();
  });

  ws.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

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

      localDispatch(message.action, message.payload);
      // 入室メッセージに合わせた入室音。URLはサーバーの環境変数ENTRY_SOUND_URL由来で、
      // 状態には載せずこのACTIONメッセージのpayloadだけで運ぶ（js/audio-player.js参照）。
      if (message.action === 'ADD_ENTRY_MESSAGE' && message.payload?.entrySoundUrl) {
        playEntrySound(message.payload.entrySoundUrl);
      }
    }
  });

  ws.addEventListener('close', (event) => {
    EventBus.emit('NET_STATUS_CHANGED', 'disconnected');
    // 名乗りは接続ごと。切れた時点で開発用の権限も一旦落とす（再接続時に名乗り直す）
    developerIdentity = false;

    // 部屋が削除された場合は、途中まで参加していたかに関わらず再接続を試みても
    // 無駄なので部屋一覧へ案内する。
    if (event.code === ROOM_DELETED_CLOSE_CODE) {
      alert('この部屋は削除されました。部屋一覧へ戻ります。');
      window.location.href = '/';
      return;
    }

    // 入室パスワードを通らないまま切られた場合は、繋ぎ直して聞き直す（部屋は在る）。
    // ダイアログを開いたままにしておくと、再接続後のENTRY_REQUIREDで送信し直される。
    if (event.code === ENTRY_CLOSE_CODE) {
      setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }

    // 一度もINITを受け取れないまま、不正/未作成の部屋を理由に切断された場合は、
    // 再接続を試みても無駄なので部屋一覧へ案内する。
    if (!hasReceivedInit && INVALID_ROOM_CLOSE_CODES.has(event.code)) {
      alert('この部屋には接続できませんでした（存在しないか、まだ作成されていません）。部屋一覧へ戻ります。');
      window.location.href = '/';
      return;
    }

    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

export function initNetSync() {
  // ローカルでの操作をサーバーへ転送する。サーバー由来のアクション適用はlocalDispatchを
  // 直接呼ぶため、ここは通らない（再送信ループにならない）。
  store.dispatch = (action, payload) => {
    localDispatch(action, payload);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ACTION', action, payload }));
    }
  };

  connect();
}

// この接続での名乗りをサーバーへ伝える。表示名から導出した公開ID（participantId）と、
// 状態には載せない名乗り用の値（authToken）を送る。サーバーはこの2つを突き合わせて
// 「そのIDを名乗ってよいか」を判断し、GM限定の操作の可否に使う（server/index.jsのverifyIdentity）。
// 接続が切れるとサーバーは忘れるので、値はidentityToSendに覚えておき、繋がるたび
// （open・INIT）にflushIdentifyで送り直す。まだ繋がっていない間に呼ばれても取りこぼさない。
// nameは入室メッセージ用のニックネーム（サーバーは状態を持たないため、名乗りのたびに渡す）。
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
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'REQUEST_CHAT_SEND_SOUND' }));
  }
}

// 部屋の削除をサーバーへ要求する。サーバー側は自分を含む全クライアントを退室させ、
// その場で実データを消す（切断の完了は待たない。server/index.jsのstartRoomDeletion）。
// 結果は各クライアントのws closeイベント（ROOM_DELETED_CLOSE_CODE）で通知される。
export function requestRoomDeletion() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'DELETE_ROOM' }));
  }
}

// ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと
// 置き換える。ローカルには即座に反映し、サーバーには別途通知して他クライアントにも
// ブロードキャストしてもらう（ADD_CHAT_MESSAGE等の通常アクションとは別経路）。
export function replaceState(newState) {
  // 取り込みは必ずadoptImportedStateを通す（js/state-import.js）。今の部屋の参加者一覧を
  // 引き継がないと、読み込んだ本人がその場でGM権限を失う。サーバー側も同じ関数を通すが、
  // ここで通しておかないと、送り返されるINITが届くまでの間だけ画面が食い違う。
  const adopted = adoptImportedState(newState, { participants: store.state.participants });
  store.hydrate(adopted);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'REPLACE_STATE', state: adopted }));
  }
}
