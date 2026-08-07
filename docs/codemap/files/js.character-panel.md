---
source: js/character-panel.js
lines: 255
exports: 1
imported_by: 1
api_sha: f9e75df193b0
prose_sha: f9e75df193b0
generated: 2026-08-07
tags: [codemap]
---

# js/character-panel.js

<!-- prose:summary -->
「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を タブで切り替えて並べる浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面上のコマと、バックヤード（盤面からしまったコマの個人保管場所）をタブで並べる浮動パネル。パネルの枠は [[js.floating-panel]]、中身の操作は [[js.board-data-driven]] に委ねる。表示可否は [[js.visibility]] の判定に従う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 160 | fn | initCharacterPanel | `initCharacterPanel()` |  |

## トップレベル関数・非export（6）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 22 | truncateLabel | `truncateLabel(label, maxLength = 4)` | 4 |
| 29 | listBoardTokens | `listBoardTokens(state)` | 9 |
| 43 | listMyBackyardTokens | `listMyBackyardTokens(state)` | 10 |
| 56 | buildAvatarColumn | `buildAvatarColumn(tokenData, { withInitiative })` | 1 |
| 87 | buildBoardRow | `buildBoardRow(tokenData, myId)` | 53 |
| 143 | buildBackyardRow | `buildBackyardRow(tokenData)` | 16 |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.floating-panel]], [[js.local-identity]], [[js.visibility]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
