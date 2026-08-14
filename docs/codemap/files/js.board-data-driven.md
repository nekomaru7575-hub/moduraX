---
source: js/board-data-driven.js
lines: 1142
exports: 4
imported_by: 6
api_sha: d8b1cf99c8ca
prose_sha: d8b1cf99c8ca
generated: 2026-08-14
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマとパネルの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。浮動パネル4種（チャットパレット・情報・キャラクター一覧・スタンプ送信）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。盤外の右クリックメニューはこの4枚の表示/非表示を切り替える唯一の導線でもある（狭幅では[[js.mobile-layout]]がタブに持つので、その項目自体を出さない）。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 39 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 46 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 53 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |
| 60 | fn | setStampPanelController | `setStampPanelController(controller)` |  |

## トップレベル関数（LOCAL TASKS 候補）（22）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 39 | setChatPaletteController | `setChatPaletteController(controller)` | 3 | ✓ |
| 46 | setInfoPanelController | `setInfoPanelController(controller)` | 3 | ✓ |
| 53 | setCharacterPanelController | `setCharacterPanelController(controller)` | 3 | ✓ |
| 60 | setStampPanelController | `setStampPanelController(controller)` | 3 | ✓ |
| 70 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 85 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 94 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 99 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 120 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 132 | getContentBounds | `getContentBounds(board)` | 26 |  |
| 159 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 168 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 196 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 232 | applyBoardBackground | `applyBoardBackground(board, room)` | 34 |  |
| 269 | bindTokenDrag | `bindTokenDrag(element)` | **213** |  |
| 487 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 512 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 535 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 24 |  |
| 562 | bindPanelDrag | `bindPanelDrag(element)` | 139 |  |
| 704 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 10 |  |
| 715 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 738 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
