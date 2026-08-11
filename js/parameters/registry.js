// js/parameters/registry.js
// プラグイン記述子の一覧。Coreはこの中身を解釈せず、ただの対応表として扱う。

import { DX3_PLUGIN } from './dx3.js';
import { SHINOBIGAMI_PLUGIN } from './shinobigami.js';
// import { GCREST_PLUGIN } from './gcrest.js'; // 将来追加時はこの形で増やす

const PLUGINS = {
  DX3: DX3_PLUGIN,
  SHINOBIGAMI: SHINOBIGAMI_PLUGIN,
  // GCREST: GCREST_PLUGIN,
};

export function listPlugins() {
  return Object.values(PLUGINS); // ルーム設定UIのセレクト肢に使う
}

export function buildCharacterParametersForPlugin(pluginId) {
  const plugin = PLUGINS[pluginId];
  return plugin?.buildCharacterParameters ? plugin.buildCharacterParameters() : {};
}

export function buildRoomParameters(pluginId) {
  const plugin = PLUGINS[pluginId];
  return plugin?.buildRoomParameters ? plugin.buildRoomParameters() : {};
}

// Coreの既定ラウンド進行テンプレート。プラグインがbuildRoundPhaseTemplateを
// 持たない場合はこれを使う。
// kind: 'once'（1回きり）| 'perCharacter'（参加者全員に1回ずつ手番が回る）
//   | 'plot'（参加者それぞれが数字を伏せて出し、進行役の合図で一斉に公開する段）
// expirePhaseOnComplete: このフェーズを抜ける時にEXPIRE_BUFFSと同じバフ剥がしを自動発火するか
//   （'round'を指定すると、その内側のプロセス・判定のバフもまとめて剥がれる）
// preTurnStep: 各キャラの手番の直前に挟む段（perCharacterのみ意味を持つ。nullなら挟まない）。
//   「挟める段があるか」はテンプレート側＝将来はプラグイン/ユーザー定義が宣言し、
//   「今回それを使うか」はルーム設定（room.roundSettings.useInitiativeProcess）が決める。
//   この段を抜ける時に次の行動者を決め直すので、直前のバフで変わった行動値も反映される。
// plot: 出せる数字の範囲 { min, max }（kind:'plot'のみ意味を持つ）。シノビガミのプロットが
//   これで、値の意味（大きいほど先に動く）はCore側に固定。範囲だけプラグインが決める。
// turnOrder: 手番順の出どころ（perCharacterのみ意味を持つ）。
//   省略時＝'initiative'（core:initiativeの実効値の降順）。'plot'ならプロット値の降順。
//   詳しくはjs/game-store.jsのsortForTurnOrder。
const DEFAULT_ROUND_PHASE_TEMPLATE = [
  { id: 'setup', label: 'セットアップ', kind: 'once', expirePhaseOnComplete: null, preTurnStep: null },
  {
    id: 'action', label: 'キャラクター行動', kind: 'perCharacter',
    expirePhaseOnComplete: null,
    preTurnStep: { id: 'initiative', label: 'イニシアチブプロセス' }
  },
  { id: 'cleanup', label: 'クリンナップ', kind: 'once', expirePhaseOnComplete: 'round', preTurnStep: null }
];

// 指定プラグインのラウンド進行フェーズテンプレートを返す。プラグイン未定義/未対応なら
// Core既定のテンプレートにフォールバックする（buildRoomParameters等と同じ規約）。
export function getRoundPhaseTemplate(pluginId) {
  const plugin = PLUGINS[pluginId];
  const template = plugin?.buildRoundPhaseTemplate ? plugin.buildRoundPhaseTemplate() : null;
  return (template && template.length > 0) ? template : DEFAULT_ROUND_PHASE_TEMPLATE;
}

// 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか
export function pluginHasCharacterPanel(pluginId) {
  return !!PLUGINS[pluginId]?.renderCharacterPanel;
}

/**
 * キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。
 * Coreはcontainerを渡すだけで、中身の意味・デザインはプラグインに委ねる（解釈しない）。
 * @param {string} pluginId
 * modeは「コマが既に存在するか」、canEditは「この人が書き換えてよいか」で意味が別。
 * canEdit:falseは他人のコマを表示だけしている状態で、ボックスを開くボタンは押せたままに
 * したいので、何を止めるかはプラグイン側に委ねる（js/character-dialog.jsのbuildPluginPanel参照）。
 * @param {{ container: HTMLElement, mode: 'create'|'edit', canEdit: boolean, parameters: Record<string, any> }} context
 * @returns {{ getValues: () => Record<string, number> } | null}
 *   getValues() はダイアログのsubmit時に呼ばれ、{paramId: value}を返す。
 *   プラグインが専用UIを持たない場合はnullを返す。
 */
