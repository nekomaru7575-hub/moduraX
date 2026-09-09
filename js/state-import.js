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
//                  backyardTokenIds（js/main.jsのexportStateToFileが書き出す、保存した時点で
//                  誰かのバックヤードにいたコマのID一覧）に載っているコマを、**GMの
//                  バックヤードへまとめて入れ直す**。棚の分け方は元の部屋限りのIDなので
//                  持ち主ごとに戻すことはできず、預かれるのは部屋を左右できるGMだけ
//                  （読み込み自体もGM限定。js/main.jsのimportStateBtn）。
//                  宛先の決め方は2通りある：
//                    ・部屋の中からの読み込み … 読み込んだ本人＝GMなので、その場で
//                      options.myBackyardOwnerId（無ければmyBackyardOwnerLocalId）へ
//                      付け替える。呼び出し側が分かる場合だけ渡す省略可能な引数
//                      （サーバー側には「読み込んだ利用者」という概念が無いため）。
//                      localIdの方はlistMyBackyardTokensがownerId不在のコマを
//                      backyardOwnerIdで判定するのと同じ規則。
//                    ・部屋の作成と同時の読み込み … まだ誰も名乗っていないので宛先が無い。
//                      infoEntriesと同じくrestoredFromImportの印を付けておき、GMの画面へ
//                      届いた時点で引き取ってもらう（CLAIM_RESTORED_BACKYARD・
//                      js/character-panel.js）。
//                  どちらの宛先も無い（サーバーが均し直すだけの場合）ときは、印だけ付けて
//                  そのまま通す。印は引き取りで外れるので、何度通しても結果は同じ。
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

// 入れ直す対象のコマID。ファイルに記録があればそれを使い、無ければ状態のinBackyardから
// 拾い直す。記録は「棚の中身をブラウザしか知らなかった」時代の名残（保存した本人のぶんだけを
// myBackyardTokenIdsに載せていた）で、今は持ち主を問わず全部が対象なのでinBackyardだけで
// 足りる。記録の無い古いファイルもこれで同じように戻せる。
//
// **拾い直すのは宛先が分かっているときだけ**。宛先が無い場合（サーバーが均し直す2周目）は
// 記録が既に外れているので、拾い直すと「ブラウザが付け替えたばかりの棚」をもう一度
// 印付きへ戻してしまう。何度通しても同じ結果になる、を保つための線引き。
function backyardIdsToRestore(tokens, recordedIds, hasDestination) {
  if (Array.isArray(recordedIds)) return recordedIds;
  if (!hasDestination) return [];
  return Object.entries(tokens || {}).filter(([, token]) => token?.inBackyard).map(([id]) => id);
}

