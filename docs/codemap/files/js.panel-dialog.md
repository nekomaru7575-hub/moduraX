---
source: js/panel-dialog.js
lines: 283
exports: 1
imported_by: 1
api_sha: f84aa96e3e18
prose_sha: f84aa96e3e18
generated: 2026-08-26
tags: [codemap]
---

# js/panel-dialog.js

<!-- prose:summary -->
パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パネル（盤面に置くマップタイル状のオブジェクト）の追加・編集ダイアログ。画像は [[js.image-upload]] 経由。「カードストッカーにする」もここで、オンにするとカードを収納できる箱になり、所有者を付けるとその人だけが出し入れできる（切り替えの実体は [[js.game-store]] の SET_PANEL_STOCKER）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 37 | fn | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', gridSize, onConfirm })` | title?: string, initialImage?: string \| null, initialText?: string, initialCols?: number, initialRows?: numb… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 13 | ensureDialog | `ensureDialog()` | 7 |  |
| 37 | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', gridSize, onConfirm })` | **246** | ✓ |

## 依存

- import → [[js.image-dimensions]], [[js.image-upload]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
