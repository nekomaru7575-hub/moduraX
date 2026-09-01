// js/net-chunk.js
// DataChannelで大きなメッセージを運ぶための分割と組み直し。ホスト役（js/net-host.js）と
// ゲスト側トランスポート（js/net-transport-rtc.js）の両方が使う。
//
// 【なぜ要るか】WebSocketと違い、DataChannel（SCTP）には1メッセージの上限がある。
// 上限は相手とのネゴシエーションで決まり（pc.sctp.maxMessageSize）、ブラウザや版で
// 変わる。超えたものを送ると**そのチャネルごと落ちる**——部屋の同期が丸ごと死ぬ。
//
// 疎通スパイクの時点ではINITを1発で送っていた。空の部屋でしか試していなかったので
// 露出していないが、データURLの背景が1枚でも入っていれば実運用では必ず超える。
// 大きくなるのはINIT・RESYNC（状態まるごと）と、参加者からのREPLACE_STATE（取り込み）。
// 向きが両方あるので、分割も組み直しも両側が持つ。
//
// 【上限は決め打ちしない】相手が申告した値を使い、取れないときだけ控えめな既定に落とす。
// 決め打ちにすると、上限の小さい環境で「ある日ある部屋だけ繋がらない」形で壊れる。
//
// このファイルはDOM・windowに触れないこと（Nodeから読み込んでテストするため）。

import { parseUntrustedJson } from './untrusted-json.js';

// 相手の上限が分からないときに使う値。RFCが全実装に求める最低限は64KiBだが、
// 実装差で丸められることがあるので、その手前で切る。
const FALLBACK_MAX_MESSAGE_BYTES = 32 * 1024;

// 封筒（{t,id,i,n,b}）とJSONの引用符ぶんの余白。本文の予算から先に引いておく。
const ENVELOPE_OVERHEAD_BYTES = 256;

// 組み直しの上限。ここを持たないと、参加者が「全体で1万個ある」と言い張るだけで
// ホストのタブのメモリを好きなだけ食える。サーバー側のWS_HEAVY_FRAME_BYTESに当たる歯止めで、
// 値は取り込み（REPLACE_STATE）が通る大きさに合わせてある。
export const MAX_REASSEMBLED_BYTES = 16 * 1024 * 1024;

// 同時に組み立てかけていられるメッセージの数。1本ずつ送る作りなので普通は1。
// 増えるのは相手が壊れているか、わざと散らしている場合。
const MAX_PENDING_MESSAGES = 4;

// 送信を止める水位と、再開する水位。止めないと、遅い相手へINITを流し込んだときに
// 送信バッファだけが膨らんでタブのメモリを食う。
const BUFFER_HIGH_WATER_BYTES = 1024 * 1024;
const BUFFER_LOW_WATER_BYTES = 256 * 1024;

/**
 * このチャネルで1メッセージに載せてよい本文のバイト数。
 * @param {RTCPeerConnection|null|undefined} pc 相手との接続（pc.sctp.maxMessageSizeを見る）
 * @returns {number}
 */
export function chunkBudgetBytes(pc) {
  const declared = Number(pc?.sctp?.maxMessageSize);
  // 0や無限大を返す実装がある。どちらもそのままでは使えないので既定へ落とす。
  const usable = Number.isFinite(declared) && declared > 0
    ? Math.min(declared, FALLBACK_MAX_MESSAGE_BYTES)
    : FALLBACK_MAX_MESSAGE_BYTES;
  return Math.max(1024, usable - ENVELOPE_OVERHEAD_BYTES);
}

/**
 * JSON文字列を封筒に詰める。上限に収まるなら分割せず、そのままの文字列を1つだけ返す。
 *
 * 分ける単位はJSの文字（UTF-16のcode unit）で、予算はバイト。1文字は最大3バイト
 * （サロゲートペアは2文字で4バイト＝1文字あたり2バイト）なので、3で割れば必ず収まる。
 * 数え直すより速く、外すとチャネルが落ちる側なので安全側に倒す。
 *
 * @param {string} text 送りたいJSON文字列
 * @param {number} budgetBytes 1メッセージに載せてよい本文のバイト数
 * @param {string} id このメッセージを指す値（組み直し側の突き合わせに使う）
 * @returns {string[]} そのまま channel.send() に渡せる文字列の配列
 */
export function chunkMessage(text, budgetBytes, id) {
  if (byteLength(text) <= budgetBytes) return [text];

  const perChunkChars = Math.max(1, Math.floor(budgetBytes / 3));
  const slices = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + perChunkChars, text.length);
    // サロゲートペアの片割れで切らない。切ると、送信時にその1文字がU+FFFDへ置き換わり、
    // 組み直したJSONが壊れる（しかも「たまに絵文字の入った部屋だけ」という形で出る）。
    if (end < text.length && isHighSurrogate(text.charCodeAt(end - 1))) end -= 1;
    slices.push(text.slice(cursor, end));
    cursor = end;
  }

  return slices.map((body, index) => JSON.stringify({
    t: 'chunk', id, i: index, n: slices.length, b: body
  }));
}

function isHighSurrogate(code) {
  return code >= 0xd800 && code <= 0xdbff;
}

// UTF-8にしたときのバイト数。TextEncoderが無い環境でも動くよう自前で数える
// （このモジュールはNodeからも読まれる）。
function byteLength(text) {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (isHighSurrogate(code)) { bytes += 4; i += 1; }
    else bytes += 3;
  }
  return bytes;
}

