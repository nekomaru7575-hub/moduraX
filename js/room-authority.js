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
import { isDeveloperIdentity } from './net-sync.js';
import { isGm } from './visibility.js';

// 無効化した項目のtitleに入れる共通の理由。文言を1か所に置いて表記を揃える。
export const GM_ONLY_REASON = 'GMだけが操作できます';

// GMが1人でもいるか。全員がゲスト（表示名なし）の部屋ではGMが存在しないため、
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
  // 開発用の合言葉で名乗れている場合はGMと同じ扱い（サーバー側だけが判定できるので、
  // 名乗りの返事で受け取った結果を見る。server/index.jsのisDeveloperToken参照）
  if (isDeveloperIdentity()) return true;

  const participants = store.state.participants || {};
  if (!hasAnyGm(participants)) return true;
  return isGm(participants, getCurrentParticipantId());
}

/**
 * そのコマを操作してよいか（更新・JSON読み込み・削除・バックヤードへの回収、
 * ラウンド進行でのプロット提出）。所有者がいないコマは誰でも触れる。
 * 盤面上の移動だけはこの判定を通さない（誰でも動かせる）。
 *
 * 部屋レベルの操作ではないが、判定の材料（誰がGMか・今の自分は誰か）が
 * canOperateAsGmと同じなのでここに置く。呼ぶ側が自分のIDを組み立てずに済むよう、
 * 状態は上と同じくこの中で読む。
 *
 * GMかどうかはcanOperateAsGm()ではなくisGm()で見る。canOperateAsGm()は「GMが1人も
 * いない部屋では全員が操作できる」を含むため、それを使うとGM不在の部屋で他人のコマまで
 * 触れてしまう。持ち主がいるコマの防壁は持ち主本人とGMだけ、という元の規則を保つ。
 */
export function canOperateToken(token) {
  if (!token) return false;
  if (!token.ownerId) return true;
  const myParticipantId = getCurrentParticipantId();
  if (isGm(store.state.participants, myParticipantId)) return true;
  return token.ownerId === myParticipantId;
}
