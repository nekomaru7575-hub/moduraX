// js/asset-sync.js
// P2P卓で、画像・音源の実体をピアの間で行き来させる。置き場そのものは js/asset-store.js。
//
// 【運ぶ向きは2つだけ】
//   参加者 → ホスト … 自分が上げたものを渡す（ASSET_PUT）。ホストは権威なので必ず持つ
//   ホスト → 参加者 … 持っていないものを取りに行く（ASSET_REQUEST / ASSET_DATA）
// 参加者どうしは直接繋がっていない（スター型）ので、実体もホストを経由する。
//
// 【順番が効いている】上げた実体は、それを指すACTIONより**先に**送る。DataChannelは
// 順序を保つので、ホストが状態を受け取った時点では実体が既に手元にある。逆になると、
// ホストが「知らない絵を指す状態」を他の参加者へ配ってしまい、誰も取りに行けなくなる。
//
// 【持っていない人が居るのは普通のこと】参加者は自分が見たものだけを持つ。足りないぶんは
// 状態を受け取った時点でまとめて取りに行く（ensureAssetsFor）。取りに行っている間、
// Service Worker（sw.js）は/asset/<hash>への応答を待たせているので、割れた画像は出ない。

import {
  assetRef, base64ToBlob, blobToBase64, getAsset, hasAsset, listMissingAssetHashes,
  putAsset, putVerifiedAsset
} from './asset-store.js';

// 権威へメッセージを送る口。ホスト役のときは自分が権威なのでnullのまま。
let sendToHost = null;
// ホスト役として動いているか。
let asHost = false;

// 取りに行っている最中のもの。同じ絵を10個のコマが使っていても要求は1回でよい。
// hash -> { resolve, timer }
const pending = new Map();

// 返事が来なければ諦める。ホストが持っていない（ASSET_MISSING）ときは即座に来るので、
// ここに引っかかるのは「大きいものを運んでいる最中」か「ホストが落ちた」とき。
const REQUEST_TIMEOUT_MS = 30000;

/**
 * この画面での役どころを決める。js/net-sync.jsがP2P卓の組み立て時に呼ぶ。
 * @param {object} options
 * @param {boolean} options.host ホスト役か
 * @param {((message: object) => boolean)|null} options.send ホストへ送る口（参加者のときだけ）
 */
export function initAssetSync({ host, send }) {
  asHost = !!host;
  sendToHost = host ? null : send;
  // 繋ぎ直しをまたいで待たせない。待っている相手はもう居ない。
  pending.forEach(({ resolve, timer }) => { clearTimeout(timer); resolve(false); });
  pending.clear();
}

/**
 * 実体をこの部屋のものとしてしまい、状態に書ける参照を返す。
 *
 * 参加者のときはホストへ渡すところまで待ってから返す（上の「順番が効いている」）。
 * 渡せなかった場合も参照は返す——自分の画面には出るし、後からホストが取りに来られる
 * 形にはなっている。ここで例外にすると、絵を選んだだけで操作が止まる。
 *
 * @param {Blob} blob
 * @returns {Promise<string>} `/asset/<hash>`
 */
export async function publishAsset(blob) {
  const hash = await putAsset(blob);
  if (!asHost && sendToHost) {
    const body = await blobToBase64(blob);
    const sent = sendToHost({ type: 'ASSET_PUT', hash, contentType: blob.type || '', body });
    if (!sent) console.warn('[asset-sync] 実体をホストへ渡せませんでした（他の人には出ません）');
  }
  return assetRef(hash);
}

/**
 * 状態が使っている実体のうち、持っていないものをまとめて取りに行く。
 * ホスト役のときは何もしない（自分が権威で、持っていないものは誰も持っていない）。
 *
 * 待たない：取りに行っている間もページは描き続けてよく、実体が要る場所は
 * Service Workerが到着を待つ（sw.js）。
 *
 * @param {object} state
 */
export function ensureAssetsFor(state) {
  if (asHost || !sendToHost || !state) return;
  listMissingAssetHashes(state)
    .then((missing) => missing.forEach((hash) => requestAsset(hash)))
    .catch((error) => console.warn('[asset-sync] 足りない実体を調べられませんでした:', error.message));
}

/**
 * 1件をホストへ取りに行く。同じものを二重に頼まない。
 * @param {string} hash
 * @returns {Promise<boolean>} 手元に入ったか
 */
function requestAsset(hash) {
  const waiting = pending.get(hash);
  if (waiting) return waiting.promise;

  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const timer = setTimeout(() => {
    pending.delete(hash);
    console.warn(`[asset-sync] 実体が届きませんでした (${hash.slice(0, 8)}…)`);
    resolve(false);
  }, REQUEST_TIMEOUT_MS);

  pending.set(hash, { resolve, timer, promise });
  if (!sendToHost({ type: 'ASSET_REQUEST', hash })) {
    clearTimeout(timer);
    pending.delete(hash);
    resolve(false);
    return promise;
  }
  return promise;
}

function settle(hash, ok) {
  const waiting = pending.get(hash);
  if (!waiting) return;
  clearTimeout(waiting.timer);
  pending.delete(hash);
  waiting.resolve(ok);
}

/**
 * 実体にまつわるメッセージを処理する。js/net-sync.jsのhandleMessageから呼ぶ。
 * @param {object} message
 * @returns {boolean} この関数が引き受けたか（falseなら普通のメッセージ）
 */
export function handleAssetMessage(message) {
  if (message?.type === 'ASSET_DATA') {
    const hash = String(message.hash || '');
    const blob = base64ToBlob(String(message.body || ''), String(message.contentType || ''));
    if (!blob) { settle(hash, false); return true; }
    // 名乗りと中身が合っているかはしまう側で見る（putVerifiedAsset）
    putVerifiedAsset(hash, blob)
      .then((ok) => settle(hash, ok))
      .catch(() => settle(hash, false));
    return true;
  }

  if (message?.type === 'ASSET_MISSING') {
    const hash = String(message.hash || '');
    console.warn(`[asset-sync] ホストがこの実体を持っていません (${hash.slice(0, 8)}…)`);
    settle(hash, false);
    return true;
  }

  return false;
}

/**
 * ホスト役として、参加者からの要求と受け取りを処理する。js/net-host.jsから呼ぶ。
 *
 * @param {object} message
 * @param {(reply: object) => void} reply その参加者へ返す口
 * @returns {boolean} この関数が引き受けたか
 */
export function handleAssetMessageAsHost(message, reply) {
  if (message?.type === 'ASSET_REQUEST') {
    const hash = String(message.hash || '');
    getAsset(hash).then(async (asset) => {
      if (!asset) {
        reply({ type: 'ASSET_MISSING', hash });
        return;
      }
      reply({
        type: 'ASSET_DATA', hash,
        contentType: asset.type,
        body: await blobToBase64(asset.blob)
      });
    }).catch((error) => {
      console.warn('[asset-sync] 実体を返せませんでした:', error.message);
      reply({ type: 'ASSET_MISSING', hash });
    });
    return true;
  }

  if (message?.type === 'ASSET_PUT') {
    const hash = String(message.hash || '');
    const blob = base64ToBlob(String(message.body || ''), String(message.contentType || ''));
    if (!blob) return true;
    // 既に持っていれば読み込み直さない（同じ絵を複数人が上げても1つ）
    hasAsset(hash)
      .then((held) => (held ? true : putVerifiedAsset(hash, blob)))
      .catch((error) => console.warn('[asset-sync] 実体を受け取れませんでした:', error.message));
    return true;
  }

  return false;
}
