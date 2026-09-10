---
source: js/board-data-driven.js
lines: 2158
exports: 12
imported_by: 8
api_sha: 43857fadaf22
prose_sha: 43857fadaf22
generated: 2026-09-10
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・カード／デッキ・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ・パネル・カード・デッキの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。パネル／カード／デッキは同じ層（#panel-layer）に入り、stackOrder という同じ物差しで前後が決まる（ドラッグ移動も bindBoardObjectDrag で共通）。ストッカーは `isStocker` を立てたパネルで、持ち主だけが出し入れできる——その判定もここが持つ。パネルのクリックオプション（発言・シーン変更・音楽変更・スタンプ送信）の実行と、選べる候補の組み立てもここ。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。

浮動パネル5種（チャットパレット・情報・キャラクター一覧・スタンプ送信・拡張判定UI）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。盤外の右クリックメニューはこの5枚の表示/非表示を切り替える唯一の導線でもある（狭幅では [[js.mobile-layout]] がタブに持つので、その項目自体を出さない）。

パネルと背景のダイアログを開くとき、この部屋で使っている画像（[[js.store.images]] の collectImageUrls）を渡す。画像セレクタ（[[js.image-selector-dialog]]）が再利用の一覧に並べ、上げ直しを省く判断にも使う。
<!-- /prose:role -->

## export（12）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 48 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 62 | fn | setPanelClickSenders | `setPanelClickSenders(senders)` |  |
| 69 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 76 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |
| 83 | fn | setStampPanelController | `setStampPanelController(controller)` |  |
| 90 | fn | setCheckPanelController | `setCheckPanelController(controller)` |  |
| 113 | fn | buildPanelToggleItems | `buildPanelToggleItems()` | 5パネル分の表示/非表示項目を名前付きで返す。 |
| 431 | fn | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | コマの右クリックメニューを、渡した画面座標へ開く。 |
| 1623 | fn | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 今見えている範囲の真ん中あたりの盤面ローカル座標（マス目に合わせる設定ならそのマスの上）。 |
| 1653 | fn | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 盤外メニュー（openBoardMenu）とヘッダーの「+」ボタン（js/main.js）の両方から呼ぶ 「キャラクターを追加」項目。 |
| 1694 | fn | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 「パネルを追加」項目。 |
| 1755 | fn | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 「背景設定」項目。 |

## トップレベル関数（LOCAL TASKS 候補）（55）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | setChatPaletteController | `setChatPaletteController(controller)` | 3 | ✓ |
| 62 | setPanelClickSenders | `setPanelClickSenders(senders)` | 3 | ✓ |
| 69 | setInfoPanelController | `setInfoPanelController(controller)` | 3 | ✓ |
| 76 | setCharacterPanelController | `setCharacterPanelController(controller)` | 3 | ✓ |
| 83 | setStampPanelController | `setStampPanelController(controller)` | 3 | ✓ |
| 90 | setCheckPanelController | `setCheckPanelController(controller)` | 3 | ✓ |
| 100 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 113 | buildPanelToggleItems | `buildPanelToggleItems()` | 11 | ✓ |
| 140 | settlePosition | `settlePosition(value)` | 5 |  |
| 148 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 157 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 164 | sheetImportMenuItems | `sheetImportMenuItems(tokenId, canOperate, denyReason)` | 23 |  |
| 188 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 209 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 221 | getContentBounds | `getContentBounds(board)` | 32 |  |
| 254 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 263 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 291 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 327 | applyBoardBackground | `applyBoardBackground(board, room)` | 37 |  |
| 367 | bindTokenDrag | `bindTokenDrag(element)` | 56 |  |
| 431 | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | 178 | ✓ |
| 614 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 639 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 666 | canUseStocker | `canUseStocker(panelData)` | 6 |  |
| 674 | stockerOwnerName | `stockerOwnerName(panelData)` | 6 |  |
| 684 | describeStockerForPicker | `describeStockerForPicker(panelData)` | 5 |  |
| 691 | storedCardsOf | `storedCardsOf(panelId)` | 5 |  |
| 700 | actingUserPayload | `actingUserPayload()` | 3 |  |
| 711 | runPanelClickAction | `runPanelClickAction(panel)` | 44 |  |
| 757 | buildClickActionChoices | `buildClickActionChoices()` | 14 |  |
| 773 | sameClickAction | `sameClickAction(a, b)` | 7 |  |
| 782 | panelClickActionLabel | `panelClickActionLabel(action)` | 27 |  |
| 810 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 55 |  |
| 872 | bindBoardObjectDrag | `bindBoardObjectDrag(element, { readState, moveAction, openMenu, onDrag = null, onDrop = null, onClick = null })` | 59 |  |
| 932 | bindPanelDrag | `bindPanelDrag(element)` | **215** |  |
| 1150 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 16 |  |
| 1181 | applyObjectImage | `applyObjectImage(img, url)` | 18 |  |
| 1203 | cardTextSizeClass | `cardTextSizeClass(text)` | 4 |  |
| 1208 | applyCardAppearance | `applyCardAppearance(el, cardData)` | 31 |  |
| 1240 | applyDeckAppearance | `applyDeckAppearance(el, deckData)` | 17 |  |
| 1259 | nextTopStackOrder | `nextTopStackOrder()` | 10 |  |
| 1272 | seenByNames | `seenByNames(cardData)` | 3 |  |
| 1280 | dropTargetAt | `dropTargetAt(clientX, clientY, draggedEl)` | 9 |  |
| 1290 | clearDropHighlights | `clearDropHighlights()` | 3 |  |
| 1295 | resolveCardDrop | `resolveCardDrop(targetEl, cardData)` | 20 |  |
| 1316 | bindCardDrag | `bindCardDrag(element)` | 135 |  |
| 1452 | createCardElement | `createCardElement(cardData, panelLayer)` | 27 |  |
| 1480 | bindDeckDrag | `bindDeckDrag(element)` | 110 |  |
| 1591 | createDeckElement | `createDeckElement(deckData, panelLayer)` | 24 |  |
| 1623 | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 25 | ✓ |
| 1653 | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 37 | ✓ |
| 1694 | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 57 | ✓ |
| 1755 | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 29 | ✓ |
| 1785 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 1808 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.deck-dialog]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.stamp-registry]], [[js.store.images]], [[js.store.panels]], [[js.store.patch]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.check-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
