// js/store/handlers/participants.js
// 参加者一覧（表示名から導出した公開IDで識別する）と、スタンプの集計。
//
// 状態に載るのは公開ID・表示名・GMかどうかだけ。同じ表示名なら別の端末からでも
// 同じIDになるので、入り直しても同じ参加者になる。

import { findStamp } from '../../stamp-registry.js';
import { withMapEntry, withoutMapEntry } from '../patch.js';
import { withDerivedRoomParameters } from '../room.js';

// スタンプの集計1件（1人ぶん）が取りうる上限。桁あふれした値を書き込まれても表示が
// 壊れないようにするための歯止めで、実際の使用でここに届くことは想定していない。
const MAX_STAMP_COUNT = 1_000_000;


export const PARTICIPANTS_HANDLERS = {
  // --- 参加者（js/local-identity.jsの「表示名」から導出した公開IDで識別する） ---
  // 状態に載るのは公開ID・表示名・GMかどうかだけ。
  // 同じ表示名なら別の端末・ブラウザからでも同じIDになるので、入り直しても同じ参加者になる。
  REGISTER_PARTICIPANT({ prevState, payload, commit }) {
    const { id, nickname } = payload;
    if (!id) return;

    const participants = prevState.participants || {};
    const existing = participants[id];
    // まだGMが1人もいなければ、最初に名乗った人をGMにする（部屋を作った本人が
    // そのまま入室する想定）。以後の付け外しはSET_PARTICIPANT_GMで行う。
    const hasGm = Object.values(participants).some(p => p.isGm);

    commit({
      participants: withMapEntry(participants, id, Object.freeze({
        id,
        nickname: typeof nickname === 'string' ? nickname : (existing?.nickname || ''),
        isGm: existing ? existing.isGm : !hasGm
      }))
    });
  },

  SET_PARTICIPANT_GM({ prevState, payload, commit }) {
    const { id, isGm } = payload;
    const participants = prevState.participants || {};
    const participant = participants[id];
    if (!participant) return;

    commit({
      participants: withMapEntry(participants, id, Object.freeze({ ...participant, isGm: !!isGm }))
    });
  },

  // 表示名の打ち間違いで増えてしまった参加者などを消すための後始末用。
  REMOVE_PARTICIPANT({ prevState, payload, commit }) {
    const { id } = payload;
    const participants = prevState.participants || {};
    if (!participants[id]) return;

    commit({ participants: withoutMapEntry(participants, id) });
  },

  // スタンプを何枚出したかを記録する（js/stamp-layer.jsのrequestStampから、送るのと同時に）。
  // スタンプの表示には連打よけの上限があるが、この数には無い。上限に当たった枚は
  // 盤面に出ないだけで、押した事実としては数える。
  //
  // 【なぜ「+1」ではなく枚数そのものを受け取るか】
  // 加算だと、途中の1回が届かなかった時点でその人の数が全員ぶんズレたまま戻らない
  // （サーバーは流量の上限を超えたメッセージを黙って捨てる。server/index.jsの
  // WS_MAX_MESSAGES_PER_WINDOW）。このアプリの他のアクションが軒並み絶対値を運んで
  // いるのはそのためで、取りこぼしても次の操作で正しい値に戻る。ここも同じ流儀にする。
  // 書き込むのは常に「自分の枠」だけ（＝人ごとにキーが分かれている）なので、
  // 絶対値にしても他人の操作と衝突しない。
  //
  // 【なぜここで弾くか】キーになる2つを、実在するものだけに絞る。
  // 素通しにすると、細工したクライアントが任意のstampId・participantIdで書き込めて、
  // このマップが無限に増える。状態は部屋ごとまるごと保存されるので、そのまま
  // 保存先への書き込み量になる（＝資源の話であって、行儀の話ではない）。
  // reducerはサーバーでも同じものが動くため、ここで塞げばサーバー側に手当ては要らない。
  COUNT_STAMP({ prevState, payload, activePlugin, commit }) {
    const { stampId, participantId, count } = payload || {};

    // 実在する参加者のぶんだけ。名乗っていない人は数える先が無い（スタンプ自体も
    // サーバーが捨てる。server/index.jsのSEND_STAMP参照）。
    // hasOwnPropertyで見るのが肝：素の [participantId] だと '__proto__' が
    // Object.prototype に当たって「実在する参加者」を通ってしまう。
    const participants = prevState.participants || {};
    if (!participantId || !Object.prototype.hasOwnProperty.call(participants, participantId)) return;

    // その部屋で使えるスタンプのうち、プラグインが足したものだけを数える。
    // Coreのスタンプ（相槌）まで数えると、集計が「OK ×132」で埋まって用を成さない。
    const activePluginId = prevState.room?.activePlugin ?? null;
    const stamp = findStamp(stampId, activePluginId);
    if (!stamp || !activePluginId || !stamp.id.startsWith(`${activePluginId}:`)) return;

    // 枚数は0以上の整数だけ。上限を設けているのは、桁数の大きい値を書き込まれても
    // 表示が壊れないようにするため（人ごとに1つの数なので、資源としては軽い）。
    if (!Number.isInteger(count) || count < 0 || count > MAX_STAMP_COUNT) return;

    // 既存の値も同じ理由で、own propertyとして在るものだけを読む。
    const stampCounts = prevState.stampCounts || {};
    const perParticipant = Object.prototype.hasOwnProperty.call(stampCounts, stamp.id)
      ? stampCounts[stamp.id] : {};
    const current = Object.prototype.hasOwnProperty.call(perParticipant, participantId)
      ? perParticipant[participantId] : 0;
    // 同じ値の書き直しは何も変えない（保存の往復を省く。persistRoomNowの比較と同じ狙い）
    if (current === count) return;

    const nextStampCounts = withMapEntry(
      stampCounts, stamp.id, withMapEntry(perParticipant, participantId, count)
    );

    commit({
      stampCounts: nextStampCounts,
      // 集計から決まるルーム変数（ブーケ合計）を追随させる
      room: withDerivedRoomParameters(prevState.room, nextStampCounts, prevState.round)
    });
  },

  // 集計を全部0に戻す（js/stamp-panel.jsの「集計をリセット」）。一度消すと戻せないので
  // GM限定（server/index.jsのGM_ONLY_ACTIONS）。ログの消去と同じ扱い。
  RESET_STAMP_COUNTS({ prevState, commit }) {
    if (Object.keys(prevState.stampCounts || {}).length === 0) return;

    const emptyCounts = Object.freeze({});
    commit({
      stampCounts: emptyCounts,
      // 集計を0にしたら、そこから決まるルーム変数（ブーケ合計）も0に戻る
      room: withDerivedRoomParameters(prevState.room, emptyCounts, prevState.round)
    });
  },
};