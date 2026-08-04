// js/state-import.js
// 「部屋の全データ読み込み」で取り込んだ状態を、この部屋で使える形へ均す。
// ブラウザ（js/net-sync.jsのreplaceState）とサーバー（server/index.jsの部屋作成・REPLACE_STATE）の
// 両方から通す、取り込みの唯一の入口。
//
// 均す必要があるのは、状態のあちこちが参加者ID(participantId)に紐づいているため。
// participantIdは「部屋スロットIDと表示名」から導出される（js/local-identity.js）ので、
// 別のスロットへ読み込むと、同じ表示名で入り直してもIDが全部変わる。つまり、
// ファイルに載っている参加者IDは「もう誰も名乗れないID」になっている。
//
//   participants … ファイル側を捨て、今この部屋にいる参加者で置き換える。捨てないと、
//                  isGm:trueのゴーストが居座って「GMが1人もいなければ最初に名乗った人がGM」
//                  （game-store.jsのREGISTER_PARTICIPANT）が働かなくなり、入室中のGMが
//                  読み込んだ場合はその場でGM権限を失う（自力では戻せない）。
//   infoEntries  … ownerIdを外し、公開先が設定されていた区画は宛先なし（＝誰にも見えない）へ
//                  潰したうえでrestoredFromImportの印を付ける。印の付いたエントリは、GMの画面へ
//                  届いた時点でGMのものとして引き取られる（CLAIM_RESTORED_INFO・js/info-panel.js）。
//                  安全側に倒しているのは、公開先を復元しようがない以上「うっかり全員に見える」
//                  よりは「GMが配り直す」方が事故が小さいため。
//
// チャットタブのaudience・パネルのtextAudience・コマのownerId等も同じ理由で失効するが、
// 今のところ手当てしているのは情報だけ。足すときはここへ足す。

import { normalizeInfoEntries } from './game-store.js';

// 1エントリぶんの引き取り準備。公開先が設定された区画が1つも無ければ、そのまま全員に見える
// 状態で復元できるので印は付けない（GMの引き取りを待たせる必要がない）。
function adoptInfoEntry(entry) {
  const { restoredFromImport, ...rest } = entry;
  // 旧IDのownerIdは誰とも一致しない。null＝誰でも編集できる扱いにしておく（canEditEntry参照）
  const base = { ...rest, ownerId: null };

  if (!entry.sections.some(section => Array.isArray(section.audience))) return base;

  return {
    ...base,
    restoredFromImport: true,
    sections: entry.sections.map(section => (
      Array.isArray(section.audience) ? { ...section, audience: [] } : section
    ))
  };
}

/**
 * 取り込んだ状態を、この部屋で使える形へ均す。何度通しても同じ結果になる（サーバーは
 * ブラウザ側で均された状態を受け取っても、自分の参加者一覧でもう一度通す）。
 * @param {object} importedState 読み込んだJSON（信用しない）
 * @param {{participants?: object}} options participants＝今この部屋にいる参加者一覧。
 *   部屋の新規作成と同時の読み込みでは誰もいないので空（＝最初に名乗った人がGMになる）。
 * @returns {object} hydrateへ渡せる状態
 */
export function adoptImportedState(importedState, { participants = {} } = {}) {
  const state = (importedState && typeof importedState === 'object') ? importedState : {};

  return {
    ...state,
    participants: participants || {},
    infoEntries: normalizeInfoEntries(state.infoEntries).map(adoptInfoEntry)
  };
}
