// js/local-identity.js
// このブラウザ（デバイス）を指すための、自己申告不要の匿名ローカルID。
// ログイン等は存在しない前提のアプリなので、認証には使わず、あくまで
// 「バックヤードは自分がしまったコマだけ見せる」といったUIの絞り込みにのみ使う。
// 同じ人が別のブラウザ/デバイスで開くと別IDになる（意図的な割り切り）。

const STORAGE_KEY = 'mojulaX:localUserId';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let cachedId = null;

export function getLocalUserId() {
  if (cachedId) return cachedId;

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(STORAGE_KEY, id);
  }

  cachedId = id;
  return id;
}

// このブラウザの表示名（ニックネーム）。ラウンド進行の点呼一覧など、誰が操作したかを
// 人間に分かる形で示したい場面でのみ使う（getLocalUserId同様、認証には使わない）。
const NICKNAME_KEY = 'mojulaX:localNickname';

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(name) {
  localStorage.setItem(NICKNAME_KEY, name);
}

// --- 部屋ごとの「表示名」による参加者識別 ---
// 上のローカルIDが「このブラウザ」を指すのに対し、こちらは「この人」を指す。表示名から
// 決定的に導出するので、別の端末・ブラウザからでも同じ名前を入れれば同じ参加者になる。
//
// 導出するのは2つ：
//   authToken     … 状態には載せない値。WSの名乗りとアップロードのヘッダにだけ送る
//   participantId … 状態に載る公開ID。秘匿データの宛先指定（audience）に使う
//
// participantIdはauthTokenをハッシュして作る。この順序のおかげで、種を知らないサーバーでも
// 「authTokenをハッシュしたらこのparticipantIdになるか」を計算するだけで、名乗りの辻褄が
// 合っているかを確かめられる（server/index.jsのverifyIdentity）。
//
// 【承知の上での割り切り】以前の種は秘密の「合言葉」で、公開IDから逆算できないため他人には
// なりすませなかった。今の種は全員に見える表示名なので、名前を知っている人は誰でもその人
// （GMを含む）として名乗れるし、その人宛の秘匿データも読める。入力欄を1つにする代わりに
// なりすまし耐性を捨てた設計であることを忘れないこと。秘匿は「うっかり見えない」ための
// 仕切りであって、守りではない。
const ROOM_NAME_KEY_PREFIX = 'mojulaX:roomName:';

// 開発用の合言葉（server/index.jsのDEVELOPER_PASSPHRASE）を入れた場合だけは、名乗りの種を
// そちらに差し替える。表示名をそのまま種にすると、合言葉が参加者一覧に晒されてしまうため。
const DEV_PASSPHRASE_KEY_PREFIX = 'mojulaX:roomDevPassphrase:';

function roomNameKey(roomId) {
  return `${ROOM_NAME_KEY_PREFIX}${roomId}`;
}

function devPassphraseKey(roomId) {
  return `${DEV_PASSPHRASE_KEY_PREFIX}${roomId}`;
}

// 名前は種でもあるので、全角・半角などの表記ゆれで別人になってしまう。保存と導出の両方で
// 同じ正規化を通す（表示名としても正規化後のものを使い、見た目と中身をずらさない）。
export function normalizeRoomName(name) {
  return (name || '').normalize('NFKC').trim();
}

// 未設定（一度も聞いていない）ならnull、「名前なしで参加」を選んだ場合は空文字を返す。
export function getStoredRoomName(roomId) {
  return localStorage.getItem(roomNameKey(roomId));
}

export function setStoredRoomName(roomId, name) {
  localStorage.setItem(roomNameKey(roomId), name);
  // 次に別の部屋へ入るときの既定値。点呼一覧（js/round-panel.js）もこちらを見る。
  if (name) setNickname(name);
}

export function getStoredDevPassphrase(roomId) {
  return localStorage.getItem(devPassphraseKey(roomId)) || '';
}

export function setStoredDevPassphrase(roomId, passphrase) {
  if (passphrase) localStorage.setItem(devPassphraseKey(roomId), passphrase);
  else localStorage.removeItem(devPassphraseKey(roomId));
}

// 導出にはWeb Crypto（SHA-256）を使う。httpsまたはlocalhostでのみ利用できるため、
// それ以外の環境では参加者としての識別自体を諦める（弱いハッシュで代用すると、
// サーバー側の検証と食い違って名乗りが黙って通らなくなるため）。
export function isRoomIdentityAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 公開IDをauthTokenから導出する規則。サーバーも同じ計算で名乗りを検算するため、
// 変えるときは必ずserver/index.jsのderiveParticipantIdも揃えること。
// 公開IDは状態の中に何度も現れるので、短くしても衝突が問題にならない長さに切り詰める。
export const PARTICIPANT_ID_LENGTH = 32;

export async function deriveParticipantId(authToken) {
  return (await sha256Hex(`mojulaX:pid:${authToken}`)).slice(0, PARTICIPANT_ID_LENGTH);
}

/**
 * 種（通常は表示名、開発用の合言葉を入れているときはそちら）から、その部屋での
 * 参加者IDと名乗り用トークンを導出する。
 * @param {string} roomId 部屋ID（部屋が違えば同じ種でも別IDになる）
 * @param {string} seed 種。空ならnull（＝ゲスト参加）を返す
 * @returns {Promise<{participantId: string, authToken: string}|null>}
 */
export async function deriveRoomIdentity(roomId, seed) {
  const trimmed = (seed || '').trim();
  if (!trimmed || !isRoomIdentityAvailable()) return null;

  const authToken = await sha256Hex(`mojulaX:auth:${roomId}:${trimmed}`);
  const participantId = await deriveParticipantId(authToken);

  return { participantId, authToken };
}

// 今この画面で名乗っている参加者。秘匿データの表示判定など、あちこちから参照するため
// ここに1つだけ持つ（名前未設定＝ゲストの場合はnullのまま）。
let currentIdentity = null;

/**
 * 種から識別情報を導出して、この画面の「自分」として設定する。
 * @returns {Promise<{participantId: string, authToken: string}|null>} ゲスト参加ならnull
 */
export async function activateRoomIdentity(roomId, seed) {
  currentIdentity = await deriveRoomIdentity(roomId, seed);
  return currentIdentity;
}

export function getCurrentParticipantId() {
  return currentIdentity?.participantId ?? null;
}

// サーバーが「この公開IDを名乗ってよいか」を検証するための値。WSの接続時（IDENTIFY）と
// 音源アップロードのヘッダにだけ送る。状態や画面には絶対に出さないこと。
export function getCurrentAuthToken() {
  return currentIdentity?.authToken ?? null;
}
