---
source: js/card-catalog.js
lines: 96
exports: 5
imported_by: 1
api_sha: 5960eadd03a2
prose_sha: 5960eadd03a2
generated: 2026-08-18
tags: [codemap]
---

# js/card-catalog.js

<!-- prose:summary -->
「盤面に置けるカードの束（デッキ）」の既定の中身を持つ表。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
簡易トランプ（4スート×13枚＋ジョーカー）の中身と、カード画像のURLの組み立てを持つ純データ。[[js.stamp-catalog]]と同じくDOM/windowには触れない。画像パスは規則（card_<スート>_<2桁>.png）から組み立てるだけで、表の側にパス文字列を書かせない（[[js.stamp-registry]]の「URLは受け取った側が組み立てる」と同じ約束）。DECK_TEMPLATESへ1件足せば、配置できるデッキの種類が増える。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 21 | const | CARD_IMAGE_DIR | `CARD_IMAGE_DIR` | トランプ画像の置き場。 |
| 42 | const | TRUMP_BACK | `TRUMP_BACK` | デッキの既定の裏面（差し替えはデッキ配置ダイアログから）。 |
| 62 | fn | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 0 } = {})` | 簡易トランプ1組。 |
| 82 | const | DECK_TEMPLATES | `DECK_TEMPLATES` | 配置できるデッキの種類。 |
| 93 | fn | findDeckTemplate | `findDeckTemplate(id)` |  |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 37 | cardImageUrl | `cardImageUrl(fileName)` | 3 |  |
| 44 | trumpFace | `trumpFace(suit, rank)` | 8 |  |
| 53 | jokerFace | `jokerFace()` | 3 |  |
| 62 | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 0 } = {})` | 15 | ✓ |
| 93 | findDeckTemplate | `findDeckTemplate(id)` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.deck-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
