---
source: js/panel-dialog.js
lines: 235
exports: 1
imported_by: 1
api_sha: 786bcec73bb0
prose_sha: 786bcec73bb0
generated: 2026-08-07
tags: [codemap]
---

# js/panel-dialog.js

<!-- prose:summary -->
パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パネル（盤面に置くマップタイル状のオブジェクト）の追加・編集ダイアログ。画像は [[js.image-upload]] 経由。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | showPanelDialog | `showPanelDialog({ title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2, initialStackOrder = 0, initialKeepOnSceneChange = false, gridSize, onConfirm })` | title?: string, initialImage?: string \| null, initialText?: string, initialCols?: number, initialRows?: numb… |

## トップレベル関数・非export（2）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 12 | ensureDialog | `ensureDialog()` | 7 |
| 21 | loadImageDimensions | `loadImageDimensions(dataUrl)` | 8 |

## 依存

- import → [[js.image-upload]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
