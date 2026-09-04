// js/store/handlers/room.js
// 部屋そのものの設定（名前・システム・プラグイン・背景・盤面の振る舞い）と、
// 部屋に置いておくもの（ルーム変数・オリジナル表・スタンプ）。
//
// この節の多くはGM限定（server/index.js の GM_ONLY_ACTIONS）。誰が呼んでよいかは
// ここでは見ず、js/room-authority.js とサーバー側が決める。

import { EventBus } from '../../EventBus.js';
import { applyPluginDerivedParameters, buildRoomParameters } from '../../parameters/registry.js';
import { withEditableParamFields, withNewUserParam, withoutParam } from '../params.js';
import { patchCharacter, withMapEntry, withoutMapEntry } from '../patch.js';
import { showsEntryMessages, snapsToGrid, withDerivedRoomParameters } from '../room.js';
import { MAX_ROOM_STAMPS, normalizeRoomStamp, roomStampPublicId } from '../stamps.js';
import { buildDerivedContext } from '../round-state.js';

export const ROOM_HANDLERS = {
  // 入室メッセージ表示の切り替え。イニシアチブ設定と同じくルーム単位・全員共通で、
  // 同じダイアログ（roomSettingsDialog）から同じ権限判定（canOperateAsGm）を通して呼ばれる。
  SET_SHOW_ENTRY_MESSAGES({ prevState, payload, commit }) {
    const { enabled } = payload;
    const room = prevState.room;
    const next = !!enabled;
    if (showsEntryMessages(prevState) === next) return;

    commit({
      room: { ...room, showEntryMessages: next }
    });
  },

  // マス目への吸着（js/main.jsのルーム設定）。オフにすると、盤面のオブジェクトは
  // 離した位置にそのまま留まり、マス目の線も描かれなくなる。
  // 既にある物の位置はここでは動かさない：オンへ戻した瞬間に盤面が並び替わると、
  // 意図して置いた微調整が黙って失われる。次にドラッグして離した時点で吸着する。
  SET_GRID_SNAP({ prevState, payload, commit }) {
    const { enabled } = payload;
    const room = prevState.room;
    const next = !!enabled;
    if (snapsToGrid(prevState) === next) return;

    commit({
      room: { ...room, snapToGrid: next }
    });
  },

  // システムプラグインの切り替え。既存キャラ全員の自動計算値も再計算した上で
  // ルーム変数を作り直す。
  SET_ACTIVE_PLUGIN({ prevState, payload, activePlugin, nextTokensState, commit }) {
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

    commit({
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
  },

  // BCDiceのシステム（ダイスロールの解釈規則）を切り替える。キャラクターパラメータ用の
  // プラグイン（activePlugin）とは別軸の設定で、ルーム単位・全員共通にするためroomに置く。
  SET_BCDICE_SYSTEM({ prevState, payload, commit }) {
    const { system } = payload;
    if (!system) return;

    commit({ room: { ...prevState.room, bcdiceSystem: system } });
  },

  // 部屋名（複数部屋運用時のインデックスページ表示・見出し表示に使う）を変更する。
  SET_ROOM_NAME({ prevState, payload, commit }) {
    const { name } = payload;
    if (typeof name !== 'string') return;

    commit({ room: { ...prevState.room, name } });
  },

  // オリジナル表（ユーザー定義のダイス表）を登録する。キーはタイトルなので、既存と
  // 同じタイトルで登録し直すと上書きになる（誤登録の修正に使える）。
  ADD_ORIGINAL_TABLE({ prevState, payload, commit }) {
    const { title, dice, entries } = payload;
    if (!title || !dice || !entries) return;
    const room = prevState.room;

    const table = Object.freeze({ title, dice, entries: Object.freeze({ ...entries }) });

    commit({
      room: { ...room, originalTables: withMapEntry(room.originalTables, title, table) }
    });
  },

  // オリジナル表をタイトル指定で削除する（オリジナル表一覧の×ボタンから）。
  REMOVE_ORIGINAL_TABLE({ prevState, payload, commit }) {
    const { title } = payload;
    const room = prevState.room;
    if (!room.originalTables?.[title]) return;

    commit({
      room: { ...room, originalTables: withoutMapEntry(room.originalTables, title) }
    });
  },

  // 部屋に登録するスタンプ（js/room-stamp-list-dialog.js）。GM限定
  // （js/room-authority-rules.jsのGM_ONLY_ACTIONS）。
  //
  // payloadで受け取るのはローカルidで、公開ID（"room:xxx"）は normalizeRoomStamp が付ける。
  // 名前空間を送り手に決めさせないためで、これがCoreの'ok'やプラグインのスタンプを
  // 名乗られないための歯止めになっている（js/store/stamps.js）。
  //
  // 【ここがサーバー側の検証でもある】reducerはサーバーでも同じものが走るので
  // （server/index.jsが同じImmutableStoreをdispatchする）、ここに書いた上限とURLの
  // 許可リストがそのまま権威側の検証になる。server/index.jsに別途手当ては要らない
  // （COUNT_STAMPと同じ立て付け）。
  ADD_ROOM_STAMP({ prevState, payload, commit }) {
    const stamp = normalizeRoomStamp(payload);
    if (!stamp) return;

    const room = prevState.room;
    const stamps = room.stamps || {};

    // 数を見るのは新規のときだけ。同じidでの上書き（＝編集）は数が増えないので、
    // 上限に達していても通す（SAVE_DECK_TEMPLATEと同じ）。
    if (!Object.prototype.hasOwnProperty.call(stamps, stamp.id)
      && Object.keys(stamps).length >= MAX_ROOM_STAMPS) return;

    commit({ room: { ...room, stamps: withMapEntry(stamps, stamp.id, stamp) } });
  },

  // 部屋のスタンプをローカルid指定で削除する（一覧の×ボタンから）。
  // 実体（R2のオブジェクト）の掃除はサーバー側が行う（server/index.jsのremovedStampKey）。
  REMOVE_ROOM_STAMP({ prevState, payload, commit }) {
    // 追加と同じ導出を通す。ここで自前に組み立てると、追加側と食い違ったときに
    // 「消したのに残る」が起きる。
    const id = roomStampPublicId(String(payload?.id ?? ''));
    const room = prevState.room;
    const stamps = room.stamps || {};
    if (!Object.prototype.hasOwnProperty.call(stamps, id)) return;

    commit({ room: { ...room, stamps: withoutMapEntry(stamps, id) } });
  },

  // 背景設定（js/background-dialog.js）。画像・盤面サイズ・シーンチェンジでの扱いを
  // 1つのダイアログで決めるので、まとめて1回のdispatchで反映する。
  // imageKeyはR2に実体がある場合のキー（部屋削除時の掃除に使う）。外部URLや、
  // R2へ移行する前に保存されたデータURLの背景ではnullのまま。
  SET_BOARD_BACKGROUND({ prevState, payload, commit }) {
    const {
      imageUrl, imageKey = null, boardWidth = null, boardHeight = null,
      showGrid = true, keepOnSceneChange = false
    } = payload;

    commit({
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
  },

  // --- ルーム変数。コマのパラメータと同じ編集規則（editable/locked）を共通ヘルパーで共有する ---
  SET_ROOM_PARAMETER({ prevState, payload, commit }) {
    const { paramId, value } = payload;
    const room = prevState.room;

    const nextParams = withEditableParamFields(room.parameters, paramId, { value }, 'このルーム変数');
    if (!nextParams) return;

    commit({ room: { ...room, parameters: nextParams } });
    EventBus.emit('RoomParameterChanged', { paramId, value });
  },

  ADD_ROOM_PARAMETER({ prevState, payload, commit }) {
    const { key, label, value } = payload;
    if (!key) return;
    const room = prevState.room;

    const nextParams = withNewUserParam(room.parameters, { key, label, value });
    if (!nextParams) return;

    commit({ room: { ...room, parameters: nextParams } });
  },

  REMOVE_ROOM_PARAMETER({ prevState, payload, commit }) {
    const { paramId } = payload;
    const room = prevState.room;

    const nextParams = withoutParam(room.parameters, paramId, 'このルーム変数');
    if (!nextParams) return;

    commit({ room: { ...room, parameters: nextParams } });
  },
};