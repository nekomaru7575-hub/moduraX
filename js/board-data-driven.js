// js/board-data-driven.js

import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { bindDragGesture, LONG_PRESS_ONLY } from './drag-gesture.js';
import { loadImageDimensions } from './image-dimensions.js';
import { showCharacterDialog, showCharacterEditDialog, applyImageCropStyle, applyCharacterEditResult } from './character-dialog.js';
import { showBackgroundDialog } from './background-dialog.js';
import { showPanelDialog } from './panel-dialog.js';
import { showDrawCountDialog, showCardPeekDialog, showStockerSendDialog } from './deck-dialog.js';
import { showAddBuffDialog, showBuffListDialog } from './buff-dialog.js';
import {
  pluginHasCharacterImport, importCharacterJsonForPlugin, getPluginSheetSource
} from './parameters/registry.js';
import { promptForCharacterSheetJson } from './character-sheet-import.js';
import { pickFileAsText } from './file-uploader.js';
import { adoptImageIntoRoom, pickAndUploadImage } from './image-upload.js';
import { importCharacterJsonGeneric } from './character-json-import.js';
import { getLocalUserId, getCurrentParticipantId } from './local-identity.js';
import { showAudienceDialog } from './audience-picker.js';
import { canView, isGm } from './visibility.js';
import { canOperateAsGm, canOperateToken, GM_ONLY_REASON } from './room-authority.js';
import { rollBCDice } from './BCdice.js';
import { isTokenSnapshot, buildTokenSnapshot, downloadJSON, parseJsonText } from './character-snapshot.js';
import { findStamp, listStamps } from './stamp-registry.js';
import { collectImageUrls } from './store/images.js';
import { MAX_PANEL_CHAT_TEXT_LENGTH } from './store/panels.js';
import { ownEntry } from './store/patch.js';
import {
  store, generateTokenId, generatePanelId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS, normalizeStackOrder, snapsToGrid,
  AUDIO_CHANNEL_LABELS
} from './game-store.js';
export {
  store, generateTokenId, generateBuffId, listPlugins, DEFAULT_TOKEN_COLOR,
  getEffectiveParameterValue, BUFF_PHASE_LABELS
};

// 浮動パネル（チャットパレット・情報・キャラクター一覧・スタンプ送信）。盤外の右クリック
// メニューから表示/非表示を切り替えるためだけに参照する。importは 生成側 →
// board-data-driven.js の向きに張られている（逆向きは循環importになる）ので、実体は
// 起動時に注入してもらう。
// 生成側はパネルごとに違う：チャットパレットはjs/main.js、情報はjs/info-panel.js、
// キャラクター一覧はjs/character-panel.js、スタンプ送信はjs/stamp-panel.js。
let chatPaletteController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setChatPaletteController(controller) {
  chatPaletteController = controller;
}

// パネルのクリックオプションのうち、このファイルの外へ出ていく2つ。
// - 発言 … ダイスもパラメータ増減も解釈させたいので、3つの発言経路が集まる
//          js/main.js の submitChatText を通す
// - スタンプ … 送信と集計をまとめてある js/stamp-layer.js の requestStamp を通す
// どちらも同じ理由で直接importできない：main.jsはこのファイルをimportしており、
// stamp-layer.jsもこのファイルからstoreをimportしているので、逆向きは循環になる。
// シーン変更と音楽変更はstoreへのdispatchだけで済むので、ここには要らない。
let panelClickSenders = { sendChat: null, sendStamp: null };

/** @param {{ sendChat: (text: string) => void, sendStamp: (stampId: string) => void }} senders */
export function setPanelClickSenders(senders) {
  panelClickSenders = senders;
}

let infoPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setInfoPanelController(controller) {
  infoPanelController = controller;
}

let characterPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setCharacterPanelController(controller) {
  characterPanelController = controller;
}

let stampPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setStampPanelController(controller) {
  stampPanelController = controller;
}

let checkPanelController = null;

/** @param {{ toggle: () => void, isVisible: () => boolean }} controller */
export function setCheckPanelController(controller) {
  checkPanelController = controller;
}

// 進行中のドラッグ（コマ・パネル・視点移動のうち1つ）。2本指になったら
// ピンチズームへ操作を明け渡すため、ここから打ち切れるようにしておく。
let activeBoardDrag = null;

// 盤外メニューの「〇〇を表示/隠す」1項目。狭幅レイアウトでは3つのパネルが中央スペースへ
// はめ込まれ、切り替えはタブが持つので、この項目自体を出さない（js/mobile-layout.js）。
function panelToggleItem(controller, label) {
  if (!controller || controller.isDocked?.()) return [];

  return [{
    label: controller.isVisible() ? `${label}を隠す` : `${label}を表示`,
    onSelect: () => controller.toggle()
  }];
}

// 5パネル分の表示/非表示項目を名前付きで返す。盤外メニュー（openBoardMenu）とヘッダーの
// 「パネル表示」ボタン（js/main.js）の両方から呼ぶ。それぞれ展開する順が違う
// （盤外メニューは既存の並びを変えない、ヘッダー側はキャラクター一覧を先頭にする）ので、
// 1本の配列ではなくキーごとに返し、呼び出し側で好きな順に...展開できるようにしてある。
export function buildPanelToggleItems() {
  return {
    chatPalette: panelToggleItem(chatPaletteController, 'チャットパレット'),
    info: panelToggleItem(infoPanelController, '情報'),
    characterList: panelToggleItem(characterPanelController, 'キャラクター一覧'),
    stamp: panelToggleItem(stampPanelController, 'スタンプ送信'),
    // 中身は部屋のシステムで変わる（特技表判定／ダイスドラフト）が、
    // 項目名は常に「判定」。何が出るかはパネルの見出しで読める。
    check: panelToggleItem(checkPanelController, '判定')
  };
}

const GRID_SIZE = 25;
// #boardのCSS側で定義しているグリッド線レイヤー。背景画像を差し替える際もこの2層は維持する。
const BOARD_GRID_LAYERS = "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)";

/**
 * オブジェクトの位置を確定するときの丸め。**位置を決める箇所は必ずここを通すこと**：
 * 判断を各所に散らすと「コマは自由に置けるがパネルは吸着する」というちぐはぐな壊れ方をする。
 *
 * ルーム設定でマス目に合わせる指定（room.snapToGrid、既定）ならマス単位へ吸着し、
 * 自由配置ならピクセル単位へ丸めるだけにする。丸めるのは、ドラッグ中の座標をそのまま
 * 確定させると小数が状態に残り、同期や保存データに意味の無い桁が乗り続けるため。
 *
 * 大きさ（コマのsize、パネル/カード/デッキのcols/rows、盤面のピクセルサイズ）は
 * この設定と関係なく常にマス単位のまま。
 */
function settlePosition(value) {
  return snapsToGrid(store.state)
    ? Math.round(value / GRID_SIZE) * GRID_SIZE
    : Math.round(value);
}

// ルームにプラグインが適用されていれば、そのプラグイン独自の拡張JSON読み込みを使う。
// 未適用の場合はCore側の汎用読み込み（本アプリ自身の保存形式）にフォールバックする。
function resolveCharacterImport(json) {
  const activePluginId = store.state.room?.activePlugin ?? null;
  return (activePluginId && pluginHasCharacterImport(activePluginId))
    ? importCharacterJsonForPlugin(activePluginId, json)
    : importCharacterJsonGeneric(json);
}

// コマのスナップショットに入っている画像を、この部屋の持ち物にしてから返す。
// JSONにはデータURLや別の部屋のURLが入っていることがあるため（js/image-upload.js参照）。
async function adoptSnapshotImage(snapshot) {
  if (!snapshot?.image) return snapshot;
  return { ...snapshot, image: await adoptImageIntoRoom(snapshot.image, 'token') };
}

// 「シートのURLから取り込む」の1項目。適用中プラグインが受け付け先を宣言しているときだけ出す
// （宣言が無いシステムでは項目自体が無い）。取り込んだ後の道は「JSONを読み込む」と同じ。
function sheetImportMenuItems(tokenId, canOperate, denyReason) {
  const activePluginId = store.state.room?.activePlugin ?? null;
  const source = activePluginId ? getPluginSheetSource(activePluginId) : null;
  if (!source) return [];

  return [{
    label: 'シートのURLから取り込む',
    disabled: !canOperate,
    title: denyReason,
    onSelect: async () => {
      const json = await promptForCharacterSheetJson(activePluginId, source);
      if (!json) return;

      const importResult = resolveCharacterImport(json);
      if (!importResult) {
        alert('このシートを読み込めませんでした。');
        return;
      }

      dispatchCharacterImport(tokenId, importResult);
    }
  }];
}

function dispatchCharacterImport(id, importResult) {
  store.dispatch('IMPORT_CHARACTER_DATA', {
    id,
    name: importResult.name,
    valueOverrides: importResult.valueOverrides,
    labelOverrides: importResult.labelOverrides,
    newParameters: importResult.newParameters,
    components: importResult.components
  });
}

// カメラ（ズーム・パン）の状態。Storeの状態ではなく、あくまでローカルな見た目の変更。
// 他プレイヤーの視点には影響しない。
let scale = 1;
let panX = 0;
let panY = 0;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

let rafId = null;

function scheduleBoardTransform(board) {
  if (rafId !== null) return; // 既に予約済みなら何もしない
  rafId = requestAnimationFrame(() => {
    applyBoardTransform(board);
    rafId = null;
  });
}


// 盤面に置かれている物すべての外接矩形（盤面ローカル座標）を返す。
// コマ・パネルは盤面の外にも自由に置けるので、盤面本体に加えてそれらの範囲も含める。
// パン範囲(clampPan)の基準に使い、盤面外へ置いた物にも必ず視点を寄せられるようにする。
function getContentBounds(board) {
  let minX = 0;
  let minY = 0;
  let maxX = board.offsetWidth;
  let maxY = board.offsetHeight;

  const extend = (x, y, w, h) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  };

  // パネル・カード・デッキはどれも cols/rows（マス数）で大きさを持つ。
  // ストッカーへ収納されたカードは盤面に描かれないので数えない（バックヤードのコマと同じ）。
  [
    ...Object.values(store.state.panels || {}),
    ...Object.values(store.state.cards || {}).filter(card => !card.stockerId),
    ...Object.values(store.state.decks || {})
  ].forEach(item => {
    extend(item.x, item.y, item.cols * GRID_SIZE, item.rows * GRID_SIZE);
  });

  // バックヤードにしまわれたコマは盤面に描画されないので数えない
  Object.values(store.state.tokens || {}).forEach(token => {
    if (token.inBackyard) return;
    const size = (token.size || 1) * GRID_SIZE;
    extend(token.x, token.y, size, size);
  });

  return { minX, minY, maxX, maxY };
}

