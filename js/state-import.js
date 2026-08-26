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
//                  伏せた語(masks)の公開状態も同じ天秤で、開いてあったものを全部伏せ直す。
//                  こちらは参加者IDに依存しないのでそのまま復元「できる」が、間違いの向きが
//                  非対称：開き直すのはクリック1回で済むのに対し、読まれてしまった事実は
//                  戻せない。取り込みの典型は「シナリオのファイルを別の卓で開く」で、そこで
//                  開示済みの語が出ると答えが見えた状態で卓が始まり、しかもGMは自分の画面が
//                  自然に見えるので気づけない。伏せ字を持つエントリにも印を付けるのは、
//                  ownerIdがnullのままだと誰も（GMさえも）中身を見透かせなくなるため
//                  （js/info-panel.jsのcanRevealMasks）。
//   cards        … 「カードを見る」の記録(seenBy)は他の部屋の参加者IDなので、空にする。
//                  残しても誰の名前にも解決できず（「不明な参加者」が並ぶだけ）、
//                  取り込んだ先の別人の記録に見えてしまう。
//   tokens       … バックヤードのコマのownerIdも同じ理由で失効し、誰の棚にも現れなくなる
//                  （js/character-panel.jsのlistMyBackyardTokens参照）。ファイル側の
//                  myBackyardTokenIds（js/main.jsのexportStateToFileが書き出す、保存した
//                  利用者自身のバックヤードのコマID一覧）に載っているコマだけ、
//                  options.myBackyardOwnerIdへownerIdを付け替えてバックヤードへ戻す。
//                  myBackyardOwnerIdは呼び出し側（読み込んだ利用者がいるならその参加者ID）
//                  が分かる場合だけ渡す省略可能な引数で、省略時は何もしない
//                  （サーバー側には「読み込んだ利用者」という概念が無いため）。
//                  表示名未設定などで参加者IDが無い（myBackyardOwnerIdがnull）場合は、
//                  options.myBackyardOwnerLocalIdへ渡されたブラウザ単位のIDをbackyardOwnerId
//                  として付け替える。これはlistMyBackyardTokensがownerId不在のコマを
//                  backyardOwnerIdで判定するのと同じ規則。
//
// チャットタブのaudience・パネルのtextAudience等も同じ理由で失効するが、
// 今のところ手当てしているのは情報・バックヤードのコマ・カードの「見た人」だけ。
// 足すときはここへ足す。

import { normalizeInfoEntries } from './game-store.js';

// 1エントリぶんの引き取り準備。公開先が設定された区画も伏せた語も無ければ、そのまま全員に
// 見える状態で復元できるので印は付けない（GMの引き取りを待たせる必要がない）。
function adoptInfoEntry(entry) {
  const { restoredFromImport, ...rest } = entry;
  // 旧IDのownerIdは誰とも一致しない。null＝誰でも編集できる扱いにしておく（canEditEntry参照）
  const base = { ...rest, ownerId: null };

  const hasRestricted = entry.sections.some(section => Array.isArray(section.audience));
  const hasMasks = entry.sections.some(section => section.masks.length > 0);
  if (!hasRestricted && !hasMasks) return base;

  return {
    ...base,
    restoredFromImport: true,
    sections: entry.sections.map(section => ({
      ...section,
      audience: Array.isArray(section.audience) ? [] : section.audience,
      masks: section.masks.map(mask => ({ ...mask, revealed: false }))
    }))
  };
}

// myBackyardTokenIdsに載っているコマだけ、ownerId（参加者IDが分かる場合）または
// backyardOwnerId（参加者IDが無く、ブラウザ単位のIDだけ分かる場合）を付け替えてバックヤードへ
// 戻す。ownerId・localUserIdのどちらも無い（＝読み込んだ利用者が分からない）場合や、記録が
// 無い・空・配列でない（新フィールドを持たない旧ファイル）場合はtokensをそのまま返す。
// 載っているIDがtokensに無い（壊れたファイル・盤面へ出した後に保存し直した等）場合はそのIDだけ
// 無視する。backyardTokenIdsは信用しないファイル由来の値なので、'__proto__'等がtokensの
// own propertyでない限り読み書きしない（連想配列としての誤用・プロトタイプ汚染を避ける）。
function restoreMyBackyardTokens(tokens, backyardTokenIds, ownerId, localUserId) {
  if ((!ownerId && !localUserId) || !Array.isArray(backyardTokenIds) || backyardTokenIds.length === 0) {
    return tokens;
  }

  const result = { ...tokens };
  backyardTokenIds.forEach(id => {
    if (!Object.prototype.hasOwnProperty.call(result, id)) return;
    const token = result[id];
    if (!token) return;
    result[id] = ownerId
      ? { ...token, inBackyard: true, ownerId }
      // 参加者IDが無い場合、listMyBackyardTokensはownerIdが無いコマだけbackyardOwnerIdで
      // 判定する。旧ownerId（元の部屋のもの）が残っていると誤って別人の棚扱いになるためnullで消す。
      : { ...token, inBackyard: true, ownerId: null, backyardOwnerId: localUserId };
  });
  return result;
}

// カードの「見た人」(seenBy)を空にする。IDは元の部屋のものなので、この部屋の誰とも
// 一致しない。cardsが無い（この機能より前のファイル）場合はそのまま返す（hydrate側が
// 既定値を補う。js/game-store.jsのnormalizeCardMap）。
function forgetCardViewers(cards) {
  if (!cards || typeof cards !== 'object') return cards;

  return Object.fromEntries(
    Object.entries(cards).map(([id, card]) => (
      (card && typeof card === 'object') ? [id, { ...card, seenBy: [] }] : [id, card]
    ))
  );
}

/**
 * 取り込んだ状態を、この部屋で使える形へ均す。何度通しても同じ結果になる（サーバーは
 * ブラウザ側で均された状態を受け取っても、自分の参加者一覧でもう一度通す）。
 * @param {object} importedState 読み込んだJSON（信用しない）
 * @param {{participants?: object, myBackyardOwnerId?: string, myBackyardOwnerLocalId?: string}} options
 *   participants＝今この部屋にいる参加者一覧。部屋の新規作成と同時の読み込みでは誰もいないので
 *   空（＝最初に名乗った人がGMになる）。
 *   myBackyardOwnerId＝読み込んだ利用者の参加者ID。分かる場合だけ渡す。渡すと、ファイル側の
 *   myBackyardTokenIdsに載っているコマがこの利用者のバックヤードへ入る。
 *   myBackyardOwnerLocalId＝読み込んだ利用者のブラウザ単位のID（js/local-identity.jsの
 *   getLocalUserId()）。myBackyardOwnerIdが無い（表示名未設定などで参加者IDが取れない）場合の
 *   フォールバック先。両方省略時は何もしない。
 * @returns {object} hydrateへ渡せる状態
 */
export function adoptImportedState(
  importedState,
  { participants = {}, myBackyardOwnerId = null, myBackyardOwnerLocalId = null } = {}
) {
  const state = (importedState && typeof importedState === 'object') ? importedState : {};
  const { myBackyardTokenIds, ...rest } = state;

  return {
    ...rest,
    tokens: restoreMyBackyardTokens(state.tokens, myBackyardTokenIds, myBackyardOwnerId, myBackyardOwnerLocalId),
    cards: forgetCardViewers(state.cards),
    participants: participants || {},
    infoEntries: normalizeInfoEntries(state.infoEntries).map(adoptInfoEntry)
  };
}
