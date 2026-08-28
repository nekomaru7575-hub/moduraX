// js/game-store.js
// 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない
// 純粋なモジュール。ブラウザ（board-data-driven.js経由）とNode（server/index.js）の
// 両方からimportして、同じreducerを共有するために切り出している。
//
// 【js/store/ との分担】
// このファイルが持つのは「アクションを受けて次の状態を確定する」ところだけ。
// case が使う道具（IDの採番・パラメータの差し替え・カードの形の整え・ラウンド進行の
// 読み取りなど）は js/store/ 配下へ分けてある。依存は一方向で、js/store/ の各モジュールは
// game-store.js を知らない。
//
// 公開APIは分ける前と同じ。移した分は下で名指しの再exportにしてあるので、
// import 元（15ファイル）はどれも `from './game-store.js'` のままでよい。

import { EventBus } from './EventBus.js';
import { buildDefaultParameters, buildDefaultRoomParameters } from './parameters/core.js';
import {
  applyPluginDerivedParameters, buildCharacterParametersForPlugin, buildRoomParameters,
  getRoundPhaseTemplate, listPlugins, withPluginParameterDeclarations
} from './parameters/registry.js';
import { findStamp } from './stamp-registry.js';
import { AUDIO_CHANNELS, SCENE_BGM_STOP } from './store/audio.js';
import {
  applyPhaseEnd, formatExpiredBuffsNote, listExpiringBuffNames, resetPluginComponentsForPhase
} from './store/buffs.js';
import {
  CARD_COLS, MAX_CARD_SEEN_BY, MAX_DECK_CARDS, MAX_DECK_TEMPLATES, MAX_DRAW_COUNT, MAX_ROOM_CARDS,
  MAX_ROOM_DECKS, buildCard, buildDeck, buildDeckTemplate, findFreeCardSpot, nextStockerSeq,
  normalizeCardBack, normalizeCardMap, normalizeDeckMap, normalizeDeckTemplateMap,
  releaseStockerCards, stockerAllowsUser, withoutLostStockerCards
} from './store/cards.js';
import {
  MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID, SYSTEM_CHAT_TAB_NAME, withBgmLog, withChatEntry,
  withFixedChatTabs, withSystemLog, withSystemTabLog
} from './store/chat.js';
import { generatePlotSlotId } from './store/ids.js';
import { buildInfoSection, normalizeInfoEntries } from './store/info.js';
import {
  buildUserParam, getEffectiveParameterValue, withEditableParamFields, withNewUserParam,
  withParamFields, withoutParam
} from './store/params.js';
import {
  definedFields, fieldPatchFor, freezePanelMap, normalizeAudience, normalizeStackOrder,
  patchCharacter, withMapEntry, withoutMapEntry
} from './store/patch.js';
import {
  BOARD_GRID_SIZE, DEFAULT_BOARD_COLS, DEFAULT_BOARD_ROWS, DEFAULT_TOKEN_COLOR,
  showsEntryMessages, snapsToGrid, usesInitiativeProcess, withDerivedRoomParameters
} from './store/room.js';
import {
  applyRoundPhaseStart, buildDerivedContext, createInitialRoundState, hasUnchosenPlot,
  initialStepForPhase, joinTokenNames, listPlotSlotRows, listTiedPlotTokenIds,
  listUnactedParticipants, normalizePlotSlotLabel, normalizeRoundState, pickNextActor,
  recomputeDerivedForRound, sortByInitiative, sortForTurnOrder
} from './store/round-state.js';

// 移す前と同じ名前で使えるようにしておく（15ファイルの import 元を変えないため）。
// 「何がこのモジュールの公開APIか」を残したいので export * は使わない。
export { AUDIO_CHANNELS, AUDIO_CHANNEL_LABELS, SCENE_BGM_STOP } from './store/audio.js';
export {
  BUFF_PHASE_LABELS, PHASE_HIERARCHY, formatExpiredBuffsNote, getPhaseChain,
  listExpiringBuffNames
} from './store/buffs.js';
export { CARD_COLS, CARD_ROWS, DEFAULT_CARD_STACK_ORDER } from './store/cards.js';
export { MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID, SYSTEM_CHAT_TAB_NAME } from './store/chat.js';
export {
  generateBuffId, generateCardId, generateDeckId, generateDeckTemplateId, generateInfoEntryId,
  generateInfoSectionId, generatePanelId, generatePlotSlotId, generateTokenId
} from './store/ids.js';
export {
  DEFAULT_INFO_MASK_CHAR, MAX_INFO_MASKS_PER_SECTION, MAX_INFO_MASK_CHAR_LENGTH,
  MAX_INFO_MASK_TEXT_LENGTH, listMaskMarkers, normalizeInfoEntries
} from './store/info.js';
export { getEffectiveParameterValue } from './store/params.js';
export { normalizeStackOrder } from './store/patch.js';
export {
  DEFAULT_TOKEN_COLOR, showsEntryMessages, snapsToGrid, usesInitiativeProcess
} from './store/room.js';
export {
  describePlotSlotName, hasUnchosenPlot, listPlotSlotRows, listPlotSlots, listTiedPlotSlotKeys,
  listTiedPlotTokenIds, listUnactedParticipants, pickNextActor, plotSlotKey, resolvedPlotSlot
} from './store/round-state.js';

