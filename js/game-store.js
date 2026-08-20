// js/game-store.js
// 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない
// 純粋なモジュール。ブラウザ（board-data-driven.js経由）とNode（server/index.js）の
// 両方からimportして、同じreducerを共有するために切り出している。

import { EventBus } from './EventBus.js';
import { buildDefaultParameters, buildDefaultRoomParameters } from './parameters/core.js';
import {
  buildCharacterParametersForPlugin, buildRoomParameters, listPlugins, applyPluginDerivedParameters,
  withPluginParameterDeclarations,
  applyPluginDerivedRoomParameters, getRoundPhaseTemplate, resetPluginComponentsOnPhaseEnd,
  applyPluginRoundPhaseStart
} from './parameters/registry.js';
// スタンプの集計（COUNT_STAMP）で「その部屋に実在するスタンプか」を確かめるためだけに使う。
import { findStamp } from './stamp-registry.js';

// スタンプの集計1件（1人ぶん）が取りうる上限。桁あふれした値を書き込まれても表示が
// 壊れないようにするための歯止めで、実際の使用でここに届くことは想定していない。
const MAX_STAMP_COUNT = 1_000_000;

// Core自身のルーム変数「現在のラウンド」（js/parameters/core.js）のID。
const ROUND_ROOM_PARAM_ID = 'core:round';

/**
 * Coreのルーム変数を、今のラウンド進行の状態に合わせる。
 * プラグインの自動計算（computeDerivedRoomParameters）と同じ「材料から導く値」で、
 * 進行していない間は0。この機能より前に作られた部屋にはそもそも変数が無いので、
 * 無ければここで作る（registry.jsのwithMissingPluginRoomParametersと同じ狙い）。
 * 変化が無ければ同じ参照を返す。
 */
function withCoreRoomParameters(parameters, round) {
  const roundNumber = round?.active ? (round.roundNumber || 0) : 0;

  const current = parameters[ROUND_ROOM_PARAM_ID];
  if (current && current.value === roundNumber) return parameters;

  const base = current || buildDefaultRoomParameters()[ROUND_ROOM_PARAM_ID];
  return { ...parameters, [ROUND_ROOM_PARAM_ID]: Object.freeze({ ...base, value: roundNumber }) };
}

/**
 * 「部屋全体から決まるルーム変数」を計算し直したroomを返す（Coreの現在のラウンド、
 * ステラナイツのブーケ合計）。プラグイン側の分は何を計算するかをプラグイン
 * （computeDerivedRoomParameters）が決め、Coreは材料を渡すだけで中身を解釈しない。
 * 変化が無ければ同じroomの参照を返す。
 *
 * 呼ぶのは「材料が変わりうるところ」すべて：ラウンド進行（ROUND_PROGRESSION_START・
 * ROUND_ADVANCE_PHASE・ROUND_PROGRESSION_END）、スタンプの集計（COUNT_STAMP・
 * RESET_STAMP_COUNTS）、システムの切り替え（SET_ACTIVE_PLUGIN）、そして状態の丸ごと
 * 差し替え（hydrate）。hydrateでも通すのが肝で、こうしておくとルーム変数は常に
 * 材料から導かれた値になり、単独でズレたまま残ることがない。
 */
function withDerivedRoomParameters(room, stampCounts, round) {
  const parameters = applyPluginDerivedRoomParameters(
    room?.activePlugin ?? null,
    withCoreRoomParameters(room?.parameters || {}, round),
    { stampCounts: stampCounts || {} }
  );
  // プラグイン未適用のときはapplyPluginDerivedRoomParametersが素通しで返すので、
  // withCoreRoomParametersが作った新しいオブジェクトはここで凍らせる。
  return parameters === room.parameters ? room : { ...room, parameters: Object.freeze(parameters) };
}

export { listPlugins };

export const DEFAULT_TOKEN_COLOR = 'transparent';

let tokenIdCounter = 0;

export function generateTokenId() {
  tokenIdCounter += 1;
  return `token-user-${Date.now()}-${tokenIdCounter}`;
}

let panelIdCounter = 0;

export function generatePanelId() {
  panelIdCounter += 1;
  return `panel-user-${Date.now()}-${panelIdCounter}`;
}

let cardIdCounter = 0;

export function generateCardId() {
  cardIdCounter += 1;
  return `card-user-${Date.now()}-${cardIdCounter}`;
}

let deckIdCounter = 0;

export function generateDeckId() {
  deckIdCounter += 1;
  return `deck-user-${Date.now()}-${deckIdCounter}`;
}

let deckTemplateIdCounter = 0;

// デッキの定義（room.deckTemplates）のid。盤面に置いた山札のidとは別物。
export function generateDeckTemplateId() {
  deckTemplateIdCounter += 1;
  return `decktpl-${Date.now()}-${deckTemplateIdCounter}`;
}

let buffIdCounter = 0;

export function generateBuffId() {
  buffIdCounter += 1;
  return `buff-user-${Date.now()}-${buffIdCounter}`;
}

let plotSlotIdCounter = 0;

// 1つのコマに増やしたプロット選択（round.plotExtras）のid。
// 【リデューサーの中で採番してはいけない】リデューサーはクライアント（楽観適用）と
// サーバーの両方で走るので、中で作るとidが食い違って以後の操作が相手に効かなくなる。
// generateBuffIdと同じく、呼び出し側で作ってpayloadに載せること。
export function generatePlotSlotId() {
  plotSlotIdCounter += 1;
  return `plotslot-${Date.now()}-${plotSlotIdCounter}`;
}

let infoEntryIdCounter = 0;

export function generateInfoEntryId() {
  infoEntryIdCounter += 1;
  return `info-user-${Date.now()}-${infoEntryIdCounter}`;
}

let infoSectionIdCounter = 0;

export function generateInfoSectionId() {
  infoSectionIdCounter += 1;
  return `info-section-${Date.now()}-${infoSectionIdCounter}`;
}

// バフ/デバフの終了条件（フェーズ）のラベル。ログ表示・チャットコマンド解釈の両方で使う。
export const BUFF_PHASE_LABELS = { scene: 'シーン', round: 'ラウンド', scenario: 'シナリオ', check: '判定', process: 'プロセス' };

// 終了フェーズの入れ子構造（外側→内側）。上位フェーズが終了したら、その内側は
// すべて終了したものとして扱う（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）。
export const PHASE_HIERARCHY = ['scenario', 'scene', 'round', 'process', 'check'];

// 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。
// 階層に無いフェーズ（将来の追加分）は自分自身だけを返し、従来どおりの単独処理になる。
export function getPhaseChain(phase) {
  const index = PHASE_HIERARCHY.indexOf(phase);
  return index < 0 ? [phase] : PHASE_HIERARCHY.slice(index);
}

// このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。
// EXPIRE_BUFFSを1コマ分で撃つときは、そのロール自身のログへ結果を併記するため、
// 「これから何が消えるか」を撃つ前に取っておく必要がある。
export function listExpiringBuffNames(token, phase) {
  const chain = getPhaseChain(phase);
  return (token?.buffs || [])
    .filter(b => chain.includes(b.expirePhase))
    .map(b => b.name);
}

// 上の一覧を、判定結果などのログ本文へ足す1行にする。消えるものが無ければ空文字。
// 独立したシステム発言にせず本文へ足すのは、ロールのたびにログが2行進むと
// 直前の結果が流れてしまうため。
export function formatExpiredBuffsNote(names, phase) {
  if (names.length === 0) return '';
  return `\n${BUFF_PHASE_LABELS[phase] || phase}終了で消滅: ${names.join('、')}`;
}

