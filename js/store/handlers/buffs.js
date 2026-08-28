// js/store/handlers/buffs.js
// バフ/デバフの付け外しと、フェーズ終了による消滅。
//
// 実効値の計算（getEffectiveParameterValue）は delta しか見ないので、
// ここで基礎値（parameters）を書き換えることはない。

import { applyPhaseEnd } from '../buffs.js';
import { withSystemTabLog } from '../chat.js';
import { patchCharacter } from '../patch.js';

export const BUFFS_HANDLERS = {
  // バフ/デバフを1件付与する。paramIdが解決できない（=対象のパラメータをこのコマが
  // 持っていない）場合もnullのまま保持し、実効値計算（getEffectiveParameterValue）側で
  // 単に無視される＝効果を持たないバフとして扱う。
  ADD_BUFF({ payload, nextTokensState, commit }) {
    const { tokenId, id, name, paramId = null, delta, expirePhase = null, tag = null, meta = null } = payload;
    const character = nextTokensState[tokenId];
    if (!character || !id || !name) return;

    const buff = Object.freeze({
      id,
      name,
      paramId,
      delta: Number(delta) || 0,
      expirePhase: expirePhase || null, // 'scene' | 'round' | 'scenario' | null(手動のみ)
      tag: tag || null, // 発行元をまとめて識別するための任意タグ（例: コンボ発動時のcombo.id）
      // プラグイン固有の付随データ（DX3ならクリティカル値の下限）。tagと同じく
      // Coreは中身を一切解釈せず、そのまま持ち回るだけ。実効値の計算
      // （getEffectiveParameterValue）はdeltaしか見ないため、metaは値に影響しない。
      meta: meta ? Object.freeze({ ...meta }) : null
    });

    patchCharacter(nextTokensState, tokenId, {
      buffs: Object.freeze([...(character.buffs || []), buff])
    });

    commit({ tokens: nextTokensState });
  },

  REMOVE_BUFF({ payload, nextTokensState, commit }) {
    const { tokenId, id } = payload;
    const character = nextTokensState[tokenId];
    if (!character || !character.buffs) return;

    patchCharacter(nextTokensState, tokenId, {
      buffs: Object.freeze(character.buffs.filter(b => b.id !== id))
    });

    commit({ tokens: nextTokensState });
  },

  // 指定tagを持つバフ/デバフを1コマから一括削除する（例: コンボダメージ実行後、
  // そのコンボ発動由来のバフをまとめて消す）。EXPIRE_BUFFSと違い通常の行動完了に
  // 伴う片付けなのでログへの記録はしない。
  REMOVE_BUFFS_BY_TAG({ payload, nextTokensState, commit }) {
    const { tokenId, tag } = payload;
    const character = nextTokensState[tokenId];
    if (!character || !character.buffs || !tag) return;

    patchCharacter(nextTokensState, tokenId, {
      buffs: Object.freeze(character.buffs.filter(b => b.tag !== tag))
    });

    commit({ tokens: nextTokensState });
  },

  // シーン/ラウンド/シナリオ終了を検知し、該当する終了条件を持つバフ/デバフを全コマから
  // 一括で消す。上位フェーズを指定すると内側のフェーズ分もまとめて消える（applyPhaseEnd参照）。
  // 将来実装予定の「シーン進行」機能から呼ばれる想定で、現状はチャットコマンド
  // （「シーン終了」等）がエスケープハッチとして直接dispatchする。
  // 結果はMainタブのチャットログへ直接追記する（理由はwithSystemLogのコメント参照）。
  // tokenIdを指定すると、そのコマだけのフェーズ終了として扱う。ダイスを振った本人の
  // 「判定終了で消滅」バフを自動で剥がす用途（js/main.jsのDICE_ROLL_REQUESTED、
  // js/parameters/dx3-combo-box.jsのrunComboCheck）で使う。
  //
  // 1コマ分の場合はここでチャットログを書かない。この自動発火はロールのたびに走るため、
  // 独立したシステム発言にすると1回の判定でログが2行進み、直前のロール結果が
  // すぐ流れてしまう。代わりに、呼び出し側がそのロール自身のログへ併記する
  // （listExpiringBuffNames / formatExpiredBuffsNote）。
  EXPIRE_BUFFS({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { phase, tokenId = null } = payload;
    if (!phase) return;
    if (tokenId && !nextTokensState[tokenId]) return;

    const { tokens, removedNames, logText } = applyPhaseEnd(nextTokensState, activePlugin, phase, tokenId);

    if (tokenId) {
      // 何も消えないなら状態を作り直さない（無駄な再描画・同期を起こさないため）
      if (removedNames.length === 0) return;
      commit({ tokens });
      return;
    }

    // 「〈フェーズ〉終了。消滅したバフ/デバフ: …」はコマの状態の後始末で、卓の流れそのもの
    // ではない。ラウンド進行の通知（Main）に混ぜず、システムタブへ寄せる。
    commit({
      tokens,
      chatLogs: withSystemTabLog(prevState.chatLogs, logText, payload?.time)
    });
  },
};