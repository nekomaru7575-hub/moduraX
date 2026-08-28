// js/store/round-state.js
// ラウンド進行（Core機能）の状態そのものと、その状態から導ける読み取り。
//
// 手番は「participants 内のインデックス」ではなく「まだ行動していない人の集合」で表す。
// 行動済みの取り消し・割り込み・途中参加を、順番の付け替え無しに扱えるようにするため。
// プロット（伏せて出す数字）まわりの並べ替えと同点判定もここに集めてある。

import {
  applyPluginDerivedParameters, applyPluginRoundPhaseStart, getRoundPhaseTemplate
} from '../parameters/registry.js';
import { getEffectiveParameterValue, withParamFields } from './params.js';
import { patchCharacter } from './patch.js';

// ラウンド進行（Core機能）の初期状態。未開始（active:false）がデフォルト。
// 手番は「participants内のインデックス」ではなく「まだ行動していない人の集合」で表す。
// こうしておくと、行動済みを取り消して手番を回復させたり、順番を無視して割り込ませたりが
// 単なる集合の出し入れで済む（pickNextActor参照）。
export function createInitialRoundState() {
  return {
    active: false,
    template: null,   // 開始時にスナップショットするフェーズ配列（parameters/registry.jsのgetRoundPhaseTemplate参照）
    roundNumber: 0,
    phaseIndex: 0,
    participants: [],      // 参加者のtokenId（順序は開始時点の記録。実際の手番順は都度計算する）
    acted: [],             // このラウンドで行動を終えたtokenId
    // 戦闘離脱したtokenId。手番決定（pickNextActor）・プロット提出の対象からは外れるが、
    // round.participants自体からは消さない（js/round-panel.jsの一覧に赤＋斜線で残す）。
    withdrawn: [],
    currentActorId: null,  // 現在手番のコマ（kind:'perCharacter'かつstep:'act'のときだけ非null）
    step: 'act',           // perCharacterフェーズ内のサブステップ。'preTurn'（イニシアチブプロセス）| 'act'
    interruptId: null,     // 次の手番に割り込ませるコマ（GM指定。手番が決まる時に1回で消費する）
    confirmation: { readyEntries: [] }, // 点呼/割り込み確認の「準備OK」一覧。[{userId, nickname}]
    // kind:'plot'のフェーズで各コマが伏せて出した数字 { [tokenId]: number }。
    // plotsRevealedがtrueになるまで画面は値を伏せる（ただし状態自体は全員へ配られる。
    // js/visibility.js冒頭の断り書きと同じ「うっかり見えない」レベル）。
    // プロットはラウンドごとに引き直すので、plotフェーズに入るたびにまとめてリセットする。
    plots: {},
    // 各コマのプロットを出したのが誰か { [tokenId]: localUserId }。公開前に値を見せてよい
    // 相手を決めるためだけに持つ（js/round-panel.jsのbuildPlotInputRow）。GMは他人のコマも
    // 操作できてしまうので、これが無いとGMの画面に全員の値が映る。
    plotSubmitters: {},
    // 1つのコマが2つ以上のプロットに出るとき（シノビガミの分身の術など）の、2つ目以降の枠。
    // { [tokenId]: [{ id, label, value, submitter }] }。value/submitterはplots/plotSubmittersと
    // 同じ意味で、値は同じように公開まで伏せる。
    // 【labelと「増えていること自体」は伏せない】プロットが増える原因（忍法など）は卓に公開
    // される情報なので、増えた枠が在ることは公開前でも全員に見せる。伏せるのは値だけ。
    plotExtras: {},
    // 公開後に持ち主が「このコマはどのプロットで動くか」を決めた結果 { [tokenId]: 'main' | slotId }。
    // キーが無い＝未選択。選ぶまでは行動順もコスト上限も未確定として扱う（resolvedPlotSlot）。
    // 追加の枠を持たないコマはここに載らない（mainしか無いので選ぶ余地がない）。
    plotChoice: {},
    plotsRevealed: false
  };
}

