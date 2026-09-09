---
source: js/character-panel.js
lines: 363
exports: 3
imported_by: 1
api_sha: ad595620bb46
prose_sha: ad595620bb46
generated: 2026-09-09
tags: [codemap]
---

# js/character-panel.js

<!-- prose:summary -->
「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を タブで切り替えて並べる浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面上のコマと、バックヤード（盤面からしまったコマの個人保管場所）をタブで並べる浮動パネル。パネルの枠は [[js.floating-panel]]、中身の操作は [[js.board-data-driven]] に委ねる。表示可否は [[js.visibility]] の判定に従う（パラメータ1行を出すかは visible と roundOnly のAND。roundOnly は戦闘中だけ出す印で、宣言は [[js.parameters.paramFactory]]）。バックヤードの判定は2つexportしている：`listMyBackyardTokens` が「自分の棚」（パネル表示用）、`listBackyardTokens` が持ち主を問わない全部（部屋の書き出し用。[[js.main]]）。もう1つ、読み込んだ部屋データのバックヤードのコマをGMのものとして引き取る `CLAIM_RESTORED_BACKYARD` の発火もこのパネルが持つ（印を付けるのは [[js.state-import]]、引き取りの実体は [[js.store.handlers.characters]]。情報の引き取り・[[js.info-panel]] と同じ作り）。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 55 | fn | listBackyardTokens | `listBackyardTokens(state)` | 部屋の誰かのバックヤードに入っているコマを、持ち主を問わず全部返す。 |
| 63 | fn | listMyBackyardTokens | `listMyBackyardTokens(state)` | バックヤードに入っているコマのうち、自分の棚のものだけを返す。 |
| 223 | fn | initCharacterPanel | `initCharacterPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | truncateLabel | `truncateLabel(label, maxLength = 4)` | 4 |  |
| 41 | listBoardTokens | `listBoardTokens(state)` | 9 |  |
| 55 | listBackyardTokens | `listBackyardTokens(state)` | 3 | ✓ |
| 63 | listMyBackyardTokens | `listMyBackyardTokens(state)` | 10 | ✓ |
| 76 | buildAvatarColumn | `buildAvatarColumn(tokenData, { withInitiative })` | 32 |  |
| 116 | bindTokenMenu | `bindTokenMenu(element, tokenId)` | 12 |  |
| 129 | buildBoardRow | `buildBoardRow(tokenData, myId)` | 56 |  |
| 192 | buildBackyardRow | `buildBackyardRow(tokenData)` | 30 |  |
| 223 | initCharacterPanel | `initCharacterPanel()` | 140 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.drag-gesture]], [[js.floating-panel]], [[js.local-identity]], [[js.token-library-dialog]], [[js.visibility]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