function applyBoardTransform(board) {
  board.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// 背景画像のURL → 実ピクセルサイズ。測定中・測定失敗はnullを入れて二重に測らないようにする。
const backgroundImageSizes = new Map();

// 背景画像の実サイズをまだ測っていなければ測り、分かったら盤面を描き直す。
// カスタムサイズが指定されている部屋では盤面サイズに使わないので測らない。
function ensureBackgroundImageMeasured(board, room) {
  const imageUrl = room?.backgroundImage;
  if (!imageUrl) return;
  if (room?.boardWidth && room?.boardHeight) return;
  if (backgroundImageSizes.has(imageUrl)) return;

  backgroundImageSizes.set(imageUrl, null);
  loadImageDimensions(imageUrl).then((dim) => {
    if (!dim) return; // 読めなければビューポート基準のまま（下のフォールバック）
    backgroundImageSizes.set(imageUrl, dim);

    applyBoardBackground(board, store.state.room);
    // 盤面の大きさが変わったので、視点の可動域も取り直す
    const viewport = board.parentElement;
    if (viewport) clampPan(viewport, board);
    scheduleBoardTransform(board);
  });
}

// 盤面のピクセルサイズをマスの整数倍に決める。優先順は
//   1. 背景設定で指定されたカスタムサイズ(boardWidth/boardHeight, 既にマスの整数倍)
//   2. 背景画像の実サイズ
//   3. ビューポートをマス単位に切り上げたサイズ（端のマスが中途半端に切れないようにする）
//
// 2があるのは、背景画像を「盤面いっぱいに引き伸ばして」敷いているため
// （applyBoardBackgroundのbackground-size参照）。ここでビューポートを使うと、
// 同じ部屋でもPCとスマホで盤面の縦横比が変わり、画像だけが歪んでコマとの位置関係がずれる。
// 画像の実サイズを基準にすれば、どの端末でも同じ見た目になる。
function resolveBoardPixelSize(board, room) {
  if (room?.boardWidth && room?.boardHeight) {
    return { width: room.boardWidth, height: room.boardHeight };
  }

  const measured = room?.backgroundImage ? backgroundImageSizes.get(room.backgroundImage) : null;
  if (measured) {
    return {
      width: Math.max(GRID_SIZE, Math.round(measured.width / GRID_SIZE) * GRID_SIZE),
      height: Math.max(GRID_SIZE, Math.round(measured.height / GRID_SIZE) * GRID_SIZE)
    };
  }

  const viewport = board.parentElement;
  const vw = viewport ? viewport.clientWidth : 0;
  const vh = viewport ? viewport.clientHeight : 0;

  // 狭幅レイアウトで盤面タブを開いていないと、ビューポートは0×0になる（js/mobile-layout.js）。
  // それをそのまま採ると盤面が1マスの正方形へ潰れ、clampPanの基準まで壊れて
  // 盤面へ戻ったときに視点が飛ぶ。測れないときは今の大きさを保つ。
  if (vw <= 0 || vh <= 0) {
    return {
      width: parseFloat(board.style.width) || GRID_SIZE,
      height: parseFloat(board.style.height) || GRID_SIZE
    };
  }

  return {
    width: Math.max(GRID_SIZE, Math.ceil(vw / GRID_SIZE) * GRID_SIZE),
    height: Math.max(GRID_SIZE, Math.ceil(vh / GRID_SIZE) * GRID_SIZE)
  };
}

// 背景画像・マス目・ボードサイズを盤面に反映する。盤面サイズは常にマスの整数倍にし、
// 背景画像はその盤面全体へ拡縮して敷く（マス目からはみ出さない）。
// マス目の有無と画像の有無は独立なので、重ねる層をその都度組み立てる。
function applyBoardBackground(board, room) {
  const imageUrl = room?.backgroundImage;
  // 既定はマス目あり。この項目より前の部屋・シーンにはキーが無いので !== false で読む。
  // 吸着しない部屋（ルーム設定のマス目に合わせて配置する＝オフ）では線も描かない：
  // 何にも吸い付かない線は位置の目安にならず、ずれて置いた物が間違って見える。
  // 背景設定側のshowGridは書き換えないので、吸着を戻せば元の設定がそのまま戻る。
  const showGrid = room?.showGrid !== false && snapsToGrid({ room });

  ensureBackgroundImageMeasured(board, room);
  const { width: bw, height: bh } = resolveBoardPixelSize(board, room);

  board.style.width = `${bw}px`;
  board.style.height = `${bh}px`;

  // 手前から順に重ねる（マス目が画像の上）
  const layers = [];
  const sizes = [];
  const repeats = [];

  if (showGrid) {
    layers.push(BOARD_GRID_LAYERS); // 縦線・横線の2層
    sizes.push(`${GRID_SIZE}px ${GRID_SIZE}px`, `${GRID_SIZE}px ${GRID_SIZE}px`);
    repeats.push('repeat', 'repeat');
  }
  if (imageUrl) {
    layers.push(`url('${imageUrl}')`);
    sizes.push(`${bw}px ${bh}px`);
    repeats.push('no-repeat');
  }

  // 画像もマス目も無い場合、インラインを空にするとCSS側の既定（#boardのグリッド）へ
  // 戻ってしまう。'none'を明示して打ち消す（背景色のグレーはCSS側のまま残る）。
  board.style.backgroundImage = layers.length > 0 ? layers.join(', ') : 'none';
  board.style.backgroundSize = sizes.join(', ');
  board.style.backgroundPosition = sizes.map(() => '0 0').join(', ');
  board.style.backgroundRepeat = repeats.join(', ');
}

// --- 描画: STATE_CHANGEDを受けてDOMをStateに同期する ---

function bindTokenDrag(element) {
  const gesture = bindDragGesture(element, {
    stopPropagation: true, // 盤面パン用のpointerdownに伝播させない

    onStart: (event) => {
      const tokenId = element.id;
      const currentTokenState = store.state.tokens[tokenId];
      if (!currentTokenState) return false;

      activeBoardDrag = gesture;

      return {
        tokenId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: currentTokenState.x,
        startY: currentTokenState.y
      };
    },

    onMove: (event, { tokenId, startClientX, startClientY, startX, startY }) => {
      // ポインタの移動量はスケールの影響を受けるので、盤面のローカル座標に変換する
      const deltaX = (event.clientX - startClientX) / scale;
      const deltaY = (event.clientY - startClientY) / scale;

      // 置ける範囲は制限しない（盤面の外にも自由に動かせる）
      store.dispatch('MOVE_TOKEN', { id: tokenId, x: startX + deltaX, y: startY + deltaY });
    },

    onEnd: (event, { tokenId }) => {
      activeBoardDrag = null;

      const latestState = store.state.tokens[tokenId];
      if (!latestState) return;

      store.dispatch('MOVE_TOKEN', {
        id: tokenId,
        x: settlePosition(latestState.x),
        y: settlePosition(latestState.y)
      });
    },

    // タッチには右クリックが無いので、長押しからも同じメニューを開く
    onLongPress: (event) => openTokenMenu(event)
  });

  // 右クリックと長押しの共通の入口。長押しから来る場合はpointerdownイベントが
  // そのまま渡る（clientX/clientY・preventDefaultの有無に差が無いのでこのまま使える）。
  function openTokenMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    openTokenContextMenu(element.id, event.clientX, event.clientY);
  }

  element.addEventListener('contextmenu', openTokenMenu);
}

/**
 * コマの右クリックメニューを、渡した画面座標へ開く。
 *
 * 盤面のコマ本体（bindTokenDrag）と、キャラクター一覧のアバター
 * （js/character-panel.js）の両方から同じメニューを出すので、DOM要素ではなくidで受ける。
 * 一覧のバックヤードタブからも来るため、盤面にいることが前提の項目は状態を見て出し分ける。
 */
