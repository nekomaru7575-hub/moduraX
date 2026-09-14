// js/store/targets.js
// ターゲット（Core機能）：参加者が「いま狙っているコマ」を1体だけ指定する仕組みの、状態の形と読み取り。
//
// 状態はコマの targetedBy（そのコマをターゲットにしている参加者IDの配列）に持つ。
// 別スライスにしないのは、コマを消せばターゲットも一緒に消え、保存・取り込み・hydrateに
// 手を入れずに済むため。複製・JSON保存（js/character-snapshot.js）は項目を名指しで
// 写すので、ターゲットは乗らない。
//
// 1人1体。SET_TARGETは「トグル」ではなく「最終的にどのコマか（null＝無し）」を運ぶ：
// 同期の順番が前後しても、全員の画面で同じ結果に落ち着くようにするため。

// 参加者IDは表示名から導出した短い文字列（js/local-identity.js）。取り込んだ部屋データ
// （信用しないJSON）に紛れた長い文字列を描画や比較へ回さないよう、長さで切る。
const MAX_PARTICIPANT_ID_LENGTH = 128;

function isParticipantId(value) {
  return typeof value === 'string' && value !== '' && value.length <= MAX_PARTICIPANT_ID_LENGTH;
}

/**
 * コマのtargetedByを読める形へ均す。配列でなければ空、参加者IDに見える文字列だけを重複なく残す。
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeTargetedBy(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isParticipantId))];
}

/**
 * SET_TARGETの中身。participantIdを全コマのtargetedByから外し、tokenIdが盤面にいるコマなら
 * そこへ足す。作業用のコママップ（dispatchのnextTokensState）を直接書き換える。
 * @param {Record<string, any>} tokensState
 * @param {string} participantId
 * @param {string|null} tokenId
 * @returns {boolean} 何か変わったか（変わらなければcommitしない）
 */
export function withTarget(tokensState, participantId, tokenId) {
  if (!isParticipantId(participantId)) return false;

  const destination = tokenId ? tokensState[tokenId] : null;
  const destinationId = destination && !destination.inBackyard ? tokenId : null;

  let changed = false;
  Object.entries(tokensState).forEach(([id, token]) => {
    const current = normalizeTargetedBy(token?.targetedBy);
    const has = current.includes(participantId);
    const wants = id === destinationId;
    if (has === wants) return;

    const next = wants ? [...current, participantId] : current.filter(pid => pid !== participantId);
    tokensState[id] = Object.freeze({ ...token, targetedBy: Object.freeze(next) });
    changed = true;
  });
  return changed;
}

/**
 * その参加者のいまのターゲット（盤面にいるコマ）。いなければnull。
 * @param {Record<string, any>} tokens
 * @param {string|null} participantId
 */
export function findTargetOf(tokens, participantId) {
  if (!isParticipantId(participantId)) return null;
  return Object.values(tokens || {}).find(token => (
    !token.inBackyard && normalizeTargetedBy(token.targetedBy).includes(participantId)
  )) ?? null;
}

/**
 * そのコマをターゲットにしている参加者の表示名。参加者一覧から引けないID
 * （改名で公開IDが変わった、取り込んだ部屋にしかいない人）は黙って落とす。
 * @param {any} token
 * @param {Record<string, {nickname?: string}>} participants
 * @returns {string[]}
 */
export function listTargeterNames(token, participants) {
  return normalizeTargetedBy(token?.targetedBy)
    .map(pid => (Object.hasOwn(participants || {}, pid) ? participants[pid]?.nickname : null))
    .filter(name => typeof name === 'string' && name !== '');
}
