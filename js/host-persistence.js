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
import { nextSnapshotDelay, MAX_SNAPSHOT_BYTES } from './net-host-rules.js';
// base64への詰め替えは実体の配送と同じもので済む（js/asset-store.js の冒頭にある
// 「JSONの道へ乗せるための詰め替え」）。ここのためだけに同じものをもう1つ作らない。
import { blobToBase64 } from './asset-store.js';

// 圧縮せずにそのまま送ってよい大きさ。**閉じる瞬間に回線へ出し切れる上限**として
// 実測で決めた（1.5KBと65KBは出せた／221KBは出せなかった）。安全側に64KBで切る。
const RAW_SNAPSHOT_LIMIT_BYTES = 64 * 1024;

// 圧縮済みの控えを用意し直すまでの、操作が途切れてからの待ち時間。
// 閉じる瞬間は待てない（awaitするとページの片付けが先に進む）ので、**あらかじめ
// 用意しておいたものを送る**という形にしている。ここを短くするほど閉じたときに失う幅が
// 縮むが、そのぶんGMのタブでgzipが走る回数が増える。221KBで1回10ms前後。
const WARM_DELAY_MS = 2000;

/**
 * 状態のJSONをgzipしてbase64にする。使えない環境ではnull（呼び出し側は生で送る）。
 *
 * CompressionStreamはChrome 80 / Firefox 113 / Safari 16.4 以降。無い環境では
 * 圧縮なしのまま動く——大きい卓で閉じる瞬間の取りこぼしが起きやすくなるだけで、
 * 5分ごとの控えは通る。
 */
async function gzipToBase64(json) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return await blobToBase64(await new Response(stream).blob());
  } catch (error) {
    console.warn('[host-persistence] 控えを圧縮できませんでした:', error.message);
    return null;
  }
}

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
  // 圧縮済みの控え。{ json, body }で、jsonはそれを作った時点の状態。
  // 閉じる瞬間はawaitできないので、ここに用意してあるものをそのまま送る。
  let warm = null;
  let warmTimer = null;
  // 大きすぎて送れない旨は1回だけ言う（5分ごとに繰り返してもうるさいだけ）
  let oversizeWarned = false;

  function safeStringify(state) {
    try {
      return JSON.stringify(state);
    } catch {
      return null;
    }
  }

  // 圧縮したものを送る（できなければ生で）。定期の控えはここを通る——待てる場面なので、
  // 用意が間に合っていなければその場で圧縮する。
  async function sendNow() {
    if (stopped) return;
    const json = safeStringify(store.state);
    // 中身が変わっていなければ送らない。間引きの時計（lastSentAt）も進めない——進めると
    // 「動きの無い間に時計だけ進み、次の変更が余計に待たされる」ことになる。
    if (json === null || json === lastSentJson) return;

    const body = warm?.json === json ? warm.body : await gzipToBase64(json);
    if (stopped) return;
    if (body) warm = { json, body };
    deliver(json, body);
  }

  // 実際に送る一手。ここだけは同期（閉じる瞬間から呼ぶため）。
  function deliver(json, body) {
    // サーバーが受け取れる上限（js/net-host-rules.jsのMAX_SNAPSHOT_BYTES）を超えていたら、
    // 送っても向こうで捨てられる。**捨てられたことはこちらに返ってこない**ので、黙って
    // 送り続けると「保存されていない卓」が保存されているつもりで進む。ここで気づかせる。
    //
    // 普通に遊んで届く値ではない（実測180KB／上限8MB）。届くとしたら、取り込んだファイルの
    // データURLが実体へ移らずに状態へ残っている場合で、それはこちらの直すべき不具合。
    // 文字数ではなくバイト数で測る。日本語は1文字3バイトになるので、json.lengthで見ると
    // 3分の1に見積もってしまい、サーバー側の判定とずれる。
    const bytes = new Blob([json]).size;
    if (bytes > MAX_SNAPSHOT_BYTES) {
      if (!oversizeWarned) {
        oversizeWarned = true;
        console.error('[host-persistence] 状態が大きすぎて控えを預けられません'
          + `（${Math.floor(bytes / 1024)}KB / 上限 ${MAX_SNAPSHOT_BYTES / 1024 / 1024}MB）。`
          + '画像がこのブラウザの実体へ移らずに状態へ残っている可能性があります。');
      }
      return;
    }

    const message = body
      ? { type: 'HOST_SNAPSHOT', encoding: 'gzip', body }
      : { type: 'HOST_SNAPSHOT', state: store.state };
    // 送れたときだけ「送った」ことにする。切れている間に諦めると、繋がり直した後も
    // 同じ内容だからと送らないままになり、その卓は永久に保存されない。
    if (send(message)) {
      lastSentJson = json;
      lastSentAt = Date.now();
    }
  }

  // 圧縮済みの控えを用意しておく。操作が途切れてから1回だけ走る。
  // これがあるおかげで、閉じる瞬間に待たずに小さいものを送れる。
  function scheduleWarm() {
    if (stopped) return;
    if (warmTimer) clearTimeout(warmTimer);
    warmTimer = setTimeout(async () => {
      warmTimer = null;
      const json = safeStringify(store.state);
      if (json === null || warm?.json === json || json === lastSentJson) return;
      const body = await gzipToBase64(json);
      if (body && !stopped) warm = { json, body };
    }, WARM_DELAY_MS);
  }

  // 変更があったら、前回から間隔が空くのを待って送る（間引き）。
  //
  // **予約済みなら何もしない。** デバウンスのように予約を取り直すと、操作が続いている
  // 卓ほど控えが遅れることになり、一番失いたくない状況で一番守られない。
  function onChanged() {
    if (stopped) return;
    // 閉じる瞬間に備えて、圧縮済みの控えは間隔と関係なく用意し直しておく。
    scheduleWarm();
    if (timer) return;
    const delayMs = nextSnapshotDelay({ now: Date.now(), lastSentAt });
    timer = setTimeout(() => {
      timer = null;
      sendNow();
    }, delayMs);
  }

  /**
   * いま送る（待たない）。タブを閉じるとき・ホスト役を降りるときに使う。
   *
   * **ここではawaitできない。** 閉じる瞬間にawaitすると、続きが動く前にページの片付けが
   * 進んでしまう。だから圧縮は「あらかじめ用意しておいたもの」しか使わない。
   * 3つの手を順に試す：
   *   1. 用意済みの控えが今の状態と一致 … それを送る（小さいので確実に出る）
   *   2. 生でも64KBに収まる            … 生で送る（今の状態そのままを残せる）
   *   3. どちらでもない                … 数秒古い控えを送る。丸ごと失うよりはよい
   */
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (stopped) return;

    const json = safeStringify(store.state);
    if (json === null || json === lastSentJson) return;

    if (warm?.json === json) {
      deliver(json, warm.body);
      return;
    }
    if (new Blob([json]).size <= RAW_SNAPSHOT_LIMIT_BYTES) {
      deliver(json, null);
      return;
    }
    if (warm) {
      // 最後に用意してから数秒ぶん古い。それでも、サーバーが持っているもの
      // （最大5分前）よりは新しい。
      deliver(warm.json, warm.body);
    }
  }

  // ホスト役を降りたとき。EventBusには購読をやめる口が無いので、stoppedを立てて
  // 以後の呼び出しを空振りさせる（js/EventBus.js）。
  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (warmTimer) clearTimeout(warmTimer);
    timer = null;
    warmTimer = null;
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