export function openTokenContextMenu(tokenId, clientX, clientY) {
  const token = store.state.tokens[tokenId];
  if (!token) return;

  const myParticipantId = getCurrentParticipantId();
  const amGm = isGm(store.state.participants, myParticipantId);
  const canOperate = canOperateToken(token);
  // 権限が無い項目は消さずに押せない状態で出し、理由をツールチップで示す
  // （「キャラクター更新」だけは開けて、同じ理由をダイアログの見出し下に出す）
  const denyReason = canOperate ? undefined : `${ownerNameOf(token)}のコマです（表示のみ。編集できるのは持ち主とGMです）`;

  showContextMenu(clientX, clientY, [
    {
      label: `所有者: ${ownerNameOf(token)}`,
      disabled: true,
      onSelect: () => {}
    },
    {
      // 見るだけなら誰でもできる。編集できるかはcanEditとしてダイアログへ渡し、
      // 中身は同じまま入力だけを封じる（js/character-dialog.js参照）
      label: canOperate ? 'キャラクター更新' : 'キャラクターを表示',
      onSelect: () => {
        const current = store.state.tokens[tokenId];
        if (!current) return;

        showCharacterEditDialog({
          character: current,
          usedImages: collectImageUrls(store.state),
          canEdit: canOperate,
          readOnlyReason: denyReason,
          activePluginId: store.state.room?.activePlugin ?? null,
          participants: store.state.participants ?? {},
          onComponentChange: (componentKey, value) => {
            store.dispatch('SET_COMPONENT', { id: tokenId, componentKey, value });
          },
          // ダイアログを開いたまま複数回エフェクト等を編集しても、常に最新の
          // components（他クライアントの同期・直前の保存を含む）を読めるようにする。
          // 開いた時点のスナップショットを握り続けると、再編集で古い内容に巻き戻る。
          getComponents: () => store.state.tokens[tokenId]?.components ?? {},
          // DX3のコンボ機能（発動/判定/ダメージ）が必要とするstore操作・ダイスロール一式。
          // getTokenも同様に、開いた時点のスナップショットではなく都度最新を返す。
          tokenId,
          dispatch: store.dispatch.bind(store),
          getToken: () => store.state.tokens[tokenId],
          // 他のコマを名前で引く口。プラグインからstoreは読めない（循環import）ので、
          // 参加者一覧と同じくCoreから渡す。探し方はチャットの
          // 「バフ>対象コマ名(...)」（js/main.js）と同じ完全一致に揃えてある。
          findTokenByName: (name) => (
            Object.values(store.state.tokens).find(token => token.name === name) ?? null
          ),
          getEffectiveParameterValue,
          generateBuffId,
          rollBCDice,
          onConfirm: (result) => applyCharacterEditResult(store, tokenId, result)
        });
      }
    },
    {
      label: 'コマをJSONで保存',
      onSelect: () => {
        const current = store.state.tokens[tokenId];
        if (!current) return;

        downloadJSON(`${current.name || 'character'}.json`, buildTokenSnapshot(current));
      }
    },
    {
      label: 'JSONを読み込む',
      disabled: !canOperate,
      title: denyReason,
      onSelect: async () => {
        const picked = await pickFileAsText({ accept: 'application/json' });
        if (!picked) return;

        const json = parseJsonText(picked.text);
        if (!json) return;

        if (isTokenSnapshot(json)) {
          store.dispatch('RESTORE_CHARACTER_SNAPSHOT', {
            id: tokenId, snapshot: await adoptSnapshotImage(json)
          });
          return;
        }

        const importResult = resolveCharacterImport(json);
        if (!importResult) {
          alert('このJSONを読み込めませんでした。');
          return;
        }

        dispatchCharacterImport(tokenId, importResult);
      }
    },
    // シートのURLから直接取り込む。宣言を持つシステムの部屋でだけ出す
    // （どのサービスを受け付けるかはプラグインの宣言が全て。js/character-sheet-import.js）
    ...sheetImportMenuItems(tokenId, canOperate, denyReason),
    {
      label: 'バフ/デバフを付与',
      onSelect: () => {
        const current = store.state.tokens[tokenId];
        if (!current) return;

        showAddBuffDialog({
          parameters: current.parameters,
          // プラグイン独自の追加入力欄（DX3ならクリティカル値の下限）を出すために渡す
          activePluginId: store.state.room?.activePlugin ?? null,
          onConfirm: ({ name, paramId, delta, expirePhase, meta }) => {
            store.dispatch('ADD_BUFF', {
              tokenId, id: generateBuffId(), name, paramId, delta, expirePhase, meta
            });
          }
        });
      }
    },
    {
      label: 'バフ/デバフ一覧',
      onSelect: () => {
        if (!store.state.tokens[tokenId]) return;

        showBuffListDialog({
          // 一覧を開いたまま削除操作をしても常に最新を読めるよう、スナップショットではなく
          // ゲッターを渡す（エフェクトボックスで一度踏んだ「開いた時点の値を握り続けて
          // 巻き戻る」問題と同じ轍を踏まないため）。
          getBuffs: () => store.state.tokens[tokenId]?.buffs ?? [],
          getParameters: () => store.state.tokens[tokenId]?.parameters ?? {},
          activePluginId: store.state.room?.activePlugin ?? null,
          onRemove: (buffId) => {
            store.dispatch('REMOVE_BUFF', { tokenId, id: buffId });
          }
        });
      }
    },
    // 所有権の獲得・放棄。所有者がいないコマは誰でも自分のものにでき、
    // 自分のコマ（GMなら他人のコマも）は手放して所有者なしに戻せる。
    ...(!token.ownerId && myParticipantId ? [{
      label: '自分のコマにする',
      onSelect: () => {
        store.dispatch('SET_CHARACTER_OWNER', { id: tokenId, ownerId: myParticipantId });
      }
    }] : []),
    ...(token.ownerId && (token.ownerId === myParticipantId || amGm) ? [{
      label: token.ownerId === myParticipantId ? 'コマを手放す' : `${ownerNameOf(token)}から取り上げる`,
      onSelect: () => {
        store.dispatch('SET_CHARACTER_OWNER', { id: tokenId, ownerId: null });
      }
    }] : []),
    // 出し入れは今いる側と逆の1つだけ出す。キャラクター一覧のバックヤードタブから
    // 開いたときに「しまう」が並ぶと意味を成さないため。
    ...(token.inBackyard ? [{
      label: '盤面に戻す',
      disabled: !canOperate,
      title: denyReason,
      onSelect: () => {
        store.dispatch('RESTORE_FROM_BACKYARD', { id: tokenId });
      }
    }] : [{
      label: 'バックヤードにしまう',
      disabled: !canOperate,
      title: denyReason,
      onSelect: () => {
        // しまうと同時に自分のコマになる（表示名未設定のゲストは所有者なしのまま、
        // 従来どおりブラウザ単位の棚に入る）
        store.dispatch('MOVE_TO_BACKYARD', {
          id: tokenId, participantId: myParticipantId, localUserId: getLocalUserId()
        });
      }
    }]),
    {
      label: '削除',
      danger: true,
      disabled: !canOperate,
      title: denyReason,
      onSelect: () => {
        store.dispatch('REMOVE_CHARACTER', { id: tokenId });
      }
    }
  ]);
}

