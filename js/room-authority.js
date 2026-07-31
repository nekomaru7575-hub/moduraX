// js/room-authority.js
// 「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、
// セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。
//
// 判定の材料は2つとも既にある：
//   state.participants[id].isGm … 誰がGMか（js/game-store.jsのSET_PARTICIPANT_GM）
//   getCurrentParticipantId()   … 今この画面で名乗っている自分（js/local-identity.js）
// js/visibility.jsは状態を直接見ない純粋関数の置き場なので、storeを見るこちらは別モジュールにする。
//
// ここで行うのは画面側の見せ方（押せる／押せない）だけで、実際の可否はサーバーも同じ規則で
// 判定して弾く（server/index.jsのcanOperateAsGm・GM_ONLY_ACTIONS）。両者の規則がずれると
// 「画面では押せるのにサーバーに断られる」ことになるため、変えるときは必ず両方を揃えること。

import { store } from './game-store.js';
import { getCurrentParticipantId } from './local-identity.js';
import { isGm } from './visibility.js';

// 無効化した項目のtitleに入れる共通の理由。文言を1か所に置いて表記を揃える。
export const GM_ONLY_REASON = 'GMだけが操作できます';

// GMが1人でもいるか。全員がゲスト（合言葉なし）の部屋ではGMが存在しないため、
// この判定が無いと「誰も部屋を消せない・ラウンドを始められない」状態になる。
function hasAnyGm(participants) {
  return Object.values(participants || {}).some(p => p.isGm);
}

/**
 * 部屋レベルの操作をしてよいか。
 * GMがまだ1人も決まっていない部屋では、従来どおり全員が操作できる
 * （所有者のいないコマは誰でも触れる、というjs/board-data-driven.jsの規則と揃えている）。
 */
export function canOperateAsGm() {
  const participants = store.state.participants || {};
  if (!hasAnyGm(participants)) return true;
  return isGm(participants, getCurrentParticipantId());
}
