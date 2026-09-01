// js/sound-config.js
// 入室音・チャット送信音のURLを1か所で持つ。js/asset-base.jsと同じ流儀の、
// 「サーバーが決めた設定を起動時に受け取って抱えておくだけ」の小さなモジュール。
//
// 【なぜ要るか】
// この2つのURLはサーバーの環境変数（ENTRY_SOUND_URL / CHAT_SEND_SOUND_URL）由来で、
// 従来はサーバーが入室メッセージ・送信音のACTIONに載せて配っていた。P2P卓では権威が
// GMのタブになる（js/net-host.js）ため、ホスト役が同じACTIONを組み立てられるよう、
// ブラウザ側でも値を持てるようにする必要がある。
//
// 配り方はGET /api/config（js/main.jsが起動時に一度だけ読む）。ハードコードしないのは
// 従来と同じ約束で、音源を差し替えるのに環境変数だけで済む形を崩さないため。
//
// 【載せてよい値か】公開URLで、元からACTIONに載せて全参加者のブラウザへ渡していたもの。
// /api/configは誰でも叩けるので、ここへ増やしてよいのは同じ性質の値だけ。

let entrySoundUrl = null;
let chatSendSoundUrl = null;

/**
 * サーバーから受け取った設定を入れる。盤面の起動時に一度だけ呼ぶ。
 * 空文字・未設定はnullに均す（js/audio-player.jsは値が無ければAudioを作らない）。
 * @param {{ entrySoundUrl?: string|null, chatSendSoundUrl?: string|null }|null|undefined} config
 */
export function setSoundConfig(config) {
  entrySoundUrl = normalize(config?.entrySoundUrl);
  chatSendSoundUrl = normalize(config?.chatSendSoundUrl);
}

function normalize(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

/** 入室音のURL（未設定ならnull）。 */
export function getEntrySoundUrl() {
  return entrySoundUrl;
}

/** チャット送信音のURL（未設定ならnull）。 */
export function getChatSendSoundUrl() {
  return chatSendSoundUrl;
}
