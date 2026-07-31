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

import { store } from './game-store.js';
import { EventBus } from './EventBus.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

let ws = null;

// 開発用の合言葉で名乗れているか。サーバーだけが判定できる値なので、名乗りの結果
// （IDENTITY_ACCEPTED）で受け取って持っておく。接続ごとに名乗り直すため、切れたら忘れる。
let developerIdentity = false;

export function isDeveloperIdentity() {
  return developerIdentity;
}

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  ws = new WebSocket(WS_URL);
  let hasReceivedInit = false;

  ws.addEventListener('open', () => {
    EventBus.emit('NET_STATUS_CHANGED', 'connected');
  });

  ws.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (message.type === 'INIT') {
      hasReceivedInit = true;
      store.hydrate(message.state);
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

    // 名乗った合言葉と参加者IDが対応していなかった場合。
    // 閲覧はできるが、GM限定の操作はゲスト同様に断られる。
    if (message.type === 'IDENTITY_REJECTED') {
      developerIdentity = false;
      console.warn('[net-sync] 参加者の本人確認に通りませんでした（合言葉をご確認ください）');
      EventBus.emit('IDENTITY_REJECTED');
      return;
    }

    if (message.type === 'ACTION') {
      localDispatch(message.action, message.payload);
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

// この接続での名乗りをサーバーへ伝える。合言葉から導出した公開ID（participantId）と、
// 状態には決して載せない本人確認用の値（authToken）を送る。サーバーはこの2つを突き合わせて
// 「そのIDを名乗ってよいか」を判断し、GM限定の操作の可否に使う（server/index.jsのverifyIdentity）。
// 接続が切れると忘れられるので、再接続のたびに送り直す必要がある
// （js/main.jsがNET_INITIALIZEDのたびに名乗り直すため、その経路で送られる）。
export function sendIdentify(participantId, authToken) {
  // 名乗り直しの結果が返るまでは、前の名乗りで得た権限を持ち越さない
  developerIdentity = false;
  if (!participantId || !authToken) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'IDENTIFY', participantId, authToken }));
  }
}

// 部屋の削除をサーバーへ要求する。サーバー側は自分を含む全クライアントを退室させた上で
// （全員の退室が完了してから）実データを消す。結果は各クライアントのws closeイベント
// （ROOM_DELETED_CLOSE_CODE）で通知される。
export function requestRoomDeletion() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'DELETE_ROOM' }));
  }
}

// ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと
// 置き換える。ローカルには即座に反映し、サーバーには別途通知して他クライアントにも
// ブロードキャストしてもらう（ADD_CHAT_MESSAGE等の通常アクションとは別経路）。
export function replaceState(newState) {
  store.hydrate(newState);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'REPLACE_STATE', state: newState }));
  }
}
