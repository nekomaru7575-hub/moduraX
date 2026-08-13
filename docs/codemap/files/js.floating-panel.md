---
source: js/floating-panel.js
lines: 254
exports: 1
imported_by: 4
api_sha: 9e114663bedc
prose_sha: 9e114663bedc
generated: 2026-08-13
tags: [codemap]
---

# js/floating-panel.js

<!-- prose:summary -->
ドラッグで移動・つまみで拡縮できる浮動パネルの汎用ユーティリティ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ドラッグ移動と拡縮ができる浮動パネルの枠だけを作る汎用部品。中身と表示制御は呼び出し側（チャットパレット・情報・キャラクター一覧）が持つ。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 67 | fn | createFloatingPanel | `createFloatingPanel({ title, storageKey, defaultRect = { x: 80, y: 80, w: 320, h: 420 }, defaultVisible = true, onVisibilityChange })` | title: string, storageKey: string, defaultRect?: {x:number, y:number, w:number, h:number}, defaultVisible?: … |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | loadRect | `loadRect(storageKey)` | 9 |  |
| 31 | saveRect | `saveRect(storageKey, rect)` | 7 |  |
| 41 | clampRect | `clampRect(rect)` | 11 |  |
| 67 | createFloatingPanel | `createFloatingPanel({ title, storageKey, defaultRect = { x: 80, y: 80, w: 320, h: 420 }, defaultVisible = true, onVisibilityChange })` | 187 | ✓ |

## 依存

- import → [[js.drag-gesture]]
- imported by → [[js.character-panel]], [[js.info-panel]], [[js.main]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
