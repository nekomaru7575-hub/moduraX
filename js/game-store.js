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
import { buildDefaultRoomParameters } from './parameters/core.js';
import { buildRoomParameters, listPlugins } from './parameters/registry.js';
import {
  normalizeCardBack, normalizeCardMap, normalizeDeckMap, normalizeDeckTemplateMap,
  withoutLostStockerCards
} from './store/cards.js';
import {
  MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID, SYSTEM_CHAT_TAB_NAME, withFixedChatTabs
} from './store/chat.js';
import { normalizeInfoEntries } from './store/info.js';
import {
  fieldPatchFor, normalizeAudience, normalizeStackOrder, patchCharacter, withMapEntry
} from './store/patch.js';
import {
  BOARD_GRID_SIZE, DEFAULT_BOARD_COLS, DEFAULT_BOARD_ROWS, withDerivedRoomParameters
} from './store/room.js';
import { createInitialRoundState, normalizeRoundState } from './store/round-state.js';
import { ACTION_HANDLERS } from './store/handlers/index.js';

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

    // アクション名でハンドラを引いて渡すだけ。何をどう変えるかは js/store/handlers/ 側にある。
    const handler = ACTION_HANDLERS[action];
    if (!handler) return;

    handler({
      prevState,
      payload,
      activePlugin,
      nextTokensState,
      commit: (patch) => this.#commit(prevState, patch)
    });
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
