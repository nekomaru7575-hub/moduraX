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
 * @param {string|null} participantId 自分の参加者ID。合言葉未設定（ゲスト）ならnull
 */
export function canView(audience, participantId) {
  if (!isRestricted(audience)) return true;
  // ゲストは限定公開のものを見られない（誰でもなれてしまう身分のため）
  if (!participantId) return false;
  return audience.includes(participantId);
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
