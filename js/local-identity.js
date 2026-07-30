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

// --- 部屋ごとの「合言葉」による参加者識別 ---
// 上のローカルIDが「このブラウザ」を指すのに対し、こちらは「この人」を指す。合言葉から
// 決定的に導出するので、別の端末・ブラウザからでも同じ合言葉なら同じ参加者になる。
//
// 導出するのは2つ：
//   participantId … 状態に載る公開ID。秘匿データの宛先指定（audience）に使う
//   authToken     … 状態には決して載せない本人確認用の値。将来サーバー側で
//                   「この公開IDを名乗ってよいか」を検証するために使う（現状は未使用）
// 用途ごとに別の文字列を混ぜてハッシュするので、公開IDからauthTokenは逆算できない。
// 合言葉そのものはこのブラウザのlocalStorageから出ない。
const PASSPHRASE_KEY_PREFIX = 'mojulaX:roomPassphrase:';

function passphraseKey(roomId) {
  return `${PASSPHRASE_KEY_PREFIX}${roomId}`;
}

// 未設定（一度も聞いていない）ならnull、「合言葉なしで参加」を選んだ場合は空文字を返す。
export function getStoredPassphrase(roomId) {
  return localStorage.getItem(passphraseKey(roomId));
}

export function setStoredPassphrase(roomId, passphrase) {
  localStorage.setItem(passphraseKey(roomId), passphrase);
}

// 導出にはWeb Crypto（SHA-256）を使う。httpsまたはlocalhostでのみ利用できるため、
// それ以外の環境では合言葉での識別自体を諦める（弱いハッシュで代用すると、将来
// サーバー側の検証を入れたときに本人確認の強度が黙って下がるため）。
export function isPassphraseIdentityAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 合言葉から、その部屋での参加者IDと本人確認用トークンを導出する。
 * @param {string} roomId 部屋ID（部屋が違えば同じ合言葉でも別IDになる）
 * @param {string} passphrase 合言葉。空ならnull（＝ゲスト参加）を返す
 * @returns {Promise<{participantId: string, authToken: string}|null>}
 */
export async function deriveRoomIdentity(roomId, passphrase) {
  const trimmed = (passphrase || '').trim();
  if (!trimmed || !isPassphraseIdentityAvailable()) return null;

  const [participantId, authToken] = await Promise.all([
    sha256Hex(`mojulaX:id:${roomId}:${trimmed}`),
    sha256Hex(`mojulaX:auth:${roomId}:${trimmed}`)
  ]);

  // 公開IDは状態の中に何度も現れるので、短くしても衝突が問題にならない長さに切り詰める
  return { participantId: participantId.slice(0, 32), authToken };
}

// 今この画面で名乗っている参加者。秘匿データの表示判定など、あちこちから参照するため
// ここに1つだけ持つ（合言葉未設定＝ゲストの場合はnullのまま）。
let currentIdentity = null;

/**
 * 合言葉から識別情報を導出して、この画面の「自分」として設定する。
 * @returns {Promise<{participantId: string, authToken: string}|null>} ゲスト参加ならnull
 */
export async function activateRoomIdentity(roomId, passphrase) {
  currentIdentity = await deriveRoomIdentity(roomId, passphrase);
  return currentIdentity;
}

export function getCurrentParticipantId() {
  return currentIdentity?.participantId ?? null;
}

// 将来サーバー側で「この公開IDを名乗ってよいか」を検証する際に、WSの接続時にだけ送る値。
// 状態や画面には絶対に出さないこと。
export function getCurrentAuthToken() {
  return currentIdentity?.authToken ?? null;
}
