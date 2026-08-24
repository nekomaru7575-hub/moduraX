---
source: js/card-catalog.js
lines: 142
exports: 7
imported_by: 2
api_sha: 4aee9a6ab821
prose_sha: 4aee9a6ab821
generated: 2026-08-24
tags: [codemap]
---

# js/card-catalog.js

<!-- prose:summary -->
「盤面に置けるカードの束（デッキ）」の既定の中身を持つ表。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
組み込みの簡易トランプ（4スート×13枚＋ジョーカー）の中身と、カード画像のURLの組み立て、そしてユーザーが作ったデッキ定義（room.deckTemplates）を実際の札へ展開する expandDeckTemplate を持つ純データ層。[[js.stamp-catalog]]と同じくDOM/windowには触れない。画像パスは規則（card_<スート>_<2桁>.png）から組み立てるだけで、表の側にパス文字列を書かせない（[[js.stamp-registry]]の「URLは受け取った側が組み立てる」と同じ約束）。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 21 | const | CARD_IMAGE_DIR | `CARD_IMAGE_DIR` | トランプ画像の置き場。 |
| 42 | const | TRUMP_BACK | `TRUMP_BACK` | デッキの既定の裏面（差し替えはデッキ配置ダイアログから）。 |
| 62 | fn | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 1 } = {})` | 簡易トランプ1組。 |
| 83 | const | DECK_TEMPLATES | `DECK_TEMPLATES` | 組み込みのデッキ（この部屋で何も作らなくても置けるもの）。 |
| 94 | fn | findDeckTemplate | `findDeckTemplate(id)` |  |
| 110 | fn | expandDeckTemplate | `expandDeckTemplate(template, generateId, max = 200)` | ユーザーが作ったデッキの定義（room.deckTemplates の1件）を、実際の札の並びへ展開する。 |
| 136 | fn | countDeckTemplateCards | `countDeckTemplateCards(template)` | 定義から作られる札の合計枚数（展開せずに数えるだけ）。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 37 | cardImageUrl | `cardImageUrl(fileName)` | 3 |  |
| 44 | trumpFace | `trumpFace(suit, rank)` | 8 |  |
| 53 | jokerFace | `jokerFace()` | 3 |  |
| 62 | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 1 } = {})` | 15 | ✓ |
| 94 | findDeckTemplate | `findDeckTemplate(id)` | 3 | ✓ |
| 110 | expandDeckTemplate | `expandDeckTemplate(template, generateId, max = 200)` | 21 | ✓ |
| 136 | countDeckTemplateCards | `countDeckTemplateCards(template)` | 6 | ✓ |

## 依存

- import → なし
- imported by → [[js.deck-editor-dialog]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
