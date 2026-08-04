// js/game-store.js
// 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない
// 純粋なモジュール。ブラウザ（board-data-driven.js経由）とNode（server/index.js）の
// 両方からimportして、同じreducerを共有するために切り出している。

import { EventBus } from './EventBus.js';
import { buildDefaultParameters } from './parameters/core.js';
import {
  buildCharacterParametersForPlugin, buildRoomParameters, listPlugins, applyPluginDerivedParameters,
  getRoundPhaseTemplate, resetPluginComponentsOnPhaseEnd
} from './parameters/registry.js';

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

let buffIdCounter = 0;

export function generateBuffId() {
  buffIdCounter += 1;
  return `buff-user-${Date.now()}-${buffIdCounter}`;
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
    confirmation: { readyEntries: [] } // 点呼/割り込み確認の「準備OK」一覧。[{userId, nickname}]
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
    confirmation: round.confirmation || base.confirmation
  };
  delete next.turnIndex; // 旧キーは残さない（参照元が無いのに値だけ残ると誤読の元になる）
  return next;
}

// 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。
// この機能より前の状態にはキーが無いので、必ずこのヘルパ経由で読む。
export function usesInitiativeProcess(state) {
  return state?.room?.roundSettings?.useInitiativeProcess === true;
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

const MAIN_CHAT_TAB_ID = 'main';

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

// 指定タブのログへ1件追記した新しいchatLogsを返す。
function withChatEntry(chatLogs, tabId, entry) {
  const nextEntries = Object.freeze([...(chatLogs[tabId] || []), Object.freeze({ ...entry })]);
  return withMapEntry(chatLogs, tabId, nextEntries);
}

// Mainタブへシステム発言を1件追記する。ラウンド進行・バフ期限切れの通知に使う
// （EventBus経由の副作用にすると、同期される全クライアントでそれぞれ「受信→追記dispatch→
// 再送信」が走ってクライアント数だけログが重複するため、1回のdispatchで完結させている）。
function withSystemLog(chatLogs, text) {
  return withChatEntry(chatLogs, MAIN_CHAT_TAB_ID, { system: 'システム', resultText: text });
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

// まだこのラウンドで行動していない参加者を、イニシアチブの実効値の降順で返す。
// 呼ばれるたびに並べ替え直すので、バフ/デバフで行動値が変わっていれば次の手番の順序に
// そのまま反映される（＝「イニシアチブプロセスで順番を計算し直す」の実体）。
export function listUnactedParticipants(tokensState, round) {
  const acted = round.acted || [];
  return sortByInitiative(tokensState, round.participants.filter(id => !acted.includes(id)));
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
  // シーンへ遷移しても盤面に残すか（APPLY_SCENE参照）
  SET_PANEL_KEEP_ON_SCENE_CHANGE: ({ keepOnSceneChange }) => ({ keepOnSceneChange: !!keepOnSceneChange })
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
      chatTabs: newState.chatTabs || [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
      chatLogs: newState.chatLogs || { [MAIN_CHAT_TAB_ID]: [] },
      // この機能より前に保存された状態には情報（infoEntries）が無いため、既定値を補う
      infoEntries: newState.infoEntries || [],
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
        // 同上、音楽機能より前に保存された状態には無いため既定値を補う
        audioTracks: newState.room?.audioTracks || {},
        audioPlayback: newState.room?.audioPlayback || { bgm: null, se: null },
        // この機能より前に保存された状態にはroom.scenesが無いため、既定値を補う
        scenes: newState.room?.scenes || {},
        // 同上、ラウンド進行の設定（イニシアチブプロセスを挟むか）も既定値を補う
        roundSettings: newState.room?.roundSettings || { useInitiativeProcess: false }
      }
    };
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
        const finalParameters = applyPluginDerivedParameters(activePlugin, parameters, {});

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

        nextParams = applyPluginDerivedParameters(activePlugin, nextParams, nextComponents);

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
        const calculatedParams = applyPluginDerivedParameters(activePlugin, nextParams, nextComponents);

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
          parameters: applyPluginDerivedParameters(activePlugin, character.parameters, nextComponents)
        });

        this.#commit(prevState, { tokens: nextTokensState });
        return;
      }

      case 'SET_PARAMETER': {
        const { characterId, paramId, value } = payload;
        const character = nextTokensState[characterId];
        if (!character) return;

        const nextParams = withEditableParamFields(character.parameters, paramId, { value }, 'このパラメータ');
        if (!nextParams) return;

        // プラグインの自動計算を通して新パラメータを取得
        patchCharacter(nextTokensState, characterId, {
          parameters: applyPluginDerivedParameters(activePlugin, nextParams, character.components)
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
          parameters: applyPluginDerivedParameters(activePlugin, nextParams, character.components)
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
          parameters: applyPluginDerivedParameters(activePlugin, nextParams, character.components)
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

        this.#commit(prevState, {
          tokens,
          chatLogs: withSystemLog(prevState.chatLogs, logText)
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

        this.#commit(prevState, {
          round: {
            ...createInitialRoundState(),
            active: true,
            template,
            roundNumber: 1,
            phaseIndex: 0,
            participants,
            step,
            currentActorId
          },
          chatLogs: withSystemLog(prevState.chatLogs, logText)
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

        const participantNames = joinTokenNames(nextTokensState, participants) || '（なし）';

        this.#commit(prevState, {
          round: { ...round, participants, acted, currentActorId, interruptId },
          chatLogs: withSystemLog(prevState.chatLogs, `参加者を更新しました（現在: ${participantNames}）。`)
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
        const logParts = [];

        const currentPhase = round.template[phaseIndex];
        const nameOf = (id) => tokensForRound[id]?.name || '？';

        // このフェーズ内でまだやることが残っているかを先に決める。残っていなければ
        // 下のフェーズ完了処理へ落ちる（once種別のフェーズは常に完了扱い）。
        let phaseCompleted = false;

        if (currentPhase.kind === 'perCharacter' && step === 'preTurn') {
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
          step = initialStepForPhase(newPhase, useInitiativeProcess);
          if (newPhase.kind === 'perCharacter' && step === 'act') {
            currentActorId = pickNextActor(tokensForRound, { ...round, acted: [], interruptId: null });
          }

          const turnLabel = currentActorId ? `（手番: ${nameOf(currentActorId)}）`
            : step === 'preTurn' ? `（${newPhase.preTurnStep.label}）`
            : '';
          logParts.push(`ラウンド${roundNumber} - ${newPhase.label}開始${turnLabel}。`);
        }

        this.#commit(prevState, {
          tokens: tokensForRound,
          round: {
            ...round,
            phaseIndex,
            roundNumber,
            acted,
            currentActorId,
            step,
            interruptId
            // confirmationは手番/フェーズが進んでも維持する（「割り込みなし」の宣言は
            // 各自が明示的にトグルするまで持続する。手番ごとの自動リセットはしない）
          },
          chatLogs: withSystemLog(prevState.chatLogs, logParts.join('\n'))
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
            acted ? `${name}を行動済みにしました。` : `${name}の行動済みを解除しました。`
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
          chatLogs: withSystemLog(prevState.chatLogs, logText)
        });
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
              : 'イニシアチブプロセスを挟まないようにしました。'
          )
        });
        return;
      }

      case 'ROUND_PROGRESSION_END': {
        const round = prevState.round;
        if (!round.active) return;

        this.#commit(prevState, {
          round: createInitialRoundState(),
          chatLogs: withSystemLog(prevState.chatLogs, `ラウンド進行を終了しました（合計${round.roundNumber}ラウンド）。`)
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
              pluginId, nextTokensState[id].parameters, nextTokensState[id].components
            )
          });
        });

        this.#commit(prevState, {
          room: {
            ...prevRoom,
            activePlugin: pluginId,
            parameters: buildRoomParameters(pluginId)
          },
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

        // 「シーンチェンジで残す」パネルは、遷移先のパネルへ重ねて持ち越す。
        // 同じidが両方にある場合（この属性より前に保存したシーン等）は盤面側を採る：
        // 保存したあとに動かした位置・大きさを巻き戻したくないため。
        const keptPanels = Object.fromEntries(
          Object.entries(prevState.panels || {}).filter(([, panel]) => panel.keepOnSceneChange)
        );

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
          panels: freezePanelMap({ ...scene.panels, ...keptPanels }),
          tokens,
          chatLogs: withSystemLog(
            withSystemLog(prevState.chatLogs, logText),
            `シーン「${scene.name}」を開始しました。`
          )
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

        this.#commit(prevState, {
          room: {
            ...room,
            audioPlayback: withMapEntry(playback, channel, Object.freeze({ trackId, playId }))
          }
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
          room: { ...room, audioPlayback: withMapEntry(playback, channel, null) }
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
      case 'SET_CHAT_TAB_AUDIENCE': {
        const { id, audience } = payload;
        if (!prevState.chatTabs.some(tab => tab.id === id)) return;

        this.#commit(prevState, {
          chatTabs: prevState.chatTabs.map(tab => (
            tab.id === id ? Object.freeze({ ...tab, audience: normalizeAudience(audience) }) : tab
          ))
        });
        return;
      }

      // 指定タブのログにメッセージを1件追加する。存在しないタブIDは無視する。
      case 'ADD_CHAT_MESSAGE': {
        const { tabId, entry } = payload;
        if (!tabId || !entry || !prevState.chatLogs[tabId]) return;

        this.#commit(prevState, { chatLogs: withChatEntry(prevState.chatLogs, tabId, entry) });
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
          chatLogs: withSystemLog(emptied, 'ログを消去しました。')
        });
        return;
      }

      // --- パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト） ---
      // 位置(x,y)は盤面ローカルのピクセル座標（グリッド吸着済み、盤面外は負値もあり得る）、
      // 大きさ(cols,rows)はマス数。置ける場所に制限は無く、盤面から離れた位置にも置ける。
      case 'ADD_PANEL': {
        const {
          id, image = null, text = '', x = 0, y = 0, cols = 2, rows = 2, locked = false,
          textAudience = null, keepOnSceneChange = false
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
          keepOnSceneChange: !!keepOnSceneChange
        });

        this.#commit(prevState, { panels: withMapEntry(prevState.panels, id, panel) });
        return;
      }

      // パネルの項目変更（固定/移動/サイズ/画像/テキスト）はPANEL_FIELD_PATCHESで共通処理する。

      case 'REMOVE_PANEL': {
        const { id } = payload;
        if (!prevState.panels[id]) return;

        this.#commit(prevState, { panels: withoutMapEntry(prevState.panels, id) });
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
      parameters: {},        // ルーム変数（後述）
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
      bcdiceSystem, // BCDiceのシステムID（例: 'Cthulhu7th'）。ルーム単位で全員共通
      originalTables: {}, // ユーザー定義のダイス表。キーはタイトル（後述、original-table-dialog.js参照）

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

    // チャットタブ（Mainタブは常に存在する既定タブ）とタブごとのログ履歴
    chatTabs: [{ id: MAIN_CHAT_TAB_ID, name: 'Main' }],
    chatLogs: { [MAIN_CHAT_TAB_ID]: [] },

    // 情報（js/info-panel.js）。タイトル＋内容の組を浮動パネルのタブとして並べる共有メモ。
    // { id, title, ownerId, sections: [{ id, label, body, audience }] } の配列。
    // ownerIdは作成者の参加者ID（null＝表示名未設定の人が作った＝誰でも編集できる）。
    // sectionsは1エントリ内の区画で、公開先(audience)をエントリではなくsectionが持つ。
    // 将来のダブルハンドアウト（表の使命／裏の使命）で「表＝audience:null、裏＝限定公開」を
    // 1エントリに同居させるための構造で、現状のUIは必ず1件だけ作る。
    infoEntries: [],

    // 参加者一覧（js/local-identity.jsの表示名から導出した公開IDがキー）。
    // { [id]: { id, nickname, isGm } }。
    participants: {},

    // ラウンド進行（Core機能）。詳細はcreateInitialRoundState()参照
    round: createInitialRoundState()
  };
}

export const store = new ImmutableStore(createInitialGameState());
