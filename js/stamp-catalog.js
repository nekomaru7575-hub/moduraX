// js/stamp-catalog.js
// Core（どのゲームシステムでも使える）スタンプの一覧。IDと表示名と画像ファイル名だけを持つ
// データモジュール。プラグインが足すスタンプと束ねて引くのはjs/stamp-registry.jsの役目で、
// このファイルは「Coreの表」と「連打よけの上限」だけを持つ。
//
// サーバー（server/index.js）とブラウザ（js/stamp-panel.js・js/stamp-layer.js等）の両方が
// 読むので、このファイルはDOMにもwindowにも触れないこと（Node環境で読み込めなくなる）。
//
// 【なぜIDだけをやり取りするのか】
// スタンプの送信はWebSocketで他人の画面へ画像を出す操作なので、URLや任意の文字列を
// 受け取る作りにすると、そのまま「他人の画面に好きな画像を出す口」になる。
// 送受信するのはこの表（とプラグインの表）に載っているIDだけにして、実際のURLは
// 受け取った側が組み立てる。
//
// 【画像の差し替え】
// image/stamps/<file> に置く。fileに書いた名前をそのまま使うので、拡張子は
// .png / .svg / .webp / .gif のどれでもよい（server/index.jsのMIME_TYPESにある拡張子）。
// 種類・名前・枚数を変えたいときはこの配列を書き換えるだけでよく、他のファイルは触らない。
// 推奨は正方形・128px前後・背景透過（表示は64px程度）。

// プラグインが宣言する絵を置く、外部の置き場（js/asset-base.js）の中の階層名。
// Coreの自作スタンプはリポジトリ同梱で、そちらのパスは js/stamp-registry.js が持つ。
export const STAMP_IMAGE_DIR = 'stamps';

export const STAMPS = [
  { id: 'ok', label: 'OK', file: 'ok.png' },
  { id: 'no', label: 'No', file: 'no.png' },
  { id: '!', label: '!', file: '!.png' },
  { id: '?', label: '?', file: 'q.png' },
  { id: 'heart', label: '♥', file: 'heart.png' },
  { id: 'warikomi', label: '割込', file: 'warikomi.png' },
  { id: 'think', label: '考え中', file: 'think.png' },
  { id: `yoro`, label: `よろしく`, file:`yoro.png`}
];

// スタンプの連打よけ。1接続あたり windowMs の間に max 枚まで。
// 判定の権威はサーバー（server/index.jsのallowStamp）にあり、画面側（js/stamp-panel.js）は
// 同じ数字で押せない時間を出すためだけに読む。両方に書くと必ずどちらかがずれるので、
// 数字はここ1か所に置く。
export const STAMP_RATE_LIMIT = Object.freeze({ windowMs: 10_000, max: 6 });