export function renderCharacterPanel(pluginId, context) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.renderCharacterPanel) return null;
  return plugin.renderCharacterPanel(context) || null;
}

// 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか
export function pluginHasCharacterImport(pluginId) {
  return !!PLUGINS[pluginId]?.importCharacterJson;
}

/**
 * ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の
 * 知識で解釈させる。Coreはjsonをそのまま渡すだけで、フィールドの意味は解釈しない。
 * @param {string} pluginId
 * @param {any} json
 * @returns {{
 *   name?: string,
 *   valueOverrides: Record<string, number>,
 *   labelOverrides: Record<string, string>,
 *   newParameters: Record<string, {key:string,label:string,value:number,source:string,visible?:boolean}>
 * } | null}
 */
export function importCharacterJsonForPlugin(pluginId, json) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.importCharacterJson) return null;
  return plugin.importCharacterJson(json) || null;
}

/**
 * チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして
 * 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。Coreはコマンドの構文を解釈せず、
 * プラグインのhandleChatCommandにそのまま委ねる。
 * @param {string} pluginId
 * @param {string} rawInput
 * @param {object} context プラグインが実行に必要とする値一式（token/dispatch等）
 * @returns {boolean} コマンドとして処理されたか。プラグイン未適用/非対応の場合はfalse。
 */
export function handlePluginChatCommand(pluginId, rawInput, context) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.handleChatCommand) return false;
  return plugin.handleChatCommand(rawInput, context);
}

/**
 * 入力がどのプラグインのコマンド構文に見えるかを返す。判定はプラグイン側（looksLikeOwnChatCommand）に
 * 委ね、Coreは構文を知らないまま「このコマンドは別のプラグインのものだ」と判断できるようにする。
 * プラグイン未適用の部屋でプラグインのコマンドを打つと、handlePluginChatCommandが呼ばれずに
 * 素通りしてただの発言になってしまうため、その理由を出すために使う（js/main.js参照）。
 * @param {string} rawInput
 * @returns {{id:string, label:string}|null} 該当プラグインの記述子（無ければnull）
 */
export function findPluginForChatCommand(rawInput) {
  return Object.values(PLUGINS).find(plugin => plugin.looksLikeOwnChatCommand?.(rawInput)) ?? null;
}

/**
 * シーン/ラウンド/シナリオ終了等のフェーズ終了時、プラグイン固有のcomponents（DX3なら
 * エフェクトの使用回数等）をリセットする。Coreはcomponentsの中身を解釈しないため、
 * 「フェーズが終了した」という事実だけをプラグインに渡し、何をリセットするかは
 * プラグイン側（dx3.jsのresetComponentsOnPhaseEnd等）に委ねる。
 * フェーズの入れ子（シナリオ終了はシーン終了も兼ねる）はCore側のapplyPhaseEndが
 * 1段ずつ呼び分けて表現するので、プラグイン側は渡されたフェーズだけを見ればよい。
 * @param {string} pluginId
 * @param {Record<string, any>} components
 * @param {'scenario'|'scene'|'round'|'check'|'process'} phase
 * @returns {Record<string, any>} リセット後のcomponents（変化が無ければ同一参照）
 */
export function resetPluginComponentsOnPhaseEnd(pluginId, components, phase) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.resetComponentsOnPhaseEnd) return components;
  return plugin.resetComponentsOnPhaseEnd(components, phase) ?? components;
}

/**
 * バフ/デバフ付与ダイアログのプラグイン用スペースに、プラグイン自身の追加入力欄を描画させる。
 * Coreはcontainerと現在の対象パラメータを渡すだけで、何を出すかはプラグインに委ねる
 * （renderCharacterPanelと同じ委譲パターン）。
 * @param {string} pluginId
 * @param {{ container: HTMLElement, paramId: string|null }} context
 * @returns {{ sync: (paramId: string|null) => void, getMeta: () => object|null } | null}
 *   sync()は対象パラメータが切り替わるたびに呼ばれる（例: DX3はAcBのときだけ下限欄を出す）。
 *   getMeta()は付与時に呼ばれ、ADD_BUFFのmetaへそのまま渡る値を返す。
 *   プラグインが追加欄を持たない場合はnullを返す。
 */
export function renderPluginBuffFields(pluginId, context) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.buffFields?.render) return null;
  return plugin.buffFields.render(context) || null;
}

