---
source: js/resizable-stack.js
lines: 81
exports: 1
imported_by: 1
api_sha: ac2f87b1df9a
prose_sha: ac2f87b1df9a
generated: 2026-08-07
tags: [codemap]
---

# js/resizable-stack.js

<!-- prose:summary -->
縦に並んだ複数セクション（[data-resizable-section]を持つ要素）の間に ドラッグハンドルを挿入し、高さをユーザーが調整できるようにする汎用ユーティリティ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
縦に並んだセクションの間にドラッグハンドルを挿し込み、高さを調整できるようにする汎用ユーティリティ。対象は `[data-resizable-section]` を持つ要素。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | fn | makeResizableStack | `makeResizableStack({ container, storageKey, minSize = 60 })` |  |

## トップレベル関数・非export（3）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 6 | loadSizes | `loadSizes(storageKey)` | 9 |
| 16 | saveSizes | `saveSizes(storageKey, sizes)` | 7 |
| 24 | applySize | `applySize(section, size)` | 3 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