// コマの見た目（色・画像・トリミング・大きさ）をStateに合わせて反映する。
// 大きさはマス数(size、N×N)×GRID_SIZEのピクセル値にする。
// 画像は内側の<img class="token-img">で表示し、トリミング設定(imageCrop)を
// applyImageCropStyleで反映する（ダイアログのプレビューと同じ見た目になる）。
function applyTokenAppearance(el, tokenData) {
  const pixelSize = (tokenData.size || 1) * GRID_SIZE;
  el.style.width = `${pixelSize}px`;
  el.style.height = `${pixelSize}px`;

  el.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;

  let img = el.querySelector('.token-img');
  if (!img) {
    img = document.createElement('img');
    img.className = 'token-img';
    img.alt = '';
    el.insertBefore(img, el.firstChild);
  }

  if (tokenData.image) {
    if (img.getAttribute('src') !== tokenData.image) img.src = tokenData.image;
    img.style.display = '';
    applyImageCropStyle(img, tokenData.imageCrop);
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
}

function createTokenElement(tokenData, board) {
  const el = document.createElement('div');
  el.className = 'token';
  el.id = tokenData.id;

  const img = document.createElement('img');
  img.className = 'token-img';
  img.alt = '';
  el.appendChild(img);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'token-name';
  nameSpan.textContent = tokenData.name;
  el.appendChild(nameSpan);

  applyTokenAppearance(el, tokenData);
  bindTokenDrag(el);
  board.appendChild(el);
  return el;
}

// パネルの見た目（画像・大きさ）をStateに合わせて反映する。
// 大きさは cols×rows マス × GRID_SIZE のピクセル値にする。
// --- カードストッカー（カードを収納できるパネル） ---
// 所有者を設定した箱は、入れる・見る・取り出すのすべてがその人だけ。所有者を設定しない
// 箱は誰でも使える。判定の本体はjs/game-store.jsのstockerAllowsUserで、こちらは画面から
// 操作できるかどうかを同じ規則で決める（片方だけ変えると「押せるのに何も起きない」になる）。
function canUseStocker(panelData) {
  if (!panelData?.isStocker) return false;
  if (!panelData.stockerOwnerId && !panelData.stockerOwnerLocalId) return true;
  if (panelData.stockerOwnerId) return panelData.stockerOwnerId === getCurrentParticipantId();
  return panelData.stockerOwnerLocalId === getLocalUserId();
}

// 所有者の表示名。参加者一覧から引けなければownerNameOfと同じ言い方にそろえる。
function stockerOwnerName(panelData) {
  if (panelData.stockerOwnerId) {
    return store.state.participants?.[panelData.stockerOwnerId]?.nickname || '不明な参加者';
  }
  return panelData.stockerOwnerLocalId ? '名前を設定していない人' : '';
}

// 送り先候補として一覧に出すときの1行分の表示名（デッキの「ストッカーへ」・
// ストッカーの「カードを送る」の両方で使う）。パネルのtextを名前として使い、
// 所有者が居なければ「誰でも」と添える。
function describeStockerForPicker(panelData) {
  const label = panelData.text?.trim() || '(名前なし)';
  const owner = stockerOwnerName(panelData);
  return owner ? `${label}（${owner}）` : `${label}（誰でも）`;
}

// その箱に入っているカードを、入れた順に返す（js/game-store.jsのlistStockerCardsと同じ順）。
function storedCardsOf(panelId) {
  return Object.values(store.state.cards || {})
    .filter(card => card.stockerId === panelId)
    .sort((a, b) => a.stockerSeq - b.stockerSeq);
}

// 操作する人が誰かをpayloadへ載せるための組（ストッカーの所有者判定に使う）。
// 表示名を設定していない人は参加者IDを持たないので、ブラウザ単位のIDで代用する
// （コマのバックヤードと同じ持ち方）。
function actingUserPayload() {
  return { participantId: getCurrentParticipantId(), localUserId: getLocalUserId() };
}

// --- パネルのクリックオプション ---
// 設定の形と検証は js/store/panels.js。ここは「押されたときに何を呼ぶか」だけを持つ。

// GM限定の操作（シーン適用・演奏停止）をGMでない人が押したときは、**dispatchしない**。
// 楽観適用してしまうと、自分の画面だけ一瞬シーンが変わってサーバーのRESYNCで戻る、
// という分かりにくいちらつきになる。押しても何も起きない代わりに、
// マウスオーバーへ理由を出しておく（panelClickActionLabel）。
function runPanelClickAction(panel) {
  const action = panel?.clickAction;
  if (!action) return;

  switch (action.type) {
    case 'chat':
      panelClickSenders.sendChat?.(action.text);
      return;

    case 'scene': {
      if (!canOperateAsGm()) return;
      // 指し先が消えていれば何もしない（reducer側も見るが、無駄な同期を起こさない）。
      // ownEntryで引くのは、素の [id] だと '__proto__' がObject.prototypeに当たって
      // 「実在するシーン」を通ってしまうため（js/store/patch.jsのownEntry参照）
      if (!ownEntry(store.state.room.scenes, action.sceneId)) return;
      // payloadはjs/main.jsのopenSceneListDialogと同じ形にそろえる。
      // playIdはリデューサーの中で採番してはいけない（各クライアントとサーバーで
      // 値がずれて再生検知が壊れる。js/store/handlers/scenes.js参照）
      store.dispatch('APPLY_SCENE', { id: action.sceneId, playId: `${Date.now()}` });
      return;
    }

    case 'audio': {
      if (!action.trackId) {
        if (!canOperateAsGm()) return; // 停止だけGM限定（再生は誰でもできる）
        store.dispatch('STOP_AUDIO_PLAYBACK', { channel: action.channel });
        return;
      }
      if (!ownEntry(store.state.room.audioTracks, action.trackId)) return;
      // playIdを毎回変えることで、同じ音を続けて鳴らし直せる（js/audio-player.js）
      store.dispatch('SET_AUDIO_PLAYBACK', {
        channel: action.channel, trackId: action.trackId, playId: `${Date.now()}`
      });
      return;
    }

    case 'stamp':
      panelClickSenders.sendStamp?.(action.stampId);
      return;

    default:
      // 知らない種類は何もしない（正規化を通っていれば来ないが、塞ぐ側に倒す）
  }
}

// 編集ダイアログへ渡す候補。ダイアログはstoreを知らない部品なので、ここで作って渡す。
function buildClickActionChoices() {
  const room = store.state.room;
  return {
    scenes: Object.values(room.scenes || {}).map((scene) => ({ id: scene.id, name: scene.name })),
    audioTracks: Object.values(room.audioTracks || {}).map((track) => ({
      id: track.id,
      name: track.name,
      channel: track.channel,
      channelLabel: AUDIO_CHANNEL_LABELS[track.channel] || track.channel
    })),
    // 画像の無いスタンプも候補には残す（送れはするので。js/stamp-panel.jsと同じ判断）
    stamps: listStamps(room).map((stamp) => ({ id: stamp.id, label: stamp.label }))
  };
}

// 差分dispatchの判定。中身が同じなら投げない（無駄な同期を全員へ配らない）。
function sameClickAction(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.type === b.type
    && a.text === b.text && a.sceneId === b.sceneId
    && a.channel === b.channel && a.trackId === b.trackId && a.stampId === b.stampId;
}

// マウスオーバーに出す1行。何が起きるパネルなのか、なぜ効かないのかを読めるようにする。
function panelClickActionLabel(action) {
  if (!action) return '';
  const room = store.state.room;
  const gmOnly = (text) => (canOperateAsGm() ? text : `${text}（${GM_ONLY_REASON}）`);

  switch (action.type) {
    case 'chat':
      return `クリック: 「${action.text}」と発言`;
    case 'scene': {
      const scene = ownEntry(room.scenes, action.sceneId);
      return gmOnly(scene ? `クリック: シーン「${scene.name}」へ` : 'クリック: シーンへ（削除されています）');
    }
    case 'audio': {
      if (!action.trackId) {
        return gmOnly(`クリック: ${AUDIO_CHANNEL_LABELS[action.channel] || action.channel}を止める`);
      }
      const track = ownEntry(room.audioTracks, action.trackId);
      return track ? `クリック: 「${track.name}」を鳴らす` : 'クリック: 音楽（削除されています）';
    }
    case 'stamp': {
      const stamp = findStamp(action.stampId, room);
      return `クリック: スタンプ「${stamp?.label || action.stampId}」を送る`;
    }
    default:
      return '';
  }
}

function applyPanelAppearance(el, panelData) {
  el.style.width = `${panelData.cols * GRID_SIZE}px`;
  el.style.height = `${panelData.rows * GRID_SIZE}px`;

  if (panelData.image) {
    el.style.backgroundImage = `url('${panelData.image}')`;
    el.style.backgroundColor = '';
  } else {
    el.style.backgroundImage = '';
    el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  }

  // --- カードストッカー ---
  // 枚数は全員に見せる（卓に置かれた箱の厚みは見える、という扱い）。中身が読めるかどうかは
  // 所有者次第で、そちらは右クリックメニューが決める。
  const stored = panelData.isStocker ? storedCardsOf(panelData.id) : [];
  const countEl = el.querySelector('.panel-stocker-count');
  countEl.textContent = panelData.isStocker ? `${stored.length}` : '';
  el.classList.toggle('stocker', !!panelData.isStocker);

  // 自分が使える箱にだけ落とし先の印を付ける。付いていない箱の上でカードを離しても
  // 吸い込まれず、その場に置かれる（何も起きないのに理由が分からない状態を作らない）
  if (panelData.isStocker && canUseStocker(panelData)) {
    el.dataset.dropTarget = 'stocker';
  } else {
    delete el.dataset.dropTarget;
  }

  // マウスオーバー時にブラウザ標準のツールチップとして表示する（画像とは独立）。
  // テキストに公開先の指定がある場合、宛先に入っていない人には出さない
  // （絵は見えるがメモはGMだけが読める、といった使い方のため）。
  const ownerName = panelData.isStocker ? stockerOwnerName(panelData) : '';
  const stockerTitle = panelData.isStocker
    ? `${ownerName ? `${ownerName}の` : ''}カードストッカー（${stored.length}枚）`
    : '';
  const bodyText = (panelData.text && canView(panelData.textAudience, getCurrentParticipantId()))
    ? panelData.text
    : '';
  // 押すと何かが起きるパネルは、それを最後の行に出す（公開先の指定はテキストだけに掛かる
  // ものなので、クリックの説明は誰にでも出す：押せば分かることを隠しても意味がない）
  const clickTitle = panelClickActionLabel(panelData.clickAction);
  const title = [stockerTitle, bodyText, clickTitle].filter(Boolean).join('\n');

  if (title) {
    el.title = title;
  } else {
    el.removeAttribute('title');
  }

  // 固定中はカーソル・枠線で見分けられるようにする（CSSは.panel-object.lockedで定義）
  el.classList.toggle('locked', !!panelData.locked);
  // 押せるパネルは指カーソルにする。固定していると既定が default になるので、
  // 「動かせないが押せる」ことがカーソルだけで分かるようにしておく
  el.classList.toggle('clickable', !!panelData.clickAction);
}

// パネル・カード・デッキに共通のドラッグ移動。ドロップ時にグリッドへ吸着させるだけで、
// 置ける場所は制限しない（盤面から離れた位置にも置ける）。
// readState＝idから今の状態（x/y/lockedを持つもの）を引く関数、moveAction＝移動の
// アクション名、openMenu＝右クリックと長押しの共通の入口。
// onDrag/onDropは落とし先を持つもの（カード）だけが渡す。onDropがtrueを返したら
// 「落とし先が引き取った」としてグリッド吸着を行わない。
function bindBoardObjectDrag(element, {
  readState, moveAction, openMenu, onDrag = null, onDrop = null, onClick = null
}) {
  const gesture = bindDragGesture(element, {
    stopPropagation: true, // 盤面パン用のpointerdownに伝播させない

    onStart: (event) => {
      const current = readState(element.id);
      if (!current) return false;

      // 固定中は移動しない。stopPropagationもされないので、その上のドラッグは
      // 盤面(viewport)へ伝播して盤面パンとして扱われる。
      // ただし長押しだけは見る（LONG_PRESS_ONLY）。falseを返すと長押しまで切れてしまい、
      // 右クリックの無いタッチからはこのパネルのメニューへ到達できなくなる。
      if (current.locked) return LONG_PRESS_ONLY;

      activeBoardDrag = gesture;

      return {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: current.x,
        startY: current.y
      };
    },

    onMove: (event, { startClientX, startClientY, startX, startY }) => {
      const deltaX = (event.clientX - startClientX) / scale;
      const deltaY = (event.clientY - startClientY) / scale;
      store.dispatch(moveAction, { id: element.id, x: startX + deltaX, y: startY + deltaY });
      onDrag?.(event);
    },

    onEnd: (event, context) => {
      activeBoardDrag = null;

      const latest = readState(element.id);
      if (!latest) return;

      // 落とし先（ストッカー・デッキ）が引き取ったなら、位置の確定はそちらに任せる
      if (onDrop?.(event, context)) return;

      store.dispatch(moveAction, {
        id: element.id,
        x: settlePosition(latest.x),
        y: settlePosition(latest.y)
      });
    },

    onLongPress: (event) => openMenu(event),

    // 押して、ほとんど動かさずに離したとき（js/drag-gesture.js）。
    // 固定したパネルはonStartがLONG_PRESS_ONLYを返すのでonEndを通らないが、
    // クリックだけは別経路で拾えるようになっている。
    ...(onClick ? { onClick: () => onClick() } : {})
  });

  element.addEventListener('contextmenu', openMenu);
}

function bindPanelDrag(element) {
  // 右クリックと長押しの共通の入口
  function openPanelMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    const panelId = element.id;
    const panelState = store.state.panels[panelId];
    const isLocked = !!panelState?.locked;

    // 本文はマウスオーバーのツールチップ（title属性）で読ませているが、タッチには
    // ホバーが無い。読める人にはメニューの先頭に冒頭を出して、指だけでも辿れるようにする。
    const readableText = (panelState?.text && canView(panelState.textAudience, getCurrentParticipantId()))
      ? panelState.text.replace(/\s+/g, ' ').trim()
      : '';
    const textPreviewItem = readableText ? [{
      label: readableText.length > 40 ? `${readableText.slice(0, 40)}…` : readableText,
      disabled: true,
      title: panelState.text,
      onSelect: () => {}
    }] : [];

    // --- カードストッカーの中身 ---
    // 使える人には1枚ずつの取り出しを並べ、使えない人には理由だけを出す
    // （項目ごと消すと「なぜ出ないのか」が分からないため。context-menu.jsのdisabled）。
    const stockerItems = [];
    if (panelState?.isStocker) {
      if (canUseStocker(panelState)) {
        const stored = storedCardsOf(panelId);
        if (stored.length === 0) {
          stockerItems.push({ label: 'ストッカーは空です', disabled: true, onSelect: () => {} });
        } else {
          // 多すぎるとメニューが画面に収まらないので頭から12枚まで
          stored.slice(0, 12).forEach(card => {
            stockerItems.push({
              label: `取り出す: ${card.face.text || '(名前なし)'}`,
              onSelect: () => {
                store.dispatch('TAKE_CARD_FROM_STOCKER', {
                  cardId: card.id, gridSize: GRID_SIZE, ...actingUserPayload()
                });
              }
            });
          });
          if (stored.length > 12) {
            stockerItems.push({
              label: `ほか${stored.length - 12}枚（すべて取り出すで出せます）`,
              disabled: true,
              onSelect: () => {}
            });
          }
          stockerItems.push({
            label: `すべて取り出す（${stored.length}枚）`,
            onSelect: () => {
              store.dispatch('RELEASE_STOCKER_CARDS', {
                panelId, gridSize: GRID_SIZE, ...actingUserPayload()
              });
            }
          });
          // 別のストッカーか出身デッキへ、選んだカードだけをまとめて送る。
          stockerItems.push({
            label: 'カードを送る',
            onSelect: () => {
              const latestStored = storedCardsOf(panelId);
              if (latestStored.length === 0) return;
              const stockerCandidates = Object.values(store.state.panels)
                .filter(p => p.isStocker && p.id !== panelId && canUseStocker(p));

              showStockerSendDialog({
                cards: latestStored.map(card => ({ id: card.id, label: card.face.text || '(名前なし)' })),
                stockers: stockerCandidates.map(p => ({ id: p.id, label: describeStockerForPicker(p) })),
                onConfirm: ({ cardIds, destination, stockerId }) => {
                  if (destination === 'stocker') {
                    cardIds.forEach(cardId => {
                      store.dispatch('STORE_CARD_IN_STOCKER', {
                        cardId, panelId: stockerId, ...actingUserPayload()
                      });
                    });
                  } else {
                    cardIds.forEach(cardId => {
                      const card = store.state.cards[cardId];
                      if (!card?.deckId) return; // 出身デッキが無いカードは山札へは送れない
                      store.dispatch('RETURN_CARD_TO_DECK', { cardId, deckId: card.deckId });
                    });
                  }
                }
              });
            }
          });
        }
      } else {
        const ownerName = stockerOwnerName(panelState);
        stockerItems.push({
          label: `${ownerName}のストッカー（中身は見られません）`,
          disabled: true,
          title: '所有者を設定したストッカーは、その人だけが出し入れできます。',
          onSelect: () => {}
        });
      }
    }

    showContextMenu(event.clientX, event.clientY, [
      ...textPreviewItem,
      ...stockerItems,
      {
        label: 'パネルを編集',
        onSelect: () => {
          const current = store.state.panels[panelId];
          if (!current) return;
          showPanelDialog({
            title: 'パネルを編集',
            initialImage: current.image,
            initialText: current.text,
            initialCols: current.cols,
            initialRows: current.rows,
            initialStackOrder: normalizeStackOrder(current.stackOrder),
            initialKeepOnSceneChange: !!current.keepOnSceneChange,
            initialIsStocker: !!current.isStocker,
            initialStockerOwned: !!(current.stockerOwnerId || current.stockerOwnerLocalId),
            // 他人のものになっている箱では、誰のものかを画面に出す（自分の箱なら出さない）
            stockerOwnerLabel: canUseStocker(current) ? '' : stockerOwnerName(current),
            initialClickAction: current.clickAction || null,
            usedImages: collectImageUrls(store.state),
            clickActionChoices: buildClickActionChoices(),
            maxChatTextLength: MAX_PANEL_CHAT_TEXT_LENGTH,
            gridSize: GRID_SIZE,
            onConfirm: ({
              image, text, cols, rows, stackOrder, keepOnSceneChange, isStocker, stockerOwned,
              clickAction
            }) => {
              const latest = store.state.panels[panelId];
              if (!latest) return;
              if (image !== (latest.image || null)) {
                store.dispatch('SET_PANEL_IMAGE', { id: panelId, image });
              }
              if (text !== (latest.text || '')) {
                store.dispatch('SET_PANEL_TEXT', { id: panelId, text });
              }
              if (cols !== latest.cols || rows !== latest.rows) {
                store.dispatch('SET_PANEL_SIZE', { id: panelId, cols, rows });
              }
              if (stackOrder !== normalizeStackOrder(latest.stackOrder)) {
                store.dispatch('SET_PANEL_STACK_ORDER', { id: panelId, stackOrder });
              }
              if (keepOnSceneChange !== !!latest.keepOnSceneChange) {
                store.dispatch('SET_PANEL_KEEP_ON_SCENE_CHANGE', { id: panelId, keepOnSceneChange });
              }

              // ストッカーの切り替えと所有者。オフにすると中のカードは盤面へ出る
              // （js/game-store.jsのSET_PANEL_STOCKER）。所有者は「自分専用にする」を
              // 入れた人自身になる（表示名が無ければブラウザ単位のIDで持つ）。
              const wasOwned = !!(latest.stockerOwnerId || latest.stockerOwnerLocalId);
              if (isStocker !== !!latest.isStocker || stockerOwned !== wasOwned) {
                const { participantId, localUserId } = actingUserPayload();
                store.dispatch('SET_PANEL_STOCKER', {
                  id: panelId,
                  isStocker,
                  ownerId: stockerOwned ? participantId : null,
                  localUserId: stockerOwned ? localUserId : null,
                  gridSize: GRID_SIZE
                });
              }

              // クリックオプション。ストッカーへの切り替えより後に投げる：
              // SET_PANEL_STOCKERは箱にするときclickActionを落とすので、逆順だと
              // 「箱をやめてクリックを設定した」場合に設定が消える。
              if (!sameClickAction(clickAction, latest.clickAction)) {
                store.dispatch('SET_PANEL_CLICK_ACTION', { id: panelId, clickAction });
              }
            }
          });
        }
      },
      {
        label: 'テキストの公開先',
        onSelect: () => {
          const current = store.state.panels[panelId];
          if (!current) return;
          showAudienceDialog({
            title: 'パネルのテキストの公開先',
            description: 'マウスオーバーで出るテキストを誰に見せるかを選びます（画像は常に全員に見えます）。',
            audience: current.textAudience ?? null,
            participants: store.state.participants ?? {},
            myParticipantId: getCurrentParticipantId(),
            onConfirm: (textAudience) => {
              store.dispatch('SET_PANEL_TEXT_AUDIENCE', { id: panelId, textAudience });
            }
          });
        }
      },
      {
        label: isLocked ? '固定を解除' : '固定',
        onSelect: () => {
          store.dispatch('SET_PANEL_LOCKED', { id: panelId, locked: !isLocked });
        }
      },
      {
        label: '削除',
        danger: true,
        // ストッカーごと消す場合、中のカードは盤面へ出る（消えると取り返しがつかないため）
        onSelect: () => {
          store.dispatch('REMOVE_PANEL', { id: panelId, gridSize: GRID_SIZE });
        }
      }
    ]);
  }

  bindBoardObjectDrag(element, {
    readState: (id) => store.state.panels[id],
    moveAction: 'MOVE_PANEL',
    openMenu: openPanelMenu,
    // クリックオプションを持つパネルだけが押しに反応する。持たないパネルは従来どおり、
    // 固定してあれば下の盤面パンへ素通しされる（js/drag-gesture.jsのLONG_PRESS_ONLY）
    onClick: () => runPanelClickAction(store.state.panels[element.id])
  });
}

