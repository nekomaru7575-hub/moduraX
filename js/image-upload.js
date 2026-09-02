// js/image-upload.js
// 画像をサーバー経由でR2へ上げ、公開URLを受け取る。
//
// 【P2P卓では上げない】P2P卓（?net=rtc）では実体をこのブラウザへしまい、状態には
// `/asset/<hash>` を載せる（js/asset-store.js / js/asset-sync.js）。R2を通らないので
// 課金も容量も増えず、鍵をブラウザへ置く必要も無い。返す形（{url, key}）は同じなので、
// 呼ぶ側（コマ・パネル・背景・カード）はどちらの卓かを知らなくてよい。
// keyがnullなのはデータURLへ退避したときと同じ意味で、既存の扱いのまま通る。
//
// 状態にはURLだけを載せる。データURLのまま持つと、シーンの数だけ画像が部屋データに
// 積み上がり、アクションのたびに状態まるごとRedisへ書き直されてしまう（音源が
// URLだけを持つ設計になっているのと同じ理由。server/r2.js参照）。
// URLにしておけば、ブラウザはそのシーンを表示するときに初めて画像を取りに行く。
//
// ブラウザからR2を直接叩かないのでR2側のCORS設定は不要。認証はWebSocketでの名乗りと
// 同じ2つの値をヘッダで送る（名乗り用のトークンなので、ログに残りうるクエリ文字列
// には載せない）。アップロードはGM限定で、判定はサーバー側が行う。

import { getCurrentParticipantId, getCurrentAuthToken } from './local-identity.js';
import { entryPasswordHeaders } from './room-entry.js';
import { pickFile, readFileAsDataUrl } from './file-uploader.js';
import { isP2pMode } from './net-transport.js';
import { publishAsset } from './asset-sync.js';
import { MAX_ASSET_BYTES, dataUrlToBlob } from './asset-store.js';

// 現在の部屋ID。アップロード先の指定に使う（サーバー側で実在する部屋か検証される）。
function currentRoomId() {
  return new URLSearchParams(location.search).get('room') || '';
}

// サーバーにR2の設定があるか（＝アップロードが使えるか）と、サーバーが許すサイズ。
// 開くたびに問い合わせても仕方ないので一度取ったら保持する。
let uploadCapability = null;

// 混み合っているときの再挑戦を待つ上限。サーバーはRetry-Afterで目安を返してくるが、
// 言われるまま待つと画像を選んだ人の画面が長く止まる。
const RETRY_WAIT_CAP_MS = 10 * 1000;

/**
 * アップロード系のfetch。サーバーが「今は混んでいる」（503）と言ってきたときだけ、
 * 一度だけ間を置いて挑み直す。
 *
 * 挑み直す価値があるのは、断りが利用者の側の問題ではなく時間で解けるためで、ここで
 * 諦めると呼び出し側がデータURLへ退避してしまう＝8MBの画像がそのまま部屋データに載り、
 * アクションのたびにRedisへ送られる（このファイル冒頭の設計の裏返し）。
 * サーバーのメモリを守るための断りが、かえって重い状態を作るのを避ける。
 */
async function fetchUpload(url, options) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, options);
    if (response.status !== 503 || attempt === 1) return response;

    // 本文を読んでから待つ（retryableが無い503は、この仕組みとは別の理由なので挑み直さない）
    const body = await response.clone().json().catch(() => ({}));
    if (!body.retryable) return response;

    const suggested = Number(response.headers.get('Retry-After')) * 1000;
    const wait = Math.min(Number.isFinite(suggested) && suggested > 0 ? suggested : RETRY_WAIT_CAP_MS,
      RETRY_WAIT_CAP_MS);
    console.warn(`[image-upload] サーバーが混み合っています。${Math.round(wait / 1000)}秒後にもう一度試します`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  // ここには来ない（ループ内で必ず返す）が、抜けた場合に備えて呼び出し側で扱える形にする
  return fetch(url, options);
}

/**
 * アップロードが使える環境か。使えなければ呼び出し側はデータURLへ退避する。
 * 問い合わせに失敗した場合は「使えない」扱いにする（データURLなら確実に動くため）。
 * @returns {Promise<boolean>}
 */
export async function isImageUploadAvailable() {
  // P2P卓ではサーバーの設定に関係なく使える（置き場がこのブラウザなので）
  if (isP2pMode()) return true;

  if (!uploadCapability) {
    try {
      uploadCapability = await fetch('/api/image').then(r => r.json());
    } catch {
      return false;
    }
  }
  return !!uploadCapability.uploadEnabled;
}

/** 1枚あたりの上限バイト数（取得できていなければnull）。 */
export function imageUploadMaxBytes() {
  if (isP2pMode()) return MAX_ASSET_BYTES;
  return uploadCapability?.maxBytes || null;
}

/**
 * JSONから取り込んだ画像を、この部屋の持ち物にする。
 *
 * 取り込んだデータには他所で作られた画像が混ざっている。
 *   ・データURL … この機能より前のエクスポート、コマ作成ツールの出力
 *   ・別の部屋のR2 URL … コマを部屋をまたいで持ち込んだ場合
 * 前者は状態に居座って重く、後者は元の部屋を削除したときフォルダごと消えて404になる
 * （部屋の削除は参照元を調べずに消すため）。取り込みの時点でこの部屋へ移しておく。
 *
 * 自分のR2でない外部URLには触らない（他所の持ち物を勝手に複製しない）。
 * 変換できない場合は元の値をそのまま返す（画像が使えなくなるよりはマシなため）。
 *
 * @param {string|null|undefined} image
 * @param {'background'|'token'|'panel'|'card'} purpose
 * @returns {Promise<string|null|undefined>}
 */