/**
 * バフ()チャットコマンドの省略可能な追加引数を、プラグインの知識でmetaへ変換する。
 * Coreはその文字列が何を意味するかを解釈しない（DX3ならクリティカル値の下限）。
 * @param {string} pluginId
 * @param {string|null} paramId バフの対象パラメータ
 * @param {string} text コマンドに書かれた追加引数
 * @returns {object|null} ADD_BUFFのmetaへ渡す値。解釈できなければnull。
 */
export function parsePluginBuffExtra(pluginId, paramId, text) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.buffFields?.parseExtra) return null;
  return plugin.buffFields.parseExtra(paramId, text) || null;
}

/**
 * バフ1件のmetaを、一覧やログへ添える1行の説明にする。
 * @param {string} pluginId
 * @param {{meta?: object|null}} buff
 * @returns {string} 説明（無ければ空文字）
 */
export function describePluginBuffMeta(pluginId, buff) {
  const plugin = PLUGINS[pluginId];
  if (!plugin?.buffFields?.describe) return '';
  return plugin.buffFields.describe(buff) || '';
}

/**
 * プラグインの既定パラメータのうち、まだそのコマが持っていないものを補う。
 * パラメータはコマ作成時にしか組み立てられないため、プラグインへ後からパラメータを
 * 足すと、それ以前に作られたコマには存在しないまま＝自動計算の結果を入れる先が無い、
 * という状態になる（applyPluginDerivedParametersは既存のparamIdしか更新しないため）。
 *
 * 補完対象をlocked:true（＝ユーザーが削除できないパラメータ）に限るのが肝で、
 * こうしておけば「ユーザーが消したはずのパラメータが勝手に復活する」ことは起きない。
 */
function withMissingPluginParameters(plugin, parameters) {
  if (!plugin?.buildCharacterParameters) return parameters;

  const defaults = plugin.buildCharacterParameters();
  const missing = Object.entries(defaults).filter(
    ([paramId, def]) => def.locked && !parameters[paramId]
  );
  if (missing.length === 0) return parameters;

  const nextParameters = { ...parameters };
  missing.forEach(([paramId, def]) => {
    nextParameters[paramId] = def; // buildParameters側で既にfreeze済み
  });
  return nextParameters;
}

/**
 * キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す。
 * componentsを併せて渡すのは、ロイス数のように「ボックスのデータから決まるパラメータ」があるため。
 * Coreはcomponentsの中身を解釈せず、そのままプラグインへ渡すだけ。
 * contextは「コマ自身の外から決まる値」。componentsと同じくCoreは中身を解釈せず、
 * 事実だけを渡してプラグインに意味付けを委ねる（シノビガミのファンブル値は、そのコマが
 * 出したプロットで決まる）。呼び出し側はjs/game-store.jsのbuildDerivedContextで組む。
 *
 * @param {string} pluginId
 * @param {Record<string, any>} parameters
 * @param {Record<string, any>} [components] コマのcomponents（ロイス・エフェクト等）
 * @param {{
 *   tokenId: string|null,
 *   roundActive: boolean,      ラウンド進行中か（＝シノビガミで言う戦闘中か）
 *   plotValue: number|null,    そのコマが出したプロット値。未提出・非公開ならnull
 *   plotsRevealed: boolean     プロットが公開済みか
 * }} [context]
 * @returns {Record<string, any>} 計算適用後のパラメータリスト
 */
export function applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {}) {
  const plugin = PLUGINS[pluginId];
  if (!plugin) return parameters; // プラグイン未適用ならそのまま返す

  const baseParameters = withMissingPluginParameters(plugin, parameters);

  if (!plugin.computeDerivedParameters) {
    return baseParameters === parameters ? parameters : Object.freeze(baseParameters);
  }

  // プラグイン側で計算された差分 { "DX3:corDB": 2, ... } を取得
  const updates = plugin.computeDerivedParameters(baseParameters, components, context);
  if (!updates || Object.keys(updates).length === 0) {
    return baseParameters === parameters ? parameters : Object.freeze(baseParameters);
  }

  // 差分をもとにイミュータブルに新しいパラメータオブジェクト群を生成
  const nextParameters = { ...baseParameters };
  Object.entries(updates).forEach(([paramId, newValue]) => {
    if (nextParameters[paramId] && nextParameters[paramId].value !== newValue) {
      nextParameters[paramId] = Object.freeze({
        ...nextParameters[paramId],
        value: newValue
      });
    }
  });

  return Object.freeze(nextParameters);
}