// server/r2.js
// 音源・画像などファイルの実体を置くCloudflare R2への読み書きだけを担う薄いモジュール。
//
// 実体を部屋の状態（Redis）に入れると、アクションのたびに状態まるごと書き直される都合で
// 毎回Upstashへ送られてしまう。そのため実体はR2に置き、状態にはURLだけを残す。
// R2はegressが常に無料なので、「1回書いて何度も読む」この用途との相性が良い。
//
// キーは rooms/room-N/<UUID>.<拡張子> の形で、部屋ごとにフォルダ状にまとまっている。
// 部屋を削除するときは接頭辞 rooms/room-N/ でまとめて消す（deleteObjectsByPrefix）。
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

// 公開URLの土台（末尾のスラッシュは落とす）。「このURLは自分のR2のものか」を
// 判定する側でも使うため、組み立てと判定で同じ値を見るようにここに1つだけ置く。
export function publicBaseUrl() {
  return String(PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

// 再生時にブラウザが直接叩く公開URL。末尾のスラッシュ有無を吸収しておく。
export function publicUrlFor(key) {
  return `${publicBaseUrl()}/${key}`;
}

// 公開URLから、このバケット内のキーを取り出す。自分のR2のURLでなければnull。
// 取り込んだデータの画像URLを「自分の部屋へ入れ直すべきか」判断するのに使う。
export function keyFromPublicUrl(url) {
  const base = publicBaseUrl();
  if (!base || typeof url !== 'string' || !url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1).split(/[?#]/)[0];
  return key || null;
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

// 既にバケットにあるオブジェクトの中身を読む（取り込んだデータの画像を、その部屋の
// フォルダへ複製するときに使う）。公開URLではなく署名付きで直接取りに行くので、
// 公開ドメイン側の設定やキャッシュに左右されない。
export async function getObject(key) {
  const response = await getClient().fetch(objectUrl(key), { method: 'GET' });

  if (!response.ok) {
    throw new Error(`R2からの取得に失敗しました (${response.status})`);
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'application/octet-stream'
  };
}

export async function deleteObject(key) {
  const response = await getClient().fetch(objectUrl(key), { method: 'DELETE' });

  // 既に無い場合(404)は成功扱いでよい（消えていること自体が目的のため）
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2からの削除に失敗しました (${response.status})`);
  }
}

// ListObjectsV2の応答（XML）から、必要な分だけを取り出す。
// XMLパーサを足すほどの内容ではない（欲しいのは<Key>と<Size>、続きがあるかの3つだけ）ので、
// 必要な範囲を正規表現で拾う。キーの実体は rooms/room-N/<UUID>.<拡張子> で英数字と
// ハイフン・ドット・スラッシュしか含まないが、XMLとして正しく読むため実体参照は戻す。
function unescapeXml(text) {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // &amp;は最後（先に戻すと二重復元になる）
}

// <Contents>ごとに読むのは、キーとサイズの対応を取り違えないため
// （<Key>だけ・<Size>だけを別々に集めると、片方が欠けた要素があったときにずれる）。
function parseListResponse(xml) {
  const objects = Array.from(xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)).map((match) => {
    const body = match[1];
    const key = body.match(/<Key>([\s\S]*?)<\/Key>/);
    const size = body.match(/<Size>\s*(\d+)\s*<\/Size>/);
    return { key: key ? unescapeXml(key[1]) : null, size: size ? Number(size[1]) : 0 };
  }).filter(object => object.key !== null);

  const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
  const tokenMatch = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/);
  return { objects, nextToken: truncated && tokenMatch ? unescapeXml(tokenMatch[1]) : null };
}

// テスト用にparseListResponseだけ切り出して公開する（R2に繋がずXMLの読み取りを確かめられる）。
export const __test__ = { parseListResponse, unescapeXml };

/**
 * 指定した接頭辞のオブジェクトを全件返す。1回のListObjectsV2は最大1000件なので、
 * 続きがある間はcontinuation-tokenで辿る。
 * @returns {Promise<{key: string, size: number}[]>}
 */
export async function listObjects(prefix) {
  const objects = [];
  let token = null;

  do {
    const url = new URL(`https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}`);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    if (token) url.searchParams.set('continuation-token', token);

    const response = await getClient().fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`R2の一覧取得に失敗しました (${response.status})`);
    }

    const parsed = parseListResponse(await response.text());
    objects.push(...parsed.objects);
    token = parsed.nextToken;
  } while (token);

  return objects;
}

/**
 * 指定した接頭辞のオブジェクトが使っている合計バイト数。
 * 部屋ごとの使い過ぎを見張るのに使う（server/index.jsのroomStorageBytes）。
 */
export async function totalBytesByPrefix(prefix) {
  const objects = await listObjects(prefix);
  return objects.reduce((sum, object) => sum + object.size, 0);
}

/**
 * 指定した接頭辞のオブジェクトをまとめて消す（部屋を削除するときの後片付け）。
 *
 * 状態に残っているキーだけを消す方式だと、差し替えられた古い背景のように「もう状態から
 * 辿れないが実体は残っている」ものを回収できない。接頭辞で消せばその部屋のフォルダごと
 * 片付く。prefixには必ず末尾のスラッシュを含めること（rooms/room-1/ と書けば
 * rooms/room-10/ には一致しない）。
 *
 * @returns {Promise<{deleted: number, failed: number}>}
 */
export async function deleteObjectsByPrefix(prefix) {
  const objects = await listObjects(prefix);

  let failed = 0;
  await Promise.all(objects.map(({ key }) => deleteObject(key).catch((error) => {
    failed += 1;
    console.warn(`[r2] ${key} の削除に失敗しました:`, error.message);
  })));

  return { deleted: objects.length - failed, failed };
}
