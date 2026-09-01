// js/host-persistence.js
// P2P卓の永続化。ホスト役のタブが、部屋の状態を一定間隔でサーバーへ預ける。
//
// 【なぜ要るか】P2P卓の状態はホストのタブの中にしか無い。同期をサーバーから外した以上
// これは避けられないが、**タブを閉じた瞬間にその日の卓が消える**のは実用にならない。
// 保存先（Redis／server/rooms）を持っているのはサーバーだけなので、こちらから預ける。
//
// 【同期経路には戻さない】預けるのは控えであって、同期ではない。サーバーは受け取った
// 状態を保存するだけで、誰にも配らない（server/index.jsのHOST_SNAPSHOT）。**1操作ごとに
// 送るのでもない**——それをやると結局サーバーが全操作を捌くことになり、P2P化の意味が消える。
//
// 【5分に1回で十分】1回の控えは状態まるごと（育った卓で200KB前後）なので、頻度が
// そのまま通信量とRedisへの書き込みになる。実測では5秒間隔で1卓あたり毎時180MB、
// 5分間隔なら約2.6MB。控えはバックアップであって同期ではないので、決め方は
// 「クラッシュしたときに巻き戻ってよい幅」だけでよい。間隔は
// js/net-host-rules.js の SNAPSHOT_INTERVAL_MS。
//
// 【閉じる瞬間の吐き出しには上限がある】pagehide / visibilitychange でその瞬間に送るが、
// **状態が大きいと出し切れない**。実測：1.5KBと65KBは残ったが、221KB（発言1000件の卓）は
// 届かなかった——ページの片付けが先に進み、大きなフレームが回線に出ない。
// つまり5分の幅に引っかかるのは、
//   ・ブラウザごと落ちた／電源が切れた／回線が死んだ
//   ・**育った卓（およそ100KB超）で、同じタブのまま部屋一覧などへ移った**
// の2つ。後者を潰すには送る前に圧縮するのが筋（docs/p2p-migration-notes.mdの0-5節⑥）。
//
// 【副産物】サーバーの持っている状態が育つので、ホストがリロードしても続きから始まる。
// 「誰がGMか」もサーバーから見えるようになり、ホスト役の資格判定が実態に追いつく
// （server/index.jsのSIGNAL_HELLO）。

import { EventBus } from './EventBus.js';
import { store } from './game-store.js';
import { nextSnapshotDelay } from './net-host-rules.js';

/**
 * ホストの控えの送信を始める。ホスト役になったときに1回だけ呼ぶ。
 *
 * @param {object} options
 * @param {(message: object) => boolean} options.send サーバーへ送る口（signaling.sendToServer）
 * @param {object|null} [options.seedState] サーバーから貰った初期値。これと同じ内容は送らない
 * @returns {{ flush: () => void, stop: () => void }}
 */
export function startHostPersistence({ send, seedState = null }) {
  let timer = null;
  // 最後に送った時刻。間引き（スロットル）の基準。まだ一度も送っていなければnullで、
  // その場合は最初の変更を待たずに預ける（開いた直後に落ちた卓を丸ごと失わないため）。
  let lastSentAt = null;
  let stopped = false;
  // 最後に送った内容。同じものを送り直さない——サーバー側にも同内容なら書かない歯止めが
  // あるが（persistRoomNow）、そこまで運ぶ帯域はこちらでしか節約できない。
  // 種と同じ内容を最初に送り返さないよう、貰った時点の姿を入れておく。
  let lastSentJson = seedState ? safeStringify(seedState) : null;

  function safeStringify(state) {
    try {
      return JSON.stringify(state);
    } catch {
      return null;
    }
  }

  function sendNow() {
    if (stopped) return;
    const json = safeStringify(store.state);
    // 中身が変わっていなければ送らない。間引きの時計（lastSentAt）も進めない——進めると
    // 「動きの無い間に時計だけ進み、次の変更が余計に待たされる」ことになる。
    if (json === null || json === lastSentJson) return;
    // 送れたときだけ「送った」ことにする。切れている間に諦めると、繋がり直した後も
    // 同じ内容だからと送らないままになり、その卓は永久に保存されない。
    if (send({ type: 'HOST_SNAPSHOT', state: store.state })) {
      lastSentJson = json;
      lastSentAt = Date.now();
    }
  }

  // 変更があったら、前回から間隔が空くのを待って送る（間引き）。
  //
  // **予約済みなら何もしない。** デバウンスのように予約を取り直すと、操作が続いている
  // 卓ほど控えが遅れることになり、一番失いたくない状況で一番守られない。
  function onChanged() {
    if (stopped || timer) return;
    const delayMs = nextSnapshotDelay({ now: Date.now(), lastSentAt });
    timer = setTimeout(() => {
      timer = null;
      sendNow();
    }, delayMs);
  }

  /** いま送る（待たない）。タブを閉じるときと、ホスト役を降りるときに使う。 */
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    sendNow();
  }

  // ホスト役を降りたとき。EventBusには購読をやめる口が無いので、stoppedを立てて
  // 以後の呼び出しを空振りさせる（js/EventBus.js）。
  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  // タブを閉じる・別のページへ移る。ここで送らないと、デバウンスの待ち時間ぶんの操作が
  // 毎回失われる（GMが部屋を閉じる＝一番失いたくない瞬間でもある）。
  // pagehideはbeforeunloadと違ってモバイルでも発火する。
  function onPageHide() {
    flush();
  }

  // モバイルではタブを閉じずに離れることの方が多く、その場合pagehideが来ないことがある。
  // 見えなくなった時点でも一度出しておく。
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') flush();
  }

  EventBus.subscribe('STATE_CHANGED', onChanged);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return { flush, stop };
}