export async function adoptImageIntoRoom(image, purpose) {
  const roomId = currentRoomId();
  if (!image || typeof image !== 'string' || !roomId) return image;

  // P2P卓。データURLだけをこのブラウザの持ち物へ移す。他の部屋のR2 URLは触らない——
  // 従来卓の画像を指したままにしておけば、少なくともその部屋が在る間は見える
  // （こちらへ複製しようにも、R2の公開ドメインはCORSを返さないので実体を読めない）。
  if (isP2pMode()) {
    const blob = dataUrlToBlob(image);
    if (!blob) return image;
    try {
      return await publishAsset(blob);
    } catch (error) {
      console.warn('[image-upload] 取り込んだ画像を引き取れませんでした:', error.message);
      return image;
    }
  }

  if (!await isImageUploadAvailable()) return image;

  const base = uploadCapability?.publicBaseUrl;

  // データURLはCSPのせいでfetch()では読めない（connect-srcに data: が無い。
  // img-srcには入っているので「表示はできるのに読み取れない」）。以前はfetchしていて、
  // 失敗は下のcatchに吸われ、**取り込んだ画像がデータURLのまま部屋に残り続けていた**。
  // 症状は「重いだけで動いている」なので気づけない。自前で解く（js/asset-store.js）。
  const dataBlob = dataUrlToBlob(image);
  if (dataBlob) {
    try {
      const file = new File([dataBlob], 'imported', { type: dataBlob.type || 'image/png' });
      const { url } = await uploadImageFile(file, purpose);
      return url;
    } catch (error) {
      console.warn('[image-upload] 取り込んだ画像を保存できませんでした:', error.message);
      return image;
    }
  }

  // 自分のR2の画像か。違えば外部URLなので触らない
  if (!base || !image.startsWith(`${base}/`)) return image;
  // 既にこの部屋のフォルダにあるならそのまま
  if (image.startsWith(`${base}/rooms/${roomId}/`)) return image;

  try {
    const query = `room=${encodeURIComponent(roomId)}&purpose=${encodeURIComponent(purpose)}`;
    const headers = { 'Content-Type': 'application/json', ...entryPasswordHeaders(roomId) };
    const participantId = getCurrentParticipantId();
    const authToken = getCurrentAuthToken();
    if (participantId && authToken) {
      headers['X-Participant-Id'] = participantId;
      headers['X-Auth-Token'] = authToken;
    }

    const response = await fetchUpload(`/api/image/copy?${query}`, {
      method: 'POST', headers, body: JSON.stringify({ sourceUrl: image })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `複製に失敗しました (${response.status})`);
    return body.url;
  } catch (error) {
    console.warn('[image-upload] 他の部屋の画像を複製できませんでした:', error.message);
    return image;
  }
}

/**
 * 画像をアップロードして公開URLとキーを受け取る。
 * @param {File} file
 * @param {'background'|'token'|'panel'|'card'} purpose 用途。サーバーが要求する権限が変わる
 *   （背景はGM限定、コマ・パネルは誰でも。server/index.jsのIMAGE_PURPOSES）
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadImageFile(file, purpose) {
  // P2P卓。R2を通さず、このブラウザへしまってホストへ渡す。
  if (isP2pMode()) {
    return { url: await publishAsset(file), key: null };
  }

  const headers = { 'Content-Type': file.type || 'image/png', ...entryPasswordHeaders() };
  const participantId = getCurrentParticipantId();
  const authToken = getCurrentAuthToken();
  if (participantId && authToken) {
    headers['X-Participant-Id'] = participantId;
    headers['X-Auth-Token'] = authToken;
  }

  const query = `room=${encodeURIComponent(currentRoomId())}&purpose=${encodeURIComponent(purpose)}`;
  const response = await fetchUpload(`/api/image?${query}`, { method: 'POST', headers, body: file });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `アップロードに失敗しました (${response.status})`);
  }
  return body; // { key, url }
}

/**
 * 画像を選ばせて、R2へ上げたうえで表示に使える文字列を返す。
 * 画像を扱う画面（コマ・パネル・盤面の背景）が同じ手順を書き写さずに済むようまとめてある。
 *
 * R2が使えない環境（server/dev-local.js）や、権限が無くて断られた場合は、従来どおり
 * データURLへ退避する。表示側はどちらも文字列をそのままsrc/url()に入れるだけなので
 * 区別せずに扱える（移行前に保存されたデータURLの画像がそのまま出せるのもこのため）。
 *
 * @param {{ purpose: 'background'|'token'|'panel'|'card' }} options
 * @returns {Promise<{ url: string, key: string|null } | null>} キャンセルならnull
 */
export async function pickAndUploadImage({ purpose }) {
  const file = await pickFile({ accept: 'image/*' });
  if (!file) return null;

  // 部屋の外（character-builder.html）では置き場所が決まらないのでデータURLにする。
  // あちらはJSONを書き出す道具で、取り込んだ先の部屋が保存先を持つため。
  if (currentRoomId() && await isImageUploadAvailable()) {
    try {
      const { url, key } = await uploadImageFile(file, purpose);
      return { url, key };
    } catch (error) {
      // 上げられなかった理由は伝えつつ、画像自体は使えるようにデータURLで続行する
      console.warn('[image-upload] アップロードに失敗したのでデータURLで続行します:', error.message);
    }
  }

  return { url: await readFileAsDataUrl(file), key: null };
}