// パネルは盤面直下ではなく専用の層（#panel-layer）へ入れる。層がz-indexを持つことで、
// パネル同士の重なり順をいくつにしてもコマより手前へ出ないようにしている（CSS参照）。
function createPanelElement(panelData, panelLayer) {
  const el = document.createElement('div');
  el.className = 'panel-object';
  el.id = panelData.id;

  // カードストッカーにしたときの枚数表示（普通のパネルでは中身が空のまま）
  const count = document.createElement('span');
  count.className = 'panel-stocker-count';
  el.appendChild(count);

  applyPanelAppearance(el, panelData);

  bindPanelDrag(el);
  panelLayer.appendChild(el);
  return el;
}

// --- カード／デッキ ---
// カードとデッキはパネルと同じ層(#panel-layer)に入れ、同じstackOrderの物差しで前後を
// 決める（カードの既定10 > パネルの既定0 なので、既定のままならカードがパネルの上に乗る）。
// 層がz-indexを持つので、何番を付けてもコマより手前には出ない。
//
// 裏向きのカードは表面(face)を一切DOMへ出さない。状態そのものは全員へ配られているので
// これは「うっかり見えない」までの仕組みだが、画面上で読めてしまう事故はこれで防げる
// （js/game-store.jsのカード／デッキの節・js/visibility.js冒頭）。

// 画像を1枚出す共通処理。URLが変わったときだけsrcを差し替え（毎回入れ直すと画像が
// ちらつく）、読めなかったら隠してテキスト表示へ落とす（画像を用意していなくても
// カードとして使えるようにするため。image/trump/README.txt）。
// 戻り値は「絵が出ているか」。出ていればカード名は描かない（絵の上に名前を重ねると
// せっかくの絵が読みにくくなる。名前は絵が無いとき・読めないときの代わり）。
function applyObjectImage(img, url) {
  if (!url) {
    img.removeAttribute('src');
    delete img.dataset.url;
    delete img.dataset.failed;
    img.style.display = 'none';
    return false;
  }

  if (img.dataset.url !== url) {
    img.dataset.url = url;
    delete img.dataset.failed; // 別の絵に差し替わったので、前回の失敗は引き継がない
    img.style.display = '';
    img.src = url;
  }

  return img.dataset.failed !== '1';
}

// カード名の文字の大きさ。カードの幅は4マス（100px）しかないので、「♠A」と
// 「ワンドのナイト」を同じ大きさで出すと後者がはみ出す。長さで段階を切り替える
// （実際の大きさはCSSの .card-text.len-m / .len-l）。
function cardTextSizeClass(text) {
  if (text.length <= 3) return '';
  return text.length <= 8 ? 'len-m' : 'len-l';
}

function applyCardAppearance(el, cardData) {
  el.style.width = `${cardData.cols * GRID_SIZE}px`;
  el.style.height = `${cardData.rows * GRID_SIZE}px`;

  // 表向きなら表面、裏向きなら裏面。裏向きの間はface（カード名・情報・絵）に一切触れない
  const side = cardData.faceUp ? cardData.face : cardData.back;

  const img = el.querySelector('.card-image');
  const text = el.querySelector('.card-text');

  const showingImage = applyObjectImage(img, side.image);

  // 文字は表向きで、かつ絵が出ていないときだけ。絵があるならその絵がカードの顔なので、
  // 上に名前を重ねない（画像を用意していないカードのための代わりの表示）。
  // 裏面も無地（裏に文字を出すと表面が透ける意味になる）。
  const name = (cardData.faceUp && !showingImage) ? (cardData.face.text || '') : '';
  text.textContent = name;
  text.style.color = (name && cardData.face.color) ? cardData.face.color : '';
  text.className = `card-text ${cardTextSizeClass(name)}`.trim();

  // カード情報はマウスオーバーのツールチップで読ませる（パネルのテキストと同じ扱い。
  // applyPanelAppearance参照）。裏向きの間は表面の情報なので出さない。
  if (cardData.faceUp && cardData.face.info) {
    el.title = cardData.face.info;
  } else {
    el.removeAttribute('title');
  }

  el.classList.toggle('face-down', !cardData.faceUp);
  el.classList.toggle('locked', !!cardData.locked);
}

function applyDeckAppearance(el, deckData) {
  el.style.width = `${deckData.cols * GRID_SIZE}px`;
  el.style.height = `${deckData.rows * GRID_SIZE}px`;

  applyObjectImage(el.querySelector('.card-image'), deckData.back.image);

  el.querySelector('.deck-name').textContent = deckData.name || '';
  el.querySelector('.deck-count').textContent = `${deckData.cards.length}`;
  el.title = `${deckData.name || 'デッキ'}（残り${deckData.cards.length}枚）`;

  // カードをここへ落とすと「デッキに戻す」。受け付けるのはそのデッキから引いた札だけで、
  // その判定はカード側（resolveCardDrop）が行う
  el.dataset.dropTarget = 'deck';

  el.classList.toggle('empty', deckData.cards.length === 0);
  el.classList.toggle('locked', !!deckData.locked);
}

// 盤面に出ている物すべての中で一番上の重なり順＋1。カードの「最前面へ」で使う。
function nextTopStackOrder() {
  const state = store.state;
  const all = [
    ...Object.values(state.panels || {}),
    ...Object.values(state.cards || {}),
    ...Object.values(state.decks || {})
  ];
  const top = all.reduce((max, item) => Math.max(max, normalizeStackOrder(item.stackOrder)), 0);
  return top + 1;
}

// 「見た人」の表示。参加者一覧から引けなければ（表示名を変えた・削除された等）
// IDのままでは意味が伝わらないのでownerNameOfと同じ言い方にそろえる。
function seenByNames(cardData) {
  return cardData.seenBy.map(id => store.state.participants?.[id]?.nickname || '不明な参加者');
}

// --- カードの落とし先（ストッカー・デッキ） ---
// 仕組みはダイスドラフト（js/check-view/dice-draft-view.js）と同じで、受け取る側に data-drop-target を
// 付け、掴んでいる指の位置から探す。違うのは、掴んでいるカード自身がその点の下に居ること。
// elementsFromPointで重なりを全部取り、自分を飛ばして最初の落とし先を拾う。
function dropTargetAt(clientX, clientY, draggedEl) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (draggedEl.contains(el)) continue; // 掴んでいるカード自身
    const target = el.closest?.('[data-drop-target]');
    if (target && !draggedEl.contains(target)) return target;
  }
  return null;
}