// 保存済み・同期されてきたround状態に欠けているキーを補う（hydrate専用）。
// turnIndex方式で保存された古い状態は、そのインデックスまでを行動済みと見なして
// 新しいモデルへ読み替える（進行中の部屋を壊さないため）。
export function normalizeRoundState(round) {
  if (!round) return createInitialRoundState();

  const base = createInitialRoundState();
  const participants = round.participants || [];

  // 新形式（actedを持つ）ならそのまま。旧形式ならturnIndexから作り直す。
  const migrated = round.acted
    ? {}
    : {
      acted: participants.slice(0, round.turnIndex || 0),
      currentActorId: participants[round.turnIndex || 0] || null,
      step: 'act'
    };

  const next = {
    ...base,
    ...round,
    ...migrated,
    participants,
    // 値がundefinedのキーもスプレッドで既定値を上書きしてしまうので、参照される
    // まとまりだけは最後に埋め直す（round-panel.jsがreadyEntriesを直接読むため）
    confirmation: round.confirmation || base.confirmation,
    // プロット機能より前の状態にはキーが無い。round-panel.jsが直接Object.entriesするので
    // confirmationと同じく埋め直す。
    plots: round.plots || base.plots,
    plotSubmitters: round.plotSubmitters || base.plotSubmitters,
    // 増やしたプロット枠（plotExtras/plotChoice）より前の状態にはキーが無い。上と同じ理由で埋め直す。
    plotExtras: round.plotExtras || base.plotExtras,
    plotChoice: round.plotChoice || base.plotChoice,
    // 戦闘離脱機能より前の状態にはキーが無い。上と同じ理由で埋め直す。
    withdrawn: round.withdrawn || base.withdrawn
  };
  delete next.turnIndex; // 旧キーは残さない（参照元が無いのに値だけ残ると誤読の元になる）
  return next;
}

/**
 * プラグインの自動計算（applyPluginDerivedParameters）へ渡す「コマ自身の外から決まる値」。
 * 今はラウンド進行の事実だけ。Coreは意味を決めず、プラグイン側が解釈する
 * （シノビガミはこれを見てファンブル値を出す）。
 *
 * 【公開前のプロットは渡さない】パラメータは全員へ同期されるので、公開前の値を渡すと
 * 伏せたはずのプロットが誰にでも読めてしまう（js/round-panel.jsで画面から隠している意味が
 * 無くなる）。ここで塞いでおけば、プラグイン側が気を付けなくても漏れない。
 */
export function buildDerivedContext(round, tokenId) {
  const plotsRevealed = !!round?.plotsRevealed;
  // 【プロットを増やしていて、まだどれで動くか選ばれていないコマはnullを渡す】
  // resolvedPlotSlotがnullを返すので、プラグイン側は「平常時・未提出・公開前」と同じ扱いになる
  // （シノビガミなら忍法コストの上限が掛からず、ファンブル値も2に戻る）。上限を決める材料が
  // まだ無いのだから、どちらか一方を勝手に当てはめるより制限しないほうが卓の実態に合う。
  const plot = plotsRevealed && round ? resolvedPlotSlot(round, tokenId)?.value : undefined;
  const active = !!round?.active;
  return {
    tokenId: tokenId ?? null,
    roundActive: active,
    // 何ラウンド目か（進行していないときは0）。プラグイン側が「この記録は今のラウンドの
    // ものか」を見分けるために使う（シノビガミの忍法コストの合計は、番号が変われば0から
    // 数え直す）。プロットと違い伏せる値ではないので、そのまま渡してよい。
    roundNumber: active ? (round?.roundNumber || 0) : 0,
    plotValue: Number.isFinite(plot) ? plot : null,
    plotsRevealed
  };
}

/**
 * ラウンド進行が動いた後に、参加者の自動計算をやり直す。
 * 普段の自動計算はそのコマ自身が変わった時（パラメータ・components）に走るが、
 * プロットの公開やラウンドの終了はコマを触らないまま計算の前提を変えるので、
 * ここから明示的に引き直す必要がある。
 * @param {object} tokensState 作業用コピー（patchCharacterで書き換えてよいもの）
 * @param {object} round 反映後のラウンド状態
 */
export function recomputeDerivedForRound(tokensState, activePlugin, round) {
  if (!activePlugin) return;

  (round?.participants || []).forEach(id => {
    const character = tokensState[id];
    if (!character) return;
    const parameters = applyPluginDerivedParameters(
      activePlugin, character.parameters, character.components, buildDerivedContext(round, id)
    );
    if (parameters !== character.parameters) patchCharacter(tokensState, id, { parameters });
  });
}

/**
 * フェーズに入るときの、プラグイン固有のパラメータ操作を適用する
 * （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。
 *
 * 何を動かすかはプラグインが決め（applyPluginRoundPhaseStart、js/parameters/registry.js）、
 * Coreは返ってきた値を基礎値へ書くだけ。手入力ではないのでwithEditableParamFieldsではなく
 * withParamFieldsを通す：editable:falseのパラメータでも、プラグイン自身の宣言なら動かしてよい
 * （SET_PARAMETERのガードは「利用者の手入力」を止めるためのもの）。
 *
 * @param {object} tokensState 作業用コピー（patchCharacterで書き換えてよいもの）
 * @param {object} round 反映後のラウンド状態
 * @returns {string} チャットへ足す1行（無ければ空文字）
 */
