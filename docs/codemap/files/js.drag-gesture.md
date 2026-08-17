---
source: js/drag-gesture.js
lines: 154
exports: 1
imported_by: 3
api_sha: fcbe71fb8df5
prose_sha: fcbe71fb8df5
generated: 2026-08-17
tags: [codemap]
---

# js/drag-gesture.js

<!-- prose:summary -->
ドラッグと長押しの共通ヘルパー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | bindDragGesture | `bindDragGesture(element, { onStart, onMove, onEnd, onLongPress, capture = false, stopPropagation = false } = {})` | onStart?: (event: PointerEvent) => any, ドラッグを始めてよければ任意の値（＝以降のコールバックへ渡す文脈）を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 38 | bindDragGesture | `bindDragGesture(element, { onStart, onMove, onEnd, onLongPress, capture = false, stopPropagation = false } = {})` | 116 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.dice-draft-panel]], [[js.floating-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