function clearDropHighlights() {
  document.querySelectorAll('.is-drop-hover').forEach(el => el.classList.remove('is-drop-hover'));
}

// このカードをそこへ落としてよいか。落とせないものはnullを返す（＝ただの移動になる）。
function resolveCardDrop(targetEl, cardData) {
  if (!targetEl) return null;

  if (targetEl.dataset.dropTarget === 'stocker') {
    const panel = store.state.panels[targetEl.id];
    // 使えないストッカーにはそもそもdata-drop-targetを付けていないが、状態が変わった
    // 直後などのために念のため見る
    return canUseStocker(panel) ? { kind: 'stocker', panelId: targetEl.id } : null;
  }

  if (targetEl.dataset.dropTarget === 'deck') {
    // 戻せるのは出自のデッキだけ。別の山へ落とした場合は受け付けず、掴む前の位置へ戻す
    // （山の上に置きっぱなしにすると、戻ったのか戻っていないのか見分けが付かない）。
    return cardData.deckId === targetEl.id
      ? { kind: 'deck', deckId: targetEl.id }
      : { kind: 'deck-rejected' };
  }

  return null;
}

function bindCardDrag(element) {
  function openCardMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    const cardId = element.id;
    const cardData = store.state.cards[cardId];
    if (!cardData) return;

    const myParticipantId = getCurrentParticipantId();

    // 「誰が見たか」は盤面には出さず、このメニューを開いた人だけが読む
    // （盤面に出すと、伏せたカードのそばに常時マークが並んで場が読みにくくなる）。
    const names = seenByNames(cardData);
    const seenItem = names.length ? [{
      label: `見た人（${names.length}人）: ${names.join('、')}`,
      disabled: true,
      title: names.join('\n'),
      onSelect: () => {}
    }] : [];

    // カード情報は表向きならツールチップで読めるが、タッチにはホバーが無い。
    // 読める状態のときだけ、メニューの先頭に冒頭を出して指だけでも辿れるようにする
    // （パネルのtextPreviewItemと同じ扱い）。
    const readableInfo = (cardData.faceUp && cardData.face.info)
      ? cardData.face.info.replace(/\s+/g, ' ').trim()
      : '';
    const infoItem = readableInfo ? [{
      label: readableInfo.length > 40 ? `${readableInfo.slice(0, 40)}…` : readableInfo,
      disabled: true,
      title: cardData.face.info,
      onSelect: () => {}
    }] : [];

    // 表示名を設定していない人は参加者IDを持たないので、記録として残せない
    // （記録できないだけで、表面を見ること自体は下の「表にする」で誰でもできる）。
    const canRecordSeen = !!myParticipantId;

    const peekItem = cardData.faceUp ? [] : [{
      label: 'カードを見る（自分だけ）',
      disabled: !canRecordSeen,
      title: canRecordSeen
        ? '裏向きのまま、自分だけ表面を確認します。見たことはカードに記録されます。'
        : '表示名を設定すると使えます（誰が見たかを記録できないため）。',
      onSelect: () => {
        const latest = store.state.cards[cardId];
        if (!latest) return;
        showCardPeekDialog({ face: latest.face });
        store.dispatch('MARK_CARD_SEEN', { id: cardId, participantId: myParticipantId });
      }
    }];

    showContextMenu(event.clientX, event.clientY, [
      ...infoItem,
      ...seenItem,
      ...peekItem,
      {
        label: cardData.faceUp ? '裏にする' : '表にする（全員に公開）',
        onSelect: () => {
          store.dispatch('SET_CARD_FACE_UP', { id: cardId, faceUp: !cardData.faceUp });
        }
      },
      {
        label: '最前面へ',
        title: '他のカード・パネルより手前に重ねます（コマより手前には出ません）。',
        onSelect: () => {
          store.dispatch('SET_CARD_STACK_ORDER', { id: cardId, stackOrder: nextTopStackOrder() });
        }
      },
      {
        label: cardData.locked ? '固定を解除' : '固定',
        onSelect: () => {
          store.dispatch('SET_CARD_LOCKED', { id: cardId, locked: !cardData.locked });
        }
      },
      {
        label: '削除',
        danger: true,
        onSelect: () => {
          store.dispatch('REMOVE_CARD', { id: cardId });
        }
      }
    ]);
  }

  bindBoardObjectDrag(element, {
    readState: (id) => store.state.cards[id],
    moveAction: 'MOVE_CARD',
    openMenu: openCardMenu,

    // 落とせる場所の上に来たら光らせる
    onDrag: (event) => {
      clearDropHighlights();
      const cardData = store.state.cards[element.id];
      if (!cardData) return;
      const targetEl = dropTargetAt(event.clientX, event.clientY, element);
      const drop = resolveCardDrop(targetEl, cardData);
      // 受け付けない山（出自が違うデッキ）は光らせない
      if (drop && drop.kind !== 'deck-rejected') targetEl.classList.add('is-drop-hover');
    },

    // ストッカーへ収納する／デッキへ戻す。trueを返すと呼び出し側はグリッド吸着をしない。
    onDrop: (event, { startX, startY }) => {
      clearDropHighlights();

      const cardData = store.state.cards[element.id];
      if (!cardData) return false;

      const drop = resolveCardDrop(dropTargetAt(event.clientX, event.clientY, element), cardData);
      if (!drop) return false;

      if (drop.kind === 'stocker') {
        store.dispatch('STORE_CARD_IN_STOCKER', {
          cardId: element.id, panelId: drop.panelId, ...actingUserPayload()
        });
        return true;
      }

      // 出自が違う山は受け付けない。掴む前の位置へ戻して、入らなかったことを見せる
      if (drop.kind === 'deck-rejected') {
        store.dispatch('MOVE_CARD', { id: element.id, x: startX, y: startY });
        return true;
      }

      // デッキへ戻すのは戻せなくなる操作なので必ず確かめる。断られたら掴む前の位置へ戻す
      // （ドラッグ中もMOVE_CARDを送っているので、山の上に置きっぱなしにしない）。
      if (confirm('デッキに戻しますか？')) {
        store.dispatch('RETURN_CARD_TO_DECK', { cardId: element.id, deckId: drop.deckId });
      } else {
        store.dispatch('MOVE_CARD', { id: element.id, x: startX, y: startY });
      }
      return true;
    }
  });
}

function createCardElement(cardData, panelLayer) {
  const el = document.createElement('div');
  el.className = 'card-object';
  el.id = cardData.id;

  const img = document.createElement('img');
  img.className = 'card-image';
  img.alt = '';
  // 画像が無い／読めないときはカード名の表示へ落とす（image/trump/README.txt）。
  // 読み込みの失敗は描画のあとに分かるので、印を付けて見た目を作り直す。
  img.addEventListener('error', () => {
    img.style.display = 'none';
    img.dataset.failed = '1';
    const latest = store.state.cards[el.id];
    if (latest) applyCardAppearance(el, latest);
  });
  el.appendChild(img);

  const text = document.createElement('span');
  text.className = 'card-text';
  el.appendChild(text);

  applyCardAppearance(el, cardData);
  bindCardDrag(el);
  panelLayer.appendChild(el);
  return el;
}

function bindDeckDrag(element) {
  function openDeckMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    const deckId = element.id;
    const deckData = store.state.decks[deckId];
    if (!deckData) return;

    const remaining = deckData.cards.length;
    const emptyReason = remaining === 0 ? '残り0枚です。' : undefined;

    const drawItem = (label, faceUp, count) => ({
      label,
      disabled: remaining === 0,
      title: emptyReason,
      onSelect: () => {
        store.dispatch('DRAW_CARDS', { deckId, count, faceUp, gridSize: GRID_SIZE });
      }
    });

    // 枚数を指定して引く：表側/裏側（盤面へ）またはストッカーへ直接収納する（送るカードの
    // 状態は問わない＝ストッカーに入っている間は描画されないため）。ストッカーは
    // canUseStocker（誰でも使えるか自分専用）で絞り込んだものだけを候補にする。
    const drawManyItem = () => ({
      label: '枚数を指定して引く',
      disabled: remaining === 0,
      title: emptyReason,
      onSelect: () => {
        const latest = store.state.decks[deckId];
        if (!latest || latest.cards.length === 0) return;
        const stockers = Object.values(store.state.panels)
          .filter(p => p.isStocker && canUseStocker(p))
          .map(p => ({ id: p.id, label: describeStockerForPicker(p) }));
        showDrawCountDialog({
          max: latest.cards.length,
          stockers,
          onConfirm: ({ count, destination, stockerId }) => {
            if (destination === 'stocker') {
              store.dispatch('DRAW_CARDS', {
                deckId, count, gridSize: GRID_SIZE, stockerId, ...actingUserPayload()
              });
            } else {
              store.dispatch('DRAW_CARDS', {
                deckId, count, faceUp: destination === 'faceUp', gridSize: GRID_SIZE
              });
            }
          }
        });
      }
    });

    showContextMenu(event.clientX, event.clientY, [
      {
        label: `${deckData.name || 'デッキ'}（残り${remaining}枚）`,
        disabled: true,
        onSelect: () => {}
      },
      drawItem('表向きで1枚引く', true, 1),
      drawItem('裏向きで1枚引く', false, 1),
      drawManyItem(),
      {
        label: 'シャッフル',
        disabled: remaining < 2,
        title: remaining < 2 ? '混ぜるほど札がありません。' : undefined,
        onSelect: () => {
          const latest = store.state.decks[deckId];
          if (!latest) return;
          // 並びはここで作って配る。reducerでMath.random()を呼ぶと、同じアクションを
          // 実行した各クライアントが別々の並びになってしまう（js/game-store.jsのSHUFFLE_DECK）。
          const order = latest.cards.map(card => card.id);
          for (let i = order.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          store.dispatch('SHUFFLE_DECK', { id: deckId, order });
        }
      },
      {
        label: '裏面画像を変更',
        title: '既に引かれて盤面に出ているカードの裏面は変わりません。',
        onSelect: async () => {
          const picked = await pickAndUploadImage({ purpose: 'card' });
          if (!picked) return;
          store.dispatch('SET_DECK_BACK', { id: deckId, back: { image: picked.url, color: null } });
        }
      },
      {
        label: deckData.locked ? '固定を解除' : '固定',
        onSelect: () => {
          store.dispatch('SET_DECK_LOCKED', { id: deckId, locked: !deckData.locked });
        }
      },
      {
        label: 'デッキを削除',
        danger: true,
        title: '盤面に出ているカードは消えません。',
        onSelect: () => {
          store.dispatch('REMOVE_DECK', { id: deckId });
        }
      }
    ]);
  }

  bindBoardObjectDrag(element, {
    readState: (id) => store.state.decks[id],
    moveAction: 'MOVE_DECK',
    openMenu: openDeckMenu
  });
}

