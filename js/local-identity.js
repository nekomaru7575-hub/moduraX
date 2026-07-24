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