export function applyRoundPhaseStart(tokensState, activePlugin, phase, round) {
  if (!activePlugin) return '';

  const result = applyPluginRoundPhaseStart(activePlugin, phase, {
    tokens: tokensState,
    participants: round?.participants || [],
    roundNumber: round?.roundNumber || 0
  });

  (result?.changes || []).forEach(({ tokenId, paramId, value }) => {
    const character = tokensState[tokenId];
    if (!character) return;
    const parameters = withParamFields(character.parameters, paramId, { value });
    if (parameters) patchCharacter(tokensState, tokenId, { parameters });
  });

  return result?.logText || '';
}

// ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。
export function sortByInitiative(tokensState, participantIds) {
  return [...participantIds].sort((a, b) => {
    const tokenA = tokensState[a];
    const tokenB = tokensState[b];
    const initA = tokenA ? (getEffectiveParameterValue(tokenA, 'core:initiative') ?? 0) : 0;
    const initB = tokenB ? (getEffectiveParameterValue(tokenB, 'core:initiative') ?? 0) : 0;
    return initB - initA;
  });
}

// 今このラウンドで手番順の根拠になっているフェーズ（turnOrderを宣言したperCharacterフェーズ）。
// プロットの段にいる間も「公開後の手番順」を先に見せたいので、現在のphaseIndexではなく
// テンプレート全体から探す。
// 戻り値は 'initiative' | 'plot' | { paramId, direction }（sortForTurnOrder参照）。
export function turnOrderSourceOf(round) {
  const template = round.template || [];
  return template.find(phase => phase.kind === 'perCharacter')?.turnOrder || 'initiative';
}

/**
 * このコマのプロット枠の一覧。先頭が元からある枠（slotId:'main'）で、以降が
 * 「選択を増やす」で足した枠（round.plotExtras）。
 *
 * 【プロットを読む口はここ一本にする】plotsとplotExtrasを呼び出し側で足し合わせると、
 * 画面・ログ・並べ替えのどれかが片方を見落として食い違う。増やした枠が無いコマでも
 * 必ず長さ1の配列が返るので、呼び出し側は枠の数を気にしなくてよい。
 *
 * @returns {Array<{slotId:string, label:string|null, value:number|undefined, submitter:string|null}>}
 *   labelはmainならnull、追加の枠なら持ち主が付けた名前（未入力ならnull）。
 */
export function listPlotSlots(round, tokenId) {
  const main = {
    slotId: 'main',
    label: null,
    value: round?.plots?.[tokenId],
    submitter: round?.plotSubmitters?.[tokenId] ?? null
  };
  const extras = (round?.plotExtras?.[tokenId] || []).map(extra => ({
    slotId: extra.id,
    label: extra.label || null,
    value: extra.value,
    submitter: extra.submitter ?? null
  }));
  return [main, ...extras];
}

/**
 * このコマが「結局どのプロットで動くか」。
 *   増やした枠が無い     → main（従来どおり）
 *   選択済み             → 選ばれた枠
 *   増やしたのに未選択   → null（未確定）
 * 選択が消えた枠を指していた場合（枠を消した後など）も未選択として扱う。
 */
export function resolvedPlotSlot(round, tokenId) {
  const slots = listPlotSlots(round, tokenId);
  if (slots.length === 1) return slots[0];
  const chosen = round?.plotChoice?.[tokenId];
  return slots.find(slot => slot.slotId === chosen) || null;
}

// プロットを増やしていて、まだどれで動くか選ばれていないか。画面の印と提出状況の行で使う。
export function hasUnchosenPlot(round, tokenId) {
  return listPlotSlots(round, tokenId).length > 1 && !resolvedPlotSlot(round, tokenId);
}

// 手番順の根拠にするプロットの値。未提出は最下位に落とす（提出した人が先に動く）。
// 【未選択のコマは枠の最大値で仮置きする】どれで動くか決まっていない間も手番順のリストには
// 出さないといけない。一番早い位置に置いておけば、選び終える前に手番が来てしまっても
// 「まだ選んでいない」と気付ける（遅い位置に置くと、気付く前に飛ばされる）。
export function plotValueOf(round, tokenId) {
  const resolved = resolvedPlotSlot(round, tokenId);
  const values = (resolved ? [resolved] : listPlotSlots(round, tokenId))
    .map(slot => slot.value)
    .filter(Number.isFinite);
  return values.length > 0 ? Math.max(...values) : -Infinity;
}