// ラウンド進行（Core機能）の初期状態。未開始（active:false）がデフォルト。
// 手番は「participants内のインデックス」ではなく「まだ行動していない人の集合」で表す。
// こうしておくと、行動済みを取り消して手番を回復させたり、順番を無視して割り込ませたりが
// 単なる集合の出し入れで済む（pickNextActor参照）。
function createInitialRoundState() {
  return {
    active: false,
    template: null,   // 開始時にスナップショットするフェーズ配列（parameters/registry.jsのgetRoundPhaseTemplate参照）
    roundNumber: 0,
    phaseIndex: 0,
    participants: [],      // 参加者のtokenId（順序は開始時点の記録。実際の手番順は都度計算する）
    acted: [],             // このラウンドで行動を終えたtokenId
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
function normalizeRoundState(round) {
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
    plotChoice: round.plotChoice || base.plotChoice
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
function buildDerivedContext(round, tokenId) {
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
function recomputeDerivedForRound(tokensState, activePlugin, round) {
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
function applyRoundPhaseStart(tokensState, activePlugin, phase, round) {
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

// 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。
// この機能より前の状態にはキーが無いので、必ずこのヘルパ経由で読む。
export function usesInitiativeProcess(state) {
  return state?.room?.roundSettings?.useInitiativeProcess === true;
}

// 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。
// 既定は有効。この機能より前の状態にはキーが無いが、その場合も有効として扱いたいので
// usesInitiativeProcessとは逆に「falseの場合だけ無効」の形で読む。
export function showsEntryMessages(state) {
  return state?.room?.showEntryMessages !== false;
}

// 指定フェーズ(phase: 'scene'|'round'|'scenario'|'check'|'process')の終了条件を持つバフ/デバフを
// トークンから取り除く。フェーズは完全一致で見る（入れ子の連鎖は呼び出し元のapplyPhaseEndが
// フェーズを1段ずつ渡すことで表現する）。
// onlyTokenIdを指定すると、そのコマだけを対象にする（「このコマが判定を1回行った」のように、
// 部屋全体ではなく1人分だけフェーズが終わる場合に使う）。
function removeExpiredBuffs(tokensState, phase, onlyTokenId = null) {
  const nextTokens = { ...tokensState };
  const removedNames = [];
  const targetIds = onlyTokenId
    ? (nextTokens[onlyTokenId] ? [onlyTokenId] : [])
    : Object.keys(nextTokens);
  targetIds.forEach(tokenId => {
    const character = nextTokens[tokenId];
    const buffs = character.buffs || [];
    const remaining = buffs.filter(b => {
      if (b.expirePhase === phase) {
        removedNames.push(`${character.name}:${b.name}`);
        return false;
      }
      return true;
    });
    if (remaining.length !== buffs.length) {
      nextTokens[tokenId] = Object.freeze({ ...character, buffs: Object.freeze(remaining) });
    }
  });
  return { nextTokens, removedNames };
}

// removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents
// （DX3ならエフェクトの使用回数）もリセットする。バフの期限切れとは別関心事のため、
// Core側はactivePluginへの委譲だけを担い、中身の意味はプラグイン側に委ねる
// （resetPluginComponentsOnPhaseEnd、js/parameters/registry.js参照）。
// onlyTokenIdの意味はremoveExpiredBuffsと同じ（対象を1コマに絞る）。
function resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null) {
  const nextTokens = { ...tokensState };
  const targets = onlyTokenId
    ? (nextTokens[onlyTokenId] ? [[onlyTokenId, nextTokens[onlyTokenId]]] : [])
    : Object.entries(nextTokens);
  targets.forEach(([id, character]) => {
    const nextComponents = resetPluginComponentsOnPhaseEnd(activePlugin, character.components, phase);
    if (nextComponents !== character.components) {
      nextTokens[id] = Object.freeze({ ...character, components: nextComponents });
    }
  });
  return nextTokens;
}

// 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。
// パラメータが存在しないtokenId/paramIdの組み合わせではundefinedを返す（＝呼び出し側は無視すればよい）。
// baseとなるparameters[paramId].value自体は書き換えない。SET_PARAMETERや「+パラメータ(n)」
// コマンドのような直接編集は常に基礎値を対象にする（実効値を対象にすると編集の度にバフ分が
// 基礎値へ混入し、加算が二重になってしまうため）。
export function getEffectiveParameterValue(token, paramId) {
  const param = token?.parameters?.[paramId];
  if (!param) return undefined;

  // 文字列値のカスタム変数にはバフ加算の意味がない（"abc" + 0 が文字列連結になり
  // 値が壊れる）ため、数値でない場合は基礎値をそのまま返す。
  if (typeof param.value !== 'number') return param.value;

  const buffTotal = (token.buffs || [])
    .filter(b => b.paramId === paramId)
    .reduce((sum, b) => sum + b.delta, 0);

  return param.value + buffTotal;
}

// 既定のチャットタブ。人が喋る場所で、タブ列の先頭に常に存在する。
export const MAIN_CHAT_TAB_ID = 'main';

// システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。
// 入室・フェーズ終了に伴うバフ消滅・BGMの切り替えだけをここへ流す：どれも卓の流れとは
// 独立していて、Mainに挟まると盤面下のカレントチャット欄（Mainの最新1件だけを映す）が
// 埋まり、直前の台詞が読めなくなるため。
//
// ラウンド進行・シーン開始・ログ消去は卓の流れとして読むものなのでMainに残す
// （withSystemLog）。どちらへ出すかは経路ごとに選ぶので、迷ったらMain側が既定。
// Mainと同じく常に存在し、削除・公開先変更・名前変更はできない（それぞれのcaseで弾く）。
export const SYSTEM_CHAT_TAB_ID = 'system';
export const SYSTEM_CHAT_TAB_NAME = 'システム';

// 音楽のチャンネル。BGMを流したまま効果音を重ねられるよう2枠に分けてある
// （js/audio-player.jsが枠ごとに1つずつAudio要素を持つ）。
export const AUDIO_CHANNELS = ['bgm', 'se'];

// チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。
export const AUDIO_CHANNEL_LABELS = { bgm: 'BGM', se: '効果音' };

// シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。
// nullは「BGMを変えない」なので、1つのフィールドで3通り（変えない/止める/この曲）を表す。
// 音源のidは必ず 'audio-' で始まる（js/main.jsの採番）ため、実在の曲と衝突しない。
export const SCENE_BGM_STOP = 'stop';

// --- dispatch内で繰り返し現れる更新パターンの共通処理 ---
// case側が「どのスライスをどう変えるか」だけを書けるようにするための道具立て。
// 凍結（Object.freeze）はここで面倒を見るので、case側は原則freezeを書かない。

// 作業用トークンマップ（dispatch冒頭のnextTokensState）の1コマだけを差し替える。
// このマップはdispatch内のローカルコピーなので、ここだけは直接書き換える。
function patchCharacter(tokensState, id, fields) {
  tokensState[id] = Object.freeze({ ...tokensState[id], ...fields });
}

// キー付きマップ（panels / room.originalTables / room.audioTracks / parameters等）の1件追加・更新。
function withMapEntry(map, key, value) {
  return Object.freeze({ ...map, [key]: value });
}

// 同じマップからの1件削除。
function withoutMapEntry(map, key) {
  const next = { ...map };
  delete next[key];
  return Object.freeze(next);
}

// パネルのマップを入れ子まで凍らせて写し取る（シーンの保存・適用で使う）。
// 通信やhydrate（JSON復元）を経た値は凍っていないので、状態へ入れる前にここを通す。
function freezePanelMap(panels) {
  return Object.freeze(Object.fromEntries(
    Object.entries(panels || {}).map(([id, panel]) => [id, Object.freeze({ ...panel })])
  ));
}

// 固定タブ（Main・システム）と、その空ログを必ず用意した chatTabs / chatLogs を返す。
// システムタブより前に保存された部屋にはタブ自体が無いので、読み込み時にここで足す
// （足さないと、システム発言の宛先が存在しないままADD_CHAT_MESSAGEに弾かれて消える）。
// 既にMainへ流れ終わった過去のシステム発言は動かさない（履歴は履歴のまま残す）。
// 並びはMainの直後。UI上は固定位置に出す（js/main.jsのrenderChatTabs）ので表示位置には
// 効かないが、ログの保存ダイアログ等はこの配列順で並べるため、人のタブより前に置く。
function withFixedChatTabs(chatTabs, chatLogs) {
  let tabs = Array.isArray(chatTabs) ? chatTabs.filter(tab => tab && typeof tab.id === 'string') : [];

  if (!tabs.some(tab => tab.id === MAIN_CHAT_TAB_ID)) {
    tabs = [Object.freeze({ id: MAIN_CHAT_TAB_ID, name: 'Main' }), ...tabs];
  }
  const systemTab = Object.freeze({ id: SYSTEM_CHAT_TAB_ID, name: SYSTEM_CHAT_TAB_NAME, audience: null });
  if (tabs.some(tab => tab.id === SYSTEM_CHAT_TAB_ID)) {
    // 既にある場合も名前・公開先はここで固定値へ揃える。取り込んだ部屋データ（信用しないJSON）に
    // 限定公開のシステムタブが入っていると、進行の通知が一部の人にしか届かなくなるため。
    tabs = tabs.map(tab => (tab.id === SYSTEM_CHAT_TAB_ID ? systemTab : tab));
  } else {
    const mainIndex = tabs.findIndex(tab => tab.id === MAIN_CHAT_TAB_ID);
    tabs = [...tabs.slice(0, mainIndex + 1), systemTab, ...tabs.slice(mainIndex + 1)];
  }

  const logs = { ...(chatLogs || {}) };
  tabs.forEach(tab => {
    if (!Array.isArray(logs[tab.id])) logs[tab.id] = [];
  });

  return { chatTabs: tabs, chatLogs: logs };
}

// BGMが切り替わったことをシステムタブへ1行残す（曲名、またはnextTrackId:nullで「停止」）。
// 音楽ダイアログの再生・停止ボタン、再生フレーズ、シーン遷移のどれで変わっても同じ1行になるよう、
// 経路ごとではなく「BGMの再生状態が変わったdispatch」の側から呼ぶ。
// 同じ曲を鳴らし直しただけ（playIdだけが変わる）のときは呼び出し側が呼ばない。
// 効果音はここでは扱わない：台詞に添えて鳴らすものなので、鳴らした人のタブへそのまま出す
// （js/main.jsのtriggerAudioPhrase）。
function withBgmLog(chatLogs, tracks, nextTrackId, time) {
  const text = nextTrackId
    ? `♪ ${AUDIO_CHANNEL_LABELS.bgm}: ${tracks?.[nextTrackId]?.name || '不明な音源'}`
    : `♪ ${AUDIO_CHANNEL_LABELS.bgm}を止めました。`;
  return withSystemTabLog(chatLogs, text, time);
}

// 指定タブのログへ1件追記した新しいchatLogsを返す。チャットログへ入る経路は全てここを通る
// （ADD_CHAT_MESSAGE・withSystemLog経由の各種システムログ）。
//
// timeは呼び出し側（dispatchのcase分岐）がpayload.timeから渡す値。js/net-sync.jsのdispatch
// ラッパが、送信者のローカル楽観適用・サーバーへの送信の両方より前にpayload.timeを一度だけ
// 確定させているため、送信者のローカル適用・サーバーの権威適用・他クライアントへの中継適用の
// どこでこの関数が呼ばれても、同じactionのpayloadが運ぶ同じ値をここで受け取ることになり、
// 参加者・サーバー全員で同じ時刻になる（entry自体やpayloadを書き換えて後段へ引き継ぐような
// 副作用には頼らない。game-store.jsは状態遷移ロジックだけを持つ純粋なモジュールとして保つ）。
// timeが渡されない（=confirmed値が無い）場合だけ、ここで一度Date.now()を補う。
function withChatEntry(chatLogs, tabId, entry, time) {
  const finalTime = Number.isFinite(time) ? time : Date.now();
  const nextEntries = Object.freeze([...(chatLogs[tabId] || []), Object.freeze({ ...entry, time: finalTime })]);
  return withMapEntry(chatLogs, tabId, nextEntries);
}

// システム発言（発言者が「システム」の1行）を指定タブへ1件追記する。
// EventBus経由の副作用にすると、同期される全クライアントでそれぞれ「受信→追記dispatch→
// 再送信」が走ってクライアント数だけログが重複するため、1回のdispatchで完結させている。
// timeはwithChatEntryと同じ扱い（呼び出し側のpayload.timeをそのまま渡す）。
function withSystemLogIn(chatLogs, tabId, text, time) {
  return withChatEntry(chatLogs, tabId, { system: SYSTEM_CHAT_TAB_NAME, resultText: text }, time);
}

// Mainタブへ出すシステム発言。ラウンド進行・シーン開始・ログ消去など、
// 卓の流れとしてその場で読むもの。システム発言の既定の宛先はこちら。
function withSystemLog(chatLogs, text, time) {
  return withSystemLogIn(chatLogs, MAIN_CHAT_TAB_ID, text, time);
}

// システムタブへ出すシステム発言。入室・フェーズ終了に伴うバフ消滅・BGMの切り替えなど、
// 後から辿れれば十分で、卓の流れに挟まると邪魔になるもの（SYSTEM_CHAT_TAB_ID参照）。
function withSystemTabLog(chatLogs, text, time) {
  return withSystemLogIn(chatLogs, SYSTEM_CHAT_TAB_ID, text, time);
}

// パラメータマップ（コマのparameters / room.parameters）の1件を差し替える。
// 存在しないparamIdならnull（＝呼び出し側は何もしない）。
function withParamFields(params, paramId, fields) {
  const param = params[paramId];
  if (!param) return null;
  return withMapEntry(params, paramId, Object.freeze({ ...param, ...fields }));
}

// 上記の「手入力による直接編集」版。editable:falseのパラメータは弾く。
// labelは警告文の主語（'このパラメータ' / 'このルーム変数'）。
function withEditableParamFields(params, paramId, fields, label) {
  if (params[paramId]?.editable === false) {
    console.warn(`[Guard] ${label}は直接編集できません:`, paramId);
    return null;
  }
  return withParamFields(params, paramId, fields);
}

// パラメータ1件を削除する。locked（削除不可）は弾く。
function withoutParam(params, paramId, label) {
  const param = params[paramId];
  if (!param) return null;
  if (param.locked) {
    console.warn(`[Guard] ${label}は削除できません:`, paramId);
    return null;
  }
  return withoutMapEntry(params, paramId);
}

// 公開先(audience)を正規化する。null（＝全員に公開）か、参加者IDの配列にそろえる。
// 空配列は「全員に公開」へ丸めない：呼び出し側が配列を渡した以上は限定公開の意図なので、
// 中身が空でも公開範囲を広げる方向へは倒さない（不具合が情報漏れにならないようにする）。
function normalizeAudience(audience) {
  if (!Array.isArray(audience)) return null;
  return Object.freeze([...new Set(audience.filter(id => typeof id === 'string' && id !== ''))]);
}

// パネルの重なり順（stackOrder）を0以上の整数にそろえる。小さいほど下、大きいほど上。
// 未設定・数値でない・負値はすべて0になる。この項目より前に作られた部屋・シーン・
// 書き出しファイルのパネルにはキーが無いので、その既定値もこれが兼ねる（移行処理は不要）。
// 描画側（js/board-data-driven.js）も読むときに同じ関数を通す。片方だけ変えると、
// 状態に入っている値と画面上の重なりがずれるため。
export function normalizeStackOrder(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

// --- カード／デッキ（js/card-catalog.js・js/deck-dialog.js・js/board-data-driven.js） ---
// カードはパネルと同じ座標系（盤面ローカルのピクセル座標）・同じ重なり順の規則で盤面に
// 載るが、「裏のあいだは表面を出さない」「デッキから引く」という別の語彙を持つので
// スライスを分けてある（パネルはシーンに保存されるが、カード・デッキは保存されない、
// という扱いの違いもある。APPLY_SCENE参照）。
//
// 【秘匿の水準】裏向きのカードの表面(face)も、状態として全クライアントへ配られる。
// 隠しているのは描画だけで、開発者ツールを開けば読める（js/visibility.js冒頭・
// docs/plugin-guide.md 8.5と同じ「うっかり見えない」まで）。公開も閲覧も誰にでも
// 許す仕様なので、その前提で使うこと。

// カードの大きさ（マス数）。縦6×横4で固定する（トランプの縦横比3:2）。
export const CARD_COLS = 4;
export const CARD_ROWS = 6;

// カード・デッキの既定の重なり順。パネルの既定(0)より上＝パネルの上に乗る。
// コマ(z-index:10の.token)より手前に出ないことは、描画側の層(#panel-layer)が保証する。
export const DEFAULT_CARD_STACK_ORDER = 10;

// 一度に引ける枚数の上限。押し間違いで盤面がカードで埋まるのを防ぐだけの歯止め。
const MAX_DRAW_COUNT = 20;

// クライアントが自由に作れるpayload（ADD_DECK・取り込んだ部屋データ）に対する上限。
// 状態は全員へ配られ、Redisへも書き戻るので、ここが無いと1回のアクションで部屋を
// 太らせられる（MAX_STAMP_COUNTと同じ趣旨の歯止め）。
const MAX_DECK_CARDS = 200;
// カード名（画像が無いときにカードの中央へ出る文字）。トランプの「♠A」から
// タロットの「ワンドのナイト」までが収まる長さ。
const MAX_CARD_TEXT_LENGTH = 24;
// カード情報（パネルのテキストと同じ役目。表向きのときだけ読める）。
// 200枚×この長さが状態に載るので、パネルと違って上限を持たせてある。
const MAX_CARD_INFO_LENGTH = 300;
const MAX_CARD_IMAGE_LENGTH = 1000;
const MAX_CARD_COLOR_LENGTH = 32;
// 「見た人」(seenBy)の上限。参加者の数を超えることはないが、payloadは信用しない。
const MAX_CARD_SEEN_BY = 100;

// デッキの定義（room.deckTemplates）の上限。1行＝1種類のカードで、行ごとに枚数を持つ。
// 展開後の合計はMAX_DECK_CARDSで別に切る（expandDeckTemplate・ADD_DECK）。
const MAX_DECK_TEMPLATE_ROWS = 100;
const MAX_DECK_TEMPLATE_ROW_COUNT = 99;
const MAX_DECK_NAME_LENGTH = 40;

function clampCardText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// 画像URL。長すぎるもの・文字列でないものはnull（＝画像なし＝テキスト表示へ落ちる）。
function normalizeCardImage(image) {
  if (typeof image !== 'string' || image === '' || image.length > MAX_CARD_IMAGE_LENGTH) return null;
  return image;
}

// カードの表面。imageがあれば画像で描き、無い／読めないときはtext（カード名）をcolorで描く
// （js/board-data-driven.jsのapplyCardAppearance）。
// infoはカード情報で、パネルのテキストと同じくマウスオーバー・右クリックメニューで読ませる。
// 表面の一部なので、裏向きの間は描画側が一切出さない（この機能より前のカードには
// キーが無いので、ここで空文字を補う）。
function normalizeCardFace(face) {
  const source = (face && typeof face === 'object') ? face : {};
  return Object.freeze({
    image: normalizeCardImage(source.image),
    text: clampCardText(source.text, MAX_CARD_TEXT_LENGTH),
    info: clampCardText(source.info, MAX_CARD_INFO_LENGTH),
    color: clampCardText(source.color, MAX_CARD_COLOR_LENGTH) || null
  });
}

// カードの裏面。表面と違って文字は持たない（伏せた札は無地でよい）。
function normalizeCardBack(back) {
  const source = (back && typeof back === 'object') ? back : {};
  return Object.freeze({
    image: normalizeCardImage(source.image),
    color: clampCardText(source.color, MAX_CARD_COLOR_LENGTH) || null
  });
}

function normalizeSeenBy(seenBy) {
  if (!Array.isArray(seenBy)) return Object.freeze([]);
  const ids = [...new Set(seenBy.filter(id => typeof id === 'string' && id !== ''))];
  return Object.freeze(ids.slice(0, MAX_CARD_SEEN_BY));
}

// カード1枚を組み立てる。ADD_CARD・DRAW_CARDS・hydrateの3経路が必ずここを通るので、
// どこから入っても同じ形・同じ上限になる。
function buildCard({
  id, face, back, x = 0, y = 0, faceUp = false,
  stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [],
  stockerId = null, stockerSeq = 0
}) {
  return Object.freeze({
    id,
    x: Number(x) || 0,
    y: Number(y) || 0,
    cols: CARD_COLS,
    rows: CARD_ROWS,
    stackOrder: normalizeStackOrder(stackOrder),
    locked: !!locked,
    faceUp: !!faceUp,          // 表向きか。裏のあいだは描画側がfaceを出さない
    face: normalizeCardFace(face),
    back: normalizeCardBack(back),
    seenBy: normalizeSeenBy(seenBy), // 「カードを見る」で表面を確認した人（MARK_CARD_SEEN）
    deckId: typeof deckId === 'string' && deckId ? deckId : null, // 出自のデッキ
    // カードストッカー（isStockerのパネル）へ収納されているか。入っている間は盤面に
    // 描かれない（コマのinBackyardと同じ扱い）。実体はここに残るのでfaceやseenByは保たれる。
    stockerId: typeof stockerId === 'string' && stockerId ? stockerId : null,
    // 収納した順。ストッカーの中身を並べる唯一の根拠（パネル側にID配列を持たせると
    // カードやパネルの削除で2か所がずれるため、順番もカード側に持たせる）。
    stockerSeq: Math.max(0, Math.round(Number(stockerSeq) || 0))
  });
}

// デッキが持つ札の並び。先頭が一番上（引くのは先頭から）。IDの重複は落とす。
function normalizeDeckCards(cards) {
  if (!Array.isArray(cards)) return Object.freeze([]);

  const seen = new Set();
  const normalized = [];

  cards.forEach(card => {
    if (normalized.length >= MAX_DECK_CARDS) return;
    const id = card?.id;
    if (typeof id !== 'string' || id === '' || seen.has(id)) return;
    seen.add(id);
    normalized.push(Object.freeze({ id, face: normalizeCardFace(card.face) }));
  });

  return Object.freeze(normalized);
}

function buildDeck({
  id, name = '', x = 0, y = 0, back = null, cards = [],
  stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false
}) {
  return Object.freeze({
    id,
    name: clampCardText(name, MAX_DECK_NAME_LENGTH),
    x: Number(x) || 0,
    y: Number(y) || 0,
    cols: CARD_COLS,
    rows: CARD_ROWS,
    stackOrder: normalizeStackOrder(stackOrder),
    locked: !!locked,
    back: normalizeCardBack(back),
    cards: normalizeDeckCards(cards)
  });
}

// 保存済み・同期されてきたカード／デッキを、状態へ入れられる形へ均す（hydrate専用）。
// 取り込んだ部屋データ（信用しないJSON）もここを通るので、上限もまとめて掛かる。
function isNamedObjectEntry([id, value]) {
  return typeof id === 'string' && id !== '' && !!value && typeof value === 'object';
}

function normalizeCardMap(cards) {
  return Object.freeze(Object.fromEntries(
    Object.entries(cards || {})
      .filter(isNamedObjectEntry)
      .map(([id, card]) => [id, buildCard({ ...card, id })])
  ));
}

// 実在しないパネル（もう箱ではないパネルも含む）を指すstockerIdを外す。hydrate専用の安全網で、
// 位置は保存されていた(x,y)をそのまま使う（箱に入る前の場所なので、盤面のどこかには出る）。
function withoutLostStockerCards(cards, panels) {
  const entries = Object.entries(cards);
  const lost = entries.filter(([, card]) => card.stockerId && !panels?.[card.stockerId]?.isStocker);
  if (lost.length === 0) return cards;

  const next = { ...cards };
  lost.forEach(([id, card]) => {
    next[id] = Object.freeze({ ...card, stockerId: null, stockerSeq: 0 });
  });
  return Object.freeze(next);
}

function normalizeDeckMap(decks) {
  return Object.freeze(Object.fromEntries(
    Object.entries(decks || {})
      .filter(isNamedObjectEntry)
      .map(([id, deck]) => [id, buildDeck({ ...deck, id })])
  ));
}

// --- デッキの定義（room.deckTemplates） ---
// 「作り置きの設計図」。盤面に置かれた山札（state.decks）とは別物で、こちらは
// 1行＝1種類のカード＋枚数で持つ（同じ札が10枚あっても行は1つ）。
// デッキ作成UI（js/deck-editor-dialog.js）が書き、配置のときに1枚ずつへ展開する
// （js/card-catalog.jsのexpandDeckTemplate）。オリジナル表（room.originalTables）と
// 同じ「部屋のみんなで共有する作り置き」の置き場所。
function buildDeckTemplateCard(card, index) {
  const source = (card && typeof card === 'object') ? card : {};
  return Object.freeze({
    // 行のid。編集画面が行を識別するためのもので、盤面のカードのidとは別
    id: typeof source.id === 'string' && source.id ? source.id.slice(0, 64) : `row-${index}`,
    name: clampCardText(source.name, MAX_CARD_TEXT_LENGTH),
    count: Math.max(1, Math.min(MAX_DECK_TEMPLATE_ROW_COUNT, Math.round(Number(source.count) || 1))),
    text: clampCardText(source.text, MAX_CARD_INFO_LENGTH), // カード情報
    image: normalizeCardImage(source.image)
  });
}

function buildDeckTemplate({ id, name = '', back = null, cards = [] }) {
  const rows = Array.isArray(cards) ? cards.slice(0, MAX_DECK_TEMPLATE_ROWS) : [];
  return Object.freeze({
    id,
    name: clampCardText(name, MAX_DECK_NAME_LENGTH),
    back: normalizeCardBack(back),
    cards: Object.freeze(rows.map(buildDeckTemplateCard))
  });
}

function normalizeDeckTemplateMap(templates) {
  return Object.freeze(Object.fromEntries(
    Object.entries(templates || {})
      .filter(isNamedObjectEntry)
      .map(([id, template]) => [id, buildDeckTemplate({ ...template, id })])
  ));
}

// 引いたカードの置き場所。デッキの右へ1マス空けて並べ、既に同じ場所にカードがあれば
// 1段ずつ下へ逃がす（引いたカードが見えない位置に積み上がるのを防ぐ）。reducerが計算する
// ので、全員の画面で必ず同じ位置に出る。gridSizeは描画側の定数なのでpayloadで受け取る。
function findFreeCardSpot(cards, x, y, gridSize) {
  const step = (CARD_ROWS + 1) * gridSize;
  let spotY = y;

  for (let i = 0; i < 8; i += 1) {
    const taken = Object.values(cards).some(card => card.x === x && card.y === spotY);
    if (!taken) break;
    spotY += step;
  }

  return { x, y: spotY };
}

// --- カードストッカー（isStockerのパネル） ---
// カードをドラッグして収納できる箱。所有者を設定した箱は、入れる・見る・取り出すの
// すべてが所有者だけに限られる（設定しない箱は誰でも自由に使える）。
// 所有者の持ち方はコマのバックヤードと同じで、表示名を設定していれば参加者ID、
// ゲストならブラウザ単位のIDで持つ（MOVE_TO_BACKYARD参照）。
//
// 【秘匿の水準】所有者の箱でも、中のカードは状態として全員へ配られている。隠しているのは
// 画面の側だけで、開発者ツールを開けば読める（js/visibility.js冒頭と同じ「うっかり見えない」）。

/**
 * その人がこの箱を使ってよいか。所有者の設定が無い箱は誰でも使える。
 * 判定材料はすべてpayloadに載って配られるので、どのクライアントで再実行しても同じ答えになる。
 */
function stockerAllowsUser(panel, participantId, localUserId) {
  if (!panel?.isStocker) return false;
  if (!panel.stockerOwnerId && !panel.stockerOwnerLocalId) return true; // 所有者なし＝誰でも
  if (panel.stockerOwnerId) return !!participantId && panel.stockerOwnerId === participantId;
  return !!localUserId && panel.stockerOwnerLocalId === localUserId;
}

// 収納の順番。今ある最大＋1で、状態だけから決まる（reducerで時刻や乱数を使わない）。
function nextStockerSeq(cards) {
  return Object.values(cards).reduce((max, card) => Math.max(max, card.stockerSeq || 0), 0) + 1;
}

// ストッカーの中身を、入れた順に取り出す。
function listStockerCards(cards, panelId) {
  return Object.values(cards)
    .filter(card => card.stockerId === panelId)
    .sort((a, b) => a.stockerSeq - b.stockerSeq);
}

/**
 * 箱の中のカードを盤面へ出す。箱が消える・箱でなくなるすべての経路（REMOVE_PANEL、
 * ストッカー解除、シーンでのパネル総入れ替え）から通す。ここを通さないと、
 * 消えたパネルを指したままのカードがどこにも描かれない迷子になる。
 *
 * @param {object} cards state.cards
 * @param {object} panel 消える（箱でなくなる）パネル。位置の基準に使う
 * @param {number} gridSize 描画側のマスの大きさ（payloadで受け取る。DRAW_CARDS参照）
 */
function releaseStockerCards(cards, panel, gridSize) {
  const stored = listStockerCards(cards, panel?.id);
  if (stored.length === 0) return cards;

  const grid = Math.max(1, Math.round(Number(gridSize) || 25));
  let next = cards;

  stored.forEach((card, index) => {
    // 箱の右へ1枚ずつ。既に埋まっていれば1段下へ逃がす（DRAW_CARDSと同じ並べ方）
    const baseX = (panel.x || 0) + (CARD_COLS + 1) * grid * (index + 1);
    const spot = findFreeCardSpot(next, baseX, panel.y || 0, grid);
    next = withMapEntry(next, card.id, Object.freeze({
      ...card, stockerId: null, stockerSeq: 0, x: spot.x, y: spot.y
    }));
  });

  return next;
}

// 値がundefinedのキーを落とす。既存オブジェクトへの部分更新をスプレッドで作るとき、
// undefinedが混ざると「指定なし」ではなく「その値で上書き」になってしまうのを防ぐ。
function definedFields(patch) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

// 情報（infoEntries）のsection1件を作る／整える。audienceの正規化をここへ集約し、
// 追加・更新のどちらの経路を通っても同じ形になるようにする。
function buildInfoSection({ id, label = '', body = '', audience = null }) {
  return Object.freeze({
    id,
    label: label || '',
    body: body || '',
    audience: normalizeAudience(audience)
  });
}

// 保存済み・読み込まれた情報（infoEntries）の形を整える。hydrateと「部屋の全データ読み込み」
// （js/state-import.js）の両方がここを通る。
// ADD_INFO_ENTRYと同じ規則で検証し、通らないものは捨てる：sectionsやtitleを欠いたエントリが
// 1件混ざるだけで、情報パネルは描画のたびに例外を投げてしまうため（js/info-panel.js）。
export function normalizeInfoEntries(infoEntries) {
  if (!Array.isArray(infoEntries)) return [];

  const seenEntryIds = new Set();
  const normalized = [];

  infoEntries.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.id !== 'string' || entry.id === '') return;
    if (typeof entry.title !== 'string') return;
    if (seenEntryIds.has(entry.id)) return;

    const seenSectionIds = new Set();
    const sections = [];
    (Array.isArray(entry.sections) ? entry.sections : []).forEach(section => {
      if (!section || typeof section !== 'object') return;
      if (typeof section.id !== 'string' || section.id === '') return;
      if (seenSectionIds.has(section.id)) return;
      seenSectionIds.add(section.id);
      sections.push(buildInfoSection(section));
    });
    // 区画0件のエントリは誰にも見えず画面から消すこともできない（ADD_INFO_ENTRYと同じ理由で捨てる）
    if (sections.length === 0) return;

    seenEntryIds.add(entry.id);
    normalized.push(Object.freeze({
      ...entry,
      ownerId: entry.ownerId || null,
      sections: Object.freeze(sections)
    }));
  });

  return Object.freeze(normalized);
}

// ユーザー定義パラメータ（source:'user'）1件の定義を作る。コマのパラメータとルーム変数で共通。
// visibleは「一覧に表示するか」の指定があるコマのパラメータ側だけが持つ（ルーム変数は常に表示）。
function buildUserParam({ key, label, value, visible, audience }) {
  const param = { key, label, value, source: 'user', locked: false, editable: true };
  if (visible !== undefined) param.visible = visible;
  // 公開先（null＝全員に見せる）。ルーム変数は常に全員のものなので指定があるときだけ持たせる。
  if (audience !== undefined) param.audience = normalizeAudience(audience);
  return Object.freeze(param);
}

// ユーザー定義パラメータを1件追加する。同じキーが既にあればnull（＝追加しない）。
function withNewUserParam(params, def) {
  const paramId = `user:${def.key}`;
  if (params[paramId]) return null;
  return withMapEntry(params, paramId, buildUserParam(def));
}

// フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。
// 期限切れバフの除去とプラグインcomponentsのリセットは必ずセットで行い、通知文もここで組み立てる。
// EXPIRE_BUFFSと、ラウンド進行のROUND_ADVANCE_PHASE（フェーズ完了時の自動清掃）、
// APPLY_SCENE（シーン遷移）が使う。
//
// 上位フェーズの終了は内側のフェーズの終了も兼ねる（PHASE_HIERARCHY参照）ため、
// 指定フェーズから最下層まで1段ずつ同じ処理を流す。プラグインのリセットもフェーズ単位で
// 呼ばれるので、プラグイン側は入れ子を意識しなくてよい。
// onlyTokenIdを指定すると1コマだけが対象になる（「このコマが判定を1回行った」等）。
function applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null) {
  const chain = getPhaseChain(phase);

  let tokens = tokensState;
  const removedNames = [];
  chain.forEach(chainPhase => {
    const result = removeExpiredBuffs(tokens, chainPhase, onlyTokenId);
    removedNames.push(...result.removedNames);
    tokens = resetPluginComponentsForPhase(result.nextTokens, activePlugin, chainPhase, onlyTokenId);
  });

  const phaseLabel = BUFF_PHASE_LABELS[phase] || phase;
  // 内側のフェーズも一緒に終了したことは、ログを見ただけで分かるようにしておく
  const innerLabels = chain.slice(1).map(p => BUFF_PHASE_LABELS[p] || p);
  const headline = innerLabels.length > 0
    ? `${phaseLabel}終了（${innerLabels.join('・')}も終了）。`
    : `${phaseLabel}終了。`;

  return {
    tokens,
    removedNames,
    logText: removedNames.length > 0
      ? `${headline}消滅したバフ/デバフ: ${removedNames.join('、')}`
      : headline
  };
}

// ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。
function sortByInitiative(tokensState, participantIds) {
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
function turnOrderSourceOf(round) {
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
function plotValueOf(round, tokenId) {
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
function sortForTurnOrder(tokensState, round, participantIds) {
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
const PLOT_SLOT_LABEL_MAX = 20;

function normalizePlotSlotLabel(label) {
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
  return sortForTurnOrder(tokensState, round, round.participants.filter(id => !acted.includes(id)));
}

// 次に手番を得るコマ。割り込み指定が最優先で、無ければ未行動者のうち行動値が最大のもの。
// 割り込み指定されたコマはROUND_SET_INTERRUPT側でactedから外してあるので、ここでは
// 「参加者として残っているか」だけを確かめればよい。誰も残っていなければnull。
export function pickNextActor(tokensState, round) {
  if (round.interruptId && round.participants.includes(round.interruptId)) return round.interruptId;
  return listUnactedParticipants(tokensState, round)[0] || null;
}

// フェーズに入るときのサブステップを決める。イニシアチブプロセスを挟む設定で、かつ
// そのフェーズが「手番の前に挟む段」を宣言しているときだけ'preTurn'から始める。
function initialStepForPhase(phase, useInitiativeProcess) {
  return (useInitiativeProcess && phase?.kind === 'perCharacter' && phase.preTurnStep) ? 'preTurn' : 'act';
}

// ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。
function joinTokenNames(tokensState, ids) {
  return ids.map(id => tokensState[id]?.name || id).join('、');
}

// コマの「決まった項目だけを差し替える」アクション。payloadから差分オブジェクトを作る規則だけを
// 持ち、対象の存在確認・凍結・コミットはdispatch側の共通処理に任せる（nullを返すと何もしない）。
// アクション名はネットワーク同期の識別子（js/net-sync.js・server/index.js）なので、
// 1アクション=1エントリの対応は保ったまま重複した手続きだけを畳んでいる。
const CHARACTER_FIELD_PATCHES = {
  MOVE_TOKEN: ({ x, y }) => ({ x, y }),
  RENAME_CHARACTER: ({ name }) => (name ? { name } : null),
  // チャット欄でのキャラ名・発言テキストの色。nullで既定色に戻す。
  SET_CHARACTER_TEXT_COLOR: ({ textColor }) => ({ textColor: textColor || null }),
  // キャラクター一覧への表示/非表示（コマ自体は盤面に表示されたまま）
  SET_CHARACTER_VISIBLE: ({ visible }) => ({ visible: !!visible }),
  SET_CHARACTER_IMAGE: ({ image }) => ({ image: image || null }),
  // コマ画像のトリミング（ズーム・表示位置）。中身は{zoom,posX,posY}だがCoreは解釈せず、
  // そのまま保持・同期する（描画側が解釈する）。
  SET_CHARACTER_IMAGE_CROP: ({ crop }) => ({ imageCrop: crop ? Object.freeze({ ...crop }) : null }),
  // コマの大きさ（マス数、N×Nとして扱う）
  SET_CHARACTER_SIZE: ({ size }) => ({ size: Math.max(1, Math.round(size)) }),
  // コマを盤面からバックヤード（個人保管場所）へしまう。しまった人のローカルID(ownerId)を
  // 記録し、参照キャラクター欄・キャラ一覧・盤面描画から除外する（board-data-driven.js／
  // main.js側がinBackyardを見て判断する）。位置(x,y)はそのまま保持し、盤面に戻したときに
  // 元の位置へ復元できるようにする。
  // コマの所有者（参加者ID）。null＝所有者なしで、誰でも更新・回収できる。
  SET_CHARACTER_OWNER: ({ ownerId }) => ({ ownerId: ownerId || null }),
  // バックヤードへしまうと同時に、しまった人のコマになる。表示名を設定している人は
  // 参加者ID（ownerId）で持つので、別の端末から入り直しても同じ棚が見える。
  // ゲスト（表示名なし）は参加者IDを持てないため、従来どおりブラウザ単位のIDで棚を分ける。
  MOVE_TO_BACKYARD: ({ participantId, localUserId }) => {
    if (participantId) return { inBackyard: true, ownerId: participantId };
    return localUserId ? { inBackyard: true, backyardOwnerId: localUserId } : null;
  },
  // バックヤードから盤面へ戻す。位置は保管前の(x,y)をそのまま使う。
  RESTORE_FROM_BACKYARD: () => ({ inBackyard: false })
};

// パネルの「決まった項目だけを差し替える」アクション。CHARACTER_FIELD_PATCHESと同じ扱い。
const PANEL_FIELD_PATCHES = {
  // 固定中は盤面上でドラッグ移動を受け付けず、その上のドラッグは盤面パンに委ねる
  // （描画・当たり判定はboard側が解釈する）。
  SET_PANEL_LOCKED: ({ locked }) => ({ locked: !!locked }),
  MOVE_PANEL: ({ x, y }) => ({ x, y }),
  SET_PANEL_SIZE: ({ cols, rows }) => ({ cols: Math.max(1, Math.round(cols)), rows: Math.max(1, Math.round(rows)) }),
  SET_PANEL_IMAGE: ({ image }) => ({ image: image || null }),
  SET_PANEL_TEXT: ({ text }) => ({ text: text || '' }),
  // パネルのテキストを誰に見せるか（null＝全員。js/visibility.js参照）。画像は対象外で、
  // 「絵は見えるがメモはGMだけが読める」という使い方を想定している。
  SET_PANEL_TEXT_AUDIENCE: ({ textAudience }) => ({ textAudience: normalizeAudience(textAudience) }),
  // パネル同士の重なり順（0以上。小さいほど下、大きいほど上。同値なら追加順）
  SET_PANEL_STACK_ORDER: ({ stackOrder }) => ({ stackOrder: normalizeStackOrder(stackOrder) }),
  // シーンへ遷移しても盤面に残すか（APPLY_SCENE参照）
  SET_PANEL_KEEP_ON_SCENE_CHANGE: ({ keepOnSceneChange }) => ({ keepOnSceneChange: !!keepOnSceneChange })
};

// カードの「決まった項目だけを差し替える」アクション。PANEL_FIELD_PATCHESと同じ扱い。
const CARD_FIELD_PATCHES = {
  MOVE_CARD: ({ x, y }) => ({ x, y }),
  SET_CARD_LOCKED: ({ locked }) => ({ locked: !!locked }),
  SET_CARD_STACK_ORDER: ({ stackOrder }) => ({ stackOrder: normalizeStackOrder(stackOrder) }),
  // カードの公開（裏→表）と伏せ直し。誰でも行える（表面は「見る」でも確認できるので、
  // ここをGM限定にしても隠せるものが増えない）。
  SET_CARD_FACE_UP: ({ faceUp }) => ({ faceUp: !!faceUp })
};

// デッキの「決まった項目だけを差し替える」アクション。
const DECK_FIELD_PATCHES = {
  MOVE_DECK: ({ x, y }) => ({ x, y }),
  SET_DECK_LOCKED: ({ locked }) => ({ locked: !!locked }),
  SET_DECK_STACK_ORDER: ({ stackOrder }) => ({ stackOrder: normalizeStackOrder(stackOrder) }),
  // 裏面の差し替え。既に引かれて盤面に出ているカードの裏面は変わらない
  // （引いた時点の裏面を各カードが持つため。DRAW_CARDS参照）。
  SET_DECK_BACK: ({ back }) => ({ back: normalizeCardBack(back) })
};

export class ImmutableStore {
  #state;

  constructor(initialState) {
    this.#state = this.#createProtectedProxy(initialState);
  }

  get state() {
    return this.#state;
  }

  #createProtectedProxy(data) {
    const frozenData = Object.freeze({ ...data });
    return new Proxy(frozenData, {
      set() {
        throw new Error("[State Protected] 状態の直接書き換えは禁止されています。dispatch()を使用してください。");
      },
      deleteProperty() {
        throw new Error("[State Protected] 状態の直接削除は禁止されています。dispatch()を使用してください。");
      }
    });
  }

  // 変更したスライス（tokens/room/panels/chatTabs/chatLogs/round）だけを差し替えて次の状態を
  // 確定し、購読側へ通知する。各スライスの凍結はここで行うので、case側は「どのスライスを
  // どう変えたか」だけを書けばよい。patchに含めなかったスライスは前の状態のまま引き継がれる。
  #commit(prevState, patch) {
    const nextSlices = {};
    Object.entries(patch).forEach(([slice, value]) => {
      nextSlices[slice] = Object.freeze(value);
    });

    this.#state = this.#createProtectedProxy({ ...prevState, ...nextSlices });
    EventBus.emit('STATE_CHANGED', this.#state);
  }

  // サーバーから受け取った最新状態で、ローカルの状態をまるごと置き換える
  // （ネットワーク同期の初期化・再接続時にのみ使う）。
  // この機能より前に保存された状態にはpanels等が無いため、欠けているキーを補う。
  hydrate(newState) {
    const normalized = {
      ...newState,
      tokens: newState.tokens || {},
      panels: newState.panels || {},
      // この機能より前に保存された状態にはカード・デッキが無いため、既定値を補う。
      // 取り込んだ部屋データ（信用しないJSON）もここを通るので、形の整えと上限も
      // まとめて掛かる（normalizeCardMap／normalizeDeckMap）。
      // 実在しないパネルを指したままのstockerIdはここで外す。放っておくと、
      // どこにも描かれず取り出す口も無いカードとして残り続ける（安全網。通常は
      // ストッカーが消える経路すべてでreleaseStockerCardsが中身を出している）。
      cards: withoutLostStockerCards(normalizeCardMap(newState.cards), newState.panels),
      decks: normalizeDeckMap(newState.decks),
      // 固定タブ（Main・システム）とその空ログを補う。システムタブが無い時代に
      // 保存された部屋・取り込んだ部屋データもここを通って揃う（withFixedChatTabs参照）。
      ...withFixedChatTabs(newState.chatTabs, newState.chatLogs),
      // この機能より前に保存された状態には情報（infoEntries）が無いため、既定値を補う。
      // 形の壊れたエントリ（sections欠落など）もここで落とす（normalizeInfoEntries参照）。
      infoEntries: normalizeInfoEntries(newState.infoEntries),
      // この機能より前に保存された状態には参加者一覧が無いため、既定値を補う
      participants: newState.participants || {},
      // この機能より前に保存された状態にはround（ラウンド進行）が無いため、既定値を補う。
      // turnIndex方式で保存された進行中の状態もここで新しい手番モデルへ読み替える。
      round: normalizeRoundState(newState.round),
      // この機能より前に保存された状態にはroom.bcdiceSystem/nameが無いため、既定値を補う
      room: {
        ...newState.room,
        name: newState.room?.name || '',
        bcdiceSystem: newState.room?.bcdiceSystem || DEFAULT_BCDICE_SYSTEM,
        // この機能より前に保存された状態にはroom.originalTablesが無いため、既定値を補う
        originalTables: newState.room?.originalTables || {},
        // デッキの定義。同上で既定値を補いつつ、取り込んだ部屋データ（信用しないJSON）も
        // ここを通るので形の整えと上限もまとめて掛かる
        deckTemplates: normalizeDeckTemplateMap(newState.room?.deckTemplates),
        // 同上、音楽機能より前に保存された状態には無いため既定値を補う
        audioTracks: newState.room?.audioTracks || {},
        audioPlayback: newState.room?.audioPlayback || { bgm: null, se: null },
        // この機能より前に保存された状態にはroom.scenesが無いため、既定値を補う
        scenes: newState.room?.scenes || {},
        // 同上、ラウンド進行の設定（イニシアチブプロセスを挟むか）も既定値を補う
        roundSettings: newState.room?.roundSettings || { useInitiativeProcess: false }
      }
    };

    // 部屋全体から決まるルーム変数（現在のラウンド、ステラナイツのブーケ合計）を、
    // 読み込んだ材料から計算し直す。Core・プラグインへ後から足したぶんの補完もここで効く
    // （この機能より前に保存された状態には、そのルーム変数自体が無いため）。
    normalized.room = withDerivedRoomParameters(
      normalized.room, normalized.stampCounts, normalized.round
    );

    this.#state = this.#createProtectedProxy(normalized);
    EventBus.emit('STATE_CHANGED', this.#state);
  }

  dispatch(action, payload) {
    const prevState = this.#state;
    const activePlugin = prevState.room?.activePlugin;

    // コマを触るcaseの作業用コピー。patchCharacterで書き換えてからコミットする。
    const nextTokensState = { ...prevState.tokens };

    // コマ／パネルの決まった項目を差し替えるだけのアクションは、対象の存在確認・凍結・コミットが
    // 完全に共通なので、switchの手前でまとめて処理する（差分の作り方だけがテーブル側にある）。
    const characterFieldPatch = CHARACTER_FIELD_PATCHES[action];
    if (characterFieldPatch) {
      const { id } = payload;
      const fields = nextTokensState[id] ? characterFieldPatch(payload) : null;
      if (!fields) return;

      patchCharacter(nextTokensState, id, fields);
      this.#commit(prevState, { tokens: nextTokensState });
      return;
    }

    const panelFieldPatch = PANEL_FIELD_PATCHES[action];
    if (panelFieldPatch) {
      const { id } = payload;
      const panel = prevState.panels[id];
      const fields = panel ? panelFieldPatch(payload) : null;
      if (!fields) return;

      this.#commit(prevState, {
        panels: withMapEntry(prevState.panels, id, Object.freeze({ ...panel, ...fields }))
      });
      return;
    }

    const cardFieldPatch = CARD_FIELD_PATCHES[action];
    if (cardFieldPatch) {
      const { id } = payload;
      const card = prevState.cards[id];
      const fields = card ? cardFieldPatch(payload) : null;
      if (!fields) return;

      this.#commit(prevState, {
        cards: withMapEntry(prevState.cards, id, Object.freeze({ ...card, ...fields }))
      });
      return;
    }

    const deckFieldPatch = DECK_FIELD_PATCHES[action];
    if (deckFieldPatch) {
      const { id } = payload;
      const deck = prevState.decks[id];
      const fields = deck ? deckFieldPatch(payload) : null;
      if (!fields) return;

      this.#commit(prevState, {
        decks: withMapEntry(prevState.decks, id, Object.freeze({ ...deck, ...fields }))
      });
      return;
    }

    switch (action) {
      case 'ADD_CHARACTER': {
        const {
          id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR, image = null, size = 1,
          imageCrop = null, parameterOverrides = {}, parameterVisibility = {}, parameterAudience = {},
          customParameters = [], textColor = null, visible = true, ownerId = null
        } = payload;
        if (!id || !name) return;
        if (nextTokensState[id]) return;

        const parameters = {
          ...buildDefaultParameters(),
          ...buildCharacterParametersForPlugin(activePlugin)
        };

        Object.entries(parameterOverrides).forEach(([paramId, value]) => {
          if (parameters[paramId]) {
            parameters[paramId] = Object.freeze({ ...parameters[paramId], value });
          }
        });

        // 値とは別に、キャラクター一覧へ出すかどうかだけを作成時に指定する（HP等）。
        // 未指定なら各パラメータ定義の既定（buildParameters）のまま。
        Object.entries(parameterVisibility).forEach(([paramId, paramVisible]) => {
          if (parameters[paramId]) {
            parameters[paramId] = Object.freeze({ ...parameters[paramId], visible: !!paramVisible });
          }
        });

        // 同じく、値とは別に「誰に見せるか」も作成時に指定できる（HP等）
        Object.entries(parameterAudience).forEach(([paramId, audience]) => {
          if (parameters[paramId]) {
            parameters[paramId] = Object.freeze({ ...parameters[paramId], audience: normalizeAudience(audience) });
          }
        });

        customParameters.forEach(({ key, label, value, visible: paramVisible = true, audience: paramAudience = null }) => {
          parameters[`user:${key}`] = buildUserParam({ key, label, value, visible: paramVisible, audience: paramAudience });
        });

        // プラグインの自動計算を適用（activePlugin と parameters を正しく渡す）。
        // 作成直後はcomponentsが空なので、componentsから決まる値（ロイス数等）は0から始まる。
        const finalParameters = applyPluginDerivedParameters(
          activePlugin, parameters, {}, buildDerivedContext(prevState.round, id)
        );

        nextTokensState[id] = Object.freeze({
          id, name, x, y, color, image, size: Math.max(1, Math.round(size)),
          imageCrop: imageCrop ? Object.freeze({ ...imageCrop }) : null, // コマ画像のトリミング（非破壊）
          textColor, // チャット欄でのキャラ名・発言テキストの色（未設定nullなら既定色）
          visible: !!visible, // false ならキャラクター一覧に表示しない（盤面上のコマ自体は表示されたまま）
          parameters: finalParameters, // ← 適用後のパラメータをセット
          components: Object.freeze({}),
          buffs: Object.freeze([]), // バフ/デバフ一覧（{id,name,paramId,delta,expirePhase}）
          actions: Object.freeze([]),
          // このコマの持ち主（参加者ID）。nullなら所有者なしで、誰でも更新・回収できる。
          // 更新/JSON読み込み/削除/バックヤードへの回収は持ち主とGMだけが行える（盤面上の移動は誰でも可）。
          ownerId: ownerId || null,
          inBackyard: false, // バックヤード（盤面外の個人保管場所）にしまわれているか
          // 旧データとゲスト（表示名なし）用の読み取り専用フィールド。しまった人のブラウザ単位のID。
          // 表示名を設定している人の棚はownerIdで判定する（MOVE_TO_BACKYARD参照）。
          backyardOwnerId: null
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterCreated', { id });
        return;
      }

      case 'REMOVE_CHARACTER': {
        const { id } = payload;
        if (!nextTokensState[id]) return;
        delete nextTokensState[id];

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterDeleted', { id });
        return;
      }

      // 外部JSON（汎用/プラグイン拡張どちらも）の取り込み結果をまとめて適用する。
      // Core側はvalueOverrides/labelOverrides/newParametersの意味を解釈せず、
      // 既存paramIdへの反映・新規paramIdの追加という機械的な処理のみ行う。
      case 'IMPORT_CHARACTER_DATA': {
        const { id, name, valueOverrides = {}, labelOverrides = {}, newParameters = {}, components = {} } = payload;
        const character = nextTokensState[id];
        if (!character) return;

        let nextParams = { ...character.parameters };

        Object.entries(valueOverrides).forEach(([paramId, value]) => {
          if (nextParams[paramId] && typeof value === 'number') {
            nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });
          }
        });

        Object.entries(labelOverrides).forEach(([paramId, label]) => {
          if (nextParams[paramId] && typeof label === 'string') {
            nextParams[paramId] = Object.freeze({ ...nextParams[paramId], label });
          }
        });

        Object.entries(newParameters).forEach(([paramId, paramDef]) => {
          nextParams[paramId] = Object.freeze({ ...paramDef });
        });

        // componentsの中身（ロイス・エフェクト・コンボ等の複雑なデータ）はCoreは解釈せず、
        // componentKey単位でそのまま置き換えるだけ。
        // 自動計算にはcomponents（ロイス数等の算出元）を渡すため、先に反映後のcomponentsを作る。
        const nextComponents = Object.freeze({ ...character.components, ...components });

        nextParams = applyPluginDerivedParameters(
          activePlugin, nextParams, nextComponents, buildDerivedContext(prevState.round, id)
        );

        patchCharacter(nextTokensState, id, {
          name: name || character.name,
          parameters: nextParams,
          components: nextComponents
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterImported', { id });
        return;
      }

      // 「コマをJSONで保存」で出力した完全なスナップショットから、コマを丸ごと復元する。
      // IMPORT_CHARACTER_DATAが値の上書きのみなのに対し、こちらは見た目（画像・色・サイズ等）や
      // components・buffsも含めて丸ごと置き換える。位置(x,y)・id・バックヤード状態は
      // 呼び出し側（既存コマへの上書き、またはドロップ位置での新規作成）の管轄なので触らない。
      case 'RESTORE_CHARACTER_SNAPSHOT': {
        const { id, snapshot } = payload;
        const character = nextTokensState[id];
        if (!character || !snapshot) return;

        const nextParams = { ...character.parameters };
        Object.entries(snapshot.parameters || {}).forEach(([paramId, paramDef]) => {
          nextParams[paramId] = Object.freeze({ ...paramDef });
        });
        const nextComponents = Object.freeze({ ...(snapshot.components || {}) });
        const calculatedParams = applyPluginDerivedParameters(
          activePlugin, nextParams, nextComponents, buildDerivedContext(prevState.round, id)
        );

        patchCharacter(nextTokensState, id, {
          name: snapshot.name || character.name,
          color: snapshot.color || character.color,
          image: snapshot.image ?? null,
          imageCrop: snapshot.imageCrop ? Object.freeze({ ...snapshot.imageCrop }) : null,
          size: Math.max(1, Math.round(snapshot.size || character.size || 1)),
          textColor: snapshot.textColor ?? null,
          visible: snapshot.visible !== false,
          parameters: calculatedParams,
          components: nextComponents,
          buffs: Object.freeze((snapshot.buffs || []).map(buff => Object.freeze({ ...buff })))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('CharacterImported', { id });
        return;
      }

      // ロイス・エフェクト・コンボのような「ボックス」データを丸ごと更新する。
      // Coreはvalueの中身を解釈せず、componentKeyに紐づく値をそのまま置き換える。
      case 'SET_COMPONENT': {
        const { id, componentKey, value } = payload;
        const character = nextTokensState[id];
        if (!character || !componentKey) return;

        // ボックスの中身から決まるパラメータ（DX3のロイス数など）があるため、
        // componentsを差し替えたら自動計算も通し直す。値を直接書き込む必要が無いので、
        // それらのパラメータはeditable:false（手入力不可）のままにできる。
        const nextComponents = withMapEntry(character.components, componentKey, value);

        patchCharacter(nextTokensState, id, {
          components: nextComponents,
          parameters: applyPluginDerivedParameters(
            activePlugin, character.parameters, nextComponents, buildDerivedContext(prevState.round, id)
          )
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'SET_PARAMETER': {
        const { characterId, paramId, value } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        // 手入力できるか（editable）はプラグインの宣言が正なので、コマへ焼き付いた古い宣言を
        // 先に揃えてから弾く。ここで弾かれると自動計算まで到達しないため、
        // applyPluginDerivedParameters側の補正だけでは「後から手入力できるようにした
        // パラメータが、既存のコマでだけ永久に弾かれる」という状態になる。
        const declaredParams = withPluginParameterDeclarations(activePlugin, character.parameters);
        const nextParams = withEditableParamFields(declaredParams, paramId, { value }, 'このパラメータ');
        if (!nextParams) return;

        // プラグインの自動計算を通して新パラメータを取得
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(
            activePlugin, nextParams, character.components,
            buildDerivedContext(prevState.round, characterId)
          )
        });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('ParameterChanged', { characterId, paramId, value });
        return;
      }

      // 一覧での表示/非表示だけを切り替える。値を変えないため自動計算は通さず、
      // 編集不可（editable:false）のパラメータも対象にできる。
      case 'SET_PARAMETER_VISIBILITY': {
        const { characterId, paramId, visible } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withParamFields(character.parameters, paramId, { visible });
        if (!nextParams) return;

        patchCharacter(nextTokensState, characterId, { parameters: nextParams });

        this.#commit(prevState, { tokens: nextTokensState });
        EventBus.emit('ParameterVisibilityChanged', { characterId, paramId, visible });
        return;
      }

      // パラメータ1件の公開先（誰に見せるか）だけを変える。値は変えないので自動計算は
      // 通さず、SET_PARAMETER_VISIBILITYと同じ扱いにする。
      case 'SET_PARAMETER_AUDIENCE': {
        const { characterId, paramId, audience } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withParamFields(character.parameters, paramId, { audience: normalizeAudience(audience) });
        if (!nextParams) return;

        patchCharacter(nextTokensState, characterId, { parameters: nextParams });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'REMOVE_PARAMETER': {
        const { characterId, paramId } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withoutParam(character.parameters, paramId, 'このパラメータ');
        if (!nextParams) return;

        // 自動計算の再評価
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(
            activePlugin, nextParams, character.components,
            buildDerivedContext(prevState.round, characterId)
          )
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'ADD_PARAMETER': {
        const { characterId, key, label, value, visible = true, audience = null } = payload;
        const character = nextTokensState[characterId];
        if (!key || !character) return;

        const nextParams = withNewUserParam(character.parameters, { key, label, value, visible, audience });
        if (!nextParams) return;

        // 自動計算の適用
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(
            activePlugin, nextParams, character.components,
            buildDerivedContext(prevState.round, characterId)
          )
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      // バフ/デバフを1件付与する。paramIdが解決できない（=対象のパラメータをこのコマが
      // 持っていない）場合もnullのまま保持し、実効値計算（getEffectiveParameterValue）側で
      // 単に無視される＝効果を持たないバフとして扱う。
      case 'ADD_BUFF': {
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

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'REMOVE_BUFF': {
        const { tokenId, id } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs) return;

        patchCharacter(nextTokensState, tokenId, {
          buffs: Object.freeze(character.buffs.filter(b => b.id !== id))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      // 指定tagを持つバフ/デバフを1コマから一括削除する（例: コンボダメージ実行後、
      // そのコンボ発動由来のバフをまとめて消す）。EXPIRE_BUFFSと違い通常の行動完了に
      // 伴う片付けなのでログへの記録はしない。
      case 'REMOVE_BUFFS_BY_TAG': {
        const { tokenId, tag } = payload;
        const character = nextTokensState[tokenId];
        if (!character || !character.buffs || !tag) return;

        patchCharacter(nextTokensState, tokenId, {
          buffs: Object.freeze(character.buffs.filter(b => b.tag !== tag))
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

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
      case 'EXPIRE_BUFFS': {
        const { phase, tokenId = null } = payload;
        if (!phase) return;
        if (tokenId && !nextTokensState[tokenId]) return;

        const { tokens, removedNames, logText } = applyPhaseEnd(nextTokensState, activePlugin, phase, tokenId);

        if (tokenId) {
          // 何も消えないなら状態を作り直さない（無駄な再描画・同期を起こさないため）
          if (removedNames.length === 0) return;
          this.#commit(prevState, { tokens });
          return;
        }

        // 「〈フェーズ〉終了。消滅したバフ/デバフ: …」はコマの状態の後始末で、卓の流れそのもの
        // ではない。ラウンド進行の通知（Main）に混ぜず、システムタブへ寄せる。
        this.#commit(prevState, {
          tokens,
          chatLogs: withSystemTabLog(prevState.chatLogs, logText, payload?.time)
        });
        return;
      }

      // --- ラウンド進行（Core機能）。詳細はcreateInitialRoundState()のコメント・
      // 実装プラン（C:\Users\necom\.claude\plans\swirling-foraging-lemon.md、
      // 手番モデルの作り替えはC:\Users\necom\.claude\plans\floofy-forging-cupcake.md）参照。
      // 進行操作（開始/進行/終了/参加者変更/行動済みの回復/割り込み）はGM限定
      // （js/room-authority.js・server/index.jsのGM_ONLY_ACTIONS）。点呼(confirmation)は
      // PL各自の意思表示なのでソフトな可視化のみで、進行操作自体をブロックしない。 ---

      case 'ROUND_PROGRESSION_START': {
        const { participantIds = [] } = payload;
        if (prevState.round.active) return;

        const template = getRoundPhaseTemplate(activePlugin);
        const participants = sortByInitiative(nextTokensState, participantIds);

        const firstPhase = template[0];
        const step = initialStepForPhase(firstPhase, usesInitiativeProcess(prevState));
        // 先頭がいきなりキャラクター行動フェーズのテンプレートもありうるので、その場合は
        // ここで最初の手番を決めておく（'preTurn'から始まるなら手番はまだ決めない）。
        const currentActorId = (firstPhase.kind === 'perCharacter' && step === 'act')
          ? (sortByInitiative(nextTokensState, participants)[0] || null)
          : null;

        const participantNames = joinTokenNames(nextTokensState, participants);
        const logText = participants.length > 0
          ? `ラウンド進行を開始しました（参加者: ${participantNames}）。ラウンド1 - ${firstPhase.label}開始。`
          : `ラウンド進行を開始しました。ラウンド1 - ${firstPhase.label}開始。`;

        const startedRound = {
          ...createInitialRoundState(),
          active: true,
          template,
          roundNumber: 1,
          phaseIndex: 0,
          participants,
          step,
          currentActorId
        };

        // ラウンド1の先頭フェーズにも、以降のラウンドと同じ手当てを入れる
        // （ドラクルージュの喝采点+1はラウンド1から走る）。ROUND_ADVANCE_PHASE側と対。
        const startPhaseLog = applyRoundPhaseStart(nextTokensState, activePlugin, firstPhase, startedRound);

        // 戦闘が始まった時点でも自動計算を引き直す。プロットの公開・ラウンドの終了と同じで、
        // コマ自体は触っていないのに計算の前提（roundActive・ラウンド番号）が変わるため。
        // ここを飛ばすと、シノビガミの「ラウンド」が0のまま＝ラウンド1のプロット公開前に
        // 使った忍法のコストが数えられず、戦闘中だけ出すパラメータ（roundOnly）の表示も
        // 次に何かが動くまで切り替わらない。
        recomputeDerivedForRound(nextTokensState, activePlugin, startedRound);

        this.#commit(prevState, {
          tokens: nextTokensState,
          round: startedRound,
          // ルーム変数「現在のラウンド」を追随させる（進行中でなければ0）。
          // 以下ROUND_ADVANCE_PHASE・ROUND_PROGRESSION_ENDも対。
          room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, startedRound),
          chatLogs: withSystemLog(
            prevState.chatLogs,
            [logText, startPhaseLog].filter(Boolean).join('\n'),
            payload?.time
          )
        });
        return;
      }

      case 'ROUND_SET_PARTICIPANTS': {
        const { participantIds = [] } = payload;
        const round = prevState.round;

        const participants = sortByInitiative(nextTokensState, participantIds);

        // 参加者から外れたコマの痕跡（行動済み・手番・割り込み予約）を掃除する。
        // 手番中のコマが外された場合はcurrentActorIdをnullにし、次の「次へ進む」で
        // pickNextActorに選び直させる。
        const acted = (round.acted || []).filter(id => participants.includes(id));
        const currentActorId = participants.includes(round.currentActorId) ? round.currentActorId : null;
        const interruptId = participants.includes(round.interruptId) ? round.interruptId : null;
        const keepParticipant = ([id]) => participants.includes(id);
        const plots = Object.fromEntries(Object.entries(round.plots || {}).filter(keepParticipant));
        const plotSubmitters = Object.fromEntries(
          Object.entries(round.plotSubmitters || {}).filter(keepParticipant)
        );
        const plotExtras = Object.fromEntries(Object.entries(round.plotExtras || {}).filter(keepParticipant));
        const plotChoice = Object.fromEntries(Object.entries(round.plotChoice || {}).filter(keepParticipant));

        const participantNames = joinTokenNames(nextTokensState, participants) || '（なし）';

        this.#commit(prevState, {
          round: {
            ...round, participants, acted, currentActorId, interruptId,
            plots, plotSubmitters, plotExtras, plotChoice
          },
          chatLogs: withSystemLog(prevState.chatLogs, `参加者を更新しました（現在: ${participantNames}）。`, payload?.time)
        });
        return;
      }

      case 'ROUND_ADVANCE_PHASE': {
        const round = prevState.round;
        if (!round.active) return;

        const useInitiativeProcess = usesInitiativeProcess(prevState);

        let tokensForRound = nextTokensState;
        let phaseIndex = round.phaseIndex;
        let roundNumber = round.roundNumber;
        let acted = round.acted || [];
        let currentActorId = round.currentActorId;
        let step = round.step || 'act';
        let interruptId = round.interruptId;
        let plots = round.plots || {};
        let plotSubmitters = round.plotSubmitters || {};
        let plotExtras = round.plotExtras || {};
        let plotChoice = round.plotChoice || {};
        let plotsRevealed = round.plotsRevealed || false;
        const logParts = [];

        const currentPhase = round.template[phaseIndex];
        const nameOf = (id) => tokensForRound[id]?.name || '？';

        // このフェーズ内でまだやることが残っているかを先に決める。残っていなければ
        // 下のフェーズ完了処理へ落ちる（once種別のフェーズは常に完了扱い）。
        let phaseCompleted = false;

        if (currentPhase.kind === 'plot' && !plotsRevealed) {
          // 一斉公開。ここが「主ボタンを1回押すと公開して止まる」の実体で、次の一押しで
          // 下のphaseCompletedへ落ちて手番のフェーズへ進む。
          plotsRevealed = true;

          // 公開されて初めて値をログに残す（提出のたびに出すと伏せている意味が無くなる）。
          // 並べ替えにはplotsRevealed:trueを渡す。sortForTurnOrderは公開前だと従来の並びへ
          // 落とすので、ここでroundをそのまま渡すと手番順にならない。
          const revealedRound = { ...round, plots, plotExtras, plotChoice, plotsRevealed: true };
          const tokenOrder = sortForTurnOrder(tokensForRound, revealedRound, round.participants);
          // 増やした枠は別の行として、それぞれの値の位置に並べる（画面の詳細リストと同じ展開）。
          const revealed = listPlotSlotRows(tokensForRound, revealedRound, tokenOrder)
            .map(row => `${row.name}: ${Number.isFinite(row.value) ? row.value : '未提出'}`);
          logParts.push(`${currentPhase.label}公開。${revealed.join('、')}`);

          // 複数のプロットに出ているコマは、どれで動くかがまだ決まっていない。手番順もコストの
          // 上限もそれ待ちなので、卓に知らせておく（選んだこと自体は通知しない）。
          const unchosen = tokenOrder.filter(id => hasUnchosenPlot(revealedRound, id));
          if (unchosen.length > 0) {
            logParts.push(
              `複数のプロットに出ているコマ: ${joinTokenNames(tokensForRound, unchosen)}`
              + `（どれで動くかは所有者が選びます）`
            );
          }

          // 同値も手番順（＝便宜上の順番）で並べる。提出順のままだと画面の並びと食い違う。
          const tied = sortForTurnOrder(tokensForRound, revealedRound, listTiedPlotTokenIds(revealedRound));
          if (tied.length > 0) {
            // ルール上は同時処理。手番自体は便宜上の順番（sortForTurnOrder参照）で回すので、
            // 「同時である」ことは卓が知っている必要がある。
            logParts.push(`同値: ${joinTokenNames(tokensForRound, tied)}（ルール上は同時処理です）`);
          }
        } else if (currentPhase.kind === 'perCharacter' && step === 'preTurn') {
          // イニシアチブプロセスを終える。ここで初めて次の行動者を確定させるので、
          // この段の最中に行動値が変わっていれば新しい順序で選ばれる。
          const actor = pickNextActor(tokensForRound, { ...round, acted });
          if (actor) {
            currentActorId = actor;
            interruptId = null; // 割り込み指定は手番が決まった時点で消費する
            step = 'act';
            logParts.push(`${currentPhase.preTurnStep?.label || 'イニシアチブプロセス'}終了。${nameOf(actor)}の手番です。`);
          } else {
            phaseCompleted = true; // 未行動者がいない（参加者が外された等）
          }
        } else if (currentPhase.kind === 'perCharacter') {
          // 手番を終える。行動済みに加えたうえで、まだ手番が残っていれば次へ送る。
          if (currentActorId && !acted.includes(currentActorId)) acted = [...acted, currentActorId];

          const nextActor = pickNextActor(tokensForRound, { ...round, acted, interruptId });
          if (!nextActor) {
            phaseCompleted = true;
          } else if (useInitiativeProcess && currentPhase.preTurnStep) {
            // 次の行動者はイニシアチブプロセスを抜ける時に決め直すので、ここでは確定させない
            step = 'preTurn';
            currentActorId = null;
            logParts.push(`${currentPhase.preTurnStep.label}を行います。`);
          } else {
            currentActorId = nextActor;
            interruptId = null;
            logParts.push(`${currentPhase.label}: ${nameOf(nextActor)}の手番です。`);
          }
        } else {
          phaseCompleted = true;
        }

        if (phaseCompleted) {
          // 現在のフェーズを完了させ、次のフェーズへ（テンプレート末尾ならラウンドを繰り上げる）
          if (currentPhase.expirePhaseOnComplete) {
            const { tokens, logText } = applyPhaseEnd(tokensForRound, activePlugin, currentPhase.expirePhaseOnComplete);
            tokensForRound = tokens;
            logParts.push(logText);
          }

          let nextPhaseIndex = phaseIndex + 1;
          if (nextPhaseIndex >= round.template.length) {
            nextPhaseIndex = 0;
            roundNumber += 1;
          }
          phaseIndex = nextPhaseIndex;

          // 行動済み・手番・割り込み予約はフェーズを抜けるときに畳む
          acted = [];
          currentActorId = null;
          interruptId = null;

          // 参加者0人でperCharacterフェーズに入ってしまう場合は手番の主がいないので、
          // もう一段先（同じ規則で完了扱い）へ進める防御処理
          if (round.template[phaseIndex].kind === 'perCharacter' && round.participants.length === 0) {
            nextPhaseIndex = phaseIndex + 1;
            if (nextPhaseIndex >= round.template.length) {
              nextPhaseIndex = 0;
              roundNumber += 1;
            }
            phaseIndex = nextPhaseIndex;
          }

          const newPhase = round.template[phaseIndex];

          // 段に入るときのプラグイン固有の手当て（ドラクルージュの喝采点+1・抗う力=2）。
          // 【手番を決める前に済ませる】ここで動かした値が手番順に効くシステムもありうるので、
          // pickNextActorより先に反映させる。知らせは下の「ラウンドN - ○○開始。」の後に足す。
          const startPhaseLog = applyRoundPhaseStart(
            tokensForRound, activePlugin, newPhase, { ...round, roundNumber }
          );

          step = initialStepForPhase(newPhase, useInitiativeProcess);
          if (newPhase.kind === 'perCharacter' && step === 'act') {
            currentActorId = pickNextActor(
              tokensForRound,
              { ...round, plots, plotExtras, plotChoice, acted: [], interruptId: null }
            );
          }

          // プロットはラウンドごとに引き直すので、その段に入るところで捨てる。
          // 手番のフェーズの間は公開済みの値を残しておく（手番順の根拠であり、
          // 画面にも出しているため）。
          if (newPhase.kind === 'plot') {
            plots = {};
            plotSubmitters = {};
            // 増やした枠も一緒に捨てる。プロットが増えるのはその効果を使ったラウンドだけなので、
            // 残しておくと次のラウンドで使っていない分身が並ぶ。
            plotExtras = {};
            plotChoice = {};
            plotsRevealed = false;
          }

          const turnLabel = currentActorId ? `（手番: ${nameOf(currentActorId)}）`
            : step === 'preTurn' ? `（${newPhase.preTurnStep.label}）`
            : '';
          logParts.push(`ラウンド${roundNumber} - ${newPhase.label}開始${turnLabel}。`);
          if (startPhaseLog) logParts.push(startPhaseLog);
        }

        const nextRound = {
          ...round,
          phaseIndex,
          roundNumber,
          acted,
          currentActorId,
          step,
          interruptId,
          plots,
          plotSubmitters,
          plotExtras,
          plotChoice,
          plotsRevealed
        };

        // プロットの公開・ラウンドの繰り上がりで自動計算の前提が変わる（シノビガミの
        // ファンブル値）。コマ自体は触っていないので、ここから明示的に引き直す。
        // tokensForRoundはapplyPhaseEndが返した新しいオブジェクトか、作業用コピーのまま。
        tokensForRound = { ...tokensForRound };
        recomputeDerivedForRound(tokensForRound, activePlugin, nextRound);

        this.#commit(prevState, {
          tokens: tokensForRound,
          round: {
            ...nextRound
            // confirmationは手番/フェーズが進んでも維持する（「割り込みなし」の宣言は
            // 各自が明示的にトグルするまで持続する。手番ごとの自動リセットはしない）
          },
          room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, nextRound),
          chatLogs: withSystemLog(prevState.chatLogs, logParts.join('\n'), payload?.time)
        });
        return;
      }

      // 行動済みの付け外し。actedをfalseにするのが「行動済みを回復する」操作で、
      // そのコマは以降の手番決定（pickNextActor）にまた現れるようになる。
      // 現在手番のコマは対象にしない（「次へ進む」と意味が重なるため、UI側でも出さない）。
      case 'ROUND_SET_ACTED': {
        const { tokenId, acted } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;

        const current = round.acted || [];
        const isActed = current.includes(tokenId);
        if (isActed === !!acted) return; // 変化なし

        const nextActed = acted ? [...current, tokenId] : current.filter(id => id !== tokenId);
        const name = nextTokensState[tokenId]?.name || '？';

        this.#commit(prevState, {
          round: { ...round, acted: nextActed },
          chatLogs: withSystemLog(
            prevState.chatLogs,
            acted ? `${name}を行動済みにしました。` : `${name}の行動済みを解除しました。`,
            payload?.time
          )
        });
        return;
      }

      // 次の手番への割り込み指定。行動済みのコマにも割り込ませられるよう、ここで
      // actedからも外しておく（回復と割り込みが1操作で済み、pickNextActor側は
      // 「参加者に残っているか」だけを見ればよくなる）。tokenId=nullで予約解除。
      // 進行中の手番は中断しない（あくまで「次の手番」に割り込む）。
      case 'ROUND_SET_INTERRUPT': {
        const { tokenId = null } = payload;
        const round = prevState.round;
        if (!round.active) return;
        if (tokenId && !round.participants.includes(tokenId)) return;

        const acted = tokenId ? (round.acted || []).filter(id => id !== tokenId) : (round.acted || []);
        const logText = tokenId
          ? `${nextTokensState[tokenId]?.name || '？'}が次の手番に割り込みます。`
          : '割り込み予約を解除しました。';

        this.#commit(prevState, {
          round: { ...round, interruptId: tokenId, acted },
          chatLogs: withSystemLog(prevState.chatLogs, logText, payload?.time)
        });
        return;
      }

      // プロットの提出・変更・取り消し（value:null）。kind:'plot'のフェーズでだけ受け付ける。
      // 【これはGM限定にしない】出すのはコマの持ち主なので、server/index.jsのGM_ONLY_ACTIONSにも
      // 入れていない（ROUND_SET_READYと同じ扱い）。持ち主かどうかの判定は画面側だけの制限で、
      // サーバーは強制しない（コマの所有者チェックと同じ姿勢。js/room-authority.jsのcanOperateToken）。
      // 【ログに残さない】提出のたびに出すと、伏せている値がログから読めてしまう。
      // 値はROUND_ADVANCE_PHASEでの一斉公開のときにまとめて出す。
      // slotIdを省略（または'main'）すると元からある枠、それ以外なら「選択を増やす」で足した枠。
      case 'ROUND_SET_PLOT': {
        const { tokenId, slotId = 'main', value = null, userId = null } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;
        if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
        if (round.plotsRevealed) return; // 公開後の書き換えは受け付けない

        const phase = round.template[round.phaseIndex];
        const { min = 1, max = 6 } = phase.plot || {};

        // 出す値の検算は枠によらず同じ。取り消し（null）は「もともと出ていなければ変化なし」。
        const numeric = value === null ? null : Math.trunc(Number(value));
        if (numeric !== null && (!Number.isFinite(numeric) || numeric < min || numeric > max)) return;

        if (slotId !== 'main') {
          const extras = round.plotExtras?.[tokenId] || [];
          const index = extras.findIndex(extra => extra.id === slotId);
          if (index < 0) return; // 消された枠への提出（他の人の操作と行き違った）
          const current = extras[index];
          if (numeric === null && current.value === undefined) return; // 変化なし
          if (current.value === numeric && current.submitter === userId) return; // 変化なし

          const nextExtras = [...extras];
          nextExtras[index] = numeric === null
            ? { ...current, value: undefined, submitter: null }
            : { ...current, value: numeric, submitter: userId };
          this.#commit(prevState, {
            round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
          });
          return;
        }

        const plots = { ...(round.plots || {}) };
        const plotSubmitters = { ...(round.plotSubmitters || {}) };

        if (numeric === null) {
          if (!(tokenId in plots)) return; // 変化なし
          delete plots[tokenId];
          delete plotSubmitters[tokenId];
        } else {
          if (plots[tokenId] === numeric && plotSubmitters[tokenId] === userId) return; // 変化なし
          plots[tokenId] = numeric;
          // 出し直されたら見てよい人も入れ替わる（GMが代理で出し直した場合など）
          plotSubmitters[tokenId] = userId;
        }

        this.#commit(prevState, { round: { ...round, plots, plotSubmitters } });
        return;
      }

      // 1つのコマにプロットの枠を足す（分身の術のように、同じコマが2つ以上のプロットに出るとき）。
      // 【idはpayloadで受け取る】ここで採番するとクライアントとサーバーで食い違う。
      // 呼び出し側がgeneratePlotSlotId()で作って渡すこと。
      // 【ログに残さない】プロットが増える原因は卓に公開される情報なので伏せる必要はないが、
      // 増やすたびに発言が流れるのは邪魔なので通知はしない（ROUND_SET_PLOTと同じ扱い）。
      // 増えたことは提出欄と提出状況の行から全員に見える。
      case 'ROUND_ADD_PLOT_SLOT': {
        const { tokenId, slotId, label = '' } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;
        if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
        if (round.plotsRevealed) return; // 公開後に枠を増やすのは後出しになる
        if (!slotId || typeof slotId !== 'string') return;

        const extras = round.plotExtras?.[tokenId] || [];
        if (extras.some(extra => extra.id === slotId)) return; // 同じ操作が二重に届いた

        const nextExtras = [...extras, { id: slotId, label: normalizePlotSlotLabel(label), value: undefined, submitter: null }];
        this.#commit(prevState, {
          round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
        });
        return;
      }

      // 増やした枠を取り消す。公開前だけ（公開後はどれで動くかをROUND_SET_PLOT_CHOICEで選ぶ）。
      case 'ROUND_REMOVE_PLOT_SLOT': {
        const { tokenId, slotId } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;
        if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
        if (round.plotsRevealed) return;

        const extras = round.plotExtras?.[tokenId] || [];
        const nextExtras = extras.filter(extra => extra.id !== slotId);
        if (nextExtras.length === extras.length) return; // 変化なし

        const plotExtras = { ...(round.plotExtras || {}) };
        if (nextExtras.length > 0) plotExtras[tokenId] = nextExtras;
        else delete plotExtras[tokenId]; // 枠が元の1つだけに戻ったら痕跡を残さない

        // 消した枠が選ばれていた場合に備えて選択も落とす（公開前なので普通は空）
        const plotChoice = { ...(round.plotChoice || {}) };
        if (plotChoice[tokenId] === slotId) delete plotChoice[tokenId];

        this.#commit(prevState, { round: { ...round, plotExtras, plotChoice } });
        return;
      }

      // 増やした枠の名前（「コマA（影法師）」の括弧の中身）。名前は公開情報なので、
      // 値と違って伏せず、公開後でも直せる。ログには残さない。
      case 'ROUND_SET_PLOT_SLOT_LABEL': {
        const { tokenId, slotId, label = '' } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;

        const extras = round.plotExtras?.[tokenId] || [];
        const index = extras.findIndex(extra => extra.id === slotId);
        if (index < 0) return;

        const nextLabel = normalizePlotSlotLabel(label);
        if (extras[index].label === nextLabel) return; // 変化なし

        const nextExtras = [...extras];
        nextExtras[index] = { ...extras[index], label: nextLabel };
        this.#commit(prevState, {
          round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
        });
        return;
      }

      // 公開後、複数のプロットに出ているコマが「結局どれで動くか」を持ち主が決める。
      // slotIdにnullを渡すと未選択へ戻す。
      // 【自動計算を引き直す】選んだ値がシノビガミの忍法コストの上限とファンブル値になる。
      // コマ自体は触っていないので、ROUND_ADVANCE_PHASEの公開と同じくここから明示的に走らせる。
      // 【ログに残さない】選んだ結果は手番順の詳細リストに即時反映されて全員に見えるので、
      // 発言を足す必要がない（増やしたときと同じ扱い）。
      case 'ROUND_SET_PLOT_CHOICE': {
        const { tokenId, slotId = null } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;
        if (!round.plotsRevealed) return; // 公開前に選ばせると、選んだ相手に値が読まれる
        if ((round.plotExtras?.[tokenId] || []).length === 0) return; // 選ぶ枠がない

        const valid = slotId === null
          || slotId === 'main'
          || (round.plotExtras?.[tokenId] || []).some(extra => extra.id === slotId);
        if (!valid) return;

        const plotChoice = { ...(round.plotChoice || {}) };
        if ((plotChoice[tokenId] ?? null) === slotId) return; // 変化なし
        if (slotId === null) delete plotChoice[tokenId];
        else plotChoice[tokenId] = slotId;

        const nextRound = { ...round, plotChoice };
        const tokensAfterChoice = { ...nextTokensState };
        recomputeDerivedForRound(tokensAfterChoice, activePlugin, nextRound);

        this.#commit(prevState, { tokens: tokensAfterChoice, round: nextRound });
        return;
      }

      // ラウンド進行の設定（今はイニシアチブプロセスを挟むかどうかだけ）。ルーム単位・
      // 全員共通なのでroomに置く。進行中に切り替えた場合は、次に手番が決まるタイミングから
      // 効く（round.templateには焼き込まず、遷移のたびにusesInitiativeProcessを見るため）。
      case 'SET_ROUND_SETTINGS': {
        const { useInitiativeProcess } = payload;
        const room = prevState.room;
        const next = !!useInitiativeProcess;
        if (usesInitiativeProcess(prevState) === next) return;

        this.#commit(prevState, {
          room: { ...room, roundSettings: { ...room.roundSettings, useInitiativeProcess: next } },
          chatLogs: withSystemLog(
            prevState.chatLogs,
            next
              ? 'キャラクターの手番の前にイニシアチブプロセスを挟むようにしました。'
              : 'イニシアチブプロセスを挟まないようにしました。',
            payload?.time
          )
        });
        return;
      }

      // 入室メッセージ表示の切り替え。イニシアチブ設定と同じくルーム単位・全員共通で、
      // 同じダイアログ（roomSettingsDialog）から同じ権限判定（canOperateAsGm）を通して呼ばれる。
      case 'SET_SHOW_ENTRY_MESSAGES': {
        const { enabled } = payload;
        const room = prevState.room;
        const next = !!enabled;
        if (showsEntryMessages(prevState) === next) return;

        this.#commit(prevState, {
          room: { ...room, showEntryMessages: next }
        });
        return;
      }

      // 入室メッセージ本体の追加。identify（名乗り）完了時にサーバーだけがdispatchする
      // （server/index.jsのIDENTIFYメッセージ処理）。フラグが無効な部屋では何もしない。
      // 名前は他人が自由に設定できるニックネームだが、ここではエスケープしない。
      // 表示側（main.jsのbuildLogHtml）が発言本文をエスケープしてから挿入するので、
      // ここでも掛けると画面に &lt; がそのまま出てしまう。エスケープは表示する側の仕事。
      case 'ADD_ENTRY_MESSAGE': {
        if (!showsEntryMessages(prevState)) return;
        const name = (typeof payload?.name === 'string' && payload.name.trim()) || 'ゲスト';

        this.#commit(prevState, {
          chatLogs: withSystemTabLog(prevState.chatLogs, `${name}が入室しました。`, payload?.time)
        });
        return;
      }

      case 'ROUND_PROGRESSION_END': {
        const round = prevState.round;
        if (!round.active) return;

        // 戦闘が終わるということは、進行中だったラウンドもそこで終わる。ラウンド単位の
        // プラグインデータ（忍法の「ラウンドにつき1回」の使用回数、そのラウンドに使った
        // 忍法コストの合計）を戻しておかないと、次の戦闘のラウンド1へ持ち越されてしまう。
        // バフの期限切れ（applyPhaseEnd）まで通さないのは、ここで消すと決めていない
        // 「ラウンド終了まで」のバフの扱いを、この変更で一緒に変えてしまわないため。
        let tokensAfterEnd = resetPluginComponentsForPhase(nextTokensState, activePlugin, 'round');

        // プロットから決まっていた値は平常時のものへ戻す。
        // 引き直しには「参加者が誰だったか」が要るので、終了後の空の状態ではなく
        // 直前のparticipantsを渡す（roundActive:falseで平常時として計算される）。
        // components を戻した後に引き直す（使用コストの表示がその結果を見るため）。
        const endedRound = { ...createInitialRoundState(), participants: round.participants };
        tokensAfterEnd = { ...tokensAfterEnd };
        recomputeDerivedForRound(tokensAfterEnd, activePlugin, endedRound);

        const clearedRound = createInitialRoundState();
        this.#commit(prevState, {
          tokens: tokensAfterEnd,
          round: clearedRound,
          // 進行が終われば「現在のラウンド」は0へ戻る
          room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, clearedRound),
          chatLogs: withSystemLog(prevState.chatLogs, `ラウンド進行を終了しました（合計${round.roundNumber}ラウンド）。`, payload?.time)
        });
        return;
      }

      // 点呼/割り込み確認の「準備OK」一覧を更新する。ソフトな可視化のみで、これ自体は
      // 進行操作をブロックしない。頻繁に発火しうるためチャットログには残さない。
      case 'ROUND_SET_READY': {
        const { userId, nickname, ready } = payload;
        if (!userId) return;
        const round = prevState.round;

        const withoutUser = round.confirmation.readyEntries.filter(e => e.userId !== userId);
        const nextEntries = ready ? [...withoutUser, { userId, nickname: nickname || '' }] : withoutUser;

        this.#commit(prevState, {
          round: { ...round, confirmation: { readyEntries: nextEntries } }
        });
        return;
      }

      // システムプラグインの切り替え。既存キャラ全員の自動計算値も再計算した上で
      // ルーム変数を作り直す。
      case 'SET_ACTIVE_PLUGIN': {
        const { pluginId } = payload;
        const prevRoom = prevState.room;

        Object.keys(nextTokensState).forEach(id => {
          patchCharacter(nextTokensState, id, {
            parameters: applyPluginDerivedParameters(
              pluginId, nextTokensState[id].parameters, nextTokensState[id].components,
              buildDerivedContext(prevState.round, id)
            )
          });
        });

        this.#commit(prevState, {
          // 作り直したルーム変数にも、既に溜まっている集計からの自動計算を当てておく
          // （切り替えた直後だけブーケ合計が0に見える、という食い違いを作らない）
          // Coreのルーム変数（現在のラウンド）はwithDerivedRoomParametersが補うので、
          // ここではプラグインのぶんだけを作り直せばよい。
          room: withDerivedRoomParameters({
            ...prevRoom,
            activePlugin: pluginId,
            parameters: buildRoomParameters(pluginId)
          }, prevState.stampCounts, prevState.round),
          tokens: nextTokensState
        });

        EventBus.emit('ActivePluginChanged', { pluginId });
        return;
      }

      // BCDiceのシステム（ダイスロールの解釈規則）を切り替える。キャラクターパラメータ用の
      // プラグイン（activePlugin）とは別軸の設定で、ルーム単位・全員共通にするためroomに置く。
      case 'SET_BCDICE_SYSTEM': {
        const { system } = payload;
        if (!system) return;

        this.#commit(prevState, { room: { ...prevState.room, bcdiceSystem: system } });
        return;
      }

      // 部屋名（複数部屋運用時のインデックスページ表示・見出し表示に使う）を変更する。
      case 'SET_ROOM_NAME': {
        const { name } = payload;
        if (typeof name !== 'string') return;

        this.#commit(prevState, { room: { ...prevState.room, name } });
        return;
      }

      // --- 参加者（js/local-identity.jsの「表示名」から導出した公開IDで識別する） ---
      // 状態に載るのは公開ID・表示名・GMかどうかだけ。
      // 同じ表示名なら別の端末・ブラウザからでも同じIDになるので、入り直しても同じ参加者になる。
      case 'REGISTER_PARTICIPANT': {
        const { id, nickname } = payload;
        if (!id) return;

        const participants = prevState.participants || {};
        const existing = participants[id];
        // まだGMが1人もいなければ、最初に名乗った人をGMにする（部屋を作った本人が
        // そのまま入室する想定）。以後の付け外しはSET_PARTICIPANT_GMで行う。
        const hasGm = Object.values(participants).some(p => p.isGm);

        this.#commit(prevState, {
          participants: withMapEntry(participants, id, Object.freeze({
            id,
            nickname: typeof nickname === 'string' ? nickname : (existing?.nickname || ''),
            isGm: existing ? existing.isGm : !hasGm
          }))
        });
        return;
      }

      case 'SET_PARTICIPANT_GM': {
        const { id, isGm } = payload;
        const participants = prevState.participants || {};
        const participant = participants[id];
        if (!participant) return;

        this.#commit(prevState, {
          participants: withMapEntry(participants, id, Object.freeze({ ...participant, isGm: !!isGm }))
        });
        return;
      }

      // 表示名の打ち間違いで増えてしまった参加者などを消すための後始末用。
      case 'REMOVE_PARTICIPANT': {
        const { id } = payload;
        const participants = prevState.participants || {};
        if (!participants[id]) return;

        this.#commit(prevState, { participants: withoutMapEntry(participants, id) });
        return;
      }

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
      case 'COUNT_STAMP': {
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

        this.#commit(prevState, {
          stampCounts: nextStampCounts,
          // 集計から決まるルーム変数（ブーケ合計）を追随させる
          room: withDerivedRoomParameters(prevState.room, nextStampCounts, prevState.round)
        });
        return;
      }

      // 集計を全部0に戻す（js/stamp-panel.jsの「集計をリセット」）。一度消すと戻せないので
      // GM限定（server/index.jsのGM_ONLY_ACTIONS）。ログの消去と同じ扱い。
      case 'RESET_STAMP_COUNTS': {
        if (Object.keys(prevState.stampCounts || {}).length === 0) return;

        const emptyCounts = Object.freeze({});
        this.#commit(prevState, {
          stampCounts: emptyCounts,
          // 集計を0にしたら、そこから決まるルーム変数（ブーケ合計）も0に戻る
          room: withDerivedRoomParameters(prevState.room, emptyCounts, prevState.round)
        });
        return;
      }

      // オリジナル表（ユーザー定義のダイス表）を登録する。キーはタイトルなので、既存と
      // 同じタイトルで登録し直すと上書きになる（誤登録の修正に使える）。
      case 'ADD_ORIGINAL_TABLE': {
        const { title, dice, entries } = payload;
        if (!title || !dice || !entries) return;
        const room = prevState.room;

        const table = Object.freeze({ title, dice, entries: Object.freeze({ ...entries }) });

        this.#commit(prevState, {
          room: { ...room, originalTables: withMapEntry(room.originalTables, title, table) }
        });
        return;
      }

      // オリジナル表をタイトル指定で削除する（オリジナル表一覧の×ボタンから）。
      case 'REMOVE_ORIGINAL_TABLE': {
        const { title } = payload;
        const room = prevState.room;
        if (!room.originalTables?.[title]) return;

        this.#commit(prevState, {
          room: { ...room, originalTables: withoutMapEntry(room.originalTables, title) }
        });
        return;
      }

      // --- デッキの定義（js/deck-list-dialog.js・js/deck-editor-dialog.js） ---
      // 作り置きのデッキ。盤面に置いた山札（state.decks）とは別で、こちらは
      // 1行＝1種類のカード＋枚数で持つ。オリジナル表と同じく部屋の全員で共有し、
      // 誰でも作成・編集・削除できる。
      // 同じidで呼べば上書き（SAVE_SCENEと同じ「キー重複＝上書き」の規則）。
      case 'SAVE_DECK_TEMPLATE': {
        const { id, name } = payload;
        if (!id || !name) return;
        const room = prevState.room;

        this.#commit(prevState, {
          room: {
            ...room,
            deckTemplates: withMapEntry(room.deckTemplates || {}, id, buildDeckTemplate(payload))
          }
        });
        return;
      }

      // 定義を消すだけで、その定義から作って盤面に置いてある山札・カードには触らない
      // （置いた時点で1枚ずつへ展開され、定義とは切り離されているため）。
      case 'REMOVE_DECK_TEMPLATE': {
        const { id } = payload;
        const room = prevState.room;
        if (!room.deckTemplates?.[id]) return;

        this.#commit(prevState, {
          room: { ...room, deckTemplates: withoutMapEntry(room.deckTemplates, id) }
        });
        return;
      }

      // --- シーン（js/scene-list-dialog.js） ---
      // GMが場面ごとに盤面の見た目（背景・盤面サイズ・パネル）を保存し、1クリックで
      // 切り替えるための機能。すべてGM限定で、server/index.jsのGM_ONLY_ACTIONSにも
      // 同じ4つを入れてある（片方だけ変えると画面とサーバーの判断がずれる）。

      // 「今の盤面をシーンとして保存」。同じidで呼べば上書き保存になる
      // （ADD_ORIGINAL_TABLEと同じ「キー重複＝上書き」の規則）。
      //
      // 盤面の中身をprevStateから読まずpayloadで受け取るのは、保存の瞬間に他の人が
      // パネルを動かしていると、各クライアントが自分のローカル状態を写してしまい、
      // 端末ごとに違うスナップショットが焼き付くため。普通のアクションなら後続の差分で
      // 収束するが、シーンは保存された記録としてずれたまま恒久的に残ってしまう。
      case 'SAVE_SCENE': {
        const { id, name, text = '', bgmTrackId = null, background = {}, panels = {} } = payload;
        if (!id || !name) return;
        const room = prevState.room;

        const scene = Object.freeze({
          id,
          name,
          text: text || '',
          bgmTrackId: bgmTrackId || null,
          backgroundImage: background.imageUrl || null,
          backgroundImageKey: background.imageKey || null,
          boardWidth: background.boardWidth || null,
          boardHeight: background.boardHeight || null,
          // この項目より前に保存されたシーンにはキーが無いので、既定（マス目あり）へ倒す
          showGrid: background.showGrid !== false,
          panels: freezePanelMap(panels)
        });

        this.#commit(prevState, {
          room: { ...room, scenes: withMapEntry(room.scenes || {}, id, scene) }
        });
        return;
      }

      // シーンの名前・本文・BGMだけを更新する（盤面は写し直さない）。
      // そのシーンへ遷移していない状態でも描写を書き足せるようにするために要る。
      case 'UPDATE_SCENE_META': {
        const { id, name, text = '', bgmTrackId = null } = payload;
        const room = prevState.room;
        const scene = room.scenes?.[id];
        if (!scene || !name) return;

        this.#commit(prevState, {
          room: {
            ...room,
            scenes: withMapEntry(room.scenes, id, Object.freeze({
              ...scene, name, text: text || '', bgmTrackId: bgmTrackId || null
            }))
          }
        });
        return;
      }

      // シーンを削除する。R2上の背景画像には触らない（同じ画像を他のシーンや現在の盤面が
      // 参照していることがあるため。掃除は部屋の削除時にまとめて行う。server/index.js参照）。
      case 'REMOVE_SCENE': {
        const { id } = payload;
        const room = prevState.room;
        if (!room.scenes?.[id]) return;

        this.#commit(prevState, {
          room: { ...room, scenes: withoutMapEntry(room.scenes, id) }
        });
        return;
      }

      // シーンへ遷移する。背景・盤面サイズ・パネル・BGM・シーン終了時のバフ消滅を
      // 1回のdispatchでまとめて反映する。分けて投げると、他クライアントに「新しいパネル＋
      // 古い背景」という中間状態が見えるうえ、途中に他の人の操作が割り込むと片方だけ
      // 適用された状態がそのまま残ってしまう（サーバーのGM判定もアクション単位のため、
      // 分けるとその分だけ穴が増える）。
      //
      // コマ・チャット・参加者・ラウンド進行には触れない（バフの消滅だけはコマに及ぶ）。
      // パネルは総入れ替えだが、keepOnSceneChangeが付いたものだけは持ち越す。
      // playIdは呼び出し側が採番する。ここでDate.now()を呼ぶと、各クライアントとサーバーが
      // 同じアクションを再実行したときに値がずれ、js/audio-player.jsの再生検知が壊れる。
      case 'APPLY_SCENE': {
        const { id, playId } = payload;
        const room = prevState.room;
        const scene = room.scenes?.[id];
        if (!scene) return;

        // BGM: null=変えない / SCENE_BGM_STOP=止める / id指定=その曲。
        // 既に同じ曲が鳴っているときはplayIdを据え置く（変えると頭出しに戻ってしまう）。
        // 参照先の音源が削除されていた場合は「変えない」に倒す。
        const playback = room.audioPlayback || { bgm: null, se: null };
        let nextBgm = playback.bgm;
        if (scene.bgmTrackId === SCENE_BGM_STOP) {
          nextBgm = null;
        } else if (scene.bgmTrackId && room.audioTracks?.[scene.bgmTrackId]
          && playback.bgm?.trackId !== scene.bgmTrackId) {
          nextBgm = Object.freeze({ trackId: scene.bgmTrackId, playId });
        }

        // 前のシーンが終わったので、終了条件が「シーン」のバフ/デバフを消す（EXPIRE_BUFFSと同じ処理）。
        // シーンの内側であるラウンド/プロセス/判定のバフもここで一緒に消える。
        const { tokens, logText } = applyPhaseEnd(nextTokensState, activePlugin, 'scene');

        // 触るのはパネルだけで、カード・デッキ（state.cards／state.decks）には手を付けない。
        // コマと同じ扱いで、引いた手札や場に出ている札が場面転換で巻き戻ったり消えたり
        // しないようにするため。
        // 消えるストッカーの中身は盤面へ出す。カード自体はシーンで触らないので、
        // ここで出さないと「消えたパネルを指したまま、どこにも描かれないカード」が残る。
        // 「シーンチェンジで残す」パネルは、遷移先のパネルへ重ねて持ち越す。
        // 同じidが両方にある場合（この属性より前に保存したシーン等）は盤面側を採る：
        // 保存したあとに動かした位置・大きさを巻き戻したくないため。
        const keptPanels = Object.fromEntries(
          Object.entries(prevState.panels || {}).filter(([, panel]) => panel.keepOnSceneChange)
        );

        // 遷移後に居なくなるストッカーの中身を、消える前に盤面へ出す
        const nextPanels = freezePanelMap({ ...scene.panels, ...keptPanels });
        let nextCards = prevState.cards;
        Object.values(prevState.panels || {}).forEach(panel => {
          if (!panel.isStocker || nextPanels[panel.id]) return;
          nextCards = releaseStockerCards(nextCards, panel, payload.gridSize);
        });

        this.#commit(prevState, {
          room: {
            ...room,
            // 背景に「シーンチェンジで残す」が付いている間は、背景・盤面サイズを上書きしない
            // （js/background-dialog.js）。フラグ自体は...roomに乗ってそのまま残る。
            ...(room.keepBackgroundOnSceneChange ? {} : {
              backgroundImage: scene.backgroundImage || null,
              backgroundImageKey: scene.backgroundImageKey || null,
              boardWidth: scene.boardWidth || null,
              boardHeight: scene.boardHeight || null,
              showGrid: scene.showGrid !== false
            }),
            audioPlayback: withMapEntry(playback, 'bgm', nextBgm)
          },
          panels: nextPanels,
          ...(nextCards === prevState.cards ? {} : { cards: nextCards }),
          tokens,
          // フェーズ終了 → シーン開始 → BGMの順で残す（起きた順）。宛先は行ごとに違う：
          // 前のシーンのバフ消滅とBGMはシステムタブ（EXPIRE_BUFFS・withBgmLogと同じ扱い）、
          // 「シーンが変わった」こと自体は卓の流れなのでMainに出す。
          chatLogs: (() => {
            const afterScene = withSystemLog(
              withSystemTabLog(prevState.chatLogs, logText, payload.time),
              `シーン「${scene.name}」を開始しました。`,
              payload.time
            );
            if (nextBgm?.trackId === playback.bgm?.trackId) return afterScene;
            return withBgmLog(afterScene, room.audioTracks, nextBgm?.trackId || null, payload.time);
          })()
        });
        return;
      }

      // --- 音楽（BGM／効果音） ---
      // 状態に入るのはURLとメタデータだけ。音の実体はR2側にあり、ここには乗らない。
      case 'ADD_AUDIO_TRACK': {
        const { id, name, url, source, key = null, channel, loop, phrase = null } = payload;
        if (!id || !name || !url) return;
        const room = prevState.room;

        const track = Object.freeze({
          id,
          name,
          url,
          source: source === 'upload' ? 'upload' : 'external',
          key: source === 'upload' ? key : null,
          channel: channel === 'se' ? 'se' : 'bgm',
          loop: Boolean(loop),
          // 発言の末尾がこのフレーズと一致したら鳴らす（js/audio-phrase.js）。空/未設定は鳴らさない。
          phrase: typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null
        });

        this.#commit(prevState, {
          room: { ...room, audioTracks: withMapEntry(room.audioTracks, id, track) }
        });
        return;
      }

      // 登録済みの音源の再生フレーズだけを変更する（音楽ダイアログの入力欄から）。
      case 'SET_AUDIO_TRACK_PHRASE': {
        const { id, phrase } = payload;
        const room = prevState.room;
        const track = room.audioTracks?.[id];
        if (!track) return;

        const nextPhrase = typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null;

        this.#commit(prevState, {
          room: {
            ...room,
            audioTracks: withMapEntry(room.audioTracks, id, Object.freeze({ ...track, phrase: nextPhrase }))
          }
        });
        return;
      }

      // 音源を削除する。再生中のものを消した場合は、そのチャンネルも止めておかないと
      // 存在しないtrackIdを指したまま残ってしまう。
      case 'REMOVE_AUDIO_TRACK': {
        const { id } = payload;
        const room = prevState.room;
        if (!room.audioTracks?.[id]) return;

        const playback = room.audioPlayback || { bgm: null, se: null };
        const nextPlayback = {};
        AUDIO_CHANNELS.forEach(channel => {
          nextPlayback[channel] = playback[channel]?.trackId === id
            ? null
            : (playback[channel] ? Object.freeze({ ...playback[channel] }) : null);
        });

        this.#commit(prevState, {
          room: {
            ...room,
            audioTracks: withoutMapEntry(room.audioTracks, id),
            audioPlayback: Object.freeze(nextPlayback)
          }
        });
        return;
      }

      // 指定チャンネルで音源を鳴らす。再生は全員が行える（再生フレーズも同じ経路）。
      // 止めるのは別アクション（STOP_AUDIO_PLAYBACK）。ここでtrackId: nullを受け付けると
      // 停止をGM限定にした意味が無くなるので、必ず鳴らす音源を伴うこと。
      case 'SET_AUDIO_PLAYBACK': {
        const { channel, trackId, playId } = payload;
        if (!AUDIO_CHANNELS.includes(channel)) return;
        const room = prevState.room;
        if (!trackId || !room.audioTracks?.[trackId]) return;

        const playback = room.audioPlayback || { bgm: null, se: null };

        // 曲が実際に変わったときだけ曲名を残す。同じ曲の鳴らし直し（playIdだけの更新）では
        // 何も書かない：効果音のように連打される使い方でログが埋まらないようにするため。
        const bgmChanged = channel === 'bgm' && playback.bgm?.trackId !== trackId;

        this.#commit(prevState, {
          room: {
            ...room,
            audioPlayback: withMapEntry(playback, channel, Object.freeze({ trackId, playId }))
          },
          ...(bgmChanged
            ? { chatLogs: withBgmLog(prevState.chatLogs, room.audioTracks, trackId, payload?.time) }
            : {})
        });
        return;
      }

      // 指定チャンネルの再生を止める。再生と分けてあるのは、停止だけをGM限定にするため
      // （server/index.jsのGM_ONLY_ACTIONS。「みんなで聴いている音を他人が止められる」のを
      // 防ぐためで、自分にだけ聞こえないようにするミュートはjs/audio-player.js側にある）。
      case 'STOP_AUDIO_PLAYBACK': {
        const { channel } = payload;
        if (!AUDIO_CHANNELS.includes(channel)) return;

        const room = prevState.room;
        const playback = room.audioPlayback || { bgm: null, se: null };
        if (!playback[channel]) return;

        this.#commit(prevState, {
          room: { ...room, audioPlayback: withMapEntry(playback, channel, null) },
          ...(channel === 'bgm'
            ? { chatLogs: withBgmLog(prevState.chatLogs, room.audioTracks, null, payload?.time) }
            : {})
        });
        return;
      }

      // 背景設定（js/background-dialog.js）。画像・盤面サイズ・シーンチェンジでの扱いを
      // 1つのダイアログで決めるので、まとめて1回のdispatchで反映する。
      // imageKeyはR2に実体がある場合のキー（部屋削除時の掃除に使う）。外部URLや、
      // R2へ移行する前に保存されたデータURLの背景ではnullのまま。
      case 'SET_BOARD_BACKGROUND': {
        const {
          imageUrl, imageKey = null, boardWidth = null, boardHeight = null,
          showGrid = true, keepOnSceneChange = false
        } = payload;

        this.#commit(prevState, {
          room: {
            ...prevState.room,
            backgroundImage: imageUrl || null,
            backgroundImageKey: imageUrl ? (imageKey || null) : null,
            // マス目（グリッド線）を敷くか。既定はあり（applyBoardBackground参照）
            showGrid: showGrid !== false,
            // 画像とサイズは独立して決める（画像なしで盤面だけ広げる／画像を消しても
            // サイズは残す）。null＝ビューポートに合わせる（resolveBoardPixelSize参照）。
            boardWidth: boardWidth || null,
            boardHeight: boardHeight || null,
            // シーンへ遷移しても背景・盤面サイズを上書きしない（APPLY_SCENE参照）。
            // パネルのkeepOnSceneChangeと違い、シーン側には従来どおり保存する：
            // 背景は1つしかなく、保存しない（＝null）と「背景なし」の区別が付かないため。
            keepBackgroundOnSceneChange: !!keepOnSceneChange
          }
        });
        return;
      }

      // --- ルーム変数。コマのパラメータと同じ編集規則（editable/locked）を共通ヘルパーで共有する ---
      case 'SET_ROOM_PARAMETER': {
        const { paramId, value } = payload;
        const room = prevState.room;

        const nextParams = withEditableParamFields(room.parameters, paramId, { value }, 'このルーム変数');
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        EventBus.emit('RoomParameterChanged', { paramId, value });
        return;
      }

      case 'ADD_ROOM_PARAMETER': {
        const { key, label, value } = payload;
        if (!key) return;
        const room = prevState.room;

        const nextParams = withNewUserParam(room.parameters, { key, label, value });
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        return;
      }

      case 'REMOVE_ROOM_PARAMETER': {
        const { paramId } = payload;
        const room = prevState.room;

        const nextParams = withoutParam(room.parameters, paramId, 'このルーム変数');
        if (!nextParams) return;

        this.#commit(prevState, { room: { ...room, parameters: nextParams } });
        return;
      }

      // チャットタブを1つ追加する。idは呼び出し側（main.js）がタイムスタンプ等で生成する。
      // audienceは公開先（null＝全員、配列＝その参加者だけ。js/visibility.js参照）。
      case 'ADD_CHAT_TAB': {
        const { id, name, audience = null } = payload;
        if (!id || !name) return;
        if (prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: [...prevState.chatTabs, Object.freeze({ id, name, audience: normalizeAudience(audience) })],
          chatLogs: withMapEntry(prevState.chatLogs, id, Object.freeze([]))
        });
        return;
      }

      // 既存タブの公開先を変える（メンバーの追加・削除、限定公開↔全員公開の切り替え）。
      // 固定タブ（Main・システム）は常に全員向けのまま：withSystemLogが宛先を選ばずに
      // 流し込む設計なので、限定公開にすると通知が一部の人にしか届かなくなる。
      case 'SET_CHAT_TAB_AUDIENCE': {
        const { id, audience } = payload;
        if (id === MAIN_CHAT_TAB_ID || id === SYSTEM_CHAT_TAB_ID) return;
        if (!prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: prevState.chatTabs.map(tab => (
            tab.id === id ? Object.freeze({ ...tab, audience: normalizeAudience(audience) }) : tab
          ))
        });
        return;
      }

      // 既存タブの名前を変える。追加・公開先変更と同じく、誰でも呼べる（GM限定にしていない）。
      // システムタブだけは名前も固定：役割が決まっている置き場で、名前を変えられると
      // 「システム発言はどこへ行ったのか」が分からなくなる（Mainの名前変更は従来どおり可）。
      case 'RENAME_CHAT_TAB': {
        const { id, name } = payload;
        if (!id || !name) return;
        if (id === SYSTEM_CHAT_TAB_ID) return;
        if (!prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: prevState.chatTabs.map(tab => (
            tab.id === id ? Object.freeze({ ...tab, name }) : tab
          ))
        });
        return;
      }

      // チャットタブを削除する。固定タブ（Main・システム）は常に存在する前提なので削除できない。
      // タブに紐づくログ（chatLogs）も一緒に消す。表示中タブが消えた場合の切り替えは
      // 呼び出し側（js/main.jsのensureActiveTabVisible、STATE_CHANGED購読で自動的に走る）に任せる。
      case 'REMOVE_CHAT_TAB': {
        const { id } = payload;
        if (!id || id === MAIN_CHAT_TAB_ID || id === SYSTEM_CHAT_TAB_ID) return;
        if (!prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: prevState.chatTabs.filter(tab => tab.id !== id),
          chatLogs: withoutMapEntry(prevState.chatLogs, id)
        });
        return;
      }

      // 指定タブのログにメッセージを1件追加する。存在しないタブIDは無視する。
      case 'ADD_CHAT_MESSAGE': {
        const { tabId, entry } = payload;
        if (!tabId || !entry || !prevState.chatLogs[tabId]) return;

        this.#commit(prevState, { chatLogs: withChatEntry(prevState.chatLogs, tabId, entry, payload.time) });
        return;
      }

      // 既に流れた発言の本文を書き直す（誤字の直し）。誰が編集してよいかはここでは見ない：
      // 画面側（js/room-authority.jsのcanEditChatEntry）が本人とGMだけに絞る。コマの所有者
      // チェック（canOperateToken）や情報の編集（js/info-panel.jsのcanEditEntry）と同じ姿勢で、
      // サーバー（server/index.js）も強制しない。
      //
      // 書き換わるのは本文（resultText）だけ。キャラ名・色・コマンド・出目内訳・発言時刻は
      // 元のまま残るので、「誰がいつ何を振ったか」は編集では消せない。
      // 指し先はidのみ。配列の位置で指すと、楽観適用で並びがずれた画面では別の発言に当たる。
      // idを持たない発言（この機能より前の過去ログ、システム発言、サーバー発の入室メッセージ）は
      // 一致するものが無いので、そのまま何も起こらない。
      case 'EDIT_CHAT_MESSAGE': {
        const { tabId, entryId, resultText } = payload;
        if (!tabId || !entryId || typeof resultText !== 'string') return;

        const entries = prevState.chatLogs[tabId];
        if (!entries) return;

        const index = entries.findIndex(entry => entry.id === entryId);
        if (index < 0) return;

        // editedAtは「編集済み」の印を出すためだけの値（表示はjs/main.jsのbuildLogHtml）。
        // timeの扱いはwithChatEntryと同じで、payload.timeがあればそれを使う。
        const edited = Object.freeze({
          ...entries[index],
          resultText,
          editedAt: Number.isFinite(payload.time) ? payload.time : Date.now()
        });

        this.#commit(prevState, {
          chatLogs: withMapEntry(
            prevState.chatLogs, tabId,
            Object.freeze(entries.map((entry, i) => (i === index ? edited : entry)))
          )
        });
        return;
      }

      // 3Dダイスを転がす合図（js/dice-animation.jsが購読）。状態は一切変えず、通知だけを行う。
      // 出目をチャットログのエントリに持たせなかったのは、部屋のJSONへ永続化されてしまい、
      // 再接続時のhydrateで過去のロールが一斉に転がり出すため。状態を変えないので
      // サーバー側のstore（server/index.js）でも素通りし、そのまま他クライアントへ中継される。
      case 'ROLL_DICE_ANIMATION': {
        EventBus.emit('DICE_ROLLED', payload);
        return;
      }

      // 全タブのログを消す（GM限定。js/main.jsのルームメニュー「ログを消去」から）。
      // タブそのもの（chatTabs・公開先）は残し、中身だけを空にする。
      // 他の人から見ると前触れなくログが消えるので、Mainタブに理由を1行だけ残す。
      case 'CLEAR_ALL_CHAT_LOGS': {
        const emptied = Object.freeze(Object.fromEntries(
          Object.keys(prevState.chatLogs).map(tabId => [tabId, Object.freeze([])])
        ));

        this.#commit(prevState, {
          chatLogs: withSystemLog(emptied, 'ログを消去しました。', payload?.time)
        });
        return;
      }

      // --- パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト） ---
      // 位置(x,y)は盤面ローカルのピクセル座標（グリッド吸着済み、盤面外は負値もあり得る）、
      // 大きさ(cols,rows)はマス数。置ける場所に制限は無く、盤面から離れた位置にも置ける。
      case 'ADD_PANEL': {
        const {
          id, image = null, text = '', x = 0, y = 0, cols = 2, rows = 2, locked = false,
          textAudience = null, keepOnSceneChange = false, stackOrder = 0
        } = payload;
        if (!id) return;
        if (prevState.panels[id]) return;

        const panel = Object.freeze({
          id, image: image || null, text: text || '', x, y,
          cols: Math.max(1, Math.round(cols)),
          rows: Math.max(1, Math.round(rows)),
          locked: !!locked, // 固定中は盤面上でドラッグ移動できない（背景タイルのように振る舞う）
          // テキスト（マウスオーバーで出るメモ）の公開先。null＝全員に見せる
          textAudience: normalizeAudience(textAudience),
          // シーンへ遷移してもこのパネルだけは盤面に残す。シーン側には保存されないので、
          // 実体は常に1つ（js/main.jsのcurrentBoardSnapshotとAPPLY_SCENE参照）
          keepOnSceneChange: !!keepOnSceneChange,
          // パネル同士の重なり順。同値のパネル同士はこのマップの並び（＝追加順）で決まる
          stackOrder: normalizeStackOrder(stackOrder),
          // カードストッカー（カードを収納できる箱）。既定は普通のパネル。
          // 切り替えとその所有者はSET_PANEL_STOCKERで決める
          isStocker: false,
          stockerOwnerId: null,
          stockerOwnerLocalId: null
        });

        this.#commit(prevState, { panels: withMapEntry(prevState.panels, id, panel) });
        return;
      }

      // パネルをカードストッカーにする／やめる。所有者を決めるのもここ（PANEL_FIELD_PATCHESに
      // 混ぜないのは、やめるときに中のカードを盤面へ出す必要があるため）。
      // 所有者を付けると、入れる・見る・取り出すのすべてがその人だけになる。
      case 'SET_PANEL_STOCKER': {
        const { id, isStocker, ownerId = null, localUserId = null, gridSize } = payload;
        const panel = prevState.panels[id];
        if (!panel) return;

        const nextPanel = Object.freeze({
          ...panel,
          isStocker: !!isStocker,
          // 所有者を付けないときは両方null（＝誰でも使える箱）。表示名を設定している人は
          // 参加者IDで持ち、ゲストはブラウザ単位のIDへ退避する（MOVE_TO_BACKYARDと同じ）
          stockerOwnerId: isStocker ? (ownerId || null) : null,
          stockerOwnerLocalId: isStocker && !ownerId ? (localUserId || null) : null
        });

        // 箱でなくなるなら、中のカードは盤面へ出す（消えると取り返しがつかない）
        const cards = isStocker ? prevState.cards : releaseStockerCards(prevState.cards, panel, gridSize);

        this.#commit(prevState, {
          panels: withMapEntry(prevState.panels, id, nextPanel),
          ...(cards === prevState.cards ? {} : { cards })
        });
        return;
      }

      // パネルの項目変更（固定/移動/サイズ/画像/テキスト）はPANEL_FIELD_PATCHESで共通処理する。

      case 'REMOVE_PANEL': {
        const { id, gridSize } = payload;
        const panel = prevState.panels[id];
        if (!panel) return;

        // ストッカーごと消すときは、中のカードを盤面へ出してから消す
        const cards = releaseStockerCards(prevState.cards, panel, gridSize);

        this.#commit(prevState, {
          panels: withoutMapEntry(prevState.panels, id),
          ...(cards === prevState.cards ? {} : { cards })
        });
        return;
      }

      // --- カード（表と裏を持つ盤面オブジェクト。js/board-data-driven.js） ---
      // 位置(x,y)・重なり順の規則はパネルと同じ。単項目の変更（移動/固定/重なり順/表裏）は
      // CARD_FIELD_PATCHESで共通処理する。
      // シーンの保存・適用（SAVE_SCENE・APPLY_SCENE）はカードとデッキに触らない。
      // 場面が変わってもコマが消えないのと同じ扱いで、引いた手札が場面転換で巻き戻ったり
      // 消えたりしないようにするため。
      case 'ADD_CARD': {
        const { id } = payload;
        if (!id) return;
        if (prevState.cards[id]) return;

        this.#commit(prevState, {
          cards: withMapEntry(prevState.cards, id, buildCard(payload))
        });
        return;
      }

      case 'REMOVE_CARD': {
        const { id } = payload;
        if (!prevState.cards[id]) return;

        this.#commit(prevState, { cards: withoutMapEntry(prevState.cards, id) });
        return;
      }

      // 「カードを見る」（裏のまま自分だけ表面を確認する）で、見た人を記録する。
      // 見ること自体は誰にでも許すので、ここで止めるものは何もない。記録は全員に配られるが、
      // 盤面には出さず、カードの右クリックメニューを開いた人だけが読める
      // （js/board-data-driven.jsのカードメニュー）。
      case 'MARK_CARD_SEEN': {
        const { id, participantId } = payload;
        const card = prevState.cards[id];
        if (!card || typeof participantId !== 'string' || !participantId) return;
        // 表示名を設定していない人（参加者IDを持たない）は記録できない。名前が無い記録は
        // 「誰が見たか」を伝えられず、数だけ増えても意味がないため。
        if (card.seenBy.includes(participantId)) return;
        if (card.seenBy.length >= MAX_CARD_SEEN_BY) return;

        this.#commit(prevState, {
          cards: withMapEntry(prevState.cards, id, Object.freeze({
            ...card,
            seenBy: Object.freeze([...card.seenBy, participantId])
          }))
        });
        return;
      }

      // --- カードストッカーへの出し入れ（stockerAllowsUser の節を参照） ---
      // 収納したカードは盤面から消えるが、状態としては残る（stockerIdが入るだけ）。
      // 所有者付きの箱は、操作した人がその所有者のときだけ受け付ける。
      case 'STORE_CARD_IN_STOCKER': {
        const { cardId, panelId, participantId = null, localUserId = null } = payload;
        const card = prevState.cards[cardId];
        const panel = prevState.panels[panelId];
        if (!card || !panel) return;
        if (card.stockerId) return; // 既にどこかの箱の中
        if (!stockerAllowsUser(panel, participantId, localUserId)) return;

        this.#commit(prevState, {
          cards: withMapEntry(prevState.cards, cardId, Object.freeze({
            ...card, stockerId: panelId, stockerSeq: nextStockerSeq(prevState.cards)
          }))
        });
        return;
      }

      // 箱から1枚取り出す。置き場所は箱の位置から決めるので、全員の画面で同じ位置に出る。
      case 'TAKE_CARD_FROM_STOCKER': {
        const { cardId, gridSize, participantId = null, localUserId = null } = payload;
        const card = prevState.cards[cardId];
        if (!card?.stockerId) return;

        const panel = prevState.panels[card.stockerId];
        // 箱そのものが既に無い場合は、誰でも取り出せる扱いにする（迷子のままにしない）
        if (panel && !stockerAllowsUser(panel, participantId, localUserId)) return;

        const grid = Math.max(1, Math.round(Number(gridSize) || 25));
        const baseX = (panel?.x ?? card.x) + (CARD_COLS + 1) * grid;
        const spot = findFreeCardSpot(prevState.cards, baseX, panel?.y ?? card.y, grid);

        this.#commit(prevState, {
          cards: withMapEntry(prevState.cards, cardId, Object.freeze({
            ...card, stockerId: null, stockerSeq: 0, x: spot.x, y: spot.y
          }))
        });
        return;
      }

      // 箱の中身をまとめて盤面へ出す（メニューの「すべて取り出す」）。
      case 'RELEASE_STOCKER_CARDS': {
        const { panelId, gridSize, participantId = null, localUserId = null } = payload;
        const panel = prevState.panels[panelId];
        if (!panel) return;
        if (!stockerAllowsUser(panel, participantId, localUserId)) return;

        const cards = releaseStockerCards(prevState.cards, panel, gridSize);
        if (cards === prevState.cards) return;

        this.#commit(prevState, { cards });
        return;
      }

      // --- デッキ（カードの束。裏向きでセットする） ---
      // 束ねる札のIDは配置する側（js/deck-dialog.js）が発番して渡す。reducerで採番すると、
      // 同じアクションを各クライアントが再実行したときに別々のIDになってしまう。
      case 'ADD_DECK': {
        const { id } = payload;
        if (!id) return;
        if (prevState.decks[id]) return;

        this.#commit(prevState, {
          decks: withMapEntry(prevState.decks, id, buildDeck(payload))
        });
        return;
      }

      // デッキだけを消す。既に引かれて盤面に出ているカードはそのまま残す。
      case 'REMOVE_DECK': {
        const { id } = payload;
        if (!prevState.decks[id]) return;

        this.#commit(prevState, { decks: withoutMapEntry(prevState.decks, id) });
        return;
      }

      // シャッフル。並び替えた結果（IDの配列）を発火側が作って渡す。reducerでMath.random()を
      // 呼ぶと、同じアクションを実行した各クライアントが別々の並びになってしまうため。
      // 受け取った並びは「今デッキにある札の並べ替えであること」を必ず確かめる。ここを
      // 省くと、細工したpayloadで札を増やす・減らす・すり替えることができてしまう。
      case 'SHUFFLE_DECK': {
        const { id, order } = payload;
        const deck = prevState.decks[id];
        if (!deck) return;
        if (!Array.isArray(order) || order.length !== deck.cards.length) return;

        const remaining = new Map(deck.cards.map(card => [card.id, card]));
        const shuffled = [];

        for (const cardId of order) {
          const card = remaining.get(cardId);
          if (!card) return; // 知らないID、または同じIDが2回出てきた
          remaining.delete(cardId);
          shuffled.push(card);
        }

        this.#commit(prevState, {
          decks: withMapEntry(prevState.decks, id, Object.freeze({
            ...deck,
            cards: Object.freeze(shuffled)
          }))
        });
        return;
      }

      // 盤面のカードをデッキへ戻す。戻る先は山の**一番下**（＝cardsの末尾）で、
      // 残りが0枚でも同じ（空の山に1枚だけ入る）。
      // どのデッキへ戻すかは呼び出し側が決めるが、そのカードの出自（deckId）と違う山は
      // 受け付けない（js/board-data-driven.jsのドロップ処理でも同じ判定をしている）。
      // 戻したカードは盤面から消える。裏面は捨てる（裏面はデッキが持つため）。
      case 'RETURN_CARD_TO_DECK': {
        const { cardId, deckId } = payload;
        const card = prevState.cards[cardId];
        const deck = prevState.decks[deckId];
        if (!card || !deck) return;
        if (card.deckId !== deck.id) return;
        // 同じidの札が山に居るなら二重に増やさない（連打・再送への歯止め）
        if (deck.cards.some(entry => entry.id === card.id)) return;
        if (deck.cards.length >= MAX_DECK_CARDS) return;

        this.#commit(prevState, {
          cards: withoutMapEntry(prevState.cards, cardId),
          decks: withMapEntry(prevState.decks, deck.id, Object.freeze({
            ...deck,
            cards: Object.freeze([...deck.cards, Object.freeze({ id: card.id, face: card.face })])
          }))
        });
        return;
      }

      // デッキの一番上からn枚引いて盤面へ出す。表向き(faceUp:true)でも裏向きでも引ける。
      // 置き場所はデッキの位置から導く（findFreeCardSpot）ので、全員の画面で同じ位置に出る。
      // gridSizeは描画側の定数（js/board-data-driven.jsのGRID_SIZE）で、game-storeは画面の
      // 都合を持たない方針なのでpayloadで受け取る。
      case 'DRAW_CARDS': {
        const { deckId, count = 1, faceUp = false, gridSize = 25 } = payload;
        const deck = prevState.decks[deckId];
        if (!deck || deck.cards.length === 0) return;

        const grid = Math.max(1, Math.round(Number(gridSize) || 25));
        const drawCount = Math.min(
          Math.max(1, Math.round(Number(count) || 1)),
          MAX_DRAW_COUNT,
          deck.cards.length
        );

        const drawn = deck.cards.slice(0, drawCount);
        let nextCards = prevState.cards;

        drawn.forEach((card, index) => {
          const baseX = deck.x + (CARD_COLS + 1) * grid * (index + 1);
          const spot = findFreeCardSpot(nextCards, baseX, deck.y, grid);
          nextCards = withMapEntry(nextCards, card.id, buildCard({
            id: card.id,
            face: card.face,
            // 裏面は引いた時点のものをカード自身が持つ（あとでデッキの裏面を変えても、
            // 既に出ているカードの裏は変わらない）
            back: deck.back,
            x: spot.x,
            y: spot.y,
            faceUp,
            deckId: deck.id
          }));
        });

        this.#commit(prevState, {
          cards: nextCards,
          decks: withMapEntry(prevState.decks, deck.id, Object.freeze({
            ...deck,
            cards: Object.freeze(deck.cards.slice(drawCount))
          }))
        });
        return;
      }

      // --- 情報（タイトル＋内容の共有メモ。js/info-panel.js） ---
      // idはUI側（js/info-panel.js）が採番する。sectionは必ず1件以上：0件のエントリは
      // 作成者を含む誰にも見えず、画面から消すこともできない置き土産になるため。
      case 'ADD_INFO_ENTRY': {
        const { id, title, ownerId = null, sections = [] } = payload;
        if (!id || !title) return;
        if (prevState.infoEntries.some(entry => entry.id === id)) return;

        // 通信・ファイル読み込みを経た値も通るので、sectionの形をここで確かめる
        const validSections = Array.isArray(sections)
          ? sections.filter(s => s && typeof s === 'object' && typeof s.id === 'string' && s.id !== '')
          : [];
        if (validSections.length === 0) return;

        const seenSectionIds = new Set();
        const normalized = [];
        validSections.forEach(section => {
          if (seenSectionIds.has(section.id)) return; // 同じidが二重に来たら先勝ち
          seenSectionIds.add(section.id);
          normalized.push(buildInfoSection(section));
        });

        this.#commit(prevState, {
          infoEntries: [
            ...prevState.infoEntries,
            Object.freeze({ id, title, ownerId: ownerId || null, sections: Object.freeze(normalized) })
          ]
        });
        return;
      }

      // タイトル・sectionの内容を更新する。sectionsは「idで突き合わせて差分を当てる」方式で、
      // 配列ごと置き換えはしない：自分に見えていないsectionを、編集した人が消せてしまうため
      // （今は1件しか無いので起きないが、将来の裏の使命を守るのはこの意味づけ）。
      case 'UPDATE_INFO_ENTRY': {
        const { id, title, sections } = payload;
        const target = prevState.infoEntries.find(entry => entry.id === id);
        if (!target) return;

        let nextSections = target.sections;
        if (Array.isArray(sections)) {
          nextSections = [...target.sections];

          sections.forEach(patch => {
            if (!patch || typeof patch !== 'object' || typeof patch.id !== 'string' || !patch.id) return;

            const index = nextSections.findIndex(s => s.id === patch.id);
            if (index < 0) {
              // 知らないidは新しい区画として末尾へ足す（将来の裏の追加もここを通る）
              nextSections.push(buildInfoSection(patch));
              return;
            }
            // 渡されたキーだけを当てる。undefinedを混ぜないのが肝で、混ざると
            // buildInfoSectionの既定値が効いてaudienceが「全員に公開」へ広がってしまう。
            nextSections[index] = buildInfoSection({ ...nextSections[index], ...definedFields(patch) });
          });

          nextSections = Object.freeze(nextSections);
        }

        const nextTitle = (typeof title === 'string' && title !== '') ? title : target.title;
        if (nextTitle === target.title && nextSections === target.sections) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.map(entry => (
            entry.id === id
              ? Object.freeze({ ...entry, title: nextTitle, sections: nextSections })
              : entry
          ))
        });
        return;
      }

      // 本文を送り直さずに公開先だけを変える（SET_CHAT_TAB_AUDIENCEと同じ役どころ）。
      case 'SET_INFO_SECTION_AUDIENCE': {
        const { id, sectionId, audience } = payload;
        const target = prevState.infoEntries.find(entry => entry.id === id);
        if (!target) return;
        if (!target.sections.some(s => s.id === sectionId)) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.map(entry => (
            entry.id === id
              ? Object.freeze({
                  ...entry,
                  sections: Object.freeze(entry.sections.map(s => (
                    s.id === sectionId ? buildInfoSection({ ...s, audience }) : s
                  )))
                })
              : entry
          ))
        });
        return;
      }

      // 区画を1つ消す（ダブルハンドアウトの「裏」を取り下げる等）。最後の1つは消せない：
      // section 0件のエントリは誰にも見えず、画面から消すこともできなくなるため。
      // 見えていない区画は編集画面に出てこないので、ここへは自分に見える区画のidしか来ない。
      case 'REMOVE_INFO_SECTION': {
        const { id, sectionId } = payload;
        const target = prevState.infoEntries.find(entry => entry.id === id);
        if (!target) return;
        if (target.sections.length <= 1) return;
        if (!target.sections.some(s => s.id === sectionId)) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.map(entry => (
            entry.id === id
              ? Object.freeze({
                  ...entry,
                  sections: Object.freeze(entry.sections.filter(s => s.id !== sectionId))
                })
              : entry
          ))
        });
        return;
      }

      // 読み込んだ部屋データの情報を、GMが自分のものとして引き取る（js/state-import.js）。
      // 取り込みの時点ではまだGMが決まっていないことがある（部屋作成と同時の読み込み）ため、
      // 引き取りは取り込みと分けてこのアクションにしてある。発火はjs/info-panel.js。
      // 公開先が設定されていた区画は取り込み時に宛先なし（＝誰にも見えない）へ潰してあるので、
      // ここでGMを宛先に入れて初めて画面に出る。全員公開だった区画はそのまま触らない。
      case 'CLAIM_RESTORED_INFO': {
        const { participantId } = payload;
        if (!participantId) return;
        if (!prevState.infoEntries.some(entry => entry.restoredFromImport)) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.map(entry => {
            if (!entry.restoredFromImport) return entry;

            const { restoredFromImport, ...rest } = entry;
            return Object.freeze({
              ...rest,
              ownerId: participantId,
              sections: Object.freeze(entry.sections.map(section => (
                Array.isArray(section.audience)
                  ? buildInfoSection({ ...section, audience: [participantId] })
                  : section
              )))
            });
          })
        });
        return;
      }

      case 'REMOVE_INFO_ENTRY': {
        const { id } = payload;
        if (!prevState.infoEntries.some(entry => entry.id === id)) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.filter(entry => entry.id !== id)
        });
        return;
      }

      default:
        return;
    }
  }

  init() {
    EventBus.emit('STATE_CHANGED', this.#state);
  }
}

