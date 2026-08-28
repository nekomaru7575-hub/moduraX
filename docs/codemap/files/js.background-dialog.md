---
source: js/background-dialog.js
lines: 238
exports: 1
imported_by: 1
api_sha: 9bacf1b1ff3e
prose_sha: 9bacf1b1ff3e
generated: 2026-08-28
tags: [codemap]
---

# js/background-dialog.js

<!-- prose:summary -->
盤面の「背景設定」ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面の背景画像とグリッド設定のダイアログ。画像の実体アップロードは [[js.image-upload]] に委ね、ここは入力フォームと確定処理だけを持つ。呼び出し元は盤外の右クリックメニュー（[[js.board-data-driven]]）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 37 | fn | showBackgroundDialog | `showBackgroundDialog({ initialImage = null, initialImageKey = null, initialCols = null, initialRows = null, fallbackCols = 20, fallbackRows = 15, initialShowGrid = true, initialKeepOnSceneChange = false, gridSize, onConfirm })` | initialImage?: string \| null, initialImageKey?: string \| null, initialCols?: number \| null, null＝自動（ビューポートに合… |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 37 | showBackgroundDialog | `showBackgroundDialog({ initialImage = null, initialImageKey = null, initialCols = null, initialRows = null, fallbackCols = 20, fallbackRows = 15, initialShowGrid = true, initialKeepOnSceneChange = false, gridSize, onConfirm })` | **201** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.image-dimensions]], [[js.image-upload]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
