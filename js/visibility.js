// js/visibility.js
// 「これは誰に見せるものか」(audience) の解釈を1か所にまとめる共通モジュール。
// チャットタブの限定公開から使い始め、今後コマ/パネルの部分秘匿でも同じ規則を使う。
//
// audience の形：
//   null（またはundefined） … 全員に見せる
//   string[]               … その参加者ID（js/local-identity.jsの公開ID）だけに見せる
//
// GMを自動で宛先に含めることはしない。宛先はリストのとおりに解釈する（PL同士の内緒話も
// 成り立たせるため）。GMにも見せたい場合は、宛先の選択でGMを選ぶ。
//
// 【重要】現段階の絞り込みは表示（レンダリング）だけで行っている。状態そのものは今も
// 全クライアントへ丸ごと配られているため、これは「うっかり見えない」ための仕組みであって、
// 見ようとする相手からデータを守るものではない。守るには、サーバー側で人ごとに状態を
// 絞って配る作り（projection）が必要で、それは次の段階で入れる。

// 見せられない値の代わりに出す表記。「その項目が存在すること」は伝えつつ、中身だけを伏せる
// （キャラクター一覧の限定公開パラメータ、パラメータ変更コマンドのログ）。
export const HIDDEN_VALUE_MASK = '??';

export function isRestricted(audience) {
  return Array.isArray(audience);
}

/**
 * その人がGMか。参加者一覧はjs/game-store.jsのstate.participants。
 * @param {Record<string, {isGm?: boolean}>} participants
 * @param {string|null} participantId
 */
export function isGm(participants, participantId) {
  if (!participantId) return false;
  return !!participants?.[participantId]?.isGm;
}

/**
 * 自分がそれを見てよいか。
 * @param {string[]|null|undefined} audience 宛先（nullなら全員）
 * @param {string|null} participantId 自分の参加者ID。表示名未設定（ゲスト）ならnull
 */
export function canView(audience, participantId) {
  if (!isRestricted(audience)) return true;
  // ゲストは限定公開のものを見られない（誰でもなれてしまう身分のため）
  if (!participantId) return false;
  return audience.includes(participantId);
}

// --- シークレットダイス ---
// 宛先（audience）とは別の軸で、「振った本人だけ」に固定された秘匿。チャットログ1件が
// secret: true を持つと、公開（revealed: true）されるまで出目を伏せる。
//
// 状態には本物の出目を載せたまま、表示するときだけ差し替える。情報の伏せ字
// （js/store/info.jsのmasks[].revealed）と同じ流儀で、上のaudienceと同じ割り切りでもある
// （このファイル冒頭の【重要】参照）。

// 出目の代わりに出す文言。「振ったこと」自体は伏せない（それが機能の眼目）ので、
// 何が起きたかは同じ行の「🔒 シークレットダイス」の印が伝える（js/main.jsのbuildLogHtml）。
// ここはその印を繰り返さず、本文の場所に置く但し書きだけにする。
export const SECRET_DICE_MASK = '（出目は振った本人にだけ見えています）';

/**
 * その発言の出目を今の自分が見てよいか。見えるのは振った本人だけで、GMも見えない
 * （情報の伏せ字のcanRevealMasksがGMに見透かしを許しているのとは意図的に違う。
 * シークレットダイスはGMに隠すためにも使うため）。
 * @param {{secret?: boolean, revealed?: boolean, ownerId?: string|null}} entry
 * @param {string|null} participantId 自分の参加者ID。表示名未設定（ゲスト）ならnull
 */
export function canViewSecretDice(entry, participantId) {
  if (!participantId) return false; // ゲストは誰の出目も見透かせない
  return !!entry?.ownerId && entry.ownerId === participantId;
}

/**
 * チャットログ1件を、今の自分に見せてよい形にして返す。伏せる必要がなければ引数を
 * そのまま返す（同一参照）。
 *
 * 【同一参照で返すこと】呼び出し側（js/main.jsのpatchEditedLogEntries／renderMainChatMirror）は
 * entryの参照が変わったことで「書き換わった行」を見分けている。伏せない行まで複製を返すと、
 * 毎回すべての行が書き換わったように見えて再描画が走る。
 *
 * @param {object} entry チャットログ1件
 * @param {string|null} participantId 自分の参加者ID
 */
export function visibleChatEntry(entry, participantId) {
  if (!entry?.secret || entry.revealed) return entry;
  if (canViewSecretDice(entry, participantId)) return entry;

  // 伏せるのは出目そのもの（resultText）と出目内訳だけ。発言者・コメント・時刻は
  // 「誰がいつ何のために振ったか」として共有される。
  return { ...entry, resultText: SECRET_DICE_MASK, diceDetail: '' };
}

/**
 * 宛先を人間に読める形にする（タブのツールチップ等の表示用）。
 * @param {string[]|null|undefined} audience
 * @param {Record<string, {id:string, nickname:string}>} participants
 */
export function describeAudience(audience, participants = {}) {
  if (!isRestricted(audience)) return '全員に公開';
  if (audience.length === 0) return '公開先なし';

  const names = audience.map(id => participants[id]?.nickname || '（不明な参加者）');
  return `公開先: ${names.join('、')}`;
}
