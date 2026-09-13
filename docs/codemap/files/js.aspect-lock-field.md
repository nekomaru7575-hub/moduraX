---
source: js/aspect-lock-field.js
lines: 93
exports: 1
imported_by: 2
api_sha: 8a1b96108c93
prose_sha: 8a1b96108c93
generated: 2026-09-13
tags: [codemap]
---

# js/aspect-lock-field.js

<!-- prose:summary -->
ダイアログの「幅（マス）」「高さ（マス）」欄に添える「縦横比を固定する」チェックボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | fn | buildAspectLockField | `buildAspectLockField({ colsInput, rowsInput, gridSize, initialImage = null })` | colsInput: HTMLInputElement, rowsInput: HTMLInputElement, gridSize: number, initialImage?: string \| null 今の画像。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | buildAspectLockField | `buildAspectLockField({ colsInput, rowsInput, gridSize, initialImage = null })` | 65 | ✓ |

## 依存

- import → [[js.image-dimensions]]
- imported by → [[js.background-dialog]], [[js.panel-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