function createDeckElement(deckData, panelLayer) {
  const el = document.createElement('div');
  el.className = 'deck-object';
  el.id = deckData.id;

  const img = document.createElement('img');
  img.className = 'card-image';
  img.alt = '';
  img.addEventListener('error', () => { img.style.display = 'none'; });
  el.appendChild(img);

  const name = document.createElement('span');
  name.className = 'deck-name';
  el.appendChild(name);

  const count = document.createElement('span');
  count.className = 'deck-count';
  el.appendChild(count);

  applyDeckAppearance(el, deckData);
  bindDeckDrag(el);
  panelLayer.appendChild(el);
  return el;
}

/**
 * 今見えている範囲の真ん中あたりの盤面ローカル座標（マス目に合わせる設定ならそのマスの上）。
 * ルームメニューのように「盤面のどこか」を指していない操作から物を置くときに使う
 * （js/main.jsの「デッキを配置」）。cols/rowsを渡すと、その大きさの物の左上を返す
 * （＝物の中心が画面の中心に来る）。
 * @param {{cols?: number, rows?: number}} size マス数
 */
export function getBoardDropSpot({ cols = 0, rows = 0 } = {}) {
  const board = document.getElementById('board');
  const viewport = document.getElementById('board-viewport');
  if (!board || !viewport) return { x: 0, y: 0 };

  const boardRect = board.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();

  const centerX = (viewportRect.left + viewportRect.width / 2 - boardRect.left) / scale;
  const centerY = (viewportRect.top + viewportRect.height / 2 - boardRect.top) / scale;

  let x = settlePosition(centerX - cols * GRID_SIZE / 2);
  const y = settlePosition(centerY - rows * GRID_SIZE / 2);

  // 同じ場所に既にデッキがあるなら右へ避ける。2つ目のデッキを置いたときに1つ目へ
  // ぴったり重なって、下の山が触れなくなるのを防ぐ。
  const step = (Math.max(1, cols) + 1) * GRID_SIZE;
  for (let i = 0; i < 8; i += 1) {
    const taken = Object.values(store.state.decks || {}).some(deck => deck.x === x && deck.y === y);
    if (!taken) break;
    x += step;
  }

  return { x, y };
}

// 盤外メニュー（openBoardMenu）とヘッダーの「+」ボタン（js/main.js）の両方から呼ぶ
// 「キャラクターを追加」項目。x/yを省略すると、右クリックのように狙った位置を指せない
// 代わりに、今見えている範囲の中央（getBoardDropSpot）へ置く。cols:1, rows:1を渡すのは、
// クリック位置基準の計算（newTokenX = dropX - GRID_SIZE / 2）と同じ結果になるようにするため。
export function buildAddCharacterMenuItem(x, y) {
  if (x === undefined || y === undefined) {
    const spot = getBoardDropSpot({ cols: 1, rows: 1 });
    x = spot.x;
    y = spot.y;
  }
  return {
    label: 'キャラクターを追加',
    onSelect: () => {
      showCharacterDialog({
        activePluginId: store.state.room?.activePlugin ?? null,
        participants: store.state.participants ?? {},
        usedImages: collectImageUrls(store.state),
        onConfirm: ({ name, image, imageCrop, size, textColor, visible, parameterOverrides, parameterVisibility, parameterAudience, customParameters }) => {
          store.dispatch('ADD_CHARACTER', {
            id: generateTokenId(),
            name,
            image,
            imageCrop,
            size,
            textColor,
            visible,
            x,
            y,
            // 登録した人のコマにする（表示名未設定なら所有者なし＝誰でも触れる）。
            // NPC等をみんなで触りたい場合は「コマを手放す」で外す。
            ownerId: getCurrentParticipantId(),
            parameterOverrides,
            parameterVisibility,
            parameterAudience,
            customParameters
          });
        }
      });
    }
  };
}

// 「パネルを追加」項目。サイズはダイアログの中で選ぶため置く時点では分からず、
// dropX/dropYを省略した場合はgetBoardDropSpot()の生の中央位置をそのまま使う
// （クリック位置版が生のdropX/dropYをそのまま使うのと同じ扱い）。
export function buildAddPanelMenuItem(dropX, dropY) {
  const hasPos = dropX !== undefined && dropY !== undefined;
  return {
    label: 'パネルを追加',
    onSelect: () => {
      // パネルの左上を置く位置（マス目に合わせる設定ならそのマスへ吸着する）
      let snapX, snapY;
      if (hasPos) {
        snapX = settlePosition(dropX);
        snapY = settlePosition(dropY);
      } else {
        const spot = getBoardDropSpot();
        snapX = spot.x;
        snapY = spot.y;
      }

      showPanelDialog({
        title: 'パネルを追加',
        usedImages: collectImageUrls(store.state),
        clickActionChoices: buildClickActionChoices(),
        maxChatTextLength: MAX_PANEL_CHAT_TEXT_LENGTH,
        gridSize: GRID_SIZE,
        onConfirm: ({
          image, text, cols, rows, stackOrder, keepOnSceneChange, isStocker, stockerOwned,
          clickAction
        }) => {
          const panelId = generatePanelId();
          store.dispatch('ADD_PANEL', {
            id: panelId,
            image,
            text,
            x: snapX,
            y: snapY,
            cols,
            rows,
            stackOrder,
            keepOnSceneChange,
            clickAction
          });

          // ストッカー化は所有者を決める必要があるので専用のアクションで続ける
          // （ADD_PANELは「誰が作ったか」を持たない）
          if (isStocker) {
            const { participantId, localUserId } = actingUserPayload();
            store.dispatch('SET_PANEL_STOCKER', {
              id: panelId,
              isStocker: true,
              ownerId: stockerOwned ? participantId : null,
              localUserId: stockerOwned ? localUserId : null,
              gridSize: GRID_SIZE
            });
          }
        }
      });
    }
  };
}

// 「背景設定」項目。背景と盤面サイズは部屋全体の見た目を左右するのでGM限定（サーバー側も
// server/index.jsのGM_ONLY_ACTIONSでSET_BOARD_BACKGROUNDを弾く）。項目自体は残して、
// 押せない理由をツールチップで示す。
export function buildBackgroundSettingsMenuItem() {
  const canSetBackground = canOperateAsGm();
  return {
    label: '背景設定',
    disabled: !canSetBackground,
    title: canSetBackground ? undefined : GM_ONLY_REASON,
    onSelect: () => {
      const room = store.state.room;
      const board = document.getElementById('board');
      // boardWidth/boardHeightがnull＝自動（ビューポートに合わせる）。
      // 自動のときは、今画面に出ている実サイズを数値欄の初期値として渡す。
      const auto = !room.boardWidth || !room.boardHeight;

      showBackgroundDialog({
        initialImage: room.backgroundImage,
        initialImageKey: room.backgroundImageKey,
        initialCols: auto ? null : Math.round(room.boardWidth / GRID_SIZE),
        initialRows: auto ? null : Math.round(room.boardHeight / GRID_SIZE),
        fallbackCols: Math.max(1, Math.round((board?.offsetWidth || 0) / GRID_SIZE)),
        fallbackRows: Math.max(1, Math.round((board?.offsetHeight || 0) / GRID_SIZE)),
        initialShowGrid: room.showGrid !== false,
        initialKeepOnSceneChange: !!room.keepBackgroundOnSceneChange,
        usedImages: collectImageUrls(store.state),
        gridSize: GRID_SIZE,
        onConfirm: (result) => store.dispatch('SET_BOARD_BACKGROUND', result)
      });
    }
  };
}

function clampPan(viewport, board) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  // 盤面の外に置かれたコマ・パネルも見渡せるよう、それらを含む外接矩形を基準にする
  // （盤面外のコマ・パネルはローカル座標が負にもなり得るので minX/minY も考慮する）
  const bounds = getContentBounds(board);

  // 画面中央より奥へ盤面の端が行かないようにする「のりしろ」
  const marginX = vw / 2;
  const marginY = vh / 2;

  const maxPanX = marginX - bounds.minX * scale;
  const minPanX = vw - marginX - bounds.maxX * scale;
  const maxPanY = marginY - bounds.minY * scale;
  const minPanY = vh - marginY - bounds.maxY * scale;

  panX = Math.min(maxPanX, Math.max(minPanX, panX));
  panY = Math.min(maxPanY, Math.max(minPanY, panY));
}

// 表示用の持ち主の名前。参加者一覧から引けなければ（表示名を変えた・削除された等）
// IDのままでは意味が伝わらないので「不明な参加者」と出す。
function ownerNameOf(token) {
  if (!token?.ownerId) return 'なし';
  return store.state.participants?.[token.ownerId]?.nickname || '不明な参加者';
}

