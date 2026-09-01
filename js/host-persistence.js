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
// 送るのは操作が途切れてから1回、まとめて。
//
// 【間隔はサーバーと同じ値】守っている資源が同じ（最後はどちらもRedisへの書き込み）なので、
// 数字は js/net-host-rules.js の SAVE_POLICY に1つだけ置いてある。
//
// 【副産物】サーバーの持っている状態が育つので、ホストがリロードしても続きから始まる。
// 「誰がGMか」もサーバーから見えるようになり、ホスト役の資格判定が実態に追いつく
// （server/index.jsのSIGNAL_HELLO）。

import { EventBus } from './EventBus.js';
import { store } from './game-store.js';
import { nextSaveDelay } from './net-host-rules.js';

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
  let deadline = null;
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
    if (json === null || json === lastSentJson) return;
    // 送れたときだけ「送った」ことにする。切れている間に諦めると、繋がり直した後も
    // 同じ内容だからと送らないままになり、その卓は永久に保存されない。
    if (send({ type: 'HOST_SNAPSHOT', state: store.state })) lastSentJson = json;
  }

  // 変更のたびに予約を取り直す（末尾デバウンス）。操作が続いている間は先送りされるが、
  // 期限（maxWaitMs）は最初の未保存の変更から数えるので、延々と先送りにはならない。
  // server/index.jsのschedulePersistForRoomと同じ形。
  function onChanged() {
    if (stopped) return;
    const { delayMs, deadline: nextDeadline } = nextSaveDelay({ now: Date.now(), deadline });
    deadline = nextDeadline;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      deadline = null;
      sendNow();
    }, delayMs);
  }

  /** いま送る（待たない）。タブを閉じるときと、ホスト役を降りるときに使う。 */
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      deadline = null;
    }
    sendNow();
  }

  // ホスト役を降りたとき。EventBusには購読をやめる口が無いので、stoppedを立てて
  // 以後の呼び出しを空振りさせる（js/EventBus.js）。
  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    deadline = null;
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
