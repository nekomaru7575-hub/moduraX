---
source: js/board-data-driven.js
lines: 1972
exports: 10
imported_by: 7
api_sha: a5bcfae3438e
prose_sha: 25166c376dd2
generated: 2026-08-26
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・カード／デッキ・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ・パネル・カード・デッキの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。パネル／カード／デッキは同じ層（#panel-layer）に入り、stackOrder という同じ物差しで前後が決まる（ドラッグ移動も bindBoardObjectDrag で共通）。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。浮動パネル5種（チャットパレット・情報・キャラクター一覧・スタンプ送信・ダイスドラフト）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。盤外の右クリックメニューはこの5枚の表示/非表示を切り替える唯一の導線でもある（狭幅では[[js.mobile-layout]]がタブに持つので、その項目自体を出さない）。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 43 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 50 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 57 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |
| 64 | fn | setStampPanelController | `setStampPanelController(controller)` |  |
| 71 | fn | setDiceDraftPanelController | `setDiceDraftPanelController(controller)` |  |
| 94 | fn | buildPanelToggleItems | `buildPanelToggleItems()` | 5パネル分の表示/非表示項目を名前付きで返す。 |
| 1447 | fn | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 今見えている範囲の真ん中あたりの盤面ローカル座標（マス目に合わせる設定ならそのマスの上）。 |
| 1477 | fn | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 盤外メニュー（openBoardMenu）とヘッダーの「+」ボタン（js/main.js）の両方から呼ぶ 「キャラクターを追加」項目。 |
| 1517 | fn | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 「パネルを追加」項目。 |
| 1571 | fn | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 「背景設定」項目。 |

## トップレベル関数（LOCAL TASKS 候補）（49）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 43 | setChatPaletteController | `setChatPaletteController(controller)` | 3 | ✓ |
| 50 | setInfoPanelController | `setInfoPanelController(controller)` | 3 | ✓ |
| 57 | setCharacterPanelController | `setCharacterPanelController(controller)` | 3 | ✓ |
| 64 | setStampPanelController | `setStampPanelController(controller)` | 3 | ✓ |
| 71 | setDiceDraftPanelController | `setDiceDraftPanelController(controller)` | 3 | ✓ |
| 81 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 94 | buildPanelToggleItems | `buildPanelToggleItems()` | 9 | ✓ |
| 119 | settlePosition | `settlePosition(value)` | 5 |  |
| 127 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 136 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 143 | sheetImportMenuItems | `sheetImportMenuItems(tokenId, canOperate, denyReason)` | 23 |  |
| 167 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 188 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 200 | getContentBounds | `getContentBounds(board)` | 32 |  |
| 233 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 242 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 270 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 306 | applyBoardBackground | `applyBoardBackground(board, room)` | 37 |  |
| 346 | bindTokenDrag | `bindTokenDrag(element)` | **223** |  |
| 574 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 599 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 626 | canUseStocker | `canUseStocker(panelData)` | 6 |  |
| 634 | stockerOwnerName | `stockerOwnerName(panelData)` | 6 |  |
| 644 | describeStockerForPicker | `describeStockerForPicker(panelData)` | 5 |  |
| 651 | storedCardsOf | `storedCardsOf(panelId)` | 5 |  |
| 660 | actingUserPayload | `actingUserPayload()` | 3 |  |
| 664 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 49 |  |
| 720 | bindBoardObjectDrag | `bindBoardObjectDrag(element, { readState, moveAction, openMenu, onDrag = null, onDrop = null })` | 52 |  |
| 773 | bindPanelDrag | `bindPanelDrag(element)` | 198 |  |
| 974 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 16 |  |
| 1005 | applyObjectImage | `applyObjectImage(img, url)` | 18 |  |
| 1027 | cardTextSizeClass | `cardTextSizeClass(text)` | 4 |  |
| 1032 | applyCardAppearance | `applyCardAppearance(el, cardData)` | 31 |  |
| 1064 | applyDeckAppearance | `applyDeckAppearance(el, deckData)` | 17 |  |
| 1083 | nextTopStackOrder | `nextTopStackOrder()` | 10 |  |
| 1096 | seenByNames | `seenByNames(cardData)` | 3 |  |
| 1104 | dropTargetAt | `dropTargetAt(clientX, clientY, draggedEl)` | 9 |  |
| 1114 | clearDropHighlights | `clearDropHighlights()` | 3 |  |
| 1119 | resolveCardDrop | `resolveCardDrop(targetEl, cardData)` | 20 |  |
| 1140 | bindCardDrag | `bindCardDrag(element)` | 135 |  |
| 1276 | createCardElement | `createCardElement(cardData, panelLayer)` | 27 |  |
| 1304 | bindDeckDrag | `bindDeckDrag(element)` | 110 |  |
| 1415 | createDeckElement | `createDeckElement(deckData, panelLayer)` | 24 |  |
| 1447 | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 25 | ✓ |
| 1477 | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 36 | ✓ |
| 1517 | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 50 | ✓ |
| 1571 | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 28 | ✓ |
| 1600 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 1623 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.deck-dialog]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.dice-draft-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
