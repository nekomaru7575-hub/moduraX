---
source: js/board-data-driven.js
lines: 2260
exports: 13
imported_by: 8
api_sha: f19a94199345
prose_sha: f19a94199345
generated: 2026-09-14
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・カード／デッキ・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ・パネル・カード・デッキの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。パネル／カード／デッキは同じ層（#panel-layer）に入り、stackOrder という同じ物差しで前後が決まる（ドラッグ移動も bindBoardObjectDrag で共通）。ストッカーは `isStocker` を立てたパネルで、持ち主だけが出し入れできる——その判定もここが持つ。簡易マーカーは `marker` を持つパネルで、「簡易マーカーを追加」（buildAddMarkerMenuItem）から置き、描画は子要素 `.panel-marker-shape` へ [[js.marker-style]] で当てる（描画直前にも [[js.store.panels]] の normalizeMarker を通す）。パネルのクリックオプション（発言・シーン変更・音楽変更・スタンプ送信）の実行と、選べる候補の組み立てもここ。コマ・パネル（マーカー含む）の右クリックメニューの「複製」もここで、新しいアクションは作らず既存の組み合わせで作る（コマは ADD_CHARACTER→RESTORE_CHARACTER_SNAPSHOT、パネルは [[js.store.panels]] の buildPanelCopyPayload で ADD_PANEL→必要なら SET_PANEL_STOCKER）。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。

浮動パネル5種（チャットパレット・情報・キャラクター一覧・スタンプ送信・拡張判定UI）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。盤外の右クリックメニューはこの5枚の表示/非表示を切り替える唯一の導線でもある（狭幅では [[js.mobile-layout]] がタブに持つので、その項目自体を出さない）。

パネルと背景のダイアログを開くとき、この部屋で使っている画像（[[js.store.images]] の collectImageUrls）を渡す。画像セレクタ（[[js.image-selector-dialog]]）が再利用の一覧に並べ、上げ直しを省く判断にも使う。
<!-- /prose:role -->

## export（13）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 51 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 65 | fn | setPanelClickSenders | `setPanelClickSenders(senders)` |  |
| 72 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 79 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |
| 86 | fn | setStampPanelController | `setStampPanelController(controller)` |  |
| 93 | fn | setCheckPanelController | `setCheckPanelController(controller)` |  |
| 116 | fn | buildPanelToggleItems | `buildPanelToggleItems()` | 5パネル分の表示/非表示項目を名前付きで返す。 |
| 439 | fn | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | コマの右クリックメニューを、渡した画面座標へ開く。 |
| 1710 | fn | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 今見えている範囲の真ん中あたりの盤面ローカル座標（マス目に合わせる設定ならそのマスの上）。 |
| 1740 | fn | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 盤外メニュー（openBoardMenu）とヘッダーの「+」ボタン（js/main.js）の両方から呼ぶ 「キャラクターを追加」項目。 |
| 1838 | fn | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 「パネルを追加」項目。 |
| 1846 | fn | buildAddMarkerMenuItem | `buildAddMarkerMenuItem(dropX, dropY)` | 「簡易マーカーを追加」項目。 |
| 1856 | fn | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 「背景設定」項目。 |

