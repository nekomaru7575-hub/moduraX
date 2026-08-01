// js/room-entry.js
// 部屋の入室パスワードを、このブラウザに覚えておくところ。
// 部屋ごとに保存し、接続のたびにサーバーへ送る（js/net-sync.jsのJOIN）。合言葉あらため
// 表示名（js/local-identity.js）と同じく、値はこのブラウザのlocalStorageから出ない——
// 裏を返せば、同じブラウザを使える人には見えてしまう。仲間内で部屋を仕切るための鍵で
// あって、強固な秘匿の保証ではない（サーバー側の限界はserver/index.jsのコメント参照）。

const KEY_PREFIX = 'mojulaX:roomEntry:';

function key(roomId) {
  return `${KEY_PREFIX}${roomId}`;
}

export function currentRoomId() {
  return new URLSearchParams(location.search).get('room') || '';
}

export function getStoredEntryPassword(roomId) {
  return localStorage.getItem(key(roomId)) || '';
}

export function setStoredEntryPassword(roomId, password) {
  if (password) localStorage.setItem(key(roomId), password);
  else localStorage.removeItem(key(roomId));
}

// アップロード等のHTTP経路に載せるヘッダ。HTTPヘッダにはASCIIしか置けないので、
// 日本語のパスワードでも壊れないようencodeURIComponentしてから渡す
// （サーバー側はserver/index.jsのentryPasswordFromHeadersで戻す）。
export function entryPasswordHeaders(roomId = currentRoomId()) {
  const password = getStoredEntryPassword(roomId);
  return password ? { 'X-Room-Password': encodeURIComponent(password) } : {};
}
