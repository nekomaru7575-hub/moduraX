---
source: js/panel-dialog.js
lines: 425
exports: 1
imported_by: 1
api_sha: 028c3db00f44
prose_sha: 028c3db00f44
generated: 2026-09-10
tags: [codemap]
---

# js/panel-dialog.js

<!-- prose:summary -->
パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パネル（盤面に置くマップタイル状のオブジェクト）の追加・編集ダイアログ。画像欄は [[js.image-field]] に任せ、返ってくるのは置き場へ送り終えた確定URLだけ。「カードストッカーにする」もここで、オンにするとカードを収納できる箱になり、所有者を付けるとその人だけが出し入れできる（切り替えの実体は [[js.game-store]] の SET_PANEL_STOCKER）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 45 | fn | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', initialClickAction = null, usedImages = new Set(), clickActionChoices = { scenes: [], audioTracks: [], stamps: [] }, maxChatTextLength = 500, gridSize, onConfirm })` | title?: string, initialImage?: string \| null, initialText?: string, initialCols?: number, initialRows?: numb… |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 45 | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', initialClickAction = null, usedImages = new Set(), clickActionChoices = { scenes: [], audioTracks: [], stamps: [] }, maxChatTextLength = 500, gridSize, onConfirm })` | **380** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.image-dimensions]], [[js.image-field]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
