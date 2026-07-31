// server/r2.js
// 音源・画像などファイルの実体を置くCloudflare R2への読み書きだけを担う薄いモジュール。
//
// 実体を部屋の状態（Redis）に入れると、アクションのたびに状態まるごと書き直される都合で
// 毎回Upstashへ送られてしまう。そのため実体はR2に置き、状態にはURLだけを残す。
// R2はegressが常に無料なので、「1回書いて何度も読む」この用途との相性が良い。
//
// 署名はS3互換APIのSigV4。自前実装は誤りやすいので、Node標準のfetchにそのまま乗る
// aws4fetch（依存ゼロ・数KB）を使う。@aws-sdk/client-s3は用途に対して重すぎるため使わない。
//
// アップロードはブラウザ→サーバー→R2の順に通す（ブラウザからR2を直接叩かない）。
// これによりR2側のCORS設定が不要になる。再生はブラウザ→公開URLの直接取得。

import { AwsClient } from 'aws4fetch';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

// 環境変数が未設定でもサーバー自体は起動する（アップロードだけが使えない状態になる）。
// 認証情報を持たないローカル環境でも、外部URL指定の音源や、データURLの背景画像で
// 動作確認できるようにするため。
export function isR2Configured() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_BASE_URL);
}

let client = null;

function getClient() {
  if (!client) {
    client = new AwsClient({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto' // R2はリージョンを持たないため固定
    });
  }
  return client;
}

function objectUrl(key) {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
}

// 再生時にブラウザが直接叩く公開URL。末尾のスラッシュ有無を吸収しておく。
export function publicUrlFor(key) {
  return `${String(PUBLIC_BASE_URL).replace(/\/+$/, '')}/${key}`;
}

export async function putObject(key, body, contentType) {
  const response = await getClient().fetch(objectUrl(key), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType }
  });

  if (!response.ok) {
    throw new Error(`R2へのアップロードに失敗しました (${response.status})`);
  }
}

export async function deleteObject(key) {
  const response = await getClient().fetch(objectUrl(key), { method: 'DELETE' });

  // 既に無い場合(404)は成功扱いでよい（消えていること自体が目的のため）
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2からの削除に失敗しました (${response.status})`);
  }
}