/**
 * 手番順の並べ替え。turnOrderが'plot'ならプロット値の降順、パラメータの宣言
 * （{ paramId, direction }）ならその実効値の昇順、それ以外は従来どおり
 * core:initiativeの実効値の降順。
 *
 * プロットが同値のときは、ルール上は同時処理でも卓の運用では順番が要る（判定の準備が
 * できていない人がいる）。そこで便宜上の順番として core:initiative の降順 → それも同値なら
 * participants の並び（開始時のイニシアチブ順で固定）で決める。どちらも全員が見られる値なので、
 * 誰が先かは公開された時点で確定し、振り直しでは変わらない。
 * この既定を覆したいときはGMが「次の手番に割り込ませる」（ROUND_SET_INTERRUPT）で指名する。
 */
export function sortForTurnOrder(tokensState, round, participantIds) {
  const source = turnOrderSourceOf(round);

  // パラメータ順（ドラクルージュの「道」）。Coreはその数値が何を表すかを知らず、
  // 小さい順に並べるだけ。意味はプラグインがcomputeDerivedParametersで詰める。
  //
  // 先にイニシアチブ降順へ並べてから安定ソートで並べ直すので、**同値はイニシアチブ降順のまま
  // 残る**。順位を粗く振れば「この群はイニシアチブ順」を宣言なしに表現できる
  // （ドラクルージュのNPCが全員同じ順位で、その中はイニシアチブ順、というのがこれ）。
  if (source?.paramId) {
    const sign = source.direction === 'desc' ? -1 : 1;
    const valueOf = (id) => {
      const token = tokensState[id];
      const value = token ? getEffectiveParameterValue(token, source.paramId) : null;
      // 読めないコマ（そのパラメータを持たない）は最後尾。手番が消えるより後ろに回るほうが軽い
      return Number.isFinite(value) ? value : Infinity;
    };
    return sortByInitiative(tokensState, participantIds)
      .sort((a, b) => sign * (valueOf(a) - valueOf(b)));
  }

  // 公開前にプロット順で並べると、値を伏せていても並び順から大小が読めてしまう
  // （手番順の詳細リストは全員に見えている）。公開されるまでは従来の並びのままにする。
  if (source !== 'plot' || !round.plotsRevealed) {
    return sortByInitiative(tokensState, participantIds);
  }

  const byInitiative = sortByInitiative(tokensState, participantIds);
  const tieBreak = new Map(byInitiative.map((id, index) => [id, index]));
  return byInitiative.sort((a, b) => {
    const diff = plotValueOf(round, b) - plotValueOf(round, a);
    if (diff !== 0) return diff;
    return tieBreak.get(a) - tieBreak.get(b);
  });
}

// 増やした枠に付ける名前。空欄は「未入力」としてnullに寄せ（describePlotSlotNameが
// 「2つ目」で埋める）、長すぎる入力は詰める（提出欄も手番順の行も1行に収めたいため）。
export const PLOT_SLOT_LABEL_MAX = 20;

export function normalizePlotSlotLabel(label) {
  const text = String(label ?? '').trim();
  return text ? text.slice(0, PLOT_SLOT_LABEL_MAX) : null;
}

/**
 * 枠の表示名。元からある枠はコマ名そのまま、増やした枠は「コマA（影法師）」。
 * 名前が未入力なら出た順で「（2つ目）」と埋める（名前を書かなくても行を見分けられるように）。
 * 画面とログで同じ文言にしたいので、ここ一本に寄せる。
 */
export function describePlotSlotName(tokenName, slot, slotIndex) {
  if (!slot || slot.slotId === 'main') return tokenName;
  return `${tokenName}（${slot.label || `${slotIndex + 1}つ目`}）`;
}

/**
 * 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。
 * どれで動くか選び終えたコマ（と枠を増やしていないコマ）は今までどおり1行で、
 * 未選択のコマだけ枠の数だけ行に増える。
 *
 * 並びは枠の値の降順。同値のときは渡されたコマ順（sortForTurnOrderが決めた便宜上の順番）を
 * そのまま保つので、画面の並びとログの並びが食い違わない。
 *
 * 【公開後に呼ぶこと】公開前は値が伏せられているので、これで並べると順序から大小が読める。
 * @returns {Array<{tokenId, slotId, key, name, value, unchosen}>}
 */
