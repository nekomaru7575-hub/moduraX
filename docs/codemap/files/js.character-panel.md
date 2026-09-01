---
source: js/character-panel.js
lines: 285
exports: 2
imported_by: 1
api_sha: 65b467f5f737
prose_sha: 65b467f5f737
generated: 2026-09-01
tags: [codemap]
---

# js/character-panel.js

<!-- prose:summary -->
「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を タブで切り替えて並べる浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面上のコマと、バックヤード（盤面からしまったコマの個人保管場所）をタブで並べる浮動パネル。パネルの枠は [[js.floating-panel]]、中身の操作は [[js.board-data-driven]] に委ねる。表示可否は [[js.visibility]] の判定に従う（パラメータ1行を出すかは visible と roundOnly のAND。roundOnly は戦闘中だけ出す印で、宣言は [[js.parameters.paramFactory]]）。自分のバックヤードを判定する `listMyBackyardTokens` は、パネル表示だけでなく状態の書き出し（[[js.main]]）でも同じ判定基準を使うためexportしている。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 45 | fn | listMyBackyardTokens | `listMyBackyardTokens(state)` | バックヤードに入っているコマのうち、自分の棚のものだけを返す。 |
| 187 | fn | initCharacterPanel | `initCharacterPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | truncateLabel | `truncateLabel(label, maxLength = 4)` | 4 |  |
| 31 | listBoardTokens | `listBoardTokens(state)` | 9 |  |
| 45 | listMyBackyardTokens | `listMyBackyardTokens(state)` | 10 | ✓ |
| 58 | buildAvatarColumn | `buildAvatarColumn(tokenData, { withInitiative })` | 32 |  |
| 98 | bindTokenMenu | `bindTokenMenu(element, tokenId)` | 12 |  |
| 111 | buildBoardRow | `buildBoardRow(tokenData, myId)` | 56 |  |
| 170 | buildBackyardRow | `buildBackyardRow(tokenData)` | 16 |  |
| 187 | initCharacterPanel | `initCharacterPanel()` | 98 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.drag-gesture]], [[js.floating-panel]], [[js.local-identity]], [[js.visibility]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