/**
 * 届いた文字列を組み直して、完成したメッセージだけを渡す。
 *
 * 分割されていないものはそのまま通す（封筒かどうかで見分ける）。信用しないJSONとして
 * 読むところまでここが持つので、呼ぶ側はparseUntrustedJsonを重ねて呼ばなくてよい。
 *
 * @param {object} options
 * @param {(message: object) => void} options.onMessage 完成した1件
 * @param {(reason: string) => void} [options.onDrop] 捨てたとき（相手が壊れている・大きすぎる）
 * @returns {{ receive: (raw: string) => void, reset: () => void }}
 */
export function createChunkReassembler({ onMessage, onDrop }) {
  // id -> { parts: string[], received: number, total: number, bytes: number }
  const pending = new Map();

  function drop(reason) {
    onDrop?.(reason);
  }

  function receive(raw) {
    const text = typeof raw === 'string' ? raw : String(raw ?? '');

    let parsed;
    try {
      parsed = parseUntrustedJson(text);
    } catch {
      drop('壊れたJSON');
      return;
    }

    if (!parsed || parsed.t !== 'chunk') {
      onMessage(parsed);
      return;
    }

    const id = String(parsed.id ?? '');
    const total = Number(parsed.n);
    const index = Number(parsed.i);
    const body = typeof parsed.b === 'string' ? parsed.b : null;
    if (!id || body === null
        || !Number.isInteger(total) || total <= 0
        || !Number.isInteger(index) || index < 0 || index >= total) {
      drop('封筒の形が不正');
      return;
    }

    let slot = pending.get(id);
    if (!slot) {
      if (pending.size >= MAX_PENDING_MESSAGES) {
        // 一番古いものを捨てる。途中で切れた相手の残骸を溜め続けないため。
        pending.delete(pending.keys().next().value);
        drop('組み立てかけが多すぎる');
      }
      slot = { parts: new Array(total).fill(null), received: 0, total, bytes: 0 };
      pending.set(id, slot);
    }

    // 同じidで長さが食い違う＝別のメッセージか壊れている
    if (slot.total !== total) {
      pending.delete(id);
      drop('封筒の総数が食い違う');
      return;
    }
    // 同じ番号が二度来た。上書きせず捨てる（先に来たものを正とする）
    if (slot.parts[index] !== null) return;

    slot.bytes += byteLength(body);
    if (slot.bytes > MAX_REASSEMBLED_BYTES) {
      pending.delete(id);
      drop('組み直しの上限を超えた');
      return;
    }

    slot.parts[index] = body;
    slot.received += 1;
    if (slot.received < slot.total) return;

    pending.delete(id);
    let message;
    try {
      message = parseUntrustedJson(slot.parts.join(''));
    } catch {
      drop('組み直したJSONが壊れている');
      return;
    }
    onMessage(message);
  }

  function reset() {
    pending.clear();
  }

  return { receive, reset };
}

/**
 * 1本のDataChannelへ、分割と詰まり待ちをしながら送る役。
 *
 * 送信バッファ（bufferedAmount）が水位を超えたら、下がるまで待ってから続きを送る。
 * これが無いと、遅い相手へ状態を流し込んだときに送信側のメモリだけが膨らむ。
 * コマのドラッグ（MOVE_TOKENの連射）でも効く。
 *
 * @param {RTCDataChannel} channel
 * @param {() => number} budget 1メッセージに載せてよい本文のバイト数を返す関数
 *        （接続が確立するまでpc.sctpがnullなので、送る直前に取り直す）
 * @returns {{ send: (message: object) => boolean, close: () => void }}
 */
export function createChunkSender(channel, budget) {
  let sequence = 0;
  let closed = false;
  // 送信は順番を守る必要がある（分割したものが混ざると組み直せない）。
  // 詰まり待ちが入るので、直列に並べる。
  let queue = Promise.resolve();

  channel.bufferedAmountLowThreshold = BUFFER_LOW_WATER_BYTES;

  function waitForDrain() {
    if (channel.bufferedAmount < BUFFER_HIGH_WATER_BYTES) return null;
    return new Promise((resolve) => {
      const done = () => {
        channel.removeEventListener('bufferedamountlow', done);
        channel.removeEventListener('close', done);
        resolve();
      };
      channel.addEventListener('bufferedamountlow', done);
      // 待っている間に切れたら起こす（待ち続けると以後の送信が全部止まる）
      channel.addEventListener('close', done);
    });
  }

  function send(message) {
    if (closed || channel.readyState !== 'open') return false;

    let text;
    try {
      text = JSON.stringify(message);
    } catch (error) {
      console.warn('[net-chunk] メッセージを文字列にできませんでした:', error.message);
      return false;
    }

    sequence += 1;
    const id = `m${sequence}`;
    queue = queue.then(async () => {
      const parts = chunkMessage(text, budget(), id);
      for (const part of parts) {
        if (closed || channel.readyState !== 'open') return;
        const draining = waitForDrain();
        if (draining) await draining;
        if (closed || channel.readyState !== 'open') return;
        channel.send(part);
      }
    }).catch((error) => {
      // 1件の送信に失敗しても、以後の送信まで止めない（rejectしたままだと連鎖する）
      console.warn('[net-chunk] 送信に失敗しました:', error.message);
    });

    return true;
  }

  function close() {
    closed = true;
  }

  return { send, close };
}
