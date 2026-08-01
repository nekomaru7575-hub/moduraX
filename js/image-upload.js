// js/image-upload.js
// 背景画像をサーバー経由でR2へ上げ、公開URLを受け取る。
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

// 現在の部屋ID。アップロード先の指定に使う（サーバー側で実在する部屋か検証される）。
function currentRoomId() {
  return new URLSearchParams(location.search).get('room') || '';
}

// サーバーにR2の設定があるか（＝アップロードが使えるか）と、サーバーが許すサイズ。
// 開くたびに問い合わせても仕方ないので一度取ったら保持する。
let uploadCapability = null;

/**
 * アップロードが使える環境か。使えなければ呼び出し側はデータURLへ退避する。
 * 問い合わせに失敗した場合は「使えない」扱いにする（データURLなら確実に動くため）。
 * @returns {Promise<boolean>}
 */
export async function isImageUploadAvailable() {
  if (!uploadCapability) {
    try {
      uploadCapability = await fetch('/api/image').then(r => r.json());
    } catch {
      return false;
    }
  }
  return !!uploadCapability.uploadEnabled;
}

/** サーバーが許す1枚あたりの上限バイト数（取得できていなければnull）。 */
export function imageUploadMaxBytes() {
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
 * @param {'background'|'token'|'panel'} purpose
 * @returns {Promise<string|null|undefined>}
 */
export async function adoptImageIntoRoom(image, purpose) {
  const roomId = currentRoomId();
  if (!image || typeof image !== 'string' || !roomId) return image;
  if (!await isImageUploadAvailable()) return image;

  const base = uploadCapability?.publicBaseUrl;

  if (image.startsWith('data:')) {
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], 'imported', { type: blob.type || 'image/png' });
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

    const response = await fetch(`/api/image/copy?${query}`, {
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
 * @param {'background'|'token'|'panel'} purpose 用途。サーバーが要求する権限が変わる
 *   （背景はGM限定、コマ・パネルは誰でも。server/index.jsのIMAGE_PURPOSES）
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadImageFile(file, purpose) {
  const headers = { 'Content-Type': file.type || 'image/png', ...entryPasswordHeaders() };
  const participantId = getCurrentParticipantId();
  const authToken = getCurrentAuthToken();
  if (participantId && authToken) {
    headers['X-Participant-Id'] = participantId;
    headers['X-Auth-Token'] = authToken;
  }

  const query = `room=${encodeURIComponent(currentRoomId())}&purpose=${encodeURIComponent(purpose)}`;
  const response = await fetch(`/api/image?${query}`, { method: 'POST', headers, body: file });

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
 * @param {{ purpose: 'background'|'token'|'panel' }} options
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
