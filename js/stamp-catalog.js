// js/stamp-catalog.js
// スタンプの一覧。IDと表示名と画像ファイル名だけを持つデータモジュール。
//
// サーバー（server/index.js）とブラウザ（js/stamp-layer.js・js/main.js）の両方が読む。
// サーバー側は「送られてきたIDが実在するか」の確認だけに使うので、このファイルは
// DOMにもwindowにも触れないこと（Node環境で読み込めなくなる）。
//
// 【なぜIDだけをやり取りするのか】
// スタンプの送信はWebSocketで他人の画面へ画像を出す操作なので、URLや任意の文字列を
// 受け取る作りにすると、そのまま「他人の画面に好きな画像を出す口」になる。
// 送受信するのはこの表に載っているIDだけにして、実際のURLは受け取った側が組み立てる。
//
// 【画像の差し替え】
// image/stamps/<file> に置く。fileに書いた名前をそのまま使うので、拡張子は
// .png / .svg / .webp / .gif のどれでもよい（server/index.jsのMIME_TYPESにある拡張子）。
// 種類・名前・枚数を変えたいときはこの配列を書き換えるだけでよく、他のファイルは触らない。
// 推奨は正方形・128px前後・背景透過（表示は64px程度）。

const STAMP_IMAGE_DIR = 'image/stamps';

export const STAMPS = [
  { id: 'ok', label: 'OK', file: 'ok.png' },
  { id: 'no', label: 'No', file: 'no.png' },
  { id: '!', label: '!', file: '!.png' },
  { id: '?', label: '?', file: 'q.png' },
  { id: 'heart', label: '♥', file: 'heart.png' },
  { id: 'warikomi', label: '割込', file: 'warikomi.png' },
  { id: 'think', label: '考え中', file: 'think.png' }
];

const BY_ID = new Map(STAMPS.map(stamp => [stamp.id, stamp]));

/** IDからスタンプを引く。知らないIDならnull。 */
export function findStampById(stampId) {
  return BY_ID.get(String(stampId ?? '')) ?? null;
}

/** サーバーが受け取ったIDを検証するための判定。 */
export function isKnownStampId(stampId) {
  return BY_ID.has(String(stampId ?? ''));
}

/**
 * チャットコマンド「スタンプ(拍手)」の引数からスタンプを引く。
 * 表示名でも id でも指定できるようにしておく（表示名を後から変えても、
 * idで書いたチャットパレットが壊れないため）。表記ゆれは無視する。
 */
export function findStampByName(rawName) {
  const text = String(rawName ?? '').trim().toLowerCase();
  if (!text) return null;
  return STAMPS.find(
    stamp => stamp.id.toLowerCase() === text || stamp.label.toLowerCase() === text
  ) ?? null;
}

/** 画像のURL（このアプリ自身が配る静的ファイル）。 */
export function stampImageUrl(stamp) {
  return `${STAMP_IMAGE_DIR}/${stamp.file}`;
}

/** 「使えるスタンプ: はい／いいえ／…」の案内文に使う。 */
export function listStampLabels() {
  return STAMPS.map(stamp => stamp.label);
}
