---
source: js/board-data-driven.js
lines: 2156
exports: 12
imported_by: 8
api_sha: b279520cd06c
prose_sha: b279520cd06c
generated: 2026-09-09
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・カード／デッキ・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ・パネル・カード・デッキの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。パネル／カード／デッキは同じ層（#panel-layer）に入り、stackOrder という同じ物差しで前後が決まる（ドラッグ移動も bindBoardObjectDrag で共通）。ストッカーは `isStocker` を立てたパネルで、持ち主だけが出し入れできる——その判定もここが持つ。パネルのクリックオプション（発言・シーン変更・音楽変更・スタンプ送信）の実行と、選べる候補の組み立てもここ。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。

浮動パネル5種（チャットパレット・情報・キャラクター一覧・スタンプ送信・ダイスドラフト）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。盤外の右クリックメニューはこの5枚の表示/非表示を切り替える唯一の導線でもある（狭幅では [[js.mobile-layout]] がタブに持つので、その項目自体を出さない）。

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
| 90 | fn | setDiceDraftPanelController | `setDiceDraftPanelController(controller)` |  |
| 113 | fn | buildPanelToggleItems | `buildPanelToggleItems()` | 5パネル分の表示/非表示項目を名前付きで返す。 |
| 429 | fn | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | コマの右クリックメニューを、渡した画面座標へ開く。 |
| 1621 | fn | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 今見えている範囲の真ん中あたりの盤面ローカル座標（マス目に合わせる設定ならそのマスの上）。 |
| 1651 | fn | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 盤外メニュー（openBoardMenu）とヘッダーの「+」ボタン（js/main.js）の両方から呼ぶ 「キャラクターを追加」項目。 |
| 1692 | fn | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 「パネルを追加」項目。 |
| 1753 | fn | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 「背景設定」項目。 |

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
| 90 | setDiceDraftPanelController | `setDiceDraftPanelController(controller)` | 3 | ✓ |
| 100 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 113 | buildPanelToggleItems | `buildPanelToggleItems()` | 9 | ✓ |
| 138 | settlePosition | `settlePosition(value)` | 5 |  |
| 146 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 155 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 162 | sheetImportMenuItems | `sheetImportMenuItems(tokenId, canOperate, denyReason)` | 23 |  |
| 186 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 207 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 219 | getContentBounds | `getContentBounds(board)` | 32 |  |
| 252 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 261 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 289 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 325 | applyBoardBackground | `applyBoardBackground(board, room)` | 37 |  |
| 365 | bindTokenDrag | `bindTokenDrag(element)` | 56 |  |
| 429 | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | 178 | ✓ |
| 612 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 637 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 664 | canUseStocker | `canUseStocker(panelData)` | 6 |  |
| 672 | stockerOwnerName | `stockerOwnerName(panelData)` | 6 |  |
| 682 | describeStockerForPicker | `describeStockerForPicker(panelData)` | 5 |  |
| 689 | storedCardsOf | `storedCardsOf(panelId)` | 5 |  |
| 698 | actingUserPayload | `actingUserPayload()` | 3 |  |
| 709 | runPanelClickAction | `runPanelClickAction(panel)` | 44 |  |
| 755 | buildClickActionChoices | `buildClickActionChoices()` | 14 |  |
| 771 | sameClickAction | `sameClickAction(a, b)` | 7 |  |
| 780 | panelClickActionLabel | `panelClickActionLabel(action)` | 27 |  |
| 808 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 55 |  |
| 870 | bindBoardObjectDrag | `bindBoardObjectDrag(element, { readState, moveAction, openMenu, onDrag = null, onDrop = null, onClick = null })` | 59 |  |
| 930 | bindPanelDrag | `bindPanelDrag(element)` | **215** |  |
| 1148 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 16 |  |
| 1179 | applyObjectImage | `applyObjectImage(img, url)` | 18 |  |
| 1201 | cardTextSizeClass | `cardTextSizeClass(text)` | 4 |  |
| 1206 | applyCardAppearance | `applyCardAppearance(el, cardData)` | 31 |  |
| 1238 | applyDeckAppearance | `applyDeckAppearance(el, deckData)` | 17 |  |
| 1257 | nextTopStackOrder | `nextTopStackOrder()` | 10 |  |
| 1270 | seenByNames | `seenByNames(cardData)` | 3 |  |
| 1278 | dropTargetAt | `dropTargetAt(clientX, clientY, draggedEl)` | 9 |  |
| 1288 | clearDropHighlights | `clearDropHighlights()` | 3 |  |
| 1293 | resolveCardDrop | `resolveCardDrop(targetEl, cardData)` | 20 |  |
| 1314 | bindCardDrag | `bindCardDrag(element)` | 135 |  |
| 1450 | createCardElement | `createCardElement(cardData, panelLayer)` | 27 |  |
| 1478 | bindDeckDrag | `bindDeckDrag(element)` | 110 |  |
| 1589 | createDeckElement | `createDeckElement(deckData, panelLayer)` | 24 |  |
| 1621 | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 25 | ✓ |
| 1651 | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 37 | ✓ |
| 1692 | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 57 | ✓ |
| 1753 | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 29 | ✓ |
| 1783 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 1806 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.deck-dialog]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.stamp-registry]], [[js.store.images]], [[js.store.panels]], [[js.store.patch]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.dice-draft-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
