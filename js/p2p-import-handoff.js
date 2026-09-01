// js/p2p-import-handoff.js
// P2P卓を「ファイルから作る」ときに、読み込んだ状態を部屋一覧ページから盤面ページへ渡す。
//
// 【なぜ渡す必要があるか】通常の卓では、読み込んだファイルをそのままPOST /api/roomsの
// importedStateに載せてサーバーへ送る。これがサーバーで一番大きなボディを読む経路で、
// 上限93MB・ピークはその4〜5倍（server/memory-budget.jsに実測がある）——**512MBの天井を
// 決めているのはここ**。P2P卓は画像も音源もブラウザに置くと決めた以上、この経路も
// サーバーに通す理由が無い。空の部屋だけ作らせ、中身はホストになる自分のタブで流し込む。
//
// 【なぜsessionStorageか】ページ遷移をまたぐ必要があり、同じタブの中だけで、1回渡したら
// 用済みになる。localStorageだと消し忘れが別の日まで残り、IndexedDBだと非同期の分だけ
// 盤面の起動が複雑になる。sessionStorageは同じタブの遷移で残り、タブを閉じれば消える。
//
// 【大きさの限界と、その逃げ道】sessionStorageは5MB程度で溢れる。渡す前に画像・音源は
// 実体（IndexedDB）へ移してあるので、残るのは文字だけ＝発言1000件の卓で180KBに収まるが、
// 収まらない場合もありうる。そのときは**通常どおりサーバーへ送る**（js/room-index.js）。
// 遅い道が残っているだけで、壊れはしない。
//
// 【なぜ部屋IDを別のキーに分けるか】部屋IDが決まるのは状態を書いた後（サーバーが採番する）。
// 1つのキーにまとめると、IDを書き足すために数百KBの文字列をもう一度組み立て直すことになる。
// 分けておけば、後から小さい方だけ書けばよい。**IDが揃っていない控えは使わない**ので、
// 途中で失敗しても中途半端な状態が流し込まれることはない。

import { parseUntrustedJson } from './untrusted-json.js';

const STATE_KEY = 'mojulaX:p2pImport:state';
const ROOM_KEY = 'mojulaX:p2pImport:room';

/**
 * 渡す状態を控える。部屋を作る前に呼ぶ（溢れたかどうかで、サーバーへ送るかを決めるため）。
 * @param {object} state hydrateへ渡せる形まで均した状態（js/state-import.js）
 * @returns {boolean} 控えられたか。falseなら容量不足——呼び出し側は従来どおりサーバーへ送る
 */
export function stashPendingImport(state) {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    sessionStorage.removeItem(ROOM_KEY);
    return true;
  } catch {
    // QuotaExceededError のほか、プライベートモードでsessionStorage自体が使えない場合もある
    clearPendingImport();
    return false;
  }
}

/**
 * 控えてある状態の宛先を確定する。部屋の作成に成功した直後に呼ぶ。
 * @param {string} roomId
 */
export function commitPendingImport(roomId) {
  try {
    sessionStorage.setItem(ROOM_KEY, String(roomId));
  } catch {
    clearPendingImport();
  }
}

/**
 * この部屋あての控えを取り出す。**取り出したら消える**（1回だけ流し込むため。消さないと、
 * 同じタブで部屋を出入りするたびに読み込みが繰り返される）。
 * @param {string} roomId いま開いている部屋
 * @returns {object|null}
 */
export function takePendingImport(roomId) {
  let raw = null;
  try {
    if (sessionStorage.getItem(ROOM_KEY) !== String(roomId)) return null;
    raw = sessionStorage.getItem(STATE_KEY);
  } catch {
    return null;
  }
  clearPendingImport();
  if (!raw) return null;
  try {
    // 元をたどれば利用者のファイルなので、読み直しもparseUntrustedJsonを通す
    // （__proto__等を落とす。js/untrusted-json.js）。書いたのは自分だが、ここだけ
    // 素のJSON.parseにしておく理由が無い。
    const state = parseUntrustedJson(raw);
    return (state && typeof state === 'object') ? state : null;
  } catch {
    return null;
  }
}

/** 控えを捨てる。作成に失敗したときと、取り出した後。 */
export function clearPendingImport() {
  try {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(ROOM_KEY);
  } catch {
    // 使えない環境では元から何も残っていない
  }
}
