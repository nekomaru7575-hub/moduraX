---
source: js/background-dialog.js
lines: 205
exports: 1
imported_by: 1
api_sha: 23878aaa1c7b
prose_sha: 23878aaa1c7b
generated: 2026-09-09
tags: [codemap]
---

# js/background-dialog.js

<!-- prose:summary -->
盤面の「背景設定」ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面の背景画像とグリッド設定のダイアログ。画像欄は [[js.image-field]] に任せ、ここは入力フォームと確定処理だけを持つ。呼び出し元は盤外の右クリックメニュー（[[js.board-data-driven]]）。適用は1回のdispatchにまとめる（分けて投げると他クライアントに「新しい画像＋古いサイズ」の中間状態が見える）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | showBackgroundDialog | `showBackgroundDialog({ initialImage = null, initialImageKey = null, initialCols = null, initialRows = null, fallbackCols = 20, fallbackRows = 15, initialShowGrid = true, initialKeepOnSceneChange = false, usedImages = new Set(), gridSize, onConfirm })` | initialImage?: string \| null, initialImageKey?: string \| null, initialCols?: number \| null, null＝自動（ビューポートに合… |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 38 | showBackgroundDialog | `showBackgroundDialog({ initialImage = null, initialImageKey = null, initialCols = null, initialRows = null, fallbackCols = 20, fallbackRows = 15, initialShowGrid = true, initialKeepOnSceneChange = false, usedImages = new Set(), gridSize, onConfirm })` | 167 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.image-dimensions]], [[js.image-field]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