// 対象のコマを、読み込んだ人（＝GM）のバックヤードへ入れ直す。
// 宛先が分かっていればownerId（参加者IDが分かる場合）またはbackyardOwnerId（参加者IDが無く、
// ブラウザ単位のIDだけ分かる場合）を付け替え、分かっていなければrestoredFromImportの印だけ
// 付けて後の引き取りに回す（部屋の作成と同時の読み込み）。
// 載っているIDがtokensに無い（壊れたファイル・盤面へ出した後に保存し直した等）場合はそのIDだけ
// 無視する。IDは信用しないファイル由来の値なので、'__proto__'等がtokensのown propertyで
// ない限り読み書きしない（連想配列としての誤用・プロトタイプ汚染を避ける）。
function restoreBackyardTokens(tokens, backyardTokenIds, ownerId, localUserId) {
  if (!Array.isArray(backyardTokenIds) || backyardTokenIds.length === 0) return tokens;

  const result = { ...tokens };
  backyardTokenIds.forEach(id => {
    if (!Object.prototype.hasOwnProperty.call(result, id)) return;
    const token = result[id];
    if (!token) return;
    if (ownerId) {
      result[id] = { ...token, inBackyard: true, ownerId };
      return;
    }
    if (localUserId) {
      // 参加者IDが無い場合、listMyBackyardTokensはownerIdが無いコマだけbackyardOwnerIdで
      // 判定する。旧ownerId（元の部屋のもの）が残っていると誤って別人の棚扱いになるためnullで消す。
      result[id] = { ...token, inBackyard: true, ownerId: null, backyardOwnerId: localUserId };
      return;
    }
    // 宛先がまだ無い。元の部屋の持ち主のままにすると誰の棚にも出ないので、印を付けて
    // GMの引き取りを待つ（CLAIM_RESTORED_BACKYARD）。
    result[id] = {
      ...token, inBackyard: true, ownerId: null, backyardOwnerId: null, restoredFromImport: true
    };
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
 *   myBackyardOwnerId＝読み込んだ利用者（＝GM。読み込みはGM限定）の参加者ID。分かる場合だけ
 *   渡す。渡すと、ファイル側のbackyardTokenIdsに載っているコマがこの利用者のバックヤードへ
 *   入る。渡さない場合は印だけ付き、後からGMが引き取る。
 *   myBackyardOwnerLocalId＝読み込んだ利用者のブラウザ単位のID（js/local-identity.jsの
 *   getLocalUserId()）。myBackyardOwnerIdが無い（表示名未設定などで参加者IDが取れない）場合の
 *   フォールバック先。両方省略時（サーバー・部屋の作成と同時の読み込み）は、ファイルに記録の
 *   あるコマへ印を付けるだけで、宛先は後のGMの引き取りに委ねる。
 * @returns {object} hydrateへ渡せる状態
 */
export function adoptImportedState(
  importedState,
  { participants = {}, myBackyardOwnerId = null, myBackyardOwnerLocalId = null } = {}
) {
  const state = (importedState && typeof importedState === 'object') ? importedState : {};
  // myBackyardTokenIdsは旧フィールド名（保存した本人のぶんだけを載せていた時代のもの）。
  // 中身の使い道は同じなので、古いファイルもそのまま読める。どちらも無ければinBackyardから
  // 拾い直す（backyardIdsToRestore）。
  const { backyardTokenIds, myBackyardTokenIds, ...rest } = state;
  const recordedIds = Array.isArray(backyardTokenIds) ? backyardTokenIds
    : (Array.isArray(myBackyardTokenIds) ? myBackyardTokenIds : null);
  const adoptedParticipants = participants || {};
  const restoredIds = backyardIdsToRestore(
    state.tokens, recordedIds, !!(myBackyardOwnerId || myBackyardOwnerLocalId)
  );

  return {
    ...rest,
    tokens: restoreBackyardTokens(state.tokens, restoredIds, myBackyardOwnerId, myBackyardOwnerLocalId),
    cards: forgetCardViewers(state.cards),
    participants: adoptedParticipants,
    infoEntries: normalizeInfoEntries(state.infoEntries).map(adoptInfoEntry)
  };
}

/**
 * 部屋を新しく作るときの取り込み。フォームの入力とファイルの中身を突き合わせて、
 * hydrateへ渡せる初期状態にする。
 *
 * 【なぜ共有するか】この突き合わせ方は元々server/index.jsのhandleCreateRoomにしか無かった。
 * P2P卓ではファイルの読み込みをブラウザ側で行う（サーバーへ93MBのボディを送らないため。
 * js/room-index.js）ので、同じ規則が2か所に要る。両方に書けば必ずどちらかがずれるので、
 * ここを唯一の出どころにする。
 *
 * 突き合わせ方：**部屋名はフォームで上書きし、プラグインとシステムはファイル側を優先する。**
 * 読み込んだ部屋データが前提にしていた構成を、その場のフォーム選択で誤って壊さないため。
 * ファイル側に値が無いときだけフォームの値を使う。
 *
 * 参加者一覧は空で渡す＝ファイル側の参加者（GMの印を含む）を捨て、「最初に名乗った人が
 * GMになる」規則に戻す。作ったばかりの部屋にはまだ誰もいない。
 *
 * @param {object} importedState 読み込んだJSON（信用しない）
 * @param {object} options
 * @param {string} options.name フォームで入力された部屋名
 * @param {string|null} options.activePlugin フォームで選ばれたプラグイン（検証済み）
 * @param {string} options.bcdiceSystem フォームで選ばれたダイスシステム
 * @param {Set<string>} options.validPluginIds このサーバーが持っているプラグインのID
 * @returns {object} hydrateへ渡せる状態
 */
export function buildRoomStateFromImport(
  importedState, { name, activePlugin, bcdiceSystem, validPluginIds }
) {
  const importedRoom = (importedState && typeof importedState === 'object' && importedState.room) || {};
  const importedPlugin = importedRoom.activePlugin;
  const resolvedActivePlugin = importedPlugin && validPluginIds.has(importedPlugin)
    ? importedPlugin
    : activePlugin;
  const resolvedBcdiceSystem = typeof importedRoom.bcdiceSystem === 'string' && importedRoom.bcdiceSystem
    ? importedRoom.bcdiceSystem
    : bcdiceSystem;

  return adoptImportedState({
    ...importedState,
    room: {
      ...importedRoom,
      name,
      activePlugin: resolvedActivePlugin,
      bcdiceSystem: resolvedBcdiceSystem
    }
  }, { participants: {} });
}
