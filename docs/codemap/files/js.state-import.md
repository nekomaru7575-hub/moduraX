---
source: js/state-import.js
lines: 61
exports: 1
imported_by: 2
api_sha: 9aa7c49f541c
prose_sha: 9aa7c49f541c
generated: 2026-08-07
tags: [codemap]
---

# js/state-import.js

<!-- prose:summary -->
「部屋の全データ読み込み」で取り込んだ状態を、この部屋で使える形へ均す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
外部から取り込んだ部屋の状態を、この部屋で使える形へ均す。取り込み時にしか通らない正規化をここに閉じ込めてあり、クライアント（[[js.net-sync]]）とサーバー（[[server.index]]）の両方から同じ関数が呼ばれる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 52 | fn | adoptImportedState | `adoptImportedState(importedState, { participants = {} } = {})` | 取り込んだ状態を、この部屋で使える形へ均す。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 28 | adoptInfoEntry | `adoptInfoEntry(entry)` | 15 |

## 依存

- import → [[js.game-store]]
- imported by → [[js.net-sync]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