window.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('board-viewport');
  const board = document.getElementById('board');
  // パネルの置き場（combined_layout.html）。パネルの重なり順をここで閉じ込めている
  const panelLayer = document.getElementById('panel-layer');
  if (!viewport || !board || !panelLayer) return;

  // ウィンドウサイズ変更時：カスタムサイズ未設定のデフォルト盤面は、マス整数倍サイズを
  // ビューポートに合わせて再計算する（端のマスが切れないよう保つ）。
  window.addEventListener('resize', () => {
    applyBoardBackground(board, store.state.room);
    clampPan(viewport, board);
    scheduleBoardTransform(board);
  });

  // 指定した画面座標を固定点にして拡大率を掛ける。scale/panX/panYを書き換えるだけで、
  // clampPanと画面への反映は呼び出し側に任せる（ホイールとピンチの両方から使う）。
  function zoomAt(clientX, clientY, zoomFactor) {
    const viewportRect = viewport.getBoundingClientRect();
    const cx = clientX - viewportRect.left;
    const cy = clientY - viewportRect.top;

    const oldScale = scale;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));

    // 固定点の下にある盤面上の点が、ズーム後も同じ画面位置に来るようパンを再計算
    panX = cx - (cx - panX) * (scale / oldScale);
    panY = cy - (cy - panY) * (scale / oldScale);
  }

  // Ctrl+ホイール：マウス位置を中心にズーム
  viewport.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();

    const ZOOM_SENSITIVITY = 0.0015;
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * ZOOM_SENSITIVITY));

    clampPan(viewport, board);
    scheduleBoardTransform(board);
  }, { passive: false });

  // --- 2本指のピンチズーム ---
  // 盤面の上にある指をすべて数える。コマ・パネルがpointerdownをstopPropagationするので、
  // キャプチャ段階で受けて「コマに指を置いたままもう1本でピンチ」も取りこぼさない。
  const activePointers = new Map();
  let pinch = null;

  // 2本の指の間隔と中点。間隔の変化を拡大率に、中点の移動をパンに割り当てる。
  function measurePinch() {
    const [a, b] = [...activePointers.values()];
    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2
    };
  }

  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size !== 2) return;

    // 1本指で始まっていたコマ移動・パネル移動・パンを畳んでピンチへ引き継ぐ
    activeBoardDrag?.cancel();
    activeBoardDrag = null;
    pinch = measurePinch();
  }, true);

  viewport.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (!pinch || activePointers.size !== 2) return;

    const next = measurePinch();
    if (pinch.distance > 0) {
      zoomAt(next.centerX, next.centerY, next.distance / pinch.distance);
    }
    panX += next.centerX - pinch.centerX;
    panY += next.centerY - pinch.centerY;
    pinch = next;

    clampPan(viewport, board);
    applyBoardTransform(board);
  }, true);

  // 指が離れたら数え直す。ビューポートの外で離した場合も拾えるようwindowでも見る
  // （盤面の上で離せばキャプチャ段階のviewport側が先に受ける。二重に消しても害はない）。
  function releasePointer(event) {
    if (!activePointers.delete(event.pointerId)) return;
    if (activePointers.size < 2) pinch = null;
  }

  viewport.addEventListener('pointerup', releasePointer, true);
  viewport.addEventListener('pointercancel', releasePointer, true);
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);

  // ドラッグ：視点移動（パン）。コマ／パネルの上から始めた場合は無視して各自の移動に任せる。
  const panGesture = bindDragGesture(viewport, {
    onStart: (event) => {
      if (event.target.closest('.token')) return false;
      // 未固定のパネル上から始めた場合はパネル移動に任せる。固定パネルは背景扱いなので
      // その上のドラッグは通常どおり盤面パンとして処理する。
      const panelEl = event.target.closest('.panel-object');
      if (panelEl && !store.state.panels[panelEl.id]?.locked) return false;
      // 既に2本指ならピンチが操作を持つ
      if (activePointers.size >= 2) return false;

      viewport.style.cursor = 'grabbing';
      activeBoardDrag = panGesture;

      return {
        panStartClientX: event.clientX,
        panStartClientY: event.clientY,
        panStartX: panX,
        panStartY: panY
      };
    },

    onMove: (event, { panStartClientX, panStartClientY, panStartX, panStartY }) => {
      panX = panStartX + (event.clientX - panStartClientX);
      panY = panStartY + (event.clientY - panStartClientY);
      clampPan(viewport, board);
      applyBoardTransform(board);
    },

    onEnd: () => {
      viewport.style.cursor = 'grab';
      activeBoardDrag = null;
    },

    // 固定したパネル・カード・デッキの上から始まった長押しは、そのオブジェクト自身の
    // メニューが受け持つ（LONG_PRESS_ONLY）。固定中はpointerdownをここへ流しているので、
    // 黙っていると盤面のメニューが後から重なって、パネルのメニューを上書きしてしまう。
    // 未固定のものはonStartで弾いているのでここへは来ない。
    onLongPress: (event) => {
      if (event.target.closest('.panel-object, .card-object, .deck-object')) return;
      openBoardMenu(event);
    }
  });

  // 盤面の何もない場所を右クリック／長押し → キャラクター追加メニュー
  function openBoardMenu(event) {
    event.preventDefault();

    const viewportRect = viewport.getBoundingClientRect();
    const cx = event.clientX - viewportRect.left;
    const cy = event.clientY - viewportRect.top;

    // 画面座標 → ズーム・パンを考慮した盤面ローカル座標へ逆変換
    const dropX = (cx - panX) / scale;
    const dropY = (cy - panY) / scale;

    // クリックした位置をコマの中心にする（盤面の外でもそのまま置ける）。
    // 丸めはsettlePositionに任せる：マス目に合わせる設定なら押したマスへ吸着する。
    const newTokenX = settlePosition(dropX - GRID_SIZE / 2);
    const newTokenY = settlePosition(dropY - GRID_SIZE / 2);

    const t = buildPanelToggleItems();
    showContextMenu(event.clientX, event.clientY, [
      buildAddCharacterMenuItem(newTokenX, newTokenY),
      buildAddPanelMenuItem(dropX, dropY),
      buildBackgroundSettingsMenuItem(),
      // チャットパレットは浮動パネルなので、閉じたあと戻す手段がここだけになる。
      // パネルの生成はjs/main.js側なので、実体はsetChatPaletteControllerで受け取る。
      ...t.chatPalette,
      // 情報パネルは既定で非表示なので、ここが唯一の出しどころになる（生成はjs/info-panel.js）。
      ...t.info,
      // キャラクター一覧も浮動パネル（生成はjs/character-panel.js）。バックヤードは
      // このパネルのタブに統合したので、しまったコマを取り出す導線もここから辿る。
      ...t.characterList,
      // スタンプ送信も既定で非表示なので、ここが唯一の出しどころ（生成はjs/stamp-panel.js）。
      ...t.stamp,
      // 拡張判定UIも既定で非表示（生成はjs/check-panel.js）。判定UIを宣言していない
      // システムの部屋でも項目は出す：中を開けば理由が読めるようにしてある。
      ...t.check
    ]);
  }

  viewport.addEventListener('contextmenu', openBoardMenu);

  // JSONファイルをD&D：コマの上にドロップした場合はそのキャラクターへ読み込み、
  // 盤面の何もない場所にドロップした場合はその位置に新規キャラクターとして読み込む。
  viewport.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  viewport.addEventListener('drop', async (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      alert('JSONファイルをドロップしてください。');
      return;
    }

    const text = await file.text();
    const json = parseJsonText(text);
    if (!json) return;

    // コマ丸ごとのスナップショット（本アプリの「コマをJSONで保存」で出力したもの）は
    // 通常のインポート（値の上書きのみ）とは別に、見た目・構成要素を含めて丸ごと復元する。
    const isSnapshot = isTokenSnapshot(json);
    const importResult = isSnapshot ? null : resolveCharacterImport(json);
    if (!isSnapshot && !importResult) {
      alert('このJSONを読み込めませんでした。');
      return;
    }

    // スナップショットの画像はこの部屋の持ち物にしてから使う（adoptSnapshotImage参照）
    const snapshot = isSnapshot ? await adoptSnapshotImage(json) : null;

    const droppedTokenEl = event.target.closest('.token');
    if (droppedTokenEl) {
      if (isSnapshot) {
        store.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: droppedTokenEl.id, snapshot });
      } else {
        dispatchCharacterImport(droppedTokenEl.id, importResult);
      }
      return;
    }

    // 盤面の何もない場所へのドロップ → その位置に新規キャラクターを作成して読み込む
    const viewportRect = viewport.getBoundingClientRect();
    const cx = event.clientX - viewportRect.left;
    const cy = event.clientY - viewportRect.top;
    const dropX = (cx - panX) / scale;
    const dropY = (cy - panY) / scale;

    const newId = generateTokenId();
    store.dispatch('ADD_CHARACTER', {
      id: newId,
      name: (isSnapshot ? json.name : importResult.name) || '新規キャラクター',
      x: settlePosition(dropX - GRID_SIZE / 2),
      y: settlePosition(dropY - GRID_SIZE / 2),
      ownerId: getCurrentParticipantId() // 読み込んだ人のコマにする（作成時と同じ扱い）
    });

    if (isSnapshot) {
      store.dispatch('RESTORE_CHARACTER_SNAPSHOT', { id: newId, snapshot });
    } else {
      dispatchCharacterImport(newId, importResult);
    }
  });

  // 名乗る人が変わると「テキストが読めるパネル」も変わるので、見た目を作り直す
  // （状態自体は変わらないためSTATE_CHANGEDでは拾えない）。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    Object.values(store.state.panels || {}).forEach(panelData => {
      const el = document.getElementById(panelData.id);
      if (el) applyPanelAppearance(el, panelData);
    });
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    applyBoardBackground(board, state.room);

    // --- パネル・カード・デッキの同期（コマより下に敷く層） ---
    // 3種類とも同じ層(#panel-layer)に入れ、同じstackOrderの物差しで前後を決める
    // （カード・デッキの既定は10、パネルの既定は0）。
    const panels = state.panels || {};
    // カードストッカーへ収納されたカードは盤面に描かない（状態としては残っている。
    // コマのinBackyardと同じ扱いで、取り出せば同じカードが戻ってくる）。
    const cards = Object.fromEntries(
      Object.entries(state.cards || {}).filter(([, card]) => !card.stockerId)
    );
    const decks = state.decks || {};

    const layerIds = new Set([...Object.keys(panels), ...Object.keys(cards), ...Object.keys(decks)]);
    const existingLayerIds = new Set(
      Array.from(panelLayer.querySelectorAll('.panel-object, .card-object, .deck-object')).map(el => el.id)
    );

    existingLayerIds.forEach(id => {
      if (!layerIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    // 重なり順（stackOrder）の小さいものから並べ、その並び順の添字をそのままz-indexにする。
    // sortは安定なので、同値の物は下の配列の並び（パネル→デッキ→カード、それぞれ状態の
    // マップの並び＝追加された順）のまま後ろに来る＝上に重なる。DOMの並びに頼らず全員が
    // 状態から同じ値を計算するので、シーンの適用などで要素の生成順が入れ替わっても、
    // どの画面でも同じ重なりになる。
    // カードをデッキより後に並べているのは、既定の重なり順が同じどうしで重ねたとき、
    // 手で動かすカードの方が上に来るのが自然なため（デッキは置きっぱなしの台）。
    const stacked = [
      ...Object.values(panels).map(data => ({ data, apply: applyPanelAppearance, create: createPanelElement })),
      ...Object.values(decks).map(data => ({ data, apply: applyDeckAppearance, create: createDeckElement })),
      ...Object.values(cards).map(data => ({ data, apply: applyCardAppearance, create: createCardElement }))
    ].sort((a, b) => normalizeStackOrder(a.data.stackOrder) - normalizeStackOrder(b.data.stackOrder));

    stacked.forEach(({ data, apply, create }, stackIndex) => {
      let el = document.getElementById(data.id);
      if (!el) {
        el = create(data, panelLayer);
      }
      el.style.left = `${data.x}px`;
      el.style.top = `${data.y}px`;
      el.style.zIndex = stackIndex;
      apply(el, data);
    });

    // --- コマの同期 ---
    // バックヤードにしまわれたコマは盤面には描画しない（DOM上は削除して、しまう前の状態に
    // 戻ってきても再生成できるようにする）。
    const existingIds = new Set(
      Array.from(board.querySelectorAll('.token')).map(el => el.id)
    );
    const boardTokens = Object.values(state.tokens).filter(t => !t.inBackyard);
    const stateIds = new Set(boardTokens.map(t => t.id));

    existingIds.forEach(id => {
      if (!stateIds.has(id)) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    boardTokens.forEach(tokenData => {
      let el = document.getElementById(tokenData.id);
      if (!el) {
        el = createTokenElement(tokenData, board);
      }
      el.style.left = `${tokenData.x}px`;
      el.style.top = `${tokenData.y}px`;
      applyTokenAppearance(el, tokenData);

      const nameSpan = el.querySelector('.token-name');
      if (nameSpan && nameSpan.textContent !== tokenData.name) {
        nameSpan.textContent = tokenData.name;
      }
    });
  });
});

window.moveToken = (id, x, y) => {
  store.dispatch('MOVE_TOKEN', { id, x, y });
};
