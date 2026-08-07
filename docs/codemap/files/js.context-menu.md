---
source: js/context-menu.js
lines: 76
exports: 1
imported_by: 4
api_sha: 9aac9452f08f
prose_sha: 9aac9452f08f
generated: 2026-08-07
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
| 34 | fn | showContextMenu | `showContextMenu(x, y, items)` | disabled: 押せない項目として出す（項目ごと消すと「なぜ出ないのか」が分からないため、 権限が無くてできない操作はtitleに理由を入れてこちらで示す）。 |

## トップレベル関数・非export（3）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 8 | closeContextMenu | `closeContextMenu()` | 8 |
| 17 | onOutsideClick | `onOutsideClick(event)` | 5 |
| 23 | onEscape | `onEscape(event)` | 3 |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.info-panel]], [[js.main]], [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