## トップレベル関数（LOCAL TASKS 候補）（58）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 51 | setChatPaletteController | `setChatPaletteController(controller)` | 3 | ✓ |
| 65 | setPanelClickSenders | `setPanelClickSenders(senders)` | 3 | ✓ |
| 72 | setInfoPanelController | `setInfoPanelController(controller)` | 3 | ✓ |
| 79 | setCharacterPanelController | `setCharacterPanelController(controller)` | 3 | ✓ |
| 86 | setStampPanelController | `setStampPanelController(controller)` | 3 | ✓ |
| 93 | setCheckPanelController | `setCheckPanelController(controller)` | 3 | ✓ |
| 103 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 116 | buildPanelToggleItems | `buildPanelToggleItems()` | 11 | ✓ |
| 132 | boardGridLayers | `boardGridLayers(onImage)` | 4 |  |
| 148 | settlePosition | `settlePosition(value)` | 5 |  |
| 156 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 165 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 172 | sheetImportMenuItems | `sheetImportMenuItems(tokenId, canOperate, denyReason)` | 23 |  |
| 196 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 217 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 229 | getContentBounds | `getContentBounds(board)` | 32 |  |
| 262 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 271 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 299 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 335 | applyBoardBackground | `applyBoardBackground(board, room)` | 37 |  |
| 375 | bindTokenDrag | `bindTokenDrag(element)` | 56 |  |
| 439 | openTokenContextMenu | `openTokenContextMenu(tokenId, clientX, clientY)` | **204** | ✓ |
| 648 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 673 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 700 | canUseStocker | `canUseStocker(panelData)` | 6 |  |
| 708 | stockerOwnerName | `stockerOwnerName(panelData)` | 6 |  |
| 718 | describeStockerForPicker | `describeStockerForPicker(panelData)` | 5 |  |
| 725 | storedCardsOf | `storedCardsOf(panelId)` | 5 |  |
| 734 | actingUserPayload | `actingUserPayload()` | 3 |  |
| 745 | runPanelClickAction | `runPanelClickAction(panel)` | 44 |  |
| 791 | buildClickActionChoices | `buildClickActionChoices()` | 14 |  |
| 807 | sameClickAction | `sameClickAction(a, b)` | 7 |  |
| 816 | panelClickActionLabel | `panelClickActionLabel(action)` | 27 |  |
| 844 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 64 |  |
| 915 | bindBoardObjectDrag | `bindBoardObjectDrag(element, { readState, moveAction, openMenu, onDrag = null, onDrop = null, onClick = null })` | 59 |  |
| 975 | bindPanelDrag | `bindPanelDrag(element)` | **254** |  |
| 1232 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 21 |  |
| 1268 | applyObjectImage | `applyObjectImage(img, url)` | 18 |  |
| 1290 | cardTextSizeClass | `cardTextSizeClass(text)` | 4 |  |
| 1295 | applyCardAppearance | `applyCardAppearance(el, cardData)` | 31 |  |
| 1327 | applyDeckAppearance | `applyDeckAppearance(el, deckData)` | 17 |  |
| 1346 | nextTopStackOrder | `nextTopStackOrder()` | 10 |  |
| 1359 | seenByNames | `seenByNames(cardData)` | 3 |  |
| 1367 | dropTargetAt | `dropTargetAt(clientX, clientY, draggedEl)` | 9 |  |
| 1377 | clearDropHighlights | `clearDropHighlights()` | 3 |  |
| 1382 | resolveCardDrop | `resolveCardDrop(targetEl, cardData)` | 20 |  |
| 1403 | bindCardDrag | `bindCardDrag(element)` | 135 |  |
| 1539 | createCardElement | `createCardElement(cardData, panelLayer)` | 27 |  |
| 1567 | bindDeckDrag | `bindDeckDrag(element)` | 110 |  |
| 1678 | createDeckElement | `createDeckElement(deckData, panelLayer)` | 24 |  |
| 1710 | getBoardDropSpot | `getBoardDropSpot({ cols = 0, rows = 0 } = {})` | 25 | ✓ |
| 1740 | buildAddCharacterMenuItem | `buildAddCharacterMenuItem(x, y)` | 37 | ✓ |
| 1781 | openAddPanelDialog | `openAddPanelDialog(dropX, dropY, { mode, title })` | 55 |  |
| 1838 | buildAddPanelMenuItem | `buildAddPanelMenuItem(dropX, dropY)` | 6 | ✓ |
| 1846 | buildAddMarkerMenuItem | `buildAddMarkerMenuItem(dropX, dropY)` | 6 | ✓ |
| 1856 | buildBackgroundSettingsMenuItem | `buildBackgroundSettingsMenuItem()` | 29 | ✓ |
| 1886 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 1909 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.deck-dialog]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.marker-style]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.stamp-registry]], [[js.store.images]], [[js.store.panels]], [[js.store.patch]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.check-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
