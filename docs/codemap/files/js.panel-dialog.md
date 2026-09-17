---
source: js/panel-dialog.js
lines: 544
exports: 1
imported_by: 1
api_sha: 182320ce1626
prose_sha: 182320ce1626
generated: 2026-09-17
tags: [codemap]
---

# js/panel-dialog.js

<!-- prose:summary -->
パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パネル（盤面に置くマップタイル状のオブジェクト）の追加・編集ダイアログ。`mode: 'marker'` で開くと簡易マーカー用になり、画像欄の代わりに形状・色・濃さ・フィルターの欄とプレビューを出す（形の検証は [[js.store.panels]]、見た目は [[js.marker-style]]）。画像欄は [[js.image-field]] に任せ、返ってくるのは置き場へ送り終えた確定URLだけ。「カードストッカーにする」もここで、オンにするとカードを収納できる箱になり、所有者を付けるとその人だけが出し入れできる（切り替えの実体は [[js.game-store]] の SET_PANEL_STOCKER）。状態には触らず、結果を onConfirm で呼び出し側へ返すだけ。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 55 | fn | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', mode = 'panel', initialMarker = null, initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', initialClickAction = null, usedImages = new Set(), clickActionChoices = { scenes: [], audioTracks: [], stamps: [] }, maxChatTextLength = 500, gridSize, onConfirm })` | title?: string, mode?: 'panel' \| 'marker', initialMarker?: object \| null, mode==='marker'のときの初期値（nullなら既定の見た… |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 55 | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', mode = 'panel', initialMarker = null, initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '', initialClickAction = null, usedImages = new Set(), clickActionChoices = { scenes: [], audioTracks: [], stamps: [] }, maxChatTextLength = 500, gridSize, onConfirm })` | **392** | ✓ |
| 449 | buildRangeRow | `buildRangeRow(labelText, value, min, max)` | 20 |  |
| 470 | buildSelect | `buildSelect(choices, value)` | 11 |  |
| 483 | buildMarkerFields | `buildMarkerFields(initialMarker)` | 61 |  |

## 依存

- import → [[js.aspect-lock-field]], [[js.dialog-host]], [[js.image-dimensions]], [[js.image-field]], [[js.marker-style]], [[js.store.panels]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
