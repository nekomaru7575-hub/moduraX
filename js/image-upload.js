// js/image-upload.js
// 背景画像をサーバー経由でR2へ上げ、公開URLを受け取る。
//
// 状態にはURLだけを載せる。データURLのまま持つと、シーンの数だけ画像が部屋データに
// 積み上がり、アクションのたびに状態まるごとRedisへ書き直されてしまう（音源が
// URLだけを持つ設計になっているのと同じ理由。server/r2.js参照）。
// URLにしておけば、ブラウザはそのシーンを表示するときに初めて画像を取りに行く。
//
// ブラウザからR2を直接叩かないのでR2側のCORS設定は不要。認証はWebSocketでの名乗りと
// 同じ2つの値をヘッダで送る（合言葉由来のトークンなので、ログに残りうるクエリ文字列
// には載せない）。アップロードはGM限定で、判定はサーバー側が行う。

import { getCurrentParticipantId, getCurrentAuthToken } from './local-identity.js';

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
 * 画像をアップロードして公開URLとキーを受け取る。
 * @param {File} file
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadImageFile(file) {
  const headers = { 'Content-Type': file.type || 'image/png' };
  const participantId = getCurrentParticipantId();
  const authToken = getCurrentAuthToken();
  if (participantId && authToken) {
    headers['X-Participant-Id'] = participantId;
    headers['X-Auth-Token'] = authToken;
  }

  const response = await fetch(`/api/image?room=${encodeURIComponent(currentRoomId())}`, {
    method: 'POST',
    headers,
    body: file
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `アップロードに失敗しました (${response.status})`);
  }
  return body; // { key, url }
}
