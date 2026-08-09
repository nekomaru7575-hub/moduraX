// js/untrusted-json.js
// 自分が書いたのではないJSONの読み方。ファイルの読み込み・HTTPのボディ・WebSocketの
// メッセージなど、外から来たJSONは必ずここを通す。
//
// JSON.parseは "__proto__" というキーをown propertyとして作る（オブジェクトリテラルと違い、
// プロトタイプの差し替えにはならない）。差し替えにならないので即座に危険ではないが、
// この状態はそのままRedisへ保存され、部屋にいる全員へ配られる。すると
// tokens・panels・chatLogsのようなキー付きマップに、Object.entriesで拾える "__proto__" という
// 名前の要素が混ざり、コマでもタブでもないものをコマ・タブとして扱う処理が例外を投げる。
// サーバーは1メッセージ分を捨てて耐えるが、その部屋は壊れたまま残り続ける。
//
// 取り除くのはJSON.parseのreviverで行う。自前で再帰して歩くと、深く入れ子にしたJSONを
// 送られたときにスタックを使い切ってプロセスごと落ちるため、走査はJSON.parseに任せる。
// （reviverがundefinedを返したキーは取り除かれる）
//
// どこからでも読めるよう、他のモジュールに依存しない小さなファイルにしてある
// （コマ作成ページのようにgame-store.jsを読み込まない画面からも使うため）。

const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * 外から来たJSON文字列を、危険なキーを落として読む。
 * @param {string} text JSON文字列
 * @returns {*} 読み取った値（JSON.parseと同じく、壊れていれば例外を投げる）
 */
export function parseUntrustedJson(text) {
  return JSON.parse(text, (key, value) => (UNSAFE_JSON_KEYS.has(key) ? undefined : value));
}
