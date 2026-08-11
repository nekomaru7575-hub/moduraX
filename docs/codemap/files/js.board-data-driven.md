---
source: js/board-data-driven.js
lines: 1132
exports: 3
imported_by: 4
api_sha: 8410aa0c0f5f
prose_sha: 8410aa0c0f5f
generated: 2026-08-11
tags: [codemap]
---

# js/board-data-driven.js

<!-- prose:summary -->
盤面（コマ・パネル・背景）の描画と操作を受け持つ、クライアント最大の UI 層。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマとパネルの生成・移動・右クリックメニュー・各種ダイアログの起動をまとめて持つ。[[js.game-store]] の一部（`store` `generateTokenId` など）をそのまま再 export しており、[[js.main]] はここ経由でストアに触る。浮動パネル3種（チャットパレット・情報・キャラクター一覧）は循環 import を避けるため、生成側から `setXxxController` で実体を注入してもらう構造になっている。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | setChatPaletteController | `setChatPaletteController(controller)` |  |
| 45 | fn | setInfoPanelController | `setInfoPanelController(controller)` |  |
| 52 | fn | setCharacterPanelController | `setCharacterPanelController(controller)` |  |

## トップレベル関数（LOCAL TASKS 候補）（21）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 38 | setChatPaletteController | `setChatPaletteController(controller)` | 3 | ✓ |
| 45 | setInfoPanelController | `setInfoPanelController(controller)` | 3 | ✓ |
| 52 | setCharacterPanelController | `setCharacterPanelController(controller)` | 3 | ✓ |
| 62 | panelToggleItem | `panelToggleItem(controller, label)` | 8 |  |
| 77 | resolveCharacterImport | `resolveCharacterImport(json)` | 6 |  |
| 86 | adoptSnapshotImage | `async adoptSnapshotImage(snapshot)` | 4 |  |
| 91 | dispatchCharacterImport | `dispatchCharacterImport(id, importResult)` | 10 |  |
| 112 | scheduleBoardTransform | `scheduleBoardTransform(board)` | 7 |  |
| 124 | getContentBounds | `getContentBounds(board)` | 26 |  |
| 151 | applyBoardTransform | `applyBoardTransform(board)` | 3 |  |
| 160 | ensureBackgroundImageMeasured | `ensureBackgroundImageMeasured(board, room)` | 18 |  |
| 188 | resolveBoardPixelSize | `resolveBoardPixelSize(board, room)` | 32 |  |
| 224 | applyBoardBackground | `applyBoardBackground(board, room)` | 34 |  |
| 261 | bindTokenDrag | `bindTokenDrag(element)` | **213** |  |
| 479 | applyTokenAppearance | `applyTokenAppearance(el, tokenData)` | 24 |  |
| 504 | createTokenElement | `createTokenElement(tokenData, board)` | 20 |  |
| 527 | applyPanelAppearance | `applyPanelAppearance(el, panelData)` | 24 |  |
| 554 | bindPanelDrag | `bindPanelDrag(element)` | 139 |  |
| 696 | createPanelElement | `createPanelElement(panelData, panelLayer)` | 10 |  |
| 707 | clampPan | `clampPan(viewport, board)` | 20 |  |
| 730 | ownerNameOf | `ownerNameOf(token)` | 4 |  |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.audience-picker]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.character-json-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.drag-gesture]], [[js.file-uploader]], [[js.game-store]], [[js.image-dimensions]], [[js.image-upload]], [[js.local-identity]], [[js.panel-dialog]], [[js.parameters.registry]], [[js.room-authority]], [[js.visibility]]
- imported by → [[js.character-panel]], [[js.info-panel]], [[js.main]], [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
