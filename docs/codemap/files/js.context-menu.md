---
source: js/context-menu.js
lines: 87
exports: 1
imported_by: 7
api_sha: 9aac9452f08f
prose_sha: 9aac9452f08f
generated: 2026-09-10
tags: [codemap]
---

# js/context-menu.js

<!-- prose:summary -->
汎用の右クリックコンテキストメニュー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
右クリックメニューの汎用実装。項目の配列を渡すと画面内に収まる位置へ出す、それだけの部品で、メニューの中身を知っているのは呼び出し側。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 39 | fn | showContextMenu | `showContextMenu(x, y, items)` | title?: string, icon?: string, iconLabel?: string}[]} items disabled: 押せない項目として出す（項目ごと消すと「なぜ出ないのか」が分からないため、 … |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 10 | closeContextMenu | `closeContextMenu()` | 8 |  |
| 19 | onOutsideClick | `onOutsideClick(event)` | 5 |  |
| 25 | onEscape | `onEscape(event)` | 3 |  |
| 39 | showContextMenu | `showContextMenu(x, y, items)` | 49 | ✓ |

## 依存

- import → [[js.icons]]
- imported by → [[js.board-data-driven]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.mobile-layout]], [[js.round-panel]], [[js.site-nav]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