export const DEFAULT_BCDICE_SYSTEM = 'Cthulhu7th';

// 新規部屋の初期状態を組み立てる。クライアント側の単一store（ブラウザ1タブ＝1部屋）と、
// サーバー側が複数部屋分（server/index.js）作る際の両方から使う共通のひな形。
export function createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {}) {
  return {
    room: {
      name,                // 部屋名（複数部屋運用時のインデックスページ・見出し表示に使う）
      activePlugin,        // 例: 'DX3'。null = プラグイン未選択（Coreパラメータのみ）
      // ルーム変数（後述）。システムを選んで部屋を作った場合は、そのシステムの既定を
      // 最初から配る。以前は常に空で始めていたため、SET_ACTIVE_PLUGINを一度通すまで
      // プラグインのルーム変数（ステラナイツのブーケ合計、グランクレストの混沌レベル）が
      // 存在しなかった。
      parameters: Object.freeze({
        ...buildDefaultRoomParameters(), // Core共通のルーム変数（現在のラウンド）
        ...buildRoomParameters(activePlugin)
      }),
      backgroundImage: null, // null = CSS側のデフォルト背景をそのまま使う
      // 背景の実体がR2にある場合のキー（部屋削除時の掃除に使う）。外部URL・移行前の
      // データURLではnull。音源のtrack.keyと同じ役割。
      backgroundImageKey: null,
      // null = 自動（ビューポートをマス単位に切り上げたサイズ。resolveBoardPixelSize参照）
      boardWidth: null,
      boardHeight: null,
      showGrid: true,        // マス目（グリッド線）を敷くか。地図画像をそのまま見せたい時に外す
      // シーンへ遷移しても背景・盤面サイズを変えないか（js/background-dialog.js）。
      // シーン側への保存は従来どおり行い、遷移時の上書きだけを止める
      keepBackgroundOnSceneChange: false,
      // ラウンド進行の設定（js/round-panel.js・SET_ROUND_SETTINGS）。今は
      // 「キャラクターの手番の前にイニシアチブプロセスを挟むか」だけを持つ。
      // 将来ラウンド進行の仕組み自体をユーザー/プラグインで指定できるようにする際の置き場。
      roundSettings: { useInitiativeProcess: false },
      // 入室時に既定のチャットタブ（Main）へ「〈名前〉が入室しました。」を出すか
      // （js/game-store.jsのSET_SHOW_ENTRY_MESSAGES・showsEntryMessages）。既定は有効。
      showEntryMessages: true,
      bcdiceSystem, // BCDiceのシステムID（例: 'Cthulhu7th'）。ルーム単位で全員共通
      originalTables: {}, // ユーザー定義のダイス表。キーはタイトル（後述、original-table-dialog.js参照）

      // ユーザー定義のデッキ（js/deck-editor-dialog.js）。盤面に置いた山札（state.decks）とは
      // 別の「作り置きの設計図」で、1行＝1種類のカード＋枚数。キーはid（名前は変わりうるため）。
      // { [id]: { id, name, back: {image,color}, cards: [{ id, name, count, text, image }] } }
      deckTemplates: {},

      // 音楽（js/audio-player.js／js/audio-dialog.js）。音の実体は状態に入れずURLだけを持つ
      // （実体を入れると、アクションのたびに状態ごとRedisへ書き直されて帯域を食い潰すため。
      // 実体はCloudflare R2にあり、アップロードはserver/r2.js経由）。
      // 将来チャットコマンドから名前で呼べるよう「名前付きで複数登録するライブラリ」の形。
      // { [id]: { id, name, url, source: 'upload'|'external', key: string|null, channel: 'bgm'|'se',
      //           loop: boolean, phrase: string|null } }
      // phraseは「発言の末尾がこの文字列と一致したら鳴らす」再生フレーズ（js/audio-phrase.js）。
      // source:'upload' はサーバーがR2に実体を持つ（削除時にkeyで消す）。'external' は外部URL参照。
      audioTracks: {},
      // チャンネルごとの再生状態。BGMを流したまま効果音を重ねられるよう2枠に分けてある。
      // playIdは再生のたびに変わる値で、同じ曲を鳴らし直したことの検知に使う（再生位置は同期しない）。
      audioPlayback: { bgm: null, se: null }, // 各要素 { trackId, playId } | null

      // シーン（js/scene-list-dialog.js）。GMが場面ごとに盤面の見た目を保存しておき、
      // 1クリックで切り替えるための入れ物。保存するのは背景・盤面サイズ・パネルだけで、
      // コマ・チャット・参加者・ラウンド進行には触れない。
      // panelsには「シーンチェンジで残す」指定のパネルは入らない（どのシーンにも属さず、
      // 盤面側に1つだけ在り続けるため。js/main.jsのcurrentBoardSnapshot参照）。
      // { [id]: { id, name, text, bgmTrackId, backgroundImage, backgroundImageKey,
      //           boardWidth, boardHeight, showGrid, panels } }
      // bgmTrackId は null=BGMを変えない / SCENE_BGM_STOP=止める / audioTracksのid=その曲。
      scenes: {}
    },

    tokens: {},

    // パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト）
    panels: {},

    // カード（表と裏を持つ盤面オブジェクト）と、その束＝デッキ。
    // パネルと同じ層に並ぶが、シーンには保存されない（コマと同じ扱い。APPLY_SCENE参照）。
    cards: {},
    decks: {},

    // チャットタブとタブごとのログ履歴。Main（人が喋る既定タブ）と
    // システム（進行の通知だけが流れる固定タブ）は常に存在する。
    chatTabs: [
      { id: MAIN_CHAT_TAB_ID, name: 'Main' },
      { id: SYSTEM_CHAT_TAB_ID, name: SYSTEM_CHAT_TAB_NAME, audience: null }
    ],
    chatLogs: { [MAIN_CHAT_TAB_ID]: [], [SYSTEM_CHAT_TAB_ID]: [] },

    // 情報（js/info-panel.js）。タイトル＋内容の組を浮動パネルのタブとして並べる共有メモ。
    // { id, title, ownerId, sections: [{ id, label, body, audience }] } の配列。
    // ownerIdは作成者の参加者ID（null＝表示名未設定の人が作った＝誰でも編集できる）。
    // sectionsは1エントリ内の区画で、公開先(audience)をエントリではなくsectionが持つ。
    // 将来のダブルハンドアウト（表の使命／裏の使命）で「表＝audience:null、裏＝限定公開」を
    // 1エントリに同居させるための構造で、現状のUIは必ず1件だけ作る。
    // 部屋データの読み込みで復元されたエントリだけは、GMが引き取るまでの間だけ
    // restoredFromImport:true を持つ（js/state-import.js・CLAIM_RESTORED_INFO）。
    infoEntries: [],

    // 参加者一覧（js/local-identity.jsの表示名から導出した公開IDがキー）。
    // { [id]: { id, nickname, isGm } }。
    participants: {},

    // スタンプを誰が何枚出したかの集計（COUNT_STAMP・js/stamp-panel.js）。
    // { [stampId]: { [participantId]: 枚数 } }。書き込むのは各自が自分の枠だけで、
    // 運ぶのは増分ではなく枚数そのもの（取りこぼしても次の1枚で揃うため。COUNT_STAMP参照）。
    // 数えるのはプラグインのスタンプだけで、
    // Coreの「OK」「♥」等は数えない（ステラナイツのブーケのように、そのシステムで
    // 意味を持つものを数えるための機能なので）。
    // スタンプ自体は揮発（盤面に1分出て消えるだけで状態に残らない）だが、この数だけは
    // 状態に載せて全員へ配る。上限（server/index.jsのallowStamp）で表示が間引かれても
    // 数は必ず増える＝「押した回数」が正しく残る。
    stampCounts: {},

    // ラウンド進行（Core機能）。詳細はcreateInitialRoundState()参照
    round: createInitialRoundState()
  };
}

export const store = new ImmutableStore(createInitialGameState());
