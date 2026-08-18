---
source: js/board-data-driven.js
lines: 1821
exports: 6
imported_by: 7
api_sha: 25166c376dd2
prose_sha: 25166c376dd2
generated: 2026-08-18
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

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 43 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 50 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 57 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |
| 64 | fn | setStampPanelController | `setStampPanelController(controller)` |  |
| 71 | fn | setDiceDraftPanelController | `setDiceDraftPanelController(controller)` |  |
| 1336 | fn | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 今見えている範囲の真ん中あたりの、グリッドに乗った盤面ローカル座標。 |

## トップレベル関数（LOCAL TASKS 候補）（43）

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
| 96 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 105 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 112 | sheetImportMenuItems | `sheetImportMenuItems(tokenId, canOperate, denyReason)` | 23 |  |
| 136 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 157 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 169 | getContentBounds | `getContentBounds(board)` | 32 |  |
| 202 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 211 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 239 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 275 | applyBoardBackground | `applyBoardBackground(board, room)` | 34 |  |
| 312 | bindTokenDrag | `bindTokenDrag(element)` | **216** |  |
| 533 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 558 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 585 | canUseStocker | `canUseStocker(panelData)` | 6 |  |
| 593 | stockerOwnerName | `stockerOwnerName(panelData)` | 6 |  |
| 601 | storedCardsOf | `storedCardsOf(panelId)` | 5 |  |
| 610 | actingUserPayload | `actingUserPayload()` | 3 |  |
| 614 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 49 |  |
| 670 | bindBoardObjectDrag | `bindBoardObjectDrag(element, { readState, moveAction, openMenu, onDrag = null, onDrop = null })` | 49 |  |
| 720 | bindPanelDrag | `bindPanelDrag(element)` | 168 |  |
| 891 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 16 |  |
| 920 | applyObjectImage | `applyObjectImage(img, url)` | 13 |  |
| 937 | cardTextSizeClass | `cardTextSizeClass(text)` | 4 |  |
| 942 | applyCardAppearance | `applyCardAppearance(el, cardData)` | 29 |  |
| 972 | applyDeckAppearance | `applyDeckAppearance(el, deckData)` | 17 |  |
| 991 | nextTopStackOrder | `nextTopStackOrder()` | 10 |  |
| 1004 | seenByNames | `seenByNames(cardData)` | 3 |  |
| 1012 | dropTargetAt | `dropTargetAt(clientX, clientY, draggedEl)` | 9 |  |
| 1022 | clearDropHighlights | `clearDropHighlights()` | 3 |  |
| 1027 | resolveCardDrop | `resolveCardDrop(targetEl, cardData)` | 20 |  |
| 1048 | bindCardDrag | `bindCardDrag(element)` | 135 |  |
| 1184 | createCardElement | `createCardElement(cardData, panelLayer)` | 21 |  |
| 1206 | bindDeckDrag | `bindDeckDrag(element)` | 97 |  |
| 1304 | createDeckElement | `createDeckElement(deckData, panelLayer)` | 24 |  |
| 1336 | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 25 | ✓ |
| 1362 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 1385 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.deck-dialog]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.dice-draft-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