// スタンプの集計1件（1人ぶん）が取りうる上限。桁あふれした値を書き込まれても表示が
// 壊れないようにするための歯止めで、実際の使用でここに届くことは想定していない。
const MAX_STAMP_COUNT = 1_000_000;

export { listPlugins };

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
    const characterFieldPatch = fieldPatchFor(CHARACTER_FIELD_PATCHES, action);
    if (characterFieldPatch) {
      const { id } = payload;
      const fields = nextTokensState[id] ? characterFieldPatch(payload) : null;
      if (!fields) return;

      patchCharacter(nextTokensState, id, fields);
      this.#commit(prevState, { tokens: nextTokensState });
      return;
    }

    const panelFieldPatch = fieldPatchFor(PANEL_FIELD_PATCHES, action);
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

    const cardFieldPatch = fieldPatchFor(CARD_FIELD_PATCHES, action);
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

    const deckFieldPatch = fieldPatchFor(DECK_FIELD_PATCHES, action);
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

      // --- ラウンド進行（Core機能）。詳細はcreateInitialRoundState()のコメント参照。
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
        const withdrawn = (round.withdrawn || []).filter(id => participants.includes(id));
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
            ...round, participants, acted, withdrawn, currentActorId, interruptId,
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

      // 戦闘離脱の付け外し。離脱させると以降の手番決定（pickNextActor）・プロット提出対象から
      // 外れる（listUnactedParticipants・js/round-panel.jsのlistMyPlotTokenIdsが見る）。
      // 復帰時は必ず未行動へ戻す（actedからも外す。「もう一度離脱すると行動済みのまま」という
      // 分かりにくい状態を避けるため）。割り込み予約中のコマを離脱させた場合は予約も一緒に外す
      // （離脱者が次の手番へ割り込むのは筋が悪い）。
      case 'ROUND_SET_WITHDRAWN': {
        const { tokenId, withdrawn } = payload;
        const round = prevState.round;
        if (!round.active || !round.participants.includes(tokenId)) return;

        const current = round.withdrawn || [];
        const isWithdrawn = current.includes(tokenId);
        if (isWithdrawn === !!withdrawn) return; // 変化なし

        const nextWithdrawn = withdrawn ? [...current, tokenId] : current.filter(id => id !== tokenId);
        // 復帰時は「未行動で復帰」を保証するため、行動済みからも外す
        const acted = withdrawn ? (round.acted || []) : (round.acted || []).filter(id => id !== tokenId);
        const interruptId = withdrawn && round.interruptId === tokenId ? null : round.interruptId;
        const name = nextTokensState[tokenId]?.name || '？';

        this.#commit(prevState, {
          round: { ...round, withdrawn: nextWithdrawn, acted, interruptId },
          chatLogs: withSystemLog(
            prevState.chatLogs,
            withdrawn ? `${name}が戦闘から離脱しました。` : `${name}が戦闘に復帰しました。`,
            payload?.time
          )
        });
        return;
      }

      // 次の手番への割り込み指定。行動済みのコマにも割り込ませられるよう、ここで
      // actedからも外しておく（回復と割り込みが1操作で済み、pickNextActor側は
      // 「参加者に残っているか」だけを見ればよくなる）。tokenId=nullで予約解除。
      // 進行中の手番は中断しない（あくまで「次の手番」に割り込む）。離脱済みのコマは
      // 割り込ませられない（ROUND_SET_WITHDRAWN側で予約解除も行うが、ここでも二重に防ぐ）。
      case 'ROUND_SET_INTERRUPT': {
        const { tokenId = null } = payload;
        const round = prevState.round;
        if (!round.active) return;
        if (tokenId && !round.participants.includes(tokenId)) return;
        if (tokenId && (round.withdrawn || []).includes(tokenId)) return;

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

      // マス目への吸着（js/main.jsのルーム設定）。オフにすると、盤面のオブジェクトは
      // 離した位置にそのまま留まり、マス目の線も描かれなくなる。
      // 既にある物の位置はここでは動かさない：オンへ戻した瞬間に盤面が並び替わると、
      // 意図して置いた微調整が黙って失われる。次にドラッグして離した時点で吸着する。
      case 'SET_GRID_SNAP': {
        const { enabled } = payload;
        const room = prevState.room;
        const next = !!enabled;
        if (snapsToGrid(prevState) === next) return;

        this.#commit(prevState, {
          room: { ...room, snapToGrid: next }
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
        // 数を見るのは新規のときだけ。同じidでの上書きは数が増えないので通す
        // （「キー重複＝上書き」の規則を上限のせいで壊さないため）。
        if (!room.deckTemplates?.[id]
          && Object.keys(room.deckTemplates || {}).length >= MAX_DECK_TEMPLATES) return;

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
        if (Object.keys(prevState.cards).length >= MAX_ROOM_CARDS) return;

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
      // 【箱から箱への移動も受け付ける】既に別の箱に入っているカードでも、移動先の権限
      // だけでなく移動元の権限も確認したうえで動かす。移動元の確認を省くと、権限のない人が
      // 他人の専用ストッカーから自分の箱へカードを引き抜けてしまう（「取り出す」が移動元の
      // 権限を見ているのと同じ理由）。盤面のカード（stockerIdがnull）は移動元が無いので、
      // ここは常に素通りする＝既存のドラッグ&ドロップの挙動は変わらない。
      case 'STORE_CARD_IN_STOCKER': {
        const { cardId, panelId, participantId = null, localUserId = null } = payload;
        const card = prevState.cards[cardId];
        const panel = prevState.panels[panelId];
        if (!card || !panel) return;
        if (card.stockerId === panelId) return; // 既に同じ箱の中
        if (!stockerAllowsUser(panel, participantId, localUserId)) return;
        if (card.stockerId) {
          const sourcePanel = prevState.panels[card.stockerId];
          if (sourcePanel && !stockerAllowsUser(sourcePanel, participantId, localUserId)) return;
        }

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
        if (Object.keys(prevState.decks).length >= MAX_ROOM_DECKS) return;

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

      // デッキの一番上からn枚引く。表向き(faceUp:true)/裏向きで盤面へ出すか、stockerIdを
      // 渡してストッカーへ直接収納するかの3択（js/board-data-driven.jsのopenDeckMenu）。
      // 盤面へ出す場合の置き場所はデッキの位置から導く（findFreeCardSpot）ので、全員の画面で
      // 同じ位置に出る。gridSizeは描画側の定数（js/board-data-driven.jsのGRID_SIZE）で、
      // game-storeは画面の都合を持たない方針なのでpayloadで受け取る。
      // ストッカーへ送る場合はstockerAllowsUserで権限を確かめる（STORE_CARD_IN_STOCKERと同じ
      // 規則）。ストッカーの中では表/裏の区別が描画に効かない（storedカードは盤面に描かれない）
      // ので、送るカードの状態は問わず一律faceUp:falseにする。
      case 'DRAW_CARDS': {
        const {
          deckId, count = 1, faceUp = false, gridSize = 25,
          stockerId = null, participantId = null, localUserId = null
        } = payload;
        const deck = prevState.decks[deckId];
        if (!deck || deck.cards.length === 0) return;

        let targetPanel = null;
        if (stockerId) {
          targetPanel = prevState.panels[stockerId];
          if (!stockerAllowsUser(targetPanel, participantId, localUserId)) return;
        }

        const grid = Math.max(1, Math.round(Number(gridSize) || 25));
        // 部屋の残り枠でも切る。断るのではなく引ける分だけ引くのは、山の残り枚数で
        // 切るのと同じ扱い（上限に触れた瞬間にボタンが無反応になるより素直）。
        const freeSlots = MAX_ROOM_CARDS - Object.keys(prevState.cards).length;
        if (freeSlots <= 0) return;
        const drawCount = Math.min(
          Math.max(1, Math.round(Number(count) || 1)),
          MAX_DRAW_COUNT,
          deck.cards.length,
          freeSlots
        );

        const drawn = deck.cards.slice(0, drawCount);
        let nextCards = prevState.cards;
        let nextSeq = targetPanel ? nextStockerSeq(nextCards) : 0;

        drawn.forEach((card, index) => {
          if (targetPanel) {
            nextCards = withMapEntry(nextCards, card.id, buildCard({
              id: card.id,
              face: card.face,
              back: deck.back,
              faceUp: false,
              deckId: deck.id,
              stockerId: targetPanel.id,
              stockerSeq: nextSeq
            }));
            nextSeq += 1;
          } else {
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
          }
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
            const fields = definedFields(patch);
            // 伏せた語の公開状態(revealed)は、編集画面が開かれてから誰かが動かしている
            // かもしれない。本文を直しただけで開示を巻き戻さないよう、編集画面は
            // revealedを送らず、ここで同じidの旧maskから引き継ぐ。
            // （hydrate・取り込みはファイル側のrevealedを読む必要があるので、この
            // 引き継ぎはbuildInfoSectionではなくこの場所に置いてある。）
            if (Array.isArray(fields.masks)) {
              const prevRevealed = new Map(nextSections[index].masks.map(m => [m.id, m.revealed]));
              fields.masks = fields.masks.map(m => (
                (m && typeof m === 'object') ? { ...m, revealed: prevRevealed.get(m.id) === true } : m
              ));
            }
            nextSections[index] = buildInfoSection({ ...nextSections[index], ...fields });
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

      // 伏せた語1つの公開/非公開を決める（フタリソウサの「知ってたカード」のように、
      // 本文は見せたまま一部の語だけを伏せておき、1語ずつ開いていく遊び方のため）。
      // TOGGLEにしないのは、このreducerがクライアントの楽観適用と権威側の両方で走り、
      // RESYNC後にも当て直されるため。SETなら何度当てても同じ状態に落ち着く。
      case 'SET_INFO_MASK_REVEALED': {
        const { id, sectionId, maskId, revealed } = payload;
        const target = prevState.infoEntries.find(entry => entry.id === id);
        if (!target) return;
        const section = target.sections.find(s => s.id === sectionId);
        if (!section) return;
        // 目印を消した編集と、その語を開く操作がすれ違うと、もう無いmaskが指される。
        // idは「今ある一番大きい番号＋1」で採るので取り直しも起こりうるが、当たっても
        // 「1語が開く／閉じる」だけなので、ここで黙って捨てるだけにしておく。
        const mask = section.masks.find(m => m.id === maskId);
        if (!mask) return;

        const nextRevealed = revealed === true;
        // 値が変わらないなら何も配らない。commitすると新しいinfoEntriesができて、
        // js/info-panel.jsの参照等価チェックが空振りし、毎回全再描画になってしまう。
        if (mask.revealed === nextRevealed) return;

        this.#commit(prevState, {
          infoEntries: prevState.infoEntries.map(entry => (
            entry.id === id
              ? Object.freeze({
                  ...entry,
                  sections: Object.freeze(entry.sections.map(s => (
                    s.id === sectionId
                      ? buildInfoSection({
                          ...s,
                          masks: s.masks.map(m => (m.id === maskId ? { ...m, revealed: nextRevealed } : m))
                        })
                      : s
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
      // null = 自動（ビューポートをマス単位に切り上げたサイズ。resolveBoardPixelSize参照）。
      // 新しい部屋は自動にせず、決まった広さから始める（DEFAULT_BOARD_COLS/ROWS参照）。
      boardWidth: DEFAULT_BOARD_COLS * BOARD_GRID_SIZE,
      boardHeight: DEFAULT_BOARD_ROWS * BOARD_GRID_SIZE,
      showGrid: true,        // マス目（グリッド線）を敷くか。地図画像をそのまま見せたい時に外す
      // 盤面のオブジェクトをマス目へ吸着させるか（SET_GRID_SNAP・snapsToGrid）。
      // 外すと離した位置にそのまま置けるようになり、マス目の線も描かれなくなる。
      snapToGrid: true,
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
    // { id, title, ownerId, sections: [{ id, label, body, audience, masks }] } の配列。
    // ownerIdは作成者の参加者ID（null＝表示名未設定の人が作った＝誰でも編集できる）。
    // sectionsは1エントリ内の区画で、公開先(audience)をエントリではなくsectionが持つ。
    // masksは「本文の一部の語だけを伏せる」ためのもので、公開先とは別の軸。区画が見える
    // 相手に対して、語ごとに公開/非公開を切り替える（フタリソウサの「知ってたカード」）。
    // 本文中の目印 {{n}} と対で、伏せている間は文字数が分からないよう伏せ字1文字だけを描く。
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