export function listPlotSlotRows(tokensState, round, tokenIds) {
  const rank = new Map(tokenIds.map((id, index) => [id, index]));
  const rows = [];

  tokenIds.forEach(tokenId => {
    const tokenName = tokensState?.[tokenId]?.name || '？';
    const resolved = resolvedPlotSlot(round, tokenId);
    listPlotSlots(round, tokenId).forEach((slot, index) => {
      if (resolved && slot.slotId !== resolved.slotId) return;
      rows.push({
        tokenId,
        slotId: slot.slotId,
        key: plotSlotKey(tokenId, slot.slotId),
        name: describePlotSlotName(tokenName, slot, index),
        value: slot.value,
        unchosen: !resolved
      });
    });
  });

  return rows.sort((a, b) => {
    const av = Number.isFinite(a.value) ? a.value : -Infinity;
    const bv = Number.isFinite(b.value) ? b.value : -Infinity;
    if (av !== bv) return bv - av;
    return rank.get(a.tokenId) - rank.get(b.tokenId);
  });
}

// 同値の判定で使う枠のキー。画面の行1つに対応する（js/round-panel.jsの詳細リスト）。
export function plotSlotKey(tokenId, slotId) {
  return slotId && slotId !== 'main' ? `${tokenId}:${slotId}` : tokenId;
}

/**
 * プロットが同値（同じ値を出した相手がいる）の枠のキー。ルール上は同時処理なので、
 * 画面とログで印を付けて卓に知らせるために使う（手番自体は便宜上の順番で回す）。
 *
 * 【同じコマの枠どうしは同値と数えない】1体が2つの枠に同じ数字を出しても、動くのは
 * どちらか一方だけなので「同時処理」は起きない。数えてしまうと自分自身と同時扱いになる。
 * 未選択のコマは全部の枠を、選択済みのコマは選ばれた枠だけを数に入れる。
 */
export function listTiedPlotSlotKeys(round) {
  const byValue = new Map();
  (round.participants || []).forEach(tokenId => {
    const resolved = resolvedPlotSlot(round, tokenId);
    (resolved ? [resolved] : listPlotSlots(round, tokenId)).forEach(slot => {
      if (!Number.isFinite(slot.value)) return;
      byValue.set(slot.value, [...(byValue.get(slot.value) || []), { tokenId, slotId: slot.slotId }]);
    });
  });

  const tied = [];
  byValue.forEach(entries => {
    const owners = new Set(entries.map(entry => entry.tokenId));
    if (owners.size < 2) return; // 同じコマの枠が並んでいるだけ
    entries.forEach(entry => tied.push(plotSlotKey(entry.tokenId, entry.slotId)));
  });
  return tied;
}

// 同値の枠を持つコマのid（重複なし）。ログの「同値: …」と、枠を増やしていない
// コマの行の印に使う。
export function listTiedPlotTokenIds(round) {
  const keys = new Set(listTiedPlotSlotKeys(round));
  return (round.participants || []).filter(tokenId =>
    listPlotSlots(round, tokenId).some(slot => keys.has(plotSlotKey(tokenId, slot.slotId)))
  );
}

// まだこのラウンドで行動していない参加者を、手番順で返す。
// 呼ばれるたびに並べ替え直すので、バフ/デバフで行動値が変わっていれば次の手番の順序に
// そのまま反映される（＝「イニシアチブプロセスで順番を計算し直す」の実体）。
export function listUnactedParticipants(tokensState, round) {
  const acted = round.acted || [];
  const withdrawn = round.withdrawn || [];
  return sortForTurnOrder(tokensState, round,
    round.participants.filter(id => !acted.includes(id) && !withdrawn.includes(id)));
}

// 次に手番を得るコマ。割り込み指定が最優先で、無ければ未行動者のうち行動値が最大のもの。
// 割り込み指定されたコマはROUND_SET_INTERRUPT側でactedから外してあるので、ここでは
// 「参加者として残っているか」だけを確かめればよい。誰も残っていなければnull。
// 離脱者はROUND_SET_WITHDRAWN側で割り込み予約も一緒に外すので通常は起きないが、
// 二重の安全策として離脱済みのコマは割り込み優先の対象からも除く。
export function pickNextActor(tokensState, round) {
  const withdrawn = round.withdrawn || [];
  if (round.interruptId && round.participants.includes(round.interruptId)
    && !withdrawn.includes(round.interruptId)) return round.interruptId;
  return listUnactedParticipants(tokensState, round)[0] || null;
}

// フェーズに入るときのサブステップを決める。イニシアチブプロセスを挟む設定で、かつ
// そのフェーズが「手番の前に挟む段」を宣言しているときだけ'preTurn'から始める。
export function initialStepForPhase(phase, useInitiativeProcess) {
  return (useInitiativeProcess && phase?.kind === 'perCharacter' && phase.preTurnStep) ? 'preTurn' : 'act';
}

// ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。
export function joinTokenNames(tokensState, ids) {
  return ids.map(id => tokensState[id]?.name || id).join('、');
}
